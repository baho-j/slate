import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast-context'
import { CriteriaBuilder } from './CriteriaBuilder'
import {
  blankCriterionDraft,
  blankFieldDraft,
  criteriaReferencing,
  toCriterionDraft,
  toCriterionInputs,
  toFieldDraft,
  toFieldInputs,
} from './drafts'
import { FieldBuilder } from './FieldBuilder'
import {
  useApplicationFields,
  useReplaceCriteria,
  useReplaceFields,
  useScreeningCriteria,
} from './hooks'
import type { CriterionDraft, FieldDraft } from './types'

interface JobBuilderPageProps {
  jobId: string
}

export function JobBuilderPage({ jobId }: JobBuilderPageProps) {
  const { toast } = useToast()
  const fieldsQuery = useApplicationFields(jobId)
  const criteriaQuery = useScreeningCriteria(jobId)
  const saveFields = useReplaceFields(jobId)
  const saveCriteria = useReplaceCriteria(jobId)

  const [fields, setFields] = useState<FieldDraft[]>([])
  const [criteria, setCriteria] = useState<CriterionDraft[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [criterionErrors, setCriterionErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (fieldsQuery.data) setFields(fieldsQuery.data.map(toFieldDraft))
  }, [fieldsQuery.data])

  useEffect(() => {
    if (criteriaQuery.data) setCriteria(criteriaQuery.data.map(toCriterionDraft))
  }, [criteriaQuery.data])

  function removeField(index: number) {
    const field = fields[index]
    if (!field) return

    const referencing = criteriaReferencing(criteria, field.key)

    if (referencing.length > 0) {
      const single = referencing.length === 1
      const confirmed = window.confirm(
        `${referencing.length} screening ${single ? 'rule references' : 'rules reference'} "${
          field.label || field.key
        }". Removing this field also removes ${single ? 'that rule' : 'those rules'}. Continue?`,
      )
      if (!confirmed) return

      setCriteria((current) => current.filter((rule) => rule.field_key !== field.key))
    }

    setFields((current) => current.filter((_, i) => i !== index))
  }

  function handleSave() {
    setFieldErrors({})
    setCriterionErrors({})

    // Criteria first: the fields PUT rejects removing a key a rule still references.
    saveCriteria.mutate(toCriterionInputs(criteria), {
      onSuccess: () => {
        saveFields.mutate(toFieldInputs(fields), {
          onSuccess: () => toast('Application form saved.', 'success'),
          onError: (error) => {
            setFieldErrors(mapErrors(error.response?.data?.errors, fields, 'fields'))
            toast('Could not save the application form.', 'danger')
          },
        })
      },
      onError: (error) => {
        setCriterionErrors(mapErrors(error.response?.data?.errors, criteria, 'criteria'))
        toast('Could not save the screening rules.', 'danger')
      },
    })
  }

  const saving = saveFields.isPending || saveCriteria.isPending

  if (fieldsQuery.isLoading || criteriaQuery.isLoading) {
    return <p className="text-sm text-n-500">Loading the form builder…</p>
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Application form</h2>
            <p className="text-sm text-n-500">The questions candidates answer when they apply.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFields((current) => [...current, blankFieldDraft()])}
          >
            <Plus className="size-4" />
            Add field
          </Button>
        </header>

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-n-300 p-6 text-center text-sm text-n-500">
            No fields yet. Add one to start building the form.
          </p>
        ) : (
          <FieldBuilder
            fields={fields}
            errors={fieldErrors}
            onChange={setFields}
            onRemove={removeField}
          />
        )}
      </section>

      <section className="space-y-3">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Screening rules</h2>
            <p className="text-sm text-n-500">
              Knockout rules decide eligibility. Scored rules build the match score.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={fields.length === 0}
            onClick={() =>
              setCriteria((current) => {
                const first = fields[0]
                return first ? [...current, blankCriterionDraft(first.key)] : current
              })
            }
          >
            <Plus className="size-4" />
            Add rule
          </Button>
        </header>

        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-n-300 p-6 text-center text-sm text-n-500">
            Add a field first — rules always point at a field.
          </p>
        ) : criteria.length === 0 ? (
          <p className="rounded-lg border border-dashed border-n-300 p-6 text-center text-sm text-n-500">
            No screening rules. Every application will need manual review.
          </p>
        ) : (
          <CriteriaBuilder
            criteria={criteria}
            fields={fields}
            errors={criterionErrors}
            onChange={setCriteria}
            onRemove={(index) => setCriteria((current) => current.filter((_, i) => i !== index))}
          />
        )}
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save form'}
        </Button>
      </div>
    </div>
  )
}

function mapErrors(
  errors: Record<string, string[]> | undefined,
  drafts: { uid: string }[],
  prefix: string,
): Record<string, string> {
  if (!errors) return {}

  const mapped: Record<string, string> = {}

  for (const [path, messages] of Object.entries(errors)) {
    const match = path.match(new RegExp(`^${prefix}\\.(\\d+)`))
    const index = match?.[1] === undefined ? null : Number(match[1])
    const draft = index === null ? undefined : drafts[index]
    const message = messages[0]

    if (draft && message) {
      mapped[draft.uid] ??= message
    }
  }

  return mapped
}
