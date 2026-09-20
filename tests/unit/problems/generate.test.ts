import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, drawScatter, drawTwoWay, instantiateWith, listNumbers, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import { GeneratorValidationError, numbersIn, validateDisplaySpec, validateGeneratorDefinition, validateInstance } from '@/lib/problems/validate'
import { mean, median, sd } from '@/lib/stats/descriptive'
import type { ProblemGenerator, ProblemInstance } from '@/lib/problems/types'

describe('drawDataset', () => {
  it('is reproducible and respects n, rounding, bounds and distinctness', () => {
    const a = drawDataset(new Rng(7), { n: 12, mean: 50, sd: 5, round: 1, min: 40, max: 60, distinct: true })
    const b = drawDataset(new Rng(7), { n: 12, mean: 50, sd: 5, round: 1, min: 40, max: 60, distinct: true })
    expect(a).toEqual(b)
    expect(a).toHaveLength(12)
    expect(new Set(a).size).toBe(12)
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(40)
      expect(v).toBeLessThanOrEqual(60)
      expect(Math.round(v * 10) / 10).toBe(v)
    }
  })
  it('produces the requested center/spread for each shape (large n)', () => {
    for (const shape of ['normal', 'skewLeft', 'skewRight', 'uniform', 'bimodal'] as const) {
      const xs = drawDataset(new Rng(shape), { n: 4000, mean: 100, sd: 10, round: 3, shape })
      expect(mean(xs)).toBeCloseTo(100, 0)
      expect(sd(xs)).toBeGreaterThan(8)
      expect(sd(xs)).toBeLessThan(12)
    }
    const right = drawDataset(new Rng(1), { n: 4000, mean: 100, sd: 10, round: 3, shape: 'skewRight' })
    const left = drawDataset(new Rng(1), { n: 4000, mean: 100, sd: 10, round: 3, shape: 'skewLeft' })
    expect(mean(right)).toBeGreaterThan(median(right))
    expect(mean(left)).toBeLessThan(median(left))
  })
  it('runs the whole-dataset accept test and fails loudly when impossible', () => {
    const xs = drawDataset(new Rng(3), { n: 8, mean: 10, sd: 2, accept: (v) => Math.max(...v) - Math.min(...v) < 6 })
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(6)
    expect(() => drawDataset(new Rng(3), { n: 8, mean: 10, sd: 2, min: 100 })).toThrow(/retry/)
    expect(() => drawDataset(new Rng(3), { n: 0, mean: 10, sd: 2 })).toThrow()
  })
})

describe('drawScatter', () => {
  it('draws around the line with the right sign of r and rejects degenerate draws', () => {
    const d = drawScatter(new Rng(11), { n: 20, slope: 0.4, intercept: 5, noise: 2, xRange: [10, 50] })
    expect(d.points).toHaveLength(20)
    expect(d.r).toBeGreaterThan(0.1)
    expect(new Set(d.xs).size).toBeGreaterThanOrEqual(3)
    const neg = drawScatter(new Rng(12), { n: 15, slope: -2, intercept: 100, noise: 5, xRange: [0, 20], round: 0, xStep: 1, rRange: [0.6, 0.95] })
    expect(neg.r).toBeLessThan(-0.6)
    expect(neg.r).toBeGreaterThan(-0.95)
    for (const x of neg.xs) expect(Number.isInteger(x)).toBe(true)
  })
  it('is reproducible', () => {
    const a = drawScatter(new Rng('s'), { n: 10, slope: 1, intercept: 0, noise: 1, xRange: [0, 10] })
    const b = drawScatter(new Rng('s'), { n: 10, slope: 1, intercept: 0, noise: 1, xRange: [0, 10] })
    expect(a.points).toEqual(b.points)
  })
})

describe('drawTwoWay', () => {
  it('produces consistent totals, honors minCell and reflects association strength', () => {
    const t = drawTwoWay(new Rng(5), { rows: ['A', 'B', 'C'], cols: ['x', 'y'], n: 90, minCell: 4 })
    expect(t.total).toBe(90)
    expect(t.rowTotals.reduce((a, b) => a + b, 0)).toBe(90)
    expect(t.colTotals.reduce((a, b) => a + b, 0)).toBe(90)
    for (const row of t.counts) for (const c of row) expect(c).toBeGreaterThanOrEqual(4)
    expect(t.expected[0][0]).toBeCloseTo((t.rowTotals[0] * t.colTotals[0]) / 90)
    // Strong association: conditional column distributions differ between rows more than under independence.
    const strong = drawTwoWay(new Rng(9), { rows: ['A', 'B'], cols: ['x', 'y'], n: 2000, association: 1 })
    const none = drawTwoWay(new Rng(9), { rows: ['A', 'B'], cols: ['x', 'y'], n: 2000, association: 0 })
    const gap = (tt: typeof strong) => Math.abs(tt.counts[0][0] / tt.rowTotals[0] - tt.counts[1][0] / tt.rowTotals[1])
    expect(gap(strong)).toBeGreaterThan(0.3)
    expect(gap(none)).toBeLessThan(0.1)
    expect(() => drawTwoWay(new Rng(1), { rows: ['A'], cols: ['x', 'y'], n: 10 })).toThrow()
  })
})

