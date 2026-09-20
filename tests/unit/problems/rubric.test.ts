import { describe, expect, it } from 'vitest'
import { contentWords, contextGroup, gradeInterpretation, matches, normalizeText, numberPattern, numberRegex, phraseTokens, stem, tokenize } from '@/lib/problems/rubric'
import {
  conditionsCheck,
  confidenceIntervalInterpretation,
  correlationDescription,
  expectedValueInterpretation,
  rSquaredInterpretation,
  residualInterpretation,
  rubricTemplates,
  samplingBiasIdentification,
  significanceTestConclusion,
  slopeInterpretation,
  standardDeviationInterpretation,
} from '@/lib/problems/rubrics'
import type { InterpretationAnswer } from '@/lib/problems/types'

// ---------------------------------------------------------------------------------------------
// Engine primitives
// ---------------------------------------------------------------------------------------------

describe('normalizeText', () => {
  it('maps symbols, notation and negation idioms', () => {
    expect(normalizeText('p < 0.05')).toBe('pvalue less 0.05')
    expect(normalizeText('H₀ vs Hₐ')).toBe('null vs alt')
    expect(normalizeText('reject H0; accept Ha')).toBe('reject null ; accept alt')
    expect(normalizeText("we don't reject")).toBe('we not reject')
    expect(normalizeText('fail to reject the null hypothesis')).toBe('not reject the null')
    expect(normalizeText('insufficient evidence')).toBe('not enough evidence')
    expect(normalizeText('95% confident')).toBe('95 percent confident')
    expect(normalizeText('α = 0.05')).toBe('alpha equal 0.05')
    expect(normalizeText('−3.1 kg')).toBe('-3.1 kg')
    expect(normalizeText('1,234 ships')).toBe('1234 ships')
    expect(normalizeText('r² = 0.64')).toBe('rsquared equal 0.64')
    expect(normalizeText('the standard deviation')).toBe('the sd')
    expect(normalizeText('for each additional hour')).toBe('perunit hour')
  })
})

describe('stem', () => {
  it('handles plurals, -ing, -ed, -ly and trailing e consistently', () => {
    expect(stem('rejected')).toBe(stem('reject'))
    expect(stem('rejecting')).toBe(stem('rejects'))
    expect(stem('freighters')).toBe(stem('freighter'))
    expect(stem('varies')).toBe('vary')
    expect(stem('estimated')).toBe(stem('estimate'))
    expect(stem('typically')).toBe('typical')
    expect(stem('running')).toBe('run')
    expect(stem('hypotheses')).toBe('hypothesis')
    expect(stem('bias')).toBe('bias')
    expect(stem('less')).toBe('less')
  })
})

describe('tokenize', () => {
  it('canonicalizes synonyms and drops stopwords', () => {
    expect(phraseTokens('the data suggest a higher mean')).toEqual(['data', 'evidence', 'greater', 'mean'])
    expect(phraseTokens('We reject the null hypothesis.')).toEqual(['reject', 'null'])
    expect(phraseTokens('on average')).toEqual(['mean'])
    expect(phraseTokens('10 percent')).toEqual(['ten', 'percent'])
  })
  it('marks negation scope and stops at clause and scope boundaries', () => {
    const t = tokenize('We do not have convincing evidence that the mean is greater than 40.')
    const byText = Object.fromEntries(t.tokens.map((k) => [k.t, k.negated]))
    expect(byText.evidence).toBe(true)
    expect(byText.convincing).toBe(true)
    expect(byText.greater).toBe(false) // after "that"
    const u = tokenize('Not significant. We reject nothing.')
    const reject = u.tokens.find((k) => k.t === 'reject')!
    expect(reject.negated).toBe(false) // new sentence
    expect(u.tokens.find((k) => k.t === 'significant')!.negated).toBe(true)
  })
})

