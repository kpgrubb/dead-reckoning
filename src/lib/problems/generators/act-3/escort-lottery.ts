/**
 * act-3-05 · The Escort Lottery — drills. AP 3.7: what random assignment licenses (a causal claim) and
 * what random sampling licenses (generalization); the randomization distribution as the reference for
 * "could chance alone have done this"; statistical significance against practical importance; and what
 * a trial too small to see the event can and cannot say.
 *
 *   act-3/randomization-significance  display   read significance off a randomization distribution
 *   act-3/scope-of-inference          interp    cause ← assignment, generalization ← sampling
 *   act-3/randomization-p             numeric   one- or two-sided p from a listed set of relabellings
 *   act-3/significant-vs-important    choice    significant ≠ important; not significant ≠ no effect
 *   act-3/small-trial-power           numeric   P(at least one loss) in n transits, or the n needed to see one
 *   act-3/assignment-conditions       interp    the conditions before a two-group comparison is reported
 *
 * `act-3/assignment-conditions` was split off from `act-3/small-trial-power` (the brief allowed either):
 * it is the `conditionsCheck` template item and reads better as its own drill.
 *
 * Asgard's own lottery (12 transits, 1.5 against 2.2 advisories) belongs to the mission beats; every
 * trial here is another squadron, another corridor, another fit.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { conditionsCheck } from '@/lib/problems/rubrics'
import { binomial, mean, permutationPValue, permutationTest, twoPropTest } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'
import { scopeOfInference } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Squadron {
  squadron: string
  lane: string
  cutter: string
  office: string
}

const SQUADRONS: readonly Squadron[] = [
  { squadron: 'the Tindr escort squadron', lane: 'the Adrastea feeder lane', cutter: 'CSV Tindr', office: 'the Adrastea Lane Office' },
  { squadron: 'the Vantage patrol group', lane: 'the Thebe–Amalthea shuttle run', cutter: 'CSV Vantage', office: 'the Thebe Yard traffic office' },
  { squadron: 'the Meridian squadron', lane: 'the Elara transfer corridor', cutter: 'CSV Meridian', office: 'the Elara Station berth office' },
  { squadron: 'the Skadi escort flight', lane: 'the Carme outer loop', cutter: 'CSV Skadi', office: 'the Carme relay office' },
] as const

const RESERVED_COUNTS = new Set([212, 260, 924, 88, 110, 62])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
/** The lottery's own group means, reserved for the mission beat. */
const reservedMeans = (a: number, b: number): boolean => Math.abs(a - 1.5) < 0.06 && Math.abs(b - 2.2) < 0.08

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// 1. Display — is the observed difference significant, and why?
// ---------------------------------------------------------------------------------------------

const REPS = 400

