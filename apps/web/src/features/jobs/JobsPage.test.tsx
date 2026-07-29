import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Job, JobListParams, Paginated } from './types'

const { fetchJobsMock, publishJobMock } = vi.hoisted(() => ({
  fetchJobsMock: vi.fn(),
  publishJobMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchJobs: fetchJobsMock,
  createJob: vi.fn(),
  updateJob: vi.fn(),
  publishJob: publishJobMock,
  closeJob: vi.fn(),
  deleteJob: vi.fn(),
}))

import { JobsPage } from './JobsPage'
import { makeJob, renderJobsUi } from './test-utils'

function page(jobs: Job[], meta: Partial<Paginated<Job>['meta']> = {}): Paginated<Job> {
  return {
    data: jobs,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 20,
      to: jobs.length,
      total: jobs.length,
      ...meta,
    },
  }
}

describe('JobsPage', () => {
  beforeEach(() => {
    fetchJobsMock.mockReset()
    publishJobMock.mockReset()
  })

  it('renders jobs returned by the API', async () => {
    fetchJobsMock.mockResolvedValue(page([makeJob({ title: 'Platform Engineer' })]))

    await renderJobsUi(<JobsPage />)

    expect(await screen.findByText('Platform Engineer')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('shows an empty state when there are no jobs', async () => {
    fetchJobsMock.mockResolvedValue(page([]))

    await renderJobsUi(<JobsPage />)

    expect(await screen.findByText(/no jobs match your filters/i)).toBeInTheDocument()
  })

  it('passes the selected status filter to the query', async () => {
    fetchJobsMock.mockResolvedValue(page([makeJob()]))
    const user = userEvent.setup()

    await renderJobsUi(<JobsPage />)
    await screen.findByText('Backend Engineer')

    const trigger = screen.getByRole('combobox', { name: /filter by status/i })
    trigger.focus()
    await user.keyboard('{Enter}')
    await user.click(await screen.findByRole('option', { name: 'Published' }))

    await waitFor(() => {
      const lastCall = fetchJobsMock.mock.calls.at(-1)?.[0] as JobListParams
      expect(lastCall.status).toBe('published')
      expect(lastCall.page).toBe(1)
    })
  })

  it('debounces search into the query params', async () => {
    fetchJobsMock.mockResolvedValue(page([makeJob()]))
    const user = userEvent.setup()

    await renderJobsUi(<JobsPage />)
    await screen.findByText('Backend Engineer')

    await user.type(screen.getByRole('searchbox', { name: /search jobs/i }), 'kubernetes')

    await waitFor(() => {
      const lastCall = fetchJobsMock.mock.calls.at(-1)?.[0] as JobListParams
      expect(lastCall.q).toBe('kubernetes')
    })
  })

  it('optimistically publishes a draft job from the row actions', async () => {
    fetchJobsMock.mockResolvedValueOnce(page([makeJob({ status: 'draft' })]))
    fetchJobsMock.mockResolvedValue(page([makeJob({ status: 'published' })]))
    publishJobMock.mockResolvedValue(makeJob({ status: 'published' }))
    const user = userEvent.setup()

    await renderJobsUi(<JobsPage />)
    await screen.findByText('Backend Engineer')

    await user.click(screen.getByRole('button', { name: /actions for backend engineer/i }))
    await user.click(await screen.findByRole('menuitem', { name: 'Publish' }))

    expect(publishJobMock.mock.calls[0]?.[0]).toBe('job-1')
    expect(await screen.findByText('Published')).toBeInTheDocument()
  })
})
