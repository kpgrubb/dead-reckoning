/**
 * act-6-03 · The Hypothesis — drills. AP 6.4: hypotheses stated about a *parameter* in words and
 * symbols, one- or two-sided read off the question rather than the data, the conditions checked with
 * the hypothesised proportion (p₀ for one sample, the pooled p̂c for two), and what a standardized
 * test statistic measures.
 *
 *   act-6/state-hypotheses       choice    the correct H₀/Hₐ pair for a described question
 *   act-6/hypotheses-in-context  interp    hypotheses in words and symbols + why the direction
 *   act-6/one-sided-or-two       choice    direction from the wording (and the after-the-data trap)
 *   act-6/pooled-proportion      numeric   p̂c for two described samples
 *   act-6/expected-count         numeric   the smallest large-counts product under H₀
 *   act-6/what-z-measures        choice    what the standardized statistic measures
 *
 * Nothing here computes a p-value: that is act-6-04's module and the book's biggest beat.
 * The Lane's own 19/900 against 12/1,712 belongs to the mission beats and never appears here.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableSpec } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { largeCountsCondition, seProportion } from '@/lib/stats'
import { fmt, fmtInt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Corridor {
  /** "the Adrastea feeder lane" */
  lane: string
  /** "the Adrastea Lane Office" */
  office: string
  port: string
}

const CORRIDORS: readonly Corridor[] = [
  { lane: 'the Adrastea feeder lane', office: 'the Adrastea Lane Office', port: 'Adrastea Transfer' },
  { lane: 'the Thebe–Amalthea shuttle run', office: 'the Thebe Yard traffic office', port: 'Thebe Yards' },
  { lane: 'the Elara transfer corridor', office: 'the Elara Station berth office', port: 'Elara Station' },
  { lane: 'the Carme outer loop', office: 'the Carme relay office', port: 'Carme Relay' },
  { lane: 'the Themis Reach', office: 'the Themis Reach survey office', port: 'Themis Anchorage' },
  { lane: 'the Hygiea feeder', office: 'the Hygiea Hold traffic office', port: 'Hygiea Hold' },
] as const

/** Numbers the Lane's own case owns. A drill that reproduces one of them is a drill that leaks a beat. */
const RESERVED_COUNTS = new Set([19, 31, 900, 1712, 2612, 2580])
const RESERVED_RATES = [19 / 900, 12 / 1712, 31 / 2612, 0.0141]
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
const reservedRate = (p: number): boolean => RESERVED_RATES.some((r) => Math.abs(p - r) < 0.0006)
/** 10.7 and 3.16 are act-6-03's and act-6-04's mission-beat answers. */
const reservedValue = (v: number): boolean => Math.abs(v - 10.68) < 0.06 || Math.abs(v - 3.16) < 0.02

/** Prompts open with an office name, which is lower-case in the corridor table. */
const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

type Direction = 'greater' | 'less' | 'two-sided'

const SYMBOL: Record<Direction, string> = { greater: '>', less: '<', 'two-sided': '\\ne' }
const WORD: Record<Direction, string> = { greater: 'greater than', less: 'less than', 'two-sided': 'different from' }

// ---------------------------------------------------------------------------------------------
// Scenarios — a question, a parameter, and the direction the QUESTION (not the data) implies
// ---------------------------------------------------------------------------------------------

interface OneSample {
  kind: 'one'
  alt: Direction
  /** The question the office is asking, before any data comes back. */
  ask: (c: Corridor, p0: number, n: number, x: number) => string
  /** Why the alternative points that way — quoted from the question, never from the data. */
  reason: string
  parameter: string
  population: (c: Corridor) => string
  /** Plausible range for the posted figure. */
  p0Range: [number, number]
}

interface TwoSample {
  kind: 'two'
  alt: Direction
  ask: (c: Corridor, a: SampleFacts, b: SampleFacts) => string
  reason: string
  parameter: string
  group1: string
  group2: string
  population: (c: Corridor) => string
  rateRange: [number, number]
}

interface SampleFacts {
  label: string
  x: number
  n: number
}

const ONE_SAMPLE: readonly OneSample[] = [
  {
    kind: 'one',
    alt: 'greater',
    ask: (c, p0, n, x) =>
      `${c.office} posts an off-nominal advisory rate of ${fmt(p0, 3)} for ${c.lane} and has been told by three masters that the real figure is worse. The Office pulls ${fmtInt(n)} transits from the berth log and finds ${fmtInt(x)} that logged an advisory.`,
    reason: 'the masters complained that the true advisory rate is worse than the posted figure, so the Office is only interested in a rate above it',
    parameter: 'proportion of transits that log an off-nominal advisory',
    population: (c) => `all transits on ${c.lane}`,
    p0Range: [0.08, 0.2],
  },
  {
    kind: 'one',
    alt: 'less',
    ask: (c, p0, n, x) =>
      `The Mk 2 scrubber cartridge fails on ${fmt(p0, 3)} of transits, and ${c.office} will only pay to refit ${c.port} with the Mk 4 if the Mk 4's true failure rate is genuinely lower. In a trial of ${fmtInt(n)} transits the Mk 4 failed ${fmtInt(x)} times.`,
    reason: 'the Office will only pay for the refit if the new cartridge fails less often than the old one, so only a lower rate would change the decision',
    parameter: 'proportion of transits on which the Mk 4 cartridge fails',
    population: (c) => `all transits refitted with the Mk 4 on ${c.lane}`,
    p0Range: [0.1, 0.24],
  },
  {
    kind: 'one',
    alt: 'two-sided',
    ask: (c, p0, n, x) =>
      `The Bureau's standing figure for late check-ins on ${c.lane} is ${fmt(p0, 3)}, and the Bureau wants to know whether the figure needs revising in either direction before it is reprinted. ${fmtInt(x)} of ${fmtInt(n)} audited transits checked in late.`,
    reason: 'the Bureau asked whether the standing figure needs revising in either direction, which makes a difference of any sign relevant',
    parameter: 'proportion of transits that check in late',
    population: (c) => `all transits on ${c.lane}`,
    p0Range: [0.09, 0.22],
  },
  {
    kind: 'one',
    alt: 'greater',
    ask: (c, p0, n, x) =>
      `An underwriter will renew cover on ${c.lane} at the standard premium only while the transponder-dropout rate stays at or under ${fmt(p0, 3)}, and will reprice if the true rate is above it. ${c.office} audits ${fmtInt(n)} transits and counts ${fmtInt(x)} dropouts.`,
    reason: 'the underwriter reprices only if the true dropout rate is above the threshold in the policy, so the question is one-directional',
    parameter: 'proportion of transits with a transponder dropout',
    population: (c) => `all transits on ${c.lane}`,
    p0Range: [0.07, 0.18],
  },
] as const

