/**
 * act-6-06 / act-6-07 generator sweep. The global sweep in tests/unit/problems/all-generators.test.ts
 * runs every registered generator over 200 seeds; this file does the same for the six drills of
 * Errors and Power and the six of the Difference interval without depending on the rest of the
 * registry, and then pins the properties that make each item the item it is:
 *
 *   · every numeric answer is re-derived here from `@/lib/stats` alone, off the prompt's own numbers;
 *   · no drill reproduces the Lane's reserved counts, its z ≈ 3.16 or its p ≈ 0.0008;
 *   · the two rubrics pass their own exemplars and fail the sentences their modules exist to break;
 *   · the mission-beat rubrics — built in the MDX, so nothing else checks them — are reconstructed
 *     here with the arguments the modules pass, and graded.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import type { ChoiceAnswer, DisplaySpec, InterpretationAnswer, NumericAnswer, ProblemGenerator, ProblemInstance } from '@/lib/problems/types'
import { normal, powerZTestProportion, twoPropInterval, zStar } from '@/lib/stats'
import { fmt } from '@/lib/stats/format'
import { chooseAlpha, errorConsequences, powerDrivers, powerNotOneMinusAlpha, powerValue, typeIandII, typeIandIIRubric } from './power'
import { differenceConditions, differenceInterpretation, differenceIntervalRubric, differenceMargin, intervalContainsZero, orderOfSubtraction, twoPropIntervalDrill } from './difference'
import {
  DIFFERENCE_INTERVAL,
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_HOLDINGS,
  PERRINE_LOSSES,
  PERRINE_TEST,
  PERRINE_TRANSITS,
} from '@/instruments/act-6/data'

const POWER = [typeIandII, powerValue, powerDrivers, powerNotOneMinusAlpha, errorConsequences, chooseAlpha]
const DIFFERENCE = [twoPropIntervalDrill, differenceInterpretation, differenceConditions, intervalContainsZero, orderOfSubtraction, differenceMargin]
const ALL: ProblemGenerator[] = [...POWER, ...DIFFERENCE]

const SEEDS = 200

/**
 * The Lane's own headline counts. A drill that prints one of these as a whole number has borrowed a
 * mission beat; the lookarounds keep 0.0900 and 1,712-as-part-of-a-longer-number out of it.
 */
const RESERVED_TEXT = [/(?<![\d.,])2,?612(?![\d.])/, /(?<![\d.,])1,?712(?![\d.])/, /(?<![\d.,])900(?![\d.])/, /(?<![\d.,])0\.0008(?![\d])/]

function allText(p: ProblemInstance): string {
  const a = p.answer
  const options = a.type === 'choice' || a.type === 'multi' ? a.options : []
  const feedback = (a.type === 'choice' || a.type === 'multi' ? (a.feedback ?? []) : []).filter((f): f is string => !!f)
  return [p.prompt, p.solution, ...p.hints, ...options, ...feedback].join('\n')
}

function tableRows(spec: DisplaySpec | undefined): (string | number)[][] {
  if (!spec || spec.kind !== 'table') throw new Error('expected a table DisplaySpec on this instance')
  return spec.rows
}

const num = (v: string | number): number => (typeof v === 'number' ? v : Number(String(v).replace(/,/g, '')))

