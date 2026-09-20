/**
 * <Plot spec={…}> — themed chart from a DisplaySpec (baseline SVG renderer).
 *
 * The Visual Design System agent owns the chart theme (src/design/chart-theme.ts) and the Engine /
 * Instrument Builders extend the renderers under src/instruments/shared/. This baseline renders
 * dotplot, histogram, bar, scatter and table well enough to prove the pipeline, and ALWAYS emits an
 * accessible data-table fallback (visually hidden unless `showTable`).
 */
import { useId } from 'react'
import type { DisplaySpec } from '@/lib/problems/types'
import { Panel } from './Panel'
import { fmt } from '@/lib/stats/format'

export interface PlotProps {
  spec: DisplaySpec
  label?: string
  /** Ship-system framing. */
  tone?: 'tactical' | 'sensor' | 'engineering' | 'intel'
  width?: number
  height?: number
  showTable?: boolean
  /** Accessible description of what the chart shows (required for screen readers). */
  description: string
}

const W = 560
const H = 260
const M = { top: 16, right: 16, bottom: 36, left: 44 }

function scale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  return (v: number) => r0 + (v - d0) * k
}

function niceTicks(lo: number, hi: number, n = 6): number[] {
  if (hi === lo) return [lo]
  const span = hi - lo
  const step0 = span / n
  const mag = 10 ** Math.floor(Math.log10(step0))
  const norm = step0 / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const start = Math.ceil(lo / step) * step
  const out: number[] = []
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(10)))
  return out
}

function Axis({ x, ticks, label, height }: { x: (v: number) => number; ticks: number[]; label?: string; height: number }) {
  return (
    <g className="dr-plot__axis" transform={`translate(0,${height - M.bottom})`}>
      <line x1={M.left} x2={W - M.right} stroke="var(--dr-axis)" />
      {ticks.map((t) => (
        <g key={t} transform={`translate(${x(t)},0)`}>
          <line y2={5} stroke="var(--dr-axis)" />
          <text y={18} textAnchor="middle" fill="var(--dr-fg-2)" fontSize="11" fontFamily="var(--dr-font-mono)">
            {t}
          </text>
        </g>
      ))}
      {label && (
        <text x={(M.left + W - M.right) / 2} y={32} textAnchor="middle" fill="var(--dr-fg-1)" fontSize="11" fontFamily="var(--dr-font-ui)">
          {label}
        </text>
      )}
    </g>
  )
}

