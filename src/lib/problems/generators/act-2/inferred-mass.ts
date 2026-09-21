/**
 * act-2-02 · Inferred Mass — drills. AP 2.4–2.5: describing a scatterplot (direction, form, strength,
 * unusual features); the correlation coefficient and its properties (unitless, symmetric, linear only,
 * not resistant); correlation is not causation.
 *
 *   act-2/describe-scatter   display + interpretation   describe the relationship in context, citing r
 *   act-2/r-properties       choice                     what happens to r under units, swaps, an outlier, r = 0
 *   act-2/r-after-units      numeric                    r after a positive linear rescaling
 *   act-2/causation-trap     choice                     what a strong r does and does not license
 *
 * Every r comes from `correlation` in @/lib/stats; the points are drawn with `drawScatter`.
 */
import { defineGenerator, drawScatter, numericAnswer, pickContext, retry, type ScatterDraw } from '@/lib/problems/generate'
import { correlationDescription } from '@/lib/problems/rubrics'
import type { Rng } from '@/lib/rng'
import { correlation } from '@/lib/stats'
import { fmt, fmtInt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// In-world pairings (one of them negative) — the Lane, the file, the ship
// ---------------------------------------------------------------------------------------------

interface Pairing {
  /** Framing sentence; `{n}` is the drawn sample size. */
  frame: string
  /** Rubric variable names (no units — the axis labels carry those). */
  xVar: string
  yVar: string
  xLabel: string
  yLabel: string
  xRange: [number, number]
  slope: number
  intercept: number
  noise: number
  round: number
  /** A positive linear rescaling of y: y′ = a·y + b. */
  rescale: { how: string; units: string; a: number; b: number }
}

const PAIRINGS: Pairing[] = [
  {
    frame: 'A shakedown batch of {n} Bureau certifications from the Saturn feeder run, each one joined to the relay net’s Mark 2 acceleration.',
    xVar: 'declared mass',
    yVar: 'inferred mass',
    xLabel: 'declared mass (t)',
    yLabel: 'inferred mass (t)',
    xRange: [14000, 27000],
    slope: 1,
    intercept: 0,
    noise: 1400,
    round: 0,
    rescale: { how: 'reads the vertical axis in kilotonnes instead of tonnes (divide every value by 1,000)', units: 'kt', a: 0.001, b: 0 },
  },
  {
    frame: 'The Lane Authority’s ledger extract: {n} transits, Lane length at departure against time to Mark 9.',
    xVar: 'Lane length',
    yVar: 'time to Mark 9',
    xLabel: 'Lane length at departure (AU)',
    yLabel: 'time to Mark 9 (days)',
    xRange: [2.4, 8.0],
    slope: 12,
    intercept: 33,
    noise: 8,
    round: 1,
    rescale: { how: 'converts the vertical axis from days to hours (multiply every value by 24)', units: 'h', a: 24, b: 0 },
  },
  {
    frame: 'The Bureau’s own quality sheet: {n} departures, declared mass against the fuel actually loaded.',
    xVar: 'declared mass',
    yVar: 'fuel loaded',
    xLabel: 'declared mass (t)',
    yLabel: 'fuel loaded (t)',
    xRange: [14000, 27000],
    slope: 0.21,
    intercept: 0,
    noise: 600,
    round: 1,
    rescale: { how: 'reads the fuel column in kilotonnes instead of tonnes (divide every value by 1,000)', units: 'kt', a: 0.001, b: 0 },
  },
  {
    frame: 'An Authority audit of {n} transits that ran off the mandated profile: acceleration at Mark 2 against time to Mark 9.',
    xVar: 'acceleration at Mark 2',
    yVar: 'time to Mark 9',
    xLabel: 'acceleration at Mark 2 (mgee)',
    yLabel: 'time to Mark 9 (days)',
    xRange: [2.4, 3.6],
    slope: -22,
    intercept: 138,
    noise: 3.5,
    round: 2,
    rescale: { how: 'converts the vertical axis from days to hours (multiply every value by 24)', units: 'h', a: 24, b: 0 },
  },
  {
    frame: 'Sandoval’s cellar log over {n} Quiet-profile hours: sink temperature against the quiet hours still in hand.',
    xVar: 'sink temperature',
    yVar: 'remaining quiet hours',
    xLabel: 'sink temperature (K)',
    yLabel: 'remaining quiet hours (h)',
    xRange: [280, 380],
    slope: -0.09,
    intercept: 40,
    noise: 1.4,
    round: 1,
    rescale: { how: 'reads the vertical axis in minutes instead of hours (multiply every value by 60)', units: 'min', a: 60, b: 0 },
  },
  {
    frame: 'A Directorate reliability table: {n} hulls, age at departure against transponder dropouts logged in the year.',
    xVar: 'hull age',
    yVar: 'transponder dropouts',
    xLabel: 'hull age at departure (years)',
    yLabel: 'transponder dropouts logged in the year',
    xRange: [2, 24],
    slope: 0.22,
    intercept: 0.4,
    noise: 1.1,
    round: 1,
    rescale: { how: 'restates the dropout count per decade of service rather than per year (multiply every value by 10)', units: 'per decade', a: 10, b: 0 },
  },
]

/** A drawn cloud whose |r| sits in the band the lesson needs (0.50–0.98). */
function drawPairing(r: Rng, p: Pairing, n: number): ScatterDraw {
  return drawScatter(r, { n, slope: p.slope, intercept: p.intercept, noise: p.noise, xRange: p.xRange, round: p.round, rRange: [0.5, 0.98] })
}

// ---------------------------------------------------------------------------------------------
// 1. Display + interpretation — describe the relationship in context
// ---------------------------------------------------------------------------------------------

export const describeScatter = defineGenerator({
  id: 'act-2/describe-scatter',
  label: 'Describe the scatterplot',
  ap_topics: ['2.4', '2.5'],
  skills: ['4'],
  generate(rng) {
    const p = pickContext(rng, PAIRINGS)
    const n = rng.int(20, 40)
    const draw = retry(
      rng,
      (r) => drawPairing(r, p, n),
      (d) => {
        const a = Math.abs(correlation(d.xs, d.ys))
        return a >= 0.5 && a <= 0.98
      },
    )
    const r = correlation(draw.xs, draw.ys)
    const rubric = correlationDescription({ r, xVar: p.xVar, yVar: p.yVar })
    return {
      prompt: `${p.frame.replace('{n}', fmtInt(n))}\n\nThe display plots ${p.yLabel} against ${p.xLabel}. Its correlation is $r = ${fmt(r, 2)}$.\n\nDescribe the relationship between ${p.xVar} and ${p.yVar} in context: direction, form and strength, in one sentence, citing $r$. Say only what a set of recorded transits can support.`,
      answer: { type: 'display', display: { kind: 'scatter', points: draw.points, xLabel: p.xLabel, yLabel: p.yLabel }, question: rubric },
      hints: [
        'Four things describe a scatterplot: direction (does y rise or fall with x?), form (straight or curved?), strength (how tightly do the points hug the pattern?) and unusual features. Say them in the variables’ own words.',
        `The sign of $r$ gives the direction; $|r| = ${fmt(Math.abs(r), 2)}$ gives the strength band; $r$ measures LINEAR association, so name the form as well.`,
        'Write one sentence with direction, strength, the word *linear*, both variables and the value of $r$ in it — and no claim about what produces the pattern.',
      ],
      solution: `${rubric.exemplar}\n\n$r$ is a description of these ${fmtInt(n)} recorded points, nothing more. It carries no units, it would be the same with the axes exchanged, and it says nothing about what produced the pattern.`,
      misconception: 'Describing strength without naming the form. A large |r| means the points cluster about a STRAIGHT line; it is not a general measure of "how related" two variables are.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — properties of r
// ---------------------------------------------------------------------------------------------

type Frame = { p: Pairing; n: number; r: number }

interface Stem {
  key: 'units' | 'swap' | 'outlier' | 'zero' | 'causation'
  question: (f: Frame) => string
  options: (f: Frame) => string[]
  correct: number
  feedback: (f: Frame) => (string | null)[]
}

const STEMS: Stem[] = [
  {
    key: 'units',
    question: ({ p, n }) =>
      `Ebele has ${fmtInt(n)} points on the display: ${p.yLabel} against ${p.xLabel}. Oyelaran ${p.rescale.how} and the plot is redrawn with the same individuals.\n\nWhat happens to $r$?`,
    options: () => [
      'Nothing. r is computed from the z-scores of the two variables, so it carries no units and a positive linear rescaling leaves it unchanged.',
      'r is rescaled by the same factor as the values.',
      'r changes sign, because the axis has been redefined.',
      'r cannot be reported until both variables are expressed in the same unit.',
    ],
    correct: 0,
    feedback: () => [
      null,
      'r is a pure number between −1 and 1. Rescaling a variable changes its mean and its SD by the same factor, so every z-score — and therefore r — is untouched.',
      'A positive multiplier cannot flip the direction of an association. Only multiplying by a negative number would reverse the sign of every z-score for that variable.',
      'r never requires common units. That is the point of standardising each variable before multiplying.',
    ],
  },
  {
    key: 'swap',
    question: ({ p, n }) => `The same ${fmtInt(n)} hulls are replotted with ${p.xVar} on the vertical axis and ${p.yVar} on the horizontal — the axes exchanged, nothing else.\n\nWhat happens to $r$?`,
    options: () => [
      'Nothing. r is symmetric: it treats the two variables identically, so exchanging the axes leaves it unchanged.',
      'r is replaced by its reciprocal, 1/r.',
      'r changes sign, because explanatory and response have swapped roles.',
      'r changes by the ratio of the two standard deviations, as the slope does.',
    ],
    correct: 0,
    feedback: () => [
      null,
      'Nothing in the formula inverts. r is a mean of products of z-scores, and the product z_x·z_y does not care which factor is written first.',
      'Exchanging the axes does not change which points are above or below their own means; every product of z-scores is the same.',
      'The least-squares SLOPE changes when the axes are exchanged — it is b = r·s_y/s_x. r itself does not.',
    ],
  },
  {
    key: 'outlier',
    question: ({ p, n }) =>
      `A clerk enters one hull’s ${p.yVar} with an extra digit. The other ${fmtInt(n - 1)} points are untouched; the mistyped one sits far off the pattern.\n\nWhat can happen to $r$?`,
    options: ({ n }) => [
      'It can move a long way. r is not resistant: a single point far from the pattern can raise it or collapse it.',
      `Nothing worth noticing. One point in ${fmtInt(n)} cannot move a summary of all of them.`,
      'It can only increase, because the mistyped point widens the range of the data.',
      'Nothing: r is built from ranks and medians, so a single extreme value has no leverage on it.',
    ],
    correct: 0,
    feedback: ({ n }) => [
      null,
      `r is a mean of products of z-scores, and a mean is not resistant. With ${fmtInt(n)} points, one gross error is easily large enough to dominate the sum.`,
      'A point far off the pattern usually drags r toward zero; a point far out along the pattern inflates it. Which one happens depends on where it sits, so "only increase" is wrong.',
      'r is built from means and standard deviations, not from ranks. Every one of those is sensitive to an extreme value.',
    ],
  },
  {
    key: 'zero',
    question: ({ p, n }) => `Over one batch of ${fmtInt(n)} hulls, $r$ between ${p.xVar} and ${p.yVar} comes out at 0.00.\n\nWhat does that establish?`,
    options: ({ p }) => [
      `There is no LINEAR association between ${p.xVar} and ${p.yVar} in this batch. A strong curved relationship would be entirely consistent with r = 0.`,
      `${p.xVar} and ${p.yVar} have no relationship of any kind in this batch.`,
      'The scatterplot must be a shapeless cloud.',
      'One of the two variables must be constant across the batch.',
    ],
    correct: 0,
    feedback: ({ p }) => [
      null,
      'r sees straight lines only. A perfect U-shape has r near zero and a relationship you could set a watch by.',
      'A symmetric arch, a V, or a ring all give r ≈ 0 and none of them is shapeless. Look at the plot before you believe r.',
      `If a variable were constant its SD would be zero and r would be undefined, not 0.00. Both ${p.xVar} and ${p.yVar} vary here.`,
    ],
  },
  {
    key: 'causation',
    question: ({ p, n, r }) => `Across ${fmtInt(n)} recorded transits, $r$ between ${p.xVar} and ${p.yVar} is ${fmt(r, 2)}.\n\nWhat does that establish?`,
    options: ({ p, r }) => [
      `A ${Math.abs(r) >= 0.8 ? 'strong' : 'moderate'} ${r > 0 ? 'positive' : 'negative'} linear association between ${p.xVar} and ${p.yVar} in these transits — and nothing about what produces it.`,
      `That ${p.xVar} causes ${p.yVar} to ${r > 0 ? 'rise' : 'fall'}.`,
      'That the underlying relationship is a straight line rather than a curve, since r is large.',
      `That changing ${p.xVar} would produce a proportional change in ${p.yVar}.`,
    ],
    correct: 0,
    feedback: ({ p }) => [
      null,
      'These transits were recorded, not assigned. An association between two logged variables never establishes which one acts on the other, or whether a third variable moves both.',
      'A large |r| is consistent with a curve. Curved data can produce r above 0.9; only the plot and the residuals can rule a curve out.',
      `That is a causal claim in the language of prediction. The line predicts ${p.yVar} from ${p.xVar} in these records; it does not say what would happen if anyone intervened.`,
    ],
  },
]

export const rProperties = defineGenerator({
  id: 'act-2/r-properties',
  label: 'Properties of r',
  ap_topics: ['2.5'],
  skills: ['1'],
  generate(rng) {
    const p = pickContext(rng, PAIRINGS)
    const stem = pickContext(rng, STEMS)
    const n = rng.int(18, 44)
    const draw = retry(
      rng,
      (r) => drawPairing(r, p, n),
      (d) => {
        const a = Math.abs(correlation(d.xs, d.ys))
        return a >= 0.55 && a <= 0.98
      },
    )
    const f: Frame = { p, n, r: correlation(draw.xs, draw.ys) }
    const options = stem.options(f)
    const feedback = stem.feedback(f)
    const solutionTail: Record<Stem['key'], string> = {
      units: 'A conversion $y\' = a y + b$ with $a > 0$ multiplies both the mean and the SD of $y$ by $a$, so every $z_y$ is unchanged — and $r$ is the mean of the products $z_x z_y$.',
      swap: 'In $r = \\frac{1}{n-1}\\sum z_x z_y$ the two variables enter the same way. The regression slope $b = r\\,s_y/s_x$ is the thing that changes when you exchange the axes.',
      outlier: 'Every ingredient of $r$ — two means, two standard deviations, a sum of products — is sensitive to a single extreme value. Report $r$ with the plot, and say what one point does to it.',
      zero: '$r$ measures LINEAR association only. Read the plot first; the number second.',
      causation: 'Observational records support description. A cause needs a comparison somebody designed.',
    }
    return {
      prompt: stem.question(f),
      answer: { type: 'choice', options, correct: stem.correct, feedback },
      hints: [
        'Ask what $r$ is made of: the z-scores of the two variables, multiplied and averaged. Anything that leaves the z-scores alone leaves $r$ alone.',
        stem.key === 'outlier'
          ? 'A mean is not resistant, and $r$ is a mean.'
          : stem.key === 'zero'
            ? 'Write down a relationship that is strong and not straight, and ask what $r$ would say about it.'
            : stem.key === 'causation'
              ? 'Ask what the records would have to look like — who was assigned what — before a cause could be read off them.'
              : 'Work out what the rescaling or the swap does to each z-score, one at a time.',
      ],
      solution: `**${options[stem.correct]}**\n\n${solutionTail[stem.key]}`,
      misconception:
        stem.key === 'units'
          ? 'Treating r as though it carried the units of the variables. It does not — which is why r from one file can be compared with r from another.'
          : stem.key === 'swap'
            ? 'Confusing r with the slope. The slope has units and a direction of prediction; r has neither.'
            : stem.key === 'outlier'
              ? 'Trusting r without the plot. One point can make a weak association look strong, or the reverse.'
              : stem.key === 'zero'
                ? 'Reading r = 0 as "no relationship". It means no LINEAR relationship.'
                : 'Reading a strong r as a mechanism. Association is a description of the records; causation is a claim about what would happen if someone intervened.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — r after a positive linear rescaling
// ---------------------------------------------------------------------------------------------

export const rAfterUnits = defineGenerator({
  id: 'act-2/r-after-units',
  label: 'r after a change of units',
  ap_topics: ['2.5'],
  skills: ['2'],
  generate(rng) {
    const p = pickContext(rng, PAIRINGS)
    const n = rng.int(22, 40)
    const draw = retry(
      rng,
      (r) => drawPairing(r, p, n),
      (d) => {
        const a = Math.abs(correlation(d.xs, d.ys))
        return a >= 0.5 && a <= 0.97
      },
    )
    const r0 = correlation(draw.xs, draw.ys)
    const transformed = draw.ys.map((y) => p.rescale.a * y + p.rescale.b)
    const r1 = correlation(draw.xs, transformed)
    return {
      prompt: `${p.frame.replace('{n}', fmtInt(n))}\n\nOver these ${fmtInt(n)} records the correlation between ${p.xVar} (${p.xLabel.replace(/^.*\(/, '').replace(')', '')}) and ${p.yVar} is $r = ${fmt(r0, 3)}$.\n\nOyelaran ${p.rescale.how}. Nothing else changes — the same individuals, the same ${p.xVar}.\n\nReport the correlation between ${p.xVar} and ${p.yVar} **measured in ${p.rescale.units}**, to three decimal places.`,
      answer: numericAnswer(r1, 'other', { digits: 3 }),
      hints: [
        '$r$ is a mean of products of z-scores. Ask what the rescaling does to the z-score of a single observation.',
        `The conversion is $y\' = ${fmt(p.rescale.a, p.rescale.a < 1 ? 3 : 0)}\\,y${p.rescale.b ? ` + ${fmt(p.rescale.b, 0)}` : ''}$, a positive linear change. It multiplies $\\bar{y}$ and $s_y$ by the same positive factor, so $\\frac{y' - \\bar{y}'}{s_y'}$ is the same number it was before.`,
      ],
      solution: `Every z-score survives a positive linear rescaling: with $y' = a y + b$ and $a > 0$, $\\bar{y}' = a\\bar{y} + b$ and $s_y' = a\\,s_y$, so\n\n$$z_{y'} = \\frac{(ay + b) - (a\\bar{y} + b)}{a\\,s_y} = \\frac{y - \\bar{y}}{s_y} = z_y$$\n\nand $r = \\frac{1}{n-1}\\sum z_x z_y$ cannot move. Computed both ways on these ${fmtInt(n)} records: $r_{\\text{original}} = ${fmt(r0, 3)}$ and $r_{\\text{rescaled}} = ${fmt(r1, 3)}$.\n\nThe correlation is **${fmt(r1, 3)}** — the same number, because $r$ has no units.`,
      misconception: 'Expecting r to follow the units. It cannot: r is dimensionless by construction, which is exactly why two studies in different units can be compared on it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — what a strong r does and does not license
// ---------------------------------------------------------------------------------------------

interface CausationCase {
  frame: string
  xVar: string
  yVar: string
  claim: string
  lurking: string
}

const CAUSATION_CASES: CausationCase[] = [
  {
    frame: 'Across {n} departures in the Bureau file, the correlation between plume power at Mark 2 and fuel loaded is r = {r}.',
    xVar: 'plume power at Mark 2',
    yVar: 'fuel loaded',
    claim: 'Loading more fuel drives a hotter plume.',
    lurking: 'declared mass — a bigger hull both runs a bigger plume and is required to load more fuel',
  },
  {
    frame: 'Over {n} transits of the Saturn feeder run, the correlation between hull age and transponder dropouts is r = {r}.',
    xVar: 'hull age',
    yVar: 'transponder dropouts',
    claim: 'Age degrades the transponder.',
    lurking: 'the refit cycle — older hulls are also the hulls the yards service least often',
  },
  {
    frame: 'Across {n} Authority records, the correlation between the number of relay marks a hull reports late and the cargo value it declares is r = {r}.',
    xVar: 'late marks',
    yVar: 'declared cargo value',
    claim: 'Valuable cargo makes a hull run late.',
    lurking: 'Lane length — the long runs carry the richer cargoes and accumulate more marks to be late at',
  },
  {
    frame: 'Over {n} logged watches, the correlation between sink temperature and the number of contacts the Eyes hold is r = {r}.',
    xVar: 'sink temperature',
    yVar: 'contacts held',
    claim: 'A warm cellar improves the telescopes.',
    lurking: 'time under thrust — the ship runs hot and sweeps hardest on the same watches',
  },
]

export const causationTrap = defineGenerator({
  id: 'act-2/causation-trap',
  label: 'Correlation is not causation',
  ap_topics: ['2.5'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CAUSATION_CASES)
    const p = pickContext(rng, PAIRINGS)
    const n = rng.int(40, 220)
    const nDraw = rng.int(24, 40)
    const draw = retry(
      rng,
      (r) => drawPairing(r, p, nDraw),
      (d) => {
        const a = Math.abs(correlation(d.xs, d.ys))
        return a >= 0.72 && a <= 0.95
      },
    )
    const r = Math.abs(correlation(draw.xs, draw.ys))
    const cands = [
      {
        text: `The two rise together in these records, and both of them rise with ${c.lurking}. The association is real; the mechanism in the claim is not established by it.`,
        correct: true,
        why: null as string | null,
      },
      { text: `${c.claim} The correlation is strong enough to carry it.`, correct: false, why: 'A correlation says the two variables move together in the records. It cannot say which one moves the other, or whether a third variable moves both.' },
      { text: `The correlation proves the claim, because r is close to 1.`, correct: false, why: 'Size is not the issue. An r of 0.99 from observational records establishes exactly what an r of 0.60 does: an association, described.' },
      { text: 'Nothing can be said at all. Without an experiment a correlation is meaningless.', correct: false, why: 'Too far the other way. The association is a real feature of these records and worth reporting — it is the causal reading that the design cannot support.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((o) => o.correct)
    return {
      prompt: `${c.frame.replace('{n}', fmtInt(n)).replace('{r}', fmt(r, 2))}\n\nEbele writes in the margin: *${c.claim}*\n\nWhich reading of the correlation is defensible?`,
      answer: { type: 'choice', options: shuffled.map((o) => o.text), correct, feedback: shuffled.map((o) => o.why) },
      hints: [
        'Ask how the records were produced. Nobody assigned any hull its ' + c.xVar + '; the file recorded what happened.',
        `Look for a third variable that would move both ${c.xVar} and ${c.yVar} without either acting on the other.`,
      ],
      solution: `**${cands[0].text}**\n\nThese are observational records: no one set ${c.xVar} and watched ${c.yVar} respond. A correlation of ${fmt(r, 2)} describes how the two move together in the file. Establishing a cause would take a comparison somebody designed — and until then, ${c.lurking.split(' — ')[0]} is the reading that fits the same data with no mechanism invented.`,
      misconception: 'Treating a large r as evidence of a mechanism. The size of r says how tightly the points hug a line; the DESIGN of the study says whether a cause can be read off it.',
    }
  },
})
