/**
 * Grading. Pure: no React, no store access.
 *
 *  - numeric: forgiving parser (commas, %, fractions, scientific notation, "≈", unicode minus, units,
 *    "p = 0.03" labels, "p < 0.001" inequalities when `allowInequality`), documented tolerance rules
 *    (see `TOLERANCE` / `numericTolerance`), diagnostic feedback (rounding, sign, percent-vs-proportion).
 *  - choice / multi: index equality, with per-option feedback.
 *  - interpretation: rubric engine in ./rubric.ts.
 *  - display: grades the wrapped question.
 */
import type { Answer, GradeResult, MultiChoiceAnswer, NumericAnswer, NumericKind, QuestionAnswer, Response } from './types'
import { gradeInterpretation } from './rubric'
import { fmt, fmtP } from '@/lib/stats/format'

export { gradeInterpretation }

// ---------------------------------------------------------------------------------------------
// Tolerance policy
// ---------------------------------------------------------------------------------------------

/**
 * Project-standard absolute tolerances by answer kind (docs/problem-authoring.md §Tolerance).
 * `mean`/`other` use half a unit in the last displayed digit (or 0.5 % relative, whichever is larger).
 */
export const TOLERANCE: Record<Exclude<NumericKind, 'mean' | 'other' | 'percent'>, number> = {
  pValue: 0.0005,
  testStat: 0.01,
  proportion: 0.001,
  count: 1e-9,
}

/** Default display digits by kind. */
export const DIGITS: Record<NumericKind, number> = {
  pValue: 4,
  testStat: 2,
  proportion: 3,
  count: 0,
  mean: 2,
  percent: 1,
  other: 2,
}

export function answerDigits(a: NumericAnswer): number {
  return a.digits ?? (a.kind ? DIGITS[a.kind] : 2)
}

export function numericTolerance(a: NumericAnswer): number {
  if (a.tolerance !== undefined) return a.tolerance
  if (a.relativeTolerance !== undefined) return Math.abs(a.value) * a.relativeTolerance
  if (a.kind && a.kind in TOLERANCE) return TOLERANCE[a.kind as keyof typeof TOLERANCE]
  // Default (means, percents, other): half a unit in the last displayed digit.
  return 0.5 * 10 ** -answerDigits(a) + 1e-9
}

/** Display string for a numeric answer (reveal / debrief). p-values use AP "< 0.0001" style. */
export function formatNumericAnswer(a: NumericAnswer): string {
  const body = a.kind === 'pValue' ? fmtP(a.value) : fmt(a.value, answerDigits(a))
  return a.units ? `${body} ${a.units}` : body
}

/** Reveal text for any answer type. */
export function answerText(answer: Answer): string {
  const q = answer.type === 'display' ? answer.question : answer
  switch (q.type) {
    case 'numeric':
      return formatNumericAnswer(q)
    case 'choice':
      return q.options[q.correct]
    case 'multi':
      return q.correct.map((i) => q.options[i]).join('; ')
    case 'interpretation':
      return q.exemplar
  }
}

// ---------------------------------------------------------------------------------------------
// Numeric parsing
// ---------------------------------------------------------------------------------------------

export interface ParsedNumeric {
  value: number
  /** Present when the learner wrote a bound ("< 0.001") instead of a value. */
  inequality?: '<' | '>'
  /** The learner wrote a percent sign / the word percent. */
  percent: boolean
}

const UNIT_TAIL = /^[a-zµ°\/²³%\s.()]*$/

