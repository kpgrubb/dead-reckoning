/**
 * DS-09 / DS-08 audit — every headline number in docs/beat-sheet.md §2 that Act V teaches on.
 * If a test here fails, the Ledger's generating story has drifted from the registry and the
 * mission-beat targets in act-5-01 … act-5-05 no longer land where the beat sheet says they do.
 */
import { describe, expect, it } from 'vitest'
import {
  BOARD_TABLE,
  CUTTERS,
  DELAY_CUTOFF_1PCT,
  GAP_1_IN_100,
  GAP_1_IN_1000,
  LANE_DELAY_MEAN,
  LANE_DELAY_SD,
  LARGE_COUNTS_PERRINE,
  LEDGER_N,
  LEDGER_SEED_ATTEMPT,
  MARK_NULL,
  NINETEEN_ABOVE_CUTOFF,
  NINETEEN_MEAN_DELAY,
  NINETEEN_N,
  NINETEEN_SD_DELAY,
  OTHER_N,
  PARENTS,
  PERRINE_N,
  POOLED_RATE,
  P_HONEST_AS_LATE,
  ROOK_2176,
  SD_DIFF_MEANS_FLEETS,
  SD_DIFF_MEANS_SMALL,
  SD_DIFF_PROPORTIONS,
  SD_PHAT_PERRINE,
  SE_MEAN_19,
  SURVIVING_PERRINE_N,
  TRANSITS_BY_OWNER,
  Z_MARK_31,
  Z_MEAN_19,
  divertedTransits,
  drawMeanDifference,
  drawPatrolStatistic,
  drawProportionDifference,
  honestTransits,
  isRateStatistic,
  ledger,
  patrolTailBelow,
  patrolTruth,
  rateOf,
  sdOfDifferenceOfMeans,
  simulatePatrols,
} from './data'
import { Rng } from '@/lib/rng'
import { mean, sd } from '@/lib/stats'
import { parentMean, parentSd, simulate } from '@/lib/sim'

describe('DS-09 · the Transit Ledger', () => {
  it('is 2,612 transits split 900 / 1,100 / 612 by owner class', () => {
    expect(ledger.length).toBe(LEDGER_N)
    for (const owner of ['Perrine', 'Mercantile', 'independent'] as const) {
      expect(ledger.filter((t) => t.ownerClass === owner).length).toBe(TRANSITS_BY_OWNER[owner])
    }
    expect(PERRINE_N + OTHER_N).toBe(LEDGER_N)
  })

  it('carries 31 losses — 19 Perrine (2.11 %) and 12 others (0.70 %)', () => {
    const lost = ledger.filter((t) => t.lost)
    expect(lost.length).toBe(31)
    const perrineLost = lost.filter((t) => t.ownerClass === 'Perrine')
    expect(perrineLost.length).toBe(19)
    expect(lost.length - perrineLost.length).toBe(12)
    expect(perrineLost.length / PERRINE_N).toBeCloseTo(0.0211, 4)
    expect((lost.length - perrineLost.length) / OTHER_N).toBeCloseTo(0.0070, 4)
    // Every diverted transit is a Perrine loss; the hidden truth never leaks into the honest set.
    expect(divertedTransits.length).toBe(19)
    expect(divertedTransits.every((t) => t.lost && t.ownerClass === 'Perrine')).toBe(true)
    expect(honestTransits.length).toBe(LEDGER_N - 19)
  })

  it('is reproducible: the accepted seed attempt is fixed and the rows are stable', () => {
    expect(LEDGER_SEED_ATTEMPT).toBeGreaterThanOrEqual(0)
    expect(ledger[0].id).toBe(0)
    expect(ledger.map((t) => t.id)).toEqual(ledger.map((_, i) => i))
  })
})

