import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchInterviewersMock, scheduleInterviewMock, updateInterviewMock, submitEvaluationMock } =
  vi.hoisted(() => ({
    fetchInterviewersMock: vi.fn(),
    scheduleInterviewMock: vi.fn(),
    updateInterviewMock: vi.fn(),
    submitEvaluationMock: vi.fn(),
  }))

vi.mock('./api', () => ({
  fetchMyInterviews: vi.fn(),
  fetchInterviewers: fetchInterviewersMock,
  scheduleInterview: scheduleInterviewMock,
  updateInterview: updateInterviewMock,
  submitEvaluation: submitEvaluationMock,
}))

import { makeEvaluation, makeInterview, makeInterviewer, renderInterviewsPanel } from './test-utils'

async function openScheduleDialog() {
  await userEvent.click(screen.getByRole('button', { name: /Schedule/ }))
  return screen.findByRole('dialog')
}

describe('InterviewsPanel', () => {
  beforeEach(() => {
    fetchInterviewersMock.mockReset().mockResolvedValue([makeInterviewer()])
    scheduleInterviewMock.mockReset().mockResolvedValue(makeInterview())
    updateInterviewMock.mockReset().mockResolvedValue(makeInterview())
    submitEvaluationMock.mockReset().mockResolvedValue(makeEvaluation())
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

  it('lets the assigned interviewer submit an evaluation', async () => {
    submitEvaluationMock.mockResolvedValue(makeEvaluation())

    await renderInterviewsPanel(
      [makeInterview({ interviewer: makeInterviewer({ id: 1 }) })],
      'interviewer',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Evaluate' }))

    const dialog = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByLabelText('Rating'), '4')
    await userEvent.selectOptions(within(dialog).getByLabelText('Recommendation'), 'yes')
    await userEvent.type(within(dialog).getByLabelText('Comments'), 'Great fit.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit evaluation' }))

    await waitFor(() =>
      expect(submitEvaluationMock).toHaveBeenCalledWith('int-1', {
        rating: 4,
        recommendation: 'yes',
        comments: 'Great fit.',
      }),
    )
  })

  it('does not offer evaluation to an interviewer not assigned to the interview', async () => {
    await renderInterviewsPanel(
      [makeInterview({ interviewer: makeInterviewer({ id: 99 }) })],
      'interviewer',
    )

    expect(screen.queryByRole('button', { name: 'Evaluate' })).not.toBeInTheDocument()
  })

  it('does not offer evaluation once the interview is no longer scheduled', async () => {
    await renderInterviewsPanel(
      [makeInterview({ status: 'completed', interviewer: makeInterviewer({ id: 1 }) })],
      'interviewer',
    )

    expect(screen.queryByRole('button', { name: 'Evaluate' })).not.toBeInTheDocument()
  })

  it('shows a submitted evaluation to the hiring team', async () => {
    await renderInterviewsPanel([
      makeInterview({
        status: 'completed',
        evaluation: makeEvaluation({ rating: 5, recommendation: 'strong_yes' }),
      }),
    ])

    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('Strong yes')).toBeInTheDocument()
    expect(screen.getByText('Solid across the board.')).toBeInTheDocument()
  })
})
