import { Plus } from 'lucide-react'
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
import { statusFilterOptions } from './constants'
import { useJobs } from './hooks'
import { JobFormDialog } from './JobFormDialog'
import { JobsTable } from './JobsTable'
import type { Job, JobListParams, JobStatus } from './types'

const ALL_STATUSES = 'all'

export function JobsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<JobStatus | typeof ALL_STATUSES>(ALL_STATUSES)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)

  const debouncedSearch = useDebouncedValue(search.trim(), 250)

  const params = useMemo<JobListParams>(
    () => ({
      page,
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(status !== ALL_STATUSES ? { status } : {}),
    }),
    [page, debouncedSearch, status],
  )

  const { data, isLoading, isError } = useJobs(params)

  const jobs = data?.data ?? []
  const meta = data?.meta

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-n-900">Jobs</h1>
          <p className="text-sm text-n-500">Open roles for your organisation.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New job
        </Button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search jobs…"
          aria-label="Search jobs"
          value={search}
          onChange={(event) => resetToFirstPage(setSearch)(event.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(value) =>
            resetToFirstPage(setStatus)(value as JobStatus | typeof ALL_STATUSES)
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
            We couldn't load jobs. Please try again.
          </p>
        ) : (
          <JobsTable jobs={jobs} isLoading={isLoading} onEdit={setEditing} />
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

      <JobFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JobFormDialog
        key={editing?.id}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
          }
        }}
        job={editing ?? undefined}
      />
    </div>
  )
}
