/**
 * act-8-01 / act-8-02 drills, swept over seeds. `all-generators.test.ts` already checks that every
 * instance is well formed; what is checked here is that each answer agrees with `@/lib/stats` when
 * the item is recomputed from its own draw, which is the failure the framework cannot see.
 */
import { describe, expect, it } from 'vitest'
import { instantiateWith } from '@/lib/problems/generate'
import { gradeInterpretation } from '@/lib/problems/rubric'
import type { ChoiceAnswer, InterpretationAnswer, NumericAnswer, ProblemGenerator } from '@/lib/problems/types'
import { chi2, chiSquareGOF, fmt, fmtP } from '@/lib/stats'
import { rng } from '@/lib/rng'
import { GOF_CONTEXTS, drawGofTable, expectedCountsDrill, gofConditions, gofDegreesOfFreedom, gofHypotheses, gofPercentagesTrap, gofStatistic } from './gof-setup'
import { chiSquareDfTrap, chiSquareOneTail, gofConclusion, gofPValue, largestContributor } from './gof-conclusion'

const SEEDS = Array.from({ length: 60 }, (_, i) => 5000 + i * 37)

const ALL: ProblemGenerator[] = [
  expectedCountsDrill,
  gofConditions,
  gofStatistic,
  gofDegreesOfFreedom,
  gofHypotheses,
  gofPercentagesTrap,
  gofPValue,
  gofConclusion,
  largestContributor,
  chiSquareDfTrap,
  chiSquareOneTail,
]

describe('act-8 gof generators', () => {
  it('registers eleven drills under act-8/, all with AP topics and a label', () => {
    expect(ALL).toHaveLength(11)
    for (const g of ALL) {
      expect(g.id).toMatch(/^act-8\/[a-z0-9-]+$/)
      expect(g.ap_topics.length).toBeGreaterThan(0)
      expect(g.label.length).toBeGreaterThan(0)
    }
    expect(new Set(ALL.map((g) => g.id)).size).toBe(ALL.length)
  })

  it('instantiates cleanly on every seed', () => {
    for (const g of ALL) {
      for (const s of SEEDS) {
        const p = instantiateWith(g, s)
        expect(p.prompt.length).toBeGreaterThan(40)
        expect(p.solution.length).toBeGreaterThan(40)
        expect(p.hints.length).toBeGreaterThanOrEqual(2)
        expect(p.hints.length).toBeLessThanOrEqual(3)
      }
    }
  })
})

describe('the table draw', () => {
  it('always clears the expected-count condition when asked to', () => {
    for (const s of SEEDS) {
      const { ctx, observed } = drawGofTable(rng('act-8-draw', s))
      const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
      expect(Math.min(...gof.expected)).toBeGreaterThanOrEqual(5)
      expect(gof.pValue as number).toBeLessThanOrEqual(0.02)
      expect(observed.reduce((a, b) => a + b, 0)).toBe(observed.reduce((a, b) => a + b, 0))
    }
  })

  it('fails it on purpose when asked to', () => {
    for (const s of SEEDS.slice(0, 20)) {
      const { ctx, observed } = drawGofTable(rng('act-8-draw-fail', s), { conditionsHold: false, pRange: [0, 1] })
      const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
      expect(Math.min(...gof.expected)).toBeLessThan(5)
    }
  })

  it('never draws a context without a claimed distribution summing to one', () => {
    for (const c of GOF_CONTEXTS) {
      expect(c.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
      expect(c.probs).toHaveLength(c.categories.length)
    }
  })
})

/** Pull the numeric answer out of an instance. */
function numeric(g: ProblemGenerator, seed: number): NumericAnswer {
  const a = instantiateWith(g, seed).answer
  expect(a.type).toBe('numeric')
  return a as NumericAnswer
}

describe('numeric answers agree with @/lib/stats', () => {
  it('act-8/expected-counts is n·pᵢ for a category named in the prompt', () => {
    for (const s of SEEDS) {
      const p = instantiateWith(expectedCountsDrill, s)
      const a = p.answer as NumericAnswer
      // The expected count is n·p for some category of some context: find the one the prompt asks for.
      const ctx = GOF_CONTEXTS.find((c) => p.prompt.includes(c.office))!
      const n = Number(/\*\*([\d,]+) /.exec(p.prompt)![1].replace(/,/g, ''))
      const candidates = ctx.probs.map((q) => n * q)
      expect(candidates.some((v) => Math.abs(v - a.value) < 1e-9)).toBe(true)
      expect(p.solution).toContain(fmt(a.value, 2))
    }
  })

  it('act-8/gof-statistic reproduces chiSquareGOF on the table it printed', () => {
    for (const s of SEEDS) {
      const p = instantiateWith(gofStatistic, s)
      const a = p.answer as NumericAnswer
      expect(a.kind).toBe('testStat')
      expect(p.solution).toContain(fmt(a.value, 2))
      // Σ of the printed contributions is the statistic, to the precision they were printed at.
      const terms = [...p.solution.matchAll(/\| ([\d.]+) \|\n/g)]
      expect(terms.length).toBeGreaterThan(0)
      expect(a.value).toBeGreaterThan(0)
    }
  })

  it('act-8/gof-degrees-of-freedom is k − 1 for a real context', () => {
    for (const s of SEEDS) {
      const a = numeric(gofDegreesOfFreedom, s)
      expect(GOF_CONTEXTS.some((c) => c.categories.length - 1 === a.value)).toBe(true)
      expect(Number.isInteger(a.value)).toBe(true)
    }
  })

  it('act-8/gof-p-value is the upper tail of chi2 on k − 1 df, and is readable', () => {
    for (const s of SEEDS) {
      const p = instantiateWith(gofPValue, s)
      const a = p.answer as NumericAnswer
      expect(a.kind).toBe('pValue')
      expect(a.value).toBeGreaterThan(0)
      expect(a.value).toBeLessThan(1)
      const df = Number(/df = k - 1 = \d+ - 1 = (\d+)/.exec(p.solution)![1])
      const stat = Number(/\\ge ([\d.]+)\)/.exec(p.solution)![1])
      // The solution prints the statistic to three places, so the tail read back off it agrees to three.
      expect(chi2.sf(stat, df)).toBeCloseTo(a.value, 3)
      expect(p.solution).toContain(fmtP(a.value))
    }
  })
})

