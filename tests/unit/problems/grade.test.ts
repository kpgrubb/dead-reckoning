import { describe, expect, it } from 'vitest'
import { DIGITS, TOLERANCE, answerText, formatNumericAnswer, grade, isAnswered, numericTolerance, parseNumber, parseNumeric } from '@/lib/problems/grade'
import { numericAnswer } from '@/lib/problems/generate'
import type { NumericAnswer } from '@/lib/problems/types'

describe('parseNumeric / parseNumber', () => {
  const cases: [string, number | null][] = [
    ['12.5', 12.5],
    [' 12.5 ', 12.5],
    ['1,234.5', 1234.5],
    ['1,234,567', 1234567],
    ['45%', 0.45],
    ['45 percent', 0.45],
    ['3/4', 0.75],
    ['-3/4', -0.75],
    ['−2.1', -2.1], // unicode minus
    ['1.2e-4', 0.00012],
    ['1.2E-4', 0.00012],
    ['1.2 x 10^-4', 0.00012],
    ['1.2 × 10^(-4)', 0.00012],
    ['1.2×10⁻⁴', 0.00012],
    ['10^-3', 0.001],
    ['≈ 0.05', 0.05],
    ['~0.05', 0.05],
    ['approx. 0.05', 0.05],
    ['about 12', 12],
    ['p = 0.03', 0.03],
    ['p-value: 0.03', 0.03],
    ['z ≈ 1.96', 1.96],
    ['t = -2.31', -2.31],
    ['12.5 km', 12.5],
    ['310 K', 310],
    ['0,05', 0.05], // European decimal comma
    ['.5', 0.5],
    ['+3', 3],
    ['', null],
    ['abc', null],
    ['1/0', null],
    ['12 apples and 3', null],
  ]
  for (const [input, want] of cases) {
    it(`parses ${JSON.stringify(input)} → ${want}`, () => {
      const got = parseNumber(input)
      if (want === null) expect(got).toBeNull()
      else expect(got).toBeCloseTo(want, 10)
    })
  }

  it('reports percent and inequality flags', () => {
    expect(parseNumeric('45%')).toEqual({ value: 45, percent: true, inequality: undefined })
    expect(parseNumeric('p < 0.001')).toEqual({ value: 0.001, percent: false, inequality: '<' })
    expect(parseNumeric('< .0001')).toEqual({ value: 0.0001, percent: false, inequality: '<' })
    expect(parseNumeric('less than 0.01')).toMatchObject({ value: 0.01, inequality: '<' })
    expect(parseNumeric('p > 0.05')).toMatchObject({ value: 0.05, inequality: '>' })
    expect(parseNumeric('≤ 0.05')).toMatchObject({ value: 0.05, inequality: '<' })
    expect(parseNumber('p < 0.001')).toBeNull()
    expect(parseNumber(3)).toBe(3)
    expect(parseNumber(NaN)).toBeNull()
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber('45%', { percentAsProportion: false })).toBe(45)
  })
})

