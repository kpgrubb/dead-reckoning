/**
 * act-1-06 · Lost and Arrived — drills. AP 1.9: comparing the distributions of one quantitative
 * variable across two groups. Parallel boxplots, back-to-back stemplots and histograms on a shared
 * axis; a comparison sentence that addresses shape, centre, variability and unusual features *with
 * comparative language*; and the prior question nobody asks — whether the baseline group can answer
 * the question at all.
 *
 *   act-1/compare-boxplots        interp   write the comparison from a pair of parallel boxplots
 *   act-1/comparative-sentence    interp   same rubric, from a five-number summary table only
 *   act-1/display-for-comparison  choice   which display puts these two groups on one scale
 *   act-1/right-baseline          choice   which comparison group can answer the question
 *   act-1/read-parallel-boxplots  display  one statement the parallel boxplots actually support
 *
 * `act-1/compare-boxplots` is reused by the Act I checkpoint, so it stands alone: the groups, the
 * variable, the units and both summaries are printed in the prompt and no item refers to an
 * instrument on the page. It carries its boxplot as `data:` (not as a `display` answer) because the
 * checkpoint's one display item is act-1/describe-signature-histogram.
 *
 * Every framing is another corridor, another office or another drive family — never the Register's
 * own mark comparison, which is act-1-06's mission beat.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, pickContext, retry, tableMd, type Shape as DrawShape } from '@/lib/problems/generate'
import { compareDistributions, type Shape } from './_rubrics'
import type { DisplaySpec } from '@/lib/problems/types'
import { fmt, fmtInt } from '@/lib/stats/format'
import { fiveNumber, iqr, mean, median, sd } from '@/lib/stats'

// ---------------------------------------------------------------------------------------------
// Shared framing
// ---------------------------------------------------------------------------------------------

const CORRIDORS = [
  { name: 'the Mars–Belt corridor', years: '2170–76' },
  { name: 'the Saturn feeder run', years: '2177–83' },
  { name: 'the Venus–Earth shuttle lane', years: '2179–84' },
  { name: 'the Callisto–Ganymede local lane', years: '2175–81' },
] as const

/** The Register's own comparison numbers — act-1-06's mission beat. Never a generated drill's figure. */
const RESERVED = [9.26, 6.48, 0.4, 5.51, 34.7, 76.4, 13.6, 14.2]
function reserved(x: number): boolean {
  return RESERVED.some((r) => Math.abs(x - r) < 0.06)
}

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

const SHAPE_CLAUSE: Record<Shape, string> = {
  symmetric: 'roughly symmetric, with the median near the middle of the box',
  skewRight: 'skewed to the right, with a long upper whisker',
  skewLeft: 'skewed to the left, with a long lower whisker',
  bimodal: 'split into two piles, which a box cannot show',
  uniform: 'roughly flat across its range',
}

/**
 * How far apart the two centres are drawn, in multiples of the larger standard deviation: far
 * enough that the comparison is unambiguous (well over one SD), close enough that the two groups
 * still overlap, so "every value in one exceeds every value in the other" is never the reading.
 */
function separation(r: Rng): number {
  return r.uniform(1.4, 2.0)
}

/** The rubric's shape vocabulary against `drawDataset`'s. */
const DRAW_SHAPE: Record<Shape, DrawShape> = {
  symmetric: 'normal',
  skewRight: 'skewRight',
  skewLeft: 'skewLeft',
  bimodal: 'bimodal',
  uniform: 'uniform',
}

// ---------------------------------------------------------------------------------------------
// Two-group contexts (shared by the two interpretation items)
// ---------------------------------------------------------------------------------------------

interface PairSpec {
  /** Group A is always the one the question is about. */
  groupA: string
  groupB: string
  variable: string
  units: string
  digits: number
  /** Plural noun for the individuals: "hulls", "cases", "contacts". */
  noun: string
  frame: (nA: number, nB: number, corridor: string, years: string) => string
  draw: (r: Rng) => { a: number[]; b: number[]; shapeA: Shape; shapeB: Shape }
}

