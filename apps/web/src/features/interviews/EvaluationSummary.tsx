import { Star } from 'lucide-react'
import type { Evaluation, Recommendation } from './types'

const recommendationLabels: Record<Recommendation, string> = {
  strong_yes: 'Strong yes',
  yes: 'Yes',
  no: 'No',
  strong_no: 'Strong no',
}

export function EvaluationSummary({ evaluation }: { evaluation: Evaluation }) {
  return (
    <div className="mt-3 rounded-md border border-n-200 bg-n-50 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-n-900">
          <Star className="size-4 fill-warning text-warning" aria-hidden />
          {evaluation.rating} / 5
        </span>
        <span className="text-sm text-n-700">
          {recommendationLabels[evaluation.recommendation]}
        </span>
        {evaluation.author && (
          <span className="text-sm text-n-500">by {evaluation.author.name}</span>
        )}
      </div>
      {evaluation.comments && (
        <p className="mt-2 whitespace-pre-line text-sm text-n-700">{evaluation.comments}</p>
      )}
    </div>
  )
}
