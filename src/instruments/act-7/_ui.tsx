/**
 * Private presentational helpers shared by the Act VII instruments. Not part of any public index;
 * every Act VII instrument may import from here, and nothing outside Act VII should.
 *
 *   stackStyle / gridStyle   the two layouts every panel in this Act uses
 *   Subhead                  a mono small-caps heading inside a panel
 *   Note                     a caption line under a chart or control row
 *   KeyTable                 a small mono table (refit logs, cold profiles, summary rows)
 *   ReadoutGrid              a responsive row of <Readout>s that wraps instead of overflowing
 *   ConditionList            the three-line conditions block an InferenceResult already carries
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

export interface ConditionRow {
  name: string
  met: boolean
  detail: string
  assumed?: boolean
}

/** The conditions block every `InferenceResult` already carries, rendered as a checklist. */
export function ConditionList({ conditions }: { conditions: readonly ConditionRow[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-1)' }}>
      {conditions.map((c) => (
        <li key={c.name} style={{ display: 'flex', gap: 'var(--dr-sp-2)', alignItems: 'baseline', fontSize: 'var(--dr-fs-xs)' }}>
          <span aria-hidden style={{ fontFamily: 'var(--dr-font-mono)', color: c.met ? 'var(--dr-phosphor)' : 'var(--dr-alert)' }}>{c.met ? '✓' : '✗'}</span>
          <span>
            <strong style={{ color: 'var(--dr-fg-1)' }}>{c.name}</strong>
            {c.assumed ? ' (stated, not checked)' : ''} — <span style={{ color: 'var(--dr-fg-2)' }}>{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
