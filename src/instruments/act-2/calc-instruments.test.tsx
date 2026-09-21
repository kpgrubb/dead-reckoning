/**
 * The two calc-briefing instruments (content/calc/minimizing-squared-error.mdx and
 * logs-and-linearization.mdx). Expected numbers are computed from @/lib/stats and data.ts.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { fmt, linearRegression, sseForLine } from '@/lib/stats'
import { honestManifest, scheduledT9 } from './data'
import { SseParabola } from './SseParabola'
import { LogLinearizer } from './LogLinearizer'

function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

const SAMPLE = honestManifest.filter((_, i) => i % 33 === 0).slice(0, 12)
const XS = SAMPLE.map((d) => d.declaredMass / 1000)
const YS = SAMPLE.map((d) => d.inferredMass / 1000)
const FIT = linearRegression(XS, YS)

describe('<SseParabola> (minimizing-squared-error)', () => {
  it('draws SSE against the slope and reads the derivative; the tangent goes flat at Sxy/Sxx', () => {
    render(<SseParabola />)
    expect(screen.getByRole('img', { name: /parabola with its minimum at the least-squares slope/ })).toBeInTheDocument()
    expect(readout('Sxy / Sxx')).toBe(fmt(FIT.sxy / FIT.sxx, 3))
    expect(readout('min SSE')).toContain(fmt(FIT.sse, 3))
    // Opens away from the minimum, so the derivative is not yet zero.
    expect(Number(readout('dSSE/db').replace('−', '-'))).not.toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'SET dSSE/db = 0' }))
    const b = Math.round(FIT.slope * 1000) / 1000
    const expectedSse = sseForLine(XS, YS, b, FIT.yMean - b * FIT.xMean)
    expect(readout('SSE(b)')).toContain(fmt(expectedSse, 3))
    // At the least-squares slope the tangent is flat to within the slider's rounding.
    expect(Math.abs(Number(readout('dSSE/db').replace('−', '-')))).toBeLessThan(0.05)
  })

  it('exposes the curve as a data table', () => {
    render(<SseParabola />)
    const table = screen.getByRole('table')
    expect(table).toHaveTextContent('SSE as a function of the slope')
    expect(table).toHaveTextContent('slope b')
  })
})

describe('<LogLinearizer> (logs-and-linearization)', () => {
  it('fits the Lane geometry: the log–log slope of t9 on Lane length is one half', () => {
    render(<LogLinearizer />)
    expect(screen.getByRole('img', { name: /power-law curve of exponent/ })).toBeInTheDocument()
    const laneFit = linearRegression([2.4, 3.0, 3.33, 4.0, 5.0, 6.0, 7.0, 8.0].map(Math.log10), [2.4, 3.0, 3.33, 4.0, 5.0, 6.0, 7.0, 8.0].map((d) => Math.log10(scheduledT9(d))))
    expect(readout('true exponent (log–log slope)')).toBe(fmt(laneFit.slope, 3))
    expect(Number(readout('true exponent (log–log slope)'))).toBeCloseTo(0.5, 6)
  })

  it('switches to log–log axes and to the tangent view, where the slope reads 1/x', () => {
    render(<LogLinearizer />)
    fireEvent.click(screen.getByRole('radio', { name: 'log–log' }))
    expect(screen.getByRole('img', { name: /on log–log axes/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'why log compresses' }))
    expect(screen.getByRole('img', { name: /tangent line whose slope is one over x/ })).toBeInTheDocument()
    expect(readout('x')).toBe(fmt(2, 1))
    expect(readout('slope 1/x')).toBe(fmt(0.5, 3))
    expect(readout('ln x')).toBe(fmt(Math.log(2), 3))
    // Every doubling is the same distance along a log axis.
    expect(readout('ln 2x − ln x')).toBe(fmt(Math.log(2), 3))

    fireEvent.change(screen.getByLabelText('tangent at x'), { target: { value: '4' } })
    expect(readout('slope 1/x')).toBe(fmt(0.25, 3))
    expect(readout('ln x')).toBe(fmt(Math.log(4), 3))
  })
})
