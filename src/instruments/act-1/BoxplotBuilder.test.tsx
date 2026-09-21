import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BoxplotBuilder } from './BoxplotBuilder'
import { ratioPct, timeToSilence } from './data'
import { fiveNumber, fmt, outliers } from '@/lib/stats'

function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

describe('<BoxplotBuilder>', () => {
  it('renders the dotplot above the box and reports the five numbers and fences', () => {
    render(<BoxplotBuilder />)
    const five = fiveNumber(ratioPct)
    const fence = outliers(ratioPct)
    expect(screen.getByRole('img', { name: /Dotplot of plume ratio/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Boxplot of plume ratio/ })).toBeInTheDocument()
    expect(readout('Q1')).toContain(fmt(five.q1, 2))
    expect(readout('median')).toContain(fmt(five.median, 2))
    expect(readout('Q3')).toContain(fmt(five.q3, 2))
    expect(readout('IQR')).toContain(fmt(five.q3 - five.q1, 2))
    expect(readout('upper fence · Q3 + 1.5·IQR')).toContain(fmt(fence.highFence, 2))
    expect(readout('beyond a fence')).toContain(String(fence.values.length))
  })

  it('hides the dots and leaves the box behind', () => {
    render(<BoxplotBuilder />)
    fireEvent.click(screen.getByRole('radio', { name: 'box only' }))
    expect(screen.queryByRole('img', { name: /Dotplot of plume ratio/ })).toBeNull()
    expect(screen.getByRole('img', { name: /Boxplot of plume ratio/ })).toBeInTheDocument()
  })

  it('opens on the dataset it is given, where nothing is beyond a fence', () => {
    render(<BoxplotBuilder dataset="silence" />)
    expect(readout('beyond a fence')).toContain(String(outliers(timeToSilence).values.length))
    expect(readout('median')).toContain(fmt(fiveNumber(timeToSilence).median, 2))
  })
})
