/**
 * act-10-01 · Consequences — the Epilogue's own two drills. AP 6.7 revisited, plus the
 * interpretation discipline the whole course has been drilling, asked the way a reviewer asks it.
 *
 *   act-10/survives-review        choice  which write-up of a finding a hostile reviewer cannot move
 *   act-10/decision-not-outcome   choice  judging a decision by the odds it was made on, not by how
 *                                         it came out
 *
 * The Lane's own numbers belong to the mission beat and never appear here: offices, corridors and
 * yards are invented per seed, and any draw that reproduces one of the case's headline figures is
 * rejected.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, pickContext, retry } from '@/lib/problems/generate'
import { normal } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

/** Figures the Lane's own case owns. A drill that reproduces one has leaked a mission beat. */
const RESERVED_COUNTS = new Set([12, 19, 31, 412, 900, 1712, 2612])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
const reservedP = (p: number): boolean => Math.abs(p - 0.0008) < 0.0002

// ---------------------------------------------------------------------------------------------
// 1. Which write-up survives a hostile review
// ---------------------------------------------------------------------------------------------

interface ReviewCase {
  office: string
  /** What was studied, plural. */
  unit: string
  /** The population the file actually covers. */
  frame: string
  /** The wider population a reviewer would love the officer to claim. */
  overreach: string
  /** The parameter, in words. */
  parameter: string
  /** The direction the alternative names, in words. */
  direction: string
  /** A one-clause limitation genuinely present in the file. */
  limitation: string
}

const REVIEW_CASES: readonly ReviewCase[] = [
  {
    office: 'the Adrastea Lane Office',
    unit: 'transits',
    frame: 'the transits recorded on the Adrastea feeder lane over the six seasons in the file',
    overreach: 'shipping in the Jovian system',
    parameter: 'proportion of transits that log an off-nominal advisory',
    direction: 'higher for hulls refitted at Adrastea Transfer',
    limitation: 'an advisory is logged by the duty officer on watch, and the file cannot distinguish a lane with more faults from a lane with a stricter watch',
  },
  {
    office: 'the Thebe Yard traffic office',
    unit: 'transits',
    frame: 'the transits on the Thebe–Amalthea shuttle run in the two years the relay archive covers',
    overreach: 'every hull carrying the older transponder set anywhere',
    parameter: 'proportion of transits with a transponder dropout',
    direction: 'higher on the older transponder set',
    limitation: 'the hulls carrying the older set are also the oldest hulls on the run, and nothing in the file separates the set from the hull',
  },
  {
    office: 'the Carme relay office',
    unit: 'hulls',
    frame: 'the hulls surveyed at Carme in the 2183 sweep',
    overreach: 'the 2179 plate wherever it was fitted',
    parameter: 'proportion of surveyed hulls with a seal fault',
    direction: 'higher among hulls plated from the 2179 batch',
    limitation: 'the sweep surveyed the hulls that came in for survey, and a hull with a fault is a hull with a reason to come in',
  },
  {
    office: 'the Hygiea Hold traffic office',
    unit: 'arrivals',
    frame: 'the arrivals at Hygiea Hold in the season the file covers',
    overreach: 'arrivals at every hold in the Belt',
    parameter: 'proportion of arrivals that check in late',
    direction: 'higher for arrivals routed through the outer approach',
    limitation: 'the routing was chosen by the approach controller and not assigned, so the two groups differ in more than their route',
  },
] as const

