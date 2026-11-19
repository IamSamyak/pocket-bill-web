
import { useState } from 'react'
import { Menu } from 'lucide-react'

import {
  navigationItems,
  type PageId,
} from './navigationConfig'

type AppMenuProps = {
  onNavigate: (page: PageId) => void
}

export default function AppMenu({ onNavigate }: AppMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  function handleNavigation(page: PageId) {
    setIsOpen(false)
    onNavigate(page)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100"
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Menu size={22} />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-14 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            {navigationItems.map((item) => {
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <Icon size={18} className="text-slate-500" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
