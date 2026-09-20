/**
 * Random variables (AP Unit 4): discrete RVs from (values, probabilities), linear transforms,
 * sums/differences of independent RVs, binomial/geometric moments.
 *   const X = discreteRV([0, 1, 2], [0.5, 0.3, 0.2])
 *   X.mean → 0.7 ; X.variance → 0.61 ; X.sd → 0.781…
 *   linearTransformRV(X, 3, 10)        → moments of 3X + 10 (mean 12.1, sd 2.34…)
 *   sumRV(X, Y)                        → mean/variance/sd of X + Y (independent)
 *   differenceRV(X, Y)                 → mean/variance/sd of X − Y (variances ADD)
 *   convolve(X, Y)                     → full distribution of X + Y (e.g. two dice)
 *   binomialMoments(10, 0.3)           → { mean: 3, variance: 2.1, sd: 1.449… }
 */
import { binomial, geometric } from './distributions'

export interface Moments {
  mean: number
  variance: number
  sd: number
}

export interface DiscreteRV extends Moments {
  values: number[]
  probs: number[]
}

/** Probabilities must be non-negative and sum to 1 within `tol`. Returns the sum. */
export function checkProbabilities(probs: readonly number[], tol = 1e-9): number {
  if (probs.length === 0) throw new RangeError('probabilities: empty')
  let s = 0
  for (const p of probs) {
    if (!(p >= 0) || !Number.isFinite(p)) throw new RangeError(`probabilities: each must be a finite non-negative number, got ${p}`)
    s += p
  }
  if (Math.abs(s - 1) > tol) throw new RangeError(`probabilities must sum to 1 (got ${s})`)
  return s
}

/** Does a probability list sum to 1 within `tol`? (Non-throwing form of checkProbabilities.) */
export function probabilitiesValid(probs: readonly number[], tol = 1e-9): boolean {
  try {
    checkProbabilities(probs, tol)
    return true
  } catch {
    return false
  }
}

/** E[X] = Σ x·p. */
export function expectedValue(values: readonly number[], probs: readonly number[]): number {
  if (values.length !== probs.length) throw new RangeError('expectedValue: values and probs differ in length')
  checkProbabilities(probs)
  let m = 0
  for (let i = 0; i < values.length; i++) m += values[i] * probs[i]
  return m
}

/** Var(X) = Σ (x − μ)²·p. */
export function rvVariance(values: readonly number[], probs: readonly number[]): number {
  const mu = expectedValue(values, probs)
  let v = 0
  for (let i = 0; i < values.length; i++) v += (values[i] - mu) * (values[i] - mu) * probs[i]
  return v
}

export function rvSd(values: readonly number[], probs: readonly number[]): number {
  return Math.sqrt(rvVariance(values, probs))
}

/** Build a discrete RV (values need not be sorted; duplicates are merged). */
export function discreteRV(values: readonly number[], probs: readonly number[]): DiscreteRV {
  if (values.length !== probs.length) throw new RangeError('discreteRV: values and probs differ in length')
  checkProbabilities(probs)
  const map = new Map<number, number>()
  for (let i = 0; i < values.length; i++) map.set(values[i], (map.get(values[i]) ?? 0) + probs[i])
  const vs = [...map.keys()].sort((a, b) => a - b)
  const ps = vs.map((v) => map.get(v)!)
  const mean = expectedValue(vs, ps)
  const variance = rvVariance(vs, ps)
  return { values: vs, probs: ps, mean, variance, sd: Math.sqrt(variance) }
}

/** P(X ≤ x). */
export function rvCdf(rv: DiscreteRV, x: number): number {
  let s = 0
  for (let i = 0; i < rv.values.length; i++) if (rv.values[i] <= x) s += rv.probs[i]
  return s
}

/** P(predicate(x)) — e.g. rvProb(X, x => x >= 2). */
export function rvProb(rv: DiscreteRV, predicate: (x: number) => boolean): number {
  let s = 0
  for (let i = 0; i < rv.values.length; i++) if (predicate(rv.values[i])) s += rv.probs[i]
  return s
}

