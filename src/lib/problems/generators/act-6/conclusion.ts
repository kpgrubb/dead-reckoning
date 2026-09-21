/**
 * act-6-05 · Strike the Word — drills. AP 6.6: the decision (p against α), the conclusion stated in
 * context, the duality between a confidence interval and a two-sided test, and the two sentences
 * that are struck every time — "proves" and "accept H₀".
 *
 *   act-6/test-conclusion      interp   the conclusion on a rejecting corridor result
 *   act-6/fail-to-reject       interp   the conclusion on a weak one — and what it does NOT say
 *   act-6/decision-from-p      choice   p against α, including a deliberate near miss
 *   act-6/alpha-flip           numeric  the α at which a stated decision changes
 *   act-6/ci-test-duality      choice   what a (1 − α) interval implies about the test at α
 *   act-6/conclusion-defects   choice   four drafted conclusions; exactly one survives a hearing
 *
 * `conclusionInContextRubric` is exported because act-6-05's mission beat — and the DecisionConsole's
 * live grader — must mark the learner's sentence with exactly the rubric these drills taught.
 * `AGENCY_FORBIDDEN` is the Act's own addition to it: the accusation may say the rate is higher; it
 * may not say by whom or why.
 *
 * The Lane's own case (19/900 against 12/1,712, z ≈ 3.16, p ≈ 0.0008) belongs to the mission beats
 * and never appears in a drill — `RESERVED_COUNTS` / `reservedStat` / `reservedP` enforce it.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { significanceTestConclusion } from '@/lib/problems/rubrics'
import type { ForbiddenPhrase, InterpretationAnswer, RubricPhrase } from '@/lib/problems/types'
import { onePropInterval, onePropTest, reject, type Alternative } from '@/lib/stats'
import { fmt, fmtInt, fmtP } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Case {
  /** "the Pasiphae ore run" */
  lane: string
  office: string
  /** What is counted, plural: "holds at the mark". */
  event: string
  /** The variable as a conclusion names it: "held at the mark". */
  variable: string
  /** The units the count is out of: "transits". */
  unit: string
  /** Plausible band for the posted figure. */
  p0Range: [number, number]
}

const CASES: readonly Case[] = [
  {
    lane: 'the Pasiphae ore run',
    office: 'the Pasiphae traffic office',
    event: 'holds at the mark',
    variable: 'held at the mark',
    unit: 'transits',
    p0Range: [0.08, 0.18],
  },
  {
    lane: 'the Sinope relay corridor',
    office: 'the Sinope relay office',
    event: 'missed relay windows',
    variable: 'missing a relay window',
    unit: 'transits',
    p0Range: [0.06, 0.16],
  },
  {
    lane: 'the Leda approach',
    office: 'the Leda approach control',
    event: 'refused slots',
    variable: 'refused an approach slot',
    unit: 'arrivals',
    p0Range: [0.1, 0.22],
  },
  {
    lane: 'the Metis inner shuttle',
    office: 'the Metis yard office',
    event: 'cargo-seal faults',
    variable: 'logging a cargo-seal fault',
    unit: 'runs',
    p0Range: [0.07, 0.17],
  },
  {
    lane: 'the Ananke long loop',
    office: 'the Ananke survey office',
    event: 'off-schedule arrivals',
    variable: 'arriving off schedule',
    unit: 'transits',
    p0Range: [0.09, 0.2],
  },
] as const

const RESERVED_COUNTS = new Set([19, 31, 900, 1712, 2612, 2580])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
/** The Lane's own statistic and p-value. A drill that reproduces either has leaked a mission beat. */
const reservedStat = (z: number): boolean => Math.abs(z - 3.163) < 0.04
const reservedP = (p: number): boolean => Math.abs(p - 0.00078) < 0.00012

/** Prompts open with an office name, which is lower-case in the corridor table. */
const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** The four levels anybody on a lane actually writes down. */
const CONVENTIONAL = [0.1, 0.05, 0.01, 0.001] as const
/** The three the drills set a review plan at; 0.001 is reserved for "how far down does it survive". */
const WORKING_ALPHAS = [0.1, 0.05, 0.01] as const

const alphaStr = (a: number): string => fmt(a, a < 0.01 ? 3 : 2)

/**
 * The prompt shows the p-value rounded to four places, and the learner decides from what is on the
 * page. A draw whose rounded p-value falls on the other side of a conventional level from its exact
 * one (0.00995 printing as 0.0100 against α = 0.01) is a trick question about rounding, not about
 * significance, so it is rejected.
 */
const displayAgrees = (p: number): boolean => {
  const shown = Number(fmtP(p))
  return Number.isFinite(shown) && CONVENTIONAL.every((a) => (p < a) === (shown < a))
}

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

const ALT_SYMBOL: Record<Alternative, string> = { greater: '>', less: '<', 'two-sided': '\\ne' }

interface Draw {
  c: Case
  p0: number
  n: number
  x: number
  phat: number
  z: number
  p: number
  alt: Alternative
  population: string
}

/**
 * One corridor audit against a posted figure, drawn until its p-value lands in `band` and the
 * z-procedure is defensible on it. Everything comes back from `onePropTest`.
 */
