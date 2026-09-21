/**
 * act-1-04 · The Mean in the Gap — drills. AP 1.7: mean, median, range, IQR and standard deviation
 * in context; resistance; the standard deviation as a typical distance from the mean, in the units
 * of the variable; the n − 1 divisor.
 *
 *   act-1/median-iqr                numeric   median or IQR of a small logged batch (the prompt says which)
 *   act-1/resistance-choice         choice    which summaries move when one value is dragged far out
 *   act-1/sd-interpretation         interp    standard deviation in context (rubric template)
 *   act-1/mean-shift                numeric   how far one hot contact drags the mean
 *   act-1/sd-by-hand                numeric   s from the deviations, divisor n − 1
 *   act-1/resistant-choice-justified choice   which pair of summaries this shape earns, and why
 *
 * `act-1/median-iqr` and `act-1/resistance-choice` are reused by the Act I checkpoint, so their
 * prompts stand alone: every batch is printed in the prompt and nothing refers to an instrument.
 *
 * No drill draws the Register's own 31 times to silence or the sixty logged contacts — their median,
 * IQR and mean shift are act-1-04's mission beats. `RESERVED` keeps a generated batch from landing
 * on one of those numbers by accident.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, listNumbers, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { standardDeviationInterpretation } from '@/lib/problems/rubrics'
import { iqr, mean, median, quartiles, range as rangeOf, sd, skewness, sorted, sum, variance } from '@/lib/stats/descriptive'
import { fmt, fmtInt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared framing
// ---------------------------------------------------------------------------------------------

interface Ctx {
  /** Plural noun for the measured values. */
  what: string
  units: string
  /** Where the batch came from, in world. */
  source: string
  individuals: string
  mu: number
  sigma: number
  digits: number
  /** Values the fixed Act I datasets already own — never a generated answer. */
  reserved: number[]
}

const CONTEXTS: Ctx[] = [
  { what: 'plume ratios', units: 'percent of expectation', source: 'a night watch on the Callisto–Ganymede local lane', individuals: 'contacts', mu: 100, sigma: 3, digits: 1, reserved: [99.9, 99.96, 4.25, 3.11, 108.475] },
  { what: 'times to silence', units: 'h', source: 'the Saturn feeder run’s casualty file', individuals: 'lost hulls', mu: 5.2, sigma: 1.6, digits: 2, reserved: [4.03, 5.601, 3.38, 2.94] },
  { what: 'hull ages at loss', units: 'years', source: 'the Mars–Belt corridor’s register', individuals: 'hulls', mu: 14, sigma: 4.5, digits: 1, reserved: [13.6, 14.2] },
  { what: 'declared cargo values', units: 'M₵', source: 'a season of manifests out of Uruk High', individuals: 'transits', mu: 62, sigma: 18, digits: 1, reserved: [34.7, 76.4] },
  { what: 'sink temperatures', units: 'K', source: 'a Watch-profile run of this ship’s own heat log', individuals: 'hourly readings', mu: 311, sigma: 5.5, digits: 1, reserved: [] },
  { what: 'dead-reckoning fix errors', units: 'km', source: 'the shakedown navigation log', individuals: 'fixes', mu: 12, sigma: 3.6, digits: 1, reserved: [] },
]

function collides(ctx: Ctx, ...values: number[]): boolean {
  return values.some((v) => ctx.reserved.some((r) => Math.abs(v - r) < 0.02))
}

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — median or IQR ★ checkpoint
// ---------------------------------------------------------------------------------------------

