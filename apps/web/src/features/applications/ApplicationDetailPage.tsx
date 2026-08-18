import { Link } from '@tanstack/react-router'
import { ArrowLeft, Download } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-context'
import { InterviewsPanel } from '@/features/interviews/InterviewsPanel'
import { TalentPoolPanel } from '@/features/talent-pool/TalentPoolPanel'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'
import { fetchCvDownloadUrl } from './api'
import { useApplication } from './hooks'
import { StageMoveControl } from './StageMoveControl'
import { StatusHistoryTimeline } from './StatusHistoryTimeline'
import type { ApplicationDocument } from './types'

export function ApplicationDetailPage({
  jobId,
  applicationId,
}: {
  jobId: string
  applicationId: string
}) {
  const { data: application, isLoading, isError } = useApplication(applicationId)

  const backLink = (
    <Link
      to="/jobs/$jobId/applications"
      params={{ jobId }}
      className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
    >
      <ArrowLeft className="size-4" />
      Applications
    </Link>
  )

  if (isError) {
    return (
      <div className="space-y-6">
        {backLink}
        <p role="alert" className="py-16 text-center text-n-500">
          We couldn't load this application.
        </p>
      </div>
    )
  }

  if (isLoading || !application) {
    return (
      <div className="space-y-6">
        {backLink}
        <p className="py-16 text-center text-n-500">Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {backLink}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-n-900">
            {application.candidate.full_name}
          </h1>
          <p className="text-sm text-n-500">{application.candidate.email}</p>
          {application.candidate.phone && (
            <p className="text-sm text-n-500">{application.candidate.phone}</p>
          )}
        </div>
        <ApplicationStatusBadge status={application.status} />
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StageMoveControl
          applicationId={application.id}
          currentStage={application.current_stage}
          stages={application.available_stages}
        />
        <InfoCard label="Applied" value={new Date(application.created_at).toLocaleDateString()} />
      </section>

      {application.documents.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-n-700">Documents</h2>
          {application.documents.map((document) => (
            <CvDownloadButton
              key={document.id}
              applicationId={application.id}
              document={document}
            />
          ))}
        </section>
      )}

      {application.cover_note && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-n-700">Cover note</h2>
          <p className="whitespace-pre-line rounded-md border border-n-200 bg-white p-4 text-sm leading-relaxed text-n-700">
            {application.cover_note}
          </p>
        </section>
      )}

      <InterviewsPanel applicationId={application.id} interviews={application.interviews ?? []} />

      <TalentPoolPanel
        applicationId={application.id}
        candidateId={application.candidate.id}
        candidateName={application.candidate.full_name}
        entry={application.talent_pool}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-n-700">Status history</h2>
        <StatusHistoryTimeline entries={application.status_history} />
      </section>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-n-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-n-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-n-900">{value}</p>
    </div>
  )
}

function CvDownloadButton({
  applicationId,
  document: doc,
}: {
  applicationId: string
  document: ApplicationDocument
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const url = await fetchCvDownloadUrl(applicationId, doc.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast('Could not open the document.', 'danger')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleDownload} disabled={loading}>
      <Download className="size-4" />
      {doc.original_name}
    </Button>
  )
}
