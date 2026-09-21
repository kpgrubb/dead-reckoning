/**
 * act-4-07 · The Cellar's Margin — drills. AP 4.9: linear transformations of a random variable, and
 * sums and differences of INDEPENDENT random variables — where variances add and standard
 * deviations never do.
 *
 *   act-4/sd-of-sum             numeric         √Σσ² for a drawn set of independent loads (checkpoint q9)
 *   act-4/sd-of-difference      numeric         the SD of a margin A − B; variances still add
 *   act-4/linear-transform-rv   numeric         mean or SD of aX + b; a squares inside the variance, b does not move it
 *   act-4/which-margin          choice          Σσ, √Σσ² or the "they average out" figure
 *   act-4/interpret-sd-of-sum   interpretation  the SD of a total, in context, and why it is not Σσ
 *
 * Every set of components is drawn fresh — never *Nightjar*'s own six Watch-profile subsystems,
 * whose total SD (√386 ≈ 19.6 kW) and saturation probabilities are act-4-07's mission beats. Every
 * number comes from `combineRV` / `differenceRV` / `linearTransformRV` in @/lib/stats.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import type { Rng } from '@/lib/rng'
import { combineRV, differenceRV, linearTransformRV, type Moments } from '@/lib/stats'
import { fmt } from '@/lib/stats/format'
import { sdOfSumInterpretation } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Reserved: act-4-07's beats are *Nightjar*'s own Watch budget — 320 kW, √386 kW, ±42, ±8.
// ---------------------------------------------------------------------------------------------

/** √386 — the SD of the total Watch load, which is the module's first mission beat. */
const RESERVED_SD = Math.sqrt(386)
/** Ebele's sum of the six SDs. */
// const RESERVED_NAIVE = 42 — reserved guard, unused since the naive-sum drill moved to rules-of-chance

function reservedSd(sd: number): boolean {
  return Math.abs(sd - RESERVED_SD) < 0.05
}

// ---------------------------------------------------------------------------------------------
// Sums: independent components with a mean and a spread
// ---------------------------------------------------------------------------------------------

interface Component {
  name: string
  meanRange: [number, number]
  sdRange: [number, number]
}

interface SumContext {
  id: string
  /** In-world framing; `{k}` is replaced by the number of components drawn. */
  frame: string
  unit: string
  unitSquared: string
  /** Noun phrase for the total — also the rubric's context. */
  total: string
  /** Plural noun for the components. */
  componentWord: string
  /** Column header for the component names. */
  columnName: string
  components: readonly Component[]
}

