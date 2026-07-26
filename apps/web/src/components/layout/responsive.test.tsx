import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderInApp } from '@/tests/render'
import { AppShell } from './AppShell'

/**
 * The 360/768/1280 pass is a manual check; jsdom has no layout engine. These lock the
 * classes that drive it so a refactor cannot silently drop the breakpoint behaviour.
 */
describe('AppShell responsive contract', () => {
  it('hides the sidebar below md and shows it from md up', async () => {
    await renderInApp(
      <AppShell>
        <p>Body</p>
      </AppShell>,
    )

    const sidebar = screen.getByRole('navigation', { name: 'Main' }).parentElement
    expect(sidebar).toHaveClass('hidden', 'md:block')
  })

  it('shows the drawer trigger only below md', async () => {
    await renderInApp(
      <AppShell>
        <p>Body</p>
      </AppShell>,
    )

    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveClass('md:hidden')
  })

  it('lets the content column shrink so wide children scroll instead of overflowing', async () => {
    await renderInApp(
      <AppShell>
        <p>Body</p>
      </AppShell>,
    )

    const main = screen.getByRole('main')
    expect(main).toHaveClass('min-w-0')
    expect(main.parentElement).toHaveClass('min-w-0')
  })
})
