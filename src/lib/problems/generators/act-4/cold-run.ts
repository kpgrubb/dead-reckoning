/**
 * act-4-05 · Distribution of a Cold Run — drills. AP 4.7: a discrete random variable as a table of
 * values and probabilities, P(X = k), P(X ≤ k), P(X > k), the boundary cell that "≥" keeps and ">"
 * throws away, a table that does not sum to one, and probability as area under a density.
 *
 *   act-4/pmf-cumulative           numeric  P(X ≤ k) or P(X > k) off a drawn pmf  (checkpoint q7)
 *   act-4/pmf-strict-vs-inclusive  numeric  P(X ≥ k) against P(X > k) on the same drawn table
 *   act-4/fix-the-pmf              numeric  the value the missing or mistyped cell must take
 *   act-4/discrete-or-continuous   choice   which kind of variable, and which question it answers
 *   act-4/density-area             numeric  probability as area under a normal density
 *
 * RESERVED — act-4-05's own scene, instrument and mission beat. No drill lands on any of them:
 *   · the Chief's cold-hours table — support 44…80 by 4, p = 0.05, 0.11, 0.12, 0.17, 0.19, 0.15,
 *     0.10, 0.07, 0.03, 0.01, E[X] = 59.16 h, SD 8.30 h — and the Ensign's version summing to 1.04;
 *   · the mission beat P(X > 64) = 0.21, and the figures beside it: P(X ≥ 64) = 0.36, p(64) = 0.15;
 *   · the sink-temperature density, N(240, 9) °C at hour 60 of a Watch run.
 * Every drawn support is a different quantity in different units, and `reserved()` refuses any
 * answer that lands on the beat's number. Every probability below comes from `discreteRV` /
 * `rvCdf` / `rvProb` / `normal.*` in @/lib/stats — nothing here is hand-computed.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import type { Rng } from '@/lib/rng'
import { discreteRV, normal, rvCdf, rvProb } from '@/lib/stats'
import { fmt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Reserved numbers: act-4-05's own beat and the two figures printed beside it.
// ---------------------------------------------------------------------------------------------

const RESERVED = [0.21, 0.36]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.005)
}

/** The sink-temperature density the module's continuous half is built on. No drill redraws it. */
const RESERVED_DENSITY = { mean: 240, sd: 9 }

// ---------------------------------------------------------------------------------------------
// Discrete contexts — other logs, other offices, never the cold-hours table
// ---------------------------------------------------------------------------------------------

interface PmfCtx {
  /** One sentence of framing, ending before the table. */
  frame: string
  /** The random variable, as a noun phrase: "the number of close passes". */
  variable: string
  /** The trial the variable is counted over: "a 64-hour window". */
  trial: string
  /** Column head for the support. */
  xLabel: string
  /** Plural noun for a value: "close passes". */
  valueNoun: string
  values: number[]
}

const PMFS: PmfCtx[] = [
  {
    frame: 'Two years of the public Lane plot, read off by watch: how many hulls pass inside 2.6 million kilometres of the far loiter point during a single 64-hour window.',
    variable: 'the number of close passes',
    trial: 'a 64-hour window at the far point',
    xLabel: 'close passes x',
    valueNoun: 'close passes',
    values: [0, 1, 2, 3, 4, 5],
  },
  {
    frame: "CSV *Kestrel*'s 2179 picket file records how many sectors the Eyes had to go back to before a twelve-sector pattern closed.",
    variable: 'the number of re-swept sectors',
    trial: 'one twelve-sector pattern',
    xLabel: 're-swept sectors x',
    valueNoun: 're-swept sectors',
    values: [0, 1, 2, 3, 4],
  },
  {
    frame: 'The Adlinda yard files every cold-loop acceptance run by how many valve faults the trim log recorded over the six hours.',
    variable: 'the number of valve faults',
    trial: 'one six-hour acceptance run',
    xLabel: 'valve faults x',
    valueNoun: 'valve faults',
    values: [0, 1, 2, 3, 4],
  },
  {
    frame: 'The Lane Authority tug office off Ceres files each assist by how many whole hours it ran past its scheduled release.',
    variable: 'the number of hours over schedule',
    trial: 'one tug assist',
    xLabel: 'hours over x',
    valueNoun: 'hours',
    values: [0, 1, 2, 3, 4, 5],
  },
  {
    frame: "A Service surveyor's log of twenty-day loiters on the Themis Reach gives the number of purges each loiter cost, radiators out, at 2.6 hours apiece.",
    variable: 'the number of purges',
    trial: 'a twenty-day cold loiter',
    xLabel: 'purges x',
    valueNoun: 'purges',
    values: [3, 4, 5, 6, 7, 8],
  },
  {
    frame: 'The Uruk High departure board files each outbound hull by how many transponder queries the Authority raised against it before Mark 2.',
    variable: 'the number of queries raised',
    trial: 'one outbound hull',
    xLabel: 'queries x',
    valueNoun: 'queries',
    values: [0, 1, 2, 3, 4],
  },
]

