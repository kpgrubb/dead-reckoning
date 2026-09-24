/**
 * act-7-01 / act-7-02 / act-7-03 generator sweep. The global sweep in
 * tests/unit/problems/all-generators.test.ts runs every registered generator over 200 seeds; this
 * file does the same for the eighteen drills of Twelve Is a Margin, Reactor Output and Within a Day
 * without depending on the rest of the registry, and then pins the properties that make each item
 * the item it is:
 *
 *   · no drill ever borrows the Act's own numbers (the twelve hulls, 588 kN, the nineteen, 900/1,712);
 *   · every choice item has exactly one defensible option;
 *   · the two interpretation rubrics pass their exemplars and fail the sentences the beats forbid;
 *   · the numeric answers agree with `@/lib/stats` recomputed from scratch.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { contextGroup, gradeInterpretation, numberRegex } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import type { ChoiceAnswer, DisplayAnswer, InterpretationAnswer, NumericAnswer, ProblemGenerator } from '@/lib/problems/types'
import { fmt, fmtInt, fmtPct, marginOfErrorMean, mean, normal, oneMeanInterval, pValueT, sampleSizeForMean, tStar, zStar } from '@/lib/stats'
import { NINETEEN_EXCESS_DILUTED, NINETEEN_N, OSTROW_POWER, OSTROW_SE, OTHER_N, PERRINE_N, lostPerrineDelays, survivingPerrineDelays } from '@/instruments/act-7/data'
import { dfAndConditions, smallSampleNormality, tCriticalValue, tTailProbability, tVsZMargin, whyT } from './t-distribution'
import { intervalJustifiesClaim, intervalWidthDrivers, marginOfErrorForMean, meanIntervalInterpretation, sampleSizeForMargin, tIntervalEndpoint } from './reactor-output'
import { interpretPValueMean, poolingTrap, powerOfAComparison, tTestConclusion, tTestSetup, tTestStatistic } from './within-a-day'

const T_DISTRIBUTION = [whyT, tCriticalValue, tTailProbability, dfAndConditions, tVsZMargin, smallSampleNormality]
const REACTOR = [tIntervalEndpoint, meanIntervalInterpretation, sampleSizeForMargin, intervalJustifiesClaim, intervalWidthDrivers, marginOfErrorForMean]
const WITHIN = [tTestSetup, tTestStatistic, tTestConclusion, interpretPValueMean, poolingTrap, powerOfAComparison]
const ALL: ProblemGenerator[] = [...T_DISTRIBUTION, ...REACTOR, ...WITHIN]

const SEEDS = 200

/**
 * The Act's own headline counts. A drill that prints one of these as a whole number has borrowed a
 * mission beat. The lookarounds keep an endpoint like 0.2612 out of it.
 */
const RESERVED = [/(?<![\d.,])588(?![\d.])/, /(?<![\d.,])2,?612(?![\d.])/, /(?<![\d.,])1,?712(?![\d.])/, /(?<![\d.,])900(?![\d.])/, /(?<![\d.,])881(?![\d.])/]

