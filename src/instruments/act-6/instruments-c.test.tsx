/**
 * act-6-05's instrument: the DecisionConsole. Every assertion recomputes what the panel claims from
 * `@/lib/stats` or `data.ts` — the decision from `reject`, the intervals from `twoPropInterval`
 * (through `differenceInterval`), and the live grading from the same `gradeInterpretation` call the
 * mission beat makes. jsdom has no layout, so `useChartFrame` falls back to its default width; the
 * duality overlay is asserted through its data-table fallback rather than its geometry.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { fmt, fmtP, reject } from '@/lib/stats'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { AGENCY_FORBIDDEN, conclusionInContextRubric } from '@/lib/problems/generators/act-6/conclusion'
import { DIFFERENCE_INTERVAL, PERRINE_TEST, differenceInterval } from './data'
import { DecisionConsole } from './DecisionConsole'

/** Text of the value cell of the <Readout> whose label is exactly `label`. */
function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

const P = PERRINE_TEST.pValue!

/** The rubric the console grades with, rebuilt here from its documented defaults. */
const laneRubric = (pValue: number, alpha: number) =>
  conclusionInContextRubric({
    pValue,
    alpha,
    direction: 'greater',
    parameter: 'loss rate',
    population: 'hulls whose policies name Perrine Holdings on the Hundred-Day Lane',
    variable: 'per transit',
    nullValue: 'the rate for hulls naming any other beneficiary',
    directionWords: ['often'],
    extraForbidden: AGENCY_FORBIDDEN,
  })

