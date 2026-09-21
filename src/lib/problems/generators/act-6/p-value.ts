/**
 * act-6-04 · At Least as Extreme — drills. AP 6.5: the p-value as the probability, computed under
 * H₀, of a statistic at least as extreme as the one observed; from the normal model and from a
 * simulated null distribution; and the four sentences it is not.
 *
 *   act-6/p-from-z            numeric   p from a standardized statistic, sidedness stated
 *   act-6/interpret-p-value   interp    the sentence, in context (rubric below)
 *   act-6/simulated-p         numeric   p counted off a simulated null distribution
 *   act-6/forbidden-sentence  choice    four readings of one p; exactly one is defensible
 *   act-6/one-vs-two-tails    numeric   the same z read one-sided and two-sided
 *   act-6/p-value-shading     display   a shaded normal curve → which Hₐ, and which p
 *
 * `interpretPValueRubric` is exported because act-6-04's mission beat grades the learner's own
 * sentence with exactly the rubric these drills use. The Lane's own 19/900 against 12/1,712 — and
 * its z ≈ 3.16 and p ≈ 0.0008 — belong to the mission beats and never appear here.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, numericAnswer, pickContext, retry, tableSpec } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { normal, onePropTest, pValueZ, seProportion, type Alternative } from '@/lib/stats'
import { fmt, fmtInt, fmtP } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared in-world framing
// ---------------------------------------------------------------------------------------------

interface Case {
  /** "the Adrastea feeder lane" */
  lane: string
  office: string
  /** What is counted, plural: "off-nominal advisories". */
  event: string
  /** The proportion in words: "proportion of transits that log an off-nominal advisory". */
  parameter: string
  /** The units the count is out of: "transits". */
  unit: string
  /** Plausible band for the posted figure. */
  p0Range: [number, number]
}

const CASES: readonly Case[] = [
  {
    lane: 'the Adrastea feeder lane',
    office: 'the Adrastea Lane Office',
    event: 'off-nominal advisories',
    parameter: 'proportion of transits that log an off-nominal advisory',
    unit: 'transits',
    p0Range: [0.09, 0.2],
  },
  {
    lane: 'the Thebe–Amalthea shuttle run',
    office: 'the Thebe Yard traffic office',
    event: 'late check-ins',
    parameter: 'proportion of transits that check in late',
    unit: 'transits',
    p0Range: [0.1, 0.22],
  },
  {
    lane: 'the Elara transfer corridor',
    office: 'the Elara Station berth office',
    event: 'transponder dropouts',
    parameter: 'proportion of transits with a transponder dropout',
    unit: 'transits',
    p0Range: [0.07, 0.17],
  },
  {
    lane: 'the Carme outer loop',
    office: 'the Carme relay office',
    event: 'scrubber-cartridge faults',
    parameter: 'proportion of transits on which a scrubber cartridge faults',
    unit: 'transits',
    p0Range: [0.08, 0.19],
  },
  {
    lane: 'the Themis Reach',
    office: 'the Themis Reach survey office',
    event: 'berth refusals',
    parameter: 'proportion of arrivals refused a berth on the day',
    unit: 'arrivals',
    p0Range: [0.11, 0.24],
  },
] as const

const RESERVED_COUNTS = new Set([19, 31, 900, 1712, 2612, 2580])
const reservedCount = (n: number): boolean => RESERVED_COUNTS.has(Math.round(n))
/** The Lane's own statistic and p-value. A drill that reproduces either has leaked a mission beat. */
const reservedStat = (z: number): boolean => Math.abs(z - 3.163) < 0.04
const reservedP = (p: number): boolean => Math.abs(p - 0.00078) < 0.00012

/** Prompts open with an office name, which is lower-case in the corridor table. */
const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

const ALT_SYMBOL: Record<Alternative, string> = { greater: '>', less: '<', 'two-sided': '\\ne' }
const ALT_WORD: Record<Alternative, string> = { greater: 'one-sided, upper tail', less: 'one-sided, lower tail', 'two-sided': 'two-sided' }

/** "about 1 in 250" — the reading of a small probability that a bridge crew actually uses. */
function oneIn(p: number): string {
  if (!(p > 0)) return 'never, to the accuracy of this model'
  const n = 1 / p
  if (n >= 1000) return `about 1 in ${fmtInt(Math.round(n / 100) * 100)}`
  if (n >= 100) return `about 1 in ${fmtInt(Math.round(n / 10) * 10)}`
  return `about 1 in ${fmtInt(Math.round(n))}`
}

interface OnePropDraw {
  c: Case
  p0: number
  n: number
  x: number
  phat: number
  se0: number
  z: number
  alt: Alternative
  p: number
}

