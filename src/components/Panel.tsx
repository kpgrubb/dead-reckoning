/**
 * HUD panel frame — the base surface for every instrument, briefing and card.
 * Visual Design System agent may restyle; keep the props stable.
 */
import type { ReactNode } from 'react'

export type PanelTone = 'default' | 'tactical' | 'sensor' | 'engineering' | 'intel' | 'log' | 'alert'

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
}

export function Panel({ label, status, tone = 'default', children, className, id, ariaLabel }: PanelProps) {
  return (
    <section id={id} className={['dr-panel', `dr-panel--${tone}`, className].filter(Boolean).join(' ')} aria-label={ariaLabel ?? label}>
      {(label || status) && (
        <header className="dr-panel__header">
          <span className="dr-panel__label">{label}</span>
          {status && <span className="dr-panel__status">{status}</span>}
        </header>
      )}
      <div className="dr-panel__body">{children}</div>
    </section>
  )
}
