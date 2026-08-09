import type { CriterionOperator, FieldType } from './types'

export const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / no' },
  { value: 'select', label: 'Single choice' },
  { value: 'multiselect', label: 'Multiple choice' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File' },
]

export const operatorLabels: Record<CriterionOperator, string> = {
  eq: 'is',
  neq: 'is not',
  gt: 'is greater than',
  gte: 'is at least',
  lt: 'is less than',
  lte: 'is at most',
  in: 'is one of',
  not_in: 'is none of',
  includes_any: 'includes any of',
  includes_all: 'includes all of',
  exists: 'is answered',
}

const compatibleTypes: Record<CriterionOperator, FieldType[]> = {
  gt: ['number', 'date'],
  gte: ['number', 'date'],
  lt: ['number', 'date'],
  lte: ['number', 'date'],
  includes_any: ['multiselect'],
  includes_all: ['multiselect'],
  in: ['select', 'multiselect', 'text', 'number'],
  not_in: ['select', 'multiselect', 'text', 'number'],
  eq: ['number', 'boolean', 'select', 'text', 'date'],
  neq: ['number', 'boolean', 'select', 'text', 'date'],
  exists: ['text', 'number', 'boolean', 'select', 'multiselect', 'file', 'date'],
}

export function operatorsForType(type: FieldType): CriterionOperator[] {
  return (Object.keys(compatibleTypes) as CriterionOperator[]).filter((operator) =>
    compatibleTypes[operator].includes(type),
  )
}

export function operatorSupports(operator: CriterionOperator, type: FieldType): boolean {
  return compatibleTypes[operator].includes(type)
}

export function typeHasOptions(type: FieldType): boolean {
  return type === 'select' || type === 'multiselect'
}

export function operatorTakesList(operator: CriterionOperator): boolean {
  return ['in', 'not_in', 'includes_any', 'includes_all'].includes(operator)
}
