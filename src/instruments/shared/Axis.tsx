/**
 * Axis + grid primitives drawn in React (not d3-axis) so they stay declarative and token-driven.
 * Coordinates are relative to the inner plot box: call inside `<g transform=translate(margin)>`.
 */
import type { ScaleBand, ScaleLinear } from 'd3'
import { chartTheme, labelTextProps, tickTextProps } from '@/design/chart-theme'
import { fmtTick, niceTicks } from './geometry'

export interface XAxisProps {
  scale: ScaleLinear<number, number>
  /** Inner height (axis sits at the bottom). */
  height: number
  ticks?: number | number[]
  label?: string
  format?: (v: number) => string
  /** Draw vertical gridlines. */
  grid?: boolean
}

export function XAxis({ scale, height, ticks = 6, label, format = fmtTick, grid = false }: XAxisProps) {
  const [d0, d1] = scale.domain()
  const values = Array.isArray(ticks) ? ticks : niceTicks(d0, d1, ticks)
  const [r0, r1] = scale.range()
  return (
    <g className="dr-axis dr-axis--x" transform={`translate(0,${height})`} aria-hidden="true">
      <line x1={r0} x2={r1} stroke={chartTheme.color.axis} strokeWidth={chartTheme.stroke.hair} shapeRendering="crispEdges" />
      {values.map((t) => {
        const x = scale(t)
        return (
          <g key={t} transform={`translate(${x},0)`}>
            {grid && <line y1={-height} y2={0} stroke={chartTheme.color.grid} strokeWidth={1} shapeRendering="crispEdges" />}
            <line y2={5} stroke={chartTheme.color.axis} strokeWidth={1} shapeRendering="crispEdges" />
            <text y={18} textAnchor="middle" {...tickTextProps}>
              {format(t)}
            </text>
          </g>
        )
      })}
      {label && (
        <text x={(r0 + r1) / 2} y={34} textAnchor="middle" {...labelTextProps}>
          {label}
        </text>
      )}
    </g>
  )
}

export interface YAxisProps {
  scale: ScaleLinear<number, number>
  /** Inner width (for gridlines). */
  width: number
  ticks?: number | number[]
  label?: string
  format?: (v: number) => string
  grid?: boolean
  /** Hide the axis line and tick marks (gridlines + labels only). */
  bare?: boolean
}

export function YAxis({ scale, width, ticks = 4, label, format = fmtTick, grid = true, bare = false }: YAxisProps) {
  const [d0, d1] = scale.domain()
  const values = Array.isArray(ticks) ? ticks : niceTicks(d0, d1, ticks)
  const [r0, r1] = scale.range()
  return (
    <g className="dr-axis dr-axis--y" aria-hidden="true">
      {!bare && <line y1={r0} y2={r1} stroke={chartTheme.color.axis} strokeWidth={chartTheme.stroke.hair} shapeRendering="crispEdges" />}
      {values.map((t) => {
        const y = scale(t)
        return (
          <g key={t} transform={`translate(0,${y})`}>
            {grid && <line x1={0} x2={width} stroke={chartTheme.color.grid} strokeWidth={1} shapeRendering="crispEdges" />}
            {!bare && <line x1={-4} x2={0} stroke={chartTheme.color.axis} strokeWidth={1} shapeRendering="crispEdges" />}
            <text x={-8} dy="0.32em" textAnchor="end" {...tickTextProps}>
              {format(t)}
            </text>
          </g>
        )
      })}
      {label && (
        <text transform={`translate(${-chartTheme.marginWithYLabel.left + 14},${(r0 + r1) / 2}) rotate(-90)`} textAnchor="middle" {...labelTextProps}>
          {label}
        </text>
      )}
    </g>
  )
}

export interface BandAxisProps {
  scale: ScaleBand<string>
  height: number
  label?: string
}

/** Categorical x-axis for bar charts and grouped boxplots. Long labels are truncated with an ellipsis. */
export function BandAxis({ scale, height, label }: BandAxisProps) {
  const [r0, r1] = scale.range()
  const bw = scale.bandwidth()
  const maxChars = Math.max(3, Math.floor(bw / 7))
  return (
    <g className="dr-axis dr-axis--band" transform={`translate(0,${height})`} aria-hidden="true">
      <line x1={r0} x2={r1} stroke={chartTheme.color.axis} strokeWidth={chartTheme.stroke.hair} shapeRendering="crispEdges" />
      {scale.domain().map((c) => {
        const x = (scale(c) ?? 0) + bw / 2
        const text = c.length > maxChars ? c.slice(0, Math.max(1, maxChars - 1)) + '…' : c
        return (
          <g key={c} transform={`translate(${x},0)`}>
            <line y2={5} stroke={chartTheme.color.axis} strokeWidth={1} shapeRendering="crispEdges" />
            <text y={18} textAnchor="middle" {...tickTextProps}>
              <title>{c}</title>
              {text}
            </text>
          </g>
        )
      })}
      {label && (
        <text x={(r0 + r1) / 2} y={34} textAnchor="middle" {...labelTextProps}>
          {label}
        </text>
      )}
    </g>
  )
}

/** A vertical reference line with an optional mono label at the top. */
export function ReferenceLine({ x, height, label, color = chartTheme.color.reference, dashed = true, anchor = 'start' }: { x: number; height: number; label?: string; color?: string; dashed?: boolean; anchor?: 'start' | 'end' | 'middle' }) {
  return (
    <g className="dr-refline" transform={`translate(${x},0)`} aria-hidden="true">
      <line y1={0} y2={height} stroke={color} strokeWidth={chartTheme.stroke.reference} strokeDasharray={dashed ? chartTheme.dash : undefined} />
      {label && (
        <text x={anchor === 'end' ? -4 : anchor === 'middle' ? 0 : 4} y={11} textAnchor={anchor} {...tickTextProps} fill={chartTheme.color.label}>
          {label}
        </text>
      )}
    </g>
  )
}

/** A horizontal reference line (e.g. zero on a residual plot). */
export function HReferenceLine({ y, width, label, color = chartTheme.color.reference, dashed = true }: { y: number; width: number; label?: string; color?: string; dashed?: boolean }) {
  return (
    <g className="dr-refline" transform={`translate(0,${y})`} aria-hidden="true">
      <line x1={0} x2={width} stroke={color} strokeWidth={chartTheme.stroke.reference} strokeDasharray={dashed ? chartTheme.dash : undefined} />
      {label && (
        <text x={width - 4} y={-4} textAnchor="end" {...tickTextProps} fill={chartTheme.color.label}>
          {label}
        </text>
      )}
    </g>
  )
}
