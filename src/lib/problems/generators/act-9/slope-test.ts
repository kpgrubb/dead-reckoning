/**
 * act-9-03 · The Fuel to Reach Kettle — drills. AP 9.4, 9.5: setting up and carrying out a test
 * for the slope of a population regression model.
 *
 *   act-9/slope-hypotheses            choice   H₀ and Hₐ about β, including a non-zero null
 *   act-9/slope-t-and-p               numeric  t = (b − β₀)/SE(b), or the P-value on n − 2 df
 *   act-9/one-sided-from-output       choice   what the printed two-sided P becomes for one tail
 *   act-9/slope-vs-physical-null      numeric  t against a value physics fixes, not against zero
 *   act-9/slope-test-conclusion       interp   the conclusion in context (`significanceTestConclusion`)
 *   act-9/what-a-slope-does-not-prove interp   scope: association, population, and no cause
 *
 * The Act's own regression — excess fuel per true tonne on the Kettle Δv, slope 0.00076 per km/s
 * against the rocket equation's 0.00079 — belongs to the mission beats. Every file here is
 * another office's, and `drawSlope` rejects any draw that would print one of DS-16's numbers back.
 */
import { defineGenerator, numericAnswer, pickContext } from '@/lib/problems/generate'
import { contextGroup } from '@/lib/problems/rubric'
import { significanceTestConclusion } from '@/lib/problems/rubrics'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup } from '@/lib/problems/types'
import { fmt, fmtInt, fmtP, pValueT, slopeTestFromComputerOutput, type Alternative } from '@/lib/stats'
import { ASSOCIATION_CONTEXTS, CLAIM_CONTEXTS, SLOPE_CONTEXTS, drawSlope, outputCaption, outputMd, outputReading, precisionWords, shuffleChoice, type Candidate } from './contexts'

const ALT_SYMBOL: Record<Alternative, string> = { greater: '>', less: '<', 'two-sided': '\\ne' }

// ---------------------------------------------------------------------------------------------
// 1. Choice — the hypotheses
// ---------------------------------------------------------------------------------------------

