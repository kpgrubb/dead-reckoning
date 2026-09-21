/**
 * Act I rubric templates (curriculum map §7): describe-distribution, compare-distributions, and a
 * z-score / relative-position interpretation. Same shape as `@/lib/problems/rubrics` — each returns
 * an `InterpretationAnswer` whose exemplar passes its own rubric (asserted in _rubrics.test.ts).
 *
 * Not a generator file (exports functions only; the registry ignores non-generator exports).
 * Request to the orchestrator: fold these into src/lib/problems/rubrics.ts for later Acts.
 */
import { fmt } from '@/lib/stats/format'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'

export type Shape = 'symmetric' | 'skewRight' | 'skewLeft' | 'bimodal' | 'uniform'

const PROVES: ForbiddenPhrase = { phrase: 'prove', label: 'Claims proof', why: 'A description of data never proves anything about the process that produced it.' }
const CAUSES: ForbiddenPhrase = { phrase: 'cause', label: 'Claims causation', why: 'A distribution describes what was recorded; it does not say why.' }

const SHAPE_PHRASINGS: Record<Shape, RubricPhrase[]> = {
  symmetric: ['symmetric', 'bell', 'mound', 'unimodal', 'single peak', 'one peak', 'not skew', 'roughly normal'],
  skewRight: ['skew right', 'right skew', 'skew greater', 'tail greater', 'tail right', 'long right', 'skew toward greater', 'positive skew'],
  skewLeft: ['skew left', 'left skew', 'skew less', 'tail less', 'tail left', 'long left', 'skew toward less', 'negative skew'],
  bimodal: ['bimodal', 'two peak', 'two cluster', 'two pile', 'two mode', 'two group', 'two hump', 'two mound', 'gap between'],
  uniform: ['uniform', 'flat', 'even', 'rectangular', 'not peak'],
}

const SHAPE_WORDS: Record<Shape, string> = {
  symmetric: 'roughly symmetric and single-peaked',
  skewRight: 'skewed to the right (a long tail toward larger values)',
  skewLeft: 'skewed to the left (a long tail toward smaller values)',
  bimodal: 'bimodal — two separate piles with a gap between them',
  uniform: 'roughly uniform (flat, no clear peak)',
}

function wrongShape(shape: Shape): ForbiddenPhrase[] {
  const out: ForbiddenPhrase[] = []
  if (shape === 'skewRight') out.push({ phrase: 'skew left', label: 'Wrong skew direction', why: 'Skew is named for the direction of the long tail: this tail stretches toward larger values, so the distribution is skewed right.' })
  if (shape === 'skewLeft') out.push({ phrase: 'skew right', label: 'Wrong skew direction', why: 'Skew is named for the direction of the long tail: this tail stretches toward smaller values, so the distribution is skewed left.' })
  if (shape === 'symmetric') out.push({ phrase: 'skew', label: 'Calls a symmetric distribution skewed', why: 'The tails are of similar length on both sides — no skew.' })
  return out
}

export interface DescribeDistributionArgs {
  /** "plume-power ratio", "time to silence". */
  variable: string
  /** "percent of the class-table expectation", "hours". Content words become the units group. */
  units?: string
  /** "the 60 Lane contacts". */
  population: string
  shape: Shape
  /** Center to cite (median or mean). Either value counts. */
  center: number | number[]
  /** Spread values that count (SD, IQR, range) — any one. */
  spread: number | number[]
  spreadLabel?: string
  /** The unusual feature: an outlier at a value, a gap, or none. */
  unusual?: { kind: 'outlier'; value: number } | { kind: 'gap'; between: [number, number] } | { kind: 'none' }
  digits?: number
}

