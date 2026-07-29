import type { ReactNode } from 'react'
import { ToastRoot } from '@/components/ui/toast-context'
import { renderInApp } from '@/tests/render'
import type { Job } from './types'

export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Backend Engineer',
    description: 'Build the API.',
    department: 'Engineering',
    location: 'Remote',
    employment_type: 'full_time',
    salary_min: 80000,
    salary_max: 120000,
    currency: 'USD',
    status: 'draft',
    closing_date: null,
    created_at: '2026-07-29T00:00:00+00:00',
    updated_at: '2026-07-29T00:00:00+00:00',
    ...overrides,
  }
}

export function renderJobsUi(ui: ReactNode) {
  return renderInApp(<ToastRoot>{ui}</ToastRoot>, { initialPath: '/jobs' })
}
