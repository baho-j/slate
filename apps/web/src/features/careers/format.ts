import type { PublicJob } from './types'

export function formatSalaryRange(job: PublicJob): string | null {
  const { salary_min, salary_max, currency } = job
  if (salary_min === null && salary_max === null) {
    return null
  }

  const format = (value: number) =>
    new Intl.NumberFormat(undefined, {
      style: currency ? 'currency' : 'decimal',
      currency: currency ?? undefined,
      maximumFractionDigits: 0,
    }).format(value)

  if (salary_min !== null && salary_max !== null) {
    return `${format(salary_min)} – ${format(salary_max)}`
  }

  return format((salary_min ?? salary_max) as number)
}
