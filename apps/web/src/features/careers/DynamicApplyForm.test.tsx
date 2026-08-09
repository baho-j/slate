import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { uploadCvMock, submitApplicationMock } = vi.hoisted(() => ({
  uploadCvMock: vi.fn(),
  submitApplicationMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchPublicOrganization: vi.fn(),
  fetchPublicJobs: vi.fn(),
  fetchPublicJob: vi.fn(),
  uploadCv: uploadCvMock,
  submitApplication: submitApplicationMock,
}))

import { ApplyForm } from './ApplyForm'
import type { ApplicationFieldDefinition, PublicCriterion } from './types'

const fields: ApplicationFieldDefinition[] = [
  {
    id: 1,
    label: 'Years of experience',
    key: 'years_experience',
    type: 'number',
    required: true,
    options: null,
    order: 0,
  },
  {
    id: 2,
    label: 'Work permit',
    key: 'has_work_permit',
    type: 'boolean',
    required: false,
    options: null,
    order: 1,
  },
  {
    id: 3,
    label: 'Degree',
    key: 'degree',
    type: 'select',
    required: false,
    options: ['bsc', 'msc'],
    order: 2,
  },
  {
    id: 4,
    label: 'Skills',
    key: 'skills',
    type: 'multiselect',
    required: false,
    options: ['php', 'react'],
    order: 3,
  },
]

const criteria: PublicCriterion[] = [
  { field_key: 'years_experience', operator: 'gte', value: 3, mode: 'knockout' },
  { field_key: 'skills', operator: 'includes_all', value: ['php'], mode: 'scored' },
]

function renderForm(props: Partial<Parameters<typeof ApplyForm>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <ApplyForm orgSlug="acme" jobId="job-1" fields={fields} criteria={criteria} {...props} />
    </QueryClientProvider>,
  )
}

function pdfFile() {
  return new File(['%PDF-1.4 content'], 'cv.pdf', { type: 'application/pdf' })
}

async function fillBaseDetails() {
  await userEvent.type(screen.getByLabelText('Full name'), 'Cora Candidate')
  await userEvent.type(screen.getByLabelText('Email'), 'cora@example.com')
  await userEvent.upload(screen.getByLabelText(/CV/), pdfFile())
}

describe('ApplyForm with dynamic fields', () => {
  beforeEach(() => {
    uploadCvMock.mockReset()
    submitApplicationMock.mockReset()
  })

  it('renders an input per field definition, typed by field type', () => {
    renderForm()

    expect(screen.getByLabelText('Years of experience')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText(/Work permit/)).toHaveAttribute('type', 'checkbox')
    expect(screen.getByLabelText(/Degree/).tagName).toBe('SELECT')
    expect(screen.getByLabelText('php')).toHaveAttribute('type', 'checkbox')
    expect(screen.getByLabelText('react')).toBeInTheDocument()
  })

  it('renders only the job it is given, with no fields for a bare job', () => {
    renderForm({ fields: [], criteria: [] })

    expect(screen.queryByLabelText('Years of experience')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Requirements' })).not.toBeInTheDocument()
  })

  it('blocks submission when a required answer is missing', async () => {
    renderForm()
    await fillBaseDetails()

    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(await screen.findByText('This field is required')).toBeInTheDocument()
    expect(submitApplicationMock).not.toHaveBeenCalled()
  })

  it('sends answers alongside the core fields', async () => {
    uploadCvMock.mockResolvedValue({ key: 'cv/x.pdf', originalName: 'cv.pdf' })
    submitApplicationMock.mockResolvedValue(undefined)
    renderForm()

    await fillBaseDetails()
    await userEvent.type(screen.getByLabelText('Years of experience'), '6')
    await userEvent.click(screen.getByLabelText(/Work permit/))
    await userEvent.selectOptions(screen.getByLabelText(/Degree/), 'msc')
    await userEvent.click(screen.getByLabelText('php'))

    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(await screen.findByText('Application submitted')).toBeInTheDocument()
    expect(submitApplicationMock).toHaveBeenCalledWith(
      'acme',
      'job-1',
      expect.objectContaining({
        answers: {
          years_experience: '6',
          has_work_permit: true,
          degree: 'msc',
          skills: ['php'],
        },
      }),
    )
  })

  it('updates live requirement feedback as answers change', async () => {
    renderForm()

    const requirements = screen.getByRole('region', { name: 'Requirements' })
    expect(within(requirements).getAllByText('not answered yet')).toHaveLength(2)

    await userEvent.type(screen.getByLabelText('Years of experience'), '6')
    expect(await within(requirements).findByText('met')).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Years of experience'))
    await userEvent.type(screen.getByLabelText('Years of experience'), '1')
    expect(await within(requirements).findByText('not met')).toBeInTheDocument()
  })

  it('states that the live feedback is not the final decision', () => {
    renderForm()

    expect(screen.getByText(/assessed by our team after you submit/i)).toBeInTheDocument()
  })
})
