/**
 * Act VI dataset tests — every headline number in the beat sheet's registry for Act VI, asserted
 * against what `data.ts` actually produces. If one of these moves, a module's beat has moved with it.
 */
import { describe, expect, it } from 'vitest'
import {
  ALTERNATIVE_COMPARABLE,
  ALTERNATIVE_DOUBLING,
  DIFFERENCE_INTERVAL,
  LANE_INTERVAL,
  LANE_LOSSES,
  LANE_TRANSITS,
  MARGIN_AFTER_THREE_YEARS,
  OTHER_BENEFICIARIES,
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_HOLDINGS,
  PERRINE_LOSSES,
  PERRINE_PAYOUT_TOTAL,
  PERRINE_TEST,
  PERRINE_TRANSITS,
  POOLED_RATE,
  POWER_AT_01,
  POWER_AT_05,
  POWER_COMPARABLE_05,
  ROOK_BASELINE,
  SMALLEST_EXPECTED_COUNT,
  TRANSITS_FOR_TARGET_MARGIN,
  TRANSITS_PER_YEAR,
  YEARS_FOR_TARGET_MARGIN,
  beneficiaryTable,
  claims,
  intervalClears,
  laneInterval,
  perrineClaims,
  powerAgainst,
  simulateNullZ,
  simulatedPValue,
} from './data'
import { BOARD_TABLE, rateOf } from '@/instruments/act-5/data'

describe('DS-09 counted by beneficiary class (Act VI reads the Act V Ledger, never re-derives it)', () => {
  it('is 19 losses in 900 Perrine-beneficiary transits against 12 in 1,712', () => {
    expect(PERRINE_LOSSES).toBe(19)
    expect(PERRINE_TRANSITS).toBe(900)
    expect(OTHER_LOSSES).toBe(12)
    expect(OTHER_TRANSITS).toBe(1712)
    expect(LANE_LOSSES).toBe(31)
    expect(LANE_TRANSITS).toBe(2612)
  })

  it('builds a 2×2 whose margins are the Ledger', () => {
    const [perrine, other] = beneficiaryTable
    expect(perrine.beneficiary).toBe(PERRINE_HOLDINGS)
    expect(perrine.lost + perrine.arrived).toBe(900)
    expect(other.lost + other.arrived).toBe(1712)
    expect(perrine.lost + other.lost).toBe(31)
  })
})

describe('DS-10 · the claims register', () => {
  it('has 31 rows, Perrine Holdings on nineteen and eleven owners on the rest', () => {
    expect(claims).toHaveLength(31)
    expect(perrineClaims).toHaveLength(19)
    expect(OTHER_BENEFICIARIES).toHaveLength(11)
  })

  it('has paid Perrine Holdings about 2.1 billion credits over six years', () => {
    expect(PERRINE_PAYOUT_TOTAL / 1000).toBeGreaterThan(2.05)
    expect(PERRINE_PAYOUT_TOTAL / 1000).toBeLessThan(2.15)
  })

  it('insures every Perrine-beneficiary hull with Tharsis Mutual and pays after the loss', () => {
    for (const c of perrineClaims) {
      expect(c.insurer).toBe('Tharsis Mutual')
      expect(Date.parse(c.date_paid)).toBeGreaterThan(0)
    }
  })

  it('joins the register one-to-one: every claim names a distinct hull', () => {
    expect(new Set(claims.map((c) => c.hull)).size).toBe(31)
  })
})

