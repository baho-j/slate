import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { fetchPublicJob, fetchPublicJobs, fetchPublicOrganization } from './api'
import type { Paginated, PublicJob, PublicJobListParams, PublicOrganization } from './types'

function retryPublic(failureCount: number, error: AxiosError): boolean {
  const status = error.response?.status
  if (status !== undefined && status >= 400 && status < 500) {
    return false
  }
  return failureCount < 2
}

export const careersKeys = {
  all: ['careers'] as const,
  org: (slug: string) => [...careersKeys.all, slug] as const,
  jobs: (slug: string, params: PublicJobListParams) =>
    [...careersKeys.org(slug), 'jobs', params] as const,
  job: (slug: string, jobId: string) => [...careersKeys.org(slug), 'job', jobId] as const,
}

export function usePublicOrganization(slug: string) {
  return useQuery<PublicOrganization, AxiosError>({
    queryKey: careersKeys.org(slug),
    queryFn: () => fetchPublicOrganization(slug),
    retry: retryPublic,
  })
}

export function usePublicJobs(slug: string, params: PublicJobListParams) {
  return useQuery<Paginated<PublicJob>, AxiosError>({
    queryKey: careersKeys.jobs(slug, params),
    queryFn: () => fetchPublicJobs(slug, params),
    placeholderData: keepPreviousData,
    retry: retryPublic,
  })
}

export function usePublicJob(slug: string, jobId: string) {
  return useQuery<PublicJob, AxiosError>({
    queryKey: careersKeys.job(slug, jobId),
    queryFn: () => fetchPublicJob(slug, jobId),
    retry: retryPublic,
  })
}
