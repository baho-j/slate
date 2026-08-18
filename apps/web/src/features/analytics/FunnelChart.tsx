import { formatPercent } from './format'
import type { FunnelStage } from './types'

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(1, ...stages.map((stage) => stage.count))

  return (
    <ul className="space-y-3">
      {stages.map((stage) => (
        <li key={stage.stage_id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-n-800">{stage.name}</span>
            <span className="text-n-500">
              {stage.count}
              {stage.conversion_rate !== null && (
                <span className="ml-2 text-xs text-n-400">
                  {formatPercent(stage.conversion_rate)} from previous
                </span>
              )}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-n-100">
            <div
              className={
                stage.is_terminal ? 'h-full rounded-full bg-n-400' : 'h-full rounded-full bg-accent'
              }
              style={{ width: `${(stage.count / max) * 100}%` }}
              aria-hidden
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
