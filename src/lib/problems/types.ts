/**
 * Problem-generator framework — contract for drills, mission beats and checkpoints.
 *
 * A generator turns a seeded Rng into a fully-formed problem whose ANSWER IS COMPUTED BY CODE
 * (via @/lib/stats). Never hard-code a numeric answer. If a parameter draw yields a degenerate or
 * unrealistic case (inference conditions not met, negative counts, r ≈ 0 when the point is a
 * relationship…), the generator must redraw (`retry` helper in ./generate.ts) unless the
 * degenerate case IS the lesson — then say so in `notes`.
 *
 * Text fields are Markdown with inline `$…$` / display `$$…$$` KaTeX (rendered by <RichText>).
 * The Assessment Designer agent owns this directory; Act Teams add generators under generators/act-N/.
 */
import type { Rng } from '@/lib/rng'

export type ApSkill = '1' | '2' | '3' | '4' // CED skill categories 1–4 (selecting methods, data analysis, probability/simulation, argumentation)

export interface NumericAnswer {
  type: 'numeric'
  value: number
  /** Absolute tolerance (preferred) — or relative tolerance as a fraction of |value|. */
  tolerance?: number
  relativeTolerance?: number
  units?: string
  /** Suggested display precision for the reveal. */
  digits?: number
}

export interface ChoiceAnswer {
  type: 'choice'
  options: string[]
  correct: number
  /** Optional per-option feedback explaining why a distractor is wrong. */
  feedback?: (string | null)[]
}

export interface MultiChoiceAnswer {
  type: 'multi'
  options: string[]
  correct: number[]
}

/**
 * Free-text interpretation ("conclusion in context") graded by a keyword/structure rubric.
 * `required` is a list of concept groups; each group is satisfied by ANY of its phrasings
 * (case-insensitive substring or regex). `forbidden` phrasings fail the response outright
 * (e.g. "proves", "the probability the null is true").
 */
export interface InterpretationAnswer {
  type: 'interpretation'
  required: RubricGroup[]
  forbidden?: RubricPhrase[]
  minWords?: number
  /** Model response shown after grading. */
  exemplar: string
}

export interface RubricGroup {
  /** Learner-facing label, e.g. "States the direction of the effect". */
  label: string
  phrasings: RubricPhrase[]
}

/** Plain string = case-insensitive substring; RegExp for structure. */
export type RubricPhrase = string | RegExp

/** "Interpret this display" item: a chart spec rendered by <Plot>, then a choice/numeric/interpretation. */
export interface DisplayAnswer {
  type: 'display'
  display: DisplaySpec
  question: NumericAnswer | ChoiceAnswer | InterpretationAnswer
}

export type DisplaySpec =
  | { kind: 'dotplot'; values: number[]; label?: string }
  | { kind: 'histogram'; values: number[]; binWidth?: number; label?: string }
  | { kind: 'boxplot'; groups: { name: string; values: number[] }[]; label?: string }
  | { kind: 'scatter'; points: { x: number; y: number }[]; xLabel?: string; yLabel?: string; fitLine?: boolean }
  | { kind: 'residual'; points: { x: number; resid: number }[]; xLabel?: string }
  | { kind: 'normal'; mean: number; sd: number; shade?: { from: number; to: number } }
  | { kind: 'table'; columns: string[]; rows: (string | number)[][] }
  | { kind: 'bar'; categories: string[]; counts: number[]; label?: string }

export type Answer = NumericAnswer | ChoiceAnswer | MultiChoiceAnswer | InterpretationAnswer | DisplayAnswer

export interface ProblemInstance {
  /** Markdown + KaTeX. */
  prompt: string
  /** Optional dataset shown above the prompt (small tables, lists). */
  data?: DisplaySpec
  answer: Answer
  /** Tiered hints: [nudge, method, nearly-the-answer]. 2–3 entries. */
  hints: string[]
  /** Full worked solution, Markdown + KaTeX. Numbers must come from the same computation as `answer`. */
  solution: string
  /** Common-mistake callout shown after a wrong answer (optional). */
  misconception?: string
  /** Internal notes (why a draw was accepted, etc.). Never shown. */
  notes?: string
}

export interface ProblemGenerator {
  /** Unique id: "act-1/five-number-summary". */
  id: string
  ap_topics: string[]
  skills?: ApSkill[]
  /** Short learner-facing label for the drill card header. */
  label: string
  generate(rng: Rng): ProblemInstance
}

export interface GradeResult {
  correct: boolean
  /** 0–1 partial credit for rubric items; 0/1 otherwise. */
  score: number
  /** Learner-facing feedback. */
  feedback: string
  /** For interpretation answers: which rubric groups were met. */
  rubric?: { label: string; met: boolean }[]
}

/** Raw learner input, by answer type. */
export type Response = number | string | number[] | null
