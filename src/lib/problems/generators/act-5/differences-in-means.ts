/**
 * act-5-05 · Differences in Means — drills. AP 5.8: the mean and standard deviation of x̄₁ − x̄₂;
 * why the *variances* add and the standard deviations never subtract; the conditions that license a
 * normal model for a difference (independence first, then a normal parent or n ≥ 30 in each group);
 * probabilities about a difference; and the inverse question — how large a gap in mean delay would
 * have to be before it counted as rare.
 *
 *   act-5/sd-of-difference-means              numeric  SD of x̄₁ − x̄₂ in days, from σ₁, n₁, σ₂, n₂
 *   act-5/unequal-n-dominance                 numeric  what share of the variance the smaller group supplies
 *   act-5/probability-about-difference-means  numeric  P(x̄₁ − x̄₂ ≥ d) under a common mean
 *   act-5/gap-in-mean-delay-that-would-be-rare numeric the gap in mean delay that would be a 1-in-q event
 *   act-5/why-variances-add                   choice   which expression is the SD of the difference — and when
 *   act-5/interpret-difference-probability    interp   that probability as a long-run proportion, under a common mean
 *
 * Act V builds the null model; Act VII compares the nineteen with the surviving 881. Nothing here
 * computes the observed lost-versus-surviving gap, a two-sample t, or a P-value for it, and no item
 * states a significance conclusion. Every gap asked about is hypothetical, put to a distribution
 * built on the assumption that both groups are flying the same Lane at the same mean delay.
 *
 * The Ledger's own figures (19 against 881, 900 against 1,712, σ ≈ 2.73 d) belong to the module text
 * and the mission beats; `reservedSize` and `reservedSigma` keep every draw off them.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { normal, normalLargeSampleCondition, samplingSdMean } from '@/lib/stats'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'
import { LANE_DELAY_SD, sdOfDifferenceOfMeans } from '@/instruments/act-5/data'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Group {
  /** How the Transit Ledger prints the group. */
  name: string
  /** Short form for second references and tables. */
  short: string
}

const GROUPS: readonly Group[] = [
  { name: 'the Perrine hulls', short: 'Perrine' },
  { name: 'the Mercantile hulls', short: 'Mercantile' },
  { name: 'the independent hulls', short: 'independents' },
  { name: 'the hulls CSV Asgard escorted', short: 'the Asgard escorts' },
  { name: 'the hulls CSV Tindr escorted', short: 'the Tindr escorts' },
  { name: 'the hulls that filed the outer waypoint', short: 'the outer-waypoint hulls' },
  { name: 'the hulls that departed on a long-Lane cycle', short: 'the long-cycle hulls' },
] as const

const WINDOWS: readonly string[] = [
  'over the 2178–2180 window',
  'over the 2181–2184 window',
  'in the Ledger’s first three years',
  'in the Ledger’s last four years',
  'over the whole six-year snapshot',
] as const

const OFFICERS: readonly string[] = [
  'LCDR Ferrier wants it before the plot goes to Valhalla',
  'Ensign Ebele is building the null model and needs the number written down',
  'the *Nightjar*’s analysis watch wants it logged before the next burn',
] as const

/** The Ledger's own group sizes — reserved for the module text and the mission beats. */
const RESERVED_SIZES = new Set([19, 880, 900, 1710, 2610])
const reservedSize = (n: number): boolean => RESERVED_SIZES.has(n)
/** The Lane's own honest-delay SD — likewise reserved. */
const reservedSigma = (s: number): boolean => Math.abs(s - LANE_DELAY_SD) < 0.02

/** A population SD for Mark-9 delay, in days, drawn around the Lane's own spread. */
function drawSigma(rng: Rng): number {
  return retry(
    rng,
    (r) => Math.round(r.uniform(2.2, 3.2) * 100) / 100,
    (s) => !reservedSigma(s),
  )
}

/** A fleet-scale group: 150–2,200 transits, on a round ten. */
function drawFleetSize(rng: Rng): number {
  return retry(
    rng,
    (r) => r.int(15, 220) * 10,
    (n) => !reservedSize(n),
  )
}

/** A handful-scale group: 8–40 transits — small enough that the normal parent has to be argued. */
function drawSmallSize(rng: Rng): number {
  return retry(
    rng,
    (r) => r.int(8, 40),
    (n) => !reservedSize(n),
  )
}

type SizeShape = 'fleets' | 'lopsided' | 'both-small'

/** Two group sizes. `lopsided` is the Act's own shape — a handful against a fleet. */
function drawSizes(rng: Rng, shape: SizeShape): { n1: number; n2: number } {
  if (shape === 'both-small') {
    return retry(
      rng,
      (r) => ({ n1: drawSmallSize(r), n2: drawSmallSize(r) }),
      ({ n1, n2 }) => n1 !== n2,
    )
  }
  if (shape === 'lopsided') return { n1: drawSmallSize(rng), n2: drawFleetSize(rng) }
  return retry(
    rng,
    (r) => ({ n1: drawFleetSize(r), n2: drawFleetSize(r) }),
    ({ n1, n2 }) => n1 !== n2,
  )
}

const SIZE_SHAPES: readonly SizeShape[] = ['fleets', 'lopsided', 'both-small'] as const

/** The delay variable, stated the same way every time an item introduces it. */
const DELAY_NOTE = 'Mark-9 delay — actual minus scheduled time to Mark 9 against the nominal 3.00-mgee plot — is modelled as **normal** across honest Lane transits.'