function drawCorridor(rng: Rng, alt: Alternative, band: [number, number], lift: [number, number] = [1.0, 1.8], extra: (d: Draw) => boolean = () => true): Draw {
  const c = pickContext(rng, CASES)
  return retry(
    rng,
    (r) => {
      const p0 = Math.round(r.uniform(c.p0Range[0], c.p0Range[1]) * 1000) / 1000
      const n = 10 * r.int(12, 45)
      const factor = alt === 'less' ? r.uniform(0.45, 0.95) : r.uniform(lift[0], lift[1])
      const x = r.binomial(n, Math.min(0.9, Math.max(0.01, p0 * factor)))
      const t = onePropTest({ x, n, p0, alt, random: true })
      return { c, p0, n, x, phat: x / n, z: t.statistic, p: t.pValue!, alt, population: `${c.unit} on ${c.lane}` }
    },
    (d) =>
      d.x >= 5 &&
      d.x <= d.n - 5 &&
      d.n * d.p0 >= 10 &&
      d.n * (1 - d.p0) >= 10 &&
      d.p >= band[0] &&
      d.p <= band[1] &&
      !reservedCount(d.n) &&
      !reservedCount(d.x) &&
      !reservedStat(d.z) &&
      !reservedP(d.p) &&
      displayAgrees(d.p) &&
      extra(d),
  )
}

// ---------------------------------------------------------------------------------------------
// The rubric act-6-05 grades by — drills, mission beat and instrument alike
// ---------------------------------------------------------------------------------------------

/**
 * The claims the Act VI conclusion is not allowed to make. The test compares two rates; it has
 * nothing at all to say about a mechanism, an actor or a motive, and the sentence that slips one in
 * is the sentence a hearing strikes first.
 */
export const AGENCY_FORBIDDEN: ForbiddenPhrase[] = [
  {
    phrase: /\btarget(?:ed|ing|s)?\b/,
    label: '“targeted”',
    why: 'A two-proportion test compares two rates. "Targeted" asserts that somebody chose these hulls — an actor, an intention and a mechanism, none of which is in the arithmetic. It is the first word a hearing will strike, and striking it removes nothing the procedure actually bought.',
  },
  {
    phrase: /\b(?:sabotage[drs]?|sabotaging|deliberate(?:ly)?|intentional(?:ly)?|on purpose|purposely|hijack\w*|pirac\w*|piracy|fraud\w*|conspir\w*|scheme[ds]?|plot(?:ted|ting)?)\b/,
    label: 'A claim about agency or intent',
    why: 'The conclusion may say that one class of hulls is lost at a higher rate. It may not say why, or by whom. Nothing in a difference of proportions distinguishes a deliberate act from a bad berth, a bad route or a bad run of luck at a rate we have not measured.',
  },
  {
    phrase: /\b(?:because of|caused by|responsible for|behind)\b[^.;]{0,30}\b(?:perrine|holdings|fund|board|directorate|somebody|someone)\b/,
    label: 'Names a cause or a party',
    why: 'Observational counts establish association, not cause, and they name nobody. The beneficiary column is a label on the data, not a finding about a company.',
  },
]

/**
 * Treating "fail to reject" as "H₀ is true". Written with a negative lookbehind so a learner who
 * writes "this does not mean H₀ is true" is credited rather than punished.
 */
export const NULL_IS_TRUE: ForbiddenPhrase = {
  phrase: /(?<!\bnot\b[^.;]{0,40})\bnull\b[^.;]{0,24}\b(?:is|are|was|were|remains|must be)\s+(?:probably\s+|likely\s+)?(?:true|correct|right)\b/,
  label: 'Treats “fail to reject” as “H₀ is true”',
  why: 'Failing to reject means the data are consistent with H₀, not that H₀ holds. A test with little power against a real difference this size would fail to reject whether or not the difference exists — absence of evidence is not evidence of absence.',
}

export interface ConclusionRubricArgs {
  pValue: number
  alpha: number
  direction: Alternative
  /** The parameter in words: "proportion", or "loss rate". */
  parameter: string
  /** Whom the conclusion is about: "transits on the Pasiphae ore run". */
  population: string
  /** What was measured: "held at the mark", or "per transit". */
  variable: string
  /** What Hₐ says the parameter exceeds: a null value, or the other group in words. */
  nullValue?: number | string
  units?: string
  /** Extra direction words this context would accept ("more often", "worse"). */
  directionWords?: string[]
  /** Extra forbidden claims. act-6-05 passes `AGENCY_FORBIDDEN`. */
  extraForbidden?: (RubricPhrase | ForbiddenPhrase)[]
}

/**
 * AP 6.6 conclusion-in-context, built on the shared `significanceTestConclusion` template so the
 * decision, the p-vs-α citation, the evidence framing, the direction and the context are graded the
 * same everywhere, plus whatever this Act additionally refuses to let the sentence claim.
 */
export function conclusionInContextRubric({
  pValue,
  alpha,
  direction,
  parameter,
  population,
  variable,
  nullValue,
  units,
  directionWords,
  extraForbidden = [],
}: ConclusionRubricArgs): InterpretationAnswer {
  const base = significanceTestConclusion({
    pValue,
    alpha,
    direction: direction === 'two-sided' ? 'two-sided' : direction,
    directionWords,
    parameterContext: { parameter, population, variable, units, nullValue },
  })
  if (!extraForbidden.length) return base
  return { ...base, forbidden: [...(base.forbidden ?? []), ...extraForbidden] }
}

