/**
 * Act VII group-C instruments: TransitAnomalyPanel (act-7-06), ProcedureSelector and
 * BootstrapMachine (act-7-07), plus a regression that TPValueVisualiser still renders correctly in
 * `mode="two-sample"` with act-7-06's two groups.
 *
 * Every expected number is recomputed from `@/lib/stats` or read from `data.ts`, never typed in.
 * jsdom has no layout, so `useChartFrame` falls back to its default width and no canvas path is
 * exercised; the histogram is one rect per bin whatever the resample count.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { conservativeDf, fmt, fmtInt, fmtP, mean, oneMeanInterval, pValueT, sd, twoMeanInterval, twoMeanTest, welchDf } from '@/lib/stats'
import { BRIEF_FINDINGS, LOST_VS_SURVIVING_CONSERVATIVE, LOST_VS_SURVIVING_INTERVAL, LOST_VS_SURVIVING_TEST, bootstrapNineteen, lostPerrineDelays, survivingPerrineDelays } from './data'
import { TransitAnomalyPanel } from './TransitAnomalyPanel'
import { ProcedureSelector } from './ProcedureSelector'
import { BootstrapMachine } from './BootstrapMachine'
import { TPValueVisualiser } from './TPValueVisualiser'

/** Text of the value cell of the <Readout> whose label is exactly `label`. */
function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

// ---------------------------------------------------------------------------------------------
// TransitAnomalyPanel (act-7-06)
// ---------------------------------------------------------------------------------------------

