/**
 * act-4-04 · Independence — drills. AP 4.6: the two independence checks, the general addition rule,
 * the multiplication rule where it holds and where it does not, and independence stated in context.
 *
 *   act-4/independence-check          choice          independent in this table — and which check says so
 *   act-4/general-addition            numeric         P(A ∪ B) with the overlap subtracted once
 *   act-4/multiplication-independent  numeric         P(A ∩ B): scheduled passes vs consecutive re-sweeps
 *   act-4/independence-in-context     interpretation  the verdict, scoped to the file it came from
 *
 * Every table is drawn. The Ledger's loss × owner table (19/900 against 31/2,612) is act-4-04's own
 * mission beat and the consecutive-sweep table (0.55 against 0.06) is its scene, so both are in
 * RESERVED and no drill ever lands on them. Every displayed number comes from `twoWay` in @/lib/stats.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import type { Rng } from '@/lib/rng'
import { twoWay } from '@/lib/stats'
import { fmt, fmtPct } from '@/lib/stats/format'
import { independenceInContext } from './_rubrics'

// ---------------------------------------------------------------------------------------------
// In-world 2×2 files — other logs, other yards, never the Ledger and never the sweep log
// ---------------------------------------------------------------------------------------------

interface Ctx {
  /** One sentence of framing; the drawn total is interpolated for `{n}`. */
  frame: string
  rowVar: string
  rows: [string, string]
  colVar: string
  cols: [string, string]
  /** Plural noun for the individuals in the table. */
  unit: string
  /** Singular noun, for "a single entry is …". */
  one: string
  /** How the claim gets scoped: "CSV Kestrel's 2179 dwell log". */
  file: string
}

const TABLES: Ctx[] = [
  {
    frame: 'CSV *Kestrel* kept a dwell log on the 2179 Ganymede picket — {n} one-degree sweeps, filed by how long the aperture sat on the sector and by what the entry closed on.',
    rowVar: 'dwell',
    rows: ['thirty seconds or longer', 'under thirty seconds'],
    colVar: 'entry',
    cols: ['contact logged', 'nothing'],
    unit: 'sweep entries',
    one: 'sweep entry',
    file: "CSV Kestrel's 2179 dwell log",
  },
  {
    frame: 'Adlinda Yards benches every cold loop it builds. {n} acceptance runs, filed by loop build and by whether the run held the skin at 120 K for the full six hours.',
    rowVar: 'loop build',
    rows: ['series wound', 'parallel wound'],
    colVar: 'acceptance run',
    cols: ['held 120 K', 'lost the hold'],
    unit: 'acceptance runs',
    one: 'acceptance run',
    file: "the Adlinda bench file's acceptance runs",
  },
  {
    frame: 'The Uruk High departure board logs {n} outbound hulls by the watch they cleared the mast on and by whether the Authority queried the transponder at Mark 2.',
    rowVar: 'watch',
    rows: ['forenoon watch', 'middle watch'],
    colVar: 'transponder at Mark 2',
    cols: ['queried', 'clean'],
    unit: 'departures',
    one: 'departure',
    file: "the Uruk High departure board's records",
  },
  {
    frame: 'The Lane Authority tug office files {n} assists off Ceres by tug class and by whether the assist ran past its scheduled hour.',
    rowVar: 'tug class',
    rows: ['heavy tug', 'light tug'],
    colVar: 'assist',
    cols: ['ran over the hour', 'inside the hour'],
    unit: 'assists',
    one: 'assist',
    file: "the tug office's assist file",
  },
  {
    frame: "Sandoval's trim log covers {n} lithium circulation cycles this loiter, filed by which pump train ran the cycle and by whether the cycle logged a valve fault.",
    rowVar: 'pump train',
    rows: ['train A', 'train B'],
    colVar: 'cycle',
    cols: ['valve fault', 'no fault'],
    unit: 'trim cycles',
    one: 'trim cycle',
    file: "the Chief's trim log for this loiter",
  },
]

/**
 * act-4-04's own numbers: P(lost | Perrine) = 19/900, P(lost) = 31/2,612, P(lost | every other
 * owner) = 12/1,712, P(lost ∩ Perrine) = 19/2,612, P(Perrine) = 900/2,612, and the sweep log's
 * 0.55 against 0.06. A drill never re-asks any of them.
 */
