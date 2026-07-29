import { apiClient } from '@/lib/api-client'
import type { Job, JobInput, JobListParams, Paginated } from './types'

interface JobResponse {
  data: Job
}

export async function fetchJobs(params: JobListParams): Promise<Paginated<Job>> {
  const { data } = await apiClient.get<Paginated<Job>>('/jobs', { params })
  return data
}

export async function createJob(input: JobInput): Promise<Job> {
  const { data } = await apiClient.post<JobResponse>('/jobs', input)
  return data.data
}

export async function updateJob(id: string, input: Partial<JobInput>): Promise<Job> {
  const { data } = await apiClient.patch<JobResponse>(`/jobs/${id}`, input)
  return data.data
}

export async function publishJob(id: string): Promise<Job> {
  const { data } = await apiClient.post<JobResponse>(`/jobs/${id}/publish`)
  return data.data
}

export async function closeJob(id: string): Promise<Job> {
  const { data } = await apiClient.post<JobResponse>(`/jobs/${id}/close`)
  return data.data
}

export async function deleteJob(id: string): Promise<void> {
  await apiClient.delete(`/jobs/${id}`)
}