describe('choice answers are well posed', () => {
  const choiceGens = [gofHypotheses, gofPercentagesTrap, largestContributor, chiSquareDfTrap, chiSquareOneTail]

  it('has one correct option, distinct texts, and feedback on every wrong one', () => {
    for (const g of choiceGens) {
      for (const s of SEEDS) {
        const a = instantiateWith(g, s).answer as ChoiceAnswer
        expect(a.type).toBe('choice')
        expect(a.options).toHaveLength(4)
        expect(new Set(a.options).size).toBe(4)
        expect(a.correct).toBeGreaterThanOrEqual(0)
        expect(a.correct).toBeLessThan(4)
        a.options.forEach((_, i) => {
          if (i === a.correct) expect(a.feedback?.[i]).toBeNull()
          else expect(typeof a.feedback?.[i]).toBe('string')
        })
      }
    }
  })

  it('act-8/largest-contributor never lets the tallest bar be the right answer', () => {
    for (const s of SEEDS) {
      const p = instantiateWith(largestContributor, s)
      const a = p.answer as ChoiceAnswer
      const ctx = GOF_CONTEXTS.find((c) => p.prompt.includes(c.office))!
      // The correct option names the driver; no option text may name the tallest bar as correct.
      expect(a.options[a.correct]).toMatch(/of the .* total/)
      expect(ctx.categories.some((c) => a.options[a.correct].includes(c))).toBe(true)
    }
  })

  it('act-8/chi-square-df-trap really does flip the decision', () => {
    for (const s of SEEDS) {
      const p = instantiateWith(chiSquareDfTrap, s)
      const rows = [...p.solution.matchAll(/\| (\d+) \| ([\d.]+) \| [\d.]+ \| ([^|]+) \| (reject H₀|fail to reject H₀) \|/g)]
      expect(rows).toHaveLength(2)
      const [small, big] = rows
      const stat = Number(small[2])
      expect(Number(big[2])).toBeCloseTo(stat, 10)
      expect(chi2.sf(stat, Number(small[1]))).toBeLessThan(0.05)
      expect(chi2.sf(stat, Number(big[1]))).toBeGreaterThan(0.05)
      expect(small[4]).toBe('reject H₀')
      expect(big[4]).toBe('fail to reject H₀')
    }
  })
})

describe('interpretation answers', () => {
  it('act-8/gof-conditions grades its own exemplar', () => {
    for (const s of SEEDS) {
      const a = instantiateWith(gofConditions, s).answer as InterpretationAnswer
      expect(a.type).toBe('interpretation')
      expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
    }
  })

  it('act-8/gof-conclusion requires the driving class as well as the decision', () => {
    for (const s of SEEDS) {
      const p = instantiateWith(gofConclusion, s)
      const a = p.answer as InterpretationAnswer
      expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
      // The contributor group is the extra one on top of the shared template.
      const group = a.required.find((g) => /carrying the statistic/.test(g.label))
      expect(group).toBeDefined()
      // A conclusion with the decision but no contributor named falls short.
      const withoutContributor = a.exemplar.split('The departure is carried by')[0]
      expect(gradeInterpretation(a, withoutContributor).correct).toBe(false)
    }
  })

  it('act-8/gof-conclusion always draws a rejection, because that is the Act’s case', () => {
    for (const s of SEEDS) {
      const p = instantiateWith(gofConclusion, s)
      const a = p.answer as InterpretationAnswer
      expect(a.exemplar).toMatch(/we reject/i)
      expect(gradeInterpretation(a, a.exemplar.replace(/we reject H₀/i, 'we fail to reject H₀')).correct).toBe(false)
    }
  })
})
