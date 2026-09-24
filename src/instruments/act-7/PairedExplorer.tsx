/**
 * ENGINEERING · PAIRED OR TWO SAMPLES (act-7-04) — the same twenty-four numbers, read two ways.
 *
 * The Act's spine (gate review B1). One control changes nothing about the data and everything about
 * the answer:
 *
 *   treat as paired        one number per unit (first − second), analysed as a single sample.
 *                          The unit's own persistent offset appears in both columns and cancels.
 *   treat as two samples   the two columns thrown into separate buckets, the pairing discarded.
 *                          Every unit's offset stays in the spread and lands in the standard error.
 *
 * What the learner does: flips the toggle and watches the estimate stay put while the standard
 * error, the degrees of freedom, the p-value and the interval all move. Then drags the shared-offset
 * slider and watches a simulated companion set show how the advantage grows with the offset.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   first, second      the two columns. The difference is ALWAYS first − second, matching
 *                      `pairedTTest(first, second)` in `@/lib/stats`. Defaults: DS-11's
 *                      `delay_after` and `delay_before`.
 *   firstLabel, secondLabel, rowNames, unitPlural, measure, units, differenceLabel
 *                      display strings; `rowNames` labels the connecting lines and the data table.
 *   confidence         interval level on load (default 0.95).
 *   digits             display precision for the measurement (default 2).
 *   showSimulator      the shared-offset slider and its companion set (default true).
 *   label, tone        Panel header and ship-system tone.
 *
 * Every statistic comes from `@/lib/stats`; the companion set is drawn through `@/lib/rng` with a
 * fixed seed, so the same slider position always draws the same set. `Math.random` is not used.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import {
  ChartSurface,
  Dotplot,
  Legend,
  PlotClip,
  Readout,
  ReferenceLine,
  Segmented,
  Slider,
  XAxis,
  YAxis,
  chartTheme,
  padDomain,
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { rng } from '@/lib/rng'
import {
  correlation,
  fmt,
  fmtInt,
  fmtP,
  fmtPct,
  mean,
  pairedDifferences,
  pairedTInterval,
  pairedTTest,
  sd,
  twoMeanInterval,
  twoMeanTest,
} from '@/lib/stats'
import { refitDelayAfter, refitDelayBefore, refitSet } from './data'
import { ConditionList, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

type Mode = 'paired' | 'two-sample'

export interface PairedExplorerProps {
  /** The column the difference is measured from. Difference = first − second. */
  first?: readonly number[]
  second?: readonly number[]
  firstLabel?: string
  secondLabel?: string
  /** One name per pair, for the connecting lines and the table. */
  rowNames?: readonly string[]
  /** What a pair is, plural: 'hulls', 'cold runs'. */
  unitPlural?: string
  /** What was measured: 'Mark-9 delay'. */
  measure?: string
  /** Units, abbreviated: 'd', 'h'. */
  units?: string
  /** The difference in words, for axis titles and the sentence. */
  differenceLabel?: string
  confidence?: number
  digits?: number
  showSimulator?: boolean
  label?: string
  tone?: PanelTone
}

/** Companion-set parameters: enough pairs to graph, drawn once per slider stop. */
const SIM_N = 12
const SIM_WITHIN_SD = 0.9

interface SimSummary {
  offsetSd: number
  pairedSe: number
  twoSampleSe: number
  ratio: number
}

/**
 * A simulated companion set with the same shift and within-run noise as the observed one, but a
 * shared per-unit offset of the caller's choosing. Deterministic in `offsetSd`, so the slider is
 * reproducible and the chart never flickers between renders.
 */
function simulate(offsetSd: number, shift: number): SimSummary {
  const r = rng('act-7/paired-explorer', Math.round(offsetSd * 20))
  const a: number[] = []
  const b: number[] = []
  for (let i = 0; i < SIM_N; i++) {
    const offset = r.normal(0, offsetSd)
    b.push(offset + r.normal(0, SIM_WITHIN_SD))
    a.push(offset + shift + r.normal(0, SIM_WITHIN_SD))
  }
  const pairedSe = pairedTTest(a, b, { alt: 'two-sided' }).se
  const twoSampleSe = twoMeanTest(a, b, { alt: 'two-sided' }).se
  return { offsetSd, pairedSe, twoSampleSe, ratio: twoSampleSe / pairedSe }
}

