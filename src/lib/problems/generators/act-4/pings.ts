/**
 * act-4-08 · Pings — drills. AP 4.10: the binomial setting (BINS), P(X = k), cumulative and
 * survival forms, and the 10% condition when the trials are draws from a finite population.
 *
 *   act-4/binomial-pmf            numeric  P(X = k) on a drawn setting            (checkpoint q10)
 *   act-4/binomial-cumulative     numeric  P(X ≤ k) against P(X < k) — the off-by-one cell
 *   act-4/binomial-none           numeric  P(0) across a planned window of close passes
 *   act-4/binomial-at-least       numeric  P(X ≥ k), from `binomial.atLeast` — never 1 − cdf
 *   act-4/binomial-conditions     choice   is this setting binomial, and which condition breaks
 *   act-4/ten-percent-condition   choice   draws without replacement: is the binomial adequate
 *
 * RESERVED — act-4-08's own scene, instrument and mission beats. No drill lands on any of them:
 *   · the loiter's close passes — 12 at the near point, 4 at the middle, 1 at the far — priced at
 *     p = 0.02 per pass while cold and 0.60 with the wings out, and the window-1 beat
 *     P(no detection over four passes) = 0.9224;
 *   · the hourly Perrine trial, p = 0.41/24 ≈ 0.0171, over the 62-hour and 64-hour Watch windows,
 *     and the beat P(at least one Perrine passage in window 1) = 0.6564;
 *   · the three registry figures printed beside them, P(≥ 1 while cold) = 0.2153 / 0.0776 / 0.0200;
 *   · the Transit Ledger's 31 losses in 2,612 transits, which belongs to act-4-09.
 * Every setting below is a different file in a different office, and `reservedSetting` /
 * `reservedAnswer` refuse any draw that lands on the Act's own numbers. Every probability comes
 * from `binomial.*` in @/lib/stats — nothing here is hand-computed.
 */
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { binomial, binomialMoments, choose } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Reserved: act-4-08's own settings and the probabilities the module prints.
// ---------------------------------------------------------------------------------------------

/** (n, p) pairs the module owns. A drill never runs on one of these. */
const RESERVED_SETTINGS: readonly (readonly [number, number])[] = [
  [12, 0.02],
  [4, 0.02],
  [1, 0.02],
  [62, 0.41 / 24],
  [64, 0.41 / 24],
  [2612, 46 / 4180],
  [2612, 13 / 2580],
]

/** The probabilities the scene, the instrument and the beats put on the page. */
const RESERVED_ANSWERS = [0.9224, 0.6564, 0.2153, 0.0776, 0.02, 0.6678]

function reservedSetting(n: number, p: number): boolean {
  if (n === 2612) return true
  return RESERVED_SETTINGS.some(([rn, rp]) => rn === n && Math.abs(p - rp) < 0.006)
}

function reservedAnswer(v: number): boolean {
  return RESERVED_ANSWERS.some((r) => Math.abs(v - r) < 0.002)
}

// ---------------------------------------------------------------------------------------------
// In-world binomial settings — other ships, other offices, other people's files
// ---------------------------------------------------------------------------------------------

interface TrialCtx {
  /** One sentence of framing. `{n}` is the trial count, `{p}` the per-trial percentage. */
  frame: string
  /** The trial, singular. */
  trial: string
  /** The trial, plural. */
  trials: string
  /** The success as a noun phrase, for "end in …". */
  event: string
  /** Why the trials are independent — the clause that earns the model. */
  why: string
}

