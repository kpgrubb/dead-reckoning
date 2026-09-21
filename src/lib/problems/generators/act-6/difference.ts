/**
 * act-6-07 · Perrine and Everyone Else — drills. AP 6.8 and 6.9: the two-proportion z-interval for
 * p₁ − p₂ (UNPOOLED standard error), its conditions (the four *observed* counts), its interpretation
 * in context including the order of subtraction, and what an interval containing 0 does and does not
 * license.
 *
 *   act-6/two-prop-interval          numeric  both endpoints of a seeded difference interval
 *   act-6/difference-interpretation  interp   the sentence, with the order of subtraction in it
 *   act-6/difference-conditions      interp   the four observed counts against 10
 *   act-6/interval-contains-zero     choice   a seeded interval spanning 0, read honestly
 *   act-6/order-of-subtraction       choice   the same data described two ways
 *   act-6/difference-margin          numeric  the margin of error, or the n that halves it
 *
 * `differenceIntervalRubric` is exported because act-6-07's mission beat grades the learner's own
 * sentence with exactly the rubric these drills use. The Lane's own 19/900 against 12/1,712 — and
 * its (0.004, 0.024) interval — belong to the mission beats and never appear here.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableSpec } from '@/lib/problems/generate'
import { confidenceIntervalInterpretation, conditionsCheck } from '@/lib/problems/rubrics'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { onePropInterval, twoPropInterval, zStar } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

/** Numbers the Lane's own case owns. A drill that reproduces one of them has leaked a mission beat. */
const RESERVED_COUNTS = new Set([19, 31, 900, 1712, 2612, 2580])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
const reservedRate = (p: number): boolean => Math.abs(p - 19 / 900) < 0.0006 || Math.abs(p - 12 / 1712) < 0.0006 || Math.abs(p - 31 / 2612) < 0.0006
/** The Lane's own difference interval, (0.004, 0.024). */
const reservedEndpoint = (v: number): boolean => Math.abs(v - 0.004) < 0.0008 || Math.abs(v - 0.024) < 0.0008

const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

interface Comparison {
  lane: string
  office: string
  /** First group — the one the question is about. */
  group1: string
  /** Second group — everyone else. */
  group2: string
  /** A short, distinctive lower-case word for each group, used by the reversed-sign check. */
  key1: string
  key2: string
  /** What is counted, plural. */
  event: string
  /** The rate in words, singular: "advisory rate per transit". */
  variable: string
  /** What the denominator counts, plural. */
  unit: string
  /** Who the interval is about. */
  population: string
  rateRange: [number, number]
}

const COMPARISONS: readonly Comparison[] = [
  {
    lane: 'the Adrastea feeder lane',
    office: 'the Adrastea Lane Office',
    group1: 'hulls refitted at Adrastea Transfer',
    group2: 'hulls refitted at Thebe Yards',
    key1: 'adrastea',
    key2: 'thebe',
    event: 'off-nominal advisories',
    variable: 'advisory rate per transit',
    unit: 'transits',
    population: 'transits on the Adrastea feeder lane',
    rateRange: [0.1, 0.24],
  },
  {
    lane: 'the Elara transfer corridor',
    office: 'the Elara Station berth office',
    group1: 'hulls carrying the older transponder set',
    group2: 'hulls carrying the current set',
    key1: 'older',
    key2: 'current',
    event: 'transponder dropouts',
    variable: 'dropout rate per transit',
    unit: 'transits',
    population: 'transits on the Elara transfer corridor',
    rateRange: [0.08, 0.2],
  },
  {
    lane: 'the Carme outer loop',
    office: 'the Carme relay office',
    group1: 'hulls plated from the 2179 batch',
    group2: 'hulls plated from the 2182 batch',
    key1: '2179',
    key2: '2182',
    event: 'pressure-seal faults',
    variable: 'seal-fault rate per transit',
    unit: 'transits',
    population: 'transits on the Carme outer loop',
    rateRange: [0.09, 0.22],
  },
  {
    lane: 'the Themis Reach',
    office: 'the Themis Reach survey office',
    group1: 'arrivals handled by relief pilots',
    group2: 'arrivals handled by the standing roster',
    key1: 'relief',
    key2: 'standing',
    event: 'holds at the mark',
    variable: 'hold rate per arrival',
    unit: 'arrivals',
    population: 'arrivals at Themis Anchorage',
    rateRange: [0.12, 0.28],
  },
  {
    lane: 'the Hygiea feeder',
    office: 'the Hygiea Hold traffic office',
    group1: 'hulls under the co-operative charter',
    group2: 'hulls under private ownership',
    key1: 'co operative',
    key2: 'private',
    event: 'late check-ins',
    variable: 'late check-in rate per transit',
    unit: 'transits',
    population: 'transits on the Hygiea feeder',
    rateRange: [0.1, 0.24],
  },
] as const