describe('act-6-01 / act-6-02 · the Lane rate with an honest margin', () => {
  it('puts the Lane rate at 1.19 % with a 95 % interval of about (0.0077, 0.0160)', () => {
    expect(LANE_LOSSES / LANE_TRANSITS).toBeCloseTo(0.0119, 4)
    const [lo, hi] = LANE_INTERVAL.ci!
    expect(lo).toBeCloseTo(0.0077, 3)
    expect(hi).toBeCloseTo(0.016, 3)
  })

  it('clears Rook’s 0.5 % baseline and does not clear the Board’s 1.1 % corridor', () => {
    expect(ROOK_BASELINE).toBeCloseTo(0.005, 3)
    expect(intervalClears(ROOK_BASELINE)).toBe(true)
    expect(intervalClears(rateOf(BOARD_TABLE.marsBelt))).toBe(false)
  })

  it('widens with the confidence level and never with a claim about the data', () => {
    const width = (c: number) => laneInterval(c).ci![1] - laneInterval(c).ci![0]
    expect(width(0.99)).toBeGreaterThan(width(0.95))
    expect(width(0.95)).toBeGreaterThan(width(0.9))
  })

  it('needs about 11,300 transits — twenty more years — for a two-tenths-of-a-point margin', () => {
    expect(TRANSITS_FOR_TARGET_MARGIN).toBeGreaterThan(11000)
    expect(TRANSITS_FOR_TARGET_MARGIN).toBeLessThan(11600)
    expect(YEARS_FOR_TARGET_MARGIN).toBeGreaterThan(18)
    expect(YEARS_FOR_TARGET_MARGIN).toBeLessThan(22)
    expect(TRANSITS_PER_YEAR).toBe(435)
  })

  it('buys a margin of about a third of a point with three more seasons', () => {
    expect(MARGIN_AFTER_THREE_YEARS).toBeGreaterThan(0.003)
    expect(MARGIN_AFTER_THREE_YEARS).toBeLessThan(0.0037)
  })
})

describe('act-6-03 … act-6-08 · the two-proportion case', () => {
  it('pools at 31/2,612 and passes the large-counts condition narrowly, at 10.7', () => {
    expect(POOLED_RATE).toBeCloseTo(31 / 2612, 10)
    expect(SMALLEST_EXPECTED_COUNT).toBeCloseTo(10.7, 1)
    expect(SMALLEST_EXPECTED_COUNT).toBeGreaterThan(10)
    expect(SMALLEST_EXPECTED_COUNT).toBeLessThan(11)
  })

  it('gives z ≈ 3.16 and a one-sided p ≈ 0.0008', () => {
    expect(PERRINE_TEST.statistic).toBeCloseTo(3.16, 2)
    expect(PERRINE_TEST.pValue!).toBeGreaterThan(0.0005)
    expect(PERRINE_TEST.pValue!).toBeLessThan(0.0012)
    expect(PERRINE_TEST.alternative).toBe('greater')
  })

  it('reports every condition of the test as met', () => {
    expect(PERRINE_TEST.conditions.every((c) => c.met)).toBe(true)
  })

  it('gives a 95 % difference interval of about (0.004, 0.024), unpooled and clear of zero', () => {
    const [lo, hi] = DIFFERENCE_INTERVAL.ci!
    expect(lo).toBeCloseTo(0.004, 3)
    expect(hi).toBeCloseTo(0.024, 3)
    expect(lo).toBeGreaterThan(0)
    // The interval's SE is unpooled and therefore not the test's SE.
    expect(DIFFERENCE_INTERVAL.se).not.toBeCloseTo(PERRINE_TEST.se, 5)
  })
})

describe('act-6-06 · power', () => {
  it('is 0.90 at α = 0.05 and 0.76 at α = 0.01 against 0.021 vs 0.007', () => {
    expect(POWER_AT_05.power).toBeCloseTo(0.9, 2)
    expect(POWER_AT_01.power).toBeCloseTo(0.76, 2)
    expect(POWER_AT_05.beta).toBeCloseTo(1 - POWER_AT_05.power, 10)
  })

  it('is about 0.08 against the Board’s "comparable corridors" gap', () => {
    expect(POWER_COMPARABLE_05.power).toBeGreaterThan(0.05)
    expect(POWER_COMPARABLE_05.power).toBeLessThan(0.12)
  })

  it('rises with α and with the size of the difference', () => {
    expect(powerAgainst(ALTERNATIVE_DOUBLING, 0.1).power).toBeGreaterThan(POWER_AT_05.power)
    expect(powerAgainst(ALTERNATIVE_DOUBLING, 0.05).power).toBeGreaterThan(powerAgainst(ALTERNATIVE_COMPARABLE, 0.05).power)
  })
})

describe('simulation reconciles with the normal model', () => {
  it('puts the simulated one-sided p within a whisker of the normal p', () => {
    const stats = simulateNullZ('test', 20000)
    const p = simulatedPValue(stats, PERRINE_TEST.statistic)
    expect(p).toBeLessThan(0.004)
    expect(Math.abs(p - PERRINE_TEST.pValue!)).toBeLessThan(0.002)
  })

  it('is deterministic in the seed', () => {
    expect(simulateNullZ('a', 50)).toEqual(simulateNullZ('a', 50))
    expect(simulateNullZ('a', 50)).not.toEqual(simulateNullZ('b', 50))
  })
})
