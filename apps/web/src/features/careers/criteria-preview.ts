import type { AnswerValue, CriterionOperator, PublicCriterion } from './types'

export type RequirementState = 'met' | 'unmet' | 'unanswered'

export interface RequirementPreview {
  id: string
  fieldKey: string
  mode: PublicCriterion['mode']
  state: RequirementState
}

function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return null
}

function asTime(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function equals(answer: unknown, expected: unknown): boolean | null {
  if (Array.isArray(answer) || Array.isArray(expected)) return null

  if (typeof answer === 'boolean' || typeof expected === 'boolean') {
    const left = asBoolean(answer)
    const right = asBoolean(expected)
    return left === null || right === null ? null : left === right
  }

  const left = asNumber(answer)
  const right = asNumber(expected)
  if (left !== null && right !== null) return left === right

  return String(answer) === String(expected)
}

function compare(
  answer: unknown,
  expected: unknown,
  satisfied: (order: number) => boolean,
): boolean | null {
  const left = asNumber(answer)
  const right = asNumber(expected)
  if (left !== null && right !== null) return satisfied(Math.sign(left - right))

  const leftTime = asTime(answer)
  const rightTime = asTime(expected)
  if (leftTime === null || rightTime === null) return null

  return satisfied(Math.sign(leftTime - rightTime))
}

function includes(answer: unknown, expected: unknown, any: boolean): boolean | null {
  if (!Array.isArray(answer) || !Array.isArray(expected)) return null
  if (expected.length === 0) return !any

  const found = (candidate: unknown) => answer.some((held) => equals(held, candidate) === true)

  return any ? expected.some(found) : expected.every(found)
}

function membership(answer: unknown, expected: unknown): boolean | null {
  if (!Array.isArray(expected)) return null
  return expected.some((candidate) => equals(answer, candidate) === true)
}

function negate(passed: boolean | null): boolean | null {
  return passed === null ? null : !passed
}

function apply(operator: CriterionOperator, answer: unknown, expected: unknown): boolean | null {
  switch (operator) {
    case 'eq':
      return equals(answer, expected)
    case 'neq':
      return negate(equals(answer, expected))
    case 'gt':
      return compare(answer, expected, (order) => order > 0)
    case 'gte':
      return compare(answer, expected, (order) => order >= 0)
    case 'lt':
      return compare(answer, expected, (order) => order < 0)
    case 'lte':
      return compare(answer, expected, (order) => order <= 0)
    case 'in':
      return membership(answer, expected)
    case 'not_in':
      return negate(membership(answer, expected))
    case 'includes_any':
      return includes(answer, expected, true)
    case 'includes_all':
      return includes(answer, expected, false)
    case 'exists':
      return true
  }
}

export function previewRequirements(
  criteria: PublicCriterion[],
  answers: Record<string, AnswerValue>,
): RequirementPreview[] {
  return criteria.map((rule) => {
    const answer = answers[rule.field_key]
    const id = `${rule.field_key}:${rule.operator}:${JSON.stringify(rule.value)}`

    if (!isAnswered(answer)) {
      return {
        id,
        fieldKey: rule.field_key,
        mode: rule.mode,
        state: rule.operator === 'exists' ? 'unmet' : 'unanswered',
      }
    }

    const passed = apply(rule.operator, answer, rule.value)

    return {
      id,
      fieldKey: rule.field_key,
      mode: rule.mode,
      state: passed === null ? 'unanswered' : passed ? 'met' : 'unmet',
    }
  })
}
