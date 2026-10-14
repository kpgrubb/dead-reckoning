/**
 * HUD panel frame — the base surface for every instrument, briefing and card.
 *
 * Bridge-instrument chrome: corner brackets (CSS, no extra DOM), a tone stripe on the left rail,
 * a mono caps label with an optional status LED, and a right-aligned status readout.
 * Props are stable; `led` and `icon` are additive.
 */
import { useId, type ReactNode } from 'react'

export type PanelTone = 'default' | 'tactical' | 'sensor' | 'engineering' | 'intel' | 'log' | 'alert'
export type PanelLed = 'on' | 'off' | 'busy' | 'warn' | 'alert'

export interface PanelProps {
  /** Small caps label in the frame header, e.g. "SENSOR ARRAY · DRIVE SIGNATURES". */
  label?: string
  /** Right-aligned status text in the header, e.g. "SEED 0x3F2A". */
  status?: string
  tone?: PanelTone
  children: ReactNode
  className?: string
  id?: string
  /** aria role/label for instruments. */
  ariaLabel?: string
  /** Optional status LED before the label: on (tone colour), off, busy (pulses), warn (amber), alert (red). */
  led?: PanelLed
  /** Optional icon element rendered before the label (see src/design/icons.tsx). */
  icon?: ReactNode
  /** Remove body padding (for edge-to-edge charts or tables). */
  flush?: boolean
  /**
   * Opt in to rendering `label` as a real heading instead of a styled span, so a screen-reader
   * user can navigate the page by heading. The module `<h1>` is the page title, so a top-level
   * module section (briefing, drill, mission beat, log entry) is `2`. Nothing visual changes —
   * `h2.dr-panel__label` inherits the header's type. Panels nested inside a section (instruments,
   * charts) leave this unset and stay spans, so the levels never skip.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6
}

export function Panel({ label, status, tone = 'default', children, className, id, ariaLabel, led, icon, flush, headingLevel }: PanelProps) {
  const cls = ['dr-panel', `dr-panel--${tone}`, flush ? 'dr-panel--flush' : '', className].filter(Boolean).join(' ')
  const heading = headingLevel && label ? (`h${headingLevel}` as const) : null
  const Label = heading ?? 'span'
  const headingId = `${useId().replace(/:/g, '')}-label`
  // With a real heading the section takes its name from it, so the label is not spoken twice.
  const named = heading ? { 'aria-labelledby': ariaLabel ? undefined : headingId, 'aria-label': ariaLabel } : { 'aria-label': ariaLabel ?? label }
  return (
    <section id={id} className={cls} {...named}>
      {(label || status || led || icon) && (
        <header className="dr-panel__header">
          <Label className="dr-panel__label" id={heading ? headingId : undefined}>
            {led && <span className={`dr-led dr-led--${led}`} aria-hidden="true" />}
            {icon && (
              <span className="dr-panel__icon" aria-hidden="true">
                {icon}
              </span>
            )}
            {label}
          </Label>
          {status && <span className="dr-panel__status">{status}</span>}
        </header>
      )}
      <div className="dr-panel__body">{children}</div>
    </section>
  )
}
