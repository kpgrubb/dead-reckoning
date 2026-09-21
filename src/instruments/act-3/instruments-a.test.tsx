import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { FrameExplorer } from './FrameExplorer'
import { SamplingSimulator } from './SamplingSimulator'
import { BiasDemonstrator } from './BiasDemonstrator'
import { useProgress } from '@/store/progress'
import { Rng, rng, seedFrom } from '@/lib/rng'
import { fmt, fmtInt, fmtPct, mean, sd } from '@/lib/stats'
import {
  CERES_MECHANISM,
  CERES_N,
  FRAME_BELIEF,
  LANE_FRAME,
  POPULATION,
  SRS_MECHANISM,
  SRS_N,
  SURVEY_RUNS,
  biasAndSpread,
  ownerMix,
  simulateBias,
  simulateDesign,
} from './data'

beforeEach(() => {
  useProgress.getState().resetAll()
})

/** The value span of a <Readout label="…"> (labels can collide with axis text and table headers). */
function readout(label: string): Element {
  const hit = screen.getAllByText(label).find((el) => el.classList.contains('dr-readout__label'))
  if (!hit?.nextElementSibling) throw new Error(`no readout labelled "${label}"`)
  return hit.nextElementSibling
}

describe('<FrameExplorer>', () => {
  it('maps all 400 masters and reports what each layer covers and misses', () => {
    render(<FrameExplorer />)
    expect(screen.getByRole('region', { name: 'INTEL · THE FRAME' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Fleet unit map of 400 masters, highlighting population/ })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()

    // Population: everyone is lit, nothing in the Lane frame is missed.
    expect(readout('in this layer')).toHaveTextContent(fmtInt(POPULATION.length))
    expect(readout('in the Lane frame, missed by this layer')).toHaveTextContent(fmtInt(0))
    const unreachable = POPULATION.filter((m) => !m.inLaneFrame).length
    expect(readout('in this layer, not in the Lane frame')).toHaveTextContent(fmtInt(unreachable))

    // The Lane frame: 260, none of them off-frame, none of them missed.
    fireEvent.click(screen.getByRole('radio', { name: 'Lane frame' }))
    expect(readout('in this layer')).toHaveTextContent(fmtInt(LANE_FRAME.length))
    expect(readout('in this layer')).toHaveTextContent(fmtInt(260))
    expect(readout('in the Lane frame, missed by this layer')).toHaveTextContent(fmtInt(0))

    // The Authority's sample: 212 respondents, most of them not on the Lane at all, and neither
    // hull that later diverted is in it — by construction.
    fireEvent.click(screen.getByRole('radio', { name: 'Ceres sample' }))
    const resp = POPULATION.filter((m) => m.ceresRespondent)
    expect(readout('in this layer')).toHaveTextContent(fmtInt(resp.length))
    expect(readout('in this layer, not in the Lane frame')).toHaveTextContent(fmtInt(resp.filter((m) => !m.inLaneFrame).length))
    expect(readout('in the Lane frame, missed by this layer')).toHaveTextContent(fmtInt(LANE_FRAME.filter((m) => !m.ceresRespondent).length))
    expect(readout('hulls that later diverted')).toHaveTextContent('0 of 2')
    const mix = ownerMix(resp)
    expect(readout('Perrine')).toHaveTextContent(fmtInt(mix.Perrine))
    expect(readout('Mercantile')).toHaveTextContent(fmtPct(mix.Mercantile / resp.length, 0))

    // The learner's own sample defaults to the SRS run on the Lane frame.
    fireEvent.click(screen.getByRole('radio', { name: 'Lane sample' }))
    expect(readout('in this layer')).toHaveTextContent(fmtInt(SURVEY_RUNS.srs.sample.length))
    expect(readout('in this layer, not in the Lane frame')).toHaveTextContent(fmtInt(0))
  })

  it('accepts a survey run and recolours the map by owner class', () => {
    render(<FrameExplorer run={SURVEY_RUNS.cluster} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Lane sample' }))
    expect(readout('in this layer')).toHaveTextContent(fmtInt(SURVEY_RUNS.cluster.sample.length))

    expect(screen.getByRole('list', { name: 'status legend' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'owner class' }))
    const legend = screen.getByRole('list', { name: 'owner class legend' })
    expect(within(legend).getByText('Perrine')).toBeInTheDocument()
    expect(within(legend).queryByText('lost this season')).toBeNull()

    // The data table falls back to counts by status × owner class for the lit layer.
    const table = screen.getByRole('table')
    expect(table).toHaveTextContent('in transit (on the schedule)')
    expect(table).toHaveTextContent('Total')
  })
})

describe('<SamplingSimulator>', () => {
  /** The Rng <Sim> builds for a standalone render, before any run. */
  const simRng = () => new Rng(seedFrom(useProgress.getState().learnerSeed, 'standalone', 'act-3-02/designs', 0))

  it('stacks estimates around the frame truth and changes the spread when the design changes', () => {
    render(<SamplingSimulator />)
    expect(screen.getByRole('region', { name: 'SENSOR · SAMPLING-METHOD SIMULATOR' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Histogram of believe piracy estimates under Simple random sample/ })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(readout('fleet truth')).toHaveTextContent(fmt(FRAME_BELIEF, 4))
    expect(readout('draws')).toHaveTextContent('0')

    // One RUN reproduces `simulateDesign` on the seeded generator <Sim> hands the instrument.
    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'RUN 500' }))
    const srs = simulateDesign(r, 'srs', 'belief', 500)
    expect(readout('draws')).toHaveTextContent(fmtInt(500))
    expect(readout('mean of estimates')).toHaveTextContent(fmt(mean(srs.estimates), 4))
    expect(readout('SD of estimates · sampling variability')).toHaveTextContent(fmt(sd(srs.estimates), 4))
    expect(readout('bias · mean − truth')).toHaveTextContent(fmt(mean(srs.estimates) - FRAME_BELIEF, 4))
    expect(readout('mean Sulcus masters contacted')).toHaveTextContent(fmt(mean(srs.sulcus), 2))

    // Switching design clears the stack; stratified is tighter than the SRS on the same truth.
    fireEvent.click(screen.getByRole('radio', { name: 'stratified' }))
    expect(readout('draws')).toHaveTextContent('0')
    fireEvent.click(screen.getByRole('button', { name: 'RUN 500' }))
    const strat = simulateDesign(r, 'stratified', 'belief', 500)
    expect(readout('SD of estimates · sampling variability')).toHaveTextContent(fmt(sd(strat.estimates), 4))
    expect(readout('SD of estimates · sampling variability')).not.toHaveTextContent(fmt(sd(srs.estimates), 4))
    expect(sd(strat.estimates)).toBeLessThan(sd(srs.estimates))

    // …and cluster is wider, for a third of the link time.
    fireEvent.click(screen.getByRole('radio', { name: 'cluster' }))
    fireEvent.click(screen.getByRole('button', { name: 'RUN 500' }))
    const clus = simulateDesign(r, 'cluster', 'belief', 500)
    expect(readout('SD of estimates · sampling variability')).toHaveTextContent(fmt(sd(clus.estimates), 4))
    expect(sd(clus.estimates)).toBeGreaterThan(sd(srs.estimates))
    expect(readout('mean link time drawn')).toHaveTextContent(fmt(mean(clus.minutes) / 60, 1))
  })

  it('prints the units a single draw selected, including the systematic start and the convoy ids', () => {
    render(<SamplingSimulator design="systematic" />)
    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'STEP · ONE DRAW' }))
    const draw = simulateDesign(r, 'systematic', 'belief', 1)
    expect(readout('draws')).toHaveTextContent('1')
    expect(readout('mean of estimates')).toHaveTextContent(fmt(draw.estimates[0], 4))
    expect(screen.getByText(/random start \d+, every 6th registry hull number/)).toBeInTheDocument()
    expect(readout('distinct samples this design can produce')).toHaveTextContent('6')
  })

  it('switches statistic and reprices the link time per design', () => {
    render(<SamplingSimulator />)
    // SRS of 40 at 55 minutes a contact.
    expect(readout('planned contacts')).toHaveTextContent(fmtInt(SRS_N))
    expect(readout('planned link time')).toHaveTextContent(fmt((SRS_N * 55) / 60, 1))
    fireEvent.click(screen.getByRole('radio', { name: 'cluster' }))
    const clusterHours = Number(readout('planned link time').textContent?.replace('h', ''))
    expect(clusterHours).toBeLessThan((SRS_N * 55) / 60)

    fireEvent.click(screen.getByRole('radio', { name: 'seen a Sulcus hull turn late' }))
    expect(screen.getByRole('img', { name: /Histogram of seen a Sulcus hull turn late estimates/ })).toBeInTheDocument()
  })
})

