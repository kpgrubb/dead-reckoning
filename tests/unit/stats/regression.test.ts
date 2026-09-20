import { describe, it, expect } from 'vitest'
import { linearRegression, correlation, regressionFromSummary, slopeFromR, rFromSlope, transformedRegression, compareTransforms, residualsForLine, sseForLine } from '@/lib/stats'
import fixtures from '../../fixtures/regression.json'
import { fx, close } from './helpers'

type Block = (typeof fixtures)['cargo']['linear']

function checkFit(name: string, xs: number[], ys: number[], b: Block) {
  const fit = linearRegression(xs, ys)
  close(fit.slope, fx(b.slope), 1e-12, 1e-14, `${name} slope`)
  close(fit.intercept, fx(b.intercept), 1e-12, 1e-13, `${name} intercept`)
  close(fit.r, fx(b.r), 1e-12, 1e-14, `${name} r`)
  close(fit.r2, fx(b.r2), 1e-12, 1e-14, `${name} r2`)
  close(fit.xMean, fx(b.xMean), 1e-13, 1e-14, `${name} xMean`)
  close(fit.yMean, fx(b.yMean), 1e-13, 1e-14, `${name} yMean`)
  close(fit.sx, fx(b.sx), 1e-13, 1e-14, `${name} sx`)
  close(fit.sy, fx(b.sy), 1e-13, 1e-14, `${name} sy`)
  close(fit.sse, fx(b.sse), 1e-11, 1e-13, `${name} sse`)
  close(fit.sst, fx(b.sst), 1e-12, 1e-13, `${name} sst`)
  if (b.n > 2) {
    close(fit.s, fx(b.s), 1e-11, 1e-13, `${name} s`)
    close(fit.seSlope, fx(b.seSlope), 1e-11, 1e-14, `${name} seSlope`)
    close(fit.seIntercept, fx(b.seIntercept), 1e-11, 1e-13, `${name} seIntercept`)
    close(fit.slope / fit.seSlope, fx(b.tSlope), 1e-11, 1e-13, `${name} t`)
  }
  fit.fitted.forEach((v, i) => close(v, fx(b.fitted[i]), 1e-12, 1e-12, `${name} fitted[${i}]`))
  fit.residuals.forEach((v, i) => close(v, fx(b.residuals[i]), 1e-10, 1e-11, `${name} resid[${i}]`))
  fit.leverage.forEach((v, i) => close(v, fx(b.leverage[i]), 1e-12, 1e-13, `${name} lev[${i}]`))
  if (b.n > 2) {
    fit.cooks.forEach((v, i) => close(v, fx(b.cooks[i]), 1e-9, 1e-11, `${name} cooks[${i}]`))
    fit.standardizedResiduals.forEach((v, i) => close(v, fx(b.stdResiduals[i]), 1e-9, 1e-11, `${name} stdres[${i}]`))
  }
  expect(fit.predict(xs[0])).toBeCloseTo(fit.fitted[0], 12)
  expect(correlation(xs, ys)).toBeCloseTo(fit.r, 14)
}

