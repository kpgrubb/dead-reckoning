/**
 * SENSOR · NORMAL MODEL (act-1-07) — the fleet's own normal model of plume ratio, with two cutoffs
 * the learner can drag. Below / above / between give the area under the curve; inverse runs the other
 * way, from a proportion to the cutoff that produces it. An empirical-rule overlay draws the ±1, ±2
 * and ±3 SD bands; a unit switch re-expresses the whole axis as tonnes above the declared mass and
 * shows that z does not move when the units do.
 *
 * Built from `useChartFrame` + `ChartSurface` + `sampleCurve` + d3 area/line rather than the shared
 * `DensityCurve`, because the cutoffs must be draggable. Every area comes from `normal.*`.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { area as d3Area, line as d3Line, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import {
  ChartSurface,
  Legend,
  NumberField,
  PlotClip,
  Readout,
  ReadoutRow,
  Segmented,
  Slider,
  XAxis,
  YAxis,
  chartTheme,
  sampleCurve,
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { fmt, fmtPct, linearTransformSummary, normal, zScore } from '@/lib/stats'
import { fleetModel, harpagia } from './data'
import { Note, Subhead, oneIn, stackStyle } from './_ui'

export interface NormalExplorerProps {
  /** Model centre, in percent of the class-table expectation. */
  mean?: number
  /** Model spread, in percent of the class-table expectation. */
  sd?: number
  /** The observed signature marked on the curve. */
  value?: number
}

type Mode = 'below' | 'above' | 'between' | 'inverse'
type Tail = 'below' | 'above'
type Units = 'percent' | 'tonnes'
type Toggle = 'off' | 'on'
type Handle = 'cut' | 'lo' | 'hi'

const DEFAULT_MASS_T = 19_400
const CURVE_SAMPLES = 241
const TABLE_SAMPLES = 21
const SD_SPAN = 4.2

