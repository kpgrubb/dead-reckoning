/**
 * act-9-02 / 03 / 04 instruments: SlopeCaptureSimulator, SlopeTestVisualiser, ProcedurePicker and
 * EvidenceBoard. Every number asserted here is recomputed from `@/lib/stats`, `@/lib/rng` and
 * `@/instruments/act-9/data` — the panels are never allowed to be the source of their own truth.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SlopeCaptureSimulator } from './SlopeCaptureSimulator'
import { SlopeTestVisualiser } from './SlopeTestVisualiser'
import { EvidenceBoard, LIMITATION_KEY, ProcedurePicker } from './EvidenceBoard'
import { CASE_FILE, PROCEDURE_LABEL } from './case-file'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtP, slopeInterval } from '@/lib/stats'
import { BETA_PHYSICAL, KETTLE_FIT, KETTLE_TEST_PHYSICAL, KETTLE_TEST_ZERO, SLOPE_SIM_N, honest881 } from './data'

function readout(label: string | RegExp): HTMLElement {
  const el = screen.getByText(label, { selector: 'span.dr-readout__label' })
  const value = el.nextElementSibling
  if (!value) throw new Error(`readout "${String(label)}" has no value cell`)
  return value as HTMLElement
}

let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  expect(errorSpy).not.toHaveBeenCalled()
  errorSpy.mockRestore()
})

// ---------------------------------------------------------------------------------------------
// act-9-02 · SlopeCaptureSimulator
// ---------------------------------------------------------------------------------------------

/** The same interval the panel builds for run k, rebuilt outside it. */
function expectedInterval(index: number, n = SLOPE_SIM_N, confidence = 0.95) {
  const r = rng('act-9-02/capture', index)
  const idx = r.sample([...Array(honest881.length).keys()], n)
  return slopeInterval(
    idx.map((i) => honest881[i].requiredFuel),
    idx.map((i) => honest881[i].fuelLoaded),
    { confidence, random: true, populationSize: honest881.length },
  )
}