describe('regression.json fixtures (scipy.stats.linregress)', () => {
  for (const name of ['cargo', 'transit', 'influential', 'tiny', 'expgrowth', 'power'] as const) {
    const d = fixtures[name]
    it(`${name}: linear fit`, () => checkFit(name, d.x, d.y, d.linear))
    if ('logy' in d) {
      it(`${name}: log transforms (log10 and ln)`, () => {
        const dd = d as typeof fixtures.expgrowth
        const ly = transformedRegression(d.x, d.y, 'logy')
        close(ly.fit.slope, fx(dd.logy.slope), 1e-12, 1e-14, 'logy slope')
        close(ly.fit.intercept, fx(dd.logy.intercept), 1e-12, 1e-14, 'logy intercept')
        close(ly.r2, fx(dd.logy.r2), 1e-12, 1e-14, 'logy r2')
        // back-transform: predict returns y on the original scale
        expect(ly.predict(d.x[0])).toBeCloseTo(Math.pow(10, ly.fit.intercept + ly.fit.slope * d.x[0]), 10)
        const lx = transformedRegression(d.x, d.y, 'logx')
        close(lx.fit.slope, fx(dd.logx.slope), 1e-12, 1e-14, 'logx slope')
        close(lx.fit.intercept, fx(dd.logx.intercept), 1e-12, 1e-13, 'logx intercept')
        const ll = transformedRegression(d.x, d.y, 'loglog')
        close(ll.fit.slope, fx(dd.loglog.slope), 1e-12, 1e-14, 'loglog slope')
        close(ll.r2, fx(dd.loglog.r2), 1e-12, 1e-14, 'loglog r2')
        expect(ll.predict(4)).toBeCloseTo(Math.pow(10, ll.fit.intercept) * Math.pow(4, ll.fit.slope), 9)
        const ln = transformedRegression(d.x, d.y, 'logy', { base: 'e' })
        close(ln.fit.slope, fx(dd.lny.slope), 1e-12, 1e-14, 'lny slope')
        expect(ln.predict(2)).toBeCloseTo(Math.exp(ln.fit.intercept + ln.fit.slope * 2), 10)
      })
    }
  }

  it('regression from summary statistics', () => {
    const s = fixtures.summary
    const r = regressionFromSummary({ r: s.r, sx: s.sx, sy: s.sy, xMean: s.xMean, yMean: s.yMean })
    close(r.slope, s.slope, 1e-14)
    close(r.intercept, s.intercept, 1e-13)
    expect(slopeFromR(s.r, s.sx, s.sy)).toBeCloseTo(s.slope, 14)
    expect(rFromSlope(s.slope, s.sx, s.sy)).toBeCloseTo(s.r, 14)
    expect(r.predict(s.xMean)).toBeCloseTo(s.yMean, 12)
  })
})

describe('regression: behaviour', () => {
  it('flags the influential point and high leverage', () => {
    const d = fixtures.influential
    const fit = linearRegression(d.x, d.y)
    expect(fit.flags.highLeverage).toContain(7)
    expect(fit.flags.influential).toContain(7)
    expect(fit.equation(2)).toMatch(/ŷ = /)
  })

  it('the least-squares line minimizes SSE and passes through (x̄, ȳ)', () => {
    const d = fixtures.cargo
    const fit = linearRegression(d.x, d.y)
    const best = sseForLine(d.x, d.y, fit.slope, fit.intercept)
    expect(best).toBeCloseTo(fit.sse, 10)
    for (const [ds, di] of [
      [0.001, 0],
      [-0.001, 0],
      [0, 0.01],
      [0, -0.01],
    ]) expect(sseForLine(d.x, d.y, fit.slope + ds, fit.intercept + di)).toBeGreaterThan(best)
    expect(fit.predict(fit.xMean)).toBeCloseTo(fit.yMean, 12)
    expect(residualsForLine(d.x, d.y, fit.slope, fit.intercept).reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10)
  })

  it('compareTransforms ranks the exponential data by r²', () => {
    const d = fixtures.expgrowth
    const cmp = compareTransforms(d.x, d.y)
    const best = cmp.reduce((a, b) => (b.r2 > a.r2 ? b : a))
    expect(best.transform).toBe('logy')
  })

  it('validation', () => {
    expect(() => linearRegression([1, 1, 1], [1, 2, 3])).toThrow()
    expect(() => linearRegression([1], [1])).toThrow()
    expect(() => linearRegression([1, 2], [1])).toThrow()
    expect(() => transformedRegression([0, 1, 2], [1, 2, 3], 'logx')).toThrow()
    expect(Number.isNaN(correlation([1, 2, 3], [5, 5, 5]))).toBe(true)
  })
})
