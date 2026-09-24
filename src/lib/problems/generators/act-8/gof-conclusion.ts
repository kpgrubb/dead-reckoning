/**
 * act-8-02 · Forty Seconds — drills. AP 8.3: reading a P-value off a chi-square statistic and its
 * df, saying the conclusion in context, and finding where the departure actually is.
 *
 *   act-8/gof-p-value          numeric  P = P(χ² ≥ statistic) on k − 1 df
 *   act-8/gof-conclusion       interp   `significanceTestConclusion` plus the driving class
 *   act-8/largest-contributor  choice   which class carries the statistic, against the tallest bar
 *   act-8/chi-square-df-trap   choice   one statistic, two df, opposite decisions
 *   act-8/chi-square-one-tail  choice   why the P-value is never doubled
 *
 * The cargo table and everything computed from it belong to the mission beats; every framing here
 * is another office's season. The contexts and the draw come from `./gof-setup`.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { significanceTestConclusion } from '@/lib/problems/rubrics'
import type { InterpretationAnswer, RubricGroup } from '@/lib/problems/types'
import { chi2, chi2Star, chiSquareGOF, fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats'
import { GOF_CONTEXTS, drawGofTable, reservedStat, shuffleChoice, type Candidate, type GofContext, type GofDraw } from './gof-setup'

/** Class names too generic to require by name in a rubric, or to point at in a conclusion. */
const GENERIC = new Set(['other', 'local', 'structure', 'medical'])

/** True when the class carrying the statistic has a name worth writing into a sentence. */
function namedDriver({ ctx, observed }: GofDraw): boolean {
  const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
  return !GENERIC.has(ctx.categories[gof.largestContributor])
}

/** A table gentle enough that its P-value is a number worth reading rather than "< 0.0001". */
const MODERATE = { strength: [1.12, 1.6] as const, pRange: [0.0002, 0.6] as const, leaderRatio: 1 }

/** The claimed distribution written out, for a prompt. */
const sharesOf = (ctx: GofContext) => ctx.categories.map((c, i) => `${c} ${fmtPct(ctx.probs[i], 0)}`).join(', ')

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the P-value
// ---------------------------------------------------------------------------------------------

