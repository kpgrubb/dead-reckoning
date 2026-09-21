/**
 * SENSOR · DELAY MODEL (act-5-02) — "One in seven."
 *
 * The Lane's honest Mark-9 delay is a normal model centred on the nominal plot. This instrument runs
 * it in both directions, with the INVERSE direction front and centre because act-5-02's mission beat
 * is an inverse question: *give me the delay that only one honest transit in a hundred exceeds.*
 *
 *   AREA → CUTOFF   enter a tail area (or a percentile) and read the delay, from `normal.quantile`.
 *   CUTOFF → AREA   enter a delay and read the area, from `normal.cdf` / `normal.sf`.
 *
 * μ and σ are locked readouts, not dials — they are the Lane's honest population, measured from the
 * Ledger. The population toggle swaps to the nineteen diverted transits so the contrast is visible:
 * the same arithmetic, a centre nearly three days later.
 *
 * The side panel is a normal probability plot. The honest delays lie on a line, so a normal model is
 * reasonable for them. Squared delay — the quantity that averages into a variance — bends hard, and
 * the correlation readout measures the bend rather than asserting it (AP 5.2).
 *
 * Built on `useChartFrame` + `ChartSurface` + `sampleCurve` + d3 area/line (after act-1's
 * NormalExplorer) because the cutoff must be draggable; every area comes from `normal.*` and every
 * plotted point from `./data`.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { area as d3Area, line as d3Line, scaleLinear } from 'd3'
import { Panel } from '@/components'
import {
  ChartSurface,
  Legend,
  NumberField,
  PlotClip,
  Readout,
  ReadoutRow,
  Scatter,
  Segmented,
  XAxis,
  YAxis,
  chartTheme,
  sampleCurve,
  semanticColor,
  useChartFrame,
  type LegendItem,
  type ScatterPoint,
} from '@/instruments/shared'
import { fmt, fmtInt, linearRegression, normal, skewness, zScore } from '@/lib/stats'
import { DELAY_CUTOFF_1PCT, LANE_DELAY_MEAN, LANE_DELAY_SD, NINETEEN_MEAN_DELAY, NINETEEN_N, NINETEEN_SD_DELAY, honestDelays, nineteenDelays } from './data'
import './act5.css'

type Mode = 'inverse' | 'forward'
type Tail = 'above' | 'below'
type Population = 'lane' | 'nineteen'
type PlotVar = 'delay' | 'squared'

const SD_SPAN = 4.2
const CURVE_SAMPLES = 241
const TABLE_SAMPLES = 21
/** Points on the probability plot — an evenly spaced subsample of the sorted values. */
const PLOT_POINTS = 120

/** "1 in N" phrasing for a tail area. */
function oneIn(p: number): string {
  if (!(p > 0) || !Number.isFinite(p)) return '—'
  const n = 1 / p
  if (n < 1.5) return '1 in 1'
  if (n >= 1e6) return `1 in ${(n / 1e6).toPrecision(2)} million`
  return `1 in ${Math.round(n).toLocaleString('en-US')}`
}

/**
 * A normal probability plot: an evenly spaced subsample of the sorted values against the standard
 * normal quantile of its plotting position (i + 0.5)/n. Straight ⇒ a normal model is reasonable.
 */
function probabilityPlot(values: readonly number[], points = PLOT_POINTS): ScatterPoint[] {
  const sorted = values.slice().sort((a, b) => a - b)
  const k = Math.min(points, sorted.length)
  const out: ScatterPoint[] = []
  for (let i = 0; i < k; i++) {
    const p = (i + 0.5) / k
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * sorted.length - 0.5)))
    out.push({ x: normal.standardQuantile(p), y: sorted[idx] })
  }
  return out
}

export interface DelayNormalExplorerProps {
  /** Mode on load — inverse is the one act-5-02 asks for. */
  mode?: Mode
  /** Tail area entered in inverse mode. */
  area?: number
  /** Delay entered in forward mode, days. */
  cutoff?: number
}

