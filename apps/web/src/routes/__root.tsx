import { QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { FrameGuard } from '@/components/layout/FrameGuard'
import { ToastRoot } from '@/components/ui/toast-context'
import { queryClient } from '@/lib/query-client'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isEmbed = pathname.startsWith('/embed')

  const tree = (
    <QueryClientProvider client={queryClient}>
      <ToastRoot>
        <Outlet />
      </ToastRoot>
    </QueryClientProvider>
  )

  // Only the public /embed/* routes may be framed; everything else refuses.
  return isEmbed ? tree : <FrameGuard>{tree}</FrameGuard>
}