/** Round to hundredths and repair the rounding drift onto the mode, so the table sums to exactly 1. */
function roundToOne(raw: number[]): number[] {
  const total = raw.reduce((a, b) => a + b, 0)
  const rounded = raw.map((x) => Math.round((x / total) * 100) / 100)
  const drift = Math.round((1 - rounded.reduce((a, b) => a + b, 0)) * 100) / 100
  const mode = rounded.indexOf(Math.max(...rounded))
  rounded[mode] = Math.round((rounded[mode] + drift) * 100) / 100
  return rounded
}

/** A unimodal table in hundredths: every cell at least 0.03, the mass really spread over the support. */
function drawPmf(rng: Rng, n: number): number[] {
  return retry(
    rng,
    (r) => {
      const mode = r.int(1, n - 2)
      const spread = r.uniform(1.0, 2.2)
      return roundToOne(Array.from({ length: n }, (_, i) => Math.exp(-((i - mode) ** 2) / (2 * spread * spread)) * r.uniform(0.85, 1.15)))
    },
    (probs) => {
      if (probs.some((p) => p < 0.03)) return false
      if (Math.max(...probs) > 0.55) return false
      return Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-9
    },
  )
}

function pmfTable(ctx: PmfCtx, probs: number[]): { columns: string[]; rows: (string | number)[][] } {
  return {
    columns: [ctx.xLabel, 'p(x)'],
    rows: ctx.values.map((v, i) => [v, fmt(probs[i], 2)]),
  }
}

