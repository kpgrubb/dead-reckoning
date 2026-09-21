import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SamplingBuilder } from './SamplingBuilder'
import { DelayNormalExplorer } from './DelayNormalExplorer'
import { useProgress } from '@/store/progress'
import { Rng, seedFrom } from '@/lib/rng'
import { fmt, fmtInt, mean, normal, sd, skewness, zScore } from '@/lib/stats'
import { CUTTERS, DELAY_CUTOFF_1PCT, LANE_DELAY_MEAN, LANE_DELAY_SD, NINETEEN_MEAN_DELAY, NINETEEN_SD_DELAY, P_HONEST_AS_LATE, honestDelays, patrolTruth, rateOf, simulatePatrols } from './data'

beforeEach(() => {
  useProgress.getState().resetAll()
})

/** The value span of a <Readout label="…"> (labels collide with axis text and table headers). */
function readout(label: string): Element {
  const hit = screen.getAllByText(label).find((el) => el.classList.contains('dr-readout__label'))
  if (!hit?.nextElementSibling) throw new Error(`no readout labelled "${label}"`)
  return hit.nextElementSibling
}

describe('<SamplingBuilder>', () => {
  /** The Rng <Sim> builds for a standalone render, before any run. */
  const simRng = () => new Rng(seedFrom(useProgress.getState().learnerSeed, 'standalone', 'act-5-01/patrols', 0))

  it('renders the panel, the chart and the Lane truth before anything is drawn', () => {
    render(<SamplingBuilder />)
    expect(screen.getByRole('region', { name: 'INTEL · SAMPLING-DISTRIBUTION BUILDER' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Histogram of the loss rate of one patrol over repeated patrols/ })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(readout('draws')).toHaveTextContent('0')
    expect(readout('Lane truth')).toHaveTextContent(fmt(patrolTruth('rate'), 5))
    // Both cutters are on the display from the start — the point of the module.
    expect(readout('Asgard · 3 of 410')).toHaveTextContent(fmt(rateOf(CUTTERS.asgard), 5))
    expect(readout('Tindr · 1 of 380')).toHaveTextContent(fmt(rateOf(CUTTERS.tindr), 5))
  })

  it('stacks the loss rate on the seeded generator and finds both cutters inside the pile', () => {
    render(<SamplingBuilder />)
    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'RUN 400' }))
    const stack = simulatePatrols(r, 'rate', 400, 400)

    expect(readout('draws')).toHaveTextContent(fmtInt(400))
    expect(readout('mean of the stack')).toHaveTextContent(fmt(mean(stack), 5))
    expect(readout('SD of the stack · sampling variability')).toHaveTextContent(fmt(sd(stack), 5))
    expect(readout('bias · mean − truth')).toHaveTextContent(fmt(mean(stack) - patrolTruth('rate'), 5))

    // Neither cutter is out on a limb: both sit well inside the honest pile.
    const asgardShare = stack.filter((v) => v <= rateOf(CUTTERS.asgard)).length / stack.length
    const tindrShare = stack.filter((v) => v <= rateOf(CUTTERS.tindr)).length / stack.length
    expect(asgardShare).toBeGreaterThan(0.02)
    expect(asgardShare).toBeLessThan(0.98)
    expect(tindrShare).toBeGreaterThan(0.001)
    expect(tindrShare).toBeLessThan(0.98)
  })

  it('prints what one patrol was when STEP is pressed', () => {
    render(<SamplingBuilder />)
    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'STEP · ONE PATROL' }))
    const one = simulatePatrols(r, 'rate', 400, 1)[0]
    expect(readout('draws')).toHaveTextContent('1')
    expect(readout('mean of the stack')).toHaveTextContent(fmt(one, 5))
    expect(screen.getByText(/400 transits drawn ·/)).toBeInTheDocument()
  })

  it('shows the min-of-two statistic sitting off the truth — bias by construction', () => {
    render(<SamplingBuilder />)
    fireEvent.click(screen.getByRole('radio', { name: "lower of two patrols' loss rates" }))
    expect(readout('draws')).toHaveTextContent('0')
    expect(screen.getByRole('img', { name: /Histogram of the lower of two patrols' loss rates/ })).toBeInTheDocument()

    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'RUN 400' }))
    const stack = simulatePatrols(r, 'minOfTwo', 400, 400)
    const bias = mean(stack) - patrolTruth('minOfTwo')
    expect(readout('bias · mean − truth')).toHaveTextContent(fmt(bias, 5))
    expect(bias).toBeLessThan(0)
  })

  it('shrinks the spread when n rises and leaves the bias where it is', () => {
    render(<SamplingBuilder />)
    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'RUN 400' }))
    const small = simulatePatrols(r, 'rate', 400, 400)
    expect(readout('SD of the stack · sampling variability')).toHaveTextContent(fmt(sd(small), 5))

    // Raising n clears the stack (it is a different sampling distribution) and tightens it.
    fireEvent.change(screen.getByLabelText('transits per patrol (n)'), { target: { value: '1600' } })
    expect(readout('draws')).toHaveTextContent('0')
    fireEvent.click(screen.getByRole('button', { name: 'RUN 400' }))
    const big = simulatePatrols(r, 'rate', 1600, 400)
    expect(readout('SD of the stack · sampling variability')).toHaveTextContent(fmt(sd(big), 5))
    expect(sd(big)).toBeLessThan(sd(small))
  })

  it('switches to a delay statistic and re-labels the axis in days', () => {
    render(<SamplingBuilder />)
    fireEvent.click(screen.getByRole('radio', { name: 'mean Mark-9 delay of one patrol' }))
    expect(screen.getByRole('img', { name: /Histogram of the mean Mark-9 delay of one patrol/ })).toBeInTheDocument()
    expect(readout('Lane truth')).toHaveTextContent(fmt(patrolTruth('meanDelay'), 3))
  })
})