describe('act-6-06 / act-6-07 drill generators', () => {
  it('registers the twelve ids the two modules and the checkpoint name', () => {
    expect(ALL.map((g) => g.id).sort()).toEqual(
      [
        'act-6/type-i-ii',
        'act-6/power-value',
        'act-6/power-drivers',
        'act-6/power-not-one-minus-alpha',
        'act-6/error-consequences',
        'act-6/choose-alpha',
        'act-6/two-prop-interval',
        'act-6/difference-interpretation',
        'act-6/difference-conditions',
        'act-6/interval-contains-zero',
        'act-6/order-of-subtraction',
        'act-6/difference-margin',
      ].sort(),
    )
    for (const g of ALL) expect(g.ap_topics.length, g.id).toBeGreaterThan(0)
  })

  for (const g of ALL) {
    it(`${g.id} · ${SEEDS} seeds validate, and never quote the Lane's own numbers`, () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const p = g.generate(new Rng(seed))
        expect(validateInstance(p), `${g.id} seed ${seed}`).toEqual([])
        const text = allText(p)
        for (const reserved of RESERVED_TEXT) expect(text, `${g.id} seed ${seed} quotes ${reserved.source}`).not.toMatch(reserved)
      }
    })
  }

  it('no numeric drill answer reproduces the Lane’s z ≈ 3.16 or its p ≈ 0.0008', () => {
    for (const g of ALL) {
      for (let seed = 0; seed < SEEDS; seed++) {
        const a = g.generate(new Rng(seed)).answer
        if (a.type !== 'numeric') continue
        expect(Math.abs(a.value - PERRINE_TEST.statistic), `${g.id} seed ${seed}`).toBeGreaterThan(0.01)
        expect(Math.abs(a.value - PERRINE_TEST.pValue!), `${g.id} seed ${seed}`).toBeGreaterThan(0.0001)
      }
    }
  })

  it('act-6/two-prop-interval never lands on the Lane’s own interval endpoints', () => {
    const [lo, hi] = DIFFERENCE_INTERVAL.ci as [number, number]
    for (let seed = 0; seed < SEEDS; seed++) {
      const value = (twoPropIntervalDrill.generate(new Rng(seed)).answer as NumericAnswer).value
      expect(Math.abs(value - lo), `seed ${seed}`).toBeGreaterThan(0.0005)
      expect(Math.abs(value - hi), `seed ${seed}`).toBeGreaterThan(0.0005)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Numeric answers, re-derived from @/lib/stats off the prompt's own numbers
// ---------------------------------------------------------------------------------------------

describe('act-6/power-value agrees with @/lib/stats recomputed from scratch', () => {
  it('matches powerZTestProportion in the one-sample case and the two library pieces in the two-sample case', () => {
    let oneSample = 0
    let twoSample = 0
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = powerValue.generate(new Rng(seed))
      const value = (p.answer as NumericAnswer).value
      const alpha = Number(/alpha = ([\d.]+)\$/.exec(p.prompt)![1])
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(1)

      const one = /posts the .*? at ([\d.]+) and is planning an audit of ([\d,]+)/.exec(p.prompt)
      if (one) {
        oneSample++
        const p0 = Number(one[1])
        const n = num(one[2])
        const pA = Number(/specific alternative \$p = ([\d.]+)\$/.exec(p.prompt)![1])
        expect(value, `seed ${seed}`).toBeCloseTo(powerZTestProportion({ p0, pA, n, alpha, alt: 'greater' }).power, 12)
        continue
      }

      twoSample++
      const [, n1s, n2s] = /: ([\d,]+) [a-z]+ handled one way against ([\d,]+) handled/.exec(p.prompt)!
      const [, p1s, p2s] = /a true rate of ([\d.]+) in the first group against ([\d.]+) in the second/.exec(p.prompt)!
      const n1 = num(n1s)
      const n2 = num(n2s)
      const p1 = Number(p1s)
      const p2 = Number(p2s)
      const pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
      const se0 = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
      const seA = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
      const cutoff = normal.standardQuantile(1 - alpha) * se0
      expect(value, `seed ${seed}`).toBeCloseTo(normal.sf((cutoff - (p1 - p2)) / seA), 12)
    }
    expect(oneSample).toBeGreaterThan(20)
    expect(twoSample).toBeGreaterThan(20)
  })

  it('never answers 1 − α, which is the misconception the item is built around', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = powerValue.generate(new Rng(seed))
      const alpha = Number(/alpha = ([\d.]+)\$/.exec(p.prompt)![1])
      expect(Math.abs((p.answer as NumericAnswer).value - (1 - alpha)), `seed ${seed}`).toBeGreaterThan(0.01)
    }
  })
})

describe('act-6/two-prop-interval agrees with twoPropInterval recomputed from the prompt’s table', () => {
  it('returns the lower endpoint of the unpooled interval, and never the pooled one', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = twoPropIntervalDrill.generate(new Rng(seed))
      const rows = tableRows(p.data)
      const [, x1, n1] = rows[0].map(num)
      const [, x2, n2] = rows[1].map(num)
      const confidence = Number(/\*\*(\d+)% confidence interval/.exec(p.prompt)![1]) / 100
      const expected = twoPropInterval({ x1, n1, x2, n2, confidence, random: true }).ci as [number, number]
      expect((p.answer as NumericAnswer).value, `seed ${seed}`).toBeCloseTo(expected[0], 12)

      // The pooled SE would give a different interval; the drill must not be using it.
      const pooled = (x1 + x2) / (n1 + n2)
      const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
      expect(sePooled).not.toBeCloseTo(twoPropInterval({ x1, n1, x2, n2, confidence, random: true }).se, 6)
    }
  })
})

