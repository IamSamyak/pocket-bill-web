
import { useEffect, useState } from 'react'
import { Package, Trash2 } from 'lucide-react'

import { getCategoryImage } from '../../services/categoryImageService'
import BillItemQuantityControl from './BillItemQuantityControl'
import BillItemPriceSummary from './BillItemPriceSummary'

export interface BillItemCardData {
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

interface BillItemCardProps {
  item: BillItemCardData
  isEditing: boolean
  onIncrement: () => void
  onDecrement: () => void
  onRemove: () => void
}

function CategoryThumbnail({
  categoryId,
  categoryName,
}: {
  categoryId: string
  categoryName: string
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function loadImage() {
      try {
        const blob = await getCategoryImage(categoryId)

        if (!blob || cancelled) return

        objectUrl = URL.createObjectURL(blob)
        setImageUrl(objectUrl)
      } catch (error) {
        console.error('Failed to load category image:', error)
      }
    }

    loadImage()

    return () => {
      cancelled = true

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [categoryId])

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={categoryName}
          className="h-full w-full object-cover"
        />
      ) : (
        <Package size={23} className="text-slate-400" />
      )}
    </div>
  )
}

export default function BillItemCard({
  item,
  isEditing,
  onIncrement,
  onDecrement,
  onRemove,
}: BillItemCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <CategoryThumbnail
          categoryId={item.categoryId}
          categoryName={item.name}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-slate-900">
                {item.name}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Size: {item.size}
              </p>
            </div>

            <BillItemQuantityControl
              quantity={item.quantity}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          </div>

          {item.isInventoryTracked && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              Inventory item
              {isEditing && (
                <> · Available stock: {item.availableQuantity}</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <BillItemPriceSummary
          rate={item.rate}
          quantity={item.quantity}
          discount={item.discount}
        />
      </div>

      {isEditing && (
        <div className="mt-3 flex justify-end border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={13} />
            Remove item
          </button>
        </div>
      )}
    </article>
  )
}
