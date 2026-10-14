/**
 * Epilogue datasets. Two jobs.
 *
 * 1. DS-20's headline numbers: the posteriors 0.27 and 0.82, and the fact that they come from one
 *    signature read against two base rates and nothing else.
 * 2. The findings ledger is a *view* of earlier Acts, not a second copy of them. Each row is
 *    asserted against the Act that produced it, and against the registry figure the Epilogue's
 *    prose quotes in words. A dataset change upstream fails here rather than making the prose a lie.
 */
import { describe, expect, it } from 'vitest'
import { PERRINE_TEST as ACT6_PERRINE_TEST, powerAgainst as act6Power, ALTERNATIVE_DOUBLING as ACT6_ALT } from '@/instruments/act-6/data'
import { REFIT_PAIRED as ACT7_PAIRED } from '@/instruments/act-7/data'
import { BENEFICIARY_TEST as ACT8_BENEFICIARY, CARGO_GOF as ACT8_CARGO, CORRIDOR_TEST as ACT8_CORRIDOR } from '@/instruments/act-8/data'
import { COVER_HULLS as ACT8_COVER_HULLS } from '@/instruments/act-8/data'
import {
  BASE_RATE_ASSUMED,
  BASE_RATE_MEASURED,
  COVER_LIST,
  COVER_N,
  DIVERTED_N,
  EXAMINER_BOUND,
  FREQUENCY_BASE,
  PICKET,
  POSTERIOR_ASSUMED,
  POSTERIOR_MEASURED,
  PRESPECIFIED_ALPHA,
  P_SIGNATURE_GIVEN_BENIGN,
  P_SIGNATURE_GIVEN_HOSTILE,
  REVIEW_LEVELS,
  findingById,
  findings,
  frequencyBox,
  posterior,
  posteriorCurve,
  survivesAt,
  survivorCount,
} from './data'

describe('DS-20 · the Phobos signature', () => {
  it('carries the registry inputs unchanged', () => {
    expect(P_SIGNATURE_GIVEN_HOSTILE).toBe(0.9)
    expect(P_SIGNATURE_GIVEN_BENIGN).toBe(0.05)
    expect(BASE_RATE_MEASURED).toBe(0.02)
    expect(BASE_RATE_ASSUMED).toBe(0.2)
  })

  it('reproduces the registry posteriors: 0.27 at the measured rate, 0.82 at the assumed one', () => {
    expect(POSTERIOR_MEASURED.posterior).toBeCloseTo(0.27, 2)
    expect(POSTERIOR_ASSUMED.posterior).toBeCloseTo(0.82, 2)
  })

  it('is a ratio of one joint to the evidence, and the joints sum to the evidence', () => {
    const r = posterior(0.02)
    expect(r.jointHostile + r.jointBenign).toBeCloseTo(r.evidence, 12)
    expect(r.jointHostile / r.evidence).toBeCloseTo(r.posterior, 12)
  })

  it('leaves the posterior at the false-alarm rate when nothing hostile is ever happening', () => {
    expect(posterior(0).posterior).toBe(0)
    expect(posterior(1).posterior).toBe(1)
  })

  it('rises monotonically in the base rate, which is the whole of the Book Two question', () => {
    const curve = posteriorCurve(P_SIGNATURE_GIVEN_HOSTILE, P_SIGNATURE_GIVEN_BENIGN, 40)
    for (let i = 1; i < curve.length; i++) expect(curve[i].posterior).toBeGreaterThanOrEqual(curve[i - 1].posterior)
    expect(curve[0].posterior).toBe(0)
    expect(curve[curve.length - 1].posterior).toBe(1)
  })

  it('counts out to the same number as natural frequencies', () => {
    const box = frequencyBox(BASE_RATE_MEASURED)
    expect(box.hostile + box.benign).toBe(FREQUENCY_BASE)
    expect(box.hostileWithSignature / box.withSignature).toBeCloseTo(POSTERIOR_MEASURED.posterior, 12)
    /* 200 hostile yard-months in ten thousand; 180 of them show the signature; 490 benign ones do too. */
    expect(box.hostile).toBeCloseTo(200, 6)
    expect(box.hostileWithSignature).toBeCloseTo(180, 6)
    expect(box.benignWithSignature).toBeCloseTo(490, 6)
  })
})

