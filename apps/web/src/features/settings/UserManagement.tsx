import { Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast-context'
import { useMe } from '@/features/auth/hooks'
import { useDeleteUser, useUpdateUser, useUsers } from './hooks'
import { InviteUserDialog } from './InviteUserDialog'
import type { ManagedRole, ManagedUser } from './types'

const roleLabels: Record<ManagedRole, string> = {
  hr_manager: 'HR manager',
  recruiter: 'Recruiter',
  interviewer: 'Interviewer',
  candidate: 'Candidate',
}

const assignableRoles = Object.entries(roleLabels) as [ManagedRole, string][]

export function UserManagement() {
  const { data: users, isLoading, isError } = useUsers()
  const [inviting, setInviting] = useState(false)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-n-700">Team</h2>
          <p className="text-sm text-n-500">Invite colleagues and manage their roles.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setInviting(true)}>
          <UserPlus className="size-4" />
          Invite
        </Button>
      </div>

      {isError && (
        <p
          role="alert"
          className="rounded-md border border-n-200 p-6 text-center text-sm text-danger"
        >
          We couldn't load your team.
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-14 w-full" />
          ))}
        </div>
      )}

      {users && users.length > 0 && (
        <ul className="divide-y divide-n-200 rounded-md border border-n-200 bg-white">
          {users.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
        </ul>
      )}

      <InviteUserDialog open={inviting} onOpenChange={setInviting} />
    </section>
  )
}

function UserRow({ user }: { user: ManagedUser }) {
  const { toast } = useToast()
  const { data: me } = useMe()
  const update = useUpdateUser()
  const remove = useDeleteUser()

  const isSelf = me?.id === user.id
  const role = user.role as ManagedRole

  function changeRole(next: string) {
    if (next === user.role) return
    update.mutate(
      { id: user.id, input: { role: next as ManagedRole } },
      {
        onSuccess: () => toast('Role updated.', 'success'),
        onError: (failure) => toast(readableError(failure.response?.data), 'danger'),
      },
    )
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-n-900">
          {user.name}
          {isSelf && <span className="ml-2 text-xs text-n-400">You</span>}
        </p>
        <p className="text-sm text-n-500">{user.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={roleLabels[role] ? role : undefined} onValueChange={changeRole}>
          <SelectTrigger className="w-40" aria-label={`Role for ${user.name}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assignableRoles.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove ${user.name}`}
          disabled={remove.isPending}
          onClick={() =>
            remove.mutate(user.id, {
              onSuccess: () => toast('User removed.', 'success'),
              onError: (failure) => toast(readableError(failure.response?.data), 'danger'),
            })
          }
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}

function readableError(body: unknown): string {
  const payload = body as { message?: string; errors?: Record<string, string[]> } | undefined
  const first = payload?.errors ? Object.values(payload.errors)[0]?.[0] : undefined

  return first ?? payload?.message ?? 'Could not update the user.'
}
