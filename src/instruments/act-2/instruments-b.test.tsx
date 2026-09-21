/**
 * Act II group-B instruments: ResidualExplorer (2-04), InfluenceExplorer (2-05), TransformConsole (2-06).
 * Expected numbers are computed from data.ts, never hard-coded. jsdom has no layout: useChartFrame falls
 * back to 560 px and no canvas path is exercised (all datasets ≤ 412 points).
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { fmt, linearRegression } from '@/lib/stats'
import { CYRENE_ORE_INDEX, NICHOLSON_REGIO_INDEX, manifest, massFit, massFitWithout, residualPct, t9LogLogFit } from './data'
import { ResidualExplorer } from './ResidualExplorer'
import { InfluenceExplorer } from './InfluenceExplorer'
import { TransformConsole } from './TransformConsole'

/** Text of the value cell of the <Readout> whose label is exactly `label`. */
function readout(label: string): string {
  const el = screen.getByText(label, { selector: '.dr-readout__label' })
  return el.parentElement!.querySelector('.dr-readout__value')!.textContent ?? ''
}

describe('<ResidualExplorer> (act-2-04)', () => {
  it('renders two linked panels with tables and one focusable button per hull per panel', () => {
    render(<ResidualExplorer />)
    expect(screen.getByRole('region', { name: /Residual explorer/ })).toBeInTheDocument()
    const imgs = screen.getAllByRole('img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0]).toHaveAttribute('aria-label', expect.stringMatching(/least-squares line/))
    expect(imgs[1]).toHaveAttribute('aria-label', expect.stringMatching(/Residual plot/))
    // 412 hulls × 2 panels, each an accessible button.
    expect(screen.getAllByRole('button', { name: /declared .* t, inferred .* t, residual/ })).toHaveLength(2 * manifest.length)
    // Table fallback carries the residual columns.
    const tables = screen.getAllByRole('table')
    expect(tables.length).toBeGreaterThanOrEqual(2)
    expect(within(tables[0]).getByText('residual (%)')).toBeInTheDocument()
    expect(within(tables[0]).getAllByRole('row')).toHaveLength(manifest.length + 1)
  })

  it('focusing a hull fills the readout; arrow keys walk the declared-mass order', () => {
    render(<ResidualExplorer />)
    const nick = manifest[NICHOLSON_REGIO_INDEX]
    expect(readout('HULL')).toBe('—')
    const [circle] = screen.getAllByRole('button', { name: new RegExp(`^${nick.hull},`) })
    fireEvent.focus(circle)
    expect(readout('HULL')).toBe(nick.hull)
    expect(readout('RESIDUAL')).toContain(fmt(massFit.residuals[NICHOLSON_REGIO_INDEX], 0))
    expect(readout('RESIDUAL %')).toContain(fmt(residualPct(NICHOLSON_REGIO_INDEX), 1))
    expect(readout('PREDICTED')).toContain(Math.round(massFit.predict(nick.declaredMass)).toLocaleString('en-US'))

    // → moves to the next hull by declared mass.
    const order = manifest.map((d) => d.id).sort((a, b) => manifest[a].declaredMass - manifest[b].declaredMass || a - b)
    const next = manifest[order[order.indexOf(NICHOLSON_REGIO_INDEX) + 1]]
    fireEvent.keyDown(circle, { key: 'ArrowRight' })
    expect(readout('HULL')).toBe(next.hull)
  })

  it('colour-by later-lost reveals the count above +5 % and how many of those were later lost', () => {
    render(<ResidualExplorer />)
    expect(screen.queryByText('HULLS ABOVE +5 %')).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'later-lost' }))
    const above = manifest.filter((_, i) => residualPct(i) > 5)
    const lost = above.filter((d) => d.laterLost)
    expect(readout('HULLS ABOVE +5 %')).toBe(String(above.length))
    expect(readout('OF THOSE, LATER-LOST')).toBe(String(lost.length))
    expect(screen.getByText('later-lost hull')).toBeInTheDocument()
  })

  it('switches the residual scale to percent of declared', () => {
    render(<ResidualExplorer />)
    expect(readout('S (TONNES)')).toContain(fmt(massFit.s, 0))
    fireEvent.click(screen.getByRole('radio', { name: '% of declared' }))
    expect(screen.getByText('SD OF RESIDUAL %')).toBeInTheDocument()
    expect(screen.getAllByRole('img')[1]).toHaveAttribute('aria-label', expect.stringMatching(/percent of declared/))
  })
})