describe('act-7 drill generators', () => {
  it('registers the eighteen ids the modules and the checkpoint name', () => {
    expect(ALL.map((g) => g.id).sort()).toEqual(
      [
        'act-7/df-and-conditions',
        'act-7/interpret-p-value-mean',
        'act-7/interval-justifies-claim',
        'act-7/interval-width-drivers',
        'act-7/margin-of-error-mean',
        'act-7/mean-interval-interpretation',
        'act-7/pooling-trap',
        'act-7/power-of-a-comparison',
        'act-7/sample-size-for-margin',
        'act-7/small-sample-normality',
        'act-7/t-critical-value',
        'act-7/t-interval-endpoint',
        'act-7/t-tail-probability',
        'act-7/t-test-conclusion',
        'act-7/t-test-setup',
        'act-7/t-test-statistic',
        'act-7/t-vs-z-margin',
        'act-7/why-t',
      ].sort(),
    )
    for (const g of ALL) {
      expect(g.ap_topics.length, g.id).toBeGreaterThan(0)
      expect(g.label, g.id).toBeTruthy()
    }
  })

  for (const g of ALL) {
    it(`${g.id} · ${SEEDS} seeds validate, with a finite answer and no borrowed numbers`, () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const p = g.generate(new Rng(seed))
        expect(validateInstance(p), `${g.id} seed ${seed}`).toEqual([])
        const a = p.answer.type === 'display' ? (p.answer as DisplayAnswer).question : p.answer
        if (a.type === 'numeric') expect(Number.isFinite(a.value), `${g.id} seed ${seed}`).toBe(true)
        const text = [p.prompt, p.solution, ...(a.type === 'choice' ? a.options : [])].join('\n')
        for (const reserved of RESERVED) expect(text, `${g.id} seed ${seed} quotes ${reserved.source}`).not.toMatch(reserved)
      }
    })
  }

  it('every choice item offers exactly one defensible option', () => {
    for (const g of ALL) {
      for (let seed = 0; seed < 60; seed++) {
        const p = g.generate(new Rng(seed))
        const a = p.answer.type === 'display' ? (p.answer as DisplayAnswer).question : p.answer
        if (a.type !== 'choice') continue
        const choice = a as ChoiceAnswer
        expect(choice.options, `${g.id} seed ${seed}`).toHaveLength(4)
        expect(choice.feedback?.filter((f) => f === null), `${g.id} seed ${seed}`).toHaveLength(1)
        expect(choice.feedback?.[choice.correct], `${g.id} seed ${seed}`).toBeNull()
      }
    }
  })
})

// ---------------------------------------------------------------------------------------------
// act-7-01
// ---------------------------------------------------------------------------------------------

describe('act-7/t-critical-value', () => {
  it('returns tStar at the level and df the prompt states, and it exceeds z*', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = tCriticalValue.generate(new Rng(seed))
      const level = Number(/\*\*(\d+)%\*\*/.exec(p.prompt)?.[1]) / 100
      const n = Number(/\*\*(\d+)\*\*/.exec(p.prompt.replace(/\*\*\d+%\*\*/, ''))?.[1])
      expect(Number.isFinite(level) && Number.isFinite(n), `seed ${seed}`).toBe(true)
      const value = (p.answer as NumericAnswer).value
      expect(value).toBeCloseTo(tStar(level, n - 1), 12)
      expect(value).toBeGreaterThan(zStar(level))
    }
  })
})

describe('act-7/t-tail-probability', () => {
  it('is a t tail area, always larger than the normal one at the same statistic', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = tTailProbability.generate(new Rng(seed))
      const value = (p.answer as NumericAnswer).value
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(0.5)
      const stat = Number(/\*\*(−?[\d.]+)\*\*/.exec(p.prompt)?.[1]?.replace('−', '-'))
      const df = Number(/\*\*(\d+)\*\* degrees of freedom/.exec(p.prompt)?.[1])
      expect(Number.isFinite(stat) && Number.isFinite(df), `seed ${seed}`).toBe(true)
      const oneSided = pValueT(stat, df, 'greater')
      expect(value === oneSided || Math.abs(value - 2 * oneSided) < 1e-12, `seed ${seed}`).toBe(true)
      expect(value).toBeGreaterThan(value === oneSided ? normal.sf(stat) : 2 * normal.sf(stat))
    }
  })
})

describe('act-7/t-vs-z-margin', () => {
  it('is the percentage by which t* exceeds z*, and is always positive', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = tVsZMargin.generate(new Rng(seed))
      const level = Number(/\*\*(\d+)%\*\*/.exec(p.prompt)?.[1]) / 100
      const n = Number(/\*\*(\d+)\*\*/.exec(p.prompt)?.[1])
      const value = (p.answer as NumericAnswer).value
      expect(value).toBeGreaterThan(0)
      expect(value).toBeCloseTo((tStar(level, n - 1) / zStar(level) - 1) * 100, 10)
    }
  })
})

describe('act-7/small-sample-normality', () => {
  it('always shows a dotplot, and reaches both verdicts over 200 seeds', () => {
    const verdicts = new Set<boolean>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = smallSampleNormality.generate(new Rng(seed))
      const a = p.answer as DisplayAnswer
      expect(a.display.kind).toBe('dotplot')
      const choice = a.question as ChoiceAnswer
      verdicts.add(choice.options[choice.correct].startsWith('Yes'))
    }
    expect(verdicts.size).toBe(2)
  })
})

