/**
 * act-7-06 · Transit Anomaly — drills. AP 7.8, 7.9: the two-sample t-test for μ₁ − μ₂ — hypotheses
 * written about the parameter before the statistic, conditions checked group by group, the
 * unpooled standard error, Welch's degrees of freedom against the conservative rule, the p-value
 * and the tail it belongs to, the conclusion in context, and the two things such a comparison
 * cannot deliver: a cause, and a population the selected group was never drawn from.
 *
 *   act-7/two-sample-setup      choice   hypotheses about μ₁ − μ₂ and the conditions
 *   act-7/two-sample-statistic  numeric  t, Welch df or p for a described two-sample test
 *   act-7/two-sample-conclusion interp   the conclusion in context (checkpoint q9, weight 1.5)
 *   act-7/scope-of-inference    interp   which population, whether cause, whether generalization
 *   act-7/ostrow-objection      choice   the selection effect, and which answers to it are legitimate
 *   act-7/two-sample-p-value    numeric  a p-value from a stated t and df, one tail or two
 *
 * The Ledger's nineteen and eight hundred and eighty-one belong to act-7-06's mission beats. Every
 * framing here is another office's file, and `reservedCount` / `reservedStat` keep a draw off the
 * Act's own numbers.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { contextGroup } from '@/lib/problems/rubric'
import { significanceTestConclusion } from '@/lib/problems/rubrics'
import type { RubricGroup } from '@/lib/problems/types'
import { conservativeDf, mean, outliers, pValueT, sd, skewness, twoMeanTest, welchDf } from '@/lib/stats'
import { fmt, fmtInt, fmtP } from '@/lib/stats/format'
import { ALPHAS, TWO_SAMPLE_CONTEXTS, reservedCount, reservedStat, shuffleChoice, smallN, type Candidate, type TwoSampleContext } from './contexts'

export interface TwoGroupDraw {
  ctx: TwoSampleContext
  n1: number
  n2: number
  a: number[]
  b: number[]
}

interface DrawOptions {
  nLo?: number
  nHi?: number
  /** Equal group sizes — the trap in the setup item, where equal counts look like pairing. */
  equalN?: boolean
  /** True gap between the group means, as a multiple of the context's spread. */
  gap?: [number, number]
}

function drawGroups(rng: Rng, ctx: TwoSampleContext, opts: DrawOptions = {}): TwoGroupDraw {
  const { nLo = 9, nHi = 26, equalN = false, gap = [0.3, 1.3] } = opts
  const q = 10 ** ctx.digits
  const place = (v: number) => Math.round(v * q) / q
  return retry(
    rng,
    (r) => {
      const n1 = smallN(r, nLo, nHi)
      const n2 = equalN ? n1 : smallN(r, nLo, nHi)
      const s1 = ctx.spread * r.uniform(0.7, 1.05)
      const s2 = ctx.spread * r.uniform(0.95, 1.5)
      const shift = ctx.spread * r.uniform(gap[0], gap[1]) * (r.bool() ? 1 : -1)
      const a = Array.from({ length: n1 }, () => place(ctx.centre + shift + r.normal(0, s1)))
      const b = Array.from({ length: n2 }, () => place(ctx.centre + r.normal(0, s2)))
      return { ctx, n1, n2, a, b }
    },
    (d) => {
      if (sd(d.a) <= 0 || sd(d.b) <= 0) return false
      if (outliers(d.a).values.length > 0 || outliers(d.b).values.length > 0) return false
      if (Math.abs(skewness(d.a)) > 1 || Math.abs(skewness(d.b)) > 1) return false
      if (reservedCount(d.n1) || reservedCount(d.n2)) return false
      if (!equalN && d.n1 === d.n2) return false
      return !reservedStat(Math.abs(mean(d.a) - mean(d.b)))
    },
  )
}

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

/**
 * `significanceTestConclusion` forbids the bare token "reject" inside a fail-to-reject conclusion,
 * so a context whose own wording contains it would trip its own exemplar. None of the two-sample
 * framings do today; the filter keeps that true if one is added.
 */
const CONCLUSION_CONTEXTS = TWO_SAMPLE_CONTEXTS.filter((c) => !/reject/i.test(`${c.measure} ${c.population} ${c.parameter} ${c.groupA} ${c.groupB}`))

// ---------------------------------------------------------------------------------------------
// 1. Choice — hypotheses about μ₁ − μ₂, and the conditions
// ---------------------------------------------------------------------------------------------

