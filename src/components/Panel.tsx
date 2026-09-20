/**
 * HUD panel frame — the base surface for every instrument, briefing and card.
 *
 * Bridge-instrument chrome: corner brackets (CSS, no extra DOM), a tone stripe on the left rail,
 * a mono caps label with an optional status LED, and a right-aligned status readout.
 * Props are stable; `led` and `icon` are additive.
 */
import type { ReactNode } from 'react'

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
}

export function Panel({ label, status, tone = 'default', children, className, id, ariaLabel, led, icon, flush }: PanelProps) {
  const cls = ['dr-panel', `dr-panel--${tone}`, flush ? 'dr-panel--flush' : '', className].filter(Boolean).join(' ')
  return (
    <section id={id} className={cls} aria-label={ariaLabel ?? label}>
      {(label || status || led || icon) && (
        <header className="dr-panel__header">
          <span className="dr-panel__label">
            {led && <span className={`dr-led dr-led--${led}`} aria-hidden="true" />}
            {icon && (
              <span className="dr-panel__icon" aria-hidden="true">
                {icon}
              </span>
            )}
            {label}
          </span>
          {status && <span className="dr-panel__status">{status}</span>}
        </header>
      )}
      <div className="dr-panel__body">{children}</div>
    </section>
  )
}
