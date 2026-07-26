import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UserRole } from '@/features/auth/types'
import { renderInApp, testUser } from '@/tests/render'
import { RequireNavAccess } from './RequireNavAccess'

const guarded = <RequireNavAccess>Secret content</RequireNavAccess>

const at = (role: UserRole, initialPath: string) => ({
  user: { ...testUser, role },
  initialPath,
})

describe('RequireNavAccess', () => {
  it('renders the page for a role that owns the route', async () => {
    await renderInApp(guarded, at('hr_manager', '/settings'))

    expect(screen.getByText('Secret content')).toBeInTheDocument()
  })

  it('blocks a typed URL the nav would have hidden', async () => {
    await renderInApp(guarded, at('interviewer', '/settings'))

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
    expect(screen.getByText('Not available')).toBeInTheDocument()
  })

  it('blocks a candidate from the staff dashboard', async () => {
    await renderInApp(guarded, at('candidate', '/'))

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })

  it('blocks a recruiter from Settings', async () => {
    await renderInApp(guarded, at('recruiter', '/settings'))

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
  })

  it('offers a way back to a page the role can actually use', async () => {
    await renderInApp(guarded, at('candidate', '/'))

    expect(screen.getByRole('link', { name: /my applications/i })).toHaveAttribute(
      'href',
      '/applications',
    )
  })

  it('renders nothing while signed out', async () => {
    await renderInApp(guarded, { user: null, initialPath: '/settings' })

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument()
    expect(screen.queryByText('Not available')).not.toBeInTheDocument()
  })
})
