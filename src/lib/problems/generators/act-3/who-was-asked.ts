/**
 * act-3-01 · Who Was Asked — drills. AP 3.1, 3.2: population, sampling frame and sample; survey vs
 * observational study vs experiment and what each licenses; why testimony collected from a list that
 * cannot reach the whole population generalizes no further than the list.
 *
 *   act-3/study-type-scope           choice    name the study type AND the population it reaches
 *   act-3/population-frame-sample    choice    which described entity is the frame (or population, or sample)
 *   act-3/frame-defect               numeric   how many units had no chance of selection, as a count or a share
 *   act-3/scope-of-inference-framing interp    the population the claim needs, the frame used, who is missing
 *
 * `act-3/study-type-scope` is a checkpoint item, so it stands alone: the study is described in full in
 * the prompt and nothing refers to an instrument on the page.
 *
 * The Act's own survey (212 respondents, 94 %, the 260-master frame at 88/110/62) belongs to the
 * mission beats. Every framing here is another corridor, another port office, another quarter.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { scopeOfInferenceFraming } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Lane {
  lane: string
  office: string
  port: string
  quarter: string
}

const LANES: readonly Lane[] = [
  { lane: 'the Adrastea feeder lane', office: 'the Adrastea Lane Office', port: 'Adrastea Transfer', quarter: 'the second quarter of 2183' },
  { lane: 'the Thebe–Amalthea shuttle run', office: 'the Thebe Yard traffic office', port: 'Thebe Yards', quarter: 'the first quarter of 2184' },
  { lane: 'the Elara transfer corridor', office: 'the Elara Station berth office', port: 'Elara Station', quarter: 'the third quarter of 2183' },
  { lane: 'the Carme outer loop', office: 'the Carme relay office', port: 'Carme Relay', quarter: 'the last quarter of 2182' },
  { lane: 'the Leda–Himalia local run', office: 'the Himalia traffic office', port: 'Himalia Anchorage', quarter: 'the second quarter of 2184' },
] as const

/** Headline numbers reserved for the Act's mission beats — never a drill's answer or a drill's total. */
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
// 1. Choice — study type and the population it reaches
// ---------------------------------------------------------------------------------------------

type StudyKind = 'survey' | 'observational' | 'experiment'

interface StudyScenario {
  kind: StudyKind
  description: string
  candidates: Candidate[]
}

