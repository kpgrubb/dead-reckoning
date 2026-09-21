/**
 * act-4-09 · Thirty-One in Twenty-Six Hundred — drills. AP 4.11: the mean and standard deviation of
 * a binomial count, the shape of the distribution as n and p move, and judging whether an observed
 * count is surprising *under a stated baseline* — from a tail, never from a point.
 *
 *   act-4/binomial-moments             numeric         μ = np and σ = √(np(1−p))   (checkpoint q11)
 *   act-4/binomial-tail                numeric         P(X ≥ k) under a stated baseline
 *   act-4/binomial-z-distance          numeric         (x − np)/√(np(1−p)) — how far out the count is
 *   act-4/binomial-shape               choice          shape against np and n(1 − p)
 *   act-4/two-baseline-compare         choice          one count, two baselines — what changed is p
 *   act-4/interpret-binomial-surprise  interpretation  surprise as a tail under a named baseline
 *
 * RESERVED — act-4-09's own scene, instrument and mission beats. No drill lands on any of them:
 *   · the Transit Ledger's 31 losses in 2,612 Lane transits;
 *   · the Board's comparison corridor, 46 in 4,180 → p = 0.011005, μ = 28.74, σ = 5.33, z = 0.42,
 *     P(X ≥ 31) = 0.361;
 *   · your 2176 *Asgard* report, 13 in 2,580 → p = 0.0050388, μ = 13.16, σ = 3.62, z = 4.93,
 *     P(X ≥ 31) = 1.84 × 10⁻⁵.
 * Every count below is a different file kept by a different office, and `reservedSetting` /
 * `reservedValue` refuse any draw that lands on the module's own arithmetic. Every moment and tail
 * comes from `binomialMoments` / `binomial.atLeast` in @/lib/stats — nothing here is hand-computed,
 * and no tail is ever taken as 1 − cdf.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import { binomial, binomialMoments } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { binomialSurpriseInterpretation } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Reserved: the Ledger, the two baselines, and every number the module prints beside them.
// ---------------------------------------------------------------------------------------------

const LEDGER_N = 2612
const LEDGER_X = 31
/** The Board's comparison corridor and the 2176 report. */
const RESERVED_P = [46 / 4180, 13 / 2580]
/** The moments, distances and tails the module puts on the page. */
const RESERVED_VALUES = [28.74, 13.16, 5.33, 3.62, 0.42, 4.93, 0.361]

function reservedSetting(n: number, p: number, x?: number): boolean {
  if (Math.abs(n - LEDGER_N) < 60) return true
  if (x !== undefined && x === LEDGER_X && Math.abs(n - LEDGER_N) < 400) return true
  return RESERVED_P.some((rp) => Math.abs(p - rp) < 0.0008)
}

function reservedValue(v: number): boolean {
  return RESERVED_VALUES.some((r) => Math.abs(v - r) < 0.012)
}

// ---------------------------------------------------------------------------------------------
// In-world counts — other corridors, other offices, other people's baselines
// ---------------------------------------------------------------------------------------------

interface CountCtx {
  /** Framing. `{n}` is the trial count, `{p}` the baseline as a percentage. */
  frame: string
  /** The file itself, as a noun phrase that can open a sentence. */
  file: string
  /** The trials, plural. */
  unit: string
  /** The trial, singular. */
  one: string
  /** The successes being counted, plural. */
  event: string
  /** Where the baseline comes from — the phrase a learner must name. */
  baseline: string
}

