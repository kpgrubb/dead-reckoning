/**
 * The two Epilogue panels. Every assertion makes the same point: the panel is showing what
 * `./data` says, and not a second implementation of it.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PosteriorExplorer } from './PosteriorExplorer'
import { ReviewConsole } from './ReviewConsole'
import { fmt, fmtP } from '@/lib/stats'
import {
  ALTERNATIVE_DOUBLING,
  BASE_RATE_ASSUMED,
  BASE_RATE_MEASURED,
  POSTERIOR_ASSUMED,
  POSTERIOR_MEASURED,
  PRESPECIFIED_ALPHA,
  REVIEW_LEVELS,
  findingById,
  findings,
  powerAgainst,
  survivorCount,
} from './data'

/** The value cell next to a readout's label. */
function readout(label: string | RegExp): HTMLElement {
  const el = screen.getByText(label, { selector: 'span.dr-readout__label' })
  const value = el.nextElementSibling
  if (!value) throw new Error(`readout "${String(label)}" has no value cell`)
  return value as HTMLElement
}

describe('<ReviewConsole>', () => {
  it('opens at the level the ship set, and says so on a line the slider cannot move', () => {
    render(<ReviewConsole />)
    expect(readout("reviewer's level")).toHaveTextContent(fmt(PRESPECIFIED_ALPHA, 4))
    expect(readout('level set before the data, MET 140')).toHaveTextContent(fmt(PRESPECIFIED_ALPHA, 2))
    expect(readout('findings that stand')).toHaveTextContent(String(survivorCount(PRESPECIFIED_ALPHA)))
  })

  it('reports the power of the accusation at the level in the slider, from act-6’s own function', () => {
    render(<ReviewConsole />)
    expect(readout(/power of exhibit 14/)).toHaveTextContent(fmt(powerAgainst(ALTERNATIVE_DOUBLING, PRESPECIFIED_ALPHA).power, 3))
  })

  it('loses findings when the reviewer tightens the level, and says which', () => {
    render(<ReviewConsole />)
    const slider = screen.getByLabelText('the level a reviewer applies to the file')
    fireEvent.change(slider, { target: { value: '0' } })
    const strictest = REVIEW_LEVELS[0]
    expect(readout("reviewer's level")).toHaveTextContent(fmt(strictest, 4))
    expect(readout('findings that stand')).toHaveTextContent(String(survivorCount(strictest)))
    expect(survivorCount(strictest)).toBeLessThan(survivorCount(PRESPECIFIED_ALPHA))
    expect(readout(/power of exhibit 14/)).toHaveTextContent(fmt(powerAgainst(ALTERNATIVE_DOUBLING, strictest).power, 3))
  })

  it('shows the selected finding’s scope, limitation and P-value, and follows the segmented control', () => {
    render(<ReviewConsole />)
    const first = findings[0]
    expect(readout('P')).toHaveTextContent(fmtP(first.pValue))
    fireEvent.click(screen.getByRole('radio', { name: String(findingById('uprate').exhibit) }))
    expect(readout('P')).toHaveTextContent(fmtP(findingById('uprate').pValue))
    expect(screen.getByText(/Twelve hulls through one yard/)).toBeInTheDocument()
  })

  it('never lets any level rescue the finding whose conditions fail', () => {
    render(<ReviewConsole />)
    fireEvent.click(screen.getByRole('radio', { name: String(findingById('examiner').exhibit) }))
    for (const i of REVIEW_LEVELS.keys()) {
      fireEvent.change(screen.getByLabelText('the level a reviewer applies to the file'), { target: { value: String(i) } })
      expect(readout(/verdict at/)).toHaveTextContent('conditions fail')
    }
  })
})

describe('<PosteriorExplorer>', () => {
  it('opens on the measured Phobos base rate and reports the registry posterior', () => {
    render(<PosteriorExplorer />)
    expect(readout('base rate · P(working up)')).toHaveTextContent(fmt(BASE_RATE_MEASURED, 3))
    expect(readout('P(working up | this signature)')).toHaveTextContent(fmt(POSTERIOR_MEASURED.posterior, 3))
  })

  it('moves to the rate PROVIDENT assumed, and the same signature reads four times as loud', () => {
    render(<PosteriorExplorer />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`ASSUMED`) }))
    expect(readout('base rate · P(working up)')).toHaveTextContent(fmt(BASE_RATE_ASSUMED, 2))
    expect(readout('P(working up | this signature)')).toHaveTextContent(fmt(POSTERIOR_ASSUMED.posterior, 3))
    expect(POSTERIOR_ASSUMED.posterior / POSTERIOR_MEASURED.posterior).toBeGreaterThan(2.5)
  })

  it('leaves P(signature | working up) where it is when the base rate moves', () => {
    render(<PosteriorExplorer />)
    const before = readout('P(this signature | working up)').textContent
    fireEvent.click(screen.getByRole('button', { name: /ASSUMED/ }))
    expect(readout('P(this signature | working up)')).toHaveTextContent(before ?? '')
  })

  it('exposes the curve as a data table for readers who cannot see it', () => {
    render(<PosteriorExplorer />)
    expect(screen.getByRole('img', { name: /Posterior probability against base rate/i })).toBeInTheDocument()
  })
})
