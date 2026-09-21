/**
 * act-6-02 · Margin — drills. AP 6.2, 6.3: building the one-sample z-interval for a proportion and
 * saying what it means; how the margin answers to n and to C; the sample size a target margin costs;
 * and using an interval to judge a claim about the parameter.
 *
 *   act-6/one-prop-interval        numeric  an endpoint of p̂ ± z*√(p̂(1 − p̂)/n)
 *   act-6/interval-interpretation  interp   the shared `confidenceIntervalInterpretation` template
 *   act-6/sample-size-margin       numeric  `sampleSizeForProportion` — n for a target margin
 *   act-6/justify-claim            choice   which of two claims the interval supports
 *   act-6/margin-drivers           choice   what moves the margin, and what does not
 *   act-6/margin-value             numeric  `marginOfErrorProportion`
 *
 * `act-6/one-prop-interval` is checkpoint q3, `act-6/interval-interpretation` is q4 (weight 1.5) and
 * `act-6/sample-size-margin` is q5, so each stands alone in its prompt.
 *
 * The Lane's own interval — 31 losses in 2,612 transits, the 11,263 transits a two-tenths-of-a-point
 * margin would cost — belongs to the mission beats. Every framing here is another corridor.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { confidenceIntervalInterpretation } from '@/lib/problems/rubrics'
import { marginOfErrorProportion, onePropInterval, sampleSizeForProportion, zStar } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { CORRIDORS, MEASURES, reservedCount, reservedProp, shuffleChoice, type Candidate } from './capture'

const LEVELS = [0.9, 0.95, 0.98, 0.99] as const

/** A well-conditioned corridor sample: at least 15 successes and 15 failures. */
function drawSample(rng: Rng, lo = 0.1, hi = 0.42, nLo = 180, nHi = 720) {
  return retry(
    rng,
    (r) => {
      const n = r.int(nLo, nHi)
      const x = r.binomial(n, r.uniform(lo, hi))
      return { n, x }
    },
    ({ n, x }) => x >= 15 && n - x >= 15 && !reservedCount(n) && !reservedCount(x) && !reservedProp(x / n),
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — an endpoint of the interval
// ---------------------------------------------------------------------------------------------

export const onePropIntervalDrill = defineGenerator({
  id: 'act-6/one-prop-interval',
  label: 'One-proportion z-interval: an endpoint',
  ap_topics: ['6.2'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, LEVELS)
    const { n, x } = drawSample(rng)
    const askUpper = rng.bool()

    const result = onePropInterval({ x, n, confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const value = askUpper ? hi : lo
    const which = askUpper ? 'upper' : 'lower'
    const phat = result.estimate
    const z = result.criticalValue ?? zStar(level)
    const se = result.se
    const moe = result.marginOfError ?? z * se

    return {
      prompt: `${c.office} drew **${fmtInt(n)}** ${m.unit} at random from ${c.lane}'s traffic in ${c.quarter} and found **${fmtInt(x)}** ${m.event}. The corridor keeps running, so the process behind these ${m.unit} could produce far more than ten times ${fmtInt(n)} of them, and both counts are comfortably past ten.\n\nBuild the **${fmtPct(level, 0)}** one-sample $z$-interval for the ${m.parameter} and report its **${which} endpoint**, to **four decimal places**.`,
      answer: numericAnswer(value, 'proportion', { digits: 4, tolerance: 0.0005 }),
      hints: [
        'Four steps and no shortcuts: the sample proportion, the standard error $\\sqrt{\\hat p(1 - \\hat p)/n}$, the critical value for this level, and then the statistic plus or minus their product.',
        `$\\hat p = ${fmtInt(x)}/${fmtInt(n)}$ and the level is ${fmtPct(level, 0)}, so $z^\\star$ is the value with $(1 + ${fmt(level, 2)})/2 = ${fmt((1 + level) / 2, 4)}$ of the standard normal below it. Use the interval's own $\\hat p$ in the standard error — not 0.5, and not a hypothesised value.`,
        `$${fmt(phat, 4)} ${askUpper ? '+' : '-'} z^\\star \\times \\sqrt{${fmt(phat, 4)}(1 - ${fmt(phat, 4)})/${fmtInt(n)}}$, to four decimals.`,
      ],
      solution: `$$\\hat p = \\frac{${fmtInt(x)}}{${fmtInt(n)}} = ${fmt(phat, 5)} \\qquad SE = \\sqrt{\\frac{\\hat p(1 - \\hat p)}{n}} = \\sqrt{\\frac{${fmt(phat, 5)} \\times ${fmt(1 - phat, 5)}}{${fmtInt(n)}}} = ${fmt(se, 5)}$$\n\n$$z^\\star = ${fmt(z, 3)} \\qquad \\text{margin} = ${fmt(z, 3)} \\times ${fmt(se, 5)} = ${fmt(moe, 5)}$$\n\n$$\\hat p \\pm \\text{margin} = ${fmt(phat, 5)} \\pm ${fmt(moe, 5)} = (${fmt(lo, 4)},\\ ${fmt(hi, 4)})$$\n\nThe ${which} endpoint is **${fmt(value, 4)}**.\n\nCarry full precision through the standard error and round once, at the end. Rounding $\\hat p$ to two decimals first and feeding that back in moves the endpoint in the third decimal, which is exactly where the argument will be read.`,
      misconception: 'Using 0.5 in the standard error, or a hypothesised value. An interval has no hypothesised value to use — it estimates the parameter, so the SE is built from the sample proportion itself.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the interval in context (shared template)
// ---------------------------------------------------------------------------------------------

export const intervalInterpretation = defineGenerator({
  id: 'act-6/interval-interpretation',
  label: 'Interpret the interval in context',
  ap_topics: ['6.3'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, LEVELS)
    const { n, x } = drawSample(rng)

    const result = onePropInterval({ x, n, confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const population = `${m.unit} on ${c.lane}`
    const answer = confidenceIntervalInterpretation({
      level,
      parameter: 'proportion',
      lower: lo,
      upper: hi,
      context: { population, variable: m.event },
      digits: 3,
    })

    return {
      prompt: `${c.office} drew **${fmtInt(n)}** ${m.unit} at random on ${c.lane} in ${c.quarter}, found **${fmtInt(x)}** ${m.event}, checked its conditions and computed the **${fmtPct(level, 0)}** interval for the ${m.parameter}:\n\n$$(${fmt(lo, 4)},\\ ${fmt(hi, 4)})$$\n\nWrite the one sentence that goes in the bulletin. Interpret the **interval**, in context.`,
      answer,
      hints: [
        'A complete interval interpretation carries four things: the level, the word *confident*, the **true** (population) parameter named in context, and both endpoints.',
        `Here that is ${fmtPct(level, 0)}, the true ${m.parameter} for all ${population}, and the two numbers the interval runs between.`,
        `Then check what you have not written: no probability, no claim about the individual ${m.unit}, no sentence about the sample proportion — which is known exactly and needs no interval.`,
      ],
      solution: `**${answer.exemplar}**\n\nThe sentence estimates a parameter, so every part of it has to point at the parameter. *True* (or *population*) keeps it off the sample; naming the ${m.parameter} for all ${population} keeps it in context; the two endpoints say how much the data actually pinned down; and *confident* rather than *probable* keeps the level attached to the method that built the interval rather than to the interval itself.\n\nThe interpretation says nothing about individual ${m.unit}, and nothing about where a future $\\hat p$ would land. Those are different questions with different answers.`,
      misconception: `Interpreting the sample proportion instead of the parameter — "we are ${fmtPct(level, 0)} confident the sample proportion is between ${fmt(lo, 3)} and ${fmt(hi, 3)}". The sample proportion is ${fmt(result.estimate, 4)}; it is known exactly and needs no interval. The unknown is the true value for the whole corridor.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — sample size for a target margin
// ---------------------------------------------------------------------------------------------

export const sampleSizeMargin = defineGenerator({
  id: 'act-6/sample-size-margin',
  label: 'Sample size for a target margin',
  ap_topics: ['6.3'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, LEVELS)
    const conservative = rng.bool(0.4)

    const d = retry(
      rng,
      (r) => {
        const moe = r.int(1, 5) / 100 - (r.bool() ? 0.005 : 0)
        const pilotN = r.int(90, 260)
        const pilotX = r.binomial(pilotN, r.uniform(0.12, 0.4))
        return { moe, pilotN, pilotX, pilot: pilotX / pilotN }
      },
      ({ moe, pilotN, pilotX, pilot }) => moe >= 0.01 && pilotX >= 12 && pilotN - pilotX >= 12 && !reservedCount(pilotN) && !reservedCount(pilotX) && !reservedProp(pilot),
    )
    const pGuess = conservative ? 0.5 : d.pilot
    const n = sampleSizeForProportion({ moe: d.moe, confidence: level, pGuess })
    const z = zStar(level)
    const raw = pGuess * (1 - pGuess) * (z / d.moe) ** 2

    const setup = conservative
      ? `${c.office} has no pilot count at all for ${c.lane}, so it plans the survey the conservative way, with $p^\\star = 0.5$.`
      : `A pilot count on ${c.lane} found **${fmtInt(d.pilotX)}** of **${fmtInt(d.pilotN)}** ${m.unit} ${m.event}, so the office plans with $p^\\star = ${fmt(pGuess, 4)}$.`

    return {
      prompt: `${setup}\n\nThe office wants a **${fmtPct(level, 0)}** confidence interval for the ${m.parameter} with a margin of error no larger than **${fmt(d.moe, 3)}** — that is ${fmt(d.moe * 100, 1)} percentage points.\n\nHow many ${m.unit} must it plan to sample? Give a whole number.`,
      answer: numericAnswer(n, 'count'),
      hints: [
        'Start from the margin and solve for $n$ rather than guessing: $m = z^\\star\\sqrt{p^\\star(1 - p^\\star)/n}$. Square both sides and the $n$ comes out of the denominator.',
        `$n = p^\\star(1 - p^\\star)\\left(\\dfrac{z^\\star}{m}\\right)^2$ with $p^\\star = ${fmt(pGuess, 4)}$, $z^\\star = ${fmt(z, 3)}$ and $m = ${fmt(d.moe, 3)}$.`,
        'A sample size is a count of units, so whatever the arithmetic returns must be rounded **up** — rounding down leaves the margin larger than the one that was asked for.',
      ],
      solution: `$$n = p^\\star(1 - p^\\star)\\left(\\frac{z^\\star}{m}\\right)^2 = ${fmt(pGuess, 4)} \\times ${fmt(1 - pGuess, 4)} \\times \\left(\\frac{${fmt(z, 3)}}{${fmt(d.moe, 3)}}\\right)^2 = ${fmt(raw, 2)}$$\n\nRounded **up**, because a fraction of a ${m.unit.replace(/s$/, '')} buys nothing: **${fmtInt(n)} ${m.unit}**.\n\nTwo things worth reading off the formula. The margin is in the denominator and squared, so halving the margin costs four times the sample — precision is expensive in a way that surprises people who have only ever added rows to a table. And ${conservative ? 'the conservative $p^\\star = 0.5$ maximises $p^\\star(1 - p^\\star)$, so this n is the largest any true proportion could require; a pilot value nearer 0 or 1 would cut it.' : `$p^\\star(1 - p^\\star) = ${fmt(pGuess * (1 - pGuess), 4)}$ here, against ${fmt(0.25, 2)} at the conservative $p^\\star = 0.5$ — the pilot count is worth a real reduction in ${m.unit}, and it is worth it only if the pilot is honest.`}`,
      misconception: 'Rounding the sample size down, or to the nearest whole number. Always up: n is the smallest count that meets the margin, and one unit short leaves the margin too wide.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which claim the interval supports
// ---------------------------------------------------------------------------------------------

type ClaimShape = 'lower-only' | 'both' | 'neither'

export const justifyClaim = defineGenerator({
  id: 'act-6/justify-claim',
  label: 'Which claim the interval supports',
  ap_topics: ['6.3'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, LEVELS)
    const shape = pickContext(rng, ['lower-only', 'lower-only', 'both', 'neither'] as const) as ClaimShape
    const { n, x } = retry(
      rng,
      (r) => drawSample(r, 0.16, 0.4, 240, 760),
      ({ n, x }) => {
        const r = onePropInterval({ x, n, confidence: level, random: true })
        const [l, h] = r.ci as [number, number]
        return l > 0.1 && (h - l) / 2 > 0.022
      },
    )

    const result = onePropInterval({ x, n, confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const phat = result.estimate

    /** Two claimed floors, A below B, placed so the intended verdict is unambiguous. */
    const { a, b } = (() => {
      const round3 = (v: number) => Math.round(v * 1000) / 1000
      const mid = (lo + hi) / 2
      if (shape === 'both') return { a: round3(lo - 0.06), b: round3(lo - 0.02) }
      if (shape === 'lower-only') return { a: round3(lo - 0.03), b: round3(mid) }
      return { a: round3(mid - 0.01), b: round3(mid + 0.01) }
    })()

    const clearsA = lo > a
    const clearsB = lo > b
    const correctIndex = clearsA && clearsB ? 2 : clearsA ? 0 : 3

    const cands: Candidate[] = [
      {
        text: `Only the first: the true ${m.parameter} exceeds **${fmt(a, 3)}**.`,
        correct: correctIndex === 0,
        why: correctIndex === 0 ? null : correctIndex === 2 ? `The interval clears ${fmt(b, 3)} as well — every value in $(${fmt(lo, 3)},\\ ${fmt(hi, 3)})$ is above it — so both claims are supported.` : `The interval reaches down to ${fmt(lo, 3)}, which is below ${fmt(a, 3)}. A value inside the interval is a value the data cannot rule out, so neither floor is established.`,
      },
      {
        text: `Only the second: the true ${m.parameter} exceeds **${fmt(b, 3)}**.`,
        correct: false,
        why: `${fmt(b, 3)} is the *larger* of the two floors, so an interval that clears it clears ${fmt(a, 3)} automatically. "Only the second" is not a shape an interval can produce.`,
      },
      {
        text: `Both: the true ${m.parameter} exceeds **${fmt(a, 3)}** and it exceeds **${fmt(b, 3)}**.`,
        correct: correctIndex === 2,
        why: correctIndex === 2 ? null : `The interval runs from ${fmt(lo, 3)} to ${fmt(hi, 3)} and ${fmt(b, 3)} is inside it, so ${fmt(b, 3)} is a value the data are consistent with — not one they exclude.`,
      },
      {
        text: `Neither: every value the interval contains is a value the data cannot rule out, and both ${fmt(a, 3)} and ${fmt(b, 3)} lie inside $(${fmt(lo, 3)},\\ ${fmt(hi, 3)})$.`,
        correct: correctIndex === 3,
        why: correctIndex === 3 ? null : `The reasoning is right but the reading is not: ${fmt(a, 3)} lies **below** the whole interval, so every plausible value of the parameter is above it and that claim is supported.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office}'s ${fmtPct(level, 0)} interval for the ${m.parameter} on ${c.lane}, from **${fmtInt(x)}** of **${fmtInt(n)}** ${m.unit} ${m.event}, runs\n\n$$(${fmt(lo, 4)},\\ ${fmt(hi, 4)})$$\n\nTwo claims are on the table for the bulletin:\n\n1. the true ${m.parameter} **exceeds ${fmt(a, 3)}**;\n2. the true ${m.parameter} **exceeds ${fmt(b, 3)}**.\n\nWhich of them does this interval support?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'An interval supports a claim that the parameter exceeds a value only when the **whole** interval lies above that value. Put both claimed values on the same number line as the endpoints before deciding anything.',
        `The interval runs from ${fmt(lo, 3)} to ${fmt(hi, 3)}. Compare each of ${fmt(a, 3)} and ${fmt(b, 3)} with the **lower** endpoint — the upper endpoint has no say in a claim of this shape.`,
        'A claimed value that falls inside the interval is neither established nor refuted. The honest sentence about it is that the data are consistent with it, and the report has to say so.',
      ],
      solution: `$\\hat p = ${fmt(phat, 4)}$ and the ${fmtPct(level, 0)} interval is $(${fmt(lo, 4)},\\ ${fmt(hi, 4)})$.\n\n| claimed floor | lower endpoint | verdict |\n| --- | --- | --- |\n| ${fmt(a, 3)} | ${fmt(lo, 4)} | ${clearsA ? `${fmt(lo, 4)} > ${fmt(a, 3)} — the whole interval is above it, **supported**` : `${fmt(a, 3)} is inside the interval — **not supported**`} |\n| ${fmt(b, 3)} | ${fmt(lo, 4)} | ${clearsB ? `${fmt(lo, 4)} > ${fmt(b, 3)} — **supported**` : `${fmt(b, 3)} is inside the interval — **not supported**`} |\n\n**${options[correct]}**\n\nThe test is the lower endpoint, not the point estimate. $\\hat p = ${fmt(phat, 4)}$ is above ${fmt(a, 3)} and above ${fmt(b, 3)}, and that fact establishes nothing on its own: the estimate is one draw, and the interval is the part of the answer that carries its uncertainty. Make the claim the data can carry, and no larger.`,
      misconception: `Judging the claim by $\\hat p$ instead of by the endpoint. The sample proportion beats both floors here; the interval is what says which of those margins survives being wrong by an ordinary amount.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what moves the margin
// ---------------------------------------------------------------------------------------------

export const marginDrivers = defineGenerator({
  id: 'act-6/margin-drivers',
  label: 'What moves the margin of error',
  ap_topics: ['6.3'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    // 4n is printed, so it must not land on one of the Act's own counts either.
    const { n, x } = retry(rng, (r) => drawSample(r, 0.12, 0.4, 160, 480), ({ n }) => !reservedCount(4 * n))
    const phat = x / n
    const register = retry(rng, (r) => n * r.int(20, 45), (v) => !reservedCount(v))

    const cLow = 0.9
    const cHigh = 0.99
    const m1 = marginOfErrorProportion(phat, n, cLow)
    const mBigN = marginOfErrorProportion(phat, 4 * n, cLow)
    const mHighC = marginOfErrorProportion(phat, n, cHigh)

    const cands: Candidate[] = [
      {
        text: `Quadrupling $n$ to ${fmtInt(4 * n)} **halves the margin**, from ${fmt(m1, 4)} to ${fmt(mBigN, 4)}, and leaves the confidence level exactly where the office set it — ${fmtPct(cLow, 0)}.`,
        correct: true,
        why: null,
      },
      {
        text: `Quadrupling $n$ to ${fmtInt(4 * n)} leaves the margin at ${fmt(m1, 4)} and **raises the confidence level** well above the ${fmtPct(cLow, 0)} the office chose, because a bigger sample is a more trustworthy sample.`,
        correct: false,
        why: `The level is not something the data earns. It is chosen before the sample is drawn and it appears in the formula only as $z^\\star$. A larger $n$ buys a narrower interval *at the same level*: ${fmt(m1, 4)} to ${fmt(mBigN, 4)}, still ${fmtPct(cLow, 0)}.`,
      },
      {
        text: `The margin depends on how large a slice of the register of ${fmtInt(register)} ${m.unit} the sample is, so sampling the same ${fmtInt(n)} ${m.unit} from a register twice that size would widen it.`,
        correct: false,
        why: `The population size appears nowhere in $z^\\star\\sqrt{\\hat p(1 - \\hat p)/n}$. It enters only as the 10% *condition* — a yes-or-no gate on whether the formula applies at all. Once that gate is passed, ${fmtInt(n)} ${m.unit} buy the same precision out of a register of ${fmtInt(register)} as out of one ten times larger.`,
      },
      {
        text: `Raising the level from ${fmtPct(cLow, 0)} to ${fmtPct(cHigh, 0)} **narrows** the margin to ${fmt(mHighC, 4)}, because a higher level is a stronger claim about the parameter.`,
        correct: false,
        why: `${fmt(mHighC, 4)} is the right number and the wrong direction: it is *larger* than ${fmt(m1, 4)}. A higher level is bought by covering more ground, which is a weaker claim, not a stronger one.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office} has **${fmtInt(x)}** of **${fmtInt(n)}** ${m.unit} ${m.event} on ${c.lane} — drawn at random from a register of ${fmtInt(register)} — and a ${fmtPct(cLow, 0)} interval for the ${m.parameter} with a margin of error of ${fmt(m1, 4)}.\n\nWhich of these statements about that margin is correct?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Write the margin out and see which symbols are in it: $z^\\star\\sqrt{\\hat p(1 - \\hat p)/n}$. Anything that does not appear in that expression cannot change the number.',
        'Two of the four confuse the level with the precision. Ask, for each one: who chose the level, and when — before the data or after it?',
      ],
      solution: `$$\\text{margin} = z^\\star\\sqrt{\\frac{\\hat p(1 - \\hat p)}{n}}, \\qquad \\hat p = ${fmt(phat, 4)}$$\n\n| change | margin | level |\n| --- | --- | --- |\n| as reported, $n = ${fmtInt(n)}$ at ${fmtPct(cLow, 0)} | ${fmt(m1, 4)} | ${fmtPct(cLow, 0)} |\n| $n \\times 4 = ${fmtInt(4 * n)}$ | ${fmt(mBigN, 4)} | ${fmtPct(cLow, 0)} — unchanged |\n| level raised to ${fmtPct(cHigh, 0)} | ${fmt(mHighC, 4)} | ${fmtPct(cHigh, 0)} |\n| register doubled, same $n$ | ${fmt(m1, 4)} — unchanged | ${fmtPct(cLow, 0)} |\n\n**${options[correct]}**\n\nThree separate things get confused here and they are worth separating by hand. **Precision** is the width, and $n$ buys it at the rate $1/\\sqrt{n}$. **Confidence** is the level, and it is chosen by the author before any data arrives. **Population size** is not in the formula at all — it appears once, as a condition, and then never again.`,
      misconception: 'Believing a larger sample makes you "more confident". It makes you more precise. The confidence level is a decision, not a measurement, and a bigger sample changes nothing about it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Numeric — the margin itself
// ---------------------------------------------------------------------------------------------

export const marginValue = defineGenerator({
  id: 'act-6/margin-value',
  label: 'Margin of error for a proportion',
  ap_topics: ['6.2', '6.3'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, LEVELS)
    const { n, x } = drawSample(rng)
    const phat = x / n
    const moe = marginOfErrorProportion(phat, n, level)
    const z = zStar(level)
    const se = Math.sqrt((phat * (1 - phat)) / n)

    return {
      prompt: `${c.office} reports that **${fmtInt(x)}** of **${fmtInt(n)}** ${m.unit} sampled at random on ${c.lane} were ${m.event}, and intends to publish the estimate with a **${fmtPct(level, 0)}** margin of error.\n\nWhat is that margin of error? Give a proportion to **four decimal places**.`,
      answer: numericAnswer(moe, 'proportion', { digits: 4, tolerance: 0.0005 }),
      hints: [
        'The margin is the part after the $\\pm$: a critical value times the standard error of the statistic. Compute the two pieces separately and multiply once.',
        `$\\hat p = ${fmtInt(x)}/${fmtInt(n)}$; the standard error of a sample proportion is $\\sqrt{\\hat p(1 - \\hat p)/n}$; and $z^\\star$ is the cutoff with $(1 + ${fmt(level, 2)})/2 = ${fmt((1 + level) / 2, 4)}$ of the standard normal below it.`,
        `$z^\\star \\times \\sqrt{${fmt(phat, 4)}(1 - ${fmt(phat, 4)})/${fmtInt(n)}}$, to four decimals.`,
      ],
      solution: `$$\\hat p = \\frac{${fmtInt(x)}}{${fmtInt(n)}} = ${fmt(phat, 5)} \\qquad SE = \\sqrt{\\frac{${fmt(phat, 5)} \\times ${fmt(1 - phat, 5)}}{${fmtInt(n)}}} = ${fmt(se, 5)}$$\n\n$$\\text{margin} = z^\\star \\times SE = ${fmt(z, 3)} \\times ${fmt(se, 5)} = \\mathbf{${fmt(moe, 4)}}$$\n\nThat is ${fmt(moe * 100, 2)} percentage points either side of ${fmt(phat, 4)} — the whole of what the interval adds to the point estimate, and the only part of it that answers to the sample size.\n\nThe standard error and the margin are different quantities and reports confuse them constantly. $SE = ${fmt(se, 5)}$ is the typical distance between $\\hat p$ and the truth; the margin ${fmt(moe, 4)} is that distance scaled by $z^\\star = ${fmt(z, 3)}$ so that the interval captures at the stated rate.`,
      misconception: `Reporting the standard error ${fmt(se, 4)} as the margin, or forgetting $z^\\star$ altogether. The margin is $z^\\star \\times SE$; at ${fmtPct(level, 0)} that multiplier is ${fmt(z, 3)}.`,
    }
  },
})
