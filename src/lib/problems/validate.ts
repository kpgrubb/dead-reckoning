/**
 * Static checks on generators and generated problem instances. Used by `defineGenerator` (at
 * registration and after every draw) and by tests/unit/problems/all-generators.test.ts — the
 * Math Auditor's first line of defense against solution/answer drift and malformed items.
 */
import type { Answer, DisplaySpec, ProblemGenerator, ProblemInstance } from './types'
import { answerDigits, numericTolerance } from './grade'
import { gradeInterpretation } from './rubric'
import { fmt, fmtP } from '@/lib/stats/format'

export const GENERATOR_ID = /^act-(?:[0-9]|10)\/[a-z0-9]+(?:-[a-z0-9]+)*$/

export class GeneratorValidationError extends Error {
  generatorId: string
  problems: string[]
  constructor(generatorId: string, problems: string[]) {
    super(`Generator "${generatorId}": ${problems.join(' · ')}`)
    this.name = 'GeneratorValidationError'
    this.generatorId = generatorId
    this.problems = problems
  }
}

/** Definition-level checks (id, topics, label). Returns a list of problems (empty = valid). */
export function validateGeneratorDefinition(g: Partial<ProblemGenerator>): string[] {
  const out: string[] = []
  if (typeof g.id !== 'string' || !GENERATOR_ID.test(g.id)) out.push(`id must match act-N/slug (kebab-case), got "${String(g.id)}"`)
  if (!Array.isArray(g.ap_topics) || g.ap_topics.length === 0) out.push('ap_topics must be a non-empty array of CED topic codes')
  else if (g.ap_topics.some((t) => typeof t !== 'string' || !/^\d{1,2}\.\d{1,2}[A-Z]?$/.test(t) && t !== 'prologue')) out.push(`ap_topics entries must look like "1.7" (got ${JSON.stringify(g.ap_topics)})`)
  if (typeof g.label !== 'string' || !g.label.trim()) out.push('label must be a non-empty string')
  if (typeof g.generate !== 'function') out.push('generate must be a function')
  if (g.skills && g.skills.some((s) => !['1', '2', '3', '4'].includes(s))) out.push('skills must be drawn from "1" | "2" | "3" | "4"')
  return out
}

function isFiniteArray(xs: unknown): xs is number[] {
  return Array.isArray(xs) && xs.length > 0 && xs.every((v) => typeof v === 'number' && Number.isFinite(v))
}

export function validateDisplaySpec(spec: DisplaySpec, where = 'display'): string[] {
  const out: string[] = []
  if (!spec || typeof spec !== 'object') return [`${where}: missing spec`]
  switch (spec.kind) {
    case 'dotplot':
    case 'histogram':
      if (!isFiniteArray(spec.values)) out.push(`${where}: values must be a non-empty finite array`)
      if (spec.kind === 'histogram' && spec.binWidth !== undefined && !(spec.binWidth > 0)) out.push(`${where}: binWidth must be positive`)
      break
    case 'boxplot':
      if (!Array.isArray(spec.groups) || spec.groups.length === 0) out.push(`${where}: boxplot needs groups`)
      else for (const g of spec.groups) if (!g.name || !isFiniteArray(g.values)) out.push(`${where}: boxplot group "${g.name}" malformed`)
      break
    case 'scatter':
      if (!Array.isArray(spec.points) || spec.points.length < 2 || spec.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) out.push(`${where}: scatter needs ≥ 2 finite points`)
      break
    case 'residual':
      if (!Array.isArray(spec.points) || spec.points.length < 2 || spec.points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.resid))) out.push(`${where}: residual plot needs ≥ 2 finite points`)
      break
    case 'normal':
      if (!Number.isFinite(spec.mean) || !(spec.sd > 0)) out.push(`${where}: normal needs finite mean and positive sd`)
      if (spec.shade && !(spec.shade.from <= spec.shade.to)) out.push(`${where}: shade.from must be ≤ shade.to`)
      break
    case 'table':
      if (!Array.isArray(spec.columns) || spec.columns.length === 0) out.push(`${where}: table needs columns`)
      if (!Array.isArray(spec.rows) || spec.rows.length === 0) out.push(`${where}: table needs rows`)
      else if (spec.rows.some((r) => !Array.isArray(r) || r.length !== spec.columns.length)) out.push(`${where}: every table row must have ${spec.columns.length} cells`)
      break
    case 'bar':
      if (!Array.isArray(spec.categories) || spec.categories.length === 0) out.push(`${where}: bar needs categories`)
      if (!isFiniteArray(spec.counts) || spec.counts.length !== spec.categories.length) out.push(`${where}: bar counts must align with categories`)
      break
    default:
      out.push(`${where}: unknown display kind "${(spec as { kind?: string }).kind}"`)
  }
  return out
}

const NUM_IN_TEXT = /(?<![\w.])[-−]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\w.]|\.\d)/g

