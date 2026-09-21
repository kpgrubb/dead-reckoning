/**
 * act-4-10 · Until First Contact — drills. AP 4.12: the geometric setting, P(X = k) for the number
 * of trials to the first success, the tail P(X > k), the mean 1/p and SD √(1−p)/p, and choosing
 * between the geometric and the binomial for a question.
 *
 *   act-4/geometric-pmf             numeric         P(the first success falls on trial k)
 *   act-4/geometric-tail            numeric         P(X > k) from `geometric.sf` — never 1 − cdf
 *   act-4/geometric-moments         numeric         1/p and √(1−p)/p for a drawn setting
 *   act-4/geometric-vs-binomial     choice          fixed trials counting successes, or trials to the first
 *   act-4/geometric-display         display         a rendered geometric pmf, read for its mode and
 *                                                   its mean                       (checkpoint q12)
 *   act-4/interpret-geometric-mean  interpretation  1/p as a long-run average, not a forecast
 *
 * The AP convention is stated in every prompt, hint and solution here: X counts trials **up to and
 * including** the first success, so the support is 1, 2, 3, … and there is no trial 0.
 *
 * RESERVED — act-4-10's own scene, sensitivity table, instrument and mission beats. No drill lands
 * on any of them:
 *   · the five WAIT_SCENARIOS rates — 0.02, 19/900, 5/150, 0.05 and 0.10 diversions per **Perrine
 *     passage** — together with the expected waits, SDs, days and tails the sensitivity prints;
 *   · *Nightjar*'s own close passes in Watch window 2 at p = 0.02, whose no-detection probability is
 *     the `act-4-10-seen` beat;
 *   · Perrine passages as the trial and a diversion off profile as the success, in any setting.
 * `reservedRate` refuses any draw inside 0.004 of one of the Act's rates, and no context below names
 * a Perrine hull, Mark 9 or this ship: every drill is another office's file. Every probability comes
 * from `geometric.*` / `geometricMoments` in @/lib/stats — nothing here is hand-computed.
 */
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import type { Rng } from '@/lib/rng'
import { geometric, geometricMoments } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { geometricMeanInterpretation } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Reserved: the rates act-4-10 itself runs on.
// ---------------------------------------------------------------------------------------------

/** The five diversion rates of the module's sensitivity table, per Perrine passage. */
const RESERVED_RATES = [0.02, 19 / 900, 5 / 150, 0.05, 0.1]

function reservedRate(p: number): boolean {
  return RESERVED_RATES.some((r) => Math.abs(p - r) < 0.004)
}

/** A per-trial rate in [lo, hi], to the hundredth, that is none of the Act's own. */
function drawRate(rng: Rng, lo: number, hi: number): number {
  return retry(
    rng,
    (r) => Math.round(r.uniform(lo, hi) * 100) / 100,
    (p) => p >= lo - 1e-9 && p <= hi + 1e-9 && !reservedRate(p),
  )
}

interface Candidate {
  text: string
  correct: boolean
  why: string | null
}

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// In-world waiting settings — other files, other offices, other people's patience
// ---------------------------------------------------------------------------------------------

interface WaitCtx {
  /** One sentence of framing; `{pct}` is the drawn per-trial percentage. */
  frame: string
  /** The trial, singular. */
  trial: string
  /** The trial, plural. */
  trials: string
  /** The success as a bare noun phrase, no article — the rubric template wants it that way. */
  success: string
  /** The success as it reads in a clause: "the audit queries it". */
  event: string
  /** The clause that earns independence and a constant rate. */
  why: string
}

