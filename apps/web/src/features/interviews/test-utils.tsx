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
import type { Paginated } from '@/features/applications/types'
import { authKeys } from '@/features/auth/hooks'
import type { User, UserRole } from '@/features/auth/types'
import { InterviewsPanel } from './InterviewsPanel'
import { MyInterviewsPage } from './MyInterviewsPage'
import type { Evaluation, Interview, Interviewer } from './types'

export function makeInterviewer(overrides: Partial<Interviewer> = {}): Interviewer {
  return {
    id: 7,
    name: 'Alan Turing',
    email: 'alan@slate.test',
    role: 'interviewer',
    ...overrides,
  }
}

export function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: 'int-1',
    scheduled_at: '2026-09-01T09:00:00+00:00',
    location: 'Google Meet',
    status: 'scheduled',
    notes: null,
    interviewer: makeInterviewer(),
    application: {
      id: 'app-1',
      candidate: { full_name: 'Grace Hopper' },
      job: { id: 'job-1', title: 'Backend Engineer' },
    },
    created_at: '2026-08-01T00:00:00+00:00',
    ...overrides,
  }
}

export function makeEvaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return {
    id: 'eval-1',
    rating: 4,
    recommendation: 'yes',
    comments: 'Solid across the board.',
    author: { id: 7, name: 'Alan Turing' },
    created_at: '2026-09-02T09:00:00+00:00',
    ...overrides,
  }
}

export function pageOf<T>(items: T[], total = items.length, perPage = 20): Paginated<T> {
  return {
    data: items,
    links: { first: null, last: null, prev: null, next: null },
    meta: {
      current_page: 1,
      from: 1,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      per_page: perPage,
      to: items.length,
      total,
    },
  }
}

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

const harnessId = 'interviews-harness-ready'

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

async function renderWithRouter(queryClient: QueryClient, element: React.ReactNode) {
  const rootRoute = createRootRoute()
  const stub = (path: string) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null })

  const home = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{element}</>,
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([home, stub('/jobs/$jobId/applications/$applicationId')]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
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

export async function renderMyInterviews(role: UserRole = 'interviewer') {
  const queryClient = makeClient()
  queryClient.setQueryData(authKeys.me, testUser(role))

  return renderWithRouter(queryClient, <MyInterviewsPage />)
}

export async function renderInterviewsPanel(interviews: Interview[], role: UserRole = 'recruiter') {
  const queryClient = makeClient()
  queryClient.setQueryData(authKeys.me, testUser(role))

  return renderWithRouter(
    queryClient,
    <InterviewsPanel applicationId="app-1" interviews={interviews} />,
  )
}
