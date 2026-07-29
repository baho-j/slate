import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { closeJob, createJob, deleteJob, fetchJobs, publishJob, updateJob } from './api'
import type { Job, JobInput, JobListParams, JobStatus, Paginated } from './types'

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (params: JobListParams) => [...jobKeys.lists(), params] as const,
}

export function useJobs(params: JobListParams) {
  return useQuery<Paginated<Job>, AxiosError>({
    queryKey: jobKeys.list(params),
    queryFn: () => fetchJobs(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation<Job, AxiosError, JobInput>({
    mutationFn: createJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })
}

export function useUpdateJob() {
  const queryClient = useQueryClient()

  return useMutation<Job, AxiosError, { id: string; input: Partial<JobInput> }>({
    mutationFn: ({ id, input }) => updateJob(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })
}

function useStatusTransition(mutationFn: (id: string) => Promise<Job>, nextStatus: JobStatus) {
  const queryClient = useQueryClient()

  return useMutation<Job, AxiosError, string, { snapshots: [readonly unknown[], unknown][] }>({
    mutationFn,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: jobKeys.lists() })
      const snapshots = queryClient.getQueriesData<Paginated<Job>>({ queryKey: jobKeys.lists() })

      for (const [key, page] of snapshots) {
        if (!page) {
          continue
        }
        queryClient.setQueryData<Paginated<Job>>(key, {
          ...page,
          data: page.data.map((job) => (job.id === id ? { ...job, status: nextStatus } : job)),
        })
      }

      return { snapshots }
    },
    onError: (_error, _id, context) => {
      for (const [key, page] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, page)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })
}

export function usePublishJob() {
  return useStatusTransition(publishJob, 'published')
}

export function useCloseJob() {
  return useStatusTransition(closeJob, 'closed')
}

export function useDeleteJob() {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, string>({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
    },
  })
}
