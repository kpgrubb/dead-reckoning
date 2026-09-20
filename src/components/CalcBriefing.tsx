/**
 * <CalcBriefing topic="area-under-a-curve"> — collapsible, optional-to-expand calculus refresher.
 * Never a gate. Body content is authored inline as children (prose + an instrument), or loaded
 * from content/calc/<topic>.mdx when children are omitted.
 */
import { lazy, Suspense, useState, type ReactNode, type ComponentType } from 'react'
import { getCalcTopic } from '@/lib/calc/topics'
import { Panel } from './Panel'

const calcBodies = import.meta.glob<{ default: ComponentType }>('/content/calc/*.mdx')

export interface CalcBriefingProps {
  topic: string
  children?: ReactNode
  defaultOpen?: boolean
}

export function CalcBriefing({ topic, children, defaultOpen = false }: CalcBriefingProps) {
  const [open, setOpen] = useState(defaultOpen)
  const t = getCalcTopic(topic)
  const loader = calcBodies[`/content/calc/${topic}.mdx`]
  const Body = !children && loader ? lazy(loader) : null

  return (
    <Panel label="CALC REFRESHER" status={t ? `${t.minutes} MIN · OPTIONAL` : 'OPTIONAL'} tone="engineering" className={`dr-calc ${open ? 'is-open' : ''}`}>
      <button type="button" className="dr-calc__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="dr-calc__title">{t?.title ?? topic}</span>
        <span className="dr-calc__hook">{t?.hook}</span>
        <span className="dr-calc__chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="dr-calc__body">
          {children ??
            (Body ? (
              <Suspense fallback={<p className="dr-muted">Loading refresher…</p>}>
                <Body />
              </Suspense>
            ) : (
              <p className="dr-muted">Refresher body not yet written (content/calc/{topic}.mdx).</p>
            ))}
        </div>
      )}
    </Panel>
  )
}
