
import {
  LayoutDashboard,
  History,
  Settings,
  UserRound,
  HandCoins,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

export type PageId =
  | 'billing'
  | 'dashboard'
  | 'history'
  | 'collections'
  | 'settings'
  | 'account'

export interface NavigationItem {
  id: Exclude<PageId, 'billing'>
  label: string
  icon: LucideIcon
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'history',
    label: "Today's History",
    icon: History,
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: HandCoins,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
  {
    id: 'account',
    label: 'Account',
    icon: UserRound,
  },
]
