import { z } from 'zod'
import type { EmploymentType, JobInput } from './types'

const employmentTypes: [EmploymentType, ...EmploymentType[]] = [
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'internship',
]

const optionalText = z
  .string()
  .trim()
  .max(255, 'Must be 255 characters or fewer')
  .transform((value) => (value === '' ? null : value))
  .nullable()

const optionalSalary = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .refine((value) => value === null || /^\d+$/.test(value), 'Must be a whole number')
  .transform((value) => (value === null ? null : Number(value)))

export const jobFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(255, 'Must be 255 characters or fewer'),
    description: z.string().trim().min(1, 'Description is required'),
    department: optionalText,
    location: optionalText,
    employment_type: z.enum(employmentTypes, { message: 'Select an employment type' }),
    salary_min: optionalSalary,
    salary_max: optionalSalary,
    currency: optionalText,
    closing_date: optionalText,
  })
  .refine(
    (value) =>
      value.salary_min === null ||
      value.salary_max === null ||
      value.salary_max >= value.salary_min,
    { path: ['salary_max'], message: 'Maximum must be at least the minimum' },
  )
  .refine(
    (value) => !(value.salary_min !== null || value.salary_max !== null) || !!value.currency,
    {
      path: ['currency'],
      message: 'Currency is required when a salary is set',
    },
  )

export type JobFormValues = z.input<typeof jobFormSchema>

export function toJobInput(values: z.output<typeof jobFormSchema>): JobInput {
  return {
    title: values.title,
    description: values.description,
    department: values.department,
    location: values.location,
    employment_type: values.employment_type,
    salary_min: values.salary_min,
    salary_max: values.salary_max,
    currency: values.currency ? values.currency.toUpperCase() : null,
    closing_date: values.closing_date,
  }
}
