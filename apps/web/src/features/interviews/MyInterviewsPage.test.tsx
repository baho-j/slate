import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchMyInterviewsMock } = vi.hoisted(() => ({ fetchMyInterviewsMock: vi.fn() }))

vi.mock('./api', () => ({
  fetchMyInterviews: fetchMyInterviewsMock,
  fetchInterviewers: vi.fn(),
  scheduleInterview: vi.fn(),
  updateInterview: vi.fn(),
}))

import { makeInterview, pageOf, renderMyInterviews } from './test-utils'

describe('MyInterviewsPage', () => {
  beforeEach(() => {
    fetchMyInterviewsMock.mockReset().mockResolvedValue(pageOf([]))
  })

  it('lists the interviews assigned to the signed-in interviewer', async () => {
    fetchMyInterviewsMock.mockResolvedValue(pageOf([makeInterview()]))

    await renderMyInterviews()

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
    expect(screen.getByText('Google Meet')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('asks for upcoming interviews first', async () => {
    await renderMyInterviews()

    await waitFor(() => expect(fetchMyInterviewsMock).toHaveBeenCalled())
    expect(fetchMyInterviewsMock.mock.calls[0]?.[0]).toMatchObject({ status: 'scheduled' })
  })

  it('refetches when the filter changes', async () => {
    await renderMyInterviews()
    await waitFor(() => expect(fetchMyInterviewsMock).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))

    await waitFor(() => {
      const statuses = fetchMyInterviewsMock.mock.calls.map((call) => call[0]?.status)
      expect(statuses).toContain('completed')
    })
  })

  it('shows an empty state rather than a blank page', async () => {
    await renderMyInterviews()

    expect(await screen.findByText('Nothing assigned to you yet.')).toBeInTheDocument()
  })

  it('links through to the application it belongs to', async () => {
    fetchMyInterviewsMock.mockResolvedValue(pageOf([makeInterview()]))

    await renderMyInterviews()

    const link = await screen.findByRole('link', { name: 'Open' })
    expect(link).toHaveAttribute('href', '/jobs/job-1/applications/app-1')
  })

  it('paginates when there is more than one page', async () => {
    fetchMyInterviewsMock.mockResolvedValue(pageOf([makeInterview()], 45))

    await renderMyInterviews()
    await screen.findByText('Grace Hopper')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      const pages = fetchMyInterviewsMock.mock.calls.map((call) => call[0]?.page)
      expect(pages).toContain(2)
    })
  })

  it('surfaces a load failure', async () => {
    fetchMyInterviewsMock.mockRejectedValue(new Error('boom'))

    await renderMyInterviews()

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load your interviews")
  })

  it('tells a recruiter why their list is empty', async () => {
    await renderMyInterviews('recruiter')

    expect(await screen.findByText(/Interviews you schedule for others/)).toBeInTheDocument()
  })
})
