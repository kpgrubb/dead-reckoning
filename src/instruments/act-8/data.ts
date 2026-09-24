/**
 * Act VIII datasets — "Kettle" (docs/beat-sheet.md §2, Act VIII blocks).
 *
 *   DS-14  Cargo mix (GOF). The Lane's declared cargo mix against the 31 lost hulls' own. Four
 *          categories (beat-sheet decision 10 — five gave an expected count of 3.1 on n = 31).
 *   DS-15  Mars–Belt corridor losses: the Board's comparison corridor, classified by cause.
 *   DS-13  Kettle: the survey camera's shapes and Oyelaran's lidar buffer.
 *   DS-17  The Kettle picket model — Ebele's tree, and the approach physics it sits inside.
 *
 * Imported read-only and never re-derived here:
 *   DS-01  `@/instruments/act-1/data`   the Register: the 31 losses with cargo category,
 *                                       classification and classifying office.
 *   DS-09  `@/instruments/act-5/data`   the Transit Ledger: 2,612 transits, 31 lost.
 *   DS-10  `@/instruments/act-6/data`   the Claims register: beneficiary on every loss.
 *   DS-02  `@/instruments/act-2/data`   the Manifest file: 412 departures with an examiner's
 *                                       signature on each (gate review, Required: 8-04 runs on
 *                                       DS-02's 412, not on Brandt's 900, which arrive at MET 196).
 *
 * THE ACT'S SPINE. Four categorical procedures and one that must not be run:
 *
 *   GOF (8-01/02)        cargo mix of the 31 against the Lane's: χ² ≈ 40.8 on df 3, every expected
 *                        count above 5, volatiles carrying about four fifths of the statistic.
 *   Independence (8-03/04)  loss × beneficiary over the 2,612 transits: χ² ≈ 10.0 on df 1, which is
 *                        the square of Act VI's two-proportion z.
 *   Homogeneity (8-03/04)   cause code by corridor, Lane against Mars–Belt: χ² ≈ 16.9 on df 2.
 *   Census (8-04)        classification × office for the 31 — every loss there is. Described.
 *   Conditions fail (8-04)  examiner × diverted on the 412: the Dacre-diverted cell expects 0.83,
 *                        so χ² is invalid and the null is simulated instead (0 of 10,000).
 *
 * Every number Act VIII asserts is computed here from `@/lib/stats`; nothing in this file is a
 * typed-in result. Determinism: the one drawn dataset (the lidar buffer) goes through `@/lib/rng`
 * with a fixed string seed, so it is identical on every load and in every module.
 */
import { rng } from '@/lib/rng'
import {
  chiSquareGOF,
  chiSquareHomogeneity,
  chiSquareIndependence,
  expectedCounts,
  permutationTestProportions,
  twoPropTest,
  type ChiSquareResult,
  type ChiSquareTableResult,
  type PermutationResult,
} from '@/lib/stats'
import { LANE_CARGO_MIX, losses, type CargoCategory, type Classification, type Office } from '@/instruments/act-1/data'
import { manifest, type Departure, type Examiner } from '@/instruments/act-2/data'
import { ledger } from '@/instruments/act-5/data'
import { beneficiaryClassOf, PERRINE_HOLDINGS, type BeneficiaryClass } from '@/instruments/act-6/data'

export type { CargoCategory, Classification, Office, Examiner, Departure, BeneficiaryClass }
export { losses, manifest, ledger, PERRINE_HOLDINGS }

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-14 · Cargo mix (the goodness-of-fit table)
// ═════════════════════════════════════════════════════════════════════════════════════════════

/** The four declared cargo classes, in the order every Act VIII display uses them. */
export const CARGO_CATEGORIES: readonly CargoCategory[] = ['He-3/D', 'volatiles', 'metals', 'manufactured & other']

/** Short labels for axes and table headers, same order. */
export const CARGO_LABELS: readonly string[] = ['He-3 / D', 'volatiles', 'metals', 'manufactured\n& other']

/** The Lane's declared cargo mix over all 2,612 transits (DS-09 → DS-14): the claimed distribution. */
export const LANE_CARGO_PROBS: readonly number[] = CARGO_CATEGORIES.map((c) => LANE_CARGO_MIX.find((m) => m.category === c)!.p)

/** Observed cargo categories among the 31 lost hulls, in `CARGO_CATEGORIES` order. */
export const cargoObserved: readonly number[] = CARGO_CATEGORIES.map((c) => losses.filter((l) => l.cargo_category === c).length)

/** The 31 losses are the whole loss subtable of the Register at MET 0. */
export const LOSS_N = losses.length

