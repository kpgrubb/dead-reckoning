/**
 * act-7-04 · Before and After — drills. AP 7.2, 7.4, 7.5 on paired data: recognising the structure,
 * running the differences as one sample, interpreting the interval and the conclusion, checking the
 * conditions on the right display, and pricing what pairing buys.
 *
 *   act-7/paired-or-two-sample   choice   paired or two independent samples, from the design
 *   act-7/paired-t               numeric  d̄, t or p from a paired t-test
 *   act-7/paired-interval        interp   `confidenceIntervalInterpretation` on a mean difference
 *   act-7/paired-conclusion      interp   `significanceTestConclusion` on a mean difference
 *   act-7/paired-conditions      interp   `conditionsCheck`, paired-t, normality on the DIFFERENCES
 *   act-7/pairing-gains-power    choice   the ratio of the two standard errors, and its price
 *
 * `act-7/paired-or-two-sample` is checkpoint q6 and `act-7/paired-t` is q7, so each stands alone in
 * its prompt.
 *
 * The Refit set's twelve hulls and Nightjar's eight cold profiles belong to act-7-04's mission
 * beats. Every framing here is another yard, another bay, another lane office, and `reservedCount`
 * / `reservedStat` keep a draw from printing one of the Act's own numbers back at the learner.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { conditionsCheck, confidenceIntervalInterpretation, significanceTestConclusion } from '@/lib/problems/rubrics'
import { mean, outliers, pairedDifferences, pairedTInterval, pairedTTest, sd, skewness, twoMeanTest } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'
import { ALPHAS, LEVELS, PAIRED_CONTEXTS, TWO_SAMPLE_CONTEXTS, reservedCount, reservedStat, shuffleChoice, smallN, type Candidate, type PairedContext } from './contexts'

/**
 * A plausible level for each paired measurement, so a drawn column reads like a log entry rather
 * than a deviation from nothing. `contexts.ts` carries the shift and the spread; the base is local
 * to this file because only these drills print raw columns.
 */
const PAIRED_BASE: Record<string, number> = {
  'time to the outer mark': 61,
  'hours to first over-temperature alarm': 42,
  'minutes spent filing a departure plot': 34,
  'minutes to secure a hull': 18,
  'pointing error': 12,
}

export interface PairedDraw {
  ctx: PairedContext
  n: number
  before: number[]
  after: number[]
  differences: number[]
  /** Label for each pair, e.g. "hull 3". */
  names: string[]
}

interface DrawOptions {
  nLo?: number
  nHi?: number
  /** Multiplier on the context's nominal shift; 0 draws a design that did nothing. */
  shiftScale?: [number, number]
}

/**
 * A paired draw: every unit carries a standing offset of its own that appears in both columns, plus
 * independent run-to-run noise, plus the intervention's shift on the second measurement. That is
 * the structure the whole module is about, and it is what makes the differences quiet.
 */
function drawPaired(rng: Rng, ctx: PairedContext, opts: DrawOptions = {}): PairedDraw {
  const { nLo = 7, nHi = 16, shiftScale = [0.85, 1.4] } = opts
  const base = PAIRED_BASE[ctx.measure] ?? 20
  const unit = ctx.unit.replace(/s$/, '')
  return retry(
    rng,
    (r) => {
      const n = smallN(r, nLo, nHi)
      const offsetSd = ctx.spread * r.uniform(0.9, 2.0)
      const within = ctx.spread * r.uniform(0.28, 0.5)
      const shift = ctx.shift * r.uniform(shiftScale[0], shiftScale[1])
      const q = 10 ** ctx.digits
      const round = (v: number) => Math.round(v * q) / q
      const before: number[] = []
      const after: number[] = []
      for (let i = 0; i < n; i++) {
        const offset = r.normal(0, offsetSd)
        before.push(round(base + offset + r.normal(0, within)))
        after.push(round(base + offset + shift + r.normal(0, within)))
      }
      return { ctx, n, before, after, differences: pairedDifferences(after, before), names: Array.from({ length: n }, (_, i) => `${unit} ${i + 1}`) }
    },
    (d) => {
      const s = sd(d.differences)
      if (!(s > 0) || outliers(d.differences).values.length > 0 || Math.abs(skewness(d.differences)) > 1.1) return false
      if (d.before.some((v) => v <= 0) || d.after.some((v) => v <= 0)) return false
      if (new Set(d.differences).size < d.n) return false
      return !reservedStat(Math.abs(mean(d.differences))) && !reservedCount(d.n)
    },
  )
}

