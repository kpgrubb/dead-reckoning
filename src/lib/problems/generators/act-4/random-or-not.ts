/**
 * act-4-01 · Spring of '82 — drills. AP 4.1–4.2: randomness in the long run, streaks in short runs,
 * designing a simulation (model → one trial → statistic), and interpreting a simulated probability.
 *
 *   act-4/simulation-design                choice          model, one trial, statistic — pick the design that is right in all three
 *   act-4/read-simulated-distribution      numeric         a count-based probability off a seeded distribution of a simulated statistic
 *   act-4/streaks                          choice          the gambler's fallacy and "random means evenly spread"
 *   act-4/interpret-simulated-probability  interpretation  a simulated probability, WITH its run count
 *
 * Every study here is drawn fresh — other files, other offices, never the Register's 31 loss dates,
 * whose largest 30-day cluster is act-4-01's mission beat.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import type { Rng } from '@/lib/rng'
import { fmt, fmtPct } from '@/lib/stats/format'
import { simulatedProbabilityInterpretation } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Reserved: act-4-01's mission beat is the Register's own clustering study, 175 of 10,000.
// ---------------------------------------------------------------------------------------------

/** P(largest 30-day cluster ≥ 5 | 31 dates scattered at random over 2,260 days) — the beat. */
const RESERVED = [175 / 10_000]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.006)
}

// ---------------------------------------------------------------------------------------------
// Trial machinery — three families of study, all of them seeded
// ---------------------------------------------------------------------------------------------

/** One trial of the clumping study: `n` dates uniform over `spanDays`, statistic = largest window count. */
function largestCluster(r: Rng, n: number, spanDays: number, windowDays: number): number {
  const d: number[] = []
  for (let i = 0; i < n; i++) d.push(Math.floor(r.uniform(0, spanDays)))
  d.sort((a, b) => a - b)
  let best = 0
  for (let i = 0, j = 0; i < d.length; i++) {
    while (j < d.length && d[j] - d[i] <= windowDays) j++
    best = Math.max(best, j - i)
  }
  return best
}

/** One trial of the detection study: `n` independent sweeps at rate `p`, statistic = detections. */
function detectionCount(r: Rng, n: number, p: number): number {
  let k = 0
  for (let i = 0; i < n; i++) if (r.bool(p)) k++
  return k
}

/** One trial of the streak study: `n` independent sweeps at rate `p`, statistic = longest clean run. */
function longestCleanRun(r: Rng, n: number, p: number): number {
  let best = 0
  let cur = 0
  for (let i = 0; i < n; i++) {
    if (r.bool(p)) cur = 0
    else {
      cur++
      if (cur > best) best = cur
    }
  }
  return best
}

interface BuiltStudy {
  trial: (r: Rng) => number
  /** One or two sentences of in-world framing for the study. */
  frame: string
  /** What one trial assumes, as a noun phrase. */
  model: string
  /** What one repetition does. */
  oneTrial: string
  /** What is recorded and stacked. */
  statistic: string
  /** Column header for the distribution table. */
  column: string
  eventAtLeast: (t: number) => string
  eventAtMost: (t: number) => string
}

const CLUMP_FILES = [
  { file: "the Authority's advisory log for the Saturn feeder run", noun: 'advisories' },
  { file: 'the Bureau of Hulls query file at Uruk High', noun: 'queries' },
  { file: 'the Adlinda Yards fault book', noun: 'faults' },
  { file: "the Ceres receiving office's reweigh log", noun: 'reweighs' },
  { file: "the Compact's tender-collision file for the Jovian locals", noun: 'collisions' },
] as const

const SWEEP_LANES = ['the Callisto–Ganymede local lane', 'the Elara picket line', 'the Uruk High approach', 'the Adlinda yard perimeter'] as const

