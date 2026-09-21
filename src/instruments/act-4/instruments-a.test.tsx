import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ClusterSimulator } from './ClusterSimulator'
import { EventSpacePanel } from './EventSpacePanel'
import { ProbabilityTreeBuilder } from './ProbabilityTreeBuilder'
import { IndependenceChecker } from './IndependenceChecker'
import { BeingSeenSimulator } from './BeingSeenSimulator'
import { SinkLedgerPanel } from './SinkLedgerPanel'
import { binomial, fmt, fmtInt, fmtP, geometric, twoWay } from '@/lib/stats'
import {
  CLOSE_PASSES,
  CLUSTER_RUNS,
  FADE_COLS,
  FADE_ROWS,
  MARIUS_MET,
  OBSERVED_CLUSTER,
  P_CLUSTER_SIMULATED,
  P_GRADUAL_GIVEN_LOSS,
  P_LOST,
  P_LOST_GIVEN_PERRINE,
  P_NO_LOSS_GIVEN_GRADUAL,
  P_SEEN_COLD,
  P_SEEN_PER_PASS_COLD,
  P_SWEEP_DETECTS,
  SWEEP_OUTCOMES,
  clusterAtLeastObservedCount,
  consecutiveCounts,
  metStamp,
  sinkAt,
  sweepOutcomeProbs,
} from './data'

/** The value beside a Readout label (first match, which is always the live row). */
function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

/** Render and assert the mount produced no console noise. */
function renderQuiet(ui: ReactElement) {
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const result = render(ui)
  expect(err).not.toHaveBeenCalled()
  expect(warn).not.toHaveBeenCalled()
  err.mockRestore()
  warn.mockRestore()
  return result
}

// =================================================================================================

