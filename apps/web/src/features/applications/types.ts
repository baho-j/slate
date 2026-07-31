import type { Paginated } from '@/features/jobs/types'

export type { Paginated }

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

export interface ApplicationDetail {
  id: string
  status: ApplicationStatus
  eligibility: string
  match_score: number | null
  cover_note: string | null
  created_at: string
  candidate: {
    full_name: string
    email: string
    phone: string | null
  }
  current_stage: ApplicationStage | null
  documents: ApplicationDocument[]
  status_history: ApplicationHistoryEntry[]
}

export interface ApplicationListParams {
  status?: ApplicationStatus
  q?: string
  page?: number
}
