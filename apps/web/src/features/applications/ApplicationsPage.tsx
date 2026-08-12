import { Link } from '@tanstack/react-router'
import { ArrowLeft, Columns3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { ApplicationsTable } from './ApplicationsTable'
import { statusFilterOptions } from './constants'
import { useApplications } from './hooks'
import type { ApplicationListParams, ApplicationStatus } from './types'

const ALL_STATUSES = 'all'

export function ApplicationsPage({ jobId }: { jobId: string }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ApplicationStatus | typeof ALL_STATUSES>(ALL_STATUSES)
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), 250)

  const params = useMemo<ApplicationListParams>(
    () => ({
      page,
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(status !== ALL_STATUSES ? { status } : {}),
    }),
    [page, debouncedSearch, status],
  )

  const { data, isLoading, isError } = useApplications(jobId, params)
  const applications = data?.data ?? []
  const meta = data?.meta

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
        >
          <ArrowLeft className="size-4" />
          Jobs
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-n-900">Applications</h1>
            <p className="text-sm text-n-500">Candidates who applied to this role.</p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/jobs/$jobId/board" params={{ jobId }}>
              <Columns3 className="size-4" />
              Board view
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search by name or email…"
          aria-label="Search applications"
          value={search}
          onChange={(event) => resetToFirstPage(setSearch)(event.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) =>
            resetToFirstPage(setStatus)(value as ApplicationStatus | typeof ALL_STATUSES)
          }
        >
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            {statusFilterOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-n-200 bg-white">
        {isError ? (
          <p role="alert" className="px-3 py-10 text-center text-sm text-danger">
            We couldn't load applications. Please try again.
          </p>
        ) : (
          <ApplicationsTable jobId={jobId} applications={applications} isLoading={isLoading} />
        )}
      </div>

      {meta && meta.last_page > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
          <p className="text-sm text-n-500">
            Page {meta.current_page} of {meta.last_page} · {meta.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}
