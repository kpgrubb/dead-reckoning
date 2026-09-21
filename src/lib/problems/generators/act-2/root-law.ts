/**
 * act-2-06 · Root Law — drills. AP 2.9 (departures from linearity): recognising a bow, choosing a
 * transformation by its residual plot rather than by r², reading a log-model slope as an exponent,
 * back-transforming a prediction, and knowing when a transformation is a cure for a disease the data
 * do not have.
 *
 *   act-2/choose-transform     choice   raw / log y / log–log, given r² and the three residual plots
 *   act-2/back-transform       numeric  predict from a fitted log-y or log–log model, in original units
 *   act-2/loglog-exponent      interpretation  the log–log slope read as a power (rubric)
 *   act-2/no-transform-needed  choice   the raw residuals are already flat; r² does not overrule them
 *   act-2/log-slope-units      choice   what the slope of a log-y model means (and does not)
 *
 * Nothing here uses time to Mark 9 against Lane length, or fuel against the Bureau's required-fuel
 * column: those are act-2-06's own instrument and mission beats (gate review B6). Every candidate
 * model is really fitted with @/lib/stats and its residual curvature measured before the options are
 * written, so the described plots are the plots the numbers make and exactly one option is true.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import { correlation, mean, transformedRegression, type Transform } from '@/lib/stats'
import { fmt, round } from '@/lib/stats/format'
import type { Rng } from '@/lib/rng'
import type { InterpretationAnswer } from '@/lib/problems/types'

// ---------------------------------------------------------------------------------------------
// In-world laws (never t9 against Lane length, never fuel against required fuel)
// ---------------------------------------------------------------------------------------------

type Law = 'power' | 'exp' | 'linear'

interface CurveCtx {
  /** Framing sentence; `{n}` is replaced by the sample size. */
  frame: string
  xVar: string
  yVar: string
  xTick: string
  yUnits: string
  yShort?: string
  xAxis: string
  yAxis: string
  law: Law
  /** Multiplier (power / exponential) or slope (linear). */
  a: number
  /** Exponent (power), log₁₀ rate per unit x (exponential), or slope (linear). */
  b: number
  /** Intercept, linear laws only. */
  c0: number
  xRange: [number, number]
  /** SD of the multiplicative noise, in log₁₀ units (power/exp); additive SD (linear). */
  noise: number
  /** Decimals x is recorded to. */
  round: number
  /** Decimals y is recorded to. */
  yRound: number
  /** Where a prediction is asked for. */
  predictAt: [number, number]
}

const CURVES: CurveCtx[] = [
  {
    frame: "Solberg's link budget, {n} relay passes: the power the receiver saw against the range to the relay.",
    xVar: 'range',
    yVar: 'received power',
    xTick: 'Mm',
    yUnits: 'nW',
    xAxis: 'range (Mm)',
    yAxis: 'received power (nW)',
    law: 'power',
    a: 4e5,
    b: -2,
    c0: 0,
    xRange: [20, 400],
    noise: 0.022,
    round: 1,
    yRound: 2,
    predictAt: [40, 320],
  },
  {
    frame: 'The yard file on the forward coilgun, {n} proving shots: the energy delivered to the slug against its muzzle velocity.',
    xVar: 'muzzle velocity',
    yVar: 'delivered energy',
    xTick: 'km/s',
    yUnits: 'MJ',
    xAxis: 'muzzle velocity (km/s)',
    yAxis: 'delivered energy (MJ)',
    law: 'power',
    a: 450,
    b: 2,
    c0: 0,
    xRange: [1.2, 6],
    noise: 0.018,
    round: 2,
    yRound: 1,
    predictAt: [1.6, 5.4],
  },
  {
    frame: "Sandoval's cellar log, {n} readings: the tritium activity of the coolant charge against its age.",
    xVar: 'charge age',
    yVar: 'activity',
    xTick: 'years',
    yUnits: 'GBq',
    xAxis: 'charge age (years)',
    yAxis: 'activity (GBq)',
    law: 'exp',
    a: 480,
    b: -0.0245,
    c0: 0,
    xRange: [1, 40],
    noise: 0.016,
    round: 1,
    yRound: 1,
    predictAt: [6, 34],
  },
  {
    frame: '{n} minutes of the cooldown after a purge: the hull plate’s temperature above ambient against the time since the radiators came in.',
    xVar: 'time since purge',
    yVar: 'temperature above ambient',
    xTick: 'min',
    yUnits: 'K',
    xAxis: 'time since purge (min)',
    yAxis: 'temperature above ambient (K)',
    law: 'exp',
    a: 120,
    b: -0.019,
    c0: 0,
    xRange: [2, 90],
    noise: 0.015,
    round: 1,
    yRound: 2,
    predictAt: [10, 80],
  },
]

