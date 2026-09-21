/**
 * Act V datasets — "Noise Floor" (docs/beat-sheet.md §2).
 *
 *   DS-09  The Transit Ledger — every Lane transit 2178 → MET 0. 2,612 rows (Perrine 900,
 *          Mercantile 1,100, independent 612), 31 of them losses. The variable Act V lives on is
 *          `mark9Delay`: actual minus scheduled time to Mark 9 against the nominal 3.00-mgee plot.
 *   DS-08  Cutter reports and corridor baselines — Asgard 3/410, Tindr 1/380, the Board's Lane and
 *          Mars–Belt rates, and Rook's own 2176 Asgard report.
 *   DS-01  (imported, read-only) the Register's 31 loss records, for the mark axis of act-5-03.
 *   DS-02  (imported, read-only) the nineteen's hidden-truth profiles — their thrust-limited delay
 *          d_i and Lane length come from Act II's `nineteenProfiles`, so the two Acts agree.
 *
 * Generating story (DS-00). Every hull carries a persistent filing offset u_hull ~ N(0, 2.5) d
 * (Perrine N(0.2, 2.5): they file a hair slow), and every transit adds run noise N(0, 0.9) d, so the
 * fleet SD of delay is √(2.5² + 0.9²) ≈ 2.66 d. The nineteen diverted transits add the hull's
 * thrust-limited lateness d_i ≈ 2.0–3.1 d, because a hull carrying undeclared mass on its filed
 * profile simply cannot make the acceleration it plotted.
 *
 * Determinism: every draw goes through `@/lib/rng` with fixed string seeds, and a deterministic seed
 * search picks the first attempt that reproduces the registry's headline numbers, so the Ledger is
 * identical on every load and in every module. `data.test.ts` asserts those numbers.
 *
 * The `diverted` field encodes the hidden truth for tests and later Acts; Act V instruments never
 * display it — the learner sees owner class and `lost`, which is all the Board has.
 */
import { Rng, rng } from '@/lib/rng'
import { binomial, mean, normal, sd, samplingSdMean, samplingSdProportion, zStar } from '@/lib/stats'
import { LANE, nineteenProfiles, scheduledT9, type OwnerClass } from '@/instruments/act-2/data'
import { losses as registerLosses, lossMarks } from '@/instruments/act-1/data'

export type { OwnerClass }

// ---------------------------------------------------------------------------------------------
// DS-08 · Cutter reports and corridor baselines (the Board's rebuttal table, MET 110)
// ---------------------------------------------------------------------------------------------

export interface PatrolReport {
  /** Cutter or corridor name as the Board's table prints it. */
  name: string
  losses: number
  transits: number
  note: string
}

/** The two Lane cutters' observed records — the Board's "patrol data show no consistent anomaly". */
export const CUTTERS: Record<'asgard' | 'tindr', PatrolReport> = {
  asgard: { name: 'CSV Asgard', losses: 3, transits: 410, note: 'Lane patrol, 410 observed transits' },
  tindr: { name: 'CSV Tindr', losses: 1, transits: 380, note: 'Lane patrol, 380 observed transits' },
}

/** The Board's Lane figure (the Ledger snapshot at MET 0) and its comparison corridor. */
export const BOARD_TABLE: Record<'lane' | 'marsBelt', PatrolReport> = {
  lane: { name: 'Hundred-Day Lane', losses: 31, transits: 2612, note: 'Authority Transit Ledger, 2178 → MET 0' },
  marsBelt: { name: 'Mars–Belt corridor', losses: 46, transits: 4180, note: "the Board's comparison corridor" },
}

/** Rook's own 2176 Asgard report on the Lane, 2168–76 — the other baseline (act-5-05). */
export const ROOK_2176: PatrolReport = { name: 'Asgard report, 2176', losses: 13, transits: 2580, note: 'Lane, 2168–76; CDR A. Rook' }

export const rateOf = (r: PatrolReport): number => r.losses / r.transits

/** P(X ≤ observed losses) for a patrol under an assumed Lane rate — "is three in 410 ordinary?" */
export function patrolTailBelow(report: PatrolReport, p: number): number {
  return binomial.cdf(report.losses, report.transits, p)
}

// ---------------------------------------------------------------------------------------------
// DS-09 · The Transit Ledger
// ---------------------------------------------------------------------------------------------

export const OWNER_CLASSES: readonly OwnerClass[] = ['Perrine', 'Mercantile', 'independent'] as const

