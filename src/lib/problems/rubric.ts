/**
 * Interpretation rubric engine — grades free-text "conclusion in context" responses.
 *
 * Pipeline for a learner response:
 *   1. normalizeText  — lower-case, NFKD, symbol → words ("<" → "less", "%" → "percent", "H₀" → "null"),
 *                       contractions and negation idioms collapsed to "not" ("fail to reject" → "not reject").
 *                       RegExp phrasings are tested against THIS string (numbers intact).
 *   2. tokenize       — split; clause punctuation becomes boundary tokens; light stemming
 *                       (plural / -ing / -ed / -ly / trailing e); synonym groups collapse to one canonical
 *                       token ("suggests" → "evidence", "higher" → "greater", "H0" → "null"); stopwords dropped.
 *   3. negation scope — a token is negated when a "not" precedes it in the same clause with no
 *                       scope-ending word ("that", "which", "because", "of" …) between and ≤ 5 tokens away.
 *   4. phrase match   — a string phrasing matches when its tokens appear in order within one clause with
 *                       gaps of ≤ 3 tokens. Unless the phrasing itself contains "not", only NON-negated
 *                       occurrences count (group `polarity: 'any'` disables this).
 *   5. scoring        — required groups (weighted) → score; forbidden phrasings fail the response and
 *                       cap the score at 0.5; optional groups are feedback only.
 *
 * Pure: no React, no store access. Keep it that way — it runs inside generator self-checks too.
 */
import type { ForbiddenPhrase, GradeResult, InterpretationAnswer, RubricGroup, RubricPhrase, RubricResult } from './types'

// ---------------------------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------------------------

