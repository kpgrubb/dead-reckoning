/**
 * Exponential(rate λ) — mean 1/λ. (SciPy's `expon(scale=1/rate)`.)
 *   exponential.cdf(2, 0.5)   → 1 − e^{−1}
 *   exponential.mean(0.5)     → 2
 */
import type { Rng } from '@/lib/rng'

function check(rate: number) {
  if (!(rate > 0)) throw new RangeError(`exponential: rate must be positive, got ${rate}`)
}

export function pdf(x: number, rate = 1): number {
  check(rate)
  return x < 0 ? 0 : rate * Math.exp(-rate * x)
}

export function cdf(x: number, rate = 1): number {
  check(rate)
  if (Number.isNaN(x)) return NaN
  return x <= 0 ? 0 : -Math.expm1(-rate * x)
}

export function sf(x: number, rate = 1): number {
  check(rate)
  if (Number.isNaN(x)) return NaN
  return x <= 0 ? 1 : Math.exp(-rate * x)
}

export function between(lo: number, hi: number, rate = 1): number {
  if (hi < lo) return 0
  return sf(lo, rate) - sf(hi, rate)
}

export function quantile(p: number, rate = 1): number {
  check(rate)
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN
  if (p === 1) return Infinity
  return -Math.log1p(-p) / rate
}

export function mean(rate = 1): number {
  check(rate)
  return 1 / rate
}
export function variance(rate = 1): number {
  check(rate)
  return 1 / (rate * rate)
}
export function sd(rate = 1): number {
  return Math.sqrt(variance(rate))
}

export function sample(rng: Rng, n: number, rate = 1): number[] {
  check(rate)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = rng.exponential(rate)
  return out
}