export function PairedExplorer({
  first = refitDelayAfter,
  second = refitDelayBefore,
  firstLabel = 'after the uprate',
  secondLabel = 'before the uprate',
  rowNames = refitSet.map((h) => h.hull),
  unitPlural = 'hulls',
  measure = 'Mark-9 delay',
  units = 'd',
  differenceLabel = 'delay after the uprate minus delay before it',
  confidence: c0 = 0.95,
  digits = 2,
  showSimulator = true,
  label = 'ENGINEERING · PAIRED OR TWO SAMPLES',
  tone = 'engineering',
}: PairedExplorerProps = {}) {
  const [mode, setMode] = useState<Mode>('paired')
  const [confidence, setConfidence] = useState(c0)
  const [offsetSd, setOffsetSd] = useState(2.5)

  const firsts = useMemo(() => [...first], [first])
  const seconds = useMemo(() => [...second], [second])
  const n = Math.min(firsts.length, seconds.length)
  const differences = useMemo(() => pairedDifferences(firsts, seconds), [firsts, seconds])

  /* Both readings of the same numbers, always computed, so the toggle only chooses what is shown. */
  const paired = useMemo(() => pairedTTest(firsts, seconds, { alt: 'greater', random: true }), [firsts, seconds])
  const pairedTwoSided = useMemo(() => pairedTTest(firsts, seconds, { alt: 'two-sided', random: true }), [firsts, seconds])
  const pairedCi = useMemo(() => pairedTInterval(firsts, seconds, { confidence, random: true }), [firsts, seconds, confidence])
  const two = useMemo(() => twoMeanTest(firsts, seconds, { alt: 'greater', random: true }), [firsts, seconds])
  const twoTwoSided = useMemo(() => twoMeanTest(firsts, seconds, { alt: 'two-sided', random: true }), [firsts, seconds])
  const twoCi = useMemo(() => twoMeanInterval(firsts, seconds, { confidence, random: true }), [firsts, seconds, confidence])

  const isPaired = mode === 'paired'
  const shown = isPaired ? paired : two
  const shownTwoSided = isPaired ? pairedTwoSided : twoTwoSided
  const ci = (isPaired ? pairedCi : twoCi).ci as [number, number]
  const containsZero = ci[0] <= 0 && 0 <= ci[1]

  /* How much of each column's spread is the unit's own offset, and what it costs to keep it. */
  const r = useMemo(() => correlation(seconds, firsts), [seconds, firsts])
  const sdIfIndependent = Math.sqrt(sd(firsts) ** 2 + sd(seconds) ** 2)
  const sdOfDifferences = sd(differences)

  const sim = useMemo(() => simulate(offsetSd, mean(differences)), [offsetSd, differences])
  const seRatio = two.se / paired.se

  /* ---- Geometry: the before → after lines ---- */
  const slope = useChartFrame({ height: 260, yLabel: true })
  const valueDomain = useMemo<[number, number]>(() => padDomain([Math.min(...seconds, ...firsts), Math.max(...seconds, ...firsts)], 0.12), [seconds, firsts])
  const slopeY = useMemo(() => scaleLinear().domain(valueDomain).range([slope.innerHeight, 0]), [valueDomain, slope.innerHeight])
  const xLeft = slope.innerWidth * 0.2
  const xRight = slope.innerWidth * 0.8

  const pairTable = useMemo(
    () => ({
      columns: [unitPlural.replace(/s$/, ''), secondLabel, firstLabel, 'difference'],
      rows: Array.from({ length: n }, (_, i) => [rowNames[i] ?? `pair ${i + 1}`, fmt(seconds[i], digits), fmt(firsts[i], digits), fmt(differences[i], digits)]) as (string | number)[][],
      caption: `${fmtInt(n)} ${unitPlural}, ${measure} ${secondLabel} and ${firstLabel}, with the difference for each`,
    }),
    [unitPlural, secondLabel, firstLabel, n, rowNames, seconds, firsts, differences, digits, measure],
  )

  const slopeLegend: LegendItem[] = [
    { label: `${measure} rose`, color: semanticColor('rejected'), shape: 'line' },
    { label: `${measure} fell`, color: semanticColor('fit'), shape: 'line' },
  ]

  const slopeDescription =
    `One line per ${unitPlural.replace(/s$/, '')}: ${measure} ${secondLabel} on the left, ${firstLabel} on the right. ` +
    `${fmtInt(differences.filter((d) => d > 0).length)} of the ${fmtInt(n)} lines rise and ${fmtInt(differences.filter((d) => d <= 0).length)} fall. ` +
    `The mean difference is ${fmt(mean(differences), digits)} ${units}.`

  const sentence = isPaired
    ? `Paired: one number per ${unitPlural.replace(/s$/, '')}. ${fmtInt(n)} differences, mean ${fmt(paired.estimate, digits)} ${units}, standard error ${fmt(paired.se, 4)} on ${fmtInt(paired.df ?? n - 1)} degrees of freedom.`
    : `Two samples: the pairing discarded. ${fmtInt(firsts.length)} values against ${fmtInt(seconds.length)}, difference of means ${fmt(two.estimate, digits)} ${units}, standard error ${fmt(two.se, 4)} on ${fmt(two.df ?? 0, 2)} degrees of freedom.`

  return (
    <Panel
      label={label}
      status={`${isPaired ? 'PAIRED' : 'TWO SAMPLES'} · n = ${isPaired ? fmtInt(n) : `${fmtInt(firsts.length)} + ${fmtInt(seconds.length)}`}`}
      tone={tone}
      led={isPaired ? 'on' : 'warn'}
      ariaLabel="Paired explorer: the same two columns read as paired differences or as two independent samples"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="how to read these two columns"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'paired', label: 'treat as paired' },
              { value: 'two-sample', label: 'treat as two samples' },
            ]}
          />
          <Slider label="confidence level C" value={Math.round(confidence * 100)} min={80} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
        </div>

        <ReadoutGrid>
          <Readout label={`estimate (${units})`} value={fmt(shown.estimate, digits)} tone="engineering" live />
          <Readout label="standard error" value={fmt(shown.se, 4)} tone={isPaired ? 'engineering' : 'alert'} live />
          <Readout label="t" value={fmt(shown.statistic, 3)} size="sm" live />
          <Readout label="df" value={fmt(shown.df ?? 0, Number.isInteger(shown.df ?? 0) ? 0 : 2)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="p (one-sided, greater)" value={fmtP(shown.pValue ?? NaN)} size="sm" live />
          <Readout label="p (two-sided)" value={fmtP(shownTwoSided.pValue ?? NaN)} size="sm" live />
          <Readout label={`${fmtPct(confidence, 0)} lower`} value={fmt(ci[0], digits)} size="sm" live />
          <Readout label={`${fmtPct(confidence, 0)} upper`} value={fmt(ci[1], digits)} size="sm" live />
          <Readout label="interval contains 0" value={containsZero ? 'yes' : 'no'} tone={containsZero ? 'alert' : 'engineering'} size="sm" live />
        </ReadoutGrid>

        <Note tone={isPaired ? 'ok' : 'warn'} live>
          {sentence} The estimate is the same number in both readings, to the last decimal: {fmt(paired.estimate, 6)}. Everything else moves.
        </Note>

        {isPaired ? (
          <>
            <section aria-label="Each pair, before and after">
              <Subhead>
                Each {unitPlural.replace(/s$/, '')}, {secondLabel} → {firstLabel}
              </Subhead>
              <ChartSurface frame={slope} ariaLabel={`${measure} for each ${unitPlural.replace(/s$/, '')}, ${secondLabel} joined to ${firstLabel}`} description={slopeDescription} table={pairTable} footer={<Legend items={slopeLegend} ariaLabel="Direction of each pair" />}>
                <g transform={`translate(${slope.margin.left},${slope.margin.top})`}>
                  <YAxis scale={slopeY} width={slope.innerWidth} label={`${measure} (${units})`} format={(v) => fmt(v, 0)} />
                  <PlotClip frame={slope}>
                    {Array.from({ length: n }, (_, i) => {
                      const up = differences[i] > 0
                      const colour = up ? semanticColor('rejected') : semanticColor('fit')
                      return (
                        <g key={i}>
                          <line x1={xLeft} x2={xRight} y1={slopeY(seconds[i])} y2={slopeY(firsts[i])} stroke={colour} strokeWidth={chartTheme.stroke.line} opacity={0.75}>
                            <title>{`${rowNames[i] ?? `pair ${i + 1}`}: ${fmt(seconds[i], digits)} → ${fmt(firsts[i], digits)} ${units} (${fmt(differences[i], digits)})`}</title>
                          </line>
                          <circle cx={xLeft} cy={slopeY(seconds[i])} r={chartTheme.mark.dotR} fill={colour} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke" />
                          <circle cx={xRight} cy={slopeY(firsts[i])} r={chartTheme.mark.dotR} fill={colour} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke" />
                        </g>
                      )
                    })}
                  </PlotClip>
                  <text x={xLeft} y={slope.innerHeight + 18} textAnchor="middle" fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick} fill={chartTheme.color.label}>
                    {secondLabel}
                  </text>
                  <text x={xRight} y={slope.innerHeight + 18} textAnchor="middle" fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick} fill={chartTheme.color.label}>
                    {firstLabel}
                  </text>
                </g>
              </ChartSurface>
            </section>

            <section aria-label="The differences">
              <Subhead>The sample a paired procedure runs on</Subhead>
              <Dotplot
                values={differences}
                label={`${differenceLabel} (${units})`}
                references={[
                  { x: 0, label: 'no change · 0', color: 'null' },
                  { x: mean(differences), label: `d̄ = ${fmt(mean(differences), digits)}`, color: 'observed' },
                ]}
                height={180}
                ariaLabel={`Dotplot of the ${fmtInt(n)} differences, with zero and the mean difference marked`}
                description={`${fmtInt(n)} differences from ${fmt(Math.min(...differences), digits)} to ${fmt(Math.max(...differences), digits)} ${units}, mean ${fmt(mean(differences), digits)}, standard deviation ${fmt(sdOfDifferences, digits)}.`}
              />
              <Note>
                {fmtInt(n)} numbers, one per {unitPlural.replace(/s$/, '')}. Every condition a paired procedure needs is checked on <strong>this</strong> display, not on the two columns above
                it.
              </Note>
            </section>
          </>
        ) : (
          <>
            <section aria-label={`The ${secondLabel} column`}>
              <Subhead>{secondLabel}</Subhead>
              <Dotplot
                values={seconds}
                label={`${measure} (${units})`}
                domain={valueDomain}
                references={[{ x: mean(seconds), label: `x̄ = ${fmt(mean(seconds), digits)}`, color: 'reference' }]}
                height={160}
                ariaLabel={`Dotplot of ${measure} ${secondLabel}`}
                description={`${fmtInt(seconds.length)} values, mean ${fmt(mean(seconds), digits)} ${units}, standard deviation ${fmt(sd(seconds), digits)}.`}
              />
            </section>
            <section aria-label={`The ${firstLabel} column`}>
              <Subhead>{firstLabel}</Subhead>
              <Dotplot
                values={firsts}
                label={`${measure} (${units})`}
                domain={valueDomain}
                references={[{ x: mean(firsts), label: `x̄ = ${fmt(mean(firsts), digits)}`, color: 'reference' }]}
                height={160}
                ariaLabel={`Dotplot of ${measure} ${firstLabel}`}
                description={`${fmtInt(firsts.length)} values, mean ${fmt(mean(firsts), digits)} ${units}, standard deviation ${fmt(sd(firsts), digits)}.`}
              />
            </section>
            <Note tone="warn">
              Two piles of numbers with no line between them. The {unitPlural.replace(/s$/, '')} that sits far right in the first display is the same {unitPlural.replace(/s$/, '')} that sits
              far right in the second, and this reading has no way to know it.
            </Note>
          </>
        )}

        {/* ---- The difference axis: the interval for whichever reading is showing ---- */}
        <section aria-label="Conditions">
          <Subhead>Conditions for the {isPaired ? 'paired t procedure' : 'two-sample t procedure'}</Subhead>
          <ConditionList conditions={shown.conditions} />
        </section>

        <section aria-label="Where the standard error goes">
          <Subhead>Why the two standard errors differ</Subhead>
          <ReadoutGrid>
            <Readout label="SE · paired" value={fmt(paired.se, 4)} tone="engineering" />
            <Readout label="SE · two samples" value={fmt(two.se, 4)} tone="alert" />
            <Readout label="SE ratio (two ÷ paired)" value={fmt(seRatio, 2)} size="sm" />
            <Readout label="r between the columns" value={fmt(r, 3)} size="sm" />
          </ReadoutGrid>
          <Note>
            Each {unitPlural.replace(/s$/, '')} carries a standing offset of its own, and it appears in both columns. The two columns therefore move together: r = {fmt(r, 3)}. Subtracting one
            from the other removes that offset, so the differences have a standard deviation of {fmt(sdOfDifferences, digits)} {units} where two unrelated columns of this spread would give{' '}
            {fmt(sdIfIndependent, digits)}. The two-sample standard error is built from the second number and the paired standard error from the first, which is the whole of the gap between{' '}
            {fmt(two.se, 4)} and {fmt(paired.se, 4)}.
          </Note>
        </section>

        {showSimulator && (
          <section aria-label="Shared offset simulator">
            <Subhead>How much pairing buys, as the shared offset grows</Subhead>
            <div className="dr-controls">
              <Slider
                label={`shared per-${unitPlural.replace(/s$/, '')} offset, SD (${units})`}
                value={offsetSd}
                min={0}
                max={5}
                step={0.25}
                onChange={setOffsetSd}
                format={(v) => fmt(v, 2)}
              />
            </div>
            <ReadoutGrid>
              <Readout label="companion SE · paired" value={fmt(sim.pairedSe, 4)} size="sm" live />
              <Readout label="companion SE · two samples" value={fmt(sim.twoSampleSe, 4)} size="sm" live />
              <Readout label="SE ratio" value={fmt(sim.ratio, 2)} tone={sim.ratio > 1.5 ? 'engineering' : 'alert'} live />
            </ReadoutGrid>
            <Note live>
              {SIM_N} simulated pairs with the same shift and the same run-to-run noise, and a shared offset of {fmt(offsetSd, 2)} {units}. At an offset of zero the two readings cost about the
              same and the paired one spends degrees of freedom for nothing. Wind the offset up and the two-sample standard error grows with it while the paired one does not move.
            </Note>
          </section>
        )}
      </div>
    </Panel>
  )
}

