import { operatorTakesList, typeHasOptions } from './constants'
import type {
  ApplicationField,
  CriterionDraft,
  CriterionInput,
  FieldDraft,
  FieldInput,
  ScreeningCriterion,
} from './types'

let counter = 0

export function nextUid(): string {
  counter += 1
  return `draft-${counter}`
}

export function toFieldDraft(field: ApplicationField): FieldDraft {
  return {
    uid: `field-${field.id}`,
    label: field.label,
    key: field.key,
    type: field.type,
    required: field.required,
    options: field.options ?? [],
  }
}

export function blankFieldDraft(): FieldDraft {
  return { uid: nextUid(), label: '', key: '', type: 'text', required: false, options: [] }
}

export function toCriterionDraft(criterion: ScreeningCriterion): CriterionDraft {
  return {
    uid: `criterion-${criterion.id}`,
    field_key: criterion.field_key,
    operator: criterion.operator,
    value: stringifyValue(criterion.value),
    mode: criterion.mode,
    weight: criterion.weight,
  }
}

export function blankCriterionDraft(fieldKey: string): CriterionDraft {
  return {
    uid: nextUid(),
    field_key: fieldKey,
    operator: 'eq',
    value: '',
    mode: 'knockout',
    weight: null,
  }
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function parseValue(draft: CriterionDraft): unknown {
  if (draft.operator === 'exists') return null

  if (operatorTakesList(draft.operator)) {
    return draft.value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
  }

  const trimmed = draft.value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed)

  return trimmed
}

export function toFieldInputs(drafts: FieldDraft[]): FieldInput[] {
  return drafts.map((draft, index) => ({
    label: draft.label.trim(),
    key: draft.key.trim(),
    type: draft.type,
    required: draft.required,
    order: index,
    ...(typeHasOptions(draft.type) ? { options: draft.options } : {}),
  }))
}

export function toCriterionInputs(drafts: CriterionDraft[]): CriterionInput[] {
  return drafts.map((draft) => ({
    field_key: draft.field_key,
    operator: draft.operator,
    value: parseValue(draft),
    mode: draft.mode,
    ...(draft.mode === 'scored' ? { weight: draft.weight ?? 1 } : {}),
  }))
}

export function move<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items

  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return items
  next.splice(to, 0, moved)

  return next
}

export function keyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^([0-9])/, 'f$1')
}

export function criteriaReferencing(
  criteria: CriterionDraft[],
  fieldKey: string,
): CriterionDraft[] {
  return criteria.filter((criterion) => criterion.field_key === fieldKey)
}
