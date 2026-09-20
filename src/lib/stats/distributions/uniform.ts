/**
 * Continuous Uniform(a, b).
 *   uniform.cdf(0.25, 0, 1) → 0.25
 *   uniform.mean(2, 8)      → 5
 */
import type { Rng } from '@/lib/rng'

function check(a: number, b: number) {
  if (!(b > a)) throw new RangeError(`uniform: need a < b, got a=${a}, b=${b}`)
}

export function pdf(x: number, a = 0, b = 1): number {
  check(a, b)
  return x >= a && x <= b ? 1 / (b - a) : 0
}

export function cdf(x: number, a = 0, b = 1): number {
  check(a, b)
  if (Number.isNaN(x)) return NaN
  if (x <= a) return 0
  if (x >= b) return 1
  return (x - a) / (b - a)
}

export function sf(x: number, a = 0, b = 1): number {
  return 1 - cdf(x, a, b)
}

export function between(lo: number, hi: number, a = 0, b = 1): number {
  if (hi < lo) return 0
  return cdf(hi, a, b) - cdf(lo, a, b)
}

export function quantile(p: number, a = 0, b = 1): number {
  check(a, b)
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN
  return a + p * (b - a)
}

export function mean(a = 0, b = 1): number {
  check(a, b)
  return (a + b) / 2
}
export function variance(a = 0, b = 1): number {
  check(a, b)
  return ((b - a) * (b - a)) / 12
}
export function sd(a = 0, b = 1): number {
  return Math.sqrt(variance(a, b))
}

export function sample(rng: Rng, n: number, a = 0, b = 1): number[] {
  check(a, b)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = rng.uniform(a, b)
  return out
}
