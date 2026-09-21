/**
 * Act IV datasets reproduce the beat-sheet registry's headline numbers
 * (docs/beat-sheet.md §2 — DS-01, DS-05, DS-06, DS-07, DS-08, DS-09, DS-21 — and §8's gate-review fixes).
 *
 * The sink ledger is the Act's spine: if these assertions fail, eleven modules are quoting heat that
 * does not exist.
 */
import { describe, expect, it } from 'vitest'
import { binomial, discreteRV, mean, normal, round, rvProb, sd } from '@/lib/stats'
import {
  ACT_END,
  BOARD_FIT,
  CLOSE_PASSES,
  CLUSTER_HULLS,
  CLUSTER_RUNS,
  COLD_HOURS_PROBS,
  COLD_HOURS_PROBS_BAD,
  COLD_HOURS_VALUES,
  LEDGER,
  LEDGER_LOSSES,
  LEDGER_TRANSITS,
  LOITER_OPTIONS,
  LOSS_TOTAL,
  MARIUS_MET,
  MODULE_HEAT,
  NAIVE_SUM_OF_SDS_KW,
  OBSERVED_CLUSTER,
  P_CLUSTER_SIMULATED,
  P_COLD_HOURS_AT_LEAST_64,
  P_COLD_HOURS_OVER_64,
  P_GRADUAL_GIVEN_LOSS,
  P_LOST,
  P_LOST_AND_PERRINE,
  P_LOST_AND_PERRINE_IF_INDEPENDENT,
  P_LOST_GIVEN_OTHER,
  P_LOST_GIVEN_PERRINE,
  P_NO_LOSS_GIVEN_GRADUAL,
  P_PERRINE_PER_HOUR,
  P_SATURATE_BEFORE_60,
  P_SATURATE_BEFORE_64,
  P_SEEN_COLD,
  P_SEEN_PER_PASS_COLD,
  P_SEEN_PER_PASS_PURGING,
  P_SWEEP_DETECTS,
  PROFILE_LOAD_KW,
  PURGE_COUNT,
  QUIET_DESIGN_HOURS,
  ROOK_FIT,
  SINK_CAPACITY_GJ,
  SINK_LEDGER,
  SWEEP_COUNT,
  TORCH_OFF,
  TORCH_OFF_PCT,
  WATCH_DESIGN_HOURS,
  WATCH_DESIGN_SD_HOURS,
  WATCH_MEAN_KW,
  WATCH_SD_KW,
  WATCH_SUBSYSTEMS,
  WINDOW_1,
  WINDOW_2,
  WINDOW_LOADS_KW,
  YARD_MARGIN_KW,
  clusterDistribution,
  clusterStats,
  coldHoursRV,
  consecutiveCounts,
  fadeByOwnerCounts,
  fadeCounts,
  heatFor,
  hoursBetween,
  loiterOption_,
  lossOwnerCounts,
  met,
  metStamp,
  pNoDetection,
  pPerrineInWindow,
  perrineMoments,
  profileAt,
  sinkAt,
  sweepOutcomeCounts,
  sweepOutcomeProbs,
  sweeps,
  waitScenario,
  windowOnePasses,
  windowTwoPasses,
  WAIT_SCENARIOS,
} from './data'

describe('MET arithmetic', () => {
  it('round-trips a stamp', () => {
    expect(metStamp(met(83, 11))).toBe('MET 083/11:00')
    expect(metStamp(MARIUS_MET)).toBe('MET 104/03:50')
    expect(round(hoursBetween(met(88, 12), met(91, 2)), 6)).toBe(62)
  })
})