/** Parse learner numeric input into a value plus flags. Returns null when no number is present. */
export function parseNumeric(input: string | number | null | undefined): ParsedNumeric | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? { value: input, percent: false } : null
  let s = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/−/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[×✕✖]/g, 'x')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .toLowerCase()
    .trim()
  if (!s) return null
  // Leading label: "p =", "p-value:", "z ≈", "answer:", "t ="
  s = s
    .replace(/^[a-z_^\s-]{0,20}(?=[=:<>≈~])/, '')
    .replace(/^[=:]\s*/, '')
    .trim()
  // Leading approximation markers
  s = s.replace(/^(?:≈|~|approx(?:imately|\.)?|about|roughly)\s*/, '').trim()
  // Inequality
  let inequality: '<' | '>' | undefined
  const ineq = /^(<=?|>=?|less than|greater than|under|over|below|above)\s*/.exec(s)
  if (ineq) {
    inequality = ineq[1].startsWith('<') || ['less than', 'under', 'below'].includes(ineq[1]) ? '<' : '>'
    s = s.slice(ineq[0].length).trim()
  }
  // Commas: thousands separators, or a European decimal comma when there is no dot.
  if (!s.includes('.') && /^-?\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.')
  s = s.replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
  s = s.replace(/,/g, '')
  // Percent
  let percent = false
  const pctTail = /\s*(?:%|percent|pct)\s*$/
  if (pctTail.test(s)) {
    percent = true
    s = s.replace(pctTail, '').trim()
  }
  const num = '[-+]?(?:\\d+\\.?\\d*|\\.\\d+)'
  let value: number | null = null
  let m: RegExpExecArray | null
  if ((m = new RegExp(`^(${num})\\s*(?:x|\\*)\\s*10\\s*\\^?\\s*\\(?\\s*([-+]?\\d+)\\s*\\)?\\s*(.*)$`).exec(s))) {
    if (!UNIT_TAIL.test(m[3])) return null
    value = Number(m[1]) * 10 ** Number(m[2])
  } else if ((m = new RegExp(`^10\\s*\\^\\s*\\(?\\s*([-+]?\\d+)\\s*\\)?$`).exec(s))) {
    value = 10 ** Number(m[1])
  } else if ((m = new RegExp(`^(${num})\\s*/\\s*(${num})\\s*(.*)$`).exec(s))) {
    if (!UNIT_TAIL.test(m[3])) return null
    const d = Number(m[2])
    if (d === 0) return null
    value = Number(m[1]) / d
  } else if ((m = new RegExp(`^(${num}(?:e[-+]?\\d+)?)\\s*(.*)$`).exec(s))) {
    if (!UNIT_TAIL.test(m[2])) return null
    if (/(?:%|percent|pct)/.test(m[2])) percent = true
    value = Number(m[1])
  }
  if (value === null || !Number.isFinite(value)) return null
  return { value, inequality, percent }
}

/**
 * Parse learner numeric input to a plain number: "1,234.5", "45%" → 0.45, "3/4", "−2.1", "1.2e-4",
 * "≈ 0.05", "p = 0.03", "12.5 km". Inequalities ("< 0.001") return null here — use `parseNumeric`.
 */
export function parseNumber(input: string | number | null | undefined, opts: { percentAsProportion?: boolean } = {}): number | null {
  const p = parseNumeric(input)
  if (!p || p.inequality) return null
  const asProp = opts.percentAsProportion ?? true
  return p.percent && asProp ? p.value / 100 : p.value
}

// ---------------------------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------------------------