describe('<ClusterSimulator>', () => {
  it('opens on the logged 10,000-run study and reports the count as well as the run size', () => {
    renderQuiet(<ClusterSimulator />)
    expect(screen.getByRole('region', { name: 'INTEL · CLUSTERING SIMULATION' })).toBeInTheDocument()
    expect(readout('runs completed')).toBe(fmtInt(CLUSTER_RUNS))
    expect(readout(`runs with ${OBSERVED_CLUSTER} or more`)).toBe(fmtInt(clusterAtLeastObservedCount))
    expect(readout('estimated P')).toBe(fmtP(P_CLUSTER_SIMULATED))
    // The lesson: the count and the run size, never a bare probability.
    expect(readout('that is')).toBe(`${fmtInt(clusterAtLeastObservedCount)} of ${fmtInt(CLUSTER_RUNS)}`)
    expect(screen.getByText(new RegExp(`${fmtInt(clusterAtLeastObservedCount)} of ${fmtInt(CLUSTER_RUNS)} runs produced`))).toBeInTheDocument()
  })

  it('carries the trial strip and the distribution with accessible names and data tables', () => {
    render(<ClusterSimulator />)
    expect(screen.getByRole('img', { name: /One simulated period: 31 losses placed uniformly across 2,260 days/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Distribution of the largest 30-day cluster across 10,000 simulated periods/ })).toBeInTheDocument()
    expect(screen.getByText(/One simulated period: 31 losses scattered uniformly across 2,260 days/, { selector: 'caption' })).toBeInTheDocument()
    expect(screen.getByText(/largest 30-day cluster in a simulated period/, { selector: 'caption' })).toBeInTheDocument()
  })

  it('runs a seeded study on RUN and reports it beside the logged one', () => {
    render(<ClusterSimulator />)
    expect(screen.getByRole('radio', { name: 'yours' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'RUN' }))
    expect(readout('runs completed')).toBe('1,000')
    expect(screen.getByRole('radio', { name: 'yours · 1,000' })).toBeEnabled()
    expect(screen.getByText(/Your 1,000 runs against the logged 10,000/)).toBeInTheDocument()

    // The logged study is still there, unchanged, one click away.
    fireEvent.click(screen.getByRole('radio', { name: 'logged · 10,000' }))
    expect(readout('runs completed')).toBe(fmtInt(CLUSTER_RUNS))
    expect(readout(`runs with ${OBSERVED_CLUSTER} or more`)).toBe(fmtInt(clusterAtLeastObservedCount))
  })

  it('reruns the trial strip and flags a window width that no longer matches the logged study', () => {
    render(<ClusterSimulator />)
    const before = screen.getByRole('img', { name: /One simulated period/ }).getAttribute('aria-label')
    fireEvent.click(screen.getByRole('button', { name: 'NEW TRIAL' }))
    expect(screen.getByRole('img', { name: /One simulated period/ }).getAttribute('aria-label')).not.toBe(before)

    fireEvent.change(screen.getByLabelText('window width'), { target: { value: '45' } })
    expect(screen.getByText(/The controls no longer match the logged study/)).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<EventSpacePanel>', () => {
  it('partitions the sweep log into four outcomes whose relative frequencies sum to 1', () => {
    renderQuiet(<EventSpacePanel />)
    expect(screen.getByRole('region', { name: 'SENSOR · SWEEP OUTCOME SPACE' })).toBeInTheDocument()
    expect(screen.getByText(/Four mutually exclusive outcomes; the relative frequencies sum to 1.000/)).toBeInTheDocument()
    expect(SWEEP_OUTCOMES.reduce((s, o) => s + sweepOutcomeProbs[o], 0)).toBeCloseTo(1, 12)
    expect(readout('P(A)')).toBe(fmt(P_SWEEP_DETECTS, 4))
    expect(readout('P(A ∪ B)')).toBe(fmt(P_SWEEP_DETECTS, 4))
    expect(screen.getByRole('img', { name: /Sweep outcome space partitioned into four mutually exclusive outcomes/ })).toBeInTheDocument()
  })

  it('separates the events into a disjoint pair and the addition rule closes', () => {
    render(<EventSpacePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'DISJOINT PAIR' }))
    expect(readout('P(A ∩ B)')).toBe(fmt(0, 4))
    expect(readout('P(A ∪ B)')).toBe(readout('P(A) + P(B)'))
    expect(screen.getByText(/Mutually exclusive: P\(A ∪ B\)/)).toBeInTheDocument()
  })

  it("reproduces Ebele's error in one click: overlapping events summed past 1", () => {
    render(<EventSpacePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'OVERLAPPING PAIR' }))
    const sum = sweepOutcomeProbs.thermal + sweepOutcomeProbs.nothing + (sweepOutcomeProbs.optical + sweepOutcomeProbs.nothing)
    expect(sum).toBeGreaterThan(1)
    expect(readout('P(A) + P(B)')).toBe(fmt(sum, 4))
    expect(readout('P(A ∩ B)')).toBe(fmt(sweepOutcomeProbs.nothing, 4))
    expect(screen.getByText(/which is not a probability at all/)).toBeInTheDocument()

    // Unticking the shared outcome from B removes the overlap.
    fireEvent.click(screen.getByRole('checkbox', { name: 'nothing in event B' }))
    expect(readout('P(A ∩ B)')).toBe(fmt(0, 4))
  })

  it('switches to the complement tool and computes P(at least one) from the survival form', () => {
    render(<EventSpacePanel />)
    fireEvent.click(screen.getByRole('radio', { name: 'two sweeps and more' }))
    expect(readout('P(at least one)')).toBe(fmt(binomial.atLeast(1, 8, P_SWEEP_DETECTS), 4))
    expect(readout('P(no detection) = (1 − p)^k')).toBe(fmt(binomial.pmf(0, 8, P_SWEEP_DETECTS), 4))
    expect(readout('k · p — the wrong answer')).toBe(fmt(8 * P_SWEEP_DETECTS, 4))

    fireEvent.change(screen.getByLabelText('window length'), { target: { value: '20' } })
    expect(readout('P(at least one)')).toBe(fmt(binomial.atLeast(1, 20, P_SWEEP_DETECTS), 4))
    expect(readout('k · p — the wrong answer')).toBe(fmt(20 * P_SWEEP_DETECTS, 4))
    expect(screen.getByText(/which is not a probability\./)).toBeInTheDocument()
    expect(screen.getByText(/Per-sweep detection probability p =/)).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<ProbabilityTreeBuilder>', () => {
  const tw = twoWay(
    [
      [19, 100],
      [12, 0],
    ],
    { rows: [...FADE_ROWS], cols: [...FADE_COLS] },
  )

  it("opens on the Register's fades with the four joints summing to 1", () => {
    renderQuiet(<ProbabilityTreeBuilder />)
    expect(screen.getByRole('region', { name: 'INTEL · CONDITIONAL TREE' })).toBeInTheDocument()
    expect(readout('joints sum to')).toBe(fmt(1, 4))
    expect(readout(`P(${FADE_COLS[1]} | ${FADE_ROWS[0]})`)).toBe(fmt(P_NO_LOSS_GIVEN_GRADUAL, 4))
    expect(readout(`P(${FADE_COLS[0]})`)).toBe(fmt(tw.marginalCols[0], 4))
    expect(screen.getByRole('img', { name: /Two-stage probability tree/ })).toBeInTheDocument()
    expect(screen.getByText(/The four joints sum to 1.0000/, { selector: 'caption' })).toBeInTheDocument()
  })

  it('reverses the conditioning and the two conditionals are different numbers', () => {
    render(<ProbabilityTreeBuilder />)
    const board = readout(`P(${FADE_COLS[1]} | ${FADE_ROWS[0]})`)
    fireEvent.click(screen.getByRole('button', { name: 'REVERSE' }))
    const reversed = readout(`P(${FADE_ROWS[0]} | ${FADE_COLS[0]})`)
    expect(reversed).toBe(fmt(P_GRADUAL_GIVEN_LOSS, 4))
    expect(reversed).not.toBe(board)
    expect(readout('numerator · joint')).toBe(fmt(tw.joint[0][0], 4))
    expect(readout(`denominator · P(${FADE_COLS[0]})`)).toBe(fmt(tw.marginalCols[0], 4))

    fireEvent.click(screen.getByRole('radio', { name: FADE_COLS[1] }))
    expect(readout(`P(${FADE_ROWS[0]} | ${FADE_COLS[1]})`)).toBe(fmt(1, 4))
  })

  it('flags a stage whose branches do not sum to 1 and voids the joints', () => {
    render(<ProbabilityTreeBuilder />)
    const field = screen.getByLabelText(`P(${FADE_ROWS[0]})`)
    fireEvent.change(field, { target: { value: '0.5' } })
    fireEvent.blur(field)
    expect(screen.getByText(/A stage whose branches do not sum to 1 is not a model of anything/)).toBeInTheDocument()
    expect(readout(`P(${FADE_COLS[0]})`)).toBe('—')

    fireEvent.click(screen.getByRole('button', { name: 'RESTORE PRESET' }))
    expect(readout('joints sum to')).toBe(fmt(1, 4))
  })

  it('switches to the being-seen model and reads P(seen) off the tree', () => {
    render(<ProbabilityTreeBuilder preset="seen" purgeShare={0.1} />)
    expect(readout('P(seen)')).toBe(fmt(0.9 * P_SEEN_PER_PASS_COLD + 0.1 * 0.6, 4))
    expect(readout('P(seen | cold)')).toBe(fmt(P_SEEN_PER_PASS_COLD, 4))
    expect(screen.getByText(/A close pass finds her cold with probability/)).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<IndependenceChecker>', () => {
  it('opens on consecutive sweeps, where the conditional is nothing like the marginal', () => {
    renderQuiet(<IndependenceChecker />)
    expect(screen.getByRole('region', { name: 'TACTICAL · INDEPENDENCE CHECK' })).toBeInTheDocument()
    const tw = twoWay(consecutiveCounts, { rows: ['previous sweep detected', 'previous sweep clean'], cols: ['this sweep detects', 'this sweep clean'] })
    expect(readout('P(this sweep detects | previous sweep detected)')).toBe(fmt(tw.rowConditional[0][0], 4))
    expect(readout('P(this sweep detects)')).toBe(fmt(tw.marginalCols[0], 4))
    expect(readout('P(this sweep detects | previous sweep detected)')).not.toBe(readout('P(this sweep detects)'))
    expect(screen.getByText(/Not independent in this file/)).toBeInTheDocument()
    expect(screen.getByText(/Mutually exclusive is not independent/)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Observed and expected counts' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Bar chart comparing P\(this sweep detects given previous sweep detected\)/ })).toBeInTheDocument()
  })

  it('switches to loss by owner and shows the Ledger conditional against the marginal', () => {
    render(<IndependenceChecker />)
    fireEvent.click(screen.getByRole('radio', { name: 'loss × owner' }))
    expect(readout('P(lost | Perrine)')).toBe(fmt(P_LOST_GIVEN_PERRINE, 4))
    expect(readout('P(lost)')).toBe(fmt(P_LOST, 4))
    expect(readout('P(lost | Perrine)')).not.toBe(readout('P(lost)'))
    expect(screen.getByText(/On the logged Ledger that reads/)).toBeInTheDocument()
  })

  it('fills the table with the expected counts, and breaks it again on one edit', () => {
    render(<IndependenceChecker preset="owner" />)
    fireEvent.click(screen.getByRole('button', { name: 'MAKE IT INDEPENDENT' }))
    expect(Number(readout('largest cell gap'))).toBeLessThan(0.5)
    expect(screen.getByText(/Independent to the nearest whole count/)).toBeInTheDocument()
    expect(screen.getByText(/The table now holds the expected counts, rounded to whole hulls/)).toBeInTheDocument()

    const cell = screen.getByLabelText('Perrine, lost')
    fireEvent.change(cell, { target: { value: '40' } })
    fireEvent.blur(cell)
    expect(readout('P(lost | Perrine)')).not.toBe(readout('P(lost)'))
    expect(Number(readout('largest cell gap'))).toBeGreaterThan(0.5)
    expect(screen.getByText(/Not independent in this file/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'RESTORE LOGGED COUNTS' }))
    expect(readout('P(lost | Perrine)')).toBe(fmt(P_LOST_GIVEN_PERRINE, 4))
  })
})

// =================================================================================================

describe('<BeingSeenSimulator>', () => {
  it('gives the registry answer at the middle point and at the other two', () => {
    renderQuiet(<BeingSeenSimulator />)
    expect(screen.getByRole('region', { name: 'TACTICAL · BEING SEEN' })).toBeInTheDocument()
    expect(readout('close passes n')).toBe(String(CLOSE_PASSES.middle))
    expect(readout('P(at least one)')).toBe(fmt(P_SEEN_COLD.middle, 4))
    expect(readout('P(at least one)')).toBe(fmt(binomial.atLeast(1, CLOSE_PASSES.middle, P_SEEN_PER_PASS_COLD), 4))
    expect(Number(readout('P(at least one)'))).toBeCloseTo(0.078, 3)
    expect(readout('P(0 detections)')).toBe(fmt(binomial.pmf(0, CLOSE_PASSES.middle, P_SEEN_PER_PASS_COLD), 4))

    fireEvent.click(screen.getByRole('radio', { name: `near · ${CLOSE_PASSES.near} passes` }))
    expect(readout('P(at least one)')).toBe(fmt(P_SEEN_COLD.near, 4))
    fireEvent.click(screen.getByRole('radio', { name: `far · ${CLOSE_PASSES.far} pass` }))
    expect(readout('P(at least one)')).toBe(fmt(P_SEEN_COLD.far, 4))
  })

  it('runs seeded windows and the simulated estimate lands near the exact answer', () => {
    render(<BeingSeenSimulator />)
    expect(readout('simulated P(≥1)')).toBe('—')
    fireEvent.click(screen.getByRole('button', { name: 'RUN' }))
    expect(readout('windows run')).toBe('1,000')
    const estimate = Number(readout('simulated P(≥1)'))
    expect(estimate).toBeGreaterThan(0.04)
    expect(estimate).toBeLessThan(0.12)
    expect(screen.getByText(/1,000 simulated windows:/)).toBeInTheDocument()
  })

  it('prices one pass at the purging probability when the wings go out', () => {
    render(<BeingSeenSimulator />)
    const cold = readout('P(at least one)')
    fireEvent.click(screen.getByRole('radio', { name: 'one pass at 0.60' }))
    const hot = readout('P(at least one)')
    expect(Number(hot)).toBeGreaterThan(Number(cold))
    expect(Number(hot)).toBeCloseTo(1 - binomial.pmf(0, CLOSE_PASSES.middle - 1, P_SEEN_PER_PASS_COLD) * 0.4, 4)
    expect(screen.getByText(/It is a beacon on a published track/)).toBeInTheDocument()
  })

  it('answers the geometric question with the AP convention stated', () => {
    render(<BeingSeenSimulator mode="geometric" />)
    expect(readout('P(first detection on pass k)')).toBe(fmt(geometric.pmf(10, P_SEEN_PER_PASS_COLD), 5))
    expect(readout('P(by pass k)')).toBe(fmt(geometric.cdf(10, P_SEEN_PER_PASS_COLD), 4))
    expect(readout('P(more than k passes)')).toBe(fmt(geometric.sf(10, P_SEEN_PER_PASS_COLD), 4))
    expect(readout('mean passes to the first')).toBe(fmt(1 / P_SEEN_PER_PASS_COLD, 2))
    expect(screen.getByText(/trials up to and including the first success/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('pass k'), { target: { value: '25' } })
    expect(readout('P(by pass k)')).toBe(fmt(geometric.cdf(25, P_SEEN_PER_PASS_COLD), 4))
    expect(screen.getByText(/Trials up to and including the first success; support 1, 2, 3, …/)).toBeInTheDocument()
  })

  it('lists the scheduled close passes for either Watch window', () => {
    render(<BeingSeenSimulator />)
    const list = screen.getByRole('table', { name: 'Scheduled close passes for Watch window 1' })
    expect(list).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'window 2' }))
    expect(screen.getByRole('table', { name: 'Scheduled close passes for Watch window 2' })).toBeInTheDocument()
  })
})

