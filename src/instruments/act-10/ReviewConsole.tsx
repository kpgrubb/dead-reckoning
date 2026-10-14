/**
 * INTEL · HOSTILE REVIEW (act-10-01) — the case's six findings, and what a reviewer's choice of
 * level does to them.
 *
 * The learner drags one control: the level a reviewer applies to the whole file. Six findings
 * change verdict at six different points, and three things come out of watching them do it.
 *
 *   1. A level is not a dial you turn after the data. The panel holds the level this ship *set*,
 *      before it read the register, on a separate line that the slider cannot move. Everything the
 *      slider does is a hypothetical about a review that was never run.
 *   2. A stricter level is bought, not found. The power readout is the price: the same test, the
 *      same pre-specified alternative, less reach.
 *   3. One finding never survives at any level, because its conditions do not hold. A level cannot
 *      repair a procedure that does not apply.
 *
 * Every number is imported: the tests are act-6's, act-7's and act-8's, and the power comes from
 * `powerAgainst` in act-6's data. Nothing is recomputed here and nothing is random.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Readout, Segmented, Slider } from '@/instruments/shared'
import { fmt, fmtInt, fmtP } from '@/lib/stats'
import {
  ALTERNATIVE_DOUBLING,
  EXAMINER,
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_LOSSES,
  PERRINE_TRANSITS,
  PRESPECIFIED_ALPHA,
  REVIEW_LEVELS,
  SMALLEST_EXPECTED_COUNT,
  findings,
  powerAgainst,
  survivesAt,
} from './data'
import { ConditionList, KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export interface ReviewConsoleProps {
  /** The level this ship set before it read the register. Defaults to the strict one. */
  prespecified?: number
  /** Which level the reviewer's slider opens on. Defaults to the pre-specified one. */
  alpha?: number
  /** Which finding is in the chair on load. */
  finding?: string
  label?: string
  tone?: PanelTone
}

const pFormat = (p: number, bound: boolean): string => (bound ? `< ${fmtP(p)}` : fmtP(p))

