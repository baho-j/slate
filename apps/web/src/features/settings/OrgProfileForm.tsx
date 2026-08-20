import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-context'
import { acceptAttribute, LOGO_CONSTRAINT, validateFile } from '@/lib/file-validation'
import { uploadLogo } from './api'
import { useUpdateOrganization } from './hooks'
import type { Organization } from './types'

export function OrgProfileForm({ organization }: { organization: Organization }) {
  const { toast } = useToast()
  const update = useUpdateOrganization()

  const [name, setName] = useState(organization.name)
  const [description, setDescription] = useState(organization.description ?? '')
  const [website, setWebsite] = useState(organization.website ?? '')
  const [logoUrl, setLogoUrl] = useState(organization.logo_url)
  const [logoKey, setLogoKey] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogo(file: File) {
    // Validate type and size on the client before spending a presign/SAS round-trip.
    const problem = validateFile(file, LOGO_CONSTRAINT)
    if (problem) {
      setError(problem)
      return
    }

    setUploading(true)
    setError(null)
    try {
      const key = await uploadLogo(file)
      setLogoKey(key)
      setLogoUrl(URL.createObjectURL(file))
    } catch {
      setError('Could not upload the logo.')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    update.mutate(
      {
        name: name.trim(),
        description: description.trim() || null,
        website: website.trim() || null,
        ...(logoKey ? { logo_key: logoKey } : {}),
      },
      {
        onSuccess: () => {
          toast('Organisation profile saved.', 'success')
          setLogoKey(null)
        },
        onError: (failure) => setError(readableError(failure.response?.data)),
      },
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-n-700">Organisation profile</h2>
        <p className="text-sm text-n-500">Shown on your public careers page.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Organisation logo"
              className="size-14 rounded-md border border-n-200 object-contain"
            />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-md border border-dashed border-n-300 text-xs text-n-400">
              Logo
            </div>
          )}
          <label className="cursor-pointer text-sm text-accent hover:text-accent-hover">
            {uploading ? 'Uploading…' : 'Upload logo'}
            <input
              type="file"
              accept={acceptAttribute(LOGO_CONSTRAINT)}
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleLogo(file)
              }}
            />
          </label>
        </div>

        <div className="space-y-1">
          <label htmlFor="org-name" className="text-sm font-medium text-n-700">
            Name
          </label>
          <Input id="org-name" value={name} onChange={(event) => setName(event.target.value)} />
        </div>

        <div className="space-y-1">
          <label htmlFor="org-website" className="text-sm font-medium text-n-700">
            Website
          </label>
          <Input
            id="org-website"
            type="url"
            placeholder="https://example.com"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="org-description" className="text-sm font-medium text-n-700">
            Description
          </label>
          <textarea
            id="org-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-sm border border-n-300 bg-white p-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={update.isPending || uploading}>
          Save profile
        </Button>
      </form>
    </section>
  )
}

function readableError(body: unknown): string {
  const payload = body as { message?: string; errors?: Record<string, string[]> } | undefined
  const first = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined

  return first ?? payload?.message ?? 'Could not save the profile.'
}
