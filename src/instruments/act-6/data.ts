/**
 * Act VI datasets — "Accusation" (docs/beat-sheet.md §2, Act VI blocks).
 *
 *   DS-10  The Claims register (Authority claims office, Ceres). 31 rows, one per loss:
 *          policy holder, BENEFICIARY, insurer, payout, date paid, classification. Perrine
 *          Holdings is the beneficiary on all nineteen diverted hulls; the other twelve name
 *          eleven owners. Tharsis Mutual has paid Perrine Holdings ≈ 2.1 B₵ over six years.
 *          And the line nobody on the Lane reads twice: Perrine Holdings' majority member is the
 *          Service Provident Fund — the pension every officer aboard pays into.
 *   DS-09  (imported read-only from `@/instruments/act-5/data`) the Transit Ledger: 2,612 transits,
 *          Perrine 900 / other 1,712, 31 losses. Act VI never re-derives it.
 *   DS-08  (imported read-only) the Board's rebuttal table and the two cutters.
 *   DS-01  (imported read-only from `@/instruments/act-1/data`) the Register's 31 loss records —
 *          hull names, owners and classifications the claims register is joined to.
 *
 * Everything Act VI asserts is computed here from `@/lib/stats`; nothing in this file is a typed-in
 * result. The headline targets `data.test.ts` pins:
 *
 *   19/900 vs 12/1,712        two-proportion z ≈ 3.16, one-sided p ≈ 0.0008  (pooled SE)
 *   pooled p̂c = 31/2,612      smallest large-counts product 900 × p̂c ≈ 10.7 — a NARROW pass, on purpose
 *   95 % difference interval  (0.004, 0.024) — 0.4 to 2.4 points per transit, unpooled SE
 *   Lane rate 31/2,612        95 % interval ≈ (0.0077, 0.0160) — clears 0.5 %, does not clear 1.1 %
 *   margin 0.2 points         n ≈ 11,300 transits ≈ 20 more years at 435 a year
 *   power (one-sided)         0.76 at α = 0.01 and 0.90 at α = 0.05 against 0.021 vs 0.007;
 *                             ≈ 0.08 against the Board's "comparable corridors" 0.012 vs 0.011
 *
 * Determinism: the only randomness here is DS-10's payout column and its date-paid lag, drawn
 * through `@/lib/rng` with a fixed seed chosen by a deterministic search so the register reproduces
 * the registry's 2.1 B₵. Everything else is a join or a call into `@/lib/stats`.
 */
import { rng, type Rng } from '@/lib/rng'
import {
  marginOfErrorProportion,
  normal,
  onePropInterval,
  onePropTest,
  powerZTestProportion,
  sampleSizeForProportion,
  twoPropInterval,
  twoPropTest,
  zStar,
  type Alternative,
  type InferenceResult,
} from '@/lib/stats'
import { losses as registerLosses, type Classification, type LossRecord } from '@/instruments/act-1/data'
import {
  BOARD_TABLE,
  CUTTERS,
  LEDGER_N,
  OTHER_N,
  PERRINE_N,
  ROOK_2176,
  ledger,
  rateOf,
  type OwnerClass,
  type Transit,
} from '@/instruments/act-5/data'

export type { Transit, OwnerClass }
export { BOARD_TABLE, CUTTERS, ROOK_2176, ledger, rateOf }

// ---------------------------------------------------------------------------------------------
// The Ledger, counted the way the Board counts it (DS-09, read-only)
// ---------------------------------------------------------------------------------------------

/**
 * The beneficiary class of a transit, as the claims register reports it. Every Sulcus-Mk3 hull on
 * the Lane is a Perrine-class hull and every Perrine-class policy names Perrine Holdings, so this
 * is an observable label, not the hidden truth: Act VI instruments may display it.
 */
export type BeneficiaryClass = 'Perrine Holdings' | 'all other beneficiaries'

export const PERRINE_HOLDINGS = 'Perrine Holdings'
/** The institutional turn of 6-03 (gate review, Required — Act VI): who owns the beneficiary. */
export const PROVIDENT_FUND = 'the Service Provident Fund'

export function beneficiaryClassOf(t: Transit): BeneficiaryClass {
  return t.ownerClass === 'Perrine' ? PERRINE_HOLDINGS : 'all other beneficiaries'
}

export const perrineTransits: readonly Transit[] = ledger.filter((t) => beneficiaryClassOf(t) === PERRINE_HOLDINGS)
export const otherTransits: readonly Transit[] = ledger.filter((t) => beneficiaryClassOf(t) !== PERRINE_HOLDINGS)

