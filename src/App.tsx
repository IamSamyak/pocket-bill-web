
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Plus,
  QrCode,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Menu,
  Settings,
  History,
  LogOut,
  UserRound,
} from 'lucide-react'

import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth'

import { auth } from './firebase'

import { getCatalog } from './services/catalogService'
import type {
  Category,
  InventoryProduct,
} from './services/catalogService'

import {
  createBill,
  type CreatedBill,
  type PaymentMethod,
} from './services/billService'

import {
  createPrintRequest,
  type PrintRequestStatus,
} from './services/printRequestService'

import CategoryImageManager from './components/settings/CategoryImageManager'
import BillHistoryScreen from './components/history/BillHistoryScreen'

import QrScanner from './components/bill/QrScanner'
import CategorySelector from './components/bill/CategorySelector'
import CustomerDetailsSection from './components/bill/CustomerDetailsSection'
import BillItemsList from './components/bill/BillItemsList'
import BillItemAddEditSheet from './components/bill/BillItemAddEditSheet'
import FinalizedBillScreen from './components/bill/FinalizedBillScreen'

type BillItem = {
  id: string
  name: string
  size: string
  rate: number
  quantity: number
  discount: number
  categoryId: string
  batchId: string
  inventoryId: string
  availableQuantity: number
  isInventoryTracked: boolean
}

