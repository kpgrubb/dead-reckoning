/**
 * Act IV rubric templates (curriculum map §7 / beat-sheet Act IV drill lines). Same shape as
 * `@/lib/problems/rubrics` — each returns an `InterpretationAnswer` whose exemplar passes its own
 * rubric (asserted in `_rubrics.test.ts` and again by `defineGenerator`'s self-check on every draw).
 *
 *   simulatedProbabilityInterpretation  4-01 · a simulated probability, WITH its run count
 *   conditionalInContext                4-03 · which conditional a number is, and what it is not
 *   independenceInContext               4-04 · independent or not, scoped to this file
 *   sdOfSumInterpretation               4-07 · the SD of a total, and why it is not the sum of SDs
 *   binomialSurpriseInterpretation      4-09 · surprise judged from a tail under a stated p
 *   geometricMeanInterpretation         4-10 · 1/p as a long-run average, not a forecast
 *
 * Not a generator file (exports functions only; the registry ignores non-generator exports).
 * Request to the orchestrator: fold these into `src/lib/problems/rubrics.ts` for later Acts.
 */
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { fmt, fmtPct } from '@/lib/stats/format'

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A probability is a statement about how often something happens under a model. It proves nothing about the case in front of you.',
}

function unitsSuffix(units?: string): string {
  return units ? ` ${units}` : ''
}

// ---------------------------------------------------------------------------------------------
// 4-01 · a simulated probability is an estimate — say how many runs
// ---------------------------------------------------------------------------------------------

export interface SimulatedProbabilityArgs {
  /** count / runs. */
  estimate: number
  /** How many trials produced the statistic at or beyond the observed value. */
  count: number
  runs: number
  /** The event, phrased as the simulation's statistic: "a 30-day cluster of five or more losses". */
  event: string
  /** The model the trial assumed, plural-friendly: "31 loss dates scattered at random over six years". */
  model: string
  digits?: number
}

/**
 * "In 175 of 10,000 simulated years — about 2 percent — 31 dates scattered at random produced a
 * 30-day cluster of five or more. The estimate comes from 10,000 runs, so it is not exact."
 */
