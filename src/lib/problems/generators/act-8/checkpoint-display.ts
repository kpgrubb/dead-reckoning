/**
 * act-8/observed-vs-expected — the Act VIII checkpoint's one display item (map §5, q9).
 *
 * A bar chart with each category's observed count beside its expected count under a claimed
 * distribution, and one question about both things a goodness-of-fit table has to be read for: do
 * the expected counts clear five, and which category is actually driving the statistic. The draw is
 * arranged so that the category with the largest *observed* count is never the largest contributor,
 * because reading the tallest bar is the mistake the item exists to catch.
 *
 * Owned by the Act lead (the checkpoint is the lead's file); the module drills live beside it in
 * gof-setup.ts and gof-conclusion.ts.
 */
import { defineGenerator, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { chiSquareGOF, fmt, fmtInt } from '@/lib/stats'
import type { Rng } from '@/lib/rng'

interface Candidate {
  text: string
  correct: boolean
  why: string | null
}

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

interface GofContext {
  /** Who holds the file. */
  office: string
  /** What one row of the file is. */
  unit: string
  /** Plural, for the sentence "of the 48 …". */
  units: string
  /** The categorical variable. */
  variable: string
  /** The claimed distribution's provenance. */
  claim: string
  categories: readonly string[]
  probs: readonly number[]
}

const CONTEXTS: readonly GofContext[] = [
  {
    office: 'the Authority traffic office at Mark 6',
    unit: 'advisory',
    units: 'advisories',
    variable: 'advisory type',
    claim: "the corridor's published five-year mix",
    categories: ['debris', 'profile deviation', 'transponder', 'medical'],
    probs: [0.34, 0.27, 0.24, 0.15],
  },
  {
    office: 'the Ceres dock inspectorate',
    unit: 'inspection',
    units: 'inspections',
    variable: 'defect class',
    claim: "the yard's own defect table",
    categories: ['seals', 'valve gear', 'wiring', 'structure'],
    probs: [0.41, 0.23, 0.22, 0.14],
  },
  {
    office: 'the cutter *Tindr*',
    unit: 'boarding',
    units: 'boardings',
    variable: 'registry of the hull boarded',
    claim: "the Lane schedule's registry mix",
    categories: ['Perrine', 'Mercantile', 'independent', 'other'],
    probs: [0.34, 0.42, 0.18, 0.06],
  },
  {
    office: 'the Bureau of Hulls at Uruk High',
    unit: 'certification',
    units: 'certifications',
    variable: 'declared cargo class',
    claim: "the corridor's declared mix",
    categories: ['He-3 / D', 'volatiles', 'metals', 'manufactured'],
    probs: [0.36, 0.22, 0.19, 0.23],
  },
  {
    office: 'the relay net at Mark 9',
    unit: 'contact',
    units: 'contacts',
    variable: 'drive family',
    claim: "the registry's published fleet mix",
    categories: ['Mk 3', 'Tessera-C', 'Mk 2', 'other'],
    probs: [0.44, 0.31, 0.17, 0.08],
  },
]

interface Draw {
  ctx: GofContext
  n: number
  observed: number[]
  conditionsFail: boolean
}

export const observedVsExpected = defineGenerator({
  id: 'act-8/observed-vs-expected',
  label: 'Observed against expected',
  ap_topics: ['8.1', '8.2'],
  skills: ['2', '4'],
  generate(rng) {
    const { ctx, n, observed, conditionsFail } = retry(
      rng,
      (r): Draw => {
        const c = pickContext(r, CONTEXTS)
        // Half the draws are sized so the smallest expected count fails the ≥ 5 condition.
        const fail = r.bool(0.4)
        const smallest = Math.min(...c.probs)
        const total = fail ? r.int(Math.ceil(2 / smallest), Math.floor(4.6 / smallest)) : r.int(Math.ceil(7 / smallest), Math.ceil(11 / smallest))
        // Push one category (never the largest-probability one) well above its share.
        const inflate = r.int(1, c.probs.length - 1)
        const weights = c.probs.map((p, i) => (i === inflate ? p * r.uniform(2.4, 3.6) : p))
        const wSum = weights.reduce((a, b) => a + b, 0)
        const counts = new Array<number>(c.probs.length).fill(0)
        for (let i = 0; i < total; i++) counts[r.weightedIndex(weights.map((w) => w / wSum))]++
        return { ctx: c, n: total, observed: counts, conditionsFail: fail }
      },
      ({ ctx, observed, n, conditionsFail }) => {
        if (observed.some((o) => o === 0)) return false
        const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories as string[] })
        const minE = Math.min(...gof.expected)
        if (conditionsFail !== minE < 5) return false
        if (conditionsFail && minE > 4.6) return false
        if (!conditionsFail && minE < 5.6) return false
        // The statistic must be decisive, or "which category drives it" is not a real question.
        if (gof.pValue! > 0.02) return false
        // The tallest bar must NOT be the largest contributor: that is the trap.
        let tallest = 0
        for (let i = 1; i < observed.length; i++) if (observed[i] > observed[tallest]) tallest = i
        if (tallest === gof.largestContributor) return false
        // One clear leader among the contributions.
        const sorted = [...gof.contributions].sort((a, b) => b - a)
        if (sorted[0] < 2 * sorted[1]) return false
        return n >= 30
      },
    )

    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories as string[] })
    const minE = Math.min(...gof.expected)
    const minIndex = gof.expected.indexOf(minE)
    const driver = gof.largestContributor
    let tallest = 0
    for (let i = 1; i < observed.length; i++) if (observed[i] > observed[tallest]) tallest = i

    const cands: Candidate[] = [
      {
        text: conditionsFail
          ? `One expected count is below 5 (**${ctx.categories[minIndex]}**, ${fmt(minE, 2)}), so the chi-square approximation should not be trusted here. Had it been run, **${ctx.categories[driver]}** would be the largest contributor.`
          : `All four expected counts clear 5 (the smallest is **${ctx.categories[minIndex]}** at ${fmt(minE, 2)}), so the conditions are met, and **${ctx.categories[driver]}** is the largest contributor.`,
        correct: true,
        why: null,
      },
      {
        text: conditionsFail
          ? `All four expected counts clear 5, so the conditions are met, and **${ctx.categories[driver]}** is the largest contributor.`
          : `One expected count is below 5, so the chi-square approximation should not be trusted here, although **${ctx.categories[driver]}** would be the largest contributor.`,
        correct: false,
        why: conditionsFail
          ? `The smallest expected count is ${fmt(minE, 2)}, for ${ctx.categories[minIndex]}. The condition is on the **expected** counts, not the observed ones, and this table fails it.`
          : `Check the expected counts before deciding they fail. The smallest is ${fmt(minE, 2)}, for ${ctx.categories[minIndex]}, which clears 5. The smallest *observed* count is ${fmtInt(Math.min(...observed))}, and that is not the condition.`,
      },
      {
        text: `${conditionsFail ? `One expected count is below 5, so the chi-square approximation should not be trusted here. Had it been run, **${ctx.categories[tallest]}**` : `All four expected counts clear 5, so the conditions are met, and **${ctx.categories[tallest]}**`} would be the largest contributor, because it has the most ${ctx.units}.`,
        correct: false,
        why: `${ctx.categories[tallest]} has the tallest observed bar (${fmtInt(observed[tallest])}), and it is also the category the claimed distribution expected most of (${fmt(gof.expected[tallest], 2)}). A contribution is $(O-E)^2/E$, so it measures the **gap** against the expectation, not the height of the bar. ${ctx.categories[tallest]} contributes ${fmt(gof.contributions[tallest], 2)} against ${ctx.categories[driver]}'s ${fmt(gof.contributions[driver], 2)}.`,
      },
      {
        text: `The conditions cannot be checked from this display, because the sample is ${fmtInt(n)} ${ctx.units} and a chi-square test needs at least 30 in every category.`,
        correct: false,
        why: 'There is no per-category minimum of 30 anywhere in this procedure. The condition is that every **expected** count is at least 5, and the expected counts are computed from the claimed distribution and the total, both of which are in front of you.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    // Paired bars: each category's observed count beside its expected count under the claim.
    const categories = ctx.categories.flatMap((c) => [`${c}\nobs`, `${c}\nexp`])
    const counts = observed.flatMap((o, i) => [o, Math.round(gof.expected[i] * 100) / 100])

    return {
      prompt: `${ctx.office} logged **${fmtInt(n)} ${ctx.units}** in one season and classified each one by ${ctx.variable}. Under ${ctx.claim} the four classes should appear in the proportions ${ctx.categories.map((c, i) => `${c} ${fmt(ctx.probs[i] * 100, 0)}%`).join(', ')}.\n\nThe display pairs each class's observed count with the count the claimed mix expects.\n\n${tableMd(['class', 'claimed share', 'observed', 'expected'], ctx.categories.map((c, i) => [c, `${fmt(ctx.probs[i] * 100, 0)}%`, observed[i], fmt(gof.expected[i], 2)]))}\n\n**Are the conditions for a chi-square goodness-of-fit test met, and which class contributes most to the statistic?**`,
      answer: {
        type: 'display' as const,
        display: { kind: 'bar' as const, categories, counts, label: `${ctx.variable}: observed beside expected` },
        question: { type: 'choice' as const, options, correct, feedback },
      },
      hints: [
        'Two separate readings. The condition is a statement about the expected counts, and the contribution is a statement about the gap between a bar and its neighbour, divided by the neighbour.',
        `Expected counts are $n p_i$: ${fmtInt(n)} times each claimed share. The smallest is ${fmt(minE, 2)}. Then work $(O-E)^2/E$ for each class and compare, rather than looking for the tallest bar.`,
        `The four contributions are ${gof.contributions.map((c, i) => `${ctx.categories[i]} ${fmt(c, 2)}`).join(', ')}.`,
      ],
      solution: `${tableMd(['class', 'O', 'E = np', 'O − E', '(O − E)²/E'], ctx.categories.map((c, i) => [c, observed[i], fmt(gof.expected[i], 2), fmt(observed[i] - gof.expected[i], 2), fmt(gof.contributions[i], 2)]))}\n\n**Conditions.** The smallest expected count is ${fmt(minE, 2)}, for ${ctx.categories[minIndex]}, so the expected-count condition ${conditionsFail ? '**fails**' : '**holds**'}. It is checked on the expected column and never on the observed one: a class can be observed twice and still be fine, provided the claimed distribution expected five or more of it.\n\n**The driving class.** ${ctx.categories[driver]}, contributing ${fmt(gof.contributions[driver], 2)} of the ${fmt(gof.statistic, 2)} total — ${fmt((100 * gof.contributions[driver]) / gof.statistic, 0)}% of the statistic on its own. ${ctx.categories[tallest]} has the tallest bar at ${fmtInt(observed[tallest])} and contributes ${fmt(gof.contributions[tallest], 2)}, because the claim expected ${fmt(gof.expected[tallest], 2)} of it and got very nearly that.\n\n**${options[correct]}**`,
      misconception: 'Reading the tallest bar as the biggest contributor, and checking the ≥ 5 condition on the observed counts instead of the expected ones.',
    }
  },
})
