import { describe, expect, it } from 'vitest'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { validateInstance } from '@/lib/problems/validate'
import { LOTTERY_EXACT, PILOT_EXACT } from './data'
import { ceresBiasRubric, confoundRubric, designJustificationRubric, frameQuestionRubric, scopeRubric } from './beats'

const rubrics = {
  frameQuestion: frameQuestionRubric(),
  designJustification: designJustificationRubric(),
  ceresBias: ceresBiasRubric(),
  confound: confoundRubric(),
  scopeLottery: scopeRubric(LOTTERY_EXACT.pLess, { transits: 12, name: 'the escort lottery' }),
  scopePilot: scopeRubric(PILOT_EXACT.pLess, { transits: 6, name: 'the pilot' }),
}

describe('Act III beat rubrics', () => {
  for (const [name, r] of Object.entries(rubrics)) {
    it(`${name}: the exemplar passes its own rubric`, () => {
      const g = gradeInterpretation(r, r.exemplar)
      expect(g.correct, g.feedback + JSON.stringify(g.rubric?.filter((x) => !x.met))).toBe(true)
      expect(validateInstance({ prompt: 'x', hints: ['a', 'b'], solution: r.exemplar, answer: r })).toEqual([])
    })
  }
  it('design justification accepts each design', () => {
    const r = rubrics.designJustification
    expect(gradeInterpretation(r, 'A simple random sample of forty from the schedule: every master has an equal chance, so the estimate is unbiased, and forty contacts is about thirty-seven hours of link time — the middle cost. It may miss Sulcus masters.').correct).toBe(true)
    expect(gradeInterpretation(r, 'Cluster by convoy: six convoys share a link, so the whole survey costs Solberg about seventeen hours instead of forty. Convoys cover every owner class in the end, though a convoy shares one experience, so the estimate is noisier.').correct).toBe(true)
  })
  it('scope rubric rejects "no effect" and accepts a careful negative', () => {
    const r = rubrics.scopeLottery
    expect(gradeInterpretation(r, 'p is 0.23 so escorts have no effect on advisories; assignment was by lot; only this week; losses too rare to see.').correct).toBe(false)
    expect(gradeInterpretation(r, 'The one-sided p-value is about 0.23, so this is not convincing evidence that escorts change advisory rates; we cannot say escorts have no effect either. Because escort was assigned by lot, an effect could have been called causal. The twelve transits were not sampled from the Lane, so the result applies only to that week at Mark 6–7, and it says nothing about losses, which are far too rare to see in twelve transits.').correct).toBe(true)
  })
  it('confound rubric rejects crediting the escorts', () => {
    const r = rubrics.confound
    expect(gradeInterpretation(r, 'Owner is confounded with escort because the Mercantile houses requested the cutter, so escort and owner cannot be separated; still, escorts reduced incidents to zero on the escorted transits.').correct).toBe(false)
  })
})
