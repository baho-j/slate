import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastRoot } from '@/components/ui/toast-context'
import { authKeys } from '@/features/auth/hooks'
import type { User, UserRole } from '@/features/auth/types'

const { addToPoolMock } = vi.hoisted(() => ({ addToPoolMock: vi.fn() }))

vi.mock('./api', () => ({
  fetchTalentPool: vi.fn(),
  addToPool: addToPoolMock,
  removeFromPool: vi.fn(),
}))

import { TalentPoolPanel } from './TalentPoolPanel'

function testUser(role: UserRole = 'recruiter'): User {
  return {
    id: 1,
    name: 'Remy Recruiter',
    email: 'remy@slate.test',
    role,
    organization_id: 1,
    organization: { id: 1, name: 'Acme', slug: 'acme' },
  }
}

async function renderPanel(
  entry: { id: string; tags: string[]; note: string | null } | null,
  role: UserRole = 'recruiter',
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(authKeys.me, testUser(role))

  render(
    <QueryClientProvider client={queryClient}>
      <ToastRoot>
        <TalentPoolPanel
          applicationId="app-1"
          candidateId="cand-1"
          candidateName="Ada Lovelace"
          entry={entry}
        />
      </ToastRoot>
    </QueryClientProvider>,
  )
}

describe('TalentPoolPanel', () => {
  beforeEach(() => {
    addToPoolMock.mockReset().mockResolvedValue({
      id: 'entry-1',
      tags: ['senior'],
      note: null,
      candidate: { id: 'cand-1', full_name: 'Ada Lovelace', email: 'ada@example.com' },
      created_at: '2026-08-01T00:00:00+00:00',
    })
  })

  it('adds a candidate to the pool with parsed tags', async () => {
    await renderPanel(null)

    expect(screen.getByText('Not in the talent pool yet.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add to pool' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Tags'), 'senior, backend, senior')
    await userEvent.type(within(dialog).getByLabelText('Note'), 'Strong.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add to pool' }))

    await waitFor(() =>
      expect(addToPoolMock.mock.calls[0]?.[0]).toEqual({
        candidate_id: 'cand-1',
        tags: ['senior', 'backend'],
        note: 'Strong.',
      }),
    )
  })

  it('shows the existing entry and offers an update', async () => {
    await renderPanel({ id: 'entry-1', tags: ['senior'], note: 'Kept.' })

    expect(screen.getByRole('button', { name: /In pool/ })).toBeInTheDocument()
    expect(screen.getByText('senior')).toBeInTheDocument()
    expect(screen.getByText('Kept.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /In pool/ }))
    expect(
      within(await screen.findByRole('dialog')).getByRole('heading', {
        name: 'Update talent pool entry',
      }),
    ).toBeInTheDocument()
  })

  it('is hidden from an interviewer', async () => {
    await renderPanel(null, 'interviewer')

    expect(screen.queryByText('Talent pool')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add to pool' })).not.toBeInTheDocument()
  })
})
