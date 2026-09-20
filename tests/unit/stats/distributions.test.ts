import { describe, it, expect } from 'vitest'
import { Rng } from '@/lib/rng'
import { normal, t, chi2, f, binomial, geometric, poisson, uniform, exponential } from '@/lib/stats'
import fixtures from '../../fixtures/distributions.json'
import { fx, close, label } from './helpers'

type Row = Record<string, unknown>
const has = (r: Row, k: string) => r[k] !== undefined

describe('distributions.json fixtures (SciPy 1.18)', () => {
  it(`normal: pdf/cdf/sf rel 1e-12, ppf rel 1e-12 (${fixtures.normal.length} rows)`, () => {
    for (const r of fixtures.normal as Row[]) {
      const mu = r.mu as number
      const s = r.sigma as number
      if (has(r, 'x')) {
        const x = r.x as number
        close(normal.pdf(x, mu, s), fx(r.pdf), 1e-12, 1e-300, label({ d: 'normal.pdf', x, mu, s }))
        close(normal.cdf(x, mu, s), fx(r.cdf), 1e-12, 1e-300, label({ d: 'normal.cdf', x, mu, s }))
        close(normal.sf(x, mu, s), fx(r.sf), 1e-12, 1e-300, label({ d: 'normal.sf', x, mu, s }))
      } else {
        close(normal.quantile(r.p as number, mu, s), fx(r.ppf), 1e-12, 1e-13 * s, label({ d: 'normal.ppf', p: r.p, mu, s }))
      }
    }
  })

  it(`t: pdf/cdf/sf rel 1e-11 (1e-9 for df ≥ 1e5), ppf rel 1e-10 (${fixtures.t.length} rows)`, () => {
    for (const r of fixtures.t as Row[]) {
      const df = r.df as number
      // For df ≥ 1e5 the incomplete-beta continued fraction evaluates near x = 1 and loses ~ε/(1 − x)
      // (≈2e-11 at df = 1e6); far beyond any AP need, so those rows are held to 1e-9.
      const rel = df >= 1e5 ? 1e-9 : 1e-11
      if (has(r, 'x')) {
        const x = r.x as number
        close(t.pdf(x, df), fx(r.pdf), rel, 1e-300, label({ d: 't.pdf', x, df }))
        close(t.cdf(x, df), fx(r.cdf), rel, 1e-300, label({ d: 't.cdf', x, df }))
        close(t.sf(x, df), fx(r.sf), rel, 1e-300, label({ d: 't.sf', x, df }))
      } else {
        close(t.quantile(r.p as number, df), fx(r.ppf), Math.max(rel, 1e-10), 1e-12, label({ d: 't.ppf', p: r.p, df }))
      }
    }
  })

  it(`chi2: pdf/cdf/sf rel 1e-11, ppf/isf rel 1e-10 (${fixtures.chi2.length} rows)`, () => {
    for (const r of fixtures.chi2 as Row[]) {
      const df = r.df as number
      if (has(r, 'x')) {
        const x = r.x as number
        close(chi2.pdf(x, df), fx(r.pdf), 1e-11, 1e-300, label({ d: 'chi2.pdf', x, df }))
        close(chi2.cdf(x, df), fx(r.cdf), 1e-11, 1e-300, label({ d: 'chi2.cdf', x, df }))
        close(chi2.sf(x, df), fx(r.sf), 1e-11, 1e-300, label({ d: 'chi2.sf', x, df }))
      } else {
        close(chi2.quantile(r.p as number, df), fx(r.ppf), 1e-10, 1e-12, label({ d: 'chi2.ppf', p: r.p, df }))
        close(chi2.isf(r.p as number, df), fx(r.isf), 1e-10, 1e-12, label({ d: 'chi2.isf', p: r.p, df }))
      }
    }
  })

  it(`F: pdf/cdf/sf rel 1e-10, ppf rel 1e-9 (${fixtures.f.length} rows)`, () => {
    for (const r of fixtures.f as Row[]) {
      const d1 = r.d1 as number
      const d2 = r.d2 as number
      if (has(r, 'x')) {
        const x = r.x as number
        close(f.pdf(x, d1, d2), fx(r.pdf), 1e-10, 1e-300, label({ d: 'f.pdf', x, d1, d2 }))
        close(f.cdf(x, d1, d2), fx(r.cdf), 1e-10, 1e-300, label({ d: 'f.cdf', x, d1, d2 }))
        close(f.sf(x, d1, d2), fx(r.sf), 1e-10, 1e-300, label({ d: 'f.sf', x, d1, d2 }))
      } else {
        close(f.quantile(r.p as number, d1, d2), fx(r.ppf), 1e-9, 1e-12, label({ d: 'f.ppf', p: r.p, d1, d2 }))
      }
    }
  })

  it(`binomial: pmf/cdf/sf rel 1e-11, ppf exact (${fixtures.binomial.length} rows)`, () => {
    for (const r of fixtures.binomial as Row[]) {
      const n = r.n as number
      const p = r.p as number
      if (has(r, 'k')) {
        const k = r.k as number
        close(binomial.pmf(k, n, p), fx(r.pmf), 1e-11, 1e-300, label({ d: 'binom.pmf', k, n, p }))
        close(binomial.cdf(k, n, p), fx(r.cdf), 1e-11, 1e-300, label({ d: 'binom.cdf', k, n, p }))
        close(binomial.sf(k, n, p), fx(r.sf), 1e-11, 1e-300, label({ d: 'binom.sf', k, n, p }))
      } else {
        expect(binomial.quantile(r.q as number, n, p), label({ d: 'binom.ppf', q: r.q, n, p })).toBe(fx(r.ppf))
      }
    }
  })

  it(`geometric: pmf/cdf/sf rel 1e-12, ppf exact (${fixtures.geometric.length} rows)`, () => {
    for (const r of fixtures.geometric as Row[]) {
      const p = r.p as number
      if (has(r, 'k')) {
        const k = r.k as number
        close(geometric.pmf(k, p), fx(r.pmf), 1e-12, 1e-300, label({ d: 'geom.pmf', k, p }))
        close(geometric.cdf(k, p), fx(r.cdf), 1e-12, 1e-300, label({ d: 'geom.cdf', k, p }))
        close(geometric.sf(k, p), fx(r.sf), 1e-12, 1e-300, label({ d: 'geom.sf', k, p }))
      } else {
        expect(geometric.quantile(r.q as number, p), label({ d: 'geom.ppf', q: r.q, p })).toBe(fx(r.ppf))
      }
    }
  })

  it(`poisson: pmf/cdf/sf rel 1e-11, ppf exact (${fixtures.poisson.length} rows)`, () => {
    for (const r of fixtures.poisson as Row[]) {
      const lam = r.lambda as number
      if (has(r, 'k')) {
        const k = r.k as number
        close(poisson.pmf(k, lam), fx(r.pmf), 1e-11, 1e-300, label({ d: 'pois.pmf', k, lam }))
        close(poisson.cdf(k, lam), fx(r.cdf), 1e-11, 1e-300, label({ d: 'pois.cdf', k, lam }))
        close(poisson.sf(k, lam), fx(r.sf), 1e-11, 1e-300, label({ d: 'pois.sf', k, lam }))
      } else {
        expect(poisson.quantile(r.q as number, lam), label({ d: 'pois.ppf', q: r.q, lam })).toBe(fx(r.ppf))
      }
    }
  })

  it(`uniform and exponential (${fixtures.uniform.length + fixtures.exponential.length} rows)`, () => {
    for (const r of fixtures.uniform as Row[]) {
      const a = r.a as number
      const b = r.b as number
      if (has(r, 'x')) {
        close(uniform.pdf(r.x as number, a, b), fx(r.pdf), 1e-14, 0)
        close(uniform.cdf(r.x as number, a, b), fx(r.cdf), 1e-14, 0)
      } else close(uniform.quantile(r.q as number, a, b), fx(r.ppf), 1e-14, 1e-15)
    }
    for (const r of fixtures.exponential as Row[]) {
      const rate = r.rate as number
      if (has(r, 'x')) {
        close(exponential.pdf(r.x as number, rate), fx(r.pdf), 1e-13, 0)
        close(exponential.cdf(r.x as number, rate), fx(r.cdf), 1e-13, 0)
        close(exponential.sf(r.x as number, rate), fx(r.sf), 1e-13, 0)
      } else close(exponential.quantile(r.q as number, rate), fx(r.ppf), 1e-13, 1e-15)
    }
  })
})