describe('act-6/difference-margin agrees with @/lib/stats in both of its variants', () => {
  it('returns z*·SE, or the quadrupled sample that halves it', () => {
    let margins = 0
    let sizes = 0
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = differenceMargin.generate(new Rng(seed))
      const rows = tableRows(p.data)
      const [, x1, n1] = rows[0].map(num)
      const [, x2, n2] = rows[1].map(num)
      const confidence = Number(/(\d+)%/.exec(p.prompt)![1]) / 100
      const interval = twoPropInterval({ x1, n1, x2, n2, confidence, random: true })
      const value = (p.answer as NumericAnswer).value
      if (/margin of error of the/.test(p.prompt)) {
        margins++
        expect(value, `seed ${seed}`).toBeCloseTo(zStar(confidence) * interval.se, 12)
        expect(value, `seed ${seed}`).toBeCloseTo(interval.marginOfError!, 12)
      } else {
        sizes++
        expect(value, `seed ${seed}`).toBe(4 * n1)
        const scaled = twoPropInterval({ x1: x1 * 4, n1: n1 * 4, x2: x2 * 4, n2: n2 * 4, confidence, random: true })
        expect(scaled.marginOfError!).toBeCloseTo(interval.marginOfError! / 2, 10)
      }
    }
    expect(margins).toBeGreaterThan(20)
    expect(sizes).toBeGreaterThan(20)
  })
})

describe('the choice items each have exactly one defensible option', () => {
  for (const g of [powerDrivers, powerNotOneMinusAlpha, errorConsequences, chooseAlpha, intervalContainsZero, orderOfSubtraction]) {
    it(`${g.id} · one null feedback entry, at the correct index`, () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const a = g.generate(new Rng(seed)).answer as ChoiceAnswer
        expect(a.options, `${g.id} seed ${seed}`).toHaveLength(4)
        expect(a.feedback?.filter((f) => f === null), `${g.id} seed ${seed}`).toHaveLength(1)
        expect(a.feedback?.[a.correct], `${g.id} seed ${seed}`).toBeNull()
      }
    })
  }

  it('act-6/power-drivers reaches all three drivers and both directions over 200 seeds', () => {
    const directions = new Set<string>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = powerDrivers.generate(new Rng(seed))
      const a = p.answer as ChoiceAnswer
      directions.add(a.options[a.correct].slice(0, 11))
    }
    expect(directions).toEqual(new Set(['Power rises', 'Power falls']))
  })
})

// ---------------------------------------------------------------------------------------------
// The two rubrics
// ---------------------------------------------------------------------------------------------

describe('act-6/type-i-ii', () => {
  const rubric = typeIandII.generate(new Rng(4)).answer as InterpretationAnswer

  it('passes its own exemplar on every one of 200 seeds', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const r = typeIandII.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(r, r.exemplar).correct, `seed ${seed}`).toBe(true)
    }
  })

  it('fails a response that defines the two errors but prices neither', () => {
    const r = gradeInterpretation(
      rubric,
      'A Type I error is rejecting a true null hypothesis and a Type II error is failing to reject a false null hypothesis, which are the two ways a significance test can come out wrong even when it is run exactly as written down beforehand.',
    )
    expect(r.correct).toBe(false)
    expect(r.feedback).toMatch(/Prices the Type I error|Prices the Type II error/)
  })

  it('rejects “a Type I error is always the worse error”', () => {
    const r = gradeInterpretation(rubric, `${rubric.exemplar} A Type I error is always the worse error of the two, whatever the situation, because a false accusation can never be taken back.`)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /always the worse/.test(f.label))).toBe(true)
  })

  it('rejects treating a Type II error as evidence that H₀ is true', () => {
    const r = gradeInterpretation(rubric, `${rubric.exemplar} A Type II error means the null hypothesis is true and the office was right not to act.`)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.length).toBeGreaterThan(0)
  })

  it('rejects “accept H₀”', () => {
    const r = gradeInterpretation(rubric, `${rubric.exemplar} If the test does not reject, the office should accept the null hypothesis and close the file.`)
    expect(r.correct).toBe(false)
  })
})

describe('act-6/difference-interpretation', () => {
  it('passes its own exemplar on every one of 200 seeds', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const r = differenceInterpretation.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(r, r.exemplar).correct, `seed ${seed}`).toBe(true)
    }
  })

  it('fails a sentence that omits the order of subtraction', () => {
    for (const seed of [3, 17, 41]) {
      const r = differenceInterpretation.generate(new Rng(seed)).answer as InterpretationAnswer
      const withoutOrder = r.exemplar.replace(/ — .*? minus .*? —/, '')
      expect(withoutOrder).not.toMatch(/minus/)
      expect(gradeInterpretation(r, withoutOrder).correct, `seed ${seed}`).toBe(false)
    }
  })

  it('fails a probability statement about this interval, and a sample-statistic reading', () => {
    const r = differenceInterpretation.generate(new Rng(9)).answer as InterpretationAnswer
    expect(gradeInterpretation(r, r.exemplar.replace('confident', 'sure').replace('We are', 'There is a probability of')).correct).toBe(false)
    expect(gradeInterpretation(r, r.exemplar.replace('the true difference', 'the sample difference').replace(/\btrue\b/g, 'sample')).correct).toBe(false)
  })
})

