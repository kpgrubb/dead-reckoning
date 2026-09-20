import { describe, it, expect } from 'vitest'
import {
  mean, median, variance, sd, popVariance, popSd, min, max, range, quartiles, iqr, fiveNumber, outliers, zScore, percentileRank,
  percentile, skewness, modes, weightedMean, meanAbsoluteDeviation, standardize, frequencyTable, countBy, cumulativeRelativeFrequency,
  bins, linearTransformSummary, linearTransform, describe as describeData, sumSquaredDeviations, sum, sorted,
} from '@/lib/stats'
import fixtures from '../../fixtures/descriptive.json'
import { fx, close, label } from './helpers'

describe('descriptive.json fixtures (NumPy/SciPy)', () => {
  for (const d of fixtures.datasets) {
    it(`${d.name} (n = ${d.data.length})`, () => {
      const xs = d.data
      close(mean(xs), fx(d.mean), 1e-14, 1e-14, 'mean')
      close(median(xs), fx(d.median), 1e-14, 1e-14, 'median')
      if (d.var !== null) {
        close(variance(xs), fx(d.var), 1e-13, 1e-14, 'variance')
        close(sd(xs), fx(d.sd), 1e-13, 1e-14, 'sd')
      }
      close(popVariance(xs), fx(d.popVar), 1e-13, 1e-14, 'popVariance')
      close(popSd(xs), fx(d.popSd), 1e-13, 1e-14, 'popSd')
      expect(min(xs)).toBe(fx(d.min))
      expect(max(xs)).toBe(fx(d.max))
      expect(range(xs)).toBe(fx(d.max) - fx(d.min))
      const q = quartiles(xs)
      close(q.q1, fx(d.q1), 1e-14, 1e-14, 'q1 (TI-84 rule)')
      close(q.q3, fx(d.q3), 1e-14, 1e-14, 'q3 (TI-84 rule)')
      close(iqr(xs), fx(d.iqr), 1e-13, 1e-13, 'iqr')
      if (d.skew !== null) close(skewness(xs), fx(d.skew), 1e-12, 1e-13, 'skewness (G1)')
      for (const [p, v] of Object.entries(d.percentiles)) close(percentile(xs, Number(p)), fx(v), 1e-13, 1e-13, label({ percentile: p }))
      if (d.zscores) d.zscores.forEach((z, i) => close(standardize(xs)[i], fx(z), 1e-12, 1e-13, `z[${i}]`))
    })
  }

  it('weighted mean', () => {
    close(weightedMean(fixtures.weighted.values, fixtures.weighted.weights), fx(fixtures.weighted.mean), 1e-14)
  })

  it('histogram bins match np.histogram (sturges and fixed count)', () => {
    for (const h of fixtures.histograms) {
      const xs = fixtures.datasets.find((d) => d.name === h.name)!.data
      const b = bins(xs, h.method === 'sturges' ? { method: 'sturges' } : { method: 'count', count: 5 })
      expect(b.bins.map((x) => x.count), label({ name: h.name, method: h.method })).toEqual(h.counts)
      b.edges.forEach((e, i) => close(e, fx(h.edges[i]), 1e-12, 1e-12, `edge ${i}`))
    }
  })
})