describe('phrase matching', () => {
  it('matches in-order tokens with gaps, within a clause', () => {
    expect(matches('we reject the null hypothesis', 'reject null')).toBe(true)
    expect(matches('we reject, with confidence, the null', 'reject null')).toBe(false) // clause boundary
    expect(matches('reject the weak tired old small null', 'reject null')).toBe(false) // gap > 3
    expect(matches('reject the weak old null', 'reject null')).toBe(true)
  })
  it('is negation-aware: "do not reject" does not satisfy "reject"', () => {
    expect(matches('we do not reject H0', 'reject')).toBe(false)
    expect(matches('we fail to reject H0', 'reject')).toBe(false)
    expect(matches('we cannot reject H0', 'reject')).toBe(false)
    expect(matches("we don't reject the null", 'reject')).toBe(false)
    expect(matches('we fail to reject H0', 'not reject')).toBe(true)
    expect(matches('we do not have enough evidence to reject H0', 'not reject')).toBe(true)
    expect(matches('we do not have enough evidence to reject H0', 'reject')).toBe(false)
    expect(matches('we reject H0', 'reject')).toBe(true)
    expect(matches('we reject H0', 'not reject')).toBe(false)
    expect(matches('there is no convincing evidence', 'evidence')).toBe(false)
    expect(matches('there is no convincing evidence', 'not evidence')).toBe(true)
    expect(matches('insufficient evidence', 'not enough evidence')).toBe(true)
    expect(matches('the result is not statistically significant', 'significant')).toBe(false)
    expect(matches('the result is not statistically significant', 'not significant')).toBe(true)
  })
  it('polarity "any" ignores negation', () => {
    expect(matches('we do not reject H0', 'reject', 'any')).toBe(true)
  })
  it('RegExp phrasings test the normalized text', () => {
    expect(matches('p < 0.05', /pvalue less 0\.05/)).toBe(true)
  })
})

describe('numberPattern', () => {
  it('accepts rounding slack but never a rendering that rounds the value away', () => {
    expect(numberRegex(0.0123, 4, 2).test('0.012')).toBe(true)
    expect(numberRegex(0.0123, 4, 2).test('.0123')).toBe(true)
    expect(numberRegex(0.0123, 4, 2).test('0.01230')).toBe(true)
    expect(numberRegex(0.0123, 4, 2).test('0.0223')).toBe(false)
    expect(numberRegex(0.003, 4, 2).test('0.00')).toBe(false)
    expect(numberRegex(0.003, 4, 2).test('0')).toBe(false)
    expect(numberRegex(12.4, 1, 1).test('is 12.4 hours')).toBe(true)
    expect(numberRegex(12.4, 1, 1).test('is 112.4 hours')).toBe(false)
    expect(numberRegex(12.4, 1, 1).test('is 12.45 hours')).toBe(false)
    expect(numberRegex(-3.1, 1, 1).test('-3.1')).toBe(true)
    expect(numberPattern(95, 0, 1)).toContain('95')
  })
})

describe('contextGroup', () => {
  it('requires content words from the context', () => {
    const g = contextGroup('ctx', ['freighters on the Callisto corridor', 'transit time'])
    expect(contentWords('freighters on the Callisto corridor')).toEqual(['freighter', 'callisto', 'corridor'])
    expect(g.minMatches).toBe(2)
    const a: InterpretationAnswer = { type: 'interpretation', required: [g], exemplar: 'x' }
    expect(gradeInterpretation(a, 'the corridor freighters').correct).toBe(true)
    expect(gradeInterpretation(a, 'the freighters').correct).toBe(false)
  })
})

