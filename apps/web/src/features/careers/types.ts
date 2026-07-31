import type { EmploymentType, Paginated } from '@/features/jobs/types'

export type { EmploymentType, Paginated }

export interface PublicOrganization {
  name: string
  slug: string
  description: string | null
  website: string | null
}

export interface PublicJob {
  id: string
  title: string
  description: string
  department: string | null
  location: string | null
  employment_type: EmploymentType
  salary_min: number | null
  salary_max: number | null
  currency: string | null
  closing_date: string | null
  published_at: string
}

export interface PublicJobListParams {
  q?: string
  page?: number
}

export interface CvUploadTarget {
  key: string
  url: string
  method: string
  headers: Record<string, string>
}

export interface ApplicationInput {
  full_name: string
  email: string
  cover_note: string | null
  cv_key: string
  cv_original_name: string
}
