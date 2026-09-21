/**
 * act-6-01 / act-6-02 instruments: CaptureSimulator, MarginPlanner and the calc briefing's
 * InverseTail. The point of every assertion here is the same one: the panel must be showing what
 * `@/lib/stats` and `@/lib/sim` say, and not a second implementation of it.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CaptureSimulator, INTERVALS, LONG_RUN, SEED_KEY } from './CaptureSimulator'
import { MarginPlanner } from './MarginPlanner'
import { InverseTail } from './InverseTail'
import { seedFrom } from '@/lib/rng'
import { simulate } from '@/lib/sim'
import { fmt, fmtInt, fmtPct, marginOfErrorProportion, onePropInterval, t, zStar } from '@/lib/stats'
import { BOARD_BASELINE, LANE_INTERVAL, LANE_RATE, LANE_TRANSITS, ROOK_BASELINE, TARGET_MARGIN, TRANSITS_FOR_TARGET_MARGIN, TRANSITS_PER_YEAR, YEARS_FOR_TARGET_MARGIN, laneMargin } from './data'

/** The value cell next to a readout's label. */
function readout(label: string | RegExp): HTMLElement {
  const el = screen.getByText(label, { selector: 'span.dr-readout__label' })
  const value = el.nextElementSibling
  if (!value) throw new Error(`readout "${String(label)}" has no value cell`)
  return value as HTMLElement
}

/** Rebuild the century the panel is showing, from the worker task and the course's own interval. */
function expectedCentury(n: number, confidence: number, generation = 0) {
  const phats = simulate('sample-proportion', { n, p: LANE_RATE }, seedFrom(SEED_KEY, 'seasons', generation, n, LANE_RATE), INTERVALS)
  return phats.map((ph) => {
    const [lo, hi] = onePropInterval({ x: Math.round(ph * n), n, confidence, random: true }).ci as [number, number]
    return lo <= LANE_RATE && LANE_RATE <= hi
  })
}

