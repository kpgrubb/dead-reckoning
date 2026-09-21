/**
 * Act II datasets reproduce the beat-sheet registry's headline numbers (docs/beat-sheet.md §2, DS-00/01/02/09).
 */
import { describe, expect, it } from 'vitest'
import { correlation, fmt, linearRegression, mean, sd, transformedRegression } from '@/lib/stats'
import {
  CYRENE_ORE_INDEX,
  NICHOLSON_REGIO_INDEX,
  THE_NINETEEN,
  fLane,
  fuelOnDeclaredFit,
  fuelOnRequiredFit,
  honestManifest,
  laneDeltaV,
  ledgerSample,
  lossCounts,
  lossRecords,
  lossTwoWay,
  manifest,
  massFit,
  massFitWithout,
  meanDaysResidual,
  nineteenProfiles,
  residualPct,
  scheduledT9,
  t9LogLogFit,
} from './data'

describe('DS-00 · physics', () => {
  it('Lane Δv, f_lane and scheduled t9 match the hard-science ledger', () => {
    expect(laneDeltaV(3.33, 3)).toBeCloseTo(242, 0)
    expect(fLane(3.33)).toBeCloseTo(0.215, 3)
    expect(fLane(2.4)).toBeCloseTo(0.186, 3)
    expect(fLane(8)).toBeCloseTo(0.313, 3)
    expect(scheduledT9(3.33)).toBeCloseTo(71.4, 1)
    expect(scheduledT9(2.4)).toBeCloseTo(61, 0)
    expect(scheduledT9(8)).toBeCloseTo(111, 0)
  })
  it('the nineteen: ten at +6–9 %, nine uprated at +10–13 %, all thrust-limited to 2.75–2.84 mgee, +2.0–3.5 d late', () => {
    expect(nineteenProfiles).toHaveLength(19)
    const up = nineteenProfiles.filter((p) => p.uprated)
    expect(up).toHaveLength(9)
    for (const p of nineteenProfiles) {
      if (p.uprated) expect(p.h).toBeGreaterThanOrEqual(0.1)
      else expect(p.h).toBeLessThanOrEqual(0.09)
      expect(p.accel).toBeGreaterThan(2.74)
      expect(p.accel).toBeLessThan(2.85)
      expect(p.thrustDelay).toBeGreaterThan(1.6)
      expect(p.thrustDelay).toBeLessThan(3.6)
    }
    expect(mean(nineteenProfiles.map((p) => p.accel))).toBeCloseTo(2.79, 1)
    expect(nineteenProfiles.filter((p) => p.laneLengthAU <= 3.6)).toHaveLength(15)
  })
})

describe('DS-01 · loss subtable (act-2-01 two-way table)', () => {
  it('has 31 losses from Act I: Perrine 19 unknown; accident 5, piracy 4 (all independents), unknown 22', () => {
    expect(lossRecords).toHaveLength(31)
    expect(lossCounts[0]).toEqual([0, 0, 19])
    expect(lossTwoWay.colTotals).toEqual([5, 4, 22])
    expect(lossTwoWay.rowTotals[0]).toBe(19)
    expect(lossTwoWay.rowTotals[1] + lossTwoWay.rowTotals[2]).toBe(12)
    expect(lossCounts[1][1]).toBe(0) // no Mercantile piracy
    expect(lossCounts[2][1]).toBe(4) // every piracy is an independent
    expect(new Set(lossRecords.filter((l) => l.diverted).map((l) => l.hull))).toEqual(new Set(THE_NINETEEN))
    // P(unknown | Perrine) = 1; P(Perrine | unknown) = 19/22
    expect(lossTwoWay.rowConditional[0][2]).toBe(1)
    expect(lossTwoWay.colConditional[2][0]).toBeCloseTo(19 / 22, 10)
    expect(lossRecords.filter((r) => r.office === 'Uruk')).toHaveLength(23)
    expect(lossRecords.filter((r) => r.office === 'Ceres')).toHaveLength(8)
  })
})

