import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireNavAccess } from '@/components/layout/RequireNavAccess'
import { RequireAuth } from '@/features/auth/RequireAuth'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <RequireNavAccess>
          <Outlet />
        </RequireNavAccess>
      </AppShell>
    </RequireAuth>
  )
}
