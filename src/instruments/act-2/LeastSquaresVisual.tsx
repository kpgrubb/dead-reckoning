/**
 * LeastSquaresVisual (act-2-03) — minimize the squares. Sixteen honest hulls (every 25th row of the
 * honest manifest), declared vs inferred mass in kilotonnes. Two sliders set a candidate line; each
 * residual is drawn as a square whose area is the squared residual; SSE is read against the
 * least-squares minimum; a small trace shows SSE as a function of slope at the current intercept.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components'
import { Slider, Readout, ReadoutRow, Legend, useChartFrame, ChartSurface, PlotClip, XAxis, YAxis, ReferenceLine, padDomain, niceTicks } from '@/instruments/shared'
import { chartTheme, semanticColor } from '@/design/chart-theme'
import { linearRegression, sseForLine, residualsForLine, fmt } from '@/lib/stats'
import { honestManifest } from './data'
import './act2.css'

const SLOPE = { min: 0.8, max: 1.2, step: 0.005 }
const INTERCEPT = { min: -3, max: 3, step: 0.05 }
const START = { slope: 1, intercept: 0 }

/** The fixed sub-sample: every 25th honest row → 16 hulls, in kilotonnes so the squares are visible. */
export const lsSample = honestManifest.filter((_, i) => i % 25 === 0).map((d) => ({ hull: d.hull, x: d.declaredMass / 1000, y: d.inferredMass / 1000 }))
const XS = lsSample.map((p) => p.x)
const YS = lsSample.map((p) => p.y)
const FIT = linearRegression(XS, YS)
const X_DOMAIN = padDomain([Math.min(...XS), Math.max(...XS)], 0.12)
const Y_DOMAIN = padDomain([Math.min(...YS), Math.max(...YS)], 0.18)

export function LeastSquaresVisual() {
  const [slope, setSlope] = useState(START.slope)
  const [intercept, setIntercept] = useState(START.intercept)

  const residuals = useMemo(() => residualsForLine(XS, YS, slope, intercept), [slope, intercept])
  const sse = useMemo(() => sseForLine(XS, YS, slope, intercept), [slope, intercept])
  const excess = sse - FIT.sse
  const atFit = slope === FIT.slope && intercept === FIT.intercept

  return (
    <Panel label="ENGINEERING · MINIMIZE THE SQUARES" tone="engineering" status={`n = ${lsSample.length} honest hulls · kt`}>
      <div className="dr-controls">
        <Slider label="slope b" value={slope} min={SLOPE.min} max={SLOPE.max} step={SLOPE.step} onChange={setSlope} format={(v) => fmt(v, 3)} />
        <Slider label="intercept a" value={intercept} min={INTERCEPT.min} max={INTERCEPT.max} step={INTERCEPT.step} units="kt" onChange={setIntercept} format={(v) => fmt(v, 2)} />
        <div className="dr-act2__buttons">
          <button
            type="button"
            className="dr-btn dr-btn--sm dr-btn--primary"
            disabled={atFit}
            onClick={() => {
              setSlope(FIT.slope)
              setIntercept(FIT.intercept)
            }}
          >
            SNAP TO LSRL
          </button>
          <button
            type="button"
            className="dr-btn dr-btn--sm"
            disabled={slope === START.slope && intercept === START.intercept}
            onClick={() => {
              setSlope(START.slope)
              setIntercept(START.intercept)
            }}
          >
            RESET
          </button>
        </div>
      </div>

      <SquaresPlot slope={slope} intercept={intercept} residuals={residuals} />
      <Legend
        items={[
          { label: 'candidate line ŷ = a + b·x', color: semanticColor('alt'), shape: 'line' },
          { label: 'residual y − ŷ', color: semanticColor('residual'), shape: 'line' },
          { label: 'squared residual (area ∝ (y − ŷ)²)', color: semanticColor('shadeCaution'), shape: 'area' },
        ]}
      />

      <ReadoutRow>
        <Readout label="SSE · candidate" value={fmt(sse, 2)} units="kt²" tone="engineering" live />
        <Readout label="SSE · minimum" value={fmt(FIT.sse, 2)} units="kt²" size="sm" />
        <Readout label="excess over minimum" value={fmt(excess, 2)} units="kt²" size="sm" tone={excess < 0.005 ? 'engineering' : 'default'} />
        <Readout label="candidate" value={`ŷ = ${fmt(intercept, 2)} ${slope < 0 ? '−' : '+'} ${fmt(Math.abs(slope), 3)}·x`} size="sm" />
        <Readout label="LSRL (exact)" value={FIT.equation(3)} size="sm" tone="engineering" />
      </ReadoutRow>

      <SseTrace intercept={intercept} slope={slope} />
    </Panel>
  )
}

