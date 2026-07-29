import { QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ToastRoot } from '@/components/ui/toast-context'
import { queryClient } from '@/lib/query-client'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastRoot>
        <Outlet />
      </ToastRoot>
    </QueryClientProvider>
  )
}
