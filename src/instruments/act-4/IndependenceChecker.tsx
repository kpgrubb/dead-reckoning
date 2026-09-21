/**
 * TACTICAL · INDEPENDENCE CHECK (act-4-04) — a 2×2 the learner edits until the variables come apart.
 *
 * Two checks, both named, both live:
 *   P(A | B) against P(A)          — independent when knowing B moves nothing.
 *   P(A ∩ B) against P(A)·P(B)     — independent when the joint is the product of the marginals.
 * Each cell also carries its expected count, row total × column total ÷ grand total, beside the count
 * actually logged. MAKE IT INDEPENDENT fills the table with those expected counts, rounded; editing a
 * single cell breaks it again and the panel says by how much.
 *
 * Two presets. Consecutive sweeps are the ship's own instrument: a detection buys that sector a
 * focused re-sweep, so the next entry is not a fresh trial and the table says so at a glance. Loss by
 * owner class is the Transit Ledger: Perrine 19 of 900 against every other owner 12 of 1,712.
 *
 * Every marginal, conditional, joint and expected count comes from `twoWay` in @/lib/stats.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { BarChart, Readout, ReadoutRow, Segmented, chartTheme, semanticColor, seriesColor } from '@/instruments/shared'
import { fmt, fmtInt, fmtPct, twoWay } from '@/lib/stats'
import {
  CONSECUTIVE_COLS,
  CONSECUTIVE_ROWS,
  LOSS_OWNER_COLS,
  LOSS_OWNER_ROWS,
  P_LOST,
  P_LOST_GIVEN_PERRINE,
  consecutiveCounts,
  lossOwnerCounts,
} from './data'
import { KeyTable, Note, ProbabilityBar, Subhead, stackStyle, wideGridStyle } from './_ui'

export type IndependencePreset = 'sweeps' | 'owner'

export interface IndependenceCheckerProps {
  /** Which logged 2×2 the panel opens on. */
  preset?: IndependencePreset
}

const PRESET_OPTIONS = [
  { value: 'sweeps', label: 'consecutive sweeps' },
  { value: 'owner', label: 'loss × owner' },
] as const

interface Spec {
  rows: readonly string[]
  cols: readonly string[]
  counts: number[][]
  /** Short names for the two events the checks are written in. */
  eventA: string
  eventB: string
  physical: string
}

function specFor(preset: IndependencePreset): Spec {
  if (preset === 'sweeps') {
    return {
      rows: CONSECUTIVE_ROWS,
      cols: CONSECUTIVE_COLS,
      counts: consecutiveCounts.map((r) => [...r]),
      eventA: CONSECUTIVE_COLS[0],
      eventB: CONSECUTIVE_ROWS[0],
      physical: 'A detection buys that sector a focused re-sweep. The next entry is not a fresh trial; the Eyes were pointed at the contact on purpose.',
    }
  }
  return {
    rows: LOSS_OWNER_ROWS,
    cols: LOSS_OWNER_COLS,
    counts: lossOwnerCounts.map((r) => [...r]),
    eventA: LOSS_OWNER_COLS[0],
    eventB: LOSS_OWNER_ROWS[0],
    physical: 'Perrine hulls run the same corridor as everybody else and are lost off it at close to twice the rate. The table says the two variables move together. It does not say why.',
  }
}

/** A count cell the learner can retype; commits on Enter or blur. */
function CountInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState<string | null>(null)
  const commit = () => {
    if (text === null) return
    const n = Number(text)
    if (Number.isFinite(n) && n >= 0) onChange(Math.round(n))
    setText(null)
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={text ?? String(value)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
          setText(null)
          onChange(Math.max(0, value + step))
        }
      }}
    />
  )
}