describe('framing helpers', () => {
  it('pickContext, tableMd, listNumbers, tableSpec', () => {
    expect(['a', 'b']).toContain(pickContext(new Rng(1), ['a', 'b']))
    expect(() => pickContext(new Rng(1), [])).toThrow()
    expect(tableMd(['Hull', 'Mass'], [['A|1', 12.345], ['B', 7]], 1)).toBe('| Hull | Mass |\n| --- | --- |\n| A\\|1 | 12.3 |\n| B | 7.0 |')
    expect(tableMd(['x'], [[1.5]])).toBe('| x |\n| --- |\n| 1.5 |')
    expect(listNumbers([1.25, -2], 1)).toBe('1.3, −2.0')
    expect(tableSpec(['a'], [[1]])).toEqual({ kind: 'table', columns: ['a'], rows: [[1]] })
  })
  it('retry throws after the cap', () => {
    expect(() => retry(new Rng(1), (r) => r.int(0, 9), () => false, 5)).toThrow(/5 tries/)
  })
})

describe('validation', () => {
  const good: ProblemGenerator = {
    id: 'act-1/example',
    label: 'Example',
    ap_topics: ['1.7'],
    generate: () => ({ prompt: 'p', hints: ['a', 'b'], solution: 'mean = 12.3', answer: { type: 'numeric', value: 12.34, digits: 1 } }),
  }
  it('validateGeneratorDefinition catches bad ids, topics, labels', () => {
    expect(validateGeneratorDefinition(good)).toEqual([])
    expect(validateGeneratorDefinition({ ...good, id: 'Act-1/Example' })).toHaveLength(1)
    expect(validateGeneratorDefinition({ ...good, id: 'act-11/x' })).toHaveLength(1)
    expect(validateGeneratorDefinition({ ...good, ap_topics: [] })).toHaveLength(1)
    expect(validateGeneratorDefinition({ ...good, ap_topics: ['unit one'] })).toHaveLength(1)
    expect(validateGeneratorDefinition({ ...good, label: ' ' })).toHaveLength(1)
    expect(() => defineGenerator({ ...good, id: 'bad id' })).toThrow(GeneratorValidationError)
  })
  it('validateInstance catches drift, hint counts, bad choices and display specs', () => {
    const base = good.generate(new Rng(1))
    expect(validateInstance(base)).toEqual([])
    expect(validateInstance({ ...base, hints: ['only one'] })[0]).toMatch(/hints must have 2–3/)
    expect(validateInstance({ ...base, hints: ['1', '2', '3', '4'] })[0]).toMatch(/hints must have 2–3/)
    expect(validateInstance({ ...base, solution: 'the mean is 99.9' })[0]).toMatch(/drift/)
    expect(validateInstance({ ...base, solution: 'the mean is −12.3' })).toEqual([]) // unicode minus tolerated
    expect(validateInstance({ ...base, answer: { type: 'numeric', value: NaN } })[0]).toMatch(/not finite/)
    expect(validateInstance({ ...base, answer: { type: 'choice', options: ['a', 'a'], correct: 0 } })[0]).toMatch(/distinct/)
    expect(validateInstance({ ...base, answer: { type: 'choice', options: ['a', 'b'], correct: 2 } })[0]).toMatch(/out of range/)
    expect(validateInstance({ ...base, answer: { type: 'multi', options: ['a', 'b'], correct: [] } })[0]).toMatch(/≥ 1 correct/)
    expect(validateInstance({ ...base, answer: { type: 'interpretation', required: [], exemplar: 'x' } })[0]).toMatch(/≥ 1 required/)
    expect(validateInstance({ ...base, answer: { type: 'interpretation', required: [{ label: 'A', phrasings: ['reject'] }], exemplar: 'we fail to reject' } })[0]).toMatch(/exemplar fails/)
    expect(validateInstance({ ...base, answer: { type: 'interpretation', required: [{ label: 'A', phrasings: ['reject'] }], exemplar: 'we reject' } })).toEqual([])
    expect(validateInstance({ ...base, data: { kind: 'table', columns: ['a', 'b'], rows: [[1]] } })[0]).toMatch(/every table row/)
    expect(validateInstance({ ...base, answer: { type: 'display', display: { kind: 'dotplot', values: [] }, question: { type: 'numeric', value: 12.34, digits: 1 } } })[0]).toMatch(/values must be/)
    expect(validateDisplaySpec({ kind: 'scatter', points: [{ x: 1, y: 1 }] })).toHaveLength(1)
    expect(validateDisplaySpec({ kind: 'bar', categories: ['a'], counts: [1, 2] })).toHaveLength(1)
    expect(validateDisplaySpec({ kind: 'normal', mean: 0, sd: 0 })).toHaveLength(1)
    expect(validateDisplaySpec({ kind: 'boxplot', groups: [{ name: 'g', values: [1, 2] }] })).toEqual([])
  })
  it('numbersIn extracts numbers from Markdown/KaTeX', () => {
    expect(numbersIn('$\\bar{x} = \\frac{61.2}{5} = 12.24$, so **12.2 km** (−3, 1,234)')).toEqual([61.2, 5, 12.24, 12.2, -3, 1234])
  })
  it('defineGenerator self-checks every draw', () => {
    const drifting = defineGenerator({
      ...good,
      id: 'act-1/drifting',
      generate: (rng) => {
        const v = rng.uniform(1, 2)
        return { prompt: 'p', hints: ['a', 'b'], solution: 'answer: 99', answer: { type: 'numeric', value: v } }
      },
    })
    expect(() => instantiateWith(drifting, 1)).toThrow(/drift/)
    const fine = defineGenerator({ ...good, id: 'act-1/fine' })
    const inst: ProblemInstance = instantiateWith(fine, 1)
    expect(inst.answer.type).toBe('numeric')
    expect(fine.id).toBe('act-1/fine')
    expect(fine.label).toBe('Example')
  })
  it('numericAnswer passes extras through', () => {
    expect(numericAnswer(0.5, 'proportion', { units: '' })).toMatchObject({ kind: 'proportion', value: 0.5 })
  })
})
