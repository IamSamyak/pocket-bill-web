
import type { ReactNode } from 'react'

import type { PageId } from './navigationConfig'

import DashboardScreen from '../dashboard/DashboardScreen'
import BillHistoryScreen from '../history/BillHistoryScreen'
import CategoryImageManager from '../settings/CategoryImageManager'
import CollectionsScreen from '../../collections/CollectionsScreen'

import type { Category } from '../../services/catalogService'
import type { User } from 'firebase/auth'

type PageRendererProps = {
    activePage: PageId
    onBack: () => void
    categories: Category[]
    currentUser: User | null
    onLogout: () => void
    isLoggingOut: boolean
}

type PageRenderers = Record<
    Exclude<PageId, 'billing'>,
    () => ReactNode
>

export default function PageRenderer({
    activePage,
    onBack,
    categories,
    currentUser,
    onLogout,
    isLoggingOut,
}: PageRendererProps) {
    const pageRenderers: PageRenderers = {
        dashboard: () => (
            <DashboardScreen onBack={onBack} />
        ),

        history: () => (
            <BillHistoryScreen
                categories={categories}
                onBack={onBack}
            />
        ),

        settings: () => (
            <div className="min-h-screen bg-slate-50">
                <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
                    <div className="mx-auto flex max-w-4xl items-center gap-3">
                        <button
                            onClick={onBack}
                            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                            aria-label="Back to billing"
                        >
                            ←
                        </button>

                        <h1 className="text-lg font-bold text-slate-900">
                            Settings
                        </h1>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                        <CategoryImageManager />
                    </section>
                </main>
            </div>
        ),

        account: () => (
            <div className="min-h-screen bg-slate-50">
                <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
                    <div className="mx-auto flex max-w-xl items-center gap-3">
                        <button
                            onClick={onBack}
                            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
                            aria-label="Back to billing"
                        >
                            ←
                        </button>

                        <h1 className="text-lg font-bold text-slate-900">
                            Account
                        </h1>
                    </div>
                </header>

                <main className="mx-auto max-w-xl px-4 py-8">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col items-center text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <span className="text-2xl">👤</span>
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-slate-900">
                                {currentUser?.displayName || 'Pocket Bill User'}
                            </h2>

                            <p className="mt-1 break-all text-sm text-slate-500">
                                {currentUser?.email || 'No email available'}
                            </p>
                        </div>

                        <div className="my-6 border-t border-slate-100" />

                        <button
                            onClick={onLogout}
                            disabled={isLoggingOut}
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isLoggingOut ? 'Signing out...' : 'Sign out'}
                        </button>
                    </section>
                </main>
            </div>
        ),
        collections: () => (
            <CollectionsScreen onBack={onBack} />
        ),
    }

    if (activePage === 'billing') {
        return null
    }

    return <>{pageRenderers[activePage]()}</>
}
