/**
 * ENGINEERING · COLD-RUN DISTRIBUTION (act-4-05) — the Chief's table of "hours of cold running
 * required", editable cell by cell, against the same question asked of a continuous variable.
 *
 * Discrete mode: an editable pmf over the cold-hours support with a running Σp that refuses to be
 * ignored when it is not 1 (Ebele's first table sums to 1.04), a probability query that keeps
 * P(X ≥ k) and P(X > k) on screen together, and a cumulative step plot of F(k).
 *
 * Continuous mode: sink temperature at hour 60 of a Watch run, N(240, 9) °C, with two draggable
 * cutoffs. Collapse the interval and the area goes with it — P(T = 240) = 0, and 240 is still the
 * most likely neighbourhood.
 *
 * Every probability comes from `discreteRV` / `rvProb` / `rvCdf` / `normal.*`; nothing here is
 * hand-computed. The bars are drawn from `useChartFrame` + `ChartSurface` because each bar cap is a
 * draggable handle.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { area as d3Area, line as d3Line, scaleBand, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import {
  BandAxis,
  ChartSurface,
  Legend,
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
import { discreteRV, fmt, fmtPct, normal, rvCdf, rvProb, type DiscreteRV } from '@/lib/stats'
import { COLD_HOURS_PROBS, COLD_HOURS_PROBS_BAD, COLD_HOURS_VALUES, SINK_TEMP, WATCH_IN_WRITING_HOURS, WATCH_WORKING_HOURS } from './data'
import { Note, Subhead, stackStyle } from './_ui'

export interface DistributionEditorProps {
  /** The support of the discrete variable — hours of cold running required. */
  values?: readonly number[]
  /** The starting probability table. */
  probs?: readonly number[]
  /** Allow the cells to be edited (false renders the table read-only). */
  editable?: boolean
  /** Which half of the module opens. */
  mode?: 'discrete' | 'continuous'
}

type Mode = 'discrete' | 'continuous'
type View = 'pmf' | 'cdf'
type Query = 'eq' | 'le' | 'ge' | 'gt'
type Preset = 'canonical' | 'ensign' | 'custom'
type Cutoff = 'lo' | 'hi'

const QUERY_LABEL: Record<Query, string> = { eq: 'P(X = k)', le: 'P(X ≤ k)', ge: 'P(X ≥ k)', gt: 'P(X > k)' }
const CELL_STEP = 0.01
const TEMP_SPAN = 4
const CURVE_SAMPLES = 241