export function simulatedProbabilityInterpretation({ estimate, count, runs, event, model, digits = 3 }: SimulatedProbabilityArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: 'Cites the simulated probability',
      phrasings: [numberRegex(estimate, digits, 1), numberRegex(100 * estimate, 1, 1), numberRegex(100 * estimate, 0, 1)],
      polarity: 'any',
      feedback: `The simulated probability is ${fmt(estimate, digits)} — that is ${fmtPct(estimate, 1)}.`,
    },
    {
      label: 'Gives the run size (and ideally the count)',
      phrasings: [numberRegex(runs, 0, 1), numberRegex(count, 0, 1)],
      polarity: 'any',
      feedback: `Say how the estimate was made: ${count} of ${runs} simulated trials. A simulation estimates; the run size is part of the answer.`,
    },
    {
      label: 'Names the event the statistic counts',
      phrasings: [event],
      polarity: 'any',
      feedback: `Say what was counted: ${event}.`,
    },
    {
      label: 'Names the model the trial assumed',
      phrasings: [model, 'random', 'chance'],
      polarity: 'any',
      feedback: `Say what the trial assumed: ${model}. A simulated probability is a probability UNDER a model.`,
    },
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      // Negation-aware: "not exact" is the right thing to say, "exactly 0.018" is the error.
      phrase: /(?<!\bnot\b[^.,;:]{0,40})\b(?:exact|exactly|precisely)\b/,
      label: 'Reports an estimate as exact',
      why: 'A simulated probability is an estimate from a finite number of runs. Another ten thousand runs would give a slightly different number.',
    },
    PROVES,
  ]
  const exemplar = `In ${count} of ${runs} simulated trials — ${fmt(estimate, digits)}, about ${fmtPct(estimate, 0)} — ${model} produced ${event}. That is an estimate from ${runs} runs, and another ${runs} would land somewhere close but not on the same number.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 14 }
}

// ---------------------------------------------------------------------------------------------
// 4-03 · which conditional is this, and which one is it not
// ---------------------------------------------------------------------------------------------

export interface ConditionalArgs {
  /** The value being interpreted. */
  value: number
  /** The event in the numerator, as a noun phrase: "a loss". */
  event: string
  /** The group conditioned on — whatever follows "of the": "gradual transponder fades". */
  given: string
  /** The reversed conditional's value, for the "and it is not" clause. */
  reversedValue: number
  /** The reversed conditional in words: "the share of losses that faded gradually". */
  reversedPhrase: string
  digits?: number
}

/**
 * "Of the 119 gradual fades on the Register, 16 percent ended in a loss. That is not the share of
 * losses that faded gradually, which is 61 percent."
 */
export function conditionalInContext({ value, event, given, reversedValue, reversedPhrase, digits = 3 }: ConditionalArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: 'Cites the conditional probability',
      phrasings: [numberRegex(value, digits, 1), numberRegex(100 * value, 1, 1), numberRegex(100 * value, 0, 1)],
      polarity: 'any',
      feedback: `The conditional probability is ${fmt(value, digits)} — ${fmtPct(value, 1)}.`,
    },
    {
      label: 'Names the group conditioned on (the denominator)',
      phrasings: [given, 'given', 'among', 'of the'],
      polarity: 'any',
      feedback: `Say what the denominator is: only the ${given} are in the calculation at all.`,
    },
    {
      label: 'Names the event in the numerator',
      phrasings: [event],
      polarity: 'any',
      feedback: `Say what share is being taken: the ${given} that are ${event}.`,
    },
    {
      label: 'Distinguishes it from the reversed conditional',
      phrasings: ['not', 'differ', 'other way', 'reverse', 'opposite direction', numberRegex(reversedValue, digits, 1), numberRegex(100 * reversedValue, 0, 1)],
      polarity: 'any',
      feedback: `Say which question it does not answer: ${reversedPhrase} is a different number, ${fmtPct(reversedValue, 1)}.`,
    },
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES]
  const exemplar = `Of the ${given}, ${fmtPct(value, 1)} are ${event}. That is not ${reversedPhrase}, which is a different number — ${fmtPct(reversedValue, 1)} — because the denominator is not the same group.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 14 }
}

// ---------------------------------------------------------------------------------------------
// 4-04 · independence, scoped to the file in front of you
// ---------------------------------------------------------------------------------------------

export interface IndependenceArgs {
  independent: boolean
  /** "loss" / "a detection on this sweep". */
  eventA: string
  /** "Perrine ownership" / "a detection on the previous sweep". */
  eventB: string
  /** P(A | B). */
  conditional: number
  /** P(A). */
  marginal: number
  /** The file the claim is scoped to: "the Transit Ledger's 2,612 transits". */
  file: string
  digits?: number
}

/**
 * "In this Ledger, 2.1 percent of Perrine transits ended in a loss against 1.2 percent of all
 * transits, so loss and owner class do not appear independent in this file."
 */
