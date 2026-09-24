/**
 * INTEL · PROCEDURE SELECTOR (act-7-07) — the decision tree that grades the choice.
 *
 * Three modes:
 *
 *   TREE       one finding at a time, walked question by question: categorical or quantitative,
 *              how many groups, are the units in the two columns the same units, magnitude or
 *              decision. A wrong turn is explained at the turn and the tree does not advance.
 *   BRIEF      the five findings the inference brief assembles, one at a time. Pick a procedure and
 *              a form, get graded, and see the finding's own reason on a hit or a targeted
 *              correction on a miss. A running score sits in the panel header.
 *   REFERENCE  question type × data structure → procedure and the `@/lib/stats` call that runs it.
 *
 * Nothing here is computed: the five findings and their procedures come from `BRIEF_FINDINGS` in
 * `./data`, and the structural truth for each one is derived from its `procedure` field rather than
 * typed in a second time.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   findings     the questions the selector offers. Default: the brief's five.
 *   mode         which mode the panel opens in. Default 'tree'.
 *   label, tone  Panel header and ship-system tone.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Readout, Segmented } from '@/instruments/shared'
import { fmtInt } from '@/lib/stats'
import { BRIEF_FINDINGS, PROCEDURES, type ProcedureId, type ProcedureQuestion } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

type Mode = 'tree' | 'brief' | 'reference'
type Form = 'interval' | 'test'

const PROCEDURE_LABEL: Record<ProcedureId, string> = {
  'one-prop': 'One-proportion z',
  'two-prop': 'Two-proportion z',
  'one-mean': 'One-sample t',
  paired: 'Paired t (one-sample t on the differences)',
  'two-mean': 'Two-sample t',
}

const STATS_CALL: Record<ProcedureId, { interval: string; test: string }> = {
  'one-prop': { interval: 'onePropInterval(x, n, …)', test: 'onePropTest(x, n, { p0, alt })' },
  'two-prop': { interval: 'twoPropInterval(a, b, …)', test: 'twoPropTest(a, b, { alt })' },
  'one-mean': { interval: 'oneMeanInterval(xs, { confidence })', test: 'oneMeanTest(xs, { mu0, alt })' },
  paired: { interval: 'pairedTInterval(after, before, …)', test: 'pairedTTest(after, before, { alt })' },
  'two-mean': { interval: 'twoMeanInterval(a, b, { dfMethod })', test: 'twoMeanTest(a, b, { alt, dfMethod })' },
}

/** The structural truth for a finding, derived from its procedure rather than stated twice. */
interface Structure {
  type: 'categorical' | 'quantitative'
  groups: 'one' | 'two'
  /** Only asked when the measurement is quantitative and the file has two columns. */
  sameUnits?: 'same' | 'different'
}

function structureOf(p: ProcedureId): Structure {
  switch (p) {
    case 'one-prop':
      return { type: 'categorical', groups: 'one' }
    case 'two-prop':
      return { type: 'categorical', groups: 'two' }
    case 'one-mean':
      return { type: 'quantitative', groups: 'one' }
    case 'paired':
      return { type: 'quantitative', groups: 'two', sameUnits: 'same' }
    case 'two-mean':
      return { type: 'quantitative', groups: 'two', sameUnits: 'different' }
  }
}

const WRONG_TURN: Record<string, string> = {
  'type:categorical':
    'What is written down for each unit here is a number with units on it, not a category. A proportion procedure needs a yes/no outcome and counts of successes and failures, and there are none to count.',
  'type:quantitative':
    'What is written down for each unit here is a category — it happened or it did not. There is no mean to estimate and no s to put in a standard error, so this is a proportion procedure.',
  'groups:one': 'There are two groups of units in this file, and the parameter the question asks about is a difference between them. A one-sample procedure has nothing to compare.',
  'groups:two':
    'There is one group of units here. The comparison in the question is against a fixed published figure, not against a second group of units, so nothing about this is two-sample.',
  'same:same':
    'These are different units in the two columns, and no rule matches one to another. Subtracting row by row would invent a correspondence the collection never created, and the standard error it produced would be meaningless.',
  'same:different':
    'These are the same units in both columns, measured twice. Treating them as two independent groups throws away the matching and builds a standard error out of the unit-to-unit variation that subtracting would have cancelled.',
  'form:interval': 'The question asks whether there is evidence of something, which is a decision at a level fixed in advance. That is a test.',
  'form:test': 'The question asks how large, which is a magnitude with its precision attached. That is an interval.',
}

interface Step {
  key: 'type' | 'groups' | 'same' | 'form'
  question: string
  options: { value: string; label: string }[]
}

