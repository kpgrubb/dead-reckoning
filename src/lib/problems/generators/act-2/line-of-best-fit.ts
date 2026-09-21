/**
 * act-2-03 · Line of Best Fit — drills. AP 2.6 (linear regression models) and 2.8 (least squares):
 * the LSRL from summary statistics (b = r·s_y/s_x, a = ȳ − b·x̄, the line through (x̄, ȳ)); slope and
 * intercept read in context with "predicted" and "on average"; prediction, residual, extrapolation.
 *
 *   act-2/lsrl-from-summary     numeric         slope (3 dp) or intercept (1 dp) from r, sx, sy, x̄, ȳ
 *   act-2/interpret-slope       interpretation  the slope in context (rubric: slopeInterpretation)
 *   act-2/intercept-meaning     choice          what the intercept means — and whether x = 0 is in the data
 *   act-2/predict-and-residual  numeric         predicted y, or a residual, from a fitted line (1 dp)
 *   act-2/extrapolation-flag    choice          is a prediction inside the data, or off the end of it?
 *
 * No item uses declared mass against inferred mass: that pairing is act-2-03's own mission beat
 * (gate review B6). Every number comes from @/lib/stats; every draw is rejected until the lesson is
 * unambiguous — a visible slope, an intercept that is not a rounded zero, a residual whose sign is
 * not a coin flip. The learner works from the printed coefficients, so the answer is computed from
 * those same rounded coefficients rather than from the unrounded fit.
 */
