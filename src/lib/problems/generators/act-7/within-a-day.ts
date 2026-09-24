/**
 * act-7-03 · Within a Day — drills. AP 7.4, 7.5: hypotheses and conditions for a test about a mean,
 * the t statistic and its p-value with s standing in for σ, the conclusion in context, what a
 * p-value is a probability of, and the two things that make a comparison of means go quiet — a
 * subset averaged into its population, and a comparison with no power against the effect it is
 * looking for.
 *
 *   act-7/t-test-setup           choice   hypotheses and conditions for a described situation
 *   act-7/t-test-statistic       numeric  t, df or p for a one-sample test
 *   act-7/t-test-conclusion      interp   the shared `significanceTestConclusion` template
 *   act-7/interpret-p-value-mean interp   what the p-value is the probability of
 *   act-7/pooling-trap           numeric  k late units averaged into a population of N
 *   act-7/power-of-a-comparison  numeric  power of a two-group comparison against a stated effect
 *
 * `act-7/t-test-setup` is checkpoint q4 and `act-7/t-test-statistic` is q5.
 *
 * The nineteen, the nine hundred and the seventeen hundred belong to the mission beats. Every
 * framing here is another office's file, and `reservedCount` keeps the counts off the Act's own.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import { significanceTestConclusion } from '@/lib/problems/rubrics'
import type { RubricGroup } from '@/lib/problems/types'
import { normal, oneMeanTest, pValueZ } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'
import { ALPHAS, ONE_SAMPLE_CONTEXTS, TWO_SAMPLE_CONTEXTS, reservedCount, reservedStat, shuffleChoice, smallN, type Candidate, type OneSampleContext } from './contexts'

/** Summary statistics for a one-sample test, with a standard the mean is read against. */
function drawTestCase(rng: Rng, c: OneSampleContext, nLo = 8, nHi = 26) {
  return retry(
    rng,
    (r) => {
      const n = smallN(r, nLo, nHi)
      const f = 10 ** c.digits
      const mu0 = Math.round(c.centre * f) / f
      const shift = r.uniform(0.3, 1.5) * c.spread * (r.bool(0.75) ? 1 : -1)
      const xbar = Math.round((mu0 + shift) * f) / f
      const s = Math.round(r.uniform(c.spread * 0.6, c.spread * 1.4) * f) / f
      return { n, mu0, xbar, s }
    },
    ({ n, mu0, xbar, s }) => s > 0 && xbar !== mu0 && !reservedCount(n) && !reservedStat(s) && !reservedStat(Math.abs((xbar - mu0) / (s / Math.sqrt(n)))),
  )
}

/**
 * `significanceTestConclusion` forbids the token "reject" in a fail-to-reject conclusion, and the
 * Thebe radiator shop measures *rejected* heat — its exemplar trips its own rubric. Reported to the
 * lead as a `contexts.ts` wording request; until then the conclusion drill skips that framing.
 */
const CONCLUSION_CONTEXTS = ONE_SAMPLE_CONTEXTS.filter((c) => !/reject/i.test(`${c.measure} ${c.population} ${c.parameter}`))

/**
 * Power of a one-sided two-group comparison of means against a stated effect, at a stated SE.
 * Assembled from the same two library pieces the Act's own power figure uses: the standard normal
 * quantile for the rejection cutoff and the standard normal tail for the area beyond it. With group
 * sizes in the hundreds the t distribution is the normal to four decimals.
 */
