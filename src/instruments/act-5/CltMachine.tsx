/**
 * INTEL · CENTRAL LIMIT MACHINE (act-5-03) — the Act's flagship.
 *
 * Two displays on ONE axis, which is the whole trick: the parent population on top, unchanged, and
 * the sampling distribution of x̄ forming underneath it. Move n and the top plot does not stir while
 * the bottom pile visibly narrows — because the CLT is a statement about x̄, never about the transits.
 *
 * Pick a parent that is nothing like normal (marks uniform on 1–12, time to silence with a long right
 * tail, two drive families with no centre at all, or a Bernoulli that is only ones and zeros) and the
 * bottom pile still walks towards a normal curve as n grows. The overlay is N(μ, σ/√n) computed from
 * the parent's own μ and σ, not fitted to the simulation, so "the machine agrees with the theory" is
 * something the learner checks rather than something the instrument asserts.
 *
 * The three readouts that carry the lesson:
 *   σ/√n · the theory        computed from `parentSd` and n
 *   SD of the simulated x̄    computed from the Monte Carlo run
 *   σ/n · the common error   the wrong answer, in alert tone, beside the right one
 *
 * and a fourth pair — the parent's skewness against the stack's — so "the shape forms anyway" is
 * measured. The Monte Carlo runs through `runSimulation` (Web Worker, streaming), so a 5,000-rep run
 * at n = 60 never blocks the bridge.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Panel } from '@/components'
import { BarChart, DensityCurve, Histogram, Readout, ReadoutRow, Segmented, Slider } from '@/instruments/shared'
import { seedFrom } from '@/lib/rng'
import { rng } from '@/lib/rng'
import { drawParent, parentMean, parentSd, runSimulation, type SimulationHandle } from '@/lib/sim'
import { useProgress } from '@/store/progress'
import { useModule } from '@/components/ModuleContext'
import { fmt, fmtInt, gammaFn, mean, normal, sd, skewness, uniform } from '@/lib/stats'
import { NINETEEN_MEAN_DELAY, NINETEEN_N, PARENTS, parentById } from './data'
import './act5.css'

type Params = Record<string, unknown>

const num = (p: Params, key: string, def: number): number => (typeof p[key] === 'number' && Number.isFinite(p[key] as number) ? (p[key] as number) : def)
const kindOf = (p: Params): string => (typeof p.parent === 'string' ? (p.parent as string) : 'normal')

/** Draws from the parent used only to measure its shape (skewness) — seeded, so it never moves. */
const SHAPE_SAMPLE = 4000
/** Cap on the bottom histogram's bin count, so a tiny σ/√n cannot ask for a thousand rects. */
const MAX_BINS = 160

/** The parent's own density, analytically, from `@/lib/stats`. Null for Bernoulli — it has no density. */
function parentPdf(p: Params): ((x: number) => number) | null {
  switch (kindOf(p)) {
    case 'uniform':
      return (x) => uniform.pdf(x, num(p, 'a', 0), num(p, 'b', 1))
    case 'skewed': {
      const k = Math.max(1, Math.round(num(p, 'shape', 2)))
      const theta = num(p, 'scale', 1)
      return (x) => (x <= 0 ? 0 : Math.exp((k - 1) * Math.log(x) - x / theta - Math.log(gammaFn(k)) - k * Math.log(theta)))
    }
    case 'bimodal': {
      const w = num(p, 'w', 0.5)
      const s = num(p, 'sigma', 1)
      const m1 = num(p, 'mu1', -2)
      const m2 = num(p, 'mu2', 2)
      return (x) => w * normal.pdf(x, m1, s) + (1 - w) * normal.pdf(x, m2, s)
    }
    case 'bernoulli':
      return null
    default:
      return (x) => normal.pdf(x, num(p, 'mu', 0), num(p, 'sigma', 1))
  }
}

/** One axis for both displays: wide enough for the parent, so a narrowing x̄ pile is visibly narrower. */
function parentDomain(p: Params): [number, number] {
  const m = parentMean(p)
  const s = parentSd(p)
  switch (kindOf(p)) {
    case 'uniform': {
      const a = num(p, 'a', 0)
      const b = num(p, 'b', 1)
      const pad = (b - a) * 0.12
      return [a - pad, b + pad]
    }
    case 'skewed':
      return [0, m + 4.2 * s]
    case 'bernoulli':
      return [-0.1, 1.1]
    default:
      return [m - 3.8 * s, m + 3.8 * s]
  }
}

