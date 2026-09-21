import { describe, expect, it } from 'vitest'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { compareCategorical, compareDistributions, describeDistribution, zScoreInterpretation } from './_rubrics'

describe('describeDistribution', () => {
  const a = describeDistribution({ variable: 'plume-power ratio', units: 'percent', population: 'the 60 Lane contacts', shape: 'symmetric', center: [100.1, 100.2], spread: [3.8, 2.8], spreadLabel: 'IQR', unusual: { kind: 'outlier', value: 109.2 } })
  it('exemplar passes', () => {
    expect(gradeInterpretation(a, a.exemplar).correct).toBe(true)
  })
  it('accepts a learner SOCS sentence and rejects the peak-as-skew error', () => {
    const good = 'The ratios of the 60 contacts are roughly symmetric, centered at a median of about 100.1 percent, with an IQR of about 3.8 percent; one contact at 109.2 percent is an outlier far to the right.'
    expect(gradeInterpretation(a, good).correct).toBe(true)
    const wrong = 'The ratios of the 60 contacts are skewed left with a peak at 100, median 100.1 percent, IQR 3.8 percent, and an outlier at 109.2 percent.'
    const r = gradeInterpretation(a, wrong)
    expect(r.correct).toBe(false)
    expect(r.forbidden?.some((f) => f.label.includes('symmetric'))).toBe(true)
  })
  it('bimodal with a gap', () => {
    const b = describeDistribution({ variable: 'time to silence', units: 'hours', population: 'the 31 lost hulls', shape: 'bimodal', center: 4.1, spread: 5.9, spreadLabel: 'IQR', unusual: { kind: 'gap', between: [0.02, 3] } })
    expect(gradeInterpretation(b, b.exemplar).correct).toBe(true)
    const two = 'Time to silence for the 31 lost hulls is bimodal: twelve hulls under a minute and nineteen between 3 and 8 hours, a gap with nothing between 0.02 and 3 hours; the median is 4.1 hours and the IQR 5.9 hours.'
    expect(gradeInterpretation(b, two).correct).toBe(true)
  })
})

describe('compareDistributions', () => {
  const c = compareDistributions({ groupA: 'the lost hulls', groupB: 'all Register incidents', variable: 'mark at last contact', units: 'Lane marks', centerA: 9.4, centerB: 6.6, spreadA: 0.6, spreadB: 5.5, shapeNote: 'The losses pile tightly at Mark 9 to 10 with a few low outliers, while all incidents are spread almost uniformly from Mark 1 to 12.' })
  it('exemplar passes', () => {
    expect(gradeInterpretation(c, c.exemplar).correct).toBe(true)
  })
  it('rejects two separate paragraphs and the wrong direction', () => {
    const separate = 'The lost hulls have a median mark of 9.4 and an IQR of 0.6. All Register incidents have a median mark of 6.6 and an IQR of 5.5. The losses are clustered.'
    const r = gradeInterpretation(c, separate)
    expect(r.correct).toBe(false)
    expect(r.rubric?.find((g) => g.label.startsWith('Uses comparative'))?.met).toBe(false)
    const good = 'The lost hulls sit later on the Lane than all Register incidents (median mark 9.4 versus 6.6), and they are far less spread out (IQR 0.6 versus 5.5 marks): the losses cluster at Mark 9 to 10 while all incidents are spread flat from Mark 1 to 12.'
    expect(gradeInterpretation(c, good).correct).toBe(true)
  })
})

describe('compareCategorical', () => {
  const c = compareCategorical({ groupA: 'the Uruk office', groupB: 'the Ceres office', category: 'unknown', propA: 19 / 23, propB: 3 / 8, variable: 'classification' })
  it('exemplar passes; a counts-only answer fails', () => {
    expect(gradeInterpretation(c, c.exemplar).correct).toBe(true)
    const good = 'Uruk coded 83% of the losses it classified as unknown, versus 38% at Ceres — a much larger share of unknown codes at the Uruk office than at the Ceres office.'
    expect(gradeInterpretation(c, good).correct).toBe(true)
    const counts = 'Uruk coded 19 losses as unknown and Ceres coded 3 as unknown, so Uruk has more unknown codes than Ceres.'
    expect(gradeInterpretation(c, counts).correct).toBe(false)
  })
})

describe('zScoreInterpretation', () => {
  const z = zScoreInterpretation({ z: 3.29, value: 109.2, mean: 100, sd: 2.8, variable: 'plume-power ratio', units: 'percent', population: 'honest Lane hulls', tail: { proportion: 0.0005, side: 'above' } })
  it('exemplar passes', () => {
    expect(gradeInterpretation(z, z.exemplar).correct).toBe(true)
  })
  it('accepts a learner sentence', () => {
    const good = 'Harpagia’s ratio of 109.2 percent is 3.29 standard deviations above the fleet mean of 100 percent; under the normal model only about 0.0005 of honest Lane hulls run that hot.'
    expect(gradeInterpretation(z, good).correct).toBe(true)
  })
})
