import { Input } from '@/components/ui/input'
import type { AnswerValue, ApplicationFieldDefinition } from './types'

interface DynamicFieldProps {
  field: ApplicationFieldDefinition
  id: string
  value: AnswerValue
  onChange: (value: AnswerValue) => void
}

export function DynamicField({ field, id, value, onChange }: DynamicFieldProps) {
  const options = field.options ?? []

  switch (field.type) {
    case 'boolean':
      return (
        <label htmlFor={id} className="flex items-center gap-2 text-sm text-n-700">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
            className="size-4 rounded-sm border-n-300 text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          Yes
        </label>
      )

    case 'select':
      return (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
          className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )

    case 'multiselect': {
      const selected = Array.isArray(value) ? value : []

      return (
        <fieldset id={id} className="space-y-1.5">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-n-700">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selected, option]
                      : selected.filter((held) => held !== option),
                  )
                }
                className="size-4 rounded-sm border-n-300 text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
              {option}
            </label>
          ))}
        </fieldset>
      )
    }

    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={typeof value === 'number' || typeof value === 'string' ? String(value) : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        />
      )

    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        />
      )

    default:
      return (
        <Input
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        />
      )
  }
}
