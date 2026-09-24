/**
 * Act VIII group-B instruments: TwoWayVisualiser (act-8-03 and act-8-04, on three different
 * tables) and CategoricalProcedureSelector (act-8-04).
 *
 * Every expected number is recomputed from `@/lib/stats` or read off `./data`, never typed in.
 * jsdom has no layout, so `useChartFrame` falls back to its default width; the mosaic is one rect
 * per cell whatever that width is, and the assertions go through the data-table fallback.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { chiSquareIndependence, expectedCounts, fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats'
import {
  BENEFICIARY_ROWS,
  BENEFICIARY_TEST,
  CAUSE_COLS,
  CORRIDOR_ROWS,
  CORRIDOR_TEST,
  DACRE_DIVERTED_EXPECTED,
  DIVERTED_COLS,
  EXAMINER_CHI2_INVALID,
  EXAMINER_ROWS,
  OUTCOME_COLS,
  PERRINE_LOST_EXPECTED,
  beneficiaryTable,
  corridorTable,
  corridorUnknownShare,
  examinerTable,
} from './data'
import { TwoWayVisualiser } from './TwoWayVisualiser'
import { CATEGORICAL_QUESTIONS, CategoricalProcedureSelector, LEAF_LABEL, leafOf } from './CategoricalProcedureSelector'

/** Text of the value cell of the <Readout> whose label is exactly `label`. */
function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

const beneficiary = (
  <TwoWayVisualiser
    rowLabels={BENEFICIARY_ROWS}
    colLabels={OUTCOME_COLS}
    table={beneficiaryTable}
    result={BENEFICIARY_TEST}
    ariaLabel="loss by beneficiary over the Ledger's transits"
    rowAxisLabel="beneficiary"
    colAxisLabel="outcome"
    highlight={[0, 0]}
  />
)

// ---------------------------------------------------------------------------------------------
// TwoWayVisualiser
// ---------------------------------------------------------------------------------------------

describe('<TwoWayVisualiser> on the beneficiary table (2 × 2, independence)', () => {
  it('opens on the observed counts with each expected count under it', () => {
    render(beneficiary)
    expect(screen.getByRole('region', { name: /Two-way table display/ })).toBeInTheDocument()
    const table = screen.getByRole('table', { name: /observed values/ })
    expect(within(table).getByText(fmtInt(beneficiaryTable[0][0]))).toBeInTheDocument()
    expect(within(table).getByText(`exp ${fmt(PERRINE_LOST_EXPECTED, 2)}`)).toBeInTheDocument()
    // Row and column margins are printed, so the expected table can be checked against them.
    expect(within(table).getAllByText(String(BENEFICIARY_TEST.total)).length).toBeGreaterThan(0)
    expect(BENEFICIARY_TEST.total).toBe(beneficiaryTable.flat().reduce((a, b) => a + b, 0))
  })

  it('recomputes its own headline from the library rather than trusting the export', () => {
    const fresh = chiSquareIndependence(beneficiaryTable, { random: true, populationSize: 40_000 })
    expect(fresh.statistic).toBeCloseTo(BENEFICIARY_TEST.statistic, 12)
    expect(fresh.expectedTable[0][0]).toBeCloseTo(PERRINE_LOST_EXPECTED, 12)
    render(beneficiary)
    expect(readout('χ²')).toBe(fmt(fresh.statistic, 2))
    expect(readout('df')).toBe(fmtInt(fresh.df!))
    expect(readout('P')).toBe(fmtP(fresh.pValue!))
  })

  it('switches to the expected counts and prints the margin rule', () => {
    render(beneficiary)
    fireEvent.click(screen.getByRole('radio', { name: 'expected' }))
    const table = screen.getByRole('table', { name: /expected values/ })
    for (const row of expectedCounts(beneficiaryTable)) for (const e of row) expect(within(table).getByText(fmt(e, 2))).toBeInTheDocument()
    expect(screen.getByText(/row total × column total ÷/)).toBeInTheDocument()
  })

  it('names the driving cell on the contribution view', () => {
    render(beneficiary)
    fireEvent.click(screen.getByRole('radio', { name: 'contributions' }))
    expect(BENEFICIARY_TEST.largestContributor).toBe(0)
    const note = screen.getByText(/Largest contribution/)
    expect(note.textContent).toContain(BENEFICIARY_ROWS[0])
    expect(note.textContent).toContain(OUTCOME_COLS[0])
    expect(note.textContent).toContain(fmt(PERRINE_LOST_EXPECTED, 2))
    expect(readout('driving cell')).toBe(`${BENEFICIARY_ROWS[0]} · ${OUTCOME_COLS[0]}`)
  })

  it('withholds the statistic, the degrees of freedom and the P-value when the module has not run the test', () => {
    render(
      <TwoWayVisualiser rowLabels={BENEFICIARY_ROWS} colLabels={OUTCOME_COLS} table={beneficiaryTable} result={BENEFICIARY_TEST} ariaLabel="loss by beneficiary" showTest={false} />,
    )
    expect(screen.queryByText('χ²', { selector: '.dr-readout__label' })).toBeNull()
    expect(screen.queryByText('df', { selector: '.dr-readout__label' })).toBeNull()
    expect(screen.queryByText('P', { selector: '.dr-readout__label' })).toBeNull()
    // The expected counts are still there: setting the table up is what the module is for.
    expect(screen.getByText(`exp ${fmt(PERRINE_LOST_EXPECTED, 2)}`)).toBeInTheDocument()
  })
})

