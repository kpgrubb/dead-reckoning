/**
 * act-9-02 · One Tonne per Tonne — drills. AP 9.2, 9.3: the t-interval for a population slope
 * built from computer output, and the claims it can settle.
 *
 *   act-9/slope-interval-from-output  numeric  an endpoint of b ± t*·SE(b), read off the output
 *   act-9/slope-df                    numeric  df = n − 2, or the t* that sits on it
 *   act-9/interval-vs-constant        choice   does the interval settle a claim about a required value
 *   act-9/interval-width-drivers      choice   what n, s, the spread of x and the level do to the width
 *   act-9/control-regression          choice   what a second regression on an honest group adds
 *   act-9/slope-interval-claim        interp   interpret the interval and justify the claim
 *
 * Every file here belongs to another office. DS-16's own numbers — the nineteen's 1.17 tonnes per
 * tonne, their interval, the honest control's 1.000 — are the mission beats', and `drawSlope`
 * rejects a draw that would print one of them back.
 */
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { confidenceIntervalInterpretation } from '@/lib/problems/rubrics'
import { fmt, fmtInt, fmtPct, slopeIntervalFromOutput, tStar } from '@/lib/stats'
import { CLAIM_CONTEXTS, SLOPE_CONTEXTS, drawSlope, outputCaption, outputMd, precisionWords, shuffleChoice, type Candidate, type SlopeContext } from './contexts'

const LEVELS = [0.9, 0.95, 0.99] as const

/** The interval for a fit, at a level, exactly as the library builds it. */
function intervalOf(slope: number, seSlope: number, n: number, confidence: number) {
  const r = slopeIntervalFromOutput({ b: slope, seB: seSlope, n, confidence })
  const [lo, hi] = r.ci as [number, number]
  return { lo, hi, ts: r.criticalValue as number, moe: r.marginOfError as number, df: r.df as number }
}

/** "95%" — the level as a prompt says it. */
const levelWords = (level: number) => fmtPct(level, 0)

// ---------------------------------------------------------------------------------------------
// 1. Numeric — an endpoint of the interval, from output
// ---------------------------------------------------------------------------------------------