export const twoSampleSetup = defineGenerator({
  id: 'act-7/two-sample-setup',
  label: 'Hypotheses and conditions for a two-sample t-test',
  ap_topics: ['7.8'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const d = drawGroups(rng, ctx, { nLo: 9, nHi: 22, equalN: true })
    const above = mean(d.a) > mean(d.b)
    const sym = above ? '>' : '<'
    const word = above ? 'higher' : 'lower'
    const welch = welchDf(sd(d.a), d.n1, sd(d.b), d.n2)
    const pooledDf = d.n1 + d.n2 - 2

    const cands: Candidate[] = [
      {
        text: `$H_0: \\mu_1 - \\mu_2 = 0$ against $H_a: \\mu_1 - \\mu_2 ${sym} 0$, where $\\mu_1$ and $\\mu_2$ are the true mean ${ctx.measure} of ${ctx.groupA} and of ${ctx.groupB}. A **two-sample $t$-test** with $SE = \\sqrt{s_1^2/n_1 + s_2^2/n_2}$, nothing pooled, and the three conditions argued **for each group separately**.`,
        correct: true,
        why: null,
      },
      {
        text: `$H_0: \\bar{x}_1 - \\bar{x}_2 = 0$ against $H_a: \\bar{x}_1 - \\bar{x}_2 ${sym} 0$; a two-sample $t$-test with $SE = \\sqrt{s_1^2/n_1 + s_2^2/n_2}$ and the conditions checked on each group.`,
        correct: false,
        why: `The procedure is right and the hypotheses are about the wrong quantity. $\\bar{x}_1 - \\bar{x}_2 = ${fmt(mean(d.a) - mean(d.b), ctx.digits + 1)}$ ${ctx.units} is already known to the last decimal the office reports; there is nothing left to hypothesise about it. Hypotheses are always claims about parameters.`,
      },
      {
        text: `$H_0: \\mu_1 - \\mu_2 = 0$ against $H_a: \\mu_1 - \\mu_2 ${sym} 0$; a **pooled** two-sample $t$-test, combining $s_1$ and $s_2$ into one estimate of the common standard deviation and using $df = n_1 + n_2 - 2 = ${fmtInt(pooledDf)}$.`,
        correct: false,
        why: `The hypotheses are right. Pooling is not: it assumes $\\sigma_1 = \\sigma_2$, which nothing in this file establishes, and it claims ${fmtInt(pooledDf)} degrees of freedom where Welch's rule allows ${fmt(welch, 2)}. The AP two-sample procedure keeps each group's own $s$ and its own $n$.`,
      },
      {
        text: `$H_0: \\mu_d = 0$ against $H_a: \\mu_d ${sym} 0$; sort both columns, line them up by rank, subtract row by row, and run a **paired** $t$-test on the ${fmtInt(d.n1)} differences with $df = ${fmtInt(d.n1 - 1)}$.`,
        correct: false,
        why: `Both groups holding ${fmtInt(d.n1)} ${ctx.unit} is a coincidence of the sampling, not a matching rule. Pairing has to come from the design: a ${ctx.unit.replace(/s$/, '')} in the first group has no partner in the second, and lining the two sorted columns up invents a correspondence and a standard error along with it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} drew **${fmtInt(d.n1)} ${ctx.groupA}** and **${fmtInt(d.n2)} ${ctx.groupB}** at random and independently from ${ctx.population}, and measured ${ctx.measure} on each. No ${ctx.unit.replace(/s$/, '')} appears in both groups.\n\n${summaryTable(d)}\n\nThe office wants to know whether ${ctx.groupA} run **${word}**, on average, than ${ctx.groupB}.\n\nWhich setup is correct?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two questions, in order. What kind of quantity does a hypothesis make a claim about? And what rule, if any, matches a unit in the first group to a unit in the second?',
        `Equal group sizes are not a matching rule. And before the standard error is written down, ask what would have to be true about ${ctx.population} for the two spreads to be combined into one.`,
      ],
      solution: `**${options[correct]}**\n\n**The parameter.** Two independent groups give one parameter, $\\mu_1 - \\mu_2$, a difference between two population means. The sample difference ${fmt(mean(d.a) - mean(d.b), ctx.digits + 1)} ${ctx.units} is the evidence about it, and never the subject of the hypotheses.\n\n**The standard error.** $\\sqrt{s_1^2/n_1 + s_2^2/n_2} = \\sqrt{${fmt(sd(d.a), ctx.digits + 1)}^2/${fmtInt(d.n1)} + ${fmt(sd(d.b), ctx.digits + 1)}^2/${fmtInt(d.n2)}} = ${fmt(twoMeanTest(d.a, d.b, { alt: above ? 'greater' : 'less' }).se, ctx.digits + 3)}$. Each group brings its own spread over its own count, and nothing crosses between them.\n\n**The degrees of freedom.** Welch's formula gives ${fmt(welch, 2)}; the conservative hand rule gives $\\min(${fmtInt(d.n1 - 1)},\\ ${fmtInt(d.n2 - 1)}) = ${fmtInt(conservativeDf(d.n1, d.n2))}$. Either is accepted and the write-up names which.\n\n**The conditions, one group at a time.** Random: both samples were drawn at random from ${ctx.population}. Independent: the two groups share no ${ctx.unit.replace(/s$/, '')}, and $10 \\times ${fmtInt(d.n1)} = ${fmtInt(10 * d.n1)}$ and $10 \\times ${fmtInt(d.n2)} = ${fmtInt(10 * d.n2)}$ are each well under the register. Normal: with ${fmtInt(d.n1)} and ${fmtInt(d.n2)} ${ctx.unit} the theorem is no help, so each group's graph is drawn and described. A failure in either group stops the procedure.`,
      misconception: 'Writing the hypotheses about x̄₁ − x̄₂, or treating two columns of equal length as a paired file. The first tests a number already known; the second invents a matching rule the design never supplied.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — t, Welch df, or p
// ---------------------------------------------------------------------------------------------

type AskWhat = 't' | 'df' | 'p'

export const twoSampleStatistic = defineGenerator({
  id: 'act-7/two-sample-statistic',
  label: 'Two-sample t: the statistic, the Welch df or the p-value',
  ap_topics: ['7.8', '7.9'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const ask = pickContext(rng, ['t', 'df', 'p'] as const) as AskWhat

    const d = retry(
      rng,
      (r) => drawGroups(r, ctx, { nLo: 8, nHi: 24 }),
      (draw) => {
        const above = mean(draw.a) > mean(draw.b)
        const test = twoMeanTest(draw.a, draw.b, { alt: above ? 'greater' : 'less', random: true })
        const p = test.pValue as number
        const w = welchDf(sd(draw.a), draw.n1, sd(draw.b), draw.n2)
        if (!(p > 0.0002 && p < 0.35)) return false
        if (reservedStat(test.statistic) || reservedStat(w)) return false
        return w - conservativeDf(draw.n1, draw.n2) > 0.4
      },
    )

    const above = mean(d.a) > mean(d.b)
    const alt = above ? ('greater' as const) : ('less' as const)
    const test = twoMeanTest(d.a, d.b, { alt, random: true })
    const welch = welchDf(sd(d.a), d.n1, sd(d.b), d.n2)
    const p = test.pValue as number
    const digits = ctx.digits + 1
    const se = test.se

    const asked = ask === 't' ? 'the **$t$ statistic**, to two decimal places' : ask === 'df' ? "**Welch's degrees of freedom**, to two decimal places" : `the **one-sided $p$-value**${p >= 0.0001 ? ', to four decimal places' : ''}`

    const answer = ask === 't' ? numericAnswer(test.statistic, 'testStat') : ask === 'df' ? numericAnswer(welch, 'other', { digits: 2 }) : numericAnswer(p, 'pValue')

    return {
      prompt: `${ctx.office} is testing the ${ctx.parameter} between ${ctx.groupA} and ${ctx.groupB}, one-sided. Two independent random samples from ${ctx.population}, with no ${ctx.unit.replace(/s$/, '')} in both:\n\n${summaryTable(d)}\n\n$$H_0: \\mu_1 - \\mu_2 = 0 \\qquad H_a: \\mu_1 - \\mu_2 ${above ? '>' : '<'} 0$$\n\nConditions have been checked and met. Report ${asked}.`,
      answer,
      hints: [
        'The standard error first, and it is the place this procedure is usually lost: each group keeps its own $s$ and its own $n$, and the two variance contributions are added before the root is taken.',
        `$SE = \\sqrt{${fmt(sd(d.a), digits)}^2/${fmtInt(d.n1)} + ${fmt(sd(d.b), digits)}^2/${fmtInt(d.n2)}} = ${fmt(se, digits + 2)}$, and Welch's rule puts the degrees of freedom at ${fmt(welch, 2)} against the conservative $\\min(${fmtInt(d.n1 - 1)},\\ ${fmtInt(d.n2 - 1)}) = ${fmtInt(conservativeDf(d.n1, d.n2))}$.`,
        ask === 'p'
          ? `$t = ${fmt(test.statistic, 4)}$ on ${fmt(welch, 2)} df, one tail: \`tcdf(${above ? `${fmt(test.statistic, 3)}, 1E99` : `-1E99, ${fmt(test.statistic, 3)}`}, ${fmt(welch, 2)})\`.`
          : ask === 'df'
            ? `Welch's formula is $\\left(\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}\\right)^2$ over $\\frac{1}{n_1-1}\\left(\\frac{s_1^2}{n_1}\\right)^2 + \\frac{1}{n_2-1}\\left(\\frac{s_2^2}{n_2}\\right)^2$, and it returns a real number. Two decimals.`
            : `$(${fmt(mean(d.a), digits)} - ${fmt(mean(d.b), digits)}) \\div ${fmt(se, digits + 2)}$, to two decimals.`,
      ],
      solution: `$$\\bar{x}_1 - \\bar{x}_2 = ${fmt(mean(d.a), digits)} - ${fmt(mean(d.b), digits)} = ${fmt(test.estimate, digits + 1)}\\ \\text{${ctx.units}}$$\n\n$$SE = \\sqrt{\\frac{s_1^2}{n_1} + \\frac{s_2^2}{n_2}} = \\sqrt{\\frac{${fmt(sd(d.a), digits)}^2}{${fmtInt(d.n1)}} + \\frac{${fmt(sd(d.b), digits)}^2}{${fmtInt(d.n2)}}} = ${fmt(se, digits + 2)}$$\n\n$$t = \\frac{(\\bar{x}_1 - \\bar{x}_2) - 0}{SE} = ${fmt(test.statistic, 4)} \\qquad df_{\\text{Welch}} = ${fmt(welch, 4)} \\qquad P = ${fmtP(p)}$$\n\nThe answer asked for is **${ask === 't' ? fmt(test.statistic, 2) : ask === 'df' ? fmt(welch, 2) : fmtP(p)}**.\n\nOn a TI-84: \`STAT\` \`▸ TESTS\` \`4:2-SampTTest\`, **Inpt: Stats**, then x̄1 = ${fmt(mean(d.a), digits)}, Sx1 = ${fmt(sd(d.a), digits)}, n1 = ${fmtInt(d.n1)}, x̄2 = ${fmt(mean(d.b), digits)}, Sx2 = ${fmt(sd(d.b), digits)}, n2 = ${fmtInt(d.n2)}, alternative μ1 ${above ? '>' : '<'} μ2, **Pooled: No**. The screen returns $t$, $p$ and a fractional $df$ together.\n\nThe conservative rule would read the same $t$ at $\\min(${fmtInt(d.n1 - 1)},\\ ${fmtInt(d.n2 - 1)}) = ${fmtInt(conservativeDf(d.n1, d.n2))}$ degrees of freedom and return $P = ${fmtP(pValueT(test.statistic, conservativeDf(d.n1, d.n2), alt))}$, a little larger. Both are accepted; the write-up names which one produced the number.`,
      misconception: `Pooling the two standard deviations, or dividing by $s_1 + s_2$ rather than by $\\sqrt{s_1^2/n_1 + s_2^2/n_2}$. The denominator is the standard error of the difference of two sample means, ${fmt(se, digits + 2)}, and it is built from each group's own spread over that group's own count.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — the conclusion in context (checkpoint q9)
// ---------------------------------------------------------------------------------------------

export const twoSampleConclusion = defineGenerator({
  id: 'act-7/two-sample-conclusion',
  label: 'Conclusion in context for a two-sample t-test',
  ap_topics: ['7.9'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, CONCLUSION_CONTEXTS)
    const alpha = pickContext(rng, ALPHAS)
    const wantReject = rng.bool(0.6)

    const d = retry(
      rng,
      (r) => drawGroups(r, ctx, { nLo: 9, nHi: 26, gap: wantReject ? [0.8, 1.6] : [0, 0.3] }),
      (draw) => {
        const up = mean(draw.a) > mean(draw.b)
        const t = twoMeanTest(draw.a, draw.b, { alt: up ? 'greater' : 'less', random: true })
        const p = t.pValue as number
        return p < alpha === wantReject && p > 0.0002 && p < 0.48
      },
    )

    const above = mean(d.a) > mean(d.b)
    const alt = above ? ('greater' as const) : ('less' as const)
    const test = twoMeanTest(d.a, d.b, { alt, random: true })
    const p = test.pValue as number
    const reject = p < alpha
    const welch = test.df as number
    const digits = ctx.digits + 1

    const answer = significanceTestConclusion({
      pValue: p,
      alpha,
      direction: alt,
      parameterContext: {
        parameter: 'difference in means',
        population: ctx.population,
        variable: `in ${ctx.measure}, ${ctx.groupA} minus ${ctx.groupB}`,
        units: ctx.units,
        nullValue: 0,
      },
    })

    return {
      prompt: `${ctx.office} took independent random samples of **${fmtInt(d.n1)} ${ctx.groupA}** and **${fmtInt(d.n2)} ${ctx.groupB}** from ${ctx.population}, measured ${ctx.measure} on each, checked the conditions group by group, and tested $H_0: \\mu_1 - \\mu_2 = 0$ against $H_a: \\mu_1 - \\mu_2 ${above ? '>' : '<'} 0$ at $\\alpha = ${fmt(alpha, 2)}$, with $\\mu_1$ the mean for ${ctx.groupA}:\n\n$$t = ${fmt(test.statistic, 3)} \\qquad df = ${fmt(welch, 2)}\\ \\text{(Welch)} \\qquad p = ${fmtP(p)}$$\n\nWrite the **conclusion in context**.`,
      answer,
      hints: [
        'Four moves and none of them optional: the decision, the comparison that justified it, evidence language rather than fact, and the claim itself with its population attached.',
        `Put ${fmtP(p)} beside $\\alpha = ${fmt(alpha, 2)}$ and say which is larger. Then name the parameter — the difference in mean ${ctx.measure} between ${ctx.groupA} and ${ctx.groupB} among ${ctx.population}.`,
        `The verb is "${reject ? 'reject' : 'fail to reject'}", never "accept", and the sentence is about two population means rather than the ${fmtInt(d.n1 + d.n2)} ${ctx.unit} in the file.`,
      ],
      solution: `**${answer.exemplar}**\n\n${
        reject
          ? `${fmtP(p)} is below $\\alpha = ${fmt(alpha, 2)}$: a difference of ${fmt(test.estimate, digits)} ${ctx.units} or more would be uncommon in samples of these sizes if the two population means were equal, so $H_0$ is rejected. What that buys is convincing evidence about a difference in means, at this level. It is not proof, and it is not a statement about any individual ${ctx.unit.replace(/s$/, '')}.`
          : `${fmtP(p)} is above $\\alpha = ${fmt(alpha, 2)}$: a difference of ${fmt(test.estimate, digits)} ${ctx.units} is not unusual when the two population means are equal, so $H_0$ stands. The verb is **fail to reject**, and the reason the wording matters is that "accept $H_0$" claims something the test never delivered. With ${fmtInt(d.n1)} and ${fmtInt(d.n2)} ${ctx.unit} there are real differences this comparison would have missed, and the honest report says how large they could be.`
      }\n\nThe sentence names ${ctx.population} because a conclusion that could be pasted into any report is a conclusion about nothing, and it names the order of subtraction because ${ctx.groupA} minus ${ctx.groupB} and the reverse carry opposite signs and the same meaning.`,
      misconception: reject
        ? 'Writing that the test "proves" a difference, quoting p without α, or describing the two samples instead of the two population means. The test returns evidence at a stated level about parameters nobody has measured.'
        : '"Accept H₀", or "the two means are the same". Failing to reject means the data are consistent with no difference; it is not evidence that there is none, and with samples this size it never could be.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — scope of inference
// ---------------------------------------------------------------------------------------------

type Design = 'observational-random' | 'experiment-volunteers' | 'selected-on-outcome'

export const scopeOfInference = defineGenerator({
  id: 'act-7/scope-of-inference',
  label: 'Scope of inference: which population, and whether cause',
  ap_topics: ['7.9'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const design = pickContext(rng, ['observational-random', 'experiment-volunteers', 'selected-on-outcome'] as const) as Design
    const d = drawGroups(rng, ctx, { nLo: 10, nHi: 26, gap: [0.8, 1.6] })
    const above = mean(d.a) > mean(d.b)
    const test = twoMeanTest(d.a, d.b, { alt: above ? 'greater' : 'less', random: true })
    const p = test.pValue as number
    const digits = ctx.digits + 1
    const unitSingular = ctx.unit.replace(/s$/, '')

    const assigned = design === 'experiment-volunteers'
    const sampled = design === 'observational-random'

    const setup =
      design === 'observational-random'
        ? `Both groups were drawn **at random** from ${ctx.population}: ${fmtInt(d.n1)} ${ctx.groupA} and ${fmtInt(d.n2)} ${ctx.groupB}. Nothing was assigned; each ${unitSingular} was already one or the other when it was selected.`
        : design === 'experiment-volunteers'
          ? `The ${fmtInt(d.n1 + d.n2)} ${ctx.unit} in the study all **volunteered** for it. Once enrolled, they were **randomly assigned** to run as ${ctx.groupA} or as ${ctx.groupB}, ${fmtInt(d.n1)} and ${fmtInt(d.n2)} of them respectively.`
          : `The ${fmtInt(d.n1)} ${ctx.groupA} are **every** ${unitSingular} in the register that ended up in that condition — they were picked out because of how they turned out, not sampled. The ${fmtInt(d.n2)} ${ctx.groupB} are a random sample of the rest of ${ctx.population}.`

    const required: RubricGroup[] = [
      contextGroup('Names the population (or the group) the conclusion covers', [ctx.population], {
        feedback: `Say whom the claim is about: ${ctx.population}${sampled ? '' : ', or say why the conclusion cannot reach that far'}.`,
      }),
      {
        label: assigned ? 'Says the treatments were randomly assigned' : 'Says the groups were NOT randomly assigned',
        phrasings: assigned ? ['random assign', 'assign', 'random assignment', 'experiment'] : ['not random assign', 'not assign', 'not experiment', 'observational', 'already'],
        polarity: 'positive',
        feedback: assigned
          ? 'Random assignment is the thing that licenses a causal statement, so say it happened.'
          : 'Nobody assigned these groups; each unit arrived in the group it was already in. Say so, because that is the fact the causal question turns on.',
      },
      {
        label: assigned ? 'Draws the causal conclusion the assignment licenses' : 'Refuses the causal claim',
        phrasings: assigned ? ['cause', 'causal', 'caused'] : ['not cause', 'not causal', 'not establish cause', 'not show cause', 'association not causation'],
        polarity: 'positive',
        feedback: assigned
          ? 'Random assignment balances everything else on average, so a difference this large between the assigned groups can be attributed to the treatment — for these units.'
          : 'Say it out loud: this comparison does not establish that being in one group causes the difference. Any number of other differences between the groups arrived with them.',
      },
      {
        label: sampled ? 'Generalizes to the population the samples came from' : 'Refuses to generalize beyond the units studied',
        phrasings: sampled
          ? ['generalize', 'population', 'apply population', 'all']
          : ['not generalize', 'not represent', 'not random sample', 'only these', 'not beyond', 'not extend'],
        polarity: 'any',
        minMatches: 1,
        feedback: sampled
          ? `Random sampling from ${ctx.population} is what lets the conclusion travel beyond the ${fmtInt(d.n1 + d.n2)} ${ctx.unit} in the file.`
          : `These ${ctx.unit} were not randomly drawn from ${ctx.population}, so the conclusion stays with the units studied and no further.`,
      },
      {
        label: 'States what the comparison does establish, in context',
        phrasings: ['differ', 'greater', 'less', 'mean'],
        polarity: 'any',
        feedback: `Do not stop at the limits. Say what was found: a difference of about ${fmt(Math.abs(test.estimate), digits)} ${ctx.units} in mean ${ctx.measure}, in the direction the samples point.`,
      },
    ]

    const exemplar = assigned
      ? `Because the ${fmtInt(d.n1 + d.n2)} ${ctx.unit} were randomly assigned to run as ${ctx.groupA} or as ${ctx.groupB}, the difference of about ${fmt(Math.abs(test.estimate), digits)} ${ctx.units} in mean ${ctx.measure} can be attributed to the assignment: the treatment caused it, for these units. They volunteered rather than being drawn at random from ${ctx.population}, so the result does not generalize beyond the ${ctx.unit} studied.`
      : sampled
        ? `Both samples were drawn at random from ${ctx.population}, so the conclusion generalizes to that population: the true mean ${ctx.measure} of ${ctx.groupA} differs from that of ${ctx.groupB} by about ${fmt(Math.abs(test.estimate), digits)} ${ctx.units}. The groups were not randomly assigned, each ${unitSingular} was already in its group, and this comparison does not establish a cause for the gap.`
        : `The ${fmtInt(d.n1)} ${ctx.groupA} were picked out by how they turned out and are not a random sample of ${ctx.population}, so the conclusion does not generalize past the ${ctx.unit} in the register. They were not randomly assigned either, so the comparison does not establish a cause. What it does establish is a difference of about ${fmt(Math.abs(test.estimate), digits)} ${ctx.units} in mean ${ctx.measure}, in the direction the samples point.`

    return {
      prompt: `${ctx.office} compared ${ctx.measure} between ${ctx.groupA} and ${ctx.groupB} and found $t = ${fmt(test.statistic, 3)}$ on ${fmt(test.df as number, 2)} degrees of freedom, $p = ${fmtP(p)}$, with ${ctx.groupA} running ${above ? 'higher' : 'lower'} by ${fmt(Math.abs(test.estimate), digits)} ${ctx.units} on average.\n\n${setup}\n\nWrite the **scope statement** that goes under the finding: whom the conclusion is about, whether it establishes a cause, and what the design does and does not let the office claim.`,
      answer: {
        type: 'interpretation',
        required,
        forbidden: assigned
          ? [{ phrase: 'prove', label: 'Claims proof', why: 'A test returns evidence at a stated level. Random assignment licenses a causal claim; it does not license the word "proves".' }]
          : [
              { phrase: 'prove', label: 'Claims proof', why: 'A test returns evidence at a stated level, never proof.' },
              { phrase: 'cause', label: 'Claims causation', why: 'Nothing was randomly assigned here. The two groups differ in every way that put them in different groups, and the comparison cannot separate those from the one being measured.' },
              { phrase: /\b(?:is|are|was|were)\s+(?:due to|because of)\b/, label: 'Attributes the gap to the grouping', why: 'That is a causal claim in other words. Without random assignment the gap has as many candidate explanations as the groups have differences.' },
            ],
        exemplar,
        minWords: 20,
      },
      hints: [
        'Two separate questions, and the design answers them separately. Random **assignment** is what buys a cause. Random **sampling** is what buys a population to generalize to. A study can have either, both, or neither.',
        assigned
          ? 'Here the assignment was random and the recruitment was not. Work out which of the two claims that licenses and which it refuses.'
          : sampled
            ? 'Here the sampling was random and nothing was assigned. Work out which of the two claims that licenses and which it refuses.'
            : `Here one group was selected on the outcome itself, so it is not a sample of ${ctx.population} at all, and nothing was assigned. Say what is left.`,
        `Then finish with the finding rather than the caveats: a difference of about ${fmt(Math.abs(test.estimate), digits)} ${ctx.units} in mean ${ctx.measure}, ${above ? 'higher' : 'lower'} for ${ctx.groupA}.`,
      ],
      solution: `**${exemplar}**\n\nThe two questions are settled by two different features of the design, and neither answers the other.\n\n| feature | present here? | what it buys |\n| --- | --- | --- |\n| random **assignment** to the groups | ${assigned ? 'yes' : 'no'} | a causal conclusion about the units studied |\n| random **sampling** from the population | ${sampled ? 'yes' : 'no'} | a conclusion that reaches ${ctx.population} |\n\n${
        assigned
          ? `Volunteers who were then randomised give the strongest causal statement available and the weakest generalization: whatever the assignment did, it did to these ${fmtInt(d.n1 + d.n2)} ${ctx.unit}, and a self-selected group is not a picture of ${ctx.population}.`
          : sampled
            ? `Two random samples from ${ctx.population} give the reverse: the finding travels to the whole population, and it stays an association the whole way, because the ${ctx.unit} sorted themselves into groups long before the office arrived.`
            : `A group selected on its own outcome is the hardest case. It is unusual by construction — that is why it was selected — so it is not a sample of ${ctx.population}, and the p-value cannot repair that. What survives is a comparison of two described sets of ${ctx.unit}, its direction, and the fact that ${ctx.measure} was recorded before the selection was made.`
      }\n\nThe scope statement goes in the report under the finding, in the author's own words, before a reader supplies a stronger version of it.`,
      misconception: assigned
        ? 'Reading random assignment as licence to generalize. It settles the cause question inside the study and leaves the population question exactly where recruitment left it.'
        : 'Reading a small p-value as though it settled the design. The p-value measures how surprising the gap is under H₀; it says nothing about who the two groups are or how they came to be different.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — the selection-effect objection
// ---------------------------------------------------------------------------------------------

interface ObjectionFraming {
  office: string
  /** The outcome the first group was selected on. */
  outcome: string
  selected: string
  rest: string
  measure: string
  units: string
  /** When the measurement was taken, relative to the outcome. */
  beforeMark: string
  population: string
}

const OBJECTION_FRAMINGS: readonly ObjectionFraming[] = [
  {
    office: 'the Ceres Authority casualty office',
    outcome: 'a coolant-loop failure in service',
    selected: 'loops that failed',
    rest: 'loops still in service',
    measure: 'outlet temperature at the last scheduled survey',
    units: '°C',
    beforeMark: 'at a survey logged months before the failure',
    population: 'coolant loops on the Jovian register',
  },
  {
    office: 'the Himalia berth office',
    outcome: 'a missed departure slot',
    selected: 'hulls that missed their slot',
    rest: 'hulls that sailed on time',
    measure: 'turnaround time on the previous visit',
    units: 'h',
    beforeMark: 'on the visit before the one that was missed',
    population: 'hulls berthing at Himalia',
  },
  {
    office: 'the Elara Yard test cell',
    outcome: 'a drive rejected at final certification',
    selected: 'drives that failed certification',
    rest: 'drives that passed',
    measure: 'thrust recorded on the first bench run',
    units: 'kN',
    beforeMark: 'on the first bench run, weeks before certification',
    population: 'Tessera-C drives built at Elara',
  },
  {
    office: 'the Adrastea relay office',
    outcome: 'a total loss of signal on the corridor',
    selected: 'transits that went silent',
    rest: 'transits that reported in',
    measure: 'delay against the filed plot at the outbound mark',
    units: 'd',
    beforeMark: 'at the outbound mark, before the silence',
    population: 'transits of the Adrastea corridor',
  },
]

export const ostrowObjection = defineGenerator({
  id: 'act-7/ostrow-objection',
  label: 'The selection-effect objection, and what answers it',
  ap_topics: ['7.9'],
  skills: ['1', '4'],
  generate(rng) {
    const f = pickContext(rng, OBJECTION_FRAMINGS)
    const k = retry(rng, (r) => r.int(11, 34), (v) => !reservedCount(v))
    const rest = retry(rng, (r) => r.int(40, 95) * 10, (v) => !reservedCount(v) && v > 20 * k)
    const gap = Math.round(rng.uniform(1.4, 4.6) * 100) / 100
    const t = Math.round(rng.uniform(3.2, 6.4) * 100) / 100
    const df = Math.round((k - 1 + rng.uniform(0.05, 0.95)) * 100) / 100
    const p = pValueT(t, df, 'greater')

    const good: Candidate = {
      text: `The objection is correct about two things and wrong about a third. The ${f.selected} are not a random sample of ${f.population}, so nothing here generalizes to ${f.population}; and nothing was randomly assigned, so the comparison establishes no cause. What it does establish is that ${f.measure} was already ${fmt(gap, 2)} ${f.units} higher for them **${f.beforeMark}** — before the outcome that selected them — and in that one direction. A group can be unusual by construction and still be unusual in a particular way, at a particular time, and that is what is being reported.`,
      correct: true,
      why: null,
    }

    const bad: Candidate[] = [
      {
        text: `The objection is answered by the p-value. $P = ${fmtP(p)}$ against any level the office would set, so the difference is real and how the ${f.selected} were chosen does not bear on it.`,
        correct: false,
        why: `A p-value measures how surprising this gap would be under $H_0$, given the sampling scheme the procedure was told about. It has no way to know that one group was assembled by reading the outcome first, and no size of $p$ repairs that. Selection is a question about the design, and the design is settled before any arithmetic runs.`,
      },
      {
        text: `The objection is fatal. A group selected on its own outcome cannot be compared with anything, so the finding should be withdrawn and the ${fmtInt(k)} ${f.selected} dropped from the analysis.`,
        correct: false,
        why: `Too much. Every casualty study on record selects on the outcome, because the outcome is what there is to study. What selection forbids is a causal claim and a claim about ${f.population}. It does not forbid describing the two groups, and a measurement taken ${f.beforeMark} is evidence about the order events happened in.`,
      },
      {
        text: `The objection is answered by widening the comparison: put the ${fmtInt(k)} ${f.selected} back in with the ${fmtInt(rest)} ${f.rest} and test that combined group against the rest of ${f.population}, which removes the selection entirely.`,
        correct: false,
        why: `It removes the selection and the finding with it. ${fmtInt(k)} units carrying a ${fmt(gap, 2)} ${f.units} excess, averaged into ${fmtInt(k + rest)}, move the combined mean by ${fmt((k * gap) / (k + rest), 4)} ${f.units}. A comparison with no power against the effect it is hunting returns "nothing" whether or not the effect is there.`,
      },
      {
        text: `The objection is answered by the direction alone: the ${f.selected} ran higher rather than lower, and a selection effect would have been equally likely to push them either way, so the direction rules selection out.`,
        correct: false,
        why: `Selection on an outcome is not symmetric. If ${f.outcome.replace(/^a /, '')} is more likely for ${f.units === 'kN' ? 'weaker' : 'slower'} units, then selecting on it selects the tail in exactly the direction observed. The direction is worth reporting; it is not a defence against the objection, because it is what the objection predicts.`,
      },
      {
        text: `The objection is answered by the conditions. Random, independent and Normal were all checked and met on both groups, and a procedure whose conditions hold is a procedure whose conclusion holds.`,
        correct: false,
        why: `The Random condition is the one at issue, and ticking it does not make it true. The ${f.selected} were not sampled at all; they are a census of one outcome. A conditions block that records "random sample" here has written down the thing the objection disputes and called it checked.`,
      },
    ]

    const cands = [good, ...rng.shuffle(bad).slice(0, 3)]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${f.office} compared ${f.measure} between the **${fmtInt(k)} ${f.selected}** and a random sample of **${fmtInt(rest)} ${f.rest}**, and found the first group ${fmt(gap, 2)} ${f.units} higher on average: $t = ${fmt(t, 2)}$ on ${fmt(df, 2)} degrees of freedom, $P = ${fmtP(p)}$. The measurement was taken ${f.beforeMark}.\n\nA senior officer reads the finding and says:\n\n> *You have shown that ${f.selected} were unusual. ${f.selected.replace(/^./, (c) => c.toUpperCase())} are unusual. That is why they were ${f.outcome.includes('fail') || f.outcome.includes('reject') ? 'pulled' : 'selected'} out of the register in the first place.*\n\nWhich response to that objection is defensible?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Grant the objection everything it is owed before answering it. Which two claims does selecting a group on its own outcome actually forbid?',
        `Then look for what survives. One fact about this comparison is not a matter of selection at all: **when** ${f.measure} was recorded.`,
      ],
      solution: `**${options[correct]}**\n\nSelecting a group on the outcome costs two specific things and no more.\n\n- **Generalization.** The ${fmtInt(k)} ${f.selected} are a census of one outcome, not a sample of ${f.population}. No sentence in the report may start "${f.population} in general".\n- **Cause.** Nothing was assigned. Whatever else differs between the two groups arrived with them, and the comparison cannot separate it from the difference being measured.\n\nWhat it does not cost is the description, and the description has a timestamp in it. The ${fmt(gap, 2)} ${f.units} gap was recorded ${f.beforeMark}, so the ordering is fixed: the ${f.selected} were already running high when the measurement was taken, and only later did ${f.outcome} happen. A theory in which the outcome produced the measurement has to explain how.\n\nThe move that does not work is the one that reaches for the arithmetic. $P = ${fmtP(p)}$ is computed under a null model that was handed a sampling scheme; it cannot audit the scheme. And the move that gives too much away is withdrawing the finding: the report keeps it, states the two limits in its own words, and lets the reader check that nothing above them was claimed.`,
      misconception: 'Answering a design objection with a statistic. Selection effects live upstream of every number the procedure returns, so the answer is a sentence about when the data were recorded and what the conclusion is bounded to — never a smaller p-value.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Numeric — a p-value from a stated t and df
// ---------------------------------------------------------------------------------------------

export const twoSamplePValue = defineGenerator({
  id: 'act-7/two-sample-p-value',
  label: 'A p-value from t and df, one tail or two',
  ap_topics: ['7.9'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const twoSided = rng.bool(0.5)
    const useWelch = rng.bool(0.65)

    const drawn = retry(
      rng,
      (r) => {
        const n1 = smallN(r, 8, 28)
        const n2 = smallN(r, 8, 28)
        const welch = Math.round((Math.min(n1, n2) - 1 + r.uniform(0.2, Math.max(0.3, Math.abs(n1 - n2) / 2 + 3))) * 100) / 100
        const t = Math.round(r.uniform(-3.4, 3.4) * 1000) / 1000
        return { n1, n2, welch, t }
      },
      ({ n1, n2, welch, t }) => {
        if (n1 === n2 || reservedCount(n1) || reservedCount(n2)) return false
        if (Math.abs(t) < 0.7 || reservedStat(Math.abs(t)) || reservedStat(welch)) return false
        const df = useWelch ? welch : conservativeDf(n1, n2)
        const p = pValueT(t, df, twoSided ? 'two-sided' : t > 0 ? 'greater' : 'less')
        return p > 0.0004 && p < 0.42
      },
    )

    const { n1, n2, welch, t } = drawn
    const cons = conservativeDf(n1, n2)
    const df = useWelch ? welch : cons
    const alt = twoSided ? ('two-sided' as const) : t > 0 ? ('greater' as const) : ('less' as const)
    const p = pValueT(t, df, alt)
    const oneTail = pValueT(Math.abs(t), df, 'greater')
    const other = pValueT(t, useWelch ? cons : welch, alt)

    const altText = twoSided ? `$H_a: \\mu_1 - \\mu_2 \\neq 0$` : t > 0 ? `$H_a: \\mu_1 - \\mu_2 > 0$` : `$H_a: \\mu_1 - \\mu_2 < 0$`

    return {
      prompt: `${ctx.office} ran a two-sample $t$-test for the ${ctx.parameter}, on **${fmtInt(n1)} ${ctx.groupA}** and **${fmtInt(n2)} ${ctx.groupB}**, against ${altText}. The package prints\n\n$$t = ${fmt(t, 3)} \\qquad df = ${useWelch ? `${fmt(welch, 2)}\\ \\text{(Welch)}` : `\\min(n_1 - 1,\\ n_2 - 1) = ${fmtInt(cons)}\\ \\text{(conservative)}`}$$\n\nReport the **$p$-value** for that alternative${p >= 0.0001 ? ', to four decimal places' : ''}.`,
      answer: numericAnswer(p, 'pValue'),
      hints: [
        'A p-value is an area under the null curve, and the alternative decides which area. One-sided takes the tail beyond the statistic on the side the alternative points; two-sided takes both tails.',
        `The upper tail beyond $|t| = ${fmt(Math.abs(t), 3)}$ on ${fmt(df, 2)} degrees of freedom is ${fmtP(oneTail)}. ${twoSided ? 'The alternative here points both ways.' : 'The alternative here points one way, and the statistic falls on that side.'}`,
        `\`tcdf(${t > 0 ? `${fmt(Math.abs(t), 3)}, 1E99` : `-1E99, ${fmt(t, 3)}`}, ${fmt(df, 2)})\`${twoSided ? ', then double it' : ''}.`,
      ],
      solution: `$$P\\left(T_{${fmt(df, 2)}} ${twoSided ? `\\ge |${fmt(t, 3)}|\\ \\text{or} \\le -|${fmt(t, 3)}|` : t > 0 ? `\\ge ${fmt(t, 3)}` : `\\le ${fmt(t, 3)}`}\\right) = ${fmtP(p)}$$\n\nThe one-tail area beyond $|t| = ${fmt(Math.abs(t), 3)}$ is ${fmtP(oneTail)}. ${twoSided ? `Doubling it for the two-sided alternative gives **${fmtP(p)}**.` : `The alternative names one direction and the statistic falls on that side, so the answer is that tail alone: **${fmtP(p)}**.`}\n\nTwo places this goes wrong. The first is the tail: reading a two-sided alternative as one-sided halves the p-value, and choosing the tail after seeing which way the data fell is a two-sided procedure reporting a one-sided number. The alternative is written from the question, before the statistic exists.\n\nThe second is the degrees of freedom. The same $t = ${fmt(t, 3)}$ on ${useWelch ? `the conservative ${fmtInt(cons)}` : `Welch's ${fmt(welch, 2)}`} would return ${fmtP(other)} instead of ${fmtP(p)}. ${Math.abs(other - p) < 0.002 ? 'Here the two are close enough that no decision turns on it, and the write-up still names which was used.' : 'Close, and not the same, which is why the write-up names which rule produced the number.'}`,
      misconception: 'Halving or doubling the wrong way. The calculator returns the p-value for whichever alternative is highlighted on its screen; if the highlighted alternative and the question disagree, the number is right for a question nobody asked.',
    }
  },
})
