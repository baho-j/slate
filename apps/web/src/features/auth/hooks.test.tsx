import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loginMock, logoutMock, fetchMeMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  logoutMock: vi.fn(),
  fetchMeMock: vi.fn(),
}))

vi.mock('./api', () => ({
  login: loginMock,
  logout: logoutMock,
  fetchMe: fetchMeMock,
}))

import { authKeys, useLogin, useLogout, useMe } from './hooks'

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('auth hooks', () => {
  beforeEach(() => {
    loginMock.mockReset()
    logoutMock.mockReset()
    fetchMeMock.mockReset()
  })

  it('useLogin caches the returned user under the me key', async () => {
    const user = { id: 1, name: 'Remy', email: 'remy@slate.test', role: 'recruiter' }
    loginMock.mockResolvedValue(user)
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useLogin(), { wrapper: wrapper(queryClient) })
    result.current.mutate({ email: 'remy@slate.test', password: 'password' })

    await waitFor(() => expect(queryClient.getQueryData(authKeys.me)).toEqual(user))
  })

  it('useLogout clears the me cache', async () => {
    logoutMock.mockResolvedValue(undefined)
    const queryClient = new QueryClient()
    queryClient.setQueryData(authKeys.me, { id: 1, role: 'recruiter' })

    const { result } = renderHook(() => useLogout(), { wrapper: wrapper(queryClient) })
    result.current.mutate()

    // Logout sets me to null then clears the whole cache, so the entry is gone entirely.
    await waitFor(() => expect(queryClient.getQueryData(authKeys.me)).toBeUndefined())
  })

  it('useMe does not retry on failure', async () => {
    fetchMeMock.mockRejectedValue(new Error('401'))
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMe(), { wrapper: wrapper(queryClient) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetchMeMock).toHaveBeenCalledTimes(1)
  })
})
