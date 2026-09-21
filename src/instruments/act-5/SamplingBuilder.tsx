/**
 * SamplingBuilder (act-5-01) — "Why the reports disagree."
 *
 * The Board's rebuttal is that patrol data show no consistent anomaly: Asgard logged 3 losses in 410
 * transits, Tindr 1 in 380, and those two numbers are nearly three to one. This instrument builds the
 * null model that explains the disagreement without accusing either cutter of anything — repeated
 * patrols drawn from the Ledger, the chosen statistic stacked, and the Lane's own truth marked on the
 * axis. Both cutters land comfortably inside the honest pile.
 *
 * What the learner has to do to reach the lesson (AP 5.3–5.4):
 *   1. Stack the loss rate at n = 400 and find both cutters inside the pile — the disagreement is
 *      sampling variability, not evidence.
 *   2. Switch the statistic to "lower of two patrols' loss rates". The centre moves off the truth and
 *      STAYS off it, however many draws are taken: the minimum of two estimates is biased low by
 *      construction, and that is the statistic the Board's rebuttal quietly used.
 *   3. Raise n. The SD of the stack shrinks; the bias does not move. Bias is not variability, and
 *      more data cures only one of them.
 *
 * Every number comes from `simulatePatrols` / `patrolTruth` / `rateOf` in `./data` and `mean` / `sd`
 * from `@/lib/stats`; randomness comes only from the seeded Rng that `<Sim>` hands over.
 */
import { useCallback, useMemo, useState } from 'react'
import { Sim } from '@/components'
import { Histogram, Readout, ReadoutRow, Segmented, Slider } from '@/instruments/shared'
import type { Rng } from '@/lib/rng'
import { fmt, fmtInt, fmtPct, mean, sd } from '@/lib/stats'
import { CUTTERS, LEDGER_N, PATROL_STATISTIC_LABEL, drawPatrol, isRateStatistic, patrolTruth, rateOf, simulatePatrols, type PatrolStatistic } from './data'
import './act5.css'

const STAT_OPTS = (Object.keys(PATROL_STATISTIC_LABEL) as PatrolStatistic[]).map((value) => ({ value, label: PATROL_STATISTIC_LABEL[value] }))

/** One patrol as the learner sees it: what was drawn, what was found. */
interface PatrolLine {
  losses: number
  rate: number
  meanDelay: number
}
interface Trace {
  n: number
  patrols: PatrolLine[]
  value: number
}

/**
 * One draw with its working shown. Mirrors `drawPatrolStatistic` exactly — same calls to
 * `drawPatrol` in the same order — so STEP and RUN stack the same statistic.
 */
function stepDraw(r: Rng, stat: PatrolStatistic, n: number): Trace {
  const one = () => {
    const ts = drawPatrol(r, n)
    const delays = ts.map((t) => t.mark9Delay)
    const losses = ts.filter((t) => t.lost).length
    return { ts: delays, line: { losses, rate: losses / n, meanDelay: mean(delays) } }
  }
  if (stat === 'meanDelay') {
    const a = one()
    return { n, patrols: [a.line], value: a.line.meanDelay }
  }
  if (stat === 'medianDelay') {
    const a = one()
    const xs = a.ts.slice().sort((p, q) => p - q)
    const mid = xs.length >> 1
    return { n, patrols: [a.line], value: xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2 }
  }
  if (stat === 'rate') {
    const a = one()
    return { n, patrols: [a.line], value: a.line.rate }
  }
  const a = one()
  const b = one()
  const value = stat === 'minOfTwo' ? Math.min(a.line.rate, b.line.rate) : stat === 'maxOfTwo' ? Math.max(a.line.rate, b.line.rate) : (a.line.rate + b.line.rate) / 2
  return { n, patrols: [a.line, b.line], value }
}

/** A 1–2–5 bin width at or below the target, so the axis carries clean numbers. */
function niceWidth(target: number): number {
  if (!(target > 0) || !Number.isFinite(target)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(target)))
  const m = target / p
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p
}

export interface SamplingBuilderProps {
  /** Statistic selected on load. */
  statistic?: PatrolStatistic
  /** Transits per patrol on load — a cutter's patrol is about 400. */
  n?: number
  /** Repetitions stacked by one RUN. */
  reps?: number
}

