import type { Paginated } from '@/features/applications/types'
import { apiClient } from '@/lib/api-client'
import type { Interview, Interviewer, ScheduleInterviewInput, UpdateInterviewInput } from './types'

interface InterviewResponse {
  data: Interview
}

export async function fetchMyInterviews(params: {
  status?: string
  page?: number
}): Promise<Paginated<Interview>> {
  const { data } = await apiClient.get<Paginated<Interview>>('/interviews/mine', { params })
  return data
}

export async function fetchInterviewers(): Promise<Interviewer[]> {
  const { data } = await apiClient.get<{ data: Interviewer[] }>('/interviewers')
  return data.data
}

export async function scheduleInterview(
  applicationId: string,
  input: ScheduleInterviewInput,
): Promise<Interview> {
  const { data } = await apiClient.post<InterviewResponse>(
    `/applications/${applicationId}/interviews`,
    input,
  )
  return data.data
}

export async function updateInterview(
  interviewId: string,
  input: UpdateInterviewInput,
): Promise<Interview> {
  const { data } = await apiClient.patch<InterviewResponse>(`/interviews/${interviewId}`, input)
  return data.data
}
