import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loginMock, navigateMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  navigateMock: vi.fn(),
}))

vi.mock('./api', () => ({
  login: loginMock,
  logout: vi.fn(),
  fetchMe: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

import { LoginPage } from './LoginPage'

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset()
    navigateMock.mockReset()
  })

  it('signs in and routes to the role home', async () => {
    loginMock.mockResolvedValue({
      id: 1,
      name: 'Remy',
      email: 'recruiter@slate.test',
      role: 'recruiter',
    })
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'recruiter@slate.test')
    await userEvent.type(screen.getByLabelText('Password'), 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() =>
      expect(loginMock.mock.calls[0]?.[0]).toEqual({
        email: 'recruiter@slate.test',
        password: 'password',
      }),
    )
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/' }))
  })

  it('a candidate lands on their applications', async () => {
    loginMock.mockResolvedValue({
      id: 2,
      name: 'Cora',
      email: 'candidate@slate.test',
      role: 'candidate',
    })
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'candidate@slate.test')
    await userEvent.type(screen.getByLabelText('Password'), 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/applications' }))
  })

  it('shows a credentials error on 401/422', async () => {
    loginMock.mockRejectedValue({ response: { status: 401 } } as AxiosError)
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'x@slate.test')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('do not match our records')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows a generic error on a server failure', async () => {
    loginMock.mockRejectedValue({ response: { status: 500 } } as AxiosError)
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'x@slate.test')
    await userEvent.type(screen.getByLabelText('Password'), 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('fills the form from a demo account button', async () => {
    renderLogin()

    await userEvent.click(screen.getByRole('button', { name: 'hr@slate.test' }))

    expect(screen.getByLabelText('Email')).toHaveValue('hr@slate.test')
    expect(screen.getByLabelText('Password')).toHaveValue('password')
  })

  it('disables the button while signing in', async () => {
    loginMock.mockImplementation(() => new Promise(() => {}))
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'hr@slate.test')
    await userEvent.type(screen.getByLabelText('Password'), 'password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('button', { name: 'Signing in…' })).toBeDisabled()
  })
})
