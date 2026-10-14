/**
 * EPILOGUE · datasets.
 *
 * Two things live here and nothing else.
 *
 * 1. **The findings ledger (act-10-01).** The Epilogue runs no new analysis. Every statistic the
 *    Inspectorate has in front of it was computed in an earlier Act, so this file *imports* those
 *    results read-only — act-6's two-proportion test, act-7's paired t on the Adlinda uprate,
 *    act-8's three chi-squares and the examiner permutation — and adds the only two columns a
 *    hostile review cares about that a p-value does not carry: what the claim is **about**, and the
 *    one sentence a reviewer will press on. Nothing is recomputed. If an earlier Act's dataset
 *    moves, these rows move with it.
 *
 * 2. **DS-20 (act-10-02).** One 2177 intercept and one 2184 drive signature at the Phobos yards.
 *    P(signature | a heavy hull working up) = 0.90, P(signature | not) = 0.05, and a base rate that
 *    is the whole question: 0.02 over the last decade of Phobos traffic, or the 0.20 PROVIDENT was
 *    built on. The posteriors are 0.27 and 0.82, and they are computed here, not written down.
 *
 * There is no randomness in this file. Both modules are deterministic.
 */
import type { Condition, InferenceResult } from '@/lib/stats'
import {
  ALTERNATIVE_COMPARABLE,
  ALTERNATIVE_DOUBLING,
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_HOLDINGS,
  PERRINE_LOSSES,
  PERRINE_TEST,
  PERRINE_TRANSITS,
  SMALLEST_EXPECTED_COUNT,
  powerAgainst,
} from '@/instruments/act-6/data'
import { REFIT_N, REFIT_PAIRED } from '@/instruments/act-7/data'
import {
  BENEFICIARY_TEST,
  CARGO_GOF,
  CORRIDOR_TEST,
  COVER_HULLS,
  DACRE_DIVERTED,
  DACRE_SIGNED,
  DIVERTED_N,
  EXAMINER_CHI2_INVALID,
  EXAMINER_EXPECTED_MIN,
  EXAMINER_PERMUTATION,
  EXAMINER_PERMUTATION_REPS,
  LOSS_N,
  MANIFEST_N,
  P_ON_PICKET_GIVEN_PRESENT,
  P_PICKET_CAN_RESPOND,
  P_WRECKER_PRESENT,
  SLUG_FLIGHT_MIN,
  TORCH_FROM_WATCH_MIN,
  CLOSEST_APPROACH_KM,
  COLD_DISPLACEMENT_M,
  LANE_TRANSIT_TOTAL,
} from '@/instruments/act-8/data'

export {
  ALTERNATIVE_COMPARABLE,
  ALTERNATIVE_DOUBLING,
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_HOLDINGS,
  PERRINE_LOSSES,
  PERRINE_TRANSITS,
  PERRINE_TEST,
  SMALLEST_EXPECTED_COUNT,
  powerAgainst,
}
export { P_PICKET_CAN_RESPOND, P_WRECKER_PRESENT, P_ON_PICKET_GIVEN_PRESENT, SLUG_FLIGHT_MIN, TORCH_FROM_WATCH_MIN, CLOSEST_APPROACH_KM, COLD_DISPLACEMENT_M }
export { REFIT_N, COVER_HULLS, DIVERTED_N }

/**
 * The charge sheet, as the Inspectorate's sitting list prints it: the cover losses by name, in the
 * order act-8 holds them. The count is the count of counts, and it is never typed in the prose.
 */
export const COVER_LIST = COVER_HULLS.join(', ')
export const COVER_N = COVER_HULLS.length

// ═════════════════════════════════════════════════════════════════════════════════════════════
// The findings ledger — what the Inspectorate has, and what each finding is about
// ═════════════════════════════════════════════════════════════════════════════════════════════