describe('<DecisionConsole> (act-6-05)', () => {
  it('opens on the Lane’s own p-value at the conventional α and rejects H₀', () => {
    render(<DecisionConsole />)
    expect(screen.getByRole('region', { name: /Decision console/ })).toBeInTheDocument()
    expect(readout('p-value')).toBe(fmtP(P))
    expect(readout('α')).toBe(fmt(0.05, 2))
    expect(reject(P, 0.05)).toBe(true)
    expect(readout('decision')).toBe('REJECT H₀')
  })

  it('prints the exact α at which the decision turns over — the p-value itself', () => {
    render(<DecisionConsole />)
    expect(readout('decision flips at α =')).toBe(fmtP(P))
  })

  it('flips the decision when α crosses the p-value, in both directions', () => {
    render(<DecisionConsole />)
    const alphaSlider = screen.getByRole('slider', { name: /α \(continuous\)/ })

    // α below p: the same data, the other decision.
    fireEvent.change(alphaSlider, { target: { value: '0.0005' } })
    expect(reject(P, 0.0005)).toBe(false)
    expect(readout('decision')).toBe('FAIL TO REJECT H₀')
    expect(readout('α')).toBe(fmt(0.0005, 4))

    // Back above it.
    fireEvent.change(alphaSlider, { target: { value: '0.0010' } })
    expect(reject(P, 0.001)).toBe(true)
    expect(readout('decision')).toBe('REJECT H₀')
  })

  it('takes α from the conventional presets, and 0.001 still rejects this p', () => {
    render(<DecisionConsole />)
    fireEvent.click(screen.getByRole('radio', { name: '0.001' }))
    expect(readout('α')).toBe(fmt(0.001, 4))
    expect(reject(P, 0.001)).toBe(true)
    expect(readout('decision')).toBe('REJECT H₀')
    fireEvent.click(screen.getByRole('radio', { name: '0.10' }))
    expect(readout('α')).toBe(fmt(0.1, 2))
  })

  it('drives the p-value and resets to the observed one', () => {
    render(<DecisionConsole />)
    const pSlider = screen.getByRole('slider', { name: /p-value/ })
    fireEvent.change(pSlider, { target: { value: '0.1200' } })
    expect(readout('p-value')).toBe(fmtP(0.12))
    expect(readout('decision')).toBe('FAIL TO REJECT H₀')
    fireEvent.click(screen.getByRole('button', { name: /RESET TO OBSERVED p/ }))
    expect(readout('p-value')).toBe(fmtP(P))
  })

  it('grades the assembled sentence live, with the same rubric as the mission beat', () => {
    render(<DecisionConsole />)
    expect(readout('verdict')).toBe('—')

    fireEvent.click(screen.getByRole('button', { name: /^We reject H₀$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^p = .* is less than α/ }))
    fireEvent.click(screen.getByRole('button', { name: /^There is convincing evidence that$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^the true loss rate is greater than/ }))
    fireEvent.click(screen.getByRole('button', { name: /^per transit, among hulls whose policies/ }))

    expect(readout('verdict')).toBe('WOULD STAND')
    const table = screen.getByRole('table', { name: /Rubric elements/ })
    expect(within(table).queryAllByText('no')).toHaveLength(0)

    // And the panel's own reading agrees with grading the sentence directly.
    const shown = screen.getByText(/^We reject H₀ because the p-value/)
    expect(gradeInterpretation(laneRubric(P, 0.05), shown.textContent ?? '').correct).toBe(true)
    expect(readout('rubric elements met')).toBe('6 / 6')
  })

  it('strikes “proves”, and says why', () => {
    render(<DecisionConsole />)
    fireEvent.click(screen.getByRole('button', { name: /^We reject H₀$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^p = .* is less than α/ }))
    fireEvent.click(screen.getByRole('button', { name: /^This proves that$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^the true loss rate is greater than/ }))
    fireEvent.click(screen.getByRole('button', { name: /^per transit, among hulls whose policies/ }))

    expect(readout('verdict')).toBe('WOULD BE STRUCK')
    expect(screen.getByText(/Struck — Claims proof\./)).toBeInTheDocument()
  })

  it('strikes “targeted” — the word act-6-05 is named for', () => {
    render(<DecisionConsole />)
    fireEvent.click(screen.getByRole('button', { name: /^We reject H₀$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^p = .* is less than α/ }))
    fireEvent.click(screen.getByRole('button', { name: /^There is convincing evidence that$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^somebody is targeting these hulls$/ }))
    expect(readout('verdict')).toBe('WOULD BE STRUCK')
    expect(screen.getByText(/Struck — “targeted”\./)).toBeInTheDocument()
  })

  it('marks the context element missing when the learner leaves the context out', () => {
    render(<DecisionConsole />)
    fireEvent.click(screen.getByRole('button', { name: /^We reject H₀$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^p = .* is less than α/ }))
    fireEvent.click(screen.getByRole('button', { name: /^There is convincing evidence that$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^the true loss rate is greater than/ }))
    fireEvent.click(screen.getByRole('button', { name: /leave the context out/ }))

    expect(readout('verdict')).toBe('WOULD BE STRUCK')
    const table = screen.getByRole('table', { name: /Rubric elements/ })
    const rows = within(table).getAllByRole('row').slice(1)
    const context = rows.find((r) => /context/i.test(r.textContent ?? ''))
    expect(context?.textContent).toMatch(/no$/)
  })

  it('re-grades the SAME draft as wrong once α drops below the p-value', () => {
    render(<DecisionConsole />)
    fireEvent.click(screen.getByRole('button', { name: /^We reject H₀$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^p = .* is less than α/ }))
    fireEvent.click(screen.getByRole('button', { name: /^There is convincing evidence that$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^the true loss rate is greater than/ }))
    fireEvent.click(screen.getByRole('button', { name: /^per transit, among hulls whose policies/ }))
    expect(readout('verdict')).toBe('WOULD STAND')

    fireEvent.change(screen.getByRole('slider', { name: /α \(continuous\)/ }), { target: { value: '0.0005' } })
    expect(readout('decision')).toBe('FAIL TO REJECT H₀')
    expect(readout('verdict')).toBe('WOULD BE STRUCK')
  })

  it('draws both duality intervals from twoPropInterval, with a data-table fallback', () => {
    render(<DecisionConsole />)
    const [lo, hi] = DIFFERENCE_INTERVAL.ci as [number, number]
    expect(lo).toBeGreaterThan(0)

    const chart = screen.getByRole('img', { name: /confidence intervals drawn against zero/i })
    expect(chart).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /The two intervals and what each one corresponds to/ })
    expect(within(table).getByText(fmt(lo, 4))).toBeInTheDocument()
    expect(within(table).getByText(fmt(hi, 4))).toBeInTheDocument()

    // The (1 − 2α) interval is the one that matches the one-sided test at α.
    const [wLo, wHi] = differenceInterval(0.9).ci as [number, number]
    expect(within(table).getByText(fmt(wLo, 4))).toBeInTheDocument()
    expect(within(table).getByText(fmt(wHi, 4))).toBeInTheDocument()
    expect(wHi - wLo).toBeLessThan(hi - lo)
  })

  it('states the duality honestly: pooled test SE is not the interval’s unpooled SE', () => {
    render(<DecisionConsole />)
    expect(DIFFERENCE_INTERVAL.se).not.toBeCloseTo(PERRINE_TEST.se, 5)
    expect(screen.getByText(/near-identity, not an algebraic one/)).toBeInTheDocument()
    expect(screen.getByText(/the test we actually ran is one-sided/i)).toBeInTheDocument()
  })

  it('is keyboard operable and every chart carries a description', () => {
    render(<DecisionConsole />)
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('tabindex')
    for (const s of screen.getAllByRole('slider')) expect(s).toHaveAttribute('aria-valuetext')
    const chips = screen.getAllByRole('button', { pressed: false })
    expect(chips.length).toBeGreaterThanOrEqual(15)
    expect(screen.getAllByRole('img').length).toBe(1)
  })

  it('accepts overridden counts and grades against the overridden context', () => {
    render(<DecisionConsole p={0.2} alpha={0.05} x1={40} n1={500} x2={30} n2={600} parameter="fault rate" variable="per run" population="hulls fitted with the older scrubber" otherGroup="the rate for hulls with the current set" />)
    expect(readout('p-value')).toBe(fmtP(0.2))
    expect(readout('decision')).toBe('FAIL TO REJECT H₀')
    fireEvent.click(screen.getByRole('button', { name: /^We fail to reject H₀$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^p = .* is greater than α/ }))
    fireEvent.click(screen.getByRole('button', { name: /^There is not convincing evidence that$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^the true fault rate is greater than/ }))
    fireEvent.click(screen.getByRole('button', { name: /^per run, among hulls fitted with the older scrubber$/ }))
    expect(readout('verdict')).toBe('WOULD STAND')
  })
})