describe('distribution properties', () => {
  it('cdf is monotone and quantile∘cdf ≈ identity (continuous)', () => {
    const grid = [-6, -3, -1.5, -0.7, -0.1, 0.05, 0.4, 1.2, 2.5, 4, 8]
    let prev = -1
    for (const x of grid) {
      const c = normal.cdf(x)
      expect(c).toBeGreaterThanOrEqual(prev)
      prev = c
      // Round-trip through the tail that keeps precision (cdf for x ≤ 0, sf for x > 0).
      if (x <= 0) expect(normal.quantile(c)).toBeCloseTo(x, 9)
      else expect(normal.isf(normal.sf(x))).toBeCloseTo(x, 9)
      expect(t.quantile(t.cdf(x, 7), 7)).toBeCloseTo(x, 9)
      expect(t.quantile(t.cdf(x, 1), 1)).toBeCloseTo(x, 8)
      expect(t.quantile(t.cdf(x, 2), 2)).toBeCloseTo(x, 9)
      expect(t.quantile(t.cdf(x, 0.5), 0.5)).toBeCloseTo(x, 8)
    }
    for (const x of [0.01, 0.3, 1, 2.2, 5, 9.5, 20, 60]) {
      // Round-trip through whichever tail is smaller (cdf near 1 cannot hold a 1e-14 tail).
      for (const df of [1, 2, 3.5, 10, 50]) {
        const c = chi2.cdf(x, df)
        if (c <= 0.5) expect(chi2.quantile(c, df)).toBeCloseTo(x, 8)
        else expect(chi2.isf(chi2.sf(x, df), df)).toBeCloseTo(x, 8)
      }
      if (f.cdf(x, 3, 12) <= 0.5) expect(f.quantile(f.cdf(x, 3, 12), 3, 12)).toBeCloseTo(x, 7)
      else expect(f.quantile(1 - f.sf(x, 3, 12), 3, 12)).toBeCloseTo(x, 4)
      if (exponential.cdf(x, 0.7) <= 0.5) expect(exponential.quantile(exponential.cdf(x, 0.7), 0.7)).toBeCloseTo(x, 10)
    }
    for (const p of [1e-12, 1e-8, 1e-4, 0.01, 0.2, 0.5, 0.8, 0.99, 1 - 1e-8]) {
      expect(normal.cdf(normal.quantile(p))).toBeCloseTo(p, 14)
      for (const df of [1, 2, 3, 4.5, 30, 200]) close(t.cdf(t.quantile(p, df), df), p, 1e-9, 1e-15, `t df=${df} p=${p}`)
      for (const df of [1, 2, 7, 100]) close(chi2.cdf(chi2.quantile(p, df), df), p, 1e-9, 1e-15, `chi2 df=${df} p=${p}`)
    }
  })

  it('pmf sums to 1; cdf = running sum; sf = 1 − cdf; quantile is the smallest k with cdf ≥ q', () => {
    for (const [n, p] of [
      [0, 0.3],
      [1, 0.5],
      [7, 0.2],
      [25, 0.65],
      [60, 0.5],
      [10, 0],
      [10, 1],
    ] as const) {
      let s = 0
      for (let k = 0; k <= n; k++) {
        s += binomial.pmf(k, n, p)
        expect(binomial.cdf(k, n, p)).toBeCloseTo(s, 12)
        expect(binomial.sf(k, n, p)).toBeCloseTo(1 - s, 12)
      }
      expect(s).toBeCloseTo(1, 12)
      if (p > 0 && p < 1)
        for (const q of [0.05, 0.33, 0.5, 0.77, 0.999]) {
          const k = binomial.quantile(q, n, p)
          expect(binomial.cdf(k, n, p)).toBeGreaterThanOrEqual(q - 1e-12)
          if (k > 0) expect(binomial.cdf(k - 1, n, p)).toBeLessThan(q)
        }
      expect(binomial.between(0, n, n, p)).toBeCloseTo(1, 12)
      expect(binomial.atLeast(0, n, p)).toBe(1)
    }
    for (const p of [0.05, 0.3, 0.9, 1]) {
      let s = 0
      for (let k = 1; k <= 400; k++) {
        s += geometric.pmf(k, p)
        expect(geometric.cdf(k, p)).toBeCloseTo(s, 12)
      }
      expect(s).toBeCloseTo(1, 8)
      for (const q of [0.05, 0.5, 0.9, 0.999]) {
        const k = geometric.quantile(q, p)
        expect(geometric.cdf(k, p)).toBeGreaterThanOrEqual(q - 1e-12)
        if (k > 1) expect(geometric.cdf(k - 1, p)).toBeLessThan(q)
      }
    }
    for (const lam of [0.5, 3.5, 40]) {
      let s = 0
      for (let k = 0; k <= 200; k++) {
        s += poisson.pmf(k, lam)
        expect(poisson.cdf(k, lam)).toBeCloseTo(s, 11)
      }
      expect(s).toBeCloseTo(1, 10)
    }
  })

  it('moments are consistent and non-negative', () => {
    expect(normal.mean(3, 2)).toBe(3)
    expect(normal.variance(3, 2)).toBe(4)
    expect(normal.sd(3, 2)).toBe(2)
    expect(t.mean(5)).toBe(0)
    expect(t.variance(5)).toBeCloseTo(5 / 3, 15)
    expect(t.variance(1.5)).toBe(Infinity)
    expect(Number.isNaN(t.mean(1))).toBe(true)
    expect(chi2.mean(4)).toBe(4)
    expect(chi2.variance(4)).toBe(8)
    expect(binomial.mean(10, 0.3)).toBeCloseTo(3, 15)
    expect(binomial.variance(10, 0.3)).toBeCloseTo(2.1, 15)
    expect(binomial.variance(10, 0)).toBe(0)
    expect(geometric.mean(0.2)).toBe(5)
    expect(geometric.sd(0.2)).toBeCloseTo(Math.sqrt(20), 14)
    expect(poisson.variance(2.5)).toBe(2.5)
    expect(uniform.mean(2, 8)).toBe(5)
    expect(uniform.variance(2, 8)).toBe(3)
    expect(exponential.mean(0.5)).toBe(2)
    expect(f.mean(3, 10)).toBe(1.25)
    for (const v of [t.variance(3), chi2.variance(2), binomial.variance(5, 0.5), geometric.variance(0.9), f.variance(5, 10)]) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('edge cases: p = 0/1, boundaries, extreme z, n = 0 binomial, df = 1 t, large df → normal', () => {
    expect(normal.quantile(0)).toBe(-Infinity)
    expect(normal.quantile(1)).toBe(Infinity)
    expect(normal.quantile(0.5)).toBe(0)
    expect(Number.isNaN(normal.quantile(1.2))).toBe(true)
    expect(normal.cdf(40)).toBe(1)
    expect(normal.cdf(-40)).toBe(0)
    expect(normal.sf(-40)).toBe(1)
    expect(normal.sf(40)).toBe(0)
    expect(normal.cdf(Infinity)).toBe(1)
    expect(normal.cdf(-Infinity)).toBe(0)
    expect(normal.between(-1, 1)).toBeCloseTo(0.6826894921370859, 14)
    expect(normal.between(-2, 2)).toBeCloseTo(0.9544997361036416, 14)
    expect(normal.between(-3, 3)).toBeCloseTo(0.9973002039367398, 14)
    expect(normal.between(2, 1)).toBe(0)
    expect(t.cdf(0, 1)).toBe(0.5)
    expect(t.cdf(1, 1)).toBeCloseTo(0.75, 15)
    expect(t.quantile(0.75, 1)).toBeCloseTo(1, 14)
    expect(t.cdf(1.5, Infinity)).toBe(normal.cdf(1.5))
    expect(t.quantile(0.9, 1e9)).toBe(normal.quantile(0.9))
    expect(t.quantile(0, 5)).toBe(-Infinity)
    expect(t.quantile(1, 5)).toBe(Infinity)
    expect(chi2.quantile(0, 3)).toBe(0)
    expect(chi2.quantile(1, 3)).toBe(Infinity)
    expect(chi2.cdf(0, 3)).toBe(0)
    expect(chi2.sf(0, 3)).toBe(1)
    expect(chi2.pdf(0, 1)).toBe(Infinity)
    expect(chi2.pdf(0, 2)).toBe(0.5)
    expect(chi2.pdf(0, 3)).toBe(0)
    expect(binomial.pmf(0, 0, 0.3)).toBe(1)
    expect(binomial.cdf(0, 0, 0.3)).toBe(1)
    expect(binomial.quantile(0.5, 0, 0.3)).toBe(0)
    expect(binomial.pmf(-1, 5, 0.5)).toBe(0)
    expect(binomial.pmf(2.5, 5, 0.5)).toBe(0)
    expect(binomial.cdf(-1, 5, 0.5)).toBe(0)
    expect(binomial.cdf(5, 5, 0.5)).toBe(1)
    expect(binomial.quantile(0, 5, 0.5)).toBe(0)
    expect(binomial.quantile(1, 5, 0.5)).toBe(5)
    expect(() => binomial.pmf(1, -1, 0.5)).toThrow()
    expect(() => binomial.pmf(1, 3, 1.5)).toThrow()
    expect(geometric.pmf(0, 0.3)).toBe(0)
    expect(geometric.cdf(0, 0.3)).toBe(0)
    expect(geometric.pmf(1, 1)).toBe(1)
    expect(geometric.quantile(1, 0.3)).toBe(Infinity)
    expect(geometric.quantile(0, 0.3)).toBe(1)
    expect(() => geometric.pmf(1, 0)).toThrow()
    expect(poisson.pmf(0, 0)).toBe(1)
    expect(poisson.cdf(3, 0)).toBe(1)
    expect(() => normal.cdf(1, 0, 0)).toThrow()
    expect(() => t.cdf(1, 0)).toThrow()
    expect(() => chi2.cdf(1, -1)).toThrow()
  })

  it('samples are seeded, reproducible and have the right moments', () => {
    const a = normal.sample(new Rng(7), 5, 10, 2)
    const b = normal.sample(new Rng(7), 5, 10, 2)
    expect(a).toEqual(b)
    const n = 20000
    const check = (xs: number[], mu: number, sdv: number, tol: number) => {
      const m = xs.reduce((s, x) => s + x, 0) / xs.length
      const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1)
      expect(Math.abs(m - mu)).toBeLessThan(tol)
      expect(Math.abs(Math.sqrt(v) - sdv)).toBeLessThan(tol * 2)
    }
    check(t.sample(new Rng(1), n, 12), 0, Math.sqrt(12 / 10), 0.04)
    check(chi2.sample(new Rng(2), n, 4), 4, Math.sqrt(8), 0.1)
    check(chi2.sample(new Rng(3), n, 2.5), 2.5, Math.sqrt(5), 0.1)
    check(binomial.sample(new Rng(4), n, 20, 0.3), 6, Math.sqrt(4.2), 0.06)
    check(geometric.sample(new Rng(5), n, 0.25), 4, Math.sqrt(12), 0.12)
    check(poisson.sample(new Rng(6), n, 3), 3, Math.sqrt(3), 0.06)
    check(uniform.sample(new Rng(8), n, 2, 8), 5, Math.sqrt(3), 0.05)
    check(exponential.sample(new Rng(9), n, 0.5), 2, 2, 0.06)
    check(f.sample(new Rng(10), n, 10, 30), 30 / 28, Math.sqrt(f.variance(10, 30)), 0.05)
  })

  it('tables list the full support', () => {
    const tb = binomial.table(4, 0.5)
    expect(tb.map((r) => r.k)).toEqual([0, 1, 2, 3, 4])
    expect(tb.reduce((s, r) => s + r.p, 0)).toBeCloseTo(1, 14)
    expect(geometric.table(0.5, 3).map((r) => r.p)).toEqual([0.5, 0.25, 0.125])
  })
})
