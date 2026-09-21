/**
 * act-5-04 · Proportions in the Noise — drills. AP 5.5 and 5.6: the mean and standard deviation of
 * p̂ and the conditions that license a normal model for it; the mean and standard deviation of
 * p̂₁ − p̂₂ under a common rate, where variances add and standard deviations never subtract;
 * probabilities about a proportion and about a gap between two proportions; and the inverse
 * question — how large a gap would have to be before it counted as rare.
 *
 *   act-5/sd-of-phat                       numeric  mean and SD of p̂ at a known Lane rate, with the large-counts numbers
 *   act-5/large-counts-check               choice   does a normal model apply to p̂ here — and which condition decides it
 *   act-5/probability-about-phat           numeric  P(p̂ ≥ v) or P(p̂ ≤ v) for one fleet at a known rate
 *   act-5/sd-of-difference-proportions     numeric  SD of p̂₁ − p̂₂ for two fleets under a COMMON rate
 *   act-5/gap-that-would-be-rare           numeric  the gap in loss proportions that would be a 1-in-q event
 *   act-5/interpret-proportion-probability interp   that probability as a long-run proportion, under an assumed common rate
 *
 * Act V builds the null model; Act VI runs the test. Nothing in this file computes the Ledger's
 * observed gap (19 in 900 against 12 in 1,712), a two-proportion z, or a P-value for it, and no item
 * states a significance conclusion. Every gap asked about here is a *hypothetical* one, put to a
 * distribution that was built on the assumption that nothing is wrong. That assumption is the whole
 * point: you cannot say a number is strange until you have built the distribution of ordinary.
 *
 * The Ledger's own figures (900 and 1,712 transits at 31/2,612) belong to the module text and the
 * mission beats; `reservedSize` and `reservedRate` keep every draw off them.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { largeCountsCondition, normal, samplingSdProportion, tenPercentCondition } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { LEDGER_N, POOLED_RATE, sdOfDifferenceOfProportions } from '@/instruments/act-5/data'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Fleet {
  /** How the Lane Authority's Transit Ledger prints the owner class. */
  name: string
  /** Short form for tables and second references. */
  short: string
}

const FLEETS: readonly Fleet[] = [
  { name: 'the Perrine hulls', short: 'Perrine' },
  { name: 'the Mercantile hulls', short: 'Mercantile' },
  { name: 'the independent hulls', short: 'independents' },
  { name: 'the Thebe Yard consignment hulls', short: 'Thebe Yard' },
  { name: 'the Valhalla-endorsed hulls', short: 'Valhalla endorsements' },
  { name: 'the Adrastea feeder hulls', short: 'Adrastea feeders' },
] as const

/** Windows of the Ledger, so two draws never read as the same season. */
const WINDOWS: readonly string[] = [
  'over the 2178–2180 window',
  'over the 2181–2184 window',
  'in the Ledger’s first three years',
  'in the Ledger’s last four years',
  'over the whole six-year snapshot',
] as const

/** Who wants the number, and how they ask for it. */
const OFFICERS: readonly string[] = [
  'LCDR Ferrier wants it on the plot before she takes it to Valhalla',
  'Ensign Ebele is building the null model and needs it written down',
  'the *Nightjar*’s analysis watch wants it logged before the next burn',
] as const

const MIN_RATE = 0.004
const MAX_RATE = 0.035

/** The Ledger's own fleet sizes — reserved for the module text and the mission beats. */
const RESERVED_SIZES = new Set([880, 900, 1710, 2610])
const reservedSize = (n: number): boolean => RESERVED_SIZES.has(n)
/** The Lane's own pooled rate, 31/2,612 — likewise reserved. */
const reservedRate = (p: number): boolean => Math.abs(p - POOLED_RATE) < 0.0005

/** A published rate, as the Authority quotes it: a proportion and a per-thousand figure. */
const rateText = (p: number): string => `$p = ${fmt(p, 4)}$ — ${fmt(p * 1000, 1)} losses per thousand transits`

/** Sentence-case a fragment (fleet names and officer lines all start lower-case). */
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

interface OneFleetDraw {
  n: number
  p: number
  np: number
  nq: number
}

/**
 * Draw a published Lane rate and a fleet size so that the expected loss count n·p lands in
 * [npLo, npHi] — the lever that decides whether Large Counts passes, fails, or passes narrowly the
 * way the Lane's own 900 × 0.0119 ≈ 10.7 does.
 */
function drawOneFleet(rng: Rng, npLo: number, npHi: number): OneFleetDraw {
  return retry(
    rng,
    (r) => {
      const npTarget = r.uniform(npLo, npHi)
      const nLo = Math.max(150, Math.ceil(npTarget / MAX_RATE / 10) * 10)
      const nHi = Math.min(2200, Math.floor(npTarget / MIN_RATE / 10) * 10)
      const n = r.int(nLo / 10, Math.max(nLo / 10, nHi / 10)) * 10
      const p = Math.round((npTarget / n) * 1e4) / 1e4
      return { n, p, np: n * p, nq: n * (1 - p) }
    },
    ({ n, p, np }) => p >= MIN_RATE && p <= MAX_RATE && np >= npLo - 0.4 && np <= npHi + 0.4 && !reservedSize(n) && !reservedRate(p),
  )
}

interface TwoFleetDraw {
  p: number
  n1: number
  n2: number
}

/**
 * Two fleets under one common rate, both large enough that Large Counts holds on each — the SD of a
 * difference is only worth computing where a normal model for it is legitimate. A third of draws are
 * deliberately close in size, so the answer is never "the small one carries everything".
 */
