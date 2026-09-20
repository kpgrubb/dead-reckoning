/**
 * Vite plugin: scans `content/**\/*.mdx`, parses YAML frontmatter, and exposes the result as
 * the virtual module `virtual:content-manifest` (`export const modules: ModuleMeta[]`).
 *
 * This lets the mission map, router and Ship's Log know every module's metadata without
 * importing (and bundling) all module bodies eagerly. Module bodies are lazy-loaded via
 * `import.meta.glob` in `src/content/registry.ts`.
 *
 * In dev, adding/removing/editing an .mdx file invalidates the manifest and reloads.
 */
import fs from 'node:fs'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:content-manifest'
const RESOLVED_ID = '\0' + VIRTUAL_ID

const REQUIRED_FIELDS = ['id', 'act', 'title', 'est_minutes'] as const

interface RawEntry {
  [key: string]: unknown
  path: string
}

function readFrontmatter(file: string): Record<string, unknown> {
  const src = fs.readFileSync(file, 'utf8')
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)
  if (!m) return {}
  const parsed = parseYaml(m[1])
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
}

function scan(root: string, contentDir: string, warn: (msg: string) => void): RawEntry[] {
  const dir = path.resolve(root, contentDir)
  if (!fs.existsSync(dir)) return []
  const out: RawEntry[] = []
  const seen = new Map<string, string>()
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name)
      if (entry.isDirectory()) {
        walk(p)
      } else if (entry.name.endsWith('.mdx')) {
        const fm = readFrontmatter(p)
        const rel = '/' + path.relative(root, p).split(path.sep).join('/')
        for (const f of REQUIRED_FIELDS) {
          if (fm[f] === undefined) warn(`[content-manifest] ${rel} is missing frontmatter field "${f}"`)
        }
        const id = String(fm.id ?? '')
        if (id) {
          const prev = seen.get(id)
          if (prev) warn(`[content-manifest] duplicate module id "${id}" in ${rel} and ${prev}`)
          seen.set(id, rel)
        }
        out.push({ ...fm, path: rel })
      }
    }
  }
  walk(dir)
  // Stable order: by act, then by file path (NN- prefix on filenames provides sequence).
  out.sort((a, b) => {
    const aa = Number(a.act ?? 0)
    const ba = Number(b.act ?? 0)
    if (aa !== ba) return aa - ba
    return a.path.localeCompare(b.path)
  })
  return out
}

export function contentManifest(contentDir = 'content'): Plugin {
  let root = process.cwd()
  let logger: { warn: (msg: string) => void } = console
  return {
    name: 'dead-reckoning:content-manifest',
    configResolved(config) {
      root = config.root
      logger = config.logger
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      const modules = scan(root, contentDir, (m) => logger.warn(m))
      return `export const modules = ${JSON.stringify(modules)};\n`
    },
    configureServer(server) {
      const dir = path.resolve(root, contentDir)
      server.watcher.add(dir)
      const invalidate = (file: string) => {
        if (!file.startsWith(dir) || !file.endsWith('.mdx')) return
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', invalidate)
      server.watcher.on('unlink', invalidate)
      server.watcher.on('change', invalidate)
    },
  }
}