/** 900 — transits whose policies name Perrine Holdings. */
export const PERRINE_TRANSITS = perrineTransits.length
/** 1,712 — everybody else on the same Lane over the same six years. */
export const OTHER_TRANSITS = otherTransits.length
/** 19. */
export const PERRINE_LOSSES = perrineTransits.filter((t) => t.lost).length
/** 12. */
export const OTHER_LOSSES = otherTransits.filter((t) => t.lost).length
/** 2,612 and 31 — the Register snapshot at MET 0, which is what every Act V–IX procedure runs on. */
export const LANE_TRANSITS = ledger.length
export const LANE_LOSSES = ledger.filter((t) => t.lost).length

/** A season of Lane traffic (DS-09): about 435 transits in a year. */
export const TRANSITS_PER_YEAR = 435

/** The 2×2 the learner builds in 6-03: beneficiary class × outcome. */
export const beneficiaryTable: { beneficiary: BeneficiaryClass; lost: number; arrived: number; transits: number }[] = [
  { beneficiary: PERRINE_HOLDINGS, lost: PERRINE_LOSSES, arrived: PERRINE_TRANSITS - PERRINE_LOSSES, transits: PERRINE_TRANSITS },
  { beneficiary: 'all other beneficiaries', lost: OTHER_LOSSES, arrived: OTHER_TRANSITS - OTHER_LOSSES, transits: OTHER_TRANSITS },
]

// ---------------------------------------------------------------------------------------------
// DS-10 · The Claims register (Authority claims office, Ceres)
// ---------------------------------------------------------------------------------------------

export type Insurer = 'Tharsis Mutual' | 'Lunar Pool'

export interface ClaimRecord {
  claim_id: string
  /** Hull as the Register names it (joined from DS-01). */
  hull: string
  /** The company that held the policy — the owner on the Register's face. */
  policy_holder: string
  /** Who was paid. The column the Board's summary page does not carry. */
  beneficiary: string
  insurer: Insurer
  /** Settlement, M₵. */
  payout: number
  /** ISO date the claim was settled. */
  date_paid: string
  /** The classifying office's finding, carried across from the Register. */
  classification: Classification
  /** True when the beneficiary is Perrine Holdings (the join Act VI is about). */
  perrineBeneficiary: boolean
}

/**
 * Two small independents financed their hulls through the same Ceres co-operative, so the twelve
 * non-Perrine claims name eleven beneficiaries, not twelve (DS-10).
 */
const BENEFICIARY_OVERRIDES: Record<string, string> = {
  'Hollow Tide Cooperative': 'Hygiea Cooperative',
}

/** Hull values by class, M₵ — a settlement is the hull plus the declared cargo. */
function hullValue(r: Rng, loss: LossRecord): number {
  const base = loss.hull_class === 'Sulcus-Mk3' ? 86 : loss.hull_class === 'Tessera-C' ? 71 : 52
  const wear = 1 - 0.012 * Math.max(0, loss.hull_age - 6)
  return base * Math.max(0.55, wear) * (1 + r.normal(0, 0.06))
}

function drawClaims(attempt: number): ClaimRecord[] {
  const r = rng('DS-10', attempt)
  return registerLosses.map((loss, i) => {
    const perrine = loss.owner_class === 'Perrine'
    const beneficiary = perrine ? PERRINE_HOLDINGS : (BENEFICIARY_OVERRIDES[loss.owner] ?? loss.owner)
    const payout = hullValue(r, loss) + loss.declared_cargo_value
    const paid = new Date(Date.parse(loss.date) + Math.round(r.uniform(40, 210)) * 86_400_000)
    return {
      claim_id: `CL-${String(2100 + i * 13).padStart(4, '0')}`,
      hull: loss.hull,
      policy_holder: loss.owner,
      beneficiary,
      insurer: perrine ? 'Tharsis Mutual' : r.bool(0.55) ? 'Tharsis Mutual' : 'Lunar Pool',
      payout: Math.round(payout * 10) / 10,
      date_paid: paid.toISOString().slice(0, 10),
      classification: loss.classification,
      perrineBeneficiary: perrine,
    }
  })
}

/** DS-10's headline: Tharsis Mutual has paid Perrine Holdings about 2.1 billion credits. */
const PERRINE_PAYOUT_TARGET = 2100