describe('gradeInterpretation scoring', () => {
  const a: InterpretationAnswer = {
    type: 'interpretation',
    required: [
      { label: 'A', phrasings: ['reject'], weight: 2 },
      { label: 'B', phrasings: ['evidence'] },
      { label: 'C', phrasings: ['bonus'], optional: true },
    ],
    forbidden: [{ phrase: 'prove', why: 'no proofs', label: 'Proof' }],
    exemplar: 'we reject; evidence; bonus',
  }
  it('weights groups, ignores optional groups for correctness, caps forbidden at 0.5', () => {
    expect(gradeInterpretation(a, 'we reject and have evidence')).toMatchObject({ correct: true, score: 1 })
    expect(gradeInterpretation(a, 'we reject and have evidence').feedback).toMatch(/Could also mention: c/)
    expect(gradeInterpretation(a, 'we reject')).toMatchObject({ correct: false, score: 0.667 })
    expect(gradeInterpretation(a, 'evidence')).toMatchObject({ correct: false, score: 0.333 })
    const f = gradeInterpretation(a, 'we reject; this proves it; evidence')
    expect(f.correct).toBe(false)
    expect(f.score).toBe(0.5)
    expect(f.forbidden).toEqual([{ label: 'Proof', why: 'no proofs' }])
    expect(f.feedback).toMatch(/no proofs/)
  })
  it('passScore allows partial-credit correctness', () => {
    expect(gradeInterpretation({ ...a, passScore: 0.6 }, 'we reject').correct).toBe(true)
  })
  it('enforces minWords and reports rubric anyway', () => {
    const r = gradeInterpretation({ ...a, minWords: 5 }, 'reject')
    expect(r.correct).toBe(false)
    expect(r.score).toBe(0)
    expect(r.rubric?.[0].met).toBe(true)
  })
  it('legacy string forbidden phrases get a default explanation', () => {
    const r = gradeInterpretation({ type: 'interpretation', required: [{ label: 'A', phrasings: ['x'] }], forbidden: ['prove'], exemplar: 'x' }, 'x proves y')
    expect(r.forbidden?.[0].why).toMatch(/never prove/)
  })
})

// ---------------------------------------------------------------------------------------------
// Realistic learner responses against the templates
// ---------------------------------------------------------------------------------------------

type Expect = { correct: true } | { correct: false; forbidden?: string; missing?: string[]; minScore?: number; maxScore?: number }

function check(answer: InterpretationAnswer, response: string, want: Expect) {
  const r = gradeInterpretation(answer, response)
  const detail = () => JSON.stringify({ response, feedback: r.feedback, rubric: r.rubric?.map((g) => `${g.met ? '✓' : '✗'} ${g.label}`), forbidden: r.forbidden }, null, 1)
  expect(r.correct, detail()).toBe(want.correct)
  if (!want.correct) {
    if (want.forbidden) expect(r.forbidden?.map((f) => f.label).join(' | '), detail()).toContain(want.forbidden)
    else expect(r.forbidden, detail()).toBeUndefined()
    for (const m of want.missing ?? []) expect(r.rubric?.find((g) => g.label.includes(m))?.met, detail()).toBe(false)
    if (want.minScore !== undefined) expect(r.score, detail()).toBeGreaterThanOrEqual(want.minScore)
    if (want.maxScore !== undefined) expect(r.score, detail()).toBeLessThanOrEqual(want.maxScore)
  }
}

