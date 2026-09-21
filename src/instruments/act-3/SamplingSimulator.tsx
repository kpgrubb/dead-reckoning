/**
 * SamplingSimulator (act-3-02) — "Drawing the sample."
 *
 * Four probability designs on the 260-master Lane frame: SRS of 40, stratified 15/15/15 by owner
 * class, cluster of six convoys, systematic by hull number. STEP draws one sample and prints exactly
 * who was raised (the random start and step for systematic, the convoy ids for cluster, fifteen per
 * class for stratified); RUN stacks many draws into the sampling distribution of the estimate.
 *
 * What the learner has to see by switching designs: all four centre on the frame truth, but the
 * spread is not the same — stratified is tighter (every owner class is guaranteed its share), cluster
 * is wider (a convoy shares one experience, so six convoys are nearer six answers than forty), and
 * systematic by hull number has only SYSTEMATIC_STEP distinct samples in it. Then the price: cluster
 * costs Solberg a third of the link time, because a convoy shares a link.
 *
 * Every number is computed by `drawDesign` / `simulateDesign` / `expectedLinkMinutes` from `./data`
 * and `mean` / `sd` from `@/lib/stats`; randomness comes only from the seeded Rng `<Sim>` hands over.
 */
import { useCallback, useState } from 'react'
import { Sim } from '@/components'
import { Histogram, Readout, ReadoutRow, Segmented, Slider } from '@/instruments/shared'
import type { Rng } from '@/lib/rng'
import { fmt, fmtInt, mean, sd } from '@/lib/stats'
import { CLUSTER_K, CONVOYS, DESIGN_LABEL, FRAME_BELIEF, FRAME_N, FRAME_TURNING_LATE, LANE_FRAME, SRS_N, STATISTIC_LABEL, STRATUM_N, SYSTEMATIC_STEP, drawDesign, expectedLinkMinutes, simulateDesign, type Design, type DesignDraw, type Statistic } from './data'
import './act3.css'

const DESIGN_OPTS = [
  { value: 'srs', label: 'SRS' },
  { value: 'stratified', label: 'stratified' },
  { value: 'cluster', label: 'cluster' },
  { value: 'systematic', label: 'systematic' },
] as const

const STAT_OPTS = [
  { value: 'belief', label: STATISTIC_LABEL.belief },
  { value: 'turningLate', label: STATISTIC_LABEL.turningLate },
] as const

/** The planning sample size for a design — the figure the cost model is quoted against. */
function plannedN(design: Design): number {
  if (design === 'srs') return SRS_N
  if (design === 'stratified') return 3 * STRATUM_N
  if (design === 'cluster') return Math.round((FRAME_N * CLUSTER_K) / CONVOYS.length)
  return Math.round(FRAME_N / SYSTEMATIC_STEP)
}

const truthOf = (stat: Statistic): number => (stat === 'belief' ? FRAME_BELIEF : FRAME_TURNING_LATE)

interface Results {
  estimates: number[]
  sulcus: number[]
  minutes: number[]
}
const EMPTY: Results = { estimates: [], sulcus: [], minutes: [] }

export interface SamplingSimulatorProps {
  /** Design selected on load. */
  design?: Design
  /** Statistic selected on load. */
  statistic?: Statistic
}

