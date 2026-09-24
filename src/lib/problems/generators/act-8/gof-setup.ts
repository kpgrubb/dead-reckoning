/**
 * act-8-01 · Volatiles — drills. AP 8.1, 8.2: setting a goodness-of-fit test up and getting as far
 * as the statistic, which is where 8-01 stops.
 *
 *   act-8/expected-counts        numeric  E = n·pᵢ for a named category
 *   act-8/gof-conditions         interp   the shared `conditionsCheck`, chi-square variant
 *   act-8/gof-statistic          numeric  χ² = Σ(O − E)²/E by hand on a small table
 *   act-8/gof-degrees-of-freedom numeric  df = k − 1, against the two-way formula
 *   act-8/gof-hypotheses         choice   H₀ and Hₐ in terms of a claimed distribution
 *   act-8/gof-percentages-trap   choice   what feeding the statistic percentages does to it
 *
 * The cargo column of the thirty-one, the Lane's 38/21/17/24 mix and everything computed from them
 * belong to the mission beats. Every framing here is another office, another file, another season.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { conditionsCheck } from '@/lib/problems/rubrics'
import { chi2, chiSquareGOF, fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats'

// ---------------------------------------------------------------------------------------------
// Framings and helpers, shared with gof-conclusion.ts
// ---------------------------------------------------------------------------------------------

export interface Candidate {
  text: string
  correct: boolean
  why: string | null
}

export function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

export interface GofContext {
  /** Who holds the file. */
  office: string
  /** One row of it, singular. */
  unit: string
  /** Plural. */
  units: string
  /** The categorical variable, named. */
  variable: string
  /** Where the claimed distribution comes from. */
  claim: string
  /** The population the rows were drawn from, for the 10% condition and the context group. */
  population: string
  /** Roughly how many of those there are. */
  populationSize: number
  categories: readonly string[]
  probs: readonly number[]
}

export const GOF_CONTEXTS: readonly GofContext[] = [
  {
    office: 'the Ceres dock inspectorate',
    unit: 'inspection',
    units: 'inspections',
    variable: 'defect class',
    claim: "the yard's published defect table",
    population: 'hulls docking at Ceres in a season',
    populationSize: 5200,
    categories: ['seals', 'valve gear', 'wiring', 'structure'],
    probs: [0.4, 0.24, 0.22, 0.14],
  },
  {
    office: 'the Lane Authority traffic office at Mark 6',
    unit: 'advisory',
    units: 'advisories',
    variable: 'advisory type',
    claim: "the corridor's published five-year mix",
    population: 'advisories logged on the corridor',
    populationSize: 24000,
    categories: ['debris', 'profile deviation', 'transponder', 'medical'],
    probs: [0.35, 0.28, 0.23, 0.14],
  },
  {
    office: 'the cutter *Tindr*',
    unit: 'boarding',
    units: 'boardings',
    variable: 'registry of the hull boarded',
    claim: "the Lane schedule's registry mix",
    population: 'hulls on the Lane schedule',
    populationSize: 3100,
    categories: ['Perrine', 'Mercantile', 'independent', 'other'],
    probs: [0.33, 0.41, 0.2, 0.06],
  },
  {
    office: 'the Bureau of Hulls at Uruk High',
    unit: 'certification',
    units: 'certifications',
    variable: 'drive family',
    claim: "the registry's published fleet mix",
    population: 'certified hulls on the registry',
    populationSize: 9400,
    categories: ['Mk 3', 'Tessera-C', 'Mk 2', 'other'],
    probs: [0.43, 0.3, 0.19, 0.08],
  },
  {
    office: 'the Hygiea Hold berthing master',
    unit: 'berthing',
    units: 'berthings',
    variable: 'declared destination',
    claim: "the Hold's own five-year book",
    population: 'hulls berthing at the Hold',
    populationSize: 4600,
    categories: ['inbound Ceres', 'inbound Mars', 'outbound Jovian', 'local'],
    probs: [0.37, 0.26, 0.21, 0.16],
  },
]

