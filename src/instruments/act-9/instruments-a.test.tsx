/**
 * act-9-01 instruments: SlopeSpreadSimulator, ResidualDiagnostics and RegressionOutputPanel.
 * Every assertion makes the same point — the panel is showing what `@/lib/stats` and
 * `@/instruments/act-9/data` say, and not a second implementation of it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { SlopeSpreadSimulator } from './SlopeSpreadSimulator'
import { ResidualDiagnostics } from './ResidualDiagnostics'
import { RegressionOutputPanel } from './RegressionOutputPanel'
import { columnDigits } from './_ui'
import { fmt, fmtInt, fmtP, slopeIntervalFromOutput } from '@/lib/stats'
import {
  HONEST_SLOPE_MEAN,
  HONEST_SLOPE_SD,
  NINETEEN_FUEL_FIT,
  NINETEEN_FUEL_INTERVAL,
  NINETEEN_FUEL_OUTPUT,
  NINETEEN_FUEL_SD_RATIO,
  NINETEEN_FUEL_VS_ONE,
  NINETEEN_SE_B,
  SLOPE_SIM_N,
  THEORETICAL_SLOPE_SD,
  nineteen,
} from './data'

/** The value cell next to a readout's label. */
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
// act-9-01 · SlopeSpreadSimulator
// ---------------------------------------------------------------------------------------------

describe('<SlopeSpreadSimulator>', () => {
  it('opens on the registry s canonical run and reports its mean and SD to the last digit', () => {
    render(<SlopeSpreadSimulator />)
    expect(screen.getByRole('region', { name: /slope spread simulator/i })).toBeInTheDocument()
    expect(screen.getByText('TACTICAL · THE SLOPE HAS A SPREAD')).toBeInTheDocument()

    // The one a mission beat depends on: the SD of b for honest samples of nineteen, to 3 dp.
    expect(readout('SD of b · the simulated spread')).toHaveTextContent(fmt(HONEST_SLOPE_SD, 3))
    expect(readout('mean of b')).toHaveTextContent(fmt(HONEST_SLOPE_MEAN, 4))
    expect(readout('σ / (σₓ√n) · the textbook value')).toHaveTextContent(fmt(THEORETICAL_SLOPE_SD, 3))
    expect(readout('SE(b) printed for the nineteen')).toHaveTextContent(fmt(NINETEEN_SE_B, 4))
    expect(readout('how many honest spreads that is')).toHaveTextContent(fmt(NINETEEN_SE_B / HONEST_SLOPE_SD, 2))
  })

  it('names both charts for a screen reader', () => {
    render(<SlopeSpreadSimulator />)
    expect(screen.getByRole('img', { name: /Histogram of .* least-squares slopes fitted to samples of 19/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Scatterplot of fuel loaded against required fuel for one sample of 19/i })).toBeInTheDocument()
  })

  it('narrows the stack when the sample size is raised and a new run is drawn', () => {
    render(<SlopeSpreadSimulator />)
    const before = readout('SD of b · the simulated spread').textContent

    fireEvent.change(screen.getByLabelText('sample size n'), { target: { value: '60' } })
    // The sliders have moved but the canonical run is still on the panel.
    expect(readout('SD of b · the simulated spread')).toHaveTextContent(fmt(HONEST_SLOPE_SD, 3))

    fireEvent.click(screen.getByRole('button', { name: /DRAW 2,000/ }))
    const after = readout('SD of b · the simulated spread').textContent
    expect(after).not.toEqual(before)
    expect(Number(after)).toBeLessThan(HONEST_SLOPE_SD)
    expect(readout('samples fitted')).toHaveTextContent(fmtInt(2000))
  })

  it('puts the standard run back', () => {
    render(<SlopeSpreadSimulator />)
    fireEvent.change(screen.getByLabelText('sample size n'), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /DRAW 2,000/ }))
    fireEvent.click(screen.getByRole('button', { name: /RESTORE THE STANDARD RUN/ }))

    expect(readout('SD of b · the simulated spread')).toHaveTextContent(fmt(HONEST_SLOPE_SD, 3))
    expect(readout('mean of b')).toHaveTextContent(fmt(HONEST_SLOPE_MEAN, 4))
    expect((screen.getByLabelText('sample size n') as HTMLInputElement).value).toBe(String(SLOPE_SIM_N))
  })

  it('is keyboard operable', () => {
    render(<SlopeSpreadSimulator />)
    expect(screen.getByLabelText('sample size n')).toHaveAttribute('type', 'range')
    expect(screen.getByLabelText('extra measurement noise σ')).toHaveAttribute('type', 'range')
  })
})

