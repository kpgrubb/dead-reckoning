import { describe, it, expect } from 'vitest'
import {
  onePropInterval, onePropTest, twoPropInterval, twoPropTest, oneMeanInterval, oneMeanTest, pairedTTest, pairedTInterval,
  twoMeanInterval, twoMeanTest, welchDf, conservativeDf, chiSquareGOF, chiSquareIndependence, chiSquareHomogeneity,
  slopeTest, slopeInterval, slopeTestFromComputerOutput, slopeIntervalFromOutput, powerZTestMean, powerZTestProportion, powerCurve,
  typeIIError, sampleSizeForProportion, sampleSizeForMean, zStar, tStar, chi2Star, zCritical, tCritical, pValueZ, pValueT, pValueChi2,
  reject, allConditionsMet, largeCountsCondition, successFailureCondition, tenPercentCondition, normalLargeSampleCondition, expectedCountsCondition,
  marginOfErrorProportion, marginOfErrorMean, samplingSdMean, samplingSdProportion, type Alternative,
} from '@/lib/stats'
import fixtures from '../../fixtures/inference.json'
import { fx, close } from './helpers'

const ALTS: Alternative[] = ['two-sided', 'less', 'greater']

describe('inference.json fixtures (SciPy 1.18 + AP formulas)', () => {
  it('critical values z*, t*, χ²', () => {
    for (const [c, v] of Object.entries(fixtures.critical.z)) close(zStar(Number(c)), fx(v), 1e-12, 0, `z* ${c}`)
    for (const r of fixtures.critical.t) close(tStar(r.confidence, r.df), fx(r.value), 1e-10, 0, `t* ${r.confidence} df=${r.df}`)
    for (const r of fixtures.critical.chi2) close(chi2Star(r.alpha, r.df), fx(r.value), 1e-10, 0, `χ²* α=${r.alpha} df=${r.df}`)
    expect(zStar(95)).toBe(zStar(0.95))
    expect(zCritical(0.05, 'greater')).toBeCloseTo(1.6448536269514722, 12)
    expect(zCritical(0.05)).toBeCloseTo(zStar(0.95), 14)
    expect(tCritical(0.05, 10, 'two-sided')).toBeCloseTo(tStar(0.95, 10), 14)
  })

  it('one-sample t (ttest_1samp, t.interval)', () => {
    for (const d of fixtures.oneSampleT) {
      for (const alt of ALTS) {
        const r = oneMeanTest(d.data, { mu0: d.mu0, alt })
        close(r.statistic, fx(d.tests[alt].t), 1e-12, 1e-13, `${d.name} t ${alt}`)
        close(r.pValue!, fx(d.tests[alt].p), 1e-10, 1e-14, `${d.name} p ${alt}`)
        expect(r.df).toBe(d.df)
        close(r.se, fx(d.se), 1e-12, 0)
      }
      const rs = oneMeanTest({ mean: fx(d.mean), sd: fx(d.sd), n: d.n }, { mu0: d.mu0 })
      close(rs.statistic, fx(d.tests['two-sided'].t), 1e-12, 1e-13, `${d.name} summary-stat form`)
      for (const [c, ci] of Object.entries(d.ci)) {
        const r = oneMeanInterval(d.data, { confidence: Number(c) })
        close(r.ci![0], fx(ci[0]), 1e-10, 1e-12, `${d.name} ci lo ${c}`)
        close(r.ci![1], fx(ci[1]), 1e-10, 1e-12, `${d.name} ci hi ${c}`)
        expect(r.marginOfError).toBeCloseTo((fx(ci[1]) - fx(ci[0])) / 2, 10)
      }
    }
  })

  it('paired t (ttest_rel) with d = first − second', () => {
    for (const d of fixtures.pairedT) {
      for (const alt of ALTS) {
        const r = pairedTTest(d.after, d.before, { alt })
        close(r.statistic, fx(d.tests[alt].t), 1e-12, 1e-13, `${d.name} t ${alt}`)
        close(r.pValue!, fx(d.tests[alt].p), 1e-10, 1e-14, `${d.name} p ${alt}`)
      }
      const ci = pairedTInterval(d.after, d.before)
      close(ci.ci![0], fx(d.ci95[0]), 1e-10, 1e-12)
      close(ci.ci![1], fx(d.ci95[1]), 1e-10, 1e-12)
      close(ci.estimate, fx(d.meanDiff), 1e-12, 1e-14)
      expect(ci.differences).toHaveLength(d.n)
    }
  })

  it('two-sample t: Welch (ttest_ind equal_var=False) and conservative df', () => {
    for (const d of fixtures.twoSampleT) {
      for (const alt of ALTS) {
        const r = twoMeanTest(d.a, d.b, { alt })
        close(r.statistic, fx(d.tests[alt].t), 1e-12, 1e-13, `${d.name} t ${alt}`)
        close(r.df!, fx(d.tests[alt].df), 1e-12, 1e-13, `${d.name} welch df`)
        close(r.pValue!, fx(d.tests[alt].p), 1e-10, 1e-14, `${d.name} p ${alt}`)
      }
      close(welchDf(fx(d.sd1), d.n1, fx(d.sd2), d.n2), fx(d.welchDf), 1e-12, 0)
      expect(conservativeDf(d.n1, d.n2)).toBe(d.conservativeDf)
      const ci = twoMeanInterval(d.a, d.b)
      close(ci.ci![0], fx(d.ci95Welch[0]), 1e-10, 1e-12, `${d.name} welch ci lo`)
      close(ci.ci![1], fx(d.ci95Welch[1]), 1e-10, 1e-12, `${d.name} welch ci hi`)
      const cc = twoMeanInterval(d.a, d.b, { dfMethod: 'conservative' })
      expect(cc.df).toBe(d.conservativeDf)
      close(cc.ci![0], fx(d.ci95Conservative[0]), 1e-10, 1e-12, `${d.name} cons ci lo`)
      close(cc.ci![1], fx(d.ci95Conservative[1]), 1e-10, 1e-12, `${d.name} cons ci hi`)
      const tc = twoMeanTest(d.a, d.b, { dfMethod: 'conservative' })
      close(tc.pValue!, fx(d.pTwoSidedConservative), 1e-10, 1e-14, `${d.name} cons p`)
      const summ = twoMeanTest({ mean: fx(d.mean1), sd: fx(d.sd1), n: d.n1 }, { mean: fx(d.mean2), sd: fx(d.sd2), n: d.n2 })
      close(summ.statistic, fx(d.tests['two-sided'].t), 1e-12, 1e-13, `${d.name} summary form`)
    }
  })

  it('one-proportion z (SE from p₀ for the test, p̂ for the interval)', () => {
    for (const d of fixtures.oneProp) {
      for (const alt of ALTS) {
        const r = onePropTest({ x: d.x, n: d.n, p0: d.p0, alt })
        close(r.statistic, fx(d.z), 1e-12, 1e-14, `z x=${d.x}`)
        close(r.se, fx(d.seTest), 1e-13, 0)
        close(r.pValue!, fx(d.tests[alt]), 1e-11, 1e-15, `p ${alt} x=${d.x}`)
        expect(r.estimate).toBeCloseTo(d.phat, 14)
      }
      for (const [c, ci] of Object.entries(d.ci)) {
        const r = onePropInterval({ x: d.x, n: d.n, confidence: Number(c) })
        close(r.se, fx(d.seCI), 1e-13, 0)
        close(r.ci![0], fx(ci[0]), 1e-12, 1e-14, `ci lo ${c} x=${d.x}`)
        close(r.ci![1], fx(ci[1]), 1e-12, 1e-14, `ci hi ${c} x=${d.x}`)
      }
    }
  })

  it('two-proportion z (pooled test, unpooled interval)', () => {
    for (const d of fixtures.twoProp) {
      for (const alt of ALTS) {
        const r = twoPropTest({ x1: d.x1, n1: d.n1, x2: d.x2, n2: d.n2, alt })
        close(r.statistic, fx(d.z), 1e-12, 1e-14)
        close(r.se, fx(d.sePooled), 1e-13, 0)
        close(r.pooled, fx(d.pooled), 1e-14, 0)
        close(r.pValue!, fx(d.tests[alt]), 1e-11, 1e-15, `p ${alt}`)
      }
      const ci = twoPropInterval({ x1: d.x1, n1: d.n1, x2: d.x2, n2: d.n2 })
      close(ci.se, fx(d.seUnpooled), 1e-13, 0)
      close(ci.ci![0], fx(d.ci95[0]), 1e-12, 1e-14)
      close(ci.ci![1], fx(d.ci95[1]), 1e-12, 1e-14)
    }
  })

  it('chi-square goodness-of-fit (scipy.stats.chisquare)', () => {
    for (const d of fixtures.chiSquareGOF) {
      const r = chiSquareGOF({ observed: d.observed, probs: d.probs })
      close(r.statistic, fx(d.statistic), 1e-12, 1e-13, `${d.name} stat`)
      close(r.pValue!, fx(d.p), 1e-10, 1e-14, `${d.name} p`)
      expect(r.df).toBe(d.df)
      r.expected.forEach((e, i) => close(e, fx(d.expected[i]), 1e-13, 1e-13))
      r.contributions.forEach((c, i) => close(c, fx(d.contributions[i]), 1e-12, 1e-13))
      const viaExpected = chiSquareGOF({ observed: d.observed, expected: d.expected.map(fx) })
      close(viaExpected.statistic, fx(d.statistic), 1e-12, 1e-13)
      if (d.name === 'sparse') expect(r.conditions.find((c) => c.name.startsWith('Expected'))!.met).toBe(false)
      else expect(r.conditions.find((c) => c.name.startsWith('Expected'))!.met).toBe(true)
    }
  })

  it('chi-square independence/homogeneity (chi2_contingency, correction=False)', () => {
    for (const d of fixtures.chiSquareIndependence) {
      const r = chiSquareIndependence(d.table)
      close(r.statistic, fx(d.statistic), 1e-12, 1e-13, `${d.name} stat`)
      close(r.pValue!, fx(d.p), 1e-10, 1e-14, `${d.name} p`)
      expect(r.df).toBe(d.df)
      r.expectedTable.forEach((row, i) => row.forEach((e, j) => close(e, fx(d.expected[i][j]), 1e-13, 1e-13)))
      const h = chiSquareHomogeneity(d.table)
      expect(h.statistic).toBe(r.statistic)
      expect(h.procedure).toContain('homogeneity')
      expect(h.conditions.filter((c) => c.name === '10% condition')).toHaveLength(d.table.length)
      expect(r.total).toBe(d.table.flat().reduce((a, b) => a + b, 0))
      if (d.name === 'sparse') expect(allConditionsMet(r)).toBe(false)
    }
  })

  it('slope t-test / interval (linregress) and computer-output form', () => {
    for (const d of fixtures.slope) {
      for (const alt of ALTS) {
        const r = slopeTestFromComputerOutput({ b: fx(d.b), seB: fx(d.seB), n: d.n, alt })
        close(r.statistic, fx(d.t), 1e-12, 1e-13, `${d.name} t ${alt}`)
        close(r.pValue!, fx(d.tests[alt]), 1e-10, 1e-14, `${d.name} p ${alt}`)
        expect(r.df).toBe(d.df)
      }
      for (const [c, ci] of Object.entries(d.ci)) {
        const r = slopeIntervalFromOutput({ b: fx(d.b), seB: fx(d.seB), n: d.n, confidence: Number(c) })
        close(r.ci![0], fx(ci[0]), 1e-10, 1e-12, `${d.name} ci lo ${c}`)
        close(r.ci![1], fx(ci[1]), 1e-10, 1e-12, `${d.name} ci hi ${c}`)
      }
    }
  })

  it('slopeTest / slopeInterval from data agree with linregress p-values', async () => {
    const reg = (await import('../../fixtures/regression.json')).default
    for (const d of fixtures.slope) {
      const data = (reg as Record<string, { x: number[]; y: number[] }>)[d.name]
      const r = slopeTest(data.x, data.y)
      close(r.statistic, fx(d.t), 1e-11, 1e-13, `${d.name} t`)
      close(r.pValue!, fx(d.tests['two-sided']), 1e-10, 1e-14, `${d.name} p`)
      const ci = slopeInterval(data.x, data.y, { confidence: 0.95 })
      close(ci.ci![0], fx(d.ci['0.95'][0]), 1e-10, 1e-12)
      close(ci.ci![1], fx(d.ci['0.95'][1]), 1e-10, 1e-12)
      expect(r.conditions.map((c) => c.name)).toEqual(['Linear', 'Random', '10% condition', 'Normal residuals', 'Equal SD'])
    }
  })

  it('power of a z-test on a mean; sample sizes', () => {
    for (const d of fixtures.power) {
      const r = powerZTestMean({ mu0: d.mu0, muA: d.muA, sigma: d.sigma, n: d.n, alpha: d.alpha, alt: d.alt as Alternative })
      close(r.power, fx(d.power), 1e-12, 1e-14, `power ${JSON.stringify(d)}`)
      expect(r.beta).toBeCloseTo(1 - fx(d.power), 14)
    }
    for (const d of fixtures.sampleSize) {
      if (d.kind === 'proportion') expect(sampleSizeForProportion({ moe: d.moe, confidence: d.confidence, pGuess: d.pGuess! })).toBe(d.n)
      else expect(sampleSizeForMean({ moe: d.moe, confidence: d.confidence, sigma: d.sigma! })).toBe(d.n)
    }
    // Under H0 (pA = p0) one-sided power equals α; two-sided too.
    expect(powerZTestProportion({ p0: 0.3, pA: 0.3, n: 100, alpha: 0.05, alt: 'greater' }).power).toBeCloseTo(0.05, 12)
    expect(powerZTestProportion({ p0: 0.3, pA: 0.3, n: 100, alpha: 0.05, alt: 'two-sided' }).power).toBeCloseTo(0.05, 12)
    // Power increases with n and with effect size.
    const p1 = powerZTestProportion({ p0: 0.3, pA: 0.36, n: 100, alt: 'greater' }).power
    const p2 = powerZTestProportion({ p0: 0.3, pA: 0.36, n: 400, alt: 'greater' }).power
    const p3 = powerZTestProportion({ p0: 0.3, pA: 0.42, n: 100, alt: 'greater' }).power
    expect(p2).toBeGreaterThan(p1)
    expect(p3).toBeGreaterThan(p1)
    const curve = powerCurve({ mu0: 100, sigma: 10, n: 30, alt: 'greater' }, { from: 100, to: 106, steps: 6 })
    expect(curve).toHaveLength(7)
    expect(curve[0].power).toBeCloseTo(0.05, 12)
    for (let i = 1; i < curve.length; i++) expect(curve[i].power).toBeGreaterThan(curve[i - 1].power)
    expect(typeIIError({ mu0: 100, muA: 103, sigma: 10, n: 30, alt: 'greater' })).toBeCloseTo(1 - curve[3].power, 14)
    expect(marginOfErrorProportion(0.5, 100)).toBeCloseTo(zStar(0.95) * 0.05, 14)
    expect(marginOfErrorMean(10, 25, 0.95, 'sigma')).toBeCloseTo(zStar(0.95) * 2, 14)
    expect(marginOfErrorMean(10, 25, 0.95)).toBeCloseTo(tStar(0.95, 24) * 2, 14)
    expect(samplingSdMean(10, 25)).toBe(2)
    expect(samplingSdProportion(0.5, 100)).toBe(0.05)
  })
})

