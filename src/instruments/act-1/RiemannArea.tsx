/**
 * ENGINEERING · AREA UNDER THE CURVE (calc briefing "area-under-a-curve") — the same normal density
 * the sensor watch is using, cut into rectangles. The learner adds rectangles and watches the midpoint
 * Riemann sum close on `normal.between`; then narrows the interval until it is a single point, where
 * the rectangle has width zero and the area goes with it.
 *
 * At most 200 rectangles are ever drawn. Sandoval's rule: a number without its width is not an answer.
 */
import { useMemo, useState } from 'react'
import { line as d3Line, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import { ChartSurface, Legend, PlotClip, Readout, ReadoutRow, Slider, XAxis, YAxis, chartTheme, sampleCurve, semanticColor, useChartFrame, type LegendItem } from '@/instruments/shared'
import { fmt, normal } from '@/lib/stats'
import { fleetModel, harpagia } from './data'
import { Note, stackStyle } from './_ui'

export interface RiemannAreaProps {
  mean?: number
  sd?: number
  /** Left edge of the interval, in percent of the class-table expectation. */
  from?: number
  /** Right edge of the interval. */
  to?: number
}

const MAX_RECTS = 200
const TABLE_ROWS = 40
const SD_SPAN = 4

export function RiemannArea({ mean: muProp = fleetModel.mean, sd: sdProp = fleetModel.sd, from: fromProp = fleetModel.mean, to: toProp = harpagia.ratio_pct }: RiemannAreaProps) {
  const mu = muProp
  const sigma = sdProp
  const domLo = mu - SD_SPAN * sigma
  const domHi = mu + SD_SPAN * sigma
  const sliderStep = Number((sigma / 50).toPrecision(3))

  const [rects, setRects] = useState(8)
  const [from, setFrom] = useState(Math.min(fromProp, toProp))
  const [to, setTo] = useState(Math.max(fromProp, toProp))

  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const width = (hi - lo) / rects

  /* Midpoint Riemann sum: Σ f(midpoint) · width, against the exact area from the normal model. */
  const slices = useMemo(
    () =>
      Array.from({ length: rects }, (_, i) => {
        const x0 = lo + i * width
        const x1 = x0 + width
        const mid = (x0 + x1) / 2
        const height = normal.pdf(mid, mu, sigma)
        return { i, x0, x1, mid, height, area: height * width }
      }),
    [rects, lo, width, mu, sigma],
  )
  const sum = slices.reduce((s, r) => s + r.area, 0)
  const exact = normal.between(lo, hi, mu, sigma)
  const gap = sum - exact

  const frame = useChartFrame({ height: 300, yLabel: true })
  const curve = useMemo(() => sampleCurve((x) => normal.pdf(x, mu, sigma), [domLo, domHi], 241), [mu, sigma, domLo, domHi])
  const yMax = normal.pdf(mu, mu, sigma)
  const xs = useMemo(() => scaleLinear().domain([domLo, domHi]).range([0, frame.innerWidth]), [domLo, domHi, frame.innerWidth])
  const ys = useMemo(() => scaleLinear().domain([0, yMax * 1.1]).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])
  const linePath = useMemo(
    () =>
      d3Line<{ x: number; y: number }>()
        .x((p) => xs(p.x))
        .y((p) => ys(p.y))(curve) ?? '',
    [curve, xs, ys],
  )

  const table = useMemo(
    () => ({
      columns: ['rectangle', 'left', 'midpoint', 'right', 'height f(mid)', 'area = f(mid)·Δx'],
      rows: slices.slice(0, TABLE_ROWS).map((r) => [r.i + 1, fmt(r.x0, 4), fmt(r.mid, 4), fmt(r.x1, 4), fmt(r.height, 6), fmt(r.area, 6)]),
      caption: `${rects} rectangles of width ${fmt(width, 5)} on [${fmt(lo, 3)}, ${fmt(hi, 3)}]${rects > TABLE_ROWS ? ` · first ${TABLE_ROWS} shown` : ''}`,
    }),
    [slices, rects, width, lo, hi],
  )

  const legend: LegendItem[] = [
    { label: 'normal density', color: semanticColor('fit'), shape: 'line' },
    { label: `${rects} midpoint rectangles`, color: semanticColor('shade'), shape: 'area' },
  ]

  const collapsed = hi - lo === 0
  const reset = () => {
    setRects(8)
    setFrom(Math.min(fromProp, toProp))
    setTo(Math.max(fromProp, toProp))
  }

  return (
    <Panel label="ENGINEERING · AREA UNDER THE CURVE" status={`${rects} RECTANGLES`} tone="engineering" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider label="rectangles" value={rects} min={4} max={MAX_RECTS} step={1} onChange={setRects} />
          <Slider label="interval start" value={from} min={Number(domLo.toFixed(3))} max={Number(domHi.toFixed(3))} step={sliderStep} units="%" onChange={setFrom} format={(v) => fmt(v, 2)} />
          <Slider label="interval end" value={to} min={Number(domLo.toFixed(3))} max={Number(domHi.toFixed(3))} step={sliderStep} units="%" onChange={setTo} format={(v) => fmt(v, 2)} />
          <button type="button" className="dr-btn" onClick={() => setTo(from)} disabled={collapsed}>
            COLLAPSE TO A POINT
          </button>
          <button type="button" className="dr-btn dr-btn--ghost" onClick={reset}>
            RESET
          </button>
        </div>

        <ReadoutRow>
          <Readout label="Riemann sum · Σ f(mid)·Δx" value={fmt(sum, 6)} tone="engineering" live />
          <Readout label="exact area · normal.between" value={fmt(exact, 6)} tone="engineering" live />
          <Readout label="difference" value={`${gap >= 0 ? '+' : '−'}${fmt(Math.abs(gap), 6)}`} tone={Math.abs(gap) > 1e-4 ? 'alert' : 'engineering'} live />
          <Readout label="one rectangle · Δx" value={fmt(width, 5)} units="%" size="sm" live />
        </ReadoutRow>

        <ChartSurface
          frame={frame}
          ariaLabel={`Normal density with the interval from ${fmt(lo, 2)} to ${fmt(hi, 2)} covered by ${rects} midpoint rectangles`}
          description={`The area under the density between ${fmt(lo, 2)} and ${fmt(hi, 2)} percent of expectation is approximated by ${rects} rectangles of width ${fmt(width, 5)}. The midpoint sum is ${fmt(sum, 6)}; the exact area is ${fmt(exact, 6)}. The data table lists each rectangle's left edge, midpoint, right edge, height and area.`}
          table={table}
          footer={<Legend items={legend} ariaLabel="Area key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={ys} width={frame.innerWidth} ticks={3} label="density" />
            <PlotClip frame={frame}>
              {slices.map((r) => {
                const x0 = xs(r.x0)
                const x1 = xs(r.x1)
                const top = ys(r.height)
                return (
                  <rect key={r.i} className="dr-mark dr-mark--bar" x={x0} y={top} width={Math.max(0.5, x1 - x0)} height={Math.max(0, frame.innerHeight - top)} fill={semanticColor('shade')} fillOpacity={0.5} stroke={semanticColor('residual')} strokeWidth={rects > 60 ? 0 : 0.75}>
                    <title>
                      [{fmt(r.x0, 3)}, {fmt(r.x1, 3)}) · height {fmt(r.height, 5)} · area {fmt(r.area, 6)}
                    </title>
                  </rect>
                )
              })}
              <path d={linePath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
              {[lo, hi].map((x, i) => (
                <line key={i} x1={xs(x)} x2={xs(x)} y1={0} y2={frame.innerHeight} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
              ))}
            </PlotClip>
            <XAxis scale={xs} height={frame.innerHeight} label="plume power as a percent of the class-table expectation (%)" />
          </g>
        </ChartSurface>

        <Note live>
          {rects} rectangles of width {fmt(width, 5)}. Midpoint sum {fmt(sum, 6)} against the exact {fmt(exact, 6)} — off by {fmt(Math.abs(gap), 6)}. Add rectangles: the error falls, because the rectangles are wrong by less each time.
        </Note>
        {collapsed ? (
          <Note tone="alert" live>
            The interval is a single point. Every rectangle has width {fmt(width, 5)} and therefore area {fmt(sum, 6)}: the exact area is {fmt(exact, 6)}. A continuous model assigns no probability to a point — only to an interval. "Exactly {fmt(hi, 2)} percent" has probability zero; "at least {fmt(hi, 2)} percent" does not.
          </Note>
        ) : (
          <Note>Now drag the interval end back onto the interval start. Width goes to zero and the area goes with it: for a continuous model, probability lives in intervals, never at a point.</Note>
        )}
      </div>
    </Panel>
  )
}