/** SOCS in context: shape, center (value), spread (value), unusual features, context + units. */
export function describeDistribution({ variable, units, population, shape, center, spread, spreadLabel, unusual = { kind: 'none' }, digits = 1 }: DescribeDistributionArgs): InterpretationAnswer {
  const centers = Array.isArray(center) ? center : [center]
  const spreads = Array.isArray(spread) ? spread : [spread]
  const required: RubricGroup[] = [
    { label: `Shape (${SHAPE_WORDS[shape].split(' (')[0].split(' —')[0]})`, phrasings: SHAPE_PHRASINGS[shape], polarity: 'any', feedback: `Name the shape: ${SHAPE_WORDS[shape]}.` },
    { label: 'Names a center (mean / median)', phrasings: ['center', 'mean', 'median', 'middle', 'typical'], polarity: 'any', feedback: 'Say where the center is — a median or mean, with its value.' },
    { label: 'Cites the center value', phrasings: centers.map((c) => numberRegex(c, digits, 1)), polarity: 'any', feedback: `The center is about ${centers.map((c) => fmt(c, digits)).join(' / ')}${units ? ' ' + units : ''}.` },
    { label: 'Describes the spread', phrasings: ['spread', 'vary', 'iqr', 'sd', 'range', 'from', 'between', 'wide', 'narrow', 'tight'], polarity: 'any', feedback: 'Describe the variability — an IQR, SD or range.' },
    { label: `Cites a spread value${spreadLabel ? ` (${spreadLabel})` : ''}`, phrasings: spreads.map((s) => numberRegex(s, digits, 1)), polarity: 'any', feedback: `Give the number: ${spreadLabel ?? 'spread'} ≈ ${spreads.map((s) => fmt(s, digits)).join(' / ')}${units ? ' ' + units : ''}.` },
    unusual.kind === 'outlier'
      ? { label: 'Names the unusual feature (the outlier, with its value)', phrasings: ['outlier', 'unusual', 'extreme', 'far', 'stand', 'apart', 'alone', numberRegex(unusual.value, digits, 1)], minMatches: 2, polarity: 'any', feedback: `One value, ${fmt(unusual.value, digits)}${units ? ' ' + units : ''}, sits far from the rest — say so.` }
      : unusual.kind === 'gap'
        ? { label: 'Names the unusual feature (the gap)', phrasings: ['gap', 'nothing between', 'empty', 'not between', 'no values between', 'separate'], polarity: 'any', feedback: `There is a gap between ${fmt(unusual.between[0], digits)} and ${fmt(unusual.between[1], digits)} — say so.` }
        : { label: 'Comments on unusual features (none here)', phrasings: ['not outlier', 'not gap', 'not unusual', 'no outlier', 'no gap', 'without outlier', 'outlier', 'gap', 'unusual'], polarity: 'any', feedback: 'Say whether there are outliers or gaps (there are none).' },
    contextGroup('States the context (variable and population)', [variable, population], { feedback: `Say what and whom: ${variable} of ${population}.` }),
  ]
  if (units) required.push(contextGroup('Gives the units', [units], { minMatches: 1, feedback: `Units: ${units}.` }))
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, CAUSES, ...wrongShape(shape)]
  const u = units ? ` ${units}` : ''
  const unusualText =
    unusual.kind === 'outlier'
      ? ` One value, ${fmt(unusual.value, digits)}${u}, is an outlier standing far from the rest.`
      : unusual.kind === 'gap'
        ? ` There is a gap with no values between ${fmt(unusual.between[0], digits)} and ${fmt(unusual.between[1], digits)}${u}.`
        : ' There are no outliers or gaps.'
  const exemplar = `The distribution of ${variable} for ${population} is ${SHAPE_WORDS[shape]}, with a center (median) near ${fmt(centers[0], digits)}${u} and a spread of ${spreadLabel ?? 'about'} ${fmt(spreads[0], digits)}${u}.${unusualText}`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 15 }
}

export interface CompareDistributionsArgs {
  groupA: string
  groupB: string
  variable: string
  units?: string
  centerA: number
  centerB: number
  spreadA: number
  spreadB: number
  centerLabel?: string
  spreadLabel?: string
  /** One clause about shape / unusual features, e.g. "the losses cluster tightly at Mark 9–10 while all incidents are spread evenly". */
  shapeNote?: string
  digits?: number
}

/**
 * Comparison in context with comparative language: centers compared (values cited), spreads compared,
 * shape / unusual features mentioned, both groups and the variable named. Two separate descriptions
 * without a comparative word fail the first group.
 */
