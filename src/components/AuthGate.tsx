
import { useEffect, useState } from 'react'

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'

import {
  get,
  ref,
} from 'firebase/database'

import { auth, realtimeDb } from '../firebase'

interface AuthGateProps {
  children: React.ReactNode
}

type AccessStatus =
  | 'checking'
  | 'approved'
  | 'denied'
  | 'error'

export default function AuthGate({ children }: AuthGateProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [accessStatus, setAccessStatus] =
    useState<AccessStatus>('checking')

  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  // Listen to Firebase Authentication.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser)
        setLoading(false)
        setError('')
        setAccessStatus('checking')
      },
      (err) => {
        console.error('Authentication state error:', err)

        setError(
          'Unable to check authentication. Please refresh.',
        )

        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  // Verify the signed-in user's UID against Realtime Database.
  useEffect(() => {
    if (!user) {
      return
    }

    const authenticatedUser: User = user
    let active = true

    async function checkAuthorization() {
      try {
        setError('')

        // Only Google-authenticated accounts are accepted.
        const isGoogleUser = authenticatedUser.providerData.some(
          (provider) => provider.providerId === 'google.com',
        )

        if (!isGoogleUser) {
          if (active) {
            setAccessStatus('denied')
          }
          return
        }

        const snapshot = await get(
          ref(
            realtimeDb,
            `access_control/users/${authenticatedUser.uid}`,
          ),
        )

        if (!active) return

        if (!snapshot.exists()) {
          setAccessStatus('denied')
          return
        }

        const userData = snapshot.val()

        const enabled = userData?.enabled === true

        const validRole =
          userData?.role === 'owner' ||
          userData?.role === 'staff'

        setAccessStatus(
          enabled && validRole ? 'approved' : 'denied',
        )
      } catch (err) {
        console.error('Authorization check failed:', err)

        if (active) {
          setError(
            'Unable to verify account access. Please check your connection.',
          )

          setAccessStatus('error')
        }
      }
    }

    void checkAuthorization()

    return () => {
      active = false
    }
  }, [user, retryCount])

  // Google sign-in.
  async function handleGoogleSignIn() {
    try {
      setError('')
      setSigningIn(true)

      const provider = new GoogleAuthProvider()

      provider.setCustomParameters({
        prompt: 'select_account',
      })

      const result = await signInWithPopup(auth, provider)

      console.log(
        'Google sign-in successful:',
        result.user.email,
      )
    } catch (err) {
      console.error('Google sign-in error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in failed. Please try again.',
      )
    } finally {
      setSigningIn(false)
    }
  }

  // Sign out.
  async function handleLogout() {
    try {
      await signOut(auth)
    } catch (err) {
      console.error('Sign-out failed:', err)
      setError('Unable to sign out. Please try again.')
    }
  }

  // Retry authorization.
  function handleRetry() {
    setError('')
    setRetryCount((count) => count + 1)
  }

  // Initial authentication check.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">
          Checking authentication...
        </p>
      </div>
    )
  }

  // Signed-out users see the Google login screen.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Pocket Bill
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your billing dashboard.
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            className="mt-8 w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingIn
              ? 'Signing in...'
              : 'Continue with Google'}
          </button>

          {error && (
            <p className="mt-4 break-words text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Authorization check in progress.
  if (accessStatus === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">
          Verifying PocketBill access...
        </p>
      </div>
    )
  }

  // Authorization check failed due to a technical error.
  if (accessStatus === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Unable to verify access
          </h1>

          <p className="mt-3 break-words text-sm text-red-600">
            {error}
          </p>

          <button
            onClick={handleRetry}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Retry
          </button>

          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Signed-in account is not approved.
  if (accessStatus === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            Access not enabled
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            This Google account has not been approved for PocketBill.
            Contact the Owner to request access.
          </p>

          <div className="mt-5 rounded-xl bg-slate-50 p-3 text-left">
            <p className="text-xs font-medium text-slate-500">
              Your Firebase UID
            </p>

            <p className="mt-1 break-all font-mono text-xs text-slate-800">
              {user.uid}
            </p>
          </div>

          <button
            onClick={handleRetry}
            className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Check access again
          </button>

          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  // Only approved users can mount the actual application.
  if (accessStatus === 'approved') {
    return <>{children}</>
  }

  return null
}
