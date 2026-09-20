/**
 * Seeded pseudo-random number generation.
 *
 * Every simulation, drill and checkpoint in DEAD RECKONING must be reproducible from a seed.
 * Never call Math.random() in simulation, instrument or problem code — take an `Rng`.
 *
 * Generator: mulberry32 (32-bit state, period ~2^32, plenty for classroom-scale simulation).
 * String seeds are hashed with a 53-bit cyrb53-style hash so `seedFrom('act-4-03', 2)` is stable.
 */

export type Seed = number | string

/** Hash any string to a 32-bit unsigned integer (cyrb53 reduced to the low 32 bits). */
export function hashString(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0) ^ (h1 >>> 0)
}

/** Combine several seed parts (learner seed, module id, drill index, attempt…) into one 32-bit seed. */
export function seedFrom(...parts: Seed[]): number {
  return hashString(parts.map(String).join('|')) >>> 0
}

/** Raw mulberry32 step function. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Rng {
  readonly seed: number
  private next: () => number
  private spareNormal: number | null = null

  constructor(seed: Seed = Date.now()) {
    this.seed = typeof seed === 'number' ? seed >>> 0 : seedFrom(seed)
    this.next = mulberry32(this.seed)
  }

  /** Derive an independent child generator (e.g. one per drill instance). */
  child(...parts: Seed[]): Rng {
    return new Rng(seedFrom(this.seed, ...parts))
  }

  /** Uniform float in [0, 1). */
  float(): number {
    return this.next()
  }

  /** Uniform float in [min, max). */
  uniform(min = 0, max = 1): number {
    return min + (max - min) * this.next()
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Bernoulli trial with success probability p. */
  bool(p = 0.5): boolean {
    return this.next() < p
  }

  /** Standard normal via Box–Muller (polar form), caching the spare deviate. */
  normal(mean = 0, sd = 1): number {
    if (this.spareNormal !== null) {
      const z = this.spareNormal
      this.spareNormal = null
      return mean + sd * z
    }
    let u: number, v: number, s: number
    do {
      u = 2 * this.next() - 1
      v = 2 * this.next() - 1
      s = u * u + v * v
    } while (s >= 1 || s === 0)
    const mul = Math.sqrt((-2 * Math.log(s)) / s)
    this.spareNormal = v * mul
    return mean + sd * u * mul
  }

  /** Exponential with given rate λ (mean 1/λ). */
  exponential(rate = 1): number {
    return -Math.log(1 - this.next()) / rate
  }

  /** Binomial(n, p) by direct simulation (n is small in every AP-scale use). */
  binomial(n: number, p: number): number {
    let k = 0
    for (let i = 0; i < n; i++) if (this.next() < p) k++
    return k
  }

  /** Geometric: number of trials up to and including the first success (support 1, 2, 3…). */
  geometric(p: number): number {
    let k = 1
    while (this.next() >= p) k++
    return k
  }

  /** Poisson(λ) via Knuth's method. */
  poisson(lambda: number): number {
    const L = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= this.next()
    } while (p > L)
    return k - 1
  }

  /** Pick one element uniformly. */
  choice<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)]
  }

  /** Pick an index according to weights (need not sum to 1). */
  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0)
    let r = this.next() * total
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]
      if (r < 0) return i
    }
    return weights.length - 1
  }

  /** Fisher–Yates shuffle (returns a new array). */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice()
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }

  /** Sample k distinct elements without replacement. */
  sample<T>(arr: readonly T[], k: number): T[] {
    if (k > arr.length) throw new RangeError(`sample: k=${k} exceeds population size ${arr.length}`)
    return this.shuffle(arr).slice(0, k)
  }

  /** Sample k elements with replacement (bootstrap resample). */
  resample<T>(arr: readonly T[], k = arr.length): T[] {
    const out = new Array<T>(k)
    for (let i = 0; i < k; i++) out[i] = arr[this.int(0, arr.length - 1)]
    return out
  }
}

/** Convenience: a generator seeded from parts. */
export function rng(...parts: Seed[]): Rng {
  return new Rng(seedFrom(...parts))
}
