/**
 * Prologue datasets reproduce the beat-sheet registry (docs/beat-sheet.md §2) headline numbers.
 * DS-18 (shakedown telemetry), DS-05 (the Chief's tables), DS-01 (the Register).
 */
import { describe, expect, it } from 'vitest'
import { rng } from '@/lib/rng'
import { mean, median, range, sd } from '@/lib/stats'
import {
  COLD_RUN_VARIABLES,
  DIVERTED_HULLS,
  EYES_DETECTION_H,
  FIX_SD_KM,
  PROFILES,
  WATCH_DETECTION_H,
  WATCH_SUBSYSTEMS,
  drawFixErrors,
  losses,
  loggedFixRun,
  maxClusterWithin,
  quietRun,
  quietShortfallPct,
  quietShortfallPmPct,
  register,
  registerFrequency,
  registerSummary,
  shakedownColdRuns,
  shakedownFixRuns,
  sumOfLoadsSd,
  watchRun,
  yardAcceptanceFixes,
  yardAcceptanceRuns,
} from './data'

describe('DS-18 · shakedown fix errors (N(0, 120) km per axis, six per run)', () => {
  it('three runs of six whole-km fixes, identical on every load', () => {
    expect(shakedownFixRuns).toHaveLength(3)
    for (const run of shakedownFixRuns) {
      expect(run.fixes).toHaveLength(6)
      expect(run.fixes.every(Number.isInteger)).toBe(true)
      expect(new Set(run.fixes).size).toBe(6)
    }
    expect(loggedFixRun.id).toBe('DR-1')
  })
  it('the logged run has a visible centre and a spread of the ±300 km class', () => {
    expect(Math.abs(mean(loggedFixRun.fixes))).toBeGreaterThanOrEqual(15)
    expect(Math.abs(mean(loggedFixRun.fixes))).toBeLessThanOrEqual(70)
    expect(range(loggedFixRun.fixes)).toBeGreaterThanOrEqual(230)
    expect(range(loggedFixRun.fixes)).toBeLessThanOrEqual(420)
    expect(yardAcceptanceFixes).toHaveLength(6)
    expect(yardAcceptanceFixes).not.toEqual(loggedFixRun.fixes)
  })
  it('the fix procedure has the registry SD', () => {
    const many = drawFixErrors(rng('DS-18', 'sd-check'), 4000)
    expect(sd(many)).toBeGreaterThan(FIX_SD_KM * 0.95)
    expect(sd(many)).toBeLessThan(FIX_SD_KM * 1.05)
    expect(Math.abs(mean(many))).toBeLessThan(8)
  })
})

describe('DS-05 · the Chief\'s tables', () => {
  it('Watch: 320 kW → design mean 67.7 h, SD 4.2 h (√386 ≈ 19.6 kW); working 64, in writing ≈ 60', () => {
    expect(sumOfLoadsSd(WATCH_SUBSYSTEMS)).toBeCloseTo(Math.sqrt(386), 6)
    expect(WATCH_SUBSYSTEMS.reduce((s, l) => s + l.meanKw, 0)).toBe(320)
    expect(PROFILES.Watch.designMeanH).toBeCloseTo(67.7, 1)
    expect(PROFILES.Watch.sdH).toBeCloseTo(4.2, 1)
    expect(Math.round(PROFILES.Watch.workingH)).toBe(64)
    expect(PROFILES.Watch.inWritingH).toBeGreaterThan(59)
    expect(PROFILES.Watch.inWritingH).toBeLessThan(60.5)
    expect(PROFILES.Watch.postRefitMeanH).toBeCloseTo(59.0, 1)
    expect(Math.round(PROFILES.Watch.postRefitWorkingH)).toBe(55)
  })
  it('Quiet 114 h (SD ≈ 5, measured ≈ 108) and Standby 32 h (SD ≈ 1.5); post-refit 99 / 28', () => {
    expect(PROFILES.Quiet.designMeanH).toBeCloseTo(114.0, 1)
    expect(PROFILES.Quiet.sdH).toBeCloseTo(5, 1)
    expect(PROFILES.Quiet.designMeanH * PROFILES.Quiet.measuredFactor).toBeCloseTo(108.3, 1)
    expect(Math.round(PROFILES.Quiet.postRefitMeanH)).toBe(99)
    expect(PROFILES.Standby.designMeanH).toBeCloseTo(32.3, 1)
    expect(PROFILES.Standby.sdH).toBeCloseTo(1.5, 1)
    expect(Math.round(PROFILES.Standby.postRefitMeanH)).toBe(28)
  })
  it('the seeded Quiet run projects ≈ 108 h — a shortfall of about 5 % against the design curve, with a ±', () => {
    expect(quietRun.profile).toBe('Quiet')
    expect(quietRun.hours).toBe(40)
    expect(quietRun.projectedEnduranceH).toBeGreaterThan(104)
    expect(quietRun.projectedEnduranceH).toBeLessThan(112)
    expect(quietShortfallPct).toBeGreaterThan(3.5)
    expect(quietShortfallPct).toBeLessThan(6.5)
    expect(quietShortfallPmPct).toBeGreaterThan(3)
    expect(quietShortfallPmPct).toBeLessThan(6)
    expect(quietRun.samples[0].pct).toBe(4)
    expect(quietRun.sinkEndPct).toBeGreaterThan(35)
    expect(quietRun.sinkEndPct).toBeLessThan(50)
  })
  it('the Watch run is found by Callisto at 61 h (Eyes would have at 50) with the sink not yet full', () => {
    expect(watchRun.detected).toBe(true)
    expect(watchRun.detectedAtH).toBe(WATCH_DETECTION_H)
    expect(WATCH_DETECTION_H).toBe(61)
    expect(EYES_DETECTION_H).toBe(50)
    expect(watchRun.sinkEndPct).toBeLessThan(100)
    expect(watchRun.sinkEndPct).toBeGreaterThan(85)
    expect(shakedownColdRuns.map((r) => r.profile)).toEqual(['Quiet', 'Watch', 'Standby'])
    expect(shakedownColdRuns.every((r) => r.crew === 16)).toBe(true)
  })
  it('the yard acceptance table and Ebele\'s variable table are well-formed', () => {
    expect(yardAcceptanceRuns).toHaveLength(3)
    expect(yardAcceptanceRuns.every((r) => r.sinkEndPct > 0 && r.sinkEndPct < 100)).toBe(true)
    expect(COLD_RUN_VARIABLES.filter((v) => v.kind === 'categorical').length).toBeGreaterThanOrEqual(4)
    expect(COLD_RUN_VARIABLES.filter((v) => v.kind === 'quantitative-discrete').length).toBeGreaterThanOrEqual(3)
    expect(COLD_RUN_VARIABLES.filter((v) => v.kind === 'quantitative-continuous').length).toBeGreaterThanOrEqual(4)
  })
})