/** Transits by owner class over the six years (DS-09). Perrine + other = 2,612. */
export const TRANSITS_BY_OWNER: Record<OwnerClass, number> = { Perrine: 900, Mercantile: 1100, independent: 612 }
export const LEDGER_N = 2612
export const PERRINE_N = TRANSITS_BY_OWNER.Perrine
export const OTHER_N = TRANSITS_BY_OWNER.Mercantile + TRANSITS_BY_OWNER.independent

/** Hulls on the Lane, by owner class — each with a persistent filing offset. */
const HULLS_BY_OWNER: Record<OwnerClass, number> = { Perrine: 120, Mercantile: 150, independent: 100 }

/** Losses among the honest 2,593: four cover losses (independents) and eight genuine casualties. */
const COVER_LOSSES = 4
const GENUINE_MERCANTILE = 5
const GENUINE_INDEPENDENT = 3

/** Per-hull filing offset SD and per-transit run noise SD, days (DS-00). */
export const HULL_OFFSET_SD = 2.5
export const RUN_NOISE_SD = 0.9
/** The Perrine fleet files a hair slow: their offsets are centred here, not on zero. */
export const PERRINE_OFFSET_MEAN = 0.2

/** The Lane's length at departure moves with the cycle (DS-09): 2.4–8.0 AU. */
export const LANE_LENGTH_RANGE: readonly [number, number] = [2.4, 8.0]

export interface Transit {
  id: number
  /** Registry code (the Ledger's own identifier) or, for the nineteen, the hull's name. */
  hull: string
  ownerClass: OwnerClass
  /** Calendar year of departure, 2178–2184. */
  year: number
  /** Lane length at departure, AU. */
  laneLengthAU: number
  /** Scheduled time to Mark 9 on the nominal 3.00-mgee plot, days. */
  scheduledT9: number
  /** Actual − scheduled time to Mark 9 against the nominal plot, days. THE Act V variable. */
  mark9Delay: number
  lost: boolean
  /** Hidden truth — never shown by an Act V instrument. */
  diverted: boolean
}

interface HullRecord {
  hull: string
  ownerClass: OwnerClass
  offset: number
}

const PREFIX: Record<OwnerClass, string> = { Perrine: 'PRN', Mercantile: 'MCT', independent: 'IND' }

function buildHulls(r: Rng): Record<OwnerClass, HullRecord[]> {
  const out = {} as Record<OwnerClass, HullRecord[]>
  for (const owner of OWNER_CLASSES) {
    out[owner] = Array.from({ length: HULLS_BY_OWNER[owner] }, (_, i) => ({
      hull: `${PREFIX[owner]}-${String(1000 + i * 7 + (owner === 'Perrine' ? 3 : owner === 'Mercantile' ? 5 : 9))}`,
      ownerClass: owner,
      offset: r.normal(owner === 'Perrine' ? PERRINE_OFFSET_MEAN : 0, HULL_OFFSET_SD),
    }))
  }
  return out
}

interface LedgerGen {
  transits: Transit[]
}

