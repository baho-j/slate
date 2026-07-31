import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { fetchApplication, fetchApplications } from './api'
import type {
  ApplicationDetail,
  ApplicationListItem,
  ApplicationListParams,
  Paginated,
} from './types'

export const applicationKeys = {
  all: ['applications'] as const,
  listFor: (jobId: string, params: ApplicationListParams) =>
    [...applicationKeys.all, 'job', jobId, params] as const,
  detail: (applicationId: string) => [...applicationKeys.all, 'detail', applicationId] as const,
}

export function useApplications(jobId: string, params: ApplicationListParams) {
  return useQuery<Paginated<ApplicationListItem>, AxiosError>({
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