describe('DS-02 · the Manifest file', () => {
  const xs = manifest.map((d) => d.declaredMass)
  const ys = manifest.map((d) => d.inferredMass)

  it('has 412 departures, all 31 lost hulls, the nineteen, and a 60,000 t bulk hauler', () => {
    expect(manifest).toHaveLength(412)
    expect(manifest.filter((d) => d.laterLost)).toHaveLength(31)
    expect(manifest.filter((d) => d.diverted)).toHaveLength(19)
    expect(new Set(manifest.filter((d) => d.diverted).map((d) => d.hull))).toEqual(new Set(THE_NINETEEN))
    expect(manifest[CYRENE_ORE_INDEX].declaredMass).toBe(60000)
    expect(manifest[CYRENE_ORE_INDEX].ownerClass).toBe('Mercantile')
    expect(manifest.map((d) => d.id)).toEqual([...Array(412).keys()])
    expect(new Set(manifest.map((d) => d.hull)).size).toBeGreaterThan(100)
  })

  it('r(inferred, declared) ≈ 0.99; LSRL slope ≈ 1.00, intercept ≈ 0; r² ≈ 0.98', () => {
    expect(correlation(xs, ys)).toBeGreaterThan(0.985)
    expect(massFit.slope).toBeCloseTo(1.0, 2)
    expect(fmt(massFit.slope, 2)).toBe('1.00')
    expect(Math.abs(massFit.intercept)).toBeLessThan(100)
    expect(massFit.r2).toBeGreaterThan(0.97)
    expect(massFit.r2).toBeLessThan(0.99)
  })

  it('the nineteen sit at +6–13 % and are the only points above +5 %; honest residual SD ≈ 2 % of declared mass', () => {
    const above5 = manifest.filter((_, i) => residualPct(i) > 5)
    expect(above5).toHaveLength(19)
    expect(above5.every((d) => d.laterLost && d.diverted)).toBe(true)
    for (const d of manifest.filter((x) => x.diverted)) {
      const p = residualPct(d.id)
      expect(p).toBeGreaterThan(5.8)
      expect(p).toBeLessThan(13.5)
      expect(d.departureDate < '2184-03-11').toBe(true)
    }
    for (const d of manifest) expect(d.departureDate >= '2177-09-01' && d.departureDate < '2184-03-11').toBe(true)
    const tiers = manifest.filter((d) => d.diverted).map((d) => residualPct(d.id))
    expect(tiers.filter((p) => p < 9.5).length).toBeGreaterThanOrEqual(8)
    expect(tiers.filter((p) => p >= 9.5).length).toBeGreaterThanOrEqual(7)
    const honestPct = honestManifest.map((d) => residualPct(d.id))
    expect(sd(honestPct)).toBeGreaterThan(1.8)
    expect(sd(honestPct)).toBeLessThan(2.2)
    // s over all 412 sits above the honest 2 % because the nineteen are in it (the Bureau's s that the note omits)
    expect(massFit.s).toBeGreaterThan(400)
    expect(massFit.s).toBeLessThan(750)
    // The other twelve lost hulls are in the band.
    for (const d of manifest.filter((x) => x.laterLost && !x.diverted)) expect(Math.abs(residualPct(d.id))).toBeLessThan(5)
  })

  it('Nicholson Regio residual ≈ +1,500 t', () => {
    const e = massFit.residuals[NICHOLSON_REGIO_INDEX]
    expect(e).toBeGreaterThan(1100)
    expect(e).toBeLessThan(1900)
  })

  it('Cyrene Ore is high-leverage (> 4/n) and not influential: the slope moves in the third decimal', () => {
    const n = manifest.length
    expect(massFit.leverage[CYRENE_ORE_INDEX]).toBeGreaterThan(4 / n)
    expect(massFit.flags.highLeverage).toContain(CYRENE_ORE_INDEX)
    expect(massFit.cooks[CYRENE_ORE_INDEX]).toBeLessThan(4 / n)
    const without = massFitWithout(CYRENE_ORE_INDEX)
    expect(Math.abs(without.slope - massFit.slope)).toBeLessThan(0.005)
    expect(Math.abs(without.r2 - massFit.r2)).toBeLessThan(0.01)
    expect(Math.abs(without.s - massFit.s) / massFit.s).toBeLessThan(0.05)
  })

  it('examiner Dacre signed 18 of 412: 17 of the nineteen and 1 of the other 393', () => {
    const dacre = manifest.filter((d) => d.examiner === 'Dacre')
    expect(dacre).toHaveLength(18)
    expect(dacre.filter((d) => d.diverted)).toHaveLength(17)
    expect(dacre.filter((d) => !d.diverted)).toHaveLength(1)
  })

  it('the Bureau columns are physically consistent: required = f_lane(d) × declared; inferred = thrust(plume) / accel', () => {
    for (const d of manifest) {
      expect(d.requiredFuel).toBeCloseTo(fLane(d.laneLengthAU) * d.declaredMass, -1)
      // plume TW = F·vₑ/2 with F = m·a  →  m = plume·2/vₑ / a
      const thrustFromPlume = (d.plumePower * 1e12 * 2) / (1000 * 1000) / 1000 // kN
      expect(thrustFromPlume / (d.accelMark2 * 0.00981)).toBeCloseTo(d.inferredMass, -2)
    }
    const honest = honestManifest
    expect(mean(honest.map((d) => d.accelMark2))).toBeCloseTo(3.0, 1)
    for (const d of manifest.filter((x) => x.diverted)) expect(d.accelMark2).toBeLessThan(2.85)
  })

  it('fuel on required Lane fuel is the line (slope 1.00 through the origin); fuel on declared mass is a smear; the nineteen sit high (slope ≈ 1.17)', () => {
    const honest = honestManifest
    const hf = linearRegression(
      honest.map((d) => d.requiredFuel),
      honest.map((d) => d.fuelLoaded),
    )
    expect(hf.slope).toBeCloseTo(1.0, 2)
    expect(hf.r).toBeGreaterThan(0.995)
    expect(Math.abs(hf.intercept)).toBeLessThan(40)
    expect(fuelOnRequiredFit.slope).toBeGreaterThan(0.97)
    expect(fuelOnRequiredFit.slope).toBeLessThan(1.06)
    expect(fuelOnRequiredFit.r).toBeGreaterThan(0.98)
    // The smear: fuel per declared tonne moves with the departure geometry (f_lane 0.186–0.313).
    expect(fuelOnDeclaredFit.r).toBeLessThan(0.93)
    expect(fuelOnDeclaredFit.s).toBeGreaterThan(3 * fuelOnRequiredFit.s)
    // No log transform cures it: every transform of fuel-on-declared stays below fuel-on-required's r².
    for (const t of ['logx', 'logy', 'loglog'] as const) {
      const tf = transformedRegression(
        manifest.map((d) => d.declaredMass),
        manifest.map((d) => d.fuelLoaded),
        t,
      )
      expect(tf.r2).toBeLessThan(fuelOnRequiredFit.r2)
    }
    const div = manifest.filter((d) => d.diverted)
    const df = linearRegression(
      div.map((d) => d.requiredFuel),
      div.map((d) => d.fuelLoaded),
    )
    expect(df.slope).toBeGreaterThan(1.1)
    expect(df.slope).toBeLessThan(1.25)
    for (const d of div) expect(d.fuelLoaded / d.requiredFuel).toBeGreaterThan(1.08)
  })

  it('is identical on every load (deterministic)', () => {
    expect(manifest[0]).toEqual(manifest[0])
    expect(JSON.stringify(manifest.slice(0, 5))).toBe(JSON.stringify(manifest.slice(0, 5)))
  })
})

