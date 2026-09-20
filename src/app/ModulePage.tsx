import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { MDXProvider } from '@mdx-js/react'
import type { MDXComponents } from 'mdx/types'
import { getModule, loadModule, nextModule, prevModule } from '@/content/registry'
import { ACT_TITLES } from '@/content/schema'
import { mdxComponents } from '@/components'
import { ModuleContext, type ModuleContextValue } from '@/components/ModuleContext'
import { useProgress } from '@/store/progress'
import { useSettings } from '@/store/settings'
import { useAudio } from '@/store/audio'
import { isUnlocked } from './MissionMap'

const cache = new Map<string, ComponentType<{ components?: MDXComponents }>>()

export function ModulePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const meta = getModule(id)
  const completed = useProgress((s) => s.completed)
  const beats = useProgress((s) => s.beats)
  const markComplete = useProgress((s) => s.markComplete)
  const setLastModule = useProgress((s) => s.setLastModule)
  const strict = useSettings((s) => s.strictGating)
  const registered = useRef(new Set<string>())
  const [, force] = useState(0)

  useEffect(() => {
    if (meta) setLastModule(meta.id)
    registered.current = new Set()
    window.scrollTo({ top: 0 })
  }, [meta, setLastModule])

  // Checkpoint modules switch the ambient audio to General Quarters (and restore it on leave).
  useEffect(() => {
    if (meta?.kind !== 'checkpoint') return
    useAudio.getState().enterCheckpoint()
    return () => useAudio.getState().leaveCheckpoint()
  }, [meta])

  const registerBeat = useCallback((beatId: string) => {
    if (!registered.current.has(beatId)) {
      registered.current.add(beatId)
      force((n) => n + 1)
    }
  }, [])

  const ctx = useMemo<ModuleContextValue | null>(() => (meta ? { meta, registerBeat } : null), [meta, registerBeat])

  const Body = useMemo(() => {
    if (!meta) return null
    let C = cache.get(meta.path)
    if (!C) {
      C = lazy(() => loadModule(meta).then((m) => ({ default: m.default })))
      cache.set(meta.path, C)
    }
    return C
  }, [meta])

  if (!meta || !Body || !ctx) {
    return (
      <div className="dr-module">
        <p className="dr-muted">Unknown module “{id}”.</p>
        <Link to="/">Return to the mission map</Link>
      </div>
    )
  }

  if (!isUnlocked(meta, completed, strict)) {
    return (
      <div className="dr-module">
        <p className="dr-muted">
          Module {meta.id} is sealed until its prerequisites are complete: {(meta.prereqs ?? []).join(', ')}.
        </p>
        <Link to="/">Return to the mission map</Link>
      </div>
    )
  }

  const allBeatsPassed = [...registered.current].every((b) => beats[b]?.passed)
  const done = !!completed[meta.id]
  const next = nextModule(meta.id)
  const prev = prevModule(meta.id)
  const act = ACT_TITLES[meta.act]

  return (
    <ModuleContext.Provider value={ctx}>
      <article className="dr-module">
        <header className="dr-module__header">
          <div className="dr-module__crumbs">
            <Link to="/">MISSION MAP</Link> / {act.code} · {act.title}
          </div>
          <h1 className="dr-module__title">
            <span className="dr-module__id">{meta.id}</span> {meta.title}
          </h1>
          <div className="dr-module__meta">
            <span>{meta.est_minutes} MIN</span>
            {meta.ap_topics && meta.ap_topics.length > 0 && <span>AP {meta.ap_topics.join(' · ')}</span>}
            {done && <span className="dr-module__done">COMPLETE</span>}
          </div>
          {meta.objectives && meta.objectives.length > 0 && (
            <details className="dr-module__objectives">
              <summary>Objectives</summary>
              <ul>
                {meta.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </details>
          )}
        </header>
        <div className="dr-module__body">
          <MDXProvider components={mdxComponents}>
            <Suspense fallback={<p className="dr-muted">Loading module…</p>}>
              <Body />
            </Suspense>
          </MDXProvider>
        </div>
        <footer className="dr-module__footer">
          {prev ? <Link className="dr-btn dr-btn--ghost" to={`/module/${prev.id}`}>◂ {prev.id}</Link> : <span />}
          {!done && meta.kind !== 'checkpoint' && (
            <button
              type="button"
              className="dr-btn dr-btn--primary"
              disabled={!allBeatsPassed}
              title={allBeatsPassed ? undefined : 'Resolve all mission calls to complete this module'}
              onClick={() => {
                markComplete(meta.id)
                if (next) navigate(`/module/${next.id}`)
              }}
            >
              {allBeatsPassed ? 'MARK COMPLETE' : 'MISSION CALLS PENDING'}
              {next && allBeatsPassed ? ' ▸' : ''}
            </button>
          )}
          {(done || meta.kind === 'checkpoint') && next && (
            <Link className="dr-btn dr-btn--primary" to={`/module/${next.id}`}>
              {next.id} ▸
            </Link>
          )}
        </footer>
      </article>
    </ModuleContext.Provider>
  )
}
