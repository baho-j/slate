import { describe, expect, it } from 'vitest'
import { fromLocalInputValue, isPast, toLocalInputValue } from './datetime'

describe('interview datetime helpers', () => {
  it('round-trips a local input value through the API format', () => {
    const iso = fromLocalInputValue('2026-09-01T09:30')

    expect(toLocalInputValue(iso)).toBe('2026-09-01T09:30')
  })

  it('renders an instant as local wall-clock time, not UTC', () => {
    const iso = '2026-09-01T09:30:00+00:00'
    const local = toLocalInputValue(iso)
    const expected = new Date(iso)

    expect(local).toBe(
      `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(
        expected.getDate(),
      ).padStart(2, '0')}T${String(expected.getHours()).padStart(2, '0')}:${String(
        expected.getMinutes(),
      ).padStart(2, '0')}`,
    )
  })

  it('recognises a past instant', () => {
    expect(isPast('2020-01-01T00:00:00+00:00')).toBe(true)
    expect(isPast(new Date(Date.now() + 60_000).toISOString())).toBe(false)
  })
})