const money = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`

const normalizeSize = (size: string) =>
  size.trim() || 'NA'

function App() {
  const [customerName, setCustomerName] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')

  // null means Amount Paid follows Total automatically.
  // A string means the user has manually edited Amount Paid.
  const [manualAmountPaid, setManualAmountPaid] =
    useState<string | null>(null)

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('cash')

  const [items, setItems] = useState<BillItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<InventoryProduct[]>([])

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Manual item flow
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showItemSheet, setShowItemSheet] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

  const [showQrScanner, setShowQrScanner] = useState(false)

  // App navigation
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Authentication
  const [currentUser, setCurrentUser] = useState<User | null>(
    auth.currentUser,
  )
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Bill saving and finalized screen
  const [isSavingBill, setIsSavingBill] = useState(false)
  const [savedBill, setSavedBill] = useState<CreatedBill | null>(null)

  // Print request state
  const [printStatus, setPrintStatus] = useState<
    'idle' | 'sending' | PrintRequestStatus
  >('idle')

  const [printError, setPrintError] = useState('')

  const printStatusUnsubscribeRef = useRef<(() => void) | null>(null)

  // Snackbar
  const [notice, setNotice] = useState('')

  // Automatically dismiss snackbar after 3 seconds.
  useEffect(() => {
    if (!notice) return

    const timeoutId = window.setTimeout(() => {
      setNotice('')
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [notice])

  // Listen to the currently authenticated Firebase user.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    return () => {
      printStatusUnsubscribeRef.current?.()
      printStatusUnsubscribeRef.current = null
    }
  }, [])

  // Load categories and inventory catalog.
  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      try {
        const catalog = await getCatalog()

        if (cancelled) return

        setCategories(catalog.categories)
        setProducts(catalog.products)
      } catch (error) {
        console.error('Failed to load Firestore catalog:', error)

        if (!cancelled) {
          setCatalogError(
            'Unable to load inventory. Please try again.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCatalog(false)
        }
      }
    }

    void loadCatalog()

    return () => {
      cancelled = true
    }
  }, [])

  // Bill calculations.
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.rate * item.quantity,
        0,
      ),
    [items],
  )

  const totalDiscount = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Math.floor(
            (item.rate * item.quantity * item.discount) / 100,
          ),
        0,
      ),
    [items],
  )

  const total = subtotal - totalDiscount

  // Amount Paid follows Total unless manually overridden.
  const amountPaid = manualAmountPaid ?? String(total)

  // ---------------- NAVIGATION ----------------

  function openSettings() {
    setShowMenu(false)
    setShowHistory(false)
    setShowAccount(false)
    setShowSettings(true)
  }

  function openHistory() {
    setShowMenu(false)
    setShowSettings(false)
    setShowAccount(false)
    setShowHistory(true)
  }

  function openAccount() {
    setShowMenu(false)
    setShowSettings(false)
    setShowHistory(false)
    setShowAccount(true)
  }

  function backToBilling() {
    setShowSettings(false)
    setShowHistory(false)
    setShowAccount(false)
  }

  async function handleLogout() {
    try {
      setIsLoggingOut(true)
      await signOut(auth)
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
      setNotice('Unable to sign out. Please try again.')
    }
  }

  // ---------------- MANUAL ITEM FLOW ----------------

  function openManualItemFlow() {
    if (isLoadingCatalog || catalogError) return

    setSelectedCategoryId('')
    setShowCategoryPicker(true)
  }

  function handleCategorySelect(category: Category) {
    setSelectedCategoryId(category.id)
    setShowCategoryPicker(false)
    setShowItemSheet(true)
  }

  function closeItemDetails() {
    setShowItemSheet(false)
    setSelectedCategoryId('')
  }

  // ---------------- INVENTORY ITEM MANAGEMENT ----------------

  function addInventoryItem(product: InventoryProduct) {
    if (product.availableQuantity <= 0) {
      setNotice('This item is out of stock.')
      return
    }

    const itemId = `${product.batchId}:${product.id}`

    const existingItem = items.find(
      (item) => item.id === itemId,
    )

    if (
      existingItem &&
      existingItem.quantity >= product.availableQuantity
    ) {
      setNotice('You cannot add more than the available stock.')
      return
    }

    setItems((current) => {
      const existing = current.find(
        (item) => item.id === itemId,
      )

      if (existing) {
        return current.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...current,
        {
          id: itemId,
          name: product.categoryName,
          size: normalizeSize(product.size),
          rate: product.sellingRate,
          quantity: 1,
          discount: product.discount,
          categoryId: product.categoryId,
          batchId: product.batchId,
          inventoryId: product.id,
          availableQuantity: product.availableQuantity,
          isInventoryTracked: true,
        },
      ]
    })

    setNotice(`${product.categoryName} scanned and added.`)
  }

  // Add legacy QR item without inventory tracking.
  function addLegacyQrItem(
    category: Category,
    rate: number,
    size: string,
  ) {
    const normalizedSize = normalizeSize(size)
    const itemId = `${category.id}_${rate}_${normalizedSize}_NA_NA`

    setItems((current) => {
      const existingItem = current.find(
        (item) => item.id === itemId,
      )

      if (existingItem) {
        return current.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...current,
        {
          id: itemId,
          name: category.label,
          size: normalizedSize,
          rate,
          quantity: 1,
          discount: category.discount,
          categoryId: category.id,
          batchId: 'NA',
          inventoryId: 'NA',
          availableQuantity: Number.MAX_SAFE_INTEGER,
          isInventoryTracked: false,
        },
      ]
    })

    setNotice(`${category.label} added from QR code.`)
  }

  // ---------------- QR SCANNING ----------------

  function handleQrScan(rawValue: string) {
    const parts = rawValue.split('|').map((part) => part.trim())

    if (parts.length < 2) {
      setNotice('Invalid QR code.')
      return
    }

    /*
     * LEGACY TWO-PART FORMAT:
     * categoryId | rate
     *
     * CURRENT FORMAT:
     * batchId | itemId
     */
    const isLegacyTwoPartQr =
      parts.length === 2 &&
      categories.some(
        (category) => category.id === parts[0],
      ) &&
      parts[1] !== '' &&
      Number.isInteger(Number(parts[1]))

    if (parts.length === 2 && !isLegacyTwoPartQr) {
      const [batchId, itemId] = parts

      const product = products.find(
        (item) =>
          item.batchId === batchId &&
          item.id === itemId,
      )

      if (!product) {
        setNotice(
          'Product not found. Please refresh the catalog and scan again.',
        )
        return
      }

      if (product.availableQuantity <= 0) {
        setNotice('This inventory item is out of stock.')
        return
      }

      addInventoryItem(product)
      return
    }

    /*
     * LEGACY FORMAT:
     * categoryId | rate | size | dealerId | inventoryId | batchId
     */
    const [
      categoryId,
      rateValue,
      sizeValue,
      dealerId = 'NA',
      inventoryId = 'NA',
      batchId = 'NA',
    ] = parts

    const rate = Number(rateValue)

    if (
      !categoryId ||
      !Number.isInteger(rate) ||
      rate < 0
    ) {
      setNotice('Invalid QR code details.')
      return
    }

    const category = categories.find(
      (item) => item.id === categoryId,
    )

    if (!category) {
      setNotice('QR code contains an unknown category.')
      return
    }

    const size = normalizeSize(sizeValue || 'NA')

    // Legacy QR without real inventory references.
    if (
      !inventoryId ||
      !batchId ||
      inventoryId === 'NA' ||
      batchId === 'NA'
    ) {
      addLegacyQrItem(category, rate, size)
      return
    }

    // Resolve legacy inventory QR against the actual catalog.
    const product = products.find(
      (item) =>
        item.categoryId === categoryId &&
        item.id === inventoryId &&
        item.batchId === batchId &&
        item.dealerId === dealerId &&
        item.sellingRate === rate &&
        normalizeSize(item.size) === size,
    )

    if (!product) {
      setNotice(
        'QR details do not match the current inventory catalog.',
      )
      return
    }

    if (product.availableQuantity <= 0) {
      setNotice('This inventory item is out of stock.')
      return
    }

    addInventoryItem(product)
  }

  // ---------------- MANUAL ITEM ADD ----------------

  function addManualItem(values: {
    categoryId: string
    quantity: number
    rate: number
    size: string
  }) {
    const category = categories.find(
      (item) => item.id === values.categoryId,
    )

    if (!category) {
      setNotice('Please select a valid category.')
      return
    }

    const size = normalizeSize(values.size)
    const itemId = `${category.id}_${values.rate}_${size}_NA_NA`

    setItems((current) => {
      const existingItem = current.find(
        (item) => item.id === itemId,
      )

      if (existingItem) {
        return current.map((item) =>
          item.id === itemId
            ? {
              ...item,
              quantity: item.quantity + values.quantity,
            }
            : item,
        )
      }

      return [
        ...current,
        {
          id: itemId,
          name: category.label,
          size,
          rate: values.rate,
          quantity: values.quantity,
          discount: category.discount,
          categoryId: category.id,
          batchId: 'NA',
          inventoryId: 'NA',
          availableQuantity: Number.MAX_SAFE_INTEGER,
          isInventoryTracked: false,
        },
      ]
    })

    closeItemDetails()
    setNotice(`${category.label} added to bill.`)
  }

  // ---------------- QUANTITY MANAGEMENT ----------------

  function updateQuantity(id: string, amount: number) {
    const currentItem = items.find(
      (item) => item.id === id,
    )

    if (!currentItem) return

    if (
      currentItem.isInventoryTracked &&
      amount > 0 &&
      currentItem.quantity >= currentItem.availableQuantity
    ) {
      setNotice('You cannot exceed the available stock.')
      return
    }

    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item

        const nextQuantity = Math.max(
          1,
          item.quantity + amount,
        )

        return {
          ...item,
          quantity: item.isInventoryTracked
            ? Math.min(item.availableQuantity, nextQuantity)
            : nextQuantity,
        }
      }),
    )
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  // ---------------- BILL CREATION ----------------

  async function handleCreateBill() {
    if (isSavingBill) return

    if (
      mobileNumber.trim() &&
      !/^\d{10}$/.test(mobileNumber.trim())
    ) {
      setNotice('Please enter a valid 10-digit mobile number.')
      return
    }

    if (items.length === 0) {
      setNotice('Add at least one item before creating a bill.')
      return
    }

    const invalidStockItem = items.find(
      (item) =>
        item.isInventoryTracked &&
        item.quantity > item.availableQuantity,
    )

    if (invalidStockItem) {
      setNotice(
        `${invalidStockItem.name} exceeds available stock.`,
      )
      return
    }

    const parsedAmountPaid = Number(amountPaid || 0)

    if (
      !Number.isFinite(parsedAmountPaid) ||
      parsedAmountPaid < 0
    ) {
      setNotice('Please enter a valid amount paid.')
      return
    }

    // Never record a payment greater than the bill total.
    const finalAmountPaid = Math.min(
      Math.max(0, parsedAmountPaid),
      total,
    )

    setIsSavingBill(true)
    setNotice('Saving bill...')

    try {
      const result = await createBill({
        customerName: customerName.trim(),
        mobileNumber: mobileNumber.trim(),
        paymentMethod,
        amountPaid: finalAmountPaid,
        purchaseList: items.map((item) => ({
          categoryId: item.categoryId,
          batchId: item.batchId,
          inventoryId: item.inventoryId,
          rate: item.rate,
          quantity: item.quantity,
          discount: item.discount,
          size: item.size,
        })),
      })

      setSavedBill(result)
      printStatusUnsubscribeRef.current?.()
      printStatusUnsubscribeRef.current = null
      setPrintStatus('idle')
      setPrintError('')
      setNotice('')
    } catch (error) {
      console.error('Bill creation failed:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to save bill. Please try again.'

      setNotice(message)
    } finally {
      setIsSavingBill(false)
    }
  }

  // ---------------- PRINT REQUEST ----------------

  async function handlePrintBill() {
    if (
      !savedBill ||
      printStatus === 'sending' ||
      printStatus === 'pending' ||
      printStatus === 'processing'
    ) {
      return
    }

    printStatusUnsubscribeRef.current?.()
    printStatusUnsubscribeRef.current = null

    setPrintStatus('sending')
    setPrintError('')
    setNotice('')

    try {
      const subscription = await createPrintRequest(
        savedBill.receiptId,
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
    } catch (error) {
      console.error('Print request failed:', error)

      setPrintStatus('failed')
      setPrintError(
        error instanceof Error
          ? error.message
          : 'Unable to send the print request.',
      )
    }
  }

  // ---------------- RESET BILL ----------------

  function resetBill() {
    setCustomerName('')
    setMobileNumber('')

    // Restore automatic Amount Paid = Total for the next bill.
    setManualAmountPaid(null)

    setPaymentMethod('cash')
    setItems([])
    setIsEditing(false)
    setSavedBill(null)

    printStatusUnsubscribeRef.current?.()
    printStatusUnsubscribeRef.current = null

    setPrintStatus('idle')
    setPrintError('')

    setNotice('')
    setShowCategoryPicker(false)
    setShowItemSheet(false)
    setShowQrScanner(false)
    setShowMenu(false)
  }

  // ---------------- HISTORY SCREEN ----------------

  if (showHistory) {
    return (
      <>
        <BillHistoryScreen
          categories={categories}
          onBack={backToBilling}
        />
        {renderNotice()}
      </>
    )
  }

  // ---------------- ACCOUNT SCREEN ----------------

  if (showAccount) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <button
              onClick={backToBilling}
              className="rounded-xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              aria-label="Back to billing"
            >
              <ArrowLeft size={19} />
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
                <UserRound size={30} />
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
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={18} />
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </section>
        </main>

        {renderNotice()}
      </div>
    )
  }

  // ---------------- SETTINGS SCREEN ----------------

  if (showSettings) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <button
              onClick={backToBilling}
              className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
              aria-label="Back to billing"
            >
              <ArrowLeft size={19} />
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

        {renderNotice()}
      </div>
    )
  }

  // ---------------- FINALIZED BILL SCREEN ----------------

  if (savedBill) {
    return (
      <>
        <FinalizedBillScreen
          bill={savedBill}
          onPrint={handlePrintBill}
          printStatus={printStatus}
          printError={printError}
          onCreateNewBill={resetBill}
        />
        {renderNotice()}
      </>
    )
  }

  // ---------------- BILLING SCREEN ----------------

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <main className="mx-auto w-full max-w-xl px-4 pt-6 sm:px-6 sm:pt-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Pocket Bill
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Create a customer bill
            </p>
          </div>

          {/* Hamburger menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((value) => !value)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
              aria-label="Open menu"
              aria-expanded={showMenu}
            >
              <Menu size={22} />
            </button>

            {showMenu && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="fixed inset-0 z-30 cursor-default"
                  onClick={() => setShowMenu(false)}
                />

                <div className="absolute right-0 top-14 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={openSettings}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <Settings size={18} className="text-slate-500" />
                    Settings
                  </button>

                  <button
                    onClick={openHistory}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <History size={18} className="text-slate-500" />
                    Today's History
                  </button>

                  <button
                    onClick={openAccount}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    <UserRound size={18} className="text-slate-500" />
                    Account
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Customer details */}
        <CustomerDetailsSection
          customerName={customerName}
          mobileNumber={mobileNumber}
          amountPaid={amountPaid}
          totalAmount={total}
          onCustomerNameChange={setCustomerName}
          onMobileNumberChange={setMobileNumber}
          onAmountPaidChange={setManualAmountPaid}
        />

        {/* Add / Scan actions */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            onClick={openManualItemFlow}
            disabled={isLoadingCatalog || Boolean(catalogError)}
            className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={19} />
            Add Item
          </button>

          <button
            onClick={() => setShowQrScanner(true)}
            disabled={isLoadingCatalog || Boolean(catalogError)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <QrCode size={19} />
            Scan QR
          </button>
        </div>

        {catalogError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {catalogError}
          </div>
        )}

        {/* Bill items */}
        <BillItemsList
          items={items}
          isEditing={isEditing}
          onToggleEditing={() =>
            setIsEditing((value) => !value)
          }
          onIncrement={(id) => updateQuantity(id, 1)}
          onDecrement={(id) => updateQuantity(id, -1)}
          onRemove={removeItem}
        />

        {/* Payment details */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900">
              Payment Details
            </h2>
          </div>

          <p className="mb-2 text-sm font-medium text-slate-600">
            Payment method
          </p>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'cash', label: 'Cash', Icon: Banknote },
                { id: 'upi', label: 'UPI', Icon: Smartphone },
                { id: 'card', label: 'Card', Icon: CreditCard },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setPaymentMethod(id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${paymentMethod === id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600'
                  }`}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Bill summary */}
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">
            Bill Summary
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span>{money(totalDiscount)}</span>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  Total
                </span>

                <span className="text-xl font-bold text-slate-900">
                  {money(total)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <p className="pb-4 text-center text-xs text-slate-400">
          Pocket Bill · Simple billing for your shop
        </p>
      </main>

      {/* Sticky bottom action */}
      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(15,23,42,0.05)] backdrop-blur">
        <div className="mx-auto max-w-xl sm:px-2">
          <button
            onClick={handleCreateBill}
            disabled={isSavingBill}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingBill ? 'Saving Bill...' : 'Create Bill'}
            {!isSavingBill && (
              <span aria-hidden="true">→</span>
            )}
          </button>
        </div>
      </footer>

      {/* Category selector */}
      {showCategoryPicker && (
        <CategorySelector
          categories={categories}
          isLoading={isLoadingCatalog}
          error={catalogError}
          onSelect={handleCategorySelect}
          onClose={() => setShowCategoryPicker(false)}
        />
      )}

      {/* Item details */}
      {showItemSheet && (
        <BillItemAddEditSheet
          title="Add Item"
          categories={categories}
          isLoadingCategories={isLoadingCatalog}
          categoryError={catalogError}
          initialCategoryId={selectedCategoryId}
          autoFocusRate
          onClose={closeItemDetails}
          onSubmit={addManualItem}
        />
      )}

      {/* QR scanner */}
      {showQrScanner && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => setShowQrScanner(false)}
        />
      )}

      {renderNotice()}
    </div>
  )

  // Shared snackbar renderer.
  function renderNotice() {
    if (!notice) return null

    return (
      <div className="fixed inset-x-4 top-5 z-[100] mx-auto max-w-xl animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl">
          <span className="break-words">{notice}</span>

          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md p-0.5 text-slate-300 transition hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }
}

export default App
