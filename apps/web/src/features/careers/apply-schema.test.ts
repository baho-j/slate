import { describe, expect, it } from 'vitest'
import { applyFormSchema } from './apply-schema'

function base(overrides: Record<string, unknown> = {}) {
  return {
    full_name: 'Cora Candidate',
    email: 'cora@example.com',
    cover_note: '',
    cv: new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' }),
    ...overrides,
  }
}

describe('applyFormSchema', () => {
  it('accepts a valid application and nulls an empty cover note', () => {
    const result = applyFormSchema.safeParse(base())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cover_note).toBeNull()
    }
  })

  it('rejects an invalid email', () => {
    const result = applyFormSchema.safeParse(base({ email: 'not-an-email' }))
    expect(result.success).toBe(false)
  })

  it('rejects a non-pdf CV type', () => {
    const wordDoc = new File(['x'], 'cv.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    expect(applyFormSchema.safeParse(base({ cv: wordDoc })).success).toBe(false)
    expect(
      applyFormSchema.safeParse(base({ cv: new File(['x'], 'photo.png', { type: 'image/png' }) }))
        .success,
    ).toBe(false)
  })

  it('rejects an oversize CV', () => {
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    })
    const result = applyFormSchema.safeParse(base({ cv: big }))
    expect(result.success).toBe(false)
  })
})
