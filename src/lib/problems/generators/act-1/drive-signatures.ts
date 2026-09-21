/**
 * act-1-03 · Drive Signatures — drills. AP 1.5–1.6: dotplots, stemplots and histograms of one
 * quantitative variable; what a bin width decides; describing shape, centre, variability and
 * unusual features (SOCS) in context.
 *
 *   act-1/describe-signature-histogram  display   histogram → SOCS description (rubric)
 *   act-1/bin-width                     choice    which bin width shows the shape
 *   act-1/unusual-feature               display   dotplot → report the value standing apart
 *   act-1/stemplot-read                 numeric   read a value off a stemplot with a stated leaf unit
 *   act-1/shape-from-histogram          display   histogram → name the shape
 *   act-1/histogram-vs-bar              choice    which display the variable earns, and why
 *
 * `act-1/describe-signature-histogram` is reused by the Act I checkpoint, so its prompt stands
 * alone: the batch is described in full and nothing refers to an instrument on the page.
 *
 * Every framing is another array, another corridor, another watch. No drill draws the sixty logged
 * contacts — the ratio distribution of DS-19 is act-1-03's own mission beat.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, listNumbers, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { describeDistribution } from './_rubrics'
import { bins, iqr, max as maxOf, mean, median, min as minOf, outliers, range as rangeOf, sd, skewness, sorted } from '@/lib/stats/descriptive'
import { fmt, fmtInt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared framing — other arrays, other corridors, never the sixty logged contacts
// ---------------------------------------------------------------------------------------------

/** Where a batch of plume ratios comes from. Each is a fleet of hulls measured against a class table. */
const SWEEPS = [
  { array: 'the Eyes', corridor: 'the Callisto–Ganymede local lane', watch: 'a single night watch' },
  { array: 'a Compact relay array', corridor: 'the Saturn feeder run', watch: 'one transit window' },
  { array: "the yard's acceptance array at Uruk High", corridor: 'the outbound holding lane', watch: 'a three-day survey' },
  { array: 'CSV *Asgard*', corridor: 'the Mars–Belt corridor', watch: 'a standing escort patrol' },
] as const

/** Quantitative variables Act I can put on a one-variable axis, with their scales. */
const BATCHES = [
  { what: 'plume ratios', unit: 'percent of the class-table expectation', short: 'percent', mu: 100, sigma: 2.8, digits: 1, individuals: 'contacts' },
  { what: 'hull ages', unit: 'years since commissioning', short: 'years', mu: 14, sigma: 4.5, digits: 1, individuals: 'hulls' },
  { what: 'dead-reckoning fix errors', unit: 'kilometres', short: 'km', mu: 12, sigma: 3.4, digits: 1, individuals: 'fixes' },
  { what: 'radiator outlet temperatures', unit: 'kelvin', short: 'K', mu: 310, sigma: 6, digits: 1, individuals: 'readings' },
] as const

type Sweep = (typeof SWEEPS)[number]
type Batch = (typeof BATCHES)[number]

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

/**
 * A batch that is roughly symmetric apart from at most one value standing clear of it.
 * The core is drawn inside ±2.6 SD, just inside where a 1.5×IQR fence falls on a Normal batch, so
 * the only value the fence can flag is the one deliberately put out there.
 */
function symmetricBatch(rng: Rng, opts: { n: number; mu: number; sigma: number; digits: number; withHot: boolean }): { values: number[]; hot: number | null } {
  const { n, mu, sigma, digits, withHot } = opts
  const f = 10 ** digits
  return retry(
    rng,
    (r) => {
      const core = drawDataset(r, {
        n: withHot ? n - 1 : n,
        mean: mu,
        sd: sigma,
        round: digits,
        min: mu - 2.6 * sigma,
        max: mu + 2.6 * sigma,
        distinct: false,
      })
      if (!withHot) return { values: core, hot: null as number | null }
      const hot = Math.round((mean(core) + sigma * r.uniform(3.2, 4.2)) * f) / f
      return { values: [...core, hot], hot: hot as number | null }
    },
    ({ values, hot }) => {
      const o = outliers(values)
      // The core must read as roughly symmetric, or "symmetric" is an unfair label.
      const core = hot === null ? values : values.filter((v) => v !== hot)
      if (Math.abs(skewness(core)) > 0.5) return false
      if (hot === null) return o.values.length === 0
      return o.values.length === 1 && o.values[0] === hot && Math.abs(skewness(values)) <= 0.9
    },
  )
}

