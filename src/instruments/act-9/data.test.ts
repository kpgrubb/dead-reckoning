/**
 * DS-16 audit. Every number the Act IX prose, briefings and mission beats rest on is asserted
 * here against the beat-sheet registry (§2 DS-16) and the gate review's Required 1, so a change to
 * the seed, to DS-00's physics or to Act II's Manifest file fails the suite instead of quietly
 * making a module a lie.
 *
 * Word-form numbers pinned for the prose: nine hundred departures, eight hundred and eighty-one
 * honest, nineteen diverted, seventeen of them on Dacre's stamp out of the twenty-two he signed,
 * seventeen degrees of freedom.
 */
import { describe, expect, it } from 'vitest'
import { linearRegression, mean, sd, slopeInterval, slopeTest } from '@/lib/stats'
import { manifest, nineteenProfiles } from '@/instruments/act-2/data'
import {
  BETA_EBELE,
  BETA_PHYSICAL,
  BRANDT_SEED_ATTEMPT,
  DACRE_DIVERTED_900,
  DACRE_SIGNED_900,
  DIVERTED_N,
  HONEST_FUEL_FIT,
  HONEST_FUEL_INTERVAL,
  HONEST_FUEL_OUTPUT,
  HONEST_N,
  HONEST_SLOPES,
  HONEST_SLOPE_MEAN,
  HONEST_SLOPE_SD,
  KETTLE_FIT,
  KETTLE_ON_DECLARED,
  KETTLE_OUTPUT,
  KETTLE_TEST_PHYSICAL,
  KETTLE_TEST_ZERO,
  LANE_BURN_MEAN,
  NINETEEN_FUEL_FIT,
  NINETEEN_FUEL_INTERVAL,
  NINETEEN_FUEL_OUTPUT,
  NINETEEN_FUEL_SD_RATIO,
  NINETEEN_FUEL_VS_ONE,
  NINETEEN_SE_B,
  PERRINE_DEPARTURES_N,
  SE_RATIO,
  THEORETICAL_SLOPE_SD,
  brandtFile,
  brandtIssues,
  certifiedFraction,
  dvKettle,
  excessFuelFraction,
  excessPerTrueTonne,
  fLaneAt,
  generateBrandtCandidate,
  honest881,
  nineteen,
  normalProbabilityPoints,
  outputTable,
  simulateSlopes,
} from './data'
import { rng } from '@/lib/rng'

describe('DS-16 · Brandt s file', () => {
  it('is nine hundred Perrine departures, nineteen of them diverted', () => {
    expect(brandtFile).toHaveLength(PERRINE_DEPARTURES_N)
    expect(PERRINE_DEPARTURES_N).toBe(900)
    expect(nineteen).toHaveLength(DIVERTED_N)
    expect(DIVERTED_N).toBe(19)
    expect(honest881).toHaveLength(HONEST_N)
    expect(HONEST_N).toBe(881)
    expect(new Set(brandtFile.map((c) => c.id)).size).toBe(PERRINE_DEPARTURES_N)
  })

  it('takes the nineteen certifications out of the Manifest file rather than re-drawing them', () => {
    const fromManifest = new Map(manifest.filter((d) => d.diverted).map((d) => [d.hull, d]))
    expect(fromManifest.size).toBe(19)
    for (const c of nineteen) {
      const d = fromManifest.get(c.hull)!
      expect(d).toBeDefined()
      expect(c.declaredMass).toBe(d.declaredMass)
      expect(c.requiredFuel).toBe(d.requiredFuel)
      expect(c.fuelLoaded).toBe(d.fuelLoaded)
      expect(c.examiner).toBe(d.examiner)
      expect(c.laneLengthAU).toBe(d.laneLengthAU)
    }
  })

  it('carries the whole-phase mass and the Kettle delta-v only for the nineteen', () => {
    for (const c of nineteen) {
      const p = nineteenProfiles.find((x) => x.hull === c.hull)!
      // ±0.5 % of true mass, against the ±2 % of a single Mark 2 fix.
      expect(c.inferredMassFull / (c.declaredMass * (1 + p.h))).toBeGreaterThan(0.98)
      expect(c.inferredMassFull / (c.declaredMass * (1 + p.h))).toBeLessThan(1.02)
      expect(c.dvKettle).toBeGreaterThanOrEqual(24)
      expect(c.dvKettle).toBeLessThanOrEqual(38)
    }
    for (const c of honest881) {
      expect(c.inferredMassFull).toBeUndefined()
      expect(c.dvKettle).toBeUndefined()
    }
  })

  it('concentrates the nineteen in the Close Season and spreads the honest 881 (gate review, Required 1)', () => {
    expect(nineteen.filter((c) => c.laneLengthAU <= 3.6)).toHaveLength(15)
    expect(nineteen.filter((c) => c.laneLengthAU > 3.6)).toHaveLength(4)
    expect(Math.min(...honest881.map((c) => c.laneLengthAU))).toBeGreaterThanOrEqual(2.4)
    expect(Math.max(...honest881.map((c) => c.laneLengthAU))).toBeLessThanOrEqual(6.0)
  })

  it('certifies each departure against its own month s Lane profile', () => {
    for (const c of honest881) {
      expect(certifiedFraction(c)).toBeCloseTo(fLaneAt(c.laneLengthAU), 3)
    }
    // f_lane moves with the geometry: 0.186 at 2.4 AU, 0.215 at 3.33, 0.313 at 8.
    expect(fLaneAt(2.4)).toBeCloseTo(0.186, 3)
    expect(fLaneAt(3.33)).toBeCloseTo(0.215, 3)
    expect(fLaneAt(8)).toBeCloseTo(0.313, 3)
  })

  it('accepts the seed it ships and rejects nothing it ships (audit trail)', () => {
    expect(BRANDT_SEED_ATTEMPT).toBeGreaterThanOrEqual(0)
    expect(brandtIssues(generateBrandtCandidate(BRANDT_SEED_ATTEMPT))).toEqual([])
  })

  it('puts Dacre s stamp on seventeen of the nineteen, out of twenty-two he signed', () => {
    expect(DACRE_SIGNED_900).toBe(22)
    expect(DACRE_DIVERTED_900).toBe(17)
  })
})

