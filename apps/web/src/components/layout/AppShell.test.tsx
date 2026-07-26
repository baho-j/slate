import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderInApp } from '@/tests/render'
import { AppShell } from './AppShell'

describe('AppShell', () => {
  it('renders the org name, nav and page content together', async () => {
    await renderInApp(
      <AppShell>
        <p>Page body</p>
      </AppShell>,
    )

    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByText('Page body')).toBeInTheDocument()
  })

  it('opens the drawer from the top bar and closes it on Escape', async () => {
    const user = userEvent.setup()
    await renderInApp(
      <AppShell>
        <p>Page body</p>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
