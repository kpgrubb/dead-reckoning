/**
 * INTEL · COMPARATIVE DISPLAY (act-1-06) — the thirty-one lost hulls against a baseline, on one
 * scale. Three ways to put two groups side by side (parallel boxplots, a back-to-back stemplot,
 * stacked histograms on a shared axis) plus the summary table that any comparison sentence must cite.
 *
 * The arrived group is 2,581 transits: it is drawn as bins and boxes, never as 2,581 dots. The
 * back-to-back stemplot uses a seeded subsample of sixty and says so.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { Boxplot, Histogram, Segmented, Readout, ReadoutRow, Legend, seriesColor, padDomain, type LegendItem } from '@/instruments/shared'
import { fiveNumber, fmt, fmtInt, iqr, mean, median, outliers, sd } from '@/lib/stats'
import { rng } from '@/lib/rng'
import { allMarks, arrivedAges, arrivedValues, lossMarks, lostAges, lostValues } from './data'
import { KeyTable, Note, Stemplot, Subhead, stackStyle, type StemSpec } from './_ui'

export interface ComparativeDisplayProps {
  variable?: 'mark' | 'age' | 'value'
  display?: 'boxplots' | 'stemplot' | 'histograms'
}

type Variable = 'mark' | 'age' | 'value'
type Display = 'boxplots' | 'stemplot' | 'histograms'

interface VariableSpec {
  /** The thirty-one lost hulls. */
  lost: number[]
  lostName: string
  /** The baseline group. */
  base: number[]
  baseName: string
  axis: string
  units: string
  digits: number
  binWidth: number
  stem: StemSpec
  caution?: string
}

const STEMPLOT_N = 60
/** Fixed subsample of the baseline group for the stemplot only — same sixty on every load. */
function subsample(xs: readonly number[]): number[] {
  if (xs.length <= STEMPLOT_N) return xs.slice()
  return rng('act-1', 'stemplot-subsample').sample(xs, STEMPLOT_N)
}

const SPEC: Record<Variable, VariableSpec> = {
  mark: {
    lost: lossMarks,
    lostName: 'the 31 losses',
    base: allMarks,
    baseName: `all ${fmtInt(allMarks.length)} records`,
    axis: 'Lane mark at the record',
    units: 'Lane marks',
    digits: 2,
    binWidth: 0.5,
    stem: { stemUnit: 1, leafUnit: 0.1 },
    caution: 'The baseline here is every Register record, not the arrived transits: an arrived hull’s last contact is Mark 12 by definition, so "arrived" can say nothing about where along the Lane something happens. Incidents of every kind are the only honest answer to "where would we expect this?"',
  },
  age: {
    lost: lostAges,
    lostName: 'the 31 lost hulls',
    base: arrivedAges,
    baseName: `${fmtInt(arrivedAges.length)} arrived transits`,
    axis: 'hull age at the transit (years)',
    units: 'yr',
    digits: 1,
    binWidth: 2,
    stem: { stemUnit: 10, leafUnit: 1 },
  },
  value: {
    lost: lostValues,
    lostName: 'the 31 lost hulls',
    base: arrivedValues,
    baseName: `${fmtInt(arrivedValues.length)} arrived transits`,
    axis: 'declared cargo value (M₵)',
    units: 'M₵',
    digits: 1,
    binWidth: 20,
    stem: { stemUnit: 100, leafUnit: 10 },
  },
}

const LOST_COLOR = seriesColor(3)
const BASE_COLOR = seriesColor(0)

function boxStatsOf(xs: readonly number[]) {
  const five = fiveNumber(xs)
  const fence = outliers(xs)
  const inside = xs.filter((v) => v >= fence.lowFence && v <= fence.highFence).sort((a, b) => a - b)
  return {
    min: five.min,
    q1: five.q1,
    median: five.median,
    q3: five.q3,
    max: five.max,
    outliers: fence.values.slice().sort((a, b) => a - b),
    whiskerLo: inside.length ? inside[0] : five.q1,
    whiskerHi: inside.length ? inside[inside.length - 1] : five.q3,
    n: xs.length,
  }
}