describe('act-9-01 · the sampling distribution of a fitted slope', () => {
  it('stacks honest slopes around one with a spread of about 0.012', () => {
    expect(HONEST_SLOPES).toHaveLength(2000)
    expect(HONEST_SLOPE_MEAN).toBeCloseTo(1, 2)
    expect(HONEST_SLOPE_SD).toBeGreaterThan(0.0095)
    expect(HONEST_SLOPE_SD).toBeLessThan(0.0145)
  })

  it('agrees with the textbook SD of b, sigma/(sigma_x*sqrt(n))', () => {
    expect(Math.abs(HONEST_SLOPE_SD - THEORETICAL_SLOPE_SD) / THEORETICAL_SLOPE_SD).toBeLessThan(0.2)
  })

  it('narrows the spread as n grows, the way SE(b) = s/sqrt(Sxx) says it must', () => {
    const small = sd(simulateSlopes(rng('test/n12'), 12, 400))
    const large = sd(simulateSlopes(rng('test/n60'), 60, 400))
    expect(large).toBeLessThan(small)
    // Roughly the √n law: quintupling n should shrink the spread by something near √5.
    expect(small / large).toBeGreaterThan(1.6)
  })

  it('prints an SE for the nineteen several times the honest spread', () => {
    expect(NINETEEN_SE_B).toBeCloseTo(NINETEEN_FUEL_FIT.seSlope, 12)
    expect(NINETEEN_SE_B).toBeGreaterThan(0.034)
    expect(NINETEEN_SE_B).toBeLessThan(0.046)
    expect(SE_RATIO).toBeGreaterThan(2.5)
  })

  it('reports SE(b) and s on the output table, and n - 2 degrees of freedom', () => {
    expect(NINETEEN_FUEL_OUTPUT.df).toBe(17)
    expect(NINETEEN_FUEL_OUTPUT.n).toBe(19)
    expect(NINETEEN_FUEL_OUTPUT.rows[1].se).toBeCloseTo(NINETEEN_FUEL_FIT.seSlope, 12)
    expect(NINETEEN_FUEL_OUTPUT.rows[1].coef).toBeCloseTo(NINETEEN_FUEL_FIT.slope, 12)
    expect(NINETEEN_FUEL_OUTPUT.s).toBeCloseTo(NINETEEN_FUEL_FIT.s, 12)
    expect(HONEST_FUEL_OUTPUT.df).toBe(879)
    // The printed t and P are two-sided against zero — never the answer to a slope-equals-one question.
    expect(NINETEEN_FUEL_OUTPUT.rows[1].t).toBeCloseTo(NINETEEN_FUEL_FIT.slope / NINETEEN_FUEL_FIT.seSlope, 9)
  })

  it('builds a normal probability plot with one point per residual', () => {
    const pts = normalProbabilityPoints(NINETEEN_FUEL_FIT)
    expect(pts).toHaveLength(19)
    expect(pts.map((p) => p.y)).toEqual([...NINETEEN_FUEL_FIT.residuals].sort((a, b) => a - b))
    expect(pts[0].x).toBeLessThan(0)
    expect(pts[18].x).toBeGreaterThan(0)
  })
})

