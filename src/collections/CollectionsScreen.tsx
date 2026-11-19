
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  ArrowDownWideNarrow,
} from 'lucide-react'

import {
  getUnpaidBills,
  type CollectionBill,
} from '../services/collectionService'

import {
  getShopDetails,
  type ShopDetail,
} from '../services/shopProfileService'

type CollectionsScreenProps = {
  onBack: () => void
}

type Filter = 'all' | 'unpaid' | 'partial'

type SortOption =
  | 'newest'
  | 'oldest'
  | 'highest'
  | 'lowest'

const MS_PER_DAY = 86_400_000

const LOAD_ERROR =
  'Unable to load collections. Check your connection and retry.'

function fetchCollections() {
  return Promise.all([
    getUnpaidBills(),
    getShopDetails(),
  ])
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatAge(date: Date): string {
  const days = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / MS_PER_DAY),
  )

  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'

  return `${days} days ago`
}

function normalizeIndianMobileNumber(value: string): string {
  let digits = value.replace(/\D/g, '')

  if (digits.length === 10) {
    digits = `91${digits}`
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`
  }

  return digits
}

function createReminderMessage(
  bill: CollectionBill,
  shop: ShopDetail | null,
): string {
  const shopName = shop?.shopName.trim() || 'Pocket Bill'
  const shopAddress = shop?.address.trim()

  return [
    'नमस्कार,',
    '',
    `आपल्या दिनांक ${formatDate(bill.billDate)} च्या पावती क्रमांक ${bill.receiptId} संदर्भात ही नम्र आठवण आहे.`,
    `आपली बाकी रक्कम ${formatCurrency(bill.outstandingAmount)} आहे.`,
    '',
    'कृपया आपल्या सोयीनुसार बाकी रक्कम जमा करावी.',
    '',
    'धन्यवाद,',
    shopName,
    ...(shopAddress ? [shopAddress] : []),
    '',
    '------------------------------',
    '',
    'Dear Sir/Madam,',
    '',
    `This is a friendly reminder regarding your bill ${bill.receiptId} dated ${formatDate(bill.billDate)}.`,
    `Your outstanding amount is ${formatCurrency(bill.outstandingAmount)}.`,
    '',
    'Kindly clear the pending amount at your convenience.',
    '',
    'Thank you,',
    shopName,
    ...(shopAddress ? [shopAddress] : []),
  ].join('\n')
}

function LoadingSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7"
      aria-busy="true"
      aria-label="Loading collections"
    >
      <div className="h-16 animate-pulse rounded-2xl bg-blue-100" />
      <div className="h-32 animate-pulse rounded-2xl bg-blue-100" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-2xl border border-gray-100 bg-gray-100"
          />
        ))}
      </div>
    </div>
  )
}

export default function CollectionsScreen({
  onBack,
}: CollectionsScreenProps) {
  const [bills, setBills] = useState<CollectionBill[]>([])
  const [shop, setShop] = useState<ShopDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  const isMounted = useRef(true)

  // Component lifecycle.
  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [])

  // Initial data loading.
  useEffect(() => {
    let isActive = true

    async function initializeCollections() {
      try {
        const [billResult, shopResult] = await fetchCollections()

        if (!isActive) return

        setBills(billResult)
        setShop(shopResult)
      } catch (err) {
        console.error('Failed to load collections:', err)

        if (isActive) {
          setError(LOAD_ERROR)
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    void initializeCollections()

    return () => {
      isActive = false
    }
  }, [])

  // Refresh collections.
  async function handleReload() {
    setLoading(true)
    setError(null)

    try {
      const [billResult, shopResult] = await fetchCollections()

      if (!isMounted.current) return

      setBills(billResult)
      setShop(shopResult)
    } catch (err) {
      console.error('Failed to refresh collections:', err)

      if (isMounted.current) {
        setError(LOAD_ERROR)
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  // Summary calculations.
  const {
    totalOutstanding,
    unpaidCount,
    partialCount,
  } = useMemo(() => {
    let total = 0
    let partial = 0

    for (const bill of bills) {
      total += bill.outstandingAmount

      if (bill.amountPaid > 0) {
        partial += 1
      }
    }

    return {
      totalOutstanding: total,
      partialCount: partial,
      unpaidCount: bills.length - partial,
    }
  }, [bills])

  // Filter and sort bills.
  const visibleBills = useMemo(() => {
    let result = bills

    if (filter === 'unpaid') {
      result = result.filter((bill) => bill.amountPaid <= 0)
    } else if (filter === 'partial') {
      result = result.filter((bill) => bill.amountPaid > 0)
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.billDate.getTime() - b.billDate.getTime()

        case 'highest':
          return b.outstandingAmount - a.outstandingAmount

        case 'lowest':
          return a.outstandingAmount - b.outstandingAmount

        case 'newest':
        default:
          return b.billDate.getTime() - a.billDate.getTime()
      }
    })
  }, [bills, filter, sortBy])

  const filters: {
    key: Filter
    label: string
    count: number
  }[] = [
    { key: 'all', label: 'All', count: bills.length },
    { key: 'unpaid', label: 'Unpaid', count: unpaidCount },
    { key: 'partial', label: 'Partial', count: partialCount },
  ]

  const sortOptions: {
    value: SortOption
    label: string
  }[] = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest / Due since' },
    { value: 'highest', label: 'Highest amount' },
    { value: 'lowest', label: 'Lowest amount' },
  ]

  if (loading && bills.length === 0) {
    return <LoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-7">

        {/* Blue header */}
        <header className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 shadow-sm sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to billing"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:bg-blue-100 active:bg-blue-200"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Collections
              </h1>

              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                Outstanding payments and customer reminders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleReload()}
            disabled={loading}
            aria-label="Refresh collections"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? 'animate-spin' : ''}
            />
          </button>
        </header>

        {/* Refresh error */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
          >
            <div className="flex items-start gap-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => void handleReload()}
              className="min-h-11 rounded-lg px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Outstanding summary */}
        <section
          aria-label="Outstanding summary"
          className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-4 shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Total outstanding
              </p>

              <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-4xl">
                {formatCurrency(totalOutstanding)}
              </p>

              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Pending amount across all outstanding bills
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <MessageCircle size={23} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-blue-200/70 pt-4 text-xs font-semibold sm:text-sm">
            <span className="rounded-full bg-white px-3 py-1.5 text-slate-700 ring-1 ring-blue-200">
              {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
            </span>

            <span className="rounded-full bg-red-100 px-3 py-1.5 text-red-700">
              {unpaidCount} unpaid
            </span>

            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-amber-800">
              {partialCount} partial
            </span>
          </div>
        </section>

        {/* Filters and sorting */}
        {bills.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Outstanding bills
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Filter and sort pending customer payments.
                </p>
              </div>

              {/* Sort dropdown */}
              <div className="w-full sm:w-60">
                <label
                  htmlFor="collections-sort"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600"
                >
                  <ArrowDownWideNarrow size={15} />
                  Sort bills by
                </label>

                <select
                  id="collections-sort"
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as SortOption)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {sortOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter tabs */}
            <div
              role="tablist"
              aria-label="Filter bills"
              className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {filters.map(({ key, label, count }) => {
                const active = filter === key

                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(key)}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                      active
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    {label}

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!error && !loading && bills.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <CheckCircle2 className="h-9 w-9 text-blue-600" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              All caught up!
            </h2>

            <p className="mt-1 max-w-sm text-sm text-slate-500">
              There are no unpaid or partially paid bills. All customer payments are up to date.
            </p>
          </div>
        )}

        {/* Filter empty state */}
        {bills.length > 0 && visibleBills.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              No bills match this filter.
            </p>
          </div>
        )}

        {/* Bill cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
          {visibleBills.map((bill) => {
            const isPartiallyPaid = bill.amountPaid > 0

            const phoneNumber = normalizeIndianMobileNumber(
              bill.mobileNumber,
            )

            const hasPhoneNumber =
              phoneNumber.length === 12 &&
              phoneNumber.startsWith('91')

            const reminderMessage = createReminderMessage(
              bill,
              shop,
            )

            const smsLink =
              `sms:${phoneNumber}?body=${encodeURIComponent(reminderMessage)}`

            const whatsappLink =
              `https://wa.me/${phoneNumber}?text=${encodeURIComponent(reminderMessage)}`

            const customerName =
              bill.customerName?.trim() || 'Unknown customer'

            return (
              <article
                key={bill.receiptId}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-4"
              >
                {/* Customer information */}
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-bold text-blue-700"
                  >
                    {customerName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-semibold text-slate-900 sm:text-base">
                      {customerName}
                    </h3>

                    <p className="mt-0.5 truncate text-xs text-slate-500 sm:text-sm">
                      {bill.mobileNumber || 'No mobile number'}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold text-slate-900 tabular-nums sm:text-lg">
                      {formatCurrency(bill.outstandingAmount)}
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isPartiallyPaid
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isPartiallyPaid ? 'Partial' : 'Unpaid'}
                    </span>
                  </div>
                </div>

                {/* Bill details */}
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-3 py-3 text-xs sm:text-sm">
                  <dt className="text-slate-500">
                    Receipt
                  </dt>

                  <dd className="truncate text-right font-semibold text-slate-800">
                    {bill.receiptId}
                  </dd>

                  <dt className="text-slate-500">
                    Bill date
                  </dt>

                  <dd className="text-right font-medium text-slate-800">
                    {formatDate(bill.billDate)}
                  </dd>

                  <dt className="text-slate-500">
                    Due since
                  </dt>

                  <dd className="text-right font-medium text-slate-800">
                    {formatAge(bill.billDate)}
                  </dd>

                  {isPartiallyPaid && (
                    <>
                      <dt className="text-slate-500">
                        Paid so far
                      </dt>

                      <dd className="text-right font-semibold text-emerald-700 tabular-nums">
                        {formatCurrency(bill.amountPaid)}
                      </dd>
                    </>
                  )}
                </dl>

                {/* Call, SMS and WhatsApp actions */}
                <div className="mt-auto border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-3 gap-2">
                    {/* Call */}
                    <a
                      href={hasPhoneNumber ? `tel:+${phoneNumber}` : undefined}
                      aria-disabled={!hasPhoneNumber}
                      tabIndex={hasPhoneNumber ? undefined : -1}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition active:scale-[0.97] ${
                        hasPhoneNumber
                          ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Phone size={17} />
                      Call
                    </a>

                    {/* SMS */}
                    <a
                      href={hasPhoneNumber ? smsLink : undefined}
                      aria-disabled={!hasPhoneNumber}
                      tabIndex={hasPhoneNumber ? undefined : -1}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition active:scale-[0.97] ${
                        hasPhoneNumber
                          ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                          : 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
                      }`}
                    >
                      <MessageSquare size={17} />
                      SMS
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={hasPhoneNumber ? whatsappLink : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!hasPhoneNumber}
                      tabIndex={hasPhoneNumber ? undefined : -1}
                      className={`flex h-12 items-center justify-center gap-1 rounded-xl px-1.5 text-sm font-semibold transition active:scale-[0.97] ${
                        hasPhoneNumber
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'pointer-events-none bg-slate-200 text-slate-400'
                      }`}
                    >
                      <MessageCircle size={17} />
                      WhatsApp
                    </a>
                  </div>

                  {!hasPhoneNumber && (
                    <p className="mt-2 text-center text-xs text-slate-500">
                      Add a valid mobile number to use these actions.
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {/* Footer */}
        {bills.length > 0 && (
          <p className="pt-3 text-center text-xs text-slate-400">
            Showing {visibleBills.length} of {bills.length} outstanding bills
          </p>
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Pocket Bill · Collections
        </p>
      </main>
    </div>
  )
}