interface TwoDraw {
  c: Comparison
  x1: number
  n1: number
  x2: number
  n2: number
  p1: number
  p2: number
  interval: ReturnType<typeof twoPropInterval>
  lower: number
  upper: number
  moe: number
  se: number
}

/**
 * Two samples on one corridor. `gap` decides whether the interval should clear zero comfortably or
 * straddle it, because both cases have to be readable and the second is the one the misconception
 * lives in.
 */
function drawComparison(rng: Rng, opts: { straddleZero?: boolean; confidence?: number } = {}): TwoDraw {
  const c = pickContext(rng, COMPARISONS)
  const confidence = opts.confidence ?? 0.95
  return retry(
    rng,
    (r) => {
      const base = r.uniform(c.rateRange[0], c.rateRange[1])
      const lift = opts.straddleZero ? r.uniform(0.95, 1.22) : r.uniform(1.45, 2.1)
      const n1 = 10 * r.int(8, 40)
      const n2 = 10 * r.int(10, 50)
      const x1 = r.binomial(n1, Math.min(0.75, base * lift))
      const x2 = r.binomial(n2, base)
      const interval = twoPropInterval({ x1, n1, x2, n2, confidence, random: true })
      const [lower, upper] = interval.ci as [number, number]
      return { c, x1, n1, x2, n2, p1: x1 / n1, p2: x2 / n2, interval, lower, upper, moe: interval.marginOfError ?? 0, se: interval.se }
    },
    (d) =>
      Math.min(d.x1, d.n1 - d.x1, d.x2, d.n2 - d.x2) >= 10 &&
      d.p1 > d.p2 &&
      (opts.straddleZero ? d.lower < -0.004 && d.upper > 0.004 : d.lower > 0.01) &&
      ![d.n1, d.n2, d.x1, d.x2].some(reservedCount) &&
      ![d.p1, d.p2].some(reservedRate) &&
      ![d.lower, d.upper].some(reservedEndpoint),
  )
}

// ---------------------------------------------------------------------------------------------
// The rubric act-6-07's drill and its mission beat share
// ---------------------------------------------------------------------------------------------

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const RATES_ARE_EQUAL: ForbiddenPhrase = {
  phrase: /\b(?:rates?|proportions?)\s+(?:are|is)\s+(?:exactly\s+|both\s+)?(?:equal|the same)\b/,
  label: '“The rates are equal”',
  why: 'An interval is a range of values the data cannot rule out. Even an interval containing 0 contains every other value in it too, and it establishes none of them. "Consistent with no difference" is a statement about what has not been ruled out; "the rates are equal" is a claim the interval cannot support.',
}

export interface DifferenceIntervalRubricArgs {
  /** 0.95 or 95. */
  level: number
  lower: number
  upper: number
  /** The group written FIRST in the subtraction. */
  group1: string
  /** The group subtracted. */
  group2: string
  /** A short distinctive lower-case word for each group (used to catch a reversed sign). */
  key1: string
  key2: string
  /** The rate in words, singular — must contain "rate", "proportion" or "percent". */
  variable: string
  /** Who the interval is about. */
  population: string
  digits?: number
}

/**
 * Rubric for "interpret this difference interval in context" (AP 6.9). It is the standard confidence
 * interval template with a `difference in proportions` parameter, plus the two things that only a
 * *difference* interval needs: the order of subtraction stated in the sentence, and a bar on the
 * reversed sign and on "the rates are equal".
 *
 * Used by `act-6/difference-interpretation` and by act-6-07's mission beat.
 */
