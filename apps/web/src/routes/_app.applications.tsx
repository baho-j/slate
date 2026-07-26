import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/PagePlaceholder'

export const Route = createFileRoute('/_app/applications')({
  component: ApplicationsPage,
})

function ApplicationsPage() {
  return <PagePlaceholder title="My Applications" description="Roles you have applied for." />
}
