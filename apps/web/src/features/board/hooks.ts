import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { moveApplicationStage } from '@/features/applications/api'
import { applicationKeys } from '@/features/applications/hooks'
import type { Paginated } from '@/features/applications/types'
import { fetchPipeline, fetchStageApplications, replaceStages, type StageInput } from './api'
import type { ApplicationListItem, Pipeline, PipelineStage } from './types'

export const PER_COLUMN = 10

export const boardKeys = {
  all: ['board'] as const,
  pipeline: (jobId: string) => [...boardKeys.all, jobId, 'pipeline'] as const,
  columns: (jobId: string) => [...boardKeys.all, jobId, 'column'] as const,
  column: (jobId: string, stageId: number, page: number) =>
    [...boardKeys.columns(jobId), { stageId, page }] as const,
}

export function usePipeline(jobId: string) {
  return useQuery<Pipeline, AxiosError>({
    queryKey: boardKeys.pipeline(jobId),
    queryFn: () => fetchPipeline(jobId),
  })
}

export function useStageColumn(jobId: string, stageId: number, page: number, enabled = true) {
  return useQuery<Paginated<ApplicationListItem>, AxiosError>({
    queryKey: boardKeys.column(jobId, stageId, page),
    queryFn: () => fetchStageApplications(jobId, stageId, page, PER_COLUMN),
    placeholderData: keepPreviousData,
    enabled,
  })
}

interface StageSaveError {
  message?: string
  errors?: Record<string, string[]>
}

export function useReplaceStages(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation<Pipeline, AxiosError<StageSaveError>, StageInput[]>({
    mutationFn: (stages) => replaceStages(jobId, stages),
    onSuccess: (pipeline) => {
      queryClient.setQueryData(boardKeys.pipeline(jobId), pipeline)
      queryClient.invalidateQueries({ queryKey: boardKeys.columns(jobId) })
    },
  })
}

interface MoveVariables {
  application: ApplicationListItem
  from: PipelineStage | null
  to: PipelineStage
}

type ColumnEntry = [readonly unknown[], Paginated<ApplicationListItem> | undefined]

/**
 * Moves the card between the cached columns before the request goes out and restores every
 * touched page verbatim if it fails, so a rejected move leaves no trace of the optimistic one.
 */
export function useMoveApplication(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, AxiosError, MoveVariables, { snapshot: ColumnEntry[] }>({
    mutationFn: ({ application, to }) => moveApplicationStage(application.id, to.id),
    onMutate: async ({ application, from, to }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.columns(jobId) })

      const snapshot = queryClient.getQueriesData<Paginated<ApplicationListItem>>({
        queryKey: boardKeys.columns(jobId),
      }) as ColumnEntry[]

      if (from) {
        updateColumn(queryClient, jobId, from.id, (items) =>
          items.filter((item) => item.id !== application.id),
        )
      }

      updateColumn(queryClient, jobId, to.id, (items) => [
        { ...application, current_stage: { id: to.id, name: to.name } },
        ...items.filter((item) => item.id !== application.id),
      ])

      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all })
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

function isColumnFor(key: readonly unknown[], stageId: number): boolean {
  const marker = key[key.length - 1]

  return typeof marker === 'object' && marker !== null && 'stageId' in marker
    ? (marker as { stageId: number }).stageId === stageId
    : false
}

function updateColumn(
  queryClient: ReturnType<typeof useQueryClient>,
  jobId: string,
  stageId: number,
  transform: (items: ApplicationListItem[]) => ApplicationListItem[],
): void {
  const pages = queryClient.getQueriesData<Paginated<ApplicationListItem>>({
    queryKey: boardKeys.columns(jobId),
  })

  for (const [key, page] of pages) {
    if (!page || !isColumnFor(key, stageId)) continue

    const data = transform(page.data)

    queryClient.setQueryData<Paginated<ApplicationListItem>>(key, {
      ...page,
      data,
      meta: { ...page.meta, total: page.meta.total + (data.length - page.data.length) },
    })
  }
}
