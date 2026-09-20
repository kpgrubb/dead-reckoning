import { describe, it, expect } from 'vitest'
import { Rng, seedFrom, hashString, mulberry32 } from './rng'

describe('rng', () => {
  it('is reproducible from a numeric seed', () => {
    const a = new Rng(42)
    const b = new Rng(42)
    const xs = Array.from({ length: 20 }, () => a.float())
    const ys = Array.from({ length: 20 }, () => b.float())
    expect(xs).toEqual(ys)
  })

  it('is reproducible from a string seed', () => {
    expect(new Rng('act-4-03|drill|2').float()).toBe(new Rng('act-4-03|drill|2').float())
    expect(seedFrom('a', 1)).toBe(seedFrom('a', 1))
    expect(seedFrom('a', 1)).not.toBe(seedFrom('a', 2))
  })

  it('hashString is stable', () => {
    expect(hashString('dead reckoning')).toBe(hashString('dead reckoning'))
    expect(hashString('dead reckoning')).not.toBe(hashString('dead reckonin'))
  })

  it('mulberry32 yields floats in [0,1)', () => {
    const f = mulberry32(7)
    for (let i = 0; i < 10000; i++) {
      const v = f()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int stays within inclusive bounds and hits both ends', () => {
    const r = new Rng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 5000; i++) {
      const v = r.int(1, 6)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(6)
      seen.add(v)
    }
    expect(seen.size).toBe(6)
  })

  it('normal has roughly the right mean and sd', () => {
    const r = new Rng(99)
    const n = 20000
    let s = 0
    let ss = 0
    for (let i = 0; i < n; i++) {
      const z = r.normal(10, 2)
      s += z
      ss += z * z
    }
    const m = s / n
    const sd = Math.sqrt(ss / n - m * m)
    expect(m).toBeCloseTo(10, 1)
    expect(sd).toBeCloseTo(2, 1)
  })

  it('binomial and geometric have the right means', () => {
    const r = new Rng(5)
    const n = 10000
    let b = 0
    let g = 0
    for (let i = 0; i < n; i++) {
      b += r.binomial(10, 0.3)
      g += r.geometric(0.25)
    }
    expect(b / n).toBeCloseTo(3, 0)
    expect(g / n).toBeCloseTo(4, 0)
  })

  it('shuffle preserves multiset, sample is distinct, resample has right length', () => {
    const r = new Rng(11)
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(r.shuffle(arr).slice().sort()).toEqual(arr.slice().sort())
    const s = r.sample(arr, 4)
    expect(new Set(s).size).toBe(4)
    expect(r.resample(arr, 20)).toHaveLength(20)
    expect(() => r.sample(arr, 9)).toThrow()
  })

  it('child generators are independent and stable', () => {
    const p = new Rng('parent')
    const c1 = p.child('drill', 1)
    const c2 = p.child('drill', 2)
    expect(c1.float()).not.toBe(c2.float())
    expect(new Rng('parent').child('drill', 1).seed).toBe(c1.seed)
  })
})
