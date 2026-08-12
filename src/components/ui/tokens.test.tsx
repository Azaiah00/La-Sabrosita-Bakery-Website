/**
 * Guards the re-tokenization pass.
 *
 * `npx shadcn@latest add <name> --overwrite` silently restores stock
 * shadcn markup, which would put the terracotta back on dropdown hovers
 * and drop tap targets to 36px. These assertions fail loudly when that
 * happens, so the next person to pull a primitive in knows to redo the
 * pass rather than shipping DESIGN.md violations.
 *
 * See src/components/ui/README.md and DESIGN.md §2.3, §4, §6.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'

import { Button } from './button'
import { Badge } from './badge'
import { Card } from './card'
import { Input } from './input'
import { Skeleton } from './skeleton'
import { Table, TableBody, TableCell, TableRow } from './table'

const DIR = join(process.cwd(), 'src/components/ui')
const sources = readdirSync(DIR)
  .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
  .map((f) => [f, readFileSync(join(DIR, f), 'utf8')] as const)

describe('every primitive, as source', () => {
  it('names no colour of its own', () => {
    const offenders = sources.filter(([, src]) =>
      /#[0-9A-Fa-f]{6}\b|oklch\(|hsl\(|rgb\(/.test(src),
    )
    expect(offenders.map(([f]) => f)).toEqual([])
  })

  it('uses no default Tailwind palette colour', () => {
    const palette =
      /\b(slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/
    const offenders = sources.filter(([, src]) => palette.test(src))
    expect(offenders.map(([f]) => f)).toEqual([])
  })

  it('never spends the accent on a hover or selected surface', () => {
    // DESIGN.md §2.3: one accent, and its list does not include
    // "whatever the pointer is currently over".
    const offenders = sources.filter(([, src]) =>
      /\bbg-accent[\s"'/]|\btext-accent-foreground\b/.test(src),
    )
    expect(offenders.map(([f]) => f)).toEqual([])
  })

  it('animates neither box-shadow nor everything', () => {
    // DESIGN.md §7: transform and opacity only.
    const offenders = sources.filter(([, src]) =>
      /\btransition-all\b|\btransition-shadow\b|transition-\[color,box-shadow\]/.test(src),
    )
    expect(offenders.map(([f]) => f)).toEqual([])
  })

  it('hardcodes no user-facing English', () => {
    const offenders = sources.filter(([, src]) =>
      /sr-only">[A-Z][a-z]+</.test(src),
    )
    expect(offenders.map(([f]) => f)).toEqual([])
  })
})

describe('rendered output', () => {
  const html = (node: React.ReactElement) => renderToStaticMarkup(node)

  it('renders a pill button with a 48px floor', () => {
    const out = html(<Button>Pedir un pastel</Button>)
    expect(out).toContain('rounded-full')
    expect(out).toContain('min-h-12')
    expect(out).toContain('bg-primary')
  })

  it('gives every button size the same 48px floor', () => {
    for (const size of ['xs', 'sm', 'default', 'lg'] as const) {
      expect(html(<Button size={size}>Pedir</Button>)).toContain('min-h-12')
    }
    for (const size of ['icon', 'icon-xs', 'icon-sm'] as const) {
      expect(html(<Button size={size} aria-label="x" />)).toContain('size-12')
    }
  })

  it('keeps white off the destructive fill', () => {
    // #FFFFFF on the dark-theme danger colour is 2.6:1 — a hard fail.
    const out = html(<Button variant="destructive">Cancelar</Button>)
    expect(out).toContain('text-destructive-foreground')
    expect(out).not.toContain('text-white')
  })

  it('hovers on a surface, not on the accent', () => {
    for (const variant of ['outline', 'secondary', 'ghost'] as const) {
      const out = html(<Button variant={variant}>Ver</Button>)
      expect(out).toContain('hover:bg-surface-sunk')
    }
  })

  it('renders badges at the chip radius, not as pills', () => {
    // DESIGN.md §4 assigns 8px to "chips, badges, inputs".
    const out = html(<Badge>Se acabó por hoy</Badge>)
    expect(out).toContain('rounded-sm')
    expect(out).not.toContain('rounded-full')
  })

  it('renders a card at --radius-lg with a hairline', () => {
    const out = html(<Card />)
    expect(out).toContain('rounded-lg')
    expect(out).toContain('border-line')
    expect(out).toContain('shadow-card')
  })

  it('renders inputs at 48px and 16px type', () => {
    const out = html(<Input />)
    expect(out).toContain('min-h-12')
    // Below 16px iOS Safari zooms the viewport on focus.
    expect(out).toContain('text-base')
  })

  it('renders 44px table rows with tabular numerals', () => {
    const out = html(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>1.75</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(out).toContain('h-11')
    expect(out).toContain('tabular-nums')
  })

  it('renders a skeleton on a surface token', () => {
    expect(html(<Skeleton />)).toContain('bg-surface-sunk')
  })
})
