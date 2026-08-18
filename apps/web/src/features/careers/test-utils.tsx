import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { CareersListPage } from './CareersListPage'
import { JobDetailPage } from './JobDetailPage'
import type { PublicJob, PublicOrganization } from './types'

export function makePublicOrg(overrides: Partial<PublicOrganization> = {}): PublicOrganization {
  return {
    name: 'Acme Inc.',
    slug: 'acme',
    description: 'We build things.',
    website: 'https://acme.test',
    ...overrides,
  }
}

export function makePublicJob(overrides: Partial<PublicJob> = {}): PublicJob {
  return {
    id: 'job-1',
    title: 'Backend Engineer',
    description: 'Build and own the API.',
    department: 'Engineering',
    location: 'Remote',
    employment_type: 'full_time',
    salary_min: 80000,
    salary_max: 120000,
    currency: 'USD',
    closing_date: null,
    published_at: '2026-07-29T00:00:00+00:00',
    ...overrides,
  }
}

const harnessId = 'careers-harness-ready'

export async function renderCareers(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const rootRoute = createRootRoute()
  const listRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/o/$orgSlug',
    component: () => {
      const { orgSlug } = listRoute.useParams()
      return <CareersListPage orgSlug={orgSlug} />
    },
  })
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/o/$orgSlug/jobs/$jobId',
    component: () => {
      const { orgSlug, jobId } = detailRoute.useParams()
      return <JobDetailPage orgSlug={orgSlug} jobId={jobId} />
    },
  })
  const embedListRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/embed/o/$orgSlug',
    component: () => {
      const { orgSlug } = embedListRoute.useParams()
      return <CareersListPage orgSlug={orgSlug} embedded />
    },
  })
  const embedDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/embed/o/$orgSlug/jobs/$jobId',
    component: () => {
      const { orgSlug, jobId } = embedDetailRoute.useParams()
      return <JobDetailPage orgSlug={orgSlug} jobId={jobId} embedded />
    },
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([listRoute, detailRoute, embedListRoute, embedDetailRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })

  const result = render(
    <QueryClientProvider client={queryClient}>
      <div data-testid={harnessId}>
        {/** biome-ignore lint/suspicious/noExplicitAny: harness router type differs from the generated app tree */}
        <RouterProvider router={router as any} />
      </div>
    </QueryClientProvider>,
  )

  await screen.findByTestId(harnessId)

  return result
}
