import { apiClient } from '@/lib/api-client'
import type { ApplicationField, CriterionInput, FieldInput, ScreeningCriterion } from './types'

interface Collection<T> {
  data: T[]
}

export async function fetchFields(jobId: string): Promise<ApplicationField[]> {
  const { data } = await apiClient.get<Collection<ApplicationField>>(`/jobs/${jobId}/fields`)
  return data.data
}

export async function replaceFields(
  jobId: string,
  fields: FieldInput[],
): Promise<ApplicationField[]> {
  const { data } = await apiClient.put<Collection<ApplicationField>>(`/jobs/${jobId}/fields`, {
    fields,
  })
  return data.data
}

export async function fetchCriteria(jobId: string): Promise<ScreeningCriterion[]> {
  const { data } = await apiClient.get<Collection<ScreeningCriterion>>(`/jobs/${jobId}/criteria`)
  return data.data
}

export async function replaceCriteria(
  jobId: string,
  criteria: CriterionInput[],
): Promise<ScreeningCriterion[]> {
  const { data } = await apiClient.put<Collection<ScreeningCriterion>>(`/jobs/${jobId}/criteria`, {
    criteria,
  })
  return data.data
}
