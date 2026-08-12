import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchPipelineMock, fetchStageApplicationsMock, replaceStagesMock, moveStageMock } =
  vi.hoisted(() => ({
    fetchPipelineMock: vi.fn(),
    fetchStageApplicationsMock: vi.fn(),
    replaceStagesMock: vi.fn(),
    moveStageMock: vi.fn(),
  }))

vi.mock('./api', () => ({
  fetchPipeline: fetchPipelineMock,
  fetchStageApplications: fetchStageApplicationsMock,
  replaceStages: replaceStagesMock,
}))

vi.mock('@/features/applications/api', () => ({
  moveApplicationStage: moveStageMock,
}))

import { defaultStages, makeCard, makePipeline, makeStage, pageOf, renderBoard } from './test-utils'

function stageContents(name: string) {
  return within(screen.getByRole('region', { name }))
}

/** Routes each column's request to the cards seeded for that stage id. */
function seedColumns(byStage: Record<number, ReturnType<typeof makeCard>[]>) {
  fetchStageApplicationsMock.mockImplementation(async (_job: string, stageId: number) =>
    pageOf(byStage[stageId] ?? []),
  )
}

async function boardReady() {
  await screen.findByRole('region', { name: 'Applied' })
  await waitFor(() => expect(fetchStageApplicationsMock).toHaveBeenCalled())
}