const SETTINGS: TrialCtx[] = [
  {
    frame:
      'The Elara picket office priced a loiter of its own two years before this ship was laid down. A cutter lying cold behind Elara has {n} scheduled close passes of her holding point in a watch, and the office puts a passing hull’s nav sensors at {p} of returning a contact on any one pass.',
    trial: 'close pass',
    trials: 'close passes',
    event: 'a contact',
    why: 'different hulls, on tracks filed months apart by offices that do not speak to one another',
  },
  {
    frame: 'Uruk High’s departure office signs {n} certifications in a week. The quarterly audit reads each one blind and queries it with probability {p}.',
    trial: 'certification',
    trials: 'certifications',
    event: 'a query',
    why: 'the audit takes each file cold and carries no finding into the next one',
  },
  {
    frame: 'Adlinda Yards has {n} refits booked out of the dock this quarter, and the yard releases a hull late on {p} of them.',
    trial: 'refit',
    trials: 'refits',
    event: 'a late release',
    why: 'separate berths, separate crews and separate parts orders',
  },
  {
    frame: 'The Lane Authority logs {n} transits of the Saturn feeder run in a month. A Tessera-C drive drops its transponder at the mark on {p} of transits.',
    trial: 'transit',
    trials: 'transits',
    event: 'a dropout',
    why: 'different hulls with different crews, and a fault that does not travel between them',
  },
  {
    frame: '*Asgard*’s approach beacon is logged every time it is used. Over one patrol her master records {n} acquisitions, and the unit fails to lock on {p} of attempts.',
    trial: 'acquisition',
    trials: 'acquisitions',
    event: 'a failed lock',
    why: 'the unit is reset between attempts and carries nothing over from the last one',
  },
  {
    frame: 'The Ceres receiving office puts {n} arrivals across the scale in a shift, and a manifest comes back needing a reweigh on {p} of them.',
    trial: 'arrival',
    trials: 'arrivals',
    event: 'a reweigh',
    why: 'each manifest is filed by a different master and read by a different clerk',
  },
]

/** Settings whose trials are close passes of a cold hull — for the "planned window" drills. */
const WINDOW_SETTINGS: TrialCtx[] = [
  {
    frame:
      'The Elara picket plans a cold watch behind the moon. The published plot puts {n} hulls inside close-pass range of the holding point during the watch, and a cold cutter is picked up by a passing hull’s nav sensors on about {p} of passes.',
    trial: 'close pass',
    trials: 'close passes',
    event: 'a detection',
    why: 'different hulls on published tracks, none of which is looking for her',
  },
  {
    frame:
      'A Service survey boat intends to lie dark off the Themis Reach for one shift. Traffic control’s forward schedule carries {n} hulls past her inside sensor range, and the survey office prices a detection at {p} per pass.',
    trial: 'close pass',
    trials: 'close passes',
    event: 'a detection',
    why: 'the tracks were filed weeks ago by masters who have never heard of her',
  },
  {
    frame:
      'A Compact tender proposes to sit unlit at the edge of the Uruk approach while it repairs an antenna. {n} hulls are scheduled to pass within range while the work runs, and each one has about a {p} chance of resolving her against the background.',
    trial: 'scheduled pass',
    trials: 'scheduled passes',
    event: 'a detection',
    why: 'the passes belong to different hulls and nothing one of them sees changes what the next one does',
  },
]

function frameOf(ctx: TrialCtx, n: number, p: number): string {
  return ctx.frame.replace('{n}', fmtInt(n)).replace('{p}', fmtPct(p, 0))
}

