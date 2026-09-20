import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import katex from 'katex'
import { useShipLog } from '@/store/log'
import { RichText } from '@/components/RichText'
import { ACT_TITLES, type ActNumber } from '@/content/schema'

export function ShipLogPage() {
  const entries = useShipLog((s) => s.entries)
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const all = Object.values(entries).sort((a, b) => a.act - b.act || a.moduleId.localeCompare(b.moduleId))
    const needle = q.trim().toLowerCase()
    if (!needle) return all
    return all.filter((e) => [e.title, e.concept, e.mistake ?? '', e.formula ?? '', ...(e.tags ?? [])].join(' ').toLowerCase().includes(needle))
  }, [entries, q])

  return (
    <div className="dr-log">
      <h1 className="dr-map__title">Ship’s Log</h1>
      <p className="dr-map__meta">Concepts and formulas accumulate here as the mission proceeds. {Object.keys(entries).length} entries.</p>
      <label className="dr-field">
        <span className="dr-field__label">Search</span>
        <input className="dr-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="standard deviation, 1.5×IQR, residual…" />
      </label>
      {list.length === 0 && <p className="dr-muted">Nothing logged yet. Entries appear as you reach each module’s log entry.</p>}
      <ul className="dr-log__list">
        {list.map((e) => (
          <li key={e.id} className="dr-log__entry">
            <div className="dr-log__head">
              <span className="dr-log__act">{ACT_TITLES[e.act as ActNumber]?.code ?? `ACT ${e.act}`}</span>
              <Link to={`/module/${e.moduleId}`} className="dr-log__module">
                {e.moduleId}
              </Link>
              <span className="dr-log__title">{e.title}</span>
            </div>
            <RichText text={e.concept} />
            {e.formula && <div className="dr-log__formula" dangerouslySetInnerHTML={{ __html: katex.renderToString(e.formula, { displayMode: true, throwOnError: false, output: 'htmlAndMathml' }) }} />}
            {e.mistake && (
              <div className="dr-log__mistake">
                <span className="dr-logentry__mistake-tag">COMMON ERROR</span>
                <RichText text={e.mistake} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
