import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastRoot } from '@/components/ui/toast-context'
import { authKeys } from '@/features/auth/hooks'
import type { User } from '@/features/auth/types'

const { fetchUsersMock, createUserMock, updateUserMock, deleteUserMock } = vi.hoisted(() => ({
  fetchUsersMock: vi.fn(),
  createUserMock: vi.fn(),
  updateUserMock: vi.fn(),
  deleteUserMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchUsers: fetchUsersMock,
  createUser: createUserMock,
  updateUser: updateUserMock,
  deleteUser: deleteUserMock,
  fetchOrganization: vi.fn(),
  updateOrganization: vi.fn(),
  uploadLogo: vi.fn(),
}))

import type { ManagedUser } from './types'
import { UserManagement } from './UserManagement'

function me(): User {
  return {
    id: 1,
    name: 'Hana HR',
    email: 'hr@slate.test',
    role: 'hr_manager',
    organization_id: 1,
    organization: { id: 1, name: 'Acme', slug: 'acme' },
  }
}

function makeUser(overrides: Partial<ManagedUser> = {}): ManagedUser {
  return {
    id: 2,
    name: 'Remy Recruiter',
    email: 'remy@acme.test',
    role: 'recruiter',
    organization_id: 1,
    ...overrides,
  }
}

async function renderUsers() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(authKeys.me, me())
  render(
    <QueryClientProvider client={queryClient}>
      <ToastRoot>
        <UserManagement />
      </ToastRoot>
    </QueryClientProvider>,
  )
  await screen.findByText('Team')
}

describe('UserManagement', () => {
  beforeEach(() => {
    fetchUsersMock.mockReset().mockResolvedValue([me() as unknown as ManagedUser, makeUser()])
    createUserMock.mockReset().mockResolvedValue(makeUser({ id: 3, name: 'New' }))
    updateUserMock.mockReset().mockResolvedValue(makeUser({ role: 'interviewer' }))
    deleteUserMock.mockReset().mockResolvedValue(undefined)
  })

  it('lists the team members', async () => {
    await renderUsers()

    expect(await screen.findByText('Remy Recruiter')).toBeInTheDocument()
    expect(screen.getByText('remy@acme.test')).toBeInTheDocument()
  })

  it('changes a member role', async () => {
    await renderUsers()
    await screen.findByText('Remy Recruiter')

    await userEvent.click(screen.getByRole('combobox', { name: 'Role for Remy Recruiter' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Interviewer' }))

    await waitFor(() => expect(updateUserMock).toHaveBeenCalledWith(2, { role: 'interviewer' }))
  })

  it('removes a member', async () => {
    await renderUsers()
    await screen.findByText('Remy Recruiter')

    await userEvent.click(screen.getByRole('button', { name: 'Remove Remy Recruiter' }))

    await waitFor(() => expect(deleteUserMock.mock.calls[0]?.[0]).toBe(2))
  })

  it('invites a colleague with a role', async () => {
    await renderUsers()

    await userEvent.click(screen.getByRole('button', { name: /Invite/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Name'), 'New Person')
    await userEvent.type(within(dialog).getByLabelText('Email'), 'new@acme.test')
    await userEvent.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Recruiter' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }))

    await waitFor(() =>
      expect(createUserMock.mock.calls[0]?.[0]).toEqual({
        name: 'New Person',
        email: 'new@acme.test',
        role: 'recruiter',
      }),
    )
  })
})
