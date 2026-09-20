/**
 * Generator registry. Any file under generators/**\/*.ts that exports one or more
 * ProblemGenerator objects (named or default) is auto-registered by id.
 */
import type { ProblemGenerator } from './types'

const modules = import.meta.glob<Record<string, unknown>>('./generators/**/*.ts', { eager: true })

function isGenerator(v: unknown): v is ProblemGenerator {
  return !!v && typeof v === 'object' && typeof (v as ProblemGenerator).generate === 'function' && typeof (v as ProblemGenerator).id === 'string'
}

const registry = new Map<string, ProblemGenerator>()
for (const [file, mod] of Object.entries(modules)) {
  for (const value of Object.values(mod)) {
    if (isGenerator(value)) {
      if (registry.has(value.id)) console.warn(`[problems] duplicate generator id "${value.id}" (${file})`)
      registry.set(value.id, value)
    } else if (Array.isArray(value)) {
      for (const g of value) if (isGenerator(g)) registry.set(g.id, g)
    }
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