describe('<TwoWayVisualiser> on the corridor table (2 × 3, homogeneity)', () => {
  const corridor = (
    <TwoWayVisualiser
      rowLabels={CORRIDOR_ROWS}
      colLabels={CAUSE_COLS}
      table={corridorTable}
      result={CORRIDOR_TEST}
      ariaLabel="cause code by corridor"
      rowAxisLabel="corridor"
      colAxisLabel="cause code"
      defaultLayer="mosaic"
    />
  )

  it('opens on the mosaic and puts the row-conditional percentages in the data table', () => {
    render(corridor)
    const table = screen.getByRole('table', { name: /Row-conditional percentages|corridor/ })
    expect(within(table).getByText(fmtPct(corridorUnknownShare[0], 1))).toBeInTheDocument()
    expect(within(table).getByText(fmtPct(corridorUnknownShare[1], 1))).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Mosaic of cause code by corridor/ })).toBeInTheDocument()
  })

  it('names the column where the two corridors split furthest apart', () => {
    render(corridor)
    const note = screen.getByText(/The widest split is/)
    expect(note.textContent).toContain('unknown')
    expect(note.textContent).toContain(fmtPct(Math.max(...corridorUnknownShare), 0))
    expect(note.textContent).toContain(fmtPct(Math.min(...corridorUnknownShare), 0))
  })

  it('reads two degrees of freedom off a 2 × 3 and carries a homogeneity conditions block', () => {
    render(corridor)
    expect(readout('df')).toBe(fmtInt(2))
    expect(CORRIDOR_TEST.df).toBe(2)
    expect(screen.getByText('Expected counts ≥ 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'observed' }))
    const obs = screen.getByRole('table', { name: /observed values/ })
    expect(within(obs).getByText(String(corridorTable[1][1]))).toBeInTheDocument()
  })
})

