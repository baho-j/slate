import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/PagePlaceholder'

export const Route = createFileRoute('/_app/candidates')({
  component: CandidatesPage,
})

function CandidatesPage() {
  return (
    <PagePlaceholder title="Candidates" description="Applications moving through the pipeline." />
  )
}
