/**
 * AP-grade rubric templates. Each returns an `InterpretationAnswer` (required groups, forbidden
 * claims with explanations, exemplar) so Act Teams get consistent "conclusion in context" grading
 * without hand-writing phrasings. All numbers passed in must come from @/lib/stats.
 *
 * Every exemplar passes its own rubric (asserted in tests and by `defineGenerator`).
 * See docs/problem-authoring.md §Rubric templates for the parameters.
 */
import { fmt, fmtP } from '@/lib/stats/format'
import { contextGroup, numberPattern, numberRegex } from './rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from './types'

export interface Context {
  /** Who the conclusion is about: "freighters on the Callisto corridor". */
  population: string
  /** What was measured: "transit time". */
  variable: string
  units?: string
}

export type Parameter = 'mean' | 'proportion' | 'slope' | 'difference in means' | 'difference in proportions' | 'mean difference' | 'standard deviation'

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'Statistical conclusions never prove anything; they provide (or fail to provide) convincing evidence.',
}
const CAUSES: ForbiddenPhrase = {
  phrase: 'cause',
  label: 'Claims causation',
  why: 'Observational data describe association. A slope or correlation does not establish that one variable causes the other.',
}
const ACCEPT_NULL: ForbiddenPhrase = {
  phrase: 'accept null',
  label: 'Accepts H₀',
  why: 'We never accept H₀. Failing to reject means the data are consistent with H₀, not that H₀ is true.',
}
const PROB_NULL_TRUE: ForbiddenPhrase = {
  phrase: /\b(?:probability|chance|likelihood|odds|likely)\b[^.;]{0,40}\bnull\b[^.;]{0,25}\b(?:true|correct|right|false|wrong)\b/,
  label: 'Probability that H₀ is true',
  why: 'A p-value is the probability of data at least this extreme IF H₀ is true — not the probability that H₀ is true.',
}

function parameterPhrasings(parameter: Parameter | string): RubricPhrase[] {
  switch (parameter) {
    case 'mean':
      return ['mean', 'mu']
    case 'proportion':
      return ['proportion', 'percent', 'phat', 'rate']
    case 'slope':
      return ['slope', 'beta']
    case 'difference in means':
      return ['differ mean', 'mean differ', 'mu']
    case 'difference in proportions':
      return ['differ proportion', 'proportion differ', 'differ percent']
    case 'mean difference':
      return ['mean differ', 'differ mean', 'mu']
    case 'standard deviation':
      return ['sd', 'sigma']
    default:
      return [String(parameter)]
  }
}

function unitsSuffix(units?: string): string {
  return units ? ` ${units}` : ''
}

// ---------------------------------------------------------------------------------------------
// Confidence interval
// ---------------------------------------------------------------------------------------------

export interface ConfidenceIntervalArgs {
  /** 0.95 or 95. */
  level: number
  parameter: Parameter | string
  lower: number
  upper: number
  context: Context
  digits?: number
}

