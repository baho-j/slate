import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect } from 'react'
import { useMe } from './hooks'

export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { data: user, isLoading, isError } = useMe()

  useEffect(() => {
    if (isError) {
      navigate({ to: '/login', replace: true })
    }
  }, [isError, navigate])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-50 text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  return <>{children}</>
}