describe('every template exemplar passes its own rubric', () => {
  const samples: InterpretationAnswer[] = [
    confidenceIntervalInterpretation({ level: 0.95, parameter: 'mean', lower: 10.2, upper: 12.4, context: { population: 'freighters on the Callisto corridor', variable: 'transit time', units: 'hours' } }),
    confidenceIntervalInterpretation({ level: 90, parameter: 'proportion', lower: 0.081, upper: 0.152, context: { population: 'corridor transits', variable: 'ending in a loss' }, digits: 3 }),
    significanceTestConclusion({ pValue: 0.0123, alpha: 0.05, direction: 'greater', parameterContext: { parameter: 'mean', population: 'freighters on the corridor', variable: 'transit time', units: 'hours', nullValue: 40 } }),
    significanceTestConclusion({ pValue: 0.21, alpha: 0.05, direction: 'two-sided', parameterContext: { parameter: 'proportion', population: 'independent haulers', variable: 'losses', nullValue: 0.05 } }),
    significanceTestConclusion({ pValue: 0.00002, alpha: 0.01, direction: 'less', parameterContext: { parameter: 'mean difference', population: 'refitted corvettes', variable: 'reactor output', nullValue: 0 } }),
    slopeInterpretation({ slope: 0.42, xVar: 'declared cargo mass', yVar: 'fuel burn', xUnits: 'tonne', yUnits: 'kg' }),
    slopeInterpretation({ slope: -1.8, xVar: 'hull age', yVar: 'sensor gain', yUnits: 'dB' }),
    rSquaredInterpretation({ r2: 0.64, xVar: 'declared cargo mass', yVar: 'fuel burn' }),
    rSquaredInterpretation({ r2: 37.5, xVar: 'burn duration', yVar: 'radiator temperature' }),
    correlationDescription({ r: 0.83, xVar: 'declared cargo mass', yVar: 'fuel burn' }),
    correlationDescription({ r: -0.45, xVar: 'hull age', yVar: 'sensor gain' }),
    correlationDescription({ r: 0.12, xVar: 'crew size', yVar: 'transit time' }),
    residualInterpretation({ residual: -3.1, yVar: 'fuel burn', yUnits: 'kg', xVar: 'cargo mass', xValue: 120 }),
    residualInterpretation({ residual: 2.05, yVar: 'transit time', yUnits: 'hours' }),
    standardDeviationInterpretation({ sd: 2.4, variable: 'transit time', units: 'hours', population: 'corridor freighters', mean: 31.6 }),
    expectedValueInterpretation({ value: 3.2, variable: 'heat-sink capacity burned', units: 'units', context: 'cold-running patrols' }),
    samplingBiasIdentification({ biasType: 'voluntary response', mechanism: 'Only crews angry enough to file a complaint sent in the survey', direction: 'over', parameter: 'proportion of crews reporting harassment', population: 'all corridor freighter crews' }),
    samplingBiasIdentification({ biasType: 'undercoverage', mechanism: 'Independent haulers never appear in the Admiralty registry the sample was drawn from', direction: 'under', parameter: 'loss rate', population: 'all corridor traffic' }),
    samplingBiasIdentification({ biasType: 'nonresponse', mechanism: 'Half the crews contacted never returned the questionnaire', parameter: 'mean transit time', population: 'corridor freighters' }),
    conditionsCheck({ procedure: 'one-prop-z', n: 40, counts: [{ successes: 24, failures: 16 }], populationSize: 5000, context: 'corridor freighters' }),
    conditionsCheck({ procedure: 'one-mean-t', n: 35, normal: 'clt', context: 'transit logs' }),
    conditionsCheck({ procedure: 'one-mean-t', n: 12, normal: 'graph' }),
    conditionsCheck({ procedure: 'two-mean-t', n: [18, 20], normal: 'stated', random: 'assignment' }),
    conditionsCheck({ procedure: 'chi-square', n: 120, minExpected: 6.25 }),
    conditionsCheck({ procedure: 'slope-t', n: 25 }),
  ]
  samples.forEach((a, i) => {
    it(`exemplar ${i}: ${a.exemplar.slice(0, 60)}…`, () => {
      const r = gradeInterpretation(a, a.exemplar)
      expect(r.correct, JSON.stringify({ exemplar: a.exemplar, feedback: r.feedback, rubric: r.rubric, forbidden: r.forbidden }, null, 1)).toBe(true)
    })
  })
  it('exports all ten templates', () => {
    expect(Object.keys(rubricTemplates)).toHaveLength(10)
  })
})

