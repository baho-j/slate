import type { ApplicationListItem, ApplicationStage } from '@/features/applications/types'

export type { ApplicationListItem, ApplicationStage }

export interface PipelineStage extends ApplicationStage {
  order: number
  is_terminal: boolean
  application_count: number
}

export interface Pipeline {
  id: number
  name: string
  stages: PipelineStage[]
}
