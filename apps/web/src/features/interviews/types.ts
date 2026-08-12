export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export interface Interviewer {
  id: number
  name: string
  email: string
  role: string
}

export interface Interview {
  id: string
  scheduled_at: string
  location: string | null
  status: InterviewStatus
  notes: string | null
  interviewer?: Interviewer
  application?: {
    id: string
    candidate: { full_name: string }
    job: { id: string; title: string }
  }
  created_at: string
}

export interface ScheduleInterviewInput {
  interviewer_id: number
  scheduled_at: string
  location?: string | null
  notes?: string | null
}

export interface UpdateInterviewInput {
  interviewer_id?: number
  scheduled_at?: string
  location?: string | null
  status?: InterviewStatus
  notes?: string | null
}
