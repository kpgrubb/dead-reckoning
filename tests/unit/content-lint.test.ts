/**
 * Static lint over every content MDX file, for mistakes that compile cleanly and then fail (or
 * silently mis-render) in the browser. Act III lost an afternoon to the first one.
 */
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Vitest runs with the repo root as cwd (jsdom rewrites import.meta.url to an http: URL, so
// fileURLToPath is not available here).
const contentDir = path.resolve(process.cwd(), 'content')

function mdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return mdxFiles(p)
    return e.name.endsWith('.mdx') ? [p] : []
  })
}

/** Strip YAML frontmatter so its `---` fences and prose don't confuse the block scan. */
function body(src: string): string {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(src)
  return m ? src.slice(m[0].length) : src
}

const files = mdxFiles(contentDir)
const rel = (f: string) => path.relative(contentDir, f).split(path.sep).join('/')

describe('content MDX lint', () => {
  it('finds MDX files to lint', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  /**
   * In MDX, ESM statements must start their own block. A `//` or `/** *\/` comment that follows a
   * blank line opens a *markdown paragraph*, which then swallows every line up to the next blank
   * line — including any `export const` beneath it. The exports are never defined (the module
   * throws on render) and the source text leaks into the page. It builds without a warning.
   */
  it('never lets a comment swallow the exports beneath it', () => {
    const offences: string[] = []
    for (const file of files) {
      const blocks = body(fs.readFileSync(file, 'utf8')).split(/\r?\n\s*\r?\n/)
      for (const block of blocks) {
        const lines = block.split(/\r?\n/)
        const first = lines[0]?.trimStart() ?? ''
        if (!first.startsWith('//') && !first.startsWith('/*')) continue
        const swallowed = lines.slice(1).find((l) => /^\s*(export|import)\s/.test(l))
        if (swallowed) {
          offences.push(`${rel(file)}: a comment block starting "${first.slice(0, 40)}" swallows "${swallowed.trim().slice(0, 50)}" — delete the blank line between the comment and the ESM block it belongs to`)
        }
      }
    }
    expect(offences).toEqual([])
  })

  /** `export`/`import` must be at column 0; indented, MDX treats them as prose or code. */
  it('keeps ESM statements unindented', () => {
    const offences: string[] = []
    for (const file of files) {
      body(fs.readFileSync(file, 'utf8'))
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (/^[ \t]+(export|import)\s+(const|default|function|\{|[A-Za-z*])/.test(line) && !line.trimStart().startsWith('//')) {
            offences.push(`${rel(file)}:${i + 1}: indented ESM statement "${line.trim().slice(0, 50)}"`)
          }
        })
    }
    expect(offences).toEqual([])
  })

  /** Every module MDX needs the frontmatter the manifest and router rely on. Calc bodies have none. */
  it('gives every module file the required frontmatter, and every calc body none', () => {
    const offences: string[] = []
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8')
      const hasFm = /^---\r?\n/.test(src)
      const isCalc = rel(file).startsWith('calc/')
      if (isCalc && hasFm) offences.push(`${rel(file)}: calc briefing bodies must not carry frontmatter`)
      if (!isCalc && !hasFm) offences.push(`${rel(file)}: module is missing frontmatter`)
      if (!isCalc && hasFm) {
        for (const key of ['id:', 'act:', 'title:', 'est_minutes:']) {
          if (!new RegExp(`^${key}`, 'm').test(src)) offences.push(`${rel(file)}: frontmatter is missing "${key}"`)
        }
      }
    }
    expect(offences).toEqual([])
  })
})
