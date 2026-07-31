import { z } from 'zod'

const MAX_CV_BYTES = 5 * 1024 * 1024

export const applyFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Your name is required').max(255),
  email: z.string().trim().min(1, 'Your email is required').email('Enter a valid email').max(255),
  cover_note: z
    .string()
    .trim()
    .max(5000, 'Must be 5000 characters or fewer')
    .transform((value) => (value === '' ? null : value))
    .nullable(),
  cv: z
    .instanceof(File, { message: 'Attach your CV' })
    .refine((file) => file.size > 0 && file.size <= MAX_CV_BYTES, 'CV must be 5MB or smaller')
    .refine((file) => file.type === 'application/pdf', 'CV must be a PDF'),
})

export type ApplyFormValues = z.input<typeof applyFormSchema>
