/**
 * act-8-04 · Dacre's Stamp — drills, part one. AP 8.6, 8.7: carrying the two-way test out, reading
 * which cell drove it, and writing the conclusion.
 *
 *   act-8/two-way-statistic   numeric  χ² for a 2×2, from the observed table
 *   act-8/two-way-pvalue      numeric  P for a 2×3, from the statistic and the df
 *   act-8/driving-cell        choice   which cell carries the statistic, and in which direction
 *   act-8/chi-square-conclusion interp the conclusion in context, naming the cell
 *
 * Contexts and table draws come from `./two-way-setup`; the Lane's own three tables are act-8-04's
 * mission beats and appear in no drill. Every statistic and P-value is computed by
 * `chiSquareIndependence` / `chiSquareHomogeneity`, never by hand.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { significanceTestConclusion } from '@/lib/problems/rubrics'
import { chi2, chiSquareHomogeneity, chiSquareIndependence, type ChiSquareTableResult } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'
import { TWO_WAY_CONTEXTS, drawTable, shuffleChoice, type Candidate, type TableDraw, type TwoWayContext } from './two-way-setup'

const ALPHAS = [0.01, 0.05, 0.1] as const

function runTest(ctx: TwoWayContext, d: TableDraw): ChiSquareTableResult {
  return ctx.design === 'one-sample' ? chiSquareIndependence(d.counts, { random: true }) : chiSquareHomogeneity(d.counts, { random: true })
}

const observedMd = (ctx: TwoWayContext, d: TableDraw) =>
  tableMd(['', ...ctx.colLabels, 'total'], [...ctx.rowLabels.map((rl, r) => [rl, ...d.counts[r], d.rowTotals[r]]), ['total', ...d.colTotals, d.total]])

const testName = (ctx: TwoWayContext) => (ctx.design === 'one-sample' ? 'independence' : 'homogeneity')

/** Row and column of a flat cell index. */
function cellOf(result: ChiSquareTableResult, index: number): { i: number; j: number } {
  const cols = result.expectedTable[0].length
  return { i: Math.floor(index / cols), j: index % cols }
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — χ² for a 2 × 2
// ---------------------------------------------------------------------------------------------

export const twoWayStatistic = defineGenerator({
  id: 'act-8/two-way-statistic',
  label: 'The χ² statistic for a 2 × 2 table',
  ap_topics: ['8.6', '8.7'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(
      rng,
      TWO_WAY_CONTEXTS.filter((c) => c.colLabels.length === 2),
    )
    const d = retry(
      rng,
      (r) => {
        const draw = drawTable(r, ctx)
        return { draw, res: runTest(ctx, draw) }
      },
      ({ res }) => res.statistic > 0.4 && res.statistic < 60 && (res.pValue ?? 1) > 1e-8,
    )
    const { draw, res } = d
    const contributions = res.contributionTable

    return {
      prompt: `${ctx.office} holds ${fmtInt(draw.total)} ${ctx.unit}, laid out by ${ctx.rowVariable} and ${ctx.colVariable}.\n\n${observedMd(ctx, draw)}\n\nEvery expected count clears five. Compute the **χ² statistic** for the test of ${testName(ctx)} on this table. Give it to **two decimal places**.`,
      answer: numericAnswer(res.statistic, 'testStat'),
      hints: [
        'Expected counts first, one per cell, from the margins: row total times column total over n. Then one term per cell.',
        `Each term is $(O - E)^2 / E$. There are ${fmtInt(draw.counts.flat().length)} of them here, and the statistic is their sum.`,
        `The first term is $(${fmtInt(draw.counts[0][0])} - ${fmt(draw.expected[0][0], 2)})^2 / ${fmt(draw.expected[0][0], 2)} = ${fmt(contributions[0][0], 3)}$. Carry full precision through all ${fmtInt(draw.counts.flat().length)} and round once.`,
      ],
      solution: `**Expected counts** (row × column ÷ ${fmtInt(draw.total)}):\n\n${tableMd(['', ...ctx.colLabels], ctx.rowLabels.map((rl, r) => [rl, ...draw.expected[r].map((v) => fmt(v, 3))]))}\n\n**Contributions**, $(O - E)^2/E$:\n\n${tableMd(['', ...ctx.colLabels], ctx.rowLabels.map((rl, r) => [rl, ...contributions[r].map((v) => fmt(v, 4))]))}\n\n$$\\chi^2 = ${contributions
        .flat()
        .map((v) => fmt(v, 4))
        .join(' + ')} = \\mathbf{${fmt(res.statistic, 2)}}$$\n\non $(2 - 1)(2 - 1) = 1$ degree of freedom, giving $P = ${fmtP(res.pValue ?? 1)}$.\n\nA 2×2 has one degree of freedom, so the four contributions are four readings of the same single departure: fix one cell and the margins write the other three. They differ in size only because they are divided by different expected counts.`,
      misconception: 'Dividing by the observed count instead of the expected one. The expected count is the denominator in every term, and it is also the yardstick: a miss of four matters far more in a cell expecting six than in one expecting sixty.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the P-value for a 2 × 3
// ---------------------------------------------------------------------------------------------

export const twoWayPValue = defineGenerator({
  id: 'act-8/two-way-pvalue',
  label: 'The P-value for a 2 × 3 table',
  ap_topics: ['8.6', '8.7'],
  skills: ['3'],
  generate(rng) {
    const ctx = pickContext(
      rng,
      TWO_WAY_CONTEXTS.filter((c) => c.colLabels.length === 3),
    )
    const d = retry(
      rng,
      (r) => {
        const draw = drawTable(r, ctx, { nMin: 90, nMax: 240, assocMin: 0.02, assocMax: 0.28 })
        return { draw, res: runTest(ctx, draw) }
      },
      ({ res }) => (res.pValue ?? 1) > 0.00002 && (res.pValue ?? 1) < 0.6 && res.statistic > 1,
    )
    const { draw, res } = d
    const df = res.df ?? 2

    return {
      prompt: `${ctx.office} holds ${fmtInt(draw.total)} ${ctx.unit}, laid out by ${ctx.rowVariable} and ${ctx.colVariable}. Every expected count clears five.\n\n${observedMd(ctx, draw)}\n\nThe test of ${testName(ctx)} returns $\\chi^2 = ${fmt(res.statistic, 3)}$. What is the **P-value**? Give it to **four decimal places**, or as an inequality if it is below 0.001.`,
      answer: numericAnswer(res.pValue ?? 1, 'pValue'),
      hints: [
        'Degrees of freedom before the tail. A χ² statistic has no size of its own: the same number is decisive on one degree of freedom and unremarkable on twenty.',
        `This table is ${fmtInt(draw.counts.length)} × ${fmtInt(ctx.colLabels.length)}, so $df = (${fmtInt(draw.counts.length)} - 1)(${fmtInt(ctx.colLabels.length)} - 1)$.`,
        `The P-value is the area **above** ${fmt(res.statistic, 3)} under the χ² curve on ${fmtInt(df)} degrees of freedom. On a TI-84: \`χ²cdf(${fmt(res.statistic, 3)}, 1E99, ${fmtInt(df)})\`.`,
      ],
      solution: `$$df = (${fmtInt(draw.counts.length)} - 1)(${fmtInt(ctx.colLabels.length)} - 1) = ${fmtInt(df)}, \\qquad \\chi^2 = ${fmt(res.statistic, 3)}$$\n\n$$P = P(\\chi^2_{${fmtInt(df)}} \\geq ${fmt(res.statistic, 3)}) = \\mathbf{${fmtP(res.pValue ?? 1)}}$$\n\nThe tail is always the upper one. Every departure from the expected counts, in either direction, makes $(O-E)^2$ larger and pushes the statistic to the right, so a two-sided question about the table is answered by a one-sided area under the curve.\n\nThe same statistic on the wrong df is a different answer: ${fmt(res.statistic, 3)} on ${fmtInt(df)} degrees of freedom gives ${fmtP(res.pValue ?? 1)}, and on ${fmtInt(df + 4)} it would give ${fmtP(chi2.sf(res.statistic, df + 4))}. A df that does not match the table's shape is the commonest way this line comes out wrong.`,
      misconception: 'Doubling the tail because the alternative "goes both ways". The χ² alternative is two-sided in meaning and one-tailed in arithmetic; the squaring has already folded both directions into the right tail.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which cell drove it, and in which direction
// ---------------------------------------------------------------------------------------------

export const drivingCell = defineGenerator({
  id: 'act-8/driving-cell',
  label: 'Describe the association from the contributions',
  ap_topics: ['8.6', '8.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_WAY_CONTEXTS)
    /** The cell with the largest observed count that is not the cell driving the statistic. */
    const biggestOther = (d: TableDraw, driver: number) => {
      const flat = d.counts.flat()
      let best = driver === 0 ? 1 : 0
      for (let k = 0; k < flat.length; k++) if (k !== driver && flat[k] > flat[best]) best = k
      return best
    }
    const { draw, res } = retry(
      rng,
      (r) => {
        const d = drawTable(r, ctx, { nMin: 110, nMax: 340, assocMin: 0.2, assocMax: 0.6 })
        return { draw: d, res: runTest(ctx, d) }
      },
      ({ draw: d, res }) => {
        const top = res.contributions[res.largestContributor]
        const rival = res.contributions[biggestOther(d, res.largestContributor)]
        return (res.pValue ?? 1) < 0.05 && top / res.statistic > 0.28 && rival < 0.45 * top
      },
    )
    const { i, j } = cellOf(res, res.largestContributor)
    const o = draw.counts[i][j]
    const e = draw.expected[i][j]
    const over = o > e
    const share = res.contributions[res.largestContributor] / res.statistic
    const other = cellOf(res, biggestOther(draw, res.largestContributor))

    const cands: Candidate[] = [
      {
        text: `**${ctx.rowLabels[i]} · ${ctx.colLabels[j]}**: ${fmtInt(o)} recorded against ${fmt(e, 2)} expected, ${over ? 'more' : 'fewer'} than the margins predict, carrying ${fmtPct(share, 0)} of the statistic.`,
        correct: true,
        why: null,
      },
      {
        text: `**${ctx.rowLabels[i]} · ${ctx.colLabels[j]}**: ${fmtInt(o)} recorded against ${fmt(e, 2)} expected, ${over ? 'fewer' : 'more'} than the margins predict, carrying ${fmtPct(share, 0)} of the statistic.`,
        correct: false,
        why: `The right cell and the wrong direction. ${fmtInt(o)} against ${fmt(e, 2)} expected is ${over ? 'an excess' : 'a shortfall'}, and a description that reverses it reverses the finding a reader will act on. The contribution is squared and cannot tell you the sign; the comparison of O with E can.`,
      },
      {
        text: `**${ctx.rowLabels[other.i]} · ${ctx.colLabels[other.j]}**, because it holds ${fmtInt(draw.counts[other.i][other.j])} ${ctx.unit}, the largest count in the table's interior.`,
        correct: false,
        why: `Size of count is not size of contribution. A cell holding ${fmtInt(draw.counts[other.i][other.j])} against ${fmt(draw.expected[other.i][other.j], 2)} expected is close to what the margins predicted; the cell that drives the statistic is the one furthest from its own expected count relative to that count, and here it contributes ${fmt(res.contributionTable[other.i][other.j], 2)} against ${fmt(res.contributions[res.largestContributor], 2)}.`,
      },
      {
        text: `No single cell: with $P = ${fmtP(res.pValue ?? 1)}$ the whole table departs from independence at once, and picking out a cell after a significant result is reading the data twice.`,
        correct: false,
        why: `Naming the largest contribution is standard practice and it is what makes a χ² finding usable. The test says the table departs; the contributions say where, and a conclusion that stops at "the variables are associated" hands the reader nothing to act on. What would be reading the data twice is testing that one cell afterwards as though it had been chosen in advance.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office}'s table of ${fmtInt(draw.total)} ${ctx.unit} returns $\\chi^2 = ${fmt(res.statistic, 2)}$ on ${fmtInt(res.df ?? 1)} degrees of freedom, $P = ${fmtP(res.pValue ?? 1)}$.\n\n**Observed**\n\n${observedMd(ctx, draw)}\n\n**Contributions**, $(O - E)^2/E$\n\n${tableMd(
        ['', ...ctx.colLabels],
        ctx.rowLabels.map((rl, r) => [rl, ...res.contributionTable[r].map((v) => fmt(v, 2))]),
      )}\n\nWhich sentence describes the association correctly?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'The contribution table says which cell. The observed and expected tables say which way.',
        `Find the largest contribution, then go back to that cell and compare the count that was recorded with the count the margins predicted.`,
      ],
      solution: `**${options[correct]}**\n\nTwo tables, two jobs. The contribution table locates the departure: ${fmt(res.contributions[res.largestContributor], 2)} of the ${fmt(res.statistic, 2)} total, which is ${fmtPct(share, 0)} of it, sits in **${ctx.rowLabels[i]} · ${ctx.colLabels[j]}**. The observed-against-expected comparison gives it a direction: ${fmtInt(o)} recorded where ${fmt(e, 2)} was expected, an ${over ? 'excess' : 'a shortfall'} of ${fmt(Math.abs(o - e), 2)}.\n\nThe contribution is a squared quantity and every one of them is positive, so the table of contributions on its own can never say which way a cell went. Always read the sign off $O - E$.\n\nAnd the conclusion still says *association*, not cause. ${ctx.designLine} Nothing here was assigned; what the test establishes is that ${ctx.rowVariable} and ${ctx.colVariable} move together in ${ctx.population}, and the reason they do is a separate question.`,
      misconception: 'Reading the direction off the contribution. Contributions are squared and always positive; only O − E carries the sign, and a finding reported the wrong way round is worse than no finding.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Interpretation — the conclusion in context
// ---------------------------------------------------------------------------------------------

export const chiSquareConclusion = defineGenerator({
  id: 'act-8/chi-square-conclusion',
  label: 'The χ² conclusion in context',
  ap_topics: ['8.6', '8.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_WAY_CONTEXTS)
    const alpha = pickContext(rng, ALPHAS)
    const { draw, res } = retry(
      rng,
      (r) => {
        const d = drawTable(r, ctx, { nMin: 90, nMax: 260, assocMin: 0.02, assocMax: 0.3 })
        return { draw: d, res: runTest(ctx, d) }
      },
      ({ res }) => {
        const p = res.pValue ?? 1
        return p > 0.0002 && p < 0.45 && Math.abs(p - alpha) > 0.01
      },
    )
    const p = res.pValue ?? 1
    const reject = p < alpha
    const { i, j } = cellOf(res, res.largestContributor)
    const o = draw.counts[i][j]
    const e = draw.expected[i][j]
    const over = o > e

    const tpl = significanceTestConclusion({
      pValue: p,
      alpha,
      direction: 'two-sided',
      directionWords: ['associated', 'association', 'related', 'not independent', 'not the same'],
      parameterContext: {
        parameter: 'association',
        population: ctx.population,
        variable: `between ${ctx.rowVariable} and ${ctx.colVariable}`,
      },
    })

    const exemplar = reject
      ? `Because the p-value (${fmtP(p)}) is less than α = ${fmt(alpha, 2)}, we reject H₀. There is convincing evidence of an association between ${ctx.rowVariable} and ${ctx.colVariable} among ${ctx.population}: the counts differ from what independence would predict, and the largest contribution comes from ${ctx.rowLabels[i]} with ${ctx.colLabels[j]}, where ${fmtInt(o)} were recorded against ${fmt(e, 2)} expected. Nothing here was randomly assigned, so this is an association and not a cause.`
      : `Because the p-value (${fmtP(p)}) is greater than α = ${fmt(alpha, 2)}, we fail to reject H₀. There is not convincing evidence of an association between ${ctx.rowVariable} and ${ctx.colVariable} among ${ctx.population}; the counts do not differ from what independence would predict by more than ordinary sampling variation would produce.`

    return {
      prompt: `${ctx.office} ran the test of ${testName(ctx)} on its ${fmtInt(draw.total)} ${ctx.unit}, at $\\alpha = ${fmt(alpha, 2)}$. Conditions hold.\n\n${observedMd(ctx, draw)}\n\n$$\\chi^2 = ${fmt(res.statistic, 3)} \\qquad df = ${fmtInt(res.df ?? 1)} \\qquad P = ${fmtP(p)}$$\n\nThe largest contribution, ${fmt(res.contributions[res.largestContributor], 2)}, is **${ctx.rowLabels[i]} · ${ctx.colLabels[j]}**: ${fmtInt(o)} recorded against ${fmt(e, 2)} expected.\n\nWrite the **conclusion in context**${reject ? ', naming the cell that drives it' : ''}.`,
      answer: { ...tpl, exemplar, minWords: reject ? 30 : 20 },
      hints: [
        'Decision first, with the two numbers beside each other. Then the claim, in the words of the file rather than in symbols.',
        `p = ${fmtP(p)} against α = ${fmt(alpha, 2)}: ${reject ? 'below it' : 'above it'}. Say the decision, then say what there ${reject ? 'is' : 'is not'} evidence of, and name ${ctx.rowVariable}, ${ctx.colVariable} and ${ctx.population}.`,
        reject
          ? `Then one more sentence: which cell carried the statistic, and whether that cell came in above or below what the margins predicted.`
          : `Do not write that the variables are independent. Failing to reject leaves the data consistent with independence and settles nothing.`,
      ],
      solution: `**${exemplar}**\n\nFour parts, and a χ² conclusion is marked on all four.\n\n1. **The decision**, with $P = ${fmtP(p)}$ and $\\alpha = ${fmt(alpha, 2)}$ written next to each other so the reader can check it.\n2. **Evidence, not fact.** ${reject ? 'Convincing evidence of an association' : 'Not convincing evidence of an association'}, never "the variables are ${reject ? 'associated' : 'independent'}" flat.\n3. **In context.** ${ctx.rowVariable} and ${ctx.colVariable}, among ${ctx.population}. A conclusion in symbols is not a conclusion.\n4. ${
        reject
          ? `**Where it came from.** ${ctx.rowLabels[i]} with ${ctx.colLabels[j]}: ${fmtInt(o)} against ${fmt(e, 2)} expected, ${over ? 'an excess' : 'a shortfall'}. The test says the table departs; the contributions say where, and a reader who has to act needs the second half.`
          : `**What it does not say.** Failing to reject is not evidence that the variables are independent. It says this file could not tell the two apart, which on ${fmtInt(draw.total)} ${ctx.unit} may simply be a question of how much data there is.`
      }\n\n${reject ? 'And the limit: nothing in this design was assigned, so the finding is association. Two variables that move together in an observational file may do so because one drives the other, because something else drives both, or because of how the file was assembled.' : ''}`,
      misconception: reject
        ? 'Reading significance as size. A small P-value says the departure is larger than sampling variation comfortably explains; it says nothing about how large the departure is, and on a big table a trivial one will clear any α.'
        : 'Concluding that the variables are independent. A test that fails to reject has not established the null; it has failed to rule it out.',
    }
  },
})
