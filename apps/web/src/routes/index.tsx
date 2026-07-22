import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-neutral-50 text-neutral-900">
      <h1 className="text-4xl font-semibold tracking-tight">Slate</h1>
      <p className="text-neutral-500">Applicant tracking system</p>
    </main>
  )
}