describe('act-7/df-and-conditions', () => {
  it('passes its exemplar and fails an answer that leans on the central limit theorem alone', () => {
    for (const seed of [3, 21, 77]) {
      const rubric = dfAndConditions.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(rubric, rubric.exemplar).correct).toBe(true)
      const bad = 'The sample is large so the central limit theorem applies and the sampling distribution of the mean is approximately Normal.'
      expect(gradeInterpretation(rubric, bad).correct).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// act-7-02
// ---------------------------------------------------------------------------------------------

describe('act-7/t-interval-endpoint', () => {
  it('matches oneMeanInterval rebuilt from the prompt’s own summary statistics', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = tIntervalEndpoint.generate(new Rng(seed))
      const level = Number(/\*\*(\d+)%\*\*/.exec(p.prompt)?.[1]) / 100
      const xbar = Number(/\\bar\{x\} = (−?[\d.]+)/.exec(p.prompt)?.[1]?.replace('−', '-'))
      const s = Number(/ s = ([\d.]+)/.exec(p.prompt)?.[1])
      const n = Number(/ n = (\d+)/.exec(p.prompt)?.[1])
      expect([level, xbar, s, n].every(Number.isFinite), `seed ${seed}`).toBe(true)
      const [lo, hi] = oneMeanInterval({ mean: xbar, sd: s, n }, { confidence: level, random: true }).ci as [number, number]
      const value = (p.answer as NumericAnswer).value
      expect(value === lo || value === hi, `seed ${seed}`).toBe(true)
    }
  })
})

describe('act-7/sample-size-for-margin', () => {
  it('is a whole number and matches sampleSizeForMean', () => {
    for (let seed = 0; seed < 60; seed++) {
      const value = (sampleSizeForMargin.generate(new Rng(seed)).answer as NumericAnswer).value
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThan(1)
    }
    expect(sampleSizeForMean({ moe: 2, confidence: 0.95, sigma: 7 })).toBe(Math.ceil(((zStar(0.95) * 7) / 2) ** 2 - 1e-9))
  })
})

describe('act-7/margin-of-error-mean', () => {
  it('is t* times s over root n, never z* times it', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = marginOfErrorForMean.generate(new Rng(seed))
      const level = Number(/\*\*(\d+)%\*\*/.exec(p.prompt)?.[1]) / 100
      const s = Number(/s = ([\d.]+)\\ /.exec(p.prompt)?.[1])
      const n = Number(/\*\*(\d+)\*\*/.exec(p.prompt.replace(/\*\*\d+%\*\*/, ''))?.[1])
      expect([level, s, n].every(Number.isFinite), `seed ${seed}`).toBe(true)
      const value = (p.answer as NumericAnswer).value
      expect(value).toBeCloseTo(marginOfErrorMean(s, n, level), 12)
      expect(value).toBeGreaterThan((zStar(level) * s) / Math.sqrt(n))
    }
  })
})

describe('act-7/mean-interval-interpretation', () => {
  it('passes its exemplar and rejects the "95% of the individuals" reading', () => {
    for (const seed of [2, 19, 64]) {
      const rubric = meanIntervalInterpretation.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(rubric, rubric.exemplar).correct).toBe(true)
      const bad = rubric.exemplar.replace('the true mean', 'the sample mean').replace('confident', 'sure')
      expect(gradeInterpretation(rubric, bad).correct).toBe(false)
    }
  })
})

