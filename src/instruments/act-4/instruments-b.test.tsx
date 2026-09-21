/**
 * Act IV instruments (B): the distribution editor, the heat ledger, the load combiner, the binomial
 * and geometric explorers, and the three calculus-briefing figures.
 *
 * Every expected number is recomputed here from `@/lib/stats` or `./data` — never typed in — so the
 * tests fail if an instrument starts inventing arithmetic rather than reading it.
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { binomial, expectedValue, fmt, geometric, geometricMoments, normal, round, rvCdf, rvSd } from '@/lib/stats'
import {
  ARRIVALS_PER_DAY,
  BASELINES,
  BOARD_FIT,
  COLD_HOURS_PROBS_BAD,
  LEDGER_TRANSITS,
  LOITER_OPTIONS,
  NAIVE_SUM_OF_SDS_KW,
  P_COLD_HOURS_AT_LEAST_64,
  P_COLD_HOURS_OVER_64,
  P_SATURATE_BEFORE_64,
  ROOK_FIT,
  SINK_TEMP,
  WATCH_SD_KW,
  WATCH_SUBSYSTEMS,
  YARD_MARGIN_KW,
  coldHoursRV,
} from './data'
import { DistributionEditor } from './DistributionEditor'
import { HeatBudgetPlanner } from './HeatBudgetPlanner'
import { RandomVariableCombiner } from './RandomVariableCombiner'
import { BinomialExplorer } from './BinomialExplorer'
import { GeometricExplorer } from './GeometricExplorer'
import { DensityVsMass } from './DensityVsMass'
import { WeightedSumBar } from './WeightedSumBar'
import { GeometricSeriesStack } from './GeometricSeriesStack'

/** The text of a Readout's value, by its label. */
function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

/** Render, and fail if React or anything else wrote to the console while it happened. */
function renderClean(ui: ReactElement): RenderResult {
  const messages: string[] = []
  const err = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void messages.push(String(a[0])))
  const warn = vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => void messages.push(String(a[0])))
  try {
    return render(ui)
  } finally {
    err.mockRestore()
    warn.mockRestore()
    expect(messages).toEqual([])
  }
}

const middle = LOITER_OPTIONS.find((o) => o.band === 'middle')!
const near = LOITER_OPTIONS.find((o) => o.band === 'near')!

// =================================================================================================

