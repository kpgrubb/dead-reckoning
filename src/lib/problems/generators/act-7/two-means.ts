/**
 * act-7-05 · Two Fleets, Two Means — drills. AP 7.6, 7.7: the two-sample t-interval for μ₁ − μ₂,
 * its conditions, the two degrees-of-freedom rules, and what an interval does and does not license.
 *
 *   act-7/two-mean-interval                  numeric  an endpoint of (x̄₁ − x̄₂) ± t*·SE
 *   act-7/difference-interval-interpretation interp   the interval in context, zero inside or out
 *   act-7/two-sample-conditions              choice   which condition fails, with the numbers
 *   act-7/df-choice                          choice   Welch against the conservative rule
 *   act-7/difference-claim                   choice   which claim about μ₁ − μ₂ the interval carries
 *   act-7/conditions-dotplots                display  two small samples, one judgement
 *
 * `act-7/difference-interval-interpretation` is checkpoint q8 and `act-7/conditions-dotplots` is
 * q11 — the checkpoint's DISP item — so each stands alone in its prompt.
 *
 * The Ledger's 881 / 1,712 / 19 transits belong to act-7-05's mission beats. Every framing here is
 * another office, and `reservedCount` / `reservedStat` keep a draw off the Act's own numbers.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { confidenceIntervalInterpretation } from '@/lib/problems/rubrics'
import { conservativeDf, mean, outliers, sd, skewness, tStar, twoMeanInterval, welchDf } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { LEVELS, TWO_SAMPLE_CONTEXTS, reservedCount, reservedStat, shuffleChoice, smallN, type Candidate, type TwoSampleContext } from './contexts'

export interface TwoGroupDraw {
  ctx: TwoSampleContext
  n1: number
  n2: number
  a: number[]
  b: number[]
}

interface TwoGroupOptions {
  nLo?: number
  nHi?: number
  /** The true gap between the group means, as a multiple of the context's spread. */
  gap?: [number, number]
  /** Let the two groups have visibly different spreads (the reason nothing is ever pooled). */
  unequalSpread?: boolean
}

function drawTwoGroups(rng: Rng, ctx: TwoSampleContext, opts: TwoGroupOptions = {}): TwoGroupDraw {
  const { nLo = 9, nHi = 26, gap = [0.2, 1.1], unequalSpread = true } = opts
  const q = 10 ** ctx.digits
  const round = (v: number) => Math.round(v * q) / q
  return retry(
    rng,
    (r) => {
      const n1 = smallN(r, nLo, nHi)
      const n2 = smallN(r, nLo, nHi)
      const s1 = ctx.spread * (unequalSpread ? r.uniform(0.7, 1.05) : 1)
      const s2 = ctx.spread * (unequalSpread ? r.uniform(0.95, 1.5) : 1)
      const shift = ctx.spread * r.uniform(gap[0], gap[1]) * (r.bool() ? 1 : -1)
      const a = Array.from({ length: n1 }, () => round(ctx.centre + shift + r.normal(0, s1)))
      const b = Array.from({ length: n2 }, () => round(ctx.centre + r.normal(0, s2)))
      return { ctx, n1, n2, a, b }
    },
    (d) => {
      if (sd(d.a) <= 0 || sd(d.b) <= 0) return false
      if (outliers(d.a).values.length > 0 || outliers(d.b).values.length > 0) return false
      if (Math.abs(skewness(d.a)) > 1 || Math.abs(skewness(d.b)) > 1) return false
      if (reservedCount(d.n1) || reservedCount(d.n2) || d.n1 === d.n2) return false
      return !reservedStat(Math.abs(mean(d.a) - mean(d.b)))
    },
  )
}

