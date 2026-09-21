/**
 * act-4-06 · The Heat Ledger — drills. AP 4.8: the mean of a discrete random variable as a weighted
 * sum, its standard deviation, the tail a decision actually rides on, and the two readings that are
 * not the expected value — the plain average of the possible values, and the most likely one.
 *
 *   act-4/expected-value-from-pmf   numeric         E(X) = Σ x·p(x) off a drawn cost table
 *   act-4/sd-of-rv                  numeric         SD of a discrete RV — weighted, not the SD of the values
 *   act-4/compare-two-options       choice          two plans whose mean ranking and tail ranking disagree
 *   act-4/exceed-capacity           numeric         P(X > capacity), off a drawn table or a drawn normal plan
 *   act-4/most-likely-trap          choice          the mode against the mean
 *   act-4/interpret-expected-value  interpretation  E(X) in context (checkpoint q8)
 *
 * RESERVED — 4-06's own scene, instrument and mission beats, and its neighbours' tables. No drill
 * lands on any of them:
 *   · *Nightjar*'s three loiter points — near 60 ± 6, middle 54 ± 4, far 48 ± 3 sink-hours per
 *     64-hour window — their 2-hour-cell pmfs, and their tails P(X > 64) ≈ 0.2512 / 0.0062 / 0;
 *   · the six Watch-profile subsystem loads of 4-07 (60 ± 6, 110 ± 15, 12 ± 3, 70 ± 8, 40 ± 6,
 *     28 ± 4 kW, total 320 ± √386) — those are 4-07's beats and `cellars-margin.ts` guards them;
 *   · 4-05's cold-hours table — support 44…80 spaced by 4, E[X] = 59.16 h, SD 8.30 h, P(X > 64) = 0.21.
 * No drawn support uses that 4-hour grid, `reservedOption` refuses any (mean, SD) pair that lands on
 * a loiter point, and `reservedTail` refuses any tail that lands on a beat's probability. Every
 * number below comes from `discreteRV` / `expectedValue` / `rvSd` / `rvProb` / `normal.sf` in
 * @/lib/stats — nothing here is hand-computed.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import type { Rng } from '@/lib/rng'
import { discreteRV, expectedValue, normal, rvProb, rvSd, rvVariance, sd as spreadOfValues, type DiscreteRV } from '@/lib/stats'
import { fmt, fmtPct } from '@/lib/stats/format'
import { expectedValueInterpretation } from '@/lib/problems/rubrics'

// ---------------------------------------------------------------------------------------------
// Reserved: the Act's own option set and the tails the mission beats ask for.
// ---------------------------------------------------------------------------------------------

/** near 60 ± 6, middle 54 ± 4, far 48 ± 3 sink-hours per window — 4-06's decision beat. */
const RESERVED_OPTIONS: readonly (readonly [number, number])[] = [
  [60, 6],
  [54, 4],
  [48, 3],
]

function reservedOption(mean: number, sd: number): boolean {
  return RESERVED_OPTIONS.some(([m, s]) => Math.abs(mean - m) < 1.5 && Math.abs(sd - s) < 0.75)
}

/** P(X > 64) at the near and middle points (4-06's beat) and P(X > 64) on 4-05's cold-hours table. */
const RESERVED_TAILS = [normal.sf(64, 60, 6), normal.sf(64, 54, 4), 0.21]

function reservedTail(p: number): boolean {
  return RESERVED_TAILS.some((r) => Math.abs(p - r) < 0.004)
}

// ---------------------------------------------------------------------------------------------
// Cost tables — other hulls, other offices. Never a 4-hour grid, never sink-hours per Watch window.
// ---------------------------------------------------------------------------------------------

interface CostCtx {
  id: string
  /** One sentence of framing, ending before the table. */
  frame: string
  /** The random variable, as the rubric and the prose want it: "sink-hours the cellar spends". */
  variable: string
  /** The repeated chance process, plural: "picket legs". */
  process: string
  /** One run of it, singular: "picket leg". */
  run: string
  /** Unit symbol reported with the answer. */
  units: string
  /** Column head for the support. */
  xLabel: string
  /** Sentence naming the budget the office works to; `{c}` is the capacity. */
  budget: string
  values: number[]
}

