import { Trash2 } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { operatorLabels, operatorsForType, operatorTakesList } from './constants'
import type { CriterionDraft, CriterionMode, CriterionOperator, FieldDraft } from './types'

interface CriteriaBuilderProps {
  criteria: CriterionDraft[]
  fields: FieldDraft[]
  errors: Record<string, string>
  onChange: (criteria: CriterionDraft[]) => void
  onRemove: (index: number) => void
}

export function CriteriaBuilder({
  criteria,
  fields,
  errors,
  onChange,
  onRemove,
}: CriteriaBuilderProps) {
  function update(index: number, patch: Partial<CriterionDraft>) {
    onChange(criteria.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  return (
    <ol className="space-y-3">
      {criteria.map((rule, index) => (
        <CriterionRow
          key={rule.uid}
          rule={rule}
          fields={fields}
          error={errors[rule.uid]}
          onUpdate={(patch) => update(index, patch)}
          onRemove={() => onRemove(index)}
        />
      ))}
    </ol>
  )
}

interface CriterionRowProps {
  rule: CriterionDraft
  fields: FieldDraft[]
  error?: string
  onUpdate: (patch: Partial<CriterionDraft>) => void
  onRemove: () => void
}

function CriterionRow({ rule, fields, error, onUpdate, onRemove }: CriterionRowProps) {
  const id = useId()
  const field = fields.find((candidate) => candidate.key === rule.field_key)
  const operators = field ? operatorsForType(field.type) : []

  function handleFieldChange(key: string) {
    const nextField = fields.find((candidate) => candidate.key === key)
    const allowed = nextField ? operatorsForType(nextField.type) : []
    const keepsOperator = allowed.includes(rule.operator)

    onUpdate({
      field_key: key,
      ...(keepsOperator ? {} : { operator: allowed[0] ?? 'exists' }),
    })
  }

  return (
    <li className="rounded-lg border border-n-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-field`} className="text-sm font-medium text-n-700">
            Field
          </label>
          <select
            id={`${id}-field`}
            value={rule.field_key}
            onChange={(event) => handleFieldChange(event.target.value)}
            className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fields.map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {candidate.label || candidate.key}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-operator`} className="text-sm font-medium text-n-700">
            Condition
          </label>
          <select
            id={`${id}-operator`}
            value={rule.operator}
            onChange={(event) => onUpdate({ operator: event.target.value as CriterionOperator })}
            className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {operators.map((operator) => (
              <option key={operator} value={operator}>
                {operatorLabels[operator]}
              </option>
            ))}
          </select>
        </div>

        {rule.operator !== 'exists' && (
          <div className="space-y-1.5">
            <label htmlFor={`${id}-value`} className="text-sm font-medium text-n-700">
              {operatorTakesList(rule.operator) ? 'Values (comma separated)' : 'Value'}
            </label>
            <Input
              id={`${id}-value`}
              value={rule.value}
              onChange={(event) => onUpdate({ value: event.target.value })}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor={`${id}-mode`} className="text-sm font-medium text-n-700">
            Mode
          </label>
          <select
            id={`${id}-mode`}
            value={rule.mode}
            onChange={(event) => {
              const mode = event.target.value as CriterionMode
              onUpdate({ mode, weight: mode === 'scored' ? (rule.weight ?? 10) : null })
            }}
            className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <option value="knockout">Knockout</option>
            <option value="scored">Scored</option>
          </select>
        </div>

        {rule.mode === 'scored' && (
          <div className="space-y-1.5">
            <label htmlFor={`${id}-weight`} className="text-sm font-medium text-n-700">
              Weight
            </label>
            <Input
              id={`${id}-weight`}
              type="number"
              min={1}
              value={rule.weight ?? ''}
              onChange={(event) =>
                onUpdate({ weight: event.target.value === '' ? null : Number(event.target.value) })
              }
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove rule for ${field?.label ?? rule.field_key}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}