describe('<SlopeCaptureSimulator>', () => {
  it('opens empty, with the panel label and the chart named', () => {
    render(<SlopeCaptureSimulator />)
    expect(screen.getByRole('region', { name: /Slope capture simulator/i })).toBeInTheDocument()
    expect(screen.getByText('TACTICAL · SLOPE CAPTURE')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /confidence intervals for the slope, drawn against the true slope/i })).toBeInTheDocument()
    expect(readout('intervals run')).toHaveTextContent(fmtInt(0))
    expect(readout('nominal level')).toHaveTextContent('95')
  })

  it('builds the interval the library builds, one run at a time', () => {
    render(<SlopeCaptureSimulator />)
    fireEvent.click(screen.getByRole('button', { name: 'RUN 1' }))

    const first = expectedInterval(0)
    const [lo, hi] = first.ci as [number, number]
    expect(readout('intervals run')).toHaveTextContent(fmtInt(1))
    expect(readout('latest b')).toHaveTextContent(fmt(first.b, 4))
    expect(readout('latest interval')).toHaveTextContent(`(${fmt(lo, 4)}, ${fmt(hi, 4)})`)
    expect(readout('latest verdict')).toHaveTextContent(lo <= 1 && 1 <= hi ? 'covers' : 'MISSES')
  })

  it('counts fifty more and reports a capture rate near the nominal level', () => {
    render(<SlopeCaptureSimulator />)
    fireEvent.click(screen.getByRole('button', { name: 'RUN 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'RUN 50' }))
    expect(readout('intervals run')).toHaveTextContent(fmtInt(51))

    const covered = Array.from({ length: 51 }, (_, k) => expectedInterval(k)).filter((r) => {
      const [lo, hi] = r.ci as [number, number]
      return lo <= 1 && 1 <= hi
    }).length
    expect(readout('intervals covering 1.00')).toHaveTextContent(fmtInt(covered))
    expect(covered / 51).toBeGreaterThan(0.8)
  })

  it('clears the board when the level or the sample size changes, and on RESET', () => {
    render(<SlopeCaptureSimulator />)
    fireEvent.click(screen.getByRole('button', { name: 'RUN 50' }))
    expect(readout('intervals run')).toHaveTextContent(fmtInt(50))

    fireEvent.click(screen.getByRole('radio', { name: '99%' }))
    expect(readout('intervals run')).toHaveTextContent(fmtInt(0))
    expect(readout('nominal level')).toHaveTextContent('99')

    fireEvent.click(screen.getByRole('button', { name: 'RUN 1' }))
    const wide = expectedInterval(0, SLOPE_SIM_N, 0.99)
    expect(readout('latest interval')).toHaveTextContent(`(${fmt((wide.ci as [number, number])[0], 4)}, ${fmt((wide.ci as [number, number])[1], 4)})`)

    fireEvent.click(screen.getByRole('button', { name: 'RESET' }))
    expect(readout('intervals run')).toHaveTextContent(fmtInt(0))
  })

  it('is keyboard operable', () => {
    render(<SlopeCaptureSimulator />)
    expect(screen.getByLabelText('departures per sample (n)')).toHaveAttribute('type', 'range')
    expect(screen.getByRole('radiogroup', { name: /confidence level/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// act-9-03 · SlopeTestVisualiser
// ---------------------------------------------------------------------------------------------

describe('<SlopeTestVisualiser>', () => {
  it('opens on the one-sided test against zero and reports what slopeTest returned', () => {
    render(<SlopeTestVisualiser />)
    expect(screen.getByRole('region', { name: /Slope test visualiser/i })).toBeInTheDocument()
    expect(screen.getByText('SENSOR · SLOPE TEST')).toBeInTheDocument()

    expect(readout('b · slope')).toHaveTextContent(fmt(KETTLE_FIT.slope, 5))
    expect(readout('SE(b)')).toHaveTextContent(fmt(KETTLE_FIT.seSlope, 5))
    expect(readout('df · n − 2')).toHaveTextContent(fmtInt(17))
    expect(readout('t = (b − β₀) / SE(b)')).toHaveTextContent(fmt(KETTLE_TEST_ZERO.statistic, 3))
    expect(readout('P')).toHaveTextContent(fmtP(KETTLE_TEST_ZERO.pValue as number))
    expect(screen.getByRole('img', { name: /Null t distribution on 17 degrees of freedom/i })).toBeInTheDocument()
  })

  it('moves t and P when the null moves, and leaves b and SE(b) where they were', () => {
    render(<SlopeTestVisualiser />)
    fireEvent.click(screen.getByRole('radio', { name: 'the rocket equation' }))
    fireEvent.click(screen.getByRole('radio', { name: 'β ≠ β₀' }))

    expect(readout('b · slope')).toHaveTextContent(fmt(KETTLE_FIT.slope, 5))
    expect(readout('SE(b)')).toHaveTextContent(fmt(KETTLE_FIT.seSlope, 5))
    expect(readout('t = (b − β₀) / SE(b)')).toHaveTextContent(fmt(KETTLE_TEST_PHYSICAL.statistic, 3))
    expect(readout('P')).toHaveTextContent(fmtP(KETTLE_TEST_PHYSICAL.pValue as number))

    // Zero is rejected; the rocket equation is not.
    expect(KETTLE_TEST_ZERO.pValue as number).toBeLessThan(0.001)
    expect(KETTLE_TEST_PHYSICAL.pValue as number).toBeGreaterThan(0.05)
    expect(BETA_PHYSICAL).toBeGreaterThan(0)
  })

  it('shows the same nineteen points as diagnostics behind the second tab', () => {
    render(<SlopeTestVisualiser />)
    expect(screen.queryByText('INTEL · THE NINETEEN, THREE WAYS')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'the nineteen points' }))
    expect(screen.getByText('INTEL · THE NINETEEN, THREE WAYS')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Scatterplot of excess fuel per true tonne against Kettle/i })).toBeInTheDocument()
  })

  it('carries the three nulls side by side in an accessible table', () => {
    render(<SlopeTestVisualiser />)
    const table = screen.getByRole('table', { name: /t and P for the same fitted slope against three null values/i })
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByText(fmt(KETTLE_TEST_ZERO.statistic, 3))).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// act-9-04 · ProcedurePicker
// ---------------------------------------------------------------------------------------------

describe('<ProcedurePicker>', () => {
  it('opens on the first finding and counts a correct placement', () => {
    render(<ProcedurePicker />)
    expect(screen.getByRole('region', { name: /Procedure picker/i })).toBeInTheDocument()
    expect(screen.getByText('INTEL · PROCEDURE PICKER')).toBeInTheDocument()
    expect(screen.getByText(/Finding 1 of 14/)).toBeInTheDocument()
    expect(screen.getByText(CASE_FILE[0].finding)).toBeInTheDocument()
    expect(readout('findings placed')).toHaveTextContent(`0 of ${fmtInt(CASE_FILE.length)}`)

    fireEvent.click(screen.getByRole('button', { name: PROCEDURE_LABEL[CASE_FILE[0].procedure] }))
    expect(readout('this one')).toHaveTextContent('correct')
    expect(readout('findings placed')).toHaveTextContent(`1 of ${fmtInt(CASE_FILE.length)}`)
    expect(screen.getByText(new RegExp(CASE_FILE[0].limit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
  })

  it('marks a wrong choice wrong and names the procedure the file holds', () => {
    render(<ProcedurePicker />)
    fireEvent.click(screen.getByRole('button', { name: PROCEDURE_LABEL['slope-t-test'] }))
    expect(readout('this one')).toHaveTextContent('not this one')
    expect(readout('findings placed')).toHaveTextContent(`0 of ${fmtInt(CASE_FILE.length)}`)
    expect(screen.getByText(/Not Slope t-test/)).toBeInTheDocument()
  })

  it('walks the file forwards and backwards', () => {
    render(<ProcedurePicker />)
    fireEvent.click(screen.getByRole('button', { name: /NEXT FINDING/ }))
    expect(screen.getByText(/Finding 2 of 14/)).toBeInTheDocument()
    expect(screen.getByText(CASE_FILE[1].finding)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /PREVIOUS FINDING/ }))
    expect(screen.getByText(/Finding 1 of 14/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// act-9-04 · EvidenceBoard
// ---------------------------------------------------------------------------------------------

describe('<EvidenceBoard>', () => {
  it('lists the whole case as fourteen real rows', () => {
    render(<EvidenceBoard />)
    expect(screen.getByRole('region', { name: /Evidence board/i })).toBeInTheDocument()
    expect(screen.getByText('INTEL · THE EVIDENCE BOARD')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /a procedure and a limitation for each of the fourteen findings/i })
    expect(within(table).getAllByRole('row')).toHaveLength(CASE_FILE.length + 1)
    for (const f of CASE_FILE) expect(within(table).getByText(f.finding)).toBeInTheDocument()
  })

  it('grades a fully correct board at 14 of 14 and names the two weakest links', () => {
    render(<EvidenceBoard />)
    for (const f of CASE_FILE) {
      fireEvent.change(screen.getByLabelText(`procedure for ${f.finding}`), { target: { value: f.procedure } })
      fireEvent.change(screen.getByLabelText(`limitation for ${f.finding}`), { target: { value: LIMITATION_KEY[f.id] } })
    }
    fireEvent.click(screen.getByRole('button', { name: /GRADE THE BOARD/ }))

    expect(readout('findings placed')).toHaveTextContent(`${fmtInt(CASE_FILE.length)} of ${fmtInt(CASE_FILE.length)}`)
    expect(readout('procedures right')).toHaveTextContent(`${fmtInt(CASE_FILE.length)} of ${fmtInt(CASE_FILE.length)}`)
    expect(readout('limitations right')).toHaveTextContent(`${fmtInt(CASE_FILE.length)} of ${fmtInt(CASE_FILE.length)}`)
    expect(screen.getByText(/All 14 placed with their limits/)).toBeInTheDocument()

    // The beat sheet's two weakest links.
    expect(screen.getByText(/Large Counts check on the two-proportion test passed at 10.7/)).toBeInTheDocument()
    expect(screen.getByText(/the nineteen are the losses, not a random sample/)).toBeInTheDocument()
  })

  it('scores a wrong placement as wrong', () => {
    render(<EvidenceBoard />)
    for (const f of CASE_FILE) {
      fireEvent.change(screen.getByLabelText(`procedure for ${f.finding}`), { target: { value: f.procedure } })
      fireEvent.change(screen.getByLabelText(`limitation for ${f.finding}`), { target: { value: LIMITATION_KEY[f.id] } })
    }
    fireEvent.change(screen.getByLabelText(`procedure for ${CASE_FILE[0].finding}`), { target: { value: 'paired-t' } })
    fireEvent.click(screen.getByRole('button', { name: /GRADE THE BOARD/ }))

    expect(readout('findings placed')).toHaveTextContent(`13 of ${fmtInt(CASE_FILE.length)}`)
    expect(readout('procedures right')).toHaveTextContent(`13 of ${fmtInt(CASE_FILE.length)}`)
  })

  it('accepts the second procedure on the two rows whose key names two', () => {
    render(<EvidenceBoard />)
    for (const f of CASE_FILE) {
      fireEvent.change(screen.getByLabelText(`procedure for ${f.finding}`), { target: { value: f.procedure } })
      fireEvent.change(screen.getByLabelText(`limitation for ${f.finding}`), { target: { value: LIMITATION_KEY[f.id] } })
    }
    fireEvent.change(screen.getByLabelText('procedure for Survey bias; escort trial'), { target: { value: 'randomization-test' } })
    fireEvent.change(screen.getByLabelText('procedure for Loss × beneficiary; cause × corridor'), { target: { value: 'chi-square-homogeneity' } })
    fireEvent.click(screen.getByRole('button', { name: /GRADE THE BOARD/ }))

    expect(readout('findings placed')).toHaveTextContent(`${fmtInt(CASE_FILE.length)} of ${fmtInt(CASE_FILE.length)}`)
  })

  it('clears the board', () => {
    render(<EvidenceBoard />)
    fireEvent.change(screen.getByLabelText(`procedure for ${CASE_FILE[0].finding}`), { target: { value: CASE_FILE[0].procedure } })
    fireEvent.click(screen.getByRole('button', { name: /CLEAR THE BOARD/ }))
    expect((screen.getByLabelText(`procedure for ${CASE_FILE[0].finding}`) as HTMLSelectElement).value).toBe('')
  })
})
