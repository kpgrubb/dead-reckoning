/**
 * Grading (baseline). The Assessment Designer agent owns and extends this — especially the
 * interpretation rubric engine. Keep it pure: no React, no store access.
 */
import type { Answer, GradeResult, InterpretationAnswer, NumericAnswer, Response, RubricPhrase } from './types'

/** Parse learner numeric input: "1,234.5", "45%", "3/4", "−2.1", " 0.05 " */
export function parseNumber(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  let s = input.trim().replace(/−/g, '-').replace(/,/g, '')
  if (!s) return null
  let pct = false
  if (s.endsWith('%')) {
    pct = true
    s = s.slice(0, -1).trim()
  }
  const frac = /^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/.exec(s)
  let v: number
  if (frac) v = Number(frac[1]) / Number(frac[2])
  else v = Number(s)
  if (!Number.isFinite(v)) return null
  return pct ? v / 100 : v
}

export function numericTolerance(a: NumericAnswer): number {
  if (a.tolerance !== undefined) return a.tolerance
  if (a.relativeTolerance !== undefined) return Math.abs(a.value) * a.relativeTolerance
  // Default: half a unit in the last displayed digit, or 0.5% relative, whichever is larger.
  const digits = a.digits ?? 2
  return Math.max(0.5 * 10 ** -digits, Math.abs(a.value) * 0.005)
}

function matches(text: string, phrase: RubricPhrase): boolean {
  if (typeof phrase === 'string') return text.includes(phrase.toLowerCase())
  return phrase.test(text)
}

export function gradeInterpretation(a: InterpretationAnswer, response: string): GradeResult {
  const text = response.toLowerCase().replace(/\s+/g, ' ').trim()
  const words = text ? text.split(' ').length : 0
  if (a.minWords && words < a.minWords) {
    return { correct: false, score: 0, feedback: `Write a fuller response (at least ${a.minWords} words) that states the conclusion in context.` }
  }
  const forbiddenHit = (a.forbidden ?? []).find((f) => matches(text, f))
  const rubric = a.required.map((g) => ({ label: g.label, met: g.phrasings.some((p) => matches(text, p)) }))
  const met = rubric.filter((r) => r.met).length
  const score = forbiddenHit ? 0 : met / Math.max(1, rubric.length)
  const correct = !forbiddenHit && met === rubric.length
  let feedback: string
  if (forbiddenHit) {
    feedback = `Your response contains a claim that is not supported by the analysis (“${String(forbiddenHit).replace(/^\/|\/[a-z]*$/g, '')}”). Statistical conclusions never prove; they provide or fail to provide convincing evidence.`
  } else if (correct) {
    feedback = 'Conclusion stated in context with all required elements.'
  } else {
    const missing = rubric.filter((r) => !r.met).map((r) => r.label)
    feedback = `Missing: ${missing.join('; ')}.`
  }
  return { correct, score, feedback, rubric }
}

export function grade(answer: Answer, response: Response): GradeResult {
  switch (answer.type) {
    case 'numeric': {
      const v = parseNumber(typeof response === 'string' || typeof response === 'number' ? response : null)
      if (v === null) return { correct: false, score: 0, feedback: 'Enter a number.' }
      const tol = numericTolerance(answer)
      const ok = Math.abs(v - answer.value) <= tol
      return { correct: ok, score: ok ? 1 : 0, feedback: ok ? 'Confirmed.' : 'Not within tolerance.' }
    }
    case 'choice': {
      const i = typeof response === 'number' ? response : Number(response)
      const ok = i === answer.correct
      const fb = answer.feedback?.[i]
      return { correct: ok, score: ok ? 1 : 0, feedback: ok ? 'Confirmed.' : (fb ?? 'Not the best answer.') }
    }
    case 'multi': {
      const chosen = Array.isArray(response) ? [...response].sort((a, b) => a - b) : []
      const want = [...answer.correct].sort((a, b) => a - b)
      const ok = chosen.length === want.length && chosen.every((c, i) => c === want[i])
      return { correct: ok, score: ok ? 1 : 0, feedback: ok ? 'Confirmed.' : 'Selection does not match.' }
    }
    case 'interpretation':
      return gradeInterpretation(answer, typeof response === 'string' ? response : '')
    case 'display':
      return grade(answer.question, response)
  }
}
