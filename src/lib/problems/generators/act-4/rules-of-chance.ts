/**
 * act-4-02 Â· The Sweep Log â€” drills. AP 4.3â€“4.4: sample space, event, probability as long-run
 * relative frequency; the complement rule; mutually exclusive events and the addition rule;
 * probabilities read off a two-way table, including the general addition rule.
 *
 *   act-4/complement-rule      numeric  1 âˆ’ P(none): "at least one" over k trials, or a table's complement
 *   act-4/addition-exclusive   numeric  the addition rule over a drawn, mutually exclusive sample space
 *   act-4/two-way-probability  numeric  joint, marginal and "or" probabilities (overlap subtracted)
 *   act-4/sample-space         choice   a complete, mutually exclusive sample space for a described process
 *
 * Every table and rate is drawn fresh. The Act's own sweep log â€” 164 detections in 1,400 entries,
 * 151 of them thermal or optical â€” is act-4-02's mission beat and never appears here.
 */
import { defineGenerator, drawTwoWay, numericAnswer, pickContext, retry, tableMd, tableSpec, type TwoWayDraw } from '@/lib/problems/generate'
import type { Rng } from '@/lib/rng'
import { binomial, twoWay } from '@/lib/stats'
import { fmt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Reserved: act-4-02's two mission beats, off the Act's own 1,400-entry sweep log.
// ---------------------------------------------------------------------------------------------

/** P(a sweep detects something) = 164/1400 and P(thermal or optical) = 151/1400. */
const RESERVED = [164 / 1400, 151 / 1400]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.002)
}

// ---------------------------------------------------------------------------------------------
// Sample spaces â€” four or five mutually exclusive outcomes of one repeatable in-world process
// ---------------------------------------------------------------------------------------------

interface SpaceCtx {
  /** The process, one sentence; `{n}` is the drawn number of records. */
  frame: string
  /** The repeatable thing, singular: "one audit". */
  trial: string
  /** The repeatable thing, plural. */
  unit: string
  /** The outcome variable's name. */
  variable: string
  /** The outcome variable's name, plural. */
  variablePlural: string
  outcomes: string[]
  /** Relative weights for drawing counts (need not sum to 1). */
  weights: number[]
}

const SPACES: SpaceCtx[] = [
  {
    frame: 'The Bureau of Hulls files every one of its {n} departure audits at Uruk High under exactly one finding.',
    trial: 'one audit',
    unit: 'audits',
    variable: 'finding',
    variablePlural: 'findings',
    outcomes: ['cleared', 'queried', 'held', 'referred'],
    weights: [70, 16, 9, 5],
  },
  {
    frame: 'Adlinda Yards closes each of {n} dock slots with exactly one disposition.',
    trial: 'one dock slot',
    unit: 'slots',
    variable: 'disposition',
    variablePlural: 'dispositions',
    outcomes: ['released on schedule', 'released late', 'held for parts', 'turned away'],
    weights: [58, 24, 13, 5],
  },
  {
    frame: 'The Ceres receiving office weighs {n} arrivals and records exactly one manifest outcome for each.',
    trial: 'one arrival',
    unit: 'arrivals',
    variable: 'manifest outcome',
    variablePlural: 'manifest outcomes',
    outcomes: ['matched', 'reweighed and matched', 'reweighed and short', 'reweighed and over'],
    weights: [62, 21, 11, 6],
  },
  {
    frame: 'The Lane Authority codes the transponder at Mark 6 for each of {n} transits, one state per transit.',
    trial: 'one transit',
    unit: 'transits',
    variable: 'transponder state',
    variablePlural: 'transponder states',
    outcomes: ['clean', 'intermittent', 'gradual fade', 'dropout', 'no return'],
    weights: [66, 15, 9, 7, 3],
  },
  {
    frame: "One watch of the Eyes on the Callistoâ€“Ganymede local lane logs {n} contacts, each classified against the Compact's class table under exactly one heading.",
    trial: 'one contact',
    unit: 'contacts',
    variable: 'contact class',
    variablePlural: 'contact classes',
    outcomes: ['freighter', 'tender', 'patrol', 'unresolved'],
    weights: [54, 25, 13, 8],
  },
]

interface SpaceDraw {
  counts: number[]
  total: number
}