describe('DS-09 · Ledger sample (act-2-06 curvature)', () => {
  it('300 transits, t9 from ~61 to ~111 d over 2.4–8 AU, bowed like √d', () => {
    expect(ledgerSample).toHaveLength(300)
    expect(ledgerSample.filter((t) => t.diverted)).toHaveLength(19)
    const sched = ledgerSample.map((t) => t.scheduledT9)
    expect(Math.min(...sched)).toBeLessThan(64)
    expect(Math.max(...sched)).toBeGreaterThan(107)
    for (const t of ledgerSample) {
      expect(t.scheduledT9).toBeCloseTo(scheduledT9(t.laneLengthAU), 0)
      expect(t.t9).toBeCloseTo(t.scheduledT9 + t.mark9Delay, 0)
    }
  })
  it('the log–log slope is ≈ 0.50 and beats the straight line on r²', () => {
    expect(t9LogLogFit.fit.slope).toBeCloseTo(0.5, 1)
    expect(Math.abs(t9LogLogFit.fit.slope - 0.5)).toBeLessThan(0.015)
    const raw = linearRegression(
      ledgerSample.map((t) => t.laneLengthAU),
      ledgerSample.map((t) => t.t9),
    )
    expect(t9LogLogFit.r2).toBeGreaterThan(raw.r2)
    // A straight line's residuals blame the season: a concave √d curve leaves the line under the middle
    // and over both ends (positive residuals mid-range, negative at short and long Lane lengths).
    const xs = ledgerSample.map((t) => t.laneLengthAU)
    const lo = raw.residuals.filter((_, i) => xs[i] < 3.2)
    const mid = raw.residuals.filter((_, i) => xs[i] > 4.6 && xs[i] < 5.8)
    const hi = raw.residuals.filter((_, i) => xs[i] > 7.2)
    expect(mean(mid)).toBeGreaterThan(mean(lo))
    expect(mean(mid)).toBeGreaterThan(mean(hi))
  })
  it('the nineteen average ≈ +2.8 d of residual on the log–log fit; everyone else ≈ 0', () => {
    const div = meanDaysResidual((t) => t.diverted)
    const rest = meanDaysResidual((t) => !t.diverted)
    expect(div).toBeGreaterThan(2.4)
    expect(div).toBeLessThan(3.2)
    expect(Math.abs(rest)).toBeLessThan(0.3)
    // Honest delay spread ≈ 2.66 d (persistent filing offset SD 2.5 + run noise 0.9).
    const honestDelay = ledgerSample.filter((t) => !t.diverted).map((t) => t.mark9Delay)
    expect(sd(honestDelay)).toBeGreaterThan(2.3)
    expect(sd(honestDelay)).toBeLessThan(3.0)
  })
})
