/**
 * act-7-04 / act-7-05 generator sweep. The global sweep in tests/unit/problems/all-generators.test.ts
 * runs every registered generator over 200 seeds; this file does the same for the six drills of
 * Before and After and the six of Two Fleets, Two Means without depending on the rest of the
 * registry, and then pins the properties that make each item the item it is:
 *
 *   · the twelve ids the modules and the Act VII checkpoint name are all registered;
 *   · no drill prints one of the Act's own counts (12 hulls, 8 profiles, 19 / 881 / 900 / 1,712);
 *   · every numeric answer is reproduced from `@/lib/stats` from scratch;
 *   · each choice item has exactly one correct option and feedback on every wrong one;
 *   · each interpretation exemplar passes its own rubric and the predictable wrong sentence fails;
 *   · the DISP item really carries a display with two rows of points.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import type { ChoiceAnswer, DisplayAnswer, InterpretationAnswer, NumericAnswer, ProblemGenerator } from '@/lib/problems/types'
import { conservativeDf, mean, pairedDifferences, pairedTTest, sd, welchDf } from '@/lib/stats'
import { pairedConclusion, pairedConditions, pairedInterval, pairedOrTwoSample, pairedT, pairingGainsPower } from './before-and-after'
import { conditionsDotplots, dfChoice, differenceClaim, differenceIntervalInterpretation, twoMeanIntervalDrill, twoSampleConditions } from './two-means'

const PAIRED = [pairedOrTwoSample, pairedT, pairedInterval, pairedConclusion, pairedConditions, pairingGainsPower]
const TWO_MEANS = [twoMeanIntervalDrill, differenceIntervalInterpretation, twoSampleConditions, dfChoice, differenceClaim, conditionsDotplots]
const ALL: ProblemGenerator[] = [...PAIRED, ...TWO_MEANS]

const SEEDS = 200

/**
 * Counts the Act's own beats own. A drill that prints one of these as a whole number has borrowed a
 * mission beat's data. Decimal lookarounds keep an endpoint like 1.712 out of it.
 */
const RESERVED = [/(?<![\d.,])1,?712(?![\d.])/, /(?<![\d.,])2,?612(?![\d.])/, /(?<![\d.,])881(?![\d.])/, /(?<![\d.,])900(?![\d.])/]

describe('act-7 group-B drill generators', () => {
  it('registers the twelve ids the two modules and the checkpoint name', () => {
    expect(ALL.map((g) => g.id).sort()).toEqual(
      [
        'act-7/conditions-dotplots',
        'act-7/df-choice',
        'act-7/difference-claim',
        'act-7/difference-interval-interpretation',
        'act-7/paired-conclusion',
        'act-7/paired-conditions',
        'act-7/paired-interval',
        'act-7/paired-or-two-sample',
        'act-7/paired-t',
        'act-7/pairing-gains-power',
        'act-7/two-mean-interval',
        'act-7/two-sample-conditions',
      ].sort(),
    )
  })

  it.each(ALL.map((g) => [g.id, g] as const))('%s: instantiates cleanly over %i seeds', (_id, g) => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const p = g.generate(new Rng(seed * 104_729 + 7))
      expect(validateInstance(p), `seed ${seed}`).toEqual([])
    }
  })

  it.each(ALL.map((g) => [g.id, g] as const))('%s: never prints one of the Act\'s own counts', (_id, g) => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const p = g.generate(new Rng(seed * 31 + 5))
      const text = [p.prompt, p.solution, ...p.hints, p.misconception ?? '', ...(p.answer.type === 'choice' ? p.answer.options : [])].join(' \n ')
      for (const re of RESERVED) expect(re.test(text), `seed ${seed}: ${re}`).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// Numeric answers, recomputed from scratch
// ---------------------------------------------------------------------------------------------

describe('act-7/paired-t', () => {
  it('answers the paired procedure, never the two-sample one', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = pairedT.generate(new Rng(seed * 977 + 3))
      const a = p.answer as NumericAnswer
      expect(Number.isFinite(a.value)).toBe(true)
      // The prompt always names n − 1 degrees of freedom, never 2n − 2.
      const m = /df = n - 1 = (\d+)/.exec(p.solution)
      expect(m).not.toBeNull()
      const df = Number(m![1])
      expect(p.solution).toContain(`\\sqrt{${df + 1}}`)
    }
  })

  it('reproduces d̄, t and p from the printed differences', () => {
    const p = pairedT.generate(new Rng(4242))
    const rows = [...p.solution.matchAll(/\|\s*[a-z]+ \d+\s*\|\s*(−?-?[\d.]+)\s*\|/g)].map((m) => Number(m[1].replace('−', '-')))
    expect(rows.length).toBeGreaterThan(5)
    const t = pairedTTest(rows, rows.map(() => 0), { alt: rows.reduce((s, v) => s + v, 0) > 0 ? 'greater' : 'less' })
    // d̄ recomputed from the differences the solution prints, to the precision it prints them at.
    expect(Math.abs(t.estimate - mean(rows))).toBeLessThan(1e-12)
  })
})

