/**
 * Shared framings and guards for the Act VII drill generators (Unit 7 — inference for means).
 *
 * Every Act VII drill runs on a *quantitative* measurement in a Lane context that is not one of the
 * Act's own datasets: other yards, other drive families, other corridors, other ships' cold runs.
 * The Refit set's twelve hulls, Nightjar's eight cold profiles and the Ledger's 2,612 transits
 * belong to the mission beats, and `reservedValue` keeps a drill from accidentally printing one of
 * their numbers back at the learner.
 *
 *   ONE_SAMPLE_CONTEXTS   one group, one quantitative measurement, a specification to compare with
 *   PAIRED_CONTEXTS       the same units measured twice — the structure 7-04 is about
 *   TWO_SAMPLE_CONTEXTS   two independent groups of units
 *   LEVELS / ALPHAS       confidence levels and significance levels a Lane office writes down
 *   shuffleChoice         the choice-item helper (options, correct index, per-option feedback)
 *   reservedValue         guard against drawing a number the Act's own beats own
 */
import type { Rng } from '@/lib/rng'

// ---------------------------------------------------------------------------------------------
// Framings
// ---------------------------------------------------------------------------------------------

export interface OneSampleContext {
  /** Who produced the data. */
  office: string
  /** Plural unit: "reactors", "cold runs", "panels". */
  unit: string
  /** The measured quantity, named: "certified thrust". */
  measure: string
  /** Units of measurement, abbreviated: "kN". */
  units: string
  /** The parameter, named in full: "mean certified thrust of Tessera-C reactors after overhaul". */
  parameter: string
  /** Population the units were drawn from, named: "Tessera-C reactors overhauled at Elara". */
  population: string
  /** A published figure the mean is read against. */
  standardLabel: string
  /** Plausible centre and spread for a draw, in `units`. */
  centre: number
  spread: number
  /** Digits the office reports this measurement to. */
  digits: number
}

export const ONE_SAMPLE_CONTEXTS: readonly OneSampleContext[] = [
  {
    office: 'the Elara Yard test cell',
    unit: 'reactors',
    measure: 'certified thrust after overhaul',
    units: 'kN',
    parameter: 'mean certified thrust of overhauled Tessera-C reactors',
    population: 'Tessera-C reactors overhauled at Elara',
    standardLabel: 'the Tessera-C rating',
    centre: 441,
    spread: 9,
    digits: 1,
  },
  {
    office: "the Adrastea tender's engineering log",
    unit: 'cold runs',
    measure: 'endurance to sink saturation',
    units: 'h',
    parameter: 'mean endurance to saturation on the Quiet profile',
    population: 'Quiet-profile cold runs aboard the tender',
    standardLabel: 'the design-book figure',
    centre: 96,
    spread: 6.5,
    digits: 1,
  },
  {
    office: 'the Ceres berth office',
    unit: 'departures',
    measure: 'turnaround time at the deep berths',
    units: 'h',
    parameter: 'mean turnaround time at the Ceres deep berths',
    population: 'departures from the Ceres deep berths',
    standardLabel: "the Authority's published turnaround",
    centre: 38,
    spread: 5.5,
    digits: 1,
  },
  {
    office: 'the Himalia relay office',
    unit: 'transits',
    measure: 'time to the outer mark against the filed plot',
    units: 'd',
    parameter: 'mean delay against the filed plot on the Himalia run',
    population: 'transits of the Leda–Himalia local run',
    standardLabel: 'the filed plot',
    centre: 1.4,
    spread: 2.1,
    digits: 2,
  },
  {
    office: 'the Thebe Yard radiator shop',
    unit: 'panels',
    // "reject" is a forbidden token in a fail-to-reject conclusion, so this measure says "shed".
    measure: 'heat shed at the rated coolant flow',
    units: 'kW',
    parameter: 'mean heat shed per panel at rated flow',
    population: 'radiator panels rebuilt at Thebe',
    standardLabel: "the shop's rebuild standard",
    centre: 74,
    spread: 4.2,
    digits: 1,
  },
  {
    office: 'the Carme relay office',
    unit: 'hulls',
    measure: 'fuel remaining at the outer mark',
    units: 't',
    parameter: 'mean fuel remaining at the outer mark',
    population: 'hulls arriving at the Carme outer mark',
    standardLabel: "the operator's reserve figure",
    centre: 212,
    spread: 26,
    digits: 1,
  },
]

export interface PairedContext {
  office: string
  /** Plural unit measured twice: "hulls", "coolers", "masters". */
  unit: string
  /** What changed between the two measurements. */
  intervention: string
  /** The measurement: "time to the outer mark". */
  measure: string
  units: string
  /** How the first column is labelled. */
  beforeLabel: string
  afterLabel: string
  /** The parameter: "mean change in time to the outer mark after the retune". */
  parameter: string
  population: string
  /** Plausible mean difference (after − before) and its spread. */
  shift: number
  spread: number
  digits: number
}

