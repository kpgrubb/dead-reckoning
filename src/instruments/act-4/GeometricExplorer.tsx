/**
 * TACTICAL · FIRST CONTACT (act-4-10) — how many Perrine passages the ship waits through before one
 * of them diverts.
 *
 * The convention is the AP one and it is stated everywhere it matters: X counts trials **up to and
 * including** the first success, so the support is 1, 2, 3, … and never 0.
 *
 * The instrument exists to break one belief. The mean is 1/p, but the most likely single outcome is
 * always trial 1, and P(X > ⌈1/p⌉) runs near 0.36 for small p — most waits are shorter than the mean
 * and a long minority drags the average out past them. Both readouts stay on screen with those names.
 *
 * A second toggle puts the geometric question beside the binomial one for the same p, because the
 * commonest error in 4-10 is answering the other question well.
 *
 * Probabilities come from `geometric.pmf` / `cdf` / `sf` / `between` and `binomial.*`; the moments from
 * `geometricMoments`; the days from `waitScenario` in `data.ts`.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { scaleLinear } from 'd3'
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
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { binomial, binomialMoments, fmt, fmtInt, fmtPct, geometric, geometricMoments } from '@/lib/stats'
import { ARRIVALS_PER_DAY, WAIT_SCENARIOS, waitScenario, type WaitScenario } from './data'
import { KeyTable, Note, ProbabilityBar, Subhead, oneIn, stackStyle, wideGridStyle } from './_ui'

export interface GeometricExplorerProps {
  /** Probability that one Perrine passage is the diversion. */
  p?: number
  /** How many trials the pmf is drawn over. Defaults to about three expected waits. */
  kMax?: number
  /** Perrine passages past Mark 9 per day, for the conversion to days. */
  arrivalsPerDay?: number
  /** The named rates offered as presets. */
  scenarios?: readonly WaitScenario[]
}

type View = 'geometric' | 'compare'

const P_MIN = 0.005
const P_MAX = 0.5
const MAX_BARS = 120
const TARGET_BINS = 60

interface Cell {
  lo: number
  hi: number
  mid: number
  p: number
}

