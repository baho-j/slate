export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type Recommendation = 'strong_yes' | 'yes' | 'no' | 'strong_no'

export interface Evaluation {
  id: string
  rating: number
  recommendation: Recommendation
  comments: string | null
  author?: { id: number; name: string } | null
  created_at: string
}

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
  evaluation?: Evaluation | null
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

export interface SubmitEvaluationInput {
  rating: number
  recommendation: Recommendation
  comments?: string | null
}