const SUM_CONTEXTS: readonly SumContext[] = [
  {
    id: 'bench',
    frame: 'Adlinda Yards runs the auxiliary bus of a Tessera-hull tender on the bench. {k} independent loads, each logged with a mean and a standard deviation over a forty-hour run.',
    unit: 'kW',
    unitSquared: 'kW²',
    total: 'the total auxiliary-bus load',
    componentWord: 'loads',
    columnName: 'load',
    components: [
      { name: 'trim pumps', meanRange: [18, 30], sdRange: [2, 5] },
      { name: 'cabin lighting', meanRange: [8, 16], sdRange: [1, 3] },
      { name: 'avionics rack', meanRange: [55, 80], sdRange: [6, 14] },
      { name: 'water loop', meanRange: [22, 36], sdRange: [3, 7] },
      { name: 'deicing heaters', meanRange: [30, 50], sdRange: [4, 9] },
      { name: 'galley', meanRange: [10, 20], sdRange: [2, 4] },
    ],
  },
  {
    id: 'racks',
    frame: 'The Eyes are stripped down to {k} racks on the yard floor at Uruk High, and each rack has been metered on its own for a week. Watts, mean and standard deviation.',
    unit: 'W',
    unitSquared: 'W²',
    total: "the stack's total heat output",
    componentWord: 'racks',
    columnName: 'rack',
    components: [
      { name: 'correlator rack', meanRange: [300, 520], sdRange: [30, 60] },
      { name: 'storage rack', meanRange: [180, 260], sdRange: [15, 35] },
      { name: 'optical pipeline rack', meanRange: [220, 340], sdRange: [20, 45] },
      { name: 'RF front end', meanRange: [90, 150], sdRange: [10, 25] },
      { name: 'cooling fans', meanRange: [60, 110], sdRange: [8, 18] },
    ],
  },
  {
    id: 'beacon',
    frame: 'A Lane Authority navigation beacon carries {k} independent subsystems on one solar bus, and the Authority publishes a mean draw and a standard deviation for each.',
    unit: 'W',
    unitSquared: 'W²',
    total: "the beacon's total draw",
    componentWord: 'subsystems',
    columnName: 'subsystem',
    components: [
      { name: 'transmitter', meanRange: [40, 70], sdRange: [5, 12] },
      { name: 'receiver', meanRange: [8, 16], sdRange: [1, 3] },
      { name: 'survival heater', meanRange: [25, 45], sdRange: [4, 9] },
      { name: 'clock & housekeeping', meanRange: [5, 12], sdRange: [1, 2] },
      { name: 'station-keeping thruster', meanRange: [14, 28], sdRange: [2, 6] },
    ],
  },
  {
    id: 'cargo',
    frame: 'A Mercantile hauler declares {k} independent parcels at Uruk High, each with a mean mass and a standard deviation from the loader’s own scale history.',
    unit: 't',
    unitSquared: 't²',
    total: 'the declared total mass',
    componentWord: 'parcels',
    columnName: 'parcel',
    components: [
      { name: 'He-3/D tankage', meanRange: [400, 700], sdRange: [20, 45] },
      { name: 'volatiles drums', meanRange: [120, 240], sdRange: [10, 28] },
      { name: 'spares crate', meanRange: [30, 70], sdRange: [4, 12] },
      { name: 'potable water', meanRange: [40, 90], sdRange: [5, 14] },
      { name: 'hull stores', meanRange: [20, 50], sdRange: [3, 8] },
    ],
  },
  {
    id: 'tender',
    frame: 'A Compact tender on the Callisto–Ganymede local lane runs Quiet with {k} independent heat loads, metered separately across a hundred watches.',
    unit: 'kW',
    unitSquared: 'kW²',
    total: "the tender's total Quiet load",
    componentWord: 'loads',
    columnName: 'load',
    components: [
      { name: 'scrubber & water loop', meanRange: [20, 34], sdRange: [2, 6] },
      { name: 'avionics', meanRange: [40, 65], sdRange: [5, 12] },
      { name: 'galley', meanRange: [8, 18], sdRange: [1, 4] },
      { name: 'thrust pack standby', meanRange: [12, 26], sdRange: [2, 5] },
      { name: 'cabin heating', meanRange: [16, 30], sdRange: [2, 6] },
    ],
  },
]

interface DrawnPart {
  name: string
  mean: number
  sd: number
}

interface DrawnSet {
  parts: DrawnPart[]
  moments: Moments[]
  total: Moments
  /** Σσ — the sum of the standard deviations, which is not the answer. */
  naive: number
  /** Σσ / k — the "the errors average out" figure, which is not the answer either. */
  averaged: number
}

function drawSet(r: Rng, ctx: SumContext, kMin: number, kMax: number): DrawnSet {
  const k = r.int(kMin, Math.min(kMax, ctx.components.length))
  const parts = r.sample(ctx.components, k).map((c) => ({
    name: c.name,
    mean: r.int(c.meanRange[0], c.meanRange[1]),
    sd: r.int(c.sdRange[0], c.sdRange[1]),
  }))
  const moments: Moments[] = parts.map((p) => ({ mean: p.mean, variance: p.sd * p.sd, sd: p.sd }))
  const total = combineRV(moments, parts.map(() => 1))
  const naive = parts.reduce((s, p) => s + p.sd, 0)
  return { parts, moments, total, naive, averaged: naive / parts.length }
}

function budgetColumns(ctx: SumContext): string[] {
  return [ctx.columnName, `mean (${ctx.unit})`, `SD (${ctx.unit})`, `variance (${ctx.unitSquared})`]
}

function budgetRows(_ctx: SumContext, set: DrawnSet): (string | number)[][] {
  return set.parts.map((p) => [p.name, p.mean, p.sd, p.sd * p.sd])
}

