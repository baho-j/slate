import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { fetchApplication, fetchApplications, moveApplicationStage } from './api'
import type {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationListParams,
  ApplicationStage,
  CursorPaginated,
} from './types'

export const applicationKeys = {
  all: ['applications'] as const,
  listFor: (jobId: string, params: ApplicationListParams) =>
    [...applicationKeys.all, 'job', jobId, params] as const,
  detail: (applicationId: string) => [...applicationKeys.all, 'detail', applicationId] as const,
}

export function useApplications(jobId: string, params: ApplicationListParams) {
  return useQuery<CursorPaginated<ApplicationListItem>, AxiosError>({
    queryKey: applicationKeys.listFor(jobId, params),
    queryFn: () => fetchApplications(jobId, params),
    placeholderData: keepPreviousData,
  })
}

export function useApplication(applicationId: string) {
  return useQuery<ApplicationDetail, AxiosError>({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: () => fetchApplication(applicationId),
  })
}

interface MoveStageVariables {
  stage: ApplicationStage
  note?: string
}

export function useMoveStage(applicationId: string) {
  const queryClient = useQueryClient()
  const detailKey = applicationKeys.detail(applicationId)

  return useMutation<
    ApplicationDetail,
    AxiosError,
    MoveStageVariables,
    { previous?: ApplicationDetail }
  >({
    mutationFn: ({ stage, note }) => moveApplicationStage(applicationId, stage.id, note),
    onMutate: async ({ stage, note }) => {
      await queryClient.cancelQueries({ queryKey: detailKey })
      const previous = queryClient.getQueryData<ApplicationDetail>(detailKey)

      if (previous) {
        queryClient.setQueryData<ApplicationDetail>(detailKey, {
          ...previous,
          current_stage: stage,
          status_history: [
            {
              id: -Date.now(),
              from_status: previous.status,
              to_status: previous.status,
              to_stage: stage.name,
              note: note ?? null,
              created_at: new Date().toISOString(),
            },
            ...previous.status_history,
          ],
        })
      }

      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: detailKey })
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}
