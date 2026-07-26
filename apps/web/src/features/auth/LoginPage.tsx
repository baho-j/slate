import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { homePathFor } from '@/components/layout/nav-items'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLogin } from './hooks'
import type { LoginCredentials } from './types'

const demoAccounts: { role: string; email: string }[] = [
  { role: 'Super Admin', email: 'admin@slate.test' },
  { role: 'HR Manager', email: 'hr@slate.test' },
  { role: 'Recruiter', email: 'recruiter@slate.test' },
  { role: 'Interviewer', email: 'interviewer@slate.test' },
  { role: 'Candidate', email: 'candidate@slate.test' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useLogin()
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutate(credentials, {
      onSuccess: (user) => navigate({ to: homePathFor(user.role) }),
    })
  }

  const status = error?.response?.status
  const errorMessage =
    status === 422 || status === 401
      ? 'Those credentials do not match our records.'
      : error
        ? 'Something went wrong. Please try again.'
        : null

  return (
    <main className="flex min-h-dvh items-center justify-center bg-n-50 p-4">
      <div className="w-full max-w-sm space-y-8">
        <header className="space-y-1 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-n-900">Slate</h1>
          <p className="text-sm text-n-500">Sign in to your account</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-n-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={credentials.email}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-n-700">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={credentials.password}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage}
            </p>
          )}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <section className="space-y-2 rounded-md border border-n-200 bg-white p-4">
          <h2 className="text-xs font-semibold tracking-wide text-n-500 uppercase">
            Demo accounts
          </h2>
          <p className="text-xs text-n-500">
            All demo users share the password <code className="font-mono">password</code>.
          </p>
          <ul className="divide-y divide-n-100 text-sm">
            {demoAccounts.map((account) => (
              <li key={account.email} className="flex items-center justify-between gap-2 py-1.5">
                <span className="text-n-600">{account.role}</span>
                <button
                  type="button"
                  onClick={() => setCredentials({ email: account.email, password: 'password' })}
                  className="truncate rounded-xs font-mono text-n-900 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {account.email}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
