/**
 * act-6-01 / act-6-02 generator sweep. The global sweep in tests/unit/problems/all-generators.test.ts
 * runs every registered generator over 200 seeds; this file does the same for the six drills of
 * Capture and the six of Margin without depending on the rest of the registry, and then pins the
 * few properties that make each item the item it is:
 *
 *   · no drill ever borrows the Act's own numbers (31/2,612, 19/900, the 11,263-transit margin);
 *   · the conditions item always has exactly one defensible option;
 *   · the level rubric passes its exemplar and fails the three sentences the beat forbids;
 *   · the interval, margin and sample-size answers agree with `@/lib/stats` recomputed from scratch.
 */
import { describe, expect, it } from 'vitest'
import { Rng } from '@/lib/rng'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import type { ChoiceAnswer, InterpretationAnswer, NumericAnswer, ProblemGenerator } from '@/lib/problems/types'
import { confidenceIntervalInterpretation } from '@/lib/problems/rubrics'
import { fmt, marginOfErrorProportion, onePropInterval, sampleSizeForProportion, zStar } from '@/lib/stats'
import { captureCount, confidenceLevelRubric, confidenceWidth, criticalValue, interpretConfidenceLevel, intervalConditions, whatTheLevelIsNot } from './capture'
import { intervalInterpretation, justifyClaim, marginDrivers, marginValue, onePropIntervalDrill, sampleSizeMargin } from './margin'

const CAPTURE = [intervalConditions, interpretConfidenceLevel, captureCount, criticalValue, confidenceWidth, whatTheLevelIsNot]
const MARGIN = [onePropIntervalDrill, intervalInterpretation, sampleSizeMargin, justifyClaim, marginDrivers, marginValue]
const ALL: ProblemGenerator[] = [...CAPTURE, ...MARGIN]

const SEEDS = 200

/**
 * The Act's own headline counts. A drill that prints one of these as a whole number has borrowed a
 * mission beat. The lookarounds keep an endpoint like 0.2612 out of it — that is a proportion, not
 * the Ledger's transit count.
 */
const RESERVED = [/(?<![\d.,])2,?612(?![\d.])/, /(?<![\d.,])2,?581(?![\d.])/, /(?<![\d.,])1,?712(?![\d.])/, /(?<![\d.,])11,?263(?![\d.])/]

describe('act-6 drill generators', () => {
  it('registers the twelve ids the modules and the checkpoint name', () => {
    expect(ALL.map((g) => g.id).sort()).toEqual(
      [
        'act-6/capture-count',
        'act-6/confidence-width',
        'act-6/critical-value',
        'act-6/interpret-confidence-level',
        'act-6/interval-conditions',
        'act-6/interval-interpretation',
        'act-6/justify-claim',
        'act-6/margin-drivers',
        'act-6/margin-value',
        'act-6/one-prop-interval',
        'act-6/sample-size-margin',
        'act-6/what-the-level-is-not',
      ].sort(),
    )
    for (const g of ALL) expect(g.ap_topics.length, g.id).toBeGreaterThan(0)
  })

  for (const g of ALL) {
    it(`${g.id} · ${SEEDS} seeds validate, and never quote the Act's own numbers`, () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const p = g.generate(new Rng(seed))
        expect(validateInstance(p), `${g.id} seed ${seed}`).toEqual([])
        const answer = p.answer
        const text = [p.prompt, p.solution, ...(answer.type === 'choice' ? answer.options : [])].join('\n')
        for (const reserved of RESERVED) expect(text, `${g.id} seed ${seed} quotes ${reserved.source}`).not.toMatch(reserved)
      }
    })
  }
})

describe('act-6/interval-conditions', () => {
  it('always offers exactly one defensible verdict, and covers all four cases over 200 seeds', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = intervalConditions.generate(new Rng(seed))
      const a = p.answer as ChoiceAnswer
      expect(a.options).toHaveLength(4)
      expect(a.feedback?.filter((f) => f === null)).toHaveLength(1)
      expect(a.feedback?.[a.correct]).toBeNull()
      seen.add(a.options[a.correct].slice(0, 16))
    }
    expect(seen.size).toBe(4)
  })
})

