export type JobStatus = 'draft' | 'published' | 'closed' | 'archived'

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship'

export interface Job {
  id: string
  title: string
  description: string
  department: string | null
  location: string | null
  employment_type: EmploymentType
  salary_min: number | null
  salary_max: number | null
  currency: string | null
  status: JobStatus
  closing_date: string | null
  created_at: string
  updated_at: string
}

export interface JobListParams {
  status?: JobStatus
  q?: string
  page?: number
  per_page?: number
}

export interface Paginated<T> {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
  }
}

export interface JobInput {
  title: string
  description: string
  department: string | null
  location: string | null
  employment_type: EmploymentType
  salary_min: number | null
  salary_max: number | null
  currency: string | null
  closing_date: string | null
}
