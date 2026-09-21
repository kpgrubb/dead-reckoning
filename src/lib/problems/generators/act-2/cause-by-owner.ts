/**
 * act-2-01 · Cause by Owner — drills. AP 2.1–2.3: two-way tables; joint, marginal and conditional
 * relative frequencies; segmented bars; "appear associated" as a description, not an inference.
 *
 *   act-2/conditional-from-table      numeric         a conditional relative frequency, either direction
 *   act-2/joint-marginal-conditional  numeric         the prompt names which kind of relative frequency
 *   act-2/which-conditional           choice          which fraction answers the question as asked
 *   act-2/association-in-context      interpretation  describe the association from the row percentages
 *
 * Every table is drawn (never the Register's own owner × classification table, whose conditional
 * shares are act-2-01's mission beats) and every number comes from `twoWay` in @/lib/stats.
 */
import { defineGenerator, drawTwoWay, numericAnswer, pickContext, retry, tableMd, tableSpec, type TwoWayDraw } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { InterpretationAnswer } from '@/lib/problems/types'
import type { Rng } from '@/lib/rng'
import { twoWay } from '@/lib/stats'
import { fmt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// In-world tables — other files, other offices, never the Register's owner × classification
// ---------------------------------------------------------------------------------------------

interface Ctx {
  /** One sentence of framing; the drawn total is interpolated for `{n}`. */
  frame: string
  rowVar: string
  rows: string[]
  colVar: string
  cols: string[]
  /** Plural noun for the individuals in the table. */
  unit: string
}

const TABLES: Ctx[] = [
  {
    frame: 'The Bureau of Hulls audits one quarter of its own departure certifications at Uruk High — {n} of them, by the examiner who signed and what the audit found.',
    rowVar: 'examiner',
    rows: ['Voss', 'Amari', 'Penrose'],
    colVar: 'audit finding',
    cols: ['cleared', 'queried', 'held'],
    unit: 'certifications',
  },
  {
    frame: 'The Lane Authority tabulates {n} transits of the Saturn feeder run by drive model and by the state of the transponder at Mark 6.',
    rowVar: 'drive model',
    rows: ['Mk 3', 'Tessera-C', 'other'],
    colVar: 'transponder state',
    cols: ['clean', 'intermittent', 'dropout'],
    unit: 'transits',
  },
  {
    frame: 'Adlinda Yards logs {n} refits by hull class and whether the dock released the hull on schedule.',
    rowVar: 'hull class',
    rows: ['Sulcus', 'Tessera', 'light hauler'],
    colVar: 'release',
    cols: ['on schedule', 'late'],
    unit: 'refits',
  },
  {
    frame: "The Ceres receiving office weighs {n} arrivals and files each one by cargo class and by whether the manifest matched the scale.",
    rowVar: 'cargo class',
    rows: ['He-3/D', 'volatiles', 'metals'],
    colVar: 'manifest check',
    cols: ['matched', 'reweighed'],
    unit: 'arrivals',
  },
  {
    frame: 'One watch of the Eyes on the Callisto–Ganymede local lane logs {n} contacts by contact type and by plume band against the class table.',
    rowVar: 'contact type',
    rows: ['freighter', 'tender', 'patrol'],
    colVar: 'plume band',
    cols: ['nominal', 'hot'],
    unit: 'contacts',
  },
]

/** P(unknown | Perrine) = 1 and P(Perrine | unknown) ≈ 0.864 are act-2-01's mission beats. */
const RESERVED = [1, 22 / 31, 19 / 22]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.002)
}

function columns(ctx: Ctx): string[] {
  return [ctx.rowVar, ...ctx.cols, 'total']
}

function countRows(ctx: Ctx, t: TwoWayDraw): (string | number)[][] {
  return [...ctx.rows.map((r, i) => [r, ...t.counts[i], t.rowTotals[i]] as (string | number)[]), ['Total', ...t.colTotals, t.total]]
}

interface DrawOpts {
  /** Minimum count in every cell (default 2). */
  minCell?: number
  /** Table total, as a multiple of the number of cells (default 8–16 per cell). */
  perCell?: [number, number]
  /** Association strength band (default 0.30–0.65). */
  assoc?: [number, number]
}

