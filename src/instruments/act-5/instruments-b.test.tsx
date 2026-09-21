import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CltMachine } from './CltMachine'
import { ProportionSampler } from './ProportionSampler'
import { DifferenceMachine } from './DifferenceMachine'
import { CdfAccumulator } from './CdfAccumulator'
import { LimitStack } from './LimitStack'
import { useProgress } from '@/store/progress'
import { Rng, seedFrom } from '@/lib/rng'
import { parentMean, parentSd, simulate } from '@/lib/sim'
import { fmt, fmtInt, mean, normal, samplingSdMean, samplingSdProportion, sd } from '@/lib/stats'
import {
  LANE_DELAY_MEAN,
  LANE_DELAY_SD,
  NINETEEN_MEAN_DELAY,
  NINETEEN_N,
  OTHER_N,
  PERRINE_N,
  POOLED_RATE,
  SD_DIFF_MEANS_FLEETS,
  SD_DIFF_MEANS_SMALL,
  SD_DIFF_PROPORTIONS,
  SD_PHAT_OTHER,
  SD_PHAT_PERRINE,
  SE_MEAN_19,
  SURVIVING_PERRINE_N,
  drawMeanDifference,
  parentById,
} from './data'

beforeEach(() => {
  useProgress.getState().resetAll()
})

function readout(label: string): Element {
  const hit = screen.getAllByText(label).find((el) => el.classList.contains('dr-readout__label'))
  if (!hit?.nextElementSibling) throw new Error(`no readout labelled "${label}"`)
  return hit.nextElementSibling
}

/** A readout's value as a number (fmt writes a typographic minus). */
function readNumber(label: string): number {
  return Number((readout(label).textContent ?? '').replace(/−/g, '-').replace(/[^0-9.eE+-]/g, ''))
}

