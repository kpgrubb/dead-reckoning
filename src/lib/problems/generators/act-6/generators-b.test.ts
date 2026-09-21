/**
 * act-6-05 generator sweep ("Strike the Word"). The global sweep in
 * tests/unit/problems/all-generators.test.ts runs every registered generator over 200 seeds; this
 * file does the same for the six conclusion drills without depending on the rest of the registry,
 * and then pins the properties that make each item the item it is:
 *
 *   · no drill ever borrows the Lane's own numbers (19/900, 12/1,712, 31/2,612, z ≈ 3.16, p ≈ 0.0008);
 *   · every interpretation exemplar passes its own rubric, and fails when "proves" or "accept H₀"
 *     is spliced into it;
 *   · every decision in every item agrees with `reject(p, α)` recomputed from `@/lib/stats`;
 *   · the α-flip answer is the p-value itself, or the smallest conventional level above it;
 *   · the duality item's interval and two-sided test always agree, recomputed from scratch.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import type { ChoiceAnswer, InterpretationAnswer, NumericAnswer, ProblemGenerator } from '@/lib/problems/types'
import { onePropInterval, onePropTest, reject } from '@/lib/stats'
import { PERRINE_TEST } from '@/instruments/act-6/data'
import { AGENCY_FORBIDDEN, alphaFlip, ciTestDuality, conclusionDefects, conclusionInContextRubric, decisionFromP, failToReject, testConclusion } from './conclusion'

const ALL: ProblemGenerator[] = [testConclusion, failToReject, decisionFromP, alphaFlip, ciTestDuality, conclusionDefects]
const SEEDS = 200

/** The Lane's own counts. A drill that prints one of these has borrowed a mission beat. */
const RESERVED = [
  /(?<![\d.,])2,?612(?![\d.])/,
  /(?<![\d.,])1,?712(?![\d.])/,
  /(?<![\d.,])900(?![\d.])/,
  /(?<![\d.,])2,?580(?![\d.])/,
]

function textOf(p: { prompt: string; solution: string; answer: { type: string } }): string {
  const a = p.answer as { type: string; options?: string[]; exemplar?: string }
  return [p.prompt, p.solution, ...(a.options ?? []), a.exemplar ?? ''].join('\n')
}

describe('act-6-05 conclusion drills', () => {
  it('registers exactly the six ids the module and the checkpoint name', () => {
    expect(ALL.map((g) => g.id).sort()).toEqual(
      ['act-6/alpha-flip', 'act-6/ci-test-duality', 'act-6/conclusion-defects', 'act-6/decision-from-p', 'act-6/fail-to-reject', 'act-6/test-conclusion'].sort(),
    )
    // The Act VI checkpoint's q8 names this one by id.
    expect(ALL.some((g) => g.id === 'act-6/test-conclusion')).toBe(true)
    for (const g of ALL) expect(g.ap_topics, g.id).toContain('6.6')
  })

  for (const g of ALL) {
    it(`${g.id} · ${SEEDS} seeds validate, and never quote the Lane's own numbers`, () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const p = g.generate(new Rng(seed))
        expect(validateInstance(p), `${g.id} seed ${seed}`).toEqual([])
        const text = textOf(p)
        for (const r of RESERVED) expect(text, `${g.id} seed ${seed} quotes ${r.source}`).not.toMatch(r)
        // Nor the Lane's statistic or p-value, to the precision either is ever printed at.
        expect(text, `${g.id} seed ${seed} leaks the Lane statistic`).not.toMatch(/z = 3\.1[56]/)
        expect(text, `${g.id} seed ${seed} leaks the Lane p-value`).not.toMatch(/(?<![\d.])0\.0008(?!\d)/)
      }
    })
  }
})

// ---------------------------------------------------------------------------------------------
// The two interpretation drills
// ---------------------------------------------------------------------------------------------

