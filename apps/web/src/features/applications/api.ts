import { apiClient } from '@/lib/api-client'
import type {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationListParams,
  Paginated,
} from './types'

interface DetailResponse {
  data: ApplicationDetail
}

export async function fetchApplications(
  jobId: string,
  params: ApplicationListParams,
): Promise<Paginated<ApplicationListItem>> {
  const { data } = await apiClient.get<Paginated<ApplicationListItem>>(
    `/jobs/${jobId}/applications`,
    { params },
  )
  return data
}

export async function fetchApplication(applicationId: string): Promise<ApplicationDetail> {
  const { data } = await apiClient.get<DetailResponse>(`/applications/${applicationId}`)
  return data.data
}

export async function moveApplicationStage(
  applicationId: string,
  stageId: number,
  note?: string,
): Promise<ApplicationDetail> {
  const { data } = await apiClient.patch<DetailResponse>(`/applications/${applicationId}/stage`, {
    stage_id: stageId,
    ...(note ? { note } : {}),
  })
  return data.data
}

export async function fetchCvDownloadUrl(
  applicationId: string,
  documentId: number,
): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>(
    `/applications/${applicationId}/documents/${documentId}/url`,
  )
  return data.url
}