describe('descriptive: conventions and edge cases', () => {
  it('quartiles use the TI-84 / AP rule (exclude the median when n is odd)', () => {
    expect(quartiles([1, 2, 3, 4, 5])).toEqual({ q1: 1.5, q2: 3, q3: 4.5 })
    expect(quartiles([1, 2, 3, 4, 5, 6])).toEqual({ q1: 2, q2: 3.5, q3: 5 })
    expect(quartiles([5, 9])).toEqual({ q1: 5, q2: 7, q3: 9 })
    expect(fiveNumber([7, 1, 3, 9, 5])).toEqual({ min: 1, q1: 2, median: 5, q3: 8, max: 9 })
    expect(() => quartiles([1])).toThrow()
  })

  it('1.5×IQR outliers', () => {
    const o = outliers([1, 2, 3, 4, 5, 6, 7, 8, 30])
    expect(o.values).toEqual([30])
    // n = 9: lower half [1,2,3,4] → Q1 = 2.5; upper half [6,7,8,30] → Q3 = 7.5; IQR = 5
    expect(o.lowFence).toBeCloseTo(2.5 - 1.5 * 5, 12)
    expect(o.highFence).toBeCloseTo(7.5 + 1.5 * 5, 12)
  })

  it('percentile conventions', () => {
    const xs = [15, 20, 35, 40, 50]
    expect(percentile(xs, 40)).toBeCloseTo(29, 12) // linear (type 7): h = 1.6 → 20 + 0.6·15
    expect(percentile(xs, 40, 'nearest-rank')).toBe(20) // ceil(5·0.4) = 2nd value
    expect(percentile(xs, 0)).toBe(15)
    expect(percentile(xs, 100)).toBe(50)
    expect(percentile(xs, 100, 'nearest-rank')).toBe(50)
    expect(percentile(xs, 0, 'nearest-rank')).toBe(15)
    expect(percentileRank(xs, 35)).toBe(0.4)
    expect(percentileRank(xs, 35, true)).toBe(0.6)
    expect(() => percentile(xs, 101)).toThrow()
  })

  it('modes', () => {
    expect(modes([1, 2, 2, 3, 3, 3])).toEqual([3])
    expect(modes([1, 2, 2, 3, 3])).toEqual([2, 3])
    expect(modes([1, 2, 3])).toEqual([])
    expect(modes([])).toEqual([])
  })

  it('frequency tables and cumulative relative frequency', () => {
    const ft = frequencyTable([3, 1, 2, 3, 3, 2])
    expect(ft.map((r) => r.value)).toEqual([1, 2, 3])
    expect(ft.map((r) => r.count)).toEqual([1, 2, 3])
    expect(ft.map((r) => r.cumRelFreq)).toEqual([1 / 6, 3 / 6, 1])
    expect(cumulativeRelativeFrequency([3, 1, 2, 3, 3, 2]).at(-1)?.cumRelFreq).toBe(1)
    const cb = countBy(['lost', 'arrived', 'lost'], ['arrived', 'lost', 'unknown'])
    expect(cb.map((r) => r.count)).toEqual([1, 2, 0])
    expect(cb[2].cumRelFreq).toBe(1)
  })

  it('binning: right-open except the last bin; fixed width anchoring; constant data', () => {
    const b = bins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { method: 'count', count: 5 })
    expect(b.bins.map((x) => x.count)).toEqual([2, 2, 2, 2, 3])
    const w = bins([0.5, 1.5, 2.5, 4], { method: 'width', width: 2 })
    expect(w.edges).toEqual([0, 2, 4, 6])
    expect(w.bins.map((x) => x.count)).toEqual([2, 1, 1])
    const w2 = bins([1, 2, 3, 4], { method: 'width', width: 2, start: 0 })
    expect(w2.edges).toEqual([0, 2, 4, 6])
    expect(w2.bins.map((x) => x.count)).toEqual([1, 2, 1])
    const c = bins([5, 5, 5])
    expect(c.bins).toHaveLength(1)
    expect(c.bins[0].count).toBe(3)
    expect(() => bins([])).toThrow()
    expect(bins([1, 2, 3, 4, 5, 6, 7, 8]).bins).toHaveLength(4) // Sturges: ceil(log2 8) + 1
  })

  it('linear transformations', () => {
    const s = linearTransformSummary({ mean: 10, median: 9, sd: 2, variance: 4, iqr: 3, range: 8, min: 5, max: 13 }, -2, 1)
    expect(s).toEqual({ mean: -19, median: -17, sd: 4, variance: 16, iqr: 6, range: 16, min: -25, max: -9 })
    expect(linearTransform([1, 2], 1.8, 32)).toEqual([33.8, 35.6])
    const xs = [3, 5, 9, 12]
    const ys = linearTransform(xs, 2.5, -4)
    expect(mean(ys)).toBeCloseTo(2.5 * mean(xs) - 4, 12)
    expect(sd(ys)).toBeCloseTo(2.5 * sd(xs), 12)
  })

  it('describe / sums / misc', () => {
    const d = describeData([2, 4, 4, 4, 5, 5, 7, 9])
    expect(d.n).toBe(8)
    expect(d.mean).toBe(5)
    expect(d.sd).toBeCloseTo(Math.sqrt(32 / 7), 14)
    expect(d.q1).toBe(4)
    expect(d.q3).toBe(6)
    expect(d.iqr).toBe(2)
    expect(sumSquaredDeviations([2, 4, 4, 4, 5, 5, 7, 9])).toBe(32)
    expect(sum([1, 2, 3])).toBe(6)
    expect(sorted([3, 1, 2])).toEqual([1, 2, 3])
    expect(meanAbsoluteDeviation([1, 2, 3, 4])).toBe(1)
    expect(zScore(70, 65, 3.5)).toBeCloseTo(10 / 7, 14)
    expect(() => zScore(1, 0, 0)).toThrow()
    expect(() => mean([])).toThrow()
    expect(() => variance([1])).toThrow()
    expect(() => skewness([1, 2])).toThrow()
    expect(() => weightedMean([1, 2], [1])).toThrow()
  })
})
