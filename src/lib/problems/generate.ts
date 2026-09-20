/**
 * Helpers for problem generators. Act Teams import from here (and from @/lib/stats) — never from
 * Math.random. See docs/problem-authoring.md.
 *
 *   defineGenerator({...})   validated, self-checking generator factory (use this, not a bare object)
 *   retry(rng, draw, accept) rejection sampling for degenerate draws
 *   drawDataset / drawScatter / drawTwoWay   in-world datasets with shape control and rejection
 *   pickContext / tableMd / listNumbers      framing and Markdown helpers
 *   numericAnswer(value, kind)               NumericAnswer with the project tolerance policy
 */
import { Rng, seedFrom } from '@/lib/rng'
import type { DisplaySpec, NumericAnswer, NumericKind, ProblemGenerator, ProblemInstance } from './types'
import { GeneratorValidationError, validateGeneratorDefinition, validateInstance } from './validate'
import { fmt } from '@/lib/stats/format'
import { mean, sd } from '@/lib/stats/descriptive'

export { fmt, fmtP, fmtPct, round } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Rejection sampling and seeds
// ---------------------------------------------------------------------------------------------

/**
 * Draw parameters until `accept` is satisfied (rejection of degenerate cases), with a hard cap so
 * a bad generator fails loudly instead of hanging.
 */
export function retry<T>(rng: Rng, draw: (rng: Rng) => T, accept: (t: T) => boolean, maxTries = 200): T {
  for (let i = 0; i < maxTries; i++) {
    const t = draw(rng)
    if (accept(t)) return t
  }
  throw new Error('retry: no acceptable parameter draw after ' + maxTries + ' tries — loosen the generator constraints')
}

/** Deterministic seed for one drill instance. */
export function drillSeed(learnerSeed: number, moduleId: string, generatorId: string, index: number, attempt: number): number {
  return seedFrom(learnerSeed, moduleId, generatorId, index, attempt)
}

/**
 * Instantiate a generator object with a seed. To instantiate by id use `instantiate` from
 * ./registry (this module must not import the registry: generators import this module at load
 * time, and a cycle would leave `defineGenerator` uninitialized).
 */
export function instantiateWith(g: ProblemGenerator, seed: number): ProblemInstance {
  return g.generate(new Rng(seed))
}

// ---------------------------------------------------------------------------------------------
// defineGenerator
// ---------------------------------------------------------------------------------------------

const DEV = (() => {
  try {
    return !!(import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } }).env?.DEV || (import.meta as unknown as { env?: { MODE?: string } }).env?.MODE === 'test'
  } catch {
    return false
  }
})()

/**
 * Create a validated generator. At registration it checks id format (act-N/slug), non-empty
 * ap_topics and label. Every `generate` call is self-checked: prompt/solution non-empty, 2–3 hints,
 * finite answer, the formatted numeric answer appears in the solution, choice indices in range and
 * options distinct, interpretation exemplar passes its own rubric, display specs well-formed.
 * In dev/test a failed self-check throws; in production it logs and returns the instance.
 */
export function defineGenerator(def: ProblemGenerator): ProblemGenerator {
  const problems = validateGeneratorDefinition(def)
  if (problems.length) throw new GeneratorValidationError(String(def.id), problems)
  const inner = def.generate
  const wrapped: ProblemGenerator = {
    ...def,
    generate(rng: Rng): ProblemInstance {
      const instance = inner.call(def, rng)
      const issues = validateInstance(instance)
      if (issues.length) {
        const err = new GeneratorValidationError(def.id, [`seed ${rng.seed}`, ...issues])
        if (DEV) throw err
        console.error(err.message)
      }
      return instance
    },
  }
  return wrapped
}

// ---------------------------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------------------------

/**
 * Build a NumericAnswer with the project tolerance policy for its kind
 * (pValue 0.0005 · testStat 0.01 · proportion 0.001 · count exact · mean/percent/other: half the
 * last displayed digit). Override with `digits` / `tolerance` when a prompt asks for a specific precision.
 */
export function numericAnswer(value: number, kind: NumericKind, extra: Omit<Partial<NumericAnswer>, 'type' | 'value' | 'kind'> = {}): NumericAnswer {
  const a: NumericAnswer = { type: 'numeric', value, kind, ...extra }
  if (kind === 'pValue' && a.allowInequality === undefined && value < 0.001) a.allowInequality = true
  return a
}

// ---------------------------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------------------------

export type Shape = 'normal' | 'skewLeft' | 'skewRight' | 'uniform' | 'bimodal'

