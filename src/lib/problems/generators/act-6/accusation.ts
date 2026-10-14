/**
 * act-6-08 · The Accusation — drills. AP 6.10 and 6.11: the two-proportion z-test end to end. The
 * pooled standard error and why the test has one at all, the four Large Counts products computed at
 * the pooled rate, the statistic, the p-value, the four-step conclusion, and the scope the file is
 * allowed to claim.
 *
 *   act-6/pooled-or-unpooled      choice   which standard error belongs to which procedure
 *   act-6/pooled-test-statistic   numeric  z from the pooled SE (Act VI checkpoint q11)
 *   act-6/two-prop-p-value        numeric  the tail the alternative names
 *   act-6/pooled-conditions       interp   Random, 10%, Large Counts at p̂c — with the four products
 *   act-6/four-step-test          interp   the conclusion, with the decision and the context in it
 *   act-6/scope-of-inference      choice   what population, and whether cause may be claimed
 *
 * `pooledConditionsRubric` and `fourStepConclusionRubric` are exported because act-6-08's two
 * mission beats grade the learner's own sentences with exactly the rubrics these drills use.
 *
 * The Lane's own case — 19/900 against 12/1,712, z ≈ 3.16, p ≈ 0.0008, smallest pooled count 10.7 —
 * belongs to the mission beats and never appears in a drill. `RESERVED_COUNTS`, `reservedStat` and
 * `reservedP` enforce that.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableSpec } from '@/lib/problems/generate'
import { conditionsCheck } from '@/lib/problems/rubrics'
import { numberRegex } from '@/lib/problems/rubric'
import type { InterpretationAnswer, RubricGroup } from '@/lib/problems/types'
import { pValueZ, round, twoPropInterval, twoPropTest, type Alternative } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'
import { AGENCY_FORBIDDEN, conclusionInContextRubric } from './conclusion'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

/** Counts the Lane's own accusation owns. A drill that draws one of them has leaked a mission beat. */
const RESERVED_COUNTS = new Set([19, 31, 900, 1712, 2612, 2580])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
const reservedStat = (z: number): boolean => Math.abs(z - 3.163) < 0.05
const reservedP = (p: number): boolean => Math.abs(p - 0.00078) < 0.00015

const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
const alphaStr = (a: number): string => fmt(a, a < 0.01 ? 3 : 2)

/** The levels a lane office actually writes into a review plan. */
const WORKING_ALPHAS = [0.1, 0.05, 0.01] as const

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

interface Case {
  /** "the Sinope ferry run" */
  lane: string
  office: string
  /** The two groups compared, in the order the question asks for them. */
  group1: string
  group2: string
  /** What is counted, plural: "sealed-hold rejections". */
  event: string
  /** The rate in words, singular: "rejection rate per transit". */
  variable: string
  /** What the denominator counts, plural. */
  unit: string
  /** Who the conclusion is about. */
  population: string
  /** How the file came to exist — the sentence the Random condition needs. */
  provenance: string
  /** The window and the source the scope sentence must name. */
  window: string
  rateRange: [number, number]
}

const CASES: readonly Case[] = [
  {
    lane: 'the Amalthea ferry run',
    office: 'the Amalthea berth office',
    group1: 'hulls on the short-turn charter',
    group2: 'hulls on the standing schedule',
    event: 'sealed-hold rejections',
    variable: 'rejection rate per transit',
    unit: 'transits',
    population: 'transits on the Amalthea ferry run',
    provenance: 'the berth log records every transit the run has flown, and nothing about how a transit came to be flown was related to whether its hold was rejected',
    window: 'transits logged between 2179 and 2184',
    rateRange: [0.05, 0.13],
  },
  {
    lane: 'the Lysithea cargo circuit',
    office: 'the Lysithea traffic office',
    group1: 'hulls surveyed by the contract inspectorate',
    group2: 'hulls surveyed by the Authority',
    event: 'deficiency notices',
    variable: 'notice rate per survey',
    unit: 'surveys',
    population: 'surveys on the Lysithea cargo circuit',
    provenance: 'the survey file is the circuit’s complete record, and which inspectorate saw a hull was fixed by the berth roster rather than by anything about the hull',
    window: 'surveys filed between 2180 and 2184',
    rateRange: [0.06, 0.15],
  },
  {
    lane: 'the Praxidike shuttle',
    office: 'the Praxidike port office',
    group1: 'hulls carrying the older reaction-control fit',
    group2: 'hulls carrying the current fit',
    event: 'docking aborts',
    variable: 'abort rate per approach',
    unit: 'approaches',
    population: 'approaches at Praxidike Anchorage',
    provenance: 'approach control logs every attempt automatically, and the fit a hull carries was decided at build rather than by the port',
    window: 'approaches logged in the four seasons to 2184',
    rateRange: [0.04, 0.12],
  },
  {
    lane: 'the Iocaste supply loop',
    office: 'the Iocaste yard office',
    group1: 'hulls held on the co-operative charter',
    group2: 'hulls held privately',
    event: 'insurance claims',
    variable: 'claim rate per voyage',
    unit: 'voyages',
    population: 'voyages on the Iocaste supply loop',
    provenance: 'the underwriter’s file carries every voyage the loop insured, and the ownership class of a hull was set years before any of these voyages was flown',
    window: 'voyages underwritten between 2178 and 2183',
    rateRange: [0.05, 0.14],
  },
  {
    lane: 'the Kalyke feeder',
    office: 'the Kalyke relay office',
    group1: 'hulls routed through the outer waypoint',
    group2: 'hulls routed direct',
    event: 'lost relay contacts',
    variable: 'contact-loss rate per transit',
    unit: 'transits',
    population: 'transits on the Kalyke feeder',
    provenance: 'the relay keeps a complete contact record, and routing was assigned by traffic control on the day rather than chosen by the master',
    window: 'transits recorded between 2181 and 2184',
    rateRange: [0.05, 0.13],
  },
] as const