describe('act-9-02 · fuel loaded on required Lane fuel', () => {
  it('fits the nineteen at about 1.17 tonnes per tonne on seventeen degrees of freedom', () => {
    expect(NINETEEN_FUEL_INTERVAL.df).toBe(17)
    expect(NINETEEN_FUEL_FIT.n).toBe(19)
    // Registry target 1.17, asserted to ±15 %.
    expect(NINETEEN_FUEL_FIT.slope).toBeGreaterThan(1.17 * 0.85)
    expect(NINETEEN_FUEL_FIT.slope).toBeLessThan(1.17 * 1.15)
  })

  it('excludes one tonne per tonne', () => {
    const [lo, hi] = NINETEEN_FUEL_INTERVAL.ci!
    expect(lo).toBeGreaterThan(1)
    expect(hi).toBeLessThan(1.35)
    expect(NINETEEN_FUEL_VS_ONE.pValue!).toBeLessThan(0.01)
    expect(NINETEEN_FUEL_VS_ONE.df).toBe(17)
  })

  it('brackets one tonne per tonne on the 881 that came home', () => {
    const [lo, hi] = HONEST_FUEL_INTERVAL.ci!
    expect(lo).toBeLessThan(1)
    expect(hi).toBeGreaterThan(1)
    expect(HONEST_FUEL_FIT.slope).toBeCloseTo(1, 2)
    expect(HONEST_FUEL_INTERVAL.df).toBe(879)
    // The control is far tighter than the nineteen's, on the same physics.
    expect(hi - lo).toBeLessThan((NINETEEN_FUEL_INTERVAL.ci![1] - NINETEEN_FUEL_INTERVAL.ci![0]) / 10)
  })

  it('fans: fuel in tonnes carries the hull s size into the residuals', () => {
    expect(NINETEEN_FUEL_SD_RATIO).toBeGreaterThan(1.8)
  })
})

