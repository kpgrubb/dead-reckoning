/**
 * act-7-01 · Twelve Is a Margin — drills. AP 7.1, 7.2: why the sampling distribution changes when σ
 * is replaced by s, the t distribution and its degrees of freedom, the critical values and tail
 * areas it produces, and the conditions a one-sample t procedure has to state on a small sample.
 *
 *   act-7/why-t                  choice   the procedure and its df, and the reason it is t
 *   act-7/t-critical-value       numeric  t* at a stated level and df, against z*
 *   act-7/t-tail-probability     numeric  a tail area under t(df)
 *   act-7/df-and-conditions      interp   `conditionsCheck` for a one-sample t on a small sample
 *   act-7/t-vs-z-margin          numeric  how much wider the t margin is than the z margin
 *   act-7/small-sample-normality display  judge a dotplot before choosing a procedure
 *
 * `act-7/why-t` is checkpoint q1, so it stands alone in its prompt.
 *
 * The Refit set's twelve hulls, their 588 kN spec and the Act's own degrees of freedom belong to the
 * mission beats; `reservedCount` and `smallN` keep every draw here off them.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { conditionsCheck } from '@/lib/problems/rubrics'
import { normal, outliers, pValueT, skewness, t, tStar, zStar } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'
import { LEVELS, ONE_SAMPLE_CONTEXTS, reservedCount, reservedStat, shuffleChoice, smallN, type Candidate } from './contexts'

/** A population size a 10% condition can be stated against, well clear of the Act's own counts. */
function populationFor(rng: Rng, n: number): number {
  return retry(
    rng,
    (r) => n * r.int(25, 90),
    (v) => !reservedCount(v),
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — why t, and on how many degrees of freedom. Checkpoint q1.
// ---------------------------------------------------------------------------------------------

export const whyT = defineGenerator({
  id: 'act-7/why-t',
  label: 'Why t rather than z, and the degrees of freedom',
  ap_topics: ['7.1', '7.2'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const n = smallN(rng, 9, 40)
    const level = pickContext(rng, [0.9, 0.95, 0.99] as const)
    const df = n - 1

    const cands: Candidate[] = [
      {
        text: `A **t** procedure on **${fmtInt(df)}** degrees of freedom, because the population standard deviation is unknown and has been estimated by $s$ from these same ${fmtInt(n)} ${c.unit}.`,
        correct: true,
        why: null,
      },
      {
        text: `A **z** procedure, because ${fmtInt(n)} ${c.unit} is enough for the central limit theorem to make the sampling distribution of $\\bar{x}$ approximately Normal.`,
        correct: false,
        why: `The central limit theorem is about the shape of the sampling distribution of $\\bar{x}$, and it is not what decides between $z$ and $t$. What decides it is the denominator: with $\\sigma$ replaced by $s$, the standardized statistic follows $t$ on $n - 1$ df at every sample size. The CLT is a separate condition, and it has been satisfied here too.`,
      },
      {
        text: `A **t** procedure on **${fmtInt(n)}** degrees of freedom, one for each of the ${c.unit} in the sample.`,
        correct: false,
        why: `Degrees of freedom are $n - 1 = ${fmtInt(df)}$, not $n$. One is spent estimating $\\bar{x}$ from the same data: once the mean and any ${fmtInt(df)} of the deviations are fixed, the last deviation has no freedom left, because the deviations sum to zero.`,
      },
      {
        text: `A **t** procedure on **${fmtInt(df)}** degrees of freedom, because ${fmtInt(n)} ${c.unit} is a small sample. Past thirty ${c.unit} the office would use $z$ instead.`,
        correct: false,
        why: `The df is right and the reason is not. $t$ is the distribution of $(\\bar{x} - \\mu)/(s/\\sqrt{n})$ whenever $s$ stands in for $\\sigma$, at any $n$ whatsoever. A large sample makes $t$ and $z$ numerically close — at df ${fmtInt(df)} the ${fmtPct(level, 0)} critical values are ${fmt(tStar(level, df), 3)} and ${fmt(zStar(level), 3)} — but $t$ never stops being the correct distribution, and $\\sigma$ never becomes known.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office} measured **${c.measure}** on **${fmtInt(n)}** ${c.unit} drawn at random and wants a ${fmtPct(level, 0)} interval for the ${c.parameter}. It has the ${fmtInt(n)} readings and nothing else: no long-run standard deviation for this measurement, and no figure from the manufacturer.\n\nWhich procedure applies, and on how many degrees of freedom?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask one question about the denominator of the standardized statistic: is the standard deviation in it a known population figure, or a number computed from this very sample?',
        `A quantity estimated from the data carries its own uncertainty, and that uncertainty has to show up somewhere. It shows up as a heavier-tailed distribution with a degrees-of-freedom parameter attached — here, ${fmtInt(n)} readings less the one spent on $\\bar{x}$.`,
      ],
      solution: `$\\sigma$ is unknown, so the standard error is $s/\\sqrt{n}$ with $s$ computed from the sample. The statistic $(\\bar{x} - \\mu)/(s/\\sqrt{n})$ then follows a **$t$ distribution on $n - 1 = ${fmtInt(n)} - 1 = ${fmtInt(df)}$ degrees of freedom**.\n\n**${options[correct]}**\n\nTwo things are worth keeping apart here.\n\n- **Why $t$:** the denominator is random. Each sample estimates $\\sigma$ afresh, and a sample that happens to draw a small $s$ produces a large statistic, which is why the $t$ curve carries more area in its tails than the standard normal. At ${fmtPct(level, 0)} that costs $t^\\star = ${fmt(tStar(level, df), 4)}$ against $z^\\star = ${fmt(zStar(level), 4)}$.\n- **Why $n - 1$:** the deviations $x_i - \\bar{x}$ sum to zero by construction, so only ${fmtInt(df)} of them are free to vary once $\\bar{x}$ is known.\n\nThe sample size decides how *close* $t$ and $z$ are. It never decides which one is correct.`,
      misconception: '“t is for small samples, z is for large ones.” t is for σ unknown, which in practice is nearly always. A large sample brings t* close to z*; it does not turn an estimated standard deviation into a known one.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — t* at a stated level and df
// ---------------------------------------------------------------------------------------------

export const tCriticalValue = defineGenerator({
  id: 'act-7/t-critical-value',
  label: 'Critical value t* at a level and df',
  ap_topics: ['7.1', '7.2'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const n = smallN(rng, 6, 40)
    const df = n - 1
    const ts = tStar(level, df)
    const zs = zStar(level)
    const tail = (1 - level) / 2

    return {
      prompt: `${c.office} is building a **${fmtPct(level, 0)}** confidence interval for the ${c.parameter} from **${fmtInt(n)}** ${c.unit}, with $\\sigma$ unknown.\n\nWhat is the critical value $t^\\star$? Give it to **three decimal places**.`,
      answer: numericAnswer(ts, 'other', { digits: 3 }),
      hints: [
        'Two numbers go into a critical value and neither of them is the data: the degrees of freedom, and the area the level leaves in the two tails.',
        `Degrees of freedom are $n - 1 = ${fmtInt(df)}$. A ${fmtPct(level, 0)} interval leaves $1 - ${fmt(level, 2)} = ${fmt(1 - level, 3)}$ split between two tails, so ${fmt(tail, 4)} in each, and $t^\\star$ is the value with ${fmt(1 - tail, 4)} of the distribution below it.`,
        `On the calculator: \`invT(${fmt(1 - tail, 4)}, ${fmtInt(df)})\`. \`invT\` wants the area to the LEFT.`,
      ],
      solution: `Degrees of freedom: $n - 1 = ${fmtInt(n)} - 1 = ${fmtInt(df)}$.\n\nA ${fmtPct(level, 0)} central area leaves ${fmt(1 - level, 3)} outside it, ${fmt(tail, 4)} in each tail, so $t^\\star$ is the ${fmt(1 - tail, 4)} quantile of $t_{${fmtInt(df)}}$:\n\n$$t^\\star = \\mathbf{${fmt(ts, 3)}}$$\n\nAgainst the standard normal's $z^\\star = ${fmt(zs, 3)}$ at the same level, that is ${fmt(ts - zs, 3)} larger — a margin ${fmtPct(ts / zs - 1, 1)} wider, bought by the fact that $s$ was estimated from ${fmtInt(n)} ${c.unit} rather than known.\n\nOn a TI-84: \`2nd\` \`DISTR\` \`4:invT(\` then \`invT(${fmt(1 - tail, 4)}, ${fmtInt(df)})\`. Entering ${fmt(level, 2)} instead of ${fmt(1 - tail, 4)} returns the one-sided cutoff, which is a smaller number and the wrong one for a two-sided interval.`,
      misconception: `Handing \`invT\` the confidence level itself. \`invT(${fmt(level, 2)}, ${fmtInt(df)})\` returns ${fmt(t.quantile(level, df), 3)}, the cutoff with ${fmtPct(level, 0)} below it — a one-tailed value. A two-sided interval needs ${fmt(1 - tail, 4)} to the left.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — a tail area under t(df)
// ---------------------------------------------------------------------------------------------

export const tTailProbability = defineGenerator({
  id: 'act-7/t-tail-probability',
  label: 'Tail probability under t(df)',
  ap_topics: ['7.1'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const n = smallN(rng, 5, 30)
    const df = n - 1
    const twoSided = rng.bool(0.4)

    const stat = retry(
      rng,
      (r) => Math.round(r.uniform(0.8, 3.4) * 100) / 100,
      (v) => !reservedStat(v) && pValueT(v, df, 'greater') > 0.0005,
    )
    const p = pValueT(stat, df, twoSided ? 'two-sided' : 'greater')
    const fromZ = twoSided ? 2 * normal.sf(stat) : normal.sf(stat)

    return {
      prompt: `A one-sample $t$ statistic of **${fmt(stat, 2)}** came off ${fmtInt(n)} ${c.unit} at ${c.office}.\n\nOn $t$ with **${fmtInt(df)}** degrees of freedom, what is the probability of a statistic ${twoSided ? `at least this far from zero **in either direction**` : `**at least this large**`}? Give it to **four decimal places**.`,
      answer: numericAnswer(p, 'pValue'),
      hints: [
        'A tail probability is an area under a curve, and the curve is fixed by the degrees of freedom alone. The data do not enter again.',
        `Degrees of freedom are $n - 1 = ${fmtInt(df)}$${twoSided ? ', and "in either direction" means the mirror tail below $-' + fmt(stat, 2) + '$ counts as well' : ''}.`,
        `On the calculator: \`tcdf(${twoSided ? fmt(stat, 2) + ', 1E99, ' + fmtInt(df) + ')\`, then double it' : fmt(stat, 2) + ', 1E99, ' + fmtInt(df) + ')`'}.`,
      ],
      solution: `$$P\\left(T_{${fmtInt(df)}} ${twoSided ? '\\ge |' + fmt(stat, 2) + '|' : '\\ge ' + fmt(stat, 2)}\\right) = \\mathbf{${fmtP(p)}}$$\n\n${twoSided ? `\`tcdf(${fmt(stat, 2)}, 1E99, ${fmtInt(df)})\` gives the upper tail, ${fmtP(pValueT(stat, df, 'greater'))}; doubling it for the mirror tail below $-${fmt(stat, 2)}$ gives ${fmtP(p)}.` : `\`tcdf(${fmt(stat, 2)}, 1E99, ${fmtInt(df)})\` = ${fmtP(p)}. The upper bound has to be a number, so use \`1E99\` — typed \`1\` \`2nd\` \`,\` \`99\`.`}\n\nRead off a standard normal table instead, the same statistic would have given ${fmtP(fromZ)}. On ${fmtInt(df)} degrees of freedom the $t$ curve carries more area out here, so the honest probability is the larger one. Reporting the normal's figure understates how ordinary this statistic is.`,
      misconception: `Reading the statistic off a z table. On ${fmtInt(df)} df the answer is ${fmtP(p)}; the normal gives ${fmtP(fromZ)}. The gap shrinks as df grows and never reverses: t always has the heavier tail.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — the conditions for a one-sample t on a small sample
// ---------------------------------------------------------------------------------------------

export const dfAndConditions = defineGenerator({
  id: 'act-7/df-and-conditions',
  label: 'Conditions for a one-sample t procedure',
  ap_topics: ['7.2'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const n = smallN(rng, 8, 22)
    const population = populationFor(rng, n)
    const sample = drawDataset(rng, { n, mean: c.centre, sd: c.spread, round: c.digits, shape: 'normal', accept: (xs) => outliers(xs).values.length === 0 && Math.abs(skewness(xs)) <= 0.8 })

    const answer = conditionsCheck({
      procedure: 'one-mean-t',
      random: 'sample',
      n,
      populationSize: population,
      normal: 'graph',
      context: c.population,
    })

    return {
      prompt: `${c.office} drew **${fmtInt(n)}** ${c.unit} at random from the ${fmtInt(population)} ${c.population} on its register and measured **${c.measure}** on each. A dotplot of the ${fmtInt(n)} readings is roughly symmetric, with no value outside the $1.5 \\times \\text{IQR}$ fences.\n\nBefore any interval is built: **state and check the three conditions** for a one-sample $t$ procedure here, with the numbers.`,
      data: { kind: 'dotplot', values: sample, label: `${c.measure} (${c.units})` },
      answer,
      hints: [
        'Three conditions, always in the same order, and each one needs a number or a named fact attached rather than its own name repeated back.',
        `Random: how were the ${fmtInt(n)} ${c.unit} chosen? Independent: compare $10 \\times ${fmtInt(n)}$ with the register of ${fmtInt(population)}. Normal: with $n = ${fmtInt(n)}$ under thirty, the central limit theorem is not available, so the graph has to be cited.`,
        'The third condition is the one that changes at this sample size. Say what the dotplot shows and what it does not show, in those words.',
      ],
      solution: `**${answer.exemplar}**\n\nThe third condition is the one worth slowing down on. With $n = ${fmtInt(n)}$ the central limit theorem has nothing to offer: it is a statement about what happens as $n$ grows, and ${fmtInt(n)} is not growing. So the justification has to come from the sample itself, which is why a display is drawn before an interval is quoted. The sentence that satisfies an AP reader names the graph and what it fails to show: no outliers, no strong skew.\n\nThe 10% condition is arithmetic and takes one line: $10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)}$, against a register of ${fmtInt(population)}. It is there because sampling without replacement makes draws slightly dependent, and a sample this small a fraction of its population makes the effect negligible.`,
      misconception: 'Citing the central limit theorem for a sample under thirty. The CLT says nothing about a sample of this size; the graph of the data is the only evidence available, and the condition has to be argued from it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — how much wider the t margin is
// ---------------------------------------------------------------------------------------------

export const tVsZMargin = defineGenerator({
  id: 'act-7/t-vs-z-margin',
  label: 'How much wider the t margin is than the z margin',
  ap_topics: ['7.1', '7.2'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const n = smallN(rng, 5, 26)
    const df = n - 1
    const s = Math.round(c.spread * rng.uniform(0.7, 1.4) * 100) / 100
    const se = s / Math.sqrt(n)
    const ts = tStar(level, df)
    const zs = zStar(level)
    const tMargin = ts * se
    const zMargin = zs * se
    const pctWider = (ts / zs - 1) * 100

    return {
      prompt: `${c.office} has **${fmtInt(n)}** ${c.unit} with a sample standard deviation of **${fmt(s, 2)} ${c.units}**, and wants a **${fmtPct(level, 0)}** interval for the ${c.parameter}.\n\nAn assistant builds the margin with $z^\\star$ off a normal table. By what **percentage** is the correct $t$ margin wider than that one? Give a percentage to **one decimal place**.`,
      answer: numericAnswer(pctWider, 'percent', { digits: 1, units: '%' }),
      hints: [
        'Both margins are a critical value times the same standard error. Write them both out and see what survives the division.',
        `$\\text{margin} = (\\text{critical value}) \\times s/\\sqrt{n}$, and $s/\\sqrt{n} = ${fmt(se, 4)}$ is common to both. So the ratio of the margins is the ratio of the critical values: $t^\\star$ on ${fmtInt(df)} df over $z^\\star$ at ${fmtPct(level, 0)}.`,
        `$(t^\\star / z^\\star - 1) \\times 100$, to one decimal place.`,
      ],
      solution: `$$SE = \\frac{s}{\\sqrt{n}} = \\frac{${fmt(s, 2)}}{\\sqrt{${fmtInt(n)}}} = ${fmt(se, 4)}\\ \\text{${c.units}}$$\n\n$$\\text{t margin} = ${fmt(ts, 4)} \\times ${fmt(se, 4)} = ${fmt(tMargin, 4)} \\qquad \\text{z margin} = ${fmt(zs, 4)} \\times ${fmt(se, 4)} = ${fmt(zMargin, 4)}$$\n\nThe standard error cancels, so the comparison is between the two critical values alone:\n\n$$\\frac{t^\\star}{z^\\star} - 1 = \\frac{${fmt(ts, 4)}}{${fmt(zs, 4)}} - 1 = ${fmt(pctWider / 100, 4)} = \\mathbf{${fmt(pctWider, 1)}\\%}$$\n\nThat extra width is the price of not knowing $\\sigma$, and it is charged per degree of freedom. At df ${fmtInt(df)} it costs ${fmt(pctWider, 1)}%; at df 30 the same level would cost ${fmt((tStar(level, 30) / zs - 1) * 100, 1)}%, and at df 100, ${fmt((tStar(level, 100) / zs - 1) * 100, 1)}%. An interval built with $z^\\star$ on ${fmtInt(n)} ${c.unit} is narrower than the data can support, and it captures the parameter less often than its label claims.`,
      misconception: 'Treating the two margins as interchangeable because the numbers look close. On a small sample the z margin is systematically too narrow, so an interval built that way covers the true mean less often than its stated level.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Display — judge the sample before choosing the procedure
// ---------------------------------------------------------------------------------------------

export const smallSampleNormality = defineGenerator({
  id: 'act-7/small-sample-normality',
  label: 'Is a t procedure appropriate on this sample?',
  ap_topics: ['7.2'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const n = smallN(rng, 9, 20)
    const clean = rng.bool(0.5)

    const sample = clean
      ? drawDataset(rng, { n, mean: c.centre, sd: c.spread, round: c.digits, shape: 'normal', accept: (xs) => outliers(xs).values.length === 0 && Math.abs(skewness(xs)) <= 0.7 })
      : drawDataset(rng, { n, mean: c.centre, sd: c.spread, round: c.digits, shape: rng.bool() ? 'skewRight' : 'skewLeft', accept: (xs) => outliers(xs).values.length > 0 || Math.abs(skewness(xs)) >= 1 })

    const fences = outliers(sample)
    const g1 = skewness(sample)
    const strays = fences.values.length

    const cands: Candidate[] = [
      {
        text: `Yes. With $n = ${fmtInt(n)}$ the Normal condition has to be argued from the graph, and this graph shows no outliers and no strong skew, so a $t$ procedure is appropriate.`,
        correct: clean,
        why: clean
          ? null
          : `Look again at the display. The $1.5 \\times \\text{IQR}$ fences sit at ${fmt(fences.lowFence, 2)} and ${fmt(fences.highFence, 2)}, with ${strays === 0 ? 'no reading outside them' : `${fmtInt(strays)} reading(s) outside them`}, and the skewness is ${fmt(g1, 2)}. That is not a sample a $t$ procedure can be run on without comment.`,
      },
      {
        text: `No. The graph shows ${strays > 0 ? 'at least one value outside the fences' : 'a pronounced tail on one side'}, so with only ${fmtInt(n)} ${c.unit} the Normal condition is not met and a $t$ procedure is not justified on these data as they stand.`,
        correct: !clean,
        why: !clean
          ? null
          : `The sample is well behaved: no reading outside the fences at ${fmt(fences.lowFence, 2)} and ${fmt(fences.highFence, 2)}, and a skewness of ${fmt(g1, 2)}. A small sample is allowed to be lumpy; what disqualifies it is a stray value or a long tail, and neither is here.`,
      },
      {
        text: `Yes, on the central limit theorem: the sampling distribution of $\\bar{x}$ is approximately Normal for any sample, so the shape of these ${fmtInt(n)} readings does not matter.`,
        correct: false,
        why: `The central limit theorem is a statement about what happens as $n$ grows, and $n = ${fmtInt(n)}$ is where it has least to say. Below thirty, the shape of the sample is the only evidence available about the shape of the population, which is why the graph is drawn before the procedure is chosen.`,
      },
      {
        text: `No, and the graph is beside the point: with $\\sigma$ unknown, no procedure for a mean applies to ${fmtInt(n)} ${c.unit}.`,
        correct: false,
        why: `$\\sigma$ unknown is precisely the case $t$ was built for. It is the reason to use $t$ rather than $z$, not a reason to abandon the mean. The open question is the Normal condition, and the graph is how it gets settled.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    const summary = tableMd(
      ['statistic', 'value'],
      [
        ['n', fmtInt(n)],
        ['1.5 × IQR fences', `${fmt(fences.lowFence, 2)} to ${fmt(fences.highFence, 2)}`],
        ['readings outside the fences', fmtInt(strays)],
        ['skewness G1', fmt(g1, 2)],
      ],
    )

    return {
      prompt: `${c.office} has **${fmtInt(n)}** ${c.unit} and wants an interval for the ${c.parameter}. $\\sigma$ is unknown. The ${fmtInt(n)} values of **${c.measure}**, in ${c.units}, are plotted above.\n\nIs a one-sample $t$ procedure appropriate on these data?`,
      answer: {
        type: 'display',
        display: { kind: 'dotplot', values: sample, label: `${c.measure} (${c.units})` },
        question: { type: 'choice', options, correct, feedback },
      },
      hints: [
        'Three conditions govern a t procedure and only one of them is settled by looking at a graph. Work out which, then look.',
        `With $n = ${fmtInt(n)}$ the central limit theorem is unavailable, so the Normal condition has to be argued from the display: any value stranded away from the rest, and any long tail on one side.`,
      ],
      solution: `${summary}\n\n**${options[correct]}**\n\nThe procedure is $t$ either way, because $\\sigma$ is unknown. What the display decides is whether $t$ can be *used* on ${fmtInt(n)} readings.\n\nWith $n$ below thirty the central limit theorem is not in play, so the Normal condition rests on the sample itself. The working test is the one an AP reader will accept: no value outside the $1.5 \\times \\text{IQR}$ fences (here ${fmt(fences.lowFence, 2)} to ${fmt(fences.highFence, 2)}, with ${fmtInt(strays)} outside), and no strong skew (here $G_1 = ${fmt(g1, 2)}$).\n\n${clean ? 'Both hold, so the interval can be built and the condition stated in one sentence citing the graph.' : 'One of them fails, so the honest report says so and stops. The options are to collect more ' + c.unit + ', to investigate the stray reading as a measurement rather than a value, or to use a procedure that does not lean on Normality at all.'}`,
      misconception: 'Deciding a small-sample condition from the sample size alone. n < 30 does not disqualify a t procedure, and n ≥ 15 does not license one; the graph is what settles it.',
    }
  },
})