/** Every number that appears in a solution string (Markdown/KaTeX), as JS numbers. */
export function numbersIn(text: string): number[] {
  const out: number[] = []
  for (const m of text.matchAll(NUM_IN_TEXT)) {
    const v = Number(m[0].replace(/−/g, '-').replace(/,/g, ''))
    if (Number.isFinite(v)) out.push(v)
  }
  return out
}

function validateAnswer(a: Answer, solution: string, where = 'answer'): string[] {
  const out: string[] = []
  switch (a.type) {
    case 'numeric': {
      if (!Number.isFinite(a.value)) out.push(`${where}: value is not finite`)
      else {
        const tol = numericTolerance(a)
        if (!(tol >= 0) || !Number.isFinite(tol)) out.push(`${where}: tolerance must be a finite non-negative number`)
        const shown = a.kind === 'pValue' ? fmtP(a.value) : fmt(a.value, answerDigits(a))
        const nums = numbersIn(solution)
        const ok = solution.includes(shown) || solution.includes(shown.replace('−', '-')) || nums.some((n) => Math.abs(n - a.value) <= Math.max(tol, 0.5 * 10 ** -answerDigits(a)) + 1e-12)
        if (!ok) out.push(`${where}: formatted answer "${shown}" does not appear in the solution (numbers found: ${nums.slice(0, 12).join(', ') || 'none'}) — solution/answer drift?`)
      }
      break
    }
    case 'choice': {
      if (!Array.isArray(a.options) || a.options.length < 2) out.push(`${where}: choice needs ≥ 2 options`)
      else {
        if (!Number.isInteger(a.correct) || a.correct < 0 || a.correct >= a.options.length) out.push(`${where}: correct index ${a.correct} out of range`)
        const norm = a.options.map((o) => o.trim().toLowerCase())
        if (new Set(norm).size !== norm.length) out.push(`${where}: options must be distinct`)
        if (norm.some((o) => !o)) out.push(`${where}: options must be non-empty`)
        if (a.feedback && a.feedback.length !== a.options.length) out.push(`${where}: feedback array must align with options`)
      }
      break
    }
    case 'multi': {
      if (!Array.isArray(a.options) || a.options.length < 2) out.push(`${where}: multi needs ≥ 2 options`)
      else {
        if (!Array.isArray(a.correct) || a.correct.length === 0) out.push(`${where}: multi needs ≥ 1 correct index`)
        else if (a.correct.some((i) => !Number.isInteger(i) || i < 0 || i >= a.options.length)) out.push(`${where}: multi correct index out of range`)
        else if (new Set(a.correct).size !== a.correct.length) out.push(`${where}: multi correct indices must be distinct`)
        const norm = a.options.map((o) => o.trim().toLowerCase())
        if (new Set(norm).size !== norm.length) out.push(`${where}: options must be distinct`)
      }
      break
    }
    case 'interpretation': {
      if (!Array.isArray(a.required) || a.required.length === 0) out.push(`${where}: interpretation needs ≥ 1 required rubric group`)
      else {
        a.required.forEach((g, i) => {
          if (!g.label) out.push(`${where}: rubric group ${i} has no label`)
          if (!Array.isArray(g.phrasings) || g.phrasings.length === 0) out.push(`${where}: rubric group "${g.label}" has no phrasings`)
        })
      }
      if (typeof a.exemplar !== 'string' || !a.exemplar.trim()) out.push(`${where}: exemplar must be non-empty`)
      else if (Array.isArray(a.required) && a.required.length) {
        const r = gradeInterpretation(a, a.exemplar)
        if (!r.correct) out.push(`${where}: exemplar fails its own rubric — ${r.feedback}`)
      }
      break
    }
    case 'display': {
      out.push(...validateDisplaySpec(a.display, `${where}.display`))
      if (!a.question || (a.question as { type?: string }).type === 'display') out.push(`${where}: display.question must be numeric/choice/multi/interpretation`)
      else out.push(...validateAnswer(a.question, solution, `${where}.question`))
      break
    }
    default:
      out.push(`${where}: unknown answer type "${(a as { type?: string }).type}"`)
  }
  return out
}

/** Instance-level checks. Returns a list of problems (empty = valid). */
export function validateInstance(p: ProblemInstance): string[] {
  const out: string[] = []
  if (!p || typeof p !== 'object') return ['instance is not an object']
  if (typeof p.prompt !== 'string' || !p.prompt.trim()) out.push('prompt must be non-empty')
  if (!Array.isArray(p.hints) || p.hints.length < 2 || p.hints.length > 3) out.push(`hints must have 2–3 entries (got ${Array.isArray(p.hints) ? p.hints.length : 'none'})`)
  else if (p.hints.some((h) => typeof h !== 'string' || !h.trim())) out.push('hints must be non-empty strings')
  if (typeof p.solution !== 'string' || !p.solution.trim()) out.push('solution must be non-empty')
  if (p.data) out.push(...validateDisplaySpec(p.data, 'data'))
  if (!p.answer) out.push('answer is missing')
  else out.push(...validateAnswer(p.answer, typeof p.solution === 'string' ? p.solution : ''))
  return out
}
