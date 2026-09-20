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
 *
 * See docs/problem-authoring.md for the step-by-step guide, tolerance table and rubric templates.
 */
import type { Rng } from '@/lib/rng'

export type ApSkill = '1' | '2' | '3' | '4' // CED skill categories 1–4 (selecting methods, data analysis, probability/simulation, argumentation)

/**
 * Semantic answer kinds with project-standard tolerances (see `TOLERANCE` in ./grade.ts):
 *  pValue 0.0005 abs · testStat 0.01 abs · proportion 0.001 abs · count exact ·
 *  mean/other: half a unit in the last displayed digit (from `digits`).
 */
export type NumericKind = 'pValue' | 'testStat' | 'proportion' | 'count' | 'mean' | 'percent' | 'other'

export interface NumericAnswer {
  type: 'numeric'
  value: number
  /** Absolute tolerance (preferred) — or relative tolerance as a fraction of |value|. */
  tolerance?: number
  relativeTolerance?: number
  units?: string
  /** Suggested display precision for the reveal and for the default tolerance. */
  digits?: number
  /** Semantic kind; sets default tolerance/digits when not given explicitly. */
  kind?: NumericKind
  /**
   * Accept AP-style inequality answers such as "p < 0.001" / "< 0.0001". `true` accepts any bound
   * ≤ 0.001; an object sets the largest bound accepted. The stated bound must exceed the true value.
   */
  allowInequality?: boolean | { max: number }
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
  /** Optional per-option feedback (shown for wrongly selected / missed options). */
  feedback?: (string | null)[]
}

/**
 * Free-text interpretation ("conclusion in context") graded by the rubric engine in ./rubric.ts.
 *
 * `required` is a list of concept groups; each group is satisfied by ANY of its phrasings.
 * String phrasings are matched on normalized, lightly-stemmed, synonym-canonicalized tokens with
 * negation awareness ("do not reject" does not satisfy "reject"). RegExp phrasings are tested
 * against the lower-cased, symbol-normalized text (numbers intact) for structure checks.
 * `forbidden` phrasings fail the response (e.g. "proves", "accept H0", "probability H0 is true")
 * and explain why. Prefer the templates in ./rubrics.ts over hand-written groups.
 */
export interface InterpretationAnswer {
  type: 'interpretation'
  required: RubricGroup[]
  forbidden?: (RubricPhrase | ForbiddenPhrase)[]
  minWords?: number
  /** Model response shown after grading. Must itself pass the rubric (checked by defineGenerator). */
  exemplar: string
  /**
   * Fraction of required weight needed to count as correct (default 1 = every required group).
   * Optional groups never affect correctness.
   */
  passScore?: number
}

export interface RubricGroup {
  /** Learner-facing label, e.g. "States the direction of the effect". */
  label: string
  phrasings: RubricPhrase[]
  /** Feedback shown when the group is not met (what a complete answer says). */
  feedback?: string
  /**
   * 'positive' (default): a string phrasing only matches a NON-negated occurrence unless the
   * phrasing itself contains a negation ("fail to reject", "not enough evidence").
   * 'any': ignore negation (use for direction words that legitimately follow "not enough evidence that…").
   */
  polarity?: 'positive' | 'any'
  /** Number of distinct phrasings that must match (default 1). Useful for "names the context" groups. */
  minMatches?: number
  /** Relative weight in the score (default 1). */
  weight?: number
  /** Optional groups count toward feedback but never toward correctness or score. */
  optional?: boolean
}

/** Plain string = normalized token phrase (gaps of up to 3 tokens allowed); RegExp for structure. */
export type RubricPhrase = string | RegExp

export interface ForbiddenPhrase {
  phrase: RubricPhrase
  /** Learner-facing explanation of why this claim is not supported. */
  why: string
  /** Short label for the debrief, e.g. "Claims proof". */
  label?: string
}

/** "Interpret this display" item: a chart spec rendered by <Plot>, then a choice/numeric/interpretation. */
export interface DisplayAnswer {
  type: 'display'
  display: DisplaySpec
  question: NumericAnswer | ChoiceAnswer | MultiChoiceAnswer | InterpretationAnswer
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

/** The gradeable part of an answer (unwraps `display`). */
export type QuestionAnswer = Exclude<Answer, DisplayAnswer>

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

export interface RubricResult {
  label: string
  met: boolean
  /** Group feedback (shown when not met). */
  feedback?: string
  optional?: boolean
}

export interface GradeResult {
  correct: boolean
  /** 0–1 partial credit for rubric items; 0/1 otherwise. */
  score: number
  /** Learner-facing feedback. */
  feedback: string
  /** For interpretation answers: which rubric groups were met. */
  rubric?: RubricResult[]
  /** For interpretation answers: forbidden claims found, with explanations. */
  forbidden?: { label: string; why: string }[]
}

/** Raw learner input, by answer type. */
export type Response = number | string | number[] | null
