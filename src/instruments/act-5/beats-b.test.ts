/**
 * act-5-03 beat rubric — the exemplar must pass its own rubric, and the two answers this module
 * exists to refuse must fail it: a verdict written in Act VI's vocabulary, and a statement about the
 * mean of nineteen applied to one hull.
 */
import { describe, expect, it } from 'vitest'
import { grade } from '@/lib/problems/grade'
import { validateInstance } from '@/lib/problems/validate'
import { fmt } from '@/lib/stats'
import { Z_MEAN_19 } from './data'
import { theMachineRubric } from './beats-b'

const rubric = theMachineRubric()
const z = fmt(Z_MEAN_19, 2)

describe('act-5-03 · the machine beat rubric', () => {
  it('the exemplar passes its own rubric', () => {
    const g = grade(rubric, rubric.exemplar)
    expect(g.correct, g.feedback + JSON.stringify(g.rubric?.filter((r) => !r.met))).toBe(true)
    expect(validateInstance({ prompt: 'x', hints: ['a', 'b'], solution: rubric.exemplar, answer: rubric })).toEqual([])
  })

  it('refuses Act VI vocabulary', () => {
    const response = `The sampling distribution of the mean of nineteen Mark 9 delays in days is centred on the Lane mean with standard deviation sigma over root n. If those nineteen Perrine transits on the Lane had flown honestly, the mean of nineteen honest transits standardizes to ${z}, so in the long run we reject the null and the result is statistically significant. It is not noise and it does not say who is responsible.`
    const g = grade(rubric, response)
    expect(g.correct).toBe(false)
    expect(g.forbidden?.length ?? 0).toBeGreaterThan(0)
  })

  it('refuses the statement applied to a single hull', () => {
    const response = `Over repeated samples of nineteen honest Lane transits, the sampling distribution of the mean Mark 9 delay in days against the nominal plot sits at the Lane mean. For the nineteen lost Perrine hulls the mean standardizes to ${z}, and in the long run one hull that late is essentially never honest, so it is not noise and it does not say who is responsible.`
    const g = grade(rubric, response)
    expect(g.correct).toBe(false)
  })

  it('accepts a correct answer written in the learner’s own words', () => {
    const response = `What I can say is about the sampling distribution of the mean of 19 Mark 9 delays, measured in days against the nominal plot, and not about any one hull — no single one of the nineteen lost Perrine hulls is unusual. Assume those nineteen were ordinary honest transits on the Lane. Then over repeated samples of nineteen, the mean of 19 honest transits would land at least this far behind the plot about ${z} standard errors out, which happens in roughly 5 in a million of those samples. That is not sampling variability. It does not tell us which hull, or who is responsible, or why.`
    const g = grade(rubric, response)
    expect(g.correct, g.feedback + JSON.stringify(g.rubric?.filter((r) => !r.met))).toBe(true)
  })
})