describe('act-6/difference-conditions', () => {
  it('passes its own exemplar and names the four observed counts', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = differenceConditions.generate(new Rng(seed))
      const r = p.answer as InterpretationAnswer
      expect(gradeInterpretation(r, r.exemplar).correct, `seed ${seed}`).toBe(true)
      const rows = tableRows(p.data)
      const [, x1, fail1] = rows[0].map(num)
      const [, x2, fail2] = rows[1].map(num)
      for (const c of [x1, fail1, x2, fail2]) expect(c, `seed ${seed}`).toBeGreaterThanOrEqual(10)
      expect(r.exemplar).toContain(String(x1))
      expect(r.exemplar).toContain(String(x2))
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The mission-beat rubrics, reconstructed with the arguments the MDX passes
// ---------------------------------------------------------------------------------------------

describe('mission-beat rubrics (act-6-06-errors, act-6-07-interpret)', () => {
  const errorsRubric = typeIandIIRubric({
    nullInWords: 'Perrine-beneficiary hulls and every other hull on the Lane are lost at the same rate',
    altInWords: 'Perrine-beneficiary hulls are lost at a higher rate',
    typeIConsequence: 'this ship accuses an insurer and a pension fund of something that is not happening, the finding lands on a Martian adjuster’s desk as a Service scandal, and the officer who signed it does not command again',
    typeIIConsequence: 'the diversions go on, and the next nineteen hulls are lost the way the first nineteen were',
    parameter: 'loss rate per transit',
    population: 'transits on the Hundred-Day Lane',
  })

  const [lo, hi] = DIFFERENCE_INTERVAL.ci as [number, number]
  const intervalRubric = differenceIntervalRubric({
    level: 0.95,
    lower: lo,
    upper: hi,
    group1: PERRINE_HOLDINGS,
    group2: 'all other beneficiaries',
    key1: 'perrine',
    key2: 'other beneficiaries',
    variable: 'loss rate per transit',
    population: 'transits on the Hundred-Day Lane',
  })

  it('act-6-06’s error rubric passes its own exemplar', () => {
    expect(gradeInterpretation(errorsRubric, errorsRubric.exemplar).correct).toBe(true)
  })

  it('act-6-06’s error rubric rejects the two sentences the module exists to break', () => {
    expect(gradeInterpretation(errorsRubric, `${errorsRubric.exemplar} A Type I error is always the worse error, so alpha should be as small as possible.`).correct).toBe(false)
    expect(gradeInterpretation(errorsRubric, `${errorsRubric.exemplar} A Type II error means the null hypothesis is true.`).correct).toBe(false)
  })

  it('act-6-07’s interval rubric passes its own exemplar and carries the endpoints the Act files', () => {
    expect(gradeInterpretation(intervalRubric, intervalRubric.exemplar).correct).toBe(true)
    expect(intervalRubric.exemplar).toContain(fmt(lo, 4))
    expect(intervalRubric.exemplar).toContain(fmt(hi, 4))
    // The clue act-6-07 earns: between 0.4 and 2.4 percentage points more per transit.
    expect(lo * 100).toBeCloseTo(0.4, 1)
    expect(hi * 100).toBeCloseTo(2.4, 1)
  })

  it('act-6-07’s interval rubric rejects a reversed sign and “the rates are equal”', () => {
    const reversed = `We are 95% confident that the true difference in the loss rate per transit — all other beneficiaries minus Perrine Holdings — for all transits on the Hundred-Day Lane is between ${fmt(lo, 4)} and ${fmt(hi, 4)}.`
    const r = gradeInterpretation(intervalRubric, reversed)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /reversed/i.test(f.label))).toBe(true)

    const equal = gradeInterpretation(intervalRubric, `${intervalRubric.exemplar} In other words the two rates are equal.`)
    expect(equal.correct).toBe(false)
  })

  it('the Act’s own interval is the one the beat will grade against', () => {
    const rebuilt = twoPropInterval({ x1: PERRINE_LOSSES, n1: PERRINE_TRANSITS, x2: OTHER_LOSSES, n2: OTHER_TRANSITS, confidence: 0.95, random: true })
    expect(rebuilt.ci![0]).toBeCloseTo(lo, 12)
    expect(rebuilt.ci![1]).toBeCloseTo(hi, 12)
    expect(lo).toBeGreaterThan(0)
  })
})
