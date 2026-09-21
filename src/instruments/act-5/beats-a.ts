/**
 * Interpretation rubrics for the Act V mission beats in act-5-01 (spread into
 * <MissionBeat kind="interpretation">). Pure functions returning `InterpretationAnswer`; the exemplar
 * passes its own rubric, and `beats-a.test.ts` proves it.
 *
 * Phrasings are token phrases matched by the rubric engine after normalization (see
 * src/lib/problems/rubric.ts): "sampling variability" → tokens ["sample", "vary"], "rate" canonicalises
 * to "proportion", numbers intact for RegExp phrasings.
 *
 * Act V builds null models; Act VI runs the tests. Nothing here accepts — or asks for — a test
 * statistic, a P-value or a reject / fail-to-reject conclusion.
 */
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { fmt, fmtInt, samplingSdProportion } from '@/lib/stats'
import { CUTTERS, POOLED_RATE } from './data'

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'Two patrol summaries never prove anything about the Lane. They are two draws from a distribution of possible summaries.',
}

/** The patrol size the Act quotes for a cutter's observed record: both cutters saw about 400 transits. */
export const PATROL_N = 400

/**
 * The standard deviation of one patrol's observed loss rate at n ≈ 400, under the Lane's own pooled
 * rate — the magnitude the learner has to put on the disagreement. About a third of a percentage point.
 */
export const PATROL_SD = samplingSdProportion(POOLED_RATE, PATROL_N)

/**
 * act-5-01 · why *Asgard* and *Tindr* honestly disagree, and how much disagreement n ≈ 400 produces.
 *
 * Required: each cutter saw a sample, not the Lane; different transits give different statistics, and
 * the Lane's rate is the parameter; the name for the gap is sampling variability; the magnitude, cited;
 * and the context. Forbidden: accusing either cutter, reading the gap as a real difference between two
 * corridors, dismissing a patrol as too small to be valid, proof, and any significance-test language.
 */
export function cuttersDisagreeRubric(): InterpretationAnswer {
  const a = CUTTERS.asgard
  const b = CUTTERS.tindr
  const required: RubricGroup[] = [
    {
      label: 'Says each cutter observed a sample of the Lane, not the Lane',
      phrasings: ['sample', 'subset', 'portion', 'window', 'part of the lane', 'transit observed', 'observed transit'],
      polarity: 'any',
      feedback: `Start with what each figure is a figure of: ${a.name} watched ${fmtInt(a.transits)} transits and ${b.name} watched ${fmtInt(b.transits)} — samples of the Lane, not the Lane.`,
    },
    {
      label: 'Names both words: the two reports are statistics, the Lane rate is the parameter',
      phrasings: ['statistic', 'parameter'],
      minMatches: 2,
      polarity: 'any',
      feedback: 'Use both words. Each cutter wrote down a statistic; the Lane’s own loss rate is the parameter, and neither cutter observed it.',
    },
    {
      label: 'Names the gap as sampling variability rather than an error by either cutter',
      phrasings: ['sample vary', 'random vary', 'vary sample', 'expect vary', 'ordinary vary', 'differ transit', 'differ sample'],
      polarity: 'any',
      feedback: 'Name the mechanism and then name it: different transits give different statistics, and the gap that follows is sampling variability.',
    },
    {
      label: 'Gives the size of the disagreement expected at n ≈ 400',
      phrasings: [numberRegex(PATROL_SD, 3, 1), numberRegex(100 * PATROL_SD, 2, 1)],
      polarity: 'any',
      feedback: `Put a size on it. At about ${fmtInt(PATROL_N)} observed transits the standard deviation of one patrol’s loss rate is ${fmt(PATROL_SD, 4)} — about ${fmt(100 * PATROL_SD, 2)} of a percentage point.`,
    },
    contextGroup('States the context (the Lane loss rate and the two cutters)', ['the Lane loss rate', `the cutters ${a.name} ${b.name}`], {
      minMatches: 2,
      feedback: `Say what and whom: the Hundred-Day Lane’s loss rate, as observed by ${a.name} and ${b.name}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    { phrase: 'lying', label: 'Accuses a cutter', why: 'Nothing here is evidence that either cutter misreported. Two honest patrols of this size are expected to disagree by about this much.' },
    { phrase: 'cutter wrong', label: 'Accuses a cutter', why: 'Neither report is wrong. Both are exact counts of what each cutter actually saw; the Lane rate is a third number that neither of them observed.' },
    { phrase: 'report wrong', label: 'Accuses a cutter', why: 'Neither report is wrong. Both are exact counts of what each cutter actually saw.' },
    { phrase: 'cutter mistaken', label: 'Accuses a cutter', why: 'Neither cutter made a mistake. Different samples give different statistics even when every count is exact.' },
    {
      phrase: /\b(?:reports?|patrols?|figures?|cutters?)\b[^.;:]{0,40}\b(?:real|genuine|actual)\s+(?:differ\w*|gap)/,
      label: 'Treats the gap as a real difference',
      why: 'Both cutters were watching the same Lane. The gap between their figures is a property of sampling, not of the corridor.',
    },
    {
      phrase: /\b(?:sample|patrol|window)\b[^.;:]{0,30}\b(?:too small|not valid|invalid|useless|worthless)\b/,
      label: '“The patrol was too small to be valid”',
      why: 'Size is not validity. A small patrol has a wide sampling distribution, which is a quantified amount of imprecision — not a reason to discard the report.',
    },
    { phrase: 'not valid', label: '“The patrol was too small to be valid”', why: 'A small patrol is imprecise, not invalid. Its sampling distribution says exactly how imprecise.' },
    {
      phrase: /\breject\b/,
      label: 'Runs a significance test',
      why: 'Act V builds the null model; Act VI tests against it. Nothing on this display licenses a reject or fail-to-reject conclusion.',
    },
    {
      phrase: /\bstatistically significant\b/,
      label: 'Runs a significance test',
      why: 'Act V builds the null model; Act VI tests against it. No significance claim is available from two patrol summaries.',
    },
    PROVES,
  ]
  const exemplar = `${a.name} observed ${fmtInt(a.transits)} transits and ${b.name} observed ${fmtInt(b.transits)}, so each cutter reported a statistic computed from a sample of the Lane rather than the Lane itself, and the Lane's own loss rate is a parameter that neither of them measured. Different transits give different sample proportions, so two cutters counting exactly still write down different figures. The gap between them is ordinary sampling variability: at about ${fmtInt(PATROL_N)} observed transits the standard deviation of one patrol's loss rate is roughly ${fmt(PATROL_SD, 4)}, about ${fmt(100 * PATROL_SD, 2)} of a percentage point, so two honest Lane patrols routinely land this far apart or further.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 40 }
}