export const slopeIntervalFromOutputDrill = defineGenerator({
  id: 'act-9/slope-interval-from-output',
  label: 'A slope interval from computer output',
  ap_topics: ['9.2'],
  skills: ['3'],
  generate(rng) {
    const level = pickContext(rng, LEVELS)
    const end = pickContext(rng, ['lower', 'upper'] as const)
    const { ctx, fit, n } = drawSlope(rng, {
      n: [8, 24],
      noiseFactor: [0.7, 1.3],
      accept: (d) => {
        const { lo, hi } = intervalOf(d.fit.slope, d.fit.seSlope, d.n, level)
        // Both endpoints must print as different numbers at the office's own precision.
        return fmt(lo, d.ctx.digits) !== fmt(hi, d.ctx.digits)
      },
    })
    const { lo, hi, ts, moe, df } = intervalOf(fit.slope, fit.seSlope, n, level)
    const value = end === 'lower' ? lo : hi
    const digits = ctx.digits

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for a random sample of **${fmtInt(n)} ${ctx.units}** drawn from ${ctx.population}.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nBuild the **${levelWords(level)} confidence interval for the true slope** and report its **${end} endpoint**, in ${ctx.slopeUnits}, to **${precisionWords(digits)}**.`,
      answer: numericAnswer(value, 'other', { digits }),
      hints: [
        'The interval has the shape every t interval in the course has: the statistic, plus and minus a critical value times its standard error. Both of the first two numbers are printed on the output and neither of them is the T column.',
        `$b \\pm t^\\star \\cdot SE(b)$ with $b = ${fmt(fit.slope, digits)}$ and $SE(b) = ${fmt(fit.seSlope, digits)}$, and the degrees of freedom are ${fmtInt(n)} − 2 = ${fmtInt(df)}, not ${fmtInt(n - 1)}.`,
        `At ${levelWords(level)} on ${fmtInt(df)} degrees of freedom, $t^\\star = ${fmt(ts, 3)}$. The margin of error is ${fmt(ts, 3)} × ${fmt(fit.seSlope, digits)}.`,
      ],
      solution: `**Degrees of freedom.** ${fmtInt(n)} ${ctx.units}, two parameters estimated to place the line, so $df = ${fmtInt(n)} - 2 = ${fmtInt(df)}$.\n\n**Critical value.** At ${levelWords(level)} on ${fmtInt(df)} degrees of freedom, $t^\\star = ${fmt(ts, 3)}$.\n\n**The interval.**\n\n$$b \\pm t^\\star \\cdot SE(b) = ${fmt(fit.slope, digits)} \\pm ${fmt(ts, 3)} \\times ${fmt(fit.seSlope, digits)} = ${fmt(fit.slope, digits)} \\pm ${fmt(moe, digits)}$$\n\n$$(${fmt(lo, digits)},\\ ${fmt(hi, digits)})$$\n\nThe ${end} endpoint is $\\mathbf{${fmt(value, digits)}}$ ${ctx.slopeUnits}.\n\nIn words: we are ${levelWords(level)} confident that the true slope of the population regression line of ${ctx.yVar} on ${ctx.xVar}, for ${ctx.population}, lies between ${fmt(lo, digits)} and ${fmt(hi, digits)} ${ctx.slopeUnits}.\n\nTwo cells of the printout were never used. The **T** and **P** columns describe a two-sided test against zero, which is a different question from this one, and an interval has no P-value in it.`,
      misconception: 'Taking df = n − 1, or using the T column in place of t*. The T printed on the output is the observed statistic for a test against zero; t* is a critical value that depends only on the level and the degrees of freedom.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — degrees of freedom, and the critical value that sits on them
// ---------------------------------------------------------------------------------------------

export const slopeDf = defineGenerator({
  id: 'act-9/slope-df',
  label: 'Degrees of freedom and t* for a slope procedure',
  ap_topics: ['9.2'],
  skills: ['3'],
  generate(rng) {
    const ask = pickContext(rng, ['df', 'tstar'] as const)
    const level = pickContext(rng, LEVELS)
    const ctx = pickContext(rng, SLOPE_CONTEXTS)
    const n = rng.int(7, 46)
    const df = n - 2
    const ts = tStar(level, df)
    const wrongTs = tStar(level, n - 1)

    return {
      prompt:
        ask === 'df'
          ? `${ctx.office} fitted ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** and is about to build a confidence interval for the slope.\n\nHow many **degrees of freedom** does that interval carry? Give a whole number.`
          : `${ctx.office} fitted ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** and wants a **${levelWords(level)}** confidence interval for the slope.\n\nWhat is the **critical value $t^\\star$**? Give it to **${precisionWords(3)}**.`,
      answer: ask === 'df' ? numericAnswer(df, 'count') : numericAnswer(ts, 'other', { digits: 3 }),
      hints: [
        'A regression line is placed by estimating two things from the data before a single residual exists. Each one costs a degree of freedom, and the count left over is what every t procedure about the slope runs on.',
        ask === 'df'
          ? `${fmtInt(n)} ${ctx.units}, two parameters fitted: the intercept and the slope.`
          : `The degrees of freedom are ${fmtInt(n)} − 2 = ${fmtInt(df)}. Look up $t^\\star$ at ${levelWords(level)} on that row, not on row ${fmtInt(n - 1)}.`,
        ask === 'df'
          ? `This is the same count that divides SSE in $s = \\sqrt{\\text{SSE}/(n-2)}$, and the same one that picks the t curve.`
          : `On ${fmtInt(n - 1)} degrees of freedom the table would give ${fmt(wrongTs, 3)}, which is the commonest wrong answer here and it is wrong in the direction that narrows the interval.`,
      ],
      solution:
        ask === 'df'
          ? `$$df = n - 2 = ${fmtInt(n)} - 2 = \\mathbf{${fmtInt(df)}}$$\n\nThe intercept and the slope are both estimated from the same ${fmtInt(n)} ${ctx.units}, so the ${fmtInt(n)} residuals carry only ${fmtInt(df)} independent pieces of information about $\\sigma$. One-sample procedures spend one degree of freedom and use $n - 1$; a slope procedure spends two.\n\nThat ${fmtInt(df)} does three jobs: it divides SSE in $s$, it picks the t curve for the critical value, and it is printed on the regression output so that nobody has to trust their own subtraction.`
          : `$$df = n - 2 = ${fmtInt(n)} - 2 = ${fmtInt(df)}, \\qquad t^\\star_{${levelWords(level)}} = \\mathbf{${fmt(ts, 3)}}$$\n\nTwo parameters were estimated to place the line, so the reference curve is $t$ on ${fmtInt(df)} degrees of freedom and the critical value is the point with ${fmt((1 - level) * 50, 1)}% of the area beyond it in each tail.\n\nOn ${fmtInt(n - 1)} degrees of freedom the same level gives ${fmt(wrongTs, 3)}. It is a small difference and it runs the wrong way: a critical value that is too small produces an interval that is too narrow, and a too-narrow interval excludes values the data never ruled out.`,
      misconception: 'Using n − 1. That is the one-sample count. A regression line costs two parameters, so the slope procedure runs on n − 2.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — the interval against a value physics or a schedule fixes
// ---------------------------------------------------------------------------------------------

export const intervalVsConstant = defineGenerator({
  id: 'act-9/interval-vs-constant',
  label: 'Settling a claim about a required slope',
  ap_topics: ['9.3'],
  skills: ['4'],
  generate(rng) {
    const excludes = rng.bool()
    const level = pickContext(rng, LEVELS)
    const ctx = pickContext(rng, CLAIM_CONTEXTS)
    const required = ctx.required!
    const { fit, n } = drawSlope(rng, {
      contexts: [ctx],
      n: [9, 22],
      noiseFactor: [0.6, 1.1],
      slopeFactor: excludes ? required.excludeFactor : [0.994, 1.006],
      accept: (d) => {
        const { lo, hi } = intervalOf(d.fit.slope, d.fit.seSlope, d.n, level)
        // The verdict must be unambiguous at the office's own printing precision.
        const clear = Math.min(Math.abs(lo - required.value), Math.abs(hi - required.value)) > 2 * 10 ** -d.ctx.digits
        return clear && (excludes ? lo > required.value : lo < required.value && hi > required.value)
      },
    })
    const { lo, hi, ts, df } = intervalOf(fit.slope, fit.seSlope, n, level)
    const digits = ctx.digits
    const span = `(${fmt(lo, digits)}, ${fmt(hi, digits)})`

    const cands: Candidate[] = [
      {
        text: excludes
          ? `The interval is ${span}, and every value in it is above ${fmt(required.value, 2)}. At the ${levelWords(level)} level there is convincing evidence that the true slope is **greater than ${required.label}** for ${ctx.population}.`
          : `The interval is ${span}, which contains ${fmt(required.value, 2)}. The data are **consistent with ${required.label}**, and the interval is equally consistent with every other value it holds.`,
        correct: true,
        why: null,
      },
      {
        text: excludes
          ? `The interval is ${span}, which contains ${fmt(required.value, 2)}, so the data are consistent with ${required.label}.`
          : `The interval is ${span}, and every value in it is above ${fmt(required.value, 2)}, so there is convincing evidence that the true slope exceeds ${required.label}.`,
        correct: false,
        why: excludes
          ? `Read the endpoints against ${fmt(required.value, 2)} one at a time. The lower endpoint is ${fmt(lo, digits)}, which is already above it, so the required value is outside the interval and not inside it.`
          : `The lower endpoint is ${fmt(lo, digits)} and the upper is ${fmt(hi, digits)}, so ${fmt(required.value, 2)} sits between them. A fitted slope of ${fmt(fit.slope, digits)} is not evidence on its own; the question is whether the interval around it reaches back to the required value, and this one does.`,
      },
      {
        text: `The interval is ${span}, and it does not contain **zero**, so there is convincing evidence at the ${levelWords(level)} level of a linear relationship between ${ctx.xVar} and ${ctx.yVar}.`,
        correct: false,
        why: `True, and nobody asked. Zero would mean ${ctx.yVar} does not move with ${ctx.xVar} at all, which no one has ever proposed here: ${required.why}. The value this interval is held against is ${fmt(required.value, 2)}, and three units of answering "does it contain zero?" is exactly the habit that makes this question worth asking.`,
      },
      {
        text: excludes
          ? `The interval is ${span}. Because the fitted slope is ${fmt(fit.slope, digits)}, the true slope has been shown to be ${fmt(fit.slope, digits)} ${ctx.slopeUnits}, which is above ${required.label}.`
          : `The interval is ${span}. Because it contains ${fmt(required.value, 2)}, the true slope has been shown to equal ${required.label}.`,
        correct: false,
        why: excludes
          ? `An interval never establishes one value. ${fmt(fit.slope, digits)} is the single estimate this sample produced, and the interval exists to say how far the truth could plausibly sit from it: anywhere from ${fmt(lo, digits)} to ${fmt(hi, digits)} on this evidence.`
          : `Containing a value is not establishing it. ${fmt(required.value, 2)} is inside the interval, and so is every other number between ${fmt(lo, digits)} and ${fmt(hi, digits)}. The honest sentence is that the data are consistent with the requirement, not that the requirement has been confirmed.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** drawn at random from ${ctx.population}.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nFor a process working as specified the slope is fixed at **${required.label}**, because ${required.why}.\n\n**Build the ${levelWords(level)} interval for the true slope and say what it settles.**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        `Build the interval first and leave the verdict until it is written down: $b \\pm t^\\star SE(b)$ on ${fmtInt(df)} degrees of freedom, with $t^\\star = ${fmt(ts, 3)}$.`,
        `Then ask one question of it, and it is not the usual one. Where does ${fmt(required.value, 2)} sit relative to the two endpoints? Zero is not the value this problem is about.`,
      ],
      solution: `**The interval.** $df = ${fmtInt(n)} - 2 = ${fmtInt(df)}$, $t^\\star = ${fmt(ts, 3)}$ at ${levelWords(level)}, so\n\n$$${fmt(fit.slope, digits)} \\pm ${fmt(ts, 3)} \\times ${fmt(fit.seSlope, digits)} = ${span}$$\n\n**The claim.** The specification fixes the slope at ${fmt(required.value, 2)}, and ${fmt(required.value, 2)} lies **${excludes ? 'outside' : 'inside'}** the interval.\n\n${
        excludes
          ? `Every plausible value of the true slope is above the requirement, so at the ${levelWords(level)} level the data give convincing evidence that ${ctx.population} are running above ${required.label}. The side the requirement falls on is what makes the finding directional: the interval does not merely disagree with the specification, it disagrees upward.`
          : `The requirement is one of the values the data leave standing, so there is no evidence here against the specification. That is a weaker statement than it looks: the interval runs from ${fmt(lo, digits)} to ${fmt(hi, digits)}, and ${fmt(required.value, 2)} has no special status among those numbers. A departure smaller than the interval's half-width of ${fmt((hi - lo) / 2, digits)} would not have been detected by this sample.`
      }\n\n**${options[correct]}**\n\nZero appears nowhere in this analysis. It is the usual value to check only because in most textbook regressions it means "no relationship". Here the relationship is not in doubt; the rate is.`,
      misconception: 'Checking the interval against zero out of habit. The value an interval is tested against is whatever value the science, the contract or the specification requires, and zero is only one such value.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — what sets the width
// ---------------------------------------------------------------------------------------------

export const intervalWidthDrivers = defineGenerator({
  id: 'act-9/interval-width-drivers',
  label: 'What makes a slope interval narrow',
  ap_topics: ['9.2'],
  skills: ['1', '4'],
  generate(rng) {
    const { ctx, fit, n } = drawSlope(rng, { n: [10, 24], noiseFactor: [0.8, 1.2] })
    const digits = ctx.digits
    const at95 = intervalOf(fit.slope, fit.seSlope, n, 0.95)
    const at99 = intervalOf(fit.slope, fit.seSlope, n, 0.99)
    const quadrupled = tStar(0.95, 4 * n - 2) * (fit.seSlope / 2)

    const cands: Candidate[] = [
      {
        text: `Raising the level from ${levelWords(0.95)} to ${levelWords(0.99)} **widens** it, from ±${fmt(at95.moe, digits)} to ±${fmt(at99.moe, digits)}. Quadrupling the number of ${ctx.units} **narrows** it, to roughly ±${fmt(quadrupled, digits)}. Spreading the ${ctx.xVar} values further apart **narrows** it, because $S_{xx}$ grows and $SE(b) = s/\\sqrt{S_{xx}}$ falls.`,
        correct: true,
        why: null,
      },
      {
        text: `Raising the level from ${levelWords(0.95)} to ${levelWords(0.99)} **narrows** it, to ±${fmt(at95.moe, digits)}, because more confidence means a more precise estimate. Quadrupling the number of ${ctx.units} narrows it. Spreading the ${ctx.xVar} values further apart narrows it.`,
        correct: false,
        why: `Confidence and precision are bought from each other. A ${levelWords(0.99)} interval has to catch the parameter more often than a ${levelWords(0.95)} one, and the only way the arithmetic can manage that on the same ${fmtInt(n)} ${ctx.units} is by covering more ground: $t^\\star$ rises from ${fmt(at95.ts, 3)} to ${fmt(at99.ts, 3)}. The only thing that buys both at once is more data.`,
      },
      {
        text: `Raising the level widens it. Quadrupling the number of ${ctx.units} **quarters** the width. Spreading the ${ctx.xVar} values further apart narrows it.`,
        correct: false,
        why: `Sample size enters through $\\sqrt{n}$, inside $S_{xx}$, so four times the ${ctx.units} buys a factor near two rather than four. The margin of error would fall from ±${fmt(at95.moe, digits)} to roughly ±${fmt(quadrupled, digits)}, helped a little further by the smaller $t^\\star$ on more degrees of freedom.`,
      },
      {
        text: `Raising the level widens it. Quadrupling the number of ${ctx.units} narrows it. Spreading the ${ctx.xVar} values further apart **widens** it, because a wider range of ${ctx.xVar} means more variability in the file.`,
        correct: false,
        why: `More spread in x is not more noise. $SE(b) = s/\\sqrt{S_{xx}}$ puts the spread of the explanatory column in the denominator: the further apart the ${ctx.units} sit along the ${ctx.xVar} axis, the longer the lever the line is aimed through, and the less a fixed amount of scatter about the line can tilt it. What widens the interval is $s$ — scatter **about** the line, not along it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} has a ${levelWords(0.95)} interval for the slope of ${ctx.yVar} on ${ctx.xVar}, built from **${fmtInt(n)} ${ctx.units}**:\n\n$$${fmt(fit.slope, digits)} \\pm ${fmt(at95.ts, 3)} \\times ${fmt(fit.seSlope, digits)} = (${fmt(at95.lo, digits)},\\ ${fmt(at95.hi, digits)})$$\n\nwith $s = ${fmt(fit.s, ctx.interceptDigits + 2)}$ ${ctx.yUnits}.\n\nThe office wants it narrower next season. **What would each change do to the width?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'The half-width is $t^\\star \\cdot s/\\sqrt{S_{xx}}$. Take the three changes one at a time and find each one in that expression: on top, underneath, or inside a square root.',
        `The level is the one that is not free. It moves $t^\\star$ and nothing else, and it buys precision with reliability rather than with ${ctx.units}.`,
      ],
      solution: `$$\\text{half-width} = t^\\star \\cdot SE(b) = t^\\star \\cdot \\frac{s}{\\sqrt{S_{xx}}}$$\n\n| change | effect | here |\n| --- | --- | --- |\n| level ${levelWords(0.95)} → ${levelWords(0.99)} | wider ($t^\\star$ rises) | ±${fmt(at95.moe, digits)} → ±${fmt(at99.moe, digits)} |\n| ${fmtInt(n)} → ${fmtInt(4 * n)} ${ctx.units} | narrower by about $\\sqrt{4}$ | ±${fmt(at95.moe, digits)} → about ±${fmt(quadrupled, digits)} |\n| ${ctx.xVar} spread further apart | narrower ($S_{xx}$ rises) | no extra ${ctx.units} needed |\n| ${ctx.yVar} scattering less about the line | narrower ($s$ falls) | usually not the office's to choose |\n\n**${options[correct]}**\n\nOnly two of those are design decisions. $s$ is a property of the process and of how well ${ctx.yVar} is measured, and the confidence level is not precision at all — lowering it narrows the interval by agreeing to miss the parameter more often, which is a different thing from knowing more.\n\nThe spread of the explanatory column is the cheap one, and it comes with a warning. A file deliberately loaded with extreme ${ctx.xVar} values leans the whole fit on a handful of ${ctx.units}, and says nothing about the shape of the relationship in the middle.`,
      misconception: 'Treating a higher confidence level as a better estimate. The level and the width trade against each other on fixed data; only more data, less scatter or a wider spread of x improves both.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what a control regression adds