/** "0.04 + 0.11 + 0.19" — the cells of a sum, written out. */
function sumOf(probs: number[], keep: (i: number) => boolean): string {
  return probs.map((p, i) => (keep(i) ? fmt(p, 2) : null)).filter((s): s is string => s !== null).join(' + ')
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — P(X ≤ k) or P(X > k) from a drawn table (checkpoint q7)
// ---------------------------------------------------------------------------------------------

export const pmfCumulative = defineGenerator({
  id: 'act-4/pmf-cumulative',
  label: 'A cumulative probability from a table',
  ap_topics: ['4.7'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, PMFS)
    const atMost = rng.bool()
    const { probs, k } = retry(
      rng,
      (r) => {
        const probs = drawPmf(r, ctx.values.length)
        return { probs, k: ctx.values[r.int(0, ctx.values.length - 2)] }
      },
      ({ probs, k }) => {
        const rv = discreteRV(ctx.values, probs)
        const p = atMost ? rvCdf(rv, k) : rvProb(rv, (x) => x > k)
        return p > 0.1 && p < 0.9 && !reserved(p)
      },
    )
    const rv = discreteRV(ctx.values, probs)
    const value = atMost ? rvCdf(rv, k) : rvProb(rv, (x) => x > k)
    const keep = (i: number) => (atMost ? ctx.values[i] <= k : ctx.values[i] > k)
    const other = atMost ? rvProb(rv, (x) => x > k) : rvCdf(rv, k)
    const kept = ctx.values.filter((_, i) => keep(i))
    const table = pmfTable(ctx, probs)
    const phrase = atMost ? `**at most ${k}**` : `**more than ${k}**`
    const tex = atMost ? `P(X \\le ${k})` : `P(X > ${k})`

    return {
      prompt: `${ctx.frame}\n\nLet $X$ be ${ctx.variable} in ${ctx.trial}. The file gives its distribution:\n\n${tableMd(table.columns, table.rows)}\n\nOne ${ctx.trial.replace(/^an? /, '')} is drawn from the file at random. What is the probability that $X$ is ${phrase}? Report a probability to three decimal places.`,
      data: tableSpec(table.columns, table.rows),
      answer: numericAnswer(value, 'proportion', { digits: 3 }),
      hints: [
        'A probability about a range of values on a discrete table is the sum of the cells in that range — no more and no less. Decide first which values the wording keeps.',
        `"${atMost ? `At most ${k}` : `More than ${k}`}" keeps ${kept.join(', ')} — ${atMost ? `the ${k} itself is inside "at most"` : `the ${k} itself is outside "more than"`}.`,
        `$${sumOf(probs, keep)}$.`,
      ],
      solution: `$$${tex} = ${sumOf(probs, keep)} = ${fmt(value, 4)}$$\n\nThe probability is **${fmt(value, 3)}**. Everything the wording excluded is the complement, $${fmt(other, 4)}$, and the two add to 1 because the table does.`,
      misconception: `Sliding the boundary by one cell. ${atMost ? `"At most ${k}" includes ${k}; dropping it leaves ${fmt(rvCdf(rv, k) - rvProb(rv, (x) => x === k), 3)}, which is the answer to "fewer than ${k}".` : `"More than ${k}" excludes ${k}; keeping it gives ${fmt(rvProb(rv, (x) => x >= k), 3)}, which is the answer to "at least ${k}".`} On a discrete variable that cell is a real quantity of probability — ${fmt(rvProb(rv, (x) => x === k), 2)} of it — and not a rounding detail.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the off-by-one: P(X ≥ k) against P(X > k) on the same table
// ---------------------------------------------------------------------------------------------

export const pmfStrictVsInclusive = defineGenerator({
  id: 'act-4/pmf-strict-vs-inclusive',
  label: 'At least, against more than',
  ap_topics: ['4.7'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, PMFS)
    const askInclusive = rng.bool()
    const { probs, k } = retry(
      rng,
      (r) => {
        const probs = drawPmf(r, ctx.values.length)
        return { probs, k: ctx.values[r.int(1, ctx.values.length - 2)] }
      },
      ({ probs, k }) => {
        const rv = discreteRV(ctx.values, probs)
        const cell = rvProb(rv, (x) => x === k)
        const asked = askInclusive ? rvProb(rv, (x) => x >= k) : rvProb(rv, (x) => x > k)
        return cell >= 0.08 && asked > 0.08 && asked < 0.92 && !reserved(asked)
      },
    )
    const rv = discreteRV(ctx.values, probs)
    const cell = rvProb(rv, (x) => x === k)
    const inclusive = rvProb(rv, (x) => x >= k)
    const strict = rvProb(rv, (x) => x > k)
    const value = askInclusive ? inclusive : strict
    const given = askInclusive ? strict : inclusive
    const table = pmfTable(ctx, probs)
    const givenTex = askInclusive ? `P(X > ${k}) = ${fmt(strict, 2)}` : `P(X \\ge ${k}) = ${fmt(inclusive, 2)}`
    const askedTex = askInclusive ? `P(X \\ge ${k})` : `P(X > ${k})`
    const askedWords = askInclusive ? `**at least ${k}**` : `**more than ${k}**`

    return {
      prompt: `${ctx.frame}\n\nLet $X$ be ${ctx.variable} in ${ctx.trial}:\n\n${tableMd(table.columns, table.rows)}\n\nThe watch officer has filed one figure off this table: $${givenTex}$. The line the Chief actually asked for is the probability that $X$ is ${askedWords}.\n\nWhat is $${askedTex}$? Report a probability to three decimal places.`,
      data: tableSpec(table.columns, table.rows),
      answer: numericAnswer(value, 'proportion', { digits: 3 }),
      hints: [
        'The two questions differ by exactly one cell of the table: the cell sitting on the boundary. "At least" keeps it; "more than" does not.',
        `The boundary cell here is $p(${k}) = ${fmt(cell, 2)}$, and the filed figure is ${fmt(given, 2)}.`,
        `$${fmt(given, 2)} ${askInclusive ? '+' : '-'} ${fmt(cell, 2)}$.`,
      ],
      solution: `$$P(X \\ge ${k}) = P(X > ${k}) + p(${k}) = ${fmt(strict, 2)} + ${fmt(cell, 2)} = ${fmt(inclusive, 4)}$$\n\nSo $${askedTex} = ${fmt(value, 4)}$ — **${fmt(value, 3)}**. The two answers differ by the whole of the cell at ${k}, ${fmt(cell, 2)}, which is ${fmtPct(cell, 0)} of the ${ctx.valueNoun.replace(/s$/, '')} distribution and not a rounding difference.\n\nOn a *continuous* variable there would be no cell at the boundary at all: a density gives zero probability to a single point, and $P(X \\ge k)$ and $P(X > k)$ are the same number. That is the one place the two kinds of variable genuinely behave differently.`,
      misconception: `Reporting the filed figure, ${fmt(given, 3)}, for the question that was asked. On a discrete table the boundary belongs to one side of the inequality or the other, and here that decision is worth ${fmt(cell, 2)} of probability.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — the cell that makes the table a probability distribution
// ---------------------------------------------------------------------------------------------

export const fixThePmf = defineGenerator({
  id: 'act-4/fix-the-pmf',
  label: 'Make the table sum to one',
  ap_topics: ['4.7'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, PMFS)
    const missing = rng.bool()
    const { probs, j, drift } = retry(
      rng,
      (r) => {
        const probs = drawPmf(r, ctx.values.length)
        const j = r.int(0, ctx.values.length - 1)
        const steps = r.int(2, 9) * (r.bool() ? 1 : -1)
        return { probs, j, drift: Math.round(steps) / 100 }
      },
      ({ probs, j, drift }) => {
        if (missing) return probs[j] >= 0.06 && probs[j] <= 0.5
        const shown = Math.round((probs[j] + drift) * 100) / 100
        return shown >= 0.02 && shown <= 0.6 && Math.abs(drift) >= 0.02
      },
    )
    const correct = probs[j]
    const x = ctx.values[j]
    const others = probs.filter((_, i) => i !== j)
    const othersTotal = others.reduce((a, b) => a + b, 0)

    if (missing) {
      const rows: (string | number)[][] = ctx.values.map((v, i) => [v, i === j ? '?' : fmt(probs[i], 2)])
      const columns = [ctx.xLabel, 'p(x)']
      return {
        prompt: `${ctx.frame}\n\nLet $X$ be ${ctx.variable} in ${ctx.trial}. The table came up the mast with one cell unreadable:\n\n${tableMd(columns, rows)}\n\nWhat must $p(${x})$ be for this table to be a probability distribution at all? Report a probability to three decimal places.`,
        data: tableSpec(columns, rows),
        answer: numericAnswer(correct, 'proportion', { digits: 3 }),
        hints: [
          'A probability model owes you two things and nothing else: every cell at least zero, and the cells summing to exactly one. The second one fixes the missing cell.',
          `The cells you can read add to ${fmt(othersTotal, 2)}.`,
          `$1 - ${fmt(othersTotal, 2)}$.`,
        ],
        solution: `The readable cells sum to\n\n$$${sumOf(probs, (i) => i !== j)} = ${fmt(othersTotal, 2)}$$\n\nand every outcome is somewhere in the table, so\n\n$$p(${x}) = 1 - ${fmt(othersTotal, 2)} = ${fmt(correct, 4)}$$\n\nThe missing cell is **${fmt(correct, 3)}**. Check it: the repaired table sums to ${fmt(othersTotal + correct, 2)}, every cell is non-negative, and the expected value ${fmt(discreteRV(ctx.values, probs).mean, 2)} ${ctx.valueNoun} can now be computed — on a table that does not sum to one, none of that arithmetic means anything.`,
        misconception: `Reading a table that sums to ${fmt(othersTotal, 2)} as if it were already a distribution. Every probability computed off it is wrong by the same factor, and in the direction that flatters whoever filed it: the missing ${fmtPct(correct, 0)} has to be *somewhere*.`,
      }
    }

    const shown = Math.round((correct + drift) * 100) / 100
    const filed = probs.map((p, i) => (i === j ? shown : p))
    const filedTotal = filed.reduce((a, b) => a + b, 0)
    const rows: (string | number)[][] = ctx.values.map((v, i) => [v, fmt(filed[i], 2)])
    const columns = [ctx.xLabel, 'p(x)']
    return {
      prompt: `${ctx.frame}\n\nLet $X$ be ${ctx.variable} in ${ctx.trial}. The table as filed:\n\n${tableMd(columns, rows)}\n\nIt does not sum to one. The watch swears every cell but the one at $x = ${x}$ was copied correctly off the log.\n\nWhat must $p(${x})$ be instead? Report a probability to three decimal places.`,
      data: tableSpec(columns, rows),
      answer: numericAnswer(correct, 'proportion', { digits: 3 }),
      hints: [
        'Add the cells as filed and see how far from 1 the table is. Every hundredth of that gap belongs to the one cell the watch is not sure of.',
        `As filed the table sums to ${fmt(filedTotal, 2)} — that is ${fmt(Math.abs(filedTotal - 1), 2)} ${filedTotal > 1 ? 'too much' : 'too little'}. The other cells add to ${fmt(othersTotal, 2)}.`,
        `$1 - ${fmt(othersTotal, 2)}$.`,
      ],
      solution: `As filed the table sums to $${fmt(filedTotal, 2)}$, so it is not a probability distribution: ${filedTotal > 1 ? 'there is more than the whole outcome space in it' : 'part of the outcome space is missing'}.\n\nThe cells that are not in dispute sum to $${fmt(othersTotal, 2)}$, so the one that is must carry the rest:\n\n$$p(${x}) = 1 - ${fmt(othersTotal, 2)} = ${fmt(correct, 4)}$$\n\nThe corrected cell is **${fmt(correct, 3)}** — the filed ${fmt(shown, 2)} was ${fmt(Math.abs(drift), 2)} ${drift > 0 ? 'too large' : 'too small'}. With it repaired the table sums to 1 and $E[X] = ${fmt(discreteRV(ctx.values, probs).mean, 2)}$ ${ctx.valueNoun}.`,
      misconception: `Normalising the whole table — dividing every cell by ${fmt(filedTotal, 2)} — when the watch has told you where the error is. That spreads one cell's mistake across every value of $X$ and changes numbers nobody questioned.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — discrete or continuous, and which probability question has an answer
// ---------------------------------------------------------------------------------------------

interface KindCtx {
  discrete: boolean
  /** The quantity, as a noun phrase. */
  quantity: string
  /** How it is recorded — the sentence that decides the answer. */
  recorded: string
  /** A value to ask P(X = ·) about. */
  point: string
  /** An interval, for the continuous option. */
  interval: [string, string]
  units: string
}

const KINDS: KindCtx[] = [
  {
    discrete: true,
    quantity: 'the number of hulls that pass inside 2.6 million kilometres of the loiter point in one Watch window',
    recorded: 'Every pass is one hull or none; the plot cannot show two and a half of them.',
    point: '3',
    interval: ['2', '5'],
    units: 'passes',
  },
  {
    discrete: true,
    quantity: 'the number of purges a twenty-day loiter costs',
    recorded: 'The wings go out or they do not. A half purge is not a thing the Chief can log.',
    point: '6',
    interval: ['4', '7'],
    units: 'purges',
  },
  {
    discrete: true,
    quantity: 'the number of sectors the Eyes re-sweep before a twelve-sector pattern closes',
    recorded: 'Sectors are counted, one at a time, and the count lands on a whole number every watch.',
    point: '2',
    interval: ['1', '3'],
    units: 'sectors',
  },
  {
    discrete: false,
    quantity: 'the skin temperature under the parasol at the end of a cold watch',
    recorded: 'The cryo loops hold it near 120 K and the gauge reads to as many decimals as you ask it for.',
    point: '120.0 K',
    interval: ['118.5 K', '121.5 K'],
    units: 'K',
  },
  {
    discrete: false,
    quantity: 'the range at closest approach of a scheduled pass, in kilometres',
    recorded: 'A range is a distance. Between any two ranges the Eyes can report, there is another one.',
    point: '1,400,000 km',
    interval: ['1,200,000 km', '1,600,000 km'],
    units: 'km',
  },
  {
    discrete: false,
    quantity: 'the number of hours a purge actually runs before the cellar is down to five percent',
    recorded: 'The design figure is 2.6 hours and the log records it to the second; no two purges run the same length.',
    point: '2.60 h',
    interval: ['2.4 h', '2.8 h'],
    units: 'h',
  },
  {
    discrete: false,
    quantity: 'the lithium loop pressure at the moment the wings come in',
    recorded: 'The gauge is analogue and the trim log writes down whatever it is pointing at, to the tenth of a kilopascal.',
    point: '480.0 kPa',
    interval: ['470 kPa', '490 kPa'],
    units: 'kPa',
  },
]

export const discreteOrContinuous = defineGenerator({
  id: 'act-4/discrete-or-continuous',
  label: 'Discrete or continuous — and which question has an answer',
  ap_topics: ['4.7'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, KINDS)
    const [lo, hi] = ctx.interval
    const cands = [
      {
        text: `Discrete. The values it can take can be listed, so $P(X = ${ctx.point})$ is a real, positive probability read straight off a table — and $P(X \\ge ${ctx.point})$ and $P(X > ${ctx.point})$ are different numbers.`,
        correct: ctx.discrete,
        why: ctx.discrete ? null : `${ctx.recorded} Between any two values it can report there is another one, so the values cannot be listed and no table of them can carry the probability.`,
      },
      {
        text: `Continuous. It can take any value in a range, so $P(X = ${ctx.point})$ is zero and only an interval carries probability: ask for $P(${lo} \\le X \\le ${hi})$, the area under the density. For the same reason $P(X \\ge ${ctx.point})$ and $P(X > ${ctx.point})$ are the same number.`,
        correct: !ctx.discrete,
        why: !ctx.discrete ? null : `${ctx.recorded} The values can be listed, so each one carries a lump of probability of its own — and on a table the boundary value belongs to one side of an inequality or the other.`,
      },
      {
        text: `Continuous — and $P(X = ${ctx.point})$ can be read off the height of the density curve at ${ctx.point}.`,
        correct: false,
        why: 'The height of a density is probability *per unit* of the axis, not probability. It can be any positive number at all — for a narrow enough spread it exceeds 1 — and only height times width is a probability. A point has zero width.',
      },
      {
        text: `Discrete — every instrument records to a finite precision, so the values are a finite list and $P(X = ${ctx.point})$ is zero for every value on it.`,
        correct: false,
        why: 'Those two halves contradict each other: on a finite list of values the probabilities are lumps that sum to one, so they cannot all be zero. Recording precision is a property of the gauge, not of the quantity being modelled.',
      },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)

    return {
      prompt: `The Chief's load budget models ${ctx.quantity} as a random variable.\n\n> ${ctx.recorded}\n\nIs $X$ discrete or continuous — and which probability question does that make answerable?`,
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Ask whether the values can be listed. Counts can: 0, 1, 2, 3, and nothing in between. Measurements cannot: between any two of them there is another one.',
        'Then ask what that does to $P(X = x)$. On a listed set of values it is a lump you can read off a table; on a continuous range it is zero, and probability only exists over an interval.',
      ],
      solution: `${ctx.recorded} So $X$ is **${ctx.discrete ? 'discrete' : 'continuous'}**.\n\n${
        ctx.discrete
          ? `Its values can be listed, each one carries a probability of its own, and those probabilities sum to 1. $P(X = ${ctx.point})$ is a number you point at. Because the mass sits in cells, the boundary matters: $P(X \\ge ${ctx.point})$ and $P(X > ${ctx.point})$ differ by exactly the cell at ${ctx.point}.`
          : `Its values cannot be listed, so no cell can carry probability on its own: $P(X = ${ctx.point}) = 0$. Probability lives in **area** — $P(${lo} \\le X \\le ${hi})$ is the area under the density between those two readings, and the density's height at a point is probability per unit, not probability. Because no point carries mass, $P(X \\ge ${ctx.point})$ and $P(X > ${ctx.point})$ are the same number.`
      }\n\nBoth kinds hand out a total of one. The discrete model puts it in lumps you can point at; the continuous model spreads it along an axis so that only intervals carry any.`,
      misconception: 'Reading a density curve as if its height were a probability, or treating a measured quantity as discrete because the gauge rounds. The height of a density is probability per unit of the axis; a probability comes from multiplying it by a width.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — probability as area under a density
// ---------------------------------------------------------------------------------------------

interface DensityCtx {
  /** The quantity, as a noun phrase: "the skin temperature under the parasol". */
  quantity: string
  /** One sentence of framing. */
  frame: string
  /** The unit of observation, singular: "cold watch". */
  trial: string
  units: string
  meanRange: [number, number]
  sdRange: [number, number]
  /** Decimals for the mean, SD and the cut values. */
  digits: number
}

const DENSITIES: DensityCtx[] = [
  {
    quantity: 'the skin temperature under the parasol at the end of a cold watch',
    frame: 'The cryo loops hold the skin against the parasol, and the gauge writes down what it holds it at. Over this loiter the log is well described by a normal density.',
    trial: 'cold watch',
    units: 'K',
    meanRange: [118, 124],
    sdRange: [1.5, 4],
    digits: 1,
  },
  {
    quantity: 'the dwell the Eyes book on one sector of a sweep pattern',
    frame: "The Eyes hold a sector for as long as the aperture needs and the sweep log records it to the second. *Kestrel*'s 2179 picket file fits a normal density to the dwell.",
    trial: 'sector dwell',
    units: 's',
    meanRange: [20, 30],
    sdRange: [3, 7],
    digits: 1,
  },
  {
    quantity: 'the hours a purge runs before the cellar is down to five percent',
    frame: 'The design figure is 2.6 hours with the radiators out. The Chief has the last sixty purges from three hulls of the class and fits a normal density to them.',
    trial: 'purge',
    units: 'h',
    meanRange: [2.4, 2.9],
    sdRange: [0.1, 0.3],
    digits: 2,
  },
  {
    quantity: 'the lithium loop pressure at the moment the wings come in',
    frame: "Sandoval's trim log writes the loop pressure down at the end of every purge, to the tenth of a kilopascal, and the file is comfortably normal.",
    trial: 'purge',
    units: 'kPa',
    meanRange: [460, 500],
    sdRange: [12, 30],
    digits: 1,
  },
  {
    quantity: 'the declared mass of one He-3/D lot arriving at Ceres',
    frame: 'The Ceres receiving office weighs every lot that comes off the Lane. Over six years the declared masses sit in a normal density.',
    trial: 'lot',
    units: 't',
    meanRange: [58, 68],
    sdRange: [3, 7],
    digits: 1,
  },
  {
    quantity: 'the range at closest approach of a scheduled pass, in millions of kilometres',
    frame: 'Ebele reads the closest approach of every scheduled pass off the public Lane plot. Across two years the ranges are well fitted by a normal density.',
    trial: 'close pass',
    units: 'million km',
    meanRange: [1.2, 1.9],
    sdRange: [0.25, 0.5],
    digits: 2,
  },
]

type Tail = 'between' | 'above' | 'below'

export const densityArea = defineGenerator({
  id: 'act-4/density-area',
  label: 'Probability as area under a density',
  ap_topics: ['4.7'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, DENSITIES)
    const tail: Tail = (['between', 'above', 'below'] as Tail[])[rng.weightedIndex([0.5, 0.25, 0.25])]
    const f = 10 ** ctx.digits
    const draw = retry(
      rng,
      (r) => {
        const mu = Math.round(r.uniform(ctx.meanRange[0], ctx.meanRange[1]) * f) / f
        const sigma = Math.round(r.uniform(ctx.sdRange[0], ctx.sdRange[1]) * f) / f
        const a = r.choice([0.4, 0.5, 0.75, 1, 1.25, 1.5])
        const b = r.choice([0.4, 0.5, 0.75, 1, 1.25, 1.5])
        const lo = Math.round((mu - a * sigma) * f) / f
        const hi = Math.round((mu + b * sigma) * f) / f
        const cut = Math.round((mu + r.choice([-1.25, -1, -0.75, -0.5, 0.5, 0.75, 1, 1.25]) * sigma) * f) / f
        return { mu, sigma, lo, hi, cut }
      },
      ({ mu, sigma, lo, hi, cut }) => {
        if (!(sigma > 0)) return false
        if (Math.abs(mu - RESERVED_DENSITY.mean) < 2 && Math.abs(sigma - RESERVED_DENSITY.sd) < 2) return false
        if (!(hi > lo)) return false
        const p = tail === 'between' ? normal.between(lo, hi, mu, sigma) : tail === 'above' ? normal.sf(cut, mu, sigma) : normal.cdf(cut, mu, sigma)
        return p > 0.08 && p < 0.92 && !reserved(p)
      },
    )
    const { mu, sigma, lo, hi, cut } = draw
    const d = ctx.digits
    const value = tail === 'between' ? normal.between(lo, hi, mu, sigma) : tail === 'above' ? normal.sf(cut, mu, sigma) : normal.cdf(cut, mu, sigma)
    const zLo = (lo - mu) / sigma
    const zHi = (hi - mu) / sigma
    const zCut = (cut - mu) / sigma
    const u = ctx.units
    const question =
      tail === 'between'
        ? `falls between **${fmt(lo, d)} ${u}** and **${fmt(hi, d)} ${u}**`
        : tail === 'above'
          ? `is **above ${fmt(cut, d)} ${u}**`
          : `is **below ${fmt(cut, d)} ${u}**`
    const tex = tail === 'between' ? `P(${fmt(lo, d)} \\le X \\le ${fmt(hi, d)})` : tail === 'above' ? `P(X > ${fmt(cut, d)})` : `P(X < ${fmt(cut, d)})`

    const work =
      tail === 'between'
        ? `$$z_{\\text{lo}} = \\frac{${fmt(lo, d)} - ${fmt(mu, d)}}{${fmt(sigma, d)}} = ${fmt(zLo, 3)} \\qquad z_{\\text{hi}} = \\frac{${fmt(hi, d)} - ${fmt(mu, d)}}{${fmt(sigma, d)}} = ${fmt(zHi, 3)}$$\n\n$$${tex} = \\Phi(${fmt(zHi, 3)}) - \\Phi(${fmt(zLo, 3)}) = ${fmt(normal.cdf(zHi), 4)} - ${fmt(normal.cdf(zLo), 4)} = ${fmt(value, 4)}$$`
        : `$$z = \\frac{${fmt(cut, d)} - ${fmt(mu, d)}}{${fmt(sigma, d)}} = ${fmt(zCut, 3)}$$\n\n$$${tex} = ${tail === 'above' ? `1 - \\Phi(${fmt(zCut, 3)})` : `\\Phi(${fmt(zCut, 3)})`} = ${fmt(value, 4)}$$`

    return {
      prompt: `${ctx.frame}\n\nTake $X$ to be ${ctx.quantity}, modelled as a normal density with mean ${fmt(mu, d)} ${u} and standard deviation ${fmt(sigma, d)} ${u}.\n\nOne ${ctx.trial} is drawn at random from the file. What is the probability that $X$ ${question}? Report a probability to three decimal places.`,
      data: { kind: 'normal', mean: mu, sd: sigma, shade: tail === 'between' ? { from: lo, to: hi } : tail === 'above' ? { from: cut, to: mu + 4 * sigma } : { from: mu - 4 * sigma, to: cut } },
      answer: numericAnswer(value, 'proportion', { digits: 3 }),
      hints: [
        'For a continuous variable a probability is an **area** under the density, never a height and never a single value. Mark the region the question describes and take the area of it.',
        `Standardise the boundaries: $z = (x - ${fmt(mu, d)}) / ${fmt(sigma, d)}$. ${tail === 'between' ? 'Two boundaries, two z-scores, and the area between them is the difference of the two cumulative probabilities.' : tail === 'above' ? 'One boundary; the area above it is the survival probability, 1 minus the cumulative.' : 'One boundary; the area below it is the cumulative probability itself.'}`,
        `${tail === 'between' ? `$\\Phi(${fmt(zHi, 3)}) - \\Phi(${fmt(zLo, 3)})$` : tail === 'above' ? `$1 - \\Phi(${fmt(zCut, 3)})$` : `$\\Phi(${fmt(zCut, 3)})$`}, to three decimals.`,
      ],
      solution: `${work}\n\nThe probability is **${fmt(value, 3)}** — that is ${fmtPct(value, 1)} of ${ctx.trial}s in the long run.\n\nNote what this model will not answer: the probability that $X$ is *exactly* ${fmt(tail === 'between' ? hi : cut, d)} ${u} is zero, because an interval of zero width has zero area however tall the curve is over it. Asking for a single value of a continuous variable is asking for the area of a line.`,
      misconception: `Reading the height of the density instead of the area under it. At ${fmt(mu, d)} ${u} the curve is ${fmt(normal.pdf(mu, mu, sigma), 4)} per ${u} high — a density, not a probability, and for a small enough spread a height like that can exceed 1 without anything being wrong. Height times width is probability; height alone is not.`,
    }
  },
})