function budgetRowsWithTotal(ctx: SumContext, set: DrawnSet): (string | number)[][] {
  return [...budgetRows(ctx, set), ['total', fmt(set.total.mean, 0), fmt(set.total.sd, 2), fmt(set.total.variance, 0)]]
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the SD of a sum of independent random variables (checkpoint q9)
// ---------------------------------------------------------------------------------------------

export const sdOfSum = defineGenerator({
  id: 'act-4/sd-of-sum',
  label: 'SD of a sum of independent loads',
  ap_topics: ['4.9'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, SUM_CONTEXTS)
    const set = retry(
      rng,
      (r) => drawSet(r, ctx, 2, 5),
      (s) => s.total.sd >= 2 && s.naive / s.total.sd >= 1.2 && !reservedSd(s.total.sd),
    )
    const k = set.parts.length
    const varianceList = set.parts.map((p) => `${p.sd}^2`).join(' + ')
    const varianceNumbers = set.parts.map((p) => String(p.sd * p.sd)).join(' + ')
    return {
      prompt: `${ctx.frame.replace('{k}', String(k))}\n\n${tableMd(budgetColumns(ctx).slice(0, 3), set.parts.map((p) => [p.name, p.mean, p.sd]))}\n\nThe ${k} ${ctx.componentWord} vary independently of one another. What is the **standard deviation** of ${ctx.total}? Report it in ${ctx.unit} to two decimal places.`,
      data: tableSpec(budgetColumns(ctx).slice(0, 3), set.parts.map((p) => [p.name, p.mean, p.sd])),
      answer: numericAnswer(set.total.sd, 'other', { digits: 2, units: ctx.unit }),
      hints: [
        'Standard deviations of independent random variables do not add. Variances do — so square first, add second, and take the square root last.',
        `Square each SD to get a variance column: ${varianceNumbers} ${ctx.unitSquared}. Add that column, then take the square root.`,
        `$\\sqrt{${varianceNumbers}}$, to two decimal places.`,
      ],
      solution: `Variances add for independent random variables:\n\n${tableMd(budgetColumns(ctx), budgetRows(ctx, set))}\n\n$$\\sigma^2_{\\text{total}} = ${varianceList} = ${fmt(set.total.variance, 0)}\\ \\text{${ctx.unit}}^2$$\n\n$$\\sigma_{\\text{total}} = \\sqrt{${fmt(set.total.variance, 0)}} = ${fmt(set.total.sd, 4)}$$\n\nThe SD of ${ctx.total} is **${fmt(set.total.sd, 2)} ${ctx.unit}**, around a mean of ${fmt(set.total.mean, 0)} ${ctx.unit}.`,
      misconception: `Adding the standard deviations gives ${fmt(set.naive, 0)} ${ctx.unit}, which is the spread you would get only if all ${k} ${ctx.componentWord} ran high together. Independence is exactly the assumption that they do not, and the square root of the summed variances is what independence buys you.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the SD of a DIFFERENCE; variances still add
// ---------------------------------------------------------------------------------------------

interface DiffContext {
  id: string
  frame: string
  unit: string
  unitSquared: string
  /** The quantity being subtracted from. */
  aName: string
  /** The quantity subtracted. */
  bName: string
  /** The difference, as a noun phrase. */
  diffName: string
  aMean: [number, number]
  aSd: [number, number]
  bMean: [number, number]
  bSd: [number, number]
}

const DIFF_CONTEXTS: readonly DiffContext[] = [
  {
    id: 'headroom',
    frame: 'Adlinda Yards certifies the auxiliary bus of a Tessera-hull tender to a rating that itself varies from unit to unit, and meters the tender’s actual load over a forty-hour run.',
    unit: 'kW',
    unitSquared: 'kW²',
    aName: 'the certified bus rating',
    bName: 'the metered load',
    diffName: 'the headroom on the bus',
    aMean: [180, 220],
    aSd: [4, 9],
    bMean: [120, 165],
    bSd: [8, 18],
  },
  {
    id: 'manifest',
    frame: 'The Ceres receiving office compares what a hauler declared at Uruk High against what its own scale reads on arrival. Both figures carry a spread: the declaration from the loader’s history, the scale from its calibration record.',
    unit: 't',
    unitSquared: 't²',
    aName: 'the declared mass',
    bName: 'the weighed mass',
    diffName: 'the manifest discrepancy',
    aMean: [480, 620],
    aSd: [8, 20],
    bMean: [470, 610],
    bSd: [5, 14],
  },
  {
    id: 'endurance',
    frame: 'A yard quotes a cold-running endurance from the design curve and the shakedown crew measures one on the hull itself. The two are independent — a curve and a stopwatch — and each has its own spread across the class.',
    unit: 'h',
    unitSquared: 'h²',
    aName: 'the design endurance',
    bName: 'the measured endurance',
    diffName: 'the shortfall against design',
    aMean: [100, 130],
    aSd: [3, 8],
    bMean: [88, 118],
    bSd: [4, 10],
  },
  {
    id: 'dock',
    frame: 'The Uruk High dock master budgets a refit in hours and logs the hours it actually takes. Budget and outcome are drawn from separate histories and vary independently.',
    unit: 'h',
    unitSquared: 'h²',
    aName: 'the budgeted dock hours',
    bName: 'the hours actually taken',
    diffName: 'the schedule slack',
    aMean: [60, 90],
    aSd: [5, 12],
    bMean: [50, 85],
    bSd: [6, 14],
  },
  {
    id: 'cellar',
    frame: 'A tender’s lithium sink is built to a capacity that varies with the pour, and a Quiet leg spends a quantity of heat that varies with the watch. Neither figure tells you anything about the other.',
    unit: 'GJ',
    unitSquared: 'GJ²',
    aName: 'the sink capacity as poured',
    bName: 'the heat the leg spends',
    diffName: 'the margin left in the sink',
    aMean: [70, 90],
    aSd: [2, 5],
    bMean: [50, 75],
    bSd: [4, 10],
  },
]

export const sdOfDifference = defineGenerator({
  id: 'act-4/sd-of-difference',
  label: 'SD of a difference of independent variables',
  ap_topics: ['4.9'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, DIFF_CONTEXTS)
    const draw = retry(
      rng,
      (r) => {
        const aMean = r.int(ctx.aMean[0], ctx.aMean[1])
        const aSd = r.int(ctx.aSd[0], ctx.aSd[1])
        const bMean = r.int(ctx.bMean[0], ctx.bMean[1])
        const bSd = r.int(ctx.bSd[0], ctx.bSd[1])
        return { aMean, aSd, bMean, bSd }
      },
      ({ aSd, bSd }) => aSd >= 2 && bSd >= 2 && Math.abs(aSd - bSd) >= 2 && !reservedSd(Math.sqrt(aSd * aSd + bSd * bSd)),
    )
    const A: Moments = { mean: draw.aMean, variance: draw.aSd * draw.aSd, sd: draw.aSd }
    const B: Moments = { mean: draw.bMean, variance: draw.bSd * draw.bSd, sd: draw.bSd }
    const D = differenceRV(A, B)
    const subtracted = A.variance - B.variance
    const wrong = subtracted > 0 ? `$\\sqrt{${fmt(A.variance, 0)} - ${fmt(B.variance, 0)}} = ${fmt(Math.sqrt(subtracted), 2)}$ ${ctx.unit}` : `$\\sqrt{${fmt(A.variance, 0)} - ${fmt(B.variance, 0)}}$, which is the square root of a negative number and not a standard deviation at all`
    return {
      prompt: `${ctx.frame}\n\n- ${ctx.aName}: mean ${draw.aMean} ${ctx.unit}, SD ${draw.aSd} ${ctx.unit}\n- ${ctx.bName}: mean ${draw.bMean} ${ctx.unit}, SD ${draw.bSd} ${ctx.unit}\n\nLet $D = $ ${ctx.aName} $-$ ${ctx.bName} — that is, ${ctx.diffName}. The two quantities are independent. What is the **standard deviation** of $D$, in ${ctx.unit} to two decimal places?`,
      answer: numericAnswer(D.sd, 'other', { digits: 2, units: ctx.unit }),
      hints: [
        'Means subtract when you subtract. Variances do not: for independent random variables the variance of a difference is the *sum* of the two variances, exactly as it is for a sum.',
        `$\\sigma_D^2 = ${draw.aSd}^2 + ${draw.bSd}^2 = ${fmt(D.variance, 0)}$ ${ctx.unitSquared}. Take the square root.`,
        `$\\sqrt{${fmt(D.variance, 0)}}$, to two decimal places.`,
      ],
      solution: `$$\\mu_D = ${draw.aMean} - ${draw.bMean} = ${fmt(D.mean, 0)}\\ \\text{${ctx.unit}}$$\n\n$$\\sigma_D^2 = \\sigma_A^2 + \\sigma_B^2 = ${draw.aSd}^2 + ${draw.bSd}^2 = ${fmt(D.variance, 0)}\\ \\text{${ctx.unit}}^2$$\n\n$$\\sigma_D = \\sqrt{${fmt(D.variance, 0)}} = ${fmt(D.sd, 4)}$$\n\n${ctx.diffName.charAt(0).toUpperCase()}${ctx.diffName.slice(1)} has mean ${fmt(D.mean, 0)} ${ctx.unit} and standard deviation **${fmt(D.sd, 2)} ${ctx.unit}**. Subtracting two uncertain numbers does not cancel their uncertainties; it piles them up.`,
      misconception: `The variance of a difference does **not** subtract. Writing ${wrong} treats uncertainty as if it could be cancelled by a minus sign. Both quantities wobble, and both wobbles show up in the gap between them — which is why a margin is always less certain than either figure that made it.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — mean or SD of aX + b
// ---------------------------------------------------------------------------------------------

interface TransformContext {
  id: string
  /** In-world framing of X; `{mu}` and `{sigma}` are substituted. */
  frame: string
  xName: string
  xUnit: string
  yName: string
  yUnit: string
  /** How the conversion reads in words. */
  rule: (a: number, b: number) => string
  /** Draws a, b and the moments of X. */
  draw: (r: Rng) => { a: number; b: number; mean: number; sd: number }
  /** Decimal places the answer is asked to. */
  digits: number
  /** Decimals used when printing a. */
  aDigits: number
}

const TRANSFORM_CONTEXTS: readonly TransformContext[] = [
  {
    id: 'pct-per-hour',
    frame: 'A tender’s lithium sink holds {cap} GJ. Its Quiet load runs at a mean of {mu} kW with a standard deviation of {sigma} kW across watches, and the engineer wants the same random variable expressed as a percentage of the sink filled per hour.',
    xName: 'the Quiet load',
    xUnit: 'kW',
    yName: 'the fill rate',
    yUnit: '%/h',
    rule: (a) => `one kilowatt fills ${fmt(a, 5)} percent of the sink in an hour, so $Y = ${fmt(a, 5)}X$`,
    draw: (r) => {
      const cap = r.int(30, 90)
      return { a: (3.6e-3 * 100) / cap, b: 0, mean: r.int(150, 420), sd: r.int(8, 30) }
    },
    digits: 4,
    aDigits: 5,
  },
  {
    id: 'kw-to-gj',
    frame: 'A yard bench meters a hull’s load at a mean of {mu} kW with a standard deviation of {sigma} kW, and the heat annex wants the gigajoules that load dumps into the sink over a run of fixed length.',
    xName: 'the metered load',
    xUnit: 'kW',
    yName: 'the heat spent over the run',
    yUnit: 'GJ',
    rule: (a) => `a kilowatt held for the whole run is ${fmt(a, 4)} GJ, so $Y = ${fmt(a, 4)}X$`,
    draw: (r) => ({ a: 3.6e-3 * r.int(6, 48), b: 0, mean: r.int(150, 420), sd: r.int(8, 30) }),
    digits: 3,
    aDigits: 4,
  },
  {
    id: 'celsius-kelvin',
    frame: 'Sink temperature at the end of a Quiet leg averages {mu} °C with a standard deviation of {sigma} °C across the class. The Bureau files everything in kelvin.',
    xName: 'the sink temperature in °C',
    xUnit: '°C',
    yName: 'the sink temperature in kelvin',
    yUnit: 'K',
    rule: (_a, b) => `kelvin is celsius plus ${fmt(b, 2)}, so $Y = X + ${fmt(b, 2)}$`,
    draw: (r) => ({ a: 1, b: 273.15, mean: r.int(180, 280), sd: r.int(4, 14) }),
    digits: 2,
    aDigits: 0,
  },
  {
    id: 'celsius-fahrenheit',
    frame: 'An old Bureau instrument on a Tessera hull reads in degrees Fahrenheit. The cabin it watches averages {mu} °C with a standard deviation of {sigma} °C.',
    xName: 'the cabin temperature in °C',
    xUnit: '°C',
    yName: 'the instrument reading',
    yUnit: '°F',
    rule: (a, b) => `$Y = ${fmt(a, 1)}X + ${fmt(b, 0)}$`,
    draw: (r) => ({ a: 1.8, b: 32, mean: r.int(14, 26), sd: r.int(2, 6) }),
    digits: 2,
    aDigits: 1,
  },
  {
    id: 'berth-fee',
    frame: 'Uruk High charges a hauler a fixed berthing fee plus a per-tonne handling rate. The parcels a hauler brings in average {mu} tonnes with a standard deviation of {sigma} tonnes.',
    xName: 'the mass handled',
    xUnit: 't',
    yName: 'the dock bill',
    yUnit: 'credits',
    rule: (a, b) => `$Y = ${fmt(a, 0)}X + ${fmt(b, 0)}$ — a rate of ${fmt(a, 0)} credits a tonne on top of a flat ${fmt(b, 0)} credits`,
    draw: (r) => ({ a: r.int(12, 40), b: r.int(200, 900), mean: r.int(80, 260), sd: r.int(6, 28) }),
    digits: 1,
    aDigits: 0,
  },
  {
    id: 'hours-to-days',
    frame: 'A loiter leg on the Saturn feeder run lasts a mean of {mu} hours with a standard deviation of {sigma} hours. The Authority’s schedule is kept in days.',
    xName: 'the leg in hours',
    xUnit: 'h',
    yName: 'the leg in days',
    yUnit: 'd',
    rule: () => 'a day is 24 hours, so $Y = X/24$',
    draw: (r) => ({ a: 1 / 24, b: 0, mean: r.int(40, 160), sd: r.int(4, 22) }),
    digits: 3,
    aDigits: 4,
  },
]

export const linearTransformRvDrill = defineGenerator({
  id: 'act-4/linear-transform-rv',
  label: 'Mean and SD of aX + b',
  ap_topics: ['4.9'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, TRANSFORM_CONTEXTS)
    const ask = rng.bool() ? 'mean' : 'sd'
    const draw = retry(
      rng,
      (r) => {
        const d = ctx.draw(r)
        const X: Moments = { mean: d.mean, variance: d.sd * d.sd, sd: d.sd }
        const Y = linearTransformRV(X, d.a, d.b)
        return { ...d, X, Y }
      },
      ({ Y, sd }) => sd >= 2 && Math.abs(Y.mean) >= 0.05 && Y.sd >= 0.001 && !reservedSd(Y.sd),
    )
    const { a, b, X, Y } = draw
    const capText = ctx.frame.includes('{cap}') ? String(Math.round((3.6e-3 * 100) / a)) : ''
    const frame = ctx.frame.replace('{cap}', capText).replace('{mu}', String(X.mean)).replace('{sigma}', String(X.sd))
    const target = ask === 'mean' ? Y.mean : Y.sd
    const aStr = fmt(a, ctx.aDigits)
    const bStr = fmt(b, 2)
    const precision = ctx.digits === 1 ? 'one decimal place' : ctx.digits === 2 ? 'two decimal places' : ctx.digits === 3 ? 'three decimal places' : 'four decimal places'
    const meanWork = `\\mu_Y = ${aStr}\\times ${fmt(X.mean, 0)} ${b === 0 ? '' : `+ ${bStr}`} = ${fmt(Y.mean, 4)}`
    const sdWork = `\\sigma_Y = |${aStr}|\\times ${fmt(X.sd, 0)} = ${fmt(Y.sd, 4)}`
    return {
      prompt: `${frame}\n\nThe conversion is linear: ${ctx.rule(a, b)}. Treating ${ctx.xName} as a random variable $X$ with $\\mu_X = ${fmt(X.mean, 0)}$ ${ctx.xUnit} and $\\sigma_X = ${fmt(X.sd, 0)}$ ${ctx.xUnit}, report the **${ask === 'mean' ? 'mean' : 'standard deviation'}** of ${ctx.yName}, in ${ctx.yUnit} to ${precision}.`,
      answer: numericAnswer(target, 'other', { digits: ctx.digits, units: ctx.yUnit }),
      hints: [
        ask === 'mean'
          ? 'A linear transformation moves the centre the way it moves any single value: multiply the mean by the multiplier, then add the constant.'
          : 'A constant added to every value shifts the whole distribution and changes no distance inside it, so it cannot change the spread. Only the multiplier does — once, in absolute value.',
        ask === 'mean' ? `$\\mu_{aX+b} = a\\mu_X + b$ with $a = ${aStr}$, $\\mu_X = ${fmt(X.mean, 0)}$ and $b = ${bStr}$.` : `$\\sigma_{aX+b} = |a|\\sigma_X$ with $a = ${aStr}$ and $\\sigma_X = ${fmt(X.sd, 0)}$. The $b$ plays no part.`,
        `$${ask === 'mean' ? meanWork.split('=').slice(1, 2).join('=') : sdWork.split('=').slice(1, 2).join('=')}$, to ${precision}.`,
      ],
      solution: `$$${meanWork}$$\n\n$$${sdWork}\\qquad \\sigma_Y^2 = ${aStr}^2\\times ${fmt(X.variance, 0)} = ${fmt(Y.variance, 4)}$$\n\nThe ${ask === 'mean' ? 'mean' : 'standard deviation'} of ${ctx.yName} is **${fmt(target, ctx.digits)} ${ctx.yUnit}**.\n\nThe multiplier lands on the standard deviation once and inside the variance twice; the constant ${b === 0 ? 'is zero here, and would in any case' : 'moves the mean and'} leave${b === 0 ? '' : 's'} the spread untouched.`,
      misconception:
        b === 0
          ? `Squaring the multiplier in the wrong place. $a$ multiplies the SD once ($|a|\\sigma$) and the variance twice ($a^2\\sigma^2$); using $a^2$ on the SD, or $a$ on the variance, is the common slip.`
          : `Adding $b$ to the standard deviation. A shift moves every value by the same amount, so every distance from the mean is unchanged — $\\sigma_{aX+b} = |a|\\sigma_X$ has no $b$ in it anywhere.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which of three margins is the right one
// ---------------------------------------------------------------------------------------------

export const whichMargin = defineGenerator({
  id: 'act-4/which-margin',
  label: 'Which margin should be quoted?',
  ap_topics: ['4.9'],
  skills: ['1'],
  generate(rng) {
    const ctx = pickContext(rng, SUM_CONTEXTS)
    const set = retry(
      rng,
      (r) => drawSet(r, ctx, 3, 5),
      (s) => s.total.sd >= 3 && s.naive - s.total.sd >= 0.5 && s.total.sd - s.averaged >= 0.5 && !reservedSd(s.total.sd),
    )
    const k = set.parts.length
    const cands = [
      {
        text: `±${fmt(set.naive, 1)} ${ctx.unit}`,
        correct: false,
        why: `That is $\\sum\\sigma_i$ — the spread you would see only if all ${k} ${ctx.componentWord} ran to the same side of their means at the same moment. The ${ctx.componentWord} are independent, so that happens rarely, and the figure is **too pessimistic**.`,
      },
      {
        text: `±${fmt(set.total.sd, 1)} ${ctx.unit}`,
        correct: true,
        why: null,
      },
      {
        text: `±${fmt(set.averaged, 1)} ${ctx.unit}`,
        correct: false,
        why: `That is the *average* of the ${k} standard deviations — the figure you get by assuming the errors cancel one another out. They do not cancel; their variances accumulate. The figure is **too generous**, and a margin that is too generous is the dangerous kind.`,
      },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${ctx.frame.replace('{k}', String(k))}\n\n${tableMd(budgetColumns(ctx).slice(0, 3), set.parts.map((p) => [p.name, p.mean, p.sd]))}\n\nThe ${ctx.componentWord} vary independently. The engineer has to publish ${ctx.total} as **mean ± one standard deviation**, and three figures are on the board. Which one belongs on the spec sheet?`,
      data: tableSpec(budgetColumns(ctx).slice(0, 3), set.parts.map((p) => [p.name, p.mean, p.sd])),
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Only one of the three comes from a rule. The other two come from a picture of what the components might do together — one picture too gloomy, one too cheerful.',
        `For independent components the variances add: $\\sigma^2_{\\text{total}} = \\sum\\sigma_i^2 = ${fmt(set.total.variance, 0)}$ ${ctx.unitSquared}. The margin is the square root of that.`,
      ],
      solution: `Variances add and standard deviations do not:\n\n$$\\sigma_{\\text{total}} = \\sqrt{${set.parts.map((p) => `${p.sd}^2`).join(' + ')}} = \\sqrt{${fmt(set.total.variance, 0)}} = ${fmt(set.total.sd, 3)}$$\n\nThe spec sheet should read ${fmt(set.total.mean, 0)} **± ${fmt(set.total.sd, 1)} ${ctx.unit}**. The sum of the SDs, ${fmt(set.naive, 1)} ${ctx.unit}, is too pessimistic; their average, ${fmt(set.averaged, 1)} ${ctx.unit}, is too generous. The right answer is the only one of the three that is not a guess about how the ${ctx.componentWord} behave together — it is what independence implies.`,
      misconception: `The two wrong margins fail in opposite directions, and only one of those failures kills anybody. Too pessimistic and you buy hardware you do not need; too generous and you write a number in a report that a hull will be operated on.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Interpretation — the SD of a total, in context
// ---------------------------------------------------------------------------------------------

export const interpretSdOfSum = defineGenerator({
  id: 'act-4/interpret-sd-of-sum',
  label: 'Interpret the SD of a total',
  ap_topics: ['4.9'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, SUM_CONTEXTS)
    const set = retry(
      rng,
      (r) => drawSet(r, ctx, 3, 5),
      (s) => s.total.sd >= 3 && s.naive / s.total.sd >= 1.3 && !reservedSd(s.total.sd),
    )
    const rubric = sdOfSumInterpretation({
      sd: set.total.sd,
      naiveSum: set.naive,
      total: ctx.total,
      units: ctx.unit,
      mean: set.total.mean,
      digits: 1,
    })
    return {
      prompt: `${ctx.frame.replace('{k}', String(set.parts.length))}\n\n${tableMd(budgetColumns(ctx), budgetRowsWithTotal(ctx, set))}\n\nIn one or two sentences, say what the total’s standard deviation of ${fmt(set.total.sd, 1)} ${ctx.unit} **means** for ${ctx.total}, and why it is not the ${fmt(set.naive, 1)} ${ctx.unit} you get by adding the ${set.parts.length} standard deviations. Quote the value, and do not write the standard deviation as a limit.`,
      data: tableSpec(budgetColumns(ctx), budgetRowsWithTotal(ctx, set)),
      answer: rubric,
      hints: [
        'A standard deviation is a typical distance from the mean — how far a single run of this total usually lands from its centre. It is not a worst case and not a bound.',
        `Two things belong in the sentence: what ${ctx.total} typically does around its mean of ${fmt(set.total.mean, 0)} ${ctx.unit}, and the rule that produced ${fmt(set.total.sd, 1)} ${ctx.unit} rather than ${fmt(set.naive, 1)} ${ctx.unit}.`,
        'Name the rule out loud: variances add, and the total’s SD is the square root of the sum of the variances.',
      ],
      solution: `${rubric.exemplar}\n\nThe usual failure is to make the SD a fence — to say that ${ctx.total} stays within ${fmt(set.total.sd, 1)} ${ctx.unit} of its mean. It does not. Some runs land further out, and how much further is the whole reason anyone computes a tail probability afterwards.`,
      misconception: `Adding the ${set.parts.length} standard deviations to get ${fmt(set.naive, 1)} ${ctx.unit}, or reading the SD as a bound every run stays inside. The first overstates the spread of a total of independent parts; the second turns a typical distance into a promise.`,
    }
  },
})
