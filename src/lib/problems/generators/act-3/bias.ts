/**
 * act-3-03 · Bias — drills. AP 3.4: undercoverage, nonresponse, voluntary response, convenience,
 * response bias and question wording; predicting the *direction* of an error; and the difference
 * between bias (a systematic offset that n cannot touch) and sampling variability (a spread that n
 * shrinks by √n).
 *
 *   act-3/name-the-bias         interp    name the bias, its mechanism, its consequence and direction
 *   act-3/bias-or-variability   choice    two simulated designs: which is bias, which is variability
 *   act-3/bias-direction        choice    over, under, or not predictable from what is given
 *   act-3/nonresponse-rate      numeric   silent ÷ contacted — a refusal is a response
 *   act-3/larger-sample-effect  choice    four times the size: what moves and what does not
 *
 * `act-3/name-the-bias` carries the shared `samplingBiasIdentification` template.
 * The Ceres survey's own numbers (212 respondents, 94 %) belong to the mission beats; every framing
 * here is another corridor and another survey.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableSpec } from '@/lib/problems/generate'
import { samplingBiasIdentification, type BiasType } from '@/lib/problems/rubrics'
import { mean, sd, samplingSdProportion } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Corridor {
  lane: string
  office: string
  port: string
  /** Plural noun for the people surveyed. */
  who: string
}

const CORRIDORS: readonly Corridor[] = [
  { lane: 'the Adrastea feeder lane', office: 'the Adrastea Lane Office', port: 'Adrastea Transfer', who: 'masters' },
  { lane: 'the Thebe–Amalthea shuttle run', office: 'the Thebe Yard traffic office', port: 'Thebe Yards', who: 'masters' },
  { lane: 'the Elara transfer corridor', office: 'the Elara Station berth office', port: 'Elara Station', who: 'masters' },
  { lane: 'the Carme outer loop', office: 'the Carme relay office', port: 'Carme Relay', who: 'masters' },
] as const

const RESERVED_COUNTS = new Set([212, 260, 924, 88, 110, 62])
const RESERVED_PROPS = [0.94, 0.31, 0.23, 6 / 40]
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
const reservedProp = (p: number): boolean => RESERVED_PROPS.some((r) => Math.abs(p - r) < 0.003)

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// 1. Interpretation — name the bias (shared template: samplingBiasIdentification)
// ---------------------------------------------------------------------------------------------

interface BiasScenario {
  biasType: BiasType
  direction: 'over' | 'under'
  survey: (c: Corridor, n: number) => string
  mechanism: (c: Corridor) => string
  parameter: string
  population: (c: Corridor) => string
}

