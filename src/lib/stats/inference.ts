/**
 * Inference procedures (AP Units 6–9) with one uniform result shape.
 *
 *   onePropInterval({ x: 56, n: 200, confidence: 0.95 })            → ci, se (uses p̂), marginOfError
 *   onePropTest({ x: 56, n: 200, p0: 0.25, alt: 'greater' })         → statistic z, pValue (SE uses p0)
 *   twoPropInterval({ x1, n1, x2, n2, confidence })                  → unpooled SE
 *   twoPropTest({ x1, n1, x2, n2, alt })                             → pooled SE
 *   oneMeanInterval(xs | { mean, sd, n }, { confidence })            → t-interval, df = n − 1
 *   oneMeanTest(xs | summary, { mu0, alt })
 *   pairedTTest(first, second, { mu0, alt })                         → d = first − second
 *   twoMeanTest(a, b, { alt, dfMethod: 'welch' | 'conservative' })   → Welch df by default
 *   chiSquareGOF({ observed, probs | expected })
 *   chiSquareIndependence(table) / chiSquareHomogeneity(table)
 *   slopeTest(xs, ys, { alt }) / slopeInterval(xs, ys, { confidence })
 *   slopeTestFromComputerOutput({ b, seB, n, alt })                  → "read the output" problems
 *   powerZTestMean({ mu0, muA, sigma, n, alpha, alt }) / powerZTestProportion / powerCurve
 *   sampleSizeForProportion({ moe, confidence, pGuess }) / sampleSizeForMean({ moe, confidence, sigma })
 *
 * Result shape (every procedure): { procedure, statistic, df?, pValue?, ci?, se, estimate, conditions, summary, … }.
 * Conditions: numeric ones (Large Counts, expected counts ≥ 5, n ≥ 30) are COMPUTED; design ones (random,
 * 10%) are pass-through from the caller — when not supplied they are marked `assumed: true`.
 */
import { mean, sd, outliers, skewness } from './descriptive'
import { normal } from './distributions'
import { zStar, tStar, pValueZ, pValueT, pValueChi2, asConfidence, type Alternative } from './critical'
import { expectedCounts, rowTotals, colTotals } from './twoWay'
import { linearRegression } from './regression'
import { fmt, fmtP } from './format'

export interface Condition {
  name: string
  met: boolean
  detail: string
  /** True when the condition cannot be checked from the numbers and is taken as given by the caller. */
  assumed?: boolean
}

export interface InferenceResult {
  procedure: string
  /** z, t or χ² statistic (NaN for pure intervals that have no test). */
  statistic: number
  df?: number
  pValue?: number
  ci?: [number, number]
  /** Standard error used by the procedure (see AP conventions in README). */
  se: number
  /** Point estimate: p̂, x̄, p̂₁ − p̂₂, x̄₁ − x̄₂, d̄, b. */
  estimate: number
  /** z* or t* for intervals. */
  criticalValue?: number
  marginOfError?: number
  confidence?: number
  alternative?: Alternative
  hypotheses?: { null: string; alt: string }
  conditions: Condition[]
  /** Short technical summary, e.g. "z = 2.14, P = 0.0324". Prose conclusions belong in content. */
  summary: string
}

export interface DesignInfo {
  /** Data come from a random sample / randomized experiment (pass-through). */
  random?: boolean
  /** Population size for the 10% condition; omit if sampling with replacement or N is unknown. */
  populationSize?: number
}

export function allConditionsMet(r: { conditions: Condition[] }): boolean {
  return r.conditions.every((c) => c.met)
}

// ─── Condition checkers ─────────────────────────────────────────────────────────────────────────

export function randomCondition(random: boolean | undefined, what = 'the data'): Condition {
  if (random === undefined) return { name: 'Random', met: true, assumed: true, detail: `Assumed: ${what} come from a random sample or randomized experiment (state this in context).` }
  return { name: 'Random', met: random, detail: random ? `${what} come from a random sample or randomized experiment.` : `${what} were not randomly selected/assigned — inference is not justified.` }
}

export function tenPercentCondition(n: number, populationSize: number | undefined, label = 'n'): Condition {
  if (populationSize === undefined) return { name: '10% condition', met: true, assumed: true, detail: `Assumed: population is at least 10·${label} = ${10 * n} (sampling without replacement).` }
  const met = n <= 0.1 * populationSize
  return { name: '10% condition', met, detail: `${label} = ${n} ${met ? '≤' : '>'} 10% of N = ${populationSize} (${fmt(0.1 * populationSize, 1)}).` }
}

/** Large Counts: n·p ≥ 10 and n·(1 − p) ≥ 10, with p chosen per procedure (p̂ for intervals, p₀ for tests, pooled for 2-prop tests). */
export function largeCountsCondition(n: number, p: number, basis: string, threshold = 10): Condition {
  const a = n * p
  const b = n * (1 - p)
  const met = a >= threshold && b >= threshold
  return { name: 'Large Counts', met, detail: `Using ${basis}: n·p = ${fmt(a, 1)}, n·(1 − p) = ${fmt(b, 1)} — ${met ? 'both' : 'not both'} ≥ ${threshold}.` }
}

