/**
 * ENGINEERING · DENSITY AGAINST MASS (calc briefing "density-vs-mass") — why a pdf may exceed 1 and a
 * pmf may not, and what f(x)·Δx actually is.
 *
 * The same variable the cold-run module uses: sink temperature at hour 60 of a Watch run. Narrow the
 * bins and every bar's *probability* falls toward zero while every bar's *probability per degree*
 * settles onto a fixed curve. Narrow the model instead — drop σ far enough — and that curve climbs
 * past 1, which is legal, because a density is a rate and only f(x)·Δx is a probability.
 *
 * Bar probabilities come from `normal.between`; the curve from `normal.pdf`.
 */
import { useMemo, useState } from 'react'
import { line as d3Line, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import { ChartSurface, Legend, PlotClip, Readout, ReadoutRow, Segmented, Slider, XAxis, YAxis, chartTheme, sampleCurve, semanticColor, useChartFrame, type LegendItem } from '@/instruments/shared'
import { fmt, fmtInt, normal } from '@/lib/stats'
import { SINK_TEMP } from './data'
import { Note, stackStyle } from './_ui'

export interface DensityVsMassProps {
  /** Centre of the model, °C. */
  mean?: number
  /** Spread of the model, °C. */
  sd?: number
}

type Scale = 'probability' | 'density'

const SPAN = 4
const MAX_BARS = 200
const MIN_BARS = 4
const TABLE_ROWS = 24

export function DensityVsMass({ mean = SINK_TEMP.mean, sd: sdProp = SINK_TEMP.sd }: DensityVsMassProps) {
  const [sigma, setSigma] = useState(sdProp)
  const [barCount, setBarCount] = useState(16)
  const [scale, setScale] = useState<Scale>('probability')

  const domLo = mean - SPAN * sigma
  const domHi = mean + SPAN * sigma
  const bars = Math.min(MAX_BARS, Math.max(MIN_BARS, Math.round(barCount)))
  const dx = (domHi - domLo) / bars

  const cells = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const lo = domLo + i * dx
        const hi = lo + dx
        const prob = normal.between(lo, hi, mean, sigma)
        return { i, lo, hi, mid: (lo + hi) / 2, prob, density: prob / dx }
      }),
    [bars, domLo, dx, mean, sigma],
  )

  const totalArea = cells.reduce((s, c) => s + c.prob, 0)
  const tallest = cells.reduce((best, c) => (c.prob > best.prob ? c : best), cells[0])
  const peakDensity = normal.pdf(mean, mean, sigma)
  const densityOverOne = peakDensity > 1

  /* ---- Geometry ---- */
  const frame = useChartFrame({ height: 280, yLabel: true })
  const x = useMemo(() => scaleLinear().domain([domLo, domHi]).range([0, frame.innerWidth]), [domLo, domHi, frame.innerWidth])
  const yMax = scale === 'probability' ? Math.max(1e-9, ...cells.map((c) => c.prob)) * 1.15 : Math.max(peakDensity, ...cells.map((c) => c.density)) * 1.15
  const y = useMemo(() => scaleLinear().domain([0, yMax]).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])

  const curvePath = useMemo(() => {
    if (scale !== 'density') return ''
    const pts = sampleCurve((v) => normal.pdf(v, mean, sigma), [domLo, domHi], 241)
    return (
      d3Line<{ x: number; y: number }>()
        .x((p) => x(p.x))
        .y((p) => y(p.y))(pts) ?? ''
    )
  }, [scale, mean, sigma, domLo, domHi, x, y])

  const table = useMemo(
    () => ({
      columns: ['bin', 'from', 'to', 'probability P(bin)', `density P(bin) ÷ Δx (per ${SINK_TEMP.units})`],
      rows: cells.slice(0, TABLE_ROWS).map((c) => [c.i + 1, fmt(c.lo, 2), fmt(c.hi, 2), fmt(c.prob, 6), fmt(c.density, 6)]),
      caption: `${fmtInt(bars)} bins of width ${fmt(dx, 4)} ${SINK_TEMP.units} over N(${fmt(mean, 0)}, ${fmt(sigma, 2)})${bars > TABLE_ROWS ? ` · first ${TABLE_ROWS} shown` : ''}`,
    }),
    [cells, bars, dx, mean, sigma],
  )

  const legend: LegendItem[] = [
    { label: scale === 'probability' ? 'probability per bar' : 'probability per unit of x', color: semanticColor('null'), shape: 'square' },
    ...(scale === 'density' ? [{ label: 'the density curve f(x)', color: semanticColor('fit'), shape: 'line' as const }] : []),
  ]

  return (
    <Panel label="ENGINEERING · DENSITY AGAINST MASS" status={`Δx = ${fmt(dx, 3)} ${SINK_TEMP.units}`} tone="engineering" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Scale>
            label="vertical axis"
            value={scale}
            onChange={setScale}
            options={[
              { value: 'probability', label: 'probability per bar' },
              { value: 'density', label: 'probability per unit of x' },
            ]}
          />
          <Slider label="bins across the model" value={bars} min={MIN_BARS} max={MAX_BARS} step={1} onChange={setBarCount} format={(v) => fmtInt(v)} />
          <Slider label="σ · model spread" value={sigma} min={0.2} max={12} step={0.05} units={SINK_TEMP.units} onChange={setSigma} format={(v) => fmt(v, 2)} />
        </div>

        <ReadoutRow>
          <Readout label="Δx · bin width" value={fmt(dx, 4)} units={SINK_TEMP.units} tone="engineering" live />
          <Readout label="tallest bar · probability" value={fmt(tallest.prob, 6)} tone="engineering" live />
          <Readout label="tallest bar · density" value={fmt(tallest.density, 5)} units={`per ${SINK_TEMP.units}`} tone="engineering" live />
          <Readout label="peak of f(x)" value={fmt(peakDensity, 5)} units={`per ${SINK_TEMP.units}`} tone={densityOverOne ? 'alert' : 'default'} size="sm" live />
          <Readout label="total area · Σ P(bin)" value={fmt(totalArea, 5)} size="sm" live />
        </ReadoutRow>

        <ChartSurface
          frame={frame}
          ariaLabel={`${fmtInt(bars)} bins of the sink-temperature model, drawn as ${scale === 'probability' ? 'probability per bar' : 'probability per degree'}`}
          description={`The normal model of sink temperature at hour 60, cut into ${fmtInt(bars)} bins of width ${fmt(dx, 4)} ${SINK_TEMP.units}. The tallest bar holds a probability of ${fmt(tallest.prob, 6)}, which is a density of ${fmt(tallest.density, 5)} per ${SINK_TEMP.units}. The bars together hold ${fmt(totalArea, 5)}. The data table lists each bin with both numbers.`}
          table={table}
          footer={<Legend items={legend} ariaLabel="Density key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={y} width={frame.innerWidth} ticks={4} label={scale === 'probability' ? 'probability in the bar' : `density · per ${SINK_TEMP.units}`} />
            <PlotClip frame={frame}>
              {cells.map((c) => {
                const top = y(scale === 'probability' ? c.prob : c.density)
                const w = Math.max(0.5, x(c.hi) - x(c.lo) - (bars > 60 ? 0 : 1))
                return (
                  <rect key={c.i} className="dr-mark dr-mark--bar" x={x(c.lo)} y={top} width={w} height={Math.max(0, frame.innerHeight - top)} fill={semanticColor('null')} fillOpacity={chartTheme.mark.alpha}>
                    <title>
                      [{fmt(c.lo, 2)}, {fmt(c.hi, 2)}) · P {fmt(c.prob, 6)} · density {fmt(c.density, 5)}
                    </title>
                  </rect>
                )
              })}
              {scale === 'density' && curvePath && <path d={curvePath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />}
              {scale === 'density' && peakDensity > 1 && (
                <line x1={0} x2={frame.innerWidth} y1={y(1)} y2={y(1)} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
              )}
            </PlotClip>
            <XAxis scale={x} height={frame.innerHeight} label={`sink temperature at hour 60 (${SINK_TEMP.units})`} />
          </g>
        </ChartSurface>

        <Note live>
          {fmtInt(bars)} bins of width {fmt(dx, 4)} {SINK_TEMP.units}. The tallest bar carries {fmt(tallest.prob, 6)} of probability and stands {fmt(tallest.density, 5)} per {SINK_TEMP.units} tall. Halve the width and the probability halves with it, on its way to zero; the density barely moves, because it is the probability divided by the width that produced it. That limit is f(x), and the bar is f(x)·Δx.
        </Note>

        <Note tone={densityOverOne ? 'alert' : 'muted'} live>
          {densityOverOne ? (
            <>
              At σ = {fmt(sigma, 2)} {SINK_TEMP.units} the curve peaks at {fmt(peakDensity, 4)} per {SINK_TEMP.units} — above 1, and legal. A density is a rate, not a probability: it says how much probability sits in a degree, and if the whole of the distribution is squeezed into a fraction of a degree the rate must be large. Nothing here exceeds 1 that is a probability. The tallest bar still holds only {fmt(tallest.prob, 6)}, the total area is still {fmt(totalArea, 5)}, and only f(x)·Δx is ever a probability.
            </>
          ) : (
            <>
              At σ = {fmt(sigma, 2)} {SINK_TEMP.units} the curve peaks at {fmt(peakDensity, 5)} per {SINK_TEMP.units}. Drop σ below {fmt(1 / Math.sqrt(2 * Math.PI), 3)} and the peak passes 1. A probability mass function could never do that — each of its bars is a probability. A density may, because it is probability per unit of x, and the unit can be made small.
            </>
          )}
        </Note>
      </div>
    </Panel>
  )
}