describe('DS-05 · the Chief’s tables', () => {
  it('the six Watch subsystem loads sum to 320 kW and their variances to 386 kW²', () => {
    expect(WATCH_SUBSYSTEMS).toHaveLength(6)
    expect(WATCH_MEAN_KW).toBe(320)
    expect(round(WATCH_SD_KW ** 2, 6)).toBe(386)
    // The one right answer, and the two wrong ones that bracket it.
    expect(round(WATCH_SD_KW, 1)).toBe(19.6)
    expect(NAIVE_SUM_OF_SDS_KW).toBe(42)
    expect(YARD_MARGIN_KW).toBe(8)
    expect(NAIVE_SUM_OF_SDS_KW).toBeGreaterThan(WATCH_SD_KW)
    expect(YARD_MARGIN_KW).toBeLessThan(WATCH_SD_KW)
  })

  it('78 GJ at 320 kW is 67.7 h with SD 4.2 h; Quiet is 114 h by design', () => {
    expect(SINK_CAPACITY_GJ).toBe(78)
    expect(PROFILE_LOAD_KW.watch).toBe(320)
    expect(round(WATCH_DESIGN_HOURS, 1)).toBe(67.7)
    expect(round(WATCH_DESIGN_SD_HOURS, 1)).toBe(4.2)
    expect(round(QUIET_DESIGN_HOURS, 0)).toBe(114)
  })

  it('P(saturation before 64 h) ≈ 0.17 and before 60 h ≈ 0.02', () => {
    expect(round(P_SATURATE_BEFORE_64, 2)).toBe(0.17)
    expect(round(P_SATURATE_BEFORE_60, 2)).toBe(0.02)
  })
})

describe('DS-21 · the Act IV sink ledger', () => {
  it('opens at MET 083/11:00 on Quiet at 6% and closes at MET 106', () => {
    expect(metStamp(TORCH_OFF)).toBe('MET 083/11:00')
    expect(sinkAt(TORCH_OFF)).toBe(TORCH_OFF_PCT)
    expect(metStamp(ACT_END)).toBe('MET 106/00:00')
    expect(SINK_LEDGER[0].from).toBe(TORCH_OFF)
  })

  it('carries seven purges and two Watch windows of 62 h and 64 h', () => {
    expect(PURGE_COUNT).toBe(7)
    expect(SINK_LEDGER.filter((s) => s.kind === 'purge')).toHaveLength(7)
    expect(round(hoursBetween(WINDOW_1.from, WINDOW_1.to), 6)).toBe(62)
    expect(round(hoursBetween(WINDOW_2.from, WINDOW_2.to), 6)).toBe(64)
    const windows = SINK_LEDGER.filter((s) => s.kind === 'watch')
    expect(windows).toHaveLength(2)
    expect(windows.map((w) => w.window)).toEqual([1, 2])
  })

  it('both windows close at ≈ 97% and the cellar never saturates', () => {
    const [w1, w2] = SINK_LEDGER.filter((s) => s.kind === 'watch')
    expect(w1.endPct).toBeGreaterThan(95)
    expect(w1.endPct).toBeLessThan(99)
    expect(w2.endPct).toBeGreaterThan(95)
    expect(w2.endPct).toBeLessThan(99)
    for (const s of SINK_LEDGER) expect(s.endPct).toBeLessThan(100)
  })

  it('each window’s realized load is an ordinary draw from N(320, 19.65)', () => {
    for (const load of WINDOW_LOADS_KW) {
      expect(Math.abs(load - WATCH_MEAN_KW) / WATCH_SD_KW).toBeLessThan(2)
    }
  })

  it('MV Marius Regio turns 34 h into window 2, with the cellar near 55%', () => {
    expect(round(hoursBetween(WINDOW_2.from, MARIUS_MET), 2)).toBe(33.83)
    expect(profileAt(MARIUS_MET)).toBe('watch')
    const pct = sinkAt(MARIUS_MET)
    expect(pct).toBeGreaterThan(51)
    expect(pct).toBeLessThan(58)
  })

  it('every module’s block MET reproduces the beat sheet’s profile and sink percentage', () => {
    // [module, profile, sink % stated in the beat-sheet block, tolerance in points]
    const stated: [string, string, number, number][] = [
      ['act-4-01', 'quiet', 7, 3],
      ['act-4-02', 'quiet', 28, 3],
      ['act-4-03', 'quiet', 49, 3],
      ['act-4-04', 'quiet', 13, 3],
      ['act-4-05', 'quiet', 34, 3],
      ['act-4-06', 'quiet', 5, 3],
      ['act-4-07', 'watch', 40, 3],
      ['act-4-08', 'watch', 97, 3],
      // 4-09's block header says 85%; the ledger's own purge times and the 190 kW Quiet load put the
      // cellar at ≈ 96% when the wings go out. The ledger governs (see the Act IV report).
      ['act-4-09', 'purge', 96, 3],
      ['act-4-10', 'watch', 55, 3],
    ]
    for (const [module, profile, pct, tol] of stated) {
      const h = heatFor(module)
      expect(h.profile, `${module} profile`).toBe(profile)
      expect(Math.abs(h.sinkPct - pct), `${module} sink ${h.sinkPct.toFixed(1)}% vs ${pct}%`).toBeLessThanOrEqual(tol)
    }
    expect(MODULE_HEAT).toHaveLength(10)
  })

  it('the ledger is monotone in MET and continuous in sink', () => {
    for (let i = 1; i < SINK_LEDGER.length; i++) {
      expect(SINK_LEDGER[i].from).toBeGreaterThanOrEqual(SINK_LEDGER[i - 1].to - 1e-9)
      expect(Math.abs(SINK_LEDGER[i].startPct - SINK_LEDGER[i - 1].endPct)).toBeLessThan(1e-9)
    }
  })
})

