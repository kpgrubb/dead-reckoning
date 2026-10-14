/**
 * Private presentational helpers shared by the Act IX instruments. Not part of any public index;
 * every Act IX instrument may import from here, and nothing outside Act IX should.
 *
 *   stackStyle / gridStyle   the two layouts every panel in this Act uses
 *   Subhead                  a mono small-caps heading inside a panel
 *   Note                     a caption line under a chart or control row
 *   KeyTable                 a small mono table (slope runs, interval endpoints, case-file rows)
 *   ReadoutGrid              a responsive row of <Readout>s that wraps instead of overflowing
 *   ConditionList            the conditions block an InferenceResult already carries
 *   OutputTableView          a regression `OutputTable` laid out the way AP computer output is
 *
 * Numbers are formatted here and computed by the caller from `@/lib/stats` or `./data`.
 */
import type { CSSProperties, ReactNode } from 'react'
import { fmt, fmtInt, fmtP, fmtPct, type Condition } from '@/lib/stats'
import type { OutputTable } from './data'

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

/** The conditions block every `InferenceResult` already carries, rendered as a checklist. */
export function ConditionList({ conditions }: { conditions: readonly Condition[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-1)' }}>
      {conditions.map((c, i) => (
        // Slope conditions repeat names across fits; index keys, never the name.
        <li key={i} style={{ display: 'flex', gap: 'var(--dr-sp-2)', alignItems: 'baseline', fontSize: 'var(--dr-fs-xs)' }}>
          <span aria-hidden style={{ fontFamily: 'var(--dr-font-mono)', color: c.met ? 'var(--dr-phosphor)' : 'var(--dr-alert)' }}>
            {c.met ? '✓' : '✗'}
          </span>
          <span>
            <strong style={{ color: 'var(--dr-fg-1)' }}>{c.name}</strong>
            {c.assumed ? ' (stated, not checked)' : ''} — <span style={{ color: 'var(--dr-fg-2)' }}>{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
// Computer output
// ────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Decimals for a column of an output table. AP output prints a column to a fixed width, and this
 * Act carries two regressions three orders of magnitude apart (1.17 t/t and 0.00076 per km/s), so
 * the width is read off the smallest magnitude in the column rather than fixed at four.
 */
export function columnDigits(values: readonly number[], min = 2, max = 8): number {
  const magnitudes = values.map((v) => Math.abs(v)).filter((v) => v > 0 && Number.isFinite(v))
  if (magnitudes.length === 0) return min
  const smallest = Math.min(...magnitudes)
  return Math.max(min, Math.min(max, 3 - Math.floor(Math.log10(smallest))))
}

const cellStyle = (hot: boolean): CSSProperties => ({
  whiteSpace: 'nowrap',
  color: hot ? 'var(--dr-amber)' : undefined,
  fontWeight: hot ? 600 : undefined,
})

export interface OutputTableViewProps {
  table: OutputTable
  /** Which column (or the `s` line) is drawn in the caution colour. */
  highlight?: 'se' | 'coef' | 't' | 'p' | 's' | null
}

/**
 * The block a statistics package prints for a simple linear regression, as real table markup:
 * a Coef / SE Coef / T / P row per predictor, then the s, R-Sq and degrees-of-freedom line.
 *
 * R-Sq(adj) = 1 − (1 − R²)(n − 1)/(n − 2) is assembled here from the library's own r² and n for the
 * same reason act-7's OutputReader assembles the pooled block: the course never uses it, so
 * `@/lib/stats` does not provide it, and it is printed only because real output prints it.
 */
export function OutputTableView({ table, highlight = null }: OutputTableViewProps) {
  const coefDigits = columnDigits(table.rows.map((r) => r.coef))
  const seDigits = columnDigits(table.rows.map((r) => r.se))
  const adjR2 = 1 - ((1 - table.r2) * (table.n - 1)) / (table.n - 2)

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)', background: 'var(--dr-chart-surface)' }}>
      <table className="dr-table" aria-label={`Regression of ${table.response} on ${table.predictor}, as computer output`}>
        <caption className="dr-table__caption">
          The regression equation is {table.response} = {fmt(table.rows[0].coef, coefDigits)} + {fmt(table.rows[1].coef, coefDigits)} × {table.predictor}
        </caption>
        <thead>
          <tr>
            <th scope="col">Predictor</th>
            <th scope="col">Coef</th>
            <th scope="col">SE Coef</th>
            <th scope="col">T</th>
            <th scope="col">P</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              <th scope="row" style={{ textAlign: 'left', fontWeight: 500 }}>
                {row.term}
              </th>
              <td style={cellStyle(highlight === 'coef' && i === 1)}>{fmt(row.coef, coefDigits)}</td>
              <td style={cellStyle(highlight === 'se' && i === 1)}>{fmt(row.se, seDigits)}</td>
              <td style={cellStyle(highlight === 't' && i === 1)}>{fmt(row.t, 2)}</td>
              <td style={cellStyle(highlight === 'p' && i === 1)}>{fmtP(row.p)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} style={{ fontFamily: 'var(--dr-font-mono)', fontSize: 'var(--dr-fs-2xs)', color: 'var(--dr-fg-2)', whiteSpace: 'normal' }}>
              <span style={cellStyle(highlight === 's')}>s = {fmt(table.s, columnDigits([table.s]))}</span>
              {'   '}R-Sq = {fmtPct(table.r2, 1)}
              {'   '}R-Sq(adj) = {fmtPct(adjR2, 1)}
              {'   '}n = {fmtInt(table.n)}
              {'   '}df = n − 2 = {fmtInt(table.df)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
