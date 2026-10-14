/**
 * INTEL · ONE SIGNATURE, TWO PRIORS (act-10-02) — the reversed conditional, driven by the one
 * quantity the intercept does not contain.
 *
 * The signature is fixed. P(signature | a heavy hull working up) = 0.90 and P(signature | anything
 * else in a yard) = 0.05 are both on the slate and both stay where they are unless the learner
 * moves them. The control that matters is the third one, which is not in the message at all: how
 * often a heavy hull works up at Phobos in the first place.
 *
 *   the frequency box   ten thousand yard-months, split by the prior and then by the signature.
 *                       The posterior is one cell over a column total, and it is countable.
 *   the curve           the posterior across every prior from 0 to 1, with the measured rate and
 *                       the assumed one marked. The gap between those two reference lines is the
 *                       Book Two question, drawn.
 *
 * Nothing here is random and nothing is recomputed: `posterior`, `posteriorCurve` and
 * `frequencyBox` live in `./data`.
 */
import { useMemo, useState } from 'react'
import { line as d3Line, scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import {
  ChartSurface,
  Legend,
  PlotClip,
  Readout,
  ReferenceLine,
  Slider,
  XAxis,
  YAxis,
  chartTheme,
  semanticColor,
  seriesColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { fmt, fmtInt, fmtPct } from '@/lib/stats'
import {
  BASE_RATE_ASSUMED,
  BASE_RATE_MEASURED,
  FREQUENCY_BASE,
  P_SIGNATURE_GIVEN_BENIGN,
  P_SIGNATURE_GIVEN_HOSTILE,
  frequencyBox,
  posterior,
  posteriorCurve,
} from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export interface PosteriorExplorerProps {
  /** The base rate the panel opens on. Defaults to the measured Phobos rate. */
  prior?: number
  label?: string
  tone?: PanelTone
}

const CURVE_STEPS = 80

export function PosteriorExplorer({ prior: priorInitial = BASE_RATE_MEASURED, label = 'INTEL · ONE SIGNATURE, TWO PRIORS', tone = 'intel' }: PosteriorExplorerProps = {}) {
  /* Held per thousand so the slider lands exactly on 0.020 and 0.200. */
  const [perThousand, setPerThousand] = useState(Math.round(priorInitial * 1000))
  const [sensitivityPct, setSensitivityPct] = useState(Math.round(P_SIGNATURE_GIVEN_HOSTILE * 100))
  const [falseAlarmPct, setFalseAlarmPct] = useState(Math.round(P_SIGNATURE_GIVEN_BENIGN * 100))

  const prior = perThousand / 1000
  const sensitivity = sensitivityPct / 100
  const falseAlarm = falseAlarmPct / 100

  const row = useMemo(() => posterior(prior, sensitivity, falseAlarm), [prior, sensitivity, falseAlarm])
  const box = useMemo(() => frequencyBox(prior, sensitivity, falseAlarm), [prior, sensitivity, falseAlarm])
  const atMeasured = useMemo(() => posterior(BASE_RATE_MEASURED, sensitivity, falseAlarm), [sensitivity, falseAlarm])
  const atAssumed = useMemo(() => posterior(BASE_RATE_ASSUMED, sensitivity, falseAlarm), [sensitivity, falseAlarm])

  const curve = useMemo(() => posteriorCurve(sensitivity, falseAlarm, CURVE_STEPS), [sensitivity, falseAlarm])

  const frame = useChartFrame({ height: 250, yLabel: true })
  const cx = useMemo(() => scaleLinear().domain([0, 1]).range([0, frame.innerWidth]), [frame.innerWidth])
  const cy = useMemo(() => scaleLinear().domain([0, 1]).range([frame.innerHeight, 0]), [frame.innerHeight])
  const lineGen = useMemo(
    () =>
      d3Line<{ prior: number; posterior: number }>()
        .x((d) => cx(d.prior))
        .y((d) => cy(d.posterior)),
    [cx, cy],
  )

  const curveTable = useMemo(
    () => ({
      columns: ['base rate P(working up)', 'P(working up | this signature)'],
      rows: curve.filter((_, i) => i % 5 === 0).map((p) => [fmt(p.prior, 3), fmt(p.posterior, 3)] as (string | number)[]),
      caption: `Posterior probability that a heavy hull is working up, given this signature, across every base rate, at P(signature | working up) = ${fmt(sensitivity, 2)} and P(signature | not) = ${fmt(falseAlarm, 2)}`,
    }),
    [curve, sensitivity, falseAlarm],
  )

  const legend: LegendItem[] = [
    { label: 'P(working up | this signature)', color: seriesColor(0), shape: 'line' },
    { label: `measured at Phobos · ${fmt(BASE_RATE_MEASURED, 3)} → ${fmt(atMeasured.posterior, 3)}`, color: semanticColor('reference'), shape: 'dashed' },
    { label: `the rate PROVIDENT assumed · ${fmt(BASE_RATE_ASSUMED, 2)} → ${fmt(atAssumed.posterior, 3)}`, color: semanticColor('reference'), shape: 'dashed' },
  ]

  const boxRows: (string | number)[][] = [
    [
      'a heavy hull working up',
      fmt(box.hostile, 1),
      fmt(box.hostileWithSignature, 1),
      fmt(box.hostile - box.hostileWithSignature, 1),
    ],
    [
      'anything else in the yard',
      fmt(box.benign, 1),
      fmt(box.benignWithSignature, 1),
      fmt(box.benign - box.benignWithSignature, 1),
    ],
    ['total', fmt(box.base, 1), fmt(box.withSignature, 1), fmt(box.base - box.withSignature, 1)],
  ]

  return (
    <Panel
      label={label}
      tone={tone}
      led="on"
      status={`P(HOSTILE | SIGNATURE) = ${fmt(row.posterior, 3)}`}
      ariaLabel="Posterior probability of a heavy hull working up given the Phobos drive signature, as a function of the base rate"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider
            label="base rate · how often a heavy hull works up at Phobos"
            value={perThousand}
            min={0}
            max={500}
            step={5}
            onChange={setPerThousand}
            format={(v) => fmt(v / 1000, 3)}
          />
          <Slider label="P(this signature | working up)" value={sensitivityPct} min={50} max={99} step={1} onChange={setSensitivityPct} format={(v) => fmt(v / 100, 2)} />
          <Slider label="P(this signature | anything else)" value={falseAlarmPct} min={1} max={30} step={1} onChange={setFalseAlarmPct} format={(v) => fmt(v / 100, 2)} />
          <button type="button" className="dr-btn dr-btn--sm" onClick={() => setPerThousand(Math.round(BASE_RATE_MEASURED * 1000))}>
            MEASURED · {fmt(BASE_RATE_MEASURED, 3)}
          </button>
          <button type="button" className="dr-btn dr-btn--sm" onClick={() => setPerThousand(Math.round(BASE_RATE_ASSUMED * 1000))}>
            ASSUMED · {fmt(BASE_RATE_ASSUMED, 2)}
          </button>
        </div>

        <ReadoutGrid>
          <Readout label="base rate · P(working up)" value={fmt(prior, 3)} tone="intel" live />
          <Readout label="P(this signature)" value={fmt(row.evidence, 4)} size="sm" live />
          <Readout label="P(working up | this signature)" value={fmt(row.posterior, 3)} tone="intel" live />
          <Readout label="P(this signature | working up)" value={fmt(sensitivity, 2)} size="sm" live />
        </ReadoutGrid>

        <section aria-label="Natural frequencies">
          <Subhead>The same arithmetic, counted out of {fmtInt(FREQUENCY_BASE)} yard-months</Subhead>
          <KeyTable
            ariaLabel="Natural frequency box: yard-months split by whether a heavy hull is working up and by whether this signature appears"
            caption={`At a base rate of ${fmt(prior, 3)}, out of ${fmtInt(FREQUENCY_BASE)} yard-months at Phobos`}
            columns={['what is happening', 'yard-months', 'of those, showing this signature', 'not showing it']}
            rows={boxRows}
            emphasisRow={2}
          />
          <Note live>
            {fmt(box.withSignature, 1)} yard-months in {fmtInt(FREQUENCY_BASE)} show this signature, and {fmt(box.hostileWithSignature, 1)} of those are a heavy hull working up. That ratio is
            the posterior: {fmt(box.hostileWithSignature, 1)} ÷ {fmt(box.withSignature, 1)} = {fmt(row.posterior, 3)}. The numerator is one cell. The denominator is the column that cell sits
            in, and it is mostly the other row.
          </Note>
        </section>

        <section aria-label="Posterior against base rate">
          <Subhead>The same signature, read against every base rate</Subhead>
          <ChartSurface
            frame={frame}
            ariaLabel="Posterior probability against base rate, with the measured Phobos rate and the assumed rate marked"
            description={`The posterior probability that a heavy hull is working up given this signature, plotted against the base rate. At a base rate of ${fmt(BASE_RATE_MEASURED, 3)} the posterior is ${fmt(atMeasured.posterior, 3)}; at ${fmt(BASE_RATE_ASSUMED, 2)} it is ${fmt(atAssumed.posterior, 3)}. The curve rises steeply over the smallest base rates and flattens. The data table gives the posterior at every twentieth of the range.`}
            table={curveTable}
            footer={<Legend items={legend} ariaLabel="Posterior curve key" />}
          >
            <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
              <YAxis scale={cy} width={frame.innerWidth} ticks={5} label="P(working up | this signature)" grid />
              <PlotClip frame={frame}>
                <path className="dr-mark dr-mark--line" d={lineGen(curve) ?? ''} fill="none" stroke={seriesColor(0)} strokeWidth={chartTheme.stroke.line} strokeLinejoin="round">
                  <title>posterior against base rate</title>
                </path>
                <circle cx={cx(prior)} cy={cy(row.posterior)} r={5} fill={semanticColor('observed')}>
                  <title>{`base rate ${fmt(prior, 3)} · posterior ${fmt(row.posterior, 3)}`}</title>
                </circle>
              </PlotClip>
              <ReferenceLine x={cx(BASE_RATE_MEASURED)} height={frame.innerHeight} label={fmt(BASE_RATE_MEASURED, 3)} color={semanticColor('reference')} />
              <ReferenceLine x={cx(BASE_RATE_ASSUMED)} height={frame.innerHeight} label={fmt(BASE_RATE_ASSUMED, 2)} color={semanticColor('reference')} />
              <XAxis scale={cx} height={frame.innerHeight} label="base rate · P(a heavy hull is working up)" format={(v) => fmt(v, 2)} />
            </g>
          </ChartSurface>
          <Note live>
            The two marked lines are the same message read by two people. At the rate the Phobos yards have actually run over ten years, {fmt(BASE_RATE_MEASURED, 3)}, the signature puts the
            posterior at {fmtPct(atMeasured.posterior, 0)}. At {fmt(BASE_RATE_ASSUMED, 2)} it puts it at {fmtPct(atAssumed.posterior, 0)}. Neither reading changes P(signature | working up),
            which is {fmt(sensitivity, 2)} in both and is the only number the intercept itself supplies.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
