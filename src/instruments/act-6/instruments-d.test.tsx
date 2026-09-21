/**
 * Act VI group-D instruments: PowerExplorer (act-6-06) and DifferencePanel (act-6-07).
 *
 * Every expected number is recomputed here from `@/lib/stats` or from `data.ts`, never typed in.
 * jsdom has no layout, so `useChartFrame` falls back to its default width; no canvas path is
 * exercised (both panels draw SVG only).
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { fmt, fmtInt, twoPropInterval, zStar } from '@/lib/stats'
import {
  ALTERNATIVE_COMPARABLE,
  ALTERNATIVE_DOUBLING,
  DIFFERENCE_INTERVAL,
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_LOSSES,
  PERRINE_TRANSITS,
  POWER_AT_01,
  POWER_AT_05,
  POWER_COMPARABLE_01,
  POWER_COMPARABLE_05,
  powerTwoProportion,
} from './data'
import { PowerExplorer } from './PowerExplorer'
import { DifferencePanel } from './DifferencePanel'

/** Text of the value cell of the <Readout> whose label is exactly `label`. */
function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

/** Commit a NumberField the way a learner does: type, then blur. */
function setField(label: string, value: number) {
  const input = screen.getByLabelText(label)
  fireEvent.change(input, { target: { value: String(value) } })
  fireEvent.blur(input)
}

// ---------------------------------------------------------------------------------------------
// PowerExplorer (act-6-06)
// ---------------------------------------------------------------------------------------------

