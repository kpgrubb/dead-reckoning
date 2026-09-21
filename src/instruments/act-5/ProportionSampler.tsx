/**
 * TACTICAL · PROPORTION SAMPLER (act-5-04) — "Proportions in the noise."
 *
 * The null model for a loss rate, built rather than asserted. ONE FLEET stacks p̂ from n independent
 * transits at a true rate p; TWO FLEETS stacks p̂₁ − p̂₂ from two fleets drawn under the same rate, so
 * the learner can see how big a gap the noise floor produces on its own.
 *
 * Two things the instrument refuses to fake:
 *   · The normal overlay appears ONLY when Large Counts holds (n·p ≥ 10 and n·(1 − p) ≥ 10). When it
 *     fails, the curve is withdrawn and an alert readout says which count failed. At n = 900 on the
 *     Lane rate, n·p = 10.7 — it passes, narrowly, and that number belongs in Ferrier's brief.
 *   · The difference readouts print √(SD₁² + SD₂²) beside SD₁ − SD₂ in alert tone, because
 *     "differences add variances, they never subtract standard deviations" has to be seen.
 *
 * Nothing here computes the Lane's observed gap or any z or P-value for it. Act V builds null models;
 * Act VI runs the test.
 */
import { useCallback, useMemo, useState } from 'react'
import { Sim } from '@/components'
import { Histogram, NumberField, Readout, ReadoutRow, Segmented, Slider } from '@/instruments/shared'
import type { Rng } from '@/lib/rng'
import { fmt, fmtInt, mean, normal, samplingSdProportion, sd } from '@/lib/stats'
import { GAP_1_IN_100, OTHER_N, PERRINE_N, POOLED_RATE, drawProportionDifference, sdOfDifferenceOfProportions } from './data'
import './act5.css'

type Mode = 'one' | 'two'

/** AP Large Counts for a sampling distribution of p̂: both expected counts at least ten. */
const LARGE_COUNTS_MIN = 10

/** A 1–2–5 bin width at or below the target. */
function niceWidth(target: number): number {
  if (!(target > 0) || !Number.isFinite(target)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(target)))
  const m = target / p
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p
}

export interface ProportionSamplerProps {
  /** Mode on load. */
  mode?: Mode
  /** Fleet size in one-fleet mode — the Perrine fleet flew 900 Lane transits. */
  n?: number
  /** True rate under the null. */
  rate?: number
}

