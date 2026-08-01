import { useNavigate } from '@tanstack/react-router'
import { type ReactNode, useEffect } from 'react'
import { BrandLoader } from '@/components/brand/BrandLoader'
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
    return <BrandLoader />
  }

  return <>{children}</>
}