/** Linear laws with a substantial intercept — a log axis bends them, and the raw plot does not. */
const LINEARS: CurveCtx[] = [
  {
    frame: "Solberg's traffic log, {n} passes: cumulative traffic carried against link time, after the handshake.",
    xVar: 'link time',
    yVar: 'traffic carried',
    xTick: 'min',
    yUnits: 'Mbit',
    xAxis: 'link time (min)',
    yAxis: 'traffic carried (Mbit)',
    law: 'linear',
    a: 0,
    b: 2.4,
    c0: 62,
    xRange: [5, 200],
    noise: 6,
    round: 1,
    yRound: 1,
    predictAt: [30, 170],
  },
  {
    frame: 'Sandoval logs {n} hours of a Watch-profile run: total heat in the cellar against hours since the profile was set.',
    xVar: 'hours on profile',
    yVar: 'heat in the cellar',
    xTick: 'h',
    yUnits: 'GJ',
    xAxis: 'hours on profile (h)',
    yAxis: 'heat in the cellar (GJ)',
    law: 'linear',
    a: 0,
    b: 1.15,
    c0: 24,
    xRange: [3, 60],
    noise: 1.1,
    round: 1,
    yRound: 1,
    predictAt: [12, 52],
  },
]

interface Drawn {
  xs: number[]
  ys: number[]
  n: number
}

function drawCurve(rng: Rng, ctx: CurveCtx, n: number): Drawn {
  const xs: number[] = []
  const ys: number[] = []
  const fx = 10 ** ctx.round
  const fy = 10 ** ctx.yRound
  for (let i = 0; i < n; i++) {
    // Spread x evenly in log space so both ends of the range are populated.
    const u = rng.uniform(0, 1)
    const x = Math.round(ctx.xRange[0] * (ctx.xRange[1] / ctx.xRange[0]) ** u * fx) / fx
    const clean = ctx.law === 'power' ? ctx.a * x ** ctx.b : ctx.law === 'exp' ? ctx.a * 10 ** (ctx.b * x) : ctx.c0 + ctx.b * x
    const y = ctx.law === 'linear' ? clean + rng.normal(0, ctx.noise) : clean * 10 ** rng.normal(0, ctx.noise)
    xs.push(x)
    ys.push(Math.round(y * fy) / fy)
  }
  return { xs, ys, n }
}

/** Correlation of the residuals with (tx − t̄x)² on the scale the model was fitted on: a bow detector. */
function curvature(tx: number[], residuals: number[]): number {
  const m = mean(tx)
  const c = correlation(
    residuals,
    tx.map((v) => (v - m) * (v - m)),
  )
  return Number.isFinite(c) ? c : 0
}

interface Candidate {
  transform: Transform
  label: string
  fit: ReturnType<typeof transformedRegression>
  curv: number
  r2: number
}

function candidates(xs: number[], ys: number[], transforms: Transform[]): Candidate[] {
  const LABELS: Record<Transform, string> = { none: 'raw', logy: 'log y on x', logx: 'y on log x', loglog: 'log y on log x' }
  return transforms.map((transform) => {
    const fit = transformedRegression(xs, ys, transform, { base: 10 })
    return { transform, label: LABELS[transform], fit, curv: curvature(fit.tx, fit.residuals), r2: fit.r2 }
  })
}

