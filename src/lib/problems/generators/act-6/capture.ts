/**
 * act-6-01 · Capture — drills. AP 6.1, 6.2: the logic of an interval as statistic ± margin, the
 * conditions for a one-sample z-interval for a proportion, and the confidence LEVEL read as a
 * long-run capture rate rather than a probability about the interval on the screen.
 *
 *   act-6/interval-conditions       choice    which condition holds or fails, with the numbers
 *   act-6/interpret-confidence-level  interp  interpret the LEVEL (custom rubric groups)
 *   act-6/capture-count             numeric   expected captures / misses out of N simulated intervals
 *   act-6/critical-value            numeric   z* for a stated level, from the inverse CDF
 *   act-6/confidence-width          choice    what C and n do to the width
 *   act-6/what-the-level-is-not     choice    four sentences about one interval; one is defensible
 *
 * `act-6/interval-conditions` is a checkpoint item (q1) and `act-6/interpret-confidence-level` is
 * q2, so both stand alone: everything they need is in the prompt and nothing refers to the panel.
 *
 * The level rubric is hand-built rather than taken from `confidenceIntervalInterpretation`, because
 * that template grades the interpretation of an INTERVAL (endpoints, "between a and b") and this
 * item grades the interpretation of a LEVEL. 6-02 owns the template.
 *
 * The Lane's own figures — 31 losses in 2,612 transits, the nineteen Perrine hulls in 900 — belong
 * to the mission beats. Every framing here is another corridor, another office, another quarter.
 */
import type { Rng } from '@/lib/rng'
import { seedFrom } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup, numberPattern } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { simulate } from '@/lib/sim'
import { marginOfErrorProportion, onePropInterval, zStar } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

export interface Corridor {
  /** "the Adrastea feeder lane" */
  lane: string
  /** "the Adrastea Lane Office" */
  office: string
  /** "Adrastea Transfer" */
  port: string
  quarter: string
}

export const CORRIDORS: readonly Corridor[] = [
  { lane: 'the Adrastea feeder lane', office: 'the Adrastea Lane Office', port: 'Adrastea Transfer', quarter: 'the second quarter of 2183' },
  { lane: 'the Thebe–Amalthea shuttle run', office: 'the Thebe Yard traffic office', port: 'Thebe Yards', quarter: 'the first quarter of 2184' },
  { lane: 'the Elara transfer corridor', office: 'the Elara Station berth office', port: 'Elara Station', quarter: 'the third quarter of 2183' },
  { lane: 'the Carme outer loop', office: 'the Carme relay office', port: 'Carme Relay', quarter: 'the last quarter of 2182' },
  { lane: 'the Leda–Himalia local run', office: 'the Himalia traffic office', port: 'Himalia Anchorage', quarter: 'the second quarter of 2184' },
  { lane: 'the Ceres–Vesta ore run', office: 'the Ceres Authority traffic office', port: 'Ceres Deep Berths', quarter: 'the first quarter of 2183' },
] as const

/** What is being estimated: the unit sampled, and the thing that happens to a unit. */
export interface Measure {
  /** Plural unit noun: "transits". */
  unit: string
  /** Verb phrase after "proportion …": "ending in a loss". */
  event: string
  /** Noun phrase for a single occurrence: "a loss". */
  occurrence: string
  /** The parameter, named: "proportion of transits ending in a loss". */
  parameter: string
}

export const MEASURES: readonly Measure[] = [
  { unit: 'transits', event: 'logging an off-nominal advisory', occurrence: 'an off-nominal advisory', parameter: 'proportion of transits that log an off-nominal advisory' },
  { unit: 'transits', event: 'arriving with a transponder dropout', occurrence: 'a transponder dropout', parameter: 'proportion of transits arriving with a transponder dropout' },
  { unit: 'hulls', event: 'carrying full cargo insurance', occurrence: 'full cargo insurance', parameter: 'proportion of hulls carrying full cargo insurance' },
  { unit: 'claims', event: 'settled within ninety days', occurrence: 'a settlement inside ninety days', parameter: 'proportion of claims settled within ninety days' },
  { unit: 'masters', event: 'filing at least one advisory this quarter', occurrence: 'a filed advisory', parameter: 'proportion of masters filing at least one advisory this quarter' },
] as const

/**
 * Numbers reserved for Act V/VI mission beats and for the Act's own datasets — never a drill's
 * answer, total or count. The Lane's 31/2,612, the nineteen Perrine hulls in 900, the other 12 in
 * 1,712, the season of 435 and the 11,263 transits of 6-02's sample-size beat.
 */
const RESERVED_COUNTS = new Set([31, 2612, 2581, 19, 900, 12, 1712, 435, 11263, 46, 4180, 13, 2580])
const RESERVED_PROPS = [31 / 2612, 19 / 900, 12 / 1712, 46 / 4180, 13 / 2580, 0.002, 0.005, 0.011]
export const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
export const reservedProp = (p: number): boolean => RESERVED_PROPS.some((r) => Math.abs(p - r) < 0.0015)

export type Candidate = { text: string; correct: boolean; why: string | null }

export function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

