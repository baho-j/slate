import { Menu } from 'lucide-react'
import { useMe } from '@/features/auth/hooks'
import { UserMenu } from './UserMenu'

export function TopBar({ onOpenNav }: { onOpenNav: () => void }) {
  const { data: user } = useMe()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-n-200 bg-white px-4">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="rounded-sm p-2 text-n-700 transition-colors hover:bg-n-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <span className="truncate text-sm font-semibold text-n-900">
        {user?.organization?.name ?? 'Slate'}
      </span>

      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  )
}
