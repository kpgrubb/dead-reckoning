/**
 * Checkpoint definitions — one per Act. The Assessment Designer owns the runner; each Act's
 * Problem Author registers a CheckpointSpec under checkpoints/act-N.ts (auto-discovered).
 *
 * A checkpoint is a fixed-length, mixed-format assessment built from generators, so every attempt
 * gets fresh parameters. Failure → debrief listing the modules to revisit, then retry.
 *
 * Pure helpers here (build, score, drafts) are what <Checkpoint> renders and what tests exercise.
 */
import { seedFrom } from '@/lib/rng'
import { grade, isAnswered } from './grade'
import { getGenerator, hasGenerator, instantiate } from './registry'
import type { GradeResult, ProblemGenerator, ProblemInstance, Response } from './types'

export interface CheckpointItem {
  /** Stable id within the checkpoint, e.g. "q3". */
  id: string
  /** Registered generator id, or an inline generator. */
  generator: string | ProblemGenerator
  /** Module ids to revisit if missed. */
  review: string[]
  /** Weight (default 1). */
  weight?: number
  /** Optional in-story line shown in the debrief when this item is missed (Markdown). */
  debrief?: string
}

export interface CheckpointSpec {
  /** "act-1" … "act-9". */
  act: string
  title: string
  /** In-story framing shown before the first item (Markdown). */
  briefing: string
  items: CheckpointItem[]
  /** Pass threshold as a fraction (default 0.8). */
  threshold?: number
  /** Story text on pass / fail (Markdown). */
  onPass: string
  onFail: string
  est_minutes: number
}

// Eager glob: `*.test.ts` beside the specs is excluded so Vitest's runtime never reaches the app bundle.
const modules = import.meta.glob<Record<string, unknown>>(['./checkpoints/*.ts', '!./checkpoints/*.test.ts'], { eager: true })

function isSpec(v: unknown): v is CheckpointSpec {
  return !!v && typeof v === 'object' && Array.isArray((v as CheckpointSpec).items) && typeof (v as CheckpointSpec).act === 'string'
}

const registry = new Map<string, CheckpointSpec>()
for (const mod of Object.values(modules)) {
  for (const value of Object.values(mod)) if (isSpec(value)) registry.set(value.act, value)
}

export function getCheckpoint(act: string): CheckpointSpec | undefined {
  return registry.get(act)
}

export function allCheckpoints(): CheckpointSpec[] {
  return [...registry.values()].sort((a, b) => a.act.localeCompare(b.act))
}

/** Static checks on a spec (ids unique, generators registered, threshold sane). Empty = valid. */
export function validateCheckpointSpec(spec: CheckpointSpec): string[] {
  const out: string[] = []
  if (!/^act-(?:[0-9]|10)$/.test(spec.act)) out.push(`act must look like "act-N" (got "${spec.act}")`)
  if (!spec.title?.trim()) out.push('title is required')
  if (!spec.briefing?.trim()) out.push('briefing is required')
  if (!spec.onPass?.trim() || !spec.onFail?.trim()) out.push('onPass and onFail story text are required')
  if (!(spec.est_minutes > 0)) out.push('est_minutes must be positive')
  if (spec.threshold !== undefined && !(spec.threshold > 0 && spec.threshold <= 1)) out.push('threshold must be in (0, 1]')
  if (!spec.items?.length) out.push('items must be non-empty')
  const ids = new Set<string>()
  for (const item of spec.items ?? []) {
    if (!item.id) out.push('every item needs an id')
    else if (ids.has(item.id)) out.push(`duplicate item id "${item.id}"`)
    ids.add(item.id)
    if (typeof item.generator === 'string' && !hasGenerator(item.generator)) out.push(`item "${item.id}": unknown generator "${item.generator}"`)
    if (!Array.isArray(item.review) || item.review.length === 0) out.push(`item "${item.id}": review must list ≥ 1 module id`)
    if (item.weight !== undefined && !(item.weight > 0)) out.push(`item "${item.id}": weight must be positive`)
  }
  return out
}

/** Seed for one checkpoint item on a given attempt (fresh parameters per attempt). */
export function checkpointSeed(learnerSeed: number, act: string, itemId: string, attemptNo: number): number {
  return seedFrom(learnerSeed, act, itemId, attemptNo)
}

/** Instantiate every item for an attempt. */
export function buildCheckpointProblems(spec: CheckpointSpec, learnerSeed: number, attemptNo: number): Record<string, ProblemInstance> {
  const out: Record<string, ProblemInstance> = {}
  for (const item of spec.items) {
    const g = typeof item.generator === 'string' ? getGenerator(item.generator) : item.generator
    out[item.id] = instantiate(g, checkpointSeed(learnerSeed, spec.act, item.id, attemptNo))
  }
  return out
}

export interface MissedItem {
  itemId: string
  reviewModules: string[]
}

export interface CheckpointScore {
  results: Record<string, GradeResult>
  /** Weighted fraction 0–1. */
  score: number
  passed: boolean
  missed: MissedItem[]
  answered: number
  total: number
}

/** Grade every item; weights and threshold from the spec. Unanswered items score 0. */
export function scoreCheckpoint(spec: CheckpointSpec, problems: Record<string, ProblemInstance>, responses: Record<string, Response>): CheckpointScore {
  const results: Record<string, GradeResult> = {}
  let earned = 0
  let total = 0
  let answered = 0
  const missed: MissedItem[] = []
  for (const item of spec.items) {
    const p = problems[item.id]
    const r = grade(p.answer, responses[item.id] ?? null)
    results[item.id] = r
    const w = item.weight ?? 1
    total += w
    earned += w * r.score
    if (isAnswered(p.answer, responses[item.id] ?? null)) answered++
    if (!r.correct) missed.push({ itemId: item.id, reviewModules: item.review })
  }
  const score = total ? earned / total : 0
  return { results, score, passed: score >= (spec.threshold ?? 0.8) - 1e-9, missed, answered, total: spec.items.length }
}

// ---------------------------------------------------------------------------------------------
// In-progress drafts (sessionStorage) — an accidental navigation must not lose a 20-minute attempt.
// ---------------------------------------------------------------------------------------------

export interface CheckpointDraft {
  attemptNo: number
  learnerSeed: number
  responses: Record<string, Response>
  savedAt: string
}

export function draftKey(act: string): string {
  return `dead-reckoning:checkpoint-draft:${act}`
}

function storage(): Storage | null {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null
  } catch {
    return null
  }
}

export function loadDraft(act: string, learnerSeed: number, attemptNo: number): Record<string, Response> | null {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(draftKey(act))
    if (!raw) return null
    const d = JSON.parse(raw) as CheckpointDraft
    if (d.learnerSeed !== learnerSeed || d.attemptNo !== attemptNo || !d.responses) return null
    return d.responses
  } catch {
    return null
  }
}

export function saveDraft(act: string, learnerSeed: number, attemptNo: number, responses: Record<string, Response>): void {
  const s = storage()
  if (!s) return
  try {
    const d: CheckpointDraft = { attemptNo, learnerSeed, responses, savedAt: new Date().toISOString() }
    s.setItem(draftKey(act), JSON.stringify(d))
  } catch {
    /* quota / private mode: drafts are best-effort */
  }
}

export function clearDraft(act: string): void {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(draftKey(act))
  } catch {
    /* ignore */
  }
}
