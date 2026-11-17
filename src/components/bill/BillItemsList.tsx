
import { Pencil, ShoppingBag } from 'lucide-react'

import BillItemCard, {
  type BillItemCardData,
} from './BillItemCard'

interface BillItemsListProps {
  items: BillItemCardData[]
  isEditing: boolean
  onToggleEditing: () => void
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
  onRemove: (id: string) => void
}

export default function BillItemsList({
  items,
  isEditing,
  onToggleEditing,
  onIncrement,
  onDecrement,
  onRemove,
}: BillItemsListProps) {
  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-slate-500" />

          <h2 className="font-semibold text-slate-900">
            Bill Items ({items.length})
          </h2>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onToggleEditing}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            <Pencil size={14} />
            {isEditing ? 'Done' : 'Edit items'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-slate-50 px-4 py-9 text-center">
          <ShoppingBag
            className="mx-auto mb-2 text-slate-400"
            size={28}
          />

          <p className="text-sm font-medium text-slate-700">
            No items added yet
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Add a manual item or scan an inventory QR code
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <BillItemCard
              key={item.id}
              item={item}
              isEditing={isEditing}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
