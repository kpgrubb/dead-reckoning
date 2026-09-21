/**
 * INTEL · CLUSTERING SIMULATION (act-4-01) — the learner designs and runs the null model, rather than
 * watching one run.
 *
 * The question: the Register's thirty-one losses contain five inside a single thirty-day window. Is
 * five a lot? The only honest answer is a model. Scatter thirty-one losses uniformly across the
 * Register's 2,260-day span, take the largest thirty-day cluster, and do that many times.
 *
 * One trial is drawn out as a strip of tick marks so the short-run point lands: random is not evenly
 * spread. The distribution of the statistic is a bar chart over integer counts, with the Register's
 * observed five marked and the tail at or above it shaded. Every readout gives the count AND the run
 * size, because a simulation estimates and the estimate is worth exactly as many runs as it took.
 *
 * All randomness is seeded (`@/lib/rng`); one trial is `simulateCluster` from the Act's data spine and
 * the largest cluster of the drawn trial is `maxClusterIn`, the same function the Register was scored
 * with. Nothing here computes a statistic by hand.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import {
  BarChart,
  ChartSurface,
  Legend,
  NumberField,
  PlotClip,
  Readout,
  ReadoutRow,
  Segmented,
  Slider,
  XAxis,
  chartTheme,
  semanticColor,
  useChartFrame,
} from '@/instruments/shared'
import { Rng, seedFrom } from '@/lib/rng'
import { fmt, fmtInt, fmtP, max, mean } from '@/lib/stats'
import { maxClusterIn } from '@/instruments/act-1/data'
import {
  CLUSTER_RUNS,
  CLUSTER_WINDOW_DAYS,
  LOSS_TOTAL,
  OBSERVED_CLUSTER,
  P_CLUSTER_SIMULATED,
  REGISTER_SPAN_DAYS,
  clusterAtLeastObservedCount,
  clusterDistribution,
  simulateCluster,
} from './data'
import { Note, Subhead, inAHundred, oneIn, stackStyle } from './_ui'

export interface ClusterSimulatorProps {
  /** Width of the cluster window, in days. */
  windowDays?: number
  /** How many losses the model scatters over the period. */
  losses?: number
  /** The period the model scatters them over, in days. */
  spanDays?: number
  /** Runs the RUN button performs. */
  runs?: RunSize
  /** The cluster the Register actually holds, marked on the distribution. */
  observed?: number
  /** Seed root; each RUN advances a counter so a re-run is a new, reproducible study. */
  seed?: string
}

type RunSize = '100' | '1000' | '10000'
type Shown = 'logged' | 'yours'

const RUN_OPTIONS = [
  { value: '100', label: '100' },
  { value: '1000', label: '1,000' },
  { value: '10000', label: '10,000' },
] as const

const MS_DAY = 86_400_000
const EPOCH = Date.UTC(2178, 0, 1)

/** Day index → the ISO date the Register would carry, so the trial is scored by `maxClusterIn`. */
function isoFor(day: number): string {
  return new Date(EPOCH + day * MS_DAY).toISOString().slice(0, 10)
}

/** One trial's loss days, drawn exactly as `simulateCluster` draws them. */
function drawTrial(r: Rng, n: number, spanDays: number): number[] {
  const d: number[] = []
  for (let i = 0; i < n; i++) d.push(Math.floor(r.uniform(0, spanDays)))
  return d.sort((a, b) => a - b)
}

/** Locate the first window of `windowDays` holding `best` losses. Geometry, not statistics. */
function locateWindow(days: readonly number[], windowDays: number, best: number): [number, number] {
  for (const start of days) {
    let count = 0
    for (const d of days) if (d >= start && d - start <= windowDays) count++
    if (count >= best) return [start, start + windowDays]
  }
  return [0, windowDays]
}

interface Study {
  runs: number
  stats: number[]
  distribution: { value: number; count: number }[]
  atOrAbove: number
}

function summarize(stats: number[], observed: number): Study {
  const counts = new Map<number, number>()
  for (const s of stats) counts.set(s, (counts.get(s) ?? 0) + 1)
  return {
    runs: stats.length,
    stats,
    distribution: [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count })),
    atOrAbove: stats.filter((s) => s >= observed).length,
  }
}