/** Counts of successes and failures (interval form of Large Counts). */
export function successFailureCondition(x: number, n: number, label = '', threshold = 10): Condition {
  const met = x >= threshold && n - x >= threshold
  return { name: `Large Counts${label ? ` (${label})` : ''}`, met, detail: `successes = ${x}, failures = ${n - x} — ${met ? 'both' : 'not both'} ≥ ${threshold}.` }
}

/**
 * Normal/Large Sample: n ≥ 30 passes outright; otherwise, with data, the sample must show no outliers
 * (1.5·IQR) and no strong skew (|G1| ≤ 1) — a heuristic stand-in for "graph shows no strong skewness or
 * outliers". Without data and n < 30, the condition is assumed (caller must state population normality).
 */
export function normalLargeSampleCondition(n: number, data?: readonly number[], label = ''): Condition {
  const name = `Normal/Large Sample${label ? ` (${label})` : ''}`
  if (n >= 30) return { name, met: true, detail: `n = ${n} ≥ 30, so the sampling distribution of the mean is approximately Normal (CLT).` }
  if (!data || data.length < 4) return { name, met: true, assumed: true, detail: `n = ${n} < 30 and no data to graph — must be stated that the population is approximately Normal.` }
  const out = outliers(data).values.length
  const g1 = data.length >= 3 ? skewness(data) : 0
  const met = out === 0 && Math.abs(g1) <= 1
  return { name, met, detail: `n = ${n} < 30: sample has ${out} outlier(s) and skewness ${fmt(g1, 2)} — ${met ? 'no strong skew or outliers; proceed' : 'inspect a graph; t-procedures may not be appropriate'}.` }
}

export function expectedCountsCondition(expected: readonly number[], threshold = 5): Condition {
  const minE = Math.min(...expected)
  const below = expected.filter((e) => e < threshold).length
  const met = below === 0
  return { name: 'Expected counts ≥ 5', met, detail: met ? `All expected counts ≥ ${threshold} (smallest ${fmt(minE, 2)}).` : `${below} expected count(s) below ${threshold} (smallest ${fmt(minE, 2)}) — χ² approximation unreliable.` }
}

// ─── Proportions ────────────────────────────────────────────────────────────────────────────────

export interface OnePropInput extends DesignInfo {
  /** Number of successes. */
  x: number
  n: number
}

function checkCount(x: number, n: number) {
  if (!Number.isInteger(n) || n <= 0) throw new RangeError(`n must be a positive integer, got ${n}`)
  if (!Number.isInteger(x) || x < 0 || x > n) throw new RangeError(`x must be an integer in [0, n], got ${x}`)
}

/** One-proportion z-interval: p̂ ± z*·√(p̂(1 − p̂)/n). */
export function onePropInterval({ x, n, random, populationSize, confidence = 0.95 }: OnePropInput & { confidence?: number }): InferenceResult {
  checkCount(x, n)
  const c = asConfidence(confidence)
  const phat = x / n
  const se = Math.sqrt((phat * (1 - phat)) / n)
  const z = zStar(c)
  const moe = z * se
  return {
    procedure: 'one-proportion z-interval',
    statistic: NaN,
    se,
    estimate: phat,
    criticalValue: z,
    marginOfError: moe,
    confidence: c,
    ci: [phat - moe, phat + moe],
    conditions: [randomCondition(random), tenPercentCondition(n, populationSize), successFailureCondition(x, n)],
    summary: `p̂ = ${fmt(phat, 4)}, z* = ${fmt(z, 3)}, SE = ${fmt(se, 4)}, CI (${fmt(phat - moe, 4)}, ${fmt(phat + moe, 4)})`,
  }
}

/** One-proportion z-test: z = (p̂ − p₀)/√(p₀(1 − p₀)/n) — SE uses the hypothesized p₀. */
export function onePropTest({ x, n, p0, alt = 'two-sided', random, populationSize }: OnePropInput & { p0: number; alt?: Alternative }): InferenceResult {
  checkCount(x, n)
  if (!(p0 > 0 && p0 < 1)) throw new RangeError(`p0 must be in (0, 1), got ${p0}`)
  const phat = x / n
  const se = Math.sqrt((p0 * (1 - p0)) / n)
  const z = (phat - p0) / se
  const p = pValueZ(z, alt)
  return {
    procedure: 'one-proportion z-test',
    statistic: z,
    pValue: p,
    se,
    estimate: phat,
    alternative: alt,
    hypotheses: { null: `p = ${p0}`, alt: `p ${altSymbol(alt)} ${p0}` },
    conditions: [randomCondition(random), tenPercentCondition(n, populationSize), largeCountsCondition(n, p0, 'p₀')],
    summary: `p̂ = ${fmt(phat, 4)}, z = ${fmt(z, 3)}, P = ${fmtP(p)}`,
  }
}