/** Confidence levels a Lane office actually writes down — including three no table has a row for. */
export const LEVELS = [0.8, 0.85, 0.9, 0.92, 0.95, 0.96, 0.98, 0.99] as const

// ---------------------------------------------------------------------------------------------
// 1. Choice — the conditions for a one-proportion z-interval
// ---------------------------------------------------------------------------------------------

type Failing = 'none' | 'random' | 'ten-percent' | 'large-counts'

interface ConditionDraw {
  x: number
  n: number
  /** Finite register the sample was drawn from, or undefined when the units come from a process. */
  populationSize?: number
  random: boolean
}

function drawConditions(rng: Rng, failing: Failing, processFramed: boolean): ConditionDraw {
  if (failing === 'large-counts') {
    return retry(
      rng,
      (r) => {
        const n = r.int(60, 190)
        const x = r.binomial(n, r.uniform(0.02, 0.07))
        return { x, n, populationSize: processFramed ? undefined : n * r.int(18, 44), random: true }
      },
      ({ x, n }) => x >= 2 && x <= 9 && n - x >= 10 && !reservedCount(x) && !reservedCount(n) && !reservedProp(x / n),
    )
  }
  if (failing === 'ten-percent') {
    return retry(
      rng,
      (r) => {
        const n = r.int(120, 320)
        const x = r.binomial(n, r.uniform(0.14, 0.42))
        return { x, n, populationSize: Math.round(n * r.uniform(2.4, 6.5)), random: true }
      },
      ({ x, n, populationSize }) =>
        x >= 14 && n - x >= 14 && n > 0.1 * (populationSize ?? 0) && !reservedCount(x) && !reservedCount(n) && !reservedCount(populationSize ?? 0) && !reservedProp(x / n),
    )
  }
  return retry(
    rng,
    (r) => {
      const n = r.int(120, 360)
      const x = r.binomial(n, r.uniform(0.14, 0.42))
      return { x, n, populationSize: processFramed ? undefined : n * r.int(15, 40), random: failing !== 'random' }
    },
    ({ x, n, populationSize }) => x >= 14 && n - x >= 14 && !reservedCount(x) && !reservedCount(n) && !reservedCount(populationSize ?? 0) && !reservedProp(x / n),
  )
}

function selectionSentence(failing: Failing, c: Corridor, m: Measure, d: ConditionDraw, processFramed: boolean): string {
  if (failing === 'random') {
    return `${c.office} wanted the **${m.parameter}** on ${c.lane}. Its register for ${c.quarter} holds **${fmtInt(d.populationSize ?? 0)}** ${m.unit}, but nobody drew from it: a clerk pinned a notice on ${c.port}'s dock board and worked down the ${m.unit} whose masters answered it, stopping at **${fmtInt(d.n)}**. **${fmtInt(d.x)}** of those ${m.unit} showed ${m.occurrence}.`
  }
  if (processFramed) {
    return `${c.office} wanted the **${m.parameter}** for ${c.lane}'s traffic. It took the **${fmtInt(d.n)}** ${m.unit} the corridor produced in ${c.quarter} — a census of that quarter, from an operation that will go on producing ${m.unit} indefinitely — and found **${fmtInt(d.x)}** showing ${m.occurrence}. The office is willing to state in writing that the quarter was an ordinary one and that nothing about the way a ${m.unit.replace(/s$/, '')} arose was related to whether it showed ${m.occurrence}.`
  }
  return `${c.office} wanted the **${m.parameter}** on ${c.lane}. It drew **${fmtInt(d.n)}** ${m.unit} at random from its register of **${fmtInt(d.populationSize ?? 0)}** for ${c.quarter}, and **${fmtInt(d.x)}** of them showed ${m.occurrence}.`
}

