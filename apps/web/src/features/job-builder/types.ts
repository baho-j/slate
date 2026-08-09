export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'file' | 'date'

export type CriterionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'includes_any'
  | 'includes_all'
  | 'exists'

export type CriterionMode = 'knockout' | 'scored'

export interface ApplicationField {
  id: number
  label: string
  key: string
  type: FieldType
  required: boolean
  options: string[] | null
  order: number
}

export interface ScreeningCriterion {
  id: number
  field_key: string
  operator: CriterionOperator
  value: unknown
  mode: CriterionMode
  weight: number | null
}

export interface FieldDraft {
  uid: string
  label: string
  key: string
  type: FieldType
  required: boolean
  options: string[]
}

export interface CriterionDraft {
  uid: string
  field_key: string
  operator: CriterionOperator
  value: string
  mode: CriterionMode
  weight: number | null
}

export interface FieldInput {
  label: string
  key: string
  type: FieldType
  required: boolean
  order: number
  options?: string[]
}

export interface CriterionInput {
  field_key: string
  operator: CriterionOperator
  value: unknown
  mode: CriterionMode
  weight?: number
}
