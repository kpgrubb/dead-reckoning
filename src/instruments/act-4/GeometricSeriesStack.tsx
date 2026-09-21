/**
 * ENGINEERING · THE WAIT, TERM BY TERM (calc briefing "geometric-series") — stack the geometric pmf
 * along a unit bar and watch the gap left over. That gap is exactly (1 − p)^k, the chance of still
 * waiting, and it is the number a window length is chosen against.
 *
 * Three things the briefing asks the learner to see:
 *  - Σ p(1 − p)^(k−1) converges to 1, and the remainder after k terms is the tail (1 − p)^k;
 *  - the pmf is strictly decreasing, so the most likely wait is one trial, whatever p is;
 *  - the weighted sum Σ k·p(1 − p)^(k−1) closes on the closed form 1/p — one differentiation of a
 *    series the learner already knows.
 *
 * Every figure comes from `@/lib/stats` (`geometric`), never from a literal.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { Readout, ReadoutRow, Slider } from '@/instruments/shared'
import { fmt, fmtPct, geometric } from '@/lib/stats'
import { KeyTable, Note, Subhead, stackStyle } from './_ui'

const MAX_TERMS = 60
const TABLE_ROWS = 12

export interface GeometricSeriesStackProps {
  /** Success probability on one trial. */
  p?: number
  /** Terms summed on first render. */
  terms?: number
}

export function GeometricSeriesStack({ p: pProp = 0.2, terms: termsProp = 6 }: GeometricSeriesStackProps) {
  const [p, setP] = useState(pProp)
  const [k, setK] = useState(termsProp)

  const pmf = useMemo(() => Array.from({ length: MAX_TERMS }, (_, i) => geometric.pmf(i + 1, p)), [p])

  const partial = geometric.cdf(k, p)
  const remainder = geometric.sf(k, p)
  const closedForm = geometric.mean(p)
  const sigma = geometric.sd(p)
  // The weighted partial sum Σ k·p(1−p)^(k−1): the series whose limit is the closed form.
  const weightedPartial = useMemo(() => pmf.slice(0, k).reduce((s, pk, i) => s + (i + 1) * pk, 0), [pmf, k])
  // P(X > µ): more than a third of waits run longer than the average, for small p.
  const pastMean = geometric.sf(Math.floor(closedForm), p)

  const rows = pmf.slice(0, TABLE_ROWS).map((pk, i) => [
    String(i + 1),
    fmt(pk, 5),
    fmt(geometric.cdf(i + 1, p), 5),
    fmt(geometric.sf(i + 1, p), 5),
  ])

  return (
    <Panel label="ENGINEERING · THE WAIT, TERM BY TERM" status={`p = ${fmt(p, 2)} · ${k} TERM${k === 1 ? '' : 'S'}`} tone="engineering" led={remainder < 0.01 ? 'on' : 'busy'}>
      <div style={stackStyle}>
        <Slider label="p · success on one trial" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} format={(v) => fmt(v, 2)} />
        <Slider label="terms included" value={k} min={1} max={MAX_TERMS} step={1} onChange={setK} />

        <Subhead>One unit of probability, term by term</Subhead>
        <div
          className="dr-geoseries"
          role="img"
          aria-label={`A unit bar divided into the first ${k} terms of the geometric series at p equal to ${fmt(p, 2)}; they fill ${fmtPct(partial, 2)} of it, and the unfilled remainder is ${fmt(remainder, 5)}.`}
        >
          {pmf.slice(0, k).map((pk, i) => (
            <span key={i} className="dr-geoseries__term" style={{ flexGrow: Math.max(pk, 1e-6) }} title={`trial ${i + 1} · p = ${fmt(pk, 5)}`} />
          ))}
          <span className="dr-geoseries__rest" style={{ flexGrow: Math.max(remainder, 1e-6) }} title={`still waiting · ${fmt(remainder, 5)}`} />
        </div>

        <ReadoutRow>
          <Readout label={`partial sum · Σ to ${k}`} value={fmt(partial, 6)} live />
          <Readout label={`remainder · (1 − p)^${k}`} value={fmt(remainder, 6)} tone={remainder < 0.05 ? 'tactical' : 'engineering'} live />
          <Readout label={`which is P(X > ${k})`} value={fmt(remainder, 6)} live />
          <Readout label={`Σ k·p(1 − p)^(k−1) to ${k}`} value={fmt(weightedPartial, 4)} live />
          <Readout label="closed form · 1/p" value={fmt(closedForm, 5)} tone="tactical" />
          <Readout label="σ = √(1 − p)/p" value={fmt(sigma, 3)} />
          <Readout label="P(X > µ)" value={fmtPct(pastMean, 1)} tone="engineering" />
        </ReadoutRow>

        <Note live>
          The tallest term is always trial 1 — each term is the one before it times {fmt(1 - p, 2)}. The mean wait is {fmt(closedForm, 2)} trials and the spread is {fmt(sigma, 2)}, very nearly the mean itself, which is why one observed wait tells you almost nothing about the next. {fmtPct(pastMean, 0)} of waits run longer than the average.
        </Note>
        <Note tone={remainder < 0.05 ? 'ok' : 'muted'} live>
          After {k} trial{k === 1 ? '' : 's'} the series has captured {fmtPct(partial, 3)} of the probability. The gap is not rounding: it is {fmt(remainder, 5)}, the chance of still waiting.
        </Note>

        <KeyTable
          columns={['trial k', 'p(k)', 'P(X ≤ k)', '(1 − p)^k']}
          rows={rows}
          caption={`Geometric terms at p = ${fmt(p, 2)} (first ${TABLE_ROWS} of ${MAX_TERMS})`}
          ariaLabel="Geometric probability mass, cumulative probability and tail"
          emphasisRow={k <= TABLE_ROWS ? k - 1 : undefined}
        />
      </div>
    </Panel>
  )
}
