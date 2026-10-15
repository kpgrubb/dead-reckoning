/**
 * Markdown table rendering in <RichText>, which is what a drill's prompt uses for a stemplot,
 * a two-way table or a summary row.
 *
 * The defect these exist for: right-alignment was decided per *cell* by testing whether its text
 * parsed as a number. In a stemplot's leaves column that splits the column down the middle — "6"
 * matched and jumped to the right edge, while "8 9" and the em-dash placeholder beside it stayed
 * left. Alignment is a property of a column.
 */
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { RichText } from './RichText'

const table = (text: string) => {
  const { container } = render(<RichText text={text} />)
  const rows = [...container.querySelectorAll('tbody tr')]
  return rows.map((tr) => [...tr.querySelectorAll('td')].map((td) => ({ text: td.textContent ?? '', num: td.classList.contains('is-num') })))
}

describe('RichText markdown tables', () => {
  it('leaves a mixed column alone, including its single-value rows', () => {
    const cells = table(['| stem | leaves |', '| --- | --- |', '| 94 | 6 |', '| 95 | 8 9 |', '| 96 | — |', '| 97 | 0 1 3 |'].join('\n'))
    // The stems are all numbers, so that column is right-aligned.
    expect(cells.map((r) => r[0].num)).toEqual([true, true, true, true])
    // The leaves are not, and "6" must not be singled out just because it parses as one.
    expect(cells.map((r) => r[1].num)).toEqual([false, false, false, false])
    expect(cells[0][1].text).toBe('6')
  })

  it('right-aligns a column that is numeric throughout', () => {
    const cells = table(['| hull | losses |', '| --- | --- |', '| Perrine | 19 |', '| other | 12 |'].join('\n'))
    expect(cells.map((r) => r[1].num)).toEqual([true, true])
    expect(cells.map((r) => r[0].num)).toEqual([false, false])
  })

  it('does not let a placeholder disqualify a numeric column', () => {
    const cells = table(['| office | n |', '| --- | --- |', '| Uruk | 31 |', '| Ceres | — |', '| total | 31 |'].join('\n'))
    expect(cells.map((r) => r[1].num)).toEqual([true, true, true])
  })

  it('treats a column of placeholders as not numeric', () => {
    const cells = table(['| a | b |', '| --- | --- |', '| x | — |', '| y | — |'].join('\n'))
    expect(cells.map((r) => r[1].num)).toEqual([false, false])
  })

  it('lets an explicit alignment marker win over the inferred one', () => {
    const { container } = render(<RichText text={['| n | label |', '| :--- | ---: |', '| 12 | a |'].join('\n')} />)
    const tds = [...container.querySelectorAll('tbody td')]
    expect(tds[0].className).toBe('is-left')
    expect(tds[1].className).toBe('is-right')
  })

  it('gives the header the same alignment as the column under it', () => {
    const { container } = render(<RichText text={['| hull | losses |', '| --- | --- |', '| Perrine | 19 |'].join('\n')} />)
    const ths = [...container.querySelectorAll('thead th')]
    expect(ths[0].classList.contains('is-num')).toBe(false)
    expect(ths[1].classList.contains('is-num')).toBe(true)
  })
})
