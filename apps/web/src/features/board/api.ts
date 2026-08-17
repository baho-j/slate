import type { CursorPaginated } from '@/features/applications/types'
import { apiClient } from '@/lib/api-client'
import type { ApplicationListItem, Pipeline } from './types'

export async function fetchPipeline(jobId: string): Promise<Pipeline> {
  const { data } = await apiClient.get<{ data: Pipeline }>(`/jobs/${jobId}/pipeline`)
  return data.data
}

export interface StageInput {
  id: number | null
  name: string
  is_terminal: boolean
}

export async function replaceStages(jobId: string, stages: StageInput[]): Promise<Pipeline> {
  const { data } = await apiClient.put<{ data: Pipeline }>(`/jobs/${jobId}/pipeline`, { stages })
  return data.data
}

export async function fetchStageApplications(
  jobId: string,
  stageId: number,
  cursor: string | null,
  perPage: number,
): Promise<CursorPaginated<ApplicationListItem>> {
  const { data } = await apiClient.get<CursorPaginated<ApplicationListItem>>(
    `/jobs/${jobId}/applications`,
    { params: { stage: stageId, per_page: perPage, ...(cursor ? { cursor } : {}) } },
  )
  return data
}
