/**
 * <Drill generator="act-1/five-number-summary" count={5} />
 * Renders `count` seeded instances of a registered problem generator, each with tiered hints,
 * grading, retry with fresh parameters, an "instrument readout" reveal after two wrong attempts,
 * a dataset/display panel when the problem carries one, and the worked solution.
 *
 * Also exports the shared <AnswerInput> and <ResultBlock> used by <Checkpoint> and <MissionBeat>.
 */
import { useCallback, useId, useMemo, useState, type ReactNode } from 'react'
import { getGenerator, hasGenerator, instantiate } from '@/lib/problems/registry'
import { drillSeed } from '@/lib/problems/generate'
import { answerText, grade } from '@/lib/problems/grade'
import type { Answer, DisplaySpec, GradeResult, ProblemInstance, Response } from '@/lib/problems/types'
import { useProgress } from '@/store/progress'
import { useModule } from './ModuleContext'
import { Panel } from './Panel'
import { RichText } from './RichText'
import { Plot } from './Plot'
import './assessment.css'

export interface DrillProps {
  generator: string
  count?: number
  /** Override label. */
  label?: string
}

export function Drill({ generator, count = 4, label }: DrillProps) {
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({})
  const onStatus = useCallback((index: number, correct: boolean) => {
    setConfirmed((s) => (s[index] === correct ? s : { ...s, [index]: correct }))
  }, [])
  if (!hasGenerator(generator)) {
    return (
      <Panel label="DRILL" tone="alert">
        <p className="dr-muted">Problem generator “{generator}” is not registered.</p>
      </Panel>
    )
  }
  const g = getGenerator(generator)
  const done = Object.values(confirmed).filter(Boolean).length
  const complete = done >= count
  return (
    <Panel label={`DRILL · ${(label ?? g.label).toUpperCase()}`} status={`${done}/${count} CONFIRMED · AP ${g.ap_topics.join(' · ')}`} tone="intel" className="dr-drill">
      <div className={`dr-drill__progress ${complete ? 'is-complete' : ''}`} role="status" aria-live="polite">
        <span>
          {done}/{count} confirmed{complete ? ' — drill complete' : ''}
        </span>
        <div className="dr-drill__progress-track" aria-hidden="true">
          <div className="dr-drill__progress-fill" style={{ width: `${Math.round((100 * done) / count)}%` }} />
        </div>
      </div>
      <ol className="dr-drill__list">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <DrillItem generatorId={generator} index={i} onStatus={onStatus} />
          </li>
        ))}
      </ol>
    </Panel>
  )
}

// ---------------------------------------------------------------------------------------------
// Shared input / result blocks
// ---------------------------------------------------------------------------------------------

export interface AnswerInputProps {
  answer: Answer
  value: Response
  onChange: (r: Response) => void
  disabled?: boolean
  /** Accessible name for the field, e.g. "Answer 3". */
  ariaLabel?: string
  /** Radio group name (required when several choice inputs share a form). */
  name?: string
}