// ---------------------------------------------------------------------------------------------
// act-9-01 · ResidualDiagnostics
// ---------------------------------------------------------------------------------------------

const hullNames = nineteen.map((c) => c.hull)

function renderDiagnostics(initialView?: 'scatter' | 'residual' | 'normal') {
  return render(
    <ResidualDiagnostics
      fit={NINETEEN_FUEL_FIT}
      xLabel="required fuel (t)"
      yLabel="fuel loaded (t)"
      pointLabels={hullNames}
      initialView={initialView}
    />,
  )
}

describe('<ResidualDiagnostics>', () => {
  it('opens on the fit with the panel label and the chart named', () => {
    renderDiagnostics()
    expect(screen.getByRole('region', { name: /Residual diagnostics/i })).toBeInTheDocument()
    expect(screen.getByText('INTEL · RESIDUAL DIAGNOSTICS')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Scatterplot of fuel loaded \(t\) against required fuel \(t\)/i })).toBeInTheDocument()
  })

  it('switches between the three views of the same nineteen points', () => {
    renderDiagnostics()
    fireEvent.click(screen.getByRole('radio', { name: 'residual plot' }))
    expect(screen.getByRole('img', { name: /Residual plot/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'normal probability plot' }))
    expect(screen.getByRole('img', { name: /Normal probability plot/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'the fit' }))
    expect(screen.getByRole('img', { name: /Scatterplot of fuel loaded/i })).toBeInTheDocument()
  })

  it('opens on the view it is told to', () => {
    renderDiagnostics('residual')
    expect(screen.getByRole('img', { name: /Residual plot/i })).toBeInTheDocument()
  })

  it('judges the conditions on the residuals, with the numbers that decide them', () => {
    renderDiagnostics()
    expect(screen.getByText(/Residual SD in the upper half/)).toHaveTextContent(fmt(NINETEEN_FUEL_SD_RATIO, 2))
    expect(screen.getByText(/^r² = /)).toHaveTextContent(fmt(NINETEEN_FUEL_FIT.r2, 3))
    expect(screen.getByText(/beyond the 1.5 × IQR fences/)).toBeInTheDocument()
    expect(screen.getByText(/Normal residuals/)).toBeInTheDocument()
    // Scoped to the condition label: the panel also names Equal SD in the prose below the list.
    expect(screen.getByText('Equal SD', { selector: 'strong' })).toBeInTheDocument()
  })

  it('follows one hull across the views', () => {
    renderDiagnostics()
    expect(readout('point')).toHaveTextContent('—')

    const hull = hullNames[0]
    fireEvent.click(screen.getAllByRole('button', { name: hull })[0])
    expect(readout('point')).toHaveTextContent(hull)
    expect(readout('residual')).toHaveTextContent(fmt(NINETEEN_FUEL_FIT.residuals[0], 4))
    expect(readout('fitted')).toHaveTextContent(fmt(NINETEEN_FUEL_FIT.fitted[0], 4))

    // The selection survives a change of view: the same point, three ways.
    fireEvent.click(screen.getByRole('radio', { name: 'normal probability plot' }))
    expect(readout('point')).toHaveTextContent(hull)
  })
})

// ---------------------------------------------------------------------------------------------
// act-9-01 / 02 / 03 · RegressionOutputPanel
// ---------------------------------------------------------------------------------------------

const B = NINETEEN_FUEL_OUTPUT.rows[1].coef
const SE_B = NINETEEN_FUEL_OUTPUT.rows[1].se
const DIGITS = columnDigits([B, SE_B])

