import type { EmploymentType, Paginated } from '@/features/jobs/types'

export type { EmploymentType, Paginated }

export interface PublicOrganization {
  name: string
  slug: string
  description: string | null
  website: string | null
}

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'file' | 'date'

export type CriterionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'includes_any'
  | 'includes_all'
  | 'exists'

export type CriterionMode = 'knockout' | 'scored'

export type AnswerValue = string | number | boolean | string[] | null

export interface ApplicationFieldDefinition {
  id: number
  label: string
  key: string
  type: FieldType
  required: boolean
  options: string[] | null
  order: number
}

export interface PublicCriterion {
  field_key: string
  operator: CriterionOperator
  value: unknown
  mode: CriterionMode
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
  fields?: ApplicationFieldDefinition[]
  criteria?: PublicCriterion[]
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
  answers: Record<string, AnswerValue>
}