describe('tolerance policy', () => {
  it('uses explicit tolerance first, then relative, then kind, then digits', () => {
    expect(numericTolerance({ type: 'numeric', value: 10, tolerance: 0.2 })).toBe(0.2)
    expect(numericTolerance({ type: 'numeric', value: 10, relativeTolerance: 0.01 })).toBeCloseTo(0.1)
    expect(numericTolerance({ type: 'numeric', value: 0.0123, kind: 'pValue' })).toBe(TOLERANCE.pValue)
    expect(numericTolerance({ type: 'numeric', value: 2.31, kind: 'testStat' })).toBe(TOLERANCE.testStat)
    expect(numericTolerance({ type: 'numeric', value: 0.412, kind: 'proportion' })).toBe(TOLERANCE.proportion)
    expect(numericTolerance({ type: 'numeric', value: 12, kind: 'count' })).toBe(TOLERANCE.count)
    expect(numericTolerance({ type: 'numeric', value: 310.4, kind: 'mean', digits: 1 })).toBeCloseTo(0.05, 6)
    expect(numericTolerance({ type: 'numeric', value: 310.4, digits: 1 })).toBeCloseTo(0.05, 6)
    expect(numericTolerance({ type: 'numeric', value: 310.4 })).toBeCloseTo(0.005, 6)
    expect(numericTolerance({ type: 'numeric', value: 42.1, kind: 'percent' })).toBeCloseTo(0.05, 6)
  })

  it('numericAnswer applies kind defaults and auto-enables inequality for tiny p-values', () => {
    const p = numericAnswer(0.00004, 'pValue')
    expect(p.allowInequality).toBe(true)
    expect(numericAnswer(0.03, 'pValue').allowInequality).toBeUndefined()
    expect(numericAnswer(12.34, 'mean', { digits: 1, units: 'km' })).toMatchObject({ type: 'numeric', value: 12.34, kind: 'mean', digits: 1, units: 'km' })
    expect(DIGITS.pValue).toBe(4)
  })

  it('formats answers by kind', () => {
    expect(formatNumericAnswer({ type: 'numeric', value: 0.00004, kind: 'pValue' })).toBe('< 0.0001')
    expect(formatNumericAnswer({ type: 'numeric', value: 0.0123, kind: 'pValue' })).toBe('0.0123')
    expect(formatNumericAnswer({ type: 'numeric', value: -2.314, kind: 'testStat' })).toBe('−2.31')
    expect(formatNumericAnswer({ type: 'numeric', value: 12.345, digits: 1, units: 'km' })).toBe('12.3 km')
    expect(answerText({ type: 'choice', options: ['a', 'b'], correct: 1 })).toBe('b')
    expect(answerText({ type: 'multi', options: ['a', 'b', 'c'], correct: [0, 2] })).toBe('a; c')
    expect(answerText({ type: 'display', display: { kind: 'dotplot', values: [1] }, question: { type: 'numeric', value: 1, digits: 0 } })).toBe('1')
  })
})

describe('grade — numeric', () => {
  const mean: NumericAnswer = { type: 'numeric', value: 12.34, digits: 1, units: 'km' }
  it('accepts within half the last displayed digit', () => {
    expect(grade(mean, '12.3').correct).toBe(true)
    expect(grade(mean, '12.34').correct).toBe(true)
    expect(grade(mean, '12.38').correct).toBe(true)
    expect(grade(mean, '12.4').correct).toBe(false)
    expect(grade(mean, '12.3 km').correct).toBe(true)
  })
  it('diagnoses rounding, sign and percent/proportion errors', () => {
    expect(grade(mean, '12.4').feedback).toMatch(/Close/)
    expect(grade(mean, '-12.3').feedback).toMatch(/Sign/)
    expect(grade(mean, '').feedback).toBe('Enter a number.')
    expect(grade(mean, 'seven').feedback).toBe('Enter a number.')
    expect(grade(mean, '99').feedback).toBe('Not within tolerance.')
    const prop = numericAnswer(0.412, 'proportion')
    expect(grade(prop, '41.2').feedback).toMatch(/proportion between 0 and 1/)
    expect(grade(prop, '41.2%').correct).toBe(true)
    expect(grade(prop, '0.412').correct).toBe(true)
    expect(grade(prop, '0.4125').correct).toBe(true)
    expect(grade(prop, '0.414').correct).toBe(false)
    const pct = numericAnswer(41.2, 'percent', { units: '%' })
    expect(grade(pct, '41.2%').correct).toBe(true)
    expect(grade(pct, '41.2').correct).toBe(true)
    expect(grade(pct, '0.412').feedback).toMatch(/as a percentage/)
  })
  it('handles p-value inequalities', () => {
    const tiny = numericAnswer(0.00004, 'pValue')
    expect(grade(tiny, 'p < 0.001').correct).toBe(true)
    expect(grade(tiny, '< 0.0001').correct).toBe(true)
    expect(grade(tiny, '0.0000').correct).toBe(true)
    expect(grade(tiny, '< 0.05').correct).toBe(false)
    expect(grade(tiny, '< 0.05').feedback).toMatch(/too loose/)
    const p = numericAnswer(0.0123, 'pValue')
    expect(grade(p, '0.0123').correct).toBe(true)
    expect(grade(p, '0.012').correct).toBe(true)
    expect(grade(p, '0.013').correct).toBe(false)
    expect(grade(p, '< 0.05').correct).toBe(false)
    expect(grade(p, '< 0.05').feedback).toMatch(/State the value itself/)
    const custom: NumericAnswer = { type: 'numeric', value: 0.004, kind: 'pValue', allowInequality: { max: 0.01 } }
    expect(grade(custom, 'p < 0.01').correct).toBe(true)
    expect(grade(custom, 'p < 0.001').correct).toBe(false)
    expect(grade(custom, 'p > 0.001').feedback).toMatch(/not a bound/)
  })
  it('honors relative tolerance', () => {
    const a: NumericAnswer = { type: 'numeric', value: 1000, relativeTolerance: 0.01 }
    expect(grade(a, '1009').correct).toBe(true)
    expect(grade(a, '1011').correct).toBe(false)
  })
})