/** Counts and statistics the Act's own beats own; a drill that prints one invites recall, not work. */
const RESERVED_COUNTS = new Set([2, 3, 5, 11, 12, 14, 19, 21, 31, 46, 412, 2612])
const RESERVED_STATS = [40.83, 32.25, 16.9, 10.0, 6.51, 5.27, 11.78, 7.44]

export const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
export const reservedStat = (v: number): boolean => RESERVED_STATS.some((r) => Math.abs(v - r) < 0.04)

export interface GofDraw {
  ctx: GofContext
  n: number
  observed: number[]
  inflate: number
}

export interface GofDrawOptions {
  /** Whether the smallest expected count clears five. */
  conditionsHold?: boolean
  /** How far off its claimed share the pushed category is driven. */
  strength?: readonly [number, number]
  /** The P-value band the finished table must land in. */
  pRange?: readonly [number, number]
  /** How far clear of the runner-up the largest contribution must be. 1 switches the check off. */
  leaderRatio?: number
  /** An extra condition on the finished table. */
  accept?: (d: GofDraw) => boolean
}

/**
 * A table on a claimed distribution with one category pushed off its share. The options exist
 * because the drills want different tables: a decisive one for the conclusion, a middling one for
 * the P-value, and one whose tallest bar is not its largest contributor for the follow-up.
 */
