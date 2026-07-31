import { Badge } from '@/components/ui/badge'
import { statusLabels, statusVariants } from './constants'
import type { ApplicationStatus } from './types'

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
}
