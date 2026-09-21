/**
 * act-6-06 · Paid in Hulls, Paid in People — drills. AP 6.7: the two errors a significance test can
 * make, what each one costs in context, the power of a test against a specific alternative, and the
 * three things that move it.
 *
 *   act-6/type-i-ii                  interp   Type I and Type II for a seeded test, in context,
 *                                             each with its consequence (rubric below)
 *   act-6/power-value                numeric  power against a stated alternative
 *   act-6/power-drivers              choice   what n, α and the size of the difference do to power
 *   act-6/power-not-one-minus-alpha  choice   the "power = 1 − α" misconception, four ways
 *   act-6/error-consequences         choice   which error an office is buying off, and at what price
 *   act-6/choose-alpha               choice   set α from the consequences — never from the data
 *
 * `typeIandIIRubric` is exported because act-6-06's mission beat grades the learner's own paragraph
 * with exactly the rubric these drills use. The Lane's own 19/900 against 12/1,712 — its z ≈ 3.16,
 * its p ≈ 0.0008 and its 0.021-against-0.007 alternative — belong to the mission beats and never
 * appear here.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contentWords, contextGroup } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { normal, powerZTestProportion, seProportion } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

/** Numbers the Lane's own case owns. A drill that reproduces one of them has leaked a mission beat. */
const RESERVED_COUNTS = new Set([19, 31, 900, 1712, 2612, 2580])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
/** The Lane's own statistic, p-value and pre-specified alternative. */
const reservedStat = (z: number): boolean => Math.abs(z - 3.163) < 0.04
const reservedRate = (p: number): boolean => Math.abs(p - 0.021) < 0.0006 || Math.abs(p - 0.007) < 0.0006 || Math.abs(p - 31 / 2612) < 0.0006

const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

interface Office {
  lane: string
  office: string
  /** What is counted, plural: "off-nominal advisories". */
  event: string
  /** The proportion in words. */
  parameter: string
  /** What the denominator counts, plural. */
  unit: string
  /** Plausible band for a posted baseline rate. */
  baseRange: [number, number]
}

const OFFICES: readonly Office[] = [
  {
    lane: 'the Adrastea feeder lane',
    office: 'the Adrastea Lane Office',
    event: 'off-nominal advisories',
    parameter: 'proportion of transits that log an off-nominal advisory',
    unit: 'transits',
    baseRange: [0.08, 0.18],
  },
  {
    lane: 'the Thebe–Amalthea shuttle run',
    office: 'the Thebe Yard traffic office',
    event: 'transponder dropouts',
    parameter: 'proportion of transits with a transponder dropout',
    unit: 'transits',
    baseRange: [0.06, 0.15],
  },
  {
    lane: 'the Carme outer loop',
    office: 'the Carme relay office',
    event: 'pressure-seal faults',
    parameter: 'proportion of transits on which a pressure seal faults',
    unit: 'transits',
    baseRange: [0.07, 0.16],
  },
  {
    lane: 'the Themis Reach',
    office: 'the Themis Reach survey office',
    event: 'holds at the mark',
    parameter: 'proportion of arrivals held at the mark',
    unit: 'arrivals',
    baseRange: [0.1, 0.22],
  },
  {
    lane: 'the Hygiea feeder',
    office: 'the Hygiea Hold traffic office',
    event: 'late check-ins',
    parameter: 'proportion of transits that check in late',
    unit: 'transits',
    baseRange: [0.09, 0.2],
  },
] as const

// ---------------------------------------------------------------------------------------------
// 1. Interpretation — the two errors, in context, with their prices
// ---------------------------------------------------------------------------------------------

/**
 * A test somebody will act on. Both consequences are concrete and both are expensive, because an
 * error-analysis drill in which one error is obviously worse teaches the misconception it is
 * supposed to break.
 */
interface ErrorCase {
  lane: string
  office: string
  group1: string
  group2: string
  parameter: string
  unit: string
  /** H₀ in plain words. */
  nullInWords: string
  /** Hₐ in plain words. */
  altInWords: string
  /** What the office does on a rejection. */
  action: string
  typeIConsequence: string
  typeIIConsequence: string
  rateRange: [number, number]
}

const ERROR_CASES: readonly ErrorCase[] = [
  {
    lane: 'the Adrastea feeder lane',
    office: 'the Adrastea Lane Office',
    group1: 'hulls refitted at Adrastea Transfer',
    group2: 'hulls refitted anywhere else',
    parameter: 'advisory rate per transit',
    unit: 'transits',
    nullInWords: 'the two refit yards turn out hulls with the same advisory rate',
    altInWords: 'hulls refitted at Adrastea Transfer log advisories at a higher rate',
    action: 'the Office suspends the Adrastea yard’s certification pending a full survey',
    typeIConsequence: 'a sound yard is suspended on a false alarm, forty crews are re-routed to Thebe for a season, and the yard master takes the suspension to arbitration',
    typeIIConsequence: 'a yard that really is turning out bad refits keeps its certificate, and every hull that goes through it next season goes through it uninspected',
    rateRange: [0.07, 0.16],
  },
  {
    lane: 'the Thebe–Amalthea shuttle run',
    office: 'the Thebe Yard traffic office',
    group1: 'hulls carrying the older transponder set',
    group2: 'hulls carrying the current set',
    parameter: 'dropout rate per transit',
    unit: 'transits',
    nullInWords: 'the two transponder sets drop locks at the same rate',
    altInWords: 'the older set drops locks at a higher rate',
    action: 'the Yard orders a fleet-wide replacement of the older sets',
    typeIConsequence: 'eleven months and the whole maintenance budget are spent replacing sets that were never the fault, and the work that was queued behind it does not happen',
    typeIIConsequence: 'the older sets stay in service, and the next dropout happens on an approach in traffic with a loaded hull behind it',
    rateRange: [0.05, 0.13],
  },
  {
    lane: 'the Carme outer loop',
    office: 'the Carme relay office',
    group1: 'hulls plated from the 2179 batch',
    group2: 'hulls plated from any other batch',
    parameter: 'seal-fault rate per transit',
    unit: 'transits',
    nullInWords: 'the 2179 plate fails at the same rate as every other batch',
    altInWords: 'the 2179 plate fails at a higher rate',
    action: 'the relay office grounds every hull carrying 2179 plate until it is re-surveyed',
    typeIConsequence: 'sixty hulls are grounded over a batch that was sound, their operators lose a season of contracts, and the office answers for it in front of the Authority',
    typeIIConsequence: 'a bad batch stays in service, and the next seal to go takes a compartment with people in it',
    rateRange: [0.06, 0.15],
  },
  {
    lane: 'the Themis Reach',
    office: 'the Themis Reach survey office',
    group1: 'transits handled by relief pilots',
    group2: 'transits handled by the standing roster',
    parameter: 'hold rate per arrival',
    unit: 'arrivals',
    nullInWords: 'relief pilots and the standing roster hold arrivals at the mark at the same rate',
    altInWords: 'relief pilots hold arrivals at a higher rate',
    action: 'the survey office withdraws the relief pilots’ endorsements',
    typeIConsequence: 'eleven pilots lose their endorsements over a difference that was never there, and the Reach runs short-handed through the whole season',
    typeIIConsequence: 'the relief roster keeps running, and the delays it causes go on being charged to masters who have no way of knowing where they came from',
    rateRange: [0.1, 0.22],
  },
] as const

