import { createFileRoute } from '@tanstack/react-router'
import { ApplicationsPage } from '@/features/applications/ApplicationsPage'

export const Route = createFileRoute('/_app/jobs/$jobId/applications/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { jobId } = Route.useParams()
  return <ApplicationsPage jobId={jobId} />
}