describe('DS-06 (a) · the Sweep log', () => {
  it('logs 1,400 sweeps, each ending in exactly one of four outcomes', () => {
    expect(sweeps).toHaveLength(SWEEP_COUNT)
    const total = sweepOutcomeCounts.thermal + sweepOutcomeCounts.optical + sweepOutcomeCounts.RF + sweepOutcomeCounts.nothing
    expect(total).toBe(SWEEP_COUNT)
    const probTotal = sweepOutcomeProbs.thermal + sweepOutcomeProbs.optical + sweepOutcomeProbs.RF + sweepOutcomeProbs.nothing
    expect(round(probTotal, 12)).toBe(1)
    // A mode only ever appears on a detection.
    expect(sweeps.every((s) => (s.detection ? s.mode !== null : s.mode === null))).toBe(true)
  })

  it('the complement gives P(a sweep detects something), and the thermal share is ≈ 0.70 of detections', () => {
    expect(round(P_SWEEP_DETECTS, 12)).toBe(round(1 - sweepOutcomeProbs.nothing, 12))
    const det = sweeps.filter((s) => s.detection).length
    expect(sweepOutcomeCounts.thermal / det).toBeGreaterThan(0.62)
    expect(sweepOutcomeCounts.thermal / det).toBeLessThan(0.78)
    expect(sweepOutcomeCounts.RF).toBeGreaterThanOrEqual(5)
  })

  it('consecutive sweeps are not independent: ≈ 0.55 after a detection against ≈ 0.06 after a clean sweep', () => {
    const [afterHit, afterClean] = consecutiveCounts
    const pAfterHit = afterHit[0] / (afterHit[0] + afterHit[1])
    const pAfterClean = afterClean[0] / (afterClean[0] + afterClean[1])
    expect(pAfterHit).toBeGreaterThan(0.5)
    expect(pAfterHit).toBeLessThan(0.6)
    expect(pAfterClean).toBeGreaterThan(0.05)
    expect(pAfterClean).toBeLessThan(0.07)
    expect(pAfterHit / pAfterClean).toBeGreaterThan(5)
  })
})

