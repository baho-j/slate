import { Link } from '@tanstack/react-router'
import { CalendarCheck, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/hooks'
import { formatWhen, isPast } from './datetime'
import { useMyInterviews } from './hooks'
import { InterviewStatusBadge } from './InterviewStatusBadge'
import type { Interview } from './types'

const filters = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
] as const

export function MyInterviewsPage() {
  const { data: user } = useMe()
  const [status, setStatus] = useState<string>('scheduled')
  const [page, setPage] = useState(1)

  const params = { ...(status ? { status } : {}), page }
  const { data, isLoading, isError } = useMyInterviews(params)

  const interviews = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-n-900">My interviews</h1>
        <p className="text-sm text-n-500">Interviews you have been assigned to conduct.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.value || 'all'}
            variant={status === filter.value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              setStatus(filter.value)
              setPage(1)
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {isError && (
        <p
          role="alert"
          className="rounded-md border border-n-200 p-10 text-center text-sm text-danger"
        >
          We couldn't load your interviews. Please try again.
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !isError && interviews.length === 0 && (
        <div className="rounded-md border border-dashed border-n-200 p-10 text-center">
          <CalendarCheck className="mx-auto size-6 text-n-400" />
          <p className="mt-2 text-sm text-n-500">
            {user?.role === 'interviewer'
              ? 'Nothing assigned to you yet.'
              : 'Nothing assigned to you. Interviews you schedule for others appear on the application.'}
          </p>
        </div>
      )}

      {interviews.length > 0 && (
        <ul className="space-y-2">
          {interviews.map((interview) => (
            <InterviewRow key={interview.id} interview={interview} />
          ))}
        </ul>
      )}

      {meta && meta.last_page > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-n-500">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= meta.last_page}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  )
}

function InterviewRow({ interview }: { interview: Interview }) {
  const application = interview.application
  const overdue = interview.status === 'scheduled' && isPast(interview.scheduled_at)

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-n-200 bg-white p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-n-900">
          {application?.candidate.full_name ?? 'Candidate'}
        </p>
        <p className="text-sm text-n-500">{application?.job.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-n-500">
          <span className={overdue ? 'text-warning' : undefined}>
            {formatWhen(interview.scheduled_at)}
          </span>
          {interview.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {interview.location}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <InterviewStatusBadge status={interview.status} />
        {application && (
          <Button variant="secondary" size="sm" asChild>
            <Link
              to="/jobs/$jobId/applications/$applicationId"
              params={{ jobId: application.job.id, applicationId: application.id }}
            >
              Open
            </Link>
          </Button>
        )}
      </div>
    </li>
  )
}