interface TwoPropDraw {
  c: Case
  x1: number
  n1: number
  x2: number
  n2: number
  p1: number
  p2: number
  pooled: number
  z: number
  p: number
  se: number
  /** The four Large Counts products under H₀, at the pooled rate, rounded to one place. */
  counts: { successes: number; failures: number }[]
  smallest: number
  alt: Alternative
}

/**
 * Two groups on one corridor, sized so that the four *pooled* products clear 10 and the test lands
 * somewhere a review would argue about. `band` fixes where the statistic falls, because a drill
 * about the conclusion needs a rejection and a drill about scope does not care.
 */
function drawCase(rng: Rng, opts: { alt?: Alternative; zBand?: [number, number] } = {}): TwoPropDraw {
  const c = pickContext(rng, CASES)
  const alt = opts.alt ?? 'greater'
  const [zLo, zHi] = opts.zBand ?? [1.4, 2.9]
  return retry(
    rng,
    (r) => {
      const base = r.uniform(c.rateRange[0], c.rateRange[1])
      const n1 = 10 * r.int(14, 46)
      const n2 = 10 * r.int(18, 60)
      const x1 = r.binomial(n1, Math.min(0.7, base * r.uniform(1.3, 2.2)))
      const x2 = r.binomial(n2, base)
      const t = twoPropTest({ x1, n1, x2, n2, alt, random: true })
      const pooled = t.pooled ?? (x1 + x2) / (n1 + n2)
      const counts = [
        { successes: round(n1 * pooled, 1), failures: round(n1 * (1 - pooled), 1) },
        { successes: round(n2 * pooled, 1), failures: round(n2 * (1 - pooled), 1) },
      ]
      return {
        c,
        x1,
        n1,
        x2,
        n2,
        p1: x1 / n1,
        p2: x2 / n2,
        pooled,
        z: t.statistic,
        p: t.pValue ?? 1,
        se: t.se,
        counts,
        smallest: Math.min(...counts.flatMap((k) => [k.successes, k.failures])),
        alt,
      }
    },
    (d) =>
      d.smallest >= 10.5 &&
      d.p1 > d.p2 &&
      d.z >= zLo &&
      d.z <= zHi &&
      Number.isFinite(d.p) &&
      !reservedStat(d.z) &&
      !reservedP(d.p) &&
      ![d.n1, d.n2, d.x1, d.x2].some(reservedCount),
  )
}

// ---------------------------------------------------------------------------------------------
// The two rubrics act-6-08's drills and its mission beats share
// ---------------------------------------------------------------------------------------------

export interface PooledConditionsArgs {
  n1: number
  n2: number
  /** The pooled proportion the four products are computed at. */
  pooled: number
  /** Display names for the two groups. */
  group1: string
  group2: string
  /** What the denominators count, plural: 'transits'. */
  unit: string
  /** The corridor, for the context clause. */
  context: string
}

/**
 * Conditions for a two-proportion z-**test** (AP 6.10): the standard `conditionsCheck` template,
 * plus the one thing that separates the test's check from the interval's — the four Large Counts
 * products are computed at the pooled proportion, because the null says there is a single rate and
 * every observation in both samples is evidence about it.
 *
 * Used by `act-6/pooled-conditions` and by act-6-08's conditions beat.
 */