describe('BoardPage', () => {
  beforeEach(() => {
    fetchPipelineMock.mockReset().mockResolvedValue(makePipeline())
    fetchStageApplicationsMock.mockReset()
    replaceStagesMock.mockReset()
    moveStageMock.mockReset().mockResolvedValue({})
    seedColumns({})
  })

  it('renders a column per pipeline stage', async () => {
    await renderBoard()
    await boardReady()

    for (const stage of defaultStages) {
      expect(screen.getByRole('region', { name: stage.name })).toBeInTheDocument()
    }
  })

  it('shows the candidate, match score and eligibility on a card', async () => {
    seedColumns({ 1: [makeCard({ match_score: 72, eligibility: 'manual' })] })

    await renderBoard()
    await boardReady()

    const card = await screen.findByRole('article', { name: 'Grace Hopper' })

    expect(within(card).getByText('grace@example.com')).toBeInTheDocument()
    expect(within(card).getByText('72%')).toBeInTheDocument()
    expect(within(card).getByText('Needs review')).toBeInTheDocument()
  })

  it('requests each stage independently', async () => {
    await renderBoard()
    await boardReady()

    await waitFor(() => expect(fetchStageApplicationsMock).toHaveBeenCalledTimes(3))

    const requestedStages = fetchStageApplicationsMock.mock.calls.map((call) => call[1])
    expect(requestedStages.sort()).toEqual([1, 2, 3])
  })

  it('moves a card to another stage and persists it', async () => {
    seedColumns({ 1: [makeCard()] })

    await renderBoard()
    await boardReady()
    await screen.findByRole('article', { name: 'Grace Hopper' })

    await userEvent.click(screen.getByRole('button', { name: /Move Grace Hopper/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Interview' }))

    await waitFor(() => expect(moveStageMock).toHaveBeenCalledWith('app-1', 2))
    expect(await screen.findByText('Grace Hopper moved to Interview.')).toBeInTheDocument()
  })

  it('shows the card in its new column before the server replies', async () => {
    seedColumns({ 1: [makeCard()] })

    let release = () => {}
    moveStageMock.mockImplementation(() => new Promise((resolve) => (release = () => resolve({}))))

    await renderBoard()
    await boardReady()
    await screen.findByRole('article', { name: 'Grace Hopper' })

    await userEvent.click(screen.getByRole('button', { name: /Move Grace Hopper/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Interview' }))

    await waitFor(() =>
      expect(stageContents('Interview').getByText('Grace Hopper')).toBeInTheDocument(),
    )
    expect(stageContents('Applied').queryByText('Grace Hopper')).not.toBeInTheDocument()

    release()
  })

  it('rolls the card back to its original column when the move fails', async () => {
    seedColumns({ 1: [makeCard()] })
    moveStageMock.mockRejectedValue(new Error('nope'))

    await renderBoard()
    await boardReady()
    await screen.findByRole('article', { name: 'Grace Hopper' })

    await userEvent.click(screen.getByRole('button', { name: /Move Grace Hopper/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Interview' }))

    expect(
      await screen.findByText('Could not move the application. Put it back.'),
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(stageContents('Applied').getByText('Grace Hopper')).toBeInTheDocument(),
    )
    expect(stageContents('Interview').queryByText('Grace Hopper')).not.toBeInTheDocument()
  })

  it('keeps the column totals consistent after a rollback', async () => {
    seedColumns({ 1: [makeCard()] })
    moveStageMock.mockRejectedValue(new Error('nope'))

    await renderBoard()
    await boardReady()
    await screen.findByRole('article', { name: 'Grace Hopper' })

    const appliedTotal = () => stageContents('Applied').getByText('1')

    await userEvent.click(screen.getByRole('button', { name: /Move Grace Hopper/ }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Interview' }))

    await screen.findByText('Could not move the application. Put it back.')
    await waitFor(() => expect(appliedTotal()).toBeInTheDocument())
  })

  it('moves a card on drop and does not offer its own stage as a target', async () => {
    seedColumns({ 1: [makeCard()] })

    await renderBoard()
    await boardReady()
    const card = await screen.findByRole('article', { name: 'Grace Hopper' })

    await userEvent.click(screen.getByRole('button', { name: /Move Grace Hopper/ }))
    expect(screen.queryByRole('menuitem', { name: 'Applied' })).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: () => 'app-1',
    }

    fireEvent.dragStart(card, { dataTransfer })
    fireEvent.drop(screen.getByRole('region', { name: 'Interview' }), { dataTransfer })

    await waitFor(() => expect(moveStageMock).toHaveBeenCalledWith('app-1', 2))
  })

  it('shows an empty column rather than a blank space', async () => {
    await renderBoard()
    await boardReady()

    expect(stageContents('Hired').getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('paginates a column without touching the others', async () => {
    fetchStageApplicationsMock.mockImplementation(
      async (_job: string, stageId: number, page: number) =>
        stageId === 1
          ? pageOf(
              [
                makeCard({
                  id: `app-page-${page}`,
                  candidate: { full_name: `Page ${page}`, email: 'p@example.com' },
                }),
              ],
              25,
            )
          : pageOf([]),
    )

    await renderBoard()
    await boardReady()
    await screen.findByText('Page 1')

    await userEvent.click(stageContents('Applied').getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Page 2')).toBeInTheDocument()
    expect(
      fetchStageApplicationsMock.mock.calls.filter((call) => call[1] === 2 && call[2] === 2),
    ).toHaveLength(0)
  })

  it('surfaces an error when the board cannot load', async () => {
    fetchPipelineMock.mockRejectedValue(new Error('boom'))

    await renderBoard()

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load the board")
  })

  it('hides stage configuration from a recruiter', async () => {
    await renderBoard('recruiter')
    await boardReady()

    expect(screen.queryByRole('button', { name: 'Configure stages' })).not.toBeInTheDocument()
  })

  it('lets an hr manager rename and reorder stages', async () => {
    replaceStagesMock.mockResolvedValue(makePipeline([makeStage({ id: 1, name: 'Screening' })]))

    await renderBoard('hr_manager')
    await boardReady()

    await userEvent.click(screen.getByRole('button', { name: 'Configure stages' }))

    const firstStage = await screen.findByLabelText('Stage 1 name')
    await userEvent.clear(firstStage)
    await userEvent.type(firstStage, 'Screening')
    await userEvent.click(screen.getByRole('button', { name: /Move Interview up/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save stages' }))

    await waitFor(() => expect(replaceStagesMock).toHaveBeenCalled())
    expect(replaceStagesMock.mock.calls[0]?.[1]).toEqual([
      { id: 2, name: 'Interview', is_terminal: false },
      { id: 1, name: 'Screening', is_terminal: false },
      { id: 3, name: 'Hired', is_terminal: true },
    ])
  })

  it('explains a 409 when a stage still holds applications', async () => {
    replaceStagesMock.mockRejectedValue({
      status: 409,
      response: {
        status: 409,
        data: { message: 'Cannot delete stages that still hold applications: Applied.' },
      },
    })

    await renderBoard('hr_manager')
    await boardReady()

    await userEvent.click(screen.getByRole('button', { name: 'Configure stages' }))
    await userEvent.click(await screen.findByRole('button', { name: /Remove Applied/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save stages' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot delete stages that still hold applications: Applied.',
    )
  })
})