/** "Binomial(n, p)" as KaTeX, with the numbers in it. */
function settingTex(n: number, p: number): string {
  return `X \\sim \\text{Binomial}\\left(n = ${n},\\; p = ${fmt(p, 2)}\\right)`
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — P(X = k) on a drawn setting (checkpoint q10)
// ---------------------------------------------------------------------------------------------

export const binomialPmf = defineGenerator({
  id: 'act-4/binomial-pmf',
  label: 'A binomial probability, P(X = k)',
  ap_topics: ['4.10'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(8, 22)
        const p = Math.round(r.uniform(0.08, 0.45) * 100) / 100
        const mu = n * p
        const k = Math.max(0, Math.min(n, Math.round(mu) + r.int(-1, 2)))
        return { n, p, k }
      },
      ({ n, p, k }) => {
        if (k < 1 || k > n - 1) return false
        if (reservedSetting(n, p)) return false
        const v = binomial.pmf(k, n, p)
        return v > 0.02 && v < 0.42 && !reservedAnswer(v)
      },
    )
    const { n, p, k } = draw
    const value = binomial.pmf(k, n, p)
    const ways = choose(n, k)
    const { mean: mu } = binomialMoments(n, p)
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nThe ${ctx.trials} are independent — ${ctx.why} — so the count is binomial. Let $X$ be the number of the ${fmtInt(n)} ${ctx.trials} that end in ${ctx.event}.\n\nWhat is $P(X = ${k})$? Report a probability to four decimal places.`,
      answer: numericAnswer(value, 'proportion', { digits: 4 }),
      hints: [
        'A binomial probability counts the arrangements and then prices one of them. Every arrangement with exactly this many successes has the same probability, so multiply that probability by the number of arrangements.',
        `There are $\\binom{${n}}{${k}} = ${fmtInt(ways)}$ ways for the ${ctx.event.replace(/^an? /, '')} to fall among the ${fmtInt(n)} ${ctx.trials}, and each of those ways is worth $${fmt(p, 2)}^{${k}} \\times ${fmt(1 - p, 2)}^{${n - k}}$.`,
        `$${fmtInt(ways)} \\times ${fmt(p, 2)}^{${k}} \\times ${fmt(1 - p, 2)}^{${n - k}}$, to four decimals.`,
      ],
      solution: `$$${settingTex(n, p)}$$\n\n$$P(X = ${k}) = \\binom{${n}}{${k}}(${fmt(p, 2)})^{${k}}(${fmt(1 - p, 2)})^{${n - k}} = ${fmtInt(ways)} \\times ${fmt(Math.pow(p, k), 6)} \\times ${fmt(Math.pow(1 - p, n - k), 6)} = ${fmt(value, 4)}$$\n\nThe probability is **${fmt(value, 4)}** — in about ${fmtPct(value, 1)} of weeks like this one, exactly ${k} of the ${fmtInt(n)} ${ctx.trials} end in ${ctx.event}.\n\nThe centre of the distribution is $np = ${fmt(mu, 2)}$, so ${k} ${k > mu ? 'sits above' : k < mu ? 'sits below' : 'sits at'} the expected count. A single cell of a binomial is rarely large: there are ${n + 1} possible counts and the probability has to be shared among all of them.`,
      misconception: `Dropping the $\\binom{${n}}{${k}}$. Without it you have priced **one particular arrangement** — these ${k} ${ctx.trials} and no others — which is $${fmt(Math.pow(p, k) * Math.pow(1 - p, n - k), 6)}$, not the probability that *some* ${k} of them do it. The binomial coefficient is the count of arrangements, and it is the whole difference between the two questions.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — P(X ≤ k) against P(X < k): the cell on the boundary
// ---------------------------------------------------------------------------------------------

export const binomialCumulative = defineGenerator({
  id: 'act-4/binomial-cumulative',
  label: 'A cumulative binomial probability',
  ap_topics: ['4.10'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const inclusive = rng.bool()
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(10, 24)
        const p = Math.round(r.uniform(0.1, 0.5) * 100) / 100
        const k = Math.max(1, Math.min(n - 1, Math.round(n * p) + r.int(-1, 2)))
        return { n, p, k }
      },
      ({ n, p, k }) => {
        if (reservedSetting(n, p)) return false
        const cell = binomial.pmf(k, n, p)
        if (cell < 0.05) return false
        const v = inclusive ? binomial.cdf(k, n, p) : binomial.cdf(k - 1, n, p)
        return v > 0.08 && v < 0.94 && !reservedAnswer(v)
      },
    )
    const { n, p, k } = draw
    const pLe = binomial.cdf(k, n, p)
    const pLt = binomial.cdf(k - 1, n, p)
    const cell = binomial.pmf(k, n, p)
    const value = inclusive ? pLe : pLt
    const asked = inclusive ? `P(X \\le ${k})` : `P(X < ${k})`
    const askedWords = inclusive ? `**at most** ${k}` : `**fewer than** ${k}`
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nThe ${ctx.trials} are independent — ${ctx.why} — so $X$, the number of the ${fmtInt(n)} ${ctx.trials} that end in ${ctx.event}, is binomial.\n\nWhat is $${asked}$ — the probability that ${askedWords} of them do? Report a probability to four decimal places.`,
      answer: numericAnswer(value, 'proportion', { digits: 4 }),
      hints: [
        'A cumulative probability is a sum of cells. Decide first which cells the wording includes — and in particular whether the cell at the boundary is one of them.',
        inclusive
          ? `"At most ${k}" keeps the cell at ${k}: add $P(X = 0)$ through $P(X = ${k})$.`
          : `"Fewer than ${k}" throws the cell at ${k} away: add $P(X = 0)$ through $P(X = ${k - 1})$.`,
        `Sum the ${inclusive ? k + 1 : k} cells from 0 to ${inclusive ? k : k - 1} for $${settingTex(n, p).replace('X \\sim \\text{Binomial}', '\\text{Binomial}')}$, to four decimals.`,
      ],
      solution: `$$${settingTex(n, p)}$$\n\n$$${asked} = \\sum_{i=0}^{${inclusive ? k : k - 1}} \\binom{${n}}{i}(${fmt(p, 2)})^{i}(${fmt(1 - p, 2)})^{${n}-i} = ${fmt(value, 4)}$$\n\nThe probability is **${fmt(value, 4)}**.\n\nThe two neighbours are worth writing down together: $P(X \\le ${k}) = ${fmt(pLe, 4)}$ and $P(X < ${k}) = ${fmt(pLt, 4)}$. They differ by $P(X = ${k}) = ${fmt(cell, 4)}$ — the whole of the cell at ${k}, ${fmtPct(cell, 1)} of the distribution. On a count there is no rounding to hide in: the boundary is a real quantity of probability and it belongs on exactly one side of the question.`,
      misconception: `Reading "${inclusive ? 'at most' : 'fewer than'} ${k}" as "${inclusive ? 'fewer than' : 'at most'} ${k}" and returning ${fmt(inclusive ? pLt : pLe, 4)}. That answer is wrong by ${fmt(cell, 4)} — one whole cell — and it is the commonest way a binomial question is lost. Write the inequality out in symbols before touching the arithmetic.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — P(0) across a planned window of close passes
// ---------------------------------------------------------------------------------------------

export const binomialNone = defineGenerator({
  id: 'act-4/binomial-none',
  label: 'The probability a planned window passes unobserved',
  ap_topics: ['4.10'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, WINDOW_SETTINGS)
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(6, 20)
        const p = Math.round(r.uniform(0.03, 0.15) * 100) / 100
        return { n, p }
      },
      ({ n, p }) => {
        if (reservedSetting(n, p)) return false
        const v = binomial.pmf(0, n, p)
        return v > 0.15 && v < 0.85 && !reservedAnswer(v)
      },
    )
    const { n, p } = draw
    const value = binomial.pmf(0, n, p)
    const atLeastOne = binomial.atLeast(1, n, p)
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nThe ${ctx.trials} are independent — ${ctx.why} — so the number of them that end in ${ctx.event} is binomial with $n = ${fmtInt(n)}$ and $p = ${fmt(p, 2)}$.\n\nWhat is the probability that the whole window passes with **no detection at all**? Report a probability to four decimal places.`,
      answer: numericAnswer(value, 'proportion', { digits: 4 }),
      hints: [
        'Zero successes means every single trial came out the other way. There is exactly one arrangement that does that, so the binomial coefficient is 1 and the formula collapses.',
        `Each pass fails to detect her with probability $1 - ${fmt(p, 2)} = ${fmt(1 - p, 2)}$, and there are ${fmtInt(n)} of them.`,
        `$(${fmt(1 - p, 2)})^{${n}}$, to four decimals.`,
      ],
      solution: `$$P(X = 0) = \\binom{${n}}{0}(${fmt(p, 2)})^{0}(${fmt(1 - p, 2)})^{${n}} = (${fmt(1 - p, 2)})^{${n}} = ${fmt(value, 4)}$$\n\nThe window passes unobserved with probability **${fmt(value, 4)}**, so the plan carries a ${fmtPct(atLeastOne, 1)} chance that at least one ${ctx.trial} ends in ${ctx.event}: $P(X \\ge 1) = 1 - P(X = 0) = ${fmt(atLeastOne, 4)}$.\n\nThat second number is the one that goes on a plan. "Probably not seen" is not a risk term; ${fmt(atLeastOne, 4)} is.`,
      misconception: `Multiplying $${fmt(p, 2)}$ by itself ${fmtInt(n)} times instead of $${fmt(1 - p, 2)}$. $P(X = 0)$ is the probability that the event does **not** happen on any trial, so the factor that gets raised to the power is the complement. The other slip is answering the question the plan actually cares about — $P(X \\ge 1) = ${fmt(atLeastOne, 4)}$ — when the question asked for the chance of nothing at all.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — P(X ≥ k), from the survival form
// ---------------------------------------------------------------------------------------------

export const binomialAtLeast = defineGenerator({
  id: 'act-4/binomial-at-least',
  label: 'A binomial upper tail, P(X ≥ k)',
  ap_topics: ['4.10'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, SETTINGS)
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(12, 30)
        const p = Math.round(r.uniform(0.05, 0.28) * 100) / 100
        const k = Math.max(2, Math.round(n * p) + r.int(0, 3))
        return { n, p, k }
      },
      ({ n, p, k }) => {
        if (k > n - 1) return false
        if (reservedSetting(n, p)) return false
        const v = binomial.atLeast(k, n, p)
        return v > 0.03 && v < 0.6 && !reservedAnswer(v)
      },
    )
    const { n, p, k } = draw
    const value = binomial.atLeast(k, n, p)
    const below = binomial.cdf(k - 1, n, p)
    const strict = binomial.sf(k, n, p)
    const cell = binomial.pmf(k, n, p)
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nThe ${ctx.trials} are independent — ${ctx.why} — so $X$, the number of the ${fmtInt(n)} ${ctx.trials} that end in ${ctx.event}, is binomial.\n\nWhat is $P(X \\ge ${k})$ — the probability of **${k} or more**? Report a probability to four decimal places.`,
      answer: numericAnswer(value, 'proportion', { digits: 4 }),
      hints: [
        'An upper tail is every cell from the boundary upward. Adding them one at a time works but is slow; the short way is to take everything below the boundary away from the whole.',
        `"${k} or more" keeps the cell at ${k}. Everything it excludes is $P(X \\le ${k - 1}) = ${fmt(below, 4)}$.`,
        `$1 - P(X \\le ${k - 1}) = 1 - ${fmt(below, 4)}$, to four decimals.`,
      ],
      solution: `$$${settingTex(n, p)}$$\n\n$$P(X \\ge ${k}) = \\sum_{i=${k}}^{${n}} \\binom{${n}}{i}(${fmt(p, 2)})^{i}(${fmt(1 - p, 2)})^{${n}-i} = 1 - P(X \\le ${k - 1}) = 1 - ${fmt(below, 4)} = ${fmt(value, 4)}$$\n\nThe probability is **${fmt(value, 4)}**.\n\nTake the complement of $P(X \\le ${k - 1})$, not of $P(X \\le ${k})$: "${k} or more" keeps the cell at ${k}, which is worth ${fmt(cell, 4)} on its own. Strictly *more* than ${k} is a different number, $P(X > ${k}) = ${fmt(strict, 4)}$, and it differs from the answer by exactly that cell.`,
      misconception: `Subtracting $P(X \\le ${k})$ instead of $P(X \\le ${k - 1})$, which returns ${fmt(strict, 4)} — the probability of strictly more than ${k}. The cell at the boundary belongs to "at least ${k}" and the arithmetic has to keep it. The other slip is quoting the expected count $np = ${fmt(n * p, 2)}$ as though a tail could be read off the mean.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — is this setting binomial (BINS), and which condition breaks
// ---------------------------------------------------------------------------------------------

type Broken = 'none' | 'independent' | 'same-p' | 'fixed-n' | 'binary'

interface ConditionCase {
  text: string
  broken: Broken
  /** What actually goes wrong (or why nothing does), used in the solution. */
  why: string
}

const CONDITION_CASES: ConditionCase[] = [
  {
    text:
      'Twenty-two hulls appear on next month’s published plot with tracks carrying them inside close-pass range of the Elara picket’s holding point. The picket prices every one of them at the same per-pass chance of returning a contact and counts how many do.',
    broken: 'none',
    why: 'twenty-two passes fixed in advance, each seen-or-not-seen, each at the same rate, and each by a different hull whose track was filed by an office that has never heard of the picket',
  },
  {
    text:
      'An entry on the Eyes’ sweep log that closes on something buys that sector a focused re-sweep before the pattern walks on. Take the next fifteen entries and count how many of them detect.',
    broken: 'independent',
    why: 'a detection is what sends the aperture back to that bearing, so the second entry is a sweep the ship aimed and the first was not — the per-entry probability jumps from about six in a hundred to better than half',
  },
  {
    text:
      'A cutter works three holding points in one watch — near, middle and far — and counts every pass across all three that returns a contact. The per-pass probability at the near point is several times the one at the far point.',
    broken: 'same-p',
    why: 'three ranges, three different per-pass probabilities, all poured into one count; the binomial asks for one p and this setting has three',
  },
  {
    text: 'The Eyes keep sweeping the same bearing until something closes on it, and the watch officer records how many sweeps that took.',
    broken: 'fixed-n',
    why: 'the number of trials is the thing being recorded, not something settled before the counting starts — that is a geometric count, not a binomial one',
  },
  {
    text: 'Every entry on the sweep log is filed as thermal, optical, RF or nothing, and the watch officer counts the entries by mode.',
    broken: 'binary',
    why: 'four categories counted four ways; collapse the log to detected-or-not-detected and it becomes binomial again, which is exactly what a binomial answer would quietly be assuming',
  },
  {
    text:
      'Uruk High signs a hundred and forty departure certifications in a week. The quarterly audit reads each one blind, queries it or does not, and queries at the same rate all week. The office counts the queries.',
    broken: 'none',
    why: 'a hundred and forty files fixed in advance, two outcomes each, one rate, and an audit that carries nothing from one file into the next',
  },
  {
    text:
      'A scale at Ceres receiving is drifting. Once it reads a manifest heavy it goes on reading heavy until somebody recalibrates it, and the shift counts how many of forty arrivals came back needing a reweigh.',
    broken: 'independent',
    why: 'the instrument remembers: one heavy reading makes the next one far likelier, so the forty arrivals are not forty separate trials',
  },
  {
    text:
      'A survey boat lies dark for a shift while traffic thickens hour by hour. The office counts the passes that resolve her, knowing the per-pass chance climbs steadily from the first hour to the last as the hulls come closer together.',
    broken: 'same-p',
    why: 'the per-trial probability is a moving quantity across the shift, and the binomial wants one number that holds for every trial',
  },
]

interface ConditionOption {
  broken: Broken
  text: string
  /** Shown when this option is chosen and is wrong. */
  whyNot: string
}

const CONDITION_OPTIONS: ConditionOption[] = [
  {
    broken: 'none',
    text: 'Nothing breaks. The number of trials is fixed beforehand, each trial is a success or a failure, the probability is the same every time, and the trials do not talk to one another — the count is binomial.',
    whyNot: 'Something here does break. Walk the four conditions in order — fixed n, binary outcome, the same p, independent trials — and one of them will not survive the reading.',
  },
  {
    broken: 'independent',
    text: 'Independence. One trial’s result changes the probability on the next, so these are not separate trials at all.',
    whyNot: 'Nothing here carries the outcome of one trial into the next. The trials in this setting can be taken one at a time without any of them knowing what the others did.',
  },
  {
    broken: 'same-p',
    text: 'The same probability on every trial. There is no single p here — it differs from trial to trial.',
    whyNot: 'One rate holds across every trial in this setting. The problem, if there is one, is somewhere else in the four conditions.',
  },
  {
    broken: 'fixed-n',
    text: 'A fixed number of trials. n is not settled before the counting begins — it is whatever the process turns out to need.',
    whyNot: 'The number of trials in this setting is known before anybody starts counting, so n is fixed in the sense the binomial requires.',
  },
  {
    broken: 'binary',
    text: 'Two outcomes. The trial does not resolve into success-or-failure as it is written; it has more categories than that.',
    whyNot: 'Each trial in this setting has exactly two outcomes as it stands — it happens or it does not — so the binary condition is not the one in trouble.',
  },
]

export const binomialConditions = defineGenerator({
  id: 'act-4/binomial-conditions',
  label: 'Is this setting binomial?',
  ap_topics: ['4.10'],
  skills: ['1', '4'],
  generate(rng) {
    const kase = pickContext(rng, CONDITION_CASES)
    const shuffled = rng.shuffle(CONDITION_OPTIONS)
    const correct = shuffled.findIndex((o) => o.broken === kase.broken)
    return {
      prompt: `A setting from somebody else's file:\n\n> ${kase.text}\n\nA binomial count needs four things: a **fixed** number of trials, a **binary** outcome on each, **independent** trials, and the **same** probability on every one of them. Which of the four does this setting fail — or does it fail none of them?`,
      answer: {
        type: 'choice' as const,
        options: shuffled.map((o) => o.text),
        correct,
        feedback: shuffled.map((o, i) => (i === correct ? null : o.whyNot)),
      },
      hints: [
        'Take the four conditions one at a time and read the setting against each: is n fixed before the count starts, does each trial land in one of two buckets, does the same probability apply every time, and can one trial learn anything from another?',
        'The condition that fails is usually named in the setting’s own words — a rate that "climbs", a re-look that a result "buys", a count that runs "until" something happens, or a list of more than two categories.',
      ],
      solution: `${kase.broken === 'none' ? 'This setting is binomial.' : 'This setting is **not** binomial as written.'}\n\n${kase.broken === 'none' ? 'All four conditions hold: ' : 'The condition that fails is the one named above, because '}${kase.why}.\n\nThe binomial is a model, not a description, and it earns its place one condition at a time. When it does not fit, the honest move is to say which condition broke and price the question another way — with the general multiplication rule when the trials carry information into each other, with a geometric count when n is the answer rather than the setting, or by collapsing the categories before you count when the outcome has more than two.`,
      misconception:
        'Treating "the trials feel unrelated" as independence. Independence is a claim about a mechanism: two hulls on tracks filed months apart by different offices are independent because nothing joins them, while two consecutive sweeps by one ship are not, because the ship’s own doctrine sends the aperture back. Nothing is independent because it looks it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — the 10% condition on draws without replacement
// ---------------------------------------------------------------------------------------------

interface SampleCtx {
  /** `{n}` drawn, `{N}` in the population. */
  frame: string
  /** The individuals, plural. */
  unit: string
  /** The success being counted. */
  event: string
}

const SAMPLES: SampleCtx[] = [
  {
    frame: 'The Lane Authority holds {N} transit records for the Ceres approach. An assessor pulls {n} of them at random, without replacement, and counts how many carry an off-nominal advisory.',
    unit: 'transit records',
    event: 'an off-nominal advisory',
  },
  {
    frame: 'Uruk High’s file holds {N} departure certifications from the last two years. The audit draws {n} at random, without replacement, and counts how many have to be queried.',
    unit: 'certifications',
    event: 'a query',
  },
  {
    frame: 'Adlinda Yards has {N} refit records on the books. An inspector takes {n} of them at random, without replacement, and counts the late releases.',
    unit: 'refit records',
    event: 'a late release',
  },
  {
    frame: 'The Ceres receiving office has {N} manifests on file for the quarter. A clerk pulls {n} at random, without replacement, and counts how many were reweighed.',
    unit: 'manifests',
    event: 'a reweigh',
  },
  {
    frame: 'The picket’s sweep archive holds {N} logged contacts. An officer draws {n} of them at random, without replacement, and counts how many were resolved thermally.',
    unit: 'logged contacts',
    event: 'a thermal resolution',
  },
]

export const tenPercentCondition = defineGenerator({
  id: 'act-4/ten-percent-condition',
  label: 'The 10% condition on draws without replacement',
  ap_topics: ['4.10'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, SAMPLES)
    const adequate = rng.bool()
    const draw = retry(
      rng,
      (r) => {
        const N = r.int(12, 90) * 50
        const n = adequate ? Math.round(N * r.uniform(0.015, 0.07)) : Math.round(N * r.uniform(0.16, 0.45))
        return { N, n }
      },
      ({ N, n }) => {
        if (n < 12) return false
        const ratio = n / N
        return adequate ? ratio < 0.075 : ratio > 0.15 && ratio < 0.5
      },
    )
    const { N, n } = draw
    const ratio = n / N
    const tenth = N / 10
    const options = [
      {
        adequate: true,
        text: 'Yes. The draws are made without replacement, so the trials are not strictly independent — but the sample is under a tenth of the population, so the probability moves too little from draw to draw for the binomial to be misleading.',
        whyNot: `Check the ratio before you say yes: ${fmtInt(n)} of ${fmtInt(N)} is ${fmtPct(ratio, 1)}, which is above a tenth. The condition this answer relies on is the one that fails here.`,
      },
      {
        adequate: false,
        text: 'No. The draws are without replacement and the sample is more than a tenth of the population, so the probability shifts enough from draw to draw that a binomial model will misstate the spread of the count.',
        whyNot: `Check the ratio: ${fmtInt(n)} of ${fmtInt(N)} is ${fmtPct(ratio, 1)}, comfortably under a tenth, so the drift between draws is small enough to ignore and the binomial is adequate here.`,
      },
      {
        adequate: null,
        text: 'Yes, because the sample is large enough for the count to be treated as approximately normal.',
        whyNot: 'That is a different condition entirely — the Large Counts check, which governs when a normal curve may stand in for a binomial. It says nothing about whether the binomial itself applies.',
      },
      {
        adequate: null,
        text: 'No. Any sample drawn without replacement breaks independence, and the binomial requires the trials to be exactly independent.',
        whyNot: 'Too strict. Sampling without replacement is never exactly independent, which is precisely why the 10% condition exists: it is the rule for deciding when the departure is small enough not to matter.',
      },
      {
        adequate: null,
        text: 'Yes, because each draw has only two outcomes, and a binary outcome is the only thing the binomial model asks for.',
        whyNot: 'A binary outcome is one of four requirements, not all of them. Fixed n, the same probability each time and independent trials have to hold as well — and independence is the one under strain here.',
      },
    ]
    const shuffled = rng.shuffle(options)
    const correct = shuffled.findIndex((o) => o.adequate === adequate)
    return {
      prompt: `${ctx.frame.replace('{N}', fmtInt(N)).replace('{n}', fmtInt(n))}\n\nThe officer wants to model the count of ${ctx.unit} in the sample that show ${ctx.event} as a binomial random variable. Is the binomial adequate here, and why?`,
      answer: {
        type: 'choice' as const,
        options: shuffled.map((o) => o.text),
        correct,
        feedback: shuffled.map((o, i) => (i === correct ? null : o.whyNot)),
      },
      hints: [
        'Drawing without replacement changes the population left behind, so the probability on the second draw is not quite what it was on the first. The question is whether it changes enough to matter.',
        `Compare the sample with a tenth of the population: ${fmtInt(n)} against ${fmtInt(tenth)}.`,
      ],
      solution: `The sample is ${fmtInt(n)} of ${fmtInt(N)} ${ctx.unit}, which is ${fmtPct(ratio, 1)} of the population — ${adequate ? 'below' : 'above'} the tenth the condition allows.\n\n$$\\frac{n}{N} = \\frac{${n}}{${N}} = ${fmt(ratio, 3)} \\quad ${adequate ? '\\le' : '>'} \\quad 0.10$$\n\n${adequate ? `So the binomial is **adequate**. The draws are not independent — every ${ctx.unit.replace(/s$/, '')} taken out changes the mix left in the file — but with the sample this small a fraction of the population, the per-draw probability barely moves and the binomial's answers are close enough to use.` : `So the binomial is **not adequate** here. With ${fmtPct(ratio, 0)} of the file drawn, the per-draw probability drifts noticeably as the sample is taken, and the binomial will get the spread of the count wrong — it assumes a constancy the sampling scheme has taken away.`}\n\nThe condition is about the *size of the departure*, not about whether a departure exists. Without replacement, independence never holds exactly; the 10% rule is the working limit under which the model survives it.`,
      misconception: `Checking the sample size on its own. ${fmtInt(n)} is neither large nor small until you say what it is ${fmtPct(0.1, 0)} of — the same ${fmtInt(n)} draws are fine from a file of ${fmtInt(n * 20)} and not fine from a file of ${fmtInt(Math.round(n * 2))}. The 10% condition is a ratio, and the population has to be named before it can be checked.`,
    }
  },
})
