/**
 * Chi-square distribution with `df` degrees of freedom.
 *   chi2.sf(7.81, 3)          → 0.05001…  (P-value for χ² = 7.81 with df = 3)
 *   chi2.quantile(0.95, 3)    → 7.814727903251179
 *
 * cdf = P(df/2, x/2), sf = Q(df/2, x/2) via the regularized incomplete gamma.
 */
import type { Rng } from '@/lib/rng'
import { gammaP, gammaQ, invertMonotone, lgamma } from '../special'
import * as normal from './normal'

function check(df: number) {
  if (!(df > 0)) throw new RangeError(`chi2: df must be positive, got ${df}`)
}

/** Density. At x = 0: +∞ for df < 2, 0.5 for df = 2, 0 for df > 2. */
export function pdf(x: number, df: number): number {
  check(df)
  if (Number.isNaN(x)) return NaN
  if (x < 0 || x === Infinity) return 0
  const k = df / 2
  if (x === 0) return df < 2 ? Infinity : df === 2 ? 0.5 : 0
  return Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.LN2 - lgamma(k))
}

/** P(X ≤ x). */
export function cdf(x: number, df: number): number {
  check(df)
  if (Number.isNaN(x)) return NaN
  if (x <= 0) return 0
  return gammaP(df / 2, x / 2)
}

/** P(X > x) — the χ² test P-value. */
export function sf(x: number, df: number): number {
  check(df)
  if (Number.isNaN(x)) return NaN
  if (x <= 0) return 1
  return gammaQ(df / 2, x / 2)
}

/** P(lo ≤ X ≤ hi). */
export function between(lo: number, hi: number, df: number): number {
  if (hi < lo) return 0
  return cdf(hi, df) - cdf(lo, df)
}

/** Inverse cdf. */
export function quantile(p: number, df: number): number {
  check(df)
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN
  if (p === 0) return 0
  if (p === 1) return Infinity
  // Wilson–Hilferty starting guess.
  const z = normal.standardQuantile(p)
  const wh = df * Math.pow(1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df)), 3)
  const guess = wh > 0 && Number.isFinite(wh) ? wh : df
  if (p <= 0.5) return invertMonotone((x) => cdf(x, df), p, 0, Infinity, { derivative: (x) => pdf(x, df), guess })
  // Upper tail: solve on sf for precision when p is close to 1.
  return invertMonotone((x) => -sf(x, df), -(1 - p), 0, Infinity, { derivative: (x) => pdf(x, df), guess })
}

/** Inverse survival: x with P(X > x) = p (the χ² critical value for a right-tailed test at level p). */
export function isf(p: number, df: number): number {
  check(df)
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN
  if (p === 0) return Infinity
  if (p === 1) return 0
  const z = normal.standardQuantile(1 - p)
  const wh = df * Math.pow(1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df)), 3)
  const guess = wh > 0 && Number.isFinite(wh) ? wh : df
  return invertMonotone((x) => -sf(x, df), -p, 0, Infinity, { derivative: (x) => pdf(x, df), guess })
}

export function mean(df: number): number {
  check(df)
  return df
}
export function variance(df: number): number {
  check(df)
  return 2 * df
}
export function sd(df: number): number {
  return Math.sqrt(variance(df))
}

/** n iid draws (sum of df squared standard normals for integer df; inverse-cdf otherwise). */
export function sample(rng: Rng, n: number, df: number): number[] {
  check(df)
  const out = new Array<number>(n)
  if (Number.isInteger(df) && df <= 50) {
    for (let i = 0; i < n; i++) {
      let s = 0
      for (let j = 0; j < df; j++) {
        const z = rng.normal()
        s += z * z
      }
      out[i] = s
    }
  } else {
    for (let i = 0; i < n; i++) out[i] = quantile(rng.float(), df)
  }
  return out
}
