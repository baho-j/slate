import { formatHours } from './format'
import type { TimeInStage } from './types'

export function TimeInStageChart({ stages }: { stages: TimeInStage[] }) {
  const max = Math.max(1, ...stages.map((stage) => stage.avg_hours ?? 0))

  return (
    <ul className="space-y-3">
      {stages.map((stage) => (
        <li key={stage.stage_id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-n-800">{stage.name}</span>
            <span className="text-n-500">
              {formatHours(stage.avg_hours)} avg
              {stage.median_hours !== null && (
                <span className="ml-2 text-xs text-n-400">
                  {formatHours(stage.median_hours)} median
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-n-100">
            <div
              className="h-full rounded-full bg-accent-subtle"
              style={{ width: `${((stage.avg_hours ?? 0) / max) * 100}%` }}
              aria-hidden
            />
          </div>
          {stage.samples === 0 && (
            <p className="mt-0.5 text-xs text-n-400">No completed transitions yet.</p>
          )}
        </li>
      ))}
    </ul>
  )
}