export interface TwoPropInput extends DesignInfo {
  x1: number
  n1: number
  x2: number
  n2: number
  populationSize2?: number
}

/** Two-proportion z-interval with the UNPOOLED standard error. */
export function twoPropInterval({ x1, n1, x2, n2, confidence = 0.95, random, populationSize, populationSize2 }: TwoPropInput & { confidence?: number }): InferenceResult {
  checkCount(x1, n1)
  checkCount(x2, n2)
  const c = asConfidence(confidence)
  const p1 = x1 / n1
  const p2 = x2 / n2
  const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
  const z = zStar(c)
  const moe = z * se
  const est = p1 - p2
  return {
    procedure: 'two-proportion z-interval',
    statistic: NaN,
    se,
    estimate: est,
    criticalValue: z,
    marginOfError: moe,
    confidence: c,
    ci: [est - moe, est + moe],
    conditions: [
      randomCondition(random, 'both samples'),
      tenPercentCondition(n1, populationSize, 'n₁'),
      tenPercentCondition(n2, populationSize2 ?? populationSize, 'n₂'),
      successFailureCondition(x1, n1, 'sample 1'),
      successFailureCondition(x2, n2, 'sample 2'),
    ],
    summary: `p̂₁ − p̂₂ = ${fmt(est, 4)}, z* = ${fmt(z, 3)}, SE = ${fmt(se, 4)}, CI (${fmt(est - moe, 4)}, ${fmt(est + moe, 4)})`,
  }
}

/** Two-proportion z-test with the POOLED proportion p̂c = (x₁ + x₂)/(n₁ + n₂) in the SE. */
export function twoPropTest({ x1, n1, x2, n2, alt = 'two-sided', random, populationSize, populationSize2 }: TwoPropInput & { alt?: Alternative }): InferenceResult & { pooled: number } {
  checkCount(x1, n1)
  checkCount(x2, n2)
  const p1 = x1 / n1
  const p2 = x2 / n2
  const pc = (x1 + x2) / (n1 + n2)
  const se = Math.sqrt(pc * (1 - pc) * (1 / n1 + 1 / n2))
  const z = (p1 - p2) / se
  const p = pValueZ(z, alt)
  return {
    procedure: 'two-proportion z-test',
    statistic: z,
    pValue: p,
    se,
    estimate: p1 - p2,
    pooled: pc,
    alternative: alt,
    hypotheses: { null: 'p₁ = p₂', alt: `p₁ ${altSymbol(alt)} p₂` },
    conditions: [
      randomCondition(random, 'both samples'),
      tenPercentCondition(n1, populationSize, 'n₁'),
      tenPercentCondition(n2, populationSize2 ?? populationSize, 'n₂'),
      largeCountsCondition(n1, pc, 'pooled p̂c (sample 1)'),
      largeCountsCondition(n2, pc, 'pooled p̂c (sample 2)'),
    ],
    summary: `p̂₁ − p̂₂ = ${fmt(p1 - p2, 4)}, p̂c = ${fmt(pc, 4)}, z = ${fmt(z, 3)}, P = ${fmtP(p)}`,
  }
}

// ─── Means ──────────────────────────────────────────────────────────────────────────────────────

export interface MeanSummary {
  mean: number
  sd: number
  n: number
}
export type MeanSample = readonly number[] | MeanSummary

function summarize(s: MeanSample): MeanSummary & { data?: readonly number[] } {
  if (Array.isArray(s)) {
    const xs = s as readonly number[]
    if (xs.length < 2) throw new RangeError('need at least 2 observations')
    return { mean: mean(xs), sd: sd(xs), n: xs.length, data: xs }
  }
  const m = s as MeanSummary
  if (!(m.n >= 2) || !(m.sd >= 0)) throw new RangeError('summary needs n ≥ 2 and sd ≥ 0')
  return { ...m }
}

/** One-sample t-interval: x̄ ± t*·s/√n with df = n − 1. */
export function oneMeanInterval(sample: MeanSample, { confidence = 0.95, random, populationSize }: DesignInfo & { confidence?: number } = {}): InferenceResult {
  const s = summarize(sample)
  const c = asConfidence(confidence)
  const df = s.n - 1
  const se = s.sd / Math.sqrt(s.n)
  const ts = tStar(c, df)
  const moe = ts * se
  return {
    procedure: 'one-sample t-interval',
    statistic: NaN,
    df,
    se,
    estimate: s.mean,
    criticalValue: ts,
    marginOfError: moe,
    confidence: c,
    ci: [s.mean - moe, s.mean + moe],
    conditions: [randomCondition(random), tenPercentCondition(s.n, populationSize), normalLargeSampleCondition(s.n, s.data)],
    summary: `x̄ = ${fmt(s.mean, 4)}, s = ${fmt(s.sd, 4)}, df = ${df}, t* = ${fmt(ts, 3)}, CI (${fmt(s.mean - moe, 4)}, ${fmt(s.mean + moe, 4)})`,
  }
}