describe('<CltMachine>', () => {
  const laneParams = parentById('lane-delay').params
  const seedFor = (parent: string, n: number) => seedFrom(useProgress.getState().learnerSeed, 'standalone', 'act-5-03/clt', parent, n, 0)

  it('renders the parent, the empty stage and the theory before anything runs', () => {
    render(<CltMachine />)
    expect(screen.getByRole('region', { name: 'INTEL · CENTRAL LIMIT MACHINE' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Density of the parent population: Lane delay · honest transits/ })).toBeInTheDocument()
    expect(screen.getByText('no replications yet · press RUN')).toBeInTheDocument()

    // σ/√n is the course's own samplingSdMean, at the Act's own n = 19.
    expect(readout('σ/√n · the theory')).toHaveTextContent(fmt(samplingSdMean(LANE_DELAY_SD, NINETEEN_N), 5))
    expect(readout('σ/√n · the theory')).toHaveTextContent(fmt(SE_MEAN_19, 5))
    expect(readout('σ/n · the common error')).toHaveTextContent(fmt(LANE_DELAY_SD / NINETEEN_N, 5))
    expect(readout('parent μ')).toHaveTextContent(fmt(LANE_DELAY_MEAN, 4))
    expect(readout('parent σ')).toHaveTextContent(fmt(LANE_DELAY_SD, 4))
  })

  it('runs the worker task and the simulated SD lands on σ/√n', async () => {
    render(<CltMachine />)
    fireEvent.click(screen.getByRole('button', { name: `RUN ${fmtInt(2000)}` }))
    await waitFor(() => expect(readout('replications')).toHaveTextContent(`${fmtInt(2000)} / ${fmtInt(2000)}`))

    const means = simulate('sample-mean', { ...laneParams, n: NINETEEN_N }, seedFor('lane-delay', NINETEEN_N), 2000)
    expect(readout('SD of the simulated means · the machine')).toHaveTextContent(fmt(sd(means), 5))
    expect(readout('mean of the simulated means')).toHaveTextContent(fmt(mean(means), 4))
    expect(screen.getByRole('img', { name: /Histogram of 2,000 simulated sample means of 19 draws/ })).toBeInTheDocument()

    // The machine agrees with the theory to two decimals — the whole point of the module.
    expect(Math.abs(sd(means) - SE_MEAN_19)).toBeLessThan(0.02)
  })

  it('changes parent and clears the stack; a skewed parent still builds a near-normal stack', async () => {
    render(<CltMachine parent="time-to-silence" n={30} />)
    const skewed = parentById('time-to-silence').params
    expect(readout('σ/√n · the theory')).toHaveTextContent(fmt(parentSd(skewed) / Math.sqrt(30), 5))
    expect(readout('parent skewness')).toHaveTextContent(/\d/)

    fireEvent.click(screen.getByRole('button', { name: `RUN ${fmtInt(2000)}` }))
    await waitFor(() => expect(readout('replications')).toHaveTextContent(`${fmtInt(2000)} / ${fmtInt(2000)}`))
    // The parent is strongly right-skewed; the stack of means is not.
    expect(Math.abs(readNumber('skewness of the stack'))).toBeLessThan(Math.abs(readNumber('parent skewness')))

    fireEvent.click(screen.getByRole('radio', { name: 'Mark at last contact · the Board’s null' }))
    expect(screen.getByText('no replications yet · press RUN')).toBeInTheDocument()
    expect(readout('σ/√n · the theory')).toHaveTextContent(fmt(parentSd(parentById('mark').params) / Math.sqrt(30), 5))
  })

  it('marks the nineteen when asked, on the Lane parent at n = 19', async () => {
    render(<CltMachine showNineteen />)
    fireEvent.click(screen.getByRole('button', { name: `RUN ${fmtInt(2000)}` }))
    await waitFor(() => expect(readout('replications')).toHaveTextContent(`${fmtInt(2000)} / ${fmtInt(2000)}`))
    expect(readout("the nineteen's mean delay")).toHaveTextContent(fmt(NINETEEN_MEAN_DELAY, 3))
    // It lies far outside the pile: more than four σ/√n above the Lane mean.
    expect((NINETEEN_MEAN_DELAY - LANE_DELAY_MEAN) / SE_MEAN_19).toBeGreaterThan(4)
  })

  it('shrinks σ/√n when n rises, and the common error is nothing like it', () => {
    render(<CltMachine />)
    const at19 = readNumber('σ/√n · the theory')
    fireEvent.change(screen.getByLabelText('sample size n'), { target: { value: '60' } })
    const at60 = readNumber('σ/√n · the theory')
    expect(at60).toBeLessThan(at19)
    expect(readout('σ/√n · the theory')).toHaveTextContent(fmt(parentSd(laneParams) / Math.sqrt(60), 5))
    expect(readNumber('σ/n · the common error')).toBeLessThan(at60)
  })
})