function DataTable({ spec, id }: { spec: DisplaySpec; id: string }) {
  let columns: string[] = []
  let rows: (string | number)[][] = []
  switch (spec.kind) {
    case 'dotplot':
    case 'histogram':
      columns = [spec.label ?? 'value']
      rows = spec.values.map((v) => [v])
      break
    case 'boxplot':
      columns = ['group', 'value']
      rows = spec.groups.flatMap((g) => g.values.map((v) => [g.name, v]))
      break
    case 'scatter':
      columns = [spec.xLabel ?? 'x', spec.yLabel ?? 'y']
      rows = spec.points.map((p) => [p.x, p.y])
      break
    case 'residual':
      columns = [spec.xLabel ?? 'x', 'residual']
      rows = spec.points.map((p) => [p.x, fmt(p.resid, 3)])
      break
    case 'normal':
      columns = ['parameter', 'value']
      rows = [
        ['mean', spec.mean],
        ['sd', spec.sd],
      ]
      break
    case 'table':
      columns = spec.columns
      rows = spec.rows
      break
    case 'bar':
      columns = ['category', 'count']
      rows = spec.categories.map((c, i) => [c, spec.counts[i]])
      break
  }
  return (
    <table id={id} className="dr-plot__table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Chart({ spec, height }: { spec: DisplaySpec; height: number }) {
  const innerH = height - M.top - M.bottom
  switch (spec.kind) {
    case 'dotplot': {
      const vals = spec.values
      const lo = Math.min(...vals)
      const hi = Math.max(...vals)
      const pad = (hi - lo || 1) * 0.05
      const x = scale([lo - pad, hi + pad], [M.left, W - M.right])
      const counts = new Map<number, number>()
      const r = 5
      return (
        <>
          {vals.map((v, i) => {
            const k = Math.round(x(v) / (r * 2)) * r * 2
            const n = counts.get(k) ?? 0
            counts.set(k, n + 1)
            return <circle key={i} cx={x(v)} cy={height - M.bottom - r - n * (r * 2 + 1)} r={r} fill="var(--dr-series-1)" />
          })}
          <Axis x={x} ticks={niceTicks(lo - pad, hi + pad)} label={spec.label} height={height} />
        </>
      )
    }
    case 'histogram': {
      const vals = spec.values
      const lo = Math.min(...vals)
      const hi = Math.max(...vals)
      const bw = spec.binWidth ?? (niceTicks(lo, hi, 8)[1] - niceTicks(lo, hi, 8)[0] || 1)
      const start = Math.floor(lo / bw) * bw
      const nb = Math.max(1, Math.ceil((hi - start) / bw + 1e-9))
      const bins = Array.from({ length: nb }, () => 0)
      for (const v of vals) bins[Math.min(nb - 1, Math.floor((v - start) / bw))]++
      const x = scale([start, start + nb * bw], [M.left, W - M.right])
      const y = scale([0, Math.max(...bins)], [height - M.bottom, M.top])
      return (
        <>
          {bins.map((c, i) => (
            <rect key={i} x={x(start + i * bw) + 0.5} y={y(c)} width={x(start + bw) - x(start) - 1} height={height - M.bottom - y(c)} fill="var(--dr-series-1)" opacity={0.85} />
          ))}
          <Axis x={x} ticks={niceTicks(start, start + nb * bw, 8)} label={spec.label} height={height} />
          <g className="dr-plot__yaxis">
            {niceTicks(0, Math.max(...bins), 4).map((t) => (
              <g key={t} transform={`translate(${M.left},${y(t)})`}>
                <line x1={-4} stroke="var(--dr-axis)" />
                <line x1={0} x2={W - M.right - M.left} stroke="var(--dr-grid)" />
                <text x={-8} dy="0.32em" textAnchor="end" fill="var(--dr-fg-2)" fontSize="11" fontFamily="var(--dr-font-mono)">
                  {t}
                </text>
              </g>
            ))}
          </g>
        </>
      )
    }
    case 'bar': {
      const n = spec.categories.length
      const bwid = (W - M.left - M.right) / n
      const y = scale([0, Math.max(...spec.counts)], [height - M.bottom, M.top])
      return (
        <>
          {spec.categories.map((c, i) => (
            <g key={c}>
              <rect x={M.left + i * bwid + bwid * 0.15} y={y(spec.counts[i])} width={bwid * 0.7} height={height - M.bottom - y(spec.counts[i])} fill="var(--dr-series-1)" />
              <text x={M.left + i * bwid + bwid / 2} y={height - M.bottom + 16} textAnchor="middle" fill="var(--dr-fg-2)" fontSize="11">
                {c}
              </text>
            </g>
          ))}
          <line x1={M.left} x2={W - M.right} y1={height - M.bottom} y2={height - M.bottom} stroke="var(--dr-axis)" />
        </>
      )
    }
    case 'scatter': {
      const xs = spec.points.map((p) => p.x)
      const ys = spec.points.map((p) => p.y)
      const xd: [number, number] = [Math.min(...xs), Math.max(...xs)]
      const yd: [number, number] = [Math.min(...ys), Math.max(...ys)]
      const x = scale(xd, [M.left, W - M.right])
      const y = scale(yd, [height - M.bottom, M.top])
      return (
        <>
          {spec.points.map((p, i) => (
            <circle key={i} cx={x(p.x)} cy={y(p.y)} r={4} fill="var(--dr-series-2)" />
          ))}
          <Axis x={x} ticks={niceTicks(xd[0], xd[1])} label={spec.xLabel} height={height} />
          <g>
            {niceTicks(yd[0], yd[1], 4).map((t) => (
              <text key={t} x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fill="var(--dr-fg-2)" fontSize="11" fontFamily="var(--dr-font-mono)">
                {t}
              </text>
            ))}
            {spec.yLabel && (
              <text transform={`translate(12,${(M.top + height - M.bottom) / 2}) rotate(-90)`} textAnchor="middle" fill="var(--dr-fg-1)" fontSize="11">
                {spec.yLabel}
              </text>
            )}
          </g>
        </>
      )
    }
    default:
      return (
        <text x={W / 2} y={innerH / 2} textAnchor="middle" fill="var(--dr-fg-2)" fontSize="12">
          {spec.kind} renderer pending — see data table
        </text>
      )
  }
}

export function Plot({ spec, label, tone = 'sensor', height = H, showTable = false, description }: PlotProps) {
  const id = useId()
  const tableId = `${id}-table`
  if (spec.kind === 'table') {
    return (
      <Panel label={label ?? 'DATA'} tone={tone} className="dr-plot">
        <DataTable spec={spec} id={tableId} />
      </Panel>
    )
  }
  return (
    <Panel label={label ?? spec.kind.toUpperCase()} tone={tone} className="dr-plot">
      <svg viewBox={`0 0 ${W} ${height}`} className="dr-plot__svg" role="img" aria-label={description} aria-describedby={tableId} style={{ width: '100%', height: 'auto' }}>
        <Chart spec={spec} height={height} />
      </svg>
      <div className={showTable ? 'dr-plot__tablewrap' : 'visually-hidden'}>
        <DataTable spec={spec} id={tableId} />
      </div>
    </Panel>
  )
}
