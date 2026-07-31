import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Paginated, PublicJob } from './types'

const { fetchOrgMock, fetchJobsMock } = vi.hoisted(() => ({
  fetchOrgMock: vi.fn(),
  fetchJobsMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchPublicOrganization: fetchOrgMock,
  fetchPublicJobs: fetchJobsMock,
  fetchPublicJob: vi.fn(),
}))

import { makePublicJob, makePublicOrg, renderCareers } from './test-utils'

function page(jobs: PublicJob[], overrides: Partial<Paginated<PublicJob>['meta']> = {}) {
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
      ...overrides,
    },
  }
}

describe('CareersListPage', () => {
  beforeEach(() => {
    fetchOrgMock.mockReset()
    fetchJobsMock.mockReset()
    fetchOrgMock.mockResolvedValue(makePublicOrg())
  })

  it('renders the org name and its published roles', async () => {
    fetchJobsMock.mockResolvedValue(page([makePublicJob({ title: 'Backend Engineer' })]))

    await renderCareers('/o/acme')

    expect(await screen.findByRole('heading', { name: 'Backend Engineer' })).toBeInTheDocument()
    expect(screen.getAllByText('Acme Inc.').length).toBeGreaterThan(0)
  })

  it('sets the document title from the org', async () => {
    fetchJobsMock.mockResolvedValue(page([makePublicJob()]))

    await renderCareers('/o/acme')

    await waitFor(() => expect(document.title).toBe('Careers at Acme Inc.'))
  })

  it('shows an empty state when there are no roles', async () => {
    fetchJobsMock.mockResolvedValue(page([]))

    await renderCareers('/o/acme')

    expect(await screen.findByText('No open roles right now.')).toBeInTheDocument()
  })

  it('passes the search term to the query', async () => {
    fetchJobsMock.mockResolvedValue(page([makePublicJob()]))

    await renderCareers('/o/acme')
    await screen.findByRole('heading', { name: 'Backend Engineer' })

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search roles' }), 'kubernetes')

    await waitFor(() =>
      expect(fetchJobsMock).toHaveBeenCalledWith(
        'acme',
        expect.objectContaining({ q: 'kubernetes' }),
      ),
    )
  })

  it('shows a not-found message when the org does not exist', async () => {
    fetchOrgMock.mockRejectedValue({ response: { status: 404 } } as AxiosError)
    fetchJobsMock.mockRejectedValue({ response: { status: 404 } } as AxiosError)

    await renderCareers('/o/ghost')

    expect(await screen.findByRole('alert')).toHaveTextContent('could not be found')
  })
})
