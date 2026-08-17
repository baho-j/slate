import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { UserRole } from '@/features/auth/types'
import { renderInApp, testUser } from '@/tests/render'
import { navItemsFor } from './nav-items'
import { SidebarNav } from './SidebarNav'

const as = (role: UserRole) => ({ user: { ...testUser, role } })

describe('SidebarNav', () => {
  it('renders every nav item allowed for the role', async () => {
    await renderInApp(<SidebarNav />, as('hr_manager'))

    for (const { label, to } of navItemsFor('hr_manager')) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', to)
    }
  })

  it('marks only the active route with aria-current', async () => {
    await renderInApp(<SidebarNav />, { ...as('hr_manager'), initialPath: '/jobs' })

    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('does not mark Dashboard active on a nested route', async () => {
    await renderInApp(<SidebarNav />, { ...as('hr_manager'), initialPath: '/candidates' })

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('reaches every nav item by Tab in order', async () => {
    const user = userEvent.setup()
    await renderInApp(<SidebarNav />, as('hr_manager'))

    for (const { label } of navItemsFor('hr_manager')) {
      await user.tab()
      expect(screen.getByRole('link', { name: label })).toHaveFocus()
    }
  })

  it('calls onNavigate when a link is followed', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    await renderInApp(<SidebarNav onNavigate={onNavigate} />, as('hr_manager'))

    await user.click(screen.getByRole('link', { name: 'Jobs' }))

    expect(onNavigate).toHaveBeenCalledOnce()
  })

  it('renders nothing when signed out', async () => {
    await renderInApp(<SidebarNav />, { user: null })

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  describe('per role', () => {
    it('hides Jobs, Talent pool and Settings from an interviewer', async () => {
      await renderInApp(<SidebarNav />, as('interviewer'))

      expect(screen.getByRole('link', { name: 'Interviews' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Jobs' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Talent pool' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
    })

    it('gives a candidate only their own applications', async () => {
      await renderInApp(<SidebarNav />, as('candidate'))

      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAccessibleName('My Applications')
    })

    it('hides Settings from a recruiter but keeps Jobs', async () => {
      await renderInApp(<SidebarNav />, as('recruiter'))

      expect(screen.getByRole('link', { name: 'Jobs' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
    })

    it('gives an hr_manager Settings', async () => {
      await renderInApp(<SidebarNav />, as('hr_manager'))

      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
    })

    it('never shows a staff role the candidate-only section', async () => {
      for (const role of ['super_admin', 'hr_manager', 'recruiter', 'interviewer'] as const) {
        const { unmount } = await renderInApp(<SidebarNav />, as(role))

        expect(screen.queryByRole('link', { name: 'My Applications' })).not.toBeInTheDocument()
        unmount()
      }
    })
  })
})