const TWO_SAMPLE: readonly TwoSample[] = [
  {
    kind: 'two',
    alt: 'greater',
    ask: (c, a, b) =>
      `${c.office} suspects that ${a.label} are being held up more often than the rest of ${c.lane}, and pulls both columns from the same six-year berth log: ${fmtInt(a.x)} of ${fmtInt(a.n)} against ${fmtInt(b.x)} of ${fmtInt(b.n)}.`,
    reason: 'the Office suspected before it looked that the first group is held up more often, so only a higher rate for that group answers the question it asked',
    parameter: 'proportion of transits held up at the mark',
    group1: 'hulls under the co-operative charter',
    group2: 'every other hull on the run',
    population: (c) => `all transits on ${c.lane}`,
    rateRange: [0.06, 0.16],
  },
  {
    kind: 'two',
    alt: 'two-sided',
    ask: (c, a, b) =>
      `The Authority is deciding whether to print one advisory table for ${c.lane} or two, and needs to know whether the ${a.label} differ from the rest at all — in either direction. The audit returns ${fmtInt(a.x)} of ${fmtInt(a.n)} and ${fmtInt(b.x)} of ${fmtInt(b.n)}.`,
    reason: 'the Authority only needs to know whether the two groups differ at all before it prints one table or two, which makes a difference of either sign relevant',
    parameter: 'proportion of transits that log an off-nominal advisory',
    group1: 'yard-refitted hulls',
    group2: 'hulls that have not been through the yard',
    population: (c) => `all transits on ${c.lane}`,
    rateRange: [0.08, 0.2],
  },
  {
    kind: 'two',
    alt: 'greater',
    ask: (c, a, b) =>
      `Before the season opened, ${c.office} wrote down that it expected the ${a.label} to drop transponder locks more often, because their sets are a generation older. The season's log: ${fmtInt(a.x)} of ${fmtInt(a.n)} and ${fmtInt(b.x)} of ${fmtInt(b.n)}.`,
    reason: 'the Office wrote down before the season opened that it expected the older sets to drop locks more often, so the alternative was fixed before any data arrived',
    parameter: 'proportion of transits with a transponder dropout',
    group1: 'hulls carrying the older transponder set',
    group2: 'hulls carrying the current set',
    population: (c) => `all transits on ${c.lane}`,
    rateRange: [0.05, 0.14],
  },
] as const

// ---------------------------------------------------------------------------------------------
// Draws
// ---------------------------------------------------------------------------------------------

interface OneDraw {
  p0: number
  n: number
  x: number
  phat: number
  se0: number
  counts: { np0: number; nq0: number; min: number }
}

/** A one-sample draw whose p̂ sits on the *opposite* side of p₀ often enough to break the habit. */
function drawOne(rng: Rng, s: OneSample): OneDraw {
  return retry(
    rng,
    (r) => {
      const p0 = Math.round(r.uniform(s.p0Range[0], s.p0Range[1]) * 1000) / 1000
      const n = 10 * r.int(9, 34)
      const phatTrue = p0 * r.uniform(0.7, 1.45)
      const x = r.binomial(n, Math.min(0.85, Math.max(0.01, phatTrue)))
      const np0 = n * p0
      const nq0 = n * (1 - p0)
      return { p0, n, x, phat: x / n, se0: seProportion(p0, n), counts: { np0, nq0, min: Math.min(np0, nq0) } }
    },
    (d) =>
      d.x >= 4 &&
      d.x <= d.n - 4 &&
      d.counts.min >= 10 &&
      !reservedCount(d.n) &&
      !reservedCount(d.x) &&
      !reservedRate(d.phat) &&
      !reservedRate(d.p0) &&
      !reservedValue(d.counts.min) &&
      Math.abs(d.phat - d.p0) > 0.005,
  )
}

interface TwoDraw {
  a: SampleFacts
  b: SampleFacts
  pooled: number
  p1: number
  p2: number
  counts: { label: string; np: number; nq: number }[]
  min: number
}

