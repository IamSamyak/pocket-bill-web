
import { Minus, Plus } from 'lucide-react'

interface BillItemQuantityControlProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
}

export default function BillItemQuantityControl({
  quantity,
  onIncrement,
  onDecrement,
}: BillItemQuantityControlProps) {
  return (
    <div className="flex shrink-0 items-center rounded-xl border border-blue-200 bg-blue-50/70">
      <button
        type="button"
        onClick={onDecrement}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
        className="rounded-l-xl p-2 text-slate-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <Minus size={14} />
      </button>

      <span className="min-w-7 text-center text-sm font-bold text-blue-700">
        {quantity}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase quantity"
        className="rounded-r-xl p-2 text-slate-600 transition hover:bg-blue-100"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
