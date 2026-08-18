import type { ReactNode } from 'react'
import type { PublicOrganization } from './types'

interface CareersShellProps {
  organization?: PublicOrganization
  embedded?: boolean
  children: ReactNode
}

export function CareersShell({ organization, embedded = false, children }: CareersShellProps) {
  // Embedded, the widget is chrome-free so it sits inside the host page's own layout:
  // no org header, transparent background, tighter padding.
  if (embedded) {
    return (
      <div className="text-n-900">
        <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-n-50 text-n-900">
      <header className="border-b border-n-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <span className="text-lg font-semibold tracking-tight">
            {organization?.name ?? 'Careers'}
          </span>
          {organization?.website && (
            <a
              href={organization.website}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent hover:text-accent-hover"
            >
              Visit website
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
