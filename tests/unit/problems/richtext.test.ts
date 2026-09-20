import { describe, expect, it } from 'vitest'
import { escapeHtml, markdownToHtml } from '@/components/RichText'

describe('markdownToHtml', () => {
  it('renders paragraphs, bold, em, code and line breaks', () => {
    expect(markdownToHtml('Hello **bold** and *em* with `code`.\nNext line.')).toBe('<p>Hello <strong>bold</strong> and <em>em</em> with <code>code</code>.<br/>Next line.</p>')
    expect(markdownToHtml('a\n\nb')).toBe('<p>a</p><p>b</p>')
  })
  it('renders lists and headings', () => {
    expect(markdownToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>')
    expect(markdownToHtml('1. one\n2) two')).toBe('<ol><li>one</li><li>two</li></ol>')
    expect(markdownToHtml('## Title')).toBe('<h4>Title</h4>')
    expect(markdownToHtml('> quoted')).toBe('<blockquote>quoted</blockquote>')
  })
  it('renders GFM tables with alignment and numeric cells', () => {
    const html = markdownToHtml('| Hull | Mass | Note |\n| --- | ---: | :---: |\n| A\\|1 | 12.3 | **x** |\n| B | −7 | y |')
    expect(html).toContain('<table class="dr-table">')
    expect(html).toContain('<th scope="col">Hull</th>')
    expect(html).toContain('<th scope="col" class="is-right">Mass</th>')
    expect(html).toContain('<td>A|1</td>')
    expect(html).toContain('<td class="is-right">12.3</td>')
    expect(html).toContain('<td class="is-center"><strong>x</strong></td>')
    expect(html).toContain('<td class="is-right">−7</td>')
    // Numeric cells without explicit alignment are right-aligned.
    expect(markdownToHtml('| a | b |\n| --- | --- |\n| 1,234 | word |')).toContain('<td class="is-num">1,234</td>')
    // Not a table without the separator row.
    expect(markdownToHtml('| a | b |\n| c | d |')).toContain('<p>')
  })
  it('renders inline and display math, including display math mid-paragraph', () => {
    const inlineHtml = markdownToHtml('mean $\\bar{x}$ here')
    expect(inlineHtml).toContain('katex')
    expect(inlineHtml).not.toContain('$')
    const display = markdownToHtml('Sum:\n$$\\frac{a}{b}$$\nDone.')
    expect(display).toContain('<div class="dr-math-display">')
    expect(display).toContain('katex-display')
    expect(display.indexOf('Sum')).toBeLessThan(display.indexOf('dr-math-display'))
    expect(display.indexOf('dr-math-display')).toBeLessThan(display.indexOf('Done'))
    const multi = markdownToHtml('$$\n\\bar{x} = 1\n$$')
    expect(multi).toContain('katex-display')
  })
  it('does not confuse numbers in text with math placeholders', () => {
    const html = markdownToHtml('With $n$ = 12 values and 3 hints')
    expect(html).toContain('= 12 values and 3 hints')
    expect(html).not.toContain('undefined')
  })
  it('escapes HTML from generator text (no XSS)', () => {
    const html = markdownToHtml('<script>alert(1)</script> **<b>x</b>** `<i>` | <img onerror=x> |\n| --- | --- |\n| <a> | b |')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('<strong>&lt;b&gt;x&lt;/b&gt;</strong>')
    expect(html).toContain('<code>&lt;i&gt;</code>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<a>')
    expect(markdownToHtml('$\\href{javascript:alert(1)}{x}$')).not.toMatch(/href=["']javascript/)
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })
  it('handles empty and CRLF input', () => {
    expect(markdownToHtml('')).toBe('')
    expect(markdownToHtml('a\r\n\r\nb')).toBe('<p>a</p><p>b</p>')
  })
})