function drawTwo(rng: Rng, s: TwoSample, opts: { minProduct?: [number, number] } = {}): TwoDraw {
  const [lo, hi] = opts.minProduct ?? [10.5, 1e9]
  return retry(
    rng,
    (r) => {
      const base = r.uniform(s.rateRange[0], s.rateRange[1])
      const lift = r.uniform(1.15, 1.9)
      const n1 = 10 * r.int(8, 30)
      const n2 = 10 * r.int(14, 48)
      const x1 = r.binomial(n1, Math.min(0.8, base * lift))
      const x2 = r.binomial(n2, base)
      const pooled = (x1 + x2) / (n1 + n2)
      const counts = [
        { label: s.group1, np: n1 * pooled, nq: n1 * (1 - pooled) },
        { label: s.group2, np: n2 * pooled, nq: n2 * (1 - pooled) },
      ]
      const min = Math.min(...counts.flatMap((c) => [c.np, c.nq]))
      return { a: { label: s.group1, x: x1, n: n1 }, b: { label: s.group2, x: x2, n: n2 }, pooled, p1: x1 / n1, p2: x2 / n2, counts, min }
    },
    (d) =>
      d.a.x >= 4 &&
      d.b.x >= 4 &&
      d.min >= lo &&
      d.min <= hi &&
      d.p1 > d.p2 &&
      ![d.a.n, d.b.n, d.a.x, d.b.x].some(reservedCount) &&
      ![d.pooled, d.p1, d.p2].some(reservedRate) &&
      !reservedValue(d.min),
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — state the hypotheses
// ---------------------------------------------------------------------------------------------

export const stateHypotheses = defineGenerator({
  id: 'act-6/state-hypotheses',
  label: 'State the hypotheses',
  ap_topics: ['6.4'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const twoSample = rng.bool()

    if (!twoSample) {
      const s = pickContext(rng, ONE_SAMPLE)
      const d = drawOne(rng, s)
      const p0 = fmt(d.p0, 3)
      const param = `where $p$ is the **true** ${s.parameter} for ${s.population(c)}`
      const wrongDir: Direction = s.alt === 'two-sided' ? 'greater' : s.alt === 'greater' ? 'less' : 'greater'
      const cands: Candidate[] = [
        {
          text: `$H_0:\\ p = ${p0}$ and $H_a:\\ p ${SYMBOL[s.alt]} ${p0}$ — ${param}.`,
          correct: true,
          why: null,
        },
        {
          text: `$H_0:\\ \\hat p = ${p0}$ and $H_a:\\ \\hat p ${SYMBOL[s.alt]} ${p0}$ — where $\\hat p$ is the sample proportion, ${fmt(d.phat, 3)}.`,
          correct: false,
          why: `Hypotheses are claims about a **parameter**, never about a statistic. $\\hat p = ${fmt(d.phat, 3)}$ is already known exactly — there is nothing to test about it. The unknown quantity is $p$, the ${s.parameter} for ${s.population(c)}.`,
        },
        {
          text: `$H_0:\\ p = ${p0}$ and $H_a:\\ p ${SYMBOL[wrongDir]} ${p0}$ — ${param}.`,
          correct: false,
          why: `The direction has to come out of the question. ${s.reason.charAt(0).toUpperCase()}${s.reason.slice(1)} — so $H_a$ says the true rate is ${WORD[s.alt]} ${p0}, not ${WORD[wrongDir]} it.`,
        },
        {
          text: `$H_0:\\ p ${SYMBOL[s.alt]} ${p0}$ and $H_a:\\ p = ${p0}$ — ${param}.`,
          correct: false,
          why: `The two are the wrong way round. $H_0$ is always the statement of *no effect* — the single value the sampling distribution can be built on. You cannot draw a sampling distribution for "$p ${SYMBOL[s.alt]} ${p0}$", because that is not one value.`,
        },
        {
          text: `$H_0:\\ p = ${fmt(d.phat, 3)}$ and $H_a:\\ p ${SYMBOL[s.alt]} ${fmt(d.phat, 3)}$ — ${param}.`,
          correct: false,
          why: `The null value is the figure the question puts on the table — ${p0}, ${s.alt === 'less' ? "the old cartridge's posted rate" : 'the posted figure'} — not the number this sample happened to produce. Testing a sample against itself asks nothing.`,
        },
      ]
      const chosen = [cands[0], ...rng.shuffle(cands.slice(1)).slice(0, 3)]
      const { options, correct, feedback } = shuffleChoice(rng, chosen)
      return {
        prompt: `${sentence(s.ask(c, d.p0, d.n, d.x))}\n\nWhich pair of hypotheses does this question call for?`,
        answer: { type: 'choice', options, correct, feedback },
        hints: [
          'Two questions, in this order. What is the unknown quantity the office wants to know about — a number it will never observe exactly? And what would the office have written down *before* the audit came back?',
          `The unknown quantity is the ${s.parameter} for ${s.population(c)}. The null value is the figure already on the table: ${p0}. Now read the question again for the direction, and ignore the count entirely.`,
        ],
        solution: `$$H_0:\\ p = ${p0} \\qquad H_a:\\ p ${SYMBOL[s.alt]} ${p0}$$\n\n**${options[correct]}**\n\nThree things are being got right at once.\n\n- The hypotheses are about $p$, the *parameter*. $\\hat p = ${fmtInt(d.x)}/${fmtInt(d.n)} = ${fmt(d.phat, 3)}$ is a known number; a hypothesis about it would be a claim about something already in front of you.\n- The null value is ${p0}, the figure the question supplies. $H_0$ has to be a single value, because the whole procedure works by building the sampling distribution the null implies.\n- The direction is ${WORD[s.alt]}, because ${s.reason}. It is a fact about the question, and it would read the same if the audit had come back the other way.`,
        misconception: 'Writing the hypotheses about p̂ rather than p, or reading the direction off the sample instead of off the question.',
      }
    }

    const s = pickContext(rng, TWO_SAMPLE)
    const d = drawTwo(rng, s)
    const param = `where $p_1$ and $p_2$ are the **true** ${s.parameter} for ${s.group1} and for ${s.group2}, respectively`
    const wrongDir: Direction = s.alt === 'two-sided' ? 'greater' : 'less'
    const cands: Candidate[] = [
      { text: `$H_0:\\ p_1 = p_2$ and $H_a:\\ p_1 ${SYMBOL[s.alt]} p_2$ — ${param}.`, correct: true, why: null },
      {
        text: `$H_0:\\ \\hat p_1 = \\hat p_2$ and $H_a:\\ \\hat p_1 ${SYMBOL[s.alt]} \\hat p_2$ — where $\\hat p_1 = ${fmt(d.p1, 3)}$ and $\\hat p_2 = ${fmt(d.p2, 3)}$.`,
        correct: false,
        why: `$\\hat p_1 = ${fmt(d.p1, 3)}$ and $\\hat p_2 = ${fmt(d.p2, 3)}$ are already known, and they are already unequal. A hypothesis about them is a hypothesis about a fact. The test is about $p_1$ and $p_2$, which nobody has seen.`,
      },
      {
        text: `$H_0:\\ p_1 = p_2$ and $H_a:\\ p_1 ${SYMBOL[wrongDir]} p_2$ — ${param}.`,
        correct: false,
        why: `Wrong direction for this question. ${s.reason.charAt(0).toUpperCase()}${s.reason.slice(1)}.`,
      },
      {
        text: `$H_0:\\ p_1 = ${fmt(d.p1, 3)}$ and $H_a:\\ p_1 ${SYMBOL[s.alt]} ${fmt(d.p2, 3)}$ — ${param}.`,
        correct: false,
        why: `Both sample proportions have been substituted for the parameters. In a two-sample test the null is a *relation* between two unknowns — $p_1 = p_2$ — and it never names a number, because the common rate the two groups might share is not known either.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(s.ask(c, d.a, d.b))}\n\nWhich pair of hypotheses does this question call for?`,
      answer: { type: 'choice', options, correct, feedback },
      data: tableSpec(
        ['group', 'affected', 'transits', 'sample proportion'],
        [
          [s.group1, d.a.x, d.a.n, fmt(d.p1, 3)],
          [s.group2, d.b.x, d.b.n, fmt(d.p2, 3)],
        ],
      ),
      hints: [
        'Name the two unknown quantities first. They are not the two numbers in the table — the table gives you statistics, and statistics are known. Then ask what "no difference" would look like as an equation.',
        `Here the unknowns are the true ${s.parameter}s of ${s.group1} and of ${s.group2}. "No difference" is $p_1 = p_2$, and it names no number at all. The direction comes from what the Office wrote down before the log was pulled.`,
      ],
      solution: `$$H_0:\\ p_1 = p_2 \\qquad H_a:\\ p_1 ${SYMBOL[s.alt]} p_2$$\n\n**${options[correct]}**\n\n$p_1$ is the true ${s.parameter} for ${s.group1}; $p_2$ is the same parameter for ${s.group2}. The observed $\\hat p_1 = ${fmtInt(d.a.x)}/${fmtInt(d.a.n)} = ${fmt(d.p1, 3)}$ and $\\hat p_2 = ${fmtInt(d.b.x)}/${fmtInt(d.b.n)} = ${fmt(d.p2, 3)}$ are the evidence, not the claim.\n\nThe null names no number. That is the point of it: it says the two groups share *whatever* the common rate is, and that single statement is enough to build a sampling distribution for $\\hat p_1 - \\hat p_2$ — centred at 0, with a spread the two sample sizes fix.\n\nThe direction is ${WORD[s.alt]}, because ${s.reason}.`,
      misconception: 'Writing a two-sample null as a statement about the two sample proportions, or naming a value for the common rate that nobody knows.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the hypotheses in words and symbols, and why the direction
// ---------------------------------------------------------------------------------------------

const ABOUT_PHAT: ForbiddenPhrase = {
  phrase: /\b(?:null|alt)\b[^.;]{0,35}\bphat\b/,
  label: 'Hypotheses written about p̂',
  why: 'A hypothesis is a claim about a parameter. The sample proportion is already known exactly, so there is nothing to test about it — write H₀ and Hₐ about the true proportion p.',
}
const ABOUT_XBAR: ForbiddenPhrase = {
  phrase: /\b(?:null|alt)\b[^.;]{0,35}\bxbar\b/,
  label: 'Hypotheses written about x̄',
  why: 'This is a question about a proportion, and in any case a hypothesis is never written about a sample statistic. Use p, the true proportion.',
}
const AFTER_THE_DATA: ForbiddenPhrase = {
  phrase: /\b(?:because|since)\b[^.;]{0,40}\b(?:phat|sample|observed|audit|count|result|data)\b[^.;]{0,40}\b(?:greater|higher|larger|above|below|lower|less|more|exceed)\w*/,
  label: 'Direction chosen from the data',
  why: 'The alternative is fixed by the question before the data are seen. Justifying the direction with "because the sample came out higher" is choosing the alternative after the fact, and it inflates the error rate the test advertises.',
}

export interface HypothesisRubricArgs {
  /** 'one' → H₀: p = p₀; 'two' → H₀: p₁ = p₂. */
  kind: 'one' | 'two'
  alt: Direction
  /** Null value for the one-sample case. */
  p0?: number
  parameter: string
  population: string
  /** Group names for the two-sample case. */
  groups?: [string, string]
  /** One sentence, quoted from the question, that fixes the direction. Its content words are the rubric. */
  reason: string
}

/**
 * Rubric for "state the hypotheses in context": both hypotheses, about a parameter, with the
 * direction justified from the question. Forbids hypotheses written about a statistic and a
 * direction justified by the data. Used by the drill and by act-6-03's mission beat.
 */
export function hypothesesInContextRubric({ kind, alt, p0, parameter, population, groups, reason }: HypothesisRubricArgs): InterpretationAnswer {
  const dirPhr: RubricPhrase[] = alt === 'greater' ? ['greater'] : alt === 'less' ? ['less'] : ['differ', 'not equal', 'not same', 'either direction']
  /**
   * These run as RegExps on the normalized text rather than as token phrases: a learner writes
   * "H₀: p = 0.11", the colon becomes a clause boundary, and a token phrase can never span it.
   */
  const nullPhr: RubricPhrase[] = [
    /\bnull\b[^.;]{0,40}\bequal\b/,
    /\bnull\b[^.;]{0,40}\b(?:same|identical)\b/,
    /\bnull\b[^.;]{0,40}\bnot\b[^.;]{0,20}\b(?:differ|different|difference)\b/,
    ...(kind === 'one' && p0 !== undefined ? [numberRegex(p0, 3, 1)] : [/\bp1\b[^.;]{0,10}\bequal\b[^.;]{0,10}\bp2\b/]),
  ]
  const required: RubricGroup[] = [
    {
      label: 'States H₀ as an equality (no difference)',
      phrasings: nullPhr,
      polarity: 'any',
      feedback: kind === 'one' && p0 !== undefined ? `H₀: p = ${fmt(p0, 3)} — the null is a single value, because the whole procedure is built on the sampling distribution it implies.` : 'H₀: p₁ = p₂ — the two groups share whatever the common rate is.',
    },
    {
      label: `States Hₐ with the direction the question implies (${WORD[alt]})`,
      phrasings: [...dirPhr, 'alt'],
      polarity: 'any',
      minMatches: 2,
      feedback: `Hₐ says the true ${parameter} is ${WORD[alt]} ${kind === 'one' && p0 !== undefined ? fmt(p0, 3) : 'the other group’s'}.`,
    },
    {
      label: 'Hypotheses are about the parameter (true / population), not the sample',
      phrasings: ['true', 'population', 'parameter', 'all'],
      polarity: 'any',
      feedback: 'Say "the true (population) proportion". The sample proportion is already known; it is the evidence, not the claim.',
    },
    contextGroup('Justifies the direction from the question, not the data', [reason], {
      minMatches: 2,
      feedback: `The direction comes from the question: ${reason}.`,
    }),
    contextGroup('Names the context (what is measured, and for whom)', [parameter, population, ...(groups ?? [])], {
      minMatches: 2,
      feedback: `Say what and whom: the ${parameter} of ${population}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [ABOUT_PHAT, ABOUT_XBAR, AFTER_THE_DATA]
  const symbols = kind === 'one' && p0 !== undefined ? `H₀: p = ${fmt(p0, 3)} and Hₐ: p ${alt === 'greater' ? '>' : alt === 'less' ? '<' : '≠'} ${fmt(p0, 3)}` : `H₀: p₁ = p₂ and Hₐ: p₁ ${alt === 'greater' ? '>' : alt === 'less' ? '<' : '≠'} p₂`
  const words =
    kind === 'one' && p0 !== undefined
      ? `where p is the true ${parameter} for ${population}: the null says that true proportion is exactly ${fmt(p0, 3)}, and the alternative says it is ${WORD[alt]} ${fmt(p0, 3)}`
      : `where p₁ and p₂ are the true ${parameter} for ${groups?.[0] ?? 'the first group'} and ${groups?.[1] ?? 'the second group'} among ${population}: the null says those two population proportions are equal, and the alternative says the first is ${WORD[alt]} the second`
  const exemplar = `${symbols}, ${words}. The direction is fixed by the question and not by the audit, because ${reason}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 25 }
}

export const hypothesesInContext = defineGenerator({
  id: 'act-6/hypotheses-in-context',
  label: 'Hypotheses in words and symbols',
  ap_topics: ['6.4'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const twoSample = rng.bool()

    if (!twoSample) {
      const s = pickContext(rng, ONE_SAMPLE)
      const d = drawOne(rng, s)
      const population = s.population(c)
      const answer = hypothesesInContextRubric({ kind: 'one', alt: s.alt, p0: d.p0, parameter: s.parameter, population, reason: s.reason })
      return {
        prompt: `${sentence(s.ask(c, d.p0, d.n, d.x))}\n\nState the hypotheses for the office's question — in symbols **and** in words, saying what the parameter is and whom it is about — and then give one sentence saying why the alternative points the way it does. Do not run any test.`,
        answer,
        hints: [
          'Three things have to appear: the two hypotheses in symbols, a sentence saying what the symbol means in this corridor, and a reason for the direction that could have been written before the audit came back.',
          `The parameter is the true ${s.parameter} for ${population}. The null value is the figure the question already puts on the table, ${fmt(d.p0, 3)}. For the direction, reread the question — not the count.`,
          'Finish with the justification. If your sentence mentions the audit result at all, it is the wrong sentence: the alternative has to be defensible to someone who has not seen the data.',
        ],
        solution: `**${answer.exemplar}**\n\nThe observed $\\hat p = ${fmtInt(d.x)}/${fmtInt(d.n)} = ${fmt(d.phat, 3)}$ is deliberately absent from all of that. It is what the test will weigh; it is not what the test is about.\n\nThe justification is the part most answers drop. Writing the direction down *before* the data and being able to say where it came from is what keeps the advertised error rate honest — pick the side after you have seen which way the sample fell and you have quietly run a two-sided test while reporting a one-sided one.`,
        misconception: 'Stating the hypotheses about p̂, or justifying the direction with "because the sample came out higher" — which is choosing the alternative after the data.',
      }
    }

    const s = pickContext(rng, TWO_SAMPLE)
    const d = drawTwo(rng, s)
    const population = s.population(c)
    const answer = hypothesesInContextRubric({ kind: 'two', alt: s.alt, parameter: s.parameter, population, groups: [s.group1, s.group2], reason: s.reason })
    return {
      prompt: `${sentence(s.ask(c, d.a, d.b))}\n\nState the hypotheses for the office's question — in symbols **and** in words, saying what each parameter is and whom it is about — and then give one sentence saying why the alternative points the way it does. Do not run any test.`,
      answer,
      data: tableSpec(
        ['group', 'affected', 'transits', 'sample proportion'],
        [
          [s.group1, d.a.x, d.a.n, fmt(d.p1, 3)],
          [s.group2, d.b.x, d.b.n, fmt(d.p2, 3)],
        ],
      ),
      hints: [
        'In a two-sample test the null names no number. Write down what "no difference" means as an equation between two things nobody has measured.',
        `The parameters are the true ${s.parameter} of ${s.group1} and of ${s.group2} among ${population}. Say which is $p_1$. Then read the direction off the question.`,
        'End with the justification, and keep the observed counts out of it entirely.',
      ],
      solution: `**${answer.exemplar}**\n\nThe sample proportions — $${fmt(d.p1, 3)}$ against $${fmt(d.p2, 3)}$ — do not appear anywhere in the hypotheses, and they should not. They are the evidence to be weighed against $H_0$, and a claim about them would be a claim about a fact already established.\n\nNote also what the null does *not* say: it does not say the common rate is any particular number. It says only that the two groups share it. That single sentence is enough to build the sampling distribution of $\\hat p_1 - \\hat p_2$, which is all a test needs.`,
      misconception: 'Naming a value for the common rate in H₀, or justifying the direction from the observed gap rather than from the question.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — one-sided or two, and why
// ---------------------------------------------------------------------------------------------

export const oneSidedOrTwo = defineGenerator({
  id: 'act-6/one-sided-or-two',
  label: 'One-sided or two-sided?',
  ap_topics: ['6.4'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, ONE_SAMPLE)
    const d = drawOne(rng, s)
    const p0 = fmt(d.p0, 3)
    const above = d.phat > d.p0
    const dataDir: Direction = above ? 'greater' : 'less'
    /** The honest-but-wrong alternative: two-sided where the question is one-sided, and vice versa. */
    const other: Direction = s.alt === 'two-sided' ? 'greater' : 'two-sided'

    const cands: Candidate[] = [
      {
        text: `$H_a:\\ p ${SYMBOL[s.alt]} ${p0}$ — because ${s.reason}.`,
        correct: true,
        why: null,
      },
      {
        text: `$H_a:\\ p ${SYMBOL[dataDir]} ${p0}$ — because the audit came back at $\\hat p = ${fmt(d.phat, 3)}$, which is ${above ? 'above' : 'below'} ${p0}, so that is the side worth testing.`,
        correct: false,
        why: `This is the trap, and it is a trap even on the draws where it lands on the right symbol. The alternative is a statement about the **question**, decided before the data arrive. Choosing the side after seeing which way $\\hat p$ fell means you would have picked the other side had the sample fallen the other way — which is a two-sided test reported at a one-sided p-value, and it doubles the error rate you are advertising.`,
      },
      {
        text: `$H_a:\\ p ${SYMBOL[other]} ${p0}$ — because ${other === 'two-sided' ? 'a two-sided alternative is always the safer default' : `the office is interested in a rate ${WORD[other]} the posted figure`}.`,
        correct: false,
        why:
          other === 'two-sided'
            ? `"Two-sided by default" is a reasonable instinct and the wrong answer here. ${s.reason.charAt(0).toUpperCase()}${s.reason.slice(1)} — a difference in the other direction would not change anything the office does, so it does not belong in the alternative.`
            : `Read the question again: ${s.reason}. An alternative pointing ${WORD[other]} answers a question nobody asked.`,
      },
      {
        text: `$H_a:\\ p \\ne ${fmt(d.phat, 3)}$ — the true rate differs from what this audit measured.`,
        correct: false,
        why: `Two faults at once. The comparison value is the posted figure ${p0}, not the sample's own ${fmt(d.phat, 3)}; and testing a sample against itself asks a question with no possible answer.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sentence(s.ask(c, d.p0, d.n, d.x))}\n\nThat is $\\hat p = ${fmt(d.phat, 3)}$. Taking $H_0:\\ p = ${p0}$, which alternative should the office test, and for which reason?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Cover the count with your hand and read the question again. Two of these options can be defended without knowing how the audit came out; two cannot.',
        'Ask what the office would *do* differently depending on the answer. A direction that changes no decision does not belong in the alternative — and a direction chosen because of the number in front of you is not a direction, it is a reaction.',
      ],
      solution: `$$H_a:\\ p ${SYMBOL[s.alt]} ${p0}$$\n\n**${options[correct]}**\n\nThe alternative is part of the *plan*, and the plan is written before the data. Here ${s.reason}, so the alternative is ${s.alt === 'two-sided' ? 'two-sided' : 'one-sided'} for a reason that has nothing to do with this audit and would read the same if the count had come back at ${fmtInt(Math.max(0, d.n - d.x))} instead of ${fmtInt(d.x)}.\n\nThe seductive wrong answer is the one that reads the direction off $\\hat p = ${fmt(d.phat, 3)}$. Note what it commits you to: had the sample fallen the other way, you would have tested the other tail. A procedure that will reject on *either* tail is a two-sided procedure, and reporting it as one-sided understates its false-alarm rate by a factor of two.`,
      misconception: 'Choosing the alternative after seeing which way the sample fell. The direction is a property of the question, fixed before the data.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — the pooled proportion
// ---------------------------------------------------------------------------------------------

export const pooledProportion = defineGenerator({
  id: 'act-6/pooled-proportion',
  label: 'The pooled proportion',
  ap_topics: ['6.4'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, TWO_SAMPLE)
    const d = drawTwo(rng, s)
    const total = d.a.x + d.b.x
    const n = d.a.n + d.b.n
    return {
      prompt: `${sentence(s.ask(c, d.a, d.b))}\n\nThe office will test $H_0:\\ p_1 = p_2$ against $H_a:\\ p_1 ${SYMBOL[s.alt]} p_2$. Under that null the two groups share one common rate, and the best estimate of it uses **both** samples.\n\nCompute the pooled proportion $\\hat p_c$, to three decimal places.`,
      data: tableSpec(
        ['group', 'affected', 'transits', 'sample proportion'],
        [
          [s.group1, d.a.x, d.a.n, fmt(d.p1, 3)],
          [s.group2, d.b.x, d.b.n, fmt(d.p2, 3)],
          ['both groups together', total, n, fmt(d.pooled, 3)],
        ],
      ),
      answer: numericAnswer(d.pooled, 'proportion', { digits: 3 }),
      hints: [
        'The null says there is only one rate. So estimate that one rate the way you would estimate any proportion — from every observation you have, with no regard to which group it came from.',
        `Add the affected counts, add the transit counts, and divide: ${fmtInt(d.a.x)} and ${fmtInt(d.b.x)} over ${fmtInt(d.a.n)} and ${fmtInt(d.b.n)}.`,
        `$\\dfrac{${fmtInt(d.a.x)} + ${fmtInt(d.b.x)}}{${fmtInt(d.a.n)} + ${fmtInt(d.b.n)}}$, to three decimals.`,
      ],
      solution: `$$\\hat p_c = \\frac{x_1 + x_2}{n_1 + n_2} = \\frac{${fmtInt(d.a.x)} + ${fmtInt(d.b.x)}}{${fmtInt(d.a.n)} + ${fmtInt(d.b.n)}} = \\frac{${fmtInt(total)}}{${fmtInt(n)}} = ${fmt(d.pooled, 4)}$$\n\n**${fmt(d.pooled, 3)}**\n\nIt is not the average of ${fmt(d.p1, 3)} and ${fmt(d.p2, 3)}, which would be ${fmt((d.p1 + d.p2) / 2, 3)}. The two samples are different sizes — ${fmtInt(d.a.n)} against ${fmtInt(d.b.n)} — so the larger one has more to say about the common rate, and pooling the raw counts weights them automatically.\n\nThis is a *null-hypothesis* estimate: it exists only because $H_0$ said the two groups share a rate. It is the number the test's standard error and the test's conditions both run on, and it is not used at all when the same two samples are turned into a confidence interval for the difference.`,
      misconception: `Averaging the two sample proportions (${fmt((d.p1 + d.p2) / 2, 3)}) instead of pooling the counts, which ignores the sample sizes.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — the smallest large-counts product under H₀
// ---------------------------------------------------------------------------------------------

export const expectedCount = defineGenerator({
  id: 'act-6/expected-count',
  label: 'The smallest expected count',
  ap_topics: ['6.4'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const twoSample = rng.bool()
    /** Half the draws are pushed into the 8–16 band so the narrow pass is a live question. */
    const tight = rng.bool()

    if (twoSample) {
      const s = pickContext(rng, TWO_SAMPLE)
      const d = drawTwo(rng, s, { minProduct: tight ? [7.5, 16] : [16, 1e9] })
      const rows = d.counts.flatMap((g) => [
        [`${g.label} · losses expected under H₀`, `n \times \hat p_c`, fmt(g.np, 1)],
        [`${g.label} · non-events expected under H₀`, `n(1 - \hat p_c)`, fmt(g.nq, 1)],
      ])
      const passes = d.min >= 10
      const cond = largeCountsCondition(d.counts[0].np >= d.counts[1].np ? d.b.n : d.a.n, d.pooled, 'pooled p̂c')
      return {
        prompt: `${sentence(s.ask(c, d.a, d.b))}\n\nThe office is checking the Large Counts condition for a two-proportion z-test before it runs anything. The pooled proportion is $\\hat p_c = ${fmt(d.pooled, 4)}$.\n\nFour products have to clear 10. **What is the smallest of them?** Give it to one decimal place.`,
        data: tableSpec(
          ['group', 'affected', 'transits'],
          [
            [s.group1, d.a.x, d.a.n],
            [s.group2, d.b.x, d.b.n],
          ],
        ),
        answer: numericAnswer(d.min, 'other', { digits: 1 }),
        hints: [
          'Under H₀ both groups run at the pooled rate. For each group, how many affected transits and how many unaffected would that rate predict? That is four numbers, and the condition is about the smallest of them.',
          `Multiply each sample size by $\\hat p_c = ${fmt(d.pooled, 4)}$ and by $1 - \\hat p_c = ${fmt(1 - d.pooled, 4)}$. The smallest of the four will be the smaller group's *affected* product, because ${fmt(d.pooled, 3)} is the smaller factor and ${fmtInt(Math.min(d.a.n, d.b.n))} is the smaller sample.`,
          `$${fmtInt(Math.min(d.a.n, d.b.n))} \\times ${fmt(d.pooled, 4)}$, to one decimal place.`,
        ],
        solution: `Under $H_0$ every transit in both groups runs at the pooled rate $\\hat p_c = \\dfrac{${fmtInt(d.a.x)} + ${fmtInt(d.b.x)}}{${fmtInt(d.a.n)} + ${fmtInt(d.b.n)}} = ${fmt(d.pooled, 4)}$.\n\n${rows.map((r) => `- ${r[0]}: $${r[1]} = ${r[2]}$`).join('\n')}\n\nThe smallest is **${fmt(d.min, 1)}**, which ${passes ? 'clears 10' : 'does **not** clear 10'}.\n\n${passes ? (d.min < 12 ? 'It clears it, and it does not clear it by much. A reviewer who wants the result to fail will find this number before anything else on the page, so name it yourself and name it first.' : 'The condition holds comfortably, so the normal approximation to the sampling distribution of $\\hat p_1 - \\hat p_2$ is safe to use.') : 'With a product below 10 the normal model for $\\hat p_1 - \\hat p_2$ is not trustworthy and the z-procedure should not be run on these counts at all.'}\n\nThe condition is checked with the **pooled** proportion, not with either sample's own. ${cond.detail}`,
        misconception: 'Checking Large Counts with the individual sample proportions instead of the pooled proportion, or checking only the two "affected" products and forgetting the two complements.',
      }
    }

    const s = pickContext(rng, ONE_SAMPLE)
    const d = retry(
      rng,
      (r) => drawOne(r, s),
      (x) => (tight ? x.counts.min <= 16 : x.counts.min > 16),
    )
    const cond = largeCountsCondition(d.n, d.p0, 'p₀')
    return {
      prompt: `${sentence(s.ask(c, d.p0, d.n, d.x))}\n\nBefore running a one-proportion z-test of $H_0:\\ p = ${fmt(d.p0, 3)}$, the office checks the Large Counts condition.\n\n**What is the smaller of the two products it has to clear 10?** Give it to one decimal place.`,
      answer: numericAnswer(d.counts.min, 'other', { digits: 1 }),
      hints: [
        'The condition for a *test* is checked with the hypothesised proportion, not with the one the sample produced. Two products, and the condition is about the smaller.',
        `$n p_0$ and $n(1 - p_0)$ with $n = ${fmtInt(d.n)}$ and $p_0 = ${fmt(d.p0, 3)}$. Since $p_0 < 0.5$, the smaller of the two is the first one.`,
        `$${fmtInt(d.n)} \\times ${fmt(d.p0, 3)}$, to one decimal place.`,
      ],
      solution: `$$n p_0 = ${fmtInt(d.n)} \\times ${fmt(d.p0, 3)} = ${fmt(d.counts.np0, 1)} \\qquad n(1 - p_0) = ${fmtInt(d.n)} \\times ${fmt(1 - d.p0, 3)} = ${fmt(d.counts.nq0, 1)}$$\n\nThe smaller is **${fmt(d.counts.min, 1)}**, and it ${d.counts.min >= 10 ? 'clears 10' : 'does not clear 10'}.\n\nNote which proportion did the work. The sample came back at $\\hat p = ${fmt(d.phat, 3)}$, which would have given $n\\hat p = ${fmt(d.n * d.phat, 1)}$ — a different number, and the wrong one. A test asks *what the world would look like if $H_0$ were true*, so every quantity the test uses — the standard error and the conditions alike — is computed at $p_0$. ${cond.detail}`,
      misconception: `Using p̂ = ${fmt(d.phat, 3)} rather than p₀ = ${fmt(d.p0, 3)} in the Large Counts check. For a test the condition is np₀ and n(1 − p₀); p̂ belongs to the interval, not the test.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — what the standardized statistic measures
// ---------------------------------------------------------------------------------------------

export const whatZMeasures = defineGenerator({
  id: 'act-6/what-z-measures',
  label: 'What the standardized statistic measures',
  ap_topics: ['6.4'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, ONE_SAMPLE)
    const d = retry(
      rng,
      (r) => drawOne(r, s),
      (x) => x.phat > x.p0 && (x.phat - x.p0) / x.se0 > 1.1 && (x.phat - x.p0) / x.se0 < 3.9 && !reservedValue((x.phat - x.p0) / x.se0),
    )
    const stat = (d.phat - d.p0) / d.se0
    const gap = d.phat - d.p0
    const cands: Candidate[] = [
      {
        text: `It says the observed $\\hat p$ sits about **${fmt(stat, 2)} standard errors above ${fmt(d.p0, 3)}**, measured on the sampling distribution $H_0$ predicts — a distance in units of that distribution's own spread.`,
        correct: true,
        why: null,
      },
      {
        text: `It is the probability of getting a sample proportion as far from ${fmt(d.p0, 3)} as this one, if $H_0$ is true.`,
        correct: false,
        why: `That is the p-value, and it is a different object: a probability, always between 0 and 1. The standardized statistic ${fmt(stat, 2)} is a *distance*, and it can be any size at all. The distance comes first; the probability is read off it afterwards.`,
      },
      {
        text: `It is the size of the gap between the sample proportion and the null value: $${fmt(d.phat, 3)} - ${fmt(d.p0, 3)} = ${fmt(gap, 3)}$, rescaled so that it reads in percentage points.`,
        correct: false,
        why: `The raw gap is ${fmt(gap, 3)}, and standardizing does the opposite of what this says — it *removes* the units. Dividing by the standard error ${fmt(d.se0, 4)} leaves a pure number, which is exactly why ${fmt(stat, 2)} can be compared across corridors and sample sizes with wildly different raw gaps.`,
      },
      {
        text: `It measures how far the sample proportion is from the alternative hypothesis, so a large value means $H_a$ fits the data badly.`,
        correct: false,
        why: `The statistic is measured from the **null** value, on the null's own sampling distribution. $H_a$ names no number to measure from. And the sign is the other way round: a large value means the data sit far from $H_0$, which counts *against* the null, not against the alternative.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${c.office} tests $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p > ${fmt(d.p0, 3)}$ for the ${s.parameter} on ${c.lane}, and gets $\\hat p = ${fmtInt(d.x)}/${fmtInt(d.n)} = ${fmt(d.phat, 3)}$. Under $H_0$ the standard error of $\\hat p$ is $${fmt(d.se0, 4)}$, and the standardized test statistic comes out at $${fmt(stat, 2)}$.\n\nWhat does that number measure?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Look at the arithmetic that produced it: a difference on top, a standard error underneath. Units divided by the same units leave something with no units at all. What kind of quantity is that, and what is it counting?',
        `The gap is $${fmt(d.phat, 3)} - ${fmt(d.p0, 3)} = ${fmt(gap, 3)}$ and one standard error is $${fmt(d.se0, 4)}$. Ask how many of the second fit inside the first — and on whose sampling distribution those standard errors are measured.`,
      ],
      solution: `$$\\text{statistic} = \\frac{\\hat p - p_0}{\\sqrt{p_0(1 - p_0)/n}} = \\frac{${fmt(d.phat, 3)} - ${fmt(d.p0, 3)}}{${fmt(d.se0, 4)}} = ${fmt(stat, 2)}$$\n\n**${options[correct]}**\n\nEvery standardized statistic in the course is the same sentence: *(what we saw) − (what the null said) ÷ (how much this statistic ordinarily wobbles)*. The denominator is computed **under $H_0$** — at $p_0 = ${fmt(d.p0, 3)}$, not at $\\hat p = ${fmt(d.phat, 3)}$ — because the question being asked is what the world would look like if the null were true.\n\nWhat it buys is comparability. A gap of ${fmt(gap, 3)} means nothing on its own: on ${fmtInt(d.n)} transits it is ${fmt(stat, 2)} standard errors, and on a tenth as many transits the same gap would be about ${fmt(stat / Math.sqrt(10), 2)} — unremarkable. The raw difference and the sample size only become one number after you divide.`,
      misconception: 'Confusing the standardized statistic with the p-value. The statistic is a distance measured in standard errors and has no upper limit; the p-value is a probability computed from it.',
    }
  },
})
