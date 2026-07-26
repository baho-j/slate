import { Link } from '@tanstack/react-router'
import { useMe } from '@/features/auth/hooks'
import { navItemsFor } from './nav-items'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { data: user } = useMe()

  if (!user) return null

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {navItemsFor(user.role).map(({ label, to, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          activeOptions={{ exact: to === '/' }}
          activeProps={{ 'aria-current': 'page' }}
          className="flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-n-700 transition-colors hover:bg-n-100 hover:text-n-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[current=page]:bg-accent-subtle aria-[current=page]:text-accent"
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
