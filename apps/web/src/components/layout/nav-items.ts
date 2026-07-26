import { Briefcase, LayoutDashboard, Settings, Users } from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Jobs', to: '/jobs', icon: Briefcase },
  { label: 'Candidates', to: '/candidates', icon: Users },
  { label: 'Settings', to: '/settings', icon: Settings },
]