describe('<TransitAnomalyPanel> (act-7-06)', () => {
  it('opens on the test reading of the nineteen against the eight hundred and eighty-one', () => {
    render(<TransitAnomalyPanel />)
    expect(screen.getByRole('region', { name: /Transit anomaly panel/ })).toBeInTheDocument()
    expect(readout('x̄₁ − x̄₂')).toBe(fmt(LOST_VS_SURVIVING_TEST.estimate, 4))
    expect(readout('SE (unpooled)')).toBe(fmt(LOST_VS_SURVIVING_TEST.se, 4))
    expect(readout('t')).toBe(fmt(LOST_VS_SURVIVING_TEST.statistic, 3))
    expect(readout('df')).toBe(fmt(LOST_VS_SURVIVING_TEST.df!, 2))
    expect(readout('P (one-sided)')).toBe(fmtP(LOST_VS_SURVIVING_TEST.pValue!))
  })

  it('recomputes its own headline from the library rather than trusting the export', () => {
    const fresh = twoMeanTest(lostPerrineDelays, survivingPerrineDelays, { alt: 'greater', random: true })
    expect(fresh.statistic).toBeCloseTo(LOST_VS_SURVIVING_TEST.statistic, 12)
    expect(fresh.df!).toBeCloseTo(welchDf(sd(lostPerrineDelays), lostPerrineDelays.length, sd(survivingPerrineDelays), survivingPerrineDelays.length), 10)
    expect(fresh.estimate).toBeCloseTo(mean(lostPerrineDelays) - mean(survivingPerrineDelays), 12)
  })

  it('switches to the interval reading without moving the estimate or the standard error — the whole point', () => {
    render(<TransitAnomalyPanel />)
    const estimate = readout('x̄₁ − x̄₂')
    const se = readout('SE (unpooled)')
    fireEvent.click(screen.getByRole('radio', { name: /how large/ }))
    expect(readout('x̄₁ − x̄₂')).toBe(estimate)
    expect(readout('SE (unpooled)')).toBe(se)
    const [lo, hi] = LOST_VS_SURVIVING_INTERVAL.ci as [number, number]
    expect(readout('95% lower')).toBe(fmt(lo, 4))
    expect(readout('95% upper')).toBe(fmt(hi, 4))
    expect(readout('contains 0')).toBe('no')
    // The test readouts are gone; the two readings are alternatives, not a pile.
    expect(screen.queryByText('P (one-sided)', { selector: '.dr-readout__label' })).toBeNull()
  })

  it('the conservative df rule changes the degrees of freedom and leaves t alone', () => {
    render(<TransitAnomalyPanel />)
    const t = readout('t')
    const cons = conservativeDf(lostPerrineDelays.length, survivingPerrineDelays.length)
    expect(cons).toBe(18)
    fireEvent.click(screen.getByRole('radio', { name: `conservative · ${fmtInt(cons)}` }))
    expect(readout('t')).toBe(t)
    expect(readout('df')).toBe(fmt(LOST_VS_SURVIVING_CONSERVATIVE.df!, 0))
    expect(readout('P (one-sided)')).toBe(fmtP(LOST_VS_SURVIVING_CONSERVATIVE.pValue!))
  })

  it('the two-sided alternative doubles the tail area', () => {
    render(<TransitAnomalyPanel />)
    fireEvent.click(screen.getByRole('radio', { name: 'μ₁ − μ₂ ≠ 0' }))
    const two = twoMeanTest(lostPerrineDelays, survivingPerrineDelays, { alt: 'two-sided', random: true })
    expect(readout('P (two-sided)')).toBe(fmtP(two.pValue!))
    expect(two.pValue!).toBeCloseTo(2 * pValueT(LOST_VS_SURVIVING_TEST.statistic, LOST_VS_SURVIVING_TEST.df!, 'greater'), 12)
  })

  it('prints the interval and the test side by side, with the conditions and the scope limits', () => {
    render(<TransitAnomalyPanel />)
    const table = screen.getByRole('table', { name: /interval reading and the test reading/ })
    expect(within(table).getAllByRole('row').length).toBe(7)
    expect(screen.getByRole('table', { name: 'Group summaries' })).toBeInTheDocument()
    expect(screen.getByText(/What this does not establish/)).toBeInTheDocument()
    expect(screen.getByText(/not a random sample of/)).toBeInTheDocument()
    // One dotplot for the nineteen, one histogram for the 881, both with an accessible name.
    expect(screen.getByRole('img', { name: /Dotplot of Mark-9 delay/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Histogram of Mark-9 delay/ })).toBeInTheDocument()
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('tabindex')
  })

  it('the confidence slider widens the interval without moving the estimate', () => {
    render(<TransitAnomalyPanel />)
    fireEvent.click(screen.getByRole('radio', { name: /how large/ }))
    const estimate = readout('x̄₁ − x̄₂')
    fireEvent.change(screen.getByRole('slider', { name: /confidence level/i }), { target: { value: '99' } })
    const at99 = twoMeanInterval(lostPerrineDelays, survivingPerrineDelays, { confidence: 0.99, random: true })
    expect(readout('x̄₁ − x̄₂')).toBe(estimate)
    expect(readout('99% lower')).toBe(fmt((at99.ci as [number, number])[0], 4))
  })
})

// ---------------------------------------------------------------------------------------------
// ProcedureSelector (act-7-07)
// ---------------------------------------------------------------------------------------------