describe('significanceTestConclusion — learner responses', () => {
  const ctx = { parameter: 'mean', population: 'freighters on the Callisto corridor', variable: 'transit time', units: 'hours', nullValue: 40 }
  const reject = significanceTestConclusion({ pValue: 0.0123, alpha: 0.05, direction: 'greater', parameterContext: ctx, directionWords: ['longer', 'slower'] })
  const fail = significanceTestConclusion({ pValue: 0.21, alpha: 0.05, direction: 'greater', parameterContext: ctx, directionWords: ['longer'] })

  it('1 full-credit formal conclusion', () =>
    check(reject, 'Because the p-value of 0.0123 is less than α = 0.05, we reject H0. There is convincing evidence that the true mean transit time of freighters on the corridor is greater than 40 hours.', { correct: true }))
  it('2 full-credit informal phrasing (suggest / exceeds / the null)', () =>
    check(reject, 'p = 0.012 < 0.05 so reject the null. The data suggest the mean transit time for corridor freighters exceeds 40 hours.', { correct: true }))
  it('3 missing context', () => check(reject, 'Since p < 0.05 we reject H0 and conclude the mean is greater than 40.', { correct: false, missing: ['context'], minScore: 0.7 }))
  it('4 wrong decision (fails to reject when p < α)', () =>
    check(reject, 'The p-value is 0.0123, which is greater than 0.05, so we fail to reject H0. There is not enough evidence that the mean transit time is greater than 40 hours.', { correct: false, forbidden: 'Fails to reject' }))
  it('5 "proves"', () => check(reject, 'p < 0.05, reject H0. This proves that freighters on the corridor take longer than 40 hours on average.', { correct: false, forbidden: 'Claims proof' }))
  it('6 "accept H0"', () => check(fail, 'Since p = 0.21 > 0.05 we accept H0; the mean transit time of corridor freighters is 40 hours.', { correct: false, forbidden: 'Accepts H₀' }))
  it('7 full-credit fail-to-reject', () =>
    check(fail, 'The p-value (0.21) is greater than α = 0.05, so we fail to reject H0. We do not have convincing evidence that the true mean transit time of corridor freighters is greater than 40 hours.', { correct: true }))
  it('8 full-credit "do not reject" / "no evidence"', () =>
    check(fail, "p = 0.21 is not less than 0.05. Do not reject the null hypothesis; there is no evidence the corridor freighters' mean transit time exceeds 40 hours.", { correct: true }))
  it('9 wrong decision (rejects when p ≥ α)', () => check(fail, 'p = 0.21 > 0.05, so we reject H0; there is evidence the corridor freighters have a longer mean transit time than 40 hours.', { correct: false, forbidden: 'Rejects H₀' }))
  it('10 "probability the null is true"', () =>
    check(reject, 'p = 0.0123 means there is a 1.23% probability that the null hypothesis is true, so we reject it and conclude corridor freighters have a mean transit time greater than 40 hours.', { correct: false, forbidden: 'Probability that H₀ is true' }))
  it('11 negation inside the comparison does not break the direction group', () =>
    check(reject, 'We reject H0 because the p-value 0.0123 is not greater than 0.05. There is convincing evidence that the mean transit time of corridor freighters is greater than 40 hours.', { correct: true }))
  it('12 empty response', () => check(reject, '', { correct: false, maxScore: 0 }))
  it('13 one-word response fails minWords', () => check(reject, 'Reject.', { correct: false, maxScore: 0 }))
  it('14 decision without evidence framing is partial', () =>
    check(reject, 'p = 0.0123 < 0.05. Reject H0. The mean transit time of corridor freighters is greater than 40 hours.', { correct: false, missing: ['evidence'], minScore: 0.8 }))
  it('15 fail case stated only as insufficient evidence still counts as the decision', () =>
    check(fail, 'With p = 0.21 above α = 0.05 there is insufficient evidence to conclude that the mean transit time of freighters on the corridor is longer than 40 hours.', { correct: true }))
  it('16 tiny p-value written as an inequality', () => {
    const tiny = significanceTestConclusion({ pValue: 0.00002, alpha: 0.05, direction: 'greater', parameterContext: ctx })
    check(tiny, 'Because p < 0.0001 is far below α = 0.05 we reject H0; there is convincing evidence that the true mean transit time of corridor freighters is greater than 40 hours.', { correct: true })
  })
})

