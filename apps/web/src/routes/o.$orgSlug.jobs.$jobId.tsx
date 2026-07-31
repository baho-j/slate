import { createFileRoute } from '@tanstack/react-router'
import { JobDetailPage } from '@/features/careers/JobDetailPage'

export const Route = createFileRoute('/o/$orgSlug/jobs/$jobId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { orgSlug, jobId } = Route.useParams()
  return <JobDetailPage orgSlug={orgSlug} jobId={jobId} />
}