describe('<BiasDemonstrator>', () => {
  const REPS = 500
  const biasFor = (mech: typeof CERES_MECHANISM, n: number) => biasAndSpread(simulateBias(rng('act-3-03', mech.frame, mech.contact, mech.wording, n, REPS), mech, n, REPS), FRAME_BELIEF)

  it('shows the Ceres mechanism sitting far above the truth and the SRS of the Lane far closer to it', () => {
    render(<BiasDemonstrator />)
    expect(screen.getByRole('region', { name: 'INTEL · BIAS DEMONSTRATOR' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Histogram of survey estimates under the chosen mechanism/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Baseline histogram/ })).toBeInTheDocument()
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)
    expect(readout('frame truth')).toHaveTextContent(fmt(FRAME_BELIEF, 4))

    fireEvent.click(screen.getByRole('button', { name: 'SET THE CERES SURVEY' }))
    const ceres = biasFor(CERES_MECHANISM, CERES_N)
    expect(readout('centre of your mechanism')).toHaveTextContent(fmt(ceres.center, 4))
    expect(readout('bias (does not shrink with n)')).toHaveTextContent(fmt(ceres.bias, 4))
    expect(readout('spread · SD (shrinks with n)')).toHaveTextContent(fmt(ceres.spread, 4))
    expect(ceres.bias).toBeGreaterThan(0.3)

    fireEvent.click(screen.getByRole('button', { name: 'SET AN SRS OF THE LANE' }))
    const srs = biasFor(SRS_MECHANISM, SRS_N)
    expect(readout('bias (does not shrink with n)')).toHaveTextContent(fmt(srs.bias, 4))
    expect(Math.abs(srs.bias)).toBeLessThan(Math.abs(ceres.bias))
  })

  it('shrinks the spread with n and leaves the bias where it is', () => {
    render(<BiasDemonstrator />)
    fireEvent.click(screen.getByRole('button', { name: 'SET THE CERES SURVEY' }))
    const small = biasFor(CERES_MECHANISM, 40)
    const big = biasFor(CERES_MECHANISM, CERES_N)
    expect(readout('spread · SD (shrinks with n)')).toHaveTextContent(fmt(big.spread, 4))

    fireEvent.change(screen.getByLabelText('masters contacted per survey (n)'), { target: { value: '40' } })
    expect(readout('spread · SD (shrinks with n)')).toHaveTextContent(fmt(small.spread, 4))
    expect(readout('bias (does not shrink with n)')).toHaveTextContent(fmt(small.bias, 4))
    // Five times the contacts: the spread falls, the bias does not.
    expect(big.spread).toBeLessThan(small.spread)
    expect(Math.abs(big.bias - small.bias)).toBeLessThan(0.05)
  })

  it('moves the centre when any single mechanism switch is thrown', () => {
    render(<BiasDemonstrator />)
    fireEvent.click(screen.getByRole('button', { name: 'SET AN SRS OF THE LANE' }))
    const neutral = biasFor(SRS_MECHANISM, SRS_N)
    expect(readout('centre of your mechanism')).toHaveTextContent(fmt(neutral.center, 4))

    fireEvent.click(screen.getByRole('radio', { name: 'the Authority’s Q4' }))
    const leading = biasFor({ ...SRS_MECHANISM, wording: 'leading' }, SRS_N)
    expect(readout('centre of your mechanism')).toHaveTextContent(fmt(leading.center, 4))
    expect(leading.center).toBeGreaterThan(neutral.center)
    expect(screen.getByText(/response bias \(question wording\)/)).toBeInTheDocument()
  })

  it('carries both parameters: the frame truth and the truth among masters who answer, and the SRS baseline centres on the second', () => {
    // The 88 Sulcus masters in the frame all believe piracy and all answer "no comment" to a
    // tight-beam contact, so a random contact cannot estimate the frame truth at all — it estimates
    // belief among the masters who give a usable answer, and is very nearly unbiased for THAT.
    const responders = LANE_FRAME.filter((m) => !m.sulcus && m.respondsToContact)
    const responderTruth = responders.filter((m) => m.believesPiracy).length / responders.length
    expect(responders.length).toBeLessThan(LANE_FRAME.length)
    expect(responderTruth).toBeLessThan(FRAME_BELIEF)

    render(<BiasDemonstrator />)
    expect(readout('frame truth')).toHaveTextContent(fmt(FRAME_BELIEF, 4))
    expect(readout('truth among masters who answer')).toHaveTextContent(fmt(responderTruth, 4))

    fireEvent.click(screen.getByRole('button', { name: 'SET AN SRS OF THE LANE' }))
    const srs = biasFor(SRS_MECHANISM, SRS_N)
    // Badly biased for the frame truth; essentially unbiased for the responder truth.
    expect(Math.abs(srs.center - FRAME_BELIEF)).toBeGreaterThan(0.1)
    expect(Math.abs(srs.center - responderTruth)).toBeLessThan(0.03)
  })
})