describe('DS-00 · the delay model reproduces the registry', () => {
  it('honest delays are centred on the nominal plot with fleet SD ≈ 2.66 d', () => {
    // Not exactly zero: the Perrine fleet files a hair slow, which lifts the Lane mean by ≈ 0.07.
    expect(Math.abs(LANE_DELAY_MEAN)).toBeLessThan(0.12)
    expect(LANE_DELAY_SD).toBeGreaterThan(2.54)
    expect(LANE_DELAY_SD).toBeLessThan(2.78)
    // √(2.5² + 0.9²) = 2.657: the per-hull filing offset plus run noise.
    expect(LANE_DELAY_SD).toBeCloseTo(Math.sqrt(2.5 ** 2 + 0.9 ** 2), 0)
  })

  it('the nineteen average ≈ 2.8 d late with SD ≈ 2.7 d', () => {
    expect(NINETEEN_N).toBe(19)
    expect(NINETEEN_MEAN_DELAY).toBeGreaterThan(2.55)
    expect(NINETEEN_MEAN_DELAY).toBeLessThan(3.05)
    expect(NINETEEN_SD_DELAY).toBeGreaterThan(2.2)
    expect(NINETEEN_SD_DELAY).toBeLessThan(3.2)
  })

  it('each of the nineteen is individually unremarkable: P(honest ≥ their mean) ≈ 0.15', () => {
    expect(P_HONEST_AS_LATE).toBeGreaterThan(0.12)
    expect(P_HONEST_AS_LATE).toBeLessThan(0.19)
  })

  it('the 1 % cutoff is ≈ 6.2 d and one or two of the nineteen clear it', () => {
    expect(DELAY_CUTOFF_1PCT).toBeGreaterThan(5.6)
    expect(DELAY_CUTOFF_1PCT).toBeLessThan(6.8)
    expect(NINETEEN_ABOVE_CUTOFF).toBeGreaterThanOrEqual(1)
    expect(NINETEEN_ABOVE_CUTOFF).toBeLessThanOrEqual(2)
  })

  it('their MEAN is impossible: SE ≈ 0.62 d and z ≈ 4.5', () => {
    expect(SE_MEAN_19).toBeCloseTo(0.62, 1)
    expect(Z_MEAN_19).toBeGreaterThan(4.1)
    expect(Z_MEAN_19).toBeLessThan(5.0)
  })

  it('the mark axis on all 31 losses gives z ≈ 3.5 against a uniform [1, 12] null', () => {
    expect(MARK_NULL.sd).toBeCloseTo(3.175, 3)
    expect(Z_MARK_31).toBeGreaterThan(3.0)
    expect(Z_MARK_31).toBeLessThan(4.3)
  })
})

describe('null models · proportions (act-5-04)', () => {
  it('pools to 31 / 2,612 = 1.19 %', () => {
    expect(POOLED_RATE).toBeCloseTo(0.01187, 5)
  })

  it('SD of p̂ at n = 900 is ≈ 0.0036 and the large-counts check passes narrowly at 10.7', () => {
    expect(SD_PHAT_PERRINE).toBeCloseTo(0.0036, 4)
    expect(LARGE_COUNTS_PERRINE).toBeCloseTo(10.7, 1)
    expect(LARGE_COUNTS_PERRINE).toBeGreaterThan(10)
  })

  it('SD of p̂₁ − p̂₂ under a common rate is ≈ 0.0045, so a 1-in-100 gap is ≈ 0.0104', () => {
    expect(SD_DIFF_PROPORTIONS).toBeCloseTo(0.0045, 4)
    expect(GAP_1_IN_100).toBeCloseTo(0.0104, 3)
  })

  it('a simulated stack of p̂₁ − p̂₂ under a common rate matches the formula', () => {
    const r = new Rng('act-5-test/prop-diff')
    const draws = Array.from({ length: 4000 }, () => drawProportionDifference(r, POOLED_RATE, PERRINE_N, POOLED_RATE, OTHER_N))
    expect(mean(draws)).toBeCloseTo(0, 2)
    expect(sd(draws)).toBeCloseTo(SD_DIFF_PROPORTIONS, 3)
  })
})

describe('null models · differences in means (act-5-05)', () => {
  it('SD of x̄₁ − x̄₂ is ≈ 0.11 d for 900 vs 1,712 and ≈ 0.62 d for 19 vs 881', () => {
    expect(SURVIVING_PERRINE_N).toBe(881)
    expect(SD_DIFF_MEANS_FLEETS).toBeCloseTo(0.11, 2)
    expect(SD_DIFF_MEANS_SMALL).toBeCloseTo(0.62, 1)
    // The small group carries the spread: 19 in the denominator dwarfs 881.
    expect(SD_DIFF_MEANS_SMALL).toBeGreaterThan(5 * SD_DIFF_MEANS_FLEETS)
  })

  it('a 1-in-1,000 gap in mean delay between 19 and 881 is ≈ 1.9 d', () => {
    expect(GAP_1_IN_1000).toBeGreaterThan(1.7)
    expect(GAP_1_IN_1000).toBeLessThan(2.1)
  })

  it('variances add: the helper agrees with a simulated stack', () => {
    const r = new Rng('act-5-test/mean-diff')
    const draws = Array.from({ length: 3000 }, () => drawMeanDifference(r, 0, LANE_DELAY_SD, 19, 0, LANE_DELAY_SD, 881))
    expect(sd(draws)).toBeCloseTo(sdOfDifferenceOfMeans(LANE_DELAY_SD, 19, LANE_DELAY_SD, 881), 1)
    expect(sdOfDifferenceOfMeans(3, 9, 4, 16)).toBeCloseTo(Math.sqrt(1 + 1), 10)
  })
})

