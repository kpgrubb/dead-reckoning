/**
 * Poisson(λ): counts of rare events with mean λ. (Used by simulations; beyond the AP syllabus.)
 *   poisson.pmf(2, 3.5)   → P(X = 2)
 *   poisson.cdf(2, 3.5)   → P(X ≤ 2) = Q(3, 3.5)
 */
import type { Rng } from '@/lib/rng'
import { gammaP, gammaQ, logFactorial } from '../special'

function check(lambda: number) {
  if (!(lambda >= 0)) throw new RangeError(`poisson: lambda must be non-negative, got ${lambda}`)
}

export function pmf(k: number, lambda: number): number {
  check(lambda)
  if (!Number.isInteger(k) || k < 0) return 0
  if (lambda === 0) return k === 0 ? 1 : 0
  return Math.exp(k * Math.log(lambda) - lambda - logFactorial(k))
}

export function cdf(k: number, lambda: number): number {
  check(lambda)
  if (Number.isNaN(k)) return NaN
  k = Math.floor(k)
  if (k < 0) return 0
  if (lambda === 0) return 1
  return gammaQ(k + 1, lambda)
}

export function sf(k: number, lambda: number): number {
  check(lambda)
  if (Number.isNaN(k)) return NaN
  k = Math.floor(k)
  if (k < 0) return 1
  if (lambda === 0) return 0
  return gammaP(k + 1, lambda)
}

export function atLeast(k: number, lambda: number): number {
  return sf(k - 1, lambda)
}

export function between(lo: number, hi: number, lambda: number): number {
  if (hi < lo) return 0
  return cdf(hi, lambda) - cdf(lo - 1, lambda)
}

/** Smallest k with P(X ≤ k) ≥ q. */
export function quantile(q: number, lambda: number): number {
  check(lambda)
  if (Number.isNaN(q) || q < 0 || q > 1) return NaN
  if (q === 1) return Infinity
  if (q <= 0 || lambda === 0) return 0
  let k = 0
  let c = pmf(0, lambda)
  const tol = 1e-12
  while (c < q - tol) {
    k++
    c += pmf(k, lambda)
    if (k > 1e7) return Infinity
  }
  return k
}

export function mean(lambda: number): number {
  check(lambda)
  return lambda
}
export function variance(lambda: number): number {
  check(lambda)
  return lambda
}
export function sd(lambda: number): number {
  return Math.sqrt(variance(lambda))
}

export function sample(rng: Rng, n: number, lambda: number): number[] {
  check(lambda)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = rng.poisson(lambda)
  return out
}
