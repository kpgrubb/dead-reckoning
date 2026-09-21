import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { OutlierExplorer } from './OutlierExplorer'
import { honestRatios, ratioPct, timeToSilence } from './data'
import { fmt, iqr, mean, median, sd } from '@/lib/stats'

function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

describe('<OutlierExplorer>', () => {
  it('renders the dotplot and the resistant / non-resistant summaries from @/lib/stats', () => {
    render(<OutlierExplorer />)
    expect(screen.getByRole('img', { name: /Dotplot of plume ratio/ })).toBeInTheDocument()
    expect(readout('mean')).toContain(fmt(mean(ratioPct), 2))
    expect(readout('median')).toContain(fmt(median(ratioPct), 2))
    expect(readout('IQR')).toContain(fmt(iqr(ratioPct), 2))
    expect(readout('SD')).toContain(fmt(sd(ratioPct), 2))
  })

  it('sets the flagged contact aside and the mean moves while the median holds', () => {
    render(<OutlierExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'set aside' }))
    expect(readout('mean')).toContain(fmt(mean(honestRatios), 2))
    expect(readout('median')).toContain(fmt(median(honestRatios), 2))
    expect(readout('n in the summary')).toContain(String(honestRatios.length))
  })

  it('opens on the dataset it is given', () => {
    render(<OutlierExplorer dataset="silence" />)
    expect(screen.getByRole('img', { name: /Dotplot of time to silence/ })).toBeInTheDocument()
    expect(readout('mean')).toContain(fmt(mean(timeToSilence), 2))
  })
})
