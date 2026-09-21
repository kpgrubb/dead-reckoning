/**
 * Act III local rubrics: every exemplar passes its own rubric, a deficient answer fails and names the
 * missing group, and each forbidden phrase trips.
 *
 * Run: npx vitest run src/lib/problems/generators/act-3
 */
import { describe, expect, it } from 'vitest'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { confoundExplanation, designJustification, scopeOfInference, scopeOfInferenceFraming } from './_rubrics'

const missing = (r: ReturnType<typeof gradeInterpretation>, fragment: string) => r.rubric?.some((g) => !g.met && !g.optional && g.label.toLowerCase().includes(fragment.toLowerCase()))

// ---------------------------------------------------------------------------------------------

describe('scopeOfInferenceFraming', () => {
  const a = scopeOfInferenceFraming({
    conclusionPopulation: 'the masters working the Adrastea feeder lane',
    frame: 'the Adrastea Transfer arrival register for the quarter',
    missing: 'masters still in transit, and hulls that diverted to Thebe Yards',
    parameter: 'the share who have logged a profile-deviation advisory',
  })

  it('exemplar passes its own rubric', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })

  it('accepts a learner sentence in the same shape', () => {
    const good =
      'To say anything about the masters working the Adrastea feeder lane you would need all of them, but the clerk could only draw from the Adrastea Transfer arrival register for that quarter. Masters still in transit and hulls that diverted to Thebe Yards are not on that register, so they had no chance of selection; the survey describes the register and cannot be generalized to the whole lane, which is what a claim about the share logging a profile-deviation advisory would need.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
  })

  it('fails a deficient answer and names the missing group', () => {
    const thin = 'The survey used the Adrastea Transfer arrival register for the quarter and found a share of masters who had logged a profile-deviation advisory on the register.'
    const r = gradeInterpretation(a, thin)
    expect(r.correct).toBe(false)
    expect(missing(r, 'leaves out')).toBe(true)
    expect(missing(r, 'no chance of selection')).toBe(true)
  })

  it('trips “proves” and “a larger sample would fix it”', () => {
    const proves = `${a.exemplar} This proves the register is unrepresentative.`
    expect(gradeInterpretation(a, proves).forbidden?.some((f) => f.label === 'Claims proof')).toBe(true)
    const bigger = `${a.exemplar} A larger sample from the same register would fix the problem.`
    const r = gradeInterpretation(a, bigger)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label.includes('larger sample'))).toBe(true)
  })

  it('does not trip the size ban when the learner correctly denies it', () => {
    const ok = `${a.exemplar} A larger sample from the same register would not repair this.`
    expect(gradeInterpretation(ok ? a : a, ok).forbidden ?? []).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------

describe('designJustification', () => {
  const a = designJustification({
    method: 'stratified',
    benefit: 'puts Perrine, Mercantile and independent masters into the sample in known numbers',
    goal: 'an estimate that holds for all three owner classes',
    hours: 41.3,
    costBasis: '45 contacts at 55 minutes each',
    tradeoff: 'more link time than a cluster sample of six convoys would cost',
  })

  it('exemplar passes its own rubric', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })

  it('fails an answer that names no cost', () => {
    const thin = 'I would take a stratified sample by owner class so that Perrine, Mercantile and independent masters are all in the sample, which is what an estimate that holds for all three owner classes requires. The trade-off is a wider interval.'
    const r = gradeInterpretation(a, thin)
    expect(r.correct).toBe(false)
    expect(missing(r, 'cost in link time')).toBe(true)
  })

  it('fails an answer that names no method', () => {
    const thin = 'It covers all three owner classes, which is what an estimate that holds for all three owner classes needs, and it costs about 41.3 hours of link time. The trade-off is more link time than the alternative.'
    const r = gradeInterpretation(a, thin)
    expect(r.correct).toBe(false)
    expect(missing(r, 'sampling method')).toBe(true)
  })

  it('trips “proves”', () => {
    const bad = `${a.exemplar} It proves the estimate is right.`
    expect(gradeInterpretation(a, bad).forbidden?.some((f) => f.label === 'Claims proof')).toBe(true)
  })

  it('works for a cluster design too', () => {
    const c = designJustification({
      method: 'cluster',
      benefit: 'takes six whole convoys and asks everyone aboard them, sharing one link per convoy',
      goal: 'the cheapest usable estimate for the corridor',
      hours: 14.6,
      costBasis: 'six first contacts at 55 minutes and 36 follow-ups at 20 minutes',
      tradeoff: 'masters in one convoy see the same stretch of the corridor, so their answers are correlated and the estimate is noisier',
    })
    expect(gradeInterpretation(c, c.exemplar).correct).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------

describe('confoundExplanation', () => {
  const a = confoundExplanation({
    lurking: 'hull age',
    treatment: 'the new radiator refit',
    treatmentNoun: 'refit',
    response: 'advisory count',
    mechanism: 'The yard fitted the new radiators to the newest hulls first, so every refitted hull was also a young hull',
  })

  it('exemplar passes its own rubric', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })

  it('fails an answer with no consequence and names the group', () => {
    const thin = 'The yard fitted the new radiators to the newest hulls first, so every refitted hull was also a young hull; hull age went with the new radiator refit and the advisory count was lower.'
    const r = gradeInterpretation(a, thin)
    expect(r.correct).toBe(false)
    expect(missing(r, 'consequence')).toBe(true)
  })

  it('trips a sentence that credits the treatment', () => {
    const bad = 'The yard fitted the new radiators to the newest hulls first, so every refitted hull was also a young hull, but the refit reduced the advisory count all the same.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label === 'Credits the treatment anyway')).toBe(true)
  })

  it('does not trip when the learner denies the credit', () => {
    expect(gradeInterpretation(a, a.exemplar).forbidden ?? []).toEqual([])
    const denied = `${a.exemplar} We cannot say the refit reduced anything.`
    expect(gradeInterpretation(a, denied).forbidden ?? []).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------

describe('scopeOfInference', () => {
  const base = {
    treatment: 'the Mark 4 reroute',
    treatmentNoun: 'reroute',
    response: 'advisory count',
    population: 'all 340 masters on the Amalthea register',
  }

  const cases = [
    { name: 'random assignment + random sample', randomAssignment: true, randomSample: true, sampleDescription: 'the 44 masters drawn at random from the Amalthea register' },
    { name: 'random assignment, volunteers', randomAssignment: true, randomSample: false, sampleDescription: 'the 28 volunteers from the Thebe yard queue' },
    { name: 'random sample, observational', randomAssignment: false, randomSample: true, sampleDescription: 'the 44 masters drawn at random from the Amalthea register' },
    { name: 'neither', randomAssignment: false, randomSample: false, sampleDescription: 'the 28 volunteers from the Thebe yard queue' },
  ] as const

  for (const c of cases) {
    it(`${c.name}: exemplar passes and trips nothing`, () => {
      const a = scopeOfInference({ ...base, randomAssignment: c.randomAssignment, randomSample: c.randomSample, sampleDescription: c.sampleDescription })
      const r = gradeInterpretation(a, a.exemplar)
      expect(r.forbidden ?? [], a.exemplar).toEqual([])
      expect(r.correct, r.feedback).toBe(true)
    })
  }

  it('flags a causal claim when nothing was assigned at random', () => {
    const a = scopeOfInference({ ...base, randomAssignment: false, randomSample: true, sampleDescription: 'the 44 masters drawn at random from the Amalthea register' })
    const bad = 'The reroute reduced the advisory count, and because the 44 masters were a random sample of all 340 masters on the Amalthea register the finding generalizes to the register.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label === 'Credits the treatment anyway')).toBe(true)
  })

  it('flags a generalization from volunteers', () => {
    const a = scopeOfInference({ ...base, randomAssignment: true, randomSample: false, sampleDescription: 'the 28 volunteers from the Thebe yard queue' })
    const bad = 'Because the Mark 4 reroute was assigned at random, the difference in advisory count can be attributed to it, and the result generalizes to all 340 masters on the Amalthea register.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label.includes('Generalizes'))).toBe(true)
  })

  it('flags refusing causation when the treatment was assigned at random', () => {
    const a = scopeOfInference({ ...base, randomAssignment: true, randomSample: true, sampleDescription: 'the 44 masters drawn at random from the Amalthea register' })
    const bad = 'The Mark 4 reroute cannot be said to cause the change in advisory count, though the 44 masters are a random sample of all 340 masters on the Amalthea register so it generalizes.'
    const r = gradeInterpretation(a, bad)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label.includes('Denies a causal'))).toBe(true)
  })

  it('fails a one-sided answer and names the missing generalization group', () => {
    const a = scopeOfInference({ ...base, randomAssignment: true, randomSample: false, sampleDescription: 'the 28 volunteers from the Thebe yard queue' })
    const thin = 'Because the Mark 4 reroute was assigned to the transits at random, a difference in advisory count can be attributed to it.'
    const r = gradeInterpretation(a, thin)
    expect(r.correct).toBe(false)
    expect(missing(r, 'Generalization')).toBe(true)
  })
})