function acceptClaims(claims: ClaimRecord[]): boolean {
  if (claims.length !== 31) return false
  const perrine = claims.filter((c) => c.perrineBeneficiary)
  if (perrine.length !== 19) return false
  const total = perrine.reduce((s, c) => s + c.payout, 0)
  if (Math.abs(total - PERRINE_PAYOUT_TARGET) > 45) return false
  // Every settlement is a real hull and a real cargo — no zero rows, no runaway row.
  if (claims.some((c) => c.payout < 25 || c.payout > 260)) return false
  // Eleven beneficiaries among the twelve (the Ceres co-operative holds two).
  const others = new Set(claims.filter((c) => !c.perrineBeneficiary).map((c) => c.beneficiary))
  return others.size === 11
}

let claimsFound: ClaimRecord[] | null = null
let claimsAttempt = 0
for (let attempt = 0; attempt < 800 && !claimsFound; attempt++) {
  const c = drawClaims(attempt)
  if (acceptClaims(c)) {
    claimsFound = c
    claimsAttempt = attempt
  }
}
if (!claimsFound) throw new Error('DS-10: no seed satisfied the claims-register acceptance rule in 800 attempts')

/** DS-10 — the claims register as the Ceres office holds it, 31 rows. */
export const claims: readonly ClaimRecord[] = claimsFound
export const CLAIMS_SEED_ATTEMPT = claimsAttempt
export const CLAIM_COLUMNS = ['claim_id', 'hull', 'policy_holder', 'beneficiary', 'insurer', 'payout', 'date_paid', 'classification'] as const

export const perrineClaims: readonly ClaimRecord[] = claims.filter((c) => c.perrineBeneficiary)
export const otherClaims: readonly ClaimRecord[] = claims.filter((c) => !c.perrineBeneficiary)

/** Total settled to Perrine Holdings over the six years, M₵ (≈ 2,100 = 2.1 B₵). */
export const PERRINE_PAYOUT_TOTAL = perrineClaims.reduce((s, c) => s + c.payout, 0)
/** Distinct beneficiaries named by the other twelve claims — eleven owners. */
export const OTHER_BENEFICIARIES: readonly string[] = [...new Set(otherClaims.map((c) => c.beneficiary))]

/** Beneficiaries, largest first — the display 6-03 opens on. */
export const beneficiaryTally: { beneficiary: string; hulls: number; paid: number }[] = (() => {
  const map = new Map<string, { hulls: number; paid: number }>()
  for (const c of claims) {
    const row = map.get(c.beneficiary) ?? { hulls: 0, paid: 0 }
    row.hulls += 1
    row.paid += c.payout
    map.set(c.beneficiary, row)
  }
  return [...map.entries()].map(([beneficiary, v]) => ({ beneficiary, ...v })).sort((a, b) => b.hulls - a.hulls || b.paid - a.paid)
})()

// ---------------------------------------------------------------------------------------------
// act-6-01 / act-6-02 · One proportion: the Lane's own rate, with a margin
// ---------------------------------------------------------------------------------------------

/**
 * The Lane's loss rate with an honest interval. The Ledger is a census of transits, so the
 * "random" condition is a statement about the *process* that produced them and the 10 % condition
 * says the process could produce far more than ten times these transits (gate review, act-6-01) —
 * both are passed through as design facts rather than computed.
 */
export function laneInterval(confidence = 0.95): InferenceResult {
  return onePropInterval({ x: LANE_LOSSES, n: LANE_TRANSITS, confidence, random: true })
}

export const LANE_RATE = LANE_LOSSES / LANE_TRANSITS
export const LANE_INTERVAL = laneInterval(0.95)

/** The two baselines the interval is read against (DS-08): the Board's corridor and Rook's 2176 report. */
export const BOARD_BASELINE = rateOf(BOARD_TABLE.marsBelt)
export const ROOK_BASELINE = rateOf(ROOK_2176)

/** Margin of error for a stated n at a stated confidence, at the Lane's observed rate. */
export function laneMargin(n: number, confidence = 0.95): number {
  return marginOfErrorProportion(LANE_RATE, n, confidence)
}

/** Transits needed for a target margin (act-6-02: 0.2 points → ≈ 11,300). */
export function transitsForMargin(moe: number, confidence = 0.95): number {
  return sampleSizeForProportion({ moe, confidence, pGuess: LANE_RATE })
}

/** The beat's target margin: two tenths of a percentage point. */
export const TARGET_MARGIN = 0.002
export const TRANSITS_FOR_TARGET_MARGIN = transitsForMargin(TARGET_MARGIN)
/** More years of Lane traffic the rate argument would have to wait — about twenty. */
export const YEARS_FOR_TARGET_MARGIN = (TRANSITS_FOR_TARGET_MARGIN - LANE_TRANSITS) / TRANSITS_PER_YEAR
/** What three more seasons actually buy: a margin of about a third of a point. */
export const MARGIN_AFTER_THREE_YEARS = laneMargin(LANE_TRANSITS + 3 * TRANSITS_PER_YEAR)

