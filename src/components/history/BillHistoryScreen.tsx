
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ArrowLeft,
  Clock3,
  ReceiptText,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

import { getTodaysBills } from '../../services/billHistoryService'
import { createPrintRequest } from '../../services/printRequestService'
import { getShopDetails } from '../../services/shopProfileService'
import { generateBillPdf } from '../../services/billPdfService'

import type { HistoryBill } from '../../services/billHistoryService'
import type { Category } from '../../services/catalogService'
import type { PrintRequestStatus } from '../../services/printRequestService'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface BillHistoryScreenProps {
  categories: Category[]
  onBack: () => void
}

type PrintUiStatus = 'idle' | 'sending' | PrintRequestStatus

const money = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export default function BillHistoryScreen({
  categories,
  onBack,
}: BillHistoryScreenProps) {
  const [bills, setBills] = useState<HistoryBill[]>([])
  const [selectedBill, setSelectedBill] =
    useState<HistoryBill | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [printStatus, setPrintStatus] =
    useState<PrintUiStatus>('idle')

  const [printError, setPrintError] = useState('')

  const printStatusUnsubscribeRef = useRef<(() => void) | null>(null)

  const isPrinting =
    printStatus === 'sending' ||
    printStatus === 'pending' ||
    printStatus === 'processing'

  // Initial load.
  useEffect(() => {
    let cancelled = false

    async function fetchInitialBills() {
      try {
        const result = await getTodaysBills()

        if (cancelled) return

        setBills(result)
        setError('')
      } catch (err) {
        console.error("Failed to load today's bills:", err)

        if (!cancelled) {
          setError(
            "Unable to load today's bills. Please try again.",
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchInitialBills()

    return () => {
      cancelled = true
    }
  }, [])

  // Clean up the Firebase listener when this screen unmounts.
  useEffect(() => {
    return () => {
      printStatusUnsubscribeRef.current?.()
      printStatusUnsubscribeRef.current = null
    }
  }, [])

  // Refresh/retry history loading.
  async function loadBills() {
    try {
      setIsLoading(true)
      setError('')

      const result = await getTodaysBills()

      setBills(result)
    } catch (err) {
      console.error("Failed to load today's bills:", err)

      setError(
        "Unable to load today's bills. Please try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  const totalCollection = useMemo(
    () =>
      bills.reduce((sum, bill) => sum + bill.amountPaid, 0),
    [bills],
  )

  const totalBilled = useMemo(
    () =>
      bills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    [bills],
  )

  // Keep this callback stable for the PDF generation effect.
  const getCategoryName = useCallback(
    (categoryId: string) =>
      categories.find((category) => category.id === categoryId)
        ?.label ?? 'Unknown Category',
    [categories],
  )

  function clearPrintSubscription() {
    printStatusUnsubscribeRef.current?.()
    printStatusUnsubscribeRef.current = null
  }

  function openBill(bill: HistoryBill) {
    clearPrintSubscription()

    setSelectedBill(bill)
    setPrintStatus('idle')
    setPrintError('')
  }

  function closePreview() {
    clearPrintSubscription()

    setSelectedBill(null)
    setPrintStatus('idle')
    setPrintError('')
  }

  async function handlePrintBill() {
    if (!selectedBill || isPrinting) return

    clearPrintSubscription()

    setPrintStatus('sending')
    setPrintError('')

    try {
      const subscription = await createPrintRequest(
        selectedBill.receiptId,
        (update) => {
          setPrintStatus(update.status)
          setPrintError(update.error ?? '')
        },
        (error) => {
          console.error('Print status listener failed:', error)
          setPrintError(error.message)
        },
      )

      printStatusUnsubscribeRef.current = subscription.unsubscribe
    } catch (err) {
      console.error('Failed to submit print request:', err)

      setPrintStatus('failed')
      setPrintError(
        err instanceof Error
          ? err.message
          : 'Unable to send the print request.',
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            onClick={selectedBill ? closePreview : onBack}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
            aria-label={
              selectedBill
                ? 'Back to history'
                : 'Back to billing'
            }
          >
            <ArrowLeft size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-slate-900">
              {selectedBill ? 'Bill Preview' : "Today's History"}
            </h1>

            <p className="text-xs text-slate-500">
              {selectedBill
                ? `Receipt ${selectedBill.receiptId}`
                : formatDate(new Date())}
            </p>
          </div>

          {!selectedBill && (
            <button
              onClick={() => void loadBills()}
              disabled={isLoading}
              className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              aria-label="Refresh history"
            >
              <RefreshCw
                size={18}
                className={isLoading ? 'animate-spin' : ''}
              />
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {selectedBill ? (
          <BillPreview
            bill={selectedBill}
            getCategoryName={getCategoryName}
            printStatus={printStatus}
            printError={printError}
            isPrinting={isPrinting}
            onPrint={handlePrintBill}
          />
        ) : (
          <>
            {/* Collection summary */}
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Today's collection
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {money(totalCollection)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {bills.length}{' '}
                    {bills.length === 1 ? 'bill' : 'bills'} created
                    today
                  </p>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <ReceiptText
                    size={22}
                    className="text-blue-600"
                  />
                </div>
              </div>

              {!isLoading && bills.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Total billed
                    </p>

                    <p className="mt-1 font-semibold text-slate-800">
                      {money(totalBilled)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Outstanding
                    </p>

                    <p className="mt-1 font-semibold text-rose-600">
                      {money(
                        Math.max(
                          0,
                          totalBilled - totalCollection,
                        ),
                      )}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Bills heading */}
            <div className="mb-3 flex items-center justify-between px-1">
              <h2 className="font-semibold text-slate-900">
                Today's Bills
              </h2>

              {!isLoading && (
                <span className="text-sm font-semibold text-slate-600">
                  {bills.length} records
                </span>
              )}
            </div>

            {/* Loading */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

                <p className="mt-3 text-sm text-slate-500">
                  Loading today's bills...
                </p>
              </div>
            ) : error ? (
              /* Error */
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
                <p className="text-sm text-rose-700">
                  {error}
                </p>

                <button
                  onClick={() => void loadBills()}
                  className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Try again
                </button>
              </div>
            ) : bills.length === 0 ? (
              /* Empty state */
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center">
                <ReceiptText
                  size={34}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 font-semibold text-slate-800">
                  No bills today
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Bills created today will appear here.
                </p>
              </div>
            ) : (
              /* Bills list */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {bills.map((bill, index) => (
                  <button
                    key={bill.receiptId}
                    onClick={() => openBill(bill)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${index !== bills.length - 1
                      ? 'border-b border-slate-100'
                      : ''
                      }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                      {(
                        bill.customerName.trim()[0] || 'C'
                      ).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {bill.customerName.trim() ||
                          'Unknown Customer'}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>{bill.receiptId}</span>

                        <span>·</span>

                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {formatTime(bill.billDate)}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {money(bill.totalAmount)}
                      </p>

                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${bill.paid
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                          }`}
                      >
                        {bill.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function BillPreview({
  bill,
  getCategoryName,
  printStatus,
  printError,
  isPrinting,
  onPrint,
}: {
  bill: HistoryBill
  getCategoryName: (categoryId: string) => string
  printStatus: PrintUiStatus
  printError: string
  isPrinting: boolean
  onPrint: () => void
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState('')

  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const [pdfWidth, setPdfWidth] = useState(0)

  useEffect(() => {
    const container = pdfContainerRef.current

    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      setPdfWidth(Math.floor(entry.contentRect.width))
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [pdfUrl])

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function generatePreview() {
      try {
        setPdfUrl(null)
        setPdfError('')

        const shop = await getShopDetails()

        if (!shop) {
          throw new Error(
            'Shop profile was not found. Please configure shop details first.',
          )
        }

        const pdfBlob = generateBillPdf(
          bill,
          shop,
          getCategoryName,
        )

        objectUrl = URL.createObjectURL(pdfBlob)

        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = null
          return
        }

        setPdfUrl(objectUrl)
      } catch (err) {
        console.error('Failed to generate bill PDF:', err)

        if (!cancelled) {
          setPdfError(
            err instanceof Error
              ? err.message
              : 'Unable to generate the receipt preview.',
          )
        }
      }
    }

    void generatePreview()

    return () => {
      cancelled = true

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [bill, getCategoryName])

  const statusDetails = {
    sending: {
      title: 'Sending print request...',
      description: 'Submitting your request to Pocket Bill.',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      icon: RefreshCw,
      iconClass: 'animate-spin',
    },
    pending: {
      title: 'Waiting for Pocket Bill app',
      description:
        'Request sent. Waiting for the Flutter app to receive it.',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
      icon: Clock3,
      iconClass: '',
    },
    processing: {
      title: 'Printing bill...',
      description:
        'The Flutter app received the request and is communicating with the printer.',
      className: 'border-blue-200 bg-blue-50 text-blue-700',
      icon: RefreshCw,
      iconClass: 'animate-spin',
    },
    completed: {
      title: 'Print successful',
      description:
        'The Flutter app reported that the printing operation completed.',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700',
      icon: CheckCircle2,
      iconClass: '',
    },
    failed: {
      title: 'Printing failed',
      description:
        printError ||
        'The Flutter app could not complete printing.',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      icon: AlertCircle,
      iconClass: '',
    },
  }

  const statusInfo =
    printStatus === 'idle'
      ? null
      : statusDetails[printStatus]

  const StatusIcon = statusInfo?.icon

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-8">
      {/* PDF preview */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Receipt Preview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              80 mm thermal receipt
            </p>
          </div>

          <ReceiptText
            size={20}
            className="text-slate-500"
          />
        </div>

        {pdfUrl && !pdfError ? (
          <div
            ref={pdfContainerRef}
            className="flex min-h-[300px] justify-center overflow-x-auto bg-slate-100 p-2 sm:p-4"
          >
            <Document
              key={pdfUrl}
              file={pdfUrl}
              loading={
                <div className="flex min-h-[300px] items-center justify-center">
                  <p className="text-sm text-slate-500">
                    Loading PDF...
                  </p>
                </div>
              }
              onLoadError={(err) => {
                console.error('Failed to render bill PDF:', err)
                setPdfError('Unable to display the receipt PDF.')
              }}
            >
              <Page
                pageNumber={1}
                width={pdfWidth > 0 ? pdfWidth : 320}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        ) : pdfError ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
            <AlertCircle
              size={32}
              className="text-rose-500"
            />

            <p className="mt-3 font-semibold text-slate-800">
              Preview unavailable
            </p>

            <p className="mt-2 max-w-md text-sm text-rose-600">
              {pdfError}
            </p>
          </div>
        ) : (
          <div className="flex min-h-[450px] flex-col items-center justify-center bg-slate-50">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-3 text-sm font-medium text-slate-600">
              Generating receipt preview...
            </p>
          </div>
        )}
      </section>

      {/* Live print status */}
      {statusInfo && StatusIcon && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-3 rounded-xl border p-3 ${statusInfo.className}`}
        >
          <StatusIcon
            size={19}
            className={`mt-0.5 shrink-0 ${statusInfo.iconClass}`}
          />

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {statusInfo.title}
            </p>

            <p className="mt-1 break-words text-xs">
              {statusInfo.description}
            </p>
          </div>
        </div>
      )}

      {/* Thermal printer action */}
      <button
        onClick={onPrint}
        disabled={isPrinting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPrinting ? (
          <>
            <RefreshCw
              size={18}
              className="animate-spin"
            />

            {printStatus === 'sending'
              ? 'Sending Print Request...'
              : printStatus === 'pending'
                ? 'Waiting for App...'
                : 'Printing...'}
          </>
        ) : (
          <>
            <Printer size={19} />
            Print Bill
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        Keep the Pocket Bill Flutter app running and connected to
        your printer.
      </p>
    </div>
  )
}
