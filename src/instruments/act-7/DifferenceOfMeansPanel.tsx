/**
 * TACTICAL · DIFFERENCE OF MEANS (act-7-05) — two independent groups, one interval, a difference axis.
 *
 * Two groups of transits that share no hull between them, each with its own n, x̄ and s, and the
 * interval for μ₁ − μ₂ drawn against a reference at zero. Nothing here is pooled: the standard error
 * is √(s₁²/n₁ + s₂²/n₂) and the degrees of freedom are Welch's or the conservative min(n₁−1, n₂−1),
 * with both printed side by side so the write-up can say which it used.
 *
 * What the learner does: picks a comparison and watches whether the interval crosses zero; switches
 * the df rule and watches the endpoints move by less than the choice of comparison ever does; winds
 * the confidence level and watches the interval that contained zero at 95% still contain it at 80%.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   comparisons   the pairs the selector offers. Default: the four the Ledger supports.
 *   initial       which comparison is selected on load. Default the first.
 *   confidence    level on load. Default 0.95.
 *   label, tone   Panel header and ship-system tone.
 *
 * Every number comes from `twoMeanInterval`, `welchDf`, `conservativeDf`, `mean` and `sd` in
 * `@/lib/stats`. This panel runs no test: act-7-05 is intervals, and the decision is 7-06's.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import {
  ChartSurface,
  Dotplot,
  Histogram,
  Legend,
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
import { conservativeDf, fmt, fmtInt, fmtPct, mean, sd, twoMeanInterval, welchDf } from '@/lib/stats'
import { LANE_POPULATION, lostPerrineDelays, otherDelays, perrineDelays, survivingPerrineDelays } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

/** Above this many values a dotplot is a smear; the group is drawn as a histogram instead. */
const HISTOGRAM_FROM = 60

export interface MeanComparison {
  id: string
  /** Short label for the selector. */
  label: string
  nameA: string
  nameB: string
  a: readonly number[]
  b: readonly number[]
}

export interface DifferenceOfMeansPanelProps {
  comparisons?: readonly MeanComparison[]
  initial?: string
  confidence?: number
  /** The measured variable, named. */
  measure?: string
  units?: string
  label?: string
  tone?: PanelTone
}

export const LEDGER_COMPARISONS: readonly MeanComparison[] = [
  {
    id: 'surviving-vs-other',
    label: 'surviving Perrine vs everyone else',
    nameA: 'Perrine hulls that arrived',
    nameB: 'hulls with any other beneficiary',
    a: survivingPerrineDelays,
    b: otherDelays,
  },
  {
    id: 'lost-vs-surviving',
    label: 'lost Perrine vs surviving Perrine',
    nameA: 'Perrine hulls the Register carries as lost',
    nameB: 'Perrine hulls that arrived',
    a: lostPerrineDelays,
    b: survivingPerrineDelays,
  },
  {
    id: 'lost-vs-other',
    label: 'lost Perrine vs everyone else',
    nameA: 'Perrine hulls the Register carries as lost',
    nameB: 'hulls with any other beneficiary',
    a: lostPerrineDelays,
    b: otherDelays,
  },
  {
    id: 'all-perrine-vs-other',
    label: 'all Perrine vs everyone else',
    nameA: 'every Perrine transit',
    nameB: 'hulls with any other beneficiary',
    a: perrineDelays,
    b: otherDelays,
  },
]

function GroupDisplay({ values, name, measure, units }: { values: readonly number[]; name: string; measure: string; units: string }) {
  const arr = useMemo(() => [...values], [values])
  const description = `${fmtInt(arr.length)} ${name}: mean ${fmt(mean(arr), 4)} ${units}, standard deviation ${fmt(sd(arr), 4)} ${units}.`
  if (arr.length >= HISTOGRAM_FROM) {
    return (
      <Histogram
        values={arr}
        binWidth={0.5}
        label={`${measure} (${units}) · ${name}`}
        references={[{ x: mean(arr), label: `x̄ = ${fmt(mean(arr), 3)}`, color: 'reference' }]}
        height={190}
        ariaLabel={`Histogram of ${measure} for ${name}`}
        description={description}
      />
    )
  }
  return (
    <Dotplot
      values={arr}
      label={`${measure} (${units}) · ${name}`}
      references={[{ x: mean(arr), label: `x̄ = ${fmt(mean(arr), 3)}`, color: 'reference' }]}
      height={170}
      ariaLabel={`Dotplot of ${measure} for ${name}`}
      description={description}
    />
  )
}

