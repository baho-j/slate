import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchOverviewMock, fetchJobAnalyticsMock, fetchJobsMock } = vi.hoisted(() => ({
  fetchOverviewMock: vi.fn(),
  fetchJobAnalyticsMock: vi.fn(),
  fetchJobsMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchOverview: fetchOverviewMock,
  fetchJobAnalytics: fetchJobAnalyticsMock,
}))

vi.mock('@/features/jobs/api', () => ({
  fetchJobs: fetchJobsMock,
}))

import { AnalyticsDashboard } from './AnalyticsDashboard'

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsDashboard />
    </QueryClientProvider>,
  )
}

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    fetchOverviewMock.mockReset().mockResolvedValue({
      open_jobs: 4,
      applications: 12,
      interviews_scheduled: 3,
      since: '2026-07-15T00:00:00+00:00',
    })
    fetchJobsMock.mockReset().mockResolvedValue({
      data: [{ id: 'job-1', title: 'Backend Engineer', status: 'published' }],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, per_page: 20, to: 1, total: 1 },
    })
    fetchJobAnalyticsMock.mockReset().mockResolvedValue({
      job: { id: 'job-1', title: 'Backend Engineer' },
      funnel: [
        { stage_id: 1, name: 'Applied', is_terminal: false, count: 10, conversion_rate: null },
        { stage_id: 2, name: 'Interview', is_terminal: false, count: 5, conversion_rate: 0.5 },
      ],
      time_in_stage: [
        { stage_id: 1, name: 'Applied', avg_hours: 6, median_hours: 4, samples: 3 },
        { stage_id: 2, name: 'Interview', avg_hours: null, median_hours: null, samples: 0 },
      ],
    })
  })

  it('shows the headline counts', async () => {
    renderDashboard()

    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders the funnel with conversion rate', async () => {
    renderDashboard()

    expect(await screen.findByText('Funnel')).toBeInTheDocument()
    expect(screen.getByText('50% from previous')).toBeInTheDocument()
  })

  it('renders time-in-stage and flags stages with no transitions', async () => {
    renderDashboard()

    expect(await screen.findByText('Time in stage')).toBeInTheDocument()
    expect(screen.getByText('6.0h avg')).toBeInTheDocument()
    expect(screen.getByText('No completed transitions yet.')).toBeInTheDocument()
  })

  it('prompts to create a job when there are none', async () => {
    fetchJobsMock.mockResolvedValue({
      data: [],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: null, last_page: 1, per_page: 20, to: null, total: 0 },
    })

    renderDashboard()

    expect(
      await screen.findByText(/Create a job to see its pipeline analytics/),
    ).toBeInTheDocument()
  })
})
