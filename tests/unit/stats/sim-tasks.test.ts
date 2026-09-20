import { describe, it, expect } from 'vitest'
import { Rng } from '@/lib/rng'
import { simulate, tasks, registerTask, hasTask, runSimulation, RunningStats, parentMean, parentSd, drawParent } from '@/lib/sim'
import { defaultBatch } from '@/lib/sim/worker'
import { mean, sd, chi2 } from '@/lib/stats'

const seed = 20260919

describe('simulation task registry', () => {
  it('every registered task returns finite numbers with default params and is deterministic', () => {
    for (const name of Object.keys(tasks)) {
      const a = simulate(name, {}, seed, 50)
      const b = simulate(name, {}, seed, 50)
      expect(a, name).toEqual(b)
      for (const v of a) expect(Number.isFinite(v), `${name} produced ${v}`).toBe(true)
    }
    expect(hasTask('sample-mean')).toBe(true)
    expect(hasTask('nope')).toBe(false)
    registerTask('always-one', () => 1)
    expect(simulate('always-one', {}, 1, 3)).toEqual([1, 1, 1])
    expect(() => simulate('nope', {}, 1, 3)).toThrow()
  })

  it('parent draws have the documented means and sds', () => {
    const parents = [
      { parent: 'normal', mu: 5, sigma: 2 },
      { parent: 'uniform', a: 2, b: 8 },
      { parent: 'exponential', rate: 0.5 },
      { parent: 'skewed', shape: 3, scale: 2 },
      { parent: 'bimodal', mu1: -3, mu2: 3, sigma: 1, w: 0.3 },
      { parent: 'discrete', values: [1, 2, 6], probs: [0.5, 0.3, 0.2] },
      { parent: 'bernoulli', p: 0.2 },
    ]
    for (const p of parents) {
      const rng = new Rng(p.parent)
      const xs = Array.from({ length: 40000 }, () => drawParent(rng, p))
      const m = parentMean(p)
      const s = parentSd(p)
      expect(Math.abs(mean(xs) - m), `${p.parent} mean`).toBeLessThan(5 * (s / Math.sqrt(xs.length)))
      expect(Math.abs(sd(xs) - s) / s, `${p.parent} sd`).toBeLessThan(0.05)
    }
  })

  it('CLT machine: sample-mean has mean μ and sd σ/√n for a skewed parent', () => {
    const p = { parent: 'exponential', rate: 0.5, n: 30 }
    const r = simulate('sample-mean', p, seed, 6000)
    expect(Math.abs(mean(r) - 2)).toBeLessThan(0.03)
    expect(Math.abs(sd(r) - 2 / Math.sqrt(30))).toBeLessThan(0.02)
    const c = simulate('normal-sample-mean', { n: 25, mu: 100, sigma: 10 }, seed, 4000)
    expect(Math.abs(mean(c) - 100)).toBeLessThan(0.15)
    expect(Math.abs(sd(c) - 2)).toBeLessThan(0.12)
  })

  it('sample-proportion, binomial-count, geometric-trials, dice-sum, rv-sum', () => {
    expect(Math.abs(mean(simulate('sample-proportion', { n: 50, p: 0.3 }, seed, 4000)) - 0.3)).toBeLessThan(0.01)
    expect(Math.abs(mean(simulate('binomial-count', { n: 20, p: 0.25 }, seed, 4000)) - 5)).toBeLessThan(0.15)
    expect(Math.abs(mean(simulate('geometric-trials', { p: 0.2 }, seed, 4000)) - 5)).toBeLessThan(0.3)
    const dice = simulate('dice-sum', { dice: 2, sides: 6 }, seed, 4000)
    expect(Math.abs(mean(dice) - 7)).toBeLessThan(0.15)
    expect(Math.min(...dice)).toBeGreaterThanOrEqual(2)
    expect(Math.max(...dice)).toBeLessThanOrEqual(12)
    const rv = simulate('rv-sum', { values: [0, 1, 2], probs: [0.5, 0.3, 0.2], k: 3 }, seed, 4000)
    expect(Math.abs(mean(rv) - 3 * 0.7)).toBeLessThan(0.1)
  })

  it('ci-capture rates ≈ confidence level', () => {
    const t = simulate('ci-capture', { kind: 'mean-t', parent: 'normal', mu: 50, sigma: 5, n: 10, confidence: 0.95 }, seed, 5000)
    expect(Math.abs(mean(t) - 0.95)).toBeLessThan(0.015)
    const z = simulate('ci-capture', { kind: 'mean-z', parent: 'uniform', a: 0, b: 10, n: 30, confidence: 0.9 }, seed, 5000)
    expect(Math.abs(mean(z) - 0.9)).toBeLessThan(0.02)
    const p = simulate('ci-capture', { kind: 'proportion', p: 0.4, n: 100, confidence: 0.95 }, seed, 5000)
    expect(Math.abs(mean(p) - 0.95)).toBeLessThan(0.02)
    for (const v of [...t, ...z, ...p]) expect(v === 0 || v === 1).toBe(true)
  })

  it('sample-slope centres on the true slope; permutation-diff centres on 0; sample-sd near σ', () => {
    const s = simulate('sample-slope', { n: 20, slope: 2.5, intercept: 1, sigma: 3, xMin: 0, xMax: 10 }, seed, 3000)
    expect(Math.abs(mean(s) - 2.5)).toBeLessThan(0.03)
    const fixed = simulate('sample-slope', { xs: [1, 2, 3, 4, 5], slope: -1, intercept: 0, sigma: 0.5 }, seed, 2000)
    expect(Math.abs(mean(fixed) + 1)).toBeLessThan(0.02)
    const d = simulate('permutation-diff', { a: [1, 2, 3, 4, 5, 6], b: [4, 5, 6, 7, 8, 9] }, seed, 3000)
    expect(Math.abs(mean(d))).toBeLessThan(0.1)
    const sds = simulate('sample-sd', { parent: 'normal', mu: 0, sigma: 4, n: 40 }, seed, 3000)
    expect(Math.abs(mean(sds) - 4)).toBeLessThan(0.05)
    expect(mean(simulate('bootstrap-mean', { data: [1, 2, 3, 4, 5, 6] }, seed, 3000))).toBeCloseTo(3.5, 0)
  })

  it('detection-while-cold and pings-until-detected', () => {
    const hits = simulate('detection-while-cold', { n: 20, p: 0.1 }, seed, 5000)
    expect(Math.abs(mean(hits) - 2)).toBeLessThan(0.08)
    const hidden = hits.filter((h) => h === 0).length / hits.length
    expect(Math.abs(hidden - 0.9 ** 20)).toBeLessThan(0.02)
    const ramp = simulate('detection-while-cold', { n: 10, p: 0.05, heatRate: 0.02 }, seed, 5000)
    // expected = Σ (0.05 + 0.02·i), i = 0..9 = 0.5 + 0.02·45 = 1.4
    expect(Math.abs(mean(ramp) - 1.4)).toBeLessThan(0.06)
    const pings = simulate('pings-until-detected', { p: 0.1 }, seed, 5000)
    expect(Math.abs(mean(pings) - 10)).toBeLessThan(0.5)
    expect(Math.max(...simulate('pings-until-detected', { p: 0.001, maxPings: 50 }, seed, 200))).toBeLessThanOrEqual(50)
  })

  it('chi2-under-h0 has mean ≈ df and matches the χ² upper tail (GOF and independence)', () => {
    const g = simulate('chi2-under-h0', { probs: [0.25, 0.25, 0.25, 0.25], n: 200 }, seed, 4000)
    expect(Math.abs(mean(g) - 3)).toBeLessThan(0.2)
    const crit = chi2.isf(0.05, 3)
    expect(Math.abs(g.filter((v) => v > crit).length / g.length - 0.05)).toBeLessThan(0.015)
    const ind = simulate('chi2-under-h0', { rowProbs: [0.5, 0.5], colProbs: [0.2, 0.3, 0.5], n: 300 }, seed, 4000)
    expect(Math.abs(mean(ind) - 2)).toBeLessThan(0.15)
    const tt = simulate('t-under-h0', { parent: 'normal', mu: 10, sigma: 3, n: 8 }, seed, 4000)
    expect(Math.abs(mean(tt))).toBeLessThan(0.06)
    expect(sd(tt)).toBeGreaterThan(1.05) // t(7) has sd √(7/5) ≈ 1.18
    const zz = simulate('z-under-h0', { n: 100, p: 0.4 }, seed, 4000)
    expect(Math.abs(sd(zz) - 1)).toBeLessThan(0.05)
  })

  it('runSimulation falls back synchronously without Workers and RunningStats tracks mean/sd', () => {
    let done: number[] = []
    let progress = 0
    runSimulation({ task: 'dice-sum', params: { dice: 1, sides: 6 }, seed, n: 500, onProgress: () => progress++, onDone: (r) => (done = r) })
    expect(done).toHaveLength(500)
    expect(progress).toBe(1)
    let err = ''
    runSimulation({ task: 'nope', params: {}, seed, n: 5, onError: (m) => (err = m) })
    expect(err).toContain('Unknown')
    const rs = new RunningStats()
    rs.pushAll(done)
    expect(rs.n).toBe(500)
    expect(rs.mean).toBeCloseTo(mean(done), 12)
    expect(rs.sd).toBeCloseTo(sd(done), 12)
    expect(defaultBatch(100)).toBe(200)
    expect(defaultBatch(100000)).toBe(1000)
    expect(defaultBatch(10_000_000)).toBe(5000)
  })
})
