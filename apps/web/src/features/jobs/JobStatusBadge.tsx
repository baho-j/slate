import { Badge } from '@/components/ui/badge'
import { statusLabels } from './constants'
import type { JobStatus } from './types'

const statusVariants: Record<JobStatus, 'neutral' | 'accent' | 'success' | 'warning'> = {
  draft: 'neutral',
  published: 'success',
  closed: 'warning',
  archived: 'neutral',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
}