export const intervalConditions = defineGenerator({
  id: 'act-6/interval-conditions',
  label: 'Conditions for a one-proportion z-interval',
  ap_topics: ['6.2'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const failing = pickContext(rng, ['none', 'none', 'random', 'ten-percent', 'large-counts'] as const)
    const processFramed = failing === 'none' ? rng.bool() : failing === 'large-counts' ? rng.bool() : false
    const d = drawConditions(rng, failing, processFramed)

    const result = onePropInterval({ x: d.x, n: d.n, confidence: 0.95, random: d.random, populationSize: d.populationSize })
    const [random, tenPct, counts] = result.conditions
    const phat = result.estimate

    const cands: Candidate[] = [
      {
        text: `**All three conditions are met.** The ${m.unit} were selected in a way that justifies inference, ${d.populationSize === undefined ? `the corridor is an ongoing process that could produce far more than $10n = ${fmtInt(10 * d.n)}$ ${m.unit}` : `$10n = ${fmtInt(10 * d.n)}$ is below the register of ${fmtInt(d.populationSize)}`}, and there are ${fmtInt(d.x)} successes and ${fmtInt(d.n - d.x)} failures — both at least 10.`,
        correct: failing === 'none',
        why:
          failing === 'none'
            ? null
            : failing === 'random'
              ? `One of them is not met, and it is the one no arithmetic can repair. Look again at how the office decided which ${m.unit} ended up in the count.`
              : failing === 'ten-percent'
                ? `Two of them are met. Compare $10n$ with the size of the register the sample came out of before you sign this.`
                : `Two of them are met. Count the successes: ${fmtInt(d.x)}.`,
      },
      {
        text: `**Random fails.** The ${m.unit} were not selected by a chance device, so nothing here justifies treating them as a random sample of ${c.lane}, and the other two conditions cannot rescue that.`,
        correct: failing === 'random',
        why: failing === 'random' ? null : `The selection here was ${d.random ? 'a chance draw, or a stated census of a process — either justifies the inference' : 'not random'}. Random is not the condition that fails in this description.`,
      },
      {
        text:
          d.populationSize === undefined
            ? `**The 10% condition fails.** $n = ${fmtInt(d.n)}$ is a whole quarter's traffic rather than a tenth of anything, so the draws are not close enough to independent.`
            : `**The 10% condition fails.** $n = ${fmtInt(d.n)}$ is more than a tenth of the ${fmtInt(d.populationSize)} ${m.unit} it was drawn from, so the draws are not close enough to independent.`,
        correct: failing === 'ten-percent',
        why:
          failing === 'ten-percent'
            ? null
            : d.populationSize === undefined
              ? `There is no fixed bin here to take a tenth of. The ${m.unit} come from a process that could produce far more than $10n = ${fmtInt(10 * d.n)}$ of them, which is exactly what the condition asks.`
              : `$10n = ${fmtInt(10 * d.n)}$ against a register of ${fmtInt(d.populationSize)} — the condition holds comfortably.`,
      },
      {
        text: `**Large Counts fails.** With ${fmtInt(d.x)} successes and ${fmtInt(d.n - d.x)} failures, not both counts reach 10, so the sampling distribution of $\\hat{p}$ is not close enough to Normal for $\\hat{p} \\pm z^\\star SE$ to carry the level it claims.`,
        correct: failing === 'large-counts',
        why: failing === 'large-counts' ? null : `Successes ${fmtInt(d.x)} and failures ${fmtInt(d.n - d.x)} are both at least 10, so this condition is met.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${selectionSentence(failing, c, m, d, processFramed)}\n\nThe office intends to report a 95% confidence interval for the **${m.parameter}**. Which statement about the conditions for a one-sample $z$-interval for a proportion is correct?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Three conditions, in order, and each one is a different question. **Random:** who decided which units are in the count — a chance device, or the units themselves? **10%:** is there a fixed pool the sample is eating into, and if so is $10n$ smaller than it? **Large Counts:** are there at least 10 successes *and* at least 10 failures?',
        `Write the three checks out with this description's numbers: $n = ${fmtInt(d.n)}$, successes ${fmtInt(d.x)}, failures ${fmtInt(d.n - d.x)}, $10n = ${fmtInt(10 * d.n)}$${d.populationSize === undefined ? ', and a process rather than a fixed register behind them' : `, register ${fmtInt(d.populationSize)}`}.`,
        'Only one of the four statements matches all three checks. Two of the conditions are arithmetic; the third is about how the units got there, and no sample size repairs it.',
      ],
      solution: `**${options[correct]}**\n\n| condition | check | verdict |\n| --- | --- | --- |\n| Random | ${random.detail} | ${random.met ? 'met' : '**fails**'} |\n| 10% | ${tenPct.detail} | ${tenPct.met ? 'met' : '**fails**'} |\n| Large Counts | ${counts.detail} | ${counts.met ? 'met' : '**fails**'} |\n\n$\\hat{p} = ${fmtInt(d.x)}/${fmtInt(d.n)} = ${fmt(phat, 4)}$.\n\n${
        failing === 'none'
          ? `All three hold, so the interval may be built and the level means what it says.${d.populationSize === undefined ? ' Note how the 10% condition was satisfied: not by comparing the sample with a fixed register, but by stating that the process behind it could produce far more than ten times these units. A census of one quarter of an ongoing operation is still a sample of that process.' : ''}`
          : failing === 'random'
            ? 'Random is the condition that cannot be bought back. The counts are large and the pool is deep, and neither fact says anything about the units the dock board never reached. An interval built on this sample is precise about the wrong population.'
            : failing === 'ten-percent'
              ? `Sampling ${fmtPct(d.n / (d.populationSize ?? 1), 0)} of a fixed register without replacement makes the later draws depend on the earlier ones, and the SE formula $\\sqrt{\\hat p(1-\\hat p)/n}$ overstates the true variability. The condition asks for $n \\le 0.1N$; here $n = ${fmtInt(d.n)}$ and $0.1N = ${fmt(0.1 * (d.populationSize ?? 0), 1)}$.`
              : `With only ${fmtInt(d.x)} successes the sampling distribution of $\\hat{p}$ is still visibly right-skewed, and a symmetric $\\hat p \\pm z^\\star SE$ interval built on it does not capture at the rate its label claims. The repair is more ${m.unit}, not a different formula.`
      }`,
      misconception:
        failing === 'random'
          ? 'Checking the arithmetic conditions, finding them comfortable, and signing the interval. Random is not one condition among three equals — it is the one that decides whether the other two are worth computing.'
          : failing === 'ten-percent'
            ? 'Reading the 10% condition as "n must be large". It is the opposite: n must be small relative to the pool, so that sampling without replacement behaves like sampling with it.'
            : failing === 'large-counts'
              ? 'Checking only that n is big. Large Counts is about the two counts, not the sample size: 3 successes in 200 fails it, and 12 successes in 30 passes.'
              : 'Assuming a census cannot satisfy "random". When the units come from an ongoing process, the condition is a statement about that process, and it has to be stated rather than assumed.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the confidence LEVEL (custom groups; 6-02 owns the interval template)
// ---------------------------------------------------------------------------------------------

/** The data nouns a "C% of the …" sentence wrongly attaches to. "Samples" is deliberately absent. */
const DATA_NOUNS = ['transit', 'transits', 'hull', 'hulls', 'master', 'masters', 'claim', 'claims', 'loss', 'losses', 'data', 'value', 'values', 'observation', 'observations']

export function confidenceLevelRubric({
  level,
  population,
  variable,
  parameter,
  exemplar: exemplarOverride,
}: {
  level: number
  /** "all transits on the Adrastea feeder lane" */
  population: string
  /** "ending in a loss" */
  variable: string
  /** "proportion of transits ending in a loss" */
  parameter: string
  /** A context-specific model answer. It must pass these same groups — the mission beat's is tested. */
  exemplar?: string
}) {
  const pct = level > 1 ? level : level * 100
  const pctStr = fmt(pct, Number.isInteger(pct) ? 0 : 1)
  const num = numberPattern(pct, 0, 1)

  const required: RubricGroup[] = [
    {
      label: 'Describes repeating the sampling many times',
      phrasings: ['longrun', 'repeat', 'many sample', 'many interval', 'each sample', 'again and again', 'every sample'],
      polarity: 'any',
      feedback: 'The level describes what happens over many repetitions: "if we drew many samples the same way and built an interval from each…".',
    },
    {
      label: `States that ${pctStr}% of those intervals capture the parameter`,
      phrasings: [
        new RegExp(`${num}\\s*percent of (?:\\w+\\s+){0,3}intervals?\\b`),
        new RegExp(`${num}\\s*(?:out )?of (?:every |each )?(?:100|hundred)\\b`),
        'interval capture',
        'interval would capture',
      ],
      polarity: 'any',
      feedback: `Say what the ${pctStr}% counts: the share of the intervals produced by this method that contain the parameter.`,
    },
    {
      label: 'Refers to the true / population value, not the sample',
      phrasings: ['true', 'population', 'parameter', 'actual'],
      polarity: 'any',
      feedback: 'Name what is being captured: the TRUE (population) value, which is fixed and unknown.',
    },
    contextGroup('States the context (population and what was measured)', [population, variable], {
      feedback: `Say what and whom: the ${parameter} for ${population}.`,
    }),
  ]

  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: 'probability',
      label: 'A probability statement about this interval',
      why: 'The parameter is fixed and this interval either contains it or it does not — there is no probability left in it. Confidence is the long-run capture rate of the method that built it.',
    },
    {
      phrase: /\bpercent (?:likely|sure|certain|probable)\b/,
      label: 'A probability statement about this interval',
      why: 'Say "confident", not "likely" or "sure". The level is a property of the procedure, not of the one interval it produced.',
    },
    {
      phrase: new RegExp(`${num}\\s*percent of (?:the |all |these |those |its |our )?(?:${DATA_NOUNS.join('|')})\\b`),
      label: `${pctStr}% of the individual units`,
      why: `The level is not the share of ${variable ? 'units' : 'data'} that do anything. It is the share of INTERVALS, over many repetitions of the sampling, that contain the parameter.`,
    },
    { phrase: 'prove', label: 'Claims proof', why: 'An interval never proves a value; it reports a range the data are consistent with, by a method with a known capture rate.' },
  ]

  const exemplar =
    exemplarOverride ??
    `If the same office drew many random samples the same way and built a ${pctStr}% confidence interval from each one, about ${pctStr}% of those intervals would contain the true ${parameter} for ${population}.`
  return { type: 'interpretation' as const, required, forbidden, exemplar, minWords: 18 }
}

export const interpretConfidenceLevel = defineGenerator({
  id: 'act-6/interpret-confidence-level',
  label: 'Interpret the confidence level',
  ap_topics: ['6.1'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, [0.9, 0.95, 0.98, 0.99] as const)
    const d = retry(
      rng,
      (r) => {
        const n = r.int(160, 620)
        const x = r.binomial(n, r.uniform(0.1, 0.4))
        return { n, x }
      },
      ({ n, x }) => x >= 15 && n - x >= 15 && !reservedCount(n) && !reservedCount(x) && !reservedProp(x / n),
    )
    const population = `all ${m.unit} on ${c.lane}`
    const answer = confidenceLevelRubric({ level, population, variable: m.event, parameter: m.parameter })
    const pct = fmtPct(level, 0)

    return {
      prompt: `${c.office} drew **${fmtInt(d.n)}** ${m.unit} at random from ${c.lane}'s traffic in ${c.quarter}, found **${fmtInt(d.x)}** ${m.event}, and reported a **${pct} confidence interval** for the ${m.parameter}.\n\nThe bulletin has to explain what the **${pct}** means. Do not interpret the interval and do not quote its endpoints — interpret the **level**. Two or three sentences, in context.`,
      answer,
      hints: [
        'The level is not about the interval in front of you. That interval either contains the true value or it does not, and nothing you can compute will tell you which. The level describes the *method*: imagine running the whole procedure again and again.',
        `Build the sentence in three parts: (a) many random samples of ${fmtInt(d.n)} ${m.unit}, drawn the same way; (b) a ${pct} interval built from each one; (c) ${pct} of *those intervals* contain the true ${m.parameter} for ${population}.`,
        'Then read it back and delete any word that assigns a probability to the interval you actually have — "probability", "chance", "likely", "sure". If one of them survives, the sentence is about the wrong object.',
      ],
      solution: `**${answer.exemplar}**\n\nThree things the sentence has to do, and one it must not.\n\n1. **Repeat the sampling.** The level is a frequency over repetitions, so the sentence has to describe repetitions: many samples of ${fmtInt(d.n)} ${m.unit}, drawn the same way, from the same process.\n2. **Count intervals, not ${m.unit}.** ${pct} is the share of *intervals* that capture — not the share of ${m.unit} that did anything, and not the share of future sample proportions that land inside this one.\n3. **Capture the true value.** What the intervals are trying to contain is the true ${m.parameter} for ${population}: one fixed number that nobody in this story knows.\n\nAnd the thing it must not do: attach a probability to the interval on the screen. The parameter is fixed and the interval is already built. Over ${fmtInt(100)} repetitions of this procedure about ${fmt(100 * level, 0)} of the intervals produced would contain it; this one is not a repetition, it is a result.`,
      misconception: `Writing "there is a ${pct} probability that the true ${m.parameter} lies in this interval". Once the sample is drawn there is no probability left: the parameter is fixed and the interval is fixed, and one of them is either inside the other or it is not. The ${pct} belongs to the procedure.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — expected captures out of N simulated intervals
// ---------------------------------------------------------------------------------------------

const RUN_SIZES = [100, 200, 300, 400, 500] as const

export const captureCount = defineGenerator({
  id: 'act-6/capture-count',
  label: 'How many of the simulated intervals should capture',
  ap_topics: ['6.1'],
  skills: ['3'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, [0.8, 0.9, 0.95, 0.98, 0.99] as const)
    const runs = pickContext(rng, RUN_SIZES)
    const askMisses = rng.bool()

    const d = retry(
      rng,
      (r) => {
        const n = r.int(180, 560)
        const p = Math.round(r.uniform(0.1, 0.42) * 1000) / 1000
        return { n, p }
      },
      ({ n, p }) => n * p >= 18 && n * (1 - p) >= 18 && !reservedCount(n) && !reservedProp(p),
    )

    const captured = simulate('ci-capture', { kind: 'proportion', n: d.n, confidence: level, p: d.p }, seedFrom('act-6/capture-count', rng.seed, d.n, runs), runs).reduce((s, v) => s + v, 0)
    const observedMisses = runs - captured

    const expectedCaptures = Math.round(runs * level)
    const expectedMisses = runs - expectedCaptures
    const value = askMisses ? expectedMisses : expectedCaptures
    const what = askMisses ? 'fail to capture' : 'capture'

    return {
      prompt: `On the capture panel, ${c.office} sets the true ${m.parameter} on ${c.lane} to **${fmt(d.p, 3)}**, the season size to **${fmtInt(d.n)}** ${m.unit} and the confidence level to **${fmtPct(level, 0)}**, then simulates **${fmtInt(runs)}** seasons and builds one interval from each.\n\nThe run just finished reports **${fmtInt(captured)}** of the ${fmtInt(runs)} intervals covering the true value.\n\nIn the long run, how many of ${fmtInt(runs)} such intervals would you **expect** to ${what}? Give a whole number.`,
      answer: numericAnswer(value, 'count'),
      hints: [
        'The confidence level is the long-run share of intervals that capture. Turn a share into a count the way you always do: multiply it by how many intervals there are.',
        `${fmtPct(level, 0)} of ${fmtInt(runs)} intervals capture, so the rest do not. You are asked for the ${askMisses ? 'second' : 'first'} of those two counts.`,
        `$${fmtInt(runs)} \\times ${askMisses ? fmt(1 - level, 2) : fmt(level, 2)}$.`,
      ],
      solution: `$$\\text{expected ${what}} = ${fmtInt(runs)} \\times ${askMisses ? fmt(1 - level, 2) : fmt(level, 2)} = ${fmtInt(value)}$$\n\n**${fmtInt(value)} intervals.**\n\nThe run in front of you produced ${fmtInt(captured)} captures and ${fmtInt(observedMisses)} misses, which is not the same number and does not have to be. The level is what the *method* does over the long run; a batch of ${fmtInt(runs)} is itself a sample, and it wobbles. Run the panel again with a new seed and the count moves; run five thousand seasons instead of ${fmtInt(runs)} and it stops moving.\n\nNote what the question is not asking. It is not asking which of the ${fmtInt(runs)} intervals missed — you can only see that here because the panel was told the true value. On the Lane nobody is told.`,
      misconception: `Answering ${fmtInt(askMisses ? observedMisses : captured)} — the count this particular run produced. That is an observed value of a random quantity whose long-run mean is ${fmtInt(value)}; the question asks for the expectation, not the realisation.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — z* from the inverse CDF
// ---------------------------------------------------------------------------------------------

export const criticalValue = defineGenerator({
  id: 'act-6/critical-value',
  label: 'Critical value z* for a confidence level',
  ap_topics: ['6.2'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, LEVELS)
    const z = zStar(level)
    const tail = (1 - level) / 2
    const cumulative = (1 + level) / 2
    const standard = level === 0.9 || level === 0.95 || level === 0.99

    return {
      prompt: `${c.office} is writing a **${fmtPct(level, 0)}** confidence interval for the ${m.parameter} on ${c.lane}${standard ? '' : ` — a level its own standing orders require and no printed table carries a row for`}.\n\nWhat critical value $z^\\star$ does that interval use? Give it to **three decimal places**.`,
      answer: numericAnswer(z, 'other', { digits: 3 }),
      hints: [
        'A $C$ interval puts $C$ of the standard normal area in the middle, which leaves the rest split equally between the two tails. Draw it and label all three areas before you look anything up.',
        `Here the middle holds ${fmt(level, 4)}, so each tail holds $(1 - ${fmt(level, 4)})/2 = ${fmt(tail, 4)}$, and the area *below* $z^\\star$ is $${fmt(level, 4)} + ${fmt(tail, 4)} = ${fmt(cumulative, 4)}$.`,
        `Run the normal CDF backwards: $z^\\star$ is the value with cumulative area ${fmt(cumulative, 4)} below it — invNorm(${fmt(cumulative, 4)}), to three decimals.`,
      ],
      solution: `Each tail carries $(1 - C)/2 = (1 - ${fmt(level, 4)})/2 = ${fmt(tail, 4)}$, so the area below the upper cutoff is\n\n$$\\Phi(z^\\star) = \\frac{1 + C}{2} = \\frac{1 + ${fmt(level, 4)}}{2} = ${fmt(cumulative, 4)}$$\n\nand inverting the CDF at that area gives\n\n$$z^\\star = \\Phi^{-1}(${fmt(cumulative, 4)}) = \\mathbf{${fmt(z, 3)}}$$\n\nThe commonest error is to invert at $C$ itself rather than at $(1 + C)/2$, which returns ${fmt(zStar(2 * level - 1 > 0 ? 2 * level - 1 : 0.5), 3)} — the cutoff for a one-sided area, not the half-width of a two-sided interval. ${standard ? 'This is one of the three levels a table carries; the other levels an office may ask for are exactly why the inverse exists.' : 'No table has a row for this level, and it does not need one: the critical value is the inverse of a function, not an entry in a book.'}`,
      misconception: `Inverting the CDF at $C$ instead of $(1 + C)/2$ — that is the cutoff with ${fmtPct(level, 0)} *below* it, which leaves ${fmtPct(1 - level, 0)} in one tail and nothing in the other.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what C and n do to the width
// ---------------------------------------------------------------------------------------------

export const confidenceWidth = defineGenerator({
  id: 'act-6/confidence-width',
  label: 'What raising C, or raising n, does to the interval',
  ap_topics: ['6.2'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const raise = pickContext(rng, ['level', 'size'] as const)

    const d = retry(
      rng,
      (r) => {
        const n = 10 * r.int(18, 55)
        const x = r.binomial(n, r.uniform(0.12, 0.4))
        return { n, x }
      },
      // 4n is printed in the sample-size variant, so it must not land on one of the Act's own counts.
      ({ n, x }) => x >= 14 && n - x >= 14 && !reservedCount(n) && !reservedCount(4 * n) && !reservedCount(x) && !reservedProp(x / n),
    )
    const phat = d.x / d.n
    const c1 = 0.9
    const c2 = 0.99
    const n2 = 4 * d.n

    const m1 = marginOfErrorProportion(phat, d.n, c1)
    const mLevel = marginOfErrorProportion(phat, d.n, c2)
    const mSize = marginOfErrorProportion(phat, n2, c1)

    const cands: Candidate[] =
      raise === 'level'
        ? [
            {
              text: `The interval gets **wider and less precise**: the margin grows from ${fmt(m1, 4)} to ${fmt(mLevel, 4)}, a factor of $z^\\star_{99}/z^\\star_{90} = ${fmt(zStar(c2) / zStar(c1), 3)}$, because only the critical value changed.`,
              correct: true,
              why: null,
            },
            {
              text: `The interval gets **narrower and more precise**, because a higher confidence level means the office is more certain about where the parameter is.`,
              correct: false,
              why: `Backwards on both halves. More confidence is bought by covering more ground, not less: the margin goes from ${fmt(m1, 4)} to ${fmt(mLevel, 4)}. A 100% interval is the whole of $[0, 1]$ — perfectly confident and perfectly useless.`,
            },
            {
              text: `The interval gets **wider, and it is therefore more precise**, because a wider interval is more likely to be right about the parameter.`,
              correct: false,
              why: `The width is right and the word is wrong. A wider interval does capture more often — that is the trade — but *precision* is exactly the opposite of width. You have gained confidence and lost precision, and the report has to say which one it wanted.`,
            },
            {
              text: `Nothing measurable changes: $z^\\star$ moves but the standard error $\\sqrt{\\hat p(1-\\hat p)/n} = ${fmt(Math.sqrt((phat * (1 - phat)) / d.n), 5)}$ is what sets the width, and the sample has not changed.`,
              correct: false,
              why: `The SE is unchanged — ${fmt(Math.sqrt((phat * (1 - phat)) / d.n), 5)} both times — but the margin is $z^\\star \\times SE$, and $z^\\star$ went from ${fmt(zStar(c1), 3)} to ${fmt(zStar(c2), 3)}. The margin moves with it: ${fmt(m1, 4)} to ${fmt(mLevel, 4)}.`,
            },
          ]
        : [
            {
              text: `The margin falls from ${fmt(m1, 4)} to ${fmt(mSize, 4)} — a factor of $\\sqrt{4} = 2$ — and the confidence level is unchanged at ${fmtPct(c1, 0)}, because $n$ enters the margin under a square root and nowhere else.`,
              correct: true,
              why: null,
            },
            {
              text: `The margin falls from ${fmt(m1, 4)} to ${fmt(m1 / 4, 4)}, a factor of 4, and the level is unchanged.`,
              correct: false,
              why: `The level half is right. But $SE = \\sqrt{\\hat p(1-\\hat p)/n}$ has $n$ *under the root*, so four times the sample halves the margin rather than quartering it: ${fmt(m1, 4)} to ${fmt(mSize, 4)}.`,
            },
            {
              text: `The margin falls to ${fmt(mSize, 4)} **and the confidence level rises**, because a larger sample makes the office more confident in its answer.`,
              correct: false,
              why: `The arithmetic is right and the conclusion is not. The level is chosen by whoever writes the report, before any data arrives; $n$ has no say in it. A bigger sample buys a *narrower interval at the same level*, which is a different and better thing than more confidence.`,
            },
            {
              text: `Nothing changes unless the sample proportion changes, since the margin is set by $\\hat p = ${fmt(phat, 4)}$.`,
              correct: false,
              why: `$\\hat p$ is in the margin, but so is $n$: $z^\\star\\sqrt{\\hat p(1 - \\hat p)/n}$. Hold $\\hat p$ at ${fmt(phat, 4)} and multiply $n$ by four and the margin still halves, ${fmt(m1, 4)} to ${fmt(mSize, 4)}.`,
            },
          ]

    const { options, correct, feedback } = shuffleChoice(rng, cands)
    const setup = `${c.office} has **${fmtInt(d.x)}** of **${fmtInt(d.n)}** ${m.unit} ${m.event} on ${c.lane}, so $\\hat p = ${fmt(phat, 4)}$, and has written a ${fmtPct(c1, 0)} confidence interval for the ${m.parameter}.`

    return {
      prompt:
        raise === 'level'
          ? `${setup}\n\nThe Authority asks for the same interval at **${fmtPct(c2, 0)}** instead, from the same ${fmtInt(d.n)} ${m.unit}. What happens?`
          : `${setup}\n\nThe office repeats the count next season with **four times** as many ${m.unit} — $n = ${fmtInt(n2)}$ — and gets the same $\\hat p$. It keeps the level at ${fmtPct(c1, 0)}. What happens?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'One formula answers the whole question: margin $= z^\\star \\sqrt{\\hat p(1 - \\hat p)/n}$. Find which symbol the change touches, and check whether it touches any other.',
        raise === 'level'
          ? `$z^\\star$ goes from ${fmt(zStar(c1), 3)} to ${fmt(zStar(c2), 3)}; the SE does not move. Then ask the separate question: is a wider interval more precise or less?`
          : `$n$ goes from ${fmtInt(d.n)} to ${fmtInt(n2)} and sits under a square root. Then ask the separate question: did anything in the formula change the level?`,
      ],
      solution: `**${options[correct]}**\n\n$$\\text{margin} = z^\\star\\sqrt{\\frac{\\hat p(1 - \\hat p)}{n}} = ${fmt(zStar(c1), 3)}\\sqrt{\\frac{${fmt(phat, 4)} \\times ${fmt(1 - phat, 4)}}{${fmtInt(d.n)}}} = ${fmt(m1, 4)}$$\n\n${
        raise === 'level'
          ? `$$\\longrightarrow\\quad ${fmt(zStar(c2), 3)}\\sqrt{\\frac{${fmt(phat, 4)} \\times ${fmt(1 - phat, 4)}}{${fmtInt(d.n)}}} = ${fmt(mLevel, 4)}$$\n\nThe ratio is $${fmt(mLevel, 4)}/${fmt(m1, 4)} = ${fmt(mLevel / m1, 3)}$, which is exactly $z^\\star_{99}/z^\\star_{90}$. Confidence and precision are traded against each other at a fixed $n$: you may have a narrow interval you are often wrong about, or a wide one you are rarely wrong about, and the only way to have both is more ${m.unit}.`
          : `$$\\longrightarrow\\quad ${fmt(zStar(c1), 3)}\\sqrt{\\frac{${fmt(phat, 4)} \\times ${fmt(1 - phat, 4)}}{${fmtInt(n2)}}} = ${fmt(mSize, 4)}$$\n\nThe ratio is $${fmt(m1, 4)}/${fmt(mSize, 4)} = ${fmt(m1 / mSize, 2)}$ — exactly $\\sqrt{4}$, because $n$ sits under the root. And ${fmtPct(c1, 0)} is still ${fmtPct(c1, 0)}: the level was chosen before the data and the data cannot change it.`
      }`,
      misconception:
        raise === 'level'
          ? 'Reading "wider" as "better". A wider interval captures more often and says less; precision is the opposite of width, and a report has to be explicit about which of the two it is buying.'
          : 'Believing a larger sample raises the confidence level. It does not touch the level — it narrows the interval at whatever level was chosen.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — four sentences about one interval
// ---------------------------------------------------------------------------------------------

export const whatTheLevelIsNot = defineGenerator({
  id: 'act-6/what-the-level-is-not',
  label: 'Which sentence about this interval is defensible',
  ap_topics: ['6.1', '6.2'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const m = pickContext(rng, MEASURES)
    const level = pickContext(rng, [0.9, 0.95, 0.99] as const)

    const d = retry(
      rng,
      (r) => {
        const n = r.int(200, 700)
        const x = r.binomial(n, r.uniform(0.1, 0.38))
        return { n, x }
      },
      ({ n, x }) => x >= 18 && n - x >= 18 && !reservedCount(n) && !reservedCount(x) && !reservedProp(x / n),
    )
    const result = onePropInterval({ x: d.x, n: d.n, confidence: level, random: true })
    const [lo, hi] = result.ci as [number, number]
    const pct = fmtPct(level, 0)
    const population = `all ${m.unit} on ${c.lane}`

    const cands: Candidate[] = [
      {
        text: `We are ${pct} confident that the true ${m.parameter} for ${population} is between ${fmt(lo, 4)} and ${fmt(hi, 4)}.`,
        correct: true,
        why: null,
      },
      {
        text: `There is a ${pct} probability that the true ${m.parameter} for ${population} lies between ${fmt(lo, 4)} and ${fmt(hi, 4)}.`,
        correct: false,
        why: `The parameter is a fixed number and this interval is already built, so it either contains that number or it does not — there is no probability left to state. The ${pct} belongs to the method, over many repetitions, not to this pair of endpoints.`,
      },
      {
        text: `${pct} of the ${fmtInt(d.n)} ${m.unit} in the sample fall between ${fmt(lo, 4)} and ${fmt(hi, 4)}.`,
        correct: false,
        why: `The interval is not a range of ${m.unit}; it is a range of plausible values for a single proportion. A ${m.unit.replace(/s$/, '')} either showed ${m.occurrence} or it did not — ${fmtInt(d.x)} of the ${fmtInt(d.n)} did — and none of them has a value that could sit "between ${fmt(lo, 4)} and ${fmt(hi, 4)}".`,
      },
      {
        text: `If the office repeated the count, ${pct} of its future sample proportions would fall between ${fmt(lo, 4)} and ${fmt(hi, 4)}.`,
        correct: false,
        why: `A different and also wrong claim: it is about the distribution of future $\\hat p$'s rather than about the parameter. The interval is centred on the $\\hat p$ we happened to get, and if that one sat off to one side, future $\\hat p$'s cluster around the parameter rather than around it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office} sampled **${fmtInt(d.n)}** ${m.unit} at random on ${c.lane} in ${c.quarter} and found **${fmtInt(d.x)}** ${m.event}. Its ${pct} confidence interval for the ${m.parameter} runs from **${fmt(lo, 4)}** to **${fmt(hi, 4)}**.\n\nFour sentences have been drafted for the bulletin. Exactly one of them is defensible. Which?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask of each sentence: *what is the thing that the percentage is a percentage of?* An interval interpretation is about one unknown parameter, and the percentage is about the method that produced the range.',
        'Three of the four are the three standard failures: a probability attached to an interval that is already built; a statement about the individual units; and a statement about where future sample statistics will land.',
      ],
      solution: `**${options[correct]}**\n\nThe sample gives $\\hat p = ${fmtInt(d.x)}/${fmtInt(d.n)} = ${fmt(result.estimate, 4)}$, and\n\n$$\\hat p \\pm z^\\star\\sqrt{\\frac{\\hat p(1 - \\hat p)}{n}} = ${fmt(result.estimate, 4)} \\pm ${fmt(result.criticalValue ?? 0, 3)} \\times ${fmt(result.se, 5)} = ${fmt(result.estimate, 4)} \\pm ${fmt(result.marginOfError ?? 0, 4)}$$\n\nso the interval is $(${fmt(lo, 4)},\\ ${fmt(hi, 4)})$.\n\nThe defensible sentence names four things and no more: the level, the word *confident*, the **true** parameter with its context, and the two endpoints. Everything the other three add — a probability, a share of the ${m.unit}, a forecast about future $\\hat p$'s — is a claim the procedure was never built to support.`,
      misconception: `"There is a ${pct} probability that the parameter is in this interval." It is the sentence everybody writes first, and it is the one a hostile reader quotes back. The parameter does not move; the interval does, from sample to sample, and ${pct} of those intervals contain it.`,
    }
  },
})
