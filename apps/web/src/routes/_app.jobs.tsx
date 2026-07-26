import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/PagePlaceholder'

export const Route = createFileRoute('/_app/jobs')({
  component: JobsPage,
})

function JobsPage() {
  return <PagePlaceholder title="Jobs" description="Open roles and their screening criteria." />
}