export function ProportionSampler({ mode: mode0 = 'one', n: n0 = PERRINE_N, rate: rate0 = POOLED_RATE }: ProportionSamplerProps = {}) {
  const [mode, setMode] = useState<Mode>(mode0)
  const [n, setN] = useState(n0)
  const [p, setP] = useState(rate0)
  const [n1, setN1] = useState(PERRINE_N)
  const [n2, setN2] = useState(OTHER_N)
  const [p1, setP1] = useState(rate0)
  const [p2, setP2] = useState(rate0)
  const [reps, setReps] = useState(500)
  const [values, setValues] = useState<number[]>([])

  const clear = useCallback(() => setValues([]), [])

  const draw = useCallback(
    (r: Rng) => (mode === 'one' ? r.binomial(n, p) / n : drawProportionDifference(r, p1, n1, p2, n2)),
    [mode, n, p, n1, n2, p1, p2],
  )

  const onStep = useCallback(
    (r: Rng) => {
      const v = draw(r)
      setValues((prev) => [...prev, v])
    },
    [draw],
  )

  const onRun = useCallback(
    (r: Rng) => {
      const stack = new Array<number>(reps)
      for (let i = 0; i < reps; i++) stack[i] = draw(r)
      setValues((prev) => [...prev, ...stack])
    },
    [draw, reps],
  )

  const changeMode = useCallback(
    (m: Mode) => {
      setMode(m)
      clear()
    },
    [clear],
  )
  /** Any parameter change invalidates the stack — the null model it was drawn from is gone. */
  const setParam = useCallback(
    <T,>(set: (v: T) => void) =>
      (v: T) => {
        set(v)
        clear()
      },
    [clear],
  )

  /* ---- Theory ---- */
  const successes = n * p
  const failures = n * (1 - p)
  const largeCounts = successes >= LARGE_COUNTS_MIN && failures >= LARGE_COUNTS_MIN
  const sdOne = samplingSdProportion(p, n)

  const sd1 = samplingSdProportion(p1, n1)
  const sd2 = samplingSdProportion(p2, n2)
  const sdDiff = sdOfDifferenceOfProportions(p1, n1, p2, n2)
  const sdSubtracted = sd1 - sd2

  const theoryMean = mode === 'one' ? p : p1 - p2
  const theorySd = mode === 'one' ? sdOne : sdDiff

  const draws = values.length
  const centre = draws ? mean(values) : NaN
  const spread = draws > 1 ? sd(values) : NaN

  const domain = useMemo<[number, number]>(() => {
    if (mode === 'one') return [Math.max(0, theoryMean - 4.5 * theorySd), theoryMean + 4.5 * theorySd]
    const reach = Math.max(4.5 * theorySd, Math.abs(theoryMean) + 4.5 * theorySd, GAP_1_IN_100 * 1.25)
    return [-reach, reach]
  }, [mode, theoryMean, theorySd])

  const binWidth = useMemo(() => {
    if (mode === 'one') return Math.max(1 / n, (domain[1] - domain[0]) / 160)
    return Math.max(niceWidth(theorySd / 4), (domain[1] - domain[0]) / 160)
  }, [mode, n, theorySd, domain])

  const curve = useCallback((x: number) => normal.pdf(x, theoryMean, theorySd), [theoryMean, theorySd])
  const showCurve = mode === 'two' || largeCounts

  const axisLabel = mode === 'one' ? `sample loss rate p̂ of ${fmtInt(n)} transits` : 'difference in sample loss rates · p̂₁ − p̂₂'
  const description =
    mode === 'one'
      ? `Sampling distribution of the sample loss rate from ${fmtInt(draws)} fleets of ${fmtInt(n)} independent transits at a true rate of ${fmt(p, 5)}. Theory: centre ${fmt(p, 5)}, standard deviation ${fmt(sdOne, 5)}. Expected losses n times p = ${fmt(successes, 2)} and expected arrivals n times one minus p = ${fmt(failures, 1)}; Large Counts ${largeCounts ? 'holds, so the normal model is overlaid' : 'fails, so no normal curve is drawn'}. The simulated rates centre on ${draws ? fmt(centre, 5) : 'nothing yet'} with standard deviation ${draws > 1 ? fmt(spread, 5) : '—'}.`
      : `Sampling distribution of the difference in sample loss rates from ${fmtInt(draws)} pairs of fleets: ${fmtInt(n1)} transits at rate ${fmt(p1, 5)} against ${fmtInt(n2)} at rate ${fmt(p2, 5)}. Theory: centre ${fmt(p1 - p2, 5)}, standard deviation root of the sum of the two squared standard deviations = ${fmt(sdDiff, 5)}. The simulated differences centre on ${draws ? fmt(centre, 5) : 'nothing yet'} with standard deviation ${draws > 1 ? fmt(spread, 5) : '—'}. A gap of ${fmt(GAP_1_IN_100, 5)} is marked: under a common rate, that is a one-in-a-hundred event.`

  const controls = (
    <div className="dr-controls">
      <Segmented<Mode>
        label="MODE"
        value={mode}
        onChange={changeMode}
        options={[
          { value: 'one', label: 'ONE FLEET' },
          { value: 'two', label: 'TWO FLEETS' },
        ]}
      />
      {mode === 'one' ? (
        <>
          <Slider label="transits in the fleet (n)" value={n} min={100} max={2000} step={100} onChange={setParam(setN)} format={fmtInt} />
          <NumberField label="true loss rate p" value={Number(p.toFixed(4))} onChange={setParam((v: number) => setP(Math.min(0.5, Math.max(0.001, v))))} min={0.001} max={0.5} step={0.001} />
        </>
      ) : (
        <>
          <Slider label="fleet 1 transits (n₁)" value={n1} min={100} max={2000} step={100} onChange={setParam(setN1)} format={fmtInt} />
          <Slider label="fleet 2 transits (n₂)" value={n2} min={100} max={2000} step={100} onChange={setParam(setN2)} format={fmtInt} />
          <NumberField label="rate of fleet 1" value={Number(p1.toFixed(4))} onChange={setParam((v: number) => setP1(Math.min(0.5, Math.max(0.001, v))))} min={0.001} max={0.5} step={0.001} />
          <NumberField label="rate of fleet 2" value={Number(p2.toFixed(4))} onChange={setParam((v: number) => setP2(Math.min(0.5, Math.max(0.001, v))))} min={0.001} max={0.5} step={0.001} />
        </>
      )}
      <Slider label="repetitions per RUN" value={reps} min={200} max={1000} step={100} onChange={setReps} format={fmtInt} />
    </div>
  )

  return (
    <Sim label="TACTICAL · PROPORTION SAMPLER" seedKey="act-5-04/proportions" tone="tactical" controls={controls} onRun={onRun} onStep={onStep} onReset={clear} runLabel={`RUN ${fmtInt(reps)}`} stepLabel="STEP · ONE DRAW" liveText={description}>
      <Histogram
        values={values}
        domain={domain}
        binWidth={binWidth}
        density
        label={axisLabel}
        barsLabel={mode === 'one' ? 'simulated p̂' : 'simulated p̂₁ − p̂₂'}
        curve={showCurve ? curve : undefined}
        curveLabel={showCurve ? (mode === 'one' ? 'N(p, √(p(1−p)/n))' : 'N(p₁ − p₂, √(SD₁² + SD₂²))') : undefined}
        references={mode === 'two' ? [{ x: GAP_1_IN_100, label: '1-in-100 gap', color: 'observed' }] : [{ x: p, label: 'true rate p', color: 'reference' }]}
        ariaLabel={mode === 'one' ? 'Histogram of simulated sample loss rates' : 'Histogram of simulated differences in sample loss rates'}
        description={description}
      />

      {mode === 'one' ? (
        <>
          <ReadoutRow>
            <Readout label="n · p · expected losses" value={fmt(successes, 2)} tone={successes >= LARGE_COUNTS_MIN ? 'tactical' : 'alert'} live />
            <Readout label="n · (1 − p) · expected arrivals" value={fmt(failures, 1)} tone={failures >= LARGE_COUNTS_MIN ? 'tactical' : 'alert'} live />
            <Readout label="Large Counts · both ≥ 10" value={largeCounts ? 'holds' : 'FAILS'} tone={largeCounts ? 'tactical' : 'alert'} live />
            {!largeCounts && <Readout label="normal overlay" value="withdrawn — the model does not apply here" tone="alert" size="sm" live />}
          </ReadoutRow>
          <ReadoutRow>
            <Readout label="√(p(1 − p)/n) · the theory" value={fmt(sdOne, 5)} tone="tactical" live />
            <Readout label="SD of the simulated p̂ · the machine" value={draws > 1 ? fmt(spread, 5) : '—'} stale={draws < 2} tone="tactical" live />
            <Readout label="mean of the stack" value={draws ? fmt(centre, 5) : '—'} stale={!draws} live />
            <Readout label="true rate p" value={fmt(p, 5)} size="sm" />
            <Readout label="draws" value={fmtInt(draws)} size="sm" live />
          </ReadoutRow>
        </>
      ) : (
        <>
          <ReadoutRow>
            <Readout label="SD of p̂₁ alone" value={fmt(sd1, 5)} size="sm" />
            <Readout label="SD of p̂₂ alone" value={fmt(sd2, 5)} size="sm" />
            <Readout label="√(SD₁² + SD₂²) · the theory" value={fmt(sdDiff, 5)} tone="tactical" live />
            <Readout label="SD of the simulated differences" value={draws > 1 ? fmt(spread, 5) : '—'} stale={draws < 2} tone="tactical" live />
            <Readout label="SD₁ − SD₂ · the common error" value={fmt(sdSubtracted, 5)} tone="alert" />
          </ReadoutRow>
          <ReadoutRow>
            <Readout label="1-in-100 gap under a common rate" value={fmt(GAP_1_IN_100, 5)} tone="log" />
            <Readout label="mean of the stack" value={draws ? fmt(centre, 5) : '—'} stale={!draws} live />
            <Readout label="p₁ − p₂ · the null centre" value={fmt(p1 - p2, 5)} size="sm" />
            <Readout label="draws" value={fmtInt(draws)} size="sm" live />
          </ReadoutRow>
        </>
      )}

      <p className="dr-act5__note">
        {mode === 'one' ? (
          <>
            At n = {fmtInt(n)} and a rate of {fmt(p, 5)}, Large Counts gives <strong>n·p = {fmt(successes, 2)}</strong> and n·(1 − p) = {fmt(failures, 1)} — {largeCounts ? 'it passes, and at the Lane rate on 900 transits it passes narrowly, so quote the number rather than the verdict' : 'it fails, so the normal overlay is withdrawn; the sampling distribution is still there, it is just not normal'}. The 10 % condition is a condition about a <em>process</em>: a fleet&rsquo;s {fmtInt(n)} transits are {fmtInt(n)} draws from an ongoing operation that will keep flying the Lane, not {fmtInt(n)} scoops out of a fixed bin — which is why independence survives and why the SD is √(p(1 − p)/n).
          </>
        ) : (
          <>
            Read the three SDs together: {fmt(sd1, 5)} and {fmt(sd2, 5)} combine to <strong>{fmt(sdDiff, 5)}</strong>, which is <em>larger than either</em>. Variances add. Standard deviations never subtract — {fmt(sdSubtracted, 5)} is the wrong answer written down carefully. Under a common rate, the noise floor alone produces a gap of {fmt(GAP_1_IN_100, 5)} about once in a hundred pairs of fleets; that is the bar any real gap has to clear.
          </>
        )}
      </p>
    </Sim>
  )
}