export const medianIqr = defineGenerator({
  id: 'act-1/median-iqr',
  label: 'Median and IQR of a logged batch',
  ap_topics: ['1.7'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const ask = rng.bool(0.5) ? 'median' : 'IQR'
    const d = ctx.digits
    const xs = retry(
      rng,
      (r) => drawDataset(r, { n: r.int(7, 11), mean: ctx.mu, sd: ctx.sigma, round: d, min: ctx.mu - 3 * ctx.sigma, max: ctx.mu + 3 * ctx.sigma, distinct: true }),
      (v) => {
        if (new Set(v).size !== v.length) return false
        const q = quartiles(v)
        // Distinct quartiles and a non-degenerate box, and never one of the fixed datasets' answers.
        if (!(q.q3 - q.q1 > 0.5 * ctx.sigma)) return false
        return !collides(ctx, median(v), q.q3 - q.q1)
      },
    )
    const n = xs.length
    const s = sorted(xs)
    const q = quartiles(xs)
    const value = ask === 'median' ? median(xs) : iqr(xs)
    const lower = s.slice(0, n >> 1)
    const upper = n % 2 === 1 ? s.slice((n >> 1) + 1) : s.slice(n >> 1)
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} lists ${fmtInt(n)} ${ctx.what} (${ctx.units}) for ${fmtInt(n)} ${ctx.individuals}:\n\n${listNumbers(xs, d)}\n\nReport the **${ask}** to ${d === 1 ? 'one decimal place' : 'two decimal places'}.`,
      answer: numericAnswer(value, 'mean', { digits: d, units: ctx.units }),
      hints: [
        ask === 'median'
          ? 'Sort the values first. The median is the middle of the sorted list — the middle of the *list*, not the middle of the axis it is plotted on.'
          : 'The IQR is the width of the middle half: Q3 minus Q1. On the AP convention Q1 is the median of the lower half of the sorted values and Q3 the median of the upper half, with the overall median excluded from both halves when n is odd.',
        `Sorted: ${listNumbers(s, d)}.${ask === 'median' ? ` With $n = ${n}$ the median is ${n % 2 ? `the ${(n + 1) / 2}th value` : `the mean of values ${n / 2} and ${n / 2 + 1}`}.` : ` Lower half: ${listNumbers(lower, d)}. Upper half: ${listNumbers(upper, d)}.`}`,
        ask === 'median' ? undefined : `$Q_1 = ${fmt(q.q1, d)}$ and $Q_3 = ${fmt(q.q3, d)}$; subtract.`,
      ].filter((h): h is string => h !== undefined),
      solution:
        ask === 'median'
          ? `Sorted: ${listNumbers(s, d)}.\n\nWith $n = ${n}$ the median is ${n % 2 ? `the ${(n + 1) / 2}th value` : `the mean of the ${n / 2}th and ${n / 2 + 1}th values`}: **${fmt(value, d)} ${ctx.units}**. Half the ${ctx.individuals} are below it and half above; how far out the extreme values sit does not move it.`
          : `Sorted: ${listNumbers(s, d)}. Lower half ${listNumbers(lower, d)} gives $Q_1 = ${fmt(q.q1, d)}$; upper half ${listNumbers(upper, d)} gives $Q_3 = ${fmt(q.q3, d)}$.\n\n$$\\text{IQR} = Q_3 - Q_1 = ${fmt(q.q3, d)} - ${fmt(q.q1, d)} = ${fmt(value, d)}$$\n\nThe IQR is **${fmt(value, d)} ${ctx.units}** — the width of the middle half of the batch.`,
      misconception:
        ask === 'median'
          ? 'Taking the middle of the unsorted list, or the midpoint of the axis. Sort, then count.'
          : 'The IQR is not the range, and it is not Q3 alone. It is the distance between the quartiles — one number, in the units of the variable.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — which summaries move ★ checkpoint
// ---------------------------------------------------------------------------------------------

export const resistanceChoice = defineGenerator({
  id: 'act-1/resistance-choice',
  label: 'Which summaries move',
  ap_topics: ['1.7'],
  skills: ['2', '4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const draw = retry(
      rng,
      (r) => {
        // n ≥ 8 keeps the largest value out of both quartile positions, so the box cannot move.
        const base = drawDataset(r, { n: r.int(8, 12), mean: ctx.mu, sd: ctx.sigma * 0.7, round: d, min: ctx.mu - 2.4 * ctx.sigma, max: ctx.mu + 2.4 * ctx.sigma, distinct: true })
        const s = sorted(base)
        const moved = Math.round((s[s.length - 1] + ctx.sigma * r.uniform(4, 7)) * 10 ** d) / 10 ** d
        const after = [...s.slice(0, s.length - 1), moved]
        return { before: s, after, moved, old: s[s.length - 1] }
      },
      ({ before, after }) => {
        if (new Set(before).size !== before.length) return false
        if (median(before) !== median(after)) return false
        if (Math.abs(iqr(before) - iqr(after)) > 1e-9) return false
        const dMean = mean(after) - mean(before)
        const dSd = sd(after) - sd(before)
        return dMean > 0.4 * ctx.sigma && dSd > 0.3 * ctx.sigma && !collides(ctx, median(before), iqr(before))
      },
    )
    const { before, after, moved, old } = draw
    const m0 = mean(before)
    const m1 = mean(after)
    const s0 = sd(before)
    const s1 = sd(after)
    const d0 = median(before)
    const i0 = iqr(before)
    const shift = m1 - m0
    const u = ctx.units
    const { options, correct, feedback } = shuffleChoice(rng, [
      {
        text: `The mean moves ${fmt(m0, d)} → ${fmt(m1, d)} ${u} and the standard deviation ${fmt(s0, d)} → ${fmt(s1, d)}; the median stays at ${fmt(d0, d)} and the IQR at ${fmt(i0, d)}.`,
        correct: true,
        why: null,
      },
      {
        text: `All four move: mean ${fmt(m0, d)} → ${fmt(m1, d)}, SD ${fmt(s0, d)} → ${fmt(s1, d)}, median ${fmt(d0, d)} → ${fmt(d0 + shift, d)}, IQR ${fmt(i0, d)} → ${fmt(i0 + shift, d)} ${u}.`,
        correct: false,
        why: `Recompute the median and the IQR on the changed batch. Only the largest value moved, and it was already the largest: the order of everything else is untouched, so the middle value is still ${fmt(d0, d)} ${u} and the quartiles are still where they were. The median and the IQR are **resistant**.`,
      },
      {
        text: `The median moves ${fmt(d0, d)} → ${fmt(d0 + shift, d)} ${u} and the IQR ${fmt(i0, d)} → ${fmt(i0 + shift, d)}; the mean stays at ${fmt(m0, d)} and the SD at ${fmt(s0, d)}.`,
        correct: false,
        why: `Exactly backwards. The mean is the balance point of every value, so dragging one value out drags it: ${fmt(m0, d)} → ${fmt(m1, d)} ${u}. The median counts positions, not distances.`,
      },
      {
        text: `Only the mean moves, ${fmt(m0, d)} → ${fmt(m1, d)} ${u}; the standard deviation, the median and the IQR are all unchanged.`,
        correct: false,
        why: `The standard deviation is built from squared distances to the mean, so a value ${fmt(moved - old, d)} ${u} farther out moves it hard: ${fmt(s0, d)} → ${fmt(s1, d)} ${u}. The mean and the SD travel together.`,
      },
    ])
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} lists ${fmtInt(before.length)} ${ctx.what} (${ctx.units}):\n\n${listNumbers(before, d)}\n\nThe largest reading is re-examined and found to have been mis-transcribed: it is not ${fmt(old, d)} but **${fmt(moved, d)} ${u}**. Every other value stands.\n\nWhich summaries change, and how?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Resistance is about how much a summary moves when one value is dragged out. Ask which summaries use every value and which use only positions.',
        `Compute all four twice. Before: mean ${fmt(m0, d)}, SD ${fmt(s0, d)}, median ${fmt(d0, d)}, IQR ${fmt(i0, d)} ${u}.`,
      ],
      solution: `Before: mean ${fmt(m0, d)}, SD ${fmt(s0, d)}, median ${fmt(d0, d)}, IQR ${fmt(i0, d)} ${u}. After: mean ${fmt(m1, d)}, SD ${fmt(s1, d)}, median ${fmt(d0, d)}, IQR ${fmt(i0, d)} ${u}.\n\nThe **mean and the standard deviation move** — the mean by ${fmt(shift, d)} ${u} — because both are built from every value's distance from the centre. The **median and the IQR do not move at all**: the corrected reading was already the largest, so no value changed position, and both summaries depend only on positions in the sorted list.`,
      misconception: 'Assuming that changing a value must change every summary. Resistant summaries (median, IQR) are the ones a single extreme value cannot drag.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — the standard deviation in context
// ---------------------------------------------------------------------------------------------

export const sdInterpretation = defineGenerator({
  id: 'act-1/sd-interpretation',
  label: 'Interpret a standard deviation',
  ap_topics: ['1.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const xs = retry(
      rng,
      (r) => drawDataset(r, { n: r.int(10, 16), mean: ctx.mu, sd: ctx.sigma, round: d, min: ctx.mu - 3 * ctx.sigma, max: ctx.mu + 3 * ctx.sigma }),
      (v) => Math.abs(skewness(v)) < 0.8 && !collides(ctx, mean(v), sd(v)),
    )
    const m = mean(xs)
    const s = sd(xs)
    const population = `the ${xs.length} ${ctx.individuals} in this batch`
    const answer = standardDeviationInterpretation({ sd: s, variable: ctx.what, units: ctx.units, population, mean: m, digits: 2 })
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} gives ${fmtInt(xs.length)} ${ctx.what} (${ctx.units}):\n\n${listNumbers(xs, d)}\n\nThe mean is ${fmt(m, 2)} ${ctx.units} and the standard deviation ${fmt(s, 2)} ${ctx.units}. **Interpret the standard deviation in context.**`,
      answer,
      hints: [
        'A standard deviation is a typical distance from the mean, in the units of the variable — not a bound, not a range, not the average of the values.',
        `Template: “The ___ of ___ typically vary by about ___ ${ctx.units} from the mean of ___.” Fill in all four.`,
      ],
      solution: `${answer.exemplar}\n\nThe number comes from the squared deviations, divided by $n - 1$ and square-rooted: $s = ${fmt(s, 2)}$ ${ctx.units}. It is a **typical** distance, not a limit — values farther than ${fmt(s, 2)} ${ctx.units} from the mean are ordinary, and here ${fmtInt(xs.filter((v) => Math.abs(v - m) > s).length)} of the ${fmtInt(xs.length)} ${ctx.individuals} are.`,
      misconception: 'Calling the SD "the average deviation" (it is a root-mean-square, not a mean of the deviations — whose average is exactly zero), or reading it as a range every value stays inside.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — how far one value drags the mean
// ---------------------------------------------------------------------------------------------

export const meanShift = defineGenerator({
  id: 'act-1/mean-shift',
  label: 'How far one value drags the mean',
  ap_topics: ['1.7'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const ask = rng.bool(0.6) ? 'shift' : 'new-mean'
    const draw = retry(
      rng,
      (r) => {
        const xs = drawDataset(r, { n: r.int(9, 15), mean: ctx.mu, sd: ctx.sigma * 0.8, round: d, min: ctx.mu - 2.4 * ctx.sigma, max: ctx.mu + 2.4 * ctx.sigma, distinct: true })
        const hot = Math.round((mean(xs) + ctx.sigma * r.uniform(3.5, 6)) * 10 ** d) / 10 ** d
        return { xs, hot }
      },
      ({ xs, hot }) => {
        const shift = mean([...xs, hot]) - mean(xs)
        return shift >= 0.15 * ctx.sigma && !collides(ctx, mean(xs), mean([...xs, hot]), shift)
      },
    )
    const { xs, hot } = draw
    const n = xs.length
    const m0 = mean(xs)
    const withHot = [...xs, hot]
    const m1 = mean(withHot)
    const shift = m1 - m0
    const d0 = median(xs)
    const d1 = median(withHot)
    const value = ask === 'shift' ? shift : m1
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} holds ${fmtInt(n)} ${ctx.what} (${ctx.units}):\n\n${listNumbers(xs, d)}\n\nOne further reading is logged and it does not sit with the rest: **${fmt(hot, d)} ${ctx.units}**.\n\n${ask === 'shift' ? `By how much does adding it **move the mean**? Report the change to two decimal places.` : `Report the **mean of all ${fmtInt(n + 1)} values**, to two decimal places.`}`,
      answer: numericAnswer(value, 'mean', { digits: 2, units: ctx.units }),
      hints: [
        'The mean is the balance point: adding a value far from it tips the beam, and how far depends on how many values are already holding it down.',
        `Mean of the first ${fmtInt(n)}: ${fmt(m0, 3)} ${ctx.units}. The new value is ${fmt(hot - m0, 2)} ${ctx.units} from it, and there are now ${fmtInt(n + 1)} values.`,
        ask === 'shift' ? `The shift is $(x_{\\text{new}} - \\bar{x}_{\\text{old}}) / (n + 1)$.` : `$\\bar{x}_{\\text{new}} = (n\\bar{x}_{\\text{old}} + x_{\\text{new}}) / (n+1)$.`,
      ],
      solution: `$$\\bar{x}_{\\text{old}} = \\frac{${fmt(sum(xs), 2)}}{${n}} = ${fmt(m0, 3)}, \\qquad \\bar{x}_{\\text{new}} = \\frac{${fmt(sum(xs), 2)} + ${fmt(hot, d)}}{${n + 1}} = ${fmt(m1, 3)}$$\n\nThe mean moves by $${fmt(m1, 3)} - ${fmt(m0, 3)} = ${fmt(shift, 3)}$, so ${ask === 'shift' ? `the shift is **${fmt(shift, 2)} ${ctx.units}**` : `the new mean is **${fmt(m1, 2)} ${ctx.units}**`}. The median moves from ${fmt(d0, d)} to ${fmt(d1, d)} ${ctx.units} — ${Math.abs(d1 - d0) < 1e-9 ? 'not at all' : `${fmt(Math.abs(d1 - d0), 2)} ${ctx.units}`} — because one new value at the top end shifts the middle position by at most half a step, however far out it sits.`,
      misconception: `One value cannot move the mean "a lot" or "a little" on its own: the shift is its distance from the old mean divided by the new count. The same reading in a batch of ${fmtInt(n * 5)} would move it a fifth as far.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — the standard deviation by hand
// ---------------------------------------------------------------------------------------------

export const sdByHand = defineGenerator({
  id: 'act-1/sd-by-hand',
  label: 'Standard deviation by hand',
  ap_topics: ['1.7'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const xs = retry(
      rng,
      (r) => drawDataset(r, { n: r.int(5, 6), mean: ctx.mu, sd: ctx.sigma, round: d, min: ctx.mu - 2.5 * ctx.sigma, max: ctx.mu + 2.5 * ctx.sigma, distinct: true }),
      (v) => sd(v) > 0.4 * ctx.sigma && !collides(ctx, sd(v), mean(v)),
    )
    const n = xs.length
    const m = mean(xs)
    const devs = xs.map((x) => x - m)
    const ss = sum(devs.map((e) => e * e))
    const s = sd(xs)
    const rows = xs.map((x, i) => [fmt(x, d), fmt(devs[i], 3), fmt(devs[i] * devs[i], 4)])
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} logged ${fmtInt(n)} ${ctx.what} (${ctx.units}):\n\n${listNumbers(xs, d)}\n\nCompute the **sample standard deviation** to two decimal places.`,
      answer: numericAnswer(s, 'mean', { digits: 2, units: ctx.units }),
      hints: [
        'Mean first; then each value\'s deviation from it; then square the deviations, add them, divide by $n - 1$, and take the square root.',
        `$\\bar{x} = ${fmt(sum(xs), 2)} / ${n} = ${fmt(m, 3)}$ ${ctx.units}. Now the squared deviations.`,
        `$\\sum (x_i - \\bar{x})^2 = ${fmt(ss, 4)}$, and $n - 1 = ${n - 1}$.`,
      ],
      solution: `$$\\bar{x} = \\frac{${fmt(sum(xs), 2)}}{${n}} = ${fmt(m, 3)}$$\n\n${tableMd(['value', 'deviation', 'squared'], rows)}\n\n$$s = \\sqrt{\\frac{\\sum (x_i - \\bar{x})^2}{n - 1}} = \\sqrt{\\frac{${fmt(ss, 4)}}{${n - 1}}} = \\sqrt{${fmt(variance(xs), 4)}} = ${fmt(s, 3)}$$\n\nThe standard deviation is **${fmt(s, 2)} ${ctx.units}** — the typical distance of one of these ${ctx.individuals} from the mean of ${fmt(m, 2)} ${ctx.units}.`,
      misconception: `Dividing by $n$ instead of $n - 1$. That gives ${fmt(Math.sqrt(ss / n), 2)} ${ctx.units} here — smaller, and the wrong answer for a *sample*: the deviations are taken from the sample's own mean, so one degree of freedom has already been spent.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — which pair of summaries this shape earns
// ---------------------------------------------------------------------------------------------

type SummaryShape = 'symmetric' | 'skewRight' | 'outlier' | 'bimodal'

export const resistantChoiceJustified = defineGenerator({
  id: 'act-1/resistant-choice-justified',
  label: 'Which summary to report',
  ap_topics: ['1.7'],
  skills: ['2', '4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const shape: SummaryShape = pickContext(rng, ['symmetric', 'skewRight', 'outlier', 'bimodal'] as const)
    const draw = retry(
      rng,
      (r) => {
        if (shape === 'outlier') {
          const core = drawDataset(r, { n: r.int(18, 28), mean: ctx.mu, sd: ctx.sigma * 0.8, round: d, min: ctx.mu - 2.2 * ctx.sigma, max: ctx.mu + 2.2 * ctx.sigma })
          const hot = Math.round((mean(core) + ctx.sigma * r.uniform(5, 8)) * 10 ** d) / 10 ** d
          return [...core, hot]
        }
        return drawDataset(r, {
          n: r.int(24, 40),
          mean: ctx.mu,
          sd: ctx.sigma,
          round: d,
          min: ctx.mu - 4 * ctx.sigma,
          max: ctx.mu + 4 * ctx.sigma,
          shape: shape === 'symmetric' ? 'normal' : shape === 'skewRight' ? 'skewRight' : 'bimodal',
        })
      },
      (v) => {
        const k = (mean(v) - median(v)) / sd(v)
        if (shape === 'symmetric') return Math.abs(k) < 0.06
        if (shape === 'skewRight') return k > 0.22
        if (shape === 'bimodal') return Math.abs(k) < 0.2
        return k > 0.15
      },
    )
    const xs = draw
    const m = mean(xs)
    const med = median(xs)
    const s = sd(xs)
    const box = iqr(xs)
    const u = ctx.units
    const description =
      shape === 'symmetric'
        ? `one mound, roughly symmetric, with tails of similar length and nothing beyond the fences`
        : shape === 'skewRight'
          ? `one pile at the low end with a long tail running toward the large values`
          : shape === 'outlier'
            ? `one tight mound with a single value stranded far out to the right of it`
            : `two separate piles with a gap between them and nothing in the gap`
    const meanSd = `Report the **mean (${fmt(m, d)} ${u})** and the **standard deviation (${fmt(s, d)} ${u})** — with a symmetric mound and no extreme value, both use every observation and neither is being dragged by anything.`
    const medianIqrOpt = `Report the **median (${fmt(med, d)} ${u})** and the **IQR (${fmt(box, d)} ${u})** — a long tail or a stranded value drags the mean and inflates the SD, and a resistant pair describes the bulk of the batch honestly.`
    const twoPiles = `Report **both piles separately**, with a centre and a count for each — the batch is two groups, and any single centre lands in the gap between them and describes neither.`
    const rangeOnly = `Report the **range (${fmt(rangeOf(xs), d)} ${u})** on its own, because it is the only summary built from the values at the ends of the batch.`
    const correctText = shape === 'symmetric' ? meanSd : shape === 'bimodal' ? twoPiles : medianIqrOpt
    const { options, correct, feedback } = shuffleChoice(rng, [
      {
        text: meanSd,
        correct: correctText === meanSd,
        why: correctText === meanSd ? null : shape === 'bimodal' ? `The mean of ${fmt(m, d)} ${u} sits in the gap: no ${ctx.individuals.replace(/s$/, '')} in the batch is near it, and the SD of ${fmt(s, d)} measures the distance between two piles rather than the variability inside either.` : `The mean (${fmt(m, d)} ${u}) sits above the median (${fmt(med, d)} ${u}) because it is being pulled, and the SD is inflated with it. Neither describes a typical ${ctx.individuals.replace(/s$/, '')} here.`,
      },
      {
        text: medianIqrOpt,
        correct: correctText === medianIqrOpt,
        why: correctText === medianIqrOpt ? null : shape === 'bimodal' ? `The median of ${fmt(med, d)} ${u} is as unhelpful as the mean: it also lands between the two piles. Resistance is not the problem here — a single centre is.` : `Nothing is dragging the mean here (mean ${fmt(m, d)} against median ${fmt(med, d)} ${u}), and the mean and SD use every observation. Reach for the resistant pair when the shape gives you a reason, not by reflex.`,
      },
      {
        text: twoPiles,
        correct: correctText === twoPiles,
        why: correctText === twoPiles ? null : `There is one pile here, not two. Splitting a single mound at an arbitrary point invents a structure the display does not show.`,
      },
      {
        text: rangeOnly,
        correct: false,
        why: `The range is the least resistant summary there is — it is *made* of the two most extreme values, so a single bad reading sets it on its own. Report it beside a resistant spread, never instead of one.`,
      },
    ])
    return {
      prompt: `A display of ${fmtInt(xs.length)} ${ctx.what} (${ctx.units}) from ${ctx.source} shows ${description}.\n\nThe preliminary has room for a centre and a spread. **What should it report?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'The shape chooses the summary, not the other way round. Ask first whether one centre can describe this batch at all; then whether anything is dragging the mean.',
        `Mean ${fmt(m, d)} against median ${fmt(med, d)} ${u}; SD ${fmt(s, d)} against IQR ${fmt(box, d)} ${u}.`,
      ],
      solution: `The display is ${description}, so: **${correctText.replace(/\*\*/g, '')}**\n\nMean ${fmt(m, d)}, median ${fmt(med, d)}, SD ${fmt(s, d)}, IQR ${fmt(box, d)} ${u}. ${shape === 'symmetric' ? 'With the mean and the median this close and no value stranded, the non-resistant pair is the more informative one: it uses every observation.' : shape === 'bimodal' ? 'When the mean and the median agree but both fall in the gap between two piles, agreement is worthless — the honest summary is two summaries.' : `The gap of ${fmt(Math.abs(m - med), d)} ${u} between the mean and the median is the tail doing its work; the resistant pair is unmoved by it.`}`,
      misconception: 'Choosing between mean and median by habit. Name the shape first: symmetric earns the mean and SD, a tail or a stranded value earns the median and IQR, and two piles earn two summaries.',
    }
  },
})
