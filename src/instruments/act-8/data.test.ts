/**
 * Act VIII dataset contract. Every headline number in the beat sheet's Act VIII blocks and in the
 * §2 registry entries DS-13, DS-14, DS-15 and DS-17, plus every word-form number the modules speak
 * in prose, is pinned here. A dataset change that moves one of them fails the suite instead of
 * quietly making the fiction a lie.
 */
import { describe, expect, it } from 'vitest'
import { chi2, fmt } from '@/lib/stats'
import {
  BENEFICIARY_TEST,
  BENEFICIARY_Z,
  CARGO_CATEGORIES,
  CARGO_EXPECTED,
  CARGO_GOF,
  CERES_TOTAL,
  CLOSEST_APPROACH_KM,
  COLD_DISPLACEMENT_M,
  CORRIDOR_TEST,
  DACRE_DIVERTED,
  DACRE_DIVERTED_EXPECTED,
  DACRE_SIGNED,
  DIVERTED_N,
  DWELL_SHORT_S,
  EXAMINER_OBSERVED_DIFF,
  EXAMINER_PERMUTATION,
  EXAMINER_PERMUTATION_REPS,
  EXAMINER_SIM_MAX,
  HE3_INDEX,
  LANE_CARGO_PROBS,
  LANE_UNKNOWN_EXPECTED,
  LEDGER_N,
  LIDAR_WINDOW_MIN,
  LOSS_N,
  MANIFEST_N,
  MARS_BELT,
  PATIENCE_RANGE_KM,
  PERRINE_LOST_EXPECTED,
  PIRACY_FROM_URUK,
  PIRACY_TOTAL,
  P_PICKET_CAN_RESPOND,
  RETURNS_LONG,
  RETURNS_SHORT,
  SHAPES_DOCKED,
  SHAPES_STANDING_OFF,
  SINK_PCT_AT_APPROACH,
  SINK_PCT_AT_BRIEF,
  SLUG_FLIGHT_MIN,
  TORCH_FROM_WATCH_MIN,
  URUK_TOTAL,
  VOLATILES_INDEX,
  beneficiaryTable,
  bufferInRegister,
  bufferRegisterRows,
  cargoObserved,
  cargoRatio,
  corridorTable,
  corridorUnknownShare,
  coverLosses,
  dwellReturns,
  examinerTable,
  lidarBuffer,
  officeTable,
} from './data'