const PAIRS: PairSpec[] = [
  {
    groupA: 'the lost hulls',
    groupB: 'arrived transits',
    variable: 'declared cargo value',
    units: 'M₵',
    digits: 1,
    noun: 'hulls',
    frame: (nA, nB, corridor, years) =>
      `The Transit Ledger for ${corridor}, ${years}, carries a declared cargo value for every crossing. Here are the ${fmtInt(nA)} hulls the corridor lost and a random sample of ${fmtInt(nB)} transits that arrived.`,
    draw: (r) => {
      const shapeA: Shape = 'skewRight'
      const shapeB: Shape = 'skewRight'
      const muA = r.uniform(26, 46)
      const sdA = muA * r.uniform(0.28, 0.4)
      const sdB = r.uniform(18, 34)
      const muB = muA + separation(r) * Math.max(sdA, sdB)
      return {
        a: drawDataset(r, { n: r.int(24, 38), mean: muA, sd: sdA, shape: DRAW_SHAPE[shapeA], round: 1, min: 4 }),
        b: drawDataset(r, { n: r.int(40, 60), mean: muB, sd: sdB, shape: DRAW_SHAPE[shapeB], round: 1, min: 4 }),
        shapeA,
        shapeB,
      }
    },
  },
  {
    groupA: 'the Uruk office',
    groupB: 'Ceres-office cases',
    variable: 'days from the loss to a filed classification',
    units: 'days',
    digits: 1,
    noun: 'cases',
    frame: (nA, nB, corridor, years) =>
      `Two offices classify the losses on ${corridor}, ${years}. For each closed case the Authority records the days between the loss and the filed finding: ${fmtInt(nA)} cases at the Uruk office, ${fmtInt(nB)} at the Ceres office.`,
    draw: (r) => {
      const shapeA: Shape = 'skewRight'
      const shapeB: Shape = 'symmetric'
      const muB = r.uniform(30, 52)
      const sdB = muB * r.uniform(0.14, 0.22)
      const sdA = r.uniform(14, 26)
      const muA = muB + separation(r) * Math.max(sdA, sdB)
      return {
        a: drawDataset(r, { n: r.int(22, 36), mean: muA, sd: sdA, shape: DRAW_SHAPE[shapeA], round: 1, min: 3 }),
        b: drawDataset(r, { n: r.int(20, 34), mean: muB, sd: sdB, shape: DRAW_SHAPE[shapeB], round: 1, min: 3 }),
        shapeA,
        shapeB,
      }
    },
  },
  {
    groupA: 'the Mk 3 contacts',
    groupB: 'Tessera-C contacts',
    variable: 'plume power',
    units: 'GW',
    digits: 0,
    noun: 'contacts',
    frame: (nA, nB) =>
      `A watch of the Eyes logs plume power for two drive families under thrust: ${fmtInt(nA)} Adlinda Mk 3 hulls and ${fmtInt(nB)} Tessera-C hulls, in gigawatts.`,
    draw: (r) => {
      const shapeA: Shape = 'symmetric'
      const shapeB: Shape = 'symmetric'
      const muA = r.uniform(300, 340)
      const sdA = r.uniform(20, 30)
      const sdB = r.uniform(9, 15)
      const muB = muA - separation(r) * Math.max(sdA, sdB)
      return {
        a: drawDataset(r, { n: r.int(20, 34), mean: muA, sd: sdA, shape: DRAW_SHAPE[shapeA], round: 0, min: 80 }),
        b: drawDataset(r, { n: r.int(20, 34), mean: muB, sd: sdB, shape: DRAW_SHAPE[shapeB], round: 0, min: 60 }),
        shapeA,
        shapeB,
      }
    },
  },
]

interface PairDraw {
  spec: PairSpec
  a: number[]
  b: number[]
  shapeA: Shape
  shapeB: Shape
  corridor: string
  years: string
}

