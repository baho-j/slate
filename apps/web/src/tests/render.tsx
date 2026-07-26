import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { navItems } from '@/components/layout/nav-items'
import { authKeys } from '@/features/auth/hooks'
import type { User } from '@/features/auth/types'

export const testUser: User = {
  id: 1,
  name: 'Ada Lovelace',
  email: 'hr@slate.test',
  role: 'hr_manager',
  organization_id: 1,
  organization: { id: 1, name: 'Acme', slug: 'acme' },
}

interface RenderOptions {
  user?: User | null
  initialPath?: string
}

const harnessId = 'harness-ready'

/** Mounts `ui` inside a memory router carrying the real nav routes, with `me` pre-seeded. */
export async function renderInApp(
  ui: ReactNode,
  { user = testUser, initialPath = '/' }: RenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  if (user) {
    queryClient.setQueryData(authKeys.me, user)
  }

  const rootRoute = createRootRoute()
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'harness',
    component: () => <div data-testid={harnessId}>{ui}</div>,
  })

  const routes = navItems.map(({ to }) =>
    createRoute({ getParentRoute: () => layoutRoute, path: to, component: () => null }),
  )

  const router = createRouter({
    routeTree: rootRoute.addChildren([layoutRoute.addChildren(routes)]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      {/** biome-ignore lint/suspicious/noExplicitAny: harness router type differs from the generated app tree */}
      <RouterProvider router={router as any} />
    </QueryClientProvider>,
  )

  await screen.findByTestId(harnessId)

  return result
}
