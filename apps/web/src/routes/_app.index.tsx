import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/PagePlaceholder'
import { AnalyticsDashboard } from '@/features/analytics/AnalyticsDashboard'
import { useMe } from '@/features/auth/hooks'

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data: user } = useMe()
  const canView =
    user?.role === 'hr_manager' || user?.role === 'recruiter' || user?.role === 'super_admin'

  if (!canView) {
    return (
      <PagePlaceholder
        title="Dashboard"
        description="Your interviews and assignments are under Interviews."
      />
    )
  }

  return <AnalyticsDashboard />
}
