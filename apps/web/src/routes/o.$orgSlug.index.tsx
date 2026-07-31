import { createFileRoute } from '@tanstack/react-router'
import { CareersListPage } from '@/features/careers/CareersListPage'

export const Route = createFileRoute('/o/$orgSlug/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { orgSlug } = Route.useParams()
  return <CareersListPage orgSlug={orgSlug} />
}