/** "We are 95% confident that the true mean transit time of all corridor freighters is between 10.2 and 12.4 hours." */
export function confidenceIntervalInterpretation({ level, parameter, lower, upper, context, digits = 2 }: ConfidenceIntervalArgs): InterpretationAnswer {
  const pct = level > 1 ? level : level * 100
  const pctStr = fmt(pct, Number.isInteger(pct) ? 0 : 1)
  const required: RubricGroup[] = [
    { label: `States the confidence level (${pctStr}%)`, phrasings: [new RegExp(`${numberPattern(pct, 0, 1)}\\s*percent\\b`)], feedback: `Name the level: “${pctStr}% confident”.` },
    { label: 'Uses “confident” language', phrasings: ['confident'], feedback: 'The interval is a statement of confidence in the method, so say “we are … confident that”.' },
    { label: 'Gives both interval endpoints', phrasings: [numberRegex(lower, digits, 1), numberRegex(upper, digits, 1)], minMatches: 2, polarity: 'any', feedback: `State the interval: ${fmt(lower, digits)} to ${fmt(upper, digits)}${unitsSuffix(context.units)}.` },
    { label: 'Refers to the population parameter (true / population …)', phrasings: ['true', 'population', 'parameter', 'all'], polarity: 'any', feedback: 'The interval estimates the TRUE (population) value, not the sample statistic.' },
    { label: `Names the parameter (${parameter})`, phrasings: parameterPhrasings(parameter), polarity: 'any', feedback: `Say which parameter: the ${parameter}.` },
    contextGroup('States the context (population and variable)', [context.population, context.variable], { feedback: `Say what and whom: ${context.variable} of ${context.population}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: new RegExp(`\\b${numberPattern(pct, 0, 1)}\\s*percent of (?:the |all |these |those )?(?!(?:such |possible |similar |all )?(?:intervals?|confidence)\\b)[a-z]+`),
      label: `${pctStr}% of the individuals / data`,
      why: 'The confidence level describes the method that produced the interval, not the proportion of individual values (or samples) that fall inside it.',
    },
    {
      phrase: 'probability',
      label: 'Probability statement about this interval',
      why: 'The parameter is fixed and this interval either captures it or it does not. Confidence is the long-run capture rate of the method, not a probability for one interval.',
    },
    { phrase: /\bpercent (?:likely|sure)\b/, label: 'Probability statement about this interval', why: 'Say “confident”, not “likely” or “sure” — the level describes the method, not this interval.' },
    {
      phrase: `sample ${parameterPhrasings(parameter)[0]}`,
      label: 'Interval about the sample statistic',
      why: `The sample ${parameter} is known exactly; the interval estimates the TRUE (population) ${parameter}.`,
    },
    PROVES,
  ]
  const exemplar = `We are ${pctStr}% confident that the true ${parameter} ${context.variable} of all ${context.population} is between ${fmt(lower, digits)} and ${fmt(upper, digits)}${unitsSuffix(context.units)}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 8 }
}

// ---------------------------------------------------------------------------------------------
// Significance test conclusion
// ---------------------------------------------------------------------------------------------

export interface SignificanceTestArgs {
  pValue: number
  alpha: number
  parameterContext: Context & { parameter: Parameter | string; nullValue?: number | string }
  direction: 'greater' | 'less' | 'two-sided'
  /** Extra direction words for this context ("longer", "slower"). */
  directionWords?: string[]
}

/**
 * Conclusion-in-context for a significance test. Decision consistent with p vs α, p-value and α cited,
 * evidence language, direction of Hₐ, context; forbids "proves", "accept H₀", "probability H₀ is true"
 * and the wrong decision.
 */
export function significanceTestConclusion({ pValue, alpha, parameterContext: ctx, direction, directionWords = [] }: SignificanceTestArgs): InterpretationAnswer {
  const reject = pValue < alpha
  const pStr = fmtP(pValue)
  const alphaStr = fmt(alpha, alpha < 0.01 ? 3 : 2)
  const dirPhr: RubricPhrase[] = direction === 'greater' ? ['greater', 'more'] : direction === 'less' ? ['less', 'fewer'] : ['differ', 'not equal', 'not same']
  const dirText = direction === 'greater' ? 'greater than' : direction === 'less' ? 'less than' : 'different from'
  const pPhrasings: RubricPhrase[] = [/\bpvalue\b[^;]{0,24}\b(?:less|greater|equal|approximately)\b/]
  if (pValue >= 0.0001) pPhrasings.push(numberRegex(pValue, 4, 2))
  else pPhrasings.push(/\bless (?:0\.0+1|\.0+1)\b/)

  const required: RubricGroup[] = [
    reject
      ? { label: 'Decision: reject H₀', phrasings: ['reject', 'significant', 'convincing evidence'], feedback: `p = ${pStr} < α = ${alphaStr}, so reject H₀ and say so.` }
      : { label: 'Decision: fail to reject H₀', phrasings: ['not reject', 'not significant', 'not enough evidence', 'not evidence', 'not convincing', 'not conclude'], feedback: `p = ${pStr} ≥ α = ${alphaStr}: fail to reject H₀ (do not “accept” it).` },
    { label: 'States the p-value', phrasings: pPhrasings, polarity: 'any', feedback: `Cite the p-value (${pStr}).` },
    { label: 'Compares to α', phrasings: [numberRegex(alpha, 2, 1), 'alpha'], polarity: 'any', feedback: `Compare the p-value to α = ${alphaStr}.` },
    ...(reject ? [{ label: 'Frames the conclusion as evidence, not fact', phrasings: ['evidence', 'conclude', 'significant'], feedback: 'Say there is convincing evidence that…, not that the alternative is true.' } as RubricGroup] : []),
    { label: `Direction of Hₐ (${dirText} ${ctx.nullValue ?? ''})`.trim(), phrasings: [...dirPhr, ...directionWords], polarity: 'any', feedback: `State the alternative: the ${ctx.parameter} is ${dirText} ${ctx.nullValue ?? 'the null value'}.` },
    contextGroup('Conclusion in context (population and variable)', [ctx.population, ctx.variable], { feedback: `Say what and whom: the ${ctx.parameter} ${ctx.variable} of ${ctx.population}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, ACCEPT_NULL, PROB_NULL_TRUE]
  if (reject) {
    forbidden.push({ phrase: 'not reject', label: 'Fails to reject', why: `The p-value (${pStr}) is below α = ${alphaStr}: the data are unlikely under H₀, so the decision is to reject H₀.` })
  } else {
    forbidden.push({ phrase: 'reject', label: 'Rejects H₀', why: `The p-value (${pStr}) is not below α = ${alphaStr}: the data are consistent with H₀, so we fail to reject H₀.` })
  }
  const nullText = ctx.nullValue !== undefined ? ` ${ctx.nullValue}${unitsSuffix(ctx.units)}` : ''
  const exemplar = reject
    ? `Because the p-value (${pStr}) is less than α = ${alphaStr}, we reject H₀. There is convincing evidence that the true ${ctx.parameter} ${ctx.variable} of ${ctx.population} is ${dirText}${nullText}.`
    : `Because the p-value (${pStr}) is greater than α = ${alphaStr}, we fail to reject H₀. There is not convincing evidence that the true ${ctx.parameter} ${ctx.variable} of ${ctx.population} is ${dirText}${nullText}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 10 }
}

// ---------------------------------------------------------------------------------------------
// Regression
// ---------------------------------------------------------------------------------------------

export interface SlopeArgs {
  slope: number
  xVar: string
  yVar: string
  xUnits?: string
  yUnits?: string
  digits?: number
}

/** "For each additional tonne of declared cargo, the predicted fuel burn increases by about 0.42 kg." */
export function slopeInterpretation({ slope, xVar, yVar, xUnits, yUnits, digits = 2 }: SlopeArgs): InterpretationAnswer {
  const up = slope > 0
  const required: RubricGroup[] = [
    { label: 'Cites the slope value', phrasings: [numberRegex(Math.abs(slope), digits, 1)], polarity: 'any', feedback: `The slope is ${fmt(slope, digits)}.` },
    { label: 'Uses “predicted” / “on average” language', phrasings: ['predict', 'mean', 'expect', 'typical'], feedback: 'The slope describes the PREDICTED (average) change, not what happens to every individual.' },
    { label: `Direction (${up ? 'increase' : 'decrease'})`, phrasings: [up ? 'greater' : 'less'], polarity: 'any', feedback: `The response ${up ? 'increases' : 'decreases'} as ${xVar} increases.` },
    { label: `Per one-unit change in ${xVar}`, phrasings: ['perunit', 'unit', '1', 'one', 'additional'], polarity: 'any', feedback: `Say “for each additional ${xUnits ?? 'unit of ' + xVar}”.` },
    contextGroup('Names both variables', [xVar, yVar], { minMatches: 2, feedback: `Name the explanatory (${xVar}) and response (${yVar}) variables.` }),
  ]
  const forbidden = [CAUSES, PROVES]
  const exemplar = `For each additional ${xUnits ?? 'unit of ' + xVar}, the predicted ${yVar} ${up ? 'increases' : 'decreases'} by about ${fmt(Math.abs(slope), digits)}${unitsSuffix(yUnits)}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 8 }
}

export interface RSquaredArgs {
  /** r² as a proportion (0–1) or a percent. */
  r2: number
  xVar: string
  yVar: string
}

/** "About 64% of the variation in fuel burn is explained by the linear relationship with declared cargo mass." */
export function rSquaredInterpretation({ r2, xVar, yVar }: RSquaredArgs): InterpretationAnswer {
  const pct = r2 <= 1 ? r2 * 100 : r2
  const prop = pct / 100
  const required: RubricGroup[] = [
    { label: 'States the value of r²', phrasings: [new RegExp(`${numberPattern(pct, 1, 1)}\\s*percent`), numberRegex(prop, 2, 1)], polarity: 'any', feedback: `r² = ${fmt(pct, 1)}%.` },
    { label: `Variation / variability in ${yVar}`, phrasings: ['vary'], polarity: 'any', feedback: `r² is a share of the VARIATION in ${yVar}.` },
    { label: 'Explained / accounted for by the linear relationship (the model)', phrasings: ['explain'], polarity: 'any', feedback: `…is explained by the linear relationship with ${xVar}.` },
    contextGroup('Names the response and explanatory variables', [yVar, xVar], { minMatches: 2, feedback: `Name both variables: ${yVar} and ${xVar}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: /\d+(?:\.\d+)? percent of (?:the |all )?(?:data|points|observations|values|dots|cases|freighters|ships|vessels)\b/,
      label: 'Percent of the data points',
      why: 'r² is the fraction of the VARIATION in the response explained by the model — not the fraction of points that lie on the line.',
    },
    CAUSES,
    PROVES,
  ]
  const exemplar = `About ${fmt(pct, 1)}% of the variation in ${yVar} is explained by the linear relationship with ${xVar}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 8 }
}

export interface CorrelationArgs {
  r: number
  xVar: string
  yVar: string
}

/** "There is a strong positive linear association between declared cargo mass and fuel burn (r = 0.83)." */
export function correlationDescription({ r, xVar, yVar }: CorrelationArgs): InterpretationAnswer {
  const a = Math.abs(r)
  const positive = r > 0
  let strength: RubricPhrase[]
  let strengthWord: string
  if (a >= 0.7) {
    strength = a < 0.8 ? ['strong', 'moderate'] : ['strong']
    strengthWord = 'strong'
  } else if (a >= 0.4) {
    strength = ['moderate', ...(a >= 0.6 ? ['strong'] : []), ...(a < 0.5 ? ['weak'] : [])]
    strengthWord = 'moderate'
  } else {
    strength = a >= 0.3 ? ['weak', 'moderate'] : ['weak', 'not association', 'not correlation', 'little']
    strengthWord = 'weak'
  }
  const required: RubricGroup[] = [
    { label: `Direction (${positive ? 'positive' : 'negative'})`, phrasings: [positive ? 'positive' : 'negative'], polarity: 'any', feedback: `r = ${fmt(r, 2)} is ${positive ? 'positive' : 'negative'}.` },
    { label: `Strength (${strengthWord})`, phrasings: strength, polarity: 'any', feedback: `|r| = ${fmt(a, 2)} indicates a ${strengthWord} association.` },
    { label: 'Form (linear)', phrasings: ['linear'], polarity: 'any', feedback: 'r measures LINEAR association; say so.' },
    { label: 'Calls it an association / correlation', phrasings: ['association', 'correlation'], polarity: 'any', feedback: 'Describe the association (or relationship) between the variables.' },
    contextGroup('Names both variables', [xVar, yVar], { minMatches: 2, feedback: `Name both variables: ${xVar} and ${yVar}.` }),
    { label: 'Cites r', phrasings: [numberRegex(r, 2, 1)], polarity: 'any', optional: true },
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    CAUSES,
    PROVES,
    { phrase: positive ? 'negative' : 'positive', label: 'Wrong direction', why: `r = ${fmt(r, 2)}: the association is ${positive ? 'positive' : 'negative'}.` },
  ]
  const exemplar = `There is a ${strengthWord} ${positive ? 'positive' : 'negative'} linear association between ${xVar} and ${yVar} (r = ${fmt(r, 2)}).`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 7 }
}

export interface ResidualArgs {
  /** actual − predicted */
  residual: number
  yVar: string
  yUnits?: string
  xVar?: string
  xValue?: number | string
  digits?: number
}

/** "The residual is −3.1 kg: the actual fuel burn was 3.1 kg less than the line predicted; the model overestimates this freighter." */
export function residualInterpretation({ residual, yVar, yUnits, xVar, xValue, digits = 2 }: ResidualArgs): InterpretationAnswer {
  const pos = residual > 0
  const dir: RubricPhrase[] = pos
    ? ['actual greater predict', 'greater predict', 'underestimate', 'predict less actual', 'greater line', 'greater expect', 'actual greater', 'line less']
    : ['actual less predict', 'less predict', 'overestimate', 'predict greater actual', 'less line', 'less expect', 'actual less', 'line greater']
  const required: RubricGroup[] = [
    { label: 'Cites the residual magnitude', phrasings: [numberRegex(Math.abs(residual), digits, 1)], polarity: 'any', feedback: `The residual is ${fmt(residual, digits)}${unitsSuffix(yUnits)}.` },
    { label: `Direction: actual ${pos ? 'above' : 'below'} predicted (model ${pos ? 'underestimates' : 'overestimates'})`, phrasings: dir, polarity: 'any', feedback: `Residual = actual − predicted ${pos ? '> 0' : '< 0'}: the actual value is ${pos ? 'greater' : 'less'} than predicted; the line ${pos ? 'underestimates' : 'overestimates'}.` },
    contextGroup('Names the response variable', [yVar], { minMatches: 1, feedback: `Say what was ${pos ? 'under' : 'over'}estimated: ${yVar}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    { phrase: pos ? 'overestimate' : 'underestimate', label: 'Wrong direction', why: `Residual = actual − predicted = ${fmt(residual, digits)}: the model ${pos ? 'under' : 'over'}estimates this point.` },
    PROVES,
  ]
  const at = xValue !== undefined ? ` at ${xVar ?? 'x'} = ${xValue}` : ''
  const exemplar = `The residual is ${fmt(residual, digits)}${unitsSuffix(yUnits)}: the actual ${yVar}${at} was ${fmt(Math.abs(residual), digits)}${unitsSuffix(yUnits)} ${pos ? 'greater' : 'less'} than the value predicted by the regression line, so the line ${pos ? 'underestimates' : 'overestimates'} this point.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 8 }
}

// ---------------------------------------------------------------------------------------------
// One-variable & probability
// ---------------------------------------------------------------------------------------------

export interface StandardDeviationArgs {
  sd: number
  variable: string
  units?: string
  population?: string
  mean?: number
  digits?: number
}

/** "The transit times of corridor freighters typically vary by about 2.4 hours from the mean of 31.6 hours." */
export function standardDeviationInterpretation({ sd, variable, units, population, mean, digits = 2 }: StandardDeviationArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    { label: 'Cites the standard deviation', phrasings: [numberRegex(sd, digits, 1)], polarity: 'any', feedback: `s = ${fmt(sd, digits)}${unitsSuffix(units)}.` },
    { label: 'Uses “typically” / “on average” language', phrasings: ['typical', /\baverage\b/, 'usual'], polarity: 'any', feedback: 'The SD is a TYPICAL distance from the mean — not a maximum or a range.' },
    { label: 'Describes distance / variation from the mean', phrasings: ['vary', 'distance', 'differ'], polarity: 'any', feedback: 'Say the values vary (deviate) from the mean by about this much.' },
    { label: 'References the mean', phrasings: ['mean', /\bcenter\b/], polarity: 'any', feedback: 'The SD is measured from the mean.' },
    contextGroup('States the context', [variable, population ?? ''], { minMatches: 1, feedback: `Say what varies: ${variable}${population ? ' of ' + population : ''}.` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    {
      phrase: /\b(?:all|every|each) (?:of the )?(?:[a-z]+ ){0,3}(?:are |is |lie |lies |fall |falls )?(?:within|inside|between)\b/,
      label: 'Treats the SD as a bound',
      why: 'The standard deviation is a typical distance from the mean, not a limit that every value stays inside.',
    },
    PROVES,
  ]
  const exemplar = `The ${variable}${population ? ' of ' + population : ''} typically varies by about ${fmt(sd, digits)}${unitsSuffix(units)} from the mean${mean !== undefined ? ` of ${fmt(mean, digits)}${unitsSuffix(units)}` : ''}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 8 }
}

