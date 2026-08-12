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
import { fromLocalInputValue, toLocalInputValue } from './datetime'
import { useInterviewers, useScheduleInterview, useUpdateInterview } from './hooks'
import type { Interview } from './types'

interface ScheduleInterviewDialogProps {
  applicationId: string
  interview?: Interview
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleInterviewDialog({
  applicationId,
  interview,
  open,
  onOpenChange,
}: ScheduleInterviewDialogProps) {
  const { toast } = useToast()
  const { data: interviewers = [], isLoading: loadingInterviewers } = useInterviewers(open)
  const schedule = useScheduleInterview(applicationId)
  const reschedule = useUpdateInterview(applicationId)

  const [interviewerId, setInterviewerId] = useState(() =>
    interview?.interviewer ? String(interview.interviewer.id) : '',
  )
  const [when, setWhen] = useState(() =>
    interview ? toLocalInputValue(interview.scheduled_at) : '',
  )
  const [location, setLocation] = useState(interview?.location ?? '')
  const [notes, setNotes] = useState(interview?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const isEditing = interview !== undefined
  const saving = schedule.isPending || reschedule.isPending

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const payload = {
      interviewer_id: Number(interviewerId),
      scheduled_at: fromLocalInputValue(when),
      location: location.trim() || null,
      notes: notes.trim() || null,
    }

    const onSuccess = () => {
      toast(isEditing ? 'Interview updated.' : 'Interview scheduled.', 'success')
      onOpenChange(false)
    }
    const onError = (failure: { response?: { data?: unknown } }) =>
      setError(readableError(failure.response?.data))

    if (isEditing) {
      reschedule.mutate({ id: interview.id, input: payload }, { onSuccess, onError })
    } else {
      schedule.mutate(payload, { onSuccess, onError })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Reschedule interview' : 'Schedule interview'}</DialogTitle>
          <DialogDescription>
            The interviewer can read this application once they are assigned.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="interviewer" className="text-sm font-medium text-n-700">
              Interviewer
            </label>
            <select
              id="interviewer"
              required
              value={interviewerId}
              onChange={(event) => setInterviewerId(event.target.value)}
              disabled={loadingInterviewers}
              className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              <option value="">Select an interviewer…</option>
              {interviewers.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="scheduled-at" className="text-sm font-medium text-n-700">
              Date and time
            </label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              required
              value={when}
              onChange={(event) => setWhen(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="location" className="text-sm font-medium text-n-700">
              Location
            </label>
            <Input
              id="location"
              value={location}
              placeholder="Google Meet, office, phone…"
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="notes" className="text-sm font-medium text-n-700">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
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
            <Button type="submit" disabled={saving}>
              {isEditing ? 'Save changes' : 'Schedule'}
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

  return first ?? payload?.message ?? 'Could not save the interview.'
}