/** The summary block a two-sample prompt hands over. */
function summaryTable(d: TwoGroupDraw): string {
  const { ctx } = d
  return tableMd(
    ['group', 'n', 'x̄', 's'],
    [
      [ctx.groupA, fmtInt(d.n1), fmt(mean(d.a), ctx.digits + 1), fmt(sd(d.a), ctx.digits + 1)],
      [ctx.groupB, fmtInt(d.n2), fmt(mean(d.b), ctx.digits + 1), fmt(sd(d.b), ctx.digits + 1)],
    ],
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — an endpoint of the interval
// ---------------------------------------------------------------------------------------------

export const twoMeanIntervalDrill = defineGenerator({
  id: 'act-7/two-mean-interval',
  label: 'Two-sample t-interval: an endpoint',
  ap_topics: ['7.6'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const useWelch = rng.bool(0.6)
    const askUpper = rng.bool()
    const d = drawTwoGroups(rng, ctx)

    const dfMethod = useWelch ? 'welch' : 'conservative'
    const result = twoMeanInterval(d.a, d.b, { confidence: level, dfMethod, random: true })
    const [lo, hi] = result.ci as [number, number]
    const value = askUpper ? hi : lo
    const which = askUpper ? 'upper' : 'lower'
    const se = result.se
    const df = result.df ?? (useWelch ? welchDf(sd(d.a), d.n1, sd(d.b), d.n2) : conservativeDf(d.n1, d.n2))
    const crit = result.criticalValue ?? tStar(level, df)
    const digits = ctx.digits + 1

    const rule = useWelch
      ? `The office's package reports **Welch's degrees of freedom, ${fmt(welchDf(sd(d.a), d.n1, sd(d.b), d.n2), 2)}**; use that figure.`
      : `The office is working by hand, so it uses the **conservative rule**, $df = \\min(n_1 - 1,\\ n_2 - 1)$.`

    return {
      prompt: `${ctx.office} took a random sample of **${fmtInt(d.n1)} ${ctx.groupA}** and a separate random sample of **${fmtInt(d.n2)} ${ctx.groupB}**, and measured ${ctx.measure} on each. Neither sample is close to a tenth of ${ctx.population}, and both dotplots are roughly symmetric with nothing stranded.\n\n${summaryTable(d)}\n\nBuild the **${fmtPct(level, 0)}** two-sample $t$-interval for $\\mu_1 - \\mu_2$, the ${ctx.parameter} (${ctx.groupA} minus ${ctx.groupB}). ${rule}\n\nReport the **${which} endpoint**, in ${ctx.units}, to **${digits} decimal places**.`,
      answer: numericAnswer(value, 'mean', { digits, units: ctx.units }),
      hints: [
        'Four pieces, and the standard error is the one the exam gets wrong: each group keeps its own $s$ and its own $n$. Nothing is pooled and nothing is averaged.',
        `$SE = \\sqrt{s_1^2/n_1 + s_2^2/n_2} = \\sqrt{${fmt(sd(d.a), digits)}^2/${fmtInt(d.n1)} + ${fmt(sd(d.b), digits)}^2/${fmtInt(d.n2)}}$, and $t^\\star$ comes from ${fmtPct(level, 0)} on ${useWelch ? `${fmt(df, 2)}` : `${fmtInt(df)}`} degrees of freedom.`,
        `$(${fmt(mean(d.a), digits)} - ${fmt(mean(d.b), digits)}) ${askUpper ? '+' : '-'} t^\\star \\times SE$, to ${digits} decimals.`,
      ],
      solution: `$$\\bar{x}_1 - \\bar{x}_2 = ${fmt(mean(d.a), digits + 1)} - ${fmt(mean(d.b), digits + 1)} = ${fmt(result.estimate, digits + 1)}$$\n\n$$SE = \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}} = \\sqrt{\\frac{${fmt(sd(d.a), digits)}^2}{${fmtInt(d.n1)}} + \\frac{${fmt(sd(d.b), digits)}^2}{${fmtInt(d.n2)}}} = ${fmt(se, digits + 2)}$$\n\n$$df = ${useWelch ? `${fmt(df, 2)} \\text{ (Welch)}` : `\\min(${fmtInt(d.n1 - 1)},\\ ${fmtInt(d.n2 - 1)}) = ${fmtInt(df)}`}, \\qquad t^\\star = ${fmt(crit, 4)}, \\qquad \\text{margin} = ${fmt(crit * se, digits + 2)}$$\n\n$$(${fmt(result.estimate, digits + 1)}) \\pm ${fmt(crit * se, digits + 2)} = (${fmt(lo, digits)},\\ ${fmt(hi, digits)})$$\n\nThe ${which} endpoint is **${fmt(value, digits)} ${ctx.units}**.\n\nCarry full precision to the end. Rounding the standard error to two decimals before multiplying moves the endpoint in the place the argument will be read.`,
      misconception: 'Pooling the two standard deviations into one, or averaging them. The AP two-sample procedure uses each group\'s own s and its own n, and assumes nothing about the two population standard deviations being equal.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the difference interval in context (checkpoint q8)
// ---------------------------------------------------------------------------------------------

export const differenceIntervalInterpretation = defineGenerator({
  id: 'act-7/difference-interval-interpretation',
  label: 'Interpret an interval for a difference of means',
  ap_topics: ['7.6', '7.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const wantZero = rng.bool()
    const digits = ctx.digits + 1
    const floor = 0.5 * 10 ** -digits

    const d = retry(
      rng,
      (r) => drawTwoGroups(r, ctx, wantZero ? { gap: [0, 0.25] } : { gap: [0.7, 1.4] }),
      (draw) => {
        const [lo, hi] = twoMeanInterval(draw.a, draw.b, { confidence: level, random: true }).ci as [number, number]
        const containsZero = lo <= 0 && 0 <= hi
        if (containsZero !== wantZero) return false
        return Math.abs(lo) > 8 * floor && Math.abs(hi) > 8 * floor
      },
    )

    const result = twoMeanInterval(d.a, d.b, { confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const containsZero = lo <= 0 && 0 <= hi

    const answer = confidenceIntervalInterpretation({
      level,
      parameter: 'difference in means',
      lower: lo,
      upper: hi,
      context: { population: ctx.population, variable: `between ${ctx.groupA} and ${ctx.groupB} in ${ctx.measure}`, units: ctx.units },
      digits,
    })

    return {
      prompt: `${ctx.office} sampled **${fmtInt(d.n1)} ${ctx.groupA}** and **${fmtInt(d.n2)} ${ctx.groupB}** at random and independently, measured ${ctx.measure} on each, checked its conditions, and computed the **${fmtPct(level, 0)}** two-sample $t$-interval for the ${ctx.parameter} (${ctx.groupA} minus ${ctx.groupB}):\n\n$$(${fmt(lo, digits)},\\ ${fmt(hi, digits)}) \\text{ ${ctx.units}}$$\n\nWrite the sentence that goes in the bulletin. Interpret the **interval**, in context.`,
      answer,
      hints: [
        'The parameter is a difference between two population means, so the sentence has to say which group was subtracted from which, and it has to be about the true means rather than the two sample means in the file.',
        `Level, the word *confident*, both endpoints (${fmt(lo, digits)} and ${fmt(hi, digits)} ${ctx.units}), the true difference in mean ${ctx.measure} between ${ctx.groupA} and ${ctx.groupB} among ${ctx.population}.`,
        'Then read it back for the two things that fail it: any word of probability about this one interval, and any claim about individual units rather than about the two means.',
      ],
      solution: `**${answer.exemplar}**\n\n${
        containsZero
          ? `The interval runs from ${fmt(lo, digits)} to ${fmt(hi, digits)} and contains zero, so a true difference of zero is among the values these data cannot rule out. Write that as what it is: no convincing evidence of a difference. It is not evidence that the two means are equal, because the interval also fails to rule out ${fmt(lo, digits)} and ${fmt(hi, digits)}.`
          : `Every value in the interval lies on the same side of zero, so the data are consistent only with a difference in one direction: between ${fmt(Math.min(Math.abs(lo), Math.abs(hi)), digits)} and ${fmt(Math.max(Math.abs(lo), Math.abs(hi)), digits)} ${ctx.units} ${lo > 0 ? 'higher' : 'lower'} for ${ctx.groupA}. The size belongs in the sentence; a direction on its own throws the interval away.`
      }\n\nThe order of subtraction is part of the answer. Written the other way round the same interval reads $(${fmt(-hi, digits)},\\ ${fmt(-lo, digits)})$ and means exactly the same thing, and a reader who is not told which way round it goes will take the sign at face value.`,
      misconception: `Interpreting the difference in sample means (${fmt(result.estimate, digits)} ${ctx.units}), which is known exactly, instead of the true difference in population means. Or omitting which group was subtracted from which, which leaves the sign unreadable.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which condition fails
// ---------------------------------------------------------------------------------------------

type Fault = 'random' | 'tenpercent' | 'normal' | 'none'

export const twoSampleConditions = defineGenerator({
  id: 'act-7/two-sample-conditions',
  label: 'Which condition fails for a two-sample t procedure',
  ap_topics: ['7.6'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const fault = pickContext(rng, ['random', 'tenpercent', 'normal', 'none'] as const) as Fault
    const d = drawTwoGroups(rng, ctx, { nLo: 9, nHi: 20 })

    /** A strongly skewed small sample for the normality fault, with its skewness computed. */
    const skewed = fault === 'normal' ? retry(rng, (r) => drawDataset(r, { n: d.n2, mean: ctx.centre, sd: ctx.spread, shape: 'skewRight', round: ctx.digits }), (xs) => skewness(xs) > 1.3 && sd(xs) > 0) : null
    const bGroup = skewed ?? d.b

    const population = retry(rng, (r) => (d.n1 + d.n2) * r.int(20, 60), (v) => !reservedCount(v))
    const smallPopulation = retry(rng, (r) => Math.round(d.n1 * r.uniform(2.2, 5)), (v) => !reservedCount(v) && v > d.n1)

    const sampling =
      fault === 'random'
        ? `The ${ctx.groupA} were a random sample of ${ctx.population}. The ${ctx.groupB} were **whichever ${ctx.unit} the duty clerk could reach on the day** — not a random sample of anything.`
        : `Both groups were drawn at random and independently from ${ctx.population}.`
    const sizes =
      fault === 'tenpercent'
        ? `Only **${fmtInt(smallPopulation)}** ${ctx.groupA} exist on the register, and **${fmtInt(d.n1)}** of them are in the sample.`
        : `The register holds **${fmtInt(population)}** ${ctx.unit} in all.`
    const shape =
      fault === 'normal'
        ? `The ${ctx.groupA} dotplot is roughly symmetric. The ${ctx.groupB} dotplot has a long right tail: its skewness is ${fmt(skewness(bGroup), 2)} and its ${fmtInt(bGroup.length)} values run from ${fmt(Math.min(...bGroup), ctx.digits)} to ${fmt(Math.max(...bGroup), ctx.digits)}.`
        : `Both dotplots are roughly symmetric with no value stranded away from the rest.`

    const cands: Candidate[] = [
      {
        text: `**Random fails.** One of the two groups was not drawn at random, so neither sample supports inference about ${ctx.population}.`,
        correct: fault === 'random',
        why: fault === 'random' ? null : `Both groups here were drawn at random and independently. Random is the condition no arithmetic can repair, and when it holds there is nothing to report against it.`,
      },
      {
        text: `**The 10% condition fails.** ${fmtInt(d.n1)} sampled without replacement from a group of ${fmtInt(fault === 'tenpercent' ? smallPopulation : population)} is more than a tenth of it.`,
        correct: fault === 'tenpercent',
        why:
          fault === 'tenpercent'
            ? null
            : `Check the arithmetic before you accept it: $10 \\times ${fmtInt(d.n1)} = ${fmtInt(10 * d.n1)}$ and $10 \\times ${fmtInt(d.n2)} = ${fmtInt(10 * d.n2)}$, both comfortably under ${fmtInt(population)}. The 10% condition holds.`,
      },
      {
        text: `**The Normal condition fails.** One sample is small and strongly skewed, so the $t$ model for its mean is not defensible.`,
        correct: fault === 'normal',
        why: fault === 'normal' ? null : `Neither sample is skewed and neither has an outlier, so with ${fmtInt(d.n1)} and ${fmtInt(bGroup.length)} observations the graphs carry the Normal condition.`,
      },
      {
        text: `**Nothing fails.** Random, independent and Normal all hold on the numbers given, and the two-sample $t$-interval may be reported.`,
        correct: fault === 'none',
        why:
          fault === 'none'
            ? null
            : fault === 'random'
              ? 'One group was a convenience sample, and a convenience sample cannot be argued out of. There is no interval to report.'
              : fault === 'tenpercent'
                ? `${fmtInt(d.n1)} out of ${fmtInt(smallPopulation)} is over a tenth, so drawing without replacement leaves the observations dependent enough to matter and the usual standard error understates the uncertainty.`
                : `The ${ctx.groupB} sample is skewed at ${fmt(skewness(bGroup), 2)} with only ${fmtInt(bGroup.length)} values, which is far short of what the Central Limit Theorem would need to carry it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} wants a two-sample $t$-interval for the ${ctx.parameter}.\n\n${sampling} ${sizes}\n\n${summaryTable({ ...d, b: bGroup, n2: bGroup.length })}\n\n${shape}\n\nWhich of the procedure's conditions **fails**?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Three conditions, in order, and each has its own evidence. Random is about how the data were collected. Independent is the 10% arithmetic. Normal is about the graphs, or about n being large enough not to need them.',
        `Do the 10% arithmetic explicitly before deciding: $10 \\times ${fmtInt(d.n1)}$ and $10 \\times ${fmtInt(bGroup.length)}$ against the counts in the setup.`,
      ],
      solution: `| condition | evidence | verdict |\n| --- | --- | --- |\n| Random | ${fault === 'random' ? 'one group was whoever was reachable' : 'both groups drawn at random and independently'} | ${fault === 'random' ? 'fails' : 'holds'} |\n| Independent (10%) | $10 \\times ${fmtInt(d.n1)} = ${fmtInt(10 * d.n1)}$, $10 \\times ${fmtInt(bGroup.length)} = ${fmtInt(10 * bGroup.length)}$ against ${fmtInt(fault === 'tenpercent' ? smallPopulation : population)} | ${fault === 'tenpercent' ? 'fails' : 'holds'} |\n| Normal | skewness ${fmt(skewness(d.a), 2)} and ${fmt(skewness(bGroup), 2)}, no outliers in ${fault === 'normal' ? 'the first sample' : 'either sample'} | ${fault === 'normal' ? 'fails' : 'holds'} |\n\n**${options[correct]}**\n\nThe conditions are not a ritual at the top of the answer. Each one is a separate claim with its own evidence, and the write-up has to name the evidence: which sampling scheme, which two products against which population size, which graph.`,
      misconception: 'Writing "conditions met" without the numbers. An examiner reads the 10% arithmetic and the description of the graph; the words on their own earn nothing, and the arithmetic is where the failure shows.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — Welch or conservative
// ---------------------------------------------------------------------------------------------

export const dfChoice = defineGenerator({
  id: 'act-7/df-choice',
  label: 'Welch or conservative degrees of freedom',
  ap_topics: ['7.6'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const d = retry(
      rng,
      (r) => drawTwoGroups(r, ctx, { nLo: 8, nHi: 30 }),
      (draw) => welchDf(sd(draw.a), draw.n1, sd(draw.b), draw.n2) - conservativeDf(draw.n1, draw.n2) > 2,
    )

    const welch = welchDf(sd(d.a), d.n1, sd(d.b), d.n2)
    const conservative = conservativeDf(d.n1, d.n2)
    const digits = ctx.digits + 1
    const wide = twoMeanInterval(d.a, d.b, { confidence: level, dfMethod: 'conservative', random: true })
    const narrow = twoMeanInterval(d.a, d.b, { confidence: level, dfMethod: 'welch', random: true })
    const [wLo, wHi] = wide.ci as [number, number]
    const [nLo2, nHi2] = narrow.ci as [number, number]

    const cands: Candidate[] = [
      {
        text: `Both are legitimate. Welch's ${fmt(welch, 2)} is what the calculator returns and gives the interval $(${fmt(nLo2, digits)},\\ ${fmt(nHi2, digits)})$; the conservative ${fmtInt(conservative)} gives the wider $(${fmt(wLo, digits)},\\ ${fmt(wHi, digits)})$. The write-up reports which was used.`,
        correct: true,
        why: null,
      },
      {
        text: `The conservative ${fmtInt(conservative)} is the more accurate figure, because it makes fewer assumptions about the two population standard deviations.`,
        correct: false,
        why: `Conservative means cautious, not accurate. Both rules use the same point estimate and the same standard error; the conservative one simply picks a smaller $df$, which raises $t^\\star$ and widens the interval past the level that was asked for. An interval that captures more often than ${fmtPct(level, 0)} of the time is not a more accurate ${fmtPct(level, 0)} interval.`,
      },
      {
        text: `Welch's ${fmt(welch, 2)} is not a valid number of degrees of freedom, because degrees of freedom count observations and a count cannot be fractional.`,
        correct: false,
        why: `Welch's formula returns a real number on purpose: it is the $df$ of the $t$ distribution that best matches the sampling distribution of this particular standard error, and the $t$ family is defined for real $df$. The calculator prints ${fmt(welch, 2)} and means it.`,
      },
      {
        text: `Neither rule matters much here, because with $n_1 = ${fmtInt(d.n1)}$ and $n_2 = ${fmtInt(d.n2)}$ the sampling distribution is Normal and $z^\\star$ would do.`,
        correct: false,
        why: `$\\sigma$ is unknown in both groups, so the procedure is $t$ whatever the sample sizes are. The two $df$ rules disagree by ${fmt(welch - conservative, 2)} here, and the intervals they give differ in the ${Math.abs(wHi - nHi2) > 0.5 * 10 ** -ctx.digits ? 'digits this office reports' : 'last place this office reports'}.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} has ${ctx.measure} on **${fmtInt(d.n1)} ${ctx.groupA}** ($s_1 = ${fmt(sd(d.a), digits)}$) and **${fmtInt(d.n2)} ${ctx.groupB}** ($s_2 = ${fmt(sd(d.b), digits)}$), and is building a ${fmtPct(level, 0)} interval for the ${ctx.parameter}.\n\nThe package reports $df = ${fmt(welch, 2)}$. The clerk checking the work by hand has $\\min(n_1 - 1,\\ n_2 - 1) = ${fmtInt(conservative)}$.\n\nWhich statement about that disagreement is correct?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask what each rule is *for*. One approximates the sampling distribution of this standard error as closely as a $t$ distribution can; the other picks a value that is certainly no larger than the right one.',
        `Compute both intervals and look at what changes: the estimate and the standard error are identical, and only $t^\\star$ moves — ${fmt(narrow.criticalValue ?? 0, 4)} against ${fmt(wide.criticalValue ?? 0, 4)}.`,
      ],
      solution: `Both rules run on the same estimate ${fmt(narrow.estimate, digits)} ${ctx.units} and the same standard error ${fmt(narrow.se, digits + 2)}. Only $t^\\star$ differs.\n\n| rule | $df$ | $t^\\star$ | interval |\n| --- | --- | --- | --- |\n| Welch | ${fmt(welch, 2)} | ${fmt(narrow.criticalValue ?? 0, 4)} | (${fmt(nLo2, digits)}, ${fmt(nHi2, digits)}) |\n| conservative | ${fmtInt(conservative)} | ${fmt(wide.criticalValue ?? 0, 4)} | (${fmt(wLo, digits)}, ${fmt(wHi, digits)}) |\n\n**${options[correct]}**\n\nThe conservative rule is the one to use with a table and no package, and it is the safer of the two in the exact sense that it never captures less often than the stated level. Safer is a different property from accurate, and a report that says ${fmtPct(level, 0)} while its method captures more often than that has overstated its own caution. Either rule passes on the exam. Neither passes unnamed.`,
      misconception: '"Conservative df is more accurate." It is deliberately too small, which widens the interval past the stated level. It is a hand method, chosen because the exact Welch value needs a calculator.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what the interval licenses
// ---------------------------------------------------------------------------------------------

export const differenceClaim = defineGenerator({
  id: 'act-7/difference-claim',
  label: 'Which claim the difference interval supports',
  ap_topics: ['7.6', '7.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const wantZero = rng.bool()
    const digits = ctx.digits + 1
    const floor = 0.5 * 10 ** -digits

    const d = retry(
      rng,
      (r) => drawTwoGroups(r, ctx, wantZero ? { gap: [0, 0.22] } : { gap: [0.8, 1.5] }),
      (draw) => {
        const [lo, hi] = twoMeanInterval(draw.a, draw.b, { confidence: level, random: true }).ci as [number, number]
        return (lo <= 0 && 0 <= hi) === wantZero && Math.abs(lo) > 8 * floor && Math.abs(hi) > 8 * floor
      },
    )

    const result = twoMeanInterval(d.a, d.b, { confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const containsZero = lo <= 0 && 0 <= hi
    const higher = result.estimate > 0 ? ctx.groupA : ctx.groupB
    const lowerName = result.estimate > 0 ? ctx.groupB : ctx.groupA

    const cands: Candidate[] = [
      {
        text: `The data give **no convincing evidence** of any difference in mean ${ctx.measure} between ${ctx.groupA} and ${ctx.groupB}, because zero lies inside the interval — and that is not the same as evidence that the two means are equal.`,
        correct: containsZero,
        why: containsZero ? null : `Zero is outside $(${fmt(lo, digits)},\\ ${fmt(hi, digits)})$: every value this interval is consistent with is a difference in the same direction. The data do give evidence of a difference, and the interval says how big it is.`,
      },
      {
        text: `The **true means are equal**, since the interval is consistent with a difference of zero.`,
        correct: false,
        why: `An interval that contains zero also contains ${fmt(lo, digits)} and ${fmt(hi, digits)}, and it rules out none of them. "Consistent with zero" is a statement about what has not been pinned down; equality is a claim the data cannot make.`,
      },
      {
        text: `The mean ${ctx.measure} of ${higher} is **greater** than that of ${lowerName}, by somewhere between ${fmt(Math.min(Math.abs(lo), Math.abs(hi)), digits)} and ${fmt(Math.max(Math.abs(lo), Math.abs(hi)), digits)} ${ctx.units}.`,
        correct: !containsZero,
        why: !containsZero ? null : `The point estimate favours ${higher}, but the interval runs from ${fmt(lo, digits)} to ${fmt(hi, digits)} and crosses zero, so the other direction is among the values it does not rule out. A claim of direction needs the whole interval on one side.`,
      },
      {
        text: `${fmtPct(level, 0)} of ${ctx.groupA} differ from the average ${ctx.groupB} by between ${fmt(lo, digits)} and ${fmt(hi, digits)} ${ctx.units}.`,
        correct: false,
        why: `The interval estimates a difference between two population **means**. It says nothing about the spread of individual ${ctx.unit}, and the confidence level describes the method that built it rather than a share of anything.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office}'s ${fmtPct(level, 0)} interval for the ${ctx.parameter} (${ctx.groupA} minus ${ctx.groupB}), from **${fmtInt(d.n1)}** and **${fmtInt(d.n2)}** ${ctx.unit} sampled at random and independently:\n\n$$(${fmt(lo, digits)},\\ ${fmt(hi, digits)}) \\text{ ${ctx.units}}$$\n\nWhich claim does this interval support?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Put zero on the same number line as the two endpoints first. Whether it falls inside or outside decides the shape of every honest sentence about this interval.',
        'Then watch for the two claims an interval can never make: that two population means are equal, and anything at all about individual units.',
      ],
      solution: `The interval runs from ${fmt(lo, digits)} to ${fmt(hi, digits)} ${ctx.units} and zero is **${containsZero ? 'inside' : 'outside'}** it.\n\n**${options[correct]}**\n\n${
        containsZero
          ? `An interval that spans zero has failed to pin the sign down. Report it as a failure to find a difference and give the range anyway — the data are equally consistent with ${ctx.groupA} running ${fmt(Math.abs(lo), digits)} ${ctx.units} one way and ${fmt(Math.abs(hi), digits)} the other, and a reader deciding what to do next needs both numbers.`
          : `Direction and size, both in the sentence. "Higher" on its own is the half of the finding that costs nothing to state; the interval's job is the other half, and it is the half that tells the office whether the gap is worth acting on.`
      }`,
      misconception: containsZero ? 'Reading an interval that contains zero as proof that the two means are equal. It is a statement about precision, and with these sample sizes it leaves a great deal of room in both directions.' : 'Stating the direction and dropping the size. The interval exists to say how much, and a conclusion without a magnitude has thrown the whole procedure away.',
    }
  },
})


// ---------------------------------------------------------------------------------------------
// 6. Display — two small samples, one judgement (checkpoint q11, the DISP item)
// ---------------------------------------------------------------------------------------------

type Verdict = 'met' | 'normal' | 'tenpercent'

export const conditionsDotplots = defineGenerator({
  id: 'act-7/conditions-dotplots',
  label: 'Two small samples: are the conditions met?',
  ap_topics: ['7.6'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const verdict = pickContext(rng, ['met', 'normal', 'tenpercent'] as const) as Verdict
    const digits = ctx.digits

    const base = drawTwoGroups(rng, ctx, { nLo: 7, nHi: 14, unequalSpread: false })
    const a = base.a
    const b =
      verdict === 'normal'
        ? retry(rng, (r) => drawDataset(r, { n: base.n2, mean: ctx.centre, sd: ctx.spread, shape: 'skewRight', round: digits }), (xs) => skewness(xs) > 1.2 && sd(xs) > 0)
        : base.b

    const strays = outliers(b).values
    const points = [...a.map((v) => ({ x: v, y: 1 })), ...b.map((v) => ({ x: v, y: 2 }))]

    /** The register each group was drawn from, and whether the 10% arithmetic clears. */
    const bigRegister = retry(rng, (r) => (a.length + b.length) * r.int(25, 70), (v) => !reservedCount(v))
    const tightRegister = retry(rng, (r) => Math.round(a.length * r.uniform(2.5, 6)), (v) => !reservedCount(v) && v > a.length)
    const register = verdict === 'tenpercent' ? tightRegister : bigRegister
    const registerLine =
      verdict === 'tenpercent'
        ? `There are only **${fmtInt(register)} ${ctx.groupA}** on the register, and **${fmtInt(a.length)}** of them are in the sample; ${ctx.groupB} number in the thousands.`
        : `Both registers run to **${fmtInt(register)}** ${ctx.unit} or more.`

    const shapeText =
      verdict === 'normal'
        ? `row 2 has a long right tail — skewness ${fmt(skewness(b), 2)}${strays.length ? `, with ${fmtInt(strays.length)} value${strays.length === 1 ? '' : 's'} past the 1.5 × IQR fences` : ''}`
        : `neither row is skewed (${fmt(skewness(a), 2)} and ${fmt(skewness(b), 2)}) and the fences flag nothing`

    const cands: Candidate[] = [
      {
        text: `**Met.** Both samples are random and independent, $10 \times ${fmtInt(a.length)}$ and $10 \times ${fmtInt(b.length)}$ are well inside their registers, and neither display shows strong skewness or a stranded value. Report the interval.`,
        correct: verdict === 'met',
        why:
          verdict === 'met'
            ? null
            : verdict === 'normal'
              ? `Look at row 2 again: skewness ${fmt(skewness(b), 2)}, with the values bunched left and a tail running out to ${fmt(Math.max(...b), digits)} ${ctx.units}. On ${fmtInt(b.length)} observations there is no Central Limit Theorem to carry that.`
              : `The displays are fine. The arithmetic is not: ${fmtInt(a.length)} of ${fmtInt(register)} is ${fmtPct(a.length / register, 0)} of the group, well past a tenth.`,
      },
      {
        text: `**Not met — Normal.** The ${ctx.groupB} display is strongly skewed to the right, and ${fmtInt(b.length)} observations are nowhere near enough for the Central Limit Theorem to stand in for it.`,
        correct: verdict === 'normal',
        why: verdict === 'normal' ? null : `Row 2 has skewness ${fmt(skewness(b), 2)} and no value outside the fences, which is ordinary for a sample of ${fmtInt(b.length)} from a symmetric population.`,
      },
      {
        text: `**Not met — the 10% condition.** ${fmtInt(a.length)} ${ctx.groupA} drawn without replacement from a register of ${fmtInt(register)} is more than a tenth of it, so the observations are not independent enough for this standard error.`,
        correct: verdict === 'tenpercent',
        why: verdict === 'tenpercent' ? null : `Do the arithmetic: $10 \times ${fmtInt(a.length)} = ${fmtInt(10 * a.length)}$, comfortably under ${fmtInt(register)}. The 10% condition holds.`,
      },
      {
        text: `**Not met**, whatever the displays look like: a $t$ procedure needs at least 30 observations in each group, and neither sample has anything like that many.`,
        correct: false,
        why: `Thirty is the size at which the Central Limit Theorem carries the Normal condition **without** a graph. Below it the condition is checked by drawing the sample and describing what it shows, which is what these two rows are for. A $t$ procedure on ${fmtInt(a.length)} and ${fmtInt(b.length)} observations is entirely ordinary.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} drew **${fmtInt(a.length)} ${ctx.groupA}** and **${fmtInt(b.length)} ${ctx.groupB}** at random and independently, and measured ${ctx.measure} on each. ${registerLine}\n\nThe display below puts both samples on one axis: **row 1** is ${ctx.groupA}, **row 2** is ${ctx.groupB}.\n\nAre the conditions for a two-sample $t$-interval for the ${ctx.parameter} met, and why?`,
      answer: {
        type: 'display',
        display: {
          kind: 'scatter',
          points,
          xLabel: `${ctx.measure} (${ctx.units})`,
          yLabel: `row 1 = ${ctx.groupA} · row 2 = ${ctx.groupB}`,
        },
        question: { type: 'choice', options, correct, feedback },
      },
      hints: [
        'Three conditions and three kinds of evidence. Random is in the first sentence, Independent is arithmetic against the register, and Normal is what the display is for.',
        `Do the 10% arithmetic out loud — $10 \times ${fmtInt(a.length)}$ against ${fmtInt(register)} — and then describe each row: row 1 has skewness ${fmt(skewness(a), 2)} and row 2 has ${fmt(skewness(b), 2)}.`,
      ],
      solution: `| row | group | n | x̄ | s | skewness | outside the fences |\n| --- | --- | --- | --- | --- | --- | --- |\n| 1 | ${ctx.groupA} | ${fmtInt(a.length)} | ${fmt(mean(a), digits + 1)} | ${fmt(sd(a), digits + 1)} | ${fmt(skewness(a), 2)} | ${outliers(a).values.length === 0 ? 'none' : outliers(a).values.map((v) => fmt(v, digits)).join(', ')} |\n| 2 | ${ctx.groupB} | ${fmtInt(b.length)} | ${fmt(mean(b), digits + 1)} | ${fmt(sd(b), digits + 1)} | ${fmt(skewness(b), 2)} | ${strays.length === 0 ? 'none' : strays.map((v) => fmt(v, digits)).join(', ')} |\n\nRandom holds: both groups were drawn at random and independently. Independence is $10 \times ${fmtInt(a.length)} = ${fmtInt(10 * a.length)}$ and $10 \times ${fmtInt(b.length)} = ${fmtInt(10 * b.length)}$ against a register of ${fmtInt(register)}, which ${verdict === 'tenpercent' ? '**fails** for the first group' : 'clears'}. On shape, ${shapeText}.\n\n**${options[correct]}**\n\nSample size is not itself a condition. It decides how the Normal condition is checked: at 30 and above the Central Limit Theorem carries it, and below 30 the graph has to be drawn and described. Neither of these samples is near 30, so both displays have to be looked at and both have to be reported on.`,
      misconception: 'Treating "n < 30" as the thing that fails. Below 30 the Normal condition is checked by looking at the sample, and a small symmetric sample with no outliers passes it.',
    }
  },
})
