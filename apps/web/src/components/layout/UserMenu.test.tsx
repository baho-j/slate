import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderInApp, testUser } from '@/tests/render'
import { UserMenu } from './UserMenu'

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }))

vi.mock('@/features/auth/api', () => ({
  logout: logoutMock,
  fetchMe: vi.fn(),
  login: vi.fn(),
}))

describe('UserMenu', () => {
  it('renders nothing without a signed-in user', async () => {
    await renderInApp(<UserMenu />, { user: null })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the signed-in user name on the trigger', async () => {
    await renderInApp(<UserMenu />)

    expect(screen.getByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
  })

  it('reveals email and role when opened', async () => {
    const user = userEvent.setup()
    await renderInApp(<UserMenu />)

    await user.click(screen.getByRole('button', { name: /Ada Lovelace/ }))

    expect(screen.getByText(testUser.email)).toBeInTheDocument()
    expect(screen.getByText('HR Manager')).toBeInTheDocument()
  })

  it('opens by keyboard and signs out via the menu item', async () => {
    const user = userEvent.setup()
    logoutMock.mockResolvedValue(undefined)
    await renderInApp(<UserMenu />)

    await user.tab()
    expect(screen.getByRole('button', { name: /Ada Lovelace/ })).toHaveFocus()

    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))

    expect(logoutMock).toHaveBeenCalledOnce()
  })
})
