/**
 * Private presentational helpers for the Act I instruments (not part of the act's public index).
 *
 *   Note          a mono caption line under a chart or control row
 *   KeyTable      a small mono table (frequency tables, two-way tables, summary tables)
 *   Stemplot      single or back-to-back stem-and-leaf display with the leaf unit stated
 *   EdgeHistogram a histogram over caller-supplied bin edges (the shared Histogram aligns bins to
 *                 multiples of the width, which cannot express "Marks 1–12 in four bins")
 *
 * Numbers shown here are formatted only; every statistic is computed by the caller from `@/lib/stats`.
 */
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { scaleLinear } from 'd3'
import { chartTheme, useChartFrame, ChartSurface, PlotClip, XAxis, YAxis, binWithEdges, niceTicks, fmtTick } from '@/instruments/shared'
import { fmt } from '@/lib/stats'

/* ---------- Layout ---------- */

export const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-3)' }
export const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--dr-sp-4)' }
export const subheadStyle: CSSProperties = {
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

/* ---------- Key table ---------- */

export interface KeyTableProps {
  columns: readonly string[]
  rows: readonly (readonly ReactNode[])[]
  caption?: string
  ariaLabel?: string
  /** Index of a row to render emphasised (e.g. a TOTAL row). */
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

/* ---------- Stem-and-leaf ---------- */

export interface StemSpec {
  /** Value of one stem step (1 → stems are units, 10 → tens, 0.01 → hundredths). */
  stemUnit: number
  /** Value of one leaf digit; stemUnit / leafUnit must be 10. */
  leafUnit: number
}

/** Split values into stem → sorted leaf digits (values truncated to the leaf unit). */
export function stemLeaf(values: readonly number[], spec: StemSpec): Map<number, number[]> {
  const out = new Map<number, number[]>()
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    const units = Math.floor(v / spec.leafUnit + 1e-9)
    const stem = Math.floor(units / 10)
    const leaf = units - stem * 10
    const list = out.get(stem) ?? []
    list.push(leaf)
    out.set(stem, list)
  }
  for (const list of out.values()) list.sort((a, b) => a - b)
  return out
}

function leafDecimals(leafUnit: number): number {
  return Math.max(0, -Math.floor(Math.log10(leafUnit) + 1e-9))
}

export interface StemplotProps {
  spec: StemSpec
  /** Right-hand leaves (the only side for a single stemplot). */
  right: readonly number[]
  rightLabel?: string
  /** Optional left-hand leaves for a back-to-back plot. */
  left?: readonly number[]
  leftLabel?: string
  units?: string
  caption?: string
}

export function Stemplot({ spec, right, rightLabel, left, leftLabel, units, caption }: StemplotProps) {
  const rightMap = useMemo(() => stemLeaf(right, spec), [right, spec])
  const leftMap = useMemo(() => (left ? stemLeaf(left, spec) : null), [left, spec])
  const stems = useMemo(() => {
    const keys = [...rightMap.keys(), ...(leftMap ? [...leftMap.keys()] : [])]
    if (keys.length === 0) return []
    const lo = Math.min(...keys)
    const hi = Math.max(...keys)
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)
  }, [rightMap, leftMap])
  const dec = leafDecimals(spec.leafUnit)
  const exampleStem = stems.length ? stems[Math.floor(stems.length / 2)] : 0
  const exampleLeaf = 4
  const keyValue = fmt(exampleStem * spec.stemUnit + exampleLeaf * spec.leafUnit, dec)
  const mono: CSSProperties = { fontFamily: 'var(--dr-font-mono)', fontSize: 'var(--dr-fs-sm)', fontVariantNumeric: 'tabular-nums' }
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)', background: 'var(--dr-chart-surface)' }}>
        <table className="dr-table" aria-label={caption ?? 'Stem-and-leaf plot'} style={mono}>
          <thead>
            <tr>
              {leftMap && (
                <th scope="col" style={{ textAlign: 'right' }}>
                  {leftLabel ?? 'left'}
                </th>
              )}
              <th scope="col" style={{ textAlign: 'center' }}>
                stem
              </th>
              <th scope="col" style={{ textAlign: 'left' }}>
                {rightLabel ?? 'leaves'}
              </th>
            </tr>
          </thead>
          <tbody>
            {stems.map((s) => (
              <tr key={s}>
                {leftMap && (
                  <td style={{ textAlign: 'right', letterSpacing: '0.18em', color: 'var(--dr-fg-1)' }}>
                    {(leftMap.get(s) ?? []).slice().reverse().join('')}
                  </td>
                )}
                <td style={{ textAlign: 'center', color: 'var(--dr-fg-0)', borderLeft: '1px solid var(--dr-line-strong)', borderRight: '1px solid var(--dr-line-strong)' }}>{s}</td>
                <td style={{ textAlign: 'left', letterSpacing: '0.18em', color: 'var(--dr-fg-1)' }}>{(rightMap.get(s) ?? []).join('')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="dr-chart__caption">
        Key: {exampleStem} | {exampleLeaf} = {keyValue}
        {units ? ` ${units}` : ''} · leaf unit {fmt(spec.leafUnit, dec)}
        {units ? ` ${units}` : ''} (values truncated to the leaf unit)
        {caption ? ` · ${caption}` : ''}
      </figcaption>
    </figure>
  )
}

/* ---------- Histogram over explicit edges ---------- */

export interface EdgeHistogramProps {
  values: readonly number[]
  edges: readonly number[]
  label?: string
  color?: string
  /** Plot relative frequency (count / n) instead of counts. */
  relative?: boolean
  height?: number
  ariaLabel: string
  description?: string
  showTable?: boolean
}

export function EdgeHistogram({ values, edges, label, color = chartTheme.color.series[0], relative = false, height = 220, ariaLabel, description, showTable = false }: EdgeHistogramProps) {
  const frame = useChartFrame({ height })
  const binned = useMemo(() => binWithEdges(values, edges), [values, edges])
  const n = values.length || 1
  const yOf = (count: number) => (relative ? count / n : count)
  const x = useMemo(() => scaleLinear().domain([edges[0], edges[edges.length - 1]]).range([0, frame.innerWidth]), [edges, frame.innerWidth])
  const yMax = Math.max(1e-9, ...binned.map((b) => yOf(b.count)))
  const y = useMemo(() => scaleLinear().domain([0, yMax]).nice(4).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])
  const table = useMemo(
    () => ({
      columns: ['bin start', 'bin end', 'count', 'relative frequency'],
      rows: binned.map((b) => [fmtTick(b.x0), fmtTick(b.x1), b.count, fmt(b.count / n, 3)]),
      caption: label,
    }),
    [binned, n, label],
  )
  const gap = chartTheme.mark.gap
  return (
    <ChartSurface frame={frame} ariaLabel={ariaLabel} description={description} table={table} showTable={showTable}>
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <YAxis scale={y} width={frame.innerWidth} ticks={4} label={relative ? 'relative frequency' : 'count'} />
        <PlotClip frame={frame}>
          {binned.map((b, i) => {
            const x0 = x(b.x0)
            const x1 = x(b.x1)
            const top = y(yOf(b.count))
            return (
              <rect key={i} className="dr-mark dr-mark--bar" x={x0 + gap / 2} y={top} width={Math.max(1, x1 - x0 - gap)} height={Math.max(0, frame.innerHeight - top) + chartTheme.mark.barRadius} fill={color} fillOpacity={chartTheme.mark.alpha} rx={chartTheme.mark.barRadius}>
                <title>
                  [{fmtTick(b.x0)}, {fmtTick(b.x1)}): {b.count}
                </title>
              </rect>
            )
          })}
        </PlotClip>
        <XAxis scale={x} height={frame.innerHeight} ticks={edges.length <= 13 ? [...edges] : niceTicks(edges[0], edges[edges.length - 1], 7)} label={label} />
      </g>
    </ChartSurface>
  )
}

/** "1 in N" phrasing for a small probability. */
export function oneIn(p: number): string {
  if (!(p > 0) || !Number.isFinite(p)) return '—'
  const n = 1 / p
  if (n < 1.5) return '≈ 1 in 1'
  return `1 in ${Math.round(n).toLocaleString('en-US')}`
}
