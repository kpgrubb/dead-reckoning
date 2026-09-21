/**
 * act-1-05 · Five Numbers — drills. AP 1.8: the five-number summary, the modified boxplot and the
 * 1.5 × IQR rule; what a boxplot shows (spread, skew, flagged values) and what it hides (modes, gaps,
 * sample size).
 *
 *   act-1/upper-fence          numeric   Q3 + 1.5·IQR, with the count beyond it in the solution
 *   act-1/outlier-count        numeric   how many observations the fences flag (a count)
 *   act-1/five-number-summary  numeric   one of the five, stated in the prompt
 *   act-1/boxplot-shape        display   boxplot → name the shape
 *   act-1/box-hides            choice    which statement about a boxplot is true
 *
 * `act-1/upper-fence` is reused by the Act I checkpoint, so its prompt stands alone: the batch is
 * printed in full and nothing refers to an instrument.
 *
 * Quartiles everywhere follow the AP / TI-84 convention (`quartiles` from @/lib/stats): Q1 is the
 * median of the lower half, Q3 the median of the upper half, the overall median excluded from both
 * when n is odd. No drill reproduces DS-19's own fence of 108.475 — that is act-1-05's mission beat.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, listNumbers, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { fiveNumber, iqr, max as maxOf, mean, median, min as minOf, outliers, quartiles, sorted } from '@/lib/stats/descriptive'
import { fmt, fmtInt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared framing
// ---------------------------------------------------------------------------------------------

interface Ctx {
  what: string
  units: string
  source: string
  individuals: string
  mu: number
  sigma: number
  digits: number
  /** Numbers the fixed Act I datasets already own — never a generated answer. */
  reserved: number[]
}

const CONTEXTS: Ctx[] = [
  { what: 'plume ratios', units: 'percent of expectation', source: 'a night watch on the Callisto–Ganymede local lane', individuals: 'contacts', mu: 100, sigma: 3, digits: 1, reserved: [108.475, 91.475, 97.85, 102.1, 99.9, 4.25] },
  { what: 'times to silence', units: 'h', source: 'the Saturn feeder run’s casualty file', individuals: 'lost hulls', mu: 5.2, sigma: 1.6, digits: 2, reserved: [4.03, 5.601, 5.61, 0.009] },
  { what: 'hull ages at loss', units: 'years', source: 'the Mars–Belt corridor’s register', individuals: 'hulls', mu: 14, sigma: 4.5, digits: 1, reserved: [13.6, 14.2] },
  { what: 'declared cargo values', units: 'M₵', source: 'a season of manifests out of Uruk High', individuals: 'transits', mu: 62, sigma: 18, digits: 1, reserved: [34.7, 76.4] },
  { what: 'sink temperatures', units: 'K', source: 'a Watch-profile run of this ship’s own heat log', individuals: 'hourly readings', mu: 311, sigma: 5.5, digits: 1, reserved: [] },
  { what: 'marks at last contact', units: 'Lane marks', source: 'a relay office’s six-year incident file', individuals: 'records', mu: 6.6, sigma: 2.2, digits: 2, reserved: [9.26, 9.06, 9.46, 0.4] },
]

function collides(ctx: Ctx, ...values: number[]): boolean {
  return values.some((v) => ctx.reserved.some((r) => Math.abs(v - r) < 0.02))
}

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

/** Half-widths of the sorted list, the way the AP convention splits them. */
function halves(xs: number[]): { s: number[]; lower: number[]; upper: number[] } {
  const s = sorted(xs)
  const mid = s.length >> 1
  return { s, lower: s.slice(0, mid), upper: s.length % 2 === 1 ? s.slice(mid + 1) : s.slice(mid) }
}

