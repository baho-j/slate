import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastRoot } from '@/components/ui/toast-context'
import { renderInApp } from '@/tests/render'

const { fetchFieldsMock, fetchCriteriaMock, replaceFieldsMock, replaceCriteriaMock } = vi.hoisted(
  () => ({
    fetchFieldsMock: vi.fn(),
    fetchCriteriaMock: vi.fn(),
    replaceFieldsMock: vi.fn(),
    replaceCriteriaMock: vi.fn(),
  }),
)

vi.mock('./api', () => ({
  fetchFields: fetchFieldsMock,
  fetchCriteria: fetchCriteriaMock,
  replaceFields: replaceFieldsMock,
  replaceCriteria: replaceCriteriaMock,
}))

import { JobBuilderPage } from './JobBuilderPage'
import type { ApplicationField, ScreeningCriterion } from './types'

const years: ApplicationField = {
  id: 1,
  label: 'Years of experience',
  key: 'years_experience',
  type: 'number',
  required: true,
  options: null,
  order: 0,
}

const permit: ApplicationField = {
  id: 2,
  label: 'Work permit',
  key: 'has_work_permit',
  type: 'boolean',
  required: true,
  options: null,
  order: 1,
}

const knockout: ScreeningCriterion = {
  id: 10,
  field_key: 'years_experience',
  operator: 'gte',
  value: 3,
  mode: 'knockout',
  weight: null,
}

async function renderBuilder() {
  return renderInApp(
    <ToastRoot>
      <JobBuilderPage jobId="job-1" />
    </ToastRoot>,
    { initialPath: '/jobs' },
  )
}

async function waitForLoaded() {
  await screen.findByRole('heading', { name: 'Application form' })
  await waitFor(() =>
    expect(screen.queryByText('Loading the form builder…')).not.toBeInTheDocument(),
  )
}

describe('JobBuilderPage', () => {
  beforeEach(() => {
    fetchFieldsMock.mockReset().mockResolvedValue([years, permit])
    fetchCriteriaMock.mockReset().mockResolvedValue([knockout])
    replaceFieldsMock.mockReset().mockResolvedValue([years, permit])
    replaceCriteriaMock.mockReset().mockResolvedValue([knockout])
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads the existing fields and rules into the builders', async () => {
    await renderBuilder()
    await waitForLoaded()

    const labels = screen.getAllByLabelText('Label') as HTMLInputElement[]
    expect(labels.map((input) => input.value)).toEqual(['Years of experience', 'Work permit'])
    expect(screen.getByDisplayValue('years_experience')).toBeInTheDocument()
    expect(screen.getByLabelText('Condition')).toHaveValue('gte')
  })

  it('adds a field and derives its key from the label', async () => {
    await renderBuilder()
    await waitForLoaded()

    await userEvent.click(screen.getByRole('button', { name: /Add field/ }))

    const labels = screen.getAllByLabelText('Label')
    const added = labels[labels.length - 1]
    if (!added) throw new Error('expected a new field row')

    await userEvent.type(added, 'Portfolio URL')

    expect(screen.getByDisplayValue('portfolio_url')).toBeInTheDocument()
  })

  it('reorders fields and saves the new order', async () => {
    await renderBuilder()
    await waitForLoaded()

    await userEvent.click(screen.getByRole('button', { name: 'Move Work permit up' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save form' }))

    await waitFor(() => expect(replaceFieldsMock).toHaveBeenCalled())
    expect(replaceFieldsMock.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({ key: 'has_work_permit', order: 0 }),
      expect.objectContaining({ key: 'years_experience', order: 1 }),
    ])
  })

  it('offers only the operators valid for the selected field type', async () => {
    await renderBuilder()
    await waitForLoaded()

    const condition = screen.getByLabelText('Condition')
    const optionsFor = (element: HTMLElement) =>
      within(element)
        .getAllByRole('option')
        .map((option) => (option as HTMLOptionElement).value)

    expect(optionsFor(condition)).toContain('gte')

    await userEvent.selectOptions(screen.getByLabelText('Field'), 'has_work_permit')

    const forBoolean = optionsFor(screen.getByLabelText('Condition'))
    expect(forBoolean).toContain('eq')
    expect(forBoolean).not.toContain('gte')
  })

  it('shows the weight input only for scored rules', async () => {
    await renderBuilder()
    await waitForLoaded()

    expect(screen.queryByLabelText('Weight')).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Mode'), 'scored')

    expect(screen.getByLabelText('Weight')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Mode'), 'knockout')

    expect(screen.queryByLabelText('Weight')).not.toBeInTheDocument()
  })

  it('warns before removing a field a rule references, and drops those rules on confirm', async () => {
    await renderBuilder()
    await waitForLoaded()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Years of experience' }))

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('1 screening rule references "Years of experience"'),
    )

    const labels = screen.getAllByLabelText('Label') as HTMLInputElement[]
    expect(labels.map((input) => input.value)).toEqual(['Work permit'])
    expect(screen.queryByLabelText('Condition')).not.toBeInTheDocument()
  })

  it('keeps the field when the warning is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderBuilder()
    await waitForLoaded()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Years of experience' }))

    const labels = screen.getAllByLabelText('Label') as HTMLInputElement[]
    expect(labels.map((input) => input.value)).toContain('Years of experience')
    expect(screen.getByLabelText('Condition')).toBeInTheDocument()
  })

  it('removes an unreferenced field without warning', async () => {
    await renderBuilder()
    await waitForLoaded()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Work permit' }))

    expect(window.confirm).not.toHaveBeenCalled()
    expect(screen.queryByDisplayValue('Work permit')).not.toBeInTheDocument()
  })

  it('saves fields and rules in the shapes the API expects', async () => {
    await renderBuilder()
    await waitForLoaded()

    await userEvent.selectOptions(screen.getByLabelText('Mode'), 'scored')
    await userEvent.click(screen.getByRole('button', { name: 'Save form' }))

    await waitFor(() => expect(replaceCriteriaMock).toHaveBeenCalled())

    expect(replaceCriteriaMock.mock.calls[0]?.[1]).toEqual([
      { field_key: 'years_experience', operator: 'gte', value: 3, mode: 'scored', weight: 10 },
    ])
    expect(await screen.findByText('Application form saved.')).toBeInTheDocument()
  })

  it('surfaces a server validation error against the offending field', async () => {
    replaceFieldsMock.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { 'fields.1.key': ['The key must be snake_case.'] } },
      },
    })

    await renderBuilder()
    await waitForLoaded()

    await userEvent.click(screen.getByRole('button', { name: 'Save form' }))

    expect(await screen.findByText('The key must be snake_case.')).toBeInTheDocument()
  })

  it('saves criteria before fields so removing a referenced field is accepted', async () => {
    const order: string[] = []
    replaceCriteriaMock.mockImplementation(async () => {
      order.push('criteria')
      return []
    })
    replaceFieldsMock.mockImplementation(async () => {
      order.push('fields')
      return [permit]
    })

    await renderBuilder()
    await waitForLoaded()

    await userEvent.click(screen.getByRole('button', { name: 'Remove Years of experience' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save form' }))

    await waitFor(() => expect(replaceFieldsMock).toHaveBeenCalled())

    expect(order).toEqual(['criteria', 'fields'])
    expect(replaceCriteriaMock.mock.calls[0]?.[1]).toEqual([])
    expect(replaceFieldsMock.mock.calls[0]?.[1]).toEqual([
      expect.objectContaining({ key: 'has_work_permit' }),
    ])
  })
})
