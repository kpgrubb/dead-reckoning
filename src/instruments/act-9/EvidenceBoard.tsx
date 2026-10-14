/**
 * INTEL · THE EVIDENCE BOARD (act-9-04) — the whole case, finding by finding.
 *
 * Two instruments on one key (`./case-file.ts`, transcribed from the beat sheet):
 *
 *   ProcedurePicker   one finding at a time. Read it, name the procedure that produced it, and be
 *                     told at once whether that is what the file says — and, either way, the limit
 *                     the board requires beside it. A running "k of 14 placed" sits in the header.
 *   EvidenceBoard     all fourteen at once, each row a procedure and a limitation category to
 *                     choose. GRADE THE BOARD scores it and names the two weakest links.
 *
 * The limitation column is the part a learner skips and a hostile reviewer reads first. Two of the
 * fourteen are load-bearing: the two-proportion test's Large Counts check passed at 10.7, which is
 * above five and not by much, and the nineteen are the losses rather than a random sample of
 * anything, so every comparison built on them describes those nineteen departures and no others.
 *
 * Nothing is computed here; the case file is a key. The counts come from `fmtInt`.
 */
import { useMemo, useState, type CSSProperties } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Readout } from '@/instruments/shared'
import { fmtInt, fmtPct } from '@/lib/stats'
import { ALL_PROCEDURES, CASE_FILE, LIMITATION_KEY, LIMITATION_LABEL, LIMITATIONS, PROCEDURE_LABEL, type Finding, type Limitation, type Procedure } from './case-file'
import { Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

// ────────────────────────────────────────────────────────────────────────────────────────────────
// The limitation column — the key lives in `./case-file` so the act-9-04 drills share it.
// ────────────────────────────────────────────────────────────────────────────────────────────────

export { LIMITATION_KEY, LIMITATION_LABEL, type Limitation }

/** Rows whose beat-sheet cell names a second procedure: the board accepts either. */
const ALSO_ACCEPTED: Record<string, readonly Procedure[]> = {
  'survey-bias-escort-trial': ['randomization-test'],
  'loss-by-beneficiary': ['chi-square-homogeneity'],
}

function procedureOk(f: Finding, chosen: Procedure | ''): boolean {
  if (chosen === '') return false
  return chosen === f.procedure || (ALSO_ACCEPTED[f.id]?.includes(chosen) ?? false)
}

function limitationOk(f: Finding, chosen: Limitation | ''): boolean {
  return chosen !== '' && chosen === LIMITATION_KEY[f.id]
}

/** The two the drills call the weakest links, by id. */
const WEAKEST_LINKS = ['perrine-loss-rate', 'lost-vs-surviving-perrine'] as const

const selectStyle: CSSProperties = {
  font: 'inherit',
  fontFamily: 'var(--dr-font-mono)',
  fontSize: 'var(--dr-fs-2xs)',
  color: 'var(--dr-fg-1)',
  background: 'var(--dr-bg-1)',
  border: '1px solid var(--dr-line)',
  borderRadius: 'var(--dr-radius-sm, var(--dr-radius))',
  padding: 'var(--dr-sp-1) var(--dr-sp-2)',
  maxWidth: '22ch',
}

const moduleList = (f: Finding) => f.modules.join(', ')

// ────────────────────────────────────────────────────────────────────────────────────────────────
// ProcedurePicker
// ────────────────────────────────────────────────────────────────────────────────────────────────

export interface ProcedurePickerProps {
  label?: string
  tone?: PanelTone
}

export function ProcedurePicker({ label = 'INTEL · PROCEDURE PICKER', tone = 'intel' }: ProcedurePickerProps = {}) {
  const [index, setIndex] = useState(0)
  const [pick, setPick] = useState<Procedure | ''>('')
  const [placed, setPlaced] = useState<Record<string, boolean>>({})

  const finding = CASE_FILE[Math.min(index, CASE_FILE.length - 1)]
  const correct = pick !== '' && procedureOk(finding, pick)
  const placedCount = Object.values(placed).filter(Boolean).length

  const go = (delta: number) => {
    setIndex((i) => (i + delta + CASE_FILE.length) % CASE_FILE.length)
    setPick('')
  }

  const choose = (p: Procedure) => {
    setPick(p)
    if (procedureOk(finding, p)) setPlaced((prev) => ({ ...prev, [finding.id]: true }))
  }

  return (
    <Panel
      label={label}
      status={`${fmtInt(placedCount)} OF ${fmtInt(CASE_FILE.length)} PLACED`}
      tone={tone}
      led={pick === '' ? 'off' : correct ? 'on' : 'warn'}
      ariaLabel="Procedure picker: name the procedure behind each finding in the case file"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => go(-1)}>
            PREVIOUS FINDING
          </button>
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => go(1)}>
            NEXT FINDING
          </button>
        </div>

        <Subhead>
          Finding {fmtInt(index + 1)} of {fmtInt(CASE_FILE.length)} · modules {moduleList(finding)}
        </Subhead>
        <Note>{finding.finding}</Note>

        <div className="dr-controls" role="group" aria-label="Choose the procedure behind this finding">
          {ALL_PROCEDURES.map((p, i) => (
            <button
              key={i}
              type="button"
              className="dr-btn dr-btn--ghost dr-btn--sm"
              aria-pressed={pick === p}
              style={pick === p ? { color: 'var(--dr-fg-0)', borderColor: 'var(--dr-violet)' } : undefined}
              onClick={() => choose(p)}
            >
              {PROCEDURE_LABEL[p]}
            </button>
          ))}
        </div>

        <ReadoutGrid>
          <Readout label="findings placed" value={`${fmtInt(placedCount)} of ${fmtInt(CASE_FILE.length)}`} tone="intel" live />
          <Readout label="this one" value={pick === '' ? '—' : correct ? 'correct' : 'not this one'} tone={pick === '' ? 'default' : correct ? 'intel' : 'alert'} size="sm" live />
        </ReadoutGrid>

        {pick !== '' && (
          <>
            <Note tone={correct ? 'ok' : 'alert'} live>
              {correct
                ? `${PROCEDURE_LABEL[finding.procedure]}. It carries: ${finding.conclusion}.`
                : `Not ${PROCEDURE_LABEL[pick]}. The file says ${PROCEDURE_LABEL[finding.procedure]}, and what it carries is: ${finding.conclusion}.`}
            </Note>
            <Note tone="warn" live>
              The limit the board requires beside it: {finding.limit}. A finding placed without its limit is a claim the data cannot carry.
            </Note>
          </>
        )}
      </div>
    </Panel>
  )
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
// EvidenceBoard
// ────────────────────────────────────────────────────────────────────────────────────────────────

