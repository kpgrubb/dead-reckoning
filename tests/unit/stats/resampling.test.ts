import { describe, it, expect } from 'vitest'
import { Rng } from '@/lib/rng'
import {
  bootstrap, bootstrapMean, bootstrapMedian, bootstrapSd, bootstrapProportion, bootstrapDifferenceInMeans, bootstrapDifferenceInProportions, bootstrapSlope,
  permutationTest, permutationTestProportions, permutationPValue, simulatedPValue, mean, sd, linearRegression, twoMeanTest, oneMeanInterval,
} from '@/lib/stats'

const A = [31.2, 29.8, 33.5, 30.9, 32.4, 28.7, 31.8, 30.1, 32.9, 29.5, 31.0, 30.6]
const B = [27.4, 28.9, 26.5, 29.8, 27.9, 28.2, 26.1, 29.0, 27.7, 28.4]

describe('bootstrap', () => {
  it('is seeded and reproducible; returns stats array of length reps', () => {
    const r1 = bootstrapMean(A, { rng: new Rng('boot'), reps: 500 })
    const r2 = bootstrapMean(A, { rng: new Rng('boot'), reps: 500 })
    expect(r1.stats).toEqual(r2.stats)
    expect(r1.stats).toHaveLength(500)
    expect(r1.reps).toBe(500)
    expect(r1.estimate).toBeCloseTo(mean(A), 14)
    expect(r1.confidence).toBe(0.95)
  })

  it('percentile CI brackets the estimate and is close to the t-interval for a well-behaved sample', () => {
    const r = bootstrapMean(A, { rng: new Rng(1), reps: 4000 })
    expect(r.ci[0]).toBeLessThan(r.estimate)
    expect(r.ci[1]).toBeGreaterThan(r.estimate)
    const t = oneMeanInterval(A)
    expect(Math.abs(r.ci[0] - t.ci![0])).toBeLessThan(0.4)
    expect(Math.abs(r.ci[1] - t.ci![1])).toBeLessThan(0.4)
    expect(Math.abs(r.se - sd(A) / Math.sqrt(A.length))).toBeLessThan(0.1)
  })

  it('other statistics', () => {
    expect(bootstrapMedian(A, { rng: new Rng(2), reps: 200 }).stats).toHaveLength(200)
    expect(bootstrapSd(A, { rng: new Rng(3), reps: 200 }).estimate).toBeCloseTo(sd(A), 14)
    const p = bootstrapProportion(56, 200, { rng: new Rng(4), reps: 2000 })
    expect(p.estimate).toBeCloseTo(0.28, 14)
    expect(Math.abs(p.se - Math.sqrt((0.28 * 0.72) / 200))).toBeLessThan(0.006)
    const d = bootstrapDifferenceInMeans(A, B, { rng: new Rng(5), reps: 1000 })
    expect(d.estimate).toBeCloseTo(mean(A) - mean(B), 14)
    expect(d.ci[0]).toBeGreaterThan(0)
    const dp = bootstrapDifferenceInProportions({ x1: 48, n1: 160, x2: 30, n2: 150 }, { rng: new Rng(6), reps: 500 })
    expect(dp.estimate).toBeCloseTo(48 / 160 - 30 / 150, 14)
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const ys = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1, 18.0, 20.2]
    const s = bootstrapSlope(xs, ys, { rng: new Rng(7), reps: 1000 })
    expect(s.estimate).toBeCloseTo(linearRegression(xs, ys).slope, 14)
    expect(s.ci[0]).toBeLessThan(2)
    expect(s.ci[1]).toBeGreaterThan(2)
    const custom = bootstrap(A, (v) => Math.max(...v), { rng: new Rng(8), reps: 100, confidence: 0.9 })
    expect(custom.estimate).toBe(33.5)
    expect(custom.confidence).toBe(0.9)
    expect(() => bootstrap([], mean, { rng: new Rng(9) })).toThrow()
  })
})

describe('permutation tests', () => {
  it('difference in means: observed, distribution centred at 0, p-value agrees with the t-test in size', () => {
    const r = permutationTest(A, B, { rng: new Rng('perm'), reps: 4000 })
    expect(r.observed).toBeCloseTo(mean(A) - mean(B), 14)
    expect(r.stats).toHaveLength(4000)
    expect(Math.abs(mean(r.stats))).toBeLessThan(0.1)
    expect(r.pValue).toBeLessThan(0.01)
    expect(twoMeanTest(A, B).pValue!).toBeLessThan(0.01)
    expect(r.alternative).toBe('two-sided')
  })

  it('no real difference → p-value large; one-sided alternatives', () => {
    const rng = new Rng(11)
    const a = Array.from({ length: 20 }, () => rng.normal(0, 1))
    const b = Array.from({ length: 20 }, () => rng.normal(0, 1))
    const r = permutationTest(a, b, { rng: new Rng(12), reps: 2000 })
    expect(r.pValue).toBeGreaterThan(0.05)
    const g = permutationTest(A, B, { rng: new Rng(13), reps: 1000, alt: 'greater' })
    const l = permutationTest(A, B, { rng: new Rng(13), reps: 1000, alt: 'less' })
    expect(g.pValue).toBeLessThan(0.01)
    expect(l.pValue).toBeGreaterThan(0.99)
    expect(g.pValue + l.pValue).toBeGreaterThanOrEqual(1) // ties counted in both tails
  })

  it('statistics: median-diff, custom, proportions', () => {
    const m = permutationTest(A, B, { rng: new Rng(14), reps: 300, statistic: 'median-diff' })
    expect(m.observed).toBeCloseTo(30.95 - 28.05, 12)
    const c = permutationTest(A, B, { rng: new Rng(15), reps: 300, statistic: (x, y) => sd(x) - sd(y) })
    expect(c.observed).toBeCloseTo(sd(A) - sd(B), 14)
    const p = permutationTestProportions({ x1: 48, n1: 160, x2: 30, n2: 150 }, { rng: new Rng(16), reps: 2000 })
    expect(p.observed).toBeCloseTo(48 / 160 - 30 / 150, 14)
    expect(p.pValue).toBeGreaterThan(0.005)
    expect(p.pValue).toBeLessThan(0.15)
  })

  it('permutationPValue conventions (count/reps, ≥ observed, tolerance on ties)', () => {
    // 2 + 1e-14 is a floating-point tie (within 1e-12·(1 + |obs|)); 2.001 is not.
    const stats = [-2, -1, 0, 1, 2, 2 + 1e-14, 2.001]
    expect(permutationPValue(stats, 2, 'greater')).toBeCloseTo(3 / 7, 14)
    expect(permutationPValue(stats, 2, 'less')).toBeCloseTo(6 / 7, 14)
    expect(permutationPValue(stats, 2, 'two-sided')).toBeCloseTo(4 / 7, 14)
    expect(permutationPValue(stats, 5)).toBe(0)
  })

  it('simulatedPValue: one-sample simulation under H0', () => {
    // H0: p = 0.5, n = 20; observed 15 successes
    const r = simulatedPValue((rng) => rng.binomial(20, 0.5), 15, { rng: new Rng(17), reps: 5000, alt: 'greater' })
    expect(r.pValue).toBeGreaterThan(0.01)
    expect(r.pValue).toBeLessThan(0.04) // exact: 0.0207
    expect(r.stats).toHaveLength(5000)
  })
})
