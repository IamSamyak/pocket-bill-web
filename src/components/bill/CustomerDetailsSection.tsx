
import { useState } from 'react'
import { ChevronDown, UserRound } from 'lucide-react'

interface CustomerDetailsSectionProps {
  customerName: string
  mobileNumber: string
  amountPaid: string
  totalAmount: number
  onCustomerNameChange: (value: string) => void
  onMobileNumberChange: (value: string) => void
  onAmountPaidChange: (value: string) => void
}

const money = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`

export default function CustomerDetailsSection({
  customerName,
  mobileNumber,
  amountPaid,
  totalAmount,
  onCustomerNameChange,
  onMobileNumberChange,
  onAmountPaidChange,
}: CustomerDetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const paid = Math.max(0, Number(amountPaid) || 0)
  const remainingAmount = Math.max(0, totalAmount - paid)

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <UserRound size={18} className="text-slate-500" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Customer Details
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {customerName || mobileNumber
                ? [customerName, mobileNumber].filter(Boolean).join(' · ')
                : 'Optional · Add customer and payment details'}
            </p>
          </div>
        </div>

        <ChevronDown
          size={19}
          className={`shrink-0 text-slate-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="space-y-4 border-t border-slate-100 p-4">
          {/* Customer name */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Customer name
            </span>

            <input
              value={customerName}
              onChange={(event) =>
                onCustomerNameChange(event.target.value)
              }
              placeholder="Enter customer name"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {/* Mobile number */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-600">
              Mobile number
            </span>

            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <span className="border-r border-slate-200 px-3 py-3 text-sm text-slate-500">
                +91
              </span>

              <input
                value={mobileNumber}
                onChange={(event) =>
                  onMobileNumberChange(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 10),
                  )
                }
                inputMode="numeric"
                placeholder="10-digit mobile number"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </label>

          {/* Amount paid + remaining */}
          <div className="grid grid-cols-2 items-center gap-3">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-medium text-slate-600">
                Amount Paid
              </span>

              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
                <span className="pl-3 text-sm text-slate-500">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={amountPaid}
                  onChange={(event) =>
                    onAmountPaidChange(
                      event.target.value.replace(/\D/g, ''),
                    )
                  }
                  placeholder="0"
                  className="min-w-0 w-full bg-transparent px-2 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </label>

            <div className="min-w-0 text-right">
              <p className="mb-1.5 text-[10px] font-bold tracking-wider text-slate-500">
                REMAINING
              </p>

              <p className="text-xs font-bold text-slate-500">
                Balance:
              </p>

              <p
                className={`text-base font-black ${
                  remainingAmount > 0
                    ? 'text-blue-600'
                    : 'text-emerald-600'
                }`}
              >
                {money(remainingAmount)}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