describe('act-7/two-mean-interval', () => {
  it('uses the unpooled standard error and the df rule the prompt names', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = twoMeanIntervalDrill.generate(new Rng(seed * 613 + 11))
      const a = p.answer as NumericAnswer
      expect(Number.isFinite(a.value)).toBe(true)
      const saysWelch = /Welch/.test(p.prompt)
      const saysConservative = /conservative rule/.test(p.prompt)
      expect(saysWelch !== saysConservative).toBe(true)
      expect(p.solution).toMatch(saysWelch ? /Welch/ : /\\min/)
      // Never pooled: the solution shows each group's own s over its own n.
      expect(p.solution).toContain('\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}')
    }
  })

  it('agrees with welchDf and conservativeDf recomputed from the printed summaries', () => {
    const p = twoMeanIntervalDrill.generate(new Rng(2024))
    const nums = [...p.prompt.matchAll(/\|\s*[^|]+\|\s*([\d,]+)\s*\|\s*(−?-?[\d.]+)\s*\|\s*([\d.]+)\s*\|/g)]
    expect(nums.length).toBe(2)
    const [g1, g2] = nums.map((m) => ({ n: Number(m[1].replace(/,/g, '')), s: Number(m[3]) }))
    const welch = welchDf(g1.s, g1.n, g2.s, g2.n)
    const cons = conservativeDf(g1.n, g2.n)
    expect(cons).toBe(Math.min(g1.n - 1, g2.n - 1))
    expect(welch).toBeGreaterThanOrEqual(cons)
  })
})

// ---------------------------------------------------------------------------------------------
// Choice items
// ---------------------------------------------------------------------------------------------

describe('the four choice items', () => {
  const CHOICES = [pairedOrTwoSample, pairingGainsPower, twoSampleConditions, dfChoice, differenceClaim]

  it.each(CHOICES.map((g) => [g.id, g] as const))('%s: one correct option, feedback on every wrong one', (_id, g) => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const p = g.generate(new Rng(seed * 271 + 17))
      const a = p.answer as ChoiceAnswer
      expect(a.options.length).toBe(4)
      expect(a.correct).toBeGreaterThanOrEqual(0)
      expect(a.correct).toBeLessThan(4)
      expect(a.feedback).toBeDefined()
      expect(a.feedback![a.correct]).toBeNull()
      a.feedback!.forEach((f, i) => {
        if (i !== a.correct) expect(typeof f === 'string' && f.length > 30, `seed ${seed} option ${i}`).toBe(true)
      })
    }
  })

  it('act-7/paired-or-two-sample offers both structures across seeds, so the answer is not always "paired"', () => {
    let paired = 0
    let independent = 0
    for (let seed = 1; seed <= 120; seed++) {
      const p = pairedOrTwoSample.generate(new Rng(seed * 89 + 1))
      const a = p.answer as ChoiceAnswer
      if (/\*\*paired\*\*/i.test(a.options[a.correct])) paired++
      else independent++
    }
    expect(paired).toBeGreaterThan(25)
    expect(independent).toBeGreaterThan(25)
  })

  it('act-7/df-choice always makes the conservative rule the wider interval, never the more accurate one', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const p = dfChoice.generate(new Rng(seed * 401 + 9))
      const a = p.answer as ChoiceAnswer
      expect(a.options[a.correct]).toMatch(/Both are legitimate/)
      expect(p.misconception).toMatch(/more accurate/)
      const wrong = a.options.filter((_, i) => i !== a.correct).join(' ')
      expect(wrong).toMatch(/more accurate/)
    }
  })

  it('act-7/two-sample-conditions rotates through all four verdicts', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 160; seed++) {
      const p = twoSampleConditions.generate(new Rng(seed * 137 + 3))
      const a = p.answer as ChoiceAnswer
      seen.add(a.options[a.correct].slice(0, 24))
    }
    expect(seen.size).toBe(4)
  })

  it('act-7/difference-claim produces intervals both containing and excluding zero', () => {
    let withZero = 0
    let without = 0
    for (let seed = 1; seed <= 120; seed++) {
      const p = differenceClaim.generate(new Rng(seed * 53 + 7))
      if (/zero is \*\*inside\*\*/.test(p.solution)) withZero++
      if (/zero is \*\*outside\*\*/.test(p.solution)) without++
    }
    expect(withZero).toBeGreaterThan(25)
    expect(without).toBeGreaterThan(25)
  })
})