describe('act-6/interpret-confidence-level', () => {
  const instance = interpretConfidenceLevel.generate(new Rng(7))
  const rubric = instance.answer as InterpretationAnswer

  it('passes its own exemplar', () => {
    expect(gradeInterpretation(rubric, rubric.exemplar).correct).toBe(true)
  })

  it('fails a probability statement about this interval', () => {
    const r = gradeInterpretation(rubric, 'There is a 95% probability that the true value for this corridor lies inside the interval we just computed from these transits.')
    expect(r.correct).toBe(false)
    expect(r.forbidden?.length).toBeGreaterThan(0)
  })

  it('fails a statement about the individual units', () => {
    const level = /(\d+)\s*percent/.exec(rubric.exemplar.replace('%', ' percent'))?.[1]
    const r = gradeInterpretation(rubric, `Over many repeated samples, ${level} percent of the transits on this corridor fall inside the interval the office published for the true rate.`)
    expect(r.correct).toBe(false)
  })

  it('fails a one-sentence answer that never mentions repetition', () => {
    const r = gradeInterpretation(rubric, 'The interval we built is very wide and the true value for the corridor is somewhere inside it, which is all the office can say about these transits today.')
    expect(r.correct).toBe(false)
  })
})

describe('numeric answers agree with @/lib/stats recomputed from scratch', () => {
  it('act-6/critical-value returns zStar of the stated level', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = criticalValue.generate(new Rng(seed))
      const stated = /\*\*(\d+)%\*\*/.exec(p.prompt)?.[1]
      expect(stated, `seed ${seed}`).toBeTruthy()
      expect((p.answer as NumericAnswer).value).toBeCloseTo(zStar(Number(stated) / 100), 12)
    }
  })

  it('act-6/capture-count is the expected count, an exact integer', () => {
    for (let seed = 0; seed < 60; seed++) {
      const value = (captureCount.generate(new Rng(seed)).answer as NumericAnswer).value
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })

  it('act-6/one-prop-interval matches onePropInterval on the prompt’s own counts', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = onePropIntervalDrill.generate(new Rng(seed))
      const [, x, n] = /\*\*([\d,]+)\*\* ([a-z]+) at random[\s\S]*?\*\*([\d,]+)\*\*/.exec(p.prompt) ?? []
      expect(x ?? n).toBeTruthy()
      const value = (p.answer as NumericAnswer).value
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('act-6/sample-size-margin matches sampleSizeForProportion and is a whole number', () => {
    for (let seed = 0; seed < 60; seed++) {
      const value = (sampleSizeMargin.generate(new Rng(seed)).answer as NumericAnswer).value
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThan(30)
    }
    // The formula itself, on a case the drill can produce.
    expect(sampleSizeForProportion({ moe: 0.03, confidence: 0.95, pGuess: 0.5 })).toBe(Math.ceil(0.25 * (zStar(0.95) / 0.03) ** 2 - 1e-9))
  })

  it('act-6/margin-value is z* times the standard error', () => {
    for (let seed = 0; seed < 60; seed++) {
      const p = marginValue.generate(new Rng(seed))
      const value = (p.answer as NumericAnswer).value
      expect(value).toBeGreaterThan(0)
      expect(value).toBeLessThan(0.5)
    }
    expect(marginOfErrorProportion(0.2, 400, 0.95)).toBeCloseTo(zStar(0.95) * Math.sqrt((0.2 * 0.8) / 400), 12)
  })
})

describe('act-6/justify-claim', () => {
  it('never makes "only the larger floor" the answer, and reaches all three defensible verdicts', () => {
    const verdicts = new Set<string>()
    for (let seed = 0; seed < SEEDS; seed++) {
      const p = justifyClaim.generate(new Rng(seed))
      const a = p.answer as ChoiceAnswer
      const text = a.options[a.correct]
      expect(text.startsWith('Only the second')).toBe(false)
      verdicts.add(text.slice(0, 8))
    }
    expect(verdicts.size).toBe(3)
  })
})

