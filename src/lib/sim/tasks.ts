/**
 * Simulation task registry for the Monte Carlo worker. Each task performs ONE replication and
 * returns one number (a statistic). The worker batches replications and streams results.
 *
 *   <MonteCarlo task="sample-mean" params={{ parent: 'exponential', rate: 0.5, n: 25 }} n={5000} />
 *
 * Params are plain JSON (they cross the worker boundary). Every task documents its params below and
 * applies defaults, so a missing param never throws inside the worker. Act instrument builders may
 * register more with `registerTask` at module load (import their file from src/lib/sim/index.ts).
 *
 * Parent distributions (for sample-mean / sample-sd / sample-median / ci-capture):
 *   parent: 'normal'       { mu = 0, sigma = 1 }
 *   parent: 'uniform'      { a = 0, b = 1 }
 *   parent: 'exponential'  { rate = 1 }
 *   parent: 'skewed'       { shape = 2, scale = 1 }   right-skewed Gamma(shape, scale) (integer shape; sum of exponentials)
 *   parent: 'bimodal'      { mu1 = -2, mu2 = 2, sigma = 1, w = 0.5 }
 *   parent: 'discrete'     { values: number[], probs: number[] }   custom discrete RV
 *   parent: 'bernoulli'    { p = 0.5 }
 */
import type { Rng } from '@/lib/rng'
import { mean, sd, median } from '@/lib/stats/descriptive'
import { zStar, tStar } from '@/lib/stats/critical'
import { linearRegression } from '@/lib/stats/regression'

export type SimTask = (rng: Rng, params: Record<string, unknown>) => number

