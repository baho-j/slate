import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/PagePlaceholder'

export const Route = createFileRoute('/_app/interviews')({
  component: InterviewsPage,
})

function InterviewsPage() {
  return <PagePlaceholder title="Interviews" description="Scheduled interviews and evaluations." />
}