/** One-sample t-test: t = (x̄ − μ₀)/(s/√n), df = n − 1. */
export function oneMeanTest(sample: MeanSample, { mu0, alt = 'two-sided', random, populationSize }: DesignInfo & { mu0: number; alt?: Alternative }): InferenceResult {
  const s = summarize(sample)
  const df = s.n - 1
  const se = s.sd / Math.sqrt(s.n)
  const t = (s.mean - mu0) / se
  const p = pValueT(t, df, alt)
  return {
    procedure: 'one-sample t-test',
    statistic: t,
    df,
    pValue: p,
    se,
    estimate: s.mean,
    alternative: alt,
    hypotheses: { null: `μ = ${mu0}`, alt: `μ ${altSymbol(alt)} ${mu0}` },
    conditions: [randomCondition(random), tenPercentCondition(s.n, populationSize), normalLargeSampleCondition(s.n, s.data)],
    summary: `x̄ = ${fmt(s.mean, 4)}, t = ${fmt(t, 3)}, df = ${df}, P = ${fmtP(p)}`,
  }
}

/** Paired t-test on differences d = first − second (one-sample t on the differences). */
export function pairedTTest(first: readonly number[], second: readonly number[], { mu0 = 0, alt = 'two-sided', random, populationSize }: DesignInfo & { mu0?: number; alt?: Alternative } = {}): InferenceResult & { differences: number[] } {
  const d = pairedDifferences(first, second)
  const r = oneMeanTest(d, { mu0, alt, random, populationSize })
  return { ...r, procedure: 'paired t-test', hypotheses: { null: `μ_d = ${mu0}`, alt: `μ_d ${altSymbol(alt)} ${mu0}` }, differences: d }
}

/** Paired t-interval for μ_d, d = first − second. */
export function pairedTInterval(first: readonly number[], second: readonly number[], opts: DesignInfo & { confidence?: number } = {}): InferenceResult & { differences: number[] } {
  const d = pairedDifferences(first, second)
  const r = oneMeanInterval(d, opts)
  return { ...r, procedure: 'paired t-interval', differences: d }
}

export function pairedDifferences(first: readonly number[], second: readonly number[]): number[] {
  if (first.length !== second.length) throw new RangeError('paired: samples differ in length')
  if (first.length < 2) throw new RangeError('paired: need at least 2 pairs')
  return first.map((a, i) => a - second[i])
}

export type DfMethod = 'welch' | 'conservative'

/** Welch–Satterthwaite df (the calculator default). */
export function welchDf(sd1: number, n1: number, sd2: number, n2: number): number {
  const a = (sd1 * sd1) / n1
  const b = (sd2 * sd2) / n2
  return ((a + b) * (a + b)) / ((a * a) / (n1 - 1) + (b * b) / (n2 - 1))
}

/** Conservative df = min(n₁ − 1, n₂ − 1). */
export function conservativeDf(n1: number, n2: number): number {
  return Math.min(n1 - 1, n2 - 1)
}

export interface TwoMeanOptions extends DesignInfo {
  dfMethod?: DfMethod
  populationSize2?: number
}

function twoMeanCore(a: MeanSample, b: MeanSample, dfMethod: DfMethod) {
  const s1 = summarize(a)
  const s2 = summarize(b)
  const se = Math.sqrt((s1.sd * s1.sd) / s1.n + (s2.sd * s2.sd) / s2.n)
  const df = dfMethod === 'welch' ? welchDf(s1.sd, s1.n, s2.sd, s2.n) : conservativeDf(s1.n, s2.n)
  return { s1, s2, se, df }
}

function twoMeanConditions(s1: ReturnType<typeof summarize>, s2: ReturnType<typeof summarize>, o: TwoMeanOptions): Condition[] {
  return [
    randomCondition(o.random, 'both samples'),
    tenPercentCondition(s1.n, o.populationSize, 'n₁'),
    tenPercentCondition(s2.n, o.populationSize2 ?? o.populationSize, 'n₂'),
    normalLargeSampleCondition(s1.n, s1.data, 'sample 1'),
    normalLargeSampleCondition(s2.n, s2.data, 'sample 2'),
  ]
}

/** Two-sample t-interval for μ₁ − μ₂ (unpooled SE; Welch df unless dfMethod = 'conservative'). */
export function twoMeanInterval(a: MeanSample, b: MeanSample, { confidence = 0.95, dfMethod = 'welch', ...design }: TwoMeanOptions & { confidence?: number } = {}): InferenceResult {
  const c = asConfidence(confidence)
  const { s1, s2, se, df } = twoMeanCore(a, b, dfMethod)
  const est = s1.mean - s2.mean
  const ts = tStar(c, df)
  const moe = ts * se
  return {
    procedure: `two-sample t-interval (${dfMethod} df)`,
    statistic: NaN,
    df,
    se,
    estimate: est,
    criticalValue: ts,
    marginOfError: moe,
    confidence: c,
    ci: [est - moe, est + moe],
    conditions: twoMeanConditions(s1, s2, design),
    summary: `x̄₁ − x̄₂ = ${fmt(est, 4)}, df = ${fmt(df, 2)}, t* = ${fmt(ts, 3)}, CI (${fmt(est - moe, 4)}, ${fmt(est + moe, 4)})`,
  }
}

