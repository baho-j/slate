import { Badge } from '@/components/ui/badge'
import type { InterviewStatus } from './types'

const presentation: Record<
  InterviewStatus,
  { label: string; variant: 'neutral' | 'accent' | 'success' | 'danger' }
> = {
  scheduled: { label: 'Scheduled', variant: 'accent' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
  no_show: { label: 'No show', variant: 'danger' },
}

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  const { label, variant } = presentation[status]

  return <Badge variant={variant}>{label}</Badge>
}
