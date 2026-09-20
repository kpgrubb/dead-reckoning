/**
 * F distribution with (d1, d2) degrees of freedom (regression ANOVA; optional for AP).
 *   f.sf(4.2, 1, 18)     → P-value for an ANOVA F = 4.2 on (1, 18) df
 */
import type { Rng } from '@/lib/rng'
import { betaInc, betaIncC, invertMonotone, lbeta } from '../special'

function check(d1: number, d2: number) {
  if (!(d1 > 0) || !(d2 > 0)) throw new RangeError(`f: degrees of freedom must be positive, got (${d1}, ${d2})`)
}

export function pdf(x: number, d1: number, d2: number): number {
  check(d1, d2)
  if (Number.isNaN(x)) return NaN
  if (x < 0 || x === Infinity) return 0
  if (x === 0) return d1 < 2 ? Infinity : d1 === 2 ? 1 : 0
  const logf = (d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x) - ((d1 + d2) / 2) * Math.log1p((d1 * x) / d2) - lbeta(d1 / 2, d2 / 2)
  return Math.exp(logf)
}

/** I_z(d1/2, d2/2) arguments with z = d1x/(d1x + d2), logs formed without rounding z first. */
function args(x: number, d1: number, d2: number): [number, number, number, number] {
  const u = d1 * x
  const s = u + d2
  return [u / s, d2 / s, Math.log(u) - Math.log(s), Math.log(d2) - Math.log(s)]
}

export function cdf(x: number, d1: number, d2: number): number {
  check(d1, d2)
  if (Number.isNaN(x)) return NaN
  if (x <= 0) return 0
  if (x === Infinity) return 1
  const [z, zc, lz, lzc] = args(x, d1, d2)
  return betaInc(z, d1 / 2, d2 / 2, zc, lz, lzc)
}

export function sf(x: number, d1: number, d2: number): number {
  check(d1, d2)
  if (Number.isNaN(x)) return NaN
  if (x <= 0) return 1
  if (x === Infinity) return 0
  const [z, zc, lz, lzc] = args(x, d1, d2)
  return betaIncC(z, d1 / 2, d2 / 2, zc, lz, lzc)
}

export function quantile(p: number, d1: number, d2: number): number {
  check(d1, d2)
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN
  if (p === 0) return 0
  if (p === 1) return Infinity
  const guess = d2 > 2 ? d2 / (d2 - 2) : 1
  if (p <= 0.5) return invertMonotone((x) => cdf(x, d1, d2), p, 0, Infinity, { derivative: (x) => pdf(x, d1, d2), guess })
  return invertMonotone((x) => -sf(x, d1, d2), -(1 - p), 0, Infinity, { derivative: (x) => pdf(x, d1, d2), guess })
}

export function mean(_d1: number, d2: number): number {
  void _d1
  return d2 > 2 ? d2 / (d2 - 2) : NaN
}
export function variance(d1: number, d2: number): number {
  if (d2 <= 4) return NaN
  return (2 * d2 * d2 * (d1 + d2 - 2)) / (d1 * (d2 - 2) * (d2 - 2) * (d2 - 4))
}
export function sd(d1: number, d2: number): number {
  return Math.sqrt(variance(d1, d2))
}

export function sample(rng: Rng, n: number, d1: number, d2: number): number[] {
  check(d1, d2)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = quantile(rng.float(), d1, d2)
  return out
}