/** Two-sample t-test for μ₁ − μ₂ = Δ₀ (default 0). */
export function twoMeanTest(a: MeanSample, b: MeanSample, { alt = 'two-sided', delta0 = 0, dfMethod = 'welch', ...design }: TwoMeanOptions & { alt?: Alternative; delta0?: number } = {}): InferenceResult {
  const { s1, s2, se, df } = twoMeanCore(a, b, dfMethod)
  const est = s1.mean - s2.mean
  const t = (est - delta0) / se
  const p = pValueT(t, df, alt)
  return {
    procedure: `two-sample t-test (${dfMethod} df)`,
    statistic: t,
    df,
    pValue: p,
    se,
    estimate: est,
    alternative: alt,
    hypotheses: { null: `μ₁ − μ₂ = ${delta0}`, alt: `μ₁ − μ₂ ${altSymbol(alt)} ${delta0}` },
    conditions: twoMeanConditions(s1, s2, design),
    summary: `x̄₁ − x̄₂ = ${fmt(est, 4)}, t = ${fmt(t, 3)}, df = ${fmt(df, 2)}, P = ${fmtP(p)}`,
  }
}

// ─── Chi-square ─────────────────────────────────────────────────────────────────────────────────

export interface ChiSquareResult extends InferenceResult {
  observed: number[]
  expected: number[]
  /** (O − E)²/E per cell, in the same order as observed. */
  contributions: number[]
  /** Index of the largest contribution. */
  largestContributor: number
}

export interface ChiSquareGOFInput extends DesignInfo {
  observed: readonly number[]
  /** Hypothesized proportions (sum to 1) — or supply `expected` counts directly. */
  probs?: readonly number[]
  expected?: readonly number[]
  categories?: readonly string[]
}

/** Chi-square goodness-of-fit: χ² = Σ(O − E)²/E, df = k − 1. */
export function chiSquareGOF({ observed, probs, expected, random, populationSize, categories }: ChiSquareGOFInput): ChiSquareResult {
  const k = observed.length
  if (k < 2) throw new RangeError('chiSquareGOF: need at least 2 categories')
  const n = observed.reduce((a, b) => a + b, 0)
  let E: number[]
  if (expected) {
    if (expected.length !== k) throw new RangeError('chiSquareGOF: expected length mismatch')
    E = expected.slice()
  } else {
    const pr = probs ?? observed.map(() => 1 / k)
    if (pr.length !== k) throw new RangeError('chiSquareGOF: probs length mismatch')
    const sum = pr.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - 1) > 1e-9) throw new RangeError(`chiSquareGOF: probs must sum to 1 (got ${sum})`)
    E = pr.map((p) => n * p)
  }
  const contributions = observed.map((o, i) => ((o - E[i]) * (o - E[i])) / E[i])
  const stat = contributions.reduce((a, b) => a + b, 0)
  const df = k - 1
  const p = pValueChi2(stat, df)
  let largest = 0
  for (let i = 1; i < k; i++) if (contributions[i] > contributions[largest]) largest = i
  return {
    procedure: 'chi-square goodness-of-fit',
    statistic: stat,
    df,
    pValue: p,
    se: NaN,
    estimate: NaN,
    observed: observed.slice(),
    expected: E,
    contributions,
    largestContributor: largest,
    hypotheses: { null: 'the category proportions equal the claimed distribution', alt: 'at least one proportion differs' },
    conditions: [randomCondition(random), tenPercentCondition(n, populationSize), expectedCountsCondition(E)],
    summary: `χ² = ${fmt(stat, 3)}, df = ${df}, P = ${fmtP(p)}${categories ? ` (largest contribution: ${categories[largest]})` : ''}`,
  }
}

export interface ChiSquareTableResult extends ChiSquareResult {
  table: number[][]
  expectedTable: number[][]
  contributionTable: number[][]
  rowTotals: number[]
  colTotals: number[]
  total: number
}