export function drawGofTable(rng: Rng, opts: GofDrawOptions = {}): GofDraw {
  const { conditionsHold = true, strength = [2.2, 3.4] as const, pRange = [0, 0.02] as const, leaderRatio = 1.8, accept } = opts
  return retry(
    rng,
    (r): GofDraw => {
      const ctx = pickContext(r, GOF_CONTEXTS)
      const smallest = Math.min(...ctx.probs)
      const n = conditionsHold ? r.int(Math.ceil(7 / smallest), Math.ceil(12 / smallest)) : r.int(Math.ceil(2.2 / smallest), Math.floor(4.5 / smallest))
      const inflate = r.int(1, ctx.probs.length - 1)
      const weights = ctx.probs.map((p, i) => (i === inflate ? p * r.uniform(strength[0], strength[1]) : p))
      const wSum = weights.reduce((a, b) => a + b, 0)
      const observed = new Array<number>(ctx.probs.length).fill(0)
      for (let i = 0; i < n; i++) observed[r.weightedIndex(weights.map((w) => w / wSum))]++
      return { ctx, n, observed, inflate }
    },
    (draw) => {
      const { ctx, n, observed } = draw
      if (observed.some((o) => o === 0)) return false
      if (reservedCount(n)) return false
      const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
      const minE = Math.min(...gof.expected)
      if (conditionsHold !== minE >= 5) return false
      if (conditionsHold && minE < 5.6) return false
      if (!conditionsHold && minE > 4.5) return false
      if (reservedStat(gof.statistic)) return false
      const p = gof.pValue as number
      if (p < pRange[0] || p > pRange[1]) return false
      // One clear leader, so "which category" is a real question with one answer.
      const sorted = [...gof.contributions].sort((a, b) => b - a)
      if (sorted[0] < leaderRatio * sorted[1]) return false
      return accept ? accept(draw) : true
    },
    400,
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — an expected count
// ---------------------------------------------------------------------------------------------

export const expectedCountsDrill = defineGenerator({
  id: 'act-8/expected-counts',
  label: 'Expected counts from a claimed distribution',
  ap_topics: ['8.1'],
  skills: ['2'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng)
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
    const ask = rng.int(0, ctx.categories.length - 1)
    const e = gof.expected[ask]

    return {
      prompt: `${ctx.office} classified **${fmtInt(n)} ${ctx.units}** from one season by ${ctx.variable}. Under ${ctx.claim} the ${fmtInt(ctx.categories.length)} classes should appear in the proportions ${ctx.categories.map((c, i) => `${c} ${fmtPct(ctx.probs[i], 0)}`).join(', ')}.\n\n${tableMd(['class', 'claimed share', 'observed'], ctx.categories.map((c, i) => [c, fmtPct(ctx.probs[i], 0), observed[i]]))}\n\nHow many **${ctx.categories[ask]}** ${ctx.units} does the claimed distribution expect in a file of this size? Give the expected count to **two decimal places**.`,
      answer: numericAnswer(e, 'other', { digits: 2 }),
      hints: [
        'An expected count is what the claimed distribution would put in that class, on average, in a file of this size. It is built from the total and the claimed share, and the observed column plays no part in it.',
        `$E_i = n p_i$, with $n = ${fmtInt(n)}$ and $p = ${fmt(ctx.probs[ask], 2)}$ for ${ctx.categories[ask]}.`,
        `${fmtInt(n)} × ${fmt(ctx.probs[ask], 2)}, to two decimal places, and do not round it to a whole ${ctx.unit}.`,
      ],
      solution: `$$E_{\\text{${ctx.categories[ask]}}} = n p_i = ${fmtInt(n)} \\times ${fmt(ctx.probs[ask], 2)} = \\mathbf{${fmt(e, 2)}}$$\n\nAll ${fmtInt(ctx.categories.length)} of them, for the same file:\n\n${tableMd(['class', 'p', 'E = np', 'O'], ctx.categories.map((c, i) => [c, fmt(ctx.probs[i], 2), fmt(gof.expected[i], 2), observed[i]]))}\n\nThe expected counts sum to ${fmt(gof.expected.reduce((a, b) => a + b, 0), 2)}, which is $n$, and that is the arithmetic check worth running before anything else.\n\nExpected counts are **not rounded to whole ${ctx.units}**. They are not a prediction of what one season will hold; they are the mean of the count under the claim, and the fractional part carries real information into $(O-E)^2/E$. Rounding ${fmt(e, 2)} to ${fmtInt(Math.round(e))} moves the contribution of that class by ${fmt(Math.abs((observed[ask] - Math.round(e)) ** 2 / Math.round(e) - gof.contributions[ask]), 3)}.`,
      misconception: `Rounding the expected count to a whole ${ctx.unit}, or reading it off the observed column. E comes from the claim and the total, and it keeps its decimals.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the conditions (rubric)
// ---------------------------------------------------------------------------------------------

export const gofConditions = defineGenerator({
  id: 'act-8/gof-conditions',
  label: 'Conditions for a chi-square goodness-of-fit test',
  ap_topics: ['8.2'],
  skills: ['4'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng)
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories, random: true, populationSize: ctx.populationSize })
    const minE = Math.min(...gof.expected)
    const minIndex = gof.expected.indexOf(minE)
    const minObserved = Math.min(...observed)
    const minObservedIndex = observed.indexOf(minObserved)

    const answer = conditionsCheck({
      procedure: 'chi-square',
      random: 'sample',
      n,
      populationSize: ctx.populationSize,
      minExpected: minE,
      context: ctx.units,
    })

    return {
      prompt: `${ctx.office} drew **${fmtInt(n)} ${ctx.units}** at random from the ${fmtInt(ctx.populationSize)} ${ctx.population} and classified each by ${ctx.variable}, against ${ctx.claim}.\n\n${tableMd(['class', 'claimed share', 'observed', 'expected'], ctx.categories.map((c, i) => [c, fmtPct(ctx.probs[i], 0), observed[i], fmt(gof.expected[i], 2)]))}\n\nWrite the conditions paragraph that goes above the test. Name each condition and show the numbers that settle it.`,
      answer,
      hints: [
        'Three conditions, and each one is a sentence with a number in it: where the data came from, whether the rows can be treated as independent, and whether the table is big enough for the chi-square approximation.',
        `The sample is ${fmtInt(n)} out of ${fmtInt(ctx.populationSize)}, so the 10% check is ${fmtInt(10 * n)} against ${fmtInt(ctx.populationSize)}. The large-counts check is on the **expected** column.`,
        `The smallest expected count in this table is ${fmt(minE, 2)}, for ${ctx.categories[minIndex]}. Quote it.`,
      ],
      solution: `**${answer.exemplar}**\n\nThe third one is where goodness of fit is lost. The condition is that **every expected count is at least 5**, and the expected counts are the $np_i$ column, computed from the claim. Here the smallest is ${fmt(minE, 2)} for ${ctx.categories[minIndex]}, so it holds.\n\nThe smallest **observed** count in the same table is ${fmtInt(minObserved)}, for ${ctx.categories[minObservedIndex]}, and it is not the condition and never was. A class the claim expected plenty of and the file barely contains is exactly the departure the test exists to detect: throwing the table out because that class came in small would discard the finding to protect the procedure.\n\nThe 10% condition is what buys independence when the ${ctx.units} are drawn without replacement: ${fmtInt(10 * n)} is below ${fmtInt(ctx.populationSize)}, so the draws behave closely enough like independent ones.`,
      misconception: `Checking the ≥ 5 condition on the observed counts. The condition is on E, not O — and O is small precisely where the claim is wrong.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — the statistic by hand
// ---------------------------------------------------------------------------------------------

export const gofStatistic = defineGenerator({
  id: 'act-8/gof-statistic',
  label: 'The chi-square statistic by hand',
  ap_topics: ['8.2'],
  skills: ['2'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng)
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
    const driver = gof.largestContributor

    return {
      prompt: `${ctx.office} logged **${fmtInt(n)} ${ctx.units}** and classified each by ${ctx.variable}. ${ctx.claim.charAt(0).toUpperCase() + ctx.claim.slice(1)} gives the shares below.\n\n${tableMd(['class', 'claimed share', 'observed'], ctx.categories.map((c, i) => [c, fmtPct(ctx.probs[i], 0), observed[i]]))}\n\nCompute the chi-square goodness-of-fit statistic for this table. Carry the expected counts unrounded and report $\\chi^2$ to **two decimal places**.`,
      answer: numericAnswer(gof.statistic, 'testStat', { tolerance: 0.05 }),
      hints: [
        'Build the expected column first, then work one class at a time: the gap, squared, divided by what that class expected. Add the results.',
        `$\\chi^2 = \\sum \\dfrac{(O-E)^2}{E}$ with $E_i = ${fmtInt(n)} p_i$. Four terms, one per class.`,
        `The four terms are ${gof.contributions.map((c) => fmt(c, 2)).join(', ')}.`,
      ],
      solution: `${tableMd(['class', 'O', 'E = np', 'O − E', '(O − E)²/E'], ctx.categories.map((c, i) => [c, observed[i], fmt(gof.expected[i], 2), fmt(observed[i] - gof.expected[i], 2), fmt(gof.contributions[i], 3)]))}\n\n$$\\chi^2 = ${gof.contributions.map((c) => fmt(c, 3)).join(' + ')} = \\mathbf{${fmt(gof.statistic, 2)}}$$\n\nEvery term is positive, because the gap is squared, so a class that came in low and a class that came in high push the statistic the same way. That is why the P-value lives in one tail only.\n\nThe division by $E$ is the part worth pausing on. A gap of ${fmt(Math.abs(observed[driver] - gof.expected[driver]), 1)} against an expectation of ${fmt(gof.expected[driver], 2)} is a different event from the same gap against an expectation of ${fmtInt(Math.round(gof.expected[driver] * 8))}, and dividing by $E$ is what puts them on the same scale. Here ${ctx.categories[driver]} contributes ${fmt(gof.contributions[driver], 2)}, which is ${fmtPct(gof.contributions[driver] / gof.statistic, 0)} of the total.`,
      misconception: 'Dividing by n, or by the observed count, instead of by the expected count. The denominator is E in every term, and it is what makes the terms comparable across classes of different sizes.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — degrees of freedom
// ---------------------------------------------------------------------------------------------

export const gofDegreesOfFreedom = defineGenerator({
  id: 'act-8/gof-degrees-of-freedom',
  label: 'Degrees of freedom for goodness of fit',
  ap_topics: ['8.2'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, GOF_CONTEXTS)
    const k = ctx.categories.length
    const n = retry(
      rng,
      (r) => r.int(60, 400),
      (v) => !reservedCount(v),
    )
    const df = k - 1
    const wrongTwoWay = (k - 1) * (2 - 1)
    const crit = chi2.isf(0.05, df)

    return {
      prompt: `${ctx.office} tested **${fmtInt(n)} ${ctx.units}**, classified into the ${fmtInt(k)} classes of ${ctx.variable}, against ${ctx.claim}.\n\nHow many **degrees of freedom** does the goodness-of-fit test carry? Give a whole number.`,
      answer: numericAnswer(df, 'count'),
      hints: [
        'Degrees of freedom count how many of the cells are free to move once the total is fixed. Fix the total, fill in all but one cell, and the last one is determined.',
        `This is one row of ${fmtInt(k)} classes tested against a claimed distribution, so the count is about the number of classes and not about ${fmtInt(n)}.`,
      ],
      solution: `$$df = k - 1 = ${fmtInt(k)} - 1 = \\mathbf{${fmtInt(df)}}$$\n\n$k$ is the number of **classes**, ${fmtInt(k)} here. The sample size ${fmtInt(n)} does not appear: it sets how precise the test is, not how many degrees of freedom it has, and a file of ${fmtInt(n * 10)} ${ctx.units} in the same ${fmtInt(k)} classes would still carry ${fmtInt(df)}.\n\nThe df is the whole scale of the statistic. A $\\chi^2$ of ${fmt(crit, 2)} sits exactly on the 5% critical value at ${fmtInt(df)} df; the same ${fmt(crit, 2)} against 1 df has a P-value of ${fmtP(chi2.sf(crit, 1))}, and against 15 it has ${fmtP(chi2.sf(crit, 15))}. Report the statistic without its df and you have reported nothing.\n\nOn a TI-84 the \`χ²GOF-Test\` screen has a \`df:\` field and it will accept whatever you type. It is ${fmtInt(k)} − 1, not the $(r-1)(c-1) = ${fmtInt(wrongTwoWay)}$ that belongs to a two-way table.`,
      misconception: `Using n − 1, or reaching for (rows − 1)(columns − 1). Goodness of fit has one row of ${fmtInt(k)} classes, and df = k − 1.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — the hypotheses
// ---------------------------------------------------------------------------------------------

export const gofHypotheses = defineGenerator({
  id: 'act-8/gof-hypotheses',
  label: 'Hypotheses for a claimed distribution',
  ap_topics: ['8.1'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, GOF_CONTEXTS)
    const k = ctx.categories.length
    const shares = ctx.categories.map((c, i) => `${c} ${fmtPct(ctx.probs[i], 0)}`).join(', ')
    const first = ctx.categories[0]
    const second = ctx.categories[1]

    const cands: Candidate[] = [
      {
        text: `H₀: the ${ctx.variable} of ${ctx.population} follows ${ctx.claim} — ${shares}. Hₐ: at least one of those ${fmtInt(k)} proportions differs from the claimed value.`,
        correct: true,
        why: null,
      },
      {
        text: `H₀: the ${ctx.variable} of ${ctx.population} follows ${ctx.claim}. Hₐ: **all ${fmtInt(k)}** of the proportions differ from their claimed values.`,
        correct: false,
        why: `The alternative to "every proportion matches" is "at least one does not", and a single class off its share is enough to make the claim false. Requiring all ${fmtInt(k)} to differ would leave the most interesting case — one class badly wrong and the rest exactly right — with nowhere to go.`,
      },
      {
        text: `H₀: $\\hat{p}_{\\text{${first}}} = ${fmt(ctx.probs[0], 2)}$ and $\\hat{p}_{\\text{${second}}} = ${fmt(ctx.probs[1], 2)}$, and so on for all ${fmtInt(k)} classes. Hₐ: at least one sample proportion differs.`,
        correct: false,
        why: 'Hypotheses are statements about parameters, never about statistics. The sample proportions are already known exactly from the file, and there is nothing to test about them. Write the claim about the population proportions $p_i$.',
      },
      {
        text: `H₀: the ${ctx.variable} and the class of ${ctx.unit} are independent. Hₐ: they are associated.`,
        correct: false,
        why: 'That is the hypothesis pair for a two-way table, where one sample is classified by two variables. Here there is one variable and an external claim about how it should be distributed, so the null names the distribution itself.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} is about to test its season's ${ctx.units} against ${ctx.claim}, which gives ${shares}.\n\n**Which pair of hypotheses is the test's?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A goodness-of-fit null is a claim about a whole distribution at once: it names every proportion the claim asserts. Then ask what the smallest departure from that claim looks like.',
        'Two of the four fail on a technicality worth knowing: one writes the hypotheses about sample proportions, and one writes the hypotheses for a different procedure altogether.',
      ],
      solution: `**${options[correct]}**\n\nThe null is the *whole* claimed distribution, written out: $p_{\\text{${first}}} = ${fmt(ctx.probs[0], 2)}$, $p_{\\text{${second}}} = ${fmt(ctx.probs[1], 2)}$, and so on for all ${fmtInt(k)} classes. Written that way it is one statement, and the test has one statistic for it.\n\nThe alternative is its logical negation, which is **at least one** proportion differs. That phrasing has consequences at the other end of the procedure: a small P-value says the claimed distribution is wrong somewhere, and it never says where. Finding where is a separate reading, off the contributions.\n\nBoth hypotheses are about population proportions $p_i$ — the ${ctx.variable} of ${ctx.population} at large — and not about the ${ctx.units} in the file. The file's own shares are known and need no hypothesis.`,
      misconception: 'Writing Hₐ as "all of the proportions differ". One class off its claimed share already falsifies the claimed distribution.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Choice — percentages instead of counts
// ---------------------------------------------------------------------------------------------

export const gofPercentagesTrap = defineGenerator({
  id: 'act-8/gof-percentages-trap',
  label: 'Counts, not percentages, in the statistic',
  ap_topics: ['8.2'],
  skills: ['2', '4'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng)
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
    const observedPct = observed.map((o) => (o / n) * 100)
    const expectedPct = ctx.probs.map((p) => p * 100)
    const fromPct = chiSquareGOF({ observed: observedPct, expected: expectedPct, categories: ctx.categories })
    const fromProp = chiSquareGOF({ observed: observed.map((o) => o / n), expected: ctx.probs, categories: ctx.categories })
    const df = ctx.categories.length - 1

    const cands: Candidate[] = [
      {
        text: `$\\chi^2 = ${fmt(gof.statistic, 2)}$. Percentages produce ${fmt(fromPct.statistic, 1)} instead, which is $100/n$ times too large, and the same table written as proportions would produce ${fmt(fromProp.statistic, 3)}, which is $n$ times too small.`,
        correct: true,
        why: null,
      },
      {
        text: `$\\chi^2 = ${fmt(fromPct.statistic, 2)}$. Percentages are the right footing for a comparison of shares, because they put the observed file and the claimed distribution in the same units.`,
        correct: false,
        why: `Both columns are already in the same units when they are counts: ${fmtInt(n)} ${ctx.units} observed, ${fmtInt(n)} expected. Rescaling both to percentages multiplies every term of $\\sum (O-E)^2/E$ by $100/n = ${fmt(100 / n, 3)}$, so the statistic comes out ${fmt(fromPct.statistic, 1)} and the P-value is a fiction.`,
      },
      {
        text: `$\\chi^2 = ${fmt(fromProp.statistic, 3)}$. Proportions are the safest footing, because they cannot be affected by the size of the file.`,
        correct: false,
        why: `The size of the file is exactly what the statistic is supposed to be affected by. The same shares out of ${fmtInt(n * 6)} ${ctx.units} are far stronger evidence than out of ${fmtInt(n)}, and dividing everything by $n$ throws that away: ${fmt(fromProp.statistic, 3)} on ${fmtInt(df)} df has a P-value of ${fmtP(fromProp.pValue as number)}, which would find nothing in any table whatsoever.`,
      },
      {
        text: `$\\chi^2 = ${fmt(gof.statistic, 2)}$ from the counts, and ${fmt(fromPct.statistic, 1)} from the percentages, but the two give the same P-value, because $\\chi^2$ is scale-free.`,
        correct: false,
        why: `There is no scale-free reading of a $\\chi^2$. On ${fmtInt(df)} df the counts give $P = ${fmtP(gof.pValue as number)}$ and the percentages give $P = ${fmtP(fromPct.pValue as number)}$. The statistic carries the sample size inside it, which is the only reason it can weigh evidence at all.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} has **${fmtInt(n)} ${ctx.units}** classified by ${ctx.variable}, against ${ctx.claim}. A clerk has typed the **percentages** into the goodness-of-fit screen instead of the counts: ${ctx.categories.map((c, i) => `${c} ${fmt(observedPct[i], 1)}% observed against ${fmt(expectedPct[i], 0)}% claimed`).join(', ')}.\n\n${tableMd(['class', 'observed count', 'observed %', 'claimed %'], ctx.categories.map((c, i) => [c, observed[i], fmt(observedPct[i], 1), fmt(expectedPct[i], 0)]))}\n\n**What is the test's statistic, and what did the percentages do to it?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Write one term out in symbols with the observed and expected both multiplied by the same constant, and see what happens to the constant. It does not cancel.',
        `Multiplying $O$ and $E$ by $c$ turns $(O-E)^2/E$ into $c\\,(O-E)^2/E$. Here $c = 100/${fmtInt(n)}$ for percentages and $1/${fmtInt(n)}$ for proportions.`,
        `So the counts' ${fmt(gof.statistic, 2)} becomes ${fmt(fromPct.statistic, 1)} on percentages and ${fmt(fromProp.statistic, 3)} on proportions.`,
      ],
      solution: `$$\\frac{(cO - cE)^2}{cE} = \\frac{c^2 (O-E)^2}{cE} = c\\,\\frac{(O-E)^2}{E}$$\n\nOne factor of $c$ survives, so the whole statistic scales by $c$ and every reading off it moves.\n\n${tableMd(['fed to the formula', 'c', 'χ²', 'P on ' + fmtInt(df) + ' df'], [['counts', '1', fmt(gof.statistic, 2), fmtP(gof.pValue as number)], ['percentages', fmt(100 / n, 3), fmt(fromPct.statistic, 2), fmtP(fromPct.pValue as number)], ['proportions', fmt(1 / n, 4), fmt(fromProp.statistic, 3), fmtP(fromProp.pValue as number)]])}\n\n**${options[correct]}**\n\nThe sample size is not incidental to $\\chi^2$; it is the thing that gives the statistic its weight. A gap of ten percentage points out of ${fmtInt(n)} ${ctx.units} and the same ten points out of a dozen are different evidence, and the counts are how the formula knows the difference. Percentages and proportions both delete it, in opposite directions, and neither screen warns you.`,
      misconception: `Typing shares into L1 and L2. The chi-square statistic runs on counts, and the P-value it returns from anything else answers a question nobody asked.`,
    }
  },
})
