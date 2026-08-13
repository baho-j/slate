import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast-context'
import { useSubmitEvaluation } from './hooks'
import type { Recommendation } from './types'

interface SubmitEvaluationDialogProps {
  interviewId: string
  applicationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const recommendations: { value: Recommendation; label: string }[] = [
  { value: 'strong_yes', label: 'Strong yes' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'strong_no', label: 'Strong no' },
]

const ratings = [1, 2, 3, 4, 5]

export function SubmitEvaluationDialog({
  interviewId,
  applicationId,
  open,
  onOpenChange,
}: SubmitEvaluationDialogProps) {
  const { toast } = useToast()
  const submit = useSubmitEvaluation(interviewId, applicationId)

  const [rating, setRating] = useState('')
  const [recommendation, setRecommendation] = useState<Recommendation | ''>('')
  const [comments, setComments] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!recommendation) {
      setError('Choose a recommendation.')
      return
    }

    submit.mutate(
      {
        rating: Number(rating),
        recommendation,
        comments: comments.trim() || null,
      },
      {
        onSuccess: () => {
          toast('Evaluation submitted.', 'success')
          onOpenChange(false)
        },
        onError: (failure) => setError(readableError(failure.response?.data)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit evaluation</DialogTitle>
          <DialogDescription>
            Your feedback completes this interview and is shared with the hiring team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="rating" className="text-sm font-medium text-n-700">
              Rating
            </label>
            <select
              id="rating"
              required
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="">Select a rating…</option>
              {ratings.map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="recommendation" className="text-sm font-medium text-n-700">
              Recommendation
            </label>
            <select
              id="recommendation"
              required
              value={recommendation}
              onChange={(event) => setRecommendation(event.target.value as Recommendation)}
              className="h-9 w-full rounded-sm border border-n-300 bg-white px-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <option value="">Select a recommendation…</option>
              {recommendations.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="comments" className="text-sm font-medium text-n-700">
              Comments
            </label>
            <textarea
              id="comments"
              rows={4}
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="What stood out, strengths, concerns…"
              className="w-full rounded-sm border border-n-300 bg-white p-3 text-sm text-n-900 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              Submit evaluation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function readableError(body: unknown): string {
  const payload = body as { message?: string; errors?: Record<string, string[]> } | undefined
  const first = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined

  return first ?? payload?.message ?? 'Could not submit the evaluation.'
}
