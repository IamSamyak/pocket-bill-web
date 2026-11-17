
interface BillItemPriceSummaryProps {
  rate: number
  quantity: number
  discount: number
}

const money = (amount: number) =>
  `₹${amount.toLocaleString('en-IN')}`

export default function BillItemPriceSummary({
  rate,
  quantity,
  discount,
}: BillItemPriceSummaryProps) {
  const grossAmount = rate * quantity
  const discountAmount = Math.floor(
    (grossAmount * discount) / 100,
  )
  const netAmount = grossAmount - discountAmount

  return (
    <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wide text-slate-400">
          RATE
        </p>
        <p className="mt-1 truncate text-sm font-bold text-slate-800">
          {money(rate)}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wide text-slate-400">
          DISCOUNT
        </p>
        <p
          className={`mt-1 truncate text-sm font-bold ${
            discount > 0
              ? 'text-green-700'
              : 'text-slate-400'
          }`}
        >
          {discount > 0 ? `${discount}% OFF` : '-'}
        </p>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-wide text-slate-400">
          NET AMOUNT
        </p>
        <p className="mt-1 truncate text-base font-bold text-blue-700">
          {money(netAmount)}
        </p>
      </div>
    </div>
  )
}
