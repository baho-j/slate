import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchApplicationMock, moveApplicationStageMock } = vi.hoisted(() => ({
  fetchApplicationMock: vi.fn(),
  moveApplicationStageMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchApplications: vi.fn(),
  fetchApplication: fetchApplicationMock,
  fetchCvDownloadUrl: vi.fn(),
  moveApplicationStage: moveApplicationStageMock,
}))

import { makeDetail, renderApplications } from './test-utils'

async function openDetailAndMove(target: string) {
  await renderApplications('/jobs/job-1/applications/app-1')
  await screen.findByRole('heading', { name: 'Grace Hopper' })

  await userEvent.click(screen.getByRole('combobox', { name: 'Move to stage' }))
  await userEvent.click(await screen.findByRole('option', { name: target }))
}

describe('StageMoveControl', () => {
  beforeEach(() => {
    fetchApplicationMock.mockReset()
    moveApplicationStageMock.mockReset()
  })

  it('optimistically shows the new stage before the request resolves', async () => {
    fetchApplicationMock.mockResolvedValue(makeDetail())
    let resolveMove: (value: unknown) => void = () => {}
    moveApplicationStageMock.mockReturnValue(
      new Promise((resolve) => {
        resolveMove = resolve
      }),
    )

    await openDetailAndMove('In Review')

    // Optimistic: the trigger reflects the new stage while the request is still pending.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Move to stage' })).toHaveTextContent(
        'In Review',
      ),
    )
    expect(moveApplicationStageMock).toHaveBeenCalledWith('app-1', 2, undefined)

    resolveMove(makeDetail({ current_stage: { id: 2, name: 'In Review' } }))
  })

  it('rolls back to the previous stage when the move fails', async () => {
    fetchApplicationMock.mockResolvedValue(makeDetail())
    moveApplicationStageMock.mockRejectedValue(new Error('boom'))

    await openDetailAndMove('In Review')

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Move to stage' })).toHaveTextContent('Applied'),
    )
  })
})
