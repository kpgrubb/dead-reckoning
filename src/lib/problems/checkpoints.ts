/**
 * Checkpoint definitions — one per Act. The Assessment Designer owns the runner; each Act's
 * Problem Author registers a CheckpointSpec under checkpoints/act-N.ts (auto-discovered).
 *
 * A checkpoint is a fixed-length, mixed-format assessment built from generators, so every attempt
 * gets fresh parameters. Failure → debrief listing the modules to revisit, then retry.
 */
import type { ProblemGenerator } from './types'

export interface CheckpointItem {
  /** Stable id within the checkpoint, e.g. "q3". */
  id: string
  /** Registered generator id, or an inline generator. */
  generator: string | ProblemGenerator
  /** Module ids to revisit if missed. */
  review: string[]
  /** Weight (default 1). */
  weight?: number
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

const modules = import.meta.glob<Record<string, unknown>>('./checkpoints/*.ts', { eager: true })

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
