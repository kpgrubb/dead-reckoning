/**
 * Generator registry. Any file under generators/**\/*.ts that exports one or more
 * ProblemGenerator objects (named, default, or arrays) is auto-registered by id.
 * Prefer `defineGenerator` from ./generate so definitions are validated at registration.
 */
import { Rng } from '@/lib/rng'
import type { ProblemGenerator, ProblemInstance } from './types'

const modules = import.meta.glob<Record<string, unknown>>('./generators/**/*.ts', { eager: true })

function isGenerator(v: unknown): v is ProblemGenerator {
  return !!v && typeof v === 'object' && typeof (v as ProblemGenerator).generate === 'function' && typeof (v as ProblemGenerator).id === 'string'
}

const registry = new Map<string, ProblemGenerator>()
const sources = new Map<string, string>()

function register(g: ProblemGenerator, file: string) {
  if (registry.has(g.id)) console.warn(`[problems] duplicate generator id "${g.id}" (${file}; first seen in ${sources.get(g.id)})`)
  registry.set(g.id, g)
  sources.set(g.id, file)
}

for (const [file, mod] of Object.entries(modules)) {
  for (const value of Object.values(mod)) {
    if (isGenerator(value)) register(value, file)
    else if (Array.isArray(value)) for (const g of value) if (isGenerator(g)) register(g, file)
  }
}

export function getGenerator(id: string): ProblemGenerator {
  const g = registry.get(id)
  if (!g) throw new Error(`Unknown problem generator "${id}". Registered: ${[...registry.keys()].join(', ') || '(none)'}`)
  return g
}

export function hasGenerator(id: string): boolean {
  return registry.has(id)
}

export function allGenerators(): ProblemGenerator[] {
  return [...registry.values()]
}

export function generatorIds(): string[] {
  return [...registry.keys()].sort()
}

/** Instantiate a registered generator (by id) or an inline generator with a seed. */
export function instantiate(generatorOrId: ProblemGenerator | string, seed: number): ProblemInstance {
  const g = typeof generatorOrId === 'string' ? getGenerator(generatorOrId) : generatorOrId
  return g.generate(new Rng(seed))
}

/** Source file a generator was registered from (for validation reports). */
export function generatorSource(id: string): string | undefined {
  return sources.get(id)
}