// =================================================================================================

describe('<SinkLedgerPanel>', () => {
  it('draws the whole Act with both Watch windows and all seven purges', () => {
    renderQuiet(<SinkLedgerPanel />)
    expect(screen.getByRole('region', { name: 'ENGINEERING · THE CELLAR' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Heat sink percentage against mission elapsed time from MET 083\/11:00 to MET 106\/00:00/ })).toBeInTheDocument()
    expect(screen.getByText(/2 Watch windows are shaded; 7 purges are marked/)).toBeInTheDocument()
    expect(screen.getByText(/Watch 1 ·/)).toBeInTheDocument()
    expect(screen.getByText(/Watch 2 ·/)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Sink ledger segments' })).toBeInTheDocument()
    expect(screen.getByText(/Endurance on a Watch window is 67.7 hours ± 4.2/)).toBeInTheDocument()
  })

  it('scrubs by keyboard and the readout follows the ledger', () => {
    render(<SinkLedgerPanel />)
    const handle = screen.getByRole('slider', { name: 'MET scrubber' })
    const before = readout('MET')
    handle.focus()
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(readout('MET')).not.toBe(before)
    fireEvent.keyDown(handle, { key: 'End' })
    expect(readout('MET')).toBe(metStamp(106))
    expect(readout('cellar')).toContain(fmt(sinkAt(106), 1))
    fireEvent.keyDown(handle, { key: 'Home' })
    expect(readout('MET')).toBe('MET 083/11:00')
    expect(readout('profile')).toBe('Quiet')
  })

  it('drops a labelled mark and narrows the window on request', () => {
    render(<SinkLedgerPanel from={102.75} to={105.5} markAt={MARIUS_MET} markLabel="Marius Regio" />)
    expect(screen.getByText(new RegExp('Marius Regio ·'))).toBeInTheDocument()
    expect(readout('MET')).toBe(metStamp(MARIUS_MET))
    expect(readout('cellar')).toContain(fmt(sinkAt(MARIUS_MET), 1))
    expect(screen.getByText(/1 Watch windows are shaded/)).toBeInTheDocument()
  })
})