function SquaresPlot({ slope, intercept, residuals }: { slope: number; intercept: number; residuals: number[] }) {
  const frame = useChartFrame({ height: 320, yLabel: true })
  const x = useMemo(() => scaleLinear().domain(X_DOMAIN).range([0, frame.innerWidth]), [frame.innerWidth])
  const y = useMemo(() => scaleLinear().domain(Y_DOMAIN).range([frame.innerHeight, 0]), [frame.innerHeight])
  /** Pixels per kt on the y axis — the square's side uses this on BOTH axes so area ∝ residual². */
  const pxPerKt = frame.innerHeight / (Y_DOMAIN[1] - Y_DOMAIN[0])
  const xMean = FIT.xMean

  const table = useMemo(
    () => ({
      columns: ['hull', 'declared (kt)', 'inferred (kt)', 'predicted (kt)', 'residual (kt)', 'squared residual (kt²)'],
      rows: lsSample.map((p, i) => [p.hull, p.x, p.y, Number((intercept + slope * p.x).toPrecision(5)), Number(residuals[i].toPrecision(4)), Number((residuals[i] * residuals[i]).toPrecision(4))]),
      caption: `candidate line ŷ = ${fmt(intercept, 2)} + ${fmt(slope, 3)}·x`,
    }),
    [slope, intercept, residuals],
  )

  const linePath = `M${x(X_DOMAIN[0])},${y(intercept + slope * X_DOMAIN[0])}L${x(X_DOMAIN[1])},${y(intercept + slope * X_DOMAIN[1])}`

  return (
    <ChartSurface
      frame={frame}
      ariaLabel="Inferred mass against declared mass for 16 honest hulls, with a candidate line and each squared residual drawn as a square"
      description="Scatterplot of inferred mass against declared mass in kilotonnes. A candidate line set by the sliders; each point's residual is drawn as a vertical segment and as a square whose area is the squared residual. The sum of the squares' areas is the SSE the least-squares line minimizes."
      table={table}
    >
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <YAxis scale={y} width={frame.innerWidth} ticks={5} label="inferred mass (kt)" />
        <PlotClip frame={frame}>
          {lsSample.map((p, i) => {
            const e = residuals[i]
            const side = Math.abs(e) * pxPerKt
            const px = x(p.x)
            const yHat = y(intercept + slope * p.x)
            const yObs = y(p.y)
            const left = p.x < xMean ? px : px - side
            return (
              <g key={`${p.hull}-${i}`}>
                <rect className="dr-act2__square" x={left} y={Math.min(yObs, yHat)} width={side} height={side} fill={semanticColor('shadeCaution')} stroke={semanticColor('residual')} strokeWidth={1} strokeOpacity={0.8}>
                  <title>{`${p.hull}: residual ${fmt(e, 3)} kt, squared ${fmt(e * e, 4)} kt²`}</title>
                </rect>
                <line x1={px} x2={px} y1={yObs} y2={yHat} stroke={semanticColor('residual')} strokeWidth={1.5} />
              </g>
            )
          })}
          <path className="dr-mark dr-mark--line" d={linePath} fill="none" stroke={semanticColor('alt')} strokeWidth={chartTheme.stroke.fit} strokeLinecap="round" />
          {lsSample.map((p, i) => (
            <circle key={`d-${i}`} className="dr-mark dr-mark--dot" cx={x(p.x)} cy={y(p.y)} r={chartTheme.mark.dotR} fill={chartTheme.color.series[0]} fillOpacity={chartTheme.mark.alpha} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke">
              <title>{`${p.hull}: declared ${fmt(p.x, 2)} kt, inferred ${fmt(p.y, 2)} kt`}</title>
            </circle>
          ))}
        </PlotClip>
        <XAxis scale={x} height={frame.innerHeight} ticks={niceTicks(X_DOMAIN[0], X_DOMAIN[1], frame.innerWidth < 420 ? 4 : 7)} label="declared mass (kt)" />
      </g>
    </ChartSurface>
  )
}