export function ClusterSimulator({
  windowDays: windowProp = CLUSTER_WINDOW_DAYS,
  losses: lossesProp = LOSS_TOTAL,
  spanDays = REGISTER_SPAN_DAYS,
  runs: runsProp = '1000',
  observed = OBSERVED_CLUSTER,
  seed = 'act-4-01',
}: ClusterSimulatorProps = {}) {
  const [windowDays, setWindowDays] = useState(windowProp)
  const [nLosses, setNLosses] = useState(lossesProp)
  const [runSize, setRunSize] = useState<RunSize>(runsProp)
  const [study, setStudy] = useState<Study | null>(null)
  const [shown, setShown] = useState<Shown>('logged')
  /** Advances on every RUN and every NEW TRIAL, so nothing repeats and everything reproduces. */
  const [tick, setTick] = useState(0)

  const runs = Number(runSize)

  /* ---- The trial on the strip ---- */
  const trial = useMemo(() => {
    const days = drawTrial(new Rng(seedFrom(seed, 'trial', tick, nLosses, spanDays)), nLosses, spanDays)
    const best = maxClusterIn(days.map(isoFor), windowDays)
    const gaps = days.slice(1).map((d, i) => d - days[i])
    return { days, best, window: locateWindow(days, windowDays, best), largestGap: gaps.length ? max(gaps) : 0 }
  }, [seed, tick, nLosses, spanDays, windowDays])

  /* ---- The logged study: 10,000 runs, fixed, so the module's mission beat has a stable target ---- */
  const logged: Study = useMemo(
    () => ({
      runs: CLUSTER_RUNS,
      stats: [],
      distribution: clusterDistribution.map((d) => ({ ...d })),
      atOrAbove: clusterAtLeastObservedCount,
    }),
    [],
  )
  const loggedDefaults = windowDays === CLUSTER_WINDOW_DAYS && nLosses === LOSS_TOTAL && spanDays === REGISTER_SPAN_DAYS && observed === OBSERVED_CLUSTER

  const run = () => {
    const next = tick + 1
    const r = new Rng(seedFrom(seed, 'study', next, runs, nLosses, spanDays, windowDays))
    const stats: number[] = []
    for (let i = 0; i < runs; i++) stats.push(simulateCluster(r, nLosses, spanDays, windowDays))
    setStudy(summarize(stats, observed))
    setShown('yours')
    setTick(next)
  }
  const reset = () => {
    setStudy(null)
    setShown('logged')
    setWindowDays(windowProp)
    setNLosses(lossesProp)
    setRunSize(runsProp)
    setTick(0)
  }

  const active = shown === 'yours' && study ? study : logged
  const activeLabel = shown === 'yours' && study ? `your study · ${fmtInt(study.runs)} runs` : `logged study · ${fmtInt(CLUSTER_RUNS)} runs`
  const proportion = active.atOrAbove / active.runs
  const loggedProportion = clusterAtLeastObservedCount / CLUSTER_RUNS

  /* ---- The distribution ---- */
  const categories = active.distribution.map((d) => String(d.value))
  const values = active.distribution.map((d) => d.count)
  const highlight = active.distribution.map((d, i) => (d.value >= observed ? i : -1)).filter((i) => i >= 0)
  const meanStat = active.distribution.length ? active.distribution.reduce((s, d) => s + d.value * d.count, 0) / active.runs : NaN

  /* ---- The strip ---- */
  const frame = useChartFrame({ height: 132, margin: { top: 18, bottom: 40, left: 20, right: 20 } })
  const xs = useMemo(() => scaleLinear().domain([0, spanDays]).range([0, frame.innerWidth]), [spanDays, frame.innerWidth])
  const stripTop = 16
  const stripBottom = Math.max(stripTop + 20, frame.innerHeight - 8)

  const stripTable = useMemo(
    () => ({
      columns: ['loss', 'day of the period', 'date the model implies', 'days since the previous loss'],
      rows: trial.days.map((d, i) => [i + 1, d, isoFor(d), i === 0 ? '—' : d - trial.days[i - 1]] as (string | number)[]),
      caption: `One simulated period: ${fmtInt(nLosses)} losses scattered uniformly across ${fmtInt(spanDays)} days. Largest ${windowDays}-day cluster: ${trial.best}.`,
    }),
    [trial, nLosses, spanDays, windowDays],
  )

  return (
    <Panel
      label="INTEL · CLUSTERING SIMULATION"
      tone="intel"
      led="on"
      status={`${fmtInt(nLosses)} losses · ${fmtInt(spanDays)} d · ${windowDays}-d window`}
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<RunSize> label="runs" value={runSize} options={RUN_OPTIONS} onChange={setRunSize} />
          <Slider label="window width" value={windowDays} min={10} max={60} step={1} units="days" onChange={setWindowDays} />
          <NumberField label="losses to place" value={nLosses} onChange={setNLosses} min={2} max={200} step={1} />
        </div>
        <div className="dr-controls">
          <button type="button" className="dr-btn dr-btn--primary" onClick={run}>
            RUN
          </button>
          <button type="button" className="dr-btn" onClick={() => setTick((t) => t + 1)}>
            NEW TRIAL
          </button>
          <button type="button" className="dr-btn dr-btn--ghost" onClick={reset} disabled={study === null && tick === 0 && loggedDefaults}>
            RESET
          </button>
          <Segmented<Shown>
            label="distribution shown"
            value={shown}
            onChange={setShown}
            options={[
              { value: 'logged', label: `logged · ${fmtInt(CLUSTER_RUNS)}` },
              { value: 'yours', label: study ? `yours · ${fmtInt(study.runs)}` : 'yours', disabled: !study },
            ]}
          />
        </div>

        <section aria-label="One simulated period">
          <Subhead>One trial · what uniform actually looks like</Subhead>
          <ChartSurface
            frame={frame}
            ariaLabel={`One simulated period: ${fmtInt(nLosses)} losses placed uniformly across ${fmtInt(spanDays)} days, with the largest ${windowDays}-day cluster of ${trial.best} highlighted`}
            description={`Each tick is one simulated loss. The highlighted band is the ${windowDays}-day window holding the most of them: ${trial.best} losses. The longest run with no loss at all is ${fmtInt(trial.largestGap)} days. The data table lists every simulated loss day and the gap before it.`}
            table={stripTable}
            footer={
              <Legend
                items={[
                  { label: 'simulated loss', color: semanticColor('null'), shape: 'line' },
                  { label: `largest ${windowDays}-day cluster · ${trial.best}`, color: semanticColor('shade'), shape: 'area' },
                ]}
                ariaLabel="Trial key"
              />
            }
          >
            <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
              <PlotClip frame={frame}>
                <rect
                  x={xs(trial.window[0])}
                  y={stripTop - 8}
                  width={Math.max(2, xs(Math.min(spanDays, trial.window[1])) - xs(trial.window[0]))}
                  height={stripBottom - stripTop + 16}
                  fill={semanticColor('shade')}
                  fillOpacity={0.5}
                />
                {trial.days.map((d, i) => (
                  <line key={`${i}-${d}`} x1={xs(d)} x2={xs(d)} y1={stripTop} y2={stripBottom} stroke={semanticColor('null')} strokeWidth={chartTheme.stroke.line} />
                ))}
              </PlotClip>
              <text x={0} y={4} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                largest cluster {trial.best} · longest empty stretch {fmtInt(trial.largestGap)} d
              </text>
              <XAxis scale={xs} height={frame.innerHeight} ticks={6} label={`day of the ${fmtInt(spanDays)}-day period`} />
            </g>
          </ChartSurface>
          <Note>
            Nothing generated this trial but a uniform draw. It still bunches: {trial.best} losses inside one {windowDays}-day window and a stretch of {fmtInt(trial.largestGap)} days with nothing at all. Press NEW TRIAL and watch the bunching move. Short runs of a random process look lumpy; only the long run is flat.
          </Note>
        </section>

        <section aria-label="Distribution of the largest cluster">
          <Subhead>The statistic, {fmtInt(active.runs)} runs · {activeLabel}</Subhead>
          <BarChart
            categories={categories}
            values={values}
            highlight={highlight}
            label={`largest ${windowDays}-day cluster in a simulated period`}
            valueLabel="runs"
            height={280}
            ariaLabel={`Distribution of the largest ${windowDays}-day cluster across ${fmtInt(active.runs)} simulated periods, with the ${fmtInt(active.atOrAbove)} runs at or above ${observed} highlighted`}
            description={`${fmtInt(active.runs)} simulated periods, each scattering ${fmtInt(nLosses)} losses uniformly across ${fmtInt(spanDays)} days. The bars give how many runs produced each largest-cluster value; the highlighted bars are the ${fmtInt(active.atOrAbove)} runs at or above the Register's observed ${observed}. The data table gives every value and its count.`}
          />
          <ReadoutRow>
            <Readout label="runs completed" value={fmtInt(active.runs)} tone="intel" live />
            <Readout label={`runs with ${observed} or more`} value={fmtInt(active.atOrAbove)} tone="intel" live />
            <Readout label="that is" value={`${fmtInt(active.atOrAbove)} of ${fmtInt(active.runs)}`} size="sm" live />
            <Readout label="estimated P" value={fmtP(proportion)} tone={proportion < 0.05 ? 'alert' : 'intel'} live />
            <Readout label="or" value={oneIn(proportion)} size="sm" live />
            <Readout label="mean largest cluster" value={fmt(meanStat, 2)} size="sm" />
          </ReadoutRow>
          <Note tone={proportion < 0.05 ? 'warn' : 'muted'} live>
            {fmtInt(active.atOrAbove)} of {fmtInt(active.runs)} runs produced a {windowDays}-day cluster of {observed} or more: {inAHundred(proportion)}. Write it that way. A simulated probability is an estimate, and the estimate is worth exactly as many runs as it took — {fmtP(proportion)} off {fmtInt(active.runs)} runs is not the same claim as {fmtP(proportion)} off a hundred.
          </Note>
        </section>

        <section aria-label="The logged study">
          <Subhead>The logged study · {fmtInt(CLUSTER_RUNS)} runs</Subhead>
          <ReadoutRow>
            <Readout label="runs" value={fmtInt(CLUSTER_RUNS)} size="sm" />
            <Readout label={`at or above ${OBSERVED_CLUSTER}`} value={fmtInt(clusterAtLeastObservedCount)} size="sm" tone="intel" />
            <Readout label="estimated P" value={fmtP(loggedProportion)} size="sm" tone="intel" />
            <Readout label="registry figure" value={fmtP(P_CLUSTER_SIMULATED)} size="sm" stale />
          </ReadoutRow>
          <Note>
            The Register holds {OBSERVED_CLUSTER} losses inside {CLUSTER_WINDOW_DAYS} days. Under a model that scatters {fmtInt(LOSS_TOTAL)} losses uniformly across the Register's {fmtInt(REGISTER_SPAN_DAYS)} days, {fmtInt(clusterAtLeastObservedCount)} of {fmtInt(CLUSTER_RUNS)} runs matched it or beat it — {inAHundred(loggedProportion)}. Rare under the model is not proof of a cause. It is a reason to stop calling the cluster ordinary.
          </Note>
        </section>

        {!loggedDefaults && (
          <Note tone="warn">
            The controls no longer match the logged study ({fmtInt(LOSS_TOTAL)} losses, {fmtInt(REGISTER_SPAN_DAYS)} days, {CLUSTER_WINDOW_DAYS}-day window). Your runs answer your question; the logged figure answers the Register's. Do not report one as the other.
          </Note>
        )}
        {study === null && (
          <Note>
            Nothing has been run yet on this console. The distribution above is the logged {fmtInt(CLUSTER_RUNS)}-run study. Set the window, the count and the run size, then press RUN — the seed advances each time, so every study is new and every study can be reproduced.
          </Note>
        )}
        {study !== null && (
          <Note>
            Your {fmtInt(study.runs)} runs against the logged {fmtInt(CLUSTER_RUNS)}: {fmtP(study.atOrAbove / study.runs)} against {fmtP(loggedProportion)}. Run a hundred and the estimate wanders by whole percentage points; run ten thousand and it settles. The model did not change. The precision did. Mean of {fmtInt(study.runs)} statistics: {fmt(mean(study.stats), 2)}.
          </Note>
        )}
      </div>
    </Panel>
  )
}