export interface DatasetOptions {
  n: number
  mean: number
  sd: number
  /** Decimal places to round each value to (default 1). */
  round?: number
  min?: number
  max?: number
  shape?: Shape
  /** Require all values distinct (default false). */
  distinct?: boolean
  /** Optional acceptance test on the whole dataset (e.g. no outliers). */
  accept?: (values: number[]) => boolean
}

function drawOne(rng: Rng, shape: Shape, mu: number, sigma: number): number {
  switch (shape) {
    case 'normal':
      return rng.normal(mu, sigma)
    case 'skewRight':
      return mu + sigma * (rng.exponential(1) - 1)
    case 'skewLeft':
      return mu - sigma * (rng.exponential(1) - 1)
    case 'uniform':
      return rng.uniform(mu - sigma * Math.sqrt(3), mu + sigma * Math.sqrt(3)) // uniform with the requested sd
    case 'bimodal':
      return rng.bool() ? rng.normal(mu - 0.9 * sigma, 0.45 * sigma) : rng.normal(mu + 0.9 * sigma, 0.45 * sigma)
  }
}

/**
 * Draw an in-world dataset with a target center, spread and shape. Values are rounded to `round`
 * decimals and redrawn while outside [min, max]. Throws (via retry) if constraints are impossible.
 */
export function drawDataset(rng: Rng, opts: DatasetOptions): number[] {
  const { n, mean: mu, sd: sigma, shape = 'normal', distinct = false } = opts
  const digits = opts.round ?? 1
  const f = 10 ** digits
  const lo = opts.min ?? -Infinity
  const hi = opts.max ?? Infinity
  if (!(n > 0) || !(sigma > 0)) throw new RangeError('drawDataset: n and sd must be positive')
  return retry(
    rng,
    (r) => {
      const out: number[] = []
      const seen = new Set<number>()
      for (let i = 0; i < n; i++) {
        const v = retry(
          r,
          (rr) => Math.round(drawOne(rr, shape, mu, sigma) * f) / f,
          (v) => v >= lo && v <= hi && (!distinct || !seen.has(v)),
          500,
        )
        seen.add(v)
        out.push(v)
      }
      return out
    },
    (values) => (opts.accept ? opts.accept(values) : true),
    50,
  )
}

export interface ScatterOptions {
  n: number
  slope: number
  intercept: number
  /** SD of the vertical noise around the line. */
  noise: number
  xRange: [number, number]
  /** Decimal places for x and y (default 1). */
  round?: number
  /** Accept only draws whose sample correlation lies in this range (absolute value). */
  rRange?: [number, number]
  /** Draw x uniformly on a grid of this step instead of continuous (e.g. integer masses). */
  xStep?: number
  /** Optional acceptance test on the points. */
  accept?: (points: { x: number; y: number }[]) => boolean
}

export interface ScatterDraw {
  points: { x: number; y: number }[]
  xs: number[]
  ys: number[]
  /** Sample correlation of the draw (computed here only for rejection; report r via @/lib/stats). */
  r: number
}

/** Pearson r — INTERNAL rejection metric only. Answers must use @/lib/stats regression functions. */
function pearson(xs: number[], ys: number[]): number {
  const mx = mean(xs)
  const my = mean(ys)
  let sxy = 0
  for (let i = 0; i < xs.length; i++) sxy += (xs[i] - mx) * (ys[i] - my)
  const denom = (xs.length - 1) * sd(xs) * sd(ys)
  return denom === 0 ? 0 : sxy / denom
}

/**
 * Draw a scatterplot dataset around y = intercept + slope·x with Normal noise. Rejects degenerate
 * draws: fewer than 3 distinct x values, zero spread in y, r outside `rRange` (default: |r| ≥ 0.1
 * when slope ≠ 0 so the relationship the drill is about actually appears).
 */
export function drawScatter(rng: Rng, opts: ScatterOptions): ScatterDraw {
  const { n, slope, intercept, noise, xRange, xStep } = opts
  const digits = opts.round ?? 1
  const f = 10 ** digits
  const [xlo, xhi] = xRange
  if (!(n >= 3)) throw new RangeError('drawScatter: n must be ≥ 3')
  const rRange = opts.rRange ?? (slope === 0 ? [0, 1] : [0.1, 1])
  return retry(
    rng,
    (r) => {
      const xs: number[] = []
      const ys: number[] = []
      for (let i = 0; i < n; i++) {
        let x = r.uniform(xlo, xhi)
        if (xStep) x = xlo + Math.round((x - xlo) / xStep) * xStep
        x = Math.round(x * f) / f
        const y = Math.round((intercept + slope * x + r.normal(0, noise)) * f) / f
        xs.push(x)
        ys.push(y)
      }
      const points = xs.map((x, i) => ({ x, y: ys[i] }))
      return { points, xs, ys, r: sd(xs) === 0 || sd(ys) === 0 ? 0 : pearson(xs, ys) }
    },
    (d) => {
      if (new Set(d.xs).size < 3 || sd(d.ys) === 0) return false
      const a = Math.abs(d.r)
      if (a < rRange[0] || a > rRange[1]) return false
      if (slope !== 0 && Math.sign(d.r) !== Math.sign(slope)) return false
      return opts.accept ? opts.accept(d.points) : true
    },
  )
}

