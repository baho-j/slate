import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { useMe } from '@/features/auth/hooks'
import { canAccess, homePathFor } from './nav-items'

/**
 * Client-side only — the nav hides what a role cannot use, this stops a typed URL from
 * rendering it anyway. Real enforcement is the server's job (Policies, see docs/01 RBAC).
 */
export function RequireNavAccess({ children }: { children: ReactNode }) {
  const { data: user } = useMe()
  const path = useRouterState({ select: (state) => state.location.pathname })

  if (!user) return null

  if (!canAccess(user.role, path)) {
    return (
      <section className="mx-auto max-w-lg py-12 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-n-900">Not available</h1>
        <p className="mt-2 text-sm text-n-500">
          This section isn’t part of your role. If you think that’s wrong, ask an administrator.
        </p>
        <Button asChild className="mt-6">
          <Link to={homePathFor(user.role)}>
            Back to {user.role === 'candidate' ? 'my applications' : 'dashboard'}
          </Link>
        </Button>
      </section>
    )
  }

  return <>{children}</>
}