describe('act-6/test-conclusion', () => {
  it('always draws a rejecting case, and the exemplar passes its own rubric', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const rubric = testConclusion.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(rubric, rubric.exemplar).correct, `seed ${seed}`).toBe(true)
      expect(rubric.exemplar).toMatch(/we reject/i)
      expect(rubric.exemplar).toMatch(/convincing evidence/i)
    }
  })

  it("the prompt's P and α always satisfy reject(p, α) recomputed from @/lib/stats", () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = testConclusion.generate(new Rng(seed))
      const [, pStr] = /\$P = ([\d.]+)\$/.exec(p.prompt) ?? []
      const [, aStr] = /\\alpha = ([\d.]+)\$ in its review plan/.exec(p.prompt) ?? []
      expect(pStr, `seed ${seed}`).toBeTruthy()
      expect(aStr, `seed ${seed}`).toBeTruthy()
      expect(reject(Number(pStr), Number(aStr)), `seed ${seed}`).toBe(true)
    }
  })

  it('fails the same sentence once "proves" is spliced into it', () => {
    const rubric = testConclusion.generate(new Rng(11)).answer as InterpretationAnswer
    const bad = rubric.exemplar.replace('There is convincing evidence that', 'This proves that')
    const r = gradeInterpretation(rubric, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /proof/i.test(f.label))).toBe(true)
  })

  it('fails a sentence with no context at all', () => {
    const rubric = testConclusion.generate(new Rng(5)).answer as InterpretationAnswer
    const r = gradeInterpretation(rubric, 'The p-value is less than alpha, so we reject the null hypothesis and the result is statistically significant at that level.')
    expect(r.correct).toBe(false)
  })
})

describe('act-6/fail-to-reject', () => {
  it('always draws a case the test cannot reject, and the exemplar passes', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const rubric = failToReject.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(rubric, rubric.exemplar).correct, `seed ${seed}`).toBe(true)
      expect(rubric.exemplar).toMatch(/fail to reject/i)
      expect(rubric.exemplar).toMatch(/not convincing evidence/i)
    }
  })

  it('rejects "we accept H₀" and "the null is true"', () => {
    const rubric = failToReject.generate(new Rng(3)).answer as InterpretationAnswer
    const accepted = gradeInterpretation(rubric, rubric.exemplar.replace('we fail to reject H₀', 'we accept H₀'))
    expect(accepted.correct).toBe(false)
    const asTruth = gradeInterpretation(rubric, `${rubric.exemplar} H0 is true.`)
    expect(asTruth.correct).toBe(false)
    expect(asTruth.forbidden?.some((f) => /H₀ is true/.test(f.label))).toBe(true)
  })

  it('does NOT punish a learner who explicitly denies the misconception', () => {
    const rubric = failToReject.generate(new Rng(3)).answer as InterpretationAnswer
    expect(gradeInterpretation(rubric, `${rubric.exemplar} This does not mean that H0 is true.`).correct).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------
// Decision, flip point, duality, defects
// ---------------------------------------------------------------------------------------------

describe('act-6/decision-from-p', () => {
  it("the correct option always matches reject(p, α), and reaches both decisions", () => {
    const seen = new Set<boolean>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = decisionFromP.generate(new Rng(seed))
      const a = p.answer as ChoiceAnswer
      expect(a.options).toHaveLength(4)
      expect(a.feedback?.filter((f) => f === null)).toHaveLength(1)
      const [, pStr] = /\$P = ([\d.]+)\$/.exec(p.prompt) ?? []
      const [, aStr] = /\\alpha = ([\d.]+)\$ in its review plan/.exec(p.prompt) ?? []
      expect(pStr && aStr, `seed ${seed}`).toBeTruthy()
      const decided = reject(Number(pStr), Number(aStr))
      seen.add(decided)
      expect(a.options[a.correct].startsWith(decided ? 'Reject' : 'Fail to reject'), `seed ${seed}`).toBe(true)
    }
    expect(seen).toEqual(new Set([true, false]))
  })

  it('produces genuine near misses — p within a factor of two of α', () => {
    let near = 0
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = decisionFromP.generate(new Rng(seed))
      const [, pStr] = /\$P = ([\d.]+)\$/.exec(p.prompt) ?? []
      const [, aStr] = /\\alpha = ([\d.]+)\$ in its review plan/.exec(p.prompt) ?? []
      if (Number(pStr) > 0.5 * Number(aStr) && Number(pStr) < 2 * Number(aStr)) near++
    }
    expect(near).toBeGreaterThan(20)
  })
})

