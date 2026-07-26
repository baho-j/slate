import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className="flex min-h-dvh bg-n-50" role="status" aria-label="Loading">
        <div className="hidden w-60 shrink-0 border-r border-n-200 bg-white p-3 md:block">
          <Skeleton className="mb-6 h-6 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
