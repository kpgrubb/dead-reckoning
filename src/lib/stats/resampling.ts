/**
 * Resampling (bootstrap and permutation/randomization tests). Seeded through `Rng`; every function
 * returns the array of resampled statistics so instruments can draw the distribution.
 *
 *   bootstrapMean(xs, { rng, reps: 2000 })                → { estimate, stats, ci: [lo, hi], se }
 *   bootstrap(xs, median, { rng })                          → any statistic
 *   bootstrapSlope(xs, ys, { rng })                         → resample (x, y) pairs
 *   bootstrapDifferenceInMeans(a, b, { rng })
 *   permutationTest(a, b, { rng, statistic: 'mean-diff' })  → { observed, stats, pValue }
 *   permutationTestProportions({ x1, n1, x2, n2 }, { rng })
 *
 * Conventions: percentile bootstrap CI (the (1 − C)/2 and (1 + C)/2 quantiles of the bootstrap
 * distribution, linear interpolation); permutation P-value = (# resamples at least as extreme as
 * observed) / reps, the AP simulation convention (no +1 correction); two-sided uses |stat| ≥ |observed|.
 */
import type { Rng } from '@/lib/rng'
import { mean, median, percentile, sd } from './descriptive'
import { linearRegression } from './regression'
import type { Alternative } from './critical'

export interface ResampleOptions {
  rng: Rng
  reps?: number
  confidence?: number
}

export interface BootstrapResult {
  /** Statistic on the original sample. */
  estimate: number
  stats: number[]
  /** Percentile CI. */
  ci: [number, number]
  /** Bootstrap standard error (sd of the resampled statistics). */
  se: number
  reps: number
  confidence: number
}

function finish(estimate: number, stats: number[], confidence: number): BootstrapResult {
  const alpha = 1 - confidence
  return { estimate, stats, ci: [percentile(stats, (alpha / 2) * 100), percentile(stats, (1 - alpha / 2) * 100)], se: stats.length > 1 ? sd(stats) : NaN, reps: stats.length, confidence }
}

/** Generic bootstrap of any statistic of a single sample. */
export function bootstrap(xs: readonly number[], statistic: (sample: number[]) => number, { rng, reps = 1000, confidence = 0.95 }: ResampleOptions): BootstrapResult {
  if (xs.length === 0) throw new RangeError('bootstrap: empty sample')
  const stats = new Array<number>(reps)
  for (let i = 0; i < reps; i++) stats[i] = statistic(rng.resample(xs))
  return finish(statistic(xs.slice()), stats, confidence)
}

export function bootstrapMean(xs: readonly number[], opts: ResampleOptions): BootstrapResult {
  return bootstrap(xs, mean, opts)
}

export function bootstrapMedian(xs: readonly number[], opts: ResampleOptions): BootstrapResult {
  return bootstrap(xs, median, opts)
}

export function bootstrapSd(xs: readonly number[], opts: ResampleOptions): BootstrapResult {
  return bootstrap(xs, sd, opts)
}

/** Bootstrap a proportion from x successes in n (resamples the 0/1 indicators). */
export function bootstrapProportion(x: number, n: number, opts: ResampleOptions): BootstrapResult {
  const ind = Array.from({ length: n }, (_, i) => (i < x ? 1 : 0))
  return bootstrap(ind, mean, opts)
}

/** Bootstrap the difference in means a − b (resample each group independently). */
export function bootstrapDifferenceInMeans(a: readonly number[], b: readonly number[], { rng, reps = 1000, confidence = 0.95 }: ResampleOptions): BootstrapResult {
  const stats = new Array<number>(reps)
  for (let i = 0; i < reps; i++) stats[i] = mean(rng.resample(a)) - mean(rng.resample(b))
  return finish(mean(a) - mean(b), stats, confidence)
}

/** Bootstrap the difference in proportions p̂₁ − p̂₂. */
export function bootstrapDifferenceInProportions({ x1, n1, x2, n2 }: { x1: number; n1: number; x2: number; n2: number }, opts: ResampleOptions): BootstrapResult {
  const a = Array.from({ length: n1 }, (_, i) => (i < x1 ? 1 : 0))
  const b = Array.from({ length: n2 }, (_, i) => (i < x2 ? 1 : 0))
  return bootstrapDifferenceInMeans(a, b, opts)
}

