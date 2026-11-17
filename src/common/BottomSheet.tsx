
import type { ReactNode } from 'react'
import { X, ArrowLeft } from 'lucide-react'

type BottomSheetProps = {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
  onBack?: () => void
  footer?: ReactNode
}

export default function BottomSheet({
  title,
  subtitle,
  children,
  onClose,
  onBack,
  footer,
}: BottomSheetProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Go back"
            >
              <ArrowLeft size={19} />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-slate-100 bg-white p-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  )
}