interface Graded {
  procedures: number
  limitations: number
  both: number
}

export interface EvidenceBoardProps {
  label?: string
  tone?: PanelTone
}

export function EvidenceBoard({ label = 'INTEL · THE EVIDENCE BOARD', tone = 'intel' }: EvidenceBoardProps = {}) {
  const [procedures, setProcedures] = useState<Record<string, Procedure | ''>>({})
  const [limits, setLimits] = useState<Record<string, Limitation | ''>>({})
  const [graded, setGraded] = useState<Graded | null>(null)

  const rows = useMemo(
    () =>
      CASE_FILE.map((f) => ({
        finding: f,
        procedure: procedures[f.id] ?? '',
        limitation: limits[f.id] ?? '',
        procedureOk: procedureOk(f, procedures[f.id] ?? ''),
        limitationOk: limitationOk(f, limits[f.id] ?? ''),
      })),
    [procedures, limits],
  )

  const filled = rows.filter((r) => r.procedure !== '' && r.limitation !== '').length
  /** Any single selection counts as touched: CLEAR must work before a row is complete. */
  const touched = rows.some((r) => r.procedure !== '' || r.limitation !== '')

  const grade = () => {
    setGraded({
      procedures: rows.filter((r) => r.procedureOk).length,
      limitations: rows.filter((r) => r.limitationOk).length,
      both: rows.filter((r) => r.procedureOk && r.limitationOk).length,
    })
  }

  const clear = () => {
    setProcedures({})
    setLimits({})
    setGraded(null)
  }

  const weakest = CASE_FILE.filter((f) => (WEAKEST_LINKS as readonly string[]).includes(f.id))

  return (
    <Panel
      label={label}
      status={graded ? `${fmtInt(graded.both)} OF ${fmtInt(CASE_FILE.length)} PLACED` : `${fmtInt(filled)} OF ${fmtInt(CASE_FILE.length)} FILLED`}
      tone={tone}
      led={graded ? (graded.both === CASE_FILE.length ? 'on' : 'warn') : 'off'}
      ariaLabel="Evidence board: the whole case with a procedure and a limitation to place against each finding"
    >
      <div style={stackStyle}>
        <Note>
          Fourteen findings, from the two piles in the Callisto dotplot to the slope that closes the case. Each needs the procedure that produced it and the category of limit the board
          requires beside it. Then grade it.
        </Note>

        <div style={{ overflowX: 'auto', border: '1px solid var(--dr-line)', borderRadius: 'var(--dr-radius)' }}>
          <table className="dr-table" aria-label="The case file: a procedure and a limitation for each of the fourteen findings">
            <caption className="dr-table__caption">The case, assembled and bounded</caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">finding</th>
                <th scope="col">modules</th>
                <th scope="col">procedure</th>
                <th scope="col">the conclusion it carries</th>
                <th scope="col">limitation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const hitP = graded ? r.procedureOk : null
                const hitL = graded ? r.limitationOk : null
                const cell = (ok: boolean | null): CSSProperties => ({
                  color: ok === null ? undefined : ok ? 'var(--dr-phosphor)' : 'var(--dr-alert)',
                  whiteSpace: 'nowrap',
                })
                return (
                  <tr key={i}>
                    <td style={{ color: 'var(--dr-fg-2)' }}>{fmtInt(i + 1)}</td>
                    <th scope="row" style={{ textAlign: 'left', fontWeight: 500 }}>
                      {r.finding.finding}
                    </th>
                    <td style={{ color: 'var(--dr-fg-2)', whiteSpace: 'nowrap' }}>{moduleList(r.finding)}</td>
                    <td style={cell(hitP)}>
                      <select
                        style={selectStyle}
                        aria-label={`procedure for ${r.finding.finding}`}
                        value={r.procedure}
                        onChange={(e) => {
                          setProcedures((prev) => ({ ...prev, [r.finding.id]: e.target.value as Procedure | '' }))
                          setGraded(null)
                        }}
                      >
                        <option value="">— choose —</option>
                        {ALL_PROCEDURES.map((p, j) => (
                          <option key={j} value={p}>
                            {PROCEDURE_LABEL[p]}
                          </option>
                        ))}
                      </select>
                      {hitP === false && <div style={{ fontSize: 'var(--dr-fs-2xs)' }}>{PROCEDURE_LABEL[r.finding.procedure]}</div>}
                    </td>
                    <td style={{ whiteSpace: 'normal', minWidth: '18ch' }}>{r.finding.conclusion}</td>
                    <td style={cell(hitL)}>
                      <select
                        style={selectStyle}
                        aria-label={`limitation for ${r.finding.finding}`}
                        value={r.limitation}
                        onChange={(e) => {
                          setLimits((prev) => ({ ...prev, [r.finding.id]: e.target.value as Limitation | '' }))
                          setGraded(null)
                        }}
                      >
                        <option value="">— choose —</option>
                        {LIMITATIONS.map((l, j) => (
                          <option key={j} value={l}>
                            {LIMITATION_LABEL[l]}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: 'var(--dr-fs-2xs)', color: 'var(--dr-fg-2)', whiteSpace: 'normal' }}>{r.finding.limit}</div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="dr-controls">
          <button type="button" className="dr-btn dr-btn--primary dr-btn--sm" onClick={grade}>
            GRADE THE BOARD
          </button>
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={clear} disabled={!touched && graded === null}>
            CLEAR THE BOARD
          </button>
        </div>

        <ReadoutGrid>
          <Readout
            label="findings placed"
            value={`${fmtInt(graded ? graded.both : 0)} of ${fmtInt(CASE_FILE.length)}`}
            tone={graded && graded.both === CASE_FILE.length ? 'intel' : 'default'}
            live
          />
          <Readout label="procedures right" value={`${fmtInt(graded ? graded.procedures : 0)} of ${fmtInt(CASE_FILE.length)}`} size="sm" live />
          <Readout label="limitations right" value={`${fmtInt(graded ? graded.limitations : 0)} of ${fmtInt(CASE_FILE.length)}`} size="sm" live />
          <Readout label="score" value={graded ? fmtPct(graded.both / CASE_FILE.length, 0) : '—'} size="sm" live />
        </ReadoutGrid>

        {graded && (
          <Note tone={graded.both === CASE_FILE.length ? 'ok' : 'alert'} live>
            {graded.both === CASE_FILE.length
              ? `All ${fmtInt(CASE_FILE.length)} placed with their limits. That is the brief.`
              : `${fmtInt(graded.both)} of ${fmtInt(CASE_FILE.length)} placed. ${fmtInt(CASE_FILE.length - graded.procedures)} procedure(s) and ${fmtInt(CASE_FILE.length - graded.limitations)} limitation(s) are still wrong; the correct procedure is printed under each miss, and each row's own limit is printed under its limitation cell.`}
          </Note>
        )}

        {graded && (
          <section aria-label="The two weakest links">
            <Subhead>Where a hostile review will start</Subhead>
            <ul style={{ margin: 0, paddingLeft: 'var(--dr-sp-5)', fontSize: 'var(--dr-fs-xs)', color: 'var(--dr-fg-2)' }}>
              {weakest.map((f, i) => (
                <li key={i}>
                  <strong style={{ color: 'var(--dr-amber)' }}>{f.finding}</strong> — {f.limit}
                </li>
              ))}
            </ul>
            <Note tone="warn">
              Two of the fourteen carry the case&rsquo;s weight and the least slack. The Large Counts check on the two-proportion test passed at 10.7 — above five, and not by much, so a
              reviewer who disputes one classification disputes the test. And the nineteen are the losses, not a random sample of departures: everything built on them describes those
              nineteen and generalises to nothing. Neither is a reason to withdraw a finding. Both are reasons to write the limit beside it before someone else does.
            </Note>
          </section>
        )}

        <Note>
          What the case proves: a pattern, an owner, a false ledger, a prepared fleet, a stockpile at Kettle, premeditation at the Compact end. What it does not prove: who gave the order, or
          why. Fourteen p-values are not one p-value, and no arithmetic on this board turns a body of evidence into a single probability.
        </Note>
      </div>
    </Panel>
  )
}