/** The sentence a group of fewer than 30 needs before a normal model for its mean is legitimate. */
const smallGroupNote = (n1: number, n2: number): string =>
  Math.min(n1, n2) < 30
    ? `Neither ${fmtInt(Math.min(n1, n2))} nor the central limit theorem is doing the work here: the *parent* distribution of delay is normal, so the mean of any number of transits is exactly normal, and so is the difference of two such means.`
    : `Both groups clear 30, so even without a normal parent the central limit theorem would make each sample mean approximately normal — and so their difference.`

/** Sentence-case a fragment (group names and officer lines all start lower-case). */
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the SD of a difference of two sample means (checkpoint q8)
// ---------------------------------------------------------------------------------------------

export const sdOfDifferenceMeans = defineGenerator({
  id: 'act-5/sd-of-difference-means',
  label: 'The SD of x̄₁ − x̄₂ in days',
  ap_topics: ['5.8'],
  skills: ['3'],
  generate(rng) {
    const [g1, g2] = rng.shuffle([...GROUPS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const officer = pickContext(rng, OFFICERS)
    const shape = pickContext(rng, SIZE_SHAPES)
    const { n1, n2 } = drawSizes(rng, shape)
    const s1 = drawSigma(rng)
    const s2 = drawSigma(rng)
    const se1 = samplingSdMean(s1, n1)
    const se2 = samplingSdMean(s2, n2)
    const sdDiff = sdOfDifferenceOfMeans(s1, n1, s2, n2)
    const wrong = Math.abs(se1 - se2)
    return {
      prompt: `${DELAY_NOTE}\n\nTake two groups of transits from the Lane Authority's Transit Ledger ${window}: **${g1.name}**, ${fmtInt(n1)} transits with population SD $\\sigma_1 = ${fmt(s1, 2)}$ d, and **${g2.name}**, ${fmtInt(n2)} transits with population SD $\\sigma_2 = ${fmt(s2, 2)}$ d. The two groups are separate hulls on separate runs, so they are independent.\n\nWhat is the **standard deviation of $\\bar x_1 - \\bar x_2$**, in days, to **three decimal places**? ${cap(officer)}.`,
      answer: numericAnswer(sdDiff, 'other', { digits: 3, units: 'd' }),
      hints: [
        'Two independent means, two independent sources of wobble. They do not combine by adding or subtracting the spreads — **variances** combine, and they add, whichever way round the subtraction is written.',
        `Each mean has $\\sigma_{\\bar x} = \\sigma/\\sqrt{n}$, so its variance is $\\sigma^2/n$. Add the two variances and take the square root: $\\sqrt{\\sigma_1^2/n_1 + \\sigma_2^2/n_2}$.`,
        `$\\sigma_1^2/n_1 = ${fmt(s1 ** 2, 4)}/${fmtInt(n1)} = ${fmt(se1 ** 2, 6)}$ and $\\sigma_2^2/n_2 = ${fmt(s2 ** 2, 4)}/${fmtInt(n2)} = ${fmt(se2 ** 2, 6)}$. Add, then square-root, to three decimals.`,
      ],
      solution: `Each sample mean has its own spread:\n\n$$\\sigma_{\\bar x_1} = \\frac{${fmt(s1, 2)}}{\\sqrt{${fmtInt(n1)}}} = ${fmt(se1, 4)} \\text{ d} \\qquad \\sigma_{\\bar x_2} = \\frac{${fmt(s2, 2)}}{\\sqrt{${fmtInt(n2)}}} = ${fmt(se2, 4)} \\text{ d}$$\n\nVariances add:\n\n$$\\sigma_{\\bar x_1 - \\bar x_2} = \\sqrt{\\frac{\\sigma_1^2}{n_1} + \\frac{\\sigma_2^2}{n_2}} = \\sqrt{\\frac{${fmt(s1 ** 2, 4)}}{${fmtInt(n1)}} + \\frac{${fmt(s2 ** 2, 4)}}{${fmtInt(n2)}}} = \\sqrt{${fmt(sdDiff ** 2, 6)}} = ${fmt(sdDiff, 5)}$$\n\nThe standard deviation of the difference is **${fmt(sdDiff, 3)} d**.\n\nIt is larger than either mean's own spread (${fmt(se1, 4)} d and ${fmt(se2, 4)} d), and it has to be. A gap between two noisy numbers carries both lots of noise. ${smallGroupNote(n1, n2)}`,
      misconception: `Subtracting the two standard deviations: $${fmt(Math.max(se1, se2), 4)} - ${fmt(Math.min(se1, se2), 4)}$ gives ${fmt(wrong, 4)} d, **smaller than either one**. A difference of two wobbling quantities that wobbles less than either is not a rounding error, it is an impossibility — which makes it the fastest way to catch the mistake. Variances add; standard deviations never subtract.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — which group supplies the spread, and how much of it
// ---------------------------------------------------------------------------------------------

type DominanceShape = 'lopsided' | 'moderate' | 'near-equal'

const DOMINANCE_SHAPES: readonly DominanceShape[] = ['lopsided', 'moderate', 'near-equal'] as const

export const unequalNDominance = defineGenerator({
  id: 'act-5/unequal-n-dominance',
  label: 'Which group supplies the spread of the difference',
  ap_topics: ['5.8'],
  skills: ['3', '4'],
  generate(rng) {
    const [g1, g2] = rng.shuffle([...GROUPS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const shape = pickContext(rng, DOMINANCE_SHAPES)
    const d = retry(
      rng,
      (r) => {
        let n1: number
        let n2: number
        if (shape === 'lopsided') {
          n1 = drawSmallSize(r)
          n2 = drawFleetSize(r)
        } else if (shape === 'near-equal') {
          n1 = drawFleetSize(r)
          n2 = retry(
            r,
            (rr) => Math.min(2200, Math.max(150, n1 + rr.int(-4, 4) * 10)),
            (n) => n !== n1 && !reservedSize(n),
          )
        } else {
          n1 = drawFleetSize(r)
          n2 = drawFleetSize(r)
        }
        const s1 = drawSigma(r)
        const s2 = drawSigma(r)
        // Group 1 is always the smaller (or equal-sized) group, so the question reads the same way.
        const swap = n1 > n2
        const a = { n: swap ? n2 : n1, s: swap ? s2 : s1 }
        const b = { n: swap ? n1 : n2, s: swap ? s1 : s2 }
        const v1 = a.s ** 2 / a.n
        const v2 = b.s ** 2 / b.n
        return { a, b, v1, v2, share: v1 / (v1 + v2), sdDiff: sdOfDifferenceOfMeans(a.s, a.n, b.s, b.n) }
      },
      ({ share, a, b }) => share >= 0.34 && share <= 0.998 && Math.abs(share - 0.5) > 0.004 && a.n !== b.n && (shape !== 'moderate' || b.n / a.n >= 1.6),
    )
    const { a, b, v1, v2, share, sdDiff } = d
    const dominant = share > 0.5 ? g1 : g2
    return {
      prompt: `${DELAY_NOTE}\n\nTwo independent groups of transits ${window}: **${g1.name}**, ${fmtInt(a.n)} transits with $\\sigma_1 = ${fmt(a.s, 2)}$ d, and **${g2.name}**, ${fmtInt(b.n)} transits with $\\sigma_2 = ${fmt(b.s, 2)}$ d.\n\nThe variance of $\\bar x_1 - \\bar x_2$ is $\\sigma_1^2/n_1 + \\sigma_2^2/n_2$ — a sum of two pieces, one from each group.\n\n**What share of that variance comes from ${g1.name} \u2014 the group of ${fmtInt(a.n)} transits?** Give a proportion to **three decimal places**.`,
      answer: numericAnswer(share, 'proportion', { digits: 3 }),
      hints: [
        'The two groups do not contribute equally, and it is not their sizes that split the total — it is $\\sigma^2/n$ for each. Work out both pieces before you compare them.',
        `Compute $\\sigma_1^2/n_1$ and $\\sigma_2^2/n_2$ separately, add them for the total variance, and divide the first by the total. Share the **variances**, not the standard deviations — the SDs do not split additively.`,
        `$\\sigma_1^2/n_1 = ${fmt(a.s ** 2, 4)}/${fmtInt(a.n)} = ${fmt(v1, 6)}$ and $\\sigma_2^2/n_2 = ${fmt(b.s ** 2, 4)}/${fmtInt(b.n)} = ${fmt(v2, 6)}$. Now take the first over the sum, to three decimals.`,
      ],
      solution: `$$\\frac{\\sigma_1^2}{n_1} = \\frac{${fmt(a.s ** 2, 4)}}{${fmtInt(a.n)}} = ${fmt(v1, 6)} \\qquad \\frac{\\sigma_2^2}{n_2} = \\frac{${fmt(b.s ** 2, 4)}}{${fmtInt(b.n)}} = ${fmt(v2, 6)}$$\n\n$$\\text{share} = \\frac{\\sigma_1^2/n_1}{\\sigma_1^2/n_1 + \\sigma_2^2/n_2} = \\frac{${fmt(v1, 6)}}{${fmt(v1 + v2, 6)}} = ${fmt(share, 5)}$$\n\n${cap(g1.name)} supply **${fmt(share, 3)}** of the variance — ${fmtPct(share, 1)} of it — and ${g2.name} supply the remaining ${fmtPct(1 - share, 1)}. The larger share belongs to **${dominant.name}**.\n\nThe whole difference has SD ${fmt(sdDiff, 4)} d; ${g1.name} alone would give a mean with SD ${fmt(Math.sqrt(v1), 4)} d. ${share > 0.9 ? `Adding a group ${fmt(b.n / a.n, 0)} times larger barely widened it: once one group is that much bigger, its $\\sigma^2/n$ has almost nothing left to contribute, and the spread of the comparison is set by the small group alone. Doubling the big group would buy you almost nothing; doubling the small one would buy you a great deal.` : share > 0.6 ? `So the smaller group carries most of the spread, though not all of it: the larger group still supplies ${fmtPct(1 - share, 1)}, and tightening either one would narrow the comparison.` : `Neither group dominates — the spread of the comparison is genuinely shared, and making either one bigger would tighten it.`}`,
      misconception: `Splitting the **standard deviations** instead of the variances — computing $\\sigma_1/\\sqrt{n_1}$ over the sum of the two SDs. Standard deviations do not add, so they have no shares to split; only the variances do. The other slip is reading the shares off the sample sizes alone (${fmtInt(a.n)} against ${fmtInt(b.n)}), which ignores that the two groups have different $\\sigma$.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — a probability about a difference in mean delay
// ---------------------------------------------------------------------------------------------

export const probabilityAboutDifferenceMeans = defineGenerator({
  id: 'act-5/probability-about-difference-means',
  label: 'P(a gap in mean delay at least this large)',
  ap_topics: ['5.8'],
  skills: ['3'],
  generate(rng) {
    const [g1, g2] = rng.shuffle([...GROUPS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const shape = pickContext(rng, SIZE_SHAPES)
    const insideTheNoise = rng.bool()
    const d = retry(
      rng,
      (r) => {
        const { n1, n2 } = drawSizes(r, shape)
        const sigma = drawSigma(r)
        const sdDiff = sdOfDifferenceOfMeans(sigma, n1, sigma, n2)
        const z0 = insideTheNoise ? r.uniform(0.75, 1.15) : r.uniform(2.15, 2.7)
        const gap = Math.round(z0 * sdDiff * 100) / 100
        return { n1, n2, sigma, sdDiff, gap, prob: normal.sf(gap, 0, sdDiff), z: gap / sdDiff }
      },
      ({ gap, prob }) => gap >= 0.05 && prob >= 0.004 && prob <= 0.32,
    )
    const { n1, n2, sigma, sdDiff, gap, prob, z } = d
    return {
      prompt: `${DELAY_NOTE}\n\nAssume — and this is an assumption, not a finding — that **${g1.name}** and **${g2.name}** fly the Lane with exactly the **same mean delay** and the same population SD $\\sigma = ${fmt(sigma, 2)}$ d. ${cap(g1.name)} log **${fmtInt(n1)} transits** ${window}; ${g2.name} log **${fmtInt(n2)}**. The two groups are independent.\n\nUnder that assumption, what is the probability that $\\bar x_1 - \\bar x_2$ comes out **at least ${fmt(gap, 2)} d**?\n\nGive a probability to **three decimal places**.`,
      answer: numericAnswer(prob, 'proportion', { digits: 3 }),
      hints: [
        'Build the distribution of the difference before you go looking for an area in it. Under a common mean, what is $\\bar x_1 - \\bar x_2$ centred on? And what is its spread?',
        `Centre: the two means estimate the same number, so the difference is centred on **0**. Spread: $\\sqrt{\\sigma^2/n_1 + \\sigma^2/n_2}$. Then standardize ${fmt(gap, 2)} against that centre and spread and take the upper tail.`,
        `$\\sigma_{\\bar x_1 - \\bar x_2} = ${fmt(sdDiff, 5)}$, so $z = ${fmt(gap, 2)}/${fmt(sdDiff, 5)} = ${fmt(z, 3)}$. Now the area above that $z$, to three decimals.`,
      ],
      solution: `**Centre.** Under a common mean, $\\mu_{\\bar x_1 - \\bar x_2} = \\mu - \\mu = 0$.\n\n**Spread.** Variances add:\n\n$$\\sigma_{\\bar x_1 - \\bar x_2} = \\sqrt{\\frac{${fmt(sigma ** 2, 4)}}{${fmtInt(n1)}} + \\frac{${fmt(sigma ** 2, 4)}}{${fmtInt(n2)}}} = ${fmt(sdDiff, 5)} \\text{ d}$$\n\n**Area.**\n\n$$z = \\frac{${fmt(gap, 2)} - 0}{${fmt(sdDiff, 5)}} = ${fmt(z, 4)} \\qquad P(\\bar x_1 - \\bar x_2 \\ge ${fmt(gap, 2)}) = ${fmt(prob, 5)}$$\n\nThe probability is **${fmt(prob, 3)}** — about ${fmtPct(prob, 1)}, or roughly one pair of groups in every ${fmtInt(Math.round(1 / prob))}.\n\n${prob > 0.05 ? `That is well inside the noise. Two groups flying an identical Lane throw up a gap of ${fmt(gap, 2)} d routinely, and a gap that size is no evidence of anything at all.` : `That is out in the tail: identical groups produce a gap this large only about ${fmtInt(Math.round(prob * 1000))} times in a thousand. Note what has and has not been said — this is how often ordinary luck reaches ${fmt(gap, 2)} d, not a verdict on any real pair of groups.`}`,
      misconception: `Centring the difference on $\\sigma$, or on one group's mean, instead of on **0**. Under a common mean the two groups estimate the same number, so their difference is centred on nothing. The other reliable slip is standardizing against $\\sigma = ${fmt(sigma, 2)}$ d — the spread of one *transit* — instead of ${fmt(sdDiff, 5)} d, the spread of the *difference of two means*.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — the inverse question: how large a gap in mean delay would be rare
// ---------------------------------------------------------------------------------------------

const RARITIES = [20, 100, 1000] as const

export const gapInMeanDelayThatWouldBeRare = defineGenerator({
  id: 'act-5/gap-in-mean-delay-that-would-be-rare',
  label: 'The gap in mean delay that would be a 1-in-q event',
  ap_topics: ['5.8'],
  skills: ['3'],
  generate(rng) {
    const [g1, g2] = rng.shuffle([...GROUPS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const q = pickContext(rng, RARITIES)
    const shape = pickContext(rng, SIZE_SHAPES)
    const d = retry(
      rng,
      (r) => {
        const { n1, n2 } = drawSizes(r, shape)
        const sigma = drawSigma(r)
        const sdDiff = sdOfDifferenceOfMeans(sigma, n1, sigma, n2)
        return { n1, n2, sigma, sdDiff, gap: normal.isf(1 / q) * sdDiff }
      },
      ({ gap }) => gap >= 0.1,
    )
    const { n1, n2, sigma, sdDiff, gap } = d
    const zStarQ = normal.isf(1 / q)
    return {
      prompt: `Build the yardstick before you measure anything with it.\n\n${DELAY_NOTE} Assume **${g1.name}** and **${g2.name}** fly the Lane with the **same mean delay** and a common population SD $\\sigma = ${fmt(sigma, 2)}$ d. ${cap(g1.name)} log **${fmtInt(n1)} transits** ${window}; ${g2.name} log **${fmtInt(n2)}**, independently.\n\n**How large would a gap in mean delay have to be — ${g1.short} later than ${g2.short} — before it were a 1-in-${fmtInt(q)} event under that common mean?** One-sided; give the gap in **days to two decimal places**.`,
      answer: numericAnswer(gap, 'other', { digits: 2, units: 'd' }),
      hints: [
        'The same distribution as a probability question, read backwards: you are handed an area and asked for the value that cuts it off. Centre first, then spread, then the critical $z$.',
        `Under a common mean the difference is centred on **0** with $\\sigma_{\\bar x_1 - \\bar x_2} = \\sqrt{\\sigma^2/n_1 + \\sigma^2/n_2}$. A 1-in-${fmtInt(q)} event in one direction means an upper-tail area of $1/${fmtInt(q)} = ${fmt(1 / q, 4)}$; find the $z^\\star$ that cuts it off and multiply by the spread.`,
        `$\\sigma_{\\bar x_1 - \\bar x_2} = ${fmt(sdDiff, 5)}$ d and $z^\\star = ${fmt(zStarQ, 4)}$. Multiply, to two decimals.`,
      ],
      solution: `**Centre.** Under a common mean, $\\mu_{\\bar x_1 - \\bar x_2} = 0$.\n\n**Spread.**\n\n$$\\sigma_{\\bar x_1 - \\bar x_2} = \\sqrt{\\frac{${fmt(sigma ** 2, 4)}}{${fmtInt(n1)}} + \\frac{${fmt(sigma ** 2, 4)}}{${fmtInt(n2)}}} = ${fmt(sdDiff, 5)} \\text{ d}$$\n\n**Cutoff.** One tail of area $1/${fmtInt(q)} = ${fmt(1 / q, 4)}$:\n\n$$z^\\star = ${fmt(zStarQ, 4)} \\qquad \\text{gap} = z^\\star \\sigma_{\\bar x_1 - \\bar x_2} = ${fmt(zStarQ, 4)} \\times ${fmt(sdDiff, 5)} = ${fmt(gap, 4)}$$\n\nThe gap would have to reach **${fmt(gap, 2)} d**.\n\nThat is the line, and it was drawn without looking at a single real delay. ${sdDiff > 0.25 ? `Notice how far out it sits: with only ${fmtInt(Math.min(n1, n2))} transits in the smaller group, the difference of means is wide enough that a gap of ${fmt(gap, 2)} d turns up once in ${fmtInt(q)} pairs on luck alone. Small groups make generous yardsticks.` : `With groups this large the difference of means is tight, so the line sits at only ${fmt(gap, 2)} d. Large groups make strict yardsticks.`}`,
      misconception: `Using a two-sided critical value. A 1-in-${fmtInt(q)} event **in one direction** puts the whole area ${fmt(1 / q, 4)} in the upper tail, so $z^\\star = ${fmt(zStarQ, 4)}$, not the two-tailed ${fmt(normal.isf(1 / (2 * q)), 4)}. The other slip is multiplying by $\\sigma = ${fmt(sigma, 2)}$ d instead of by the SD of the *difference of means*, ${fmt(sdDiff, 5)} d — the first answers "how late is one transit", the second "how far apart are two group averages".`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — which expression is the SD of the difference, and when
// ---------------------------------------------------------------------------------------------

type AddMode = 'independent' | 'paired' | 'small-normal'

const ADD_MODES: readonly AddMode[] = ['independent', 'paired', 'small-normal'] as const

const SUBTRACT_WHY = (se1: number, se2: number, wrong: number, right: number) =>
  `Look at what that answer claims. The two means wobble by ${fmt(se1, 4)} d and ${fmt(se2, 4)} d on their own, and subtracting gives ${fmt(wrong, 4)} d — **less than either of them**. A difference of two noisy quantities is noisier than either, never quieter: whichever way the subtraction is written, both lots of wobble go into it. Variances add, and the SD is ${fmt(right, 4)} d.`

const ADD_SDS_WHY = (sum: number, right: number) =>
  `Adding the standard deviations (${fmt(sum, 4)} d) overshoots. The two wobbles are independent, so they partly cancel as often as they compound — which is exactly what squaring, adding and square-rooting captures. $\\sqrt{a^2+b^2}$ is always less than $a+b$, and here it is ${fmt(right, 4)} d.`

const LARGER_WHY = (larger: number, right: number) =>
  `That would be right if the second group's mean were known exactly. It is not — it is a mean of a sample, and it wobbles too. Its variance adds to the first group's, which is why the answer (${fmt(right, 4)} d) is larger than the larger of the two (${fmt(larger, 4)} d), not equal to it.`

export const whyVariancesAdd = defineGenerator({
  id: 'act-5/why-variances-add',
  label: 'Which expression is the SD of the difference?',
  ap_topics: ['5.8'],
  skills: ['1', '4'],
  generate(rng) {
    const [g1, g2] = rng.shuffle([...GROUPS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const mode = pickContext(rng, ADD_MODES)
    const d = retry(
      rng,
      (r) => {
        const shape: SizeShape = mode === 'paired' ? 'fleets' : pickContext(r, SIZE_SHAPES)
        // 'small-normal' needs BOTH groups genuinely under 30, so the normal parent has to do the work.
        const sizes =
          mode === 'small-normal'
            ? (() => {
                const a = retry(
                  r,
                  (rr) => rr.int(8, 28),
                  (n) => !reservedSize(n),
                )
                const b = retry(
                  r,
                  (rr) => rr.int(8, 28),
                  (n) => !reservedSize(n) && n !== a,
                )
                return { n1: a, n2: b }
              })()
            : drawSizes(r, shape)
        // Paired data: the same hulls measured twice, so the two groups are the same size.
        const n1 = mode === 'paired' ? Math.min(sizes.n1, sizes.n2) : sizes.n1
        const n2 = mode === 'paired' ? n1 : sizes.n2
        const s1 = drawSigma(r)
        const s2 = drawSigma(r)
        return { n1, n2, s1, s2, se1: samplingSdMean(s1, n1), se2: samplingSdMean(s2, n2) }
      },
      ({ se1, se2 }) => Math.abs(se1 - se2) >= 0.01,
    )
    const { n1, n2, s1, s2, se1, se2 } = d
    const sdDiff = sdOfDifferenceOfMeans(s1, n1, s2, n2)
    const sum = se1 + se2
    const wrong = Math.abs(se1 - se2)
    const larger = Math.max(se1, se2)
    const normalCond = normalLargeSampleCondition(Math.min(n1, n2))

    const rootOption = (why: string): Candidate => ({
      text: `$\\sqrt{\\sigma_1^2/n_1 + \\sigma_2^2/n_2} = ${fmt(sdDiff, 4)}$ d. ${why}`,
      correct: mode !== 'paired',
      why: mode === 'paired' ? `The arithmetic is the right arithmetic for *independent* groups, and these are not independent: every measurement in the second set is on the same hull as one in the first. Covariance between them is exactly what makes variances stop adding.` : null,
    })

    let framing: string
    let cands: Candidate[]
    if (mode === 'paired') {
      framing = `The Yard re-plotted the Mark-9 waypoint halfway through ${window.replace(/^(?:over|in) /, '')}. The Authority timed **the same ${fmtInt(n1)} hulls** on the old plot and again on the new one, so each hull appears once in each set. Before: SD of delay ${fmt(s1, 2)} d. After: ${fmt(s2, 2)} d.`
      cands = [
        {
          text: `**None of these.** The two sets are measurements on the *same* ${fmtInt(n1)} hulls, so they are not independent samples — this is paired data, and the variances do not add. The object to build a model for is the mean of the ${fmtInt(n1)} **differences**, hull by hull.`,
          correct: true,
          why: null,
        },
        rootOption(`Independent groups, so square, add and square-root.`),
        { text: `$\\sigma_1/\\sqrt{n_1} + \\sigma_2/\\sqrt{n_2} = ${fmt(sum, 4)}$ d. Two sources of spread, so add the spreads.`, correct: false, why: `Even for independent groups this overshoots — and here the groups are not independent at all. The same hull appears in both sets, so the two measurements move together, and no formula that treats them as separate samples is the right one.` },
        { text: `$\\left|\\sigma_1/\\sqrt{n_1} - \\sigma_2/\\sqrt{n_2}\\right| = ${fmt(wrong, 4)}$ d. It is a difference, so subtract the spreads.`, correct: false, why: SUBTRACT_WHY(se1, se2, wrong, sdDiff) },
      ]
    } else if (mode === 'small-normal') {
      framing = `${DELAY_NOTE}\n\n**${cap(g1.name)}** contribute ${fmtInt(n1)} transits ${window} with $\\sigma_1 = ${fmt(s1, 2)}$ d; **${g2.name}** contribute ${fmtInt(n2)} with $\\sigma_2 = ${fmt(s2, 2)}$ d. Different hulls, separate runs — and both groups are under 30 transits.`
      cands = [
        rootOption(`The groups are independent, so the variances add — and although both groups are under 30, the parent distribution of delay is itself normal, so each sample mean is exactly normal and so is the difference.`),
        {
          text: `**None of these.** With $n_1 = ${fmtInt(n1)}$ and $n_2 = ${fmtInt(n2)}$ both below 30, the central limit theorem does not apply, so no normal model for the difference of means is available at all.`,
          correct: false,
          why: `The central limit theorem is the rescue you need when the parent is *not* normal. Here it is: delay is stated to be normally distributed across honest Lane transits, and the mean of a normal population is exactly normal at **any** $n$. ${normalCond.detail} The condition is met by the stated parent, not by the sample size.`,
        },
        { text: `$\\sigma_1/\\sqrt{n_1} + \\sigma_2/\\sqrt{n_2} = ${fmt(sum, 4)}$ d. Two sources of spread, so add the spreads.`, correct: false, why: ADD_SDS_WHY(sum, sdDiff) },
        { text: `$\\left|\\sigma_1/\\sqrt{n_1} - \\sigma_2/\\sqrt{n_2}\\right| = ${fmt(wrong, 4)}$ d. It is a difference, so subtract the spreads.`, correct: false, why: SUBTRACT_WHY(se1, se2, wrong, sdDiff) },
      ]
    } else {
      framing = `${DELAY_NOTE}\n\n**${cap(g1.name)}** contribute ${fmtInt(n1)} transits ${window} with $\\sigma_1 = ${fmt(s1, 2)}$ d; **${g2.name}** contribute ${fmtInt(n2)} with $\\sigma_2 = ${fmt(s2, 2)}$ d. Different hulls on separate runs, so the two groups are independent.`
      cands = [
        rootOption(`Independent groups: square each mean's spread to get a variance, add the variances, take the square root.`),
        { text: `$\\sigma_1/\\sqrt{n_1} + \\sigma_2/\\sqrt{n_2} = ${fmt(sum, 4)}$ d. Two sources of spread, so add the spreads.`, correct: false, why: ADD_SDS_WHY(sum, sdDiff) },
        { text: `$\\left|\\sigma_1/\\sqrt{n_1} - \\sigma_2/\\sqrt{n_2}\\right| = ${fmt(wrong, 4)}$ d. It is a difference, so subtract the spreads.`, correct: false, why: SUBTRACT_WHY(se1, se2, wrong, sdDiff) },
        { text: `$\\max(\\sigma_1/\\sqrt{n_1},\\ \\sigma_2/\\sqrt{n_2}) = ${fmt(larger, 4)}$ d. The noisier group sets the spread of the comparison.`, correct: false, why: LARGER_WHY(larger, sdDiff) },
      ]
    }

    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${framing}\n\n**Which of these is the standard deviation of $\\bar x_1 - \\bar x_2$ — and on what condition?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Before reaching for a formula, settle the condition it rests on. Variances add only for **independent** quantities. Ask first whether these two sets of measurements are on different units or on the same ones — that answer decides whether any of the arithmetic applies.',
        `Then check the shape condition: each group's mean needs either a normal parent or $n \\ge 30$. Here $n_1 = ${fmtInt(n1)}$, $n_2 = ${fmtInt(n2)}$, and the parent distribution of delay ${mode === 'paired' ? 'is not the question' : 'is stated to be normal'}.`,
      ],
      solution: `${options[correct]}\n\n**Independence first.** ${mode === 'paired' ? `The same ${fmtInt(n1)} hulls appear in both sets, so the two measurements on a hull move together — a hull that files slow before files slow after. Variances add only when the two quantities are independent, and these are not. Paired data are handled by collapsing each pair to one difference and modelling the mean of those differences; that is a later act's work.` : `Different hulls on separate runs, so the two sample means are independent and their variances add: $\\sigma_{\\bar x_1 - \\bar x_2} = \\sqrt{\\sigma_1^2/n_1 + \\sigma_2^2/n_2} = ${fmt(sdDiff, 4)}$ d.`}\n\n**Shape second.** ${mode === 'paired' ? `Once the pairs are collapsed there are ${fmtInt(n1)} differences, one per hull, and it is *their* mean that needs a normal parent or ${fmtInt(n1)} \u2265 30 \u2014 not either set on its own.` : `${normalCond.detail} ${smallGroupNote(n1, n2)}`}\n\nAnd keep the sanity check to hand: ${fmt(sdDiff, 4)} d is larger than either ${fmt(se1, 4)} d or ${fmt(se2, 4)} d, and smaller than their sum ${fmt(sum, 4)} d. Any answer outside that window is wrong before you check the arithmetic.`,
      misconception: `"It is a difference, so subtract the spreads." That would make the comparison of two noisy numbers quieter than either of them, which cannot happen. Variances add — always, and for a difference just as much as for a sum. The deeper error is skipping the independence question altogether: on paired data the addition rule does not hold at all, however the arithmetic is written.`,
      notes: `The "paired" seeds are the degenerate case on purpose: the correct answer there is that no independent-samples formula applies. Independence, not arithmetic, is the lesson.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — a probability about a difference in means, in context
// ---------------------------------------------------------------------------------------------

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A probability computed under an assumption never proves anything about whether the assumption holds. It says how often ordinary luck produces a gap like this one — nothing more.',
}

const PROB_SAME_MEAN: ForbiddenPhrase = {
  phrase: /\b(?:probability|chance|likelihood|odds)\b(?:\s+\S+){0,3}\s+that\s+[\w\s]{0,40}?\b(?:have|had|has|share|are|is|were|was)\s+(?:the\s+)?(?:same|equal|identical)\b/,
  label: 'Probability that the means are equal',
  why: 'The common mean is the *assumption* the calculation is made under, not an event with a probability. The number is the probability of a gap like this one IF that assumption holds — the conditional does not run backwards.',
}

const PROB_NULL_TRUE: ForbiddenPhrase = {
  phrase: /\b(?:probability|chance|likelihood|odds)\b[^.;]{0,40}\bnull\b[^.;]{0,25}\b(?:true|correct|right|false|wrong)\b/,
  label: 'Probability that H₀ is true',
  why: 'This is a probability computed under an assumed model, not a probability that the model is right.',
}

const DECIDES: ForbiddenPhrase[] = [
  {
    phrase: 'reject',
    label: 'Makes a test decision',
    why: 'Act V builds the null model; it does not run the test. This item asks what the number means, not what to do about it.',
  },
  {
    phrase: 'not reject',
    label: 'Makes a test decision',
    why: 'Act V builds the null model; it does not run the test. This item asks what the number means, not what to do about it.',
  },
  {
    phrase: 'significant',
    label: 'Declares significance',
    why: 'Significance is a verdict against a stated threshold, and no threshold has been set here. Describe the probability; do not rule with it.',
  },
]

interface DifferenceProbabilityArgs {
  prob: number
  /** The gap in mean delay, in days. */
  gap: number
  /** The two groups, named as the Ledger prints them. */
  groupsText: string
  /** The two sample sizes, spelled out. */
  sizeText: string
}

/**
 * Interpret P(x̄₁ − x̄₂ ≥ d) as a long-run proportion of repeated pairs of samples, under an assumed
 * common mean. Requires the value, the assumption, the long-run framing over pairs of samples of
 * these sizes, the direction and the magnitude in days, and the context. Forbids reversing the
 * conditional and forbids any test decision — Act V does not decide.
 */
function differenceProbabilityInterpretation({ prob, gap, groupsText, sizeText }: DifferenceProbabilityArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: 'Cites the probability',
      phrasings: [numberRegex(prob, 3, 1), new RegExp(`${numberRegex(prob * 100, 1, 1).source}\\s*percent`)],
      polarity: 'any',
      feedback: `State the value: ${fmt(prob, 3)} (about ${fmtPct(prob, 1)}).`,
    },
    {
      label: 'Makes the assumption explicit (a common mean delay)',
      phrasings: ['same mean', 'equal mean', 'common mean', 'one mean', 'same true mean', 'same average delay', 'no difference mean'],
      polarity: 'any',
      feedback: 'Say what is being assumed: *if* the two groups really had the same mean Mark-9 delay…',
    },
    {
      label: 'Long-run framing over repeated pairs of samples of these sizes',
      phrasings: ['in the long run', 'repeat', 'many pair', 'all pair', 'many sample', 'all sample', 'sample this size'],
      polarity: 'any',
      feedback: `A probability about a statistic is a long-run proportion: over many repeated pairs of samples of ${sizeText}, this fraction would come out this way.`,
    },
    {
      label: 'Gives the size of the gap, in days',
      phrasings: [numberRegex(gap, 2, 1), 'day', 'd'],
      minMatches: 2,
      polarity: 'any',
      feedback: `Give the magnitude and its units: a gap of ${fmt(gap, 2)} days in mean delay.`,
    },
    {
      label: 'States the direction (at least as large as the stated gap)',
      phrasings: ['at least as large', 'at least', 'or more', 'greater', 'as extreme', 'that large'],
      polarity: 'any',
      feedback: `The probability covers every gap of ${fmt(gap, 2)} d and beyond, not exactly that gap.`,
    },
    contextGroup('States the context (which groups, and what was measured)', [groupsText, 'delay against the nominal plot on the Hundred-Day Lane'], {
      minMatches: 3,
      feedback: `Say whose numbers these are and what they measure: the mean delay against the nominal plot of ${groupsText}, on the Hundred-Day Lane.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, PROB_SAME_MEAN, PROB_NULL_TRUE, ...DECIDES]
  const exemplar = `If ${groupsText} really had the same mean delay against the nominal plot on the Hundred-Day Lane, then over many repeated pairs of samples of ${sizeText}, about ${fmt(prob, 3)} of those pairs would show a gap in mean delay at least as large as ${fmt(gap, 2)} days.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 20 }
}

export const interpretDifferenceProbability = defineGenerator({
  id: 'act-5/interpret-difference-probability',
  label: 'Say what the probability means, in context',
  ap_topics: ['5.8'],
  skills: ['4'],
  generate(rng) {
    const [g1, g2] = rng.shuffle([...GROUPS]).slice(0, 2)
    const window = pickContext(rng, WINDOWS)
    const shape = pickContext(rng, SIZE_SHAPES)
    const d = retry(
      rng,
      (r) => {
        const { n1, n2 } = drawSizes(r, shape)
        const sigma = drawSigma(r)
        const sdDiff = sdOfDifferenceOfMeans(sigma, n1, sigma, n2)
        const gap = Math.round(r.uniform(1.1, 2.6) * sdDiff * 100) / 100
        return { n1, n2, sigma, sdDiff, gap, prob: normal.sf(gap, 0, sdDiff) }
      },
      ({ gap, prob }) => gap >= 0.06 && prob >= 0.006 && prob <= 0.2,
    )
    const { n1, n2, sigma, sdDiff, gap, prob } = d
    const groupsText = `${g1.name} and ${g2.name}`
    const sizeText = `${fmtInt(n1)} and ${fmtInt(n2)} transits`
    const answer = differenceProbabilityInterpretation({ prob, gap, groupsText, sizeText })
    return {
      prompt: `${DELAY_NOTE}\n\nAssume **${g1.name}** (${fmtInt(n1)} transits ${window}) and **${g2.name}** (${fmtInt(n2)}) fly the Lane with the **same mean delay** and a common $\\sigma = ${fmt(sigma, 2)}$ d, independently. Then $\\bar x_1 - \\bar x_2$ is centred on 0 with standard deviation ${fmt(sdDiff, 4)} d, and\n\n$$P(\\bar x_1 - \\bar x_2 \\ge ${fmt(gap, 2)}) = ${fmt(prob, 4)}$$\n\nFerrier does not want the number. She wants the sentence.\n\n**Interpret ${fmt(prob, 4)} in context**, in one or two sentences. Name the value, say plainly what has been *assumed*, frame it as a long-run proportion over repeated pairs of samples of these sizes, give the direction and the size of the gap **in days**, and name the two groups and what was measured. Act V describes the distribution; it does not decide anything.`,
      answer,
      hints: [
        'Every probability about a statistic is a **conditional** statement and a **long-run** one. The condition is the model you assumed — here, one common mean delay for both groups. The long run is the imaginary stack of repeated pairs of samples of these sizes. Leave either out and it is a number read aloud, not an interpretation.',
        `Assemble it in four pieces: (1) *If* ${g1.short} and ${g2.short} really had the same mean delay…; (2) …then over many repeated pairs of samples of ${sizeText}…; (3) …about ${fmt(prob, 3)} of those pairs…; (4) …would show a gap in mean delay at least as large as ${fmt(gap, 2)} days.`,
        `Two traps. The number is **not** the probability that the two groups really do have the same mean delay — the common mean was assumed in order to compute it. And nothing here rejects anything or calls anything significant; that machinery is a later act's.`,
      ],
      solution: `${answer.exemplar}\n\nThe common wrong turn is to reverse the conditional and read ${fmt(prob, 4)} as "the probability that the two groups have the same mean delay". It runs the other way: the common mean was *assumed* in order to compute the number, and no arithmetic afterwards can turn an assumption into a conclusion about itself.`,
      misconception: `Reversing the conditional ("so the two groups are alike with probability only ${fmtPct(prob, 1)}"), or promoting a description into a verdict ("so the gap is significant"). The probability says how often a gap of ${fmt(gap, 2)} d or more arises from ordinary variation *when the two groups really are alike*. It is the yardstick, not the measurement.`,
    }
  },
})
