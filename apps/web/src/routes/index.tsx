import { createFileRoute } from '@tanstack/react-router'
import { useLogout, useMe } from '@/features/auth/hooks'
import { RequireAuth } from '@/features/auth/RequireAuth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  )
}

function Dashboard() {
  const { data: user } = useMe()
  const { mutate: logout, isPending } = useLogout()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-neutral-50 text-neutral-900">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Slate</h1>
        <p className="text-neutral-500">Signed in as {user?.email}</p>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        disabled={isPending}
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-neutral-100 disabled:opacity-60"
      >
        {isPending ? 'Signing out…' : 'Sign out'}
      </button>
    </main>
  )
}
