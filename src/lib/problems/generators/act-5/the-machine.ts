/**
 * act-5-03 · The Machine — drills. AP 5.3 and 5.7: the mean and standard deviation of the sampling
 * distribution of x̄ (μ and σ/√n); the conditions under which that distribution is approximately
 * normal (normal parent, or n ≥ 30 by the Central Limit Theorem); probabilities about a sample mean;
 * and what the theorem does and does not claim.
 *
 *   act-5/sd-of-xbar              numeric  σ/√n for a patrol of n — and the σ/n trap named
 *   act-5/probability-about-xbar  numeric  P(x̄ ≥ a value) on the sampling distribution
 *   act-5/sigma-over-n-trap       choice   four candidate SDs of x̄; each wrong one names its error
 *   act-5/clt-conditions          choice   normal parent, n ≥ 30, or neither — and why
 *   act-5/what-the-clt-claims     choice   which claim about THIS situation is true (checkpoint q4)
 *   act-5/back-out-n              numeric  the n a patrol needs for the SD of x̄ to reach a target
 *   act-5/what-the-clt-says       interp   what the theorem says and what it does not
 *
 * Act V builds the null model; Act VI runs the test. No drill here computes a P-value for the Lane's
 * observed gap or states a significance conclusion.
 *
 * The Ledger's own seeded figures — SE ≈ 0.626 d for nineteen, z ≈ 4.43, the mark-axis z ≈ 3.56 —
 * belong to the mission beats. Every draw here is another window on the same corridor.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { normal, samplingSdMean } from '@/lib/stats'
import { fmt, fmtInt, fmtP, fmtPct } from '@/lib/stats/format'
import { NINETEEN_N } from '@/instruments/act-5/data'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Machine {
  /** One draw from the parent, as a bare noun: "loss", "hull", "honest transit". */
  unit: string
  /** Plural of the unit. */
  plural: string
  /** The variable being averaged. */
  variable: string
  /** Units of the variable, for prompts and answers ('' when the variable is dimensionless). */
  units: string
  /** The population drawn from. */
  population: string
  /** μ of the parent. */
  mu: number
  /** σ of the parent. */
  sigma: number
  /** One- or two-word shape, for running prose. */
  shapeWord: string
  /** Fuller description of the parent's shape, with emphasis. */
  shape: string
  /** Is the parent close enough to normal that x̄ is normal at any n? */
  normalParent: boolean
  /** Sentence describing the parent for a prompt. */
  note: string
}

/** The Lane's honest Mark-n delay: the near-normal parent every probability drill here runs on. */
function delayMachine(rng: Rng): Machine {
  const mark = pickContext(rng, ['Mark 6', 'Mark 9', 'Mark 11'] as const)
  const mu = Math.round(rng.uniform(-0.35, 0.35) * 100) / 100
  const sigma = Math.round(rng.uniform(2.2, 3.2) * 100) / 100
  return {
    unit: 'honest transit',
    plural: 'honest transits',
    variable: `${mark} delay`,
    units: 'd',
    population: 'honest transits on the Hundred-Day Lane',
    mu,
    sigma,
    shapeWord: 'roughly normal',
    shape: 'roughly normal — symmetric, single-peaked, with no stranded values',
    normalParent: true,
    note: `${mark} delay — actual minus scheduled time to ${mark} against the nominal 3.00-mgee plot — runs **roughly normal** across honest transits on the Hundred-Day Lane, with mean $\\mu = ${fmt(mu, 2)}$ d and standard deviation $\\sigma = ${fmt(sigma, 2)}$ d.`,
  }
}

/** A stretch of the Lane with losses assumed spread evenly along it — flat, and nothing like normal. */
function markMachine(rng: Rng): Machine {
  const a = rng.int(1, 3)
  const b = rng.int(9, 14)
  const mu = (a + b) / 2
  const sigma = (b - a) / Math.sqrt(12)
  return {
    unit: 'loss',
    plural: 'losses',
    variable: 'mark at last contact',
    units: '',
    population: `the losses on the stretch of the Lane between marks ${fmtInt(a)} and ${fmtInt(b)}`,
    mu,
    sigma,
    shapeWord: 'flat and uniform',
    shape: `flat — **uniform** on the marks from ${fmtInt(a)} to ${fmtInt(b)}, with no peak at all`,
    normalParent: false,
    note: `The Board's null for where a hull is lost puts the mark at last contact **uniform** on the stretch from mark ${fmtInt(a)} to mark ${fmtInt(b)}: $\\mu = ${fmt(mu, 2)}$, $\\sigma = ${fmt(sigma, 3)}$.`,
  }
}

/** The strongly right-skewed parent: most silences are quick, a few take most of a watch. */
function silenceMachine(rng: Rng): Machine {
  const mu = Math.round(rng.uniform(2.6, 4.4) * 10) / 10
  const sigma = Math.round(rng.uniform(2.4, 4.0) * 10) / 10
  return {
    unit: 'loss',
    plural: 'losses',
    variable: 'time from last check-in to silence',
    units: 'h',
    population: "the Lane Authority's casualty file",
    mu,
    sigma,
    shapeWord: 'strongly right-skewed',
    shape: 'strongly **right-skewed** — most silences quick, a long tail of slow ones',
    normalParent: false,
    note: `Time from last check-in to silence is **strongly right-skewed** across the Lane's recorded losses: most run short, a few take most of a watch. $\\mu = ${fmt(mu, 1)}$ h, $\\sigma = ${fmt(sigma, 1)}$ h.`,
  }
}

