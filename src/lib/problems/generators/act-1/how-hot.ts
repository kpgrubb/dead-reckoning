/**
 * act-1-07 · How Hot Is Too Hot — drills. AP 1.10: the normal model. Standardising a value into a
 * z-score; the effect of a linear change of units aX + b on centre, spread and z; the empirical rule
 * as three readings of the curve; areas under a normal model in both directions (value → proportion,
 * proportion → value); percentile rank from a set of observations.
 *
 *   act-1/z-tail-area          numeric  z of a signature, or the tail proportion beyond it
 *   act-1/unit-conversion      numeric  the mean or the SD after y = aX + b
 *   act-1/inverse-normal       numeric  the cutoff with a stated proportion beyond (or below) it
 *   act-1/empirical-rule       numeric  the proportion beyond mean + k·SD, k in {1, 2, 3}
 *   act-1/percentile-of-contact numeric percent of a logged set below one observation
 *   act-1/z-interpretation     interp   what the z-score means, in context
 *
 * `act-1/z-tail-area` and `act-1/unit-conversion` are reused by the Act I checkpoint, so they stand
 * alone: the model is stated in full in the prompt and nothing refers to an instrument on the page.
 *
 * Every model is drawn; none of them reproduces DS-19's own fleet model (mean 99.8, SD 2.89) or the
 * flagged contact's z and tail, which are act-1-07's mission beats.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, listNumbers, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { zScoreInterpretation } from './_rubrics'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { linearTransformSummary, normal, percentileRank, zScore } from '@/lib/stats'

// ---------------------------------------------------------------------------------------------
// In-world measurement contexts
// ---------------------------------------------------------------------------------------------

interface MeasureContext {
  /** "plume power as a percent of the class-table expectation". */
  variable: string
  units: string
  /** "the honest hulls of the Lane". */
  population: string
  /** One individual: "a contact", "an hour of the watch". */
  individual: string
  frame: string
  digits: number
  /** Model centre and spread ranges. */
  mu: [number, number]
  sd: [number, number]
}

const MEASURES: MeasureContext[] = [
  {
    variable: 'plume power as a percent of the class-table expectation',
    units: 'percent of expectation',
    population: 'honest hulls on the corridor',
    individual: 'a contact',
    frame: 'The Eyes reduce every plume to a percent of what the class table expects for the declared mass and the filed profile.',
    digits: 1,
    mu: [96, 104],
    sd: [1.8, 4.6],
  },
  {
    variable: 'heat-sink temperature at the end of a watch',
    units: 'K',
    population: 'watches flown on the standing profile',
    individual: 'a watch',
    frame: 'Sandoval logs the sink temperature at the end of every watch on the standing profile, and will not quote one without its plus or minus.',
    digits: 1,
    mu: [288, 312],
    sd: [2.5, 7],
  },
  {
    variable: 'navigational fix error',
    units: 'km',
    population: 'fixes taken on the Lane beacons',
    individual: 'a fix',
    frame: 'Every fix on a Lane beacon is compared afterwards with the reconstructed track, and the miss distance is logged.',
    digits: 1,
    mu: [40, 90],
    sd: [6, 18],
  },
  {
    variable: 'transit time on the corridor',
    units: 'days',
    population: 'freighters crossing the corridor',
    individual: 'a crossing',
    frame: 'The Lane Authority records a transit time for every crossing that arrives.',
    digits: 1,
    mu: [92, 106],
    sd: [3, 8],
  },
]

/** DS-19's own fleet model and the flagged contact's figures — never a generated drill's answer. */
function reservedModel(mu: number, sigma: number): boolean {
  return Math.abs(mu - 99.8) < 0.6 && Math.abs(sigma - 2.89) < 0.3
}
function reservedZ(z: number): boolean {
  return Math.abs(Math.abs(z) - 3.253) < 0.05
}

function drawModel(rng: Rng, ctx: MeasureContext): { mu: number; sigma: number } {
  return retry(
    rng,
    (r) => ({ mu: Number(r.uniform(ctx.mu[0], ctx.mu[1]).toFixed(1)), sigma: Number(r.uniform(ctx.sd[0], ctx.sd[1]).toFixed(2)) }),
    ({ mu, sigma }) => sigma > 0 && !reservedModel(mu, sigma),
  )
}