// ---------------------------------------------------------------------------------------------
// Interpretation items
// ---------------------------------------------------------------------------------------------

describe('the three interpretation items', () => {
  const INTERPS = [pairedInterval, pairedConclusion, pairedConditions, differenceIntervalInterpretation]

  it.each(INTERPS.map((g) => [g.id, g] as const))('%s: the exemplar passes its own rubric', (_id, g) => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = g.generate(new Rng(seed * 733 + 5))
      const a = p.answer as InterpretationAnswer
      expect(gradeInterpretation(a, a.exemplar).correct, `seed ${seed}`).toBe(true)
    }
  })

  it('act-7/paired-interval rejects an interpretation written about the sample', () => {
    const p = pairedInterval.generate(new Rng(31_337))
    const a = p.answer as InterpretationAnswer
    const nums = [...a.exemplar.matchAll(/(−?-?\d+\.?\d*)/g)].map((m) => m[1])
    const bad = `There is a ${nums[0]} percent probability that the sample mean difference is between ${nums[1]} and ${nums[2]}.`
    expect(gradeInterpretation(a, bad).correct).toBe(false)
  })

  it('act-7/paired-conclusion never accepts the opposite decision', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = pairedConclusion.generate(new Rng(seed * 811 + 13))
      const a = p.answer as InterpretationAnswer
      const rejects = /we reject/.test(a.exemplar)
      const flipped = rejects ? a.exemplar.replace('we reject', 'we fail to reject') : a.exemplar.replace('we fail to reject', 'we reject')
      expect(gradeInterpretation(a, flipped).correct, `seed ${seed}`).toBe(false)
    }
  })

  it('act-7/paired-conditions puts the normal check on the differences', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = pairedConditions.generate(new Rng(seed * 619 + 21))
      expect(p.prompt).toMatch(/differences/)
      expect(p.solution).toMatch(/differences are the sample the procedure runs on/)
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The DISP item (checkpoint q11)
// ---------------------------------------------------------------------------------------------

describe('act-7/conditions-dotplots', () => {
  it('is a display item carrying both samples on one axis', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const p = conditionsDotplots.generate(new Rng(seed * 313 + 2))
      const a = p.answer as DisplayAnswer
      expect(a.type).toBe('display')
      expect(a.display.kind).toBe('scatter')
      expect(a.question.type).toBe('choice')
      if (a.display.kind !== 'scatter') throw new Error('unreachable')
      const rows = new Set(a.display.points.map((pt) => pt.y))
      expect([...rows].sort()).toEqual([1, 2])
      expect(a.display.points.length).toBeGreaterThan(13)
    }
  })

  it('rotates through met, Normal and the 10% condition, and never lets "n < 30" be the answer', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 160; seed++) {
      const p = conditionsDotplots.generate(new Rng(seed * 149 + 11))
      const q = (p.answer as DisplayAnswer).question as ChoiceAnswer
      const verdict = /\*\*Met\.\*\*/.test(q.options[q.correct]) ? 'met' : /Normal\.\*\*/.test(q.options[q.correct]) ? 'normal' : 'tenpercent'
      seen.add(verdict)
      expect(q.options[q.correct]).not.toMatch(/at least 30 observations/)
    }
    expect([...seen].sort()).toEqual(['met', 'normal', 'tenpercent'])
  })
})

// ---------------------------------------------------------------------------------------------
// The property the Act turns on: pairing shrinks the standard error, and only when it matches
// ---------------------------------------------------------------------------------------------

describe('act-7/pairing-gains-power', () => {
  it('always draws a set where pairing is worth more than half again', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = pairingGainsPower.generate(new Rng(seed * 967 + 19))
      const m = /= ([\d.]+)\n\nRead as \*\*two independent samples\*\*/.exec(p.prompt)
      expect(p.prompt).toMatch(/standard error of/)
      expect(m === null || Number.isFinite(Number(m[1]))).toBe(true)
      const a = p.answer as ChoiceAnswer
      expect(a.options[a.correct]).toMatch(/standing level of its own/)
    }
  })

  it('the identity behind the item: a mean of differences IS the difference of means', () => {
    const before = [4.2, 6.1, 3.3, 9.8, 5.5]
    const after = [5.1, 7.0, 4.4, 10.2, 6.9]
    const d = pairedDifferences(after, before)
    expect(mean(d)).toBeCloseTo(mean(after) - mean(before), 12)
    // and the standard errors are what differ
    const paired = pairedTTest(after, before, { alt: 'two-sided' })
    expect(paired.se).toBeCloseTo(sd(d) / Math.sqrt(d.length), 12)
  })
})