import { defineGenerator, drawScatter, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { slopeInterpretation } from '@/lib/problems/rubrics'
import { linearRegression, max, min, regressionFromSummary } from '@/lib/stats'
import { fmt, round } from '@/lib/stats/format'
import type { Rng } from '@/lib/rng'

// ---------------------------------------------------------------------------------------------
// In-world pairings (never declared mass vs inferred mass — that is the module's mission beat)
// ---------------------------------------------------------------------------------------------

export interface Pairing {
  /** Framing sentence; `{n}` is replaced by the sample size. */
  frame: string
  xVar: string
  yVar: string
  /** Singular unit phrase used by "for each additional …". */
  xUnits: string
  /** Unit of the response, as it reads after a number. */
  yUnits: string
  /** Short unit token for a numeric answer box (defaults to yUnits). */
  yShort?: string
  /** Axis label with units. */
  xAxis: string
  yAxis: string
  /** Short unit token for a bare x value in prose. */
  xTick: string
  slope: number
  intercept: number
  noise: number
  xRange: [number, number]
  /** Draw x on a grid of this step (counts, instrument settings). */
  xStep?: number
  /** Decimals the instrument records x and y to. */
  round: number
  /** Decimals for the slope in a printed equation. */
  bDigits: number
  /** Decimals for the intercept in a printed equation. */
  aDigits: number
  /** May this pairing carry an intercept answer? (False when the true intercept sits on zero.) */
  interceptOk: boolean
  /** Is a value below the smallest observed x still a sensible query? */
  belowOk: boolean
}

const PAIRINGS: Pairing[] = [
  {
    frame: 'The Ceres office keeps its own extract of the Bureau file: {n} departures, with the fuel each hull actually loaded against the mass it declared.',
    xVar: 'declared mass',
    yVar: 'fuel loaded',
    xUnits: 'kilotonne of declared mass',
    yUnits: 'kt',
    xAxis: 'declared mass (kt)',
    yAxis: 'fuel loaded (kt)',
    xTick: 'kt',
    slope: 0.215,
    intercept: 0.05,
    noise: 0.28,
    xRange: [14, 27],
    round: 1,
    bDigits: 3,
    aDigits: 2,
    interceptOk: false,
    belowOk: true,
  },
  {
    frame: "The Lane Authority's cargo ledger, {n} departures: declared cargo value against declared mass.",
    xVar: 'declared mass',
    yVar: 'declared cargo value',
    xUnits: 'kilotonne of declared mass',
    yUnits: 'M₵',
    xAxis: 'declared mass (kt)',
    yAxis: 'declared cargo value (M₵)',
    xTick: 'kt',
    slope: 0.62,
    intercept: 1.4,
    noise: 1.0,
    xRange: [14, 27],
    round: 1,
    bDigits: 3,
    aDigits: 2,
    interceptOk: true,
    belowOk: true,
  },
  {
    frame: 'Ebele pulls {n} hulls from the maintenance file: age at departure against transponder dropouts logged per thousand transit-hours.',
    xVar: 'hull age',
    yVar: 'dropout rate',
    xUnits: 'year of hull age',
    yUnits: 'dropouts per thousand transit-hours',
    yShort: 'per 1000 h',
    xAxis: 'hull age (years)',
    yAxis: 'dropouts per thousand transit-hours',
    xTick: 'years',
    slope: 0.28,
    intercept: 0.9,
    noise: 0.55,
    xRange: [3, 22],
    round: 1,
    bDigits: 3,
    aDigits: 2,
    interceptOk: true,
    belowOk: false,
  },
  {
    frame: "The Bureau's victualling column, {n} transits: scheduled transit length against consumables loaded.",
    xVar: 'transit length',
    yVar: 'consumables loaded',
    xUnits: 'day of transit length',
    yUnits: 't',
    xAxis: 'transit length (days)',
    yAxis: 'consumables loaded (t)',
    xTick: 'days',
    slope: 0.17,
    intercept: 1.6,
    noise: 0.9,
    xRange: [55, 115],
    round: 1,
    bDigits: 3,
    aDigits: 2,
    interceptOk: true,
    belowOk: true,
  },
  {
    frame: 'Sandoval logs {n} hours of a Watch-profile run: sink load against the cellar’s temperature rise.',
    xVar: 'sink load',
    yVar: 'temperature rise',
    xUnits: 'kilowatt of sink load',
    yUnits: 'K',
    xAxis: 'sink load (kW)',
    yAxis: 'temperature rise (K)',
    xTick: 'kW',
    slope: 0.043,
    intercept: 0.6,
    noise: 0.45,
    xRange: [20, 140],
    round: 1,
    bDigits: 4,
    aDigits: 2,
    interceptOk: true,
    belowOk: true,
  },
  {
    frame: "The relay net's error budget, {n} fixes: range to the nearest relay against the transponder's signal-to-noise margin.",
    xVar: 'range to the relay',
    yVar: 'signal-to-noise margin',
    xUnits: 'megametre of range',
    yUnits: 'dB',
    xAxis: 'range to relay (Mm)',
    yAxis: 'signal-to-noise margin (dB)',
    xTick: 'Mm',
    slope: -0.062,
    intercept: 27,
    noise: 1.3,
    xRange: [30, 180],
    round: 1,
    bDigits: 4,
    aDigits: 1,
    interceptOk: true,
    belowOk: true,
  },
]

/** Pairings whose explanatory variable really does reach zero in the file (for the intercept item). */
const ZERO_PAIRINGS: Pairing[] = [
  {
    frame: "Sandoval's cellar log, {n} hours of a Watch-profile run stepped from the cold ship upward: sink load against the cellar’s temperature rise.",
    xVar: 'sink load',
    yVar: 'temperature rise',
    xUnits: 'kilowatt of sink load',
    yUnits: 'K',
    xAxis: 'sink load (kW)',
    yAxis: 'temperature rise (K)',
    xTick: 'kW',
    slope: 0.043,
    intercept: 0.5,
    noise: 0.4,
    xRange: [0, 140],
    xStep: 5,
    round: 1,
    bDigits: 4,
    aDigits: 2,
    interceptOk: true,
    belowOk: false,
  },
  {
    frame: 'The search log for one lost hull, {n} watches: cutter sorties flown against search hours logged. Several watches flew none at all.',
    xVar: 'sorties flown',
    yVar: 'search hours logged',
    xUnits: 'sortie flown',
    yUnits: 'hours',
    xAxis: 'sorties flown',
    yAxis: 'search hours logged',
    xTick: 'sorties',
    slope: 3.1,
    intercept: 2.4,
    noise: 2,
    xRange: [0, 14],
    xStep: 1,
    round: 0,
    bDigits: 3,
    aDigits: 2,
    interceptOk: true,
    belowOk: false,
  },
  {
    frame: "The relay net's clock calibration, {n} test pulses timed from the sync itself: hours since the last sync against clock drift.",
    xVar: 'hours since sync',
    yVar: 'clock drift',
    xUnits: 'hour since sync',
    yUnits: 'ms',
    xAxis: 'hours since sync',
    yAxis: 'clock drift (ms)',
    xTick: 'hours',
    slope: 0.42,
    intercept: 0.3,
    noise: 0.55,
    xRange: [0, 24],
    xStep: 2,
    round: 1,
    bDigits: 3,
    aDigits: 2,
    interceptOk: true,
    belowOk: false,
  },
]

interface Fitted {
  n: number
  xs: number[]
  ys: number[]
  fit: ReturnType<typeof linearRegression>
  /** Slope and intercept as the printed equation shows them — the learner works from these. */
  b: number
  a: number
  lo: number
  hi: number
}

/** Draw a dataset for a pairing and keep the rounded coefficients the prompt will print. */
function fitted(rng: Rng, ctx: Pairing, n: number): Fitted {
  const d = drawScatter(rng, { n, slope: ctx.slope, intercept: ctx.intercept, noise: ctx.noise, xRange: ctx.xRange, xStep: ctx.xStep, round: ctx.round })
  const fit = linearRegression(d.xs, d.ys)
  return { n, xs: d.xs, ys: d.ys, fit, b: round(fit.slope, ctx.bDigits), a: round(fit.intercept, ctx.aDigits), lo: min(d.xs), hi: max(d.xs) }
}

/** "\hat{y} = 1.40 + 0.618x" at the pairing's display precision (ASCII minus for KaTeX). */
function equationTex(ctx: Pairing, a: number, b: number): string {
  return `\\hat{y} = ${fmt(a, ctx.aDigits).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), ctx.bDigits)}x`
}

/** The slope printed at the pairing's precision is a visible, correctly-signed rate. */
function slopeVisible(ctx: Pairing, b: number): boolean {
  return Math.abs(b) >= 2 * 10 ** -ctx.bDigits && Math.sign(b) === Math.sign(ctx.slope)
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the LSRL from summary statistics
// ---------------------------------------------------------------------------------------------

export const lsrlFromSummary = defineGenerator({
  id: 'act-2/lsrl-from-summary',
  label: 'LSRL from summary statistics',
  ap_topics: ['2.6', '2.8'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRINGS)
    const ask: 'slope' | 'intercept' = !ctx.interceptOk || rng.bool(0.55) ? 'slope' : 'intercept'
    const drawn = retry(
      rng,
      (r) => {
        const n = r.int(20, 44)
        const f = fitted(r, ctx, n)
        const rr = round(f.fit.r, 3)
        const sx = round(f.fit.sx, 3)
        const sy = round(f.fit.sy, 3)
        const xb = round(f.fit.xMean, 2)
        const yb = round(f.fit.yMean, 2)
        return { n, rr, sx, sy, xb, yb, s: regressionFromSummary({ r: rr, sx, sy, xMean: xb, yMean: yb }) }
      },
      (d) => Math.abs(d.rr) >= 0.4 && d.sx > 0 && Math.abs(d.s.slope) >= 0.005 && (ask === 'slope' || Math.abs(d.s.intercept) >= 0.4),
    )
    const { n, rr, sx, sy, xb, yb, s } = drawn
    const digits = ask === 'slope' ? 3 : 1
    const value = ask === 'slope' ? s.slope : s.intercept
    const table = tableMd(['n', 'r', 'sx', 'sy', 'x̄', 'ȳ'], [[n, fmt(rr, 3), fmt(sx, 3), fmt(sy, 3), fmt(xb, 2), fmt(yb, 2)]])
    const what = ask === 'slope' ? `the **slope** of the least-squares line of ${ctx.yAxis} on ${ctx.xAxis}, to three decimal places` : `the **y-intercept** of the least-squares line of ${ctx.yAxis} on ${ctx.xAxis}, to one decimal place`
    return {
      prompt: `${ctx.frame.replace('{n}', String(n))}\n\nThe terminal prints the summary statistics and nothing else:\n\n${table}\n\nReport ${what}. Work from the printed summaries.`,
      answer: numericAnswer(value, 'other', { digits }),
      hints: [
        'The least-squares slope is $b = r\\,s_y/s_x$ — the correlation scaled by the ratio of the two spreads. The line always runs through the point of averages $(\\bar{x}, \\bar{y})$, and that is what fixes the intercept.',
        ask === 'slope' ? `Use $r = ${fmt(rr, 3)}$, $s_y = ${fmt(sy, 3)}$ and $s_x = ${fmt(sx, 3)}$. The means play no part in the slope.` : `Find $b = r\\,s_y/s_x$ first, then put the line through $(\\bar{x}, \\bar{y}) = (${fmt(xb, 2)},\\ ${fmt(yb, 2)})$: $a = \\bar{y} - b\\bar{x}$.`,
        ask === 'slope' ? `$b = ${fmt(rr, 3)} \\times ${fmt(sy, 3)} \\div ${fmt(sx, 3)}$, to three decimals.` : `$a = ${fmt(yb, 2)} - b \\times ${fmt(xb, 2)}$, to one decimal.`,
      ],
      solution: `$$b = r\\,\\frac{s_y}{s_x} = ${fmt(rr, 3)} \\times \\frac{${fmt(sy, 3)}}{${fmt(sx, 3)}} = ${fmt(s.slope, 4)}$$\n\n$$a = \\bar{y} - b\\bar{x} = ${fmt(yb, 2)} - (${fmt(s.slope, 4).replace('−', '-')})(${fmt(xb, 2)}) = ${fmt(s.intercept, 3)}$$\n\n${ask === 'slope' ? `The slope is **${fmt(s.slope, 3)}** ${ctx.yUnits} per ${ctx.xUnits}.` : `The y-intercept is **${fmt(s.intercept, 1)}** ${ctx.yUnits}.`} The fitted line is $${equationTex(ctx, round(s.intercept, ctx.aDigits), round(s.slope, ctx.bDigits))}$.`,
      misconception: 'Swapping the two spreads inverts the slope. It is $r\\,s_y/s_x$ — the spread of the **response** over the spread of the **explanatory** variable — and no algebra afterwards puts it right.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the slope in context
// ---------------------------------------------------------------------------------------------

export const interpretSlope = defineGenerator({
  id: 'act-2/interpret-slope',
  label: 'Interpret the slope in context',
  ap_topics: ['2.6'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRINGS)
    const f = retry(
      rng,
      (r) => fitted(r, ctx, r.int(15, 30)),
      (d) => slopeVisible(ctx, d.b),
    )
    const tpl = slopeInterpretation({ slope: f.b, xVar: ctx.xVar, yVar: ctx.yVar, xUnits: ctx.xUnits, yUnits: ctx.yUnits, digits: ctx.bDigits })
    const up = f.b > 0
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n))}\n\nThe least-squares line of ${ctx.yAxis} on ${ctx.xAxis} is\n\n$$${equationTex(ctx, f.a, f.b)}$$\n\nInterpret the **slope** in context, in one sentence.`,
      answer: tpl,
      hints: [
        'A slope is a rate of change: how far the response moves for a one-unit change in the explanatory variable. It describes the line, not any single row — so the sentence needs the word *predicted* (or *on average*).',
        `The one-unit change here is one ${ctx.xUnits}; the response is ${ctx.yVar}, in ${ctx.yUnits}. The sign says the predicted response ${up ? 'rises' : 'falls'}.`,
        `Four things must appear: the number ${fmt(Math.abs(f.b), ctx.bDigits)}, the direction, the per-one-unit phrase, and both variables by name.`,
      ],
      solution: `${tpl.exemplar}\n\nThe slope is a **predicted** change, and it is per **one** unit of ${ctx.xVar}. "${ctx.yVar} ${up ? 'rises' : 'falls'} by ${fmt(Math.abs(f.b), ctx.bDigits)}" describes no row in the file; it describes the line.`,
      misconception: 'Dropping "predicted" (or "on average") turns a statement about the model into a claim about every individual. Nothing in the file sits exactly on the line.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — what the intercept means, and whether x = 0 is inside the data
// ---------------------------------------------------------------------------------------------

export const interceptMeaning = defineGenerator({
  id: 'act-2/intercept-meaning',
  label: 'What the intercept means',
  ap_topics: ['2.6'],
  skills: ['1'],
  generate(rng) {
    const inside = rng.bool()
    const ctx = pickContext(rng, inside ? ZERO_PAIRINGS : PAIRINGS)
    const f = retry(
      rng,
      (r) => fitted(r, ctx, r.int(16, 32)),
      (d) => slopeVisible(ctx, d.b) && (inside ? d.lo === 0 : d.lo > 0),
    )
    const lo = fmt(f.lo, ctx.round)
    const hi = fmt(f.hi, ctx.round)
    const outText = `The predicted ${ctx.yVar} when ${ctx.xVar} is zero. The observed ${ctx.xVar} runs from ${lo} to ${hi} ${ctx.xTick}, so x = 0 sits outside the data: the intercept is an extrapolation and should not be read as a physical quantity.`
    const inText = `The predicted ${ctx.yVar} when ${ctx.xVar} is zero. The observed ${ctx.xVar} runs from ${lo} to ${hi} ${ctx.xTick}, so x = 0 is inside the data and the intercept is a prediction the file supports.`
    const cands = [
      { text: outText, correct: !inside, why: `The file's ${ctx.xVar} runs from ${lo} to ${hi} ${ctx.xTick}. Zero is not outside that range, so the intercept is not an extrapolation here.` },
      { text: inText, correct: inside, why: `The file's ${ctx.xVar} runs from ${lo} to ${hi} ${ctx.xTick}. Zero is nowhere inside it, so the intercept describes a region no individual occupies.` },
      { text: `The mean ${ctx.yVar} of the ${f.n} rows in the file.`, correct: false, why: 'That is $\\bar{y}$. The line does pass through $(\\bar{x}, \\bar{y})$, but the intercept is its height at $x = 0$, not at $x = \\bar{x}$.' },
      { text: `The change in predicted ${ctx.yVar} for each additional ${ctx.xUnits}.`, correct: false, why: 'That is the slope. The intercept is a height, not a rate.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n))}\n\nThe least-squares line of ${ctx.yAxis} on ${ctx.xAxis} is\n\n$$${equationTex(ctx, f.a, f.b)}$$\n\nThe observed ${ctx.xVar} runs from ${lo} to ${hi} ${ctx.xTick}. What does the **y-intercept**, ${fmt(f.a, ctx.aDigits)}, mean?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => (c.correct ? null : c.why)) },
      hints: [
        'The intercept is the height of the line at $x = 0$: always the predicted response when the explanatory variable is zero. Whether that prediction means anything is a second, separate question.',
        `Ask where zero sits relative to the ${ctx.xVar} the file actually contains: ${lo} to ${hi} ${ctx.xTick}.`,
      ],
      solution: `${inside ? inText : outText}\n\nEvery intercept is the predicted response at $x = 0$. What changes from file to file is whether $x = 0$ is a place the data have been: here it ${inside ? 'is' : 'is not'}, so the number ${inside ? 'can be read as a prediction' : 'is arithmetic about a region no individual occupies'}.`,
      misconception: 'An intercept is always the predicted response at zero; it is only *physically meaningful* when zero lies inside the observed range of the explanatory variable.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — predicted response, or a residual, from a fitted line
// ---------------------------------------------------------------------------------------------

export const predictAndResidual = defineGenerator({
  id: 'act-2/predict-and-residual',
  label: 'Predict and residual from a line',
  ap_topics: ['2.6', '2.7'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRINGS)
    const ask: 'predict' | 'residual' = rng.bool() ? 'predict' : 'residual'
    const drawn = retry(
      rng,
      (r) => {
        const f = fitted(r, ctx, r.int(14, 26))
        const span = f.hi - f.lo
        const x0 = round(r.uniform(f.lo + 0.12 * span, f.hi - 0.12 * span), ctx.round)
        const floor = Math.max(0.3, 0.8 * f.fit.s)
        const candidates = f.xs.map((_, i) => i).filter((i) => Math.abs(f.ys[i] - (f.a + f.b * f.xs[i])) >= floor)
        return { f, x0, k: candidates.length ? r.choice(candidates) : -1 }
      },
      (d) => slopeVisible(ctx, d.f.b) && (ask === 'predict' ? d.x0 > d.f.lo && d.x0 < d.f.hi : d.k >= 0),
    )
    const { f, x0, k } = drawn
    const xq = ask === 'predict' ? x0 : f.xs[k]
    const yHat = f.a + f.b * xq
    const value = ask === 'predict' ? yHat : f.ys[k] - yHat
    const eq = equationTex(ctx, f.a, f.b)
    const sub = `${fmt(f.a, ctx.aDigits).replace('−', '-')} ${f.b < 0 ? '-' : '+'} ${fmt(Math.abs(f.b), ctx.bDigits)}(${fmt(xq, ctx.round)})`
    return {
      prompt:
        ask === 'predict'
          ? `${ctx.frame.replace('{n}', String(f.n))}\n\nThe least-squares line of ${ctx.yAxis} on ${ctx.xAxis} is\n\n$$${eq}$$\n\nA row records ${ctx.xVar} of ${fmt(xq, ctx.round)} ${ctx.xTick}. What does the line **predict** for its ${ctx.yVar}? Answer in ${ctx.yUnits}, to one decimal place.`
          : `${ctx.frame.replace('{n}', String(f.n))}\n\nThe least-squares line of ${ctx.yAxis} on ${ctx.xAxis} is\n\n$$${eq}$$\n\nOne row records ${ctx.xVar} of ${fmt(xq, ctx.round)} ${ctx.xTick} and ${ctx.yVar} of ${fmt(f.ys[k], ctx.round)} ${ctx.yUnits}. Report its **residual**, in ${ctx.yUnits}, to one decimal place. Keep the sign.`,
      answer: numericAnswer(value, 'other', { digits: 1, units: ctx.yShort ?? ctx.yUnits }),
      hints: [
        ask === 'predict' ? 'A prediction is the height of the line at that x: substitute and evaluate.' : 'A residual is what the line missed by: $e = y - \\hat{y}$, actual minus predicted. Predict first, then subtract.',
        `$\\hat{y} = ${sub}$.`,
        ask === 'predict' ? 'Carry full precision and round once, at the end, to one decimal place.' : `Then subtract: $e = ${fmt(f.ys[k], ctx.round)} - \\hat{y}$. A positive residual means the row sits above the line.`,
      ],
      solution:
        ask === 'predict'
          ? `$$\\hat{y} = ${sub} = ${fmt(yHat, 3)}$$\n\nThe predicted ${ctx.yVar} is **${fmt(yHat, 1)} ${ctx.yUnits}**. It is a prediction, not a measurement: nothing obliges a row to land on it.`
          : `$$\\hat{y} = ${sub} = ${fmt(yHat, 3)}$$\n\n$$e = y - \\hat{y} = ${fmt(f.ys[k], ctx.round)} - ${fmt(yHat, 3).replace('−', '-')} = ${fmt(value, 3)}$$\n\nThe residual is **${fmt(value, 1)} ${ctx.yUnits}**: the row sits ${fmt(Math.abs(value), 1)} ${ctx.yUnits} ${value > 0 ? 'above' : 'below'} the line, so the model ${value > 0 ? 'under' : 'over'}estimates it.`,
      misconception: ask === 'predict' ? 'A predicted value is read off the line, not off the data. The nearest observed row is not the prediction.' : 'Residual is actual minus predicted. Predicted minus actual has the right size and the wrong sign — and the sign is the whole message.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — inside the data, or off the end of it
// ---------------------------------------------------------------------------------------------

export const extrapolationFlag = defineGenerator({
  id: 'act-2/extrapolation-flag',
  label: 'Extrapolation or not',
  ap_topics: ['2.6'],
  skills: ['1'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRINGS)
    const f = retry(
      rng,
      (r) => fitted(r, ctx, r.int(16, 34)),
      (d) => slopeVisible(ctx, d.b),
    )
    const span = f.hi - f.lo
    const u = rng.float()
    let where: 'inside' | 'above' | 'below' = u < 0.4 ? 'inside' : u < 0.75 ? 'above' : 'below'
    if (where === 'below' && (!ctx.belowOk || f.lo - 0.6 * span <= 0)) where = 'above'
    const xq =
      where === 'inside'
        ? round(rng.uniform(f.lo + 0.15 * span, f.hi - 0.15 * span), ctx.round)
        : where === 'above'
          ? round(rng.uniform(f.hi + 0.25 * span, f.hi + 0.8 * span), ctx.round)
          : round(rng.uniform(f.lo - 0.6 * span, f.lo - 0.25 * span), ctx.round)
    const lo = fmt(f.lo, ctx.round)
    const hi = fmt(f.hi, ctx.round)
    const q = fmt(xq, ctx.round)
    const cands = [
      { key: 'inside', text: `Sound. ${q} ${ctx.xTick} lies inside the observed ${ctx.xVar} (${lo} to ${hi} ${ctx.xTick}), where rows in the file hold the line down.`, why: `${q} ${ctx.xTick} is not inside ${lo}–${hi} ${ctx.xTick}.` },
      { key: 'above', text: `Extrapolation. ${q} ${ctx.xTick} lies above the largest ${ctx.xVar} in the file (${hi} ${ctx.xTick}); no row holds the line down out there.`, why: `${q} ${ctx.xTick} is not above ${hi} ${ctx.xTick}.` },
      { key: 'below', text: `Extrapolation. ${q} ${ctx.xTick} lies below the smallest ${ctx.xVar} in the file (${lo} ${ctx.xTick}); no row holds the line down there.`, why: `${q} ${ctx.xTick} is not below ${lo} ${ctx.xTick}.` },
      { key: 'r', text: 'Unreliable whatever the value, because r is less than 1 and the line does not pass through every point.', why: 'Scatter about the line is ordinary — it is why predictions carry error, not why they stop meaning anything. Extrapolation is a question about where x sits, not about r.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.key === where)
    const verdict = where === 'inside' ? `an interpolation the data support: ${q} ${ctx.xTick} lies between ${lo} and ${hi}` : `an extrapolation: ${q} ${ctx.xTick} lies ${where} everything in the file`
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n))}\n\nThe least-squares line of ${ctx.yAxis} on ${ctx.xAxis} is\n\n$$${equationTex(ctx, f.a, f.b)}$$\n\nThe observed ${ctx.xVar} runs from ${lo} to ${hi} ${ctx.xTick}. Ebele wants the predicted ${ctx.yVar} at ${ctx.xVar} = ${q} ${ctx.xTick}. Is that prediction sound?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c, i) => (i === correct ? null : c.why)) },
      hints: [
        'A fitted line is evidence only across the range of x the data cover. Outside it the line is arithmetic: nothing observed holds it down, and the form could change without leaving a mark on the file.',
        `Compare ${q} ${ctx.xTick} with the observed range, ${lo} to ${hi} ${ctx.xTick}.`,
      ],
      solution: `The file's ${ctx.xVar} runs from ${lo} to ${hi} ${ctx.xTick}, and the query sits at ${q} ${ctx.xTick}. The prediction is **${verdict}**.\n\nA line says nothing about a region no individual occupies. The further out the query, the more the answer is a property of the model and the less it is a property of the Lane.`,
      misconception: 'A high r² does not license extrapolation. The fit is evidence only where the data are; off the end of the x-range the line is an assumption.',
    }
  },
})