export function independenceInContext({ independent, eventA, eventB, conditional, marginal, file, digits = 4 }: IndependenceArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: 'Cites the conditional and the marginal',
      phrasings: [numberRegex(conditional, digits, 1), numberRegex(100 * conditional, 1, 1), numberRegex(marginal, digits, 1), numberRegex(100 * marginal, 1, 1)],
      minMatches: 2,
      polarity: 'any',
      feedback: `Quote both numbers you are comparing: P(${eventA} | ${eventB}) = ${fmt(conditional, digits)} against P(${eventA}) = ${fmt(marginal, digits)}.`,
    },
    {
      label: independent ? 'States that the given changes nothing' : 'States that the given changes the probability',
      phrasings: independent ? ['same', 'equal', 'unchanged', 'no difference', 'independent'] : ['differ', 'greater', 'less', 'not same', 'not equal', 'change', 'depend'],
      polarity: 'any',
      feedback: independent
        ? 'Independence means the conditional equals the marginal: knowing the one changes nothing about the other.'
        : 'Say that conditioning changed the probability — that is what dependence looks like in a table.',
    },
    {
      label: 'Reaches the right verdict',
      phrasings: independent ? ['appear independent', 'consistent with independence', 'independent'] : ['not independent', 'do not appear independent', 'dependent', 'associated'],
      polarity: 'any',
      feedback: independent ? 'Conclude that the two events appear independent in this file.' : 'Conclude that the two events do not appear independent in this file.',
    },
    {
      label: 'Scopes the claim to this file',
      phrasings: [file, 'in this file', 'in this register', 'in this ledger', 'in this log', 'these records', 'this sample'],
      polarity: 'any',
      feedback: `Scope it: this describes ${file}. Whether it holds beyond them is an inference this module does not make.`,
    },
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: /\bmutually exclusive\b/,
      label: 'Confuses independence with mutual exclusivity',
      why: 'Mutually exclusive means the two events cannot both happen. Independent means one happening tells you nothing about the other. Two events with positive probability cannot be both.',
    },
    {
      phrase: /(?<!\bnot\b[^.,;:]{0,40})\bcaus(?:e|es|ed|ing|ation|al)\b/,
      label: 'Claims causation',
      why: 'A table of records shows what was written down. It does not show what acts on what.',
    },
    PROVES,
  ]
  const exemplar = `In ${file}, P(${eventA} | ${eventB}) is ${fmt(conditional, digits)}, which ${independent ? 'is the same as' : 'differs from'} the marginal P(${eventA}) of ${fmt(marginal, digits)}, so ${eventA} and ${eventB} ${independent ? 'appear independent' : 'do not appear independent'} in this file.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 14 }
}

// ---------------------------------------------------------------------------------------------
// 4-07 · the SD of a total
// ---------------------------------------------------------------------------------------------

export interface SdOfSumArgs {
  /** √Σσ² — the right answer. */
  sd: number
  /** Σσ — the wrong one that is too pessimistic. */
  naiveSum: number
  /** What the total measures: "the total Watch-profile load". */
  total: string
  units?: string
  /** Mean of the total, if it should be cited. */
  mean?: number
  digits?: number
}

/**
 * "The total Watch load varies by about 19.6 kW from its mean of 320 kW. Variances add, so the
 * total's SD is the square root of the sum of the six variances — not the 42 kW the sum of the SDs
 * would give."
 */
export function sdOfSumInterpretation({ sd, naiveSum, total, units, mean, digits = 1 }: SdOfSumArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    { label: 'Cites the SD of the total', phrasings: [numberRegex(sd, digits, 1)], polarity: 'any', feedback: `The total's SD is ${fmt(sd, digits)}${unitsSuffix(units)}.` },
    { label: 'Uses “typically” / “on average” language', phrasings: ['typical', /\baverage\b/, 'usual'], polarity: 'any', feedback: 'An SD is a typical distance from the mean, not a bound.' },
    { label: 'Describes variation from the mean', phrasings: ['vary', 'variation', 'distance', 'differ', 'deviate'], polarity: 'any', feedback: `Say that ${total} varies from its mean by about this much.` },
    {
      label: 'Says variances add, standard deviations do not',
      phrasings: ['variance add', 'add the variance', 'sum of the variance', 'square root of the sum', 'root sum of square', 'not add the sd', 'sd do not add', 'standard deviation do not add'],
      polarity: 'any',
      feedback: `Name the rule: variances add and the SD is their square root, which is why ${fmt(naiveSum, digits)}${unitsSuffix(units)} — the sum of the SDs — is too large.`,
    },
    contextGroup('States the context', [total], { minMatches: 1, feedback: `Say what varies: ${total}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: /\b(?:all|every|each) (?:of the )?(?:[a-z]+ ){0,3}(?:are |is |lie |lies |fall |falls )?(?:within|inside|between)\b/,
      label: 'Treats the SD as a bound',
      why: 'The standard deviation is a typical distance from the mean, not a limit every value stays inside.',
    },
    PROVES,
  ]
  const exemplar = `${total.charAt(0).toUpperCase()}${total.slice(1)} typically varies by about ${fmt(sd, digits)}${unitsSuffix(units)} from its mean${mean !== undefined ? ` of ${fmt(mean, digits)}${unitsSuffix(units)}` : ''}. Variances add, so the total's SD is the square root of the sum of the variances, not the ${fmt(naiveSum, digits)}${unitsSuffix(units)} you get by adding the standard deviations.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 16 }
}

// ---------------------------------------------------------------------------------------------
// 4-09 · surprise is a tail, under a stated p
// ---------------------------------------------------------------------------------------------

export interface BinomialSurpriseArgs {
  observed: number
  mean: number
  sd: number
  /** The tail P(X ≥ observed) under the stated baseline. */
  tail: number
  /** The baseline rate assumed. */
  p: number
  surprising: boolean
  /** "losses in 2,612 Lane transits". */
  context: string
  /** Where the baseline came from: "the Board's Mars–Belt corridor". */
  baseline: string
  digits?: number
}

/**
 * "Under a rate of 0.5 percent, 2,612 transits would average 13.2 losses with an SD of 3.6, so 31 is
 * about 5 SD above the mean and P(X ≥ 31) is under 0.0001 — surprising under that baseline."
 */
export function binomialSurpriseInterpretation({ observed, mean, sd, tail, p, surprising, context, baseline, digits = 1 }: BinomialSurpriseArgs): InterpretationAnswer {
  const z = (observed - mean) / sd
  const required: RubricGroup[] = [
    { label: 'Cites the mean and SD under the baseline', phrasings: [numberRegex(mean, digits, 1), numberRegex(sd, digits, 1)], minMatches: 2, polarity: 'any', feedback: `Under this baseline μ = np = ${fmt(mean, digits)} and σ = √(np(1 − p)) = ${fmt(sd, digits)}.` },
    {
      label: 'Judges surprise from a tail, not a point',
      phrasings: ['tail', 'or more', 'or greater', 'at least', 'as extreme', 'as far', numberRegex(tail, 4, 1), numberRegex(z, 1, 1)],
      polarity: 'any',
      feedback: `Surprise is about everything at or beyond ${observed}, not the chance of exactly ${observed}. P(X ≥ ${observed}) = ${tail < 0.0001 ? 'under 0.0001' : fmt(tail, 4)}, which is ${fmt(z, 1)} SD out.`,
    },
    {
      label: 'Reaches the right verdict',
      phrasings: surprising ? ['surprising', 'unusual', 'unlikely', 'rare', 'not consistent', 'hard to explain'] : ['not surprising', 'unremarkable', 'ordinary', 'consistent', 'not unusual'],
      polarity: 'any',
      feedback: surprising ? `${observed} is surprising under this baseline.` : `${observed} is unremarkable under this baseline.`,
    },
    {
      label: 'Names the baseline the judgement depends on',
      phrasings: [baseline, numberRegex(p, 4, 1), numberRegex(100 * p, 2, 1), numberRegex(100 * p, 1, 1), 'baseline', 'assumed rate'],
      polarity: 'any',
      feedback: `Name the p: this verdict holds under ${baseline}, a rate of ${fmtPct(p, 2)}. A different baseline gives a different verdict.`,
    },
    contextGroup('States the context', [context], { minMatches: 1, feedback: `Say what is being counted: ${context}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: /\bp\s*(?:value)?\s*(?:is|=)?\s*(?:the )?probability (?:that )?(?:the )?(?:null|baseline|rate) (?:is|was)\b/,
      label: 'Turns the tail into a probability about the baseline',
      why: 'The tail is the probability of a count this extreme GIVEN the baseline. It is not the probability that the baseline is right.',
    },
    PROVES,
  ]
  const exemplar = `Under ${baseline} — a rate of ${fmtPct(p, 2)} — ${context} would average ${fmt(mean, digits)} with a standard deviation of ${fmt(sd, digits)}. The observed ${observed} is ${fmt(z, 1)} standard deviations above that mean, and the chance of ${observed} or more is ${tail < 0.0001 ? 'under 0.0001' : fmt(tail, 4)}, so ${observed} is ${surprising ? 'surprising' : 'unremarkable'} under this baseline.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 18 }
}

// ---------------------------------------------------------------------------------------------
// 4-10 · the geometric mean is a long-run average, not a forecast
// ---------------------------------------------------------------------------------------------

export interface GeometricMeanArgs {
  /** 1/p. */
  meanTrials: number
  p: number
  /** The trial, singular: "Perrine passage". */
  trial: string
  /** The success, as a noun phrase: "a diversion off profile". */
  success: string
  /** P(X > ⌈1/p⌉) — the share of waits longer than the mean. */
  pBeyondMean?: number
  digits?: number
}

/**
 * "At one diversion in fifty passages, the first diversion would take 50 Perrine passages on
 * average over many repeats — but the most likely single wait is one passage, and more than a third
 * of waits run longer than 50."
 */
export function geometricMeanInterpretation({ meanTrials, p, trial, success, pBeyondMean, digits = 1 }: GeometricMeanArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    { label: 'Cites the expected number of trials', phrasings: [numberRegex(meanTrials, digits, 1), numberRegex(meanTrials, 0, 1)], polarity: 'any', feedback: `E(X) = 1/p = ${fmt(meanTrials, digits)} ${trial}s.` },
    { label: 'Long-run / many repetitions language', phrasings: ['longrun', 'repeat', 'many', /\bon average\b/], polarity: 'any', feedback: 'The mean of a geometric variable is a long-run average over many repetitions, not a countdown.' },
    { label: 'Names the trial and the success', phrasings: [trial, success], minMatches: 2, polarity: 'any', feedback: `Say what is being counted: ${trial}s up to and including the first ${success}.` },
    {
      label: 'Says the mean is not a forecast for this wait',
      phrasings: ['not', 'vary', 'shorter', 'longer', 'most likely', 'any single', 'no guarantee'],
      polarity: 'any',
      feedback: pBeyondMean === undefined ? 'Say what the mean does not promise: one wait can be much shorter or much longer.' : `Say what the mean does not promise: the single most likely wait is one ${trial}, and ${fmtPct(pBeyondMean, 0)} of waits run past the mean.`,
    },
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: /\b(?:most likely|likeliest|mode)\b(?:[^.,;:]{0,30})\b(?:mean|average|expected)\b/,
      label: 'Calls the mean the most likely value',
      why: 'For a geometric variable the most likely single outcome is always trial 1. The mean 1/p sits far to the right of the mode.',
    },
    {
      phrase: /\b(?:exactly|always|guaranteed|certain to|every time|will take)\b/,
      label: 'Treats the mean as a forecast',
      why: 'The expected wait is an average over many repetitions of the process. This wait can be one trial or two hundred.',
    },
    PROVES,
  ]
  const exemplar = `With a ${success} on about ${fmtPct(p, 1)} of ${trial}s, it would take ${fmt(meanTrials, digits)} ${trial}s on average, over many repetitions, to reach the first ${success}. That is a long-run average and not a forecast for this wait${pBeyondMean === undefined ? '' : `: the single most likely outcome is one ${trial}, and about ${fmtPct(pBeyondMean, 0)} of waits run longer than the mean`}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 16 }
}
