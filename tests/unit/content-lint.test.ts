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

/**
 * Blank out YAML frontmatter so its `---` fences and prose don't confuse the block scans, while
 * preserving every line offset — the rules below report file line numbers, and deleting the
 * frontmatter would shift all of them.
 */
function body(src: string): string {
  const m = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(src)
  if (!m) return src
  return m[0].replace(/[^\n]/g, ' ') + src.slice(m[0].length)
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

  /**
   * remark-math tokenises the body of `$…$` / `$$…$$` before MDX sees it, so a JSX expression
   * inside math is never evaluated: KaTeX typesets the literal source (`fmt(AUDIT_SE,4)`) on the
   * page. It compiles and builds clean. Put the symbol in math and the number outside it, or use
   * `<Formula tex={`…`} />`, whose template literal *is* evaluated. Found by Act V (22 instances).
   */
  it('never puts a JSX expression inside a math span', () => {
    // JS that cannot be TeX: our formatters, Math.*, .toFixed(), a braced property access, or a
    // braced camelCase identifier.
    const jsSignals = [/\b(?:fmt|fmtPct|fmtInt|fmtP|round|roundSig)\s*\(/, /\bMath\./, /\.toFixed\s*\(/, /\{[A-Za-z_$][\w$]*\.[\w$]+\}/, /\{[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\}/]
    const offences: string[] = []

    for (const file of files) {
      // Blank out backtick-delimited regions first: a `$$…${expr}…$$` inside a JS template literal
      // (e.g. a generator `prompt={`…`}`) *is* evaluated, and markdown inline code is not math.
      // Replace with spaces so every offset, and therefore every reported line number, is preserved.
      const src = body(fs.readFileSync(file, 'utf8')).replace(/`[^`]*`/gs, (m) => m.replace(/[^\n]/g, ' '))
      const spans: { text: string; line: number }[] = []
      const lineOf = (idx: number) => src.slice(0, idx).split('\n').length

      // Display math first, so its `$$` pairs are not re-read as two inline spans.
      const consumed: [number, number][] = []
      for (const m of src.matchAll(/\$\$([\s\S]*?)\$\$/g)) {
        spans.push({ text: m[1], line: lineOf(m.index!) })
        consumed.push([m.index!, m.index! + m[0].length])
      }
      for (const m of src.matchAll(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g)) {
        const at = m.index!
        if (consumed.some(([a, b]) => at >= a && at < b)) continue
        if (m[1].startsWith('{')) continue // `${…}` inside a JS template literal, not markdown math
        spans.push({ text: m[1], line: lineOf(at) })
      }

      for (const span of spans) {
        const hit = jsSignals.find((re) => re.test(span.text))
        if (hit) offences.push(`${rel(file)}:${span.line}: JSX expression inside math — "${span.text.trim().slice(0, 60)}"`)
      }
    }
    expect(offences).toEqual([])
  })

  /**
   * A JSX expression returns a *string*, and MDX inserts it as a text node — it is never parsed as
   * Markdown. So `{rows.map(r => `| ${r.a} | ${r.b} |`).join('\n')}` under a literal `| … |` header
   * renders an empty table followed by a line of raw pipes. It compiles and builds clean. Write the
   * rows as real JSX `<tr>`s, or pass the Markdown through `<RichText text={…} />`.
   */
  it('never emits Markdown table rows from a JSX expression', () => {
    const offences: string[] = []
    for (const file of files) {
      body(fs.readFileSync(file, 'utf8'))
        .split(/\r?\n/)
        .forEach((line, i) => {
          const trimmed = line.trim()
          if (!trimmed.startsWith('{')) return
          // A pipe followed by a `${…}` interpolation is a generated table row.
          if (/\|[^|]*\$\{/.test(trimmed) || (/\|/.test(trimmed) && /\.join\(\s*['"`]\\n/.test(trimmed))) {
            offences.push(`${rel(file)}:${i + 1}: Markdown table row built in a JSX expression — "${trimmed.slice(0, 70)}"`)
          }
        })
    }
    expect(offences).toEqual([])
  })

  /**
   * A crew member's voice note describes how they think, not a catchphrase. Act I shipped with
   * Ebele saying "Yes, sir. That's — yes." in five modules and Ferrier "Say it back to me" in four.
   * Flags any distinctive phrase of 4+ words repeated across 3+ modules inside <Dialogue> blocks.
   */
  it('does not let a crew voice become a catchphrase', () => {
    const STOP = /^(the|a|an|and|but|so|then|that|this|it|is|are|of|to|in|on|for|with|you|your|i|we|they|he|she|not|no|yes|sir|captain|skipper)$/
    const seen = new Map<string, Set<string>>()

    for (const file of files) {
      const src = body(fs.readFileSync(file, 'utf8'))
      const speeches = [...src.matchAll(/<Dialogue[^>]*>([\s\S]*?)<\/Dialogue>/g)].map((m) => m[1])
      for (const speech of speeches) {
        const words = speech
          .replace(/\{[^}]*\}/g, ' ') // drop interpolations
          .replace(/[*_`]/g, '')
          .toLowerCase()
          .split(/[^a-z']+/)
          .filter(Boolean)
        for (let i = 0; i + 4 <= words.length; i++) {
          const gram = words.slice(i, i + 5)
          // Only phrases with real content words are distinctive enough to matter.
          if (gram.filter((w) => !STOP.test(w)).length < 2) continue
          const key = gram.join(' ')
          if (!seen.has(key)) seen.set(key, new Set())
          seen.get(key)!.add(rel(file))
        }
      }
    }

    // Acts revised to the post-Prologue prose standard. Acts III–IX were written before it and carry
    // known catchphrase debt ("say it back to me" is in 16 modules); the voice sweep clears it, and
    // each Act joins this list as it is revised. Guarding the revised Acts stops new instances.
    const REVISED = ['act-0/', 'act-1/', 'act-2/', 'act-3/', 'act-7/']
    const offences = [...seen.entries()]
      .map(([phrase, inFiles]) => [phrase, [...inFiles].filter((f) => REVISED.some((a) => f.startsWith(a)))] as const)
      .filter(([, inFiles]) => inFiles.length >= 3)
      .map(([phrase, inFiles]) => `"${phrase}" appears in ${inFiles.length} revised modules: ${inFiles.join(', ')}`)
    expect(offences).toEqual([])
  })

  /**
   * "It's not X, it's Y" — a negation followed by the real answer, used as the default way to make
   * a point. A rhetorical move standing in for a sentence, and a drone at scale. Say the positive
   * thing. Scoped to the Acts revised to the prose standard; Acts III–IX carry 39 known instances
   * that the voice sweep clears, and each Act joins REVISED as it is revised.
   */
  it('does not lean on the corrective reframe', () => {
    const REVISED = ['act-0/', 'act-1/', 'act-2/', 'act-3/', 'act-7/']
    const patterns = [
      /\b(?:is|was|are|were)\s+not\s+[^.;!?]{2,45}[,;.]\s+(?:it|that|they|those|the)\s+(?:is|are|was|were)\b/i,
      /\b(?:isn't|aren't|wasn't|it's not)\s+[^.;!?]{2,45},\s+(?:it's|it is|they're|they are|that's)\b/i,
      // Contracted subject on both halves: "That's not a distribution of losses. That's paperwork."
      /\b(?:it's|that's|there's|these are|those are)\s+not\s+[^.;!?]{2,45}[,;.]\s+(?:it's|that's|it is|that is|they're|those are)\b/i,
      /\bnot because\s+[^.;!?]{2,50},\s+but because\b/i,
      /\bThe (?:question|problem|point|issue) is not\s+[^.;!?]{2,45}[.;,]\s+(?:it|the)\b/i,
    ]
    // At most one per module: the standard permits it where the negation IS the misconception
    // being taught (density vs probability). Two in one module means it has become the default way
    // of making a point, which is the thing being banned.
    const offences: string[] = []
    for (const file of files.filter((f) => REVISED.some((a) => rel(f).startsWith(a)))) {
      const hits: string[] = []
      body(fs.readFileSync(file, 'utf8'))
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (patterns.some((re) => re.test(line))) hits.push(`${i + 1}: "${line.trim().slice(0, 70)}"`)
        })
      if (hits.length > 1) offences.push(`${rel(file)}: ${hits.length} corrective reframes (max 1) — ${hits.join(' | ')}`)
    }
    expect(offences).toEqual([])
  })

  /**
   * The em dash as a default connector. Two independent clauses joined by one almost always want to
   * be two sentences, and most of the rest introduce an aside that adds nothing; leaning on the dash
   * flattens sentence architecture until every paragraph has the same shape. Eight per module is a
   * budget, not a target: keep the dash for a speaker cut off mid-word or a hard self-interruption.
   * Scoped to the Acts revised to the prose standard — Acts II–IX still run to 30-70 a module, and
   * each joins REVISED as the sweep reaches it. Numeric ranges (2178–84) use an en dash and are fine.
   */
  it('keeps em dashes under budget', () => {
    const REVISED = ['act-0/', 'act-1/', 'act-3/', 'act-7/']
    const BUDGET = 8
    const offences: string[] = []
    for (const file of files.filter((f) => REVISED.some((a) => rel(f).startsWith(a)))) {
      const count = (fs.readFileSync(file, 'utf8').match(/—/g) ?? []).length
      if (count > BUDGET) offences.push(`${rel(file)}: ${count} em dashes (max ${BUDGET})`)
    }
    expect(offences).toEqual([])
  })

  /**
   * The behaviour gloss: an action, then a clause telling the reader what it signified. "Ferrier
   * initials the caption and says nothing, which from her is the answer." It is the *You believe
   * her* failure wearing a subordinate clause, and it was the most frequent tic in the book (28
   * instances). Cut the gloss; if the action does not carry the meaning, change the action.
   * Scoped to the revised Acts; each joins as the sweep reaches it.
   */
  it('does not gloss a behaviour for the reader', () => {
    const REVISED = ['act-0/', 'act-1/', 'act-2/', 'act-3/', 'act-7/', 'calc/']
    const patterns = [
      /,\s*which from (?:her|him|them|it)\b/i,
      /,\s*which is (?:how|what|why) (?:he|she|they|you|one)\b/i,
      /\bthe way (?:a|one|people|men|women|somebody|someone|a man|a person)\b[^.;!?]{0,60}\b(?:do|does|say|says|when)\b/i,
    ]
    const offences: string[] = []
    for (const file of files.filter((f) => REVISED.some((a) => rel(f).startsWith(a)))) {
      body(fs.readFileSync(file, 'utf8'))
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (patterns.some((re) => re.test(line))) offences.push(`${rel(file)}:${i + 1}: behaviour gloss — "${line.trim().slice(0, 80)}"`)
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