export const gofPValue = defineGenerator({
  id: 'act-8/gof-p-value',
  label: 'P-value from a chi-square statistic and its df',
  ap_topics: ['8.3'],
  skills: ['2'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng, MODERATE)
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
    const df = gof.df as number
    const p = gof.pValue as number
    const crit = chi2Star(0.05, df)

    return {
      prompt: `${ctx.office} classified **${fmtInt(n)} ${ctx.units}** by ${ctx.variable} against ${ctx.claim} (${sharesOf(ctx)}), checked the conditions, and computed the statistic.\n\n${tableMd(['class', 'O', 'E', '(O − E)²/E'], ctx.categories.map((c, i) => [c, observed[i], fmt(gof.expected[i], 2), fmt(gof.contributions[i], 3)]))}\n\n$$\\chi^2 = ${fmt(gof.statistic, 3)}$$\n\nWhat is the **P-value** of this test? Give it to four decimal places.`,
      answer: numericAnswer(p, 'pValue'),
      hints: [
        'A P-value is the chance of a statistic at least this large when the claimed distribution is the true one. Decide which end of the chi-square curve "at least this large" means before you compute anything.',
        `The degrees of freedom are $k - 1 = ${fmtInt(df)}$, and the area wanted is the one **above** ${fmt(gof.statistic, 3)}.`,
        `On a TI-84: \`2nd\` \`VARS\` \`8:χ²cdf(\` with lower ${fmt(gof.statistic, 3)}, upper \`1E99\`, df ${fmtInt(df)}.`,
      ],
      solution: `$$df = k - 1 = ${fmtInt(ctx.categories.length)} - 1 = ${fmtInt(df)} \\qquad P = P(\\chi^2_{${fmtInt(df)}} \\ge ${fmt(gof.statistic, 3)}) = \\mathbf{${fmtP(p)}}$$\n\nThe area is the **upper tail and nothing else**. Every term of $\\sum (O-E)^2/E$ is a squared gap, so a class that came in low and a class that came in high both push the statistic up, and "a worse fit than this one" means "a larger $\\chi^2$" in every direction at once. There is no second tail to add, and no alternative to choose between: the \`χ²GOF-Test\` screen offers no tail field for exactly that reason.\n\nAgainst the usual cut: the 5% critical value on ${fmtInt(df)} df is ${fmt(crit, 3)}, and this statistic is ${gof.statistic > crit ? 'above' : 'below'} it, which agrees with $P = ${fmtP(p)}$ ${p < 0.05 ? '<' : '≥'} 0.05.`,
      misconception: 'Doubling the tail area for a two-sided alternative. Chi-square has one tail. Squaring the gaps has already folded both directions of departure into the same end of the curve.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the conclusion in context, naming the driving class
// ---------------------------------------------------------------------------------------------

export const gofConclusion = defineGenerator({
  id: 'act-8/gof-conclusion',
  label: 'Goodness-of-fit conclusion in context',
  ap_topics: ['8.3'],
  skills: ['4'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng, { accept: namedDriver })
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories, random: true, populationSize: ctx.populationSize })
    const df = gof.df as number
    const p = gof.pValue as number
    const alpha = 0.05
    const driver = gof.largestContributor
    const driverName = ctx.categories[driver]
    const share = gof.contributions[driver] / gof.statistic
    const over = observed[driver] > gof.expected[driver]

    const base = significanceTestConclusion({
      pValue: p,
      alpha,
      direction: 'two-sided',
      parameterContext: {
        parameter: 'distribution',
        population: ctx.population,
        variable: ctx.variable,
        nullValue: ctx.claim,
      },
      directionWords: ['not follow', 'not match', 'not fit', 'depart'],
    })

    const contributorGroup: RubricGroup = {
      label: `Names the class carrying the statistic (${driverName})`,
      phrasings: [driverName, 'largest contribut', 'biggest contribut'],
      minMatches: 1,
      polarity: 'any',
      feedback: `${driverName} contributes ${fmt(gof.contributions[driver], 2)} of the ${fmt(gof.statistic, 2)} total, ${fmtPct(share, 0)} of it. A rejection says the distribution is wrong somewhere; the contributions say where, and the follow-up sentence names it.`,
    }

    const answer: InterpretationAnswer = {
      ...base,
      required: [...base.required, contributorGroup],
      exemplar: `${base.exemplar} The departure is carried by ${driverName}, which contributes ${fmt(gof.contributions[driver], 2)} of the ${fmt(gof.statistic, 2)} total and came in ${over ? 'well above' : 'well below'} what ${ctx.claim} expects.`,
      minWords: 20,
    }

    return {
      prompt: `${ctx.office} drew **${fmtInt(n)} ${ctx.units}** at random from the ${fmtInt(ctx.populationSize)} ${ctx.population} and classified each by ${ctx.variable} against ${ctx.claim} (${sharesOf(ctx)}). Every expected count clears 5.\n\n${tableMd(['class', 'O', 'E', '(O − E)²/E'], ctx.categories.map((c, i) => [c, observed[i], fmt(gof.expected[i], 2), fmt(gof.contributions[i], 3)]))}\n\n$$\\chi^2 = ${fmt(gof.statistic, 2)}, \\quad df = ${fmtInt(df)}, \\quad P = ${fmtP(p)}$$\n\nWrite the conclusion at $\\alpha = ${fmt(alpha, 2)}$, in context, and then say where the departure is.`,
      answer,
      hints: [
        'The conclusion has a fixed shape: the decision, the P-value against α, evidence language, what the alternative claims, and the population and variable named. Then one more sentence, because a chi-square rejection on its own does not say which class is wrong.',
        `Here $P = ${fmtP(p)}$ against $\\alpha = ${fmt(alpha, 2)}$, and the alternative is that the ${ctx.variable} of ${ctx.population} does not follow ${ctx.claim}.`,
        `For the second sentence, read down the contribution column and name the largest one and whether that class came in above or below what the claim expects.`,
      ],
      solution: `**${answer.exemplar}**\n\nTwo sentences doing two different jobs. The first is the test's own conclusion, and notice how little it claims: the claimed distribution does not fit, at this level, for this population. It does **not** say that every class is off its share. ${ctx.categories.map((c, i) => (i === driver ? null : `${c} contributes ${fmt(gof.contributions[i], 2)}`)).filter(Boolean).join(', ')} — most of the table is close to what the claim expected, and rejecting the distribution says nothing against any of those classes individually.\n\nThe second sentence is a follow-up reading, not part of the test. ${driverName} carries ${fmt(gof.contributions[driver], 2)} of ${fmt(gof.statistic, 2)}, which is ${fmtPct(share, 0)} of the statistic, with ${fmtInt(observed[driver])} observed against ${fmt(gof.expected[driver], 2)} expected. It has no P-value of its own and must not be given one.`,
      misconception: `Concluding that every class differs from its claimed share. A chi-square rejection is a statement about the distribution as a whole; the contributions are what locate the departure, and here ${fmtPct(share, 0)} of the statistic sits in one class.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which class contributes most
// ---------------------------------------------------------------------------------------------

export const largestContributor = defineGenerator({
  id: 'act-8/largest-contributor',
  label: 'Which class carries the statistic',
  ap_topics: ['8.3'],
  skills: ['2', '4'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng, {
      // A gentler push, so the class carrying the statistic is not also the tallest bar in the file.
      strength: [1.35, 2.1],
      pRange: [0, 0.05],
      leaderRatio: 1.5,
      accept: (draw) => {
        if (!namedDriver(draw)) return false
        const gof = chiSquareGOF({ observed: draw.observed, probs: draw.ctx.probs, categories: draw.ctx.categories })
        let tallest = 0
        for (let i = 1; i < draw.observed.length; i++) if (draw.observed[i] > draw.observed[tallest]) tallest = i
        // The trap only works when the tallest bar is not the class carrying the statistic.
        return tallest !== gof.largestContributor
      },
    })
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
    const driver = gof.largestContributor
    let tallest = 0
    for (let i = 1; i < observed.length; i++) if (observed[i] > observed[tallest]) tallest = i
    let smallestE = 0
    for (let i = 1; i < gof.expected.length; i++) if (gof.expected[i] < gof.expected[smallestE]) smallestE = i

    const cands: Candidate[] = [
      {
        text: `**${ctx.categories[driver]}**, at ${fmt(gof.contributions[driver], 2)} of the ${fmt(gof.statistic, 2)} total: ${fmtInt(observed[driver])} observed against ${fmt(gof.expected[driver], 2)} expected.`,
        correct: true,
        why: null,
      },
      {
        text: `**${ctx.categories[tallest]}**, because it has the most ${ctx.units} in the file at ${fmtInt(observed[tallest])}.`,
        correct: false,
        why: `A contribution is $(O-E)^2/E$, a gap against an expectation, and it has nothing to do with the height of the bar. ${ctx.categories[tallest]} is the class the claim expected most of (${fmt(gof.expected[tallest], 2)}) and it arrived at ${fmtInt(observed[tallest])}, so it contributes ${fmt(gof.contributions[tallest], 2)} against ${ctx.categories[driver]}'s ${fmt(gof.contributions[driver], 2)}.`,
      },
      {
        text: `**${ctx.categories[smallestE]}**, because the smallest expected count is the largest denominator risk and dominates the statistic.`,
        correct: false,
        why: `A small $E$ amplifies whatever gap sits on top of it, so it *can* dominate — but only if there is a gap. ${ctx.categories[smallestE]} expects ${fmt(gof.expected[smallestE], 2)} and observed ${fmtInt(observed[smallestE])}, a gap of ${fmt(Math.abs(observed[smallestE] - gof.expected[smallestE]), 2)}, and it contributes ${fmt(gof.contributions[smallestE], 2)}. Read the column rather than predicting it from the denominators.`,
      },
      {
        text: `No class contributes most in any meaningful sense. $\\chi^2 = ${fmt(gof.statistic, 2)}$ is a property of the whole table, and splitting it between the classes is not a legitimate reading.`,
        correct: false,
        why: `The statistic is a sum of ${fmtInt(ctx.categories.length)} non-negative terms, one per class, so it splits between them by construction: ${ctx.categories.map((c, i) => `${c} ${fmt(gof.contributions[i], 2)}`).join(', ')}. Naming the largest is a legitimate follow-up. What is *not* legitimate is giving that class a P-value of its own.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office}'s ${fmtInt(n)} ${ctx.units}, classified by ${ctx.variable} against ${ctx.claim}, reject that claim at 5%.\n\n${tableMd(['class', 'claimed share', 'O', 'E'], ctx.categories.map((c, i) => [c, fmtPct(ctx.probs[i], 0), observed[i], fmt(gof.expected[i], 2)]))}\n\n**Which class carries the statistic, and why?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Work the contribution column rather than looking at the table. One number per class, and the comparison is between those numbers and nothing else.',
        `$(O-E)^2/E$ for each class: the gap, squared, over what the claim expected. ${ctx.categories[tallest]} has the tallest bar and ${ctx.categories[driver]} has the widest gap relative to its expectation.`,
      ],
      solution: `${tableMd(['class', 'O', 'E', 'O − E', '(O − E)²/E', 'share of χ²'], ctx.categories.map((c, i) => [c, observed[i], fmt(gof.expected[i], 2), fmt(observed[i] - gof.expected[i], 2), fmt(gof.contributions[i], 2), fmtPct(gof.contributions[i] / gof.statistic, 0)]))}\n\n**${options[correct]}**\n\nThe tallest bar is ${ctx.categories[tallest]} at ${fmtInt(observed[tallest])} ${ctx.units}, and it is close to the ${fmt(gof.expected[tallest], 2)} the claim expected, so it contributes ${fmt(gof.contributions[tallest], 2)}. Height is about how common a class is. A contribution is about how far the class landed from where the claim put it, measured in units of what the claim put there.\n\nThe follow-up carries a limit worth writing down beside it. ${ctx.categories[driver]} has no P-value: the ${fmtPct(0.05, 0)} was spent on the whole table at ${fmtInt(gof.df as number)} degrees of freedom, and picking the biggest of ${fmtInt(ctx.categories.length)} terms after the fact and testing it again is a different procedure with a different error rate.`,
      misconception: 'Reading the tallest observed bar as the largest contributor. Contribution is a gap against an expectation, divided by that expectation.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — the df trap: one statistic, two df
// ---------------------------------------------------------------------------------------------

export const chiSquareDfTrap = defineGenerator({
  id: 'act-8/chi-square-df-trap',
  label: 'One statistic, two degrees of freedom',
  ap_topics: ['8.3'],
  skills: ['2', '4'],
  generate(rng) {
    const ctxA = pickContext(rng, GOF_CONTEXTS)
    const ctxB = pickContext(
      rng,
      GOF_CONTEXTS.filter((c) => c.office !== ctxA.office),
    )
    const dfSmall = rng.int(2, 4)
    const dfBig = dfSmall + rng.int(8, 14)

    // A statistic that rejects on the small df and does not on the large one.
    const stat = retry(
      rng,
      (r) => Math.round(r.uniform(chi2Star(0.02, dfSmall), chi2Star(0.3, dfBig)) * 100) / 100,
      (v) => chi2.sf(v, dfSmall) < 0.03 && chi2.sf(v, dfBig) > 0.12 && !reservedStat(v),
    )
    const pSmall = chi2.sf(stat, dfSmall)
    const pBig = chi2.sf(stat, dfBig)

    const cands: Candidate[] = [
      {
        text: `${ctxA.office} rejects and ${ctxB.office} does not. The same ${fmt(stat, 2)} gives $P = ${fmtP(pSmall)}$ on ${fmtInt(dfSmall)} df and $P = ${fmtP(pBig)}$ on ${fmtInt(dfBig)} df, because a statistic built from more classes has more room to accumulate.`,
        correct: true,
        why: null,
      },
      {
        text: `Both reject. $\\chi^2 = ${fmt(stat, 2)}$ is large in absolute terms, and a large chi-square is evidence against the claimed distribution wherever it appears.`,
        correct: false,
        why: `A chi-square has no absolute size. It is a sum of one term per class, so its mean under H₀ is its df: ${fmtInt(dfSmall)} in the first file, ${fmtInt(dfBig)} in the second. ${fmt(stat, 2)} is ${fmt(stat / dfSmall, 1)} times what the first expects by chance alone and ${fmt(stat / dfBig, 1)} times what the second does.`,
      },
      {
        text: `Neither rejects. The two offices measured different things, so their statistics are not comparable and no decision can be drawn from either.`,
        correct: false,
        why: `Each test stands on its own and each one has a decision: $P = ${fmtP(pSmall)}$ against $\\alpha = 0.05$ in the first and $P = ${fmtP(pBig)}$ in the second. The point of the pair is that the same number means different things, not that neither means anything.`,
      },
      {
        text: `${ctxB.office} rejects and ${ctxA.office} does not, because ${fmtInt(dfBig)} degrees of freedom is a larger sample and therefore stronger evidence.`,
        correct: false,
        why: `Degrees of freedom count classes, not observations: $df = k - 1$, and $n$ is nowhere in it. More classes spread the same total departure over more terms and raise the bar the statistic has to clear — the 5% critical value climbs from ${fmt(chi2Star(0.05, dfSmall), 2)} on ${fmtInt(dfSmall)} df to ${fmt(chi2Star(0.05, dfBig), 2)} on ${fmtInt(dfBig)}.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `Two offices file goodness-of-fit tests in the same week, and both report the same statistic.\n\n${tableMd(['office', 'classes', 'df', 'χ²'], [[ctxA.office, fmtInt(dfSmall + 1), fmtInt(dfSmall), fmt(stat, 2)], [ctxB.office, fmtInt(dfBig + 1), fmtInt(dfBig), fmt(stat, 2)]])}\n\nAt $\\alpha = 0.05$, **which of them rejects its claimed distribution?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A chi-square statistic is read against a curve, and there is a different curve for every number of degrees of freedom. Find the two critical values before you compare anything.',
        `At 5%, the critical value is ${fmt(chi2Star(0.05, dfSmall), 2)} on ${fmtInt(dfSmall)} df and ${fmt(chi2Star(0.05, dfBig), 2)} on ${fmtInt(dfBig)} df. Put ${fmt(stat, 2)} against each.`,
      ],
      solution: `${tableMd(['office', 'df', 'χ²', '5% critical value', 'P', 'decision'], [[ctxA.office, fmtInt(dfSmall), fmt(stat, 2), fmt(chi2Star(0.05, dfSmall), 2), fmtP(pSmall), 'reject H₀'], [ctxB.office, fmtInt(dfBig), fmt(stat, 2), fmt(chi2Star(0.05, dfBig), 2), fmtP(pBig), 'fail to reject H₀']])}\n\n**${options[correct]}**\n\nUnder H₀ a chi-square statistic has mean equal to its df, because every one of the $k$ terms contributes about 1 on average when the claim is true. A table of ${fmtInt(dfBig + 1)} classes is therefore *expected* to produce a statistic near ${fmtInt(dfBig)} with nothing whatever wrong with it, while a table of ${fmtInt(dfSmall + 1)} classes producing ${fmt(stat, 2)} is well outside what chance supplies.\n\nSo a chi-square statistic quoted without its degrees of freedom is not a partial report. It is unreadable, and a report that gives one without the other should be sent back.`,
      misconception: `Treating a large chi-square as evidence on its own. The same ${fmt(stat, 2)} is decisive on ${fmtInt(dfSmall)} df and unremarkable on ${fmtInt(dfBig)}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — one tail
// ---------------------------------------------------------------------------------------------

export const chiSquareOneTail = defineGenerator({
  id: 'act-8/chi-square-one-tail',
  label: 'Why the chi-square P-value is not doubled',
  ap_topics: ['8.3'],
  skills: ['4'],
  generate(rng) {
    const { ctx, n, observed } = drawGofTable(rng, MODERATE)
    const gof = chiSquareGOF({ observed, probs: ctx.probs, categories: ctx.categories })
    const df = gof.df as number
    const p = gof.pValue as number
    const lower = chi2.cdf(gof.statistic, df)

    const cands: Candidate[] = [
      {
        text: `$P = ${fmtP(p)}$, the upper-tail area alone. Every term of the statistic is a squared gap, so a class that came in low and a class that came in high both make $\\chi^2$ larger; both directions of departure already sit in the same tail and there is no second one to add.`,
        correct: true,
        why: null,
      },
      {
        text: `$P = ${fmtP(Math.min(1, 2 * p))}$, twice the upper-tail area, because the alternative says the distribution *differs* from the claim and a two-sided alternative takes both tails.`,
        correct: false,
        why: `"Differs" is about the distribution, not about the sign of a statistic. For $z$ and $t$ the statistic keeps the direction of the departure in its sign, so a two-sided alternative needs both ends. Squaring the gaps throws that sign away before the sum, which is exactly what puts every kind of departure in the upper tail.`,
      },
      {
        text: `$P = ${fmtP(lower)}$, the area **below** ${fmt(gof.statistic, 2)}, because that is the probability of a fit at least this good.`,
        correct: false,
        why: `A P-value is always the probability of evidence at least this **extreme against** H₀, and a large $\\chi^2$ is what counts as extreme here. The lower tail answers the opposite question: it is large (${fmtP(lower)}) precisely when the statistic is large, which would make the worst-fitting tables look the most convincing.`,
      },
      {
        text: `Neither tail applies. With ${fmtInt(df)} degrees of freedom the chi-square curve is skewed, so the P-value has to be read off a two-sided critical-value table instead of an area.`,
        correct: false,
        why: `A skewed curve is still a curve, and the P-value is still the area under it beyond the observed statistic: ${fmtP(p)} on ${fmtInt(df)} df. The skew is why the critical value ${fmt(chi2Star(0.05, df), 2)} is not symmetric about anything, and it changes nothing about how the area is read.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office}'s file of **${fmtInt(n)} ${ctx.units}** gives $\\chi^2 = ${fmt(gof.statistic, 2)}$ on ${fmtInt(df)} degrees of freedom against ${ctx.claim}. The alternative hypothesis is that the ${ctx.variable} of ${ctx.population} does **not** follow that claim, which is a two-sided-sounding claim about a distribution.\n\n**What is the P-value, and how many tails does it take?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask what a chi-square statistic would look like if the claimed distribution fitted perfectly, and what it would look like if the file were wildly unlike the claim. Then ask which of those is the small number.',
        `Write one term out: $(O-E)^2/E$. Change the sign of the gap and see whether the term changes.`,
      ],
      solution: `$$P = P(\\chi^2_{${fmtInt(df)}} \\ge ${fmt(gof.statistic, 2)}) = \\mathbf{${fmtP(p)}}$$\n\n**${options[correct]}**\n\nA perfect fit gives $\\chi^2 = 0$. Any departure at all, in any class, in either direction, moves the statistic up and never down, so "further from the claim than this file" means "larger than ${fmt(gof.statistic, 2)}" with no exceptions. One tail covers the whole alternative.\n\nThat is why the \`χ²GOF-Test\` screen has no tail selector, and why doubling the number it returns is not a conservative choice but a wrong one. It would report ${fmtP(Math.min(1, 2 * p))} here${2 * p < 0.05 ? ', which happens to land on the same decision and will not always' : ''}.\n\nThe lower tail is not useless, incidentally. A $\\chi^2$ far *below* its df says the observed counts are suspiciously close to the claim, which is how audit offices find files that were written rather than collected. It is a different question and it is never the P-value of this test.`,
      misconception: 'Doubling the tail because the alternative is "differs". The squaring inside the statistic has already accounted for both directions, so a chi-square test is one-tailed no matter how the alternative is phrased.',
    }
  },
})
