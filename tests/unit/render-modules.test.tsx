/**
 * Render every content module and assert nothing leaked.
 *
 * The gap this closes: `tsc`, `vite build` and the content lint all pass on modules that are broken
 * on screen. Four separate defect classes reached the reader that way — exports swallowed into a
 * markdown paragraph, `{fmt(...)}` inside `$…$` typeset as literal source, Markdown table rows
 * emitted from a JSX expression, and a KaTeX parse error from a term key in a superscript. Two Act
 * VIII teams each built a throwaway harness and each caught a further render-only defect, which is
 * the argument for having one permanently.
 *
 * This is a smoke test, not a content review: it renders each module and looks for the fingerprints
 * of a failed interpolation or a failed formula.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import type { ComponentType } from 'react'
import { mdxComponents } from '@/components'
import { ModuleContext } from '@/components/ModuleContext'
import { modules, loadModule } from '@/content/registry'
import type { ModuleMeta } from '@/content/schema'

/** Fingerprints of an expression that reached the DOM as text instead of being evaluated. */
const LEAKS: { label: string; re: RegExp }[] = [
  { label: 'unevaluated formatter call', re: /\bfmt(?:Int|Pct|P)?\s*\([^)]*\)/ },
  { label: 'unevaluated template placeholder', re: /\$\{/ },
  { label: 'raw Markdown table row', re: /\|\s*-{2,}\s*\|/ },
  { label: 'undefined in prose', re: /\bundefined\b/ },
  { label: 'NaN in prose', re: /\bNaN\b/ },
]

function renderModule(meta: ModuleMeta, Body: ComponentType) {
  return render(
    <MemoryRouter>
      <ModuleContext.Provider value={{ meta, registerBeat: () => {} }}>
        <MDXProvider components={mdxComponents}>
          <Body />
        </MDXProvider>
      </ModuleContext.Provider>
    </MemoryRouter>,
  )
}

/**
 * Modules that cannot render yet because their Act is unfinished. Each entry is debt, not an
 * exemption: delete it when the Act is completed, and the module joins the sweep.
 *  - act-6-checkpoint: Act VI is 7 of 9 modules; its checkpoint spec names generators
 *    (act-6/pooled-test-statistic and siblings) that have not been written, so the runner throws.
 */
const UNFINISHED = new Set(['act-6-checkpoint'])

describe('every content module renders', () => {
  it('has modules to render', () => {
    expect(modules.length).toBeGreaterThan(0)
  })

  for (const meta of modules.filter((m) => !UNFINISHED.has(m.id))) {
    it(`${meta.id} renders without throwing or leaking`, async () => {
      // React logs render errors rather than always throwing; treat any of them as a failure.
      const errors: string[] = []
      const spy = vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => void errors.push(String(a[0])))
      try {
        const mod = await loadModule(meta)
        const { container } = renderModule(meta, mod.default as ComponentType)

        const text = (container.textContent ?? '').replace(/\s+/g, ' ')
        for (const { label, re } of LEAKS) {
          const hit = re.exec(text)
          expect(hit ? `${label}: "${hit[0]}"` : null, `${meta.id} (${meta.path}) — ${label}`).toBeNull()
        }
        // KaTeX renders a .katex-error span rather than throwing when a formula will not parse.
        expect(container.querySelectorAll('.katex-error').length, `${meta.id}: KaTeX parse error`).toBe(0)
        expect(errors.join(' | ').slice(0, 400), `${meta.id}: console errors during render`).toBe('')
      } finally {
        spy.mockRestore()
        cleanup()
      }
    })
  }
})