function generateLedger(attempt: number): LedgerGen {
  const r = rng('DS-09', attempt)
  const hulls = buildHulls(r)
  const rows: Transit[] = []

  const push = (h: HullRecord, extraDelay: number, lost: boolean, diverted: boolean, laneLengthAU: number, year: number, hullName = h.hull) => {
    const sched = scheduledT9(laneLengthAU)
    const delay = h.offset + extraDelay + r.normal(0, RUN_NOISE_SD)
    rows.push({
      id: rows.length,
      hull: hullName,
      ownerClass: h.ownerClass,
      year,
      laneLengthAU: Math.round(laneLengthAU * 100) / 100,
      scheduledT9: Math.round(sched * 10) / 10,
      mark9Delay: Math.round(delay * 100) / 100,
      lost,
      diverted,
    })
  }

  // --- the nineteen: one diverted transit each, on the Act II hidden-truth profile ---
  const perrineHulls = hulls.Perrine
  for (let i = 0; i < nineteenProfiles.length; i++) {
    const p = nineteenProfiles[i]
    const h = perrineHulls[i]
    push(h, p.thrustDelay, true, true, p.laneLengthAU, Number(p.departureDate.slice(0, 4)), p.hull)
  }

  // --- the twelve honest losses: four cover losses (independents) and eight genuine casualties ---
  const honestLossPlan: { owner: OwnerClass; count: number }[] = [
    { owner: 'independent', count: COVER_LOSSES + GENUINE_INDEPENDENT },
    { owner: 'Mercantile', count: GENUINE_MERCANTILE },
  ]
  const hullCursor: Record<OwnerClass, number> = { Perrine: nineteenProfiles.length, Mercantile: 0, independent: 0 }
  for (const { owner, count } of honestLossPlan) {
    for (let k = 0; k < count; k++) {
      const h = hulls[owner][hullCursor[owner]++]
      push(h, 0, true, false, r.uniform(...LANE_LENGTH_RANGE), r.int(2178, 2184))
    }
  }

  // --- the remaining 2,581 honest arrivals, spread over the hulls of each owner class ---
  const remaining: Record<OwnerClass, number> = {
    Perrine: TRANSITS_BY_OWNER.Perrine - nineteenProfiles.length,
    Mercantile: TRANSITS_BY_OWNER.Mercantile - GENUINE_MERCANTILE,
    independent: TRANSITS_BY_OWNER.independent - (COVER_LOSSES + GENUINE_INDEPENDENT),
  }
  for (const owner of OWNER_CLASSES) {
    const fleet = hulls[owner]
    for (let k = 0; k < remaining[owner]; k++) {
      const h = fleet[k % fleet.length]
      push(h, 0, false, false, r.uniform(...LANE_LENGTH_RANGE), r.int(2178, 2184))
    }
  }

  return { transits: r.shuffle(rows).map((t, id) => ({ ...t, id })) }
}

function acceptLedger(g: LedgerGen): boolean {
  const { transits } = g
  if (transits.length !== LEDGER_N) return false
  const honest = transits.filter((t) => !t.diverted).map((t) => t.mark9Delay)
  const nineteen = transits.filter((t) => t.diverted).map((t) => t.mark9Delay)
  const mu = mean(honest)
  const sigma = sd(honest)
  // The Lane's honest delay is centred on the nominal plot and spread over days (DS-00: SD ≈ 2.66).
  if (Math.abs(mu) > 0.12) return false
  if (sigma < 2.54 || sigma > 2.78) return false
  const nineteenMean = mean(nineteen)
  // The nineteen average +2.8 d (0.2 Perrine offset + 2.6 thrust limitation).
  if (nineteenMean < 2.7 || nineteenMean > 3.0) return false
  if (sd(nineteen) < 2.2 || sd(nineteen) > 3.2) return false
  // Individually unremarkable: about one honest transit in seven is that late.
  const pIndividual = normal.sf(nineteenMean, mu, sigma)
  if (pIndividual < 0.12 || pIndividual > 0.19) return false
  // Collectively impossible: z on the mean of nineteen ≈ 4.5.
  const z = (nineteenMean - mu) / samplingSdMean(sigma, nineteen.length)
  if (z < 4.35 || z > 4.95) return false
  // One or two of the nineteen clear the 1 % cutoff (gate review, act-5-02) — never none, never many.
  const cutoff = normal.quantile(0.99, mu, sigma)
  const above = nineteen.filter((d) => d >= cutoff).length
  if (above < 1 || above > 2) return false
  // The honest Perrine fleet must be unremarkable against the rest (act-5-05's null, Act VII's lesson).
  const perrineHonest = transits.filter((t) => t.ownerClass === 'Perrine' && !t.diverted).map((t) => t.mark9Delay)
  const otherHonest = transits.filter((t) => t.ownerClass !== 'Perrine').map((t) => t.mark9Delay)
  if (Math.abs(mean(perrineHonest) - mean(otherHonest)) > 0.45) return false
  return true
}

let generated: LedgerGen | null = null
let ledgerAttempt = 0
for (let attempt = 0; attempt < 600 && !generated; attempt++) {
  const g = generateLedger(attempt)
  if (acceptLedger(g)) {
    generated = g
    ledgerAttempt = attempt
  }
}
if (!generated) throw new Error('DS-09: no seed satisfied the Ledger acceptance rule in 600 attempts')

/** DS-09 — the Transit Ledger at the MET 0 snapshot. 2,612 rows, identical on every load. */
export const ledger: readonly Transit[] = generated.transits
/** Which `rng('DS-09', attempt)` produced the accepted Ledger (tests' audit trail). */
export const LEDGER_SEED_ATTEMPT = ledgerAttempt

export const LEDGER_COLUMNS = ['id', 'hull', 'ownerClass', 'year', 'laneLengthAU', 'scheduledT9', 'mark9Delay', 'lost'] as const

