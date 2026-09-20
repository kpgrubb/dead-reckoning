/**
 * BarChart — categorical counts or proportions. Optional expected values (χ² displays) drawn as
 * ticks in the reference colour; optional per-bar colours; horizontal layout for long labels.
 */
import { useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3'
import { chartTheme, seriesColor } from '@/design/chart-theme'
import { barLayout, fmtTick } from './geometry'
import { useChartFrame, ChartSurface, PlotClip } from './frame'
import { XAxis, YAxis, BandAxis } from './Axis'

export interface BarChartProps {
  categories: readonly string[]
  values: readonly number[]
  /** Expected counts drawn as a marker per category (goodness-of-fit displays). */
  expected?: readonly number[]
  /** Colour per category (defaults to series-1 for all; pass `seriesColor(i)` to differentiate). */
  colors?: readonly string[]
  /** Highlight indices (e.g. the category driving the χ² statistic) in the observed colour. */
  highlight?: readonly number[]
  label?: string
  valueLabel?: string
  horizontal?: boolean
  /** Write the value on each bar cap. Default: only when ≤ 8 bars. */
  showValues?: boolean
  height?: number
  ariaLabel: string
  description?: string
  showTable?: boolean
  className?: string
}

export function BarChart({ categories, values, expected, colors, highlight, label, valueLabel = 'count', horizontal = false, showValues, height, ariaLabel, description, showTable = false, className }: BarChartProps) {
  const n = categories.length
  const h = height ?? (horizontal ? Math.max(140, n * 32 + 56) : 260)
  const frame = useChartFrame({ height: h, margin: horizontal ? { left: 110, right: 24, top: 10 } : undefined })
  const vMax = Math.max(1e-9, ...values, ...(expected ?? []))
  const hl = new Set(highlight ?? [])
  const labelValues = showValues ?? n <= 8

  const band = useMemo(
    () =>
      scaleBand<string>()
        .domain([...categories])
        .range([0, horizontal ? frame.innerHeight : frame.innerWidth])
        .paddingInner(0.25)
        .paddingOuter(0.1),
    [categories, horizontal, frame.innerWidth, frame.innerHeight],
  )
  const v = useMemo(() => scaleLinear().domain([0, vMax]).nice(4).range(horizontal ? [0, frame.innerWidth] : [frame.innerHeight, 0]), [vMax, horizontal, frame.innerWidth, frame.innerHeight])
  const layout = barLayout(n, horizontal ? frame.innerHeight : frame.innerWidth, { maxThickness: horizontal ? 22 : chartTheme.mark.barMax, gap: chartTheme.mark.gap })

  const table = useMemo(
    () => ({
      columns: ['category', valueLabel, ...(expected ? ['expected'] : [])],
      rows: categories.map((c, i) => [c, values[i], ...(expected ? [Number((expected[i] ?? 0).toPrecision(5))] : [])]),
      caption: label,
    }),
    [categories, values, expected, valueLabel, label],
  )

  return (
    <ChartSurface frame={frame} ariaLabel={ariaLabel} description={description} table={table} showTable={showTable} className={className}>
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        {horizontal ? (
          <>
            <XAxis scale={v} height={frame.innerHeight} ticks={4} label={valueLabel} grid />
            {categories.map((c, i) => {
              const y0 = (band(c) ?? 0) + (band.bandwidth() - layout.thickness) / 2
              const w = Math.max(0, v(values[i]))
              const fill = hl.has(i) ? chartTheme.color.observed : (colors?.[i] ?? seriesColor(0))
              return (
                <g key={c}>
                  <text x={-8} y={y0 + layout.thickness / 2} dy="0.32em" textAnchor="end" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                    {c.length > 14 ? c.slice(0, 13) + '…' : c}
                  </text>
                  <rect className="dr-mark dr-mark--bar" x={0} y={y0} width={w} height={layout.thickness} fill={fill} fillOpacity={chartTheme.mark.alpha} rx={chartTheme.mark.barRadius}>
                    <title>
                      {c}: {fmtTick(values[i])}
                    </title>
                  </rect>
                  {expected && <line x1={v(expected[i])} x2={v(expected[i])} y1={y0 - 3} y2={y0 + layout.thickness + 3} stroke={chartTheme.color.reference} strokeWidth={2} />}
                  {labelValues && (
                    <text x={Math.max(w, expected ? v(expected[i]) : w) + 6} y={y0 + layout.thickness / 2} dy="0.32em" fill={chartTheme.color.title} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                      {fmtTick(values[i])}
                    </text>
                  )}
                </g>
              )
            })}
          </>
        ) : (
          <>
            <YAxis scale={v} width={frame.innerWidth} ticks={4} label={valueLabel} />
            <PlotClip frame={frame}>
            {categories.map((c, i) => {
              const x0 = (band(c) ?? 0) + (band.bandwidth() - layout.thickness) / 2
              const top = v(values[i])
              const fill = hl.has(i) ? chartTheme.color.observed : (colors?.[i] ?? seriesColor(0))
              return (
                <g key={c}>
                  <rect className="dr-mark dr-mark--bar" x={x0} y={top} width={layout.thickness} height={Math.max(0, frame.innerHeight - top) + chartTheme.mark.barRadius} fill={fill} fillOpacity={chartTheme.mark.alpha} rx={chartTheme.mark.barRadius}>
                    <title>
                      {c}: {fmtTick(values[i])}
                    </title>
                  </rect>
                  {expected && <line x1={x0 - 3} x2={x0 + layout.thickness + 3} y1={v(expected[i])} y2={v(expected[i])} stroke={chartTheme.color.reference} strokeWidth={2} />}
                  {labelValues && (
                    <text x={x0 + layout.thickness / 2} y={Math.min(top, expected ? v(expected[i]) : top) - 6} textAnchor="middle" fill={chartTheme.color.title} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                      {fmtTick(values[i])}
                    </text>
                  )}
                </g>
              )
            })}
            </PlotClip>
            <BandAxis scale={band} height={frame.innerHeight} label={label} />
          </>
        )}
        {expected && (
          <g transform={`translate(${frame.innerWidth - 4},${-2})`}>
            <line x1={-70} x2={-58} y1={0} y2={0} stroke={chartTheme.color.reference} strokeWidth={2} />
            <text x={-52} y={4} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
              expected
            </text>
          </g>
        )}
      </g>
    </ChartSurface>
  )
}