describe('<DistributionEditor>', () => {
  it('opens on the Chief’s table with Σp = 1 and the cellar-overrun probability off the registry', () => {
    renderClean(<DistributionEditor />)
    expect(screen.getByRole('img', { name: /Bar chart of the probability of each cold-hours value/ })).toBeInTheDocument()
    expect(readout('Σ p(x)')).toContain('1.0000')
    expect(readout('E[X]')).toContain(fmt(coldHoursRV.mean, 2))
    expect(readout('SD(X)')).toContain(fmt(coldHoursRV.sd, 2))

    // The registry number: P(X > 64) ≈ 0.21, and P(X ≥ 64) is a different, larger number.
    expect(readout('P(X > 64) · the cellar overruns')).toContain(fmt(P_COLD_HOURS_OVER_64, 4))
    expect(P_COLD_HOURS_OVER_64).toBeGreaterThan(0.16)
    expect(P_COLD_HOURS_OVER_64).toBeLessThan(0.3)
    expect(readout('P(X ≥ 64) · includes the 64')).toContain(fmt(P_COLD_HOURS_AT_LEAST_64, 4))
    expect(P_COLD_HOURS_AT_LEAST_64).toBeGreaterThan(P_COLD_HOURS_OVER_64)

    // The data-table fallback is present, with the pmf in it.
    expect(screen.getByText(/^Cold-hours pmf · E\[X\]/)).toBeInTheDocument()
  })

  it('keeps ≥ and > apart and names the cell between them', () => {
    render(<DistributionEditor />)
    expect(readout('P(X ≥ 64)')).toContain(fmt(P_COLD_HOURS_AT_LEAST_64, 4))
    expect(readout('P(X > 64)')).toContain(fmt(P_COLD_HOURS_OVER_64, 4))
    expect(readout('the cell between them · p(64)')).toContain(fmt(P_COLD_HOURS_AT_LEAST_64 - P_COLD_HOURS_OVER_64, 4))

    fireEvent.click(screen.getByRole('radio', { name: 'P(X ≤ k)' }))
    expect(readout('selected · P(X ≤ 64)')).toContain(fmt(rvCdf(coldHoursRV, 64), 4))
  })

  it('flags the Ensign’s table for not summing to 1, and NORMALISE repairs it', () => {
    render(<DistributionEditor />)
    fireEvent.click(screen.getByRole('radio', { name: "the Ensign's first table" }))

    const badTotal = COLD_HOURS_PROBS_BAD.reduce((a, b) => a + b, 0)
    expect(round(badTotal, 10)).toBe(1.04)
    expect(readout('Σ p(x)')).toContain(fmt(badTotal, 4))
    expect(screen.getByText(/That is not a probability distribution/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'NORMALISE' }))
    expect(readout('Σ p(x)')).toContain('1.0000')
    expect(screen.queryByText(/That is not a probability distribution/)).toBeNull()
    expect(screen.getByText(/The shape is unchanged/)).toBeInTheDocument()
  })

  it('edits a cell from the keyboard through the bar handle, and from the table input', () => {
    render(<DistributionEditor />)
    const bar = screen.getByRole('slider', { name: 'probability of 44 hours' })
    fireEvent.keyDown(bar, { key: 'ArrowUp' })
    expect(readout('Σ p(x)')).toContain('1.0100')
    fireEvent.keyDown(bar, { key: 'ArrowDown' })
    expect(readout('Σ p(x)')).toContain('1.0000')

    const cell = screen.getByRole('spinbutton', { name: 'probability of 80 hours' })
    fireEvent.change(cell, { target: { value: '0.20' } })
    expect(readout('Σ p(x)')).not.toContain('1.0000')
  })

  it('switches to the cumulative step plot', () => {
    render(<DistributionEditor />)
    fireEvent.click(screen.getByRole('radio', { name: 'cumulative · F(k)' }))
    expect(screen.getByRole('img', { name: /Step plot of the cumulative probability/ })).toBeInTheDocument()
  })

  it('collapses the continuous interval to a point and reports zero area at 240 °C', () => {
    render(<DistributionEditor mode="continuous" />)
    expect(screen.getByRole('img', { name: /Normal density of sink temperature/ })).toBeInTheDocument()
    expect(readout('P(lower ≤ T ≤ upper)')).toContain(fmt(normal.between(SINK_TEMP.mean - SINK_TEMP.sd, SINK_TEMP.mean + SINK_TEMP.sd, SINK_TEMP.mean, SINK_TEMP.sd), 5))

    fireEvent.click(screen.getByRole('button', { name: 'COLLAPSE TO A POINT' }))
    expect(readout('interval width')).toContain('0.000')
    expect(readout('P(lower ≤ T ≤ upper)')).toContain('0.00000')
    expect(screen.getByText(/still the most likely number/)).toBeInTheDocument()

    // And the cutoffs are keyboard-operable.
    const lower = screen.getByRole('slider', { name: 'lower cutoff, sink temperature' })
    fireEvent.keyDown(lower, { key: 'ArrowLeft', shiftKey: true })
    expect(Number(readout('interval width').replace('°C', ''))).toBeGreaterThan(0)
  })
})

// =================================================================================================