/** A 1–2–5 bin width at or below the target. */
function niceWidth(target: number): number {
  if (!(target > 0) || !Number.isFinite(target)) return 1
  const p = Math.pow(10, Math.floor(Math.log10(target)))
  const m = target / p
  return (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p
}

export interface CltMachineProps {
  /** Parent selected on load (an id from PARENTS). */
  parent?: string
  /** Sample size on load — nineteen is the number of diverted hulls. */
  n?: number
  /** Replications per RUN. */
  reps?: number
  /** Mark the nineteen's own mean delay on the bottom pile when the parent and n match Act V's case. */
  showNineteen?: boolean
}

export function CltMachine({ parent: parent0 = 'lane-delay', n: n0 = NINETEEN_N, reps: reps0 = 2000, showNineteen = false }: CltMachineProps = {}) {
  const [parentId, setParentId] = useState(parent0)
  const [n, setN] = useState(n0)
  const [reps, setReps] = useState(reps0)
  const [results, setResults] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const [generation, setGeneration] = useState(0)
  const handle = useRef<SimulationHandle | null>(null)

  const learnerSeed = useProgress((s) => s.learnerSeed)
  const { meta } = useModule()
  const seed = seedFrom(learnerSeed, meta.id, 'act-5-03/clt', parentId, n, generation)

  const spec = parentById(parentId)
  const params = spec.params
  const mu = parentMean(params)
  const sigma = parentSd(params)
  const se = sigma / Math.sqrt(n)
  const commonError = sigma / n

  /* A run belongs to one (parent, n). Changing either cancels it and empties the stage. */
  useEffect(() => {
    handle.current?.cancel()
    handle.current = null
    setResults([])
    setRunning(false)
  }, [parentId, n])
  useEffect(() => () => handle.current?.cancel(), [])

  const run = useCallback(() => {
    handle.current?.cancel()
    setResults([])
    setRunning(true)
    handle.current = runSimulation({
      task: 'sample-mean',
      params: { ...params, n },
      seed,
      n: reps,
      onProgress: (r) => setResults(r.slice()),
      onDone: () => setRunning(false),
      onError: () => setRunning(false),
    })
  }, [params, n, seed, reps])

  const reset = useCallback(() => {
    handle.current?.cancel()
    handle.current = null
    setResults([])
    setRunning(false)
    setGeneration((g) => g + 1)
  }, [])

  /* ---- The parent's own shape ---- */
  const pdf = useMemo(() => parentPdf(params), [params])
  const domain = useMemo(() => parentDomain(params), [params])
  const parentSkew = useMemo(() => {
    const r = rng('act-5-03/parent-shape', spec.id)
    const xs = new Array<number>(SHAPE_SAMPLE)
    for (let i = 0; i < SHAPE_SAMPLE; i++) xs[i] = drawParent(r, params)
    return skewness(xs)
  }, [spec.id, params])

  /* ---- The sampling distribution forming ---- */
  const done = results.length
  const stackMean = done ? mean(results) : NaN
  const stackSd = done > 1 ? sd(results) : NaN
  const stackSkew = done > 2 ? skewness(results) : NaN
  const markNineteen = showNineteen && parentId === 'lane-delay' && n === NINETEEN_N

  const binWidth = useMemo(() => Math.max(niceWidth(se / 3), (domain[1] - domain[0]) / MAX_BINS), [se, domain])
  const curve = useCallback((x: number) => normal.pdf(x, mu, se), [mu, se])

  const parentDescription = `The parent population: ${spec.label}. ${spec.note} Its mean is ${fmt(mu, 4)} and its standard deviation ${fmt(sigma, 4)} ${spec.unitLabel}, with skewness ${fmt(parentSkew, 3)}. This plot does not change when the sample size changes.`
  const stackDescription = `Sampling distribution of the mean of ${fmtInt(n)} draws from ${spec.label}, over ${fmtInt(done)} of ${fmtInt(reps)} replications. Theory says this pile is centred at ${fmt(mu, 4)} with standard deviation sigma over root n = ${fmt(se, 4)}; the simulated means centre at ${done ? fmt(stackMean, 4) : 'nothing yet'} with standard deviation ${done > 1 ? fmt(stackSd, 4) : '—'} and skewness ${done > 2 ? fmt(stackSkew, 3) : '—'}, against the parent's ${fmt(parentSkew, 3)}. The overlaid curve is the normal model N(mu, sigma over root n), drawn on the same axis as the parent above.${markNineteen ? ` The nineteen diverted transits averaged ${fmt(NINETEEN_MEAN_DELAY, 3)} days, marked on this axis.` : ''}`

  return (
    <Panel label="INTEL · CENTRAL LIMIT MACHINE" status={`SEED ${seed.toString(16).toUpperCase().padStart(8, '0')} · ${fmtInt(done)}/${fmtInt(reps)}`} tone="intel" led={running ? 'busy' : done ? 'on' : 'off'}>
      <div className="dr-act5__stack">
        <div className="dr-controls">
          <Segmented label="PARENT POPULATION" value={parentId} options={PARENTS.map((p) => ({ value: p.id, label: p.label }))} onChange={setParentId} />
          <Slider label="sample size n" value={n} min={1} max={60} step={1} onChange={setN} format={fmtInt} />
          <Slider label="replications per RUN" value={reps} min={500} max={5000} step={500} onChange={setReps} format={fmtInt} />
        </div>

        <section aria-label="Parent population">
          <h4 className="dr-act5__head">The population · one transit at a time</h4>
          {pdf ? (
            <DensityCurve curves={{ pdf, label: spec.label, color: 'null' }} domain={domain} references={[{ x: mu, label: 'μ', color: 'reference' }]} xLabel={spec.unitLabel} height={190} ariaLabel={`Density of the parent population: ${spec.label}`} description={parentDescription} />
          ) : (
            <BarChart
              categories={['arrived (0)', 'lost (1)']}
              values={[1 - num(params, 'p', 0.5), num(params, 'p', 0.5)]}
              label={spec.unitLabel}
              valueLabel="probability"
              height={190}
              ariaLabel={`Probability distribution of the parent population: ${spec.label}`}
              description={parentDescription}
            />
          )}
          <p className="dr-act5__note">{spec.note}</p>
        </section>

        <section aria-label="Sampling distribution of the sample mean">
          <h4 className="dr-act5__head">The sampling distribution of x̄ · {fmtInt(n)} at a time</h4>
          {done ? (
            <Histogram
              values={results}
              density
              domain={domain}
              binWidth={binWidth}
              label={`mean of ${fmtInt(n)} · ${spec.unitLabel}`}
              barsLabel={`simulated means of ${fmtInt(n)}`}
              curve={curve}
              curveLabel="N(μ, σ/√n)"
              references={markNineteen ? [{ x: NINETEEN_MEAN_DELAY, label: "the nineteen's mean", color: 'observed' }] : undefined}
              height={240}
              ariaLabel={`Histogram of ${fmtInt(done)} simulated sample means of ${fmtInt(n)} draws, with the normal model N(mu, sigma over root n) overlaid`}
              description={stackDescription}
            />
          ) : (
            <p className="dr-act5__empty">no replications yet · press RUN</p>
          )}
        </section>

        <ReadoutRow>
          <Readout label="parent μ" value={fmt(mu, 4)} size="sm" />
          <Readout label="parent σ" value={fmt(sigma, 4)} size="sm" />
          <Readout label="σ/√n · the theory" value={fmt(se, 5)} tone="intel" live />
          <Readout label="SD of the simulated means · the machine" value={done > 1 ? fmt(stackSd, 5) : '—'} stale={done < 2} tone="intel" live />
          <Readout label="σ/n · the common error" value={fmt(commonError, 5)} tone="alert" />
        </ReadoutRow>
        <ReadoutRow>
          <Readout label="mean of the simulated means" value={done ? fmt(stackMean, 4) : '—'} size="sm" stale={!done} live />
          <Readout label="parent skewness" value={fmt(parentSkew, 3)} size="sm" tone={Math.abs(parentSkew) > 0.5 ? 'alert' : 'default'} />
          <Readout label="skewness of the stack" value={done > 2 ? fmt(stackSkew, 3) : '—'} size="sm" stale={done < 3} tone="intel" live />
          <Readout label="replications" value={`${fmtInt(done)} / ${fmtInt(reps)}`} size="sm" live />
          {markNineteen && <Readout label="the nineteen's mean delay" value={fmt(NINETEEN_MEAN_DELAY, 3)} units="d" size="sm" tone="alert" />}
        </ReadoutRow>

        <div className="dr-act5__buttons">
          <button type="button" className="dr-btn dr-btn--primary" onClick={run} disabled={running}>
            {running ? 'RUNNING…' : `RUN ${fmtInt(reps)}`}
          </button>
          <button type="button" className="dr-btn dr-btn--ghost" onClick={reset}>
            RESET · NEW SEED
          </button>
          <span className="dr-act5__progress" aria-live="polite">
            {done > 1 ? `σ/√n ${fmt(se, 4)} · simulated ${fmt(stackSd, 4)}` : ''}
          </span>
        </div>

        <p className="dr-act5__note">
          What the theorem says: as n grows, the sampling distribution of <strong>x̄</strong> approaches a normal shape, centred on <strong>μ</strong>, with standard deviation <strong>σ/√n</strong> — whatever the population looks like. Run any parent at n = 2 and then at n = 40 and read the two SD readouts against each other. What it does <em>not</em> say: the population never changes — the top plot is the same flat, skewed or two-humped thing it always was. And &ldquo;n ≥ 30&rdquo; is a rule of thumb about <em>x̄</em>, not a promise about individual transits. Divide by √n, never by n: at n = {fmtInt(n)} the difference between {fmt(se, 4)} and {fmt(commonError, 4)} is the difference between an answer and a blunder.
        </p>
      </div>
    </Panel>
  )
}
