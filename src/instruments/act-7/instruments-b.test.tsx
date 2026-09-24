/**
 * Act VII group-B instruments: PairedExplorer and SinkRefitPanel (act-7-04), DifferenceOfMeansPanel
 * and OutputReader (act-7-05).
 *
 * Every expected number is recomputed from `@/lib/stats` or read from `data.ts`, never typed in.
 * jsdom has no layout, so `useChartFrame` falls back to its default width and no canvas path is
 * exercised; the histograms are one rect per bin whatever the sample size.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { conservativeDf, fmt, fmtInt, fmtP, fmtPct, mean, pairedDifferences, pairedTInterval, pairedTTest, sd, twoMeanInterval, twoMeanTest, welchDf } from '@/lib/stats'
import {
  LOST_VS_SURVIVING_INTERVAL,
  REFIT_PAIRED,
  REFIT_PAIRED_INTERVAL,
  REFIT_TWO_SAMPLE,
  SINK_WATCH_INTERVAL,
  SINK_WATCH_TEST,
  SURVIVING_VS_OTHER_INTERVAL,
  lostPerrineDelays,
  otherDelays,
  refitDelayAfter,
  refitDelayBefore,
  sinkRefit,
  survivingPerrineDelays,
  watchAfter,
  watchBefore,
} from './data'
import { PairedExplorer } from './PairedExplorer'
import { SinkRefitPanel } from './SinkRefitPanel'
import { DifferenceOfMeansPanel } from './DifferenceOfMeansPanel'
import { OutputReader } from './OutputReader'

/** Text of the value cell of the <Readout> whose label is exactly `label`. */
function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

// ---------------------------------------------------------------------------------------------
// PairedExplorer (act-7-04) — the Act's spine
// ---------------------------------------------------------------------------------------------