/** The 2,593 transits that flew the Lane honestly (everything but the nineteen). */
export const honestTransits: readonly Transit[] = ledger.filter((t) => !t.diverted)
/** The nineteen diverted transits — the hidden truth, used for targets and tests only. */
export const divertedTransits: readonly Transit[] = ledger.filter((t) => t.diverted)

export const honestDelays: number[] = honestTransits.map((t) => t.mark9Delay)
export const nineteenDelays: number[] = divertedTransits.map((t) => t.mark9Delay)

/** The Lane's honest Mark-9 delay: the normal model act-5-02 and act-5-03 work on. */
export const LANE_DELAY_MEAN = mean(honestDelays)
export const LANE_DELAY_SD = sd(honestDelays)

/** The nineteen's own mean and SD of delay (act-5-02's "as late as their average", act-5-03's x̄). */
export const NINETEEN_N = divertedTransits.length
export const NINETEEN_MEAN_DELAY = mean(nineteenDelays)
export const NINETEEN_SD_DELAY = sd(nineteenDelays)

/** The delay above which only 1 % of honest transits fall (act-5-02's inverse-normal answer). */
export const DELAY_CUTOFF_1PCT = normal.quantile(0.99, LANE_DELAY_MEAN, LANE_DELAY_SD)
/** How many of the nineteen clear it — one or two, per seed. That is the lesson. */
export const NINETEEN_ABOVE_CUTOFF = nineteenDelays.filter((d) => d >= DELAY_CUTOFF_1PCT).length
/** P(one honest transit is at least as late as the nineteen's average) — about one in seven. */
export const P_HONEST_AS_LATE = normal.sf(NINETEEN_MEAN_DELAY, LANE_DELAY_MEAN, LANE_DELAY_SD)
/** Expected number of honest transits among nineteen above the 1 % cutoff. */
export const EXPECTED_ABOVE_CUTOFF = NINETEEN_N * 0.01

/** SD of the mean delay of nineteen honest transits, σ/√19 (act-5-03). */
export const SE_MEAN_19 = samplingSdMean(LANE_DELAY_SD, NINETEEN_N)
/** Where the nineteen's mean sits on that sampling distribution. */
export const Z_MEAN_19 = (NINETEEN_MEAN_DELAY - LANE_DELAY_MEAN) / SE_MEAN_19
export const P_MEAN_19 = normal.sf(Z_MEAN_19)

// --- the mark axis (act-5-03's second test, run on all 31 losses per the gate review) ---

/** The Board's null for where a loss happens: mark uniform on [1, 12] — μ = 6.5, σ = 11/√12. */
export const MARK_NULL = { a: 1, b: 12, mean: 6.5, sd: 11 / Math.sqrt(12) } as const
/** Mark at last contact for all 31 losses (DS-01, Act I's Register). */
export const lossMarksAll: readonly number[] = lossMarks
export const MARK_MEAN_31 = mean(lossMarksAll)
export const SE_MARK_31 = samplingSdMean(MARK_NULL.sd, lossMarksAll.length)
export const Z_MARK_31 = (MARK_MEAN_31 - MARK_NULL.mean) / SE_MARK_31
/** The same test run on the nineteen alone — post-selected, which is Ferrier's point. */
export const nineteenMarks: readonly number[] = registerLosses.filter((l) => l.group === 'diverted').map((l) => l.mark_last)
export const MARK_MEAN_19 = mean(nineteenMarks)
export const SE_MARK_19 = samplingSdMean(MARK_NULL.sd, nineteenMarks.length)
export const Z_MARK_19 = (MARK_MEAN_19 - MARK_NULL.mean) / SE_MARK_19

// ---------------------------------------------------------------------------------------------
// Null models — proportions (act-5-04) and differences in means (act-5-05)
// ---------------------------------------------------------------------------------------------

/** The Lane's pooled loss rate over the Ledger snapshot: 31 / 2,612. */
export const POOLED_RATE = BOARD_TABLE.lane.losses / BOARD_TABLE.lane.transits
/** SD of p̂ for a fleet of 900 transits at the Lane rate (act-5-04). */
export const SD_PHAT_PERRINE = samplingSdProportion(POOLED_RATE, PERRINE_N)
export const SD_PHAT_OTHER = samplingSdProportion(POOLED_RATE, OTHER_N)
/** Large-counts check for the 900: n·p ≈ 10.7 — it passes, narrowly, and Ferrier wants the number. */
export const LARGE_COUNTS_PERRINE = PERRINE_N * POOLED_RATE
export const LARGE_COUNTS_OTHER = OTHER_N * POOLED_RATE
/** SD of p̂₁ − p̂₂ under a common rate — variances add (act-5-04). */
export const SD_DIFF_PROPORTIONS = Math.sqrt(SD_PHAT_PERRINE ** 2 + SD_PHAT_OTHER ** 2)
/** The gap between two owner classes that would be a 1-in-100 event under a common rate. */
export const GAP_1_IN_100 = zStar(0.98) * SD_DIFF_PROPORTIONS

