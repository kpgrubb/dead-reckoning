/**
 * Descriptive statistics (AP Unit 1). Baseline implementations — the Simulation & Stats Engine
 * agent owns this module and must validate/extend it against tests/fixtures/*.json.
 *
 * Rounding convention (project-wide): functions return full precision. Round only for display,
 * using `fmt` helpers in src/lib/stats/format.ts.
 */

export function sum(xs: readonly number[]): number {
  let s = 0
  for (const x of xs) s += x
  return s
}

export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new RangeError('mean: empty sample')
  return sum(xs) / xs.length
}

export function sorted(xs: readonly number[]): number[] {
  return xs.slice().sort((a, b) => a - b)
}

export function median(xs: readonly number[]): number {
  if (xs.length === 0) throw new RangeError('median: empty sample')
  const s = sorted(xs)
  const mid = s.length >> 1
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Sample variance (divisor n − 1), the AP default. */
export function variance(xs: readonly number[]): number {
  if (xs.length < 2) throw new RangeError('variance: need at least 2 observations')
  const m = mean(xs)
  let ss = 0
  for (const x of xs) ss += (x - m) * (x - m)
  return ss / (xs.length - 1)
}

/** Sample standard deviation (divisor n − 1). */
export function sd(xs: readonly number[]): number {
  return Math.sqrt(variance(xs))
}

/** Population variance (divisor N) — used for random-variable and population contexts. */
export function popVariance(xs: readonly number[]): number {
  if (xs.length === 0) throw new RangeError('popVariance: empty')
  const m = mean(xs)
  let ss = 0
  for (const x of xs) ss += (x - m) * (x - m)
  return ss / xs.length
}

export function popSd(xs: readonly number[]): number {
  return Math.sqrt(popVariance(xs))
}

export function min(xs: readonly number[]): number {
  if (xs.length === 0) throw new RangeError('min: empty')
  let m = xs[0]
  for (const x of xs) if (x < m) m = x
  return m
}

export function max(xs: readonly number[]): number {
  if (xs.length === 0) throw new RangeError('max: empty')
  let m = xs[0]
  for (const x of xs) if (x > m) m = x
  return m
}

export function range(xs: readonly number[]): number {
  return max(xs) - min(xs)
}

/**
 * Quartiles using the AP / TI-84 convention: Q1 is the median of the lower half, Q3 the median
 * of the upper half, excluding the overall median when n is odd.
 */
export function quartiles(xs: readonly number[]): { q1: number; q2: number; q3: number } {
  if (xs.length < 2) throw new RangeError('quartiles: need at least 2 observations')
  const s = sorted(xs)
  const n = s.length
  const mid = n >> 1
  const lower = s.slice(0, mid)
  const upper = n % 2 === 1 ? s.slice(mid + 1) : s.slice(mid)
  return { q1: median(lower), q2: median(s), q3: median(upper) }
}

export function iqr(xs: readonly number[]): number {
  const { q1, q3 } = quartiles(xs)
  return q3 - q1
}

export interface FiveNumber {
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

export function fiveNumber(xs: readonly number[]): FiveNumber {
  const { q1, q2, q3 } = quartiles(xs)
  return { min: min(xs), q1, median: q2, q3, max: max(xs) }
}

/** 1.5×IQR rule. Returns the fences and the outliers. */
export function outliers(xs: readonly number[]): { lowFence: number; highFence: number; values: number[] } {
  const { q1, q3 } = quartiles(xs)
  const k = 1.5 * (q3 - q1)
  const lowFence = q1 - k
  const highFence = q3 + k
  return { lowFence, highFence, values: xs.filter((x) => x < lowFence || x > highFence) }
}

/** Standardized score of x against a mean and sd. */
export function zScore(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) throw new RangeError('zScore: sigma must be positive')
  return (x - mu) / sigma
}

/** Percentile rank: proportion of observations strictly below x (AP convention: "at or below" variants exist; state which you use). */
export function percentileRank(xs: readonly number[], x: number, inclusive = false): number {
  let c = 0
  for (const v of xs) if (inclusive ? v <= x : v < x) c++
  return c / xs.length
}
