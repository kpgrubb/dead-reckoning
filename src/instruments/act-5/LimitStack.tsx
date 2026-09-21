/**
 * INTEL · LIMIT STACK (calc briefing: limits-and-the-CLT).
 *
 * "The CLT is a statement about a limit. What converges, and how fast."
 *
 * What converges is the STANDARDIZED mean (x̄ − μ)/(σ/√n), and it converges to one fixed curve —
 * the standard normal — which is why this instrument plots that and not x̄ itself. The parent's own
 * shape is drawn beside it and never moves as n walks from 1 to 200, so the sentence "the data become
 * normal" has nowhere to hide.
 *
 * How fast is the second plot: σ/√n against n over the whole range, with the current n marked. It is
 * a 1/√n curve — steep at the start, nearly flat by the end — so quadrupling n halves the spread, and
 * the "n to halve the current SD" readout says exactly that in numbers.
 *
 * The convergence readout is a crude Kolmogorov distance between the simulated standardized CDF and
 * the normal one, computed at runtime from `normal.cdf`, so "it gets closer as n grows" is a number
 * the learner watches fall rather than a claim they are asked to accept.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components'
import { BarChart, DensityCurve, Histogram, Readout, ReadoutRow, Scatter, Segmented, Slider, type ScatterPoint } from '@/instruments/shared'
import { seedFrom } from '@/lib/rng'
import { parentMean, parentSd, simulate } from '@/lib/sim'
import { useModule } from '@/components/ModuleContext'
import { useProgress } from '@/store/progress'
import { fmt, fmtInt, gammaFn, normal, uniform } from '@/lib/stats'
import { PARENTS, parentById } from './data'
import './act5.css'

type Params = Record<string, unknown>

const num = (p: Params, key: string, def: number): number => (typeof p[key] === 'number' && Number.isFinite(p[key] as number) ? (p[key] as number) : def)
const kindOf = (p: Params): string => (typeof p.parent === 'string' ? (p.parent as string) : 'normal')

/** Replications behind each n — small enough that the whole stack redraws while the slider moves. */
const REPS = 800
const N_MAX = 200
const Z_SPAN = 4

/** The parent's own density, analytically. Null for Bernoulli — it has no density. */
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
      return (x) => w * normal.pdf(x, num(p, 'mu1', -2), s) + (1 - w) * normal.pdf(x, num(p, 'mu2', 2), s)
    }
    case 'bernoulli':
      return null
    default:
      return (x) => normal.pdf(x, num(p, 'mu', 0), num(p, 'sigma', 1))
  }
}

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

/** Largest gap between the empirical CDF of the standardized means and the standard normal CDF. */
function kolmogorovDistance(zs: readonly number[]): number {
  if (zs.length < 2) return NaN
  const sorted = zs.slice().sort((a, b) => a - b)
  const n = sorted.length
  let d = 0
  for (let i = 0; i < n; i++) {
    const phi = normal.cdf(sorted[i])
    d = Math.max(d, Math.abs(i / n - phi), Math.abs((i + 1) / n - phi))
  }
  return d
}

export interface LimitStackProps {
  /** Parent selected on load (an id from PARENTS). */
  parent?: string
  /** Sample size on load. */
  n?: number
}

