import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/layout/PagePlaceholder'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return <PagePlaceholder title="Settings" description="Organisation profile and team access." />
}