const COST_CONTEXTS: readonly CostCtx[] = [
  {
    id: 'kestrel',
    frame: "CSV *Kestrel*'s 2179 picket file prices every twelve-hour picket leg by the sink-hours it cost her cellar. Two hundred and forty legs give the distribution her engineer works to.",
    variable: 'sink-hours the cellar spends',
    process: 'picket legs',
    run: 'picket leg',
    units: 'h',
    xLabel: 'sink-hours x',
    budget: "*Kestrel*'s Chief allows {c} sink-hours on a leg before the wings have to go out.",
    values: [8, 10, 12, 14, 16, 18, 20],
  },
  {
    id: 'tender',
    frame: 'A Compact tender on the Callisto–Ganymede local lane files every Quiet leg by the percentage of her cellar the leg spends. Her engineering office publishes the table each quarter.',
    variable: 'percentage of the cellar a leg spends',
    process: 'Quiet legs',
    run: 'Quiet leg',
    units: '%',
    xLabel: 'percent of cellar x',
    budget: "The tender's standing order is that a Quiet leg may not be planned to spend more than {c} percent of the cellar.",
    values: [6, 9, 12, 15, 18, 21],
  },
  {
    id: 'dock',
    frame: 'The Uruk High dock master files every refit by the whole days it ran past its booking. Six years of the dock book give the distribution the yard quotes.',
    variable: 'days a refit overruns its booking',
    process: 'refits',
    run: 'refit',
    units: 'd',
    xLabel: 'days over x',
    budget: 'Uruk High levies a berth penalty on any refit that overruns its booking by more than {c} days.',
    values: [0, 1, 2, 3, 4, 5, 6],
  },
  {
    id: 'beacon',
    frame: 'The Lane Authority files every beacon service call by the number of station-keeping firings the tender needed to hold position through it.',
    variable: 'station-keeping firings a call needs',
    process: 'service calls',
    run: 'service call',
    units: 'firings',
    xLabel: 'firings x',
    budget: 'The tender carries cold gas for {c} firings on a single call.',
    values: [0, 1, 2, 3, 4, 5],
  },
  {
    id: 'escort',
    frame: "*Asgard*'s engineering log prices every escort run on the Mark 6 to Mark 7 stretch by the tonnes of reaction mass it burned.",
    variable: 'tonnes of reaction mass a run burns',
    process: 'escort runs',
    run: 'escort run',
    units: 't',
    xLabel: 'tonnes x',
    budget: "*Asgard* sails a stretch with {c} tonnes allotted to escort work.",
    values: [3, 5, 7, 9, 11, 13],
  },
  {
    id: 'scrubber',
    frame: 'The Bureau of Hulls files every scrubber overhaul on a Tessera hull by the hours the deck was down for it.',
    variable: 'hours the deck is down',
    process: 'overhauls',
    run: 'overhaul',
    units: 'h',
    xLabel: 'hours down x',
    budget: 'The Bureau budgets {c} hours of deck downtime for an overhaul.',
    values: [5, 7, 9, 11, 13, 15, 17],
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

/** A unimodal table in hundredths, with the mass really spread over the support. */
function drawPmf(rng: Rng, n: number): number[] {
  return retry(
    rng,
    (r) => {
      const mode = r.int(1, n - 2)
      const spread = r.uniform(1.0, 2.2)
      return roundToOne(Array.from({ length: n }, (_, i) => Math.exp(-((i - mode) ** 2) / (2 * spread * spread)) * r.uniform(0.85, 1.15)))
    },
    (probs) => probs.every((p) => p >= 0.03) && Math.max(...probs) <= 0.5 && Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-9,
  )
}

/** A right-skewed table whose mode sits at the cheap end and whose mean is dragged well past it. */
function drawSkewedPmf(rng: Rng, n: number): number[] {
  return retry(
    rng,
    (r) => {
      const decay = r.uniform(1.0, 2.0)
      return roundToOne(Array.from({ length: n }, (_, i) => Math.exp(-i / decay) * r.uniform(0.9, 1.1)))
    },
    (probs) => {
      if (probs.some((p) => p < 0.02)) return false
      if (probs.indexOf(Math.max(...probs)) !== 0) return false
      return Math.abs(probs.reduce((a, b) => a + b, 0) - 1) < 1e-9
    },
  )
}

function pmfColumns(ctx: CostCtx): string[] {
  return [ctx.xLabel, 'p(x)']
}

function pmfRows(ctx: CostCtx, probs: readonly number[]): (string | number)[][] {
  return ctx.values.map((v, i) => [v, fmt(probs[i], 2)])
}

function rvOf(ctx: CostCtx, probs: number[]): DiscreteRV {
  return discreteRV(ctx.values, probs)
}

/** The plain average of the cells on the axis — the first thing the Ensign reaches for, and not E[X]. */
function unweightedMean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ---------------------------------------------------------------------------------------------
// Normal-model plans — a cost quoted as mean ± SD, the way an office publishes a loiter option
// ---------------------------------------------------------------------------------------------

interface PlanCtx {
  id: string
  /** Framing sentence, ending before the numbers. */
  frame: string
  /** Two plans on the same board, for the comparison item. */
  names: readonly [string, string]
  /** The cost, as a plural noun phrase: "sink-hours". */
  costWord: string
  units: string
  /** The repeated chance process, plural. */
  process: string
  run: string
  /** Sentence naming the capacity; `{c}` is the number. */
  budget: string
  meanRange: readonly [number, number]
  sdRange: readonly [number, number]
}

const PLAN_CONTEXTS: readonly PlanCtx[] = [
  {
    id: 'elara',
    frame: "The Service's Elara picket office publishes two loiter stations for CSV *Kestrel* and prices each by the sink-hours a sixty-hour watch costs her cellar. Both costs are modelled as approximately normal.",
    names: ['the inner station', 'the outer station'],
    costWord: 'sink-hours',
    units: 'h',
    process: 'watches',
    run: 'watch',
    budget: "*Kestrel*'s cellar holds {c} sink-hours.",
    meanRange: [30, 88],
    sdRange: [3, 14],
  },
  {
    id: 'themis',
    frame: 'A Service surveyor on the Themis Reach prices two survey arcs by the hours of cold running each costs, and the yard models both as approximately normal across the class.',
    names: ['the shoal arc', 'the rim arc'],
    costWord: 'cold-running hours',
    units: 'h',
    process: 'arcs',
    run: 'arc',
    budget: 'The surveyor has {c} hours of cold running in hand before she has to purge.',
    meanRange: [24, 74],
    sdRange: [3, 13],
  },
  {
    id: 'dock',
    frame: 'Uruk High prices two refit slots by the dock-hours the work takes, from the yard history of each dock. Both are modelled as approximately normal.',
    names: ['the north dock', 'the yard dock'],
    costWord: 'dock-hours',
    units: 'h',
    process: 'refits',
    run: 'refit',
    budget: "The hauler's schedule allows {c} dock-hours before she misses her window.",
    meanRange: [44, 108],
    sdRange: [4, 15],
  },
  {
    id: 'tender',
    frame: "A Compact tender's engineering office prices two Quiet routes by the percentage of the cellar each spends, modelled as approximately normal from a hundred watches.",
    names: ['the inshore route', 'the offshore route'],
    costWord: 'percent of the cellar',
    units: '%',
    process: 'routes flown',
    run: 'route',
    budget: 'The tender may spend {c} percent of the cellar and no more.',
    meanRange: [20, 54],
    sdRange: [3, 9],
  },
]

// ---------------------------------------------------------------------------------------------
// 1. Numeric — E(X) as a weighted sum
// ---------------------------------------------------------------------------------------------

export const expectedValueFromPmf = defineGenerator({
  id: 'act-4/expected-value-from-pmf',
  label: 'Expected value from a probability table',
  ap_topics: ['4.8'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, COST_CONTEXTS)
    const spacing = ctx.values[1] - ctx.values[0]
    const draw = retry(
      rng,
      (r) => {
        const probs = drawPmf(r, ctx.values.length)
        return { probs, rv: rvOf(ctx, probs) }
      },
      ({ rv }) => {
        const flat = unweightedMean(ctx.values)
        if (Math.abs(rv.mean - flat) < 0.35 * spacing) return false
        if (reservedOption(rv.mean, rv.sd)) return false
        return rv.sd > 0.4 * spacing
      },
    )
    const { probs, rv } = draw
    const mu = expectedValue(rv.values, rv.probs)
    const flat = unweightedMean(ctx.values)
    const terms = ctx.values.map((v, i) => `${v} \\times ${fmt(probs[i], 2)}`).join(' + ')
    const products = ctx.values.map((v, i) => fmt(v * probs[i], 3)).join(' + ')
    const columns = [...pmfColumns(ctx), 'x · p(x)']
    const rows = ctx.values.map((v, i) => [v, fmt(probs[i], 2), fmt(v * probs[i], 3)] as (string | number)[])
    return {
      prompt: `${ctx.frame}\n\n${tableMd(pmfColumns(ctx), pmfRows(ctx, probs))}\n\nLet $X$ be ${ctx.variable} on one ${ctx.run}. What is $E(X)$? Report it in ${ctx.units} to two decimal places.`,
      data: tableSpec(pmfColumns(ctx), pmfRows(ctx, probs)),
      answer: numericAnswer(mu, 'other', { digits: 2, units: ctx.units }),
      hints: [
        'An expected value averages a distribution, not a list. Each value counts for as much probability as sits on it, so multiply every value by its own p(x) and add the column.',
        `Build a third column: $x\\cdot p(x)$ for each row, starting ${ctx.values[0]} × ${fmt(probs[0], 2)} = ${fmt(ctx.values[0] * probs[0], 3)}. The weights already add to 1, so the sum of that column *is* the average.`,
        `$${products}$, to two decimal places.`,
      ],
      solution: `Weight every value by its own probability and add:\n\n${tableMd(columns, rows)}\n\n$$E(X) = \\sum_x x\\,p(x) = ${terms} = ${fmt(mu, 4)}$$\n\nThe expected ${ctx.variable.replace(/^(?:the )?/, '')} is **${fmt(mu, 2)} ${ctx.units}** per ${ctx.run} — the long-run average over many ${ctx.process}, not a forecast for the next one.`,
      misconception: `Averaging the left-hand column instead. The plain average of the possible values is ${fmt(flat, 2)} ${ctx.units}, which says a ${ctx.values[ctx.values.length - 1]}-${ctx.units === '%' ? 'percent' : ctx.units} ${ctx.run} is exactly as common as a ${ctx.values[0]}-${ctx.units === '%' ? 'percent' : ctx.units} one. The probabilities are in the table precisely because it is not.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — SD of a discrete random variable (weighted, not the SD of the values)
// ---------------------------------------------------------------------------------------------

export const sdOfRv = defineGenerator({
  id: 'act-4/sd-of-rv',
  label: 'Standard deviation of a discrete random variable',
  ap_topics: ['4.8'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(rng, COST_CONTEXTS)
    const spacing = ctx.values[1] - ctx.values[0]
    const draw = retry(
      rng,
      (r) => {
        const probs = drawPmf(r, ctx.values.length)
        return { probs, rv: rvOf(ctx, probs) }
      },
      ({ rv }) => {
        const naive = spreadOfValues(ctx.values)
        if (reservedOption(rv.mean, rv.sd)) return false
        if (!(rv.sd > 0.5 * spacing)) return false
        return naive - rv.sd > 0.3 * spacing
      },
    )
    const { probs, rv } = draw
    const mu = expectedValue(rv.values, rv.probs)
    const variance = rvVariance(rv.values, rv.probs)
    const sigma = rvSd(rv.values, rv.probs)
    const naive = spreadOfValues(ctx.values)
    const terms = ctx.values.map((v, i) => `(${v} - ${fmt(mu, 2)})^2 \\times ${fmt(probs[i], 2)}`).join(' + ')
    const columns = [...pmfColumns(ctx), 'x − μ', '(x − μ)² · p(x)']
    const rows = ctx.values.map((v, i) => [v, fmt(probs[i], 2), fmt(v - mu, 2), fmt((v - mu) * (v - mu) * probs[i], 4)] as (string | number)[])
    return {
      prompt: `${ctx.frame}\n\n${tableMd(pmfColumns(ctx), pmfRows(ctx, probs))}\n\nLet $X$ be ${ctx.variable} on one ${ctx.run}. Its expected value is $\\mu_X = ${fmt(mu, 2)}$ ${ctx.units}.\n\nWhat is the **standard deviation** of $X$? Report it in ${ctx.units} to two decimal places.`,
      data: tableSpec(pmfColumns(ctx), pmfRows(ctx, probs)),
      answer: numericAnswer(sigma, 'other', { digits: 2, units: ctx.units }),
      hints: [
        'The spread of a random variable is weighted exactly as its mean is: every squared distance from μ counts for as much probability as sits on it.',
        `$\\sigma_X^2 = \\sum_x (x - \\mu)^2 p(x)$ with $\\mu = ${fmt(mu, 2)}$ ${ctx.units}. Build the column, add it, and take the square root last.`,
        `$\\sqrt{${fmt(variance, 4)}}$, to two decimal places.`,
      ],
      solution: `Square each distance from the mean, weight it by that value's probability, add, and take the root once:\n\n${tableMd(columns, rows)}\n\n$$\\sigma_X^2 = ${terms} = ${fmt(variance, 4)}$$\n\n$$\\sigma_X = \\sqrt{${fmt(variance, 4)}} = ${fmt(sigma, 4)}$$\n\nThe standard deviation is **${fmt(sigma, 2)} ${ctx.units}** — a typical distance of one ${ctx.run}'s cost from the ${fmt(mu, 2)} ${ctx.units} average, not a limit every ${ctx.run} stays inside.`,
      misconception: `Taking the spread of the numbers in the left-hand column and ignoring p(x) entirely. That gives ${fmt(naive, 2)} ${ctx.units}, the spread of a list in which a ${ctx.values[0]} and a ${ctx.values[ctx.values.length - 1]} are equally common — which is a statement about the axis, not about ${ctx.process}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — two plans whose mean ranking and tail ranking disagree
// ---------------------------------------------------------------------------------------------

export const compareTwoOptions = defineGenerator({
  id: 'act-4/compare-two-options',
  label: 'Comparing two plans: the mean or the tail?',
  ap_topics: ['4.8'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, PLAN_CONTEXTS)
    const onMean = rng.bool()
    const draw = retry(
      rng,
      (r) => {
        const meanA = r.int(ctx.meanRange[0], ctx.meanRange[1] - 12)
        const sdA = r.int(Math.max(8, ctx.sdRange[0] + 4), Math.max(9, ctx.sdRange[1]))
        const meanB = meanA + r.int(4, 12)
        const sdB = r.int(ctx.sdRange[0], Math.max(ctx.sdRange[0] + 1, Math.min(5, sdA - 3)))
        const capacity = Math.round(meanB + r.uniform(1.2, 2.8) * sdB)
        return { meanA, sdA, meanB, sdB, capacity }
      },
      ({ meanA, sdA, meanB, sdB, capacity }) => {
        if (reservedOption(meanA, sdA) || reservedOption(meanB, sdB)) return false
        if (capacity <= meanA + 2) return false
        const tailA = normal.sf(capacity, meanA, sdA)
        const tailB = normal.sf(capacity, meanB, sdB)
        if (reservedTail(tailA) || reservedTail(tailB)) return false
        return tailA - tailB >= 0.06 && tailA <= 0.55 && tailB >= 0.0004
      },
    )
    const { meanA, sdA, meanB, sdB, capacity } = draw
    const [nameA, nameB] = ctx.names
    const tailA = normal.sf(capacity, meanA, sdA)
    const tailB = normal.sf(capacity, meanB, sdB)
    const cands = [
      {
        text: `${nameA}, because it costs fewer ${ctx.costWord} on average — ${fmt(meanA, 0)} against ${fmt(meanB, 0)} ${ctx.units}.`,
        correct: onMean,
        why: onMean ? null : `True about the means, but the requirement is about the tail. ${nameA} overruns the budget ${fmtPct(tailA, 1)} of the time against ${fmtPct(tailB, 1)} for ${nameB}: the cheaper plan on average is the likelier one to run the office dry.`,
      },
      {
        text: `${nameB}, because it exceeds the budget less often — ${fmt(tailB, 4)} against ${fmt(tailA, 4)}.`,
        correct: !onMean,
        why: !onMean ? null : `True about the tails, but the requirement named the average. Over many ${ctx.process} ${nameA} spends ${fmt(meanA, 0)} ${ctx.units} against ${fmt(meanB, 0)}, and that is the quantity the requirement ranks.`,
      },
      {
        text: `${nameA}, because it exceeds the budget less often.`,
        correct: false,
        why: `The tails run the other way: $P(X > ${capacity})$ is ${fmt(tailA, 4)} for ${nameA} and ${fmt(tailB, 4)} for ${nameB}. ${nameA} is wider, and width is what puts mass past a fixed line.`,
      },
      {
        text: `${nameB}, because it costs fewer ${ctx.costWord} on average.`,
        correct: false,
        why: `The means run the other way: ${fmt(meanA, 0)} ${ctx.units} for ${nameA} against ${fmt(meanB, 0)} for ${nameB}.`,
      },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    const requirement = onMean
      ? `The office is told to choose the plan that spends the fewest ${ctx.costWord} **on average over many ${ctx.process}**.`
      : `The office is told to choose the plan **least likely to exceed the budget on a single ${ctx.run}**.`
    return {
      prompt: `${ctx.frame}\n\n- **${nameA}** — mean ${fmt(meanA, 0)} ${ctx.units}, standard deviation ${fmt(sdA, 0)} ${ctx.units}\n- **${nameB}** — mean ${fmt(meanB, 0)} ${ctx.units}, standard deviation ${fmt(sdB, 0)} ${ctx.units}\n\n${ctx.budget.replace('{c}', String(capacity))}\n\n${requirement}\n\nWhich plan, and on what grounds?`,
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Two rankings sit in these numbers and they do not agree. One is the ranking by expected cost; the other is the ranking by how much probability lies past the budget. Read which one the requirement asked for.',
        `Expected cost: ${fmt(meanA, 0)} ${ctx.units} against ${fmt(meanB, 0)} ${ctx.units}. Tail past the budget: $P(X > ${capacity})$ is ${fmt(tailA, 4)} for ${nameA} and ${fmt(tailB, 4)} for ${nameB}. A wider distribution can be cheaper on average and still put more of itself past a fixed line.`,
      ],
      solution: `$$E(X_{\\text{${nameA}}}) = ${fmt(meanA, 0)}\\ \\text{${ctx.units}} \\qquad E(X_{\\text{${nameB}}}) = ${fmt(meanB, 0)}\\ \\text{${ctx.units}}$$\n\n$$P(X > ${capacity}) = ${fmt(tailA, 4)} \\quad\\text{and}\\quad ${fmt(tailB, 4)}$$\n\n${onMean ? `The requirement is the long-run average, so the answer is **${nameA}** — ${fmt(meanB - meanA, 0)} ${ctx.units} cheaper per ${ctx.run} over many ${ctx.process}.` : `The requirement is the single-run risk, so the answer is **${nameB}** — ${fmt(tailA, 4)} against ${fmt(tailB, 4)} is a factor of about ${fmt(tailA / tailB, 0)} in how often the budget is blown.`}\n\nThe point is that the two rankings disagree. ${nameA} is cheaper on average *and* likelier to overrun, because it is the wider of the two, and a mean says nothing about how much of a distribution lies past a line drawn somewhere else.`,
      misconception: `Ranking plans on the expected value alone. Expected value is the right answer to "what does this cost over many ${ctx.process}" and the wrong answer to "what are the odds this one breaks the budget". Those are different questions about the same distribution, and a plan can win the first and lose the second.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — P(X > capacity), off a table or off a normal plan
// ---------------------------------------------------------------------------------------------

export const exceedCapacity = defineGenerator({
  id: 'act-4/exceed-capacity',
  label: 'Probability a cost exceeds capacity',
  ap_topics: ['4.8'],
  skills: ['3'],
  generate(rng) {
    if (rng.bool()) {
      // --- from a drawn table: a sum of cells, with the boundary cell excluded ---
      const ctx = pickContext(rng, COST_CONTEXTS)
      const draw = retry(
        rng,
        (r) => {
          const probs = drawPmf(r, ctx.values.length)
          const k = r.int(2, ctx.values.length - 3)
          return { probs, rv: rvOf(ctx, probs), capacity: ctx.values[k] }
        },
        ({ rv, capacity }) => {
          const tail = rvProb(rv, (v) => v > capacity)
          const mass = rvProb(rv, (v) => v === capacity)
          if (reservedTail(tail)) return false
          return tail > 0.06 && tail < 0.6 && mass >= 0.08
        },
      )
      const { probs, rv, capacity } = draw
      const tail = rvProb(rv, (v) => v > capacity)
      const atLeast = rvProb(rv, (v) => v >= capacity)
      const mass = rvProb(rv, (v) => v === capacity)
      const above = ctx.values.filter((v) => v > capacity)
      const cells = above.map((v) => fmt(probs[ctx.values.indexOf(v)], 2)).join(' + ')
      return {
        prompt: `${ctx.frame}\n\n${tableMd(pmfColumns(ctx), pmfRows(ctx, probs))}\n\n${ctx.budget.replace('{c}', String(capacity))}\n\nLet $X$ be ${ctx.variable} on one ${ctx.run}. What is $P(X > ${capacity})$ — the probability that one ${ctx.run} costs **more than** the budget? Report a proportion to three decimal places.`,
        data: tableSpec(pmfColumns(ctx), pmfRows(ctx, probs)),
        answer: numericAnswer(tail, 'proportion', { digits: 3 }),
        hints: [
          `"More than ${capacity}" keeps every cell strictly above ${capacity} and throws the ${capacity} itself away. Read the wording before you add.`,
          `The cells above the budget are ${above.join(', ')}. Add their probabilities — or take 1 minus the cumulative up to and including ${capacity}, which is the same arithmetic from the other end.`,
          `$${cells}$, to three decimals.`,
        ],
        solution: `$$P(X > ${capacity}) = ${cells} = ${fmt(tail, 4)}$$\n\nSo **${fmt(tail, 3)}** — about ${fmtPct(tail, 0)} of ${ctx.process} cost more than the budget allows.\n\nThe boundary cell is not a rounding detail: $p(${capacity}) = ${fmt(mass, 2)}$, so $P(X \\ge ${capacity}) = ${fmt(atLeast, 4)}$, which is a different answer to a different question.`,
        misconception: `Answering ${fmt(atLeast, 3)} — that is $P(X \\ge ${capacity})$, which keeps the ${capacity} cell and its ${fmt(mass, 2)} of probability. A ${ctx.run} that costs exactly ${capacity} ${ctx.units === '%' ? 'percent' : ctx.units} is inside the budget, not past it.`,
      }
    }
    // --- from a drawn normal plan: the same question read off a curve ---
    const ctx = pickContext(rng, PLAN_CONTEXTS)
    const name = rng.bool() ? ctx.names[0] : ctx.names[1]
    const draw = retry(
      rng,
      (r) => {
        const mean = r.int(ctx.meanRange[0], ctx.meanRange[1])
        const sd = r.int(ctx.sdRange[0], ctx.sdRange[1])
        const capacity = Math.round(mean + r.uniform(0.2, 2.2) * sd)
        return { mean, sd, capacity }
      },
      ({ mean, sd, capacity }) => {
        if (reservedOption(mean, sd)) return false
        if (capacity <= mean) return false
        const tail = normal.sf(capacity, mean, sd)
        return !reservedTail(tail) && tail > 0.015 && tail < 0.45
      },
    )
    const { mean, sd, capacity } = draw
    const tail = normal.sf(capacity, mean, sd)
    const z = (capacity - mean) / sd
    return {
      prompt: `${ctx.frame}\n\n**${name}** — the cost is modelled as approximately normal with mean ${fmt(mean, 0)} ${ctx.units} and standard deviation ${fmt(sd, 0)} ${ctx.units}.\n\n${ctx.budget.replace('{c}', String(capacity))}\n\nWhat is the probability that a single ${ctx.run} on ${name} costs **more than** the budget? Report a proportion to four decimal places.`,
      answer: numericAnswer(tail, 'proportion', { digits: 4 }),
      hints: [
        'This is an upper tail on a normal model: the share of the area lying to the right of the budget. Standardise first, then read the tail — never one minus a tail you have already taken.',
        `$z = (${capacity} - ${fmt(mean, 0)}) / ${fmt(sd, 0)} = ${fmt(z, 3)}$. The answer is the area above that z.`,
        `$P(Z > ${fmt(z, 3)})$, to four decimals.`,
      ],
      solution: `$$z = \\frac{${capacity} - ${fmt(mean, 0)}}{${fmt(sd, 0)}} = ${fmt(z, 4)}$$\n\n$$P(X > ${capacity}) = P(Z > ${fmt(z, 4)}) = ${fmt(tail, 4)}$$\n\nSo **${fmt(tail, 4)}** — about ${fmtPct(tail, 1)} of ${ctx.process} on ${name} cost more than the budget. The mean of ${fmt(mean, 0)} ${ctx.units} is comfortably inside it; the mean is not what decides this question.`,
      misconception: `Reasoning from the mean. A plan whose average cost is ${fmt(mean, 0)} ${ctx.units} against a budget of ${capacity} looks safe and still breaks that budget ${fmtPct(tail, 1)} of the time, because what lies past a line is a tail and not a centre. The other common slip is reporting ${fmt(1 - tail, 4)} — the area on the wrong side.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — "expected" is not "most likely"
// ---------------------------------------------------------------------------------------------

export const mostLikelyTrap = defineGenerator({
  id: 'act-4/most-likely-trap',
  label: 'Expected value against the most likely value',
  ap_topics: ['4.8'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, COST_CONTEXTS)
    const spacing = ctx.values[1] - ctx.values[0]
    const draw = retry(
      rng,
      (r) => {
        const probs = drawSkewedPmf(r, ctx.values.length)
        return { probs, rv: rvOf(ctx, probs) }
      },
      ({ probs, rv }) => {
        const modeValue = ctx.values[probs.indexOf(Math.max(...probs))]
        if (reservedOption(rv.mean, rv.sd)) return false
        return rv.mean - modeValue > 0.6 * spacing && probs.filter((p) => p === Math.max(...probs)).length === 1
      },
    )
    const { probs, rv } = draw
    const modeIndex = probs.indexOf(Math.max(...probs))
    const modeValue = ctx.values[modeIndex]
    const modeProb = probs[modeIndex]
    const mu = expectedValue(rv.values, rv.probs)
    const unit = ctx.units === '%' ? 'percent' : ctx.units
    const cands = [
      {
        text: `Over many ${ctx.process} the cost averages ${fmt(mu, 2)} ${unit}, while the single most likely cost is ${modeValue} ${unit}. The two are different numbers and the plan's "expected" means the first.`,
        correct: true,
        why: null,
      },
      {
        text: `The expected cost is ${modeValue} ${unit}, because that is the value carrying the most probability (${fmt(modeProb, 2)}).`,
        correct: false,
        why: `That is the **mode** — the likeliest single outcome. The expected value weights every value by its probability and adds: $\\sum x\\,p(x) = ${fmt(mu, 4)}$, which the long right tail drags well above ${modeValue}.`,
      },
      {
        text: `The expected cost and the most likely cost are the same thing, so both are ${fmt(mu, 2)} ${unit}.`,
        correct: false,
        why: `They coincide only for a symmetric distribution. This one is skewed: the mode is ${modeValue} ${unit} with probability ${fmt(modeProb, 2)}, and the mean is ${fmt(mu, 2)} ${unit}. On a skewed table they are never the same number.`,
      },
      {
        text: `The expected cost is ${fmt(mu, 2)} ${unit}, so the next ${ctx.run} will cost ${fmt(mu, 2)} ${unit}.`,
        correct: false,
        why: `The arithmetic is right and the sentence is not. ${fmt(mu, 2)} ${unit} is an average over many ${ctx.process}; it is not a forecast for one, and in this table it is not even a value $X$ can take.`,
      },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${ctx.frame}\n\n${tableMd(pmfColumns(ctx), pmfRows(ctx, probs))}\n\nThe plan for the coming quarter says the office should "expect" a certain cost per ${ctx.run}. Which statement about this table is correct?`,
      data: tableSpec(pmfColumns(ctx), pmfRows(ctx, probs)),
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Two different summaries live in this table. The tallest bar is the most likely single outcome; the weighted sum of the values is the long-run average. A skewed table keeps them apart.',
        `The tallest cell is ${modeValue} ${unit} at p = ${fmt(modeProb, 2)}. The weighted sum is $\\sum x\\,p(x) = ${fmt(mu, 4)}$ ${unit}. Both are true of the same table and they answer different questions.`,
      ],
      solution: `$$E(X) = \\sum_x x\\,p(x) = ${fmt(mu, 4)}\\ \\text{${ctx.units}} \\qquad \\text{mode} = ${modeValue}\\ \\text{${ctx.units}}$$\n\nThe table is skewed to the right: most ${ctx.process} cost ${modeValue} ${unit} or a little more, and a few expensive ones drag the average up to ${fmt(mu, 2)} ${unit}. "Expected" names the average over many ${ctx.process} — the centre of mass of the table — and not the tallest bar, and not a prediction for the next ${ctx.run}.`,
      misconception: `Reading "expected value" as "the value to expect". It is a long-run average and it need not be a possible outcome at all: no ${ctx.run} in this table costs ${fmt(mu, 2)} ${unit}, because ${fmt(mu, 2)} is not one of the values $X$ can take.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — what E(X) promises, and what it does not (checkpoint q8)
// ---------------------------------------------------------------------------------------------

export const interpretExpectedValue = defineGenerator({
  id: 'act-4/interpret-expected-value',
  label: 'Interpret an expected value in context',
  ap_topics: ['4.8'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, COST_CONTEXTS)
    const spacing = ctx.values[1] - ctx.values[0]
    const draw = retry(
      rng,
      (r) => {
        const probs = r.bool() ? drawPmf(r, ctx.values.length) : drawSkewedPmf(r, ctx.values.length)
        return { probs, rv: rvOf(ctx, probs) }
      },
      ({ probs, rv }) => {
        const modeValue = ctx.values[probs.indexOf(Math.max(...probs))]
        if (reservedOption(rv.mean, rv.sd)) return false
        if (Math.abs(rv.mean - Math.round(rv.mean)) < 0.05) return false
        return Math.abs(rv.mean - modeValue) > 0.4 * spacing && rv.sd > 0.4 * spacing
      },
    )
    const { probs, rv } = draw
    const modeIndex = probs.indexOf(Math.max(...probs))
    const modeValue = ctx.values[modeIndex]
    const mu = expectedValue(rv.values, rv.probs)
    const sigma = rvSd(rv.values, rv.probs)
    const rubric = expectedValueInterpretation({ value: mu, variable: ctx.variable, units: ctx.units, context: ctx.process, digits: 2 })
    return {
      prompt: `${ctx.frame}\n\n${tableMd(pmfColumns(ctx), pmfRows(ctx, probs))}\n\nLet $X$ be ${ctx.variable} on one ${ctx.run}. The weighted sum gives $E(X) = ${fmt(mu, 2)}$ ${ctx.units}.\n\nIn one or two sentences, say what that number **means** for ${ctx.process} — what is averaged, over what, and over how many. Quote the value, and do not write it as a prediction for the next ${ctx.run}.`,
      data: tableSpec(pmfColumns(ctx), pmfRows(ctx, probs)),
      answer: rubric,
      hints: [
        'An expected value is a long-run average over many repetitions of the same chance process. Start with "Over many …" and the repetition is in the first three words.',
        `Three things belong in the sentence: the value (${fmt(mu, 2)} ${ctx.units}), what is being averaged (${ctx.variable}), and the repeated process it averages over (${ctx.process}).`,
        'Avoid any word that turns an average into a promise — "exactly", "always", "every time". One run can cost anything the table allows.',
      ],
      solution: `${rubric.exemplar}\n\nThe table's most likely single outcome is ${modeValue} ${ctx.units === '%' ? 'percent' : ctx.units} and its typical distance from the mean is ${fmt(sigma, 2)} ${ctx.units}, so no single ${ctx.run} is obliged to land anywhere near ${fmt(mu, 2)}. What the expected value promises is the total: run enough ${ctx.process} and the cost per ${ctx.run} settles on ${fmt(mu, 2)} ${ctx.units}, which is exactly the quantity a budget is built out of.`,
      misconception: `Two failures, in opposite directions. Reading E(X) as a forecast — "this ${ctx.run} will cost ${fmt(mu, 2)} ${ctx.units}" — turns a long-run average into a promise about one trial. Reading it as the most likely outcome confuses it with the mode, which here is ${modeValue} ${ctx.units === '%' ? 'percent' : ctx.units}.`,
    }
  },
})
