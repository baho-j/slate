import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import {
  createUser,
  deleteUser,
  fetchOrganization,
  fetchUsers,
  updateOrganization,
  updateUser,
} from './api'
import type {
  CreateUserInput,
  ManagedUser,
  Organization,
  OrgProfileInput,
  UpdateUserInput,
} from './types'

export const settingsKeys = {
  organization: ['settings', 'organization'] as const,
  users: ['settings', 'users'] as const,
}

export function useOrganization() {
  return useQuery<Organization, AxiosError>({
    queryKey: settingsKeys.organization,
    queryFn: fetchOrganization,
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation<Organization, AxiosError, OrgProfileInput>({
    mutationFn: updateOrganization,
    onSuccess: (org) => queryClient.setQueryData(settingsKeys.organization, org),
  })
}

export function useUsers() {
  return useQuery<ManagedUser[], AxiosError>({
    queryKey: settingsKeys.users,
    queryFn: fetchUsers,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation<ManagedUser, AxiosError, CreateUserInput>({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.users }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation<ManagedUser, AxiosError, { id: number; input: UpdateUserInput }>({
    mutationFn: ({ id, input }) => updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.users }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, number>({
    mutationFn: deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsKeys.users }),
  })
}
