import { describe, it, expect } from 'vitest'
import { erf, erfc, lgamma, gammaFn, gammaP, gammaQ, betaInc, betaIncC, choose, lchoose, factorial, logFactorial, invertMonotone } from '@/lib/stats/special'
import fixtures from '../../fixtures/special.json'
import { fx, close, label } from './helpers'

describe('special.json fixtures (SciPy 1.18)', () => {
  it(`erf / erfc (${fixtures.erf.length} cases, rel 1e-13)`, () => {
    for (const c of fixtures.erf) {
      close(erf(c.x), fx(c.erf), 1e-13, 1e-300, label({ fn: 'erf', x: c.x }))
      close(erfc(c.x), fx(c.erfc), 1e-13, 1e-300, label({ fn: 'erfc', x: c.x }))
    }
  })

  it(`gammaln (${fixtures.gammaln.length} cases, rel 1e-13 / abs 1e-13)`, () => {
    for (const c of fixtures.gammaln) close(lgamma(c.x), fx(c.lgamma), 1e-13, 1e-13, label({ fn: 'lgamma', x: c.x }))
  })

  it(`regularized incomplete gamma P/Q (${fixtures.gammainc.length} cases, rel 1e-11 / abs 1e-14)`, () => {
    for (const c of fixtures.gammainc) {
      close(gammaP(c.a, c.x), fx(c.P), 1e-11, 1e-14, label({ fn: 'P', a: c.a, x: c.x }))
      close(gammaQ(c.a, c.x), fx(c.Q), 1e-11, 1e-14, label({ fn: 'Q', a: c.a, x: c.x }))
    }
  })

  it(`regularized incomplete beta (${fixtures.betainc.length} cases, rel 1e-10 / abs 1e-14)`, () => {
    for (const c of fixtures.betainc) {
      close(betaInc(c.x, c.a, c.b), fx(c.I), 1e-10, 1e-14, label({ fn: 'I', x: c.x, a: c.a, b: c.b }))
      close(betaIncC(c.x, c.a, c.b), 1 - fx(c.I), 1e-9, 1e-13, label({ fn: 'Ic', x: c.x, a: c.a, b: c.b }))
    }
  })

  it(`binomial coefficients exact (${fixtures.comb.length} cases)`, () => {
    for (const c of fixtures.comb) {
      const v = fx(c.value)
      if (v < 2 ** 53) expect(choose(c.n, c.k), label(c)).toBe(v)
      else close(choose(c.n, c.k), v, 1e-12, 0, label(c))
      close(Math.exp(lchoose(c.n, c.k)), v, 1e-11, 0, label({ ...c, fn: 'lchoose' }))
    }
  })
})

describe('special: identities and edge cases', () => {
  it('erf is odd, erfc(x) + erf(x) = 1', () => {
    for (const x of [-3, -1.2, -0.3, 0.1, 0.46875, 0.5, 2, 4, 7]) {
      expect(erf(-x)).toBeCloseTo(-erf(x), 15)
      expect(erf(x) + erfc(x)).toBeCloseTo(1, 15)
    }
    expect(erf(0)).toBe(0)
    expect(erfc(0)).toBe(1)
    expect(erf(Infinity)).toBe(1)
    expect(erfc(-Infinity)).toBe(2)
    expect(erfc(30)).toBe(0)
  })

  it('gamma: Γ(n+1) = n!, Γ(1/2) = √π, poles', () => {
    expect(gammaFn(5)).toBe(24)
    expect(gammaFn(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 14)
    expect(lgamma(1)).toBe(0)
    expect(lgamma(2)).toBe(0)
    expect(lgamma(0)).toBe(Infinity)
    expect(lgamma(-3)).toBe(Infinity)
    expect(factorial(0)).toBe(1)
    expect(factorial(20)).toBe(2432902008176640000)
    expect(factorial(171)).toBe(Infinity)
    expect(logFactorial(200)).toBeCloseTo(863.2319871924054, 9)
    expect(() => factorial(-1)).toThrow()
  })

  it('incomplete gamma/beta boundaries', () => {
    expect(gammaP(2, 0)).toBe(0)
    expect(gammaQ(2, 0)).toBe(1)
    expect(gammaP(2, Infinity)).toBe(1)
    expect(betaInc(0, 2, 3)).toBe(0)
    expect(betaInc(1, 2, 3)).toBe(1)
    expect(betaInc(0.5, 1, 1)).toBe(0.5)
    expect(() => gammaP(0, 1)).toThrow()
    expect(() => betaInc(0.5, 0, 1)).toThrow()
    expect(choose(5, 6)).toBe(0)
    expect(lchoose(5, 6)).toBe(-Infinity)
  })

  it('invertMonotone solves with and without derivative, with infinite bounds', () => {
    const f = (x: number) => x * x * x + x
    expect(invertMonotone(f, 10, -Infinity, Infinity)).toBeCloseTo(2, 12)
    expect(invertMonotone(f, 10, -Infinity, Infinity, { derivative: (x) => 3 * x * x + 1, guess: 0.5 })).toBeCloseTo(2, 12)
    expect(invertMonotone(Math.exp, 1, -Infinity, Infinity)).toBeCloseTo(0, 12)
    expect(invertMonotone(Math.atan, Math.PI / 4, 0, 5)).toBeCloseTo(1, 12)
  })
})