/** Two drive families, two humps, nothing in the middle. */
function plumeMachine(rng: Rng): Machine {
  const mu = Math.round(rng.uniform(0.24, 0.28) * 1000) / 1000
  const sigma = Math.round(rng.uniform(0.03, 0.05) * 1000) / 1000
  return {
    unit: 'hull',
    plural: 'hulls',
    variable: 'plume power',
    units: 'TW',
    population: 'the hulls endorsed for the Hundred-Day Lane',
    mu,
    sigma,
    shapeWord: 'bimodal',
    shape: '**bimodal** — two drive families, two humps, nothing between them',
    normalParent: false,
    note: `Plume power on the Lane is **bimodal**: Tessera-C drives cluster low, Mark 3 drives cluster high, and almost nothing sits between the two humps. Across all endorsed hulls $\\mu = ${fmt(mu, 3)}$ TW and $\\sigma = ${fmt(sigma, 3)}$ TW.`,
  }
}

const NON_NORMAL_MACHINES = [markMachine, silenceMachine, plumeMachine] as const
const ALL_MACHINES = [delayMachine, markMachine, silenceMachine, plumeMachine] as const
/** Parents whose σ is on a scale where a three-decimal SD of x̄ is a sensible thing to ask for. */
const NUMERIC_MACHINES = [delayMachine, markMachine, silenceMachine] as const

/** Patrol sizes the Act works at. 19 is the number of hulls the whole book turns on. */
const SMALL_NS = [8, 12, 14, 19, 22, 25, 28] as const
const LARGE_NS = [32, 36, 40, 48, 55, 60, 75, 90] as const

/** The Act's own seeded figures, reserved for the module text and the mission beats. */
const reservedSe = (se: number): boolean => Math.abs(se - 0.626) < 0.006 || Math.abs(se - 0.57) < 0.006

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

/** Number with units, for running prose. */
const proseU = (x: number, digits: number, units: string): string => (units ? `${fmt(x, digits)} ${units}` : fmt(x, digits))
/** Number with units, for inside `$…$` — the unit is upright text, not an italic variable. */
const mathU = (x: number, digits: number, units: string): string => `${fmt(x, digits)}${units ? `\\,\\text{${units}}` : ''}`
/** Decimals a machine's σ is quoted to. */
const sigmaDigits = (m: Machine): number => (m.units === 'TW' ? 3 : 2)
/** Decimals its SD of x̄ is quoted to. */
const seDigits = (m: Machine): number => (m.units === 'TW' ? 4 : 3)

// ---------------------------------------------------------------------------------------------
// 1. Numeric — the SD of x̄
// ---------------------------------------------------------------------------------------------

