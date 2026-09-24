/**
 * act-8-01 / act-8-02 instruments: GofVisualiser and PicketTree. Every assertion makes the same
 * point — the panel is showing what `@/lib/stats` and `@/instruments/act-8/data` say, and not a
 * second implementation of it.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { GofVisualiser } from './GofVisualiser'
import { PicketTree } from './PicketTree'
import { chiSquareGOF, fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats'
import {
  CARGO_CATEGORIES,
  CARGO_EXPECTED,
  CARGO_GOF,
  LANE_CARGO_PROBS,
  LOSS_N,
  PATIENCE_RANGE_KM,
  P_ON_PICKET_GIVEN_PRESENT,
  P_PICKET_CAN_RESPOND,
  P_WRECKER_PRESENT,
  SLUG_FLIGHT_MIN,
  TORCH_FROM_WATCH_MIN,
  VOLATILES_INDEX,
  cargoObserved,
} from './data'

/** The value cell next to a readout's label. */
function readout(label: string | RegExp): HTMLElement {
  const el = screen.getByText(label, { selector: 'span.dr-readout__label' })
  const value = el.nextElementSibling
  if (!value) throw new Error(`readout "${String(label)}" has no value cell`)
  return value as HTMLElement
}

// ---------------------------------------------------------------------------------------------
// act-8-01 · GofVisualiser
// ---------------------------------------------------------------------------------------------