function powerAgainst(effect: number, se: number, alpha: number): { cutoff: number; power: number; beta: number } {
  const cutoff = normal.standardQuantile(1 - alpha) * se
  const power = normal.sf((cutoff - effect) / se)
  return { cutoff, power, beta: 1 - power }
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — hypotheses and conditions. Checkpoint q4.
// ---------------------------------------------------------------------------------------------

export const tTestSetup = defineGenerator({
  id: 'act-7/t-test-setup',
  label: 'Hypotheses and conditions for a test about a mean',
  ap_topics: ['7.4'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const { n, mu0, xbar, s } = drawTestCase(rng, c)
    const above = xbar > mu0
    const dir = above ? 'above' : 'below'
    const sym = above ? '>' : '<'
    const wrongSym = above ? '<' : '>'

    const cands: Candidate[] = [
      {
        text: `$H_0: \\mu = ${fmt(mu0, c.digits)}$ against $H_a: \\mu ${sym} ${fmt(mu0, c.digits)}$, where $\\mu$ is the true ${c.parameter}; a **one-sample $t$-test** on ${fmtInt(n - 1)} degrees of freedom, with Normality argued from a graph of the ${fmtInt(n)} readings.`,
        correct: true,
        why: null,
      },
      {
        text: `$H_0: \\bar{x} = ${fmt(mu0, c.digits)}$ against $H_a: \\bar{x} ${sym} ${fmt(mu0, c.digits)}$; a one-sample $t$-test on ${fmtInt(n - 1)} degrees of freedom.`,
        correct: false,
        why: `Hypotheses are always about a **parameter**, never a statistic. $\\bar{x} = ${fmt(xbar, c.digits)}$ is known exactly and there is nothing to hypothesise about it. The unknown is $\\mu$, the ${c.parameter}.`,
      },
      {
        text: `$H_0: \\mu = ${fmt(mu0, c.digits)}$ against $H_a: \\mu ${sym} ${fmt(mu0, c.digits)}$; a **one-sample $z$-test**, using $\\sigma = ${fmt(s, c.digits)}$ from the sample.`,
        correct: false,
        why: `The hypotheses are right and the procedure is not. ${fmt(s, c.digits)} is $s$, computed from these ${fmtInt(n)} ${c.unit}; calling it $\\sigma$ does not make it known. With an estimated standard deviation in the denominator the statistic follows $t$ on ${fmtInt(n - 1)} df, and the $z$ reading would report a smaller p-value than the data support.`,
      },
      {
        text: `$H_0: \\mu = ${fmt(mu0, c.digits)}$ against $H_a: \\mu ${wrongSym} ${fmt(mu0, c.digits)}$, the direction the ${fmtInt(n)} readings came out; a one-sample $t$-test on ${fmtInt(n - 1)} degrees of freedom.`,
        correct: false,
        why: `That alternative points the wrong way for the question the office asked, and it also points the way the data happened to fall — which is the deeper problem. The alternative is written from the question before the data are looked at. Choosing the tail afterwards is a two-sided procedure reporting a one-sided number.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office} wants to know whether the ${c.parameter} runs **${dir}** ${c.standardLabel} of **${fmt(mu0, c.digits)} ${c.units}**. It has **${fmtInt(n)}** ${c.unit} measured at random, with $\\bar{x} = ${fmt(xbar, c.digits)}$ and $s = ${fmt(s, c.digits)} \\text{ ${c.units}}$, and a dotplot with no outliers and no strong skew. No long-run standard deviation exists for this measurement.\n\nWhich setup is correct?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two questions settle this. What kind of quantity does a hypothesis talk about? And what is actually sitting in the denominator of the standardized statistic?',
        `The office asked whether the true mean runs ${dir} ${fmt(mu0, c.digits)}, so the alternative points that way and is written before the readings are looked at. The standard deviation ${fmt(s, c.digits)} came out of the same ${fmtInt(n)} ${c.unit} as the mean.`,
      ],
      solution: `**${options[correct]}**\n\n**Hypotheses** are statements about the population. $H_0: \\mu = ${fmt(mu0, c.digits)}$ says ${c.standardLabel} is the truth; $H_a: \\mu ${sym} ${fmt(mu0, c.digits)}$ is the office's question, written down before the data are read. $\\bar{x} = ${fmt(xbar, c.digits)}$ appears nowhere in either: it is the evidence, not the claim.\n\n**Procedure:** $\\sigma$ is unknown, so the standardized statistic is $t = (\\bar{x} - \\mu_0)/(s/\\sqrt{n})$ on $n - 1 = ${fmtInt(n - 1)}$ degrees of freedom.\n\n**Conditions**, all three with numbers attached: the ${fmtInt(n)} ${c.unit} were drawn at random; ${fmtInt(10 * n)} is well under the number of ${c.population} on the register, so the 10% condition holds; and with $n = ${fmtInt(n)}$ below thirty, Normality rests on the dotplot showing no outliers and no strong skew.`,
      misconception: 'Writing the hypotheses about x̄. A hypothesis is a claim about a parameter — a number nobody has measured. The sample mean is already known and needs no test.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — t, df or p. Checkpoint q5.
// ---------------------------------------------------------------------------------------------

export const tTestStatistic = defineGenerator({
  id: 'act-7/t-test-statistic',
  label: 'One-sample t: the statistic, the df or the p-value',
  ap_topics: ['7.4', '7.5'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const { n, mu0, xbar, s } = drawTestCase(rng, c)
    const above = xbar > mu0
    const alt = above ? ('greater' as const) : ('less' as const)
    const result = oneMeanTest({ mean: xbar, sd: s, n }, { mu0, alt, random: true })
    const df = n - 1
    const se = result.se
    const tStat = result.statistic
    const p = result.pValue as number
    const askP = rng.bool(0.5)

    const zP = pValueZ(tStat, alt)

    return {
      prompt: `${c.office} tests whether the ${c.parameter} runs ${above ? 'above' : 'below'} ${c.standardLabel} of **${fmt(mu0, c.digits)} ${c.units}**, from **${fmtInt(n)}** ${c.unit} measured at random:\n\n$$\\bar{x} = ${fmt(xbar, c.digits)}\\ \\text{${c.units}} \\qquad s = ${fmt(s, c.digits)}\\ \\text{${c.units}} \\qquad n = ${fmtInt(n)}$$\n\nConditions have been checked. Report the **${askP ? 'p-value for the one-sided test, to four decimal places' : 't statistic, to two decimal places'}**.`,
      answer: askP ? numericAnswer(p, 'pValue') : numericAnswer(tStat, 'testStat'),
      hints: [
        askP
          ? 'A p-value is a tail area under the null distribution. Two things fix which curve: the statistic, and the degrees of freedom.'
          : 'The statistic is a distance measured in standard errors: how far the sample mean sits from the hypothesised value, divided by how far it would typically sit by chance alone.',
        `$SE = s/\\sqrt{n} = ${fmt(s, c.digits)}/\\sqrt{${fmtInt(n)}} = ${fmt(se, 5)}$, and $df = n - 1 = ${fmtInt(df)}$.`,
        askP
          ? `$t = ${fmt(tStat, 4)}$ on ${fmtInt(df)} df, one tail: \`tcdf(${above ? `${fmt(tStat, 3)}, 1E99` : `-1E99, ${fmt(tStat, 3)}`}, ${fmtInt(df)})\`.`
          : `$(${fmt(xbar, c.digits)} - ${fmt(mu0, c.digits)}) \\div ${fmt(se, 5)}$, to two decimals.`,
      ],
      solution: `$$SE = \\frac{s}{\\sqrt{n}} = \\frac{${fmt(s, c.digits)}}{\\sqrt{${fmtInt(n)}}} = ${fmt(se, 5)} \\qquad df = ${fmtInt(n)} - 1 = ${fmtInt(df)}$$\n\n$$t = \\frac{\\bar{x} - \\mu_0}{SE} = \\frac{${fmt(xbar, c.digits)} - ${fmt(mu0, c.digits)}}{${fmt(se, 5)}} = ${fmt(tStat, 4)}$$\n\n$$P\\left(T_{${fmtInt(df)}} ${above ? '\\ge' : '\\le'} ${fmt(tStat, 4)}\\right) = ${fmtP(p)}$$\n\nThe answer asked for is **${askP ? fmtP(p) : fmt(tStat, 2)}**.\n\nOn a TI-84: \`STAT\` \`▸ TESTS\` \`2:T-Test\`, **Inpt: Stats**, $\\mu_0 = ${fmt(mu0, c.digits)}$, $\\bar{x} = ${fmt(xbar, c.digits)}$, $S_x = ${fmt(s, c.digits)}$, $n = ${fmtInt(n)}$, alternative $\\mu ${above ? '>' : '<'} \\mu_0$. The screen returns $t$ and $p$ together, and the $p$ it returns is for whichever alternative is highlighted.\n\nRead off a standard normal table instead, the same statistic gives ${fmtP(zP)} — ${zP < p ? 'smaller than' : 'different from'} the honest ${fmtP(p)}, because $t$ on ${fmtInt(df)} df carries more area in its tail.`,
      misconception: `Putting the sample mean into $\\mu_0$, or dividing by $s$ instead of $s/\\sqrt{n}$. The denominator is the standard error of $\\bar{x}$, ${fmt(se, 5)}, not the spread of one ${c.unit.replace(/s$/, '')}, ${fmt(s, c.digits)}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — the conclusion in context
// ---------------------------------------------------------------------------------------------

export const tTestConclusion = defineGenerator({
  id: 'act-7/t-test-conclusion',
  label: 'Conclusion in context for a test about a mean',
  ap_topics: ['7.5'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CONCLUSION_CONTEXTS)
    const alpha = pickContext(rng, ALPHAS)
    const { n, mu0, xbar, s } = drawTestCase(rng, c)
    const above = xbar > mu0
    const alt = above ? ('greater' as const) : ('less' as const)
    const result = oneMeanTest({ mean: xbar, sd: s, n }, { mu0, alt, random: true })
    const p = result.pValue as number
    const reject = p < alpha

    const answer = significanceTestConclusion({
      pValue: p,
      alpha,
      direction: alt,
      parameterContext: { parameter: 'mean', population: c.population, variable: c.measure, units: c.units, nullValue: mu0 },
    })

    return {
      prompt: `${c.office} tested $H_0: \\mu = ${fmt(mu0, c.digits)}$ against $H_a: \\mu ${above ? '>' : '<'} ${fmt(mu0, c.digits)}$ for the ${c.parameter}, on **${fmtInt(n)}** ${c.unit} measured at random, at $\\alpha = ${fmt(alpha, 2)}$. Conditions were checked and met. The one-sample $t$-test returned\n\n$$t = ${fmt(result.statistic, 3)} \\quad df = ${fmtInt(n - 1)} \\quad p = ${fmtP(p)}$$\n\nWrite the **conclusion in context**.`,
      answer,
      hints: [
        'A conclusion has four parts and drops none of them: the decision, the comparison that justified it, evidence language, and the claim itself named in context.',
        `Compare ${fmtP(p)} with $\\alpha = ${fmt(alpha, 2)}$ and say which is larger. Then say what there ${reject ? 'is' : 'is not'} convincing evidence of, naming the ${c.parameter} and the ${c.population}.`,
        `The verb is "${reject ? 'reject' : 'fail to reject'}" — and never "accept", in either direction.`,
      ],
      solution: `**${answer.exemplar}**\n\n${
        reject
          ? `${fmtP(p)} is below $\\alpha = ${fmt(alpha, 2)}$: a result this extreme would be uncommon if $\\mu$ really were ${fmt(mu0, c.digits)}, so $H_0$ is rejected. What that buys is evidence, not proof. The conclusion names the ${c.parameter} and the ${c.population}, because a conclusion that could be pasted into any report is a conclusion about nothing.`
          : `${fmtP(p)} is above $\\alpha = ${fmt(alpha, 2)}$: a result this extreme is not unusual when $\\mu = ${fmt(mu0, c.digits)}$, so $H_0$ is not rejected. The verb is **fail to reject**, and the reason it matters is that "accept $H_0$" claims something the test cannot deliver. Failing to detect a difference is not the same as establishing there is none, and with ${fmtInt(n)} ${c.unit} there are plenty of real differences this test would have missed.`
      }`,
      misconception: reject
        ? 'Writing that the test "proves" the claim, or reporting p without α. A significance test returns evidence at a stated level, and both numbers belong in the sentence.'
        : '"Accept H₀", or "there is no difference". A test that fails to reject has found the data consistent with H₀, which is a much weaker statement than H₀ being true.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — what the p-value is a probability of
// ---------------------------------------------------------------------------------------------

export const interpretPValueMean = defineGenerator({
  id: 'act-7/interpret-p-value-mean',
  label: 'What the p-value means, for a test about a mean',
  ap_topics: ['7.5'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    /* A p-value the learner can quote back as a four-decimal number, so the rubric can require it. */
    const drawn = retry(
      rng,
      (r) => {
        const d = drawTestCase(r, c)
        const a = d.xbar > d.mu0 ? ('greater' as const) : ('less' as const)
        return { ...d, alt: a, test: oneMeanTest({ mean: d.xbar, sd: d.s, n: d.n }, { mu0: d.mu0, alt: a, random: true }) }
      },
      ({ test }) => (test.pValue as number) >= 0.001 && (test.pValue as number) <= 0.45,
    )
    const { n, mu0, xbar, alt, test: result } = drawn
    const above = alt === 'greater'
    const p = result.pValue as number
    const dirWord = above ? 'above' : 'below'

    const required: RubricGroup[] = [
      {
        label: 'Conditions the statement on H₀ being true',
        phrasings: ['assuming null true', 'if null true', 'assuming null correct', 'if null were true', 'given null true', 'suppose null true', 'when null true'],
        polarity: 'any',
        feedback: `Begin from the null world: "assuming the null hypothesis is true, so that the true ${c.parameter} is ${fmt(mu0, c.digits)} ${c.units}…". Every p-value is a conditional probability, and that condition is the first clause.`,
      },
      {
        label: 'Says "a result at least as extreme"',
        phrasings: ['at least as extreme', 'at least as large', 'at least as far', 'at least as high', 'at least as low', 'as extreme or more', 'this extreme or more'],
        polarity: 'any',
        feedback: 'A p-value is the chance of a result **at least as extreme** as the observed one, not the chance of exactly the value observed.',
      },
      {
        label: 'Cites the p-value',
        phrasings: [numberRegex(p, 4, 1), numberRegex(p * 100, 2, 1)],
        polarity: 'any',
        feedback: `Give the number: ${fmtP(p)}, or ${fmtPct(p, 2)} of samples.`,
      },
      {
        label: 'Refers to repeated samples of this size',
        phrasings: ['samples', 'repeated sampling', 'random samples', 'such samples', 'long run', numberRegex(n, 0, 0)],
        polarity: 'any',
        feedback: `Say what is being repeated: samples of ${fmtInt(n)} ${c.unit} drawn the same way.`,
      },
      contextGroup('Names the context', [c.population, c.measure], {
        feedback: `Say what and whom: ${c.measure} of ${c.population}.`,
      }),
    ]

    const exemplar = `Assuming the null hypothesis is true, so that the true ${c.parameter} of all ${c.population} is exactly ${fmt(mu0, c.digits)} ${c.units}, about ${fmtP(p)} of all random samples of ${fmtInt(n)} ${c.unit} would give a sample mean ${c.measure} at least as far ${dirWord} ${fmt(mu0, c.digits)} ${c.units} as the ${fmt(xbar, c.digits)} ${c.units} these ${fmtInt(n)} ${c.unit} produced.`

    return {
      prompt: `${c.office}'s one-sample $t$-test of $H_0: \\mu = ${fmt(mu0, c.digits)}$ against $H_a: \\mu ${above ? '>' : '<'} ${fmt(mu0, c.digits)}$ for the ${c.parameter}, on **${fmtInt(n)}** ${c.unit}, returned $t = ${fmt(result.statistic, 3)}$ on ${fmtInt(n - 1)} df and\n\n$$p = ${fmtP(p)}$$\n\n**Interpret that p-value.** Not the decision — the probability itself: what is it the probability of?`,
      answer: {
        type: 'interpretation',
        required,
        forbidden: [
          { phrase: /\bprobability\b[^.]{0,30}\bnull\b[^.]{0,20}\b(?:true|correct)\b/, label: 'The probability that H₀ is true', why: 'A p-value is computed **assuming** H₀. It can say nothing about how likely H₀ is; that would need a prior, and this procedure has none.' },
          { phrase: /\bprobability\b[^.]{0,40}\b(?:due to chance|by chance alone)\b/, label: 'The probability the result is "due to chance"', why: 'Every result is partly chance. The p-value is the chance of a result this extreme *in the null world*, not the chance that chance produced this one.' },
          { phrase: /\bprobability\b[^.]{0,30}\b(?:alternative|hypothesis a|ha)\b[^.]{0,20}\b(?:true|correct)\b/, label: 'The probability that Hₐ is true', why: 'Neither hypothesis gets a probability from this procedure. The p-value is a property of the data under H₀.' },
        ],
        exemplar,
        minWords: 18,
      },
      hints: [
        'Start in the world where the null hypothesis is exactly true, and stay there for the whole sentence. The p-value never leaves that world.',
        `Four things have to be in it: the assumption ($\\mu = ${fmt(mu0, c.digits)}$), the repetition (samples of ${fmtInt(n)} ${c.unit}), the number, and what counts as "at least as extreme" here — a sample mean at least as far ${dirWord} ${fmt(mu0, c.digits)} as ${fmt(xbar, c.digits)}.`,
        `Then check what you have not written. The sentence must not contain the probability that $H_0$ is true, and must not say the result was "due to chance".`,
      ],
      solution: `**${exemplar}**\n\nThe shape of that sentence is fixed and worth memorising, because every part of it is load-bearing.\n\n- **"If the true mean were ${fmt(mu0, c.digits)}"** — the whole probability is conditional on $H_0$. Drop this and the sentence becomes a claim about the hypothesis, which is the error the rest of the sentence exists to avoid.\n- **"in about ${fmtP(p)} of all random samples of ${fmtInt(n)}"** — the probability is over *repeated samples*, not over hypotheses. Nothing here is random except which ${fmtInt(n)} ${c.unit} you drew.\n- **"at least as far ${dirWord}"** — at least as extreme, not exactly this value. The p-value is a tail area, and a tail has everything beyond the observation in it.\n\nWhat the sentence must never say is that ${fmtP(p)} is the probability $H_0$ is true. The test assumed $H_0$ in order to compute the number; it cannot then turn round and price it.`,
      misconception: `"There is a ${fmtP(p)} probability that the null hypothesis is true." The p-value is computed by assuming the null and asking about the data. Reversing the two is the most common error in the whole unit.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — the pooling trap
// ---------------------------------------------------------------------------------------------

export const poolingTrap = defineGenerator({
  id: 'act-7/pooling-trap',
  label: 'A late subset averaged into its population',
  ap_topics: ['7.5'],
  skills: ['2', '4'],
  generate(rng) {
    const c = pickContext(rng, TWO_SAMPLE_CONTEXTS)

    const d = retry(
      rng,
      (r) => {
        const total = r.int(40, 260) * 5
        const k = r.int(8, Math.max(9, Math.round(total * 0.06)))
        const honest = Math.round(r.uniform(-0.4, 0.6) * 100) / 100
        const excess = Math.round(r.uniform(1.2, 4.2) * 100) / 100
        return { total, k, honest, excess }
      },
      ({ total, k, honest, excess }) =>
        !reservedCount(total) && !reservedCount(total - k) && !reservedCount(k) && !reservedStat(excess) && !reservedStat(honest) && !reservedStat((k * excess) / total) && k < total * 0.1,
    )

    const { total, k, honest, excess } = d
    const pooled = honest + (k * excess) / total
    const dilution = (k * excess) / total

    return {
      prompt: `${c.office} holds **${fmtInt(total)}** ${c.unit} on one run. **${fmtInt(k)}** of them are running an average of **${fmt(excess, 2)} ${c.units}** later than the rest; the other ${fmtInt(total - k)} average **${fmt(honest, 2)} ${c.units}** against the filed plot.\n\nIf all ${fmtInt(total)} are averaged together, what mean ${c.measure} does the office read? Give it in ${c.units}, to **three decimal places**.`,
      answer: numericAnswer(pooled, 'mean', { digits: 3, units: c.units }),
      hints: [
        'A mean over a mixed group is the weighted average of the group means, with the weights being the counts. Write it that way before touching a calculator.',
        `$\\dfrac{${fmtInt(total - k)} \\times ${fmt(honest, 2)} + ${fmtInt(k)} \\times (${fmt(honest, 2)} + ${fmt(excess, 2)})}{${fmtInt(total)}}$ — or, more simply, the honest mean plus the excess carried by ${fmtInt(k)} of ${fmtInt(total)}.`,
        `${fmt(honest, 2)} + ${fmtInt(k)} × ${fmt(excess, 2)} ÷ ${fmtInt(total)}, to three decimals.`,
      ],
      solution: `The ${fmtInt(k)} late ${c.unit} average $${fmt(honest, 2)} + ${fmt(excess, 2)} = ${fmt(honest + excess, 2)}$ ${c.units}; the other ${fmtInt(total - k)} average ${fmt(honest, 2)}.\n\n$$\\bar{x}_{\\text{all}} = \\frac{${fmtInt(total - k)}(${fmt(honest, 2)}) + ${fmtInt(k)}(${fmt(honest + excess, 2)})}{${fmtInt(total)}} = ${fmt(honest, 2)} + \\frac{${fmtInt(k)} \\times ${fmt(excess, 2)}}{${fmtInt(total)}} = \\mathbf{${fmt(pooled, 3)}}\\ \\text{${c.units}}$$\n\nThe whole effect of ${fmtInt(k)} ${c.unit} running ${fmt(excess, 2)} ${c.units} late is a shift of **${fmt(dilution, 4)} ${c.units}** on the fleet mean — the excess multiplied by ${fmtInt(k)}/${fmtInt(total)} = ${fmt(k / total, 4)}.\n\nThat multiplier is the lesson. A subset averaged into its population is scaled by its own share of it, and a small share is a very effective way to make a large effect small. The ${fmtInt(k)} ${c.unit} did not get less late; the average stopped being able to see them. The fix is not a better test on the pooled column. It is to stop pooling: compare the ${fmtInt(k)} against the rest as two groups, where the difference is ${fmt(excess, 2)} and not ${fmt(dilution, 4)}.`,
      misconception: `Reading a pooled mean of ${fmt(pooled, 3)} as evidence that nothing is wrong with any of the ${fmtInt(total)} ${c.unit}. The average is exactly what it should be if ${fmtInt(k)} of them are ${fmt(excess, 2)} ${c.units} late, which is why the average is the wrong place to look.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Numeric — power of a comparison against a stated effect
// ---------------------------------------------------------------------------------------------

export const powerOfAComparison = defineGenerator({
  id: 'act-7/power-of-a-comparison',
  label: 'Power of a two-group comparison against a stated effect',
  ap_topics: ['7.5'],
  skills: ['2', '4'],
  generate(rng) {
    const c = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const alpha = pickContext(rng, ALPHAS)

    const d = retry(
      rng,
      (r) => {
        const se = Math.round(r.uniform(0.06, 0.4) * 1000) / 1000
        const effect = Math.round(se * r.uniform(0.25, 2.2) * 1000) / 1000
        return { se, effect }
      },
      ({ se, effect }) => {
        const { power } = powerAgainst(effect, se, alpha)
        return effect > 0 && power > 0.06 && power < 0.94 && !reservedStat(se) && !reservedStat(effect)
      },
    )

    const { se, effect } = d
    const { cutoff, power, beta } = powerAgainst(effect, se, alpha)
    const zCut = normal.standardQuantile(1 - alpha)

    return {
      prompt: `${c.office} compares the ${c.parameter} between **${c.groupA}** and **${c.groupB}**, one-sided, at $\\alpha = ${fmt(alpha, 2)}$. With the group sizes it has, the standard error of the difference in sample means is **${fmt(se, 3)} ${c.units}**, and with several hundred ${c.unit} in each group the $t$ distribution is the standard normal to four decimal places.\n\nSuppose the true difference is **${fmt(effect, 3)} ${c.units}**. What is the **power** of this comparison against that difference? Give a probability to **three decimal places**.`,
      answer: numericAnswer(power, 'other', { digits: 3, tolerance: 0.0015 }),
      hints: [
        'Power is a probability computed in the world where the alternative is true. Two steps: find the observed difference that would make the test reject, then ask how often that world produces one.',
        `The cutoff first, in the null world: reject when the observed difference exceeds $z_{${fmt(1 - alpha, 2)}} \\times SE = ${fmt(zCut, 4)} \\times ${fmt(se, 3)}$.`,
        `Then the alternative world, where differences are centred at ${fmt(effect, 3)} with the same SE: $P(\\text{difference} > ${fmt(cutoff, 4)})$, standardized as $(${fmt(cutoff, 4)} - ${fmt(effect, 3)}) \\div ${fmt(se, 3)}$ and read as an upper tail.`,
      ],
      solution: `**Step 1 — the cutoff.** The test rejects when the observed difference is far enough above zero that $H_0$ would rarely produce it:\n\n$$\\text{reject above } z^\\star SE = ${fmt(zCut, 4)} \\times ${fmt(se, 3)} = ${fmt(cutoff, 4)}\\ \\text{${c.units}}$$\n\n**Step 2 — how often the alternative clears it.** If the true difference is ${fmt(effect, 3)}, sample differences are centred there with the same standard error ${fmt(se, 3)}:\n\n$$\\text{power} = P\\left(Z > \\frac{${fmt(cutoff, 4)} - ${fmt(effect, 3)}}{${fmt(se, 3)}}\\right) = P(Z > ${fmt((cutoff - effect) / se, 4)}) = \\mathbf{${fmt(power, 3)}}$$\n\nSo $\\beta = 1 - \\text{power} = ${fmt(beta, 3)}$: with a real difference of ${fmt(effect, 3)} ${c.units} present the whole time, this comparison reports nothing ${fmtPct(beta, 0)} of the time.\n\nPower answers to three things and none of them is the data: the size of the effect you are looking for, the standard error the design gives you, and $\\alpha$. The cutoff here is ${fmt(cutoff / effect, 2)} times the effect itself, and a comparison whose cutoff sits well above what it is hunting cannot find it, however carefully the arithmetic is done afterwards.`,
      misconception: `Reading a comparison that failed to reject as evidence that the groups do not differ. Here a real difference of ${fmt(effect, 3)} ${c.units} would go unreported ${fmtPct(beta, 0)} of the time. "We found nothing" and "there is nothing" are only the same sentence when the power was high.`,
    }
  },
})
