import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchApplicationMock, fetchCvDownloadUrlMock } = vi.hoisted(() => ({
  fetchApplicationMock: vi.fn(),
  fetchCvDownloadUrlMock: vi.fn(),
}))

vi.mock('./api', () => ({
  fetchApplications: vi.fn(),
  fetchApplication: fetchApplicationMock,
  fetchCvDownloadUrl: fetchCvDownloadUrlMock,
}))

import { makeDetail, renderApplications } from './test-utils'

describe('ApplicationDetailPage', () => {
  beforeEach(() => {
    fetchApplicationMock.mockReset()
    fetchCvDownloadUrlMock.mockReset()
  })

  it('renders candidate info, cover note and history', async () => {
    fetchApplicationMock.mockResolvedValue(makeDetail())

    await renderApplications('/jobs/job-1/applications/app-1')

    expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument()
    expect(screen.getByText('+123')).toBeInTheDocument()
    expect(screen.getByText('I would love to join.')).toBeInTheDocument()
    expect(screen.getByText('Application submitted.')).toBeInTheDocument()
  })

  it('fetches a fresh download url and opens the CV', async () => {
    fetchApplicationMock.mockResolvedValue(makeDetail())
    fetchCvDownloadUrlMock.mockResolvedValue('https://blob.example/cv?sig=abc')
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    await renderApplications('/jobs/job-1/applications/app-1')

    await userEvent.click(await screen.findByRole('button', { name: /grace\.pdf/ }))

    await waitFor(() => expect(fetchCvDownloadUrlMock).toHaveBeenCalledWith('app-1', 10))
    expect(openSpy).toHaveBeenCalledWith(
      'https://blob.example/cv?sig=abc',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('shows an error state', async () => {
    fetchApplicationMock.mockRejectedValue(new Error('boom'))

    await renderApplications('/jobs/job-1/applications/app-1')

    expect(await screen.findByRole('alert')).toHaveTextContent("couldn't load this application")
  })
})