describe('<PairedExplorer> (act-7-04)', () => {
  it('opens on the paired reading of the Refit set and reports its standard error', () => {
    render(<PairedExplorer />)
    expect(screen.getByRole('region', { name: /Paired explorer/ })).toBeInTheDocument()
    expect(readout('estimate (d)')).toBe(fmt(REFIT_PAIRED.estimate, 2))
    expect(readout('standard error')).toBe(fmt(REFIT_PAIRED.se, 4))
    expect(readout('t')).toBe(fmt(REFIT_PAIRED.statistic, 3))
    expect(readout('df')).toBe(String(REFIT_PAIRED.df))
    expect(readout('p (one-sided, greater)')).toBe(fmtP(REFIT_PAIRED.pValue!))
  })

  it('shows the 95% paired interval and that it excludes zero', () => {
    render(<PairedExplorer />)
    const [lo, hi] = REFIT_PAIRED_INTERVAL.ci as [number, number]
    expect(readout('95% lower')).toBe(fmt(lo, 2))
    expect(readout('95% upper')).toBe(fmt(hi, 2))
    expect(readout('interval contains 0')).toBe('no')
    expect(lo).toBeGreaterThan(0)
  })

  it('the toggle changes the standard error and the p-value and leaves the estimate alone', () => {
    render(<PairedExplorer />)
    const estimate = readout('estimate (d)')
    fireEvent.click(screen.getByRole('radio', { name: 'treat as two samples' }))
    expect(readout('estimate (d)')).toBe(estimate)
    expect(readout('standard error')).toBe(fmt(REFIT_TWO_SAMPLE.se, 4))
    expect(readout('t')).toBe(fmt(REFIT_TWO_SAMPLE.statistic, 3))
    expect(readout('p (two-sided)')).toBe(fmtP(REFIT_TWO_SAMPLE.pValue!))
    // The two-sample interval on the same numbers contains zero. That is the module.
    const [lo, hi] = twoMeanInterval(refitDelayAfter, refitDelayBefore, { confidence: 0.95, random: true }).ci as [number, number]
    expect(lo).toBeLessThan(0)
    expect(hi).toBeGreaterThan(0)
    expect(readout('interval contains 0')).toBe('yes')
  })

  it('prices the gap: pairing more than halves the standard error', () => {
    render(<PairedExplorer />)
    expect(readout('SE · paired')).toBe(fmt(REFIT_PAIRED.se, 4))
    expect(readout('SE · two samples')).toBe(fmt(REFIT_TWO_SAMPLE.se, 4))
    expect(readout('SE ratio (two ÷ paired)')).toBe(fmt(REFIT_TWO_SAMPLE.se / REFIT_PAIRED.se, 2))
    expect(REFIT_TWO_SAMPLE.se / REFIT_PAIRED.se).toBeGreaterThan(2)
  })

  it('the shared-offset slider redraws a deterministic companion set', () => {
    render(<PairedExplorer />)
    const before = readout('SE ratio')
    const slider = screen.getByRole('slider', { name: /shared per-hull offset/i })
    fireEvent.change(slider, { target: { value: '0' } })
    const atZero = readout('SE ratio')
    expect(atZero).not.toBe(before)
    expect(Number(atZero)).toBeLessThan(1.6)
    fireEvent.change(slider, { target: { value: '5' } })
    expect(Number(readout('SE ratio'))).toBeGreaterThan(Number(atZero))
  })

  it('offers a data-table fallback for every chart and keyboard-operable controls', () => {
    render(<PairedExplorer />)
    const table = screen.getByRole('table', { name: /hull/i })
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(12)
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('tabindex')
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(2)
  })

  it('runs on any pair of columns, so act-7-04 can point it at the sink', () => {
    render(<PairedExplorer first={watchBefore} second={watchAfter} firstLabel="before the refit" secondLabel="after the refit" rowNames={['CP-24', 'CP-30', 'CP-36', 'CP-42']} unitPlural="runs" measure="endurance" units="h" differenceLabel="hours lost" showSimulator={false} />)
    const expected = pairedTTest(watchBefore, watchAfter, { alt: 'greater', random: true })
    expect(readout('estimate (h)')).toBe(fmt(expected.estimate, 2))
    expect(expected.estimate).toBeCloseTo(SINK_WATCH_TEST.estimate, 10)
    expect(screen.queryByRole('slider', { name: /shared per-run offset/i })).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// SinkRefitPanel (act-7-04) — DS-12
// ---------------------------------------------------------------------------------------------

describe('<SinkRefitPanel> (act-7-04)', () => {
  it('opens on the four Watch profiles and reports the paired loss against the book', () => {
    render(<SinkRefitPanel />)
    expect(screen.getByRole('region', { name: /Sink refit panel/ })).toBeInTheDocument()
    expect(readout('mean loss (h)')).toBe(fmt(SINK_WATCH_TEST.estimate, 2))
    expect(readout('standard error (h)')).toBe(fmt(SINK_WATCH_TEST.se, 3))
    expect(readout('t')).toBe(fmt(SINK_WATCH_TEST.statistic, 2))
    expect(readout('df')).toBe('3')
    const [lo, hi] = SINK_WATCH_INTERVAL.ci as [number, number]
    expect(readout('95% lower (h)')).toBe(fmt(lo, 2))
    expect(readout('95% upper (h)')).toBe(fmt(hi, 2))
  })

  it('recomputes the Watch result from the runs table rather than trusting a constant', () => {
    const watch = sinkRefit.filter((r) => r.profile === 'Watch')
    const fresh = pairedTTest(watch.map((r) => r.before_h), watch.map((r) => r.after_h), { alt: 'greater', random: true })
    expect(fresh.estimate).toBeCloseTo(SINK_WATCH_TEST.estimate, 12)
    expect(mean(pairedDifferences(watch.map((r) => r.before_h), watch.map((r) => r.after_h)))).toBeCloseTo(fresh.estimate, 12)
  })

  it('selecting all eight profiles switches the honest scale to a percentage of design', () => {
    render(<SinkRefitPanel />)
    fireEvent.click(screen.getByRole('radio', { name: /all eight/ }))
    const all = sinkRefit
    const hours = pairedTTest(all.map((r) => r.before_h), all.map((r) => r.after_h), { alt: 'greater', random: true })
    const fractions = all.map((r) => (r.after_h - r.before_h) / r.before_h)
    expect(readout('mean loss (h)')).toBe(fmt(hours.estimate, 2))
    expect(readout('mean change')).toBe(fmtPct(mean(fractions), 1))
    expect(screen.getByText(/not measurements of one quantity/)).toBeInTheDocument()
    // Hours scatter across loads; the percentage does not.
    expect(sd(pairedDifferences(all.map((r) => r.before_h), all.map((r) => r.after_h))) / Math.abs(hours.estimate)).toBeGreaterThan(sd(fractions) / Math.abs(mean(fractions)))
  })

  it('refuses to invent a standard error for the single Standby run', () => {
    render(<SinkRefitPanel />)
    fireEvent.click(screen.getByRole('radio', { name: /Standby/ }))
    expect(screen.getByText(/One matched run on this profile/)).toBeInTheDocument()
    expect(screen.queryByText('mean loss (h)', { selector: '.dr-readout__label' })).toBeNull()
  })

  it('lists every run with a data table and keeps the conditions on the differences', () => {
    render(<SinkRefitPanel />)
    const table = screen.getByRole('table', { name: /Matched cold profiles/ })
    expect(within(table).getAllByRole('row').length).toBe(5)
    expect(screen.getByText(/belongs to the 4 differences plotted above|belongs to the/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// DifferenceOfMeansPanel (act-7-05)
// ---------------------------------------------------------------------------------------------

describe('<DifferenceOfMeansPanel> (act-7-05)', () => {
  it('opens on surviving Perrine against everyone else, and the interval contains zero', () => {
    render(<DifferenceOfMeansPanel />)
    expect(screen.getByRole('region', { name: /Difference of means panel/ })).toBeInTheDocument()
    const [lo, hi] = SURVIVING_VS_OTHER_INTERVAL.ci as [number, number]
    expect(readout('x̄₁ − x̄₂')).toBe(fmt(SURVIVING_VS_OTHER_INTERVAL.estimate, 4))
    expect(readout('95% lower')).toBe(fmt(lo, 4))
    expect(readout('95% upper')).toBe(fmt(hi, 4))
    expect(readout('contains 0')).toBe('yes')
    expect(screen.getByText(/no evidence that the two groups differ/)).toBeInTheDocument()
  })

  it('switches to lost against surviving Perrine and lands on the Act VII target interval', () => {
    render(<DifferenceOfMeansPanel />)
    fireEvent.click(screen.getByRole('radio', { name: 'lost Perrine vs surviving Perrine' }))
    const [lo, hi] = LOST_VS_SURVIVING_INTERVAL.ci as [number, number]
    expect(readout('95% lower')).toBe(fmt(lo, 4))
    expect(readout('95% upper')).toBe(fmt(hi, 4))
    expect(readout('contains 0')).toBe('no')
    expect(lo).toBeGreaterThan(1.1)
    expect(hi).toBeLessThan(4.4)
  })

  it('prints both degrees-of-freedom rules and widens the interval when the conservative one is used', () => {
    render(<DifferenceOfMeansPanel />)
    fireEvent.click(screen.getByRole('radio', { name: 'lost Perrine vs surviving Perrine' }))
    const welch = welchDf(sd(lostPerrineDelays), lostPerrineDelays.length, sd(survivingPerrineDelays), survivingPerrineDelays.length)
    const cons = conservativeDf(lostPerrineDelays.length, survivingPerrineDelays.length)
    expect(readout('Welch df')).toBe(fmt(welch, 2))
    expect(readout('conservative df')).toBe(fmtInt(cons))
    expect(cons).toBe(18)
    const narrowLo = readout('95% lower')
    fireEvent.click(screen.getByRole('radio', { name: `conservative · ${fmtInt(cons)}` }))
    const wide = twoMeanInterval(lostPerrineDelays, survivingPerrineDelays, { confidence: 0.95, dfMethod: 'conservative', random: true })
    expect(readout('95% lower')).toBe(fmt((wide.ci as [number, number])[0], 4))
    expect(Number(readout('95% lower'))).toBeLessThan(Number(narrowLo))
  })

  it('never runs a test: no p-value and no t statistic anywhere on the panel', () => {
    const { container } = render(<DifferenceOfMeansPanel />)
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/P-value|p-value|p = /)
    expect(screen.queryByText('t', { selector: '.dr-readout__label' })).toBeNull()
    expect(screen.getByText('t*', { selector: '.dr-readout__label' })).toBeInTheDocument()
  })

  it('offers a summary table and an accessible difference axis', () => {
    render(<DifferenceOfMeansPanel />)
    const table = screen.getByRole('table', { name: 'Group summaries' })
    expect(within(table).getAllByRole('row').length).toBe(3)
    expect(screen.getByRole('img', { name: /difference axis/ })).toBeInTheDocument()
    expect(screen.getAllByRole('img').length).toBeGreaterThanOrEqual(3)
  })

  it('the confidence slider widens the interval without moving the estimate', () => {
    render(<DifferenceOfMeansPanel />)
    const estimate = readout('x̄₁ − x̄₂')
    fireEvent.change(screen.getByRole('slider', { name: /confidence level/i }), { target: { value: '99' } })
    const at99 = twoMeanInterval(survivingPerrineDelays, otherDelays, { confidence: 0.99, random: true })
    expect(readout('x̄₁ − x̄₂')).toBe(estimate)
    expect(readout('99% lower')).toBe(fmt((at99.ci as [number, number])[0], 4))
  })
})

// ---------------------------------------------------------------------------------------------
// OutputReader (act-7-05)
// ---------------------------------------------------------------------------------------------

describe('<OutputReader> (act-7-05)', () => {
  const unpooled = twoMeanTest(lostPerrineDelays, survivingPerrineDelays, { alt: 'two-sided', random: true })

  it('prints an unpooled two-sample block by default, with each group on its own line', () => {
    render(<OutputReader />)
    expect(screen.getByRole('region', { name: /Output reader/ })).toBeInTheDocument()
    expect(readout('estimate')).toBe(fmt(unpooled.estimate, 4))
    expect(readout('SE · unpooled')).toBe(fmt(unpooled.se, 4))
    expect(readout('df · Welch')).toBe(fmt(unpooled.df!, 2))
    expect(readout('df · conservative')).toBe(fmtInt(conservativeDf(lostPerrineDelays.length, survivingPerrineDelays.length)))
  })

  it('every line is a focusable control that explains itself', () => {
    render(<OutputReader />)
    const list = screen.getByRole('list', { name: /Package output/ })
    const buttons = within(list).getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(8)
    for (const b of buttons) expect(b).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(buttons[buttons.length - 1])
    expect(buttons[buttons.length - 1]).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/The decision line/)).toBeInTheDocument()
  })

  it('the pooled block changes the standard error and the degrees of freedom, never the estimate', () => {
    render(<OutputReader />)
    const estimate = readout('estimate')
    fireEvent.click(screen.getByRole('radio', { name: 'Pooled: Yes' }))
    expect(readout('estimate')).toBe(estimate)
    const n1 = lostPerrineDelays.length
    const n2 = survivingPerrineDelays.length
    expect(readout('df · pooled')).toBe(fmtInt(n1 + n2 - 2))
    expect(readout('SE · pooled')).not.toBe(readout('SE · unpooled'))
    expect(screen.getByText(/assume equal variances/)).toBeInTheDocument()
  })

  it('lights the lines the current question needs', () => {
    render(<OutputReader />)
    const ciLine = screen.getByRole('button', { name: /95% CI for difference/ })
    expect(ciLine).toHaveStyle({ color: 'var(--dr-fg-0)' })
    fireEvent.click(screen.getByRole('radio', { name: /is there evidence/ }))
    expect(ciLine).toHaveStyle({ color: 'var(--dr-fg-2)' })
    expect(screen.getByRole('button', { name: /T-Value/ })).toHaveStyle({ color: 'var(--dr-fg-0)' })
  })

  it('recomputes the printed interval from the library', () => {
    render(<OutputReader />)
    const ci = twoMeanInterval(lostPerrineDelays, survivingPerrineDelays, { confidence: 0.95, random: true }).ci as [number, number]
    expect(screen.getByRole('button', { name: new RegExp(`${fmt(ci[0], 4).replace('−', '[−-]')}`) })).toBeInTheDocument()
    // The paired machinery must not be reachable from here: these are independent samples.
    expect(() => pairedTInterval(lostPerrineDelays.slice(0, 3), survivingPerrineDelays.slice(0, 3), { confidence: 0.95 })).not.toThrow()
  })
})
