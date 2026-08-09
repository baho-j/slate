import { Link } from '@tanstack/react-router'
import { ArrowLeft, MapPin } from 'lucide-react'
import { employmentTypeLabels } from '@/features/jobs/constants'
import { ApplyForm } from './ApplyForm'
import { CareersShell } from './CareersShell'
import { formatSalaryRange } from './format'
import { usePublicJob, usePublicOrganization } from './hooks'
import { useDocumentMeta } from './useDocumentMeta'

export function JobDetailPage({ orgSlug, jobId }: { orgSlug: string; jobId: string }) {
  const org = usePublicOrganization(orgSlug)
  const { data: job, isLoading, isError } = usePublicJob(orgSlug, jobId)

  useDocumentMeta({
    title: job && org.data ? `${job.title} · ${org.data.name}` : 'Careers',
    description: job ? job.description.slice(0, 160) : undefined,
  })

  const backLink = (
    <Link
      to="/o/$orgSlug"
      params={{ orgSlug }}
      className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
    >
      <ArrowLeft className="size-4" />
      All roles
    </Link>
  )

  if (isError) {
    return (
      <CareersShell organization={org.data}>
        <div className="space-y-6">
          {backLink}
          <p role="alert" className="py-16 text-center text-n-500">
            This role is no longer open.
          </p>
        </div>
      </CareersShell>
    )
  }

  if (isLoading || !job) {
    return (
      <CareersShell organization={org.data}>
        <p className="py-16 text-center text-n-500">Loading…</p>
      </CareersShell>
    )
  }

  const salary = formatSalaryRange(job)

  return (
    <CareersShell organization={org.data}>
      <article className="space-y-6">
        {backLink}

        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-n-500">
            <span>{employmentTypeLabels[job.employment_type]}</span>
            {job.department && <span>{job.department}</span>}
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {job.location}
              </span>
            )}
            {salary && <span>{salary}</span>}
          </div>
        </header>

        <div className="whitespace-pre-line leading-relaxed text-n-700">{job.description}</div>

        {job.closing_date && (
          <p className="text-sm text-n-500">
            Applications close {new Date(job.closing_date).toLocaleDateString()}
          </p>
        )}

        <hr className="border-n-200" />

        <ApplyForm orgSlug={orgSlug} jobId={jobId} fields={job.fields} criteria={job.criteria} />
      </article>
    </CareersShell>
  )
}