describe('<CaptureSimulator>', () => {
  it('draws a hundred intervals in the worker and counts the captures with the course’s own interval', () => {
    render(<CaptureSimulator />)
    const covers = expectedCentury(TRANSITS_PER_YEAR, 0.95)
    const captured = covers.filter(Boolean).length

    expect(readout('covered · out of 100')).toHaveTextContent(`${captured} / ${INTERVALS}`)
    expect(readout('missed')).toHaveTextContent(String(INTERVALS - captured))
    expect(readout('expected to cover at this C')).toHaveTextContent(fmt(INTERVALS * 0.95, 1))
    expect(readout('z*')).toHaveTextContent(fmt(zStar(0.95), 3))

    // The long-run readout is the worker's own 'ci-capture' task, not a second count of the hundred.
    const longRun = simulate('ci-capture', { kind: 'proportion', n: TRANSITS_PER_YEAR, confidence: 0.95, p: LANE_RATE }, seedFrom(SEED_KEY, 'long-run', 0, TRANSITS_PER_YEAR, 0.95, LANE_RATE), LONG_RUN)
    const rate = longRun.reduce((s, v) => s + v, 0) / LONG_RUN
    expect(readout(`capture rate over ${fmtInt(LONG_RUN)} seasons`)).toHaveTextContent(fmtPct(rate, 1))
  })

  it('flags Large Counts at a single season and reports the shortfall the condition is there to prevent', () => {
    render(<CaptureSimulator />)
    expect(readout('n · p · expected losses')).toHaveTextContent(fmt(TRANSITS_PER_YEAR * LANE_RATE, 2))
    expect(readout('Large Counts · both ≥ 10')).toHaveTextContent('FAILS')
    expect(screen.getByText(/Large Counts fails here/)).toBeInTheDocument()
  })

  it('lists every season in the data-table fallback with its endpoints and verdict', () => {
    render(<CaptureSimulator />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(INTERVALS + 1)
    const covers = expectedCentury(TRANSITS_PER_YEAR, 0.95)
    const first = within(table).getAllByRole('row')[1]
    expect(first).toHaveTextContent(covers[0] ? 'yes' : 'NO')
  })

  it('raises the level without redealing the century: the same p̂’s, wider intervals, more covered', () => {
    render(<CaptureSimulator />)
    const before = expectedCentury(TRANSITS_PER_YEAR, 0.95).filter(Boolean).length
    fireEvent.change(screen.getByLabelText('confidence level C'), { target: { value: '99' } })
    const after = expectedCentury(TRANSITS_PER_YEAR, 0.99).filter(Boolean).length

    expect(readout('covered · out of 100')).toHaveTextContent(`${after} / ${INTERVALS}`)
    expect(after).toBeGreaterThanOrEqual(before)
    expect(readout('z*')).toHaveTextContent(fmt(zStar(0.99), 3))
  })

  it('brings the capture rate back to the level when n reaches the Ledger', () => {
    render(<CaptureSimulator n={LANE_TRANSITS} />)
    expect(readout('Large Counts · both ≥ 10')).toHaveTextContent('holds')
    const longRun = simulate('ci-capture', { kind: 'proportion', n: LANE_TRANSITS, confidence: 0.95, p: LANE_RATE }, seedFrom(SEED_KEY, 'long-run', 0, LANE_TRANSITS, 0.95, LANE_RATE), LONG_RUN)
    const rate = longRun.reduce((s, v) => s + v, 0) / LONG_RUN
    expect(rate).toBeGreaterThan(0.93)
    expect(readout(`capture rate over ${fmtInt(LONG_RUN)} seasons`)).toHaveTextContent(fmtPct(rate, 1))
  })

  it('deals a different century on RESEED', () => {
    render(<CaptureSimulator />)
    const first = readout('covered · out of 100').textContent
    fireEvent.click(screen.getByRole('button', { name: /RESEED/ }))
    const second = expectedCentury(TRANSITS_PER_YEAR, 0.95, 1).filter(Boolean).length
    expect(readout('covered · out of 100')).toHaveTextContent(`${second} / ${INTERVALS}`)
    expect(readout('covered · out of 100').textContent).not.toBe(`${first}x`)
  })

  it('is keyboard operable and labelled', () => {
    render(<CaptureSimulator />)
    expect(screen.getByLabelText('confidence level C')).toHaveAttribute('type', 'range')
    expect(screen.getByLabelText('transits in a season (n)')).toHaveAttribute('type', 'range')
    expect(screen.getByRole('img', { name: /confidence intervals for the loss rate/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /capture simulator/i })).toBeInTheDocument()
  })
})

describe('<MarginPlanner>', () => {
  it('opens on the Ledger’s own interval, endpoint for endpoint', () => {
    render(<MarginPlanner />)
    const [lo, hi] = LANE_INTERVAL.ci as [number, number]
    expect(readout('lower endpoint')).toHaveTextContent(fmt(lo, 5))
    expect(readout('upper endpoint')).toHaveTextContent(fmt(hi, 5))
    expect(readout('margin of error')).toHaveTextContent(fmt(LANE_INTERVAL.marginOfError ?? 0, 5))
    expect(readout('z*')).toHaveTextContent(fmt(zStar(0.95), 3))
    expect(readout('p̂ · losses per transit')).toHaveTextContent(fmt(LANE_RATE, 5))
  })

  it('says which baseline the interval clears and which it does not', () => {
    render(<MarginPlanner />)
    expect(readout(`clears Rook's ${fmtPct(ROOK_BASELINE, 2)}`)).toHaveTextContent('yes')
    expect(readout(`clears the Board's ${fmtPct(BOARD_BASELINE, 2)}`)).toHaveTextContent('no')
  })

  it('prices a two-tenths-of-a-point margin in transits and in years', () => {
    render(<MarginPlanner />)
    const field = screen.getByLabelText('target margin (percentage points)')
    fireEvent.change(field, { target: { value: String(TARGET_MARGIN * 100) } })
    fireEvent.blur(field)
    expect(readout('transits needed in all')).toHaveTextContent(fmtInt(TRANSITS_FOR_TARGET_MARGIN))
    expect(readout("beyond the Ledger's 2,612")).toHaveTextContent(fmtInt(TRANSITS_FOR_TARGET_MARGIN - LANE_TRANSITS))
    expect(readout(`years at ${fmtInt(TRANSITS_PER_YEAR)} a year`)).toHaveTextContent(fmt(YEARS_FOR_TARGET_MARGIN, 1))
  })

  it('narrows the margin with n and widens it with C, through @/lib/stats', () => {
    render(<MarginPlanner />)
    fireEvent.change(screen.getByLabelText('transits behind the estimate (n)'), { target: { value: '8000' } })
    expect(readout('margin of error')).toHaveTextContent(fmt(laneMargin(8000, 0.95), 5))
    fireEvent.change(screen.getByLabelText('confidence level C'), { target: { value: '99' } })
    expect(readout('margin of error')).toHaveTextContent(fmt(marginOfErrorProportion(LANE_RATE, 8000, 0.99), 5))
  })

  it('prices further years of traffic and carries a data table', () => {
    render(<MarginPlanner />)
    const horizons = screen.getByRole('table', { name: /Margin of error after further years/ })
    expect(within(horizons).getByText(fmt(laneMargin(LANE_TRANSITS + 3 * TRANSITS_PER_YEAR, 0.95), 5))).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /interval for the Lane's loss rate on a number line/ })).toBeInTheDocument()
  })
})

describe('<InverseTail>', () => {
  it('turns an area into a cutoff with zStar', () => {
    render(<InverseTail />)
    expect(readout('cutoff out · z*')).toHaveTextContent(fmt(zStar(0.95), 4))
    expect(readout('one tail · (1 − C)/2')).toHaveTextContent(fmt(0.025, 4))
    expect(readout('cumulative · (1 + C)/2')).toHaveTextContent(fmt(0.975, 4))

    fireEvent.change(screen.getByLabelText('central area C'), { target: { value: '90' } })
    expect(readout('cutoff out · z*')).toHaveTextContent(fmt(zStar(0.9), 4))
  })

  it('shows t* above z*, and t* closing on z* as df grows', () => {
    render(<InverseTail />)
    fireEvent.click(screen.getByRole('radio', { name: 't · t*' }))
    expect(readout('cutoff out · t*')).toHaveTextContent(fmt(t.quantile(0.975, 8), 4))
    expect(readout('t* − z*')).toHaveTextContent(fmt(t.quantile(0.975, 8) - zStar(0.95), 4))
    expect(t.quantile(0.975, 8)).toBeGreaterThan(zStar(0.95))

    fireEvent.change(screen.getByLabelText('degrees of freedom'), { target: { value: '200' } })
    expect(readout('cutoff out · t*')).toHaveTextContent(fmt(t.quantile(0.975, 200), 4))
    expect(t.quantile(0.975, 200) - zStar(0.95)).toBeLessThan(t.quantile(0.975, 8) - zStar(0.95))
  })

  it('labels the curve for a screen reader', () => {
    render(<InverseTail />)
    expect(screen.getByRole('img', { name: /central 95% shaded/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /set a central area and read back the cutoff/ })).toBeInTheDocument()
  })
})
