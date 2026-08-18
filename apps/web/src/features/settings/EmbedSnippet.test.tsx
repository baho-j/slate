import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmbedSnippet } from './EmbedSnippet'

describe('EmbedSnippet', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('builds an iframe snippet pointing at the org embed route', () => {
    render(<EmbedSnippet orgSlug="acme" orgName="Acme Inc." />)

    const snippet = screen.getByText(/<iframe/).textContent ?? ''
    expect(snippet).toContain(`${window.location.origin}/embed/o/acme`)
    expect(snippet).toContain('title="Careers at Acme Inc."')
  })

  it('copies the snippet to the clipboard', async () => {
    render(<EmbedSnippet orgSlug="acme" orgName="Acme Inc." />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy embed snippet' }))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/embed/o/acme'),
    )
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  it('links to a live preview of the embed', () => {
    render(<EmbedSnippet orgSlug="acme" orgName="Acme Inc." />)

    const preview = screen.getByRole('link', { name: /\/embed\/o\/acme/ })
    expect(preview).toHaveAttribute('href', `${window.location.origin}/embed/o/acme`)
  })
})