function stepsFor(f: ProcedureQuestion): Step[] {
  const s = structureOf(f.procedure)
  const out: Step[] = [
    {
      key: 'type',
      question: 'What was recorded on each unit?',
      options: [
        { value: 'categorical', label: 'a category — it happened or it did not' },
        { value: 'quantitative', label: 'a number, on a scale' },
      ],
    },
    {
      key: 'groups',
      question: 'How many groups of units does the file hold?',
      options: [
        { value: 'one', label: 'one group' },
        { value: 'two', label: 'two groups, or two columns' },
      ],
    },
  ]
  if (s.type === 'quantitative' && s.groups === 'two') {
    out.push({
      key: 'same',
      question: 'Are the units in the two columns the same units?',
      options: [
        { value: 'same', label: 'the same units, measured twice' },
        { value: 'different', label: 'different units, matched by nothing' },
      ],
    })
  }
  out.push({
    key: 'form',
    question: 'What does the question ask for?',
    options: [
      { value: 'interval', label: 'how large — a magnitude' },
      { value: 'test', label: 'is there evidence — a decision' },
    ],
  })
  return out
}

function correctAnswer(f: ProcedureQuestion, key: Step['key']): string {
  const s = structureOf(f.procedure)
  if (key === 'type') return s.type
  if (key === 'groups') return s.groups
  if (key === 'same') return s.sameUnits ?? 'different'
  return f.form
}

export interface ProcedureSelectorProps {
  findings?: readonly ProcedureQuestion[]
  mode?: Mode
  label?: string
  tone?: PanelTone
}