const TYPE_I_ALWAYS_WORSE: ForbiddenPhrase[] = [
  {
    phrase: /\btype\s*(?:i|1)\b(?!\s*i)[^.;]{0,60}\balways\b[^.;]{0,45}\b(?:worse|worst|more serious|more important|more costly)\b/,
    label: '“A Type I error is always the worse error”',
    why: 'Neither error is always worse. Which one costs more is a fact about the situation — about what is done on a rejection and what happens if nothing is done — and weighing those two costs is the whole reason α is a decision rather than a convention.',
  },
  {
    phrase: /\balways\b[^.;]{0,30}\b(?:worse|worst|more serious)\b[^.;]{0,60}\btype\s*(?:i|1)\b(?!\s*i)/,
    label: '“A Type I error is always the worse error”',
    why: 'Neither error is always worse. Say what each one costs here, and let the two costs decide.',
  },
]
const TYPE_II_MEANS_NULL_TRUE: ForbiddenPhrase[] = [
  {
    phrase: /\btype\s*(?:ii|2)\b[^.;]{0,70}\b(?:means|mean|proves|shows|establishes|implies|confirms)\b[^.;]{0,45}\bnull\b[^.;]{0,30}\btrue\b/,
    label: 'A Type II error treated as evidence that H₀ is true',
    why: 'A Type II error is exactly the case where H₀ is FALSE and the test failed to say so. Failing to reject is never a finding that H₀ holds; it is a finding that this test, at this α and this sample size, did not have the reach.',
  },
  {
    phrase: /\bnot reject\b[^.;]{0,45}\b(?:means|mean|proves|shows|establishes)\b[^.;]{0,35}\bnull\b[^.;]{0,25}\btrue\b/,
    label: '“Failing to reject means H₀ is true”',
    why: 'Failing to reject means the data were consistent with H₀ — which is also what a low-powered test looks like when H₀ is false. The two are indistinguishable from the p-value alone.',
  },
  {
    phrase: 'accept null',
    label: 'Accepts H₀',
    why: 'We never accept H₀. Failing to reject leaves H₀ standing as an unrefuted possibility, and a Type II error is precisely the case where it should not have been left standing.',
  },
]

/**
 * Words a consequence sentence may share with any competent answer about errors in general. A
 * "prices the error in context" group built out of these would be satisfied by a response that
 * names no consequence at all, so they are struck out before the group is built.
 */
const GENERIC_WORDS = new Set([
  'not', 'differ', 'test', 'error', 'null', 'alt', 'reject', 'true', 'false', 'run', 'proportion', 'data', 'sample', 'result', 'evidence', 'conclude',
  'significant', 'probability', 'type', 'happen', 'next', 'come', 'take', 'make', 'thing', 'over', 'through', 'whole', 'other', 'same', 'greater', 'less',
  'actual', 'estimate', 'longrun', 'repeat', 'mean', 'expect', 'predict', 'count', 'large', 'unit', 'condition', 'independent', 'random', 'normal', 'alpha',
])

/** A "names the consequence" group built only from the distinctive words of that consequence. */
function priceGroup(label: string, consequence: string, feedback: string): RubricGroup {
  const words = contentWords(consequence).filter((w) => w.length > 3 && !GENERIC_WORDS.has(w))
  return { label, phrasings: words, minMatches: Math.min(2, Math.max(1, words.length)), polarity: 'any', feedback }
}

export interface TypeIandIIArgs {
  /** H₀ in plain words: "the two refit yards turn out hulls with the same advisory rate". */
  nullInWords: string
  /** Hₐ in plain words. */
  altInWords: string
  /** One sentence naming what a false alarm costs, in this context. */
  typeIConsequence: string
  /** One sentence naming what a miss costs, in this context. */
  typeIIConsequence: string
  parameter: string
  population: string
}

/**
 * Rubric for "state Type I and Type II for this test, in context, with their consequences" (AP 6.7).
 * No template covers it, so the groups are built by hand: each error has to be *defined* correctly
 * (rejecting a true H₀ / failing to reject a false one) and *priced* in this context. Forbids the
 * two sentences the module exists to break — that a Type I error is always the worse one, and that
 * a Type II error means H₀ is true.
 *
 * Used by `act-6/type-i-ii` and by act-6-06's mission beat, so the drills and the beat grade alike.
 */
