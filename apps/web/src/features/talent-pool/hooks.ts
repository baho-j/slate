import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { applicationKeys } from '@/features/applications/hooks'
import type { CursorPaginated } from '@/features/applications/types'
import { addToPool, fetchTalentPool, removeFromPool } from './api'
import type { AddToPoolInput, TalentPoolEntry, TalentPoolListParams } from './types'

export const talentPoolKeys = {
  all: ['talent-pool'] as const,
  list: (params: TalentPoolListParams) => [...talentPoolKeys.all, params] as const,
}

export function useTalentPool(params: TalentPoolListParams) {
  return useQuery<CursorPaginated<TalentPoolEntry>, AxiosError>({
    queryKey: talentPoolKeys.list(params),
    queryFn: () => fetchTalentPool(params),
    placeholderData: keepPreviousData,
  })
}

export function useAddToPool(applicationId?: string) {
  const queryClient = useQueryClient()

  return useMutation<TalentPoolEntry, AxiosError, AddToPoolInput>({
    mutationFn: addToPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: talentPoolKeys.all })
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) })
      }
    },
  })
}

export function useRemoveFromPool() {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, string>({
    mutationFn: removeFromPool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: talentPoolKeys.all })
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}