export function AnswerInput({ answer, value, onChange, disabled = false, ariaLabel, name }: AnswerInputProps) {
  const q = answer.type === 'display' ? answer.question : answer
  const uid = useId()
  const groupName = name ?? uid
  switch (q.type) {
    case 'numeric':
      return (
        <label className="dr-field dr-answer">
          <span className="dr-field__label">Answer{q.units ? ` (${q.units})` : ''}</span>
          <input
            className="dr-input dr-input--mono"
            inputMode="decimal"
            autoComplete="off"
            aria-label={ariaLabel}
            value={typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        </label>
      )
    case 'choice':
      return (
        <fieldset className="dr-choices dr-answer" disabled={disabled} aria-label={ariaLabel}>
          <legend className="visually-hidden">Options</legend>
          {q.options.map((o, i) => (
            <label key={i} className="dr-choice">
              <input type="radio" name={groupName} checked={value === i} onChange={() => onChange(i)} />
              <RichText text={o} className="dr-choice__text" />
            </label>
          ))}
        </fieldset>
      )
    case 'multi': {
      const arr = Array.isArray(value) ? value : []
      return (
        <fieldset className="dr-choices dr-answer" disabled={disabled} aria-label={ariaLabel}>
          <legend className="visually-hidden">Select all that apply</legend>
          {q.options.map((o, i) => (
            <label key={i} className="dr-choice">
              <input type="checkbox" checked={arr.includes(i)} onChange={(e) => onChange(e.target.checked ? [...arr, i] : arr.filter((x) => x !== i))} />
              <RichText text={o} className="dr-choice__text" />
            </label>
          ))}
        </fieldset>
      )
    }
    case 'interpretation':
      return (
        <label className="dr-field dr-answer">
          <span className="dr-field__label">Conclusion in context</span>
          <textarea className="dr-input" rows={4} aria-label={ariaLabel} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        </label>
      )
  }
}

export function ResultBlock({ result, misconception, children }: { result: GradeResult; misconception?: string; children?: ReactNode }) {
  const partial = !result.correct && result.score > 0
  return (
    <div className={`dr-drill__result ${result.correct ? 'is-correct' : 'is-wrong'}`} role="status">
      <strong>{result.correct ? 'CONFIRMED' : partial ? 'PARTIAL' : 'REJECTED'}</strong>
      {result.rubric && <span className="dr-result__score">{Math.round(result.score * 100)}%</span>} — {result.feedback}
      {result.rubric && (
        <ul className="dr-drill__rubric" aria-label="Rubric">
          {result.rubric.map((r) => (
            <li key={r.label} className={`dr-rubric__item ${r.met ? 'is-met' : 'is-missing'} ${r.optional ? 'is-optional' : ''}`}>
              <span className="dr-rubric__mark" aria-hidden="true">
                {r.met ? '✓' : r.optional ? '○' : '✗'}
              </span>
              <span className="dr-rubric__label">
                <span className="visually-hidden">{r.met ? 'Met: ' : r.optional ? 'Optional, not mentioned: ' : 'Missing: '}</span>
                {r.label}
              </span>
              {!r.met && r.feedback && <span className="dr-rubric__feedback">{r.feedback}</span>}
            </li>
          ))}
        </ul>
      )}
      {result.forbidden && result.forbidden.length > 0 && (
        <ul className="dr-forbidden" aria-label="Unsupported claims">
          {result.forbidden.map((f) => (
            <li key={f.label} className="dr-forbidden__item">
              <span className="dr-forbidden__label">{f.label}</span>
              {f.why}
            </li>
          ))}
        </ul>
      )}
      {!result.correct && misconception && <RichText text={misconception} className="dr-drill__misconception" />}
      {children}
    </div>
  )
}

/** Dataset / display panel for a problem (the `display` of a display answer, else `problem.data`). */
export function ProblemDisplay({ spec, index, isDisplayItem }: { spec: DisplaySpec; index: number; isDisplayItem: boolean }) {
  return (
    <div className="dr-drill__dataset">
      <Plot spec={spec} label={isDisplayItem ? 'INTERPRET THIS DISPLAY' : 'DATA'} description={isDisplayItem ? `Display to interpret for item ${index + 1}.` : `Data for item ${index + 1}.`} showTable={spec.kind === 'table'} />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Drill item
// ---------------------------------------------------------------------------------------------

const REVEAL_AFTER = 2

export function DrillItem({ generatorId, index, onStatus }: { generatorId: string; index: number; onStatus?: (index: number, correct: boolean) => void }) {
  const { meta } = useModule()
  const learnerSeed = useProgress((s) => s.learnerSeed)
  const recordDrill = useProgress((s) => s.recordDrill)
  const key = `${meta.id}/${generatorId}/${index}`
  const [attempt, setAttempt] = useState(0)
  const [response, setResponse] = useState<Response>(null)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [wrong, setWrong] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const headId = useId()

  const seed = drillSeed(learnerSeed, meta.id, generatorId, index, attempt)
  const problem: ProblemInstance = useMemo(() => instantiate(generatorId, seed), [generatorId, seed])
  const answer = problem.answer
  const isDisplayItem = answer.type === 'display'
  const displaySpec = answer.type === 'display' ? answer.display : problem.data
  const locked = !!result?.correct

  const check = () => {
    const r = grade(answer, response)
    setResult(r)
    if (!r.correct) setWrong((w) => w + 1)
    recordDrill(key, r.correct)
    onStatus?.(index, r.correct)
  }
  const retry = () => {
    setAttempt((a) => a + 1)
    setResponse(null)
    setResult(null)
    setHintsShown(0)
    setShowSolution(false)
    setWrong(0)
    setRevealed(false)
    onStatus?.(index, false)
  }

  const state = result ? (result.correct ? 'CONFIRMED' : 'REJECTED') : 'PENDING'

  return (
    <section className={`dr-drill__item ${result ? (result.correct ? 'is-correct' : 'is-wrong') : ''}`} aria-labelledby={headId}>
      <div className="dr-drill__item-head">
        <span id={headId}>Problem {index + 1}</span>
        <span className="dr-drill__item-state" aria-live="polite">
          {state}
        </span>
      </div>
      {displaySpec && <ProblemDisplay spec={displaySpec} index={index} isDisplayItem={isDisplayItem} />}
      <RichText text={problem.prompt} className="dr-drill__prompt" />
      <form
        className="dr-drill__form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!locked) check()
        }}
      >
        <AnswerInput answer={answer} value={response} onChange={setResponse} disabled={locked} ariaLabel={`Answer to problem ${index + 1}`} />
        <div className="dr-drill__actions">
          {!locked && (
            <button type="submit" className="dr-btn dr-btn--primary">
              CHECK
            </button>
          )}
          {hintsShown < problem.hints.length && !locked && (
            <button type="button" className="dr-btn" onClick={() => setHintsShown((h) => h + 1)} aria-controls={`${headId}-hints`}>
              HINT {hintsShown + 1}/{problem.hints.length}
            </button>
          )}
          {wrong >= REVEAL_AFTER && !locked && !revealed && (
            <button type="button" className="dr-btn dr-btn--sensor" onClick={() => setRevealed(true)}>
              READ INSTRUMENT
            </button>
          )}
          {result && (
            <button type="button" className="dr-btn dr-btn--ghost" onClick={retry}>
              RETRY · NEW NUMBERS
            </button>
          )}
          {result && !showSolution && (
            <button type="button" className="dr-btn dr-btn--ghost" onClick={() => setShowSolution(true)}>
              WORKED SOLUTION
            </button>
          )}
        </div>
      </form>
      <ol className="dr-hints" id={`${headId}-hints`} aria-live="polite" aria-label="Hints">
        {problem.hints.slice(0, hintsShown).map((h, i) => (
          <li key={i} className="dr-hints__item">
            <span className="dr-hints__tag">HINT {i + 1}</span>
            <RichText text={h} as="span" />
          </li>
        ))}
      </ol>
      {revealed && (
        <div className="dr-reveal" role="status">
          <span className="dr-reveal__tag">INSTRUMENT READOUT</span>
          <RichText text={answerText(answer)} as="span" />
        </div>
      )}
      {result && <ResultBlock result={result} misconception={problem.misconception} />}
      {showSolution && (
        <div className="dr-drill__solution">
          <div className="dr-drill__solution-title">WORKED SOLUTION · answer: {answerText(answer)}</div>
          <RichText text={problem.solution} />
        </div>
      )}
    </section>
  )
}
