import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-context'
import { move } from '@/features/job-builder/drafts'
import type { StageInput } from './api'
import { useReplaceStages } from './hooks'
import type { PipelineStage } from './types'

interface StageDraft extends StageInput {
  uid: string
}

interface StageConfigDialogProps {
  jobId: string
  stages: PipelineStage[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StageConfigDialog({ jobId, stages, open, onOpenChange }: StageConfigDialogProps) {
  const { toast } = useToast()
  const save = useReplaceStages(jobId)
  const [drafts, setDrafts] = useState<StageDraft[]>(() => stages.map(toDraft))
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDrafts(stages.map(toDraft))
    setError(null)
  }

  function handleSave() {
    setError(null)

    save.mutate(
      drafts.map(({ id, name, is_terminal }) => ({ id, name: name.trim(), is_terminal })),
      {
        onSuccess: () => {
          toast('Stages updated.', 'success')
          onOpenChange(false)
        },
        onError: (failure) => setError(readableError(failure.response?.data, failure.status)),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pipeline stages</DialogTitle>
          <DialogDescription>
            Rename, reorder, or add the stages candidates move through on this job.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className="mb-3 rounded-sm bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {drafts.map((draft, index) => (
            <li key={draft.uid} className="flex items-center gap-2">
              <Input
                aria-label={`Stage ${index + 1} name`}
                value={draft.name}
                onChange={(event) =>
                  setDrafts((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-n-600">
                <input
                  type="checkbox"
                  checked={draft.is_terminal}
                  aria-label={`${draft.name || `Stage ${index + 1}`} is an end state`}
                  onChange={(event) =>
                    setDrafts((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, is_terminal: event.target.checked } : item,
                      ),
                    )
                  }
                />
                End
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${draft.name || `stage ${index + 1}`} up`}
                disabled={index === 0}
                onClick={() => setDrafts((current) => move(current, index, index - 1))}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move ${draft.name || `stage ${index + 1}`} down`}
                disabled={index === drafts.length - 1}
                onClick={() => setDrafts((current) => move(current, index, index + 1))}
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${draft.name || `stage ${index + 1}`}`}
                onClick={() => setDrafts((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3 self-start"
          onClick={() => setDrafts((current) => [...current, blankStage()])}
        >
          <Plus className="size-4" />
          Add stage
        </Button>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save stages'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toDraft(stage: PipelineStage): StageDraft {
  return {
    uid: String(stage.id),
    id: stage.id,
    name: stage.name,
    is_terminal: stage.is_terminal,
  }
}

function blankStage(): StageDraft {
  return { uid: `new-${crypto.randomUUID()}`, id: null, name: '', is_terminal: false }
}

function readableError(
  body: { message?: string; errors?: Record<string, string[]> } | undefined,
  status?: number,
): string {
  if (status === 409 && body?.message) return body.message

  const first = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined

  return first ?? body?.message ?? 'Could not save the stages.'
}
