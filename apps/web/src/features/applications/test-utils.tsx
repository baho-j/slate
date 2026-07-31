import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { ToastRoot } from '@/components/ui/toast-context'
import { ApplicationDetailPage } from './ApplicationDetailPage'
import { ApplicationsPage } from './ApplicationsPage'
import type { ApplicationDetail, ApplicationListItem, Paginated } from './types'

export function makeListItem(overrides: Partial<ApplicationListItem> = {}): ApplicationListItem {
  return {
    id: 'app-1',
    status: 'applied',
    eligibility: 'manual',
    match_score: null,
    candidate: { full_name: 'Grace Hopper', email: 'grace@example.com' },
    current_stage: { id: 1, name: 'Applied' },
    created_at: '2026-07-30T00:00:00+00:00',
    ...overrides,
  }
}

export function makeDetail(overrides: Partial<ApplicationDetail> = {}): ApplicationDetail {
  return {
    id: 'app-1',
    status: 'applied',
    eligibility: 'manual',
    match_score: null,
    cover_note: 'I would love to join.',
    created_at: '2026-07-30T00:00:00+00:00',
    candidate: { full_name: 'Grace Hopper', email: 'grace@example.com', phone: '+123' },
    current_stage: { id: 1, name: 'Applied' },
    available_stages: [
      { id: 1, name: 'Applied' },
      { id: 2, name: 'In Review' },
      { id: 3, name: 'Interview' },
    ],
    documents: [
      { id: 10, kind: 'cv', original_name: 'grace.pdf', mime: 'application/pdf', size_bytes: 1234 },
    ],
    status_history: [
      {
        id: 1,
        from_status: null,
        to_status: 'applied',
        to_stage: 'Applied',
        note: 'Application submitted.',
        created_at: '2026-07-30T00:00:00+00:00',
      },
    ],
    ...overrides,
  }
}

export function page<T>(items: T[], meta: Partial<Paginated<T>['meta']> = {}): Paginated<T> {
  return {
    data: items,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: 1,
      per_page: 20,
      to: items.length,
      total: items.length,
      ...meta,
    },
  }
}

const harnessId = 'applications-harness-ready'

export async function renderApplications(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const rootRoute = createRootRoute()
  const jobsStub = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs',
    component: () => null,
  })
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs/$jobId/applications',
    component: () => {
      const { jobId } = listRoute.useParams()
      return <ApplicationsPage jobId={jobId} />
    },
  })
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs/$jobId/applications/$applicationId',
    component: () => {
      const { jobId, applicationId } = detailRoute.useParams()
      return <ApplicationDetailPage jobId={jobId} applicationId={applicationId} />
    },
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([jobsStub, listRoute, detailRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ToastRoot>
        <div data-testid={harnessId}>
          {/** biome-ignore lint/suspicious/noExplicitAny: harness router type differs from the generated app tree */}
          <RouterProvider router={router as any} />
        </div>
      </ToastRoot>
    </QueryClientProvider>,
  )

  await screen.findByTestId(harnessId)

  return result
}