describe('DS-06 (b) · the being-seen close-pass model', () => {
  it('12 / 4 / 1 close passes per window at p = 0.02 cold give 0.21 / 0.08 / 0.02', () => {
    expect(CLOSE_PASSES).toEqual({ near: 12, middle: 4, far: 1 })
    expect(P_SEEN_PER_PASS_COLD).toBe(0.02)
    expect(P_SEEN_PER_PASS_PURGING).toBe(0.6)
    expect(round(P_SEEN_COLD.near, 2)).toBe(0.22)
    expect(round(P_SEEN_COLD.near, 1)).toBe(0.2)
    expect(round(P_SEEN_COLD.middle, 2)).toBe(0.08)
    expect(round(P_SEEN_COLD.far, 2)).toBe(0.02)
    // The registry's 0.21 / 0.08 / 0.02, to the precision it states them.
    expect(Math.abs(P_SEEN_COLD.near - 0.21)).toBeLessThan(0.01)
  })

  it('each window’s scheduled passes are independent hulls, priced at 0.02 cold or 0.60 purging', () => {
    expect(windowOnePasses).toHaveLength(CLOSE_PASSES.middle)
    expect(windowTwoPasses).toHaveLength(CLOSE_PASSES.middle)
    for (const p of [...windowOnePasses, ...windowTwoPasses]) {
      expect(p.range_km).toBeLessThanOrEqual(2.6e6)
      expect(p.pDetect).toBe(p.duringPurge ? P_SEEN_PER_PASS_PURGING : P_SEEN_PER_PASS_COLD)
    }
    // Passes inside a Watch window are never purges.
    expect(windowOnePasses.every((p) => !p.duringPurge)).toBe(true)
    expect(round(pNoDetection(windowOnePasses), 6)).toBe(round(Math.pow(0.98, 4), 6))
  })
})

describe('DS-07 · Lane arrivals at Mark 9', () => {
  it('Perrine 0.41/day is p = 0.0171 an hour; a 68-h window gives P(≥1) ≈ 0.69, mean 1.16, SD 1.07', () => {
    expect(round(P_PERRINE_PER_HOUR, 4)).toBe(0.0171)
    expect(round(pPerrineInWindow(68), 2)).toBe(0.69)
    const m = perrineMoments(68)
    expect(round(m.mean, 2)).toBe(1.16)
    expect(round(m.sd, 2)).toBe(1.07)
  })
})

describe('DS-01 · fade pattern, and the Board’s 84%', () => {
  it('119 gradual fades: 100 resolved and 19 losses; 12 abrupt losses', () => {
    expect(fadeCounts[0][0]).toBe(19)
    expect(fadeCounts[0][1]).toBe(100)
    expect(fadeCounts[1][0]).toBe(12)
    expect(fadeCounts[1][1]).toBe(0)
    expect(LOSS_TOTAL).toBe(31)
  })

  it("the Board's figure is P(no loss | gradual) = 0.84; the reversal is P(gradual | loss) = 0.61", () => {
    expect(round(P_NO_LOSS_GIVEN_GRADUAL, 2)).toBe(0.84)
    expect(round(P_GRADUAL_GIVEN_LOSS, 2)).toBe(0.61)
    expect(round(1 - P_NO_LOSS_GIVEN_GRADUAL, 2)).toBe(0.16)
    // The two conditionals are emphatically not the same number.
    expect(Math.abs(P_NO_LOSS_GIVEN_GRADUAL - P_GRADUAL_GIVEN_LOSS)).toBeGreaterThan(0.2)
  })

  it('every gradual-fade loss on the Register is a Perrine hull', () => {
    const [perrine, mercantile, independent] = fadeByOwnerCounts
    expect(perrine[0]).toBe(19)
    expect(perrine[1]).toBe(0)
    expect(mercantile[0]).toBe(0)
    expect(independent[0]).toBe(0)
    expect(mercantile[1] + independent[1]).toBe(12)
  })
})