export function compareDistributions({ groupA, groupB, variable, units, centerA, centerB, spreadA, spreadB, centerLabel = 'median', spreadLabel = 'IQR', shapeNote, digits = 1 }: CompareDistributionsArgs): InterpretationAnswer {
  const centerDir = centerA > centerB ? 'greater' : centerA < centerB ? 'less' : 'equal'
  const spreadDir = spreadA > spreadB ? 'greater' : spreadA < spreadB ? 'less' : 'equal'
  const required: RubricGroup[] = [
    { label: 'Uses comparative language (greater / less / more variable / similar…)', phrasings: ['greater', 'less', 'similar', 'same', 'differ', 'compared', 'wider', 'narrower', 'tighter', 'later', 'earlier', 'cheaper', 'dearer', 'versus', 'vs', 'while', 'whereas', 'both'], polarity: 'any', feedback: 'A comparison is one sentence with "than" in it: say which group is higher, wider, later.' },
    { label: `Compares the centers (${groupA} ${centerDir === 'equal' ? 'about equal to' : centerDir}) `, phrasings: ['center', 'median', 'mean', 'typical', 'middle'], polarity: 'any', feedback: `Compare the centers: ${centerLabel} ${fmt(centerA, digits)} for ${groupA} versus ${fmt(centerB, digits)} for ${groupB}.` },
    { label: 'Cites the center values', phrasings: [numberRegex(centerA, digits, 1), numberRegex(centerB, digits, 1)], minMatches: 2, polarity: 'any', feedback: `Give both: ${fmt(centerA, digits)} and ${fmt(centerB, digits)}${units ? ' ' + units : ''}.` },
    { label: `Compares the spreads (${groupA} ${spreadDir === 'equal' ? 'about as variable as' : spreadDir === 'greater' ? 'more variable than' : 'less variable than'} ${groupB})`, phrasings: ['spread', 'vary', 'iqr', 'sd', 'range', 'consistent', 'wide', 'narrow', 'tight', 'cluster', 'concentrated'], polarity: 'any', feedback: `Compare the variability: ${spreadLabel} ${fmt(spreadA, digits)} versus ${fmt(spreadB, digits)}.` },
    { label: 'Mentions shape or unusual features', phrasings: ['skew', 'symmetric', 'outlier', 'peak', 'cluster', 'bimodal', 'gap', 'tail', 'unusual', 'mound', 'uniform', 'flat', 'pile', 'concentrated', 'even'], polarity: 'any', feedback: 'Say something about shape (skew, clusters, flatness) or unusual values in each group.' },
    contextGroup('Names both groups', [groupA, groupB], { minMatches: 2, feedback: `Name both groups: ${groupA} and ${groupB}.` }),
    contextGroup(`Names the variable${units ? ' (with units)' : ''}`, [variable, units ?? ''], { minMatches: 1, feedback: `Say what was measured: ${variable}${units ? ' in ' + units : ''}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, CAUSES]
  if (centerDir !== 'equal') {
    forbidden.push({
      phrase: new RegExp(`\\b(?:center|median|mean|typical)\\b[^.;]{0,40}\\b${centerDir === 'greater' ? 'less' : 'greater'}\\b[^.;]{0,30}\\b(?:${groupB.toLowerCase().split(/\s+/)[0]})`),
      label: 'Wrong direction for the centers',
      why: `${groupA} has the ${centerDir === 'greater' ? 'higher' : 'lower'} center (${fmt(centerA, digits)} versus ${fmt(centerB, digits)}).`,
    })
  }
  const u = units ? ` ${units}` : ''
  const centerSentence = centerDir === 'equal' ? `The centers are about the same (${centerLabel} ${fmt(centerA, digits)} versus ${fmt(centerB, digits)}${u})` : `The ${variable} of ${groupA} is centered ${centerDir === 'greater' ? 'higher' : 'lower'} than that of ${groupB} (${centerLabel} ${fmt(centerA, digits)} versus ${fmt(centerB, digits)}${u})`
  const spreadSentence = spreadDir === 'equal' ? `and the two groups are about equally spread (${spreadLabel} ${fmt(spreadA, digits)} versus ${fmt(spreadB, digits)})` : `and ${groupA} ${spreadDir === 'greater' ? 'is more variable' : 'is less variable'} (${spreadLabel} ${fmt(spreadA, digits)} versus ${fmt(spreadB, digits)})`
  const exemplar = `${centerSentence}, ${spreadSentence}. ${shapeNote ?? `Neither group shows strong skew, and there are no outliers in either.`}`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 18 }
}

export interface CompareCategoricalArgs {
  groupA: string
  groupB: string
  /** The category compared: "unknown". */
  category: string
  /** Proportions (0–1) of that category in each group. */
  propA: number
  propB: number
  /** The categorical variable: "classification". */
  variable: string
}

/**
 * Categorical comparison in context: comparative language, both groups' proportions cited (as percent
 * or decimal), proportion language (not raw counts), the category and both groups named.
 */
export function compareCategorical({ groupA, groupB, category, propA, propB, variable }: CompareCategoricalArgs): InterpretationAnswer {
  const pA = propA * 100
  const pB = propB * 100
  const dir = propA > propB ? 'greater' : propA < propB ? 'less' : 'equal'
  const required: RubricGroup[] = [
    { label: 'Uses comparative language', phrasings: ['greater', 'less', 'similar', 'same', 'differ', 'compared', 'versus', 'vs', 'while', 'whereas', 'both'], polarity: 'any', feedback: 'Compare the two groups in one sentence: which coded the category more often?' },
    { label: `Cites ${groupA}'s proportion (${fmt(pA, 0)}%)`, phrasings: [numberRegex(pA, 0, 1), numberRegex(propA, 2, 1)], polarity: 'any', feedback: `${groupA}: ${fmt(pA, 0)} percent (${fmt(propA, 2)}).` },
    { label: `Cites ${groupB}'s proportion (${fmt(pB, 0)}%)`, phrasings: [numberRegex(pB, 0, 1), numberRegex(propB, 2, 1)], polarity: 'any', feedback: `${groupB}: ${fmt(pB, 0)} percent (${fmt(propB, 2)}).` },
    { label: 'Compares proportions, not counts', phrasings: ['percent', 'proportion', 'share', 'fraction', 'rate', 'relative'], polarity: 'any', feedback: 'The groups are different sizes: compare relative frequencies (percent), not counts.' },
    contextGroup(`Names the category (${category})`, [category], { minMatches: 1, feedback: `Say which code: ${category}.` }),
    contextGroup('Names both groups', [groupA, groupB], { minMatches: 2, feedback: `Name both: ${groupA} and ${groupB}.` }),
    contextGroup('Names the variable', [variable], { minMatches: 1, optional: true }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, CAUSES]
  const exemplar = dir === 'equal'
    ? `${groupA} and ${groupB} coded about the same share of their losses as ${category} (${fmt(pA, 0)} percent versus ${fmt(pB, 0)} percent).`
    : `${groupA} coded ${fmt(pA, 0)} percent of its losses as ${category}, a ${dir === 'greater' ? 'far greater' : 'far smaller'} share than ${groupB}'s ${fmt(pB, 0)} percent — the ${variable} differs by office, not just in count.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 12 }
}

export interface ZScoreArgs {
  z: number
  value: number
  mean: number
  sd: number
  variable: string
  units?: string
  population: string
  /** Upper- or lower-tail proportion under the model, if the item asks for it too. */
  tail?: { proportion: number; side: 'above' | 'below' }
  digits?: number
}

/**
 * Relative position: cites z, says "standard deviations", direction (above / below the mean), the mean,
 * context; optionally the tail proportion. Forbids treating z as a probability.
 */
export function zScoreInterpretation({ z, value, mean, sd, variable, units, population, tail, digits = 2 }: ZScoreArgs): InterpretationAnswer {
  const above = z >= 0
  const required: RubricGroup[] = [
    { label: 'Cites the z-score', phrasings: [numberRegex(Math.abs(z), digits, 1)], polarity: 'any', feedback: `z = ${fmt(z, digits)}.` },
    { label: 'Measures in standard deviations', phrasings: ['sd', 'sigma', 'standard'], polarity: 'any', feedback: 'A z-score counts standard deviations, so say "standard deviations".' },
    { label: `Direction (${above ? 'above' : 'below'} the mean)`, phrasings: [above ? 'greater' : 'less', above ? 'above' : 'below'], polarity: 'any', feedback: `The value is ${above ? 'above' : 'below'} the mean.` },
    { label: 'References the mean (or the model)', phrasings: ['mean', 'average', 'model', 'expect', numberRegex(mean, 1, 1)], polarity: 'any', feedback: `Say what it is measured from: the mean of ${fmt(mean, 1)}${units ? ' ' + units : ''}.` },
    contextGroup('States the context', [variable, population], { feedback: `Say what and whom: ${variable} of ${population}.` }),
  ]
  if (tail) {
    required.push({ label: `Gives the ${tail.side === 'above' ? 'upper' : 'lower'}-tail proportion`, phrasings: [numberRegex(tail.proportion, 4, 1), numberRegex(tail.proportion * 100, 2, 1), 'one in', 'percent'], minMatches: 1, polarity: 'any', feedback: `Under the model, the proportion ${tail.side} this value is ${fmt(tail.proportion, 4)}.` })
  }
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    PROVES,
    { phrase: above ? 'below mean' : 'above mean', label: 'Wrong direction', why: `z = ${fmt(z, digits)} is ${above ? 'positive: above' : 'negative: below'} the mean.` },
    { phrase: /\bz\b[^.;]{0,20}\b(?:probability|chance|percent)\b/, label: 'Reads z as a probability', why: 'z is a distance in standard deviations; the probability is the area under the model beyond it.' },
  ]
  const u = units ? ` ${units}` : ''
  const tailText = tail ? ` Under the normal model, the proportion of ${population} ${tail.side} this value is ${fmt(tail.proportion, 4)} (about ${fmt(tail.proportion * 100, 2)} percent).` : ''
  const exemplar = `A ${variable} of ${fmt(value, 1)}${u} is ${fmt(Math.abs(z), digits)} standard deviations ${above ? 'above' : 'below'} the mean of ${fmt(mean, 1)}${u} for ${population} (SD ${fmt(sd, 2)}${u}).${tailText}`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 10 }
}
