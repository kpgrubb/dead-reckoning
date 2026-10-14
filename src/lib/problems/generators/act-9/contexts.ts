/**
 * Shared framings and guards for the Act IX drill generators (Unit 9 — inference for slopes).
 *
 * Every Act IX drill runs on a *two-variable* file that is not one of the Act's own: another yard's
 * test stand, another corridor's gate log, another office's certifications. DS-16's nineteen
 * departures, their slope of 1.17, the Kettle regression and its 0.00076 per km/s belong to the
 * mission beats, and `reservedSlope` keeps a drill from printing one of those numbers back.
 *
 *   SLOPE_CONTEXTS   in-world regressions: an explanatory column, a response column, a true slope
 *   CLAIM_CONTEXTS   the subset whose slope is fixed by physics or by a schedule (β₀ ≠ 0)
 *   drawSlope        a seeded dataset for a context, with its least-squares fit
 *   outputMd         the fit rendered as a computer-output table (the thing Unit 9 is read off)
 *   precisionFor     decimals that show a value to a given number of significant figures
 *   shuffleChoice    the choice-item helper (options, correct index, per-option feedback)
 */
import type { Rng } from '@/lib/rng'
import { drawScatter, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { linearRegression, pValueT, type RegressionFit } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Choice helper
// ---------------------------------------------------------------------------------------------

export interface Candidate {
  text: string
  correct: boolean
  why: string | null
}

export function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// Precision
// ---------------------------------------------------------------------------------------------

/** Decimal places that display `value` to `sig` significant figures (0–6). */
export function precisionFor(value: number, sig = 4): number {
  const a = Math.abs(value)
  if (!(a > 0) || !Number.isFinite(a)) return 2
  return Math.min(6, Math.max(0, sig - 1 - Math.floor(Math.log10(a))))
}

/** "two decimal places" / "four decimal places" — the phrase a prompt states its precision with. */
const WORDS = ['no decimal places', 'one decimal place', 'two decimal places', 'three decimal places', 'four decimal places', 'five decimal places', 'six decimal places']
export function precisionWords(digits: number): string {
  return WORDS[Math.min(WORDS.length - 1, Math.max(0, digits))]
}

// ---------------------------------------------------------------------------------------------
// Framings
// ---------------------------------------------------------------------------------------------

export interface SlopeContext {
  id: string
  /** Who holds the file. */
  office: string
  /** One row of it, singular. */
  unit: string
  /** Plural. */
  units: string
  /** The population the rows were drawn from, for the 10% condition and the context group. */
  population: string
  populationSize: number
  /** The explanatory variable, named in full. */
  xVar: string
  /** One unit of x, singular: "tonne of required Lane fuel". */
  xUnit: string
  /** Column header for the output table: "required fuel (t)". */
  xHeader: string
  /** The response variable, named in full. */
  yVar: string
  /** Abbreviated units of y: "t". */
  yUnits: string
  /** Units of the slope itself: "t of fuel per tonne required". */
  slopeUnits: string
  xRange: readonly [number, number]
  /** The slope an honest / nominal process produces. */
  beta: number
  intercept: number
  /** SD of the response about the line, in y units. */
  noise: number
  /** Decimals the office prints the slope and its SE to. */
  digits: number
  /** Decimals the office prints the intercept to. */
  interceptDigits: number
  /** Decimals x and y are logged to. */
  round: number
  /** A value physics or the schedule fixes the slope at, where one exists. */
  required?: {
    value: number
    /** How the value is said out loud: "one tonne of fuel per tonne required". */
    label: string
    /** Why that value and no other. */
    why: string
    /** Multipliers on β that put the fitted slope clearly above the required value. */
    excludeFactor: readonly [number, number]
  }
}

export const SLOPE_CONTEXTS: readonly SlopeContext[] = [
  {
    id: 'fuel-cert',
    office: 'the Bureau of Hulls at Uruk High',
    unit: 'certification',
    units: 'certifications',
    population: 'hulls certified at Uruk High',
    populationSize: 20_000,
    xVar: 'the fuel the filed profile required',
    xUnit: 'tonne of required fuel',
    xHeader: 'required fuel (t)',
    yVar: 'the fuel actually pumped',
    yUnits: 't',
    slopeUnits: 'tonnes pumped per tonne required',
    xRange: [1400, 4200],
    beta: 1,
    intercept: 0,
    noise: 26,
    digits: 4,
    interceptDigits: 1,
    round: 1,
    required: {
      value: 1,
      label: 'one tonne pumped per tonne required',
      why: 'the requirement is the fuel: for a hull carrying the mass it declared, what the profile asks for is what goes in the tanks',
      excludeFactor: [1.04, 1.13],
    },
  },
  {
    id: 'gate-log',
    office: 'the Lane Authority traffic office at Mark 6',
    unit: 'transit',
    units: 'transits',
    population: 'transits logged on the corridor',
    populationSize: 24_000,
    xVar: 'days elapsed since the Mark 0 gate',
    xUnit: 'day',
    xHeader: 'days since gate',
    yVar: 'the mark position logged',
    yUnits: 'marks',
    slopeUnits: 'marks per day',
    xRange: [2, 14],
    beta: 1,
    intercept: 0.4,
    noise: 0.18,
    digits: 4,
    interceptDigits: 2,
    round: 2,
    required: {
      value: 1,
      label: 'one mark per day',
      why: 'the corridor is marked so that a hull holding the filed profile passes exactly one mark a day',
      excludeFactor: [1.06, 1.18],
    },
  },
  {
    id: 'thrust-stand',
    office: 'the Adlinda Yards test stand',
    unit: 'uprate',
    units: 'uprates',
    population: 'drives uprated at Adlinda',
    populationSize: 1800,
    xVar: 'the thrust the certificate demands',
    xUnit: 'kilonewton demanded',
    xHeader: 'demanded (kN)',
    yVar: 'the thrust measured on the stand',
    yUnits: 'kN',
    slopeUnits: 'kilonewtons measured per kilonewton demanded',
    xRange: [180, 420],
    beta: 1,
    intercept: 0,
    noise: 4.2,
    digits: 4,
    interceptDigits: 1,
    round: 1,
    required: {
      value: 1,
      label: 'one kilonewton measured per kilonewton demanded',
      why: 'a stand that reads true returns the demanded thrust, whatever size of drive is bolted to it',
      excludeFactor: [1.05, 1.16],
    },
  },
  {
    id: 'state-vector',
    office: 'the relay net at Mark 9',
    unit: 'state vector',
    units: 'state vectors',
    population: 'state vectors held by the relay net',
    populationSize: 40_000,
    xVar: "the nav software's predicted range rate",
    xUnit: 'metre per second predicted',
    xHeader: 'predicted (m/s)',
    yVar: 'the range rate the relay net measured',
    yUnits: 'm/s',
    slopeUnits: 'measured metres per second per predicted metre per second',
    xRange: [120, 480],
    beta: 1,
    intercept: 0,
    noise: 3.1,
    digits: 4,
    interceptDigits: 1,
    round: 1,
    required: {
      value: 1,
      label: 'one measured metre per second per predicted metre per second',
      why: 'the relay net and the nav software are meant to be measuring the same closing speed',
      excludeFactor: [1.03, 1.09],
    },
  },
  {
    id: 'plume-mass',
    office: 'the sensor office aboard the tender *Adrastea*',
    unit: 'contact',
    units: 'contacts',
    population: 'freighters worked up on the corridor',
    populationSize: 6400,
    xVar: 'declared departure mass',
    xUnit: 'kilotonne of declared mass',
    xHeader: 'declared mass (kt)',
    yVar: 'plume power at the Lane burn',
    yUnits: 'MW',
    slopeUnits: 'megawatts per kilotonne',
    xRange: [14, 27],
    beta: 1.8,
    intercept: 3.4,
    noise: 4.4,
    digits: 3,
    interceptDigits: 2,
    round: 2,
  },
  {
    id: 'sink-load',
    office: "the engineering log of the cutter *Tindr*",
    unit: 'cold run',
    units: 'cold runs',
    population: 'cold runs logged by the cutter squadron',
    populationSize: 900,
    xVar: 'radiator load carried during the run',
    xUnit: 'kilowatt of radiator load',
    xHeader: 'load (kW)',
    yVar: 'heat-sink endurance',
    yUnits: 'minutes',
    slopeUnits: 'minutes per kilowatt',
    xRange: [40, 140],
    beta: -0.9,
    intercept: 212,
    noise: 13,
    digits: 4,
    interceptDigits: 1,
    round: 1,
  },
  {
    id: 'patrol-log',
    office: "the cutter *Tindr*'s patrol log",
    unit: 'patrol',
    units: 'patrols',
    population: 'patrols flown on the corridor',
    populationSize: 1200,
    xVar: 'patrol length',
    xUnit: 'day on station',
    xHeader: 'patrol length (d)',
    yVar: 'boardings logged',
    yUnits: 'boardings',
    slopeUnits: 'boardings per day on station',
    xRange: [6, 22],
    beta: 1.6,
    intercept: 1.1,
    noise: 4.6,
    digits: 3,
    interceptDigits: 2,
    round: 1,
  },
  {
    id: 'delay-uprate',
    office: 'the Authority archive at Mark 6',
    unit: 'departure',
    units: 'departures',
    population: 'uprated hulls departing the corridor',
    populationSize: 3100,
    xVar: 'uprate output above the drive-family spec',
    xUnit: 'kilowatt above spec',
    xHeader: 'uprate (kW)',
    yVar: 'Mark-9 delay against the filed profile',
    yUnits: 'days',
    slopeUnits: 'days of delay per kilowatt above spec',
    xRange: [5, 60],
    beta: 0.035,
    intercept: 0.6,
    noise: 0.52,
    digits: 5,
    interceptDigits: 2,
    round: 2,
  },
]

export const CLAIM_CONTEXTS: readonly SlopeContext[] = SLOPE_CONTEXTS.filter((c) => c.required !== undefined)
export const ASSOCIATION_CONTEXTS: readonly SlopeContext[] = SLOPE_CONTEXTS.filter((c) => c.required === undefined)

/**
 * Slopes the Act's own beats own. A drill that prints one invites recall instead of work:
 * the nineteen's 1.17 tonnes per tonne, the Kettle regression's 0.00076 per km/s and the rocket
 * equation's 0.00079, the honest control's 1.000 with its SD of 0.012.
 */
const RESERVED_SLOPES = [1.17, 0.00076, 0.00079, 0.012]
export function reservedSlope(b: number): boolean {
  return RESERVED_SLOPES.some((r) => Math.abs(b - r) < Math.abs(r) * 0.004)
}

// ---------------------------------------------------------------------------------------------
// Drawing a file
// ---------------------------------------------------------------------------------------------

export interface SlopeDraw {
  ctx: SlopeContext
  n: number
  xs: number[]
  ys: number[]
  fit: RegressionFit
  /** Degrees of freedom for every slope procedure on this file. */
  df: number
}

export interface SlopeDrawOptions {
  /** Which framings may be drawn (default: all of them). */
  contexts?: readonly SlopeContext[]
  /** Sample size band. Never below 5: a slope procedure on four points is not a procedure. */
  n?: readonly [number, number]
  /** Multiplier band on the context's true slope. */
  slopeFactor?: readonly [number, number]
  /** Multiplier band on the context's residual spread. */
  noiseFactor?: readonly [number, number]
  /** Correlation band the draw must land in. */
  rRange?: readonly [number, number]
  /** An extra condition on the finished file. */
  accept?: (d: SlopeDraw) => boolean
}

/** A seeded two-column file for one framing, with its least-squares fit. */
export function drawSlope(rng: Rng, opts: SlopeDrawOptions = {}): SlopeDraw {
  const pool = opts.contexts ?? SLOPE_CONTEXTS
  const [nLo, nHi] = opts.n ?? [9, 20]
  if (nLo < 5) throw new RangeError('drawSlope: a slope procedure needs at least 5 points')
  return retry(
    rng,
    (r): SlopeDraw => {
      const ctx = pickContext(r, pool)
      const n = r.int(nLo, nHi)
      const slope = ctx.beta * (opts.slopeFactor ? r.uniform(opts.slopeFactor[0], opts.slopeFactor[1]) : 1)
      const noise = ctx.noise * (opts.noiseFactor ? r.uniform(opts.noiseFactor[0], opts.noiseFactor[1]) : 1)
      const d = drawScatter(r, {
        n,
        slope,
        intercept: ctx.intercept,
        noise,
        xRange: [ctx.xRange[0], ctx.xRange[1]],
        round: ctx.round,
        rRange: opts.rRange ? [opts.rRange[0], opts.rRange[1]] : undefined,
      })
      const fit = linearRegression(d.xs, d.ys)
      return { ctx, n, xs: d.xs, ys: d.ys, fit, df: n - 2 }
    },
    (d) => {
      if (!(d.fit.seSlope > 0) || !Number.isFinite(d.fit.seSlope) || !(d.fit.s > 0)) return false
      if (reservedSlope(d.fit.slope)) return false
      // A slope whose own SE swamps it makes every reading off the output meaningless.
      if (Math.abs(d.fit.slope) < 0.8 * d.fit.seSlope) return false
      return opts.accept ? opts.accept(d) : true
    },
    400,
  )
}

// ---------------------------------------------------------------------------------------------
// Computer output
// ---------------------------------------------------------------------------------------------

export interface OutputReading {
  df: number
  tSlope: number
  pSlope: number
  tIntercept: number
  pIntercept: number
}

/** What the software prints: T and P are two-sided against zero, for both rows. */
export function outputReading(fit: RegressionFit): OutputReading {
  const df = fit.n - 2
  const tSlope = fit.slope / fit.seSlope
  const tIntercept = fit.seIntercept > 0 ? fit.intercept / fit.seIntercept : 0
  return {
    df,
    tSlope,
    pSlope: pValueT(tSlope, df, 'two-sided'),
    tIntercept,
    pIntercept: pValueT(tIntercept, df, 'two-sided'),
  }
}

/** The regression output table, as a Bureau terminal prints it. */
export function outputMd(fit: RegressionFit, ctx: SlopeContext): string {
  const o = outputReading(fit)
  const rows = [
    ['Constant', fmt(fit.intercept, ctx.interceptDigits), fmt(fit.seIntercept, ctx.interceptDigits), fmt(o.tIntercept, 2), fmtP(o.pIntercept)],
    [ctx.xHeader, fmt(fit.slope, ctx.digits), fmt(fit.seSlope, ctx.digits), fmt(o.tSlope, 2), fmtP(o.pSlope)],
  ]
  return `${tableMd(['Predictor', 'Coef', 'SE Coef', 'T', 'P'], rows)}\n\n\`S = ${fmt(fit.s, ctx.interceptDigits + 2)}   R-Sq = ${fmtPct(fit.r2, 1)}   n = ${fmtInt(fit.n)}\``
}

/** One line naming the response and the predictor above an output table. */
export function outputCaption(ctx: SlopeContext): string {
  return `Response: ${ctx.yVar} (${ctx.yUnits}).  Predictor: ${ctx.xVar}.`
}