const COUNTS: CountCtx[] = [
  {
    frame: 'The Bureau of Corridors publishes a loss rate for every stretch it lists. On the Themis Reach it quotes {p} a transit, and the Reach carried {n} transits last year.',
    file: 'The Bureau of Corridors’ Themis Reach file',
    unit: 'transits',
    one: 'transit',
    event: 'losses',
    baseline: 'the Bureau of Corridors’ Themis Reach figure',
  },
  {
    frame: 'Uruk High’s harbour office puts the chance that a departure certification is queried on audit at {p}. It signed {n} certifications last quarter.',
    file: 'Uruk High’s quarterly certification file',
    unit: 'certifications',
    one: 'certification',
    event: 'queries',
    baseline: 'the harbour office’s own audit rate',
  },
  {
    frame: 'The Elara picket’s standing order prices a cold watch at {p} of being resolved on any one close pass. The picket logged {n} close passes over the season.',
    file: 'The Elara picket’s close-pass log',
    unit: 'close passes',
    one: 'close pass',
    event: 'detections',
    baseline: 'the picket’s standing-order figure',
  },
  {
    frame: 'Adlinda Yards budgets against a late-release rate of {p}. It released {n} hulls from the dock over the period.',
    file: 'Adlinda Yards’ release book',
    unit: 'releases',
    one: 'release',
    event: 'late releases',
    baseline: 'the yard’s own budget figure',
  },
  {
    frame: 'The Lane Authority’s maintenance note puts transponder dropouts at Mark 6 at {p} of transits. The Saturn feeder run carried {n} transits over the year.',
    file: 'The Lane Authority’s Saturn feeder file',
    unit: 'transits',
    one: 'transit',
    event: 'dropouts',
    baseline: 'the Authority’s maintenance note',
  },
  {
    frame: 'The Ceres receiving office works to a reweigh rate of {p} a manifest. It put {n} manifests across the scale over the quarter.',
    file: 'The Ceres receiving office’s scale book',
    unit: 'manifests',
    one: 'manifest',
    event: 'reweighs',
    baseline: 'the receiving office’s working rate',
  },
]

/** The shape drill needs settings where a rate may sensibly be anything from a few percent to most. */
interface ShapeCtx {
  /** `{n}` trials, `{p}` the rate. */
  frame: string
  unit: string
  event: string
  /** The plausible range for this file's rate. */
  pRange: readonly [number, number]
}

const SHAPE_CONTEXTS: ShapeCtx[] = [
  {
    frame: 'One season of the Elara picket line comes to {n} logged contacts, and {p} of contacts in that file were resolved thermally rather than any other way.',
    unit: 'contacts',
    event: 'thermal resolutions',
    pRange: [0.55, 0.88],
  },
  {
    frame: 'The Lane Authority files {n} transits of the Ceres approach this month, and {p} of transits log at least one off-nominal advisory.',
    unit: 'transits',
    event: 'advisories',
    pRange: [0.04, 0.38],
  },
  {
    frame: 'Adlinda Yards has {n} refits on the books, and {p} of refits need a second dock period before release.',
    unit: 'refits',
    event: 'second dock periods',
    pRange: [0.03, 0.3],
  },
  {
    frame: 'The Ceres receiving office weighs {n} manifests a quarter, and {p} of manifests match the declared mass inside tolerance at the first attempt.',
    unit: 'manifests',
    event: 'clean matches',
    pRange: [0.78, 0.97],
  },
  {
    frame: 'Uruk High signs {n} departure certifications a quarter, and {p} of them draw at least one clarifying query before they are cleared.',
    unit: 'certifications',
    event: 'queried certifications',
    pRange: [0.05, 0.42],
  },
]

