/**
 * Private presentational helpers shared by the Act VI instruments. Not part of any public index;
 * every Act VI instrument may import from here, and nothing outside Act VI should.
 *
 *   stackStyle / gridStyle   the two layouts every panel in this Act uses
 *   Subhead                  a mono small-caps heading inside a panel
 *   Note                     a caption line under a chart or control row
 *   KeyTable                 a small mono table (two-way tables, claim extracts, summary rows)
 *   ReadoutGrid              a responsive row of <Readout>s that wraps instead of overflowing
 *
 * Numbers are formatted here and computed by the caller from `@/lib/stats`.
 */
import type { CSSProperties, ReactNode } from 'react'

export const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-3)' }
export const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--dr-sp-4)' }

const subheadStyle: CSSProperties = {
  margin: 'var(--dr-sp-3) 0 var(--dr-sp-2)',
  fontFamily: 'var(--dr-font-mono)',
  fontSize: 'var(--dr-fs-2xs)',
  letterSpacing: 'var(--dr-track-label)',
  textTransform: 'uppercase',
  color: 'var(--dr-fg-2)',
}

export function Subhead({ children }: { children: ReactNode }) {
  return <h4 style={subheadStyle}>{children}</h4>
}

export function Note({ children, tone = 'muted', live = false }: { children: ReactNode; tone?: 'muted' | 'alert' | 'ok' | 'warn'; live?: boolean }) {
  const color = tone === 'alert' ? 'var(--dr-alert)' : tone === 'ok' ? 'var(--dr-phosphor)' : tone === 'warn' ? 'var(--dr-amber)' : 'var(--dr-fg-2)'
  return (
    <p className="dr-chart__caption" style={{ color }} aria-live={live ? 'polite' : undefined}>
      {children}
    </p>
  )
}

export interface KeyTableProps {
  columns: readonly ReactNode[]
  rows: readonly (readonly ReactNode[])[]
  caption?: string
  ariaLabel?: string
  /** Index of a row rendered emphasised (a TOTAL row, or the row the beat is about). */
  emphasisRow?: number
}

export function KeyTable({ columns, rows, caption, ariaLabel, emphasisRow }: KeyTableProps) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)' }}>
      <table className="dr-table" aria-label={ariaLabel}>
        {caption && <caption className="dr-table__caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={i === emphasisRow ? { color: 'var(--dr-fg-0)', fontWeight: 600 } : undefined}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReadoutGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--dr-sp-4)', alignItems: 'flex-end' }}>{children}</div>
}
