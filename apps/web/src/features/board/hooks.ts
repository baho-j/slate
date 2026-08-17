import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { moveApplicationStage } from '@/features/applications/api'
import { applicationKeys } from '@/features/applications/hooks'
import type { CursorPaginated } from '@/features/applications/types'
import { fetchPipeline, fetchStageApplications, replaceStages, type StageInput } from './api'
import type { ApplicationListItem, Pipeline, PipelineStage } from './types'

export const PER_COLUMN = 10

export const boardKeys = {
  all: ['board'] as const,
  pipeline: (jobId: string) => [...boardKeys.all, jobId, 'pipeline'] as const,
  columns: (jobId: string) => [...boardKeys.all, jobId, 'column'] as const,
  column: (jobId: string, stageId: number, cursor: string | null) =>
    [...boardKeys.columns(jobId), { stageId, cursor }] as const,
}

export function usePipeline(jobId: string) {
  return useQuery<Pipeline, AxiosError>({
    queryKey: boardKeys.pipeline(jobId),
    queryFn: () => fetchPipeline(jobId),
  })
}

export function useStageColumn(
  jobId: string,
  stageId: number,
  cursor: string | null,
  enabled = true,
) {
  return useQuery<CursorPaginated<ApplicationListItem>, AxiosError>({
    queryKey: boardKeys.column(jobId, stageId, cursor),
    queryFn: () => fetchStageApplications(jobId, stageId, cursor, PER_COLUMN),
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

type ColumnEntry = [readonly unknown[], CursorPaginated<ApplicationListItem> | undefined]

interface MoveContext {
  snapshot: ColumnEntry[]
  pipeline?: Pipeline
}

/**
 * Moves the card between the cached columns before the request goes out and restores every
 * touched page verbatim if it fails, so a rejected move leaves no trace of the optimistic one.
 */
export function useMoveApplication(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, AxiosError, MoveVariables, MoveContext>({
    mutationFn: ({ application, to }) => moveApplicationStage(application.id, to.id),
    onMutate: async ({ application, from, to }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.columns(jobId) })

      const snapshot = queryClient.getQueriesData<CursorPaginated<ApplicationListItem>>({
        queryKey: boardKeys.columns(jobId),
      }) as ColumnEntry[]
      const pipeline = queryClient.getQueryData<Pipeline>(boardKeys.pipeline(jobId))

      if (from) {
        updateColumn(queryClient, jobId, from.id, (items) =>
          items.filter((item) => item.id !== application.id),
        )
      }

      updateColumn(queryClient, jobId, to.id, (items) => [
        { ...application, current_stage: { id: to.id, name: to.name } },
        ...items.filter((item) => item.id !== application.id),
      ])

      if (pipeline && from && from.id !== to.id) {
        adjustCounts(queryClient, jobId, pipeline, { [from.id]: -1, [to.id]: 1 })
      }

      return { snapshot, pipeline }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, data)
      }
      if (context?.pipeline) {
        queryClient.setQueryData(boardKeys.pipeline(jobId), context.pipeline)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all })
      queryClient.invalidateQueries({ queryKey: applicationKeys.all })
    },
  })
}

function adjustCounts(
  queryClient: ReturnType<typeof useQueryClient>,
  jobId: string,
  pipeline: Pipeline,
  deltas: Record<number, number>,
): void {
  queryClient.setQueryData<Pipeline>(boardKeys.pipeline(jobId), {
    ...pipeline,
    stages: pipeline.stages.map((stage) => {
      const delta = deltas[stage.id] ?? 0
      return delta
        ? { ...stage, application_count: Math.max(0, stage.application_count + delta) }
        : stage
    }),
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
  const pages = queryClient.getQueriesData<CursorPaginated<ApplicationListItem>>({
    queryKey: boardKeys.columns(jobId),
  })

  for (const [key, page] of pages) {
    if (!page || !isColumnFor(key, stageId)) continue

    queryClient.setQueryData<CursorPaginated<ApplicationListItem>>(key, {
      ...page,
      data: transform(page.data),
    })
  }
}
