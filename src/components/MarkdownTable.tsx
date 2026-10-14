/**
 * The horizontal scroller every table sits in, and the MDX `table` override that puts authored
 * tables inside it.
 *
 * Why it exists. A wide table with no scrollable ancestor makes the *page* pan sideways — the
 * 13-column relay audit in act-9-02 measured 886 px against a 375 px viewport, and reading it
 * dragged every paragraph of prose off screen with it (qa-accessibility.md A7, WCAG 1.4.10).
 * Component-rendered tables already had a wrapper; tables authored in a module did not.
 *
 * `<TableScroll>` only becomes a tab stop when it actually overflows: a scroll container a mouse
 * user can drag must be reachable by keyboard (WCAG 2.1.1), but a table that fits has nothing to
 * scroll and should not cost a Tab press. It is measured, not guessed, and re-measured on resize.
 */
import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import './assessment.css'

export function TableScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      if (el.scrollWidth - el.clientWidth <= 1) {
        setLabel(null)
        return
      }
      const caption = el.querySelector('caption')?.textContent?.trim() || el.querySelector('table')?.getAttribute('aria-label')?.trim()
      setLabel(caption ? `${caption} — scrollable sideways` : 'Table, scrollable sideways')
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const table = el.querySelector('table')
    if (table) ro.observe(table)
    return () => ro.disconnect()
  })

  return (
    <div ref={ref} className={['dr-table-wrap', className].filter(Boolean).join(' ')} tabIndex={label ? 0 : undefined} role={label ? 'group' : undefined} aria-label={label ?? undefined}>
      {children}
    </div>
  )
}

/** MDX's `table` (and, via plugins/rehype-jsx-tables.ts, a literal `<table>` written as JSX). */
export function MarkdownTable({ children, ...rest }: ComponentPropsWithoutRef<'table'>) {
  return (
    <TableScroll>
      <table {...rest}>{children}</table>
    </TableScroll>
  )
}
