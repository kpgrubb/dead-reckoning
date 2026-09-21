import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { TwoWayExplorer } from './TwoWayExplorer'
import { MassScatter } from './MassScatter'
import { LeastSquaresVisual, lsSample } from './LeastSquaresVisual'
import { DecisionAside } from './DecisionAside'
import { useProgress } from '@/store/progress'
import { correlation, linearRegression, fmt, fmtPct } from '@/lib/stats'
import { manifest, lossTwoWay } from './data'

beforeEach(() => {
  useProgress.getState().resetAll()
})

describe('<TwoWayExplorer>', () => {
  it('renders the cross-tab with counts, flips to row % and column %, and reads a cell', () => {
    render(<TwoWayExplorer />)
    const table = screen.getByRole('table', { name: /Loss subtable, owner class by classification/ })
    const perrineUnknown = () => within(table).getByRole('button', { name: /^Perrine, unknown:/ })
    expect(perrineUnknown()).toHaveTextContent('19')

    fireEvent.click(screen.getByRole('radio', { name: 'row %' }))
    expect(perrineUnknown()).toHaveTextContent(fmtPct(lossTwoWay.rowConditional[0][2], 1))
    expect(perrineUnknown()).toHaveTextContent('100.0%')

    fireEvent.click(screen.getByRole('radio', { name: 'column %' }))
    expect(perrineUnknown()).toHaveTextContent(fmtPct(lossTwoWay.colConditional[2][0], 1))
    expect(perrineUnknown()).toHaveTextContent('86.4%')

    // Focusing a cell prints both conditionals, written P(col | row) and P(row | col).
    fireEvent.focus(perrineUnknown())
    expect(screen.getByText('P(unknown | Perrine)')).toBeInTheDocument()
    expect(screen.getByText('P(Perrine | unknown)')).toBeInTheDocument()
    expect(screen.getByText('marginal P(Perrine)')).toBeInTheDocument()

    // Arrow keys move between cells.
    fireEvent.keyDown(perrineUnknown(), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(within(table).getByRole('button', { name: /^Mercantile, unknown:/ }))
  })

  it('draws segmented bars and a mosaic with aria labels, legends and data tables, in both conditioning directions', () => {
    render(<TwoWayExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'segmented bars' }))
    expect(screen.getByRole('img', { name: /Segmented bar chart: classification conditional on owner class/ })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'classification legend' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveTextContent('P(unknown | owner class)')

    fireEvent.click(screen.getByRole('radio', { name: 'classification' }))
    fireEvent.click(screen.getByRole('radio', { name: 'mosaic' }))
    expect(screen.getByRole('img', { name: /Mosaic plot: owner class conditional on classification/ })).toBeInTheDocument()
    expect(screen.getByRole('table')).toHaveTextContent(fmtPct(lossTwoWay.colConditional[2][0], 1))
  })
})

describe('<MassScatter>', () => {
  const rManifest = correlation(
    manifest.map((d) => d.declaredMass),
    manifest.map((d) => d.inferredMass),
  )

  it('shows r from the manifest and leaves it unchanged when y is rescaled to kilotonnes', () => {
    render(<MassScatter />)
    expect(screen.getByRole('img', { name: /Scatterplot of inferred mass \(t\) against declared mass for 412/ })).toBeInTheDocument()
    expect(screen.getByText('r · t').nextElementSibling).toHaveTextContent(fmt(rManifest, 3))
    fireEvent.click(screen.getByRole('radio', { name: 'kilotonnes' }))
    expect(screen.getByText('r · kt').nextElementSibling).toHaveTextContent(fmt(rManifest, 3))
    expect(screen.getByRole('img', { name: /inferred mass \(kt\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'RESET POINTS' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: /show later-lost/ })).not.toBeChecked()
    expect(screen.queryByText('r²')).toBeNull()
  })

  it('keeps 412 draggable points, and shows the equation only with showLine', () => {
    render(<MassScatter showLine />)
    expect(screen.getAllByRole('button', { name: /Arrow keys to move/ })).toHaveLength(412)
    const fit = linearRegression(
      manifest.map((d) => d.declaredMass),
      manifest.map((d) => d.inferredMass),
    )
    expect(screen.getByText('r²').nextElementSibling).toHaveTextContent(fmt(fit.r2, 3))
    expect(screen.getByText('equation (t)').nextElementSibling).toHaveTextContent(fit.equation(3))
  })
})

describe('<LeastSquaresVisual>', () => {
  it('snaps to the LSRL: SSE reads the fit and the excess over the minimum reads zero', () => {
    render(<LeastSquaresVisual />)
    expect(lsSample).toHaveLength(16)
    const fit = linearRegression(
      lsSample.map((p) => p.x),
      lsSample.map((p) => p.y),
    )
    expect(screen.getByRole('img', { name: /16 honest hulls/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /SSE as a function of slope/ })).toBeInTheDocument()
    const sseValue = () => screen.getByText('SSE · candidate').nextElementSibling
    const excessValue = () => screen.getByText('excess over minimum').nextElementSibling
    expect(sseValue()).not.toHaveTextContent(fmt(fit.sse, 2))

    fireEvent.click(screen.getByRole('button', { name: 'SNAP TO LSRL' }))
    expect(sseValue()).toHaveTextContent(fmt(fit.sse, 2))
    expect(excessValue()).toHaveTextContent('0.00')
    expect(screen.getByText('LSRL (exact)').nextElementSibling).toHaveTextContent(fit.equation(3))

    fireEvent.click(screen.getByRole('button', { name: 'RESET' }))
    expect(screen.getByLabelText('slope b')).toHaveValue('1')
  })
})

describe('<DecisionAside>', () => {
  it('renders children only when a matching decision has been recorded', () => {
    const { rerender } = render(
      <DecisionAside beat="act-1-checkpoint" match="hold">
        HELD
      </DecisionAside>,
    )
    expect(screen.queryByText('HELD')).toBeNull()
    useProgress.getState().setDecision('act-1-checkpoint-send', 'Hold it')
    rerender(
      <DecisionAside beat="act-1-checkpoint" match="hold">
        HELD
      </DecisionAside>,
    )
    expect(screen.getByText('HELD')).toBeInTheDocument()
    rerender(
      <DecisionAside beat="act-1-checkpoint" match="send">
        SENT
      </DecisionAside>,
    )
    expect(screen.queryByText('SENT')).toBeNull()
  })
})
