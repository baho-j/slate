import { CalendarPlus, ClipboardCheck, MapPin, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/toast-context'
import { useMe } from '@/features/auth/hooks'
import { formatWhen } from './datetime'
import { EvaluationSummary } from './EvaluationSummary'
import { useUpdateInterview } from './hooks'
import { InterviewStatusBadge } from './InterviewStatusBadge'
import { ScheduleInterviewDialog } from './ScheduleInterviewDialog'
import { SubmitEvaluationDialog } from './SubmitEvaluationDialog'
import type { Interview, InterviewStatus } from './types'

const outcomes: { value: InterviewStatus; label: string }[] = [
  { value: 'completed', label: 'Mark completed' },
  { value: 'no_show', label: 'Mark no show' },
  { value: 'cancelled', label: 'Cancel interview' },
]

export function InterviewsPanel({
  applicationId,
  interviews,
}: {
  applicationId: string
  interviews: Interview[]
}) {
  const { data: user } = useMe()
  const [scheduling, setScheduling] = useState(false)
  const [editing, setEditing] = useState<Interview | undefined>()

  const canSchedule = user?.role === 'hr_manager' || user?.role === 'recruiter'
  const currentUserId = user?.id

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-n-700">Interviews</h2>
        {canSchedule && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditing(undefined)
              setScheduling(true)
            }}
          >
            <CalendarPlus className="size-4" />
            Schedule
          </Button>
        )}
      </div>

      {interviews.length === 0 ? (
        <p className="rounded-md border border-dashed border-n-200 p-6 text-center text-sm text-n-500">
          No interviews scheduled yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {interviews.map((interview) => (
            <InterviewRow
              key={interview.id}
              applicationId={applicationId}
              interview={interview}
              canManage={canSchedule}
              isAssignedInterviewer={interview.interviewer?.id === currentUserId}
              onReschedule={() => {
                setEditing(interview)
                setScheduling(true)
              }}
            />
          ))}
        </ul>
      )}

      {canSchedule && (
        <ScheduleInterviewDialog
          key={editing?.id ?? 'new'}
          applicationId={applicationId}
          interview={editing}
          open={scheduling}
          onOpenChange={(next) => {
            setScheduling(next)
            if (!next) setEditing(undefined)
          }}
        />
      )}
    </section>
  )
}

function InterviewRow({
  applicationId,
  interview,
  canManage,
  isAssignedInterviewer,
  onReschedule,
}: {
  applicationId: string
  interview: Interview
  canManage: boolean
  isAssignedInterviewer: boolean
  onReschedule: () => void
}) {
  const { toast } = useToast()
  const update = useUpdateInterview(applicationId)
  const [evaluating, setEvaluating] = useState(false)

  const canEvaluate = isAssignedInterviewer && interview.status === 'scheduled'

  function setStatus(status: InterviewStatus) {
    update.mutate(
      { id: interview.id, input: { status } },
      {
        onSuccess: () => toast('Interview updated.', 'success'),
        onError: () => toast('Could not update the interview.', 'danger'),
      },
    )
  }

  return (
    <li className="rounded-md border border-n-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-n-900">{formatWhen(interview.scheduled_at)}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-n-500">
            {interview.interviewer && <span>{interview.interviewer.name}</span>}
            {interview.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {interview.location}
              </span>
            )}
          </p>
          {interview.notes && <p className="mt-1 text-sm text-n-500">{interview.notes}</p>}
        </div>

        <div className="flex items-center gap-2">
          <InterviewStatusBadge status={interview.status} />
          {canEvaluate && (
            <Button variant="secondary" size="sm" onClick={() => setEvaluating(true)}>
              <ClipboardCheck className="size-4" />
              Evaluate
            </Button>
          )}
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Interview options for ${formatWhen(interview.scheduled_at)}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onReschedule}>Reschedule</DropdownMenuItem>
                {outcomes
                  .filter((outcome) => outcome.value !== interview.status)
                  .map((outcome) => (
                    <DropdownMenuItem key={outcome.value} onSelect={() => setStatus(outcome.value)}>
                      {outcome.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {interview.evaluation && <EvaluationSummary evaluation={interview.evaluation} />}

      {canEvaluate && (
        <SubmitEvaluationDialog
          interviewId={interview.id}
          applicationId={applicationId}
          open={evaluating}
          onOpenChange={setEvaluating}
        />
      )}
    </li>
  )
}