export function ProcedureSelector({ findings = BRIEF_FINDINGS, mode: mode0 = 'tree', label = 'INTEL · PROCEDURE SELECTOR', tone = 'intel' }: ProcedureSelectorProps = {}) {
  const [mode, setMode] = useState<Mode>(mode0)

  /* ---- Tree ---- */
  const [treeIndex, setTreeIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [turnError, setTurnError] = useState<string | null>(null)
  const finding = findings[Math.min(treeIndex, findings.length - 1)]
  const steps = useMemo(() => stepsFor(finding), [finding])
  const answered = steps.filter((s) => answers[s.key] !== undefined)
  const complete = answered.length === steps.length

  const answerStep = (step: Step, value: string) => {
    const want = correctAnswer(finding, step.key)
    if (value !== want) {
      setTurnError(WRONG_TURN[`${step.key}:${value}`] ?? 'Not this one. Read the structure line again.')
      return
    }
    setTurnError(null)
    setAnswers((prev) => ({ ...prev, [step.key]: value }))
  }

  const resetTree = (index: number) => {
    setTreeIndex(index)
    setAnswers({})
    setTurnError(null)
  }

  /* ---- Brief ---- */
  const [briefIndex, setBriefIndex] = useState(0)
  const [pickProc, setPickProc] = useState<ProcedureId | null>(null)
  const [pickForm, setPickForm] = useState<Form | null>(null)
  const [graded, setGraded] = useState<{ proc: boolean; form: boolean } | null>(null)
  const [score, setScore] = useState({ right: 0, asked: 0 })
  const item = findings[Math.min(briefIndex, findings.length - 1)]

  const gradeBrief = () => {
    if (!pickProc || !pickForm) return
    const ok = { proc: pickProc === item.procedure, form: pickForm === item.form }
    setGraded(ok)
    setScore((s) => ({ right: s.right + (ok.proc && ok.form ? 1 : 0), asked: s.asked + 1 }))
  }

  const nextBrief = () => {
    setBriefIndex((i) => (i + 1) % findings.length)
    setPickProc(null)
    setPickForm(null)
    setGraded(null)
  }

  const status = mode === 'brief' ? `BRIEF · ${fmtInt(score.right)}/${fmtInt(score.asked)} CORRECT` : mode === 'tree' ? `TREE · ${fmtInt(answered.length)}/${fmtInt(steps.length)}` : 'REFERENCE'

  return (
    <Panel label={label} status={status} tone={tone} led={mode === 'brief' && graded?.proc === false ? 'warn' : 'on'} ariaLabel="Procedure selector: a graded decision tree for choosing an inference procedure">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'tree', label: 'walk the tree' },
              { value: 'brief', label: 'grade the brief' },
              { value: 'reference', label: 'reference matrix' },
            ]}
          />
        </div>

        {mode === 'tree' && (
          <>
            <div className="dr-controls">
              <Segmented<string> label="finding" value={finding.id} onChange={(v) => resetTree(findings.findIndex((f) => f.id === v))} options={findings.map((f, i) => ({ value: f.id, label: `${i + 1}` }))} />
            </div>
            <Note>{finding.question}</Note>
            <Note tone="muted">Structure: {finding.structure}</Note>

            <ol style={{ margin: 0, paddingLeft: 'var(--dr-sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-3)' }}>
              {steps.map((step, i) => {
                const done = answers[step.key] !== undefined
                if (i > answered.length) return null
                return (
                  <li key={step.key}>
                    <Subhead>{step.question}</Subhead>
                    {done ? (
                      <Readout label="answered" value={step.options.find((o) => o.value === answers[step.key])?.label ?? answers[step.key]} size="sm" />
                    ) : (
                      <div className="dr-controls" role="group" aria-label={step.question}>
                        {step.options.map((o) => (
                          <button key={o.value} type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => answerStep(step, o.value)}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            {turnError && (
              <Note tone="alert" live>
                {turnError}
              </Note>
            )}

            {complete && (
              <section aria-label="What the tree named">
                <ReadoutGrid>
                  <Readout label="procedure" value={PROCEDURE_LABEL[finding.procedure]} tone="intel" live />
                  <Readout label="form" value={finding.form === 'interval' ? 'interval' : 'test'} size="sm" live />
                  <Readout label="the call" value={STATS_CALL[finding.procedure][finding.form]} size="sm" live />
                </ReadoutGrid>
                <Note tone="ok" live>
                  {finding.because}
                </Note>
                <div className="dr-controls">
                  <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => resetTree((treeIndex + 1) % findings.length)}>
                    NEXT FINDING
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {mode === 'brief' && (
          <>
            <Subhead>
              Finding {fmtInt(briefIndex + 1)} of {fmtInt(findings.length)}
            </Subhead>
            <Note>{item.question}</Note>
            <Note tone="muted">Structure: {item.structure}</Note>

            <div className="dr-controls" role="group" aria-label="Choose a procedure">
              {PROCEDURES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="dr-btn dr-btn--ghost dr-btn--sm"
                  aria-pressed={pickProc === p.id}
                  style={pickProc === p.id ? { color: 'var(--dr-fg-0)', borderColor: 'var(--dr-violet)' } : undefined}
                  onClick={() => setPickProc(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="dr-controls" role="group" aria-label="Interval or test">
              {(['interval', 'test'] as Form[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className="dr-btn dr-btn--ghost dr-btn--sm"
                  aria-pressed={pickForm === f}
                  style={pickForm === f ? { color: 'var(--dr-fg-0)', borderColor: 'var(--dr-violet)' } : undefined}
                  onClick={() => setPickForm(f)}
                >
                  {f === 'interval' ? 'interval — how large' : 'test — is there evidence'}
                </button>
              ))}
            </div>
            <div className="dr-controls">
              <button type="button" className="dr-btn dr-btn--primary dr-btn--sm" onClick={gradeBrief} disabled={!pickProc || !pickForm}>
                GRADE THIS ONE
              </button>
              <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={nextBrief}>
                NEXT FINDING
              </button>
            </div>

            <ReadoutGrid>
              <Readout label="correct so far" value={`${fmtInt(score.right)} / ${fmtInt(score.asked)}`} tone="intel" size="sm" live />
            </ReadoutGrid>

            {graded && (
              <Note tone={graded.proc && graded.form ? 'ok' : 'alert'} live>
                {graded.proc && graded.form
                  ? `Correct: ${PROCEDURE_LABEL[item.procedure]}, as ${item.form === 'interval' ? 'an interval' : 'a test'}. ${item.because}`
                  : !graded.proc
                    ? `Not ${PROCEDURE_LABEL[pickProc as ProcedureId]}. ${
                        structureOf(item.procedure).type !== structureOf(pickProc as ProcedureId).type
                          ? WRONG_TURN[`type:${structureOf(pickProc as ProcedureId).type}`]
                          : structureOf(item.procedure).groups !== structureOf(pickProc as ProcedureId).groups
                            ? WRONG_TURN[`groups:${structureOf(pickProc as ProcedureId).groups}`]
                            : WRONG_TURN[`same:${structureOf(pickProc as ProcedureId).sameUnits ?? 'different'}`]
                      } The procedure is ${PROCEDURE_LABEL[item.procedure]}.`
                    : `${PROCEDURE_LABEL[item.procedure]} is right and the form is not. ${WRONG_TURN[`form:${pickForm as Form}`]}`}
              </Note>
            )}
          </>
        )}

        {mode === 'reference' && (
          <section aria-label="Reference matrix">
            <Subhead>Question type × data structure → procedure</Subhead>
            <KeyTable
              caption="Read the first two columns off the design, before any number is looked at"
              ariaLabel="Reference matrix of question type, data structure, procedure and the library call"
              columns={['what was recorded', 'how the units are grouped', 'procedure', 'interval call', 'test call']}
              rows={[
                ['a category (yes / no)', 'one group', PROCEDURE_LABEL['one-prop'], STATS_CALL['one-prop'].interval, STATS_CALL['one-prop'].test],
                ['a category (yes / no)', 'two independent groups', PROCEDURE_LABEL['two-prop'], STATS_CALL['two-prop'].interval, STATS_CALL['two-prop'].test],
                ['a number', 'one group, read against a fixed figure', PROCEDURE_LABEL['one-mean'], STATS_CALL['one-mean'].interval, STATS_CALL['one-mean'].test],
                ['a number, twice', 'the same units in both columns', PROCEDURE_LABEL.paired, STATS_CALL.paired.interval, STATS_CALL.paired.test],
                ['a number', 'two groups of different units', PROCEDURE_LABEL['two-mean'], STATS_CALL['two-mean'].interval, STATS_CALL['two-mean'].test],
              ]}
            />
            <Note>
              The last column of the design decides interval against test and nothing else does. Every other choice on this table is settled by how the data were collected, which is why the
              procedure can be named before a single value is read.
            </Note>
            <Note tone="warn">
              Two columns on a screen are two columns. They are two samples only when a unit in the first has no partner in the second, and one sample of differences when it does.
            </Note>
          </section>
        )}
      </div>
    </Panel>
  )
}