describe('<InfluenceExplorer> (act-2-05)', () => {
  it('starts on the full-file fit and prints the computer output', () => {
    render(<InfluenceExplorer />)
    expect(screen.getByRole('region', { name: /Influence explorer/ })).toBeInTheDocument()
    expect(readout('SLOPE')).toBe(fmt(massFit.slope, 4))
    expect(readout('r²')).toBe(fmt(massFit.r2, 3))
    expect(readout('s')).toContain(fmt(massFit.s, 1))
    expect(readout('LEVERAGE · CYRENE ORE')).toBe(fmt(massFit.leverage[CYRENE_ORE_INDEX], 3))
    expect(readout("COOK'S D · CYRENE ORE")).toBe(fmt(massFit.cooks[CYRENE_ORE_INDEX], 3))
    expect(readout('FLAG')).toBe('high leverage · not influential')
    expect(screen.getByRole('button', { name: /^Cyrene Ore: declared 60,000 t/ })).toBeInTheDocument()
    const out = screen.getByText('Declared mass').closest('tr')!
    expect(within(out).getAllByRole('cell')[1]).toHaveTextContent(fmt(massFit.slope, 4))
    expect(within(out).getAllByRole('cell')[2]).toHaveTextContent(fmt(massFit.seSlope, 4))
    expect(screen.getByText(new RegExp(`S = ${fmt(massFit.s, 1)}`))).toBeInTheDocument()
  })

  it('moving Cyrene Ore far off the line makes her influential; RESET restores; WITHOUT shows the other fit', () => {
    render(<InfluenceExplorer />)
    fireEvent.change(screen.getByLabelText('CYRENE ORE · INFERRED MASS'), { target: { value: '75000' } })
    const xs = manifest.map((d) => d.declaredMass)
    const ys = manifest.map((d, i) => (i === CYRENE_ORE_INDEX ? 75000 : d.inferredMass))
    const moved = linearRegression(xs, ys)
    expect(readout('SLOPE')).toBe(fmt(moved.slope, 4))
    expect(readout('SLOPE')).not.toBe(fmt(massFit.slope, 4))
    expect(readout('FLAG')).toBe('high leverage · INFLUENTIAL')

    fireEvent.click(screen.getByRole('button', { name: 'RESET CYRENE ORE' }))
    expect(readout('SLOPE')).toBe(fmt(massFit.slope, 4))
    expect(readout('FLAG')).toBe('high leverage · not influential')

    fireEvent.click(screen.getByRole('radio', { name: 'without' }))
    const without = massFitWithout(CYRENE_ORE_INDEX)
    expect(readout('SLOPE')).toBe(fmt(without.slope, 4))
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getByText(/Fit without Cyrene Ore/)).toBeInTheDocument()
  })
})

describe('<TransformConsole> (act-2-06)', () => {
  it('fits log–log on the transit sample and back-transforms the prediction at 4.0 AU', () => {
    render(<TransformConsole />)
    expect(screen.getByRole('region', { name: /Transformation console/ })).toBeInTheDocument()
    expect(screen.getAllByRole('img')).toHaveLength(2)
    fireEvent.click(screen.getByRole('radio', { name: 'log–log' }))
    expect(readout('r²')).toBe(fmt(t9LogLogFit.r2, 3))
    expect(readout('s (TRANSFORMED SCALE)')).toBe(fmt(t9LogLogFit.fit.s, 4))
    expect(screen.getByLabelText('PREDICT AT x =')).toHaveValue('4')
    expect(readout('PREDICTED TIME TO MARK 9')).toContain(fmt(t9LogLogFit.predict(4), 1))
    expect(readout('MODEL')).toContain(fmt(t9LogLogFit.fit.slope, 4))
    expect(screen.getAllByRole('img')[0]).toHaveAttribute('aria-label', expect.stringMatching(/transformed/))
    expect(screen.getByText('MEAN RESIDUAL (DAYS) · LATER-LOST')).toBeInTheDocument()
    // Table fallback with hull, original and transformed columns.
    const tables = screen.getAllByRole('table')
    const full = tables[tables.length - 1]
    expect(within(full).getByText('log₁₀(Lane length)')).toBeInTheDocument()
    expect(within(full).getAllByRole('row').length).toBeGreaterThan(300)
  })

  it('switches dataset to the fuel columns and hides the days readout', () => {
    render(<TransformConsole dataset="fuel-required" />)
    expect(screen.queryByText('MEAN RESIDUAL (DAYS) · LATER-LOST')).toBeNull()
    expect(screen.getByLabelText('PREDICT AT x =')).toHaveValue('20000')
    const raw = linearRegression(
      manifest.map((d) => d.requiredFuel),
      manifest.map((d) => d.fuelLoaded),
    )
    expect(readout('r²')).toBe(fmt(raw.r2, 3))
    fireEvent.click(screen.getByRole('radio', { name: 'transit' }))
    expect(screen.getByText('MEAN RESIDUAL (DAYS) · LATER-LOST')).toBeInTheDocument()
    expect(screen.getByLabelText('PREDICT AT x =')).toHaveValue('4')
    fireEvent.click(screen.getByLabelText('COLOUR LATER-LOST'))
    expect(screen.getByLabelText('COLOUR LATER-LOST')).toBeChecked()
  })
})
