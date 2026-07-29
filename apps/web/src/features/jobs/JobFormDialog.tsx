import { type FormEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import { employmentTypeOptions } from './constants'
import { useCreateJob, useUpdateJob } from './hooks'
import { type JobFormValues, jobFormSchema, toJobInput } from './job-schema'
import type { Job } from './types'

type FieldErrors = Partial<Record<keyof JobFormValues, string>>

function initialValues(job?: Job): JobFormValues {
  return {
    title: job?.title ?? '',
    description: job?.description ?? '',
    department: job?.department ?? '',
    location: job?.location ?? '',
    employment_type: job?.employment_type ?? 'full_time',
    salary_min: job?.salary_min != null ? String(job.salary_min) : '',
    salary_max: job?.salary_max != null ? String(job.salary_max) : '',
    currency: job?.currency ?? '',
    closing_date: job?.closing_date ?? '',
  }
}

interface JobFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  job?: Job
}

export function JobFormDialog({ open, onOpenChange, job }: JobFormDialogProps) {
  const isEdit = job !== undefined
  const fieldId = useId()
  const { toast } = useToast()
  const createJob = useCreateJob()
  const updateJob = useUpdateJob()
  const [values, setValues] = useState<JobFormValues>(() => initialValues(job))
  const [errors, setErrors] = useState<FieldErrors>({})

  const isPending = createJob.isPending || updateJob.isPending

  function setField<K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function applyServerErrors(error: unknown) {
    const response = (error as { response?: { data?: { errors?: Record<string, string[]> } } })
      .response
    if (response?.data?.errors) {
      const serverErrors: FieldErrors = {}
      for (const [key, messages] of Object.entries(response.data.errors)) {
        serverErrors[key as keyof JobFormValues] = messages[0]
      }
      setErrors(serverErrors)
      return true
    }
    return false
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = jobFormSchema.safeParse(values)
    if (!parsed.success) {
      const nextErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof JobFormValues
        nextErrors[key] ??= issue.message
      }
      setErrors(nextErrors)
      return
    }

    setErrors({})
    const input = toJobInput(parsed.data)

    const onError = (error: unknown) => {
      if (!applyServerErrors(error)) {
        toast('Something went wrong. Please try again.', 'danger')
      }
    }

    if (isEdit) {
      updateJob.mutate(
        { id: job.id, input },
        {
          onSuccess: () => {
            toast('Job updated.', 'success')
            onOpenChange(false)
          },
          onError,
        },
      )
    } else {
      createJob.mutate(input, {
        onSuccess: () => {
          toast('Job created.', 'success')
          onOpenChange(false)
        },
        onError,
      })
    }
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setValues(initialValues(job))
      setErrors({})
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit job' : 'New job'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details for this role.'
              : 'Create a new role for your organisation.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Field id={`${fieldId}-title`} label="Title" error={errors.title}>
            <Input
              id={`${fieldId}-title`}
              value={values.title}
              onChange={(event) => setField('title', event.target.value)}
              aria-invalid={errors.title ? true : undefined}
            />
          </Field>

          <Field id={`${fieldId}-description`} label="Description" error={errors.description}>
            <textarea
              id={`${fieldId}-description`}
              value={values.description}
              onChange={(event) => setField('description', event.target.value)}
              aria-invalid={errors.description ? true : undefined}
              rows={4}
              className="w-full rounded-sm border border-n-300 bg-white px-3 py-2 text-sm text-n-900 transition-colors placeholder:text-n-400 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${fieldId}-department`} label="Department" error={errors.department}>
              <Input
                id={`${fieldId}-department`}
                value={values.department ?? ''}
                onChange={(event) => setField('department', event.target.value)}
              />
            </Field>

            <Field id={`${fieldId}-location`} label="Location" error={errors.location}>
              <Input
                id={`${fieldId}-location`}
                value={values.location ?? ''}
                onChange={(event) => setField('location', event.target.value)}
              />
            </Field>
          </div>

          <Field
            id={`${fieldId}-employment-type`}
            label="Employment type"
            error={errors.employment_type}
          >
            <Select
              value={values.employment_type}
              onValueChange={(value) =>
                setField('employment_type', value as JobFormValues['employment_type'])
              }
            >
              <SelectTrigger id={`${fieldId}-employment-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employmentTypeOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={`${fieldId}-salary-min`} label="Salary min" error={errors.salary_min}>
              <Input
                id={`${fieldId}-salary-min`}
                inputMode="numeric"
                value={values.salary_min ?? ''}
                onChange={(event) => setField('salary_min', event.target.value)}
              />
            </Field>

            <Field id={`${fieldId}-salary-max`} label="Salary max" error={errors.salary_max}>
              <Input
                id={`${fieldId}-salary-max`}
                inputMode="numeric"
                value={values.salary_max ?? ''}
                onChange={(event) => setField('salary_max', event.target.value)}
              />
            </Field>

            <Field id={`${fieldId}-currency`} label="Currency" error={errors.currency}>
              <Input
                id={`${fieldId}-currency`}
                maxLength={3}
                value={values.currency ?? ''}
                onChange={(event) => setField('currency', event.target.value)}
                placeholder="USD"
              />
            </Field>
          </div>

          <Field id={`${fieldId}-closing-date`} label="Closing date" error={errors.closing_date}>
            <Input
              id={`${fieldId}-closing-date`}
              type="date"
              value={values.closing_date ?? ''}
              onChange={(event) => setField('closing_date', event.target.value)}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface FieldProps {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-n-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
