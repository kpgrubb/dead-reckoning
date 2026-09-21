/**
 * act-2-04 · The Nineteen — drills. AP 2.7 (residuals): residual = actual − predicted, and its sign
 * is a direction; the residual plot as the model's own confession; what a pattern means (the model
 * is wrong) against what a clean band with a knot of large residuals means (those individuals are
 * wrong).
 *
 *   act-2/compute-residual    numeric         e = y − ŷ for one row of a file (1 dp, sign kept)
 *   act-2/interpret-residual  interpretation  the residual in context (rubric: residualInterpretation)
 *   act-2/residual-plot-read  display+choice  four residual plots — flat, curved, fanning, flat-plus-knot
 *   act-2/residual-pattern    choice          a described residual plot → what it implies
 *   act-2/fan-or-not          choice          equal spread or not, from the residuals themselves
 *
 * No item uses declared mass against inferred mass, and none names the Manifest's own count: those
 * belong to act-2-04's mission beats (gate review B6). Every number comes from @/lib/stats, and
 * every drawn plot is classified numerically before it is shown, so exactly one option is true.
 */
import { defineGenerator, drawScatter, listNumbers, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { residualInterpretation } from '@/lib/problems/rubrics'
import { correlation, linearRegression, mean, min, sd } from '@/lib/stats'
import { fmt, round } from '@/lib/stats/format'
import type { Rng } from '@/lib/rng'

// ---------------------------------------------------------------------------------------------
// In-world pairings (never declared mass vs inferred mass — that is the module's mission beat)
// ---------------------------------------------------------------------------------------------

interface ResCtx {
  /** Framing sentence; `{n}` is replaced by the sample size. */
  frame: string
  xVar: string
  yVar: string
  yUnits: string
  /** Short unit token for a numeric answer box (defaults to yUnits). */
  yShort?: string
  xAxis: string
  yAxis: string
  xTick: string
  /** Plural noun for one row of the file. */
  rows: string
  slope: number
  intercept: number
  noise: number
  xRange: [number, number]
  round: number
  bDigits: number
  aDigits: number
}

const CONTEXTS: ResCtx[] = [
  {
    frame: 'The Ceres office extract, {n} departures: the fuel each hull actually loaded against the mass it declared.',
    xVar: 'declared mass',
    yVar: 'fuel loaded',
    yUnits: 'kt',
    xAxis: 'declared mass (kt)',
    yAxis: 'fuel loaded (kt)',
    xTick: 'kt',
    rows: 'hulls',
    slope: 0.215,
    intercept: 0.05,
    noise: 0.3,
    xRange: [14, 27],
    round: 1,
    bDigits: 3,
    aDigits: 2,
  },
  {
    frame: "The Lane Authority's cargo ledger, {n} departures: declared cargo value against declared mass.",
    xVar: 'declared mass',
    yVar: 'declared cargo value',
    yUnits: 'M₵',
    xAxis: 'declared mass (kt)',
    yAxis: 'declared cargo value (M₵)',
    xTick: 'kt',
    rows: 'hulls',
    slope: 0.62,
    intercept: 1.4,
    noise: 1.1,
    xRange: [14, 27],
    round: 1,
    bDigits: 3,
    aDigits: 2,
  },
  {
    frame: "The Bureau's victualling column, {n} transits: scheduled transit length against consumables loaded.",
    xVar: 'transit length',
    yVar: 'consumables loaded',
    yUnits: 't',
    xAxis: 'transit length (days)',
    yAxis: 'consumables loaded (t)',
    xTick: 'days',
    rows: 'transits',
    slope: 0.17,
    intercept: 1.6,
    noise: 0.95,
    xRange: [55, 115],
    round: 1,
    bDigits: 3,
    aDigits: 2,
  },
  {
    frame: "The relay net's error budget, {n} fixes: range to the nearest relay against the transponder's signal-to-noise margin.",
    xVar: 'range to the relay',
    yVar: 'signal-to-noise margin',
    yUnits: 'dB',
    xAxis: 'range to relay (Mm)',
    yAxis: 'signal-to-noise margin (dB)',
    xTick: 'Mm',
    rows: 'fixes',
    slope: -0.062,
    intercept: 27,
    noise: 1.3,
    xRange: [30, 180],
    round: 1,
    bDigits: 4,
    aDigits: 1,
  },
  {
    frame: 'Sandoval logs {n} hours of a Watch-profile run: sink load against the cellar’s temperature rise.',
    xVar: 'sink load',
    yVar: 'temperature rise',
    yUnits: 'K',
    xAxis: 'sink load (kW)',
    yAxis: 'temperature rise (K)',
    xTick: 'kW',
    rows: 'hours',
    slope: 0.043,
    intercept: 0.6,
    noise: 0.45,
    xRange: [20, 140],
    round: 1,
    bDigits: 4,
    aDigits: 2,
  },
]

/** Hull names for single-row items — never one of the nineteen, never Cyrene Ore. */
const HULLS = ['Heron Ledge', 'Osprey Wake', 'Curlew Bank', 'Plover Reach', 'Vesta Tariff', 'Juno Factor', 'Hygiea Ledger', 'Davida Bond', 'Nippur Sulcus', 'Philus Sulcus', 'Arbela Sulcus', 'Erech Sulcus', 'Gannet Drift', 'Thisbe Carriage', 'Ur Sulcus', 'Petrel Strand'] as const

interface Fitted {
  n: number
  xs: number[]
  ys: number[]
  fit: ReturnType<typeof linearRegression>
  /** The coefficients the prompt prints — the learner works from these, so the answer does too. */
  a: number
  b: number
}

function fitted(rng: Rng, ctx: ResCtx, n: number): Fitted {
  const d = drawScatter(rng, { n, slope: ctx.slope, intercept: ctx.intercept, noise: ctx.noise, xRange: ctx.xRange, round: ctx.round })
  const fit = linearRegression(d.xs, d.ys)
  return { n, xs: d.xs, ys: d.ys, fit, a: round(fit.intercept, ctx.aDigits), b: round(fit.slope, ctx.bDigits) }
}

function equationTex(ctx: ResCtx, a: number, b: number): string {
  return `\\hat{y} = ${fmt(a, ctx.aDigits).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), ctx.bDigits)}x`
}

/** Residuals against the printed line, not the unrounded fit. */
function residualsOf(f: Fitted): number[] {
  return f.ys.map((y, i) => y - (f.a + f.b * f.xs[i]))
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — compute a residual
// ---------------------------------------------------------------------------------------------

export const computeResidual = defineGenerator({
  id: 'act-2/compute-residual',
  label: 'Compute a residual',
  ap_topics: ['2.7'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const hull = pickContext(rng, HULLS)
    const drawn = retry(
      rng,
      (r) => {
        const f = fitted(r, ctx, r.int(16, 30))
        const es = residualsOf(f)
        const floor = Math.max(0.3, 0.8 * f.fit.s)
        const cands = es.map((e, i) => (Math.abs(e) >= floor ? i : -1)).filter((i) => i >= 0)
        return { f, es, k: cands.length ? r.choice(cands) : -1 }
      },
      (d) => d.k >= 0 && Math.sign(d.f.b) === Math.sign(ctx.slope),
    )
    const { f, es, k } = drawn
    const x = f.xs[k]
    const y = f.ys[k]
    const yHat = f.a + f.b * x
    const e = es[k]
    const sub = `${fmt(f.a, ctx.aDigits).replace('−', '-')} ${f.b < 0 ? '-' : '+'} ${fmt(Math.abs(f.b), ctx.bDigits)}(${fmt(x, ctx.round)})`
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n))}\n\nThe least-squares line of ${ctx.yAxis} on ${ctx.xAxis} is\n\n$$${equationTex(ctx, f.a, f.b)}$$\n\n*${hull}* records ${ctx.xVar} of ${fmt(x, ctx.round)} ${ctx.xTick} and ${ctx.yVar} of ${fmt(y, ctx.round)} ${ctx.yUnits}.\n\nReport her **residual**, in ${ctx.yUnits}, to one decimal place. Keep the sign — it is a direction, not a nuisance.`,
      answer: numericAnswer(e, 'other', { digits: 1, units: ctx.yShort ?? ctx.yUnits }),
      hints: [
        'A residual is what the line missed by, measured from the line to the hull: $e = y - \\hat{y}$, actual minus predicted. Predict first, then subtract — in that order.',
        `$\\hat{y} = ${sub}$. Then $e = ${fmt(y, ctx.round)} - \\hat{y}$.`,
        `Positive means *${hull}* sits above the line — the model gave her too little. Negative means the model gave her too much.`,
      ],
      solution: `$$\\hat{y} = ${sub} = ${fmt(yHat, 3)}$$\n\n$$e = y - \\hat{y} = ${fmt(y, ctx.round)} - ${fmt(yHat, 3).replace('−', '-')} = ${fmt(e, 3)}$$\n\nThe residual is **${fmt(e, 1)} ${ctx.yUnits}**. *${hull}* sits ${fmt(Math.abs(e), 1)} ${ctx.yUnits} ${e > 0 ? 'above' : 'below'} the line, so the model ${e > 0 ? 'under' : 'over'}estimates her ${ctx.yVar}.`,
      misconception: `Predicted minus actual gives ${fmt(-e, 1)} ${ctx.yUnits} — the right size and the wrong sign. The convention is actual minus predicted, and reversing it reverses the finding.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the residual in context
// ---------------------------------------------------------------------------------------------

export const interpretResidual = defineGenerator({
  id: 'act-2/interpret-residual',
  label: 'Interpret a residual in context',
  ap_topics: ['2.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const wantPositive = rng.bool()
    const drawn = retry(
      rng,
      (r) => {
        const f = fitted(r, ctx, r.int(16, 30))
        const es = residualsOf(f)
        const floor = Math.max(0.3, 0.8 * f.fit.s)
        const cands = es.map((e, i) => ((wantPositive ? e >= floor : e <= -floor) ? i : -1)).filter((i) => i >= 0)
        return { f, es, k: cands.length ? r.choice(cands) : -1 }
      },
      (d) => d.k >= 0,
    )
    const { f, es, k } = drawn
    const e = es[k]
    const xText = fmt(f.xs[k], ctx.round)
    const tpl = residualInterpretation({ residual: round(e, 1), yVar: ctx.yVar, yUnits: ctx.yUnits, xVar: ctx.xVar, xValue: `${xText} ${ctx.xTick}`, digits: 1 })
    return {
      prompt: `${ctx.frame.replace('{n}', String(f.n))}\n\nThe least-squares line of ${ctx.yAxis} on ${ctx.xAxis} is\n\n$$${equationTex(ctx, f.a, f.b)}$$\n\nOne row, at ${ctx.xVar} = ${xText} ${ctx.xTick}, has a residual of **${fmt(e, 1)} ${ctx.yUnits}**.\n\nInterpret that residual in context, in one sentence.`,
      answer: tpl,
      hints: [
        'A residual is a vertical distance with a direction: actual minus predicted. A positive one says the individual sits above the line and the model gave it too little; a negative one says the opposite.',
        `Name the size (${fmt(Math.abs(e), 1)} ${ctx.yUnits}), say which way (${e > 0 ? 'actual above predicted' : 'actual below predicted'}), and say what was ${e > 0 ? 'under' : 'over'}estimated: ${ctx.yVar}.`,
      ],
      solution: `${tpl.exemplar}\n\nThe magnitude alone is not an interpretation. A residual of ${fmt(e, 1)} ${ctx.yUnits} without a direction leaves the reader to guess which side of the line the row sits on, and that is the only part of it that ever matters.`,
      misconception: 'Reporting the residual as predicted minus actual flips the direction: the same row then reads as though the model had overshot it, and every conclusion downstream inverts.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Display + choice — read the residual plot
// ---------------------------------------------------------------------------------------------

type Pattern = 'flat' | 'curve' | 'fan' | 'cluster'

interface Diag {
  /** Correlation of residual with (x − x̄)² — curvature. */
  curv: number
  /** Correlation of residual with x — leftover trend (should be ~0 for a least-squares fit). */
  trend: number
  /** sd(residuals in the top third of x) ÷ sd(residuals in the bottom third). */
  fanRatio: number
  /** Size of a clean high knot above an otherwise tight band, or 0. */
  knot: number
}

function diagnose(xs: number[], es: number[]): Diag {
  const xm = mean(xs)
  const curv = correlation(
    es,
    xs.map((x) => (x - xm) * (x - xm)),
  )
  const trend = correlation(es, xs)
  const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b])
  const third = Math.max(4, Math.floor(order.length / 3))
  const lowSd = sd(order.slice(0, third).map((i) => es[i]))
  const highSd = sd(order.slice(-third).map((i) => es[i]))
  const sorted = [...es].sort((a, b) => b - a)
  let knot = 0
  for (let m = 3; m <= 10 && m < sorted.length - 6; m++) {
    const rest = sorted.slice(m)
    const sr = sd(rest)
    const mr = mean(rest)
    // A knot is a clean break: the m-th residual stands 3 SDs above the rest's own centre, the
    // (m+1)-th does not, and nothing below the band reaches as far the other way.
    if (sr > 0 && sorted[m - 1] - mr > 3 * sr && sorted[m] - mr < 2.8 * sr && mr - min(rest) < 3.2 * sr) {
      knot = m
      break
    }
  }
  return { curv, trend, fanRatio: lowSd > 0 ? highSd / lowSd : Infinity, knot }
}

function patternHolds(p: Pattern, d: Diag): boolean {
  if (!Number.isFinite(d.curv) || !Number.isFinite(d.trend) || !Number.isFinite(d.fanRatio)) return false
  switch (p) {
    case 'flat':
      return Math.abs(d.curv) < 0.3 && Math.abs(d.trend) < 0.25 && d.fanRatio > 0.55 && d.fanRatio < 1.8 && d.knot < 4
    case 'curve':
      return Math.abs(d.curv) > 0.7 && Math.abs(d.trend) < 0.35 && d.knot < 4
    case 'fan':
      return d.fanRatio > 2.4 && Math.abs(d.curv) < 0.35 && Math.abs(d.trend) < 0.3 && d.knot < 4
    case 'cluster':
      return d.knot >= 4 && d.knot <= 8 && Math.abs(d.curv) < 0.35 && Math.abs(d.trend) < 0.3 && d.fanRatio > 0.4 && d.fanRatio < 2.2
  }
}

const PLOT_OPTIONS: Record<Pattern, string> = {
  flat: 'No pattern: the residuals scatter in a band of roughly constant width about zero. A line is an appropriate model, and nothing in the plot argues with it.',
  curve: 'Curvature: the residuals bend — a run of one sign at both ends of the x-range and the opposite sign through the middle. A straight line is the wrong form for these data.',
  fan: 'Fanning: the spread of the residuals grows steadily with x. The line is far less precise at the top of the range than at the bottom, so equal spread fails.',
  cluster: 'A flat band with a knot of large positive residuals sitting well clear of it. The model fits the bulk of the file; a handful of individuals are far above their own predictions.',
}

const PLOT_ORDER: Pattern[] = ['flat', 'curve', 'fan', 'cluster']

export const residualPlotRead = defineGenerator({
  id: 'act-2/residual-plot-read',
  label: 'Read the residual plot',
  ap_topics: ['2.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const pattern = pickContext(rng, PLOT_ORDER)
    const drawn = retry(
      rng,
      (r) => {
        const n = r.int(32, 48)
        const [xlo, xhi] = ctx.xRange
        const span = xhi - xlo
        const xs: number[] = []
        for (let i = 0; i < n; i++) xs.push(round(r.uniform(xlo, xhi), ctx.round))
        const s0 = ctx.noise
        let es: number[] = []
        if (pattern === 'flat') es = xs.map(() => r.normal(0, s0))
        else if (pattern === 'curve') {
          const c = (r.bool() ? 1 : -1) * r.uniform(2.2, 3.2) * s0
          es = xs.map((x) => {
            const u = (2 * (x - xlo)) / span - 1
            return c * (u * u - 1 / 3) + r.normal(0, 0.3 * s0)
          })
        } else if (pattern === 'fan') es = xs.map((x) => r.normal(0, s0 * (0.3 + 1.7 * ((x - xlo) / span))))
        else {
          // A tight band (truncated so nothing in it masquerades as part of the knot) plus a knot.
          es = xs.map(() => {
            let z: number
            do z = r.normal()
            while (Math.abs(z) > 2.2)
            return z * s0
          })
          const m = r.int(4, 7)
          for (const i of r.sample([...Array(n).keys()], m)) es[i] = Math.abs(es[i]) + r.uniform(4.2, 6) * s0
        }
        // Centre the residuals: a least-squares fit leaves them summing to zero.
        const em = mean(es)
        es = es.map((e) => round(e - em, Math.max(2, ctx.round + 1)))
        return { xs, es, d: diagnose(xs, es) }
      },
      (g) => patternHolds(pattern, g.d) && PLOT_ORDER.every((p) => p === pattern || !patternHolds(p, g.d)),
    )
    const order = [...PLOT_ORDER]
    const shuffled = rng.shuffle(order)
    const correct = shuffled.indexOf(pattern)
    const why: Record<Pattern, string> = {
      flat: 'The band is not of constant width and free of bends here — look again at the shape the residuals trace.',
      curve: 'There is no bend: the residuals do not run one sign at the ends and the other through the middle.',
      fan: 'The spread does not grow with x; the band is about as wide at one end as the other.',
      cluster: 'There is no clean knot of large positive residuals standing clear of an otherwise tight band.',
    }
    return {
      prompt: `${ctx.frame.replace('{n}', String(drawn.xs.length))}\n\nEbele fits a line and plots the residuals against ${ctx.xVar}. Read the plot: what does it say about the model?`,
      answer: {
        type: 'display',
        display: { kind: 'residual', points: drawn.xs.map((x, i) => ({ x, resid: drawn.es[i] })), xLabel: ctx.xAxis },
        question: { type: 'choice', options: shuffled.map((p) => PLOT_OPTIONS[p]), correct, feedback: shuffled.map((p) => (p === pattern ? null : why[p])) },
      },
      hints: [
        'A residual plot has one job: to show what the line could not account for. Look for three things in order — a bend, a change in width, and any individual points standing clear of the rest.',
        `Compare the residuals over the smallest ${ctx.xVar} with those over the largest, and then look at the middle.`,
      ],
      solution: `**${PLOT_OPTIONS[pattern]}**\n\nThe diagnostics: the residuals' correlation with $(x - \\bar{x})^2$ is ${fmt(drawn.d.curv, 2)} (a bend would push this well away from zero); the spread over the top third of ${ctx.xVar} is ${fmt(drawn.d.fanRatio, 2)} times the spread over the bottom third (fanning would push this above about 2); and ${drawn.d.knot === 0 ? 'no group of points stands clear of the band' : `${drawn.d.knot} points stand clear of the band above it`}.`,
      misconception: 'A pattern in a residual plot is a statement about the model, not about the honesty of the data. Curvature and fanning say the line is the wrong description; only a clean band with a knot of outliers points at the individuals.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — what a described residual plot implies
// ---------------------------------------------------------------------------------------------

const IMPLICATIONS = [
  'A line is the wrong model for these data: either the form or the condition of roughly equal spread fails. Fix the model before reading anything off it.',
  'The model is sound for the bulk of the file; a handful of individuals are unlike the rest. Go and look at those individuals.',
  'Nothing is wrong. This is what a residual plot looks like when a line fits well.',
  'The file is unreliable and should be set aside until better data arrive.',
]

export const residualPattern = defineGenerator({
  id: 'act-2/residual-pattern',
  label: 'What the pattern implies',
  ap_topics: ['2.7'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const pattern = pickContext(rng, PLOT_ORDER)
    const knot = rng.int(4, 9)
    const described: Record<Pattern, string> = {
      flat: `the residuals scatter in a band of roughly constant width about zero, with no bend and no run of one sign`,
      curve: `the residuals are positive at both ends of the ${ctx.xVar} range and negative through the middle`,
      fan: `the residuals are tight for the smallest ${ctx.xVar} and spread out steadily as ${ctx.xVar} grows, with no bend`,
      cluster: `the residuals scatter in a flat band of constant width — except for ${knot} ${ctx.rows} sitting well above it, clear of everything else, with nothing below to match`,
    }
    const correct = pattern === 'cluster' ? 1 : pattern === 'flat' ? 2 : 0
    const feedback = [
      correct === 0 ? null : pattern === 'cluster' ? 'The band itself is flat and of constant width — the line describes the bulk of the file perfectly well. It is the knot of individuals that needs explaining, not the form of the model.' : 'There is nothing in the plot to fix: no bend, no change in width. A line is the right description here.',
      correct === 1 ? null : pattern === 'flat' ? 'No individual stands clear of the band, so there is nobody to single out.' : 'This is a pattern across the whole x-range, not a handful of individuals. Every row is described badly in the same systematic way.',
      correct === 2 ? null : 'A residual plot with a shape in it is the model telling you something. Do not read it as a clean bill of health.',
      'A pattern in a residual plot is information about the model or about particular individuals. Discarding a file because it disagrees with a line is how a Bureau writes a report, not how a finding is made.',
    ]
    return {
      prompt: `${ctx.frame.replace('{n}', String(rng.int(180, 420)))}\n\nEbele fits a line and plots the residuals against ${ctx.xVar}. He reports that ${described[pattern]}.\n\nWhat does that imply?`,
      answer: { type: 'choice', options: IMPLICATIONS, correct, feedback },
      hints: [
        'Separate two questions. Is the *shape* of the plot wrong — a bend, a widening — which is a statement about the model? Or is the shape fine and only certain *individuals* out of place, which is a statement about them?',
        'A systematic feature across the whole x-range indicts the model. A clean band with a knot standing clear of it indicts the rows in the knot.',
      ],
      solution: `**${IMPLICATIONS[correct]}**\n\n${pattern === 'curve' ? 'A bend means the true relationship is not a straight line; the residuals are showing the part of the curve the line could not follow.' : pattern === 'fan' ? 'Widening spread means the line predicts well at one end of the range and badly at the other. The form may be right, but equal spread — a condition every later inference leans on — is not.' : pattern === 'cluster' ? 'The band is flat and of constant width, so the line is the right description of the bulk of the file. What remains to be explained is a handful of individuals that sit far above their own predictions — and that is a question about those individuals, not about the line.' : 'No bend, no widening, no group standing clear: the line has nothing left to account for.'}`,
      misconception: 'Neither a pattern nor a knot of outliers means the data are false. A pattern means the model is wrong; a knot means those individuals are unusual — and which of the two it is decides what the next paragraph of the report says.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — does the residual plot fan?
// ---------------------------------------------------------------------------------------------

type Spread = 'equal' | 'grows' | 'shrinks'

export const fanOrNot = defineGenerator({
  id: 'act-2/fan-or-not',
  label: 'Equal spread, or a fan',
  ap_topics: ['2.7'],
  skills: ['2', '4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const u = rng.float()
    const kind: Spread = u < 0.4 ? 'equal' : u < 0.7 ? 'grows' : 'shrinks'
    const m = rng.int(10, 14)
    const s0 = ctx.noise
    const scale = kind === 'equal' ? [1, 1] : kind === 'grows' ? [0.42, 1.7] : [1.7, 0.42]
    const drawn = retry(
      rng,
      (r) => {
        const light = Array.from({ length: m }, () => round(r.normal(0, s0 * scale[0]), 1))
        const heavy = Array.from({ length: m }, () => round(r.normal(0, s0 * scale[1]), 1))
        return { light, heavy, sl: sd(light), sh: sd(heavy) }
      },
      (d) => {
        if (!(d.sl > 0) || !(d.sh > 0)) return false
        const ratio = d.sh / d.sl
        return kind === 'equal' ? ratio > 0.72 && ratio < 1.38 : kind === 'grows' ? ratio > 2.3 : ratio < 0.44
      },
    )
    const { light, heavy, sl, sh } = drawn
    const loBand = `${fmt(ctx.xRange[0], 0)}–${fmt(ctx.xRange[0] + 0.25 * (ctx.xRange[1] - ctx.xRange[0]), 0)} ${ctx.xTick}`
    const hiBand = `${fmt(ctx.xRange[1] - 0.25 * (ctx.xRange[1] - ctx.xRange[0]), 0)}–${fmt(ctx.xRange[1], 0)} ${ctx.xTick}`
    const options = [
      `No. The two groups scatter by about the same amount, so the band is of roughly constant width and the equal-spread condition holds.`,
      `Yes. The residuals spread out as ${ctx.xVar} grows, so the line's predictions are much less precise at the top of the range than at the bottom.`,
      `Yes, in the other direction. The residuals narrow as ${ctx.xVar} grows, so the line's predictions are much less precise at the bottom of the range than at the top.`,
      `Cannot be judged from residuals alone: the spread of a residual plot says nothing until r is known.`,
    ]
    const correct = kind === 'equal' ? 0 : kind === 'grows' ? 1 : 2
    const feedback = [
      correct === 0 ? null : `The two spreads are not comparable: ${fmt(sl, 2)} ${ctx.yUnits} against ${fmt(sh, 2)} ${ctx.yUnits}.`,
      correct === 1 ? null : `The residuals do not widen with ${ctx.xVar}: ${fmt(sl, 2)} ${ctx.yUnits} at the light end against ${fmt(sh, 2)} ${ctx.yUnits} at the heavy end.`,
      correct === 2 ? null : `The residuals do not narrow with ${ctx.xVar}: ${fmt(sl, 2)} ${ctx.yUnits} at the light end against ${fmt(sh, 2)} ${ctx.yUnits} at the heavy end.`,
      'r describes the strength of a linear association over the whole file. Equal spread is a separate question, and the residuals answer it on their own.',
    ]
    return {
      prompt: `${ctx.frame.replace('{n}', String(rng.int(180, 420)))}\n\nEbele fits a line and pulls the residuals (${ctx.yUnits}) for the two ends of the range.\n\nLow ${ctx.xVar} (${loBand}): ${listNumbers(light, 1)}\n\nHigh ${ctx.xVar} (${hiBand}): ${listNumbers(heavy, 1)}\n\nDoes the residual plot **fan**?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Fanning is a change in the *width* of the residual band across the x-range, not a change in its centre. Both groups should sit around zero; the question is how far they stray.',
        `Compute the standard deviation of each group and compare them. A ratio near 1 is equal spread; a ratio of 2 or more is a fan.`,
      ],
      solution: `$$s_{\\text{low}} = ${fmt(sl, 2)}\\ \\text{${ctx.yUnits}},\\qquad s_{\\text{high}} = ${fmt(sh, 2)}\\ \\text{${ctx.yUnits}},\\qquad \\frac{s_{\\text{high}}}{s_{\\text{low}}} = ${fmt(sh / sl, 2)}$$\n\n**${options[correct]}** ${kind === 'equal' ? 'A ratio this close to one is ordinary sampling variation, not a fan.' : 'A ratio this far from one is a change in the precision of the model across the range, and every later interval built on this line assumes it away.'}`,
      misconception: 'A fan is not about where the residuals sit but about how wide they scatter. Both ends are centred on zero in every honest residual plot; only the width carries the warning.',
    }
  },
})
