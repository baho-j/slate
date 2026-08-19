import { createFileRoute } from '@tanstack/react-router'
import { useMe } from '@/features/auth/hooks'
import { EmbedSnippet } from '@/features/settings/EmbedSnippet'
import { useOrganization } from '@/features/settings/hooks'
import { OrgProfileForm } from '@/features/settings/OrgProfileForm'
import { UserManagement } from '@/features/settings/UserManagement'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { data: user } = useMe()
  const { data: organization } = useOrganization()
  const org = user?.organization

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-n-900">Settings</h1>
        <p className="text-sm text-n-500">Organisation profile and team access.</p>
      </header>

      {organization && <OrgProfileForm organization={organization} />}

      <UserManagement />

      {org && <EmbedSnippet orgSlug={org.slug} orgName={org.name} />}
    </div>
  )
}