describe('DS-08 · cutters and corridor baselines', () => {
  it('quotes the Board’s table exactly', () => {
    expect(rateOf(BOARD_TABLE.lane)).toBeCloseTo(0.0119, 4)
    expect(rateOf(BOARD_TABLE.marsBelt)).toBeCloseTo(0.0110, 4)
    expect(rateOf(ROOK_2176)).toBeCloseTo(0.0050, 4)
    expect(CUTTERS.asgard.losses).toBe(3)
    expect(CUTTERS.tindr.losses).toBe(1)
  })

  it('makes both cutters ordinary under the Lane rate and both comfortable under 0.5 %', () => {
    expect(patrolTailBelow(CUTTERS.asgard, 0.0119)).toBeCloseTo(0.28, 1)
    expect(patrolTailBelow(CUTTERS.tindr, 0.0119)).toBeCloseTo(0.06, 1)
    expect(patrolTailBelow(CUTTERS.asgard, 0.005)).toBeCloseTo(0.85, 1)
    expect(patrolTailBelow(CUTTERS.tindr, 0.005)).toBeCloseTo(0.43, 1)
  })
})

describe('patrol sampling machinery (act-5-01)', () => {
  it('centres the loss rate of a patrol on the Lane truth and biases the min-of-two low', () => {
    const truth = patrolTruth('rate')
    expect(truth).toBeCloseTo(POOLED_RATE, 6)
    const r = new Rng('act-5-test/patrols')
    const single = simulatePatrols(r, 'rate', 400, 1500)
    const minTwo = simulatePatrols(r, 'minOfTwo', 400, 1500)
    const maxTwo = simulatePatrols(r, 'maxOfTwo', 400, 1500)
    expect(mean(single)).toBeCloseTo(truth, 3)
    expect(mean(minTwo)).toBeLessThan(truth)
    expect(mean(maxTwo)).toBeGreaterThan(truth)
    // The Board's statistic is biased low by construction, and not by a rounding error.
    expect(truth - mean(minTwo)).toBeGreaterThan(0.001)
  })

  it('shrinks the spread of the sample loss rate as n grows', () => {
    const r = new Rng('act-5-test/spread')
    const small = sd(simulatePatrols(r, 'rate', 100, 1200))
    const large = sd(simulatePatrols(r, 'rate', 1600, 1200))
    expect(large).toBeLessThan(small / 2)
  })

  it('labels rate statistics apart from delay statistics', () => {
    expect(isRateStatistic('rate')).toBe(true)
    expect(isRateStatistic('minOfTwo')).toBe(true)
    expect(isRateStatistic('meanDelay')).toBe(false)
    const r = new Rng('act-5-test/one-draw')
    expect(Number.isFinite(drawPatrolStatistic(r, 'medianDelay', 50))).toBe(true)
  })
})

describe('CLT machine parents (act-5-03)', () => {
  it('every parent is a registered simulation parent with a finite μ and σ', () => {
    for (const p of PARENTS) {
      expect(parentSd(p.params)).toBeGreaterThan(0)
      expect(Number.isFinite(parentMean(p.params))).toBe(true)
    }
  })

  it('the sampling distribution of x̄ centres on μ with SD σ/√n for every parent', () => {
    for (const p of PARENTS) {
      const n = 30
      const xs = simulate('sample-mean', { ...p.params, n }, 4242, 3000)
      expect(mean(xs)).toBeCloseTo(parentMean(p.params), 1)
      expect(sd(xs) / (parentSd(p.params) / Math.sqrt(n))).toBeCloseTo(1, 1)
    }
  })

  it('the Lane-delay parent is the Ledger’s honest population', () => {
    const lane = PARENTS[0]
    expect(parentMean(lane.params)).toBeCloseTo(LANE_DELAY_MEAN, 10)
    expect(parentSd(lane.params)).toBeCloseTo(LANE_DELAY_SD, 10)
  })
})