describe('<RegressionOutputPanel>', () => {
  it('prints the output block as a real table', () => {
    render(<RegressionOutputPanel table={NINETEEN_FUEL_OUTPUT} />)
    expect(screen.getByText('ENGINEERING · REGRESSION OUTPUT')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: /Regression of fuel loaded \(t\) on required fuel \(t\)/i })
    // Two predictor rows, one header row, one summary row.
    expect(within(table).getAllByRole('row')).toHaveLength(4)
    expect(within(table).getByText(fmt(B, columnDigits(NINETEEN_FUEL_OUTPUT.rows.map((r) => r.coef))))).toBeInTheDocument()
    expect(within(table).getByText(fmt(SE_B, columnDigits(NINETEEN_FUEL_OUTPUT.rows.map((r) => r.se))))).toBeInTheDocument()
    expect(within(table).getByText(/df = n − 2 = 17/)).toBeInTheDocument()
  })

  it('mode="read": naming a number changes what the panel says it is', () => {
    render(<RegressionOutputPanel table={NINETEEN_FUEL_OUTPUT} mode="read" />)
    expect(screen.getByRole('radiogroup', { name: /WHICH NUMBER IS/i })).toBeInTheDocument()
    expect(screen.getByText(/SE\(b\) is the SE Coef entry/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 's' }))
    expect(screen.getByText(/is the residual standard deviation/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'df' }))
    expect(screen.getByText(/Not n − 1/)).toBeInTheDocument()
    expect(readout('df · n − 2')).toHaveTextContent(fmtInt(NINETEEN_FUEL_OUTPUT.df))
  })

  it('mode="interval": builds the nineteen s 95% interval and moves it with the level', () => {
    render(<RegressionOutputPanel table={NINETEEN_FUEL_OUTPUT} mode="interval" claimAt={1} claimLabel="the requirement" />)
    const [lo, hi] = NINETEEN_FUEL_INTERVAL.ci as [number, number]
    expect(readout('lower endpoint')).toHaveTextContent(fmt(lo, DIGITS))
    expect(readout('upper endpoint')).toHaveTextContent(fmt(hi, DIGITS))
    expect(readout('df · n − 2')).toHaveTextContent(fmtInt(17))
    // The interval excludes one tonne per tonne, and the panel says so.
    expect(lo).toBeGreaterThan(1)
    expect(screen.getByText(/rules the requirement out as the true slope/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '99%' }))
    const wider = slopeIntervalFromOutput({ b: B, seB: SE_B, n: NINETEEN_FUEL_OUTPUT.n, confidence: 0.99 })
    expect(readout('lower endpoint')).toHaveTextContent(fmt((wider.ci as [number, number])[0], DIGITS))
    expect((wider.ci as [number, number])[0]).toBeLessThan(lo)
  })

  it('mode="test": recomputes t against a non-zero null and calls the printed P what it is', () => {
    render(
      <RegressionOutputPanel
        table={NINETEEN_FUEL_OUTPUT}
        mode="test"
        nullValues={[
          { label: 'β = 0', value: 0 },
          { label: 'β = 1 · the requirement', value: 1 },
        ]}
      />,
    )
    expect(readout(/^t = /)).toHaveTextContent(fmt(NINETEEN_FUEL_OUTPUT.rows[1].t, 3))

    fireEvent.click(screen.getByRole('radio', { name: 'β = 1 · the requirement' }))
    expect(readout(/^t = /)).toHaveTextContent(fmt(NINETEEN_FUEL_VS_ONE.statistic, 3))
    expect(readout(/^P · H₀/)).toHaveTextContent(fmtP(NINETEEN_FUEL_VS_ONE.pValue as number))
    expect(readout('T printed on the table')).toHaveTextContent(fmt(NINETEEN_FUEL_OUTPUT.rows[1].t, 2))
    expect(screen.getByText(/the printed t is not the statistic/)).toBeInTheDocument()

    // Back to zero, two-sided: now the printed block is the answer.
    fireEvent.click(screen.getByRole('radio', { name: 'β = 0' }))
    fireEvent.click(screen.getByRole('radio', { name: 'β ≠ β₀' }))
    expect(readout(/^P · H₀/)).toHaveTextContent(fmtP(NINETEEN_FUEL_OUTPUT.rows[1].p))
    expect(screen.getByText(/the one the software ran/)).toBeInTheDocument()
  })
})
