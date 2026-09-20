import { describe, it, expect } from 'vitest'
import {
  discreteRV, expectedValue, rvVariance, rvSd, linearTransformRV, sumRV, differenceRV, combineRV, sumOfIid, meanOfIid, convolve, dieRV, diceSumRV,
  binomialRV, binomialMoments, geometricMoments, bernoulliMoments, checkProbabilities, probabilitiesValid, rvCdf, rvProb, twoWay, expectedCounts, conditional,
  maxConditionalDifference, rowTotals, colTotals, grandTotal, binomial,
} from '@/lib/stats'

describe('random variables', () => {
  it('discrete RV moments (AP textbook case)', () => {
    const X = discreteRV([0, 1, 2, 3], [0.1, 0.2, 0.3, 0.4])
    expect(X.mean).toBeCloseTo(2, 14)
    expect(X.variance).toBeCloseTo(1, 14)
    expect(X.sd).toBeCloseTo(1, 14)
    expect(expectedValue([0, 1, 2, 3], [0.1, 0.2, 0.3, 0.4])).toBeCloseTo(2, 14)
    expect(rvVariance([0, 1, 2, 3], [0.1, 0.2, 0.3, 0.4])).toBeCloseTo(1, 14)
    expect(rvSd([0, 1, 2, 3], [0.1, 0.2, 0.3, 0.4])).toBeCloseTo(1, 14)
    expect(rvCdf(X, 1)).toBeCloseTo(0.3, 14)
    expect(rvProb(X, (x) => x >= 2)).toBeCloseTo(0.7, 14)
  })

  it('merges duplicate values and sorts', () => {
    const X = discreteRV([2, 1, 2], [0.25, 0.5, 0.25])
    expect(X.values).toEqual([1, 2])
    expect(X.probs).toEqual([0.5, 0.5])
  })

  it('probability validation', () => {
    expect(() => discreteRV([1, 2], [0.5, 0.6])).toThrow()
    expect(() => discreteRV([1, 2], [0.5])).toThrow()
    expect(() => discreteRV([1, 2], [-0.5, 1.5])).toThrow()
    expect(checkProbabilities([0.3, 0.7])).toBeCloseTo(1, 15)
    expect(probabilitiesValid([0.1, 0.2, 0.3, 0.4])).toBe(true)
    expect(probabilitiesValid([0.1, 0.2])).toBe(false)
    expect(probabilitiesValid([1 / 3, 1 / 3, 1 / 3])).toBe(true)
  })

  it('linear transform aX + b: mean → aμ + b, sd → |a|σ', () => {
    const X = discreteRV([0, 1, 2], [0.5, 0.3, 0.2])
    const Y = linearTransformRV(X, -3, 10)
    expect(Y.mean).toBeCloseTo(-3 * 0.7 + 10, 14)
    expect(Y.sd).toBeCloseTo(3 * X.sd, 14)
    expect(Y.variance).toBeCloseTo(9 * X.variance, 14)
    expect('values' in Y && Y.values).toEqual([4, 7, 10])
    expect('probs' in Y && Y.probs).toEqual([0.2, 0.3, 0.5])
    const M = linearTransformRV({ mean: 5, variance: 4, sd: 2 }, 1.5, -1)
    expect(M).toEqual({ mean: 6.5, variance: 9, sd: 3 })
  })

  it('sums and differences of independent RVs: variances add', () => {
    const X = { mean: 10, variance: 4, sd: 2 }
    const Y = { mean: 3, variance: 9, sd: 3 }
    expect(sumRV(X, Y)).toEqual({ mean: 13, variance: 13, sd: Math.sqrt(13) })
    expect(differenceRV(X, Y)).toEqual({ mean: 7, variance: 13, sd: Math.sqrt(13) })
    expect(combineRV([X, Y], [2, -1])).toEqual({ mean: 17, variance: 25, sd: 5 })
    expect(sumOfIid(X, 4)).toEqual({ mean: 40, variance: 16, sd: 4 })
    expect(meanOfIid(X, 4)).toEqual({ mean: 10, variance: 1, sd: 1 })
    expect(() => combineRV([X], [1, 2])).toThrow()
  })

  it('convolution: two dice', () => {
    const S = convolve(dieRV(), dieRV())
    expect(S.values).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(S.probs[5]).toBeCloseTo(6 / 36, 14)
    expect(S.mean).toBeCloseTo(7, 14)
    expect(S.variance).toBeCloseTo(35 / 6, 14)
    const T = diceSumRV(3)
    expect(T.mean).toBeCloseTo(10.5, 14)
    expect(T.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 14)
    expect(T.probs[T.values.indexOf(10)]).toBeCloseTo(27 / 216, 14)
  })

  it('binomial / geometric / bernoulli moments agree with the distributions', () => {
    expect(binomialMoments(10, 0.3)).toEqual({ mean: binomial.mean(10, 0.3), variance: binomial.variance(10, 0.3), sd: binomial.sd(10, 0.3) })
    expect(binomialMoments(10, 0.3).sd).toBeCloseTo(Math.sqrt(2.1), 14)
    expect(geometricMoments(0.25)).toEqual({ mean: 4, variance: 12, sd: Math.sqrt(12) })
    const bern = bernoulliMoments(0.2)
    expect(bern.mean).toBe(0.2)
    expect(bern.variance).toBeCloseTo(0.16, 15)
    expect(bern.sd).toBeCloseTo(0.4, 15)
    const B = binomialRV(5, 0.5)
    expect(B.values).toEqual([0, 1, 2, 3, 4, 5])
    expect(B.mean).toBeCloseTo(2.5, 14)
    expect(B.variance).toBeCloseTo(1.25, 14)
  })
})

