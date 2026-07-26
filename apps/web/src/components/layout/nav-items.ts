import { Briefcase, CalendarCheck, FileText, LayoutDashboard, Settings, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import type { UserRole } from '@/features/auth/types'

export interface NavItem {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
  roles: readonly UserRole[]
}

const staff = ['super_admin', 'hr_manager', 'recruiter'] as const

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, roles: [...staff, 'interviewer'] },
  { label: 'Jobs', to: '/jobs', icon: Briefcase, roles: staff },
  { label: 'Candidates', to: '/candidates', icon: Users, roles: staff },
  {
    label: 'Interviews',
    to: '/interviews',
    icon: CalendarCheck,
    roles: [...staff, 'interviewer'],
  },
  { label: 'My Applications', to: '/applications', icon: FileText, roles: ['candidate'] },
  { label: 'Settings', to: '/settings', icon: Settings, roles: ['super_admin', 'hr_manager'] },
]

export function navItemsFor(role: UserRole): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role))
}

export function canAccess(role: UserRole, path: string): boolean {
  return navItems.find((item) => item.to === path)?.roles.includes(role) ?? false
}

/** Where a role lands after login — candidates have no dashboard. */
export function homePathFor(role: UserRole): string {
  return navItemsFor(role)[0]?.to ?? '/'
}
