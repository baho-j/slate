import { z } from 'zod'
import { CV_CONSTRAINT, validateFile } from '@/lib/file-validation'

export const applyFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Your name is required').max(255),
  email: z.string().trim().min(1, 'Your email is required').email('Enter a valid email').max(255),
  cover_note: z
    .string()
    .trim()
    .max(5000, 'Must be 5000 characters or fewer')
    .transform((value) => (value === '' ? null : value))
    .nullable(),
  cv: z.instanceof(File, { message: 'Attach your CV' }).superRefine((file, ctx) => {
    const problem = validateFile(file, CV_CONSTRAINT)
    if (problem) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem })
    }
  }),
})

export type ApplyFormValues = z.input<typeof applyFormSchema>
