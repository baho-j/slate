import { ChevronDown, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout, useMe } from '@/features/auth/hooks'

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_manager: 'HR Manager',
  recruiter: 'Recruiter',
  interviewer: 'Interviewer',
  candidate: 'Candidate',
}

export function UserMenu() {
  const { data: user } = useMe()
  const { mutate: logout, isPending } = useLogout()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-n-700 transition-colors hover:bg-n-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
        <ChevronDown className="size-4 text-n-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-semibold text-n-900">{user.name}</span>
          <span className="block truncate text-n-500">{user.email}</span>
          <span className="mt-1 block text-n-500">{roleLabels[user.role] ?? user.role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()} disabled={isPending}>
          <LogOut className="size-4" />
          {isPending ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
