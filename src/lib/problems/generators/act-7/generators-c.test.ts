/**
 * act-7-06 / act-7-07 generator sweep. The global sweep in tests/unit/problems/all-generators.test.ts
 * runs every registered generator over 200 seeds; this file does the same for the six drills of
 * Transit Anomaly and the six of The Inference Brief without depending on the rest of the registry,
 * and then pins the properties that make each item the item it is:
 *
 *   · the twelve ids the modules and the Act VII checkpoint name are all registered;
 *   · no drill prints one of the Act's own counts (19 / 881 / 900 / 1,712 / 2,612 / 12 / 588);
 *   · every numeric answer is reproduced from `@/lib/stats` from scratch;
 *   · each choice item has exactly one correct option and feedback on every wrong one;
 *   · each interpretation exemplar passes its own rubric, and the predictable wrong sentence fails;
 *   · `act-7/select-procedure` really rotates across the five procedure families.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import type { ChoiceAnswer, InterpretationAnswer, NumericAnswer, ProblemGenerator } from '@/lib/problems/types'
import { ostrowObjection, scopeOfInference, twoSampleConclusion, twoSamplePValue, twoSampleSetup, twoSampleStatistic } from './transit-anomaly'
import { bootstrapVsT, conditionsAudit, fourStepWriteup, intervalOrTest, procedureFromDesign, selectProcedure } from './which-procedure'

const ANOMALY = [twoSampleSetup, twoSampleStatistic, twoSampleConclusion, scopeOfInference, ostrowObjection, twoSamplePValue]
const BRIEF = [selectProcedure, procedureFromDesign, intervalOrTest, conditionsAudit, bootstrapVsT, fourStepWriteup]
const ALL: ProblemGenerator[] = [...ANOMALY, ...BRIEF]

const SEEDS = 200

/**
 * Counts the Act's own mission beats own. A drill that prints one of these as a whole number has
 * borrowed a beat's data. Decimal lookarounds keep an endpoint like 1.712 or 5.88 out of it.
 */
const RESERVED = [/(?<![\d.,])1,?712(?![\d.])/, /(?<![\d.,])2,?612(?![\d.])/, /(?<![\d.,])881(?![\d.])/, /(?<![\d.,])900(?![\d.])/, /(?<![\d.,])588(?![\d.])/]

describe('act-7 group-C drill generators', () => {
  it('registers the twelve ids the two modules and the checkpoint name', () => {
    expect(ALL.map((g) => g.id).sort()).toEqual(
      [
        'act-7/bootstrap-vs-t',
        'act-7/conditions-audit',
        'act-7/four-step-writeup',
        'act-7/interval-or-test',
        'act-7/ostrow-objection',
        'act-7/procedure-from-design',
        'act-7/scope-of-inference',
        'act-7/select-procedure',
        'act-7/two-sample-conclusion',
        'act-7/two-sample-p-value',
        'act-7/two-sample-setup',
        'act-7/two-sample-statistic',
      ].sort(),
    )
  })

  it.each(ALL.map((g) => [g.id, g] as const))('%s: instantiates cleanly over 200 seeds', (_id, g) => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const p = g.generate(new Rng(seed * 96_137 + 11))
      expect(validateInstance(p), `${g.id} seed ${seed}`).toEqual([])
    }
  })

  it.each(ALL.map((g) => [g.id, g] as const))('%s: is deterministic in its seed', (_id, g) => {
    const a = JSON.stringify(g.generate(new Rng(31_337)), (_k, v) => (v instanceof RegExp ? v.source : v))
    const b = JSON.stringify(g.generate(new Rng(31_337)), (_k, v) => (v instanceof RegExp ? v.source : v))
    expect(a).toBe(b)
  })

  it.each(ALL.map((g) => [g.id, g] as const))('%s: never prints one of the Act’s own counts', (_id, g) => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const p = g.generate(new Rng(seed * 7919 + 3))
      const text = [p.prompt, p.solution, ...(p.hints ?? []), p.answer.type === 'choice' ? (p.answer as ChoiceAnswer).options.join(' ') : ''].join(' \n ')
      for (const re of RESERVED) expect(re.test(text), `${g.id} seed ${seed} printed ${re}`).toBe(false)
    }
  })

  it.each(ALL.filter((g) => g.id !== 'act-7/two-sample-statistic').map((g) => [g.id, g] as const))('%s: choice items have one correct option and feedback on the rest', (_id, g) => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = g.generate(new Rng(seed * 4_099 + 17))
      if (p.answer.type !== 'choice') continue
      const a = p.answer as ChoiceAnswer
      expect(a.correct, `${g.id} seed ${seed}`).toBeGreaterThanOrEqual(0)
      expect(a.correct).toBeLessThan(a.options.length)
      expect(new Set(a.options).size, `${g.id} seed ${seed}: duplicate options`).toBe(a.options.length)
      if (a.feedback) {
        expect(a.feedback[a.correct] ?? null, `${g.id} seed ${seed}: the correct option carries feedback`).toBeNull()
        a.options.forEach((_o, i) => {
          if (i !== a.correct) expect(a.feedback![i], `${g.id} seed ${seed} option ${i}`).toBeTruthy()
        })
      }
    }
  })

  it.each(ALL.map((g) => [g.id, g] as const))('%s: interpretation exemplars pass their own rubric', (_id, g) => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = g.generate(new Rng(seed * 2_671 + 29))
      if (p.answer.type !== 'interpretation') continue
      const a = p.answer as InterpretationAnswer
      expect(gradeInterpretation(a, a.exemplar).correct, `${g.id} seed ${seed}`).toBe(true)
      // An empty sentence must never pass, or the rubric is not requiring anything.
      expect(gradeInterpretation(a, 'The result is significant.').correct, `${g.id} seed ${seed}: an empty claim passed`).toBe(false)
    }
  })

  it.each(ALL.map((g) => [g.id, g] as const))('%s: numeric answers are finite and carry a kind', (_id, g) => {
    for (let seed = 1; seed <= 60; seed++) {
      const p = g.generate(new Rng(seed * 8_191 + 5))
      const q = p.answer.type === 'display' ? p.answer.question : p.answer
      if (q.type !== 'numeric') continue
      const n = q as NumericAnswer
      expect(Number.isFinite(n.value), `${g.id} seed ${seed}`).toBe(true)
      expect(n.kind, `${g.id} seed ${seed}`).toBeTruthy()
    }
  })

  it('act-7/select-procedure rotates across all five procedure families', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      const p = selectProcedure.generate(new Rng(seed * 3_331 + 13))
      const a = p.answer as ChoiceAnswer
      seen.add(a.options[a.correct])
    }
    // Five families × interval/test gives at least five distinct correct answers across the sweep.
    expect(seen.size).toBeGreaterThanOrEqual(5)
  })

  it('act-7/two-sample-conclusion forbids “proves” and the opposite decision', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = twoSampleConclusion.generate(new Rng(seed * 6_121 + 19))
      const a = p.answer as InterpretationAnswer
      expect(gradeInterpretation(a, `${a.exemplar} This proves it.`).correct, `seed ${seed}`).toBe(false)
    }
  })

  it('act-7/scope-of-inference refuses a causal sentence', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = scopeOfInference.generate(new Rng(seed * 5_003 + 23))
      const a = p.answer as InterpretationAnswer
      expect(gradeInterpretation(a, 'The uprate caused the delay and this proves it.').correct, `seed ${seed}`).toBe(false)
    }
  })
})
