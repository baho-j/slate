import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { fetchCriteria, fetchFields, replaceCriteria, replaceFields } from './api'
import type { ApplicationField, CriterionInput, FieldInput, ScreeningCriterion } from './types'

export const builderKeys = {
  all: ['job-builder'] as const,
  fields: (jobId: string) => [...builderKeys.all, jobId, 'fields'] as const,
  criteria: (jobId: string) => [...builderKeys.all, jobId, 'criteria'] as const,
}

export function useApplicationFields(jobId: string) {
  return useQuery<ApplicationField[], AxiosError>({
    queryKey: builderKeys.fields(jobId),
    queryFn: () => fetchFields(jobId),
  })
}

export function useScreeningCriteria(jobId: string) {
  return useQuery<ScreeningCriterion[], AxiosError>({
    queryKey: builderKeys.criteria(jobId),
    queryFn: () => fetchCriteria(jobId),
  })
}

interface ValidationErrors {
  message?: string
  errors?: Record<string, string[]>
}

export function useReplaceFields(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation<ApplicationField[], AxiosError<ValidationErrors>, FieldInput[]>({
    mutationFn: (fields) => replaceFields(jobId, fields),
    onSuccess: (fields) => {
      queryClient.setQueryData(builderKeys.fields(jobId), fields)
    },
  })
}

export function useReplaceCriteria(jobId: string) {
  const queryClient = useQueryClient()

  return useMutation<ScreeningCriterion[], AxiosError<ValidationErrors>, CriterionInput[]>({
    mutationFn: (criteria) => replaceCriteria(jobId, criteria),
    onSuccess: (criteria) => {
      queryClient.setQueryData(builderKeys.criteria(jobId), criteria)
    },
  })
}
