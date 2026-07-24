import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { fetchMe, login, logout } from './api'
import type { LoginCredentials, User } from './types'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export function useMe() {
  return useQuery<User, AxiosError>({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation<User, AxiosError, LoginCredentials>({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError>({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null)
      queryClient.clear()
    },
  })
}
