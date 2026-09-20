import { describe, it, expect } from 'vitest'
import { niceTicks, computeBins, boxplotStats, boxStatsFrom, stackDots, leastSquares, sampleCurve, barLayout, padDomain, fmtTick, sturges } from './geometry'

describe('niceTicks', () => {
  it('returns clean step values covering the range', () => {
    const t = niceTicks(0, 10, 5)
    expect(t).toEqual([0, 2, 4, 6, 8, 10])
  })
  it('handles reversed and degenerate input', () => {
    expect(niceTicks(10, 0, 5)).toEqual([0, 2, 4, 6, 8, 10])
    expect(niceTicks(3, 3)).toEqual([3])
    expect(niceTicks(NaN, 1)).toEqual([])
  })
  it('never returns an empty list for a finite non-degenerate range', () => {
    expect(niceTicks(0.0001, 0.0002, 1).length).toBeGreaterThan(0)
  })
})

describe('computeBins', () => {
  it('aligns edges to multiples of the bin width and covers every value', () => {
    const bins = computeBins([11.2, 14.8, 9.6, 13.1, 12.4, 15.9], { binWidth: 2 })
    expect(bins[0].x0).toBe(8)
    expect(bins[bins.length - 1].x1).toBe(16)
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(6)
    expect(bins.map((b) => b.count)).toEqual([1, 1, 2, 2])
  })
  it('puts a value equal to the max into the last bin, not a phantom bin', () => {
    const bins = computeBins([0, 5, 10], { binWidth: 5 })
    expect(bins.length).toBe(3)
    expect(bins[2]).toEqual({ x0: 10, x1: 15, count: 1 })
  })
  it('keeps empty bins', () => {
    const bins = computeBins([0, 9], { binWidth: 3 })
    expect(bins.map((b) => b.count)).toEqual([1, 0, 0, 1])
  })
  it('chooses a nice width when none is given', () => {
    const vals = Array.from({ length: 100 }, (_, i) => i * 0.37)
    const bins = computeBins(vals)
    expect(bins.length).toBeGreaterThan(4)
    expect(bins.length).toBeLessThan(41)
    const w = bins[0].x1 - bins[0].x0
    for (const b of bins) expect(b.x1 - b.x0).toBeCloseTo(w, 9)
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(100)
  })
  it('ignores non-finite values and returns [] for empty input', () => {
    expect(computeBins([])).toEqual([])
    expect(computeBins([NaN, Infinity])).toEqual([])
    expect(computeBins([1, NaN, 2], { binWidth: 1 }).reduce((s, b) => s + b.count, 0)).toBe(2)
  })
  it('caps runaway bin counts', () => {
    const bins = computeBins([0, 1e6], { binWidth: 1 })
    expect(bins.length).toBeLessThanOrEqual(500)
  })
  it('bins 5000 values quickly', () => {
    const vals = Array.from({ length: 5000 }, (_, i) => Math.sin(i) * 10)
    const t0 = performance.now()
    const bins = computeBins(vals)
    expect(performance.now() - t0).toBeLessThan(50)
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(5000)
  })
})

describe('boxplotStats (AP / TI-84 quartiles)', () => {
  it('matches the textbook odd-n example', () => {
    // 1 2 3 4 5 6 7 8 9 → lower half 1..4 (Q1 = 2.5), upper 6..9 (Q3 = 7.5)
    const s = boxplotStats([9, 1, 8, 2, 7, 3, 6, 4, 5])!
    expect(s.median).toBe(5)
    expect(s.q1).toBe(2.5)
    expect(s.q3).toBe(7.5)
    expect(s.iqr).toBe(5)
    expect(s.outliers).toEqual([])
    expect(s.whiskerLo).toBe(1)
    expect(s.whiskerHi).toBe(9)
  })
  it('matches the even-n example', () => {
    const s = boxplotStats([1, 2, 3, 4, 5, 6, 7, 8])!
    expect(s.q1).toBe(2.5)
    expect(s.median).toBe(4.5)
    expect(s.q3).toBe(6.5)
  })
  it('flags 1.5×IQR outliers and stops whiskers at the fences', () => {
    const s = boxplotStats([10, 11, 12, 13, 14, 15, 16, 40])!
    expect(s.outliers).toEqual([40])
    expect(s.whiskerHi).toBe(16)
    expect(s.max).toBe(40)
    expect(s.highFence).toBeCloseTo(s.q3 + 1.5 * s.iqr)
  })
  it('handles tiny samples', () => {
    expect(boxplotStats([])).toBeNull()
    const one = boxplotStats([4])!
    expect(one.median).toBe(4)
    expect(one.iqr).toBe(0)
    const two = boxplotStats([2, 4])!
    expect(two.q1).toBe(2)
    expect(two.q3).toBe(4)
    expect(two.median).toBe(3)
  })
  it('fills precomputed summaries', () => {
    const s = boxStatsFrom({ min: 1, q1: 2, median: 3, q3: 4, max: 5 })
    expect(s.iqr).toBe(2)
    expect(s.whiskerLo).toBe(1)
    expect(s.whiskerHi).toBe(5)
    const o = boxStatsFrom({ min: 1, q1: 2, median: 3, q3: 4, max: 50, outliers: [50] })
    expect(o.whiskerHi).toBe(4)
  })
})