export function LimitStack({ parent: parent0 = 'time-to-silence', n: n0 = 4 }: LimitStackProps = {}) {
  const [parentId, setParentId] = useState(parent0)
  const [n, setN] = useState(n0)

  const learnerSeed = useProgress((s) => s.learnerSeed)
  const { meta } = useModule()
  const seed = seedFrom(learnerSeed, meta.id, 'act-5-calc/limit-stack', parentId)

  const spec = parentById(parentId)
  const params = spec.params
  const mu = parentMean(params)
  const sigma = parentSd(params)
  const se = sigma / Math.sqrt(n)

  /* ---- What converges: the STANDARDIZED mean ---- */
  const zs = useMemo(() => {
    const means = simulate('sample-mean', { ...params, n }, seed, REPS)
    const s = sigma / Math.sqrt(n)
    return means.map((m) => (m - mu) / s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, n, seed, mu, sigma])
  const distance = useMemo(() => kolmogorovDistance(zs), [zs])

  /* ---- How fast: σ/√n over the whole range, with the current n marked ---- */
  const sePoints = useMemo<ScatterPoint[]>(() => Array.from({ length: N_MAX }, (_, i) => ({ x: i + 1, y: sigma / Math.sqrt(i + 1) })), [sigma])
  const pdf = useMemo(() => parentPdf(params), [params])
  const domain = useMemo(() => parentDomain(params), [params])

  const standardNormal = useMemo(() => (x: number) => normal.pdf(x), [])
  const halvingN = n * 4

  const parentDescription = `The parent population: ${spec.label}. ${spec.note} Its mean is ${fmt(mu, 4)} and its standard deviation ${fmt(sigma, 4)} ${spec.unitLabel}. Moving the sample size does not change this plot at all.`
  const zDescription = `Histogram of ${fmtInt(REPS)} standardized sample means, that is x-bar minus mu divided by sigma over root n, for samples of ${fmtInt(n)} drawn from ${spec.label}, with the standard normal density overlaid. The largest gap between the simulated cumulative distribution and the standard normal one is ${fmt(distance, 4)}.`
  const seDescription = `The standard deviation of the sample mean, sigma over root n, plotted against sample size from 1 to ${fmtInt(N_MAX)} for a population standard deviation of ${fmt(sigma, 4)}. At n = ${fmtInt(n)} it is ${fmt(se, 4)}; to halve it takes n = ${fmtInt(halvingN)}. The curve falls like one over the square root of n, so it is steep at the left and nearly flat at the right.`

  return (
    <Panel label="INTEL · LIMIT STACK · WHAT CONVERGES, AND HOW FAST" status={`n = ${fmtInt(n)} · σ/√n = ${fmt(se, 4)}`} tone="intel" led="on">
      <div className="dr-act5__stack">
        <div className="dr-controls">
          <Segmented label="PARENT POPULATION" value={parentId} options={PARENTS.map((p) => ({ value: p.id, label: p.label }))} onChange={setParentId} />
          <Slider label="sample size n" value={n} min={1} max={N_MAX} step={1} onChange={setN} format={fmtInt} />
        </div>

        <div className="dr-act5__split">
          <section aria-label="Parent population">
            <h4 className="dr-act5__head">The population · does not move</h4>
            {pdf ? (
              <DensityCurve curves={{ pdf, label: spec.label, color: 'null' }} domain={domain} references={[{ x: mu, label: 'μ', color: 'reference' }]} xLabel={spec.unitLabel} height={200} ariaLabel={`Density of the parent population: ${spec.label}`} description={parentDescription} />
            ) : (
              <BarChart
                categories={['arrived (0)', 'lost (1)']}
                values={[1 - num(params, 'p', 0.5), num(params, 'p', 0.5)]}
                label={spec.unitLabel}
                valueLabel="probability"
                height={200}
                ariaLabel={`Probability distribution of the parent population: ${spec.label}`}
                description={parentDescription}
              />
            )}
          </section>

          <section aria-label="How fast the spread falls">
            <h4 className="dr-act5__head">How fast · σ/√n against n</h4>
            <Scatter points={sePoints} highlight={n - 1} xLabel="sample size n" yLabel="σ/√n" xDomain={[0, N_MAX]} height={200} radius={2} ariaLabel="Standard deviation of the sample mean against sample size" description={seDescription} />
          </section>
        </div>

        <section aria-label="Standardized sampling distribution">
          <h4 className="dr-act5__head">What converges · (x̄ − μ) ÷ (σ/√n)</h4>
          <Histogram
            values={zs}
            density
            domain={[-Z_SPAN, Z_SPAN]}
            binWidth={0.25}
            label="standardized sample mean · z"
            barsLabel={`${fmtInt(REPS)} standardized means of ${fmtInt(n)}`}
            curve={standardNormal}
            curveLabel="N(0, 1) · the limit"
            height={240}
            ariaLabel={`Histogram of ${fmtInt(REPS)} standardized sample means with the standard normal density overlaid`}
            description={zDescription}
          />
        </section>

        <ReadoutRow>
          <Readout label="sample size n" value={fmtInt(n)} tone="intel" live />
          <Readout label="σ/√n" value={fmt(se, 5)} tone="intel" live />
          <Readout label="largest gap from N(0, 1) · the convergence" value={fmt(distance, 4)} tone={distance > 0.06 ? 'alert' : 'intel'} live />
          <Readout label="n needed to halve σ/√n" value={fmtInt(halvingN)} tone="log" live />
        </ReadoutRow>
        <ReadoutRow>
          <Readout label="parent μ" value={fmt(mu, 4)} size="sm" />
          <Readout label="parent σ" value={fmt(sigma, 4)} size="sm" />
          <Readout label="replications behind each n" value={fmtInt(REPS)} size="sm" />
        </ReadoutRow>

        <p className="dr-act5__note">
          A limit needs something fixed to converge <em>to</em>. x̄ is not it — x̄ keeps shrinking towards μ, and a distribution collapsing onto a point tells you nothing about its shape. Standardize it, and the target stops moving: <strong>(x̄ − μ) ÷ (σ/√n) → N(0, 1)</strong>. Walk n up and watch the gap readout fall towards zero while the population beside it does not change by a pixel. Then read the rate: σ/√n falls like 1/√n, so from n = {fmtInt(n)} you need n = {fmtInt(halvingN)} — four times the transits — to halve the spread. Precision is expensive, and it gets more expensive the more of it you already have.
        </p>
      </div>
    </Panel>
  )
}
