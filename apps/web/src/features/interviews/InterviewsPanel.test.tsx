import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchInterviewersMock, scheduleInterviewMock, updateInterviewMock } = vi.hoisted(() => ({
  fetchInterviewersMock: vi.fn(),
  scheduleInterviewMock: vi.fn(),
  updateInterviewMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchMyInterviews: vi.fn(),
  fetchInterviewers: fetchInterviewersMock,
  scheduleInterview: scheduleInterviewMock,
  updateInterview: updateInterviewMock,
}))

import { makeInterview, makeInterviewer, renderInterviewsPanel } from './test-utils'

async function openScheduleDialog() {
  await userEvent.click(screen.getByRole('button', { name: /Schedule/ }))
  return screen.findByRole('dialog')
}

describe('InterviewsPanel', () => {
  beforeEach(() => {
    fetchInterviewersMock.mockReset().mockResolvedValue([makeInterviewer()])
    scheduleInterviewMock.mockReset().mockResolvedValue(makeInterview())
    updateInterviewMock.mockReset().mockResolvedValue(makeInterview())
  })

  it('shows a scheduled interview with its interviewer and location', async () => {
    await renderInterviewsPanel([makeInterview({ notes: 'System design round.' })])

    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
    expect(screen.getByText('Google Meet')).toBeInTheDocument()
    expect(screen.getByText('System design round.')).toBeInTheDocument()
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
  })

  it('shows an empty state when nothing is scheduled', async () => {
    await renderInterviewsPanel([])

    expect(screen.getByText('No interviews scheduled yet.')).toBeInTheDocument()
  })

  it('schedules an interview with the chosen interviewer and time', async () => {
    await renderInterviewsPanel([])

    const dialog = await openScheduleDialog()

    await waitFor(() => expect(fetchInterviewersMock).toHaveBeenCalled())
    await userEvent.selectOptions(within(dialog).getByLabelText('Interviewer'), '7')
    await userEvent.type(within(dialog).getByLabelText('Date and time'), '2026-09-01T09:00')
    await userEvent.type(within(dialog).getByLabelText('Location'), 'Helsinki office')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    await waitFor(() => expect(scheduleInterviewMock).toHaveBeenCalled())

    const [applicationId, payload] = scheduleInterviewMock.mock.calls[0] ?? []
    expect(applicationId).toBe('app-1')
    expect(payload).toMatchObject({ interviewer_id: 7, location: 'Helsinki office' })
    expect(payload.scheduled_at).toMatch(/^2026-09-01T/)
  })

  it('surfaces a validation error from the API', async () => {
    scheduleInterviewMock.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { scheduled_at: ['An interview must be scheduled in the future.'] } },
      },
    })

    await renderInterviewsPanel([])

    const dialog = await openScheduleDialog()
    await waitFor(() => expect(fetchInterviewersMock).toHaveBeenCalled())
    await userEvent.selectOptions(within(dialog).getByLabelText('Interviewer'), '7')
    await userEvent.type(within(dialog).getByLabelText('Date and time'), '2020-01-01T09:00')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Schedule' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An interview must be scheduled in the future.',
    )
  })

  it('marks an interview completed from the row menu', async () => {
    await renderInterviewsPanel([makeInterview()])

    await userEvent.click(screen.getByRole('button', { name: /Interview options/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Mark completed' }))

    await waitFor(() =>
      expect(updateInterviewMock).toHaveBeenCalledWith('int-1', { status: 'completed' }),
    )
  })

  it('does not offer the status an interview is already in', async () => {
    await renderInterviewsPanel([makeInterview({ status: 'completed' })])

    await userEvent.click(screen.getByRole('button', { name: /Interview options/ }))

    expect(await screen.findByRole('menuitem', { name: 'Mark no show' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Mark completed' })).not.toBeInTheDocument()
  })

  it('prefills the dialog when rescheduling', async () => {
    await renderInterviewsPanel([makeInterview()])

    await userEvent.click(screen.getByRole('button', { name: /Interview options/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Reschedule' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Location')).toHaveValue('Google Meet')
    expect(
      within(dialog).getByRole('heading', { name: 'Reschedule interview' }),
    ).toBeInTheDocument()
  })

  it('opens a blank form after closing a reschedule', async () => {
    await renderInterviewsPanel([makeInterview()])

    await userEvent.click(screen.getByRole('button', { name: /Interview options/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Reschedule' }))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const dialog = await openScheduleDialog()
    expect(within(dialog).getByLabelText('Location')).toHaveValue('')
    expect(within(dialog).getByRole('heading', { name: 'Schedule interview' })).toBeInTheDocument()
  })

  it('hides scheduling controls from an interviewer', async () => {
    await renderInterviewsPanel([makeInterview()], 'interviewer')

    expect(screen.queryByRole('button', { name: /Schedule/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Interview options/ })).not.toBeInTheDocument()
    expect(screen.getByText('Alan Turing')).toBeInTheDocument()
  })
})
