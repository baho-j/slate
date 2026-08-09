import { type FormEvent, type ReactNode, useId, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { answersSchema } from './answers-schema'
import { type ApplyFormValues, applyFormSchema } from './apply-schema'
import { previewRequirements } from './criteria-preview'
import { DynamicField } from './DynamicField'
import { useApplyToJob } from './hooks'
import { RequirementsPreview } from './RequirementsPreview'
import type { AnswerValue, ApplicationFieldDefinition, PublicCriterion } from './types'

type FieldErrors = Partial<Record<keyof ApplyFormValues, string>>

interface ApplyFormProps {
  orgSlug: string
  jobId: string
  fields?: ApplicationFieldDefinition[]
  criteria?: PublicCriterion[]
}

export function ApplyForm({ orgSlug, jobId, fields = [], criteria = [] }: ApplyFormProps) {
  const fieldId = useId()
  const apply = useApplyToJob(orgSlug, jobId)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [coverNote, setCoverNote] = useState('')
  const [cv, setCv] = useState<File | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [errors, setErrors] = useState<FieldErrors>({})
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({})

  const requirements = useMemo(() => previewRequirements(criteria, answers), [criteria, answers])

  if (apply.isSuccess) {
    return (
      <div
        role="status"
        className="rounded-lg border border-success/30 bg-success/5 p-6 text-center"
      >
        <h3 className="font-medium text-n-900">Application submitted</h3>
        <p className="mt-1 text-sm text-n-500">
          Thanks for applying. We'll be in touch if there's a match.
        </p>
      </div>
    )
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const result = applyFormSchema.safeParse({
      full_name: fullName,
      email,
      cover_note: coverNote,
      cv: cv ?? undefined,
    })

    const answerIssues = answersSchema(fields, answers)

    if (!result.success || Object.keys(answerIssues).length > 0) {
      const next: FieldErrors = {}
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof ApplyFormValues
          next[key] ??= issue.message
        }
      }
      setErrors(next)
      setAnswerErrors(answerIssues)
      return
    }

    setErrors({})
    setAnswerErrors({})
    apply.mutate({
      full_name: result.data.full_name,
      email: result.data.email,
      cover_note: result.data.cover_note,
      cv: result.data.cv,
      answers,
    })
  }

  const duplicate = apply.error?.response?.status === 409

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight">Apply for this role</h2>

      <Field id={`${fieldId}-name`} label="Full name" error={errors.full_name}>
        <Input
          id={`${fieldId}-name`}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
        />
      </Field>

      <Field id={`${fieldId}-email`} label="Email" error={errors.email}>
        <Input
          id={`${fieldId}-email`}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
      </Field>

      <Field id={`${fieldId}-cv`} label="CV (PDF, max 5MB)" error={errors.cv}>
        <Input
          id={`${fieldId}-cv`}
          type="file"
          accept="application/pdf"
          className="h-auto py-2"
          onChange={(event) => setCv(event.target.files?.[0] ?? null)}
        />
      </Field>

      {fields.map((field) => (
        <Field
          key={field.key}
          id={`${fieldId}-${field.key}`}
          label={field.required ? field.label : `${field.label} (optional)`}
          error={answerErrors[field.key]}
        >
          <DynamicField
            field={field}
            id={`${fieldId}-${field.key}`}
            value={answers[field.key] ?? null}
            onChange={(value) => setAnswers((current) => ({ ...current, [field.key]: value }))}
          />
        </Field>
      ))}

      <RequirementsPreview requirements={requirements} fields={fields} />

      <Field id={`${fieldId}-note`} label="Cover note (optional)" error={errors.cover_note}>
        <textarea
          id={`${fieldId}-note`}
          value={coverNote}
          onChange={(event) => setCoverNote(event.target.value)}
          rows={4}
          className="w-full rounded-sm border border-n-300 bg-white px-3 py-2 text-sm text-n-900 transition-colors placeholder:text-n-400 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </Field>

      {apply.isError && (
        <p role="alert" className="text-sm text-danger">
          {duplicate
            ? "You've already applied to this role."
            : 'Something went wrong submitting your application. Please try again.'}
        </p>
      )}

      <Button type="submit" disabled={apply.isPending}>
        {apply.isPending ? 'Submitting…' : 'Submit application'}
      </Button>
    </form>
  )
}

interface FieldProps {
  id: string
  label: string
  error?: string
  children: ReactNode
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
