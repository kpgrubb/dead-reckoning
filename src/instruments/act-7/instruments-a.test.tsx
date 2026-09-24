/**
 * act-7-01 / act-7-02 / act-7-03 instruments: TvsNormal, ReactorOutputPanel, TIntervalBench,
 * TPValueVisualiser and PoolingExplorer. Every assertion here makes the same point: the panel is
 * showing what `@/lib/stats`, `@/lib/sim` and `@/instruments/act-7/data` say, and not a second
 * implementation of it.
 */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { REFIT_DF, T_SIM_REPS, T_SIM_SEED, TvsNormal, Z_95 } from './TvsNormal'
import { ReactorOutputPanel } from './ReactorOutputPanel'
import { CAPTURE_SEED, CAPTURE_RUNS, TIntervalBench } from './TIntervalBench'
import { TPValueVisualiser } from './TPValueVisualiser'
import { PoolingExplorer, TARGET_POWER } from './PoolingExplorer'
import { rng, seedFrom } from '@/lib/rng'
import { simulate } from '@/lib/sim'
import {
  fiveNumber,
  fmt,
  fmtInt,
  fmtP,
  fmtPct,
  mean,
  normal,
  oneMeanInterval,
  oneMeanTest,
  outliers,
  pValueT,
  pValueZ,
  sd,
  skewness,
  t,
  tStar,
  twoMeanTest,
  zStar,
} from '@/lib/stats'
import {
  MK3_SPEC_KN,
  NINETEEN_N,
  OSTROW_SE,
  OUTPUT_INTERVAL,
  PERRINE_N,
  REFIT_N,
  divertedCountForPower,
  lostPerrineDelays,
  otherDelays,
  ostrowPowerAgainst,
  perrineDelays,
  refitOutputs,
  survivingPerrineDelays,
} from './data'

/** The value cell next to a readout's label. */
function readout(label: string | RegExp): HTMLElement {
  const el = screen.getByText(label, { selector: 'span.dr-readout__label' })
  const value = el.nextElementSibling
  if (!value) throw new Error(`readout "${String(label)}" has no value cell`)
  return value as HTMLElement
}

// ---------------------------------------------------------------------------------------------
// act-7-01 · TvsNormal
// ---------------------------------------------------------------------------------------------