describe('act-9-03 · excess fuel per true tonne against the Kettle delta-v', () => {
  it('responds with the fraction each hull carried beyond its own month s requirement', () => {
    expect(excessFuelFraction).toHaveLength(19)
    for (let i = 0; i < 19; i++) {
      expect(excessFuelFraction[i]).toBeCloseTo(nineteen[i].fuelLoaded / nineteen[i].inferredMassFull - certifiedFraction(nineteen[i]), 12)
      expect(excessFuelFraction[i]).toBeGreaterThan(0)
    }
    expect(excessPerTrueTonne(nineteen[0])).toBeCloseTo(excessFuelFraction[0], 12)
  })

  it('finds the registry s slope, standard error and t on seventeen degrees of freedom', () => {
    expect(KETTLE_FIT.n).toBe(19)
    expect(KETTLE_TEST_ZERO.df).toBe(17)
    // Registry target 0.00076 per km/s, ±15 %.
    expect(KETTLE_FIT.slope).toBeGreaterThan(0.00076 * 0.85)
    expect(KETTLE_FIT.slope).toBeLessThan(0.00076 * 1.15)
    expect(KETTLE_FIT.seSlope).toBeGreaterThan(0.00012)
    expect(KETTLE_FIT.seSlope).toBeLessThan(0.0002)
    // Registry target t ≈ 4.7, ±0.5.
    expect(KETTLE_TEST_ZERO.statistic).toBeGreaterThan(4.2)
    expect(KETTLE_TEST_ZERO.statistic).toBeLessThan(5.2)
    expect(KETTLE_TEST_ZERO.pValue!).toBeLessThan(0.001)
    expect(KETTLE_TEST_ZERO.alternative).toBe('greater')
  })

  it('meets the conditions the test is run under', () => {
    for (const c of KETTLE_TEST_ZERO.conditions) expect(c.met, `${c.name}: ${c.detail}`).toBe(true)
  })

  it('agrees with the rocket equation at the thrust-limited Lane burn', () => {
    // Δv_L ≈ 230 km/s, below the nominal 242: these hulls never made the profile they filed.
    // Sandoval says "two-thirty by Mark nine" in 9-03, so the figure is pinned to the word.
    expect(LANE_BURN_MEAN).toBeGreaterThan(225)
    expect(LANE_BURN_MEAN).toBeLessThan(235)
    expect(BETA_PHYSICAL).toBeCloseTo(0.00079, 4)
    // Ebele's 1/vₑ is the same quantity at zero Δv, and it is larger.
    expect(BETA_EBELE).toBeCloseTo(0.001, 6)
    expect(BETA_EBELE).toBeGreaterThan(BETA_PHYSICAL)
    // Two-sided against β₀: fails to reject at any level a hearing would use.
    expect(KETTLE_TEST_PHYSICAL.pValue!).toBeGreaterThan(0.05)
    expect(Math.abs(KETTLE_TEST_PHYSICAL.statistic)).toBeLessThan(2)
  })

  it('is roughly twice the t of the same analysis on declared tonnage (9-01 s two days of link)', () => {
    expect(KETTLE_ON_DECLARED.statistic).toBeGreaterThan(0)
    expect(KETTLE_ON_DECLARED.statistic).toBeLessThan(KETTLE_TEST_ZERO.statistic - 1)
  })

  it('prints an output table whose two-sided P is twice the one-sided answer', () => {
    expect(KETTLE_OUTPUT.df).toBe(17)
    expect(KETTLE_OUTPUT.rows[1].p / 2).toBeCloseTo(KETTLE_TEST_ZERO.pValue!, 9)
    expect(KETTLE_OUTPUT.rows[1].t).toBeCloseTo(KETTLE_TEST_ZERO.statistic, 9)
  })

  it('spreads the Kettle delta-v across the six years the geometry moved', () => {
    expect(Math.min(...dvKettle)).toBeGreaterThanOrEqual(24)
    expect(Math.max(...dvKettle)).toBeLessThanOrEqual(38)
    expect(Math.max(...dvKettle) - Math.min(...dvKettle)).toBeGreaterThan(8)
  })
})

describe('the acceptance rule itself', () => {
  it('rejects a candidate whose nineteen are fuelled to the requirement', () => {
    const d = generateBrandtCandidate(BRANDT_SEED_ATTEMPT)
    const flattened = {
      ...d,
      nineteen: d.nineteen.map((c, i) => ({ ...c, fuelLoaded: c.requiredFuel * (1 + ((i % 5) - 2) * 0.002) })),
    }
    expect(brandtIssues(flattened).length).toBeGreaterThan(0)
  })

  it('rejects a candidate with no Kettle signal in it', () => {
    const d = generateBrandtCandidate(BRANDT_SEED_ATTEMPT)
    const flat = { ...d, nineteen: d.nineteen.map((c, i) => ({ ...c, dvKettle: 24 + (i % 2) * 14 })) }
    const issues = brandtIssues(flat)
    expect(issues.some((s) => s.includes('9-03'))).toBe(true)
  })

  it('agrees with a regression computed from scratch outside the module', () => {
    const fit = linearRegression(
      nineteen.map((c) => c.dvKettle),
      nineteen.map((c) => c.fuelLoaded / c.inferredMassFull - c.requiredFuel / c.declaredMass),
    )
    expect(fit.slope).toBeCloseTo(KETTLE_FIT.slope, 12)
    const si = slopeInterval(
      nineteen.map((c) => c.requiredFuel),
      nineteen.map((c) => c.fuelLoaded),
      { confidence: 0.95 },
    )
    expect(si.ci![0]).toBeCloseTo(NINETEEN_FUEL_INTERVAL.ci![0], 12)
    const st = slopeTest(
      nineteen.map((c) => c.dvKettle),
      nineteen.map((c) => c.fuelLoaded / c.inferredMassFull - c.requiredFuel / c.declaredMass),
      { alt: 'greater' },
    )
    expect(st.statistic).toBeCloseTo(KETTLE_TEST_ZERO.statistic, 12)
    expect(mean(outputTable(fit, 'x', 'y').rows.map((r) => r.se))).toBeGreaterThan(0)
  })
})
