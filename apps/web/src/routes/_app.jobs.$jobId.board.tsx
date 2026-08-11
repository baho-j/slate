import { createFileRoute } from '@tanstack/react-router'
import { BoardPage } from '@/features/board/BoardPage'

export const Route = createFileRoute('/_app/jobs/$jobId/board')({
  component: RouteComponent,
})

function RouteComponent() {
  const { jobId } = Route.useParams()
  return <BoardPage jobId={jobId} />
}