describe('<TwoWayVisualiser> on the examiner table (conditions fail)', () => {
  it('flags the failed expected-count condition and says what to do instead', () => {
    render(
      <TwoWayVisualiser
        rowLabels={EXAMINER_ROWS}
        colLabels={DIVERTED_COLS}
        table={examinerTable}
        result={EXAMINER_CHI2_INVALID}
        ariaLabel="examiner against diverted over the Bureau's departures"
        highlight={[0, 0]}
        showTest={false}
      />,
    )
    expect(screen.getByText(`exp ${fmt(DACRE_DIVERTED_EXPECTED, 2)}`)).toBeInTheDocument()
    expect(DACRE_DIVERTED_EXPECTED).toBeLessThan(5)
    const alert = screen.getByText(/the chi-square/i)
    expect(alert.textContent).toContain(fmt(Math.min(...EXAMINER_CHI2_INVALID.expected), 2))
    expect(alert.textContent).toMatch(/Simulate the null/)
    // No P-value is offered anywhere on the panel: the one this table would produce is not a finding.
    expect(screen.queryByText('P', { selector: '.dr-readout__label' })).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// CategoricalProcedureSelector
// ---------------------------------------------------------------------------------------------

describe('<CategoricalProcedureSelector> (act-8-04)', () => {
  it('offers all seven endings and a question for each of them', () => {
    const leaves = new Set(CATEGORICAL_QUESTIONS.map(leafOf))
    expect(leaves.size).toBe(7)
    expect([...leaves].sort()).toEqual(['census', 'gof', 'homogeneity', 'independence', 'one-prop', 'simulate', 'two-prop'])
  })

  it('opens on the tree and explains a wrong turn at the turn without advancing', () => {
    render(<CategoricalProcedureSelector />)
    expect(screen.getByRole('region', { name: /Categorical procedure selector/ })).toBeInTheDocument()
    // Question 1 is the cargo mix: one sample, one variable, a claimed distribution.
    expect(leafOf(CATEGORICAL_QUESTIONS[0])).toBe('gof')
    fireEvent.click(screen.getByRole('button', { name: 'every unit there is' }))
    expect(screen.getByText(/This file is a sample from a larger body/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /one group, classified afterwards/ })).toBeNull()
  })

  it('walks a question to its leaf and shows that question’s own reason', () => {
    render(<CategoricalProcedureSelector />)
    fireEvent.click(screen.getByRole('button', { name: /a sample drawn from something larger/ }))
    fireEvent.click(screen.getByRole('button', { name: /one group, classified afterwards/ }))
    fireEvent.click(screen.getByRole('button', { name: 'one' }))
    fireEvent.click(screen.getByRole('button', { name: /a claimed distribution over all the categories/ }))
    fireEvent.click(screen.getByRole('button', { name: /yes, every one of them/ }))
    expect(readout('procedure')).toBe(LEAF_LABEL.gof)
    expect(screen.getByText(CATEGORICAL_QUESTIONS[0].because)).toBeInTheDocument()
  })

  it('stops the census question after one turn, because there is nothing else to ask', () => {
    render(<CategoricalProcedureSelector />)
    const census = CATEGORICAL_QUESTIONS.find((q) => leafOf(q) === 'census')!
    fireEvent.click(screen.getByRole('radio', { name: String(CATEGORICAL_QUESTIONS.indexOf(census) + 1) }))
    fireEvent.click(screen.getByRole('button', { name: 'every unit there is' }))
    expect(readout('procedure')).toBe(LEAF_LABEL.census)
    expect(screen.queryByRole('button', { name: /one group, classified afterwards/ })).toBeNull()
  })

  it('sends a failed expected-count table to the simulation leaf', () => {
    render(<CategoricalProcedureSelector />)
    const sim = CATEGORICAL_QUESTIONS.find((q) => leafOf(q) === 'simulate')!
    fireEvent.click(screen.getByRole('radio', { name: String(CATEGORICAL_QUESTIONS.indexOf(sim) + 1) }))
    fireEvent.click(screen.getByRole('button', { name: /a sample drawn from something larger/ }))
    fireEvent.click(screen.getByRole('button', { name: /one group, classified afterwards/ }))
    fireEvent.click(screen.getByRole('button', { name: 'two' }))
    fireEvent.click(screen.getByRole('button', { name: /yes, every one of them/ }))
    expect(screen.getByText(/the chi-square curve is the wrong reference distribution/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /at least one is below five/ }))
    expect(readout('procedure')).toBe(LEAF_LABEL.simulate)
  })

  it('grades a correct pick and a wrong one, and keeps a running score', () => {
    render(<CategoricalProcedureSelector mode="pick" />)
    expect(readout('correct so far')).toBe('0 / 0')
    fireEvent.click(screen.getByRole('button', { name: LEAF_LABEL.gof }))
    fireEvent.click(screen.getByRole('button', { name: 'GRADE THIS ONE' }))
    expect(readout('correct so far')).toBe('1 / 1')
    expect(screen.getByText(new RegExp(`Correct: ${LEAF_LABEL.gof}`))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'NEXT QUESTION' }))
    // Question 2 is loss by beneficiary: one sample, two variables. Homogeneity is the near miss.
    expect(leafOf(CATEGORICAL_QUESTIONS[1])).toBe('independence')
    fireEvent.click(screen.getByRole('button', { name: LEAF_LABEL.homogeneity }))
    fireEvent.click(screen.getByRole('button', { name: 'GRADE THIS ONE' }))
    expect(readout('correct so far')).toBe('1 / 2')
    expect(screen.getByText(new RegExp(`Not ${LEAF_LABEL.homogeneity}`))).toBeInTheDocument()
    expect(screen.getByText(/Sorting a single sample by one of its own columns/)).toBeInTheDocument()
  })

  it('carries a reference matrix with all seven endings and keyboard-operable controls', () => {
    render(<CategoricalProcedureSelector mode="reference" />)
    const table = screen.getByRole('table', { name: /Reference matrix of data collection/ })
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    for (const name of Object.values(LEAF_LABEL)) expect(within(table).getByText(name)).toBeInTheDocument()
    for (const r of screen.getAllByRole('radio')) expect(r).toHaveAttribute('tabindex')
  })
})
