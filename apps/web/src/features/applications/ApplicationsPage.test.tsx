import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchApplicationsMock } = vi.hoisted(() => ({ fetchApplicationsMock: vi.fn() }))

vi.mock('./api', () => ({
  fetchApplications: fetchApplicationsMock,
  fetchApplication: vi.fn(),
  fetchCvDownloadUrl: vi.fn(),
}))

import { makeListItem, page, renderApplications } from './test-utils'

describe('ApplicationsPage', () => {
  beforeEach(() => {
    fetchApplicationsMock.mockReset()
  })

  it('renders the candidate rows', async () => {
    fetchApplicationsMock.mockResolvedValue(
      page([
        makeListItem({ candidate: { full_name: 'Grace Hopper', email: 'grace@example.com' } }),
      ]),
    )

    await renderApplications('/jobs/job-1/applications')

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('grace@example.com')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    fetchApplicationsMock.mockResolvedValue(page([]))

    await renderApplications('/jobs/job-1/applications')

    expect(await screen.findByText('No applications match your filters yet.')).toBeInTheDocument()
  })

  it('passes the search term to the query', async () => {
    fetchApplicationsMock.mockResolvedValue(page([makeListItem()]))

    await renderApplications('/jobs/job-1/applications')
    await screen.findByText('Grace Hopper')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search applications' }), 'grace')

    await waitFor(() =>
      expect(fetchApplicationsMock).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({ q: 'grace' }),
      ),
    )
  })

  it('passes the eligibility filter to the query', async () => {
    fetchApplicationsMock.mockResolvedValue(page([makeListItem()]))

    await renderApplications('/jobs/job-1/applications')
    await screen.findByText('Grace Hopper')

    await userEvent.click(screen.getByRole('combobox', { name: 'Filter by eligibility' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Ineligible' }))

    await waitFor(() =>
      expect(fetchApplicationsMock).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({ eligibility: 'ineligible' }),
      ),
    )
  })

  it('follows the next cursor when paging', async () => {
    fetchApplicationsMock.mockResolvedValue(page([makeListItem()], { next_cursor: 'cursor-2' }))

    await renderApplications('/jobs/job-1/applications')
    await screen.findByText('Grace Hopper')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(fetchApplicationsMock).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({ cursor: 'cursor-2' }),
      ),
    )
  })

  it('shows an error state', async () => {
    fetchApplicationsMock.mockRejectedValue(new Error('boom'))

    await renderApplications('/jobs/job-1/applications')

    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load applications")
  })
})