describe('<HeatBudgetPlanner>', () => {
  const evOf = (band: 'near' | 'middle' | 'far') => {
    const o = LOITER_OPTIONS.find((x) => x.band === band)!
    return expectedValue(o.pmf.values, o.pmf.probs)
  }

  it('writes the middle point’s expected value out as a weighted sum', () => {
    renderClean(<HeatBudgetPlanner />)
    expect(readout('E[X] · Σ x·p(x)')).toContain(fmt(evOf('middle'), 2))
    expect(readout('SD(X) · √Var')).toContain(fmt(rvSd(middle.pmf.values, middle.pmf.probs), 2))
    expect(round(evOf('middle'), 0)).toBe(54)
    expect(round(evOf('near'), 0)).toBe(60)
    expect(round(evOf('far'), 0)).toBe(48)

    // The two named misconceptions are on screen and are different numbers.
    const unweighted = middle.pmf.values.reduce((s, v) => s + v, 0) / middle.pmf.values.length
    expect(readout('plain average of the values — NOT E[X]')).toContain(fmt(unweighted, 2))
    const modeValue = middle.pmf.values[middle.pmf.probs.indexOf(Math.max(...middle.pmf.probs))]
    expect(readout('most likely value — A DIFFERENT THING')).toContain(fmt(modeValue, 0))
  })

  it('shows P(exceed the 64-hour cellar) at 0.25 / 0.006 / ≈ 0 across the three points', () => {
    render(<HeatBudgetPlanner />)
    expect(round(normal.sf(64, near.meanHours, near.sdHours), 2)).toBe(0.25)
    expect(round(normal.sf(64, middle.meanHours, middle.sdHours), 3)).toBe(0.006)
    expect(normal.sf(64, 48, 3)).toBeLessThan(1e-6)

    const table = screen.getByRole('table', { name: 'Loiter point comparator' })
    for (const o of LOITER_OPTIONS) {
      expect(within(table).getByText(fmt(normal.sf(64, o.meanHours, o.sdHours), 4))).toBeInTheDocument()
    }
    expect(readout('P(cost > 64 h)')).toContain(fmt(normal.sf(64, middle.meanHours, middle.sdHours), 4))
  })

  it('switches option and moves the capacity line', () => {
    render(<HeatBudgetPlanner />)
    fireEvent.click(screen.getByRole('radio', { name: 'near point' }))
    expect(readout('E[X] · Σ x·p(x)')).toContain(fmt(evOf('near'), 2))
    expect(readout('P(cost > 64 h)')).toContain(fmt(normal.sf(64, near.meanHours, near.sdHours), 4))

    fireEvent.change(screen.getByLabelText('cellar capacity'), { target: { value: '60' } })
    expect(readout('P(cost > 60 h)')).toContain(fmt(normal.sf(60, near.meanHours, near.sdHours), 4))
    expect(screen.getByText(/Capacity set to 60 hours/)).toBeInTheDocument()
  })

  it('carries an accessible chart and data table per option', () => {
    render(<HeatBudgetPlanner />)
    for (const o of LOITER_OPTIONS) {
      expect(screen.getByRole('img', { name: new RegExp(`Probability distribution of sink-hours for the ${o.label}`) })).toBeInTheDocument()
    }
    expect(screen.getByRole('table', { name: /Weighted-sum table for the middle point/ })).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<RandomVariableCombiner>', () => {
  const computing = WATCH_SUBSYSTEMS.find((s) => s.id === 'computing')!
  const cryo = WATCH_SUBSYSTEMS.find((s) => s.id === 'cryo')!

  it('adds variances, not standard deviations, for two independent loads', () => {
    renderClean(<RandomVariableCombiner />)
    const right = Math.sqrt(computing.sdKw ** 2 + cryo.sdKw ** 2)
    expect(readout('μ₁ + μ₂')).toContain(fmt(computing.meanKw + cryo.meanKw, 2))
    expect(readout('√(σ₁² + σ₂²) · right')).toContain(fmt(right, 3))
    expect(readout('σ₁ + σ₂ · WRONG, too pessimistic')).toContain(fmt(computing.sdKw + cryo.sdKw, 3))
    expect(readout('√((σ₁² + σ₂²)/2) · WRONG, too generous')).toContain(fmt(Math.sqrt((computing.sdKw ** 2 + cryo.sdKw ** 2) / 2), 3))
    expect(screen.getByRole('img', { name: /Normal densities of two independent subsystem loads/ })).toBeInTheDocument()
  })

  it('subtracts the mean of a difference and still adds its variance', () => {
    render(<RandomVariableCombiner />)
    const right = Math.sqrt(computing.sdKw ** 2 + cryo.sdKw ** 2)
    fireEvent.click(screen.getByRole('radio', { name: 'X − Y' }))
    expect(readout('μ₁ − μ₂')).toContain(fmt(computing.meanKw - cryo.meanKw, 2))
    expect(readout('√(σ₁² + σ₂²) · right')).toContain(fmt(right, 3))
    expect(screen.getByText(/The variance still adds/)).toBeInTheDocument()
  })

  it('scales the SD by |a| and the variance by a² under a linear transform', () => {
    render(<RandomVariableCombiner />)
    fireEvent.click(screen.getByRole('radio', { name: 'aX + b' }))
    fireEvent.change(screen.getByLabelText('a · multiplier'), { target: { value: '2' } })
    expect(readout('aμ₁ + b')).toContain(fmt(2 * computing.meanKw, 2))
    expect(readout('|a|σ₁ · right')).toContain(fmt(2 * computing.sdKw, 3))
    expect(readout('variance')).toContain(fmt(4 * computing.sdKw ** 2, 2))
  })

  it('reads the Watch budget as 19.6 kW against the wrong 42 and the wrong 8', () => {
    render(<RandomVariableCombiner />)
    fireEvent.click(screen.getByRole('radio', { name: 'the whole Watch budget' }))
    expect(readout('total SD · √Σσ²')).toContain(fmt(WATCH_SD_KW, 2))
    expect(round(WATCH_SD_KW, 1)).toBe(19.6)
    expect(readout('Σσ · SDs added — WRONG')).toContain(fmt(NAIVE_SUM_OF_SDS_KW, 0))
    expect(readout('yard spec sheet — WRONG')).toContain(fmt(YARD_MARGIN_KW, 0))
    expect(readout('combineRV check')).toContain(fmt(WATCH_SD_KW, 2))

    // 78 GJ ÷ load, and the tail that says the cellar runs out early.
    expect(readout('P(saturates before 64 h)')).toContain(fmt(P_SATURATE_BEFORE_64, 4))
    expect(round(P_SATURATE_BEFORE_64, 2)).toBe(0.17)

    expect(screen.getByRole('table', { name: 'Watch subsystem load budget' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Three candidate margins on the Watch load/ })).toBeInTheDocument()
  })

  it('moves the total SD when the independence assumption is dropped', () => {
    render(<RandomVariableCombiner />)
    fireEvent.click(screen.getByRole('radio', { name: 'the whole Watch budget' }))
    const independent = readout('total SD · √Σσ²')
    fireEvent.click(screen.getByRole('radio', { name: 'add a correlation term' }))
    expect(readout('total SD · √Σσ²')).not.toBe(independent)
    expect(screen.getByText(/This is a display, not a procedure/)).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<BinomialExplorer>', () => {
  it('opens on the Board’s baseline and keeps P(X ≤ k) apart from P(X < k)', () => {
    renderClean(<BinomialExplorer />)
    const p = BASELINES.board.p
    expect(readout('P(X ≥ 31)')).toContain(fmt(binomial.atLeast(31, LEDGER_TRANSITS, p), 5))
    expect(readout('P(X ≤ 31)')).toContain(fmt(binomial.cdf(31, LEDGER_TRANSITS, p), 5))
    expect(readout('P(X < 31)')).toContain(fmt(binomial.cdf(30, LEDGER_TRANSITS, p), 5))
    expect(readout('the cell between them · P(X = 31)')).toContain(fmt(binomial.pmf(31, LEDGER_TRANSITS, p), 5))
    expect(screen.getByRole('img', { name: /Binomial probability distribution for 2,612 trials/ })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Binomial conditions checklist' })).toBeInTheDocument()
    expect(screen.getByText('10% condition')).toBeInTheDocument()
  })

  it('moves k from the keyboard and re-reads the region', () => {
    render(<BinomialExplorer />)
    const handle = screen.getByRole('slider', { name: 'k, the count the region is read at' })
    expect(handle).toHaveAttribute('aria-valuenow', '31')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(handle).toHaveAttribute('aria-valuenow', '32')
    expect(readout('P(X ≥ 32)')).toContain(fmt(binomial.atLeast(32, LEDGER_TRANSITS, BASELINES.board.p), 5))
    fireEvent.keyDown(handle, { key: 'ArrowLeft', shiftKey: true })
    expect(handle).toHaveAttribute('aria-valuenow', '22')
  })

  it('at n = 2,612 gives μ 28.7 / σ 5.33 on the Board’s p and μ 13.2 / σ 3.62 on the 2176 report’s', () => {
    render(<BinomialExplorer mode="parameters" />)
    expect(round(BOARD_FIT.mean, 1)).toBe(28.7)
    expect(round(BOARD_FIT.sd, 2)).toBe(5.33)
    expect(readout('μ = np')).toContain(fmt(BOARD_FIT.mean, 2))
    expect(readout('σ = √(np(1−p))')).toContain(fmt(BOARD_FIT.sd, 3))
    expect(readout('(x − μ)/σ')).toContain(fmt(BOARD_FIT.z, 2))
    expect(readout('np quoted as the SD — WRONG')).toContain(fmt(BOARD_FIT.mean, 2))

    fireEvent.click(screen.getByRole('radio', { name: 'the 2176 report' }))
    expect(round(ROOK_FIT.mean, 1)).toBe(13.2)
    expect(round(ROOK_FIT.sd, 2)).toBe(3.62)
    expect(readout('μ = np')).toContain(fmt(ROOK_FIT.mean, 2))
    expect(readout('σ = √(np(1−p))')).toContain(fmt(ROOK_FIT.sd, 3))
    expect(readout('(x − μ)/σ')).toContain(fmt(ROOK_FIT.z, 2))
    expect(ROOK_FIT.z).toBeGreaterThan(4.5)
    expect(screen.getByRole('img', { name: /with the mean plus or minus two standard deviations shaded/ })).toBeInTheDocument()
  })

  it('bins the pmf rather than drawing thousands of rectangles', () => {
    render(<BinomialExplorer n={4000} p={0.5} />)
    expect(screen.getAllByText(/binned \d+ counts to a bar/).length).toBeGreaterThan(0)
  })
})

// =================================================================================================

describe('<GeometricExplorer>', () => {
  it('opens at p = 0.02 with mean 50 and SD 49.5, and says the mode is trial 1', () => {
    renderClean(<GeometricExplorer />)
    const m = geometricMoments(0.02)
    expect(m.mean).toBe(50)
    expect(round(m.sd, 2)).toBe(49.5)
    expect(readout('E[X] = 1/p · expected passages')).toContain(fmt(m.mean, 2))
    expect(readout('SD = √(1−p)/p')).toContain(fmt(m.sd, 2))
    expect(readout('most likely single outcome · the mode')).toContain('trial 1')
    expect(readout('P(X = 1)')).toContain(fmt(0.02, 4))

    // Most waits finish before the mean, and a stubborn third do not.
    const beyond = geometric.sf(50, 0.02)
    expect(readout('P(X > ⌈1/p⌉) · still waiting at the mean')).toContain(fmt(beyond, 4))
    expect(beyond).toBeGreaterThan(0.3)
    expect(beyond).toBeLessThan(0.4)

    expect(screen.getByRole('img', { name: /Geometric probability distribution at p = 0.0200/ })).toBeInTheDocument()
    expect(screen.getByText(/up to and including the first diversion \(support 1, 2, 3/)).toBeInTheDocument()
  })

  it('converts expected passages into days at the Lane’s Perrine rate', () => {
    render(<GeometricExplorer />)
    expect(readout('expected days to the first diversion')).toContain(fmt(50 / ARRIVALS_PER_DAY.Perrine, 1))
    fireEvent.change(screen.getByLabelText('Perrine passages per day'), { target: { value: '1' } })
    expect(readout('expected days to the first diversion')).toContain(fmt(50, 1))
  })

  it('moves the by-trial-k cutoff from the keyboard', () => {
    render(<GeometricExplorer />)
    const handle = screen.getByRole('slider', { name: 'k, the trial the cumulative probability is read at' })
    expect(readout('P(X ≤ 50) · by trial k')).toContain(fmt(geometric.cdf(50, 0.02), 5))
    // The display bins three trials to a bar at this p, so an arrow key steps by a whole bar.
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(readout('P(X ≤ 53) · by trial k')).toContain(fmt(geometric.cdf(53, 0.02), 5))
    expect(readout('P(X > 53) · still waiting')).toContain(fmt(geometric.sf(53, 0.02), 5))
  })

  it('takes a named rate preset and re-reads the mean', () => {
    render(<GeometricExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'one in ten' }))
    expect(readout('E[X] = 1/p · expected passages')).toContain(fmt(10, 2))
  })

  it('puts the geometric question beside the binomial one for the same p', () => {
    render(<GeometricExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'geometric against binomial' }))
    expect(readout('P(X ≥ 1)')).toContain(fmt(binomial.atLeast(1, 24, 0.02), 4))
    expect(readout('P(X ≤ 24)')).toContain(fmt(geometric.cdf(24, 0.02), 4))
    expect(screen.getByText(/the same event/)).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<DensityVsMass>', () => {
  it('shows probability per bar and probability per unit of x for the same bins', () => {
    renderClean(<DensityVsMass />)
    const dx = (8 * SINK_TEMP.sd) / 16
    expect(readout('Δx · bin width')).toContain(fmt(dx, 4))
    const tallest = normal.between(SINK_TEMP.mean - dx, SINK_TEMP.mean, SINK_TEMP.mean, SINK_TEMP.sd)
    expect(readout('tallest bar · probability')).toContain(fmt(tallest, 6))
    expect(readout('tallest bar · density')).toContain(fmt(tallest / dx, 5))
    expect(readout('peak of f(x)')).toContain(fmt(normal.pdf(SINK_TEMP.mean, SINK_TEMP.mean, SINK_TEMP.sd), 5))
    expect(screen.getByRole('img', { name: /bins of the sink-temperature model/ })).toBeInTheDocument()
  })

  it('narrows the bins: the bar probability falls while the density holds', () => {
    render(<DensityVsMass />)
    const before = Number(readout('tallest bar · probability'))
    const densityBefore = Number(readout('tallest bar · density').replace(`per ${SINK_TEMP.units}`, ''))
    fireEvent.change(screen.getByLabelText('bins across the model'), { target: { value: '64' } })
    const after = Number(readout('tallest bar · probability'))
    const densityAfter = Number(readout('tallest bar · density').replace(`per ${SINK_TEMP.units}`, ''))
    expect(after).toBeLessThan(before)
    expect(Math.abs(densityAfter - densityBefore)).toBeLessThan(0.002)
  })

  it('lets the density pass 1 when σ is small, and says why that is legal', () => {
    render(<DensityVsMass />)
    fireEvent.change(screen.getByLabelText('σ · model spread'), { target: { value: '0.2' } })
    expect(normal.pdf(0, 0, 0.2)).toBeGreaterThan(1)
    expect(readout('peak of f(x)')).toContain(fmt(normal.pdf(0, 0, 0.2), 4))
    expect(screen.getByText(/above 1, and legal/)).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<WeightedSumBar>', () => {
  it('builds Σ x·p(x) up to E[X] and keeps Σp at 1', () => {
    renderClean(<WeightedSumBar />)
    expect(readout('Σ p(x)')).toContain('1.000000')
    expect(readout('∫ x f(x) dx = μ')).toContain(fmt(middle.meanHours, 4))
    const ev = Number(readout('E[X] · all terms').replace('h', ''))
    expect(Math.abs(ev - middle.meanHours)).toBeLessThan(0.05)
    expect(readout('running Σ x·p(x)')).toContain(fmt(ev, 4))
    expect(screen.getByRole('img', { name: /terms x times p of x/ })).toBeInTheDocument()
  })

  it('steps the accumulation and refines the cell width', () => {
    render(<WeightedSumBar />)
    const cells = Number(readout('cells'))
    fireEvent.change(screen.getByLabelText('terms added, left to right'), { target: { value: '4' } })
    const partial = Number(readout('running Σ x·p(x)').replace('h', ''))
    expect(partial).toBeGreaterThan(0)
    expect(partial).toBeLessThan(middle.meanHours)

    fireEvent.change(screen.getByLabelText('refine · halvings of the cell'), { target: { value: '2' } })
    expect(Number(readout('cells'))).toBeGreaterThan(cells)
    // Finer grain, same sum.
    expect(Math.abs(Number(readout('E[X] · all terms').replace('h', '')) - middle.meanHours)).toBeLessThan(0.05)
  })

  it('names the unweighted average as the thing E[X] is not', () => {
    render(<WeightedSumBar />)
    expect(screen.getByText('plain average of the cell centres — NOT E[X]')).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<GeometricSeriesStack>', () => {
  it('fills the unit bar with the series and leaves (1 − p)^k unfilled', () => {
    renderClean(<GeometricSeriesStack />)
    expect(readout('partial sum · Σ to 6')).toContain(fmt(geometric.cdf(6, 0.2), 6))
    expect(readout('remainder · (1 − p)^6')).toContain(fmt(geometric.sf(6, 0.2), 6))
    expect(readout('which is P(X > 6)')).toContain(fmt(geometric.sf(6, 0.2), 6))
    expect(readout('closed form · 1/p')).toContain(fmt(1 / 0.2, 5))
    expect(screen.getByRole('img', { name: /unit bar divided into the first 6 terms/ })).toBeInTheDocument()
  })

  it('adds terms: the partial sums close on 1 and on 1/p', () => {
    render(<GeometricSeriesStack />)
    const weightedBefore = Number(readout('Σ k·p(1 − p)^(k−1) to 6'))
    fireEvent.change(screen.getByLabelText('terms included'), { target: { value: '60' } })
    expect(readout('partial sum · Σ to 60')).toContain(fmt(geometric.cdf(60, 0.2), 6))
    const weightedAfter = Number(readout('Σ k·p(1 − p)^(k−1) to 60'))
    expect(weightedAfter).toBeGreaterThan(weightedBefore)
    expect(Math.abs(weightedAfter - geometricMoments(0.2).mean)).toBeLessThan(0.01)
  })

  it('re-reads the whole series at another p', () => {
    render(<GeometricSeriesStack />)
    fireEvent.change(screen.getByLabelText('p · success on one trial'), { target: { value: '0.5' } })
    expect(readout('closed form · 1/p')).toContain(fmt(2, 5))
    expect(readout('partial sum · Σ to 6')).toContain(fmt(geometric.cdf(6, 0.5), 6))
  })
})
