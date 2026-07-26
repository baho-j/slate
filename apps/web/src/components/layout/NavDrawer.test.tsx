import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderInApp } from '@/tests/render'
import { NavDrawer } from './NavDrawer'

describe('NavDrawer', () => {
  it('renders nothing while closed', async () => {
    await renderInApp(<NavDrawer open={false} onOpenChange={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exposes the nav links once open', async () => {
    await renderInApp(<NavDrawer open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jobs' })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    await renderInApp(<NavDrawer open onOpenChange={onOpenChange} />)

    await user.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes via the close button', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    await renderInApp(<NavDrawer open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'Close navigation' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes when a nav link is followed', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    await renderInApp(<NavDrawer open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('link', { name: 'Candidates' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
