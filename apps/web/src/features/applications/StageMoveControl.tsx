import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import { useMoveStage } from './hooks'
import type { ApplicationStage } from './types'

interface StageMoveControlProps {
  applicationId: string
  currentStage: ApplicationStage | null
  stages: ApplicationStage[]
}

export function StageMoveControl({ applicationId, currentStage, stages }: StageMoveControlProps) {
  const { toast } = useToast()
  const moveStage = useMoveStage(applicationId)

  if (stages.length === 0) {
    return null
  }

  function handleChange(value: string) {
    const stage = stages.find((candidate) => String(candidate.id) === value)
    if (!stage || stage.id === currentStage?.id) {
      return
    }

    moveStage.mutate(
      { stage },
      {
        onError: () => toast('Could not move the application. Reverted.', 'danger'),
      },
    )
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs uppercase tracking-wide text-n-400">Move to stage</span>
      <Select
        value={currentStage ? String(currentStage.id) : undefined}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-full sm:w-56" aria-label="Move to stage">
          <SelectValue placeholder="Select a stage" />
        </SelectTrigger>
        <SelectContent>
          {stages.map((stage) => (
            <SelectItem key={stage.id} value={String(stage.id)}>
              {stage.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