/** "bows upward … " — the residual plot the numbers make, described from the computed curvature. */
function describeResiduals(c: Candidate): string {
  if (Math.abs(c.curv) < 0.3) return 'a flat band about zero, no bend and no run of one sign'
  return c.curv > 0
    ? 'a clear bow: residuals negative through the middle of the range and positive at both ends'
    : 'a clear bow: residuals positive through the middle of the range and negative at both ends'
}

/** The model written out in the original variables, with the fitted constants substituted. */
function modelTex(c: Candidate): string {
  const a = fmt(c.fit.fit.intercept, 4).replace('−', '-')
  const b = fmt(c.fit.fit.slope, 4).replace('−', '-')
  switch (c.transform) {
    case 'none':
      return `\\hat{y} = ${a} + ${b}x`
    case 'logy':
      return `\\log_{10}\\hat{y} = ${a} + ${b}x`
    case 'logx':
      return `\\hat{y} = ${a} + ${b}\\log_{10}x`
    case 'loglog':
      return `\\log_{10}\\hat{y} = ${a} + ${b}\\log_{10}x`
  }
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — which transformation straightens it
// ---------------------------------------------------------------------------------------------

const TRIO: Transform[] = ['none', 'logy', 'loglog']

export const chooseTransform = defineGenerator({
  id: 'act-2/choose-transform',
  label: 'Choose the transformation',
  ap_topics: ['2.9'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, [...CURVES, ...LINEARS])
    const want: Transform = ctx.law === 'power' ? 'loglog' : ctx.law === 'exp' ? 'logy' : 'none'
    const drawn = retry(
      rng,
      (r) => {
        const d = drawCurve(r, ctx, r.int(40, 70))
        const cs = candidates(d.xs, d.ys, TRIO)
        return { d, cs }
      },
      ({ cs }) => {
        const good = cs.find((c) => c.transform === want)
        if (!good || Math.abs(good.curv) > 0.3 || good.r2 < 0.9) return false
        return cs.filter((c) => c.transform !== want).every((c) => Math.abs(c.curv) > 0.55)
      },
    )
    const { d, cs } = drawn
    const good = cs.find((c) => c.transform === want)!
    const rows = cs.map((c) => [c.label, fmt(c.r2, 4), describeResiduals(c)])
    const table = tableMd(['fit', 'r²', 'residual plot'], rows)
    const options = cs.map((c) =>
      c.transform === 'none'
        ? 'The raw fit — a straight line in the original variables. No transformation is needed.'
        : c.transform === 'logy'
          ? 'The log y fit — an exponential model, $\\log_{10} y$ against raw $x$.'
          : 'The log–log fit — a power model, $\\log_{10} y$ against $\\log_{10} x$.',
    )
    const shuffledIdx = rng.shuffle(cs.map((_, i) => i))
    const shuffled = shuffledIdx.map((i) => options[i])
    const correct = shuffledIdx.findIndex((i) => cs[i].transform === want)
    const feedback = shuffledIdx.map((i) => (cs[i].transform === want ? null : `Its residual plot still shows ${describeResiduals(cs[i])} — the line is the wrong shape for these data on that scale, whatever its r² says.`))
    const best = cs.reduce((a, b) => (b.r2 > a.r2 ? b : a))
    return {
      prompt: `${ctx.frame.replace('{n}', String(d.n))}\n\nEbele fits three models and prints r² and a description of the residual plot for each:\n\n${table}\n\nWhich model should the report use?`,
      answer: { type: 'choice', options: shuffled, correct, feedback },
      hints: [
        'r² can be high for a model that is the wrong shape — a bowed cloud still rises from left to right. The residual plot is the diagnostic: the model to keep is the one whose residuals have nothing left to say.',
        `Read down the residual-plot column first, and only then across to r². ${best.transform === want ? 'Here the two agree; they do not always.' : `Here the highest r² (${fmt(best.r2, 4)}, the ${best.label} fit) belongs to a model whose residuals still bow.`}`,
      ],
      solution: `**${options[cs.indexOf(good)]}**\n\nFitted on that scale the line is\n\n$$${modelTex(good)}$$\n\nand its residuals scatter without a bend (curvature diagnostic ${fmt(good.curv, 2)}, against ${cs
        .filter((c) => c !== good)
        .map((c) => `${fmt(c.curv, 2)} for the ${c.label} fit`)
        .join(' and ')}). ${best.transform === want ? 'It also carries the highest r² of the three — which is a coincidence worth distrusting, because r² alone would not have decided this.' : `The ${best.label} fit has the higher r² (${fmt(best.r2, 4)}), and it is still the wrong model: a bowed residual plot is the model being wrong in a way no summary number reports.`}`,
      misconception: '"r² is high, so the model is fine." r² measures how much of the variation a line accounts for, not whether a line was the right shape to begin with. Only the residual plot answers that.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — back-transform a prediction
// ---------------------------------------------------------------------------------------------

export const backTransform = defineGenerator({
  id: 'act-2/back-transform',
  label: 'Back-transform a prediction',
  ap_topics: ['2.9'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CURVES)
    const want: Transform = ctx.law === 'power' ? 'loglog' : 'logy'
    const drawn = retry(
      rng,
      (r) => {
        const d = drawCurve(r, ctx, r.int(30, 60))
        const c = candidates(d.xs, d.ys, [want])[0]
        return { d, c, a: round(c.fit.fit.intercept, 4), b: round(c.fit.fit.slope, 4) }
      },
      ({ c, b }) => Math.abs(c.curv) < 0.35 && c.r2 > 0.95 && Math.abs(b) > 0.005,
    )
    const { d, c, a, b } = drawn
    const x0 = round(rng.uniform(ctx.predictAt[0], ctx.predictAt[1]), ctx.round)
    const tx = want === 'loglog' ? Math.log10(x0) : x0
    const logY = a + b * tx
    const value = 10 ** logY
    const sub = want === 'loglog' ? `${fmt(a, 4).replace('−', '-')} + (${fmt(b, 4).replace('−', '-')})\\log_{10}(${fmt(x0, ctx.round)})` : `${fmt(a, 4).replace('−', '-')} + (${fmt(b, 4).replace('−', '-')})(${fmt(x0, ctx.round)})`
    const digits = Math.max(2, ctx.yRound)
    return {
      prompt: `${ctx.frame.replace('{n}', String(d.n))}\n\nThe raw scatter is bowed; ${want === 'loglog' ? 'on log–log axes it straightens' : 'against $\\log_{10} y$ it straightens'}, and the fitted line on that scale is\n\n$$${want === 'loglog' ? `\\log_{10}\\hat{y} = ${fmt(a, 4).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), 4)}\\log_{10}x` : `\\log_{10}\\hat{y} = ${fmt(a, 4).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), 4)}x`}$$\n\nPredict the ${ctx.yVar} at ${ctx.xVar} = ${fmt(x0, ctx.round)} ${ctx.xTick}. Answer in ${ctx.yUnits} — the units the report is written in — to ${digits} decimal places.`,
      answer: numericAnswer(value, 'other', { digits, units: ctx.yShort ?? ctx.yUnits }),
      hints: [
        'The line predicts a **logarithm**. Evaluate it first, then undo the log — a prediction left on the transformed scale is not in the units anybody reads.',
        `$\\log_{10}\\hat{y} = ${sub} = ${fmt(logY, 4)}$.`,
        `Then $\\hat{y} = 10^{${fmt(logY, 4)}}$.`,
      ],
      solution: `$$\\log_{10}\\hat{y} = ${sub} = ${fmt(logY, 4)}$$\n\n$$\\hat{y} = 10^{${fmt(logY, 4)}} = ${fmt(value, digits + 2)}$$\n\nThe predicted ${ctx.yVar} is **${fmt(value, digits)} ${ctx.yUnits}**. The model in the original variables is ${want === 'loglog' ? `$\\hat{y} = 10^{${fmt(a, 4).replace('−', '-')}}\\,x^{${fmt(b, 4).replace('−', '-')}}$ — a power law` : `$\\hat{y} = 10^{${fmt(a, 4).replace('−', '-')}} \\times 10^{${fmt(b, 4).replace('−', '-')}x}$ — an exponential law`}, and r² on the fitted scale is ${fmt(c.r2, 4)}.`,
      misconception: `Reporting ${fmt(logY, 4)} as the answer. That is a log₁₀ of a quantity in ${ctx.yUnits}, not a quantity in ${ctx.yUnits}; the prediction goes back through $10^{(\\cdot)}$ before it is written down.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — the log–log slope is an exponent
// ---------------------------------------------------------------------------------------------

function exponentRubric(ctx: CurveCtx, b: number): InterpretationAnswer {
  const factor = 10 ** b
  return {
    type: 'interpretation',
    required: [
      { label: `Cites the slope (${fmt(b, 3)})`, phrasings: [numberRegex(b, 3, 1), numberRegex(b, 2, 1)], polarity: 'any', feedback: `The fitted log–log slope is ${fmt(b, 3)}.` },
      { label: 'Reads it as an exponent / power law', phrasings: ['exponent', 'power', 'proportional', 'raised'], polarity: 'any', feedback: `On log–log axes the slope is the exponent: predicted ${ctx.yVar} is proportional to ${ctx.xVar} raised to the power ${fmt(b, 3)}.` },
      { label: 'Multiplicative reading (a factor, not an amount added)', phrasings: ['multiply', 'times', 'factor', 'proportional', 'percent'], polarity: 'any', feedback: `Multiplying ${ctx.xVar} by 10 multiplies the predicted ${ctx.yVar} by about ${fmt(factor, 3)}.` },
      contextGroup('Names both variables', [ctx.xVar, ctx.yVar], { minMatches: 2, feedback: `Name both: ${ctx.xVar} and ${ctx.yVar}.` }),
    ],
    exemplar: `The log–log slope is ${fmt(b, 3)}, so the fitted model is a power law: the predicted ${ctx.yVar} is proportional to ${ctx.xVar} raised to the power ${fmt(b, 3)}, and multiplying ${ctx.xVar} by 10 multiplies the predicted ${ctx.yVar} by about ${fmt(factor, 3)}.`,
    minWords: 12,
  }
}

export const loglogExponent = defineGenerator({
  id: 'act-2/loglog-exponent',
  label: 'Interpret a log–log slope',
  ap_topics: ['2.9'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(
      rng,
      CURVES.filter((c) => c.law === 'power'),
    )
    const drawn = retry(
      rng,
      (r) => {
        const d = drawCurve(r, ctx, r.int(30, 60))
        const c = candidates(d.xs, d.ys, ['loglog'])[0]
        return { d, c, b: round(c.fit.fit.slope, 3), a: round(c.fit.fit.intercept, 3) }
      },
      ({ c }) => Math.abs(c.curv) < 0.35 && c.r2 > 0.96,
    )
    const { d, b, a } = drawn
    const tpl = exponentRubric(ctx, b)
    const factor = 10 ** b
    return {
      prompt: `${ctx.frame.replace('{n}', String(d.n))}\n\nThe raw scatter is bowed. On log–log axes it straightens, and the fitted line is\n\n$$\\log_{10}\\hat{y} = ${fmt(a, 3).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), 3)}\\log_{10}x$$\n\nInterpret the **slope** in context, in one sentence. It is not ${ctx.yUnits} per ${ctx.xTick}, and Ferrier will ask you what it is.`,
      answer: tpl,
      hints: [
        'Undo the logs. $\\log_{10} y = a + b\\log_{10} x$ is the same statement as $y = 10^{a}x^{b}$ — so $b$ is an exponent, and the relationship it describes is multiplicative.',
        `A slope on a log–log plot answers "multiply ${ctx.xVar} by how much, and the predicted ${ctx.yVar} is multiplied by what?" Multiplying ${ctx.xVar} by 10 multiplies the prediction by $10^{${fmt(b, 3)}} = ${fmt(factor, 3)}$.`,
      ],
      solution: `${tpl.exemplar}\n\nThe algebra is the whole interpretation: $\\log_{10}\\hat{y} = ${fmt(a, 3).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), 3)}\\log_{10}x$ is $\\hat{y} = ${fmt(10 ** a, 4)}\\,x^{${fmt(b, 3).replace('−', '-')}}$. A log-scale slope is never a rate in the original units; it is the exponent of the law the data obey, which is why a physical constant can fall out of a fitted line.`,
      misconception: `Reading ${fmt(b, 3)} as "${fmt(b, 3)} ${ctx.yUnits} per ${ctx.xTick}". That sentence is about a straight line in the raw variables, and the raw variables are bowed — which is why the transformation was made in the first place.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — when no transformation is needed
