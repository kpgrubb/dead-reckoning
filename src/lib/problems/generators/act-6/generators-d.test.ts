/**
 * act-6-08 generator sweep ("The Accusation"). The global sweep in
 * tests/unit/problems/all-generators.test.ts runs every registered generator over 200 seeds; this
 * file does the same for the six drills of the two-proportion z-test without depending on the rest
 * of the registry, and then pins the properties that make each item the item it is:
 *
 *   · no drill borrows the Lane's own numbers (19/900, 12/1,712, 31/2,612, z ≈ 3.16, p ≈ 0.0008);
 *   · every statistic and p-value is re-derived here from `twoPropTest` off the prompt's own counts,
 *     and the SE is always the POOLED one;
 *   · the four Large Counts products in every conditions item are computed at the pooled rate and
 *     all clear 10, so the drill never teaches a failed condition by accident;
 *   · both rubrics pass their own exemplars and fail the sentences act-6-08 exists to break —
 *     "proves", "targeted", an unpooled SE in the test, and a conclusion with no scope;
 *   · the two mission-beat rubrics, which are built in the MDX and so are checked nowhere else, are
 *     reconstructed here with the arguments the module passes, and graded.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import type { InterpretationAnswer, NumericAnswer, ProblemGenerator, ProblemInstance } from '@/lib/problems/types'
import { pValueZ, round, twoPropTest } from '@/lib/stats'
import { fmt, fmtP } from '@/lib/stats/format'
import { fourStepConclusionRubric, fourStepTest, pooledConditions, pooledConditionsRubric, pooledOrUnpooled, pooledTestStatistic, scopeOfInference, twoPropPValue } from './accusation'
import {
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_HOLDINGS,
  PERRINE_LOSSES,
  PERRINE_TEST,
  PERRINE_TRANSITS,
  POOLED_RATE,
  SMALLEST_EXPECTED_COUNT,
} from '@/instruments/act-6/data'

const ALL: ProblemGenerator[] = [pooledOrUnpooled, pooledTestStatistic, twoPropPValue, pooledConditions, fourStepTest, scopeOfInference]

const SEEDS = 200

/** The Lane's own headline counts, as a drill might print them. */
const RESERVED_TEXT = [/(?<![\d.,])2,?612(?![\d.])/, /(?<![\d.,])1,?712(?![\d.])/]
const RESERVED_COUNTS = [19, 31, 900, 1712, 2612]

function allText(p: ProblemInstance): string {
  const a = p.answer
  const options = a.type === 'choice' || a.type === 'multi' ? a.options : []
  const feedback = (a.type === 'choice' || a.type === 'multi' ? (a.feedback ?? []) : []).filter((f): f is string => !!f)
  return [p.prompt, p.solution, ...p.hints, ...options, ...feedback].join('\n')
}

function tableRows(p: ProblemInstance): (string | number)[][] {
  const spec = p.data
  if (!spec || spec.kind !== 'table') throw new Error('expected a table DisplaySpec on this instance')
  return spec.rows
}

const num = (v: string | number): number => (typeof v === 'number' ? v : Number(String(v).replace(/,/g, '')))

/** The two counts and two denominators a prompt's own table carries. */
function counts(p: ProblemInstance): { x1: number; n1: number; x2: number; n2: number } {
  const [r1, r2] = tableRows(p)
  return { x1: num(r1[1]), n1: num(r1[2]), x2: num(r2[1]), n2: num(r2[2]) }
}

