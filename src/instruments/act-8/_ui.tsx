/**
 * Private presentational helpers shared by the Act VIII instruments. Not part of any public index;
 * every Act VIII instrument may import from here, and nothing outside Act VIII should.
 *
 *   stackStyle / gridStyle   the two layouts every panel in this Act uses
 *   Subhead                  a mono small-caps heading inside a panel
 *   Note                     a caption line under a chart or control row
 *   KeyTable                 a small mono table (lidar returns, cargo counts, corridor rows)
 *   MatrixTable              a two-way table with an observed / expected / contribution overlay
 *   ReadoutGrid              a responsive row of <Readout>s that wraps instead of overflowing
 *   ConditionList            the conditions block an InferenceResult already carries
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
      {conditions.map((c, i) => (
        // `chiSquareHomogeneity` returns one 10% condition per sample, all identically named.
        <li key={`${c.name}-${i}`} style={{ display: 'flex', gap: 'var(--dr-sp-2)', alignItems: 'baseline', fontSize: 'var(--dr-fs-xs)' }}>
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

export type CellLayer = 'observed' | 'expected' | 'contribution'

export interface MatrixTableProps {
  rowLabels: readonly string[]
  colLabels: readonly string[]
  observed: readonly (readonly number[])[]
  expected?: readonly (readonly number[])[]
  contributions?: readonly (readonly number[])[]
  /** Which number each cell shows. `observed` also prints the expected count underneath if given. */
  layer?: CellLayer
  /** [row, col] of the cell drawn in the alert colour. */
  highlight?: readonly [number, number] | null
  /** Draw row and column totals. */
  totals?: boolean
  caption?: string
  ariaLabel: string
  /** Cells whose expected count is below this read in the caution colour. */
  minExpected?: number
}

const cellNum = (v: number, digits: number) => (Number.isFinite(v) ? v.toFixed(digits) : '—')

/**
 * The two-way table every Act VIII independence and homogeneity display is built on: observed
 * counts with the expected count under each one, or the expected counts alone, or each cell's
 * contribution to the statistic. Counts and expected values are computed by the caller.
 */
export function MatrixTable({ rowLabels, colLabels, observed, expected, contributions, layer = 'observed', highlight, totals = true, caption, ariaLabel, minExpected = 5 }: MatrixTableProps) {
  const rowTot = observed.map((r) => r.reduce((a, b) => a + b, 0))
  const colTot = colLabels.map((_, j) => observed.reduce((s, r) => s + r[j], 0))
  const grand = rowTot.reduce((a, b) => a + b, 0)

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)' }}>
      <table className="dr-table" aria-label={ariaLabel}>
        {caption && <caption className="dr-table__caption">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col" />
            {colLabels.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
            {totals && <th scope="col">total</th>}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((rl, i) => (
            <tr key={rl}>
              <th scope="row" style={{ textAlign: 'left', fontWeight: 500 }}>
                {rl}
              </th>
              {colLabels.map((_, j) => {
                const hot = highlight ? highlight[0] === i && highlight[1] === j : false
                const e = expected?.[i]?.[j]
                const low = e !== undefined && e < minExpected
                const color = hot ? 'var(--dr-alert)' : low && layer !== 'observed' ? 'var(--dr-amber)' : undefined
                return (
                  <td key={j} style={{ color, fontWeight: hot ? 600 : undefined, whiteSpace: 'nowrap' }}>
                    {layer === 'observed' && (
                      <>
                        {cellNum(observed[i][j], 0)}
                        {e !== undefined && (
                          <span style={{ display: 'block', fontSize: 'var(--dr-fs-2xs)', color: low ? 'var(--dr-amber)' : 'var(--dr-fg-2)' }}>
                            exp {cellNum(e, 2)}
                          </span>
                        )}
                      </>
                    )}
                    {layer === 'expected' && cellNum(e ?? NaN, 2)}
                    {layer === 'contribution' && cellNum(contributions?.[i]?.[j] ?? NaN, 2)}
                  </td>
                )
              })}
              {totals && <td style={{ color: 'var(--dr-fg-2)' }}>{cellNum(rowTot[i], 0)}</td>}
            </tr>
          ))}
          {totals && (
            <tr style={{ color: 'var(--dr-fg-2)' }}>
              <th scope="row" style={{ textAlign: 'left', fontWeight: 500 }}>
                total
              </th>
              {colTot.map((v, j) => (
                <td key={j}>{cellNum(v, 0)}</td>
              ))}
              <td>{cellNum(grand, 0)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
