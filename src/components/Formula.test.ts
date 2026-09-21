import { describe, expect, it } from 'vitest'
import { wrapTerms } from './Formula'

const cls = (i: number) => `\\htmlClass{dr-term dr-term-${i}}`

describe('wrapTerms', () => {
  it('never rewrites inside a control sequence (the \\sqrt / \\sum bug)', () => {
    const out = wrapTerms('s = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n - 1}}', ['s', 'n'])
    expect(out).toContain('\\sqrt')
    expect(out).toContain('\\sum')
    expect(out).toMatch(new RegExp(`${cls(0).replace(/[\\{}]/g, '\\$&')}\\{s\\}`))
    expect(out).toMatch(new RegExp(`${cls(1).replace(/[\\{}]/g, '\\$&')}\\{n\\}`))
  })

  it('does not match inside a longer word', () => {
    const out = wrapTerms('\\text{frequency} + n', ['n'])
    expect(out).toContain('\\text{frequency}')
    expect(out.match(/dr-term-0/g)).toHaveLength(1)
  })

  it('prefers the longer key and never wraps twice', () => {
    const out = wrapTerms('\\bar{x} - x', ['x', '\\bar{x}'])
    // \bar{x} wrapped as key index 1, the standalone x as key index 0, each exactly once.
    expect(out.match(/dr-term-1/g)).toHaveLength(1)
    expect(out.match(/dr-term-0/g)).toHaveLength(1)
    expect(out).not.toContain('dr-term-0}{\\htmlClass')
  })

  it('keeps class indices aligned with the terms object order, not match order', () => {
    const out = wrapTerms('n \\cdot \\bar{x}', ['\\bar{x}', 'n'])
    expect(out).toMatch(/dr-term-0\}\{\\bar\{x\}\}/)
    expect(out).toMatch(/dr-term-1\}\{n\}/)
  })

  it('leaves purely numeric keys alone', () => {
    expect(wrapTerms('2 + 2', ['2'])).toBe('2 + 2')
  })

  it('is a no-op with no terms', () => {
    expect(wrapTerms('\\alpha + \\beta', [])).toBe('\\alpha + \\beta')
  })
})