/** Bootstrap the regression slope by resampling (x, y) pairs. */
export function bootstrapSlope(xs: readonly number[], ys: readonly number[], { rng, reps = 1000, confidence = 0.95 }: ResampleOptions): BootstrapResult {
  if (xs.length !== ys.length || xs.length < 3) throw new RangeError('bootstrapSlope: need ≥ 3 paired points')
  const idx = xs.map((_, i) => i)
  const stats = new Array<number>(reps)
  for (let i = 0; i < reps; i++) {
    const pick = rng.resample(idx)
    const bx = pick.map((j) => xs[j])
    const by = pick.map((j) => ys[j])
    let s: number
    try {
      s = linearRegression(bx, by).slope
    } catch {
      s = NaN // degenerate resample (all x identical) — extremely rare; redraw
      i--
      continue
    }
    stats[i] = s
  }
  return finish(linearRegression(xs, ys).slope, stats, confidence)
}

export interface PermutationResult {
  observed: number
  stats: number[]
  pValue: number
  alternative: Alternative
  reps: number
}

export type TwoSampleStatistic = 'mean-diff' | 'median-diff' | 'prop-diff' | ((a: number[], b: number[]) => number)

function statFn(s: TwoSampleStatistic): (a: number[], b: number[]) => number {
  if (typeof s === 'function') return s
  if (s === 'median-diff') return (a, b) => median(a) - median(b)
  return (a, b) => mean(a) - mean(b) // mean-diff and prop-diff (0/1 data) are the same arithmetic
}

/** Count resamples at least as extreme as the observed statistic, per the alternative. */
export function permutationPValue(stats: readonly number[], observed: number, alt: Alternative = 'two-sided'): number {
  let c = 0
  const eps = 1e-12 * (1 + Math.abs(observed))
  for (const s of stats) {
    if (alt === 'greater' ? s >= observed - eps : alt === 'less' ? s <= observed + eps : Math.abs(s) >= Math.abs(observed) - eps) c++
  }
  return c / stats.length
}

/**
 * Permutation (randomization) test for a two-group statistic (default: difference in means a − b).
 * Under H₀ the group labels are exchangeable, so the pooled values are shuffled and re-split each rep.
 */
export function permutationTest(a: readonly number[], b: readonly number[], { rng, reps = 1000, statistic = 'mean-diff', alt = 'two-sided' }: ResampleOptions & { statistic?: TwoSampleStatistic; alt?: Alternative }): PermutationResult {
  if (a.length === 0 || b.length === 0) throw new RangeError('permutationTest: both groups need data')
  const f = statFn(statistic)
  const observed = f(a.slice(), b.slice())
  const pooled = [...a, ...b]
  const na = a.length
  const stats = new Array<number>(reps)
  for (let i = 0; i < reps; i++) {
    const sh = rng.shuffle(pooled)
    stats[i] = f(sh.slice(0, na), sh.slice(na))
  }
  return { observed, stats, pValue: permutationPValue(stats, observed, alt), alternative: alt, reps }
}

/** Permutation test for a difference in proportions built from counts. */
export function permutationTestProportions({ x1, n1, x2, n2 }: { x1: number; n1: number; x2: number; n2: number }, opts: ResampleOptions & { alt?: Alternative }): PermutationResult {
  const a = Array.from({ length: n1 }, (_, i) => (i < x1 ? 1 : 0))
  const b = Array.from({ length: n2 }, (_, i) => (i < x2 ? 1 : 0))
  return permutationTest(a, b, { ...opts, statistic: 'prop-diff' })
}

/**
 * Simulation-based P-value for a one-sample statistic: `simulate(rng)` draws one statistic under H₀;
 * returns the proportion at least as extreme as `observed`.
 */
export function simulatedPValue(simulate: (rng: Rng) => number, observed: number, { rng, reps = 1000, alt = 'two-sided', center = 0 }: ResampleOptions & { alt?: Alternative; center?: number }): PermutationResult {
  const stats = new Array<number>(reps)
  for (let i = 0; i < reps; i++) stats[i] = simulate(rng)
  const shifted = stats.map((s) => s - center)
  return { observed, stats, pValue: permutationPValue(shifted, observed - center, alt), alternative: alt, reps }
}
