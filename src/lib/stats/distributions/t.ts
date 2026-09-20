/**
 * Student's t distribution with `df` degrees of freedom (df > 0, non-integer allowed — Welch df).
 *   t.cdf(2.131, 15)        → 0.975…
 *   t.quantile(0.975, 15)   → 2.131449545559323
 *   t.sf(2.5, 9)            → one-tailed P-value for t = 2.5, df = 9
 *
 * cdf via the regularized incomplete beta; df = 1 (Cauchy) and df = 2 use closed forms; df ≥ 1e7 or
 * Infinity delegates to the normal. Quantile: bracketed Newton on the cdf, 1e-9 or better.
 */
import type { Rng } from '@/lib/rng'
import { betaInc, invertMonotone, lgammaDiff } from '../special'
import * as normal from './normal'

const NORMAL_DF = 1e7

function check(df: number) {
  if (!(df > 0)) throw new RangeError(`t: df must be positive, got ${df}`)
}

/** Density. */
export function pdf(x: number, df: number): number {
  check(df)
  if (!Number.isFinite(x)) return 0
  if (df >= NORMAL_DF) return normal.pdf(x)
  const logC = lgammaDiff(df / 2, 0.5) - 0.5 * Math.log(df * Math.PI)
  return Math.exp(logC - ((df + 1) / 2) * Math.log1p((x * x) / df))
}

/** Upper-tail probability for |x| (x ≥ 0 assumed by caller). */
function upperTail(ax: number, df: number): number {
  if (df === 1) return 0.5 - Math.atan(ax) / Math.PI
  if (df === 2) return 0.5 - ax / (2 * Math.sqrt(2 + ax * ax))
  // I_z(df/2, ½) with z = df/(df + x²); pass 1 − z and the logs in forms that do not round z first.
  const x2 = ax * ax
  const z = df / (df + x2)
  const zc = x2 / (df + x2)
  return 0.5 * betaInc(z, df / 2, 0.5, zc, -Math.log1p(x2 / df), Math.log(x2) - Math.log(df + x2))
}

/** P(T ≤ x). */
export function cdf(x: number, df: number): number {
  check(df)
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return 1
  if (x === -Infinity) return 0
  if (df >= NORMAL_DF) return normal.cdf(x)
  const tail = upperTail(Math.abs(x), df)
  return x >= 0 ? 1 - tail : tail
}

/** P(T > x). */
export function sf(x: number, df: number): number {
  check(df)
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return 0
  if (x === -Infinity) return 1
  if (df >= NORMAL_DF) return normal.sf(x)
  const tail = upperTail(Math.abs(x), df)
  return x >= 0 ? tail : 1 - tail
}

/** P(lo ≤ T ≤ hi). */
export function between(lo: number, hi: number, df: number): number {
  if (hi < lo) return 0
  if (lo + hi > 0) return sf(lo, df) - sf(hi, df)
  return cdf(hi, df) - cdf(lo, df)
}

/** Inverse cdf, accurate to ~1e-12. */
export function quantile(p: number, df: number): number {
  check(df)
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN
  if (p === 0) return -Infinity
  if (p === 1) return Infinity
  if (p === 0.5) return 0
  if (df >= NORMAL_DF) return normal.standardQuantile(p)
  // Cauchy: −cot(πp) keeps full precision in the tails (tan(π(p − ½)) loses it near p → 0).
  if (df === 1) return p < 0.5 ? -1 / Math.tan(Math.PI * p) : 1 / Math.tan(Math.PI * (1 - p))
  if (df === 2) {
    const a = 4 * p * (1 - p)
    return ((2 * p - 1) * Math.sqrt(2 / a))
  }
  // Symmetric: solve on the lower tail and reflect.
  if (p > 0.5) return -quantile(1 - p, df)
  // Cornish–Fisher-style starting guess from the normal quantile.
  const z = normal.standardQuantile(p)
  const g = z + (z * z * z + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df)
  const guess = Number.isFinite(g) ? g : z
  return invertMonotone((x) => cdf(x, df), p, -Infinity, 0, { derivative: (x) => pdf(x, df), guess })
}

/** Inverse survival: x with P(T > x) = p. */
export function isf(p: number, df: number): number {
  return -quantile(p, df)
}

export function mean(df: number): number {
  check(df)
  return df > 1 ? 0 : NaN
}
export function variance(df: number): number {
  check(df)
  if (df > 2) return df / (df - 2)
  return df > 1 ? Infinity : NaN
}
export function sd(df: number): number {
  return Math.sqrt(variance(df))
}

/** n iid draws by inverse-cdf sampling (exact for any real df). */
export function sample(rng: Rng, n: number, df: number): number[] {
  check(df)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = quantile(rng.float(), df)
  return out
}