function chiSquareTable(table: readonly (readonly number[])[], procedure: string, conditions: Condition[], hyp: { null: string; alt: string }): ChiSquareTableResult {
  const r = table.length
  const c = table[0]?.length ?? 0
  if (r < 2 || c < 2) throw new RangeError('chi-square table test: need at least a 2×2 table')
  const E = expectedCounts(table)
  const contributionTable = table.map((row, i) => row.map((o, j) => ((o - E[i][j]) * (o - E[i][j])) / E[i][j]))
  const contributions = contributionTable.flat()
  const observed = table.flat()
  const stat = contributions.reduce((a, b) => a + b, 0)
  const df = (r - 1) * (c - 1)
  const p = pValueChi2(stat, df)
  let largest = 0
  for (let i = 1; i < contributions.length; i++) if (contributions[i] > contributions[largest]) largest = i
  const rt = rowTotals(table)
  const ct = colTotals(table)
  const total = rt.reduce((a, b) => a + b, 0)
  return {
    procedure,
    statistic: stat,
    df,
    pValue: p,
    se: NaN,
    estimate: NaN,
    observed,
    expected: E.flat(),
    contributions,
    largestContributor: largest,
    table: table.map((row) => row.slice()),
    expectedTable: E,
    contributionTable,
    rowTotals: rt,
    colTotals: ct,
    total,
    hypotheses: hyp,
    conditions: [...conditions, expectedCountsCondition(E.flat())],
    summary: `χ² = ${fmt(stat, 3)}, df = ${df}, P = ${fmtP(p)}`,
  }
}

/** Chi-square test of independence: ONE random sample, two categorical variables. df = (r − 1)(c − 1). */
export function chiSquareIndependence(table: readonly (readonly number[])[], { random, populationSize }: DesignInfo = {}): ChiSquareTableResult {
  const n = rowTotals(table).reduce((a, b) => a + b, 0)
  return chiSquareTable(table, 'chi-square test of independence', [randomCondition(random, 'the sample'), tenPercentCondition(n, populationSize)], {
    null: 'the two variables are independent in the population',
    alt: 'the two variables are associated',
  })
}

/** Chi-square test of homogeneity: SEPARATE random samples (rows), one categorical variable. Same arithmetic, different conditions/hypotheses. */
export function chiSquareHomogeneity(table: readonly (readonly number[])[], { random, populationSizes }: { random?: boolean; populationSizes?: readonly number[] } = {}): ChiSquareTableResult {
  const rt = rowTotals(table)
  const tenPct = rt.map((n, i) => tenPercentCondition(n, populationSizes?.[i], `n${i + 1}`))
  return chiSquareTable(table, 'chi-square test of homogeneity', [randomCondition(random, 'each sample/group'), ...tenPct], {
    null: 'the distribution of the variable is the same in every population/treatment',
    alt: 'the distributions differ',
  })
}

// ─── Slope ──────────────────────────────────────────────────────────────────────────────────────

export interface SlopeResult extends InferenceResult {
  b: number
  seB: number
  n: number
}

function slopeConditions(random: boolean | undefined, populationSize: number | undefined, fit?: ReturnType<typeof linearRegression>): Condition[] {
  const n = fit?.n ?? 0
  const out: Condition[] = [
    { name: 'Linear', met: true, assumed: true, detail: fit ? `Assumed from the scatterplot/residual plot (r² = ${fmt(fit.r2, 3)}); residuals must show no curved pattern.` : 'Assumed: the scatterplot/residual plot shows a linear pattern.' },
    randomCondition(random),
    tenPercentCondition(n, populationSize),
  ]
  if (fit) {
    const resid = fit.residuals
    const out2 = outliers(resid).values.length
    const g1 = resid.length >= 3 ? skewness(resid) : 0
    const okNormal = n >= 30 || (out2 === 0 && Math.abs(g1) <= 1)
    out.push({ name: 'Normal residuals', met: okNormal, detail: `Residuals: ${out2} outlier(s), skewness ${fmt(g1, 2)}${n >= 30 ? `; n = ${n} ≥ 30` : ''}.` })
    // Equal SD: compare residual spread in the lower and upper halves of x.
    const idx = fit.fitted.map((_, i) => i).sort((i, j) => fit.fitted[i] - fit.fitted[j])
    const half = Math.floor(idx.length / 2)
    const lo = idx.slice(0, half).map((i) => resid[i])
    const hi = idx.slice(idx.length - half).map((i) => resid[i])
    const ratio = lo.length >= 2 && hi.length >= 2 ? Math.max(sd(lo), sd(hi)) / Math.max(Math.min(sd(lo), sd(hi)), 1e-300) : 1
    out.push({ name: 'Equal SD', met: ratio <= 2, detail: `Residual SD ratio (larger/smaller half by fitted value) = ${fmt(ratio, 2)} — ${ratio <= 2 ? 'no strong fanning' : 'spread changes across x'}.` })
  } else {
    out.push({ name: 'Normal residuals', met: true, assumed: true, detail: 'Assumed: residuals roughly Normal (no data to check).' })
    out.push({ name: 'Equal SD', met: true, assumed: true, detail: 'Assumed: residual spread constant across x (no data to check).' })
  }
  return out
}