export const slopeHypotheses = defineGenerator({
  id: 'act-9/slope-hypotheses',
  label: 'Hypotheses for a test about a slope',
  ap_topics: ['9.4'],
  skills: ['1', '4'],
  generate(rng) {
    const againstConstant = rng.bool()
    const ctx = pickContext(rng, againstConstant ? CLAIM_CONTEXTS : ASSOCIATION_CONTEXTS)
    const beta0 = againstConstant ? ctx.required!.value : 0
    const alt: Alternative = againstConstant ? pickContext(rng, ['greater', 'two-sided'] as const) : pickContext(rng, ['greater', 'less', 'two-sided'] as const)
    const n = rng.int(9, 28)
    const nullText = fmt(beta0, beta0 === 0 ? 0 : 2)

    const question = againstConstant
      ? `**Are ${ctx.population} running ${alt === 'greater' ? 'above' : 'away from'} ${ctx.required!.label}?**`
      : alt === 'greater'
        ? `**Does ${ctx.yVar} increase with ${ctx.xVar}?**`
        : alt === 'less'
          ? `**Does ${ctx.yVar} fall as ${ctx.xVar} increases?**`
          : `**Is there a linear relationship between ${ctx.xVar} and ${ctx.yVar}?**`

    const cands: Candidate[] = [
      {
        text: `$H_0: \\beta = ${nullText}$ against $H_a: \\beta ${ALT_SYMBOL[alt]} ${nullText}$, where $\\beta$ is the slope of the **population** regression line of ${ctx.yVar} on ${ctx.xVar} for ${ctx.population}.`,
        correct: true,
        why: null,
      },
      {
        text: `$H_0: b = ${nullText}$ against $H_a: b ${ALT_SYMBOL[alt]} ${nullText}$, where $b$ is the slope of the least-squares line through these ${fmtInt(n)} ${ctx.units}.`,
        correct: false,
        why: `Hypotheses are always about a parameter, never about a statistic. $b$ is already known from the file — it is printed on the output — so there is nothing to hypothesise about it. The unknown is $\\beta$, the slope of the true line for ${ctx.population}, and the test asks what values of it are consistent with the $b$ in hand.`,
      },
      {
        text: `$H_0: \\beta ${ALT_SYMBOL[alt]} ${nullText}$ against $H_a: \\beta = ${nullText}$.`,
        correct: false,
        why: 'The two are the wrong way round. The null is always the statement of no effect or of the required value, with an equals sign, because it is the hypothesis the sampling distribution is built under. The alternative carries the inequality and is what the evidence may support.',
      },
      {
        text: againstConstant
          ? `$H_0: \\beta = 0$ against $H_a: \\beta ${ALT_SYMBOL[alt]} 0$, since a significance test about a slope is always a test against zero.`
          : `$H_0: \\rho = ${nullText}$ against $H_a: \\rho ${ALT_SYMBOL[alt]} ${nullText}$, where $\\rho$ is the population correlation between ${ctx.xVar} and ${ctx.yVar}.`,
        correct: false,
        why: againstConstant
          ? `Zero is the usual null only because in most regressions it means "no relationship". Here the relationship is not in doubt: ${ctx.required!.why}. The question is whether the rate is the required one, so the null is $\\beta = ${nullText}$ and a test against zero answers a question nobody asked.`
          : `A test about $\\rho$ and a test about $\\beta$ against zero give the identical t statistic and P-value, so this is not wrong arithmetic. It is the wrong parameter for the question, which is about the **rate** at which ${ctx.yVar} changes with ${ctx.xVar}, in ${ctx.slopeUnits}. Correlation has no units and no rate in it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} drew **${fmtInt(n)} ${ctx.units}** at random from ${ctx.population} and recorded ${ctx.xVar} and ${ctx.yVar} on each.${
        againstConstant ? ` For a process working to specification the slope is fixed at **${ctx.required!.label}**, because ${ctx.required!.why}.` : ''
      }\n\n${question}\n\n**Which pair of hypotheses states that question?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two separate decisions. Which symbol the hypotheses are about, and what number sits on the right-hand side of the equals sign in the null.',
        againstConstant
          ? `The question is not whether a relationship exists. It is whether the rate matches the ${fmt(beta0, 2)} the specification requires, so that is the null value.`
          : 'With no specification in play, "no linear relationship" is a slope of zero, and the direction of the alternative comes from the words of the question.',
      ],
      solution: `$$H_0: \\beta = ${nullText} \\qquad H_a: \\beta ${ALT_SYMBOL[alt]} ${nullText}$$\n\nwhere $\\beta$ is the slope of the population regression line of ${ctx.yVar} on ${ctx.xVar} for ${ctx.population}, in ${ctx.slopeUnits}.\n\n**Why a parameter.** The fitted slope $b$ will be computed from the ${fmtInt(n)} ${ctx.units} and is then known exactly. A hypothesis is a claim about the thing that is not known, and the test asks how surprising the computed $b$ would be if the claim were true.\n\n**Why ${nullText}.** ${
        againstConstant
          ? `${ctx.required!.why.charAt(0).toUpperCase() + ctx.required!.why.slice(1)}, so a process behaving as specified has $\\beta = ${nullText}$ exactly. Zero would mean ${ctx.yVar} does not move with ${ctx.xVar} at all, which is not what anyone is disputing.`
          : `With nothing fixing the rate in advance, the hypothesis of no effect is that the true line is flat: ${ctx.yVar} does not change with ${ctx.xVar}, so $\\beta = 0$.`
      }\n\n**Why that direction.** ${
        alt === 'two-sided'
          ? 'The question asks whether there is a departure, without naming a side, so both tails count.'
          : `The question names a side, so only the ${alt === 'greater' ? 'upper' : 'lower'} tail counts. A direction has to be chosen from the question before the data are seen; choosing it afterwards, to match the sign of $b$, halves the P-value of a test that was really two-sided.`
      }\n\n**${options[correct]}**`,
      misconception: 'Writing hypotheses about b instead of β, or defaulting to a null of zero when the problem fixes the slope at some other value.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — t and P from the output
// ---------------------------------------------------------------------------------------------

export const slopeTAndP = defineGenerator({
  id: 'act-9/slope-t-and-p',
  label: 'The t statistic and P-value for a slope',
  ap_topics: ['9.5'],
  skills: ['3'],
  generate(rng) {
    const ask = pickContext(rng, ['t', 'p'] as const)
    const alt: Alternative = pickContext(rng, ['greater', 'less', 'two-sided'] as const)
    const { ctx, fit, n } = drawSlope(rng, {
      contexts: ASSOCIATION_CONTEXTS,
      n: [8, 24],
      noiseFactor: [0.8, 1.6],
      accept: (d) => {
        // The one-sided answer must be on the side the question asks about, or the item is a trick.
        const t = d.fit.slope / d.fit.seSlope
        return Math.abs(t) > 1.6 && Math.abs(t) < 9 && (alt === 'two-sided' || (alt === 'greater') === t > 0)
      },
    })
    const test = slopeTestFromComputerOutput({ b: fit.slope, seB: fit.seSlope, n, alt, beta0: 0 })
    const t = test.statistic
    const p = test.pValue as number
    const df = test.df as number
    const printed = outputReading(fit)

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for a random sample of **${fmtInt(n)} ${ctx.units}** from ${ctx.population} and is testing\n\n$$H_0: \\beta = 0 \\qquad H_a: \\beta ${ALT_SYMBOL[alt]} 0$$\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\n${
        ask === 't' ? `Compute the **t statistic** for this test, to **${precisionWords(2)}**.` : `Compute the **P-value** for this test. Give it to three decimal places, or write it as an inequality if it is smaller than that.`
      }`,
      answer: ask === 't' ? numericAnswer(t, 'testStat', { digits: 2 }) : numericAnswer(p, 'pValue'),
      hints: [
        'The statistic is the usual one: how many standard errors the estimate sits from the null value. The null value here is zero, which makes the arithmetic short and hides what is really going on.',
        `$t = \\dfrac{b - \\beta_0}{SE(b)} = \\dfrac{${fmt(fit.slope, ctx.digits)} - 0}{${fmt(fit.seSlope, ctx.digits)}}$, on $df = ${fmtInt(n)} - 2 = ${fmtInt(df)}$.`,
        ask === 'p'
          ? `$t = ${fmt(t, 2)}$ on ${fmtInt(df)} degrees of freedom. The software printed ${fmtP(printed.pSlope)}, which is the **two-sided** area. ${alt === 'two-sided' ? 'That is the area this alternative wants.' : 'This alternative wants one tail.'}`
          : `Carry the full precision of both numbers into the division and round once at the end.`,
      ],
      solution: `**Degrees of freedom.** $df = ${fmtInt(n)} - 2 = ${fmtInt(df)}$.\n\n**The statistic.**\n\n$$t = \\frac{b - \\beta_0}{SE(b)} = \\frac{${fmt(fit.slope, ctx.digits)} - 0}{${fmt(fit.seSlope, ctx.digits)}} = ${fmt(t, 2)}$$\n\nThe fitted slope sits ${fmt(Math.abs(t), 2)} standard errors ${t > 0 ? 'above' : 'below'} the null value of zero.\n\n**The P-value.** On $t_{${fmtInt(df)}}$, ${
        alt === 'two-sided'
          ? `both tails beyond $\\pm${fmt(Math.abs(t), 2)}$ give $P = ${fmtP(p)}$. This is the figure the software printed, because software tests two-sided against zero by default.`
          : `the ${alt === 'greater' ? 'upper' : 'lower'} tail beyond ${fmt(t, 2)} gives $P = ${fmtP(p)}$, which is half the printed ${fmtP(printed.pSlope)} because the printed value covers both tails and the sign of $b$ agrees with $H_a$.`
      }\n\n**Answer: ${ask === 't' ? fmt(t, 2) : fmtP(p)}.**\n\nWriting the subtraction out even when $\\beta_0 = 0$ is worth the three seconds: the same expression with a non-zero null is the only form of the question the printed T column cannot answer.`,
      misconception:
        alt === 'two-sided'
          ? 'Halving the printed P out of habit. The printed value is already two-sided, and this alternative is two-sided.'
          : 'Quoting the printed P for a one-sided alternative. Software prints the two-tailed area against zero; one tail is half of it, and only when the sign of b agrees with the alternative.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — what the printed P becomes for one tail
// ---------------------------------------------------------------------------------------------

export const oneSidedFromOutput = defineGenerator({
  id: 'act-9/one-sided-from-output',
  label: 'The one-sided P-value from a two-sided printout',
  ap_topics: ['9.5'],
  skills: ['2', '4'],
  generate(rng) {
    const agrees = rng.bool(0.6)
    const alt: Alternative = pickContext(rng, ['greater', 'less'] as const)
    const { ctx, fit, n } = drawSlope(rng, {
      contexts: ASSOCIATION_CONTEXTS,
      n: [8, 22],
      noiseFactor: [0.8, 1.5],
      accept: (d) => {
        const t = d.fit.slope / d.fit.seSlope
        if (!(Math.abs(t) > 1.8 && Math.abs(t) < 8)) return false
        const sideAgrees = alt === 'greater' ? t > 0 : t < 0
        return sideAgrees === agrees
      },
    })
    const printed = outputReading(fit)
    const t = printed.tSlope
    const oneSided = pValueT(t, n - 2, alt)
    const half = printed.pSlope / 2

    const cands: Candidate[] = [
      {
        text: agrees
          ? `$P = ${fmtP(half)}$ — half the printed value, because the printed P covers both tails and the sign of $b$ agrees with $H_a$.`
          : `$P = ${fmtP(oneSided)}$ — the printed value is for both tails, but $b = ${fmt(fit.slope, ctx.digits)}$ falls on the **wrong side** of zero for this alternative, so the one-tailed area is $1 - ${fmtP(half)}$ and the data are no evidence for $H_a$ at all.`,
        correct: true,
        why: null,
      },
      {
        text: agrees
          ? `$P = ${fmtP(printed.pSlope)}$ — the printed value, used as it stands, because the output already carried out the test.`
          : `$P = ${fmtP(half)}$ — half the printed value, because a one-sided alternative always halves what the software prints.`,
        correct: false,
        why: agrees
          ? `The printed P answers $H_a: \\beta \\ne 0$. This alternative names a side, and the area for one tail of a symmetric curve is half the area for two. Using the printed figure here overstates the P-value by a factor of two, which is the safe direction and still wrong.`
          : `Halving works only when the estimate lies on the side the alternative claims. Here $b = ${fmt(fit.slope, ctx.digits)}$ and $H_a$ says $\\beta ${ALT_SYMBOL[alt]} 0$, so the data point the other way: the ${alt === 'greater' ? 'upper' : 'lower'} tail beyond $t = ${fmt(t, 2)}$ is $${fmt(oneSided, 3)}$, which is most of the distribution.`,
      },
      {
        text: `$P = ${fmtP(printed.pSlope * 2)}$ — twice the printed value, because the printed P is one tail and a complete test needs both.`,
        correct: false,
        why: 'Backwards. Regression output reports a two-sided P by default: it is testing whether the coefficient differs from zero in either direction. Doubling it double-counts both tails, and for a large enough printed value it produces a P above one.',
      },
      {
        text: `The printed P cannot be used at all. A one-sided test needs its own run of the regression with the alternative set before the output is printed.`,
        correct: false,
        why: `The printed P is a function of $t = ${fmt(t, 2)}$ and ${fmtInt(n - 2)} degrees of freedom, both of which are on the page, so any tail area can be recovered from it by hand. What genuinely cannot be recovered from the printed P is a test against a **non-zero** null, because that changes the statistic itself and not merely which tail is counted.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** drawn at random from ${ctx.population}, and wants to test\n\n$$H_0: \\beta = 0 \\qquad H_a: \\beta ${ALT_SYMBOL[alt]} 0$$\n\nThe alternative was written down before the file was pulled.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\n**What is the P-value for the test the office actually wants?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Regression output is printed by software that was never told what the question is. It reports one test and one test only, and the first job is to say which test that is.',
        `Then two things decide the answer: whether the alternative names one tail or two, and which side of zero $b = ${fmt(fit.slope, ctx.digits)}$ actually fell on.`,
      ],
      solution: `**What the output printed.** $t = ${fmt(t, 2)}$ on ${fmtInt(n - 2)} degrees of freedom, with $P = ${fmtP(printed.pSlope)}$ for $H_a: \\beta \\ne 0$. Every statistics package prints that test, whatever question the analyst had.\n\n**What the office wants.** $H_a: \\beta ${ALT_SYMBOL[alt]} 0$: the ${alt === 'greater' ? 'upper' : 'lower'} tail alone.\n\n**Which side $b$ fell on.** $b = ${fmt(fit.slope, ctx.digits)}$, so $t = ${fmt(t, 2)}$ lies ${t > 0 ? 'above' : 'below'} zero, which is the ${agrees ? '**same** side the alternative claims' : '**opposite** side from the one the alternative claims'}.\n\n$$P = ${agrees ? `\\tfrac{1}{2} \\times ${fmtP(printed.pSlope)} = ${fmtP(oneSided)}` : `1 - \\tfrac{1}{2} \\times ${fmtP(printed.pSlope)} = ${fmt(oneSided, 3)}`}$$\n\n**${options[correct]}**\n\n${
        agrees
          ? 'The halving rule has a condition attached to it, and the condition is the part that gets dropped. Halve only when the estimate is on the side the alternative claims; otherwise the one-tailed area is the complement and the data are evidence against the alternative rather than for it.'
          : 'A P-value above a half is a signal to stop and reread the alternative. It means the estimate came out on the opposite side from the one claimed, and no significance level will rescue the test. The direction has to have been chosen before the data; choosing it afterwards to match the sign of $b$ is not a one-sided test.'
      }`,
      misconception: 'Halving the printed P without checking the sign of b. The rule is "half the printed value when b is on the alternative’s side", and the second clause is the one that is dropped.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — t against a value fixed by physics
// ---------------------------------------------------------------------------------------------

export const slopeVsPhysicalNull = defineGenerator({
  id: 'act-9/slope-vs-physical-null',
  label: 'Testing a slope against a required value',
  ap_topics: ['9.5'],
  skills: ['3'],
  generate(rng) {
    const ask = pickContext(rng, ['t', 'p'] as const)
    const alt: Alternative = pickContext(rng, ['greater', 'two-sided'] as const)
    const ctx = pickContext(rng, CLAIM_CONTEXTS)
    const required = ctx.required!
    const { fit, n } = drawSlope(rng, {
      contexts: [ctx],
      n: [9, 22],
      noiseFactor: [0.6, 1.2],
      slopeFactor: required.excludeFactor,
      accept: (d) => {
        const t = (d.fit.slope - required.value) / d.fit.seSlope
        return t > 1.7 && t < 9
      },
    })
    const test = slopeTestFromComputerOutput({ b: fit.slope, seB: fit.seSlope, n, alt, beta0: required.value })
    const t = test.statistic
    const p = test.pValue as number
    const df = test.df as number
    const printed = outputReading(fit)
    const digits = ctx.digits

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for a random sample of **${fmtInt(n)} ${ctx.units}** from ${ctx.population}. A process working to specification has a slope of **${required.label}**, because ${required.why}.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nTest $H_0: \\beta = ${fmt(required.value, 2)}$ against $H_a: \\beta ${ALT_SYMBOL[alt]} ${fmt(required.value, 2)}$.\n\n${
        ask === 't' ? `Give the **t statistic**, to **${precisionWords(2)}**.` : `Give the **P-value**. Three decimal places, or an inequality if it is smaller than that.`
      }`,
      answer: ask === 't' ? numericAnswer(t, 'testStat', { digits: 2 }) : numericAnswer(p, 'pValue'),
      hints: [
        'Start by working out which of the printed numbers survive the change of null. One of the five columns is still exactly right, one is still exactly right, and the other two were computed against a hypothesis nobody is testing.',
        `$t = \\dfrac{b - \\beta_0}{SE(b)}$ with $b = ${fmt(fit.slope, digits)}$, $\\beta_0 = ${fmt(required.value, 2)}$ and $SE(b) = ${fmt(fit.seSlope, digits)}$, on $df = ${fmtInt(df)}$.`,
        ask === 'p'
          ? `$t = ${fmt(t, 2)}$ on ${fmtInt(df)} degrees of freedom, and the alternative is ${alt === 'greater' ? 'one-tailed' : 'two-tailed'}. The printed P of ${fmtP(printed.pSlope)} is no use here at all.`
          : `Subtract before dividing, and keep the full precision of $b$ rather than the rounded cell.`,
      ],
      solution: `**What the printout can and cannot supply.** The **Coef** cell (${fmt(fit.slope, digits)}) and the **SE Coef** cell (${fmt(fit.seSlope, digits)}) are properties of the fit and do not depend on any hypothesis. The printed $T = ${fmt(printed.tSlope, 2)}$ and $P = ${fmtP(printed.pSlope)}$ were computed against $\\beta_0 = 0$, and the test here is against ${fmt(required.value, 2)}, so both are the answer to a different question.\n\n**The statistic.**\n\n$$t = \\frac{b - \\beta_0}{SE(b)} = \\frac{${fmt(fit.slope, digits)} - ${fmt(required.value, 2)}}{${fmt(fit.seSlope, digits)}} = ${fmt(t, 2)}$$\n\non $df = ${fmtInt(n)} - 2 = ${fmtInt(df)}$.\n\n**The P-value.** ${alt === 'greater' ? `The upper tail beyond ${fmt(t, 2)}` : `Both tails beyond $\\pm${fmt(Math.abs(t), 2)}$`} on $t_{${fmtInt(df)}}$ gives $P = ${fmtP(p)}$.\n\n**Answer: ${ask === 't' ? fmt(t, 2) : fmtP(p)}.**\n\nThe fitted slope sits ${fmt(Math.abs(t), 2)} standard errors above the specification, against ${fmt(Math.abs(printed.tSlope), 2)} standard errors above zero. The second number is larger and means nothing: no one ever suggested ${ctx.yVar} is unrelated to ${ctx.xVar}.`,
      misconception: 'Reading the T column when the null is not zero. Software tests every coefficient against zero; a different null changes the numerator of t, so the statistic has to be rebuilt from Coef and SE Coef by hand.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Interpretation — the conclusion in context
// ---------------------------------------------------------------------------------------------

export const slopeTestConclusion = defineGenerator({
  id: 'act-9/slope-test-conclusion',
  label: 'Conclusion in context for a slope test',
  ap_topics: ['9.5'],
  skills: ['4'],
  generate(rng) {
    const alpha = pickContext(rng, [0.01, 0.05, 0.1] as const)
    const reject = rng.bool(0.6)
    // A fail-to-reject on a null of zero fights the draw guard that keeps |b| above its own SE, so
    // the short results are all tests against a required value — which is the harder setup anyway.
    const againstConstant = reject ? rng.bool(0.45) : true
    const ctx = pickContext(rng, againstConstant ? CLAIM_CONTEXTS : ASSOCIATION_CONTEXTS)
    const beta0 = againstConstant ? ctx.required!.value : 0
    // The direction comes from the context's own physics: a cold run's endurance falls with load.
    const alt: Alternative = !againstConstant && ctx.beta < 0 ? 'less' : 'greater'
    const dirWord = alt === 'greater' ? 'greater than' : 'less than'

    const { fit, n } = drawSlope(rng, {
      contexts: [ctx],
      n: [9, 26],
      noiseFactor: reject ? [0.6, 1.2] : [0.8, 2.2],
      slopeFactor: againstConstant ? (reject ? ctx.required!.excludeFactor : [0.995, 1.02]) : [0.85, 1.25],
      accept: (d) => {
        const t = (d.fit.slope - beta0) / d.fit.seSlope
        const p = pValueT(t, d.n - 2, alt)
        return reject ? p < alpha * 0.6 : p > alpha * 1.8 && p < 0.92
      },
    })
    const test = slopeTestFromComputerOutput({ b: fit.slope, seB: fit.seSlope, n, alt, beta0 })
    const t = test.statistic
    const p = test.pValue as number
    const df = test.df as number
    const digits = ctx.digits
    const variable = `of ${ctx.yVar} on ${ctx.xVar}`

    const answer = significanceTestConclusion({
      pValue: p,
      alpha,
      parameterContext: {
        population: ctx.population,
        variable,
        parameter: 'slope',
        nullValue: againstConstant ? `${fmt(beta0, 2)} ${ctx.slopeUnits}` : '0',
        units: '',
      },
      direction: alt === 'greater' ? 'greater' : 'less',
      directionWords: alt === 'greater' ? ['above', 'exceed', 'higher', 'steeper'] : ['below', 'fall', 'shorter', 'decrease'],
    })

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for a random sample of **${fmtInt(n)} ${ctx.units}** from ${ctx.population}. The residual plot shows no curve and no fan; the residuals are roughly Normal.\n\n${
        againstConstant ? `A process working to specification has a slope of ${ctx.required!.label}, because ${ctx.required!.why}.\n\n` : ''
      }The test of $H_0: \\beta = ${fmt(beta0, beta0 === 0 ? 0 : 2)}$ against $H_a: \\beta ${ALT_SYMBOL[alt]} ${fmt(beta0, beta0 === 0 ? 0 : 2)}$ at $\\alpha = ${fmt(alpha, 2)}$ gives\n\n$$b = ${fmt(fit.slope, digits)}, \\quad SE(b) = ${fmt(fit.seSlope, digits)}, \\quad t = ${fmt(t, 2)}, \\quad df = ${fmtInt(df)}, \\quad P = ${fmtP(p)}$$\n\nWrite the **conclusion in context**.`,
      hints: [
        `Four things, in order: the decision, the comparison that produced it, the words "convincing evidence", and the sentence that says what the evidence is about.`,
        `$P = ${fmtP(p)}$ against $\\alpha = ${fmt(alpha, 2)}$, so the decision is to ${reject ? 'reject' : 'fail to reject'} $H_0$. Write the comparison out rather than implying it.`,
        `Then the context, which is the part the marks are in: the true slope ${variable}, for ${ctx.population}, ${reject ? `is ${dirWord}` : `has not been shown to be ${dirWord}`} ${fmt(beta0, beta0 === 0 ? 0 : 2)} ${ctx.slopeUnits}.`,
      ],
      answer,
      solution: `**${answer.exemplar}**\n\nThe four moving parts.\n\n1. **The decision**, consistent with the comparison. $P = ${fmtP(p)}$ ${reject ? '<' : '≥'} $\\alpha = ${fmt(alpha, 2)}$, so ${reject ? 'reject' : 'fail to reject'} $H_0$.\n2. **Both numbers quoted.** A conclusion that says "significant" without the P-value and the level has not shown its working.\n3. **Evidence language.** ${reject ? 'Convincing evidence *that*, never "the alternative is true" and never "proved".' : 'Failing to reject leaves $H_0$ standing as an unrefuted possibility. It is not evidence that $\\beta = ' + fmt(beta0, beta0 === 0 ? 0 : 2) + '$, and it is never "accepting" the null.'}\n4. **Context.** The parameter is the **true slope** ${variable}, measured in ${ctx.slopeUnits}, for ${ctx.population} — and for no wider group.\n\n${
        reject
          ? `What the conclusion does **not** say is as fixed as what it does. These ${fmtInt(n)} ${ctx.units} were observed, not assigned, so nothing here licenses a causal verb: ${ctx.xVar} has not been shown to *make* ${ctx.yVar} move.`
          : `A short result is not a finding of no effect. With ${fmtInt(n)} ${ctx.units} and $SE(b) = ${fmt(fit.seSlope, digits)}$, a real departure smaller than two or three standard errors would have produced this page too.`
      }`,
      misconception: reject
        ? 'Writing "the slope is greater than the null value" as a fact, or reaching for a causal verb. A test reports evidence about a parameter for a stated population.'
        : 'Reading a large P-value as evidence that the null is true. Failing to reject means the data are consistent with the null, alongside everything else the interval would have contained.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — what a significant slope does not establish
// ---------------------------------------------------------------------------------------------

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A test supplies evidence about a parameter at a stated error rate. Proof is a word from a different trade.',
}

export const whatASlopeDoesNotProve = defineGenerator({
  id: 'act-9/what-a-slope-does-not-prove',
  label: 'What a significant slope does and does not establish',
  ap_topics: ['9.5'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, SLOPE_CONTEXTS)
    const { fit, n } = drawSlope(rng, {
      contexts: [ctx],
      n: [10, 26],
      noiseFactor: [0.6, 1.1],
      accept: (d) => Math.abs(d.fit.slope / d.fit.seSlope) > 3.2,
    })
    const test = slopeTestFromComputerOutput({ b: fit.slope, seB: fit.seSlope, n, alt: 'two-sided', beta0: 0 })
    const p = test.pValue as number
    const digits = ctx.digits
    const sampledFrom = `the ${fmtInt(n)} ${ctx.units} drawn from ${ctx.population}`

    const required: RubricGroup[] = [
      {
        label: 'States what the test does establish (evidence of a linear relationship)',
        phrasings: ['convincing evidence', 'evidence', 'significant', 'reject'],
        polarity: 'any',
        feedback: `Say what the small P-value buys: convincing evidence that the true slope is not zero, so ${ctx.yVar} does change with ${ctx.xVar} across ${ctx.population}.`,
      },
      {
        label: 'Denies causation',
        phrasings: ['not cause', 'not causal', 'association', 'not attribute', 'not responsible', 'not establish cause'],
        polarity: 'any',
        feedback: 'Say that the data are observational, so the relationship is an association and the slope cannot establish that one variable drives the other.',
      },
      {
        label: 'Gives the reason: nothing was assigned',
        phrasings: ['observational', 'not assign', 'not experiment', 'not randomly assign', 'lurking', 'confound', 'third variable'],
        polarity: 'any',
        feedback: `Name the reason: ${ctx.office} recorded ${ctx.xVar} as it found it. Nothing was assigned, so a confounding variable can produce the same slope.`,
      },
      {
        label: 'States the scope: the population sampled, and no wider',
        phrasings: ['only', 'population', 'beyond', 'generaliz', 'scope', 'limited'],
        polarity: 'any',
        feedback: `Say how far the finding reaches: ${ctx.population}, because that is where the sample came from.`,
      },
      {
        label: 'Notes that significance is not size',
        phrasings: ['size', 'how large', 'magnitude', 'small', 'strength', 'interval', 'how much', 'how steep'],
        polarity: 'any',
        feedback: 'A P-value says the slope is not zero. It says nothing about how big it is, and the interval is what answers that.',
      },
      contextGroup('Names the variables', [ctx.xVar, ctx.yVar], {
        minMatches: 2,
        feedback: `Name both: ${ctx.yVar} and ${ctx.xVar}.`,
      }),
    ]

    const exemplar = `With P = ${fmtP(p)} there is convincing evidence that the true slope is not zero, so ${ctx.yVar} does change with ${ctx.xVar} across ${ctx.population}. It does not establish a cause: ${ctx.office} recorded both columns as it found them and assigned nothing, so some third variable could produce the same association. The finding is limited to ${ctx.population}, since that is the only population sampled, and the small P-value says only that the slope is not zero and nothing about how large it is — the interval is what answers that.`

    const answer: InterpretationAnswer = {
      type: 'interpretation',
      required,
      forbidden: [PROVES, { phrase: /\bslope\b[^.;]{0,30}\b(?:causes|caused)\b/, label: 'Causal verb', why: 'Observational data describe association. A slope does not establish that one variable makes the other move.' }],
      exemplar,
      minWords: 30,
    }

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** drawn at random from ${ctx.population}. Nothing was assigned: both columns were recorded as the office found them. The conditions hold.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nThe test of $H_0: \\beta = 0$ against $H_a: \\beta \\ne 0$ gives $t = ${fmt(test.statistic, 2)}$ on ${fmtInt(n - 2)} degrees of freedom and $P = ${fmtP(p)}$.\n\nA colleague writes: *"The slope is significant, so ${ctx.xVar} drives ${ctx.yVar} across the corridor."*\n\n**Say what this result does establish, and what it does not.** Name the reason for each limit.`,
      answer,
      hints: [
        'Three separate questions, and the P-value answers only the first. Is there a relationship; does one variable drive the other; and who does the answer apply to.',
        `The second is settled by the design rather than by the arithmetic: ${sampledFrom} were observed, not assigned.`,
        'There is a fourth limit worth a sentence. A P-value is a verdict on whether the slope is zero, not a measurement of how steep it is.',
      ],
      solution: `**${exemplar}**\n\n| the claim | licensed? | why |\n| --- | --- | --- |\n| the true slope is not zero | yes | $P = ${fmtP(p)}$, and the conditions hold |\n| ${ctx.yVar} rises with ${ctx.xVar} across ${ctx.population} | yes | the sample was drawn at random from that population |\n| ${ctx.xVar} drives ${ctx.yVar} | **no** | nothing was assigned; a confounding variable explains the same slope |\n| the relationship holds outside ${ctx.population} | **no** | no sample was taken from anywhere else |\n| the slope is large, or important | **no** | significance is about zero, not about size |\n\nThe two verdicts are independent, and each has its own source. Random **assignment** licenses a causal claim; random **sampling** licenses a generalisation. This file has the second and not the first, so the finding travels across ${ctx.population} and stops at the word *drives*.\n\nSize is the limit most often left out. With ${fmtInt(n)} ${ctx.units} and $SE(b) = ${fmt(fit.seSlope, digits)}$, the estimate is ${fmt(fit.slope, digits)} ${ctx.slopeUnits}; whether that is a lot is a question for a confidence interval and for somebody who knows the trade.`,
      misconception: 'Letting "significant" carry both "real" and "large", and reaching for a causal verb because the P-value is small. Neither is in the procedure.',
    }
  },
})