export const PAIRED_CONTEXTS: readonly PairedContext[] = [
  {
    office: 'the Thebe Yard drive shop',
    unit: 'hulls',
    intervention: 'a throttle-map retune',
    measure: 'time to the outer mark',
    units: 'd',
    beforeLabel: 'last run before the retune',
    afterLabel: 'first run after it',
    parameter: 'mean change in time to the outer mark',
    population: 'hulls that went through the Thebe retune',
    shift: -0.9,
    spread: 1.3,
    digits: 2,
  },
  {
    office: "the tender's cryogenics bay",
    unit: 'coolers',
    intervention: 'a bearing replacement',
    measure: 'hours to first over-temperature alarm',
    units: 'h',
    beforeLabel: 'the run logged before the change',
    afterLabel: 'the matched run after it',
    parameter: 'mean change in hours to first alarm',
    population: 'cryocoolers serviced at the tender',
    shift: 6.4,
    spread: 4.1,
    digits: 1,
  },
  {
    office: 'the Adrastea Lane Office',
    unit: 'masters',
    intervention: 'a revised filing procedure',
    measure: 'minutes spent filing a departure plot',
    units: 'min',
    beforeLabel: 'under the old procedure',
    afterLabel: 'under the revised one',
    parameter: 'mean change in minutes spent filing',
    population: 'masters filing at Adrastea',
    shift: -7.5,
    spread: 9,
    digits: 1,
  },
  {
    office: 'the Ceres survey office',
    unit: 'berths',
    intervention: 'a new mooring clamp',
    measure: 'minutes to secure a hull',
    units: 'min',
    beforeLabel: 'with the old clamp',
    afterLabel: 'with the new one',
    parameter: 'mean change in minutes to secure a hull',
    population: 'berths at the Ceres deep docks',
    shift: -4.2,
    spread: 5.5,
    digits: 1,
  },
  {
    office: 'the Elara Station sensor shop',
    unit: 'arrays',
    intervention: 'a recalibration against a reference star',
    measure: 'pointing error',
    units: 'arcsec',
    beforeLabel: 'before recalibration',
    afterLabel: 'after it',
    parameter: 'mean change in pointing error',
    population: 'arrays serviced at Elara Station',
    shift: -3.1,
    spread: 3.4,
    digits: 2,
  },
]

export interface TwoSampleContext {
  office: string
  unit: string
  measure: string
  units: string
  /** Names of the two independent groups. */
  groupA: string
  groupB: string
  parameter: string
  /** Population each group is drawn from, for the conclusion's context. */
  population: string
  centre: number
  spread: number
  digits: number
}

export const TWO_SAMPLE_CONTEXTS: readonly TwoSampleContext[] = [
  {
    office: 'the Ceres Authority traffic office',
    unit: 'transits',
    measure: 'delay against the filed plot',
    units: 'd',
    groupA: 'convoyed transits',
    groupB: 'independently routed transits',
    parameter: 'difference in mean delay against the filed plot',
    population: 'transits of the Ceres–Vesta ore run',
    centre: 0.6,
    spread: 2.4,
    digits: 2,
  },
  {
    office: 'the Elara Yard test cell',
    unit: 'reactors',
    measure: 'certified thrust',
    units: 'kN',
    groupA: 'reactors overhauled at Elara',
    groupB: 'reactors overhauled at Thebe',
    parameter: 'difference in mean certified thrust',
    population: 'Tessera-C reactors on the Jovian register',
    centre: 441,
    spread: 11,
    digits: 1,
  },
  {
    office: 'the Himalia traffic office',
    unit: 'hulls',
    measure: 'fuel remaining at the outer mark',
    units: 't',
    groupA: 'hulls on the long geometry',
    groupB: 'hulls on the short geometry',
    parameter: 'difference in mean fuel remaining',
    population: 'hulls working the Leda–Himalia run',
    centre: 205,
    spread: 30,
    digits: 1,
  },
  {
    office: 'the Adrastea Lane Office',
    unit: 'cold runs',
    measure: 'endurance to sink saturation',
    units: 'h',
    groupA: 'runs on the original sink',
    groupB: 'runs on the replacement sink',
    parameter: 'difference in mean endurance to saturation',
    population: 'cold runs logged by the Adrastea tenders',
    centre: 92,
    spread: 8,
    digits: 1,
  },
  {
    office: 'the Carme relay office',
    unit: 'departures',
    measure: 'turnaround time',
    units: 'h',
    groupA: 'departures cleared by the day watch',
    groupB: 'departures cleared by the night watch',
    parameter: 'difference in mean turnaround time',
    population: 'departures from the Carme relay',
    centre: 33,
    spread: 6,
    digits: 1,
  },
]

// ---------------------------------------------------------------------------------------------
// Levels and guards
// ---------------------------------------------------------------------------------------------

/** Confidence levels a Lane office actually writes down, including three no table has a row for. */
export const LEVELS = [0.8, 0.9, 0.92, 0.95, 0.96, 0.98, 0.99] as const
export const ALPHAS = [0.01, 0.05, 0.10] as const

export type Candidate = { text: string; correct: boolean; why: string | null }

export function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

/**
 * Counts reserved for the Act's own datasets and mission beats: the Refit set's twelve hulls and
 * their 588 kN spec, the eight cold profiles, the nineteen, the 900 / 1,712 / 881 / 2,612 transits
 * and the Act's degrees of freedom. A drill that prints one of these invites the learner to answer
 * from memory rather than from the file in front of them.
 */
const RESERVED_COUNTS = new Set([8, 11, 12, 18, 19, 31, 588, 612, 881, 900, 1712, 2612])
/** Statistics reserved the same way: 1.9 d, t 3.9, t 1.7, 8.9 h, 2.8 d, 0.25 d, 2.6 d, 4.1%. */
const RESERVED_STATS = [1.9, 3.9, 1.7, 8.9, 2.8, 2.6, 0.25, 4.88, 5.28, 11.73]

export const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
export const reservedStat = (v: number): boolean => RESERVED_STATS.some((r) => Math.abs(v - r) < 0.03)

/** A sample size for a small-sample t procedure: big enough to graph, small enough to need t. */
export const smallN = (rng: Rng, lo = 7, hi = 24): number => {
  let n = rng.int(lo, hi)
  while (reservedCount(n)) n = rng.int(lo, hi)
  return n
}
