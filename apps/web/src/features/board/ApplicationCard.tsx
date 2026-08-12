import { Link } from '@tanstack/react-router'
import { GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'
import { eligibilityLabels, eligibilityVariants } from './constants'
import type { ApplicationListItem, PipelineStage } from './types'

interface ApplicationCardProps {
  jobId: string
  application: ApplicationListItem
  stages: PipelineStage[]
  currentStageId: number
  isMoving: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onMoveTo: (stage: PipelineStage) => void
}

export function ApplicationCard({
  jobId,
  application,
  stages,
  currentStageId,
  isMoving,
  onDragStart,
  onDragEnd,
  onMoveTo,
}: ApplicationCardProps) {
  const { candidate, match_score, eligibility } = application
  const elsewhere = stages.filter((stage) => stage.id !== currentStageId)

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', application.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      aria-label={candidate.full_name}
      className={cn(
        'group rounded-md border border-n-200 bg-white p-3 transition-opacity',
        isMoving && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 cursor-grab text-n-300 group-hover:text-n-400"
        />
        <div className="min-w-0 flex-1">
          <Link
            to="/jobs/$jobId/applications/$applicationId"
            params={{ jobId, applicationId: application.id }}
            className="block truncate text-sm font-medium text-n-900 hover:text-accent"
          >
            {candidate.full_name}
          </Link>
          <p className="truncate text-xs text-n-500">{candidate.email}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="rounded-xs px-1 text-xs text-n-500 hover:text-n-900 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            aria-label={`Move ${candidate.full_name} to another stage`}
          >
            Move
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {elsewhere.map((stage) => (
              <DropdownMenuItem key={stage.id} onSelect={() => onMoveTo(stage)}>
                {stage.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
        <Badge variant={eligibilityVariants[eligibility] ?? 'neutral'}>
          {eligibilityLabels[eligibility] ?? eligibility}
        </Badge>
        {match_score !== null && (
          <Badge variant="neutral">
            <span className="sr-only">Match score </span>
            {match_score}%
          </Badge>
        )}
      </div>
    </article>
  )
}
