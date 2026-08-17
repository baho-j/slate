import type { Interview } from '@/features/interviews/types'
import type { Paginated } from '@/features/jobs/types'

export type { Paginated }

export interface CursorPaginated<T> {
  data: T[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    path: string
    per_page: number
    next_cursor: string | null
    prev_cursor: string | null
  }
}

export type ApplicationStatus = 'applied' | 'in_review' | 'rejected' | 'withdrawn' | 'hired'

export interface ApplicationStage {
  id: number
  name: string
}

export interface ApplicationListItem {
  id: string
  status: ApplicationStatus
  eligibility: string
  match_score: number | null
  candidate: {
    full_name: string
    email: string
  }
  current_stage: ApplicationStage | null
  created_at: string
}

export interface ApplicationDocument {
  id: number
  kind: string
  original_name: string
  mime: string
  size_bytes: number
}

export interface ApplicationHistoryEntry {
  id: number
  from_status: string | null
  to_status: string | null
  to_stage: string | null
  note: string | null
  created_at: string
}

export interface TalentPoolSummary {
  id: string
  tags: string[]
  note: string | null
}

export interface ApplicationDetail {
  id: string
  status: ApplicationStatus
  eligibility: string
  match_score: number | null
  cover_note: string | null
  created_at: string
  candidate: {
    id: string
    full_name: string
    email: string
    phone: string | null
  }
  talent_pool: TalentPoolSummary | null
  current_stage: ApplicationStage | null
  available_stages: ApplicationStage[]
  documents: ApplicationDocument[]
  interviews: Interview[]
  status_history: ApplicationHistoryEntry[]
}

export type Eligibility = 'eligible' | 'ineligible' | 'manual'

export interface ApplicationListParams {
  status?: ApplicationStatus
  eligibility?: Eligibility
  q?: string
  cursor?: string
}