/**
 * The goodness-of-fit test the learner sets up in 8-01 and carries out in 8-02. Conditions hold:
 * the smallest expected count is metals at about 5.3, which is why the table has four categories
 * and not five.
 */
export const CARGO_GOF: ChiSquareResult = chiSquareGOF({
  observed: cargoObserved,
  probs: LANE_CARGO_PROBS,
  categories: CARGO_CATEGORIES as string[],
  random: true,
  populationSize: 100_000,
})

export const CARGO_EXPECTED: readonly number[] = CARGO_GOF.expected
export const VOLATILES_INDEX = CARGO_CATEGORIES.indexOf('volatiles')
export const HE3_INDEX = CARGO_CATEGORIES.indexOf('He-3/D')

/** Observed ÷ expected for each category — the "by a factor of" the Situation never states. */
export const cargoRatio: readonly number[] = cargoObserved.map((o, i) => o / CARGO_EXPECTED[i])

/** Each category's share of the statistic, for the contribution bars. */
export const cargoContributionShare: readonly number[] = CARGO_GOF.contributions.map((c) => c / CARGO_GOF.statistic)

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-09 ⋈ DS-10 · Loss × beneficiary (one sample, two variables: independence)
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const BENEFICIARY_ROWS: readonly string[] = [PERRINE_HOLDINGS, 'all other beneficiaries']
export const OUTCOME_COLS: readonly string[] = ['lost', 'arrived']

const perrineBeneficiary = ledger.filter((t) => beneficiaryClassOf(t) === PERRINE_HOLDINGS)
const otherBeneficiary = ledger.filter((t) => beneficiaryClassOf(t) !== PERRINE_HOLDINGS)

/** [[Perrine lost, Perrine arrived], [other lost, other arrived]] over all 2,612 transits. */
export const beneficiaryTable: number[][] = [
  [perrineBeneficiary.filter((t) => t.lost).length, perrineBeneficiary.filter((t) => !t.lost).length],
  [otherBeneficiary.filter((t) => t.lost).length, otherBeneficiary.filter((t) => !t.lost).length],
]

export const LEDGER_N = ledger.length

/**
 * One sample of transits classified two ways, so the test is independence. The statistic is the
 * square of Act VI's two-proportion z on the same counts, and 8-04 makes Ebele say why.
 */
export const BENEFICIARY_TEST: ChiSquareTableResult = chiSquareIndependence(beneficiaryTable, { random: true, populationSize: 40_000 })

/** Act VI's two-proportion z on the same two rows — z² is the χ² above. */
export const BENEFICIARY_Z = twoPropTest({
  x1: beneficiaryTable[0][0],
  n1: beneficiaryTable[0][0] + beneficiaryTable[0][1],
  x2: beneficiaryTable[1][0],
  n2: beneficiaryTable[1][0] + beneficiaryTable[1][1],
  alt: 'greater',
}).statistic

/** Expected count for the cell the whole table turns on: Perrine-beneficiary and lost. */
export const PERRINE_LOST_EXPECTED = BENEFICIARY_TEST.expectedTable[0][0]

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-15 · Mars–Belt corridor losses (separate samples: homogeneity)
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const CAUSE_COLS: readonly Classification[] = ['accident', 'piracy', 'unknown']
export const CORRIDOR_ROWS: readonly string[] = ['Hundred-Day Lane', 'Mars–Belt corridor']

/** The Board's comparison corridor as its own rebuttal quoted it (DS-15). */
export const MARS_BELT = { losses: 46, transits: 4180, accident: 22, piracy: 13, unknown: 11 } as const
export const LANE_TRANSIT_TOTAL = 2612

const laneCause = CAUSE_COLS.map((c) => losses.filter((l) => l.classification === c).length)

/** Rows are two separately drawn corridors; columns are the classifying office's finding. */
export const corridorTable: number[][] = [laneCause, [MARS_BELT.accident, MARS_BELT.piracy, MARS_BELT.unknown]]

export const CORRIDOR_TEST: ChiSquareTableResult = chiSquareHomogeneity(corridorTable, {
  random: true,
  populationSizes: [LANE_TRANSIT_TOTAL * 10, MARS_BELT.transits * 10],
})

/** Row-conditional percentages: 71% of the Lane's losses are *unknown* against 24% of the corridor's. */
export const corridorUnknownShare: readonly number[] = corridorTable.map((row) => row[CAUSE_COLS.indexOf('unknown')] / row.reduce((a, b) => a + b, 0))

