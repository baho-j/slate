import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FrameGuard } from './FrameGuard'

function setFramed(framed: boolean) {
  // window.top === window means top-level; a different object means framed.
  Object.defineProperty(window, 'top', {
    configurable: true,
    get: () => (framed ? ({} as Window) : window),
  })
}

afterEach(() => {
  Object.defineProperty(window, 'top', { configurable: true, get: () => window })
})

describe('FrameGuard', () => {
  it('renders its children at the top level', () => {
    setFramed(false)
    render(
      <FrameGuard>
        <p>App content</p>
      </FrameGuard>,
    )

    expect(screen.getByText('App content')).toBeInTheDocument()
    expect(screen.queryByText("Slate can't be embedded")).not.toBeInTheDocument()
  })

  it('refuses to render its children inside a frame', () => {
    setFramed(true)
    render(
      <FrameGuard>
        <p>App content</p>
      </FrameGuard>,
    )

    expect(screen.queryByText('App content')).not.toBeInTheDocument()
    expect(screen.getByText("Slate can't be embedded")).toBeInTheDocument()
  })
})