/** A bin width that puts the batch into roughly 8–12 bars. */
function goodWidth(values: number[], step: number): number {
  const spread = rangeOf(values)
  const raw = spread / 10
  const w = Math.max(step, Math.round(raw / step) * step)
  return Math.round(w * 1000) / 1000
}

function barCount(values: number[], width: number): number {
  return bins(values, { method: 'width', width }).bins.length
}

// ---------------------------------------------------------------------------------------------
// 1. Display + interpretation — describe the distribution (SOCS) ★ checkpoint
// ---------------------------------------------------------------------------------------------

export const describeSignatureHistogram = defineGenerator({
  id: 'act-1/describe-signature-histogram',
  label: 'Describe a signature distribution',
  ap_topics: ['1.5', '1.6'],
  skills: ['2', '4'],
  generate(rng) {
    const sweep: Sweep = pickContext(rng, SWEEPS)
    const n = rng.int(40, 80)
    const sigma = Math.round(rng.uniform(2.5, 3.5) * 10) / 10
    const withHot = rng.bool(0.6)
    const { values, hot } = symmetricBatch(rng, { n, mu: 100, sigma, digits: 1, withHot })
    const binWidth = sigma >= 3 ? 2 : 1.5
    const med = median(values)
    const m = mean(values)
    const box = iqr(values)
    const s = sd(values)
    const population = `the ${values.length} contacts ${sweep.array} logged on ${sweep.corridor}`
    const answer = describeDistribution({
      variable: 'plume ratio',
      units: 'percent of the class-table expectation',
      population,
      shape: 'symmetric',
      center: [med, m],
      spread: [box, s],
      spreadLabel: 'IQR',
      unusual: hot === null ? { kind: 'none' } : { kind: 'outlier', value: hot },
    })
    const fence = outliers(values).highFence
    return {
      prompt: `Over ${sweep.watch}, ${sweep.array} logged ${fmtInt(values.length)} drive plumes on ${sweep.corridor}. Each plume is recorded as a **ratio**: measured plume power as a percent of what the class table expects for that hull's declared mass and filed acceleration. A ratio of 100 is a hull burning exactly what its paperwork says it should.\n\nThe histogram bins the ${fmtInt(values.length)} ratios at ${fmt(binWidth, 1)} percent.\n\n**Describe the distribution in context** — shape, centre, variability, and any unusual feature — in two or three sentences, with numbers and units.`,
      answer: {
        type: 'display',
        display: { kind: 'histogram', values, binWidth, label: `plume ratio (percent of the class-table expectation), ${sweep.corridor}` },
        question: answer,
      },
      hints: [
        'Shape first, then centre, then spread, then the thing that does not fit — and every one of them in the units of the variable.',
        `Centre: median ${fmt(med, 1)} percent (mean ${fmt(m, 1)}). Spread: IQR ${fmt(box, 1)} percent (SD ${fmt(s, 1)}). Then look at the far right of the axis.`,
        hot === null
          ? `The 1.5×IQR fences sit at ${fmt(outliers(values).lowFence, 1)} and ${fmt(fence, 1)} percent, and nothing is outside them — say so rather than leaving it out.`
          : `The upper fence sits at ${fmt(fence, 1)} percent. Count how many ratios are past it, and name the one that is.`,
      ],
      solution: `${answer.exemplar}\n\nFour things earn the marks and all four must be in context: **shape** (roughly symmetric and single-peaked — the tails are of similar length, so no skew), **centre** (median ${fmt(med, 1)} percent, mean ${fmt(m, 1)}), **variability** (IQR ${fmt(box, 1)} percent, SD ${fmt(s, 1)}), and **unusual features** (${hot === null ? `nothing beyond the 1.5×IQR fences at ${fmt(outliers(values).lowFence, 1)} and ${fmt(fence, 1)} percent` : `one ratio at ${fmt(hot, 1)} percent, beyond the upper fence of ${fmt(fence, 1)}`}). A description with no numbers, or numbers with no units, is half an answer.`,
      misconception: 'Skew is named for the direction of the long tail, not for where the peak sits. A tall bar at the left of a symmetric batch is not "skewed left".',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — bin width
// ---------------------------------------------------------------------------------------------

export const binWidthChoice = defineGenerator({
  id: 'act-1/bin-width',
  label: 'Choosing a bin width',
  ap_topics: ['1.5'],
  skills: ['2'],
  generate(rng) {
    const sweep: Sweep = pickContext(rng, SWEEPS)
    const b: Batch = pickContext(rng, BATCHES)
    const n = rng.int(40, 90)
    const step = 0.5
    const draw = retry(
      rng,
      (r) => {
        const values = drawDataset(r, { n, mean: b.mu, sd: b.sigma, round: 1, min: b.mu - 3.2 * b.sigma, max: b.mu + 3.2 * b.sigma })
        const good = goodWidth(values, step)
        const coarse = Math.round(rangeOf(values) / step) * step
        const fine = step / 5
        const half = Math.round((good / 2) * 1000) / 1000
        return { values, good, coarse, fine, half }
      },
      ({ values, good, coarse, fine, half }) => {
        if (!(good > 0 && half > 0 && fine > 0 && coarse > good)) return false
        const kGood = barCount(values, good)
        const kCoarse = barCount(values, coarse)
        const kFine = barCount(values, fine)
        const kHalf = barCount(values, half)
        return kGood >= 7 && kGood <= 13 && kCoarse <= 2 && kFine >= 3 * values.length / 4 && kHalf >= kGood + 4 && new Set([good, coarse, fine, half]).size === 4
      },
    )
    const { values, good, coarse, fine, half } = draw
    const kGood = barCount(values, good)
    const kCoarse = barCount(values, coarse)
    const kFine = barCount(values, fine)
    const kHalf = barCount(values, half)
    const label = (w: number, k: number) => `Bins ${fmt(w, w < 1 ? 2 : 1)} ${b.short} wide — ${fmtInt(k)} bar${k === 1 ? '' : 's'} across the batch`
    const { options, correct, feedback } = shuffleChoice(rng, [
      { text: label(good, kGood), correct: true, why: null },
      { text: label(coarse, kCoarse), correct: false, why: `${fmtInt(kCoarse)} bar${kCoarse === 1 ? '' : 's'} for ${fmtInt(values.length)} ${b.individuals}. A bin that wide swallows the whole batch: every value is inside it, so the display has no shape left to read.` },
      { text: label(fine, kFine), correct: false, why: `${fmtInt(kFine)} bars for ${fmtInt(values.length)} ${b.individuals} puts most values alone in a bin of their own. The picture is a comb of ones and twos — sampling noise, not shape.` },
      { text: label(half, kHalf), correct: false, why: `${fmtInt(kHalf)} bars is not absurd, but it is narrower than it needs to be: counts drop to two and three a bar and the outline starts to break up. Between two defensible widths, prefer the one whose bars have enough in them to be stable.` },
    ])
    return {
      prompt: `${sweep.array} logged ${fmtInt(values.length)} ${b.what} on ${sweep.corridor} over ${sweep.watch}, measured in ${b.unit}. The smallest is ${fmt(minOf(values), 1)} and the largest ${fmt(maxOf(values), 1)} ${b.short} — a range of ${fmt(rangeOf(values), 1)}.\n\nEbele has to pick a bin width before he draws the histogram. Which choice shows the shape of the batch?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Bin width is a decision, not a property of the data: the same numbers make a different picture at every width. Too wide hides the shape; too narrow shows the noise.',
        `A workable rule of thumb is roughly 8 to 12 bars. The range here is ${fmt(rangeOf(values), 1)} ${b.short}.`,
      ],
      solution: `Range ${fmt(rangeOf(values), 1)} ${b.short} over about ten bars gives a width near ${fmt(rangeOf(values) / 10, 2)}, so **${label(good, kGood).toLowerCase()}** is the honest display. At ${fmt(coarse, 1)} ${b.short} the batch collapses into ${fmtInt(kCoarse)} bar${kCoarse === 1 ? '' : 's'}; at ${fmt(fine, 2)} ${b.short} it shatters into ${fmtInt(kFine)}. Neither of those is wrong arithmetic — both are honest counts of the same ${fmtInt(values.length)} values — and that is the point: the width is a claim about what is worth seeing.`,
      misconception: 'A histogram is not a fixed picture of a dataset. Report the bin width, and check the shape at more than one of them before you describe it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Display + numeric — the value that does not fit
// ---------------------------------------------------------------------------------------------

export const unusualFeature = defineGenerator({
  id: 'act-1/unusual-feature',
  label: 'The value that stands apart',
  ap_topics: ['1.5', '1.6'],
  skills: ['2'],
  generate(rng) {
    const sweep: Sweep = pickContext(rng, SWEEPS)
    const n = rng.int(18, 30)
    const sigma = Math.round(rng.uniform(2.4, 3.4) * 10) / 10
    const { values, hot } = symmetricBatch(rng, { n, mu: 100, sigma, digits: 1, withHot: true })
    const value = hot as number
    const rest = values.filter((v) => v !== value)
    const gap = value - maxOf(rest)
    const fence = outliers(values).highFence
    return {
      prompt: `${sweep.array} plots the ${fmtInt(values.length)} plume ratios it logged on ${sweep.corridor} over ${sweep.watch}, in percent of the class-table expectation. One contact does not sit with the rest.\n\n**Report the ratio of that contact**, to one decimal place.`,
      answer: {
        type: 'display',
        display: { kind: 'dotplot', values, label: `plume ratio (percent of the class-table expectation), ${fmtInt(values.length)} contacts` },
        question: numericAnswer(value, 'other', { digits: 1, units: 'percent of expectation' }),
      },
      hints: [
        'An unusual feature is a value separated from the body of the batch by a gap — read it off the axis, do not compute it.',
        `The rest of the batch runs from ${fmt(minOf(rest), 1)} to ${fmt(maxOf(rest), 1)} percent. One dot sits clear of that to the right.`,
      ],
      solution: `The body of the batch runs ${fmt(minOf(rest), 1)} to ${fmt(maxOf(rest), 1)} percent, and one dot sits **${fmt(value, 1)} percent** — ${fmt(gap, 1)} percentage points clear of its nearest neighbour and past the 1.5×IQR upper fence of ${fmt(fence, 1)}. Naming it is part of describing the distribution; the fence is what turns "it looks odd" into a flag anyone can check.`,
      misconception: 'A gap is a feature of the display, not an error in it. Report the value and say it is unusual — do not quietly drop it before computing a centre.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — read a stemplot
// ---------------------------------------------------------------------------------------------

type StemAsk = 'median' | 'max' | 'min' | 'range'

function stemplotMd(values: number[], stemUnit: number, leafDigits: number): string {
  const s = sorted(values)
  const stems: number[] = []
  const lo = Math.floor(minOf(s) / stemUnit)
  const hi = Math.floor(maxOf(s) / stemUnit)
  for (let k = lo; k <= hi; k++) stems.push(k)
  const f = 10 ** leafDigits
  const rows = stems.map((k) => {
    const leaves = s
      .filter((v) => Math.floor(Math.round(v * f) / f / stemUnit) === k)
      .map((v) => String(Math.round((Math.round(v * f) / f - k * stemUnit) * f)).padStart(leafDigits, '0'))
    return [String(k * stemUnit), leaves.length ? leaves.join(' ') : '—']
  })
  const head = '| stem | leaves |'
  const sep = '| --- | --- |'
  return `${head}\n${sep}\n${rows.map((r) => `| ${r[0]} | ${r[1]} |`).join('\n')}`
}

export const stemplotRead = defineGenerator({
  id: 'act-1/stemplot-read',
  label: 'Read a stemplot',
  ap_topics: ['1.5'],
  skills: ['2'],
  generate(rng) {
    const sweep: Sweep = pickContext(rng, SWEEPS)
    const ask: StemAsk = pickContext(rng, ['median', 'max', 'min', 'range'] as const)
    const n = rng.int(17, 25)
    const values = retry(
      rng,
      (r) => drawDataset(r, { n: r.int(n, n + 2), mean: 100, sd: r.uniform(1.8, 2.6), round: 1, min: 94, max: 106, distinct: true }),
      (xs) => {
        // n odd so the median is a single logged value, and both ends unambiguous.
        if (xs.length % 2 === 0) return false
        const s = sorted(xs)
        if (s[1] === s[0] || s[s.length - 1] === s[s.length - 2]) return false
        return rangeOf(xs) >= 6 && rangeOf(xs) <= 12
      },
    )
    const table = stemplotMd(values, 1, 1)
    const value = ask === 'median' ? median(values) : ask === 'max' ? maxOf(values) : ask === 'min' ? minOf(values) : rangeOf(values)
    const what =
      ask === 'median'
        ? 'the **median** ratio'
        : ask === 'max'
          ? 'the **largest** ratio'
          : ask === 'min'
            ? 'the **smallest** ratio'
            : 'the **range** of the ratios'
    const s = sorted(values)
    const mid = (s.length + 1) / 2
    return {
      prompt: `${sweep.array} renders its ${fmtInt(values.length)} plume ratios from ${sweep.corridor} as a stemplot. **Stems are whole percent of the class-table expectation; the leaf unit is 0.1 percent** — so a stem of 99 with a leaf of 7 reads 99.7 percent.\n\n${table}\n\nReport ${what}, to one decimal place.`,
      answer: numericAnswer(value, 'other', { digits: 1, units: 'percent of expectation' }),
      hints: [
        'A stemplot keeps every value: stem plus leaf, in the stated leaf unit. Read the leaves in order and the batch is already sorted for you.',
        ask === 'median'
          ? `There are ${fmtInt(values.length)} values, so the median is the ${fmtInt(mid)}th leaf counting from the top.`
          : ask === 'range'
            ? 'The range is the largest value minus the smallest: the last leaf on the bottom stem minus the first leaf on the top stem.'
            : `Count to the ${ask === 'max' ? 'last leaf on the bottom stem' : 'first leaf on the top stem'} and put the leaf unit back on it.`,
      ],
      solution: `Reading the leaves in order gives the sorted batch:\n\n${listNumbers(s, 1)}\n\n${
        ask === 'median'
          ? `With $n = ${values.length}$ the median is the ${fmtInt(mid)}th value: **${fmt(value, 1)} percent**.`
          : ask === 'range'
            ? `$$\\text{range} = ${fmt(maxOf(values), 1)} - ${fmt(minOf(values), 1)} = ${fmt(value, 1)}$$\n\nThe range is **${fmt(value, 1)} percentage points**.`
            : `The ${ask === 'max' ? 'largest' : 'smallest'} value is **${fmt(value, 1)} percent**.`
      }`,
      misconception: 'The leaf unit is part of the plot. A stem of 99 and a leaf of 7 is 99.7 here, not 997 and not 99.07 — check the stated unit before you read a single value.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Display + choice — name the shape
// ---------------------------------------------------------------------------------------------

type ShapeKey = 'normal' | 'skewRight' | 'skewLeft' | 'bimodal'

const SHAPE_OPTIONS: { key: ShapeKey; text: string }[] = [
  { key: 'normal', text: 'Roughly symmetric and single-peaked' },
  { key: 'skewRight', text: 'Skewed right — a long tail toward larger values' },
  { key: 'skewLeft', text: 'Skewed left — a long tail toward smaller values' },
  { key: 'bimodal', text: 'Bimodal — two separate piles with a gap between them' },
]

/** A dip between two peaks, measured on the batch's own histogram. */
function hasValley(values: number[], width: number): boolean {
  const counts = bins(values, { method: 'width', width }).bins.map((b) => b.count)
  if (counts.length < 5) return false
  let peakLeft = 0
  let peakLeftIdx = 0
  for (let i = 0; i < Math.floor(counts.length / 2); i++) if (counts[i] > peakLeft) { peakLeft = counts[i]; peakLeftIdx = i }
  let peakRight = 0
  let peakRightIdx = counts.length - 1
  for (let i = Math.ceil(counts.length / 2); i < counts.length; i++) if (counts[i] > peakRight) { peakRight = counts[i]; peakRightIdx = i }
  if (peakRightIdx - peakLeftIdx < 2) return false
  let valley = Infinity
  for (let i = peakLeftIdx + 1; i < peakRightIdx; i++) valley = Math.min(valley, counts[i])
  return peakLeft >= 4 && peakRight >= 4 && valley <= 0.4 * Math.min(peakLeft, peakRight)
}

export const shapeFromHistogram = defineGenerator({
  id: 'act-1/shape-from-histogram',
  label: 'Name the shape',
  ap_topics: ['1.5', '1.6'],
  skills: ['2'],
  generate(rng) {
    const sweep: Sweep = pickContext(rng, SWEEPS)
    const b: Batch = pickContext(rng, BATCHES)
    const shape: ShapeKey = pickContext(rng, ['normal', 'skewRight', 'skewLeft', 'bimodal'] as const)
    const n = rng.int(45, 80)
    const skewFor = (xs: number[]) => (mean(xs) - median(xs)) / sd(xs)
    const values = drawDataset(rng, {
      n,
      mean: b.mu,
      sd: b.sigma,
      round: 1,
      min: 0.1,
      shape,
      accept: (v) => {
        const k = skewFor(v)
        if (shape === 'normal') return Math.abs(k) < 0.06
        if (shape === 'skewRight') return k > 0.22
        if (shape === 'skewLeft') return k < -0.22
        return Math.abs(k) < 0.12 && hasValley(v, goodWidth(v, 0.1))
      },
    })
    const binWidth = goodWidth(values, 0.1)
    const correct = SHAPE_OPTIONS.findIndex((o) => o.key === shape)
    const m = mean(values)
    const med = median(values)
    const feedback = SHAPE_OPTIONS.map((o, i) => {
      if (i === correct) return null
      if (o.key === 'normal') return `The two sides of this histogram are not mirror images. Compare the mean (${fmt(m, 1)}) with the median (${fmt(med, 1)}) ${b.short} and look at which side runs out farther.`
      if (o.key === 'skewRight') return 'A right skew has its long tail toward LARGER values, with the pile at the low end. Check which side of the histogram thins out.'
      if (o.key === 'skewLeft') return 'A left skew has its long tail toward SMALLER values, with the pile at the high end. Check which side of the histogram thins out.'
      return 'Bimodal means two separate piles with a genuine dip between them — not one pile with a ragged top. Bars of different heights inside one mound are sampling noise.'
    })
    const body =
      shape === 'normal'
        ? 'the bars rise to one peak near the middle and fall away at about the same rate on both sides'
        : shape === 'skewRight'
          ? 'the bars pile at the low end and trail off a long way toward the large values'
          : shape === 'skewLeft'
            ? 'the bars pile at the high end and trail off a long way toward the small values'
            : 'the bars rise, fall to a dip, and rise again — two piles, not one'
    return {
      prompt: `${sweep.array} bins ${fmtInt(values.length)} ${b.what} from ${sweep.corridor} (${b.unit}) at ${fmt(binWidth, 2)} ${b.short} a bar. **Which describes the shape?**`,
      answer: {
        type: 'display',
        display: { kind: 'histogram', values, binWidth, label: `${b.what} (${b.short})` },
        question: { type: 'choice', options: SHAPE_OPTIONS.map((o) => o.text), correct, feedback },
      },
      hints: [
        'Skew is named for the direction of the long tail, not for where the pile sits. Two peaks with a dip between them is a shape of its own.',
        `The mean is ${fmt(m, 1)} and the median ${fmt(med, 1)} ${b.short}: the mean is dragged toward a long tail and sits near the median when there is not one.`,
      ],
      solution: `Reading the bars, ${body}, so the shape is **${SHAPE_OPTIONS[correct].text.toLowerCase()}**. Mean ${fmt(m, 1)} ${shape === 'skewRight' ? '>' : shape === 'skewLeft' ? '<' : '≈'} median ${fmt(med, 1)} ${b.short} agrees${shape === 'bimodal' ? ' — though for a two-peaked batch neither number describes it, which is why shape is named before centre' : ''}.`,
      misconception: 'Naming the skew from where the peak sits. The peak of a right-skewed batch is on the LEFT; the name comes from the tail.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — histogram or bar chart
// ---------------------------------------------------------------------------------------------

const QUANT_FIELDS = [
  { name: 'plume ratio, in percent of the class-table expectation', why: 'a measurement on a continuous scale' },
  { name: 'hull age at loss, in years', why: 'elapsed time on a continuous scale' },
  { name: 'mark at last contact along the Lane', why: 'a position on a continuous corridor' },
  { name: 'declared cargo value, in M₵', why: 'money on a continuous scale' },
  { name: 'hours from first transponder degradation to silence', why: 'elapsed time on a continuous scale' },
] as const

const CAT_FIELDS = [
  { name: 'classification — accident, piracy or unknown', why: 'a code with no order and no arithmetic' },
  { name: 'classifying office — Uruk or Ceres', why: 'a label, even when the export writes it as 01 and 02' },
  { name: 'owner class — Perrine, Mercantile or independent', why: 'a label with no scale behind it' },
  { name: 'drive family — Mk 3, Tessera-C or Mk 2', why: 'three design families; a label' },
] as const

export const histogramVsBar = defineGenerator({
  id: 'act-1/histogram-vs-bar',
  label: 'Histogram or bar chart',
  ap_topics: ['1.4', '1.5'],
  skills: ['2'],
  generate(rng) {
    const variant = rng.bool(0.5) ? 'which-display' : 'which-statement'
    if (variant === 'which-display') {
      const quantitative = rng.bool(0.5)
      const field = quantitative ? pickContext(rng, QUANT_FIELDS) : pickContext(rng, CAT_FIELDS)
      const n = rng.int(40, 120)
      const { options, correct, feedback } = shuffleChoice(rng, [
        {
          text: quantitative ? 'A histogram — bins of equal width along a numeric axis, bars touching' : 'A bar chart — one bar per category, bars separated, order chosen by the analyst',
          correct: true,
          why: null,
        },
        {
          text: quantitative ? 'A bar chart — one bar per distinct recorded value, bars separated' : 'A histogram — bins of equal width along a numeric axis, bars touching',
          correct: false,
          why: quantitative
            ? 'One bar per distinct value throws away the scale: the gaps between values carry information here, and a bar chart draws every value the same distance apart no matter how far apart they really are.'
            : 'A histogram needs a numeric axis with real distances on it. These categories have no order to put along an axis and no width to bin.',
        },
        {
          text: 'A pie chart — one slice per value, slices summing to the whole',
          correct: false,
          why: quantitative
            ? 'A pie needs mutually exclusive categories of one whole. A measurement on a scale has no slices, and a pie destroys the ordering the shape lives in.'
            : 'A pie is legitimate for parts of one whole, but the bridge cannot compare three angles by eye, and it cannot be put beside a second group. Side-by-side bars can.',
        },
        {
          text: 'A scatterplot of the value against the record number',
          correct: false,
          why: 'That is a display of two variables. The question is about the distribution of one.',
        },
      ])
      return {
        prompt: `Ebele has ${fmtInt(n)} records and one column to display: **${field.name}**. He wants the distribution of that one variable on a single axis.\n\nWhich display is right for it?`,
        answer: { type: 'choice', options, correct, feedback },
        hints: [
          'Ask what kind of thing the variable is first. A histogram needs a numeric axis whose distances mean something; a bar chart needs categories.',
          `This field is ${field.why}.`,
        ],
        solution: `The field is ${field.why}, so it is **${quantitative ? 'quantitative' : 'categorical'}** and earns **${quantitative ? 'a histogram' : 'a bar chart'}**. ${quantitative ? 'Bars touch because the axis is continuous: the space between two bars would be a range of values with nothing in it, which is a statement about the data. Bin width is the analyst\'s decision and belongs in the caption.' : 'Bars are separated because there is nothing between two categories; their order is the analyst\'s decision and carries no meaning, so it must not be read as a trend.'}`,
        misconception: 'A histogram is not a bar chart with the gaps closed. The touching bars are a claim that the axis is continuous, and the bin width is a decision the reader must be told.',
      }
    }
    const { options, correct, feedback } = shuffleChoice(rng, [
      {
        text: 'In a histogram the bars touch because the axis is continuous, and the bin width is a choice the analyst makes; in a bar chart the bars are separated and their order carries no meaning.',
        correct: true,
        why: null,
      },
      {
        text: 'A histogram is a bar chart drawn with the gaps closed up; both display the same kind of variable.',
        correct: false,
        why: 'The closed gaps are the whole difference. They assert that the axis is a continuous scale, which is true of a measurement and false of a set of codes.',
      },
      {
        text: 'Reordering the bars from tallest to shortest makes either display easier to read, and changes nothing about what it says.',
        correct: false,
        why: 'That is safe on a bar chart, where the order is arbitrary. On a histogram it destroys the display: the bars are in the order of the numeric axis, and sorting them by height throws the scale away.',
      },
      {
        text: 'A histogram shows every individual value, so no information is lost; a bar chart summarises.',
        correct: false,
        why: 'A histogram loses the individual values inside each bin — that is what binning is. A stemplot or a dotplot keeps them; a histogram trades them for a readable shape.',
      },
    ])
    return {
      prompt: 'Ferrier wants the difference between a **histogram** and a **bar chart** stated in one sentence before anything else goes up on the plot.\n\nWhich statement is correct?',
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'One of these displays has a numeric axis with real distances on it. Everything else about the pair follows from that.',
        'Ask what the gap between two bars would mean, and what happens if you reorder them.',
      ],
      solution: 'A **histogram** puts a quantitative variable on a continuous numeric axis and counts how many individuals fall in each bin; the bars touch because there is no gap in the scale, and the bin width is a decision that must be reported. A **bar chart** puts one bar over each category of a categorical variable; the bars are separated because nothing lies between two categories, and their order is arbitrary — which is why a histogram must never be sorted by height.',
      misconception: 'Treating a histogram as a bar chart: sorting its bars, reading the gaps as categories, or leaving the bin width off the caption.',
    }
  },
})
