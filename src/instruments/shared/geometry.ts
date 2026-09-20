/**
 * Pure chart geometry helpers — no DOM, no React, fully unit-tested.
 *
 * NOTE: the numeric source of truth for the COURSE is `@/lib/stats`. These helpers exist to lay out
 * marks (bins, dot stacks, box geometry) and to keep the shared primitives self-contained while the
 * stats library is being written in parallel. Instruments that already have numbers from `@/lib/stats`
 * should pass them in (e.g. `Boxplot` accepts precomputed `stats`) rather than recomputing here.
 */
import { ticks as d3Ticks, tickStep, bin as d3Bin, extent } from 'd3'

export interface Bin {
  x0: number
  x1: number
  count: number
}

export interface BinOptions {
  /** Fixed bin width; bins are aligned to multiples of it. */
  binWidth?: number
  /** Approximate number of bins when binWidth is omitted (default: Sturges, clamped 5–40). */
  bins?: number
  /** Force the covered domain (values outside are clamped into the end bins). */
  domain?: [number, number]
}

/** "Nice" tick values over [lo, hi]. Always returns at least one value. */
export function niceTicks(lo: number, hi: number, count = 6): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return []
  if (lo === hi) return [lo]
  if (lo > hi) [lo, hi] = [hi, lo]
  const t = d3Ticks(lo, hi, Math.max(1, count))
  return t.length ? t : [lo, hi]
}

/** Sturges' rule, clamped to a sane range for a display. */
export function sturges(n: number): number {
  if (n <= 0) return 1
  return Math.min(40, Math.max(5, Math.ceil(Math.log2(n) + 1)))
}

/**
 * Fixed-width histogram bins. The FIRST edge is a multiple of the bin width at or below the minimum,
 * the LAST edge is strictly above the maximum, so every value lands in exactly one bin and edges are
 * clean numbers. Empty bins are kept (they carry meaning in a histogram).
 */
export function computeBins(values: readonly number[], opts: BinOptions = {}): Bin[] {
  const finite = values.filter((v) => Number.isFinite(v))
  if (finite.length === 0) return []
  const [minV, maxV] = opts.domain ?? (extent(finite) as [number, number])
  let bw = opts.binWidth
  if (!bw || bw <= 0) {
    const n = opts.bins ?? sturges(finite.length)
    bw = tickStep(minV, maxV, n)
    if (!bw || !Number.isFinite(bw) || bw <= 0) bw = 1
  }
  const start = Math.floor(minV / bw + 1e-9) * bw
  let nb = Math.max(1, Math.floor((maxV - start) / bw + 1e-9) + 1)
  // Guard against astronomically many bins from a bad binWidth.
  if (nb > 500) {
    bw = (maxV - start) / 500
    nb = 500
  }
  const counts = new Array<number>(nb).fill(0)
  for (const v of finite) {
    let i = Math.floor((v - start) / bw + 1e-9)
    if (i < 0) i = 0
    if (i >= nb) i = nb - 1
    counts[i]++
  }
  const decimals = Math.max(0, Math.min(10, -Math.floor(Math.log10(bw)) + 3))
  const round = (x: number) => Number(x.toFixed(decimals))
  return counts.map((count, i) => ({ x0: round(start + i * bw), x1: round(start + (i + 1) * bw), count }))
}

/** D3's bin with explicit thresholds — used when the caller supplies its own edges. */
export function binWithEdges(values: readonly number[], edges: readonly number[]): Bin[] {
  const b = d3Bin<number, number>().domain([edges[0], edges[edges.length - 1]]).thresholds(edges.slice(1, -1))
  return b([...values]).map((g) => ({ x0: g.x0 ?? 0, x1: g.x1 ?? 0, count: g.length }))
}

export interface BoxStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  iqr: number
  lowFence: number
  highFence: number
  /** Whisker ends: most extreme non-outlier values. */
  whiskerLo: number
  whiskerHi: number
  outliers: number[]
  n: number
}

function medianOf(sortedAsc: readonly number[]): number {
  const n = sortedAsc.length
  const mid = n >> 1
  return n % 2 === 1 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2
}

/**
 * Box-and-whisker geometry using the AP / TI-84 quartile convention (median of the halves,
 * excluding the overall median when n is odd) and the 1.5×IQR fence rule. Whiskers stop at the
 * most extreme values inside the fences.
 */
export function boxplotStats(values: readonly number[]): BoxStats | null {
  const s = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  const n = s.length
  if (n === 0) return null
  if (n === 1) {
    const v = s[0]
    return { min: v, q1: v, median: v, q3: v, max: v, iqr: 0, lowFence: v, highFence: v, whiskerLo: v, whiskerHi: v, outliers: [], n }
  }
  const mid = n >> 1
  const lower = s.slice(0, mid)
  const upper = n % 2 === 1 ? s.slice(mid + 1) : s.slice(mid)
  const q1 = medianOf(lower)
  const q3 = medianOf(upper)
  const median = medianOf(s)
  const iqr = q3 - q1
  const lowFence = q1 - 1.5 * iqr
  const highFence = q3 + 1.5 * iqr
  const inside = s.filter((v) => v >= lowFence && v <= highFence)
  const outliers = s.filter((v) => v < lowFence || v > highFence)
  return {
    min: s[0],
    q1,
    median,
    q3,
    max: s[n - 1],
    iqr,
    lowFence,
    highFence,
    whiskerLo: inside.length ? inside[0] : q1,
    whiskerHi: inside.length ? inside[inside.length - 1] : q3,
    outliers,
    n,
  }
}

