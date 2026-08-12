import { Link } from '@tanstack/react-router'
import { ArrowLeft, Settings2, Table2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast-context'
import { useMe } from '@/features/auth/hooks'
import { useMoveApplication, usePipeline } from './hooks'
import { StageColumn } from './StageColumn'
import { StageConfigDialog } from './StageConfigDialog'
import type { ApplicationListItem, PipelineStage } from './types'

interface Dragged {
  application: ApplicationListItem
  from: PipelineStage
}

export function BoardPage({ jobId }: { jobId: string }) {
  const { toast } = useToast()
  const { data: user } = useMe()
  const { data: pipeline, isLoading, isError } = usePipeline(jobId)
  const move = useMoveApplication(jobId)

  const [dragged, setDragged] = useState<Dragged | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [configuring, setConfiguring] = useState(false)

  function moveCard(application: ApplicationListItem, from: PipelineStage, to: PipelineStage) {
    if (from.id === to.id) return

    setMovingId(application.id)

    move.mutate(
      { application, from, to },
      {
        onSuccess: () =>
          toast(`${application.candidate.full_name} moved to ${to.name}.`, 'success'),
        onError: () => toast('Could not move the application. Put it back.', 'danger'),
        onSettled: () => setMovingId(null),
      },
    )
  }

  function handleDrop(to: PipelineStage) {
    if (!dragged) return
    moveCard(dragged.application, dragged.from, to)
    setDragged(null)
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[0, 1, 2, 3].map((column) => (
          <Skeleton key={column} className="h-96 w-72 shrink-0 sm:w-80" />
        ))}
      </div>
    )
  }

  if (isError || !pipeline) {
    return (
      <p
        role="alert"
        className="rounded-md border border-n-200 p-10 text-center text-sm text-danger"
      >
        We couldn't load the board. Please try again.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
          >
            <ArrowLeft className="size-4" />
            Jobs
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-n-900">Pipeline</h1>
          <p className="text-sm text-n-500">
            Drag a candidate to another stage, or use the move menu on a card.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/jobs/$jobId/applications" params={{ jobId }}>
              <Table2 className="size-4" />
              List view
            </Link>
          </Button>
          {user?.role === 'hr_manager' && (
            <Button variant="secondary" size="sm" onClick={() => setConfiguring(true)}>
              <Settings2 className="size-4" />
              Configure stages
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {pipeline.stages.map((stage) => (
          <StageColumn
            key={stage.id}
            jobId={jobId}
            stage={stage}
            stages={pipeline.stages}
            movingId={movingId}
            isDropTarget={dragged !== null && dragged.from.id !== stage.id}
            onDragStartCard={(application, from) => setDragged({ application, from })}
            onDragEndCard={() => setDragged(null)}
            onDropInto={handleDrop}
            onMoveCard={moveCard}
          />
        ))}
      </div>

      {user?.role === 'hr_manager' && (
        <StageConfigDialog
          jobId={jobId}
          stages={pipeline.stages}
          open={configuring}
          onOpenChange={setConfiguring}
        />
      )}
    </div>
  )
}