export function pooledConditionsRubric({ n1, n2, pooled, group1, group2, unit, context }: PooledConditionsArgs): InterpretationAnswer {
  const counts = [
    { successes: round(n1 * pooled, 1), failures: round(n1 * (1 - pooled), 1) },
    { successes: round(n2 * pooled, 1), failures: round(n2 * (1 - pooled), 1) },
  ]
  const smallest = Math.min(...counts.flatMap((k) => [k.successes, k.failures]))
  const base = conditionsCheck({ procedure: 'two-prop-z', random: 'sample', n: [n1, n2], counts, context })
  const pooledGroup: RubricGroup = {
    label: `Computes Large Counts at the pooled proportion (p̂c = ${fmt(pooled, 4)})`,
    phrasings: ['pool', numberRegex(pooled, 4, 1)],
    polarity: 'any',
    feedback: `The test's Large Counts products are computed at the pooled p̂c = ${fmt(pooled, 4)}, not at each sample's own rate. Under H₀ there is one rate, and pooling is how the procedure says so.`,
  }
  const smallestGroup: RubricGroup = {
    label: `Names the smallest of the four products (${fmt(smallest, 1)})`,
    phrasings: [numberRegex(smallest, 1, 1)],
    polarity: 'any',
    feedback: `Say which product is smallest and what it comes to: ${fmt(smallest, 1)}. A reader checking this condition goes straight to the weakest number, and it should already be on your page.`,
  }
  const required: RubricGroup[] = [...base.required, pooledGroup, smallestGroup]
  const exemplar =
    `Random: ${context}, so the condition is a stated property of the process rather than an assumption about a draw. ` +
    `Independent: 10 × ${fmtInt(n1)} = ${fmtInt(10 * n1)} and 10 × ${fmtInt(n2)} = ${fmtInt(10 * n2)} ${unit} are far fewer than the process could produce, so the observations behave as independent ones. ` +
    `Large Counts, computed at the pooled proportion p̂c = ${fmt(pooled, 4)} because H₀ says both groups share one rate: ${fmt(counts[0].successes, 1)} successes and ${fmt(counts[0].failures, 1)} failures among ${group1}, ` +
    `${fmt(counts[1].successes, 1)} successes and ${fmt(counts[1].failures, 1)} failures among ${group2}. All four are at least 10, and the smallest is ${fmt(smallest, 1)}.`
  return { type: 'interpretation', required, forbidden: base.forbidden, exemplar, minWords: 30 }
}

export interface FourStepArgs {
  pValue: number
  alpha: number
  /** The rate in words, singular: 'rejection rate per transit'. */
  parameter: string
  /** Whom the conclusion is about. */
  population: string
  /** The group the alternative says is worse off. */
  group1: string
  /** What the first group's rate is being compared with, in words. */
  group2: string
  /** The window and source the scope clause must carry. */
  window: string
  /** Extra direction words the context would accept. */
  directionWords?: string[]
}

/**
 * The conclusion a two-proportion z-test is allowed to write (AP 6.11): the shared
 * `significanceTestConclusion` template, plus the scope clause — which units, over which window —
 * and the Act's standing bar on agency and intent, because a difference of two rates contains
 * neither.
 *
 * Used by `act-6/four-step-test` and by act-6-08's conclusion beat.
 */
