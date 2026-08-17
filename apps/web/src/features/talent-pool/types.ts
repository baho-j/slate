export interface TalentPoolEntry {
  id: string
  tags: string[]
  note: string | null
  candidate: {
    id: string
    full_name: string
    email: string
  }
  added_by?: { id: number; name: string } | null
  created_at: string
}

export interface AddToPoolInput {
  candidate_id: string
  tags?: string[]
  note?: string | null
}

export interface TalentPoolListParams {
  tag?: string
  q?: string
  cursor?: string
}