/** Does the Lane interval clear a claimed rate? (act-6-02's choice beat.) */
export function intervalClears(claimed: number, confidence = 0.95): boolean {
  return laneInterval(confidence).ci![0] > claimed
}

// ---------------------------------------------------------------------------------------------
// act-6-03 … act-6-08 · The two-proportion case
// ---------------------------------------------------------------------------------------------

/** The accusation's test: Perrine-beneficiary hulls against everyone else, one-sided, POOLED SE. */
export const PERRINE_TEST = twoPropTest({
  x1: PERRINE_LOSSES,
  n1: PERRINE_TRANSITS,
  x2: OTHER_LOSSES,
  n2: OTHER_TRANSITS,
  alt: 'greater',
  random: true,
})

/** p̂c = 31/2,612 — the rate H₀ says both classes share. */
export const POOLED_RATE = PERRINE_TEST.pooled
export const PERRINE_RATE = PERRINE_LOSSES / PERRINE_TRANSITS
export const OTHER_RATE = OTHER_LOSSES / OTHER_TRANSITS
export const OBSERVED_GAP = PERRINE_RATE - OTHER_RATE

/** The four large-counts products under H₀, pooled. The smallest is the beat (≈ 10.7). */
export const pooledCounts = [
  { group: PERRINE_HOLDINGS, n: PERRINE_TRANSITS, expectedLosses: PERRINE_TRANSITS * POOLED_RATE, expectedArrivals: PERRINE_TRANSITS * (1 - POOLED_RATE) },
  { group: 'all other beneficiaries', n: OTHER_TRANSITS, expectedLosses: OTHER_TRANSITS * POOLED_RATE, expectedArrivals: OTHER_TRANSITS * (1 - POOLED_RATE) },
]
/** 900 × p̂c ≈ 10.7 — it passes, and it passes by seven tenths of a hull. */
export const SMALLEST_EXPECTED_COUNT = Math.min(...pooledCounts.flatMap((c) => [c.expectedLosses, c.expectedArrivals]))

/** act-6-07: the interval for the difference — UNPOOLED SE, Perrine minus everyone else. */
export function differenceInterval(confidence = 0.95): InferenceResult {
  return twoPropInterval({ x1: PERRINE_LOSSES, n1: PERRINE_TRANSITS, x2: OTHER_LOSSES, n2: OTHER_TRANSITS, confidence, random: true })
}
export const DIFFERENCE_INTERVAL = differenceInterval(0.95)

/** The four unpooled counts the interval's condition needs (successes and failures in each sample). */
export const intervalCounts = [
  { group: PERRINE_HOLDINGS, successes: PERRINE_LOSSES, failures: PERRINE_TRANSITS - PERRINE_LOSSES },
  { group: 'all other beneficiaries', successes: OTHER_LOSSES, failures: OTHER_TRANSITS - OTHER_LOSSES },
]

// ---------------------------------------------------------------------------------------------
// act-6-06 · Errors and power
// ---------------------------------------------------------------------------------------------

export interface TwoPropPower {
  power: number
  /** P(Type II error) = 1 − power. */
  beta: number
  alpha: number
  /** The difference in sample proportions the test would need to see to reject. */
  rejectAbove: number
  /** SE under H₀ (pooled at the alternative's common rate) and under Hₐ (unpooled). */
  se0: number
  seA: number
}

/**
 * Power of the two-proportion z-test against a specific pair of rates.
 *
 * `@/lib/stats` ships `powerZTestProportion` for the one-sample case only, so the two-sample case is
 * assembled here from the same two library pieces it uses — the standard normal quantile for the
 * cutoff and the standard normal tail for the area beyond it. The cutoff uses the POOLED SE (the
 * test's own SE under H₀, at the common rate the alternative implies); the area uses the UNPOOLED
 * SE at the alternative. Nothing is typed in. (A `powerTwoPropTest` in `src/lib/stats/inference.ts`
 * would be the right home — see the Act VI report's shared-change requests.)
 */