describe('act-7/interval-justifies-claim', () => {
  it('never makes "only the upper figure" the answer, and reaches both defensible verdicts', () => {
    const verdicts = new Set<string>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const a = intervalJustifiesClaim.generate(new Rng(seed)).answer as ChoiceAnswer
      const text = a.options[a.correct]
      expect(text.startsWith('Only the upper figure')).toBe(false)
      expect(text.startsWith('Neither')).toBe(false)
      verdicts.add(text.slice(0, 10))
    }
    expect(verdicts.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------------------------
// act-7-03
// ---------------------------------------------------------------------------------------------

describe('act-7/t-test-statistic', () => {
  it('answers either the statistic or its p-value, and both are reachable', () => {
    const kinds = new Set<string>()
    for (let seed = 0; seed < 60; seed++) {
      const p = tTestStatistic.generate(new Rng(seed))
      const a = p.answer as NumericAnswer
      kinds.add(String(a.kind))
      expect(Number.isFinite(a.value)).toBe(true)
      if (a.kind === 'pValue') {
        expect(a.value).toBeGreaterThan(0)
        expect(a.value).toBeLessThan(1)
      }
    }
    expect(kinds).toEqual(new Set(['testStat', 'pValue']))
  })
})

describe('act-7/t-test-conclusion', () => {
  it('passes its exemplar and rejects "accept H₀" and the opposite decision', () => {
    for (const seed of [4, 31, 90]) {
      const rubric = tTestConclusion.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(rubric, rubric.exemplar).correct).toBe(true)
      const flipped = rubric.exemplar.includes('we reject') ? rubric.exemplar.replace('we reject', 'we accept') : rubric.exemplar.replace('we fail to reject', 'we accept')
      expect(gradeInterpretation(rubric, flipped).correct).toBe(false)
    }
  })
})

describe('act-7/interpret-p-value-mean', () => {
  it('passes its exemplar', () => {
    for (const seed of [5, 44, 123]) {
      const rubric = interpretPValueMean.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(rubric, rubric.exemplar).correct).toBe(true)
    }
  })

  it('fails the sentence that prices the null hypothesis', () => {
    const rubric = interpretPValueMean.generate(new Rng(5)).answer as InterpretationAnswer
    const r = gradeInterpretation(rubric, 'The p-value is the probability that the null hypothesis is true, given the sample of readings this office collected at random this quarter.')
    expect(r.correct).toBe(false)
    expect(r.forbidden?.length).toBeGreaterThan(0)
  })

  it('fails "the result was due to chance"', () => {
    const rubric = interpretPValueMean.generate(new Rng(5)).answer as InterpretationAnswer
    const r = gradeInterpretation(rubric, 'It is the probability that the difference we observed in this sample was due to chance rather than to anything real about the population.')
    expect(r.correct).toBe(false)
  })
})

describe('act-7/pooling-trap', () => {
  it('is the honest mean plus the excess scaled by the late subset’s share', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = poolingTrap.generate(new Rng(seed))
      const total = Number(/\*\*([\d,]+)\*\*/.exec(p.prompt)?.[1]?.replace(/,/g, ''))
      const nums = [...p.prompt.matchAll(/\*\*(−?[\d.,]+)/g)].map((m) => Number(m[1].replace(/,/g, '').replace('−', '-')))
      const [, k, excess, honest] = nums
      expect([total, k, excess, honest].every(Number.isFinite), `seed ${seed}`).toBe(true)
      expect((p.answer as NumericAnswer).value).toBeCloseTo(honest + (k * excess) / total, 10)
      // The dilution is always smaller than the excess it hides, and by a lot.
      expect(Math.abs((k * excess) / total)).toBeLessThan(Math.abs(excess) * 0.1)
    }
  })
})

/**
 * act-7-03's Type II beat builds its rubric in the MDX rather than through a generator, so nothing
 * else checks that its exemplar passes. This reconstructs it with the arguments the module passes.
 */
