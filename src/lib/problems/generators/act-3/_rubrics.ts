/**
 * Act III drill rubrics (AP Unit 3: Collecting Data). Same shape as `@/lib/problems/rubrics` — each
 * returns an `InterpretationAnswer` whose exemplar passes its own rubric (asserted in _rubrics.test.ts
 * and re-checked by `defineGenerator` on every draw).
 *
 *   scopeOfInferenceFraming  what population a conclusion needs, what frame was used, who is missing
 *   designJustification      name the sampling method, why it suits the goal, what it costs, what it gives up
 *   confoundExplanation      name the lurking variable, the mechanism, and why the effect cannot be separated
 *   scopeOfInference         causation ← random assignment · generalization ← random sampling
 *
 * These are deliberately DIFFERENT items from the Act's mission-beat rubrics in
 * `@/instruments/act-3/beats` (which are about the Ceres survey, the Board's trial and Asgard's
 * lottery). Nothing here imports from beats.ts.
 *
 * Phrasing notes for the rubric engine (src/lib/problems/rubric.ts): "no"/"cannot"/"fail to" all
 * collapse to the token `not`; "chance" → `probability`; "every"/"per" → `perunit`; and the whole
 * `guarantee / certainly / definitely` family canonicalises onto the `prove` token — so an exemplar
 * under a "proves" ban may never say "guarantees".
 *
 * Not a generator file (exports functions only; the registry ignores non-generator exports).
 */
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { fmt } from '@/lib/stats/format'

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A study design never proves anything. It licenses (or fails to license) a conclusion of a stated scope.',
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Sentence-case a fragment that has to start a sentence in an exemplar. */
function cap(s: string): string {
  const t = s.replace(/\.?$/, '')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * "A bigger sample would fix it." Matched on the normalized text, with `not` excluded from the span so
 * that "a larger sample would not repair this" reads as agreement, not as the error.
 */
const BIGGER_SAMPLE_FIXES: ForbiddenPhrase[] = [
  {
    phrase: /\b(?:larger|bigger|greater)\s+(?:the\s+)?(?:sample|survey|n)\b(?:(?!\bnot\b)[^.;:])*?\b(?:fix|fixes|fixed|solve|solves|solved|correct|corrects|corrected|remove|removes|removed|eliminate|eliminates|eliminated|cure|cures|repair|repairs)\b/,
    label: '“A larger sample would fix it”',
    why: 'Sample size has nothing to do with it. Units that are not on the list have no chance of selection however many names you draw from it — a bigger sample just measures the same wrong group more precisely.',
  },
  {
    phrase: /\b(?:more|additional)\s+(?:respondents|masters|hulls|crews|contacts|responses|names|transits)\b(?:(?!\bnot\b)[^.;:])*?\b(?:fix|fixes|fixed|solve|solves|solved|correct|corrects|remove|removes|eliminate|eliminates|cure|cures|repair|repairs)\b/,
    label: '“Contact more of them and it goes away”',
    why: 'Contacting more of the same list cannot reach the units the list leaves out. Undercoverage is a property of the frame, not of n.',
  },
]

// ---------------------------------------------------------------------------------------------
// 1. Scope of inference from the FRAME (act-3/scope-of-inference-framing)
// ---------------------------------------------------------------------------------------------

export interface ScopeFramingArgs {
  /** The population the stated conclusion would need: "the masters working the Adrastea feeder lane". */
  conclusionPopulation: string
  /** The list actually drawn from: "the Adrastea arrival register for the quarter". */
  frame: string
  /** Who the list leaves out: "masters still in transit, and hulls that diverted to Thebe". */
  missing: string
  /** What is estimated: "the share who have logged a profile-deviation advisory". */
  parameter: string
}

/**
 * Population vs sampling frame. Requires the population the conclusion needs, the frame actually used,
 * the units with no chance of selection, and what the study can and cannot therefore support.
 * Forbids "proves" and the "a bigger sample would fix it" claim.
 */
export function scopeOfInferenceFraming({ conclusionPopulation, frame, missing, parameter }: ScopeFramingArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    contextGroup('Names the population the conclusion would need', [conclusionPopulation], {
      minMatches: 2,
      feedback: `The conclusion is a claim about ${conclusionPopulation} — name them.`,
    }),
    contextGroup('Names the frame actually used (the list drawn from)', [frame], {
      minMatches: 2,
      feedback: `Name the list anyone could have drawn from: ${frame}.`,
    }),
    contextGroup('Names the units the frame leaves out', [missing], {
      minMatches: 2,
      feedback: `Say who is missing: ${missing}.`,
    }),
    {
      label: 'Says the missing units had no chance of selection',
      phrasings: ['not chance', 'not appear', 'not listed', 'exclude', 'undercoverage', 'not cover', 'not included', 'not reach', 'not eligible', 'not sampled', 'not selected', 'outside', 'not on the list', 'not in the frame'],
      polarity: 'any',
      feedback: 'Say the mechanism: those units are not on the list, so they had no chance of being selected at all. That is undercoverage.',
    },
    {
      label: 'Says what the study can and cannot support',
      phrasings: [/generaliz/, 'not extend', 'not apply', 'not support', 'only describe', 'describe only', 'not beyond', 'limited', 'only about', 'at best'],
      polarity: 'any',
      feedback: `Finish the thought: the study describes ${frame} and cannot be generalized to ${conclusionPopulation}.`,
    },
    contextGroup('States the context (what is being estimated)', [parameter], {
      minMatches: 1,
      feedback: `Say what is being estimated: ${parameter}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES, ...BIGGER_SAMPLE_FIXES]
  const exemplar = `The conclusion is about ${conclusionPopulation}, but the only list anyone could draw from was ${frame}. ${cap(missing)} had no chance of selection, so the study describes ${frame} and cannot be generalized to ${conclusionPopulation}; it does not support a statement about ${parameter} for the wider group.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 20 }
}

// ---------------------------------------------------------------------------------------------
// 2. Justify a sampling design (act-3/design-justification)
// ---------------------------------------------------------------------------------------------

export type SampleMethod = 'SRS' | 'stratified' | 'cluster' | 'systematic'

const METHOD_WORD: Record<SampleMethod, string> = {
  SRS: 'simple random',
  stratified: 'stratified',
  cluster: 'cluster',
  systematic: 'systematic',
}

const METHOD_PHRASINGS: Record<SampleMethod, RubricPhrase[]> = {
  SRS: ['simple random', 'srs', 'random sample', 'equal chance', 'by lot'],
  stratified: [/stratif/, 'stratum', 'strata', 'within each class', 'from each class', 'from each group'],
  cluster: ['cluster', 'convoy', 'whole group', 'entire group'],
  systematic: ['systematic', /\bperunit\s+\d/, 'fixed step', 'down the list'],
}

export interface DesignJustificationArgs {
  method: SampleMethod
  /** What the design buys, in-world: "puts Perrine, Mercantile and independent masters all in the sample". */
  benefit: string
  /** The stated goal it serves: "an estimate that holds for all three owner classes". */
  goal: string
  /** Cost in hours of link time (computed, not typed). */
  hours: number
  /** How the cost is built: "45 contacts at 55 minutes each". */
  costBasis: string
  /** What the design gives up: "more link time than a cluster of six convoys would cost". */
  tradeoff: string
}

/**
 * Names the method, says why it suits the stated goal, states the cost in link time (with the number),
 * and names the trade-off. Forbids "proves" — and therefore, in this engine, "guarantees".
 */
export function designJustification({ method, benefit, goal, hours, costBasis, tradeoff }: DesignJustificationArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    {
      label: `Names the sampling method (${METHOD_WORD[method]})`,
      phrasings: METHOD_PHRASINGS[method],
      polarity: 'any',
      feedback: `Name the design you are defending: a ${METHOD_WORD[method]} sample.`,
    },
    contextGroup('Says why the method suits the stated goal', [benefit, goal], {
      minMatches: 2,
      feedback: `Say what the design buys for this question: it ${benefit}, which is what ${goal} requires.`,
    }),
    {
      label: 'States the cost in link time (with the number)',
      phrasings: ['link', 'hour', 'minute', 'contact', 'cost', 'budget', numberRegex(hours, 1, 1)],
      minMatches: 2,
      polarity: 'any',
      feedback: `Price it: ${costBasis} — about ${fmt(hours, 1)} hours of link time.`,
    },
    {
      label: 'Names the trade-off (what the design gives up)',
      phrasings: [/\btrade[\s-]?off/, 'cost more', 'more time', 'more link', 'less precise', 'noisier', 'wider', 'exclude', 'risk', 'price', 'give up', 'cheaper', 'alike', /correlat/, 'not represent', 'in exchange'],
      polarity: 'any',
      feedback: `Every design gives something up. Here: ${tradeoff}.`,
    },
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES]
  const exemplar = `A ${METHOD_WORD[method]} sample ${benefit.replace(/\.?$/, '')}, which is exactly what ${goal.replace(/\.?$/, '')} requires. It costs about ${fmt(hours, 1)} hours of link time (${costBasis.replace(/\.?$/, '')}). The trade-off is ${tradeoff.replace(/\.?$/, '')}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 18 }
}

// ---------------------------------------------------------------------------------------------
// 3. Explain a confound (act-3/explain-confound)
// ---------------------------------------------------------------------------------------------

export interface ConfoundArgs {
  /** The lurking variable: "owner class". */
  lurking: string
  /** The treatment as described: "the new radiator refit". */
  treatment: string
  /** One bare noun for the treatment, used to build the "credits the treatment" ban: "refit". */
  treatmentNoun: string
  /** The response: "advisory count". */
  response: string
  /** One sentence on how the lurking variable travelled with the treatment. */
  mechanism: string
}

function creditsTreatment(treatmentNoun: string, why: string): ForbiddenPhrase {
  return {
    phrase: new RegExp(`(?<!\\bnot (?:\\w+ ){0,4})\\b${escapeRegExp(treatmentNoun)}s? (?:cause|causes|caused|reduce|reduces|reduced|prevent|prevents|prevented|lower|lowers|lowered|improve|improves|improved|increase|increases|increased|cut|cuts|work|works|worked)\\b`),
    label: 'Credits the treatment anyway',
    why,
  }
}

/**
 * Names the lurking variable, the mechanism by which it travels with the treatment, and the consequence
 * (the two cannot be separated, so the difference cannot be attributed to the treatment). Forbids
 * "proves" and any sentence that credits the treatment with the effect.
 */
export function confoundExplanation({ lurking, treatment, treatmentNoun, response, mechanism }: ConfoundArgs): InterpretationAnswer {
  const required: RubricGroup[] = [
    contextGroup(`Names the lurking variable (${lurking})`, [lurking], {
      minMatches: 1,
      feedback: `Name what travels with the treatment: ${lurking}.`,
    }),
    contextGroup('States the mechanism (how it travelled with the treatment)', [mechanism], {
      minMatches: 2,
      feedback: mechanism,
    }),
    {
      label: 'States the consequence (the two cannot be separated)',
      phrasings: ['not separate', 'not attribute', 'not tell', 'confound', 'not distinguish', 'not isolate', 'not credit', 'not untangle', 'entangle', 'mixed', 'either', 'alternative explanation', 'other explanation', 'not know which', 'not say which', 'not conclude'],
      polarity: 'any',
      feedback: `Say what follows: the difference in ${response} could be ${lurking} rather than ${treatment}, and no arithmetic on this design can tell the two apart.`,
    },
    contextGroup('States the context (treatment and response)', [treatment, response], {
      minMatches: 2,
      feedback: `Say what was compared and on what: ${treatment} and ${response}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [
    PROVES,
    creditsTreatment(treatmentNoun, `${lurking} is confounded with ${treatment}: the design cannot attribute any part of the difference in ${response} to the ${treatmentNoun}.`),
  ]
  const exemplar = `${cap(lurking)} is confounded with ${treatment}: ${mechanism.replace(/\.?$/, '.')} The two cannot be separated, so the difference in ${response} cannot be attributed to the ${treatmentNoun} — ${lurking} explains it just as well.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 20 }
}

// ---------------------------------------------------------------------------------------------
// 4. Scope of inference (act-3/scope-of-inference)
// ---------------------------------------------------------------------------------------------

export interface ScopeOfInferenceArgs {
  randomAssignment: boolean
  randomSample: boolean
  /** The treatment as described: "the Mark 4 reroute". */
  treatment: string
  /** One bare noun for the treatment: "reroute". */
  treatmentNoun: string
  /** The response: "advisory count". */
  response: string
  /** The population a generalization would reach: "all 340 masters on the Amalthea register". */
  population: string
  /** How the units came to be in the study: "the 28 volunteers from the Thebe yard queue". */
  sampleDescription: string
}

/**
 * The two-question scope table: random ASSIGNMENT licenses a causal claim, random SAMPLING licenses
 * generalization, and each is independent of the other. Requires both verdicts with the right polarity,
 * the right reason for each, and the context. Forbids "proves" and the wrong polarity on either verdict.
 */
export function scopeOfInference({ randomAssignment, randomSample, treatment, treatmentNoun, response, population, sampleDescription }: ScopeOfInferenceArgs): InterpretationAnswer {
  const causeGroup: RubricGroup = randomAssignment
    ? {
        label: 'Causation: a causal claim IS licensed',
        phrasings: ['cause', 'attribute', 'effect', 'responsible'],
        feedback: `Treatments were assigned at random, so a difference in ${response} can be attributed to ${treatment}.`,
      }
    : {
        label: 'Causation: a causal claim is NOT licensed',
        phrasings: ['not cause', 'not attribute', 'not effect', 'not conclude', 'not establish', 'association', 'not responsible'],
        feedback: `Nothing was assigned at random, so the difference in ${response} cannot be attributed to ${treatment} — it is an association only.`,
      }
  const assignmentReason: RubricGroup = {
    label: randomAssignment ? 'Gives the reason: random assignment' : 'Gives the reason: no random assignment',
    phrasings: ['assign', 'lot', 'lottery', 'allocat', 'imposed', 'chose', 'choose', 'self select', 'voluntary'],
    polarity: 'any',
    feedback: randomAssignment
      ? 'Name the reason for the causal verdict: the treatments were assigned at random.'
      : 'Name the reason for the causal verdict: nobody assigned the treatment — the groups formed themselves.',
  }
  const generalizeGroup: RubricGroup = randomSample
    ? {
        label: 'Generalization: the conclusion DOES extend to the population',
        phrasings: ['generaliz', 'extend', 'apply', 'represent'],
        feedback: `The units are a random sample, so the conclusion extends to ${population}.`,
      }
    : {
        label: 'Generalization: the conclusion does NOT extend to the population',
        phrasings: ['not generaliz', 'not extend', 'not apply', 'not represent', 'not beyond', 'not all', 'limited', /\bnot\b[^.;]{0,40}generaliz/, /generaliz\w*[^.;]{0,40}\bonly\b/],
        polarity: 'any',
        feedback: `The units are not a random sample of ${population}, so nothing extends beyond the group studied.`,
      }
  const samplingReason: RubricGroup = {
    label: randomSample ? 'Gives the reason: random sample' : 'Gives the reason: not a random sample',
    phrasings: ['random sample', 'sample', 'select', 'volunteer', 'voluntary', 'frame', 'recruit', 'drawn'],
    polarity: 'any',
    feedback: randomSample
      ? `Name the reason for the generalization verdict: the units were drawn as a random sample of ${population}.`
      : `Name the reason for the generalization verdict: ${sampleDescription} is not a random sample of ${population}.`,
  }
  const required: RubricGroup[] = [
    causeGroup,
    assignmentReason,
    generalizeGroup,
    samplingReason,
    contextGroup('States the context (treatment, response, population)', [treatment, response, population], {
      minMatches: 2,
      feedback: `Say what and whom: ${treatment}, ${response}, ${population}.`,
    }),
  ]
  const forbidden: (RubricPhrase | ForbiddenPhrase)[] = [PROVES]
  if (randomAssignment) {
    forbidden.push({
      phrase: 'not cause',
      label: 'Denies a causal conclusion that random assignment does license',
      why: `The ${treatmentNoun} was assigned at random, which is exactly what licenses a causal reading of a difference in ${response}.`,
    })
  } else {
    forbidden.push(creditsTreatment(treatmentNoun, `Nothing was assigned at random: the groups differ in whatever made them choose the ${treatmentNoun}, so the difference in ${response} cannot be credited to it.`))
  }
  if (randomSample) {
    forbidden.push({
      phrase: 'not generaliz',
      label: 'Refuses a generalization that random sampling does license',
      why: `The units were a random sample of ${population}, so the conclusion does extend to ${population}.`,
    })
  } else {
    forbidden.push({
      phrase: 'generaliz',
      label: 'Generalizes from a group that was not randomly sampled',
      why: `${sampleDescription} is not a random sample of ${population}; the result describes the units studied and no one else.`,
    })
  }

  const causeText = randomAssignment
    ? `Because ${treatment} was assigned at random, a difference in ${response} can be attributed to it`
    : `The units were not assigned to ${treatment} at random — they arrived in their groups already — so the difference in ${response} cannot be attributed to the ${treatmentNoun}`
  const genText = randomSample
    ? `Because ${sampleDescription} is a random sample of ${population}, the finding extends to ${population}`
    : `But ${sampleDescription} is not a random sample of ${population}, so the finding cannot be generalized beyond the units studied`
  const exemplar = `${causeText}. ${genText}.`
  return { type: 'interpretation', required, forbidden, exemplar, minWords: 20 }
}
