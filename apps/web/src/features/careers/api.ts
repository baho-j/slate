import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import type {
  ApplicationInput,
  CvUploadTarget,
  Paginated,
  PublicJob,
  PublicJobListParams,
  PublicOrganization,
} from './types'

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

export async function uploadCv(file: File): Promise<{ key: string; originalName: string }> {
  const { data: target } = await apiClient.post<CvUploadTarget>('/public/uploads/cv', {
    filename: file.name,
    content_type: file.type,
    size: file.size,
  })

  await axios.request({
    url: target.url,
    method: target.method,
    data: file,
    headers: target.headers,
  })

  return { key: target.key, originalName: file.name }
}

export async function submitApplication(
  slug: string,
  jobId: string,
  input: ApplicationInput,
): Promise<void> {
  await apiClient.post(`/public/o/${slug}/jobs/${jobId}/apply`, input)
}