function gradeNumeric(answer: NumericAnswer, response: Response): GradeResult {
  const parsed = parseNumeric(typeof response === 'string' || typeof response === 'number' ? response : null)
  if (!parsed) return { correct: false, score: 0, feedback: 'Enter a number.' }
  const tol = numericTolerance(answer)
  const percentUnits = answer.units === '%' || answer.kind === 'percent'

  if (parsed.inequality) {
    const bound = parsed.percent && !percentUnits ? parsed.value / 100 : parsed.value
    if (parsed.inequality === '<' && answer.allowInequality) {
      const max = typeof answer.allowInequality === 'object' ? answer.allowInequality.max : 0.001
      if (answer.value < bound && bound <= max + 1e-12) return { correct: true, score: 1, feedback: `Confirmed (< ${bound}).` }
      if (answer.value >= bound) return { correct: false, score: 0, feedback: `The value is not below ${bound}. State the value itself.` }
      return { correct: false, score: 0, feedback: `“< ${bound}” is too loose a bound here. Report the value to ${answerDigits(answer)} decimal places, or a bound no larger than ${max}.` }
    }
    return { correct: false, score: 0, feedback: 'State the value itself, not a bound.' }
  }

  const v = parsed.percent && !percentUnits ? parsed.value / 100 : parsed.value
  const diff = Math.abs(v - answer.value)
  if (diff <= tol) return { correct: true, score: 1, feedback: 'Confirmed.' }

  // Diagnostics
  if (Math.abs(-v - answer.value) <= tol) return { correct: false, score: 0, feedback: 'Sign error — check the direction of the subtraction.' }
  if (!percentUnits && Math.abs(v / 100 - answer.value) <= tol) return { correct: false, score: 0, feedback: 'Express the answer as a proportion between 0 and 1, not a percentage.' }
  if (percentUnits && Math.abs(v * 100 - answer.value) <= tol) return { correct: false, score: 0, feedback: 'Express the answer as a percentage, not a proportion.' }
  if (diff <= Math.max(10 * tol, 0.02 * Math.abs(answer.value))) return { correct: false, score: 0, feedback: 'Close, but not within tolerance — carry full precision through the calculation and round once at the end.' }
  return { correct: false, score: 0, feedback: 'Not within tolerance.' }
}

function gradeMulti(answer: MultiChoiceAnswer, response: Response): GradeResult {
  const chosen = Array.isArray(response) ? [...new Set(response)].sort((a, b) => a - b) : []
  const want = [...answer.correct].sort((a, b) => a - b)
  const ok = chosen.length === want.length && chosen.every((c, i) => c === want[i])
  if (ok) return { correct: true, score: 1, feedback: 'Confirmed.' }
  const extra = chosen.filter((c) => !want.includes(c))
  const missing = want.filter((w) => !chosen.includes(w))
  const notes: string[] = []
  for (const i of extra) {
    const fb = answer.feedback?.[i]
    if (fb) notes.push(fb)
  }
  const parts: string[] = []
  if (extra.length) parts.push(`${extra.length} selected option${extra.length > 1 ? 's do' : ' does'} not apply`)
  if (missing.length) parts.push(`${missing.length} correct option${missing.length > 1 ? 's' : ''} not selected`)
  return { correct: false, score: 0, feedback: `Selection does not match: ${parts.join('; ')}.${notes.length ? ' ' + notes.join(' ') : ''}` }
}

export function gradeQuestion(answer: QuestionAnswer, response: Response): GradeResult {
  switch (answer.type) {
    case 'numeric':
      return gradeNumeric(answer, response)
    case 'choice': {
      const i = typeof response === 'number' ? response : response === null || Array.isArray(response) ? NaN : Number(response)
      if (!Number.isInteger(i)) return { correct: false, score: 0, feedback: 'Select an option.' }
      const ok = i === answer.correct
      const fb = answer.feedback?.[i]
      return { correct: ok, score: ok ? 1 : 0, feedback: ok ? 'Confirmed.' : (fb ?? 'Not the best answer.') }
    }
    case 'multi':
      return gradeMulti(answer, response)
    case 'interpretation':
      return gradeInterpretation(answer, typeof response === 'string' ? response : '')
  }
}

export function grade(answer: Answer, response: Response): GradeResult {
  return gradeQuestion(answer.type === 'display' ? answer.question : answer, response)
}

/** True when the learner has entered something gradeable (used for "unanswered" counts). */
export function isAnswered(answer: Answer, response: Response): boolean {
  const q = answer.type === 'display' ? answer.question : answer
  if (response === null || response === undefined) return false
  switch (q.type) {
    case 'numeric':
    case 'interpretation':
      return typeof response === 'string' ? response.trim().length > 0 : typeof response === 'number'
    case 'choice':
      return typeof response === 'number'
    case 'multi':
      return Array.isArray(response) && response.length > 0
  }
}
