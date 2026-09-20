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

/**
 * Percentile rank: proportion of observations strictly below x (default) or at-or-below x
 * (`inclusive = true`). The AP CED uses "percentage of values less than or equal to" in some items
 * and "less than" in others; module text must state which it means.
 */
export function percentileRank(xs: readonly number[], x: number, inclusive = false): number {
  let c = 0
  for (const v of xs) if (inclusive ? v <= x : v < x) c++
  return c / xs.length
}

// ─── Extensions (Engine) ────────────────────────────────────────────────────────────────────────

export type PercentileMethod = 'linear' | 'nearest-rank'

/**
 * The p-th percentile (0 ≤ p ≤ 100).
 *  'linear' (default): Hyndman–Fan type 7 — the NumPy/Excel PERCENTILE.INC convention: rank
 *      h = (n − 1)·p/100, interpolate linearly between the floor and ceiling order statistics.
 *  'nearest-rank': the smallest value such that at least p% of the data are ≤ it (the AP
 *      "reading a cumulative graph" convention); rank = ceil(n·p/100), minimum 1.
 */
export function percentile(xs: readonly number[], p: number, method: PercentileMethod = 'linear'): number {
  if (xs.length === 0) throw new RangeError('percentile: empty sample')
  if (!(p >= 0 && p <= 100)) throw new RangeError(`percentile: p must be in [0, 100], got ${p}`)
  const s = sorted(xs)
  const n = s.length
  if (method === 'nearest-rank') {
    const r = Math.max(1, Math.ceil((n * p) / 100))
    return s[Math.min(n, r) - 1]
  }
  const h = ((n - 1) * p) / 100
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  if (lo === hi) return s[lo]
  return s[lo] + (h - lo) * (s[hi] - s[lo])
}

/** Sample skewness, adjusted Fisher–Pearson G1 (SciPy `skew(bias=False)`): √(n(n−1))/(n−2) · m3/m2^{3/2}. */
export function skewness(xs: readonly number[]): number {
  const n = xs.length
  if (n < 3) throw new RangeError('skewness: need at least 3 observations')
  const m = mean(xs)
  let m2 = 0
  let m3 = 0
  for (const x of xs) {
    const d = x - m
    m2 += d * d
    m3 += d * d * d
  }
  m2 /= n
  m3 /= n
  if (m2 === 0) return NaN
  const g1 = m3 / Math.pow(m2, 1.5)
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1
}

/**
 * Mode(s): every value tied for the highest count, ascending. Returns [] when every value occurs
 * once (no mode). Values are compared with ===, so round data first if that is the intent.
 */
export function modes(xs: readonly number[]): number[] {
  if (xs.length === 0) return []
  const counts = new Map<number, number>()
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1)
  let best = 0
  for (const c of counts.values()) if (c > best) best = c
  if (best <= 1) return []
  return [...counts.entries()].filter(([, c]) => c === best).map(([v]) => v).sort((a, b) => a - b)
}

/** Weighted mean Σwx / Σw. */
export function weightedMean(xs: readonly number[], ws: readonly number[]): number {
  if (xs.length !== ws.length) throw new RangeError('weightedMean: xs and ws differ in length')
  if (xs.length === 0) throw new RangeError('weightedMean: empty')
  let num = 0
  let den = 0
  for (let i = 0; i < xs.length; i++) {
    if (!(ws[i] >= 0)) throw new RangeError('weightedMean: weights must be non-negative')
    num += xs[i] * ws[i]
    den += ws[i]
  }
  if (den === 0) throw new RangeError('weightedMean: weights sum to zero')
  return num / den
}

/** Mean absolute deviation about the mean. */
export function meanAbsoluteDeviation(xs: readonly number[]): number {
  const m = mean(xs)
  let s = 0
  for (const x of xs) s += Math.abs(x - m)
  return s / xs.length
}

/** Standardize every value: z = (x − x̄)/s (sample sd). */
export function standardize(xs: readonly number[]): number[] {
  const m = mean(xs)
  const s = sd(xs)
  if (s === 0) throw new RangeError('standardize: sd is zero')
  return xs.map((x) => (x - m) / s)
}

export interface FrequencyRow<T = number> {
  value: T
  count: number
  relFreq: number
  cumCount: number
  cumRelFreq: number
}

/** Frequency table of distinct numeric values, ascending, with relative and cumulative columns. */
export function frequencyTable(xs: readonly number[]): FrequencyRow[] {
  const counts = new Map<number, number>()
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1)
  const n = xs.length
  let cum = 0
  return [...counts.keys()]
    .sort((a, b) => a - b)
    .map((value) => {
      const count = counts.get(value)!
      cum += count
      return { value, count, relFreq: count / n, cumCount: cum, cumRelFreq: cum / n }
    })
}

/** Frequency table of categorical labels in first-seen order (or the order given by `order`). */
export function countBy<T extends string | number>(xs: readonly T[], order?: readonly T[]): FrequencyRow<T>[] {
  const counts = new Map<T, number>()
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1)
  const keys = order ? order.slice() : [...counts.keys()]
  const n = xs.length
  let cum = 0
  return keys.map((value) => {
    const count = counts.get(value) ?? 0
    cum += count
    return { value, count, relFreq: n ? count / n : 0, cumCount: cum, cumRelFreq: n ? cum / n : 0 }
  })
}