export const sdOfXbar = defineGenerator({
  id: 'act-5/sd-of-xbar',
  label: 'SD of the sampling distribution of x̄',
  ap_topics: ['5.7'],
  skills: ['3'],
  generate(rng) {
    const make = pickContext(rng, NUMERIC_MACHINES)
    const d = retry(
      rng,
      (r) => {
        const m = make(r)
        const n = r.int(8, 60)
        return { m, n, se: samplingSdMean(m.sigma, n) }
      },
      ({ se }) => se > 0.1 && !reservedSe(se),
    )
    const { m, n, se } = d
    const u = m.units
    const sd = sigmaDigits(m)
    return {
      prompt: `${m.note}\n\nEbele sets the machine to draw **${fmtInt(n)}** of them at a time from ${m.population} and record the **mean ${m.variable}** of each draw, over and over.\n\nWhat is the standard deviation of that sampling distribution of $\\bar{x}$? Give it to three decimal places${u ? `, in ${u === 'd' ? 'days' : 'hours'}` : ''}.`,
      answer: numericAnswer(se, 'other', { digits: 3, units: u || undefined }),
      hints: [
        'Two numbers describe the sampling distribution of a sample mean: where it sits and how wide it is. You are being asked for the width, and the width is the population standard deviation cut down by the sample size.',
        `$\\sigma_{\\bar x} = \\sigma/\\sqrt{n}$. Note where $n$ goes: **under a square root**, in the denominator. It is not $\\sigma/n$.`,
        `$${fmt(m.sigma, sd)} / \\sqrt{${n}}$, to three decimals.`,
      ],
      solution: `$$\\sigma_{\\bar x} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${fmt(m.sigma, sd)}}{\\sqrt{${n}}} = \\frac{${fmt(m.sigma, sd)}}{${fmt(Math.sqrt(n), 4)}} = ${fmt(se, 5)}$$\n\nThe standard deviation of $\\bar{x}$ is **${proseU(se, 3, u)}**.\n\nCompare that with the spread of a single ${m.unit}: ${proseU(m.sigma, sd, u)}. Averaging ${fmtInt(n)} of them has cut the spread by a factor of $\\sqrt{${n}} = ${fmt(Math.sqrt(n), 2)}$ — not by ${fmtInt(n)}. The mean of a group is a far steadier number than any member of it, and *how much* steadier is the whole of this module.\n\nThe centre, meanwhile, has not moved: the sampling distribution of $\\bar{x}$ is centred on $\\mu = ${mathU(m.mu, sd, u)}$, exactly where the parent is.`,
      misconception: `Dividing by $n$ instead of $\\sqrt{n}$ — that would give ${proseU(m.sigma / n, 4, u)}, far too small, and it would make a patrol of ${fmtInt(n)} look ${fmt(Math.sqrt(n), 1)} times more precise than it is. Root n, Ensign. It's in the log.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — a probability about x̄
// ---------------------------------------------------------------------------------------------

export const probabilityAboutXbar = defineGenerator({
  id: 'act-5/probability-about-xbar',
  label: 'P(x̄ at least this large)',
  ap_topics: ['5.7'],
  skills: ['3'],
  generate(rng) {
    const d = retry(
      rng,
      (r) => {
        const m = delayMachine(r)
        const n = r.int(9, 45)
        const se = samplingSdMean(m.sigma, n)
        const z = r.uniform(0.7, 5.0)
        const value = Math.round((m.mu + z * se) * 100) / 100
        const zActual = (value - m.mu) / se
        return { m, n, se, value, z: zActual, p: normal.sf(value, m.mu, se) }
      },
      ({ se, value, z, p }) => !reservedSe(se) && z > 0.6 && z < 5.2 && p > 0 && Math.abs(value) > 0.05,
    )
    const { m, n, se, value, z, p } = d
    const tiny = p < 0.001
    const pOne = normal.sf(value, m.mu, m.sigma)
    return {
      prompt: `${m.note}\n\nA claims adjuster hands you a group of **${fmtInt(n)}** Lane transits whose mean ${m.variable} is **${fmt(value, 2)} d**.\n\nIf those ${fmtInt(n)} transits were an ordinary random sample of honest Lane traffic, what is the probability that their **mean** ${m.variable} would come out at least that large? Give the probability to four decimal places.`,
      answer: numericAnswer(p, 'pValue'),
      hints: [
        `The question is about a **mean of ${fmtInt(n)}**, not about one transit, so the distribution you need is the sampling distribution of $\\bar{x}$ — not the parent. Write down its centre and its standard deviation first.`,
        `Centre $\\mu = ${fmt(m.mu, 2)}$ d; spread $\\sigma_{\\bar x} = \\sigma/\\sqrt{n} = ${fmt(m.sigma, 2)}/\\sqrt{${n}}$. Then standardize the observed mean against *that* spread, not against $\\sigma$.`,
        `$\\sigma_{\\bar x} = ${fmt(se, 4)}$, so $z = (${fmt(value, 2)} - ${fmt(m.mu, 2)})/${fmt(se, 4)}$. Then take the upper-tail area beyond that $z$.`,
      ],
      solution: `The parent is roughly normal, so the sampling distribution of $\\bar{x}$ is normal at any $n$:\n\n$$\\mu_{\\bar x} = \\mu = ${fmt(m.mu, 2)}, \\qquad \\sigma_{\\bar x} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${fmt(m.sigma, 2)}}{\\sqrt{${n}}} = ${fmt(se, 4)}$$\n\n$$z = \\frac{\\bar{x} - \\mu_{\\bar x}}{\\sigma_{\\bar x}} = \\frac{${fmt(value, 2)} - ${fmt(m.mu, 2)}}{${fmt(se, 4)}} = ${fmt(z, 3)}$$\n\nSo $P(\\bar{x} \\ge ${fmt(value, 2)})$ is **${fmtP(p)}**.\n\nNotice what the $\\sqrt{n}$ did. *One* transit ${fmt(value, 2)} d behind the plot is ordinary — about ${fmtPct(pOne, 0)} of honest transits manage it. A *mean* of ${fmtInt(n)} transits that far behind is ${tiny ? 'something this model essentially never produces' : `roughly a 1-in-${fmt(1 / Math.max(p, 1e-12), 0)} event`}, because the spread the mean has to travel is ${fmt(m.sigma / se, 1)} times smaller.\n\nThat is the whole argument of Act V, and it is also its limit: this is a **probability under a null model**, not a test and not a verdict. What to do with it is Act VI's problem.`,
      misconception: `Standardizing against $\\sigma = ${fmt(m.sigma, 2)}$ instead of $\\sigma_{\\bar x} = ${fmt(se, 4)}$. That answers a different question — "how unusual is one transit this late?" — and here it would give ${fmt(pOne, 4)} instead.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — the σ/n trap
// ---------------------------------------------------------------------------------------------

export const sigmaOverNTrap = defineGenerator({
  id: 'act-5/sigma-over-n-trap',
  label: 'Which of these is the SD of x̄?',
  ap_topics: ['5.7'],
  skills: ['1', '3'],
  generate(rng) {
    const make = pickContext(rng, NUMERIC_MACHINES)
    const d = retry(
      rng,
      (r) => {
        const m = make(r)
        const n = r.int(9, 60)
        return { m, n, se: samplingSdMean(m.sigma, n) }
      },
      ({ m, n, se }) => !reservedSe(se) && se > 0.1 && Math.abs(m.sigma / n - se) > 0.01,
    )
    const { m, n, se } = d
    const u = m.units
    const sd = sigmaDigits(m)
    const dg = seDigits(m)
    const cands: Candidate[] = [
      {
        text: `$\\sigma_{\\bar x} = \\dfrac{\\sigma}{\\sqrt{n}} = \\dfrac{${fmt(m.sigma, sd)}}{\\sqrt{${n}}} = ${mathU(se, dg, u)}$`,
        correct: true,
        why: null,
      },
      {
        text: `$\\sigma_{\\bar x} = \\dfrac{\\sigma}{n} = \\dfrac{${fmt(m.sigma, sd)}}{${n}} = ${mathU(m.sigma / n, dg + 1, u)}$`,
        correct: false,
        why: `Root n, Ensign. It's in the log. Dividing by $n$ rather than $\\sqrt{n}$ shrinks the spread of $\\bar{x}$ by a factor of $\\sqrt{${n}} = ${fmt(Math.sqrt(n), 2)}$ too much — it would make a sample of ${fmtInt(n)} as precise as a sample of ${fmtInt(n * n)}, which is the arithmetic of wishful thinking.`,
      },
      {
        text: `$\\sigma_{\\bar x} = \\sigma = ${mathU(m.sigma, sd, u)}$ — averaging does not change the spread, it only changes which number you are looking at.`,
        correct: false,
        why: `Averaging is exactly what changes the spread. Extreme ${m.plural} in a draw of ${fmtInt(n)} cancel one another, so means scatter less than individuals do. If they did not, no sample size would ever buy precision.`,
      },
      {
        text: `$\\sigma_{\\bar x} = \\sigma\\sqrt{n} = ${fmt(m.sigma, sd)} \\times \\sqrt{${n}} = ${mathU(m.sigma * Math.sqrt(n), dg, u)}$`,
        correct: false,
        why: `That is the standard deviation of the **sum** of ${fmtInt(n)} draws, not of their mean. The sum does grow like $\\sigma\\sqrt{n}$; dividing that sum by ${fmtInt(n)} to get the mean divides its spread by ${fmtInt(n)} as well, leaving $\\sigma\\sqrt{n}/n = \\sigma/\\sqrt{n}$.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${m.note}\n\nThe machine draws **${fmtInt(n)}** ${m.plural} at a time and records the mean ${m.variable}.\n\nFour candidate values for the standard deviation of the sampling distribution of $\\bar{x}$ are on the display. Which one is right?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Check each candidate against a sanity test before you check the algebra: the mean of several draws must scatter **less** than a single draw, but not by an absurd amount. That kills two of the four immediately.',
        `Then recall where $n$ sits. The *variance* of $\\bar{x}$ is $\\sigma^2/n$, so the standard deviation is the square root of that: $\\sigma/\\sqrt{n}$. With $\\sigma = ${fmt(m.sigma, sd)}$ and $n = ${fmtInt(n)}$, work out which candidate that is.`,
      ],
      solution: `$$\\operatorname{Var}(\\bar{x}) = \\frac{\\sigma^2}{n} = \\frac{${fmt(m.sigma ** 2, 4)}}{${n}} = ${fmt(se ** 2, 6)} \\qquad\\Longrightarrow\\qquad \\sigma_{\\bar x} = \\sqrt{${fmt(se ** 2, 6)}} = ${fmt(se, dg + 1)}$$\n\nThe standard deviation of $\\bar{x}$ is **${proseU(se, dg, u)}**.\n\nThe root comes from the variance, and it is the reason precision is expensive. Four times the draws halve the spread of $\\bar{x}$; a hundred times the draws divide it by ten. A patrol that wants twice the resolution must fly four times the transits, and that is a fact about ships and watches, not about arithmetic.`,
      misconception: `$\\sigma/n$. It is the single most common error in Unit 5, it always makes the sampling distribution look too tight, and it makes every probability about $\\bar{x}$ come out far too extreme.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — are the conditions met?
// ---------------------------------------------------------------------------------------------

type Verdict = 'normal-parent' | 'clt' | 'not-safe'

export const cltConditions = defineGenerator({
  id: 'act-5/clt-conditions',
  label: 'Is the sampling distribution of x̄ approximately normal?',
  ap_topics: ['5.3'],
  skills: ['1', '4'],
  generate(rng) {
    // Three cases in rotation: a normal parent at any n, a non-normal parent at n ≥ 30, and the case
    // the Act actually runs at — a non-normal parent at n well below 30, where the honest answer is no.
    const verdict = pickContext(rng, ['normal-parent', 'clt', 'not-safe'] as Verdict[])
    const make = verdict === 'normal-parent' ? delayMachine : pickContext(rng, NON_NORMAL_MACHINES)
    const m = make(rng)
    const n = verdict === 'clt' ? pickContext(rng, LARGE_NS) : verdict === 'not-safe' ? pickContext(rng, SMALL_NS) : pickContext(rng, [...SMALL_NS, ...LARGE_NS])
    const se = samplingSdMean(m.sigma, n)
    const cands: Candidate[] = [
      {
        text: `**Yes** — the parent population is itself roughly normal, so the sampling distribution of $\\bar{x}$ is approximately normal at *every* sample size, this one included.`,
        correct: verdict === 'normal-parent',
        why: verdict === 'normal-parent' ? null : `The parent here is ${m.shapeWord} — not normal. That route to the condition is closed, so the only question left is whether $n$ is large enough for the Central Limit Theorem.`,
      },
      {
        text: `**Yes** — the parent population is not normal, but the sample is large enough (at least 30) for the Central Limit Theorem to make the sampling distribution of $\\bar{x}$ approximately normal anyway.`,
        correct: verdict === 'clt',
        why:
          verdict === 'clt'
            ? null
            : verdict === 'normal-parent'
              ? `The conclusion is right but the reason is wrong, and the reason is what is being asked for. This parent *is* roughly normal, so $\\bar{x}$ would be normal even at $n = 5$; the Central Limit Theorem is not needed.`
              : `Check the number. $n = ${fmtInt(n)}$, which is below 30, so this route is not open either.`,
      },
      {
        text: `**Not safely** — the parent population is not normal and the sample is smaller than 30, so neither condition for approximate normality is met. The mean and SD of $\\bar{x}$ are still $\\mu$ and $\\sigma/\\sqrt{n}$; it is the *shape* that cannot be assumed.`,
        correct: verdict === 'not-safe',
        why:
          verdict === 'not-safe'
            ? null
            : verdict === 'normal-parent'
              ? `The parent is roughly normal here, and a normal parent gives a normal $\\bar{x}$ at any $n$ whatsoever. No minimum sample size is required when the population itself is normal.`
              : `$n = ${fmtInt(n)}$ is at least 30, so the Central Limit Theorem does the work even with this parent.`,
      },
      {
        text: `**Yes** — the Central Limit Theorem makes the sampling distribution of $\\bar{x}$ normal at any sample size, whatever the parent population looks like.`,
        correct: false,
        why: `The Central Limit Theorem is a statement about what happens **as $n$ grows**. At small $n$ a skewed or bimodal parent hands on its shape to $\\bar{x}$, which is exactly why the condition has a threshold in it at all. A theorem with no condition attached would make the condition pointless.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    return {
      prompt: `${m.note}\n\nThe machine draws **${fmtInt(n)}** ${m.plural} at a time from ${m.population} and records the mean ${m.variable}.\n\nIs the sampling distribution of $\\bar{x}$ approximately **normal** here — and on what grounds?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'There are exactly two ways the shape condition can be met, and you check them in this order: **is the parent population itself approximately normal?** If not, **is $n$ at least 30?** If neither, the shape cannot be assumed.',
        `The parent here is ${m.shapeWord}, and $n = ${fmtInt(n)}$. Take the two checks in turn, and make sure the reason you give is the one that actually applies.`,
      ],
      solution: `Parent shape: ${m.shape}. Sample size: $n = ${fmtInt(n)}$.\n\n${options[correct]}\n\nWhichever way the answer goes, two things are true and are worth saying out loud: the sampling distribution of $\\bar{x}$ is centred on $\\mu = ${mathU(m.mu, sigmaDigits(m), m.units)}$ and has standard deviation $\\sigma/\\sqrt{n} = ${mathU(se, seDigits(m), m.units)}$ **whatever the parent's shape**. The mean and the spread never needed a condition. Only the *shape* does, and only the shape is what "approximately normal" is about.\n\n${verdict === 'not-safe' ? `This is the case the Act actually runs at. When the parent is not normal and the group is small, a normal-model probability about $\\bar{x}$ is not defensible, and a hostile reviewer will say so first. Either check the parent's shape on a plot — which is what act-5-02 was for — or do not quote the probability.` : `Having a route to the condition is not the same as having checked it. Name the route in the brief: "normal parent" or "$n \\ge 30$", with the number.`}`,
      misconception: 'Treating "n ≥ 30" as a rule about data rather than about x̄, and applying it to a small sample because "30 is the magic number". The condition is about the sampling distribution of the mean, and it has a second, better route: a normal parent, at any n at all.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — which claim about THIS situation is true? (checkpoint q4)
// ---------------------------------------------------------------------------------------------

export const whatTheCltClaims = defineGenerator({
  id: 'act-5/what-the-clt-claims',
  label: 'Which claim about the sampling distribution is true?',
  ap_topics: ['5.3'],
  skills: ['1', '4'],
  generate(rng) {
    const verdict = pickContext(rng, ['normal-parent', 'clt', 'not-safe'] as Verdict[])
    const make = verdict === 'normal-parent' ? delayMachine : pickContext(rng, NON_NORMAL_MACHINES)
    const m = make(rng)
    const n = verdict === 'clt' ? pickContext(rng, LARGE_NS) : verdict === 'not-safe' ? pickContext(rng, SMALL_NS) : pickContext(rng, [...SMALL_NS, ...LARGE_NS])
    const se = samplingSdMean(m.sigma, n)
    const sd = sigmaDigits(m)
    const dg = seDigits(m)
    const muStr = mathU(m.mu, sd, m.units)
    const seStr = mathU(se, dg, m.units)
    const truth: Candidate = {
      text:
        verdict === 'normal-parent'
          ? `The sampling distribution of $\\bar{x}$ is centred on $\\mu = ${muStr}$ with standard deviation $\\sigma/\\sqrt{n} = ${seStr}$, and it is approximately *normal* at this $n$ because the parent population is itself roughly normal.`
          : verdict === 'clt'
            ? `The sampling distribution of $\\bar{x}$ is centred on $\\mu = ${muStr}$ with standard deviation $\\sigma/\\sqrt{n} = ${seStr}$, and with $n = ${fmtInt(n)} \\ge 30$ the Central Limit Theorem makes it approximately *normal* even though the parent is not.`
            : `The sampling distribution of $\\bar{x}$ is centred on $\\mu = ${muStr}$ with standard deviation $\\sigma/\\sqrt{n} = ${seStr}$ — but with this parent and $n = ${fmtInt(n)}$, it is *not* safe to treat its shape as approximately normal.`,
      correct: true,
      why: null,
    }
    const pool: Candidate[] = [
      {
        text: `With a sample as large as $n = ${fmtInt(n)}$, the *population* of individual ${m.plural} is itself approximately normal.`,
        correct: false,
        why: `The Central Limit Theorem never touches the population. ${m.population.charAt(0).toUpperCase() + m.population.slice(1)} have the distribution they have — ${m.shapeWord} — and drawing samples from them does not reshape them. The theorem is about the distribution of $\\bar{x}$.`,
      },
      {
        text: `Any data set of 30 or more values is approximately normal, so a long enough run of ${m.plural} would be normal too.`,
        correct: false,
        why: `A data set is not made normal by being large. Collect ten thousand ${m.plural} and their histogram is still ${m.shapeWord} — only sharper. The "$n \\ge 30$" condition is about the sampling distribution of $\\bar{x}$, not about the data.`,
      },
      {
        text: `The standard deviation of $\\bar{x}$ is $\\sigma/n = ${mathU(m.sigma / n, dg + 1, m.units)}$.`,
        correct: false,
        why: `Root n, Ensign. It's in the log. $\\operatorname{Var}(\\bar{x}) = \\sigma^2/n$, so the standard deviation is $\\sigma/\\sqrt{n} = ${mathU(se, dg, m.units)}$ — not $\\sigma/n$, which is smaller by a factor of $\\sqrt{${n}} = ${fmt(Math.sqrt(n), 2)}$.`,
      },
      {
        text: `The sampling distribution of $\\bar{x}$ is centred on whichever sample mean you happen to draw, and has standard deviation $\\sigma = ${mathU(m.sigma, sd, m.units)}$.`,
        correct: false,
        why: `Both halves are wrong. The sampling distribution is centred on the **population** mean $\\mu = ${mathU(m.mu, sd, m.units)}$ — that is what makes $\\bar{x}$ an unbiased estimator — and its spread is $\\sigma/\\sqrt{n} = ${mathU(se, dg, m.units)}$, narrower than the parent's $\\sigma$ because averaging cancels extremes.`,
      },
      {
        text: `The Central Limit Theorem guarantees that $\\bar{x}$ is normal at **every** sample size, whatever the parent population looks like.`,
        correct: false,
        why: `It is a statement about a limit — about what happens *as $n$ grows*. At $n = 2$ from a strongly skewed parent, $\\bar{x}$ is still visibly skewed. That is precisely why the condition carries a threshold, and why a normal parent is the better route when you can get it.`,
      },
    ]
    const distractors = rng.shuffle(pool).slice(0, 3)
    const { options, correct, feedback } = shuffleChoice(rng, [truth, ...distractors])
    return {
      prompt: `${m.note}\n\nThe machine draws **${fmtInt(n)}** ${m.plural} at a time from ${m.population} and records the mean ${m.variable}. Ebele is about to write the sampling distribution into the brief.\n\nWhich of these statements about **this** situation is true?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Every true statement about a sampling distribution of $\\bar{x}$ has to get three separate things right: **what** it is a distribution of, **where** it is centred, and **how wide** it is. A fourth question — its shape — is the only one that needs a condition.',
        `Here $\\mu = ${mathU(m.mu, sd, m.units)}$, $\\sigma = ${mathU(m.sigma, sd, m.units)}$ and $n = ${fmtInt(n)}$, so the centre is $\\mu$ and the spread is $\\sigma/\\sqrt{n}$. Then check the shape claim: is the parent roughly normal, or is $n$ at least 30?`,
      ],
      solution: `$$\\mu_{\\bar x} = \\mu = ${fmt(m.mu, sd)}, \\qquad \\sigma_{\\bar x} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${fmt(m.sigma, sd)}}{\\sqrt{${n}}} = ${fmt(se, dg + 1)}$$\n\n${options[correct]}\n\nThe centre and the spread hold whatever the parent's shape is — they are algebra, not approximation. The shape is the only claim that needs a licence, and there are exactly two licences: a parent that is already roughly normal, or $n \\ge 30$.\n\n${verdict === 'not-safe' ? `Here neither licence is available, and that is the honest answer. Act V's own argument runs at ${fmtInt(NINETEEN_N)} hulls; it survives only because act-5-02 checked the parent's shape on a plot first — not because ${fmtInt(NINETEEN_N)} is close enough to 30.` : `And none of that makes the population normal. The individual ${m.plural} keep the distribution they always had.`}`,
      misconception: 'Letting the CLT leak onto the population, or onto the data set, or onto a single transit. It describes one object only: the distribution of x̄ over repeated samples of size n.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Numeric — back out the n a target precision needs
// ---------------------------------------------------------------------------------------------

export const backOutN = defineGenerator({
  id: 'act-5/back-out-n',
  label: 'How many transits for that precision?',
  ap_topics: ['5.7'],
  skills: ['1', '3'],
  generate(rng) {
    const d = retry(
      rng,
      (r) => {
        const m = delayMachine(r)
        const target = Math.round(r.uniform(0.24, 0.52) * 100) / 100
        const exact = (m.sigma / target) ** 2
        const n = Math.ceil(exact)
        return { m, target, exact, n, se: samplingSdMean(m.sigma, n) }
      },
      ({ exact, n, se, target }) =>
        n >= 22 &&
        n <= 180 &&
        // ceil must be unambiguous: never land within a hair of a whole number
        Math.abs(exact - Math.round(exact)) > 0.06 &&
        se <= target &&
        !reservedSe(se) &&
        n !== NINETEEN_N &&
        n !== 31,
    )
    const { m, target, exact, n, se } = d
    const seShort = samplingSdMean(m.sigma, n - 1)
    const wrongN = Math.ceil(m.sigma / target)
    return {
      prompt: `${m.note}\n\nFerrier wants a patrol that can pin down the mean ${m.variable} of honest Lane traffic more tightly than the last one managed. Specifically: **the sampling distribution of $\\bar{x}$ must have a standard deviation of at most ${fmt(target, 2)} d.**\n\nHow many transits must the patrol observe? Give a whole number of transits.`,
      answer: numericAnswer(n, 'count'),
      hints: [
        'Write down the thing you are being asked to control — the standard deviation of $\\bar{x}$ — as a formula, set it against the target, and then solve for $n$ rather than guessing at it.',
        `$\\sigma/\\sqrt{n} \\le ${fmt(target, 2)}$. Rearrange: $\\sqrt{n} \\ge \\sigma/${fmt(target, 2)}$, so $n \\ge (\\sigma/${fmt(target, 2)})^2$. Then think about which way to round — a fractional transit does not exist, and rounding the wrong way misses the target.`,
        `$n \\ge (${fmt(m.sigma, 2)}/${fmt(target, 2)})^2 = ${fmt(exact, 2)}$. Now round to a whole number of transits, the way that *keeps* the standard deviation at or below the target.`,
      ],
      solution: `$$\\frac{\\sigma}{\\sqrt{n}} \\le ${fmt(target, 2)} \\quad\\Longleftrightarrow\\quad \\sqrt{n} \\ge \\frac{${fmt(m.sigma, 2)}}{${fmt(target, 2)}} \\quad\\Longleftrightarrow\\quad n \\ge \\left(\\frac{${fmt(m.sigma, 2)}}{${fmt(target, 2)}}\\right)^{2} = ${fmt(exact, 3)}$$\n\nTransits come whole, and rounding *down* would leave the spread above the target, so round up: the patrol needs **${fmtInt(n)} transits**.\n\nCheck both sides of the boundary. At ${fmtInt(n)} transits, $\\sigma_{\\bar x} = ${fmt(m.sigma, 2)}/\\sqrt{${n}} = ${fmt(se, 4)}$ d — at or inside the ${fmt(target, 2)} d target. At ${fmtInt(n - 1)}, it is ${fmt(seShort, 4)} d, which misses.\n\nAnd note the price. Halving the target — ${fmt(target, 2)} d down to ${fmt(target / 2, 3)} d — would need ${fmtInt(Math.ceil((m.sigma / (target / 2)) ** 2))} transits, four times as many, because $n$ enters through a square root. Precision on the Lane is bought in watches, and the fourth watch buys half as much as the first.`,
      misconception: `Rounding $${fmt(exact, 2)}$ down to ${fmtInt(Math.floor(exact))}, or solving $\\sigma/n \\le ${fmt(target, 2)}$ and reporting ${fmtInt(wrongN)} — a patrol that size would have a standard deviation of ${fmt(samplingSdMean(m.sigma, wrongN), 3)} d, nowhere near the target.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 7. Interpretation — what the CLT says and does not say (the Act's rubric item)
// ---------------------------------------------------------------------------------------------

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'The Central Limit Theorem licenses a model for the sampling distribution of x̄. It proves nothing about any population or any hull.',
}

const SIGMA_OVER_ROOT_N = /\bsigma\s*(?:\/|divided by|over)\s*(?:the\s*)?(?:√|sqrt|square root|root)\s*(?:of\s*)?n\b/

interface CltArgs {
  /** The population the machine is drawing from. */
  population: string
  /** The variable being averaged. */
  variable: string
}

/**
 * What the Central Limit Theorem says (about x̄, centred at μ, spread σ/√n, approaching normal as n
 * grows) and what it does not (anything at all about the population, the data set, or one transit).
 * Forbids the four standard leaks: CLT-normalises-the-population, n ≥ 30 makes data normal, the
 * individual values become normal, and σ/n.
 */
function cltRubric({ population, variable }: CltArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: 'Says it is about the sampling distribution of x̄',
      phrasings: ['distribution xbar', 'sample distribution xbar', 'xbar', 'sample mean', 'distribution sample mean'],
      polarity: 'any',
      feedback: 'Name the object: the theorem is about the sampling distribution of the sample mean x̄, over repeated samples of size n.',
    },
    {
      label: 'Says it is NOT about the population or about one individual',
      phrasings: ['not population', 'not one transit', 'not individual', 'not data', 'not parent', 'not one unit', 'not the shape of the population'],
      feedback: 'Say what it is not about: not the population of individual values, and not any single unit.',
    },
    {
      label: 'Says the distribution of x̄ becomes approximately normal',
      phrasings: ['distribution normal', 'xbar normal', 'become normal', 'approximately normal', 'normal whatever', 'normal shape'],
      polarity: 'any',
      feedback: 'Say what happens: as n grows, the sampling distribution of x̄ becomes approximately normal.',
    },
    {
      label: 'Says this holds whatever the shape of the parent population',
      phrasings: ['whatever shape', 'any shape', 'regardless shape', 'whatever parent', 'whatever population', 'even skew', 'not matter shape', 'however parent'],
      polarity: 'any',
      feedback: 'Add the striking part: it happens whatever the shape of the parent population — skewed, flat or bimodal.',
    },
    {
      label: 'Says the centre stays at μ',
      phrasings: ['centre mu', 'center mu', 'centre population mean', 'center population mean', 'mean mu', 'centre mean', 'center mean'],
      polarity: 'any',
      feedback: 'State the centre: the sampling distribution of x̄ is centred on the population mean μ, at every n.',
    },
    {
      label: 'Says the spread is σ/√n',
      phrasings: [SIGMA_OVER_ROOT_N, 'sigma square root n', 'square root n', 'sd sigma root n'],
      polarity: 'any',
      feedback: 'State the spread: σ/√n — sigma divided by the square root of n, which shrinks as n grows. Not σ/n.',
    },
    contextGroup('States the context (the population and the variable)', [population, variable], {
      minMatches: 1,
      feedback: `Anchor it: ${variable} for ${population}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: /\b(?:makes?|made|turns?|forces?|renders?)\s+(?:the\s+)?(?:population|data|parent|individual\w*|transits?|losses|values?)\s+(?:approximately\s+)?normal\b/,
      label: 'CLT normalises the population',
      why: 'The theorem never touches the population. Whatever shape the individual values had, they keep — the theorem is about the distribution of x̄.',
    },
    {
      phrase: /\b(?:population|parent|data|individual\s+\w+|transits|losses|values)\s+(?:become|becomes|becoming|get|gets|are|is|will be)\s+(?:approximately\s+)?normal\b/,
      label: 'The individual values become normal',
      why: 'Individual values do not change distribution because you sampled them. Only the distribution of the sample MEAN approaches normal.',
    },
    {
      phrase: /\b(?:30|thirty)\b[^.;:]{0,50}\b(?:any|all|every|anything|everything)\b[^.;:]{0,30}\bnormal\b/,
      label: '“n ≥ 30 makes any data normal”',
      why: 'The n ≥ 30 condition is about the sampling distribution of x̄, not about the data set. A large sample from a skewed population is still a skewed sample.',
    },
    { phrase: /\bsigma\s*\/\s*n\b/, label: 'σ/n instead of σ/√n', why: "Root n, Ensign. It's in the log. Var(x̄) = σ²/n, so the standard deviation is σ/√n." },
    { phrase: /\bsigma\s+(?:over|divided by)\s+n\b/, label: 'σ/n instead of σ/√n', why: "Root n, Ensign. It's in the log. Var(x̄) = σ²/n, so the standard deviation is σ/√n." },
    PROVES,
  ]
  const exemplar = `The Central Limit Theorem is a statement about the sampling distribution of the sample mean x-bar over repeated samples of ${variable} — not about one unit and not about the population of ${population}. It says that as the sample size n grows, the distribution of x-bar becomes approximately normal whatever the shape of the parent population. Its centre stays at the population mean mu, and its standard deviation is sigma divided by the square root of n, which shrinks as n grows. It says nothing at all about the shape of the individual values themselves.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 45, passScore: 0.85 }
}

export const whatTheCltSays = defineGenerator({
  id: 'act-5/what-the-clt-says',
  label: 'What the Central Limit Theorem does and does not say',
  ap_topics: ['5.3'],
  skills: ['1', '4'],
  generate(rng) {
    const make = pickContext(rng, ALL_MACHINES)
    const m = make(rng)
    const n = pickContext(rng, [...SMALL_NS, ...LARGE_NS])
    const se = samplingSdMean(m.sigma, n)
    const sd = sigmaDigits(m)
    const dg = seDigits(m)
    const answer = cltRubric({ population: m.population, variable: m.variable })
    return {
      prompt: `${m.note}\n\nEbele has the machine running: **${fmtInt(n)}** ${m.plural} a draw from ${m.population}, the mean ${m.variable} recorded each time, the stack building on the display. Oyelaran, watching it form, says she had always thought "normal" was a property of things rather than of averages.\n\nIn three or four sentences, tell her **what the Central Limit Theorem says and what it does not say** — what object it is about, where that object is centred, how wide it is, what happens to its shape as $n$ grows, and what the theorem leaves completely untouched. Write it about this machine.`,
      answer,
      hints: [
        'Start by naming the object. There are three distributions in the room — the population, the one sample on the display, and the stack of means — and the theorem is about exactly one of them. Say which.',
        `Then give that object its three numbers and its one condition: the centre ($\\mu = ${fmt(m.mu, sd)}$), the spread ($\\sigma/\\sqrt{n} = ${fmt(se, dg)}$), the shape (approaching normal as $n$ grows), and the clause that makes the theorem remarkable — *whatever the parent looks like*.`,
        `Finish with the negative half, because it is the half that gets people into trouble: say plainly what the theorem does **not** do to ${m.population} or to any single ${m.unit}.`,
      ],
      solution: `$$\\mu_{\\bar x} = \\mu = ${fmt(m.mu, sd)}, \\qquad \\sigma_{\\bar x} = \\frac{\\sigma}{\\sqrt{n}} = \\frac{${fmt(m.sigma, sd)}}{\\sqrt{${n}}} = ${fmt(se, dg + 1)}$$\n\n**${answer.exemplar}**\n\nThe mistake to guard against is the one that sounds most like the theorem: *"with $n$ this big, the data are normal."* They are not, and no sample size makes them so. ${m.normalParent ? `This parent happens to be roughly normal already, which is a fact about ${m.population} and about drives and filing habits — nothing the theorem did.` : `This parent is ${m.shapeWord}, and it stays ${m.shapeWord} at every sample size; what becomes normal is the *stack of means* on the display.`}\n\nThe second mistake is $\\sigma/n$, which would put the spread at ${fmt(m.sigma / n, dg + 1)} instead of ${fmt(se, dg + 1)} and make every probability about $\\bar{x}$ far too extreme. Root n. It is in the log.`,
      misconception: 'Applying the theorem to the population, to the data set or to one transit. It describes a single object — the distribution of x̄ over repeated samples of size n — and it leaves everything else exactly as it found it.',
    }
  },
})
