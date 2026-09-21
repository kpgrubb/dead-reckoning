/**
 * <Formula tex="…" terms={{ '\\bar{x}': 'sample mean', 'n': 'sample size' }} />
 * KaTeX display formula with a term legend (hover/focus highlights the matching legend row).
 * Wrap terms you want highlighted in `\htmlClass{dr-term-k}{…}` — the legend keys are matched
 * against the TeX source; when a key appears as a substring it is auto-wrapped.
 */
import { useMemo, useState } from 'react'
import katex from 'katex'

export interface FormulaProps {
  tex: string
  terms?: Record<string, string>
  /** Optional label under the formula, e.g. "Sample standard deviation". */
  label?: string
  inline?: boolean
}

/**
 * Wrap each legend term in `\htmlClass{dr-term dr-term-<i>}{…}` so hovering the legend highlights
 * it in the rendered formula. `<i>` is the term's index in `terms`, so the legend rows and the
 * highlight classes always line up regardless of match order.
 *
 * Two things a naive string replace gets wrong, both of which produced broken math in Act I:
 *  - a single-letter key such as `s` or `n` would match inside a control sequence (`\sqrt`, `\sum`)
 *    or inside `\text{frequency}`, corrupting the TeX. Control sequences are therefore treated as
 *    atomic and never touched, and alphanumeric keys only match on identifier boundaries.
 *  - a key can occur inside a longer key's match (`x` inside `\bar{x}`). Matches are replaced with
 *    opaque placeholders and restored at the end, so nothing is wrapped twice.
 *
 * Purely numeric keys are not auto-wrapped (they are ambiguous inside a formula); give such a term
 * a symbolic key, or wrap it yourself in the `tex` string.
 */
export function wrapTerms(tex: string, keys: readonly string[]): string {
  // Longest key first so `\bar{x}` wins over `x`; `i` stays the index in `keys`.
  const ordered = keys
    .map((k, i) => ({ k, i }))
    .filter(({ k }) => k && !/^[0-9]+$/.test(k))
    .sort((a, b) => b.k.length - a.k.length)
  if (ordered.length === 0) return tex

  let out = ''
  let pos = 0
  while (pos < tex.length) {
    const hit = ordered.find(({ k }) => {
      if (!tex.startsWith(k, pos)) return false
      if (!/^[A-Za-z0-9]+$/.test(k)) return true
      // Identifier keys only match whole identifiers: `n` must not match inside `frequency`.
      const before = tex[pos - 1]
      const after = tex[pos + k.length]
      return !(before && /[A-Za-z0-9]/.test(before)) && !(after && /[A-Za-z0-9]/.test(after))
    })
    if (hit) {
      out += `\\htmlClass{dr-term dr-term-${hit.i}}{${hit.k}}`
      pos += hit.k.length
      continue
    }
    // No key starts here: copy any control sequence whole, so a key can never match inside its
    // name (`s` in `\sqrt`, `n` in `\sin`). Keys that legitimately begin with `\` were tried above.
    const cs = /^(\\[a-zA-Z]+|\\.)/.exec(tex.slice(pos))
    if (cs) {
      out += cs[0]
      pos += cs[0].length
      continue
    }
    out += tex[pos]
    pos += 1
  }
  return out
}

export function Formula({ tex, terms, label, inline = false }: FormulaProps) {
  const [active, setActive] = useState<number | null>(null)
  const keys = useMemo(() => Object.keys(terms ?? {}), [terms])

  const html = useMemo(() => {
    const src = wrapTerms(tex, keys)
    try {
      return katex.renderToString(src, { displayMode: !inline, throwOnError: false, trust: true, strict: 'ignore', output: 'htmlAndMathml' })
    } catch {
      return `<code>${tex}</code>`
    }
  }, [tex, keys, inline])

  return (
    <figure className={`dr-formula ${active !== null ? `dr-formula--active-${active}` : ''}`}>
      <div className="dr-formula__tex" dangerouslySetInnerHTML={{ __html: html }} />
      {label && <figcaption className="dr-formula__label">{label}</figcaption>}
      {keys.length > 0 && (
        <ul className="dr-formula__legend" aria-label="Terms">
          {keys.map((k, i) => (
            <li
              key={k}
              className={`dr-formula__term ${active === i ? 'is-active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              tabIndex={0}
            >
              <span className="dr-formula__term-sym" dangerouslySetInnerHTML={{ __html: katex.renderToString(k, { throwOnError: false, output: 'htmlAndMathml' }) }} />
              <span className="dr-formula__term-desc">{terms![k]}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}