type P = Record<string, unknown>
const num = (p: P, key: string, def: number): number => {
  const v = p[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : def
}
const arr = (p: P, key: string): number[] | null => (Array.isArray(p[key]) ? (p[key] as unknown[]).map(Number) : null)
const str = (p: P, key: string, def: string): string => (typeof p[key] === 'string' ? (p[key] as string) : def)

/** One draw from the parent distribution named in params. */
export function drawParent(rng: Rng, p: P): number {
  switch (str(p, 'parent', 'normal')) {
    case 'uniform':
      return rng.uniform(num(p, 'a', 0), num(p, 'b', 1))
    case 'exponential':
      return rng.exponential(num(p, 'rate', 1))
    case 'skewed': {
      const shape = Math.max(1, Math.round(num(p, 'shape', 2)))
      const scale = num(p, 'scale', 1)
      let s = 0
      for (let i = 0; i < shape; i++) s += rng.exponential(1)
      return s * scale
    }
    case 'bimodal': {
      const w = num(p, 'w', 0.5)
      const sigma = num(p, 'sigma', 1)
      return rng.bool(w) ? rng.normal(num(p, 'mu1', -2), sigma) : rng.normal(num(p, 'mu2', 2), sigma)
    }
    case 'discrete': {
      const values = arr(p, 'values') ?? [0, 1]
      const probs = arr(p, 'probs') ?? values.map(() => 1 / values.length)
      return values[rng.weightedIndex(probs)]
    }
    case 'bernoulli':
      return rng.bool(num(p, 'p', 0.5)) ? 1 : 0
    case 'normal':
    default:
      return rng.normal(num(p, 'mu', 0), num(p, 'sigma', 1))
  }
}

/** Population mean of the parent named in params (for CI-capture and centering overlays). */
export function parentMean(p: P): number {
  switch (str(p, 'parent', 'normal')) {
    case 'uniform':
      return (num(p, 'a', 0) + num(p, 'b', 1)) / 2
    case 'exponential':
      return 1 / num(p, 'rate', 1)
    case 'skewed':
      return Math.max(1, Math.round(num(p, 'shape', 2))) * num(p, 'scale', 1)
    case 'bimodal': {
      const w = num(p, 'w', 0.5)
      return w * num(p, 'mu1', -2) + (1 - w) * num(p, 'mu2', 2)
    }
    case 'discrete': {
      const values = arr(p, 'values') ?? [0, 1]
      const probs = arr(p, 'probs') ?? values.map(() => 1 / values.length)
      const tot = probs.reduce((a, b) => a + b, 0)
      return values.reduce((s, v, i) => s + (v * probs[i]) / tot, 0)
    }
    case 'bernoulli':
      return num(p, 'p', 0.5)
    case 'normal':
    default:
      return num(p, 'mu', 0)
  }
}

/** Population sd of the parent named in params. */
export function parentSd(p: P): number {
  switch (str(p, 'parent', 'normal')) {
    case 'uniform':
      return (num(p, 'b', 1) - num(p, 'a', 0)) / Math.sqrt(12)
    case 'exponential':
      return 1 / num(p, 'rate', 1)
    case 'skewed':
      return Math.sqrt(Math.max(1, Math.round(num(p, 'shape', 2)))) * num(p, 'scale', 1)
    case 'bimodal': {
      const w = num(p, 'w', 0.5)
      const m1 = num(p, 'mu1', -2)
      const m2 = num(p, 'mu2', 2)
      const s = num(p, 'sigma', 1)
      const m = w * m1 + (1 - w) * m2
      return Math.sqrt(s * s + w * (m1 - m) ** 2 + (1 - w) * (m2 - m) ** 2)
    }
    case 'discrete': {
      const values = arr(p, 'values') ?? [0, 1]
      const probs = arr(p, 'probs') ?? values.map(() => 1 / values.length)
      const tot = probs.reduce((a, b) => a + b, 0)
      const m = values.reduce((s, v, i) => s + (v * probs[i]) / tot, 0)
      return Math.sqrt(values.reduce((s, v, i) => s + ((v - m) ** 2 * probs[i]) / tot, 0))
    }
    case 'bernoulli': {
      const q = num(p, 'p', 0.5)
      return Math.sqrt(q * (1 - q))
    }
    case 'normal':
    default:
      return num(p, 'sigma', 1)
  }
}

function drawSample(rng: Rng, p: P): number[] {
  const n = Math.max(1, Math.round(num(p, 'n', 10)))
  const xs = new Array<number>(n)
  for (let i = 0; i < n; i++) xs[i] = drawParent(rng, p)
  return xs
}

export const tasks: Record<string, SimTask> = {
  /** Mean of n draws from Normal(mu, sigma). params: { n, mu, sigma }  (kept for compatibility) */
  'normal-sample-mean': (rng, p) => {
    const n = Math.max(1, Math.round(num(p, 'n', 10)))
    const mu = num(p, 'mu', 0)
    const sigma = num(p, 'sigma', 1)
    let s = 0
    for (let i = 0; i < n; i++) s += rng.normal(mu, sigma)
    return s / n
  },

  /** Sample proportion from Binomial(n, p). params: { n, p } */
  'sample-proportion': (rng, p) => {
    const n = Math.max(1, Math.round(num(p, 'n', 30)))
    return rng.binomial(n, num(p, 'p', 0.5)) / n
  },

  /** CLT machine: mean of n draws from any parent. params: { parent, n, ...parent params } */
  'sample-mean': (rng, p) => mean(drawSample(rng, p)),

  /** Sample sd (n − 1) of n ≥ 2 draws from any parent. params: { parent, n, … } */
  'sample-sd': (rng, p) => {
    const xs = drawSample(rng, { ...p, n: Math.max(2, num(p, 'n', 10)) })
    return sd(xs)
  },

  /** Sample median of n draws from any parent. params: { parent, n, … } */
  'sample-median': (rng, p) => median(drawSample(rng, p)),

  /** Sample maximum of n draws (for "why the max is a bad estimator" demos). params: { parent, n, … } */
  'sample-max': (rng, p) => Math.max(...drawSample(rng, p)),

  /**
   * CI capture: 1 if the interval captured the true parameter, else 0.
   * params: { kind: 'mean-t' | 'mean-z' | 'proportion', n, confidence = 0.95, parent + parent params (means) | p (proportion) }
   * 'mean-z' uses the parent's true σ; 'mean-t' uses the sample s and t*.
   */
  'ci-capture': (rng, p) => {
    const kind = str(p, 'kind', 'mean-t')
    const conf = num(p, 'confidence', 0.95)
    const n = Math.max(2, Math.round(num(p, 'n', 25)))
    if (kind === 'proportion') {
      const pr = num(p, 'p', 0.5)
      const phat = rng.binomial(n, pr) / n
      const moe = zStar(conf) * Math.sqrt((phat * (1 - phat)) / n)
      return phat - moe <= pr && pr <= phat + moe ? 1 : 0
    }
    const xs = drawSample(rng, { ...p, n })
    const m = mean(xs)
    const mu = parentMean(p)
    const moe = kind === 'mean-z' ? zStar(conf) * (parentSd(p) / Math.sqrt(n)) : tStar(conf, n - 1) * (sd(xs) / Math.sqrt(n))
    return m - moe <= mu && mu <= m + moe ? 1 : 0
  },

  /**
   * Sample slope from the model y = intercept + slope·x + N(0, sigma), x drawn uniformly on [xMin, xMax]
   * (or fixed at `xs` if given). params: { n = 20, slope = 1, intercept = 0, sigma = 1, xMin = 0, xMax = 10, xs? }
   */
  'sample-slope': (rng, p) => {
    const fixed = arr(p, 'xs')
    const n = fixed ? fixed.length : Math.max(3, Math.round(num(p, 'n', 20)))
    const slope = num(p, 'slope', 1)
    const intercept = num(p, 'intercept', 0)
    const sigma = num(p, 'sigma', 1)
    const xs = fixed ?? Array.from({ length: n }, () => rng.uniform(num(p, 'xMin', 0), num(p, 'xMax', 10)))
    const ys = xs.map((x) => intercept + slope * x + rng.normal(0, sigma))
    return linearRegression(xs, ys).slope
  },

  /** One permuted difference in means (group a − group b) under H₀. params: { a: number[], b: number[] } */
  'permutation-diff': (rng, p) => {
    const a = arr(p, 'a') ?? [0]
    const b = arr(p, 'b') ?? [0]
    const sh = rng.shuffle([...a, ...b])
    return mean(sh.slice(0, a.length)) - mean(sh.slice(a.length))
  },

  /** One bootstrap mean. params: { data: number[] } */
  'bootstrap-mean': (rng, p) => mean(rng.resample(arr(p, 'data') ?? [0])),

  /** Binomial count. params: { n, p } */
  'binomial-count': (rng, p) => rng.binomial(Math.max(0, Math.round(num(p, 'n', 10))), num(p, 'p', 0.5)),

  /** Geometric: trials up to and including the first success. params: { p } */
  'geometric-trials': (rng, p) => rng.geometric(Math.min(1, Math.max(1e-9, num(p, 'p', 0.5)))),

  /** Sum of `dice` fair dice with `sides` faces. params: { dice = 2, sides = 6 } */
  'dice-sum': (rng, p) => {
    const dice = Math.max(1, Math.round(num(p, 'dice', 2)))
    const sides = Math.max(1, Math.round(num(p, 'sides', 6)))
    let s = 0
    for (let i = 0; i < dice; i++) s += rng.int(1, sides)
    return s
  },

  /** Sum of k independent draws from a custom discrete RV. params: { values, probs, k = 1 } */
  'rv-sum': (rng, p) => {
    const values = arr(p, 'values') ?? [0, 1]
    const probs = arr(p, 'probs') ?? values.map(() => 1)
    const k = Math.max(1, Math.round(num(p, 'k', 1)))
    let s = 0
    for (let i = 0; i < k; i++) s += values[rng.weightedIndex(probs)]
    return s
  },

  /**
   * Detection while running cold: each of n enemy pings independently detects the ship with
   * probability p (which may rise with heat: p = pBase + heatRate·i for ping i). Returns the number of
   * detections (0 means the ship stayed hidden). params: { n = 12, p = 0.05, heatRate = 0 }
   */
  'detection-while-cold': (rng, p) => {
    const n = Math.max(0, Math.round(num(p, 'n', 12)))
    const base = num(p, 'p', 0.05)
    const heat = num(p, 'heatRate', 0)
    let hits = 0
    for (let i = 0; i < n; i++) if (rng.bool(Math.min(1, Math.max(0, base + heat * i)))) hits++
    return hits
  },

  /** Pings until first detection (geometric with optional heat ramp; capped at maxPings). params: { p, heatRate = 0, maxPings = 1000 } */
  'pings-until-detected': (rng, p) => {
    const base = num(p, 'p', 0.05)
    const heat = num(p, 'heatRate', 0)
    const cap = Math.max(1, Math.round(num(p, 'maxPings', 1000)))
    for (let i = 1; i <= cap; i++) if (rng.bool(Math.min(1, Math.max(0, base + heat * (i - 1))))) return i
    return cap
  },

  /**
   * χ² statistic under H₀ for a goodness-of-fit sample of size n from `probs`
   * (params: { probs, n }) or for an r×c table under independence (params: { rowProbs, colProbs, n }).
   */
  'chi2-under-h0': (rng, p) => {
    const n = Math.max(1, Math.round(num(p, 'n', 100)))
    const rowProbs = arr(p, 'rowProbs')
    const colProbs = arr(p, 'colProbs')
    if (rowProbs && colProbs) {
      const r = rowProbs.length
      const c = colProbs.length
      const table = Array.from({ length: r }, () => new Array<number>(c).fill(0))
      for (let i = 0; i < n; i++) table[rng.weightedIndex(rowProbs)][rng.weightedIndex(colProbs)]++
      const rt = table.map((row) => row.reduce((a, b) => a + b, 0))
      const ct = new Array<number>(c).fill(0)
      for (const row of table) for (let j = 0; j < c; j++) ct[j] += row[j]
      let stat = 0
      for (let i = 0; i < r; i++)
        for (let j = 0; j < c; j++) {
          const e = (rt[i] * ct[j]) / n
          if (e > 0) stat += ((table[i][j] - e) * (table[i][j] - e)) / e
        }
      return stat
    }
    const probs = arr(p, 'probs') ?? [0.25, 0.25, 0.25, 0.25]
    const tot = probs.reduce((a, b) => a + b, 0)
    const counts = new Array<number>(probs.length).fill(0)
    for (let i = 0; i < n; i++) counts[rng.weightedIndex(probs)]++
    let stat = 0
    for (let k = 0; k < probs.length; k++) {
      const e = (n * probs[k]) / tot
      stat += ((counts[k] - e) * (counts[k] - e)) / e
    }
    return stat
  },

  /** t statistic of a sample mean under H₀ (for "t vs normal" visuals). params: { parent, n, mu0 = parent mean } */
  't-under-h0': (rng, p) => {
    const xs = drawSample(rng, { ...p, n: Math.max(2, num(p, 'n', 10)) })
    const mu0 = num(p, 'mu0', parentMean(p))
    return (mean(xs) - mu0) / (sd(xs) / Math.sqrt(xs.length))
  },

  /** z statistic of a sample proportion under H₀. params: { n, p } */
  'z-under-h0': (rng, p) => {
    const n = Math.max(1, Math.round(num(p, 'n', 50)))
    const pr = num(p, 'p', 0.5)
    return (rng.binomial(n, pr) / n - pr) / Math.sqrt((pr * (1 - pr)) / n)
  },
}

export function registerTask(name: string, task: SimTask) {
  tasks[name] = task
}

export function hasTask(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(tasks, name)
}
