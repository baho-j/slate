import { Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast-context'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { useRemoveFromPool, useTalentPool } from './hooks'
import type { TalentPoolEntry } from './types'

export function TalentPoolPage() {
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const debouncedSearch = useDebouncedValue(search.trim(), 250)

  const params = useMemo(
    () => ({
      ...(cursor ? { cursor } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
      ...(tag ? { tag } : {}),
    }),
    [cursor, debouncedSearch, tag],
  )

  const { data, isLoading, isError } = useTalentPool(params)
  const entries = data?.data ?? []
  const meta = data?.meta

  function onFilterChange<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setCursor(undefined)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-n-900">Talent pool</h1>
        <p className="text-sm text-n-500">Candidates kept on file for future roles.</p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          type="search"
          placeholder="Search by name or email…"
          aria-label="Search talent pool"
          value={search}
          onChange={(event) => onFilterChange(setSearch)(event.target.value)}
          className="sm:max-w-xs"
        />
        <Input
          type="search"
          placeholder="Filter by tag…"
          aria-label="Filter by tag"
          value={tag}
          onChange={(event) => onFilterChange(setTag)(event.target.value.trim())}
          className="sm:max-w-xs"
        />
      </div>

      {isError && (
        <p
          role="alert"
          className="rounded-md border border-n-200 p-10 text-center text-sm text-danger"
        >
          We couldn't load the talent pool. Please try again.
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <div className="rounded-md border border-dashed border-n-200 p-10 text-center">
          <Users className="mx-auto size-6 text-n-400" />
          <p className="mt-2 text-sm text-n-500">
            No one in the pool yet. Add candidates from their application.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <PoolRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      {meta && (meta.prev_cursor || meta.next_cursor) && (
        <nav className="flex items-center justify-end gap-2" aria-label="Pagination">
          <Button
            variant="secondary"
            size="sm"
            disabled={!meta.prev_cursor}
            onClick={() => setCursor(meta.prev_cursor ?? undefined)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!meta.next_cursor}
            onClick={() => setCursor(meta.next_cursor ?? undefined)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  )
}

function PoolRow({ entry }: { entry: TalentPoolEntry }) {
  const { toast } = useToast()
  const remove = useRemoveFromPool()

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-n-200 bg-white p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-n-900">{entry.candidate.full_name}</p>
        <p className="text-sm text-n-500">{entry.candidate.email}</p>
        {entry.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {entry.note && <p className="mt-2 text-sm text-n-700">{entry.note}</p>}
      </div>

      <Button
        variant="ghost"
        size="sm"
        aria-label={`Remove ${entry.candidate.full_name} from the pool`}
        disabled={remove.isPending}
        onClick={() =>
          remove.mutate(entry.id, {
            onSuccess: () => toast('Removed from the talent pool.', 'success'),
            onError: () => toast('Could not remove the entry.', 'danger'),
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  )
}