/** Ordered text replacements applied after lower-casing. Word-bounded; result is space-padded. */
const TEXT_RULES: [RegExp, string][] = [
  // symbols → words
  [/[≤<]/g, ' less '],
  [/[≥>]/g, ' greater '],
  [/≠/g, ' not equal '],
  [/=/g, ' equal '],
  [/%/g, ' percent '],
  [/α/g, ' alpha '],
  [/μ/g, ' mu '],
  [/σ/g, ' sigma '],
  [/ρ/g, ' rho '],
  [/β/g, ' beta '],
  [/[≈~]/g, ' approximately '],
  // notation
  [/\bh[\s_-]?(?:0|o|naught|nought)\b/g, ' null '],
  [/\bh[\s_-]?(?:1|a)\b/g, ' alt '],
  [/\bnull hypothesis\b/g, ' null '],
  [/\balternative hypothesis\b/g, ' alt '],
  [/\bp[\s-]?hat\b/g, ' phat '],
  [/\bx[\s-]?bar\b/g, ' xbar '],
  [/\by[\s-]?hat\b/g, ' yhat '],
  [/\bp[\s-]?values?\b/g, ' pvalue '],
  [/\bp\b/g, ' pvalue '],
  [/\b(?:significance|alpha) level\b/g, ' alpha '],
  [/\br[\s^_-]?(?:2|squared)\b/g, ' rsquared '],
  [/\bstandard deviations?\b/g, ' sd '],
  [/\bstd\.? ?dev\.?\b/g, ' sd '],
  [/\bstandard errors?\b/g, ' se '],
  // contractions and negation idioms → "not"
  [/\bcan'?t\b|\bcannot\b|\bcan not\b/g, ' not '],
  [/\bwon'?t\b|\bwill not\b/g, ' not '],
  [/\b(?:do|does|did|could|would|should|is|are|was|were|has|have|had|must|might|may)\s*n'?t\b/g, ' not '],
  [/\b(?:do|does|did|could|would|should|is|are|was|were|has|have|had|must|might|may)\s+not\b/g, ' not '],
  [/\bfail(?:s|ed|ing|ure)? to\b/g, ' not '],
  [/\bunable to\b/g, ' not '],
  [/\binsufficient\b/g, ' not enough '],
  [/\black(?:s|ed|ing)?(?: of)?\b/g, ' not '],
  [/\b(?:no|never|without|neither|nor)\b/g, ' not '],
  // estimation direction idioms
  [/\btoo (?:high|large|big)\b/g, ' overestimate '],
  [/\btoo (?:low|small)\b/g, ' underestimate '],
  [/\bover[\s-]?(?:predict|estimat|stat)\w*/g, ' overestimate '],
  [/\bunder[\s-]?(?:predict|estimat|stat)\w*/g, ' underestimate '],
  [/\bover[\s-]?represent\w*/g, ' overrepresent '],
  [/\bunder[\s-]?represent\w*/g, ' underrepresent '],
  // sampling vocabulary
  [/\bnon[\s-]?response\b/g, ' nonresponse '],
  [/\bunder[\s-]?coverage\b/g, ' undercoverage '],
  [/\bself[\s-]?select\w*/g, ' voluntary '],
  [/\bvolunteer\w*/g, ' voluntary '],
  // expected value / long run idioms
  [/\bon average\b/g, ' average '],
  [/\bin the long run\b|\blong[\s-]?run\b|\bover (?:many|a large number of|the long)\b|\bmany (?:trials|repetitions|times|runs|samples|patrols|missions)\b/g, ' longrun '],
  // per-unit idioms
  [/\b(?:for )?(?:each|every)(?: additional| extra| one| 1)?\b/g, ' perunit '],
  [/\bper\b/g, ' perunit '],
  [/\bone[\s-]unit\b/g, ' perunit '],
  // number cleanup
  [/(\d),(?=\d{3}\b)/g, '$1'],
  [/(?<![a-z0-9])[-−](?=\d)/g, '-'],
]

const CLAUSE_PUNCT = /(?<![0-9])[.,;:!?]|[.,;:!?](?![0-9])/g

/**
 * Lower-cased, symbol-normalized text with numbers intact and clause punctuation kept.
 * RegExp rubric phrasings are tested against this.
 */
export function normalizeText(input: string): string {
  let s = (input ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/−/g, '-')
    .replace(/\r\n?/g, '\n')
  for (const [re, rep] of TEXT_RULES) s = s.replace(re, rep)
  return s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' . ').trim()
}

// ---------------------------------------------------------------------------------------------
// Tokens: stemming, synonyms, stopwords
// ---------------------------------------------------------------------------------------------

const STEM_EXCEPTIONS: Record<string, string> = {
  bias: 'bias',
  likely: 'likely',
  unlikely: 'unlikely',
  hypothesis: 'hypothesis',
  hypotheses: 'hypothesis',
  analysis: 'analysis',
  analyses: 'analysis',
  less: 'less',
  this: 'this',
  does: 'does',
  was: 'was',
  series: 'series',
  species: 'species',
}

function undouble(s: string): string {
  return /(?:bb|dd|gg|mm|nn|pp|rr|tt)$/.test(s) ? s.slice(0, -1) : s
}

/** Light stemmer: plural, -ing, -ed, -ly, trailing e. Both phrases and responses go through it. */
export function stem(word: string): string {
  const w = word
  if (w.length < 4) return w
  const ex = STEM_EXCEPTIONS[w]
  if (ex) return ex
  let s = w
  if (s.endsWith('ies') && s.length > 4) s = s.slice(0, -3) + 'y'
  else if (s.endsWith('sses')) s = s.slice(0, -2)
  else if (s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us') && !s.endsWith('is')) s = s.slice(0, -1)
  if (s.endsWith('ing') && s.length > 5) s = undouble(s.slice(0, -3))
  else if (s.endsWith('ed') && s.length > 4) s = undouble(s.slice(0, -2))
  else if (s.endsWith('ly') && s.length > 4) s = s.slice(0, -2)
  if (s.endsWith('e') && s.length > 4) s = s.slice(0, -1)
  return s
}

/** Synonym groups: first entry is the canonical token; the rest map onto it (after stemming). */
const SYNONYMS: string[][] = [
  ['evidence', 'evidence', 'support', 'supports', 'supported', 'suggest', 'suggests', 'suggested', 'indicate', 'indicates', 'indicated', 'imply', 'implies', 'implied', 'indication'],
  ['convincing', 'convincing', 'convincingly', 'compelling', 'sufficient', 'sufficiently', 'enough', 'adequate', 'statistically'],
  ['conclude', 'conclude', 'concluded', 'concludes', 'conclusion', 'infer', 'infers'],
  ['reject', 'reject', 'rejects', 'rejected', 'rejecting', 'rejection'],
  ['accept', 'accept', 'accepts', 'accepted', 'accepting', 'acceptance'],
  ['prove', 'prove', 'proves', 'proved', 'proven', 'proof', 'proofs', 'definitely', 'definitively', 'certainly', 'certain', 'conclusively', 'guarantee', 'guarantees', 'guaranteed'],
  ['probability', 'probability', 'probabilities', 'chance', 'chances', 'likelihood', 'odds'],
  ['significant', 'significant', 'significance', 'significantly'],
  ['mean', 'mean', 'means', 'average', 'averages', 'averaged'],
  ['population', 'population', 'populations'],
  ['sample', 'sample', 'samples', 'sampled', 'sampling'],
  ['greater', 'greater', 'higher', 'larger', 'more', 'above', 'exceed', 'exceeds', 'exceeded', 'bigger', 'increase', 'increases', 'increased', 'increasing', 'up', 'rise', 'rises', 'risen', 'improve', 'improved'],
  ['less', 'less', 'lower', 'fewer', 'smaller', 'below', 'under', 'decrease', 'decreases', 'decreased', 'decreasing', 'reduce', 'reduces', 'reduced', 'reduction', 'drop', 'drops', 'dropped', 'down', 'fall', 'falls', 'fell'],
  ['differ', 'differ', 'differs', 'differed', 'different', 'difference', 'differences', 'change', 'changed', 'changes', 'unequal'],
  ['equal', 'equal', 'equals', 'same'],
  ['linear', 'linear', 'linearly', 'straight'],
  ['positive', 'positive', 'positively', 'direct', 'directly'],
  ['negative', 'negative', 'negatively', 'inverse', 'inversely'],
  ['strong', 'strong', 'strongly'],
  ['moderate', 'moderate', 'moderately', 'medium'],
  ['weak', 'weak', 'weakly'],
  ['association', 'association', 'associated', 'associate', 'relationship', 'related', 'relation', 'relate', 'linked', 'link'],
  ['correlation', 'correlation', 'correlated', 'correlate', 'correlations'],
  ['random', 'random', 'randomly', 'randomized', 'randomised', 'randomization', 'randomisation', 'randomize'],
  ['independent', 'independent', 'independence', 'independently'],
  ['normal', 'normal', 'normally', 'normality'],
  ['condition', 'condition', 'conditions', 'assumption', 'assumptions', 'requirement', 'requirements'],
  ['outlier', 'outlier', 'outliers'],
  ['skew', 'skew', 'skewed', 'skewness'],
  ['symmetric', 'symmetric', 'symmetrical', 'symmetry'],
  ['percent', 'percent', 'percentage', 'pct'],
  ['proportion', 'proportion', 'proportions', 'fraction', 'rate'],
  ['actual', 'actual', 'observed', 'observe', 'real', 'measured'],
  ['estimate', 'estimate', 'estimated', 'estimates', 'estimation', 'approximate', 'approximately', 'approximation', 'about', 'roughly', 'around'],
  ['interval', 'interval', 'intervals'],
  ['capture', 'capture', 'captures', 'captured', 'contain', 'contains', 'contained', 'include', 'includes', 'included', 'cover', 'covers', 'covered', 'encompass', 'encompasses'],
  ['confident', 'confident', 'confidence'],
  ['typical', 'typical', 'typically', 'usually', 'usual', 'generally'],
  ['vary', 'vary', 'varies', 'varied', 'varying', 'variation', 'variability', 'deviate', 'deviates', 'deviated', 'deviation', 'deviations', 'spread', 'fluctuate', 'fluctuates', 'fluctuation', 'dispersion', 'scatter', 'scattered'],
  ['predict', 'predict', 'predicted', 'predicts', 'prediction', 'predictions', 'forecast', 'forecasts'],
  ['expect', 'expect', 'expected', 'expects', 'expectation'],
  ['explain', 'explain', 'explained', 'explains', 'accounted', 'account', 'accounts', 'attributable', 'attributed'],
  ['cause', 'cause', 'causes', 'caused', 'causing', 'causal', 'causation', 'causality'],
  ['bias', 'bias', 'biased', 'biases'],
  ['exclude', 'exclude', 'excludes', 'excluded', 'excluding', 'omit', 'omits', 'omitted', 'miss', 'misses', 'missed', 'missing', 'ignore', 'ignores', 'ignored', 'leaves', 'left'],
  ['wording', 'wording', 'worded', 'phrasing', 'phrased', 'leading', 'loaded'],
  ['convenience', 'convenience', 'convenient'],
  ['large', 'large', 'big'],
  ['count', 'count', 'counts'],
  ['success', 'success', 'successes'],
  ['failure', 'failure', 'failures'],
  ['residual', 'residual', 'residuals'],
  ['repeat', 'repeat', 'repeated', 'repeatedly', 'repetition', 'repetitions', 'repeating'],
  ['unit', 'unit', 'units'],
  ['data', 'data', 'point', 'points', 'observation', 'observations', 'value', 'values', 'datum'],
  ['true', 'true'],
  ['parameter', 'parameter', 'parameters'],
  ['statistic', 'statistic', 'statistics'],
  ['null', 'null'],
  ['alt', 'alt', 'alternative'],
  ['not', 'not'],
  ['within', 'within', 'inside'],
  ['between', 'between'],
  ['distance', 'distance', 'far', 'away'],
  ['ten', 'ten', '10'],
]

const SYN = new Map<string, string>()
for (const group of SYNONYMS) {
  const canon = group[0]
  for (const w of group) {
    SYN.set(w, canon)
    SYN.set(stem(w), canon)
  }
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this', 'these', 'those', 'there', 'here', 'we',
  'i', 'you', 'they', 'our', 'their', 'he', 'she', 'his', 'her', 'in', 'on', 'at', 'by', 'for', 'with', 'as', 'from', 'into', 'than', 'then',
  'would', 'will', 'can', 'could', 'should', 'may', 'might', 'do', 'does', 'did', 'have', 'has', 'had', 'also', 'just', 'very', 'really',
  'quite', 'some', 'any', 's', 'am', 'my', 'me', 'us', 'them', 'own', 'such', 'both', 'over', 'when', 'where', 'while', 'per',
])

/** Words that end a negation scope ("we do not have evidence THAT the mean is greater"). */
const SCOPE_ENDERS = new Set(['that', 'which', 'whether', 'because', 'since', 'so', 'but', 'if', 'therefore', 'thus', 'hence', 'and', 'or', 'of', 'meaning'])

const NEGATION_REACH = 5

export interface Token {
  /** Canonical token, '|' for a clause boundary, or a scope-ender word. */
  t: string
  boundary: boolean
  scope: boolean
  negated: boolean
  number: boolean
}

export interface NormalizedText {
  text: string
  tokens: Token[]
  /** Word count of the raw response. */
  words: number
}

function canonical(word: string): string {
  const direct = SYN.get(word)
  if (direct) return direct
  const s = stem(word)
  return SYN.get(s) ?? s
}

const NUMBER_RE = /^-?(?:\d+\.?\d*|\.\d+)$/

export function tokenize(input: string): NormalizedText {
  const text = normalizeText(input)
  const raw = text
    .replace(CLAUSE_PUNCT, ' | ')
    .replace(/[()[\]{}"'/\\*_^`]+/g, ' ')
    .replace(/(?<=[a-z])-(?=[a-z])/g, ' ')
    .replace(/(?<![0-9])-(?![0-9])/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const tokens: Token[] = []
  for (const w of raw) {
    if (w === '|') {
      if (tokens.length && !tokens[tokens.length - 1].boundary) tokens.push({ t: '|', boundary: true, scope: false, negated: false, number: false })
      continue
    }
    if (NUMBER_RE.test(w)) {
      tokens.push({ t: SYN.get(w) ?? w, boundary: false, scope: false, negated: false, number: true })
      continue
    }
    const word = w.replace(/[^a-z0-9]/g, '')
    if (!word) continue
    if (SCOPE_ENDERS.has(word)) {
      tokens.push({ t: word, boundary: false, scope: true, negated: false, number: false })
      continue
    }
    if (STOPWORDS.has(word)) continue
    tokens.push({ t: canonical(word), boundary: false, scope: false, negated: false, number: false })
  }
  // Negation scope
  let notAt = -1
  let since = 0
  for (const tok of tokens) {
    if (tok.boundary || tok.scope) {
      notAt = -1
      continue
    }
    if (tok.t === 'not') {
      notAt = 0
      since = 0
      continue
    }
    if (notAt >= 0) {
      since++
      if (since <= NEGATION_REACH) tok.negated = true
      else notAt = -1
    }
  }
  const words = (input ?? '').trim() ? (input ?? '').trim().split(/\s+/).length : 0
  return { text, tokens, words }
}

/** Canonical content tokens of a phrase (no boundaries, scope-enders or stopwords). */
export function phraseTokens(phrase: string): string[] {
  return tokenize(phrase)
    .tokens.filter((t) => !t.boundary && !t.scope)
    .map((t) => t.t)
}

/** Content words of a context string, canonicalized — for "names the context" groups. */
export function contentWords(s: string): string[] {
  const seen = new Set<string>()
  for (const t of phraseTokens(s)) if (t.length > 2 && !seen.has(t)) seen.add(t)
  return [...seen]
}

// ---------------------------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------------------------

const MAX_GAP = 3

interface Occurrence {
  start: number
  end: number
  negated: boolean
}

function findOccurrences(tokens: Token[], phrase: string[]): Occurrence[] {
  const out: Occurrence[] = []
  if (phrase.length === 0) return out
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].boundary || tokens[i].scope || tokens[i].t !== phrase[0]) continue
    let pos = i
    let ok = true
    for (let k = 1; k < phrase.length; k++) {
      let gap = 0
      let found = -1
      for (let j = pos + 1; j < tokens.length; j++) {
        const tok = tokens[j]
        if (tok.boundary) break
        if (tok.scope) continue
        if (tok.t === phrase[k]) {
          found = j
          break
        }
        gap++
        if (gap > MAX_GAP) break
      }
      if (found < 0) {
        ok = false
        break
      }
      pos = found
    }
    if (ok) out.push({ start: i, end: pos, negated: tokens[i].negated })
  }
  return out
}

/**
 * Does `phrase` match the normalized response? Strings use token matching with negation awareness;
 * RegExps test the normalized text.
 */
export function phraseMatches(norm: NormalizedText, phrase: RubricPhrase, polarity: 'positive' | 'any' = 'positive'): boolean {
  if (phrase instanceof RegExp) {
    phrase.lastIndex = 0
    return phrase.test(norm.text)
  }
  const pt = phraseTokens(phrase)
  if (pt.length === 0) return false
  const occ = findOccurrences(norm.tokens, pt)
  if (occ.length === 0) return false
  if (polarity === 'any' || pt.includes('not')) return true
  return occ.some((o) => !o.negated)
}

/** Convenience: match against a raw string. */
export function matches(response: string, phrase: RubricPhrase, polarity: 'positive' | 'any' = 'positive'): boolean {
  return phraseMatches(tokenize(response), phrase, polarity)
}

// ---------------------------------------------------------------------------------------------
// Number patterns (for regex phrasings that must cite a computed value)
// ---------------------------------------------------------------------------------------------

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

/**
 * Regex source matching `value` rendered with `digits` decimals, ± one digit of rounding slack,
 * with or without trailing zeros / leading zero ("0.05", ".05", "0.050").
 */
export function numberPattern(value: number, digits = 2, slack = 1): string {
  const alts = new Set<string>()
  const mag = Math.abs(value)
  for (let d = Math.max(0, digits - slack); d <= digits + slack; d++) {
    const s = mag.toFixed(d)
    // Skip renderings that round away the value ("0.003" at 2 dp → "0.00") or drift > 25 %.
    if (mag !== 0 && (Number(s) === 0 || Math.abs(Number(s) - mag) > 0.25 * mag)) continue
    alts.add(s)
    alts.add(trimZeros(s))
    if (s.startsWith('0.')) alts.add(s.slice(1))
  }
  const sign = value < 0 ? '-?' : ''
  const body = [...alts]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((a) => a.replace(/\./g, '\\.'))
    .join('|')
  return `(?<![\\d.])${sign}(?:${body})(?!\\d|\\.\\d)`
}

export function numberRegex(value: number, digits = 2, slack = 1): RegExp {
  return new RegExp(numberPattern(value, digits, slack))
}

// ---------------------------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------------------------

function isForbiddenObj(f: RubricPhrase | ForbiddenPhrase): f is ForbiddenPhrase {
  return typeof f === 'object' && f !== null && !(f instanceof RegExp) && 'phrase' in f
}

function phraseLabel(p: RubricPhrase): string {
  return p instanceof RegExp ? p.source.replace(/\\b|\(\?[:<!=][^)]*\)|[()^$]/g, '').slice(0, 40) : p
}

const DEFAULT_WHY = 'Statistical conclusions never prove; they provide, or fail to provide, convincing evidence.'

export function gradeInterpretation(a: InterpretationAnswer, response: string): GradeResult {
  const norm = tokenize(response ?? '')
  const rubric: RubricResult[] = a.required.map((g) => {
    const polarity = g.polarity ?? 'positive'
    const hits = g.phrasings.filter((p) => phraseMatches(norm, p, polarity)).length
    return { label: g.label, met: hits >= (g.minMatches ?? 1), feedback: g.feedback, optional: g.optional }
  })
  const forbidden: { label: string; why: string }[] = []
  for (const f of a.forbidden ?? []) {
    const phrase = isForbiddenObj(f) ? f.phrase : f
    if (phraseMatches(norm, phrase, 'positive')) {
      forbidden.push({ label: isForbiddenObj(f) ? (f.label ?? phraseLabel(f.phrase)) : phraseLabel(f), why: isForbiddenObj(f) ? f.why : DEFAULT_WHY })
    }
  }

  let total = 0
  let earned = 0
  a.required.forEach((g, i) => {
    if (g.optional) return
    const w = g.weight ?? 1
    total += w
    if (rubric[i].met) earned += w
  })
  let score = total ? earned / total : 1
  if (forbidden.length) score = Math.min(score, 0.5)
  const tooShort = !!a.minWords && norm.words < a.minWords
  if (tooShort) score = 0
  const passScore = a.passScore ?? 1
  const correct = !tooShort && forbidden.length === 0 && score >= passScore - 1e-9

  let feedback: string
  if (tooShort) {
    feedback = `Write a fuller response (at least ${a.minWords} words) that states the conclusion in context.`
  } else if (forbidden.length) {
    feedback = forbidden.map((f) => `“${f.label}” — ${f.why}`).join(' ')
  } else if (correct) {
    const missingOptional = rubric.filter((r) => r.optional && !r.met)
    feedback = missingOptional.length ? `Conclusion stated in context. Could also mention: ${missingOptional.map((r) => r.label.toLowerCase()).join('; ')}.` : 'Conclusion stated in context with all required elements.'
  } else {
    const missing = rubric.filter((r) => !r.met && !r.optional)
    feedback = `Missing: ${missing.map((r) => r.label).join('; ')}.`
  }
  return { correct, score: Math.round(score * 1000) / 1000, feedback, rubric, forbidden: forbidden.length ? forbidden : undefined }
}

/** Build a "names the context" group from free-text context strings (population, variable…). */
export function contextGroup(label: string, contexts: string[], opts: { minMatches?: number; feedback?: string; optional?: boolean } = {}): RubricGroup {
  const words = new Set<string>()
  for (const c of contexts) for (const w of contentWords(c)) words.add(w)
  const phrasings = [...words]
  const want = Math.min(opts.minMatches ?? Math.min(2, phrasings.length), phrasings.length)
  return { label, phrasings, minMatches: Math.max(1, want), polarity: 'any', feedback: opts.feedback, optional: opts.optional }
}
