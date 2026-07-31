import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table, TableBody, TableCell, TableRow } from './table'

/**
 * jsdom has no layout engine, so the 360px table behaviour is verified manually. This locks the
 * scroll wrapper that keeps a wide table from breaking the page — every staff list depends on it.
 */
describe('Table responsive contract', () => {
  it('wraps the table in a horizontal scroll container', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    const table = container.querySelector('table')
    expect(table?.parentElement).toHaveClass('overflow-x-auto')
  })
})