describe('inference: conditions and result shape', () => {
  it('condition checkers compute the numeric conditions and pass through design conditions', () => {
    expect(largeCountsCondition(200, 0.25, 'p₀').met).toBe(true)
    expect(largeCountsCondition(30, 0.25, 'p₀').met).toBe(false)
    expect(successFailureCondition(9, 100).met).toBe(false)
    expect(successFailureCondition(10, 20).met).toBe(true)
    expect(tenPercentCondition(50, 400).met).toBe(false) // 50 > 10% of 400
    expect(tenPercentCondition(50, 400).detail).toContain('>')
    expect(tenPercentCondition(40, 400).met).toBe(true)
    expect(tenPercentCondition(50, 1000).met).toBe(true)
    expect(tenPercentCondition(50, undefined).assumed).toBe(true)
    expect(normalLargeSampleCondition(30).met).toBe(true)
    expect(normalLargeSampleCondition(8, [1, 2, 3, 4, 5, 6, 7, 8]).met).toBe(true)
    expect(normalLargeSampleCondition(9, [1, 2, 3, 4, 5, 6, 7, 8, 60]).met).toBe(false)
    expect(normalLargeSampleCondition(8).assumed).toBe(true)
    expect(expectedCountsCondition([5, 6, 7]).met).toBe(true)
    expect(expectedCountsCondition([4.9, 6, 7]).met).toBe(false)
    const r = onePropTest({ x: 56, n: 200, p0: 0.25, random: true, populationSize: 5000 })
    expect(allConditionsMet(r)).toBe(true)
    expect(r.conditions.map((c) => c.name)).toEqual(['Random', '10% condition', 'Large Counts'])
    expect(onePropTest({ x: 56, n: 200, p0: 0.25, random: false }).conditions[0].met).toBe(false)
    expect(onePropTest({ x: 5, n: 200, p0: 0.01 }).conditions[2].met).toBe(false)
    expect(twoPropTest({ x1: 48, n1: 160, x2: 30, n2: 150 }).conditions.map((c) => c.name)).toEqual(['Random', '10% condition', '10% condition', 'Large Counts', 'Large Counts'])
  })

  it('uniform result shape and summaries', () => {
    const r = oneMeanTest([1, 2, 3, 4, 5, 6], { mu0: 3 })
    expect(r).toMatchObject({ procedure: 'one-sample t-test', df: 5, alternative: 'two-sided' })
    expect(r.summary).toMatch(/t = .* df = 5, P = /)
    expect(r.hypotheses).toEqual({ null: 'μ = 3', alt: 'μ ≠ 3' })
    expect(Number.isFinite(r.statistic) && Number.isFinite(r.pValue!) && Number.isFinite(r.se)).toBe(true)
    const ci = onePropInterval({ x: 56, n: 200 })
    expect(Number.isNaN(ci.statistic)).toBe(true)
    expect(ci.ci![0]).toBeLessThan(ci.estimate)
    expect(ci.ci![1]).toBeGreaterThan(ci.estimate)
    expect(ci.criticalValue).toBeCloseTo(zStar(0.95), 14)
    expect(reject(0.03)).toBe(true)
    expect(reject(0.05)).toBe(false)
    expect(pValueZ(2, 'two-sided')).toBeCloseTo(2 * pValueZ(2, 'greater'), 14)
    expect(pValueZ(-2, 'less')).toBeCloseTo(pValueZ(2, 'greater'), 14)
    expect(pValueT(2, 10, 'two-sided')).toBeCloseTo(2 * pValueT(2, 10, 'greater'), 14)
    expect(pValueChi2(0, 3)).toBe(1)
  })

  it('validation', () => {
    expect(() => onePropTest({ x: 201, n: 200, p0: 0.5 })).toThrow()
    expect(() => onePropTest({ x: 5, n: 20, p0: 1 })).toThrow()
    expect(() => oneMeanTest([1], { mu0: 0 })).toThrow()
    expect(() => pairedTTest([1, 2], [1], {})).toThrow()
    expect(() => chiSquareGOF({ observed: [10, 20], probs: [0.5, 0.6] })).toThrow()
    expect(() => chiSquareIndependence([[1, 2]])).toThrow()
    expect(() => slopeTestFromComputerOutput({ b: 1, seB: 0, n: 10 })).toThrow()
    expect(() => sampleSizeForMean({ moe: 0, sigma: 1 })).toThrow()
    expect(() => zStar(1.5)).toThrow()
    expect(() => zStar(0)).toThrow()
    expect(() => zStar(100)).toThrow()
    expect(zStar(90)).toBe(zStar(0.9))
  })
})
