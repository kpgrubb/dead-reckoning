/**
 * Act IX datasets — "Intent" (docs/beat-sheet.md §2, DS-16; Act IX blocks).
 *
 *   DS-16  Brandt's file: the Bureau's fuel certifications for all 900 Perrine departures,
 *          2178 → MET 0. 881 honest, 19 diverted. For the nineteen it also carries Ebele's
 *          whole-accelerate-phase reprocessed mass (±0.5 %, against a single Mark 2 fix's ±2 %)
 *          and the nav software's Δv from Mark 9.4 to rest at Kettle on that departure date.
 *
 * Imported read-only and never re-derived here:
 *   DS-00 / DS-02  `@/instruments/act-2/data` — the one physical model of the nineteen
 *                  (`nineteenProfiles`: h, uprate, lane length, thrust-limited acceleration,
 *                  Δv to Kettle) and the Bureau certifications themselves (`manifest`). The
 *                  nineteen rows of Brandt's file ARE nineteen rows of the Manifest file: the
 *                  same stamp, the same tonnage, the same examiner. Re-drawing them here would
 *                  give the Act two versions of one certificate.
 *
 * THE ACT'S SPINE. Three regressions and one physical constant:
 *
 *   9-01  How much a fitted slope moves from sample to sample. Repeated samples of nineteen
 *         honest Perrine departures, fuel loaded on required Lane fuel: the slopes stack around
 *         1.00 with SD ≈ 0.012. The nineteen's own output prints SE(b) several times that,
 *         because their residuals carry the spread of what they hid.
 *   9-02  Fuel loaded on required Lane fuel, the nineteen: slope ≈ 1.17, df 17, and a 95 %
 *         interval that excludes 1.00. The 881 honest are the control and bracket it.
 *   9-03  Excess fuel per TRUE tonne — fuel ÷ whole-phase inferred mass, less the departure
 *         month's required fraction — on the Kettle Δv of that departure date. Slope ≈ 0.00076
 *         per km/s, SE ≈ 0.00016, t ≈ 4.7 on df 17 against β = 0. Tested again, two-sided,
 *         against the rocket equation's marginal fuel fraction at the thrust-limited Lane burn
 *         (β₀ ≈ 0.00079), it fails to reject.
 *
 * Determinism. Everything drawn here goes through `rng('DS-16', attempt)`. A candidate seed is
 * REJECTED unless the registry's headline numbers hold (gate review, Required 1): the nineteen's
 * slope interval must exclude 1.00, the honest control interval must bracket it, and 9-03's
 * one-sided t must be at least 4.0. The first accepted attempt is the dataset, forever.
 * `src/instruments/act-9/data.test.ts` asserts the headline numbers.
 */
import { rng, type Rng } from '@/lib/rng'
import { linearRegression, mean, normal, pValueT, sd, slopeInterval, slopeTest, type RegressionFit, type SlopeResult } from '@/lib/stats'
import { LANE, laneDeltaV, manifest, nineteenProfiles, type DivertedProfile, type Examiner } from '@/instruments/act-2/data'

export type { Examiner, DivertedProfile }
export { LANE, laneDeltaV }

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Shape of the file
// ═════════════════════════════════════════════════════════════════════════════════════════════

/** One Bureau fuel certification. Brandt sent nine hundred of them on her own authority. */
export interface Certification {
  /** 0-based row index in `brandtFile`. */
  id: number
  hull: string
  /** ISO date of the Bureau certification. */
  departureDate: string
  /** Lane length at departure, AU. */
  laneLengthAU: number
  /** Declared departure mass including propellant, t. */
  declaredMass: number
  /** The Bureau's own column: f_lane(d) × declared mass, t — what the plotted profile needs. */
  requiredFuel: number
  /** Fuel actually pumped at Uruk High, t. */
  fuelLoaded: number
  examiner: Examiner
  /** Hidden truth: one of the nineteen. */
  diverted: boolean
  /**
   * Ebele's whole-accelerate-phase reprocessing of the relay archive (±0.5 %). Two days of
   * Solberg's link time, and only for the nineteen — nobody pulled six weeks of state vectors
   * for a hull that arrived.
   */
  inferredMassFull?: number
  /** Δv from Mark 9.4 to rest at Kettle on that departure date, km/s (nav software). */
  dvKettle?: number
}