export function SamplingBuilder({ statistic: stat0 = 'rate', n: n0 = 400, reps: reps0 = 400 }: SamplingBuilderProps = {}) {
  const [stat, setStat] = useState<PatrolStatistic>(stat0)
  const [n, setN] = useState(n0)
  const [reps, setReps] = useState(reps0)
  const [values, setValues] = useState<number[]>([])
  const [last, setLast] = useState<Trace | null>(null)

  const clear = useCallback(() => {
    setValues([])
    setLast(null)
  }, [])

  const onStep = useCallback(
    (r: Rng) => {
      const d = stepDraw(r, stat, n)
      setLast(d)
      setValues((prev) => [...prev, d.value])
    },
    [stat, n],
  )

  const onRun = useCallback(
    (r: Rng) => {
      const stack = simulatePatrols(r, stat, n, reps)
      setLast(null)
      setValues((prev) => [...prev, ...stack])
    },
    [stat, n, reps],
  )

  const changeStat = useCallback(
    (s: PatrolStatistic) => {
      setStat(s)
      clear()
    },
    [clear],
  )
  const changeN = useCallback(
    (v: number) => {
      setN(v)
      clear()
    },
    [clear],
  )

  const isRate = isRateStatistic(stat)
  const truth = patrolTruth(stat)
  const draws = values.length
  const centre = draws ? mean(values) : NaN
  const spread = draws > 1 ? sd(values) : NaN
  const bias = draws ? centre - truth : NaN
  /** "Clearly" non-zero: more than three standard errors of the stack's own mean away from zero. */
  const biasIsReal = draws > 30 && Math.abs(bias) > 3 * (spread / Math.sqrt(draws))

  const digits = isRate ? 5 : 3
  const unit = isRate ? '' : 'd'
  const binWidth = useMemo(() => {
    if (isRate) return n <= 800 ? 1 / n : 2 / n
    return niceWidth(spread > 0 ? spread / 4 : 0.05)
  }, [isRate, n, spread])

  const asgard = rateOf(CUTTERS.asgard)
  const tindr = rateOf(CUTTERS.tindr)
  const shareAtOrBelow = (x: number) => (draws ? values.filter((v) => v <= x).length / draws : NaN)

  const references = useMemo(() => {
    const refs: { x: number; label?: string; color?: 'reference' | 'observed' }[] = [{ x: truth, label: 'Lane truth', color: 'reference' }]
    if (isRate) {
      refs.push({ x: asgard, label: 'Asgard 3/410', color: 'observed' })
      refs.push({ x: tindr, label: 'Tindr 1/380', color: 'observed' })
    }
    return refs
  }, [truth, isRate, asgard, tindr])

  const axisLabel = `${PATROL_STATISTIC_LABEL[stat]}${isRate ? '' : ' (d)'}`
  const description = `Sampling distribution of the ${PATROL_STATISTIC_LABEL[stat]} over ${fmtInt(draws)} repeated patrols of ${fmtInt(n)} transits drawn from the ${fmtInt(LEDGER_N)}-row Transit Ledger. The Lane's own value is ${fmt(truth, digits)}${unit ? ' ' + unit : ''}; the stacked statistic centres on ${draws ? fmt(centre, digits) : 'nothing yet'} with standard deviation ${draws > 1 ? fmt(spread, digits) : '—'}.${isRate ? ` Asgard's observed rate is ${fmt(asgard, digits)} and Tindr's ${fmt(tindr, digits)}.` : ''}`

  const controls = (
    <div className="dr-controls">
      <Segmented<PatrolStatistic> label="STATISTIC" value={stat} options={STAT_OPTS} onChange={changeStat} />
      <Slider label="transits per patrol (n)" value={n} min={100} max={1600} step={100} onChange={changeN} format={fmtInt} />
      <Slider label="repetitions per RUN" value={reps} min={100} max={1000} step={100} onChange={setReps} format={fmtInt} />
    </div>
  )

  return (
    <Sim label="INTEL · SAMPLING-DISTRIBUTION BUILDER" seedKey="act-5-01/patrols" tone="intel" controls={controls} onRun={onRun} onStep={onStep} onReset={clear} runLabel={`RUN ${fmtInt(reps)}`} stepLabel="STEP · ONE PATROL" liveText={description}>
      <Histogram
        values={values}
        binWidth={binWidth}
        label={axisLabel}
        barsLabel={`stacked ${PATROL_STATISTIC_LABEL[stat]}`}
        references={references}
        ariaLabel={`Histogram of the ${PATROL_STATISTIC_LABEL[stat]} over repeated patrols, with the Lane truth marked${isRate ? " and both cutters' observed rates marked" : ''}`}
        description={description}
      />

      <ReadoutRow>
        <Readout label="draws" value={fmtInt(draws)} tone="intel" live />
        <Readout label="mean of the stack" value={draws ? fmt(centre, digits) : '—'} units={unit} stale={!draws} live />
        <Readout label="Lane truth" value={fmt(truth, digits)} units={unit} />
        <Readout label="bias · mean − truth" value={draws ? fmt(bias, digits) : '—'} units={unit} stale={!draws} tone={biasIsReal ? 'alert' : 'default'} live />
        <Readout label="SD of the stack · sampling variability" value={draws > 1 ? fmt(spread, digits) : '—'} units={unit} stale={draws < 2} tone="intel" live />
      </ReadoutRow>

      {isRate && (
        <ReadoutRow>
          <Readout label="Asgard · 3 of 410" value={fmt(asgard, digits)} size="sm" tone="log" />
          <Readout label="draws at or below Asgard" value={draws ? fmtPct(shareAtOrBelow(asgard), 1) : '—'} size="sm" stale={!draws} live />
          <Readout label="Tindr · 1 of 380" value={fmt(tindr, digits)} size="sm" tone="log" />
          <Readout label="draws at or below Tindr" value={draws ? fmtPct(shareAtOrBelow(tindr), 1) : '—'} size="sm" stale={!draws} live />
        </ReadoutRow>
      )}

      {last && (
        <div className="dr-act5__trace">
          <p className="dr-act5__trace-head">
            {last.patrols.length === 1 ? 'one patrol' : `two patrols of ${fmtInt(last.n)}`} → {PATROL_STATISTIC_LABEL[stat]} = {fmt(last.value, digits)}
            {unit ? ` ${unit}` : ''}
          </p>
          <ul className="dr-act5__trace-list">
            {last.patrols.map((p, i) => (
              <li key={i}>
                patrol {i + 1} · {fmtInt(last.n)} transits drawn · {fmtInt(p.losses)} lost · rate {fmt(p.rate, 5)} · mean delay {fmt(p.meanDelay, 3)} d
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="dr-act5__note">
        Stack the <strong>loss rate</strong> at n = 400 and find both cutters inside the pile: {fmt(asgard, 5)} and {fmt(tindr, 5)} are two draws from the same machine, not two different Lanes. Now switch to <strong>{PATROL_STATISTIC_LABEL.minOfTwo}</strong> and watch the centre move off the Lane truth — and stay off it, however long you run. That gap is <em>bias</em>, and it is built into the statistic. Last, raise <strong>n</strong>: the SD of the stack falls like 1/√n, and the gap does not move at all.
      </p>
    </Sim>
  )
}