describe('act-6/alpha-flip', () => {
  it('answers either the p-value itself or the smallest conventional level above it', () => {
    const conventional = [0.1, 0.05, 0.01, 0.001]
    let thresholds = 0
    let levels = 0
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = alphaFlip.generate(new Rng(seed))
      const value = (p.answer as NumericAnswer).value
      const [, pStr] = /\$P = ([\d.]+)\$/.exec(p.prompt) ?? []
      expect(pStr, `seed ${seed}`).toBeTruthy()
      const pv = Number(pStr)
      if (/threshold/.test(p.prompt)) {
        thresholds++
        expect(value, `seed ${seed}`).toBeCloseTo(pv, 4)
      } else {
        levels++
        const smallest = Math.min(...conventional.filter((a) => pv < a))
        expect(value, `seed ${seed}`).toBeCloseTo(smallest, 10)
        expect(reject(pv, value), `seed ${seed}`).toBe(true)
      }
    }
    expect(thresholds).toBeGreaterThan(20)
    expect(levels).toBeGreaterThan(20)
  })
})

describe('act-6/ci-test-duality', () => {
  it('the interval and the two-sided test always agree, recomputed from @/lib/stats', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = ciTestDuality.generate(new Rng(seed))
      const a = p.answer as ChoiceAnswer
      expect(a.options).toHaveLength(4)
      const [, pctStr] = /\*\*(\d+)% confidence interval\*\*/.exec(p.prompt) ?? []
      const [, xStr, nStr] = /built from ([\d,]+) [^\d]+ in ([\d,]+)/.exec(p.prompt) ?? []
      const [, p0Str] = /rated at is \$([\d.]+)\$/.exec(p.prompt) ?? []
      expect(pctStr && xStr && nStr && p0Str, `seed ${seed}`).toBeTruthy()
      const confidence = Number(pctStr) / 100
      const x = Number(xStr.replace(/,/g, ''))
      const n = Number(nStr.replace(/,/g, ''))
      const p0 = Number(p0Str)
      const [lo, hi] = onePropInterval({ x, n, confidence, random: true }).ci as [number, number]
      const contains = p0 >= lo && p0 <= hi
      const test = onePropTest({ x, n, p0, alt: 'two-sided', random: true })
      expect(contains, `seed ${seed}`).toBe(!reject(test.pValue!, 1 - confidence))
      expect(a.options[a.correct]).toContain(contains ? 'fail to reject' : 'reject')
      expect(a.options[a.correct]).toContain('two-sided')
      seen.add(contains ? 'in' : 'out')
    }
    expect(seen).toEqual(new Set(['in', 'out']))
  })

  it('always offers the one-sided mismatch as a distractor, with the (1 − 2α) correction', () => {
    for (const seed of [0, 4, 17, 42]) {
      const a = ciTestDuality.generate(new Rng(seed)).answer as ChoiceAnswer
      const idx = a.options.findIndex((o) => /\*\*one-sided\*\*/.test(o))
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).not.toBe(a.correct)
      expect(a.feedback?.[idx]).toMatch(/two-sided/)
    }
  })
})

