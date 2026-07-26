import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderInApp } from '@/tests/render'
import { navItems } from './nav-items'
import { SidebarNav } from './SidebarNav'

describe('SidebarNav', () => {
  it('renders every nav item as a link', async () => {
    await renderInApp(<SidebarNav />)

    for (const { label, to } of navItems) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', to)
    }
  })

  it('marks only the active route with aria-current', async () => {
    await renderInApp(<SidebarNav />, { initialPath: '/jobs' })

    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('does not mark Dashboard active on a nested route', async () => {
    await renderInApp(<SidebarNav />, { initialPath: '/candidates' })

    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('reaches every nav item by Tab in order', async () => {
    const user = userEvent.setup()
    await renderInApp(<SidebarNav />)

    for (const { label } of navItems) {
      await user.tab()
      expect(screen.getByRole('link', { name: label })).toHaveFocus()
    }
  })

  it('calls onNavigate when a link is followed', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    await renderInApp(<SidebarNav onNavigate={onNavigate} />)

    await user.click(screen.getByRole('link', { name: 'Jobs' }))

    expect(onNavigate).toHaveBeenCalledOnce()
  })
})
