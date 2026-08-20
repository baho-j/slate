import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosError } from 'axios'
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

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ApplyForm orgSlug="acme" jobId="job-1" />
    </QueryClientProvider>,
  )
}

function pdfFile(name = 'cv.pdf') {
  return new File(['%PDF-1.4 content'], name, { type: 'application/pdf' })
}

describe('ApplyForm', () => {
  beforeEach(() => {
    uploadCvMock.mockReset()
    submitApplicationMock.mockReset()
  })

  it('shows validation errors when submitted empty', async () => {
    renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(await screen.findByText('Your name is required')).toBeInTheDocument()
    expect(screen.getByText('Your email is required')).toBeInTheDocument()
    expect(screen.getByText('Attach your CV')).toBeInTheDocument()
    expect(uploadCvMock).not.toHaveBeenCalled()
  })

  it('does not submit without a CV attached', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText('Full name'), 'Cora')
    await userEvent.type(screen.getByLabelText('Email'), 'cora@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(await screen.findByText('Attach your CV')).toBeInTheDocument()
    expect(uploadCvMock).not.toHaveBeenCalled()
  })

  it('flags a wrong-type CV on selection, before any upload', async () => {
    renderForm()

    const png = new File(['x'], 'photo.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText(/CV/), png, { applyAccept: false })

    expect(await screen.findByText('The file must be a PDF.')).toBeInTheDocument()
    expect(uploadCvMock).not.toHaveBeenCalled()
  })

  it('flags an oversized CV on selection', async () => {
    renderForm()

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'cv.pdf', {
      type: 'application/pdf',
    })
    await userEvent.upload(screen.getByLabelText(/CV/), big)

    expect(await screen.findByText('The file must be 5MB or smaller.')).toBeInTheDocument()
    expect(uploadCvMock).not.toHaveBeenCalled()
  })

  it('uploads the CV then submits and shows success', async () => {
    uploadCvMock.mockResolvedValue({ key: 'cv/x.pdf', originalName: 'cv.pdf' })
    submitApplicationMock.mockResolvedValue(undefined)
    renderForm()

    await userEvent.type(screen.getByLabelText('Full name'), 'Cora Candidate')
    await userEvent.type(screen.getByLabelText('Email'), 'cora@example.com')
    await userEvent.upload(screen.getByLabelText(/CV/), pdfFile())
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(await screen.findByText('Application submitted')).toBeInTheDocument()
    expect(uploadCvMock).toHaveBeenCalledOnce()
    expect(submitApplicationMock).toHaveBeenCalledWith(
      'acme',
      'job-1',
      expect.objectContaining({
        full_name: 'Cora Candidate',
        email: 'cora@example.com',
        cv_key: 'cv/x.pdf',
        cv_original_name: 'cv.pdf',
      }),
    )
  })

  it('shows a duplicate message on 409', async () => {
    uploadCvMock.mockResolvedValue({ key: 'cv/x.pdf', originalName: 'cv.pdf' })
    submitApplicationMock.mockRejectedValue({ response: { status: 409 } } as AxiosError)
    renderForm()

    await userEvent.type(screen.getByLabelText('Full name'), 'Cora')
    await userEvent.type(screen.getByLabelText('Email'), 'cora@example.com')
    await userEvent.upload(screen.getByLabelText(/CV/), pdfFile())
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }))

    await waitFor(() =>
      expect(screen.getByText("You've already applied to this role.")).toBeInTheDocument(),
    )
  })
})