export function NormalExplorer({ mean: muProp = fleetModel.mean, sd: sdProp = fleetModel.sd, value = harpagia.ratio_pct }: NormalExplorerProps) {
  const mu = muProp
  const sigma = sdProp
  const domLo = mu - SD_SPAN * sigma
  const domHi = mu + SD_SPAN * sigma

  const [mode, setMode] = useState<Mode>('above')
  const [tail, setTail] = useState<Tail>('above')
  /** Single cutoff for below / above; `lo`–`hi` is the pair the between mode drags. */
  const [cut, setCutValue] = useState(value)
  const [lo, setLo] = useState(mu - sigma)
  const [hi, setHi] = useState(mu + sigma)
  const [target, setTarget] = useState(0.05)
  const [units, setUnits] = useState<Units>('percent')
  const [massT, setMassT] = useState(DEFAULT_MASS_T)
  const [empirical, setEmpirical] = useState<Toggle>('off')

  /* ---- Units: y = a·x + b maps percent of expectation to tonnes above the declaration ---- */
  const a = units === 'tonnes' ? massT / 100 : 1
  const b = units === 'tonnes' ? -massT : 0
  const toDisplay = (x: number) => a * x + b
  const fromDisplay = (y: number) => (y - b) / a
  const digits = units === 'tonnes' ? 0 : 2
  const unitLabel = units === 'tonnes' ? 't' : '%'
  const axisLabel = units === 'tonnes' ? `mass above the ${massT.toLocaleString('en-US')} t declaration (t)` : 'plume power as a percent of the class-table expectation (%)'
  const shown = linearTransformSummary({ mean: mu, sd: sigma }, a, b)
  const shownMean = shown.mean ?? mu
  const shownSd = shown.sd ?? sigma

  /* ---- The cutoffs and the area ---- */
  const clamp = (x: number) => Math.min(domHi, Math.max(domLo, x))
  const inverseCut = tail === 'below' ? normal.quantile(target, mu, sigma) : normal.isf(target, mu, sigma)
  const cutLo = mode === 'inverse' ? inverseCut : mode === 'between' ? Math.min(lo, hi) : cut
  const cutHi = Math.max(lo, hi)

  let area: number
  let shadeFrom: number
  let shadeTo: number
  if (mode === 'between') {
    area = normal.between(cutLo, cutHi, mu, sigma)
    shadeFrom = cutLo
    shadeTo = cutHi
  } else if (mode === 'below' || (mode === 'inverse' && tail === 'below')) {
    area = normal.cdf(cutLo, mu, sigma)
    shadeFrom = domLo
    shadeTo = cutLo
  } else {
    area = normal.sf(cutLo, mu, sigma)
    shadeFrom = cutLo
    shadeTo = domHi
  }
  const zLower = zScore(cutLo, mu, sigma)
  const zUpper = mode === 'between' ? zScore(cutHi, mu, sigma) : null

  /* ---- Geometry ---- */
  const frame = useChartFrame({ height: 300, yLabel: true })
  const curve = useMemo(() => sampleCurve((x) => normal.pdf(x, mu, sigma), [domLo, domHi], CURVE_SAMPLES), [mu, sigma, domLo, domHi])
  const yMax = normal.pdf(mu, mu, sigma)
  const xs = useMemo(() => scaleLinear().domain([toDisplay(domLo), toDisplay(domHi)]).range([0, frame.innerWidth]), [a, b, domLo, domHi, frame.innerWidth])
  const ys = useMemo(() => scaleLinear().domain([0, yMax * 1.1]).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])

  const linePath = useMemo(
    () =>
      d3Line<{ x: number; y: number }>()
        .x((p) => xs(toDisplay(p.x)))
        .y((p) => ys(p.y))(curve) ?? '',
    [curve, xs, ys, a, b],
  )
  const shadePath = useMemo(() => {
    const from = clamp(Math.min(shadeFrom, shadeTo))
    const to = clamp(Math.max(shadeFrom, shadeTo))
    if (!(to > from)) return ''
    const pts = sampleCurve((x) => normal.pdf(x, mu, sigma), [from, to], 121)
    return (
      d3Area<{ x: number; y: number }>()
        .x((p) => xs(toDisplay(p.x)))
        .y0(frame.innerHeight)
        .y1((p) => ys(p.y))(pts) ?? ''
    )
  }, [shadeFrom, shadeTo, mu, sigma, xs, ys, frame.innerHeight, a, b])

  const table = useMemo(() => {
    const pts = sampleCurve((x) => normal.pdf(x, mu, sigma), [domLo, domHi], TABLE_SAMPLES)
    return {
      columns: [`x (${unitLabel})`, 'z', 'density', 'P(X ≤ x)'],
      rows: pts.map((p) => [fmt(toDisplay(p.x), digits), fmt(zScore(p.x, mu, sigma), 2), fmt(p.y, 4), fmt(normal.cdf(p.x, mu, sigma), 4)]),
      caption: `Normal model, mean ${fmt(shownMean, digits)} ${unitLabel}, SD ${fmt(shownSd, digits)} ${unitLabel}`,
    }
  }, [mu, sigma, domLo, domHi, digits, unitLabel, shownMean, shownSd, a, b])

  /* ---- Handle interaction ---- */
  const [dragging, setDragging] = useState<Handle | null>(null)
  const step = sigma / 20
  const valueOf = (which: Handle) => (which === 'cut' ? cut : which === 'lo' ? lo : hi)
  const setCut = (which: Handle, x: number) => {
    const v = clamp(x)
    if (which === 'cut') setCutValue(v)
    else if (which === 'lo') setLo(Math.min(v, hi))
    else setHi(Math.max(v, lo))
  }
  const onHandleDown = (which: Handle) => (e: PointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(which)
  }
  const onHandleMove = (which: Handle) => (e: PointerEvent<SVGCircleElement>) => {
    if (dragging !== which) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setCut(which, fromDisplay(xs.invert(e.clientX - rect.left - frame.margin.left)))
  }
  const onHandleUp = () => setDragging(null)
  const onHandleKey = (which: Handle) => (e: KeyboardEvent<SVGCircleElement>) => {
    const big = e.shiftKey ? 10 : 1
    const current = valueOf(which)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setCut(which, current - step * big)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setCut(which, current + step * big)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCut(which, domLo)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCut(which, domHi)
    }
  }

  const handle = (which: Handle, x: number, label: string, color: string) => {
    const px = xs(toDisplay(x))
    return (
      <g key={which} className="dr-cutoff">
        <line x1={px} x2={px} y1={0} y2={frame.innerHeight} stroke={color} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
        <text x={px + 5} y={12} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
          {label} {fmt(toDisplay(x), digits)}
        </text>
        <circle
          className={`dr-mark dr-mark--draggable${dragging === which ? ' is-dragging' : ''}`}
          cx={px}
          cy={frame.innerHeight}
          r={7}
          fill={color}
          stroke={chartTheme.color.ring}
          strokeWidth={chartTheme.mark.ring}
          paintOrder="stroke"
          tabIndex={0}
          role="slider"
          aria-label={`${label} cutoff`}
          aria-valuenow={Number(fmt(toDisplay(x), digits).replace('−', '-'))}
          aria-valuemin={Number(fmt(toDisplay(domLo), digits).replace('−', '-'))}
          aria-valuemax={Number(fmt(toDisplay(domHi), digits).replace('−', '-'))}
          aria-valuetext={`${fmt(toDisplay(x), digits)} ${unitLabel}, z ${fmt(zScore(x, mu, sigma), 2)}`}
          onPointerDown={onHandleDown(which)}
          onPointerMove={onHandleMove(which)}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
          onKeyDown={onHandleKey(which)}
        >
          <title>
            {label} cutoff {fmt(toDisplay(x), digits)} {unitLabel}
          </title>
        </circle>
      </g>
    )
  }

  const bands = [1, 2, 3].map((k) => ({
    k,
    from: mu - k * sigma,
    to: mu + k * sigma,
    p: normal.between(mu - k * sigma, mu + k * sigma, mu, sigma),
  }))

  const legend: LegendItem[] = [
    { label: `N(${fmt(shownMean, digits)}, ${fmt(shownSd, digits)}) ${unitLabel}`, color: semanticColor('fit'), shape: 'line' },
    { label: mode === 'between' ? 'area between the cutoffs' : mode === 'below' || (mode === 'inverse' && tail === 'below') ? 'area below the cutoff' : 'area above the cutoff', color: semanticColor('shade'), shape: 'area' },
    { label: `logged signature ${fmt(toDisplay(value), digits)} ${unitLabel}`, color: semanticColor('observed'), shape: 'line' },
  ]
  if (empirical === 'on') legend.push({ label: '±1, ±2, ±3 SD', color: semanticColor('null'), shape: 'dashed' })

  const areaLabel = mode === 'between' ? 'area between' : mode === 'below' || (mode === 'inverse' && tail === 'below') ? 'area below' : 'area above'

  return (
    <Panel label="SENSOR · NORMAL MODEL" status={`N(${fmt(shownMean, digits)}, ${fmt(shownSd, digits)}) ${unitLabel}`} tone="sensor" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'below', label: 'below' },
              { value: 'above', label: 'above' },
              { value: 'between', label: 'between' },
              { value: 'inverse', label: 'inverse' },
            ]}
          />
          <Segmented<Units>
            label="units"
            value={units}
            onChange={setUnits}
            options={[
              { value: 'percent', label: 'percent of expectation' },
              { value: 'tonnes', label: 'tonnes' },
            ]}
          />
          <NumberField label="declared mass" value={massT} onChange={setMassT} min={1000} max={60000} step={100} units="t" />
          <Segmented<Toggle>
            label="empirical rule"
            value={empirical}
            onChange={setEmpirical}
            options={[
              { value: 'off', label: 'off' },
              { value: 'on', label: '±1 ±2 ±3 SD' },
            ]}
          />
        </div>

        {mode === 'inverse' && (
          <div className="dr-controls">
            <Segmented<Tail>
              label="tail"
              value={tail}
              onChange={setTail}
              options={[
                { value: 'below', label: 'below the cutoff' },
                { value: 'above', label: 'above the cutoff' },
              ]}
            />
            <Slider label="target proportion" value={target} min={0.001} max={0.999} step={0.001} onChange={setTarget} format={(v) => fmt(v, 3)} />
          </div>
        )}

        <ReadoutRow>
          <Readout label="z (lower)" value={fmt(zLower, 3)} tone="sensor" live />
          <Readout label="z (upper)" value={zUpper === null ? '—' : fmt(zUpper, 3)} tone="sensor" size="sm" stale={zUpper === null} live />
          <Readout label={areaLabel} value={fmt(area, 4)} tone={area < 0.01 ? 'alert' : 'sensor'} live />
          <Readout label="that is" value={oneIn(area)} size="sm" live />
        </ReadoutRow>
        <ReadoutRow>
          <Readout label="model mean" value={fmt(shownMean, digits)} units={unitLabel} size="sm" />
          <Readout label="model SD" value={fmt(shownSd, digits)} units={unitLabel} size="sm" />
          <Readout label="logged signature" value={fmt(toDisplay(value), digits)} units={unitLabel} size="sm" tone="alert" />
          <Readout label="z of the signature" value={fmt(zScore(value, mu, sigma), 3)} size="sm" tone="alert" />
        </ReadoutRow>

        <ChartSurface
          frame={frame}
          ariaLabel={`Normal density with mean ${fmt(shownMean, digits)} and standard deviation ${fmt(shownSd, digits)} ${unitLabel}, with the ${areaLabel} shaded`}
          description={`A normal model of plume ratio. ${areaLabel} the cutoff at ${fmt(toDisplay(cutLo), digits)} ${unitLabel}${mode === 'between' ? ` and ${fmt(toDisplay(cutHi), digits)} ${unitLabel}` : ''} is ${fmt(area, 4)}, that is ${oneIn(area)}. The cutoff handles sit on the axis: focus one and press the left or right arrow key (Shift for ten steps) to move it. The data table gives the density and the cumulative proportion across the axis.`}
          table={table}
          footer={<Legend items={legend} ariaLabel="Normal model key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={ys} width={frame.innerWidth} ticks={3} label="density" />
            <PlotClip frame={frame}>
              {empirical === 'on' &&
                bands
                  .slice()
                  .reverse()
                  .map((band) => (
                    <rect key={band.k} x={xs(toDisplay(band.from))} y={0} width={Math.max(0, xs(toDisplay(band.to)) - xs(toDisplay(band.from)))} height={frame.innerHeight} fill={semanticColor('null')} fillOpacity={0.07} />
                  ))}
              {shadePath && <path d={shadePath} fill={semanticColor('shade')} fillOpacity={0.55} />}
              <path d={linePath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
              <line x1={xs(toDisplay(value))} x2={xs(toDisplay(value))} y1={0} y2={frame.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
              {empirical === 'on' &&
                bands.map((band, i) => (
                  <g key={`lab-${band.k}`}>
                    <line x1={xs(toDisplay(band.from))} x2={xs(toDisplay(band.from))} y1={0} y2={frame.innerHeight} stroke={semanticColor('null')} strokeWidth={1} strokeDasharray={chartTheme.dash} />
                    <line x1={xs(toDisplay(band.to))} x2={xs(toDisplay(band.to))} y1={0} y2={frame.innerHeight} stroke={semanticColor('null')} strokeWidth={1} strokeDasharray={chartTheme.dash} />
                    <text x={xs(toDisplay(band.to)) - 4} y={26 + i * 14} textAnchor="end" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                      ±{band.k} SD · {fmtPct(band.p, 1)}
                    </text>
                  </g>
                ))}
            </PlotClip>
            {(mode === 'below' || mode === 'above') && handle('cut', cutLo, 'cutoff', semanticColor('rejected'))}
            {mode === 'between' && handle('lo', cutLo, 'lower', semanticColor('rejected'))}
            {mode === 'between' && handle('hi', cutHi, 'upper', semanticColor('rejected'))}
            {mode === 'inverse' && (
              <g>
                <line x1={xs(toDisplay(cutLo))} x2={xs(toDisplay(cutLo))} y1={0} y2={frame.innerHeight} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
                <text x={xs(toDisplay(cutLo)) + 5} y={12} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                  cutoff {fmt(toDisplay(cutLo), digits)}
                </text>
              </g>
            )}
            <XAxis scale={xs} height={frame.innerHeight} label={axisLabel} />
          </g>
        </ChartSurface>

        {mode === 'inverse' ? (
          <Note tone="ok" live>
            Running the model backwards: the cutoff with {fmt(target, 3)} of the model {tail === 'below' ? 'below' : 'above'} it is {fmt(toDisplay(cutLo), digits)} {unitLabel}, a z of {fmt(zLower, 3)}. Given an area, the model returns a value; given a value, it returns an area. The same curve, read in either direction.
          </Note>
        ) : (
          <Note live>
            {areaLabel} the cutoff: {fmt(area, 4)} of the model, or {oneIn(area)}. Drag a handle, or focus one and press ← / → (Shift for ten steps).
          </Note>
        )}

        {empirical === 'on' && (
          <Note>
            Empirical rule: {fmtPct(bands[0].p, 1)} of a normal model lies within ±1 SD, {fmtPct(bands[1].p, 1)} within ±2 SD and {fmtPct(bands[2].p, 1)} within ±3 SD. The 68–95–99.7 shorthand is those three numbers rounded — it is a reading of the curve, not a separate rule.
          </Note>
        )}

        <section aria-label="Units">
          <Subhead>Units · z does not move</Subhead>
          <Note tone={units === 'tonnes' ? 'ok' : 'muted'}>
            {units === 'tonnes' ? (
              <>
                The axis now reads tonnes above a declaration of {massT.toLocaleString('en-US')} t: x_t = (x% − 100) ÷ 100 × {massT.toLocaleString('en-US')}. The mean moved to {fmt(shownMean, digits)} t and the SD scaled to {fmt(shownSd, digits)} t — centre shifts and scales, spread only scales. The standardized distance is unchanged, because the same factor divides out of both the numerator and the denominator: z = {fmt(zScore(value, mu, sigma), 3)} either way.
              </>
            ) : (
              <>
                The axis reads percent of the class-table expectation. Switch to tonnes and the numbers change but the picture does not: a linear rescaling moves the mean and scales the SD, and z survives it intact.
              </>
            )}
          </Note>
        </section>
      </div>
    </Panel>
  )
}