describe('4-01 · the clustering simulation', () => {
  it('the Register’s tightest 30-day cluster is five, in spring 2182', () => {
    expect(OBSERVED_CLUSTER).toBe(5)
    expect(CLUSTER_HULLS).toHaveLength(5)
    expect(CLUSTER_HULLS).toContain('Nicholson Regio')
    expect(CLUSTER_HULLS).toContain('Xibalba Sulcus')
  })

  it('ten thousand runs of 31 uniform dates put P(max 30-day cluster ≥ 5) at about two in a hundred', () => {
    expect(clusterStats).toHaveLength(CLUSTER_RUNS)
    expect(P_CLUSTER_SIMULATED).toBeGreaterThan(0.008)
    expect(P_CLUSTER_SIMULATED).toBeLessThan(0.032)
    // The distribution is a distribution: every run produced a statistic, and they sum back.
    expect(clusterDistribution.reduce((s, d) => s + d.count, 0)).toBe(CLUSTER_RUNS)
    // Chance mostly makes threes and fours, not fives.
    expect(mean(clusterStats)).toBeGreaterThan(2.5)
    expect(mean(clusterStats)).toBeLessThan(4)
    expect(sd(clusterStats)).toBeGreaterThan(0)
  })
})

describe('DS-09 / DS-08 · loss × owner and the two baselines', () => {
  it('19 of 900 Perrine against 12 of 1,712 others; the marginal is 31 of 2,612', () => {
    expect(LEDGER_TRANSITS).toBe(2612)
    expect(LEDGER_LOSSES).toBe(31)
    expect(lossOwnerCounts[0]).toEqual([19, 881])
    expect(lossOwnerCounts[1]).toEqual([12, 1700])
    expect(round(P_LOST_GIVEN_PERRINE, 4)).toBe(0.0211)
    expect(round(P_LOST_GIVEN_OTHER, 4)).toBe(0.007)
    expect(round(P_LOST, 4)).toBe(0.0119)
    // Not independent, descriptively: the joint is not the product of the marginals.
    expect(P_LOST_AND_PERRINE).toBeGreaterThan(P_LOST_AND_PERRINE_IF_INDEPENDENT)
    expect(round(P_LOST_AND_PERRINE / P_LOST_AND_PERRINE_IF_INDEPENDENT, 1)).toBe(1.8)
    expect(LEDGER.perrineTransits + LEDGER.otherTransits).toBe(LEDGER_TRANSITS)
  })

  it('31 in 2,612 is ordinary under the Board’s 1.10% and five SD out under the 2176 report’s 0.50%', () => {
    expect(round(BOARD_FIT.p, 4)).toBe(0.011)
    expect(round(ROOK_FIT.p, 4)).toBe(0.005)
    expect(round(BOARD_FIT.mean, 1)).toBe(28.7)
    expect(round(BOARD_FIT.sd, 2)).toBe(5.33)
    expect(Math.abs(BOARD_FIT.z)).toBeLessThan(1)
    expect(round(ROOK_FIT.mean, 1)).toBe(13.2)
    expect(round(ROOK_FIT.sd, 2)).toBe(3.62)
    expect(ROOK_FIT.z).toBeGreaterThan(4.5)
    expect(ROOK_FIT.z).toBeLessThan(5.5)
    // The tail, not the point: survival form, never 1 − cdf.
    expect(ROOK_FIT.tail).toBeLessThan(1e-4)
    expect(ROOK_FIT.tail).toBeGreaterThan(0)
    expect(round(ROOK_FIT.tail, 12)).toBe(round(binomial.atLeast(31, 2612, 13 / 2580), 12))
    expect(BOARD_FIT.tail).toBeGreaterThan(0.2)
  })
})

describe('4-05 · the cold-run distributions', () => {
  it('the pmf is a pmf: ten values, probabilities summing to exactly 1', () => {
    expect(COLD_HOURS_VALUES).toHaveLength(10)
    expect(COLD_HOURS_PROBS).toHaveLength(10)
    expect(round(COLD_HOURS_PROBS.reduce((a, b) => a + b, 0), 10)).toBe(1)
    expect(COLD_HOURS_PROBS.every((p) => p > 0)).toBe(true)
    // Ebele's first table sums to 1.04.
    expect(round(COLD_HOURS_PROBS_BAD.reduce((a, b) => a + b, 0), 10)).toBe(1.04)
  })

  it('P(X > 64) is a real risk and is not P(X ≥ 64)', () => {
    expect(P_COLD_HOURS_OVER_64).toBeGreaterThan(0.16)
    expect(P_COLD_HOURS_OVER_64).toBeLessThan(0.3)
    expect(P_COLD_HOURS_AT_LEAST_64).toBeGreaterThan(P_COLD_HOURS_OVER_64)
    expect(round(P_COLD_HOURS_AT_LEAST_64 - P_COLD_HOURS_OVER_64, 10)).toBe(round(COLD_HOURS_PROBS[COLD_HOURS_VALUES.indexOf(64)], 10))
    expect(round(rvProb(coldHoursRV, () => true), 10)).toBe(1)
    expect(round(coldHoursRV.mean, 10)).toBe(round(discreteRV([...COLD_HOURS_VALUES], [...COLD_HOURS_PROBS]).mean, 10))
  })
})

