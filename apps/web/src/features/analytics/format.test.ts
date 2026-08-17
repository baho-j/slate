import { describe, expect, it } from 'vitest'
import { formatHours, formatPercent } from './format'

describe('formatHours', () => {
  it('shows minutes under an hour', () => {
    expect(formatHours(0.5)).toBe('30m')
  })

  it('shows hours up to two days', () => {
    expect(formatHours(6)).toBe('6.0h')
  })

  it('shows days beyond 48 hours', () => {
    expect(formatHours(72)).toBe('3.0d')
  })

  it('renders a dash for null', () => {
    expect(formatHours(null)).toBe('—')
  })
})

describe('formatPercent', () => {
  it('rounds a rate to a percentage', () => {
    expect(formatPercent(0.5)).toBe('50%')
  })

  it('renders a dash for null', () => {
    expect(formatPercent(null)).toBe('—')
  })
})
