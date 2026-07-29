import { describe, expect, it } from 'vitest'
import type { JobFormValues } from './job-schema'
import { jobFormSchema, toJobInput } from './job-schema'

function baseValues(overrides: Partial<JobFormValues> = {}): JobFormValues {
  return {
    title: 'Backend Engineer',
    description: 'Build the API.',
    department: '',
    location: '',
    employment_type: 'full_time',
    salary_min: '',
    salary_max: '',
    currency: '',
    closing_date: '',
    ...overrides,
  }
}

describe('jobFormSchema', () => {
  it('requires a title and description', () => {
    const result = jobFormSchema.safeParse(baseValues({ title: '  ', description: '' }))

    expect(result.success).toBe(false)
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path[0])
    expect(paths).toContain('title')
    expect(paths).toContain('description')
  })

  it('coerces blank optional fields to null', () => {
    const result = jobFormSchema.safeParse(baseValues())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.department).toBeNull()
      expect(result.data.salary_min).toBeNull()
    }
  })

  it('parses salary strings into numbers', () => {
    const result = jobFormSchema.safeParse(
      baseValues({ salary_min: '80000', salary_max: '120000', currency: 'usd' }),
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.salary_min).toBe(80000)
      expect(toJobInput(result.data).currency).toBe('USD')
    }
  })

  it('rejects a non-numeric salary', () => {
    const result = jobFormSchema.safeParse(baseValues({ salary_min: 'abc' }))

    expect(result.success).toBe(false)
  })

  it('rejects salary_max below salary_min', () => {
    const result = jobFormSchema.safeParse(
      baseValues({ salary_min: '90000', salary_max: '50000', currency: 'USD' }),
    )

    expect(result.success).toBe(false)
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path[0])
    expect(paths).toContain('salary_max')
  })

  it('requires a currency when a salary is set', () => {
    const result = jobFormSchema.safeParse(baseValues({ salary_min: '80000' }))

    expect(result.success).toBe(false)
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path[0])
    expect(paths).toContain('currency')
  })
})
