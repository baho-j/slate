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
import type { ApplicationDetail, ApplicationListItem, CursorPaginated } from './types'

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
    candidate: {
      id: 'cand-1',
      full_name: 'Grace Hopper',
      email: 'grace@example.com',
      phone: '+123',
    },
    talent_pool: null,
    current_stage: { id: 1, name: 'Applied' },
    available_stages: [
      { id: 1, name: 'Applied' },
      { id: 2, name: 'In Review' },
      { id: 3, name: 'Interview' },
    ],
    documents: [
      { id: 10, kind: 'cv', original_name: 'grace.pdf', mime: 'application/pdf', size_bytes: 1234 },
    ],
    interviews: [],
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

export function page<T>(
  items: T[],
  meta: Partial<CursorPaginated<T>['meta']> = {},
): CursorPaginated<T> {
  return {
    data: items,
    links: {
      first: null,
      last: null,
      prev: meta.prev_cursor ?? null,
      next: meta.next_cursor ?? null,
    },
    meta: {
      path: 'http://localhost/api/jobs/job-1/applications',
      per_page: 20,
      next_cursor: null,
      prev_cursor: null,
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
