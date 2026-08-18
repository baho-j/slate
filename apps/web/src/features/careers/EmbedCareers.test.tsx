import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Paginated, PublicJob } from './types'

const { fetchOrgMock, fetchJobsMock, fetchJobMock } = vi.hoisted(() => ({
  fetchOrgMock: vi.fn(),
  fetchJobsMock: vi.fn(),
  fetchJobMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchPublicOrganization: fetchOrgMock,
  fetchPublicJobs: fetchJobsMock,
  fetchPublicJob: fetchJobMock,
}))

import { makePublicJob, makePublicOrg, renderCareers } from './test-utils'

function page(jobs: PublicJob[]): Paginated<PublicJob> {
  return {
    data: jobs,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 20,
      to: jobs.length,
      total: jobs.length,
    },
  }
}

describe('embedded careers widget', () => {
  beforeEach(() => {
    fetchOrgMock.mockReset().mockResolvedValue(makePublicOrg())
    fetchJobsMock.mockReset().mockResolvedValue(page([makePublicJob()]))
    fetchJobMock.mockReset().mockResolvedValue({
      ...makePublicJob(),
      fields: [],
      criteria: [],
    })
  })

  it('renders the roles without the careers chrome', async () => {
    await renderCareers('/embed/o/acme')

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument()
    // The full-portal header (org name + "Visit website") is not rendered in embed mode.
    expect(screen.queryByText('Visit website')).not.toBeInTheDocument()
  })

  it('keeps job links inside the embed route', async () => {
    await renderCareers('/embed/o/acme')

    const link = await screen.findByRole('link', { name: /Backend Engineer/ })
    expect(link).toHaveAttribute('href', '/embed/o/acme/jobs/job-1')
  })

  it('deep-links back within the embed on the job detail', async () => {
    await renderCareers('/embed/o/acme/jobs/job-1')

    await screen.findByRole('heading', { name: 'Backend Engineer', level: 1 })
    const back = screen.getByRole('link', { name: /All roles/ })
    expect(back).toHaveAttribute('href', '/embed/o/acme')
  })

  it('still shows the org chrome on the non-embed portal', async () => {
    await renderCareers('/o/acme')

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument()
    const header = screen.getByText('Acme Inc.')
    expect(
      within(header.closest('header') as HTMLElement).getByText('Visit website'),
    ).toBeInTheDocument()
  })
})