function buildScenario(kind: StudyKind, c: Lane, n: number, N: number): StudyScenario {
  if (kind === 'survey') {
    return {
      kind,
      description: `${c.office} tight-beamed the same four questions to ${fmtInt(n)} masters drawn by lot from the ${fmtInt(N)} hulls on ${c.lane}'s schedule for ${c.quarter}, and logged what each one answered. Nothing was imposed on anybody; the masters were asked.`,
      candidates: [
        {
          text: `A sample survey; conclusions apply to the ${fmtInt(N)} masters on ${c.lane}'s schedule for ${c.quarter}, because the ${fmtInt(n)} were drawn at random from that list.`,
          correct: true,
          why: null,
        },
        {
          text: `A sample survey; conclusions apply to every master in the Jupiter Compact.`,
          correct: false,
          why: `Right type, wrong population. The draw was from one lane's schedule, not from the Compact. A random sample generalizes to the list it came from and no further — no master on any other run had a chance of being picked.`,
        },
        {
          text: `An experiment; conclusions apply to the ${fmtInt(N)} masters on ${c.lane}'s schedule for ${c.quarter}.`,
          correct: false,
          why: `Right population, wrong type. An experiment requires that the investigator IMPOSE a treatment. Nobody here was made to do anything: they were asked four questions.`,
        },
        {
          text: `An experiment, because there are two groups — the masters who answered and the masters who did not; conclusions apply to ${c.lane}.`,
          correct: false,
          why: `Two groups do not make an experiment. The two groups here formed themselves, and nothing was assigned. Groups that form themselves are the *problem* in a study, not the design.`,
        },
      ],
    }
  }
  if (kind === 'observational') {
    return {
      kind,
      description: `A clerk at ${c.port} logged, for each of the ${fmtInt(n)} hulls that berthed there during ${c.quarter}, whether it carried a spare transponder repeater and how many off-nominal advisories it had filed on the run in. The clerk imposed nothing: the repeater was aboard or it was not.`,
      candidates: [
        {
          text: `An observational study; conclusions apply to the hulls that berthed at ${c.port} during ${c.quarter}, not to ${c.lane}.`,
          correct: true,
          why: null,
        },
        {
          text: `An observational study; conclusions apply to all ${fmtInt(N)} hulls working ${c.lane}.`,
          correct: false,
          why: `Right type, wrong population. Hulls that berthed at ${c.port} are not a random sample of the lane — they are the hulls whose schedules and cargoes brought them in. Anything that decides who berths can also decide who files advisories.`,
        },
        {
          text: `A sample survey; conclusions apply to the hulls that berthed at ${c.port} during ${c.quarter}.`,
          correct: false,
          why: `Right population, wrong type. Nobody was asked anything: the clerk read the berth record and counted filings. Measuring what is already there is observation, not a survey.`,
        },
        {
          text: `An experiment, because there are two groups — hulls with a repeater and hulls without; conclusions apply to all ${fmtInt(N)} hulls working ${c.lane}.`,
          correct: false,
          why: `Two groups do not make an experiment. The repeater was already fitted or not; the clerk assigned nothing. Without imposed treatment, whatever made an owner fit a repeater travels with the repeater into the comparison.`,
        },
      ],
    }
  }
  const half = Math.round(n / 2)
  return {
    kind,
    description: `${c.office} took the ${fmtInt(n)} transits booked on ${c.lane} for ${c.quarter}, drew ${fmtInt(half)} of them by lot for the new drive-plume damper and left the rest on the standard fit, then counted off-nominal advisories on each transit.`,
    candidates: [
      {
        text: `An experiment; conclusions about the damper apply to the ${fmtInt(n)} transits in the trial, which were not a random sample of anything wider.`,
        correct: true,
        why: null,
      },
      {
        text: `An experiment; conclusions about the damper apply to all ${fmtInt(N)} transits on ${c.lane}.`,
        correct: false,
        why: `Right type, wrong population. Random ASSIGNMENT was done, and that is what licenses a causal reading. Random SAMPLING was not: the trial used the transits already booked, so nothing reaches beyond them.`,
      },
      {
        text: `An observational study; conclusions apply to the ${fmtInt(n)} transits in the trial.`,
        correct: false,
        why: `Right population, wrong type. The damper was imposed by lot. That is the definition of an experiment, and it is the whole reason this design can say "because".`,
      },
      {
        text: `A sample survey; conclusions apply to all ${fmtInt(N)} transits on ${c.lane}.`,
        correct: false,
        why: `Nobody was asked anything — advisories were counted — and nothing was drawn at random from the lane. Both halves are wrong.`,
      },
    ],
  }
}