export const LANE_UNKNOWN_EXPECTED = CORRIDOR_TEST.expectedTable[0][CAUSE_COLS.indexOf('unknown')]

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-01 · Classification × office — a census of the 31, described and never tested
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const OFFICE_ROWS: readonly Office[] = ['Uruk', 'Ceres']

/** Every loss on the Lane in six years, classified by the office that wrote the finding. */
export const officeTable: number[][] = OFFICE_ROWS.map((o) => CAUSE_COLS.map((c) => losses.filter((l) => l.office === o && l.classification === c).length))

/** Expected counts if the office made no difference — computed only to show what a test would do. */
export const officeExpected: number[][] = expectedCounts(officeTable)

export const URUK_TOTAL = officeTable[0].reduce((a, b) => a + b, 0)
export const CERES_TOTAL = officeTable[1].reduce((a, b) => a + b, 0)
export const PIRACY_FROM_URUK = officeTable[0][CAUSE_COLS.indexOf('piracy')]
export const PIRACY_TOTAL = corridorTable[0][CAUSE_COLS.indexOf('piracy')]

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-02 · Examiner × diverted — the table whose conditions fail
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const EXAMINER_ROWS: readonly string[] = ['R. Dacre', 'the other three examiners']
export const DIVERTED_COLS: readonly string[] = ['among the nineteen', 'all other departures']

const dacreDepartures = manifest.filter((d) => d.examiner === 'Dacre')
const otherDepartures = manifest.filter((d) => d.examiner !== 'Dacre')

/** [[Dacre diverted, Dacre other], [others diverted, others other]] over the Bureau's 412. */
export const examinerTable: number[][] = [
  [dacreDepartures.filter((d) => d.diverted).length, dacreDepartures.filter((d) => !d.diverted).length],
  [otherDepartures.filter((d) => d.diverted).length, otherDepartures.filter((d) => !d.diverted).length],
]

export const MANIFEST_N = manifest.length
export const DACRE_SIGNED = dacreDepartures.length
export const DACRE_DIVERTED = examinerTable[0][0]
export const DIVERTED_N = manifest.filter((d) => d.diverted).length

/**
 * Computed so that 8-04 can show what the procedure *would* have produced, and why the number is
 * not admissible. `conditions` carries the failed expected-count check; nothing quotes the p-value.
 */
export const EXAMINER_CHI2_INVALID: ChiSquareTableResult = chiSquareIndependence(examinerTable, { random: true, populationSize: 9000 })

/** The cell that fails: how many of Dacre's departures would be among the nineteen by chance alone. */
export const DACRE_DIVERTED_EXPECTED = EXAMINER_CHI2_INVALID.expectedTable[0][0]

/** Every expected count in the table, smallest first — the condition check the learner runs. */
export const EXAMINER_EXPECTED_MIN = Math.min(...EXAMINER_CHI2_INVALID.expected)

export const EXAMINER_PERMUTATION_REPS = 10_000

/**
 * The procedure that replaces χ²: reassign the nineteen diverted labels at random among the 412
 * departures, ten thousand times, and count how often seventeen or more land on Dacre's eighteen.
 * Zero of ten thousand, on this seed and on every other.
 */
export const EXAMINER_PERMUTATION: PermutationResult = permutationTestProportions(
  { x1: examinerTable[0][0], n1: DACRE_SIGNED, x2: examinerTable[1][0], n2: MANIFEST_N - DACRE_SIGNED },
  { rng: rng('DS-02/examiner-permutation'), reps: EXAMINER_PERMUTATION_REPS, alt: 'greater' },
)

/** The two groups as 0/1 arrays, for the `permutation-diff` simulation task. */
export const examinerGroupA: number[] = Array.from({ length: DACRE_SIGNED }, (_, i) => (i < examinerTable[0][0] ? 1 : 0))
export const examinerGroupB: number[] = Array.from({ length: MANIFEST_N - DACRE_SIGNED }, (_, i) => (i < examinerTable[1][0] ? 1 : 0))

/** The observed statistic the simulation is compared against: p̂(Dacre) − p̂(everyone else). */
export const EXAMINER_OBSERVED_DIFF = examinerTable[0][0] / DACRE_SIGNED - examinerTable[1][0] / (MANIFEST_N - DACRE_SIGNED)

/** The largest simulated difference in ten thousand relabellings — every one of them below the observed. */
export const EXAMINER_SIM_MAX = Math.max(...EXAMINER_PERMUTATION.stats)

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-17 · The Kettle picket model, and the approach physics around it
// ═════════════════════════════════════════════════════════════════════════════════════════════

