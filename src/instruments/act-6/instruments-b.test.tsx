/**
 * Act VI group-B instruments and rubrics: HypothesisConsole (act-6-03), PValueVisualiser (act-6-04
 * and, re-used, act-6-08), and the `interpret-p-value` rubric both the drill and act-6-04's mission
 * beat are graded by.
 *
 * Every expected number is computed from `@/lib/stats` or `data.ts`, never typed in. jsdom has no
 * layout, so `useChartFrame` falls back to its default width; no canvas path is exercised (the
 * histogram is one rect per bin whatever the sample size).
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { fmt, fmtP, normal, onePropTest, pValueZ, twoPropTest } from '@/lib/stats'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { interpretPValueRubric } from '@/lib/problems/generators/act-6/p-value'
import { hypothesesInContextRubric } from '@/lib/problems/generators/act-6/hypothesis'
import { PERRINE_LOSSES, PERRINE_TEST, PERRINE_TRANSITS, OTHER_LOSSES, OTHER_TRANSITS, ROOK_2176, simulateNullZ, simulatedPValue } from './data'
import { HYPOTHESIS_CASES, HypothesisConsole } from './HypothesisConsole'
import { PValueVisualiser, ROOK_NULL_RATE } from './PValueVisualiser'

/** Text of the value cell of the <Readout> whose label is exactly `label`. */
function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

// ---------------------------------------------------------------------------------------------
// HypothesisConsole (act-6-03)
// ---------------------------------------------------------------------------------------------