export interface ExpectedValueArgs {
  value: number
  /** What the random variable measures: "heat-sink capacity burned". */
  variable: string
  units?: string
  /** The repeated chance process, plural: "cold-running patrols". */
  context: string
  digits?: number
}

/** "Over many cold-running patrols, the heat-sink capacity burned would average about 3.2 units per patrol." */
export function expectedValueInterpretation({ value, variable, units, context, digits = 2 }: ExpectedValueArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    { label: 'Cites the expected value', phrasings: [numberRegex(value, digits, 1)], polarity: 'any', feedback: `E(X) = ${fmt(value, digits)}${unitsSuffix(units)}.` },
    { label: 'Long-run / many repetitions language', phrasings: ['longrun', 'repeat', 'many'], polarity: 'any', feedback: 'Expected value is a LONG-RUN average over many repetitions of the chance process.' },
    { label: 'Average / mean / expected', phrasings: ['mean', 'expect', /\baverage\b/], polarity: 'any', feedback: 'Say the outcomes would AVERAGE this value.' },
    contextGroup('States the context', [variable, context], { minMatches: 2, feedback: `Say what is averaged (${variable}) and over what (${context}).` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    { phrase: /\b(?:exactly|always|guaranteed|every single|certain to|each time|every time)\b/, label: 'Deterministic claim', why: 'The expected value is a long-run average; any single outcome can differ from it.' },
    PROVES,
  ]
  const exemplar = `Over many ${context}, the ${variable} would average about ${fmt(value, digits)}${unitsSuffix(units)}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 8 }
}

// ---------------------------------------------------------------------------------------------
// Collecting data
// ---------------------------------------------------------------------------------------------

export type BiasType = 'voluntary response' | 'undercoverage' | 'nonresponse' | 'response bias' | 'convenience' | 'wording'

export interface SamplingBiasArgs {
  biasType: BiasType
  /** One sentence explaining the mechanism; its content words become the rubric keywords. */
  mechanism: string
  /** Likely direction of the bias, if determinable. */
  direction?: 'over' | 'under'
  parameter: string
  population: string
}

const BIAS_PHRASINGS: Record<BiasType, RubricPhrase[]> = {
  'voluntary response': ['voluntary', 'chose respond', 'choose respond', 'opt'],
  undercoverage: ['undercoverage', 'not cover', 'exclude', 'not chance', 'not included', 'left out'],
  nonresponse: ['nonresponse', 'not respond', 'not answer', 'not reply', 'not return', 'refuse', 'not reached'],
  'response bias': ['response bias', 'lie', 'untruthful', 'not truthful', 'dishonest', 'not honest', 'social desirab', 'not accurate', 'misreport'],
  convenience: ['convenience', 'easy', 'easiest', 'nearby', 'happen', 'haphazard'],
  wording: ['wording', 'leading', 'loaded', 'phrased', 'question', 'push'],
}

/** "This is undercoverage: independent haulers never appear in the Admiralty registry, so the sample… underestimates…" */
export function samplingBiasIdentification({ biasType, mechanism, direction, parameter, population }: SamplingBiasArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    { label: `Names the type of bias (${biasType})`, phrasings: BIAS_PHRASINGS[biasType], polarity: 'any', feedback: `This is ${biasType} bias.` },
    contextGroup('Explains the mechanism (who is over- or under-represented and why)', [mechanism], { minMatches: 2, feedback: mechanism }),
    { label: 'Consequence for the sample', phrasings: ['overrepresent', 'underrepresent', 'exclude', 'not represent', 'greater likely', 'less likely', 'differ', 'not reflect', 'systematic', 'skew'], polarity: 'any', feedback: 'Say how the sample differs systematically from the population.' },
    ...(direction
      ? [
          {
            label: `Direction of the bias (${direction}estimate)`,
            phrasings: direction === 'over' ? ['overestimate', 'greater true', 'greater actual', 'inflate', 'greater population'] : ['underestimate', 'less true', 'less actual', 'less population'],
            polarity: 'any',
            feedback: `The estimate is likely to be ${direction === 'over' ? 'too high' : 'too low'}.`,
          } as RubricGroup,
        ]
      : []),
    contextGroup('States the context', [parameter, population], { minMatches: 1, feedback: `Say what is estimated (${parameter}) and for whom (${population}).` }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES]
  if (direction) {
    forbidden.push({ phrase: direction === 'over' ? 'underestimate' : 'overestimate', label: 'Wrong direction', why: `Think about who is missing or over-represented: the estimate is likely too ${direction === 'over' ? 'high' : 'low'}.` })
  }
  const exemplar = `This is ${biasType} bias. ${mechanism.replace(/\.?$/, '.')} The sample therefore does not represent ${population}${direction ? ` and is likely to ${direction}estimate the ${parameter}` : `, so the estimate of the ${parameter} is likely to differ systematically from the truth`}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 12 }
}