export function powerTwoProportion({
  p1,
  n1,
  p2,
  n2,
  alpha = 0.05,
  alt = 'greater',
}: {
  p1: number
  n1: number
  p2: number
  n2: number
  alpha?: number
  alt?: Alternative
}): TwoPropPower {
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
  const se0 = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  const seA = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
  const delta = p1 - p2
  if (alt === 'greater') {
    const rejectAbove = normal.standardQuantile(1 - alpha) * se0
    return { power: normal.sf((rejectAbove - delta) / seA), beta: 1 - normal.sf((rejectAbove - delta) / seA), alpha, rejectAbove, se0, seA }
  }
  const rejectAbove = normal.standardQuantile(1 - alpha / 2) * se0
  const power = normal.sf((rejectAbove - delta) / seA) + normal.cdf((-rejectAbove - delta) / seA)
  return { power, beta: 1 - power, alpha, rejectAbove, se0, seA }
}

/** The alternative specified before the test: a doubling and a half of the loss rate (DS-09). */
export const ALTERNATIVE_DOUBLING = { p1: 0.021, p2: 0.007 } as const
/** The Board's "consistent with comparable corridors" gap — a difference worth almost nothing. */
export const ALTERNATIVE_COMPARABLE = { p1: 0.012, p2: 0.011 } as const

export function powerAgainst(alt: { p1: number; p2: number }, alpha: number): TwoPropPower {
  return powerTwoProportion({ p1: alt.p1, n1: PERRINE_TRANSITS, p2: alt.p2, n2: OTHER_TRANSITS, alpha, alt: 'greater' })
}

/** The two α's on the table in 6-06, and what each one buys. */
export const ALPHA_OPTIONS = [0.05, 0.01] as const
export const POWER_AT_05 = powerAgainst(ALTERNATIVE_DOUBLING, 0.05)
export const POWER_AT_01 = powerAgainst(ALTERNATIVE_DOUBLING, 0.01)
export const POWER_COMPARABLE_05 = powerAgainst(ALTERNATIVE_COMPARABLE, 0.05)
export const POWER_COMPARABLE_01 = powerAgainst(ALTERNATIVE_COMPARABLE, 0.01)

/** Power as a function of the Perrine rate, everyone else held at the Lane's other-class rate. */
export function powerCurveTwoProp(alpha: number, from: number, to: number, steps = 40): { p1: number; power: number }[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const p1 = from + ((to - from) * i) / steps
    return { p1, power: powerTwoProportion({ p1, n1: PERRINE_TRANSITS, p2: ALTERNATIVE_DOUBLING.p2, n2: OTHER_TRANSITS, alpha, alt: 'greater' }).power }
  })
}

/**
 * The one-proportion power the module teaches with before it applies the two-sample version: a
 * corridor of n transits tested against the Board's baseline. Straight from `@/lib/stats`.
 */
export function corridorPower({ p0, pA, n, alpha = 0.05 }: { p0: number; pA: number; n: number; alpha?: number }) {
  return powerZTestProportion({ p0, pA, n, alpha, alt: 'greater' })
}

// ---------------------------------------------------------------------------------------------
// Simulation support
// ---------------------------------------------------------------------------------------------

/**
 * Ten thousand simulated years of Lane traffic under H₀: both classes at the pooled rate, 900 and
 * 1,712 transits, the pooled z recomputed each time. Used by the p-value visualiser's
 * simulation-vs-normal toggle and by 6-04's reconciliation beat. Deterministic in the seed.
 */
export function simulateNullZ(seed: string | number, reps: number): number[] {
  const r = rng('act-6/null-z', seed)
  const out = new Array<number>(reps)
  for (let i = 0; i < reps; i++) {
    const x1 = r.binomial(PERRINE_TRANSITS, POOLED_RATE)
    const x2 = r.binomial(OTHER_TRANSITS, POOLED_RATE)
    const pc = (x1 + x2) / (PERRINE_TRANSITS + OTHER_TRANSITS)
    const se = Math.sqrt(pc * (1 - pc) * (1 / PERRINE_TRANSITS + 1 / OTHER_TRANSITS))
    out[i] = se > 0 ? (x1 / PERRINE_TRANSITS - x2 / OTHER_TRANSITS) / se : 0
  }
  return out
}

/** The simulated one-sided p: the share of null runs at least as extreme as the observed z. */
export function simulatedPValue(stats: readonly number[], observed: number): number {
  return stats.filter((z) => z >= observed).length / stats.length
}

/** A one-proportion test the drills and the hypothesis console can run on any corridor. */
export function corridorTest({ x, n, p0, alt = 'greater' }: { x: number; n: number; p0: number; alt?: Alternative }): InferenceResult {
  return onePropTest({ x, n, p0, alt, random: true })
}

/** z* for a confidence level — the inverse-CDF call the calc briefing is about. */
export { zStar }

/** Exports used by the ledger-wide displays. */
export { LEDGER_N, PERRINE_N, OTHER_N }
