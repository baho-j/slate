import { describe, expect, it } from 'vitest'
import { acceptAttribute, CV_CONSTRAINT, LOGO_CONSTRAINT, validateFile } from './file-validation'

function file(type: string, bytes: number): File {
  const blob = new Blob([new Uint8Array(bytes)], { type })
  return new File([blob], 'test', { type })
}

describe('validateFile', () => {
  it('accepts a valid PDF within the CV limit', () => {
    expect(validateFile(file('application/pdf', 1024), CV_CONSTRAINT)).toBeNull()
  })

  it('rejects a wrong type', () => {
    expect(validateFile(file('image/png', 1024), CV_CONSTRAINT)).toBe('The file must be a PDF.')
  })

  it('rejects a file over the size limit', () => {
    const tooBig = file('application/pdf', 5 * 1024 * 1024 + 1)
    expect(validateFile(tooBig, CV_CONSTRAINT)).toBe('The file must be 5MB or smaller.')
  })

  it('rejects an empty file', () => {
    expect(validateFile(file('application/pdf', 0), CV_CONSTRAINT)).toBe(
      'The file appears to be empty.',
    )
  })

  it('accepts each logo image type', () => {
    for (const type of LOGO_CONSTRAINT.accept) {
      expect(validateFile(file(type, 1024), LOGO_CONSTRAINT)).toBeNull()
    }
  })

  it('rejects a logo over 2MB', () => {
    expect(validateFile(file('image/png', 2 * 1024 * 1024 + 1), LOGO_CONSTRAINT)).toBe(
      'The file must be 2MB or smaller.',
    )
  })
})

describe('acceptAttribute', () => {
  it('joins the accepted types for the input attribute', () => {
    expect(acceptAttribute(CV_CONSTRAINT)).toBe('application/pdf')
    expect(acceptAttribute(LOGO_CONSTRAINT)).toBe('image/png,image/jpeg,image/svg+xml,image/webp')
  })
})