export function GeometricExplorer({ p: pProp = 0.02, kMax: kMaxProp, arrivalsPerDay: rateProp = ARRIVALS_PER_DAY.Perrine, scenarios = WAIT_SCENARIOS }: GeometricExplorerProps) {
  const [p, setPRaw] = useState(pProp)
  const [kState, setKRaw] = useState(() => Math.round(1 / pProp))
  const [rate, setRate] = useState(rateProp)
  const [view, setView] = useState<View>('geometric')
  const [trials, setTrials] = useState(24)

  const kMax = kMaxProp ?? Math.min(600, Math.max(20, Math.ceil(3 / p)))
  /** The axis only runs to kMax, and kMax moves with p, so k is clipped on every render. */
  const k = Math.min(kMax, Math.max(1, Math.round(kState)))
  const setP = (v: number) => {
    const next = Math.min(P_MAX, Math.max(P_MIN, v))
    setPRaw(next)
    setKRaw(Math.max(1, Math.round(1 / next)))
  }
  const setK = (v: number) => setKRaw(Math.min(kMax, Math.max(1, Math.round(v))))

  /* ---- Moments and the two numbers the module argues about ---- */
  const { mean: meanTrials, sd: sdTrials } = geometricMoments(p)
  const modeTrial = 1
  const pAtMode = geometric.pmf(modeTrial, p)
  const beyondMean = geometric.sf(Math.ceil(meanTrials), p)
  const registry = useMemo(() => waitScenario(p, `p = ${fmt(p, 4)}`), [p])
  const meanDaysAtRate = rate > 0 ? meanTrials / rate : NaN

  /* ---- The region ---- */
  const byTrialK = geometric.cdf(k, p)
  const pastK = geometric.sf(k, p)
  const atK = geometric.pmf(k, p)

  /* ---- Binning ---- */
  const binWidth = kMax > MAX_BARS ? Math.ceil(kMax / TARGET_BINS) : 1
  const binned = binWidth > 1
  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = []
    for (let c = 1; c <= kMax; c += binWidth) {
      const cHi = Math.min(kMax, c + binWidth - 1)
      out.push({ lo: c, hi: cHi, mid: (c + cHi) / 2, p: binWidth === 1 ? geometric.pmf(c, p) : geometric.between(c, cHi, p) })
    }
    return out
  }, [kMax, binWidth, p])

  /* ---- Geometry ---- */
  const frame = useChartFrame({ height: 300, yLabel: true })
  const x = useMemo(() => scaleLinear().domain([0.5, kMax + 0.5]).range([0, frame.innerWidth]), [kMax, frame.innerWidth])
  const yMax = Math.max(1e-12, ...cells.map((c) => c.p)) * 1.14
  const y = useMemo(() => scaleLinear().domain([0, yMax]).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])
  const cellPx = Math.max(1, x(1 + binWidth) - x(1) - (binned ? 0 : chartTheme.mark.gap))

  const table = useMemo(
    () => ({
      columns: [binned ? 'trial (bin)' : 'trial k', binned ? 'P(bin)' : 'P(X = k)', 'P(X ≤ k)', 'P(X > k)'],
      rows: cells.map((c) => [binned ? `${c.lo}–${c.hi}` : String(c.lo), fmt(c.p, 6), fmt(geometric.cdf(c.hi, p), 6), fmt(geometric.sf(c.hi, p), 6)]),
      caption: `Geometric(p = ${fmt(p, 4)}), trials up to and including the first success · mean ${fmt(meanTrials, 2)}, SD ${fmt(sdTrials, 2)}${binned ? ` · binned ${binWidth} trials to a bar` : ''}`,
    }),
    [cells, binned, binWidth, p, meanTrials, sdTrials],
  )

  /* ---- The k handle ---- */
  const [dragging, setDragging] = useState(false)
  const kFromPointer = (e: PointerEvent<SVGElement>) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setK(x.invert(e.clientX - rect.left - frame.margin.left))
  }
  const onHandleKey = (e: KeyboardEvent<SVGCircleElement>) => {
    const step = (e.shiftKey ? 10 : 1) * Math.max(1, binWidth)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setK(k - step)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setK(k + step)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setK(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      setK(kMax)
    }
  }

  /* ---- The comparison ---- */
  const binMoments = binomialMoments(trials, p)
  const pAtLeastOne = binomial.atLeast(1, trials, p)
  const pNone = binomial.pmf(0, trials, p)
  const geomWithin = geometric.cdf(trials, p)

  const legend: LegendItem[] = [
    { label: binned ? `P(bin) · ${binWidth} trials a bar` : 'P(X = k)', color: semanticColor('null'), shape: 'square' },
    { label: `by trial ${fmtInt(k)} · ${fmt(byTrialK, 4)}`, color: semanticColor('fit'), shape: 'square' },
    { label: `mean 1/p = ${fmt(meanTrials, 1)}`, color: semanticColor('observed'), shape: 'line' },
  ]

  const activeScenario = scenarios.find((s) => Math.abs(s.p - p) < 1e-12)

  return (
    <Panel label="TACTICAL · FIRST CONTACT" status={`p = ${fmt(p, 4)} · E[X] = ${fmt(meanTrials, 1)}`} tone="tactical" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<View>
            label="question"
            value={view}
            onChange={setView}
            options={[
              { value: 'geometric', label: 'how many passages until the first' },
              { value: 'compare', label: 'geometric against binomial' },
            ]}
          />
          <Slider label="p · diversions per passage" value={p} min={P_MIN} max={P_MAX} step={0.001} onChange={setP} format={(v) => fmt(v, 4)} />
          <NumberField label="k · trial" value={k} onChange={setK} min={1} max={kMax} step={1} />
          <Slider label="Perrine passages per day" value={rate} min={0.05} max={2} step={0.01} units="/day" onChange={setRate} format={(v) => fmt(v, 2)} />
        </div>

        <div className="dr-controls">
          <Segmented<string>
            label="rate"
            value={activeScenario ? activeScenario.label : 'set by hand'}
            onChange={(labelValue) => {
              const s = scenarios.find((x) => x.label === labelValue)
              if (s) setP(s.p)
            }}
            options={[...scenarios.map((s) => ({ value: s.label, label: s.label })), { value: 'set by hand', label: 'set by hand', disabled: !!activeScenario }]}
          />
        </div>

        <ReadoutRow>
          <Readout label="E[X] = 1/p · expected passages" value={fmt(meanTrials, 2)} tone="tactical" size="lg" live />
          <Readout label="SD = √(1−p)/p" value={fmt(sdTrials, 2)} tone="tactical" live />
          <Readout label="most likely single outcome · the mode" value={`trial ${modeTrial}`} size="sm" tone="alert" live />
          <Readout label="P(X = 1)" value={fmt(pAtMode, 4)} size="sm" live />
          <Readout label="P(X > ⌈1/p⌉) · still waiting at the mean" value={fmt(beyondMean, 4)} size="sm" tone="alert" live />
        </ReadoutRow>

        <Note tone="warn" live>
          The mean is {fmt(meanTrials, 2)} passages and the most likely single outcome is the very first one, at {fmt(pAtMode, 4)}. Those are not in conflict and neither is wrong: the distribution falls from trial 1 onward, so short waits are the commonest, while a thin tail of very long waits pulls the average up past most of them. {fmtPct(geometric.cdf(Math.ceil(meanTrials), p), 0)} of waits finish by trial {fmtInt(Math.ceil(meanTrials))}, and {fmt(beyondMean, 4)} — {fmtPct(beyondMean, 0)} — are still running. Plan on the distribution, not the mean.
        </Note>

        {view === 'geometric' ? (
          <>
            <ReadoutRow>
              <Readout label={`P(X ≤ ${fmtInt(k)}) · by trial k`} value={fmt(byTrialK, 5)} tone="tactical" size="lg" live />
              <Readout label={`P(X > ${fmtInt(k)}) · still waiting`} value={fmt(pastK, 5)} tone="alert" live />
              <Readout label={`P(X = ${fmtInt(k)})`} value={fmt(atK, 6)} size="sm" live />
              <Readout label="that is" value={oneIn(atK)} size="sm" live />
            </ReadoutRow>

            <ChartSurface
              frame={frame}
              ariaLabel={`Geometric probability distribution at p = ${fmt(p, 4)} over trials 1 to ${fmtInt(kMax)}, with the trials up to ${fmtInt(k)} shaded and the mean marked`}
              description={`X is the number of Perrine passages up to and including the first diversion, so the support starts at trial 1. ${binned ? `The display bins ${binWidth} trials to a bar.` : 'One bar per trial.'} P(X ≤ ${fmtInt(k)}) is ${fmt(byTrialK, 5)} and P(X > ${fmtInt(k)}) is ${fmt(pastK, 5)}. The expected number of trials is ${fmt(meanTrials, 2)}. The k marker sits on the axis: focus it and press the left or right arrow key (Shift for ten steps), or click on the plot. The data table lists every bar with its probability and both cumulative forms.`}
              table={table}
              footer={<Legend items={legend} ariaLabel="Geometric key" />}
            >
              <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
                <YAxis scale={y} width={frame.innerWidth} ticks={4} label="probability" />
                <PlotClip frame={frame}>
                  {cells.map((c) => {
                    const top = y(c.p)
                    return (
                      <rect
                        key={c.lo}
                        className="dr-mark dr-mark--bar"
                        x={x(c.lo - 0.5)}
                        y={top}
                        width={cellPx}
                        height={Math.max(0, frame.innerHeight - top)}
                        fill={c.hi <= k ? semanticColor('fit') : semanticColor('null')}
                        fillOpacity={chartTheme.mark.alpha}
                      >
                        <title>
                          {binned ? `trials ${c.lo}–${c.hi}` : `trial ${c.lo}`}: {fmt(c.p, 6)}
                        </title>
                      </rect>
                    )
                  })}
                  <line x1={x(meanTrials)} x2={x(meanTrials)} y1={0} y2={frame.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.line} />
                  <text x={x(meanTrials) + 5} y={12} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                    E[X] = {fmt(meanTrials, 1)}
                  </text>
                </PlotClip>
                <rect
                  x={0}
                  y={0}
                  width={frame.innerWidth}
                  height={frame.innerHeight}
                  fill="transparent"
                  onPointerDown={(e) => {
                    setDragging(true)
                    kFromPointer(e)
                  }}
                  onPointerMove={(e) => dragging && kFromPointer(e)}
                  onPointerUp={() => setDragging(false)}
                  onPointerCancel={() => setDragging(false)}
                />
                <line x1={x(k)} x2={x(k)} y1={0} y2={frame.innerHeight} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
                <circle
                  className={`dr-mark dr-mark--draggable${dragging ? ' is-dragging' : ''}`}
                  cx={x(k)}
                  cy={frame.innerHeight}
                  r={7}
                  fill={semanticColor('rejected')}
                  stroke={chartTheme.color.ring}
                  strokeWidth={chartTheme.mark.ring}
                  paintOrder="stroke"
                  tabIndex={0}
                  role="slider"
                  aria-label="k, the trial the cumulative probability is read at"
                  aria-valuenow={k}
                  aria-valuemin={1}
                  aria-valuemax={kMax}
                  aria-valuetext={`trial ${fmtInt(k)} of ${fmtInt(kMax)}`}
                  onKeyDown={onHandleKey}
                >
                  <title>k = {fmtInt(k)}</title>
                </circle>
                <XAxis scale={x} height={frame.innerHeight} label="passages up to and including the first diversion (support 1, 2, 3, …)" />
              </g>
            </ChartSurface>

            <Note live>
              Trials are counted up to and including the success, so there is no trial 0 and P(X = 1) = p exactly. By trial {fmtInt(k)} the diversion has happened with probability {fmt(byTrialK, 5)}; the ship is still waiting with probability {fmt(pastK, 5)}, which is (1 − p) raised to the {fmtInt(k)}.
            </Note>

            <section aria-label="Passages into days">
              <Subhead>Passages into days</Subhead>
              <ReadoutRow>
                <Readout label="expected passages" value={fmt(meanTrials, 2)} tone="tactical" live />
                <Readout label="passages per day" value={fmt(rate, 2)} units="/day" size="sm" live />
                <Readout label="expected days to the first diversion" value={fmt(meanDaysAtRate, 1)} units="d" tone="tactical" size="lg" live />
                <Readout label={`registry · at ${fmt(ARRIVALS_PER_DAY.Perrine, 2)}/day`} value={fmt(registry.meanDays, 1)} units="d" size="sm" />
              </ReadoutRow>
              <Note>
                Perrine hulls pass Mark 9 at {fmt(rate, 2)} a day, so {fmt(meanTrials, 2)} expected passages is {fmt(meanDaysAtRate, 1)} days of loitering — and the cellar is not measured in days, it is measured in hours of Watch. The unit conversion is the whole planning problem: a wait that is cheap in passages can be unaffordable in heat.
              </Note>
            </section>

            <KeyTable
              columns={['rate', 'p', 'E[X] passages', 'SD', 'expected days', 'P(X > ⌈1/p⌉)']}
              rows={scenarios.map((s) => [s.label, fmt(s.p, 4), fmt(s.meanTrials, 1), fmt(s.sdTrials, 1), fmt(s.meanDays, 1), fmt(s.pBeyondMean, 3)])}
              caption="The sensitivity the Ensign ran: the same question at five defensible rates."
              ariaLabel="Wait scenarios"
            />
          </>
        ) : (
          <>
            <div className="dr-controls">
              <Slider label="n · passages watched" value={trials} min={1} max={100} step={1} onChange={(v) => setTrials(Math.round(v))} format={(v) => fmtInt(v)} />
            </div>
            <div style={wideGridStyle}>
              <div>
                <Subhead>Binomial · how many diversions in {fmtInt(trials)} passages</Subhead>
                <ReadoutRow>
                  <Readout label="μ = np" value={fmt(binMoments.mean, 3)} tone="tactical" live />
                  <Readout label="σ" value={fmt(binMoments.sd, 3)} size="sm" live />
                  <Readout label="P(X = 0)" value={fmt(pNone, 4)} size="sm" live />
                  <Readout label="P(X ≥ 1)" value={fmt(pAtLeastOne, 4)} tone="tactical" live />
                </ReadoutRow>
                <ProbabilityBar value={pAtLeastOne} label={`at least one diversion in ${fmtInt(trials)} passages`} complementLabel="none" digits={4} />
                <Note>Fixed n, counting successes. The answer is a count between 0 and {fmtInt(trials)}.</Note>
              </div>
              <div>
                <Subhead>Geometric · how many passages until the first</Subhead>
                <ReadoutRow>
                  <Readout label="E[X] = 1/p" value={fmt(meanTrials, 2)} tone="tactical" live />
                  <Readout label="SD" value={fmt(sdTrials, 2)} size="sm" live />
                  <Readout label={`P(X ≤ ${fmtInt(trials)})`} value={fmt(geomWithin, 4)} tone="tactical" live />
                  <Readout label={`P(X > ${fmtInt(trials)})`} value={fmt(geometric.sf(trials, p), 4)} size="sm" live />
                </ReadoutRow>
                <ProbabilityBar value={geomWithin} label={`the first diversion arrives by passage ${fmtInt(trials)}`} complementLabel="still waiting" digits={4} />
                <Note>No fixed n. The count runs until the first success and the answer is a trial number, 1, 2, 3, …</Note>
              </div>
            </div>
            <Note tone="ok" live>
              At p = {fmt(p, 4)} over {fmtInt(trials)} passages the two questions give {fmt(pAtLeastOne, 4)} and {fmt(geomWithin, 4)} — the same number, because "at least one diversion in {fmtInt(trials)} passages" and "the first diversion arrives by passage {fmtInt(trials)}" are the same event. They part company the moment the question asks for two successes, or for the wait itself. Read the question for what is fixed: the number of trials, or the number of successes.
            </Note>
          </>
        )}
      </div>
    </Panel>
  )
}