/** Moments (and distribution, if given an RV) of aX + b. Mean → aμ + b, sd → |a|σ, variance → a²σ². */
export function linearTransformRV(x: Moments | DiscreteRV, a: number, b: number): DiscreteRV | Moments {
  const mean = a * x.mean + b
  const variance = a * a * x.variance
  const sd = Math.abs(a) * x.sd
  if ('values' in x) {
    const values = x.values.map((v) => a * v + b)
    // Re-sort if a < 0.
    const idx = values.map((_, i) => i).sort((i, j) => values[i] - values[j])
    return { values: idx.map((i) => values[i]), probs: idx.map((i) => x.probs[i]), mean, variance, sd }
  }
  return { mean, variance, sd }
}

/** Moments of X + Y for INDEPENDENT X, Y: means add, variances add. */
export function sumRV(x: Moments, y: Moments): Moments {
  const variance = x.variance + y.variance
  return { mean: x.mean + y.mean, variance, sd: Math.sqrt(variance) }
}

/** Moments of X − Y for INDEPENDENT X, Y: means subtract, variances still ADD. */
export function differenceRV(x: Moments, y: Moments): Moments {
  const variance = x.variance + y.variance
  return { mean: x.mean - y.mean, variance, sd: Math.sqrt(variance) }
}

/** Moments of Σ cᵢXᵢ for independent Xᵢ. */
export function combineRV(rvs: readonly Moments[], coefficients: readonly number[]): Moments {
  if (rvs.length !== coefficients.length) throw new RangeError('combineRV: rvs and coefficients differ in length')
  let mean = 0
  let variance = 0
  for (let i = 0; i < rvs.length; i++) {
    mean += coefficients[i] * rvs[i].mean
    variance += coefficients[i] * coefficients[i] * rvs[i].variance
  }
  return { mean, variance, sd: Math.sqrt(variance) }
}

/** Moments of the sum of n iid copies of X (mean nμ, variance nσ²). */
export function sumOfIid(x: Moments, n: number): Moments {
  const variance = n * x.variance
  return { mean: n * x.mean, variance, sd: Math.sqrt(variance) }
}

/** Moments of the mean of n iid copies of X (mean μ, sd σ/√n) — the sampling-distribution fact. */
export function meanOfIid(x: Moments, n: number): Moments {
  const variance = x.variance / n
  return { mean: x.mean, variance, sd: Math.sqrt(variance) }
}

/** Exact distribution of X + Y for independent discrete X, Y (convolution). */
export function convolve(x: DiscreteRV, y: DiscreteRV): DiscreteRV {
  const map = new Map<number, number>()
  for (let i = 0; i < x.values.length; i++)
    for (let j = 0; j < y.values.length; j++) {
      const v = x.values[i] + y.values[j]
      map.set(v, (map.get(v) ?? 0) + x.probs[i] * y.probs[j])
    }
  const vs = [...map.keys()].sort((a, b) => a - b)
  return discreteRV(vs, vs.map((v) => map.get(v)!))
}

/** Fair die with `sides` faces as a discrete RV. */
export function dieRV(sides = 6): DiscreteRV {
  const values = Array.from({ length: sides }, (_, i) => i + 1)
  return discreteRV(values, values.map(() => 1 / sides))
}

/** Distribution of the sum of `count` fair dice. */
export function diceSumRV(count: number, sides = 6): DiscreteRV {
  let rv = dieRV(sides)
  for (let i = 1; i < count; i++) rv = convolve(rv, dieRV(sides))
  return rv
}

/** Binomial(n, p) as an explicit discrete RV (k = 0..n). */
export function binomialRV(n: number, p: number): DiscreteRV {
  const t = binomial.table(n, p)
  return discreteRV(t.map((r) => r.k), t.map((r) => r.p))
}

/** Binomial moments: mean np, variance np(1 − p). */
export function binomialMoments(n: number, p: number): Moments {
  return { mean: binomial.mean(n, p), variance: binomial.variance(n, p), sd: binomial.sd(n, p) }
}

/** Geometric moments (trials to first success): mean 1/p, sd √(1 − p)/p. */
export function geometricMoments(p: number): Moments {
  return { mean: geometric.mean(p), variance: geometric.variance(p), sd: geometric.sd(p) }
}

/** Moments of a Bernoulli(p) indicator. */
export function bernoulliMoments(p: number): Moments {
  return { mean: p, variance: p * (1 - p), sd: Math.sqrt(p * (1 - p)) }
}