function drawTable(r: Rng, ctx: Ctx, opts: DrawOpts = {}): TwoWayDraw {
  const cells = ctx.rows.length * ctx.cols.length
  const [lo, hi] = opts.perCell ?? [8, 16]
  const [a, b] = opts.assoc ?? [0.3, 0.65]
  return drawTwoWay(r, { rows: ctx.rows, cols: ctx.cols, n: cells * r.int(lo, hi), association: r.uniform(a, b), minCell: opts.minCell ?? 2 })
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — a conditional relative frequency, either direction
// ---------------------------------------------------------------------------------------------

export const conditionalFromTable = defineGenerator({
  id: 'act-2/conditional-from-table',
  label: 'Conditional relative frequency',
  ap_topics: ['2.1', '2.2'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const givenRow = rng.bool()
    const draw = retry(
      rng,
      (r) => {
        const t = drawTable(r, ctx)
        return { t, i: r.int(0, ctx.rows.length - 1), j: r.int(0, ctx.cols.length - 1) }
      },
      ({ t, i, j }) => {
        const c = t.counts[i][j]
        if (c === 0) return false
        const denom = givenRow ? t.rowTotals[i] : t.colTotals[j]
        if (denom < 8) return false
        const p = c / denom
        return p > 0.05 && p < 0.95 && !reserved(p)
      },
    )
    const { t, i, j } = draw
    const tw = twoWay(t.counts, { rows: ctx.rows, cols: ctx.cols })
    const c = tw.table[i][j]
    const denom = givenRow ? tw.rowTotals[i] : tw.colTotals[j]
    const p = givenRow ? tw.rowConditional[i][j] : tw.colConditional[j][i]
    const group = givenRow ? `${ctx.rowVar} **${ctx.rows[i]}**` : `${ctx.colVar} **${ctx.cols[j]}**`
    const asked = givenRow ? `**${ctx.cols[j]}**` : `${ctx.rowVar} **${ctx.rows[i]}**`
    const denomText = givenRow ? `the ${ctx.rows[i]} row total, ${denom}` : `the ${ctx.cols[j]} column total, ${denom}`
    const tex = givenRow ? `P(\\text{${ctx.cols[j]}} \\mid \\text{${ctx.rows[i]}})` : `P(\\text{${ctx.rows[i]}} \\mid \\text{${ctx.cols[j]}})`
    return {
      prompt: `${ctx.frame.replace('{n}', String(tw.total))}\n\n${tableMd(columns(ctx), countRows(ctx, t))}\n\nAmong the ${ctx.unit} with ${group}, what proportion are ${asked}? Report a proportion to three decimal places.`,
      data: tableSpec(columns(ctx), countRows(ctx, t)),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'A conditional relative frequency divides by the total of the group you are conditioning on — the group named after the word *among*, not the whole table.',
        `The cell where ${ctx.rows[i]} meets ${ctx.cols[j]} holds ${c}. The denominator is ${denomText}.`,
        `$${c} / ${denom}$, to three decimals.`,
      ],
      solution: `$$${tex} = \\frac{${c}}{${denom}} = ${fmt(p, 4)}$$\n\nThe conditional relative frequency is **${fmt(p, 3)}**. The denominator is ${denomText}, because the question restricts attention to that group before it asks anything else.`,
      misconception: `Dividing by the grand total (${tw.total}) answers a different question — the share of *all* ${tw.total} ${ctx.unit} that are both ${ctx.rows[i]} and ${ctx.cols[j]}. That is a joint relative frequency, and it cannot be compared across groups of different size.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — joint, marginal or conditional (the prompt names which)
// ---------------------------------------------------------------------------------------------

type Kind = 'joint' | 'marginalRow' | 'marginalCol' | 'conditional'

export const jointMarginalConditional = defineGenerator({
  id: 'act-2/joint-marginal-conditional',
  label: 'Joint, marginal or conditional',
  ap_topics: ['2.1', '2.2'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const kind = pickContext<Kind>(rng, ['joint', 'marginalRow', 'marginalCol', 'conditional'])
    const draw = retry(
      rng,
      (r) => {
        const t = drawTable(r, ctx)
        return { t, i: r.int(0, ctx.rows.length - 1), j: r.int(0, ctx.cols.length - 1) }
      },
      ({ t, i, j }) => {
        const p =
          kind === 'joint' ? t.counts[i][j] / t.total : kind === 'marginalRow' ? t.rowTotals[i] / t.total : kind === 'marginalCol' ? t.colTotals[j] / t.total : t.counts[i][j] / t.rowTotals[i]
        return t.counts[i][j] > 0 && t.rowTotals[i] >= 8 && p > 0.05 && p < 0.95 && !reserved(p)
      },
    )
    const { t, i, j } = draw
    const tw = twoWay(t.counts, { rows: ctx.rows, cols: ctx.cols })
    const c = tw.table[i][j]
    const count = kind === 'joint' || kind === 'conditional' ? c : kind === 'marginalRow' ? tw.rowTotals[i] : tw.colTotals[j]
    const denom = kind === 'conditional' ? tw.rowTotals[i] : tw.total
    const p = count / denom
    const ask =
      kind === 'joint'
        ? `the **joint** relative frequency of ${ctx.unit} that are *both* ${ctx.rows[i]} *and* ${ctx.cols[j]}`
        : kind === 'marginalRow'
          ? `the **marginal** relative frequency of ${ctx.rowVar} ${ctx.rows[i]}`
          : kind === 'marginalCol'
            ? `the **marginal** relative frequency of ${ctx.colVar} ${ctx.cols[j]}`
            : `the **conditional** relative frequency of ${ctx.cols[j]} *given* ${ctx.rowVar} ${ctx.rows[i]}`
    const denomText = kind === 'conditional' ? `the ${ctx.rows[i]} row total, ${denom}` : `the grand total, ${denom}`
    const tex =
      kind === 'joint'
        ? `P(\\text{${ctx.rows[i]}} \\cap \\text{${ctx.cols[j]}})`
        : kind === 'marginalRow'
          ? `P(\\text{${ctx.rows[i]}})`
          : kind === 'marginalCol'
            ? `P(\\text{${ctx.cols[j]}})`
            : `P(\\text{${ctx.cols[j]}} \\mid \\text{${ctx.rows[i]}})`
    return {
      prompt: `${ctx.frame.replace('{n}', String(tw.total))}\n\n${tableMd(columns(ctx), countRows(ctx, t))}\n\nReport ${ask}, as a proportion to three decimal places.`,
      data: tableSpec(columns(ctx), countRows(ctx, t)),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'Three relative frequencies live in the same table and differ only in their denominator: a joint one divides a cell by the grand total, a marginal one divides a row or column total by the grand total, a conditional one divides a cell by one group’s total.',
        `Numerator: ${count}. Denominator: ${denomText}.`,
        `$${count} / ${denom}$, to three decimals.`,
      ],
      solution: `$$${tex} = \\frac{${count}}{${denom}} = ${fmt(p, 4)}$$\n\nThe ${kind === 'conditional' ? 'conditional' : kind === 'joint' ? 'joint' : 'marginal'} relative frequency is **${fmt(p, 3)}**, over ${denomText}.`,
      misconception:
        kind === 'conditional'
          ? `A conditional relative frequency never uses the grand total. Dividing ${count} by ${tw.total} would report the joint share instead.`
          : `Joint and marginal relative frequencies are both out of the grand total (${tw.total}); only a conditional one restricts the denominator to a single row or column.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which fraction answers the question as asked
// ---------------------------------------------------------------------------------------------

export const whichConditional = defineGenerator({
  id: 'act-2/which-conditional',
  label: 'Which conditional does the question ask for?',
  ap_topics: ['2.2'],
  skills: ['1'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const givenRow = rng.bool()
    const draw = retry(
      rng,
      (r) => {
        const t = drawTable(r, ctx, { perCell: [10, 18] })
        return { t, i: r.int(0, ctx.rows.length - 1), j: r.int(0, ctx.cols.length - 1) }
      },
      ({ t, i, j }) => {
        const c = t.counts[i][j]
        const cands = [`${c} / ${t.rowTotals[i]}`, `${c} / ${t.colTotals[j]}`, `${c} / ${t.total}`, `${givenRow ? t.rowTotals[i] : t.colTotals[j]} / ${t.total}`]
        return c >= 3 && t.rowTotals[i] >= 8 && t.colTotals[j] >= 8 && new Set(cands).size === 4
      },
    )
    const { t, i, j } = draw
    const tw = twoWay(t.counts, { rows: ctx.rows, cols: ctx.cols })
    const c = tw.table[i][j]
    const rt = tw.rowTotals[i]
    const ct = tw.colTotals[j]
    const n = tw.total
    const question = givenRow
      ? `Of the ${ctx.unit} with ${ctx.rowVar} **${ctx.rows[i]}**, what share are **${ctx.cols[j]}**?`
      : `Of the ${ctx.unit} that are **${ctx.cols[j]}**, what share have ${ctx.rowVar} **${ctx.rows[i]}**?`
    const cands = [
      { text: `${c} / ${rt}`, correct: givenRow, why: givenRow ? null : `This conditions on ${ctx.rows[i]} — it answers “of the ${ctx.rows[i]} ${ctx.unit}, what share are ${ctx.cols[j]}?”, which is the question turned around.` },
      { text: `${c} / ${ct}`, correct: !givenRow, why: !givenRow ? null : `This conditions on ${ctx.cols[j]} — it answers “of the ${ctx.cols[j]} ${ctx.unit}, what share are ${ctx.rows[i]}?”, which is the question turned around.` },
      { text: `${c} / ${n}`, correct: false, why: `The grand total gives the joint share: of *all* ${n} ${ctx.unit}, the fraction that are both ${ctx.rows[i]} and ${ctx.cols[j]}. The question restricts to one group first.` },
      {
        text: `${givenRow ? rt : ct} / ${n}`,
        correct: false,
        why: `That is the marginal share of ${givenRow ? `${ctx.rowVar} ${ctx.rows[i]}` : `${ctx.colVar} ${ctx.cols[j]}`} among all ${n} ${ctx.unit}. It never looks at the other variable.`,
      },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${ctx.frame.replace('{n}', String(n))}\n\n${tableMd(columns(ctx), countRows(ctx, t))}\n\n${question}\n\nWhich fraction answers **that** question?`,
      data: tableSpec(columns(ctx), countRows(ctx, t)),
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Read the word *of* — whatever follows it is the group you are conditioning on, and its total is the denominator.',
        `Here the group is ${givenRow ? `${ctx.rowVar} ${ctx.rows[i]}` : `${ctx.colVar} ${ctx.cols[j]}`}, whose total is ${givenRow ? rt : ct}. The numerator is the cell where the two categories meet: ${c}.`,
      ],
      solution: `The question restricts to ${givenRow ? `${ctx.rowVar} ${ctx.rows[i]}` : `${ctx.colVar} ${ctx.cols[j]}`}, so the denominator is that group’s total, ${givenRow ? rt : ct}, and the numerator is the cell they share, ${c}. The answer is **${c} / ${givenRow ? rt : ct}** $= ${fmt(c / (givenRow ? rt : ct), 3)}$. The other three fractions are real numbers about this table — they answer different questions.`,
      misconception: 'P(A | B) and P(B | A) use the same cell and different denominators. Conditioning on the wrong variable is the commonest way to get a true number that answers nothing that was asked.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — describe the association from the row percentages
// ---------------------------------------------------------------------------------------------

interface AssocArgs {
  pctHigh: number
  pctLow: number
  rowHigh: string
  rowLow: string
  col: string
  rowVar: string
  colVar: string
  unit: string
}

/** Two conditional percentages cited, a "they differ" statement, association language, context; never cause or proof. */
function associationRubric({ pctHigh, pctLow, rowHigh, rowLow, col, rowVar, colVar, unit }: AssocArgs): InterpretationAnswer {
  return {
    type: 'interpretation',
    required: [
      {
        label: 'Cites both conditional percentages',
        phrasings: [numberRegex(pctHigh, 0), numberRegex(pctLow, 0)],
        minMatches: 2,
        polarity: 'any',
        feedback: `Quote the two conditional percentages you are comparing: ${fmt(pctHigh, 0)}% of the ${rowHigh} ${unit} against ${fmt(pctLow, 0)}% of the ${rowLow} ${unit}.`,
      },
      {
        label: 'Says the conditional distributions differ',
        phrasings: ['differ', 'depend', 'greater', 'less', 'not same'],
        polarity: 'any',
        feedback: `Say what the comparison shows: the distribution of ${colVar} is not the same from one ${rowVar} to the next.`,
      },
      {
        label: 'Uses association language',
        phrasings: ['association', 'associated', 'related', 'relationship', 'depend'],
        polarity: 'any',
        feedback: `Name what unequal conditional distributions mean: ${colVar} and ${rowVar} appear associated.`,
      },
      contextGroup('States the context', [rowVar, colVar], { minMatches: 2, feedback: `Name both variables in context: ${rowVar} and ${colVar}.` }),
    ],
    forbidden: [
      { phrase: 'cause', label: 'Claims causation', why: 'These are observational records, cross-tabulated after the fact. Unequal conditional distributions describe an association; nothing here assigns a cause.' },
      { phrase: 'prove', label: 'Claims proof', why: 'A two-way table describes the individuals in it. It does not prove anything about the process that produced them.' },
    ],
    exemplar: `Among the ${unit} with ${rowVar} ${rowHigh}, ${fmt(pctHigh, 0)} percent are ${col}, while among those with ${rowVar} ${rowLow} only ${fmt(pctLow, 0)} percent are. The conditional distributions of ${colVar} differ from one ${rowVar} to the next, so ${colVar} and ${rowVar} appear associated in these ${unit}.`,
    minWords: 15,
  }
}

export const associationInContext = defineGenerator({
  id: 'act-2/association-in-context',
  label: 'Association in context',
  ap_topics: ['2.2', '2.3'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const t = retry(
      rng,
      (r) => drawTable(r, ctx, { perCell: [12, 22], assoc: [0.4, 0.75] }),
      (d) => {
        const tw = twoWay(d.counts, { rows: ctx.rows, cols: ctx.cols })
        return ctx.cols.some((_, j) => {
          const col = tw.rowConditional.map((row) => row[j])
          return Math.max(...col) - Math.min(...col) >= 0.15
        })
      },
    )
    const tw = twoWay(t.counts, { rows: ctx.rows, cols: ctx.cols })
    // The column whose conditional distribution spreads widest across the rows.
    let best = 0
    let spread = -1
    ctx.cols.forEach((_, j) => {
      const col = tw.rowConditional.map((row) => row[j])
      const s = Math.max(...col) - Math.min(...col)
      if (s > spread) {
        spread = s
        best = j
      }
    })
    const shares = tw.rowConditional.map((row) => row[best])
    const iHigh = shares.indexOf(Math.max(...shares))
    const iLow = shares.indexOf(Math.min(...shares))
    const pctHigh = 100 * shares[iHigh]
    const pctLow = 100 * shares[iLow]
    const pctRows: (string | number)[][] = ctx.rows.map((r, i) => [r, ...ctx.cols.map((_, j) => fmtPct(tw.rowConditional[i][j], 1)), `n = ${tw.rowTotals[i]}`])
    const rubric = associationRubric({
      pctHigh,
      pctLow,
      rowHigh: ctx.rows[iHigh],
      rowLow: ctx.rows[iLow],
      col: ctx.cols[best],
      rowVar: ctx.rowVar,
      colVar: ctx.colVar,
      unit: ctx.unit,
    })
    return {
      prompt: `${ctx.frame.replace('{n}', String(tw.total))}\n\nRow percentages — the conditional distribution of ${ctx.colVar} within each ${ctx.rowVar}:\n\n${tableMd([ctx.rowVar, ...ctx.cols, 'group size'], pctRows)}\n\nIn one or two sentences, say whether ${ctx.colVar} and ${ctx.rowVar} **appear associated** in these ${ctx.unit}. Quote the two conditional percentages that carry your comparison, and stay inside what a table of recorded ${ctx.unit} can support.`,
      answer: rubric,
      hints: [
        'Two variables appear associated when the conditional distribution of one changes as you move across the categories of the other. Compare rows, not cells.',
        `Look down the *${ctx.cols[best]}* column of row percentages: ${ctx.rows[iHigh]} against ${ctx.rows[iLow]} is the widest gap in the table.`,
        'Write it as a comparison with both percentages in it, name both variables, and stop at *appear associated* — the table was not an experiment.',
      ],
      solution: `${rubric.exemplar}\n\nThe usual error is to reach past the table. These ${ctx.unit} were recorded, not assigned; a difference between conditional distributions is a description of the file, not evidence that one variable acts on the other.`,
      misconception: 'Comparing raw counts across groups of different size, or reading an association as a mechanism. Row percentages fix the first; only a designed experiment answers the second.',
    }
  },
})
