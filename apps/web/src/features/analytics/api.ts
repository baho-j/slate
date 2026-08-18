import { apiClient } from '@/lib/api-client'
import type { AnalyticsOverview, JobAnalytics } from './types'

export async function fetchOverview(days?: number): Promise<AnalyticsOverview> {
  const { data } = await apiClient.get<{ data: AnalyticsOverview }>('/analytics/overview', {
    params: days ? { days } : {},
  })
  return data.data
}

export async function fetchJobAnalytics(jobId: string): Promise<JobAnalytics> {
  const { data } = await apiClient.get<{ data: JobAnalytics }>(`/analytics/jobs/${jobId}`)
  return data.data
}