/** SD of x̄₁ − x̄₂ in mean delay for 900 against 1,712, under a common Lane mean (act-5-05). */
export const SD_DIFF_MEANS_FLEETS = Math.sqrt(LANE_DELAY_SD ** 2 / PERRINE_N + LANE_DELAY_SD ** 2 / OTHER_N)
/** Surviving Perrine transits: 900 − 19. */
export const SURVIVING_PERRINE_N = PERRINE_N - NINETEEN_N
/** SD of x̄₁ − x̄₂ for nineteen against 881 — the small group carries the spread. */
export const SD_DIFF_MEANS_SMALL = Math.sqrt(LANE_DELAY_SD ** 2 / NINETEEN_N + LANE_DELAY_SD ** 2 / SURVIVING_PERRINE_N)
/** The gap in mean delay between 19 and 881 that would be a 1-in-1,000 event under a common mean. */
export const GAP_1_IN_1000 = zStar(0.998) * SD_DIFF_MEANS_SMALL

// ---------------------------------------------------------------------------------------------
// Sampling machinery for the instruments (all randomness through the Rng the <Sim> hands over)
// ---------------------------------------------------------------------------------------------

/** Statistics the act-5-01 builder can stack over repeated patrols. */
export type PatrolStatistic = 'rate' | 'meanDelay' | 'medianDelay' | 'minOfTwo' | 'maxOfTwo' | 'meanOfTwo'
export const PATROL_STATISTIC_LABEL: Record<PatrolStatistic, string> = {
  rate: 'loss rate of one patrol',
  meanDelay: 'mean Mark-9 delay of one patrol',
  medianDelay: 'median Mark-9 delay of one patrol',
  minOfTwo: "lower of two patrols' loss rates",
  maxOfTwo: "higher of two patrols' loss rates",
  meanOfTwo: "average of two patrols' loss rates",
}

/** Whether a statistic is a rate (0–1) or a delay in days — the builder's axis and truth line. */
export const isRateStatistic = (s: PatrolStatistic): boolean => s !== 'meanDelay' && s !== 'medianDelay'

/** The population value a patrol statistic is trying to estimate. */
export function patrolTruth(stat: PatrolStatistic): number {
  if (stat === 'meanDelay' || stat === 'medianDelay') return mean(ledger.map((t) => t.mark9Delay))
  return ledger.filter((t) => t.lost).length / ledger.length
}

/**
 * One patrol: `n` transits drawn from the Lane's six years. A patrol is a window on a *process*, so
 * the draw is with replacement — n independent transits, exactly the Bernoulli model act-5-04 builds.
 */
export function drawPatrol(r: Rng, n: number): Transit[] {
  return r.resample(ledger as Transit[], n)
}

/** One value of a patrol statistic (two patrols are drawn for the min/max/mean-of-two forms). */
export function drawPatrolStatistic(r: Rng, stat: PatrolStatistic, n: number): number {
  if (stat === 'meanDelay') return mean(drawPatrol(r, n).map((t) => t.mark9Delay))
  if (stat === 'medianDelay') {
    const xs = drawPatrol(r, n)
      .map((t) => t.mark9Delay)
      .sort((a, b) => a - b)
    const mid = xs.length >> 1
    return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2
  }
  const rate = (k: number) => drawPatrol(r, k).filter((t) => t.lost).length / k
  if (stat === 'rate') return rate(n)
  const a = rate(n)
  const b = rate(n)
  if (stat === 'minOfTwo') return Math.min(a, b)
  if (stat === 'maxOfTwo') return Math.max(a, b)
  return (a + b) / 2
}

/** Stack a patrol statistic over `reps` repetitions. */
export function simulatePatrols(r: Rng, stat: PatrolStatistic, n: number, reps: number): number[] {
  const out = new Array<number>(reps)
  for (let i = 0; i < reps; i++) out[i] = drawPatrolStatistic(r, stat, n)
  return out
}

