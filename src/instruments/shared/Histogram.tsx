/**
 * Histogram — bins first, then draws one <rect> per bin (never per point), so 5,000+ values render
 * without jank. Optional overlays: a density curve (e.g. the normal model), reference lines, and a
 * highlighted range (e.g. the rejection region) drawn in the semantic colour.
 */
import { useMemo } from 'react'
import { scaleLinear } from 'd3'
import { chartTheme, semanticColor, type SemanticColor } from '@/design/chart-theme'
import { computeBins, niceTicks, sampleCurve, fmtTick, type Bin } from './geometry'
import { useChartFrame, ChartSurface, PlotClip } from './frame'
import { XAxis, YAxis, ReferenceLine } from './Axis'
import { Legend, type LegendItem } from './controls'

export interface HistogramProps {
  values: readonly number[]
  /** Fixed bin width (aligned to multiples). */
  binWidth?: number
  /** Approximate bin count when binWidth is omitted. */
  bins?: number
  /** Force the x domain. */
  domain?: [number, number]
  /** Axis title. */
  label?: string
  /** Show density (area = 1) instead of counts — required to overlay a pdf. */
  density?: boolean
  /** Overlay curve: pdf(x) sampled across the domain; drawn in the `fit` semantic colour. */
  curve?: (x: number) => number
  curveLabel?: string
  /** Vertical reference lines, e.g. the observed statistic. */
  references?: { x: number; label?: string; color?: SemanticColor }[]
  /** Highlight bins whose midpoint falls in [from, to] (rejection region, tail probability). */
  highlight?: { from: number; to: number; color?: SemanticColor; label?: string }
  /** Legend label for the bars (used when a curve or highlight is present). */
  barsLabel?: string
  /** Colour slot for bars. */
  color?: string
  height?: number
  ariaLabel: string
  description?: string
  showTable?: boolean
  /** Called with the bin under the pointer (or null). */
  onHoverBin?: (bin: Bin | null) => void
  className?: string
}

export function Histogram({
  values,
  binWidth,
  bins,
  domain,
  label,
  density = false,
  curve,
  curveLabel,
  references,
  highlight,
  barsLabel,
  color = chartTheme.color.series[0],
  height = 260,
  ariaLabel,
  description,
  showTable = false,
  onHoverBin,
  className,
}: HistogramProps) {
  const frame = useChartFrame({ height })
  const binned = useMemo(() => computeBins(values, { binWidth, bins, domain }), [values, binWidth, bins, domain])
  const n = values.length
  const bw = binned.length ? binned[0].x1 - binned[0].x0 : 1

  const x = useMemo(() => {
    const d: [number, number] = binned.length ? [binned[0].x0, binned[binned.length - 1].x1] : (domain ?? [0, 1])
    return scaleLinear().domain(d).range([0, frame.innerWidth])
  }, [binned, domain, frame.innerWidth])

  const yOf = (b: Bin) => (density ? b.count / (n * bw) : b.count)
  const yMax = useMemo(() => {
    let m = binned.reduce((s, b) => Math.max(s, yOf(b)), 0)
    if (curve) {
      const pts = sampleCurve(curve, x.domain() as [number, number], 120)
      m = Math.max(m, ...pts.map((p) => p.y))
    }
    return m || 1
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [binned, density, n, bw, curve, x])

  const y = useMemo(() => scaleLinear().domain([0, yMax]).nice(4).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])

  const curvePath = useMemo(() => {
    if (!curve) return null
    const pts = sampleCurve(curve, x.domain() as [number, number], 160)
    return pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join('')
  }, [curve, x, y])

  const table = useMemo(
    () => ({
      columns: ['bin start', 'bin end', density ? 'density' : 'count'],
      rows: binned.map((b) => [b.x0, b.x1, density ? Number(yOf(b).toPrecision(4)) : b.count]),
      caption: label,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [binned, density, label],
  )

  const gap = chartTheme.mark.gap
  const hl = highlight ? semanticColor(highlight.color ?? 'rejected') : null
  const legendItems: LegendItem[] = []
  if (curveLabel || highlight?.label) legendItems.push({ label: barsLabel ?? label ?? 'observed', color, shape: 'square' })
  if (curveLabel) legendItems.push({ label: curveLabel, color: chartTheme.color.fit, shape: 'line' })
  if (highlight?.label && hl) legendItems.push({ label: highlight.label, color: hl, shape: 'square' })

  return (
    <ChartSurface frame={frame} ariaLabel={ariaLabel} description={description} table={table} showTable={showTable} className={className} footer={legendItems.length ? <Legend items={legendItems} /> : undefined}>
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <YAxis scale={y} width={frame.innerWidth} ticks={4} label={density ? 'density' : 'count'} />
        <PlotClip frame={frame}>
          {binned.map((b, i) => {
            const x0 = x(b.x0)
            const x1 = x(b.x1)
            const w = Math.max(1, x1 - x0 - gap)
            const v = yOf(b)
            const top = y(v)
            const mid = (b.x0 + b.x1) / 2
            const inHl = highlight && mid >= highlight.from && mid <= highlight.to
            return (
              <rect
                key={i}
                className="dr-mark dr-mark--bar"
                x={x0 + gap / 2}
                y={top}
                width={w}
                height={Math.max(0, frame.innerHeight - top) + chartTheme.mark.barRadius}
                fill={inHl && hl ? hl : color}
                fillOpacity={chartTheme.mark.alpha}
                rx={chartTheme.mark.barRadius}
                onPointerEnter={onHoverBin ? () => onHoverBin(b) : undefined}
                onPointerLeave={onHoverBin ? () => onHoverBin(null) : undefined}
              >
                <title>
                  [{fmtTick(b.x0)}, {fmtTick(b.x1)}): {b.count}
                </title>
              </rect>
            )
          })}
          {curvePath && <path className="dr-mark dr-mark--line" d={curvePath} fill="none" stroke={chartTheme.color.fit} strokeWidth={chartTheme.stroke.fit} strokeLinejoin="round" strokeLinecap="round" />}
          {references?.map((r, i) => (
            <ReferenceLine key={i} x={x(r.x)} height={frame.innerHeight} label={r.label} color={r.color ? semanticColor(r.color) : chartTheme.color.observed} dashed={false} anchor={x(r.x) > frame.innerWidth * 0.7 ? 'end' : 'start'} />
          ))}
        </PlotClip>
        <XAxis scale={x} height={frame.innerHeight} ticks={niceTicks(x.domain()[0], x.domain()[1], frame.innerWidth < 420 ? 4 : 7)} label={label} />
      </g>
    </ChartSurface>
  )
}