export interface Finding {
  /** Stable key; also the exhibit number the hearing uses. */
  id: string
  /** Exhibit number on the Inspectorate's list. */
  exhibit: number
  /** How the exhibit list names it. */
  title: string
  /** The procedure, as an AP student would name it. */
  procedure: string
  /** Symbol for the test statistic. */
  statisticSymbol: string
  statistic: number
  df: number | null
  pValue: number
  /** True when the p-value is a resampled bound rather than a tail area. */
  pIsBound: boolean
  /** Population and variable: what the claim is about, and whom. */
  scope: string
  /** The sentence a hostile reviewer presses on. */
  limitation: string
  /** Conditions as the procedure itself reported them. */
  conditions: readonly Condition[]
  /** False when the procedure's own conditions do not hold, whatever α is chosen. */
  conditionsHold: boolean
  /** Which earlier Act produced it, for the console's provenance column. */
  provenance: string
}

const conditionsOf = (r: InferenceResult): readonly Condition[] => r.conditions
const allMet = (r: InferenceResult): boolean => r.conditions.every((c) => c.met)

/**
 * The permutation bound. Zero of ten thousand relabellings reached the observed gap, so the
 * reported p is an upper bound of one over the number of repetitions and not a tail area.
 */
export const EXAMINER_BOUND = 1 / EXAMINER_PERMUTATION_REPS