export function fourStepConclusionRubric({ pValue, alpha, parameter, population, group1, group2, window, directionWords = [] }: FourStepArgs): InterpretationAnswer {
  const base = conclusionInContextRubric({
    pValue,
    alpha,
    direction: 'greater',
    parameter,
    population,
    variable: `for ${group1}`,
    nullValue: group2,
    directionWords: ['higher', 'more often', ...directionWords],
    extraForbidden: AGENCY_FORBIDDEN,
  })
  const scopeGroup: RubricGroup = {
    label: 'States the scope (which units, over which window)',
    phrasings: [window, /\b(?:scope|window|record|snapshot|between|during|over the)\b/],
    polarity: 'any',
    feedback: `Say what the finding covers: ${window}. A conclusion with no scope is quoted as though it covered everything.`,
  }
  const required: RubricGroup[] = [...base.required, scopeGroup]
  const decision = pValue < alpha
  const exemplar = decision
    ? `Because the p-value (${fmtP(pValue)}) is less than α = ${alphaStr(alpha)}, we reject H₀. There is convincing evidence that the true ${parameter} for ${group1} is greater than ${group2}, among ${population}. The finding covers ${window}, and it identifies no cause and no party.`
    : `Because the p-value (${fmtP(pValue)}) is greater than α = ${alphaStr(alpha)}, we fail to reject H₀. There is not convincing evidence that the true ${parameter} for ${group1} is greater than ${group2}, among ${population}. The finding covers ${window}, and it identifies no cause and no party.`
  return { type: 'interpretation', required, forbidden: base.forbidden, exemplar, minWords: 20 }
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — which standard error belongs to which procedure
// ---------------------------------------------------------------------------------------------

export const pooledOrUnpooled = defineGenerator({
  id: 'act-6/pooled-or-unpooled',
  label: 'Pooled for the test, unpooled for the interval',
  ap_topics: ['6.10'],
  skills: ['1', '2'],
  generate(rng) {
    const d = drawCase(rng)
    const { c, x1, n1, x2, n2, p1, p2, pooled, se } = d
    const seUnpooled = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
    const interval = twoPropInterval({ x1, n1, x2, n2, confidence: 0.95, random: true })
    const mean2 = (p1 + p2) / 2
    const seMean = Math.sqrt(mean2 * (1 - mean2) * (1 / n1 + 1 / n2))
    const cands: Candidate[] = [
      {
        text: `The test standardizes against $\\sqrt{\\hat p_c(1 - \\hat p_c)(1/n_1 + 1/n_2)} = ${fmt(se, 5)}$ with $\\hat p_c = ${fmt(pooled, 4)}$; the interval uses $\\sqrt{\\hat p_1(1-\\hat p_1)/n_1 + \\hat p_2(1-\\hat p_2)/n_2} = ${fmt(seUnpooled, 5)}$, each sample keeping its own rate.`,
        correct: true,
        why: null,
      },
      {
        text: `Both use the pooled standard error ${fmt(se, 5)}. Pooling uses every ${c.unit.replace(/s$/, '')} in the file to estimate the rate, so it is the more precise of the two and belongs in both procedures.`,
        correct: false,
        why: `Pooling is not a precision technique. It is a consequence of a hypothesis: $H_0$ asserts a single common rate, so under $H_0$ every ${c.unit.replace(/s$/, '')} is evidence about that one rate and combining them is legitimate. An interval asserts nothing — it exists precisely because the two rates might differ — so it has no licence to pool, and using ${fmt(se, 5)} there would be assuming the answer to the question the interval was built to ask.`,
      },
      {
        text: `Both use the unpooled standard error ${fmt(seUnpooled, 5)}, because $\\hat p_1$ and $\\hat p_2$ are what the file actually measured and a procedure should use the data it has.`,
        correct: false,
        why: `A test measures the observed gap against the spread the **null** predicts, and the null says there is one rate. Building the null's own standard error out of two separate estimates describes a world where the rates differ, which is the world $H_0$ denies. Here that is ${fmt(seUnpooled, 5)} against the correct ${fmt(se, 5)}, and the statistic moves with it.`,
      },
      {
        text: `The test pools by averaging the two sample proportions, $(\\hat p_1 + \\hat p_2)/2 = ${fmt(mean2, 4)}$, giving a standard error of ${fmt(seMean, 5)}; the interval keeps them separate.`,
        correct: false,
        why: `The second half is right and the pooling is not. $\\hat p_c$ is a count over a count — $(x_1 + x_2)/(n_1 + n_2) = ${fmtInt(x1 + x2)}/${fmtInt(n1 + n2)} = ${fmt(pooled, 4)}$ — which weights each group by its size. A plain average of ${fmt(p1, 4)} and ${fmt(p2, 4)} gives ${fmtInt(n1)} and ${fmtInt(n2)} ${c.unit} the same say, and they have not earned the same say.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(c.office)} has one file and two questions about ${c.lane}: whether ${c.group1} log ${c.event} at a higher rate than ${c.group2}, and by how much. It will run a two-proportion z-test and build a 95% confidence interval for $p_1 - p_2$ from the same ${fmtInt(x1)} of ${fmtInt(n1)} and ${fmtInt(x2)} of ${fmtInt(n2)}.\n\n**Which standard error does each procedure use, and why?**`,
      answer: { type: 'choice', options, correct, feedback },
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      hints: [
        'Ask what each procedure is assuming while it computes. One of them has been handed a hypothesis to work inside; the other has been handed nothing and is estimating a difference that may be anything.',
        `Under $H_0$ there is a single rate, so it is estimated from the whole file: $\\hat p_c = (${fmtInt(x1)} + ${fmtInt(x2)})/(${fmtInt(n1)} + ${fmtInt(n2)}) = ${fmt(pooled, 4)}$. The interval makes no such claim, so each sample keeps its own $\\hat p$.`,
      ],
      solution: `**${options[correct]}**\n\nOne file, two standard errors, and the difference between them is a difference in what is being assumed.\n\n**The test lives inside $H_0$.** The null says $p_1 = p_2$: one rate, shared. The best estimate of a shared rate uses every observation there is, so $\\hat p_c = ${fmtInt(x1 + x2)}/${fmtInt(n1 + n2)} = ${fmt(pooled, 4)}$, and the spread the statistic is measured against is the one that world predicts:\n\n$$\\text{SE}_0 = \\sqrt{\\hat p_c(1 - \\hat p_c)\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)} = ${fmt(se, 5)}$$\n\n**The interval lives outside it.** It is built for the case where the rates differ, and it has no null to borrow from, so each sample estimates its own rate and the two variances add:\n\n$$\\text{SE} = \\sqrt{\\frac{\\hat p_1(1 - \\hat p_1)}{n_1} + \\frac{\\hat p_2(1 - \\hat p_2)}{n_2}} = ${fmt(seUnpooled, 5)}$$\n\nOn this file the two come to ${fmt(se, 5)} and ${fmt(seUnpooled, 5)}, close enough that the test and the 95% interval (${fmt(interval.ci![0], 4)}, ${fmt(interval.ci![1], 4)}) agree about zero. They will usually agree. They are still different quantities, and a result close to the line can fall on either side of it depending on which one was used — which is why the correspondence between an interval and a test is a near-identity for proportions and an algebraic identity for means.`,
      misconception: 'Treating pooling as a way of getting more data into the standard error. It is a way of obeying the null hypothesis, and only the test has one.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the statistic (Act VI checkpoint q11)
// ---------------------------------------------------------------------------------------------

export const pooledTestStatistic = defineGenerator({
  id: 'act-6/pooled-test-statistic',
  label: 'The two-proportion z statistic, pooled',
  ap_topics: ['6.10'],
  skills: ['3'],
  generate(rng) {
    const d = drawCase(rng)
    const { c, x1, n1, x2, n2, p1, p2, pooled, z, se } = d
    const seUnpooled = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
    const zUnpooled = (p1 - p2) / seUnpooled
    return {
      prompt: `${sentence(c.office)} is testing $H_0: p_1 = p_2$ against $H_a: p_1 > p_2$ on ${c.lane}, where $p_1$ and $p_2$ are the true ${c.variable} for ${c.group1} and ${c.group2}. The file returns ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} for the first group and ${fmtInt(x2)} in ${fmtInt(n2)} for the second.\n\n**Compute the standardized test statistic**, to two decimal places.`,
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      answer: numericAnswer(z, 'testStat'),
      hints: [
        'Estimate minus null value, divided by the standard error of the estimate under H₀. The estimate is the difference in sample proportions and the null value is zero, so the only decision left is which standard error the null licenses.',
        `Under $H_0$ there is one rate: $\\hat p_c = (${fmtInt(x1)} + ${fmtInt(x2)})/(${fmtInt(n1)} + ${fmtInt(n2)}) = ${fmt(pooled, 4)}$. Then $\\text{SE} = \\sqrt{\\hat p_c(1 - \\hat p_c)(1/${fmtInt(n1)} + 1/${fmtInt(n2)})}$.`,
        `$(${fmt(p1, 4)} - ${fmt(p2, 4)}) \\div ${fmt(se, 5)}$, to two decimals.`,
      ],
      solution: `**Pool, because the null says there is one rate.**\n\n$$\\hat p_c = \\frac{x_1 + x_2}{n_1 + n_2} = \\frac{${fmtInt(x1)} + ${fmtInt(x2)}}{${fmtInt(n1)} + ${fmtInt(n2)}} = \\frac{${fmtInt(x1 + x2)}}{${fmtInt(n1 + n2)}} = ${fmt(pooled, 4)}$$\n\n**The standard error that world predicts.**\n\n$$\\text{SE} = \\sqrt{\\hat p_c(1 - \\hat p_c)\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)} = \\sqrt{${fmt(pooled, 4)} \\times ${fmt(1 - pooled, 4)} \\times \\left(\\frac{1}{${fmtInt(n1)}} + \\frac{1}{${fmtInt(n2)}}\\right)} = ${fmt(se, 5)}$$\n\n**The statistic.**\n\n$$z = \\frac{(\\hat p_1 - \\hat p_2) - 0}{\\text{SE}} = \\frac{${fmt(p1, 4)} - ${fmt(p2, 4)}}{${fmt(se, 5)}} = \\frac{${fmt(p1 - p2, 5)}}{${fmt(se, 5)}} = ${fmt(z, 2)}$$\n\n**z = ${fmt(z, 2)}.** The observed gap of ${fmt(p1 - p2, 4)} sits ${fmt(z, 2)} standard errors above zero on the curve $H_0$ draws.\n\nRun the same arithmetic with each group's own rate in the standard error and you get ${fmt(seUnpooled, 5)} and $z = ${fmt(zUnpooled, 2)}$. That number is not wrong so much as off-topic: it measures the gap against a world in which the two rates differ, and the test's whole question is what the gap looks like in the world where they do not.`,
      misconception: 'Using each sample’s own p̂ in the standard error. That is the interval’s SE; a test standardizes against the spread the null predicts, and the null predicts one rate.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — the p-value
// ---------------------------------------------------------------------------------------------

export const twoPropPValue = defineGenerator({
  id: 'act-6/two-prop-p-value',
  label: 'The p-value of a two-proportion z-test',
  ap_topics: ['6.10'],
  skills: ['3'],
  generate(rng) {
    const twoSided = rng.bool(0.35)
    const d = drawCase(rng, { alt: twoSided ? 'two-sided' : 'greater' })
    const { c, x1, n1, x2, n2, p1, p2, pooled, z, p, se } = d
    const oneTail = pValueZ(z, 'greater')
    const other = twoSided ? oneTail : pValueZ(z, 'two-sided')
    const altTex = twoSided ? 'p_1 \\ne p_2' : 'p_1 > p_2'
    return {
      prompt: `${sentence(c.office)} wrote its alternative into the review plan before it opened the file: $H_0: p_1 = p_2$ against $H_a: ${altTex}$, where $p_1$ and $p_2$ are the true ${c.variable} for ${c.group1} and ${c.group2} on ${c.lane}. The file returns ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} against ${fmtInt(x2)} in ${fmtInt(n2)}, which pools to $\\hat p_c = ${fmt(pooled, 4)}$ and standardizes to $z = ${fmt(z, 2)}$.\n\n**What is the p-value?** Four decimal places.`,
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      answer: numericAnswer(p, 'pValue', { digits: 4 }),
      hints: [
        'How many tails get counted is a property of the alternative, and the alternative was fixed before the data. Read it off the plan, not off the sign of the statistic.',
        twoSided
          ? `A two-sided alternative counts a departure of either sign as at least as extreme, so the area is $2 \\times P(Z \\ge |${fmt(z, 2)}|)$.`
          : `A one-sided alternative pointing up counts only the upper tail: $P(Z \\ge ${fmt(z, 2)})$.`,
      ],
      solution: `$z = ${fmt(z, 2)}$ on the standard normal, and $H_a: ${altTex}$ decides how much of the curve counts.\n\n$$P = ${twoSided ? `2\\,P\\big(Z \\ge |${fmt(z, 2)}|\\big)` : `P\\big(Z \\ge ${fmt(z, 2)}\\big)`} = ${fmt(p, 4)}$$\n\n**P = ${fmtP(p)}.** Said as a frequency: if ${c.group1} and ${c.group2} really did log ${c.event} at the same rate, about ${fmtPct(p, 2)} of files of this size would come back ${twoSided ? 'at least this lopsided in one direction or the other' : 'at least this far in this direction'}.\n\nThe other reading of the same statistic gives ${fmtP(other)}. ${twoSided ? 'That is the one-tailed area, and quoting it under a two-sided alternative halves the number and doubles the real false-alarm rate.' : 'That is the two-tailed area, and quoting it here would pay a penalty for a choice the office did not make: the direction went into the plan, with a reason and a date, before any row was read.'}\n\nNote what the sentence above does not say. It is a statement about how often files behave a certain way in a world where the rates are equal. It is not the probability that the rates are equal, and the standard error ${fmt(se, 5)} that produced it was built inside that world on purpose.`,
      misconception: 'Choosing the number of tails after seeing which way the difference ran. The alternative fixes the tail before the data; picking it afterwards is a two-sided procedure reported at a one-sided rate.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — the conditions, at the pooled rate
// ---------------------------------------------------------------------------------------------

export const pooledConditions = defineGenerator({
  id: 'act-6/pooled-conditions',
  label: 'Conditions for a two-proportion z-test',
  ap_topics: ['6.10'],
  skills: ['1', '4'],
  generate(rng) {
    const d = drawCase(rng)
    const { c, x1, n1, x2, n2, p1, p2, pooled, counts, smallest } = d
    const answer = pooledConditionsRubric({ n1, n2, pooled, group1: c.group1, group2: c.group2, unit: c.unit, context: c.provenance })
    const observedSmallest = Math.min(x1, n1 - x1, x2, n2 - x2)
    return {
      prompt: `${sentence(c.office)} intends to test $H_0: p_1 = p_2$ against $H_a: p_1 > p_2$ for ${c.group1} against ${c.group2} on ${c.lane}: ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} against ${fmtInt(x2)} in ${fmtInt(n2)}. Of the file's provenance the office records only this: ${c.provenance}.\n\n**Check the conditions for the test, with the numbers.** Name each one, show what it comes to, and say which of the four Large Counts products is the smallest.`,
      answer,
      data: tableSpec(
        ['group', c.event, c.unit, 'observed rate', `expected ${c.event} at p̂c`],
        [
          [c.group1, x1, n1, fmt(p1, 4), fmt(counts[0].successes, 1)],
          [c.group2, x2, n2, fmt(p2, 4), fmt(counts[1].successes, 1)],
        ],
      ),
      hints: [
        'Three conditions, three sentences, each with a number in it. One is about how the data came to exist, one about how much more data the process could have produced, and one is arithmetic you show rather than assert.',
        `For a **test**, the four Large Counts products are computed at the pooled proportion: $\\hat p_c = ${fmt(pooled, 4)}$, then $n_1\\hat p_c$, $n_1(1 - \\hat p_c)$, $n_2\\hat p_c$ and $n_2(1 - \\hat p_c)$. All four must clear 10.`,
        `Those four come to ${fmt(counts[0].successes, 1)}, ${fmt(counts[0].failures, 1)}, ${fmt(counts[1].successes, 1)} and ${fmt(counts[1].failures, 1)}. Say which is smallest.`,
      ],
      solution: `**${answer.exemplar}**\n\nThe third condition is the one that separates this procedure from the interval built on the same two samples.\n\n- The **test** computes its four products at $\\hat p_c = ${fmt(pooled, 4)}$, because $H_0$ says both groups run at one rate and every ${c.unit.replace(/s$/, '')} in the file is evidence about it. Smallest: **${fmt(smallest, 1)}**.\n- An **interval** on the same file would use each sample's own observed counts — ${fmtInt(x1)} and ${fmtInt(n1 - x1)}, then ${fmtInt(x2)} and ${fmtInt(n2 - x2)}, smallest ${fmtInt(observedSmallest)} — because it assumes nothing about the two rates being equal.\n\nThe two checks can disagree, and when they do each is right about its own procedure. Checking a test's condition with the observed counts is checking a model the test is not using.\n\nAnd put the smallest product on the page rather than in the working. A reader who wants the finding dead goes to the weakest number first; the only thing worse than having one is having one that somebody else found.`,
      misconception: 'Checking Large Counts with each sample’s own p̂. Pooling exists because H₀ asserted a common rate, and the conditions describe the same null world the standard error does.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Interpretation — the four-step conclusion, with scope
// ---------------------------------------------------------------------------------------------

export const fourStepTest = defineGenerator({
  id: 'act-6/four-step-test',
  label: 'The conclusion of a two-proportion z-test, with its scope',
  ap_topics: ['6.11'],
  skills: ['4'],
  generate(rng) {
    const d = drawCase(rng, { zBand: [2.4, 3.8] })
    const { c, x1, n1, x2, n2, p1, p2, pooled, z, p } = d
    const alpha = rng.choice(WORKING_ALPHAS.filter((a) => p < a / 1.5))
    const answer = fourStepConclusionRubric({
      pValue: p,
      alpha,
      parameter: c.variable,
      population: c.population,
      group1: c.group1,
      group2: c.group2,
      window: c.window,
    })
    return {
      prompt: `${sentence(c.office)} fixed $\\alpha = ${alphaStr(alpha)}$ in its review plan and tested $H_0: p_1 = p_2$ against $H_a: p_1 > p_2$, where $p_1$ and $p_2$ are the true ${c.variable} for ${c.group1} and ${c.group2} among ${c.population}. The conditions hold at the pooled rate. The file — ${c.window} — returns ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} against ${fmtInt(x2)} in ${fmtInt(n2)}, so $\\hat p_c = ${fmt(pooled, 4)}$, $z = ${fmt(z, 2)}$ and $P = ${fmtP(p)}$.\n\n**Write the conclusion**, with its scope. Two or three sentences, and nothing in them that the procedure did not pay for.`,
      answer,
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      hints: [
        `The decision first, and it is one comparison: $P = ${fmtP(p)}$ against the $\\alpha = ${alphaStr(alpha)}$ that was written down before the file was opened. Both numbers go in the sentence.`,
        `Then the finding, framed as evidence rather than proof, in the direction $H_a$ named, about the true ${c.variable} for ${c.group1} against ${c.group2}, among ${c.population}.`,
        `Then the scope, which is the clause everybody drops: this covers ${c.window}, and it names no cause and no party. A two-proportion test compares two rates; there is no actor anywhere in the arithmetic.`,
      ],
      solution: `**${answer.exemplar}**\n\nFour steps, and the last two are where the marks and the trouble both are.\n\n1. **State.** $H_0: p_1 = p_2$, $H_a: p_1 > p_2$, with $p_1$ and $p_2$ the *true* ${c.variable} for the two groups among ${c.population}. Parameters, not $\\hat p$.\n2. **Plan.** Two-proportion z-test, pooled, conditions checked at $\\hat p_c = ${fmt(pooled, 4)}$ and the smallest product named.\n3. **Do.** $z = ${fmt(z, 2)}$, $P = ${fmtP(p)}$, one tail.\n4. **Conclude.** $P = ${fmtP(p)} < \\alpha = ${alphaStr(alpha)}$, so reject $H_0$; there is convincing evidence of a higher ${c.variable} among ${c.group1}.\n\n**The scope is part of the conclusion and not an appendix to it.** The file is ${c.window} and nothing else. It says nothing about ${c.lane} in 2170, nothing about any other corridor, and nothing about what will happen next season.\n\n**And it names nobody.** ${fmt(p1, 4)} against ${fmt(p2, 4)} is a difference between two rates. It is equally consistent with a harder route, an older fleet, a berth master with a habit, a recording practice that differs between the two groups, and a run of bad luck at a rate we have now measured to be small. Every one of those produces this arithmetic. *Proves*, *targeted* and *caused by* are struck on sight, and striking them costs the finding nothing.`,
      misconception: 'Stopping at the decision, or letting the sentence outrun the procedure. The conclusion is about a rate, over a stated window, framed as evidence — and a difference in proportions contains no actor.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — scope of inference
// ---------------------------------------------------------------------------------------------

export const scopeOfInference = defineGenerator({
  id: 'act-6/scope-of-inference',
  label: 'What the finding covers, and what it may claim',
  ap_topics: ['6.11'],
  skills: ['4'],
  generate(rng) {
    const d = drawCase(rng, { zBand: [2.4, 3.8] })
    const { c, x1, n1, x2, n2, p1, p2, p } = d
    const cands: Candidate[] = [
      {
        text: `The finding applies to ${c.population} over ${c.window}, and it establishes an association between group and ${c.event}, not a cause. Groups were not assigned at random for the purpose of this comparison, so a difference in rates is consistent with any number of mechanisms the file cannot separate.`,
        correct: true,
        why: null,
      },
      {
        text: `The finding applies to ${c.population} over ${c.window}, and because the test rejected $H_0$ at a stated level it establishes that being in the first group causes ${c.event}.`,
        correct: false,
        why: `A p-value measures how surprising the data are under $H_0$. It does not care how the two groups came to be two groups, and it cannot. Causation is bought by random assignment — by an experimenter deciding, with a coin, which hulls go into which group — and no significance level substitutes for it. ${fmt(p1, 4)} against ${fmt(p2, 4)} is an association, however small the p-value.`,
      },
      {
        text: `The finding applies to every ${c.unit.replace(/s$/, '')} on every corridor the ${c.office.replace(/^the /, '')} oversees, because the two groups are defined the same way everywhere and a rate is a rate.`,
        correct: false,
        why: `Inference reaches as far as the file and no further. These ${fmtInt(n1 + n2)} ${c.unit} came from ${c.lane} over ${c.window}; another corridor has other routes, other traffic and other recording habits, and nothing in this arithmetic measured any of them. Extending the population is the commonest way an honest conclusion becomes a false one, and it requires no error of computation at all.`,
      },
      {
        text: `The finding applies only to the ${fmtInt(n1)} and ${fmtInt(n2)} ${c.unit} actually in the file. ${fmtInt(x1)} and ${fmtInt(x2)} ${c.event} are facts about those ${c.unit}, so the conclusion cannot reach past them.`,
        correct: false,
        why: `That would make the whole procedure pointless. The rates in the file — ${fmt(p1, 4)} and ${fmt(p2, 4)} — are known exactly and need no test; nobody runs a significance test to find out what is already written down. The test exists to say something about the true rates of the *process* these ${c.unit} came from, and the p-value of ${fmtP(p)} is a statement about that process. The scope is narrower than "everywhere" and wider than "these rows".`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(c.office)} has rejected $H_0: p_1 = p_2$ in favour of $H_a: p_1 > p_2$ on ${c.lane}: ${fmtInt(x1)} ${c.event} in ${fmtInt(n1)} ${c.unit} among ${c.group1} against ${fmtInt(x2)} in ${fmtInt(n2)} among ${c.group2}, $P = ${fmtP(p)}$. The file covers ${c.window}. ${sentence(c.provenance)}.\n\n**What is the scope of this finding?**`,
      answer: { type: 'choice', options, correct, feedback },
      data: tableSpec(
        ['group', c.event, c.unit, 'sample proportion'],
        [
          [c.group1, x1, n1, fmt(p1, 4)],
          [c.group2, x2, n2, fmt(p2, 4)],
        ],
      ),
      hints: [
        'Two separate questions, and an option has to get both right. How far does the conclusion reach — which units, over what window? And what kind of claim is it: association, or cause?',
        'The second question is settled by how the groups came to be groups, not by the size of the p-value. Ask whether anybody assigned them.',
      ],
      solution: `**${options[correct]}**\n\n**How far it reaches.** To the process that produced these ${fmtInt(n1 + n2)} ${c.unit}: ${c.population}, over ${c.window}. Not to the rows themselves, which are known exactly and would need no test, and not to corridors the file never saw.\n\n**What kind of claim it is.** An association. ${c.group1} and ${c.group2} were not sorted into groups by a coin; they were already what they were before the office opened the file. Every observational comparison carries the same limitation, and a small p-value does nothing about it: $P = ${fmtP(p)}$ says the gap is hard to produce by chance under $H_0$, and says nothing whatever about what does produce it.\n\nWrite both halves into the report. A conclusion with no scope is quoted as though it covered everything, and a conclusion that leaves out the word *association* is read as though it said *cause* — usually by somebody who is summarising it for somebody else.`,
      misconception: 'Reading a small p-value as a licence to claim cause. The p-value measures surprise under H₀; only random assignment converts an association into a causal claim.',
    }
  },
})