// ---------------------------------------------------------------------------------------------

export const controlRegression = defineGenerator({
  id: 'act-9/control-regression',
  label: 'What a control regression settles',
  ap_topics: ['9.3'],
  skills: ['4'],
  generate(rng) {
    const ctx: SlopeContext = pickContext(rng, CLAIM_CONTEXTS)
    const required = ctx.required!
    const suspect = drawSlope(rng, {
      contexts: [ctx],
      n: [9, 20],
      noiseFactor: [0.6, 1.1],
      slopeFactor: required.excludeFactor,
      accept: (d) => intervalOf(d.fit.slope, d.fit.seSlope, d.n, 0.95).lo > required.value,
    })
    const control = drawSlope(rng, {
      contexts: [ctx],
      n: [90, 240],
      noiseFactor: [0.7, 1.1],
      slopeFactor: [0.998, 1.002],
      accept: (d) => {
        const { lo, hi } = intervalOf(d.fit.slope, d.fit.seSlope, d.n, 0.95)
        return lo < required.value && hi > required.value
      },
    })
    const digits = ctx.digits
    const s = intervalOf(suspect.fit.slope, suspect.fit.seSlope, suspect.n, 0.95)
    const c = intervalOf(control.fit.slope, control.fit.seSlope, control.n, 0.95)

    const cands: Candidate[] = [
      {
        text: `The flagged ${ctx.units} are above the requirement and the rest of the file is not, so whatever produced the departure belongs to those ${fmtInt(suspect.n)} ${ctx.units} and not to the office's procedure. The control rules out an explanation the first interval alone cannot: a systematic error in how ${ctx.xVar} is computed, which would have moved **both** intervals.`,
        correct: true,
        why: null,
      },
      {
        text: `The control adds nothing. The first interval already excluded ${fmt(required.value, 2)}, and a second regression on different ${ctx.units} cannot strengthen a finding about the first set.`,
        correct: false,
        why: `What the first interval establishes is that these ${fmtInt(suspect.n)} ${ctx.units} depart from the requirement. It is silent about *why*, and the cheapest innocent explanation is that the requirement column itself is computed wrongly for everyone. The control is the only thing in the file that tests that, and it does: ${fmtInt(control.n)} ${ctx.units} through the same office, on the same arithmetic, bracketing ${fmt(required.value, 2)} at ${c.lo < required.value ? fmt(c.lo, digits + 1) : fmt(c.lo, digits)} to ${fmt(c.hi, digits + 1)}.`,
      },
      {
        text: `Because the control interval contains ${fmt(required.value, 2)}, the control group has been shown to meet the requirement exactly, and the two findings together establish that the flagged ${ctx.units} caused the departure.`,
        correct: false,
        why: `Two overclaims in one sentence. An interval containing a value never establishes that value; it leaves it standing alongside everything else between ${fmt(c.lo, digits + 1)} and ${fmt(c.hi, digits + 1)}. And nothing here was assigned to anybody, so nothing in it supports a causal verb. What the pair of intervals supports is that the departure is located in one group rather than in the procedure.`,
      },
      {
        text: `The control interval is narrower only because the control group is better behaved. Comparing a ${fmtInt(suspect.n)}-row interval with a ${fmtInt(control.n)}-row interval is not a fair comparison and neither finding can stand.`,
        correct: false,
        why: `The control is narrower mostly because it is larger, and that is not a defect in the comparison. Neither interval is being compared to the other for width: each is held against the same fixed requirement of ${fmt(required.value, 2)}, independently. A small sample produces a wide interval, and this one still excludes the requirement, which is a stronger result for being wide.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} ran the same regression twice. ${ctx.yVar.charAt(0).toUpperCase() + ctx.yVar.slice(1)} on ${ctx.xVar}, once for **${fmtInt(suspect.n)} flagged ${ctx.units}** and once for **${fmtInt(control.n)} ${ctx.units}** from the same six years of the same file that were never flagged. A process working to specification has a slope of ${required.label}, because ${required.why}.\n\n| group | n | b | SE(b) | df | ${levelWords(0.95)} interval |\n| --- | --- | --- | --- | --- | --- |\n| flagged | ${fmtInt(suspect.n)} | ${fmt(suspect.fit.slope, digits)} | ${fmt(suspect.fit.seSlope, digits)} | ${fmtInt(s.df)} | (${fmt(s.lo, digits)}, ${fmt(s.hi, digits)}) |\n| the rest of the file | ${fmtInt(control.n)} | ${fmt(control.fit.slope, digits + 1)} | ${fmt(control.fit.seSlope, digits + 1)} | ${fmtInt(c.df)} | (${fmt(c.lo, digits + 1)}, ${fmt(c.hi, digits + 1)}) |\n\n**What does the second regression add that the first one could not supply?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask what an opponent would say if only the first row existed. The finding is that a group departs from a requirement; the obvious reply is that the requirement, or the way it is computed, is wrong for everybody.',
        'Then ask what the second row does to that reply, and be careful to say only what two observational intervals can support.',
      ],
      solution: `**Row one** puts every plausible slope for the flagged ${ctx.units} above ${fmt(required.value, 2)}: the interval runs ${fmt(s.lo, digits)} to ${fmt(s.hi, digits)} and the requirement is outside it.\n\n**Row two** is the same office, the same column, the same arithmetic, for ${fmtInt(control.n)} ${ctx.units} nobody flagged, and its interval runs ${fmt(c.lo, digits + 1)} to ${fmt(c.hi, digits + 1)}, which brackets ${fmt(required.value, 2)}.\n\n**${options[correct]}**\n\nThis is what a control is for. Row one on its own is consistent with two stories: something is wrong with the flagged ${ctx.units}, or something is wrong with the way ${ctx.xVar} is computed for everybody. The second story predicts that *both* intervals miss the requirement, and row two says they do not.\n\nWhat the pair still does not reach is cause. Nobody assigned anything; these are two groups that already existed in a file. The finding is that the departure is located in one of them.`,
      misconception: 'Reading a control group that brackets the required value as proof the control is correct. An interval containing a value leaves that value standing among all the others it contains; the work the control does is to locate where the departure is not.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — the interval, and the claim it settles
// ---------------------------------------------------------------------------------------------

export const slopeIntervalClaim = defineGenerator({
  id: 'act-9/slope-interval-claim',
  label: 'Interpret a slope interval and justify a claim',
  ap_topics: ['9.3'],
  skills: ['4'],
  generate(rng) {
    const level = pickContext(rng, [0.95, 0.99] as const)
    const ctx = pickContext(rng, CLAIM_CONTEXTS)
    const required = ctx.required!
    const { fit, n } = retry(
      rng,
      (r) =>
        drawSlope(r, {
          contexts: [ctx],
          n: [9, 22],
          noiseFactor: [0.6, 1.1],
          slopeFactor: required.excludeFactor,
        }),
      (d) => intervalOf(d.fit.slope, d.fit.seSlope, d.n, level).lo > required.value + 10 ** -d.ctx.digits,
      60,
    )
    const { lo, hi, ts, df } = intervalOf(fit.slope, fit.seSlope, n, level)
    const digits = ctx.digits

    const base = confidenceIntervalInterpretation({
      level,
      parameter: 'slope',
      lower: lo,
      upper: hi,
      context: { population: ctx.population, variable: ctx.yVar, units: ctx.slopeUnits },
      digits,
    })
    const answer = {
      ...base,
      required: [
        ...base.required,
        {
          label: `Justifies the claim against ${required.label}`,
          phrasings: [/exclud/i, /does not (?:contain|include)/i, /every value in (?:the|this) interval/i, /entirely above/i, /wholly above/i, /above (?:the )?requirement/i],
          polarity: 'any' as const,
          feedback: `Say where ${fmt(required.value, 2)} sits: every value in the interval is above it, so the interval excludes ${required.label}.`,
        },
      ],
      exemplar: `${base.exemplar} Every value in that interval is above ${fmt(required.value, 2)}, so the interval excludes ${required.label} and the data give convincing evidence that these ${ctx.units} run above the requirement.`,
      minWords: 20,
    }

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** drawn at random from ${ctx.population}.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nThe residual plot shows no curve and no fan, and a normal probability plot of the residuals is close to straight.\n\nA process working to specification has a slope of **${required.label}**, because ${required.why}.\n\nBuild the ${levelWords(level)} interval, **interpret it in context**, and **use it to settle the claim**.`,
      answer,
      hints: [
        `The interval first: $b \\pm t^\\star SE(b)$ on ${fmtInt(df)} degrees of freedom, with $t^\\star = ${fmt(ts, 3)}$.`,
        `Then two sentences. The interpretation needs the level, the word confident, both endpoints, the words true or population slope, the units of the slope, and whose ${ctx.units} they are.`,
        `Then the claim, which is one line: where does ${fmt(required.value, 2)} sit relative to ${fmt(lo, digits)} and ${fmt(hi, digits)}, and what does that license you to say?`,
      ],
      solution: `**The interval.** $df = ${fmtInt(n)} - 2 = ${fmtInt(df)}$ and $t^\\star = ${fmt(ts, 3)}$ at ${levelWords(level)}, so\n\n$$${fmt(fit.slope, digits)} \\pm ${fmt(ts, 3)} \\times ${fmt(fit.seSlope, digits)} = (${fmt(lo, digits)},\\ ${fmt(hi, digits)})$$\n\n**The interpretation.** ${answer.exemplar}\n\nEvery clause in the first sentence is worth a mark somewhere. **${levelWords(level)}** and **confident**, because the level describes the method and not this interval. **True slope**, because the interval estimates a parameter and the fitted ${fmt(fit.slope, digits)} needs no estimating. **Both endpoints.** **${ctx.slopeUnits}**, because a slope is always something per something. And **${ctx.population}**, because the inference reaches the population the sample came from and no further.\n\n**The claim.** The requirement is ${fmt(required.value, 2)} and the interval starts at ${fmt(lo, digits)}, so the requirement is outside it on the low side. At the ${levelWords(level)} level the data give convincing evidence that the true slope is above the requirement.\n\nNotice what was not said. Not that the slope *is* ${fmt(fit.slope, digits)}; not that the departure was caused by anything; and not a word about zero, which would have meant ${ctx.yVar} does not move with ${ctx.xVar} at all.`,
      misconception: 'Writing the interval and stopping. A claim is settled by a sentence that names the required value and says which side of the interval it falls on, and an interval reported without that sentence has answered half the question.',
    }
  },
})
