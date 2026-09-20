/**
 * Normal distribution N(μ, σ). Import as `normal` from '@/lib/stats':
 *   normal.cdf(1.96)            → 0.9750021…
 *   normal.quantile(0.975)      → 1.959963984540054
 *   normal.between(-1, 1)       → 0.6826894921370859   (empirical rule)
 *   normal.cdf(70, 65, 3.5)     → P(X ≤ 70) for X ~ N(65, 3.5)
 *
 * cdf/sf use erfc directly so the tails are accurate to |z| ≈ 38 (below that erfc underflows to 0).
 * quantile: Acklam's rational approximation + one Halley refinement → ~1e-15 relative.
 */
import type { Rng } from '@/lib/rng'
import { erfc, SQRT2, SQRT_2PI } from '../special'

function check(sigma: number) {
  if (!(sigma > 0)) throw new RangeError(`normal: sigma must be positive, got ${sigma}`)
}

/** Density. */
export function pdf(x: number, mu = 0, sigma = 1): number {
  check(sigma)
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * SQRT_2PI)
}

/** P(X ≤ x). */
export function cdf(x: number, mu = 0, sigma = 1): number {
  check(sigma)
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return 1
  if (x === -Infinity) return 0
  return 0.5 * erfc(-(x - mu) / (sigma * SQRT2))
}

/** P(X > x) — upper tail, accurate far out. */
export function sf(x: number, mu = 0, sigma = 1): number {
  check(sigma)
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return 0
  if (x === -Infinity) return 1
  return 0.5 * erfc((x - mu) / (sigma * SQRT2))
}

/** P(lo ≤ X ≤ hi). */
export function between(lo: number, hi: number, mu = 0, sigma = 1): number {
  if (hi < lo) return 0
  // Use whichever tail keeps precision.
  const zl = (lo - mu) / sigma
  const zh = (hi - mu) / sigma
  if (zl + zh > 0) return sf(lo, mu, sigma) - sf(hi, mu, sigma)
  return cdf(hi, mu, sigma) - cdf(lo, mu, sigma)
}

const A = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
const B = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
const C = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
const D = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
const P_LOW = 0.02425

function acklam(p: number): number {
  if (p < P_LOW) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  }
  if (p <= 1 - P_LOW) {
    const q = p - 0.5
    const r = q * q
    return ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
  }
  const q = Math.sqrt(-2 * Math.log1p(-p))
  return -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
}

/** Standard-normal quantile z with Φ(z) = p. p = 0 → −∞, p = 1 → +∞. */
export function standardQuantile(p: number): number {
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN
  if (p === 0) return -Infinity
  if (p === 1) return Infinity
  if (p === 0.5) return 0
  // Work on the lower tail: 1 − p is exact in double for p ≥ 0.5, and the erfc-based cdf keeps full
  // relative precision there, so the refinement step is not limited by cancellation near p → 1.
  if (p > 0.5) return -standardQuantile(1 - p)
  let x = acklam(p)
  // Halley refinement against the erfc-based cdf.
  const e = 0.5 * erfc(-x / SQRT2) - p
  const u = e * SQRT_2PI * Math.exp((x * x) / 2)
  x = x - u / (1 + (x * u) / 2)
  return x
}

/** Inverse cdf: the x with P(X ≤ x) = p. */
export function quantile(p: number, mu = 0, sigma = 1): number {
  check(sigma)
  return mu + sigma * standardQuantile(p)
}

/** Inverse survival: the x with P(X > x) = p (by symmetry, so tiny p keeps full precision). */
export function isf(p: number, mu = 0, sigma = 1): number {
  check(sigma)
  return mu - sigma * standardQuantile(p)
}

export function mean(mu = 0, _sigma = 1): number {
  void _sigma
  return mu
}
export function variance(_mu = 0, sigma = 1): number {
  void _mu
  return sigma * sigma
}
export function sd(_mu = 0, sigma = 1): number {
  void _mu
  return sigma
}

/** n iid draws. */
export function sample(rng: Rng, n: number, mu = 0, sigma = 1): number[] {
  check(sigma)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = rng.normal(mu, sigma)
  return out
}