const SETTINGS: WaitCtx[] = [
  {
    frame:
      'The Bureau of Hulls works the Uruk High certification queue one document at a time and audits each in turn. Over the whole file the audit queries {pct} of certifications.',
    trial: 'certification',
    trials: 'certifications',
    success: 'query',
    event: 'the audit queries it',
    why: 'the queue is ordered by lodgement date and the certifications were filed by masters who have never met',
  },
  {
    frame:
      'Adlinda Yards releases refits in the order the dock finishes them. Across six years of the yard book, {pct} of refits leave the dock late.',
    trial: 'refit',
    trials: 'refits',
    success: 'late release',
    event: 'the dock releases the hull late',
    why: 'each hull has its own berth, its own crew and its own parts queue, and the dock does not carry a delay from one release to the next',
  },
  {
    frame:
      'The Themis Reach picket stands one watch at a time and logs whatever the aperture resolves. The Reach office prices an ordinary watch at {pct} of producing a contact.',
    trial: 'watch',
    trials: 'watches',
    success: 'contact',
    event: 'the watch produces a contact',
    why: 'the traffic that crosses the Reach is scheduled elsewhere and takes no notice of what the last watch did or did not find',
  },
  {
    frame:
      'The Lane Authority reads the Saturn feeder run transit by transit. On that stretch {pct} of transits are attended by a transponder dropout at Mark 6.',
    trial: 'transit',
    trials: 'transits',
    success: 'dropout',
    event: 'the transponder drops out at Mark 6',
    why: 'the hulls are different, the units are different and the Authority repairs nothing between one transit and the next',
  },
  {
    frame:
      'A cutter is sent to reported silences one at a time, in the order they are reported. Over the file, {pct} of sorties recover something.',
    trial: 'sortie',
    trials: 'sorties',
    success: 'recovery',
    event: 'the sortie recovers something',
    why: 'the silences are unrelated events in unrelated places and a sortie that finds nothing does not change what the next one is flying to',
  },
]

// ---------------------------------------------------------------------------------------------
// 1. Numeric — P(the first success falls on trial k)
// ---------------------------------------------------------------------------------------------

