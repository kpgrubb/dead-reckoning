import katex from 'katex'
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

  it('braces the substitution so a term in a superscript still parses', () => {
    // `^\htmlClass{â€¦}{m}` is a KaTeX parse error: a superscript takes one token.
    const out = wrapTerms('(1-\\pi)^m', ['m'])
    expect(out).toContain('^{\\htmlClass')
    expect(() => katex.renderToString(out, { throwOnError: true, trust: true, strict: 'ignore' })).not.toThrow()
  })

  it('renders a range of real formulas without a KaTeX error', () => {
    const cases: [string, string[]][] = [
      ['s = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n - 1}}', ['s', 'n', '\\bar{x}', 'x_i']],
      ['\\hat{p} \\pm z^* \\sqrt{\\frac{\\hat{p}(1-\\hat{p})}{n}}', ['\\hat{p}', 'n', 'z^*']],
      ['P(A \\cup B) = P(A) + P(B) - P(A \\cap B)', ['P', 'A', 'B']],
      ['E(X) = \\sum_{k=1}^{\\infty} k\\,(1-p)^{k-1}p', ['p', 'k', 'X']],
      ['\\binom{N}{n} \\text{ subsets, } F \\subseteq S', ['N', 'n', 'F', 'S']],
      ['\\chi^2 = \\sum \\frac{(O - E)^2}{E}', ['O', 'E']],
    ]
    for (const [tex, keys] of cases) {
      const out = wrapTerms(tex, keys)
      expect(() => katex.renderToString(out, { throwOnError: true, trust: true, strict: 'ignore' }), tex).not.toThrow()
    }
  })
})