describe('confidenceIntervalInterpretation — learner responses', () => {
  const ci = confidenceIntervalInterpretation({ level: 0.95, parameter: 'mean', lower: 10.2, upper: 12.4, context: { population: 'freighters on the Callisto corridor', variable: 'transit time', units: 'hours' } })
  it('17 textbook interpretation', () => check(ci, 'We are 95% confident that the true mean transit time of all freighters on the Callisto corridor is between 10.2 and 12.4 hours.', { correct: true }))
  it('18 "captures" phrasing', () =>
    check(ci, 'We can be 95 percent confident the interval from 10.2 to 12.4 hours captures the population mean transit time for corridor freighters.', { correct: true }))
  it('19 probability statement about the interval', () => check(ci, 'There is a 95% probability that the true mean transit time of corridor freighters is between 10.2 and 12.4 hours.', { correct: false, forbidden: 'Probability statement' }))
  it('20 "95% of the freighters"', () => check(ci, '95% of freighters on the corridor have transit times between 10.2 and 12.4 hours.', { correct: false, forbidden: '95% of the individuals' }))
  it('21 missing parameter/population and context', () => check(ci, 'We are 95% confident that the mean is between 10.2 and 12.4.', { correct: false, missing: ['population parameter', 'context'], minScore: 0.5 }))
  it('22 interval about the sample mean', () => check(ci, 'We are 95% confident that the sample mean transit time of corridor freighters is between 10.2 and 12.4 hours.', { correct: false, forbidden: 'sample statistic' }))
  it('23 "95% likely"', () => check(ci, 'It is 95% likely that the true mean transit time of corridor freighters lies between 10.2 and 12.4 hours.', { correct: false, forbidden: 'Probability statement' }))
})

describe('regression templates — learner responses', () => {
  const slope = slopeInterpretation({ slope: 0.42, xVar: 'declared cargo mass', yVar: 'fuel burn', xUnits: 'tonne', yUnits: 'kg' })
  it('24 slope full credit', () => check(slope, 'For each additional tonne of declared cargo mass, the predicted fuel burn increases by about 0.42 kg.', { correct: true }))
  it('25 slope "per tonne" phrasing', () => check(slope, 'Fuel burn is predicted to increase by 0.42 kg per tonne of cargo mass.', { correct: true }))
  it('26 slope causal claim', () => check(slope, 'Each extra tonne of cargo causes fuel burn to go up by 0.42 kg.', { correct: false, forbidden: 'Claims causation' }))
  it('27 slope missing "predicted"', () => check(slope, 'Fuel burn goes up 0.42 kg for every tonne of cargo mass.', { correct: false, missing: ['predicted'], minScore: 0.7 }))

  const r2 = rSquaredInterpretation({ r2: 0.64, xVar: 'declared cargo mass', yVar: 'fuel burn' })
  it('28 r² full credit', () => check(r2, 'About 64% of the variation in fuel burn is explained by the linear relationship with declared cargo mass.', { correct: true }))
  it('29 r² as percent of points', () => check(r2, '64% of the data points fall on the regression line for fuel burn vs cargo mass.', { correct: false, forbidden: 'Percent of the data points' }))
  it('30 r² without "variation"', () => check(r2, 'r² = 0.64 means the model explains 64% of fuel burn from cargo mass.', { correct: false, missing: ['Variation'], minScore: 0.7 }))

  const corr = correlationDescription({ r: 0.83, xVar: 'declared cargo mass', yVar: 'fuel burn' })
  it('31 correlation full credit', () => check(corr, 'There is a strong positive linear association between declared cargo mass and fuel burn.', { correct: true }))
  it('32 correlation wrong direction', () => check(corr, 'There is a strong negative linear relationship between cargo mass and fuel burn.', { correct: false, forbidden: 'Wrong direction' }))
  it('33 correlation missing form', () => check(corr, 'Cargo mass and fuel burn have a strong positive correlation (r = 0.83).', { correct: false, missing: ['Form'], minScore: 0.75 }))

  const resid = residualInterpretation({ residual: -3.1, yVar: 'fuel burn', yUnits: 'kg', xVar: 'cargo mass', xValue: 120 })
  it('34 residual full credit', () => check(resid, 'The residual is −3.1 kg: the actual fuel burn was 3.1 kg less than the line predicted, so the model overestimates this freighter.', { correct: true }))
  it('35 residual wrong direction', () => check(resid, 'The residual of -3.1 means the actual fuel burn was 3.1 kg more than predicted.', { correct: false, missing: ['Direction'] }))
  it('36 residual "underestimates" on a negative residual', () => check(resid, 'Residual −3.1 kg; the model underestimates fuel burn here.', { correct: false, forbidden: 'Wrong direction' }))
})

