/**
 * TACTICAL · DIFFERENCE OF PROPORTIONS (act-6-07) — two samples, one difference, and the sign that
 * keeps being read backwards.
 *
 *   two sample panels   n and successes for each group, each with its own p̂. The interval's SE is
 *                       UNPOOLED — it assumes nothing about the two rates being equal, which is
 *                       exactly the difference between an interval and a test.
 *   order control       group 1 − group 2, or group 2 − group 1. The whole interval reflects through
 *                       zero and the plain-English sentence re-words itself. That is the
 *                       misconception made visible rather than described.
 *   the difference axis the interval as a bar with a point estimate and whiskers, drawn against a
 *                       reference line at 0. Zero inside the interval is a different verdict from
 *                       zero outside it, and neither of them is "the rates are equal".
 *   conditions row      the four OBSERVED counts — successes and failures in each sample — against
 *                       10. Note that these are each sample's own counts, not the pooled expected
 *                       counts a test would use.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   x1, n1, x2, n2    the two samples. Default the Lane's own beneficiary split from data.ts
 *                     (PERRINE_LOSSES / PERRINE_TRANSITS against OTHER_LOSSES / OTHER_TRANSITS).
 *   confidence        confidence level on load. Default 0.95.
 *   group1, group2    display names. Default PERRINE_HOLDINGS and 'all other beneficiaries'.
 *   successWord       what a "success" is, plural: 'losses'.
 *   unitWord          what the denominator counts, plural: 'transits'.
 *   label, tone       Panel header and ship-system tone.
 *
 * Every number comes from `twoPropInterval` in `@/lib/stats` (via `differenceInterval` in data.ts
 * for the Lane's own case). Nothing is typed in and nothing here calls Math.random.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import {
  ChartSurface,
  Legend,
  NumberField,
  PlotClip,
  Readout,
  ReferenceLine,
  Segmented,
  Slider,
  XAxis,
  chartTheme,
  padDomain,
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { fmt, fmtInt, fmtPct, twoPropInterval, zStar } from '@/lib/stats'
import { OTHER_LOSSES, OTHER_TRANSITS, PERRINE_HOLDINGS, PERRINE_LOSSES, PERRINE_TRANSITS } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

/** AP Large Counts for an interval: successes and failures at least ten, in each sample. */
const LARGE_COUNTS_MIN = 10

type Order = 'first-minus-second' | 'second-minus-first'

export interface DifferencePanelProps {
  /** Successes and sample size in group 1. Defaults: the Lane's 19 of 900. */
  x1?: number
  n1?: number
  /** Successes and sample size in group 2. Defaults: the Lane's 12 of 1,712. */
  x2?: number
  n2?: number
  /** Confidence level on load. Default 0.95. */
  confidence?: number
  /** Display names for the two groups. */
  group1?: string
  group2?: string
  /** What a success is, plural. Default 'losses'. */
  successWord?: string
  /** The rate in words, singular. Default 'loss rate'. */
  rateWord?: string
  /** What the denominator counts, singular. Default 'transit'. */
  unitWord?: string
  label?: string
  tone?: PanelTone
}