/**
 * Parent populations for the CLT machine (act-5-03) and its difference mode (act-5-05). Each maps to
 * a `@/lib/sim` task parameter set, so the Monte Carlo runs in the worker and never blocks the UI.
 */
export interface ParentSpec {
  id: string
  label: string
  /** Params for the `sample-mean` simulation task (parent + its parameters). */
  params: Record<string, unknown>
  /** Axis label for one draw from the parent. */
  unitLabel: string
  /** One line on what this population is, in world. */
  note: string
}

export const PARENTS: ParentSpec[] = [
  {
    id: 'lane-delay',
    label: 'Lane delay · honest transits',
    params: { parent: 'normal', mu: LANE_DELAY_MEAN, sigma: LANE_DELAY_SD },
    unitLabel: 'Mark-9 delay (d)',
    note: 'The Ledger’s 2,593 honest transits: centred on the nominal plot, spread over days.',
  },
  {
    id: 'mark',
    label: 'Mark at last contact · the Board’s null',
    params: { parent: 'uniform', a: MARK_NULL.a, b: MARK_NULL.b },
    unitLabel: 'mark',
    note: 'Losses “spread along the Lane”: uniform on marks 1 to 12. Flat, and nothing like normal.',
  },
  {
    id: 'time-to-silence',
    label: 'Time to silence · strongly skewed',
    params: { parent: 'skewed', shape: 2, scale: 1.7 },
    unitLabel: 'hours to silence',
    note: 'A long right tail: most silences are quick, a few take most of a watch.',
  },
  {
    id: 'plume',
    label: 'Plume power · two drive families',
    params: { parent: 'bimodal', mu1: 0.22, mu2: 0.29, sigma: 0.02, w: 0.45 },
    unitLabel: 'plume power (TW)',
    note: 'Tessera-C near 0.22 TW, Mk 3 near 0.29 — two humps, no centre.',
  },
  {
    id: 'loss',
    label: 'Loss on one transit · Bernoulli',
    params: { parent: 'bernoulli', p: POOLED_RATE },
    unitLabel: 'lost (1) or arrived (0)',
    note: 'Nothing but ones and zeros — and the mean of n of them is a sample proportion.',
  },
]

export const parentById = (id: string): ParentSpec => PARENTS.find((p) => p.id === id) ?? PARENTS[0]

/** The two populations act-5-05's difference machine compares, with the Ledger's own n. */
export const DIFFERENCE_PRESETS = [
  { id: 'fleets', label: 'Perrine 900 vs everyone else 1,712', n1: PERRINE_N, n2: OTHER_N },
  { id: 'small-group', label: 'nineteen vs the surviving 881', n1: NINETEEN_N, n2: SURVIVING_PERRINE_N },
  { id: 'even', label: 'two patrols of 400', n1: 400, n2: 400 },
] as const

export type DifferencePreset = (typeof DIFFERENCE_PRESETS)[number]['id']

/** SD of x̄₁ − x̄₂ under a common parent SD — the number the machine is checked against. */
export function sdOfDifferenceOfMeans(sigma1: number, n1: number, sigma2: number, n2: number): number {
  return Math.sqrt(sigma1 ** 2 / n1 + sigma2 ** 2 / n2)
}

/** SD of p̂₁ − p̂₂ under two rates — variances add, always. */
export function sdOfDifferenceOfProportions(p1: number, n1: number, p2: number, n2: number): number {
  return Math.sqrt(samplingSdProportion(p1, n1) ** 2 + samplingSdProportion(p2, n2) ** 2)
}

/** One draw of p̂₁ − p̂₂ from two independent fleets. */
export function drawProportionDifference(r: Rng, p1: number, n1: number, p2: number, n2: number): number {
  return r.binomial(n1, p1) / n1 - r.binomial(n2, p2) / n2
}

/** One draw of x̄₁ − x̄₂ from two normal parents (the Lane's honest delay, by default). */
export function drawMeanDifference(r: Rng, mu1: number, sigma1: number, n1: number, mu2: number, sigma2: number, n2: number): number {
  let s1 = 0
  for (let i = 0; i < n1; i++) s1 += r.normal(mu1, sigma1)
  let s2 = 0
  for (let i = 0; i < n2; i++) s2 += r.normal(mu2, sigma2)
  return s1 / n1 - s2 / n2
}

/** Lane constants re-exported so instruments need one import. */
export { LANE, scheduledT9 }
