import { Link } from 'react-router-dom'
import { acts, modules, totalMinutes, getModule } from '@/content/registry'
import { useProgress } from '@/store/progress'
import { useSettings } from '@/store/settings'
import type { ModuleMeta } from '@/content/schema'

export function isUnlocked(m: ModuleMeta, completed: Record<string, unknown>, strict: boolean): boolean {
  if (!strict) return true
  return (m.prereqs ?? []).every((p) => completed[p] || !getModule(p))
}

export function MissionMap() {
  const completed = useProgress((s) => s.completed)
  const checkpoints = useProgress((s) => s.checkpoints)
  const lastModule = useProgress((s) => s.lastModule)
  const strict = useSettings((s) => s.strictGating)
  const resume = lastModule && getModule(lastModule) ? getModule(lastModule) : modules.find((m) => !completed[m.id])
  const doneMinutes = modules.filter((m) => completed[m.id]).reduce((s, m) => s + m.est_minutes, 0)

  return (
    <div className="dr-map">
      <section className="dr-map__hero">
        <h1 className="dr-map__title">Mission Map</h1>
        <p className="dr-map__meta">
          {modules.length} modules · ~{Math.round(totalMinutes / 60)} h total · {Math.round(doneMinutes / 60 * 10) / 10} h logged
        </p>
        {resume && (
          <Link className="dr-btn dr-btn--primary dr-map__resume" to={`/module/${resume.id}`}>
            {completed[resume.id] ? 'REVIEW' : lastModule === resume.id ? 'RESUME' : 'BEGIN'} · {resume.id.toUpperCase()} · {resume.title}
          </Link>
        )}
      </section>
      {acts.map((act) => (
        <section key={act.act} className="dr-map__act" aria-labelledby={`act-${act.act}`}>
          <header className="dr-map__act-header">
            <div>
              <div className="dr-map__act-code">{act.code}</div>
              <h2 id={`act-${act.act}`} className="dr-map__act-title">
                {act.title}
              </h2>
              {act.apUnit && <div className="dr-map__act-unit">{act.apUnit}</div>}
            </div>
            <div className="dr-map__act-stats">
              {act.modules.filter((m) => completed[m.id]).length}/{act.modules.length} · {act.totalMinutes} min
              {checkpoints[`act-${act.act}`]?.passed && <span className="dr-map__cp-pass"> · CHECKPOINT PASSED</span>}
            </div>
          </header>
          {act.modules.length === 0 ? (
            <p className="dr-muted dr-map__empty">No modules yet.</p>
          ) : (
            <ol className="dr-map__modules">
              {act.modules.map((m) => {
                const done = !!completed[m.id]
                const unlocked = isUnlocked(m, completed, strict)
                const cls = ['dr-map__module', done ? 'is-done' : '', unlocked ? '' : 'is-locked', m.kind === 'checkpoint' ? 'is-checkpoint' : ''].filter(Boolean).join(' ')
                return (
                  <li key={m.id} className={cls}>
                    {unlocked ? (
                      <Link to={`/module/${m.id}`} className="dr-map__module-link">
                        <span className="dr-map__module-id">{m.id}</span>
                        <span className="dr-map__module-title">{m.title}</span>
                        <span className="dr-map__module-min">{m.est_minutes} min</span>
                        <span className="dr-map__module-state">{done ? '●' : '○'}</span>
                      </Link>
                    ) : (
                      <span className="dr-map__module-link" aria-disabled="true">
                        <span className="dr-map__module-id">{m.id}</span>
                        <span className="dr-map__module-title">{m.title}</span>
                        <span className="dr-map__module-min">{m.est_minutes} min</span>
                        <span className="dr-map__module-state">LOCKED</span>
                      </span>
                    )}
                    {m.summary && <div className="dr-map__module-summary">{m.summary}</div>}
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      ))}
    </div>
  )
}
