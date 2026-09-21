/**
 * <Checkpoint act="act-1" /> — Act assessment runner.
 *
 * Timer-free (shows est_minutes), progress indicator, mixed item types including `display`
 * ("interpret this display": a Plot, then the question), submit-all grading with an unanswered-items
 * confirmation, score readout, in-story debrief listing missed items with review-module links,
 * retry with fresh parameters. In-progress responses persist to sessionStorage so an accidental
 * navigation does not lose a 20-minute attempt. Passing marks the checkpoint module complete.
 *
 * <CheckpointRunner spec={…}> renders a spec directly (tests, previews).
 */
import { useEffect, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildCheckpointProblems, clearDraft, getCheckpoint, loadDraft, saveDraft, scoreCheckpoint, type CheckpointScore, type CheckpointSpec, type MissedItem } from '@/lib/problems/checkpoints'
import { answerText, isAnswered } from '@/lib/problems/grade'
import { getGenerator } from '@/lib/problems/registry'
import type { Response } from '@/lib/problems/types'
import { useProgress } from '@/store/progress'
import { getModule } from '@/content/registry'
import { Panel } from './Panel'
import { RichText } from './RichText'
import { useModule } from './ModuleContext'
import { AnswerInput, ProblemDisplay, ResultBlock } from './Drill'
import './assessment.css'

export function Checkpoint({ act }: { act: string }) {
  const spec = getCheckpoint(act)
  if (!spec) {
    return (
      <Panel label="CHECKPOINT" tone="alert">
        <p className="dr-muted">No checkpoint registered for {act}.</p>
      </Panel>
    )
  }
  return <CheckpointRunner spec={spec} />
}

