import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import { ApplicationCard } from './ApplicationCard'
import { useStageColumn } from './hooks'
import type { ApplicationListItem, PipelineStage } from './types'

interface StageColumnProps {
  jobId: string
  stage: PipelineStage
  stages: PipelineStage[]
  movingId: string | null
  isDropTarget: boolean
  onDragStartCard: (application: ApplicationListItem, from: PipelineStage) => void
  onDragEndCard: () => void
  onDropInto: (stage: PipelineStage) => void
  onMoveCard: (application: ApplicationListItem, from: PipelineStage, to: PipelineStage) => void
}

export function StageColumn({
  jobId,
  stage,
  stages,
  movingId,
  isDropTarget,
  onDragStartCard,
  onDragEndCard,
  onDropInto,
  onMoveCard,
}: StageColumnProps) {
  const [cursor, setCursor] = useState<string | null>(null)
  const [isOver, setIsOver] = useState(false)
  const { data, isLoading, isError } = useStageColumn(jobId, stage.id, cursor)

  const applications = data?.data ?? []
  const meta = data?.meta

  return (
    <section
      aria-label={stage.name}
      onDragOver={(event) => {
        if (!isDropTarget) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setIsOver(false)
        if (isDropTarget) onDropInto(stage)
      }}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border border-n-200 bg-n-50 transition-colors sm:w-80',
        isOver && isDropTarget && 'border-accent bg-accent-subtle',
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-n-200 px-3 py-2">
        <h2 className="truncate text-sm font-semibold text-n-900">{stage.name}</h2>
        <span className="shrink-0 rounded-xs bg-n-200 px-1.5 py-0.5 text-xs text-n-600">
          {stage.application_count}
        </span>
      </header>

      <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
        {isError ? (
          <p role="alert" className="p-3 text-center text-xs text-danger">
            Could not load this stage.
          </p>
        ) : isLoading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : applications.length === 0 ? (
          <p className="p-3 text-center text-xs text-n-400">Nothing here yet.</p>
        ) : (
          applications.map((application) => (
            <ApplicationCard
              key={application.id}
              jobId={jobId}
              application={application}
              stages={stages}
              currentStageId={stage.id}
              isMoving={movingId === application.id}
              onDragStart={() => onDragStartCard(application, stage)}
              onDragEnd={onDragEndCard}
              onMoveTo={(to) => onMoveCard(application, stage, to)}
            />
          ))
        )}
      </div>

      {meta && (meta.prev_cursor || meta.next_cursor) && (
        <nav
          aria-label={`${stage.name} pagination`}
          className="flex items-center justify-between gap-2 border-t border-n-200 px-2 py-1.5"
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={!meta.prev_cursor}
            onClick={() => setCursor(meta.prev_cursor)}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!meta.next_cursor}
            onClick={() => setCursor(meta.next_cursor)}
          >
            Next
          </Button>
        </nav>
      )}
    </section>
  )
}
