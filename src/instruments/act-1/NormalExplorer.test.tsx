import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NormalExplorer } from './NormalExplorer'
import { fleetModel, harpagia } from './data'
import { fmt, linearTransformSummary, normal, zScore } from '@/lib/stats'

function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

describe('<NormalExplorer>', () => {
  it('opens on the upper tail of the fleet model at the logged signature', () => {
    render(<NormalExplorer />)
    expect(screen.getByRole('img', { name: /Normal density with mean/ })).toBeInTheDocument()
    expect(readout('area above')).toContain(fmt(normal.sf(harpagia.ratio_pct, fleetModel.mean, fleetModel.sd), 4))
    expect(readout('z (lower)')).toContain(fmt(zScore(harpagia.ratio_pct, fleetModel.mean, fleetModel.sd), 3))
    expect(readout('z (upper)')).toContain('—')
  })

  it('exposes two draggable cutoffs in between mode and the lower tail in below mode', () => {
    render(<NormalExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'below' }))
    expect(readout('area below')).toContain(fmt(normal.cdf(harpagia.ratio_pct, fleetModel.mean, fleetModel.sd), 4))

    fireEvent.click(screen.getByRole('radio', { name: 'between' }))
    const handles = screen.getAllByRole('slider')
    expect(handles).toHaveLength(2)
    expect(readout('area between')).toContain(fmt(normal.between(fleetModel.mean - fleetModel.sd, fleetModel.mean + fleetModel.sd, fleetModel.mean, fleetModel.sd), 4))
    expect(readout('z (lower)')).toContain(fmt(-1, 3))
    expect(readout('z (upper)')).toContain(fmt(1, 3))
  })

  it('inverts the model: a target proportion returns the cutoff', () => {
    render(<NormalExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'inverse' }))
    expect(readout('z (lower)')).toContain(fmt(zScore(normal.isf(0.05, fleetModel.mean, fleetModel.sd), fleetModel.mean, fleetModel.sd), 3))
    expect(readout('area above')).toContain(fmt(normal.sf(normal.isf(0.05, fleetModel.mean, fleetModel.sd), fleetModel.mean, fleetModel.sd), 4))
  })

  it('re-expresses the axis in tonnes with linearTransformSummary and leaves z alone', () => {
    render(<NormalExplorer />)
    const z = fmt(zScore(harpagia.ratio_pct, fleetModel.mean, fleetModel.sd), 3)
    expect(readout('z of the signature')).toContain(z)
    fireEvent.click(screen.getByRole('radio', { name: 'tonnes' }))
    const t = linearTransformSummary({ mean: fleetModel.mean, sd: fleetModel.sd }, 19400 / 100, -19400)
    expect(readout('model mean')).toContain(fmt(t.mean ?? 0, 0))
    expect(readout('model SD')).toContain(fmt(t.sd ?? 0, 0))
    expect(readout('z of the signature')).toContain(z)
  })
})
