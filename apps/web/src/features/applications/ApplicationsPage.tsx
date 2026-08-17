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
import { eligibilityFilterOptions, statusFilterOptions } from './constants'
import { useApplications } from './hooks'
import type { ApplicationStatus, Eligibility } from './types'

const ALL_STATUSES = 'all'
const ALL_ELIGIBILITY = 'all'

export function ApplicationsPage({ jobId }: { jobId: string }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ApplicationStatus | typeof ALL_STATUSES>(ALL_STATUSES)
  const [eligibility, setEligibility] = useState<Eligibility | typeof ALL_ELIGIBILITY>(
    ALL_ELIGIBILITY,
  )
  const [cursor, setCursor] = useState<string | undefined>()
  const debouncedSearch = useDebouncedValue(search.trim(), 250)

  const params = useMemo(
    () => ({
      ...(cursor ? { cursor } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(status !== ALL_STATUSES ? { status } : {}),
      ...(eligibility !== ALL_ELIGIBILITY ? { eligibility } : {}),
    }),
    [cursor, debouncedSearch, status, eligibility],
  )

  const { data, isLoading, isError } = useApplications(jobId, params)
  const applications = data?.data ?? []
  const meta = data?.meta

  function onFilterChange<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setCursor(undefined)
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
          placeholder="Search by name, email, or answers…"
          aria-label="Search applications"
          value={search}
          onChange={(event) => onFilterChange(setSearch)(event.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) =>
            onFilterChange(setStatus)(value as ApplicationStatus | typeof ALL_STATUSES)
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
        <Select
          value={eligibility}
          onValueChange={(value) =>
            onFilterChange(setEligibility)(value as Eligibility | typeof ALL_ELIGIBILITY)
          }
        >
          <SelectTrigger className="sm:w-44" aria-label="Filter by eligibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ELIGIBILITY}>All eligibility</SelectItem>
            {eligibilityFilterOptions.map(([value, label]) => (
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

      {meta && (meta.prev_cursor || meta.next_cursor) && (
        <nav className="flex items-center justify-end gap-2" aria-label="Pagination">
          <Button
            variant="secondary"
            size="sm"
            disabled={!meta.prev_cursor}
            onClick={() => setCursor(meta.prev_cursor ?? undefined)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!meta.next_cursor}
            onClick={() => setCursor(meta.next_cursor ?? undefined)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  )
}