describe('DS-01 · the Register (2,200 records, 31 losses)', () => {
  it('2,200 records, 31 losses = 1.4 %, unique ids, dated 2178-01 → 2184-03', () => {
    expect(register).toHaveLength(2200)
    expect(losses).toHaveLength(31)
    expect(registerSummary.lossFraction).toBeCloseTo(31 / 2200, 6)
    expect(new Set(register.map((x) => x.record_id)).size).toBe(2200)
    expect(register[0].date >= '2178-01-01').toBe(true)
    expect(register[register.length - 1].date <= '2184-03-10').toBe(true)
    expect(register.filter((x) => x.severity === 'loss')).toHaveLength(31)
  })
  it('the Board\'s mean mark over all records is 6.5; the losses alone average ≈ 8.5', () => {
    expect(registerSummary.meanMarkAll).toBeGreaterThan(6.35)
    expect(registerSummary.meanMarkAll).toBeLessThan(6.65)
    expect(registerSummary.meanMarkLosses).toBeGreaterThan(8.2)
    expect(registerSummary.meanMarkLosses).toBeLessThan(8.8)
  })
  it('classification 22 unknown (19 Uruk, 3 Ceres) · 5 accident (Ceres) · 4 piracy (Uruk); Uruk 23, Ceres 8', () => {
    const count = (f: (l: (typeof losses)[number]) => boolean) => losses.filter(f).length
    expect(count((l) => l.classification === 'unknown')).toBe(22)
    expect(count((l) => l.classification === 'accident')).toBe(5)
    expect(count((l) => l.classification === 'piracy')).toBe(4)
    expect(count((l) => l.office === 'Uruk')).toBe(23)
    expect(count((l) => l.office === 'Ceres')).toBe(8)
    expect(count((l) => l.classification === 'unknown' && l.office === 'Uruk')).toBe(19)
    expect(count((l) => l.classification === 'unknown' && l.office === 'Ceres')).toBe(3)
    expect(count((l) => l.classification === 'accident' && l.office === 'Ceres')).toBe(5)
    expect(count((l) => l.classification === 'piracy' && l.office === 'Uruk')).toBe(4)
    expect(count((l) => l.owner_class === 'Perrine')).toBe(19)
  })
  it('time-to-silence: two piles — 12 abrupt (< 1 min), 19 gradual (3–8 h); the mean ≈ 3.4 h sits in the gap', () => {
    const tts = losses.map((l) => l.time_to_silence)
    expect(tts.filter((t) => t < 1 / 60)).toHaveLength(12)
    expect(tts.filter((t) => t >= 3 && t <= 8)).toHaveLength(19)
    expect(mean(tts)).toBeGreaterThan(3.2)
    expect(mean(tts)).toBeLessThan(3.6)
    expect(median(tts)).toBeGreaterThan(3)
  })
  it('gradual fades across all records: 119 (100 resolved dropouts + 19 losses) → P(loss | gradual) ≈ 0.16, P(gradual | loss) ≈ 0.61', () => {
    const gradual = register.filter((x) => x.fade === 'gradual')
    expect(gradual).toHaveLength(119)
    expect(gradual.filter((x) => x.severity === 'loss')).toHaveLength(19)
    expect(register.filter((x) => x.severity === 'dropout')).toHaveLength(100)
    expect(19 / 119).toBeCloseTo(0.16, 2)
    expect(19 / 31).toBeCloseTo(0.61, 2)
    expect(100 / 119).toBeCloseTo(0.84, 2)
  })
  it('mark at last contact: 23 of 31 in [9, 10.5]; the nineteen at 9.05–9.65', () => {
    expect(losses.filter((l) => l.mark_last >= 9 && l.mark_last <= 10.5)).toHaveLength(23)
    const nineteen = new Set(DIVERTED_HULLS.map((d) => d.hull))
    for (const l of losses.filter((x) => nineteen.has(x.hull))) {
      expect(l.mark_last).toBeGreaterThanOrEqual(9.05)
      expect(l.mark_last).toBeLessThanOrEqual(9.65)
      expect(l.cargo_category).toBe('volatiles')
    }
  })
  it('loss dates: yearly counts 1/2/3/4/4/4/1 for the nineteen; tightest 30-day cluster is the five of spring \'82', () => {
    const nineteen = new Set(DIVERTED_HULLS.map((d) => d.hull))
    const byYear = new Map<number, number>()
    for (const l of losses.filter((x) => nineteen.has(x.hull))) {
      const y = Number(l.date.slice(0, 4))
      byYear.set(y, (byYear.get(y) ?? 0) + 1)
    }
    expect([2178, 2179, 2180, 2181, 2182, 2183, 2184].map((y) => byYear.get(y) ?? 0)).toEqual([1, 2, 3, 4, 4, 4, 1])
    expect(maxClusterWithin(losses.map((l) => l.day), 30)).toBe(5)
    const cluster = losses.filter((l) => l.date >= '2182-02-24' && l.date <= '2182-03-21').map((l) => l.hull).sort()
    expect(cluster).toEqual(['Hygiea Promise', 'Kestrel Bough', 'Nicholson Regio', 'Thessaly Ember', 'Xibalba Sulcus'])
    expect(losses.find((l) => l.hull === 'Nicholson Regio')?.date).toBe('2182-03-06')
    expect(losses.find((l) => l.hull === 'Long Fathom')?.date).toBe('2182-06-02')
  })
  it('cargo among the lost: He-3/D 5 · volatiles 21 · metals 2 · other 3 (DS-14); lost median value below the Lane\'s', () => {
    const count = (c: string) => losses.filter((l) => l.cargo_category === c).length
    expect(count('He-3/D')).toBe(5)
    expect(count('volatiles')).toBe(21)
    expect(count('metals')).toBe(2)
    expect(count('manufactured & other')).toBe(3)
    expect(median(losses.map((l) => l.declared_cargo_value))).toBeLessThan(60)
  })
  it('advisories are spread along the Lane (marks 1–12) and every lost hull\'s minor records precede its loss', () => {
    const minor = register.filter((x) => x.severity !== 'loss')
    expect(minor).toHaveLength(2169)
    expect(mean(minor.map((x) => x.mark))).toBeGreaterThan(6.3)
    expect(mean(minor.map((x) => x.mark))).toBeLessThan(6.7)
    // "Spread along the Lane": marks 1–12 roughly uniform, so about 3/11 of the minor records sit below mark 4.
    const below4 = minor.filter((x) => x.mark < 4).length
    expect(below4 / minor.length).toBeGreaterThan(0.22)
    expect(below4 / minor.length).toBeLessThan(0.32)
    expect(Math.min(...minor.map((x) => x.mark))).toBeLessThan(1.2)
    expect(Math.max(...minor.map((x) => x.mark))).toBeGreaterThan(11.8)
    const lossDay = new Map(losses.map((l) => [l.hull, l.day]))
    for (const x of minor) {
      const ld = lossDay.get(x.hull)
      if (ld !== undefined) expect(x.day).toBeLessThan(ld)
    }
    const sev = registerFrequency(register, 'severity', ['loss', 'advisory', 'dropout', 'other'])
    expect(sev.map((s) => s.count).reduce((a, b) => a + b, 0)).toBe(2200)
    expect(sev.find((s) => s.value === 'loss')?.relFreq).toBeCloseTo(0.0141, 3)
  })
})