// ---------------------------------------------------------------------------------------------

const ALL_FOUR: Transform[] = ['none', 'logy', 'logx', 'loglog']

export const noTransformNeeded = defineGenerator({
  id: 'act-2/no-transform-needed',
  label: 'When no transformation is needed',
  ap_topics: ['2.9'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, LINEARS)
    const drawn = retry(
      rng,
      (r) => {
        const d = drawCurve(r, ctx, r.int(40, 70))
        const cs = candidates(d.xs, d.ys, ALL_FOUR)
        const raw = cs[0]
        const rival = cs.slice(1).reduce((a, b) => (b.r2 > a.r2 ? b : a))
        return { d, cs, raw, rival }
      },
      ({ raw, cs, rival }) => Math.abs(raw.curv) < 0.28 && raw.r2 > 0.92 && Math.abs(rival.curv) > 0.5 && cs.slice(1).every((c) => Math.abs(c.curv) > 0.4 && c.r2 > 0.85),
    )
    const { d, cs, raw, rival } = drawn
    const table = tableMd(
      ['fit', 'r²', 'residual plot'],
      cs.map((c) => [c.label, fmt(c.r2, 4), describeResiduals(c)]),
    )
    const cands = [
      { correct: true, text: `Keep the raw fit. Its residuals are already a flat band, so there is nothing for a transformation to fix — and a model in the original variables is the one the reader can use.`, why: '' },
      { correct: false, text: `Use the ${rival.label} fit: it reaches r² = ${fmt(rival.r2, 4)}, and a log axis is the standard remedy when a response runs over a wide range.`, why: `Its residuals ${describeResiduals(rival)}. A high r² is not a clean bill of health — a bowed residual plot means the straight line is the wrong shape on that scale, whatever share of the variation it accounts for.` },
      { correct: false, text: `Transform whichever way straightens the residual plot the most, then report only the transformed model and the r² it achieves.`, why: 'There is nothing to straighten: the raw residuals are already flat. Transforming a linear relationship makes the model harder to read and the predictions harder to state, for nothing.' },
      { correct: false, text: `None of the four: with four models on the table the relationship is not established, and the report should say so.`, why: 'Fitting several candidate models and comparing their residual plots is exactly how a model is chosen. One of them answers cleanly here.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `${ctx.frame.replace('{n}', String(d.n))}\n\nEbele has reached for a log transform before anybody asked him to. He fits all four and prints them:\n\n${table}\n\nWhat should the report use?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => (c.correct ? null : c.why)) },
      hints: [
        'A transformation is a remedy. Ask first what the disease is: a bow, a fan, a pattern in the residuals of the raw fit. If the raw residuals are flat, there is nothing to remedy.',
        `Read the residual-plot column before the r² column. The raw fit's residuals here are ${describeResiduals(raw)}.`,
      ],
      solution: `**${cands[0].text}**\n\nThe raw fit is $\\hat{y} = ${fmt(raw.fit.fit.intercept, 3).replace('−', '-')} ${raw.fit.fit.slope < 0 ? '-' : '+'} ${fmt(Math.abs(raw.fit.fit.slope), 4)}x$, curvature diagnostic ${fmt(raw.curv, 2)} — a flat band. Every one of the four fits reaches r² above ${fmt(Math.min(...cs.map((c) => c.r2)), 2)}, which is exactly why r² cannot be the thing that decides: the ${rival.label} fit reaches ${fmt(rival.r2, 4)} and its residuals still bow (${fmt(rival.curv, 2)}). The transformation has bent a straight relationship, not straightened a bent one.\n\nThe residual plot decides. A transformation is a remedy, and there is no disease here.`,
      misconception: 'Transforming by reflex. A log axis applied to an already-linear relationship costs interpretability — the slope stops being a rate in the units of the problem — and buys nothing.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what a log-y slope means
// ---------------------------------------------------------------------------------------------

export const logSlopeUnits = defineGenerator({
  id: 'act-2/log-slope-units',
  label: 'What a log-model slope means',
  ap_topics: ['2.9'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(
      rng,
      CURVES.filter((c) => c.law === 'exp'),
    )
    const drawn = retry(
      rng,
      (r) => {
        const d = drawCurve(r, ctx, r.int(30, 60))
        const c = candidates(d.xs, d.ys, ['logy'])[0]
        return { d, c, a: round(c.fit.fit.intercept, 4), b: round(c.fit.fit.slope, 4) }
      },
      ({ c, b }) => Math.abs(c.curv) < 0.35 && c.r2 > 0.96 && Math.abs(b) > 0.005,
    )
    const { d, a, b } = drawn
    const per = 10 ** b
    const pct = 100 * (per - 1)
    const cands = [
      { correct: true, text: `Each additional ${ctx.xTick} of ${ctx.xVar} multiplies the predicted ${ctx.yVar} by about ${fmt(per, 4)} — a ${fmt(Math.abs(pct), 1)} % ${pct < 0 ? 'fall' : 'rise'}, not a fixed number of ${ctx.yUnits}.`, why: '' },
      { correct: false, text: `Each additional ${ctx.xTick} of ${ctx.xVar} changes the predicted ${ctx.yVar} by ${fmt(b, 4)} ${ctx.yUnits}.`, why: `That reads a log-scale slope in raw units. The response fitted here is $\\log_{10}$ of the ${ctx.yVar}, so ${fmt(b, 4)} is a change in the logarithm — worth a factor of $10^{${fmt(b, 4)}} = ${fmt(per, 4)}$ per ${ctx.xTick}.` },
      { correct: false, text: `Each additional ${ctx.xTick} of ${ctx.xVar} changes the predicted ${ctx.yVar} by ${fmt(b, 4)} %.`, why: `Close in spirit and wrong in arithmetic: the per-unit factor is $10^{${fmt(b, 4)}} = ${fmt(per, 4)}$, a change of about ${fmt(pct, 1)} %, not ${fmt(b, 4)} %.` },
      { correct: false, text: `${fmt(b, 4)} is the correlation between ${ctx.xVar} and $\\log_{10}$ ${ctx.yVar}.`, why: 'That is r, a unitless measure of strength bounded by ±1. A slope is a rate on whatever scale it was fitted; the two are different quantities.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `${ctx.frame.replace('{n}', String(d.n))}\n\nThe raw scatter is bowed; against $\\log_{10} y$ it straightens. The fitted line is\n\n$$\\log_{10}\\hat{y} = ${fmt(a, 4).replace('−', '-')} ${b < 0 ? '-' : '+'} ${fmt(Math.abs(b), 4)}x$$\n\nWhat does the slope ${fmt(b, 4)} mean?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => (c.correct ? null : c.why)) },
      hints: [
        `The response in that equation is not the ${ctx.yVar} the report is about — it is the logarithm of it. Undo the log before reading the slope: $\\log_{10}\\hat{y} = a + bx$ is $\\hat{y} = 10^{a}\\times(10^{b})^{x}$.`,
        `So one more ${ctx.xTick} multiplies the prediction by $10^{${fmt(b, 4)}}$. Work that factor out.`,
      ],
      solution: `**${cands[0].text}**\n\n$$\\hat{y} = 10^{${fmt(a, 4).replace('−', '-')}}\\times\\left(10^{${fmt(b, 4).replace('−', '-')}}\\right)^{x} = ${fmt(10 ** a, 4)}\\times ${fmt(per, 4)}^{\\,x}$$\n\nAn exponential model changes the response by a constant **factor** per unit of $x$, never by a constant amount. That is the whole reason the raw plot bowed.`,
      misconception: 'Interpreting a log-model slope in the original units. It is a change in the logarithm; the sentence a reader can use needs the factor $10^{b}$ (or the percentage change it implies).',
    }
  },
})
