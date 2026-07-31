import { apiClient } from '@/lib/api-client'
import type { Paginated, PublicJob, PublicJobListParams, PublicOrganization } from './types'

interface OrganizationResponse {
  data: PublicOrganization
}

interface JobResponse {
  data: PublicJob
}

export async function fetchPublicOrganization(slug: string): Promise<PublicOrganization> {
  const { data } = await apiClient.get<OrganizationResponse>(`/public/o/${slug}`)
  return data.data
}

export async function fetchPublicJobs(
  slug: string,
  params: PublicJobListParams,
): Promise<Paginated<PublicJob>> {
  const { data } = await apiClient.get<Paginated<PublicJob>>(`/public/o/${slug}/jobs`, { params })
  return data
}

export async function fetchPublicJob(slug: string, jobId: string): Promise<PublicJob> {
  const { data } = await apiClient.get<JobResponse>(`/public/o/${slug}/jobs/${jobId}`)
  return data.data
}
