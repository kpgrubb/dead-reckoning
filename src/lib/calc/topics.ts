/**
 * Just-in-time calculus briefing topics. Each id is referenced from module frontmatter
 * (`calc_briefing: "area-under-a-curve"`) and by `<CalcBriefing topic="…" />`.
 *
 * The briefing BODY (prose + instrument) lives in content/calc/<id>.mdx, written by the
 * Instructor of the Act that first needs it. This file is the index and the placement contract.
 */
export interface CalcTopic {
  id: string
  title: string
  /** One-line "why now" hook shown on the collapsed card. */
  hook: string
  /** Where it first appears (module id), for the curriculum map. */
  firstUsedIn: string
  minutes: number
}

export const CALC_TOPICS: Record<string, CalcTopic> = {
  'area-under-a-curve': {
    id: 'area-under-a-curve',
    title: 'Area under a curve is probability',
    hook: 'A density has no probability at a point — only over an interval. That is an integral.',
    firstUsedIn: 'act-1-06',
    minutes: 5,
  },
  'density-vs-mass': {
    id: 'density-vs-mass',
    title: 'Density vs. mass',
    hook: 'Why a pdf can exceed 1 and a pmf cannot; what f(x)·dx means.',
    firstUsedIn: 'act-4-05',
    minutes: 4,
  },
  'integral-as-accumulation': {
    id: 'integral-as-accumulation',
    title: 'The integral as accumulation',
    hook: 'The CDF is the running total of density. Its slope is the pdf.',
    firstUsedIn: 'act-4-06',
    minutes: 5,
  },
  'expected-value-as-weighted-sum': {
    id: 'expected-value-as-weighted-sum',
    title: 'Expected value: a weighted sum, then a weighted integral',
    hook: 'Σ x·p(x) becomes ∫ x·f(x) dx. Same idea, finer grain.',
    firstUsedIn: 'act-4-03',
    minutes: 4,
  },
  'minimizing-squared-error': {
    id: 'minimizing-squared-error',
    title: 'Derivative → minimum: where least squares comes from',
    hook: 'Set the derivative of the total squared residual to zero and the slope formula falls out.',
    firstUsedIn: 'act-2-03',
    minutes: 6,
  },
  'limits-and-the-clt': {
    id: 'limits-and-the-clt',
    title: 'Limits: what "as n grows" really promises',
    hook: 'The CLT is a statement about a limit. What converges, and how fast.',
    firstUsedIn: 'act-5-02',
    minutes: 5,
  },
  'tails-and-inverse-functions': {
    id: 'tails-and-inverse-functions',
    title: 'Inverse functions: from area back to a cutoff',
    hook: 'Critical values invert the CDF. Why z* = 1.96 and where t* comes from.',
    firstUsedIn: 'act-6-02',
    minutes: 4,
  },
}

export function getCalcTopic(id: string): CalcTopic | undefined {
  return CALC_TOPICS[id]
}
