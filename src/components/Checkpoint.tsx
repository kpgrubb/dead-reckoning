/**
 * <Checkpoint act="act-1" /> — Act assessment runner (baseline). Assessment Designer refines UX.
 * Items are generated fresh per attempt from the CheckpointSpec; pass threshold gates the Act.
 */
import { useMemo, useState } from 'react'
import { getCheckpoint } from '@/lib/problems/checkpoints'
import { instantiate } from '@/lib/problems/generate'
import { grade } from '@/lib/problems/grade'
import { getGenerator } from '@/lib/problems/registry'
import type { GradeResult, ProblemInstance, Response } from '@/lib/problems/types'
import { seedFrom } from '@/lib/rng'
import { useProgress } from '@/store/progress'
import { getModule } from '@/content/registry'
import { Link } from 'react-router-dom'
import { Panel } from './Panel'
import { RichText } from './RichText'
import { Plot } from './Plot'
import { useModule } from './ModuleContext'

export function Checkpoint({ act }: { act: string }) {
  const spec = getCheckpoint(act)
  const { meta } = useModule()
  const learnerSeed = useProgress((s) => s.learnerSeed)
  const record = useProgress((s) => s.checkpoints[act])
  const recordCheckpoint = useProgress((s) => s.recordCheckpoint)
  const markComplete = useProgress((s) => s.markComplete)
  const attemptNo = record?.attempts.length ?? 0
  const [started, setStarted] = useState(false)
  const [responses, setResponses] = useState<Record<string, Response>>({})
  const [results, setResults] = useState<Record<string, GradeResult> | null>(null)

  const problems = useMemo<Record<string, ProblemInstance>>(() => {
    if (!spec) return {}
    const out: Record<string, ProblemInstance> = {}
    for (const item of spec.items) {
      const g = typeof item.generator === 'string' ? getGenerator(item.generator) : item.generator
      out[item.id] = instantiate(g, seedFrom(learnerSeed, act, item.id, attemptNo))
    }
    return out
  }, [spec, learnerSeed, act, attemptNo])

  if (!spec) {
    return (
      <Panel label="CHECKPOINT" tone="alert">
        <p className="dr-muted">No checkpoint registered for {act}.</p>
      </Panel>
    )
  }

  const threshold = spec.threshold ?? 0.8

  const submit = () => {
    const res: Record<string, GradeResult> = {}
    let earned = 0
    let total = 0
    const missed: { itemId: string; reviewModules: string[] }[] = []
    for (const item of spec.items) {
      const r = grade(problems[item.id].answer, responses[item.id] ?? null)
      res[item.id] = r
      const w = item.weight ?? 1
      total += w
      earned += w * r.score
      if (!r.correct) missed.push({ itemId: item.id, reviewModules: item.review })
    }
    const score = total ? earned / total : 0
    const passed = score >= threshold
    setResults(res)
    recordCheckpoint(act, { at: new Date().toISOString(), score, passed, missed })
    if (passed) markComplete(meta.id)
  }

  const retry = () => {
    setStarted(true)
    setResponses({})
    setResults(null)
  }

  const last = record?.attempts[record.attempts.length - 1]

  if (!started && !results) {
    return (
      <Panel label={`CHECKPOINT · ${spec.title.toUpperCase()}`} status={`${spec.items.length} ITEMS · ${spec.est_minutes} MIN · PASS ≥ ${Math.round(threshold * 100)}%`} tone="tactical" className="dr-checkpoint">
        <RichText text={spec.briefing} />
        {record?.passed && <p className="dr-checkpoint__passed">Checkpoint passed (best {Math.round(Math.max(...record.attempts.map((a) => a.score)) * 100)}%). You may re-run for practice.</p>}
        {last && !record?.passed && <Debrief score={last.score} missed={last.missed} onFail={spec.onFail} />}
        <button type="button" className="dr-btn dr-btn--primary" onClick={retry}>
          {attemptNo ? 'RETRY · NEW PARAMETERS' : 'BEGIN'}
        </button>
      </Panel>
    )
  }

  return (
    <Panel label={`CHECKPOINT · ${spec.title.toUpperCase()}`} status={`ATTEMPT ${attemptNo + (results ? 0 : 1)}`} tone="tactical" className="dr-checkpoint">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!results) submit()
        }}
      >
        <ol className="dr-checkpoint__items">
          {spec.items.map((item, idx) => {
            const p = problems[item.id]
            const a = p.answer.type === 'display' ? p.answer.question : p.answer
            const disp = p.answer.type === 'display' ? p.answer.display : p.data
            const r = results?.[item.id]
            const v = responses[item.id] ?? null
            const set = (x: Response) => setResponses((s) => ({ ...s, [item.id]: x }))
            return (
              <li key={item.id} className={`dr-checkpoint__item ${r ? (r.correct ? 'is-correct' : 'is-wrong') : ''}`}>
                {disp && <Plot spec={disp} description={`Display for checkpoint item ${idx + 1}.`} showTable={disp.kind === 'table'} />}
                <RichText text={p.prompt} />
                {a.type === 'numeric' && <input className="dr-input dr-input--mono" inputMode="decimal" aria-label={`Answer ${idx + 1}`} value={typeof v === 'string' ? v : ''} onChange={(e) => set(e.target.value)} disabled={!!results} />}
                {a.type === 'choice' && (
                  <fieldset className="dr-choices" disabled={!!results}>
                    <legend className="visually-hidden">Options</legend>
                    {a.options.map((o, i) => (
                      <label key={i} className="dr-choice">
                        <input type="radio" name={item.id} checked={v === i} onChange={() => set(i)} />
                        <RichText text={o} className="dr-choice__text" />
                      </label>
                    ))}
                  </fieldset>
                )}
                {a.type === 'multi' && (
                  <fieldset className="dr-choices" disabled={!!results}>
                    <legend className="visually-hidden">Select all that apply</legend>
                    {a.options.map((o, i) => {
                      const arr = Array.isArray(v) ? v : []
                      return (
                        <label key={i} className="dr-choice">
                          <input type="checkbox" checked={arr.includes(i)} onChange={(e) => set(e.target.checked ? [...arr, i] : arr.filter((x) => x !== i))} />
                          <RichText text={o} className="dr-choice__text" />
                        </label>
                      )
                    })}
                  </fieldset>
                )}
                {a.type === 'interpretation' && <textarea className="dr-input" rows={4} aria-label={`Answer ${idx + 1}`} value={typeof v === 'string' ? v : ''} onChange={(e) => set(e.target.value)} disabled={!!results} />}
                {r && (
                  <div className={`dr-drill__result ${r.correct ? 'is-correct' : 'is-wrong'}`}>
                    <strong>{r.correct ? 'CONFIRMED' : 'REJECTED'}</strong> — {r.feedback}
                    {!r.correct && (
                      <div className="dr-drill__solution">
                        <RichText text={p.solution} />
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        {!results && (
          <button type="submit" className="dr-btn dr-btn--primary">
            SUBMIT CHECKPOINT
          </button>
        )}
      </form>
      {results && last && (
        <div className="dr-checkpoint__outcome">
          <div className="dr-checkpoint__score">
            SCORE {Math.round(last.score * 100)}% — {last.passed ? 'PASSED' : 'BELOW THRESHOLD'}
          </div>
          {last.passed ? <RichText text={spec.onPass} /> : <Debrief score={last.score} missed={last.missed} onFail={spec.onFail} />}
          {!last.passed && (
            <button type="button" className="dr-btn dr-btn--primary" onClick={retry}>
              RETRY · NEW PARAMETERS
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}

function Debrief({ score, missed, onFail }: { score: number; missed: { itemId: string; reviewModules: string[] }[]; onFail: string }) {
  const review = [...new Set(missed.flatMap((m) => m.reviewModules))]
  return (
    <div className="dr-checkpoint__debrief">
      <div className="dr-checkpoint__debrief-tag">DEBRIEF · last score {Math.round(score * 100)}%</div>
      <RichText text={onFail} />
      {review.length > 0 && (
        <ul className="dr-checkpoint__review">
          {review.map((id) => {
            const m = getModule(id)
            return (
              <li key={id}>
                <Link to={`/module/${id}`}>{m ? `${m.id} · ${m.title}` : id}</Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
