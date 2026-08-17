export interface AnalyticsOverview {
  open_jobs: number
  applications: number
  interviews_scheduled: number
  since: string
}

export interface FunnelStage {
  stage_id: number
  name: string
  is_terminal: boolean
  count: number
  conversion_rate: number | null
}

export interface TimeInStage {
  stage_id: number
  name: string
  avg_hours: number | null
  median_hours: number | null
  samples: number
}

export interface JobAnalytics {
  job: { id: string; title: string }
  funnel: FunnelStage[]
  time_in_stage: TimeInStage[]
}
