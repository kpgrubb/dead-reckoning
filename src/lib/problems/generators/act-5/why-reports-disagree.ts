/**
 * act-5-01 · Why the Reports Disagree — drills. AP 5.1 and 5.4: parameter against statistic; the
 * sampling distribution as the distribution of a statistic over all samples of size n; bias against
 * variability of an estimator; and the fact that n moves one of those two and never the other.
 *
 *   act-5/parameter-or-statistic   choice   which group does the number describe — and name both
 *   act-5/what-one-dot-is          choice   one point on a stack of patrols is ONE patrol's statistic
 *   act-5/biased-or-unbiased       display  a simulated stack against the truth: biased, and which way
 *   act-5/effect-of-n              numeric  the SD of the statistic at n and at k·n; the centre does not move
 *   act-5/bias-versus-variability  choice   a described change: bias, variability, both or neither
 *   act-5/why-two-patrols-differ   interp   why two honest cutters report different Lane loss rates
 *
 * Act V builds null models; Act VI runs the tests. Nothing here computes a two-proportion z, a
 * P-value for the Lane's observed gap, or a conclusion about the accusation.
 *
 * The Ledger's own headline figures (19/900, 12/1,712, Asgard's 3 in 410, Tindr's 1 in 380) belong to
 * the module text and the mission beats. Every draw here is another season, another patrol window.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { mean, range, sd, samplingSdMean, samplingSdProportion } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { CUTTERS, LEDGER_N, honestDelays, patrolTruth } from '@/instruments/act-5/data'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

/** The Lane's true six-year loss rate over the Ledger — the parameter every patrol is estimating. */
const LANE_RATE = patrolTruth('rate')
/** The full spread of honest Mark-9 delay across the Ledger — the parameter the range estimates. */
const LANE_DELAY_RANGE = range(honestDelays)

interface Patrol {
  /** Cutter as the Transit Ledger prints her. */
  cutter: string
  /** Possessive pronoun the Service uses for her in the log. */
  her: string
}

const PATROLS: readonly Patrol[] = [
  { cutter: CUTTERS.asgard.name, her: 'her' },
  { cutter: CUTTERS.tindr.name, her: 'her' },
] as const

/** Seasons the Ledger covers, so a drawn patrol is a real window and not the MET 0 snapshot. */
const SEASONS: readonly number[] = [2178, 2179, 2180, 2181, 2182, 2183, 2184] as const

/** Counts and sizes reserved for the Act's own arithmetic — a drill may never reproduce them. */
const RESERVED_COUNTS = new Set([19, 31, 380, 410, 900, 881, 1712, 2580, 2612, 4180])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