const BIAS_SCENARIOS: readonly BiasScenario[] = [
  {
    biasType: 'voluntary response',
    direction: 'over',
    survey: (c, n) => `${c.office} pinned a notice on ${c.port}'s dock board — *have you been delayed by an off-nominal advisory this season? Tell the Office.* — and counted the ${fmtInt(n)} masters who wrote back.`,
    mechanism: (c) => `A master who lost days to an advisory has a reason to answer the notice, while a master whose season ran clean has none, so the replies come overwhelmingly from the aggrieved end of ${c.lane}`,
    parameter: 'share of masters delayed by an off-nominal advisory',
    population: (c) => `all masters working ${c.lane}`,
  },
  {
    biasType: 'undercoverage',
    direction: 'under',
    survey: (c, n) => `${c.office} drew ${fmtInt(n)} names at random from ${c.port}'s arrival register and asked each master whether their transponder had dropped out this season.`,
    mechanism: (c) => `The arrival register lists only hulls that berthed at ${c.port}, so hulls whose transponders failed badly enough to strand them elsewhere never appear on the list at all and had no chance of selection`,
    parameter: 'share of hulls with a transponder dropout',
    population: (c) => `all hulls endorsed for ${c.lane}`,
  },
  {
    biasType: 'nonresponse',
    direction: 'under',
    survey: (c, n) => `${c.office} drew a proper random sample of ${fmtInt(n)} masters from ${c.lane}'s register and tight-beamed each one a single question about hours flown short-handed. Barely half answered.`,
    mechanism: (c) => `The masters running short-handed are the ones with no spare watch to sit a link, so the crews working hardest on ${c.lane} are exactly the crews that never answered`,
    parameter: 'mean hours flown short-handed',
    population: (c) => `all masters on ${c.lane}'s register`,
  },
  {
    biasType: 'response bias',
    direction: 'under',
    survey: (c, n) => `An inspector from ${c.office} rode ${fmtInt(n)} transits and asked each master, face to face on the flight deck, how many times they had run past the posted heat ceiling.`,
    mechanism: (c) => `Running past the posted ceiling is a finable offence on ${c.lane}, and the master is admitting it to an inspector standing on their own flight deck, so the answers given are lower than the truth`,
    parameter: 'mean number of ceiling exceedances per transit',
    population: (c) => `all masters working ${c.lane}`,
  },
  {
    biasType: 'convenience',
    direction: 'over',
    survey: (c, n) => `A clerk needed ${fmtInt(n)} answers by the end of the watch and worked down the masters who already had a link open to ${c.office}, asking each how often they file an advisory.`,
    mechanism: (c) => `A master with a link already open to ${c.office} is a master who deals with the Office often, and masters who deal with the Office often are the masters who file`,
    parameter: 'share of masters who file an advisory each transit',
    population: (c) => `all masters working ${c.lane}`,
  },
  {
    biasType: 'wording',
    direction: 'over',
    survey: (c, n) => `${c.office} asked ${fmtInt(n)} randomly chosen masters: *Given the well-known failures of the ${c.port} escort roster, do you support paying more for escorts?*`,
    mechanism: (c) => `The question announces the failures of the ${c.port} roster before it asks anything, so it tells the master which answer the Office expects and pushes the reply toward support`,
    parameter: 'share of masters who support paying more for escorts',
    population: (c) => `all masters working ${c.lane}`,
  },
] as const