describe('the findings ledger', () => {
  it('is a view of the earlier Acts and not a second computation of them', () => {
    expect(findingById('rate').statistic).toBe(ACT6_PERRINE_TEST.statistic)
    expect(findingById('rate').pValue).toBe(ACT6_PERRINE_TEST.pValue)
    expect(findingById('beneficiary').statistic).toBe(ACT8_BENEFICIARY.statistic)
    expect(findingById('cargo').statistic).toBe(ACT8_CARGO.statistic)
    expect(findingById('corridor').statistic).toBe(ACT8_CORRIDOR.statistic)
    expect(findingById('uprate').statistic).toBe(ACT7_PAIRED.statistic)
  })

  it('holds the registry headline for the accusation: z ≈ 3.16, one-sided P ≈ 0.0008', () => {
    const rate = findingById('rate')
    expect(rate.statistic).toBeCloseTo(3.16, 1)
    expect(rate.pValue).toBeCloseTo(0.0008, 4)
  })

  it('records that the beneficiary table is the accusation restated: χ² = z² on a 2 × 2', () => {
    const rate = findingById('rate')
    const table = findingById('beneficiary')
    expect(table.statistic).toBeCloseTo(rate.statistic ** 2, 6)
    expect(table.df).toBe(1)
    expect(table.limitation).toMatch(/square of/i)
  })

  it('marks exactly one finding whose conditions do not hold, and it is the examiner table', () => {
    const failed = findings.filter((f) => !f.conditionsHold)
    expect(failed.map((f) => f.id)).toEqual(['examiner'])
    expect(EXAMINER_BOUND).toBe(1 / 10_000)
  })

  it('never lets a level rescue the finding whose procedure does not apply', () => {
    for (const level of REVIEW_LEVELS) expect(survivesAt(findingById('examiner'), level)).toBe(false)
  })

  it('loses findings as the reviewer tightens, and the accusation is one of them', () => {
    const strictest = REVIEW_LEVELS[0]
    const loosest = REVIEW_LEVELS[REVIEW_LEVELS.length - 1]
    expect(survivorCount(loosest)).toBeGreaterThan(survivorCount(strictest))
    expect(survivesAt(findingById('rate'), PRESPECIFIED_ALPHA)).toBe(true)
    expect(survivesAt(findingById('rate'), 0.0005)).toBe(false)
  })

  it('offers 0.01 and 0.05 as exact stops on the reviewer’s slider', () => {
    expect(REVIEW_LEVELS).toContain(0.01)
    expect(REVIEW_LEVELS).toContain(0.05)
    expect(PRESPECIFIED_ALPHA).toBe(0.01)
  })

  it('gives every finding a scope and a limitation, because that is what the column is for', () => {
    for (const f of findings) {
      expect(f.scope.length).toBeGreaterThan(20)
      expect(f.limitation.length).toBeGreaterThan(20)
      expect(f.conditions.length).toBeGreaterThan(0)
    }
    expect(findings).toHaveLength(6)
  })
})

describe('the dispositions the Epilogue states in words', () => {
  /**
   * The sitting list prints the cover losses by name and the prose never types their number, so the
   * count has to come from act-8 or the page is a guess. Nineteen is the same contract for the
   * Register amendment Rook initials at the yard.
   */
  it('takes the charge sheet from act-8 and counts four cover losses', () => {
    expect(COVER_N).toBe(4)
    expect(COVER_N).toBe(ACT8_COVER_HULLS.length)
    expect(COVER_LIST).toBe(ACT8_COVER_HULLS.join(', '))
    expect(COVER_LIST).toMatch(/Thessaly Ember/)
  })

  it('holds the nineteen diverted hulls the Register amendment strikes out', () => {
    expect(DIVERTED_N).toBe(19)
  })
})

describe('what the level cost, and what the decision risked', () => {
  it('reproduces the registry power figures: 0.76 at α = 0.01, 0.90 at α = 0.05', () => {
    expect(act6Power(ACT6_ALT, 0.01).power).toBeCloseTo(0.76, 2)
    expect(act6Power(ACT6_ALT, 0.05).power).toBeCloseTo(0.9, 2)
  })

  it('carries the picket exposure the hearing asks about: thirty percent, unchanged from Kettle', () => {
    expect(PICKET.canRespond).toBeCloseTo(0.3, 10)
    expect(PICKET.present * PICKET.onPicketGivenPresent).toBeCloseTo(PICKET.canRespond, 12)
    expect(PICKET.slugFlightMin).toBeCloseTo(10, 6)
    expect(PICKET.torchFromWatchMin).toBe(22)
    expect(PICKET.rangeKm).toBe(38_000)
  })
})