/** P(a wrecker is at Kettle at all): one tug, one depot, and the tug's four kills were Lane-side. */
export const P_WRECKER_PRESENT = 0.75

/** P(on picket, cold, within slug range of the approach quarter | present): one quarter of the sky. */
export const P_ON_PICKET_GIVEN_PRESENT = 0.4

/** The product. The number the learner computes and signs before ordering the dwell. */
export const P_PICKET_CAN_RESPOND = P_WRECKER_PRESENT * P_ON_PICKET_GIVEN_PRESENT

/** The other three leaves of the tree, in display order after the one above. */
export const PICKET_TREE_LEAVES: readonly { path: string; probability: number; responds: boolean }[] = [
  { path: 'wrecker at Kettle · on picket in the approach quarter', probability: P_WRECKER_PRESENT * P_ON_PICKET_GIVEN_PRESENT, responds: true },
  { path: 'wrecker at Kettle · covering another quarter', probability: P_WRECKER_PRESENT * (1 - P_ON_PICKET_GIVEN_PRESENT), responds: false },
  { path: 'no wrecker at Kettle', probability: 1 - P_WRECKER_PRESENT, responds: false },
]

/** Ballistic flyby (DS-21). Nothing in Act VIII burns before MET 181/06:24. */
export const FLYBY_SPEED_KMS = 30
export const CLOSEST_APPROACH_KM = 38_000
/** Unambiguous hull identification needs the lidar inside this range. */
export const LIDAR_RANGE_KM = 40_000
/** Survey camera resolves sunlit hulls to about a million kilometres. */
export const SURVEY_CAMERA_KM = 1_000_000
/** Last purge ended MET 179/12 at this range — beyond any civilian-grade sensor's purge detection. */
export const LAST_PURGE_KM = 4_500_000
export const PURGE_CIVILIAN_LIMIT_KM = 2_600_000

/** Half-chord of the lidar window: √(40,000² − 38,000²) km. */
export const LIDAR_HALF_CHORD_KM = Math.sqrt(LIDAR_RANGE_KM ** 2 - CLOSEST_APPROACH_KM ** 2)

/** The whole window, in minutes, at 30 km/s. */
export const LIDAR_WINDOW_MIN = (2 * LIDAR_HALF_CHORD_KM) / FLYBY_SPEED_KMS / 60

/** *Patience*, cold off the approach quarter at closest approach. */
export const PATIENCE_RANGE_KM = 2_100
/** Her 40 mm coilgun slug. */
export const SLUG_SPEED_KMS = 3.5
export const SLUG_FLIGHT_MIN = PATIENCE_RANGE_KM / SLUG_SPEED_KMS / 60

/** Reactor scrammed on Watch: the torch is twenty-two minutes away, not four. */
export const TORCH_FROM_WATCH_MIN = 22
export const TORCH_FROM_STANDBY_MIN = 4

/** Cold translation authority: ≤ 200 N of cold gas on 3,200 tonnes. */
export const COLD_THRUST_N = 200
export const SHIP_MASS_T = 3_200
/** ½at² over the slug's flight, in metres. An unguided round at a ballistic target is not dodgeable. */
export const COLD_DISPLACEMENT_M = 0.5 * (COLD_THRUST_N / (SHIP_MASS_T * 1000)) * (SLUG_FLIGHT_MIN * 60) ** 2

/** Post-refit sink: 68 GJ, Watch 320 kW, and the purge floor the last purge left her at. */
export const SINK_CAPACITY_GJ = 68
export const WATCH_LOAD_KW = 320
export const PURGE_FLOOR_PCT = 5
export const SINK_PCT_PER_HOUR = ((WATCH_LOAD_KW * 3600) / 1e6 / SINK_CAPACITY_GJ) * 100
/** Hours on Watch since the last purge ended at MET 179/12. */
export const WATCH_HOURS_AT_BRIEF = 34
export const WATCH_HOURS_AT_APPROACH = 42
export const SINK_PCT_AT_BRIEF = PURGE_FLOOR_PCT + SINK_PCT_PER_HOUR * WATCH_HOURS_AT_BRIEF
export const SINK_PCT_AT_APPROACH = PURGE_FLOOR_PCT + SINK_PCT_PER_HOUR * WATCH_HOURS_AT_APPROACH
/** Post-refit Watch endurance: design mean and the Chief's working figure (DS-05, DS-12). */
export const WATCH_DESIGN_HOURS = 59
export const WATCH_WORKING_HOURS = 55

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-13 · Kettle: the survey camera and Oyelaran's lidar buffer
// ═════════════════════════════════════════════════════════════════════════════════════════════

