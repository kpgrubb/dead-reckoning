/**
 * Content registry: ordered module metadata (from the manifest) + lazy loaders for module bodies.
 */
import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import { modules as manifest } from 'virtual:content-manifest'
import { ACT_TITLES, type ActNumber, type ModuleMeta } from './schema'

type MDXModule = { default: ComponentType<{ components?: MDXComponents }>; frontmatter?: unknown }

// Keys look like "/content/act-0/01-shakedown.mdx" — identical to ModuleMeta.path.
const loaders = import.meta.glob<MDXModule>('/content/**/*.mdx')

// Defence in depth: an MDX file without module frontmatter must never reach the mission map,
// the router or the resume selector. The manifest plugin already skips non-module directories.
export const modules: ModuleMeta[] = manifest
  .filter((m) => typeof m.id === 'string' && m.id.length > 0)
  .map((m) => ({
    kind: 'module',
    ap_topics: [],
    objectives: [],
    prereqs: [],
    calc_briefing: null,
    ...m,
  }))

const byId = new Map(modules.map((m) => [m.id, m]))
const indexById = new Map(modules.map((m, i) => [m.id, i]))

export function getModule(id: string): ModuleMeta | undefined {
  return byId.get(id)
}

export function moduleIndex(id: string): number {
  return indexById.get(id) ?? -1
}

export function nextModule(id: string): ModuleMeta | undefined {
  const i = moduleIndex(id)
  return i >= 0 ? modules[i + 1] : undefined
}

export function prevModule(id: string): ModuleMeta | undefined {
  const i = moduleIndex(id)
  return i > 0 ? modules[i - 1] : undefined
}

export function modulesForAct(act: ActNumber): ModuleMeta[] {
  return modules.filter((m) => m.act === act)
}

export interface ActSummary {
  act: ActNumber
  code: string
  title: string
  apUnit: string | null
  modules: ModuleMeta[]
  totalMinutes: number
}

export const acts: ActSummary[] = (Object.keys(ACT_TITLES) as unknown as string[])
  .map((k) => Number(k) as ActNumber)
  .sort((a, b) => a - b)
  .map((act) => {
    const ms = modulesForAct(act)
    return {
      act,
      ...ACT_TITLES[act],
      modules: ms,
      totalMinutes: ms.reduce((s, m) => s + (m.est_minutes ?? 0), 0),
    }
  })

export async function loadModule(meta: ModuleMeta): Promise<MDXModule> {
  const loader = loaders[meta.path]
  if (!loader) throw new Error(`No loader for module path ${meta.path}`)
  return loader()
}

export const totalMinutes = modules.reduce((s, m) => s + (m.est_minutes ?? 0), 0)