function modelLine(ctx: MeasureContext, mu: number, sigma: number): string {
  return `${ctx.frame}\n\nOver ${ctx.population}, ${ctx.variable} is modelled as normal with mean ${fmt(mu, ctx.digits)} ${ctx.units} and standard deviation ${fmt(sigma, 2)} ${ctx.units}.`
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — z of a signature, or the area beyond it
// ---------------------------------------------------------------------------------------------

export const zTailArea = defineGenerator({
  id: 'act-1/z-tail-area',
  label: 'z-score, or the tail beyond it',
  ap_topics: ['1.10'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, MEASURES)
    const { mu, sigma } = drawModel(rng, ctx)
    const wantZ = rng.bool()
    const above = rng.bool()

    if (wantZ) {
      // A signature anywhere from a little unusual to clearly out; never the module's own z.
      const z = retry(
        rng,
        (r) => Number((r.uniform(0.8, 3.0) * (above ? 1 : -1)).toFixed(3)),
        (v) => !reservedZ(v) && Math.abs(v) >= 0.8,
      )
      const x = Number((mu + z * sigma).toFixed(ctx.digits))
      const zx = zScore(x, mu, sigma)
      return {
        prompt: `${modelLine(ctx, mu, sigma)}\n\n${ctx.individual[0].toUpperCase()}${ctx.individual.slice(1)} is logged at **${fmt(x, ctx.digits)} ${ctx.units}**.\n\nWhat is its z-score against the model? Give it to **two decimal places**.`,
        answer: numericAnswer(zx, 'testStat'),
        hints: [
          'A z-score is a distance from the centre measured in standard deviations, and it keeps the sign of that distance.',
          `Distance from the mean: ${fmt(x, ctx.digits)} − ${fmt(mu, ctx.digits)} = ${fmt(x - mu, 2)} ${ctx.units}. One standard deviation is ${fmt(sigma, 2)} ${ctx.units}.`,
          `$(${fmt(x, ctx.digits)} - ${fmt(mu, ctx.digits)}) / ${fmt(sigma, 2)}$, to two decimals.`,
        ],
        solution: `$$z = \\frac{x - \\mu}{\\sigma} = \\frac{${fmt(x, ctx.digits)} - ${fmt(mu, ctx.digits)}}{${fmt(sigma, 2)}} = ${fmt(zx, 4)}$$\n\nThe z-score is **${fmt(zx, 2)}** — the value sits ${fmt(Math.abs(zx), 2)} standard deviations ${zx >= 0 ? 'above' : 'below'} the model's centre. The units cancel: a z-score carries none.`,
        misconception: 'Dividing by the mean instead of by the standard deviation, or dropping the sign. A z-score of −1.4 and one of 1.4 are on opposite sides of the model.',
      }
    }

    // Tail areas: keep z in [1.0, 2.55] so the proportion is never smaller than about 0.005.
    const z = Number(retry(rng, (r) => r.uniform(1.0, 2.55), (v) => normal.sf(v) >= 0.005).toFixed(3))
    const x = Number((above ? mu + z * sigma : mu - z * sigma).toFixed(ctx.digits))
    const p = above ? normal.sf(x, mu, sigma) : normal.cdf(x, mu, sigma)
    return {
      prompt: `${modelLine(ctx, mu, sigma)}\n\nUnder this model, what proportion of ${ctx.population} falls **${above ? 'at or above' : 'at or below'} ${fmt(x, ctx.digits)} ${ctx.units}**? Give a proportion to **four decimal places**.`,
      answer: numericAnswer(p, 'proportion', { digits: 4 }),
      hints: [
        'Standardise the cutoff first, then read the area on that side of it. A proportion is an area under the curve, never the height of it.',
        `z = (${fmt(x, ctx.digits)} − ${fmt(mu, ctx.digits)}) / ${fmt(sigma, 2)} = ${fmt(zScore(x, mu, sigma), 2)}. Now take the area ${above ? 'to the right of' : 'to the left of'} that z.`,
        `${above ? 'The upper tail is 1 minus the area below' : 'The lower tail is the cumulative area itself'} — four decimals.`,
      ],
      solution: `$$z = \\frac{${fmt(x, ctx.digits)} - ${fmt(mu, ctx.digits)}}{${fmt(sigma, 2)}} = ${fmt(zScore(x, mu, sigma), 3)}$$\n\nThe area ${above ? 'above' : 'below'} that cutoff is $P = ${fmt(p, 6)}$, so the proportion is **${fmt(p, 4)}** — about ${fmtPct(p, 2)} of ${ctx.population}, or roughly one in ${fmtInt(Math.round(1 / p))}.\n\nBecause the model is continuous, "at or ${above ? 'above' : 'below'}" and "${above ? 'above' : 'below'}" are the same area: a single point has width zero and therefore no probability.`,
      misconception: 'Reporting the area on the wrong side of the cutoff. Sketch the curve, shade the side the question asks for, and check that a tail beyond the centre comes out less than 0.5.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — a linear change of units
// ---------------------------------------------------------------------------------------------

interface ConversionContext {
  frame: (mu: number, sigma: number) => string
  fromUnits: string
  toUnits: string
  a: (r: Rng) => number
  b: (a: number) => number
  /** Description of the transformation for hints and solution. */
  rule: (a: number, b: number) => string
  mu: [number, number]
  sd: [number, number]
  digitsIn: number
  digitsOut: number
}

const CONVERSIONS: ConversionContext[] = [
  {
    frame: (mu, sigma) =>
      `A fleet of hulls declaring the same departure mass is modelled as normal on plume ratio, mean ${fmt(mu, 1)} percent of expectation and standard deviation ${fmt(sigma, 2)} percent.`,
    fromUnits: 'percent of expectation',
    toUnits: 't above the declaration',
    a: (r) => Math.round(r.uniform(12_000, 28_000) / 100 / 5) * 5,
    b: (a) => -100 * a,
    rule: (a, b) => `each percent of expectation is ${fmt(a, 0)} t on a declaration of ${fmtInt(-b)} t, so $y = ${fmt(a, 0)}x - ${fmtInt(-b)}$`,
    mu: [97, 103],
    sd: [1.8, 4.2],
    digitsIn: 2,
    digitsOut: 1,
  },
  {
    frame: (mu, sigma) => `Sink temperature at the end of a watch is modelled as normal, mean ${fmt(mu, 1)} K and standard deviation ${fmt(sigma, 2)} K.`,
    fromUnits: 'K',
    toUnits: '°C',
    a: () => 1,
    b: () => -273.15,
    rule: () => 'celsius is kelvin minus 273.15, so $y = x - 273.15$',
    mu: [288, 316],
    sd: [2.5, 7],
    digitsIn: 2,
    digitsOut: 2,
  },
  {
    frame: (mu, sigma) => `Fix error against the reconstructed track is modelled as normal, mean ${fmt(mu, 1)} km and standard deviation ${fmt(sigma, 2)} km.`,
    fromUnits: 'km',
    toUnits: 'Mm',
    a: () => 0.001,
    b: () => 0,
    rule: () => 'a megametre is a thousand kilometres, so $y = 0.001x$',
    mu: [40, 120],
    sd: [6, 22],
    digitsIn: 2,
    digitsOut: 4,
  },
]

export const unitConversion = defineGenerator({
  id: 'act-1/unit-conversion',
  label: 'Centre and spread after a change of units',
  ap_topics: ['1.10'],
  skills: ['2'],
  generate(rng) {
    const c = pickContext(rng, CONVERSIONS)
    const mu = Number(rng.uniform(c.mu[0], c.mu[1]).toFixed(1))
    const sigma = Number(rng.uniform(c.sd[0], c.sd[1]).toFixed(2))
    const a = c.a(rng)
    const b = c.b(a)
    const out = linearTransformSummary({ mean: mu, sd: sigma }, a, b)
    const wantMean = rng.bool()
    const value = wantMean ? (out.mean ?? 0) : (out.sd ?? 0)
    const what = wantMean ? 'mean' : 'standard deviation'
    const d = c.digitsOut
    return {
      prompt: `${c.frame(mu, sigma)}\n\nThe same model is to be re-expressed in **${c.toUnits}**: ${c.rule(a, b)}.\n\nWhat is the **${what}** of the model in ${c.toUnits}? Give it to ${d === 0 ? 'the nearest whole unit' : `**${d} decimal place${d === 1 ? '' : 's'}**`}.`,
      answer: numericAnswer(value, 'other', { digits: d, units: c.toUnits }),
      hints: [
        'Under $y = ax + b$ every measure of centre or position is transformed the same way the data are; every measure of spread is multiplied by $|a|$ and is untouched by $b$.',
        wantMean
          ? `The mean is a centre: multiply by ${fmt(a, a < 0.01 ? 4 : 0)} and then add ${fmt(b, 2)}.`
          : `The standard deviation is a spread: multiply by ${fmt(Math.abs(a), a < 0.01 ? 4 : 0)} and ignore the shift of ${fmt(b, 2)} entirely.`,
        wantMean ? `$${fmt(a, a < 0.01 ? 4 : 0)} \\times ${fmt(mu, 2)} + (${fmt(b, 2)})$` : `$${fmt(Math.abs(a), a < 0.01 ? 4 : 0)} \\times ${fmt(sigma, 2)}$`,
      ],
      solution: wantMean
        ? `$$\\mu_y = a\\mu_x + b = ${fmt(a, a < 0.01 ? 4 : 0)} \\times ${fmt(mu, 2)} + (${fmt(b, 2)}) = ${fmt(value, Math.max(d, 3))}$$\n\nThe mean in ${c.toUnits} is **${fmt(value, d)}**. A centre takes both the scaling and the shift.`
        : `$$\\sigma_y = |a|\\,\\sigma_x = ${fmt(Math.abs(a), a < 0.01 ? 4 : 0)} \\times ${fmt(sigma, 2)} = ${fmt(value, Math.max(d, 3))}$$\n\nThe standard deviation in ${c.toUnits} is **${fmt(value, d)}**. A spread is scaled and never shifted: adding a constant to every value moves the whole distribution without stretching it.${a === 1 ? ' Here the scale factor is 1, so the spread does not change at all — only the labels on the axis do.' : ''}\n\nEither way the shape is unchanged and every z-score survives the conversion intact.`,
      misconception: wantMean
        ? 'Forgetting the shift, or applying it before the scaling. The order is scale, then shift — which is what $a\\mu + b$ says.'
        : 'Adding the shift to the standard deviation. A spread is a distance between values, and a constant added to both ends cancels out of it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — the model run backwards
// ---------------------------------------------------------------------------------------------

export const inverseNormal = defineGenerator({
  id: 'act-1/inverse-normal',
  label: 'From a proportion back to a cutoff',
  ap_topics: ['1.10'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, MEASURES)
    const { mu, sigma } = drawModel(rng, ctx)
    const above = rng.bool()
    const p = Number(pickContext(rng, [0.01, 0.02, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.9, 0.95]).toFixed(3))
    // "above" reads the proportion as an upper tail; "below" as a cumulative proportion.
    const prop = above ? Math.min(p, 0.25) : p
    const cut = above ? normal.isf(prop, mu, sigma) : normal.quantile(prop, mu, sigma)
    const d = ctx.digits + 1
    return {
      prompt: `${modelLine(ctx, mu, sigma)}\n\nA threshold is to be set so that ${fmtPct(prop, 1)} of ${ctx.population} falls **${above ? 'above' : 'below'}** it.\n\nWhere does the threshold go? Give the value in ${ctx.units} to **${d} decimal place${d === 1 ? '' : 's'}**.`,
      answer: numericAnswer(cut, 'other', { digits: d, units: ctx.units }),
      hints: [
        'This is the model read backwards: the area is given and the cutoff is wanted. Find the z with that area on the correct side first, then convert it into the variable’s own units.',
        above
          ? `The z with ${fmt(prop, 3)} of the model above it is ${fmt(normal.isf(prop), 3)}.`
          : `The z with ${fmt(prop, 3)} of the model below it is ${fmt(normal.quantile(prop), 3)}.`,
        `$x = \\mu + z\\sigma = ${fmt(mu, ctx.digits)} + (${fmt(above ? normal.isf(prop) : normal.quantile(prop), 3)})(${fmt(sigma, 2)})$`,
      ],
      solution: `The z with ${fmt(prop, 3)} of a normal model ${above ? 'above' : 'below'} it is $z = ${fmt(above ? normal.isf(prop) : normal.quantile(prop), 3)}$. Converting back into ${ctx.units}:\n\n$$x = \\mu + z\\sigma = ${fmt(mu, ctx.digits)} + (${fmt(above ? normal.isf(prop) : normal.quantile(prop), 3)})(${fmt(sigma, 2)}) = ${fmt(cut, Math.max(d, 3))}$$\n\nThe threshold is **${fmt(cut, d)} ${ctx.units}**. Check the direction before writing it down: a threshold with only ${fmtPct(prop, 1)} ${above ? 'above' : 'below'} it must fall ${above ? 'above' : 'below'} the mean when that proportion is less than half.`,
      misconception: 'Taking the z for the wrong tail, which puts the threshold on the wrong side of the mean. The sign of z is decided before any arithmetic: below the centre it is negative.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — the empirical rule against the exact area
// ---------------------------------------------------------------------------------------------

export const empiricalRule = defineGenerator({
  id: 'act-1/empirical-rule',
  label: 'The proportion beyond k standard deviations',
  ap_topics: ['1.10'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, MEASURES)
    const { mu, sigma } = drawModel(rng, ctx)
    const k = pickContext(rng, [1, 2, 3])
    const cut = mu + k * sigma
    const p = normal.sf(k)
    return {
      prompt: `${modelLine(ctx, mu, sigma)}\n\nWhat proportion of ${ctx.population} lies **more than ${k} standard deviation${k === 1 ? '' : 's'} above the mean** — that is, above ${fmt(cut, ctx.digits)} ${ctx.units}?\n\nGive a proportion. The exact normal-model value to four decimals is wanted, but an answer taken from the empirical rule will also be accepted.`,
      answer: numericAnswer(p, 'proportion', { digits: 4, tolerance: 0.005 }),
      hints: [
        'The empirical rule says how much of a normal model lies *within* ±1, ±2 and ±3 standard deviations. What is left over is split evenly between the two tails.',
        `Within ±${k} SD lies ${fmtPct(normal.between(-k, k), 1)} of the model, so ${fmtPct(1 - normal.between(-k, k), 2)} lies outside — and this question asks for one tail of that.`,
        `Halve the leftover, or take the area above $z = ${k}$ directly.`,
      ],
      solution: `Standardising: the cutoff is exactly $z = ${k}$, because it was defined as ${k} standard deviation${k === 1 ? '' : 's'} above the mean — the values of $\\mu$ and $\\sigma$ never enter.\n\nThe empirical rule puts ${fmtPct(normal.between(-k, k), 1)} of the model within ±${k} SD, leaving ${fmtPct(1 - normal.between(-k, k), 2)} outside and half of that in the upper tail. Exactly:\n\n$$P(Z > ${k}) = ${fmt(p, 6)}$$\n\nSo about **${fmt(p, 4)}** of ${ctx.population} — roughly one in ${fmtInt(Math.round(1 / p))}. The empirical-rule figure of ${fmt((1 - normal.between(-k, k)) / 2, 4)} is the same number rounded, which is all the rule ever was.`,
      misconception: `Reporting the proportion outside *both* tails when the question asks for one. Beyond ±${k} SD there is ${fmtPct(1 - normal.between(-k, k), 2)}, and only half of it is above the mean.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — percentile rank within a logged set
// ---------------------------------------------------------------------------------------------

export const percentileOfContact = defineGenerator({
  id: 'act-1/percentile-of-contact',
  label: 'Percentile of one observation',
  ap_topics: ['1.10'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, MEASURES)
    const { mu, sigma } = drawModel(rng, ctx)
    const n = rng.int(18, 30)
    const draw = retry(
      rng,
      (r) => {
        const xs = drawDataset(r, { n, mean: mu, sd: sigma, round: ctx.digits, distinct: true })
        const sortedXs = xs.slice().sort((p, q) => p - q)
        const idx = r.int(Math.ceil(n * 0.15), Math.floor(n * 0.9))
        return { xs, sortedXs, target: sortedXs[idx] }
      },
      ({ xs, target }) => xs.filter((v) => v === target).length === 1,
    )
    const { xs, sortedXs, target } = draw
    const below = xs.filter((v) => v < target).length
    const rank = percentileRank(xs, target)
    const pct = rank * 100
    return {
      prompt: `${ctx.frame}\n\n${fmtInt(n)} readings of ${ctx.variable}, in ${ctx.units}, as logged:\n\n${listNumbers(sortedXs, ctx.digits)}\n\nOne of them reads **${fmt(target, ctx.digits)} ${ctx.units}**. What **percent of the ${fmtInt(n)} readings fall below it**? Give a percentage to **one decimal place**.`,
      answer: numericAnswer(pct, 'percent', { digits: 1, units: '%' }),
      hints: [
        'A percentile rank is a count divided by a total, expressed as a percent — no model and no normal curve are involved.',
        `Count the readings strictly less than ${fmt(target, ctx.digits)}, then divide by ${fmtInt(n)}.`,
        `$${below}/${n}$, as a percentage to one decimal.`,
      ],
      solution: `Sorted, ${below} of the ${fmtInt(n)} readings fall below ${fmt(target, ctx.digits)} ${ctx.units}:\n\n$$\\text{percentile rank} = \\frac{${below}}{${n}} = ${fmt(rank, 4)}$$\n\nSo **${fmt(pct, 1)} percent** of the readings are below it. State the convention you used: this count is of readings strictly *below* the value, which is what "percent below" asks for; counting the value itself as well would give ${fmt(percentileRank(xs, target, true) * 100, 1)} percent.`,
      misconception: 'Confusing the percentile rank with the value itself, or reading a z-score as a percentile. A z of 1 is not the 1st percentile — it is a distance, and the percentile is the area below it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — what the z-score says
// ---------------------------------------------------------------------------------------------

export const zInterpretation = defineGenerator({
  id: 'act-1/z-interpretation',
  label: 'Interpret a z-score in context',
  ap_topics: ['1.10'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, MEASURES)
    const { mu, sigma } = drawModel(rng, ctx)
    const withTail = rng.bool()
    const z = retry(
      rng,
      (r) => Number((r.uniform(1.1, 2.5) * (r.bool() ? 1 : -1)).toFixed(2)),
      (v) => !reservedZ(v),
    )
    const x = Number((mu + z * sigma).toFixed(ctx.digits))
    const zx = zScore(x, mu, sigma)
    const above = zx >= 0
    const tailP = above ? normal.sf(x, mu, sigma) : normal.cdf(x, mu, sigma)
    const answer = zScoreInterpretation({
      z: zx,
      value: x,
      mean: mu,
      sd: sigma,
      variable: ctx.variable,
      units: ctx.units,
      population: ctx.population,
      tail: withTail ? { proportion: tailP, side: above ? 'above' : 'below' } : undefined,
    })
    return {
      prompt: `${modelLine(ctx, mu, sigma)}\n\n${ctx.individual[0].toUpperCase()}${ctx.individual.slice(1)} is logged at **${fmt(x, ctx.digits)} ${ctx.units}**, a z-score of ${fmt(zx, 2)}.\n\nWrite one sentence saying what that z-score means **in context**: the value, how many standard deviations it sits from the mean and on which side, the mean it is measured from, and what is being measured on whom.${withTail ? ` Then add the proportion of ${ctx.population} the model puts ${above ? 'above' : 'below'} it, to four decimals.` : ''}`,
      answer,
      hints: [
        'A z-score is a distance, not a probability. The sentence needs the number, the words "standard deviations", a direction, and the context.',
        `The value is ${fmt(x, ctx.digits)} ${ctx.units}; the model's mean is ${fmt(mu, ctx.digits)} and its SD ${fmt(sigma, 2)}; the value sits ${fmt(Math.abs(zx), 2)} SD ${above ? 'above' : 'below'} the mean.${withTail ? ` The area ${above ? 'above' : 'below'} it is ${fmt(tailP, 4)}.` : ''}`,
      ],
      solution: `$$z = \\frac{${fmt(x, ctx.digits)} - ${fmt(mu, ctx.digits)}}{${fmt(sigma, 2)}} = ${fmt(zx, 2)}$$\n\n**${answer.exemplar}**\n\nThe z-score itself is never a probability: it is a distance in standard deviations. The probability, when the question asks for one, is the area under the model beyond it${withTail ? ` — here ${fmt(tailP, 4)}` : ''}.`,
      misconception: 'Saying "the z-score is 1.8, so 1.8 percent of hulls are hotter". A z is a distance; the proportion is an area under the model past it.',
    }
  },
})