export function DelayNormalExplorer({ mode: mode0 = 'inverse', area: area0 = 0.01, cutoff: cutoff0 = NINETEEN_MEAN_DELAY }: DelayNormalExplorerProps = {}) {
  const [mode, setMode] = useState<Mode>(mode0)
  const [tail, setTail] = useState<Tail>('above')
  const [population, setPopulation] = useState<Population>('lane')
  const [target, setTarget] = useState(area0)
  const [cut, setCutValue] = useState(cutoff0)
  const [plotVar, setPlotVar] = useState<PlotVar>('delay')
  const [dragging, setDragging] = useState(false)

  const isLane = population === 'lane'
  const mu = isLane ? LANE_DELAY_MEAN : NINETEEN_MEAN_DELAY
  const sigma = isLane ? LANE_DELAY_SD : NINETEEN_SD_DELAY
  const popN = isLane ? honestDelays.length : nineteenDelays.length
  const popLabel = isLane ? 'Lane · honest transits' : 'the nineteen'

  const domLo = mu - SD_SPAN * sigma
  const domHi = mu + SD_SPAN * sigma
  const clamp = (x: number) => Math.min(domHi, Math.max(domLo, x))

  /* ---- The two directions ---- */
  const inverseCut = tail === 'below' ? normal.quantile(target, mu, sigma) : normal.isf(target, mu, sigma)
  const cutoff = mode === 'inverse' ? inverseCut : cut
  const areaAbove = normal.sf(cutoff, mu, sigma)
  const areaBelow = normal.cdf(cutoff, mu, sigma)
  const shownArea = tail === 'below' ? areaBelow : areaAbove
  const z = zScore(cutoff, mu, sigma)
  const shadeFrom = tail === 'below' ? domLo : cutoff
  const shadeTo = tail === 'below' ? cutoff : domHi
  const areaLabel = tail === 'below' ? 'area below the cutoff' : 'area above the cutoff'

  /* ---- Main display ---- */
  const frame = useChartFrame({ height: 300, yLabel: true })
  const curve = useMemo(() => sampleCurve((x) => normal.pdf(x, mu, sigma), [domLo, domHi], CURVE_SAMPLES), [mu, sigma, domLo, domHi])
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
  const shadePath = useMemo(() => {
    const from = clamp(Math.min(shadeFrom, shadeTo))
    const to = clamp(Math.max(shadeFrom, shadeTo))
    if (!(to > from)) return ''
    const pts = sampleCurve((x) => normal.pdf(x, mu, sigma), [from, to], 121)
    return (
      d3Area<{ x: number; y: number }>()
        .x((p) => xs(p.x))
        .y0(frame.innerHeight)
        .y1((p) => ys(p.y))(pts) ?? ''
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shadeFrom, shadeTo, mu, sigma, xs, ys, frame.innerHeight])

  const table = useMemo(() => {
    const pts = sampleCurve((x) => normal.pdf(x, mu, sigma), [domLo, domHi], TABLE_SAMPLES)
    return {
      columns: ['delay (d)', 'z', 'density', 'P(X ≤ x)', 'P(X ≥ x)'],
      rows: pts.map((p) => [fmt(p.x, 2), fmt(zScore(p.x, mu, sigma), 2), fmt(p.y, 4), fmt(normal.cdf(p.x, mu, sigma), 4), fmt(normal.sf(p.x, mu, sigma), 4)]),
      caption: `Normal model of Mark-9 delay for ${popLabel}: mean ${fmt(mu, 3)} d, SD ${fmt(sigma, 3)} d`,
    }
  }, [mu, sigma, domLo, domHi, popLabel])

  /* ---- Draggable cutoff (forward mode) ---- */
  const step = sigma / 20
  const setCut = (x: number) => setCutValue(Number(clamp(x).toPrecision(12)))
  const onHandleDown = (e: PointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
  }
  const onHandleMove = (e: PointerEvent<SVGCircleElement>) => {
    if (!dragging) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setCut(xs.invert(e.clientX - rect.left - frame.margin.left))
  }
  const onHandleUp = () => setDragging(false)
  const onHandleKey = (e: KeyboardEvent<SVGCircleElement>) => {
    const big = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setCut(cut - step * big)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setCut(cut + step * big)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCut(domLo)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCut(domHi)
    }
  }

  /* ---- Probability plot ---- */
  const plotValues = useMemo(() => (plotVar === 'delay' ? honestDelays : honestDelays.map((d) => d * d)), [plotVar])
  const points = useMemo(() => probabilityPlot(plotValues), [plotValues])
  const fit = useMemo(
    () =>
      linearRegression(
        points.map((p) => p.x),
        points.map((p) => p.y),
      ),
    [points],
  )
  const plotSkew = useMemo(() => skewness(plotValues), [plotValues])
  const plotYLabel = plotVar === 'delay' ? 'Mark-9 delay, sorted (d)' : 'squared Mark-9 delay, sorted (d²)'
  const plotName = plotVar === 'delay' ? 'honest Mark-9 delay' : 'squared Mark-9 delay'
  const straight = Math.abs(plotSkew) < 0.5

  const legend: LegendItem[] = [
    { label: `N(${fmt(mu, 3)}, ${fmt(sigma, 3)}) d · ${popLabel}`, color: semanticColor('fit'), shape: 'line' },
    { label: areaLabel, color: semanticColor('shade'), shape: 'area' },
    { label: `the nineteen's average ${fmt(NINETEEN_MEAN_DELAY, 2)} d`, color: semanticColor('observed'), shape: 'dashed' },
  ]

  const curveDescription = `Normal model of Mark-9 delay for ${popLabel}, mean ${fmt(mu, 3)} days and standard deviation ${fmt(sigma, 3)} days. The cutoff sits at ${fmt(cutoff, 3)} days, a z-score of ${fmt(z, 3)}; the ${areaLabel} is ${fmt(shownArea, 5)}, which is ${oneIn(shownArea)} transits. The average of the nineteen diverted transits, ${fmt(NINETEEN_MEAN_DELAY, 3)} days, is marked. ${mode === 'forward' ? 'The cutoff handle sits on the axis: focus it and press the left or right arrow key (Shift for ten steps) to move it.' : 'Enter an area and the model returns the cutoff that produces it.'} The data table gives density and both tail areas across the axis.`
  const plotDescription = `Normal probability plot: ${fmtInt(points.length)} evenly spaced values of ${plotName}, sorted, against the standard normal quantile of their plotting positions. The least-squares line through the points has slope ${fmt(fit.slope, 4)} and correlation r = ${fmt(fit.r, 4)}. The sample's skewness is ${fmt(plotSkew, 3)}. ${straight ? 'The points lie close to the line, so a normal model is reasonable.' : 'The points bend away from the line, so a normal model is not reasonable for this variable.'}`

  return (
    <Panel label="SENSOR · DELAY MODEL · AREA AND CUTOFF" status={`N(${fmt(mu, 3)}, ${fmt(sigma, 3)}) d`} tone="sensor" led="on">
      <div className="dr-act5__stack">
        <div className="dr-controls">
          <Segmented<Mode>
            label="MODE"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'inverse', label: 'AREA → CUTOFF' },
              { value: 'forward', label: 'CUTOFF → AREA' },
            ]}
          />
          <Segmented<Tail>
            label="TAIL"
            value={tail}
            onChange={setTail}
            options={[
              { value: 'above', label: 'above the cutoff' },
              { value: 'below', label: 'below the cutoff' },
            ]}
          />
          <Segmented<Population>
            label="POPULATION"
            value={population}
            onChange={setPopulation}
            options={[
              { value: 'lane', label: 'Lane · honest transits' },
              { value: 'nineteen', label: 'the nineteen' },
            ]}
          />
          {mode === 'inverse' ? (
            <NumberField label={tail === 'above' ? 'area above the cutoff' : 'percentile (area below)'} value={target} onChange={(v) => setTarget(Math.min(0.999, Math.max(0.001, v)))} min={0.001} max={0.999} step={0.005} />
          ) : (
            <NumberField label="cutoff delay" value={Number(cut.toFixed(3))} onChange={setCut} min={Number(domLo.toFixed(3))} max={Number(domHi.toFixed(3))} step={0.1} units="d" />
          )}
        </div>

        <ReadoutRow>
          <Readout label="cutoff delay" value={fmt(cutoff, 3)} units="d" tone="sensor" size="lg" live />
          <Readout label={areaLabel} value={fmt(shownArea, 5)} tone={shownArea < 0.01 ? 'alert' : 'sensor'} live />
          <Readout label="that is one honest transit in" value={oneIn(shownArea)} live />
          <Readout label="z-score of the cutoff" value={fmt(z, 3)} tone="sensor" live />
        </ReadoutRow>
        <ReadoutRow>
          <Readout label={`μ · ${popLabel}`} value={fmt(mu, 4)} units="d" size="sm" />
          <Readout label={`σ · ${popLabel}`} value={fmt(sigma, 4)} units="d" size="sm" />
          <Readout label="transits measured" value={fmtInt(popN)} size="sm" />
          <Readout label="the nineteen's average" value={fmt(NINETEEN_MEAN_DELAY, 3)} units="d" size="sm" tone="alert" />
          <Readout label="1 % cutoff on the Lane" value={fmt(DELAY_CUTOFF_1PCT, 3)} units="d" size="sm" tone="log" />
        </ReadoutRow>

        <ChartSurface frame={frame} ariaLabel={`Normal density of Mark-9 delay for ${popLabel}, with the ${areaLabel} shaded`} description={curveDescription} table={table} footer={<Legend items={legend} ariaLabel="Delay model key" />}>
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={ys} width={frame.innerWidth} ticks={3} label="density" />
            <PlotClip frame={frame}>
              {shadePath && <path d={shadePath} fill={semanticColor('shade')} fillOpacity={0.55} />}
              <path className="dr-mark dr-mark--line" d={linePath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
              <line x1={xs(clamp(NINETEEN_MEAN_DELAY))} x2={xs(clamp(NINETEEN_MEAN_DELAY))} y1={0} y2={frame.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
              <text x={xs(clamp(NINETEEN_MEAN_DELAY)) + 5} y={frame.innerHeight - 6} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                the nineteen&rsquo;s average
              </text>
              <line x1={xs(clamp(cutoff))} x2={xs(clamp(cutoff))} y1={0} y2={frame.innerHeight} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
              <text x={xs(clamp(cutoff)) + 5} y={12} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                cutoff {fmt(cutoff, 2)} d
              </text>
            </PlotClip>
            {mode === 'forward' && (
              <circle
                className={`dr-mark dr-mark--draggable${dragging ? ' is-dragging' : ''}`}
                cx={xs(clamp(cut))}
                cy={frame.innerHeight}
                r={7}
                fill={semanticColor('rejected')}
                stroke={chartTheme.color.ring}
                strokeWidth={chartTheme.mark.ring}
                paintOrder="stroke"
                tabIndex={0}
                role="slider"
                aria-label="cutoff delay"
                aria-valuenow={Number(cut.toFixed(3))}
                aria-valuemin={Number(domLo.toFixed(3))}
                aria-valuemax={Number(domHi.toFixed(3))}
                aria-valuetext={`${fmt(cut, 3)} days, z ${fmt(z, 3)}`}
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                onKeyDown={onHandleKey}
              >
                <title>cutoff {fmt(cut, 3)} d</title>
              </circle>
            )}
            <XAxis scale={xs} height={frame.innerHeight} label="Mark-9 delay against the nominal plot (d)" />
          </g>
        </ChartSurface>

        <p className="dr-act5__note" aria-live="polite">
          {mode === 'inverse' ? (
            <>
              Running the model backwards: the delay with <strong>{fmt(target, 3)}</strong> of honest transits {tail === 'below' ? 'below' : 'above'} it is <strong>{fmt(cutoff, 3)} d</strong>, a z of {fmt(z, 3)}. Given an area, the model returns a value.
            </>
          ) : (
            <>
              Forwards: a delay of <strong>{fmt(cutoff, 3)} d</strong> has {fmt(shownArea, 5)} of the model {tail === 'below' ? 'below' : 'above'} it — {oneIn(shownArea)} honest transits. Drag the handle, or focus it and press ← / → (Shift for ten steps).
            </>
          )}
        </p>

        <section aria-label="Normal probability plot">
          <h4 className="dr-act5__head">Assessing normality · probability plot</h4>
          <div className="dr-controls">
            <Segmented<PlotVar>
              label="VARIABLE"
              value={plotVar}
              onChange={setPlotVar}
              options={[
                { value: 'delay', label: 'honest Mark-9 delay' },
                { value: 'squared', label: 'squared delay (d²)' },
              ]}
            />
          </div>
          <Scatter points={points} line={{ slope: fit.slope, intercept: fit.intercept }} xLabel="standard normal quantile (z)" yLabel={plotYLabel} height={260} ariaLabel={`Normal probability plot of ${plotName}`} description={plotDescription} />
          <ReadoutRow>
            <Readout label="points plotted" value={fmtInt(points.length)} size="sm" />
            <Readout label="r · straightness of the plot" value={fmt(fit.r, 4)} size="sm" tone={straight ? 'sensor' : 'alert'} live />
            <Readout label="skewness of the variable" value={fmt(plotSkew, 3)} size="sm" tone={straight ? 'default' : 'alert'} live />
            <Readout label="verdict" value={straight ? 'a normal model is reasonable' : 'a normal model is not reasonable'} size="sm" tone={straight ? 'sensor' : 'alert'} live />
          </ReadoutRow>
        </section>

        <p className="dr-act5__note">
          Read the probability plot the way you read a residual plot: <strong>straight is good.</strong> A point&rsquo;s x is where a normal model says the {fmtInt(points.length)}th-from-bottom value should sit; its y is where it actually sits. The honest delays track the line, so the model earns its keep. Squared delay bows away from it — no amount of averaging fixes that, because{' '}
          <em>
            the Central Limit Theorem says nothing about the population. It is a statement about x̄ only, and it leaves the transits exactly as skewed as it found them.
          </em>{' '}
          One honest transit in {oneIn(normal.sf(NINETEEN_MEAN_DELAY, LANE_DELAY_MEAN, LANE_DELAY_SD)).replace('1 in ', '')} is as late as the nineteen&rsquo;s average. One. The question act-5-03 asks is what {fmtInt(NINETEEN_N)} of them averaging that is worth.
        </p>
      </div>
    </Panel>
  )
}
