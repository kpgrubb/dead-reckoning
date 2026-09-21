/**
 * ENGINEERING · DIFFERENCE MACHINE (act-5-05) — "Differences in means."
 *
 * Two populations, two sample sizes, and the distribution of x̄₁ − x̄₂ forming under a common-mean
 * null. The machine exists to make one number believable: √(σ₁²/n₁ + σ₂²/n₂).
 *
 * The wrong answer is placed deliberately beside the right one. σ₁/√n₁ − σ₂/√n₂ is *smaller than
 * either* standard error — a difference of two noisy quantities that is somehow quieter than either
 * of them, which is the sort of claim an engineer should refuse on sight. The variance-share bars say
 * where the noise actually lives: put nineteen hulls against eight hundred and eighty-one and the
 * nineteen supply almost all of it, which is why that comparison is five times wider than nine
 * hundred against seventeen hundred.
 *
 * The means default to the Lane's honest mean on BOTH sides — this is the null model, not the
 * accusation. Nothing here computes an observed difference or a P-value.
 */
import { useCallback, useMemo, useState } from 'react'
import { Sim } from '@/components'
import { BarChart, Histogram, NumberField, Readout, ReadoutRow, Segmented, Slider } from '@/instruments/shared'
import type { Rng } from '@/lib/rng'
import { fmt, fmtInt, fmtPct, mean, normal, sd } from '@/lib/stats'
import { DIFFERENCE_PRESETS, GAP_1_IN_1000, LANE_DELAY_MEAN, LANE_DELAY_SD, NINETEEN_N, SURVIVING_PERRINE_N, drawMeanDifference, sdOfDifferenceOfMeans } from './data'
import './act5.css'

const PRESET_OPTS = [...DIFFERENCE_PRESETS.map((p) => ({ value: p.id as string, label: p.label })), { value: 'custom', label: 'custom', disabled: true }]

/** A 1–2–5 bin width at or below the target. */
function niceWidth(target: number): number {
  if (!(target > 0) || !Number.isFinite(target)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(target)))
  const m = target / p
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p
}

export interface DifferenceMachineProps {
  /** Preset selected on load (an id from DIFFERENCE_PRESETS). */
  preset?: string
  /** Replications per RUN. */
  reps?: number
}

