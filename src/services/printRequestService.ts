
import {
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  type Unsubscribe,
} from 'firebase/database'

import { realtimeDb } from '../firebase'

export type PrintRequestStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export interface PrintRequestUpdate {
  requestId: string
  status: PrintRequestStatus
  error?: string
}

interface PrintRequestSubscription {
  requestId: string
  unsubscribe: Unsubscribe
}

export async function createPrintRequest(
  receiptId: string,
  onStatusChange: (update: PrintRequestUpdate) => void,
  onListenerError?: (error: Error) => void,
): Promise<PrintRequestSubscription> {
  const normalizedReceiptId = receiptId.trim()

  if (!normalizedReceiptId) {
    throw new Error('Receipt ID is required to print.')
  }

  const requestRef = push(ref(realtimeDb, 'web_print_requests'))

  if (!requestRef.key) {
    throw new Error('Unable to generate print request ID.')
  }

  const requestId = requestRef.key

  // Subscribe before writing so we cannot miss a fast Flutter response.
  const unsubscribe = onValue(
    requestRef,
    (snapshot) => {
      // Flutter removes successful requests after a short delay.
      // Keep the last observed terminal status in the web UI.
      if (!snapshot.exists()) return

      const data = snapshot.val() as Record<string, unknown>
      const status = data.status

      if (
        status !== 'pending' &&
        status !== 'processing' &&
        status !== 'completed' &&
        status !== 'failed'
      ) {
        return
      }

      onStatusChange({
        requestId,
        status,
        error:
          typeof data.error === 'string'
            ? data.error
            : undefined,
      })
    },
    (databaseError) => {
      onListenerError?.(
        new Error(databaseError.message || 'Print status listener failed.'),
      )
    },
  )

  try {
    await set(requestRef, {
      receiptId: normalizedReceiptId,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    unsubscribe()
    throw error
  }

  return {
    requestId,
    unsubscribe,
  }
}