describe('two-way tables', () => {
  const table = [
    [35, 15, 10],
    [20, 30, 25],
  ]
  it('marginals, conditionals, joint, expected', () => {
    const tw = twoWay(table, { rows: ['Compact', 'Independent'], cols: ['Lost', 'Delayed', 'Arrived'] })
    expect(tw.rowTotals).toEqual([60, 75])
    expect(tw.colTotals).toEqual([55, 45, 35])
    expect(tw.total).toBe(135)
    expect(rowTotals(table)).toEqual([60, 75])
    expect(colTotals(table)).toEqual([55, 45, 35])
    expect(grandTotal(table)).toBe(135)
    expect(tw.marginalRows[0]).toBeCloseTo(60 / 135, 14)
    expect(tw.marginalCols[2]).toBeCloseTo(35 / 135, 14)
    expect(tw.joint[1][2]).toBeCloseTo(25 / 135, 14)
    expect(tw.rowConditional[0]).toEqual([35 / 60, 15 / 60, 10 / 60])
    expect(tw.colConditional[0]).toEqual([35 / 55, 20 / 55])
    expect(tw.rowConditional[0].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 14)
    expect(tw.expected[0][0]).toBeCloseTo((60 * 55) / 135, 14)
    expect(expectedCounts(table)[1][2]).toBeCloseTo((75 * 35) / 135, 14)
    expect(conditional(table, 'row', 1)).toEqual([20 / 75, 30 / 75, 25 / 75])
    expect(conditional(table, 'col', 1)).toEqual([15 / 45, 30 / 45])
    expect(tw.rows).toEqual(['Compact', 'Independent'])
    expect(maxConditionalDifference(table)).toBeCloseTo(35 / 60 - 20 / 75, 14)
    expect(maxConditionalDifference([[10, 10], [20, 20]])).toBeCloseTo(0, 14)
  })
  it('validation', () => {
    expect(() => twoWay([])).toThrow()
    expect(() => twoWay([[1, 2], [3]])).toThrow()
    expect(() => twoWay([[-1, 2]])).toThrow()
    expect(() => twoWay([[0, 0]])).toThrow()
  })
})
