/**
 * act-4-03 · Given That — drills. AP 4.5: conditional probability from tables and trees, the general
 * multiplication rule, and reversing a conditioning.
 *
 *   act-4/conditional-from-table   numeric         a conditional off a drawn two-way table, direction named
 *   act-4/tree-joint               numeric         a joint probability from a two- or three-branch tree
 *   act-4/reverse-conditional      numeric         P(A | B) from P(B | A), P(B | Aᶜ) and P(A)
 *   act-4/which-conditional-stated choice          which conditional a Board sentence actually states
 *   act-4/interpret-conditional    interpretation  a conditional in context, and the one it is not
 *
 * The Register's fade table — 19 gradual-fade losses against 100 resolved gradual dropouts, and the
 * 12 abrupt losses — is act-4-03's mission beat and never appears in a drill.
 */
import { defineGenerator, drawTwoWay, numericAnswer, pickContext, retry, tableMd, tableSpec, type TwoWayDraw } from '@/lib/problems/generate'
import { twoWay } from '@/lib/stats'
import { fmt, fmtPct } from '@/lib/stats/format'
import { conditionalInContext } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// Reserved: act-4-03's mission beats, off the Register's fade table.
// ---------------------------------------------------------------------------------------------

/** P(loss | gradual fade) = 19/119, P(gradual fade | loss) = 19/31, and the Board's 100/119. */
const RESERVED = [19 / 119, 19 / 31, 100 / 119]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.002)
}

// ---------------------------------------------------------------------------------------------
// Drawn two-way tables — other files, other offices
// ---------------------------------------------------------------------------------------------

interface TableCtx {
  /** One sentence of framing; `{n}` is the drawn total. */
  frame: string
  rowVar: string
  rows: string[]
  colVar: string
  cols: string[]
  /** Plural noun for the individuals in the table. */
  unit: string
}

const TABLES: TableCtx[] = [
  {
    frame: 'The Bureau of Hulls sorts {n} departure certifications from Uruk High by the examiner who signed and by what the quarterly audit found.',
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
    frame: 'One watch of the Eyes on the Elara picket line files {n} contacts by range band and by the mode that resolved them.',
    rowVar: 'range band',
    rows: ['near', 'middle', 'far'],
    colVar: 'resolving mode',
    cols: ['thermal', 'optical', 'unresolved'],
    unit: 'contacts',
  },
  {
    frame: 'Adlinda Yards logs {n} refits by hull class and by whether the dock released the hull on schedule.',
    rowVar: 'hull class',
    rows: ['Sulcus', 'Tessera', 'light hauler'],
    colVar: 'release',
    cols: ['on schedule', 'late'],
    unit: 'refits',
  },
  {
    frame: 'The Ceres receiving office files {n} arrivals by cargo class and by whether the manifest matched the scale.',
    rowVar: 'cargo class',
    rows: ['He-3/D', 'volatiles', 'metals'],
    colVar: 'manifest check',
    cols: ['matched', 'reweighed'],
    unit: 'arrivals',
  },
]

function columnsOf(ctx: TableCtx): string[] {
  return [ctx.rowVar, ...ctx.cols, 'total']
}

function rowsOf(ctx: TableCtx, t: TwoWayDraw): (string | number)[][] {
  return [...ctx.rows.map((r, i) => [r, ...t.counts[i], t.rowTotals[i]] as (string | number)[]), ['total', ...t.colTotals, t.total]]
}