function drawOneProp(rng: Rng, alt: Alternative, band: [number, number] = [0.0006, 0.45]): OnePropDraw {
  const c = pickContext(rng, CASES)
  return retry(
    rng,
    (r) => {
      const p0 = Math.round(r.uniform(c.p0Range[0], c.p0Range[1]) * 1000) / 1000
      const n = 10 * r.int(12, 42)
      const lift = alt === 'less' ? r.uniform(0.55, 0.92) : r.uniform(1.08, 1.6)
      const x = r.binomial(n, Math.min(0.88, Math.max(0.01, p0 * lift)))
      const t = onePropTest({ x, n, p0, alt, random: true })
      return { c, p0, n, x, phat: x / n, se0: seProportion(p0, n), z: t.statistic, alt, p: t.pValue! }
    },
    (d) =>
      d.x >= 5 &&
      d.x <= d.n - 5 &&
      d.n * d.p0 >= 10 &&
      d.n * (1 - d.p0) >= 10 &&
      d.p >= band[0] &&
      d.p <= band[1] &&
      Math.abs(d.z) > 0.6 &&
      !reservedCount(d.n) &&
      !reservedCount(d.x) &&
      !reservedStat(d.z) &&
      !reservedP(d.p),
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — p from the standardized statistic
// ---------------------------------------------------------------------------------------------

export const pFromZ = defineGenerator({
  id: 'act-6/p-from-z',
  label: 'The p-value from the statistic',
  ap_topics: ['6.5'],
  skills: ['2', '3'],
  generate(rng) {
    const alt: Alternative = rng.choice(['greater', 'less', 'two-sided'] as const)
    const d = drawOneProp(rng, alt)
    const tail = alt === 'two-sided' ? 'both tails' : alt === 'greater' ? 'the upper tail' : 'the lower tail'
    const oneSided = pValueZ(d.z, d.z > 0 ? 'greater' : 'less')
    return {
      prompt: `${sentence(d.c.office)} tests the ${d.c.parameter} on ${d.c.lane} against its posted figure of ${fmt(d.p0, 3)}. The alternative was fixed before the audit and is **${ALT_WORD[alt]}**:\n\n$$H_0:\\ p = ${fmt(d.p0, 3)} \\qquad H_a:\\ p ${ALT_SYMBOL[alt]} ${fmt(d.p0, 3)}$$\n\nThe audit returns ${fmtInt(d.x)} ${d.c.event} in ${fmtInt(d.n)} ${d.c.unit}, so $\\hat p = ${fmt(d.phat, 4)}$ and the standardized statistic is $z = ${fmt(d.z, 2)}$.\n\nWhat is the p-value? Give it to four decimal places.`,
      answer: numericAnswer(d.p, 'pValue'),
      hints: [
        'The p-value is an area under the standard normal curve, and which area depends only on the alternative you wrote down before the data. Sketch the curve, mark the statistic, and shade everything the alternative counts as "at least as extreme".',
        alt === 'two-sided'
          ? `Two-sided means both tails count: a statistic of $-${fmt(Math.abs(d.z), 2)}$ would have been exactly as surprising as $+${fmt(Math.abs(d.z), 2)}$. Find the area beyond one of them and double it.`
          : `One tail only. Find the area ${alt === 'greater' ? 'above' : 'below'} $z = ${fmt(d.z, 2)}$ on the standard normal curve.`,
        alt === 'two-sided' ? `$2 \\times P(Z \\ge ${fmt(Math.abs(d.z), 2)})$, to four decimals.` : `$P(Z ${alt === 'greater' ? '\\ge' : '\\le'} ${fmt(d.z, 2)})$, to four decimals.`,
      ],
      solution: `$$z = \\frac{\\hat p - p_0}{\\sqrt{p_0(1 - p_0)/n}} = \\frac{${fmt(d.phat, 4)} - ${fmt(d.p0, 3)}}{${fmt(d.se0, 4)}} = ${fmt(d.z, 2)}$$\n\n${alt === 'two-sided' ? `$$P = 2 \\times P(Z \\ge |${fmt(d.z, 2)}|) = 2 \\times ${fmt(normal.sf(Math.abs(d.z)), 4)} = ${fmtP(d.p)}$$` : `$$P = P\\left(Z ${alt === 'greater' ? '\\ge' : '\\le'} ${fmt(d.z, 2)}\\right) = ${fmtP(d.p)}$$`}\n\n**${fmtP(d.p)}** — ${oneIn(d.p)}.\n\nRead it back as a sentence before you move on. *If the ${d.c.parameter} on ${d.c.lane} really were ${fmt(d.p0, 3)}, an audit of ${fmtInt(d.n)} ${d.c.unit} would produce a statistic at least this extreme ${oneIn(d.p).replace('about ', '')} times.* The shaded area is ${tail}, because that is what the alternative — written before the audit — counts as evidence against $H_0$.${alt === 'two-sided' ? `\n\nHad the office written a one-sided alternative, the same statistic would have returned ${fmtP(oneSided)}: exactly half. That halving is not a discovery about the corridor; it is a consequence of a decision made before the data, which is why the decision has to be defensible.` : ''}`,
      misconception: alt === 'two-sided' ? 'Reporting one tail for a two-sided alternative, which halves the p-value and doubles the false-alarm rate the test advertises.' : `Doubling a one-sided p-value out of habit, or shading the tail on the side the sample happened to fall rather than the side H\u2090 names.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — the sentence
// ---------------------------------------------------------------------------------------------

/**
 * "The probability that H₀ is true" and its variants. Written tight, and with a negative lookbehind,
 * so that a learner who writes "…it is NOT the probability that H₀ is true" is not punished for
 * saying the right thing.
 */
const PROB_H0_TRUE: ForbiddenPhrase = {
  phrase: /(?<!\bnot\b[^.;]{0,30})\b(?:probability|chance|likelihood|odds)\b\s*(?:that|of|for)?\s*(?:the\s+)?\b(?:null|alt)\b[^.;]{0,25}\b(?:true|correct|right|false|wrong)\b/,
  label: 'The probability that H₀ is true',
  why: 'The p-value is computed by ASSUMING H₀ and asking how often data this extreme would follow. It says nothing about how probable H₀ itself is — H₀ is either true or it is not, and no amount of data turns that into a probability.',
}
const PROB_OF_BEING_TRUE: ForbiddenPhrase = {
  phrase: /\b(?:null|alt)\b[^.;]{0,25}\b(?:probability|chance|likelihood|odds)\b\s*(?:of|that)?\s*(?:it\s+|the\s+)?\bbeing\b\s*\b(?:true|correct|false)\b/,
  label: 'A probability of H₀ "being true"',
  why: 'Same error read backwards. The p-value conditions ON the null; it never assigns the null a probability.',
}
const DUE_TO_CHANCE: ForbiddenPhrase[] = [
  {
    phrase: 'due to chance',
    label: '“due to chance”',
    why: 'This sentence quietly makes the p-value a probability about the world rather than about the data. Every sample differs from the null by chance; the p-value measures how often chance alone produces a difference at least this large, which is a different claim.',
  },
  {
    phrase: 'happened by chance',
    label: '“happened by chance”',
    why: 'The p-value is not the probability that the result happened by chance. It is the probability of a result at least this extreme GIVEN that nothing but chance is at work.',
  },
  {
    phrase: 'occurred by chance',
    label: '“occurred by chance”',
    why: 'The p-value is not the probability that the result occurred by chance. It assumes chance is all there is and asks how surprising the data would then be.',
  },
  {
    phrase: 'by chance alone',
    label: '“by chance alone”',
    why: 'Only defensible with "a result at least as extreme as this one would arise by chance alone in p of all such samples" — and the safe version of that sentence names the assumption and the extremity explicitly. As written it reads as a probability about this result.',
  },
  {
    phrase: 'random chance',
    label: '“random chance”',
    why: 'The p-value is not the probability that the result is random chance. It is a probability computed under the assumption that chance is the only thing operating.',
  },
]
const ONE_MINUS_P: ForbiddenPhrase = {
  phrase: /\b1\s*-\s*pvalue\b/,
  label: '1 − p as the probability of Hₐ',
  why: '1 − p is not the probability that Hₐ is true, and it is not the probability the result is real. Both p and 1 − p are computed entirely under H₀.',
}
const PROB_HA_TRUE: ForbiddenPhrase = {
  phrase: /\b(?:probability|chance|likelihood)\b[^.;]{0,25}\balt\b[^.;]{0,20}\b(?:true|correct)\b/,
  label: 'A probability that Hₐ is true',
  why: 'Nothing in this procedure produces a probability for a hypothesis — only a probability for data, computed under H₀.',
}
const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A p-value provides, or fails to provide, convincing evidence. It never proves anything.',
}

export interface InterpretPValueArgs {
  pValue: number
  alt: Alternative
  /** What H₀ says, in plain words: "the two beneficiary classes are lost at the same rate". */
  nullInWords: string
  /** The statistic in words: "a difference in sample loss rates". */
  statisticPhrase: string
  /** Whom the conclusion is about. */
  population: string
  /** What was measured. */
  variable: string
}

/**
 * Rubric for "interpret the p-value in context" (AP 6.5). Requires the four things a reader in a
 * hearing would look for — the assumption, the extremity, the word probability, the number — plus
 * the context; forbids the four sentences the module is named after.
 *
 * Used by `act-6/interpret-p-value` and by act-6-04's mission beat, so that the sentence the learner
 * writes for the Lane is graded by exactly the rubric the drills taught.
 */
export function interpretPValueRubric({ pValue, alt, nullInWords, statisticPhrase, population, variable }: InterpretPValueArgs): InterpretationAnswer {
  const pPhrasings: RubricPhrase[] = pValue >= 0.0001 ? [numberRegex(pValue, 4, 2)] : [/\bless\s*(?:0\.0+1|\.0+1)\b/, numberRegex(pValue, 5, 2)]
  const required: RubricGroup[] = [
    {
      label: 'Conditions on H₀ being true (“assuming H₀ is true…”)',
      phrasings: [/\b(?:assuming|assume|assumed|if|given|under|supposing|suppose|when|were)\b[^.;]{0,40}\bnull\b/, /\bnull\b[^.;]{0,30}\b(?:true|correct|holds|held|hold)\b/],
      polarity: 'any',
      feedback: `Open with the assumption: “If H₀ is true — ${nullInWords} — then…”. Without it the sentence is not a p-value at all.`,
    },
    {
      label: '“at least as extreme” as the observed statistic',
      phrasings: [/\bat least as (?:extreme|large|great|big|high|far|many|strong|unusual)/, /\bat least this (?:extreme|large|great|big|high|far|unusual)/, /\bor more extreme\b/, /\b(?:this|that|as) extreme or (?:more|greater)\b/, /\bas extreme as\b/, /\bas (?:large|big|great) as or (?:greater|more)\b/],
      polarity: 'any',
      feedback: 'The p-value collects every outcome the alternative counts as at least as surprising as the one observed — not just this exact result, whose probability is essentially zero.',
    },
    {
      label: 'Calls it a probability (a long-run rate over repeated samples)',
      phrasings: ['probability', 'proportion of sample', 'out of'],
      polarity: 'any',
      feedback: `Say what ${fmtP(pValue)} is: a probability — equivalently, the fraction of all such samples that would look at least this extreme.`,
    },
    { label: `Cites the p-value (${fmtP(pValue)})`, phrasings: pPhrasings, polarity: 'any', feedback: `Give the number: ${fmtP(pValue)}.` },
    contextGroup('States the context (what was measured, and for whom)', [population, variable], { minMatches: 2, feedback: `Say what and whom: the ${variable} of ${population}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROB_H0_TRUE, PROB_OF_BEING_TRUE, ...DUE_TO_CHANCE, ONE_MINUS_P, PROB_HA_TRUE, PROVES]
  const extremity = alt === 'two-sided' ? 'at least as extreme in either direction as' : alt === 'greater' ? 'at least as extreme as' : 'at least as far below the null value as'
  const exemplar = `If H₀ is true — ${nullInWords} — then a sample of ${population} would produce ${statisticPhrase} ${extremity} the one observed with probability ${fmtP(pValue)}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 15 }
}

export const interpretPValue = defineGenerator({
  id: 'act-6/interpret-p-value',
  label: 'Interpret the p-value in context',
  ap_topics: ['6.5'],
  skills: ['4'],
  generate(rng) {
    const alt: Alternative = rng.choice(['greater', 'less', 'two-sided'] as const)
    const d = drawOneProp(rng, alt, [0.002, 0.3])
    const population = `${d.c.unit} on ${d.c.lane}`
    const answer = interpretPValueRubric({
      pValue: d.p,
      alt,
      nullInWords: `the ${d.c.parameter} on ${d.c.lane} is exactly ${fmt(d.p0, 3)}`,
      statisticPhrase: `a sample proportion`,
      population,
      variable: d.c.parameter,
    })
    return {
      prompt: `${sentence(d.c.office)} tested $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p ${ALT_SYMBOL[alt]} ${fmt(d.p0, 3)}$ for the ${d.c.parameter} on ${d.c.lane}, where $p$ is the true proportion for all ${population}. The audit of ${fmtInt(d.n)} ${d.c.unit} returned ${fmtInt(d.x)} ${d.c.event}, $\\hat p = ${fmt(d.phat, 4)}$, $z = ${fmt(d.z, 2)}$ and $P = ${fmtP(d.p)}$.\n\n**Interpret the p-value in context.** One or two sentences. Do not state a conclusion and do not mention a significance level — this is the p-value and nothing else.`,
      answer,
      hints: [
        'Four things have to be in the sentence, and a reader in a hearing will check for each of them: the assumption you are working under, the words "at least as extreme", the word probability, and the number itself. Then say what was measured and for whom.',
        `Start the sentence with the assumption and you will find the rest follows: "If the ${d.c.parameter} on ${d.c.lane} really is ${fmt(d.p0, 3)}, then…". Now finish it with what would happen to a sample of ${fmtInt(d.n)} ${d.c.unit}.`,
        `The probability you are describing is ${fmtP(d.p)} — ${oneIn(d.p)} such audits. Say what those audits would show, not what is true of ${d.c.lane}.`,
      ],
      solution: `**${answer.exemplar}**\n\nOr, read as a rate: in ${oneIn(d.p).replace('about ', 'about ')} audits of ${fmtInt(d.n)} ${d.c.unit} drawn from a corridor whose true rate really is ${fmt(d.p0, 3)}, one would come back at least this far from it.\n\nFour sentences that are **not** this one, and each of them will be quoted back at you by somebody who wants the finding to fail:\n\n- *"There is a ${fmtP(d.p)} probability that $H_0$ is true."* The p-value conditions **on** $H_0$. It is an input to the calculation, not an output of it.\n- *"There is a ${fmtP(d.p)} probability the result is due to chance."* Every sample differs from the null by chance. The p-value says how often chance alone would produce a difference at least this large — a statement about the data, not about this corridor.\n- *"So there is a ${fmt(1 - d.p, 4)} probability that $H_a$ is true."* Both numbers are computed entirely under $H_0$; neither is a probability for a hypothesis.\n- *"The probability of getting exactly $\\hat p = ${fmt(d.phat, 4)}$ is ${fmtP(d.p)}."* The probability of any exact value is essentially zero. The p-value is a **tail** — the whole set of outcomes at least as extreme.`,
      misconception: 'Dropping "assuming H₀ is true" or "at least as extreme". Without the first the sentence becomes a probability about the hypothesis; without the second it becomes a probability about one exact outcome.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — p from a simulated null distribution
// ---------------------------------------------------------------------------------------------

export const simulatedP = defineGenerator({
  id: 'act-6/simulated-p',
  label: 'The p-value from a simulation',
  ap_topics: ['6.5'],
  skills: ['2', '3'],
  generate(rng) {
    const c = pickContext(rng, CASES)
    const reps = 500
    const d = retry(
      rng,
      (r) => {
        const p0 = Math.round(r.uniform(c.p0Range[0], c.p0Range[1]) * 100) / 100
        const n = 10 * r.int(6, 14)
        const sims = Array.from({ length: reps }, () => r.binomial(n, p0))
        const x = Math.round(n * p0 + r.uniform(1.4, 2.9) * Math.sqrt(n * p0 * (1 - p0)))
        const tail = sims.filter((v) => v >= x).length
        return { p0, n, x, sims, tail, p: tail / reps }
      },
      (v) => v.tail >= 4 && v.tail <= 60 && v.x < v.n && v.n * v.p0 >= 8 && !reservedCount(v.n) && !reservedCount(v.x) && !reservedP(v.p),
    )
    const { p0, n, x, sims, tail, p } = d
    const maxSim = Math.max(...sims)
    const floor = x - 3
    const rows: (string | number)[][] = [[`${fmtInt(floor)} or fewer`, sims.filter((v) => v <= floor).length]]
    for (let v = floor + 1; v <= maxSim; v++) rows.push([fmtInt(v), sims.filter((s) => s === v).length])
    const normalP = onePropTest({ x, n, p0, alt: 'greater', random: true }).pValue!
    const atOrAbove = rows.slice(x - floor).map((r) => `${r[1]}`).join(' + ')

    return {
      prompt: `${sentence(c.office)} will not take the normal model on trust, so it simulates instead. It builds ${fmtInt(reps)} seasons of ${c.lane} in which the ${c.parameter} is held at exactly ${fmt(p0, 2)} — the posted figure — and counts the ${c.event} in ${fmtInt(n)} ${c.unit} each time. The table is what came back.\n\nThe real season logged **${fmtInt(x)}** ${c.event} in ${fmtInt(n)} ${c.unit}, and the Office is testing $H_0:\\ p = ${fmt(p0, 2)}$ against $H_a:\\ p > ${fmt(p0, 2)}$.\n\nWhat is the **simulated** p-value? Give it to four decimal places.`,
      data: tableSpec([`simulated ${c.event} in ${fmtInt(n)} ${c.unit}`, `seasons (out of ${fmtInt(reps)})`], rows),
      answer: numericAnswer(p, 'pValue'),
      hints: [
        'The simulation ran a world in which H₀ is exactly true. So every row of that table is a season that nothing but chance produced. The question is how many of them came out at least as extreme as the real one.',
        `"At least as extreme" for $H_a:\\ p > ${fmt(p0, 2)}$ means at least as many ${c.event} — so ${fmtInt(x)} counts, and so does every row above it. Add those seasons and divide by ${fmtInt(reps)}.`,
        `$(${atOrAbove}) / ${fmtInt(reps)}$, to four decimals.`,
      ],
      solution: `$$P_{\\text{sim}} = \\frac{\\#\\{\\text{simulated seasons with at least } ${fmtInt(x)}\\}}{${fmtInt(reps)}} = \\frac{${fmtInt(tail)}}{${fmtInt(reps)}} = ${fmtP(p)}$$\n\n**${fmtP(p)}** — ${fmtInt(tail)} of the ${fmtInt(reps)} null seasons were at least as extreme as the one actually logged.\n\nThe normal model, run on the same counts, gives $z = ${fmt(onePropTest({ x, n, p0, alt: 'greater', random: true }).statistic, 2)}$ and $P = ${fmtP(normalP)}$. The two agree to about ${fmt(Math.abs(p - normalP), 4)}, and they should: the normal curve is a *description* of the distribution the simulation drew from, not a separate claim about it. Where they part company is in the far tail, where ${fmtInt(reps)} runs cannot resolve a probability finer than $1/${fmtInt(reps)} = ${fmt(1 / reps, 4)}$ — a simulated p-value can never be smaller than one run in ${fmtInt(reps)}, however extreme the data are.\n\nThe counting rule is the whole lesson. Nothing here needed a curve, a standard error or a table of areas: build the null, run it, and count the runs at least as extreme.`,
      misconception: `Counting only the seasons that hit exactly ${fmtInt(x)}, or counting the seasons below ${fmtInt(x)} — the p-value is the tail at and beyond the observed value, in the direction Hₐ names.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — the four sentences
// ---------------------------------------------------------------------------------------------

export const forbiddenSentence = defineGenerator({
  id: 'act-6/forbidden-sentence',
  label: 'Which sentence about p is defensible?',
  ap_topics: ['6.5'],
  skills: ['4'],
  generate(rng) {
    const alt: Alternative = rng.bool() ? 'greater' : 'two-sided'
    const d = drawOneProp(rng, alt, [0.004, 0.12])
    const pStr = fmtP(d.p)
    const extremity = alt === 'two-sided' ? 'at least as far from' : 'at least as far above'
    const cands: Candidate[] = [
      {
        text: `If the true ${d.c.parameter} on ${d.c.lane} were exactly ${fmt(d.p0, 3)}, then about ${pStr} of all audits of ${fmtInt(d.n)} ${d.c.unit} would return a sample proportion ${extremity} ${fmt(d.p0, 3)} as this one did.`,
        correct: true,
        why: null,
      },
      {
        text: `There is a ${pStr} probability that $H_0$ is true — that the ${d.c.parameter} on ${d.c.lane} really is ${fmt(d.p0, 3)}.`,
        correct: false,
        why: `**The probability that H₀ is true.** The p-value is computed by *assuming* $H_0$; it is an input to the arithmetic, not a verdict on it. $H_0$ is either true of ${d.c.lane} or it is not, and a sample cannot turn that into a probability.`,
      },
      {
        text: `There is a ${pStr} probability that the difference between ${fmt(d.phat, 4)} and ${fmt(d.p0, 3)} is due to chance.`,
        correct: false,
        why: `**"Due to chance."** Under $H_0$ the difference is due to chance *with certainty* — chance is the only mechanism in the model. What ${pStr} measures is how often chance alone would produce a difference at least this large, which is a statement about the data, not about the cause.`,
      },
      {
        text: `Since $P = ${pStr}$, there is a ${fmt(1 - d.p, 4)} probability that $H_a$ is true and the true rate really is ${alt === 'two-sided' ? 'different from' : 'above'} ${fmt(d.p0, 3)}.`,
        correct: false,
        why: `**1 − p as the probability of Hₐ.** Both ${pStr} and ${fmt(1 - d.p, 4)} are computed entirely inside the world where $H_0$ holds. Neither is a probability that any hypothesis is true; the complement of a conditional probability is still conditional on the same thing.`,
      },
      {
        text: `The probability of getting exactly $\\hat p = ${fmt(d.phat, 4)}$ from ${fmtInt(d.n)} ${d.c.unit} is ${pStr}.`,
        correct: false,
        why: `**A point, not a tail.** The p-value collects every outcome the alternative counts as at least as extreme — that whole shaded region, not the single value the audit landed on. (The probability of any one exact sample proportion is far smaller than ${pStr}.)`,
      },
    ]
    const chosen = [cands[0], ...rng.shuffle(cands.slice(1)).slice(0, 3)]
    const { options, correct, feedback } = shuffleChoice(rng, chosen)
    return {
      prompt: `${sentence(d.c.office)}'s audit of ${fmtInt(d.n)} ${d.c.unit} on ${d.c.lane} returned ${fmtInt(d.x)} ${d.c.event}. Testing $H_0:\\ p = ${fmt(d.p0, 3)}$ against $H_a:\\ p ${ALT_SYMBOL[alt]} ${fmt(d.p0, 3)}$ gives $z = ${fmt(d.z, 2)}$ and $P = ${pStr}$.\n\nFour sentences are drafted for the report. **Exactly one of them would survive being read aloud by somebody who wants the finding to fail.** Which?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Test each sentence with one question: what is being *assumed*, and what is being *given a probability*? In a defensible reading of a p-value the hypothesis is assumed and the data are given the probability. Three of these have it the other way round.',
        'Then check the second half: does the sentence describe one exact outcome, or a whole tail of outcomes at least as extreme? A p-value is always an area, never a point.',
      ],
      solution: `**${options[correct]}**\n\nEvery defensible reading of a p-value has the same skeleton: *assuming $H_0$* — *the probability* — *of a statistic at least as extreme as the observed one* — *in context*. Drop the first clause and the sentence becomes a claim about the hypothesis; drop the third and it becomes a claim about one impossible-to-repeat outcome.\n\n${cands
        .slice(1)
        .map((c) => `- ${c.why}`)
        .join('\n')}\n\nThis matters more than a vocabulary drill usually does, because the wrong sentences are not wrong by a little. Each of them makes a claim the arithmetic cannot support, and each is the first thing a hostile reader will take apart.`,
      misconception: 'Reading the p-value as a probability about a hypothesis rather than a probability about data computed under a hypothesis.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — one tail or two
// ---------------------------------------------------------------------------------------------

export const oneVsTwoTails = defineGenerator({
  id: 'act-6/one-vs-two-tails',
  label: 'One tail or two',
  ap_topics: ['6.5'],
  skills: ['2', '3'],
  generate(rng) {
    const d = drawOneProp(rng, 'greater', [0.002, 0.2])
    const z = d.z
    const one = pValueZ(z, 'greater')
    const two = pValueZ(z, 'two-sided')
    const askTwo = rng.bool()
    const answer = askTwo ? two : one
    const given = askTwo ? one : two
    return {
      prompt: askTwo
        ? `${sentence(d.c.office)}'s audit of ${fmtInt(d.n)} ${d.c.unit} on ${d.c.lane} returned ${fmtInt(d.x)} ${d.c.event} against a posted figure of ${fmt(d.p0, 3)}, giving $z = ${fmt(z, 2)}$. Written as a one-sided test — $H_a:\\ p > ${fmt(d.p0, 3)}$ — the p-value is ${fmtP(one)}.\n\nA reviewer objects that the Office had no advance reason to pick a side, and that the alternative should have been **two-sided**: $H_a:\\ p \\ne ${fmt(d.p0, 3)}$. On the **same** statistic $z = ${fmt(z, 2)}$, what is the two-sided p-value? Give it to four decimal places.`
        : `${sentence(d.c.office)}'s audit of ${fmtInt(d.n)} ${d.c.unit} on ${d.c.lane} returned ${fmtInt(d.x)} ${d.c.event} against a posted figure of ${fmt(d.p0, 3)}, giving $z = ${fmt(z, 2)}$. The Office wrote the alternative two-sided — $H_a:\\ p \\ne ${fmt(d.p0, 3)}$ — and reported ${fmtP(two)}.\n\nHad the Office been able to justify a one-sided alternative before the audit — $H_a:\\ p > ${fmt(d.p0, 3)}$ — what p-value would the **same** statistic $z = ${fmt(z, 2)}$ have produced? Give it to four decimal places.`,
      answer: numericAnswer(answer, 'pValue'),
      hints: [
        'Nothing about the corridor changes between the two readings. The statistic is the same number on the same curve; what changes is which outcomes the alternative counts as "at least as extreme".',
        askTwo
          ? `A two-sided alternative counts a statistic of $-${fmt(Math.abs(z), 2)}$ as exactly as surprising as $+${fmt(Math.abs(z), 2)}$, and the standard normal curve is symmetric.`
          : `A two-sided p-value is the sum of two equal tails; a one-sided p-value is one of them.`,
        askTwo ? `$2 \\times ${fmtP(one)}$, to four decimals.` : `$${fmtP(two)} \\div 2$, to four decimals.`,
      ],
      solution: `$$P_{\\text{one-sided}} = P(Z \\ge ${fmt(z, 2)}) = ${fmtP(one)} \\qquad P_{\\text{two-sided}} = 2 \\times P(Z \\ge ${fmt(z, 2)}) = ${fmtP(two)}$$\n\n**${fmtP(answer)}** (the other reading being ${fmtP(given)}).\n\nThe factor of two is not a correction, a penalty or an adjustment for anything the data did. It is the whole content of the alternative: a two-sided $H_a$ says a departure in *either* direction would count, so the tail on the far side has to be counted too, and the curve's symmetry makes it the same size.\n\nWhich is why the alternative is written before the data. If the Office picks the side after seeing which way the audit fell, it will reject on either tail while quoting the smaller number — a procedure whose real false-alarm rate is twice the one printed on the page.`,
      misconception: 'Treating the doubling as something the data caused. One tail or two is fixed by the alternative, and the alternative is fixed before the data.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Display — read the shading
// ---------------------------------------------------------------------------------------------

export const pValueShading = defineGenerator({
  id: 'act-6/p-value-shading',
  label: 'Read the shaded tail',
  ap_topics: ['6.5'],
  skills: ['2', '4'],
  generate(rng) {
    const c = pickContext(rng, CASES)
    const upper = rng.bool()
    const z = retry(
      rng,
      (r) => Math.round(r.uniform(1.15, 2.85) * 100) / 100,
      (v) => !reservedStat(v) && !reservedStat(-v),
    )
    const signed = upper ? z : -z
    const oneTail = pValueZ(signed, upper ? 'greater' : 'less')
    const twoTail = pValueZ(signed, 'two-sided')
    const p0 = Math.round(rng.uniform(c.p0Range[0], c.p0Range[1]) * 1000) / 1000
    const dirWord = upper ? 'greater than' : 'less than'
    const oppWord = upper ? 'less than' : 'greater than'

    const cands: Candidate[] = [
      {
        text: `$H_a:\\ p ${upper ? '>' : '<'} ${fmt(p0, 3)}$ — a one-sided alternative — and the shaded area is the p-value, $${fmtP(oneTail)}$.`,
        correct: true,
        why: null,
      },
      {
        text: `$H_a:\\ p \\ne ${fmt(p0, 3)}$ — a two-sided alternative — and the shaded area is the p-value, $${fmtP(twoTail)}$.`,
        correct: false,
        why: `A two-sided alternative shades **both** tails, and the picture shows one. The value quoted here, ${fmtP(twoTail)}, is what you would get after adding the mirror tail beyond $z = ${fmt(-signed, 2)}$ — but that region is not shaded, so it is not what this display shows.`,
      },
      {
        text: `$H_a:\\ p ${upper ? '>' : '<'} ${fmt(p0, 3)}$, and the p-value is the **unshaded** area, $${fmt(1 - oneTail, 4)}$ — the probability that the null is not contradicted.`,
        correct: false,
        why: `The p-value is the area the alternative counts as "at least as extreme", which is the shaded tail beyond the statistic — ${fmtP(oneTail)}. The unshaded ${fmt(1 - oneTail, 4)} is everything *less* extreme, and it is not a probability about the null at all.`,
      },
      {
        text: `$H_a:\\ p ${upper ? '<' : '>'} ${fmt(p0, 3)}$ — the alternative points ${oppWord} the null value — and the p-value is $${fmtP(oneTail)}$.`,
        correct: false,
        why: `The shading is on the ${upper ? 'upper' : 'lower'} side of the curve, so the outcomes being counted as extreme are the ones ${dirWord} the null value. An alternative pointing ${oppWord} would have shaded the other tail, and on this statistic it would have returned ${fmtP(pValueZ(signed, upper ? 'less' : 'greater'))} — almost all of the curve.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)
    const shade = upper ? { from: signed, to: 4 } : { from: -4, to: signed }
    return {
      prompt: `${sentence(c.office)} tested $H_0:\\ p = ${fmt(p0, 3)}$ for the ${c.parameter} on ${c.lane} and got a standardized statistic of $z = ${fmt(signed, 2)}$. The display is the sampling distribution of $z$ **under $H_0$** — the standard normal curve — with the region the office shaded.\n\nWhich alternative hypothesis does that shading correspond to, and what is the p-value it represents?`,
      answer: {
        type: 'display',
        display: { kind: 'normal', mean: 0, sd: 1, shade },
        question: { type: 'choice', options, correct, feedback },
      },
      hints: [
        'Read the picture before you read the options. How many regions are shaded, and on which side of centre does the shading start?',
        `The shading runs ${upper ? 'from' : 'up to'} $z = ${fmt(signed, 2)}$ and away from the middle, in one direction only. Now ask which alternative would tell you to count exactly those outcomes as "at least as extreme".`,
      ],
      solution: `**${options[correct]}**\n\nThe curve is the distribution of the standardized statistic *if $H_0$ were true*, so every point on it is a season that the null could produce on its own. The alternative decides which of those seasons count as being at least as extreme as the one observed, and the p-value is their total probability.\n\nOne tail, ${upper ? 'upper' : 'lower'}: $P(Z ${upper ? '\\ge' : '\\le'} ${fmt(signed, 2)}) = ${fmtP(oneTail)}$ — the shaded region and nothing else.\n\nThe same statistic read two-sided would be ${fmtP(twoTail)}, because it would add the mirror tail beyond $z = ${fmt(-signed, 2)}$ — an area the display does not shade. Doubling a one-tailed area is a decision about the *alternative*, made before the data; it is never something you read off a picture of one tail.`,
      misconception: 'Reading a single shaded tail as a two-sided p-value, or taking the unshaded majority of the curve as the p-value.',
    }
  },
})