describe('mission-beat rubric (act-7-03-typeii)', () => {
  const perHull = mean(lostPerrineDelays) - mean(survivingPerrineDelays)
  const rubric: InterpretationAnswer = {
    type: 'interpretation',
    minWords: 35,
    required: [
      {
        label: 'Says the excess was diluted across the fleet',
        phrasings: ['diluted', 'averaged into', 'spread across', 'divided by', 'share of', numberRegex(NINETEEN_EXCESS_DILUTED, 3, 1)],
        polarity: 'any',
      },
      { label: 'Cites the standard error of the comparison', phrasings: ['standard error', numberRegex(OSTROW_SE, 3, 1)], polarity: 'any' },
      {
        label: 'Names the power or the miss rate',
        phrasings: ['power', 'beta', 'type ii', 'type 2', 'miss', numberRegex(OSTROW_POWER.power, 3, 1), numberRegex(OSTROW_POWER.beta, 3, 1)],
        polarity: 'any',
      },
      {
        label: 'Says failing to detect is not evidence of absence',
        phrasings: [/\bnot evidence\b/, /\bnot mean\b/, 'not evidence absence', 'not rule out', 'cannot rule out', 'not establish'],
        polarity: 'any',
      },
      contextGroup('Names the transits and the delay', ['Perrine transits on the Hundred-Day Lane', 'mean Mark-9 delay against the filed plot']),
    ],
    forbidden: [
      { phrase: /\b(?:his|the board's|ostrow's) (?:analysis|arithmetic|number|figure|calculation) (?:is|was) wrong\b/, label: 'Calls his arithmetic wrong', why: 'His arithmetic is correct.' },
      { phrase: /\bproves?\b/, label: 'Proof language', why: 'A power calculation proves nothing about whether the effect is there.' },
    ],
    exemplar: `Ostrow's comparison is arithmetically right and could not have found the nineteen. Their excess of about ${fmt(perHull, 2)} days is carried by ${fmtInt(NINETEEN_N)} hulls out of ${fmtInt(PERRINE_N)}, so averaged into all ${fmtInt(PERRINE_N)} Perrine transits on the Hundred-Day Lane it reaches the mean Mark-9 delay as only ${fmt(NINETEEN_EXCESS_DILUTED, 3)} days, while the standard error of his comparison against the other ${fmtInt(OTHER_N)} transits is ${fmt(OSTROW_SE, 3)} days. Against an effect that small the test has power ${fmt(OSTROW_POWER.power, 3)}, so it fails to reject about ${fmtPct(OSTROW_POWER.beta, 0)} of the time: that is a Type II error, and its silence is not evidence that the diverted hulls are absent.`,
  }

  it('passes its own exemplar', () => {
    const r = gradeInterpretation(rubric, rubric.exemplar)
    expect(r.rubric?.filter((g) => !g.met).map((g) => g.label) ?? []).toEqual([])
    expect(r.correct).toBe(true)
  })

  it('fails the answer that agrees with him', () => {
    const r = gradeInterpretation(
      rubric,
      'The mean delay of the Perrine transits on the Hundred-Day Lane sits within a day of the mean delay of every other hull on the corridor, so the Board is right that the transit-time record shows nothing unusual about that tonnage.',
    )
    expect(r.correct).toBe(false)
  })

  it('fails an answer that calls his arithmetic wrong', () => {
    const r = gradeInterpretation(
      rubric,
      `His analysis is wrong: the excess was diluted to ${fmt(NINETEEN_EXCESS_DILUTED, 3)} days against a standard error of ${fmt(OSTROW_SE, 3)} days, so the power was only ${fmt(OSTROW_POWER.power, 3)} and the Perrine transits on the Hundred-Day Lane were never going to show a mean Mark-9 delay he could detect, which is not evidence of absence.`,
    )
    expect(r.correct).toBe(false)
    expect(r.forbidden?.length).toBeGreaterThan(0)
  })

  it('carries the three numbers the beat asks for', () => {
    expect(rubric.exemplar).toContain(fmt(NINETEEN_EXCESS_DILUTED, 3))
    expect(rubric.exemplar).toContain(fmt(OSTROW_SE, 3))
    expect(rubric.exemplar).toContain(fmt(OSTROW_POWER.power, 3))
    expect(OSTROW_POWER.power).toBeLessThan(0.2)
  })
})

describe('act-7/power-of-a-comparison', () => {
  it('is a probability, and equals the normal tail beyond the rejection cutoff', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = powerOfAComparison.generate(new Rng(seed))
      const alpha = Number(/alpha = ([\d.]+)/.exec(p.prompt)?.[1])
      const se = Number(/\*\*([\d.]+) /.exec(p.prompt)?.[1])
      const effect = Number(/true difference is \*\*([\d.]+)/.exec(p.prompt)?.[1])
      expect([alpha, se, effect].every(Number.isFinite), `seed ${seed}`).toBe(true)
      const cutoff = normal.standardQuantile(1 - alpha) * se
      const value = (p.answer as NumericAnswer).value
      expect(value).toBeCloseTo(normal.sf((cutoff - effect) / se), 10)
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(1)
    }
  })
})