/** SSE as a function of slope at the current intercept — the parabola the calc briefing refers to. */
function SseTrace({ intercept, slope }: { intercept: number; slope: number }) {
  const frame = useChartFrame({ height: 130, yLabel: true, margin: { top: 10, bottom: 34 } })
  const samples = useMemo(() => {
    const out: { b: number; sse: number }[] = []
    const n = 80
    for (let k = 0; k <= n; k++) {
      const b = SLOPE.min + ((SLOPE.max - SLOPE.min) * k) / n
      out.push({ b, sse: sseForLine(XS, YS, b, intercept) })
    }
    return out
  }, [intercept])
  const bStar = useMemo(() => samples.reduce((best, s) => (s.sse < best.sse ? s : best), samples[0]), [samples])
  const yMax = Math.max(...samples.map((s) => s.sse))
  const x = useMemo(() => scaleLinear().domain([SLOPE.min, SLOPE.max]).range([0, frame.innerWidth]), [frame.innerWidth])
  const y = useMemo(() => scaleLinear().domain([0, yMax]).nice(3).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])
  const path = samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.b)},${y(s.sse)}`).join('')
  const here = sseForLine(XS, YS, slope, intercept)
  return (
    <div className="dr-act2__trace">
      <p className="dr-act2__trace-head">SSE vs slope · at intercept a = {fmt(intercept, 2)} kt</p>
      <ChartSurface
        frame={frame}
        ariaLabel={`SSE as a function of slope at intercept ${fmt(intercept, 2)}, current slope marked`}
        description="A parabola: the sum of squared residuals against the slope of the candidate line, with the intercept held at its slider value. The current slope is marked; the curve bottoms out at the least-squares slope for that intercept."
        table={{ columns: ['slope', 'SSE (kt²)'], rows: samples.filter((_, i) => i % 4 === 0).map((s) => [Number(s.b.toFixed(3)), Number(s.sse.toPrecision(5))]), caption: `SSE vs slope at a = ${fmt(intercept, 2)}` }}
      >
        <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
          <YAxis scale={y} width={frame.innerWidth} ticks={3} label="SSE" />
          <PlotClip frame={frame}>
            <path className="dr-mark dr-mark--line" d={path} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
            <ReferenceLine x={x(bStar.b)} height={frame.innerHeight} label={`min ≈ ${fmt(bStar.b, 3)}`} anchor={bStar.b > (SLOPE.min + SLOPE.max) / 2 ? 'end' : 'start'} />
            <circle cx={x(slope)} cy={y(here)} r={chartTheme.mark.dotR + 1} fill={chartTheme.color.observed} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke">
              <title>{`b = ${fmt(slope, 3)}: SSE ${fmt(here, 2)} kt²`}</title>
            </circle>
          </PlotClip>
          <XAxis scale={x} height={frame.innerHeight} ticks={5} label="slope b" />
        </g>
      </ChartSurface>
    </div>
  )
}