describe('<PowerExplorer> (act-6-06)', () => {
  it('opens on the difference specified before the test and reproduces POWER_AT_05', () => {
    render(<PowerExplorer />)
    expect(screen.getByRole('region', { name: /error and power explorer/i })).toBeInTheDocument()
    expect(readout('α · Type I error rate')).toBe(fmt(0.05, 3))
    expect(readout('power · 1 − β')).toBe(fmt(POWER_AT_05.power, 3))
    expect(readout('β · Type II error rate')).toBe(fmt(POWER_AT_05.beta, 3))
    expect(readout('difference needed to reject')).toBe(fmt(POWER_AT_05.rejectAbove, 5))
    expect(readout('SE under H₀ (pooled)')).toBe(fmt(POWER_AT_05.se0, 5))
    expect(readout('SE under Hₐ (unpooled)')).toBe(fmt(POWER_AT_05.seA, 5))
    expect(readout('n₁ · n₂')).toBe(`${fmtInt(PERRINE_TRANSITS)} · ${fmtInt(OTHER_TRANSITS)}`)
    // The beat-sheet target: ≈ 0.90.
    expect(POWER_AT_05.power).toBeCloseTo(0.9, 2)
  })

  it('power falls when α falls — the price of the stricter cutoff, to the digit', () => {
    render(<PowerExplorer />)
    const slider = screen.getByRole('slider', { name: /rejection cutoff/i })
    fireEvent.change(slider, { target: { value: '1' } })
    expect(readout('α · Type I error rate')).toBe(fmt(0.01, 3))
    expect(readout('power · 1 − β')).toBe(fmt(POWER_AT_01.power, 3))
    expect(readout('β · Type II error rate')).toBe(fmt(POWER_AT_01.beta, 3))
    // And the cutoff itself moved outward.
    expect(POWER_AT_01.rejectAbove).toBeGreaterThan(POWER_AT_05.rejectAbove)
    expect(POWER_AT_01.power).toBeLessThan(POWER_AT_05.power)
    expect(POWER_AT_01.power).toBeCloseTo(0.76, 2)
  })

  it('power rises with n, and the panel agrees with powerTwoProportion recomputed from scratch', () => {
    render(<PowerExplorer />)
    const before = Number(readout('power · 1 − β'))
    fireEvent.change(screen.getByRole('slider', { name: /transits in the first group/i }), { target: { value: '1800' } })
    const n1 = 1800
    const n2 = Math.round(n1 * (OTHER_TRANSITS / PERRINE_TRANSITS))
    const expected = powerTwoProportion({ p1: ALTERNATIVE_DOUBLING.p1, n1, p2: ALTERNATIVE_DOUBLING.p2, n2, alpha: 0.05, alt: 'greater' })
    expect(readout('power · 1 − β')).toBe(fmt(expected.power, 3))
    expect(readout('n₁ · n₂')).toBe(`${fmtInt(n1)} · ${fmtInt(n2)}`)
    expect(expected.power).toBeGreaterThan(before)
  })

  it('power falls as the difference the test is asked to catch shrinks', () => {
    render(<PowerExplorer />)
    const before = Number(readout('power · 1 − β'))
    // 12 losses per thousand transits against the fixed 0.007 — the Board's "comparable corridors".
    fireEvent.change(screen.getByRole('slider', { name: /alternative’s rate/i }), { target: { value: '12' } })
    const expected = powerTwoProportion({ p1: 0.012, n1: PERRINE_TRANSITS, p2: ALTERNATIVE_DOUBLING.p2, n2: OTHER_TRANSITS, alpha: 0.05, alt: 'greater' })
    expect(readout('power · 1 − β')).toBe(fmt(expected.power, 3))
    expect(expected.power).toBeLessThan(before)
  })

  it('prices both named alternatives at both α options in the fallback table', () => {
    render(<PowerExplorer />)
    const table = screen.getByRole('table', { name: /Alpha, beta and power at each significance level/i })
    for (const r of [POWER_AT_05, POWER_AT_01, POWER_COMPARABLE_05, POWER_COMPARABLE_01]) {
      expect(within(table).getAllByText(fmt(r.power, 3)).length).toBeGreaterThan(0)
    }
    // Against the Board's "comparable corridors" the Ledger is very nearly blind, at either α.
    expect(POWER_COMPARABLE_05.power).toBeLessThan(0.12)
    expect(POWER_COMPARABLE_01.power).toBeLessThan(0.12)
    expect(within(table).getAllByText(`${fmt(ALTERNATIVE_COMPARABLE.p1, 3)} vs ${fmt(ALTERNATIVE_COMPARABLE.p2, 3)}`).length).toBe(2)
  })

  it('says in as many words that power is 1 − β and not 1 − α', () => {
    render(<PowerExplorer />)
    expect(screen.getByText(/Power is/)).toHaveTextContent(/not 1 − α/)
  })

  it('renders both charts with a data-table fallback and is keyboard operable', () => {
    render(<PowerExplorer />)
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(3)
    for (const s of sliders) expect(s).toHaveAttribute('type', 'range')
    // The two distributions, and the power curve.
    expect(screen.getByRole('img', { name: /Null and alternative sampling distributions/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Power curves at each significance level/i })).toBeInTheDocument()
    // Three tables: the density fallback, the power-curve fallback, and the price list.
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByRole('table', { name: /Alpha, beta and power/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// DifferencePanel (act-6-07)
// ---------------------------------------------------------------------------------------------

const [LANE_LOWER, LANE_UPPER] = DIFFERENCE_INTERVAL.ci as [number, number]

describe('<DifferencePanel> (act-6-07)', () => {
  it('opens on the Lane’s own beneficiary split and reproduces DIFFERENCE_INTERVAL', () => {
    render(<DifferencePanel />)
    expect(screen.getByRole('region', { name: /Difference of proportions panel/i })).toBeInTheDocument()
    expect(readout('lower endpoint')).toBe(fmt(LANE_LOWER, 5))
    expect(readout('upper endpoint')).toBe(fmt(LANE_UPPER, 5))
    expect(readout('point estimate · p̂₁ − p̂₂')).toBe(fmt(DIFFERENCE_INTERVAL.estimate, 5))
    expect(readout('SE (unpooled)')).toBe(fmt(DIFFERENCE_INTERVAL.se, 5))
    expect(readout('z*')).toBe(fmt(zStar(0.95), 3))
    expect(readout('contains 0')).toBe('no')
    // The clue act-6-07 earns, computed and not typed: 0.4 to 2.4 points per transit.
    expect(LANE_LOWER * 100).toBeCloseTo(0.4, 1)
    expect(LANE_UPPER * 100).toBeCloseTo(2.4, 1)
  })

  it('uses the UNPOOLED standard error, which is not the test’s', () => {
    render(<DifferencePanel />)
    const pooled = (PERRINE_LOSSES + OTHER_LOSSES) / (PERRINE_TRANSITS + OTHER_TRANSITS)
    const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / PERRINE_TRANSITS + 1 / OTHER_TRANSITS))
    expect(readout('SE (unpooled)')).toBe(fmt(DIFFERENCE_INTERVAL.se, 5))
    expect(fmt(sePooled, 5)).not.toBe(fmt(DIFFERENCE_INTERVAL.se, 5))
  })

  it('flips the sign of the whole interval when the order of subtraction is reversed', () => {
    render(<DifferencePanel />)
    fireEvent.click(screen.getByRole('radio', { name: /^all other beneficiaries/ }))
    expect(readout('lower endpoint')).toBe(fmt(-LANE_UPPER, 5))
    expect(readout('upper endpoint')).toBe(fmt(-LANE_LOWER, 5))
    expect(readout('point estimate · p̂₁ − p̂₂')).toBe(fmt(-DIFFERENCE_INTERVAL.estimate, 5))
    // The width, and therefore the standard error, is untouched.
    expect(readout('SE (unpooled)')).toBe(fmt(DIFFERENCE_INTERVAL.se, 5))
  })

  it('re-words the plain-English sentence with the order it is showing', () => {
    render(<DifferencePanel />)
    const sentence = () => screen.getByText(/^We are 95% confident that the true difference/)
    expect(sentence()).toHaveTextContent(/Perrine Holdings minus all other beneficiaries/)
    fireEvent.click(screen.getByRole('radio', { name: /^all other beneficiaries/ }))
    expect(sentence()).toHaveTextContent(/all other beneficiaries minus Perrine Holdings/)
  })

  it('widens the interval with the confidence level, through @/lib/stats', () => {
    render(<DifferencePanel />)
    fireEvent.change(screen.getByRole('slider', { name: /confidence level/i }), { target: { value: '99' } })
    const expected = twoPropInterval({ x1: PERRINE_LOSSES, n1: PERRINE_TRANSITS, x2: OTHER_LOSSES, n2: OTHER_TRANSITS, confidence: 0.99, random: true })
    const [lo, hi] = expected.ci as [number, number]
    expect(readout('lower endpoint')).toBe(fmt(lo, 5))
    expect(readout('upper endpoint')).toBe(fmt(hi, 5))
    expect(readout('z*')).toBe(fmt(zStar(0.99), 3))
    expect(hi - lo).toBeGreaterThan(LANE_UPPER - LANE_LOWER)
  })

  it('checks the four OBSERVED counts and flags a configuration that fails', () => {
    render(<DifferencePanel />)
    const conditions = screen.getByRole('table', { name: /four observed counts/i })
    expect(within(conditions).getAllByRole('row')).toHaveLength(5)
    expect(within(conditions).queryAllByText('NO')).toHaveLength(0)
    expect(screen.getByText(/All four clear 10; the smallest is 12/)).toBeInTheDocument()

    setField('all other beneficiaries · losses (x₂)', 5)
    const flagged = screen.getByRole('table', { name: /four observed counts/i })
    expect(within(flagged).getAllByText('NO')).toHaveLength(1)
    expect(screen.getByText(/does NOT clear 10/)).toBeInTheDocument()
    // And the panel is still reporting the arithmetic @/lib/stats gives for those counts.
    const expected = twoPropInterval({ x1: PERRINE_LOSSES, n1: PERRINE_TRANSITS, x2: 5, n2: OTHER_TRANSITS, confidence: 0.95, random: true })
    expect(readout('lower endpoint')).toBe(fmt((expected.ci as [number, number])[0], 5))
  })

  it('cautions when the interval contains 0, and does not call the rates equal', () => {
    // Nine losses in each group at equal rates: the interval must straddle zero.
    render(<DifferencePanel x1={40} n1={400} x2={44} n2={420} />)
    expect(readout('contains 0')).toBe('yes')
    expect(screen.getByText(/The interval contains 0/)).toHaveTextContent(/not.*the same as saying the two rates are equal/)
  })

  it('renders the difference axis and its data-table fallback, and is keyboard operable', () => {
    render(<DifferencePanel />)
    expect(screen.getByRole('img', { name: /interval for the difference in proportions on a difference axis, with zero marked/i })).toBeInTheDocument()
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('tabindex')
    expect(screen.getByRole('slider', { name: /confidence level/i })).toHaveAttribute('type', 'range')
    expect(screen.getAllByRole('textbox').length).toBe(4)
  })
})
