import type { AnswerValue, ApplicationFieldDefinition } from './types'

function isBlank(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function typeError(field: ApplicationFieldDefinition, value: AnswerValue): string | null {
  switch (field.type) {
    case 'number':
      return Number.isNaN(Number(value)) ? 'Enter a number' : null
    case 'date':
      return Number.isNaN(Date.parse(String(value))) ? 'Enter a valid date' : null
    case 'select':
      return (field.options ?? []).includes(String(value)) ? null : 'Choose one of the options'
    case 'multiselect': {
      if (!Array.isArray(value)) return 'Choose from the options'
      const allowed = field.options ?? []
      return value.every((held) => allowed.includes(held)) ? null : 'Choose from the options'
    }
    default:
      return null
  }
}

export function answersSchema(
  fields: ApplicationFieldDefinition[],
  answers: Record<string, AnswerValue>,
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const field of fields) {
    const value = answers[field.key]

    if (isBlank(value)) {
      if (field.required) {
        errors[field.key] = 'This field is required'
      }
      continue
    }

    const message = typeError(field, value as AnswerValue)
    if (message !== null) {
      errors[field.key] = message
    }
  }

  return errors
}
