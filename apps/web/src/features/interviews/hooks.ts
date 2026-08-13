import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { applicationKeys } from '@/features/applications/hooks'
import type { Paginated } from '@/features/applications/types'
import {
  fetchInterviewers,
  fetchMyInterviews,
  scheduleInterview,
  submitEvaluation,
  updateInterview,
} from './api'
import type {
  Evaluation,
  Interview,
  Interviewer,
  ScheduleInterviewInput,
  SubmitEvaluationInput,
  UpdateInterviewInput,
} from './types'

export const interviewKeys = {
  all: ['interviews'] as const,
  mine: (params: { status?: string; page?: number }) =>
    [...interviewKeys.all, 'mine', params] as const,
  interviewers: ['interviews', 'interviewers'] as const,
}

export function useMyInterviews(params: { status?: string; page?: number }) {
  return useQuery<Paginated<Interview>, AxiosError>({
    queryKey: interviewKeys.mine(params),
    queryFn: () => fetchMyInterviews(params),
    placeholderData: keepPreviousData,
  })
}

export function useInterviewers(enabled = true) {
  return useQuery<Interviewer[], AxiosError>({
    queryKey: interviewKeys.interviewers,
    queryFn: fetchInterviewers,
    enabled,
  })
}

export function useScheduleInterview(applicationId: string) {
  const queryClient = useQueryClient()

  return useMutation<Interview, AxiosError, ScheduleInterviewInput>({
    mutationFn: (input) => scheduleInterview(applicationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) })
      queryClient.invalidateQueries({ queryKey: interviewKeys.all })
    },
  })
}

export function useSubmitEvaluation(interviewId: string, applicationId?: string) {
  const queryClient = useQueryClient()

  return useMutation<Evaluation, AxiosError, SubmitEvaluationInput>({
    mutationFn: (input) => submitEvaluation(interviewId, input),
    onSuccess: () => {
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) })
      }
      queryClient.invalidateQueries({ queryKey: interviewKeys.all })
    },
  })
}

export function useUpdateInterview(applicationId?: string) {
  const queryClient = useQueryClient()

  return useMutation<Interview, AxiosError, { id: string; input: UpdateInterviewInput }>({
    mutationFn: ({ id, input }) => updateInterview(id, input),
    onSuccess: () => {
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) })
      }
      queryClient.invalidateQueries({ queryKey: interviewKeys.all })
    },
  })
}