describe('<DelayNormalExplorer>', () => {
  it('runs the model backwards: an area in, the cutoff out', () => {
    render(<DelayNormalExplorer />)
    expect(screen.getByRole('region', { name: 'SENSOR · DELAY MODEL · AREA AND CUTOFF' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Normal density of Mark-9 delay for Lane · honest transits/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Normal probability plot of honest Mark-9 delay/ })).toBeInTheDocument()
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)

    // The default 1 % tail is exactly the Ledger's own 1 % cutoff, computed by normal.quantile.
    expect(readout('cutoff delay')).toHaveTextContent(fmt(DELAY_CUTOFF_1PCT, 3))
    expect(readout('cutoff delay')).toHaveTextContent(fmt(normal.isf(0.01, LANE_DELAY_MEAN, LANE_DELAY_SD), 3))
    expect(readout('area above the cutoff')).toHaveTextContent(fmt(0.01, 5))
    expect(readout('z-score of the cutoff')).toHaveTextContent(fmt(zScore(DELAY_CUTOFF_1PCT, LANE_DELAY_MEAN, LANE_DELAY_SD), 3))
    expect(readout('μ · Lane · honest transits')).toHaveTextContent(fmt(LANE_DELAY_MEAN, 4))
    expect(readout('σ · Lane · honest transits')).toHaveTextContent(fmt(LANE_DELAY_SD, 4))
  })

  it('answers "one in seven" the forward way, from a delay to an area', () => {
    render(<DelayNormalExplorer mode="forward" cutoff={NINETEEN_MEAN_DELAY} />)
    expect(readout('area above the cutoff')).toHaveTextContent(fmt(P_HONEST_AS_LATE, 5))
    expect(readout('that is one honest transit in')).toHaveTextContent(`1 in ${Math.round(1 / P_HONEST_AS_LATE)}`)
    expect(Math.round(1 / P_HONEST_AS_LATE)).toBe(6)
    // The cutoff handle is a keyboard-operable slider.
    const handle = screen.getByRole('slider', { name: 'cutoff delay' })
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    const moved = NINETEEN_MEAN_DELAY + LANE_DELAY_SD / 20
    expect(readout('cutoff delay')).toHaveTextContent(fmt(moved, 3))
    expect(readout('area above the cutoff')).toHaveTextContent(fmt(normal.sf(moved, LANE_DELAY_MEAN, LANE_DELAY_SD), 5))
  })

  it('swaps the population to the nineteen and re-centres the model', () => {
    render(<DelayNormalExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'the nineteen' }))
    expect(readout('μ · the nineteen')).toHaveTextContent(fmt(NINETEEN_MEAN_DELAY, 4))
    expect(readout('σ · the nineteen')).toHaveTextContent(fmt(NINETEEN_SD_DELAY, 4))
    expect(readout('cutoff delay')).toHaveTextContent(fmt(normal.isf(0.01, NINETEEN_MEAN_DELAY, NINETEEN_SD_DELAY), 3))
  })

  it('bends the probability plot when the variable is not normal', () => {
    render(<DelayNormalExplorer />)
    expect(readout('skewness of the variable')).toHaveTextContent(fmt(skewness(honestDelays), 3))
    expect(readout('verdict')).toHaveTextContent('a normal model is reasonable')

    fireEvent.click(screen.getByRole('radio', { name: 'squared delay (d²)' }))
    const squared = honestDelays.map((d) => d * d)
    expect(readout('skewness of the variable')).toHaveTextContent(fmt(skewness(squared), 3))
    expect(skewness(squared)).toBeGreaterThan(1)
    expect(readout('verdict')).toHaveTextContent('a normal model is not reasonable')
    expect(screen.getByRole('img', { name: /Normal probability plot of squared Mark-9 delay/ })).toBeInTheDocument()
  })
})