export function ComparativeDisplay({ variable: initialVariable = 'mark', display: initialDisplay = 'boxplots' }: ComparativeDisplayProps) {
  const [variable, setVariable] = useState<Variable>(initialVariable)
  const [display, setDisplay] = useState<Display>(initialDisplay)

  const spec = SPEC[variable]
  const d = spec.digits
  const { lost, base } = spec

  const domain = useMemo<[number, number]>(() => padDomain([Math.min(...lost, ...base), Math.max(...lost, ...base)], 0.05), [lost, base])
  const lostBox = useMemo(() => boxStatsOf(lost), [lost])
  const baseBox = useMemo(() => boxStatsOf(base), [base])
  const baseSample = useMemo(() => subsample(base), [base])

  const rows = [
    { name: spec.lostName, xs: lost, color: LOST_COLOR },
    { name: spec.baseName, xs: base, color: BASE_COLOR },
  ]
  const medianGap = median(lost) - median(base)

  const legend: LegendItem[] = rows.map((r) => ({ label: `${r.name} · n = ${fmtInt(r.xs.length)}`, color: r.color, shape: 'square' }))

  let body
  if (display === 'boxplots') {
    body = (
      <Boxplot
        groups={[
          { name: 'lost', stats: lostBox, color: LOST_COLOR },
          { name: 'baseline', stats: baseBox, color: BASE_COLOR },
        ]}
        domain={domain}
        showFences
        label={spec.axis}
        height={190}
        ariaLabel={`Parallel boxplots of ${spec.axis} for ${spec.lostName} and ${spec.baseName}`}
        description={`Two boxes on one scale. ${spec.lostName}: median ${fmt(lostBox.median, d)}, Q1 ${fmt(lostBox.q1, d)}, Q3 ${fmt(lostBox.q3, d)}. ${spec.baseName}: median ${fmt(baseBox.median, d)}, Q1 ${fmt(baseBox.q1, d)}, Q3 ${fmt(baseBox.q3, d)}. Units ${spec.units}. The data table lists both five-number summaries.`}
      />
    )
  } else if (display === 'stemplot') {
    body = (
      <>
        <Stemplot
          spec={spec.stem}
          left={lost}
          leftLabel={`${spec.lostName} (n = ${lost.length})`}
          right={baseSample}
          rightLabel={`${spec.baseName} · subsample (n = ${baseSample.length})`}
          units={spec.units}
          caption={`${spec.axis} · back to back on a shared stem`}
        />
        <Note tone="warn">
          The right-hand leaves are a fixed random subsample of {fmtInt(baseSample.length)} drawn from the {fmtInt(base.length)} baseline records — the same sixty on every load, because the draw is seeded. A stem-and-leaf shows every value it plots, so it cannot plot {fmtInt(base.length)}. Read the shape from it; read the numbers from the table below, which uses all {fmtInt(base.length)}.
        </Note>
      </>
    )
  } else {
    body = (
      <div style={stackStyle}>
        {rows.map((r) => (
          <div key={r.name}>
            <Subhead>
              {r.name} · n = {fmtInt(r.xs.length)}
            </Subhead>
            <Histogram
              values={r.xs}
              binWidth={spec.binWidth}
              domain={domain}
              color={r.color}
              height={190}
              label={spec.axis}
              ariaLabel={`Histogram of ${spec.axis} for ${r.name}, ${fmtInt(r.xs.length)} records, bin width ${fmt(spec.binWidth, d)}`}
              description={`Counts in bins of width ${fmt(spec.binWidth, d)} ${spec.units} on the same axis as the other group, so the two shapes can be read against each other. Median ${fmt(median(r.xs), d)} ${spec.units}. The data table lists each bin and its count.`}
            />
          </div>
        ))}
        <Note>Both histograms share one axis and one bin width. Counts differ by a factor of {fmt(base.length / lost.length, 0)}, so compare shape and centre, not bar height.</Note>
      </div>
    )
  }

  return (
    <Panel label="INTEL · COMPARATIVE DISPLAY" status={`${fmtInt(lost.length)} LOST vs ${fmtInt(base.length)}`} tone="intel" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Variable>
            label="variable"
            value={variable}
            onChange={setVariable}
            options={[
              { value: 'mark', label: 'Lane mark' },
              { value: 'age', label: 'hull age' },
              { value: 'value', label: 'cargo value' },
            ]}
          />
          <Segmented<Display>
            label="display"
            value={display}
            onChange={setDisplay}
            options={[
              { value: 'boxplots', label: 'parallel boxplots' },
              { value: 'stemplot', label: 'back-to-back stemplot' },
              { value: 'histograms', label: 'stacked histograms' },
            ]}
          />
        </div>

        <ReadoutRow>
          <Readout label={`median · ${spec.lostName}`} value={fmt(median(lost), d)} units={spec.units} tone="intel" live />
          <Readout label={`median · ${spec.baseName}`} value={fmt(median(base), d)} units={spec.units} tone="intel" live />
          <Readout label="difference in medians" value={`${medianGap >= 0 ? '+' : '−'}${fmt(Math.abs(medianGap), d)}`} units={spec.units} tone={Math.abs(medianGap) > 0 ? 'alert' : 'intel'} live />
        </ReadoutRow>

        {body}
        <Legend items={legend} ariaLabel="Groups" />

        <section aria-label="Group summary table">
          <Subhead>Summary · both groups, all records</Subhead>
          <KeyTable
            ariaLabel="Summary statistics by group"
            caption={`${spec.axis} · ${spec.units}`}
            columns={['group', 'n', 'median', 'IQR', 'mean', 'SD']}
            rows={rows.map((r) => [r.name, fmtInt(r.xs.length), fmt(median(r.xs), d), fmt(iqr(r.xs), d), fmt(mean(r.xs), d), fmt(sd(r.xs), d)])}
          />
        </section>

        {spec.caution ? (
          <Note tone="alert">{spec.caution}</Note>
        ) : (
          <Note>
            A comparison sentence names shape, centre, spread and any unusual values, for both groups, in context, with the numbers attached — {spec.lostName} against {spec.baseName}.
          </Note>
        )}
      </div>
    </Panel>
  )
}
