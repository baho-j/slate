import { createFileRoute } from '@tanstack/react-router'
import { ApplicationDetailPage } from '@/features/applications/ApplicationDetailPage'

export const Route = createFileRoute('/_app/jobs/$jobId/applications/$applicationId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { jobId, applicationId } = Route.useParams()
  return <ApplicationDetailPage jobId={jobId} applicationId={applicationId} />
}
