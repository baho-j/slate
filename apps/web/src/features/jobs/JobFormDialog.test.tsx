import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createJobMock, updateJobMock } = vi.hoisted(() => ({
  createJobMock: vi.fn(),
  updateJobMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchJobs: vi.fn(),
  createJob: createJobMock,
  updateJob: updateJobMock,
  publishJob: vi.fn(),
  closeJob: vi.fn(),
  deleteJob: vi.fn(),
}))

import { JobFormDialog } from './JobFormDialog'
import { makeJob, renderJobsUi } from './test-utils'

describe('JobFormDialog', () => {
  beforeEach(() => {
    createJobMock.mockReset()
    updateJobMock.mockReset()
  })

  it('blocks submission and shows validation errors when required fields are empty', async () => {
    const user = userEvent.setup()
    await renderJobsUi(<JobFormDialog open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Create job' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    expect(createJobMock).not.toHaveBeenCalled()
  })

  it('creates a job with the entered values', async () => {
    createJobMock.mockResolvedValue(makeJob())
    const onOpenChange = vi.fn()
    const user = userEvent.setup()

    await renderJobsUi(<JobFormDialog open onOpenChange={onOpenChange} />)

    await user.type(screen.getByLabelText('Title'), 'Data Analyst')
    await user.type(screen.getByLabelText('Description'), 'Crunch the numbers.')
    await user.click(screen.getByRole('button', { name: 'Create job' }))

    await waitFor(() => {
      expect(createJobMock.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ title: 'Data Analyst', description: 'Crunch the numbers.' }),
      )
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('pre-fills fields when editing and sends a patch', async () => {
    updateJobMock.mockResolvedValue(makeJob({ title: 'Senior Engineer' }))
    const user = userEvent.setup()

    await renderJobsUi(
      <JobFormDialog open onOpenChange={vi.fn()} job={makeJob({ title: 'Backend Engineer' })} />,
    )

    const title = screen.getByLabelText('Title')
    expect(title).toHaveValue('Backend Engineer')

    await user.clear(title)
    await user.type(title, 'Senior Engineer')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateJobMock).toHaveBeenCalledWith(
        'job-1',
        expect.objectContaining({ title: 'Senior Engineer' }),
      )
    })
  })

  it('surfaces server-side validation errors on the fields', async () => {
    createJobMock.mockRejectedValue({
      response: { data: { errors: { title: ['That title is taken.'] } } },
    })
    const user = userEvent.setup()

    await renderJobsUi(<JobFormDialog open onOpenChange={vi.fn()} />)

    await user.type(screen.getByLabelText('Title'), 'Duplicate')
    await user.type(screen.getByLabelText('Description'), 'Something.')
    await user.click(screen.getByRole('button', { name: 'Create job' }))

    expect(await screen.findByText('That title is taken.')).toBeInTheDocument()
  })
})
