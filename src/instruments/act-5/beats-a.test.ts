import { describe, expect, it } from 'vitest'
import { grade } from '@/lib/problems/grade'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import { PATROL_N, PATROL_SD, cuttersDisagreeRubric } from './beats-a'

const rubrics = {
  cuttersDisagree: cuttersDisagreeRubric(),
}

describe('Act V beat rubrics (module writer A)', () => {
  for (const [name, r] of Object.entries(rubrics)) {
    it(`${name}: the exemplar passes its own rubric`, () => {
      const g = grade(r, r.exemplar)
      expect(g.correct, g.feedback + JSON.stringify(g.rubric?.filter((x) => !x.met))).toBe(true)
      expect(validateInstance({ prompt: 'x', hints: ['a', 'b'], solution: r.exemplar, answer: r })).toEqual([])
    })
  }

  it('the magnitude is the SD of a patrol loss rate at n = 400', () => {
    expect(PATROL_N).toBe(400)
    expect(PATROL_SD).toBeGreaterThan(0.002)
    expect(PATROL_SD).toBeLessThan(0.006)
  })

  it('rejects an answer that accuses a cutter', () => {
    const r = rubrics.cuttersDisagree
    const g = gradeInterpretation(
      r,
      'Asgard saw 410 transits and Tindr saw 380, so each reported a statistic and the Lane loss rate is the parameter. One of the cutters is lying, because sampling variability at 400 transits is only about 0.0034.',
    )
    expect(g.correct).toBe(false)
  })

  it('rejects an answer with no magnitude', () => {
    const r = rubrics.cuttersDisagree
    const g = gradeInterpretation(
      r,
      'Asgard and Tindr each observed only a sample of Lane transits, so each of them reported a statistic and not the Lane parameter. Different transits give different sample proportions, so the two figures differ through sampling variability alone and neither cutter counted anything incorrectly at all.',
    )
    expect(g.correct).toBe(false)
    expect(g.feedback).toContain('size of the disagreement')
  })

  it('rejects significance-test language', () => {
    const r = rubrics.cuttersDisagree
    const g = gradeInterpretation(r, `${rubrics.cuttersDisagree.exemplar} We therefore fail to reject the null.`)
    expect(g.correct).toBe(false)
  })
})
