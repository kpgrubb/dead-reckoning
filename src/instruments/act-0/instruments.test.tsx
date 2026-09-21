/**
 * Prologue instruments render standalone (useModule() supplies a default when no provider is mounted),
 * expose their contract hooks, and project endurance correctly.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NavFixDisplay } from './NavFixDisplay'
import { HeatSinkGauge, projectRun } from './HeatSinkGauge'
import { RegisterBrowser } from './RegisterBrowser'
import { loggedFixRun, register } from './data'

function readoutValue(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  const value = el.parentElement?.querySelector('.dr-readout__value')
  return value?.textContent ?? ''
}

describe('<NavFixDisplay>', () => {
  it('renders the six logged fixes in a visible table and no summary of them', () => {
    const { container } = render(<NavFixDisplay />)
    const rows = container.querySelectorAll('.dr-navfix__logged table tbody tr')
    expect(rows).toHaveLength(6)
    const values = [...rows].map((r) => r.querySelector('td:nth-child(2)')?.textContent ?? '')
    expect(values.map((v) => Number(v.replace('−', '-')))).toEqual(loggedFixRun.fixes)
    expect(readoutValue('MEAN')).toBe('—km')
  })

  it('shows a MEAN readout after RUN', () => {
    render(<NavFixDisplay />)
    expect(screen.getByText('No runs yet. Re-run the procedure.', { selector: '.dr-muted' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'RE-RUN SIX FIXES' }))
    expect(screen.queryByText('No runs yet. Re-run the procedure.', { selector: '.dr-muted' })).toBeNull()
    expect(readoutValue('MEAN')).toMatch(/^−?\d+\.\d\s*km$/)
    expect(readoutValue('RUNS')).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: 'RUN ×25' }))
    expect(readoutValue('RUNS')).toBe('26')
  })
})

describe('<HeatSinkGauge>', () => {
  it('renders and runs cold without throwing', () => {
    render(<HeatSinkGauge />)
    expect(screen.getByRole('img', { name: /Sink capacity used versus hours cold/ })).toBeTruthy()
    expect(readoutValue('PROJECTED ENDURANCE')).toBe('—h')
    fireEvent.click(screen.getByRole('button', { name: 'RUN COLD' }))
    expect(readoutValue('PROJECTED ENDURANCE')).toMatch(/^\d+\.\d ± \d+\.\d\s*h$/)
    expect(readoutValue('THIS RUN LOAD')).toMatch(/^\d+\s*kW$/)
    fireEvent.click(screen.getByRole('button', { name: 'RUN ×10' }))
    expect(screen.getByText('RUN TO RUN')).toBeTruthy()
    expect(readoutValue('RUNS')).toBe('11')
  })

  it('clears the run history when the cold profile changes', () => {
    render(<HeatSinkGauge />)
    fireEvent.click(screen.getByRole('button', { name: 'RUN COLD' }))
    fireEvent.click(screen.getByRole('button', { name: 'RUN ×10' }))
    expect(readoutValue('RUNS')).toBe('11')
    fireEvent.click(screen.getByRole('radio', { name: /^Watch/ }))
    // A different profile is different physics: the Quiet runs must not pollute the run-to-run spread.
    expect(screen.queryByText('RUN TO RUN')).toBeNull()
    expect(readoutValue('PROJECTED ENDURANCE')).toBe('—h')
    expect(readoutValue('DESIGN ENDURANCE')).toBe('67.7h')
  })

  it('projectRun projects endurance from a straight-line run', () => {
    const samples = Array.from({ length: 41 }, (_, h) => ({ h, pct: 4 + 2 * h }))
    const p = projectRun(samples, 40, 4)
    expect(p.endPct).toBe(84)
    expect(p.drainPerH).toBeCloseTo(2, 12)
    expect(p.projectedEnduranceH).toBeCloseTo(50, 12)
    expect(p.saturatedAtH).toBeNull()
  })

  it('projectRun reports the hour the sink saturates', () => {
    const samples = Array.from({ length: 11 }, (_, h) => ({ h, pct: Math.min(100, 4 + 12 * h) }))
    const p = projectRun(samples, 10, 4)
    expect(p.saturatedAtH).toBe(8)
    expect(p.endPct).toBe(100)
  })
})

describe('<RegisterBrowser>', () => {
  it('shows all 2200 records, then fewer after filtering to losses', () => {
    render(<RegisterBrowser />)
    expect(screen.getByText('2200 OF 2200 RECORDS')).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'loss' }))
    const status = screen.getByText(/^\d+ OF 2200 RECORDS$/)
    const count = Number(status.textContent!.split(' ')[0])
    expect(count).toBeLessThan(register.length)
    expect(count).toBe(register.filter((r) => r.severity === 'loss').length)
    expect(screen.getByText(`Frequency table · N = ${count} records in view`)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'RESET FILTERS' }))
    expect(screen.getByText('2200 OF 2200 RECORDS')).toBeTruthy()
  })

  it('sorts and pages the record table', () => {
    const { container } = render(<RegisterBrowser pageSize={10} />)
    expect(screen.getByText('rows 1–10 of 2200')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    expect(screen.getByText('rows 11–20 of 2200')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Sort by Mark/ }))
    expect(container.querySelector('th[aria-sort="ascending"]')?.textContent).toContain('Mark')
    expect(screen.getByText('rows 1–10 of 2200')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Sort by Mark/ }))
    expect(container.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Mark')
  })
})
