import type { ApplicationStatus, Eligibility } from './types'

export const statusLabels: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  in_review: 'In review',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  hired: 'Hired',
}

export const statusVariants: Record<
  ApplicationStatus,
  'neutral' | 'accent' | 'success' | 'warning'
> = {
  applied: 'accent',
  in_review: 'warning',
  rejected: 'neutral',
  withdrawn: 'neutral',
  hired: 'success',
}

export const statusFilterOptions = Object.entries(statusLabels) as [ApplicationStatus, string][]

export const eligibilityLabels: Record<Eligibility, string> = {
  eligible: 'Eligible',
  ineligible: 'Ineligible',
  manual: 'Manual review',
}

export const eligibilityFilterOptions = Object.entries(eligibilityLabels) as [Eligibility, string][]