export function differenceIntervalRubric({ level, lower, upper, group1, group2, key1, key2, variable, population, digits = 4 }: DifferenceIntervalRubricArgs): InterpretationAnswer {
  const base = confidenceIntervalInterpretation({
    level,
    parameter: 'difference in proportions',
    lower,
    upper,
    context: { population, variable },
    digits,
  })
  const pct = level > 1 ? level : level * 100
  const orderGroup: RubricGroup = {
    label: `States the order of subtraction (${group1} minus ${group2})`,
    phrasings: [/\bminus\b/, /\bsubtract\w*/, new RegExp(`${escapeRe(key1)}[^.;]{0,60}-[^.;]{0,60}${escapeRe(key2)}`)],
    polarity: 'any',
    feedback: `Say which minus which: ${group1} minus ${group2}. Without it the sign of the interval means nothing to a reader.`,
  }
  const reversed: ForbiddenPhrase = {
    phrase: new RegExp(`${escapeRe(key2)}[^.;]{0,50}\\bminus\\b[^.;]{0,50}${escapeRe(key1)}`),
    label: 'The order of subtraction is reversed',
    why: `This interval was built as ${group1} minus ${group2}, so its sign points that way. Written the other way round the same interval runs from ${fmt(-upper, digits)} to ${fmt(-lower, digits)} — a statement with the opposite meaning and the same arithmetic behind it.`,
  }
  const required: RubricGroup[] = [...base.required, orderGroup]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [...(base.forbidden ?? []), reversed, RATES_ARE_EQUAL]
  const exemplar = `We are ${fmt(pct, 0)}% confident that the true difference in the ${variable} — ${group1} minus ${group2} — for all ${population} is between ${fmt(lower, digits)} and ${fmt(upper, digits)}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 18 }
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — both endpoints of the interval
// ---------------------------------------------------------------------------------------------

export const twoPropIntervalDrill = defineGenerator({
  id: 'act-6/two-prop-interval',
  label: 'A two-proportion z-interval for the difference',
  ap_topics: ['6.8'],
  skills: ['2', '3'],
  generate(rng) {
    const confidence = rng.choice([0.9, 0.95, 0.99] as const)
    const d = drawComparison(rng, { confidence })
    const { c, x1, n1, x2, n2, p1, p2, lower, upper, moe, se } = d
    const z = zStar(confidence)
    return {
      prompt: `${sentence(c.office)} has pulled both columns out of the same six-year berth log for ${c.lane}: ${fmtInt(x1)} of ${fmtInt(n1)} ${c.unit} logged ${c.event} among ${c.group1}, against ${fmtInt(x2)} of ${fmtInt(n2)} among ${c.group2}.\n\nConstruct a **${fmtPct(confidence, 0)} confidence interval for $p_1 - p_2$**, the difference in the true ${c.variable}, taking ${c.group1} first.\n\nGive **both** endpoints to four decimal places, and enter the **lower** endpoint below.`,
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      answer: numericAnswer(lower, 'proportion', { digits: 4, tolerance: 0.001 }),
      hints: [
        'An interval is a point estimate plus and minus a margin, and the margin is a critical value times a standard error. The only thing here that is not a repeat of the one-sample case is the standard error — and the thing to get right about it is that an interval assumes nothing about the two rates being equal, so nothing is pooled.',
        `$\\hat p_1 - \\hat p_2 = ${fmt(p1, 4)} - ${fmt(p2, 4)} = ${fmt(p1 - p2, 4)}$. The unpooled standard error is $\\sqrt{\\hat p_1(1 - \\hat p_1)/n_1 + \\hat p_2(1 - \\hat p_2)/n_2}$, and $z^\\star$ for ${fmtPct(confidence, 0)} is ${fmt(z, 3)}.`,
        `$${fmt(p1 - p2, 4)} \\pm ${fmt(z, 3)} \\times ${fmt(se, 5)}$, to four decimals.`,
      ],
      solution: `**The point estimate.** $\\hat p_1 - \\hat p_2 = \\dfrac{${fmtInt(x1)}}{${fmtInt(n1)}} - \\dfrac{${fmtInt(x2)}}{${fmtInt(n2)}} = ${fmt(p1, 4)} - ${fmt(p2, 4)} = ${fmt(p1 - p2, 4)}$\n\n**The standard error, unpooled.**\n\n$$\\text{SE} = \\sqrt{\\frac{\\hat p_1(1 - \\hat p_1)}{n_1} + \\frac{\\hat p_2(1 - \\hat p_2)}{n_2}} = \\sqrt{\\frac{${fmt(p1, 4)}(1 - ${fmt(p1, 4)})}{${fmtInt(n1)}} + \\frac{${fmt(p2, 4)}(1 - ${fmt(p2, 4)})}{${fmtInt(n2)}}} = ${fmt(se, 5)}$$\n\n**The interval.** $z^\\star = ${fmt(z, 3)}$ for ${fmtPct(confidence, 0)}, so the margin of error is ${fmt(z, 3)} × ${fmt(se, 5)} = ${fmt(moe, 5)} and\n\n$$${fmt(p1 - p2, 4)} \\pm ${fmt(moe, 5)} \\;\\longrightarrow\\; \\left(${fmt(lower, 4)},\\ ${fmt(upper, 4)}\\right)$$\n\n**Lower endpoint ${fmt(lower, 4)}; upper endpoint ${fmt(upper, 4)}.** In percentage points, ${fmt(lower * 100, 2)} to ${fmt(upper * 100, 2)} per ${c.unit.replace(/s$/, '')}.\n\nTwo things about that standard error. It is **unpooled** — each sample estimates its own rate — because an interval makes no claim that the two rates are equal; pooling is something only a test does, and only because its null said there was one rate to pool. And the two variances **add**, even though the proportions were subtracted: variances of independent quantities always add, whichever way round the estimate was written.\n\nThe interval lies entirely ${lower > 0 ? 'above' : 'below'} zero, so at ${fmtPct(confidence, 0)} the data are not consistent with the two groups sharing a rate — and the interval says by how much: ${fmt(Math.abs(lower) * 100, 2)} to ${fmt(Math.abs(upper) * 100, 2)} percentage points.`,
      misconception: 'Pooling the standard error, which belongs to the test and not to the interval — or subtracting the two one-sample margins instead of combining the variances.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the sentence, with the order of subtraction in it
// ---------------------------------------------------------------------------------------------

export const differenceInterpretation = defineGenerator({
  id: 'act-6/difference-interpretation',
  label: 'Interpret a difference interval in context',
  ap_topics: ['6.9'],
  skills: ['4'],
  generate(rng) {
    const confidence = rng.choice([0.9, 0.95, 0.99] as const)
    const straddleZero = rng.bool(0.35)
    const d = drawComparison(rng, { confidence, straddleZero })
    const { c, x1, n1, x2, n2, p1, p2, lower, upper } = d
    const answer = differenceIntervalRubric({
      level: confidence,
      lower,
      upper,
      group1: c.group1,
      group2: c.group2,
      key1: c.key1,
      key2: c.key2,
      variable: c.variable,
      population: c.population,
    })
    const containsZero = lower <= 0 && 0 <= upper
    return {
      prompt: `${sentence(c.office)} reports ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} among ${c.group1}, against ${fmtInt(x2)} in ${fmtInt(n2)} among ${c.group2}. The ${fmtPct(confidence, 0)} two-proportion z-interval for $p_1 - p_2$ — taking **${c.group1} first** — is\n\n$$\\left(${fmt(lower, 4)},\\ ${fmt(upper, 4)}\\right)$$\n\n**Interpret this interval in context.** One sentence. It has to survive being read by somebody who does not know which group was subtracted from which.`,
      answer,
      hints: [
        'Five things belong in the sentence and a reader will check for each: the confidence level, the word "confident", both endpoints, the word "true" (it is the population difference being estimated, not the sample one), and the context — whose rate, of what, on which corridor.',
        `The sixth thing is the one only a *difference* interval needs. ${fmt(lower, 4)} and ${fmt(upper, 4)} are ${lower > 0 ? 'positive' : 'signed'} numbers, and they mean nothing at all unless the sentence says which group was written first. Put "${c.group1} minus ${c.group2}" into the sentence itself.`,
        containsZero
          ? 'And be careful with the ending. This interval contains 0, which means a true difference of zero is among the values not ruled out — it does not mean the two rates are the same.'
          : 'Do not add a conclusion the interval did not buy. Say what range the true difference is estimated to lie in; that is the whole statement.',
      ],
      solution: `**${answer.exemplar}**\n\nOr, in the units a berth office actually uses: between ${fmt(lower * 100, 2)} and ${fmt(upper * 100, 2)} percentage points per ${c.unit.replace(/s$/, '')}, ${c.group1} against ${c.group2}.\n\nThree sentences that are **not** this one.\n\n- *"${fmtPct(confidence, 0)} of the ${c.unit} fall between ${fmt(lower, 4)} and ${fmt(upper, 4)}."* The interval estimates a **difference between two rates**, not the spread of individual ${c.unit}. Nothing about one ${c.unit.replace(/s$/, '')} is being described.\n- *"There is a ${fmtPct(confidence, 0)} probability that the true difference lies in this interval."* The true difference is a fixed number and this interval either covers it or it does not. The ${fmtPct(confidence, 0)} describes the **method**: run it on sample after sample and about ${fmtPct(confidence, 0)} of the intervals it builds would cover the truth.\n- *"The sample difference is between ${fmt(lower, 4)} and ${fmt(upper, 4)}."* The sample difference is ${fmt(p1 - p2, 4)} exactly, and it is sitting in the middle of the interval. The unknown quantity being bracketed is the population difference.\n\n${containsZero ? `And the ending matters here, because this interval contains 0. That is a statement that zero is among the values these data cannot rule out — alongside ${fmt(upper, 4)}, which is also not ruled out, and which would be a substantial difference. An interval spanning zero is a report of imprecision, not a finding of equality.` : `The interval lies entirely ${lower > 0 ? 'above' : 'below'} 0, so a claim that the two groups differ is justified at this level — and, unlike a p-value, the interval also says by how much, which is the question anybody who has to act on it will ask next.`}`,
      misconception: 'Leaving the order of subtraction out, so the sign is unreadable — or interpreting the interval as a statement about individual transits rather than about the difference between two population rates.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — the four observed counts
// ---------------------------------------------------------------------------------------------

export const differenceConditions = defineGenerator({
  id: 'act-6/difference-conditions',
  label: 'Conditions for a two-proportion z-interval',
  ap_topics: ['6.8'],
  skills: ['1', '4'],
  generate(rng) {
    const d = drawComparison(rng, { straddleZero: rng.bool() })
    const { c, x1, n1, x2, n2, p1, p2 } = d
    const counts = [
      { successes: x1, failures: n1 - x1 },
      { successes: x2, failures: n2 - x2 },
    ]
    const answer = conditionsCheck({
      procedure: 'two-prop-z',
      random: 'sample',
      n: [n1, n2],
      counts,
      context: `${c.unit} on ${c.lane}`,
    })
    const smallest = Math.min(x1, n1 - x1, x2, n2 - x2)
    return {
      prompt: `${sentence(c.office)} intends to build a 95% confidence interval for the difference in the true ${c.variable} between ${c.group1} and ${c.group2}. It has drawn a random sample of ${fmtInt(n1)} ${c.unit} from the first group and ${fmtInt(n2)} from the second, out of the many tens of thousands the corridor has run since the log was opened, and counted ${fmtInt(x1)} and ${fmtInt(x2)} ${c.event}.\n\n**Check the conditions for this interval, with the numbers.** Name each one and show what it comes to.`,
      answer,
      data: tableSpec(
        ['group', c.event, `no ${c.event.replace(/s$/, '')}`, c.unit],
        [
          [c.group1, x1, n1 - x1, n1],
          [c.group2, x2, n2 - x2, n2],
        ],
      ),
      hints: [
        'Three conditions, and each of them is a sentence with a number in it. One is about how the data came to exist, one is about how much more data the process could have produced, and one is arithmetic you show.',
        `For the Large Counts condition on an *interval*, the products are each sample's own observed successes and failures: ${fmtInt(x1)} and ${fmtInt(n1 - x1)}, then ${fmtInt(x2)} and ${fmtInt(n2 - x2)}. All four have to clear 10. There is no pooling here — pooling belongs to the test.`,
      ],
      solution: `**${answer.exemplar}**\n\nThe part worth dwelling on is the third condition, because it is the one that differs between the two procedures built on the same two samples.\n\n- For this **interval**, the four counts are the ones actually observed: ${fmtInt(x1)} and ${fmtInt(n1 - x1)} in the first group, ${fmtInt(x2)} and ${fmtInt(n2 - x2)} in the second. The smallest is ${fmtInt(smallest)}. Each sample estimates its own rate — $\\hat p_1 = ${fmt(p1, 4)}$, $\\hat p_2 = ${fmt(p2, 4)}$ — because the interval assumes nothing whatever about the two being equal.\n- For a **test** of $H_0: p_1 = p_2$ on the same file, the four products are computed at the pooled $\\hat p_c = ${fmt((x1 + x2) / (n1 + n2), 4)}$ instead, because the null says there is one rate and every observation is evidence about it.\n\nThe two checks can disagree — one can pass while the other fails — and when they do, each is right about its own procedure. Checking the interval's condition with the pooled rate is checking a model you are not using.`,
      misconception: 'Using the pooled p̂c for an interval’s Large Counts check. Pooling exists only because a null hypothesis asserted a common rate, and an interval asserts nothing.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — an interval that contains zero
