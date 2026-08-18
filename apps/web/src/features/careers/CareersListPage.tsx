import { Link } from '@tanstack/react-router'
import { MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { employmentTypeLabels } from '@/features/jobs/constants'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { CareersShell } from './CareersShell'
import { formatSalaryRange } from './format'
import { usePublicJobs, usePublicOrganization } from './hooks'
import type { PublicJob, PublicJobListParams } from './types'
import { useDocumentMeta } from './useDocumentMeta'

export function CareersListPage({
  orgSlug,
  embedded = false,
}: {
  orgSlug: string
  embedded?: boolean
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim(), 250)

  const org = usePublicOrganization(orgSlug)

  const params = useMemo<PublicJobListParams>(
    () => ({ page, ...(debouncedSearch ? { q: debouncedSearch } : {}) }),
    [page, debouncedSearch],
  )
  const { data, isLoading, isError } = usePublicJobs(orgSlug, params)

  useDocumentMeta({
    title: org.data ? `Careers at ${org.data.name}` : 'Careers',
    description: org.data?.description ?? undefined,
  })

  if (org.isError) {
    return (
      <CareersShell embedded={embedded}>
        <p role="alert" className="py-16 text-center text-n-500">
          This careers page could not be found.
        </p>
      </CareersShell>
    )
  }

  const jobs = data?.data ?? []
  const meta = data?.meta

  return (
    <CareersShell organization={org.data} embedded={embedded}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Open roles</h1>
          {org.data?.description && <p className="mt-1 text-n-500">{org.data.description}</p>}
        </div>

        <Input
          type="search"
          placeholder="Search roles…"
          aria-label="Search roles"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="sm:max-w-sm"
        />

        {isError ? (
          <p role="alert" className="py-16 text-center text-danger">
            We couldn't load these roles. Please try again.
          </p>
        ) : isLoading ? (
          <p className="py-16 text-center text-n-500">Loading roles…</p>
        ) : jobs.length === 0 ? (
          <p className="py-16 text-center text-n-500">No open roles right now.</p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard orgSlug={orgSlug} job={job} embedded={embedded} />
              </li>
            ))}
          </ul>
        )}

        {meta && meta.last_page > 1 && (
          <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
            <p className="text-sm text-n-500">
              Page {meta.current_page} of {meta.last_page}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-n-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-md border border-n-200 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </div>
    </CareersShell>
  )
}

function JobCard({
  orgSlug,
  job,
  embedded,
}: {
  orgSlug: string
  job: PublicJob
  embedded: boolean
}) {
  const salary = formatSalaryRange(job)

  return (
    <Link
      to={embedded ? '/embed/o/$orgSlug/jobs/$jobId' : '/o/$orgSlug/jobs/$jobId'}
      params={{ orgSlug, jobId: job.id }}
      className="block rounded-lg border border-n-200 bg-white p-4 transition-colors hover:border-accent"
    >
      <h2 className="font-medium text-n-900">{job.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-n-500">
        <span>{employmentTypeLabels[job.employment_type]}</span>
        {job.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {job.location}
          </span>
        )}
        {salary && <span>{salary}</span>}
      </div>
    </Link>
  )
}