export const randomizationSignificance = defineGenerator({
  id: 'act-3/randomization-significance',
  label: 'Read significance off a randomization distribution',
  ap_topics: ['3.7'],
  skills: ['3', '4'],
  generate(rng) {
    const sq = pickContext(rng, SQUADRONS)
    const wantSignificant = rng.bool()
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(7, 9)
        const muTreated = r.uniform(1.7, 3.1)
        const shift = wantSignificant ? r.uniform(1.6, 2.6) : r.uniform(0.05, 0.4)
        const count = (mu: number) => Math.max(0, Math.round(r.normal(mu, 1.1)))
        const standard = Array.from({ length: n }, () => count(muTreated + shift))
        const damped = Array.from({ length: n }, () => count(muTreated))
        const observed = mean(standard) - mean(damped)
        return { n, standard, damped, observed }
      },
      ({ standard, damped, observed }) =>
        !reservedMeans(mean(damped), mean(standard)) &&
        new Set(standard.concat(damped)).size >= 4 &&
        (wantSignificant ? observed >= 1.45 : observed >= 0.03 && observed <= 0.45),
    )
    const { n, standard, damped } = draw
    const perm = permutationTest(standard, damped, { rng, reps: REPS, statistic: 'mean-diff', alt: 'greater' })
    const observed = perm.observed
    const p = perm.pValue
    const significant = p < 0.05
    const binWidth = 2 / n
    const cands: Candidate[] = [
      {
        text: `**Statistically significant.** The observed difference of ${fmt(observed, 2)} advisories sits out in the right-hand tail of the randomization distribution: only about ${fmtPct(p, 1)} of the ${fmtInt(REPS)} relabellings produced a difference that large or larger.`,
        correct: significant,
        why: significant ? null : `Look again at where ${fmt(observed, 2)} falls on the display. About ${fmtPct(p, 1)} of the relabellings reach it — that is not a tail, that is the middle of the pile. Chance assignment produces a gap this size routinely.`,
      },
      {
        text: `**Not statistically significant.** The observed difference of ${fmt(observed, 2)} advisories sits inside the bulk of the randomization distribution: about ${fmtPct(p, 1)} of the ${fmtInt(REPS)} relabellings produced a difference that large or larger.`,
        correct: !significant,
        why: !significant ? null : `Look again at where ${fmt(observed, 2)} falls on the display. Only about ${fmtPct(p, 1)} of the relabellings reach it — it is out in the tail, not in the bulk. A result that rare under pure relabelling is what "significant" means.`,
      },
      {
        text: `**Statistically significant**, because the two group means differ by ${fmt(observed, 2)} advisories per transit, which is a difference the squadron would notice.`,
        correct: false,
        why: `That is a judgement about the *size* of the difference, not about significance. Significance asks a different question: how often does relabelling alone, with no real effect at all, produce a gap this large? The display answers it — about ${fmtPct(p, 1)} of the time.`,
      },
      {
        text: `**Not statistically significant**, because ${fmtInt(n)} transits per group is far too few for any comparison to mean anything.`,
        correct: false,
        why: `The group sizes are already built into the display: the randomization distribution was generated by relabelling these same ${fmtInt(2 * n)} transits, so its width already reflects how small the trial is. Read the verdict off where the observed value falls, not off the group sizes.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sq.squadron} ran a trial on ${sq.lane}. ${fmtInt(2 * n)} transits were booked; **${fmtInt(n)} were drawn by lot** for the new drive-plume damper and the other ${fmtInt(n)} flew the standard fit. Off-nominal advisories filed:\n\n- standard fit (${fmtInt(n)} transits): ${standard.join(', ')} — mean ${fmt(mean(standard), 2)}\n- new damper (${fmtInt(n)} transits): ${damped.join(', ')} — mean ${fmt(mean(damped), 2)}\n\nObserved difference (standard − damper): **${fmt(observed, 2)} advisories per transit**.\n\nThe display below is the **randomization distribution**: the ${fmtInt(2 * n)} observed advisory counts were re-dealt at random into a group of ${fmtInt(n)} and a group of ${fmtInt(n)}, ${fmtInt(REPS)} times over, and the difference in means recorded each time. It shows what chance assignment alone produces when the damper does nothing.\n\nIs the observed difference statistically significant, and why?`,
      answer: {
        type: 'display',
        display: { kind: 'histogram', values: perm.stats, binWidth, label: `difference in mean advisories (standard − damper) over ${fmtInt(REPS)} random relabellings` },
        question: { type: 'choice', options, correct, feedback },
      },
      hints: [
        'Significance is never read off the size of a difference. It is read off the *position* of that difference in the distribution of differences chance alone would produce. Find the observed value on the horizontal axis and ask how much of the histogram lies at or beyond it.',
        `The observed value is ${fmt(observed, 2)}. Count the share of the ${fmtInt(REPS)} relabellings that landed at or above it, and compare that share with the conventional 0.05.`,
      ],
      solution: `Of the ${fmtInt(REPS)} relabellings, ${fmtInt(Math.round(p * REPS))} produced a difference of ${fmt(observed, 2)} or more, so\n\n$$P = \\frac{${Math.round(p * REPS)}}{${REPS}} = ${fmtP(p)}$$\n\n**${options[correct]}**\n\nThe reasoning runs one way only: build the distribution of what relabelling alone does, then locate the observed value in it. ${significant ? `Here the observed ${fmt(observed, 2)} is beyond almost everything chance produced, so "the damper did nothing and the lot happened to fall this way" is a poor explanation of the data.` : `Here the observed ${fmt(observed, 2)} sits where chance assignment lands routinely, so "the damper did nothing and the lot happened to fall this way" explains the data perfectly well. That is *not* a finding that the damper does nothing — it is a finding that this trial cannot tell.`}`,
      misconception: 'Judging significance by how big the difference looks. The randomization distribution is the only reference that matters: a large difference in a wide distribution is unremarkable, and a small one in a narrow distribution can be extraordinary.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — scope of inference
// ---------------------------------------------------------------------------------------------

interface ScopeSetting {
  treatment: string
  treatmentNoun: string
  response: string
  population: (sq: Squadron, N: number) => string
  assigned: (sq: Squadron, n: number) => string
  notAssigned: (sq: Squadron, n: number) => string
  sampled: (n: number, N: number) => string
  notSampled: (sq: Squadron, n: number) => string
}

const SCOPE_SETTINGS: readonly ScopeSetting[] = [
  {
    treatment: 'the cutter escort',
    treatmentNoun: 'escort',
    response: 'the off-nominal advisory count',
    population: (sq, N) => `all ${fmtInt(N)} transits booked on ${sq.lane} this season`,
    assigned: (sq, n) => `${sq.squadron} drew ${fmtInt(n / 2)} of the ${fmtInt(n)} transits by lot for a cutter escort and left the rest unescorted`,
    notAssigned: (sq, n) => `${fmtInt(n / 2)} of the ${fmtInt(n)} transits had asked ${sq.squadron} for a cutter and got one; the rest had not asked`,
    sampled: (n, N) => `the ${fmtInt(n)} transits drawn at random from the ${fmtInt(N)} on the season's register`,
    notSampled: (sq, n) => `the ${fmtInt(n)} transits whose masters volunteered at the ${sq.office} counter`,
  },
  {
    treatment: 'the new drive-plume damper',
    treatmentNoun: 'damper',
    response: 'the peak heat-sink load',
    population: (sq, N) => `all ${fmtInt(N)} hulls endorsed for ${sq.lane}`,
    assigned: (sq, n) => `${sq.office} assigned the new damper by lot to ${fmtInt(n / 2)} of the ${fmtInt(n)} hulls and left the other ${fmtInt(n / 2)} on the standard fit`,
    notAssigned: (sq, n) => `${fmtInt(n / 2)} of the ${fmtInt(n)} hulls had already bought the new damper from ${sq.office}; the other ${fmtInt(n / 2)} had not`,
    sampled: (n, N) => `the ${fmtInt(n)} hulls drawn at random from the ${fmtInt(N)} on the endorsement register`,
    notSampled: (sq, n) => `the ${fmtInt(n)} hulls that happened to be in the ${sq.office} refit queue that month`,
  },
  {
    treatment: 'the tight formation order',
    treatmentNoun: 'order',
    response: 'the mean transit time',
    population: (sq, N) => `all ${fmtInt(N)} convoy legs run on ${sq.lane} this season`,
    assigned: (sq, n) => `${sq.squadron} drew ${fmtInt(n / 2)} of the ${fmtInt(n)} legs by lot to fly under the tight formation order`,
    notAssigned: (sq, n) => `${fmtInt(n / 2)} of the ${fmtInt(n)} legs were flown under the tight order by convoy masters who preferred it, and ${sq.squadron} recorded which`,
    sampled: (n, N) => `the ${fmtInt(n)} legs drawn at random from the ${fmtInt(N)} on the season's schedule`,
    notSampled: (sq, n) => `the ${fmtInt(n)} legs whose masters answered a notice on ${sq.office}'s board`,
  },
] as const

export const scopeOfInferenceDrill = defineGenerator({
  id: 'act-3/scope-of-inference',
  label: 'What this study licenses',
  ap_topics: ['3.7'],
  skills: ['4'],
  generate(rng) {
    const sq = pickContext(rng, SQUADRONS)
    const s = pickContext(rng, SCOPE_SETTINGS)
    const randomAssignment = rng.bool()
    const randomSample = rng.bool()
    const { n, N } = retry(
      rng,
      (r) => {
        const n = 2 * r.int(11, 34)
        return { n, N: n + r.int(120, 420) }
      },
      ({ n, N }) => ![n, N].some(reservedCount),
    )
    const population = s.population(sq, N)
    const sampleDescription = randomSample ? s.sampled(n, N) : s.notSampled(sq, n)
    const answer = scopeOfInference({
      randomAssignment,
      randomSample,
      treatment: s.treatment,
      treatmentNoun: s.treatmentNoun,
      response: s.response,
      population,
      sampleDescription,
    })
    const howChosen = randomSample
      ? `The study used ${sampleDescription}.`
      : `The study used ${sampleDescription} — no draw was made from the register.`
    const howTreated = randomAssignment ? `${s.assigned(sq, n)}.` : `${s.notAssigned(sq, n)}.`
    return {
      prompt: `${howChosen} ${howTreated} The two groups' **${s.response}** differed, and the difference was large enough to be statistically significant.\n\nIn two or three sentences, state exactly what this study licenses: whether the difference in ${s.response} can be attributed to ${s.treatment} and **why**, and whether the finding extends to ${population} and **why**. Write it in context.`,
      answer,
      hints: [
        'Two independent questions with two independent answers. **Cause** comes from how the units were *treated*: only random assignment makes the two groups alike in everything but the treatment. **Generalization** comes from how the units were *chosen*: only random sampling makes them stand for a wider population. Neither buys the other.',
        `Here the units were ${randomAssignment ? 'assigned to the treatment **by lot**' : 'in their groups **before anyone recorded anything**'}, and they were ${randomSample ? 'drawn **at random** from the register' : '**not** drawn at random — they selected themselves'}. Write one clause for each verdict, each with its reason attached.`,
        `Say both verdicts explicitly, and attach the right reason to each — the commonest failure on this item is giving the right verdicts for the wrong reasons, or borrowing the assignment to justify the generalization.`,
      ],
      solution: `**${answer.exemplar}**\n\n| | random assignment | no random assignment |\n| --- | --- | --- |\n| **random sample** | cause **and** generalization | generalization only |\n| **not a random sample** | cause only, for these units | neither |\n\nThis study sits in the ${randomSample ? (randomAssignment ? 'top-left' : 'top-right') : randomAssignment ? 'bottom-left' : 'bottom-right'} cell: ${randomAssignment ? 'assignment was by lot' : 'assignment was not random'} and ${randomSample ? 'the units were a random sample' : 'the units were not a random sample'}. Significance changes nothing in the table — it tells you the difference is hard to put down to chance, and the table tells you what the difference is allowed to mean.`,
      misconception: 'Using one randomization to buy both things. Random assignment never widens the population a finding reaches, and a random sample never licenses "because" on its own.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — the p-value from a listed randomization distribution
// ---------------------------------------------------------------------------------------------

export const randomizationP = defineGenerator({
  id: 'act-3/randomization-p',
  label: 'p-value from a listed randomization distribution',
  ap_topics: ['3.7'],
  skills: ['3'],
  generate(rng) {
    const sq = pickContext(rng, SQUADRONS)
    const twoSided = rng.bool()
    const alt = twoSided ? ('two-sided' as const) : ('greater' as const)
    const d = retry(
      rng,
      (r) => {
        const reps = r.int(20, 30)
        const spread = r.uniform(0.35, 0.8)
        const stats = Array.from({ length: reps }, () => Math.round(r.normal(0, spread) * 4) / 4)
        const observed = Math.round(r.uniform(0.5, 1.5) * 4) / 4
        const p = permutationPValue(stats, observed, alt)
        const count = Math.round(p * reps)
        return { reps, stats, observed, p, count }
      },
      ({ reps, stats, observed, count, p }) =>
        count >= 2 &&
        count <= reps - 4 &&
        observed > 0 &&
        new Set(stats).size >= 6 &&
        // Keep clear of the Act's own headline figures (0.94, 0.31, 0.23).
        ![0.94, 0.31, 0.23].some((r) => Math.abs(p - r) < 0.002),
    )
    const { reps, stats, observed, p, count } = d
    const sorted = [...stats].sort((a, b) => a - b)
    const extremeWord = twoSided ? `at least ${fmt(observed, 2)} in absolute value` : `at least ${fmt(observed, 2)}`
    const columns = ['relabelling', 'difference in mean advisories (escorted − unescorted)']
    const rows: (string | number)[][] = stats.map((v, i) => [i + 1, fmt(v, 2)])
    return {
      prompt: `${sq.squadron} assigned a cutter escort by lot on ${sq.lane} and observed a difference in mean advisories of **${fmt(observed, 2)}** between the escorted and unescorted groups.\n\nTo see what chance assignment alone would do, the same advisory counts were re-dealt at random into two groups ${fmtInt(reps)} times. The ${fmtInt(reps)} differences, in the order they were generated:\n\n${tableMd(columns, rows)}\n\nSorted, they run: ${sorted.map((v) => fmt(v, 2)).join(', ')}.\n\nCompute the **${twoSided ? 'two-sided' : 'one-sided (upper-tail)'}** randomization p-value for the observed difference of ${fmt(observed, 2)}. Give a proportion to four decimal places.`,
      answer: numericAnswer(p, 'pValue'),
      hints: [
        `A randomization p-value is a counting problem, not a formula. Count the relabellings that are at least as extreme as the observed value ${twoSided ? '— and "as extreme" for a two-sided question means as far from zero **in either direction**' : '— and here "as extreme" means as far **up** as the observed value, because the question is one-sided'}, and divide by the number of relabellings.`,
        `Work down the sorted list and mark every value ${extremeWord}. There are ${fmtInt(reps)} relabellings in all.`,
        `$\\text{count} / ${reps}$, to four decimal places.`,
      ],
      solution: `${twoSided ? `Two-sided: a relabelling counts when $|{\\text{difference}}| \\ge ${fmt(observed, 2)}$, so values at or below $-${fmt(observed, 2)}$ count as well as values at or above $+${fmt(observed, 2)}$.` : `One-sided (upper tail): a relabelling counts only when its difference is $\\ge ${fmt(observed, 2)}$. A large *negative* difference is evidence in the opposite direction and does not count.`}\n\nMarking the sorted list gives ${fmtInt(count)} such relabellings out of ${fmtInt(reps)}:\n\n$$P = \\frac{${count}}{${reps}} = ${fmt(p, 4)}$$\n\n**${fmt(p, 4)}** — a difference at least this extreme turns up in about ${fmtPct(p, 0)} of random relabellings when the escort does nothing at all.`,
      misconception: twoSided
        ? 'Counting only the upper tail on a two-sided question. If the question does not name a direction in advance, a difference of the same size the other way is equally extreme and must be counted.'
        : 'Counting both tails on a one-sided question. The alternative names a direction, so only relabellings that go that way — and at least as far — are evidence.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — significant, important, neither, both
// ---------------------------------------------------------------------------------------------

export const significantVsImportant = defineGenerator({
  id: 'act-3/significant-vs-important',
  label: 'Significant, important, or neither',
  ap_topics: ['3.7'],
  skills: ['4'],
  generate(rng) {
    const sq = pickContext(rng, SQUADRONS)
    const bigTrial = rng.bool()

    if (bigTrial) {
      const d = retry(
        rng,
        (r) => {
          const n = 1000 * r.int(19, 46)
          const p2 = r.uniform(0.3, 0.55)
          const gap = r.uniform(0.008, 0.016)
          const x2 = Math.round(n * p2)
          const x1 = Math.round(n * (p2 + gap))
          const test = twoPropTest({ x1, n1: n, x2, n2: n, alt: 'two-sided' })
          return { n, x1, x2, test, effect: x1 / n - x2 / n }
        },
        ({ n, test, effect }) => !reservedCount(n) && (test.pValue ?? 1) < 0.01 && effect > 0.007 && effect < 0.018,
      )
      const { n, x1, x2, test, effect } = d
      const p = test.pValue ?? 0
      const cands: Candidate[] = [
        {
          text: `**Statistically significant but not practically important.** With ${fmtInt(2 * n)} transits on file, $P = ${fmtP(p)}$: a gap this large is very hard to put down to chance. But the gap itself is only ${fmt(effect * 100, 1)} percentage points — about ${fmtInt(Math.round(effect * 1000))} advisories in every thousand transits — which is not a difference the squadron would reorganise around.`,
          correct: true,
          why: null,
        },
        {
          text: `**Significant, therefore important.** $P = ${fmtP(p)}$ is far below 0.05, so the old order really is worse and the squadron should switch.`,
          correct: false,
          why: `"Significant" says only that chance is a poor explanation of the gap. It says nothing whatever about whether the gap is big enough to act on. With $n = ${fmtInt(n)}$ per group, a gap of ${fmt(effect * 100, 1)} points clears the significance bar easily and still means almost nothing operationally.`,
        },
        {
          text: `**Not significant**, because a difference of only ${fmt(effect * 100, 1)} percentage points is far too small to be real.`,
          correct: false,
          why: `Size and significance are separate. Whether a gap is distinguishable from chance depends on the gap *and* the sample size: at ${fmtInt(n)} transits per group the standard error is tiny, so even ${fmt(effect * 100, 1)} points gives $P = ${fmtP(p)}$.`,
        },
        {
          text: `**Significant and important**, because the p-value of ${fmtP(p)} measures how large the effect is, and it is very small — so the effect is very large.`,
          correct: false,
          why: `A p-value is not an effect size. It is the probability of data at least this extreme if there were no difference at all; it shrinks with sample size as well as with effect size, and a huge file like this one drives it down on its own.`,
        },
      ]
      const { options, correct, feedback } = shuffleChoice(rng, cands)
      return {
        prompt: `${sq.office} has the full advisory file for ${sq.lane}: ${fmtInt(n)} transits flown under the old formation order, of which ${fmtInt(x1)} filed an off-nominal advisory, and ${fmtInt(n)} flown under the new order, of which ${fmtInt(x2)} did.\n\nThat is ${fmtPct(x1 / n, 1)} against ${fmtPct(x2 / n, 1)} — a gap of ${fmt(effect * 100, 1)} percentage points — and a two-proportion z-test gives $P = ${fmtP(p)}$.\n\nWhat does this result license?`,
        answer: { type: 'choice', options, correct, feedback },
        hints: [
          'Answer two questions separately, then put them together. *Is chance a plausible explanation?* — that is the p-value. *Is the difference big enough to change what anyone does?* — that is the effect size, and no p-value can answer it.',
          `The effect is ${fmtPct(x1 / n, 1)} − ${fmtPct(x2 / n, 1)} = ${fmt(effect * 100, 1)} percentage points. The p-value is ${fmtP(p)}. Ask what each one is telling you, and notice how large $n$ is.`,
        ],
        solution: `$$\\hat p_1 - \\hat p_2 = ${fmt(x1 / n, 4)} - ${fmt(x2 / n, 4)} = ${fmt(effect, 4)}, \\qquad z = ${fmt(test.statistic, 2)}, \\qquad P = ${fmtP(p)}$$\n\n**${options[correct]}**\n\nWith ${fmtInt(n)} transits in each group the standard error is ${fmt(test.se, 5)}, so a gap of ${fmt(effect, 4)} is ${fmt(Math.abs(test.statistic), 1)} standard errors out — comfortably significant. The same gap on ${fmtInt(200)} transits per group would not have been. Significance is a statement about how well chance explains the data; importance is a judgement about the size of the effect, and it is made by the squadron, not by the arithmetic.`,
        misconception: 'Reading a small p-value as a large effect. The p-value falls when the sample grows, so a big enough file makes any real difference, however trivial, statistically significant.',
      }
    }

    const d = retry(
      rng,
      (r) => {
        const n = r.int(24, 40)
        const p2 = r.uniform(0.22, 0.4)
        const gap = r.uniform(0.17, 0.26)
        const x2 = Math.round(n * p2)
        const x1 = Math.round(n * (p2 + gap))
        const test = twoPropTest({ x1, n1: n, x2, n2: n, alt: 'two-sided' })
        return { n, x1, x2, test, effect: x1 / n - x2 / n }
      },
      ({ n, x1, x2, test, effect }) => !reservedCount(n) && x1 < n && x2 >= 4 && (test.pValue ?? 0) > 0.09 && effect > 0.14,
    )
    const { n, x1, x2, test, effect } = d
    const p = test.pValue ?? 1
    const cands: Candidate[] = [
      {
        text: `**A large difference, but not statistically significant — and that is not the same as no difference.** The gap is ${fmt(effect * 100, 0)} percentage points, which would matter a great deal if it were real, but $P = ${fmtP(p)}$: with only ${fmtInt(n)} transits per group, chance assignment produces a gap this large often enough that the trial cannot settle it either way.`,
        correct: true,
        why: null,
      },
      {
        text: `**The escort has no effect on advisories.** $P = ${fmtP(p)}$ is above 0.05, so the trial has shown that escorting makes no difference.`,
        correct: false,
        why: `"No evidence of a difference" and "evidence of no difference" are different findings, and only the first one is available here. A trial this small would also have failed to detect a genuine ${fmt(effect * 100, 0)}-point effect much of the time — failing to find something is not finding that it is absent.`,
      },
      {
        text: `**Statistically significant**, because ${fmt(effect * 100, 0)} percentage points is a large gap and a large gap cannot be chance.`,
        correct: false,
        why: `A large gap certainly can be chance when the groups are this small. Relabelling ${fmtInt(2 * n)} transits at random produces a gap of ${fmt(effect * 100, 0)} points about ${fmtPct(p, 0)} of the time, which is why $P = ${fmtP(p)}$.`,
      },
      {
        text: `**Not significant and therefore not important** — a difference that fails a significance test is by definition too small to matter.`,
        correct: false,
        why: `Importance is about the size of the effect and significance is about the evidence for it. Here the observed gap of ${fmt(effect * 100, 0)} points is operationally enormous; what the trial lacks is the size to tell whether it is real. The right response is a bigger trial, not a shrug.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${sq.squadron} ran a small trial on ${sq.lane}: ${fmtInt(n)} transits assigned by lot to an escort and ${fmtInt(n)} to none. ${fmtInt(x1)} of the ${fmtInt(n)} unescorted transits filed an off-nominal advisory, against ${fmtInt(x2)} of the ${fmtInt(n)} escorted.\n\nThat is ${fmtPct(x1 / n, 0)} against ${fmtPct(x2 / n, 0)} — a gap of ${fmt(effect * 100, 0)} percentage points — and a two-proportion z-test gives $P = ${fmtP(p)}$.\n\nWhat does this result license?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Answer two questions separately. *How big is the difference?* — read it off the two proportions. *How well does chance explain it?* — read that off the p-value. A result can be large and unconvincing at the same time; that is the usual state of a small trial.',
        `The gap is ${fmt(effect * 100, 0)} percentage points and $P = ${fmtP(p)}$. Ask what a p-value above 0.05 does and does not entitle you to say — in particular, whether "we did not find it" is the same claim as "it is not there".`,
      ],
      solution: `$$\\hat p_1 - \\hat p_2 = ${fmt(x1 / n, 3)} - ${fmt(x2 / n, 3)} = ${fmt(effect, 3)}, \\qquad z = ${fmt(test.statistic, 2)}, \\qquad P = ${fmtP(p)}$$\n\n**${options[correct]}**\n\nWith ${fmtInt(n)} per group the standard error is ${fmt(test.se, 3)} — nearly as large as the effect itself — so the trial simply has no resolution. Two things follow, and only two. The data do not provide convincing evidence of a difference. And the data do not provide evidence that there is none: a trial this size would miss a real effect of this magnitude a great deal of the time.`,
      misconception: 'Reading "not significant" as "no effect". A test that fails to reject is a test that could not tell — which, in a small trial, is the expected outcome whether or not the effect is real.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — could a trial this small have seen a loss at all?
// ---------------------------------------------------------------------------------------------

export const smallTrialPower = defineGenerator({
  id: 'act-3/small-trial-power',
  label: 'Could the trial have seen a loss?',
  ap_topics: ['3.7'],
  skills: ['3'],
  generate(rng) {
    const sq = pickContext(rng, SQUADRONS)
    const invert = rng.bool()

    if (!invert) {
      const drawn = retry(
        rng,
        (r) => {
          const pLoss = Math.round(r.uniform(0.006, 0.018) * 1000) / 1000
          const n = r.int(12, 40)
          return { pLoss, n, prob: binomial.atLeast(1, n, pLoss) }
        },
        ({ n, prob }) => !reservedCount(n) && ![0.94, 0.31, 0.23].some((x) => Math.abs(prob - x) < 0.002),
      )
      const { pLoss, n, prob } = drawn
      return {
        prompt: `On ${sq.lane} a hull is lost on about **${fmtPct(pLoss, 1)}** of transits — ${fmt(pLoss, 3)} per transit — and transits are independent of one another.\n\n${sq.squadron}'s escort trial ran **${fmtInt(n)} transits** and recorded no losses. The squadron's bulletin reports this as evidence that the escort works.\n\nIf the escort did nothing at all, what is the probability that **at least one** loss would have been seen in ${fmtInt(n)} transits? Give a proportion to three decimal places.`,
        answer: numericAnswer(prob, 'proportion', { digits: 3 }),
        hints: [
          `Count the losses as a binomial count: ${fmtInt(n)} independent transits, each a loss with the same probability. "At least one" is the complement of a much easier event — no losses at all.`,
          `$P(\\text{at least one}) = 1 - P(\\text{none}) = 1 - (1 - ${fmt(pLoss, 3)})^{${n}}$.`,
          `Work out $(1 - ${fmt(pLoss, 3)})^{${n}}$ first, then subtract from 1, and round to three decimals.`,
        ],
        solution: `$$P(X \\ge 1) = 1 - P(X = 0) = 1 - (1 - ${fmt(pLoss, 3)})^{${n}} = 1 - ${fmt((1 - pLoss) ** n, 4)} = ${fmt(prob, 4)}$$\n\n**${fmt(prob, 3)}**.\n\nEven with the escort doing nothing whatever, a trial of ${fmtInt(n)} transits would have seen no loss about ${fmtPct(1 - prob, 0)} of the time. "No losses in ${fmtInt(n)} transits" is therefore the *expected* outcome of a trial this size, and it is exactly what a useless escort would produce. The bulletin has reported the absence of an event the trial was never large enough to observe.`,
        misconception: `Reading zero losses as evidence of safety. Before a null result means anything you must ask what the trial would have shown had the effect been absent — here, the same thing, about ${fmtPct(1 - prob, 0)} of the time.`,
      }
    }

    const target = rng.bool() ? 0.5 : 0.8
    const pLoss = retry(
      rng,
      (r) => Math.round(r.uniform(0.006, 0.018) * 1000) / 1000,
      (v) => v > 0 && !reservedCount(Math.ceil(Math.log(1 - target) / Math.log(1 - v))),
    )
    let nNeeded = 1
    while (binomial.atLeast(1, nNeeded, pLoss) < target && nNeeded < 5000) nNeeded++
    const reached = binomial.atLeast(1, nNeeded, pLoss)
    const justBelow = binomial.atLeast(1, nNeeded - 1, pLoss)
    return {
      prompt: `On ${sq.lane} a hull is lost on about **${fmtPct(pLoss, 1)}** of transits — ${fmt(pLoss, 3)} per transit — and transits are independent of one another.\n\n${sq.squadron} wants a trial large enough that, if the escort changes nothing, there is at least a **${fmtPct(target, 0)}** chance of seeing at least one loss during it.\n\nHow many transits must the trial run? Give the smallest whole number of transits.`,
      answer: numericAnswer(nNeeded, 'count'),
      hints: [
        'Turn "at least one" into its complement before you do anything else: seeing at least one loss is the opposite of seeing none, and seeing none is a single product.',
        `You need $1 - (1 - ${fmt(pLoss, 3)})^{n} \\ge ${fmt(target, 2)}$, which is $(1 - ${fmt(pLoss, 3)})^{n} \\le ${fmt(1 - target, 2)}$.`,
        `Take logs: $n \\ge \\ln(${fmt(1 - target, 2)}) / \\ln(1 - ${fmt(pLoss, 3)})$, then round **up** to a whole transit.`,
      ],
      solution: `$$1 - (1 - ${fmt(pLoss, 3)})^{n} \\ge ${fmt(target, 2)} \\iff (1 - ${fmt(pLoss, 3)})^{n} \\le ${fmt(1 - target, 2)} \\iff n \\ge \\frac{\\ln ${fmt(1 - target, 2)}}{\\ln(1 - ${fmt(pLoss, 3)})} = ${fmt(Math.log(1 - target) / Math.log(1 - pLoss), 2)}$$\n\nRounding up: **${fmt(nNeeded, 0)} transits**. Checking, $P(\\text{at least one}) = ${fmt(reached, 4)}$ at $n = ${nNeeded}$ and only ${fmt(justBelow, 4)} at $n = ${nNeeded - 1}$.\n\nThat is the scale a trial needs before "no losses" carries any information at all. A dozen or two dozen transits cannot see a one-in-a-hundred event, so a dozen transits without one is not a finding about escorts — it is a finding about the trial.`,
      misconception: 'Rounding the required n down, or estimating it as 1/p (which is the mean wait for a loss, not the n that gives a stated chance of seeing one).',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — the conditions before the comparison is reported
// ---------------------------------------------------------------------------------------------

export const assignmentConditions = defineGenerator({
  id: 'act-3/assignment-conditions',
  label: 'Conditions before the comparison is reported',
  ap_topics: ['3.6', '3.7'],
  skills: ['4'],
  generate(rng) {
    const sq = pickContext(rng, SQUADRONS)
    const { n1, n2 } = retry(
      rng,
      (r) => {
        const n1 = r.int(14, 30)
        return { n1, n2: n1 + r.int(-4, 4) }
      },
      ({ n1, n2 }) => n2 >= 12 && Math.abs(n1 - n2) >= 1 && ![n1, n2].some(reservedCount),
    )
    const context = `transits on ${sq.lane}`
    const answer = conditionsCheck({ procedure: 'two-mean-t', random: 'assignment', n: [n1, n2], normal: 'graph', context })
    return {
      prompt: `${sq.squadron} assigned ${fmtInt(n1 + n2)} booked transits on ${sq.lane} **by lot**: ${fmtInt(n1)} flew with a cutter escort and ${fmtInt(n2)} flew without. Off-nominal advisories were counted on each transit. Dotplots of the two groups are roughly symmetric, with no outliers and no strong skew in either.\n\nBefore the two-group comparison of mean advisory counts goes into the report, state the conditions that justify it — Random, Independent and Normal — **with the numbers**, in context.`,
      answer,
      hints: [
        'Three conditions, always in the same order: where the randomness came from, why the observations can be treated as independent, and why the sampling distribution of the difference in means is close enough to Normal.',
        `This is an experiment, so the randomness is in the **assignment**, not in a draw from a population — say so, and note what random assignment does for independence between the groups. For the shape condition the group sizes (${fmtInt(n1)} and ${fmtInt(n2)}) are below 30, so the justification has to come from the **graphs**.`,
        'Name all three, each with the specific feature that satisfies it: the lot, the assignment, and what the two dotplots look like.',
      ],
      solution: `**${answer.exemplar}**\n\nTwo details are the ones usually dropped. First, in an *experiment* the Random condition is satisfied by random **assignment**, not by a random sample — the transits were the ones already booked, and no draw from a population took place. Second, with ${fmtInt(n1)} and ${fmtInt(n2)} transits per group you are below the $n \\ge 30$ threshold, so the central limit theorem is not available and the Normal condition must be argued from the dotplots: roughly symmetric, no outliers, no strong skew.`,
      misconception: 'Claiming a random sample when only the assignment was random, or invoking the central limit theorem at group sizes well below 30.',
    }
  },
})