const RESERVED = [19 / 900, 31 / 2612, 12 / 1712, 19 / 2612, 900 / 2612, 0.55, 0.06]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.003)
}

/** "a" or "an" for a singular noun — the contexts include an *acceptance run* and an *assist*. */
function a(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`
}

/** The same, capitalised, for the head of a sentence. */
function A(noun: string): string {
  const s = a(noun)
  return s[0].toUpperCase() + s.slice(1)
}

function columns(ctx: Ctx): string[] {
  return [ctx.rowVar, ctx.cols[0], ctx.cols[1], 'total']
}

function countRows(ctx: Ctx, counts: number[][]): (string | number)[][] {
  const rt = counts.map((r) => r[0] + r[1])
  const ct = [counts[0][0] + counts[1][0], counts[0][1] + counts[1][1]]
  return [
    [ctx.rows[0], counts[0][0], counts[0][1], rt[0]],
    [ctx.rows[1], counts[1][0], counts[1][1], rt[1]],
    ['Total', ct[0], ct[1], rt[0] + rt[1]],
  ]
}

// ---------------------------------------------------------------------------------------------
// Drawing tables that are exactly independent, or decisively not
// ---------------------------------------------------------------------------------------------

/**
 * An exactly independent 2×2: both rows are split in the same ratio c : (d − c), so every row
 * conditional equals the column marginal to the last bit. Rounding never gets a vote.
 */
function drawIndependent(r: Rng): number[][] {
  const d = r.choice([4, 5, 8, 10, 20, 25])
  const c = r.int(1, d - 1)
  const m0 = r.int(4, 14)
  const m1 = r.int(4, 14)
  return [
    [m0 * c, m0 * (d - c)],
    [m1 * c, m1 * (d - c)],
  ]
}

/** A decisively dependent 2×2: the two rows are split in ratios at least 0.14 apart. */
function drawDependent(r: Rng): number[][] {
  const rowTotals = [r.int(70, 320), r.int(70, 320)]
  const lo = r.uniform(0.15, 0.5)
  const hi = Math.min(0.88, lo + r.uniform(0.14, 0.4))
  const shares = r.bool() ? [hi, lo] : [lo, hi]
  return rowTotals.map((t, i) => {
    const a = Math.round(t * shares[i])
    return [a, t - a]
  })
}

function drawTable(rng: Rng, independent: boolean): number[][] {
  return retry(
    rng,
    (r) => (independent ? drawIndependent(r) : drawDependent(r)),
    (counts) => {
      if (counts.some((row) => row.some((c) => c < 6))) return false
      const rt = counts.map((row) => row[0] + row[1])
      const ct = [counts[0][0] + counts[1][0], counts[0][1] + counts[1][1]]
      const n = rt[0] + rt[1]
      if (rt.some((t) => t < 40) || n > 900) return false
      const cond = counts[0][0] / rt[0]
      const marg = ct[0] / n
      const reverse = counts[0][0] / ct[0]
      if (cond < 0.08 || cond > 0.92) return false
      if (Math.abs(cond - reverse) < 0.02) return false
      if (reserved(cond) || reserved(marg)) return false
      const gap = Math.abs(cond - marg)
      return independent ? gap < 1e-12 : gap >= 0.04
    },
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — is it independent in this table, and which check says so?
// ---------------------------------------------------------------------------------------------

export const independenceCheck = defineGenerator({
  id: 'act-4/independence-check',
  label: 'Independent — and which check says so?',
  ap_topics: ['4.6'],
  skills: ['1'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const independent = rng.bool()
    const counts = drawTable(rng, independent)
    const tw = twoWay(counts, { rows: [...ctx.rows], cols: [...ctx.cols] })
    const a = tw.table[0][0]
    const rowTotal = tw.rowTotals[0]
    const colTotal = tw.colTotals[0]
    const n = tw.total
    const cond = tw.rowConditional[0][0]
    const marg = tw.marginalCols[0]
    const reverse = tw.colConditional[0][0]
    const joint = tw.joint[0][0]
    const product = tw.marginalRows[0] * tw.marginalCols[0]
    const A = ctx.cols[0]
    const B = ctx.rows[0]

    const cands = [
      {
        text: `Independent — P(${A} | ${B}) = ${fmt(cond, 3)} and the marginal P(${A}) = ${fmt(marg, 3)} are the same number, so conditioning on ${B} changes nothing.`,
        correct: independent,
        why: independent ? null : `Those two numbers are not the same here: ${fmt(cond, 3)} against ${fmt(marg, 3)}. Knowing ${a(ctx.one)} is ${B} moves the probability, which is what dependence looks like in a table.`,
      },
      {
        text: `Not independent — P(${A} | ${B}) = ${fmt(cond, 3)} against a marginal P(${A}) = ${fmt(marg, 3)}, so conditioning on ${B} changes the probability.`,
        correct: !independent,
        why: !independent ? null : `Read the two numbers again: ${fmt(cond, 3)} and ${fmt(marg, 3)} are the same. In this file conditioning on ${B} changes nothing at all.`,
      },
      {
        text: `Not independent — ${A} and ${B} are mutually exclusive, so one rules the other out.`,
        correct: false,
        why: `Mutually exclusive means the two cannot both happen — and ${a} of these ${ctx.unit} are both ${B} and ${A}, so they plainly can. Mutually exclusive and independent are different ideas, and two events with positive probability cannot be both.`,
      },
      {
        text: `Not independent — P(${A} | ${B}) = ${fmt(cond, 3)} is not equal to P(${B} | ${A}) = ${fmt(reverse, 3)}, so the two conditionals disagree.`,
        correct: false,
        why: `Those two conditionals have different denominators — ${rowTotal} against ${colTotal} — so they are almost never equal, in any table, independent or not. The independence check compares a conditional with the *marginal*, not with the conditional turned around.`,
      },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)

    return {
      prompt: `${ctx.frame.replace('{n}', String(n))}\n\n${tableMd(columns(ctx), countRows(ctx, counts))}\n\nTake $A$ = the ${ctx.one} is **${A}** and $B$ = the ${ctx.one} is **${B}**. Are $A$ and $B$ independent **in this table**, and which check says so?`,
      data: tableSpec(columns(ctx), countRows(ctx, counts)),
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'There are two equivalent checks, and both compare something to a marginal: $P(A \\mid B) = P(A)$, or $P(A \\cap B) = P(A)\\,P(B)$. Neither of them compares one conditional with the other.',
        `Here $P(A \\mid B) = ${a}/${rowTotal}$ and the marginal $P(A) = ${colTotal}/${n}$. Work both out and put them side by side.`,
      ],
      solution: `$$P(A \\mid B) = \\frac{${a}}{${rowTotal}} = ${fmt(cond, 4)} \\qquad P(A) = \\frac{${colTotal}}{${n}} = ${fmt(marg, 4)}$$\n\nThe joint check says the same thing: $P(A \\cap B) = ${a}/${n} = ${fmt(joint, 4)}$ against $P(A)\\,P(B) = ${fmt(marg, 4)} \\times ${fmt(tw.marginalRows[0], 4)} = ${fmt(product, 4)}$.\n\nSo in this file $A$ and $B$ **${independent ? 'appear independent' : 'do not appear independent'}** — the conditional ${independent ? 'equals' : 'differs from'} the marginal, and the joint cell ${independent ? 'equals' : 'differs from'} the product of the margins.`,
      misconception: 'Independent and mutually exclusive are opposite ideas, not the same one. Mutually exclusive events cannot both happen, so learning that one occurred tells you the other did not — the most dependent two events can be.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the general addition rule, with the overlap subtracted exactly once
// ---------------------------------------------------------------------------------------------

export const generalAddition = defineGenerator({
  id: 'act-4/general-addition',
  label: 'General addition rule',
  ap_topics: ['4.6'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const fromTable = rng.bool()

    if (fromTable) {
      const counts = drawTable(rng, rng.bool())
      const tw = twoWay(counts, { rows: [...ctx.rows], cols: [...ctx.cols] })
      const both = tw.table[0][0]
      const rowTotal = tw.rowTotals[0]
      const colTotal = tw.colTotals[0]
      const n = tw.total
      const union = (rowTotal + colTotal - both) / n
      return {
        prompt: `${ctx.frame.replace('{n}', String(n))}\n\n${tableMd(columns(ctx), countRows(ctx, counts))}\n\nOne ${ctx.one} is drawn from the file at random. What is the probability that it is **${ctx.rows[0]}** *or* **${ctx.cols[0]}** — counting ${a(ctx.one)} that is both only once? Report a proportion to three decimal places.`,
        data: tableSpec(columns(ctx), countRows(ctx, counts)),
        answer: numericAnswer(union, 'proportion', { digits: 3 }),
        hints: [
          'The two groups overlap, so adding the two totals counts the overlap twice. The general addition rule takes it back off once: $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$.',
          `Row total for ${ctx.rows[0]}: ${rowTotal}. Column total for ${ctx.cols[0]}: ${colTotal}. The cell where they meet — the ${ctx.unit} that are both — holds ${both}, out of ${n}.`,
          `$(${rowTotal} + ${colTotal} - ${both}) / ${n}$, to three decimals.`,
        ],
        solution: `$$P(A \\cup B) = P(A) + P(B) - P(A \\cap B) = \\frac{${rowTotal}}{${n}} + \\frac{${colTotal}}{${n}} - \\frac{${both}}{${n}} = \\frac{${rowTotal + colTotal - both}}{${n}} = ${fmt(union, 4)}$$\n\nThe probability is **${fmt(union, 3)}**. Counting the ${both} ${ctx.unit} in the overlap once, not twice, is the whole of the rule.`,
        misconception: `Adding the two totals straight — $(${rowTotal} + ${colTotal})/${n} = ${fmt((rowTotal + colTotal) / n, 3)}$ — counts the ${both} ${ctx.unit} that are both ${ctx.rows[0]} and ${ctx.cols[0]} twice. When two events can happen together, $P(A) + P(B)$ is always too large.`,
      }
    }

    const { pA, pB, pBoth } = retry(
      rng,
      (r) => {
        const pBoth = r.int(4, 16) / 100
        return { pBoth, pA: pBoth + r.int(9, 34) / 100, pB: pBoth + r.int(9, 34) / 100 }
      },
      ({ pA, pB, pBoth }) => pA <= 0.8 && pB <= 0.8 && pA + pB - pBoth <= 0.95 && Math.abs(pA - pB) > 0.02,
    )
    const union = pA + pB - pBoth
    return {
      prompt: `${ctx.frame.replace('{n}', 'several hundred')}\n\nThe office quotes three figures off the file. ${A(ctx.one)} drawn at random is **${ctx.rows[0]}** with probability ${fmt(pA, 2)}; it is **${ctx.cols[0]}** with probability ${fmt(pB, 2)}; and it is both with probability ${fmt(pBoth, 2)}.\n\nWhat is the probability that ${a(ctx.one)} drawn at random is ${ctx.rows[0]} *or* ${ctx.cols[0]} (or both)? Report a proportion to three decimal places.`,
      answer: numericAnswer(union, 'proportion', { digits: 3 }),
      hints: [
        'These two events are not mutually exclusive — the third figure says so. Use the general addition rule, which subtracts the overlap once.',
        `$P(A) = ${fmt(pA, 2)}$, $P(B) = ${fmt(pB, 2)}$, $P(A \\cap B) = ${fmt(pBoth, 2)}$.`,
        `$${fmt(pA, 2)} + ${fmt(pB, 2)} - ${fmt(pBoth, 2)}$, to three decimals.`,
      ],
      solution: `$$P(A \\cup B) = P(A) + P(B) - P(A \\cap B) = ${fmt(pA, 2)} + ${fmt(pB, 2)} - ${fmt(pBoth, 2)} = ${fmt(union, 4)}$$\n\nThe probability is **${fmt(union, 3)}**.`,
      misconception: `Treating the two as mutually exclusive gives ${fmt(pA, 2)} + ${fmt(pB, 2)} = ${fmt(pA + pB, 3)}, which counts every ${ctx.one} in the overlap twice. The rule $P(A \\cup B) = P(A) + P(B)$ holds only when $P(A \\cap B) = 0$, and here it is ${fmt(pBoth, 2)}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — P(A ∩ B): scheduled passes multiply, consecutive re-sweeps do not
// ---------------------------------------------------------------------------------------------

interface IndepCtx {
  setup: string
  eventA: string
  eventB: string
  why: string
}

const INDEPENDENT_SETTINGS: IndepCtx[] = [
  {
    setup: 'Two hulls sit on the public Lane plot for close passes of the loiter point inside the same Watch window — different owners, different tracks, filed months apart, and neither master aware the other is there.',
    eventA: "the Eyes hold a clean identification on the first hull's pass",
    eventB: 'the Eyes hold a clean identification on the second',
    why: 'Two hulls scheduled independently by two offices. Nothing that happens on the first pass reaches the second.',
  },
  {
    setup: 'DS-05 meters the six Watch-profile subsystem loads separately and treats them as independent: the cryocooler does not know what the sensor processors are drawing.',
    eventA: 'computing draws above its mean in a given hour',
    eventB: 'the cryocooler loops draw above theirs in the same hour',
    why: 'Separate loads on separate buses, each with its own spread. The Chief signs for them one at a time.',
  },
  {
    setup: 'Two sweep patterns a day apart, walked across sectors that do not touch, with no detection in between to buy either sector a second look.',
    eventA: 'the forenoon pattern logs a thermal contact',
    eventB: 'the pattern a day later logs one',
    why: 'Different sectors, different watch, and no re-sweep rule connecting them.',
  },
]

interface DepCtx {
  setup: string
  marginal: string
  conditional: string
}

const DEPENDENT_SETTINGS: DepCtx[] = [
  {
    setup: 'The 2179 Ganymede picket ran the doctrine *Nightjar* runs: a detection buys the same sector a second look straight away, so two consecutive entries are not two draws of one coin.',
    marginal: 'a sweep entry detects something',
    conditional: 'the next entry in the same sector detects, given the one before it did',
  },
  {
    setup: 'The Ceres receiving office reweighs any hull whose first weigh disagrees with the manifest, and the reweigh is done on the same scale by the same watch.',
    marginal: 'a weigh disagrees with the manifest',
    conditional: 'the reweigh disagrees as well, given the first weigh did',
  },
]

export const multiplicationIndependent = defineGenerator({
  id: 'act-4/multiplication-independent',
  label: 'Multiplication rule — and where it fails',
  ap_topics: ['4.6'],
  skills: ['3'],
  generate(rng) {
    const independent = rng.bool()

    if (independent) {
      const ctx = pickContext(rng, INDEPENDENT_SETTINGS)
      const { p1, p2 } = retry(
        rng,
        (r) => ({ p1: r.int(15, 75) / 100, p2: r.int(15, 75) / 100 }),
        ({ p1, p2 }) => Math.abs(p1 - p2) > 0.03 && !reserved(p1 * p2),
      )
      const both = p1 * p2
      return {
        prompt: `${ctx.setup}\n\nThe two events are **independent**. $P(${ctx.eventA}) = ${fmt(p1, 2)}$ and $P(${ctx.eventB}) = ${fmt(p2, 2)}$.\n\nWhat is the probability that **both** happen? Report a proportion to three decimal places.`,
        answer: numericAnswer(both, 'proportion', { digits: 3 }),
        hints: [
          'When two events are independent, the second one does not care what the first did — so the conditional probability is just the plain probability and the joint is a product.',
          `$P(A \\cap B) = P(A) \\times P(B) = ${fmt(p1, 2)} \\times ${fmt(p2, 2)}$. ${ctx.why}`,
        ],
        solution: `Independence means $P(B \\mid A) = P(B)$, so the general multiplication rule collapses to a product:\n\n$$P(A \\cap B) = P(A)\\,P(B) = ${fmt(p1, 2)} \\times ${fmt(p2, 2)} = ${fmt(both, 4)}$$\n\nThe probability is **${fmt(both, 3)}**. ${ctx.why}`,
        misconception: `Adding instead of multiplying gives ${fmt(p1 + p2, 2)}, which is the answer to a different question — and for two events that can happen together it is not even the answer to *that* one. "Both" multiplies; "either" adds and then subtracts the overlap.`,
      }
    }

    const ctx = pickContext(rng, DEPENDENT_SETTINGS)
    const { q, c } = retry(
      rng,
      (r) => ({ q: r.int(9, 26) / 100, c: r.int(42, 78) / 100 }),
      ({ q, c }) => c - q >= 0.25 && !reserved(q * c),
    )
    const both = q * c
    const naive = q * q
    return {
      prompt: `${ctx.setup}\n\nOver the whole file, $P(${ctx.marginal}) = ${fmt(q, 2)}$. But $P(${ctx.conditional}) = ${fmt(c, 2)}$.\n\nThese two events are **not** independent — the setup says why. What is the probability that **both** happen? Report a proportion to three decimal places.`,
      answer: numericAnswer(both, 'proportion', { digits: 3 }),
      hints: [
        'The general multiplication rule always holds: $P(A \\cap B) = P(A)\\,P(B \\mid A)$. Only when the two are independent does $P(B \\mid A)$ collapse to $P(B)$, and here it plainly does not.',
        `$P(A) = ${fmt(q, 2)}$ is the first factor. The second factor is the *conditional*, ${fmt(c, 2)}, not the overall rate.`,
        `$${fmt(q, 2)} \\times ${fmt(c, 2)}$, to three decimals.`,
      ],
      solution: `$$P(A \\cap B) = P(A)\\,P(B \\mid A) = ${fmt(q, 2)} \\times ${fmt(c, 2)} = ${fmt(both, 4)}$$\n\nThe probability is **${fmt(both, 3)}**. The second factor is the conditional rate, because the first event changes what the second one is.`,
      misconception: `Multiplying the overall rate by itself — $${fmt(q, 2)} \\times ${fmt(q, 2)} = ${fmt(naive, 3)}$ — assumes independence, and the file says the two are not independent. That is the error that makes a run of consecutive detections look ${fmt(both / naive, 1)} times rarer than it is.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — the verdict, scoped to the file it came from
// ---------------------------------------------------------------------------------------------

export const independenceInContextDrill = defineGenerator({
  id: 'act-4/independence-in-context',
  label: 'Independence in context',
  ap_topics: ['4.6'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, TABLES)
    const independent = rng.bool()
    const counts = drawTable(rng, independent)
    const tw = twoWay(counts, { rows: [...ctx.rows], cols: [...ctx.cols] })
    const conditional = tw.rowConditional[0][0]
    const marginal = tw.marginalCols[0]
    const eventA = ctx.cols[0]
    const eventB = ctx.rows[0]
    const rubric = independenceInContext({
      independent,
      eventA,
      eventB,
      conditional,
      marginal,
      file: ctx.file,
    })
    const pctRows: (string | number)[][] = [
      [ctx.rows[0], fmtPct(tw.rowConditional[0][0], 1), fmtPct(tw.rowConditional[0][1], 1), `n = ${tw.rowTotals[0]}`],
      [ctx.rows[1], fmtPct(tw.rowConditional[1][0], 1), fmtPct(tw.rowConditional[1][1], 1), `n = ${tw.rowTotals[1]}`],
      ['all ' + ctx.unit, fmtPct(tw.marginalCols[0], 1), fmtPct(tw.marginalCols[1], 1), `n = ${tw.total}`],
    ]
    return {
      prompt: `${ctx.frame.replace('{n}', String(tw.total))}\n\nRow percentages — the conditional distribution of ${ctx.colVar} within each ${ctx.rowVar}, with the marginal underneath:\n\n${tableMd([ctx.rowVar, ctx.cols[0], ctx.cols[1], 'group size'], pctRows)}\n\nIn one or two sentences, say whether **${eventA}** and **${eventB}** appear independent in this file. Quote both numbers you are comparing — $P(${eventA} \\mid ${eventB})$ and the marginal $P(${eventA})$ — reach a verdict, and scope the claim to ${ctx.file}.`,
      data: tableSpec([ctx.rowVar, ctx.cols[0], ctx.cols[1], 'group size'], pctRows),
      answer: rubric,
      hints: [
        'Independence means the "given" changes nothing: $P(A \\mid B) = P(A)$. Compare the conditional with the marginal, not with the other conditional.',
        `The row for ${eventB} gives $P(${eventA} \\mid ${eventB}) = ${fmt(conditional, 4)}$; the bottom row gives the marginal $P(${eventA}) = ${fmt(marginal, 4)}$.`,
        `Write it as a comparison with both numbers in it, then say whether they ${independent ? 'agree' : 'differ'} — and say which file the claim is about. Whether it holds outside ${ctx.file} is an inference this table cannot make.`,
      ],
      solution: `${rubric.exemplar}\n\nTwo things sink this sentence more often than the arithmetic does. The first is calling the two events *mutually exclusive*: that would mean they cannot both happen, and ${tw.table[0][0]} of these ${ctx.unit} are both. The second is letting the verdict escape the file — a table of records describes the records, and nothing in it says what acts on what.`,
      misconception: 'Independence compares a conditional with a marginal. Comparing the two conditionals with each other, or reading "mutually exclusive" as "independent", are the two ways this sentence goes wrong.',
    }
  },
})