/** The table a paired prompt hands over: one row per unit, both columns, and the difference. */
function pairedTable(d: PairedDraw, withDifference = true): string {
  const cols = withDifference ? [d.ctx.unit.replace(/s$/, ''), d.ctx.beforeLabel, d.ctx.afterLabel, 'difference'] : [d.ctx.unit.replace(/s$/, ''), d.ctx.beforeLabel, d.ctx.afterLabel]
  const rows = d.names.map((name, i) => (withDifference ? [name, fmt(d.before[i], d.ctx.digits), fmt(d.after[i], d.ctx.digits), fmt(d.differences[i], d.ctx.digits)] : [name, fmt(d.before[i], d.ctx.digits), fmt(d.after[i], d.ctx.digits)]))
  return tableMd(cols, rows)
}

/** "in time to the outer mark" — the variable a difference-parameter sentence names. */
function differenceVariable(ctx: PairedContext): string {
  return `in ${ctx.measure}`
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — paired, or two independent samples? (checkpoint q6)
// ---------------------------------------------------------------------------------------------

export const pairedOrTwoSample = defineGenerator({
  id: 'act-7/paired-or-two-sample',
  label: 'Paired data or two independent samples?',
  ap_topics: ['7.4', '7.6'],
  skills: ['1'],
  generate(rng) {
    const isPaired = rng.bool()

    let design: string
    let unit: string
    let correctText: string
    if (isPaired) {
      const ctx = pickContext(rng, PAIRED_CONTEXTS)
      const n = smallN(rng, 8, 20)
      unit = ctx.unit
      design = `${ctx.office} logged **${ctx.measure}** for **${fmtInt(n)} ${ctx.unit}** ${ctx.beforeLabel}, put every one of those ${ctx.unit} through ${ctx.intervention}, and logged ${ctx.measure} again for the same ${fmtInt(n)} ${ctx.unit} ${ctx.afterLabel}. The file has ${fmtInt(n)} rows and two columns of numbers.`
      correctText = `A **paired** $t$ procedure on the ${fmtInt(n)} differences, because the two columns are the same ${ctx.unit} measured twice and every value in one column has exactly one partner in the other.`
    } else {
      const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
      const n1 = smallN(rng, 9, 22)
      const n2 = retry(rng, (r) => smallN(r, 9, 22), (v) => v !== n1)
      unit = ctx.unit
      design = `${ctx.office} logged **${ctx.measure}** for **${fmtInt(n1)} ${ctx.groupA}** and, separately, for **${fmtInt(n2)} ${ctx.groupB}**. No ${ctx.unit.replace(/s$/, '')} appears in both lists and the two counts are not even the same.`
      correctText = `A **two-sample** $t$ procedure, because the two groups contain different ${ctx.unit} and there is no way to match one with another.`
    }

    const cands: Candidate[] = [
      {
        text: correctText,
        correct: true,
        why: null,
      },
      {
        text: isPaired
          ? `A **two-sample** $t$ procedure, because the two groups contain different ${unit} and there is no way to match one with another.`
          : `A **paired** $t$ procedure on the differences, because the two columns are the same ${unit} measured twice and every value in one column has exactly one partner in the other.`,
        correct: false,
        why: isPaired
          ? `The same ${unit} appear in both columns. Throwing the pairing away leaves each unit's standing offset in the spread of both groups, and that offset lands in the standard error of the difference, where it buries the effect the study was run to measure.`
          : `Nothing here can be paired. Pairing means a rule that matches one observation to exactly one other before any data is collected, and these two lists have different ${unit} in them and different lengths.`,
      },
      {
        text: `A **two-sample** $t$ procedure, because there are two columns of numbers and therefore two means to compare.`,
        correct: false,
        why: 'Two columns of numbers is true of every paired file ever written down. What decides the procedure is whether the two values in a row came from the same unit, not how the file is laid out.',
      },
      {
        text: `A **paired** $t$ procedure, because both columns hold the same number of values.`,
        correct: false,
        why: 'Equal counts are a symptom of pairing, never a reason for it. Two independent samples of the same size are still two independent samples, and a rule that matches row 3 to row 3 because they are both row 3 matches nothing at all.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${design}\n\nWhich inference procedure does this **design** call for, and why?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'The question is about the design, not about the numbers. Ask one thing: does each value in the first column belong to the same unit as exactly one value in the second?',
        'If yes, the unit is the pair and the data are one sample of differences. If no, the two groups are independent and each keeps its own mean, its own standard deviation and its own count.',
      ],
      solution: `${isPaired ? `The same ${unit} were measured twice, once before and once after, so each row is one unit and the two numbers in it are not independent of each other.` : `The two lists hold different ${unit} and there is no rule matching one to another, so the two groups are independent.`}\n\n**${options[correct]}**\n\nThe structure of the data decides the procedure, and it is settled by the design before a single number is read. A paired file collapses to one column of differences and is analysed as a one-sample $t$ problem on $n - 1$ degrees of freedom. Two independent samples keep both columns, and their standard error is $\\sqrt{s_1^2/n_1 + s_2^2/n_2}$.`,
      misconception: 'Deciding from the shape of the spreadsheet. Two columns, or two equal counts, tell you nothing. What matters is whether a row is one unit measured twice.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the paired test itself (checkpoint q7)
// ---------------------------------------------------------------------------------------------

type Asked = 'dbar' | 't' | 'p'

export const pairedT = defineGenerator({
  id: 'act-7/paired-t',
  label: 'Paired t-test: mean difference, t, or p',
  ap_topics: ['7.4', '7.5'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRED_CONTEXTS)
    const asked = pickContext(rng, ['dbar', 't', 'p', 't'] as const) as Asked
    const direction = ctx.shift > 0 ? 'greater' : 'less'

    const d = retry(
      rng,
      (r) => drawPaired(r, ctx),
      (draw) => {
        const t = pairedTTest(draw.after, draw.before, { alt: direction, random: true })
        return Math.abs(t.statistic) > 2.4 && !reservedStat(Math.abs(t.statistic)) && t.pValue! > 1e-6
      },
    )

    const test = pairedTTest(d.after, d.before, { alt: direction, random: true })
    const dbar = test.estimate
    const sD = sd(d.differences)
    const se = test.se
    const dirWord = direction === 'greater' ? 'larger' : 'smaller'

    const target = asked === 'dbar' ? dbar : asked === 't' ? test.statistic : test.pValue!
    const kind = asked === 'dbar' ? 'mean' : asked === 't' ? 'testStat' : 'pValue'
    const askText =
      asked === 'dbar'
        ? `the **mean difference** $\\bar{d}$, in ${ctx.units}, to **${ctx.digits} decimal place${ctx.digits === 1 ? '' : 's'}**`
        : asked === 't'
          ? 'the **test statistic** $t$, to **two decimal places**'
          : 'the **P-value**, to **four decimal places**'

    return {
      prompt: `${ctx.office} put **${fmtInt(d.n)} ${ctx.unit}** through ${ctx.intervention} and logged ${ctx.measure} for each one ${ctx.beforeLabel} and again ${ctx.afterLabel}. The ${ctx.unit} were a random sample of those the office services, and a dotplot of the differences is roughly symmetric with nothing stranded.\n\n${pairedTable(d, false)}\n\nThe office wants to know whether ${ctx.measure} is ${dirWord} ${ctx.afterLabel}. Test $H_0: \\mu_d = 0$ against $H_a: \\mu_d ${direction === 'greater' ? '>' : '<'} 0$, where $\\mu_d$ is the ${ctx.parameter} (${ctx.afterLabel} minus ${ctx.beforeLabel}) for all ${ctx.population}.\n\nReport ${askText}.`,
      answer: numericAnswer(target, kind, asked === 'dbar' ? { digits: ctx.digits, units: ctx.units } : {}),
      hints: [
        'Subtract first, once per row, and then forget the two columns entirely. What is left is a single sample of differences and a one-sample $t$ procedure on it.',
        `With $n = ${fmtInt(d.n)}$ differences, $\\bar{d} = ${fmt(dbar, ctx.digits + 1)}$ and $s_d = ${fmt(sD, ctx.digits + 1)}$, the standard error is $s_d/\\sqrt{n}$ and the degrees of freedom are $n - 1 = ${fmtInt(d.n - 1)}$.`,
        asked === 'p'
          ? `$t = ${fmt(test.statistic, 3)}$ on ${fmtInt(d.n - 1)} degrees of freedom, and the alternative is one-sided, so the P-value is the area in a single tail.`
          : `$t = \\bar{d} \\div (s_d/\\sqrt{n})$, with the numbers above.`,
      ],
      solution: `Take the ${fmtInt(d.n)} differences (${ctx.afterLabel} minus ${ctx.beforeLabel}):\n\n${tableMd([ctx.unit.replace(/s$/, ''), 'difference'], d.names.map((nm, i) => [nm, fmt(d.differences[i], ctx.digits)]))}\n\n$$\\bar{d} = ${fmt(dbar, ctx.digits + 2)} \\text{ ${ctx.units}}, \\qquad s_d = ${fmt(sD, ctx.digits + 2)}, \\qquad SE = \\frac{s_d}{\\sqrt{n}} = \\frac{${fmt(sD, ctx.digits + 2)}}{\\sqrt{${fmtInt(d.n)}}} = ${fmt(se, ctx.digits + 3)}$$\n\n$$t = \\frac{\\bar{d} - 0}{SE} = \\frac{${fmt(dbar, ctx.digits + 2)}}{${fmt(se, ctx.digits + 3)}} = ${fmt(test.statistic, 3)}, \\qquad df = n - 1 = ${fmtInt(d.n - 1)}, \\qquad P = ${fmtP(test.pValue!)}$$\n\nThe answer asked for is **${asked === 'p' ? fmtP(test.pValue!) : fmt(target, asked === 'dbar' ? ctx.digits : 2)}**${asked === 'dbar' ? ` ${ctx.units}` : ''}.\n\nThe degrees of freedom are ${fmtInt(d.n - 1)}, one less than the number of **pairs**. There are ${fmtInt(2 * d.n)} numbers in the table and not one of them is an independent observation of $\\mu_d$; the ${fmtInt(d.n)} differences are.`,
      misconception: `Running a two-sample procedure on the two columns, or using $df = ${fmtInt(2 * d.n - 2)}$. The same ${ctx.unit} appear twice, so the pairs are the units: one sample of ${fmtInt(d.n)} differences on ${fmtInt(d.n - 1)} degrees of freedom.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — the interval for a mean difference
// ---------------------------------------------------------------------------------------------

export const pairedInterval = defineGenerator({
  id: 'act-7/paired-interval',
  label: 'Interpret an interval for a mean difference',
  ap_topics: ['7.4'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRED_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const floor = 0.5 * 10 ** -ctx.digits

    const d = retry(
      rng,
      (r) => drawPaired(r, ctx),
      (draw) => {
        const ci = pairedTInterval(draw.after, draw.before, { confidence: level, random: true }).ci as [number, number]
        return Math.abs(ci[0]) > 8 * floor && Math.abs(ci[1]) > 8 * floor && Math.abs(ci[0] - ci[1]) > 4 * floor
      },
    )

    const interval = pairedTInterval(d.after, d.before, { confidence: level, random: true })
    const [lo, hi] = interval.ci as [number, number]
    const answer = confidenceIntervalInterpretation({
      level,
      parameter: 'mean difference',
      lower: lo,
      upper: hi,
      context: { population: ctx.population, variable: differenceVariable(ctx), units: ctx.units },
      digits: ctx.digits,
    })

    return {
      prompt: `${ctx.office} measured ${ctx.measure} for **${fmtInt(d.n)} ${ctx.unit}** ${ctx.beforeLabel} and again ${ctx.afterLabel}, checked its conditions on the differences, and built the **${fmtPct(level, 0)}** $t$-interval for $\\mu_d$, the ${ctx.parameter} (${ctx.afterLabel} minus ${ctx.beforeLabel}):\n\n$$(${fmt(lo, ctx.digits)},\\ ${fmt(hi, ctx.digits)}) \\text{ ${ctx.units}}$$\n\nWrite the one sentence that goes in the office's report. Interpret the **interval**, in context.`,
      answer,
      hints: [
        'A complete interval interpretation carries four things: the level, the word *confident*, the **true** parameter named in context, and both endpoints.',
        `Here the parameter is the true mean **difference** ${differenceVariable(ctx)} for all ${ctx.population}, and the endpoints are ${fmt(lo, ctx.digits)} and ${fmt(hi, ctx.digits)} ${ctx.units}.`,
        'Then check what you have not written: no probability, no claim about any individual unit, and no sentence about the sample mean difference, which is known exactly and needs no interval.',
      ],
      solution: `**${answer.exemplar}**\n\nThe parameter is a mean *difference*, so the sentence has to say difference somewhere. "We are ${fmtPct(level, 0)}% confident that ${ctx.measure} is between ${fmt(lo, ctx.digits)} and ${fmt(hi, ctx.digits)}" is a sentence about a measurement, not about a change in one, and it is wrong by a whole variable.\n\n${lo * hi > 0 ? `Both endpoints lie on the same side of zero, so every value this interval is consistent with is a real change in the same direction.` : `The interval runs from ${fmt(lo, ctx.digits)} to ${fmt(hi, ctx.digits)} and contains zero, so "no change at all" is among the values these data cannot rule out. That is a statement about what has not been pinned down, and it is not a finding that the intervention did nothing.`}`,
      misconception: `Interpreting the sample mean difference instead of the parameter, or dropping the word *difference* and interpreting ${ctx.measure} itself. The sample mean difference is ${fmt(interval.estimate, ctx.digits + 1)} ${ctx.units} and is known exactly; the unknown is the true mean difference for all ${ctx.population}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — the conclusion in context
// ---------------------------------------------------------------------------------------------

export const pairedConclusion = defineGenerator({
  id: 'act-7/paired-conclusion',
  label: 'Conclusion in context for a paired t-test',
  ap_topics: ['7.5'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRED_CONTEXTS)
    const alpha = pickContext(rng, ALPHAS)
    const direction = ctx.shift > 0 ? 'greater' : 'less'
    const wantReject = rng.bool(0.6)

    const d = retry(
      rng,
      (r) => drawPaired(r, ctx, wantReject ? {} : { shiftScale: [0, 0.25] }),
      (draw) => {
        const p = pairedTTest(draw.after, draw.before, { alt: direction, random: true }).pValue!
        return wantReject ? p < alpha / 3 : p > alpha * 3
      },
    )

    const test = pairedTTest(d.after, d.before, { alt: direction, random: true })
    const answer = significanceTestConclusion({
      pValue: test.pValue!,
      alpha,
      direction,
      parameterContext: {
        parameter: 'mean difference',
        population: ctx.population,
        variable: differenceVariable(ctx),
        units: ctx.units,
        nullValue: 0,
      },
      directionWords: direction === 'greater' ? ['longer', 'increase', 'rise'] : ['shorter', 'decrease', 'fall'],
    })

    return {
      prompt: `${ctx.office} ran ${ctx.intervention} on **${fmtInt(d.n)} ${ctx.unit}** drawn at random from ${ctx.population}, logged ${ctx.measure} ${ctx.beforeLabel} and ${ctx.afterLabel}, and tested $H_0: \\mu_d = 0$ against $H_a: \\mu_d ${direction === 'greater' ? '>' : '<'} 0$ at $\\alpha = ${fmt(alpha, 2)}$. The conditions hold on the differences.\n\n$$\\bar{d} = ${fmt(test.estimate, ctx.digits + 1)} \\text{ ${ctx.units}}, \\qquad t = ${fmt(test.statistic, 3)}, \\qquad df = ${fmtInt(d.n - 1)}, \\qquad P = ${fmtP(test.pValue!)}$$\n\nWrite the **conclusion in context**.`,
      answer,
      hints: [
        'Four moves, in order: compare the P-value with α, state the decision about H₀, frame it as evidence rather than fact, and say what the evidence is about — the parameter, the population and the variable.',
        `$P = ${fmtP(test.pValue!)}$ and $\\alpha = ${fmt(alpha, 2)}$, so the decision is to ${test.pValue! < alpha ? 'reject' : 'fail to reject'} $H_0$. The parameter is the true mean difference ${differenceVariable(ctx)} for all ${ctx.population}.`,
        `Then read it back for two words that fail the item outright: *proves*, and *accept* $H_0$. ${test.pValue! < alpha ? 'A small P-value is evidence against the null, not a proof of the alternative.' : 'Failing to reject is not evidence that the true mean difference is zero; it is a failure to rule zero out.'}`,
      ],
      solution: `**${answer.exemplar}**\n\n$P = ${fmtP(test.pValue!)}$ against $\\alpha = ${fmt(alpha, 2)}$, so the decision is ${test.pValue! < alpha ? `to reject $H_0$: a mean difference this far from zero, in ${fmtInt(d.n)} pairs, is rare when the intervention changes nothing` : `to fail to reject $H_0$: a sample this size would produce a mean difference of ${fmt(test.estimate, ctx.digits + 1)} ${ctx.units} often enough, with no real change at all`}.\n\nThe conclusion is about $\\mu_d$, the mean difference for the whole of ${ctx.population}, not about the ${fmtInt(d.n)} ${ctx.unit} in the file. Those ${fmtInt(d.n)} are measured; their mean difference is ${fmt(test.estimate, ctx.digits + 1)} ${ctx.units} and no inference is required to know it.`,
      misconception: test.pValue! < alpha ? 'Writing the conclusion about the sample, or saying the test "proves" the intervention worked. A test supplies evidence about a parameter and never proof of anything.' : 'Reading "fail to reject" as "there is no difference". The test did not find one; that is a different claim from there not being one, and with this sample size the interval would show how much room is left.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Interpretation — conditions, checked on the differences
// ---------------------------------------------------------------------------------------------

export const pairedConditions = defineGenerator({
  id: 'act-7/paired-conditions',
  label: 'Conditions for a paired t procedure',
  ap_topics: ['7.4', '7.5'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRED_CONTEXTS)
    const d = drawPaired(rng, ctx)
    const population = retry(rng, (r) => d.n * r.int(30, 90), (v) => !reservedCount(v))

    const answer = conditionsCheck({
      procedure: 'paired-t',
      random: 'sample',
      n: d.n,
      populationSize: population,
      normal: 'graph',
      context: ctx.population,
    })

    return {
      prompt: `${ctx.office} holds **${fmtInt(population)} ${ctx.unit}** on its books. It drew **${fmtInt(d.n)}** of them at random, logged ${ctx.measure} ${ctx.beforeLabel} and ${ctx.afterLabel}, and now wants a $t$-interval for the ${ctx.parameter}.\n\nThe **${fmtInt(d.n)} differences** (${ctx.afterLabel} minus ${ctx.beforeLabel}), in ${ctx.units}: ${d.differences.map((v) => fmt(v, ctx.digits)).join(', ')}. Their dotplot is roughly symmetric, with no value stranded away from the rest.\n\nState the **conditions** for this procedure and check each one with the numbers in front of you.`,
      answer,
      hints: [
        'Three conditions, and the third is the one this module turns on. Random, Independent, Normal.',
        `Independence here is the 10% condition: $10 \\times ${fmtInt(d.n)} = ${fmtInt(10 * d.n)}$ against a register of ${fmtInt(population)}.`,
        `The Normal condition is about the sampling distribution of $\\bar{d}$, so it is checked on the **${fmtInt(d.n)} differences** and on nothing else. The two raw columns may be as spread out and as skewed as they like.`,
      ],
      solution: `**${answer.exemplar}**\n\nThe move that costs marks is checking normality on the wrong display. Each ${ctx.unit.replace(/s$/, '')} carries a standing level of its own, so the ${ctx.beforeLabel} column and the ${ctx.afterLabel} column are both spread by it and either of them may look skewed. Subtracting removes that level. The ${fmtInt(d.n)} differences are the sample the procedure runs on, and they are the display the Normal condition is about.\n\nWith $n = ${fmtInt(d.n)}$ there is no Central Limit Theorem to lean on, so the graph has to be drawn and described: symmetric enough, and no outliers.`,
      misconception: `Checking the normal condition on the ${ctx.beforeLabel} and ${ctx.afterLabel} columns separately. A paired procedure has one sample — the differences — and one graph to look at.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — what pairing buys, and what it costs
// ---------------------------------------------------------------------------------------------

export const pairingGainsPower = defineGenerator({
  id: 'act-7/pairing-gains-power',
  label: 'What pairing buys, and when it buys nothing',
  ap_topics: ['7.4', '7.6'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, PAIRED_CONTEXTS)
    const d = retry(
      rng,
      (r) => drawPaired(r, ctx),
      (draw) => {
        const p = pairedTTest(draw.after, draw.before, { alt: 'two-sided', random: true })
        const t = twoMeanTest(draw.after, draw.before, { alt: 'two-sided', random: true })
        return t.se / p.se > 1.6
      },
    )

    const paired = pairedTTest(d.after, d.before, { alt: 'two-sided', random: true })
    const two = twoMeanTest(d.after, d.before, { alt: 'two-sided', random: true })
    const ratio = two.se / paired.se
    const pairedDf = d.n - 1
    /** The same rows matched at random: the pairing destroyed, every other number untouched. */
    const brokenRatio = retry(
      rng,
      (r) => {
        const shuffled = r.shuffle(d.before)
        return twoMeanTest(d.after, shuffled, { alt: 'two-sided', random: true }).se / pairedTTest(d.after, shuffled, { alt: 'two-sided', random: true }).se
      },
      (v) => v < 1.35,
    )

    const cands: Candidate[] = [
      {
        text: `Pairing cut the standard error from ${fmt(two.se, 4)} to ${fmt(paired.se, 4)}, a factor of about ${fmt(ratio, 2)}, because each ${ctx.unit.replace(/s$/, '')} carries a standing level of its own that sits in both columns and cancels in the difference. The price is degrees of freedom: ${fmtInt(pairedDf)} rather than about ${fmtInt(2 * d.n - 2)}.`,
        correct: true,
        why: null,
      },
      {
        text: `Pairing halves the standard error of any comparison, because the difference is built from two measurements of each ${ctx.unit.replace(/s$/, '')} instead of one.`,
        correct: false,
        why: `There is no fixed factor. What pairing removes is the shared unit-to-unit variation, so the gain is whatever share of the spread that variation happens to be. On these data the factor is ${fmt(ratio, 2)}; re-match the same ${fmtInt(d.n)} rows at random and it falls to about ${fmt(brokenRatio, 2)}.`,
      },
      {
        text: `Pairing helps whatever the data look like, because a design that measures each ${ctx.unit.replace(/s$/, '')} twice always carries more information than one that measures two groups once.`,
        correct: false,
        why: `Match the rows at random — same numbers, pairing destroyed — and the two standard errors come out about ${fmt(brokenRatio, 2)} apart, near enough the same. The paired reading then has ${fmtInt(pairedDf)} degrees of freedom where the two-sample reading has roughly ${fmtInt(2 * d.n - 2)}, so it has spent something and bought nothing.`,
      },
      {
        text: `The paired and two-sample readings estimate different parameters, which is why their standard errors differ: $\\mu_d$ is a mean of differences and $\\mu_1 - \\mu_2$ is a difference of means.`,
        correct: false,
        why: `A mean of differences and a difference of means are the same number, and these two readings agree on it exactly: both give ${fmt(paired.estimate, ctx.digits + 2)} ${ctx.units}. The estimate is identical. What differs is the uncertainty attached to it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} has ${ctx.measure} for **${fmtInt(d.n)} ${ctx.unit}**, ${ctx.beforeLabel} and ${ctx.afterLabel}. Read as **paired**, the standard error of the estimate is ${fmt(paired.se, 4)} ${ctx.units} on ${fmtInt(pairedDf)} degrees of freedom. Read as **two independent samples**, those same ${fmtInt(2 * d.n)} numbers give a standard error of ${fmt(two.se, 4)} on ${fmt(two.df ?? 0, 2)}. The point estimate is ${fmt(paired.estimate, ctx.digits + 2)} either way.\n\nWhich statement explains that gap correctly?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Write the two standard errors out as formulas and ask what is in one and not the other. The paired SE is built from the spread of the **differences**; the two-sample SE is built from the spread of each **column**.',
        `Here $s_d = ${fmt(sd(d.differences), 3)} \\text{ ${ctx.units}}$ while the two columns have standard deviations ${fmt(sd(d.before), 3)} and ${fmt(sd(d.after), 3)}. Something large is in both columns and not in the differences.`,
      ],
      solution: `$$SE_{\\text{paired}} = \\frac{s_d}{\\sqrt{n}} = \\frac{${fmt(sd(d.differences), 4)}}{\\sqrt{${fmtInt(d.n)}}} = ${fmt(paired.se, 4)} \\qquad SE_{\\text{two-sample}} = \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}} = ${fmt(two.se, 4)}$$\n\n**${options[correct]}**\n\nThe ${ctx.beforeLabel} and ${ctx.afterLabel} columns each have a standard deviation near ${fmt((sd(d.before) + sd(d.after)) / 2, 3)} ${ctx.units}, and the differences have ${fmt(sd(d.differences), 3)}. The gap is the unit-to-unit variation, which appears in both columns and disappears when one is subtracted from the other.\n\nPairing is not free. Re-match the same rows at random and the advantage falls to a factor of about ${fmt(brokenRatio, 2)}, while the paired reading still runs on ${fmtInt(pairedDf)} degrees of freedom instead of about ${fmtInt(2 * d.n - 2)}. A pairing that matches nothing real costs precision and returns none.`,
      misconception: 'Believing pairing is always the stronger design. It is stronger exactly to the extent that the paired units resemble each other, and a pairing with no real matching in it spends degrees of freedom for nothing.',
    }
  },
})
