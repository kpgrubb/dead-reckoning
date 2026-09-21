import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ComparativeDisplay } from './ComparativeDisplay'
import { allMarks, arrivedValues, lossMarks, lostValues } from './data'
import { fmt, median } from '@/lib/stats'

function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

describe('<ComparativeDisplay>', () => {
  it('draws parallel boxplots of the losses against the Register and reports both medians', () => {
    render(<ComparativeDisplay />)
    expect(screen.getByRole('img', { name: /Parallel boxplots of Lane mark/ })).toBeInTheDocument()
    expect(readout('median · the 31 losses')).toContain(fmt(median(lossMarks), 2))
    expect(readout(`median · all ${allMarks.length.toLocaleString('en-US')} records`)).toContain(fmt(median(allMarks), 2))
    expect(screen.getByText(/not the arrived transits/)).toBeInTheDocument()
  })

  it('switches display to a back-to-back stemplot on a seeded subsample', () => {
    render(<ComparativeDisplay />)
    fireEvent.click(screen.getByRole('radio', { name: 'back-to-back stemplot' }))
    expect(screen.getByText(/fixed random subsample of 60/)).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /back to back on a shared stem/ })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Parallel boxplots/ })).toBeNull()
  })

  it('compares declared cargo value against the arrived transits with histograms', () => {
    render(<ComparativeDisplay variable="value" display="histograms" />)
    expect(readout('median · the 31 lost hulls')).toContain(fmt(median(lostValues), 1))
    expect(readout(`median · ${arrivedValues.length.toLocaleString('en-US')} arrived transits`)).toContain(fmt(median(arrivedValues), 1))
    expect(screen.getAllByRole('img', { name: /Histogram of declared cargo value/ })).toHaveLength(2)
  })
})
