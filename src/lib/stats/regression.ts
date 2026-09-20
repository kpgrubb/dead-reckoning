/**
 * Least-squares regression (AP Units 2 and 9).
 *   const fit = linearRegression(xs, ys)
 *   fit.slope, fit.intercept, fit.r, fit.r2, fit.s (residual SE), fit.seSlope, fit.residuals, fit.predict(x)
 *   regressionFromSummary({ r: 0.83, sx: 12.5, sy: 4.2, xMean: 100, yMean: 30 })  → { slope, intercept }
 *   transformedRegression(xs, ys, 'logy')  → fit on (x, log10 y) with predict() back-transformed
 *
 * Conventions: r via Sxy/√(Sxx·Syy); s = √(SSE/(n − 2)); SE(b) = s/√Sxx; leverage hᵢ = 1/n + (xᵢ − x̄)²/Sxx
 * (flag > 4/n, i.e. 2·p/n with p = 2 parameters); Cook's D flag > 4/n; standardized residual flag |r| > 2.
 * Logs are base 10 (the AP/TI convention) unless `base: 'e'` is passed.
 */
import { mean, sd } from './descriptive'

export interface RegressionFit {
  n: number
  slope: number
  intercept: number
  r: number
  r2: number
  xMean: number
  yMean: number
  sx: number
  sy: number
  sxx: number
  syy: number
  sxy: number
  /** Σ(y − ŷ)². */
  sse: number
  /** Σ(y − ȳ)². */
  sst: number
  /** Standard error of the residuals s = √(SSE/(n − 2)). NaN when n ≤ 2. */
  s: number
  /** Standard error of the slope, s/√Sxx. */
  seSlope: number
  /** Standard error of the intercept. */
  seIntercept: number
  fitted: number[]
  residuals: number[]
  /** hᵢ = 1/n + (xᵢ − x̄)²/Sxx. */
  leverage: number[]
  /** Internally studentized residuals eᵢ/(s√(1 − hᵢ)). */
  standardizedResiduals: number[]
  /** Cook's distance. */
  cooks: number[]
  /** Indices flagged: high leverage (hᵢ > 4/n), influential (Cook's D > 4/n), residual outlier (|rᵢ| > 2). */
  flags: { highLeverage: number[]; influential: number[]; outliers: number[] }
  predict: (x: number) => number
  /** "ŷ = a + b·x" with `digits` decimals — for prose only; never grade against it. */
  equation: (digits?: number) => string
}

function validatePairs(xs: readonly number[], ys: readonly number[], min = 2) {
  if (xs.length !== ys.length) throw new RangeError('regression: xs and ys differ in length')
  if (xs.length < min) throw new RangeError(`regression: need at least ${min} points`)
  for (let i = 0; i < xs.length; i++) if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) throw new RangeError('regression: non-finite value')
}

/** Pearson correlation r. */
export function correlation(xs: readonly number[], ys: readonly number[]): number {
  validatePairs(xs, ys)
  const xm = mean(xs)
  const ym = mean(ys)
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - xm
    const dy = ys[i] - ym
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  if (sxx === 0 || syy === 0) return NaN
  return sxy / Math.sqrt(sxx * syy)
}

export function linearRegression(xs: readonly number[], ys: readonly number[]): RegressionFit {
  validatePairs(xs, ys)
  const n = xs.length
  const xMean = mean(xs)
  const yMean = mean(ys)
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean
    const dy = ys[i] - yMean
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  if (sxx === 0) throw new RangeError('regression: all x values are identical (slope undefined)')
  const slope = sxy / sxx
  const intercept = yMean - slope * xMean
  const r = syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy)
  const fitted = xs.map((x) => intercept + slope * x)
  const residuals = ys.map((y, i) => y - fitted[i])
  let sse = 0
  for (const e of residuals) sse += e * e
  const s = n > 2 ? Math.sqrt(sse / (n - 2)) : NaN
  const seSlope = s / Math.sqrt(sxx)
  const seIntercept = s * Math.sqrt(1 / n + (xMean * xMean) / sxx)
  const leverage = xs.map((x) => 1 / n + ((x - xMean) * (x - xMean)) / sxx)
  const standardizedResiduals = residuals.map((e, i) => e / (s * Math.sqrt(1 - leverage[i])))
  const cooks = standardizedResiduals.map((ri, i) => ((ri * ri) / 2) * (leverage[i] / (1 - leverage[i])))
  const cut = 4 / n
  const flags = {
    highLeverage: leverage.map((h, i) => (h > cut ? i : -1)).filter((i) => i >= 0),
    influential: cooks.map((d, i) => (d > cut ? i : -1)).filter((i) => i >= 0),
    outliers: standardizedResiduals.map((ri, i) => (Math.abs(ri) > 2 ? i : -1)).filter((i) => i >= 0),
  }
  return {
    n,
    slope,
    intercept,
    r,
    r2: syy === 0 ? NaN : 1 - sse / syy,
    xMean,
    yMean,
    sx: n > 1 ? sd(xs) : NaN,
    sy: n > 1 ? sd(ys) : NaN,
    sxx,
    syy,
    sxy,
    sse,
    sst: syy,
    s,
    seSlope,
    seIntercept,
    fitted,
    residuals,
    leverage,
    standardizedResiduals,
    cooks,
    flags,
    predict: (x: number) => intercept + slope * x,
    equation: (digits = 3) => `ŷ = ${intercept.toFixed(digits)} ${slope < 0 ? '−' : '+'} ${Math.abs(slope).toFixed(digits)}·x`,
  }
}

