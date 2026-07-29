import type { EmploymentType, JobStatus } from './types'

export const statusLabels: Record<JobStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  archived: 'Archived',
}

export const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  contract: 'Contract',
  temporary: 'Temporary',
  internship: 'Internship',
}

export const employmentTypeOptions = Object.entries(employmentTypeLabels) as [
  EmploymentType,
  string,
][]

export const statusFilterOptions = Object.entries(statusLabels) as [JobStatus, string][]