export function DifferenceOfMeansPanel({
  comparisons = LEDGER_COMPARISONS,
  initial,
  confidence: c0 = 0.95,
  measure = 'Mark-9 delay against the filed plot',
  units = 'd',
  label = 'TACTICAL · DIFFERENCE OF MEANS',
  tone = 'tactical',
}: DifferenceOfMeansPanelProps = {}) {
  const [id, setId] = useState(initial ?? comparisons[0].id)
  const [dfMethod, setDfMethod] = useState<'welch' | 'conservative'>('welch')
  const [confidence, setConfidence] = useState(c0)

  const pick = comparisons.find((c) => c.id === id) ?? comparisons[0]
  const a = useMemo(() => [...pick.a], [pick])
  const b = useMemo(() => [...pick.b], [pick])

  const result = useMemo(() => twoMeanInterval(a, b, { confidence, dfMethod, random: true }), [a, b, confidence, dfMethod])
  const [lower, upper] = result.ci as [number, number]
  const containsZero = lower <= 0 && 0 <= upper

  const welch = useMemo(() => welchDf(sd(a), a.length, sd(b), b.length), [a, b])
  const conservative = conservativeDf(a.length, b.length)

  /* ---- The difference axis ---- */
  const frame = useChartFrame({ height: 170 })
  const domain = useMemo<[number, number]>(() => padDomain([Math.min(0, lower), Math.max(0, upper)] as [number, number], 0.25), [lower, upper])
  const x = useMemo(() => scaleLinear().domain(domain).range([0, frame.innerWidth]), [domain, frame.innerWidth])
  const mid = frame.innerHeight / 2

  const table = useMemo(
    () => ({
      columns: ['quantity', 'value'],
      rows: [
        [`n · ${pick.nameA}`, fmtInt(a.length)],
        [`x̄ · ${pick.nameA}`, fmt(mean(a), 5)],
        [`s · ${pick.nameA}`, fmt(sd(a), 5)],
        [`n · ${pick.nameB}`, fmtInt(b.length)],
        [`x̄ · ${pick.nameB}`, fmt(mean(b), 5)],
        [`s · ${pick.nameB}`, fmt(sd(b), 5)],
        ['point estimate x̄₁ − x̄₂', fmt(result.estimate, 5)],
        ['standard error (unpooled)', fmt(result.se, 5)],
        [`df (${dfMethod})`, fmt(result.df ?? 0, 2)],
        ['t*', fmt(result.criticalValue ?? 0, 4)],
        ['margin of error', fmt(result.marginOfError ?? 0, 5)],
        ['lower endpoint', fmt(lower, 5)],
        ['upper endpoint', fmt(upper, 5)],
      ] as (string | number)[][],
      caption: `${fmtPct(confidence, 0)} two-sample t-interval for the difference in mean ${measure}`,
    }),
    [pick, a, b, result, dfMethod, lower, upper, confidence, measure],
  )

  const legend: LegendItem[] = [
    { label: `the ${fmtPct(confidence, 0)} interval`, color: semanticColor('fit'), shape: 'line' },
    { label: `x̄₁ − x̄₂ = ${fmt(result.estimate, 4)}`, color: semanticColor('observed'), shape: 'dot' },
    { label: 'no difference · 0', color: semanticColor('null'), shape: 'dashed' },
  ]

  const sentence = `We are ${fmtPct(confidence, 0)} confident that the true difference in mean ${measure} — ${pick.nameA} minus ${pick.nameB}, among ${LANE_POPULATION} — is between ${fmt(lower, 3)} and ${fmt(upper, 3)} ${units}.`

  return (
    <Panel
      label={label}
      status={`${fmtPct(confidence, 0)} · ${dfMethod === 'welch' ? 'WELCH DF' : 'CONSERVATIVE DF'}`}
      tone={tone}
      led={containsZero ? 'warn' : 'on'}
      ariaLabel="Difference of means panel: two independent groups, an unpooled interval for the difference, and the choice of degrees of freedom"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<string> label="comparison" value={id} onChange={setId} options={comparisons.map((c) => ({ value: c.id, label: c.label }))} />
        </div>
        <div className="dr-controls">
          <Segmented<'welch' | 'conservative'>
            label="degrees of freedom"
            value={dfMethod}
            onChange={setDfMethod}
            options={[
              { value: 'welch', label: `Welch · ${fmt(welch, 2)}` },
              { value: 'conservative', label: `conservative · ${fmtInt(conservative)}` },
            ]}
          />
          <Slider label="confidence level C" value={Math.round(confidence * 100)} min={80} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
        </div>

        <KeyTable
          caption="Each group on its own: no pairing, no pooling, one summary line each"
          ariaLabel="Group summaries"
          columns={['group', 'n', 'x̄', 's']}
          rows={[
            [pick.nameA, fmtInt(a.length), fmt(mean(a), 4), fmt(sd(a), 4)],
            [pick.nameB, fmtInt(b.length), fmt(mean(b), 4), fmt(sd(b), 4)],
          ]}
        />

        <section aria-label="Group one">
          <Subhead>{pick.nameA}</Subhead>
          <GroupDisplay values={a} name={pick.nameA} measure={measure} units={units} />
        </section>
        <section aria-label="Group two">
          <Subhead>{pick.nameB}</Subhead>
          <GroupDisplay values={b} name={pick.nameB} measure={measure} units={units} />
        </section>

        <ReadoutGrid>
          <Readout label="x̄₁ − x̄₂" value={fmt(result.estimate, 4)} tone="tactical" live />
          <Readout label="SE (unpooled)" value={fmt(result.se, 4)} size="sm" live />
          <Readout label="t*" value={fmt(result.criticalValue ?? 0, 3)} size="sm" live />
          <Readout label="margin of error" value={fmt(result.marginOfError ?? 0, 4)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="Welch df" value={fmt(welch, 2)} size="sm" live />
          <Readout label="conservative df" value={fmtInt(conservative)} size="sm" live />
          <Readout label={`${fmtPct(confidence, 0)} lower`} value={fmt(lower, 4)} tone="tactical" live />
          <Readout label={`${fmtPct(confidence, 0)} upper`} value={fmt(upper, 4)} tone="tactical" live />
          <Readout label="contains 0" value={containsZero ? 'yes' : 'no'} tone={containsZero ? 'alert' : 'tactical'} size="sm" live />
        </ReadoutGrid>

        <ChartSurface
          frame={frame}
          ariaLabel={`The ${fmtPct(confidence, 0)} interval for the difference in means on a difference axis, with zero marked`}
          description={`${sentence} Zero lies ${containsZero ? 'inside' : 'outside'} the interval.`}
          table={table}
          footer={<Legend items={legend} ariaLabel="Difference interval key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <PlotClip frame={frame}>
              <line
                x1={x(lower)}
                x2={x(upper)}
                y1={mid}
                y2={mid}
                stroke={semanticColor('fit')}
                strokeWidth={chartTheme.stroke.line + 2}
                style={{ transition: 'x1 var(--dr-dur) var(--dr-ease), x2 var(--dr-dur) var(--dr-ease)' }}
              >
                <title>{`interval ${fmt(lower, 4)} to ${fmt(upper, 4)}`}</title>
              </line>
              {[lower, upper].map((end, i) => (
                <line key={i} x1={x(end)} x2={x(end)} y1={mid - 14} y2={mid + 14} stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
              ))}
              <circle cx={x(result.estimate)} cy={mid} r={chartTheme.mark.dotR} fill={semanticColor('observed')} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke">
                <title>{`${pick.nameA} − ${pick.nameB} = ${fmt(result.estimate, 4)}`}</title>
              </circle>
            </PlotClip>
            <ReferenceLine x={x(0)} height={frame.innerHeight} label="no difference · 0" color={semanticColor('null')} />
            <XAxis scale={x} height={frame.innerHeight} label={`difference in mean ${measure} (${units})`} format={(v) => fmt(v, 2)} />
          </g>
        </ChartSurface>

        <Note tone={containsZero ? 'warn' : 'ok'} live>
          {sentence}
        </Note>

        {containsZero ? (
          <Note tone="warn" live>
            Zero is among the values this interval does not rule out, so these data give no evidence that the two groups differ in mean {measure}. Read what else the interval contains before
            calling that a finding of no difference: it also holds {fmt(lower, 3)} and {fmt(upper, 3)} {units}, and it rules neither of those out either. An interval that spans zero is a
            statement about how little has been pinned down.
          </Note>
        ) : (
          <Note tone="ok" live>
            The whole interval lies {lower > 0 ? 'above' : 'below'} zero, so every difference it is consistent with runs in the same direction. Say the size: between{' '}
            {fmt(Math.min(Math.abs(lower), Math.abs(upper)), 2)} and {fmt(Math.max(Math.abs(lower), Math.abs(upper)), 2)} {units} {lower > 0 ? 'later' : 'earlier'} for {pick.nameA} than for{' '}
            {pick.nameB}, on average.
          </Note>
        )}

        <Note>
          The standard error is √(s₁²/n₁ + s₂²/n₂) = {fmt(result.se, 4)}: each group's own spread over each group's own count, and no assumption that the two spreads are equal. The degrees of
          freedom are the only place the two rules disagree. Welch gives {fmt(welch, 2)}, the conservative rule min(n₁ − 1, n₂ − 1) gives {fmtInt(conservative)}, and the conservative one is
          the smaller, so it buys a larger t* and a wider interval. Wider is safer and it is not more accurate. Name the rule you used.
        </Note>
      </div>
    </Panel>
  )
}
