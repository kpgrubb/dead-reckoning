/**
 * act-2-05 · The Bulk Hauler — drills. AP 2.8 (least squares, second half): r² and s read in context,
 * a regression computer-output table turned back into an equation, and what one point far out on the
 * x-axis does — and does not do — to a fit.
 *
 *   act-2/interpret-r2-s        interpretation  r² AND s from a computer-output table, in context
 *   act-2/equation-from-output  numeric         write the line from the output block and predict with it
 *   act-2/leverage-effect       choice          remove the far point: what happens to the slope and to r²
 *   act-2/r2-not-r              choice          what R-Sq and S in an output block actually mean
 *   act-2/drop-or-keep          choice          may an inconvenient point be deleted?
 *
 * Nothing here uses declared mass against inferred mass, and nothing names *Cyrene Ore*: that pairing
 * and that hull are act-2-05's own instrument and mission beats (gate review B6). The "leverage > 4/n"
 * rule of thumb is deliberately absent — it is not AP content and lives in the module's Caution
 * (gate review, Act II advisory). Every number is computed from @/lib/stats, and every with/without
 * comparison is classified from the two real fits before the options are written, so exactly one is true.
 */
import { defineGenerator, drawScatter, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { rSquaredInterpretation } from '@/lib/problems/rubrics'
import { numberRegex } from '@/lib/problems/rubric'
import { linearRegression, max, min, t } from '@/lib/stats'
import { fmt, fmtP, round } from '@/lib/stats/format'
import type { Rng } from '@/lib/rng'
import type { InterpretationAnswer, RubricGroup } from '@/lib/problems/types'

// ---------------------------------------------------------------------------------------------
// In-world pairings (never declared mass vs inferred mass — that is the module's own analysis)
// ---------------------------------------------------------------------------------------------

interface OutCtx {
  /** Framing sentence; `{n}` is replaced by the sample size. */
  frame: string
  xVar: string
  yVar: string
  yUnits: string
  /** Short unit token for a numeric answer box (defaults to yUnits). */
  yShort?: string
  xTick: string
  xAxis: string
  yAxis: string
  /** Row label for the predictor in a computer-output block. */
  predictor: string
  /** One row of the file, plural. */
  rows: string
  slope: number
  intercept: number
  noise: number
  xRange: [number, number]
  round: number
  bDigits: number
  aDigits: number
  sDigits: number
  /** Where a single far-out individual sits on the x-axis. */
  far: [number, number]
  /** What that far individual is, in world. */
  farWhat: string
}

const CONTEXTS: OutCtx[] = [
  {
    frame: 'The Ceres office extract, {n} departures: the fuel each hull actually loaded against the mass it declared.',
    xVar: 'declared mass',
    yVar: 'fuel loaded',
    yUnits: 'kt',
    xTick: 'kt',
    xAxis: 'declared mass (kt)',
    yAxis: 'fuel loaded (kt)',
    predictor: 'Declared mass',
    rows: 'hulls',
    slope: 0.215,
    intercept: 0.05,
    noise: 0.24,
    xRange: [14, 27],
    round: 1,
    bDigits: 4,
    aDigits: 3,
    sDigits: 3,
    far: [46, 58],
    farWhat: 'a bulk carrier working the outer end of the Lane',
  },
  {
    frame: "The Lane Authority's cargo ledger, {n} departures: declared cargo value against declared mass.",
    xVar: 'declared mass',
    yVar: 'declared cargo value',
    yUnits: 'M₵',
    xTick: 'kt',
    xAxis: 'declared mass (kt)',
    yAxis: 'declared cargo value (M₵)',
    predictor: 'Declared mass',
    rows: 'hulls',
    slope: 0.62,
    intercept: 1.4,
    noise: 0.95,
    xRange: [14, 27],
    round: 1,
    bDigits: 4,
    aDigits: 3,
    sDigits: 3,
    far: [46, 58],
    farWhat: 'a bulk carrier working the outer end of the Lane',
  },
  {
    frame: "The Bureau's victualling column, {n} transits: consumables loaded against the scheduled length of the crossing.",
    xVar: 'transit length',
    yVar: 'consumables loaded',
    yUnits: 't',
    xTick: 'days',
    xAxis: 'transit length (days)',
    yAxis: 'consumables loaded (t)',
    predictor: 'Transit length',
    rows: 'transits',
    slope: 0.17,
    intercept: 1.6,
    noise: 0.8,
    xRange: [58, 96],
    round: 1,
    bDigits: 4,
    aDigits: 3,
    sDigits: 3,
    far: [150, 190],
    farWhat: 'one survey charter that spent half a year on station',
  },
  {
    frame: 'Ebele pulls {n} hulls from the maintenance file: transponder dropouts per thousand transit-hours against hull age at departure.',
    xVar: 'hull age',
    yVar: 'dropout rate',
    yUnits: 'dropouts per thousand transit-hours',
    yShort: 'per 1000 h',
    xTick: 'years',
    xAxis: 'hull age (years)',
    yAxis: 'dropouts per thousand transit-hours',
    predictor: 'Hull age',
    rows: 'hulls',
    slope: 0.28,
    intercept: 0.9,
    noise: 0.5,
    xRange: [3, 19],
    round: 1,
    bDigits: 4,
    aDigits: 3,
    sDigits: 3,
    far: [42, 52],
    farWhat: 'one ex-Authority tender kept in service far past her book life',
  },
  {
    frame: 'Sandoval logs {n} hours of a Watch-profile run: the cellar’s temperature rise against the sink load she was carrying.',
    xVar: 'sink load',
    yVar: 'temperature rise',
    yUnits: 'K',
    xTick: 'kW',
    xAxis: 'sink load (kW)',
    yAxis: 'temperature rise (K)',
    predictor: 'Sink load',
    rows: 'hours',
    slope: 0.043,
    intercept: 0.6,
    noise: 0.32,
    xRange: [25, 130],
    round: 1,
    bDigits: 5,
    aDigits: 3,
    sDigits: 3,
    far: [290, 340],
    farWhat: 'the single hour of the purge, with the radiators out',
  },
]

interface Fitted {
  n: number
  xs: number[]
  ys: number[]
  fit: ReturnType<typeof linearRegression>
}

function fitted(rng: Rng, ctx: OutCtx, n: number, rRange: [number, number] = [0.75, 0.985]): Fitted {
  const d = drawScatter(rng, { n, slope: ctx.slope, intercept: ctx.intercept, noise: ctx.noise, xRange: ctx.xRange, round: ctx.round, rRange })
  return { n, xs: d.xs, ys: d.ys, fit: linearRegression(d.xs, d.ys) }
}

/** Minitab-style output block for a fit, at the pairing's display precision. */
function outputMd(ctx: OutCtx, f: ReturnType<typeof linearRegression>): string {
  const df = f.n - 2
  const row = (name: string, coef: number, se: number, digits: number) => {
    const T = coef / se
    return [name, fmt(coef, digits), fmt(se, digits), fmt(T, 2), fmtP(2 * t.sf(Math.abs(T), df))]
  }
  const table = tableMd(
    ['Predictor', 'Coef', 'SE Coef', 'T', 'P'],
    [row('Constant', f.intercept, f.seIntercept, ctx.aDigits), row(ctx.predictor, f.slope, f.seSlope, ctx.bDigits)],
  )
  return `${table}\n\n\`S = ${fmt(f.s, ctx.sDigits)}   R-Sq = ${fmt(100 * f.r2, 1)} %   n = ${f.n}\``
}

// ---------------------------------------------------------------------------------------------
// 1. Interpretation — r² AND s, from the output block, in context
// ---------------------------------------------------------------------------------------------

/** rSquaredInterpretation with the two groups that make s part of the same sentence. */
function r2AndS(ctx: OutCtx, r2: number, s: number): InterpretationAnswer {
  const base = rSquaredInterpretation({ r2, xVar: ctx.xVar, yVar: ctx.yVar })
  const sGroups: RubricGroup[] = [
    { label: `Cites s (${fmt(s, ctx.sDigits)} ${ctx.yUnits})`, phrasings: [numberRegex(s, ctx.sDigits, 1)], polarity: 'any', feedback: `Quote the standard deviation of the residuals: s = ${fmt(s, ctx.sDigits)} ${ctx.yUnits}.` },
    { label: 'Reads s as a TYPICAL distance, not a bound', phrasings: ['typical', /\baverage\b/, 'usual', 'about'], polarity: 'any', feedback: 'Say that s is how far a row typically sits from the line — not how far any row can sit from it.' },
    { label: 'Says s is measured from the PREDICTED value, in the response units', phrasings: ['predict', 'residual', /\bline\b/], polarity: 'any', feedback: `s is the typical size of actual ${ctx.yVar} minus predicted ${ctx.yVar}, in ${ctx.yUnits}.` },
  ]
  return {
    type: 'interpretation',
    required: [...base.required, ...sGroups],
    forbidden: base.forbidden,
    exemplar: `${base.exemplar} The actual ${ctx.yVar} is typically about ${fmt(s, ctx.sDigits)} ${ctx.yUnits} away from the value the line predicts.`,
    minWords: 14,
  }
}

export const interpretR2AndS = defineGenerator({
  id: 'act-2/interpret-r2-s',
  label: 'Interpret r² and s from computer output',
  ap_topics: ['2.8'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const f = retry(
      rng,
      (r) => fitted(r, ctx, r.int(20, 40), [0.78, 0.97]),
      (d) => d.fit.r2 > 0.6 && d.fit.r2 < 0.95 && d.fit.s > 0,
    )
    const r2 = round(f.fit.r2, 3)
    const s = round(f.fit.s, ctx.sDigits)
    const tpl = r2AndS(ctx, r2, s)
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n))}\n\nThe terminal prints the regression of ${ctx.yAxis} on ${ctx.xAxis}:\n\n${outputMd(ctx, f.fit)}\n\nInterpret **both** reported measures of fit — R-Sq and S — in context. Two sentences at most.`,
      answer: tpl,
      hints: [
        'They answer two different questions. One says *how much* of the variation in the response the line accounts for; the other says *how far* an individual typically sits from the line, in the response’s own units.',
        `R-Sq = ${fmt(100 * r2, 1)} % is the share of the variation in ${ctx.yVar} explained by the linear relationship with ${ctx.xVar}. S = ${fmt(s, ctx.sDigits)} ${ctx.yUnits} is the standard deviation of the residuals.`,
        `Say “about ${fmt(100 * r2, 1)} % of the variation in ${ctx.yVar} is explained by…”, then “the actual ${ctx.yVar} is typically about ${fmt(s, ctx.sDigits)} ${ctx.yUnits} from the predicted value”.`,
      ],
      solution: `${tpl.exemplar}\n\nR-Sq is a **proportion of variation**, so it is unitless and cannot say how big a miss is. S is a **distance**, in ${ctx.yUnits}, so it cannot say what share of the pattern the line captured. A report that quotes one without the other has answered half the question — and it is usually the half that flatters the model.`,
      misconception: `r² is not r, and s is not the standard deviation of ${ctx.yVar}. s is the spread of what is **left over** after the line has done its work: the typical vertical distance from a row to its own prediction.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — write the equation from the output block and use it
// ---------------------------------------------------------------------------------------------

export const equationFromOutput = defineGenerator({
  id: 'act-2/equation-from-output',
  label: 'Equation from computer output',
  ap_topics: ['2.8', '2.6'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const drawn = retry(
      rng,
      (r) => {
        const f = fitted(r, ctx, r.int(18, 36))
        const lo = min(f.xs)
        const hi = max(f.xs)
        const x0 = round(r.uniform(lo + 0.15 * (hi - lo), hi - 0.15 * (hi - lo)), ctx.round)
        return { f, lo, hi, x0, a: round(f.fit.intercept, ctx.aDigits), b: round(f.fit.slope, ctx.bDigits) }
      },
      (d) => Math.sign(d.b) === Math.sign(ctx.slope) && Math.abs(d.b) >= 2 * 10 ** -ctx.bDigits && d.x0 > d.lo && d.x0 < d.hi,
    )
    const { f, x0, a, b } = drawn
    const yHat = a + b * x0
    const sub = `${fmt(a, ctx.aDigits).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), ctx.bDigits)}(${fmt(x0, ctx.round)})`
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n))}\n\nThe terminal prints the regression of ${ctx.yAxis} on ${ctx.xAxis} and nothing else:\n\n${outputMd(ctx, f.fit)}\n\nWrite the least-squares equation from the output, then use it: what ${ctx.yVar} does the line predict at ${ctx.xVar} = ${fmt(x0, ctx.round)} ${ctx.xTick}? Answer in ${ctx.yUnits}, to two decimal places.`,
      answer: numericAnswer(yHat, 'other', { digits: 2, units: ctx.yShort ?? ctx.yUnits }),
      hints: [
        'The **Coef** column holds the equation. The Constant row is the y-intercept; the predictor row is the slope. The SE Coef, T and P columns describe how well those two numbers are pinned down, and none of them belongs in the equation.',
        `$\\hat{y} = ${fmt(a, ctx.aDigits).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), ctx.bDigits)}x$, with $x$ the ${ctx.xVar} in ${ctx.xTick}.`,
        `Substitute ${fmt(x0, ctx.round)}: $\\hat{y} = ${sub}$.`,
      ],
      solution: `From the **Coef** column, $\\hat{y} = ${fmt(a, ctx.aDigits).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), ctx.bDigits)}x$.\n\n$$\\hat{y} = ${sub} = ${fmt(yHat, 4)}$$\n\nThe predicted ${ctx.yVar} is **${fmt(yHat, 2)} ${ctx.yUnits}**. S = ${fmt(f.fit.s, ctx.sDigits)} ${ctx.yUnits} says how far an individual typically lands from that prediction; the prediction itself carries no promise about any one ${ctx.rows.replace(/s$/, '')}.`,
      misconception: 'Reading the equation out of the **SE Coef** column instead of **Coef**. The standard errors say how precisely the coefficients are known; they are not the coefficients.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — remove the point at the far end of the x-range
// ---------------------------------------------------------------------------------------------

type Effect = 'A' | 'B' | 'C' | 'D'

export const leverageEffect = defineGenerator({
  id: 'act-2/leverage-effect',
  label: 'Removing a high-leverage point',
  ap_topics: ['2.8'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const onLine = rng.bool()
    const drawn = retry(
      rng,
      (r) => {
        const f = fitted(r, ctx, r.int(18, 30))
        const rest = linearRegression(f.xs, f.ys)
        const fx = round(r.uniform(ctx.far[0], ctx.far[1]), ctx.round)
        // On the line the rest of the file makes, or far enough off it to swing the slope by a
        // definite fraction q: at this distance Δb ≈ offset / (x_far − x̄).
        const q = r.uniform(0.35, 0.7)
        const offset = onLine ? r.normal(0, 0.25 * rest.s) : (r.bool() ? 1 : -1) * q * Math.abs(rest.slope) * (fx - rest.xMean)
        const fy = round(rest.predict(fx) + offset, ctx.round)
        const xs = [...f.xs, fx]
        const ys = [...f.ys, fy]
        const withPt = linearRegression(xs, ys)
        const k = xs.length - 1
        const dSlope = Math.abs(withPt.slope - rest.slope) / Math.abs(rest.slope)
        const dR2 = withPt.r2 - rest.r2
        return { f, rest, withPt, fx, fy, k, dSlope, dR2, offset }
      },
      (d) =>
        d.withPt.leverage[d.k] > 4 / d.withPt.n &&
        Math.abs(d.dR2) > 0.02 &&
        (onLine ? d.dSlope < 0.05 && !d.withPt.flags.influential.includes(d.k) : d.dSlope > 0.25 && d.withPt.flags.influential.includes(d.k)),
    )
    const { rest, withPt, fx, fy, k, dSlope, dR2 } = drawn
    const moved = dSlope > 0.15
    const r2Falls = dR2 > 0 // r² is higher WITH the point, so removing it makes r² fall
    const key: Effect = moved ? (r2Falls ? 'C' : 'D') : r2Falls ? 'A' : 'B'
    const OPTIONS: Record<Effect, string> = {
      A: `The slope barely moves and r² falls. The point sits far out in x but close to the line the rest of the file already makes: it is high-leverage and **not** influential — it was stretching the x-range, and so inflating r², without steering the line.`,
      B: `The slope barely moves and r² rises. The point sits far out in x, close enough to the rest of the file’s line to leave it where it was, but far enough off it to have been costing the fit: high-leverage, not influential.`,
      C: `The slope changes substantially and r² falls. The point was steering the line — it is influential — and the fit through the rest of the file explains less of the variation than the fit that was being held out to it.`,
      D: `The slope changes substantially and r² rises. The point was steering the line away from the bulk of the file: it is influential, and with it gone the line settles onto the rest and fits it better.`,
    }
    const ORDER: Effect[] = ['A', 'B', 'C', 'D']
    const shuffled = rng.shuffle([...ORDER])
    const correct = shuffled.indexOf(key)
    const why: Record<Effect, string> = {
      A: `Not here: ${moved ? `dropping the point moves the slope from ${fmt(withPt.slope, ctx.bDigits)} to ${fmt(rest.slope, ctx.bDigits)}, which is not “barely”` : `r² does not fall — it goes from ${fmt(withPt.r2, 3)} to ${fmt(rest.r2, 3)}`}.`,
      B: `Not here: ${moved ? `the slope moves from ${fmt(withPt.slope, ctx.bDigits)} to ${fmt(rest.slope, ctx.bDigits)}` : `r² does not rise — it goes from ${fmt(withPt.r2, 3)} to ${fmt(rest.r2, 3)}`}.`,
      C: `Not here: ${moved ? `r² does not fall — it goes from ${fmt(withPt.r2, 3)} to ${fmt(rest.r2, 3)}` : `the slope hardly moves at all: ${fmt(withPt.slope, ctx.bDigits)} against ${fmt(rest.slope, ctx.bDigits)}`}.`,
      D: `Not here: ${moved ? `r² does not rise — it goes from ${fmt(withPt.r2, 3)} to ${fmt(rest.r2, 3)}` : `the slope hardly moves at all: ${fmt(withPt.slope, ctx.bDigits)} against ${fmt(rest.slope, ctx.bDigits)}`}.`,
    }
    const std = (fy - rest.predict(fx)) / rest.s
    return {
      prompt: `${ctx.frame.replace('{n}', String(withPt.n))}\n\nOne of them — ${ctx.farWhat} — records ${ctx.xVar} of ${fmt(fx, ctx.round)} ${ctx.xTick}, far beyond the next largest in the file (${fmt(max(drawn.f.xs), ctx.round)} ${ctx.xTick}), with ${ctx.yVar} of ${fmt(fy, ctx.round)} ${ctx.yUnits}. Fitted to the **other ${withPt.n - 1} ${ctx.rows}** alone, the line is $\\hat{y} = ${fmt(rest.intercept, ctx.aDigits).replace('−', '-')} ${rest.slope < 0 ? '-' : '+'} ${fmt(Math.abs(rest.slope), ctx.bDigits)}x$ with $s$ = ${fmt(rest.s, ctx.sDigits)} ${ctx.yUnits}, and it predicts ${fmt(rest.predict(fx), ctx.round)} ${ctx.yUnits} for her — ${Math.abs(std) < 1 ? 'which is where she is, near enough' : `about ${fmt(Math.abs(std), 1)} typical misses ${std > 0 ? 'below' : 'above'} where she actually sits`}.\n\nEbele fits all ${withPt.n}, then takes her out again. What happens to the fit when she is removed?`,
      answer: { type: 'choice', options: shuffled.map((e) => OPTIONS[e]), correct, feedback: shuffled.map((e) => (e === key ? null : why[e])) },
      hints: [
        'Two separate questions. Does the point pull the **line** (does the slope move)? And what does it do to **r²**, which is a share of variation — remembering that a point far out in x enlarges the variation there is to explain.',
        `Compare where she sits with where the line through the other ${withPt.n - 1} ${ctx.rows} puts her. A point far out in x that lands on that line has leverage without influence; one that lands well off it has both.`,
      ],
      solution: `With her: $\\hat{y} = ${fmt(withPt.intercept, ctx.aDigits).replace('−', '-')} ${withPt.slope < 0 ? '-' : '+'} ${fmt(Math.abs(withPt.slope), ctx.bDigits)}x$, r² = ${fmt(withPt.r2, 3)}.\nWithout her: $\\hat{y} = ${fmt(rest.intercept, ctx.aDigits).replace('−', '-')} ${rest.slope < 0 ? '-' : '+'} ${fmt(Math.abs(rest.slope), ctx.bDigits)}x$, r² = ${fmt(rest.r2, 3)}.\n\n**${OPTIONS[key]}**\n\nHer leverage is ${fmt(withPt.leverage[k], 3)} — by far the largest in the file, because leverage is about distance in **x** alone. Whether that leverage turns into influence depends on the second thing: how far off the rest of the file’s line she landed.`,
      misconception: 'High leverage and influence are not the same property. A point can sit far out on the x-axis and change nothing, because the rest of the file already pointed at it; and a point with ordinary leverage can still be an outlier in y. Only the with-and-without comparison settles it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — what the two summary numbers in the output block actually are
// ---------------------------------------------------------------------------------------------

export const r2NotR = defineGenerator({
  id: 'act-2/r2-not-r',
  label: 'What R-Sq and S mean',
  ap_topics: ['2.8'],
  skills: ['1'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const f = retry(
      rng,
      (r) => fitted(r, ctx, r.int(20, 40), [0.8, 0.97]),
      (d) => d.fit.r2 > 0.66 && d.fit.r2 < 0.94,
    )
    const fit = f.fit
    const ask: 'r2' | 's' = rng.bool() ? 'r2' : 's'
    const r2pct = fmt(100 * fit.r2, 1)
    const sTxt = `${fmt(fit.s, ctx.sDigits)} ${ctx.yUnits}`
    const cands =
      ask === 'r2'
        ? [
            { correct: true, text: `About ${r2pct} % of the variation in ${ctx.yVar} is explained by the linear relationship with ${ctx.xVar}.`, why: '' },
            { correct: false, text: `The correlation between ${ctx.xVar} and ${ctx.yVar} is ${r2pct} %.`, why: `That confuses r² with r. Here $r = \\sqrt{${fmt(fit.r2, 3)}} = ${fmt(fit.r, 3)}$ — a different number, with a sign, measured on a different scale.` },
            { correct: false, text: `About ${r2pct} % of the ${ctx.rows} in the file lie on the least-squares line.`, why: 'r² is a share of *variation*, not a count of rows. Almost no row lies exactly on a fitted line; that is what residuals are.' },
            { correct: false, text: `A ${r2pct} % change in ${ctx.xVar} produces the same change in predicted ${ctx.yVar}.`, why: 'That is a statement about the slope, and not a correct one either. r² says nothing about rates of change.' },
          ]
        : [
            { correct: true, text: `The actual ${ctx.yVar} is typically about ${sTxt} away from the ${ctx.yVar} the line predicts.`, why: '' },
            { correct: false, text: `The ${ctx.yVar} of the ${ctx.rows} in the file typically varies by about ${sTxt} from its own mean.`, why: `That is $s_y$ = ${fmt(fit.sy, ctx.sDigits)} ${ctx.yUnits}, the spread of the response before any line is fitted. S is what is left over *after* the line: ${sTxt}.` },
            { correct: false, text: `No ${ctx.rows.replace(/s$/, '')} in the file sits more than ${sTxt} from the line.`, why: `S is a typical distance, not a bound — ${fit.residuals.filter((e) => Math.abs(e) > fit.s).length} of the ${fit.n} residuals are larger than it.` },
            { correct: false, text: `The slope is known to within about ${sTxt}.`, why: `That is the standard error of the slope, SE Coef = ${fmt(fit.seSlope, ctx.bDigits)}, a different row of the output entirely.` },
          ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `${ctx.frame.replace('{n}', String(fit.n))}\n\n${outputMd(ctx, fit)}\n\nWhich statement reads **${ask === 'r2' ? `R-Sq = ${r2pct} %` : `S = ${fmt(fit.s, ctx.sDigits)}`}** correctly?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => (c.correct ? null : c.why)) },
      hints: [
        ask === 'r2'
          ? 'r² is a proportion of variation: of everything the response does across the file, how much of it the line accounts for. It is unitless, and it counts variation, not rows.'
          : 'S is the standard deviation of the residuals — a typical vertical distance from a row to its own prediction, in the units of the response.',
        ask === 'r2' ? `r = ${fmt(fit.r, 3)} and r² = ${fmt(fit.r2, 3)}. They are different numbers and answer different questions.` : `Compare it with $s_y$ = ${fmt(fit.sy, ctx.sDigits)} ${ctx.yUnits}, the spread of ${ctx.yVar} before the line was fitted.`,
      ],
      solution: `**${cands[0].text}**\n\nThe output block carries both because they answer different questions: R-Sq = ${r2pct} % is *how much* of the variation in ${ctx.yVar} the line accounts for, and S = ${sTxt} is *how far* an individual typically sits from it. Here $r = ${fmt(fit.r, 3)}$ and $s_y = ${fmt(fit.sy, ctx.sDigits)}$ ${ctx.yUnits} — the two numbers most often mistaken for them.`,
      misconception: 'The two classic errors, and they travel together: reading r² as r, and reading s as the standard deviation of the response. One is a share of variation; the other is what the line failed to account for.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — may an inconvenient point be deleted?