describe('<ProportionSampler>', () => {
  const simRng = () => new Rng(seedFrom(useProgress.getState().learnerSeed, 'standalone', 'act-5-04/proportions', 0))

  it('carries the Large Counts numbers and the theoretical SD for the 900', () => {
    render(<ProportionSampler />)
    expect(screen.getByRole('region', { name: 'TACTICAL · PROPORTION SAMPLER' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Histogram of simulated sample loss rates/ })).toBeInTheDocument()

    expect(readout('n · p · expected losses')).toHaveTextContent(fmt(PERRINE_N * POOLED_RATE, 2))
    expect(readout('n · (1 − p) · expected arrivals')).toHaveTextContent(fmt(PERRINE_N * (1 - POOLED_RATE), 1))
    expect(readout('Large Counts · both ≥ 10')).toHaveTextContent('holds')
    expect(readout('√(p(1 − p)/n) · the theory')).toHaveTextContent(fmt(samplingSdProportion(POOLED_RATE, PERRINE_N), 5))
    expect(readout('√(p(1 − p)/n) · the theory')).toHaveTextContent(fmt(SD_PHAT_PERRINE, 5))
  })

  it('stacks p̂ on the seeded generator and the simulated SD lands on the theory', () => {
    render(<ProportionSampler />)
    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'RUN 500' }))
    const stack = Array.from({ length: 500 }, () => r.binomial(PERRINE_N, POOLED_RATE) / PERRINE_N)

    expect(readout('draws')).toHaveTextContent(fmtInt(500))
    expect(readout('mean of the stack')).toHaveTextContent(fmt(mean(stack), 5))
    expect(readout('SD of the simulated p̂ · the machine')).toHaveTextContent(fmt(sd(stack), 5))
    expect(Math.abs(sd(stack) - SD_PHAT_PERRINE)).toBeLessThan(0.0008)
  })

  it('withdraws the normal overlay when Large Counts fails', () => {
    render(<ProportionSampler />)
    fireEvent.change(screen.getByLabelText('transits in the fleet (n)'), { target: { value: '100' } })
    expect(readout('n · p · expected losses')).toHaveTextContent(fmt(100 * POOLED_RATE, 2))
    expect(readout('Large Counts · both ≥ 10')).toHaveTextContent('FAILS')
    expect(readout('normal overlay')).toHaveTextContent('withdrawn')
    expect(screen.queryByText('N(p, √(p(1−p)/n))')).toBeNull()
  })

  it('adds variances in two-fleet mode and prints the common error beside them', () => {
    render(<ProportionSampler />)
    fireEvent.click(screen.getByRole('radio', { name: 'TWO FLEETS' }))
    expect(screen.getByRole('img', { name: /Histogram of simulated differences in sample loss rates/ })).toBeInTheDocument()

    expect(readout('SD of p̂₁ alone')).toHaveTextContent(fmt(SD_PHAT_PERRINE, 5))
    expect(readout('SD of p̂₂ alone')).toHaveTextContent(fmt(SD_PHAT_OTHER, 5))
    expect(readout('√(SD₁² + SD₂²) · the theory')).toHaveTextContent(fmt(SD_DIFF_PROPORTIONS, 5))
    expect(readout('SD₁ − SD₂ · the common error')).toHaveTextContent(fmt(SD_PHAT_PERRINE - SD_PHAT_OTHER, 5))
    // Variances add: the difference is noisier than either fleet on its own.
    expect(SD_DIFF_PROPORTIONS).toBeGreaterThan(Math.max(SD_PHAT_PERRINE, SD_PHAT_OTHER))
    expect(readout('p₁ − p₂ · the null centre')).toHaveTextContent(fmt(0, 5))
    expect(readout('1-in-100 gap under a common rate')).toHaveTextContent(/\d/)
  })

  it('never shows the Lane’s observed gap — that belongs to Act VI', () => {
    render(<ProportionSampler mode="two" />)
    expect(screen.queryByText(/P-value/i)).toBeNull()
    expect(screen.queryByText(/19 ?\/ ?900/)).toBeNull()
    expect(screen.queryByText(/observed gap/i)).toBeNull()
  })
})

