import { createFileRoute } from '@tanstack/react-router'
import { useMe } from '@/features/auth/hooks'
import { EmbedSnippet } from '@/features/settings/EmbedSnippet'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { data: user } = useMe()
  const org = user?.organization

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-n-900">Settings</h1>
        <p className="text-sm text-n-500">Organisation profile and team access.</p>
      </header>

      {org && <EmbedSnippet orgSlug={org.slug} orgName={org.name} />}
    </div>
  )
}