/** Fill a partial five-number summary into full BoxStats (whiskers = min/max, no outliers) for precomputed input. */
export function boxStatsFrom(partial: { min: number; q1: number; median: number; q3: number; max: number; outliers?: number[]; whiskerLo?: number; whiskerHi?: number; n?: number }): BoxStats {
  const iqr = partial.q3 - partial.q1
  const lowFence = partial.q1 - 1.5 * iqr
  const highFence = partial.q3 + 1.5 * iqr
  const outliers = partial.outliers ?? []
  // Without the raw data we cannot know the most extreme non-outlier; fall back to the box edge.
  const whiskerLo = partial.whiskerLo ?? (partial.min >= lowFence ? partial.min : partial.q1)
  const whiskerHi = partial.whiskerHi ?? (partial.max <= highFence ? partial.max : partial.q3)
  return {
    min: partial.min,
    q1: partial.q1,
    median: partial.median,
    q3: partial.q3,
    max: partial.max,
    iqr,
    lowFence,
    highFence,
    whiskerLo,
    whiskerHi,
    outliers,
    n: partial.n ?? 0,
  }
}

export interface DotStack {
  /** Original value. */
  value: number
  /** Index into the input array. */
  index: number
  /** Pixel x (bucket centre). */
  x: number
  /** 0-based height in the stack. */
  level: number
}

/**
 * Stack dots into columns. Values are bucketed by pixel position so equal values (and values that
 * would overlap at this scale) stack vertically. Returns positions plus the tallest stack.
 */
export function stackDots(values: readonly number[], x: (v: number) => number, diameter: number): { dots: DotStack[]; maxLevel: number } {
  const counts = new Map<number, number>()
  const dots: DotStack[] = []
  let maxLevel = 0
  const step = Math.max(1, diameter)
  const order = values.map((v, i) => ({ v, i })).filter((d) => Number.isFinite(d.v)).sort((a, b) => a.v - b.v)
  for (const { v, i } of order) {
    const px = x(v)
    const key = Math.round(px / step)
    const level = counts.get(key) ?? 0
    counts.set(key, level + 1)
    if (level > maxLevel) maxLevel = level
    dots.push({ value: v, index: i, x: key * step, level })
  }
  return { dots, maxLevel }
}

export interface LeastSquares {
  slope: number
  intercept: number
  r: number
  r2: number
  n: number
  xMean: number
  yMean: number
}

/**
 * Ordinary least squares y = a + b·x. Local helper for DISPLAY only (the fit line on a scatter);
 * course answers must come from `@/lib/stats` regression once it lands.
 */
export function leastSquares(points: readonly { x: number; y: number }[]): LeastSquares | null {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const n = pts.length
  if (n < 2) return null
  let sx = 0
  let sy = 0
  for (const p of pts) {
    sx += p.x
    sy += p.y
  }
  const xMean = sx / n
  const yMean = sy / n
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const p of pts) {
    const dx = p.x - xMean
    const dy = p.y - yMean
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = yMean - slope * xMean
  const r = syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy)
  return { slope, intercept, r, r2: r * r, n, xMean, yMean }
}

/** Sample a function over [lo, hi] at n evenly spaced points (inclusive). */
export function sampleCurve(f: (x: number) => number, domain: [number, number], n = 200): { x: number; y: number }[] {
  const [lo, hi] = domain
  const out: { x: number; y: number }[] = []
  const steps = Math.max(1, n - 1)
  for (let i = 0; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps
    const y = f(x)
    out.push({ x, y: Number.isFinite(y) ? y : 0 })
  }
  return out
}

export interface BarLayout {
  /** Slot width per category. */
  band: number
  /** Bar thickness (capped). */
  thickness: number
  /** Offset from slot start to bar start (centres the bar). */
  offset: number
}

/** Lay out n bars across innerSize with a capped thickness and a surface gap. */
export function barLayout(n: number, innerSize: number, opts: { maxThickness?: number; gap?: number; padding?: number } = {}): BarLayout {
  const { maxThickness = 28, gap = 2, padding = 0.3 } = opts
  if (n <= 0 || innerSize <= 0) return { band: 0, thickness: 0, offset: 0 }
  const band = innerSize / n
  const available = Math.max(1, band - Math.max(gap, band * padding))
  const thickness = Math.min(maxThickness, available)
  return { band, thickness, offset: (band - thickness) / 2 }
}

/** Pad a numeric domain by a fraction on each side (never collapses to zero width). */
export function padDomain([lo, hi]: [number, number], frac = 0.05): [number, number] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1]
  if (lo === hi) {
    const pad = Math.abs(lo) * frac || 1
    return [lo - pad, hi + pad]
  }
  const pad = (hi - lo) * frac
  return [lo - pad, hi + pad]
}

/** Format an axis tick value compactly (no trailing float noise). */
export function fmtTick(v: number): string {
  if (!Number.isFinite(v)) return ''
  if (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-4 && v !== 0)) return v.toExponential(1)
  const s = Number(v.toPrecision(10)).toString()
  return s.replace(/^-/, '−')
}