export function CheckpointRunner({ spec }: { spec: CheckpointSpec }) {
  const act = spec.act
  const { meta } = useModule()
  const learnerSeed = useProgress((s) => s.learnerSeed)
  const record = useProgress((s) => s.checkpoints[act])
  const recordCheckpoint = useProgress((s) => s.recordCheckpoint)
  const markComplete = useProgress((s) => s.markComplete)
  const attemptNo = record?.attempts.length ?? 0
  const draft = useMemo(() => loadDraft(act, learnerSeed, attemptNo), [act, learnerSeed, attemptNo])
  const [started, setStarted] = useState(!!draft)
  const [resumed, setResumed] = useState(!!draft)
  const [responses, setResponses] = useState<Record<string, Response>>(draft ?? {})
  const [outcome, setOutcome] = useState<CheckpointScore | null>(null)
  const [confirming, setConfirming] = useState(false)
  const uid = useId()

  /**
   * The attempt index the CURRENT run's items were generated from, frozen when the run begins.
   * Submitting appends to `record.attempts`, which bumps `attemptNo`; without this freeze the
   * post-submit review would re-render with the NEXT attempt's parameters while showing the marks,
   * answer keys and worked solutions of the attempt that was actually graded.
   */
  const [runAttempt, setRunAttempt] = useState(attemptNo)
  // A retry (or a fresh attempt after someone else's submit) resyncs while the run is idle.
  useEffect(() => {
    if (!started && !outcome && runAttempt !== attemptNo) setRunAttempt(attemptNo)
  }, [started, outcome, runAttempt, attemptNo])

  const problems = useMemo(() => buildCheckpointProblems(spec, learnerSeed, runAttempt), [spec, learnerSeed, runAttempt])
  const threshold = spec.threshold ?? 0.8

  // Persist the in-progress attempt.
  useEffect(() => {
    if (started && !outcome) saveDraft(act, learnerSeed, runAttempt, responses)
  }, [act, learnerSeed, runAttempt, responses, started, outcome])

  const answered = spec.items.filter((it) => isAnswered(problems[it.id].answer, responses[it.id] ?? null)).length
  const total = spec.items.length

  const submit = () => {
    const s = scoreCheckpoint(spec, problems, responses)
    setOutcome(s)
    setConfirming(false)
    clearDraft(act)
    recordCheckpoint(act, { at: new Date().toISOString(), score: s.score, passed: s.passed, missed: s.missed })
    if (s.passed) markComplete(meta.id)
  }
  const trySubmit = () => {
    if (answered < total && !confirming) {
      setConfirming(true)
      return
    }
    submit()
  }
  const begin = () => {
    setRunAttempt(attemptNo) // freeze this run's parameters before any submit bumps the count
    setStarted(true)
    setResumed(false)
    setResponses({})
    setOutcome(null)
    setConfirming(false)
  }

  const last = record?.attempts[record.attempts.length - 1]
  const best = record?.attempts.length ? Math.max(...record.attempts.map((a) => a.score)) : 0

  if (!started && !outcome) {
    return (
      <Panel label={`CHECKPOINT · ${spec.title.toUpperCase()}`} status={`${total} ITEMS · ≈ ${spec.est_minutes} MIN · PASS ≥ ${Math.round(threshold * 100)}%`} tone="tactical" className="dr-checkpoint">
        <RichText text={spec.briefing} />
        <div className="dr-checkpoint__meta">
          <span>
            <strong>{total}</strong> items
          </span>
          <span>
            ≈ <strong>{spec.est_minutes}</strong> min · no timer
          </span>
          <span>
            pass ≥ <strong>{Math.round(threshold * 100)}%</strong>
          </span>
          {attemptNo > 0 && (
            <span>
              attempts <strong>{attemptNo}</strong>
            </span>
          )}
        </div>
        {record?.passed && <p className="dr-checkpoint__passed">Checkpoint passed (best {Math.round(best * 100)}%). You may re-run for practice with new parameters.</p>}
        {last && !record?.passed && <Debrief spec={spec} score={last.score} missed={last.missed} />}
        <button type="button" className="dr-btn dr-btn--primary" onClick={begin}>
          {attemptNo ? 'RETRY · NEW PARAMETERS' : 'BEGIN'}
        </button>
      </Panel>
    )
  }

  return (
    <Panel label={`CHECKPOINT · ${spec.title.toUpperCase()}`} status={outcome ? `ATTEMPT ${attemptNo} · SCORED` : `ATTEMPT ${attemptNo + 1} · ≈ ${spec.est_minutes} MIN`} tone="tactical" className="dr-checkpoint">
      {!outcome && (
        <div className="dr-checkpoint__progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Items answered">
          <span>
            {answered}/{total} answered
          </span>
          <div className="dr-checkpoint__bar" aria-hidden="true">
            <div className="dr-checkpoint__bar-fill" style={{ width: `${Math.round((100 * answered) / total)}%` }} />
          </div>
          <span>≈ {spec.est_minutes} min · no timer</span>
        </div>
      )}
      {resumed && !outcome && (
        <p className="dr-checkpoint__resume" role="status">
          Resumed your in-progress attempt.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!outcome) trySubmit()
        }}
      >
        <ol className="dr-checkpoint__items">
          {spec.items.map((item, idx) => {
            const p = problems[item.id]
            const isDisplayItem = p.answer.type === 'display'
            const disp = p.answer.type === 'display' ? p.answer.display : p.data
            const r = outcome?.results[item.id]
            const v = responses[item.id] ?? null
            const done = isAnswered(p.answer, v)
            const set = (x: Response) => setResponses((s) => ({ ...s, [item.id]: x }))
            const headId = `${uid}-${item.id}`
            const g = typeof item.generator === 'string' ? getGenerator(item.generator) : item.generator
            return (
              <li key={item.id}>
                <section className={`dr-checkpoint__item ${r ? (r.correct ? 'is-correct' : 'is-wrong') : ''} ${done ? 'is-answered' : ''}`} aria-labelledby={headId}>
                  <div className="dr-checkpoint__item-head">
                    <h4 id={headId}>
                      Item {idx + 1} of {total}
                      {(item.weight ?? 1) !== 1 ? ` · weight ${item.weight}` : ''}
                      {isDisplayItem ? ' · interpret the display' : ''}
                    </h4>
                    <span className="dr-checkpoint__item-state">{r ? (r.correct ? 'CONFIRMED' : 'MISSED') : done ? 'ANSWERED' : 'OPEN'}</span>
                  </div>
                  {disp && <ProblemDisplay spec={disp} index={idx} isDisplayItem={isDisplayItem} />}
                  <RichText text={p.prompt} />
                  <AnswerInput answer={p.answer} value={v} onChange={set} disabled={!!outcome} ariaLabel={`Answer to item ${idx + 1}`} name={`${uid}-${item.id}`} />
                  {r && (
                    <ResultBlock result={r} misconception={r.correct ? undefined : p.misconception}>
                      {!r.correct && (
                        <>
                          <div className="dr-checkpoint__answer-key">ANSWER · {answerText(p.answer)}</div>
                          <div className="dr-drill__solution">
                            <div className="dr-drill__solution-title">WORKED SOLUTION · {g.label}</div>
                            <RichText text={p.solution} />
                          </div>
                        </>
                      )}
                    </ResultBlock>
                  )}
                </section>
              </li>
            )
          })}
        </ol>
        {!outcome && (
          <div className="dr-checkpoint__actions">
            <button type="submit" className="dr-btn dr-btn--primary">
              SUBMIT CHECKPOINT
            </button>
            <span className="dr-muted">
              {answered}/{total} answered
            </span>
          </div>
        )}
        {confirming && !outcome && (
          <div className="dr-checkpoint__confirm" role="alertdialog" aria-label="Unanswered items">
            <span>
              {total - answered} item{total - answered === 1 ? '' : 's'} unanswered — unanswered items score zero. Submit anyway?
            </span>
            <button type="button" className="dr-btn dr-btn--warn" onClick={submit}>
              SUBMIT ANYWAY
            </button>
            <button type="button" className="dr-btn dr-btn--ghost" onClick={() => setConfirming(false)}>
              KEEP WORKING
            </button>
          </div>
        )}
      </form>
      {outcome && (
        <div className="dr-checkpoint__outcome" role="region" aria-label="Checkpoint result">
          <div className={`dr-checkpoint__score ${outcome.passed ? '' : 'is-fail'}`} role="status">
            SCORE {Math.round(outcome.score * 100)}% — {outcome.passed ? 'PASSED' : 'BELOW THRESHOLD'}
          </div>
          <div className="dr-checkpoint__score-detail">
            {total - outcome.missed.length}/{total} items · threshold {Math.round(threshold * 100)}% · attempt {attemptNo}
          </div>
          {outcome.passed ? <RichText text={spec.onPass} /> : <Debrief spec={spec} score={outcome.score} missed={outcome.missed} />}
          <div className="dr-checkpoint__actions">
            {!outcome.passed && (
              <button type="button" className="dr-btn dr-btn--primary" onClick={begin}>
                RETRY · NEW PARAMETERS
              </button>
            )}
            {outcome.passed && (
              <button type="button" className="dr-btn dr-btn--ghost" onClick={begin}>
                RUN AGAIN · PRACTICE
              </button>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

function Debrief({ spec, score, missed }: { spec: CheckpointSpec; score: number; missed: MissedItem[] }) {
  const review = [...new Set(missed.flatMap((m) => m.reviewModules))]
  return (
    <div className="dr-checkpoint__debrief" role="region" aria-label="Debrief">
      <div className="dr-checkpoint__debrief-tag">DEBRIEF · score {Math.round(score * 100)}%</div>
      <RichText text={spec.onFail} />
      {missed.length > 0 && (
        <ul className="dr-checkpoint__missed" aria-label="Missed items">
          {missed.map((m) => {
            const idx = spec.items.findIndex((it) => it.id === m.itemId)
            const item = spec.items[idx]
            const g = item ? (typeof item.generator === 'string' ? getGenerator(item.generator) : item.generator) : null
            return (
              <li key={m.itemId} className="dr-checkpoint__missed-item">
                <div className="dr-checkpoint__missed-head">
                  <span>Item {idx + 1}</span>
                  {g && <span>{g.label}</span>}
                  {g && <span>AP {g.ap_topics.join(' · ')}</span>}
                </div>
                {item?.debrief && <RichText text={item.debrief} className="dr-checkpoint__missed-debrief" />}
                <div className="dr-checkpoint__missed-links">
                  {m.reviewModules.map((id) => {
                    const mod = getModule(id)
                    return (
                      <Link key={id} to={`/module/${id}`}>
                        REVIEW {mod ? `${mod.id} · ${mod.title}` : id}
                      </Link>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {review.length > 0 && (
        <ul className="dr-checkpoint__review" aria-label="Modules to revisit">
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