/** One patrol's observed loss rate: n independent transits off the Lane at rate p. */
function patrolRate(r: Rng, n: number, p: number): number {
  return r.binomial(n, p) / n
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — parameter or statistic, and name both groups
// ---------------------------------------------------------------------------------------------

interface Quantity {
  kind: 'parameter' | 'statistic'
  /** The quantity as the Ledger or the log would describe it. */
  text: (n: number, cutter: string) => string
  /** The group the number is meant to describe. */
  population: string
  /** The group it was actually computed from (statistics only). */
  sample: (n: number, cutter: string) => string
}

const QUANTITIES: readonly Quantity[] = [
  {
    kind: 'parameter',
    text: () => `the loss rate over **all ${fmtInt(LEDGER_N)} transits** in the Lane Authority's Transit Ledger`,
    population: `the ${fmtInt(LEDGER_N)} Lane transits in the Ledger`,
    sample: () => 'no sample at all — every row was used',
  },
  {
    kind: 'parameter',
    text: () => `the mean Mark 9 delay of **every transit** in the Transit Ledger`,
    population: `the ${fmtInt(LEDGER_N)} Lane transits in the Ledger`,
    sample: () => 'no sample at all — every row was used',
  },
  {
    kind: 'parameter',
    text: () => `the proportion of the Ledger's losses that happened **beyond mark 6**, counted over every loss the Ledger records`,
    population: 'all the losses recorded in the Ledger',
    sample: () => 'no sample at all — every loss was used',
  },
  {
    kind: 'statistic',
    text: (n, cutter) => `the loss rate **${cutter}** recorded in the ${fmtInt(n)} transits she observed on patrol`,
    population: `the ${fmtInt(LEDGER_N)} Lane transits in the Ledger`,
    sample: (n, cutter) => `the ${fmtInt(n)} transits ${cutter} observed`,
  },
  {
    kind: 'statistic',
    text: (n) => `the mean Mark 9 delay of the ${fmtInt(n)} transits in **one patrol window** drawn at random from the Ledger`,
    population: `the ${fmtInt(LEDGER_N)} Lane transits in the Ledger`,
    sample: (n) => `the ${fmtInt(n)} transits in that one patrol window`,
  },
  {
    kind: 'statistic',
    text: (n, cutter) => `the largest Mark 9 delay among the ${fmtInt(n)} transits **${cutter}** pulled from the Ledger for audit`,
    population: `the ${fmtInt(LEDGER_N)} Lane transits in the Ledger`,
    sample: (n, cutter) => `the ${fmtInt(n)} transits ${cutter} pulled for audit`,
  },
] as const

export const parameterOrStatistic = defineGenerator({
  id: 'act-5/parameter-or-statistic',
  label: 'Parameter or statistic — and of what?',
  ap_topics: ['5.1'],
  skills: ['1', '4'],
  generate(rng) {
    const q = pickContext(rng, QUANTITIES)
    const patrol = pickContext(rng, PATROLS)
    const season = pickContext(rng, SEASONS)
    const n = retry(rng, (r) => 10 * r.int(22, 56), (v) => !reservedCount(v))
    const sample = q.sample(n, patrol.cutter)
    const cands: Candidate[] =
      q.kind === 'statistic'
        ? [
            {
              text: `**A statistic.** It was computed from ${sample} — a sample. The population it is meant to describe is ${q.population}.`,
              correct: true,
              why: null,
            },
            {
              text: `**A parameter.** It is a number the Service can actually compute and write in a log, and numbers you can compute are parameters.`,
              correct: false,
              why: `Whether you can compute it has nothing to do with it. What decides the label is *which group* the number describes: the whole population (parameter) or a sample drawn from it (statistic). This one describes ${sample}.`,
            },
            {
              text: `**A statistic**, computed from ${q.population} and used to estimate ${sample}.`,
              correct: false,
              why: `The two groups are the right way round in reverse. The number came *from* ${sample}; the group it estimates is the larger one, ${q.population}.`,
            },
            {
              text: `**A parameter**, because ${sample} is the only group anyone measured, so that group is the population here.`,
              correct: false,
              why: `Calling the sample "the population" makes every statistic a parameter by definition and throws away the only question worth asking — how far this number might sit from ${q.population}.`,
            },
          ]
        : [
            {
              text: `**A parameter.** It describes ${q.population} — the entire group, every row of it. No sampling happened, so there is nothing for it to be an estimate *of*.`,
              correct: true,
              why: null,
            },
            {
              text: `**A statistic**, because it was computed from data, and any number computed from data is a statistic.`,
              correct: false,
              why: `Parameters are computed from data too — when the data are the whole population. Here the Ledger's ${fmtInt(LEDGER_N)} rows *are* the group in question, so the number is the truth about that group, not an estimate of it.`,
            },
            {
              text: `**A statistic**, because ${patrol.cutter}'s ${fmtInt(n)}-transit patrol in ${season} is the sample that produced it.`,
              correct: false,
              why: `No patrol is involved. The quantity is defined over ${q.population}; ${patrol.cutter}'s ${fmtInt(n)} transits are a different number entirely, and *that* one would be a statistic.`,
            },
            {
              text: `**A parameter**, but of ${patrol.cutter}'s ${fmtInt(n)}-transit patrol window rather than of the Ledger.`,
              correct: false,
              why: `The verdict is right and the group is wrong. Read the quantity again: it is defined over ${q.population}, not over any patrol window.`,
            },
          ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `The Lane Authority's **Transit Ledger** records all ${fmtInt(LEDGER_N)} transits of the Hundred-Day Lane over the six years to MET 0. For this question the Lane's six-year record *is* those ${fmtInt(LEDGER_N)} transits — that is the group the Board is arguing about.\n\nEbele reads out a figure from the ${season} file:\n\n> ${q.text(n, patrol.cutter)}\n\nIs that number a **parameter** or a **statistic** — and which group is the population and which the sample?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ignore who computed it and how hard it was to get. Ask one question only: does this number describe the *whole group the argument is about*, or a smaller group drawn out of it?',
        `The group the argument is about is ${q.population}. Now ask whether the figure was computed over all of that group, or over something smaller pulled out of it.`,
        q.kind === 'statistic'
          ? `It came from ${sample}. Name that group, and name the larger one it is standing in for.`
          : `Nothing was drawn. The figure runs over every row of ${q.population}.`,
      ],
      solution: `${options[correct]}\n\nThe vocabulary is fixed by the group, not by the arithmetic:\n\n- a **parameter** is a number about a *population* — here, ${q.population};\n- a **statistic** is the same kind of number computed from a *sample* drawn from that population.\n\n${q.kind === 'statistic' ? `This one was computed from ${sample}, so it is a statistic, and it is an estimate of the corresponding parameter for ${q.population}. Another ${fmtInt(n)} transits would give a different number — which is exactly why *Asgard* and *Tindr* disagree without either of them lying.` : `This one runs over all of ${q.population}, so it is a parameter. It has no sampling variability at all: recompute it tomorrow from the same Ledger and you get the same number to the last decimal. That is the fixed target every patrol statistic is aimed at.`}`,
      misconception: 'Deciding by how the number was obtained rather than by whom it describes. A number computed from every row of the population is a parameter, however much arithmetic it took; a number computed from a sample is a statistic, however simple it looks.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — what is ONE point on the stack?
// ---------------------------------------------------------------------------------------------

export const whatOneDotIs = defineGenerator({
  id: 'act-5/what-one-dot-is',
  label: 'What is one point on the stack?',
  ap_topics: ['5.1'],
  skills: ['3', '4'],
  generate(rng) {
    const reps = 50 * rng.int(3, 6)
    const n = retry(rng, (r) => 50 * r.int(5, 9), (v) => !reservedCount(v))
    const stack = retry(
      rng,
      (r) => Array.from({ length: reps }, () => patrolRate(r, n, LANE_RATE)),
      (xs) => sd(xs) > 0 && new Set(xs).size >= 4,
    )
    const spread = sd(stack)
    const cands: Candidate[] = [
      {
        text: `**One patrol's observed loss rate** — the statistic worked out from a single sample of ${fmtInt(n)} transits. The stack has ${fmtInt(reps)} points because the Ledger was sampled ${fmtInt(reps)} times.`,
        correct: true,
        why: null,
      },
      {
        text: `**One transit** — whether that hull was lost or arrived, plotted for each of the transits drawn.`,
        correct: false,
        why: `Then the stack would have ${fmtInt(reps * n)} points and only two possible values, 0 and 1. Every point here is an *average over ${fmtInt(n)} transits*, which is why the stack has a shape at all.`,
      },
      {
        text: `**The Lane's true loss rate**, plotted once for each of the ${fmtInt(reps)} patrols so that its variability can be seen.`,
        correct: false,
        why: `The Lane's true rate is a single fixed number — ${fmt(LANE_RATE, 4)} over the Ledger — and it does not vary at all. What varies from patrol to patrol is the *estimate* of it, and that is what is stacked here.`,
      },
      {
        text: `**The ${fmtInt(n)} transits of one patrol**, shown as the distribution of the sample so their spread can be compared with the Lane's.`,
        correct: false,
        why: `That is the *distribution of the sample* — a different display, made of raw transits from one draw. A **sampling distribution** is made of statistics, one per sample. Each point here has already swallowed ${fmtInt(n)} transits.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `Ebele builds a sampling machine on the Transit Ledger. He draws a patrol window of **${fmtInt(n)} transits** at random, counts the losses in it, records the patrol's loss rate, and repeats — **${fmtInt(reps)} times over**. The display below is the result.\n\nHe calls it "the distribution of the sample". You make him say what **one point** on it is.`,
      data: { kind: 'histogram', values: stack, binWidth: spread / 2, label: `loss rate of one ${fmtInt(n)}-transit patrol, over ${fmtInt(reps)} patrols` },
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Count the points and count the transits. If the display has fewer points than the machine drew transits, each point must be summarising more than one transit. Ask how many, and what the summary is.',
        `The machine ran ${fmtInt(reps)} times and drew ${fmtInt(n)} transits each time. There are ${fmtInt(reps)} points, not ${fmtInt(reps * n)} — so one point is one *run*, and a run produces exactly one number.`,
      ],
      solution: `${options[correct]}\n\nA sampling distribution is a distribution of **statistics**, one per sample. Read it off the machine: ${fmtInt(reps)} runs, ${fmtInt(n)} transits per run, one recorded number per run, ${fmtInt(reps)} points.\n\nThe display's spread is ${fmt(spread, 4)} — that is how far one honest patrol's loss rate typically lands from the Lane's true ${fmt(LANE_RATE, 4)}. The *sample's* own distribution, by contrast, would be ${fmtInt(n)} zeroes and ones with no shape worth plotting.\n\nThe distinction is the whole of Act V. Two honest cutters give two points on this display. Neither of them is the Lane.`,
      misconception: 'Reading a sampling distribution as the distribution of the sample. The sample is made of transits; the sampling distribution is made of statistics, one per sample of n transits.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Display — is the estimator biased, and which way?
// ---------------------------------------------------------------------------------------------

type EstimatorId = 'rate' | 'minOfTwo' | 'maxOfTwo' | 'delayRange'
type BiasDirection = 'none' | 'low' | 'high'

interface Estimator {
  id: EstimatorId
  /** How the Ledger's log describes the statistic. */
  label: string
  /** Sentence describing the procedure for one repetition. */
  procedure: (n: number) => string
  /** What the statistic is trying to estimate, in words. */
  target: string
  /** The true value of that target. */
  truth: number
  bias: BiasDirection
  /** Does the statistic's spread fall like 1/√n, with a bias that n cannot touch? */
  rootNScaling: boolean
  /** Decimals the axis is read to. */
  digits: number
  /** One repetition of the statistic. */
  draw: (r: Rng, n: number) => number
  /** Why it centres where it does. */
  reason: string
}

const ESTIMATORS: readonly Estimator[] = [
  {
    id: 'rate',
    label: "one patrol's observed loss rate",
    procedure: (n) => `draw ${fmtInt(n)} transits at random from the Ledger and record the share of them that were lost`,
    target: "the Lane's true loss rate",
    truth: LANE_RATE,
    bias: 'none',
    rootNScaling: true,
    digits: 4,
    draw: (r, n) => patrolRate(r, n, LANE_RATE),
    reason: 'Every transit in the Ledger is equally likely to be drawn, so the share of losses in the window is right on average — too high about as often as too low, by about as much.',
  },
  {
    id: 'minOfTwo',
    label: "the LOWER of two patrols' observed loss rates",
    procedure: (n) => `run two independent patrols of ${fmtInt(n)} transits each and record whichever loss rate is the **smaller** of the two`,
    target: "the Lane's true loss rate",
    truth: LANE_RATE,
    bias: 'low',
    rootNScaling: true,
    digits: 4,
    draw: (r, n) => Math.min(patrolRate(r, n, LANE_RATE), patrolRate(r, n, LANE_RATE)),
    reason: 'Each patrol on its own is unbiased, but taking the smaller of two throws away every draw that landed high. The minimum of two honest estimates is below the truth far more often than above it, and no patrol size repairs that — it is built into the rule.',
  },
  {
    id: 'maxOfTwo',
    label: "the HIGHER of two patrols' observed loss rates",
    procedure: (n) => `run two independent patrols of ${fmtInt(n)} transits each and record whichever loss rate is the **larger** of the two`,
    target: "the Lane's true loss rate",
    truth: LANE_RATE,
    bias: 'high',
    rootNScaling: true,
    digits: 4,
    draw: (r, n) => Math.max(patrolRate(r, n, LANE_RATE), patrolRate(r, n, LANE_RATE)),
    reason: 'Each patrol on its own is unbiased, but taking the larger of two discards every draw that landed low. The maximum of two honest estimates sits above the truth far more often than below it, whatever the patrol size.',
  },
  {
    id: 'delayRange',
    label: 'the range of Mark 9 delay inside one patrol window',
    procedure: (n) => `draw ${fmtInt(n)} honest transits at random from the Ledger and record the **range** of their Mark 9 delays — latest minus earliest`,
    target: "the full spread of Mark 9 delay across all the Ledger's honest transits",
    truth: LANE_DELAY_RANGE,
    bias: 'low',
    rootNScaling: false,
    digits: 2,
    draw: (r, n) => range(r.resample(honestDelays, n)),
    reason: 'A window can only ever contain the extremes it happens to catch. The most extreme transit in the whole Ledger is rarely inside any one window, so the window\'s range is almost always short of the Ledger\'s — and a range can never overshoot it. The error is one-sided by construction.',
  },
] as const

export const biasedOrUnbiased = defineGenerator({
  id: 'act-5/biased-or-unbiased',
  label: 'Biased or unbiased — and which way?',
  ap_topics: ['5.4'],
  skills: ['3', '4'],
  generate(rng) {
    const est = pickContext(rng, ESTIMATORS)
    const reps = 50 * rng.int(4, 7)
    const n = retry(rng, (r) => 25 * r.int(6, 16), (v) => !reservedCount(v))
    const stack = retry(
      rng,
      (r) => Array.from({ length: reps }, () => est.draw(r, n)),
      (xs) => {
        if (sd(xs) <= 0 || new Set(xs).size < 5) return false
        const off = mean(xs) - est.truth
        const se = sd(xs) / Math.sqrt(xs.length)
        // The lesson must be legible on the display: an unbiased stack sits on the truth, a biased
        // one sits clearly off it in the direction the estimator's construction forces.
        if (est.bias === 'none') return Math.abs(off) < 2.2 * se
        if (est.bias === 'low') return off < -3 * se
        return off > 3 * se
      },
    )
    const centre = mean(stack)
    const spread = sd(stack)
    const off = centre - est.truth
    const cands: Candidate[] = (['none', 'low', 'high'] as BiasDirection[]).map((d) => ({
      text:
        d === 'none'
          ? `**Unbiased.** Over many repetitions the statistic centres on the true value of ${fmt(est.truth, est.digits)}: single runs miss on both sides and the misses cancel.`
          : `**Biased ${d}.** Over many repetitions the statistic centres **${d === 'low' ? 'below' : 'above'}** the true value of ${fmt(est.truth, est.digits)}, and it would still centre on that side at any patrol size.`,
      correct: d === est.bias,
      why:
        d === est.bias
          ? null
          : d === 'none'
            ? `Look at the centre, not the scatter. The ${fmtInt(reps)} values average ${fmt(centre, est.digits)} against a truth of ${fmt(est.truth, est.digits)} — a systematic offset of ${fmt(off, est.digits)}, far larger than the simulation's own noise of about ${fmt(spread / Math.sqrt(reps), est.digits + 1)}.`
            : est.bias === 'none'
              ? `There is no side to be on. The ${fmtInt(reps)} values average ${fmt(centre, est.digits)} against a truth of ${fmt(est.truth, est.digits)} — an offset of ${fmt(off, est.digits)}, which is inside the simulation's own noise of about ${fmt(spread / Math.sqrt(reps), est.digits + 1)}.`
              : `Wrong side. The ${fmtInt(reps)} values average ${fmt(centre, est.digits)} against a truth of ${fmt(est.truth, est.digits)}, so the offset is ${fmt(off, est.digits)}.`,
    }))
    cands.push({
      text: `**Biased**, but only because ${fmtInt(n)} transits is a small window. Run the same procedure at ${fmtInt(4 * n)} transits and the offset goes away entirely.`,
      correct: false,
      why: est.rootNScaling
        ? `Sample size buys precision, never aim. Quadrupling ${fmtInt(n)} would roughly halve the stack's spread of ${fmt(spread, est.digits)} and leave its **centre** exactly where it is — ${est.bias === 'none' ? 'on the truth, where it already was' : `${fmt(Math.abs(off), est.digits)} ${est.bias === 'low' ? 'below' : 'above'} the truth, where the rule puts it`}.`
        : `Not entirely, and that is the interesting part. A wider window does catch more extreme transits, so the stack's centre does creep upward — but a window's range can never *exceed* the Ledger's, so the estimator stays below the truth at every size short of the whole Ledger. The bias is in the rule, and only reading the whole Ledger removes it.`,
    })
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `Ebele's sampling machine, run on the Transit Ledger ${fmtInt(reps)} times. Each repetition: ${est.procedure(n)}.\n\nThe statistic stacked below is **${est.label}**, and it is being used as an estimate of ${est.target}, whose true value over the Ledger is **${fmt(est.truth, est.digits)}** — the Ledger is complete, so that number is known exactly.\n\nIs this estimator **biased**, and if so in which direction?`,
      answer: {
        type: 'display',
        display: { kind: 'histogram', values: stack, binWidth: spread / 2, label: `${est.label}, ${fmtInt(reps)} repetitions — the true value is ${fmt(est.truth, est.digits)}` },
        question: { type: 'choice', options, correct, feedback },
      },
      hints: [
        'Bias is a question about the **centre** of a stack of repeated estimates, not about how wide it is. Find the centre of the display and compare it with the true value printed in the prompt.',
        `The ${fmtInt(reps)} values average ${fmt(centre, est.digits)}; the truth is ${fmt(est.truth, est.digits)}. Then ask whether that gap is the kind of wobble a simulation of ${fmtInt(reps)} runs would produce anyway — the stack's own spread is ${fmt(spread, est.digits)}, so the centre is pinned down to roughly ${fmt(spread / Math.sqrt(reps), est.digits + 1)}.`,
        'If there is an offset, say which side of the truth it falls on, and say why the *rule for computing the statistic* puts it there.',
      ],
      solution: `$$\\text{centre of the stack} = ${fmt(centre, est.digits)}, \\qquad \\text{truth} = ${fmt(est.truth, est.digits)}, \\qquad \\text{offset} = ${fmt(off, est.digits)}$$\n\n${options[correct]}\n\n${est.reason}\n\nThe simulation itself is only accurate to about ${fmt(spread / Math.sqrt(reps), est.digits + 1)} in the centre (the stack's spread ${fmt(spread, est.digits)} over $\\sqrt{${reps}}$), so ${est.bias === 'none' ? `an offset of ${fmt(off, est.digits)} is exactly what an unbiased estimator looks like after ${fmtInt(reps)} runs.` : `an offset of ${fmt(off, est.digits)} is far too large to be the machine's own noise.`}\n\nAnd note what a larger patrol would do: ${est.rootNScaling ? 'it would narrow the stack and leave the centre alone' : "it would narrow the stack and creep the centre a little closer, but it could never carry a window's range past the Ledger's own"}. Bias and variability are different diseases, and only one of them answers to $n$.`,
      misconception: 'Calling a wide stack "biased". Bias is an offset in the centre of the sampling distribution; width is variability. The two are independent, and only variability shrinks with n.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — what a larger patrol buys
// ---------------------------------------------------------------------------------------------

const MULTIPLIERS = [4, 9, 16, 25] as const

export const effectOfN = defineGenerator({
  id: 'act-5/effect-of-n',
  label: 'Four times the patrol: what happens to the spread?',
  ap_topics: ['5.4'],
  skills: ['3'],
  generate(rng) {
    const onDelay = rng.bool()
    const k = pickContext(rng, MULTIPLIERS)
    const askFactor = rng.bool()
    // The enlarged window still has to fit inside a six-year Ledger of 2,612 transits.
    const nMax = Math.floor(LEDGER_N / k / 10)
    const n = retry(rng, (r) => 10 * r.int(4, nMax), (v) => !reservedCount(v) && !reservedCount(k * v))
    const sigma = Math.round(rng.uniform(2.2, 3.2) * 100) / 100
    const p = Math.round(rng.uniform(0.008, 0.018) * 10000) / 10000
    const sd1 = onDelay ? samplingSdMean(sigma, n) : samplingSdProportion(p, n)
    const sd2 = onDelay ? samplingSdMean(sigma, k * n) : samplingSdProportion(p, k * n)
    const digits = onDelay ? 3 : 4
    const factor = sd1 / sd2
    const units = onDelay ? ' d' : ''
    const statName = onDelay ? 'the mean Mark 9 delay of a patrol window' : "a patrol's observed loss rate"
    const centreName = onDelay ? 'the Lane\'s true mean delay' : 'the Lane\'s true loss rate'
    const formulaTex = onDelay
      ? `\\sigma_{\\bar x} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${fmt(sigma, 2)}}{\\sqrt{${n}}} = ${fmt(sd1, digits + 1)}`
      : `\\sigma_{\\hat p} = \\sqrt{\\frac{p(1-p)}{n}} = \\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${n}}} = ${fmt(sd1, digits + 1)}`
    const formulaTex2 = onDelay
      ? `\\frac{${fmt(sigma, 2)}}{\\sqrt{${k * n}}} = ${fmt(sd2, digits + 1)}`
      : `\\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${k * n}}} = ${fmt(sd2, digits + 1)}`
    const setup = `The Lane Authority runs Ebele's sampling machine on the Transit Ledger. Each repetition draws a patrol window of **${fmtInt(n)} transits** at random and records ${statName}. ${onDelay ? `Mark 9 delay across the Ledger's honest transits has standard deviation $\\sigma = ${fmt(sigma, 2)}$ d` : `The Lane's loss rate over the seasons this window covers is $p = ${fmt(p, 4)}$`}.\n\nThe Authority now proposes to run the machine again with **${k} times** as many transits in each window: $n = ${fmtInt(n)}$ becomes $n = ${fmtInt(k * n)}$, drawn the same way.`

    if (askFactor) {
      return {
        prompt: `${setup}\n\nBy what **factor** does the standard deviation of the stacked statistic shrink? Give the factor to two decimal places. (The centre of the stack stays on ${centreName} either way — that is not what is being asked.)`,
        answer: numericAnswer(factor, 'other', { digits: 2 }),
        hints: [
          'Write the standard deviation of the statistic as a formula and find where $n$ sits in it. That position — and nothing else — decides what multiplying $n$ does.',
          `$n$ is under a square root, so multiplying it by ${k} divides the standard deviation by $\\sqrt{${k}}$. Work that root out.`,
        ],
        solution: `$$${formulaTex} \\qquad\\longrightarrow\\qquad ${formulaTex2}$$\n\n$$\\text{factor} = \\frac{${fmt(sd1, digits + 1)}}{${fmt(sd2, digits + 1)}} = \\sqrt{${k}} = ${fmt(factor, 2)}$$\n\nThe spread shrinks by a factor of **${fmt(factor, 2)}**.\n\nTwo things did *not* happen. The centre did not move: the stack was sitting on ${centreName} before and it is sitting there now, because ${k} times as many transits drawn the same way are still drawn the same way. And the shrink is $\\sqrt{${k}}$, not ${k} — ${k} times the transits buys only ${fmt(factor, 2)} times the precision, which is why a serious improvement in a patrol estimate is expensive.`,
        misconception: `Dividing the spread by ${k} instead of $\\sqrt{${k}}$ — or expecting the centre of the stack to move. Sample size acts on the spread only, and it acts through a square root.`,
      }
    }
    return {
      prompt: `${setup}\n\nWhat is the standard deviation of the stacked statistic at the **new** patrol size of ${fmtInt(k * n)} transits? Give it to ${digits === 3 ? 'three' : 'four'} decimal places${onDelay ? ', in days' : ''}. (The centre of the stack stays on ${centreName} either way — that is not what is being asked.)`,
      answer: numericAnswer(sd2, 'other', { digits, units: units.trim() || undefined }),
      hints: [
        `The standard deviation of ${statName} over repeated windows is ${onDelay ? '$\\sigma/\\sqrt{n}$' : '$\\sqrt{p(1-p)/n}$'}. Only $n$ changes.`,
        `Put $n = ${fmtInt(k * n)}$ into it — not $n = ${fmtInt(n)}$. Carry full precision and round once at the end.`,
        onDelay ? `$${fmt(sigma, 2)}/\\sqrt{${k * n}}$, to ${digits} decimals.` : `$\\sqrt{${fmt(p, 4)} \\times ${fmt(1 - p, 4)} / ${k * n}}$, to ${digits} decimals.`,
      ],
      solution: `$$${formulaTex} \\qquad\\longrightarrow\\qquad ${formulaTex2}$$\n\nThe new standard deviation is **${fmt(sd2, digits)}${units}**.\n\nThe ratio is $${fmt(sd1, digits + 1)} / ${fmt(sd2, digits + 1)} = ${fmt(factor, 2)}$ — exactly $\\sqrt{${k}}$, because $n$ enters under the root. And the centre of the stack has not moved at all: it sat on ${centreName} at ${fmtInt(n)} transits and it sits there at ${fmtInt(k * n)}. A bigger patrol makes the estimate *tighter*, never *better aimed*.`,
      misconception: `Using $n = ${fmtInt(n)}$ instead of the new ${fmtInt(k * n)}, or dividing by ${k} rather than $\\sqrt{${k}}$. Some learners also expect the centre to shift; it never does.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — bias, variability, both or neither
// ---------------------------------------------------------------------------------------------

type ChangeEffect = 'bias' | 'variability' | 'both' | 'neither'

/** Patrol sizes a scenario may quote: the current window, the enlarged one, the halved one. */
interface Dims {
  n: number
  k: number
  kn: number
  half: number
}

interface ChangeScenario {
  effect: ChangeEffect
  change: (d: Dims) => string
  why: (d: Dims) => string
}

const CHANGE_SCENARIOS: readonly ChangeScenario[] = [
  {
    effect: 'variability',
    change: (d) => `Keep the method exactly as it is — a window of transits drawn at random from the Ledger — but take **${d.k} times as many** transits in each window: ${fmtInt(d.n)} becomes ${fmtInt(d.kn)}.`,
    why: (d) => `The draw is still uniform over the Ledger, so the statistic still centres on the Lane's true rate: no change in bias. What changes is the spread, which falls by a factor of $\\sqrt{${d.k}}$ because $n$ sits under the root.`,
  },
  {
    effect: 'variability',
    change: (d) => `Keep the method exactly as it is, but **halve** the window: ${fmtInt(d.n)} transits becomes ${fmtInt(d.half)}.`,
    why: (d) => `A smaller random draw is still a random draw, so the centre is untouched. The spread grows by $\\sqrt{2}$, which means honest patrols of ${fmtInt(d.half)} disagree with each other more than honest patrols of ${fmtInt(d.n)} do.`,
  },
  {
    effect: 'bias',
    change: (d) => `Keep the window at ${fmtInt(d.n)} transits, but count only the hulls that **arrived** — drop every transit that ended in a loss, on the grounds that a lost hull never filed a final report.`,
    why: (d) => `Dropping the losses removes exactly the outcome being counted. The estimated loss rate collapses toward zero and stays there whether the window holds ${fmtInt(d.n)} transits or ${fmtInt(d.kn)}, because the error is in *which units can appear*, not in how many.`,
  },
  {
    effect: 'bias',
    change: (d) => `Keep the window at ${fmtInt(d.n)} transits, but stop drawing at random: take the ${fmtInt(d.n)} transits that berthed at the Lane's inner terminus, because those files are complete.`,
    why: (d) => `One terminus is not the Lane. Whatever is special about the hulls that end their run there — owner class, drive family, season — is now built into every draw, and it is built the same way every time. Raising the window to ${fmtInt(d.kn)} would measure the same wrong group more precisely.`,
  },
  {
    effect: 'both',
    change: (d) => `Run **two** independent patrols of ${fmtInt(d.n)} transits each and report whichever of the two loss rates is the **lower** — the Board's preferred summary.`,
    why: (d) => `Two changes at once. The rule throws away every draw that landed high, so the statistic now centres *below* the Lane's true rate: that is bias, and no patrol size removes it — ${fmtInt(d.kn)} transits a patrol would not help. And the minimum of two draws scatters less than a single draw, so the spread falls as well. A tighter estimate, reliably aimed at the wrong number.`,
  },
  {
    effect: 'neither',
    change: (d) => `Run the same procedure again next season: another ${fmtInt(d.n)} transits drawn at random from the Ledger, by a different cutter, on a different watch.`,
    why: (d) => `Nothing about the *method* has changed — same draw, same size of ${fmtInt(d.n)}, same population — so the sampling distribution is the same sampling distribution. The new patrol will report a different number, of course; that is the sampling variability the method already had, not a change in it.`,
  },
] as const

const EFFECT_TEXT: Record<ChangeEffect, string> = {
  bias: '**Bias** changes; the variability of the estimate does not meaningfully change.',
  variability: '**Variability** changes; the estimate is still centred where it was, so there is no change in bias.',
  both: '**Both** change — the statistic is now aimed at a different number *and* scatters differently.',
  neither: '**Neither** changes. The sampling distribution of the statistic is exactly the one it was before.',
}

export const biasVersusVariability = defineGenerator({
  id: 'act-5/bias-versus-variability',
  label: 'Bias, variability, both or neither?',
  ap_topics: ['5.4'],
  skills: ['1', '4'],
  generate(rng) {
    const s = pickContext(rng, CHANGE_SCENARIOS)
    // Only the small multipliers here: the enlarged window is quoted in the scenario text and has
    // to stay inside the Ledger's 2,612 transits.
    const k = pickContext(rng, [4, 9] as const)
    const n = retry(rng, (r) => 20 * r.int(6, 13), (v) => !reservedCount(v) && !reservedCount(k * v) && !reservedCount(v / 2))
    const dims: Dims = { n, k, kn: k * n, half: n / 2 }
    const cands: Candidate[] = (['bias', 'variability', 'both', 'neither'] as ChangeEffect[]).map((e) => ({
      text: EFFECT_TEXT[e],
      correct: e === s.effect,
      why:
        e === s.effect
          ? null
          : e === 'bias' && s.effect === 'variability'
            ? 'Bias is an offset in the *centre* of the sampling distribution, and the centre has not moved: the draw is still uniform over the Ledger. What moved is the spread.'
            : e === 'variability' && s.effect === 'bias'
              ? 'The spread is barely touched — the window is the same size. What changed is *which* transits can turn up in it, and that shifts the centre of the sampling distribution. That is bias.'
              : e === 'both'
                ? 'Only one of the two moves here. Ask each question separately: does the centre of the sampling distribution shift, and does its width change?'
                : e === 'neither'
                  ? 'Something did move. Take the two questions in turn — the centre of the sampling distribution, then its width — and check each against the change described.'
                  : 'Check the centre and the width separately before choosing. One of them is unchanged here and the other is not.',
    }))
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `The Lane Authority estimates the Lane's loss rate by drawing a window of **${fmtInt(n)} transits** at random from the Transit Ledger and reporting the share of them that were lost. Over many repetitions that statistic centres on the Lane's true rate of ${fmt(LANE_RATE, 4)}, with a spread of about ${fmt(samplingSdProportion(LANE_RATE, n), 4)}.\n\nThe Authority now proposes a change.\n\n> ${s.change(dims)}\n\nWhat does the change do to the **bias** of the estimate and to its **variability**?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two separate questions, asked in this order. **One:** over many repetitions, does the statistic still centre on the Lane\'s true rate, or has the centre moved? **Two:** are the repetitions more tightly packed or less?',
        'A change to *how many* units are drawn moves the width. A change to *which* units can be drawn, or to which draws get reported, moves the centre. A change that does neither does nothing at all.',
      ],
      solution: `${EFFECT_TEXT[s.effect]}\n\n${s.why(dims)}\n\nThe rule that survives every version of this question: **$n$ buys precision, never aim.** Quadrupling a window divides its spread by two and leaves its centre exactly where the method put it. A systematically wrong method run at four times the size reports the same wrong number with a tighter interval around it — and that is worse, not better, because the tightness makes it look trustworthy.`,
      misconception: 'Expecting a larger sample to reduce bias. It never does. Sample size is the answer to variability and to nothing else; bias is repaired only by changing which units can enter the sample or how the statistic is computed.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — why two honest cutters disagree (the Act's rubric item)
// ---------------------------------------------------------------------------------------------

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'Two patrol reports never prove anything about the Lane. They are two draws from a distribution of possible reports.',
}

interface PatrolsDifferArgs {
  cutterA: string
  cutterB: string
  n1: number
  n2: number
  /** Patrol size the magnitude is quoted at. */
  nAvg: number
  /** SD of p̂ at that patrol size — the number the answer must cite. */
  sdHat: number
}

/**
 * "Two honest cutters, different transits, different statistics — and here is how far apart honest
 * reports routinely land." Requires the sample/statistic distinction, the mechanism, the name
 * (sampling variability), the magnitude and the context. Forbids accusing either cutter, claiming the
 * reports prove a difference, and dismissing the patrols as too small to be valid.
 */
function whyPatrolsDifferRubric({ cutterA, cutterB, n1, n2, nAvg, sdHat }: PatrolsDifferArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: 'Says each report is a sample, not the whole Lane',
      phrasings: ['sample', 'subset', 'portion', 'window', 'part of the lane'],
      polarity: 'any',
      feedback: `Start with what each figure is: ${cutterA} saw ${fmtInt(n1)} transits and ${cutterB} saw ${fmtInt(n2)} — samples of the Lane, not the Lane.`,
    },
    {
      label: 'Says different transits give different statistics',
      phrasings: ['differ transit', 'differ sample', 'differ statistic', 'differ proportion', 'differ estimate', 'differ hull', 'differ patrol'],
      polarity: 'any',
      feedback: 'Say the mechanism: the two cutters watched different transits, so they computed different statistics from the same Lane.',
    },
    {
      label: 'Names it as sampling variability rather than an error by either cutter',
      phrasings: ['sample vary', 'random vary', 'probability vary', 'vary sample', 'expect vary'],
      polarity: 'any',
      feedback: 'Name it: the gap between the two figures is sampling variability — what honest sampling does on its own.',
    },
    {
      label: 'Gives the size of the disagreement expected at this patrol size',
      phrasings: [numberRegex(sdHat, 3, 1), numberRegex(100 * sdHat, 2, 1)],
      polarity: 'any',
      feedback: `Quantify it. At about ${fmtInt(nAvg)} observed transits the standard deviation of a patrol's loss rate is ${fmt(sdHat, 3)} — roughly ${fmtPct(sdHat, 2)} in percentage points.`,
    },
    contextGroup('States the context (the Lane loss rate and the two cutters)', [`the Lane loss rate`, `the cutters ${cutterA} ${cutterB}`], {
      minMatches: 2,
      feedback: `Say what and whom: the Lane's loss rate, as observed by ${cutterA} and ${cutterB}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    { phrase: 'lying', label: 'Accuses a cutter', why: 'Nothing here is evidence that either cutter misreported. Two honest patrols of this size are expected to disagree by about this much.' },
    { phrase: 'cutter wrong', label: 'Accuses a cutter', why: 'Neither report is wrong. Both are correct counts of what each cutter actually saw; the Lane rate is a third number that neither of them observed.' },
    { phrase: 'report wrong', label: 'Accuses a cutter', why: 'Neither report is wrong. Both are correct counts of what each cutter actually saw.' },
    { phrase: 'cutter mistaken', label: 'Accuses a cutter', why: 'Neither cutter made a mistake. Different samples give different statistics even when every count is exact.' },
    {
      phrase: /\b(?:reports?|patrols?|figures?|cutters?)\b[^.;:]{0,40}\b(?:real|genuine|actual)\s+(?:differ\w*|gap)/,
      label: 'Treats the gap as a real difference in the Lane',
      why: 'Both cutters were watching the *same* Lane. The gap between their figures is a property of sampling, not of the corridor.',
    },
    {
      phrase: /\b(?:sample|patrol|window|n)\b[^.;:]{0,30}\bunderestimate\b/,
      label: '“The patrol was too small to be valid”',
      why: 'Size is not validity. A small patrol gives a wide sampling distribution, which is a quantified amount of imprecision — not a reason to discard the report.',
    },
    { phrase: 'not valid', label: '“The patrol was too small to be valid”', why: 'A small patrol is imprecise, not invalid. Its sampling distribution tells you exactly how imprecise.' },
    PROVES,
  ]
  const exemplar = `${cutterA} and ${cutterB} each saw only a sample of Lane transits — ${fmtInt(n1)} and ${fmtInt(n2)} of them — so each cutter reported a statistic and neither observed the Lane's true loss rate. Different transits give different sample proportions, so the two figures differ even though both cutters counted honestly. The gap between them is ordinary sampling variability: at about ${fmtInt(nAvg)} observed transits the standard deviation of a patrol's loss rate is roughly ${fmt(sdHat, 3)}, so two honest Lane patrols routinely land that far apart or further.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 40 }
}

export const whyTwoPatrolsDiffer = defineGenerator({
  id: 'act-5/why-two-patrols-differ',
  label: 'Why two honest cutters disagree',
  ap_topics: ['5.1', '5.4'],
  skills: ['3', '4'],
  generate(rng) {
    const season = pickContext(rng, SEASONS)
    const draw = retry(
      rng,
      (r) => {
        const n1 = 10 * r.int(33, 47)
        const n2 = 10 * r.int(33, 47)
        const x1 = r.binomial(n1, LANE_RATE)
        const x2 = r.binomial(n2, LANE_RATE)
        return { n1, n2, x1, x2, r1: x1 / n1, r2: x2 / n2 }
      },
      ({ n1, n2, x1, r1, r2 }) =>
        !reservedCount(n1) &&
        !reservedCount(n2) &&
        n1 !== n2 &&
        x1 >= 1 &&
        // Both patrols must look like ordinary honest draws...
        Math.abs(r1 - LANE_RATE) < 2.6 * samplingSdProportion(LANE_RATE, n1) &&
        Math.abs(r2 - LANE_RATE) < 2.6 * samplingSdProportion(LANE_RATE, n2) &&
        // ...and yet differ enough to raise the question the drill is about.
        Math.abs(r1 - r2) > 0.003 &&
        Math.abs(r1 - r2) < 0.013,
    )
    const { n1, n2, x1, x2, r1, r2 } = draw
    const nAvg = Math.round((n1 + n2) / 2)
    const sdHat = samplingSdProportion(LANE_RATE, nAvg)
    const answer = whyPatrolsDifferRubric({ cutterA: CUTTERS.asgard.name, cutterB: CUTTERS.tindr.name, n1, n2, nAvg, sdHat })
    return {
      prompt: `Two Lane cutters filed patrol summaries for the ${season} season. Both counted honestly; both counted correctly.\n\n- **${CUTTERS.asgard.name}** — ${fmtInt(x1)} losses in ${fmtInt(n1)} observed transits, a rate of ${fmt(r1, 4)}\n- **${CUTTERS.tindr.name}** — ${fmtInt(x2)} losses in ${fmtInt(n2)} observed transits, a rate of ${fmt(r2, 4)}\n\nThe two figures differ by ${fmt(Math.abs(r1 - r2), 4)}, and the Admiralty Board has printed both in the same table under the heading *patrol data show no consistent anomaly*.\n\nIn three or four sentences, explain **why two honest cutters report different Lane loss rates**, and say roughly how much disagreement is expected at a patrol of about ${fmtInt(nAvg)} transits. Write it in context, and cite the number.`,
      answer,
      hints: [
        'Neither cutter can see the Lane. Each of them can see a window of it. Start there, and say what kind of number each of them wrote down as a result.',
        `The two cutters watched different transits, so they computed different statistics from the same corridor. To put a size on the disagreement, work out the standard deviation of a patrol's loss rate at $n \\approx ${fmtInt(nAvg)}$: $\\sqrt{p(1-p)/n}$ with the Lane's rate $p = ${fmt(LANE_RATE, 4)}$.`,
        `Finish with the magnitude and the name for it. Two honest patrols of this size are *expected* to land a few thousandths apart — say how many, and say that this is sampling variability rather than a disagreement about the facts.`,
      ],
      solution: `$$\\sigma_{\\hat p} = \\sqrt{\\frac{p(1-p)}{n}} = \\sqrt{\\frac{${fmt(LANE_RATE, 4)} \\times ${fmt(1 - LANE_RATE, 4)}}{${nAvg}}} = ${fmt(sdHat, 4)}$$\n\n**${answer.exemplar}**\n\nThe observed gap here is ${fmt(Math.abs(r1 - r2), 4)}, and each patrol's rate wanders about ${fmt(sdHat, 4)} on its own — independently of the other. A gap of a few thousandths between two windows this size is what the machine produces when nothing whatever is wrong. Nothing in these two lines is evidence about the Lane beyond what a single patrol already gave you.\n\nThat is why the Board's table is not the rebuttal it looks like. "Patrol data show no consistent anomaly" is a statement about ${fmtInt(n1)} and ${fmtInt(n2)} transits, and at those sizes a patrol simply cannot resolve a difference of a percentage point. The reports are not in conflict; they are two draws from the same distribution.`,
      misconception: 'Reading a disagreement between two honest samples as a disagreement about the facts — or as a reason to trust the larger patrol and discard the smaller. Both reports are correct counts of what each cutter saw; the Lane rate is a third number that neither of them observed.',
    }
  },
})