describe('act-6/conclusion-defects', () => {
  it('reaches both a rejecting and a failing draft set, one defensible option each', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const a = conclusionDefects.generate(new Rng(seed)).answer as ChoiceAnswer
      expect(a.options).toHaveLength(4)
      expect(a.feedback?.filter((f) => f === null)).toHaveLength(1)
      expect(a.feedback?.[a.correct]).toBeNull()
      seen.add(/we reject/i.test(a.options[a.correct]) ? 'reject' : 'fail')
    }
    expect(seen).toEqual(new Set(['reject', 'fail']))
  })

  it('always includes a draft that claims proof, and it is never the answer', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const a = conclusionDefects.generate(new Rng(seed)).answer as ChoiceAnswer
      const proofs = a.options.map((o, i) => [o, i] as const).filter(([o]) => /\bproves\b/.test(o))
      expect(proofs.length, `seed ${seed}`).toBeGreaterThan(0)
      for (const [, i] of proofs) expect(i, `seed ${seed}`).not.toBe(a.correct)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The mission-beat rubric (act-6-05-conclusion) — built in the MDX, so nothing else checks it
// ---------------------------------------------------------------------------------------------

describe('conclusionInContextRubric (act-6-05’s mission beat and the DecisionConsole)', () => {
  const rubric = conclusionInContextRubric({
    pValue: PERRINE_TEST.pValue!,
    alpha: 0.05,
    direction: 'greater',
    parameter: 'loss rate',
    population: 'hulls whose policies name Perrine Holdings on the Hundred-Day Lane',
    variable: 'per transit',
    nullValue: 'the rate for hulls naming any other beneficiary',
    directionWords: ['often'],
    extraForbidden: AGENCY_FORBIDDEN,
  })
  const grade = (s: string) => gradeInterpretation(rubric, s)

  it('passes its own exemplar', () => {
    expect(grade(rubric.exemplar).correct).toBe(true)
  })

  it('accepts an honest conclusion written in the learner’s own words', () => {
    const r = grade(
      'Because the p-value of 0.0008 is less than alpha = 0.05, we reject H0. There is convincing evidence that the true loss rate per transit is greater for hulls whose policies name Perrine Holdings on the Hundred-Day Lane than for hulls naming any other beneficiary.',
    )
    expect(r.correct).toBe(true)
    expect(r.score).toBe(1)
  })

  it('strikes “proves”', () => {
    const r = grade(rubric.exemplar.replace('There is convincing evidence that', 'This proves that'))
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /proof/i.test(f.label))).toBe(true)
  })

  it('strikes “targeted”', () => {
    const r = grade(`${rubric.exemplar} Perrine hulls are being targeted.`)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => /targeted/.test(f.label))).toBe(true)
  })

  it('strikes a claim about agency or about who is responsible', () => {
    expect(grade(`${rubric.exemplar} The losses are the result of deliberate diversion.`).correct).toBe(false)
    expect(grade(`${rubric.exemplar} The pattern is caused by Perrine Holdings.`).correct).toBe(false)
  })

  it('strikes “accept H₀” and the wrong decision', () => {
    expect(grade('We accept H0 because the p-value of 0.0008 is less than alpha = 0.05 for the loss rate per transit of hulls whose policies name Perrine Holdings.').correct).toBe(false)
    expect(
      grade(
        'Because the p-value of 0.0008 is less than alpha = 0.05, we fail to reject H0, so there is convincing evidence that the true loss rate per transit is greater for hulls whose policies name Perrine Holdings on the Hundred-Day Lane.',
      ).correct,
    ).toBe(false)
  })

  it('asks for the context when the sentence is only a decision', () => {
    const r = grade('Because the p-value of 0.0008 is less than alpha = 0.05 we reject the null hypothesis and the result is statistically significant.')
    expect(r.correct).toBe(false)
    expect(r.feedback).toMatch(/context/i)
  })

  it('flips with α: the same rubric arguments at α = 0.0001 demand the other decision', () => {
    const strict = conclusionInContextRubric({
      pValue: PERRINE_TEST.pValue!,
      alpha: 0.0001,
      direction: 'greater',
      parameter: 'loss rate',
      population: 'hulls whose policies name Perrine Holdings on the Hundred-Day Lane',
      variable: 'per transit',
      nullValue: 'the rate for hulls naming any other beneficiary',
    })
    expect(reject(PERRINE_TEST.pValue!, 0.0001)).toBe(false)
    expect(strict.exemplar).toMatch(/fail to reject/i)
    expect(gradeInterpretation(strict, strict.exemplar).correct).toBe(true)
    expect(gradeInterpretation(strict, rubric.exemplar).correct).toBe(false)
  })
})