describe('<TvsNormal>', () => {
  it('opens on the Refit set’s df and reports t* against z* from @/lib/stats', () => {
    render(<TvsNormal />)
    expect(screen.getByRole('region', { name: /t distribution against the standard normal/i })).toBeInTheDocument()
    expect(readout(`t* · df ${fmtInt(REFIT_DF)}`)).toHaveTextContent(fmt(tStar(0.95, REFIT_DF), 4))
    expect(readout('z*')).toHaveTextContent(fmt(zStar(0.95), 4))
    expect(readout('t* − z*')).toHaveTextContent(fmt(tStar(0.95, REFIT_DF) - zStar(0.95), 4))
    expect(tStar(0.95, REFIT_DF)).toBeGreaterThan(zStar(0.95))
  })

  it('reports the tail beyond ±1.96 as heavier under t than under the normal', () => {
    render(<TvsNormal />)
    expect(readout(`area beyond ±${fmt(Z_95, 2)} under t(${fmtInt(REFIT_DF)})`)).toHaveTextContent(fmt(2 * t.sf(Z_95, REFIT_DF), 4))
    expect(readout(`area beyond ±${fmt(Z_95, 2)} under the normal`)).toHaveTextContent(fmt(2 * normal.sf(Z_95), 4))
    expect(2 * t.sf(Z_95, REFIT_DF)).toBeGreaterThan(2 * normal.sf(Z_95))
  })

  it('closes the gap when the df slider is run up', () => {
    render(<TvsNormal />)
    fireEvent.change(screen.getByLabelText('degrees of freedom'), { target: { value: '55' } })
    expect(readout('t* · df 55')).toHaveTextContent(fmt(tStar(0.95, 55), 4))
    expect(tStar(0.95, 55) - zStar(0.95)).toBeLessThan(tStar(0.95, REFIT_DF) - zStar(0.95))
  })

  it('re-reads both critical values when the level changes', () => {
    render(<TvsNormal />)
    fireEvent.click(screen.getByRole('radio', { name: fmtPct(0.99, 0) }))
    expect(readout(`t* · df ${fmtInt(REFIT_DF)}`)).toHaveTextContent(fmt(tStar(0.99, REFIT_DF), 4))
    expect(readout('z*')).toHaveTextContent(fmt(zStar(0.99), 4))
  })

  it('simulates s in the denominator through @/lib/sim and counts the tail it produced', () => {
    render(<TvsNormal />)
    fireEvent.click(screen.getByRole('radio', { name: 'simulate s in the denominator' }))
    const stats = simulate('t-under-h0', { parent: 'normal', mu: 0, sigma: 1, n: REFIT_N, mu0: 0 }, seedFrom(T_SIM_SEED, REFIT_N, 0, 1, T_SIM_REPS), T_SIM_REPS)
    const beyond = stats.filter((v) => Math.abs(v) >= Z_95).length
    expect(readout(`fell beyond ±${fmt(Z_95, 2)}`)).toHaveTextContent(`${fmtInt(beyond)} / ${fmtInt(T_SIM_REPS)}`)
    expect(readout('that as a rate')).toHaveTextContent(fmt(beyond / T_SIM_REPS, 4))
    // The whole point of the panel: more than the normal model's 5% landed out there.
    expect(beyond / T_SIM_REPS).toBeGreaterThan(2 * normal.sf(Z_95))
  })

  it('carries a critical-value ladder as a table, with the Refit set’s row in it', () => {
    render(<TvsNormal />)
    const table = screen.getByRole('table', { name: /critical values/i })
    expect(within(table).getByText(fmt(tStar(0.95, REFIT_DF), 4))).toBeInTheDocument()
    expect(within(table).getByText(fmt(tStar(0.95, 499), 4))).toBeInTheDocument()
  })

  it('is keyboard operable and labelled', () => {
    render(<TvsNormal />)
    expect(screen.getByLabelText('degrees of freedom')).toHaveAttribute('type', 'range')
    expect(screen.getByRole('img', { name: /drawn over the standard normal/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// act-7-02 · ReactorOutputPanel
// ---------------------------------------------------------------------------------------------

describe('<ReactorOutputPanel>', () => {
  it('reports the twelve’s summary statistics from @/lib/stats', () => {
    render(<ReactorOutputPanel />)
    expect(screen.getByRole('region', { name: /post-refit reactor output/i })).toBeInTheDocument()
    expect(readout('x̄ · mean output')).toHaveTextContent(fmt(mean(refitOutputs), 3))
    expect(readout('s · sample SD')).toHaveTextContent(fmt(sd(refitOutputs), 3))
    expect(readout('n')).toHaveTextContent(fmtInt(REFIT_N))
    expect(readout('SE · s ÷ √n')).toHaveTextContent(fmt(sd(refitOutputs) / Math.sqrt(REFIT_N), 4))
  })

  it('opens against the Mk 3 specification, with every reading above it', () => {
    render(<ReactorOutputPanel />)
    expect(readout('readings at or above the line')).toHaveTextContent(`${fmtInt(REFIT_N)} / ${fmtInt(REFIT_N)}`)
    expect(readout('95% interval clears the line')).toHaveTextContent('yes')
    expect((OUTPUT_INTERVAL.ci as [number, number])[0]).toBeGreaterThan(MK3_SPEC_KN)
  })

  it('recounts when the comparison line moves past the readings', () => {
    render(<ReactorOutputPanel />)
    fireEvent.change(screen.getByLabelText('comparison line (kN)'), { target: { value: '620' } })
    const above = refitOutputs.filter((v) => v >= 620).length
    expect(readout('readings at or above the line')).toHaveTextContent(`${fmtInt(above)} / ${fmtInt(REFIT_N)}`)
    expect(readout('95% interval clears the line')).toHaveTextContent('no')
  })

  it('shows the shape check the Normal condition is argued from', () => {
    render(<ReactorOutputPanel />)
    const five = fiveNumber(refitOutputs)
    expect(readout('median')).toHaveTextContent(fmt(five.median, 1))
    expect(readout('outliers')).toHaveTextContent(fmtInt(outliers(refitOutputs).values.length))
    expect(readout('skewness G1')).toHaveTextContent(fmt(skewness(refitOutputs), 3))
    expect(outliers(refitOutputs).values).toHaveLength(0)
  })

  it('lists the yard’s twelve rows as a table', () => {
    render(<ReactorOutputPanel />)
    const table = screen.getByRole('table', { name: /twelve uprated hulls/i })
    expect(within(table).getAllByRole('row')).toHaveLength(REFIT_N + 1)
  })
})

// ---------------------------------------------------------------------------------------------
// act-7-02 · TIntervalBench
// ---------------------------------------------------------------------------------------------

describe('<TIntervalBench>', () => {
  it('opens on the Refit set’s summary statistics and rebuilds their interval', () => {
    render(<TIntervalBench />)
    expect(screen.getByRole('region', { name: /t-interval bench/i })).toBeInTheDocument()
    const xbar = Math.round(mean(refitOutputs) * 1000) / 1000
    const s = Math.round(sd(refitOutputs) * 1000) / 1000
    const built = oneMeanInterval({ mean: xbar, sd: s, n: REFIT_N }, { confidence: 0.95, random: true })
    const [lo, hi] = built.ci as [number, number]
    expect(readout(`t* · df ${fmtInt(REFIT_N - 1)}`)).toHaveTextContent(fmt(tStar(0.95, REFIT_N - 1), 4))
    expect(readout('lower endpoint')).toHaveTextContent(fmt(lo, 3))
    expect(readout('upper endpoint')).toHaveTextContent(fmt(hi, 3))
    expect(readout('margin · t* × SE')).toHaveTextContent(fmt(built.marginOfError ?? 0, 4))
    expect(readout('clears the Mk 3 specification')).toHaveTextContent('yes')
  })

  it('narrows the margin with n and widens it with C, through @/lib/stats', () => {
    render(<TIntervalBench />)
    const xbar = Math.round(mean(refitOutputs) * 1000) / 1000
    const s = Math.round(sd(refitOutputs) * 1000) / 1000
    const field = screen.getByLabelText('n · observations')
    fireEvent.change(field, { target: { value: '48' } })
    fireEvent.blur(field)
    expect(readout('margin · t* × SE')).toHaveTextContent(fmt(oneMeanInterval({ mean: xbar, sd: s, n: 48 }, { confidence: 0.95 }).marginOfError ?? 0, 4))
    fireEvent.change(screen.getByLabelText('confidence level C'), { target: { value: '99' } })
    expect(readout('margin · t* × SE')).toHaveTextContent(fmt(oneMeanInterval({ mean: xbar, sd: s, n: 48 }, { confidence: 0.99 }).marginOfError ?? 0, 4))
  })

  it('carries the builder’s working as a data table', () => {
    render(<TIntervalBench />)
    const table = screen.getByRole('table', { name: /one-sample t-interval for the mean/i })
    expect(within(table).getByText(fmt(tStar(0.95, REFIT_N - 1), 4))).toBeInTheDocument()
  })

  it('counts captures in capture mode, and z* under-delivers on the nominal level', () => {
    render(<TIntervalBench />)
    fireEvent.click(screen.getByRole('radio', { name: 'capture' }))

    const capture = (multiplier: 't' | 'z') => {
      const truth = mean(refitOutputs)
      const sigma = sd(refitOutputs)
      const r = rng(CAPTURE_SEED, 0, REFIT_N, 95, multiplier)
      let covered = 0
      for (let i = 0; i < CAPTURE_RUNS; i++) {
        const xs = Array.from({ length: REFIT_N }, () => r.normal(truth, sigma))
        const m = mean(xs)
        const crit = multiplier === 't' ? tStar(0.95, REFIT_N - 1) : zStar(0.95)
        const half = (crit * sd(xs)) / Math.sqrt(REFIT_N)
        if (m - half <= truth && truth <= m + half) covered++
      }
      return covered
    }

    expect(readout('covered · out of 100')).toHaveTextContent(`${fmtInt(capture('t'))} / ${fmtInt(CAPTURE_RUNS)}`)
    expect(readout('t* · df 11')).toHaveTextContent(fmt(tStar(0.95, REFIT_N - 1), 4))

    fireEvent.click(screen.getByRole('radio', { name: /z\* — σ pretended known/ }))
    expect(readout('covered · out of 100')).toHaveTextContent(`${fmtInt(capture('z'))} / ${fmtInt(CAPTURE_RUNS)}`)
    expect(capture('z')).toBeLessThan(capture('t'))
    expect(capture('z')).toBeLessThan(95)
  })

  it('lists every simulated run in the data-table fallback', () => {
    render(<TIntervalBench />)
    fireEvent.click(screen.getByRole('radio', { name: 'capture' }))
    const table = screen.getByRole('table', { name: /Normal population with mean/i })
    expect(within(table).getAllByRole('row')).toHaveLength(CAPTURE_RUNS + 1)
  })
})

// ---------------------------------------------------------------------------------------------
// act-7-03 · TPValueVisualiser
// ---------------------------------------------------------------------------------------------

describe('<TPValueVisualiser>', () => {
  it('defaults to the one-sample t on the nineteen and reports the test @/lib/stats returns', () => {
    render(<TPValueVisualiser />)
    expect(screen.getByRole('region', { name: /t p-value visualiser/i })).toBeInTheDocument()
    const test = oneMeanTest(lostPerrineDelays, { mu0: 0, alt: 'greater', random: true })
    expect(readout('t')).toHaveTextContent(fmt(test.statistic, 3))
    expect(readout('df')).toHaveTextContent(fmtInt(lostPerrineDelays.length - 1))
    expect(readout('p (one-sided (upper tail))')).toHaveTextContent(fmtP(test.pValue as number))
  })

  it('prints the p a normal table would have given, and it is smaller than the t one', () => {
    render(<TPValueVisualiser />)
    const test = oneMeanTest(lostPerrineDelays, { mu0: 0, alt: 'greater', random: true })
    const fromZ = pValueZ(test.statistic, 'greater')
    expect(readout('p off a standard normal table')).toHaveTextContent(fmtP(fromZ))
    expect(fromZ).toBeLessThanOrEqual(test.pValue as number)
  })

  it('doubles the tail when the alternative is switched to two-sided', () => {
    render(<TPValueVisualiser />)
    fireEvent.click(screen.getByRole('radio', { name: 'two-sided' }))
    const test = oneMeanTest(lostPerrineDelays, { mu0: 0, alt: 'greater', random: true })
    const df = lostPerrineDelays.length - 1
    expect(readout('p (two-sided)')).toHaveTextContent(fmtP(pValueT(test.statistic, df, 'two-sided')))
  })

  it('re-reads p when the observed slider moves, and resets to the observed statistic', () => {
    render(<TPValueVisualiser />)
    const df = lostPerrineDelays.length - 1
    fireEvent.change(screen.getByLabelText('observed t'), { target: { value: '1.5' } })
    expect(readout('t')).toHaveTextContent(fmt(1.5, 3))
    expect(readout('p (one-sided (upper tail))')).toHaveTextContent(fmtP(pValueT(1.5, df, 'greater')))
    fireEvent.click(screen.getByRole('button', { name: /RESET TO OBSERVED/ }))
    expect(readout('t')).toHaveTextContent(fmt(oneMeanTest(lostPerrineDelays, { mu0: 0, alt: 'greater' }).statistic, 3))
  })

  it('accepts two-sample data with a fractional Welch df, for act-7-06', () => {
    render(<TPValueVisualiser mode="two-sample" sampleA={lostPerrineDelays} sampleB={survivingPerrineDelays} alt="greater" />)
    const test = twoMeanTest(lostPerrineDelays, survivingPerrineDelays, { alt: 'greater', dfMethod: 'welch', random: true })
    expect(readout('df')).toHaveTextContent(fmt(test.df as number, 2))
    expect(readout('t')).toHaveTextContent(fmt(test.statistic, 3))
    expect(Number.isInteger(test.df)).toBe(false)
  })

  it('accepts paired data, for act-7-04', () => {
    const first = [3.1, 2.4, 5.6, 1.2, 4.4, 0.9]
    const second = [1.1, 2.0, 3.6, 1.6, 2.4, 0.2]
    render(<TPValueVisualiser mode="paired" first={first} second={second} alt="greater" />)
    expect(readout('df')).toHaveTextContent(fmtInt(first.length - 1))
  })

  it('carries the two-table comparison and a curve with an accessible name', () => {
    render(<TPValueVisualiser />)
    expect(screen.getByRole('table', { name: /read against the t distribution and against the standard normal/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Null t distribution/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// act-7-03 · PoolingExplorer
// ---------------------------------------------------------------------------------------------

describe('<PoolingExplorer>', () => {
  it('opens on the Register’s nineteen and reads the Act’s own SE and power', () => {
    render(<PoolingExplorer />)
    expect(screen.getByRole('region', { name: /pooling explorer/i })).toBeInTheDocument()
    const r = ostrowPowerAgainst(NINETEEN_N, 0.05)
    expect(readout('SE of that comparison')).toHaveTextContent(fmt(OSTROW_SE, 4))
    expect(readout('power')).toHaveTextContent(fmt(r.power, 4))
    expect(readout('β · the miss rate')).toHaveTextContent(fmt(r.beta, 4))
    expect(r.power).toBeLessThan(0.2)
  })

  it('reproduces the pooled mean and the gap the Ledger’s own columns give', () => {
    render(<PoolingExplorer />)
    const perHull = mean(lostPerrineDelays) - mean(survivingPerrineDelays)
    const expected = mean(survivingPerrineDelays) + (NINETEEN_N * perHull) / PERRINE_N
    expect(readout('expected all-Perrine mean delay')).toHaveTextContent(fmt(expected, 4))
    expect(readout('gap against the other transits')).toHaveTextContent(fmt(expected - mean(otherDelays), 4))
    // That reconstruction lands on the comparison the Act actually ran.
    expect(Math.abs(expected - mean(otherDelays) - twoMeanTest(perrineDelays, otherDelays, { alt: 'greater' }).estimate)).toBeLessThan(0.02)
  })

  it('climbs with the number of late hulls and names the count power 0.8 would need', () => {
    render(<PoolingExplorer />)
    expect(readout(`hulls needed for power ${fmt(TARGET_POWER, 1)}`)).toHaveTextContent(fmtInt(divertedCountForPower(TARGET_POWER, 0.05)))
    fireEvent.change(screen.getByLabelText('Perrine transits carrying the excess (k)'), { target: { value: '150' } })
    const r = ostrowPowerAgainst(150, 0.05)
    expect(readout('power')).toHaveTextContent(fmt(r.power, 4))
    expect(r.power).toBeGreaterThan(ostrowPowerAgainst(NINETEEN_N, 0.05).power)
  })

  it('re-prices the cutoff when α changes', () => {
    render(<PoolingExplorer />)
    fireEvent.click(screen.getByRole('radio', { name: 'α = 0.01' }))
    const r = ostrowPowerAgainst(NINETEEN_N, 0.01)
    expect(readout('gap needed before it rejects')).toHaveTextContent(fmt(r.rejectAbove, 4))
    expect(readout('power')).toHaveTextContent(fmt(r.power, 4))
    expect(r.rejectAbove).toBeCloseTo(normal.standardQuantile(0.99) * OSTROW_SE, 12)
  })

  it('carries the power ladder as a table and the curves with an accessible name', () => {
    render(<PoolingExplorer />)
    const table = screen.getByRole('table', { name: /power for a ladder of late-hull counts/i })
    expect(within(table).getByText(fmt(ostrowPowerAgainst(NINETEEN_N, 0.05).power, 3))).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /alpha, beta and power shaded/i })).toBeInTheDocument()
  })
})
