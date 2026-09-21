import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { DesignBuilder } from './DesignBuilder'
import { RandomizationMachine } from './RandomizationMachine'
import { useProgress } from '@/store/progress'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtP, mean, permutationPValue, permutationTest } from '@/lib/stats'
import {
  BOARD_ASSIGNMENT,
  BOARD_TRIAL,
  LOTTERY_ESCORTED,
  LOTTERY_EXACT,
  LOTTERY_UNESCORTED,
  PILOT_ESCORTED,
  PILOT_EXACT,
  PILOT_TRANSITS,
  PILOT_UNESCORTED,
  blockedAssignment,
  groupMeans,
  ownerImbalance,
  randomAssignment,
} from './data'

beforeEach(() => {
  useProgress.getState().resetAll()
})

/** The value span of a <Readout label="…"> (labels collide with axis text and table headers). */
function readout(label: string): Element {
  const hit = screen.getAllByText(label).find((el) => el.classList.contains('dr-readout__label'))
  if (!hit?.nextElementSibling) throw new Error(`no readout labelled "${label}"`)
  return hit.nextElementSibling
}

describe('<DesignBuilder>', () => {
  it('pins the confounding indicator at 1.00 on the Board’s assignment and drives it to 0.00 when blocked', () => {
    render(<DesignBuilder />)
    expect(screen.getByRole('region', { name: 'TACTICAL · DESIGN BUILDER' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Group balance on three lurking variables/ })).toBeInTheDocument()
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)

    // The Board's own assignment: owner is a perfect stand-in for escort.
    const boardMeans = groupMeans(BOARD_ASSIGNMENT)
    expect(readout('confounding indicator')).toHaveTextContent(fmt(ownerImbalance(BOARD_ASSIGNMENT), 2))
    expect(readout('confounding indicator')).toHaveTextContent('1.00')
    expect(readout('mean advisories · ESCORT')).toHaveTextContent(fmt(boardMeans.escorted, 2))
    expect(readout('mean advisories · NO ESCORT')).toHaveTextContent(fmt(boardMeans.unescorted, 2))
    expect(readout('difference · escort − none')).toHaveTextContent(fmt(boardMeans.difference, 2))

    // Blocking by owner balances owner exactly, by construction.
    fireEvent.click(screen.getByRole('button', { name: 'RANDOMIZE WITHIN OWNER (BLOCKED)' }))
    const blocked = blockedAssignment(rng('act-3-04', 1))
    expect(readout('confounding indicator')).toHaveTextContent(fmt(ownerImbalance(blocked), 2))
    expect(readout('confounding indicator')).toHaveTextContent('0.00')
    expect(readout('mean advisories · ESCORT')).toHaveTextContent(fmt(groupMeans(blocked).escorted, 2))

    // A completely randomized assignment lands near zero, not at it.
    fireEvent.click(screen.getByRole('button', { name: 'RANDOMIZE (COMPLETELY RANDOMIZED)' }))
    const randomized = randomAssignment(rng('act-3-04', 2), 13)
    expect(readout('confounding indicator')).toHaveTextContent(fmt(ownerImbalance(randomized), 2))
    expect(ownerImbalance(randomized)).toBeLessThan(0.5)

    // …and the Board's assignment can be restored.
    fireEvent.click(screen.getByRole('button', { name: /THE BOARD.S ASSIGNMENT/ }))
    expect(readout('confounding indicator')).toHaveTextContent('1.00')
  })

  it('lets the learner move a hull between groups from the keyboard and recomputes the balance', () => {
    render(<DesignBuilder />)
    const roster = screen.getByRole('table', { name: /Escort trial roster, 26 transits/ })
    const groupButtons = within(roster).getAllByRole('button')
    expect(groupButtons).toHaveLength(BOARD_TRIAL.length)
    expect(groupButtons).toHaveLength(26)

    const first = within(roster).getByRole('button', { name: `${BOARD_TRIAL[0].hull}: ESCORT. Activate to move it to the other group.` })
    fireEvent.click(first)
    const moved = BOARD_TRIAL.map((_, i) => (i === 0 ? false : BOARD_ASSIGNMENT[i]))
    expect(readout('confounding indicator')).toHaveTextContent(fmt(ownerImbalance(moved), 2))
    expect(readout('mean advisories · ESCORT')).toHaveTextContent(fmt(groupMeans(moved).escorted, 2))
    expect(within(roster).getByRole('button', { name: `${BOARD_TRIAL[0].hull}: NO ESCORT. Activate to move it to the other group.` })).toBeInTheDocument()

    // Arrow keys walk the roster.
    const second = within(roster).getByRole('button', { name: new RegExp(`^${BOARD_TRIAL[1].hull}:`) })
    fireEvent.keyDown(within(roster).getByRole('button', { name: new RegExp(`^${BOARD_TRIAL[0].hull}:`) }), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)
  })

  it('reports the secondary lurking variables the Board also let drift', () => {
    render(<DesignBuilder />)
    const esc = BOARD_TRIAL.filter((_, i) => BOARD_ASSIGNMENT[i])
    const un = BOARD_TRIAL.filter((_, i) => !BOARD_ASSIGNMENT[i])
    const dayE = mean(esc.map((t) => t.departureDay))
    const dayU = mean(un.map((t) => t.departureDay))
    expect(readout('mean departure day · ESCORT / NONE')).toHaveTextContent(`${fmt(dayE, 1)} / ${fmt(dayU, 1)}`)
    expect(readout('group sizes')).toHaveTextContent(`${fmtInt(esc.length)} / ${fmtInt(un.length)}`)
  })
})

