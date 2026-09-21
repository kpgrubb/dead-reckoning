/**
 * Act IV rubric templates: every exemplar passes its own rubric, a good learner sentence passes, and
 * the named Act IV misconception fails.
 */
import { describe, expect, it } from 'vitest'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { binomialSurpriseInterpretation, conditionalInContext, geometricMeanInterpretation, independenceInContext, sdOfSumInterpretation, simulatedProbabilityInterpretation } from './_rubrics'

describe('simulatedProbabilityInterpretation', () => {
  const a = simulatedProbabilityInterpretation({
    estimate: 175 / 10000,
    count: 175,
    runs: 10000,
    event: 'a 30-day cluster of five or more losses',
    model: '31 loss dates scattered at random over the Register',
  })
  it('exemplar passes', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })
  it('accepts a complete learner sentence', () => {
    const good = 'In 175 of 10000 simulated runs, 31 loss dates scattered at random over the Register produced a 30-day cluster of five or more losses — a simulated probability of 0.018.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
  })
  it('rejects a bare probability reported as exact', () => {
    const bad = 'The probability of a 30-day cluster of five or more losses under random dates is exactly 0.018.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label.includes('exact'))).toBe(true)
  })
  it('rejects an answer with no run size', () => {
    const bad = 'About 2 percent of the time, 31 loss dates scattered at random produce a 30-day cluster of five or more losses.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.rubric?.find((g) => g.label.startsWith('Gives the run size'))?.met).toBe(false)
  })
})

describe('conditionalInContext', () => {
  const a = conditionalInContext({
    value: 19 / 119,
    event: 'losses',
    given: 'gradual transponder fades',
    reversedValue: 19 / 31,
    reversedPhrase: 'the share of losses that faded gradually',
    digits: 3,
  })
  it('exemplar passes', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })
  it('accepts a learner sentence that names both directions', () => {
    const good = 'Of the gradual transponder fades on the Register, 16 percent were losses. That is not the share of losses that faded gradually, which is 61 percent — a different denominator.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
  })
  it('fails an answer that does not distinguish the reversal', () => {
    const bad = 'Sixteen percent of gradual transponder fades were losses.'
    expect(gradeInterpretation(a, bad).correct).toBe(false)
  })
})

describe('independenceInContext', () => {
  const a = independenceInContext({
    independent: false,
    eventA: 'loss',
    eventB: 'Perrine ownership',
    conditional: 19 / 900,
    marginal: 31 / 2612,
    file: "the Transit Ledger's 2,612 transits",
  })
  it('exemplar passes', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })
  it('accepts a scoped learner verdict', () => {
    const good =
      'In the Transit Ledger, P(loss | Perrine ownership) is 0.0211 against a marginal P(loss) of 0.0119, so the two differ and loss and Perrine ownership do not appear independent in this file.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
  })
  it('rejects the mutually-exclusive confusion and a causal claim', () => {
    const exclusive = 'P(loss | Perrine ownership) is 0.0211 and P(loss) is 0.0119, so in this ledger loss and Perrine ownership are not independent — they are mutually exclusive.'
    const r1 = gradeInterpretation(a, exclusive)
    expect(r1.correct).toBe(false)
    expect(r1.forbidden?.some((f) => f.label.includes('mutually exclusive'))).toBe(true)
    const causal = 'In this ledger P(loss | Perrine ownership) is 0.0211 against P(loss) 0.0119, so being a Perrine hull causes a loss.'
    const r2 = gradeInterpretation(a, causal)
    expect(r2.correct).toBe(false)
    expect(r2.forbidden?.some((f) => f.label.includes('causation'))).toBe(true)
  })
})

describe('sdOfSumInterpretation', () => {
  const a = sdOfSumInterpretation({ sd: Math.sqrt(386), naiveSum: 42, total: 'the total Watch-profile load', units: 'kW', mean: 320 })
  it('exemplar passes', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })
  it('accepts a learner sentence that names the variance rule', () => {
    const good =
      'The total Watch-profile load typically varies by about 19.6 kW from its mean of 320 kW, because variances add and the total SD is the square root of the sum of the six variances — not the 42 kW you get by adding the standard deviations.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
  })
  it('rejects the SD read as a bound', () => {
    const bad = 'The total Watch-profile load typically varies from the mean, and all loads are within 19.6 kW of 320 kW; variances add, so the SD is the square root of the sum.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label.includes('bound'))).toBe(true)
  })
})

describe('binomialSurpriseInterpretation', () => {
  const a = binomialSurpriseInterpretation({
    observed: 31,
    mean: 13.161,
    sd: 3.619,
    tail: 0.0000184,
    p: 13 / 2580,
    surprising: true,
    context: 'losses in 2,612 Lane transits',
    baseline: 'the 2176 Asgard report',
  })
  it('exemplar passes', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })
  it('accepts a tail-based verdict that names the baseline', () => {
    const good =
      'Under the 2176 Asgard report, a rate of 0.50 percent, losses in 2,612 Lane transits average 13.2 with an SD of 3.6. Thirty-one is 4.9 SD above that, and the chance of 31 or more is under 0.0001, so it is surprising under that baseline.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
  })
  it('fails the point-probability argument', () => {
    const bad = 'Under the 2176 Asgard report the mean is 13.2 and the SD 3.6, and the chance of getting 31 losses is tiny, so it is surprising.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.rubric?.find((g) => g.label.startsWith('Judges surprise'))?.met).toBe(false)
  })
})

describe('geometricMeanInterpretation', () => {
  const a = geometricMeanInterpretation({ meanTrials: 50, p: 0.02, trial: 'Perrine passage', success: 'diversion', pBeyondMean: 0.364 })
  it('exemplar passes', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })
  it('accepts a long-run reading', () => {
    const good =
      'If a diversion happens on 2 percent of Perrine passages, the first diversion takes 50 Perrine passages on average over many repetitions. That is a long-run average, not a forecast: 36 percent of waits run longer than 50.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
  })
  it('rejects treating the mean as a forecast', () => {
    const bad = 'On average over many repeats the first diversion will take exactly 50 Perrine passages.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label.includes('forecast'))).toBe(true)
  })
})
