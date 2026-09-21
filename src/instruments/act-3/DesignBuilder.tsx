/**
 * DesignBuilder (act-3-04) — "The Admiralty's trial."
 *
 * The Board's 2183 escort trial as a roster of 26 transits the learner can re-assign. Each row is a
 * button: Space or Enter moves that hull between ESCORT and NO ESCORT, ↑/↓ walk the roster. Three
 * presets do the teaching:
 *
 *   THE BOARD'S ASSIGNMENT          escort went to two announced Mercantile convoys — owner is a
 *                                   perfect stand-in for treatment, so the indicator pins at 1.00
 *                                   and the control group is a different month's independents.
 *   RANDOMIZE (COMPLETELY RANDOMIZED)  chance balances owner, drive and departure day *on average*.
 *   RANDOMIZE WITHIN OWNER (BLOCKED)   owner balance is exact by construction — the indicator is 0.00.
 *
 * The confounding indicator is `ownerImbalance` (the gap in Mercantile share between the groups);
 * the response comparison is `groupMeans` on off-nominal advisories. Drive and departure day are
 * shown as the secondary lurking variables, because randomising fixes those too and blocking on
 * owner alone does not guarantee it.
 *
 * Randomness only through `rng('act-3-04', runIndex)`.
 */
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Panel } from '@/components'
import { BarChart, Readout, ReadoutRow, semanticColor, chartTheme } from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtPct } from '@/lib/stats'
import { BOARD_ASSIGNMENT, BOARD_TRIAL, blockedAssignment, groupMeans, ownerImbalance, randomAssignment, type TrialTransit } from './data'
import './act3.css'

type Preset = 'board' | 'random' | 'blocked' | 'hand'
const PRESET_LABEL: Record<Preset, string> = {
  board: 'the Board’s assignment',
  random: 'completely randomized',
  blocked: 'randomized block by owner class',
  hand: 'assigned by hand',
}

const share = <T,>(xs: readonly T[], pred: (t: T) => boolean): number => (xs.length ? xs.filter(pred).length / xs.length : NaN)
const avg = (xs: readonly number[]): number => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : NaN)

/** Half the escorted group, rounded — the k a completely randomized design uses on 26 transits. */
const HALF = Math.floor(BOARD_TRIAL.length / 2)

export interface DesignBuilderProps {
  /** The transits on the roster. Defaults to the Board's 2183 trial (DS-04a). */
  transits?: readonly TrialTransit[]
}

