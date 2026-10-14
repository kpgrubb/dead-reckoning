/**
 * The draggable scatter's keyboard contract (qa-accessibility.md A1). A series is one tab stop
 * with a roving tabindex, the arrow keys still move the focused point, and a modifier or
 * Home/End walks the series instead.
 */
import { describe, expect, it, afterEach, vi } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { Scatter, type ScatterPoint } from './Scatter'

afterEach(cleanup)

const POINTS: ScatterPoint[] = Array.from({ length: 40 }, (_, i) => ({ x: i, y: i * 2, label: `hull ${i + 1}` }))

function renderEditable(onPointsChange = vi.fn()) {
  const r = render(<Scatter points={POINTS} onPointsChange={onPointsChange} xLabel="declared" yLabel="inferred" ariaLabel="Scatterplot of inferred against declared mass" />)
  const dots = () => [...r.container.querySelectorAll<SVGCircleElement>('circle.dr-mark--draggable')]
  return { ...r, dots, onPointsChange }
}

describe('<Scatter> draggable keyboard contract', () => {
  it('is one tab stop however many points it draws', () => {
    const { dots } = renderEditable()
    expect(dots()).toHaveLength(40)
    expect(dots().filter((d) => d.getAttribute('tabindex') === '0')).toHaveLength(1)
    expect(dots().filter((d) => d.getAttribute('tabindex') === '-1')).toHaveLength(39)
  })

  it('is not focusable at all when it is not editable', () => {
    const { container } = render(<Scatter points={POINTS} ariaLabel="Static scatterplot" />)
    expect(container.querySelectorAll('circle[tabindex]')).toHaveLength(0)
  })

  it('still moves the focused point with a plain arrow key', () => {
    const { dots, onPointsChange } = renderEditable()
    fireEvent.keyDown(dots()[0], { key: 'ArrowUp' })
    expect(onPointsChange).toHaveBeenCalledTimes(1)
    const next = onPointsChange.mock.calls[0][0] as ScatterPoint[]
    expect(next[0].y).toBeGreaterThan(POINTS[0].y)
    expect(next[1]).toEqual(POINTS[1])
  })

  it('moves the tab stop, not the point, when the arrow key is modified', () => {
    const { dots, onPointsChange } = renderEditable()
    fireEvent.keyDown(dots()[0], { key: 'ArrowRight', altKey: true })
    expect(onPointsChange).not.toHaveBeenCalled()
    expect(dots()[1].getAttribute('tabindex')).toBe('0')
    expect(dots()[0].getAttribute('tabindex')).toBe('-1')
  })

  it('jumps to the first and last point with Home and End', () => {
    const { dots } = renderEditable()
    fireEvent.keyDown(dots()[0], { key: 'End' })
    expect(dots()[39].getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(dots()[39], { key: 'Home' })
    expect(dots()[0].getAttribute('tabindex')).toBe('0')
  })

  it('swaps the arrow keys over in select mode and back on Escape', () => {
    const { dots, onPointsChange } = renderEditable()
    fireEvent.keyDown(dots()[0], { key: 'Enter' })
    fireEvent.keyDown(dots()[0], { key: 'ArrowRight' })
    expect(onPointsChange).not.toHaveBeenCalled()
    expect(dots()[1].getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(dots()[1], { key: 'Escape' })
    fireEvent.keyDown(dots()[1], { key: 'ArrowRight' })
    expect(onPointsChange).toHaveBeenCalledTimes(1)
  })

  it('announces the selected point and its position', () => {
    const { dots } = renderEditable()
    fireEvent.keyDown(dots()[0], { key: 'ArrowRight', altKey: true })
    expect(screen.getByRole('status')).toHaveTextContent('hull 2: declared 1, inferred 2. Point 2 of 40.')
  })

  it('tells assistive tech how to traverse the series', () => {
    renderEditable()
    expect(screen.getByText(/40 points are one tab stop/)).toBeInTheDocument()
  })
})