export const geometricPmfDrill = defineGenerator({
  id: 'act-4/geometric-pmf',
  label: 'The first success on trial k',
  ap_topics: ['4.12'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const p = drawRate(rng, 0.06, 0.4)
    const kMax = Math.min(18, Math.max(4, Math.ceil(2.5 / p)))
    const k = retry(
      rng,
      (r) => r.int(2, kMax),
      (v) => geometric.pmf(v, p) > 0.004,
    )
    const value = geometric.pmf(k, p)
    const q = 1 - p
    const failTex = `(${fmt(q, 2)})^{${k - 1}}`
    return {
      prompt: `${ctx.frame.replace('{pct}', fmtPct(p, 0))} One ${ctx.trial} tells you nothing about the next — ${ctx.why} — so the rate holds at ${fmt(p, 2)} on every one of them.\n\nLet $X$ be the number of ${ctx.trials} **up to and including** the first one on which ${ctx.event}. What is $P(X = ${k})$ — the probability that the first ${ctx.success} falls on ${ctx.trial} number ${k} exactly? Report a probability to four decimal places.`,
      answer: numericAnswer(value, 'proportion', { digits: 4 }),
      hints: [
        `To wait exactly ${k} ${ctx.trials} is to have two things happen in order: the first ${k - 1} ${ctx.trials} all come up clean, and then the ${k}th produces the ${ctx.success}. Independent events that all have to happen multiply.`,
        `A clean ${ctx.trial} has probability $1 - ${fmt(p, 2)} = ${fmt(q, 2)}$, and there are ${k - 1} of them to get through before the one that succeeds. There is no arrangement count here: only one order produces "first success on ${ctx.trial} ${k}".`,
        `$${failTex} \\times ${fmt(p, 2)}$, to four decimals.`,
      ],
      solution: `$$P(X = ${k}) = (1 - p)^{k-1}\\,p = ${failTex}(${fmt(p, 2)}) = ${fmt(value, 4)}$$\n\nThe probability is **${fmt(value, 4)}**. The exponent is $k - 1$ and not $k$, because the ${k}th ${ctx.trial} is the one that *succeeds* — only the ${k - 1} before it have to fail. And there is no binomial coefficient: "first ${ctx.success} on ${ctx.trial} ${k}" names one specific sequence of outcomes, not some arrangement of ${k} of them.\n\nNote where the mass is. $P(X = 1) = ${fmt(geometric.pmf(1, p), 4)}$ — the very first ${ctx.trial} is always the most likely single answer, and every term after it is the one before it times ${fmt(q, 2)}.`,
      misconception: `Raising the failure probability to the ${k}th power, $${fmt(q, 2)}^{${k}} \\times ${fmt(p, 2)} = ${fmt(Math.pow(q, k) * p, 4)}$, counts ${k} failures and then a success — a wait of ${k + 1} ${ctx.trials}. The other common slip is attaching a binomial coefficient: $\\binom{${k}}{1}$ would count every position the single ${ctx.success} could occupy, and the question has already fixed it at the end.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the tail: the wait that has not ended yet
// ---------------------------------------------------------------------------------------------

export const geometricTailDrill = defineGenerator({
  id: 'act-4/geometric-tail',
  label: 'The wait that has not ended yet',
  ap_topics: ['4.12'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const p = drawRate(rng, 0.06, 0.35)
    const kMax = Math.min(24, Math.max(5, Math.ceil(2.5 / p)))
    const k = retry(
      rng,
      (r) => r.int(3, kMax),
      (v) => {
        const tail = geometric.sf(v, p)
        return tail > 0.02 && tail < 0.85
      },
    )
    const value = geometric.sf(k, p)
    const atLeast = geometric.sf(k - 1, p)
    const q = 1 - p
    return {
      prompt: `${ctx.frame.replace('{pct}', fmtPct(p, 0))} The ${ctx.trials} are independent — ${ctx.why}.\n\n$X$ is the number of ${ctx.trials} up to and including the first on which ${ctx.event}. The office has worked through **${k}** ${ctx.trials} and not seen a ${ctx.success} yet. What is $P(X > ${k})$ — the probability of exactly that, that the wait is **still running** after ${k} ${ctx.trials}? Report a probability to four decimal places.`,
      answer: numericAnswer(value, 'proportion', { digits: 4 }),
      hints: [
        `Do not add up ${k} separate terms, and do not take one minus a cumulative you have to build first. "Still waiting after ${k} ${ctx.trials}" is one event described directly: every one of those ${k} ${ctx.trials} came up clean.`,
        `Each ${ctx.trial} comes up clean with probability $1 - ${fmt(p, 2)} = ${fmt(q, 2)}$, and they are independent, so ${k} of them in a row multiply.`,
        `$(${fmt(q, 2)})^{${k}}$, to four decimals.`,
      ],
      solution: `The survival form needs no summation at all:\n\n$$P(X > ${k}) = (1 - p)^{k} = (${fmt(q, 2)})^{${k}} = ${fmt(value, 4)}$$\n\nSo **${fmt(value, 4)}** — about ${fmtPct(value, 0)} of waits of this kind are still running after ${k} ${ctx.trials}. It is the exact complement of the cumulative, $P(X \\le ${k}) = ${fmt(geometric.cdf(k, p), 4)}$, and the two add to one, as they must.\n\nWatch the boundary. $P(X > ${k}) = ${fmt(value, 4)}$ excludes the ${ctx.trial} at ${k}; $P(X \\ge ${k}) = ${fmt(atLeast, 4)}$ keeps it. The gap between them is the whole cell at ${k}, $${fmt(geometric.pmf(k, p), 4)}$ — a real quantity of probability and not a rounding difference.`,
      misconception: `Computing $1 - P(X \\le ${k - 1}) = ${fmt(atLeast, 4)}$ answers "at least ${k} ${ctx.trials}", which includes the ${ctx.trial} at ${k} itself and is the wrong side of the boundary. The other slip is multiplying ${k} by ${fmt(p, 2)} and subtracting: probabilities of "none of these happened" multiply, they do not accumulate by addition, and that route will cheerfully hand you a negative number.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — the mean 1/p and the SD √(1−p)/p
// ---------------------------------------------------------------------------------------------

export const geometricMomentsDrill = defineGenerator({
  id: 'act-4/geometric-moments',
  label: 'The expected wait and its spread',
  ap_topics: ['4.12'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const p = drawRate(rng, 0.06, 0.35)
    const askMean = rng.bool()
    const { mean, sd } = geometricMoments(p)
    const value = askMean ? mean : sd
    const asked = askMean ? 'the **expected number** of ' + ctx.trials + ' to the first ' + ctx.success + ', $\\mu = 1/p$' : 'the **standard deviation** of that wait, $\\sigma = \\sqrt{1-p}\\,/\\,p$'
    return {
      prompt: `${ctx.frame.replace('{pct}', fmtPct(p, 0))} The ${ctx.trials} are independent at that rate — ${ctx.why}.\n\n$X$ counts the ${ctx.trials} up to and including the first on which ${ctx.event}. What is ${asked}? Report it to two decimal places.`,
      answer: numericAnswer(value, 'mean', { digits: 2, tolerance: 0.02 }),
      hints: [
        askMean
          ? `A rate of ${fmt(p, 2)} per ${ctx.trial} means roughly one ${ctx.success} in every so many ${ctx.trials} — and the expected wait is exactly that reciprocal. No summation required; the series does it for you.`
          : `The spread of a geometric wait is not ${fmt(mean, 2)} and it is not $\\sqrt{${fmt(mean, 2)}}$. It carries a square root, and under that root sits $1 - p$, with the $p$ itself left downstairs in the denominator.`,
        askMean
          ? `$\\mu = 1/p$, with $p = ${fmt(p, 2)}$.`
          : `$\\sigma = \\sqrt{1 - ${fmt(p, 2)}}\\,/\\,${fmt(p, 2)}$.`,
        askMean ? `$1 \\div ${fmt(p, 2)}$, to two decimals.` : `$\\sqrt{${fmt(1 - p, 2)}} \\div ${fmt(p, 2)}$, to two decimals.`,
      ],
      solution: `$$\\mu = \\frac{1}{p} = \\frac{1}{${fmt(p, 2)}} = ${fmt(mean, 2)} \\qquad \\sigma = \\frac{\\sqrt{1-p}}{p} = \\frac{\\sqrt{${fmt(1 - p, 2)}}}{${fmt(p, 2)}} = ${fmt(sd, 2)}$$\n\nThe answer is **${fmt(value, 2)}**.\n\nThe two numbers are nearly the same size, and that is the fact worth carrying out of this drill: for small $p$, $\\sqrt{1-p}$ is close to 1, so $\\sigma \\approx \\mu$. A wait whose spread is the size of its own average is a wait you cannot forecast — ${fmt(mean, 1)} ${ctx.trials} on average, give or take ${fmt(sd, 1)}. And the mean is not the likeliest outcome: that is ${ctx.trial} 1, at $P(X = 1) = ${fmt(geometric.pmf(1, p), 4)}$, with $${fmt(geometric.sf(Math.ceil(mean), p), 4)}$ of waits still running past ${ctx.trial} ${fmtInt(Math.ceil(mean))}.`,
      misconception: `Quoting $\\mu = ${fmt(mean, 2)} $ as the spread, or taking $\\sqrt{\\mu} = ${fmt(Math.sqrt(mean), 2)}$ — neither is $\\sigma$. The binomial's $\\sqrt{np(1-p)}$ does not apply either: there is no $n$ here, because the number of ${ctx.trials} is what is being counted rather than fixed in advance.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which distribution is the question asking for?
// ---------------------------------------------------------------------------------------------

export const geometricVsBinomial = defineGenerator({
  id: 'act-4/geometric-vs-binomial',
  label: 'Geometric or binomial?',
  ap_topics: ['4.12'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const p = drawRate(rng, 0.06, 0.35)
    const wantGeometric = rng.bool()
    const n = rng.int(8, 30)
    const mean = geometricMoments(p).mean
    const question = wantGeometric
      ? `How many ${ctx.trials} will the office work through, counting the one that produces it, before the first time ${ctx.event}?`
      : `Among the next **${fmtInt(n)}** ${ctx.trials}, how many will be ones on which ${ctx.event}?`
    const cands: Candidate[] = [
      {
        text: `**Geometric.** The number of ${ctx.trials} is not fixed in advance — the counting runs until the first ${ctx.success} and then stops. The answer is a ${ctx.trial} number, 1, 2, 3, …, with $P(X = k) = (1-p)^{k-1}p$ and a mean of $1/p$.`,
        correct: wantGeometric,
        why: wantGeometric ? null : `The question fixes ${fmtInt(n)} ${ctx.trials} before any counting starts and asks how many successes land among them. Nothing here waits for anything; the number of trials is the *given*, not the answer.`,
      },
      {
        text: `**Binomial.** The number of ${ctx.trials} is fixed at ${fmtInt(n)} before any counting starts, and $X$ is how many of them produce a ${ctx.success} — a count between 0 and ${fmtInt(n)}, with $P(X = k) = \\binom{n}{k}p^k(1-p)^{n-k}$ and a mean of $np$.`,
        correct: !wantGeometric,
        why: !wantGeometric ? null : `There is no fixed number of ${ctx.trials} in the question. The office keeps going until something happens, so what is being counted is the *wait itself*, and a count of successes out of a settled $n$ answers a different question.`,
      },
      {
        text: `**Binomial**, with $n$ set to the expected wait $1/p = ${fmt(mean, 1)}$ ${ctx.trials} and $k = 1$ success.`,
        correct: false,
        why: `This borrows the geometric's mean to manufacture an $n$ the question never supplied, then asks a binomial question about it. The expected wait is an output of the model, not a number of trials anybody has agreed to run.`,
      },
      {
        text: `**Geometric**, counting the ${ctx.trials} that fail *before* the first ${ctx.success}, so the support begins at 0 and $P(X = k) = (1-p)^{k}p$.`,
        correct: false,
        why: `That is the other indexing convention, and it is not the one AP or the ship uses. Here $X$ counts trials **up to and including** the first success: the support starts at 1, $P(X = 1) = p$, and the mean is $1/p$ rather than $(1-p)/p$.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${ctx.frame.replace('{pct}', fmtPct(p, 0))} The ${ctx.trials} are independent at that rate — ${ctx.why}.\n\nThe office asks:\n\n> ${question}\n\nWhich distribution answers **that** question, and why?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Both models run on the same independent trials and the same $p$. What separates them is which quantity is fixed before the counting starts and which one is the answer.',
        'Read the question for the word *until*. If the number of trials is settled in advance and the count of successes is unknown, it is binomial; if the number of successes is settled at one and the number of trials is unknown, it is geometric.',
      ],
      solution: `**${options[correct]}**\n\n${
        wantGeometric
          ? `The question stops the counting at the first ${ctx.success}, so the number of ${ctx.trials} is the random quantity. That is the geometric setting: $P(X = k) = (1-p)^{k-1}p$ over the support 1, 2, 3, …, with $\\mu = 1/p = ${fmt(mean, 1)}$ ${ctx.trials}.`
          : `The question settles ${fmtInt(n)} ${ctx.trials} first and asks how many successes fall among them. That is the binomial setting: a fixed $n$, a count between 0 and ${fmtInt(n)}, and $\\mu = np = ${fmt(n * p, 2)}$.`
      }\n\nThe two are not rivals; they answer adjacent questions about one process, and they agree wherever the questions coincide. "At least one ${ctx.success} in the next ${fmtInt(n)} ${ctx.trials}" is the same event as "the first ${ctx.success} arrives by ${ctx.trial} ${fmtInt(n)}", and both routes give ${fmt(geometric.cdf(n, p), 4)}. They part company the moment the question asks for two successes, or for the length of the wait itself.`,
      misconception: `Choosing by the surface of the story rather than by what is fixed. The same office, the same file and the same rate support both models; only the question decides. Ask one thing before anything else: is $n$ given to me, or am I being asked for it?`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Display — the pmf, read for its mode and its mean (checkpoint q12)
// ---------------------------------------------------------------------------------------------

/** A thousand waits makes the bar heights readable as counts rather than as fractions. */
const DISPLAY_WAITS = 1000

export const geometricDisplay = defineGenerator({
  id: 'act-4/geometric-display',
  label: 'Reading a geometric distribution',
  ap_topics: ['4.12'],
  skills: ['2', '4'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const p = drawRate(rng, 0.08, 0.3)
    const { mean, sd } = geometricMoments(p)
    const kMax = Math.min(24, Math.max(10, Math.ceil(2.4 * mean)))
    const categories = Array.from({ length: kMax }, (_, i) => String(i + 1))
    const counts = categories.map((_, i) => Math.round(DISPLAY_WAITS * geometric.pmf(i + 1, p)))
    const beyond = Math.round(DISPLAY_WAITS * geometric.sf(kMax, p))
    const meanTrial = Math.ceil(mean)
    const byMean = geometric.cdf(meanTrial, p)
    const pastMean = geometric.sf(meanTrial, p)
    const cands: Candidate[] = [
      {
        text: `The tallest bar is at ${ctx.trial} 1 and the bars fall away from there, so the commonest single wait is **one ${ctx.trial}**. The mean of ${fmt(mean, 1)} sits well to the right of that peak: about ${fmtPct(byMean, 0)} of waits are over by ${ctx.trial} ${fmtInt(meanTrial)}, so most waits are **shorter** than the mean.`,
        correct: true,
        why: null,
      },
      {
        text: `The mean is ${fmt(mean, 1)}, so ${ctx.trial} ${fmtInt(meanTrial)} is the wait to plan for: it is the most likely single outcome, and the bars are tallest around it.`,
        correct: false,
        why: `Look at the bars. The tallest is the first one, and every bar after it is the one before it times $1 - p = ${fmt(1 - p, 2)}$, so the display is strictly decreasing and the mode is ${ctx.trial} 1 — at ${fmtInt(counts[0])} of the ${fmtInt(DISPLAY_WAITS)} waits, against ${fmtInt(counts[meanTrial - 1] ?? 0)} at ${ctx.trial} ${fmtInt(meanTrial)}. The mean is not the likeliest value; it is a long tail's worth of arithmetic pulling the average to the right of the peak.`,
      },
      {
        text: `The display is missing its first bar. $X$ counts the ${ctx.trials} that **fail before** the first ${ctx.success}, so the distribution should begin at ${ctx.trial} 0 — and that missing bar is the tallest one.`,
        correct: false,
        why: `That is the other indexing convention, and it is not the one in use. Here $X$ counts trials up to and including the first success, so the support starts at 1 and $P(X = 1) = p = ${fmt(p, 2)}$ — the first bar in the display. There is no ${ctx.trial} 0, because a wait of zero ${ctx.trials} contains no ${ctx.trial} that could have produced the ${ctx.success}.`,
      },
      {
        text: `Because ${fmt(mean, 1)} is the mean, roughly half the waits finish before ${ctx.trial} ${fmtInt(meanTrial)} and roughly half run past it: the mean splits the display down the middle.`,
        correct: false,
        why: `That would hold for a symmetric distribution and this one is not remotely symmetric. It is strictly decreasing with a long right tail, so the mean sits far above the middle: ${fmtPct(byMean, 0)} of waits are finished by ${ctx.trial} ${fmtInt(meanTrial)} and only ${fmtPct(pastMean, 0)} are still running. The tail is thin but long, and it is what drags the average out.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${ctx.frame.replace('{pct}', fmtPct(p, 0))} The ${ctx.trials} are independent at that rate — ${ctx.why}.\n\n$X$ is the number of ${ctx.trials} **up to and including** the first on which ${ctx.event}. The display below takes ${fmtInt(DISPLAY_WAITS)} waits of this kind and shows how many of them end on each of ${ctx.trials} 1 through ${fmtInt(kMax)}; a further ${fmtInt(beyond)} of the ${fmtInt(DISPLAY_WAITS)} are still running past ${ctx.trial} ${fmtInt(kMax)} and lie off the right-hand edge.\n\nWhich statement reads this display correctly?`,
      answer: {
        type: 'display',
        display: {
          kind: 'bar',
          categories,
          counts,
          label: `waits ending on each ${ctx.trial}, out of ${fmtInt(DISPLAY_WAITS)} — geometric with p = ${fmt(p, 2)}, support 1, 2, 3, …`,
        },
        question: { type: 'choice', options, correct, feedback },
      },
      hints: [
        `Find the tallest bar before you do any arithmetic, and then find where ${fmt(mean, 1)} would fall on the same axis. Those two places are not the same place, and the whole item is about the gap between them.`,
        `Each bar is the previous one multiplied by $1 - p = ${fmt(1 - p, 2)}$, so the display can only fall. Add the bars up to ${ctx.trial} ${fmtInt(meanTrial)} and compare the total with half of ${fmtInt(DISPLAY_WAITS)}.`,
      ],
      solution: `**${options[correct]}**\n\nTwo facts sit in this picture and they do not contradict each other.\n\n**The mode is ${ctx.trial} 1, always.** Every term is the one before it times $1 - p = ${fmt(1 - p, 2)}$, so a geometric pmf is strictly decreasing whatever $p$ is: $P(X = 1) = ${fmt(geometric.pmf(1, p), 4)}$, about ${fmtInt(counts[0])} of the ${fmtInt(DISPLAY_WAITS)} waits, and nothing after it is ever taller.\n\n**The mean is ${fmt(mean, 2)}, far to the right of the mode.** $\\mu = 1/p = 1/${fmt(p, 2)}$, with $\\sigma = \\sqrt{1-p}/p = ${fmt(sd, 2)}$ — a spread the size of the mean itself. The average is not where the mass is; it is where the long thin tail drags the balance point.\n\nSo most waits are shorter than the average: $P(X \\le ${fmtInt(meanTrial)}) = ${fmt(byMean, 4)}$ against $P(X > ${fmtInt(meanTrial)}) = ${fmt(pastMean, 4)}$. Roughly ${fmtPct(byMean, 0)} of waits finish at or before the mean and ${fmtPct(pastMean, 0)} run past it — and for small $p$ that second figure settles near 37 percent no matter what $p$ is, because $(1-p)^{1/p} \\to e^{-1}$.\n\nTrials up to and including the first one. One over $p$ is the average over many waits, and most waits are shorter than it.`,
      misconception: `Reading $1/p$ as the wait to expect on this occasion. The mean of a geometric variable is the balance point of a distribution whose peak is at trial 1 — it is an average over many repetitions of the whole wait, and about ${fmtPct(pastMean, 0)} of individual waits run past it. A plan built on the mean has budgeted for something that happens less than half the time.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — 1/p is a long-run average, not a forecast
// ---------------------------------------------------------------------------------------------

export const interpretGeometricMean = defineGenerator({
  id: 'act-4/interpret-geometric-mean',
  label: 'Interpret a geometric mean in context',
  ap_topics: ['4.12'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const p = drawRate(rng, 0.06, 0.25)
    const { mean, sd } = geometricMoments(p)
    const meanTrial = Math.ceil(mean)
    const pBeyondMean = geometric.sf(meanTrial, p)
    const rubric = geometricMeanInterpretation({ meanTrials: mean, p, trial: ctx.trial, success: ctx.success, pBeyondMean })
    return {
      prompt: `${ctx.frame.replace('{pct}', fmtPct(p, 0))} The ${ctx.trials} are independent at that rate — ${ctx.why}.\n\n$X$ counts the ${ctx.trials} up to and including the first on which ${ctx.event}. The expected value is\n\n$$\\mu = \\frac{1}{p} = \\frac{1}{${fmt(p, 2)}} = ${fmt(mean, 1)} \\text{ ${ctx.trials}}$$\n\nIn one or two sentences, say what that ${fmt(mean, 1)} means about this file — name the ${ctx.trial} and the ${ctx.success} it counts, say what kind of average it is, and say what it does **not** promise about the next wait.`,
      answer: rubric,
      hints: [
        'An expected value is a long-run average over many repetitions of the whole process — many separate waits, each run from the beginning. It is not a countdown and it is not a forecast for the wait in front of you.',
        `Say what the mean is not. The single most likely outcome here is **one ${ctx.trial}**, at $P(X = 1) = ${fmt(geometric.pmf(1, p), 4)}$, and ${fmtPct(pBeyondMean, 0)} of waits run past ${ctx.trial} ${fmtInt(meanTrial)}.`,
        `Two sentences: how many ${ctx.trials} on average and over what, then what a single wait can do instead.`,
      ],
      solution: `${rubric.exemplar}\n\nThe arithmetic behind that sentence: $\\mu = 1/p = ${fmt(mean, 2)}$ and $\\sigma = \\sqrt{1-p}/p = ${fmt(sd, 2)}$ — a standard deviation almost the size of the mean, which is the formal way of saying that one wait tells you very little about the next. The distribution's peak is at ${ctx.trial} 1 and its mean is at ${fmt(mean, 1)}; $P(X \\le ${fmtInt(meanTrial)}) = ${fmt(geometric.cdf(meanTrial, p), 4)}$ of waits are over by the mean and $${fmt(pBeyondMean, 4)}$ are still running. Both halves of that belong in the sentence, because a reader who takes ${fmt(mean, 1)} as a plan has budgeted for the shorter side of a coin flip.`,
      misconception: `Writing "it will take ${fmt(mean, 1)} ${ctx.trials}" or "${fmt(mean, 1)} ${ctx.trials} is the most likely wait". The first turns an average into a prediction about one trial; the second hands the mode to the mean, when the mode of a geometric variable is trial 1 for every $p$ there is.`,
    }
  },
})