export function DesignBuilder({ transits = BOARD_TRIAL }: DesignBuilderProps = {}) {
  const [assignment, setAssignment] = useState<boolean[]>(() => transits.map((_, i) => BOARD_ASSIGNMENT[i] ?? false))
  const [preset, setPreset] = useState<Preset>('board')
  const [runIndex, setRunIndex] = useState(0)
  const bodyRef = useRef<HTMLTableSectionElement | null>(null)

  const toggle = useCallback((i: number) => {
    setPreset('hand')
    setAssignment((prev) => prev.map((v, j) => (j === i ? !v : v)))
  }, [])

  const restoreBoard = useCallback(() => {
    setAssignment(transits.map((_, i) => BOARD_ASSIGNMENT[i] ?? false))
    setPreset('board')
  }, [transits])

  const randomize = useCallback(() => {
    const next = runIndex + 1
    setRunIndex(next)
    setAssignment(randomAssignment(rng('act-3-04', next), HALF, transits))
    setPreset('random')
  }, [runIndex, transits])

  const block = useCallback(() => {
    const next = runIndex + 1
    setRunIndex(next)
    setAssignment(blockedAssignment(rng('act-3-04', next), transits))
    setPreset('blocked')
  }, [runIndex, transits])

  const onRosterKey = (e: KeyboardEvent<HTMLTableSectionElement>) => {
    const el = e.target as HTMLElement
    if (el.dataset.row === undefined) return
    const i = Number(el.dataset.row)
    let next = i
    if (e.key === 'ArrowDown') next = Math.min(transits.length - 1, i + 1)
    else if (e.key === 'ArrowUp') next = Math.max(0, i - 1)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = transits.length - 1
    else return
    e.preventDefault()
    bodyRef.current?.querySelector<HTMLButtonElement>(`button[data-row="${next}"]`)?.focus()
  }

  const escorted = useMemo(() => transits.filter((_, i) => assignment[i]), [transits, assignment])
  const unescorted = useMemo(() => transits.filter((_, i) => !assignment[i]), [transits, assignment])
  const imbalance = useMemo(() => ownerImbalance(assignment, transits), [assignment, transits])
  const means = useMemo(() => groupMeans(assignment, transits), [assignment, transits])

  const mercE = share(escorted, (t) => t.owner === 'Mercantile')
  const mercU = share(unescorted, (t) => t.owner === 'Mercantile')
  const driveE = share(escorted, (t) => t.drive === 'Tessera-C')
  const driveU = share(unescorted, (t) => t.drive === 'Tessera-C')
  const convoyE = share(escorted, (t) => t.convoy !== null)
  const convoyU = share(unescorted, (t) => t.convoy !== null)
  const dayE = avg(escorted.map((t) => t.departureDay))
  const dayU = avg(unescorted.map((t) => t.departureDay))

  const confounded = imbalance >= 0.5
  const meterColor = confounded ? semanticColor('rejected') : imbalance > 0.15 ? semanticColor('observed') : chartTheme.color.fit

  const balanceCats = ['Mercantile share', 'Tessera-C drive share', 'sailed in a convoy']
  const balanceEsc = [mercE, driveE, convoyE]
  const balanceUn = [mercU, driveU, convoyU]
  const balanceDesc = `Balance between the two groups on three lurking variables. Escorted group: Mercantile ${fmtPct(mercE, 0)}, Tessera-C ${fmtPct(driveE, 0)}, in convoy ${fmtPct(convoyE, 0)}. Unescorted group: Mercantile ${fmtPct(mercU, 0)}, Tessera-C ${fmtPct(driveU, 0)}, in convoy ${fmtPct(convoyU, 0)}. Confounding indicator ${fmt(imbalance, 2)}.`

  return (
    <Panel label="TACTICAL · DESIGN BUILDER" status={PRESET_LABEL[preset].toUpperCase()} tone="tactical" led={confounded ? 'alert' : 'on'}>
      <div className="dr-act3__buttons">
        <button type="button" className="dr-btn" onClick={restoreBoard}>
          THE BOARD&rsquo;S ASSIGNMENT
        </button>
        <button type="button" className="dr-btn dr-btn--primary" onClick={randomize}>
          RANDOMIZE (COMPLETELY RANDOMIZED)
        </button>
        <button type="button" className="dr-btn dr-btn--primary" onClick={block}>
          RANDOMIZE WITHIN OWNER (BLOCKED)
        </button>
      </div>

      <div className="dr-act3__meter">
        <p className="dr-act3__meter-head">
          <span>confounding indicator · owner vs escort</span>
          <span>{fmt(imbalance, 2)}</span>
        </p>
        <div className="dr-act3__meter-track" aria-hidden="true">
          <div className="dr-act3__meter-fill" style={{ width: `${Math.max(0, Math.min(1, imbalance)) * 100}%`, background: meterColor }} />
        </div>
        <p className="dr-act3__meter-scale" aria-hidden="true">
          <span>0.00 · balanced</span>
          <span>1.00 · perfectly confounded</span>
        </p>
      </div>

      <ReadoutRow>
        <Readout label="confounding indicator" value={fmt(imbalance, 2)} tone={confounded ? 'alert' : 'tactical'} live />
        <Readout label="Mercantile share · ESCORT" value={fmtPct(mercE, 0)} units={`${fmtInt(escorted.filter((t) => t.owner === 'Mercantile').length)}/${fmtInt(escorted.length)}`} live />
        <Readout label="Mercantile share · NO ESCORT" value={fmtPct(mercU, 0)} units={`${fmtInt(unescorted.filter((t) => t.owner === 'Mercantile').length)}/${fmtInt(unescorted.length)}`} live />
        <Readout label="group sizes" value={`${fmtInt(escorted.length)} / ${fmtInt(unescorted.length)}`} size="sm" live />
      </ReadoutRow>
      <ReadoutRow>
        <Readout label="mean advisories · ESCORT" value={fmt(means.escorted, 2)} tone="tactical" live />
        <Readout label="mean advisories · NO ESCORT" value={fmt(means.unescorted, 2)} tone="tactical" live />
        <Readout label="difference · escort − none" value={fmt(means.difference, 2)} live />
        <Readout label="mean departure day · ESCORT / NONE" value={`${fmt(dayE, 1)} / ${fmt(dayU, 1)}`} size="sm" tone={Math.abs(dayE - dayU) > 5 ? 'alert' : 'default'} live />
        <Readout label="Tessera-C share · ESCORT / NONE" value={`${fmtPct(driveE, 0)} / ${fmtPct(driveU, 0)}`} size="sm" live />
      </ReadoutRow>

      <BarChart categories={balanceCats} values={balanceEsc} expected={balanceUn} horizontal label="lurking variable" valueLabel="share of the group" height={190} ariaLabel="Group balance on three lurking variables: bars are the escorted group's share, markers the unescorted group's" description={balanceDesc} />

      <div className="dr-act3__roster-wrap">
        <table className="dr-act3__roster" aria-label={`Escort trial roster, ${transits.length} transits with their current group`}>
          <caption>
            {transits.length} transits · {PRESET_LABEL[preset]} · Space or Enter moves a hull, ↑ ↓ walk the roster
          </caption>
          <thead>
            <tr>
              <th scope="col">hull</th>
              <th scope="col">owner</th>
              <th scope="col">drive</th>
              <th scope="col">convoy</th>
              <th scope="col">day</th>
              <th scope="col">advisories</th>
              <th scope="col">group</th>
            </tr>
          </thead>
          <tbody ref={bodyRef} onKeyDown={onRosterKey}>
            {transits.map((t, i) => {
              const esc = assignment[i]
              return (
                <tr key={t.id}>
                  <th scope="row">{t.hull}</th>
                  <td>{t.owner}</td>
                  <td>{t.drive}</td>
                  <td>{t.convoy ?? '—'}</td>
                  <td>{t.departureDay}</td>
                  <td>{t.advisories}</td>
                  <td>
                    <button type="button" className={['dr-act3__group-btn', esc ? 'is-escort' : 'is-none'].join(' ')} data-row={i} aria-label={`${t.hull}: ${esc ? 'ESCORT' : 'NO ESCORT'}. Activate to move it to the other group.`} onClick={() => toggle(i)}>
                      {esc ? 'ESCORT' : 'NO ESCORT'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="dr-act3__note">
        <strong>{PRESET_LABEL[preset]}.</strong>{' '}
        {preset === 'board'
          ? `Escort went to two announced Mercantile convoys; every unescorted transit is an independent, most of them sailing in a different part of the month. Owner is a perfect stand-in for escort — indicator ${fmt(imbalance, 2)} — so the ${fmt(Math.abs(means.difference), 2)} advisory gap belongs to owner, route and drive as much as to the cutter.`
          : preset === 'blocked'
            ? `Half of each owner class is escorted by lot, so owner balance is exact by construction — indicator ${fmt(imbalance, 2)}. Blocking removes the variable you named; the lot still has to handle drive and departure day.`
            : preset === 'random'
              ? `Chance, not request, decides who gets the cutter. Press again: the indicator wanders near zero instead of sitting at one, and so do drive and departure day.`
              : `Move hulls by hand and watch the indicator. Sorting by owner drives it to 1.00; that is what "escorts assigned by owner request" means arithmetically.`}
      </p>
    </Panel>
  )
}
