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

export function Formula({ tex, terms, label, inline = false }: FormulaProps) {
  const [active, setActive] = useState<number | null>(null)
  const keys = useMemo(() => Object.keys(terms ?? {}), [terms])

  const html = useMemo(() => {
    let src = tex
    // Auto-wrap term keys (longest first so \bar{x} beats x).
    const ordered = [...keys].sort((a, b) => b.length - a.length)
    ordered.forEach((k, i) => {
      // Avoid double-wrapping inside an existing htmlClass.
      src = src.split(k).join(`\\htmlClass{dr-term dr-term-${i}}{${k}}`)
    })
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
