/**
 * act-8-03 · Loss by Beneficiary — drills. AP 8.4, 8.5: setting a two-way table up before anything
 * is computed from it.
 *
 *   act-8/expected-count-cell        numeric  row total × column total ÷ n, for a named cell
 *   act-8/homogeneity-or-independence choice  which test, from the collection rule alone
 *   act-8/two-way-df                 choice   (r − 1)(c − 1), against the rc − 1 distractor
 *   act-8/two-way-conditions         choice   the condition that decides whether χ² may be run
 *   act-8/two-way-hypotheses         interp   H₀ and Hₐ for the correct test, in context
 *   act-8/expected-table-margins     numeric  the last expected count, by either of two routes
 *
 * Every framing is another office's file: a dock audit, a cutter's patrol log, a Bureau
 * re-inspection, an Authority advisory sweep. None of them is the Lane's own beneficiary table or
 * the Mars–Belt corridor, which are act-8-03's mission beat.
 *
 * Every number is computed from `@/lib/stats` (`expectedCounts`, `chiSquareIndependence`,
 * `chiSquareHomogeneity`), never typed in.
 */
import { defineGenerator, drawTwoWay, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { contextGroup } from '@/lib/problems/rubric'
import type { RubricGroup } from '@/lib/problems/types'
import type { Rng } from '@/lib/rng'
import { chiSquareHomogeneity, chiSquareIndependence, expectedCounts } from '@/lib/stats'
import { fmt, fmtInt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared helpers for the Act VIII generator files
// ---------------------------------------------------------------------------------------------

export type Candidate = { text: string; correct: boolean; why: string | null }

/** Shuffle a candidate list and return the `choice` answer fields with feedback kept aligned. */
export function shuffleChoice(rng: Rng, cands: readonly Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const order = rng.shuffle(cands.map((_, i) => i))
  const picked = order.map((i) => cands[i])
  return {
    options: picked.map((c) => c.text),
    correct: picked.findIndex((c) => c.correct),
    feedback: picked.map((c) => c.why),
  }
}

/**
 * Counts the Act's own tables use, kept off every drill draw so no learner meets a generated file
 * whose totals look like the Ledger, the Register, the corridor or the Bureau manifest.
 */
const RESERVED = new Set([31, 46, 412, 900, 1712, 2612, 4180, 19, 23, 18, 17])

export const reservedCount = (n: number): boolean => RESERVED.has(Math.round(n))

/** Two-way framings. `rows` are what a row of the table is; `cols` are what was recorded. */
export interface TwoWayContext {
  id: string
  office: string
  /** The units one row of the raw file describes, plural. */
  unit: string
  rowVariable: string
  colVariable: string
  rowLabels: readonly string[]
  colLabels: readonly string[]
  /**
   * How the file came to exist. `one-sample` means one draw classified afterwards; `separate` means
   * each row was assembled on its own and its total was fixed before any outcome was recorded.
   */
  design: 'one-sample' | 'separate'
  /** The sentence in the file that settles the design. */
  designLine: string
  population: string
}

export const TWO_WAY_CONTEXTS: readonly TwoWayContext[] = [
  {
    id: 'dock-seal',
    office: 'the Ceres dock audit',
    unit: 'manifests',
    rowVariable: 'gantry crew',
    colVariable: 'seal condition on arrival',
    rowLabels: ['crew A', 'crew B'],
    colLabels: ['seal intact', 'seal broken'],
    design: 'one-sample',
    designLine: 'One random draw of outbound manifests from the quarter, with the loading crew and the seal condition already on each sheet.',
    population: 'outbound manifests from the Ceres deep berths',
  },
  {
    id: 'patrol-advisory',
    office: "the cutter Asgard's patrol log",
    unit: 'boardings',
    rowVariable: 'watch that boarded',
    colVariable: 'advisory written',
    rowLabels: ['forenoon watch', 'first dog watch'],
    colLabels: ['no advisory', 'advisory'],
    design: 'separate',
    designLine: 'Each watch drew its own random list of hulls to board at the start of the patrol, and the two lists were fixed before anybody sailed.',
    population: 'hulls transiting the corridor during the patrol',
  },
  {
    id: 'bureau-reinspection',
    office: 'the Bureau of Hulls re-inspection file',
    unit: 'certifications',
    rowVariable: 'certifying office',
    colVariable: 're-inspection finding',
    rowLabels: ['Uruk High', 'Ceres'],
    colLabels: ['clean', 'queried', 'flagged'],
    design: 'separate',
    designLine: 'A fixed quota of certifications was drawn at random from each office, and the two quotas were set by the Bureau before the first file was opened.',
    population: 'fuel certifications written by the two offices',
  },
  {
    id: 'authority-advisory',
    office: 'the Lane Authority advisory sweep',
    unit: 'transits',
    rowVariable: 'drive class',
    colVariable: 'advisory category',
    rowLabels: ['Tessera-C', 'Adlinda Mk 3'],
    colLabels: ['none', 'late check-in', 'plot amendment'],
    design: 'one-sample',
    designLine: 'One random sample of transits was pulled from the archive; drive class and advisory category were both columns of the archive already.',
    population: 'transits archived by the Authority this decade',
  },
  {
    id: 'yard-refit',
    office: 'the Adlinda yard fault register',
    unit: 'refits',
    rowVariable: 'yard that did the work',
    colVariable: 'warranty outcome',
    rowLabels: ['Adlinda', 'Thebe'],
    colLabels: ['no claim', 'claim within a year'],
    design: 'separate',
    designLine: 'The register holds an independently drawn random sample of refits from each yard, the two sample sizes having been agreed in advance.',
    population: 'drive refits at the two yards',
  },
  {
    id: 'relay-berth',
    office: 'the Uruk High relay office',
    unit: 'departures',
    rowVariable: 'berth deck',
    colVariable: 'departure filed on time',
    rowLabels: ['upper deck', 'lower deck'],
    colLabels: ['on time', 'late'],
    design: 'one-sample',
    designLine: 'One random sample of departures was drawn from the quarter, and the berth deck and the filing time were both already recorded on each.',
    population: 'departures cleared at Uruk High',
  },
]

export interface TableDraw {
  counts: number[][]
  rowTotals: number[]
  colTotals: number[]
  total: number
  expected: number[][]
  /** The smallest expected count, which is the condition the learner checks. */
  minE: number
}

/** A table with every expected count comfortably above five, in one of the contexts above. */
export function drawTable(rng: Rng, ctx: TwoWayContext, opts: { nMin?: number; nMax?: number; minExpected?: number; assocMin?: number; assocMax?: number } = {}): TableDraw {
  const { nMin = 120, nMax = 460, minExpected = 6, assocMin = 0.15, assocMax = 0.55 } = opts
  return retry(
    rng,
    (r) => {
      const n = r.int(nMin, nMax)
      const draw = drawTwoWay(r, { rows: ctx.rowLabels as string[], cols: ctx.colLabels as string[], n, association: r.uniform(assocMin, assocMax), minCell: 5 })
      const E = expectedCounts(draw.counts)
      return { counts: draw.counts, rowTotals: draw.rowTotals, colTotals: draw.colTotals, total: n, expected: E, minE: Math.min(...E.flat()) }
    },
    (d) => d.minE >= minExpected && !reservedCount(d.total) && d.rowTotals.every((t) => !reservedCount(t) && t >= 25) && d.colTotals.every((t) => t >= 15),
  )
}

/**
 * A 2×2 whose expected counts fail: one small group and one rare outcome, which is the shape the
 * condition is there to catch. Only used where the failed condition is the lesson.
 */
export function drawFailingTable(rng: Rng): TableDraw {
  return retry(
    rng,
    (r) => {
      const small = r.int(6, 15)
      const big = r.int(180, 380)
      const rare = r.int(2, 5)
      const bigRare = r.int(3, 18)
      const counts = [
        [small - rare, rare],
        [big - bigRare, bigRare],
      ]
      const expected = expectedCounts(counts)
      return {
        counts,
        rowTotals: [small, big],
        colTotals: [counts[0][0] + counts[1][0], counts[0][1] + counts[1][1]],
        total: small + big,
        expected,
        minE: Math.min(...expected.flat()),
      }
    },
    (d) => d.minE > 0.2 && d.minE < 4.5 && d.counts.every((row) => row.every((v) => v >= 0)) && !reservedCount(d.total),
  )
}

const designName = (d: TwoWayContext['design']) => (d === 'one-sample' ? 'independence' : 'homogeneity')

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the expected count for a named cell
// ---------------------------------------------------------------------------------------------

export const expectedCountCell = defineGenerator({
  id: 'act-8/expected-count-cell',
  label: 'Expected count for one cell of a two-way table',
  ap_topics: ['8.4'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_WAY_CONTEXTS)
    const d = drawTable(rng, ctx)
    const i = rng.int(0, ctx.rowLabels.length - 1)
    const j = rng.int(0, ctx.colLabels.length - 1)
    const e = d.expected[i][j]

    return {
      prompt: `${ctx.office} holds ${fmtInt(d.total)} ${ctx.unit}, cross-tabulated by ${ctx.rowVariable} and ${ctx.colVariable}.\n\n${tableMd(
        ['', ...ctx.colLabels, 'total'],
        [...ctx.rowLabels.map((rl, r) => [rl, ...d.counts[r], d.rowTotals[r]]), ['total', ...d.colTotals, d.total]],
      )}\n\nUnder the null hypothesis, what count is **expected** in the **${ctx.rowLabels[i]} · ${ctx.colLabels[j]}** cell? Give it to **two decimal places**.`,
      answer: numericAnswer(e, 'other', { digits: 2 }),
      hints: [
        'An expected count is what the two margins alone would have produced, with no relationship between the row variable and the column variable. Nothing inside the table enters it.',
        `The row total for ${ctx.rowLabels[i]} is ${fmtInt(d.rowTotals[i])} and the column total for ${ctx.colLabels[j]} is ${fmtInt(d.colTotals[j])}, out of ${fmtInt(d.total)}.`,
        `Multiply the two totals and divide by ${fmtInt(d.total)}. Do not round until the last step.`,
      ],
      solution: `$$E_{ij} = \\frac{\\text{row total} \\times \\text{column total}}{n} = \\frac{${fmtInt(d.rowTotals[i])} \\times ${fmtInt(d.colTotals[j])}}{${fmtInt(d.total)}} = \\mathbf{${fmt(e, 2)}}$$\n\nRead it the other way round and the same number falls out: ${fmtInt(d.colTotals[j])} of the ${fmtInt(d.total)} ${ctx.unit} are ${ctx.colLabels[j]}, a share of ${fmt(d.colTotals[j] / d.total, 4)}, and applying that share to the ${fmtInt(d.rowTotals[i])} ${ctx.unit} in the ${ctx.rowLabels[i]} row gives ${fmt(e, 2)}.\n\nExpected counts are not rounded to whole ${ctx.unit}. The formula is an average over many repetitions of the same margins, and rounding it to an integer before squaring the difference moves the statistic.`,
      misconception: 'Dividing the row total by the number of columns. That spreads the row evenly and ignores the column margin, which is where the claimed distribution comes from.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — homogeneity or independence, from the collection rule
// ---------------------------------------------------------------------------------------------

export const homogeneityOrIndependence = defineGenerator({
  id: 'act-8/homogeneity-or-independence',
  label: 'Homogeneity or independence, from the design',
  ap_topics: ['8.5'],
  skills: ['1'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_WAY_CONTEXTS)
    const d = drawTable(rng, ctx)
    const one = ctx.design === 'one-sample'

    const cands: Candidate[] = [
      {
        text: one
          ? `A **χ² test of independence**, because one sample of ${fmtInt(d.total)} ${ctx.unit} was drawn and then classified by two variables that were already recorded on it.`
          : `A **χ² test of homogeneity**, because ${fmtInt(ctx.rowLabels.length)} groups were drawn separately, their sizes were fixed before any ${ctx.colVariable} was recorded, and one variable was measured in each.`,
        correct: true,
        why: null,
      },
      {
        text: one
          ? `A **χ² test of homogeneity**, because the table has ${fmtInt(ctx.rowLabels.length)} rows and each row is a group to be compared with the other.`
          : `A **χ² test of independence**, because both the ${ctx.rowVariable} and the ${ctx.colVariable} appear as columns of the finished file.`,
        correct: false,
        why: one
          ? `Sorting one sample by one of its own columns afterwards does not make two samples. Nobody decided in advance how many of the ${fmtInt(d.total)} ${ctx.unit} would be ${ctx.rowLabels[0]}: that count is itself a result, and the hypotheses have to be about the whole population the one sample came from.`
          : `Both variables do end up as columns of the finished file, and that is a fact about the spreadsheet rather than about the design. The ${fmtInt(ctx.rowLabels.length)} row totals here were set by the office before any ${ctx.unit.replace(/s$/, '')} was looked at, so they are not random and the hypotheses cannot be about a joint distribution.`,
      },
      {
        text: `A **χ² goodness-of-fit test**, one for each row, comparing that row's ${ctx.colVariable} against the column margin of the table.`,
        correct: false,
        why: `Goodness of fit reads one categorical variable against a distribution claimed **before** the data existed. The column margin is computed from the very table being tested, so it is not an outside claim, and running the rows separately throws away the comparison the question is about.`,
      },
      {
        text: `Two **two-proportion z-tests**, one for each pair of ${ctx.colVariable} categories, reported together.`,
        correct: false,
        why: `A two-proportion z-test compares one proportion across two groups. With ${fmtInt(ctx.colLabels.length)} categories in the column variable and ${fmtInt(ctx.rowLabels.length)} in the row variable, a pile of pairwise tests answers several small questions at several separate error rates and never answers the one that was asked.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} has ${fmtInt(d.total)} ${ctx.unit} in front of it, laid out by ${ctx.rowVariable} and ${ctx.colVariable}.\n\n> ${ctx.designLine}\n\n${tableMd(
        ['', ...ctx.colLabels, 'total'],
        [...ctx.rowLabels.map((rl, r) => [rl, ...d.counts[r], d.rowTotals[r]]), ['total', ...d.colTotals, d.total]],
      )}\n\nWhich procedure does this design call for?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'The arithmetic is identical either way, so the table cannot tell you. Read the sentence about how the file was assembled.',
        'Ask which totals were decided by a person before any outcome was recorded. Fixed row totals mean several samples; a single total with everything else falling out of it means one.',
      ],
      solution: `**${designName(ctx.design) === 'independence' ? 'A χ² test of independence' : 'A χ² test of homogeneity'}.**\n\n${ctx.designLine}\n\n| | independence | homogeneity |\n| --- | --- | --- |\n| how many samples | one | two or more, drawn separately |\n| what was fixed in advance | the grand total, ${fmtInt(d.total)} | each row total |\n| H₀ says | the two variables are independent in the population | the distribution of ${ctx.colVariable} is the same in every group |\n| the arithmetic | Σ(O − E)²/E on (r − 1)(c − 1) df | the same, on the same df |\n\nHere the ${one ? `grand total of ${fmtInt(d.total)} is what the office fixed, and both the ${ctx.rowVariable} and the ${ctx.colVariable} were already on every sheet` : `${fmtInt(ctx.rowLabels.length)} row totals were fixed by the office and only the ${ctx.colVariable} was left to vary`}. So the test is **${designName(ctx.design)}**, and the hypotheses are written about ${one ? `${ctx.population} as one population` : `the ${fmtInt(ctx.rowLabels.length)} populations the groups were drawn from`}.\n\nThe statistic, the degrees of freedom and the P-value would be identical under the other name. What changes is the sentence at the top and the sentence at the bottom, and those are the parts a reader acts on.`,
      misconception: 'Counting rows. Two rows on a screen are two samples only when somebody fixed the two row totals before the outcome was recorded. Otherwise they are one sample sorted by a column.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — degrees of freedom, with the rc − 1 distractor
// ---------------------------------------------------------------------------------------------

export const twoWayDf = defineGenerator({
  id: 'act-8/two-way-df',
  label: 'Degrees of freedom for an r × c table',
  ap_topics: ['8.4', '8.5'],
  skills: ['3'],
  generate(rng) {
    const r = rng.int(2, 4)
    const c = retry(
      rng,
      (g) => g.int(2, 4),
      (v) => {
        const df = (r - 1) * (v - 1)
        return df !== r * v - 1 && df !== r * v && df !== r + v - 2
      },
    )
    const rowNames = ['claims office', 'gantry crew', 'berth deck', 'certifying office'][rng.int(0, 3)]
    const colNames = ['finding', 'advisory category', 'seal condition', 're-inspection outcome'][rng.int(0, 3)]
    const df = (r - 1) * (c - 1)

    const cands: Candidate[] = [
      { text: `$df = ${fmtInt(df)}$`, correct: true, why: null },
      {
        text: `$df = ${fmtInt(r * c - 1)}$`,
        correct: false,
        why: `That is $rc - 1$, the goodness-of-fit rule: one fewer than the number of **categories**. A two-way table's cells are not free categories. Once the ${fmtInt(r)} row totals and the ${fmtInt(c)} column totals are fixed, filling in $(${fmtInt(r)} - 1)(${fmtInt(c)} - 1) = ${fmtInt(df)}$ cells determines every remaining cell by subtraction.`,
      },
      {
        text: `$df = ${fmtInt(r * c)}$`,
        correct: false,
        why: `That is the number of cells. Degrees of freedom count how many cells are free to vary once the margins are in place, and the margins are estimated from the same data.`,
      },
      {
        text: `$df = ${fmtInt(r + c - 2)}$`,
        correct: false,
        why: `Adding where the rule multiplies. $(r-1)$ and $(c-1)$ are the free rows and the free columns, and a free cell needs one of each, so the count of free cells is their product.`,
      },
    ]
    const unique = cands.filter((x, i) => cands.findIndex((y) => y.text === x.text) === i)
    const { options, correct, feedback } = shuffleChoice(rng, unique)

    return {
      prompt: `A two-way table cross-tabulates **${rowNames}** (${fmtInt(r)} categories) against **${colNames}** (${fmtInt(c)} categories). A χ² test is run on it.\n\nHow many degrees of freedom does the test carry?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Degrees of freedom count the cells you could fill in freely before the rest of the table is forced. Both margins are already fixed.',
        `Fill the top-left corner of a ${fmtInt(r)} × ${fmtInt(c)} table cell by cell and stop at the first cell whose value is already decided by a row total or a column total.`,
      ],
      solution: `$$df = (r - 1)(c - 1) = (${fmtInt(r)} - 1)(${fmtInt(c)} - 1) = \\mathbf{${fmtInt(df)}}$$\n\nWhy the product: fix the row totals and the column totals. Now fill the table in from the top left. Every cell in the first ${fmtInt(r - 1)} row${r - 1 === 1 ? '' : 's'} and the first ${fmtInt(c - 1)} column${c - 1 === 1 ? '' : 's'} is free. The last column of each row is then forced by that row's total, and the last row is forced by the column totals. ${fmtInt(df)} free cells, and ${fmtInt(r * c - df)} that the margins write for you.\n\nThe df of a two-way test does not depend on $n$. A table of ${fmtInt(r)} × ${fmtInt(c)} has ${fmtInt(df)} degrees of freedom with forty observations in it or forty thousand, and a df on a calculator screen that does not match ${fmtInt(df)} means the matrix was typed in the wrong shape.`,
      misconception: 'Carrying rc − 1 over from goodness of fit. That rule is for one row of categories; a two-way table pays for both margins, and the count of free cells is their product.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — the conditions
// ---------------------------------------------------------------------------------------------

export const twoWayConditions = defineGenerator({
  id: 'act-8/two-way-conditions',
  label: 'The conditions for a two-way χ² test',
  ap_topics: ['8.4', '8.5'],
  skills: ['1', '4'],
  generate(rng) {
    const fails = rng.bool(0.5)
    const ctx = pickContext(
      rng,
      fails ? TWO_WAY_CONTEXTS.filter((x) => x.colLabels.length === 2) : TWO_WAY_CONTEXTS,
    )
    const d: TableDraw = fails ? drawFailingTable(rng) : drawTable(rng, ctx, { minExpected: 6.5 })
    const registerSize = retry(
      rng,
      (r) => d.total * r.int(20, 70),
      (v) => !reservedCount(v),
    )

    const cands: Candidate[] = [
      {
        text: fails
          ? `**The expected-count condition fails.** The smallest expected count is ${fmt(d.minE, 2)}, below five, so the χ² statistic does not follow a χ² distribution closely enough for the P-value to mean anything. Simulate the null instead, or collapse categories until every expected count clears five.`
          : `**All three conditions hold.** The data were drawn at random, $10 \\times ${fmtInt(d.total)} = ${fmtInt(10 * d.total)}$ is inside the ${fmtInt(registerSize)} on the register, and the smallest expected count is ${fmt(d.minE, 2)}, above five.`,
        correct: true,
        why: null,
      },
      {
        text: `**The observed counts are too small.** The smallest cell of the observed table holds ${fmtInt(Math.min(...d.counts.flat()))} ${ctx.unit}, and every cell of a χ² table must hold at least five.`,
        correct: false,
        why: `The five applies to the **expected** counts, not the observed ones. An observed zero is perfectly admissible, and it is often the most informative cell in the table; what the condition protects is the approximation of the statistic's null distribution, and that depends on the counts the margins predict.`,
      },
      {
        text: `**The Normal condition fails.** ${fmtInt(d.total)} ${ctx.unit} is fewer than the thirty per cell the central limit theorem requires before a χ² test may be run.`,
        correct: false,
        why: `There is no Normal condition on a χ² test and no thirty-per-cell rule anywhere in it. The variable is categorical; there is no mean, no standard deviation and no sampling distribution of a mean to be approximately Normal.`,
      },
      {
        text: `**The 10% condition fails.** With ${fmtInt(d.total)} ${ctx.unit} drawn from a register of ${fmtInt(registerSize)}, the sample is too large a share of the population for the observations to be treated as independent.`,
        correct: false,
        why: `$10 \\times ${fmtInt(d.total)} = ${fmtInt(10 * d.total)}$, which is inside ${fmtInt(registerSize)}, so the 10% condition holds. It is the one condition here that is pure arithmetic, and it is worth doing rather than asserting.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} drew ${fmtInt(d.total)} ${ctx.unit} at random from a register of ${fmtInt(registerSize)} and cross-tabulated them.\n\n**Observed**\n\n${tableMd(
        ['', ...ctx.colLabels, 'total'],
        [...ctx.rowLabels.map((rl, r) => [rl, ...d.counts[r], d.rowTotals[r]]), ['total', ...d.colTotals, d.total]],
      )}\n\n**Expected**\n\n${tableMd(['', ...ctx.colLabels], ctx.rowLabels.map((rl, r) => [rl, ...d.expected[r].map((v) => fmt(v, 2))]))}\n\nBefore the statistic is computed: what do the conditions say?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Three conditions, and one of them is about a table you have been given rather than the one you were collecting from.',
        'Random, from how the units were obtained. Independence, as 10n against the register. Large counts, as the smallest number in the expected table.',
      ],
      solution: `**${options[correct]}**\n\n| condition | what settles it | here |\n| --- | --- | --- |\n| Random | the sentence describing how the units were obtained | drawn at random from the register |\n| Independent (10%) | $10n$ against the population size | $10 \\times ${fmtInt(d.total)} = ${fmtInt(10 * d.total)}$ against ${fmtInt(registerSize)} |\n| Large counts | the smallest **expected** count, not the smallest observed | ${fmt(d.minE, 2)} |\n\n${
        fails
          ? `${fmt(d.minE, 2)} is below five, so the reference curve is wrong for this statistic and any P-value printed from it is a number without a meaning. The two honest routes are to simulate the null distribution directly, or to collapse categories that belong together on grounds other than their counts and re-run.`
          : `Every expected count clears five, so the χ² distribution on $(r-1)(c-1)$ degrees of freedom is a close enough approximation and the test may be carried out.`
      }\n\nThe condition is checked on the expected table, which means it can only be checked **after** the expected counts are computed and before the conclusion is written. A calculator will hand you a P-value without ever mentioning it.`,
      misconception: 'Checking the observed counts against five. The condition is about the expected counts: the ones the margins predict, printed to two decimals, none of them below five.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Interpretation — the hypotheses for the correct test, in context
// ---------------------------------------------------------------------------------------------

export const twoWayHypotheses = defineGenerator({
  id: 'act-8/two-way-hypotheses',
  label: 'State the hypotheses for the correct two-way test',
  ap_topics: ['8.4', '8.5'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_WAY_CONTEXTS)
    const d = drawTable(rng, ctx)
    const one = ctx.design === 'one-sample'
    const result = one ? chiSquareIndependence(d.counts, { random: true }) : chiSquareHomogeneity(d.counts, { random: true })

    const required: RubricGroup[] = [
      {
        label: `Names the test (${designName(ctx.design)})`,
        phrasings: one ? ['independence', 'independent', 'associated'] : ['homogeneity', 'same distribution', 'distribution same', 'equal distribution'],
        polarity: 'any',
        feedback: one
          ? `One sample classified two ways, so the test is independence and H₀ says the two variables are independent.`
          : `Separately drawn groups with one variable measured in each, so the test is homogeneity and H₀ says the distributions are the same.`,
      },
      {
        label: 'H₀ is a statement of no relationship (or no difference)',
        phrasings: ['null', 'independent', 'same', 'no association'],
        polarity: 'any',
        feedback: one ? 'H₀: the two variables are independent in the population.' : 'H₀: the distribution of the column variable is the same in every group.',
      },
      {
        label: 'Hₐ is the denial of H₀, with no direction',
        phrasings: ['alternative', 'associated', 'association', 'differ', 'not independent', 'not the same'],
        polarity: 'any',
        feedback: 'Hₐ is simply the denial: there is an association, or the distributions differ. A χ² alternative never names a direction and never names a cell.',
      },
      contextGroup('States both variables and the population in context', [ctx.rowVariable, ctx.colVariable, ctx.population], {
        minMatches: 2,
        feedback: `Say what and whom: ${ctx.rowVariable} and ${ctx.colVariable}, among ${ctx.population}.`,
      }),
      {
        label: 'Written about the population, not the sample',
        phrasings: ['population', 'true', 'all'],
        polarity: 'any',
        feedback: `The hypotheses are about ${ctx.population}. The ${fmtInt(d.total)} ${ctx.unit} in the file are the evidence, not the subject.`,
      },
    ]

    const exemplar = one
      ? `The null hypothesis is that in the population of ${ctx.population}, ${ctx.rowVariable} and ${ctx.colVariable} are independent. The alternative hypothesis is that in that population the two variables are associated. The ${fmtInt(d.total)} ${ctx.unit} are one random sample classified by both variables, so this is a chi-square test of independence, and the alternative names no direction.`
      : `The null hypothesis is that the true distribution of ${ctx.colVariable} is the same for every ${ctx.rowVariable} in the population of ${ctx.population}. The alternative hypothesis is that those distributions are not all the same. The groups were drawn separately with their totals fixed in advance, so this is a chi-square test of homogeneity, and the alternative names no direction and no cell.`

    return {
      prompt: `${ctx.office} holds ${fmtInt(d.total)} ${ctx.unit}, laid out by ${ctx.rowVariable} and ${ctx.colVariable}.\n\n> ${ctx.designLine}\n\n${tableMd(
        ['', ...ctx.colLabels, 'total'],
        [...ctx.rowLabels.map((rl, r) => [rl, ...d.counts[r], d.rowTotals[r]]), ['total', ...d.colTotals, d.total]],
      )}\n\nWrite **H₀ and Hₐ** for the correct test, in context. Name the test, and say what population the hypotheses are about.`,
      answer: { type: 'interpretation', required, exemplar, minWords: 20 },
      hints: [
        'Decide the test first, from the collection rule. The hypotheses of the two tests are different sentences about different things, even though the arithmetic under them is the same.',
        one
          ? 'One sample, two variables: H₀ says the two variables are independent in the population the sample came from.'
          : 'Separate samples, one variable: H₀ says the distribution of that variable is identical across the groups.',
        'The alternative is the plain denial of the null. No direction, no cell, no "more than".',
      ],
      solution: `**${exemplar}**\n\nThe hypotheses carry the design, which is the part the arithmetic cannot. ${result.hypotheses ? `The library states them as: H₀, ${result.hypotheses.null}; Hₐ, ${result.hypotheses.alt}.` : ''} Written in context they have to name the variables and the population as well.\n\nTwo errors that cost marks every year. **A directional alternative.** χ² measures departure from the expected counts in every direction at once, so "Hₐ: crews with more traffic break more seals" is not an alternative this test can carry. **A named cell.** The test asks whether the table as a whole departs from what the margins predict; which cell did the damage is read off the contributions afterwards, in the conclusion, and never written into Hₐ.`,
      misconception: 'Writing a one-sided alternative, or naming the cell you expect to be large. The χ² alternative is always the flat denial of the null; the direction and the driving cell belong in the conclusion.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Numeric — the last expected count, by either route
// ---------------------------------------------------------------------------------------------

export const expectedTableMargins = defineGenerator({
  id: 'act-8/expected-table-margins',
  label: 'Finish an expected table without breaking the margins',
  ap_topics: ['8.4'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(
      rng,
      TWO_WAY_CONTEXTS.filter((c) => c.colLabels.length === 3),
    )
    const d = drawTable(rng, ctx)
    const i = rng.int(0, ctx.rowLabels.length - 1)
    const j = rng.int(0, ctx.colLabels.length - 1)
    const e = d.expected[i][j]
    const shownRow = d.expected[i].map((v, k) => (k === j ? null : v))
    const others = shownRow.filter((v): v is number => v !== null)

    return {
      prompt: `${ctx.office} has cross-tabulated ${fmtInt(d.total)} ${ctx.unit} by ${ctx.rowVariable} and ${ctx.colVariable}, and a clerk has started the expected table and stopped.\n\n${tableMd(
        ['', ...ctx.colLabels, 'row total'],
        [
          ...ctx.rowLabels.map((rl, r) =>
            r === i ? [rl, ...shownRow.map((v) => (v === null ? '?' : fmt(v, 2))), fmtInt(d.rowTotals[r])] : [rl, ...d.expected[r].map((v) => fmt(v, 2)), fmtInt(d.rowTotals[r])],
          ),
          ['column total', ...d.colTotals.map((v) => fmtInt(v)), fmtInt(d.total)],
        ],
      )}\n\nWhat belongs in the cell marked **?** — the expected count for **${ctx.rowLabels[i]} · ${ctx.colLabels[j]}**? Give it to **two decimal places**.`,
      answer: numericAnswer(e, 'other', { digits: 2 }),
      hints: [
        'There are two ways in, and they must agree. One uses the two margins that cell sits at; the other uses the fact that an expected table has exactly the same margins as the observed one.',
        `The ${ctx.rowLabels[i]} row of the expected table has to total ${fmtInt(d.rowTotals[i])}, the same as the observed row.`,
        `Either $(${fmtInt(d.rowTotals[i])} \\times ${fmtInt(d.colTotals[j])}) / ${fmtInt(d.total)}$, or ${fmtInt(d.rowTotals[i])} less the ${fmtInt(others.length)} expected counts already printed in that row.`,
      ],
      solution: `**Route one, the formula.**\n\n$$E = \\frac{${fmtInt(d.rowTotals[i])} \\times ${fmtInt(d.colTotals[j])}}{${fmtInt(d.total)}} = \\mathbf{${fmt(e, 2)}}$$\n\n**Route two, the margin.** The expected table has the same row totals as the observed table, so the ${ctx.rowLabels[i]} row must come to ${fmtInt(d.rowTotals[i])}. The printed cells in that row are ${others.map((v) => fmt(v, 2)).join(' and ')}, which total ${fmt(
        others.reduce((a, b) => a + b, 0),
        2,
      )}. Subtract: ${fmtInt(d.rowTotals[i])} − ${fmt(
        others.reduce((a, b) => a + b, 0),
        2,
      )} = ${fmt(e, 2)}.\n\nThe two routes agreeing is not a coincidence and it is the best check there is. $\\sum_j E_{ij} = \\sum_j \\frac{R_i C_j}{n} = \\frac{R_i}{n}\\sum_j C_j = R_i$, and the same argument down the columns. A set of expected counts whose margins do not reproduce the observed margins has an arithmetic error in it, wherever the statistic afterwards happens to land.`,
      misconception: 'Rounding each expected count to a whole unit as you go. Small roundings break the margins, and the broken margin is the first thing that tells you the table is wrong.',
    }
  },
})
