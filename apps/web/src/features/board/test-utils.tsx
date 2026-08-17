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
import type { CursorPaginated } from '@/features/applications/types'
import { authKeys } from '@/features/auth/hooks'
import type { User, UserRole } from '@/features/auth/types'
import { BoardPage } from './BoardPage'
import type { ApplicationListItem, Pipeline, PipelineStage } from './types'

export function makeStage(overrides: Partial<PipelineStage> = {}): PipelineStage {
  return {
    id: 1,
    name: 'Applied',
    order: 1,
    is_terminal: false,
    application_count: 0,
    ...overrides,
  }
}

export const defaultStages: PipelineStage[] = [
  makeStage({ id: 1, name: 'Applied', order: 1 }),
  makeStage({ id: 2, name: 'Interview', order: 2 }),
  makeStage({ id: 3, name: 'Hired', order: 3, is_terminal: true }),
]

export function makePipeline(stages: PipelineStage[] = defaultStages): Pipeline {
  return { id: 1, name: 'Default', stages }
}

export function makeCard(overrides: Partial<ApplicationListItem> = {}): ApplicationListItem {
  return {
    id: 'app-1',
    status: 'applied',
    eligibility: 'eligible',
    match_score: 80,
    candidate: { full_name: 'Grace Hopper', email: 'grace@example.com' },
    current_stage: { id: 1, name: 'Applied' },
    created_at: '2026-08-01T00:00:00+00:00',
    ...overrides,
  }
}

export function pageOf(
  items: ApplicationListItem[],
  cursors: { next?: string | null; prev?: string | null } = {},
): CursorPaginated<ApplicationListItem> {
  return {
    data: items,
    links: { first: null, last: null, prev: cursors.prev ?? null, next: cursors.next ?? null },
    meta: {
      path: 'http://localhost/api/jobs/job-1/applications',
      per_page: 10,
      next_cursor: cursors.next ?? null,
      prev_cursor: cursors.prev ?? null,
    },
  }
}

const harnessId = 'board-harness-ready'

export function testUser(role: UserRole = 'recruiter'): User {
  return {
    id: 1,
    name: 'Ada Lovelace',
    email: 'ada@slate.test',
    role,
    organization_id: 1,
    organization: { id: 1, name: 'Acme', slug: 'acme' },
  }
}

export async function renderBoard(role: UserRole = 'recruiter') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  queryClient.setQueryData(authKeys.me, testUser(role))

  const rootRoute = createRootRoute()
  const stub = (path: string) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null })

  const boardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/jobs/$jobId/board',
    component: () => {
      const { jobId } = boardRoute.useParams()
      return <BoardPage jobId={jobId} />
    },
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      stub('/jobs'),
      stub('/jobs/$jobId/applications'),
      stub('/jobs/$jobId/applications/$applicationId'),
      boardRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ['/jobs/job-1/board'] }),
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
