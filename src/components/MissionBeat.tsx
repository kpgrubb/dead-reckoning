/**
 * <MissionBeat> — in-story application whose result gates the next scene.
 *
 *   <MissionBeat id="act-1-03-outlier" kind="numeric" answer={stats.iqr(data)} tolerance={0.05} units="MW"
 *                prompt="What is the IQR of the drive signatures?">
 *     <Success>…the scene continues; XO nods…</Success>
 *     <Failure>…debrief: the XO points at the sorted list…</Failure>
 *   </MissionBeat>
 *   <Gated by="act-1-03-outlier">…rest of the scene…</Gated>
 *
 * kinds: 'numeric' | 'choice' | 'interpretation' | 'decision'
 *  - decision: a command call with no right answer; records the choice and always passes.
 *    Use <Outcome option={0}> children to show consequence text per option.
 * Answers MUST be computed by code (import from @/lib/stats in the MDX file).
 */
import { Children, isValidElement, useEffect, useState, type ReactNode } from 'react'
import { grade } from '@/lib/problems/grade'
import type { Answer, GradeResult, Response, RubricGroup, RubricPhrase } from '@/lib/problems/types'
import { useProgress } from '@/store/progress'
import { useModule } from './ModuleContext'
import { Panel } from './Panel'
import { RichText } from './RichText'

export function Success({ children }: { children: ReactNode }) {
  return <>{children}</>
}
export function Failure({ children }: { children: ReactNode }) {
  return <>{children}</>
}
export function Outcome({ children }: { option: number; children: ReactNode }) {
  return <>{children}</>
}

type BeatBase = { id: string; prompt: string; children?: ReactNode; label?: string }
type NumericBeat = BeatBase & { kind: 'numeric'; answer: number; tolerance?: number; relativeTolerance?: number; units?: string; digits?: number }
type ChoiceBeat = BeatBase & { kind: 'choice'; options: string[]; correct: number; feedback?: (string | null)[] }
type InterpBeat = BeatBase & { kind: 'interpretation'; required: RubricGroup[]; forbidden?: RubricPhrase[]; exemplar: string; minWords?: number }
type DecisionBeat = BeatBase & { kind: 'decision'; options: string[] }
export type MissionBeatProps = NumericBeat | ChoiceBeat | InterpBeat | DecisionBeat

function toAnswer(p: MissionBeatProps): Answer | null {
  switch (p.kind) {
    case 'numeric':
      return { type: 'numeric', value: p.answer, tolerance: p.tolerance, relativeTolerance: p.relativeTolerance, units: p.units, digits: p.digits }
    case 'choice':
      return { type: 'choice', options: p.options, correct: p.correct, feedback: p.feedback }
    case 'interpretation':
      return { type: 'interpretation', required: p.required, forbidden: p.forbidden, exemplar: p.exemplar, minWords: p.minWords }
    case 'decision':
      return null
  }
}

function pick(children: ReactNode, type: unknown, option?: number): ReactNode {
  const out: ReactNode[] = []
  Children.forEach(children, (c) => {
    if (isValidElement(c) && c.type === type) {
      if (option === undefined || (c.props as { option?: number }).option === option) out.push(c)
    }
  })
  return out
}

export function MissionBeat(props: MissionBeatProps) {
  const { id, prompt, children, label } = props
  const { registerBeat } = useModule()
  const record = useProgress((s) => s.beats[id])
  const recordBeat = useProgress((s) => s.recordBeat)
  const setDecision = useProgress((s) => s.setDecision)
  const [response, setResponse] = useState<Response>(null)
  const [result, setResult] = useState<GradeResult | null>(null)

  useEffect(() => registerBeat(id), [id, registerBeat])

  const passed = !!record?.passed
  const answer = toAnswer(props)

  const submit = () => {
    if (props.kind === 'decision') {
      const i = typeof response === 'number' ? response : -1
      if (i < 0) return
      recordBeat(id, true, props.options[i])
      setDecision(id, props.options[i])
      return
    }
    const r = grade(answer!, response)
    setResult(r)
    recordBeat(id, r.correct)
  }

  const chosenIndex = props.kind === 'decision' && record?.choice ? props.options.indexOf(record.choice) : -1

  return (
    <Panel label={`MISSION · ${(label ?? 'YOUR CALL').toUpperCase()}`} status={passed ? 'RESOLVED' : `ATTEMPTS ${record?.attempts ?? 0}`} tone={passed ? 'tactical' : 'alert'} className={`dr-beat ${passed ? 'is-passed' : ''}`} id={id}>
      <RichText text={prompt} className="dr-beat__prompt" />
      {!passed && (
        <form
          className="dr-beat__form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          {props.kind === 'numeric' && (
            <label className="dr-field">
              <span className="dr-field__label">Answer{props.units ? ` (${props.units})` : ''}</span>
              <input className="dr-input dr-input--mono" inputMode="decimal" value={typeof response === 'string' ? response : ''} onChange={(e) => setResponse(e.target.value)} />
            </label>
          )}
          {(props.kind === 'choice' || props.kind === 'decision') && (
            <fieldset className="dr-choices">
              <legend className="visually-hidden">Options</legend>
              {props.options.map((o, i) => (
                <label key={i} className="dr-choice">
                  <input type="radio" name={id} checked={response === i} onChange={() => setResponse(i)} />
                  <RichText text={o} className="dr-choice__text" />
                </label>
              ))}
            </fieldset>
          )}
          {props.kind === 'interpretation' && (
            <label className="dr-field">
              <span className="dr-field__label">Your assessment, in context</span>
              <textarea className="dr-input" rows={4} value={typeof response === 'string' ? response : ''} onChange={(e) => setResponse(e.target.value)} />
            </label>
          )}
          <div className="dr-drill__actions">
            <button type="submit" className="dr-btn dr-btn--primary">
              {props.kind === 'decision' ? 'GIVE THE ORDER' : 'COMMIT'}
            </button>
          </div>
        </form>
      )}
      {result && !result.correct && (
        <div className="dr-beat__debrief" role="status">
          <div className="dr-beat__debrief-tag">DEBRIEF — {result.feedback}</div>
          {pick(children, Failure)}
        </div>
      )}
      {passed && props.kind !== 'decision' && <div className="dr-beat__outcome">{pick(children, Success)}</div>}
      {passed && props.kind === 'decision' && <div className="dr-beat__outcome">{pick(children, Outcome, chosenIndex)}</div>}
    </Panel>
  )
}

/** Hides content until the named beat(s) have passed. */
export function Gated({ by, children }: { by: string | string[]; children: ReactNode }) {
  const ids = Array.isArray(by) ? by : [by]
  const beats = useProgress((s) => s.beats)
  const ok = ids.every((i) => beats[i]?.passed)
  if (ok) return <>{children}</>
  return (
    <div className="dr-gated" aria-live="polite">
      <span className="dr-gated__tag">SEALED</span> Resolve the mission call above to continue.
    </div>
  )
}