export function DifferenceMachine({ preset: preset0 = 'fleets', reps: reps0 = 300 }: DifferenceMachineProps = {}) {
  const start = DIFFERENCE_PRESETS.find((p) => p.id === preset0) ?? DIFFERENCE_PRESETS[0]
  const [n1, setN1] = useState<number>(start.n1)
  const [n2, setN2] = useState<number>(start.n2)
  const [sigma1, setSigma1] = useState(LANE_DELAY_SD)
  const [sigma2, setSigma2] = useState(LANE_DELAY_SD)
  const [mu1, setMu1] = useState(LANE_DELAY_MEAN)
  const [mu2, setMu2] = useState(LANE_DELAY_MEAN)
  const [reps, setReps] = useState(reps0)
  const [values, setValues] = useState<number[]>([])

  const clear = useCallback(() => setValues([]), [])

  /** Which preset the sliders are currently sitting on, if any. */
  const matched = DIFFERENCE_PRESETS.find((p) => p.n1 === n1 && p.n2 === n2)?.id ?? 'custom'
  const isSmallGroup = matched === 'small-group'

  const onRun = useCallback(
    (r: Rng) => {
      const stack = new Array<number>(reps)
      for (let i = 0; i < reps; i++) stack[i] = drawMeanDifference(r, mu1, sigma1, n1, mu2, sigma2, n2)
      setValues((prev) => [...prev, ...stack])
    },
    [reps, mu1, sigma1, n1, mu2, sigma2, n2],
  )
  const onStep = useCallback(
    (r: Rng) => {
      const v = drawMeanDifference(r, mu1, sigma1, n1, mu2, sigma2, n2)
      setValues((prev) => [...prev, v])
    },
    [mu1, sigma1, n1, mu2, sigma2, n2],
  )

  /** Any parameter change invalidates the stack — it was drawn from a different null. */
  const setParam = useCallback(
    <T,>(set: (v: T) => void) =>
      (v: T) => {
        set(v)
        clear()
      },
    [clear],
  )

  const choosePreset = useCallback(
    (id: string) => {
      const p = DIFFERENCE_PRESETS.find((q) => q.id === id)
      if (!p) return
      setN1(p.n1)
      setN2(p.n2)
      clear()
    },
    [clear],
  )

  /* ---- Theory ---- */
  const se1 = sigma1 / Math.sqrt(n1)
  const se2 = sigma2 / Math.sqrt(n2)
  const theorySd = sdOfDifferenceOfMeans(sigma1, n1, sigma2, n2)
  const subtracted = se1 - se2
  const var1 = (sigma1 * sigma1) / n1
  const var2 = (sigma2 * sigma2) / n2
  const varTotal = var1 + var2
  const share1 = varTotal > 0 ? var1 / varTotal : NaN
  const share2 = varTotal > 0 ? var2 / varTotal : NaN
  const centre0 = mu1 - mu2

  const draws = values.length
  const centre = draws ? mean(values) : NaN
  const spread = draws > 1 ? sd(values) : NaN

  const domain = useMemo<[number, number]>(() => {
    const reach = Math.max(4.5 * theorySd, Math.abs(centre0) + 4.5 * theorySd, isSmallGroup ? GAP_1_IN_1000 * 1.25 : 0)
    return [-reach, reach]
  }, [theorySd, centre0, isSmallGroup])
  const binWidth = useMemo(() => Math.max(niceWidth(theorySd / 4), (domain[1] - domain[0]) / 160), [theorySd, domain])
  const curve = useCallback((x: number) => normal.pdf(x, centre0, theorySd), [centre0, theorySd])

  const references = useMemo(() => {
    const refs: { x: number; label?: string; color?: 'reference' | 'observed' }[] = [{ x: 0, label: 'no difference', color: 'reference' }]
    if (isSmallGroup) refs.push({ x: GAP_1_IN_1000, label: '1-in-1,000 gap', color: 'observed' })
    return refs
  }, [isSmallGroup])

  const description = `Sampling distribution of the difference in mean Mark-9 delay from ${fmtInt(draws)} pairs of samples: ${fmtInt(n1)} transits with population SD ${fmt(sigma1, 3)} days against ${fmtInt(n2)} with population SD ${fmt(sigma2, 3)} days, both centred on ${fmt(mu1, 3)} and ${fmt(mu2, 3)} days. Theory: centre ${fmt(centre0, 4)}, standard deviation root of sigma one squared over n one plus sigma two squared over n two = ${fmt(theorySd, 5)}. The simulated differences centre on ${draws ? fmt(centre, 4) : 'nothing yet'} with standard deviation ${draws > 1 ? fmt(spread, 5) : '—'}. Group one supplies ${varTotal > 0 ? fmtPct(share1, 1) : '—'} of the variance and group two ${varTotal > 0 ? fmtPct(share2, 1) : '—'}.`

  const controls = (
    <div className="dr-controls">
      <Segmented label="PAIRING" value={matched} options={PRESET_OPTS} onChange={choosePreset} />
      <Slider label="group 1 sample size (n₁)" value={n1} min={1} max={2000} step={1} onChange={setParam(setN1)} format={fmtInt} />
      <Slider label="group 2 sample size (n₂)" value={n2} min={1} max={2000} step={1} onChange={setParam(setN2)} format={fmtInt} />
      <NumberField label="σ₁" value={Number(sigma1.toFixed(3))} onChange={setParam((v: number) => setSigma1(Math.max(0.05, v)))} min={0.05} max={20} step={0.1} units="d" />
      <NumberField label="σ₂" value={Number(sigma2.toFixed(3))} onChange={setParam((v: number) => setSigma2(Math.max(0.05, v)))} min={0.05} max={20} step={0.1} units="d" />
      <NumberField label="μ₁" value={Number(mu1.toFixed(3))} onChange={setParam(setMu1)} min={-20} max={20} step={0.1} units="d" />
      <NumberField label="μ₂" value={Number(mu2.toFixed(3))} onChange={setParam(setMu2)} min={-20} max={20} step={0.1} units="d" />
      <Slider label="repetitions per RUN" value={reps} min={100} max={1000} step={100} onChange={setReps} format={fmtInt} />
    </div>
  )

  return (
    <Sim label="ENGINEERING · DIFFERENCE MACHINE" seedKey="act-5-05/differences" tone="engineering" controls={controls} onRun={onRun} onStep={onStep} onReset={clear} runLabel={`RUN ${fmtInt(reps)}`} stepLabel="STEP · ONE PAIR" liveText={description}>
      <Histogram
        values={values}
        density
        domain={domain}
        binWidth={binWidth}
        label="difference in mean Mark-9 delay · x̄₁ − x̄₂ (d)"
        barsLabel="simulated differences"
        curve={curve}
        curveLabel="N(μ₁ − μ₂, √(σ₁²/n₁ + σ₂²/n₂))"
        references={references}
        ariaLabel="Histogram of simulated differences in mean Mark-9 delay, with the normal model overlaid"
        description={description}
      />

      <ReadoutRow>
        <Readout label="σ₁/√n₁" value={fmt(se1, 5)} size="sm" />
        <Readout label="σ₂/√n₂" value={fmt(se2, 5)} size="sm" />
        <Readout label="√(σ₁²/n₁ + σ₂²/n₂) · the theory" value={fmt(theorySd, 5)} tone="engineering" live />
        <Readout label="SD of the simulated differences · the machine" value={draws > 1 ? fmt(spread, 5) : '—'} stale={draws < 2} tone="engineering" live />
        <Readout label="σ₁/√n₁ − σ₂/√n₂ · the common error" value={fmt(subtracted, 5)} tone="alert" />
      </ReadoutRow>
      <ReadoutRow>
        <Readout label="σ₁²/n₁ · variance from group 1" value={fmt(var1, 5)} size="sm" />
        <Readout label="σ₂²/n₂ · variance from group 2" value={fmt(var2, 5)} size="sm" />
        <Readout label="group 1 share of the variance" value={varTotal > 0 ? fmtPct(share1, 1) : '—'} size="sm" tone={share1 > 0.8 ? 'alert' : 'engineering'} live />
        <Readout label="group 2 share of the variance" value={varTotal > 0 ? fmtPct(share2, 1) : '—'} size="sm" live />
        <Readout label="mean of the stack" value={draws ? fmt(centre, 4) : '—'} size="sm" stale={!draws} live />
        <Readout label="draws" value={fmtInt(draws)} size="sm" live />
        {isSmallGroup && <Readout label="1-in-1,000 gap · 19 against 881" value={fmt(GAP_1_IN_1000, 4)} units="d" size="sm" tone="log" />}
      </ReadoutRow>

      <h4 className="dr-act5__head">Where the noise comes from</h4>
      <BarChart
        categories={[`group 1 · n₁ = ${fmtInt(n1)}`, `group 2 · n₂ = ${fmtInt(n2)}`]}
        values={[varTotal > 0 ? share1 * 100 : 0, varTotal > 0 ? share2 * 100 : 0]}
        label="source of the variance"
        valueLabel="share of σ₁²/n₁ + σ₂²/n₂ (%)"
        horizontal
        showValues
        height={130}
        ariaLabel="Share of the total variance of the difference contributed by each group"
        description={`Group 1, with ${fmtInt(n1)} observations and population SD ${fmt(sigma1, 3)}, supplies ${varTotal > 0 ? fmtPct(share1, 1) : '—'} of the variance of the difference; group 2, with ${fmtInt(n2)} and SD ${fmt(sigma2, 3)}, supplies ${varTotal > 0 ? fmtPct(share2, 1) : '—'}. The smaller group dominates.`}
      />

      <p className="dr-act5__note">
        Variances add because the two samples are <strong>independent</strong> — nothing that happens to group 1&rsquo;s transits touches group 2&rsquo;s — and adding variances is the only operation that survives the square root intact. Which is why {fmt(se1, 5)} and {fmt(se2, 5)} make <strong>{fmt(theorySd, 5)}</strong> and not {fmt(subtracted, 5)}: a difference of two noisy numbers cannot be quieter than either of them. Then read the bars.{' '}
        <em>
          The small group sets the precision. Put {fmtInt(NINETEEN_N)} against {fmtInt(SURVIVING_PERRINE_N)} and the {fmtInt(NINETEEN_N)} carry almost all of the variance
        </em>
        , so adding hulls to the big group buys you almost nothing — which is exactly the shape of the problem when nineteen diverted transits are weighed against the rest of a fleet.
      </p>
    </Sim>
  )
}