describe('<GofVisualiser>', () => {
  it('opens on the cargo table and reports what chiSquareGOF returned', () => {
    render(<GofVisualiser />)
    expect(screen.getByRole('region', { name: /chi-square goodness of fit/i })).toBeInTheDocument()
    expect(readout(`χ² over ${fmtInt(CARGO_CATEGORIES.length)} of ${fmtInt(CARGO_CATEGORIES.length)} categories`)).toHaveTextContent(fmt(CARGO_GOF.statistic, 2))
    expect(readout('df · categories − 1')).toHaveTextContent(fmtInt(CARGO_GOF.df as number))
    expect(readout('P-value')).toHaveTextContent(fmtP(CARGO_GOF.pValue as number))
    expect(readout('smallest expected count')).toHaveTextContent(fmt(Math.min(...CARGO_EXPECTED), 2))
  })

  it('names volatiles as the largest contributor and something else as the tallest bar', () => {
    render(<GofVisualiser />)
    expect(readout('largest contributor')).toHaveTextContent(CARGO_CATEGORIES[CARGO_GOF.largestContributor])
    expect(CARGO_GOF.largestContributor).toBe(VOLATILES_INDEX)
    expect(readout('its share of the statistic')).toHaveTextContent(fmtPct(CARGO_GOF.contributions[VOLATILES_INDEX] / CARGO_GOF.statistic, 0))
  })

  it('accumulates the statistic one category at a time', () => {
    render(<GofVisualiser />)
    fireEvent.change(screen.getByLabelText('categories accumulated'), { target: { value: '0' } })
    expect(readout('χ² over 0 of 4 categories')).toHaveTextContent(fmt(0, 2))
    expect(readout('still to come')).toHaveTextContent(fmt(CARGO_GOF.statistic, 2))

    fireEvent.click(screen.getByRole('button', { name: /ADD ONE CATEGORY/ }))
    expect(readout('χ² over 1 of 4 categories')).toHaveTextContent(fmt(CARGO_GOF.contributions[0], 2))

    fireEvent.click(screen.getByRole('button', { name: /ADD ONE CATEGORY/ }))
    const two = CARGO_GOF.contributions[0] + CARGO_GOF.contributions[1]
    expect(readout('χ² over 2 of 4 categories')).toHaveTextContent(fmt(two, 2))
    // Two categories in, most of the statistic is already on the board.
    expect(two / CARGO_GOF.statistic).toBeGreaterThan(0.85)
  })

  it('shows what feeding the formula percentages does, and proportions in the other direction', () => {
    render(<GofVisualiser />)
    const n = LOSS_N
    const pct = chiSquareGOF({
      observed: cargoObserved.map((o) => (o / n) * 100),
      expected: LANE_CARGO_PROBS.map((p) => p * 100),
      categories: CARGO_CATEGORIES,
    })
    fireEvent.click(screen.getByRole('radio', { name: 'percentages' }))
    expect(readout('χ² over 4 of 4 categories')).toHaveTextContent(fmt(pct.statistic, 2))
    expect(pct.statistic).toBeGreaterThan(CARGO_GOF.statistic)

    const prop = chiSquareGOF({ observed: cargoObserved.map((o) => o / n), expected: LANE_CARGO_PROBS, categories: CARGO_CATEGORIES })
    fireEvent.click(screen.getByRole('radio', { name: 'proportions' }))
    expect(readout('χ² over 4 of 4 categories')).toHaveTextContent(fmt(prop.statistic, 4))
    expect(prop.pValue as number).toBeGreaterThan(0.05)
    expect(CARGO_GOF.pValue as number).toBeLessThan(0.05)
  })

  it('switches from the observed bars to the contributions', () => {
    render(<GofVisualiser />)
    expect(screen.getByRole('img', { name: /Observed figures with the expected figure marked/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'contributions' }))
    expect(screen.getByRole('img', { name: /Contribution to the chi-square statistic/i })).toBeInTheDocument()
  })

  it('carries the whole working as an accessible table', () => {
    render(<GofVisualiser />)
    const table = screen.getByRole('table', { name: /Goodness-of-fit working/i })
    expect(within(table).getAllByRole('row')).toHaveLength(CARGO_CATEGORIES.length + 1)
    expect(within(table).getByText(fmt(CARGO_EXPECTED[VOLATILES_INDEX], 2))).toBeInTheDocument()
    expect(within(table).getByText(fmt(CARGO_GOF.contributions[VOLATILES_INDEX], 2))).toBeInTheDocument()
  })

  it('is keyboard operable', () => {
    render(<GofVisualiser />)
    expect(screen.getByLabelText('categories accumulated')).toHaveAttribute('type', 'range')
    expect(screen.getByRole('radiogroup', { name: /feed the statistic/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// act-8-02 · PicketTree
// ---------------------------------------------------------------------------------------------

describe('<PicketTree>', () => {
  it('opens on the signed model and multiplies the two branches out', () => {
    render(<PicketTree />)
    expect(screen.getByRole('region', { name: /picket model/i })).toBeInTheDocument()
    expect(readout('P(a picket can respond)')).toHaveTextContent(fmt(P_PICKET_CAN_RESPOND, 3))
    expect(readout('that as a percentage')).toHaveTextContent(fmtPct(P_PICKET_CAN_RESPOND, 0))
    expect(readout('P(nothing answers)')).toHaveTextContent(fmt(1 - P_PICKET_CAN_RESPOND, 3))
    expect(readout('leaves sum to')).toHaveTextContent(fmt(1, 3))
    expect(P_PICKET_CAN_RESPOND).toBeCloseTo(P_WRECKER_PRESENT * P_ON_PICKET_GIVEN_PRESENT, 12)
  })

  it('moves the product when either branch is dragged, and comes back on the reset', () => {
    render(<PicketTree />)
    fireEvent.change(screen.getByLabelText('P(a wrecker is at Kettle)'), { target: { value: '0.5' } })
    expect(readout('P(a picket can respond)')).toHaveTextContent(fmt(0.5 * P_ON_PICKET_GIVEN_PRESENT, 3))

    fireEvent.change(screen.getByLabelText('P(on picket in the approach quarter | present)'), { target: { value: '0.8' } })
    expect(readout('P(a picket can respond)')).toHaveTextContent(fmt(0.5 * 0.8, 3))
    expect(readout('leaves sum to')).toHaveTextContent(fmt(1, 3))

    fireEvent.click(screen.getByRole('button', { name: /THE SIGNED MODEL/ }))
    expect(readout('P(a picket can respond)')).toHaveTextContent(fmt(P_PICKET_CAN_RESPOND, 3))
  })

  it('lists three leaves, one of which responds, and says there is no detection branch', () => {
    render(<PicketTree />)
    const table = screen.getByRole('table', { name: /each path through the tree/i })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getAllByText('yes')).toHaveLength(1)
    expect(within(table).getAllByText('no')).toHaveLength(2)
    expect(within(table).getByText(fmt(P_PICKET_CAN_RESPOND, 4))).toBeInTheDocument()
    expect(screen.getByText(/no detection branch in this tree/i)).toBeInTheDocument()
  })

  it('reads the approach physics off the dataset rather than restating it', () => {
    render(<PicketTree />)
    expect(readout(`slug flight from ${fmtInt(PATIENCE_RANGE_KM)} km`)).toHaveTextContent(fmt(SLUG_FLIGHT_MIN, 1))
    expect(readout('torch from Watch')).toHaveTextContent(fmtInt(TORCH_FROM_WATCH_MIN))
    expect(SLUG_FLIGHT_MIN).toBeLessThan(TORCH_FROM_WATCH_MIN)
  })

  it('describes the tree for a screen reader', () => {
    render(<PicketTree />)
    expect(screen.getByRole('img', { name: /Probability tree with two branches and three leaves/i })).toBeInTheDocument()
  })
})
