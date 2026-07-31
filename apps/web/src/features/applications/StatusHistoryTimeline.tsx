import { statusLabels } from './constants'
import type { ApplicationHistoryEntry, ApplicationStatus } from './types'

function label(status: string | null): string {
  if (!status) {
    return '—'
  }
  return statusLabels[status as ApplicationStatus] ?? status
}

export function StatusHistoryTimeline({ entries }: { entries: ApplicationHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-n-500">No history yet.</p>
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />
          <div className="space-y-0.5">
            <p className="text-sm text-n-900">
              {entry.from_status ? (
                <>
                  {label(entry.from_status)} → {label(entry.to_status)}
                </>
              ) : (
                label(entry.to_status)
              )}
              {entry.to_stage && <span className="text-n-500"> · {entry.to_stage}</span>}
            </p>
            {entry.note && <p className="text-sm text-n-500">{entry.note}</p>}
            <p className="text-xs text-n-400">{new Date(entry.created_at).toLocaleString()}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
