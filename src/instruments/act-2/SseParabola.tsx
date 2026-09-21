/**
 * SseParabola — the calc refresher behind least squares (content/calc/minimizing-squared-error.mdx).
 *
 * For a fixed sample, the total squared residual SSE(b) with the intercept chosen optimally for each
 * slope b is a parabola in b. The learner drags b; the tangent at the current b is drawn and its slope
 * dSSE/db = −2(Sxy − b·Sxx) is read out. The tangent goes flat exactly at b = Sxy/Sxx — the LSRL slope.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components'
import { ChartSurface, PlotClip, Slider, Readout, ReadoutRow, Legend, XAxis, YAxis, useChartFrame, chartTheme, semanticColor } from '@/instruments/shared'
import { linearRegression, sseForLine, fmt } from '@/lib/stats'
import { honestManifest } from './data'

/** Twelve honest hulls, deterministic, in kilotonnes so the numbers stay readable. */
const SAMPLE = honestManifest.filter((_, i) => i % 33 === 0).slice(0, 12)
const XS = SAMPLE.map((d) => d.declaredMass / 1000)
const YS = SAMPLE.map((d) => d.inferredMass / 1000)

export function SseParabola() {
  const fit = useMemo(() => linearRegression(XS, YS), [])
  const [b, setB] = useState(() => Math.round((fit.slope + 0.12) * 1000) / 1000)
  const bMin = Math.round((fit.slope - 0.25) * 1000) / 1000
  const bMax = Math.round((fit.slope + 0.25) * 1000) / 1000

  // SSE(b) with the intercept re-optimised for each b: a = ȳ − b·x̄.
  const sseAt = (bb: number) => sseForLine(XS, YS, bb, fit.yMean - bb * fit.xMean)
  const dSse = (bb: number) => -2 * (fit.sxy - bb * fit.sxx)

  const curve = useMemo(() => {
    const pts: { b: number; sse: number }[] = []
    for (let i = 0; i <= 120; i++) {
      const bb = bMin + ((bMax - bMin) * i) / 120
      pts.push({ b: bb, sse: sseAt(bb) })
    }
    return pts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bMin, bMax])

  const frame = useChartFrame({ height: 260, yLabel: true })
  const x = useMemo(() => scaleLinear().domain([bMin, bMax]).range([0, frame.innerWidth]), [bMin, bMax, frame.innerWidth])
  const yMax = Math.max(...curve.map((p) => p.sse)) * 1.05
  const y = useMemo(() => scaleLinear().domain([0, yMax]).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])

  const path = curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.b)},${y(p.sse)}`).join('')
  const sse = sseAt(b)
  const slope = dSse(b)
  // Tangent segment over ±0.06 in b.
  const tb0 = b - 0.06
  const tb1 = b + 0.06
  const tangent = `M${x(tb0)},${y(sse + slope * (tb0 - b))}L${x(tb1)},${y(sse + slope * (tb1 - b))}`

  const table = useMemo(() => ({ columns: ['slope b', 'SSE (kt²)'], rows: curve.filter((_, i) => i % 10 === 0).map((p) => [Number(p.b.toFixed(3)), Number(p.sse.toFixed(4))]), caption: 'SSE as a function of the slope, intercept optimised for each b' }), [curve])

  return (
    <Panel label="ENGINEERING · SSE AGAINST THE SLOPE" status="CALC REFRESHER" tone="engineering" led="on">
      <div className="dr-controls">
        <Slider label="candidate slope b" value={b} min={bMin} max={bMax} step={0.001} onChange={setB} format={(v) => fmt(v, 3)} />
        <button type="button" className="dr-btn" onClick={() => setB(Math.round(fit.slope * 1000) / 1000)}>
          SET dSSE/db = 0
        </button>
      </div>
      <ChartSurface frame={frame} ariaLabel="Total squared residual as a function of the candidate slope: a parabola with its minimum at the least-squares slope" description={`SSE(b) for twelve honest hulls. Current slope ${fmt(b, 3)}, SSE ${fmt(sse, 3)} kt², derivative ${fmt(slope, 2)}. Minimum at b = ${fmt(fit.slope, 3)}.`} table={table}>
        <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
          <YAxis scale={y} width={frame.innerWidth} ticks={4} label="SSE (kt²)" />
          <PlotClip frame={frame}>
            <path d={path} fill="none" stroke={chartTheme.color.fit} strokeWidth={chartTheme.stroke.line} />
            <line x1={x(fit.slope)} x2={x(fit.slope)} y1={0} y2={frame.innerHeight} stroke={chartTheme.color.reference} strokeDasharray={chartTheme.dash} />
            <path d={tangent} fill="none" stroke={semanticColor('residual')} strokeWidth={2} />
            <circle cx={x(b)} cy={y(sse)} r={6} fill={chartTheme.color.observed} stroke={chartTheme.color.ring} strokeWidth={2} paintOrder="stroke" />
          </PlotClip>
          <XAxis scale={x} height={frame.innerHeight} ticks={5} label="candidate slope b (t inferred per t declared)" />
        </g>
      </ChartSurface>
      <Legend items={[{ label: 'SSE(b), intercept re-optimised for each b', color: chartTheme.color.fit, shape: 'line' }, { label: 'tangent at the current b', color: semanticColor('residual'), shape: 'line' }, { label: 'least-squares slope', color: chartTheme.color.reference, shape: 'dashed' }]} />
      <ReadoutRow>
        <Readout label="SSE(b)" value={fmt(sse, 3)} units="kt²" tone="engineering" live />
        <Readout label="dSSE/db" value={fmt(slope, 2)} tone={Math.abs(slope) < 0.05 ? 'tactical' : 'alert'} live />
        <Readout label="Sxy / Sxx" value={fmt(fit.sxy / fit.sxx, 3)} tone="engineering" />
        <Readout label="min SSE" value={fmt(fit.sse, 3)} units="kt²" />
      </ReadoutRow>
    </Panel>
  )
}