describe('DS-14 · cargo mix, the goodness-of-fit table', () => {
  it('is four categories against the Lane mix 38 / 21 / 17 / 24', () => {
    expect(CARGO_CATEGORIES).toEqual(['He-3/D', 'volatiles', 'metals', 'manufactured & other'])
    expect(LANE_CARGO_PROBS).toEqual([0.38, 0.21, 0.17, 0.24])
    expect(LANE_CARGO_PROBS.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
  })

  it('observes He-3/D 5 · volatiles 21 · metals 2 · other 3 among the thirty-one lost', () => {
    expect(cargoObserved).toEqual([5, 21, 2, 3])
    expect(LOSS_N).toBe(31)
  })

  it('expects 11.8 / 6.5 / 5.3 / 7.4 — every count above five, which is why there are four categories', () => {
    expect(CARGO_EXPECTED[0]).toBeCloseTo(11.78, 2)
    expect(CARGO_EXPECTED[VOLATILES_INDEX]).toBeCloseTo(6.51, 2)
    expect(CARGO_EXPECTED[2]).toBeCloseTo(5.27, 2)
    expect(CARGO_EXPECTED[3]).toBeCloseTo(7.44, 2)
    expect(Math.min(...CARGO_EXPECTED)).toBeGreaterThan(5)
    expect(CARGO_GOF.conditions.find((c) => c.name === 'Expected counts ≥ 5')!.met).toBe(true)
  })

  it('gives χ² ≈ 40.8 on df 3 with p below 0.0001', () => {
    expect(CARGO_GOF.statistic).toBeCloseTo(40.8, 1)
    expect(CARGO_GOF.df).toBe(3)
    expect(CARGO_GOF.pValue!).toBeLessThan(0.0001)
  })

  it('puts volatiles at the top of the contributions, over by a factor of about three', () => {
    expect(CARGO_GOF.largestContributor).toBe(VOLATILES_INDEX)
    expect(CARGO_GOF.contributions[VOLATILES_INDEX]).toBeCloseTo(32.3, 1)
    expect(cargoRatio[VOLATILES_INDEX]).toBeGreaterThan(3)
    expect(cargoRatio[VOLATILES_INDEX]).toBeLessThan(3.4)
    // He-3/D is the second contributor and it is UNDER-represented, not over.
    expect(CARGO_GOF.contributions[HE3_INDEX]).toBeCloseTo(3.9, 1)
    expect(cargoRatio[HE3_INDEX]).toBeLessThan(1)
  })

  it('rounds the volatiles expected count to 6.5, which the beat asks for to one decimal', () => {
    expect(fmt(CARGO_EXPECTED[VOLATILES_INDEX], 1)).toBe('6.5')
  })
})

describe('DS-09 ⋈ DS-10 · loss × beneficiary (independence)', () => {
  it('is 19 of 900 against 12 of 1,712 over the 2,612 transits', () => {
    expect(beneficiaryTable[0]).toEqual([19, 881])
    expect(beneficiaryTable[1]).toEqual([12, 1700])
    expect(LEDGER_N).toBe(2612)
  })

  it('gives χ² ≈ 10.0 on df 1, and the statistic is the square of Act VI‘s z', () => {
    expect(BENEFICIARY_TEST.statistic).toBeCloseTo(10.0, 1)
    expect(BENEFICIARY_TEST.df).toBe(1)
    expect(BENEFICIARY_TEST.statistic).toBeCloseTo(BENEFICIARY_Z ** 2, 8)
    expect(BENEFICIARY_Z).toBeCloseTo(3.16, 2)
  })

  it('expects 10.7 Perrine-beneficiary losses, and the driving cell is Perrine-lost', () => {
    expect(PERRINE_LOST_EXPECTED).toBeCloseTo(10.68, 2)
    expect(BENEFICIARY_TEST.largestContributor).toBe(0)
    expect(Math.min(...BENEFICIARY_TEST.expected)).toBeGreaterThan(5)
  })
})

describe('DS-15 · cause by corridor (homogeneity)', () => {
  it('is the Lane 5 / 4 / 22 against Mars–Belt 22 / 13 / 11', () => {
    expect(corridorTable[0]).toEqual([5, 4, 22])
    expect(corridorTable[1]).toEqual([MARS_BELT.accident, MARS_BELT.piracy, MARS_BELT.unknown])
    expect(corridorTable[1].reduce((a, b) => a + b, 0)).toBe(MARS_BELT.losses)
  })

  it('gives χ² ≈ 16.9 on df 2 with p ≈ 0.0002', () => {
    expect(CORRIDOR_TEST.statistic).toBeCloseTo(16.9, 1)
    expect(CORRIDOR_TEST.df).toBe(2)
    expect(CORRIDOR_TEST.pValue!).toBeCloseTo(0.0002, 4)
    expect(Math.min(...CORRIDOR_TEST.expected)).toBeGreaterThan(5)
  })

  it('expects 13.3 unknowns on the Lane against 22 observed: 71% of the Lane, 24% of the corridor', () => {
    expect(LANE_UNKNOWN_EXPECTED).toBeCloseTo(13.29, 2)
    expect(corridorUnknownShare[0]).toBeCloseTo(0.71, 2)
    expect(corridorUnknownShare[1]).toBeCloseTo(0.24, 2)
  })
})

describe('DS-01 · classification by office is a census of the thirty-one', () => {
  it('has Uruk on 23 and Ceres on 8, with every piracy finding written at Uruk', () => {
    expect(URUK_TOTAL).toBe(23)
    expect(CERES_TOTAL).toBe(8)
    expect(URUK_TOTAL + CERES_TOTAL).toBe(LOSS_N)
    expect(PIRACY_FROM_URUK).toBe(4)
    expect(PIRACY_TOTAL).toBe(4)
    expect(officeTable[1][1]).toBe(0)
  })

  it('names the four hulls Uruk called piracy', () => {
    expect(coverLosses.map((l) => l.hull)).toEqual(['Thessaly Ember', 'Kestrel Bough', 'Hygiea Promise', 'Long Fathom'])
    for (const l of coverLosses) {
      expect(l.classification).toBe('piracy')
      expect(l.office).toBe('Uruk')
    }
  })
})

describe('DS-02 · examiner × diverted, the table whose conditions fail', () => {
  it('runs on the Bureau‘s 412 departures: Dacre signed eighteen, seventeen of them among the nineteen', () => {
    expect(MANIFEST_N).toBe(412)
    expect(DACRE_SIGNED).toBe(18)
    expect(DACRE_DIVERTED).toBe(17)
    expect(DIVERTED_N).toBe(19)
    expect(examinerTable).toEqual([
      [17, 1],
      [2, 392],
    ])
  })

  it('expects 0.83 Dacre-diverted departures, far below five, so χ² is not admissible', () => {
    expect(DACRE_DIVERTED_EXPECTED).toBeCloseTo(0.83, 2)
    expect(DACRE_DIVERTED_EXPECTED).toBeLessThan(5)
    expect(fmt(DACRE_DIVERTED_EXPECTED, 2)).toBe('0.83')
  })

  it('simulates the null instead and returns zero of ten thousand', () => {
    expect(EXAMINER_PERMUTATION.reps).toBe(EXAMINER_PERMUTATION_REPS)
    expect(EXAMINER_PERMUTATION.pValue).toBe(0)
    expect(EXAMINER_SIM_MAX).toBeLessThan(EXAMINER_OBSERVED_DIFF)
    expect(EXAMINER_OBSERVED_DIFF).toBeCloseTo(17 / 18 - 2 / 394, 10)
  })
})

describe('DS-17 · the picket tree and the approach physics', () => {
  it('multiplies to thirty percent, with no detection leaf', () => {
    expect(P_PICKET_CAN_RESPOND).toBeCloseTo(0.3, 10)
  })

  it('gives the slug ten minutes from 2,100 km and leaves the torch twenty-two away', () => {
    expect(PATIENCE_RANGE_KM).toBe(2100)
    expect(SLUG_FLIGHT_MIN).toBeCloseTo(10, 6)
    expect(TORCH_FROM_WATCH_MIN).toBe(22)
    expect(COLD_DISPLACEMENT_M).toBeLessThan(12)
  })

  it('opens a fourteen-minute lidar window around a 38,000 km closest approach', () => {
    expect(CLOSEST_APPROACH_KM).toBe(38_000)
    expect(LIDAR_WINDOW_MIN).toBeGreaterThan(13.5)
    expect(LIDAR_WINDOW_MIN).toBeLessThan(14.5)
  })

  it('has the sink at 63% eight hours out and 76% at closest approach', () => {
    expect(Math.round(SINK_PCT_AT_BRIEF)).toBe(63)
    expect(Math.round(SINK_PCT_AT_APPROACH)).toBe(76)
  })
})

describe('DS-13 · the survey camera and the lidar buffer', () => {
  it('shows eleven warm shapes docked and three standing off', () => {
    expect(SHAPES_DOCKED).toBe(11)
    expect(SHAPES_STANDING_OFF).toBe(3)
    expect(lidarBuffer.filter((x) => x.state === 'docked')).toHaveLength(SHAPES_DOCKED)
    expect(lidarBuffer.filter((x) => x.state === 'standing off')).toHaveLength(SHAPES_STANDING_OFF)
  })

  it('returns fourteen hull IDs on forty seconds and nine on twelve', () => {
    expect(lidarBuffer).toHaveLength(RETURNS_LONG)
    expect(dwellReturns(40)).toHaveLength(RETURNS_LONG)
    expect(dwellReturns(DWELL_SHORT_S)).toHaveLength(RETURNS_SHORT)
    expect(new Set(lidarBuffer.map((x) => x.hull_id)).size).toBe(RETURNS_LONG)
  })

  it('names the two in-story diversions and twelve of the nineteen', () => {
    expect(lidarBuffer.slice(0, 2).map((x) => x.hull_id)).toEqual(['Marius Regio', 'Harpagia Sulcus'])
    expect(bufferInRegister).toHaveLength(12)
  })

  it('finds every buffer hull in the Register as unknown, presumed lost, at a Uruk desk', () => {
    expect(bufferRegisterRows).toHaveLength(12)
    for (const row of bufferRegisterRows) {
      expect(row.classification).toBe('unknown')
      expect(row.office).toBe('Uruk')
      expect(row.cargo_category).toBe('volatiles')
    }
  })

  it('puts every return inside the lidar‘s range at a bearing the docked hulls share', () => {
    for (const b of lidarBuffer) expect(b.range_km).toBeLessThan(40_000)
    const docked = lidarBuffer.filter((x) => x.state === 'docked').map((x) => x.bearing)
    expect(Math.max(...docked) - Math.min(...docked)).toBeLessThan(0.02)
  })

  it('computes its own p-value rather than carrying one', () => {
    expect(chi2.sf(CARGO_GOF.statistic, 3)).toBe(CARGO_GOF.pValue)
  })
})