export function typeIandIIRubric({ nullInWords, altInWords, typeIConsequence, typeIIConsequence, parameter, population }: TypeIandIIArgs): InterpretationAnswer {
  const typeIDefinition: RubricPhrase[] = [
    /\btype\s*(?:i|1)\b(?!\s*i)[^.;]{0,150}\breject\w*[^.;]{0,70}\b(?:true|correct)\b/,
    /\btype\s*(?:i|1)\b(?!\s*i)[^.;]{0,150}\btrue\b[^.;]{0,50}\breject/,
    /\breject\w*[^.;]{0,60}\btrue\b[^.;]{0,70}\btype\s*(?:i|1)\b(?!\s*i)/,
    /\btype\s*(?:i|1)\b(?!\s*i)[^.;]{0,150}\bfalse (?:alarm|positive)\b/,
  ]
  const typeIIDefinition: RubricPhrase[] = [
    /\btype\s*(?:ii|2)\b[^.;]{0,150}\bnot reject\b/,
    /\bnot reject\b[^.;]{0,70}\bfalse\b[^.;]{0,70}\btype\s*(?:ii|2)\b/,
    /\btype\s*(?:ii|2)\b[^.;]{0,150}\bmiss\w*/,
    /\btype\s*(?:ii|2)\b[^.;]{0,150}\bfalse negative\b/,
  ]
  const required: RubricGroup[] = [
    {
      label: 'Defines the Type I error: rejecting a true H₀ (a false alarm)',
      phrasings: typeIDefinition,
      polarity: 'any',
      feedback: `A Type I error is rejecting H₀ when H₀ is true — concluding that ${altInWords} when in fact ${nullInWords}.`,
    },
    priceGroup('Prices the Type I error in context', typeIConsequence, `Say what the false alarm costs here: ${typeIConsequence}.`),
    {
      label: 'Defines the Type II error: failing to reject a false H₀ (a miss)',
      phrasings: typeIIDefinition,
      polarity: 'any',
      feedback: `A Type II error is failing to reject H₀ when H₀ is false — reporting nothing although ${altInWords}.`,
    },
    priceGroup('Prices the Type II error in context', typeIIConsequence, `Say what the miss costs here: ${typeIIConsequence}.`),
    contextGroup('Names the context (what is measured, and for whom)', [parameter, population], {
      minMatches: 2,
      feedback: `Say what and whom: the ${parameter} of ${population}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [...TYPE_I_ALWAYS_WORSE, ...TYPE_II_MEANS_NULL_TRUE]
  const exemplar =
    `A Type I error here is rejecting a true H₀: concluding that ${altInWords} when in truth ${nullInWords}. ` +
    `The cost of that error in this context is that ${typeIConsequence}. ` +
    `A Type II error is failing to reject a false H₀: reporting nothing although ${altInWords}, missing a real difference in the ${parameter} of ${population}. ` +
    `The cost of that error is that ${typeIIConsequence}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 40 }
}

interface TwoDraw {
  x1: number
  n1: number
  x2: number
  n2: number
  p1: number
  p2: number
  pooled: number
  /** The pooled z the same counts would produce — guarded so a drill never reproduces the Lane's. */
  z: number
}

function drawTwoSample(rng: Rng, range: [number, number]): TwoDraw {
  return retry(
    rng,
    (r) => {
      const base = r.uniform(range[0], range[1])
      const lift = r.uniform(1.2, 1.9)
      const n1 = 10 * r.int(9, 30)
      const n2 = 10 * r.int(15, 45)
      const x1 = r.binomial(n1, Math.min(0.8, base * lift))
      const x2 = r.binomial(n2, base)
      const pooled = (x1 + x2) / (n1 + n2)
      const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
      return { x1, n1, x2, n2, p1: x1 / n1, p2: x2 / n2, pooled, z: se > 0 ? (x1 / n1 - x2 / n2) / se : 0 }
    },
    (d) =>
      d.x1 >= 6 &&
      d.x2 >= 6 &&
      d.p1 > d.p2 &&
      !reservedStat(d.z) &&
      Math.min(d.n1 * d.pooled, d.n1 * (1 - d.pooled), d.n2 * d.pooled, d.n2 * (1 - d.pooled)) >= 10 &&
      ![d.n1, d.n2, d.x1, d.x2].some(reservedCount) &&
      ![d.p1, d.p2, d.pooled].some(reservedRate),
  )
}

export const typeIandII = defineGenerator({
  id: 'act-6/type-i-ii',
  label: 'Type I and Type II errors in context',
  ap_topics: ['6.7'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, ERROR_CASES)
    const d = drawTwoSample(rng, c.rateRange)
    const population = `${c.unit} on ${c.lane}`
    const answer = typeIandIIRubric({
      nullInWords: c.nullInWords,
      altInWords: c.altInWords,
      typeIConsequence: c.typeIConsequence,
      typeIIConsequence: c.typeIIConsequence,
      parameter: c.parameter,
      population,
    })
    return {
      prompt: `${sentence(c.office)} is testing $H_0:\\ p_1 = p_2$ against $H_a:\\ p_1 > p_2$, where $p_1$ and $p_2$ are the true ${c.parameter} for ${c.group1} and for ${c.group2} among all ${population}. The file in front of it is ${fmtInt(d.x1)} of ${fmtInt(d.n1)} against ${fmtInt(d.x2)} of ${fmtInt(d.n2)}.\n\nIf the Office rejects $H_0$, ${c.action}. If it does not reject, nothing changes.\n\n**Describe the Type I error and the Type II error for this test, in context, and say what each one would cost.** Four things: what each error *is* in terms of these two hypotheses, and what each one *does* to ${c.lane}.`,
      answer,
      hints: [
        'Neither error is a mistake in the arithmetic. Both are outcomes the procedure can produce when it is run exactly as written — one when H₀ is true, one when H₀ is false. Write the two cases down before you write anything else.',
        `Type I: H₀ is true — ${c.nullInWords} — and the test rejects it anyway. Type II: H₀ is false — ${c.altInWords} — and the test fails to reject. Now attach the consequence to each, remembering that ${c.action.replace(/^the /, 'the ')} only happens on a rejection.`,
        'The part most answers leave out is the price. An error with no consequence attached is a definition, not an analysis, and the whole point of the analysis is to let the two prices decide α.',
      ],
      solution: `**${answer.exemplar}**\n\nNotice what the two errors are *not*. They are not carelessness, and they are not avoidable by being more careful: run this procedure honestly a thousand times and it will make Type I errors at exactly the rate you set, and Type II errors at a rate you do not control directly at all.\n\nNotice also what a Type II error is not evidence of. Failing to reject $H_0$ leaves $H_0$ standing; it does not establish it. A test with ${fmtInt(d.n1)} and ${fmtInt(d.n2)} ${c.unit} behind it can miss a real difference simply by being too small to see one, and from the p-value alone that outcome is indistinguishable from a corridor where nothing is wrong.\n\nAnd neither error is automatically the worse one. Here, a false alarm means ${c.typeIConsequence}; a miss means ${c.typeIIConsequence}. Which of those an office would rather risk is a judgement about ${c.lane} and not a fact about statistics — which is exactly why α is set by an officer, in advance, with a reason written beside it.`,
      misconception: 'Defining the errors without pricing them — or treating a Type II error as evidence that H₀ is true, when it is by definition the case where H₀ is false and the test missed it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the power of a test against a stated alternative
// ---------------------------------------------------------------------------------------------

/**
 * Power of a one-sided two-proportion z-test, assembled from the same two library pieces
 * `powerZTestProportion` uses — the standard normal quantile for the cutoff (at the POOLED SE under
 * H₀) and the standard normal tail for the area beyond it (at the UNPOOLED SE under Hₐ).
 */
function twoPropPower({ p1, n1, p2, n2, alpha }: { p1: number; n1: number; p2: number; n2: number; alpha: number }) {
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
  const se0 = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  const seA = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2)
  const cutoff = normal.standardQuantile(1 - alpha) * se0
  const power = normal.sf((cutoff - (p1 - p2)) / seA)
  return { pooled, se0, seA, cutoff, power, beta: 1 - power }
}

const ALPHAS = [0.1, 0.05, 0.01] as const

export const powerValue = defineGenerator({
  id: 'act-6/power-value',
  label: 'The power of a test against a stated alternative',
  ap_topics: ['6.7'],
  skills: ['2', '3'],
  generate(rng) {
    const c = pickContext(rng, OFFICES)
    const alpha = rng.choice(ALPHAS)
    const twoSample = rng.bool()

    if (!twoSample) {
      const d = retry(
        rng,
        (r) => {
          const p0 = Math.round(r.uniform(c.baseRange[0], c.baseRange[1]) * 1000) / 1000
          const pA = Math.round(p0 * r.uniform(1.25, 2.1) * 1000) / 1000
          const n = 10 * r.int(12, 60)
          const res = powerZTestProportion({ p0, pA, n, alpha, alt: 'greater' })
          return { p0, pA, n, res, se0: seProportion(p0, n), seA: seProportion(pA, n) }
        },
        (d) =>
          d.pA < 0.6 &&
          d.n * d.p0 >= 10 &&
          d.n * (1 - d.p0) >= 10 &&
          d.res.power > 0.15 &&
          d.res.power < 0.96 &&
          /* Never let the answer coincide with 1 − α, the misconception this module is about. */
          Math.abs(d.res.power - (1 - alpha)) > 0.02 &&
          !reservedCount(d.n) &&
          !reservedRate(d.p0) &&
          !reservedRate(d.pA),
      )
      const cutoff = d.res.rejectAbove as number
      const z = normal.standardQuantile(1 - alpha)
      return {
        prompt: `${sentence(c.office)} posts the ${c.parameter} on ${c.lane} at ${fmt(d.p0, 3)} and is planning an audit of ${fmtInt(d.n)} ${c.unit}. It will test $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p > ${fmt(d.p0, 3)}$ at $\\alpha = ${fmt(alpha, 2)}$.\n\nBefore it commits the ship-time, the Office wants to know what the audit could actually detect. **What is the power of this test against the specific alternative $p = ${fmt(d.pA, 3)}$?** Give it to three decimal places.`,
        answer: numericAnswer(d.res.power, 'proportion', { digits: 3 }),
        hints: [
          'Power is answered in two steps, and the two steps live on two different sampling distributions. First: how extreme would the sample proportion have to be for this test to reject? That question is answered entirely inside the world H₀ describes. Second: if the truth is the stated alternative instead, how often does the sample proportion land out there?',
          `Step one: the cutoff is $p_0 + z^\\star \\sqrt{p_0(1-p_0)/n}$ with $z^\\star = ${fmt(z, 4)}$ for a one-sided $\\alpha = ${fmt(alpha, 2)}$ and $\\sqrt{p_0(1-p_0)/n} = ${fmt(d.se0, 5)}$. Step two: standardize that cutoff against the alternative's own sampling distribution, which is centred at ${fmt(d.pA, 3)} with SE ${fmt(d.seA, 5)}.`,
          `$P\\left(Z > \\dfrac{${fmt(cutoff, 5)} - ${fmt(d.pA, 3)}}{${fmt(d.seA, 5)}}\\right)$, to three decimals.`,
        ],
        solution: `**The cutoff, under $H_0$.** The test rejects when $\\hat p$ clears\n\n$$\\hat p^\\star = p_0 + z^\\star\\sqrt{\\frac{p_0(1 - p_0)}{n}} = ${fmt(d.p0, 3)} + ${fmt(z, 4)} \\times ${fmt(d.se0, 5)} = ${fmt(cutoff, 5)}$$\n\n**The area beyond it, under $H_a$.** If the true rate is ${fmt(d.pA, 3)}, then $\\hat p$ is centred there with standard error $\\sqrt{p_A(1 - p_A)/n} = ${fmt(d.seA, 5)}$, so\n\n$$\\text{power} = P\\left(\\hat p > ${fmt(cutoff, 5)}\\right) = P\\left(Z > \\frac{${fmt(cutoff, 5)} - ${fmt(d.pA, 3)}}{${fmt(d.seA, 5)}}\\right) = P(Z > ${fmt((cutoff - d.pA) / d.seA, 3)}) = ${fmt(d.res.power, 3)}$$\n\n**${fmt(d.res.power, 3)}** — and therefore $\\beta = ${fmt(d.res.beta, 3)}$, the chance this audit runs, the corridor really is at ${fmt(d.pA, 3)}, and the Office reports nothing.\n\nNote which standard error does which job. The cutoff is built at $p_0$, because the cutoff is a property of the test and the test is defined under the null. The area is measured at $p_A$, because that is the world whose detection rate is being asked about. Using one SE for both is the commonest arithmetic error in a power calculation.`,
        misconception: `Answering 1 − α = ${fmt(1 - alpha, 2)}. Power is 1 − β, and β depends on the alternative and the sample size; α does not appear in it except through the cutoff.`,
      }
    }

    const d = retry(
      rng,
      (r) => {
        const p2 = Math.round(r.uniform(c.baseRange[0], c.baseRange[1]) * 1000) / 1000
        const p1 = Math.round(p2 * r.uniform(1.3, 2.2) * 1000) / 1000
        const n1 = 50 * r.int(4, 16)
        const n2 = 50 * r.int(4, 24)
        const res = twoPropPower({ p1, n1, p2, n2, alpha })
        return { p1, n1, p2, n2, res }
      },
      (d) =>
        d.p1 < 0.6 &&
        d.res.power > 0.15 &&
        d.res.power < 0.96 &&
        Math.abs(d.res.power - (1 - alpha)) > 0.02 &&
        Math.min(d.n1, d.n2) * Math.min(d.res.pooled, 1 - d.res.pooled) >= 10 &&
        ![d.n1, d.n2].some(reservedCount) &&
        ![d.p1, d.p2, d.res.pooled].some(reservedRate),
    )
    const { p1, n1, p2, n2, res } = d
    const z = normal.standardQuantile(1 - alpha)
    return {
      prompt: `${sentence(c.office)} is planning a comparison on ${c.lane}: ${fmtInt(n1)} ${c.unit} handled one way against ${fmtInt(n2)} handled the other, tested as $H_0:\\ p_1 = p_2$ against $H_a:\\ p_1 > p_2$ at $\\alpha = ${fmt(alpha, 2)}$, where $p$ is the ${c.parameter}.\n\nThe Office writes down, in advance, the difference it would care about finding: a true rate of ${fmt(p1, 3)} in the first group against ${fmt(p2, 3)} in the second.\n\n**What is the power of the planned test against that alternative?** Give it to three decimal places.`,
      answer: numericAnswer(res.power, 'proportion', { digits: 3 }),
      hints: [
        'Same two steps as the one-sample case, on the difference $\\hat p_1 - \\hat p_2$ instead of on $\\hat p$. How big a difference does this test need to see before it rejects — a question answered under H₀, with the pooled standard error? And how often does the stated alternative produce a difference that big?',
        `Under $H_0$ the difference is centred at 0 with pooled SE $\\sqrt{\\hat p_c(1-\\hat p_c)(1/n_1 + 1/n_2)} = ${fmt(res.se0, 5)}$, where $\\hat p_c = ${fmt(res.pooled, 4)}$ is the common rate the alternative implies. Under $H_a$ the difference is centred at ${fmt(p1 - p2, 4)} with unpooled SE ${fmt(res.seA, 5)}.`,
        `$P\\left(Z > \\dfrac{${fmt(res.cutoff, 5)} - ${fmt(p1 - p2, 4)}}{${fmt(res.seA, 5)}}\\right)$, to three decimals.`,
      ],
      solution: `**The cutoff, under $H_0$.** Pooling the two rates the alternative names, weighted by sample size, $\\hat p_c = \\dfrac{${fmt(p1, 3)} \\times ${fmtInt(n1)} + ${fmt(p2, 3)} \\times ${fmtInt(n2)}}{${fmtInt(n1 + n2)}} = ${fmt(res.pooled, 4)}$, so the null distribution of $\\hat p_1 - \\hat p_2$ is centred at 0 with\n\n$$\\text{SE}_0 = \\sqrt{\\hat p_c(1 - \\hat p_c)\\left(\\frac{1}{n_1} + \\frac{1}{n_2}\\right)} = ${fmt(res.se0, 5)}, \\qquad \\text{reject when } \\hat p_1 - \\hat p_2 > ${fmt(z, 4)} \\times ${fmt(res.se0, 5)} = ${fmt(res.cutoff, 5)}$$\n\n**The area beyond it, under $H_a$.** If the truth is ${fmt(p1, 3)} against ${fmt(p2, 3)}, the difference is centred at ${fmt(p1 - p2, 4)} with the unpooled standard error\n\n$$\\text{SE}_A = \\sqrt{\\frac{p_1(1 - p_1)}{n_1} + \\frac{p_2(1 - p_2)}{n_2}} = ${fmt(res.seA, 5)}$$\n\n$$\\text{power} = P\\left(Z > \\frac{${fmt(res.cutoff, 5)} - ${fmt(p1 - p2, 4)}}{${fmt(res.seA, 5)}}\\right) = P(Z > ${fmt((res.cutoff - (p1 - p2)) / res.seA, 3)}) = ${fmt(res.power, 3)}$$\n\n**${fmt(res.power, 3)}** — so $\\beta = ${fmt(res.beta, 3)}$. Run this comparison against a corridor where that difference is genuinely present, and it comes back with nothing ${fmtPct(res.beta, 0)} of the time.\n\nThe pooled SE for the cutoff, the unpooled SE for the area: the first describes the test, the second describes the world the test is being aimed at.`,
      misconception: `Using the unpooled standard error for the cutoff as well, or answering 1 − α = ${fmt(1 - alpha, 2)}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — what moves power
// ---------------------------------------------------------------------------------------------

type Driver = 'n-up' | 'alpha-down' | 'effect-smaller'

export const powerDrivers = defineGenerator({
  id: 'act-6/power-drivers',
  label: 'What moves the power of a test',
  ap_topics: ['6.7'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, OFFICES)
    const driver: Driver = rng.choice(['n-up', 'alpha-down', 'effect-smaller'] as const)
    const d = retry(
      rng,
      (r) => {
        const p0 = Math.round(r.uniform(c.baseRange[0], c.baseRange[1]) * 1000) / 1000
        const pA = Math.round(p0 * r.uniform(1.3, 1.9) * 1000) / 1000
        const n = 10 * r.int(15, 45)
        const before = powerZTestProportion({ p0, pA, n, alpha: 0.05, alt: 'greater' })
        const nAfter = n * 3
        const pASmaller = Math.round((p0 + (pA - p0) / 2) * 1000) / 1000
        const after =
          driver === 'n-up'
            ? powerZTestProportion({ p0, pA, n: nAfter, alpha: 0.05, alt: 'greater' })
            : driver === 'alpha-down'
              ? powerZTestProportion({ p0, pA, n, alpha: 0.01, alt: 'greater' })
              : powerZTestProportion({ p0, pA: pASmaller, n, alpha: 0.05, alt: 'greater' })
        return { p0, pA, n, nAfter, pASmaller, before, after }
      },
      (d) =>
        d.pA < 0.6 &&
        d.pASmaller > d.p0 + 0.004 &&
        d.n * d.p0 >= 10 &&
        d.before.power > 0.3 &&
        d.before.power < 0.92 &&
        Math.abs(d.after.power - d.before.power) > 0.05 &&
        !reservedCount(d.n) &&
        !reservedCount(d.nAfter) &&
        !reservedRate(d.p0) &&
        !reservedRate(d.pA),
    )
    const rises = d.after.power > d.before.power
    const change: Record<Driver, string> = {
      'n-up': `the Office triples the audit, from ${fmtInt(d.n)} ${c.unit} to ${fmtInt(d.nAfter)}`,
      'alpha-down': `the Office tightens the significance level from $\\alpha = 0.05$ to $\\alpha = 0.01$`,
      'effect-smaller': `the difference the Office is trying to catch is halved — the alternative moves from $p = ${fmt(d.pA, 3)}$ down to $p = ${fmt(d.pASmaller, 3)}$`,
    }
    const risesWhy: Record<Driver, string> = {
      'n-up': 'both sampling distributions narrow, so the same two rates sit further apart in standard errors and far more of the alternative’s distribution clears the cutoff.',
      'alpha-down': 'a stricter test is a more careful test, and a more careful test catches more of what is really there.',
      'effect-smaller': 'a smaller difference is a more precise target, so the test homes in on it more reliably.',
    }
    const fallsWhy: Record<Driver, string> = {
      'n-up': 'a larger audit makes the cutoff harder to clear, so fewer samples reach it.',
      'alpha-down': 'the cutoff moves further out, so less of the alternative’s sampling distribution lies beyond it — the false alarms you bought off are paid for in misses.',
      'effect-smaller': 'the alternative’s sampling distribution slides toward the null’s, so much more of it now sits below the cutoff and is not reported.',
    }
    const cands: Candidate[] = [
      {
        text: `Power rises, to about ${fmt(rises ? d.after.power : d.before.power, 2)} — ${risesWhy[driver]}`,
        correct: rises,
        why: rises ? null : `Power *falls* here, from ${fmt(d.before.power, 3)} to ${fmt(d.after.power, 3)}. ${sentence(fallsWhy[driver])} Nothing about ${driver === 'alpha-down' ? 'a stricter cutoff' : 'a smaller target'} makes a difference easier to see; it makes it harder, and that is the trade the change buys.`,
      },
      {
        text: `Power falls, to about ${fmt(rises ? d.before.power : d.after.power, 2)} — ${fallsWhy[driver]}`,
        correct: !rises,
        why: !rises ? null : `Power *rises* here, from ${fmt(d.before.power, 3)} to ${fmt(d.after.power, 3)}. ${sentence(risesWhy[driver])}`,
      },
      {
        text: `Power is unchanged at ${fmt(1 - 0.05, 2)}. Power is $1 - \\alpha$, so nothing that leaves the significance level alone can move it.`,
        correct: false,
        why: `**Power is $1 - \\beta$, not $1 - \\alpha$.** Here the power before the change is ${fmt(d.before.power, 3)}, which is not ${fmt(0.95, 2)} and never was. α is fixed by the officer who writes the test; β is whatever the alternative and the sample size leave you with, and the two numbers are not complements of each other.`,
      },
      {
        text: `Power is unchanged. Power is a property of the procedure — fixed the moment $H_0$ and $H_a$ are written down — and only the data that come back can change what the test concludes.`,
        correct: false,
        why: `Power is a property of the procedure **and** a specific alternative **and** the sample sizes. It is computable before a single ${c.unit.replace(/s$/, '')} is audited — that is the whole use of it — and every one of those three inputs moves it. Here it goes from ${fmt(d.before.power, 3)} to ${fmt(d.after.power, 3)}.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(c.office)} plans a one-sided test of $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p > ${fmt(d.p0, 3)}$ for the ${c.parameter} on ${c.lane}, at $\\alpha = 0.05$, on an audit of ${fmtInt(d.n)} ${c.unit}. Against the alternative $p = ${fmt(d.pA, 3)}$ the planned test has power ${fmt(d.before.power, 3)}.\n\nNow ${change[driver]}. **What happens to the power, and why?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Draw the two curves. The null’s sampling distribution with the cutoff marked on it, and the alternative’s sitting to the right of it. Power is the part of the alternative’s curve that lies beyond the cutoff — so ask what this change does to the curves, and what it does to the cutoff.',
        `Before the change, the cutoff sits at $\\hat p = ${fmt(d.before.rejectAbove as number, 4)}$ and the alternative is centred at ${fmt(d.pA, 3)}. ${driver === 'n-up' ? 'Tripling n does not move either centre — it narrows both curves.' : driver === 'alpha-down' ? 'Tightening α does not move either centre — it slides the cutoff to the right.' : 'Halving the difference does not move the cutoff — it slides the alternative’s curve to the left.'}`,
      ],
      solution: `Power goes **${rises ? 'up' : 'down'}**, from ${fmt(d.before.power, 3)} to ${fmt(d.after.power, 3)}.\n\n**${options[correct]}**\n\nThe geometry is the whole explanation, and it is worth holding on to because it answers all three versions of this question at once. Two curves: the null's, centred at ${fmt(d.p0, 3)}, and the alternative's, centred at ${fmt(driver === 'effect-smaller' ? d.pASmaller : d.pA, 3)}. A cutoff sits on the axis at ${fmt((rises ? d.after.rejectAbove : d.before.rejectAbove) as number, 4)}${driver === 'alpha-down' ? ` — it was at ${fmt(d.before.rejectAbove as number, 4)}` : ''}. α is the slice of the *null* curve beyond the cutoff; power is the slice of the *alternative* curve beyond it.\n\n- **More data** narrows both curves without moving either centre, so the same gap becomes many more standard errors and power rises. It is the only one of the three levers that improves both error rates at once, and it is the only one that costs ship-time.\n- **Smaller α** slides the cutoff away from the null, which is precisely the point of it — and drags power down behind it. Fewer false alarms, more misses. There is no setting of α that reduces both.\n- **A smaller true difference** slides the alternative curve toward the null and power collapses. Note what this means in practice: a test can have excellent power against the difference you are afraid of and almost none against a difference half that size, so "what is this test's power" is never a complete question. Power against *what*?`,
      misconception: 'Treating power as 1 − α, or believing a stricter significance level makes a test better at finding real effects.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — power is not 1 − α
// ---------------------------------------------------------------------------------------------

export const powerNotOneMinusAlpha = defineGenerator({
  id: 'act-6/power-not-one-minus-alpha',
  label: 'What power actually is',
  ap_topics: ['6.7'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, OFFICES)
    const alpha = rng.choice(ALPHAS)
    const d = retry(
      rng,
      (r) => {
        const p0 = Math.round(r.uniform(c.baseRange[0], c.baseRange[1]) * 1000) / 1000
        const pA = Math.round(p0 * r.uniform(1.3, 2) * 1000) / 1000
        const n = 10 * r.int(12, 50)
        const res = powerZTestProportion({ p0, pA, n, alpha, alt: 'greater' })
        return { p0, pA, n, res }
      },
      (d) =>
        d.pA < 0.6 &&
        d.n * d.p0 >= 10 &&
        d.res.power > 0.25 &&
        d.res.power < 0.93 &&
        Math.abs(d.res.power - (1 - alpha)) > 0.06 &&
        !reservedCount(d.n) &&
        !reservedRate(d.p0) &&
        !reservedRate(d.pA),
    )
    const { p0, pA, n, res } = d
    const cands: Candidate[] = [
      {
        text: `It is $1 - \\beta$: the probability that this test, run at $\\alpha = ${fmt(alpha, 2)}$ on ${fmtInt(n)} ${c.unit}, rejects $H_0$ **when the true rate really is ${fmt(pA, 3)}**. Here that is ${fmt(res.power, 3)}.`,
        correct: true,
        why: null,
      },
      {
        text: `It is $1 - \\alpha = ${fmt(1 - alpha, 2)}$: α is the chance of rejecting $H_0$ wrongly, so what is left over is the chance of getting the answer right.`,
        correct: false,
        why: `**The commonest error in the topic.** α and β are not complements, because they are computed on two *different* sampling distributions: α is a tail of the null's, β is a tail of the alternative's. Here $1 - \\alpha = ${fmt(1 - alpha, 2)}$ and the power is ${fmt(res.power, 3)}. They are not the same number and there is no reason they should be. α is also not "the chance of being wrong" — it is the false-alarm rate *given that $H_0$ is true*, which says nothing about the case where it is false.`,
      },
      {
        text: `It is the probability that $H_a$ is true, given that this test rejected $H_0$ — here ${fmt(res.power, 3)}.`,
        correct: false,
        why: `Nothing in this procedure produces a probability for a hypothesis. Power is a probability about *data*: it is computed by assuming a particular alternative is true and asking how often the test would then reject. The direction of the conditioning is the opposite of what this option claims.`,
      },
      {
        text: `It is a property of the test alone: any one-sided test run at $\\alpha = ${fmt(alpha, 2)}$ has the same power, because α is what fixes the rejection region.`,
        correct: false,
        why: `α fixes the rejection region; it does not fix how much of the alternative lies inside it. Hold α at ${fmt(alpha, 2)} and move the alternative from ${fmt(pA, 3)} to ${fmt(p0 + (pA - p0) / 3, 3)} and the power falls from ${fmt(res.power, 3)} to ${fmt(powerZTestProportion({ p0, pA: p0 + (pA - p0) / 3, n, alpha, alt: 'greater' }).power, 3)} — same test, same α, same data plan. "The power of the test" is never a complete phrase: power against *what*.`,
      },
      {
        text: `It is $1 - P$, where $P$ is the p-value the audit returns — the strength of the evidence, read as a probability the finding is real.`,
        correct: false,
        why: `A p-value is not available until the data are in, and power is a planning quantity: its whole use is that it can be computed *before* the audit, which is how an office decides whether the audit is worth running. And $1 - P$ is not a probability that anything is real — both $P$ and $1 - P$ are computed entirely inside the world where $H_0$ holds.`,
      },
    ]
    const chosen = [cands[0], ...rng.shuffle(cands.slice(1)).slice(0, 3)]
    const { options, correct, feedback } = shuffleChoice(rng, chosen)
    return {
      prompt: `${sentence(c.office)} will test $H_0:\\ p = ${fmt(p0, 3)}$ against $H_a:\\ p > ${fmt(p0, 3)}$ for the ${c.parameter} on ${c.lane}, at $\\alpha = ${fmt(alpha, 2)}$, on ${fmtInt(n)} ${c.unit}. Somebody at the table asks what the **power** of that test is.\n\nWhich of these is what the word means?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two sampling distributions, not one. α lives on the distribution H₀ predicts; β and power live on the distribution the alternative predicts. A quantity defined on one of them cannot be the complement of a quantity defined on the other.',
        'Then check what each option needs in order to be computed. Three of these could be worked out this morning, before any data exist. One of them cannot be computed at all until the audit comes back — and power is a planning number.',
      ],
      solution: `**${options[correct]}**\n\nPower is $1 - \\beta$, and $\\beta$ is the probability of a Type II error: failing to reject $H_0$ when the alternative is the truth. Both are areas under the *alternative's* sampling distribution, cut at the same place the test's rejection region begins.\n\n$$\\alpha = P(\\text{reject} \\mid H_0 \\text{ true}) = ${fmt(alpha, 2)} \\qquad \\text{power} = P(\\text{reject} \\mid p = ${fmt(pA, 3)}) = ${fmt(res.power, 3)}$$\n\nTwo conditional probabilities with two different conditions. $\\alpha + \\text{power}$ is ${fmt(alpha + res.power, 3)} here, which is not 1 and carries no meaning; the sum that does equal 1 is $\\beta + \\text{power} = ${fmt(res.beta, 3)} + ${fmt(res.power, 3)}$, because those two share a condition.\n\nAnd power is never a property of a test on its own. Change the alternative, change the sample size, change α, and it moves. Asked "what is the power of this test", the only complete answer names all three: *at $\\alpha = ${fmt(alpha, 2)}$, on ${fmtInt(n)} ${c.unit}, against $p = ${fmt(pA, 3)}$ — ${fmt(res.power, 3)}.*`,
      misconception: 'Power = 1 − α. The two are computed on different sampling distributions and are unrelated; the complement of power is β, the Type II error rate.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — which error an office is buying off, and at what price
// ---------------------------------------------------------------------------------------------

interface Posture {
  /** How the office behaves. */
  policy: (alpha: number) => string
  /** Which error it is guarding against. */
  guards: 'I' | 'II'
  alphaRange: [number, number]
  /** What the posture costs, in one phrase. */
  price: string
  detail: string
}

const POSTURES: readonly Posture[] = [
  {
    policy: (a) => `will not record a finding against a certificated yard unless the test clears $\\alpha = ${fmt(a, 3)}$, because a finding goes into the yard's permanent record and the yard may take it to arbitration`,
    guards: 'I',
    alphaRange: [0.001, 0.005],
    price: 'power against real differences, especially small ones',
    detail: 'a yard that really is producing bad work will very often be cleared by this procedure, and the office will never know it happened',
  },
  {
    policy: (a) => `screens every incoming batch at $\\alpha = ${fmt(a, 2)}$ and sends anything that clears it for a full destructive test, on the grounds that the destructive test is cheap and a bad batch is not`,
    guards: 'II',
    alphaRange: [0.15, 0.25],
    price: 'a high false-alarm rate — sound batches pulled and tested for nothing',
    detail: 'about one sound batch in five will be pulled off the line by this screen, and the destructive testing that follows is paid for out of the same budget',
  },
  {
    policy: (a) => `has standing orders to ground a hull whenever the seal-fault comparison clears $\\alpha = ${fmt(a, 2)}$, because a seal that goes takes a compartment with it`,
    guards: 'II',
    alphaRange: [0.1, 0.2],
    price: 'hulls grounded on evidence that would not survive review',
    detail: 'one grounding in five or so will turn out to have been a false alarm, and each of those is an operator losing a season for nothing',
  },
  {
    policy: (a) => `requires $\\alpha = ${fmt(a, 3)}$ before it will withdraw a pilot's endorsement, because an endorsement is a livelihood and the withdrawal is published`,
    guards: 'I',
    alphaRange: [0.001, 0.01],
    price: 'misses — pilots whose records really are worse go on flying',
    detail: 'the procedure is built so that it almost never accuses the innocent, and the price of that is that it frequently fails to identify the guilty',
  },
] as const

export const errorConsequences = defineGenerator({
  id: 'act-6/error-consequences',
  label: 'Which error is the office buying off?',
  ap_topics: ['6.7'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, OFFICES)
    const posture = pickContext(rng, POSTURES)
    const alpha = Math.round(rng.uniform(posture.alphaRange[0], posture.alphaRange[1]) * 1000) / 1000
    const guardsTypeI = posture.guards === 'I'
    const cands: Candidate[] = [
      {
        text: `Against a **Type I** error — rejecting a true $H_0$. The price is ${guardsTypeI ? posture.price : 'power: real differences that this procedure will not report'}.`,
        correct: guardsTypeI,
        why: guardsTypeI
          ? null
          : `Read the α. At $\\alpha = ${fmt(alpha, 2)}$ this office is *tolerating* false alarms — one in ${fmtInt(Math.round(1 / alpha))} of its findings against a corridor where nothing is wrong. An office guarding against Type I errors drives α down, not up.`,
      },
      {
        text: `Against a **Type II** error — failing to reject a false $H_0$. The price is ${guardsTypeI ? 'a false-alarm rate the office could not defend in a hearing' : posture.price}.`,
        correct: !guardsTypeI,
        why: !guardsTypeI
          ? null
          : `At $\\alpha = ${fmt(alpha, 3)}$ this office has made rejection very hard, which is the opposite of guarding against misses. A small α buys a low false-alarm rate and pays for it in power — it makes Type II errors *more* likely, not less.`,
      },
      {
        text: `Against both errors at once. Setting α is a matter of care, and a well-chosen α reduces the rate of both kinds of mistake.`,
        correct: false,
        why: `No setting of α does that. α *is* the Type I error rate, and moving it moves the cutoff, which moves β the other way: every point of false-alarm rate bought back is paid for in power. The only lever that improves both is sample size, and sample size is a question of ship-time, not of judgement.`,
      },
      {
        text: `Against neither. α is a convention — 0.05 in most of the literature — and this office has simply adopted a house figure. It has no consequences beyond the paperwork.`,
        correct: false,
        why: `An α of ${fmt(alpha, 3)} is nobody's convention. It has been chosen, and choosing it is choosing which error to risk: ${posture.detail}. The convention exists precisely so that offices which have not thought about their consequences still have a number, and this office has clearly thought about its consequences.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(c.office)} ${posture.policy(alpha)}. The comparison in question concerns the ${c.parameter} on ${c.lane}, tested one-sided.\n\n**Which error is the Office protecting itself against, and what is it paying for the protection?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'α *is* the Type I error rate. So read the number first: an office that has pushed α far below the convention has decided that a false alarm is the expensive outcome, and an office that has pushed it far above has decided that a miss is.',
        `Then ask what the other error does under the same setting. The cutoff can only be in one place: move it out to make false alarms rare and you have moved it out for the real differences too. Here $\\alpha = ${fmt(alpha, 3)}$ — about ${guardsTypeI ? `one false finding in ${fmtInt(Math.round(1 / alpha))}` : `one false finding in ${fmtInt(Math.round(1 / alpha))}, which the Office has evidently decided it can live with`}.`,
      ],
      solution: `**${options[correct]}**\n\nAt $\\alpha = ${fmt(alpha, 3)}$ the Office has chosen a false-alarm rate of about one in ${fmtInt(Math.round(1 / alpha))} — ${guardsTypeI ? 'far below the conventional level, which is a statement that a wrong rejection is the outcome it cannot afford' : 'far above the conventional level, which is a statement that a missed detection is the outcome it cannot afford'}.\n\nAnd the price is exactly the other error: ${posture.detail}.\n\nThat is the shape of every α decision. There is one cutoff, and it cannot be in two places. Pushing it out makes the test harder to trigger, which is good news about false alarms and bad news about real differences in precisely the same proportion. An officer setting α is not choosing how careful to be — both settings are careful — but choosing **which** of the two mistakes they would rather make, and writing it down before the data arrive so that nobody can later claim the choice was made to suit the answer.`,
      misconception: 'Treating a small α as unambiguously "more rigorous". A small α is a specific trade: fewer false alarms, more misses, and it must be justified by which of those costs more here.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — set α from the consequences
// ---------------------------------------------------------------------------------------------

interface Stakes {
  /** What a false alarm costs. */
  falseAlarm: string
  /** What a miss costs. */
  miss: string
  /** Which cost is the heavier one — and therefore which α the consequences argue for. */
  heavier: 'falseAlarm' | 'miss'
}

const STAKES: readonly Stakes[] = [
  {
    falseAlarm: 'a certificated yard is suspended, its master takes the suspension to arbitration, and the office that ordered it is answering questions for two years',
    miss: 'a yard keeps its certificate for one more season, and its output is re-surveyed at the next scheduled audit in any case',
    heavier: 'falseAlarm',
  },
  {
    falseAlarm: 'a batch of plate is pulled off the line and destructively tested, at the cost of about a week and a pallet of stock',
    miss: 'a bad seal stays in service and the next failure is on a crewed hull under way',
    heavier: 'miss',
  },
  {
    falseAlarm: 'a pilot loses an endorsement that took nine years to earn, and the withdrawal is published in the Reach register',
    miss: 'arrivals go on being held a little longer than they need to be, and masters go on grumbling about it',
    heavier: 'falseAlarm',
  },
  {
    falseAlarm: 'the shuttle run is re-scheduled for a season and the yard absorbs the overtime',
    miss: 'the older transponder sets stay in service and the next lost lock happens on an approach in traffic',
    heavier: 'miss',
  },
] as const

export const chooseAlpha = defineGenerator({
  id: 'act-6/choose-alpha',
  label: 'Setting α from the consequences',
  ap_topics: ['6.7'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, OFFICES)
    const s = pickContext(rng, STAKES)
    const strictAlpha = rng.choice([0.01, 0.005] as const)
    const looseAlpha = rng.choice([0.1, 0.15] as const)
    const wantStrict = s.heavier === 'falseAlarm'
    const d = retry(
      rng,
      (r) => {
        const p0 = Math.round(r.uniform(c.baseRange[0], c.baseRange[1]) * 1000) / 1000
        const pA = Math.round(p0 * r.uniform(1.3, 1.8) * 1000) / 1000
        const n = 10 * r.int(15, 45)
        return {
          p0,
          pA,
          n,
          strict: powerZTestProportion({ p0, pA, n, alpha: strictAlpha, alt: 'greater' }),
          loose: powerZTestProportion({ p0, pA, n, alpha: looseAlpha, alt: 'greater' }),
          observedP: Math.round(r.uniform(0.012, 0.045) * 10000) / 10000,
        }
      },
      (d) =>
        d.pA < 0.6 &&
        d.n * d.p0 >= 10 &&
        d.strict.power > 0.2 &&
        d.loose.power < 0.97 &&
        d.loose.power - d.strict.power > 0.08 &&
        !reservedCount(d.n) &&
        !reservedRate(d.p0) &&
        !reservedRate(d.pA),
    )
    const chosenAlpha = wantStrict ? strictAlpha : looseAlpha
    const otherAlpha = wantStrict ? looseAlpha : strictAlpha
    const chosenPower = wantStrict ? d.strict.power : d.loose.power
    const otherPower = wantStrict ? d.loose.power : d.strict.power

    const cands: Candidate[] = [
      {
        text: `$\\alpha = ${fmt(chosenAlpha, 3)}$ — because a false alarm here means ${s.falseAlarm}, while a miss means ${s.miss}, and ${wantStrict ? 'the first of those is the outcome the Office cannot afford, so it accepts power of ' + fmt(chosenPower, 2) + ' as the price' : 'the second of those is the outcome the Office cannot afford, so it accepts a false-alarm rate of one in ' + fmtInt(Math.round(1 / chosenAlpha)) + ' as the price'}.`,
        correct: true,
        why: null,
      },
      {
        text: `$\\alpha = ${fmt(otherAlpha, 3)}$ — because a false alarm here means ${s.falseAlarm}, while a miss means ${s.miss}, and ${wantStrict ? 'the Office should keep its power up at ' + fmt(otherPower, 2) + ' so that it does not miss anything' : 'the Office should keep its false-alarm rate down to one in ' + fmtInt(Math.round(1 / otherAlpha)) + ' so that it is never wrong in public'}.`,
        correct: false,
        why: `The two consequences are read correctly and then weighed the wrong way round. ${wantStrict ? `A miss here costs ${s.miss} — recoverable, and recovered at the next audit. A false alarm costs ${s.falseAlarm}. When the false alarm is the heavier of the two, α goes down and the loss of power is what you are paying.` : `A false alarm here costs ${s.falseAlarm} — a week and a pallet, or a season of overtime. A miss costs ${s.miss}. When the miss is the heavier of the two, α goes up and the false alarms are what you are paying.`}`,
      },
      {
        text: `$\\alpha = 0.05$ — because 0.05 is the conventional level, every reviewer expects it, and departing from it invites an argument about the departure rather than about the finding.`,
        correct: false,
        why: `Not indefensible, and not an analysis. The convention exists to give a number to offices that have not weighed their consequences; this Office has weighed them, and they are lopsided — ${s.heavier === 'falseAlarm' ? s.falseAlarm : s.miss} against ${s.heavier === 'falseAlarm' ? s.miss : s.falseAlarm}. An α chosen without reference to that asymmetry is a number, not a decision, and the reviewer who matters will ask why the Office did not think about it.`,
      },
      {
        text: `$\\alpha = ${fmt(chosenAlpha, 3)}$ — because the audit has already come back at $P = ${fmt(d.observedP, 4)}$, and setting the level ${d.observedP < chosenAlpha ? 'here still clears it' : 'just below that keeps the finding out of the report'}, which is the outcome the file supports.`,
        correct: false,
        why: `**Wrong by construction, whatever number it lands on.** α is part of the plan and the plan is written before the data. A level chosen after the p-value is known is not a significance level at all: the procedure it describes rejects whenever the officer wants it to, and its real false-alarm rate is nothing like the number printed on the page. Write α down first, with the reason beside it and a date on it, and this objection cannot be made.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(c.office)} is about to test $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p > ${fmt(d.p0, 3)}$ for the ${c.parameter} on ${c.lane}, on ${fmtInt(d.n)} ${c.unit}, against the difference it cares about finding ($p = ${fmt(d.pA, 3)}$). At $\\alpha = ${fmt(strictAlpha, 3)}$ the test has power ${fmt(d.strict.power, 3)}; at $\\alpha = ${fmt(looseAlpha, 2)}$ it has power ${fmt(d.loose.power, 3)}.\n\nIf the Office rejects $H_0$ and is wrong, ${s.falseAlarm}. If it fails to reject and there really is a difference, ${s.miss}.\n\n**Which significance level should the Office set, and on what grounds?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Put the two consequences side by side and ask which one you would rather be explaining in two years. That comparison — and nothing else — is what sets α.',
        `Then check that the reason survives being read by somebody who has not seen the audit. α is written into the plan before the data exist, so any justification that refers to what the data did is disqualified on its face, however sensible the number attached to it.`,
      ],
      solution: `**${options[correct]}**\n\nThe arithmetic is the easy half. ${wantStrict ? `Going from $\\alpha = ${fmt(looseAlpha, 2)}$ to $\\alpha = ${fmt(strictAlpha, 3)}$ costs this test ${fmt(d.loose.power - d.strict.power, 2)} of power against the difference the Office cares about — ${fmt(d.loose.power, 2)} down to ${fmt(d.strict.power, 2)}.` : `Going from $\\alpha = ${fmt(strictAlpha, 3)}$ to $\\alpha = ${fmt(looseAlpha, 2)}$ buys this test ${fmt(d.loose.power - d.strict.power, 2)} of power against the difference the Office cares about — ${fmt(d.strict.power, 2)} up to ${fmt(d.loose.power, 2)} — at a false-alarm rate of one in ${fmtInt(Math.round(1 / looseAlpha))} instead of one in ${fmtInt(Math.round(1 / strictAlpha))}.`} That number is computable and it is not in dispute.\n\nThe hard half is the judgement, and it is not a statistical judgement at all. ${wantStrict ? 'A false alarm here is expensive, public and hard to undo; a miss is expensive and recoverable.' : 'A false alarm here is expensive and recoverable; a miss is not recoverable at all.'} So the level goes ${wantStrict ? 'down' : 'up'}, and the cost of that choice — ${wantStrict ? fmt(d.loose.power - d.strict.power, 2) + ' of power' : 'a false-alarm rate of one in ' + fmtInt(Math.round(1 / looseAlpha))} — is written down beside it, because an α set without its price recorded is an α that will look arbitrary to whoever reads the file next.\n\nAnd whatever the number, it goes into the plan **before** the audit. A level chosen after the p-value is known is not a level: it is a decision dressed as a procedure, and the first reviewer to notice the ordering will say so.`,
      misconception: 'Choosing α by convention without weighing the two consequences — or, worse, choosing it after the p-value is known, which makes the advertised error rate fiction.',
    }
  },
})
