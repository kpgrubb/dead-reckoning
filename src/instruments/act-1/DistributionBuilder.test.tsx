import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DistributionBuilder } from './DistributionBuilder'
import { plumeTW, ratioPct } from './data'
import { fmt, max, mean, median, min } from '@/lib/stats'

function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

describe('<DistributionBuilder>', () => {
  it('renders the dotplot with an accessible name and the sixty contacts summarised from @/lib/stats', () => {
    render(<DistributionBuilder />)
    expect(screen.getByRole('img', { name: /Dotplot of plume ratio/ })).toBeInTheDocument()
    expect(readout('n')).toContain(String(ratioPct.length))
    expect(readout('mean')).toContain(fmt(mean(ratioPct), 1))
    expect(readout('median')).toContain(fmt(median(ratioPct), 1))
    expect(readout('min')).toContain(fmt(min(ratioPct), 1))
    expect(readout('max')).toContain(fmt(max(ratioPct), 1))
  })

  it('switches display and variable from the segmented controls', () => {
    render(<DistributionBuilder />)
    fireEvent.click(screen.getByRole('radio', { name: 'histogram' }))
    expect(screen.getByRole('img', { name: /Histogram of plume ratio/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'plume power · TW' }))
    expect(screen.getByRole('img', { name: /Histogram of plume power/ })).toBeInTheDocument()
    expect(readout('mean')).toContain(fmt(mean(plumeTW), 3))
  })

  it('opens on the variable it is given and offers the stemplot', () => {
    render(<DistributionBuilder variable="plume_TW" />)
    expect(readout('mean')).toContain(fmt(mean(plumeTW), 3))
    fireEvent.click(screen.getByRole('radio', { name: 'stemplot' }))
    expect(screen.getAllByRole('table', { name: /all sixty contacts/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/leaf unit/).length).toBeGreaterThan(0)
  })
})
