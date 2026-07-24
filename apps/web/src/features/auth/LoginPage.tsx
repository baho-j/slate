import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
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
      onSuccess: () => navigate({ to: '/' }),
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
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 p-4 text-neutral-900">
      <div className="w-full max-w-sm space-y-8">
        <header className="space-y-1 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Slate</h1>
          <p className="text-sm text-neutral-500">Sign in to your account</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={credentials.email}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={credentials.password}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <section className="space-y-2 rounded-md border border-neutral-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Demo accounts
          </h2>
          <p className="text-xs text-neutral-500">
            All demo users share the password <code className="font-mono">password</code>.
          </p>
          <ul className="divide-y divide-neutral-100 text-sm">
            {demoAccounts.map((account) => (
              <li key={account.email} className="flex items-center justify-between py-1.5">
                <span className="text-neutral-600">{account.role}</span>
                <button
                  type="button"
                  onClick={() => setCredentials({ email: account.email, password: 'password' })}
                  className="font-mono text-neutral-900 underline-offset-2 hover:underline"
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