function buildStudy(r: Rng): BuiltStudy {
  const family = r.int(0, 2)
  if (family === 0) {
    const place = pickContext(r, CLUMP_FILES)
    const n = r.int(9, 18)
    const span = r.int(320, 900)
    const win = pickContext(r, [14, 20, 30, 45] as const)
    return {
      trial: (rr) => largestCluster(rr, n, span, win),
      frame: `${place.file} holds ${n} ${place.noun} over ${span} days, and a clerk has noticed that several of them sit close together. Ebele runs the question as a simulation.`,
      model: `${n} ${place.noun} scattered at random over ${span} days`,
      oneTrial: `draw ${n} dates uniformly over the ${span} days and find the largest number of them inside any ${win}-day window`,
      statistic: `the largest ${win}-day cluster in that trial`,
      column: `largest ${win}-day cluster`,
      eventAtLeast: (t) => `a ${win}-day cluster of ${t} or more ${place.noun}`,
      eventAtMost: (t) => `a largest ${win}-day cluster of ${t} or fewer ${place.noun}`,
    }
  }
  if (family === 1) {
    const lane = pickContext(r, SWEEP_LANES)
    const n = r.int(10, 24)
    const p = Math.round(r.uniform(0.15, 0.45) * 100) / 100
    return {
      trial: (rr) => detectionCount(rr, n, p),
      frame: `A watch on ${lane} runs ${n} scheduled sweeps, and the Eyes detect something on about ${fmtPct(p, 0)} of sweeps when nothing is hiding. Ebele simulates the watch.`,
      model: `${n} independent sweeps, each detecting something with probability ${fmt(p, 2)}`,
      oneTrial: `simulate all ${n} sweeps and count how many of them detect something`,
      statistic: `the number of detections in the ${n} sweeps`,
      column: 'detections in the watch',
      eventAtLeast: (t) => `${t} or more detections in the ${n} sweeps`,
      eventAtMost: (t) => `${t} or fewer detections in the ${n} sweeps`,
    }
  }
  const lane = pickContext(r, SWEEP_LANES)
  const n = r.int(16, 34)
  const p = Math.round(r.uniform(0.18, 0.4) * 100) / 100
  return {
    trial: (rr) => longestCleanRun(rr, n, p),
    frame: `A watch on ${lane} runs ${n} scheduled sweeps at a detection rate of ${fmt(p, 2)}, and the log shows a long stretch of clean ones in a row. Ebele simulates the watch to see how long a clean stretch the rate alone produces.`,
    model: `${n} independent sweeps, each detecting something with probability ${fmt(p, 2)}`,
    oneTrial: `simulate all ${n} sweeps and record the longest unbroken stretch of clean ones`,
    statistic: `the longest run of consecutive clean sweeps in that trial`,
    column: 'longest clean run',
    eventAtLeast: (t) => `a run of ${t} or more consecutive clean sweeps`,
    eventAtMost: (t) => `a longest clean run of ${t} or fewer sweeps`,
  }
}

interface Study {
  runs: number
  stats: number[]
  distribution: { value: number; count: number }[]
}

function runStudy(r: Rng, trial: (rr: Rng) => number, runs: number): Study {
  const stats: number[] = []
  const counts = new Map<number, number>()
  for (let i = 0; i < runs; i++) {
    const s = trial(r)
    stats.push(s)
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return { runs, stats, distribution: [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count })) }
}

const RUN_SIZES = [200, 250, 400, 500] as const

function distributionRows(s: Study): (string | number)[][] {
  return [...s.distribution.map((d) => [d.value, d.count] as (string | number)[]), ['total', s.runs]]
}