function drawTwoFleets(rng: Rng): TwoFleetDraw {
  return retry(
    rng,
    (r) => {
      const p = Math.round(r.uniform(0.008, 0.035) * 1e4) / 1e4
      const lo = Math.max(15, Math.ceil(10 / p / 10))
      const n1 = r.int(lo, 220) * 10
      const n2 = r.bool(0.35) ? Math.min(2200, Math.max(lo * 10, n1 + r.int(-8, 8) * 10)) : r.int(lo, 220) * 10
      return { p, n1, n2 }
    },
    ({ p, n1, n2 }) =>
      n1 !== n2 &&
      n1 >= 150 &&
      n2 >= 150 &&
      n1 <= 2200 &&
      n2 <= 2200 &&
      largeCountsCondition(n1, p, 'the common rate').met &&
      largeCountsCondition(n2, p, 'the common rate').met &&
      !reservedSize(n1) &&
      !reservedSize(n2) &&
      !reservedRate(p),
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the mean and SD of p̂ at a known rate (checkpoint q6)
// ---------------------------------------------------------------------------------------------

export const sdOfPhat = defineGenerator({
  id: 'act-5/sd-of-phat',
  label: 'The SD of p̂ for a fleet at a known rate',
  ap_topics: ['5.5'],
  skills: ['3'],
  generate(rng) {
    const fleet = pickContext(rng, FLEETS)
    const window = pickContext(rng, WINDOWS)
    const officer = pickContext(rng, OFFICERS)
    // Half the draws land where the Lane itself lands: n·p only just clear of 10.
    const tight = rng.bool(0.45)
    const { n, p, np, nq } = tight ? drawOneFleet(rng, 7.5, 13.5) : drawOneFleet(rng, 16, 55)
    const sdPhat = samplingSdProportion(p, n)
    const lc = largeCountsCondition(n, p, 'the published rate p')
    return {
      prompt: `The Lane Authority publishes one loss rate for the whole Hundred-Day Lane: ${rateText(p)}. Take it as **known** — it is not an estimate from the fleet in front of you.\n\nNow imagine ${fleet.name} flying **${fmtInt(n)} transits** on the Lane ${window} at exactly that rate, and let $\\hat p$ be the proportion of those ${fmtInt(n)} that are lost.\n\nState the **mean** of the sampling distribution of $\\hat p$, carry out the **Large Counts** check by computing $np$ and $n(1-p)$, and report the **standard deviation of $\\hat p$ to four decimal places**. ${cap(officer)}.`,
      answer: numericAnswer(sdPhat, 'other', { digits: 4 }),
      hints: [
        'The sampling distribution of a sample proportion has a mean and a spread that depend on only two things: the true rate and the size of the sample. Neither of them is anything you measured off this fleet — both are handed to you.',
        `$\\hat p$ is unbiased, so its mean is $p$ itself. Its standard deviation is $\\sqrt{p(1-p)/n}$ — the rate times its complement, divided by the fleet size, then square-rooted. Large Counts asks whether $np$ and $n(1-p)$ both reach 10.`,
        `$p(1-p) = ${fmt(p * (1 - p), 6)}$ and $n = ${fmtInt(n)}$. Divide, then take the square root, and round only at the end — to four decimals.`,
      ],
      solution: `**Mean.** $\\hat p$ is an unbiased estimator of $p$, so\n\n$$\\mu_{\\hat p} = p = ${fmt(p, 4)}$$\n\n**Large Counts.**\n\n$$np = ${fmtInt(n)} \\times ${fmt(p, 4)} = ${fmt(np, 1)} \\qquad n(1-p) = ${fmtInt(n)} \\times ${fmt(1 - p, 4)} = ${fmt(nq, 1)}$$\n\n${lc.met ? `Both are at least 10${np < 13 ? ' — the first only just' : ''}, so a normal model for $\\hat p$ is licensed.` : `$np = ${fmt(np, 1)}$ does **not** reach 10, so a normal model for $\\hat p$ is *not* licensed here. The mean and the standard deviation below are still exactly right — they do not depend on the shape — but the distribution of $\\hat p$ is visibly right-skewed and normal-curve areas off it would be wrong.`}\n\n**Standard deviation.**\n\n$$\\sigma_{\\hat p} = \\sqrt{\\frac{p(1-p)}{n}} = \\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n)}}} = \\sqrt{${fmt((p * (1 - p)) / n, 9)}} = ${fmt(sdPhat, 6)}$$\n\nThe standard deviation is **${fmt(sdPhat, 4)}**.\n\nRead that back as a distance. A fleet of ${fmtInt(n)} flying an ordinary Lane will post a loss proportion within about ${fmt(sdPhat, 4)} of ${fmt(p, 4)} on most runs, and within twice that almost always — and none of that variation means anything has gone wrong. It is the noise floor.`,
      misconception: `Replacing the given $p$ with a proportion read off the fleet's own record. The rate here is *published* — it is the Lane's, not an estimate — so $p$ goes into the formula, and $\\sigma_{\\hat p}$ is a property of the rate and the fleet size and nothing else. The other reliable slip is dividing by $n$ instead of $\\sqrt{n}$ at the end, or forgetting the square root altogether (${fmt((p * (1 - p)) / n, 6)} is the *variance*, not the SD).`,
      notes: `Some seeds land with np below 10 on purpose: the check has to be able to fail, or it is not a check. The SD is still computed exactly and the solution says what the failure does and does not invalidate.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — does a normal model apply to p̂, and which condition decides it
// ---------------------------------------------------------------------------------------------

type ConditionMode = 'process' | 'counts' | 'ten'

const CONDITION_MODES: readonly ConditionMode[] = ['process', 'counts', 'ten'] as const

const WRONG_RULE = (n: number) =>
  `**Yes.** $n = ${fmtInt(n)}$, which is comfortably above 30, and $n \\ge 30$ is what the normal approximation needs.`
const WRONG_RULE_WHY = (n: number, np: number) =>
  `$n \\ge 30$ is the rule of thumb for the sample *mean* of a quantitative variable, where the central limit theorem does the work. A proportion is counted, not averaged, and its rule counts outcomes: $np$ and $n(1-p)$ must both reach 10. Here $n = ${fmtInt(n)}$ but $np = ${fmt(np, 1)}$, and it is $np$ that decides.`

const WRONG_OBJECT = `**No.** Loss is a 0/1 outcome — a hull either comes home or it does not — and a population of zeros and ones is nothing like a normal distribution, so no normal model can apply.`
const WRONG_OBJECT_WHY = `Right about the population, wrong about the object. The normal model is never claimed for the *population* of individual transits; it is claimed for the sampling distribution of $\\hat p$ — the distribution of the fleet's loss proportion over repeated fleets of this size. That distribution smooths out of a two-valued parent, which is exactly what the Large Counts condition certifies.`

export const largeCountsCheck = defineGenerator({
  id: 'act-5/large-counts-check',
  label: 'Does a normal model apply to p̂ here?',
  ap_topics: ['5.5', '5.6'],
  skills: ['1', '4'],
  generate(rng) {
    const fleet = pickContext(rng, FLEETS)
    const officer = pickContext(rng, OFFICERS)
    const mode = pickContext(rng, CONDITION_MODES)
    // A "ten" draw pulls n out of a FINITE file, so the file is drawn first and kept inside the
    // Ledger's own scale — a fleet's file can never hold more rows than the Lane has transits.
    const tenDraw =
      mode === 'ten'
        ? retry(
            rng,
            (r) => {
              const register = r.int(70, LEDGER_N / 10) * 10
              const n = Math.round((register * r.uniform(0.18, 0.42)) / 10) * 10
              const p = Math.round((r.uniform(14, 45) / n) * 1e4) / 1e4
              return { register, n, p, np: n * p, nq: n * (1 - p) }
            },
            ({ register, n, p, np }) => n >= 400 && n <= register && p >= MIN_RATE && p <= MAX_RATE && np >= 12 && n > 0.1 * register && !reservedSize(n) && !reservedRate(p),
          )
        : null
    const draw = tenDraw ?? (mode === 'counts' ? drawOneFleet(rng, 3, 9) : drawOneFleet(rng, 14, 55))
    const { n, p, np, nq } = draw
    const register = tenDraw?.register
    const lc = largeCountsCondition(n, p, 'the published rate p')
    const tp = tenPercentCondition(n, register, 'n')
    const sdPhat = samplingSdProportion(p, n)

    let framing: string
    let cands: Candidate[]
    if (mode === 'counts') {
      framing = `${cap(fleet.name)} are booked for **${fmtInt(n)}** Lane transits in the coming cycle. The Authority's published Lane rate is ${rateText(p)}, and each transit is an independent run of the same traffic process.`
      cands = [
        {
          text: `**No.** Large Counts fails: $np = ${fmt(np, 1)}$ is below 10, even though $n(1-p) = ${fmt(nq, 1)}$ is enormous. With that few losses expected, the sampling distribution of $\\hat p$ is bunched against zero and skewed right, not normal.`,
          correct: !lc.met,
          why: null,
        },
        {
          text: `**Yes.** $np = ${fmt(np, 1)}$ is close enough to 10 that the normal approximation will be fine in practice.`,
          correct: false,
          why: `The threshold is not a courtesy. Below 10 expected successes the sampling distribution of $\\hat p$ is visibly skewed, and a normal curve centred on ${fmt(p, 4)} with SD ${fmt(sdPhat, 4)} puts real area below zero — where no loss proportion can go. The tail probabilities you would read off it are the ones you most want, and they are the ones it gets most wrong.`,
        },
        { text: WRONG_RULE(n), correct: false, why: WRONG_RULE_WHY(n, np) },
        { text: WRONG_OBJECT, correct: false, why: WRONG_OBJECT_WHY },
      ]
    } else if (mode === 'ten') {
      framing = `The Authority will not release the whole Ledger. It hands over the closed file for ${fleet.name} — **${fmtInt(register as number)} transit records**, all of them, and no more coming — and Ebele draws **${fmtInt(n)}** of those records at random, *without replacement*, to build a null model at the published Lane rate of ${rateText(p)}.`
      cands = [
        {
          text: `**No.** The 10 % condition fails. The ${fmtInt(n)} records drawn are ${fmtPct(n / (register as number), 0)} of the ${fmtInt(register as number)} on file — far more than a tenth — so, drawn without replacement, they are not close enough to independent. (Large Counts itself is fine: $np = ${fmt(np, 1)}$, $n(1-p) = ${fmt(nq, 1)}$.)`,
          correct: !tp.met && lc.met,
          why: null,
        },
        {
          text: `**Yes.** $np = ${fmt(np, 1)}$ and $n(1-p) = ${fmt(nq, 1)}$ are both at least 10, and that is the whole requirement for a normal model for $\\hat p$.`,
          correct: false,
          why: `Large Counts is one condition of two, and it only settles the *shape*. The formula $\\sqrt{p(1-p)/n}$ assumes the draws are independent, and drawing ${fmtInt(n)} of ${fmtInt(register as number)} records without replacement makes each draw change the odds for the next. The 10 % condition is the patch for that, and here it breaks: ${fmtInt(n)} is ${fmtPct(n / (register as number), 0)} of the file.`,
        },
        { text: WRONG_RULE(n), correct: false, why: WRONG_RULE_WHY(n, np) },
        { text: WRONG_OBJECT, correct: false, why: WRONG_OBJECT_WHY },
      ]
    } else {
      framing = `Ebele is modelling the **next ${fmtInt(n)} Lane transits** ${fleet.name} will fly — transits that have not happened yet. The Authority's published Lane rate is ${rateText(p)}, and each transit is one independent run of the same traffic process.`
      cands = [
        {
          text: `**Yes.** $np = ${fmt(np, 1)}$ and $n(1-p) = ${fmt(nq, 1)}$ are both at least 10, and the ${fmtInt(n)} transits are ${fmtInt(n)} independent runs of an ongoing process rather than ${fmtInt(n)} draws out of a fixed pile — so the sampling distribution of $\\hat p$ is approximately normal, centred on ${fmt(p, 4)} with SD ${fmt(sdPhat, 4)}.`,
          correct: lc.met && tp.met,
          why: null,
        },
        {
          text: `**No.** The Transit Ledger holds only ${fmtInt(LEDGER_N)} Lane transits in all, and ${fmtInt(n)} of them is well over a tenth of that, so the 10 % condition fails and the draws are not independent.`,
          correct: false,
          why: `The 10 % condition exists to patch sampling *without replacement* from a fixed, finite population that the sample draws down. Nothing is being drawn down here. The Lane is a process that keeps producing transits, and the next ${fmtInt(n)} of them are ${fmtInt(n)} fresh trials at rate ${fmt(p, 4)}, each hull's fate independent of the others'. The Ledger's ${fmtInt(LEDGER_N)} rows are a *record* of that process, not the population being sampled.`,
        },
        { text: WRONG_RULE(n), correct: false, why: WRONG_RULE_WHY(n, np) },
        { text: WRONG_OBJECT, correct: false, why: WRONG_OBJECT_WHY },
      ]
    }

    const { options, correct, feedback } = shuffleChoice(rng, cands)
    const verdict = options[correct]
    return {
      prompt: `${framing}\n\nBefore any probability is read off a normal curve, the model has to be licensed. **Is a normal model for the sampling distribution of $\\hat p$ appropriate here — and which condition decides it?** ${cap(officer)}.`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two conditions, and they answer two different questions. **Large Counts** ($np \\ge 10$ and $n(1-p) \\ge 10$) decides whether the distribution of $\\hat p$ is close enough to a normal *shape*. **Independence** — the 10 % condition, when the sample is drawn from a finite population without replacement — decides whether $\\sqrt{p(1-p)/n}$ is the right *spread*. Work out which one is doing anything here.',
        `Compute both: $np = ${fmt(np, 1)}$ and $n(1-p) = ${fmt(nq, 1)}$. Then ask where these ${fmtInt(n)} transits come from — a fixed file that the draw uses up, or a process that keeps running.`,
      ],
      solution: `**Large Counts.** $np = ${fmtInt(n)} \\times ${fmt(p, 4)} = ${fmt(np, 1)}$ and $n(1-p) = ${fmt(nq, 1)}$ — ${lc.met ? 'both at least 10' : `and $np = ${fmt(np, 1)}$ falls short of 10`}.\n\n**Independence.** ${mode === 'ten' ? `The ${fmtInt(n)} records are drawn without replacement from a file of ${fmtInt(register as number)}, which is ${fmtPct(n / (register as number), 0)} of it — the 10 % condition fails.` : `These ${fmtInt(n)} transits are runs of an ongoing traffic process, not draws from a finite pile, so each is an independent trial at rate ${fmt(p, 4)} and the 10 % condition is not the binding question.`}\n\n${verdict}\n\nThe habit worth keeping is the order: license the model, *then* read areas off it. A tail probability computed on an unlicensed curve is not a small number — it is no number at all.`,
      misconception: `Reaching for $n \\ge 30$. That is the mean's rule, borrowed from the central limit theorem; a proportion's rule counts expected successes and failures. The second slip is checking Large Counts, finding it met, and stopping — the shape condition says nothing about whether the draws were independent.`,
      notes: `The "counts" seeds fail Large Counts and the "ten" seeds fail the 10 % condition on purpose: a condition that can only pass teaches nothing. Truth for every option comes from largeCountsCondition / tenPercentCondition, never from the draw's intent.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — a probability about one fleet's loss proportion
// ---------------------------------------------------------------------------------------------

export const probabilityAboutPhat = defineGenerator({
  id: 'act-5/probability-about-phat',
  label: 'P(p̂ at least as large as a stated rate)',
  ap_topics: ['5.5'],
  skills: ['3'],
  generate(rng) {
    const fleet = pickContext(rng, FLEETS)
    const window = pickContext(rng, WINDOWS)
    const upper = rng.bool()
    const d = retry(
      rng,
      (r) => {
        const { n, p, np, nq } = drawOneFleet(r, 12, 55)
        const sdPhat = samplingSdProportion(p, n)
        const z0 = r.uniform(0.75, 2.4)
        const v = Math.round((upper ? p + z0 * sdPhat : p - z0 * sdPhat) * 1e4) / 1e4
        const prob = upper ? normal.sf(v, p, sdPhat) : normal.cdf(v, p, sdPhat)
        return { n, p, np, nq, sdPhat, v, prob, z: (v - p) / sdPhat }
      },
      ({ v, prob, n, p }) => v > 0 && prob >= 0.005 && prob <= 0.3 && largeCountsCondition(n, p, 'p').met,
    )
    const { n, p, np, nq, sdPhat, v, prob, z } = d
    const dirWord = upper ? 'at least' : 'no more than'
    return {
      prompt: `Take the Authority's published Lane rate as known: ${rateText(p)}. ${cap(fleet.name)} fly **${fmtInt(n)} transits** ${window}, each one an independent run of the Lane at that rate.\n\nIf nothing whatever is unusual about this fleet, what is the probability that its loss proportion $\\hat p$ comes out **${dirWord} ${fmt(v, 4)}** (${fmt(v * 1000, 1)} per thousand)?\n\nGive a probability to **three decimal places**.`,
      answer: numericAnswer(prob, 'proportion', { digits: 3 }),
      hints: [
        'This is a normal-model area question, but the curve is not the curve of individual transits — it is the sampling distribution of the fleet\'s *proportion*. Build that distribution first: its centre and its standard deviation.',
        `Centre $\\mu_{\\hat p} = p$; spread $\\sigma_{\\hat p} = \\sqrt{p(1-p)/n}$. Check Large Counts ($np = ${fmt(np, 1)}$, $n(1-p) = ${fmt(nq, 1)}$), then standardize ${fmt(v, 4)} against that centre and spread and take the ${upper ? 'upper' : 'lower'} tail.`,
        `$\\sigma_{\\hat p} = ${fmt(sdPhat, 5)}$, so $z = (${fmt(v, 4)} - ${fmt(p, 4)}) / ${fmt(sdPhat, 5)} = ${fmt(z, 3)}$. Now take the area ${upper ? 'above' : 'below'} that $z$, to three decimals.`,
      ],
      solution: `**The model.** $np = ${fmt(np, 1)}$ and $n(1-p) = ${fmt(nq, 1)}$ are both at least 10, so $\\hat p$ is approximately normal with\n\n$$\\mu_{\\hat p} = ${fmt(p, 4)} \\qquad \\sigma_{\\hat p} = \\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n)}}} = ${fmt(sdPhat, 5)}$$\n\n**The area.**\n\n$$z = \\frac{${fmt(v, 4)} - ${fmt(p, 4)}}{${fmt(sdPhat, 5)}} = ${fmt(z, 4)}$$\n\n$$P(\\hat p ${upper ? '\\ge' : '\\le'} ${fmt(v, 4)}) = P(Z ${upper ? '\\ge' : '\\le'} ${fmt(z, 4)}) = ${fmt(prob, 5)}$$\n\nThe probability is **${fmt(prob, 3)}** — about ${fmtPct(prob, 1)}, or roughly one fleet in every ${fmtInt(Math.round(1 / prob))}.\n\nSo a fleet of ${fmtInt(n)} that posts ${dirWord} ${fmt(v, 4)} has done nothing but fly the Lane on an ordinary run of luck about ${fmtInt(Math.round(prob * 1000))} times in every thousand. That number is not a verdict on the fleet. It is a description of the noise.`,
      misconception: `Standardizing against the spread of *one transit* instead of the spread of the fleet's proportion. A single transit is a 0/1 outcome with SD $\\sqrt{p(1-p)} = ${fmt(Math.sqrt(p * (1 - p)), 4)}$; the fleet's proportion is ${fmtInt(n)} of them averaged, with SD ${fmt(sdPhat, 5)} — smaller by a factor of $\\sqrt{${fmtInt(n)}}$. The other slip is taking the wrong tail: read "${dirWord}" off the wording before you take an area.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — the SD of a difference of two proportions (checkpoint q7)
// ---------------------------------------------------------------------------------------------

export const sdOfDifferenceProportions = defineGenerator({
  id: 'act-5/sd-of-difference-proportions',
  label: 'The SD of p̂₁ − p̂₂ under a common rate',
  ap_topics: ['5.6'],
  skills: ['3'],
  generate(rng) {
    const [f1, f2] = rng.shuffle([...FLEETS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const officer = pickContext(rng, OFFICERS)
    const { p, n1, n2 } = drawTwoFleets(rng)
    const sd1 = samplingSdProportion(p, n1)
    const sd2 = samplingSdProportion(p, n2)
    const sdDiff = sdOfDifferenceOfProportions(p, n1, p, n2)
    const wrong = Math.abs(sd1 - sd2)
    return {
      prompt: `Suppose — and this is an assumption, not a finding — that **both** owner classes fly the Hundred-Day Lane at exactly the same rate, the Authority's published ${rateText(p)}. ${cap(f1.name)} log **${fmtInt(n1)} transits** ${window} and ${f2.name} log **${fmtInt(n2)}**, and each class's loss proportion is recorded: $\\hat p_1$ and $\\hat p_2$.\n\nUnder that common rate, what is the **standard deviation of $\\hat p_1 - \\hat p_2$**? Give it to **four decimal places**. ${cap(officer)}.`,
      answer: numericAnswer(sdDiff, 'other', { digits: 4 }),
      hints: [
        'Two independent fleets, two independent sources of wobble. Standard deviations do not combine by adding or subtracting — **variances** do, and they only ever add, whichever way round the subtraction is written.',
        `Each fleet has $\\sigma_{\\hat p} = \\sqrt{p(1-p)/n}$. Square each of those to get its variance, add the two variances, and take the square root of the sum: $\\sqrt{p(1-p)/n_1 + p(1-p)/n_2}$.`,
        `$p(1-p) = ${fmt(p * (1 - p), 6)}$, so the two variances are ${fmt(sd1 ** 2, 9)} and ${fmt(sd2 ** 2, 9)}. Add them and take the square root, to four decimals.`,
      ],
      solution: `Under a common rate $p = ${fmt(p, 4)}$, each fleet's proportion has its own spread:\n\n$$\\sigma_{\\hat p_1} = \\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n1)}}} = ${fmt(sd1, 5)} \\qquad \\sigma_{\\hat p_2} = \\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n2)}}} = ${fmt(sd2, 5)}$$\n\nVariances add:\n\n$$\\sigma_{\\hat p_1 - \\hat p_2} = \\sqrt{\\frac{p(1-p)}{n_1} + \\frac{p(1-p)}{n_2}} = \\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n1)}} + \\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n2)}}} = \\sqrt{${fmt(sdDiff ** 2, 9)}} = ${fmt(sdDiff, 6)}$$\n\nThe standard deviation of the difference is **${fmt(sdDiff, 4)}**.\n\nNotice where it sits: ${fmt(sdDiff, 5)} is **larger than either** fleet's own spread (${fmt(sd1, 5)} and ${fmt(sd2, 5)}). It has to be. A gap between two noisy numbers inherits both lots of noise; it is never quieter than the quieter of the two.`,
      misconception: `Subtracting the standard deviations: $${fmt(Math.max(sd1, sd2), 5)} - ${fmt(Math.min(sd1, sd2), 5)}$ gives ${fmt(wrong, 5)}, which is **smaller than either one** — a difference of two wobbling quantities that wobbles less than either. That is impossible, and it is the fastest way to spot the error without redoing the arithmetic. Variances add; standard deviations never subtract.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — the inverse question: how large a gap would be rare
// ---------------------------------------------------------------------------------------------

const RARITIES = [20, 50, 100, 200, 1000] as const

export const gapThatWouldBeRare = defineGenerator({
  id: 'act-5/gap-that-would-be-rare',
  label: 'The gap in loss rates that would be a 1-in-q event',
  ap_topics: ['5.6'],
  skills: ['3'],
  generate(rng) {
    const [f1, f2] = rng.shuffle([...FLEETS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const q = pickContext(rng, RARITIES)
    const { p, n1, n2 } = drawTwoFleets(rng)
    const sdDiff = sdOfDifferenceOfProportions(p, n1, p, n2)
    const zStarQ = normal.isf(1 / q)
    const gap = zStarQ * sdDiff
    return {
      prompt: `Set the null model up first and ask the question backwards.\n\nAssume both owner classes fly the Hundred-Day Lane at one **common** rate, the Authority's published ${rateText(p)}. ${cap(f1.name)} fly **${fmtInt(n1)} transits** ${window}; ${f2.name} fly **${fmtInt(n2)}**. The difference in their loss proportions, $\\hat p_1 - \\hat p_2$, is then centred on zero with a spread you can compute.\n\n**How large would a gap have to be — ${f1.short} above ${f2.short} — before it were a 1-in-${fmtInt(q)} event under that common rate?** One-sided; give the gap in loss proportion to **four decimal places**.`,
      answer: numericAnswer(gap, 'other', { digits: 4 }),
      hints: [
        'Same distribution as before, read in the other direction. Before, you had a value and wanted an area; now you have an area and want the value that cuts it off. Centre, spread, then the critical $z$.',
        `Under a common rate the difference is centred at **0** with $\\sigma_{\\hat p_1 - \\hat p_2} = \\sqrt{p(1-p)/n_1 + p(1-p)/n_2}$. A 1-in-${fmtInt(q)} event in one tail means an upper-tail area of $1/${fmtInt(q)} = ${fmt(1 / q, 4)}$ — find the $z^\\star$ with that much area above it, then the gap is $z^\\star \\sigma$.`,
        `$\\sigma_{\\hat p_1 - \\hat p_2} = ${fmt(sdDiff, 6)}$ and $z^\\star = ${fmt(zStarQ, 4)}$. Multiply, to four decimals.`,
      ],
      solution: `**Centre.** Under a common rate the two fleets estimate the same thing, so\n\n$$\\mu_{\\hat p_1 - \\hat p_2} = p - p = 0$$\n\n**Spread.** Variances add:\n\n$$\\sigma_{\\hat p_1 - \\hat p_2} = \\sqrt{\\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n1)}} + \\frac{${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}{${fmtInt(n2)}}} = ${fmt(sdDiff, 6)}$$\n\n**The cutoff.** One tail of area $1/${fmtInt(q)} = ${fmt(1 / q, 4)}$:\n\n$$z^\\star = ${fmt(zStarQ, 4)} \\qquad \\text{gap} = z^\\star \\sigma = ${fmt(zStarQ, 4)} \\times ${fmt(sdDiff, 6)} = ${fmt(gap, 6)}$$\n\nA gap of **${fmt(gap, 4)}** in loss proportion — about ${fmt(gap * 1000, 2)} per thousand transits, or roughly ${fmtInt(Math.round(gap * n1))} extra losses spread across ${fmtInt(n1)} transits — would turn up about once in every ${fmtInt(q)} pairs of fleets flying an identical Lane.\n\nThat is the whole procedure, and it runs *before* anyone looks at a real gap. Build the distribution of ordinary, mark the line, and only then bring the observation to it.`,
      misconception: `Centring the difference on $p$ rather than on **0**. Under a common rate both fleets are estimating the same number, so the *difference* is centred on nothing at all. The second slip is using a two-sided critical value: a 1-in-${fmtInt(q)} event **in one direction** puts all ${fmt(1 / q, 4)} of the area in the upper tail, so $z^\\star = ${fmt(zStarQ, 4)}$, not the two-tailed ${fmt(normal.isf(1 / (2 * q)), 4)}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — a probability about a proportion, as a long-run proportion
// ---------------------------------------------------------------------------------------------

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A probability computed under an assumption never proves anything about whether the assumption holds. It says how often ordinary luck produces a result like this one — nothing more.',
}

const PROB_SAME_RATE: ForbiddenPhrase = {
  phrase: /\b(?:probability|chance|likelihood|odds)\b(?:\s+\S+){0,3}\s+that\s+[\w\s]{0,40}?\b(?:have|had|has|share|are|is|were|was)\s+(?:the\s+)?(?:same|equal|identical)\b/,
  label: 'Probability that the rates are equal',
  why: 'The common rate is the *assumption* the whole calculation is made under, not an event with a probability. The number is the probability of a result like this one IF that assumption holds — you cannot turn it round.',
}

const PROB_NULL_TRUE: ForbiddenPhrase = {
  phrase: /\b(?:probability|chance|likelihood|odds)\b[^.;]{0,40}\bnull\b[^.;]{0,25}\b(?:true|correct|right|false|wrong)\b/,
  label: 'Probability that H₀ is true',
  why: 'This is a probability computed under an assumed model, not a probability that the model is right.',
}

const DECIDES: ForbiddenPhrase[] = [
  {
    phrase: 'reject',
    label: 'Makes a test decision',
    why: 'Act V builds the null model; it does not run the test. This item asks only what the number means, not what to do about it.',
  },
  {
    phrase: 'not reject',
    label: 'Makes a test decision',
    why: 'Act V builds the null model; it does not run the test. This item asks only what the number means, not what to do about it.',
  },
  {
    phrase: 'significant',
    label: 'Declares significance',
    why: 'Significance is a verdict against a stated threshold, and no threshold has been set here. Describe the probability; do not judge with it.',
  },
  {
    phrase: /\b(?:shows?|showed|demonstrates?|demonstrated|establishes?|confirms?|means)\s+(?:us\s+)?(?:that\s+)?(?:the\s+)?(?:two\s+)?(?:owner\s+)?(?:classes|fleets|rates|proportions|groups)\b[^.;,]{0,30}\b(?:differ|different|unequal|not\s+(?:the\s+)?same)\b/,
    label: 'Concludes that the rates differ',
    why: 'The calculation assumed the rates are the same. It cannot conclude they are different — that would be using an assumption to overturn itself. Act VI will test the claim; Act V only builds the yardstick.',
  },
]

interface ProportionProbabilityArgs {
  /** The computed probability. */
  prob: number
  /** The assumed common (or known) rate. */
  rate: number
  /** The threshold the probability is about — a loss proportion, or a gap between two. */
  threshold: number
  /** True when the statistic is a difference of two fleets' proportions. */
  isGap: boolean
  /** How the fleets are described, for the context group and the exemplar. */
  fleetText: string
  /** The sample sizes, spelled out. */
  sizeText: string
}

/**
 * Interpret P(p̂ ≥ v) or P(p̂₁ − p̂₂ ≥ gap) as a long-run proportion of repeated samples, under an
 * assumption made explicit. Requires the value, the assumption, the long-run framing, the direction
 * and the context; forbids turning the conditional round, and forbids any test decision — Act V does
 * not decide.
 */
function proportionProbabilityInterpretation({ prob, rate, threshold, isGap, fleetText, sizeText }: ProportionProbabilityArgs): InterpretationAnswer {
  const assumption: RubricPhrase[] = isGap
    ? ['common rate', 'same rate', 'equal rate', 'one rate', 'both same rate', 'no difference rate', 'true rate', numberRegex(rate, 4, 1)]
    : ['true rate', 'rate were', 'actual rate', 'published rate', 'assumed rate', 'if rate', numberRegex(rate, 4, 1)]
  const required: RubricGroup[] = [
    {
      label: 'Cites the probability',
      phrasings: [numberRegex(prob, 3, 1), new RegExp(`${numberRegex(prob * 100, 1, 1).source}\\s*percent`)],
      polarity: 'any',
      feedback: `State the value: ${fmt(prob, 3)} (about ${fmtPct(prob, 1)}).`,
    },
    {
      label: 'Makes the assumption explicit (the rate the probability is computed under)',
      phrasings: assumption,
      polarity: 'any',
      feedback: isGap
        ? `Say what is being assumed: *if* both owner classes were flying the Lane at one common rate of ${fmt(rate, 4)}…`
        : `Say what is being assumed: *if* the true loss rate were ${fmt(rate, 4)}…`,
    },
    {
      label: 'Long-run framing over repeated samples of this size',
      phrasings: ['in the long run', 'repeat', 'many sample', 'all sample', 'sample this size', 'fleet this size', 'over many', 'all pair'],
      polarity: 'any',
      feedback: 'A probability about a statistic is a long-run proportion: of all samples of this size, over many repetitions, this fraction would come out this way.',
    },
    {
      label: 'States the direction (at least as large as the stated value)',
      phrasings: ['at least as large', 'at least', 'or more', 'greater', 'as extreme', numberRegex(threshold, 4, 1)],
      polarity: 'any',
      feedback: `The probability covers everything ${fmt(threshold, 4)} and beyond, not the exact value.`,
    },
    contextGroup('States the context (whose loss proportions, on which lane)', [fleetText, 'loss proportion on the Hundred-Day Lane'], {
      minMatches: 2,
      feedback: `Say whose numbers these are: the loss proportions of ${fleetText} on the Hundred-Day Lane.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, PROB_SAME_RATE, PROB_NULL_TRUE, ...DECIDES]
  const exemplar = isGap
    ? `If both owner classes were flying the Hundred-Day Lane at one common loss rate of ${fmt(rate, 4)}, then in the long run, over many pairs of fleets of ${sizeText}, about ${fmt(prob, 3)} of those pairs would show a gap in loss proportion between ${fleetText} at least as large as ${fmt(threshold, 4)}.`
    : `If the true loss rate on the Hundred-Day Lane were ${fmt(rate, 4)}, then in the long run, over many fleets of ${sizeText}, about ${fmt(prob, 3)} of them would post a loss proportion at least as large as ${fmt(threshold, 4)} for ${fleetText}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 20 }
}

export const interpretProportionProbability = defineGenerator({
  id: 'act-5/interpret-proportion-probability',
  label: 'Say what the probability means, in context',
  ap_topics: ['5.5', '5.6'],
  skills: ['4'],
  generate(rng) {
    const isGap = rng.bool()
    const [f1, f2] = rng.shuffle([...FLEETS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)

    let prob: number
    let rate: number
    let threshold: number
    let fleetText: string
    let sizeText: string
    let setup: string

    if (isGap) {
      const { p, n1, n2 } = drawTwoFleets(rng)
      const sdDiff = sdOfDifferenceOfProportions(p, n1, p, n2)
      const gap = Math.round(rng.uniform(1.2, 2.6) * sdDiff * 1e4) / 1e4
      rate = p
      threshold = gap
      prob = normal.sf(gap, 0, sdDiff)
      fleetText = `${f1.name} and ${f2.name}`
      sizeText = `${fmtInt(n1)} and ${fmtInt(n2)} transits`
      setup = `Assume both owner classes fly the Hundred-Day Lane at one **common** loss rate, the Authority's published ${rateText(p)}. ${cap(f1.name)} log **${fmtInt(n1)} transits** ${window}; ${f2.name} log **${fmtInt(n2)}**. Under that assumption the difference $\\hat p_1 - \\hat p_2$ is centred on 0 with standard deviation ${fmt(sdDiff, 5)}, and\n\n$$P(\\hat p_1 - \\hat p_2 \\ge ${fmt(gap, 4)}) = ${fmt(prob, 4)}$$`
    } else {
      const d = retry(
        rng,
        (r) => {
          const one = drawOneFleet(r, 12, 55)
          const sdPhat = samplingSdProportion(one.p, one.n)
          const v = Math.round((one.p + r.uniform(0.9, 2.4) * sdPhat) * 1e4) / 1e4
          return { ...one, sdPhat, v, prob: normal.sf(v, one.p, sdPhat) }
        },
        ({ prob }) => prob >= 0.006 && prob <= 0.25,
      )
      rate = d.p
      threshold = d.v
      prob = d.prob
      fleetText = f1.name
      sizeText = `${fmtInt(d.n)} transits`
      setup = `Take the Authority's published Lane rate as known: ${rateText(d.p)}. ${cap(f1.name)} fly **${fmtInt(d.n)} transits** ${window}, each an independent run of the Lane at that rate. Under that model $\\hat p$ is centred on ${fmt(d.p, 4)} with standard deviation ${fmt(d.sdPhat, 5)}, and\n\n$$P(\\hat p \\ge ${fmt(d.v, 4)}) = ${fmt(d.prob, 4)}$$`
    }

    const answer = proportionProbabilityInterpretation({ prob, rate, threshold, isGap, fleetText, sizeText })
    return {
      prompt: `${setup}\n\nFerrier does not want the number. She wants the sentence.\n\n**Interpret ${fmt(prob, 4)} in context**, in one or two sentences. Name the value, say plainly what has been *assumed*, frame it as a long-run proportion of repeated ${isGap ? 'pairs of samples of these sizes' : 'samples of this size'}, give the direction, and say whose loss proportions on the Hundred-Day Lane you are talking about. Act V does not decide anything — describe the probability, do not rule with it.`,
      answer,
      hints: [
        'Every probability about a statistic is a **conditional** statement and a **long-run** one. The condition is the model you assumed; the long run is the imaginary stack of repeated samples of this size. A sentence that leaves either out is not an interpretation, it is a number read aloud.',
        `Build it in four pieces and then join them: (1) *If* ${isGap ? `both classes were flying at the common rate ${fmt(rate, 4)}` : `the true rate were ${fmt(rate, 4)}`}…; (2) …then over many ${isGap ? 'pairs of fleets' : 'fleets'} of ${sizeText}…; (3) …about ${fmt(prob, 3)} of them…; (4) …would show ${isGap ? 'a gap' : 'a loss proportion'} at least as large as ${fmt(threshold, 4)}.`,
        `Two traps to step over. The number is **not** the probability that the ${isGap ? 'two classes fly at the same rate' : 'model is right'} — the assumption is the condition, never the conclusion. And nothing here rejects, accepts, or calls anything significant: that machinery belongs to a later act.`,
      ],
      solution: `${answer.exemplar}\n\nThe single most common wrong turn is to reverse the conditional — to read ${fmt(prob, 4)} as "the probability that ${isGap ? 'the two owner classes really do fly at the same rate' : 'the published rate is the right one'}". It is the other way round: the ${isGap ? 'common rate' : 'published rate'} was *assumed* in order to compute the number, and no amount of arithmetic afterwards can turn an assumption into a conclusion.`,
      misconception: `Reversing the conditional ("so ${isGap ? 'the two rates really are the same' : 'the published rate is the right one'} with probability only ${fmtPct(prob, 1)}"), or upgrading a description into a verdict ("so ${isGap ? 'the gap' : 'this fleet'} is out of line"). The probability describes how often ordinary luck produces a result this extreme *under a stated model*. It is a ruler, not a ruling.`,
    }
  },
})