/** The nineteen with the two extra columns present. */
export interface DivertedCertification extends Certification {
  inferredMassFull: number
  dvKettle: number
}

export const PERRINE_DEPARTURES_N = 900
export const DIVERTED_N = 19
export const HONEST_N = PERRINE_DEPARTURES_N - DIVERTED_N

/** Dacre signed twenty-two of the nine hundred: seventeen of the nineteen and five honest. */
export const DACRE_HONEST_SIGNED = 5

/** Whole-phase reprocessing error, as a fraction of true mass (DS-00). A Mark 2 fix gives 2 %. */
export const WHOLE_PHASE_SD = 0.005
export const MARK2_FIX_SD = 0.02

/** Honest fuel is pumped to the certified requirement within a per-departure 1 % (DS-00). */
export const FUEL_NOISE_SD = 0.01

/**
 * DS-16's lane-length band for the honest 881. The Lane's schedule is indifferent to length, so
 * these are uniform; the nineteen are not (they sailed when the Lane was short — see below).
 */
export const HONEST_LANE_RANGE: readonly [number, number] = [2.4, 6.0]

/** Perrine hulls that come home. Six years of traffic over a fleet of this size is ~7 runs each. */
const PERRINE_FLEET: readonly string[] = [
  'Nippur Sulcus', 'Philus Sulcus', 'Mummu Sulcus', 'Apsu Sulci', 'Arbela Sulcus', 'Dukyong Sulci', 'Erech Sulcus', 'Lagash Sulcus',
  'Mashu Sulcus', 'Misharu Sulcus', 'Nabu Sulcus', 'Nergal Sulcus', 'Nineveh Sulcus', 'Sicyon Sulcus', 'Ur Sulcus', 'Akitu Sulcus',
  'Anzu Regio', 'Babbar Sulcus', 'Ninkasi Sulcus', 'Khensu Regio', 'Latmus Sulcus', 'Adad Sulcus', 'Enlil Regio', 'Etana Sulcus',
  'Gula Sulci', 'Hursag Sulcus', 'Ishkur Sulcus', 'Kadi Sulcus', 'Kittu Fossae', 'Lugalbanda Sulcus', 'Namtar Regio', 'Ningal Sulcus',
  'Nusku Sulcus', 'Sin Sulcus', 'Shamash Regio', 'Tammuz Sulcus', 'Utu Sulcus', 'Zaqar Sulci', 'Ekur Sulcus', 'Girsu Regio',
  'Abzu Sulci', 'Aruru Sulcus', 'Bau Sulcus', 'Damkina Regio', 'Ennugi Sulcus', 'Geshtin Sulci', 'Ilabrat Sulcus', 'Kingu Regio',
  'Lahar Sulcus', 'Mami Sulci', 'Nanshe Sulcus', 'Pabilsag Sulcus', 'Qingu Fossae', 'Sarpanit Sulcus', 'Ubshukinna Regio', 'Zababa Sulcus',
]

const OTHER_EXAMINERS: readonly Examiner[] = ['Voss', 'Amari', 'Penrose']

function isoDate(year: number, dayOfYear: number): string {
  const d = new Date(Date.UTC(year, 0, 1 + Math.max(0, Math.min(364, Math.floor(dayOfYear)))))
  return d.toISOString().slice(0, 10)
}

const round1 = (x: number) => Math.round(x * 10) / 10
const round2 = (x: number) => Math.round(x * 100) / 100

// ═════════════════════════════════════════════════════════════════════════════════════════════
// DS-16 · the draw
// ═════════════════════════════════════════════════════════════════════════════════════════════

/** The nineteen certifications, lifted out of the Manifest file rather than re-drawn. */
const manifestNineteen = manifest.filter((d) => d.diverted)
const profileOf = new Map<string, DivertedProfile>(nineteenProfiles.map((p) => [p.hull, p]))

interface Draw {
  rows: Certification[]
  nineteen: DivertedCertification[]
  honest: Certification[]
}