describe('4-06 · the three loiter points (gate review: 60 ± 6 / 54 ± 4 / 48 ± 3)', () => {
  it('each option’s explicit pmf reproduces its mean and SD', () => {
    const targets: [string, number, number][] = [
      ['near', 60, 6],
      ['middle', 54, 4],
      ['far', 48, 3],
    ]
    for (const [band, m, s] of targets) {
      const o = LOITER_OPTIONS.find((x) => x.band === band)!
      expect(o.meanHours).toBe(m)
      expect(o.sdHours).toBe(s)
      expect(Math.abs(o.pmf.mean - m), `${band} pmf mean`).toBeLessThan(0.05)
      expect(Math.abs(o.pmf.sd - s), `${band} pmf sd`).toBeLessThan(0.1)
      expect(round(o.pmf.probs.reduce((a, b) => a + b, 0), 10)).toBe(1)
    }
  })

  it('P(exceed the 64-hour cellar) is 0.25 / 0.006 / ≈ 0, and the pmf agrees with the curve', () => {
    expect(round(loiterOption_('near').pSaturate, 2)).toBe(0.25)
    expect(round(loiterOption_('middle').pSaturate, 3)).toBe(0.006)
    expect(loiterOption_('far').pSaturate).toBeLessThan(1e-6)
    for (const band of ['near', 'middle'] as const) {
      const o = loiterOption_(band)
      expect(Math.abs(rvProb(o.pmf, (v) => v > 64) - o.pSaturate), `${band} pmf tail vs normal tail`).toBeLessThan(0.002)
      expect(round(o.pSaturate, 10)).toBe(round(normal.sf(64, o.meanHours, o.sdHours), 10))
    }
  })

  it('expected value alone favours the far point; the contact odds do not', () => {
    const near = loiterOption_('near')
    const middle = loiterOption_('middle')
    const far = loiterOption_('far')
    expect(far.meanHours).toBeLessThan(middle.meanHours)
    expect(middle.meanHours).toBeLessThan(near.meanHours)
    expect(near.pPerrineInRange).toBe(0.75)
    expect(middle.pPerrineInRange).toBe(0.55)
    expect(far.pPerrineInRange).toBe(0.35)
    expect(near.pSeenCold).toBeGreaterThan(middle.pSeenCold)
    expect(middle.pSeenCold).toBeGreaterThan(far.pSeenCold)
  })
})

describe('4-10 · the geometric wait', () => {
  it('the mean is 1/p and most waits are shorter than it', () => {
    const s = waitScenario(0.02, 'test')
    expect(s.meanTrials).toBe(50)
    expect(round(s.sdTrials, 2)).toBe(49.5)
    expect(round(s.meanDays, 1)).toBe(round(50 / 0.41, 1))
    // P(X > ⌈1/p⌉) — more than a third of runs still have not succeeded at the mean.
    expect(s.pBeyondMean).toBeGreaterThan(0.3)
    expect(s.pBeyondMean).toBeLessThan(0.4)
    expect(WAIT_SCENARIOS.length).toBeGreaterThanOrEqual(5)
    expect(WAIT_SCENARIOS.every((w) => w.meanTrials === 1 / w.p)).toBe(true)
  })
})
