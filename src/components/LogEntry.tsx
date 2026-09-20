/**
 * <LogEntry> — end-of-module recap in the ship's-log voice (past tense). Registers itself in the
 * Ship's Log store so the searchable reference grows as the mission proceeds.
 */
import { useEffect } from 'react'
import katex from 'katex'
import { useShipLog } from '@/store/log'
import { useModule } from './ModuleContext'
import { RichText } from './RichText'
import { Panel } from './Panel'

export interface LogEntryProps {
  /** Concept name, e.g. "Standard deviation". */
  title: string
  /** Two sentences, Markdown + $…$. */
  concept: string
  /** Display-mode TeX (no $$). */
  formula?: string
  /** One common mistake, Markdown. */
  mistake?: string
  tags?: string[]
  /** Optional id override (defaults to moduleId + slug of title). */
  id?: string
}

export function LogEntry({ title, concept, formula, mistake, tags, id }: LogEntryProps) {
  const { meta } = useModule()
  const upsert = useShipLog((s) => s.upsert)
  const entryId = id ?? `${meta.id}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  useEffect(() => {
    upsert({ id: entryId, moduleId: meta.id, act: meta.act, title, concept, formula, mistake, tags })
  }, [entryId, meta.id, meta.act, title, concept, formula, mistake, tags, upsert])

  return (
    <Panel label={`SHIP’S LOG · ${meta.id.toUpperCase()}`} status={title.toUpperCase()} tone="log" className="dr-logentry">
      <RichText text={concept} className="dr-logentry__concept" />
      {formula && (
        <div className="dr-logentry__formula" dangerouslySetInnerHTML={{ __html: katex.renderToString(formula, { displayMode: true, throwOnError: false, output: 'htmlAndMathml' }) }} />
      )}
      {mistake && (
        <div className="dr-logentry__mistake">
          <span className="dr-logentry__mistake-tag">COMMON ERROR</span>
          <RichText text={mistake} />
        </div>
      )}
    </Panel>
  )
}