function draw(attempt: number): Draw {
  const r = rng('DS-16', attempt)

  // --- the nineteen: the Bureau's own rows, plus the two columns Act IX adds to them ---
  const nineteen: DivertedCertification[] = manifestNineteen.map((d) => {
    const p = profileOf.get(d.hull)!
    const trueMass = d.declaredMass * (1 + p.h)
    return {
      id: 0,
      hull: d.hull,
      departureDate: d.departureDate,
      laneLengthAU: d.laneLengthAU,
      declaredMass: d.declaredMass,
      requiredFuel: d.requiredFuel,
      fuelLoaded: d.fuelLoaded,
      examiner: d.examiner,
      diverted: true,
      inferredMassFull: Math.round(trueMass * (1 + r.normal(0, WHOLE_PHASE_SD))),
      dvKettle: round2(p.dvKettle),
    }
  })

  // --- the honest 881 ---
  const dacreRows = new Set(r.sample([...Array(HONEST_N).keys()], DACRE_HONEST_SIGNED))
  const honest: Certification[] = Array.from({ length: HONEST_N }, (_, k) => {
    const laneLengthAU = r.uniform(...HONEST_LANE_RANGE)
    const declaredMass = Math.round(r.uniform(14000, 27000) / 10) * 10
    const required = fLaneAt(laneLengthAU) * declaredMass
    return {
      id: 0,
      hull: PERRINE_FLEET[k % PERRINE_FLEET.length],
      departureDate: isoDate(r.int(2178, 2183), r.uniform(0, 365)),
      laneLengthAU: round2(laneLengthAU),
      declaredMass,
      requiredFuel: round1(required),
      fuelLoaded: round1(required * (1 + r.normal(0, FUEL_NOISE_SD))),
      examiner: dacreRows.has(k) ? 'Dacre' : r.choice([...OTHER_EXAMINERS]),
      diverted: false,
    }
  })

  const rows = r.shuffle([...nineteen, ...honest]).map((row, id) => ({ ...row, id }))
  return {
    rows,
    nineteen: rows.filter((x): x is DivertedCertification => x.diverted),
    honest: rows.filter((x) => !x.diverted),
  }
}

/** f_lane(d) = 1 − e^(−2√(d·a_nom)/vₑ), the fraction of departure mass the plotted profile burns. */
export function fLaneAt(dAU: number): number {
  return 1 - Math.exp(-laneDeltaV(dAU, LANE.aNomMgee) / LANE.veKms)
}

/**
 * The certified fraction for one row, taken from the Bureau's own two columns rather than
 * recomputed — the certificate is what the analysis is against, rounding and all.
 */
export function certifiedFraction(c: Certification): number {
  return c.requiredFuel / c.declaredMass
}

