import { BookmarkPlus, Check } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useMe } from '@/features/auth/hooks'
import { AddToPoolDialog } from './AddToPoolDialog'

interface TalentPoolPanelProps {
  applicationId: string
  candidateId: string
  candidateName: string
  entry: { id: string; tags: string[]; note: string | null } | null
}

export function TalentPoolPanel({
  applicationId,
  candidateId,
  candidateName,
  entry,
}: TalentPoolPanelProps) {
  const { data: user } = useMe()
  const [open, setOpen] = useState(false)

  const canManage = user?.role === 'hr_manager' || user?.role === 'recruiter'
  if (!canManage) return null

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-n-700">Talent pool</h2>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {entry ? <Check className="size-4" /> : <BookmarkPlus className="size-4" />}
          {entry ? 'In pool' : 'Add to pool'}
        </Button>
      </div>

      {entry ? (
        <div className="rounded-md border border-n-200 bg-white p-4">
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {entry.note && <p className="mt-2 text-sm text-n-700">{entry.note}</p>}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-n-200 p-4 text-center text-sm text-n-500">
          Not in the talent pool yet.
        </p>
      )}

      <AddToPoolDialog
        key={entry?.id ?? 'new'}
        applicationId={applicationId}
        candidateId={candidateId}
        candidateName={candidateName}
        initialTags={entry?.tags ?? []}
        initialNote={entry?.note ?? ''}
        isUpdate={entry !== null}
        open={open}
        onOpenChange={setOpen}
      />
    </section>
  )
}