/**
 * Draw two groups whose comparison is unambiguous: the centres at least one standard deviation
 * apart, the two IQRs more than 15 % apart, and the groups still overlapping (so "every value in
 * one exceeds every value in the other" is never the honest reading).
 */
function drawPair(rng: Rng, spec: PairSpec): PairDraw {
  const corr = pickContext(rng, CORRIDORS)
  const d = retry(
    rng,
    (r) => spec.draw(r),
    ({ a, b }) => {
      const mA = median(a)
      const mB = median(b)
      const iA = iqr(a)
      const iB = iqr(b)
      if (!(iA > 0 && iB > 0)) return false
      if (Math.abs(mA - mB) < Math.max(sd(a), sd(b))) return false
      if (Math.max(iA, iB) / Math.min(iA, iB) < 1.15) return false
      if (fmt(mA, spec.digits) === fmt(mB, spec.digits) || fmt(iA, spec.digits) === fmt(iB, spec.digits)) return false
      if ([mA, mB, iA, iB].some(reserved)) return false
      // The groups must still overlap: a comparison, not a separation.
      return Math.min(...a) < Math.max(...b) && Math.max(...a) > Math.min(...b)
    },
  )
  return { spec, ...d, corridor: corr.name, years: corr.years }
}

function summaryTable(d: PairDraw): { columns: string[]; rows: (string | number)[][] } {
  const { spec } = d
  const row = (name: string, xs: number[]) => {
    const f = fiveNumber(xs)
    return [name, fmtInt(xs.length), fmt(f.min, spec.digits), fmt(f.q1, spec.digits), fmt(f.median, spec.digits), fmt(f.q3, spec.digits), fmt(f.max, spec.digits), fmt(iqr(xs), spec.digits), fmt(mean(xs), spec.digits), fmt(sd(xs), spec.digits)]
  }
  return {
    columns: ['group', 'n', 'min', 'Q1', 'median', 'Q3', 'max', 'IQR', 'mean', 'SD'],
    rows: [row(d.spec.groupA, d.a), row(d.spec.groupB, d.b)],
  }
}

function shapeNoteFor(d: PairDraw): string {
  const wider = iqr(d.a) > iqr(d.b) ? d.spec.groupA : d.spec.groupB
  return `${d.spec.groupA} are ${SHAPE_CLAUSE[d.shapeA]}, while ${d.spec.groupB} are ${SHAPE_CLAUSE[d.shapeB]}; the middle half of ${wider} is the wider of the two.`
}

function answerFor(d: PairDraw) {
  return compareDistributions({
    groupA: d.spec.groupA,
    groupB: d.spec.groupB,
    variable: d.spec.variable,
    units: d.spec.units,
    centerA: median(d.a),
    centerB: median(d.b),
    spreadA: iqr(d.a),
    spreadB: iqr(d.b),
    shapeNote: shapeNoteFor(d),
    digits: d.spec.digits,
  })
}

const COMPARISON_HINTS = (d: PairDraw): string[] => [
  'Four headings, every one of them comparative: shape, centre, variability, unusual features. If a clause names only one group, it is a description, not a comparison.',
  `Centres: median ${fmt(median(d.a), d.spec.digits)} ${d.spec.units} for ${d.spec.groupA} against ${fmt(median(d.b), d.spec.digits)} for ${d.spec.groupB}. Variability: IQR ${fmt(iqr(d.a), d.spec.digits)} against ${fmt(iqr(d.b), d.spec.digits)}.`,
  'One sentence, both groups, both medians, both IQRs, and the word *than* between them — then a clause on shape or on the values that stand apart.',
]