describe('<DifferenceMachine>', () => {
  const simRng = () => new Rng(seedFrom(useProgress.getState().learnerSeed, 'standalone', 'act-5-05/differences', 0))

  it('prints √(σ₁²/n₁ + σ₂²/n₂) and the wrong answer beside it', () => {
    render(<DifferenceMachine />)
    expect(screen.getByRole('region', { name: 'ENGINEERING · DIFFERENCE MACHINE' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Histogram of simulated differences in mean Mark-9 delay/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Share of the total variance of the difference/ })).toBeInTheDocument()

    expect(readout('σ₁/√n₁')).toHaveTextContent(fmt(LANE_DELAY_SD / Math.sqrt(PERRINE_N), 5))
    expect(readout('σ₂/√n₂')).toHaveTextContent(fmt(LANE_DELAY_SD / Math.sqrt(OTHER_N), 5))
    expect(readout('√(σ₁²/n₁ + σ₂²/n₂) · the theory')).toHaveTextContent(fmt(SD_DIFF_MEANS_FLEETS, 5))
    expect(readout('σ₁/√n₁ − σ₂/√n₂ · the common error')).toHaveTextContent(fmt(LANE_DELAY_SD / Math.sqrt(PERRINE_N) - LANE_DELAY_SD / Math.sqrt(OTHER_N), 5))
    // The wrong answer is smaller than either standard error — which is the tell.
    expect(readNumber('σ₁/√n₁ − σ₂/√n₂ · the common error')).toBeLessThan(readNumber('σ₂/√n₂'))
    expect(SD_DIFF_MEANS_FLEETS).toBeGreaterThan(LANE_DELAY_SD / Math.sqrt(PERRINE_N))
  })

  it('stacks differences on the seeded generator and lands on the theory', () => {
    render(<DifferenceMachine />)
    const r = simRng()
    fireEvent.click(screen.getByRole('button', { name: 'RUN 300' }))
    const stack = Array.from({ length: 300 }, () => drawMeanDifference(r, LANE_DELAY_MEAN, LANE_DELAY_SD, PERRINE_N, LANE_DELAY_MEAN, LANE_DELAY_SD, OTHER_N))

    expect(readout('draws')).toHaveTextContent(fmtInt(300))
    expect(readout('SD of the simulated differences · the machine')).toHaveTextContent(fmt(sd(stack), 5))
    expect(readout('mean of the stack')).toHaveTextContent(fmt(mean(stack), 4))
    expect(Math.abs(sd(stack) - SD_DIFF_MEANS_FLEETS)).toBeLessThan(0.02)
  })

  it('shows the nineteen supplying nearly all of the variance on the small-group preset', () => {
    render(<DifferenceMachine />)
    fireEvent.click(screen.getByRole('radio', { name: 'nineteen vs the surviving 881' }))
    expect(readout('√(σ₁²/n₁ + σ₂²/n₂) · the theory')).toHaveTextContent(fmt(SD_DIFF_MEANS_SMALL, 5))
    expect(readout('σ₁²/n₁ · variance from group 1')).toHaveTextContent(fmt(LANE_DELAY_SD ** 2 / NINETEEN_N, 5))
    expect(readout('σ₂²/n₂ · variance from group 2')).toHaveTextContent(fmt(LANE_DELAY_SD ** 2 / SURVIVING_PERRINE_N, 5))
    const share1 = LANE_DELAY_SD ** 2 / NINETEEN_N / (LANE_DELAY_SD ** 2 / NINETEEN_N + LANE_DELAY_SD ** 2 / SURVIVING_PERRINE_N)
    expect(share1).toBeGreaterThan(0.97)
    expect(readout('1-in-1,000 gap · 19 against 881')).toHaveTextContent(/\d/)
    // Nineteen against 881 is far wider than 900 against 1,712.
    expect(SD_DIFF_MEANS_SMALL).toBeGreaterThan(5 * SD_DIFF_MEANS_FLEETS)
  })

  it('reprices the theory when a sample size slider moves', () => {
    render(<DifferenceMachine />)
    fireEvent.change(screen.getByLabelText('group 1 sample size (n₁)'), { target: { value: '100' } })
    expect(readout('√(σ₁²/n₁ + σ₂²/n₂) · the theory')).toHaveTextContent(fmt(Math.sqrt(LANE_DELAY_SD ** 2 / 100 + LANE_DELAY_SD ** 2 / OTHER_N), 5))
    expect(readout('draws')).toHaveTextContent('0')
  })
})