export interface TwoWayOptions {
  rows: string[]
  cols: string[]
  /** Total count. */
  n: number
  /**
   * Strength of association between row and column variables, 0 (independent) to 1 (strong).
   * Default 0.3.
   */
  association?: number
  /** Minimum count in every cell (default 1). */
  minCell?: number
  /** Optional acceptance test on the counts. */
  accept?: (counts: number[][]) => boolean
}

export interface TwoWayDraw {
  rows: string[]
  cols: string[]
  counts: number[][]
  rowTotals: number[]
  colTotals: number[]
  total: number
  /** Expected counts under independence (rowTotal·colTotal/total). */
  expected: number[][]
}

/**
 * Draw a two-way table of counts with a controllable association. Redraws until every cell is at
 * least `minCell`. Marginals vary between draws so tables do not look manufactured.
 */
export function drawTwoWay(rng: Rng, opts: TwoWayOptions): TwoWayDraw {
  const { rows, cols, n } = opts
  const assoc = Math.max(0, Math.min(1, opts.association ?? 0.3))
  const minCell = opts.minCell ?? 1
  if (rows.length < 2 || cols.length < 2) throw new RangeError('drawTwoWay: need ≥ 2 rows and ≥ 2 columns')
  if (n < rows.length * cols.length * minCell) throw new RangeError('drawTwoWay: n too small for minCell')
  return retry(
    rng,
    (r) => {
      const rowW = rows.map(() => r.uniform(0.6, 1.4))
      const baseCol = cols.map(() => r.uniform(0.6, 1.4))
      const counts = rows.map(() => cols.map(() => 0))
      // Row-specific column weights: a checkerboard perturbation of the base column weights whose
      // amplitude is the association strength (0 → rows share one column distribution).
      const rowColW = rows.map((_, i) => baseCol.map((b, j) => b * (1 + 0.9 * assoc * ((i + j) % 2 === 0 ? 1 : -1))))
      for (let k = 0; k < n; k++) {
        const i = r.weightedIndex(rowW)
        counts[i][r.weightedIndex(rowColW[i])]++
      }
      const rowTotals = counts.map((rw) => rw.reduce((a, b) => a + b, 0))
      const colTotals = cols.map((_, j) => counts.reduce((a, rw) => a + rw[j], 0))
      const expected = counts.map((rw, i) => rw.map((_, j) => (rowTotals[i] * colTotals[j]) / n))
      return { rows, cols, counts, rowTotals, colTotals, total: n, expected }
    },
    (t) => t.counts.every((rw) => rw.every((c) => c >= minCell)) && (opts.accept ? opts.accept(t.counts) : true),
  )
}

// ---------------------------------------------------------------------------------------------
// Framing helpers
// ---------------------------------------------------------------------------------------------

/** Pick one in-world framing (ship, corridor, cargo…) for a problem. Typed passthrough to rng.choice. */
export function pickContext<T>(rng: Rng, contexts: readonly T[]): T {
  if (contexts.length === 0) throw new RangeError('pickContext: no contexts')
  return rng.choice(contexts)
}

/** Markdown table for <RichText> (and for solutions). Numbers are passed through `fmt` when `digits` is given. */
export function tableMd(columns: readonly string[], rows: readonly (readonly (string | number)[])[], digits?: number): string {
  const cell = (c: string | number) => (typeof c === 'number' ? (digits === undefined ? String(c) : fmt(c, digits)) : String(c).replace(/\|/g, '\\|'))
  const head = `| ${columns.join(' | ')} |`
  const sep = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n')
  return `${head}\n${sep}\n${body}`
}

/** "11.2, 14.8, 9.6" — a data list for prose, formatted once. */
export function listNumbers(values: readonly number[], digits = 1, sep = ', '): string {
  return values.map((v) => fmt(v, digits)).join(sep)
}

/** Table DisplaySpec from columns/rows (for `data:` or `display:`). */
export function tableSpec(columns: string[], rows: (string | number)[][]): DisplaySpec {
  return { kind: 'table', columns, rows }
}