function comparisonSolution(d: PairDraw, exemplar: string): string {
  const dir = median(d.a) > median(d.b) ? 'higher' : 'lower'
  return `${d.spec.groupA}: median ${fmt(median(d.a), d.spec.digits)} ${d.spec.units}, IQR ${fmt(iqr(d.a), d.spec.digits)}. ${d.spec.groupB}: median ${fmt(median(d.b), d.spec.digits)} ${d.spec.units}, IQR ${fmt(iqr(d.b), d.spec.digits)}. The first group's centre is ${dir}, and the two spreads differ by a factor of ${fmt(Math.max(iqr(d.a), iqr(d.b)) / Math.min(iqr(d.a), iqr(d.b)), 2)}.\n\n**${exemplar}**\n\nThe failure this item is looking for is two descriptions in sequence — each group summarised on its own, with no clause holding both. A comparison puts them in one clause and names the direction.`
}

// ---------------------------------------------------------------------------------------------
// 1. Interpretation — compare two groups from parallel boxplots
// ---------------------------------------------------------------------------------------------

export const compareBoxplots = defineGenerator({
  id: 'act-1/compare-boxplots',
  label: 'Compare two groups from parallel boxplots',
  ap_topics: ['1.9'],
  skills: ['4'],
  generate(rng) {
    const spec = pickContext(rng, PAIRS)
    const d = drawPair(rng, spec)
    const answer = answerFor(d)
    const t = summaryTable(d)
    const display: DisplaySpec = {
      kind: 'boxplot',
      groups: [
        { name: spec.groupA, values: d.a },
        { name: spec.groupB, values: d.b },
      ],
      label: `${spec.variable} (${spec.units}) · ${spec.groupA} and ${spec.groupB} on one scale`,
    }
    return {
      prompt: `${spec.frame(d.a.length, d.b.length, d.corridor, d.years)}\n\nThe two groups are drawn as parallel boxplots on one scale, with their five-number summaries:\n\n${tableMd(t.columns, t.rows)}\n\nIn one or two sentences, **compare** the distributions of ${spec.variable} for ${spec.groupA} and ${spec.groupB}. Address centre and variability with both numbers, say something about shape or unusual values, and name both groups, the variable and the units.`,
      data: display,
      answer,
      hints: COMPARISON_HINTS(d),
      solution: comparisonSolution(d, answer.exemplar),
      misconception: 'Describing each group in turn instead of comparing them, or comparing only the centres and leaving the variability out. Both groups belong in every clause.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the same sentence, from summaries alone
// ---------------------------------------------------------------------------------------------

export const comparativeSentence = defineGenerator({
  id: 'act-1/comparative-sentence',
  label: 'Write the comparison from two summaries',
  ap_topics: ['1.9'],
  skills: ['4'],
  generate(rng) {
    const spec = pickContext(rng, PAIRS)
    const d = drawPair(rng, spec)
    const answer = answerFor(d)
    const t = summaryTable(d)
    const who = rng.bool() ? 'the preliminary' : "the corridor's annual return"
    return {
      prompt: `${spec.frame(d.a.length, d.b.length, d.corridor, d.years)}\n\nNo chart — only the summaries:\n\n${tableMd(t.columns, t.rows)}\n\nA paragraph of ${who} needs the comparison in words. Write **one sentence with *than* in it** comparing ${spec.variable} for ${spec.groupA} and ${spec.groupB}: both medians, both IQRs, a clause on shape or on the values that stand apart, and the units.`,
      answer,
      hints: COMPARISON_HINTS(d),
      solution: comparisonSolution(d, answer.exemplar),
      misconception: 'Reporting the difference between the medians and stopping. A comparison of distributions also compares how spread out they are, and says which way round.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which display puts two groups on one scale
// ---------------------------------------------------------------------------------------------

interface DisplayCtx {
  corridor: string
  years: string
  nSmall: number
  nBig: number
}

const DISPLAY_SCENARIOS: { question: (c: DisplayCtx) => string; candidates: (c: DisplayCtx) => Candidate[] }[] = [
  {
    question: (c) =>
      `Do the ${fmtInt(c.nSmall)} hulls lost on ${c.corridor} sit later along the corridor than incidents in general? The baseline group holds ${fmtInt(c.nBig)} records.`,
    candidates: (c) => [
      { text: 'Parallel boxplots of mark, both groups on one axis, each labelled with its n.', correct: true, why: null },
      { text: `A back-to-back stemplot with all ${fmtInt(c.nBig)} baseline values down one side.`, correct: false, why: `A stemplot shows every value it plots, so it cannot plot ${fmtInt(c.nBig)} of them. For a group that size it must be subsampled — and the subsample declared.` },
      { text: 'One histogram of the two groups pooled together.', correct: false, why: 'Pooling erases the comparison. The groups have to stay apart for a comparison to exist.' },
      { text: 'Two histograms, each binned to fill its own panel.', correct: false, why: 'Two panels with different axes or different bin widths compare your binning choices, not the groups. A shared axis and a shared bin width are what make two histograms comparable.' },
    ],
  },
  {
    question: (c) =>
      `${fmtInt(c.nSmall)} hulls in one yard and ${fmtInt(c.nSmall + 3)} in another, with a survey time for each. The question is whether one yard's times are **bimodal** — a fast group and a slow group — while the other's are not.`,
    candidates: () => [
      { text: 'Histograms for the two yards on a shared axis with a shared bin width, or a back-to-back stemplot.', correct: true, why: null },
      { text: 'Parallel boxplots of survey time.', correct: false, why: 'A boxplot cannot show two peaks. Five numbers hide the difference between one pile and two, which is exactly what this question is about.' },
      { text: 'A bar chart of the mean survey time in each yard.', correct: false, why: 'Two bars are two numbers. A mean says nothing about shape, and nothing about spread either.' },
      { text: 'One dotplot of all the times together, coloured by yard.', correct: false, why: 'Better than a bar chart, but the two shapes sit on top of each other. Separate them onto one shared axis and each shape can be read on its own.' },
    ],
  },
  {
    question: (c) => `Twelve cutter sorties from ${c.corridor}'s inner station and fourteen from the outer station, each with a time to first contact. Every value matters and the crews want to see the actual numbers.`,
    candidates: () => [
      { text: 'A back-to-back stemplot, one stem down the middle, with the leaf unit stated.', correct: true, why: null },
      { text: 'Parallel boxplots.', correct: false, why: 'Legitimate, but with a dozen values per group a boxplot throws away most of what there is to see, and the crews asked for the values.' },
      { text: 'Two pie charts, one per station.', correct: false, why: 'Time to first contact is quantitative. A pie has no axis to measure it on, and two pies are two wholes.' },
      { text: 'A single time plot with both stations on it, in the order the sorties flew.', correct: false, why: 'That answers a question about trend over time, which is not the question asked. A distribution comparison ignores the order.' },
    ],
  },
  {
    question: (c) => `A comparison of declared cargo value for ${fmtInt(c.nSmall)} lost hulls and ${fmtInt(c.nBig)} arrived transits is going into a report. Which caption makes the display honest?`,
    candidates: () => [
      { text: `Both groups' n printed beside their names, on one shared axis, with the units stated.`, correct: true, why: null },
      { text: 'A note that the arrived group has far more transits, so its bars are taller.', correct: false, why: 'Taller bars over a bigger group are a fact about the counts, not about the values. Compare shape, centre and spread — or draw relative frequencies.' },
      { text: `A note that the wider box belongs to the group with more records.`, correct: false, why: 'False. Box width is the IQR — how spread out the middle half is. A group of 31 can easily have the wider box.' },
      { text: 'Each group scaled to fill its own panel so both shapes are clearly visible.', correct: false, why: 'Two different axes make two pictures that cannot be laid against one another. The shared scale is the whole point of a comparative display.' },
    ],
  },
]

export const displayForComparison = defineGenerator({
  id: 'act-1/display-for-comparison',
  label: 'Which display compares the two groups',
  ap_topics: ['1.9'],
  skills: ['1'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, DISPLAY_SCENARIOS)
    const ctx: DisplayCtx = { corridor: corr.name, years: corr.years, nSmall: rng.int(18, 44), nBig: rng.int(900, 2600) }
    const { options, correct, feedback } = shuffleChoice(rng, s.candidates(ctx))
    return {
      prompt: `${s.question(ctx)}\n\nWhich display answers it?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two questions settle it: do the groups share one axis, and does the display show the feature the question asks about — centre and spread, or shape?',
        'A boxplot is centre and spread on a shared axis and survives any group size. A stemplot shows every value and so needs small groups. Histograms show shape, but only when the axis and the bin width are shared.',
      ],
      solution: `**${options[correct]}**\n\nA comparative display has to do two things: put both groups on one scale, and show the feature the question is about. Boxplots give centre and spread at any group size and hide shape; stemplots give every value and need small groups; shared-axis histograms give shape. Changing the axis or the bin width between panels compares the drafting, not the data.`,
      misconception: 'Choosing a display that cannot show the feature the question asks about — most often parallel boxplots for a question about shape, which five numbers cannot carry.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which comparison group can answer the question
// ---------------------------------------------------------------------------------------------

interface BaselineScenario {
  question: (c: DisplayCtx) => string
  candidates: (c: DisplayCtx) => Candidate[]
}

const BASELINE_SCENARIOS: BaselineScenario[] = [
  {
    question: (c) => `Ebele wants to know whether the ${fmtInt(c.nSmall)} hulls lost on ${c.corridor} were lost in an unusual **place** — whether their mark at last contact is concentrated somewhere the corridor is not.`,
    candidates: (c) => [
      { text: `All ${fmtInt(c.nBig)} incident records the Authority logged on the corridor — advisories, dropouts, diversions and losses — at the mark each was logged.`, correct: true, why: null },
      { text: 'The transits that arrived, at their mark at last contact.', correct: false, why: 'An arrived hull\'s last contact is the destination beacon, every time. That group has no variation in the variable at all, so it can say nothing about where things happen.' },
      { text: 'The same 31 losses, at the mark where their transit began.', correct: false, why: 'Every transit begins at Mark 1. A group with one value is not a comparison group; it is a definition.' },
      { text: 'The losses classified *piracy*, against the losses classified *unknown*.', correct: false, why: 'That is a comparison worth making, but it is a comparison *within* the losses. It cannot say whether the losses as a whole sit somewhere unusual, because there is no baseline in it.' },
    ],
  },
  {
    question: (c) => `The question is whether the ${fmtInt(c.nSmall)} lost hulls were **older** than the hulls that cross ${c.corridor} safely.`,
    candidates: (c) => [
      { text: `The hull age of a sample of the ${fmtInt(c.nBig)} transits that arrived.`, correct: true, why: null },
      { text: 'The hull age of every incident record on the corridor, including advisories and dropouts.', correct: false, why: 'Usable, but it mixes the losses themselves back into the baseline and answers a vaguer question. Age has a real value for an arrived hull, so arrived transits are the cleaner comparison group here.' },
      { text: 'The age of the hulls still on the builder\'s register, whether or not they ever flew the corridor.', correct: false, why: 'That population never faced the corridor. A comparison group has to have been exposed to the same process.' },
      { text: 'The design age of each hull class, from the class table.', correct: false, why: 'One number per class is not a distribution of hull ages, and the class table describes designs rather than the ships that flew.' },
    ],
  },
  {
    question: (c) => `Ferrante asks whether the losses on ${c.corridor} were carrying **more valuable** cargo than the corridor carries in general — the base rate before the patient.`,
    candidates: (c) => [
      { text: `The declared cargo value of the ${fmtInt(c.nBig)} transits that arrived over the same years.`, correct: true, why: null },
      { text: 'The declared cargo value of the losses, split by classifying office.', correct: false, why: 'A comparison inside the losses. With no baseline in it, it cannot say what the corridor carries in general.' },
      { text: 'The insured value of the cargo recovered from the wrecks.', correct: false, why: 'Recovered cargo is only what was found, which is decided after the loss and by the search. It cannot stand for what the corridor carries.' },
      { text: 'The declared cargo value of every transit that arrived, over the *following* six years.', correct: false, why: 'A different period, over which the mix and the prices both moved. A baseline has to share the years as well as the corridor.' },
    ],
  },
  {
    question: () => 'A comparison group has just been proposed whose values are all identical. What follows?',
    candidates: () => [
      { text: 'It cannot serve as a baseline for that variable: with no variation it has no distribution to compare against.', correct: true, why: null },
      { text: 'It is the strongest possible baseline, because its centre is known exactly.', correct: false, why: 'A centre with no spread around it is a definition, not a distribution. Nothing in it could have come out otherwise.' },
      { text: 'It is usable as long as the other group is large enough.', correct: false, why: 'The other group\'s size does not supply variation the baseline does not have.' },
      { text: 'It is usable after its one value is jittered so the boxplot renders.', correct: false, why: 'Drawing a box around a value that never varied invents variability. If the display needs it, the display is the wrong display.' },
    ],
  },
]

export const rightBaseline = defineGenerator({
  id: 'act-1/right-baseline',
  label: 'Which baseline answers the question',
  ap_topics: ['1.9'],
  skills: ['1'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, BASELINE_SCENARIOS)
    const ctx: DisplayCtx = { corridor: corr.name, years: corr.years, nSmall: rng.int(22, 48), nBig: rng.int(900, 2600) }
    const { options, correct, feedback } = shuffleChoice(rng, s.candidates(ctx))
    return {
      prompt: `${s.question(ctx)}\n\nWhich comparison group can answer it?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask what the variable would be for each individual in the proposed baseline. If the answer is the same number for all of them, the group cannot answer a question about that variable.',
        'A baseline must have been exposed to the same process, over the same period, and must actually vary in the variable being compared.',
      ],
      solution: `**${options[correct]}**\n\nA comparison group earns its place by three tests: it is exposed to the same process over the same period; the variable genuinely varies within it; and it does not contain the group being tested. A group whose value is fixed by definition fails the second test however large it is.`,
      misconception: 'Comparing the losses with the arrivals on a variable that arrival itself determines. Where a hull was last heard is Mark 12 for every hull that arrived — a definition wearing the clothes of a baseline.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Display — one statement a pair of boxplots actually supports
// ---------------------------------------------------------------------------------------------

export const readParallelBoxplots = defineGenerator({
  id: 'act-1/read-parallel-boxplots',
  label: 'Read a pair of parallel boxplots',
  ap_topics: ['1.9'],
  skills: ['2'],
  generate(rng) {
    const spec = pickContext(rng, PAIRS)
    const d = drawPair(rng, spec)
    const dg = spec.digits
    const fA = fiveNumber(d.a)
    const fB = fiveNumber(d.b)
    const iA = iqr(d.a)
    const iB = iqr(d.b)
    const higher = fA.median > fB.median ? spec.groupA : spec.groupB
    const lower = fA.median > fB.median ? spec.groupB : spec.groupA
    const hiMed = Math.max(fA.median, fB.median)
    const loMed = Math.min(fA.median, fB.median)
    const wider = iA > iB ? spec.groupA : spec.groupB
    const narrower = iA > iB ? spec.groupB : spec.groupA
    const wideIqr = Math.max(iA, iB)
    const narrowIqr = Math.min(iA, iB)
    const bigger = d.a.length > d.b.length ? spec.groupA : spec.groupB
    const variant = rng.bool() ? 'centre' : 'spread'

    const centreTrue: Candidate = {
      text: `The median ${spec.variable} of ${higher} is greater than that of ${lower} — ${fmt(hiMed, dg)} ${spec.units} against ${fmt(loMed, dg)}.`,
      correct: variant === 'centre',
      why: variant === 'centre' ? null : 'True, and read straight off the two median lines — but this item asks about variability, and one of the other statements is the one about spread that the boxes support.',
    }
    const spreadTrue: Candidate = {
      text: `The middle half of ${wider} is wider than the middle half of ${narrower} — IQR ${fmt(wideIqr, dg)} ${spec.units} against ${fmt(narrowIqr, dg)}.`,
      correct: variant === 'spread',
      why: variant === 'spread' ? null : 'True, and the box lengths say so — but this item asks about the centres, and one of the other statements is the one about medians that the boxes support.',
    }
    const cands: Candidate[] = [
      centreTrue,
      spreadTrue,
      {
        text: `${wider} contains more ${spec.noun} than ${narrower}, because its box is longer.`,
        correct: false,
        why: `Box length is the IQR — how spread out the middle half is — and carries no information about how many ${spec.noun} are in the group. The counts are ${fmtInt(d.a.length)} and ${fmtInt(d.b.length)}, and they are printed in the labels, which is the only place a boxplot ever puts them.`,
      },
      {
        text: `Every one of the ${spec.noun} in ${higher} has a greater ${spec.variable} than every one in ${lower}.`,
        correct: false,
        why: `The boxes overlap: ${lower} reaches ${fmt(higher === spec.groupA ? fB.max : fA.max, dg)} ${spec.units} and ${higher} starts at ${fmt(higher === spec.groupA ? fA.min : fB.min, dg)}. A difference in medians is a statement about the groups, never about every individual in them.`,
      },
      {
        text: `${bigger} must be the more variable group, since it has more ${spec.noun} in it.`,
        correct: false,
        why: 'A larger group is not a more variable one. Variability is read off the box and the whiskers; the group size is read off the label.',
      },
    ]
    const picked = [centreTrue, spreadTrue, ...rng.shuffle(cands.slice(2)).slice(0, 2)]
    const { options, correct, feedback } = shuffleChoice(rng, picked)
    return {
      prompt: `${spec.frame(d.a.length, d.b.length, d.corridor, d.years)}\n\nRead the parallel boxplots below. Which statement about **${variant === 'centre' ? 'the centres' : 'the variability'}** do they support?`,
      answer: {
        type: 'display',
        display: {
          kind: 'boxplot',
          groups: [
            { name: `${spec.groupA} (n = ${d.a.length})`, values: d.a },
            { name: `${spec.groupB} (n = ${d.b.length})`, values: d.b },
          ],
          label: `${spec.variable} (${spec.units})`,
        },
        question: { type: 'choice', options, correct, feedback },
      },
      hints: [
        'Everything a boxplot knows is five numbers per group plus the outliers. Any statement that needs a count, or needs to know about an individual, is not one of them.',
        variant === 'centre' ? 'Find the two median lines and read them against the axis.' : 'The length of each box is its IQR. Read both, then say which is wider and by how much.',
      ],
      solution: `${spec.groupA}: median ${fmt(fA.median, dg)} ${spec.units}, Q1 ${fmt(fA.q1, dg)}, Q3 ${fmt(fA.q3, dg)}, IQR ${fmt(iA, dg)}, n ${fmtInt(d.a.length)}. ${spec.groupB}: median ${fmt(fB.median, dg)}, Q1 ${fmt(fB.q1, dg)}, Q3 ${fmt(fB.q3, dg)}, IQR ${fmt(iB, dg)}, n ${fmtInt(d.b.length)}.\n\n**${options[correct]}**\n\nA boxplot carries centre, spread and unusual values. It does not carry the group size — that belongs in the label — and it never speaks about an individual.`,
      misconception: 'Reading the longer box as the bigger group. Box length is the interquartile range; the number of individuals appears nowhere on a boxplot.',
    }
  },
})
