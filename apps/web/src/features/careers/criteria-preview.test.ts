import { describe, expect, it } from 'vitest'
import { previewRequirements } from './criteria-preview'
import type { AnswerValue, CriterionOperator, PublicCriterion } from './types'

function preview(
  operator: CriterionOperator,
  value: unknown,
  answer: AnswerValue | undefined,
): string {
  const criteria: PublicCriterion[] = [{ field_key: 'f', operator, value, mode: 'knockout' }]
  const answers: Record<string, AnswerValue> = answer === undefined ? {} : { f: answer }
  const [result] = previewRequirements(criteria, answers)

  if (result === undefined) throw new Error('expected one requirement')

  return result.state
}

describe('previewRequirements', () => {
  it.each<[CriterionOperator, unknown, AnswerValue, string]>([
    ['eq', 3, 3, 'met'],
    ['eq', 3, 4, 'unmet'],
    ['eq', 3, '3', 'met'],
    ['eq', true, true, 'met'],
    ['neq', 3, 4, 'met'],
    ['gt', 3, 5, 'met'],
    ['gt', 3, 3, 'unmet'],
    ['gte', 3, 3, 'met'],
    ['lt', 3, 2, 'met'],
    ['lte', 3, 3, 'met'],
    ['gte', '2020-01-01', '2024-06-01', 'met'],
    ['in', ['bsc', 'msc'], 'msc', 'met'],
    ['in', ['bsc'], 'phd', 'unmet'],
    ['not_in', ['bsc'], 'phd', 'met'],
    ['includes_any', ['php', 'go'], ['php'], 'met'],
    ['includes_any', ['go'], ['php'], 'unmet'],
    ['includes_all', ['php', 'react'], ['php', 'react', 'go'], 'met'],
    ['includes_all', ['php', 'react'], ['php'], 'unmet'],
  ])('%s against %j with answer %j is %s', (operator, value, answer, expected) => {
    expect(preview(operator, value, answer)).toBe(expected)
  })

  it('reports an unanswered field rather than guessing', () => {
    expect(preview('gte', 3, undefined)).toBe('unanswered')
    expect(preview('gte', 3, null)).toBe('unanswered')
    expect(preview('gte', 3, '')).toBe('unanswered')
    expect(preview('includes_all', ['php'], [])).toBe('unanswered')
  })

  it('reports an uncomparable answer as unanswered', () => {
    expect(preview('gt', 3, 'many')).toBe('unanswered')
  })

  it('treats a missing answer as unmet only for exists', () => {
    expect(preview('exists', null, undefined)).toBe('unmet')
    expect(preview('exists', null, 'anything')).toBe('met')
  })

  it('keeps one entry per rule, in order', () => {
    const criteria: PublicCriterion[] = [
      { field_key: 'a', operator: 'gte', value: 3, mode: 'knockout' },
      { field_key: 'b', operator: 'eq', value: true, mode: 'scored' },
    ]

    const result = previewRequirements(criteria, { a: 5 })

    expect(result.map((entry) => [entry.fieldKey, entry.state])).toEqual([
      ['a', 'met'],
      ['b', 'unanswered'],
    ])
  })
})
