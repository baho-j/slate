import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fieldTypes, typeHasOptions } from './constants'
import { keyFromLabel, move } from './drafts'
import type { FieldDraft, FieldType } from './types'

interface FieldBuilderProps {
  fields: FieldDraft[]
  errors: Record<string, string>
  onChange: (fields: FieldDraft[]) => void
  onRemove: (index: number) => void
}

export function FieldBuilder({ fields, errors, onChange, onRemove }: FieldBuilderProps) {
  function update(index: number, patch: Partial<FieldDraft>) {
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)))
  }

  return (
    <ol className="space-y-3">
      {fields.map((field, index) => (
        <FieldRow
          key={field.uid}
          field={field}
          index={index}
          total={fields.length}
          error={errors[field.uid]}
          onUpdate={(patch) => update(index, patch)}
          onMove={(to) => onChange(move(fields, index, to))}
          onRemove={() => onRemove(index)}
        />
      ))}
    </ol>
  )
}

interface FieldRowProps {
  field: FieldDraft
  index: number
  total: number
  error?: string
  onUpdate: (patch: Partial<FieldDraft>) => void
  onMove: (to: number) => void
  onRemove: () => void
}

function FieldRow({ field, index, total, error, onUpdate, onMove, onRemove }: FieldRowProps) {
  const id = useId()

  function handleLabelChange(label: string) {
    const shouldSyncKey = field.key === '' || field.key === keyFromLabel(field.label)
    onUpdate({ label, ...(shouldSyncKey ? { key: keyFromLabel(label) } : {}) })
  }

  return (
    <li className="rounded-lg border border-n-200 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${id}-label`} className="text-sm font-medium text-n-700">
            Label
          </label>
          <Input
            id={`${id}-label`}
            value={field.label}
            onChange={(event) => handleLabelChange(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-key`} className="text-sm font-medium text-n-700">
            Key
          </label>
          <Input
            id={`${id}-key`}
            value={field.key}
            onChange={(event) => onUpdate({ key: event.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${id}-type`} className="text-sm font-medium text-n-700">
            Type
          </label>
          <select
            id={`${id}-type`}
            value={field.type}
            onChange={(event) => onUpdate({ type: event.target.value as FieldType })}
            className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {fieldTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label htmlFor={`${id}-required`} className="flex items-center gap-2 text-sm text-n-700">
            <input
              id={`${id}-required`}
              type="checkbox"
              checked={field.required}
              onChange={(event) => onUpdate({ required: event.target.checked })}
              className="size-4 rounded-sm border-n-300 text-accent"
            />
            Required
          </label>
        </div>
      </div>

      {typeHasOptions(field.type) && (
        <div className="mt-3 space-y-1.5">
          <label htmlFor={`${id}-options`} className="text-sm font-medium text-n-700">
            Options (comma separated)
          </label>
          <Input
            id={`${id}-options`}
            value={field.options.join(', ')}
            onChange={(event) =>
              onUpdate({
                options: event.target.value
                  .split(',')
                  .map((option) => option.trim())
                  .filter((option) => option !== ''),
              })
            }
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Move ${field.label || 'field'} up`}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        >
          <ChevronUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Move ${field.label || 'field'} down`}
          disabled={index === total - 1}
          onClick={() => onMove(index + 1)}
        >
          <ChevronDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove ${field.label || 'field'}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}
