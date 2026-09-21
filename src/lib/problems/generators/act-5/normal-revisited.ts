/**
 * act-5-02 · Normal, Revisited — drills. AP 5.2: normal probabilities and percentiles in both
 * directions; assessing whether a normal model is reasonable from a dotplot or a normal probability
 * plot; and reading a normal-model probability as a long-run proportion of a population.
 *
 *   act-5/inverse-normal-cutoff        numeric  the delay above which only q % of honest transits fall
 *   act-5/normal-tail-probability      numeric  P(one honest transit is at least x days late)
 *   act-5/normal-between               numeric  P(a ≤ delay ≤ b), or the k-th percentile — both directions
 *   act-5/how-many-clear-the-cutoff    numeric  the EXPECTED number of a group of m above a percentile cutoff
 *   act-5/assess-normality             display  is a normal model reasonable — and say why from the plot
 *   act-5/interpret-normal-probability interp   a normal probability as a long-run proportion, in context
 *
 * The lesson the Act needs from this module is the one in `how-many-clear-the-cutoff`: a group can be
 * collectively extraordinary while every member of it is individually ordinary. Act V stops there.
 * No drill here computes a test statistic or states a significance conclusion — that is Act VI.
 *
 * The Ledger's own seeded figures (the 1 % cutoff, the nineteen's mean, P ≈ 0.155) belong to the
 * module text and the mission beats; every draw here is another slice of the honest Lane.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawDataset, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { mean, median, normal, outliers, sd, skewness } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface DelayContext {
  /** The mark the delay is measured to. */
  mark: string
  /** Who the model is about. */
  population: string
  /** Short name for the fleet, for prompts. */
  fleet: string
}

const CONTEXTS: readonly DelayContext[] = [
  { mark: 'Mark 9', population: 'honest transits on the Hundred-Day Lane', fleet: 'the Lane' },
  { mark: 'Mark 6', population: 'honest transits on the Hundred-Day Lane', fleet: 'the Lane' },
  { mark: 'Mark 11', population: 'honest transits on the Hundred-Day Lane', fleet: 'the Lane' },
  { mark: 'Mark 9', population: 'Mercantile hulls on the Hundred-Day Lane', fleet: 'the Mercantile fleet' },
  { mark: 'Mark 9', population: 'independent hulls on the Hundred-Day Lane', fleet: 'the independent fleet' },
] as const

/** The Ledger's own headline numbers, reserved for the module text and the mission beats. */
const reservedDelay = (x: number): boolean => Math.abs(x - 6.4) < 0.06 || Math.abs(x - 2.83) < 0.04
const reservedProb = (p: number): boolean => Math.abs(p - 0.155) < 0.004

/** μ and σ of a normal model for Mark-n delay, drawn around the Lane's own figures. */
function drawModel(rng: Rng): { mu: number; sigma: number } {
  const mu = Math.round(rng.uniform(-0.35, 0.35) * 100) / 100
  const sigma = Math.round(rng.uniform(2.2, 3.2) * 100) / 100
  return { mu, sigma }
}

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

const MODEL_NOTE = (c: DelayContext, mu: number, sigma: number) =>
  `${c.mark} delay — actual minus scheduled time to ${c.mark} against the nominal 3.00-mgee plot — is well modelled as **normal** across ${c.population}, with mean $\\mu = ${fmt(mu, 2)}$ d and standard deviation $\\sigma = ${fmt(sigma, 2)}$ d.`

// ---------------------------------------------------------------------------------------------
// 1. Numeric — inverse normal: the cutoff only q % of honest transits clear
// ---------------------------------------------------------------------------------------------

const TAIL_PERCENTS = [0.5, 1, 2, 5, 10] as const

