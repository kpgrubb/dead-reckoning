/**
 * act-7-02 · Reactor Output — drills. AP 7.2, 7.3: building the one-sample t-interval for a mean
 * from summary statistics, saying what it means, what moves its width, the sample size a target
 * margin costs, and whether it carries a claim about the parameter.
 *
 *   act-7/t-interval-endpoint          numeric  an endpoint of x̄ ± t*·s/√n
 *   act-7/mean-interval-interpretation interp   the shared `confidenceIntervalInterpretation`
 *   act-7/sample-size-for-margin       numeric  `sampleSizeForMean`
 *   act-7/interval-justifies-claim     choice   which claim about the mean the interval supports
 *   act-7/interval-width-drivers       choice   what moves the width, and what does not
 *   act-7/margin-of-error-mean         numeric  `marginOfErrorMean`
 *
 * `act-7/t-interval-endpoint` is checkpoint q2 and `act-7/mean-interval-interpretation` is q3
 * (weight 1.5), so each stands alone in its prompt.
 *
 * The Refit set's twelve certifications and the 588 kN specification belong to the mission beats.
 * Every framing here is another yard, another corridor, another tender's log.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { confidenceIntervalInterpretation } from '@/lib/problems/rubrics'
import { marginOfErrorMean, oneMeanInterval, sampleSizeForMean, tStar, zStar } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { LEVELS, ONE_SAMPLE_CONTEXTS, reservedCount, reservedStat, shuffleChoice, smallN, type Candidate, type OneSampleContext } from './contexts'

/** Summary statistics an office would file: a mean near the context's centre and an honest s. */
function drawSummary(rng: Rng, c: OneSampleContext, nLo = 7, nHi = 26) {
  return retry(
    rng,
    (r) => {
      const n = smallN(r, nLo, nHi)
      const f = 10 ** c.digits
      const xbar = Math.round(r.normal(c.centre, c.spread * 0.7) * f) / f
      const s = Math.round(r.uniform(c.spread * 0.6, c.spread * 1.5) * f) / f
      return { n, xbar, s }
    },
    ({ n, xbar, s }) => s > 0 && !reservedCount(n) && !reservedStat(s) && !reservedStat(xbar),
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — an endpoint of the interval. Checkpoint q2.
// ---------------------------------------------------------------------------------------------

export const tIntervalEndpoint = defineGenerator({
  id: 'act-7/t-interval-endpoint',
  label: 'One-sample t-interval: an endpoint',
  ap_topics: ['7.2', '7.3'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const { n, xbar, s } = drawSummary(rng, c)
    const askUpper = rng.bool()

    const result = oneMeanInterval({ mean: xbar, sd: s, n }, { confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const value = askUpper ? hi : lo
    const which = askUpper ? 'upper' : 'lower'
    const df = n - 1
    const ts = result.criticalValue ?? tStar(level, df)
    const se = result.se
    const moe = result.marginOfError ?? ts * se
    const digits = c.digits + 1

    return {
      prompt: `${c.office} measured **${c.measure}** on **${fmtInt(n)}** ${c.unit} drawn at random and filed three numbers and nothing else:\n\n$$\\bar{x} = ${fmt(xbar, c.digits)}\\ \\text{${c.units}} \\qquad s = ${fmt(s, c.digits)}\\ \\text{${c.units}} \\qquad n = ${fmtInt(n)}$$\n\nA dotplot of the ${fmtInt(n)} readings showed no outliers and no strong skew. Build the **${fmtPct(level, 0)}** one-sample $t$-interval for the ${c.parameter} and report its **${which} endpoint**, in ${c.units}, to **${digits} decimal place${digits === 1 ? '' : 's'}**.`,
      answer: numericAnswer(value, 'mean', { digits, units: c.units }),
      hints: [
        'Four pieces, in order, and none of them can be skipped: the degrees of freedom, the standard error, the critical value, then the statistic plus or minus their product.',
        `$df = n - 1 = ${fmtInt(df)}$ and $SE = s/\\sqrt{n} = ${fmt(s, c.digits)}/\\sqrt{${fmtInt(n)}}$. The critical value is $t^\\star$ at ${fmtPct(level, 0)} on ${fmtInt(df)} df, not $z^\\star$: $\\sigma$ was never known here.`,
        `$${fmt(xbar, c.digits)} ${askUpper ? '+' : '-'} t^\\star \\times ${fmt(se, 4)}$, to ${digits} decimal place${digits === 1 ? '' : 's'}.`,
      ],
      solution: `$$df = ${fmtInt(n)} - 1 = ${fmtInt(df)} \\qquad SE = \\frac{s}{\\sqrt{n}} = \\frac{${fmt(s, c.digits)}}{\\sqrt{${fmtInt(n)}}} = ${fmt(se, 5)}$$\n\n$$t^\\star = ${fmt(ts, 4)} \\qquad \\text{margin} = ${fmt(ts, 4)} \\times ${fmt(se, 5)} = ${fmt(moe, 5)}$$\n\n$$\\bar{x} \\pm \\text{margin} = ${fmt(xbar, c.digits)} \\pm ${fmt(moe, 5)} = (${fmt(lo, digits)},\\ ${fmt(hi, digits)})\\ \\text{${c.units}}$$\n\nThe ${which} endpoint is **${fmt(value, digits)} ${c.units}**.\n\nOn a TI-84 this is \`STAT\` \`▸ TESTS\` \`8:TInterval\` with **Inpt: Stats**, then $\\bar{x}$, $S_x$ and $n$. There is no field for $\\sigma$ on that screen, and if you find yourself typing one you are on \`7:ZInterval\` by mistake.\n\nCarry full precision through the standard error. Rounding $SE$ to two decimals before multiplying moves the endpoint in the place the argument will be read.`,
      misconception: `Using $z^\\star = ${fmt(zStar(level), 3)}$ in place of $t^\\star = ${fmt(ts, 3)}$. On ${fmtInt(df)} degrees of freedom that builds an interval ${fmtPct(1 - zStar(level) / ts, 1)} too narrow, and it captures the true mean less often than ${fmtPct(level, 0)} of the time.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the interval in context. Checkpoint q3 (weight 1.5).
// ---------------------------------------------------------------------------------------------

export const meanIntervalInterpretation = defineGenerator({
  id: 'act-7/mean-interval-interpretation',
  label: 'Interpret a t-interval for a mean, in context',
  ap_topics: ['7.3'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const { n, xbar, s } = drawSummary(rng, c)

    const result = oneMeanInterval({ mean: xbar, sd: s, n }, { confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const digits = c.digits + 1

    const answer = confidenceIntervalInterpretation({
      level,
      parameter: 'mean',
      lower: lo,
      upper: hi,
      context: { population: c.population, variable: c.measure, units: c.units },
      digits,
    })

    return {
      prompt: `${c.office} measured **${c.measure}** on **${fmtInt(n)}** ${c.unit} drawn at random from the ${c.population}, checked its conditions, and computed the **${fmtPct(level, 0)}** one-sample $t$-interval for the ${c.parameter}:\n\n$$(${fmt(lo, digits)},\\ ${fmt(hi, digits)})\\ \\text{${c.units}}$$\n\nWrite the one sentence that goes under the table. Interpret the **interval**, in context.`,
      answer,
      hints: [
        'A complete interval interpretation carries four things: the level, the word *confident*, the **true** (population) mean named in context, and both endpoints with their units.',
        `Here that is ${fmtPct(level, 0)}, the true ${c.parameter} for all ${c.population}, and ${fmt(lo, digits)} to ${fmt(hi, digits)} ${c.units}.`,
        `Then check what is missing and what should not be there: no probability, no claim about individual ${c.unit}, and no sentence about $\\bar{x} = ${fmt(xbar, c.digits)}$, which is known exactly and needs no interval.`,
      ],
      solution: `**${answer.exemplar}**\n\nEvery clause has a job. *${fmtPct(level, 0)} confident* attaches the level to the method rather than to this one interval. *True* (or *population*) keeps the sentence off the sample. Naming the ${c.parameter} for all ${c.population} puts it in context. The two endpoints say how much the ${fmtInt(n)} ${c.unit} actually pinned down.\n\nThe sentence that fails most often is the one that sounds nearly right: *"${fmtPct(level, 0)} of the ${c.unit} have ${c.measure} between ${fmt(lo, digits)} and ${fmt(hi, digits)}"*. That is a claim about individuals, and the interval makes none. It is an interval for the **mean** of the ${c.population}, and the individual ${c.unit} scatter around that mean by roughly $s = ${fmt(s, c.digits)}\\ \\text{${c.units}}$ — several times the width of the interval itself.`,
      misconception: `"${fmtPct(level, 0)} of the ${c.unit} fall between ${fmt(lo, digits)} and ${fmt(hi, digits)}." The interval estimates one number, the population mean. It says nothing about how the individual ${c.unit} are spread around it.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — sample size for a target margin
// ---------------------------------------------------------------------------------------------

export const sampleSizeForMargin = defineGenerator({
  id: 'act-7/sample-size-for-margin',
  label: 'Sample size for a target margin on a mean',
  ap_topics: ['7.3'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)

    const d = retry(
      rng,
      (r) => {
        const f = 10 ** c.digits
        const sigma = Math.round(r.uniform(c.spread * 0.7, c.spread * 1.4) * f) / f
        const moe = Math.round(r.uniform(c.spread * 0.2, c.spread * 0.6) * f) / f
        return { sigma, moe }
      },
      ({ sigma, moe }) => moe > 0 && sigma > 0 && !reservedStat(sigma) && !reservedStat(moe) && !reservedCount(sampleSizeForMean({ moe, confidence: level, sigma })),
    )

    const n = sampleSizeForMean({ moe: d.moe, confidence: level, sigma: d.sigma })
    const z = zStar(level)
    const raw = ((z * d.sigma) / d.moe) ** 2

    return {
      prompt: `${c.office} is planning next quarter's run of ${c.unit}. A long history of this measurement puts the standard deviation of **${c.measure}** at **${fmt(d.sigma, c.digits)} ${c.units}**, and the office wants a **${fmtPct(level, 0)}** confidence interval for the ${c.parameter} with a margin of error no larger than **${fmt(d.moe, c.digits)} ${c.units}**.\n\nHow many ${c.unit} must it plan to measure? Give a whole number.`,
      answer: numericAnswer(n, 'count'),
      hints: [
        'Start from the margin and solve for $n$: $m = z^\\star\\sigma/\\sqrt{n}$. Square both sides and $n$ comes out of the denominator.',
        `$n = \\left(\\dfrac{z^\\star\\sigma}{m}\\right)^2$ with $z^\\star = ${fmt(z, 3)}$, $\\sigma = ${fmt(d.sigma, c.digits)}$ and $m = ${fmt(d.moe, c.digits)}$. Planning uses $z^\\star$ rather than $t^\\star$, because $t^\\star$ needs the df and the df needs the answer.`,
        'A sample size is a count, so whatever the arithmetic returns is rounded **up**. Rounding down leaves the margin wider than the one that was asked for.',
      ],
      solution: `$$n = \\left(\\frac{z^\\star\\sigma}{m}\\right)^2 = \\left(\\frac{${fmt(z, 3)} \\times ${fmt(d.sigma, c.digits)}}{${fmt(d.moe, c.digits)}}\\right)^2 = ${fmt(raw, 2)}$$\n\nRounded **up**, because a fraction of a ${c.unit.replace(/s$/, '')} measures nothing: **${fmtInt(n)} ${c.unit}**.\n\nTwo things fall out of the formula. The margin sits in the denominator and is squared, so halving it costs four times the ${c.unit} — precision is expensive in a way that surprises people who think in terms of adding rows.\n\nAnd the planning formula uses $z^\\star$, not $t^\\star$, for a circular reason worth stating out loud: $t^\\star$ depends on the degrees of freedom, the degrees of freedom depend on $n$, and $n$ is the unknown. Planning with $z^\\star$ and a $\\sigma$ from history is the standard way out. When the interval is finally built on the data it will use $t^\\star$ and come out slightly wider, which is why a planner with any sense adds a few ${c.unit} on top.`,
      misconception: 'Rounding the sample size to the nearest whole number. Always up: n is the smallest count that meets the margin, and one unit short leaves the margin too wide.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which claim the interval supports
// ---------------------------------------------------------------------------------------------

export const intervalJustifiesClaim = defineGenerator({
  id: 'act-7/interval-justifies-claim',
  label: 'Which claim about the mean the interval supports',
  ap_topics: ['7.3'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const bothCleared = rng.bool(0.4)
    const f = 10 ** c.digits

    /** Two published figures, A below B, placed so the intended verdict is unambiguous. */
    const draw = retry(
      rng,
      (r) => {
        const { n, xbar, s } = drawSummary(r, c, 8, 24)
        const result = oneMeanInterval({ mean: xbar, sd: s, n }, { confidence: level, random: true })
        const [lo, hi] = result.ci as [number, number]
        const w = hi - lo
        const a = Math.round((lo - w * (bothCleared ? 0.8 : 0.5)) * f) / f
        const b = bothCleared ? Math.round((lo - w * 0.25) * f) / f : Math.round(((lo + hi) / 2) * f) / f
        return { n, xbar, s, lo, hi, a, b }
      },
      ({ lo, hi, a, b }) => a < b && lo > a && (bothCleared ? lo > b : b > lo && b < hi),
    )

    const { n, xbar, lo, hi, a: figureA, b: figureB } = draw
    const digits = c.digits + 1
    const clearsA = lo > figureA
    const clearsB = lo > figureB

    const cands: Candidate[] = [
      {
        text: `Only the lower figure: the true ${c.parameter} exceeds **${fmt(figureA, c.digits)} ${c.units}**. ${fmt(figureB, c.digits)} lies inside the interval, so it stays on the list of values the data are consistent with.`,
        correct: clearsA && !clearsB,
        why: clearsA && !clearsB ? null : `The interval clears ${fmt(figureB, c.digits)} as well — its lower endpoint ${fmt(lo, digits)} is above it — so both claims are carried.`,
      },
      {
        text: `Both: the true ${c.parameter} exceeds ${fmt(figureA, c.digits)} ${c.units}, and it exceeds ${fmt(figureB, c.digits)} ${c.units} too.`,
        correct: clearsA && clearsB,
        why:
          clearsA && clearsB
            ? null
            : `${fmt(figureB, c.digits)} lies inside $(${fmt(lo, digits)},\\ ${fmt(hi, digits)})$, so it is a value the data are consistent with. An interval rules a figure out only when the figure falls entirely outside it.`,
      },
      {
        text: `Neither. $\\bar{x} = ${fmt(xbar, c.digits)}$ is one sample of ${fmtInt(n)} ${c.unit}, so nothing about the ${c.parameter} can be claimed from it at all.`,
        correct: false,
        why: `The interval exists precisely so that something *can* be claimed from ${fmtInt(n)} ${c.unit}. It carries the uncertainty with it: every value outside $(${fmt(lo, digits)},\\ ${fmt(hi, digits)})$ is one these data make implausible at the ${fmtPct(level, 0)} level.`,
      },
      {
        text: `Only the upper figure: the true ${c.parameter} exceeds ${fmt(figureB, c.digits)} ${c.units}, because the sample mean ${fmt(xbar, c.digits)} is above it.`,
        correct: false,
        why: `${fmt(figureB, c.digits)} is the larger of the two, so an interval clearing it clears ${fmt(figureA, c.digits)} automatically — "only the upper" is not a shape an interval can produce. And the test is the lower endpoint ${fmt(lo, digits)}, never $\\bar{x}$.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office}'s ${fmtPct(level, 0)} interval for the ${c.parameter}, from **${fmtInt(n)}** ${c.unit}, runs\n\n$$(${fmt(lo, digits)},\\ ${fmt(hi, digits)})\\ \\text{${c.units}}$$\n\nTwo published figures are on the table: ${c.standardLabel} at **${fmt(figureA, c.digits)} ${c.units}**, and a revised figure at **${fmt(figureB, c.digits)} ${c.units}**.\n\n**What does this interval justify?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'An interval supports a claim that the parameter exceeds a value only when the **whole** interval lies above that value. Put both figures on the same number line as the endpoints before deciding anything.',
        `The interval runs from ${fmt(lo, digits)} to ${fmt(hi, digits)}. Compare each figure with the **lower** endpoint; the upper endpoint has no say in a claim of this shape.`,
        'A figure that falls inside the interval is neither established nor ruled out. The honest sentence about it says the data are consistent with it.',
      ],
      solution: `| figure | lower endpoint | verdict |\n| --- | --- | --- |\n| ${fmt(figureA, c.digits)} | ${fmt(lo, digits)} | ${clearsA ? `${fmt(lo, digits)} > ${fmt(figureA, c.digits)} — the whole interval is above it, **supported**` : `inside the interval — **not supported**`} |\n| ${fmt(figureB, c.digits)} | ${fmt(lo, digits)} | ${clearsB ? `${fmt(lo, digits)} > ${fmt(figureB, c.digits)} — **supported**` : `inside the interval — **not supported**`} |\n\n**${options[correct]}**\n\nThe lower endpoint decides it, not the point estimate. $\\bar{x} = ${fmt(xbar, c.digits)}$ sits above both figures, and that fact carries no weight on its own: the estimate is one sample of ${fmtInt(n)}, and the interval is the part of the answer that says how far off it could be. Make the claim the data can carry, and no larger than that.`,
      misconception: `Judging the claim by $\\bar{x}$ rather than by the endpoint. The sample mean clears both figures here; the interval is what says which of those claims survives the ${c.unit} having come out differently by an ordinary amount.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what moves the width
// ---------------------------------------------------------------------------------------------

export const intervalWidthDrivers = defineGenerator({
  id: 'act-7/interval-width-drivers',
  label: 'What moves the width of a t-interval',
  ap_topics: ['7.3'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const { n, s } = drawSummary(rng, c, 8, 20)
    const register = retry(
      rng,
      (r) => n * r.int(30, 80),
      (v) => !reservedCount(v),
    )
    const bigN = 4 * n

    const cLow = 0.9
    const cHigh = 0.99
    const m1 = marginOfErrorMean(s, n, cLow)
    const mBigN = marginOfErrorMean(s, bigN, cLow)
    const mHighC = marginOfErrorMean(s, n, cHigh)

    const cands: Candidate[] = [
      {
        text: `Quadrupling the sample to ${fmtInt(bigN)} ${c.unit} narrows the margin from ${fmt(m1, 4)} to ${fmt(mBigN, 4)} ${c.units} — slightly better than halving it, because $t^\\star$ falls as the degrees of freedom rise — and leaves the level exactly where the office set it.`,
        correct: true,
        why: null,
      },
      {
        text: `Quadrupling the sample to ${fmtInt(bigN)} ${c.unit} leaves the margin at ${fmt(m1, 4)} ${c.units} and raises the confidence level above the ${fmtPct(cLow, 0)} the office chose, because a larger sample is a more trustworthy one.`,
        correct: false,
        why: `The level is not something the data earns. It is chosen before the ${c.unit} are measured, and it enters the formula only as $t^\\star$. A larger $n$ buys a narrower interval *at the same level*: ${fmt(m1, 4)} down to ${fmt(mBigN, 4)}, still ${fmtPct(cLow, 0)}.`,
      },
      {
        text: `The width depends on how large a slice of the register of ${fmtInt(register)} ${c.unit} the sample is, so drawing the same ${fmtInt(n)} ${c.unit} from a register twice that size would widen it.`,
        correct: false,
        why: `The population size appears nowhere in $t^\\star s/\\sqrt{n}$. It enters once, as the 10% condition — a yes-or-no gate on whether the formula applies. Past that gate, ${fmtInt(n)} ${c.unit} buy the same precision out of a register of ${fmtInt(register)} as out of one ten times larger.`,
      },
      {
        text: `Raising the level from ${fmtPct(cLow, 0)} to ${fmtPct(cHigh, 0)} narrows the margin to ${fmt(mHighC, 4)} ${c.units}, because a higher level is a stronger claim about the mean.`,
        correct: false,
        why: `${fmt(mHighC, 4)} is the right number and the wrong direction: it is *larger* than ${fmt(m1, 4)}. A higher level is bought by covering more ground, which makes the claim weaker and the interval wider.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office} has **${fmtInt(n)}** ${c.unit}, drawn at random from a register of ${fmtInt(register)}, with a sample standard deviation of **${fmt(s, c.digits)} ${c.units}**. Its ${fmtPct(cLow, 0)} interval for the ${c.parameter} has a margin of error of **${fmt(m1, 4)} ${c.units}**.\n\nWhich of these statements about that margin is correct?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Write the margin out and see which symbols are in it: $t^\\star s/\\sqrt{n}$, with $t^\\star$ set by the level and by $n - 1$. Anything not in that expression cannot move the number.',
        'Two of the four confuse the level with the precision. Ask of each: who chose the level, and when — before the data or after it?',
      ],
      solution: `$$\\text{margin} = t^\\star \\frac{s}{\\sqrt{n}}, \\qquad s = ${fmt(s, c.digits)},\\ n = ${fmtInt(n)}$$\n\n| change | margin (${c.units}) | level |\n| --- | --- | --- |\n| as reported, $n = ${fmtInt(n)}$ at ${fmtPct(cLow, 0)} | ${fmt(m1, 4)} | ${fmtPct(cLow, 0)} |\n| $n \\times 4 = ${fmtInt(bigN)}$ | ${fmt(mBigN, 4)} | ${fmtPct(cLow, 0)} — unchanged |\n| level raised to ${fmtPct(cHigh, 0)} | ${fmt(mHighC, 4)} | ${fmtPct(cHigh, 0)} |\n| register doubled, same $n$ | ${fmt(m1, 4)} — unchanged | ${fmtPct(cLow, 0)} |\n\n**${options[correct]}**\n\nThree things get confused here and they are worth separating by hand. **Precision** is the width, and $n$ buys it at the rate $1/\\sqrt{n}$, with a small extra saving because $t^\\star$ falls from ${fmt(tStar(cLow, n - 1), 4)} to ${fmt(tStar(cLow, bigN - 1), 4)} as the df rise. **Confidence** is the level, chosen by the author before any data exist. **Population size** is not in the formula at all. The fourth driver, $s$, is a property of the ${c.unit} themselves and is not the author's to choose.`,
      misconception: 'Believing a larger sample makes you "more confident". It makes you more precise. The confidence level is a decision, not a measurement.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Numeric — the margin itself
// ---------------------------------------------------------------------------------------------

export const marginOfErrorForMean = defineGenerator({
  id: 'act-7/margin-of-error-mean',
  label: 'Margin of error for a mean',
  ap_topics: ['7.2', '7.3'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const level = pickContext(rng, LEVELS)
    const { n, xbar, s } = drawSummary(rng, c)
    const df = n - 1
    const se = s / Math.sqrt(n)
    const moe = marginOfErrorMean(s, n, level)
    const ts = tStar(level, df)

    return {
      prompt: `${c.office} reports $\\bar{x} = ${fmt(xbar, c.digits)}\\ \\text{${c.units}}$ and $s = ${fmt(s, c.digits)}\\ \\text{${c.units}}$ from **${fmtInt(n)}** ${c.unit} measured at random, and intends to publish the estimate with a **${fmtPct(level, 0)}** margin of error.\n\nWhat is that margin of error, in ${c.units}? Give it to **four decimal places**.`,
      answer: numericAnswer(moe, 'mean', { digits: 4, units: c.units }),
      hints: [
        'The margin is the part after the $\\pm$: a critical value times the standard error of $\\bar{x}$. Compute the two pieces separately and multiply once.',
        `$SE = s/\\sqrt{n} = ${fmt(s, c.digits)}/\\sqrt{${fmtInt(n)}}$, and $t^\\star$ is the ${fmtPct(level, 0)} critical value on $n - 1 = ${fmtInt(df)}$ degrees of freedom.`,
        `$t^\\star \\times ${fmt(se, 5)}$, to four decimals.`,
      ],
      solution: `$$SE = \\frac{s}{\\sqrt{n}} = \\frac{${fmt(s, c.digits)}}{\\sqrt{${fmtInt(n)}}} = ${fmt(se, 5)}\\ \\text{${c.units}} \\qquad t^\\star = ${fmt(ts, 4)}\\ \\text{on ${fmtInt(df)} df}$$\n\n$$\\text{margin} = t^\\star \\times SE = ${fmt(ts, 4)} \\times ${fmt(se, 5)} = \\mathbf{${fmt(moe, 4)}}\\ \\text{${c.units}}$$\n\nThe standard error and the margin are different quantities and reports confuse them constantly. $SE = ${fmt(se, 5)}$ is the typical distance between $\\bar{x}$ and the truth. The margin ${fmt(moe, 4)} is that distance scaled by $t^\\star$ so the interval captures at the stated rate.\n\nBoth are different again from $s = ${fmt(s, c.digits)}$, which describes how far one ${c.unit.replace(/s$/, '')} typically sits from the others. Three numbers, three sentences, and they are not interchangeable.`,
      misconception: `Reporting $SE = ${fmt(se, 4)}$ as the margin, or reaching for $z^\\star = ${fmt(zStar(level), 3)}$ instead of $t^\\star = ${fmt(ts, 3)}$. The margin is $t^\\star \\times SE$, and on ${fmtInt(df)} df that multiplier is ${fmt(ts, 3)}.`,
    }
  },
})