function drawTable(rngLike: Parameters<typeof drawTwoWay>[0], ctx: TableCtx, perCell: [number, number] = [8, 16], assoc: [number, number] = [0.3, 0.65]): TwoWayDraw {
  const cells = ctx.rows.length * ctx.cols.length
  return drawTwoWay(rngLike, { rows: ctx.rows, cols: ctx.cols, n: cells * rngLike.int(perCell[0], perCell[1]), association: rngLike.uniform(assoc[0], assoc[1]), minCell: 2 })
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — a conditional relative frequency, direction named (checkpoint q3)
// ---------------------------------------------------------------------------------------------

export const conditionalFromTable = defineGenerator({
  id: 'act-4/conditional-from-table',
  label: 'Conditional probability from a table',
  ap_topics: ['4.5'],
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
        const denom = givenRow ? t.rowTotals[i] : t.colTotals[j]
        if (c < 2 || denom < 10) return false
        const p = c / denom
        return p > 0.05 && p < 0.95 && !reserved(p)
      },
    )
    const { t, i, j } = draw
    const tw = twoWay(t.counts, { rows: ctx.rows, cols: ctx.cols })
    const c = tw.table[i][j]
    const denom = givenRow ? tw.rowTotals[i] : tw.colTotals[j]
    const p = c / denom
    const given = givenRow ? `${ctx.rowVar} **${ctx.rows[i]}**` : `${ctx.colVar} **${ctx.cols[j]}**`
    const asked = givenRow ? `${ctx.colVar} **${ctx.cols[j]}**` : `${ctx.rowVar} **${ctx.rows[i]}**`
    const denomText = givenRow ? `the ${ctx.rows[i]} row total, ${denom}` : `the ${ctx.cols[j]} column total, ${denom}`
    const tex = givenRow ? `P(\\text{${ctx.cols[j]}} \\mid \\text{${ctx.rows[i]}})` : `P(\\text{${ctx.rows[i]}} \\mid \\text{${ctx.cols[j]}})`
    const columns = columnsOf(ctx)
    const rows = rowsOf(ctx, t)
    return {
      prompt: `${ctx.frame.replace('{n}', String(tw.total))}\n\n${tableMd(columns, rows)}\n\nOne of these ${ctx.unit} is drawn at random from those with ${given}. What is the probability that it has ${asked}? Report a proportion to three decimal places.`,
      data: tableSpec(columns, rows),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'Conditioning throws away every individual outside the given group *before* the question is asked. The denominator is that group’s total, never the grand total.',
        `The cell where ${ctx.rows[i]} meets ${ctx.cols[j]} holds ${c}. The denominator is ${denomText}.`,
        `$${c} / ${denom}$, to three decimals.`,
      ],
      solution: `$$${tex} = \\frac{${c}}{${denom}} = ${fmt(p, 4)}$$\n\nThe conditional probability is **${fmt(p, 3)}**. The "given" is ${denomText} — that is the group the question restricts to, and everything outside it has already left the calculation.`,
      misconception: `Dividing by the grand total, ${tw.total}, gives the *joint* probability $${c}/${tw.total} = ${fmt(c / tw.total, 3)}$ — the share of all ${ctx.unit} that are both things at once. It is a real number about this table and it answers a different question.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — a joint probability from a tree (general multiplication rule)
// ---------------------------------------------------------------------------------------------

interface TreeCtx {
  frame: string
  /** First-stage variable name. */
  stage1: string
  /** First-stage branch labels (2 or 3 of them). */
  branches: string[]
  /** Second-stage event, as a noun phrase: "the audit is queried". */
  stage2: string
  /** Second-stage event, short label for the table. */
  stage2Short: string
  unit: string
}

const TREES: TreeCtx[] = [
  {
    frame: 'The Bureau of Hulls records which examiner signed each certification, and whether the quarterly audit later queried it.',
    stage1: 'examiner',
    branches: ['Voss', 'Amari', 'Penrose'],
    stage2: 'the audit queries the certification',
    stage2Short: 'queried',
    unit: 'certifications',
  },
  {
    frame: 'Every close pass of the loiter point is scored twice: whether *Nightjar* had the wings out at the time, and whether the passing hull’s nav sensors returned a contact.',
    stage1: 'ship state at closest approach',
    branches: ['purging', 'cold'],
    stage2: 'the passing hull detects *Nightjar*',
    stage2Short: 'detected',
    unit: 'close passes',
  },
  {
    frame: 'The Lane Authority records the drive model on every transit and whether the transponder dropped out at Mark 6.',
    stage1: 'drive model',
    branches: ['Mk 3', 'Tessera-C', 'other'],
    stage2: 'the transponder drops out',
    stage2Short: 'dropout',
    unit: 'transits',
  },
  {
    frame: 'Adlinda Yards records the hull class of every refit and whether the dock released it late.',
    stage1: 'hull class',
    branches: ['Sulcus', 'light hauler'],
    stage2: 'the dock releases the hull late',
    stage2Short: 'late',
    unit: 'refits',
  },
  {
    frame: 'When a cutter is sent to a reported silence, the Authority records the range band it searched and whether anything was recovered.',
    stage1: 'range band searched',
    branches: ['near', 'middle', 'far'],
    stage2: 'the cutter recovers something',
    stage2Short: 'recovered',
    unit: 'searches',
  },
]

/** Round to hundredths and repair the drift onto the largest branch so the priors sum to exactly 1. */
function roundToOne(raw: number[]): number[] {
  const total = raw.reduce((a, b) => a + b, 0)
  const rounded = raw.map((x) => Math.round((x / total) * 100) / 100)
  const drift = Math.round((1 - rounded.reduce((a, b) => a + b, 0)) * 100) / 100
  const big = rounded.indexOf(Math.max(...rounded))
  rounded[big] = Math.round((rounded[big] + drift) * 100) / 100
  return rounded
}

export const treeJoint = defineGenerator({
  id: 'act-4/tree-joint',
  label: 'A joint probability from a tree',
  ap_topics: ['4.5'],
  skills: ['2', '3'],
  generate(rng) {
    const ctx = pickContext(rng, TREES)
    const draw = retry(
      rng,
      (r) => {
        const priors = roundToOne(ctx.branches.map(() => r.uniform(0.6, 1.6)))
        const conds = ctx.branches.map(() => Math.round(r.uniform(0.06, 0.72) * 100) / 100)
        return { priors, conds, k: r.int(0, ctx.branches.length - 1) }
      },
      ({ priors, conds, k }) => {
        if (priors.some((p) => p < 0.08)) return false
        if (new Set(conds).size !== conds.length) return false
        const joint = priors[k] * conds[k]
        return joint > 0.02 && joint < 0.55 && !reserved(joint)
      },
    )
    const { priors, conds, k } = draw
    const joint = priors[k] * conds[k]
    const branch = ctx.branches[k]
    const columns = [ctx.stage1, `P(${ctx.stage1})`, `P(${ctx.stage2Short} | ${ctx.stage1})`]
    const rows: (string | number)[][] = ctx.branches.map((b, i) => [b, fmt(priors[i], 2), fmt(conds[i], 2)])
    return {
      prompt: `${ctx.frame}\n\nOver the whole file, the first stage and the conditional second stage read:\n\n${tableMd(columns, rows)}\n\nOne of these ${ctx.unit} is drawn at random. What is the probability that it is **${branch}** *and* that ${ctx.stage2}? Report a proportion to three decimal places.`,
      data: tableSpec(columns, rows),
      answer: numericAnswer(joint, 'proportion', { digits: 3 }),
      hints: [
        'A joint probability is one path through the tree, and the general multiplication rule multiplies along it: the branch probability times the conditional probability on the branch that follows.',
        `The ${branch} branch carries ${fmt(priors[k], 2)}, and the second-stage probability *on that branch* is ${fmt(conds[k], 2)}. The other branches are not on this path.`,
        `$${fmt(priors[k], 2)} \\times ${fmt(conds[k], 2)}$, to three decimals.`,
      ],
      solution: `$$P(\\text{${branch}} \\cap \\text{${ctx.stage2Short}}) = P(\\text{${branch}}) \\cdot P(\\text{${ctx.stage2Short}} \\mid \\text{${branch}}) = ${fmt(priors[k], 2)} \\times ${fmt(conds[k], 2)} = ${fmt(joint, 4)}$$\n\nThe joint probability is **${fmt(joint, 3)}**. Note that it is smaller than either factor: a path through a tree can only lose probability, because each stage keeps a share of what reached it.`,
      misconception: `Multiplying by the wrong conditional — the second-stage probability differs from branch to branch, and only the one sitting on the ${branch} branch belongs on this path. Adding the two numbers, $${fmt(priors[k], 2)} + ${fmt(conds[k], 2)} = ${fmt(priors[k] + conds[k], 2)}$, answers nothing at all: "and" along a path multiplies.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — reverse a conditioning (checkpoint q4)
// ---------------------------------------------------------------------------------------------

interface ReverseCtx {
  frame: string
  /** The underlying condition, as a noun phrase: "the transponder unit is actually failing". */
  condition: string
  /** Short label for the condition. */
  conditionShort: string
  /** The flag/observation, as a noun phrase. */
  flag: string
  /** Short label for the flag. */
  flagShort: string
  unit: string
}

const REVERSALS: ReverseCtx[] = [
  {
    frame: 'The Authority’s diagnostic raises a fault flag on a transponder unit at Mark 6. Over the maintenance file, a unit that really is failing raises the flag on {sens} of its passes, while a healthy unit raises it on {fpr} of passes, and {prior} of units on the Lane are failing at any time.',
    condition: 'the unit is failing',
    conditionShort: 'failing',
    flag: 'the flag is raised',
    flagShort: 'flagged',
    unit: 'units',
  },
  {
    frame: 'A cutter sent to a reported silence returns a search result. When a hull really was lost, the search recovers debris on {sens} of sorties; when the hull turns up intact later, a sortie still logs debris on {fpr} of them, from unrelated traffic. Across the file, {prior} of reported silences turn out to be losses.',
    condition: 'the hull was lost',
    conditionShort: 'lost',
    flag: 'the search recovers debris',
    flagShort: 'debris',
    unit: 'reported silences',
  },
  {
    frame: 'The Bureau of Hulls runs an automated check on every departure certification. A certification with a real discrepancy in it is flagged {sens} of the time; a clean one is flagged {fpr} of the time; and {prior} of certifications carry a real discrepancy.',
    condition: 'the certification has a real discrepancy',
    conditionShort: 'discrepancy',
    flag: 'the check flags it',
    flagShort: 'flagged',
    unit: 'certifications',
  },
  {
    frame: 'An examiner at Uruk High queries a manifest when the declared mass looks wrong. A manifest that really is misdeclared draws a query {sens} of the time; a correct one draws a query {fpr} of the time; and {prior} of manifests are misdeclared.',
    condition: 'the manifest is misdeclared',
    conditionShort: 'misdeclared',
    flag: 'the examiner queries it',
    flagShort: 'queried',
    unit: 'manifests',
  },
]

export const reverseConditional = defineGenerator({
  id: 'act-4/reverse-conditional',
  label: 'Reverse a conditional',
  ap_topics: ['4.5'],
  skills: ['2', '3'],
  generate(rng) {
    const ctx = pickContext(rng, REVERSALS)
    const draw = retry(
      rng,
      (r) => ({
        prior: Math.round(r.uniform(0.03, 0.25) * 100) / 100,
        sens: Math.round(r.uniform(0.7, 0.96) * 100) / 100,
        fpr: Math.round(r.uniform(0.04, 0.22) * 100) / 100,
      }),
      ({ prior, sens, fpr }) => {
        if (!(sens > fpr + 0.35)) return false
        const both = prior * sens
        const marg = both + (1 - prior) * fpr
        const post = both / marg
        return post > 0.08 && post < 0.85 && !reserved(post)
      },
    )
    const { prior, sens, fpr } = draw
    const both = prior * sens
    const other = (1 - prior) * fpr
    const marg = both + other
    const post = both / marg
    const frame = ctx.frame.replace('{sens}', fmtPct(sens, 0)).replace('{fpr}', fmtPct(fpr, 0)).replace('{prior}', fmtPct(prior, 0))
    return {
      prompt: `${frame}\n\nOne of these ${ctx.unit} is drawn at random and ${ctx.flag}. Given that, what is the probability that ${ctx.condition}? Report a proportion to three decimal places.`,
      answer: numericAnswer(post, 'proportion', { digits: 3 }),
      hints: [
        `You are given $P(\\text{${ctx.flagShort}} \\mid \\text{${ctx.conditionShort}})$ and asked for $P(\\text{${ctx.conditionShort}} \\mid \\text{${ctx.flagShort}})$. Those are different numbers with different denominators, and the tree runs the other way.`,
        `Build both paths that end in a flag. Down the ${ctx.conditionShort} branch: $${fmt(prior, 2)} \\times ${fmt(sens, 2)}$. Down the other branch: $${fmt(1 - prior, 2)} \\times ${fmt(fpr, 2)}$. The new denominator is their sum — every ${ctx.unit.replace(/s$/, '')} that got flagged, however it got there.`,
        `$${fmt(both, 4)} / (${fmt(both, 4)} + ${fmt(other, 4)})$, to three decimals.`,
      ],
      solution: `Reverse the conditioning by putting the joint over the *other* margin.\n\n$$P(\\text{${ctx.conditionShort}} \\cap \\text{${ctx.flagShort}}) = ${fmt(prior, 2)} \\times ${fmt(sens, 2)} = ${fmt(both, 4)}$$\n\n$$P(\\text{${ctx.flagShort}}) = ${fmt(both, 4)} + ${fmt(1 - prior, 2)} \\times ${fmt(fpr, 2)} = ${fmt(both, 4)} + ${fmt(other, 4)} = ${fmt(marg, 4)}$$\n\n$$P(\\text{${ctx.conditionShort}} \\mid \\text{${ctx.flagShort}}) = \\frac{${fmt(both, 4)}}{${fmt(marg, 4)}} = ${fmt(post, 4)}$$\n\nThe probability is **${fmt(post, 3)}**, against the ${fmtPct(sens, 0)} the problem handed you in the other direction. The gap is the base rate doing its work: only ${fmtPct(prior, 0)} of ${ctx.unit} were ever candidates, so most of the flags come off the much larger clean group.`,
      misconception: `Reporting ${fmt(sens, 2)} — the number the problem states — as the answer. That is $P(\\text{${ctx.flagShort}} \\mid \\text{${ctx.conditionShort}})$, the prosecutor's fallacy in its usual costume. The denominator of the question is every flagged ${ctx.unit.replace(/s$/, '')}, not every ${ctx.conditionShort} one.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which conditional does the sentence state?
// ---------------------------------------------------------------------------------------------

interface StatedCtx {
  /** Board-register sentence stating P(outcome | group); `{pct}` is the drawn percentage. */
  sentenceGivenGroup: string
  /** Board-register sentence stating P(group | outcome). */
  sentenceGivenOutcome: string
  group: string
  outcome: string
  unit: string
}

const STATEMENTS: StatedCtx[] = [
  {
    sentenceGivenGroup: 'It is noted that {pct} of certifications signed by examiner Voss were subsequently queried on audit.',
    sentenceGivenOutcome: 'It is noted that {pct} of certifications queried on audit had been signed by examiner Voss.',
    group: 'signed by Voss',
    outcome: 'queried on audit',
    unit: 'certifications',
  },
  {
    sentenceGivenGroup: 'It is observed that {pct} of Tessera-C transits were attended by a transponder dropout at Mark 6.',
    sentenceGivenOutcome: 'It is observed that {pct} of transits attended by a transponder dropout at Mark 6 were Tessera-C transits.',
    group: 'a Tessera-C transit',
    outcome: 'attended by a dropout',
    unit: 'transits',
  },
  {
    sentenceGivenGroup: 'The record indicates that {pct} of refits of Sulcus hulls resulted in a late release from the dock.',
    sentenceGivenOutcome: 'The record indicates that {pct} of late releases from the dock were refits of Sulcus hulls.',
    group: 'a refit of a Sulcus hull',
    outcome: 'a late release',
    unit: 'refits',
  },
  {
    sentenceGivenGroup: 'It is noted that {pct} of near-band contacts were resolved thermally.',
    sentenceGivenOutcome: 'It is noted that {pct} of thermally resolved contacts were near-band contacts.',
    group: 'a near-band contact',
    outcome: 'resolved thermally',
    unit: 'contacts',
  },
]

export const whichConditionalStated = defineGenerator({
  id: 'act-4/which-conditional-stated',
  label: 'Which conditional does it state?',
  ap_topics: ['4.5'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, STATEMENTS)
    const givenGroup = rng.bool()
    const pct = rng.int(9, 88)
    const sentence = (givenGroup ? ctx.sentenceGivenGroup : ctx.sentenceGivenOutcome).replace('{pct}', `${pct} percent`)
    const cands = [
      {
        text: `Of the ${ctx.unit} that are ${ctx.group}, the share that are ${ctx.outcome}.`,
        correct: givenGroup,
        why: givenGroup ? null : `The sentence conditions on ${ctx.outcome} — that is the group named right after *of*, and its total is the denominator. This option turns the sentence around.`,
      },
      {
        text: `Of the ${ctx.unit} that are ${ctx.outcome}, the share that are ${ctx.group}.`,
        correct: !givenGroup,
        why: !givenGroup ? null : `The sentence conditions on ${ctx.group}. This option swaps the denominator for the other margin, which is the commonest way to quote a true number at a question nobody asked.`,
      },
      {
        text: `Of all the ${ctx.unit} in the file, the share that are both ${ctx.group} and ${ctx.outcome}.`,
        correct: false,
        why: 'That is the joint probability, over the grand total. It is smaller than either conditional and it is not what the sentence says.',
      },
      {
        text: `Of all the ${ctx.unit} in the file, the share that are ${ctx.outcome}.`,
        correct: false,
        why: 'That is the marginal probability — one variable, the other ignored. The sentence restricts to a group before it reports anything.',
      },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `A paragraph of the Board's staff paper reads:\n\n> ${sentence}\n\nThe sentence is true. Which conditional probability does it **state**?`,
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Find the word *of*. Whatever follows it is the group the sentence conditions on, and that group’s total is the denominator.',
        'All four options are real numbers about the same file. Only one of them has the denominator the sentence used, and the passive voice is there to make the denominator hard to see.',
      ],
      solution: `The sentence restricts to ${givenGroup ? ctx.group : ctx.outcome} ${ctx.unit} first, then reports the share of *those* that are ${givenGroup ? ctx.outcome : ctx.group}. So it states **of the ${ctx.unit} that are ${givenGroup ? ctx.group : ctx.outcome}, the share that are ${givenGroup ? ctx.outcome : ctx.group}**.\n\nThe other three are also true statements about the file and none of them is this one. A reader who takes the sentence for the reversed conditional has not caught an error — the paper made no arithmetic error — but has answered a different question in the paper's favour.`,
      misconception:
        'Reading a conditional as if the direction did not matter. P(A | B) and P(B | A) share a numerator and nothing else; a staff paper that chooses which one to print has chosen which question its reader will answer.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Interpretation — a conditional in context, and the one it is not
// ---------------------------------------------------------------------------------------------

export const interpretConditional = defineGenerator({
  id: 'act-4/interpret-conditional',
  label: 'Interpret a conditional in context',
  ap_topics: ['4.5'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const draw = retry(
      rng,
      (r) => {
        const t = drawTable(r, ctx, [10, 20], [0.35, 0.7])
        return { t, i: r.int(0, ctx.rows.length - 1), j: r.int(0, ctx.cols.length - 1) }
      },
      ({ t, i, j }) => {
        const c = t.counts[i][j]
        if (c < 3 || t.rowTotals[i] < 12 || t.colTotals[j] < 12) return false
        const fwd = c / t.rowTotals[i]
        const rev = c / t.colTotals[j]
        return fwd > 0.08 && fwd < 0.92 && rev > 0.08 && rev < 0.92 && Math.abs(fwd - rev) > 0.12 && !reserved(fwd) && !reserved(rev)
      },
    )
    const { t, i, j } = draw
    const tw = twoWay(t.counts, { rows: ctx.rows, cols: ctx.cols })
    const c = tw.table[i][j]
    const value = c / tw.rowTotals[i]
    const reversedValue = c / tw.colTotals[j]
    const given = `${ctx.unit} with ${ctx.rowVar} ${ctx.rows[i]}`
    const event = `${ctx.colVar} ${ctx.cols[j]}`
    const reversedPhrase = `the share of ${ctx.cols[j]} ${ctx.unit} with ${ctx.rowVar} ${ctx.rows[i]}`
    const rubric = conditionalInContext({ value, event, given, reversedValue, reversedPhrase })
    const columns = columnsOf(ctx)
    const rows = rowsOf(ctx, t)
    return {
      prompt: `${ctx.frame.replace('{n}', String(tw.total))}\n\n${tableMd(columns, rows)}\n\nOf the ${tw.rowTotals[i]} ${given}, ${c} have ${event} — a conditional probability of ${fmt(value, 3)}.\n\nIn one or two sentences, say what that number means about these ${ctx.unit}, name the group it conditions on, and say which question it does **not** answer.`,
      data: tableSpec(columns, rows),
      answer: rubric,
      hints: [
        'The denominator is the "given". Start the sentence with *Of the …* and the group you divided by will be in the first four words.',
        `The reversed conditional uses the same cell over the other total: ${c} of the ${tw.colTotals[j]} ${ctx.cols[j]} ${ctx.unit}. Quote it, and say it is a different question.`,
        'Two sentences: what share of which group, then what the number is not.',
      ],
      solution: `${rubric.exemplar}\n\nOne cell, two conditionals: $${c}/${tw.rowTotals[i]} = ${fmt(value, 3)}$ and $${c}/${tw.colTotals[j]} = ${fmt(reversedValue, 3)}$. They share a numerator and nothing else, and quoting one for the other is the prosecutor's fallacy.`,
      misconception: `Reporting ${fmtPct(reversedValue, 1)} — the same cell over the ${ctx.cols[j]} column total — for a question that named the ${ctx.rows[i]} group. A true number that answers the wrong question survives every arithmetic check.`,
    }
  },
})
