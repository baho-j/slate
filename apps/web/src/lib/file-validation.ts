export interface FileConstraint {
  /** Accepted MIME types. Mirrors the server's allow-list. */
  accept: string[]
  /** Maximum size in bytes. Mirrors the server's cap. */
  maxBytes: number
  /** Human label for the accepted types, used in error copy. */
  label: string
}

/** CV uploads: a single PDF, 5 MB — matches `config/cv.php`. */
export const CV_CONSTRAINT: FileConstraint = {
  accept: ['application/pdf'],
  maxBytes: 5 * 1024 * 1024,
  label: 'a PDF',
}

/** Org logos: raster or SVG, 2 MB — matches `config/logo.php`. */
export const LOGO_CONSTRAINT: FileConstraint = {
  accept: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
  maxBytes: 2 * 1024 * 1024,
  label: 'a PNG, JPEG, SVG, or WebP image',
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`
}

/**
 * Validate a file against a constraint before it is uploaded. Returns an error
 * message, or null when the file is acceptable. This is a UX guard that spares a
 * wasted presign/SAS round-trip; the server remains the enforcement of record.
 */
export function validateFile(file: File, constraint: FileConstraint): string | null {
  if (!constraint.accept.includes(file.type)) {
    return `The file must be ${constraint.label}.`
  }

  if (file.size <= 0) {
    return 'The file appears to be empty.'
  }

  if (file.size > constraint.maxBytes) {
    return `The file must be ${formatMb(constraint.maxBytes)} or smaller.`
  }

  return null
}

/** The `accept` attribute value for a file input, derived from the constraint. */
export function acceptAttribute(constraint: FileConstraint): string {
  return constraint.accept.join(',')
}