/** Residuals y − ŷ for an arbitrary line (e.g. the learner's guess in the "minimize the squares" instrument). */
export function residualsForLine(xs: readonly number[], ys: readonly number[], slope: number, intercept: number): number[] {
  validatePairs(xs, ys, 1)
  return ys.map((y, i) => y - (intercept + slope * xs[i]))
}

/** Sum of squared residuals for an arbitrary line. */
export function sseForLine(xs: readonly number[], ys: readonly number[], slope: number, intercept: number): number {
  let s = 0
  for (const e of residualsForLine(xs, ys, slope, intercept)) s += e * e
  return s
}

export interface RegressionSummaryInput {
  r: number
  sx: number
  sy: number
  xMean: number
  yMean: number
}

/** Slope b = r·sy/sx and intercept a = ȳ − b·x̄ from summary statistics. */
export function regressionFromSummary({ r, sx, sy, xMean, yMean }: RegressionSummaryInput): { slope: number; intercept: number; r2: number; predict: (x: number) => number } {
  if (!(sx > 0)) throw new RangeError('regressionFromSummary: sx must be positive')
  const slope = (r * sy) / sx
  const intercept = yMean - slope * xMean
  return { slope, intercept, r2: r * r, predict: (x) => intercept + slope * x }
}

/** b = r·sy/sx. */
export function slopeFromR(r: number, sx: number, sy: number): number {
  return (r * sy) / sx
}

/** r = b·sx/sy. */
export function rFromSlope(slope: number, sx: number, sy: number): number {
  return (slope * sx) / sy
}

export type Transform = 'none' | 'logx' | 'logy' | 'loglog'

export interface TransformedFit {
  transform: Transform
  base: 10 | 'e'
  /** The linear fit on the transformed variables. */
  fit: RegressionFit
  /** Transformed predictors / responses actually regressed. */
  tx: number[]
  ty: number[]
  /** Predict y on the ORIGINAL scale from x on the original scale. */
  predict: (x: number) => number
  /** Residuals on the transformed scale (what the residual plot should show). */
  residuals: number[]
  /** Model in original variables, e.g. "ŷ = 10^(a + b·x)" or "ŷ = a + b·log(x)". */
  model: string
  r2: number
}

function logOf(base: 10 | 'e'): (v: number) => number {
  return base === 10 ? Math.log10 : Math.log
}
function powOf(base: 10 | 'e'): (v: number) => number {
  return base === 10 ? (v) => Math.pow(10, v) : Math.exp
}

/**
 * Fit after transforming x, y or both with logarithms. Values on a log-transformed axis must be
 * positive (throws otherwise). `predict` back-transforms; `residuals` are on the transformed scale.
 */
export function transformedRegression(xs: readonly number[], ys: readonly number[], transform: Transform, opts: { base?: 10 | 'e' } = {}): TransformedFit {
  const base = opts.base ?? 10
  const lg = logOf(base)
  const pw = powOf(base)
  const useX = transform === 'logx' || transform === 'loglog'
  const useY = transform === 'logy' || transform === 'loglog'
  if (useX && xs.some((x) => !(x > 0))) throw new RangeError('transformedRegression: log(x) needs x > 0')
  if (useY && ys.some((y) => !(y > 0))) throw new RangeError('transformedRegression: log(y) needs y > 0')
  const tx = useX ? xs.map(lg) : xs.slice()
  const ty = useY ? ys.map(lg) : ys.slice()
  const fit = linearRegression(tx, ty)
  const b = base === 10 ? '10' : 'e'
  const L = base === 10 ? 'log' : 'ln'
  const predict = (x: number) => {
    const xt = useX ? lg(x) : x
    const yt = fit.intercept + fit.slope * xt
    return useY ? pw(yt) : yt
  }
  const model =
    transform === 'none'
      ? 'ŷ = a + b·x'
      : transform === 'logx'
        ? `ŷ = a + b·${L}(x)`
        : transform === 'logy'
          ? `ŷ = ${b}^(a + b·x)   (exponential model)`
          : `ŷ = ${b}^a · x^b   (power model)`
  return { transform, base, fit, tx, ty, predict, residuals: fit.residuals, model, r2: fit.r2 }
}

/** Compare transformations by r² on the transformed scale (the AP "which model is more appropriate" move). */
export function compareTransforms(xs: readonly number[], ys: readonly number[], transforms: Transform[] = ['none', 'logx', 'logy', 'loglog']): { transform: Transform; r2: number; s: number }[] {
  const out: { transform: Transform; r2: number; s: number }[] = []
  for (const t of transforms) {
    try {
      const f = transformedRegression(xs, ys, t)
      out.push({ transform: t, r2: f.r2, s: f.fit.s })
    } catch {
      // skip transforms that need positive values
    }
  }
  return out
}