export function IndependenceChecker({ preset: presetProp = 'sweeps' }: IndependenceCheckerProps = {}) {
  const [preset, setPresetState] = useState<IndependencePreset>(presetProp)
  const [counts, setCounts] = useState<number[][]>(() => specFor(presetProp).counts)
  const [flattened, setFlattened] = useState(false)

  const spec = specFor(preset)
  const setPreset = (p: IndependencePreset) => {
    setPresetState(p)
    setCounts(specFor(p).counts)
    setFlattened(false)
  }
  const restore = () => {
    setCounts(specFor(preset).counts)
    setFlattened(false)
  }

  const total = counts.reduce((s, r) => s + r[0] + r[1], 0)
  const tw = useMemo(() => (total > 0 ? twoWay(counts, { rows: [...spec.rows], cols: [...spec.cols] }) : null), [counts, spec.rows, spec.cols, total])

  const makeIndependent = () => {
    if (!tw) return
    setCounts(tw.expected.map((r) => r.map((v) => Math.round(v))))
    setFlattened(true)
  }

  if (!tw) {
    return (
      <Panel label="TACTICAL · INDEPENDENCE CHECK" tone="tactical" led="alert" status="EMPTY TABLE">
        <div style={stackStyle}>
          <Note tone="alert">Every cell is zero. There is no table to read. Restore the logged counts.</Note>
          <button type="button" className="dr-btn dr-btn--primary" onClick={restore}>
            RESTORE LOGGED COUNTS
          </button>
        </div>
      </Panel>
    )
  }

  /* ---- The two checks, both named ---- */
  const pAGivenB = tw.rowConditional[0][0]
  const pAGivenNotB = tw.rowConditional[1][0]
  const pA = tw.marginalCols[0]
  const pB = tw.marginalRows[0]
  const joint = tw.joint[0][0]
  const product = pA * pB
  const gapCond = pAGivenB - pA
  const gapJoint = joint - product
  /**
   * The verdict is read off the counts, not the probabilities: a table of whole hulls can only ever
   * be independent to the nearest hull. Every cell within half a count of its expected value is as
   * independent as an integer table gets.
   */
  const maxCellGap = Math.max(...tw.table.flatMap((r, i) => r.map((v, k) => Math.abs(v - tw.expected[i][k]))))
  const independent = maxCellGap < 0.5

  const cellRows = tw.rows.flatMap((rn, i) =>
    tw.cols.map((cn, k) => [
      `${rn} · ${cn}`,
      fmtInt(tw.table[i][k]),
      fmt(tw.expected[i][k], 2),
      fmt(tw.table[i][k] - tw.expected[i][k], 2),
    ]),
  )

  return (
    <Panel
      label="TACTICAL · INDEPENDENCE CHECK"
      tone="tactical"
      led={independent ? 'on' : 'warn'}
      status={`n = ${fmtInt(tw.total)}`}
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<IndependencePreset> label="table" value={preset} options={PRESET_OPTIONS} onChange={setPreset} />
          <button type="button" className="dr-btn dr-btn--sm dr-btn--primary" onClick={makeIndependent}>
            MAKE IT INDEPENDENT
          </button>
          <button type="button" className="dr-btn dr-btn--sm" onClick={restore}>
            RESTORE LOGGED COUNTS
          </button>
        </div>

        <section aria-label="The two-way table">
          <Subhead>Counts · edit any cell</Subhead>
          <table className="dr-pgrid">
            <caption>
              observed count, with the expected count under independence beneath it
            </caption>
            <thead>
              <tr>
                <th scope="col">&nbsp;</th>
                {tw.cols.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
                <th scope="col">total</th>
              </tr>
            </thead>
            <tbody>
              {tw.rows.map((r, i) => (
                <tr key={r}>
                  <th scope="row">{r}</th>
                  {tw.cols.map((c, k) => (
                    <td key={c}>
                      <CountInput label={`${r}, ${c}`} value={tw.table[i][k]} onChange={(v) => setCounts(counts.map((row, ri) => row.map((cell, ci) => (ri === i && ci === k ? v : cell))))} />
                      <div style={{ color: 'var(--dr-fg-2)', fontSize: 'var(--dr-fs-2xs)' }}>expected {fmt(tw.expected[i][k], 1)}</div>
                    </td>
                  ))}
                  <td className="is-total">{fmtInt(tw.rowTotals[i])}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">total</th>
                {tw.cols.map((c, k) => (
                  <td key={c} className="is-total">
                    {fmtInt(tw.colTotals[k])}
                  </td>
                ))}
                <td className="is-total">{fmtInt(tw.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section aria-label="Conditional against marginal">
          <Subhead>Check one · P(A | B) against P(A)</Subhead>
          <BarChart
            categories={[`P(${spec.eventA} | ${spec.eventB})`, `P(${spec.eventA} | not ${spec.eventB})`, `P(${spec.eventA})`]}
            values={[pAGivenB, pAGivenNotB, pA]}
            colors={[seriesColor(0), seriesColor(1), chartTheme.color.reference]}
            highlight={independent ? [] : [0]}
            label="conditional distributions against the marginal"
            valueLabel="probability"
            height={220}
            ariaLabel={`Bar chart comparing P(${spec.eventA} given ${spec.eventB}) = ${fmt(pAGivenB, 4)}, P(${spec.eventA} given not ${spec.eventB}) = ${fmt(pAGivenNotB, 4)} and the marginal P(${spec.eventA}) = ${fmt(pA, 4)}`}
            description={`Independence means the conditionals equal the marginal: all three bars the same height. Here they differ by ${fmt(Math.abs(gapCond), 4)} between the conditional and the marginal. The data table gives the three values.`}
          />
          <ReadoutRow>
            <Readout label={`P(${spec.eventA} | ${spec.eventB})`} value={fmt(pAGivenB, 4)} tone="tactical" live />
            <Readout label={`P(${spec.eventA} | not ${spec.eventB})`} value={fmt(pAGivenNotB, 4)} tone="tactical" live />
            <Readout label={`P(${spec.eventA})`} value={fmt(pA, 4)} live />
            <Readout label="difference" value={fmt(gapCond, 4)} tone={independent ? 'default' : 'alert'} live />
          </ReadoutRow>
        </section>

        <section aria-label="Joint against the product of the marginals">
          <Subhead>Check two · P(A ∩ B) against P(A)·P(B)</Subhead>
          <div style={wideGridStyle}>
            <ProbabilityBar value={joint} label={`P(${spec.eventA} ∩ ${spec.eventB}) · observed`} color={seriesColor(0)} digits={4} />
            <ProbabilityBar value={product} label={`P(${spec.eventA}) · P(${spec.eventB}) · if independent`} color={semanticColor('reference')} digits={4} />
          </div>
          <ReadoutRow>
            <Readout label="joint" value={fmt(joint, 5)} tone="tactical" live />
            <Readout label="product of the marginals" value={fmt(product, 5)} live />
            <Readout label="difference" value={fmt(gapJoint, 5)} tone={independent ? 'default' : 'alert'} live />
            <Readout label="observed count in that cell" value={fmtInt(tw.table[0][0])} size="sm" />
            <Readout label="expected count" value={fmt(tw.expected[0][0], 1)} size="sm" />
            <Readout label="largest cell gap" value={fmt(maxCellGap, 2)} tone={independent ? 'default' : 'alert'} live />
          </ReadoutRow>
        </section>

        <KeyTable
          columns={['cell', 'observed', 'expected = row × column ÷ total', 'observed − expected']}
          rows={cellRows}
          caption="Every cell against what independence would put there"
          ariaLabel="Observed and expected counts"
        />

        {independent ? (
          <Note tone="ok" live>
            Independent to the nearest whole count: no cell sits more than {fmt(maxCellGap, 2)} away from its expected value, the conditionals sit on the marginal ({fmt(pAGivenB, 4)} against {fmt(pA, 4)}) and the joint sits on the product. In this table, knowing {spec.eventB} tells you nothing about {spec.eventA}. Independence is a property of the numbers in front of you, not a fact about the Lane.
          </Note>
        ) : (
          <Note tone="warn" live>
            Not independent in this file. P({spec.eventA} | {spec.eventB}) = {fmtPct(pAGivenB, 2)} against a marginal of {fmtPct(pA, 2)} — a gap of {fmt(Math.abs(gapCond), 4)}. The joint runs {fmt(Math.abs(gapJoint), 5)} {gapJoint > 0 ? 'above' : 'below'} the product of the marginals, and the top-left cell holds {fmtInt(tw.table[0][0])} where independence would put {fmt(tw.expected[0][0], 1)}.
          </Note>
        )}
        {flattened && (
          <Note>
            The table now holds the expected counts, rounded to whole hulls — the rounding moves the grand total to {fmtInt(tw.total)} and shifts each cell by less than one. That is what independence looks like. Retype any cell and the two checks come apart again.
          </Note>
        )}
        <Note>
          {spec.physical}
          {preset === 'owner' && ` On the logged Ledger that reads P(lost | Perrine) = ${fmt(P_LOST_GIVEN_PERRINE, 4)} against a marginal P(lost) = ${fmt(P_LOST, 4)}.`}
        </Note>
        <Note>
          Two cautions. Mutually exclusive is not independent: disjoint events have a joint of zero, which is the product of the marginals only when one of them cannot happen. And dependent <em>in this file</em> is a description of {fmtInt(tw.total)} records, not an inference about the Lane. The data says these two move together. It does not say what moves them.
        </Note>
      </div>
    </Panel>
  )
}