// ---------------------------------------------------------------------------------------------

const DROP_REASONS = [
  { text: 'she distorts the fit', why: 'A point far out in x moves the fit by construction; that it does so is not evidence that it is wrong.' },
  { text: 'she is the only one out there', why: 'Being alone in a region of the x-axis makes a row informative and lonely, not false.' },
  { text: 'the plot looks better without her', why: 'A tidier plot is not a finding. The file is what it is.' },
]

export const dropOrKeep = defineGenerator({
  id: 'act-2/drop-or-keep',
  label: 'Delete the inconvenient point?',
  ap_topics: ['2.8'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const reason = pickContext(rng, DROP_REASONS)
    const f = retry(
      rng,
      (r) => fitted(r, ctx, r.int(20, 34)),
      (d) => d.fit.r2 > 0.6,
    )
    const fx = round(rng.uniform(ctx.far[0], ctx.far[1]), ctx.round)
    const cands = [
      {
        correct: true,
        text: 'Keep her, and report the fit with and without her. A row is removed only for a reason outside the plot — a recording error, a different population — and the reader is told either way.',
        why: '',
      },
      { correct: false, text: `Remove her: with ${ctx.xVar} of ${fmt(fx, ctx.round)} ${ctx.xTick} she is plainly an outlier, and outliers are excluded before a line is fitted.`, why: 'Nothing about being far out in x makes a row wrong. Deleting rows because of where they sit is how a file is made to agree with a conclusion.' },
      { correct: false, text: 'Remove her if the slope changes when she is taken out, and keep her if it does not.', why: 'That is exactly backwards: it deletes a row *because* it carries information. Influence is a reason to report both fits, never a licence to drop one.' },
      { correct: false, text: 'Keep her and say nothing. A least-squares fit over the whole file needs no commentary.', why: 'A fit whose slope rests on one distant point is a fact about the fit, and a reader who is not told it has been misled by omission.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n + 1))}\n\nOne row — ${ctx.farWhat} — sits at ${ctx.xVar} = ${fmt(fx, ctx.round)} ${ctx.xTick}, alone at the top of the range, with nothing else within half of that. Her certificate is in order and her telemetry is clean. Ebele proposes to drop her from the regression because ${reason.text}.\n\nWhat should the report do?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => (c.correct ? null : c.why)) },
      hints: [
        'Ask what would justify removing a row. Not its position on the plot — a reason outside the plot: a transcription error, an instrument fault, an individual that does not belong to the population being described.',
        `“${reason.text.charAt(0).toUpperCase()}${reason.text.slice(1)}” is a statement about the picture, not about the row.`,
      ],
      solution: `**${cands[0].text}**\n\n${reason.why} The honest procedure is the with-and-without comparison: fit both, report both, and let the reader see how much of the line rests on one individual. If the two fits agree, the point was never the problem; if they disagree, that disagreement is the finding, and it belongs in the report rather than in the wastebasket.`,
      misconception: 'Deleting a point because it is inconvenient is the one move in regression that cannot be defended to a hostile reader — and the one most often made, because the plot always looks better afterwards.',
    }
  },
})
