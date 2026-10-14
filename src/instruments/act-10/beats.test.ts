/**
 * The hearing rubric. The exemplar must pass its own rubric at both levels the book allows, and the
 * three sentences the beat exists to forbid must fail however well the rest of the answer reads.
 */
import { describe, expect, it } from 'vitest'
import { grade } from '@/lib/problems/grade'
import { hearingRubric } from './beats'

const ARGS = {
  typeIConsequence: 'this ship accused an insurer and a pension fund of something that was not happening',
  typeIIConsequence: 'the diversions went unreported and the next nineteen hulls went the way the first nineteen did',
  parameter: 'loss rate per transit',
  population: 'transits on the Hundred-Day Lane',
}

describe('hearingRubric', () => {
  for (const alpha of [0.01, 0.05]) {
    it(`accepts its own exemplar at α = ${alpha}`, () => {
      const rubric = hearingRubric({ alpha, ...ARGS })
      const result = grade(rubric, rubric.exemplar)
      expect((result.rubric ?? []).filter((g) => !g.met).map((g) => g.label), 'unmet groups').toEqual([])
      expect(result.correct).toBe(true)
    })
  }

  it('fails an otherwise complete answer that says the case was proved', () => {
    const rubric = hearingRubric({ alpha: 0.01, ...ARGS })
    const result = grade(rubric, `${rubric.exemplar} The file proved it.`)
    expect(result.correct).toBe(false)
    expect(result.feedback).toMatch(/prove/i)
  })

  it('fails an answer that reads the P-value as the probability the null is true', () => {
    const rubric = hearingRubric({ alpha: 0.01, ...ARGS })
    const result = grade(rubric, `${rubric.exemplar} The probability that the null is true is 0.0008.`)
    expect(result.correct).toBe(false)
  })

  it('rejects a bare pair of definitions with no price, no level and no scope', () => {
    const rubric = hearingRubric({ alpha: 0.01, ...ARGS })
    const result = grade(
      rubric,
      'A Type I error is rejecting a true null hypothesis. A Type II error is failing to reject a false null hypothesis. Those are the two ways a significance test can be wrong, and both of them are possible here whatever we do about it.',
    )
    expect(result.correct).toBe(false)
  })

  it('asks for the level that was actually set, not the other one', () => {
    const strict = hearingRubric({ alpha: 0.01, ...ARGS })
    const conventional = hearingRubric({ alpha: 0.05, ...ARGS })
    expect(grade(strict, conventional.exemplar).correct).toBe(false)
  })
})
