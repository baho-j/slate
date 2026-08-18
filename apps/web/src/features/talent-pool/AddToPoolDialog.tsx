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
import { useAddToPool } from './hooks'

interface AddToPoolDialogProps {
  applicationId: string
  candidateId: string
  candidateName: string
  initialTags?: string[]
  initialNote?: string | null
  isUpdate?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  )
}

export function AddToPoolDialog({
  applicationId,
  candidateId,
  candidateName,
  initialTags = [],
  initialNote = '',
  isUpdate = false,
  open,
  onOpenChange,
}: AddToPoolDialogProps) {
  const { toast } = useToast()
  const add = useAddToPool(applicationId)

  const [tags, setTags] = useState(initialTags.join(', '))
  const [note, setNote] = useState(initialNote ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    add.mutate(
      { candidate_id: candidateId, tags: parseTags(tags), note: note.trim() || null },
      {
        onSuccess: () => {
          toast(isUpdate ? 'Talent pool updated.' : 'Added to the talent pool.', 'success')
          onOpenChange(false)
        },
        onError: (failure) => setError(readableError(failure.response?.data)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isUpdate ? 'Update talent pool entry' : 'Add to talent pool'}</DialogTitle>
          <DialogDescription>
            Keep {candidateName} on file for future roles, with tags to find them later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="pool-tags" className="text-sm font-medium text-n-700">
              Tags
            </label>
            <Input
              id="pool-tags"
              value={tags}
              placeholder="senior, backend, remote"
              onChange={(event) => setTags(event.target.value)}
            />
            <p className="text-xs text-n-500">Separate tags with commas.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="pool-note" className="text-sm font-medium text-n-700">
              Note
            </label>
            <textarea
              id="pool-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-sm border border-n-300 bg-white p-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              {isUpdate ? 'Save changes' : 'Add to pool'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function readableError(body: unknown): string {
  const payload = body as { message?: string; errors?: Record<string, string[]> } | undefined
  const first = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined

  return first ?? payload?.message ?? 'Could not update the talent pool.'
}