/** t-interval for the population slope β: b ± t*·SE(b), df = n − 2. */
export function slopeInterval(xs: readonly number[], ys: readonly number[], { confidence = 0.95, random, populationSize }: DesignInfo & { confidence?: number } = {}): SlopeResult {
  const fit = linearRegression(xs, ys)
  if (fit.n < 3) throw new RangeError('slopeInterval: need at least 3 points')
  const r = slopeIntervalFromOutput({ b: fit.slope, seB: fit.seSlope, n: fit.n, confidence })
  return { ...r, conditions: slopeConditions(random, populationSize, fit) }
}

/** t-test for the slope H₀: β = β₀ (default 0), df = n − 2. */
export function slopeTest(xs: readonly number[], ys: readonly number[], { alt = 'two-sided', beta0 = 0, random, populationSize }: DesignInfo & { alt?: Alternative; beta0?: number } = {}): SlopeResult {
  const fit = linearRegression(xs, ys)
  if (fit.n < 3) throw new RangeError('slopeTest: need at least 3 points')
  const r = slopeTestFromComputerOutput({ b: fit.slope, seB: fit.seSlope, n: fit.n, alt, beta0 })
  return { ...r, conditions: slopeConditions(random, populationSize, fit) }
}

export interface ComputerOutput {
  /** Slope coefficient from the output. */
  b: number
  /** Its standard error ("SE Coef"). */
  seB: number
  n: number
}

/** AP "read the computer output": t = (b − β₀)/SE(b), df = n − 2. Conditions are all assumed (no data). */
export function slopeTestFromComputerOutput({ b, seB, n, alt = 'two-sided', beta0 = 0 }: ComputerOutput & { alt?: Alternative; beta0?: number }): SlopeResult {
  if (!(n >= 3)) throw new RangeError('slopeTestFromComputerOutput: n must be ≥ 3')
  if (!(seB > 0)) throw new RangeError('slopeTestFromComputerOutput: seB must be positive')
  const df = n - 2
  const t = (b - beta0) / seB
  const p = pValueT(t, df, alt)
  return {
    procedure: 't-test for slope',
    statistic: t,
    df,
    pValue: p,
    se: seB,
    estimate: b,
    b,
    seB,
    n,
    alternative: alt,
    hypotheses: { null: `β = ${beta0}`, alt: `β ${altSymbol(alt)} ${beta0}` },
    conditions: slopeConditions(undefined, undefined),
    summary: `b = ${fmt(b, 4)}, SE(b) = ${fmt(seB, 4)}, t = ${fmt(t, 3)}, df = ${df}, P = ${fmtP(p)}`,
  }
}

/** Slope interval from computer output: b ± t*·SE(b). */
export function slopeIntervalFromOutput({ b, seB, n, confidence = 0.95 }: ComputerOutput & { confidence?: number }): SlopeResult {
  if (!(n >= 3)) throw new RangeError('slopeIntervalFromOutput: n must be ≥ 3')
  if (!(seB > 0)) throw new RangeError('slopeIntervalFromOutput: seB must be positive')
  const c = asConfidence(confidence)
  const df = n - 2
  const ts = tStar(c, df)
  const moe = ts * seB
  return {
    procedure: 't-interval for slope',
    statistic: NaN,
    df,
    se: seB,
    estimate: b,
    b,
    seB,
    n,
    criticalValue: ts,
    marginOfError: moe,
    confidence: c,
    ci: [b - moe, b + moe],
    conditions: slopeConditions(undefined, undefined),
    summary: `b = ${fmt(b, 4)}, df = ${df}, t* = ${fmt(ts, 3)}, CI (${fmt(b - moe, 4)}, ${fmt(b + moe, 4)})`,
  }
}

// ─── Power, errors, sample size ─────────────────────────────────────────────────────────────────

export interface PowerResult {
  power: number
  /** P(Type II error) = 1 − power. */
  beta: number
  alpha: number
  /** Rejection region in the units of the statistic's sampling distribution (x̄ or p̂). */
  rejectAbove?: number
  rejectBelow?: number
  se: number
}

/** Power of a z-test on a mean (σ known) against the specific alternative μ = muA. */
export function powerZTestMean({ mu0, muA, sigma, n, alpha = 0.05, alt = 'two-sided' }: { mu0: number; muA: number; sigma: number; n: number; alpha?: number; alt?: Alternative }): PowerResult {
  if (!(sigma > 0) || !(n > 0)) throw new RangeError('powerZTestMean: sigma and n must be positive')
  const se = sigma / Math.sqrt(n)
  return powerFromSe(mu0, muA, se, se, alpha, alt)
}

/** Power of a one-proportion z-test against p = pA (SE under H₀ for the cutoff, SE under pA for the power). */
export function powerZTestProportion({ p0, pA, n, alpha = 0.05, alt = 'two-sided' }: { p0: number; pA: number; n: number; alpha?: number; alt?: Alternative }): PowerResult {
  if (!(p0 > 0 && p0 < 1) || !(pA > 0 && pA < 1) || !(n > 0)) throw new RangeError('powerZTestProportion: p0, pA in (0,1) and n > 0')
  const se0 = Math.sqrt((p0 * (1 - p0)) / n)
  const seA = Math.sqrt((pA * (1 - pA)) / n)
  return powerFromSe(p0, pA, se0, seA, alpha, alt)
}