export const findings: readonly Finding[] = [
  {
    id: 'rate',
    exhibit: 14,
    title: 'Loss rate by beneficiary',
    procedure: 'two-proportion z-test, one-sided',
    statisticSymbol: 'z',
    statistic: PERRINE_TEST.statistic,
    df: null,
    pValue: PERRINE_TEST.pValue as number,
    pIsBound: false,
    scope: `the ${LANE_TRANSIT_TOTAL.toLocaleString('en-GB')} recorded transits of the Hundred-Day Lane between 2178 and MET 0, and the proportion of them lost`,
    limitation: `The large-counts check passes on the smallest expected count in the table, and it passes by less than one transit. Nothing in the test speaks to why the rates differ.`,
    conditions: conditionsOf(PERRINE_TEST),
    conditionsHold: allMet(PERRINE_TEST),
    provenance: 'MET 141 · the Ledger and the claims register',
  },
  {
    id: 'beneficiary',
    exhibit: 15,
    title: 'Loss × beneficiary, as a two-way table',
    procedure: 'chi-square test for independence',
    statisticSymbol: 'χ²',
    statistic: BENEFICIARY_TEST.statistic,
    df: (BENEFICIARY_TEST.df as number) ?? null,
    pValue: BENEFICIARY_TEST.pValue as number,
    pIsBound: false,
    scope: 'the same transits, cross-classified by outcome and by the beneficiary named on the policy',
    limitation: `On a 2 × 2 table this statistic is the square of exhibit 14's z, computed on the same rows. It is one finding written down twice, and a reviewer who counts it as two has been counted at.`,
    conditions: conditionsOf(BENEFICIARY_TEST),
    conditionsHold: allMet(BENEFICIARY_TEST),
    provenance: 'MET 184 · the same Ledger rows',
  },
  {
    id: 'cargo',
    exhibit: 16,
    title: 'Declared cargo of the lost hulls',
    procedure: 'chi-square goodness-of-fit',
    statisticSymbol: 'χ²',
    statistic: CARGO_GOF.statistic,
    df: (CARGO_GOF.df as number) ?? null,
    pValue: CARGO_GOF.pValue as number,
    pIsBound: false,
    scope: `the declared cargo class of the ${LOSS_N} hulls in the Register, against the Lane's declared mix`,
    limitation: 'Declared cargo is what a manifest says. The finding is about what the lost hulls wrote down, and the whole case is that what they wrote down was false.',
    conditions: conditionsOf(CARGO_GOF),
    conditionsHold: allMet(CARGO_GOF),
    provenance: 'MET 180 · the Register and the Lane mix',
  },
  {
    id: 'corridor',
    exhibit: 17,
    title: 'Cause codes, Lane against the Mars–Belt corridor',
    procedure: 'chi-square test for homogeneity',
    statisticSymbol: 'χ²',
    statistic: CORRIDOR_TEST.statistic,
    df: (CORRIDOR_TEST.df as number) ?? null,
    pValue: CORRIDOR_TEST.pValue as number,
    pIsBound: false,
    scope: 'the distribution of cause codes across two corridors, as recorded by the offices that classified them',
    limitation: 'A cause code is an office’s word for a loss, not the loss. The finding is about how two corridors were written up.',
    conditions: conditionsOf(CORRIDOR_TEST),
    conditionsHold: allMet(CORRIDOR_TEST),
    provenance: 'MET 186 · the two corridors’ registers',
  },
  {
    id: 'uprate',
    exhibit: 21,
    title: 'Mark-9 delay before and after the Adlinda uprate',
    procedure: 'paired t-test on the differences',
    statisticSymbol: 't',
    statistic: REFIT_PAIRED.statistic,
    df: (REFIT_PAIRED.df as number) ?? null,
    pValue: REFIT_PAIRED.pValue as number,
    pIsBound: false,
    scope: `the mean change in Mark-9 delay for the ${REFIT_N} Sulcus hulls the Adlinda yard put through the Mk 3 uprate`,
    limitation: `Twelve hulls through one yard, and the yard chose which twelve. The interval is about those hulls, and a reviewer is entitled to ask what population they are a sample of.`,
    conditions: conditionsOf(REFIT_PAIRED),
    conditionsHold: allMet(REFIT_PAIRED),
    provenance: 'MET 160 · the Adlinda uprate logs',
  },
  {
    id: 'examiner',
    exhibit: 24,
    title: 'Examiner’s signature against diverted departure',
    procedure: 'chi-square for independence — conditions fail; resampling instead',
    statisticSymbol: 'χ²',
    statistic: EXAMINER_CHI2_INVALID.statistic,
    df: (EXAMINER_CHI2_INVALID.df as number) ?? null,
    pValue: EXAMINER_BOUND,
    pIsBound: true,
    scope: `the ${MANIFEST_N} certified departures in the Bureau sample, cross-classified by examining officer and by whether the hull is among the ${DIVERTED_N}`,
    limitation: `The smallest expected count in this table is below one, so the chi-square distribution does not apply to it and the number in the statistic column means nothing. What carries the finding is ${EXAMINER_PERMUTATION_REPS.toLocaleString('en-GB')} relabellings, none of which reached the observed gap — and what it is about is whose signature is on a certificate.`,
    conditions: conditionsOf(EXAMINER_CHI2_INVALID),
    conditionsHold: false,
    provenance: 'MET 190 · the Bureau manifest file',
  },
] as const

export const findingById = (id: string): Finding => {
  const f = findings.find((x) => x.id === id)
  if (!f) throw new Error(`unknown finding "${id}"`)
  return f
}

/** Exhibit 24's own numbers, for the console's caution line. */
export const EXAMINER = {
  signed: DACRE_SIGNED,
  diverted: DACRE_DIVERTED,
  divertedTotal: DIVERTED_N,
  smallestExpected: EXAMINER_EXPECTED_MIN,
  reps: EXAMINER_PERMUTATION_REPS,
  observedDiff: EXAMINER_PERMUTATION.observed,
} as const

/** The levels the reviewer's slider steps through. 0.01 and 0.05 are both landed on exactly. */
export const REVIEW_LEVELS: readonly number[] = [0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1]

/** The level this ship set on the night of MET 140, before it read the register. */
export const PRESPECIFIED_ALPHA = 0.01

export function survivesAt(f: Finding, alpha: number): boolean {
  return f.conditionsHold && f.pValue < alpha
}