describe('<ProcedureSelector> (act-7-07)', () => {
  it('opens on the tree and explains a wrong turn at the turn', () => {
    render(<ProcedureSelector />)
    expect(screen.getByRole('region', { name: /Procedure selector/ })).toBeInTheDocument()
    // Finding 1 is the loss-rate comparison: a categorical outcome on two groups.
    expect(BRIEF_FINDINGS[0].procedure).toBe('two-prop')
    fireEvent.click(screen.getByRole('button', { name: 'a number, on a scale' }))
    expect(screen.getByText(/no mean to estimate/)).toBeInTheDocument()
    // The tree did not advance.
    expect(screen.queryByRole('button', { name: 'one group' })).toBeNull()
  })

  it('walks a finding to the procedure and shows the finding’s own reason', () => {
    render(<ProcedureSelector />)
    fireEvent.click(screen.getByRole('button', { name: /^a category/ }))
    fireEvent.click(screen.getByRole('button', { name: 'two groups, or two columns' }))
    fireEvent.click(screen.getByRole('button', { name: /is there evidence/ }))
    expect(readout('procedure')).toBe('Two-proportion z')
    expect(readout('form')).toBe('test')
    expect(screen.getByText(BRIEF_FINDINGS[0].because)).toBeInTheDocument()
  })

  it('asks the same-units question only where the measurement is quantitative and there are two columns', () => {
    render(<ProcedureSelector />)
    const paired = BRIEF_FINDINGS.find((f) => f.procedure === 'paired')!
    fireEvent.click(screen.getByRole('radio', { name: String(BRIEF_FINDINGS.indexOf(paired) + 1) }))
    fireEvent.click(screen.getByRole('button', { name: 'a number, on a scale' }))
    fireEvent.click(screen.getByRole('button', { name: 'two groups, or two columns' }))
    fireEvent.click(screen.getByRole('button', { name: /different units, matched by nothing/ }))
    expect(screen.getByText(/same units in both columns, measured twice/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /the same units, measured twice/ }))
    fireEvent.click(screen.getByRole('button', { name: /is there evidence/ }))
    expect(readout('procedure')).toBe('Paired t (one-sample t on the differences)')
  })

  it('grades the brief and keeps a running score', () => {
    render(<ProcedureSelector mode="brief" />)
    expect(readout('correct so far')).toBe('0 / 0')
    fireEvent.click(screen.getByRole('button', { name: 'Two-proportion z' }))
    fireEvent.click(screen.getByRole('button', { name: /is there evidence/ }))
    fireEvent.click(screen.getByRole('button', { name: 'GRADE THIS ONE' }))
    expect(readout('correct so far')).toBe('1 / 1')
    expect(screen.getByText(new RegExp(BRIEF_FINDINGS[0].because.slice(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'NEXT FINDING' }))
    fireEvent.click(screen.getByRole('button', { name: 'Two-sample t' }))
    fireEvent.click(screen.getByRole('button', { name: /how large/ }))
    fireEvent.click(screen.getByRole('button', { name: 'GRADE THIS ONE' }))
    expect(readout('correct so far')).toBe('1 / 2')
    expect(screen.getByText(/Not Two-sample t\./)).toBeInTheDocument()
  })

  it('offers a reference matrix covering all five families and both forms', () => {
    render(<ProcedureSelector mode="reference" />)
    const table = screen.getByRole('table', { name: /Reference matrix of question type/ })
    const rows = within(table).getAllByRole('row')
    expect(rows.length).toBe(6)
    expect(within(table).getByText('oneMeanTest(xs, { mu0, alt })')).toBeInTheDocument()
    expect(within(table).getByText('twoMeanInterval(a, b, { dfMethod })')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// BootstrapMachine (act-7-07)
// ---------------------------------------------------------------------------------------------

describe('<BootstrapMachine> (act-7-07)', () => {
  it('draws a deterministic percentile interval and prints it against the t-interval', () => {
    render(<BootstrapMachine />)
    expect(screen.getByRole('region', { name: /Bootstrap machine/ })).toBeInTheDocument()
    const boot = bootstrapNineteen(1, 2000, 0.95)
    const t = oneMeanInterval(lostPerrineDelays, { confidence: 0.95, random: true })
    expect(readout('bootstrap SE')).toBe(fmt(boot.se, 4))
    expect(readout('t-interval SE')).toBe(fmt(t.se, 4))
    const table = screen.getByRole('table', { name: /Bootstrap interval and t-interval/ })
    expect(within(table).getByText(fmt(boot.ci[0], 4))).toBeInTheDocument()
    expect(within(table).getByText(fmt((t.ci as [number, number])[0], 4))).toBeInTheDocument()
  })

  it('agrees with the t-interval, which is what the display is for', () => {
    render(<BootstrapMachine />)
    const boot = bootstrapNineteen(1, 2000, 0.95)
    const [tLo, tHi] = oneMeanInterval(lostPerrineDelays, { confidence: 0.95, random: true }).ci as [number, number]
    expect(Math.abs(boot.ci[0] - tLo)).toBeLessThan(0.25 * (tHi - tLo))
    expect(Math.abs(boot.ci[1] - tHi)).toBeLessThan(0.25 * (tHi - tLo))
    expect(readout('endpoints agree')).toBe('yes')
  })

  it('RESAMPLE advances the seed and redraws', () => {
    render(<BootstrapMachine />)
    const before = readout('bootstrap SE')
    fireEvent.click(screen.getByRole('button', { name: 'RESAMPLE' }))
    expect(readout('bootstrap SE')).toBe(fmt(bootstrapNineteen(2, 2000, 0.95).se, 4))
    expect(readout('bootstrap SE')).not.toBe(before)
  })

  it('more replications leave the width where the nineteen observations put it', () => {
    render(<BootstrapMachine />)
    fireEvent.change(screen.getByRole('slider', { name: /replications/i }), { target: { value: '4000' } })
    const boot = bootstrapNineteen(1, 4000, 0.95)
    expect(readout('bootstrap SE')).toBe(fmt(boot.se, 4))
    const small = bootstrapNineteen(1, 400, 0.95)
    const wide = boot.ci[1] - boot.ci[0]
    expect(Math.abs(wide - (small.ci[1] - small.ci[0]))).toBeLessThan(0.35 * wide)
  })

  it('has an accessible chart, a data-table fallback and keyboard-operable controls', () => {
    render(<BootstrapMachine />)
    expect(screen.getByRole('img', { name: /Histogram of .* bootstrap means/ })).toBeInTheDocument()
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('textbox', { name: /seed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Increase seed/i })).toBeInTheDocument()
    expect(screen.getAllByRole('slider').length).toBe(2)
    expect(screen.getByText(/a biased sample|unlike the population/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// TPValueVisualiser in two-sample mode — act-7-06 imports it read-only
// ---------------------------------------------------------------------------------------------

describe('<TPValueVisualiser mode="two-sample"> (act-7-06)', () => {
  it('renders act-7-06 two groups with the statistic, the Welch df and the shaded tail', () => {
    render(<TPValueVisualiser mode="two-sample" sampleA={lostPerrineDelays} sampleB={survivingPerrineDelays} alt="greater" quantity="the difference in mean Mark-9 delay" label="TACTICAL · THE TAIL" />)
    expect(screen.getByRole('region', { name: /t p-value visualiser/i })).toBeInTheDocument()
    expect(readout('t')).toBe(fmt(LOST_VS_SURVIVING_TEST.statistic, 3))
    expect(readout('df')).toBe(fmt(LOST_VS_SURVIVING_TEST.df!, 2))
    expect(readout('p (one-sided (upper tail))')).toBe(fmtP(LOST_VS_SURVIVING_TEST.pValue!))
    expect(readout('estimate · the difference in mean Mark-9 delay')).toBe(fmt(LOST_VS_SURVIVING_TEST.estimate, 4))
    expect(readout('SE')).toBe(fmt(LOST_VS_SURVIVING_TEST.se, 4))
  })

  it('the sides toggle re-reads the same statistic on both tails', () => {
    render(<TPValueVisualiser mode="two-sample" sampleA={lostPerrineDelays} sampleB={survivingPerrineDelays} alt="greater" />)
    fireEvent.click(screen.getByRole('radio', { name: 'two-sided' }))
    const two = pValueT(LOST_VS_SURVIVING_TEST.statistic, LOST_VS_SURVIVING_TEST.df!, 'two-sided')
    expect(readout('p (two-sided)')).toBe(fmtP(two))
    expect(readout('t')).toBe(fmt(LOST_VS_SURVIVING_TEST.statistic, 3))
  })

  it('carries a data-table fallback and the two-sample conditions block', () => {
    render(<TPValueVisualiser mode="two-sample" sampleA={lostPerrineDelays} sampleB={survivingPerrineDelays} alt="greater" />)
    expect(screen.getByRole('img', { name: /Null t distribution/ })).toBeInTheDocument()
    expect(screen.getByText(/Welch's rule puts the degrees of freedom at/)).toBeInTheDocument()
    const table = screen.getByRole('table', { name: /read against the t distribution/ })
    expect(within(table).getAllByRole('row').length).toBe(3)
  })
})
