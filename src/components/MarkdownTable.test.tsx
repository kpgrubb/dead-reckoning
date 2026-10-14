/**
 * The MDX `table` override has to catch both ways a module can author a table — a GFM pipe table
 * and a literal `<table>` in JSX — because MDX routes both through the component map. If it ever
 * stopped catching one of them, a 13-column table would go back to having no scrollable ancestor
 * at 375 px and the learner would pan the whole page to read it (qa-accessibility.md A7).
 */
import { describe, expect, it, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import type { ComponentType } from 'react'
import { mdxComponents, MarkdownTable } from '@/components'
import { ModuleContext } from '@/components/ModuleContext'
import { getModule, loadModule } from '@/content/registry'

afterEach(cleanup)

/**
 * Every module that authors a table of its own. act-0-02 and the act-8 / act-9 entries write
 * theirs as literal JSX; act-3, act-6 and act-7 use Markdown pipe tables. act-8-04 does both.
 */
const MODULES = ['act-0-02', 'act-3-02', 'act-3-05', 'act-6-06', 'act-7-07', 'act-8-03', 'act-8-04', 'act-9-01', 'act-9-02', 'act-9-03']

/**
 * True when the table has something above it that can scroll sideways. Our wrapper classes carry
 * it in a stylesheet jsdom never loads, and the instrument tables carry it as an inline style, so
 * both spellings count. A hidden data-table fallback has nothing to pan and is exempt.
 */
function scrollableAncestor(table: Element): boolean {
  for (let n: HTMLElement | null = table.parentElement; n; n = n.parentElement) {
    if (n.classList.contains('visually-hidden')) return true
    if (['dr-table-wrap', 'dr-chart__tablewrap', 'dr-plot__tablewrap'].some((c) => n!.classList.contains(c))) return true
    const ox = n.style.overflowX || n.style.overflow
    if (ox === 'auto' || ox === 'scroll') return true
  }
  return false
}

describe('tables authored in a module', () => {
  for (const id of MODULES) {
    it(`${id}: every table sits in a horizontal scroller`, async () => {
      const meta = getModule(id)
      expect(meta, `${id} is not in the registry`).toBeTruthy()
      const Body = (await loadModule(meta!)).default as ComponentType
      const { container } = render(
        <MemoryRouter>
          <ModuleContext.Provider value={{ meta: meta!, registerBeat: () => {} }}>
            <MDXProvider components={mdxComponents}>
              <Body />
            </MDXProvider>
          </ModuleContext.Provider>
        </MemoryRouter>,
      )
      const tables = [...container.querySelectorAll('table')]
      expect(tables.length).toBeGreaterThan(0)
      for (const t of tables) {
        expect(scrollableAncestor(t), `a table in ${id} has no scrollable ancestor`).toBe(true)
      }
    })
  }

  it('leaves the table element and its own attributes alone', () => {
    const { container } = render(
      <MarkdownTable className="dr-table">
        <caption>Relay audit</caption>
        <tbody>
          <tr>
            <td>1</td>
          </tr>
        </tbody>
      </MarkdownTable>,
    )
    const table = container.querySelector('table')
    expect(table).toHaveClass('dr-table')
    expect(table?.parentElement).toHaveClass('dr-table-wrap')
    // Nothing overflows in jsdom, so the wrapper must not have become a pointless tab stop.
    expect(table?.parentElement?.getAttribute('tabindex')).toBeNull()
  })
})