function drawSpace(r: Rng, ctx: SpaceCtx, perOutcome: [number, number] = [14, 46]): SpaceDraw {
  const n = ctx.outcomes.length * r.int(perOutcome[0], perOutcome[1])
  const counts = ctx.outcomes.map(() => 0)
  for (let i = 0; i < n; i++) counts[r.weightedIndex(ctx.weights)]++
  return { counts, total: n }
}

function spaceRows(ctx: SpaceCtx, d: SpaceDraw): (string | number)[][] {
  return [...ctx.outcomes.map((o, i) => [o, d.counts[i]] as (string | number)[]), ['total', d.total]]
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric â€” the complement rule (checkpoint q2)
// ---------------------------------------------------------------------------------------------

interface TrialCtx {
  /** `{k}` trials, `{p}` per-trial probability. */
  frame: string
  /** The event on one trial, as a noun phrase. */
  event: string
  /** The trial, plural. */
  trials: string
}

const TRIALS: TrialCtx[] = [
  {
    frame: 'The Lane plot shows {k} scheduled close passes of the loiter point in the window ahead. Each passing hullâ€™s nav sensors would pick up a cold *Nightjar* with probability {p}, and the passes are different hulls on scheduled tracks, so they are independent.',
    event: 'a detection',
    trials: 'passes',
  },
  {
    frame: 'The Eyes will run {k} more sweeps of this sector before the profile changes. On a clean sky each sweep returns something with probability {p}, independently of the others.',
    event: 'a detection',
    trials: 'sweeps',
  },
  {
    frame: 'The Bureau will audit {k} of the yardâ€™s certifications this quarter. Each audit turns up a discrepancy with probability {p}, independently of the others.',
    event: 'a discrepancy',
    trials: 'audits',
  },
  {
    frame: 'A Lane hull makes {k} transits of the corridor this season. Each transit files a transponder advisory with probability {p}, independently of the others.',
    event: 'an advisory',
    trials: 'transits',
  },
  {
    frame: 'The cryocooler loop has {k} independent valve cycles left before the next service window. Each cycle trips the low-flow alarm with probability {p}.',
    event: 'a trip',
    trials: 'cycles',
  },
]

export const complementRule = defineGenerator({
  id: 'act-4/complement-rule',
  label: 'The complement rule',
  ap_topics: ['4.3'],
  skills: ['2', '3'],
  generate(rng) {
    const fromTable = rng.bool(0.4)

    if (fromTable) {
      const ctx = pickContext(rng, SPACES)
      const draw = retry(
        rng,
        (r) => {
          const d = drawSpace(r, ctx)
          return { d, i: r.int(0, ctx.outcomes.length - 1) }
        },
        ({ d, i }) => {
          const p = 1 - d.counts[i] / d.total
          return d.counts.every((c) => c >= 3) && p > 0.08 && p < 0.95 && !reserved(p)
        },
      )
      const { d, i } = draw
      const c = d.counts[i]
      const p = 1 - c / d.total
      const columns = [ctx.variable, ctx.unit]
      const rows = spaceRows(ctx, d)
      return {
        prompt: `${ctx.frame.replace('{n}', String(d.total))}\n\n${tableMd(columns, rows)}\n\nOne of these ${ctx.unit} is drawn at random. What is the probability that its ${ctx.variable} is **not** *${ctx.outcomes[i]}*? Report a proportion to three decimal places.`,
        data: tableSpec(columns, rows),
        answer: numericAnswer(p, 'proportion', { digits: 3 }),
        hints: [
          'The outcomes are mutually exclusive and cover every case, so their probabilities sum to 1. That makes "not A" the cheapest event in the table to compute.',
          `$P(\\text{${ctx.outcomes[i]}}) = ${c}/${d.total}$. The complement is one minus that.`,
          `$1 - ${c}/${d.total}$, to three decimals.`,
        ],
        solution: `$$P(\\text{not ${ctx.outcomes[i]}}) = 1 - P(\\text{${ctx.outcomes[i]}}) = 1 - \\frac{${c}}{${d.total}} = ${fmt(p, 4)}$$\n\nThe probability is **${fmt(p, 3)}**. Adding the other ${ctx.outcomes.length - 1} outcomes gives the same number â€” the complement is just the short way, and it stays short however many outcomes there are.`,
        misconception: `Adding the other outcomes and slipping one â€” or subtracting the *count* instead of the probability. $1 - ${c}$ is not a probability.`,
      }
    }

    const ctx = pickContext(rng, TRIALS)
    const draw = retry(
      rng,
      (r) => ({ k: r.int(3, 16), p: Math.round(r.uniform(0.04, 0.34) * 100) / 100 }),
      ({ k, p }) => {
        const q = binomial.atLeast(1, k, p)
        return q > 0.12 && q < 0.96 && !reserved(q)
      },
    )
    const { k, p } = draw
    const none = binomial.pmf(0, k, p)
    const atLeastOne = binomial.atLeast(1, k, p)
    return {
      prompt: `${ctx.frame.replace('{k}', String(k)).replace('{p}', fmt(p, 2))}\n\nWhat is the probability of **at least one** ${ctx.event} across the ${k} ${ctx.trials}? Report a proportion to three decimal places.`,
      answer: numericAnswer(atLeastOne, 'proportion', { digits: 3 }),
      hints: [
        '"At least one" is the complement of "none". Compute the probability that every trial misses, then subtract from 1 â€” do not add the per-trial probabilities.',
        `Each of the ${k} ${ctx.trials} misses with probability $1 - ${fmt(p, 2)} = ${fmt(1 - p, 2)}$, and they are independent, so all ${k} miss with probability $${fmt(1 - p, 2)}^{${k}}$.`,
        `$1 - ${fmt(1 - p, 2)}^{${k}}$, to three decimals.`,
      ],
      solution: `$$P(\\text{at least one}) = 1 - P(\\text{none}) = 1 - (1 - ${fmt(p, 2)})^{${k}} = 1 - ${fmt(none, 4)} = ${fmt(atLeastOne, 4)}$$\n\nThe probability is **${fmt(atLeastOne, 3)}**.`,
      misconception: `Adding the per-trial probabilities: $${k} \\times ${fmt(p, 2)} = ${fmt(k * p, 3)}$. That double-counts every way two or more ${ctx.trials} could both produce ${ctx.event}, and for a long enough window it returns a "probability" greater than 1.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric â€” the addition rule over mutually exclusive outcomes
// ---------------------------------------------------------------------------------------------

export const additionExclusive = defineGenerator({
  id: 'act-4/addition-exclusive',
  label: 'Addition rule for exclusive outcomes',
  ap_topics: ['4.4'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, SPACES)
    const draw = retry(
      rng,
      (r) => {
        const d = drawSpace(r, ctx)
        const howMany = r.bool(0.65) ? 2 : 3
        const picked = r
          .shuffle(ctx.outcomes.map((_, i) => i))
          .slice(0, howMany)
          .sort((a, b) => a - b)
        return { d, picked }
      },
      ({ d, picked }) => {
        const p = picked.reduce((s, i) => s + d.counts[i], 0) / d.total
        return d.counts.every((c) => c >= 3) && p > 0.05 && p < 0.9 && !reserved(p)
      },
    )
    const { d, picked } = draw
    const names = picked.map((i) => ctx.outcomes[i])
    const counts = picked.map((i) => d.counts[i])
    const total = counts.reduce((a, b) => a + b, 0)
    const p = total / d.total
    const columns = [ctx.variable, ctx.unit]
    const rows = spaceRows(ctx, d)
    const list = names.map((nm) => `*${nm}*`).join(names.length === 2 ? ' or ' : ', ').replace(/, ([^,]*)$/, ' or $1')
    return {
      prompt: `${ctx.frame.replace('{n}', String(d.total))}\n\n${tableMd(columns, rows)}\n\nEvery ${ctx.trial.replace(/^one /, '')} carries exactly one of these ${ctx.outcomes.length} ${ctx.variablePlural}. Take ${ctx.trial} at random: what is the probability that its ${ctx.variable} is ${list}? Report a proportion to three decimal places.`,
      data: tableSpec(columns, rows),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'Two events are mutually exclusive when they cannot both happen on the same trial. When they are, the probability of "one or the other" is the sum of their probabilities â€” nothing is counted twice, because nothing is in both.',
        `Each ${ctx.trial} carries exactly one ${ctx.variable}, so these outcomes cannot overlap: ${names.map((nm, i) => `${nm} ${counts[i]}`).join(', ')}, out of ${d.total}.`,
        `$(${counts.join(' + ')}) / ${d.total}$, to three decimals.`,
      ],
      solution: `Each ${ctx.trial} is filed under exactly one ${ctx.variable}, so these outcomes are mutually exclusive and the addition rule applies with no correction:\n\n$$P(${names.map((nm) => `\\text{${nm}}`).join(' \\cup ')}) = ${names.map((_nm, i) => `\\frac{${counts[i]}}{${d.total}}`).join(' + ')} = \\frac{${total}}{${d.total}} = ${fmt(p, 4)}$$\n\nThe probability is **${fmt(p, 3)}**.`,
      misconception:
        'Adding probabilities of events that *can* happen together. The plain addition rule is only safe for mutually exclusive events; with any overlap you must subtract the intersection, or you will count it twice.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric â€” joint, marginal and "or" off a two-way table
// ---------------------------------------------------------------------------------------------

interface TableCtx {
  frame: string
  rowVar: string
  rows: string[]
  colVar: string
  cols: string[]
  unit: string
}

const TABLES: TableCtx[] = [
  {
    frame: 'The Lane Authority tabulates {n} transits of the Saturn feeder run by drive model and by the state of the transponder at Mark 6.',
    rowVar: 'drive model',
    rows: ['Mk 3', 'Tessera-C', 'other'],
    colVar: 'transponder state',
    cols: ['clean', 'intermittent', 'dropout'],
    unit: 'transits',
  },
  {
    frame: 'The Bureau of Hulls sorts {n} departure certifications by the examiner who signed and by what the audit found.',
    rowVar: 'examiner',
    rows: ['Voss', 'Amari', 'Penrose'],
    colVar: 'audit finding',
    cols: ['cleared', 'queried', 'held'],
    unit: 'certifications',
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
    frame: 'One watch of the Eyes on the Elara picket line files {n} contacts by range band and by the mode that resolved them.',
    rowVar: 'range band',
    rows: ['near', 'middle', 'far'],
    colVar: 'resolving mode',
    cols: ['thermal', 'optical', 'unresolved'],
    unit: 'contacts',
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

function tableColumns(ctx: TableCtx): string[] {
  return [ctx.rowVar, ...ctx.cols, 'total']
}

function tableRows(ctx: TableCtx, t: TwoWayDraw): (string | number)[][] {
  return [...ctx.rows.map((r, i) => [r, ...t.counts[i], t.rowTotals[i]] as (string | number)[]), ['total', ...t.colTotals, t.total]]
}

type TwoWayKind = 'joint' | 'marginal' | 'or'

export const twoWayProbability = defineGenerator({
  id: 'act-4/two-way-probability',
  label: 'Probability from a two-way table',
  ap_topics: ['4.3', '4.4'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    // The general addition rule is the lesson, so it is drawn half the time.
    const kind = pickContext<TwoWayKind>(rng, ['joint', 'marginal', 'or', 'or'])
    const draw = retry(
      rng,
      (r) => {
        const cells = ctx.rows.length * ctx.cols.length
        const t = drawTwoWay(r, { rows: ctx.rows, cols: ctx.cols, n: cells * r.int(8, 16), association: r.uniform(0.25, 0.6), minCell: 2 })
        return { t, i: r.int(0, ctx.rows.length - 1), j: r.int(0, ctx.cols.length - 1) }
      },
      ({ t, i, j }) => {
        const p = kind === 'joint' ? t.counts[i][j] / t.total : kind === 'marginal' ? t.colTotals[j] / t.total : (t.rowTotals[i] + t.colTotals[j] - t.counts[i][j]) / t.total
        return t.counts[i][j] >= 2 && p > 0.05 && p < 0.95 && !reserved(p)
      },
    )
    const { t, i, j } = draw
    const tw = twoWay(t.counts, { rows: ctx.rows, cols: ctx.cols })
    const c = tw.table[i][j]
    const rt = tw.rowTotals[i]
    const ct = tw.colTotals[j]
    const n = tw.total
    const row = ctx.rows[i]
    const col = ctx.cols[j]
    const columns = tableColumns(ctx)
    const rows = tableRows(ctx, t)

    const ask =
      kind === 'joint'
        ? `is **both** ${ctx.rowVar} *${row}* **and** ${ctx.colVar} *${col}*`
        : kind === 'marginal'
          ? `has ${ctx.colVar} *${col}*`
          : `is ${ctx.rowVar} *${row}* **or** ${ctx.colVar} *${col}* (or both)`
    const numerator = kind === 'joint' ? c : kind === 'marginal' ? ct : rt + ct - c
    const p = numerator / n
    const tex =
      kind === 'joint'
        ? `P(\\text{${row}} \\cap \\text{${col}}) = \\frac{${c}}{${n}}`
        : kind === 'marginal'
          ? `P(\\text{${col}}) = \\frac{${ct}}{${n}}`
          : `P(\\text{${row}} \\cup \\text{${col}}) = \\frac{${rt}}{${n}} + \\frac{${ct}}{${n}} - \\frac{${c}}{${n}} = \\frac{${rt} + ${ct} - ${c}}{${n}} = \\frac{${numerator}}{${n}}`

    return {
      prompt: `${ctx.frame.replace('{n}', String(n))}\n\n${tableMd(columns, rows)}\n\nOne of these ${ctx.unit} is drawn at random. What is the probability that it ${ask}? Report a proportion to three decimal places.`,
      data: tableSpec(columns, rows),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints:
        kind === 'or'
          ? [
              `Being ${row} and being ${col} are **not** mutually exclusive â€” ${c} of these ${ctx.unit} are both. The general addition rule subtracts the overlap once, because adding the row total and the column total counts it twice.`,
              `Row total for ${row}: ${rt}. Column total for ${col}: ${ct}. The cell where they meet: ${c}. Grand total: ${n}.`,
              `$(${rt} + ${ct} - ${c}) / ${n}$, to three decimals.`,
            ]
          : [
              kind === 'joint'
                ? 'A joint probability is one cell over the grand total â€” the share of everybody that is both things at once.'
                : 'A marginal probability is one row or column total over the grand total: one variable only, the other ignored.',
              `Numerator: ${numerator}. Denominator: the grand total, ${n}.`,
              `$${numerator} / ${n}$, to three decimals.`,
            ],
      solution:
        kind === 'or'
          ? `${row} and ${col} can happen together â€” ${c} of the ${n} ${ctx.unit} are both â€” so the plain addition rule would count that cell twice. Subtract it once:\n\n$$${tex} = ${fmt(p, 4)}$$\n\nThe probability is **${fmt(p, 3)}**.`
          : `$$${tex} = ${fmt(p, 4)}$$\n\nThe probability is **${fmt(p, 3)}**.`,
      misconception:
        kind === 'or'
          ? `Reporting $(${rt} + ${ct})/${n} = ${fmt((rt + ct) / n, 3)}$. That adds the ${c} ${ctx.unit} in the overlap twice; if the two events are big enough it produces a probability over 1, which is how you catch the error without checking the table.`
          : 'Confusing the three denominators. Joint and marginal probabilities are both over the grand total; only a conditional probability restricts the denominator to one row or column.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice â€” a complete, mutually exclusive sample space
// ---------------------------------------------------------------------------------------------

interface SampleSpaceCtx {
  process: string
  correct: string[]
  overlapping: string[]
  overlappingWhy: string
  incomplete: string[]
  incompleteWhy: string
  notOutcomes: string[]
  notOutcomesWhy: string
}

const SAMPLE_SPACES: SampleSpaceCtx[] = [
  {
    process: 'One scheduled sweep of a sector by the Eyes. Each entry in the log records whether the sweep detected anything and, if it did, which single mode resolved it.',
    correct: ['thermal detection', 'optical detection', 'RF detection', 'no detection'],
    overlapping: ['thermal detection', 'optical detection', 'RF detection', 'any detection', 'no detection'],
    overlappingWhy: '"Any detection" is not a fifth outcome â€” it is the union of the first three. Outcomes of a sample space must be mutually exclusive, and a sweep resolved by thermal would belong to two of these at once.',
    incomplete: ['thermal detection', 'optical detection', 'RF detection'],
    incompleteWhy: 'A sample space must cover every possible result. Most sweeps detect nothing at all, and if that outcome is missing the probabilities cannot sum to 1.',
    notOutcomes: ['the sweep detects something', 'the sweep is a re-sweep', 'the sink is above 50 percent', 'the sector is 1 to 6'],
    notOutcomesWhy: 'These are four different variables about the same sweep, not four results of one. A sample space lists the possible values of one outcome, and each trial must land in exactly one of them.',
  },
  {
    process: 'One departure certification drawn from the Bureau of Hulls file at Uruk High. Every certification carries exactly one audit finding.',
    correct: ['cleared', 'queried', 'held', 'referred'],
    overlapping: ['cleared', 'queried', 'held', 'referred', 'not cleared'],
    overlappingWhy: '"Not cleared" is the union of queried, held and referred. It is a perfectly good event, but it cannot sit in the same list as its own parts: a held certification would be counted twice.',
    incomplete: ['cleared', 'queried'],
    incompleteWhy: 'Held and referred certifications exist in the file and belong to neither of these. A sample space that leaves out possible results gives probabilities that sum to less than 1.',
    notOutcomes: ['cleared', 'signed by Voss', 'filed in the third quarter', 'a Perrine hull'],
    notOutcomesWhy: 'Only the first is a value of the audit finding. The rest are other variables recorded on the same certification, and one certification can be all four at once.',
  },
  {
    process: "One close pass of the loiter point by a Lane hull, as scored in Ebele's being-seen model. Each pass is scored once.",
    correct: ['the hull detects *Nightjar*', 'the hull does not detect *Nightjar*'],
    overlapping: ['the hull detects *Nightjar*', 'the hull does not detect *Nightjar*', 'the hull detects *Nightjar* while she is purging'],
    overlappingWhy: 'The third entry is a special case of the first, not a separate result. A pass that detects a purging ship belongs to two of these at once, so they are not mutually exclusive.',
    incomplete: ['the hull detects *Nightjar* while she is cold', 'the hull detects *Nightjar* while she is purging'],
    incompleteWhy: 'The overwhelmingly commonest result â€” the hull sees nothing â€” is missing, so these two cannot account for every pass.',
    notOutcomes: ['the hull detects *Nightjar*', 'the hull is Perrine-flagged', 'the pass is inside 2.6 million kilometres', '*Nightjar* is purging'],
    notOutcomesWhy: 'Four things that can all be true of the same pass. A sample space needs outcomes of one variable, exactly one of which happens per trial.',
  },
  {
    process: 'One dock slot at Adlinda Yards, closed out at the end of the refit. Each slot is closed under exactly one disposition.',
    correct: ['released on schedule', 'released late', 'held for parts', 'turned away'],
    overlapping: ['released on schedule', 'released late', 'released', 'held for parts', 'turned away'],
    overlappingWhy: '"Released" already contains "released on schedule" and "released late". Listing the union alongside its parts breaks mutual exclusivity and makes the probabilities sum past 1.',
    incomplete: ['released on schedule', 'released late', 'turned away'],
    incompleteWhy: 'Slots held for parts are neither released nor turned away. Leaving a real result out of the list means the four probabilities cannot sum to 1.',
    notOutcomes: ['released on schedule', 'a Sulcus hull', 'a yard-side fault', 'billed to the Compact'],
    notOutcomesWhy: 'These describe four different variables about the same refit. A single slot can be all of them at once, so they are not the possible results of one process.',
  },
]

function setText(items: string[]): string {
  return `{ ${items.join(', ')} }`
}

export const sampleSpace = defineGenerator({
  id: 'act-4/sample-space',
  label: 'A complete sample space',
  ap_topics: ['4.3'],
  skills: ['1'],
  generate(rng) {
    const ctx = pickContext(rng, SAMPLE_SPACES)
    const cands = [
      { text: setText(ctx.correct), correct: true, why: null as string | null },
      { text: setText(ctx.overlapping), correct: false, why: ctx.overlappingWhy },
      { text: setText(ctx.incomplete), correct: false, why: ctx.incompleteWhy },
      { text: setText(ctx.notOutcomes), correct: false, why: ctx.notOutcomesWhy },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${ctx.process}\n\nWhich of these is a correct **sample space** for that process â€” a list of results that are mutually exclusive and cover every case, so that exactly one of them happens on every trial?`,
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'A sample space has two properties, and both must hold: no trial can land in two of the listed results, and no trial can land outside all of them.',
        'Test each list twice. First: could one trial belong to two entries at once? Second: is there a possible result that belongs to none of them?',
      ],
      solution: `**${setText(ctx.correct)}**\n\nExactly one of these happens on every trial, and nothing else can happen, so their probabilities sum to 1 and the addition rule applies to any combination of them with no correction.\n\n- ${ctx.overlappingWhy}\n- ${ctx.incompleteWhy}\n- ${ctx.notOutcomesWhy}`,
      misconception:
        'Listing a union alongside its own parts â€” "thermal, optical, RF, any detection" â€” or listing several variables about one trial as if they were the results of one. Both break the property that makes the addition rule safe.',
    }
  },
})