export function DifferencePanel({
  x1: x1Initial = PERRINE_LOSSES,
  n1: n1Initial = PERRINE_TRANSITS,
  x2: x2Initial = OTHER_LOSSES,
  n2: n2Initial = OTHER_TRANSITS,
  confidence: c0 = 0.95,
  group1 = PERRINE_HOLDINGS,
  group2 = 'all other beneficiaries',
  successWord = 'losses',
  rateWord = 'loss rate',
  unitWord = 'transit',
  label = 'TACTICAL · DIFFERENCE OF PROPORTIONS',
  tone = 'tactical',
}: DifferencePanelProps = {}) {
  const [x1, setX1] = useState(x1Initial)
  const [n1, setN1] = useState(n1Initial)
  const [x2, setX2] = useState(x2Initial)
  const [n2, setN2] = useState(n2Initial)
  const [confidence, setConfidence] = useState(c0)
  const [order, setOrder] = useState<Order>('first-minus-second')

  const first = order === 'first-minus-second'
  const nameA = first ? group1 : group2
  const nameB = first ? group2 : group1

  /* The interval is built by @/lib/stats in the order the control asks for — not negated afterwards. */
  const result = useMemo(
    () =>
      first
        ? twoPropInterval({ x1, n1, x2, n2, confidence, random: true })
        : twoPropInterval({ x1: x2, n1: n2, x2: x1, n2: n1, confidence, random: true }),
    [first, x1, n1, x2, n2, confidence],
  )
  const [lower, upper] = result.ci as [number, number]
  const estimate = result.estimate
  const se = result.se
  const moe = result.marginOfError ?? zStar(confidence) * se
  const z = result.criticalValue ?? zStar(confidence)

  const p1 = x1 / n1
  const p2 = x2 / n2
  const containsZero = lower <= 0 && 0 <= upper

  /* ---- Conditions: the four OBSERVED counts, each sample on its own p̂ ---- */
  const counts = [
    { group: group1, what: `${successWord} (successes)`, value: x1 },
    { group: group1, what: `arrivals (failures)`, value: n1 - x1 },
    { group: group2, what: `${successWord} (successes)`, value: x2 },
    { group: group2, what: `arrivals (failures)`, value: n2 - x2 },
  ]
  const smallest = Math.min(...counts.map((c) => c.value))
  const conditionsHold = smallest >= LARGE_COUNTS_MIN

  /* ---- Geometry: one difference axis with zero marked ---- */
  const frame = useChartFrame({ height: 190 })
  const domain = useMemo<[number, number]>(() => padDomain([Math.min(0, lower), Math.max(0, upper)] as [number, number], 0.22), [lower, upper])
  const xs = useMemo(() => scaleLinear().domain(domain).range([0, frame.innerWidth]), [domain, frame.innerWidth])
  const mid = frame.innerHeight / 2

  const table = useMemo(
    () => ({
      columns: ['quantity', 'value'],
      rows: [
        [`p̂ · ${group1}`, fmt(p1, 5)],
        [`p̂ · ${group2}`, fmt(p2, 5)],
        [`point estimate · ${nameA} − ${nameB}`, fmt(estimate, 5)],
        ['standard error (unpooled)', fmt(se, 5)],
        ['critical value z*', fmt(z, 3)],
        ['margin of error', fmt(moe, 5)],
        ['lower endpoint', fmt(lower, 5)],
        ['upper endpoint', fmt(upper, 5)],
      ] as (string | number)[][],
      caption: `${fmtPct(confidence, 0)} two-proportion z-interval for ${nameA} minus ${nameB}`,
    }),
    [group1, group2, nameA, nameB, p1, p2, estimate, se, z, moe, lower, upper, confidence],
  )

  const legend: LegendItem[] = [
    { label: `the ${fmtPct(confidence, 0)} interval`, color: semanticColor('fit'), shape: 'line' },
    { label: `point estimate p̂₁ − p̂₂ = ${fmt(estimate, 5)}`, color: semanticColor('observed'), shape: 'dot' },
    { label: 'no difference · 0', color: semanticColor('null'), shape: 'dashed' },
  ]

  const description =
    `A difference axis carrying the ${fmtPct(confidence, 0)} two-proportion z-interval for ${nameA} minus ${nameB}. ` +
    `The point estimate is ${fmt(estimate, 5)} and the interval runs from ${fmt(lower, 5)} to ${fmt(upper, 5)}, a margin of error of ${fmt(moe, 5)} built from an unpooled standard error of ${fmt(se, 5)} and a critical value of ${fmt(z, 3)}. ` +
    `Zero — no difference — lies ${containsZero ? 'inside' : 'outside'} the interval. ` +
    `In percentage points per ${unitWord}, the interval runs from ${fmt(lower * 100, 3)} to ${fmt(upper * 100, 3)}.`

  const sentence = `We are ${fmtPct(confidence, 0)} confident that the true difference in ${rateWord} per ${unitWord} — ${nameA} minus ${nameB} — is between ${fmt(lower, 4)} and ${fmt(upper, 4)}, that is between ${fmt(lower * 100, 2)} and ${fmt(upper * 100, 2)} percentage points.`

  return (
    <Panel
      label={label}
      status={`${fmtPct(confidence, 0)} · ${nameA.toUpperCase()} − ${nameB.toUpperCase()}`}
      tone={tone}
      led={conditionsHold ? 'on' : 'warn'}
      ariaLabel="Difference of proportions panel: two samples, an unpooled interval for the difference, and the order of subtraction"
    >
      <div style={stackStyle}>
        <section aria-label="Sample one">
          <Subhead>{group1}</Subhead>
          <div className="dr-controls">
            <NumberField label={`${group1} · ${successWord} (x₁)`} value={x1} onChange={(v) => setX1(Math.max(0, Math.min(n1, Math.round(v))))} min={0} max={n1} step={1} />
            <NumberField label={`${group1} · ${unitWord}s (n₁)`} value={n1} onChange={(v) => setN1(Math.max(Math.max(1, x1), Math.round(v)))} min={1} max={20000} step={10} />
            <Readout label={`p̂₁ · ${group1}`} value={fmt(p1, 5)} size="sm" live />
          </div>
        </section>

        <section aria-label="Sample two">
          <Subhead>{group2}</Subhead>
          <div className="dr-controls">
            <NumberField label={`${group2} · ${successWord} (x₂)`} value={x2} onChange={(v) => setX2(Math.max(0, Math.min(n2, Math.round(v))))} min={0} max={n2} step={1} />
            <NumberField label={`${group2} · ${unitWord}s (n₂)`} value={n2} onChange={(v) => setN2(Math.max(Math.max(1, x2), Math.round(v)))} min={1} max={20000} step={10} />
            <Readout label={`p̂₂ · ${group2}`} value={fmt(p2, 5)} size="sm" live />
          </div>
        </section>

        <div className="dr-controls">
          <Segmented<Order>
            label="order of subtraction"
            value={order}
            onChange={setOrder}
            options={[
              { value: 'first-minus-second', label: `${group1} − ${group2}` },
              { value: 'second-minus-first', label: `${group2} − ${group1}` },
            ]}
          />
          <Slider label="confidence level C" value={Math.round(confidence * 100)} min={80} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
        </div>

        <ReadoutGrid>
          <Readout label="point estimate · p̂₁ − p̂₂" value={fmt(estimate, 5)} tone="tactical" live />
          <Readout label="SE (unpooled)" value={fmt(se, 5)} size="sm" live />
          <Readout label="z*" value={fmt(z, 3)} size="sm" live />
          <Readout label="margin of error" value={fmt(moe, 5)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="lower endpoint" value={fmt(lower, 5)} tone="tactical" live />
          <Readout label="upper endpoint" value={fmt(upper, 5)} tone="tactical" live />
          <Readout label="lower · percentage points" value={fmt(lower * 100, 3)} size="sm" live />
          <Readout label="upper · percentage points" value={fmt(upper * 100, 3)} size="sm" live />
          <Readout label="contains 0" value={containsZero ? 'yes' : 'no'} tone={containsZero ? 'alert' : 'tactical'} size="sm" live />
        </ReadoutGrid>

        <ChartSurface
          frame={frame}
          ariaLabel={`The ${fmtPct(confidence, 0)} interval for the difference in proportions on a difference axis, with zero marked`}
          description={description}
          table={table}
          footer={<Legend items={legend} ariaLabel="Difference interval key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <PlotClip frame={frame}>
              <line
                x1={xs(lower)}
                x2={xs(upper)}
                y1={mid}
                y2={mid}
                stroke={semanticColor('fit')}
                strokeWidth={chartTheme.stroke.line + 2}
                strokeLinecap="butt"
                style={{ transition: 'x1 var(--dr-dur) var(--dr-ease), x2 var(--dr-dur) var(--dr-ease)' }}
              >
                <title>{`interval ${fmt(lower, 5)} to ${fmt(upper, 5)}`}</title>
              </line>
              {[lower, upper].map((end, i) => (
                <line
                  key={i}
                  x1={xs(end)}
                  x2={xs(end)}
                  y1={mid - 14}
                  y2={mid + 14}
                  stroke={semanticColor('fit')}
                  strokeWidth={chartTheme.stroke.line}
                  style={{ transition: 'x1 var(--dr-dur) var(--dr-ease), x2 var(--dr-dur) var(--dr-ease)' }}
                />
              ))}
              <circle cx={xs(estimate)} cy={mid} r={chartTheme.mark.dotR} fill={semanticColor('observed')} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke">
                <title>{`${nameA} − ${nameB} = ${fmt(estimate, 5)}`}</title>
              </circle>
            </PlotClip>
            <ReferenceLine x={xs(0)} height={frame.innerHeight} label="no difference · 0" color={semanticColor('null')} />
            <XAxis scale={xs} height={frame.innerHeight} label={`difference in ${rateWord} per ${unitWord}`} format={(v) => fmt(v, 4)} />
          </g>
        </ChartSurface>

        <Note tone={containsZero ? 'warn' : 'ok'} live>
          {sentence}
        </Note>

        {containsZero ? (
          <Note tone="warn">
            The interval contains 0, so a true difference of zero is among the values these data cannot rule out. That is <strong>not</strong> the same as saying the two rates are equal. The
            interval also contains {fmt(upper, 4)} and {fmt(lower, 4)}, and it does not rule those out either — an interval that spans zero is a statement about how little has been pinned
            down, not a finding of no difference.
          </Note>
        ) : (
          <Note tone="ok">
            The interval lies entirely {lower > 0 ? 'above' : 'below'} 0, so every value it contains is a genuine difference in the same direction. At this level the data are not consistent
            with the two rates being the same. Say by how much: between {fmt(Math.min(Math.abs(lower), Math.abs(upper)) * 100, 2)} and {fmt(Math.max(Math.abs(lower), Math.abs(upper)) * 100, 2)}{' '}
            percentage points per {unitWord}, {lower > 0 ? 'higher for' : 'lower for'} {nameA} than for {nameB}.
          </Note>
        )}

        <section aria-label="Conditions">
          <Subhead>Conditions · the four observed counts</Subhead>
          <KeyTable
            caption={`Large Counts for a two-proportion z-INTERVAL: each sample's own successes and failures at least ${LARGE_COUNTS_MIN}`}
            ariaLabel="The four observed counts checked against ten"
            columns={['group', 'count', 'value', '≥ 10']}
            rows={counts.map((c) => [c.group, c.what, fmtInt(c.value), c.value >= LARGE_COUNTS_MIN ? 'yes' : 'NO'])}
          />
          <Note tone={conditionsHold ? 'ok' : 'alert'} live>
            {conditionsHold
              ? `All four clear ${LARGE_COUNTS_MIN}; the smallest is ${fmtInt(smallest)}. `
              : `The smallest is ${fmtInt(smallest)}, which does NOT clear ${LARGE_COUNTS_MIN} — the normal model for p̂₁ − p̂₂ is not defensible on these counts and this interval should not be reported. `}
            Note whose rates these are. An <em>interval</em> checks each sample against its own p̂ — the counts actually observed — because it assumes nothing about the two rates being
            equal. A <em>test</em> checks the same four products at the pooled p̂c, because its null says there is one rate. The two checks can disagree, and when they do, each is right
            about its own procedure.
          </Note>
        </section>

        <Note>
          The order of subtraction is a decision, not an accident. Switch the control and the interval reflects through zero: {fmt(lower, 4)} to {fmt(upper, 4)} becomes {fmt(-upper, 4)} to{' '}
          {fmt(-lower, 4)}. Nothing about the ships changed. What changed is which group you wrote first, and a reader who does not know which will read the sign backwards — so the sentence
          has to say it: <strong>{nameA} minus {nameB}</strong>.
        </Note>
      </div>
    </Panel>
  )
}