// ---------------------------------------------------------------------------------------------
// 1. Interpretation — the conclusion (Act VI checkpoint q8)
// ---------------------------------------------------------------------------------------------

export const testConclusion = defineGenerator({
  id: 'act-6/test-conclusion',
  label: 'State the conclusion in context',
  ap_topics: ['6.6'],
  skills: ['4'],
  generate(rng) {
    const d = drawCorridor(rng, 'greater', [0.0004, 0.035], [1.2, 1.9])
    const alpha = rng.choice(CONVENTIONAL.filter((a) => d.p < a))
    const answer = conclusionInContextRubric({
      pValue: d.p,
      alpha,
      direction: 'greater',
      parameter: 'proportion',
      population: d.population,
      variable: d.c.variable,
      nullValue: fmt(d.p0, 3),
    })
    return {
      prompt: `${sentence(d.c.office)} fixed $\\alpha = ${alphaStr(alpha)}$ in its review plan, before it pulled a single row, and then tested the proportion of ${d.c.unit} on ${d.c.lane} ${d.c.variable} against the posted figure:\n\n$$H_0:\\ p = ${fmt(d.p0, 3)} \\qquad H_a:\\ p > ${fmt(d.p0, 3)}$$\n\nwhere $p$ is the true proportion for all ${d.population}. The review of ${fmtInt(d.n)} ${d.c.unit} returned ${fmtInt(d.x)} ${d.c.event}, so $\\hat p = ${fmt(d.phat, 4)}$, $z = ${fmt(d.z, 2)}$ and $P = ${fmtP(d.p)}$.\n\n**Write the conclusion.** The decision first, then what the data say, in context. One or two sentences.`,
      answer,
      hints: [
        'The first clause is a decision about H₀ and nothing else, and it is settled by one comparison: the p-value against the α that was written down before the file was opened. Say which is smaller, with both numbers.',
        `Then the sentence that carries the finding. It is framed as *evidence*, never as proof, and it says what H\u2090 claimed — that the true proportion ${d.c.variable} is greater than ${fmt(d.p0, 3)} — and for whom: ${d.population}.`,
        `Five things a reader checks for: the decision; $P = ${fmtP(d.p)}$ against $\\alpha = ${alphaStr(alpha)}$; the words "convincing evidence"; the direction; and the context.`,
      ],
      solution: `**${answer.exemplar}**\n\nThe decision is arithmetic: $P = ${fmtP(d.p)} < \\alpha = ${alphaStr(alpha)}$, so a result this extreme is rarer than the false-alarm rate the office agreed to live with, and $H_0$ is rejected. Everything after that is discipline.\n\n- *Reject $H_0$*, not "$H_a$ is proven". The test never proves anything; it finds the data too unlikely under $H_0$ to keep working with $H_0$.\n- *Convincing evidence that…*, not "the proportion is ${fmt(d.phat, 4)}". ${fmt(d.phat, 4)} is what this review measured. The conclusion is about the true proportion for all ${d.population}, which nobody has seen.\n- *In context.* A conclusion that says "we reject $H_0$, $P = ${fmtP(d.p)}$" and stops is not a conclusion. It is a calculation with a full stop after it, and it tells a reader who was not in the room nothing at all.\n\nAnd the number itself stays in the sentence. A reader who disagrees with $\\alpha = ${alphaStr(alpha)}$ — and one always does — can redo the decision from $P = ${fmtP(d.p)}$ without redoing the work.`,
      misconception: 'Writing "proves" or "accepts", or stopping at the decision. The decision is about H₀; the conclusion is about the corridor, and it is the only part of the sentence anybody outside the office can use.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the conclusion that concludes nothing
// ---------------------------------------------------------------------------------------------

export const failToReject = defineGenerator({
  id: 'act-6/fail-to-reject',
  label: 'The conclusion when the evidence is not there',
  ap_topics: ['6.6'],
  skills: ['4'],
  generate(rng) {
    const d = drawCorridor(rng, 'greater', [0.09, 0.62], [0.95, 1.35])
    const alpha = rng.choice(WORKING_ALPHAS.filter((a) => d.p >= 1.8 * a))
    const answer = conclusionInContextRubric({
      pValue: d.p,
      alpha,
      direction: 'greater',
      parameter: 'proportion',
      population: d.population,
      variable: d.c.variable,
      nullValue: fmt(d.p0, 3),
      extraForbidden: [NULL_IS_TRUE],
    })
    return {
      prompt: `${sentence(d.c.office)} fixed $\\alpha = ${alphaStr(alpha)}$ in its review plan and tested the proportion of ${d.c.unit} on ${d.c.lane} ${d.c.variable} against the posted figure:\n\n$$H_0:\\ p = ${fmt(d.p0, 3)} \\qquad H_a:\\ p > ${fmt(d.p0, 3)}$$\n\nwhere $p$ is the true proportion for all ${d.population}. The review of ${fmtInt(d.n)} ${d.c.unit} returned ${fmtInt(d.x)} ${d.c.event} — $\\hat p = ${fmt(d.phat, 4)}$, above the posted ${fmt(d.p0, 3)} — but $z = ${fmt(d.z, 2)}$ and $P = ${fmtP(d.p)}$.\n\n**Write the conclusion.** Then make sure your sentence does not claim the one thing this result cannot support.`,
      answer,
      hints: [
        `The sample rate is above the posted figure, and that is not the question. The question is whether a gap this size is bigger than what ${fmtInt(d.n)} ${d.c.unit} produce on their own, and ${fmtP(d.p)} says it is not.`,
        `The decision is "fail to reject" — never "accept". Then the evidence sentence goes in the negative: there is *not* convincing evidence that the true proportion ${d.c.variable} is greater than ${fmt(d.p0, 3)} for ${d.population}.`,
        'Two sentences that are both wrong here: "the proportion is exactly the posted figure" and "there is no difference". Neither was tested. All that happened is that this review could not tell the difference.',
      ],
      solution: `**${answer.exemplar}**\n\n$P = ${fmtP(d.p)}$ is not below $\\alpha = ${alphaStr(alpha)}$: a corridor running at exactly ${fmt(d.p0, 3)} would produce a statistic at least as extreme as $z = ${fmt(d.z, 2)}$ about ${fmtP(d.p)} of the time, which is often enough that nothing here needs explaining.\n\nWhat the sentence must not do is turn that into a finding:\n\n- **"We accept $H_0$."** Never written. The review did not establish that the true proportion is ${fmt(d.p0, 3)}; it established that ${fmtInt(d.n)} ${d.c.unit} cannot distinguish ${fmt(d.phat, 4)} from ${fmt(d.p0, 3)}. Those are different sentences and only one of them is true.\n- **"There is no difference."** Also never written. A review with a hundred times as many ${d.c.unit} might find one — the same true gap with a tenth of the standard error is a different p-value entirely.\n\nThe honest close is the one that names the limit: *not convincing evidence*, at this α, on this many ${d.c.unit}. Failing to reject is a statement about what this procedure could see, not about what is there.`,
      misconception: '"We accept H₀" — or its quieter cousin, "so the rate is the same". Failing to reject is the absence of a finding, not a finding of absence.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — the decision, p against α
// ---------------------------------------------------------------------------------------------

export const decisionFromP = defineGenerator({
  id: 'act-6/decision-from-p',
  label: 'The decision: p against α',
  ap_topics: ['6.6'],
  skills: ['3', '4'],
  generate(rng) {
    const alpha = rng.choice(WORKING_ALPHAS)
    const nearMiss = rng.bool(0.5)
    const band: [number, number] = nearMiss ? [alpha * 0.45, alpha * 2.1] : [0.0008, 0.4]
    const d = drawCorridor(rng, 'greater', band, [1.0, 2.0])
    const decided = reject(d.p, alpha)
    const pStr = fmtP(d.p)
    const aStr = alphaStr(alpha)
    const margin = Math.abs(d.p - alpha)

    const cands: Candidate[] = [
      {
        text: decided
          ? `Reject $H_0$. $P = ${pStr}$ is less than $\\alpha = ${aStr}$, so there is convincing evidence that the true proportion of ${d.population} ${d.c.variable} is greater than ${fmt(d.p0, 3)}.`
          : `Fail to reject $H_0$. $P = ${pStr}$ is not less than $\\alpha = ${aStr}$, so there is not convincing evidence that the true proportion of ${d.population} ${d.c.variable} is greater than ${fmt(d.p0, 3)}.`,
        correct: true,
        why: null,
      },
      {
        text: decided
          ? `Fail to reject $H_0$. $P = ${pStr}$ is small, but a single review of ${fmtInt(d.n)} ${d.c.unit} cannot overturn a posted figure, so the office keeps ${fmt(d.p0, 3)} until a second review agrees.`
          : `Reject $H_0$. $\\hat p = ${fmt(d.phat, 4)}$ is above the posted ${fmt(d.p0, 3)}, and the whole point of the review was to find out whether the figure was too low.`,
        correct: false,
        why: decided
          ? `The decision rule is the one the office wrote down: reject when $P < \\alpha$. $${pStr} < ${aStr}$, so it rejects. "Wait for a second review" may be good practice, but it is not the decision this test makes, and changing the rule after seeing the number is the thing α exists to prevent.`
          : `This reads the decision off $\\hat p$ instead of off the p-value. $\\hat p = ${fmt(d.phat, 4)}$ is above ${fmt(d.p0, 3)} — it almost always will be in a sample — and $P = ${pStr}$ is precisely the statement that a gap that size is ordinary for ${fmtInt(d.n)} ${d.c.unit}.`,
      },
      {
        text: `Accept $H_0$ if $P \\ge \\alpha$ and accept $H_a$ if $P < \\alpha$. Here $P = ${pStr}$ and $\\alpha = ${aStr}$, so the office accepts ${decided ? '$H_a$' : '$H_0$'} and records the true proportion as ${decided ? `greater than ${fmt(d.p0, 3)}` : `exactly ${fmt(d.p0, 3)}`}.`,
        correct: false,
        why: 'Neither hypothesis is ever accepted. A test either finds the data too unlikely under $H_0$ to keep it, or it does not; it never establishes that a hypothesis is true. "Accept" quietly converts an absence of evidence into a measurement, and that is the sentence a hearing takes apart first.',
      },
      {
        text: `There is a ${pStr} probability that $H_0$ is true. Since that is ${decided ? 'below' : 'above'} $\\alpha = ${aStr}$, the office ${decided ? 'rejects' : 'retains'} $H_0$.`,
        correct: false,
        why: `The arithmetic happens to land on the right decision, and the sentence is still unusable: ${pStr} is not the probability that $H_0$ is true. It is the probability of a statistic at least as extreme as $z = ${fmt(d.z, 2)}$ *computed under the assumption that $H_0$ is true*. The hypothesis is the input, not the output.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(d.c.office)} set $\\alpha = ${aStr}$ in its review plan before it opened the file, and tested $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p ${ALT_SYMBOL.greater} ${fmt(d.p0, 3)}$ for the proportion of ${d.c.unit} on ${d.c.lane} ${d.c.variable}. The review of ${fmtInt(d.n)} ${d.c.unit} returned ${fmtInt(d.x)} ${d.c.event}: $z = ${fmt(d.z, 2)}$, $P = ${pStr}$.\n\nWhich decision does the office record, and how is it stated?${nearMiss ? '\n\nRead the two numbers carefully before you choose. They are close.' : ''}`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'One comparison decides it, and only one: the p-value against the α that was fixed before the data. Everything else in the options is a claim about the corridor, and a claim about the corridor is the *second* sentence, not the decision.',
        `$P = ${pStr}$ and $\\alpha = ${aStr}$. Which is smaller? Then check the wording of whichever option matches: two of these state the arithmetic correctly and the conclusion wrongly.`,
      ],
      solution: `**${options[correct]}**\n\n$$P = ${pStr} \\quad ${decided ? '<' : '\\ge'} \\quad \\alpha = ${aStr} \\;\\Longrightarrow\\; \\text{${decided ? 'reject' : 'fail to reject'}}\\ H_0$$\n\n${
        margin < 0.4 * alpha
          ? `The margin is ${fmt(margin, 4)} — ${decided ? 'a hair under' : 'a hair over'} the line. That is exactly why α is fixed in advance and in writing. A p-value of ${pStr} against a level chosen *after* the number came out of the machine is not a test; it is a preference with a decimal point in it. And because the margin is thin, the report gives ${pStr} itself, so a reader who works at a different level can redo the decision without redoing the work.`
          : `The comparison is not close: ${pStr} against ${aStr}. The report still quotes the p-value, because a reader who works at a different level is entitled to the number rather than the verdict.`
      }\n\nNote what none of the four wrong readings is: arithmetically wrong. Each of them gets the comparison right and then says something the comparison does not license — accepting a hypothesis, reading the decision off $\\hat p$, or turning a probability about data into a probability about a hypothesis.`,
      misconception: 'Deciding from the sample proportion rather than from the p-value, or writing "accept" for either hypothesis.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — where the decision changes
// ---------------------------------------------------------------------------------------------

export const alphaFlip = defineGenerator({
  id: 'act-6/alpha-flip',
  label: 'The α at which the decision flips',
  ap_topics: ['6.6'],
  skills: ['3'],
  generate(rng) {
    const wantThreshold = rng.bool()
    const d = drawCorridor(rng, 'greater', wantThreshold ? [0.0015, 0.2] : [0.0015, 0.085], [1.1, 2.1])
    const pStr = fmtP(d.p)

    if (wantThreshold) {
      /** The level the office currently works at — deliberately on the other side of p. */
      const stated = rng.choice(CONVENTIONAL)
      const nowRejects = reject(d.p, stated)
      return {
        prompt: `${sentence(d.c.office)} works at $\\alpha = ${alphaStr(stated)}$, and on that level its review of the proportion of ${d.c.unit} on ${d.c.lane} ${d.c.variable} **${nowRejects ? 'rejects' : 'fails to reject'}** $H_0:\\ p = ${fmt(d.p0, 3)}$. The review returned $z = ${fmt(d.z, 2)}$ and $P = ${pStr}$.\n\nHold the data exactly as they are. At what significance level does that decision change? Give the threshold to four decimal places.`,
        answer: numericAnswer(d.p, 'pValue'),
        hints: [
          'The decision rule has one moving part. The data fix the p-value; α is the only thing the office chooses, and the decision is settled by which of the two is larger.',
          `Reject when $P < \\alpha$. $P$ is nailed down at ${pStr}. So write the inequality with $\\alpha$ as the unknown and read off the value where it stops being satisfied.`,
          `The threshold is the value of $\\alpha$ that makes $\\alpha = P$ exactly. Four decimal places.`,
        ],
        solution: `The rule is $\\text{reject } H_0 \\iff P < \\alpha$, and the data have fixed $P = ${pStr}$. So the decision depends on $\\alpha$ alone:\n\n$$\\alpha > ${pStr} \\Rightarrow \\text{reject} \\qquad \\alpha \\le ${pStr} \\Rightarrow \\text{fail to reject}$$\n\n**${pStr}** — the decision changes exactly at $\\alpha = P$. Above it the office rejects; at it or below it, the office does not.\n\nWhich is the real reason a report quotes the p-value and not just the verdict. ${nowRejects ? `At ${alphaStr(stated)} this result rejects, and any reader working at a stricter level than ${pStr} gets the other answer from the same file — without re-running anything.` : `At ${alphaStr(stated)} this result does not reject, and a reader working at a looser level than ${pStr} gets the other answer from the same file — without re-running anything.`} A verdict is one reader's α applied once. The p-value travels.`,
        misconception: 'Reporting the α the office happens to use rather than the level at which the decision turns over. The threshold is the p-value itself.',
      }
    }

    const smallest = CONVENTIONAL.filter((a) => d.p < a).reduce((a, b) => Math.min(a, b), Infinity)
    const nextDown = CONVENTIONAL.filter((a) => a < smallest).reduce((a, b) => Math.max(a, b), -Infinity)
    return {
      prompt: `${sentence(d.c.office)}'s review of the proportion of ${d.c.unit} on ${d.c.lane} ${d.c.variable} returned $z = ${fmt(d.z, 2)}$ and $P = ${pStr}$ against $H_0:\\ p = ${fmt(d.p0, 3)}$.\n\nThe conventional significance levels are 0.10, 0.05, 0.01 and 0.001. **What is the smallest of those at which this result is still significant?** Give it to three decimal places.`,
      answer: numericAnswer(smallest, 'other', { digits: 3 }),
      hints: [
        'A smaller α is a stricter test: it demands a rarer result before it will reject. So the question is how far down the list this p-value survives.',
        `Work down from 0.10 and stop at the last level that is still larger than $P = ${pStr}$. Reject requires $P < \\alpha$, so the level has to be strictly above the p-value.`,
      ],
      solution: `Reject when $P < \\alpha$, so the result survives every level above $P = ${pStr}$ and none at or below it.\n\n${CONVENTIONAL.map((a) => `- $\\alpha = ${alphaStr(a)}$: $${pStr} ${d.p < a ? '<' : '\\ge'} ${alphaStr(a)}$ — ${d.p < a ? '**significant**' : 'not significant'}`).join('\n')}\n\n**$\\alpha = ${fmt(smallest, 3)}$** is the smallest conventional level at which this result still rejects${Number.isFinite(nextDown) ? `, and at $\\alpha = ${alphaStr(nextDown)}$ it does not` : ''}.\n\n"Significant at the 0.05 level" is therefore a coarser statement than the p-value it came from: it says only which side of one line the number fell on. Report ${pStr} as well, always, and a reader who works to a different standard is not obliged to take your standard on trust.`,
      misconception: 'Picking the largest conventional level rather than the smallest, or picking the level nearest the p-value without checking that it is strictly above it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — the interval and the test answer the same question
// ---------------------------------------------------------------------------------------------

export const ciTestDuality = defineGenerator({
  id: 'act-6/ci-test-duality',
  label: 'What the interval says about the test',
  ap_topics: ['6.6'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, CASES)
    const confidence = rng.choice([0.9, 0.95, 0.99] as const)
    const alpha = Math.round((1 - confidence) * 1000) / 1000
    const wantExclude = rng.bool()

    const d = retry(
      rng,
      (r) => {
        const p0 = Math.round(r.uniform(c.p0Range[0], c.p0Range[1]) * 1000) / 1000
        const n = 10 * r.int(15, 45)
        const factor = wantExclude ? r.uniform(1.3, 2.05) : r.uniform(0.94, 1.12)
        const x = r.binomial(n, Math.min(0.9, Math.max(0.01, p0 * factor)))
        const ci = onePropInterval({ x, n, confidence, random: true })
        const test = onePropTest({ x, n, p0, alt: 'two-sided', random: true })
        const [lo, hi] = ci.ci as [number, number]
        return { c, p0, n, x, phat: x / n, lo, hi, ci, test, contains: p0 >= lo && p0 <= hi, width: hi - lo }
      },
      (v) =>
        v.x >= 10 &&
        v.x <= v.n - 10 &&
        v.n * v.p0 >= 10 &&
        v.n * (1 - v.p0) >= 10 &&
        v.contains === !wantExclude &&
        // The interval and the test must agree, and not by a whisker: their standard errors differ
        // (p̂ for the interval, p₀ for the test), so a borderline draw could split them.
        v.contains === !reject(v.test.pValue!, alpha) &&
        Math.min(Math.abs(v.p0 - v.lo), Math.abs(v.p0 - v.hi)) > 0.12 * v.width &&
        !reservedCount(v.n) &&
        !reservedCount(v.x),
    )

    const pct = fmt(confidence * 100, 0)
    const aStr = alphaStr(alpha)
    const ciStr = `(${fmt(d.lo, 4)},\\ ${fmt(d.hi, 4)})`
    const halfAlpha = alphaStr(alpha / 2)
    const wideLevel = fmt((1 - 2 * alpha) * 100, 0)

    const cands: Candidate[] = [
      {
        text: `${d.contains ? `${fmt(d.p0, 3)} lies inside the interval, so it is a plausible value for $p$, and a **two-sided** test of $H_0:\\ p = ${fmt(d.p0, 3)}$ at $\\alpha = ${aStr}$ would fail to reject $H_0$.` : `${fmt(d.p0, 3)} lies outside the interval, so it is not a plausible value for $p$, and a **two-sided** test of $H_0:\\ p = ${fmt(d.p0, 3)}$ at $\\alpha = ${aStr}$ would reject $H_0$.`}`,
        correct: true,
        why: null,
      },
      {
        text: `${fmt(d.p0, 3)} lies ${d.contains ? 'inside' : 'outside'} the interval, so a **one-sided** test of $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p > ${fmt(d.p0, 3)}$ at $\\alpha = ${aStr}$ would ${d.contains ? 'fail to reject' : 'reject'} $H_0$.`,
        correct: false,
        why: `The reading of the interval is right; the test it is matched to is not. A ${pct}% interval splits its ${aStr} of missed captures between two tails, ${halfAlpha} on each, so it corresponds to the **two-sided** test at ${aStr} — or, equivalently, to a one-sided test at ${halfAlpha}. The one-sided test at ${aStr} is the *wider* ${wideLevel}% interval, which is not the one printed here.`,
      },
      {
        text: `${fmt(d.p0, 3)} lies ${d.contains ? 'inside' : 'outside'} the interval, so a two-sided test at $\\alpha = ${aStr}$ would ${d.contains ? 'reject' : 'fail to reject'} $H_0$ — an interval is built from the data and a test is built from the hypothesis, so the two run opposite ways.`,
        correct: false,
        why: `They run the same way. The ${pct}% interval is the set of null values a two-sided test at ${aStr} would *not* reject; that is what "plausible" means here. ${fmt(d.p0, 3)} is ${d.contains ? 'in that set, so the test keeps it' : 'not in that set, so the test rejects it'}.`,
      },
      {
        text: `The interval says there is a ${pct}% probability that $p$ lies between ${fmt(d.lo, 4)} and ${fmt(d.hi, 4)}. Since ${fmt(d.p0, 3)} is ${d.contains ? 'inside that range' : 'outside that range'}, the probability that $H_0$ is true is ${d.contains ? `at least ${pct}%` : `below ${aStr}`}.`,
        correct: false,
        why: `Two errors in one sentence. The confidence level describes the *method* — over many samples, ${pct}% of the intervals it builds capture $p$ — not this interval, which either contains $p$ or does not. And neither an interval nor a test ever produces a probability for a hypothesis: both are computed from the data, with the parameter treated as a fixed unknown.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${sentence(c.office)} publishes a **${pct}% confidence interval** for the proportion of ${c.unit} on ${c.lane} ${c.variable}, built from ${fmtInt(d.x)} ${c.event} in ${fmtInt(d.n)} ${c.unit}:\n\n$$${ciStr}$$\n\nThe posted figure the corridor has always been rated at is $${fmt(d.p0, 3)}$. The office does not publish a test.\n\nWhat can you say about a significance test of $H_0:\\ p = ${fmt(d.p0, 3)}$ from the interval alone?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A confidence interval is the set of null values that would survive a test — the values close enough to the estimate that the data do not contradict them. So the first question is whether the posted figure is in that set.',
        `Then match the levels. A ${pct}% interval leaves ${aStr} uncaptured, split between *two* tails. Which alternative does that correspond to, and at which α?`,
      ],
      solution: `**${options[correct]}**\n\nThe ${pct}% interval $${ciStr}$ is exactly the set of values $p_0$ for which a two-sided test at $\\alpha = ${aStr}$ would fail to reject: both procedures measure the same distance from the estimate in the same standard errors and compare it with the same $z^*$. ${fmt(d.p0, 3)} is ${d.contains ? 'inside it, so the test keeps $H_0$' : 'outside it, so the test rejects $H_0$'}${d.contains ? '' : ` — and indeed the two-sided p-value for these counts is ${fmtP(d.test.pValue!)}`}.\n\nTwo caveats a careful reader will want, and this course states both:\n\n- **The one-sided test at $\\alpha$ is not this interval.** It matches a ${wideLevel}% two-sided interval, because a one-sided α puts all of its risk in one tail. The pairing is (1 − α) interval ↔ two-sided test at α, and (1 − 2α) interval ↔ one-sided test at α.\n- **The two standard errors are not the same quantity.** An interval for a proportion uses $\\hat p$ in its standard error; the test uses $p_0$. The correspondence is therefore a near-identity, not an algebraic one, and a result sitting on the boundary can come out on different sides of it. This one is not on the boundary.\n\nWhich is why the interval is worth publishing even when a test exists: the test answers one question about one null value, and the interval answers it for every null value at once — and gives the size of the effect while it is at it.`,
      misconception: 'Matching a (1 − α) interval to a one-sided test at α. The interval has two tails; the one-sided test has one, so the levels are α and 2α apart.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — four drafts, one that survives
// ---------------------------------------------------------------------------------------------

export const conclusionDefects = defineGenerator({
  id: 'act-6/conclusion-defects',
  label: 'Which conclusion survives a hearing?',
  ap_topics: ['6.6'],
  skills: ['4'],
  generate(rng) {
    const rejects = rng.bool()
    const d = drawCorridor(rng, 'greater', rejects ? [0.0006, 0.03] : [0.1, 0.6], rejects ? [1.25, 1.95] : [0.95, 1.3])
    const alpha = rejects ? rng.choice(CONVENTIONAL.filter((a) => d.p < a)) : rng.choice(WORKING_ALPHAS.filter((a) => d.p >= 1.8 * a))
    const pStr = fmtP(d.p)
    const aStr = alphaStr(alpha)
    const good = conclusionInContextRubric({
      pValue: d.p,
      alpha,
      direction: 'greater',
      parameter: 'proportion',
      population: d.population,
      variable: d.c.variable,
      nullValue: fmt(d.p0, 3),
    })

    const cands: Candidate[] = rejects
      ? [
          { text: good.exemplar, correct: true, why: null },
          {
            text: `Because $P = ${pStr}$ is less than $\\alpha = ${aStr}$, the review proves that the true proportion of ${d.population} ${d.c.variable} is greater than ${fmt(d.p0, 3)}.`,
            correct: false,
            why: '**"Proves."** Everything else in the sentence is right, which is what makes the word dangerous. A test at α = ' + aStr + ' is wrong about one corridor in ' + fmtInt(Math.round(1 / alpha)) + ' when $H_0$ is true, by construction. A procedure with a designed failure rate does not prove.',
          },
          {
            text: `$P = ${pStr} < \\alpha = ${aStr}$, so we reject $H_0$. The result is statistically significant.`,
            correct: false,
            why: `**No context.** True, complete as arithmetic, and useless to anybody who was not in the room. Significant about what, for whom, in which direction? A conclusion names the variable (${d.c.variable}), the population (${d.population}) and the direction Hₐ claimed.`,
          },
          {
            text: `The review found ${fmtInt(d.x)} ${d.c.event} in ${fmtInt(d.n)} ${d.c.unit}, a rate of ${fmt(d.phat, 4)}, which is well above the posted ${fmt(d.p0, 3)}. There is convincing evidence that the true proportion of ${d.population} ${d.c.variable} is greater than ${fmt(d.p0, 3)}.`,
            correct: false,
            why: `**No decision, and no p-value against α.** It states the finding and hides the only thing that licenses it. "Well above" is an impression; ${pStr} against ${aStr} is the argument. A reader who works at a different level cannot use this sentence at all.`,
          },
        ]
      : [
          { text: good.exemplar, correct: true, why: null },
          {
            text: `Because $P = ${pStr}$ is greater than $\\alpha = ${aStr}$, we accept $H_0$: the true proportion of ${d.population} ${d.c.variable} is ${fmt(d.p0, 3)}.`,
            correct: false,
            why: `**"Accept $H_0$."** The review did not measure the true proportion; it failed to distinguish ${fmt(d.phat, 4)} from ${fmt(d.p0, 3)} on ${fmtInt(d.n)} ${d.c.unit}. A larger review might distinguish them easily. Failing to find a difference is not finding that there is none.`,
          },
          {
            text: `$P = ${pStr}$ is greater than $\\alpha = ${aStr}$, so we fail to reject $H_0$, which proves that the posted figure of ${fmt(d.p0, 3)} is still the right one to publish.`,
            correct: false,
            why: '**"Proves" — and the null at that.** A test never proves either hypothesis, and it is least able to say anything about $H_0$ precisely when it fails to reject it. The posted figure survives the review; that is not the same as being confirmed by it.',
          },
          {
            text: `$P = ${pStr}$, so we fail to reject $H_0$ at $\\alpha = ${aStr}$.`,
            correct: false,
            why: `**No context and no finding.** The decision is about $H_0$; the conclusion has to be about ${d.population}. Say it in the negative and say it in full: there is not convincing evidence that the true proportion ${d.c.variable} is greater than ${fmt(d.p0, 3)}.`,
          },
        ]

    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(d.c.office)} tested $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p > ${fmt(d.p0, 3)}$ for the proportion of ${d.c.unit} on ${d.c.lane} ${d.c.variable}, at $\\alpha = ${aStr}$ fixed in advance. The review of ${fmtInt(d.n)} ${d.c.unit} returned ${fmtInt(d.x)} ${d.c.event}: $\\hat p = ${fmt(d.phat, 4)}$, $z = ${fmt(d.z, 2)}$, $P = ${pStr}$.\n\nFour conclusions are drafted. **Exactly one of them would survive being read aloud, in full, by somebody who wants the review to fail.** Which?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Check each draft against five things in turn: is there a decision about H₀; is the p-value compared with α; is the finding framed as evidence rather than fact; is the direction stated; and is it about a named population and a named variable.',
        'Then look for the two words that are never written. One of them claims more than any test can pay for; the other converts an absence of evidence into a measurement.',
      ],
      solution: `**${options[correct]}**\n\nFive parts, and a hostile reader checks for all five: the decision, $P = ${pStr}$ against $\\alpha = ${aStr}$, evidence framing, the direction, and the context. Drop any one of them and the sentence either claims too much or says nothing.\n\n${cands
        .slice(1)
        .map((c) => `- ${c.why}`)
        .join('\n')}\n\nThe discipline is not pedantry. A conclusion is the only part of the analysis that travels: the file stays in the office and the sentence goes into somebody else's report, without the working, without the conditions page, and without you there to add the clause you meant.`,
      misconception: '"Proves" and "accept H₀" — and the quieter failure, a conclusion that is arithmetically perfect and names nobody.',
    }
  },
})
