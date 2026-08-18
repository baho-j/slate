import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastRoot } from '@/components/ui/toast-context'
import type { CursorPaginated } from '@/features/applications/types'

const { fetchTalentPoolMock, removeFromPoolMock } = vi.hoisted(() => ({
  fetchTalentPoolMock: vi.fn(),
  removeFromPoolMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchTalentPool: fetchTalentPoolMock,
  addToPool: vi.fn(),
  removeFromPool: removeFromPoolMock,
}))

import { TalentPoolPage } from './TalentPoolPage'
import type { TalentPoolEntry } from './types'

function makeEntry(overrides: Partial<TalentPoolEntry> = {}): TalentPoolEntry {
  return {
    id: 'entry-1',
    tags: ['senior', 'backend'],
    note: 'Great fit.',
    candidate: { id: 'cand-1', full_name: 'Ada Lovelace', email: 'ada@example.com' },
    added_by: { id: 1, name: 'Remy Recruiter' },
    created_at: '2026-08-01T00:00:00+00:00',
    ...overrides,
  }
}

function pageOf(
  items: TalentPoolEntry[],
  next: string | null = null,
): CursorPaginated<TalentPoolEntry> {
  return {
    data: items,
    links: { first: null, last: null, prev: null, next },
    meta: { path: '/api/talent-pool', per_page: 20, next_cursor: next, prev_cursor: null },
  }
}

async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastRoot>
        <TalentPoolPage />
      </ToastRoot>
    </QueryClientProvider>,
  )
  await screen.findByRole('heading', { name: 'Talent pool' })
}

describe('TalentPoolPage', () => {
  beforeEach(() => {
    fetchTalentPoolMock.mockReset().mockResolvedValue(pageOf([makeEntry()]))
    removeFromPoolMock.mockReset().mockResolvedValue(undefined)
  })

  it('lists pooled candidates with their tags', async () => {
    await renderPage()

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('senior')).toBeInTheDocument()
    expect(screen.getByText('backend')).toBeInTheDocument()
  })

  it('passes the tag filter to the query', async () => {
    await renderPage()
    await screen.findByText('Ada Lovelace')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter by tag' }), 'senior')

    await waitFor(() =>
      expect(fetchTalentPoolMock).toHaveBeenCalledWith(expect.objectContaining({ tag: 'senior' })),
    )
  })

  it('passes the search term to the query', async () => {
    await renderPage()
    await screen.findByText('Ada Lovelace')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search talent pool' }), 'ada')

    await waitFor(() =>
      expect(fetchTalentPoolMock).toHaveBeenCalledWith(expect.objectContaining({ q: 'ada' })),
    )
  })

  it('removes an entry', async () => {
    await renderPage()
    await screen.findByText('Ada Lovelace')

    await userEvent.click(screen.getByRole('button', { name: /Remove Ada Lovelace/ }))

    await waitFor(() => expect(removeFromPoolMock.mock.calls[0]?.[0]).toBe('entry-1'))
  })

  it('shows an empty state', async () => {
    fetchTalentPoolMock.mockResolvedValue(pageOf([]))
    await renderPage()

    expect(await screen.findByText(/No one in the pool yet/)).toBeInTheDocument()
  })

  it('follows the next cursor', async () => {
    fetchTalentPoolMock.mockResolvedValue(pageOf([makeEntry()], 'cursor-2'))
    await renderPage()
    await screen.findByText('Ada Lovelace')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(fetchTalentPoolMock).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 'cursor-2' }),
      ),
    )
  })
})
