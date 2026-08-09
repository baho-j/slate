import { describe, expect, it } from 'vitest'
import { operatorSupports, operatorsForType } from './constants'
import { keyFromLabel, move, parseValue, toCriterionInputs, toFieldInputs } from './drafts'
import type { CriterionDraft, FieldDraft } from './types'

function field(overrides: Partial<FieldDraft> = {}): FieldDraft {
  return {
    uid: 'f1',
    label: 'Years',
    key: 'years',
    type: 'number',
    required: false,
    options: [],
    ...overrides,
  }
}

function criterion(overrides: Partial<CriterionDraft> = {}): CriterionDraft {
  return {
    uid: 'c1',
    field_key: 'years',
    operator: 'gte',
    value: '3',
    mode: 'knockout',
    weight: null,
    ...overrides,
  }
}

describe('keyFromLabel', () => {
  it.each([
    ['Years of experience', 'years_of_experience'],
    ['Work permit?', 'work_permit'],
    ['  Portfolio URL  ', 'portfolio_url'],
    ['C# skills', 'c_skills'],
    ['2nd language', 'f2nd_language'],
  ])('turns %j into %j', (label, expected) => {
    expect(keyFromLabel(label)).toBe(expected)
  })
})

describe('move', () => {
  it('reorders within bounds', () => {
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(move(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('refuses to move past either end', () => {
    const items = ['a', 'b']
    expect(move(items, 0, -1)).toBe(items)
    expect(move(items, 1, 2)).toBe(items)
  })
})

describe('operator compatibility', () => {
  it('offers ordered comparisons only on numbers and dates', () => {
    expect(operatorsForType('number')).toContain('gte')
    expect(operatorsForType('date')).toContain('gte')
    expect(operatorsForType('boolean')).not.toContain('gte')
    expect(operatorsForType('multiselect')).not.toContain('gte')
  })

  it('offers list membership only on multiselect', () => {
    expect(operatorsForType('multiselect')).toContain('includes_all')
    expect(operatorsForType('select')).not.toContain('includes_all')
  })

  it('offers exists on every type', () => {
    for (const type of ['text', 'number', 'boolean', 'select', 'multiselect', 'file', 'date']) {
      expect(operatorSupports('exists', type as FieldDraft['type'])).toBe(true)
    }
  })
})

describe('parseValue', () => {
  it.each<[CriterionDraft, unknown]>([
    [criterion({ operator: 'gte', value: '3' }), 3],
    [criterion({ operator: 'eq', value: 'true' }), true],
    [criterion({ operator: 'eq', value: 'false' }), false],
    [criterion({ operator: 'eq', value: 'bsc' }), 'bsc'],
    [criterion({ operator: 'in', value: 'bsc, msc' }), ['bsc', 'msc']],
    [criterion({ operator: 'includes_all', value: 'php,react, ' }), ['php', 'react']],
    [criterion({ operator: 'exists', value: 'ignored' }), null],
  ])('parses %j', (draft, expected) => {
    expect(parseValue(draft)).toEqual(expected)
  })
})

describe('toFieldInputs', () => {
  it('numbers the order from the array position', () => {
    const result = toFieldInputs([field({ key: 'a' }), field({ uid: 'f2', key: 'b' })])

    expect(result.map((input) => [input.key, input.order])).toEqual([
      ['a', 0],
      ['b', 1],
    ])
  })

  it('sends options only for option-bearing types', () => {
    const [plain, choice] = toFieldInputs([
      field({ type: 'number', options: ['stale'] }),
      field({ uid: 'f2', type: 'select', options: ['bsc'] }),
    ])

    expect(plain).not.toHaveProperty('options')
    expect(choice?.options).toEqual(['bsc'])
  })

  it('trims the label and key', () => {
    const [input] = toFieldInputs([field({ label: '  Years  ', key: '  years  ' })])

    expect(input).toMatchObject({ label: 'Years', key: 'years' })
  })
})

describe('toCriterionInputs', () => {
  it('omits weight on knockout rules', () => {
    const [input] = toCriterionInputs([criterion({ mode: 'knockout', weight: 30 })])

    expect(input).not.toHaveProperty('weight')
  })

  it('sends weight on scored rules', () => {
    const [input] = toCriterionInputs([criterion({ mode: 'scored', weight: 30 })])

    expect(input).toMatchObject({ mode: 'scored', weight: 30 })
  })

  it('defaults a scored rule with no weight to 1 rather than sending null', () => {
    const [input] = toCriterionInputs([criterion({ mode: 'scored', weight: null })])

    expect(input?.weight).toBe(1)
  })
})
