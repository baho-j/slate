import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/PagePlaceholder'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <PagePlaceholder title="Dashboard" description="Hiring activity across your organisation." />
  )
}