/** A batch with a controlled number of values beyond the fences. */
function batchWithOutliers(rng: Rng, ctx: Ctx, want: number, nRange: [number, number]): number[] {
  const d = ctx.digits
  const f = 10 ** d
  return retry(
    rng,
    (r) => {
      const n = r.int(nRange[0], nRange[1])
      const core = drawDataset(r, { n: n - want, mean: ctx.mu, sd: ctx.sigma * 0.85, round: d, min: ctx.mu - 2.1 * ctx.sigma, max: ctx.mu + 2.1 * ctx.sigma, distinct: true })
      const extras: number[] = []
      for (let i = 0; i < want; i++) {
        const up = r.bool(0.7)
        const v = Math.round((mean(core) + (up ? 1 : -1) * ctx.sigma * r.uniform(3.4, 5.5 + i)) * f) / f
        extras.push(v)
      }
      return [...core, ...extras]
    },
    (xs) => {
      if (new Set(xs).size !== xs.length) return false
      const o = outliers(xs)
      if (o.values.length !== want) return false
      const q = quartiles(xs)
      if (!(q.q3 - q.q1 > 0.4 * ctx.sigma)) return false
      return !collides(ctx, o.highFence, o.lowFence, q.q1, q.q3, median(xs))
    },
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the upper fence ★ checkpoint
// ---------------------------------------------------------------------------------------------

export const upperFence = defineGenerator({
  id: 'act-1/upper-fence',
  label: 'Upper fence, 1.5 × IQR',
  ap_topics: ['1.8'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const want = rng.bool(0.6) ? 1 : rng.bool(0.5) ? 0 : 2
    const xs = batchWithOutliers(rng, ctx, want, [11, 19])
    const q = quartiles(xs)
    const box = iqr(xs)
    const o = outliers(xs)
    const fence = o.highFence
    const beyondHigh = xs.filter((v) => v > fence)
    const { s, lower, upper } = halves(xs)
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} gives ${fmtInt(xs.length)} ${ctx.what} (${ctx.units}) for ${fmtInt(xs.length)} ${ctx.individuals}:\n\n${listNumbers(xs, d)}\n\nApply the 1.5 × IQR rule. Report the **upper fence**, to two decimal places.`,
      answer: numericAnswer(fence, 'other', { digits: 2, units: ctx.units }),
      hints: [
        'The upper fence is not a value in the data. It is a boundary computed from the quartiles: anything above it is flagged for a second look.',
        `Sort the batch, take $Q_1$ and $Q_3$ on the AP convention (median of the lower half, median of the upper half, overall median excluded when $n$ is odd), then the fence is $Q_3 + 1.5 \\times \\text{IQR}$.`,
        `$Q_1 = ${fmt(q.q1, d)}$ and $Q_3 = ${fmt(q.q3, d)}$, so the IQR is ${fmt(box, d)} ${ctx.units}.`,
      ],
      solution: `Sorted: ${listNumbers(s, d)}.\n\nLower half ${listNumbers(lower, d)} gives $Q_1 = ${fmt(q.q1, d)}$; upper half ${listNumbers(upper, d)} gives $Q_3 = ${fmt(q.q3, d)}$, so $\\text{IQR} = ${fmt(q.q3, d)} - ${fmt(q.q1, d)} = ${fmt(box, d)}$ ${ctx.units}.\n\n$$\\text{upper fence} = Q_3 + 1.5 \\times \\text{IQR} = ${fmt(q.q3, d)} + 1.5 \\times ${fmt(box, d)} = ${fmt(fence, 3)}$$\n\nThe upper fence is **${fmt(fence, 2)} ${ctx.units}**. ${beyondHigh.length === 0 ? `No value in the batch is above it, so the rule flags **0** ${ctx.individuals} at the top end.` : `${beyondHigh.length === 1 ? 'One value' : `${fmtInt(beyondHigh.length)} values`} lie${beyondHigh.length === 1 ? 's' : ''} beyond it — ${listNumbers(beyondHigh, d)} ${ctx.units} — so the rule flags ${beyondHigh.length === 1 ? 'that one' : 'those'} for a second look.`} A fence flags; it does not convict.`,
      misconception: 'The fence is not the largest whisker value and it is not always inside the data. Compute it from the quartiles, then compare the observations to it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — how many the fences flag
// ---------------------------------------------------------------------------------------------

export const outlierCount = defineGenerator({
  id: 'act-1/outlier-count',
  label: 'How many the fences flag',
  ap_topics: ['1.8'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const want = rng.int(0, 3)
    const xs = batchWithOutliers(rng, ctx, want, [13, 21])
    const q = quartiles(xs)
    const box = iqr(xs)
    const o = outliers(xs)
    const count = o.values.length
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} gives ${fmtInt(xs.length)} ${ctx.what} (${ctx.units}):\n\n${listNumbers(xs, d)}\n\nUsing the 1.5 × IQR rule, **how many of these ${ctx.individuals} are flagged as outliers?** Give a whole number.`,
      answer: numericAnswer(count, 'count'),
      hints: [
        'Both fences. A modified boxplot flags a value below $Q_1 - 1.5 \\times \\text{IQR}$ as well as one above $Q_3 + 1.5 \\times \\text{IQR}$.',
        `$Q_1 = ${fmt(q.q1, d)}$, $Q_3 = ${fmt(q.q3, d)}$, IQR ${fmt(box, d)} ${ctx.units}. Now build both fences and count what is outside them.`,
      ],
      solution: `$Q_1 = ${fmt(q.q1, d)}$, $Q_3 = ${fmt(q.q3, d)}$, $\\text{IQR} = ${fmt(box, d)}$ ${ctx.units}.\n\n$$\\text{fences} = Q_1 - 1.5\\,\\text{IQR} = ${fmt(o.lowFence, 2)} \\quad\\text{and}\\quad Q_3 + 1.5\\,\\text{IQR} = ${fmt(o.highFence, 2)}$$\n\n${count === 0 ? `Every value lies between ${fmt(o.lowFence, 2)} and ${fmt(o.highFence, 2)} ${ctx.units}, so the rule flags **0**.` : `Outside those bounds: ${listNumbers(sorted(o.values), d)} ${ctx.units}. The rule flags **${fmtInt(count)}**.`} Flagged means *look again*, not *wrong*: a real value and a transcription error look identical to a fence.`,
      misconception: 'Counting only the high side, or counting anything that merely looks far out. The rule is arithmetic on the quartiles, applied at both ends.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — one of the five
// ---------------------------------------------------------------------------------------------

type FiveAsk = 'min' | 'q1' | 'median' | 'q3' | 'max'

const FIVE_LABEL: Record<FiveAsk, string> = {
  min: 'minimum',
  q1: 'first quartile, $Q_1$',
  median: 'median',
  q3: 'third quartile, $Q_3$',
  max: 'maximum',
}

export const fiveNumberSummary = defineGenerator({
  id: 'act-1/five-number-summary',
  label: 'One of the five numbers',
  ap_topics: ['1.8'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const ask: FiveAsk = pickContext(rng, ['min', 'q1', 'median', 'q3', 'max'] as const)
    const xs = retry(
      rng,
      (r) => drawDataset(r, { n: r.int(9, 15), mean: ctx.mu, sd: ctx.sigma, round: d, min: ctx.mu - 3 * ctx.sigma, max: ctx.mu + 3 * ctx.sigma, distinct: true }),
      (v) => {
        if (new Set(v).size !== v.length) return false
        const q = quartiles(v)
        if (!(q.q3 - q.q1 > 0.5 * ctx.sigma)) return false
        return !collides(ctx, q.q1, q.q3, median(v), minOf(v), maxOf(v))
      },
    )
    const five = fiveNumber(xs)
    const value = ask === 'min' ? five.min : ask === 'q1' ? five.q1 : ask === 'median' ? five.median : ask === 'q3' ? five.q3 : five.max
    const { s, lower, upper } = halves(xs)
    const n = xs.length
    return {
      prompt: `${ctx.source.charAt(0).toUpperCase() + ctx.source.slice(1)} lists ${fmtInt(n)} ${ctx.what} (${ctx.units}):\n\n${listNumbers(xs, d)}\n\nReport the **${FIVE_LABEL[ask]}** of the five-number summary, to ${d === 1 ? 'one decimal place' : 'two decimal places'}.`,
      answer: numericAnswer(value, 'mean', { digits: d, units: ctx.units }),
      hints: [
        'The five-number summary is minimum, $Q_1$, median, $Q_3$, maximum — all five read off the sorted list, none of them computed from the mean.',
        ask === 'q1' || ask === 'q3'
          ? `Sorted: ${listNumbers(s, d)}. Split at the median; with $n = ${n}$ the median ${n % 2 ? 'itself is left out of both halves' : 'falls between two values, so each half has exactly ' + n / 2 + ' values'}. ${ask === 'q1' ? `Lower half: ${listNumbers(lower, d)}.` : `Upper half: ${listNumbers(upper, d)}.`}`
          : `Sorted: ${listNumbers(s, d)}.`,
      ],
      solution: `Sorted: ${listNumbers(s, d)}.\n\n${tableMd(['min', 'Q1', 'median', 'Q3', 'max'], [[fmt(five.min, d), fmt(five.q1, d), fmt(five.median, d), fmt(five.q3, d), fmt(five.max, d)]])}\n\nThe ${FIVE_LABEL[ask].replace(/\$/g, '')} is **${fmt(value, d)} ${ctx.units}**.${ask === 'q1' || ask === 'q3' ? ` On the AP convention the quartiles are the medians of the two halves of the sorted list, with the overall median excluded from both when $n$ is odd — here ${ask === 'q1' ? `the lower half is ${listNumbers(lower, d)}` : `the upper half is ${listNumbers(upper, d)}`}.` : ''}`,
      misconception: 'Quartiles are positions in the sorted list, not the mean of the two halves and not a quarter of the range. Different software uses different conventions; this course uses the AP / TI-84 one throughout.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Display + choice — read a boxplot's shape
// ---------------------------------------------------------------------------------------------

type BoxShape = 'symmetric' | 'skewRight' | 'skewLeft'

const BOX_OPTIONS = [
  'Roughly symmetric — the median sits near the middle of the box and the whiskers are of similar length',
  'Skewed right — the upper quarter of the data is stretched out and the median sits low in the box',
  'Skewed left — the lower quarter of the data is stretched out and the median sits high in the box',
  'Nothing can be said about shape from a boxplot; only the five numbers can be read off it',
]

export const boxplotShape = defineGenerator({
  id: 'act-1/boxplot-shape',
  label: 'Shape from a boxplot',
  ap_topics: ['1.8'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const d = ctx.digits
    const shape: BoxShape = pickContext(rng, ['symmetric', 'skewRight', 'skewLeft'] as const)
    const xs = drawDataset(rng, {
      n: rng.int(40, 70),
      mean: ctx.mu,
      sd: ctx.sigma,
      round: d,
      shape: shape === 'symmetric' ? 'normal' : shape,
      accept: (v) => {
        const q = quartiles(v)
        const lowBox = q.q2 - q.q1
        const highBox = q.q3 - q.q2
        const lowTail = q.q1 - minOf(v)
        const highTail = maxOf(v) - q.q3
        if (lowBox <= 0 || highBox <= 0) return false
        if (shape === 'symmetric') return highBox / lowBox > 0.7 && highBox / lowBox < 1.4 && highTail / lowTail > 0.6 && highTail / lowTail < 1.7
        if (shape === 'skewRight') return highBox / lowBox > 1.5 && highTail > 1.6 * lowTail
        return lowBox / highBox > 1.5 && lowTail > 1.6 * highTail
      },
    })
    const five = fiveNumber(xs)
    const correct = shape === 'symmetric' ? 0 : shape === 'skewRight' ? 1 : 2
    const feedback = BOX_OPTIONS.map((_, i) => {
      if (i === correct) return null
      if (i === 3) return 'A boxplot does show skew: compare the two halves of the box, and the two whiskers. What it cannot show is how many peaks there are.'
      if (i === 0) return `The two halves of the box are not the same size here: $Q_1$ to the median is ${fmt(five.median - five.q1, d)} ${ctx.units} and the median to $Q_3$ is ${fmt(five.q3 - five.median, d)}.`
      if (i === 1) return 'Skewed right means the long stretch is at the TOP — a longer upper half of the box and a longer upper whisker. Check which end is stretched.'
      return 'Skewed left means the long stretch is at the BOTTOM — a longer lower half of the box and a longer lower whisker. Check which end is stretched.'
    })
    return {
      prompt: `A modified boxplot of ${fmtInt(xs.length)} ${ctx.what} (${ctx.units}) from ${ctx.source}. **What does the box say about the shape?**`,
      answer: {
        type: 'display',
        display: { kind: 'boxplot', groups: [{ name: ctx.what, values: xs }], label: `${ctx.what} (${ctx.units})` },
        question: { type: 'choice', options: BOX_OPTIONS, correct, feedback },
      },
      hints: [
        'A boxplot carries four quarters of the data, each holding about a quarter of the observations. Compare the widths of those quarters: the stretched ones are where the data thin out.',
        `Five-number summary: ${fmt(five.min, d)}, ${fmt(five.q1, d)}, ${fmt(five.median, d)}, ${fmt(five.q3, d)}, ${fmt(five.max, d)} ${ctx.units}.`,
      ],
      solution: `The four quarters are ${fmt(five.q1 - five.min, d)}, ${fmt(five.median - five.q1, d)}, ${fmt(five.q3 - five.median, d)} and ${fmt(five.max - five.q3, d)} ${ctx.units} wide, each holding about a quarter of the ${fmtInt(xs.length)} ${ctx.individuals}. ${shape === 'symmetric' ? 'They are of comparable width on both sides of the median, so the batch is **roughly symmetric**.' : shape === 'skewRight' ? 'The two above the median are the wide ones, so the same number of observations is spread over more ground at the top: the batch is **skewed right**.' : 'The two below the median are the wide ones, so the same number of observations is spread over more ground at the bottom: the batch is **skewed left**.'} Mean ${fmt(mean(xs), d)} against median ${fmt(five.median, d)} ${ctx.units} agrees.`,
      misconception: 'Reading a wide quarter as "more data there". Every quarter holds about 25 percent of the observations; a wide one means those observations are spread thin, which is exactly what a tail is.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what a boxplot shows and what it hides
// ---------------------------------------------------------------------------------------------

const TRUE_STATEMENTS = [
  'A boxplot cannot show that a batch is in two separate piles: two batches with very different shapes can produce boxes that look identical.',
  'The box spans the middle half of the observations — from Q1 to Q3 — which is a share of the individuals, not a share of the range.',
  'On a modified boxplot the whiskers stop at the most extreme observation that is NOT beyond a fence, and anything beyond a fence is drawn as its own point.',
  'The width of a box says nothing about how many observations produced it: the same box can come from eleven values or eleven thousand.',
  'A boxplot hides every individual value between the five it draws, including any gap in the middle of the batch.',
] as const

const FALSE_STATEMENTS = [
  { text: 'The box covers the middle 50 percent of the range, so half the axis is inside it.', why: 'The box holds half the *observations*, not half the *axis*. In a tight batch with one far value the box can cover a few percent of the range and still contain fifteen of thirty hulls.' },
  { text: 'A wider box means a larger sample.', why: 'Width is spread, not count. A boxplot draws no information about n at all — which is why any comparison of two groups has to print both sample sizes beside it.' },
  { text: 'The whiskers always run out to the minimum and the maximum of the batch.', why: 'On a *modified* boxplot — the one this course draws — they stop at the last observation inside the fences, and flagged values are plotted individually beyond them.' },
  { text: 'A boxplot whose median sits in the centre of its box must have come from a single symmetric mound.', why: 'Two piles either side of an empty middle produce exactly that box. A centred median rules out skew; it does not rule out a gap.' },
  { text: 'The line drawn inside the box is the mean.', why: 'It is the median. The mean is not on a boxplot at all, and on a skewed batch the two are in different places.' },
  { text: 'Two batches with the same five-number summary must have the same distribution.', why: 'The five numbers pin down five points and say nothing about the ninety-odd percent of observations between them — modes, gaps and clusters all survive untouched.' },
] as const

export const boxHides = defineGenerator({
  id: 'act-1/box-hides',
  label: 'What a boxplot shows and hides',
  ap_topics: ['1.8'],
  skills: ['4'],
  generate(rng) {
    const trueOne = pickContext(rng, TRUE_STATEMENTS)
    const falseThree = rng.shuffle([...FALSE_STATEMENTS]).slice(0, 3)
    const { options, correct, feedback } = shuffleChoice(rng, [
      { text: trueOne, correct: true, why: null },
      ...falseThree.map((f) => ({ text: f.text, correct: false, why: f.why })),
    ])
    return {
      prompt: 'Ferrier will not let a boxplot into the preliminary until somebody states what it can and cannot be read for.\n\n**Which statement is true?**',
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A boxplot draws exactly five numbers plus any flagged values. Ask what each drawn feature is made of, and what is left over.',
        'Each of the four sections holds about a quarter of the observations. Everything a boxplot shows is a statement about positions in the sorted list — never about counts, and never about what happens between the five.',
      ],
      solution: `**${trueOne}**\n\nA boxplot is five numbers and a rule: minimum, $Q_1$, median, $Q_3$, maximum, with the whiskers cut back to the fences and anything beyond them drawn separately. That makes it very good at spread, at skew and at flagging extremes, and blind to everything that lives between the five — modes, gaps, clusters — and blind to sample size entirely. When a shape matters, put the dots back on.`,
      misconception: 'Treating the box as a picture of the data rather than as five positions. If the question is "how many peaks", the boxplot is the wrong display and no amount of care in reading it will help.',
    }
  },
})