describe('one-variable, probability and collecting-data templates — learner responses', () => {
  const sd = standardDeviationInterpretation({ sd: 2.4, variable: 'transit time', units: 'hours', population: 'corridor freighters', mean: 31.6 })
  it('37 sd full credit', () => check(sd, 'The transit times of corridor freighters typically vary by about 2.4 hours from the mean of 31.6 hours.', { correct: true }))
  it('38 sd "on average … differs from the mean"', () => check(sd, "On average, a freighter's transit time differs from the mean transit time by roughly 2.4 hours.", { correct: true }))
  it('39 sd as a bound', () => check(sd, 'All transit times are within 2.4 hours of the mean.', { correct: false, forbidden: 'Treats the SD as a bound' }))
  it('40 sd without the mean', () => check(sd, 'Transit times typically vary by about 2.4 hours.', { correct: false, missing: ['References the mean'], minScore: 0.7 }))

  const ev = expectedValueInterpretation({ value: 3.2, variable: 'heat-sink capacity burned', units: 'units', context: 'cold-running patrols' })
  it('41 expected value full credit', () => check(ev, 'Over many cold-running patrols, the heat-sink capacity burned would average about 3.2 units per patrol.', { correct: true }))
  it('42 expected value "if repeated many times"', () => check(ev, 'If this patrol were repeated many times, the mean heat-sink capacity burned per cold-running patrol would be about 3.2 units.', { correct: true }))
  it('43 expected value deterministic claim', () => check(ev, 'Each patrol will burn exactly 3.2 units of heat-sink capacity.', { correct: false, forbidden: 'Deterministic claim' }))
  it('44 expected value without long-run language', () => check(ev, 'The expected heat-sink capacity burned on cold-running patrols is 3.2 units.', { correct: false, missing: ['Long-run'], minScore: 0.7 }))

  const bias = samplingBiasIdentification({ biasType: 'voluntary response', mechanism: 'Only crews angry enough to file a complaint sent in the survey', direction: 'over', parameter: 'proportion of crews reporting harassment', population: 'all corridor freighter crews' })
  it('45 bias full credit', () =>
    check(bias, 'This is voluntary response bias: only crews angry enough to file a complaint sent in the survey, so the sample overrepresents unhappy crews and overestimates the proportion of all crews reporting harassment.', { correct: true }))
  it('46 bias wrong direction', () => check(bias, 'Voluntary response bias — angry crews who filed a complaint answered, so the survey underestimates the proportion of crews reporting harassment.', { correct: false, forbidden: 'Wrong direction' }))
  it('47 bias type only', () => check(bias, 'This is voluntary response bias, so the proportion of crews reporting harassment is off.', { correct: false, missing: ['mechanism'], maxScore: 0.6 }))

  const cond = conditionsCheck({ procedure: 'one-prop-z', n: 40, counts: [{ successes: 24, failures: 16 }], populationSize: 5000, context: 'corridor freighters' })
  it('48 conditions full credit', () =>
    check(cond, 'Random: the 40 freighters were a random sample. Independent: 10 × 40 = 400 < 5000 freighters, so the 10% condition is met. Large Counts: 24 successes and 16 failures are both at least 10, so the sampling distribution is approximately Normal.', { correct: true }))
  it('49 conditions missing Large Counts', () => check(cond, 'Random sample of freighters; 400 is less than 5000 so independence is fine.', { correct: false, missing: ['Large Counts'], minScore: 0.6 }))
  it('50 conditions with "not random" is not credited as random', () => check(cond, 'The freighters were not randomly chosen; 400 < 5000; 24 and 16 are both ≥ 10.', { correct: false, missing: ['Random'] }))
})
