import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RiemannArea } from './RiemannArea'
import { fleetModel, harpagia } from './data'
import { fmt, normal } from '@/lib/stats'

function readout(label: string): string {
  const el = screen.getAllByText(label, { selector: '.dr-readout__label' })[0]
  return el.parentElement?.querySelector('.dr-readout__value')?.textContent ?? ''
}

const EXACT = normal.between(fleetModel.mean, harpagia.ratio_pct, fleetModel.mean, fleetModel.sd)

describe('<RiemannArea>', () => {
  it('renders the rectangles and reports the midpoint sum against normal.between', () => {
    render(<RiemannArea />)
    expect(screen.getByRole('img', { name: /Normal density with the interval/ })).toBeInTheDocument()
    expect(readout('exact area · normal.between')).toContain(fmt(EXACT, 6))
    // Eight midpoint rectangles across the same interval.
    const width = (harpagia.ratio_pct - fleetModel.mean) / 8
    const sum = Array.from({ length: 8 }, (_, i) => normal.pdf(fleetModel.mean + (i + 0.5) * width, fleetModel.mean, fleetModel.sd) * width).reduce((s, x) => s + x, 0)
    expect(readout('Riemann sum · Σ f(mid)·Δx')).toContain(fmt(sum, 6))
    expect(readout('one rectangle · Δx')).toContain(fmt(width, 5))
  })

  it('collapsing the interval to a point takes the area to zero', () => {
    render(<RiemannArea />)
    fireEvent.click(screen.getByRole('button', { name: 'COLLAPSE TO A POINT' }))
    expect(readout('exact area · normal.between')).toContain(fmt(0, 6))
    expect(readout('Riemann sum · Σ f(mid)·Δx')).toContain(fmt(0, 6))
    expect(readout('one rectangle · Δx')).toContain(fmt(0, 5))
    expect(screen.getByText(/no probability to a point/)).toBeInTheDocument()
  })

  it('never draws more than 200 rectangles', () => {
    render(<RiemannArea />)
    const slider = screen.getByLabelText('rectangles') as HTMLInputElement
    expect(slider.max).toBe('200')
    fireEvent.change(slider, { target: { value: '200' } })
    expect(readout('one rectangle · Δx')).toContain(fmt((harpagia.ratio_pct - fleetModel.mean) / 200, 5))
  })
})
