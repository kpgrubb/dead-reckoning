/**
 * Binomial(n, p): number of successes in n independent trials with success probability p.
 *   binomial.pmf(3, 10, 0.3)        → P(X = 3)
 *   binomial.cdf(3, 10, 0.3)        → P(X ≤ 3)
 *   binomial.sf(3, 10, 0.3)         → P(X > 3)   (so P(X ≥ 3) is sf(2, …) or atLeast(3, …))
 *   binomial.between(2, 5, 10, 0.3) → P(2 ≤ X ≤ 5)
 *   binomial.quantile(0.9, 10, 0.3) → smallest k with P(X ≤ k) ≥ 0.9
 *
 * cdf uses the regularized incomplete beta (P(X ≤ k) = I_{1−p}(n−k, k+1)), so it is accurate for
 * any n; pmf uses exact binomial coefficients while they fit in a double, log-gamma beyond.
 */
import type { Rng } from '@/lib/rng'
import { betaInc, betaIncC, lchoose } from '../special'

function check(n: number, p: number) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`binomial: n must be a non-negative integer, got ${n}`)
  if (!(p >= 0 && p <= 1)) throw new RangeError(`binomial: p must be in [0, 1], got ${p}`)
}

/** P(X = k). Non-integer k → 0. */
export function pmf(k: number, n: number, p: number): number {
  check(n, p)
  if (!Number.isInteger(k) || k < 0 || k > n) return 0
  if (p === 0) return k === 0 ? 1 : 0
  if (p === 1) return k === n ? 1 : 0
  return Math.exp(lchoose(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p))
}

/** P(X ≤ k). Real k is floored. */
export function cdf(k: number, n: number, p: number): number {
  check(n, p)
  if (Number.isNaN(k)) return NaN
  k = Math.floor(k)
  if (k < 0) return 0
  if (k >= n) return 1
  if (p === 0) return 1
  if (p === 1) return 0
  // P(X ≤ k) = I_{1−p}(n − k, k + 1)
  return betaInc(1 - p, n - k, k + 1)
}

/** P(X > k). */
export function sf(k: number, n: number, p: number): number {
  check(n, p)
  if (Number.isNaN(k)) return NaN
  k = Math.floor(k)
  if (k < 0) return 1
  if (k >= n) return 0
  if (p === 0) return 0
  if (p === 1) return 1
  // P(X > k) = I_p(k + 1, n − k)
  return betaIncC(1 - p, n - k, k + 1)
}

/** P(X ≥ k) — the AP "at least" probability. */
export function atLeast(k: number, n: number, p: number): number {
  return sf(k - 1, n, p)
}

/** P(lo ≤ X ≤ hi), inclusive both ends. */
export function between(lo: number, hi: number, n: number, p: number): number {
  if (hi < lo) return 0
  return cdf(hi, n, p) - cdf(lo - 1, n, p)
}

/** Smallest k with P(X ≤ k) ≥ q (equality within 1e-12 counts). */
export function quantile(q: number, n: number, p: number): number {
  check(n, p)
  if (Number.isNaN(q) || q < 0 || q > 1) return NaN
  if (q === 0) return 0
  if (q === 1 || p === 1) return n
  if (p === 0) return 0
  let k = 0
  let c = pmf(0, n, p)
  const tol = 1e-12
  while (c < q - tol && k < n) {
    k++
    c += pmf(k, n, p)
  }
  return k
}

export function mean(n: number, p: number): number {
  check(n, p)
  return n * p
}
export function variance(n: number, p: number): number {
  check(n, p)
  return n * p * (1 - p)
}
export function sd(n: number, p: number): number {
  return Math.sqrt(variance(n, p))
}

/** Full table [{ k, p }] for k = 0..n (for bar charts and RV tables). */
export function table(n: number, p: number): { k: number; p: number }[] {
  check(n, p)
  const out: { k: number; p: number }[] = []
  for (let k = 0; k <= n; k++) out.push({ k, p: pmf(k, n, p) })
  return out
}

/** n iid draws of X ~ Binomial(trials, p). */
export function sample(rng: Rng, n: number, trials: number, p: number): number[] {
  check(trials, p)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = rng.binomial(trials, p)
  return out
}