function powerFromSe(theta0: number, thetaA: number, se0: number, seA: number, alpha: number, alt: Alternative): PowerResult {
  if (!(alpha > 0 && alpha < 1)) throw new RangeError('alpha must be in (0, 1)')
  let power: number
  let rejectAbove: number | undefined
  let rejectBelow: number | undefined
  if (alt === 'greater') {
    rejectAbove = theta0 + normal.standardQuantile(1 - alpha) * se0
    power = normal.sf((rejectAbove - thetaA) / seA)
  } else if (alt === 'less') {
    rejectBelow = theta0 - normal.standardQuantile(1 - alpha) * se0
    power = normal.cdf((rejectBelow - thetaA) / seA)
  } else {
    const z = normal.standardQuantile(1 - alpha / 2)
    rejectAbove = theta0 + z * se0
    rejectBelow = theta0 - z * se0
    power = normal.sf((rejectAbove - thetaA) / seA) + normal.cdf((rejectBelow - thetaA) / seA)
  }
  return { power, beta: 1 - power, alpha, rejectAbove, rejectBelow, se: seA }
}

/** Power curve points for a mean z-test over a range of alternatives (or an explicit list). */
export function powerCurve(
  base: { mu0: number; sigma: number; n: number; alpha?: number; alt?: Alternative },
  alternatives: readonly number[] | { from: number; to: number; steps: number },
): { muA: number; power: number }[] {
  const list = Array.isArray(alternatives)
    ? (alternatives as readonly number[])
    : (() => {
        const { from, to, steps } = alternatives as { from: number; to: number; steps: number }
        return Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps)
      })()
  return list.map((muA) => ({ muA, power: powerZTestMean({ ...base, muA }).power }))
}

/** Type I error rate is α by construction; provided for symmetry with typeIIError. */
export function typeIError(alpha: number): number {
  return alpha
}

/** β = 1 − power for a mean z-test. */
export function typeIIError(args: Parameters<typeof powerZTestMean>[0]): number {
  return powerZTestMean(args).beta
}

/** n = ⌈p⋆(1 − p⋆)·(z⋆ / m)²⌉ (p⋆ = 0.5 is the conservative guess). */
export function sampleSizeForProportion({ moe, confidence = 0.95, pGuess = 0.5 }: { moe: number; confidence?: number; pGuess?: number }): number {
  if (!(moe > 0)) throw new RangeError('sampleSizeForProportion: moe must be positive')
  const z = zStar(confidence)
  return Math.ceil(pGuess * (1 - pGuess) * (z / moe) ** 2 - 1e-9)
}

/** n = ⌈(z⋆·σ / m)²⌉. */
export function sampleSizeForMean({ moe, confidence = 0.95, sigma }: { moe: number; confidence?: number; sigma: number }): number {
  if (!(moe > 0) || !(sigma > 0)) throw new RangeError('sampleSizeForMean: moe and sigma must be positive')
  const z = zStar(confidence)
  return Math.ceil(((z * sigma) / moe) ** 2 - 1e-9)
}

/** Margin of error for a proportion at a given n. */
export function marginOfErrorProportion(phat: number, n: number, confidence = 0.95): number {
  return zStar(confidence) * Math.sqrt((phat * (1 - phat)) / n)
}

/** Margin of error for a mean with known σ (z) or sample s (t). */
export function marginOfErrorMean(sdOrSigma: number, n: number, confidence = 0.95, known: 'sigma' | 's' = 's'): number {
  const se = sdOrSigma / Math.sqrt(n)
  return (known === 'sigma' ? zStar(confidence) : tStar(confidence, n - 1)) * se
}

// ─── Helpers ────────────────────────────────────────────────────────────────────────────────────

function altSymbol(alt: Alternative): string {
  return alt === 'two-sided' ? '≠' : alt === 'less' ? '<' : '>'
}

/** Standard error of x̄ given s and n (sanity helper for worked examples). */
export function seMean(s: number, n: number): number {
  return s / Math.sqrt(n)
}

/** Standard error of p̂ (using p̂ or a hypothesized p). */
export function seProportion(p: number, n: number): number {
  return Math.sqrt((p * (1 - p)) / n)
}

/** Which tail area a z-score cuts off, for the P-value visualizer. */
export function tailArea(stat: number, alt: Alternative, dist: 'z' | { t: number }): number {
  if (dist === 'z') return pValueZ(stat, alt)
  return pValueT(stat, dist.t, alt)
}

/** Sampling-distribution sd of p̂ under a given p (for Unit 5 "describe the sampling distribution"). */
export function samplingSdProportion(p: number, n: number): number {
  return Math.sqrt((p * (1 - p)) / n)
}

/** Sampling-distribution sd of x̄. */
export function samplingSdMean(sigma: number, n: number): number {
  return sigma / Math.sqrt(n)
}
