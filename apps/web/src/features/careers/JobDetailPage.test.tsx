import { screen, waitFor } from '@testing-library/react'
import type { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchOrgMock, fetchJobMock } = vi.hoisted(() => ({
  fetchOrgMock: vi.fn(),
  fetchJobMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchPublicOrganization: fetchOrgMock,
  fetchPublicJobs: vi.fn(),
  fetchPublicJob: fetchJobMock,
}))

import { makePublicJob, makePublicOrg, renderCareers } from './test-utils'

describe('JobDetailPage', () => {
  beforeEach(() => {
    fetchOrgMock.mockReset()
    fetchJobMock.mockReset()
    fetchOrgMock.mockResolvedValue(makePublicOrg())
  })

  it('renders the job detail', async () => {
    fetchJobMock.mockResolvedValue(
      makePublicJob({ title: 'Staff Engineer', description: 'Lead the platform.' }),
    )

    await renderCareers('/o/acme/jobs/job-1')

    expect(await screen.findByRole('heading', { name: 'Staff Engineer' })).toBeInTheDocument()
    expect(screen.getByText('Lead the platform.')).toBeInTheDocument()
  })

  it('sets a per-job document title', async () => {
    fetchJobMock.mockResolvedValue(makePublicJob({ title: 'Staff Engineer' }))

    await renderCareers('/o/acme/jobs/job-1')

    await waitFor(() => expect(document.title).toBe('Staff Engineer · Acme Inc.'))
  })

  it('shows a closed message when the job 404s', async () => {
    fetchJobMock.mockRejectedValue({ response: { status: 404 } } as AxiosError)

    await renderCareers('/o/acme/jobs/missing')

    expect(await screen.findByRole('alert')).toHaveTextContent('no longer open')
  })
})
