import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastRoot } from '@/components/ui/toast-context'

const { updateOrganizationMock, uploadLogoMock } = vi.hoisted(() => ({
  updateOrganizationMock: vi.fn(),
  uploadLogoMock: vi.fn(),
}))

vi.mock('./api', () => ({
  updateOrganization: updateOrganizationMock,
  uploadLogo: uploadLogoMock,
  fetchOrganization: vi.fn(),
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))

import { OrgProfileForm } from './OrgProfileForm'
import type { Organization } from './types'

function org(overrides: Partial<Organization> = {}): Organization {
  return {
    id: 1,
    name: 'Acme Inc.',
    slug: 'acme',
    description: 'We build things.',
    website: 'https://acme.test',
    logo_url: null,
    ...overrides,
  }
}

function renderForm(organization = org()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastRoot>
        <OrgProfileForm organization={organization} />
      </ToastRoot>
    </QueryClientProvider>,
  )
}

describe('OrgProfileForm', () => {
  beforeEach(() => {
    updateOrganizationMock.mockReset().mockResolvedValue(org({ name: 'Acme Corp' }))
    uploadLogoMock.mockReset().mockResolvedValue('logos/new.png')
  })

  it('prefills and saves the profile', async () => {
    renderForm()

    const name = screen.getByLabelText('Name')
    expect(name).toHaveValue('Acme Inc.')

    await userEvent.clear(name)
    await userEvent.type(name, 'Acme Corp')
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() =>
      expect(updateOrganizationMock.mock.calls[0]?.[0]).toMatchObject({
        name: 'Acme Corp',
        website: 'https://acme.test',
      }),
    )
  })

  it('uploads a logo and includes its key on save', async () => {
    renderForm()

    const file = new File(['x'], 'brand.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText(/Upload logo/), file)

    await waitFor(() => expect(uploadLogoMock).toHaveBeenCalledWith(file))

    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() =>
      expect(updateOrganizationMock.mock.calls[0]?.[0]).toMatchObject({
        logo_key: 'logos/new.png',
      }),
    )
  })

  it('rejects an oversized logo before uploading', async () => {
    renderForm()

    const tooBig = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText(/Upload logo/), tooBig)

    expect(await screen.findByText(/2MB or smaller/)).toBeInTheDocument()
    expect(uploadLogoMock).not.toHaveBeenCalled()
  })

  it('rejects a wrong-type logo before uploading', async () => {
    renderForm()

    const gif = new File(['x'], 'anim.gif', { type: 'image/gif' })
    // applyAccept: false simulates a file that bypassed the dialog's accept filter,
    // proving the JS guard still catches it before the upload call.
    await userEvent.upload(screen.getByLabelText(/Upload logo/), gif, { applyAccept: false })

    expect(await screen.findByText(/PNG, JPEG, SVG, or WebP/)).toBeInTheDocument()
    expect(uploadLogoMock).not.toHaveBeenCalled()
  })
})