describe('stackDots', () => {
  it('stacks equal values and keeps distinct values apart', () => {
    const x = (v: number) => v * 10
    const { dots, maxLevel } = stackDots([1, 1, 1, 2, 3], x, 8)
    expect(maxLevel).toBe(2)
    const ones = dots.filter((d) => d.value === 1).map((d) => d.level).sort()
    expect(ones).toEqual([0, 1, 2])
    expect(dots.find((d) => d.value === 2)!.level).toBe(0)
  })
  it('buckets values that would overlap at the current scale', () => {
    const x = (v: number) => v // 1px per unit; 8px dots → values 0..3 share a bucket
    const { maxLevel } = stackDots([0, 1, 2, 3], x, 8)
    expect(maxLevel).toBe(3)
  })
  it('preserves original indices and skips non-finite values', () => {
    const { dots } = stackDots([5, NaN, 7], (v) => v, 4)
    expect(dots.map((d) => d.index).sort()).toEqual([0, 2])
  })
})

describe('leastSquares', () => {
  it('recovers an exact line', () => {
    const fit = leastSquares([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ])!
    expect(fit.slope).toBeCloseTo(2)
    expect(fit.intercept).toBeCloseTo(1)
    expect(fit.r).toBeCloseTo(1)
  })
  it('matches a hand-checked regression (Anscombe I subset)', () => {
    const pts = [
      { x: 10, y: 8.04 },
      { x: 8, y: 6.95 },
      { x: 13, y: 7.58 },
      { x: 9, y: 8.81 },
      { x: 11, y: 8.33 },
      { x: 14, y: 9.96 },
      { x: 6, y: 7.24 },
      { x: 4, y: 4.26 },
      { x: 12, y: 10.84 },
      { x: 7, y: 4.82 },
      { x: 5, y: 5.68 },
    ]
    const fit = leastSquares(pts)!
    expect(fit.slope).toBeCloseTo(0.5001, 3)
    expect(fit.intercept).toBeCloseTo(3.0001, 3)
    expect(fit.r).toBeCloseTo(0.8164, 3)
  })
  it('returns null when x has no spread or fewer than two points', () => {
    expect(leastSquares([{ x: 1, y: 2 }])).toBeNull()
    expect(
      leastSquares([
        { x: 1, y: 2 },
        { x: 1, y: 3 },
      ]),
    ).toBeNull()
  })
})

describe('sampleCurve / barLayout / padDomain / fmtTick / sturges', () => {
  it('samples inclusive endpoints and zeroes non-finite output', () => {
    const s = sampleCurve((x) => (x === 0 ? NaN : 1 / x), [0, 2], 3)
    expect(s.map((p) => p.x)).toEqual([0, 1, 2])
    expect(s[0].y).toBe(0)
    expect(s[1].y).toBe(1)
  })
  it('caps bar thickness and centres bars in their band', () => {
    const l = barLayout(4, 400, { maxThickness: 28, gap: 2 })
    expect(l.band).toBe(100)
    expect(l.thickness).toBe(28)
    expect(l.offset).toBe(36)
    const tight = barLayout(50, 200, { maxThickness: 28, gap: 2 })
    expect(tight.thickness).toBeLessThan(4)
    expect(tight.thickness).toBeGreaterThan(0)
    expect(barLayout(0, 100)).toEqual({ band: 0, thickness: 0, offset: 0 })
  })
  it('pads domains without collapsing', () => {
    expect(padDomain([0, 10], 0.1)).toEqual([-1, 11])
    const [a, b] = padDomain([5, 5])
    expect(b).toBeGreaterThan(a)
    expect(padDomain([NaN, 1])).toEqual([0, 1])
  })
  it('formats ticks without float noise and with a typographic minus', () => {
    expect(fmtTick(0.1 + 0.2)).toBe('0.3')
    expect(fmtTick(-2)).toBe('−2')
    expect(fmtTick(1500000)).toBe('1.5e+6')
  })
  it('clamps Sturges', () => {
    expect(sturges(6)).toBe(5)
    expect(sturges(5000)).toBe(14)
    expect(sturges(1e12)).toBe(40)
  })
})
