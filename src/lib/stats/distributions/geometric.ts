/**
 * Geometric(p) — AP definition: the number of trials up to AND INCLUDING the first success.
 * Support 1, 2, 3, … (matches SciPy `geom` and the TI-84 `geometpdf`).
 *   geometric.pmf(3, 0.2)   → (0.8)² · 0.2 = 0.128
 *   geometric.cdf(3, 0.2)   → 1 − 0.8³ = 0.488
 *   geometric.sf(3, 0.2)    → 0.8³ = 0.512  (P(X > 3): more than 3 trials needed)
 *   geometric.mean(0.2)     → 5
 */
import type { Rng } from '@/lib/rng'

function check(p: number) {
  if (!(p > 0 && p <= 1)) throw new RangeError(`geometric: p must be in (0, 1], got ${p}`)
}

/** P(X = k) = (1 − p)^(k−1) p for integer k ≥ 1. */
export function pmf(k: number, p: number): number {
  check(p)
  if (!Number.isInteger(k) || k < 1) return 0
  if (p === 1) return k === 1 ? 1 : 0
  return Math.exp((k - 1) * Math.log1p(-p)) * p
}

/** P(X ≤ k) = 1 − (1 − p)^k. */
export function cdf(k: number, p: number): number {
  check(p)
  if (Number.isNaN(k)) return NaN
  k = Math.floor(k)
  if (k < 1) return 0
  if (p === 1) return 1
  return -Math.expm1(k * Math.log1p(-p))
}

/** P(X > k) = (1 − p)^k. */
export function sf(k: number, p: number): number {
  check(p)
  if (Number.isNaN(k)) return NaN
  k = Math.floor(k)
  if (k < 1) return 1
  if (p === 1) return 0
  return Math.exp(k * Math.log1p(-p))
}

/** P(X ≥ k). */
export function atLeast(k: number, p: number): number {
  return sf(k - 1, p)
}

/** P(lo ≤ X ≤ hi), inclusive. */
export function between(lo: number, hi: number, p: number): number {
  if (hi < lo) return 0
  return cdf(hi, p) - cdf(lo - 1, p)
}

/** Smallest k ≥ 1 with P(X ≤ k) ≥ q. */
export function quantile(q: number, p: number): number {
  check(p)
  if (Number.isNaN(q) || q < 0 || q > 1) return NaN
  if (q === 1) return p === 1 ? 1 : Infinity
  if (q <= 0 || p === 1) return 1
  // k = ceil(log(1 − q) / log(1 − p)), guarded against round-off with a local check.
  let k = Math.max(1, Math.ceil(Math.log1p(-q) / Math.log1p(-p) - 1e-12))
  while (k > 1 && cdf(k - 1, p) >= q - 1e-12) k--
  while (cdf(k, p) < q - 1e-12) k++
  return k
}

export function mean(p: number): number {
  check(p)
  return 1 / p
}
export function variance(p: number): number {
  check(p)
  return (1 - p) / (p * p)
}
export function sd(p: number): number {
  return Math.sqrt(variance(p))
}

/** Table [{ k, p }] for k = 1..kMax. */
export function table(p: number, kMax: number): { k: number; p: number }[] {
  const out: { k: number; p: number }[] = []
  for (let k = 1; k <= kMax; k++) out.push({ k, p: pmf(k, p) })
  return out
}

export function sample(rng: Rng, n: number, p: number): number[] {
  check(p)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = rng.geometric(p)
  return out
}