/** Points of a cumulative relative frequency graph (ogive): proportion of data ≤ each distinct value. */
export function cumulativeRelativeFrequency(xs: readonly number[]): { value: number; cumRelFreq: number }[] {
  return frequencyTable(xs).map(({ value, cumRelFreq }) => ({ value, cumRelFreq }))
}

export type BinMethod = { method: 'sturges' } | { method: 'width'; width: number; start?: number } | { method: 'count'; count: number }

export interface Bin {
  lo: number
  hi: number
  count: number
  relFreq: number
  /** Midpoint (for frequency polygons). */
  mid: number
}

export interface Binning {
  bins: Bin[]
  edges: number[]
  width: number
}

/**
 * Histogram binning. Bins are [lo, hi) except the last, which is [lo, hi] so the maximum is counted
 * (NumPy's convention).
 *  sturges  k = ⌈log₂ n⌉ + 1 equal-width bins from min to max.
 *  count    k equal-width bins from min to max.
 *  width    fixed width from `start` (default: the largest multiple of width ≤ min).
 * A constant sample gets one bin of width 1 (or `width`) centered on the value.
 */
export function bins(xs: readonly number[], spec: BinMethod = { method: 'sturges' }): Binning {
  if (xs.length === 0) throw new RangeError('bins: empty sample')
  const lo = min(xs)
  const hi = max(xs)
  let edges: number[]
  if (spec.method === 'width') {
    if (!(spec.width > 0)) throw new RangeError('bins: width must be positive')
    const start = spec.start ?? Math.floor(lo / spec.width) * spec.width
    if (start > lo) throw new RangeError('bins: start must be ≤ min')
    edges = [start]
    while (edges[edges.length - 1] <= hi) edges.push(start + edges.length * spec.width)
    // Ensure the max lands strictly inside the last bin unless it is exactly on an edge (then [lo, hi] rule covers it).
    if (edges[edges.length - 1] === hi) edges.push(start + edges.length * spec.width)
    if (edges.length >= 2 && edges[edges.length - 2] > hi) edges.pop()
  } else {
    const k = spec.method === 'sturges' ? Math.ceil(Math.log2(xs.length)) + 1 : spec.count
    if (!(k >= 1) || !Number.isInteger(k)) throw new RangeError('bins: count must be a positive integer')
    if (hi === lo) {
      edges = [lo - 0.5, lo + 0.5]
    } else {
      const w = (hi - lo) / k
      edges = Array.from({ length: k + 1 }, (_, i) => (i === k ? hi : lo + i * w))
    }
  }
  const counts = new Array<number>(edges.length - 1).fill(0)
  const last = edges.length - 2
  for (const x of xs) {
    let i = last
    for (let j = 0; j < last; j++) {
      if (x < edges[j + 1]) {
        i = j
        break
      }
    }
    counts[i]++
  }
  const n = xs.length
  const out: Bin[] = counts.map((count, i) => ({ lo: edges[i], hi: edges[i + 1], count, relFreq: count / n, mid: (edges[i] + edges[i + 1]) / 2 }))
  return { bins: out, edges, width: edges[1] - edges[0] }
}

export interface TransformEffect {
  mean: number
  median: number
  sd: number
  variance: number
  iqr: number
  range: number
  min: number
  max: number
}

/**
 * Effect of the linear transformation y = a·x + b on summary statistics: center and position
 * measures become a·(value) + b; spread measures scale by |a| (variance by a²). Shape is unchanged.
 * Pass the summary of x; get the summary of y without recomputing from data.
 */
export function linearTransformSummary(s: Partial<TransformEffect>, a: number, b: number): Partial<TransformEffect> {
  const out: Partial<TransformEffect> = {}
  if (s.mean !== undefined) out.mean = a * s.mean + b
  if (s.median !== undefined) out.median = a * s.median + b
  if (s.sd !== undefined) out.sd = Math.abs(a) * s.sd
  if (s.variance !== undefined) out.variance = a * a * s.variance
  if (s.iqr !== undefined) out.iqr = Math.abs(a) * s.iqr
  if (s.range !== undefined) out.range = Math.abs(a) * s.range
  if (s.min !== undefined && s.max !== undefined) {
    const lo = a * s.min + b
    const hi = a * s.max + b
    out.min = Math.min(lo, hi)
    out.max = Math.max(lo, hi)
  }
  return out
}

/** Apply y = a·x + b to every value. */
export function linearTransform(xs: readonly number[], a: number, b: number): number[] {
  return xs.map((x) => a * x + b)
}

export interface Summary extends FiveNumber {
  n: number
  mean: number
  sd: number
  variance: number
  iqr: number
  range: number
}

/** One-call summary (n ≥ 2). */
export function describe(xs: readonly number[]): Summary {
  const fn = fiveNumber(xs)
  const v = variance(xs)
  return { n: xs.length, mean: mean(xs), sd: Math.sqrt(v), variance: v, iqr: fn.q3 - fn.q1, range: fn.max - fn.min, ...fn }
}

/** Sum of squared deviations from the mean, Σ(x − x̄)². */
export function sumSquaredDeviations(xs: readonly number[]): number {
  const m = mean(xs)
  let ss = 0
  for (const x of xs) ss += (x - m) * (x - m)
  return ss
}
