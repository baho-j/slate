import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { JobBuilderPage } from '@/features/job-builder/JobBuilderPage'

export const Route = createFileRoute('/_app/jobs/$jobId/form')({
  component: RouteComponent,
})

function RouteComponent() {
  const { jobId } = Route.useParams()

  return (
    <div className="space-y-6">
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1 text-sm text-n-500 hover:text-n-900"
      >
        <ArrowLeft className="size-4" />
        Back to jobs
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Application form</h1>

      <JobBuilderPage jobId={jobId} />
    </div>
  )
}