describe('<RandomizationMachine>', () => {
  it('locates the observed difference in the exact distribution of all 924 relabellings', () => {
    render(<RandomizationMachine />)
    expect(screen.getByRole('region', { name: 'TACTICAL · RANDOMIZATION TEST' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Randomization distribution of the difference in mean advisories/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /The 12 transits of the escort lottery by group/ })).toBeInTheDocument()
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)
    expect(readout('observed difference')).toHaveTextContent(fmt(LOTTERY_EXACT.observed, 2))
    expect(readout('mean advisories · escorted')).toHaveTextContent(fmt(mean(LOTTERY_ESCORTED), 2))
    expect(readout('mean advisories · unescorted')).toHaveTextContent(fmt(mean(LOTTERY_UNESCORTED), 2))
    expect(readout('relabellings used')).toHaveTextContent('0')

    fireEvent.click(screen.getByRole('button', { name: `EXACT (ALL ${fmtInt(LOTTERY_EXACT.count)})` }))
    expect(readout('relabellings used')).toHaveTextContent(fmtInt(LOTTERY_EXACT.count))
    expect(readout('relabellings used')).toHaveTextContent('924')
    expect(readout('one-sided p')).toHaveTextContent(fmtP(LOTTERY_EXACT.pLess))
    expect(readout('two-sided p')).toHaveTextContent(fmtP(LOTTERY_EXACT.pTwoSided))
    expect(readout('relabellings at or below the observed')).toHaveTextContent(fmtInt(Math.round(LOTTERY_EXACT.pLess * LOTTERY_EXACT.count)))
    // The observed difference is not in the tail: the trial could not have told you either way.
    expect(LOTTERY_EXACT.pLess).toBeGreaterThan(0.05)
  })

  it('shuffles once, prints which transits drew ESCORT, and builds the simulated distribution', () => {
    render(<RandomizationMachine />)
    fireEvent.click(screen.getByRole('button', { name: 'SHUFFLE ONCE' }))

    const r = rng('act-3-05', 'the escort lottery', 1)
    const pooled = [...LOTTERY_ESCORTED, ...LOTTERY_UNESCORTED]
    const order = r.shuffle(pooled.map((_, i) => i))
    const diff = mean(order.slice(0, LOTTERY_ESCORTED.length).map((i) => pooled[i])) - mean(order.slice(LOTTERY_ESCORTED.length).map((i) => pooled[i]))
    // Six of the twelve transit labels are printed as this shuffle's ESCORT group.
    const log = screen.getByText(/SHUFFLE 1 · ESCORT →/)
    expect(log).toHaveTextContent(fmt(diff, 2))
    expect(log.textContent?.match(/\b\d{2}\b/g)?.length).toBeGreaterThanOrEqual(LOTTERY_ESCORTED.length)
    expect(readout('relabellings used')).toHaveTextContent('1')

    fireEvent.click(screen.getByRole('button', { name: 'SHUFFLE 100' }))
    const batch = permutationTest(LOTTERY_ESCORTED, LOTTERY_UNESCORTED, { rng: rng('act-3-05', 'the escort lottery', 'batch', 2), reps: 100, alt: 'less' })
    const all = [diff, ...batch.stats]
    expect(readout('relabellings used')).toHaveTextContent('101')
    expect(readout('one-sided p')).toHaveTextContent(fmtP(permutationPValue(all, LOTTERY_EXACT.observed, 'less')))
    expect(readout('two-sided p')).toHaveTextContent(fmtP(permutationPValue(all, LOTTERY_EXACT.observed, 'two-sided')))

    fireEvent.click(screen.getByRole('button', { name: 'RESET' }))
    expect(readout('relabellings used')).toHaveTextContent('0')
    expect(readout('one-sided p')).toHaveTextContent('—')
  })

  it('runs on Asgard’s six-transit pilot when the MDX passes it', () => {
    render(<RandomizationMachine escorted={PILOT_ESCORTED} unescorted={PILOT_UNESCORTED} exact={PILOT_EXACT} transits={PILOT_TRANSITS} name="Asgard’s six-transit pilot" />)
    expect(screen.getByRole('img', { name: /The 6 transits of Asgard’s six-transit pilot by group/ })).toBeInTheDocument()
    expect(readout('observed difference')).toHaveTextContent(fmt(PILOT_EXACT.observed, 2))

    fireEvent.click(screen.getByRole('button', { name: `EXACT (ALL ${fmtInt(PILOT_EXACT.count)})` }))
    expect(readout('relabellings used')).toHaveTextContent(fmtInt(PILOT_EXACT.count))
    expect(readout('relabellings used')).toHaveTextContent('20')
    expect(readout('one-sided p')).toHaveTextContent(fmtP(PILOT_EXACT.pLess))
  })
})