export const inverseNormalCutoff = defineGenerator({
  id: 'act-5/inverse-normal-cutoff',
  label: 'The cutoff only q % of honest transits clear',
  ap_topics: ['5.2'],
  skills: ['3'],
  generate(rng) {
    const c = pickContext(rng, CONTEXTS)
    const q = pickContext(rng, TAIL_PERCENTS)
    const { mu, sigma } = retry(rng, drawModel, ({ mu, sigma }) => !reservedDelay(normal.quantile(1 - q / 100, mu, sigma)))
    const area = 1 - q / 100
    const zStar = normal.quantile(area)
    const cutoff = normal.quantile(area, mu, sigma)
    return {
      prompt: `${MODEL_NOTE(c, mu, sigma)}\n\nFerrier wants a line drawn on the display: **the delay above which only ${fmt(q, q < 1 ? 1 : 0)} % of ${c.population} fall.**\n\nFind that cutoff, in days, to two decimal places.`,
      answer: numericAnswer(cutoff, 'other', { digits: 2, units: 'd' }),
      hints: [
        'This one runs backwards. You are given an *area* and asked for the value that cuts it off, which is the inverse-normal direction — area in, boundary out.',
        `Only ${fmt(q, q < 1 ? 1 : 0)} % lie above the cutoff, so ${fmt(area * 100, area * 100 < 99.5 ? 0 : 1)} % lie below it. Find the standard-normal $z$ with that much area to its left, then undo the standardization: $x = \\mu + z\\sigma$.`,
        `$z^\\star = ${fmt(zStar, 3)}$. Now $x = ${fmt(mu, 2)} + ${fmt(zStar, 3)} \\times ${fmt(sigma, 2)}$, to two decimals.`,
      ],
      solution: `Area below the cutoff: $1 - ${fmt(q / 100, 3)} = ${fmt(area, 3)}$.\n\n$$z^\\star = \\Phi^{-1}(${fmt(area, 3)}) = ${fmt(zStar, 4)}$$\n\n$$x = \\mu + z^\\star\\sigma = ${fmt(mu, 2)} + ${fmt(zStar, 4)} \\times ${fmt(sigma, 2)} = ${fmt(cutoff, 4)}$$\n\nThe cutoff is **${fmt(cutoff, 2)} d**.\n\nEverything above that line is the latest ${fmt(q, q < 1 ? 1 : 0)} % of honest arrivals — which means that ${fmt(q, q < 1 ? 1 : 0)} % of perfectly ordinary transits cross it every year by doing nothing but flying the Lane. A single hull above the line is not evidence of anything; it is the ${fmt(q, q < 1 ? 1 : 0)} %.`,
      misconception: `Reading the z-table in the forward direction and reporting $z^\\star = ${fmt(zStar, 2)}$ itself, or using the area ${fmt(q / 100, 3)} instead of ${fmt(area, 3)} and landing on the wrong tail entirely.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — P(one honest transit is at least x days late)
// ---------------------------------------------------------------------------------------------

export const normalTailProbability = defineGenerator({
  id: 'act-5/normal-tail-probability',
  label: 'P(one honest transit is at least x days late)',
  ap_topics: ['5.2'],
  skills: ['3'],
  generate(rng) {
    const c = pickContext(rng, CONTEXTS)
    const d = retry(
      rng,
      (r) => {
        const { mu, sigma } = drawModel(r)
        const x = Math.round((mu + sigma * r.uniform(0.35, 2.1)) * 100) / 100
        return { mu, sigma, x, p: normal.sf(x, mu, sigma), z: (x - mu) / sigma }
      },
      ({ x, p }) => p >= 0.02 && p <= 0.4 && !reservedDelay(x) && !reservedProb(p),
    )
    const { mu, sigma, x, p, z } = d
    return {
      prompt: `${MODEL_NOTE(c, mu, sigma)}\n\nOne hull comes in **${fmt(x, 2)} d** behind the nominal plot at ${c.mark}.\n\nUnder this model, what proportion of ${c.population} are **at least that late**? Give a proportion to three decimal places.`,
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'Standardize first: how many standard deviations above the mean is this delay? Then you need the area in the upper tail beyond that point.',
        `$z = (${fmt(x, 2)} - ${fmt(mu, 2)}) / ${fmt(sigma, 2)}$. The question asks for the area **above** $z$, so use the upper-tail area — not the area below it.`,
        `$z = ${fmt(z, 3)}$; now find $P(Z \\ge ${fmt(z, 3)})$, to three decimals.`,
      ],
      solution: `$$z = \\frac{x - \\mu}{\\sigma} = \\frac{${fmt(x, 2)} - ${fmt(mu, 2)}}{${fmt(sigma, 2)}} = ${fmt(z, 4)}$$\n\n$$P(X \\ge ${fmt(x, 2)}) = P(Z \\ge ${fmt(z, 4)}) = ${fmt(p, 4)}$$\n\nThe proportion is **${fmt(p, 3)}** — about ${fmtPct(p, 0)} of ${c.population}, or roughly ${fmtInt(Math.round(p * 100))} in every 100.\n\nRead that back before moving on. A hull ${fmt(x, 2)} d behind the plot is in company: ${fmtInt(Math.round(p * 1000))} of every thousand ${c.population} are at least that late. Lateness on one hull is not a finding.`,
      misconception: `Reporting the area *below* the cutoff (${fmt(normal.cdf(x, mu, sigma), 3)}) instead of above it. Read the direction off the wording — "at least that late" is the upper tail.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — both directions: an area between two delays, or a percentile
// ---------------------------------------------------------------------------------------------

const PERCENTILES = [10, 20, 25, 30, 40, 60, 70, 75, 80, 90] as const

export const normalBetween = defineGenerator({
  id: 'act-5/normal-between',
  label: 'Between two delays — or the delay at a percentile',
  ap_topics: ['5.2'],
  skills: ['3'],
  generate(rng) {
    const c = pickContext(rng, CONTEXTS)
    const askPercentile = rng.bool()

    if (askPercentile) {
      const k = pickContext(rng, PERCENTILES)
      const { mu, sigma } = retry(rng, drawModel, ({ mu, sigma }) => !reservedDelay(normal.quantile(k / 100, mu, sigma)))
      const zk = normal.quantile(k / 100)
      const value = normal.quantile(k / 100, mu, sigma)
      return {
        prompt: `${MODEL_NOTE(c, mu, sigma)}\n\nThe Authority's summary table reports the **${fmtInt(k)}th percentile** of ${c.mark} delay for ${c.population} — the delay with ${fmtInt(k)} % of honest transits at or below it.\n\nWhat delay is that? Give it in days to two decimal places.`,
        answer: numericAnswer(value, 'other', { digits: 2, units: 'd' }),
        hints: [
          'A percentile is an area given and a value asked for: the inverse-normal direction. The area always goes *below* the value you want.',
          `Find the standard-normal $z$ with ${fmtInt(k)} % of the area to its left, then convert back with $x = \\mu + z\\sigma$. Note the sign of $z$ before you multiply.`,
          `$z = ${fmt(zk, 3)}$, so $x = ${fmt(mu, 2)} + (${fmt(zk, 3)}) \\times ${fmt(sigma, 2)}$, to two decimals.`,
        ],
        solution: `$$z = \\Phi^{-1}(${fmt(k / 100, 2)}) = ${fmt(zk, 4)}$$\n\n$$x = \\mu + z\\sigma = ${fmt(mu, 2)} + (${fmt(zk, 4)}) \\times ${fmt(sigma, 2)} = ${fmt(value, 4)}$$\n\nThe ${fmtInt(k)}th percentile is **${fmt(value, 2)} d**.\n\n${k < 50 ? `A negative $z$ puts the percentile **below** the mean, which is right: ${fmtInt(k)} % of honest transits beat this figure, and hulls that arrive early are as ordinary as hulls that arrive late.` : `A positive $z$ puts the percentile **above** the mean, so ${fmtInt(100 - k)} % of honest transits are later still. The tail of this distribution is populated by perfectly honest hulls.`}`,
        misconception: `Using $${fmtInt(100 - k)}\\%$ as the area, or dropping the sign of $z$ and landing on the wrong side of the mean.`,
      }
    }

    const d = retry(
      rng,
      (r) => {
        const { mu, sigma } = drawModel(r)
        const a = Math.round((mu + sigma * r.uniform(-2.0, -0.2)) * 100) / 100
        const b = Math.round((mu + sigma * r.uniform(0.2, 2.0)) * 100) / 100
        return { mu, sigma, a, b, p: normal.between(a, b, mu, sigma), za: (a - mu) / sigma, zb: (b - mu) / sigma }
      },
      ({ a, b, p }) => b - a > 0.5 && p >= 0.25 && p <= 0.92 && !reservedDelay(a) && !reservedDelay(b) && !reservedProb(p),
    )
    const { mu, sigma, a, b, p, za, zb } = d
    return {
      prompt: `${MODEL_NOTE(c, mu, sigma)}\n\nThe Lane Authority calls a transit **nominal** when its ${c.mark} delay falls between ${fmt(a, 2)} d and ${fmt(b, 2)} d.\n\nUnder this model, what proportion of ${c.population} are nominal? Give a proportion to three decimal places.`,
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'An area between two values is a difference of two areas. Standardize both endpoints before you subtract anything.',
        `$z_{\\text{lo}} = (${fmt(a, 2)} - ${fmt(mu, 2)})/${fmt(sigma, 2)}$ and $z_{\\text{hi}} = (${fmt(b, 2)} - ${fmt(mu, 2)})/${fmt(sigma, 2)}$. The proportion between them is the area below the upper $z$ minus the area below the lower $z$.`,
        `$z_{\\text{lo}} = ${fmt(za, 3)}$, $z_{\\text{hi}} = ${fmt(zb, 3)}$. Subtract the smaller area from the larger, to three decimals.`,
      ],
      solution: `$$z_{\\text{lo}} = \\frac{${fmt(a, 2)} - ${fmt(mu, 2)}}{${fmt(sigma, 2)}} = ${fmt(za, 3)}, \\qquad z_{\\text{hi}} = \\frac{${fmt(b, 2)} - ${fmt(mu, 2)}}{${fmt(sigma, 2)}} = ${fmt(zb, 3)}$$\n\n$$P(${fmt(a, 2)} \\le X \\le ${fmt(b, 2)}) = \\Phi(${fmt(zb, 3)}) - \\Phi(${fmt(za, 3)}) = ${fmt(normal.cdf(zb), 4)} - ${fmt(normal.cdf(za), 4)} = ${fmt(p, 4)}$$\n\nThe proportion is **${fmt(p, 3)}**.\n\nSo ${fmtPct(1 - p, 0)} of ${c.population} fall *outside* the Authority's nominal band without anything being wrong with them. A band drawn on a normal model is a statement about how much honest spread there is, not a list of suspects.`,
      misconception: 'Adding the two tail areas instead of subtracting the two cumulative areas, or subtracting the z-scores themselves rather than the areas they cut off.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — how many of a group would you EXPECT above the cutoff
// ---------------------------------------------------------------------------------------------

const CUTOFF_PERCENTILES = [95, 98, 99] as const

export const howManyClearTheCutoff = defineGenerator({
  id: 'act-5/how-many-clear-the-cutoff',
  label: 'How many of the group would you expect above the cutoff?',
  ap_topics: ['5.2'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, CONTEXTS)
    const q = pickContext(rng, CUTOFF_PERCENTILES)
    const m = retry(rng, (r) => r.int(12, 40), (v) => v !== 19 && v !== 31)
    const { mu, sigma } = retry(rng, drawModel, ({ mu, sigma }) => !reservedDelay(normal.quantile(q / 100, mu, sigma)))
    const tail = 1 - q / 100
    const cutoff = normal.quantile(q / 100, mu, sigma)
    const expected = m * tail
    return {
      prompt: `${MODEL_NOTE(c, mu, sigma)}\n\nThe Authority draws its late line at the **${fmtInt(q)}th percentile** of that model: a delay of ${fmt(cutoff, 2)} d, above which only ${fmt(tail * 100, tail * 100 < 1.05 ? 1 : 0)} % of ${c.population} fall.\n\nA claims adjuster hands you a file of **${fmtInt(m)}** ${c.population} chosen without reference to how late they ran.\n\nHow many of those ${fmtInt(m)} would you **expect** to be above the line? Give the expected number to two decimal places.`,
      answer: numericAnswer(expected, 'other', { digits: 2 }),
      hints: [
        'The cutoff was defined by an area, and that area is the probability that any one honest transit lands above it. You are being asked for an expected count, not a probability.',
        `Each of the ${fmtInt(m)} transits clears the line with probability ${fmt(tail, 3)}, independently of the others. The expected number of successes in ${fmtInt(m)} such trials is $m \\times p$.`,
        `$${fmtInt(m)} \\times ${fmt(tail, 3)}$, to two decimals.`,
      ],
      solution: `$$E(\\text{above the line}) = m \\times (1 - ${fmt(q / 100, 2)}) = ${fmtInt(m)} \\times ${fmt(tail, 3)} = ${fmt(expected, 4)}$$\n\nYou would expect **${fmt(expected, 2)}** of them.\n\nThis is the number that decides what a single late hull is worth as evidence, so take it slowly. A line drawn at the ${fmtInt(q)}th percentile is crossed by ${fmt(tail * 100, tail * 100 < 1.05 ? 1 : 0)} % of ${c.population}, by definition — that is what a percentile is. In a file of ${fmtInt(m)}, ${expected < 1 ? `you would usually see none above it, and seeing one is entirely ordinary` : `about ${fmt(expected, 1)} above it is exactly what honesty looks like`}.\n\nSo finding ${expected < 1 ? 'one' : 'two'} of the ${fmtInt(m)} above the line tells you nothing at all. If there is a case to be made about this group, it is not made one hull at a time — it has to be made about the group's **mean**, and that needs the sampling distribution of $\\bar{x}$.`,
      misconception: 'Judging a group by whether its individual members are extreme. Any group of honest transits contains a few above any percentile line — that is what the line means. Evidence about a group lives in the group\'s summary statistic, not in its worst member.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Display — is a normal model reasonable here?
// ---------------------------------------------------------------------------------------------

export const assessNormality = defineGenerator({
  id: 'act-5/assess-normality',
  label: 'Is a normal model reasonable?',
  ap_topics: ['5.2'],
  skills: ['2', '4'],
  generate(rng) {
    const c = pickContext(rng, CONTEXTS)
    const isNormal = rng.bool()
    const asPlot = rng.bool()
    const n = rng.int(24, 40)
    const { mu, sigma } = drawModel(rng)
    const values = isNormal
      ? drawDataset(rng, { n, mean: mu, sd: sigma, round: 2, shape: 'normal', accept: (xs) => Math.abs(skewness(xs)) <= 0.45 && outliers(xs).values.length === 0 })
      : drawDataset(rng, {
          n,
          mean: mu,
          sd: sigma,
          round: 2,
          shape: 'skewRight',
          accept: (xs) => skewness(xs) >= 1.05 && outliers(xs).values.filter((v) => v > median(xs)).length >= 1,
        })
    const g1 = skewness(values)
    const out = outliers(values)
    const sorted = values.slice().sort((a, b) => a - b)
    const points = sorted.map((v, i) => ({ x: normal.quantile((i + 0.5) / n), y: v }))
    const cands: Candidate[] = [
      {
        text: asPlot
          ? `**Yes.** The points on the probability plot fall close to a straight line, with no systematic bend at either end, so a normal model is a reasonable description of ${c.mark} delay for this group.`
          : `**Yes.** The dotplot is roughly symmetric about its centre, with no values stranded far out in either tail, so a normal model is a reasonable description of ${c.mark} delay for this group.`,
        correct: isNormal,
        why: isNormal ? null : asPlot ? `Look at the ends of the plot. The points curve away from any straight line you could draw, and they curve *upward* on the right — the sample's large values are much further out than a normal model puts them.` : `Look at the tails. The dots trail a long way out to the right and bunch up on the left; a symmetric model cannot describe that.`,
      },
      {
        text: asPlot
          ? `**No.** The plot bends away from a straight line and curves up at the right-hand end, so the right tail of this group is longer than a normal model allows.`
          : `**No.** The dotplot is clearly right-skewed — a long right tail with values stranded well above the rest — so a normal model would understate how often a transit in this group runs very late.`,
        correct: !isNormal,
        why: !isNormal ? null : asPlot ? `The points here do lie along a line; small wobbles at the ends are what a sample of ${fmtInt(n)} always does, even when the population is exactly normal.` : `A sample of ${fmtInt(n)} is never perfectly smooth. This one is symmetric about its centre with no stranded values — which is as close to normal as a real sample of this size gets.`,
      },
      {
        text: `**Yes**, because $n = ${fmtInt(n)}$ is a reasonable sample size, and the Central Limit Theorem makes the population approximately normal once $n$ is large enough.`,
        correct: false,
        why: `The Central Limit Theorem says nothing whatever about the population. It is a statement about the sampling distribution of $\\bar{x}$, and it leaves the shape of the individual delays exactly as it found it. Whether a normal model fits *these* values is a question only the display can answer.`,
      },
      {
        text: `**No**, because ${fmtInt(n)} transits is too small a sample to say anything about the shape of a population.`,
        correct: false,
        why: `A sample of ${fmtInt(n)} is small but it is not silent — checking shape from a plot of ${fmtInt(n)} values is precisely the AP procedure, and it is the only one available when $\\sigma$ is unknown. "Too small to say" would rule out every normality check ever made.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    const display = asPlot
      ? ({ kind: 'scatter', points, xLabel: 'theoretical z-score', yLabel: `${c.mark} delay (d)`, fitLine: false } as const)
      : ({ kind: 'dotplot', values, label: `${c.mark} delay (d) — ${fmtInt(n)} ${c.population}` } as const)
    return {
      prompt: `Solberg pulls **${fmtInt(n)}** ${c.population} out of the Transit Ledger at random and plots their ${c.mark} delay — actual minus scheduled time to ${c.mark} against the nominal 3.00-mgee plot.\n\n${asPlot ? `The display is a **normal probability plot**: each delay against the z-score a normal model would put it at. A normal population gives a straight line.` : `The display is a **dotplot** of the ${fmtInt(n)} delays.`}\n\nBefore any normal-model probability is quoted for this group: is a normal model reasonable here, and **why**?`,
      answer: { type: 'display', display, question: { type: 'choice', options, correct, feedback } },
      hints: [
        asPlot
          ? 'A normal probability plot asks one question: do the points lie on a line? Ignore the middle, where almost anything looks straight, and look hard at the two ends.'
          : 'Look for the two things that break a normal model: a tail that is much longer on one side than the other, and values stranded away from the rest. Symmetry and no strandings means a normal model is fair.',
        `Sample summaries for this draw: mean ${fmt(mean(values), 2)} d, standard deviation ${fmt(sd(values), 2)} d, skewness ${fmt(g1, 2)}, and ${out.values.length === 0 ? 'no values outside the 1.5 × IQR fences' : `${fmtInt(out.values.length)} value${out.values.length === 1 ? '' : 's'} outside the 1.5 × IQR fences`}. A normal population gives a skewness near 0 and rarely strands values this far out.`,
      ],
      solution: `$$G_1 = ${fmt(g1, 2)}, \\qquad \\text{values outside the } 1.5\\times\\text{IQR fences} = ${fmtInt(out.values.length)}$$\n\n${options[correct]}\n\n${isNormal ? `A skewness of ${fmt(g1, 2)} is as near symmetric as a sample of ${fmtInt(n)} gets, and nothing is stranded outside the fences. Quoting a normal-model probability for this group is defensible — and you say so out loud, in the brief, before you quote one.` : `A skewness of ${fmt(g1, 2)} with ${fmtInt(out.values.length)} value${out.values.length === 1 ? '' : 's'} beyond the upper fence is a long right tail, not sampling noise. A normal model fitted here would badly understate the far tail — it would call a genuinely common late arrival a one-in-a-thousand event, and a brief built on that would not survive a hostile reviewer.`}\n\nAnd note what the sample size did *not* buy you. ${fmtInt(n)} observations make the plot readable; they do not make the population normal, and no theorem does.`,
      misconception: 'Believing the Central Limit Theorem makes the population normal once n is large. It does not touch the population at all — it is a statement about the sampling distribution of x̄. Normality of the individual values is checked by looking at them.',
      notes: `Half the seeds draw a roughly normal sample and half a clearly right-skewed one; ambiguous draws are rejected on skewness (|G1| ≤ 0.45 against ≥ 1.05) and on the 1.5×IQR outlier count.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — a normal probability as a long-run proportion (the Act's rubric item)
// ---------------------------------------------------------------------------------------------

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A normal-model probability describes how often something happens in a population. It proves nothing about any particular hull.',
}

interface NormalProbabilityArgs {
  /** The computed tail probability. */
  p: number
  /** The delay it is measured from. */
  x: number
  context: DelayContext
}

/**
 * "About 15 of every 100 honest Lane transits arrive at Mark 9 at least 2.8 days behind the plot."
 * Requires the value, long-run framing, proportion language, the direction of the tail and the
 * context. Forbids turning a population proportion into a statement about one hull, into intent, or
 * into a prediction about the next hundred transits.
 */
function normalProbabilityRubric({ p, x, context }: NormalProbabilityArgs): InterpretationAnswer {
  const per100 = Math.round(p * 100)
  const required: RubricGroup[] = [
    {
      label: 'Cites the value (as a proportion or a percentage)',
      phrasings: [numberRegex(p, 3, 1), numberRegex(100 * p, 0, 1)],
      polarity: 'any',
      feedback: `Give the number: a proportion of ${fmt(p, 3)}, or about ${fmtPct(p, 0)}.`,
    },
    {
      label: 'Frames it as a long-run proportion, not a one-off chance',
      phrasings: ['longrun', 'out of 100', 'perunit 100', 'many transit', 'repeat', 'over and over'],
      polarity: 'any',
      feedback: 'Say what kind of number it is: a long-run proportion — out of every 100 honest transits, about this many.',
    },
    {
      label: 'Uses proportion / percentage language',
      phrasings: ['proportion', 'percent'],
      polarity: 'any',
      feedback: 'Name it as a proportion (or a percentage) of a population, not as the chance of an event on one hull.',
    },
    {
      label: 'States the direction (at least that late)',
      phrasings: ['least', 'greater', 'later', 'beyond', 'or more'],
      polarity: 'any',
      feedback: `The probability is an upper tail: transits that are **at least** ${fmt(x, 2)} d behind the plot, not exactly that late.`,
    },
    contextGroup('States the context (the population and the variable)', [context.population, `${context.mark} delay in days`], {
      minMatches: 2,
      feedback: `Say what and whom: ${context.mark} delay, in days, for ${context.population}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    { phrase: 'guilty', label: 'Turns a proportion into a verdict', why: 'The model describes how late honest hulls run. It says nothing about any hull being at fault.' },
    {
      phrase: /\b(?:deliberate\w*|on purpose|purposely|intentional\w*|meant to be late)\b/,
      label: 'Reads intent into a delay',
      why: 'The probability is about lateness, not about why a hull was late. Intent is not in this model.',
    },
    {
      phrase: /\b(?:probability|chance|likelihood)\b[^.;:]{0,25}\bthis (?:hull|transit|ship)\b/,
      label: 'Makes it a statement about one hull',
      why: 'This hull either was or was not that late — the delay is already known. The probability is a proportion of the population, not a chance for a hull whose delay you have in front of you.',
    },
    {
      phrase: /\bnext\s+(?:\d+|hundred|few)\b/,
      label: 'Predicts an exact count in the next batch',
      why: 'A long-run proportion does not promise a count in any particular batch. The next 100 transits might contain more or fewer.',
    },
    {
      phrase: /\b(?:will|would|going to)\s+(?:happen|occur|be late)\b[^.;:]{0,25}\btimes\b/,
      label: 'Predicts an exact count in the next batch',
      why: 'A long-run proportion does not promise a count in any particular batch.',
    },
    PROVES,
  ]
  const exemplar = `In the long run, about ${fmtInt(per100)} out of every 100 ${context.population} arrive at ${context.mark} at least ${fmt(x, 2)} days behind the nominal plot — that is, a proportion of about ${fmt(p, 3)} of all ${context.population} are that late or later.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 22 }
}

export const interpretNormalProbability = defineGenerator({
  id: 'act-5/interpret-normal-probability',
  label: 'Interpret a normal probability in context',
  ap_topics: ['5.2'],
  skills: ['3', '4'],
  generate(rng) {
    const c = pickContext(rng, CONTEXTS)
    const d = retry(
      rng,
      (r) => {
        const { mu, sigma } = drawModel(r)
        const x = Math.round((mu + sigma * r.uniform(0.5, 1.7)) * 100) / 100
        return { mu, sigma, x, p: normal.sf(x, mu, sigma), z: (x - mu) / sigma }
      },
      ({ x, p }) => p >= 0.05 && p <= 0.31 && Math.abs(p * 100 - Math.round(p * 100)) < 0.45 && !reservedDelay(x) && !reservedProb(p),
    )
    const { mu, sigma, x, p, z } = d
    const answer = normalProbabilityRubric({ p, x, context: c })
    return {
      prompt: `${MODEL_NOTE(c, mu, sigma)}\n\nYou compute\n\n$$P(X \\ge ${fmt(x, 2)}) = ${fmt(p, 4)}$$\n\nFerrier will not let a number into the brief until somebody has said what it means in words. **Interpret this probability in context**, in one or two sentences: say what proportion of what population is what, and in which direction. Cite the value.`,
      answer,
      hints: [
        'A normal-model probability is not a forecast about the hull in front of you. It is a statement about how a population is spread out — what share of it sits beyond a line.',
        `Build the sentence from four pieces: the value (${fmt(p, 3)}); the words "long-run proportion" or "out of every 100"; the population (${c.population}); and the direction — **at least** ${fmt(x, 2)} d behind the plot, not exactly that.`,
        `Write it so an adjuster could check it: "about ___ out of every 100 ${c.population} arrive at ${c.mark} at least ___ days behind the nominal plot."`,
      ],
      solution: `$$z = \\frac{${fmt(x, 2)} - ${fmt(mu, 2)}}{${fmt(sigma, 2)}} = ${fmt(z, 3)}, \\qquad P(X \\ge ${fmt(x, 2)}) = ${fmt(p, 4)}$$\n\n**${answer.exemplar}**\n\nThe common mistake is to read ${fmt(p, 3)} as a statement about the hull whose file is open in front of you. It is not: that hull's delay is already known, and a known quantity has no probability left in it. The number describes the *population* — it tells you how unremarkable a delay of ${fmt(x, 2)} d is among honest transits, which is exactly why a single late hull cannot carry an accusation.`,
      misconception: `Reading a population proportion as a probability about one named hull, or as a promise that exactly ${fmtInt(Math.round(p * 100))} of the next 100 transits will run that late. It is a long-run share of ${c.population}, and a particular hundred may hold more or fewer.`,
    }
  },
})
