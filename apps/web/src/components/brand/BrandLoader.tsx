import { BrandLogo } from './BrandLogo'

/** Neutral full-screen loader shown while auth is resolving — no app chrome. */
export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-n-50"
    >
      <BrandLogo className="size-10 animate-pulse" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