describe('<CdfAccumulator>', () => {
  it('makes the shaded area and the height of the dot the same number', () => {
    render(<CdfAccumulator />)
    expect(screen.getByRole('region', { name: 'SENSOR · ACCUMULATOR · DENSITY AND ITS RUNNING TOTAL' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Density of Mark-9 delay with the area up to the cutoff cut into accumulation strips/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /The running total F of the density/ })).toBeInTheDocument()

    const x = LANE_DELAY_MEAN + LANE_DELAY_SD
    expect(readout('cutoff x')).toHaveTextContent(fmt(x, 3))
    expect(readout('F(x) · normal.cdf')).toHaveTextContent(fmt(normal.cdf(x, LANE_DELAY_MEAN, LANE_DELAY_SD), 5))
    // The slope of the running total is the density — that is the topic.
    expect(readout('f(x) · normal.pdf')).toHaveTextContent(fmt(normal.pdf(x, LANE_DELAY_MEAN, LANE_DELAY_SD), 5))
    expect(Math.abs(readNumber('slope of F at x · rise over run') - normal.pdf(x, LANE_DELAY_MEAN, LANE_DELAY_SD))).toBeLessThan(1e-4)
  })

  it('shrinks the Riemann error as strips are added', () => {
    render(<CdfAccumulator strips={4} />)
    const coarse = Math.abs(readNumber('strip sum − F(x) · the error'))
    fireEvent.change(screen.getByLabelText('accumulation strips'), { target: { value: '200' } })
    const fine = Math.abs(readNumber('strip sum − F(x) · the error'))
    expect(fine).toBeLessThan(coarse)
    expect(fine).toBeLessThan(1e-4)
  })

  it('moves the cutoff from the keyboard and re-accumulates', () => {
    render(<CdfAccumulator />)
    const handle = screen.getByRole('slider', { name: 'cutoff delay' })
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    const moved = LANE_DELAY_MEAN + LANE_DELAY_SD - LANE_DELAY_SD / 20
    expect(readout('cutoff x')).toHaveTextContent(fmt(moved, 3))
    expect(readout('F(x) · normal.cdf')).toHaveTextContent(fmt(normal.cdf(moved, LANE_DELAY_MEAN, LANE_DELAY_SD), 5))
  })
})

describe('<LimitStack>', () => {
  it('standardizes the mean and shows the population unmoved beside it', () => {
    render(<LimitStack />)
    expect(screen.getByRole('region', { name: 'INTEL · LIMIT STACK · WHAT CONVERGES, AND HOW FAST' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Density of the parent population: Time to silence · strongly skewed/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Histogram of 800 standardized sample means/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Standard deviation of the sample mean against sample size/ })).toBeInTheDocument()

    const sigma = parentSd(parentById('time-to-silence').params)
    expect(readout('parent σ')).toHaveTextContent(fmt(sigma, 4))
    expect(readout('parent μ')).toHaveTextContent(fmt(parentMean(parentById('time-to-silence').params), 4))
    expect(readout('σ/√n')).toHaveTextContent(fmt(sigma / 2, 5))
    expect(readout('n needed to halve σ/√n')).toHaveTextContent(fmtInt(16))
  })

  it('converges as n grows: the gap from N(0,1) falls and σ/√n follows 1/√n', () => {
    render(<LimitStack />)
    const sigma = parentSd(parentById('time-to-silence').params)
    const gapSmall = readNumber('largest gap from N(0, 1) · the convergence')

    fireEvent.change(screen.getByLabelText('sample size n'), { target: { value: '100' } })
    expect(readout('σ/√n')).toHaveTextContent(fmt(sigma / 10, 5))
    expect(readout('n needed to halve σ/√n')).toHaveTextContent(fmtInt(400))
    expect(readNumber('largest gap from N(0, 1) · the convergence')).toBeLessThan(gapSmall)
  })

  it('switches parent without touching the standardized axis', () => {
    render(<LimitStack parent="mark" n={9} />)
    const sigma = parentSd(parentById('mark').params)
    expect(readout('σ/√n')).toHaveTextContent(fmt(sigma / 3, 5))
    fireEvent.click(screen.getByRole('radio', { name: 'Loss on one transit · Bernoulli' }))
    expect(screen.getByRole('img', { name: /Probability distribution of the parent population: Loss on one transit · Bernoulli/ })).toBeInTheDocument()
    expect(readout('σ/√n')).toHaveTextContent(fmt(parentSd(parentById('loss').params) / 3, 5))
  })
})
