import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { fetchJobAnalytics, fetchOverview } from './api'
import type { AnalyticsOverview, JobAnalytics } from './types'

export const analyticsKeys = {
  all: ['analytics'] as const,
  overview: (days: number) => [...analyticsKeys.all, 'overview', days] as const,
  job: (jobId: string) => [...analyticsKeys.all, 'job', jobId] as const,
}

export function useOverview(days = 30) {
  return useQuery<AnalyticsOverview, AxiosError>({
    queryKey: analyticsKeys.overview(days),
    queryFn: () => fetchOverview(days),
  })
}

export function useJobAnalytics(jobId: string | undefined) {
  return useQuery<JobAnalytics, AxiosError>({
    queryKey: analyticsKeys.job(jobId ?? ''),
    queryFn: () => fetchJobAnalytics(jobId as string),
    enabled: Boolean(jobId),
  })
}