export function DistributionEditor({
  values: valuesProp = COLD_HOURS_VALUES,
  probs: probsProp = COLD_HOURS_PROBS,
  editable = true,
  mode: modeProp = 'discrete',
}: DistributionEditorProps) {
  const values = useMemo(() => [...valuesProp], [valuesProp])

  const [mode, setMode] = useState<Mode>(modeProp)
  const [view, setView] = useState<View>('pmf')
  const [probs, setProbs] = useState<number[]>(() => [...probsProp])
  const [preset, setPreset] = useState<Preset>('canonical')
  const [query, setQuery] = useState<Query>('gt')
  const [kIndex, setKIndex] = useState(() => {
    const i = values.indexOf(WATCH_WORKING_HOURS)
    return i >= 0 ? i : Math.floor(values.length / 2)
  })
  const [note, setNote] = useState<string | null>(null)

  /* ---- The table, and whether it is a probability distribution at all ---- */
  const total = probs.reduce((a, b) => a + b, 0)
  const valid = Math.abs(total - 1) <= 1e-9
  const normalised = useMemo(() => (total > 0 ? probs.map((p) => p / total) : probs.map(() => 1 / probs.length)), [probs, total])
  const rv: DiscreteRV = useMemo(() => discreteRV(values, valid ? probs : normalised), [values, probs, valid, normalised])

  const k = values[Math.min(values.length - 1, Math.max(0, kIndex))]

  const setCell = (i: number, p: number) => {
    const next = probs.slice()
    next[i] = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0))
    setProbs(next)
    setPreset('custom')
    setNote(null)
  }
  const loadPreset = (which: Preset) => {
    if (which === 'canonical') setProbs([...COLD_HOURS_PROBS])
    else if (which === 'ensign') setProbs([...COLD_HOURS_PROBS_BAD])
    setPreset(which)
    setNote(null)
  }
  const normalise = () => {
    if (!(total > 0)) return
    setProbs(probs.map((p) => Math.round((p / total) * 1e6) / 1e6))
    setPreset('custom')
    setNote(`Divided every cell by ${fmt(total, 4)}. The shape is unchanged; the table now sums to 1.`)
  }

  /* ---- The probability query ---- */
  const pEq = rvProb(rv, (x) => x === k)
  const pLe = rvCdf(rv, k)
  const pGe = rvProb(rv, (x) => x >= k)
  const pGt = rvProb(rv, (x) => x > k)
  const queryValue = query === 'eq' ? pEq : query === 'le' ? pLe : query === 'ge' ? pGe : pGt
  const selected = useMemo(
    () => values.map((v) => (query === 'eq' ? v === k : query === 'le' ? v <= k : query === 'ge' ? v >= k : v > k)),
    [values, query, k],
  )

  /* ---- The registry readouts ---- */
  const pOver64 = rvProb(rv, (x) => x > WATCH_WORKING_HOURS)
  const pAtLeast64 = rvProb(rv, (x) => x >= WATCH_WORKING_HOURS)
  const pOver60 = rvProb(rv, (x) => x > WATCH_IN_WRITING_HOURS)

  /* ================================ Discrete geometry ================================ */
  const frame = useChartFrame({ height: 280, yLabel: true })
  const categories = useMemo(() => values.map((v) => String(v)), [values])
  const band = useMemo(
    () => scaleBand<string>().domain(categories).range([0, frame.innerWidth]).paddingInner(0.25).paddingOuter(0.1),
    [categories, frame.innerWidth],
  )
  const shown = view === 'pmf' ? (valid ? probs : normalised) : values.map((v) => rvCdf(rv, v))
  const yMax = Math.max(0.001, ...shown) * 1.12
  const y = useMemo(() => scaleLinear().domain([0, view === 'cdf' ? 1.05 : yMax]).range([frame.innerHeight, 0]), [yMax, view, frame.innerHeight])
  const barWidth = Math.min(chartTheme.mark.barMax, band.bandwidth())

  const table = useMemo(
    () => ({
      columns: ['hours of cold running x', 'p(x)', 'P(X ≤ x)', 'x · p(x)'],
      rows: values.map((v, i) => [v, fmt(rv.probs[i], 4), fmt(rvCdf(rv, v), 4), fmt(v * rv.probs[i], 4)]),
      caption: `Cold-hours pmf · E[X] = ${fmt(rv.mean, 3)} h, SD = ${fmt(rv.sd, 3)} h${valid ? '' : ' · shown on the normalised table'}`,
    }),
    [values, rv, valid],
  )

  /* ---- Draggable bar caps ---- */
  const [dragging, setDragging] = useState<number | null>(null)
  const nudge = (i: number, d: number) => setCell(i, Math.round((probs[i] + d) * 1e6) / 1e6)
  const onBarDown = (i: number) => (e: PointerEvent<SVGRectElement>) => {
    if (!editable || view !== 'pmf') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(i)
  }
  const onBarMove = (i: number) => (e: PointerEvent<SVGRectElement>) => {
    if (dragging !== i || !editable || view !== 'pmf') return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    const p = y.invert(e.clientY - rect.top - frame.margin.top)
    setCell(i, Math.round(Math.min(1, Math.max(0, p)) * 100) / 100)
  }
  const onBarUp = () => setDragging(null)
  const onBarKey = (i: number) => (e: KeyboardEvent<SVGRectElement>) => {
    if (!editable || view !== 'pmf') return
    const big = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      nudge(i, CELL_STEP * big)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      nudge(i, -CELL_STEP * big)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCell(i, 0)
    }
  }

  /* ---- The cumulative step path ---- */
  const stepPath = useMemo(() => {
    if (view !== 'cdf') return ''
    const pts: [number, number][] = []
    values.forEach((v, i) => {
      const x0 = band(String(v)) ?? 0
      const x1 = x0 + band.bandwidth()
      const f = rvCdf(rv, v)
      pts.push([x0, y(f)], [x1, y(f)])
      if (i < values.length - 1) pts.push([x1, y(rvCdf(rv, values[i + 1]))])
    })
    return d3Line<[number, number]>()
      .x((p) => p[0])
      .y((p) => p[1])(pts) ?? ''
  }, [view, values, band, rv, y])

  /* ================================ Continuous geometry ================================ */
  const tLo = SINK_TEMP.mean - TEMP_SPAN * SINK_TEMP.sd
  const tHi = SINK_TEMP.mean + TEMP_SPAN * SINK_TEMP.sd
  const [cutLo, setCutLo] = useState(SINK_TEMP.mean - SINK_TEMP.sd)
  const [cutHi, setCutHi] = useState(SINK_TEMP.mean + SINK_TEMP.sd)
  const [collapsed, setCollapsed] = useState(false)
  const lo = Math.min(cutLo, cutHi)
  const hi = Math.max(cutLo, cutHi)
  const intervalWidth = hi - lo
  const intervalArea = normal.between(lo, hi, SINK_TEMP.mean, SINK_TEMP.sd)

  const cFrame = useChartFrame({ height: 280, yLabel: true })
  const cx = useMemo(() => scaleLinear().domain([tLo, tHi]).range([0, cFrame.innerWidth]), [tLo, tHi, cFrame.innerWidth])
  const curve = useMemo(() => sampleCurve((x) => normal.pdf(x, SINK_TEMP.mean, SINK_TEMP.sd), [tLo, tHi], CURVE_SAMPLES), [tLo, tHi])
  const cyMax = normal.pdf(SINK_TEMP.mean, SINK_TEMP.mean, SINK_TEMP.sd)
  const cy = useMemo(() => scaleLinear().domain([0, cyMax * 1.12]).range([cFrame.innerHeight, 0]), [cyMax, cFrame.innerHeight])
  const cLine = useMemo(
    () =>
      d3Line<{ x: number; y: number }>()
        .x((p) => cx(p.x))
        .y((p) => cy(p.y))(curve) ?? '',
    [curve, cx, cy],
  )
  const cShade = useMemo(() => {
    if (!(hi > lo)) return ''
    const pts = sampleCurve((x) => normal.pdf(x, SINK_TEMP.mean, SINK_TEMP.sd), [lo, hi], 121)
    return (
      d3Area<{ x: number; y: number }>()
        .x((p) => cx(p.x))
        .y0(cFrame.innerHeight)
        .y1((p) => cy(p.y))(pts) ?? ''
    )
  }, [lo, hi, cx, cy, cFrame.innerHeight])

  const [cDrag, setCDrag] = useState<Cutoff | null>(null)
  const clampT = (x: number) => Math.min(tHi, Math.max(tLo, x))
  const setCut = (which: Cutoff, x: number) => {
    setCollapsed(false)
    if (which === 'lo') setCutLo(clampT(x))
    else setCutHi(clampT(x))
  }
  const cutStep = SINK_TEMP.sd / 20
  const onCutDown = (which: Cutoff) => (e: PointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setCDrag(which)
  }
  const onCutMove = (which: Cutoff) => (e: PointerEvent<SVGCircleElement>) => {
    if (cDrag !== which) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setCut(which, cx.invert(e.clientX - rect.left - cFrame.margin.left))
  }
  const onCutUp = () => setCDrag(null)
  const onCutKey = (which: Cutoff) => (e: KeyboardEvent<SVGCircleElement>) => {
    const big = e.shiftKey ? 10 : 1
    const current = which === 'lo' ? cutLo : cutHi
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setCut(which, current - cutStep * big)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setCut(which, current + cutStep * big)
    }
  }
  const collapse = () => {
    const mid = (lo + hi) / 2
    setCutLo(mid)
    setCutHi(mid)
    setCollapsed(true)
  }
  const reopen = () => {
    setCutLo(SINK_TEMP.mean - SINK_TEMP.sd)
    setCutHi(SINK_TEMP.mean + SINK_TEMP.sd)
    setCollapsed(false)
  }

  const cutoffHandle = (which: Cutoff, x: number, label: string) => {
    const px = cx(x)
    return (
      <g key={which} className="dr-cutoff">
        <line x1={px} x2={px} y1={0} y2={cFrame.innerHeight} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
        <text x={px + 5} y={12} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
          {label} {fmt(x, 1)}
        </text>
        <circle
          className={`dr-mark dr-mark--draggable${cDrag === which ? ' is-dragging' : ''}`}
          cx={px}
          cy={cFrame.innerHeight}
          r={7}
          fill={semanticColor('rejected')}
          stroke={chartTheme.color.ring}
          strokeWidth={chartTheme.mark.ring}
          paintOrder="stroke"
          tabIndex={0}
          role="slider"
          aria-label={`${label} cutoff, sink temperature`}
          aria-valuenow={Number(x.toFixed(2))}
          aria-valuemin={Number(tLo.toFixed(2))}
          aria-valuemax={Number(tHi.toFixed(2))}
          aria-valuetext={`${fmt(x, 1)} ${SINK_TEMP.units}`}
          onPointerDown={onCutDown(which)}
          onPointerMove={onCutMove(which)}
          onPointerUp={onCutUp}
          onPointerCancel={onCutUp}
          onKeyDown={onCutKey(which)}
        >
          <title>
            {label} cutoff {fmt(x, 1)} {SINK_TEMP.units}
          </title>
        </circle>
      </g>
    )
  }

  const cTable = useMemo(() => {
    const pts = sampleCurve((x) => normal.pdf(x, SINK_TEMP.mean, SINK_TEMP.sd), [tLo, tHi], 21)
    return {
      columns: [`sink temperature (${SINK_TEMP.units})`, 'density f(x)', 'P(T ≤ x)'],
      rows: pts.map((p) => [fmt(p.x, 1), fmt(p.y, 5), fmt(normal.cdf(p.x, SINK_TEMP.mean, SINK_TEMP.sd), 4)]),
      caption: `Sink temperature at hour 60 of a Watch run: N(${SINK_TEMP.mean}, ${SINK_TEMP.sd}) ${SINK_TEMP.units}`,
    }
  }, [tLo, tHi])

  /* ================================ Render ================================ */
  const pmfLegend: LegendItem[] = [
    { label: view === 'pmf' ? 'p(x)' : 'P(X ≤ x)', color: semanticColor('null'), shape: 'square' },
    { label: `${QUERY_LABEL[query].replace('k', fmt(k, 0))} = ${fmt(queryValue, 4)}`, color: semanticColor('fit'), shape: 'square' },
  ]

  const status = mode === 'continuous' ? `N(${SINK_TEMP.mean}, ${SINK_TEMP.sd}) ${SINK_TEMP.units}` : valid ? 'Σp = 1.000' : `Σp = ${fmt(total, 3)}`

  return (
    <Panel label="ENGINEERING · COLD-RUN DISTRIBUTION" status={status} tone="engineering" led={mode === 'discrete' && !valid ? 'alert' : 'on'}>
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="variable"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'discrete', label: 'hours required · discrete' },
              { value: 'continuous', label: 'sink temperature · continuous' },
            ]}
          />
        </div>

        {mode === 'discrete' ? (
          <>
            <div className="dr-controls">
              <Segmented<View>
                label="display"
                value={view}
                onChange={setView}
                options={[
                  { value: 'pmf', label: 'pmf · p(x)' },
                  { value: 'cdf', label: 'cumulative · F(k)' },
                ]}
              />
              <Segmented<Query>
                label="query"
                value={query}
                onChange={setQuery}
                options={[
                  { value: 'eq', label: 'P(X = k)' },
                  { value: 'le', label: 'P(X ≤ k)' },
                  { value: 'ge', label: 'P(X ≥ k)' },
                  { value: 'gt', label: 'P(X > k)' },
                ]}
              />
              <Slider label="k · hours" value={kIndex} min={0} max={values.length - 1} step={1} units="h" onChange={setKIndex} format={(i) => fmt(values[Math.min(values.length - 1, Math.max(0, Math.round(i)))], 0)} />
            </div>

            <div className="dr-controls">
              <Segmented<Preset>
                label="table"
                value={preset}
                onChange={loadPreset}
                options={[
                  { value: 'canonical', label: "the Chief's table" },
                  { value: 'ensign', label: "the Ensign's first table" },
                  { value: 'custom', label: 'edited', disabled: preset !== 'custom' },
                ]}
              />
              <button type="button" className="dr-btn dr-btn--primary" onClick={normalise} disabled={!editable || valid || !(total > 0)}>
                NORMALISE
              </button>
              <button type="button" className="dr-btn dr-btn--ghost" onClick={() => loadPreset('canonical')} disabled={preset === 'canonical'}>
                RESET
              </button>
            </div>

            <ReadoutRow>
              <Readout label="Σ p(x)" value={fmt(total, 4)} tone={valid ? 'engineering' : 'alert'} live />
              <Readout label="E[X]" value={fmt(rv.mean, 2)} units="h" tone="engineering" live />
              <Readout label="SD(X)" value={fmt(rv.sd, 2)} units="h" tone="engineering" live />
              <Readout label={`P(X > ${WATCH_WORKING_HOURS})`} value={fmt(pOver64, 4)} tone="alert" live />
              <Readout label={`P(X ≥ ${WATCH_WORKING_HOURS})`} value={fmt(pAtLeast64, 4)} size="sm" live />
              <Readout label={`P(X > ${WATCH_IN_WRITING_HOURS})`} value={fmt(pOver60, 4)} size="sm" live />
            </ReadoutRow>

            {!valid && (
              <Note tone="alert" live>
                The table sums to {fmt(total, 4)}, not 1. That is not a probability distribution — {total > 1 ? 'there is more than all of the outcome space in it' : 'some of the outcome space is missing'}. Every figure below is computed on the normalised table until the cells are fixed. NORMALISE divides through by {fmt(total, 4)}.
              </Note>
            )}
            {note && (
              <Note tone="ok" live>
                {note}
              </Note>
            )}

            <ChartSurface
              frame={frame}
              ariaLabel={
                view === 'pmf'
                  ? `Bar chart of the probability of each cold-hours value, ${values.length} bars, with ${QUERY_LABEL[query].replace('k', fmt(k, 0))} shaded`
                  : `Step plot of the cumulative probability F(k) over the cold-hours support, with k = ${fmt(k, 0)} marked`
              }
              description={
                view === 'pmf'
                  ? `One bar per possible number of cold hours. ${QUERY_LABEL[query].replace('k', fmt(k, 0))} is ${fmt(queryValue, 4)} and the bars in it are shaded. Each bar cap is a handle: focus one and press the up or down arrow key (Shift for ten steps) to change that cell's probability by hundredths. The data table lists every value, its probability, the cumulative probability and its contribution to the expected value.`
                  : `The cumulative probability F(k) = P(X ≤ k) as a step plot across the cold-hours support. At k = ${fmt(k, 0)} hours, F(k) = ${fmt(pLe, 4)}. The data table lists every value with its probability and cumulative probability.`
              }
              table={table}
              footer={<Legend items={pmfLegend} ariaLabel="Distribution key" />}
            >
              <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
                <YAxis scale={y} width={frame.innerWidth} ticks={4} label={view === 'pmf' ? 'probability' : 'P(X ≤ k)'} />
                <PlotClip frame={frame}>
                  {view === 'pmf'
                    ? values.map((v, i) => {
                        const x0 = (band(String(v)) ?? 0) + (band.bandwidth() - barWidth) / 2
                        const p = valid ? probs[i] : normalised[i]
                        const top = y(p)
                        return (
                          <rect
                            key={v}
                            className={`dr-mark dr-mark--bar${editable ? ' dr-mark--draggable' : ''}${dragging === i ? ' is-dragging' : ''}`}
                            x={x0}
                            y={top}
                            width={barWidth}
                            height={Math.max(0, frame.innerHeight - top)}
                            fill={selected[i] ? semanticColor('fit') : semanticColor('null')}
                            fillOpacity={chartTheme.mark.alpha}
                            rx={chartTheme.mark.barRadius}
                            tabIndex={editable ? 0 : undefined}
                            role={editable ? 'slider' : undefined}
                            aria-label={editable ? `probability of ${fmt(v, 0)} hours` : undefined}
                            aria-valuenow={editable ? Number(p.toFixed(4)) : undefined}
                            aria-valuemin={editable ? 0 : undefined}
                            aria-valuemax={editable ? 1 : undefined}
                            aria-valuetext={editable ? `${fmt(p, 3)} at ${fmt(v, 0)} hours` : undefined}
                            onPointerDown={onBarDown(i)}
                            onPointerMove={onBarMove(i)}
                            onPointerUp={onBarUp}
                            onPointerCancel={onBarUp}
                            onKeyDown={onBarKey(i)}
                          >
                            <title>
                              p({fmt(v, 0)}) = {fmt(p, 3)}
                            </title>
                          </rect>
                        )
                      })
                    : null}
                  {view === 'cdf' && <path d={stepPath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />}
                  {view === 'cdf' && (
                    <>
                      <line x1={(band(String(k)) ?? 0) + band.bandwidth() / 2} x2={(band(String(k)) ?? 0) + band.bandwidth() / 2} y1={0} y2={frame.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
                      <circle cx={(band(String(k)) ?? 0) + band.bandwidth() / 2} cy={y(pLe)} r={5} fill={semanticColor('observed')} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke" />
                    </>
                  )}
                </PlotClip>
                <BandAxis scale={band} height={frame.innerHeight} label="hours of cold running required" />
              </g>
            </ChartSurface>

            <ReadoutRow>
              <Readout label={QUERY_LABEL[query].replace('k', fmt(k, 0))} value={fmt(queryValue, 4)} tone="engineering" size="lg" live />
              <Readout label={`P(X ≥ ${fmt(k, 0)})`} value={fmt(pGe, 4)} size="sm" live />
              <Readout label={`P(X > ${fmt(k, 0)})`} value={fmt(pGt, 4)} size="sm" live />
              <Readout label={`the cell between them · p(${fmt(k, 0)})`} value={fmt(pEq, 4)} size="sm" tone={pEq > 0 ? 'alert' : 'default'} live />
            </ReadoutRow>

            <Note tone={pEq > 0 ? 'warn' : 'muted'} live>
              {pEq > 0 ? (
                <>
                  P(X ≥ {fmt(k, 0)}) = {fmt(pGe, 4)} and P(X &gt; {fmt(k, 0)}) = {fmt(pGt, 4)}. They differ by {fmt(pEq, 4)} — the whole of the cell at {fmt(k, 0)} hours, which "≥" keeps and "&gt;" throws away. On a discrete variable the boundary is a real quantity of probability, not a rounding detail: at the cellar's {WATCH_WORKING_HOURS}-hour limit the two answers are {fmtPct(pGe, 1)} and {fmtPct(pGt, 1)}.
                </>
              ) : (
                <>
                  There is no mass at {fmt(k, 0)} hours, so P(X ≥ {fmt(k, 0)}) and P(X &gt; {fmt(k, 0)}) agree. Move k onto a value the table gives weight and they part company by exactly that cell.
                </>
              )}
            </Note>

            <section aria-label="Probability table">
              <Subhead>The table · every cell editable</Subhead>
              <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)' }}>
                <table className="dr-pgrid">
                  <caption>hours of cold running required to cross the picket's sweep pattern</caption>
                  <thead>
                    <tr>
                      <th scope="col">x · hours</th>
                      {values.map((v) => (
                        <th key={v} scope="col">
                          {v}
                        </th>
                      ))}
                      <th scope="col">Σ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">p(x)</th>
                      {values.map((v, i) => (
                        <td key={v}>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={CELL_STEP}
                            value={probs[i]}
                            readOnly={!editable}
                            aria-label={`probability of ${v} hours`}
                            onChange={(e) => setCell(i, Number(e.target.value))}
                          />
                        </td>
                      ))}
                      <td className={valid ? 'is-total' : 'is-total is-invalid'} aria-live="polite">
                        {fmt(total, 3)}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">x · p(x)</th>
                      {values.map((v, i) => (
                        <td key={v}>{fmt(v * (valid ? probs[i] : normalised[i]), 2)}</td>
                      ))}
                      <td className="is-total">{fmt(rv.mean, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Note>
                A probability model has two obligations and no others: every cell is at least zero, and the cells sum to one. Type into a cell and watch Σ move. The bottom row is the expected value being built one weighted term at a time — {fmt(rv.mean, 2)} hours, which is not a value the table contains.
              </Note>
            </section>
          </>
        ) : (
          <>
            <div className="dr-controls">
              <Slider label="lower cutoff" value={cutLo} min={Number(tLo.toFixed(1))} max={Number(tHi.toFixed(1))} step={0.1} units={SINK_TEMP.units} onChange={(v) => setCut('lo', v)} format={(v) => fmt(v, 1)} />
              <Slider label="upper cutoff" value={cutHi} min={Number(tLo.toFixed(1))} max={Number(tHi.toFixed(1))} step={0.1} units={SINK_TEMP.units} onChange={(v) => setCut('hi', v)} format={(v) => fmt(v, 1)} />
              <button type="button" className="dr-btn dr-btn--primary" onClick={collapse} disabled={intervalWidth === 0}>
                COLLAPSE TO A POINT
              </button>
              <button type="button" className="dr-btn dr-btn--ghost" onClick={reopen}>
                REOPEN
              </button>
            </div>

            <ReadoutRow>
              <Readout label="interval width" value={fmt(intervalWidth, 3)} units={SINK_TEMP.units} tone="engineering" live />
              <Readout label="P(lower ≤ T ≤ upper)" value={fmt(intervalArea, 5)} tone="engineering" size="lg" live />
              <Readout label={`density at ${SINK_TEMP.mean}`} value={fmt(normal.pdf(SINK_TEMP.mean, SINK_TEMP.mean, SINK_TEMP.sd), 5)} units={`per ${SINK_TEMP.units}`} size="sm" />
              <Readout label={`P(T = ${SINK_TEMP.mean})`} value={fmt(0, 5)} size="sm" tone="alert" />
            </ReadoutRow>

            <ChartSurface
              frame={cFrame}
              ariaLabel={`Normal density of sink temperature, mean ${SINK_TEMP.mean} and standard deviation ${SINK_TEMP.sd} ${SINK_TEMP.units}, with the area between ${fmt(lo, 1)} and ${fmt(hi, 1)} shaded`}
              description={`Sink temperature at hour 60 of a Watch run, modelled as a normal curve. The area between the two cutoffs is ${fmt(intervalArea, 5)} over a width of ${fmt(intervalWidth, 3)} ${SINK_TEMP.units}. The cutoff handles sit on the axis: focus one and press the left or right arrow key (Shift for ten steps). The data table gives the density and cumulative probability across the axis.`}
              table={cTable}
            >
              <g transform={`translate(${cFrame.margin.left},${cFrame.margin.top})`}>
                <YAxis scale={cy} width={cFrame.innerWidth} ticks={3} label={`density · per ${SINK_TEMP.units}`} />
                <PlotClip frame={cFrame}>
                  {cShade && <path d={cShade} fill={semanticColor('shade')} fillOpacity={0.55} />}
                  <path d={cLine} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
                </PlotClip>
                {cutoffHandle('lo', cutLo, 'lower')}
                {cutoffHandle('hi', cutHi, 'upper')}
                <XAxis scale={cx} height={cFrame.innerHeight} label={`sink temperature at hour 60 (${SINK_TEMP.units})`} />
              </g>
            </ChartSurface>

            {collapsed || intervalWidth === 0 ? (
              <Note tone="alert" live>
                Width {fmt(intervalWidth, 3)} {SINK_TEMP.units}, area {fmt(intervalArea, 5)}. P(T = {fmt(lo, 1)}) = 0 — zero, and the Chief will show you why it is still the most likely number. The curve is tallest there, so of any two intervals of the same width, the one straddling {SINK_TEMP.mean} carries the most probability. A continuous model gives probability to neighbourhoods, never to points: "exactly {SINK_TEMP.mean}" is an event of measure zero, "within half a degree of {SINK_TEMP.mean}" is {fmt(normal.between(SINK_TEMP.mean - 0.5, SINK_TEMP.mean + 0.5, SINK_TEMP.mean, SINK_TEMP.sd), 5)}.
              </Note>
            ) : (
              <Note live>
                The area between {fmt(lo, 1)} and {fmt(hi, 1)} {SINK_TEMP.units} is {fmt(intervalArea, 5)}, over a width of {fmt(intervalWidth, 3)}. Narrow the interval and the area falls with it. Collapse it and see where that ends.
              </Note>
            )}
            <Note>
              Discrete and continuous are not two subjects. Both assign a total of one; the discrete model puts it in cells you can point at, the continuous model spreads it along an axis so that only intervals carry any. That is the whole difference, and it is why "≥ versus &gt;" matters on the hours table and does not matter here.
            </Note>
          </>
        )}
      </div>
    </Panel>
  )
}
