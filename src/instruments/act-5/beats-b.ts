/**
 * Interpretation rubric for the act-5-03 mission beat ("say it back to me"). Pure function returning
 * an `InterpretationAnswer`; the exemplar passes its own rubric (beats-b.test.ts).
 *
 * Act V builds null models; Act VI runs the tests. The rubric therefore requires a statement about a
 * SAMPLING DISTRIBUTION — the mean of nineteen, under the assumption that the nineteen flew honestly,
 * over repeated samples — and forbids the vocabulary of significance testing, which the learner has
 * not earned yet. It also forbids the two leaks this module exists to close: applying a statement
 * about a group's mean to one hull, and reading a probability about data as a probability about
 * people.
 *
 * Phrasings are token phrases matched after normalization (src/lib/problems/rubric.ts): "of", "which",
 * "so" end a negation scope and are skipped when matching; "average" collapses to "mean"; "sampling"
 * to "sample"; "in the long run" to one token; numbers survive intact for RegExp phrasings.
 */
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { fmt } from '@/lib/stats'
import { P_MEAN_19, Z_MEAN_19 } from './data'

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A probability computed under a model is not a proof. It says what the model essentially never produces; it does not establish what did happen.',
}

/** Act VI's vocabulary, used in Act V. The machinery of a formal decision has not been built yet. */
const TEST_LANGUAGE: ForbiddenPhrase[] = [
  {
    phrase: 'reject',
    label: 'Rejects a hypothesis',
    why: 'There is no hypothesis on the table and no decision rule to apply to it. This module states a probability about a sampling distribution. The test is Act VI.',
  },
  {
    phrase: 'statistically significant',
    label: 'Calls the result significant',
    why: '"Significant" is a verdict delivered against a stated threshold, and nothing here has stated one. Report the probability and what it is a probability of.',
  },
  {
    phrase: /\b(?:hypothesis|significance)\s+test(?:ing|s)?\b/,
    label: 'Calls this a test',
    why: 'This is a null model, not a test of it. Act V asks what honest variation looks like; Act VI asks what to do when an observation falls outside it.',
  },
  {
    phrase: /\bpvalue\b[^.;]{0,40}\b(?:alpha|reject|significant|test)\b/,
    label: 'P-value language',
    why: 'The number is a probability under an assumed model. Calling it a P-value and setting it against a threshold is the machinery of Act VI.',
  },
]

/** The two ways the result gets misapplied: to one hull, and to people rather than to data. */
const MISAPPLICATION: ForbiddenPhrase[] = [
  {
    phrase: /\b(?:one|a single|any single|each|every)\s+(?:honest\s+)?(?:hull|ship|transit)\b[^.;]{0,60}\b(?:essentially never|almost never|impossible|could not have|not honest|never this late)\b/,
    label: 'Applies the result to a single hull',
    why: 'Nothing here is extreme about one hull. About one honest transit in seven is as late as the nineteen average; the statement is about their mean, and only about their mean.',
  },
  {
    phrase: /\b(?:essentially|almost)\s+never\b[^.;]{0,60}\b(?:one|a single|any)\s+(?:hull|ship|transit)\b/,
    label: 'Applies the result to a single hull',
    why: 'Nothing here is extreme about one hull. About one honest transit in seven is as late as the nineteen average; the statement is about their mean, and only about their mean.',
  },
  {
    phrase: /\b(?:each|every|all)\s+(?:one\s+)?(?:of\s+)?(?:the\s+)?nineteen\b[^.;]{0,60}\b(?:on purpose|deliberate\w*|intentional\w*|was late|were late|are late|guilty)\b/,
    label: 'Claims each of the nineteen was late on purpose',
    why: 'The result is a property of the average of nineteen. It says nothing about any member of the group, and nothing at all about intent.',
  },
  {
    phrase: /\b(?:probability|chance|likelihood|odds)\b[^.;]{0,50}\b(?:innocent|guilty)\b/,
    label: 'A probability about people',
    why: 'The probability is a statement about data produced by a model — the mean of nineteen honest transits — not about whether anyone is innocent or guilty. Those are different objects.',
  },
]

