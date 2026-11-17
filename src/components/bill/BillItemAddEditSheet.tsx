
import { useEffect, useMemo, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'

import type { Category } from '../../services/catalogService'
import CategorySelector from './CategorySelector'

interface BillItemAddEditSheetProps {
  title: string
  categories: Category[]
  isLoadingCategories: boolean
  categoryError: string
  initialCategoryId?: string
  initialQuantity?: number
  initialRate?: number
  initialSize?: string
  showDelete?: boolean
  autoFocusRate?: boolean
  onClose: () => void
  onSubmit: (values: {
    categoryId: string
    quantity: number
    rate: number
    size: string
  }) => void
  onDelete?: () => void
}

export default function BillItemAddEditSheet({
  title,
  categories,
  isLoadingCategories,
  categoryError,
  initialCategoryId,
  initialQuantity = 1,
  initialRate = 0,
  initialSize = 'NA',
  showDelete = false,
  autoFocusRate = false,
  onClose,
  onSubmit,
  onDelete,
}: BillItemAddEditSheetProps) {
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(initialCategoryId ?? '')

  const [quantity, setQuantity] = useState(
    String(initialQuantity),
  )

  const [rate, setRate] = useState(
    initialRate === 0 ? '' : String(initialRate),
  )

  const [size, setSize] = useState(
    initialSize === 'NA' ? '' : initialSize,
  )

  const [showCategoryPicker, setShowCategoryPicker] =
    useState(false)

  const selectedCategory = useMemo(
    () =>
      categories.find(
        (category) => category.id === selectedCategoryId,
      ) ?? null,
    [categories, selectedCategoryId],
  )

  const parsedRate = Number(rate)
  const parsedQuantity = Number(quantity)

  const isValid =
    Boolean(selectedCategoryId) &&
    rate.trim() !== '' &&
    Number.isFinite(parsedRate) &&
    parsedRate > 0 &&
    quantity.trim() !== '' &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0

  useEffect(() => {
    if (!autoFocusRate) return

    const timer = window.setTimeout(() => {
      document.getElementById('bill-item-rate')?.focus()
    }, 100)

    return () => window.clearTimeout(timer)
  }, [autoFocusRate])

  function handleSubmit() {
    if (!isValid) return

    onSubmit({
      categoryId: selectedCategoryId,
      quantity: parsedQuantity,
      rate: parsedRate,
      size: size.trim(),
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose()
          }
        }}
      >
        <section className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5 p-5">
            {/* Category */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Item Type <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowCategoryPicker(true)}
                disabled={isLoadingCategories || Boolean(categoryError)}
                className={`flex w-full items-center justify-between rounded-xl border bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                  selectedCategory
                    ? 'border-slate-200 text-slate-900'
                    : 'border-slate-300 text-slate-400'
                }`}
              >
                <span>
                  {isLoadingCategories
                    ? 'Loading categories...'
                    : selectedCategory?.label ?? 'Select item category'}
                </span>

                <ChevronDown
                  size={18}
                  className="text-slate-400"
                />
              </button>

              {categoryError && (
                <p className="mt-1.5 text-xs text-red-600">
                  {categoryError}
                </p>
              )}
            </div>

            {/* Rate and quantity */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Rate (₹) <span className="text-red-500">*</span>
                </span>

                <input
                  id="bill-item-rate"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  placeholder="Enter rate"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Quantity <span className="text-red-500">*</span>
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            {/* Size */}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Size
              </span>

              <input
                type="text"
                value={size}
                onChange={(event) => setSize(event.target.value)}
                placeholder="Enter size (optional)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>

            {/* Category discount */}
            {selectedCategory && selectedCategory.discount > 0 && (
              <div className="rounded-xl bg-green-50 px-3.5 py-3 text-sm text-green-800">
                Category discount: {selectedCategory.discount}%
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid}
              className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {title.toLowerCase().includes('add')
                ? 'Add Item'
                : 'Save'}
            </button>

            {showDelete && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Remove Item
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Category search and selection */}
      {showCategoryPicker && (
        <CategorySelector
          categories={categories}
          isLoading={isLoadingCategories}
          error={categoryError}
          onSelect={(category) => {
            setSelectedCategoryId(category.id)
            setShowCategoryPicker(false)
          }}
          onClose={() => setShowCategoryPicker(false)}
        />
      )}
    </>
  )
}