/** Thresholds whose tail count is big enough to read and small enough to be interesting. */
function tailCandidates(s: Study, dir: 'atLeast' | 'atMost'): { t: number; count: number }[] {
  const lo = Math.max(4, Math.round(0.015 * s.runs))
  const hi = s.runs - Math.max(4, Math.round(0.05 * s.runs))
  return s.distribution
    .map((d) => ({ t: d.value, count: dir === 'atLeast' ? s.stats.filter((x) => x >= d.value).length : s.stats.filter((x) => x <= d.value).length }))
    .filter((c) => c.count >= lo && c.count <= hi && !reserved(c.count / s.runs))
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — the model, one trial, the statistic (checkpoint q1)
// ---------------------------------------------------------------------------------------------

interface DesignCtx {
  question: string
  model: string
  trial: string
  statistic: string
  badModel: string
  badModelWhy: string
  badTrial: string
  badTrialWhy: string
  badStat: string
  badStatWhy: string
}

const DESIGNS: DesignCtx[] = [
  {
    question: 'Nine of the Bureau of Hulls’ audit queries this quarter landed on certifications signed by the same examiner, out of 40 queries and four examiners. How often would chance alone do that?',
    model: 'each of the 40 queries falls on one of the four examiners with equal probability, independently of the others',
    trial: 'assign all 40 queries at random among the four examiners',
    statistic: 'the largest number of queries landing on any one examiner',
    badModel: 'each of the 40 queries falls on one of the four examiners in proportion to how many certifications that examiner signed',
    badModelWhy:
      'That is a different model. Weighting by workload may well be the more realistic assumption, but the question asked how often *chance alone* produces the clump, and the chance-alone model gives every examiner the same probability.',
    badTrial: 'assign one query at random to one of the four examiners',
    badTrialWhy: 'One trial must be one repetition of the whole process — all 40 queries — because the statistic is a property of the whole quarter, not of a single query.',
    badStat: 'whether the ninth query landed on the same examiner as the eighth',
    badStatWhy: 'The statistic has to be the thing the question is about: the size of the largest clump. Recording a yes/no about two adjacent queries stacks the wrong quantity.',
  },
  {
    question: 'A twelve-sweep watch on the Elara picket line returned five detections. The Eyes detect on about 15% of sweeps with nothing out there. How often would twelve clean-sky sweeps return five or more?',
    model: 'each of the twelve sweeps detects something with probability 0.15, independently of the others',
    trial: 'simulate all twelve sweeps and count the detections',
    statistic: 'the number of detections in the twelve sweeps',
    badModel: 'each of the twelve sweeps detects something with probability 5/12, the rate the watch actually returned',
    badModelWhy: 'A simulation answers "how often would chance do this?" — so the model must carry the rate you are testing against, 0.15, not the rate the data happened to show.',
    badTrial: 'simulate sweeps one at a time until the first detection',
    badTrialWhy: 'That is a trial for a different question — how long a wait to the first detection. One trial here is one whole twelve-sweep watch.',
    badStat: 'whether the twelfth sweep detected anything',
    badStatWhy: 'The statistic must be the quantity the question asks about: five or more detections in the watch. The last sweep on its own says nothing about the total.',
  },
  {
    question: 'Three of the eleven hulls in one week’s dock queue at Adlinda were Perrine-flagged, and they were consecutive. Perrine is about a quarter of the yard’s traffic. How often does chance put three of a kind in a row?',
    model: 'each of the eleven berths in the queue is Perrine with probability 0.25, independently of the others',
    trial: 'simulate the whole eleven-berth queue and find the longest run of consecutive Perrine hulls',
    statistic: 'the longest run of consecutive Perrine hulls in the queue',
    badModel: 'exactly three of the eleven berths are Perrine, placed at random in the queue',
    badModelWhy:
      'Fixing the count at three assumes the very thing the data showed. The model should assume only what is being tested — a 25% rate per berth — and let the count come out where it comes out.',
    badTrial: 'simulate three berths and check whether all three are Perrine',
    badTrialWhy: 'One trial is one repetition of the process that produced the observation: the whole eleven-berth queue, not the three berths you already noticed.',
    badStat: 'the number of Perrine hulls in the queue',
    badStatWhy: 'The observation was about hulls *in a row*. Counting Perrine hulls stacks a statistic that cannot distinguish three consecutive from three scattered.',
  },
  {
    question: 'Four of the Ceres receiving office’s 26 reweighs this season fell inside one ten-day stretch. How often would 26 reweighs scattered over a 180-day season clump like that?',
    model: '26 reweigh dates scattered uniformly at random over the 180 days of the season',
    trial: 'draw 26 dates over the 180 days and find the largest number inside any ten-day window',
    statistic: 'the largest ten-day cluster of reweighs in that trial',
    badModel: '26 reweigh dates spread evenly over the 180 days, about one every seven days',
    badModelWhy: 'Evenly spaced is not random. A uniform random model produces gaps and clumps; spacing the dates evenly builds the answer — no clumping — into the model before the first trial runs.',
    badTrial: 'draw one reweigh date and check whether it lands in the observed ten-day stretch',
    badTrialWhy: 'The statistic is a property of the whole season, so one trial has to be a whole season: all 26 dates, then the largest cluster among them.',
    badStat: 'the number of reweighs that fell inside the observed ten-day stretch',
    badStatWhy: 'Conditioning on the stretch the data pointed at is the error the simulation exists to avoid. The statistic must be the largest cluster *anywhere* in the trial.',
  },
]

function designOption(model: string, trial: string, statistic: string): string {
  return `Model: ${model}. One trial: ${trial}. Statistic: ${statistic}.`
}

export const simulationDesign = defineGenerator({
  id: 'act-4/simulation-design',
  label: 'Design the simulation',
  ap_topics: ['4.2'],
  skills: ['1', '3'],
  generate(rng) {
    const ctx = pickContext(rng, DESIGNS)
    const cands = [
      { text: designOption(ctx.model, ctx.trial, ctx.statistic), correct: true, why: null as string | null },
      { text: designOption(ctx.badModel, ctx.trial, ctx.statistic), correct: false, why: ctx.badModelWhy },
      { text: designOption(ctx.model, ctx.badTrial, ctx.statistic), correct: false, why: ctx.badTrialWhy },
      { text: designOption(ctx.model, ctx.trial, ctx.badStat), correct: false, why: ctx.badStatWhy },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${ctx.question}\n\nA simulation needs three things stated before it runs: the **model** (what chance alone is assumed to do), **one trial** (one repetition of the whole process), and the **statistic** (the one number recorded from each trial and stacked). Which design has all three right?`,
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Three of these designs are wrong in exactly one place. Check them in order: does the model assume only what is being tested, is one trial one repetition of the whole process, and is the statistic the quantity the question asked about?',
        'The model must carry the chance-alone assumption, not the rate or the count the data happened to show — otherwise the simulation answers a question with its own answer built in.',
        'One trial reproduces the whole process that generated the observation, and the statistic is the single number you would stack ten thousand of.',
      ],
      solution: `**${designOption(ctx.model, ctx.trial, ctx.statistic)}**\n\nThe model states what chance alone is assumed to do, and nothing else. One trial is one repetition of the entire process that produced the observation. The statistic is the one number the question is about, recorded from every trial and stacked into a distribution; the simulated probability is then the share of trials at or beyond the observed value.\n\n- *Wrong model:* ${ctx.badModelWhy}\n- *Wrong trial:* ${ctx.badTrialWhy}\n- *Wrong statistic:* ${ctx.badStatWhy}`,
      misconception:
        'Building the observation into the model — fixing the count, using the observed rate, or spacing the events evenly — guarantees a simulated probability that answers nothing. State the model first, in words, before any code runs.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — read a probability off a simulated distribution
// ---------------------------------------------------------------------------------------------

export const readSimulatedDistribution = defineGenerator({
  id: 'act-4/read-simulated-distribution',
  label: 'Read a simulated distribution',
  ap_topics: ['4.2'],
  skills: ['2', '3'],
  generate(rng) {
    const dir = rng.bool() ? 'atLeast' : 'atMost'
    const draw = retry(
      rng,
      (r) => {
        const built = buildStudy(r)
        const runs = pickContext(r, RUN_SIZES)
        const study = runStudy(r, built.trial, runs)
        const cands = tailCandidates(study, dir)
        return { built, study, pick: cands.length ? pickContext(r, cands) : null }
      },
      (d) => d.pick !== null && d.study.distribution.length >= 3,
      60,
    )
    const { built, study } = draw
    const pick = draw.pick!
    const p = pick.count / study.runs
    const event = dir === 'atLeast' ? built.eventAtLeast(pick.t) : built.eventAtMost(pick.t)
    const symbol = dir === 'atLeast' ? '\\ge' : '\\le'
    const columns = [built.column, 'runs']
    const rows = distributionRows(study)
    return {
      prompt: `${built.frame}\n\nThe model: ${built.model}. One trial: ${built.oneTrial}. The statistic recorded is ${built.statistic}. Here are ${study.runs} runs.\n\n${tableMd(columns, rows)}\n\nFrom this study, estimate the probability of **${event}**. Report a proportion to three decimal places.`,
      data: tableSpec(columns, rows),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'A simulated probability is a count divided by the run size: how many trials landed in the event, out of how many trials were run.',
        `Add the *runs* column for every row with a ${built.column} of ${pick.t} or ${dir === 'atLeast' ? 'more' : 'fewer'}. The run size is ${study.runs}.`,
        `$${pick.count} / ${study.runs}$, to three decimals.`,
      ],
      solution: `$$\\hat{P}(X ${symbol} ${pick.t}) = \\frac{${pick.count}}{${study.runs}} = ${fmt(p, 4)}$$\n\nOf the ${study.runs} simulated trials, ${pick.count} produced ${event}, so the simulated probability is **${fmt(p, 3)}**. It is an estimate: another ${study.runs} runs of the same model would land near this number without landing on it.`,
      misconception: `Dividing by the number of *distinct values* in the table, or by the largest count in it, instead of by the run size. The denominator of a simulated probability is always how many trials were run — here ${study.runs}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — streaks, the gambler's fallacy, and "random means evenly spread"
// ---------------------------------------------------------------------------------------------

interface StreakCtx {
  setup: (k: number, p: number) => string
  question: string
  correct: string
  fallacy: string
  fallacyWhy: string
  evenSpread: string
  evenSpreadWhy: string
  modelWrong: string
  modelWrongWhy: string
}

const STREAKS: StreakCtx[] = [
  {
    setup: (k, p) =>
      `The Eyes have returned ${k} clean sweeps in a row on the Elara picket line. Sweeps are scheduled, independent, and detect something with probability ${fmt(p, 2)} when there is nothing out there.`,
    question: 'What is true of the next sweep?',
    correct: 'It detects something with probability {p} — the same as every other sweep. The run of clean sweeps does not change it.',
    fallacy: 'It is more likely than {p} to detect something, because {k} clean sweeps in a row means one is overdue.',
    fallacyWhy:
      'That is the gambler’s fallacy. Independent trials have no memory: nothing about the previous sweeps is carried forward, and no trial is ever "due". The long-run rate is reached by swamping the run, not by correcting it.',
    evenSpread: 'It is less likely than {p} to detect something, because detections spread themselves evenly through a watch.',
    evenSpreadWhy:
      'Randomness does not spread evenly — a spread-out pattern is *less* likely than a clumped one. Long clean stretches and bunched detections are exactly what independent trials produce.',
    modelWrong: 'The run of {k} clean sweeps shows the detection rate of {p} is wrong for this lane.',
    modelWrongWhy: 'A run this long is ordinary under independence at this rate. A streak on its own is not evidence against a model; only a statistic stacked over many simulated watches can say whether the run is unusual.',
  },
  {
    setup: (k, p) =>
      `${k} consecutive Lane transits have been logged without an incident of any kind. The Authority files an incident on about ${fmtPct(p, 0)} of transits, and transits are independent of one another.`,
    question: 'What does the quiet stretch tell you about the next transit?',
    correct: 'Nothing. The next transit files an incident with probability {p}, exactly as it would have before the quiet stretch.',
    fallacy: 'An incident is now more likely than {p}, because {k} quiet transits mean the Lane is owed one.',
    fallacyWhy:
      'Transits do not keep accounts. The long-run rate asserts itself across thousands of transits by dilution, not because any single transit is nudged to make up a shortfall.',
    evenSpread: 'An incident is now less likely than {p}, because incidents arrive at roughly regular intervals.',
    evenSpreadWhy:
      'Independent events arrive in clumps and gaps, not at regular intervals. A file with no long quiet stretches in it would be the surprising one.',
    modelWrong: 'The stretch of {k} quiet transits shows the Lane is safer than the {p} rate claims.',
    modelWrongWhy:
      'A single quiet stretch is a short run, and short runs are where streaks live. Comparing the whole file against the rate — or simulating stretches this long — is the only way to make that claim.',
  },
  {
    setup: (k, p) =>
      `Of the last ${k} berths in the Adlinda dock queue, every one has gone to a Perrine hull. Perrine is about ${fmtPct(p, 0)} of the yard’s traffic and berths are assigned in arrival order.`,
    question: 'Which statement is correct?',
    correct: 'The next berth is Perrine with probability about {p}; a run of {k} is the kind of clump independent assignments produce.',
    fallacy: 'The next berth is less likely than {p} to be Perrine, because the run has to break sooner or later.',
    fallacyWhy:
      'The run does break sooner or later — but not because probability pushes it. Each berth is its own trial; "sooner or later" is a statement about the long run, never about the next trial.',
    evenSpread: 'A run of {k} means the arrival order is not random, because random traffic alternates between owners.',
    evenSpreadWhy:
      'Alternation is a pattern; randomness is not patterned. Runs of the same category are common in independent sequences, and a sequence with no runs in it would be the one worth investigating.',
    modelWrong: 'Because {k} Perrine hulls in a row is surprising, the {p} share must be out of date.',
    modelWrongWhy:
      'Surprise has to be measured, not felt. Simulate the whole queue at the stated share, stack the longest run from each trial, and see where {k} falls in that distribution before revising the share.',
  },
]

export const streaks = defineGenerator({
  id: 'act-4/streaks',
  label: 'Streaks and the long run',
  ap_topics: ['4.1'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, STREAKS)
    const k = rng.int(5, 11)
    const p = Math.round(rng.uniform(0.12, 0.38) * 100) / 100
    const fill = (s: string) => s.replace(/\{p\}/g, fmt(p, 2)).replace(/\{k\}/g, String(k))
    const cands = [
      { text: fill(ctx.correct), correct: true, why: null as string | null },
      { text: fill(ctx.fallacy), correct: false, why: fill(ctx.fallacyWhy) },
      { text: fill(ctx.evenSpread), correct: false, why: fill(ctx.evenSpreadWhy) },
      { text: fill(ctx.modelWrong), correct: false, why: fill(ctx.modelWrongWhy) },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${fill(ctx.setup(k, p))}\n\n${ctx.question}`,
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Independent trials have no memory. Ask what the previous outcomes are physically able to change about the next one.',
        '"Random" describes the long run, not a short one. Over thousands of trials the rate settles; over a handful it produces runs, gaps and clumps that look like patterns.',
      ],
      solution: `**${fill(ctx.correct)}**\n\nThe trials are independent, so the probability attached to the next one is ${fmt(p, 2)} whatever came before it. Two errors are available here and both are common. The *gambler's fallacy* treats the process as if it kept accounts and owed a correction. *Random means evenly spread* treats clumping as evidence against randomness, when clumping is what randomness looks like at short range — the long-run rate is reached by swamping early runs with later trials, never by cancelling them.`,
      misconception:
        'Reading a short run as a pattern. Over a handful of trials, runs and clumps are ordinary; only a statistic stacked over many simulated repetitions can say whether an observed streak is unusual.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — a simulated probability, WITH its run count
// ---------------------------------------------------------------------------------------------

export const interpretSimulatedProbability = defineGenerator({
  id: 'act-4/interpret-simulated-probability',
  label: 'Interpret a simulated probability',
  ap_topics: ['4.2'],
  skills: ['3', '4'],
  generate(rng) {
    const draw = retry(
      rng,
      (r) => {
        const built = buildStudy(r)
        const runs = pickContext(r, RUN_SIZES)
        const study = runStudy(r, built.trial, runs)
        const cands = tailCandidates(study, 'atLeast').filter((c) => c.count / study.runs < 0.35)
        return { built, study, pick: cands.length ? pickContext(r, cands) : null }
      },
      (d) => d.pick !== null,
      60,
    )
    const { built, study } = draw
    const pick = draw.pick!
    const estimate = pick.count / study.runs
    const event = built.eventAtLeast(pick.t)
    const rubric = simulatedProbabilityInterpretation({ estimate, count: pick.count, runs: study.runs, event, model: built.model })
    return {
      prompt: `${built.frame}\n\nThe model: ${built.model}. One trial: ${built.oneTrial}. The statistic: ${built.statistic}. Across ${study.runs} runs, ${pick.count} of them produced ${event}.\n\nWrite one or two sentences reporting what the simulation found. Say what was counted, what the trial assumed, and how the estimate was made.`,
      answer: rubric,
      hints: [
        'A simulated probability is a probability UNDER a model: the sentence has to name the model as well as the number.',
        'Give the count and the run size, not just the proportion. The run size is what tells a reader how precise the estimate is.',
        'Finish with what the number is not: an estimate from a finite number of runs, so it is not exact.',
      ],
      solution: `${rubric.exemplar}\n\nThe common failure is to report the proportion alone, as if it were computed rather than estimated. A simulated probability carries its run size the way a measurement carries its instrument.`,
      misconception:
        'Reporting a simulated estimate as an exact probability, or dropping the model. Both turn "here is how often chance alone did this in a specific number of trials" into a claim the simulation cannot make.',
    }
  },
})
