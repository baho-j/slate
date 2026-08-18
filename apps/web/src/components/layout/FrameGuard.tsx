import type { ReactNode } from 'react'

/** True when the document is rendered inside a frame we don't control. */
function isFramed(): boolean {
  try {
    return window.self !== window.top
  } catch {
    // A cross-origin parent throws on access — that is itself proof of framing.
    return true
  }
}

/**
 * Clickjacking guard for the authenticated app. `frame-ancestors` on the CDN is the real
 * enforcement, but static hosts don't always let us set headers, so the shell also refuses
 * to render inside a frame. Only the public `/embed/*` routes are allowed to be framed, and
 * they never mount this.
 */
export function FrameGuard({ children }: { children: ReactNode }) {
  if (isFramed()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-n-50 p-6">
        <div className="max-w-sm rounded-md border border-n-200 bg-white p-6 text-center">
          <h1 className="text-lg font-semibold text-n-900">Slate can't be embedded</h1>
          <p className="mt-2 text-sm text-n-500">
            For security, the Slate app can't run inside another site. Open it directly instead.
          </p>
          <a
            href={window.location.href}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm text-accent hover:text-accent-hover"
          >
            Open Slate
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