describe('<HypothesisConsole> (act-6-03)', () => {
  it('opens on the Themis Reach case and states hypotheses about parameters, not statistics', () => {
    render(<HypothesisConsole />)
    expect(screen.getByRole('region', { name: /Hypothesis console/ })).toBeInTheDocument()
    expect(screen.getByText('H₀: p₁ = p₂')).toBeInTheDocument()
    expect(screen.getByText('Hₐ: p₁ > p₂')).toBeInTheDocument()
  })

  it('locates the observed value on the null distribution and reports the standardized distance', () => {
    render(<HypothesisConsole />)
    const c = HYPOTHESIS_CASES.themis
    const t = twoPropTest({ x1: c.x1, n1: c.n1, x2: c.x2, n2: c.n2, alt: 'greater', random: true })
    expect(readout('null value')).toBe(fmt(0, 4))
    expect(readout('SE under H₀ (pooled)')).toBe(fmt(t.se, 5))
    expect(readout('p̂₁ − p̂₂ observed')).toBe(fmt(t.estimate, 4))
    expect(readout('standard errors from the null')).toBe(fmt(t.statistic, 2))
  })

  it('never shows a p-value or a shaded tail — that is act-6-04', () => {
    const { container } = render(<HypothesisConsole />)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/p-value|P-VALUE/)
    expect(screen.queryByText(fmtP(twoPropTest({ x1: HYPOTHESIS_CASES.themis.x1, n1: HYPOTHESIS_CASES.themis.n1, x2: HYPOTHESIS_CASES.themis.x2, n2: HYPOTHESIS_CASES.themis.n2, alt: 'greater' }).pValue!))).toBeNull()
    // No shaded area is rendered: the DensityCurve is drawn without a `shade` region.
    expect(container.querySelectorAll('.dr-shade').length).toBe(0)
  })

  it('checks Large Counts with the pooled proportion and flags the tightest product', () => {
    render(<HypothesisConsole />)
    const c = HYPOTHESIS_CASES.themis
    const pooled = (c.x1 + c.x2) / (c.n1 + c.n2)
    const smallest = Math.min(c.n1 * pooled, c.n1 * (1 - pooled), c.n2 * pooled, c.n2 * (1 - pooled))
    expect(smallest).toBeCloseTo(c.n1 * pooled, 10)
    const table = screen.getByRole('table', { name: /Large Counts products/ })
    expect(within(table).getByText(fmt(smallest, 1))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`Closest to failing: n₁ · p̂c = ${fmt(smallest, 1)}`))).toBeInTheDocument()
  })

  it('changing the direction of Hₐ moves nothing on the null distribution', () => {
    render(<HypothesisConsole />)
    const before = readout('standard errors from the null')
    const se = readout('SE under H₀ (pooled)')
    fireEvent.click(screen.getByRole('radio', { name: 'two-sided' }))
    expect(screen.getByText('Hₐ: p₁ ≠ p₂')).toBeInTheDocument()
    expect(readout('standard errors from the null')).toBe(before)
    expect(readout('SE under H₀ (pooled)')).toBe(se)
  })

  it("switches to Asgard's one-proportion patrol and reports the failing condition with its number", () => {
    render(<HypothesisConsole />)
    fireEvent.click(screen.getByRole('radio', { name: HYPOTHESIS_CASES.asgard.label }))
    const c = HYPOTHESIS_CASES.asgard
    const t = onePropTest({ x: c.x, n: c.n, p0: c.p0, alt: 'greater', random: true })
    expect(screen.getByText(`H₀: p = ${fmt(c.p0, 4)}`)).toBeInTheDocument()
    expect(readout('p̂ observed')).toBe(fmt(t.estimate, 4))
    expect(readout('SE under H₀')).toBe(fmt(t.se, 5))
    const np0 = c.n * c.p0
    expect(np0).toBeLessThan(10)
    expect(screen.getByText(new RegExp(`Closest to failing: n · p₀ = ${fmt(np0, 1)} — below 10`))).toBeInTheDocument()
  })

  it('exposes a keyboard-operable control set and a data-table fallback for every chart', () => {
    render(<HypothesisConsole />)
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBeGreaterThanOrEqual(9)
    for (const r of radios) expect(r).toHaveAttribute('tabindex')
    expect(screen.getAllByRole('img').length).toBe(2)
    expect(screen.getByRole('table', { name: /Standardizing the observed value|quantity/ })).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------------------------
// PValueVisualiser (act-6-04; act-6-08 re-uses it)
// ---------------------------------------------------------------------------------------------

describe('<PValueVisualiser> (act-6-04)', () => {
  it('defaults to the Lane beneficiary case and reports the test statistic and one-sided p', () => {
    render(<PValueVisualiser />)
    expect(screen.getByRole('region', { name: /P-value visualiser/ })).toBeInTheDocument()
    expect(readout('statistic')).toBe(fmt(PERRINE_TEST.statistic, 2))
    expect(readout('p (one-sided (upper tail))')).toBe(fmtP(PERRINE_TEST.pValue!))
    expect(readout('p (normal model)')).toBe(fmtP(PERRINE_TEST.pValue!))
  })

  it('reconciles the normal p with ten thousand simulated seasons under H₀', () => {
    render(<PValueVisualiser />)
    const sims = simulateNullZ('lane', 10_000)
    const simP = simulatedPValue(sims, PERRINE_TEST.statistic)
    expect(readout('p (10,000 simulated)')).toBe(fmtP(simP))
    // The clue act-6-04 earns: eight in ten thousand.
    expect(Math.round(simP * 10_000)).toBe(8)
    expect(Math.abs(simP - PERRINE_TEST.pValue!)).toBeLessThan(0.0005)
  })

  it('doubles the p when the alternative is read two-sided, and says so in the table', () => {
    render(<PValueVisualiser />)
    fireEvent.click(screen.getByRole('radio', { name: 'two-sided' }))
    const two = pValueZ(PERRINE_TEST.statistic, 'two-sided')
    expect(two).toBeCloseTo(2 * PERRINE_TEST.pValue!, 12)
    expect(readout('p (two-sided)')).toBe(fmtP(two))
    const table = screen.getByRole('table', { name: /One-sided and two-sided/ })
    expect(within(table).getAllByText(fmtP(pValueZ(PERRINE_TEST.statistic, 'greater'))).length).toBeGreaterThan(0)
  })

  it('toggles between the normal model and the simulated null, both accessible as tables', () => {
    render(<PValueVisualiser />)
    expect(screen.getByRole('img', { name: /normal null distribution/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'simulation' }))
    expect(screen.getByRole('img', { name: /Histogram of 10,000 simulated null statistics/ })).toBeInTheDocument()
    expect(screen.getByText(/Counted, not calculated/)).toBeInTheDocument()
  })

  it('moves the shaded area when the observed statistic is dragged, and resets', () => {
    render(<PValueVisualiser />)
    const slider = screen.getByRole('slider', { name: /observed statistic/i })
    fireEvent.change(slider, { target: { value: '1.50' } })
    expect(readout('statistic')).toBe(fmt(1.5, 2))
    expect(readout('p (one-sided (upper tail))')).toBe(fmtP(pValueZ(1.5, 'greater')))
    fireEvent.click(screen.getByRole('button', { name: /RESET TO OBSERVED/ }))
    expect(readout('statistic')).toBe(fmt(PERRINE_TEST.statistic, 2))
  })

  it('runs in one-proportion mode on Rook’s 2176 report, for act-6-08 and the Briefing', () => {
    render(<PValueVisualiser mode="one-prop" />)
    const t = onePropTest({ x: ROOK_2176.losses, n: ROOK_2176.transits, p0: ROOK_NULL_RATE, alt: 'greater', random: true })
    expect(readout('statistic')).toBe(fmt(t.statistic, 2))
    expect(readout('p (one-sided (upper tail))')).toBe(fmtP(t.pValue!))
    expect(t.pValue!).toBeGreaterThan(0.4)
  })

  it('honours lockAlt and lockObserved (the signed act-6-08 reading)', () => {
    render(<PValueVisualiser lockAlt lockObserved />)
    expect(screen.queryByRole('radio', { name: 'two-sided' })).toBeNull()
    expect(screen.queryByRole('slider', { name: /observed statistic/i })).toBeNull()
    expect(readout('statistic')).toBe(fmt(PERRINE_TEST.statistic, 2))
  })

  it('accepts explicit two-proportion counts', () => {
    render(<PValueVisualiser x1={PERRINE_LOSSES} n1={PERRINE_TRANSITS} x2={OTHER_LOSSES} n2={OTHER_TRANSITS} />)
    expect(readout('statistic')).toBe(fmt(PERRINE_TEST.statistic, 2))
    expect(normal.sf(PERRINE_TEST.statistic)).toBeCloseTo(PERRINE_TEST.pValue!, 12)
  })
})

// ---------------------------------------------------------------------------------------------
// The interpret-p-value rubric — the sentence the book turns on
// ---------------------------------------------------------------------------------------------

describe('interpretPValueRubric (act-6/interpret-p-value and act-6-04’s mission beat)', () => {
  const rubric = interpretPValueRubric({
    pValue: PERRINE_TEST.pValue!,
    alt: 'greater',
    nullInWords: 'Perrine-beneficiary hulls and every other hull are lost at the same rate',
    statisticPhrase: 'a difference in sample loss rates',
    population: 'transits on the Hundred-Day Lane',
    variable: 'loss rate per transit',
  })
  const grade = (s: string) => gradeInterpretation(rubric, s)

  it('passes its own exemplar', () => {
    expect(grade(rubric.exemplar).correct).toBe(true)
  })

  it('accepts an honest sentence written in the learner’s own words', () => {
    const r = grade(
      'Assuming the null hypothesis is true and the two beneficiary classes share one loss rate per transit, the probability of a difference in loss rates between transits on the Hundred-Day Lane at least as extreme as the one observed is 0.0008.',
    )
    expect(r.correct).toBe(true)
    expect(r.score).toBe(1)
  })

  it('rejects “the probability that H₀ is true”', () => {
    const r = grade('There is a 0.0008 probability that H0 is true, so the loss rate per transit for transits on the Hundred-Day Lane is the same in both classes.')
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /probability that H₀ is true/i.test(f.label))).toBe(true)
  })

  it('rejects “due to chance”', () => {
    const r = grade('There is a 0.0008 probability that the difference in the loss rate per transit for transits on the Hundred-Day Lane is due to chance, assuming nothing else is going on.')
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /due to chance/.test(f.label))).toBe(true)
  })

  it('rejects “1 − p is the probability Hₐ is true”', () => {
    const r = grade(
      'If H0 is true the probability of a difference in loss rate per transit at least as extreme as this one among transits on the Hundred-Day Lane is 0.0008, and 1 - p is therefore the probability that Ha is true.',
    )
    expect(r.correct).toBe(false)
  })

  it('does NOT punish a learner who explicitly denies the misconception', () => {
    const r = grade(
      'Assuming H0 is true, the probability of a difference in the loss rate per transit for transits on the Hundred-Day Lane at least as extreme as the observed one is 0.0008. It is not the probability that H0 is true.',
    )
    expect(r.correct).toBe(true)
  })

  it('asks for “at least as extreme” when the sentence describes one exact outcome', () => {
    const r = grade('If H0 is true, the probability of getting exactly this difference in loss rate per transit among transits on the Hundred-Day Lane is 0.0008.')
    expect(r.correct).toBe(false)
    expect(r.feedback).toMatch(/at least as extreme/)
  })
})

describe('hypothesesInContextRubric (act-6/hypotheses-in-context and act-6-03’s mission beat)', () => {
  const rubric = hypothesesInContextRubric({
    kind: 'two',
    alt: 'greater',
    parameter: 'loss rate per transit',
    population: 'transits on the Hundred-Day Lane in the Register snapshot',
    groups: ['hulls whose policies name Perrine Holdings', 'hulls with any other beneficiary'],
    reason: 'the question put to this ship is whether Perrine-beneficiary hulls are lost at a higher rate, and a lower rate would not be an accusation at all',
  })

  it('passes its own exemplar', () => {
    expect(gradeInterpretation(rubric, rubric.exemplar).correct).toBe(true)
  })

  it('rejects hypotheses written about the sample proportions', () => {
    const r = gradeInterpretation(
      rubric,
      'H0: p-hat 1 = p-hat 2 and Ha: p-hat 1 > p-hat 2, where these are the loss rate per transit for hulls whose policies name Perrine Holdings and hulls with any other beneficiary among transits on the Hundred-Day Lane, because the question is whether Perrine-beneficiary hulls are lost at a higher rate.',
    )
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /p̂/.test(f.label))).toBe(true)
  })
})
