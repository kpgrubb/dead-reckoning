/**
 * Helpers for problem generators.
 */
import { Rng, seedFrom } from '@/lib/rng'
import type { ProblemGenerator, ProblemInstance } from './types'
import { getGenerator } from './registry'

/**
 * Draw parameters until `accept` is satisfied (rejection of degenerate cases), with a hard cap so
 * a bad generator fails loudly instead of hanging.
 */
export function retry<T>(rng: Rng, draw: (rng: Rng) => T, accept: (t: T) => boolean, maxTries = 200): T {
  for (let i = 0; i < maxTries; i++) {
    const t = draw(rng)
    if (accept(t)) return t
  }
  throw new Error('retry: no acceptable parameter draw after ' + maxTries + ' tries — loosen the generator constraints')
}

/** Deterministic seed for one drill instance. */
export function drillSeed(learnerSeed: number, moduleId: string, generatorId: string, index: number, attempt: number): number {
  return seedFrom(learnerSeed, moduleId, generatorId, index, attempt)
}

export function instantiate(generatorOrId: ProblemGenerator | string, seed: number): ProblemInstance {
  const g = typeof generatorOrId === 'string' ? getGenerator(generatorOrId) : generatorOrId
  return g.generate(new Rng(seed))
}

/** Render a number for prose with a fixed number of decimals (uses format.ts rules). */
export { fmt, fmtP, fmtPct, round } from '@/lib/stats/format'