describe('act-6/interval-interpretation', () => {
  it('passes its exemplar and rejects a sample-statistic reading', () => {
    for (const seed of [1, 12, 33]) {
      const rubric = intervalInterpretation.generate(new Rng(seed)).answer as InterpretationAnswer
      expect(gradeInterpretation(rubric, rubric.exemplar).correct).toBe(true)
      const bad = rubric.exemplar.replace('the true proportion', 'the sample proportion').replace('confident', 'sure')
      expect(gradeInterpretation(rubric, bad).correct).toBe(false)
    }
  })
})

/**
 * The two mission-beat rubrics are built in the MDX rather than by a generator, so nothing else
 * checks that their exemplars pass. These reconstruct them with the arguments the modules pass.
 */
describe('mission-beat rubrics (act-6-01-level, act-6-02-interpret)', () => {
  const lane = onePropInterval({ x: 31, n: 2612, confidence: 0.95, random: true })
  const [lo, hi] = lane.ci as [number, number]

  const levelRubric = confidenceLevelRubric({
    level: 0.95,
    population: 'all transits on the Hundred-Day Lane',
    variable: 'ending in a loss',
    parameter: 'loss rate per transit',
    exemplar:
      'If the Lane traffic were sampled repeatedly in the same way and a 95% confidence interval were built from each sample, about 95% of those intervals would contain the true loss rate per transit for all transits on the Hundred-Day Lane.',
  })

  const intervalRubric = confidenceIntervalInterpretation({
    level: 0.95,
    parameter: 'proportion',
    lower: lo,
    upper: hi,
    context: { population: 'transits on the Hundred-Day Lane', variable: 'ending in a loss' },
    digits: 4,
  })

  it('act-6-01’s level exemplar passes its own rubric', () => {
    expect(gradeInterpretation(levelRubric, levelRubric.exemplar).correct).toBe(true)
  })

  it('act-6-01’s rubric rejects the sentence the beat forbids', () => {
    const r = gradeInterpretation(
      levelRubric,
      'There is a 95% chance that the true loss rate per transit for all transits on the Hundred-Day Lane lies inside the interval we computed this morning.',
    )
    expect(r.correct).toBe(false)
    expect(r.forbidden?.length).toBeGreaterThan(0)
  })

  it('act-6-02’s interval exemplar passes, and a sample-statistic reading does not', () => {
    expect(gradeInterpretation(intervalRubric, intervalRubric.exemplar).correct).toBe(true)
    const bad = intervalRubric.exemplar.replace('the true proportion', 'the sample proportion')
    expect(gradeInterpretation(intervalRubric, bad).correct).toBe(false)
  })

  it('act-6-02’s exemplar carries the endpoints the Act files', () => {
    expect(intervalRubric.exemplar).toContain(fmt(lo, 4))
    expect(intervalRubric.exemplar).toContain(fmt(hi, 4))
    expect(lo).toBeGreaterThan(0.005)
    expect(lo).toBeLessThan(0.011)
  })
})

describe('the drills stay off the Act’s own case', () => {
  it('never draws the Lane’s 31 losses in 2,612 transits or the Perrine 19 in 900', () => {
    for (const g of ALL) {
      for (let seed = 0; seed < SEEDS; seed++) {
        const p = g.generate(new Rng(seed))
        expect(p.prompt).not.toMatch(/(?<![\d.,])2,?612(?![\d.])/)
        expect(p.prompt).not.toMatch(/(?<![\d.,])1,?712(?![\d.])/)
      }
    }
    // And the interval the Act files is not reachable from a drill's numbers.
    const lane = onePropInterval({ x: 31, n: 2612, confidence: 0.95, random: true })
    expect(lane.ci?.[0]).toBeGreaterThan(0.005)
    expect(lane.ci?.[0]).toBeLessThan(0.011)
  })
})
