
import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Printer,
  Plus,
  RefreshCw,
  AlertCircle,
  Clock3,
} from 'lucide-react'

import type { CreatedBill } from '../../services/billService'
import type { PrintRequestStatus } from '../../services/printRequestService'

interface FinalizedBillScreenProps {
  bill: CreatedBill
  onPrint: () => void
  printStatus: 'idle' | 'sending' | PrintRequestStatus
  printError: string
  onCreateNewBill: () => void
}

const money = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`

export default function FinalizedBillScreen({
  bill,
  onPrint,
  printStatus,
  printError,
  onCreateNewBill,
}: FinalizedBillScreenProps) {
  const [cashReceived, setCashReceived] = useState(
    String(bill.amountPaid),
  )

  const receivedAmount = Math.max(0, Number(cashReceived) || 0)

  const change = useMemo(
    () => Math.max(0, receivedAmount - bill.totalAmount),
    [receivedAmount, bill.totalAmount],
  )

  const isPrinting =
    printStatus === 'sending' ||
    printStatus === 'pending' ||
    printStatus === 'processing'

  const statusDetails = {
    idle: null,
    sending: {
      title: 'Sending print request...',
      description: 'Submitting your request to Pocket Bill.',
      color: 'border-blue-200 bg-blue-50 text-blue-700',
      Icon: RefreshCw,
    },
    pending: {
      title: 'Waiting for Pocket Bill app',
      description: 'The request was sent. Waiting for the Flutter app to receive it.',
      color: 'border-amber-200 bg-amber-50 text-amber-800',
      Icon: Clock3,
    },
    processing: {
      title: 'Printing bill...',
      description: 'The Flutter app received the request and is communicating with the printer.',
      color: 'border-blue-200 bg-blue-50 text-blue-700',
      Icon: RefreshCw,
    },
    completed: {
      title: 'Print successful',
      description: 'The Flutter app reported that the printing operation completed.',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Icon: CheckCircle2,
    },
    failed: {
      title: 'Printing failed',
      description: printError || 'The Flutter app could not complete the printing operation.',
      color: 'border-rose-200 bg-rose-50 text-rose-700',
      Icon: AlertCircle,
    },
  }[printStatus]

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <main className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 size={36} />
            </div>

            <p className="mt-5 text-xs font-bold tracking-[0.2em] text-slate-400">
              BILL FINALIZED
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Payment Summary
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Receipt #{bill.receiptId}
            </p>
          </div>

          <div className="my-8 rounded-2xl bg-slate-50 p-5 text-center">
            <p className="text-sm font-medium text-slate-500">
              TOTAL PAYABLE
            </p>

            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              {money(bill.totalAmount)}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="cashReceived"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Cash received
              </label>

              <input
                id="cashReceived"
                type="number"
                min="0"
                value={cashReceived}
                onChange={(event) =>
                  setCashReceived(event.target.value)
                }
                className="min-h-12 w-full rounded-xl border border-slate-300 px-4 text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter amount received"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4">
              <span className="text-sm font-medium text-slate-600">
                Change to return
              </span>

              <span className="text-xl font-bold text-green-600">
                {money(change)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Amount recorded as paid</span>
              <span className="font-semibold text-slate-700">
                {money(bill.amountPaid)}
              </span>
            </div>
          </div>

          <div className="my-7 border-t border-slate-100" />

          <div className="space-y-3">
            {statusDetails && (
              <div
                role="status"
                aria-live="polite"
                className={`flex items-start gap-3 rounded-xl border p-3 ${statusDetails.color}`}
              >
                <statusDetails.Icon
                  size={20}
                  className={`mt-0.5 shrink-0 ${
                    isPrinting ? 'animate-spin' : ''
                  }`}
                />

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {statusDetails.title}
                  </p>
                  <p className="mt-1 break-words text-xs">
                    {statusDetails.description}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={onPrint}
              disabled={isPrinting}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPrinting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  {printStatus === 'sending'
                    ? 'Sending Print Request...'
                    : printStatus === 'pending'
                      ? 'Waiting for App...'
                      : 'Printing...'}
                </>
              ) : (
                <>
                  <Printer size={18} />
                  Print Bill
                </>
              )}
            </button>

            <button
              onClick={onCreateNewBill}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={18} />
              Create New Bill
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Pocket Bill · Thank you
          </p>
        </section>
      </main>
    </div>
  )
}