/** What the survey camera shows from a million kilometres out: shapes, warm, and no names. */
export const SHAPES_DOCKED = 11
export const SHAPES_STANDING_OFF = 3
export const SHAPES_TOTAL = SHAPES_DOCKED + SHAPES_STANDING_OFF

export const DWELL_LONG_S = 40
export const DWELL_SHORT_S = 12
export const RETURNS_LONG = 14
export const RETURNS_SHORT = 9

export interface LidarReturn {
  hull_id: string
  range_km: number
  /** Degrees, ship-relative. The rock subtends nine thousandths of a degree at this range. */
  bearing: number
  state: 'docked' | 'standing off'
  /** The Adlinda uprate's larger radiator block, visible in the return profile. */
  refit_visible: boolean
  /** True for the twelve that are in the Register's MET-0 loss subtable. */
  in_register: boolean
}

/** The fourteen, in the order the buffer wrote them (DS-13). */
const BUFFER_HULLS: readonly { hull: string; state: 'docked' | 'standing off'; in_register: boolean }[] = [
  { hull: 'Marius Regio', state: 'standing off', in_register: false },
  { hull: 'Harpagia Sulcus', state: 'standing off', in_register: false },
  { hull: 'Nicholson Regio', state: 'docked', in_register: true },
  { hull: 'Perrine Regio', state: 'docked', in_register: true },
  { hull: 'Tiamat Sulcus', state: 'docked', in_register: true },
  { hull: 'Xibalba Sulcus', state: 'docked', in_register: true },
  { hull: 'Galileo Regio', state: 'docked', in_register: true },
  { hull: 'Dardanus Sulcus', state: 'docked', in_register: true },
  { hull: 'Sippar Sulcus', state: 'standing off', in_register: true },
  { hull: 'Byblus Sulcus', state: 'docked', in_register: true },
  { hull: 'Nun Sulci', state: 'docked', in_register: true },
  { hull: 'Zakar Sulcus', state: 'docked', in_register: true },
  { hull: 'Kishar Sulcus', state: 'docked', in_register: true },
  { hull: 'Bubastis Sulci', state: 'docked', in_register: true },
]

/** Bearing of Kettle off the flyby track at closest approach, degrees. */
const KETTLE_BEARING_DEG = 219.4

function drawBuffer(): LidarReturn[] {
  const r = rng('DS-13/lidar-buffer')
  return BUFFER_HULLS.map(({ hull, state, in_register }) => {
    const spread = state === 'docked' ? 4 : 800
    const radial = r.uniform(-spread, spread)
    const transverse = r.uniform(-spread, spread)
    const range = Math.hypot(CLOSEST_APPROACH_KM + radial, transverse)
    const bearing = KETTLE_BEARING_DEG + (Math.atan2(transverse, CLOSEST_APPROACH_KM) * 180) / Math.PI
    return {
      hull_id: hull,
      range_km: Math.round(range * 10) / 10,
      bearing: Math.round(bearing * 10000) / 10000,
      state,
      refit_visible: r.bool(0.45),
      in_register,
    }
  })
}

/** Oyelaran's buffer, intact. Everything Act VIII proves about *who* is at Kettle comes out of it. */
export const lidarBuffer: readonly LidarReturn[] = drawBuffer()

/**
 * What a dwell of the given length returns. A forty-second dwell writes the whole buffer; twelve
 * seconds integrates enough energy for the nine strongest returns and no more.
 */
export function dwellReturns(dwellSeconds: number): readonly LidarReturn[] {
  if (dwellSeconds >= DWELL_LONG_S) return lidarBuffer
  const byStrength = [...lidarBuffer].sort((a, b) => a.range_km - b.range_km).slice(0, RETURNS_SHORT)
  const keep = new Set(byStrength.map((x) => x.hull_id))
  return lidarBuffer.filter((x) => keep.has(x.hull_id))
}

/** The twelve buffer hulls the Register carries as *unknown, presumed lost* at MET 0. */
export const bufferInRegister: readonly LidarReturn[] = lidarBuffer.filter((x) => x.in_register)

/** Register rows for those twelve, joined on hull name. */
export const bufferRegisterRows = bufferInRegister.map((b) => losses.find((l) => l.hull === b.hull_id)!)

/** Every one of the four cover losses: the hulls Uruk classified *piracy* and nobody diverted. */
export const COVER_HULLS: readonly string[] = ['Thessaly Ember', 'Kestrel Bough', 'Hygiea Promise', 'Long Fathom']
export const coverLosses = COVER_HULLS.map((h) => losses.find((l) => l.hull === h)!)