export function survivorCount(alpha: number): number {
  return findings.filter((f) => survivesAt(f, alpha)).length
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// The decision at 38,000 km — DS-17's tree, as the hearing puts it back to you
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The probability the learner signed before the dwell: a wrecker present at all, and cold on picket
 * in the approach quarter given that it was. The outcome was inside it. Nothing here re-derives
 * the number; it is act-8's, imported.
 */
export const PICKET = {
  present: P_WRECKER_PRESENT,
  onPicketGivenPresent: P_ON_PICKET_GIVEN_PRESENT,
  canRespond: P_PICKET_CAN_RESPOND,
  slugFlightMin: SLUG_FLIGHT_MIN,
  torchFromWatchMin: TORCH_FROM_WATCH_MIN,
  displacementM: COLD_DISPLACEMENT_M,
  rangeKm: CLOSEST_APPROACH_KM,
} as const

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-20 · The Phobos signature
// ═════════════════════════════════════════════════════════════════════════════════════════════

/** P(this signature | a heavy hull working up). The sensitivity of the intercept. */
export const P_SIGNATURE_GIVEN_HOSTILE = 0.9
/** P(this signature | anything else at a shipyard). The false-alarm rate of the intercept. */
export const P_SIGNATURE_GIVEN_BENIGN = 0.05
/** Achterberg's number: heavy-hull work-ups as a share of Phobos yard months over ten years. */
export const BASE_RATE_MEASURED = 0.02
/** The base rate PROVIDENT's threat assessment used without ever writing it down. */
export const BASE_RATE_ASSUMED = 0.2

export interface PosteriorRow {
  prior: number
  /** P(signature) — the denominator. */
  evidence: number
  /** P(a heavy hull working up | this signature). */
  posterior: number
  /** The two joints, hostile then benign. */
  jointHostile: number
  jointBenign: number
}

export function posterior(prior: number, sensitivity = P_SIGNATURE_GIVEN_HOSTILE, falseAlarm = P_SIGNATURE_GIVEN_BENIGN): PosteriorRow {
  const jointHostile = prior * sensitivity
  const jointBenign = (1 - prior) * falseAlarm
  const evidence = jointHostile + jointBenign
  return { prior, evidence, posterior: evidence > 0 ? jointHostile / evidence : NaN, jointHostile, jointBenign }
}

export const POSTERIOR_MEASURED = posterior(BASE_RATE_MEASURED)
export const POSTERIOR_ASSUMED = posterior(BASE_RATE_ASSUMED)

/** The posterior as a function of the prior, for the curve. */
export function posteriorCurve(sensitivity: number, falseAlarm: number, steps = 60): { prior: number; posterior: number }[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const prior = i / steps
    return { prior, posterior: posterior(prior, sensitivity, falseAlarm).posterior }
  })
}

/** Natural frequencies out of this many yard-months, which is how the tree reads out loud. */
export const FREQUENCY_BASE = 10_000

export interface FrequencyBox {
  base: number
  hostile: number
  hostileWithSignature: number
  benign: number
  benignWithSignature: number
  withSignature: number
}

export function frequencyBox(prior: number, sensitivity = P_SIGNATURE_GIVEN_HOSTILE, falseAlarm = P_SIGNATURE_GIVEN_BENIGN, base = FREQUENCY_BASE): FrequencyBox {
  const hostile = prior * base
  const benign = base - hostile
  const hostileWithSignature = hostile * sensitivity
  const benignWithSignature = benign * falseAlarm
  return { base, hostile, hostileWithSignature, benign, benignWithSignature, withSignature: hostileWithSignature + benignWithSignature }
}

/** The 2177 intercept, verbatim. Seven years old, and the whole of PROVIDENT's case. */
export const INTERCEPT_2177 =
  'Directorate staff assessment, third quarter: the Jovian compact cannot defend its own approaches and will not be funded to. Any move against it is a matter of timing and not of capability.'

export const INTERCEPT_YEAR = 2177
export const PHOBOS_SIGNATURE_YEAR = 2184