export function SamplingSimulator({ design: design0 = 'srs', statistic: stat0 = 'belief' }: SamplingSimulatorProps = {}) {
  const [design, setDesign] = useState<Design>(design0)
  const [stat, setStat] = useState<Statistic>(stat0)
  const [reps, setReps] = useState(500)
  const [results, setResults] = useState<Results>(EMPTY)
  const [last, setLast] = useState<DesignDraw | null>(null)

  const clear = useCallback(() => {
    setResults(EMPTY)
    setLast(null)
  }, [])

  const onStep = useCallback(
    (r: Rng) => {
      const d = drawDesign(r, design, stat)
      setLast(d)
      setResults((prev) => ({ estimates: [...prev.estimates, d.estimate], sulcus: [...prev.sulcus, d.sulcus], minutes: [...prev.minutes, d.minutes] }))
    },
    [design, stat],
  )

  const onRun = useCallback(
    (r: Rng) => {
      const s = simulateDesign(r, design, stat, reps)
      setLast(null)
      setResults((prev) => ({ estimates: [...prev.estimates, ...s.estimates], sulcus: [...prev.sulcus, ...s.sulcus], minutes: [...prev.minutes, ...s.minutes] }))
    },
    [design, stat, reps],
  )

  const changeDesign = useCallback(
    (d: Design) => {
      setDesign(d)
      clear()
    },
    [clear],
  )
  const changeStat = useCallback(
    (s: Statistic) => {
      setStat(s)
      clear()
    },
    [clear],
  )

  const truth = truthOf(stat)
  const draws = results.estimates.length
  const centre = draws ? mean(results.estimates) : NaN
  const spread = draws > 1 ? sd(results.estimates) : NaN
  const bias = draws ? centre - truth : NaN
  const meanSulcus = draws ? mean(results.sulcus) : NaN
  const meanHours = draws ? mean(results.minutes) / 60 : NaN
  const n = plannedN(design)
  const plannedHours = expectedLinkMinutes(design, n) / 60

  const controls = (
    <div className="dr-controls">
      <Segmented label="DESIGN" value={design} options={DESIGN_OPTS} onChange={changeDesign} />
      <Segmented label="STATISTIC" value={stat} options={STAT_OPTS} onChange={changeStat} />
      <Slider label="repetitions per RUN" value={reps} min={100} max={1000} step={100} onChange={setReps} format={fmtInt} />
    </div>
  )

  const description = `Sampling distribution of the sample proportion who ${STATISTIC_LABEL[stat]} under ${DESIGN_LABEL[design]}, from ${fmtInt(draws)} draws on the ${fmtInt(LANE_FRAME.length)}-master Lane frame. The frame truth is ${fmt(truth, 3)}; the estimates centre on ${draws ? fmt(centre, 3) : 'nothing yet'} with standard deviation ${draws > 1 ? fmt(spread, 4) : '—'}.`

  return (
    <Sim label="SENSOR · SAMPLING-METHOD SIMULATOR" seedKey="act-3-02/designs" tone="sensor" controls={controls} onRun={onRun} onStep={onStep} onReset={clear} runLabel={`RUN ${fmtInt(reps)}`} stepLabel="STEP · ONE DRAW" liveText={description}>
      <Histogram
        values={results.estimates}
        domain={[0, 1]}
        binWidth={0.02}
        label={`sample proportion who ${STATISTIC_LABEL[stat]}`}
        barsLabel={`estimates · ${DESIGN_LABEL[design]}`}
        references={[{ x: truth, label: 'fleet truth', color: 'reference' }]}
        ariaLabel={`Histogram of ${STATISTIC_LABEL[stat]} estimates under ${DESIGN_LABEL[design]}, with the fleet truth marked`}
        description={description}
      />

      <ReadoutRow>
        <Readout label="draws" value={fmtInt(draws)} tone="sensor" live />
        <Readout label="mean of estimates" value={draws ? fmt(centre, 4) : '—'} stale={!draws} live />
        <Readout label="fleet truth" value={fmt(truth, 4)} />
        <Readout label="bias · mean − truth" value={draws ? fmt(bias, 4) : '—'} stale={!draws} tone={draws && Math.abs(bias) > 0.02 ? 'alert' : 'default'} live />
        <Readout label="SD of estimates · sampling variability" value={draws > 1 ? fmt(spread, 4) : '—'} stale={draws < 2} tone="sensor" live />
      </ReadoutRow>
      <ReadoutRow>
        <Readout label="planned contacts" value={fmtInt(n)} size="sm" />
        <Readout label="planned link time" value={fmt(plannedHours, 1)} units="h" size="sm" tone="engineering" />
        <Readout label="mean link time drawn" value={draws ? fmt(meanHours, 1) : '—'} units="h" size="sm" stale={!draws} tone="engineering" live />
        <Readout label="mean Sulcus masters contacted" value={draws ? fmt(meanSulcus, 2) : '—'} size="sm" stale={!draws} live />
        {design === 'systematic' && <Readout label="distinct samples this design can produce" value={fmtInt(SYSTEMATIC_STEP)} size="sm" tone="alert" />}
        {design === 'cluster' && <Readout label="convoys drawn per sample" value={fmtInt(CLUSTER_K)} units={`of ${fmtInt(CONVOYS.length)}`} size="sm" />}
      </ReadoutRow>

      {last && (
        <div className="dr-act3__trace">
          <p className="dr-act3__trace-head">{drawHeadline(design, last)}</p>
          <ul className="dr-act3__hulls">
            {last.sample.map((m) => (
              <li key={m.id}>
                {m.hull} · {m.owner} · hull {m.hullNo} · convoy {m.convoy}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="dr-act3__note">
        Draw each design a few hundred times and compare the <strong>SD of estimates</strong>: stratified is tighter than an SRS because every owner class is guaranteed its {fmtInt(STRATUM_N)}; cluster is wider because six convoys share six experiences, not {fmtInt(SRS_N)}. Then read the cost meter — cluster is the only one Solberg can afford twice.
      </p>
    </Sim>
  )
}

function drawHeadline(design: Design, d: DesignDraw): string {
  if (design === 'systematic') return `systematic · random start ${d.start}, every ${SYSTEMATIC_STEP}th registry hull number → ${d.sample.length} masters, ${d.sulcus} Sulcus`
  if (design === 'cluster') return `cluster · convoys ${d.convoys?.join(', ')} → ${d.sample.length} masters, ${d.sulcus} Sulcus`
  if (design === 'stratified') return `stratified · ${STRATUM_N} per owner class → ${d.sample.length} masters, ${d.sulcus} Sulcus`
  return `simple random sample · ${d.sample.length} masters drawn from ${LANE_FRAME.length}, ${d.sulcus} Sulcus`
}