export function ReviewConsole({
  prespecified = PRESPECIFIED_ALPHA,
  alpha: alphaInitial,
  finding: findingInitial = findings[0].id,
  label = 'INTEL · HOSTILE REVIEW',
  tone = 'intel',
}: ReviewConsoleProps = {}) {
  const openAt = Math.max(
    0,
    REVIEW_LEVELS.findIndex((l) => l === (alphaInitial ?? prespecified)),
  )
  const [levelIndex, setLevelIndex] = useState(openAt)
  const [selected, setSelected] = useState(findingInitial)

  const alpha = REVIEW_LEVELS[levelIndex]
  const chosen = findings.find((f) => f.id === selected) ?? findings[0]

  const survivors = findings.filter((f) => survivesAt(f, alpha))
  const atPrespecified = findings.filter((f) => survivesAt(f, prespecified))
  const lostByMoving = atPrespecified.filter((f) => !survivesAt(f, alpha))
  const gainedByMoving = survivors.filter((f) => !survivesAt(f, prespecified))
  const neverSurvives = findings.filter((f) => !f.conditionsHold)

  const powerNow = useMemo(() => powerAgainst(ALTERNATIVE_DOUBLING, alpha), [alpha])
  const powerSet = useMemo(() => powerAgainst(ALTERNATIVE_DOUBLING, prespecified), [prespecified])

  const rows = findings.map((f) => {
    const ok = survivesAt(f, alpha)
    return [
      fmtInt(f.exhibit),
      f.title,
      f.procedure,
      f.conditionsHold ? `${f.statisticSymbol} = ${fmt(f.statistic, 2)}${f.df === null ? '' : `, df ${fmtInt(f.df)}`}` : 'not applicable',
      pFormat(f.pValue, f.pIsBound),
      f.conditionsHold ? (ok ? 'survives' : 'does not survive') : 'conditions fail',
    ]
  })

  const moved = alpha !== prespecified

  return (
    <Panel
      label={label}
      tone={tone}
      led={neverSurvives.length > 0 ? 'warn' : 'on'}
      status={`REVIEW α = ${fmt(alpha, 4)} · ${fmtInt(survivors.length)} OF ${fmtInt(findings.length)} STAND`}
      ariaLabel="Hostile review console: which findings survive at a reviewer's chosen significance level"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider
            label="the level a reviewer applies to the file"
            value={levelIndex}
            min={0}
            max={REVIEW_LEVELS.length - 1}
            step={1}
            onChange={setLevelIndex}
            format={(v) => fmt(REVIEW_LEVELS[Math.round(v)], 4)}
          />
          <Segmented
            label="finding in the chair"
            value={selected}
            options={findings.map((f) => ({ value: f.id, label: `${f.exhibit}` }))}
            onChange={setSelected}
          />
        </div>

        <ReadoutGrid>
          <Readout label="reviewer's level" value={fmt(alpha, 4)} tone="intel" live />
          <Readout label="level set before the data, MET 140" value={fmt(prespecified, 2)} tone="alert" />
          <Readout label="findings that stand" value={`${fmtInt(survivors.length)} of ${fmtInt(findings.length)}`} tone={survivors.length < atPrespecified.length ? 'alert' : 'intel'} live />
          <Readout label="power of exhibit 14 at the reviewer's level" value={fmt(powerNow.power, 3)} size="sm" live />
          <Readout label="power at the level actually set" value={fmt(powerSet.power, 3)} size="sm" />
        </ReadoutGrid>

        <KeyTable
          ariaLabel="Every finding in the file, with its procedure, statistic, p-value and verdict at the reviewer's level"
          caption={`The file as the Inspectorate holds it, judged at α = ${fmt(alpha, 4)}`}
          columns={['exhibit', 'finding', 'procedure', 'statistic', 'P', `verdict at ${fmt(alpha, 4)}`]}
          rows={rows}
          emphasisRow={findings.findIndex((f) => f.id === chosen.id)}
        />

        <Note tone={moved ? 'warn' : 'muted'} live>
          {moved ? (
            <>
              This ship set α = {fmt(prespecified, 2)} on the night of MET 140 and wrote the reason beside it, and that is the level the test was run at. Moving the slider asks a different
              question: what a reviewer would have found had the level been {fmt(alpha, 4)} all along.{' '}
              {lostByMoving.length > 0 ? `At that level ${fmtInt(lostByMoving.length)} of the findings that stood no longer stand: ${lostByMoving.map((f) => `exhibit ${f.exhibit}`).join(', ')}. ` : ''}
              {gainedByMoving.length > 0 ? `${fmtInt(gainedByMoving.length)} that did not stand now do: ${gainedByMoving.map((f) => `exhibit ${f.exhibit}`).join(', ')}. ` : ''}
              A level chosen once the P-values are on the table is not a false-alarm rate. It is a preference, and it has to be labelled as one.
            </>
          ) : (
            <>
              The slider is where the file is: α = {fmt(prespecified, 2)}, set on the night of MET 140, before the claims register was opened. Move it and watch which findings change verdict.
              That exercise is worth doing and it is not a review. The rate a level buys you is the rate you ran it at.
            </>
          )}
        </Note>

        <Note tone={powerNow.power < powerSet.power ? 'alert' : 'muted'} live>
          Exhibit 14 tests {fmtInt(PERRINE_LOSSES)} of {fmtInt(PERRINE_TRANSITS)} against {fmtInt(OTHER_LOSSES)} of {fmtInt(OTHER_TRANSITS)}. Against the difference this ship named before it
          looked — {fmt(ALTERNATIVE_DOUBLING.p1, 3)} against {fmt(ALTERNATIVE_DOUBLING.p2, 3)} — it has power {fmt(powerNow.power, 3)} at the reviewer's level and {fmt(powerSet.power, 3)} at
          the level set. Every point between those two numbers is a real difference this Lane would have failed to report.
        </Note>

        <section aria-label="The finding in the chair">
          <Subhead>
            Exhibit {fmtInt(chosen.exhibit)} · {chosen.title}
          </Subhead>
          <ReadoutGrid>
            <Readout label="procedure" value={chosen.procedure} size="sm" />
            <Readout label={chosen.statisticSymbol} value={chosen.conditionsHold ? fmt(chosen.statistic, 2) : '—'} size="sm" />
            <Readout label="df" value={chosen.df === null ? '—' : fmtInt(chosen.df)} size="sm" />
            <Readout label="P" value={pFormat(chosen.pValue, chosen.pIsBound)} size="sm" />
            <Readout label={`verdict at ${fmt(alpha, 4)}`} value={chosen.conditionsHold ? (survivesAt(chosen, alpha) ? 'stands' : 'falls') : 'conditions fail'} tone={survivesAt(chosen, alpha) ? 'intel' : 'alert'} live />
          </ReadoutGrid>
          <Note>
            <strong>What it is about.</strong> {chosen.scope}. <em>{chosen.provenance}.</em>
          </Note>
          <Note tone="warn">
            <strong>What a reviewer presses on.</strong> {chosen.limitation}
          </Note>
          <Subhead>Conditions, as the procedure reported them</Subhead>
          <ConditionList conditions={chosen.conditions} />
        </section>

        <Note tone="alert">
          Exhibit {fmtInt(findings[findings.length - 1].exhibit)} does not survive at any level on this slider, and no level would repair it: the smallest expected count in that table is{' '}
          {fmt(EXAMINER.smallestExpected, 2)}, so the chi-square distribution is not the sampling distribution of that statistic and the P-value beside it would be arithmetic about the wrong
          curve. What stands in its place is {fmtInt(EXAMINER.reps)} relabellings of the same {fmtInt(EXAMINER.divertedTotal)} diverted departures, none of which reached the observed gap. By
          contrast exhibit 14's own large-counts check passes on {fmt(SMALLEST_EXPECTED_COUNT, 1)} expected losses. That is above ten, and it is above it by less than one transit.
        </Note>
      </div>
    </Panel>
  )
}