/** The difference axis, exported for the module that wants the interval on its own. */
export function DifferenceAxis({
  lower,
  upper,
  estimate,
  confidence,
  axisLabel,
  digits = 2,
}: {
  lower: number
  upper: number
  estimate: number
  confidence: number
  axisLabel: string
  digits?: number
}) {
  const frame = useChartFrame({ height: 150 })
  const domain = padDomain([Math.min(0, lower), Math.max(0, upper)] as [number, number], 0.22)
  const x = scaleLinear().domain(domain).range([0, frame.innerWidth])
  const mid = frame.innerHeight / 2
  return (
    <ChartSurface
      frame={frame}
      ariaLabel={`The ${fmtPct(confidence, 0)} interval on a difference axis, with zero marked`}
      description={`The interval runs from ${fmt(lower, digits)} to ${fmt(upper, digits)} with a point estimate of ${fmt(estimate, digits)}. Zero lies ${lower <= 0 && 0 <= upper ? 'inside' : 'outside'} it.`}
      table={{
        columns: ['quantity', 'value'],
        rows: [
          ['point estimate', fmt(estimate, 5)],
          ['lower endpoint', fmt(lower, 5)],
          ['upper endpoint', fmt(upper, 5)],
        ] as (string | number)[][],
      }}
    >
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <PlotClip frame={frame}>
          <line x1={x(lower)} x2={x(upper)} y1={mid} y2={mid} stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line + 2} />
          {[lower, upper].map((end, i) => (
            <line key={i} x1={x(end)} x2={x(end)} y1={mid - 14} y2={mid + 14} stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
          ))}
          <circle cx={x(estimate)} cy={mid} r={chartTheme.mark.dotR} fill={semanticColor('observed')} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke" />
        </PlotClip>
        <ReferenceLine x={x(0)} height={frame.innerHeight} label="no difference · 0" color={semanticColor('null')} />
        <XAxis scale={x} height={frame.innerHeight} label={axisLabel} format={(v) => fmt(v, digits)} />
      </g>
    </ChartSurface>
  )
}
