/**
 * SENSOR · BOOTSTRAP MACHINE (act-7-07) — the nineteen's mean delay, resampled.
 *
 * A percentile bootstrap of the mean, drawn beside the one-sample t-interval on the same axis so
 * the learner can see the two land on top of each other. That agreement is the point: it says the
 * t-interval's answer does not hinge on the Normal model, which is the only thing a bootstrap here
 * is being asked to establish.
 *
 * What the learner does: presses RESAMPLE (or types a seed) and watches the percentile endpoints
 * move in the last decimal rather than the first; winds the replications from 200 to 4,000 and
 * watches the Monte-Carlo wobble shrink while the width does not; winds the confidence level and
 * watches both intervals widen together.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   sample       the sample to resample. Default: the nineteen's Mark-9 delays.
 *   measure      the measured quantity, named.
 *   units        units of measurement.
 *   reps         replications on load (200–4,000). Default 2,000.
 *   confidence   level on load. Default 0.95.
 *   label, tone  Panel header and ship-system tone.
 *
 * Determinism: every draw goes through `bootstrapNineteen` in `./data` (which seeds `@/lib/rng`),
 * or through `bootstrapMean` with an `rng('act-7/bootstrap-machine', seed)` for a supplied sample.
 * `Math.random()` appears nowhere.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Histogram, NumberField, Readout, Slider } from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { bootstrapMean, fmt, fmtInt, fmtPct, oneMeanInterval, outliers, sd, skewness } from '@/lib/stats'
import { bootstrapNineteen, lostPerrineDelays } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export interface BootstrapMachineProps {
  sample?: readonly number[]
  measure?: string
  units?: string
  reps?: number
  confidence?: number
  label?: string
  tone?: PanelTone
}

export function BootstrapMachine({
  sample = lostPerrineDelays,
  measure = 'Mark-9 delay against the filed plot',
  units = 'd',
  reps: reps0 = 2000,
  confidence: c0 = 0.95,
  label = 'SENSOR · BOOTSTRAP MACHINE',
  tone = 'sensor',
}: BootstrapMachineProps = {}) {
  const [seed, setSeed] = useState(1)
  const [reps, setReps] = useState(reps0)
  const [confidence, setConfidence] = useState(c0)

  const xs = useMemo(() => [...sample], [sample])
  const isNineteen = xs.length === lostPerrineDelays.length && xs.every((v, i) => v === lostPerrineDelays[i])

  const boot = useMemo(
    () => (isNineteen ? bootstrapNineteen(seed, reps, confidence) : bootstrapMean(xs, { rng: rng('act-7/bootstrap-machine', seed), reps, confidence })),
    [isNineteen, xs, seed, reps, confidence],
  )
  const tInterval = useMemo(() => oneMeanInterval(xs, { confidence, random: true }), [xs, confidence])

  const [bLo, bHi] = boot.ci
  const [tLo, tHi] = tInterval.ci as [number, number]
  const bWidth = bHi - bLo
  const tWidth = tHi - tLo
  const agree = Math.abs(bLo - tLo) < 0.25 * tWidth && Math.abs(bHi - tHi) < 0.25 * tWidth

  const strays = outliers(xs).values.length

  const description =
    `${fmtInt(boot.reps)} bootstrap means of the ${fmtInt(xs.length)} ${measure} values, resampled with replacement. ` +
    `The shaded band is the ${fmtPct(confidence, 0)} percentile interval, ${fmt(bLo, 3)} to ${fmt(bHi, 3)} ${units}. ` +
    `The two reference marks are the endpoints of the one-sample t-interval at the same level, ${fmt(tLo, 3)} and ${fmt(tHi, 3)} ${units}. ` +
    `The observed sample mean is ${fmt(boot.estimate, 3)} ${units}.`

  return (
    <Panel
      label={label}
      status={`${fmtInt(boot.reps)} RESAMPLES · SEED ${fmtInt(seed)} · ${fmtPct(confidence, 0)}`}
      tone={tone}
      led={agree ? 'on' : 'warn'}
      ariaLabel="Bootstrap machine: a percentile bootstrap interval for the mean, drawn beside the one-sample t-interval"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <button type="button" className="dr-btn dr-btn--primary dr-btn--sm" onClick={() => setSeed((s) => s + 1)}>
            RESAMPLE
          </button>
          <NumberField label="seed" value={seed} onChange={(v) => setSeed(Math.max(0, Math.round(v)))} min={0} max={9999} step={1} />
          <Slider label="replications" value={reps} min={200} max={4000} step={200} onChange={setReps} format={(v) => fmtInt(v)} />
          <Slider label="confidence level C" value={Math.round(confidence * 100)} min={80} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
        </div>

        <ReadoutGrid>
          <Readout label={`x̄ · the ${fmtInt(xs.length)} observed`} value={fmt(boot.estimate, 4)} tone="sensor" />
          <Readout label="s" value={fmt(sd(xs), 4)} size="sm" />
          <Readout label="skewness" value={fmt(skewness(xs), 2)} size="sm" />
          <Readout label="values outside the fences" value={fmtInt(strays)} size="sm" />
        </ReadoutGrid>

        <Histogram
          values={boot.stats}
          label={`bootstrap means of ${measure} (${units})`}
          highlight={{ from: bLo, to: bHi, color: 'shade', label: `${fmtPct(confidence, 0)} percentile interval` }}
          references={[
            { x: tLo, label: `t ${fmt(tLo, 2)}`, color: 'reference' },
            { x: tHi, label: `t ${fmt(tHi, 2)}`, color: 'reference' },
            { x: boot.estimate, label: `x̄ = ${fmt(boot.estimate, 2)}`, color: 'observed' },
          ]}
          barsLabel={`${fmtInt(boot.reps)} resampled means`}
          height={280}
          ariaLabel={`Histogram of ${fmtInt(boot.reps)} bootstrap means with the percentile interval shaded and the t-interval endpoints marked`}
          description={description}
        />

        <section aria-label="The two intervals">
          <Subhead>The two intervals, at {fmtPct(confidence, 0)}</Subhead>
          <KeyTable
            caption={`Percentile bootstrap against the one-sample t, on the same ${fmtInt(xs.length)} observations`}
            ariaLabel="Bootstrap interval and t-interval, with their endpoints and widths"
            columns={['interval', 'lower', 'upper', `width (${units})`, 'what it assumes about shape']}
            rows={[
              [`percentile bootstrap · ${fmtInt(boot.reps)} resamples`, fmt(bLo, 4), fmt(bHi, 4), fmt(bWidth, 4), 'nothing'],
              [`one-sample t · ${fmtInt(tInterval.df ?? xs.length - 1)} df`, fmt(tLo, 4), fmt(tHi, 4), fmt(tWidth, 4), 'the sampling distribution of x̄ is approximately Normal'],
            ]}
            emphasisRow={agree ? undefined : 0}
          />
          <ReadoutGrid>
            <Readout label="bootstrap SE" value={fmt(boot.se, 4)} size="sm" live />
            <Readout label="t-interval SE" value={fmt(tInterval.se, 4)} size="sm" />
            <Readout label="width ratio (bootstrap ÷ t)" value={fmt(bWidth / tWidth, 3)} size="sm" live />
            <Readout label="endpoints agree" value={agree ? 'yes' : 'not at this seed'} tone={agree ? 'sensor' : 'alert'} size="sm" live />
          </ReadoutGrid>
        </section>

        <Note tone={agree ? 'ok' : 'warn'} live>
          {agree
            ? `The two intervals sit on top of each other: ${fmt(bLo, 2)} to ${fmt(bHi, 2)} against ${fmt(tLo, 2)} to ${fmt(tHi, 2)} ${units}. They rest on different assumptions and return the same answer, so the conclusion does not depend on the assumption they differ in. Report one, and say the other agreed.`
            : `At this seed and this number of replications the endpoints have drifted apart. Raise the replications before reading anything into that: below about a thousand resamples the percentile endpoints carry visible Monte-Carlo noise of their own.`}
        </Note>

        <Note>
          A bootstrap earns its place when the sample is small and the Normal condition is thin: a mild tail, {fmtInt(xs.length)} observations rather than sixty, a shape the graph cannot
          settle either way. It replaces the Normal model with the sample itself. Draw {fmtInt(xs.length)} values back out of the {fmtInt(xs.length)} with replacement, take the mean, and
          repeat until the middle {fmtPct(confidence, 0)} of those means can be read off directly.
        </Note>

        <Note tone="warn">
          What it does not fix: a sample that is unlike the population. Every resample is drawn from the {fmtInt(xs.length)} values in hand, so if those are unrepresentative then all{' '}
          {fmtInt(boot.reps)} resamples are unrepresentative in exactly the same way, and both intervals are centred, precisely, on the wrong number. Replications buy precision in the
          endpoints of the interval and no information at all about {measure}.
        </Note>

        <Note>
          Raising the replications from {fmtInt(200)} to {fmtInt(4000)} shrinks the wobble in the endpoints between one seed and the next; it leaves the width where the {fmtInt(xs.length)}{' '}
          observations put it. Press RESAMPLE a few times at each setting and watch which of the two numbers moves.
        </Note>
      </div>
    </Panel>
  )
}