export const studyTypeScope = defineGenerator({
  id: 'act-3/study-type-scope',
  label: 'Study type, and whom it reaches',
  ap_topics: ['3.1', '3.2'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, LANES)
    const kind = pickContext(rng, ['survey', 'observational', 'experiment'] as const)
    const { n, N } = retry(
      rng,
      (r) => {
        const n = 2 * r.int(14, 48)
        const N = n + r.int(90, 340)
        return { n, N }
      },
      ({ n, N }) => !reservedCount(n) && !reservedCount(N) && N > 2 * n,
    )
    const s = buildScenario(kind, c, n, N)
    const { options, correct, feedback } = shuffleChoice(rng, s.candidates)
    return {
      prompt: `${s.description}\n\nName the kind of study **and** the population its conclusions apply to.`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two questions, in order. First: did anybody **impose** anything? If yes it is an experiment; if no, it is a survey when the units were asked and an observational study when they were measured. Second: where could the units have come from? A conclusion reaches the list that was drawn from at random, and stops there.',
        `Read the description again for the two words that settle it: who did the choosing (an investigator, or the units themselves), and what list the units came off. ${s.kind === 'experiment' ? 'Random assignment and random sampling are different things, and they buy different things.' : 'Nothing here was imposed, so the question is only about reach.'}`,
      ],
      solution: `**${options[correct]}**\n\nThe two halves are independent.\n\n- *Type* is decided by one question: did the investigator impose a condition on the units? ${s.kind === 'experiment' ? 'Here the damper was assigned **by lot**, so it is an experiment — and that is what would let a difference be read as caused by the damper.' : s.kind === 'survey' ? 'Here the masters were **asked** and nothing was imposed, so it is a sample survey.' : 'Here the clerk **recorded what was already true** of each hull, so it is an observational study.'}\n- *Reach* is decided by a different question: what list were the units drawn from, and at random? ${s.kind === 'experiment' ? 'The trial used the transits already booked, so the conclusion reaches those transits only. Random assignment buys "because"; only random sampling buys "and this holds for the lane".' : s.kind === 'survey' ? `The ${fmtInt(n)} came off the schedule of ${fmtInt(N)}, at random, so the conclusion reaches that schedule — not the Compact.` : `The hulls are those that berthed at ${c.port}. Nothing was drawn at random, so the conclusion reaches those hulls and stops.`}`,
      misconception: 'Calling any comparison of two groups an experiment. An experiment needs an imposed treatment; and even an experiment generalizes only as far as its units were sampled.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — population, frame, sample or respondents?
// ---------------------------------------------------------------------------------------------

type Role = 'population' | 'frame' | 'sample' | 'respondents'

const ROLE_NOTE: Record<Role, string> = {
  population: 'the **population** — everyone the conclusion is meant to describe. No clerk holds a list of them, which is exactly the trouble',
  frame: 'the **sampling frame** — the list the sample could actually be drawn from. It is never the population when it is a port register',
  sample: 'the **sample** — the units actually selected out of the frame',
  respondents: 'the **respondents** — the part of the sample that answered. The gap between the sample and this is nonresponse, which is a different defect from a bad frame',
}

const ROLE_ASK: Record<Exclude<Role, 'respondents'>, string> = {
  population: 'the **population**',
  frame: 'the **sampling frame**',
  sample: 'the **sample**',
}

export const populationFrameSample = defineGenerator({
  id: 'act-3/population-frame-sample',
  label: 'Population, frame, sample',
  ap_topics: ['3.1'],
  skills: ['1'],
  generate(rng) {
    const c = pickContext(rng, LANES)
    const d = retry(
      rng,
      (r) => {
        const N = r.int(210, 640)
        const F = Math.round(N * r.uniform(0.35, 0.72))
        const n = r.int(28, 70)
        const a = Math.round(n * r.uniform(0.5, 0.85))
        return { N, F, n, a }
      },
      ({ N, F, n, a }) => F >= n + 30 && a >= 12 && a <= n - 4 && ![N, F, n, a].some(reservedCount),
    )
    const { N, F, n, a } = d
    const asked = pickContext(rng, ['population', 'frame', 'sample'] as const)
    const entities: { role: Role; text: string }[] = [
      { role: 'population', text: `The ${fmtInt(N)} masters holding a current ${c.lane} endorsement this season.` },
      { role: 'frame', text: `The ${fmtInt(F)} names on ${c.office}'s arrival register for ${c.quarter} — the only list the clerk could work from.` },
      { role: 'sample', text: `The ${fmtInt(n)} masters whose register entries came out of the draw and who were sent the questions.` },
      { role: 'respondents', text: `The ${fmtInt(a)} masters who answered before the cut-off.` },
    ]
    const cands: Candidate[] = entities.map((e) => ({
      text: e.text,
      correct: e.role === asked,
      why: e.role === asked ? null : `That is ${ROLE_NOTE[e.role]}.`,
    }))
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${c.office} wants the share of ${c.lane} masters who have logged a profile-deviation advisory this season. Four groups are described below. Which one is ${ROLE_ASK[asked]}?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Work the chain outward: the population is whom the answer is *about*; the frame is the list you could *draw* from; the sample is what came *out of* the draw; the respondents are who *answered*. Each step loses units, and each loss is a different defect.',
        `Here the chain runs ${fmtInt(N)} → ${fmtInt(F)} → ${fmtInt(n)} → ${fmtInt(a)}. Decide which arrow you are being asked about.`,
      ],
      solution: `**${options[correct]}**\n\n| stage | count | what it is |\n| --- | --- | --- |\n| population | ${fmtInt(N)} | whom the conclusion is about |\n| sampling frame | ${fmtInt(F)} | the list that could be drawn from |\n| sample | ${fmtInt(n)} | what the draw produced |\n| respondents | ${fmtInt(a)} | who answered |\n\nThe frame is a *register*, not the population: ${fmtInt(N - F)} endorsed masters never touched ${c.port} that quarter and so could not have been picked however the draw was run. That step — population to frame — is undercoverage. The last step — sample to respondents — is nonresponse. They are different problems and neither is fixed by the other.`,
      misconception: 'Treating the arrival register as though it were the population. A frame is whatever list exists; the population is whom you meant to ask, and the two agree only by accident.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — how many had no chance of selection?
// ---------------------------------------------------------------------------------------------

export const frameDefect = defineGenerator({
  id: 'act-3/frame-defect',
  label: 'Undercoverage: who could not be picked',
  ap_topics: ['3.1', '3.2'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, LANES)
    const asProportion = rng.bool()
    const d = retry(
      rng,
      (r) => {
        const berthed = r.int(74, 168)
        const inTransit = r.int(58, 175)
        const laidUp = r.int(11, 46)
        const dark = r.int(2, 13)
        const N = berthed + inTransit + laidUp + dark
        const missed = N - berthed
        return { berthed, inTransit, laidUp, dark, N, missed, p: missed / N }
      },
      ({ berthed, N, missed, p }) =>
        !reservedCount(N) && !reservedCount(missed) && !reservedCount(berthed) && !reservedProp(p) && p > 0.4 && p < 0.78,
    )
    const { berthed, inTransit, laidUp, dark, N, missed, p } = d
    const shared = {
      prompt: `${c.office} holds endorsements for ${fmtInt(N)} masters working ${c.lane} this season. During ${c.quarter} those ${fmtInt(N)} were distributed as follows:\n\n| status during ${c.quarter} | masters |\n| --- | --- |\n| berthed at ${c.port} at least once | ${fmtInt(berthed)} |\n| in transit throughout, never berthed | ${fmtInt(inTransit)} |\n| laid up at another port | ${fmtInt(laidUp)} |\n| transponder dark, whereabouts unlogged | ${fmtInt(dark)} |\n| **total** | **${fmtInt(N)}** |\n\nThe clerk built the survey's sampling frame from ${c.port}'s arrival register: a master appears on it if and only if the hull berthed there during the quarter.`,
      data: {
        kind: 'table' as const,
        columns: ['status during the quarter', 'masters'],
        rows: [
          [`berthed at ${c.port}`, berthed],
          ['in transit throughout', inTransit],
          ['laid up elsewhere', laidUp],
          ['transponder dark', dark],
          ['total', N],
        ] as (string | number)[][],
      },
    }
    if (asProportion) {
      return {
        ...shared,
        prompt: `${shared.prompt}\n\nWhat **proportion** of the ${fmtInt(N)} endorsed masters had no chance whatever of being selected? Give a proportion to three decimal places.`,
        answer: numericAnswer(p, 'proportion', { digits: 3 }),
        hints: [
          'A unit that is not on the frame has probability zero of selection, no matter how the draw is run or how many names are pulled. Count those units first.',
          `Only the ${fmtInt(berthed)} who berthed at ${c.port} are on the register. Everybody else — in transit, laid up, dark — is outside the frame. The denominator is the population, ${fmtInt(N)}.`,
          `$(${inTransit} + ${laidUp} + ${dark}) / ${N}$, to three decimals.`,
        ],
        solution: `$$\\frac{${inTransit} + ${laidUp} + ${dark}}{${N}} = \\frac{${missed}}{${N}} = ${fmt(p, 4)}$$\n\n**${fmt(p, 3)}** — about ${fmtPct(p, 0)} of the endorsed masters could not have been selected by any draw from this frame. The clerk may sample every name on the register and the figure does not move: undercoverage is a property of the list, not of $n$.`,
        misconception: `Dividing by the frame (${fmtInt(berthed)}) instead of the population (${fmtInt(N)}). The question is what share of the *population* the frame cannot reach, so the population is the denominator.`,
      }
    }
    return {
      ...shared,
      prompt: `${shared.prompt}\n\nHow many of the ${fmtInt(N)} endorsed masters had no chance whatever of being selected? Give a whole number of masters.`,
      answer: numericAnswer(missed, 'count'),
      hints: [
        'A unit that is not on the frame has probability zero of selection, however the draw is run. Find the units the register cannot contain.',
        `The register holds only the ${fmtInt(berthed)} who berthed. Add up the three statuses it cannot hold.`,
        `$${inTransit} + ${laidUp} + ${dark}$.`,
      ],
      solution: `$$${inTransit} + ${laidUp} + ${dark} = ${fmt(missed, 0)}$$\n\n**${fmt(missed, 0)} masters** — ${fmtPct(p, 0)} of the endorsed population — are outside the frame entirely: in transit, laid up elsewhere, or dark. Their selection probability is zero, and it stays zero no matter how large the draw from the register is.`,
      misconception: `Answering ${fmtInt(N - berthed - dark)} by forgetting the dark hulls, or answering ${fmtInt(berthed)} by naming the group that *could* be picked. The question asks for the units the list cannot reach.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — the scope the frame actually supports
// ---------------------------------------------------------------------------------------------

interface FramingCase {
  conclusion: (c: Lane, N: number) => string
  frame: (c: Lane, F: number) => string
  missing: (c: Lane) => string
  parameter: string
  population: (c: Lane, N: number) => string
}

const FRAMING_CASES: readonly FramingCase[] = [
  {
    conclusion: (c, N) => `${c.office}'s bulletin says the survey shows that most of the ${fmtInt(N)} masters working ${c.lane} have logged a profile-deviation advisory this season.`,
    frame: (c) => `the ${c.port} arrival register for ${c.quarter}`,
    missing: (c) => `masters in transit throughout the quarter, masters laid up at other ports, and hulls that ran dark and never logged an arrival at ${c.port}`,
    parameter: 'the share of masters who have logged a profile-deviation advisory',
    population: (c, N) => `the ${fmtInt(N)} masters working ${c.lane}`,
  },
  {
    conclusion: (c, N) => `A yard bulletin says the survey shows how the ${fmtInt(N)} hulls endorsed for ${c.lane} rate their transponder reliability.`,
    frame: (c) => `the ${c.port} maintenance queue for ${c.quarter}`,
    missing: (c) => `hulls serviced at yards other than ${c.port}, hulls that needed no service at all, and hulls still on the run when the queue closed`,
    parameter: 'the share of hulls whose masters rate their transponder as unreliable',
    population: (c, N) => `the ${fmtInt(N)} hulls endorsed for ${c.lane}`,
  },
  {
    conclusion: (c, N) => `A Lane Authority note says the survey establishes what the ${fmtInt(N)} masters on ${c.lane} think of the new convoy discipline.`,
    frame: (c) => `the list of masters who attended the ${c.port} briefing in ${c.quarter}`,
    missing: (c) => `masters whose schedules kept them away from ${c.port}, masters who skipped the briefing, and every independent who was never sent a notice`,
    parameter: 'the share of masters who support the new convoy discipline',
    population: (c, N) => `the ${fmtInt(N)} masters on ${c.lane}`,
  },
] as const

export const scopeOfInferenceFramingDrill = defineGenerator({
  id: 'act-3/scope-of-inference-framing',
  label: 'What this frame will and will not support',
  ap_topics: ['3.1', '3.2'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, LANES)
    const kase = pickContext(rng, FRAMING_CASES)
    const d = retry(
      rng,
      (r) => {
        const N = r.int(240, 620)
        const F = Math.round(N * r.uniform(0.3, 0.6))
        const n = r.int(30, 80)
        return { N, F, n }
      },
      ({ N, F, n }) => F >= n + 40 && ![N, F, n].some(reservedCount),
    )
    const { N, F, n } = d
    const conclusionPopulation = kase.population(c, N)
    const frame = kase.frame(c, F)
    const missing = kase.missing(c)
    const answer = scopeOfInferenceFraming({ conclusionPopulation, frame, missing, parameter: kase.parameter })
    return {
      prompt: `${kase.conclusion(c, N)}\n\nThe survey worked like this: the clerk took ${frame} — ${fmtInt(F)} names — drew ${fmtInt(n)} of them at random, and contacted those ${fmtInt(n)}.\n\nIn three or four sentences, say (a) what population the bulletin's conclusion would need, (b) what frame the survey actually used, (c) which units are missing from that frame and therefore had no chance of selection, and (d) what the survey can and cannot support, in context.`,
      answer,
      hints: [
        'A random draw is only as wide as the list it is drawn from. The draw here was honest; the list was not the population. Start by naming those two things separately, and then say which units fall between them.',
        `The bulletin's claim is about ${conclusionPopulation}. The list was ${frame} — ${fmtInt(F)} names of a population of ${fmtInt(N)}. Name the ${fmtInt(N - F)} who are absent from it and say what their selection probability was.`,
        'Finish with the scope sentence: the survey describes the frame, and the conclusion cannot be carried out to the population. Do not offer a larger sample as the repair — it is not one.',
      ],
      solution: `**${answer.exemplar}**\n\nThe draw itself was faultless: ${fmtInt(n)} names pulled at random from ${fmtInt(F)}. What the draw cannot do is reach the ${fmtInt(N - F)} endorsed masters who are not on the register at all. Their selection probability is zero, and enlarging $n$ leaves it at zero — the commonest wrong repair on this item is "contact more of them", which only measures the same wrong group more precisely.`,
      misconception: 'Answering that the survey is fine because the sample was random. Randomness inside a defective frame buys precision about the frame, never reach beyond it.',
    }
  },
})
