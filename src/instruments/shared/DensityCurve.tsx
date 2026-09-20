/**
 * DensityCurve — any pdf(x) (normal, t, χ²…) drawn over a domain with shaded regions and reference
 * lines. Multiple curves may be layered (null vs alternative). Shaded areas use semantic colours:
 * `shade` (probability), `shadeRejected` (rejection region), `shadeAlt` (alternative).
 */
import { useMemo } from 'react'
import { scaleLinear, area as d3Area, line as d3Line } from 'd3'
import { chartTheme, semanticColor, type SemanticColor } from '@/design/chart-theme'
import { sampleCurve, niceTicks, fmtTick } from './geometry'
import { useChartFrame, ChartSurface, PlotClip } from './frame'
import { XAxis, YAxis, ReferenceLine } from './Axis'
import { Legend, type LegendItem } from './controls'

export interface Curve {
  pdf: (x: number) => number
  label?: string
  /** Semantic slot or explicit token. Defaults: first = fit, second = null, third = alt. */
  color?: SemanticColor | string
  dashed?: boolean
}

export interface ShadeRegion {
  from: number
  to: number
  /** Which curve to shade under (index into `curves`). */
  curve?: number
  color?: SemanticColor
  label?: string
}

export interface DensityCurveProps {
  /** One curve, or several to layer. */
  curves: readonly Curve[] | Curve
  domain: [number, number]
  shade?: readonly ShadeRegion[]
  references?: { x: number; label?: string; color?: SemanticColor }[]
  xLabel?: string
  /** Show the density axis (off by default — probability reads from area, not height). */
  yAxis?: boolean
  samples?: number
  height?: number
  ariaLabel: string
  description?: string
  showTable?: boolean
  className?: string
}

const DEFAULT_SLOTS: SemanticColor[] = ['fit', 'null', 'alt', 'residual', 'observed']

function colorOf(c: Curve, i: number): string {
  const v = c.color ?? DEFAULT_SLOTS[i % DEFAULT_SLOTS.length]
  return v.startsWith('var(') || v.startsWith('#') ? v : semanticColor(v as SemanticColor)
}

export function DensityCurve({ curves, domain, shade, references, xLabel, yAxis = false, samples = 200, height = 240, ariaLabel, description, showTable = false, className }: DensityCurveProps) {
  const list = Array.isArray(curves) ? (curves as readonly Curve[]) : [curves as Curve]
  const frame = useChartFrame({ height, margin: yAxis ? undefined : { left: 16, right: 16, top: 14 } })
  const sampled = useMemo(() => list.map((c) => sampleCurve(c.pdf, domain, samples)), [list, domain, samples])
  const yMax = useMemo(() => Math.max(1e-9, ...sampled.flat().map((p) => p.y)) * 1.08, [sampled])
  const x = useMemo(() => scaleLinear().domain(domain).range([0, frame.innerWidth]), [domain, frame.innerWidth])
  const y = useMemo(() => scaleLinear().domain([0, yMax]).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])

  const lineGen = useMemo(
    () =>
      d3Line<{ x: number; y: number }>()
        .x((p) => x(p.x))
        .y((p) => y(p.y)),
    [x, y],
  )
  const areaGen = useMemo(
    () =>
      d3Area<{ x: number; y: number }>()
        .x((p) => x(p.x))
        .y0(frame.innerHeight)
        .y1((p) => y(p.y)),
    [x, y, frame.innerHeight],
  )

  const shades = useMemo(
    () =>
      (shade ?? []).map((s) => {
        const c = list[s.curve ?? 0]
        const lo = Math.max(domain[0], Math.min(s.from, s.to))
        const hi = Math.min(domain[1], Math.max(s.from, s.to))
        const pts = sampleCurve(c.pdf, [lo, hi], Math.max(8, Math.round((samples * (hi - lo)) / (domain[1] - domain[0]))))
        return { ...s, path: areaGen(pts) ?? '', fill: semanticColor(s.color ?? 'shade'), mid: (lo + hi) / 2 }
      }),
    [shade, list, domain, samples, areaGen],
  )

  const table = useMemo(
    () => ({
      columns: ['x', ...list.map((c, i) => c.label ?? `density ${i + 1}`)],
      rows: sampled[0].filter((_, i) => i % Math.max(1, Math.floor(samples / 25)) === 0).map((p, i0) => [Number(p.x.toPrecision(5)), ...sampled.map((s) => Number(s[i0 * Math.max(1, Math.floor(samples / 25))]?.y.toPrecision(4) ?? 0))]),
      caption: shade?.length ? `Shaded: ${shade.map((s) => `${fmtTick(s.from)} to ${fmtTick(s.to)}`).join('; ')}` : undefined,
    }),
    [list, sampled, samples, shade],
  )

  const legendItems: LegendItem[] = list.length > 1 ? list.map((c, i) => ({ label: c.label ?? `curve ${i + 1}`, color: colorOf(c, i), shape: c.dashed ? 'dashed' : 'line' })) : []
  for (const s of shades) if (s.label) legendItems.push({ label: s.label, color: s.fill, shape: 'area' })

  return (
    <ChartSurface frame={frame} ariaLabel={ariaLabel} description={description} table={table} showTable={showTable} className={className} footer={legendItems.length ? <Legend items={legendItems} /> : undefined}>
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        {yAxis && <YAxis scale={y} width={frame.innerWidth} ticks={3} label="density" />}
        <PlotClip frame={frame}>
          {shades.map((s, i) => (
            <g key={i}>
              <path d={s.path} fill={s.fill} />
              {s.label && (
                <text x={x(s.mid)} y={frame.innerHeight - 6} textAnchor="middle" fill={chartTheme.color.title} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                  {s.label}
                </text>
              )}
            </g>
          ))}
          {sampled.map((pts, i) => (
            <path key={i} className="dr-mark dr-mark--line" d={lineGen(pts) ?? ''} fill="none" stroke={colorOf(list[i], i)} strokeWidth={chartTheme.stroke.line} strokeDasharray={list[i].dashed ? chartTheme.dash : undefined} strokeLinejoin="round" />
          ))}
          {references?.map((r, i) => (
            <ReferenceLine key={i} x={x(r.x)} height={frame.innerHeight} label={r.label} color={r.color ? semanticColor(r.color) : chartTheme.color.observed} dashed={false} anchor={x(r.x) > frame.innerWidth * 0.7 ? 'end' : 'start'} />
          ))}
        </PlotClip>
        <XAxis scale={x} height={frame.innerHeight} ticks={niceTicks(domain[0], domain[1], frame.innerWidth < 420 ? 4 : 7)} label={xLabel} />
      </g>
    </ChartSurface>
  )
}