/**
 * act-5-03 · what the nineteen's mean delay, and the losses' mean mark, do and do not establish.
 *
 * Six ideas, seven groups (one miss is survivable at `passScore` 0.85): the object is a sampling
 * distribution of a mean of nineteen; it is not about one hull; the honest-flight assumption is stated
 * out loud; the magnitude is cited from a computed figure; the framing is long-run; the context is
 * named; and the limit is named — not honest variation, and nothing yet about who or why.
 */
export function theMachineRubric(): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: 'Names the object: the sampling distribution of the MEAN of nineteen',
      phrasings: ['sampling distribution mean', 'distribution mean nineteen', 'distribution mean 19', 'mean nineteen', 'mean 19', 'xbar nineteen', 'xbar 19', 'mean group nineteen'],
      polarity: 'any',
      feedback: 'Name the object first: this is a statement about the sampling distribution of the mean of nineteen transits, over repeated samples of nineteen.',
    },
    {
      label: 'Says it is NOT a statement about any one hull',
      phrasings: ['not one hull', 'not any hull', 'not one transit', 'not one ship', 'not individual', 'not single hull', 'not each hull', 'not about one'],
      feedback: 'Say what it is not about. No single hull is extreme here — act-5-02 settled that — and a reader who takes this as a claim about one ship has been handed the wrong sentence.',
    },
    {
      label: 'States the assumption: IF the nineteen had flown the Lane honestly',
      phrasings: ['honest transit', 'honest lane', 'honest traffic', 'honest hull', 'honest sample', 'flown honest', 'flew honest', 'assume honest', 'honest ledger', 'ordinary lane traffic'],
      polarity: 'any',
      feedback: 'State the assumption out loud: the probability is computed for nineteen transits drawn from honest Lane traffic. Everything after it is conditional on that.',
    },
    {
      label: 'Cites the magnitude — the computed z or the probability',
      phrasings: [numberRegex(Z_MEAN_19, 2, 1), numberRegex(P_MEAN_19, 6, 1), /10\s*\^?\s*-\s*6\b/, /\bin a million\b/, /\b(?:1|one) in (?:2|two) hundred thousand\b/],
      polarity: 'any',
      feedback: 'Give the size of it, from your own arithmetic: the standardized distance of the nineteen mean from the Lane mean, or the probability attached to it.',
    },
    {
      label: 'Frames it over repeated samples (the long run)',
      phrasings: ['longrun', 'repeated sample', 'repeat sample', 'over all sample', 'sample after sample', 'all possible sample', 'every sample nineteen'],
      polarity: 'any',
      feedback: 'A probability here is a long-run proportion: out of all samples of nineteen the model could produce, this is the share whose mean is at least this late.',
    },
    contextGroup('States the context (Mark-9 delay in days, Lane transits, the nineteen lost Perrine hulls)', ['Mark 9 delay in days against the nominal plot', 'Lane transits', 'the nineteen lost Perrine hulls'], {
      minMatches: 3,
      feedback: 'Anchor it: Mark-9 delay in days against the nominal plot, on Lane transits, for the nineteen lost Perrine hulls.',
    }),
    {
      label: 'States the limit: not honest variation, and nothing yet about who or why',
      phrasings: ['not honest variation', 'not noise', 'not chance', 'not sampling variability', 'not who', 'not why', 'not responsible', 'not which hull', 'not explain', 'not identify'],
      minMatches: 2,
      feedback: 'Close it on both sides: a mean this late is not what honest variation produces — and it does not say which hull, whose hulls, or why.',
    },
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, ...TEST_LANGUAGE, ...MISAPPLICATION]
  const exemplar = `This is a statement about the sampling distribution of the mean of nineteen Mark 9 delays in days, not about any one hull. If those nineteen Perrine transits had flown the Lane honestly — drawn like nineteen honest transits from the Ledger, with the fleet's own centre and spread — then in the long run, over repeated samples of nineteen, a mean this far behind the nominal plot standardizes to about ${fmt(Z_MEAN_19, 2)}, which is a probability of roughly ${fmt(P_MEAN_19 * 1e6, 1)} in a million. A mean of nineteen transits that late is not something honest variation produces, so the group's average lateness in days is not noise. It does not say which hull was late, and it does not say who is responsible or why.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 60, passScore: 0.85 }
}