describe('act-6-08 drill generators', () => {
  it('registers the six ids the module and the checkpoint name', () => {
    expect(ALL.map((g) => g.id).sort()).toEqual(
      ['act-6/pooled-or-unpooled', 'act-6/pooled-test-statistic', 'act-6/two-prop-p-value', 'act-6/pooled-conditions', 'act-6/four-step-test', 'act-6/scope-of-inference'].sort(),
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

  it('never draws one of the Lane’s own counts (19, 31, 900, 1,712, 2,612)', () => {
    for (const g of ALL) {
      for (let seed = 0; seed < SEEDS; seed++) {
        const { x1, n1, x2, n2 } = counts(g.generate(new Rng(seed)))
        for (const v of [x1, n1, x2, n2]) expect(RESERVED_COUNTS, `${g.id} seed ${seed} drew ${v}`).not.toContain(v)
      }
    }
  })

  it('no numeric answer reproduces the Lane’s z ≈ 3.16 or its p ≈ 0.0008', () => {
    for (const g of ALL) {
      for (let seed = 0; seed < SEEDS; seed++) {
        const a = g.generate(new Rng(seed)).answer
        if (a.type !== 'numeric') continue
        expect(Math.abs(a.value - PERRINE_TEST.statistic), `${g.id} seed ${seed}`).toBeGreaterThan(0.02)
        expect(Math.abs(a.value - PERRINE_TEST.pValue!), `${g.id} seed ${seed}`).toBeGreaterThan(0.0001)
      }
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The arithmetic, re-derived from @/lib/stats off each prompt's own counts
// ---------------------------------------------------------------------------------------------

describe('act-6/pooled-test-statistic is the pooled z and nothing else', () => {
  it('matches twoPropTest recomputed from the prompt’s table, and never the unpooled statistic', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = pooledTestStatistic.generate(new Rng(seed))
      const { x1, n1, x2, n2 } = counts(p)
      const expected = twoPropTest({ x1, n1, x2, n2, alt: 'greater', random: true })
      const value = (p.answer as NumericAnswer).value
      expect(value, `seed ${seed}`).toBeCloseTo(expected.statistic, 8)

      const p1 = x1 / n1
      const p2 = x2 / n2
      const unpooled = (p1 - p2) / Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
      // The two differ on every honest draw; if they ever coincided the drill would not teach anything.
      expect(Math.abs(value - unpooled), `seed ${seed}`).toBeGreaterThan(1e-6)
    }
  })
})

describe('act-6/two-prop-p-value counts the tails the alternative named', () => {
  it('is the one- or two-sided area under the pooled statistic, as the prompt states it', () => {
    let oneSided = 0
    let twoSided = 0
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = twoPropPValue.generate(new Rng(seed))
      const { x1, n1, x2, n2 } = counts(p)
      const isTwoSided = /p_1 \\ne p_2/.test(p.prompt)
      const t = twoPropTest({ x1, n1, x2, n2, alt: isTwoSided ? 'two-sided' : 'greater', random: true })
      expect((p.answer as NumericAnswer).value, `seed ${seed}`).toBeCloseTo(t.pValue!, 10)
      expect(t.pValue!, `seed ${seed}`).toBeCloseTo(pValueZ(t.statistic, isTwoSided ? 'two-sided' : 'greater'), 10)
      if (isTwoSided) twoSided++
      else oneSided++
    }
    expect(oneSided).toBeGreaterThan(20)
    expect(twoSided).toBeGreaterThan(20)
  })
})

describe('act-6/pooled-conditions checks the test’s condition and not the interval’s', () => {
  it('computes all four products at the pooled rate, and every one of them clears 10', () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = pooledConditions.generate(new Rng(seed))
      const { x1, n1, x2, n2 } = counts(p)
      const pooled = (x1 + x2) / (n1 + n2)
      const products = [n1 * pooled, n1 * (1 - pooled), n2 * pooled, n2 * (1 - pooled)]
      for (const v of products) expect(v, `seed ${seed}`).toBeGreaterThanOrEqual(10)
      // The exemplar names the smallest product, rounded once the way the generator rounds it.
      const smallest = Math.min(...products.map((v) => round(v, 1)))
      expect((p.answer as InterpretationAnswer).exemplar, `seed ${seed}`).toContain(fmt(smallest, 1))
    }
  })
})

// ---------------------------------------------------------------------------------------------
// The rubrics: exemplars pass, and the sentences the module exists to break fail
// ---------------------------------------------------------------------------------------------

describe('the two act-6-08 rubrics', () => {
  it('pass their own exemplars on every seed', () => {
    for (const g of [pooledConditions, fourStepTest]) {
      for (let seed = 0; seed < SEEDS; seed++) {
        const a = g.generate(new Rng(seed)).answer as InterpretationAnswer
        const graded = gradeInterpretation(a, a.exemplar!)
        expect(graded.correct, `${g.id} seed ${seed}: ${graded.rubric?.filter((r) => !r.met).map((r) => r.label).join(' | ')}`).toBe(true)
      }
    }
  })

  it('the conclusion rubric strikes “proves”, “targeted” and a missing scope', () => {
    const a = fourStepTest.generate(new Rng(11)).answer as InterpretationAnswer
    expect(gradeInterpretation(a, a.exemplar!).correct).toBe(true)
    expect(gradeInterpretation(a, a.exemplar!.replace('convincing evidence', 'proof')).correct).toBe(false)
    expect(gradeInterpretation(a, `${a.exemplar!} The first group is being targeted.`).correct).toBe(false)
    // Strip the scope clause: everything from "The finding covers" onwards.
    expect(gradeInterpretation(a, a.exemplar!.replace(/ The finding covers[\s\S]*$/, '')).correct).toBe(false)
  })

  it('the conditions rubric wants the pooled rate and the smallest product, both named', () => {
    const a = pooledConditions.generate(new Rng(11)).answer as InterpretationAnswer
    expect(gradeInterpretation(a, a.exemplar!).correct).toBe(true)
    expect(gradeInterpretation(a, a.exemplar!.replace(/pooled proportion p̂c = [\d.]+/, 'observed rates')).correct).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// act-6-08's mission beats — the rubrics are built in the MDX, so nothing else grades them
// ---------------------------------------------------------------------------------------------

const LANE_WINDOW = 'transits recorded in the Authority Transit Ledger between 2178 and the Register snapshot'

const laneConditions = pooledConditionsRubric({
  n1: PERRINE_TRANSITS,
  n2: OTHER_TRANSITS,
  pooled: POOLED_RATE,
  group1: PERRINE_HOLDINGS,
  group2: 'all other beneficiaries',
  unit: 'transits',
  context: 'the Ledger records every transit the Authority logged, and nothing about how a transit came to be flown was related to whether it was lost',
})

const laneConclusion = fourStepConclusionRubric({
  pValue: PERRINE_TEST.pValue!,
  alpha: 0.05,
  parameter: 'loss rate per transit',
  population: 'transits on the Hundred-Day Lane',
  group1: 'hulls whose policies name Perrine Holdings',
  group2: 'the rate for hulls naming any other beneficiary',
  window: LANE_WINDOW,
  directionWords: ['often'],
})

describe('act-6-08 mission-beat rubrics', () => {
  it('the conditions beat passes its exemplar and names the narrow 10.7', () => {
    expect(gradeInterpretation(laneConditions, laneConditions.exemplar!).correct).toBe(true)
    expect(laneConditions.exemplar).toContain(fmt(SMALLEST_EXPECTED_COUNT, 1))
    // The beat exists because the pass is narrow: 900 × p̂c is just over ten.
    expect(SMALLEST_EXPECTED_COUNT).toBeGreaterThan(10)
    expect(SMALLEST_EXPECTED_COUNT).toBeLessThan(11)
  })

  it('the conclusion beat passes its exemplar and refuses agency, proof and a missing scope', () => {
    expect(gradeInterpretation(laneConclusion, laneConclusion.exemplar!).correct).toBe(true)
    for (const bad of [
      `Because P = ${fmtP(PERRINE_TEST.pValue!)} < 0.05 we reject H₀. The test proves that Perrine-beneficiary hulls are lost more often, ${LANE_WINDOW}.`,
      `Because P = ${fmtP(PERRINE_TEST.pValue!)} < 0.05 we reject H₀. There is convincing evidence that Perrine-beneficiary hulls are being targeted on the Hundred-Day Lane, ${LANE_WINDOW}.`,
      `Because P = ${fmtP(PERRINE_TEST.pValue!)} < 0.05 we reject H₀. There is convincing evidence that the true loss rate per transit for hulls whose policies name Perrine Holdings is greater than the rate for hulls naming any other beneficiary, among transits on the Hundred-Day Lane.`,
    ]) {
      expect(gradeInterpretation(laneConclusion, bad).correct, bad.slice(0, 60)).toBe(false)
    }
  })

  it('the Lane’s own arithmetic is what the beats quote', () => {
    const recomputed = twoPropTest({ x1: PERRINE_LOSSES, n1: PERRINE_TRANSITS, x2: OTHER_LOSSES, n2: OTHER_TRANSITS, alt: 'greater', random: true })
    expect(recomputed.statistic).toBeCloseTo(PERRINE_TEST.statistic, 10)
    expect(recomputed.pValue!).toBeCloseTo(PERRINE_TEST.pValue!, 12)
    expect(PERRINE_TEST.statistic).toBeGreaterThan(3)
    expect(PERRINE_TEST.statistic).toBeLessThan(3.3)
  })
})