function frameOf(ctx: CountCtx, n: number, p: number): string {
  return ctx.frame.replace('{n}', fmtInt(n)).replace('{p}', fmtPct(p, 2))
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — μ = np and σ = √(np(1 − p)) (checkpoint q11)
// ---------------------------------------------------------------------------------------------

export const binomialMomentsDrill = defineGenerator({
  id: 'act-4/binomial-moments',
  label: 'The mean and SD of a binomial count',
  ap_topics: ['4.11'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, COUNTS)
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(9, 70) * 50
        const p = Math.round(r.uniform(0.004, 0.07) * 10000) / 10000
        return { n, p }
      },
      ({ n, p }) => {
        if (reservedSetting(n, p)) return false
        const m = binomialMoments(n, p)
        return m.mean > 6 && m.mean < 160 && m.sd > 2 && m.sd < 13 && !reservedValue(m.sd) && !reservedValue(m.mean)
      },
    )
    const { n, p } = draw
    const { mean: mu, sd: sigma, variance } = binomialMoments(n, p)
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nTreat the ${fmtInt(n)} ${ctx.unit} as independent trials at that rate, so the number of ${ctx.event} is binomial with $n = ${n}$ and $p = ${fmt(p, 4)}$.\n\nWhat are the **mean** and the **standard deviation** of the count of ${ctx.event}? Report the standard deviation to two decimal places.`,
      answer: numericAnswer(sigma, 'other', { digits: 2, tolerance: 0.01 }),
      hints: [
        'A binomial count is a sum of n independent trials worth 1 or 0 each. Means add, and so do variances — the standard deviation is what you get at the very end, from the square root.',
        `The mean is $np = ${n} \\times ${fmt(p, 4)} = ${fmt(mu, 2)}$. The variance is $np(1-p)$, with the second factor being $1 - ${fmt(p, 4)} = ${fmt(1 - p, 4)}$.`,
        `$\\sqrt{${n} \\times ${fmt(p, 4)} \\times ${fmt(1 - p, 4)}}$, to two decimals.`,
      ],
      solution: `$$\\mu = np = ${n} \\times ${fmt(p, 4)} = ${fmt(mu, 2)}\\ \\text{${ctx.event}}$$\n\n$$\\sigma = \\sqrt{np(1-p)} = \\sqrt{${n} \\times ${fmt(p, 4)} \\times ${fmt(1 - p, 4)}} = \\sqrt{${fmt(variance, 3)}} = ${fmt(sigma, 2)}$$\n\nSo a year like this one averages **${fmt(mu, 2)}** ${ctx.event}, and the count typically lands about **${fmt(sigma, 2)}** away from that. Two-thirds of such years fall between roughly ${fmt(mu - sigma, 1)} and ${fmt(mu + sigma, 1)}, and a count outside ${fmt(mu - 2 * sigma, 1)} to ${fmt(mu + 2 * sigma, 1)} is already unusual under this baseline.\n\nNote the size of the two numbers. The mean grows with $n$; the standard deviation grows only with $\\sqrt{n}$, which is why a large file has a count that is large *and* comparatively stable.`,
      misconception: `Quoting $np = ${fmt(mu, 2)}$ as the standard deviation. That is where the distribution sits, not how far it wanders; the spread needs the second factor $(1 - p)$ and then the square root, and it comes to ${fmt(sigma, 2)}. The other slip is stopping at the variance, ${fmt(variance, 2)} — a variance is in squared ${ctx.event}, and nothing about a count is measured in those.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the upper tail under a stated baseline
// ---------------------------------------------------------------------------------------------

export const binomialTail = defineGenerator({
  id: 'act-4/binomial-tail',
  label: 'A binomial tail under a stated baseline',
  ap_topics: ['4.11'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, COUNTS)
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(8, 50) * 50
        const p = Math.round(r.uniform(0.006, 0.05) * 10000) / 10000
        const m = binomialMoments(n, p)
        const x = Math.round(m.mean + m.sd * r.uniform(0.8, 2.3))
        return { n, p, x }
      },
      ({ n, p, x }) => {
        if (reservedSetting(n, p, x)) return false
        const m = binomialMoments(n, p)
        if (!(m.mean > 5 && m.mean < 90) || x <= m.mean) return false
        const tail = binomial.atLeast(x, n, p)
        return tail > 0.012 && tail < 0.3 && !reservedValue(tail)
      },
    )
    const { n, p, x } = draw
    const { mean: mu, sd: sigma } = binomialMoments(n, p)
    const tail = binomial.atLeast(x, n, p)
    const strict = binomial.sf(x, n, p)
    const cell = binomial.pmf(x, n, p)
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nThe file for that period records **${x}** ${ctx.event}. Take the baseline rate as correct and model the count as binomial with $n = ${n}$ and $p = ${fmt(p, 4)}$.\n\nWhat is $P(X \\ge ${x})$ — the probability of **${x} or more** ${ctx.event} under that baseline? Report a probability to four decimal places.`,
      answer: numericAnswer(tail, 'proportion', { digits: 4 }),
      hints: [
        'Surprise lives in a tail, not in a cell. The question is not how likely this exact count is, but how likely a count this far out or further would be if the baseline held.',
        `"${x} or more" keeps the cell at ${x}, so the tail is one minus everything strictly below it: $1 - P(X \\le ${x - 1})$, not $1 - P(X \\le ${x})$.`,
        `With $\\mu = ${fmt(mu, 2)}$ and $\\sigma = ${fmt(sigma, 2)}$, the count sits ${fmt((x - mu) / sigma, 2)} standard deviations out. Compute $1 - P(X \\le ${x - 1})$ to four decimals.`,
      ],
      solution: `Under ${ctx.baseline}, $\\mu = np = ${fmt(mu, 2)}$ and $\\sigma = \\sqrt{np(1-p)} = ${fmt(sigma, 2)}$, so ${x} sits ${fmt((x - mu) / sigma, 2)} standard deviations above the mean.\n\n$$P(X \\ge ${x}) = 1 - P(X \\le ${x - 1}) = ${fmt(tail, 4)}$$\n\nThe probability is **${fmt(tail, 4)}**: under this baseline, about ${fmtPct(tail, 1)} of periods like this one would produce ${x} ${ctx.event} or more. ${tail > 0.05 ? 'That is not an unusual count under the stated rate — the baseline explains it without strain.' : 'That is an uncommon count under the stated rate, though the verdict belongs to the baseline and not to the arithmetic.'}\n\nThe cell itself, $P(X = ${x}) = ${fmt(cell, 4)}$, is far smaller than the tail, and strictly *more* than ${x} is smaller again at ${fmt(strict, 4)}. Only one of the three answers the question asked.`,
      misconception: `Reporting $P(X = ${x}) = ${fmt(cell, 4)}$ and calling the count surprising or unsurprising on that. Every single count in a distribution this wide has a small probability; the mean itself only carries ${fmt(binomial.pmf(Math.round(mu), n, p), 4)}. Surprise is the weight of everything at or beyond the observed count, which is ${fmt(tail, 4)}. The other slip is subtracting $P(X \\le ${x})$ and returning ${fmt(strict, 4)} — that throws away the observed count itself.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — the standardized distance of the count from the baseline's mean
// ---------------------------------------------------------------------------------------------

export const binomialZDistance = defineGenerator({
  id: 'act-4/binomial-z-distance',
  label: 'How far out the count sits',
  ap_topics: ['4.11'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, COUNTS)
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(8, 60) * 50
        const p = Math.round(r.uniform(0.005, 0.06) * 10000) / 10000
        const m = binomialMoments(n, p)
        const x = Math.round(m.mean + m.sd * r.uniform(-2.6, 4.2))
        return { n, p, x }
      },
      ({ n, p, x }) => {
        if (reservedSetting(n, p, x)) return false
        if (x < 0) return false
        const m = binomialMoments(n, p)
        if (!(m.mean > 6 && m.sd > 2)) return false
        const z = (x - m.mean) / m.sd
        return Math.abs(z) > 0.9 && Math.abs(z) < 4.5 && !reservedValue(Math.abs(z)) && !reservedValue(m.sd)
      },
    )
    const { n, p, x } = draw
    const { mean: mu, sd: sigma } = binomialMoments(n, p)
    const z = (x - mu) / sigma
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nThe period's file records **${x}** ${ctx.event}. Under that baseline the count is binomial with $n = ${n}$ and $p = ${fmt(p, 4)}$.\n\nHow many standard deviations from the baseline's mean does ${x} sit? Report $(x - np)/\\sqrt{np(1-p)}$ to two decimal places.`,
      answer: numericAnswer(z, 'testStat', { digits: 2 }),
      hints: [
        'Standardizing a count asks how far it is from where the model puts it, measured in units of how far the model says it should normally wander.',
        `$np = ${fmt(mu, 2)}$ and $\\sqrt{np(1-p)} = ${fmt(sigma, 2)}$. The gap is $${x} - ${fmt(mu, 2)} = ${fmt(x - mu, 2)}$.`,
        `$${fmt(x - mu, 2)} \\div ${fmt(sigma, 2)}$, to two decimals — and keep the sign.`,
      ],
      solution: `$$\\mu = np = ${fmt(mu, 2)} \\qquad \\sigma = \\sqrt{np(1-p)} = ${fmt(sigma, 2)}$$\n\n$$\\frac{x - np}{\\sqrt{np(1-p)}} = \\frac{${x} - ${fmt(mu, 2)}}{${fmt(sigma, 2)}} = ${fmt(z, 2)}$$\n\nThe observed ${x} ${ctx.event} sits **${fmt(z, 2)}** standard deviations ${z >= 0 ? 'above' : 'below'} what ${ctx.baseline} predicts.\n\n${Math.abs(z) > 3 ? 'A distance past three standard deviations is a long way out for a count this size, and it is the kind of gap that survives quibbling about the arithmetic. It does not, however, survive a change of baseline — a different p moves both the mean and the spread, and with them this number.' : 'A distance of this size is ordinary wandering: a binomial count lands a standard deviation or two either side of its mean most of the time. The distance is a first look, not a verdict — the tail is what a judgement is made on.'}`,
      misconception: `Dividing by $np = ${fmt(mu, 2)}$ instead of $\\sqrt{np(1-p)} = ${fmt(sigma, 2)}$, which returns ${fmt((x - mu) / mu, 2)} and treats the mean as though it were the spread. The other slip is dropping the sign: a count ${z >= 0 ? 'above' : 'below'} the mean is ${z >= 0 ? 'not the same news as' : 'not the same news as'} one on the other side, and a bare magnitude has thrown that away.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — the shape of a binomial against n and p
// ---------------------------------------------------------------------------------------------

type Shape = 'right' | 'left' | 'symmetric'

const SHAPE_OPTIONS: { shape: Shape; text: string; whyNot: string }[] = [
  {
    shape: 'right',
    text: 'Skewed to the right. With np below ten the mass piles against the low counts, the peak sits near the mean and the upper tail runs long and thin.',
    whyNot: 'A right skew needs np small — few expected successes, so the counts bunch near zero with room only on the high side. That is not the case here.',
  },
  {
    shape: 'left',
    text: 'Skewed to the left. With n(1 − p) below ten the mass piles against the high counts, and it is the lower tail that runs long and thin.',
    whyNot: 'A left skew needs n(1 − p) small — so few expected failures that the counts bunch against n. That is not the case here.',
  },
  {
    shape: 'symmetric',
    text: 'Close to symmetric about np. Both np and n(1 − p) are at least ten, so the pmf has straightened out and a normal curve with the same mean and SD would trace it closely.',
    whyNot: 'Near-symmetry needs both np and n(1 − p) at ten or above. One of them is under that here, and the distribution has not straightened out.',
  },
  {
    shape: 'symmetric',
    text: 'Flat: every count from 0 to n is about equally likely, because every trial carries the same probability.',
    whyNot: 'A shared p across trials does not make the counts equally likely — the number of arrangements is wildly different from count to count, and a binomial always has a single peak near np.',
  },
]

/** Decisive shapes only: a boundary within reach on one side, or comfortably out of reach on both. */
function classifyShape(n: number, p: number): Shape | null {
  const np = n * p
  const nq = n * (1 - p)
  if (np >= 1.2 && np <= 6.5 && nq >= 20) return 'right'
  if (nq >= 1.2 && nq <= 6.5 && np >= 20) return 'left'
  if (np >= 16 && nq >= 16) return 'symmetric'
  return null
}

export const binomialShape = defineGenerator({
  id: 'act-4/binomial-shape',
  label: 'The shape of a binomial distribution',
  ap_topics: ['4.11'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, SHAPE_CONTEXTS)
    const draw = retry(
      rng,
      (r) => {
        const n = Math.round(10 ** r.uniform(1.3, 3.4))
        const p = Math.round(r.uniform(ctx.pRange[0], ctx.pRange[1]) * 1000) / 1000
        return { n, p, shape: classifyShape(n, p) }
      },
      ({ n, p, shape }) => shape !== null && !reservedSetting(n, p),
    )
    const { n, p } = draw
    const want = draw.shape as Shape
    const np = n * p
    const nq = n * (1 - p)
    const { mean: mu, sd: sigma } = binomialMoments(n, p)
    const shuffled = rng.shuffle(SHAPE_OPTIONS)
    const correct = shuffled.findIndex((o) => o.shape === want && !o.text.startsWith('Flat'))
    return {
      prompt: `${ctx.frame.replace('{n}', fmtInt(n)).replace('{p}', fmtPct(p, 1))}\n\nThe number of ${ctx.event} in a file like that one is binomial with $n = ${n}$ and $p = ${fmt(p, 3)}$.\n\nWithout computing any probability, what **shape** does that distribution have?`,
      answer: {
        type: 'choice' as const,
        options: shuffled.map((o) => o.text),
        correct,
        feedback: shuffled.map((o, i) => (i === correct ? null : o.whyNot)),
      },
      hints: [
        'The shape of a binomial is decided by how much room the distribution has on each side of its mean. Work out the expected number of successes and the expected number of failures, and see whether either of them is small.',
        `Here $np = ${fmt(np, 1)}$ and $n(1-p) = ${fmt(nq, 1)}$. A count cannot go below zero or above n, so whichever of those two is small is the side that gets squashed.`,
      ],
      solution: `$$np = ${n} \\times ${fmt(p, 3)} = ${fmt(np, 1)} \\qquad n(1-p) = ${n} \\times ${fmt(1 - p, 3)} = ${fmt(nq, 1)}$$\n\n${want === 'right' ? `With only ${fmt(np, 1)} ${ctx.event} expected, the distribution is pressed against zero — it cannot go lower — and all of its room is on the high side. The result is a **right skew**: a peak near ${Math.round(mu)}, and a thin tail running upward.` : want === 'left' ? `With only ${fmt(nq, 1)} non-${ctx.event} expected, the distribution is pressed against ${n} — it cannot go higher — and its room is all on the low side. The result is a **left skew**, with the thin tail running downward.` : `Both ${fmt(np, 1)} and ${fmt(nq, 1)} are comfortably at or above ten, so neither boundary is close enough to squash the distribution. It is **near-symmetric** about $\\mu = ${fmt(mu, 1)}$ with $\\sigma = ${fmt(sigma, 2)}$, and a normal curve of the same mean and SD would sit almost on top of it.`}\n\nThe rule is worth holding as a picture rather than a threshold: the skew is a boundary effect. Raising $n$ at a fixed $p$ pushes both $np$ and $n(1-p)$ up and drags the shape toward symmetry; pushing $p$ toward either end does the reverse.`,
      misconception:
        'Deciding the shape from n alone. A file of four thousand trials at a rate of one in a thousand still has np = 4 and is visibly skewed right; a file of forty trials at a rate of one half is near-symmetric. It is the two products, np and n(1 − p), that decide the shape, and either of them being small is enough to skew it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — one count, two baselines
// ---------------------------------------------------------------------------------------------

export const twoBaselineCompare = defineGenerator({
  id: 'act-4/two-baseline-compare',
  label: 'The same count under two baselines',
  ap_topics: ['4.11'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, COUNTS)
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(10, 44) * 50
        const pHigh = Math.round(r.uniform(0.02, 0.055) * 10000) / 10000
        const pLow = Math.round(pHigh * r.uniform(0.35, 0.6) * 10000) / 10000
        const mHigh = binomialMoments(n, pHigh)
        const x = Math.round(mHigh.mean + mHigh.sd * r.uniform(-0.8, 0.9))
        return { n, pHigh, pLow, x }
      },
      ({ n, pHigh, pLow, x }) => {
        if (reservedSetting(n, pHigh, x) || reservedSetting(n, pLow, x)) return false
        const hi = binomialMoments(n, pHigh)
        const lo = binomialMoments(n, pLow)
        if (!(hi.mean > 10 && lo.mean > 5)) return false
        const zHi = (x - hi.mean) / hi.sd
        const zLo = (x - lo.mean) / lo.sd
        return Math.abs(zHi) < 1.2 && zLo > 3.2 && zLo < 9
      },
    )
    const { n, pHigh, pLow, x } = draw
    const hi = binomialMoments(n, pHigh)
    const lo = binomialMoments(n, pLow)
    const zHi = (x - hi.mean) / hi.sd
    const zLo = (x - lo.mean) / lo.sd
    const tailHi = binomial.atLeast(x, n, pHigh)
    const tailLo = binomial.atLeast(x, n, pLow)
    const columns = ['baseline', 'p', 'μ = np', 'σ = √(np(1−p))', '(x − μ)/σ', 'P(X ≥ ' + x + ')']
    const rows: (string | number)[][] = [
      ['the wider corridor', fmt(pHigh, 4), fmt(hi.mean, 2), fmt(hi.sd, 2), fmt(zHi, 2), fmt(tailHi, 4)],
      ['this office’s own earlier study', fmt(pLow, 4), fmt(lo.mean, 2), fmt(lo.sd, 2), fmt(zLo, 2), tailLo < 0.0001 ? '< 0.0001' : fmt(tailLo, 4)],
    ]
    const options = [
      {
        correct: true,
        text: 'Nothing in the arithmetic differs. Same n, same observed count, same formulas — the two verdicts differ because the two baselines assume different per-trial rates, and every mean, spread and tail is computed under whichever rate is assumed.',
        whyNot: '',
      },
      {
        correct: false,
        text: 'One of the two rows must contain an error, because the same observed count cannot be both ordinary and extreme.',
        whyNot: 'It can, and that is the point. "Surprising" is never a property of a count on its own — it is a property of a count *under a model*, and there are two models on the table.',
      },
      {
        correct: false,
        text: 'The lower baseline must be the wrong one, because a tail that small would make this stretch unlike every other stretch on the Lane.',
        whyNot: 'That reasoning picks the baseline to get the verdict it wants. Which rate this file is entitled to be compared against is a question about where each rate came from, not about which answer is more comfortable.',
      },
      {
        correct: false,
        text: 'The difference comes from the sample sizes: the lower baseline rests on fewer records, so its tail is less reliable.',
        whyNot: `Both rows are computed on the same ${fmtInt(n)} ${ctx.unit}. Nothing about n changes between them; the only thing that changes is p.`,
      },
      {
        correct: false,
        text: 'The count is surprising under both baselines, since it lies above both means.',
        whyNot: `Lying above a mean is not surprise. Under the wider corridor the count sits ${fmt(zHi, 2)} standard deviations out with a tail of ${fmt(tailHi, 3)} — which is an ordinary place for a count to land.`,
      },
    ]
    const shuffled = rng.shuffle(options)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${ctx.file} covers **${fmtInt(n)}** ${ctx.unit} for the period, and **${x}** of them are ${ctx.event}.\n\nTwo baselines are on the table — the wider corridor's published rate, and an earlier study by the office itself — and the same count is worked out under each:\n\n${tableMd(columns, rows)}\n\nWhich statement about those two rows is correct?`,
      data: tableSpec(columns, rows),
      answer: {
        type: 'choice' as const,
        options: shuffled.map((o) => o.text),
        correct,
        feedback: shuffled.map((o, i) => (i === correct ? null : o.whyNot)),
      },
      hints: [
        'Read down the two rows and note which quantities changed and which did not. The observed count, the number of trials and the formulas are all fixed across them.',
        'A tail probability is always conditional on a model. Ask what the two rows disagree about — and whether the disagreement is arithmetic or assumption.',
      ],
      solution: `Both rows use the same ${fmtInt(n)} ${ctx.unit}, the same observed count of ${x} and the same two formulas, $\\mu = np$ and $\\sigma = \\sqrt{np(1-p)}$. The only input that changes is $p$.\n\nUnder the wider corridor's rate of ${fmt(pHigh, 4)} the count sits ${fmt(zHi, 2)} standard deviations from the mean, with $P(X \\ge ${x}) = ${fmt(tailHi, 4)}$ — unremarkable. Under the office's own earlier rate of ${fmt(pLow, 4)} the same count sits ${fmt(zLo, 2)} standard deviations out, with a tail of ${tailLo < 0.0001 ? 'under 0.0001' : fmt(tailLo, 5)}.\n\nSo the verdict is not in the arithmetic. It is in the choice of baseline, and whoever chooses the baseline has chosen the verdict before any of the computation begins. The honest report states which $p$ it assumed, states where that $p$ came from, and shows what the count looks like under the alternative.`,
      misconception:
        'Treating "surprising" as something a count can be on its own. A count is surprising *under a stated rate*, and nothing else. Two competing rates produce two correct answers to two different questions, and an argument that quotes only one of them has hidden its assumption inside its conclusion.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — surprise, as a tail, under a named baseline
// ---------------------------------------------------------------------------------------------

export const interpretBinomialSurprise = defineGenerator({
  id: 'act-4/interpret-binomial-surprise',
  label: 'Is this count surprising under that baseline?',
  ap_topics: ['4.11'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, COUNTS)
    const surprising = rng.bool()
    const draw = retry(
      rng,
      (r) => {
        const n = r.int(8, 40) * 50
        const p = Math.round(r.uniform(0.008, 0.05) * 10000) / 10000
        const m = binomialMoments(n, p)
        const x = Math.round(m.mean + m.sd * (surprising ? r.uniform(3.2, 5.4) : r.uniform(-0.9, 1.1)))
        return { n, p, x }
      },
      ({ n, p, x }) => {
        if (reservedSetting(n, p, x) || x < 0) return false
        const m = binomialMoments(n, p)
        if (!(m.mean > 6 && m.sd > 2) || reservedValue(m.mean) || reservedValue(m.sd)) return false
        const tail = binomial.atLeast(x, n, p)
        return surprising ? tail < 0.002 : tail > 0.12 && tail < 0.92
      },
    )
    const { n, p, x } = draw
    const { mean: mu, sd: sigma } = binomialMoments(n, p)
    const tail = binomial.atLeast(x, n, p)
    const z = (x - mu) / sigma
    const context = `${ctx.event} in ${fmtInt(n)} ${ctx.unit}`
    const rubric = binomialSurpriseInterpretation({ observed: x, mean: mu, sd: sigma, tail, p, surprising, context, baseline: ctx.baseline })
    return {
      prompt: `${frameOf(ctx, n, p)}\n\nThe file records **${x}** ${ctx.event}. Under that baseline the count is binomial with $n = ${n}$ and $p = ${fmt(p, 4)}$, which gives a mean of ${fmt(mu, 1)}, a standard deviation of ${fmt(sigma, 1)}, and P(X ≥ ${x}) = ${tail < 0.0001 ? 'under 0.0001' : fmt(tail, 4)}.\n\nIn one or two sentences, say whether ${x} ${ctx.event} is surprising, name the baseline the verdict depends on, and make the judgement from the tail rather than from the chance of that exact count.`,
      answer: rubric,
      hints: [
        'Start with what the baseline predicts — the mean and the standard deviation — then say where the observed count falls relative to that, and only then reach a verdict.',
        `The judgement rides on everything at or beyond ${x}, not on the chance of exactly ${x}. That tail is ${tail < 0.0001 ? 'under 0.0001' : fmt(tail, 4)}, and the count sits ${fmt(z, 1)} standard deviations from the mean.`,
        'Name the rate you assumed, in words. A verdict without its baseline attached is not a finding; it is a preference.',
      ],
      solution: `${rubric.exemplar}\n\nThree things the sentence has to carry. **What the model predicts** — $\\mu = np = ${fmt(mu, 1)}$ with $\\sigma = \\sqrt{np(1-p)} = ${fmt(sigma, 1)}$. **A tail, not a point** — the weight of ${x} *or more*, ${tail < 0.0001 ? 'under 0.0001' : fmt(tail, 4)}, because on a distribution this wide every individual count is unlikely and $P(X = ${x}) = ${fmt(binomial.pmf(x, n, p), 4)}$ says nothing on its own. **The baseline** — this verdict holds under ${ctx.baseline}, a rate of ${fmtPct(p, 2)}, and a different rate can turn the same count over completely.\n\nWhat the tail is not: it is not the probability that the baseline is correct. It is the probability of a count this extreme *given* the baseline, and those two sentences point in opposite directions.`,
      misconception: `Calling ${x} ${ctx.event} ${surprising ? 'ordinary because the exact count has a respectable probability' : 'surprising because the exact count has a small probability'}. $P(X = ${x}) = ${fmt(binomial.pmf(x, n, p), 4)}$ is a point, and every point on a spread-out count distribution is small. The other failure is dropping the baseline: "${x} is ${surprising ? 'a lot' : 'about right'}" is not a statistical statement until the rate it is measured against is on the page.`,
    }
  },
})