export const survivesReview = defineGenerator({
  id: 'act-10/survives-review',
  label: 'Which write-up survives a hostile review',
  ap_topics: ['6.7'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, REVIEW_CASES)
    const d = retry(
      rng,
      (r) => {
        const alpha = r.choice([0.1, 0.05, 0.01] as const)
        const n = 50 * r.int(4, 30)
        const z = Math.round(r.uniform(2.4, 4.2) * 100) / 100
        /* The one-sided tail the office would have reported, from the Engine's normal. */
        const p = normal.sf(z)
        return { alpha, n, z, p }
      },
      (d) => d.p < d.alpha / 2 && d.p > 1e-6 && !reservedCount(d.n) && !reservedP(d.p),
    )

    const cands: Candidate[] = [
      {
        text: `With P = ${fmtP(d.p)} below α = ${fmt(d.alpha, 2)}, we reject the null and conclude that there is convincing evidence the true ${c.parameter} is ${c.direction}, among ${c.frame}. The level was set before the file was opened. The comparison is observational, and ${c.limitation}.`,
        correct: true,
        why: null,
      },
      {
        text: `With P = ${fmtP(d.p)} below α = ${fmt(d.alpha, 2)}, the file proves that the true ${c.parameter} is ${c.direction}. The result is statistically significant and the matter is settled.`,
        correct: false,
        why: `**"Proves" is the word a reviewer is waiting for.** A test supplies evidence at a stated error rate and never proof; a P of ${fmtP(d.p)} says data this extreme are rare if the null holds, and that is all it says. The sentence also drops the population, so it is a claim about nothing in particular, and it concedes no limitation at all — which means the reviewer gets to choose which one to raise first.`,
      },
      {
        text: `P = ${fmtP(d.p)}, so the probability that the null hypothesis is true is ${fmtP(d.p)} — less than the ${fmt(d.alpha, 2)} the office is prepared to tolerate. We therefore reject it and report that the true ${c.parameter} is ${c.direction} among ${c.overreach}.`,
        correct: false,
        why: `**A P-value is not the probability the null is true.** It is computed inside the world the null describes: the probability of a result this extreme *if* the null holds. Nothing in the procedure produces a probability for a hypothesis. The write-up then widens the claim from ${c.frame} to ${c.overreach}, which is a second and larger error, because the file contains no ${c.unit} from outside the frame.`,
      },
      {
        text: `The result clears the level, so we report convincing evidence that the true ${c.parameter} is ${c.direction} among ${c.overreach}. The conditions were checked and met, and on that basis the finding applies wherever the same hardware is in service.`,
        correct: false,
        why: `The decision and the evidence framing are both right, and the scope is wrong. Conditions being met licenses the *procedure*, not an extrapolation: this file holds ${fmtInt(d.n)} ${c.unit} from ${c.frame}, so that is the population the inference is about. "Wherever the same hardware is in service" is a claim the office has no data for, and it is the easiest thing in a report to knock down.`,
      },
      {
        text: `P = ${fmtP(d.p)} is below α = ${fmt(d.alpha, 2)}, so we reject the null. Because we rejected, the alternative is established for ${c.frame}, and no further work on this question is required.`,
        correct: false,
        why: `Rejecting the null does not establish the alternative as fact; it reports evidence against the null at a false-alarm rate of ${fmt(d.alpha, 2)}, which means a review of twenty findings like this one expects about ${fmt(20 * d.alpha, 1)} of them to be wrong in exactly this way. And "no further work required" is the line that ${c.limitation} was waiting for.`,
      },
    ]
    const chosen = [cands[0], ...rng.shuffle(cands.slice(1)).slice(0, 3)]
    const { options, correct, feedback } = shuffleChoice(rng, chosen)

    return {
      prompt: `${c.office} tested whether the ${c.parameter} is ${c.direction}, on ${fmtInt(d.n)} ${c.unit} drawn from ${c.frame}. It set $\\alpha = ${fmt(d.alpha, 2)}$ before opening the file and returned $z = ${fmt(d.z, 2)}$, $P = ${fmtP(d.p)}$.\n\nFour write-ups of the same result are on the table. **Which one would survive a reviewer who wants it not to?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A reviewer does not attack the arithmetic. They attack four other things: the word used for the strength of the claim, the population it is attached to, whether the level was set before or after the data, and whatever the write-up declined to mention.',
        'Read each one for the population it names. Then read it for the strongest word it uses — proves, establishes, settles, or evidence. Then ask what it leaves out that a reader would want.',
      ],
      solution: `**${options[correct]}**\n\nFour things make that one hard to move, and each is the answer to a question a reviewer was going to ask anyway.\n\n1. **The decision is stated with both numbers beside it.** $P = ${fmtP(d.p)}$ against $\\alpha = ${fmt(d.alpha, 2)}$, and the reader can check the comparison without being told the outcome.\n2. **The claim is framed as evidence, not as fact.** "Convincing evidence that" is the strongest phrase this procedure earns. Proof is not on the menu, and a report that claims it has handed the reviewer their first paragraph.\n3. **The population is named, and it is the one the file covers** — ${c.frame}, and nothing wider. A finding with no population attached can be stretched by whoever reads it next; one with the population written into the sentence cannot.\n4. **A limitation is conceded before it is extracted.** The argument about this file will be about ${c.limitation}, and conceding that first costs a clause. Being shown it costs the finding.\n\nNote what none of this changes: the arithmetic is identical in all four write-ups. They differ only in what they claim, for whom, and with what left out — which is where findings are actually lost.`,
      misconception: 'Treating a small P-value as proof, or as the probability the null is true, and attaching a correct result to a population the file does not cover.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. A decision judged by its odds, not by its outcome
// ---------------------------------------------------------------------------------------------

interface DecisionCase {
  /** Who decided. */
  actor: string
  /** What they decided to do. */
  action: string
  /** The thing that could go wrong, as a noun phrase. */
  hazard: string
  /** What the action was worth if nothing went wrong. */
  prize: string
  /** The bad outcome, in one clause. */
  outcome: string
  /** How the exposure was computed: two stated inputs. */
  branchA: string
  branchB: string
  /** Plausible band for each branch probability. */
  rangeA: [number, number]
  rangeB: [number, number]
}

const DECISION_CASES: readonly DecisionCase[] = [
  {
    actor: 'A survey master at Hygiea Hold',
    action: 'takes a loaded hull through the inner approach to save nine hours',
    hazard: 'a traffic hold with a loaded hull on the wrong side of it',
    prize: 'nine hours and a berth she would otherwise lose',
    outcome: 'the hold went on, she lost the berth and the cargo sat for four days',
    branchA: 'the inner approach is worked at all that shift',
    branchB: 'a hold is called while she is inside it, given that it is worked',
    rangeA: [0.4, 0.8],
    rangeB: [0.25, 0.6],
  },
  {
    actor: 'A yard chief at Thebe',
    action: 'signs a hull out on the older transponder set rather than hold it a fortnight for the new one',
    hazard: 'a dropout on an approach in traffic',
    prize: 'a fortnight of berth time and a contract the operator would otherwise lose',
    outcome: 'the set dropped on the approach and the hull was waved off twice',
    branchA: 'the set is due to fail inside the season',
    branchB: 'the failure lands on an approach rather than in open transit, given that it fails',
    rangeA: [0.3, 0.7],
    rangeB: [0.2, 0.5],
  },
  {
    actor: 'A relay officer at Carme',
    action: 'runs the survey sweep on one pass rather than two',
    hazard: 'a seal fault missed on the single pass',
    prize: 'a week of sweep time and the crew rest that goes with it',
    outcome: 'a fault was missed, and the hull came back on a tow',
    branchA: 'a hull in the sweep is carrying a fault at all',
    branchB: 'a single pass misses it, given that it is there',
    rangeA: [0.35, 0.75],
    rangeB: [0.25, 0.55],
  },
] as const

export const decisionNotOutcome = defineGenerator({
  id: 'act-10/decision-not-outcome',
  label: 'Judging a decision by its odds, not its outcome',
  ap_topics: ['6.7'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, DECISION_CASES)
    const d = retry(
      rng,
      (r) => {
        const pA = Math.round(r.uniform(c.rangeA[0], c.rangeA[1]) * 100) / 100
        const pB = Math.round(r.uniform(c.rangeB[0], c.rangeB[1]) * 100) / 100
        return { pA, pB, joint: pA * pB }
      },
      (d) => d.joint > 0.1 && d.joint < 0.45 && Math.abs(d.joint - 0.3) > 0.03,
    )
    const exposure = d.joint
    const repeats = 20

    const cands: Candidate[] = [
      {
        text: `The decision was sound and the outcome was bad, and both of those are true at once. The exposure was ${fmt(exposure, 3)}, computed from stated inputs before the fact, and an event with probability ${fmt(exposure, 3)} happens about ${fmtPct(exposure, 0)} of the time. What would make the decision wrong is an error in the inputs or in the arithmetic, and neither has been shown.`,
        correct: true,
        why: null,
      },
      {
        text: `The outcome proves the exposure was miscalculated. A ${fmtPct(exposure, 0)} risk that lands on the first attempt was not really a ${fmtPct(exposure, 0)} risk, and the branch probabilities must have been set too low.`,
        correct: false,
        why: `A single realisation cannot falsify a probability. If ${fmtPct(exposure, 0)} is the true exposure then it lands on the first attempt about ${fmtInt(Math.round(exposure * 100))} times in a hundred, which is not rare and is not evidence of anything. To argue the inputs were wrong you would need a run of attempts, or a reason the inputs were wrong that does not appeal to how this one came out.`,
      },
      {
        text: `The decision was wrong, because the safe course was available and the hazard materialised. ${c.actor.replace(/^A /, 'The ')} had the option of not taking the risk, and the ${c.hazard} is exactly what that option was for.`,
        correct: false,
        why: `This judges the choice by its result, which is the one piece of information the decision-maker did not have. The safe course was not free either: it cost ${c.prize}. A rule that only takes the risk when it comes off is not a rule anybody can follow in advance, and applied consistently it declines every favourable bet with a tail.`,
      },
      {
        text: `Neither reading applies, because ${fmt(exposure, 2)} is a long-run rate and this was a single decision. A probability cannot be attached to something that happens once, so the exposure was never a meaningful number.`,
        correct: false,
        why: `A probability computed from a model *is* how a one-off decision is priced; that is the entire use of it. The exposure is a statement about the process that produced this attempt, and it is what lets two options be compared before either is taken. Refusing to attach a number to a single decision does not make the decision safer — it makes it unexaminable afterwards.`,
      },
      {
        text: `The decision was sound because the exposure was below one half, and any risk under fifty percent is a risk worth taking.`,
        correct: false,
        why: `The threshold is not one half and there is no fixed threshold at all. What decides it is the exposure weighed against what the action buys: ${c.prize}, against ${c.hazard}. A ${fmtPct(exposure, 0)} chance is cheap for a small prize and ruinous for a large hazard, and the arithmetic that settles it is the two costs, not the number on its own.`,
      },
    ]
    const chosen = [cands[0], ...rng.shuffle(cands.slice(1)).slice(0, 3)]
    const { options, correct, feedback } = shuffleChoice(rng, chosen)

    return {
      prompt: `${c.actor} ${c.action}. Before doing it she writes the exposure down: $P(\\text{${c.branchA}}) = ${fmt(d.pA, 2)}$, and $P(\\text{${c.branchB}}) = ${fmt(d.pB, 2)}$, so the chance of ${c.hazard} is $${fmt(d.pA, 2)} \\times ${fmt(d.pB, 2)} = ${fmt(exposure, 3)}$.\n\nShe takes it. ${c.outcome.charAt(0).toUpperCase()}${c.outcome.slice(1)}.\n\nA review is convened. **Which reading of the decision is correct?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Separate two questions that the bad outcome makes very hard to separate: was the reasoning right when it was done, and did it come out well? Only one of those is a question about the decision.',
        `The exposure was ${fmt(exposure, 3)}. Ask what that number predicts: out of ${fmtInt(repeats)} decisions taken on the same odds, about how many would end the way this one did?`,
      ],
      solution: `**${options[correct]}**\n\nThe exposure was $${fmt(d.pA, 2)} \\times ${fmt(d.pB, 2)} = ${fmt(exposure, 3)}$, and that number was on the page before the decision was taken. It says that out of ${fmtInt(repeats)} decisions made on these odds, about ${fmt(repeats * exposure, 1)} end the way this one did. That is not a rare event and it is not a surprise; it is the part of the distribution the decision-maker priced and accepted.\n\nSo there are two separate questions, and a review that runs them together will get both wrong.\n\n- **Was the reasoning sound?** Check the inputs and the arithmetic: were $${fmt(d.pA, 2)}$ and $${fmt(d.pB, 2)}$ defensible when they were written, is multiplying them the right combination, and was ${c.prize} correctly weighed against ${c.hazard}? Every one of those can be audited without knowing how it came out.\n- **Did it come out well?** No. That is a fact about the world and it is worth exactly as much evidence about the reasoning as one draw from a ${fmt(exposure, 3)} distribution is worth — which is very little.\n\nThe converse is the same mistake wearing a better suit: a reckless decision that happens to come off is still a reckless decision, and nobody convenes a review for it. **What can be audited afterwards is the ledger that was written beforehand.**`,
      misconception: 'Resulting — grading a decision by its outcome. A probability describes the process, so one realisation, good or bad, is almost no evidence about whether the reasoning was right.',
    }
  },
})