describe('grade — choice / multi / display', () => {
  it('grades choice with per-option feedback', () => {
    const a = { type: 'choice' as const, options: ['mean', 'median', 'mode'], correct: 1, feedback: ['Mean is pulled by outliers.', null, null] }
    expect(grade(a, 1)).toMatchObject({ correct: true, score: 1 })
    expect(grade(a, 0)).toMatchObject({ correct: false, score: 0, feedback: 'Mean is pulled by outliers.' })
    expect(grade(a, 2).feedback).toBe('Not the best answer.')
    expect(grade(a, null).feedback).toBe('Select an option.')
    expect(grade(a, '1').correct).toBe(true)
  })
  it('grades multi as an exact set with diagnostics', () => {
    const a = { type: 'multi' as const, options: ['a', 'b', 'c', 'd'], correct: [0, 2], feedback: [null, 'b is wrong because…', null, null] }
    expect(grade(a, [2, 0]).correct).toBe(true)
    expect(grade(a, [0, 0, 2]).correct).toBe(true)
    const r = grade(a, [0, 1])
    expect(r.correct).toBe(false)
    expect(r.feedback).toMatch(/1 selected option does not apply/)
    expect(r.feedback).toMatch(/1 correct option not selected/)
    expect(r.feedback).toMatch(/b is wrong/)
    expect(grade(a, null).correct).toBe(false)
  })
  it('grades the wrapped question of a display item', () => {
    const a = { type: 'display' as const, display: { kind: 'dotplot' as const, values: [1, 2, 3] }, question: { type: 'choice' as const, options: ['x', 'y'], correct: 0 } }
    expect(grade(a, 0).correct).toBe(true)
    expect(grade(a, 1).correct).toBe(false)
  })
  it('isAnswered by type', () => {
    expect(isAnswered({ type: 'numeric', value: 1 }, '')).toBe(false)
    expect(isAnswered({ type: 'numeric', value: 1 }, '2')).toBe(true)
    expect(isAnswered({ type: 'choice', options: ['a', 'b'], correct: 0 }, null)).toBe(false)
    expect(isAnswered({ type: 'choice', options: ['a', 'b'], correct: 0 }, 0)).toBe(true)
    expect(isAnswered({ type: 'multi', options: ['a', 'b'], correct: [0] }, [])).toBe(false)
    expect(isAnswered({ type: 'multi', options: ['a', 'b'], correct: [0] }, [1])).toBe(true)
    expect(isAnswered({ type: 'interpretation', required: [], exemplar: 'x' }, '  ')).toBe(false)
  })
})
