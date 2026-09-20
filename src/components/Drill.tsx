/**
 * <Drill generator="act-1/five-number-summary" count={5} />
 * Renders `count` seeded instances of a registered problem generator, each with tiered hints,
 * grading, retry with fresh parameters, and the worked solution.
 */
import { useMemo, useState } from 'react'
import { getGenerator, hasGenerator } from '@/lib/problems/registry'
import { drillSeed, instantiate } from '@/lib/problems/generate'
import { grade } from '@/lib/problems/grade'
import type { Answer, GradeResult, ProblemInstance, Response } from '@/lib/problems/types'
import { useProgress } from '@/store/progress'
import { fmt } from '@/lib/stats/format'
import { useModule } from './ModuleContext'
import { Panel } from './Panel'
import { RichText } from './RichText'
import { Plot } from './Plot'

export interface DrillProps {
  generator: string
  count?: number
  /** Override label. */
  label?: string
}

export function Drill({ generator, count = 4, label }: DrillProps) {
  if (!hasGenerator(generator)) {
    return (
      <Panel label="DRILL" tone="alert">
        <p className="dr-muted">Problem generator “{generator}” is not registered.</p>
      </Panel>
    )
  }
  const g = getGenerator(generator)
  return (
    <Panel label={`DRILL · ${(label ?? g.label).toUpperCase()}`} status={`${count} PROBLEMS · AP ${g.ap_topics.join(' · ')}`} tone="intel" className="dr-drill">
      <ol className="dr-drill__list">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <DrillItem generatorId={generator} index={i} />
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function AnswerInput({ answer, value, onChange, disabled }: { answer: Answer; value: Response; onChange: (r: Response) => void; disabled: boolean }) {
  const q = answer.type === 'display' ? answer.question : answer
  switch (q.type) {
    case 'numeric':
      return (
        <label className="dr-field">
          <span className="dr-field__label">Answer{q.units ? ` (${q.units})` : ''}</span>
          <input className="dr-input dr-input--mono" inputMode="decimal" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        </label>
      )
    case 'choice':
      return (
        <fieldset className="dr-choices" disabled={disabled}>
          <legend className="visually-hidden">Options</legend>
          {q.options.map((o, i) => (
            <label key={i} className="dr-choice">
              <input type="radio" checked={value === i} onChange={() => onChange(i)} />
              <RichText text={o} className="dr-choice__text" />
            </label>
          ))}
        </fieldset>
      )
    case 'multi': {
      const arr = Array.isArray(value) ? value : []
      return (
        <fieldset className="dr-choices" disabled={disabled}>
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
        <label className="dr-field">
          <span className="dr-field__label">Conclusion in context</span>
          <textarea className="dr-input" rows={4} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
        </label>
      )
  }
}

function revealText(answer: Answer): string {
  const q = answer.type === 'display' ? answer.question : answer
  switch (q.type) {
    case 'numeric':
      return `${fmt(q.value, q.digits ?? 3)}${q.units ? ' ' + q.units : ''}`
    case 'choice':
      return q.options[q.correct]
    case 'multi':
      return q.correct.map((i) => q.options[i]).join('; ')
    case 'interpretation':
      return q.exemplar
  }
}

export function DrillItem({ generatorId, index }: { generatorId: string; index: number }) {
  const { meta } = useModule()
  const learnerSeed = useProgress((s) => s.learnerSeed)
  const recordDrill = useProgress((s) => s.recordDrill)
  const key = `${meta.id}/${generatorId}/${index}`
  const [attempt, setAttempt] = useState(0)
  const [response, setResponse] = useState<Response>(null)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  const seed = drillSeed(learnerSeed, meta.id, generatorId, index, attempt)
  const problem: ProblemInstance = useMemo(() => instantiate(generatorId, seed), [generatorId, seed])
  const answer = problem.answer
  const displaySpec = answer.type === 'display' ? answer.display : problem.data

  const check = () => {
    const r = grade(answer, response)
    setResult(r)
    recordDrill(key, r.correct)
  }
  const retry = () => {
    setAttempt((a) => a + 1)
    setResponse(null)
    setResult(null)
    setHintsShown(0)
    setShowSolution(false)
  }

  return (
    <div className={`dr-drill__item ${result ? (result.correct ? 'is-correct' : 'is-wrong') : ''}`}>
      {displaySpec && <Plot spec={displaySpec} description={`Data for drill problem ${index + 1}.`} showTable={displaySpec.kind === 'table'} />}
      <RichText text={problem.prompt} className="dr-drill__prompt" />
      <form
        className="dr-drill__form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!result?.correct) check()
        }}
      >
        <AnswerInput answer={answer} value={response} onChange={setResponse} disabled={!!result?.correct} />
        <div className="dr-drill__actions">
          {!result?.correct && (
            <button type="submit" className="dr-btn dr-btn--primary">
              CHECK
            </button>
          )}
          {hintsShown < problem.hints.length && !result?.correct && (
            <button type="button" className="dr-btn" onClick={() => setHintsShown((h) => h + 1)}>
              HINT {hintsShown + 1}/{problem.hints.length}
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
      {hintsShown > 0 && (
        <ol className="dr-drill__hints">
          {problem.hints.slice(0, hintsShown).map((h, i) => (
            <li key={i}>
              <RichText text={h} />
            </li>
          ))}
        </ol>
      )}
      {result && (
        <div className={`dr-drill__result ${result.correct ? 'is-correct' : 'is-wrong'}`} role="status">
          <strong>{result.correct ? 'CONFIRMED' : 'REJECTED'}</strong> — {result.feedback}
          {result.rubric && (
            <ul className="dr-drill__rubric">
              {result.rubric.map((r) => (
                <li key={r.label} className={r.met ? 'is-met' : 'is-missing'}>
                  {r.met ? '✓' : '✗'} {r.label}
                </li>
              ))}
            </ul>
          )}
          {!result.correct && problem.misconception && <RichText text={problem.misconception} className="dr-drill__misconception" />}
        </div>
      )}
      {showSolution && (
        <div className="dr-drill__solution">
          <div className="dr-drill__solution-title">WORKED SOLUTION · answer: {revealText(answer)}</div>
          <RichText text={problem.solution} />
        </div>
      )}
    </div>
  )
}