export type Procedure = 'one-prop-z' | 'two-prop-z' | 'one-mean-t' | 'two-mean-t' | 'paired-t' | 'chi-square' | 'slope-t' | 'one-mean-z-interval' | 'one-prop-z-interval'

export interface ConditionsArgs {
  procedure: Procedure
  /** 'sample' (random sample) or 'assignment' (random assignment in an experiment). */
  random?: 'sample' | 'assignment'
  /** Sample size(s). */
  n: number | number[]
  /** For proportion procedures: successes and failures per group (or expected counts under H₀). */
  counts?: { successes: number; failures: number }[]
  /** Population size(s), if the 10% condition is the relevant independence check. */
  populationSize?: number | number[]
  /** How normality is justified for mean procedures. */
  normal?: 'clt' | 'graph' | 'stated'
  /** Chi-square: smallest expected count. */
  minExpected?: number
  context?: string
}

/** Conditions check for inference: Random, Independent (10%), Normal / Large Counts — with the numbers. */
export function conditionsCheck({ procedure, random = 'sample', n, counts, populationSize, normal = 'clt', minExpected, context }: ConditionsArgs): InterpretationAnswer {
  const ns = Array.isArray(n) ? n : [n]
  const pops = populationSize === undefined ? [] : Array.isArray(populationSize) ? populationSize : [populationSize]
  const isProp = procedure === 'one-prop-z' || procedure === 'two-prop-z' || procedure === 'one-prop-z-interval'
  const isChi = procedure === 'chi-square'
  const isSlope = procedure === 'slope-t'

  const randomGroup: RubricGroup = {
    label: random === 'assignment' ? 'Random assignment' : 'Random sample',
    phrasings: ['random'],
    feedback: random === 'assignment' ? 'State that treatments were randomly assigned.' : 'State that the data come from a random sample.',
  }
  const indepPhrasings: RubricPhrase[] = ['independent', '10 percent', 'ten percent', 'not replacement', /\b10\s*percent\b/, /\bten\b/]
  for (const size of ns) indepPhrasings.push(numberRegex(10 * size, 0, 0))
  for (const p of pops) indepPhrasings.push(numberRegex(p, 0, 0))
  if (random === 'assignment') indepPhrasings.push('assign')
  const independent: RubricGroup = {
    label: random === 'assignment' ? 'Independence (random assignment / 10% if sampled)' : '10% condition (independence)',
    phrasings: indepPhrasings,
    polarity: 'any',
    feedback: ns.length ? `Check n ≤ 10% of the population: ${ns.map((x) => `10 × ${x} = ${10 * x}`).join('; ')} ≤ population size.` : 'Check the 10% condition.',
  }

  let shape: RubricGroup
  if (isProp) {
    const phr: RubricPhrase[] = ['large count', 'normal', /\b10\b/, 'np', 'success', 'failure']
    for (const c of counts ?? []) phr.push(numberRegex(c.successes, 0, 0), numberRegex(c.failures, 0, 0))
    shape = { label: 'Large Counts (successes and failures ≥ 10, with the numbers)', phrasings: phr, minMatches: 3, polarity: 'any', feedback: `Show np̂ and n(1−p̂) ≥ 10: ${(counts ?? []).map((c) => `${c.successes} and ${c.failures}`).join('; ')}.` }
  } else if (isChi) {
    const phr: RubricPhrase[] = ['expect', /\b5\b/, 'five', 'large count']
    if (minExpected !== undefined) phr.push(numberRegex(minExpected, 2, 2))
    shape = { label: 'Large Counts (all expected counts ≥ 5)', phrasings: phr, minMatches: 2, polarity: 'any', feedback: `All expected counts must be at least 5${minExpected !== undefined ? ` (smallest is ${fmt(minExpected, 2)})` : ''}.` }
  } else if (isSlope) {
    shape = { label: 'Linear, equal SD, Normal residuals', phrasings: ['linear', 'equal sd', 'constant', 'normal', 'residual', 'not pattern', 'not curve'], minMatches: 2, polarity: 'any', feedback: 'Check the residual plot: no curvature, roughly constant spread, and roughly Normal residuals.' }
  } else {
    const phr: RubricPhrase[] = ['normal', 'central limit', 'clt']
    if (normal === 'clt') {
      phr.push(/\b30\b/)
      for (const size of ns) phr.push(numberRegex(size, 0, 0))
    } else if (normal === 'graph') {
      phr.push('not skew', 'not outlier', 'symmetric', 'roughly normal', 'graph', 'dotplot', 'boxplot', 'histogram', 'plot')
    } else {
      phr.push('stated', 'given', 'told', 'said')
    }
    shape = { label: normal === 'clt' ? 'Normal / Large Sample (n ≥ 30, Central Limit Theorem)' : normal === 'graph' ? 'Normal (graph shows no strong skew or outliers)' : 'Normal (population stated Normal)', phrasings: phr, minMatches: 2, polarity: 'any', feedback: normal === 'clt' ? `n = ${ns.join(', ')} ≥ 30, so the sampling distribution of the mean is approximately Normal (CLT).` : normal === 'graph' ? 'Describe the graph of the sample: no strong skewness or outliers.' : 'Cite that the population is stated to be Normal.' }
  }
  const required = [randomGroup, independent, shape]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES]

  const ctx = context ? ` of ${context}` : ''
  const randomText = random === 'assignment' ? 'Treatments were randomly assigned' : `The data come from a random sample${ctx}`
  const indepText = pops.length
    ? `Independent: 10 × ${ns.join(' and 10 × ')} = ${ns.map((x) => 10 * x).join(' and ')} is less than the population of ${pops.join(' and ')}, so the 10% condition holds`
    : random === 'assignment'
      ? 'Independent: random assignment makes the groups independent'
      : `Independent: 10 × ${ns.join(' and 10 × ')} = ${ns.map((x) => 10 * x).join(' and ')} is well below the population size, so the 10% condition holds`
  let shapeText: string
  if (isProp) shapeText = `Large Counts: ${(counts ?? []).map((c) => `${c.successes} successes and ${c.failures} failures`).join('; ')} are all at least 10, so the sampling distribution is approximately Normal`
  else if (isChi) shapeText = `Large Counts: all expected counts are at least 5${minExpected !== undefined ? ` (the smallest is ${fmt(minExpected, 2)})` : ''}`
  else if (isSlope) shapeText = 'The scatterplot is linear, the residual plot shows no pattern and roughly constant spread, and the residuals are roughly Normal'
  else if (normal === 'clt') shapeText = `Normal: n = ${ns.join(' and ')} is at least 30, so by the central limit theorem the sampling distribution of the mean is approximately Normal`
  else if (normal === 'graph') shapeText = 'Normal: the dotplot of the sample is roughly symmetric with no outliers, so the population is plausibly Normal'
  else shapeText = 'Normal: the population is stated to be Normal'
  const exemplar = `Random: ${randomText}. ${indepText}. ${shapeText}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 12 }
}

/** All templates, for documentation and validation tooling. */
export const rubricTemplates = {
  confidenceIntervalInterpretation,
  significanceTestConclusion,
  slopeInterpretation,
  rSquaredInterpretation,
  correlationDescription,
  residualInterpretation,
  standardDeviationInterpretation,
  expectedValueInterpretation,
  samplingBiasIdentification,
  conditionsCheck,
}
