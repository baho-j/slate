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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast-context'
import { useCreateUser } from './hooks'
import type { ManagedRole } from './types'

const roles: [ManagedRole, string][] = [
  ['recruiter', 'Recruiter'],
  ['interviewer', 'Interviewer'],
  ['hr_manager', 'HR manager'],
  ['candidate', 'Candidate'],
]

export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const create = useCreateUser()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ManagedRole | ''>('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!role) {
      setError('Choose a role.')
      return
    }

    create.mutate(
      { name: name.trim(), email: email.trim(), role },
      {
        onSuccess: () => {
          toast('Invitation sent.', 'success')
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
          <DialogTitle>Invite a colleague</DialogTitle>
          <DialogDescription>
            They join your organisation with the role you choose.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="invite-name" className="text-sm font-medium text-n-700">
              Name
            </label>
            <Input
              id="invite-name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="invite-email" className="text-sm font-medium text-n-700">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="invite-role" className="text-sm font-medium text-n-700">
              Role
            </label>
            <Select value={role} onValueChange={(value) => setRole(value as ManagedRole)}>
              <SelectTrigger id="invite-role" aria-label="Role">
                <SelectValue placeholder="Choose a role…" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={create.isPending}>
              Send invite
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

  return first ?? payload?.message ?? 'Could not send the invitation.'
}