export const nameTheBias = defineGenerator({
  id: 'act-3/name-the-bias',
  label: 'Name the bias, and say which way it pushes',
  ap_topics: ['3.4'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, BIAS_SCENARIOS)
    const n = retry(rng, (r) => r.int(38, 190), (v) => !reservedCount(v))
    const mechanism = s.mechanism(c)
    const population = s.population(c)
    const answer = samplingBiasIdentification({ biasType: s.biasType, mechanism, direction: s.direction, parameter: s.parameter, population })
    return {
      prompt: `${s.survey(c, n)}\n\nThe Office intends to report the **${s.parameter}** for **${population}**.\n\nIn two or three sentences: name the kind of bias at work, explain the mechanism — who is over- or under-represented and why — say what it does to the sample, and say which way the estimate is likely to be wrong. Write it in context.`,
      answer,
      hints: [
        'Ask three questions in order. Who decided which units ended up in the sample — the investigator, the units themselves, or a list someone else wrote? Who is systematically missing or over-represented as a result? And would the missing group have answered higher or lower than the rest?',
        `Here the answers come from ${s.biasType === 'voluntary response' ? 'whoever chose to reply to a notice' : s.biasType === 'undercoverage' ? 'a list that cannot contain part of the population' : s.biasType === 'nonresponse' ? 'the part of a proper random sample that agreed to answer' : s.biasType === 'response bias' ? 'masters answering a question they have a reason not to answer truthfully' : s.biasType === 'convenience' ? 'whoever was quickest to reach' : 'a question that names the answer before it asks'}. Work out which masters that leaves out, and what those masters would have said.`,
        `Finish with the direction: is the reported ${s.parameter} likely to come out above or below the truth for ${population}?`,
      ],
      solution: `**${answer.exemplar}**\n\nThe direction is the half most answers leave out. Naming the bias is a vocabulary question; saying *which way it pushes* needs you to picture the masters who are missing and ask what they would have said. Here they would have answered ${s.direction === 'over' ? 'lower' : 'higher'} than the masters who did answer, so leaving them out pushes the estimate ${s.direction === 'over' ? 'up' : 'down'}.`,
      misconception: 'Naming the bias and stopping. A complete answer has four parts: the name, the mechanism, the consequence for the sample, and the direction of the error in context.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — bias or variability?
// ---------------------------------------------------------------------------------------------

export const biasOrVariability = defineGenerator({
  id: 'act-3/bias-or-variability',
  label: 'Bias or sampling variability?',
  ap_topics: ['3.4'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const reps = 200
    const draw = retry(
      rng,
      (r) => {
        const truth = Math.round(r.uniform(0.3, 0.68) * 100) / 100
        const offset = (r.bool() ? 1 : -1) * r.uniform(0.1, 0.18)
        const tight = r.uniform(0.015, 0.028)
        const wide = r.uniform(0.078, 0.11)
        const a = Array.from({ length: reps }, () => truth + offset + r.normal(0, tight))
        const b = Array.from({ length: reps }, () => truth + r.normal(0, wide))
        return { truth, a, b, centreA: mean(a), spreadA: sd(a), centreB: mean(b), spreadB: sd(b) }
      },
      ({ truth, centreA, spreadA, centreB, spreadB }) =>
        !reservedProp(truth) &&
        !reservedProp(centreA) &&
        !reservedProp(centreB) &&
        Math.abs(centreA - truth) > 0.08 &&
        Math.abs(centreB - truth) < 0.02 &&
        spreadB > 2.5 * spreadA,
    )
    const { truth, centreA, spreadA, centreB, spreadB } = draw
    const offA = centreA - truth
    const rows: (string | number)[][] = [
      ['Design A — dock-board notice', fmt(centreA, 3), fmt(spreadA, 3)],
      ['Design B — random sample of 25', fmt(centreB, 3), fmt(spreadB, 3)],
      ['the truth for the register', fmt(truth, 3), '—'],
    ]
    const columns = [`design (${fmtInt(reps)} simulated repetitions each)`, 'centre of the estimates', 'spread (SD) of the estimates']
    const cands: Candidate[] = [
      {
        text: `**A is bias, B is variability.** A's estimates centre on ${fmt(centreA, 3)}, about ${fmt(Math.abs(offA), 3)} ${offA > 0 ? 'above' : 'below'} the true ${fmt(truth, 3)}, and they sit there run after run; B's centre on ${fmt(centreB, 3)}, essentially the truth, but scatter with an SD of ${fmt(spreadB, 3)}. A larger sample shrinks B's spread and leaves A's centre exactly where it is.`,
        correct: true,
        why: null,
      },
      {
        text: `**B is bias, A is variability.** B's estimates are the ones spread all over the place, and an estimate that cannot be relied on from run to run is a biased estimate. A larger sample would fix A.`,
        correct: false,
        why: `Spread is not bias. B's estimates average ${fmt(centreB, 3)} against a truth of ${fmt(truth, 3)} — the method is aimed correctly and is merely imprecise. A's average ${fmt(centreA, 3)} misses by ${fmt(Math.abs(offA), 3)} every time, and *that* is bias.`,
      },
      {
        text: `**Both are biased**, because on almost every single repetition each design misses the true value of ${fmt(truth, 3)}.`,
        correct: false,
        why: `Bias is a property of the *centre over many repetitions*, not of one run. Any sample-based estimate misses on a given run; B misses in both directions equally and averages out to the truth, so B is unbiased and simply noisy.`,
      },
      {
        text: `**A is the better design**, because its estimates vary by only ${fmt(spreadA, 3)} while B's vary by ${fmt(spreadB, 3)}, so A is the more reliable of the two.`,
        correct: false,
        why: `A is precisely wrong. Its tiny spread means it will reproduce the same ${fmt(Math.abs(offA), 3)} error again and again, and a consistent wrong answer is worse than an inconsistent right one — you cannot see the error from inside the data.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${c.office} simulated two ways of estimating the share of ${c.who} on ${c.lane} who have logged an off-nominal advisory, repeating each design ${fmtInt(reps)} times against a register whose true share is known to be ${fmt(truth, 3)}.\n\n| ${columns.join(' | ')} |\n| --- | --- | --- |\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n\nWhich design suffers from **bias** and which from **sampling variability** — and which of the two does a larger sample repair?`,
      data: tableSpec(columns, rows),
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two different questions about a set of repeated estimates. *Where do they centre?* — a centre away from the truth is bias. *How far do they scatter about that centre?* — that is sampling variability. The two are independent: a method can be any combination of aimed-right-or-wrong and tight-or-loose.',
        `Compare each centre with the truth of ${fmt(truth, 3)}, then compare the two spreads. Then ask what a bigger sample does: it averages more units, so it tightens the scatter — but it changes nothing about *which* units the design can reach.`,
      ],
      solution: `**${options[correct]}**\n\n- Design A: centre ${fmt(centreA, 3)}, truth ${fmt(truth, 3)}, so the offset is $${fmt(centreA, 3)} - ${fmt(truth, 3)} = ${fmt(offA, 3)}$ — a **systematic** error, reproduced on essentially every repetition (SD only ${fmt(spreadA, 3)}).\n- Design B: centre ${fmt(centreB, 3)}, an offset of $${fmt(centreB - truth, 3)}$ — no systematic error at all, but a **random** error with SD ${fmt(spreadB, 3)}.\n\nSample size acts on one of these and not the other. Quadrupling $n$ would roughly halve B's ${fmt(spreadB, 3)}. It would leave A's ${fmt(offA, 3)} untouched, because that offset comes from *who the notice reaches*, and reaching more of the same people does not change who they are.`,
      misconception: 'Calling the noisier design the biased one. Bias is about the centre of the estimates; variability is about their scatter — and only variability answers to n.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which way does it push?
// ---------------------------------------------------------------------------------------------

interface DirectionScenario {
  direction: 'over' | 'under' | 'unknown'
  survey: (c: Corridor, n: number) => string
  parameter: string
  why: string
}

const DIRECTION_SCENARIOS: readonly DirectionScenario[] = [
  {
    direction: 'over',
    survey: (c, n) => `${c.office} posts a notice inviting masters who have been delayed by an advisory to write in, and reports the share delayed from the ${fmtInt(n)} replies.`,
    parameter: 'share of masters delayed by an advisory',
    why: 'Masters with a grievance have a reason to reply and masters with a clean season do not, so the replies are loaded with the delayed. The share comes out above the truth.',
  },
  {
    direction: 'under',
    survey: (c, n) => `An inspector from ${c.office} asks ${fmtInt(n)} masters, on their own flight decks, how many times they have run past the posted heat ceiling — a finable offence.`,
    parameter: 'mean ceiling exceedances per transit',
    why: 'Masters are admitting a finable offence to the person who writes the fines. Under-reporting is the safe answer, so the mean comes out below the truth.',
  },
  {
    direction: 'under',
    survey: (c, n) => `${c.office} draws ${fmtInt(n)} names from ${c.port}'s arrival register — hulls that berthed this quarter — and reports the share of hulls that suffered a transponder dropout.`,
    parameter: 'share of hulls with a transponder dropout',
    why: 'A hull whose transponder failed badly is a hull that may never have logged an arrival. The worst cases are the ones the register cannot contain, so the share comes out below the truth.',
  },
  {
    direction: 'over',
    survey: (c, n) => `${c.office} asks ${fmtInt(n)} randomly chosen masters: *Given the well-known failures of the ${c.port} escort roster, do you support paying more for escorts?*`,
    parameter: 'share of masters who support paying more for escorts',
    why: 'The question names the failures before it asks the question, which tells the master what answer is expected. Leading wording pushes support above the truth.',
  },
  {
    direction: 'unknown',
    survey: (c, n) => `${c.office} draws a proper random sample of ${fmtInt(n)} masters from ${c.lane}'s register and tight-beams each a single question about cargo insurance. A third never reply, and nothing is known about who they are or what they carry.`,
    parameter: 'share of masters carrying full cargo insurance',
    why: 'Nonresponse biases an estimate only in the direction the non-responders differ — and nothing here says which way that is. Naming a direction would mean inventing a fact about masters nobody has spoken to.',
  },
  {
    direction: 'unknown',
    survey: (c, n) => `A clerk at ${c.port} takes the first ${fmtInt(n)} masters to walk past the office door and asks each how many transits they have logged this season.`,
    parameter: 'mean transits logged this season',
    why: 'A convenience sample is systematically unrepresentative, but which way depends on who walks past that door — and nothing here says whether the busy masters pass more often or less. The direction is not predictable from what is given.',
  },
] as const

const DIRECTION_OPTIONS = {
  over: 'The estimate is likely to come out **too high** — an overestimate.',
  under: 'The estimate is likely to come out **too low** — an underestimate.',
  unknown: '**The direction cannot be predicted** from what is given — the mechanism is biased, but nothing says which way.',
} as const

export const biasDirection = defineGenerator({
  id: 'act-3/bias-direction',
  label: 'Which way does the bias push?',
  ap_topics: ['3.4'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, DIRECTION_SCENARIOS)
    const n = retry(rng, (r) => r.int(40, 220), (v) => !reservedCount(v))
    const wrongWhy: Record<'over' | 'under' | 'unknown', string> = {
      over: 'Think again about who is missing from these answers and what they would have said. Over-reporting is not the failure here.',
      under: 'Think again about who is missing from these answers and what they would have said. Under-reporting is not the failure here.',
      unknown: `The direction *is* predictable here: ${s.why.charAt(0).toLowerCase()}${s.why.slice(1)}`,
    }
    const cands: Candidate[] = (['over', 'under', 'unknown'] as const).map((d) => ({
      text: DIRECTION_OPTIONS[d],
      correct: d === s.direction,
      why: d === s.direction ? null : s.direction === 'unknown' ? 'Nothing in the description says which way the missing masters differ, so naming a direction means inventing a fact. A bias you cannot sign is still a bias — say so.' : wrongWhy[d],
    }))
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${s.survey(c, n)}\n\nThe reported figure is the **${s.parameter}** for all masters working ${c.lane}.\n\nWhich way is this estimate likely to be wrong?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Name the masters who are missing from the answers — or whose answers are shaded — and then ask the only question that matters: would they have reported a *higher* figure than the ones who answered, or a lower one?',
        'If the description does not tell you how the missing masters differ from the answering ones, then it does not tell you the direction. "Biased, direction unknown" is a complete and honest answer, and sometimes the only one available.',
      ],
      solution: `**${DIRECTION_OPTIONS[s.direction]}**\n\n${s.why}\n\nSigning a bias is a separate step from naming it. You sign it by picturing the units that are missing or misreported and asking what they would have contributed. Where the description is silent about how those units differ — as it is whenever nonresponse or convenience is the only mechanism and nothing is known about who is absent — the honest answer is that the direction cannot be predicted.`,
      misconception: 'Assuming every bias overstates. Direction depends entirely on who is missing and how they differ; often the description simply does not say, and inventing a direction is worse than admitting you cannot sign it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — the nonresponse rate
// ---------------------------------------------------------------------------------------------

export const nonresponseRate = defineGenerator({
  id: 'act-3/nonresponse-rate',
  label: 'Nonresponse rate',
  ap_topics: ['3.4'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const askNonresponse = rng.bool()
    const d = retry(
      rng,
      (r) => {
        const contacted = r.int(60, 240)
        const silent = Math.round(contacted * r.uniform(0.22, 0.5))
        const refused = Math.round(contacted * r.uniform(0.06, 0.18))
        const answered = contacted - silent - refused
        return { contacted, silent, refused, answered, nonresponse: silent / contacted, response: (answered + refused) / contacted }
      },
      ({ contacted, silent, refused, answered, nonresponse, response }) =>
        answered >= 20 &&
        refused >= 5 &&
        silent >= 12 &&
        ![contacted, silent, refused, answered].some(reservedCount) &&
        !reservedProp(nonresponse) &&
        !reservedProp(response),
    )
    const { contacted, silent, refused, answered, nonresponse, response } = d
    const columns = ['outcome of the contact', 'masters']
    const rows: (string | number)[][] = [
      ['answered the questions', answered],
      ['replied "no comment"', refused],
      ['never replied at all', silent],
      ['contacted in total', contacted],
    ]
    const setup = `${c.office} drew a random sample from ${c.lane}'s register and opened a tight-beam link to **${fmtInt(contacted)}** masters. Of those, **${fmtInt(answered)}** answered the questions, **${fmtInt(refused)}** came back on the link and said "no comment", and **${fmtInt(silent)}** never replied at all.`

    if (askNonresponse) {
      return {
        prompt: `${setup}\n\nWhat is the survey's **nonresponse rate**? Give a proportion to three decimal places.`,
        data: tableSpec(columns, rows),
        answer: numericAnswer(nonresponse, 'proportion', { digits: 3 }),
        hints: [
          'Nonresponse means the Office never heard back. Sort the three outcomes into "heard back" and "did not", and be careful which side a refusal falls on.',
          `A master who came on the link to say "no comment" *responded* — the Office learned that they would not answer, which is information. Only the ${fmtInt(silent)} silent masters are nonresponse. The denominator is everybody contacted: ${fmtInt(contacted)}.`,
          `$${silent} / ${contacted}$, to three decimals.`,
        ],
        solution: `$$\\text{nonresponse rate} = \\frac{\\text{never replied}}{\\text{contacted}} = \\frac{${silent}}{${contacted}} = ${fmt(nonresponse, 4)}$$\n\n**${fmt(nonresponse, 3)}** — about ${fmtPct(nonresponse, 0)} of the masters the Office reached out to were never heard from.\n\nTwo denominators and one numerator are commonly got wrong here. The ${fmtInt(refused)} refusals are *responses*: they arrived. And the denominator is the ${fmtInt(contacted)} contacted, not the ${fmtInt(answered)} who answered — dividing by the answered group would say the survey had a nonresponse rate of ${fmt(silent / answered, 3)}, which is a statement about nothing.`,
        misconception: `Counting the ${fmtInt(refused)} "no comment" replies as nonresponse (they responded), or dividing by the ${fmtInt(answered)} who answered rather than the ${fmtInt(contacted)} contacted.`,
      }
    }
    return {
      prompt: `${setup}\n\nWhat is the survey's **response rate** — the share of contacted masters who came back on the link at all? Give a proportion to three decimal places.`,
      data: tableSpec(columns, rows),
      answer: numericAnswer(response, 'proportion', { digits: 3 }),
      hints: [
        'A response is a reply, whatever the reply says. Decide which of the three outcomes count as replies before you divide anything.',
        `The ${fmtInt(answered)} who answered and the ${fmtInt(refused)} who said "no comment" both replied; only the ${fmtInt(silent)} silent masters did not. The denominator is everybody contacted: ${fmtInt(contacted)}.`,
        `$(${answered} + ${refused}) / ${contacted}$, to three decimals.`,
      ],
      solution: `$$\\text{response rate} = \\frac{${answered} + ${refused}}{${contacted}} = \\frac{${answered + refused}}{${contacted}} = ${fmt(response, 4)}$$\n\n**${fmt(response, 3)}** — about ${fmtPct(response, 0)} of those contacted came back on the link.\n\nA refusal is a response: the Office got an answer, and the answer was "no comment". That matters practically as well as arithmetically, because a master who refuses has told you they exist and are reachable, while a silent master has told you nothing at all. The response rate and the nonresponse rate (${fmt(nonresponse, 3)}) add to 1.`,
      misconception: `Treating "no comment" as nonresponse and reporting ${fmt(answered / contacted, 3)}, or dividing by the ${fmtInt(answered + refused)} respondents instead of the ${fmtInt(contacted)} contacted.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what four times the sample size buys
// ---------------------------------------------------------------------------------------------

export const largerSampleEffect = defineGenerator({
  id: 'act-3/larger-sample-effect',
  label: 'Four times the sample: what moves?',
  ap_topics: ['3.4'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, CORRIDORS)
    const d = retry(
      rng,
      (r) => {
        const truth = Math.round(r.uniform(0.3, 0.66) * 100) / 100
        const offset = Math.round(r.uniform(0.09, 0.19) * 100) / 100
        const n = 10 * r.int(4, 16)
        return { truth, offset, n, biasedP: truth + offset }
      },
      ({ truth, offset, n, biasedP }) => !reservedProp(truth) && !reservedProp(biasedP) && !reservedCount(n) && !reservedCount(4 * n) && biasedP < 0.9 && offset > 0.08,
    )
    const { truth, offset, n, biasedP } = d
    const sd1 = samplingSdProportion(biasedP, n)
    const sd2 = samplingSdProportion(biasedP, 4 * n)
    const cands: Candidate[] = [
      {
        text: `The **spread** of the estimate falls from about ${fmt(sd1, 4)} to about ${fmt(sd2, 4)} — a factor of $\\sqrt{4} = 2$ — and the **bias** does not move at all: the estimates still centre about ${fmt(offset, 2)} above the truth.`,
        correct: true,
        why: null,
      },
      {
        text: `Both the spread and the bias fall by a factor of 2: the spread goes from ${fmt(sd1, 4)} to ${fmt(sd2, 4)}, and the offset from ${fmt(offset, 2)} to about ${fmt(offset / 2, 2)}.`,
        correct: false,
        why: `The spread half is right and the bias half is not. Bias is not an error that averages away with more data — every extra reply comes from the same self-selected group, so every extra reply reproduces the same offset of ${fmt(offset, 2)}.`,
      },
      {
        text: `The spread falls by a factor of 4, from ${fmt(sd1, 4)} to about ${fmt(sd1 / 4, 4)}, and the bias is unchanged.`,
        correct: false,
        why: `The bias half is right. But the standard deviation of a sample proportion is $\\sqrt{p(1-p)/n}$, so $n$ enters under a square root: four times the sample divides the spread by $\\sqrt{4} = 2$, giving ${fmt(sd2, 4)}, not ${fmt(sd1 / 4, 4)}.`,
      },
      {
        text: `Nothing changes that matters: the survey is biased, so collecting four times as many replies buys nothing at all.`,
        correct: false,
        why: `Too pessimistic in one direction and too generous in the other. Precision genuinely does improve — ${fmt(sd1, 4)} to ${fmt(sd2, 4)} — the trouble is that it is precision about the wrong number. A bigger biased survey reports a wrong answer with a tighter interval around it.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${c.office}'s dock-board survey on ${c.lane} reaches only masters who choose to reply. Over many repetitions its estimates centre on ${fmt(biasedP, 2)}, while the true share for the register is ${fmt(truth, 2)} — an offset of ${fmt(offset, 2)}.\n\nThe Office repeats the survey with **four times** as many replies: $n = ${fmtInt(n)}$ becomes $n = ${fmtInt(4 * n)}$, collected the same way.\n\nWhat changes?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two quantities describe a sampling method: where its estimates centre, and how far they scatter about that centre. Ask which of the two the formula for the standard deviation of $\\hat{p}$ contains an $n$ in — and which one it does not mention at all.',
        `$\\sigma_{\\hat p} = \\sqrt{p(1-p)/n}$. Put $n = ${fmtInt(n)}$ and then $n = ${fmtInt(4 * n)}$ into it, and note that the offset of ${fmt(offset, 2)} is set by *who replies*, a fact about the method that contains no $n$ at all.`,
      ],
      solution: `$$\\sigma_{\\hat p} = \\sqrt{\\frac{p(1-p)}{n}} = \\sqrt{\\frac{${fmt(biasedP, 2)} \\times ${fmt(1 - biasedP, 2)}}{${n}}} = ${fmt(sd1, 4)} \\quad\\longrightarrow\\quad \\sqrt{\\frac{${fmt(biasedP, 2)} \\times ${fmt(1 - biasedP, 2)}}{${4 * n}}} = ${fmt(sd2, 4)}$$\n\n**${options[correct]}**\n\nThe ratio is $${fmt(sd1, 4)} / ${fmt(sd2, 4)} = ${fmt(sd1 / sd2, 2)}$ — exactly $\\sqrt{4}$, because $n$ sits under the root. The offset of ${fmt(offset, 2)} appears nowhere in that formula, and it cannot: it is set by which masters the dock board reaches, and reaching four times as many of the same kind of master changes nothing about what kind they are.`,
      misconception: 'Expecting a larger sample to reduce bias. Sample size buys precision only; a systematically wrong method run at four times the size gives a tighter interval around the same wrong number.',
    }
  },
})