/** 9-03's response: fuel carried per true tonne, beyond what that departure's profile required. */
export function excessPerTrueTonne(c: DivertedCertification): number {
  return c.fuelLoaded / c.inferredMassFull - certifiedFraction(c)
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Acceptance rule (gate review, Required 1)
// ═════════════════════════════════════════════════════════════════════════════════════════════

interface Fits {
  nineteenFuel: RegressionFit
  nineteenInterval: SlopeResult
  honestInterval: SlopeResult
  kettle: RegressionFit
  kettleZero: SlopeResult
}

function fitsFor(d: Draw): Fits {
  const nx = d.nineteen.map((c) => c.requiredFuel)
  const ny = d.nineteen.map((c) => c.fuelLoaded)
  const hx = d.honest.map((c) => c.requiredFuel)
  const hy = d.honest.map((c) => c.fuelLoaded)
  const kx = d.nineteen.map((c) => c.dvKettle)
  const ky = d.nineteen.map((c) => excessPerTrueTonne(c))
  return {
    nineteenFuel: linearRegression(nx, ny),
    nineteenInterval: slopeInterval(nx, ny, { confidence: 0.95, random: true, populationSize: 20_000 }),
    honestInterval: slopeInterval(hx, hy, { confidence: 0.95, random: true, populationSize: 20_000 }),
    kettle: linearRegression(kx, ky),
    kettleZero: slopeTest(kx, ky, { alt: 'greater', beta0: 0, random: true, populationSize: 20_000 }),
  }
}

/**
 * Registry acceptance for a DS-16 candidate. Returns the violated criteria; empty = accepted.
 * Exported for the dataset audit test.
 */
export function brandtIssues(d: Draw): string[] {
  const f = fitsFor(d)
  const out: string[] = []
  const [lo, hi] = f.nineteenInterval.ci!
  if (lo <= 1) out.push(`the nineteen's interval (${lo.toFixed(3)}, ${hi.toFixed(3)}) does not exclude 1.00`)
  if (f.nineteenFuel.slope < 1.0) out.push('the nineteen sit below the requirement')
  const [hlo, hhi] = f.honestInterval.ci!
  if (!(hlo < 1 && hhi > 1)) out.push(`the honest control interval (${hlo.toFixed(4)}, ${hhi.toFixed(4)}) does not bracket 1.00`)
  if (Math.abs(f.honestInterval.b - 1) > 0.004) out.push('the honest control slope is not 1.000')
  if (f.kettleZero.statistic < KETTLE_T_MIN) out.push(`9-03 one-sided t = ${f.kettleZero.statistic.toFixed(2)} below ${KETTLE_T_MIN}`)
  if (f.kettleZero.statistic > KETTLE_T_MAX) out.push(`9-03 one-sided t = ${f.kettleZero.statistic.toFixed(2)} above ${KETTLE_T_MAX}`)
  if (f.kettle.slope < 0.00065 || f.kettle.slope > 0.00088) out.push(`9-03 slope ${f.kettle.slope.toExponential(3)} outside ±15 % of 0.00076`)
  return out
}

/** The t the registry's headline (≈ 4.7) is asserted against, ±0.5, with the gate's floor of 4.0. */
const KETTLE_T_MIN = 4.2
const KETTLE_T_MAX = 5.2

/** Generate the DS-16 candidate for one attempt (exported for the audit test only). */
export const generateBrandtCandidate = draw

let drawn: Draw | null = null
let brandtAttempt = 0
for (let attempt = 0; attempt < 2000 && !drawn; attempt++) {
  const candidate = draw(attempt)
  if (brandtIssues(candidate).length === 0) {
    drawn = candidate
    brandtAttempt = attempt
  }
}
if (!drawn) throw new Error('DS-16: no seed satisfied the registry acceptance rule in 2000 attempts')

/** DS-16 — Brandt's file. Nine hundred Perrine departures, identical on every load. */
export const brandtFile: readonly Certification[] = drawn.rows
/** Which `rng('DS-16', attempt)` produced the accepted file (the tests' audit trail). */
export const BRANDT_SEED_ATTEMPT = brandtAttempt

/** The nineteen diverted departures, with the reprocessed mass and the Kettle Δv. */
export const nineteen: readonly DivertedCertification[] = drawn.nineteen
/** The 881 that came home: the control group for every regression in the Act. */
export const honest881: readonly Certification[] = drawn.honest

// ═════════════════════════════════════════════════════════════════════════════════════════════
// act-9-02 · fuel loaded on required Lane fuel
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const nineteenRequired: readonly number[] = nineteen.map((c) => c.requiredFuel)
export const nineteenLoaded: readonly number[] = nineteen.map((c) => c.fuelLoaded)
export const honestRequired: readonly number[] = honest881.map((c) => c.requiredFuel)
export const honestLoaded: readonly number[] = honest881.map((c) => c.fuelLoaded)

/** The nineteen's least-squares fit: the output table 9-01 reads SE(b) off and 9-02 works from. */
export const NINETEEN_FUEL_FIT: RegressionFit = linearRegression(nineteenRequired, nineteenLoaded)

/** 95 % t-interval for the nineteen's slope, df = 17. Excludes 1.00 on the accepted seed. */
export const NINETEEN_FUEL_INTERVAL: SlopeResult = slopeInterval(nineteenRequired, nineteenLoaded, {
  confidence: 0.95,
  random: true,
  populationSize: 20_000,
})

/** The same nineteen tested against the physics: H₀ β = 1 tonne of fuel per tonne required. */
export const NINETEEN_FUEL_VS_ONE: SlopeResult = slopeTest(nineteenRequired, nineteenLoaded, {
  alt: 'greater',
  beta0: 1,
  random: true,
  populationSize: 20_000,
})

/** The control: the 881 that arrived. Slope 1.000, and an interval that brackets it. */
export const HONEST_FUEL_FIT: RegressionFit = linearRegression(honestRequired, honestLoaded)
export const HONEST_FUEL_INTERVAL: SlopeResult = slopeInterval(honestRequired, honestLoaded, {
  confidence: 0.95,
  random: true,
  populationSize: 20_000,
})

// ═════════════════════════════════════════════════════════════════════════════════════════════
// act-9-01 · the sampling distribution of a fitted slope
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const SLOPE_SIM_REPS = 2000
export const SLOPE_SIM_N = DIVERTED_N

/** One sample of `n` honest Perrine departures, fitted the way 9-02 fits the nineteen. */
export function sampleHonestSlope(r: Rng, n: number, extraNoiseSd = 0): number {
  const idx = r.sample([...Array(honest881.length).keys()], n)
  const xs = idx.map((i) => honest881[i].requiredFuel)
  const ys = idx.map((i) => honest881[i].fuelLoaded * (extraNoiseSd > 0 ? 1 + r.normal(0, extraNoiseSd) : 1))
  return linearRegression(xs, ys).slope
}

/** Repeated samples of `n`, each fitted: the stack the learner watches build. */
export function simulateSlopes(r: Rng, n: number, reps: number, extraNoiseSd = 0): number[] {
  return Array.from({ length: reps }, () => sampleHonestSlope(r, n, extraNoiseSd))
}

/**
 * The canonical run: two thousand samples of nineteen honest departures. The instrument opens on
 * this, so the number the learner reports is the number the mission beat expects.
 */
export const HONEST_SLOPES: readonly number[] = simulateSlopes(rng('DS-16/slope-sim'), SLOPE_SIM_N, SLOPE_SIM_REPS)

/** Mean of the stack — β, recovered. */
export const HONEST_SLOPE_MEAN = mean(HONEST_SLOPES)
/** The spread of a fitted slope across honest samples of nineteen. The 9-01 target, ≈ 0.012. */
export const HONEST_SLOPE_SD = sd(HONEST_SLOPES)

/** The nineteen's own SE(b), which the honest spread is the yardstick for. */
export const NINETEEN_SE_B = NINETEEN_FUEL_FIT.seSlope
/** How many times wider the nineteen's residuals make their slope's standard error. */
export const SE_RATIO = NINETEEN_SE_B / HONEST_SLOPE_SD

/** σ/(σₓ√n) — the textbook SD of b, for the same honest population. */
export const THEORETICAL_SLOPE_SD =
  (FUEL_NOISE_SD * mean(honestRequired)) / (sd(honestRequired) * Math.sqrt(SLOPE_SIM_N))

// ═════════════════════════════════════════════════════════════════════════════════════════════
// act-9-03 · excess fuel per true tonne against the Kettle Δv
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const dvKettle: readonly number[] = nineteen.map((c) => c.dvKettle)
export const excessFuelFraction: readonly number[] = nineteen.map((c) => excessPerTrueTonne(c))

export const KETTLE_FIT: RegressionFit = linearRegression(dvKettle, excessFuelFraction)

/** One-sided against the innocent story: under any of them the slope is zero. */
export const KETTLE_TEST_ZERO: SlopeResult = slopeTest(dvKettle, excessFuelFraction, {
  alt: 'greater',
  beta0: 0,
  random: true,
  populationSize: 20_000,
})

/** Each hull's own thrust-limited Lane burn, km/s: 2√(d·a) at a ≈ 2.79 mgee, not the nominal 3.00. */
export const laneBurnKms: readonly number[] = nineteenProfiles.map((p) => laneDeltaV(p.laneLengthAU, p.accel))
export const LANE_BURN_MEAN = mean(laneBurnKms)

/**
 * The rocket equation's marginal fuel fraction per km/s of extra braking, evaluated hull by hull
 * at its own thrust-limited Lane burn and averaged: e^(−Δv_L/vₑ)/vₑ ≈ 0.00079 per km/s.
 * Ebele's first guess, 1/vₑ, is this quantity at Δv_L = 0.
 */
export const BETA_PHYSICAL = mean(laneBurnKms.map((dv) => Math.exp(-dv / LANE.veKms) / LANE.veKms))
/** Ebele's guess: the slope at zero Δv. */
export const BETA_EBELE = 1 / LANE.veKms

/** The second test: two-sided against the physical value. It fails to reject. */
export const KETTLE_TEST_PHYSICAL: SlopeResult = slopeTest(dvKettle, excessFuelFraction, {
  alt: 'two-sided',
  beta0: BETA_PHYSICAL,
  random: true,
  populationSize: 20_000,
})

/** The same response against declared tonnage — the reading 9-01's two days of link bought out of. */
export const excessOnDeclared: readonly number[] = nineteen.map((c) => c.fuelLoaded / c.declaredMass - certifiedFraction(c))
export const KETTLE_ON_DECLARED: SlopeResult = slopeTest(dvKettle, excessOnDeclared, {
  alt: 'greater',
  beta0: 0,
  random: true,
  populationSize: 20_000,
})

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Residual diagnostics (9-01's conditions, the checkpoint's DISP item)
// ═════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Residual spread in the upper half of the fitted range over the lower half. One is flat; a ratio
 * well above two is the fan that says the response is on the wrong scale.
 */
export function residualSdRatio(fit: RegressionFit): number {
  const order = fit.fitted.map((_, i) => i).sort((i, j) => fit.fitted[i] - fit.fitted[j])
  const half = Math.floor(order.length / 2)
  const lo = order.slice(0, half).map((i) => fit.residuals[i])
  const hi = order.slice(order.length - half).map((i) => fit.residuals[i])
  return sd(hi) / sd(lo)
}

/** The nineteen's fuel residuals fan with hull size: tonnes of fuel scale with tonnes of hull. */
export const NINETEEN_FUEL_SD_RATIO = residualSdRatio(NINETEEN_FUEL_FIT)

/** Blom plotting positions: the theoretical z each ordered residual would sit at if Normal. */
export function normalQuantiles(n: number): number[] {
  return Array.from({ length: n }, (_, i) => normal.quantile((i + 1 - 0.375) / (n + 0.25)))
}

/** (theoretical z, ordered residual) pairs for a fit — the normal probability plot. */
export function normalProbabilityPoints(fit: RegressionFit): { x: number; y: number }[] {
  const ordered = [...fit.residuals].sort((a, b) => a - b)
  const q = normalQuantiles(ordered.length)
  return ordered.map((y, i) => ({ x: q[i], y }))
}

// ═════════════════════════════════════════════════════════════════════════════════════════════
// The examiner column — Brandt's nine hundred confirming the 412 (9-01's Situation)
// ═════════════════════════════════════════════════════════════════════════════════════════════

export const DACRE_SIGNED_900 = brandtFile.filter((c) => c.examiner === 'Dacre').length
export const DACRE_DIVERTED_900 = nineteen.filter((c) => c.examiner === 'Dacre').length

// ═════════════════════════════════════════════════════════════════════════════════════════════
// Computer output (the table every Unit 9 question is actually read off)
// ═════════════════════════════════════════════════════════════════════════════════════════════

export interface OutputRow {
  term: string
  coef: number
  se: number
  t: number
  p: number
}

export interface OutputTable {
  rows: OutputRow[]
  /** Residual standard deviation, √(SSE/(n − 2)). The line the calculator prints as `s`. */
  s: number
  r2: number
  r: number
  n: number
  df: number
  response: string
  predictor: string
}

/**
 * A regression fit as computer output. The t and P columns are the software's default: two-sided
 * against zero, which is why a one-sided question has to halve the printed P itself and a question
 * about a non-zero null cannot use the printed t at all.
 */
export function outputTable(fit: RegressionFit, predictor: string, response: string): OutputTable {
  const df = fit.n - 2
  const row = (term: string, coef: number, se: number): OutputRow => {
    const t = coef / se
    return { term, coef, se, t, p: pValueT(t, df, 'two-sided') }
  }
  return {
    rows: [row('Constant', fit.intercept, fit.seIntercept), row(predictor, fit.slope, fit.seSlope)],
    s: fit.s,
    r2: fit.r2,
    r: fit.r,
    n: fit.n,
    df,
    response,
    predictor,
  }
}

/** The nineteen's output, as the Bureau's software prints it (9-01 reads SE(b) off this). */
export const NINETEEN_FUEL_OUTPUT: OutputTable = outputTable(NINETEEN_FUEL_FIT, 'required fuel (t)', 'fuel loaded (t)')
/** The control's output: the 881 that arrived. */
export const HONEST_FUEL_OUTPUT: OutputTable = outputTable(HONEST_FUEL_FIT, 'required fuel (t)', 'fuel loaded (t)')
/** 9-03's output: excess fuel per true tonne on the Kettle Δv of the departure date. */
export const KETTLE_OUTPUT: OutputTable = outputTable(KETTLE_FIT, 'Kettle Δv (km/s)', 'excess fuel per true tonne')