// ---------------------------------------------------------------------------------------------

export const intervalContainsZero = defineGenerator({
  id: 'act-6/interval-contains-zero',
  label: 'An interval that contains zero',
  ap_topics: ['6.9'],
  skills: ['4'],
  generate(rng) {
    const confidence = rng.choice([0.9, 0.95, 0.99] as const)
    const d = drawComparison(rng, { confidence, straddleZero: true })
    const { c, x1, n1, x2, n2, p1, p2, lower, upper } = d
    const widest = Math.max(Math.abs(lower), Math.abs(upper))
    const cands: Candidate[] = [
      {
        text: `A true difference of zero is among the values these data cannot rule out — but so is a difference of ${fmt(upper, 4)} in one direction and ${fmt(lower, 4)} in the other. The comparison has not established a difference, and it has not established the absence of one either.`,
        correct: true,
        why: null,
      },
      {
        text: `The two groups have the same true ${c.variable}: the interval contains 0, so the difference is 0.`,
        correct: false,
        why: `The interval contains 0, and it contains ${fmt(upper, 4)}, and it contains ${fmt(lower, 4)}. It does not single any of them out. "Not ruled out" is the only status an interval confers, and it confers it on every value inside — which is why an interval this wide is a report about how little ${fmtInt(n1)} and ${fmtInt(n2)} ${c.unit} could settle, not a finding of equality.`,
      },
      {
        text: `There is no difference worth acting on: since the interval spans 0, any real difference must be small.`,
        correct: false,
        why: `Look at the far end. The interval reaches ${fmt(widest, 4)} — ${fmt(widest * 100, 2)} percentage points per ${c.unit.replace(/s$/, '')} — and that value is as consistent with these data as zero is. An interval spanning 0 does not bound the difference near zero; this one leaves a substantial difference entirely on the table.`,
      },
      {
        text: `The office has proved $H_0: p_1 = p_2$, so the comparison can be closed and the file marked as answered.`,
        correct: false,
        why: `No procedure in this course proves a null hypothesis, and this one comes further from it than most. Failing to exclude zero is what a genuinely equal pair of corridors looks like — and it is also what a real difference looks like when the samples are too small to resolve it. From this interval alone the two are indistinguishable.`,
      },
      {
        text: `Nothing at all can be said: an interval that contains 0 carries no information about the difference.`,
        correct: false,
        why: `It carries a good deal. It rules out every difference beyond ${fmt(upper, 4)} and every difference below ${fmt(lower, 4)} at the ${fmtPct(confidence, 0)} level, which is a real constraint — and it prices the comparison, by telling the Office exactly how much bigger a sample it would need before a difference of any stated size would show.`,
      },
    ]
    const chosen = [cands[0], ...rng.shuffle(cands.slice(1)).slice(0, 3)]
    const { options, correct, feedback } = shuffleChoice(rng, chosen)
    return {
      prompt: `${sentence(c.office)} compares ${c.group1} with ${c.group2} on ${c.lane}: ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} against ${fmtInt(x2)} in ${fmtInt(n2)}, so $\\hat p_1 - \\hat p_2 = ${fmt(p1 - p2, 4)}$. The ${fmtPct(confidence, 0)} interval for $p_1 - p_2$, first group first, is\n\n$$\\left(${fmt(lower, 4)},\\ ${fmt(upper, 4)}\\right)$$\n\n**What does this interval license the Office to say?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Write down what an interval is, in one line, before you read the options: the set of values for the parameter that these data do not rule out at this level. Then ask what that sentence permits about zero — and about every other number between the endpoints.',
        `Look at both ends, not just the one nearest zero. This interval reaches ${fmt(upper, 4)} on one side and ${fmt(lower, 4)} on the other, and each of those is exactly as consistent with the file as 0 is.`,
      ],
      solution: `**${options[correct]}**\n\nThe sample difference is ${fmt(p1 - p2, 4)} — the first group's rate is higher in this file — but the interval runs from ${fmt(lower, 4)} to ${fmt(upper, 4)} and therefore contains 0. What that means, exactly, is that zero is one of the values ${fmtInt(n1)} and ${fmtInt(n2)} ${c.unit} were not enough to exclude.\n\nIt is not a finding that the rates are equal. The same interval contains ${fmt(upper, 4)} — a difference of ${fmt(upper * 100, 2)} percentage points, which on this corridor would be worth acting on — and it does not exclude that either. An interval that spans zero is a statement about the **precision of the comparison**, not about the size of the difference.\n\nThis is the one place where an interval is plainly more informative than a test. A test on this file would fail to reject, and the report would read *no significant difference*, which sounds like a finding and is not one. The interval says the same thing and then says the part a test cannot: how wide the remaining uncertainty is, and therefore how much more file the Office would need before that sentence meant anything.`,
      misconception: 'Reading "contains 0" as "the difference is 0". An interval never establishes a value; it only fails to exclude one — and it fails to exclude every other value between its endpoints too.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — which interval goes with which sentence
// ---------------------------------------------------------------------------------------------

export const orderOfSubtraction = defineGenerator({
  id: 'act-6/order-of-subtraction',
  label: 'Which minus which',
  ap_topics: ['6.8', '6.9'],
  skills: ['2', '4'],
  generate(rng) {
    const confidence = 0.95
    const d = drawComparison(rng, { confidence })
    const { c, x1, n1, x2, n2, p1, p2, lower, upper, se } = d
    /** The question is asked in one of the two orders, chosen at random. */
    const firstIsGroup1 = rng.bool()
    const nameA = firstIsGroup1 ? c.group1 : c.group2
    const nameB = firstIsGroup1 ? c.group2 : c.group1
    const wantLower = firstIsGroup1 ? lower : -upper
    const wantUpper = firstIsGroup1 ? upper : -lower

    /** The two one-proportion intervals, subtracted endpoint-wise — the tempting wrong construction. */
    const i1 = onePropInterval({ x: x1, n: n1, confidence, random: true }).ci as [number, number]
    const i2 = onePropInterval({ x: x2, n: n2, confidence, random: true }).ci as [number, number]
    const naive: [number, number] = firstIsGroup1 ? [i1[0] - i2[0], i1[1] - i2[1]] : [i2[0] - i1[0], i2[1] - i1[1]]

    /** The same difference with the test's POOLED standard error — the other tempting wrong move. */
    const pooled = (x1 + x2) / (n1 + n2)
    const sePooled = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
    const z = zStar(confidence)
    const est = firstIsGroup1 ? p1 - p2 : p2 - p1
    const pooledInterval: [number, number] = [est - z * sePooled, est + z * sePooled]

    const show = (iv: [number, number]) => `$\\left(${fmt(iv[0], 4)},\\ ${fmt(iv[1], 4)}\\right)$`
    const cands: Candidate[] = [
      { text: `${show([wantLower, wantUpper])} — the estimate ${fmt(est, 4)} plus and minus ${fmt(z * se, 5)}.`, correct: true, why: null },
      {
        text: `${show([-wantUpper, -wantLower])} — the same two endpoints with the signs the other way round.`,
        correct: false,
        why: `That is the interval for **${nameB} minus ${nameA}**, which is the opposite question. Both intervals are correct arithmetic and they describe the same file; only one of them answers the sentence you were given. Reflecting an interval through zero reverses which group the sentence says is worse off.`,
      },
      {
        text: `${show(naive)} — the ${fmtPct(confidence, 0)} interval for ${nameA}'s own rate, minus the ${fmtPct(confidence, 0)} interval for ${nameB}'s, endpoint by endpoint.`,
        correct: false,
        why: `Subtracting two intervals endpoint by endpoint is not how uncertainty combines. The variances of two independent estimates **add** — $\\sqrt{\\hat p_1(1-\\hat p_1)/n_1 + \\hat p_2(1-\\hat p_2)/n_2} = ${fmt(se, 5)}$ — whereas subtracting the endpoints in the same order effectively cancels part of the uncertainty and produces an interval of the wrong width (${fmt(Math.abs(naive[1] - naive[0]), 4)} against the correct ${fmt(Math.abs(wantUpper - wantLower), 4)}).`,
      },
      {
        text: `${show(pooledInterval)} — the estimate ${fmt(est, 4)} plus and minus ${fmt(z * sePooled, 5)}, using the pooled standard error.`,
        correct: false,
        why: `The pooled standard error belongs to the **test**, where the null hypothesis has asserted that both groups share a rate and every observation may therefore be used to estimate it. An interval asserts nothing of the kind — it is the procedure you run precisely because you do not know whether the rates are equal — so each sample keeps its own $\\hat p$: SE $= ${fmt(se, 5)}$, not ${fmt(sePooled, 5)}.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(c.office)}'s file for ${c.lane}: ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} among ${c.group1}, and ${fmtInt(x2)} in ${fmtInt(n2)} among ${c.group2}.\n\nThe Office wants the sentence in its report to read: *"we are ${fmtPct(confidence, 0)} confident that the true ${c.variable} for **${nameA}** exceeds that for **${nameB}** by between … and … "* — so the interval it needs is the one for **${nameA} minus ${nameB}**.\n\nWhich interval belongs in that sentence?`,
      answer: { type: 'choice', options, correct, feedback },
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      hints: [
        'Two decisions, taken in order. Which group is written first — that fixes the sign. And which standard error — that fixes the width. Get either wrong and the interval is wrong in a way the reader cannot detect from the numbers alone.',
        `The sentence names ${nameA} first, so the point estimate is $${fmt(firstIsGroup1 ? p1 : p2, 4)} - ${fmt(firstIsGroup1 ? p2 : p1, 4)} = ${fmt(est, 4)}$. The standard error for an *interval* is unpooled: ${fmt(se, 5)}.`,
      ],
      solution: `**${options[correct]}**\n\nThe sentence names ${nameA} first, so the estimate is $${fmt(est, 4)}$ and the interval is\n\n$$${fmt(est, 4)} \\pm ${fmt(z, 3)} \\times ${fmt(se, 5)} = \\left(${fmt(wantLower, 4)},\\ ${fmt(wantUpper, 4)}\\right)$$\n\nWritten the other way round — ${nameB} minus ${nameA} — the same file gives $\\left(${fmt(-wantUpper, 4)},\\ ${fmt(-wantLower, 4)}\\right)$. Both are correct. Neither is interpretable on its own, which is the whole point: an interval for a difference is a pair of numbers *and* a stated order, and a report that gives the first without the second has said nothing a reader can act on. Write the order into the sentence, not into a footnote.\n\nAnd the standard error stays unpooled. Pooling is a thing a test does because its null hypothesis handed it permission; an interval has no null hypothesis and no permission. Here that is the difference between ${fmt(se, 5)} and ${fmt(sePooled, 5)} — small in this file, and not always small.`,
      misconception: 'Reading the sign off the sentence rather than building the estimate in the stated order — or importing the test’s pooled SE into the interval.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Numeric — the margin of error, or the n that halves it
// ---------------------------------------------------------------------------------------------

export const differenceMargin = defineGenerator({
  id: 'act-6/difference-margin',
  label: 'The margin of a difference interval',
  ap_topics: ['6.8'],
  skills: ['2', '3'],
  generate(rng) {
    const confidence = rng.choice([0.9, 0.95, 0.99] as const)
    const d = drawComparison(rng, { confidence, straddleZero: rng.bool(0.4) })
    const { c, x1, n1, x2, n2, p1, p2, moe, se } = d
    const z = zStar(confidence)
    const askHalving = rng.bool()

    if (!askHalving) {
      return {
        prompt: `${sentence(c.office)} reports ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} among ${c.group1} and ${fmtInt(x2)} in ${fmtInt(n2)} among ${c.group2}.\n\n**What is the margin of error of the ${fmtPct(confidence, 0)} confidence interval for $p_1 - p_2$?** Give it to four decimal places.`,
        data: tableSpec(
          ['group', c.event, c.unit, 'sample proportion'],
          [
            [c.group1, x1, n1, fmt(p1, 4)],
            [c.group2, x2, n2, fmt(p2, 4)],
          ],
        ),
        answer: numericAnswer(moe, 'proportion', { digits: 4, tolerance: 0.001 }),
        hints: [
          'The margin of error is the half-width of the interval: a critical value times the standard error of the estimate. The estimate here is a difference of two independent proportions, and the point to get right is how their uncertainties combine.',
          `$z^\\star$ for ${fmtPct(confidence, 0)} is ${fmt(z, 3)}. The unpooled standard error is $\\sqrt{\\hat p_1(1 - \\hat p_1)/n_1 + \\hat p_2(1 - \\hat p_2)/n_2}$ with $\\hat p_1 = ${fmt(p1, 4)}$ on ${fmtInt(n1)} and $\\hat p_2 = ${fmt(p2, 4)}$ on ${fmtInt(n2)}.`,
          `$${fmt(z, 3)} \\times ${fmt(se, 5)}$, to four decimals.`,
        ],
        solution: `$$\\text{SE} = \\sqrt{\\frac{${fmt(p1, 4)}(1 - ${fmt(p1, 4)})}{${fmtInt(n1)}} + \\frac{${fmt(p2, 4)}(1 - ${fmt(p2, 4)})}{${fmtInt(n2)}}} = ${fmt(se, 5)}$$\n\n$$\\text{margin of error} = z^\\star \\times \\text{SE} = ${fmt(z, 3)} \\times ${fmt(se, 5)} = ${fmt(moe, 4)}$$\n\n**${fmt(moe, 4)}** — that is ${fmt(moe * 100, 2)} percentage points either side of the estimate ${fmt(p1 - p2, 4)}.\n\nThe variances **add** even though the proportions were subtracted. Two independent estimates each carry their own uncertainty and combining them cannot cancel any of it — which is why a difference is always estimated less precisely than either rate on its own, and why comparisons need more data than descriptions do.`,
        misconception: 'Subtracting the two standard errors, or using only the smaller sample’s SE. Independent variances add, and the margin is built from their sum.',
      }
    }

    const needed = 4 * n1
    const scaled = twoPropInterval({ x1: x1 * 4, n1: n1 * 4, x2: x2 * 4, n2: n2 * 4, confidence, random: true })
    const scaledMoe = scaled.marginOfError ?? 0
    return {
      prompt: `${sentence(c.office)} reports ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} among ${c.group1} and ${fmtInt(x2)} in ${fmtInt(n2)} among ${c.group2}. The ${fmtPct(confidence, 0)} interval for $p_1 - p_2$ has a margin of error of ${fmt(moe, 4)}.\n\nThe Office wants that margin **halved**, and will collect more of both groups in the same proportion, at the same rates.\n\n**How many ${c.unit} would the first group then have to contain?** Give a whole number.`,
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      answer: numericAnswer(needed, 'count'),
      hints: [
        'Find where the sample sizes sit in the margin formula. They are underneath, inside a square root — so the margin does not fall in proportion to the data collected, and the factor you need is not the factor you might expect.',
        `Scaling both groups by the same factor $k$ divides every term inside the root by $k$, so the whole standard error is divided by $\\sqrt{k}$ and so is the margin. For the margin to be halved you need $\\sqrt{k} = 2$. The first group currently holds ${fmtInt(n1)} ${c.unit}.`,
      ],
      solution: `Scale both samples by a factor $k$, holding the rates where they are. Every term under the root picks up a $1/k$:\n\n$$\\text{SE}(k) = \\sqrt{\\frac{\\hat p_1(1 - \\hat p_1)}{k\\,n_1} + \\frac{\\hat p_2(1 - \\hat p_2)}{k\\,n_2}} = \\frac{\\text{SE}}{\\sqrt{k}}$$\n\nSo the margin is divided by $\\sqrt{k}$, and halving it needs $\\sqrt{k} = 2$, that is $k = 4$.\n\n$$n_1' = 4 \\times ${fmtInt(n1)} = ${fmtInt(needed)}$$\n\n**${fmtInt(needed)} ${c.unit}** in the first group (and ${fmtInt(4 * n2)} in the second). Checking it: the interval built on ${fmtInt(needed)} and ${fmtInt(4 * n2)} at the same rates has a margin of ${fmt(scaledMoe, 5)}, against ${fmt(moe, 5)} now — half, to rounding.\n\nThat is the shape of every precision question in this unit. Precision improves as $\\sqrt{n}$, so the cost of precision grows as $n^2$: twice as good costs four times the file, three times as good costs nine. It is also the reason a difference between two groups is expensive to pin down — you are paying that square-root price twice, once in each sample.`,
      misconception: 'Doubling the sample to halve the margin. n sits under a square root, so the margin falls as 1/√n and halving it costs four times the data.',
    }
  },
})
