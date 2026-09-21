/**
 * TACTICAL · MARGIN PLANNER (act-6-02) — the Lane's rate with an honest margin, on a number line,
 * against the two baselines anybody will read it against.
 *
 * Three controls, one question each:
 *   · n  — how many transits the estimate stands on. The margin falls as 1/√n, and the panel says
 *          how many more seasons each step costs.
 *   · C  — the confidence level. Wider is not more precise; it is less precise and more often right.
 *   · target margin — the sample-size solver, run backwards through `transitsForMargin`
 *          (`sampleSizeForProportion` in '@/lib/stats') and converted to years at the Lane's own
 *          435 transits a year.
 *
 * Every number on the panel comes from '@/instruments/act-6/data' or '@/lib/stats':
 *   margin        laneMargin(n, C)              = marginOfErrorProportion(p̂, n, C)
 *   endpoints     p̂ ± margin, p̂ = LANE_RATE     (identical to LANE_INTERVAL at n = 2,612, C = 95 %)
 *   transits      transitsForMargin(m, C)       = ⌈p̂(1 − p̂)(z⋆ ÷ m)²⌉
 *   baselines     ROOK_BASELINE, BOARD_BASELINE (DS-08, computed by rateOf)
 * Nothing here is typed in, and nothing here calls Math.random — the panel is deterministic.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import {
  ChartSurface,
  Legend,
  NumberField,
  PlotClip,
  Readout,
  ReferenceLine,
  Slider,
  XAxis,
  chartTheme,
  padDomain,
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { fmt, fmtInt, fmtPct, zStar } from '@/lib/stats'
import { BOARD_BASELINE, LANE_LOSSES, LANE_RATE, LANE_TRANSITS, ROOK_BASELINE, TRANSITS_PER_YEAR, laneMargin, transitsForMargin } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

/** AP Large Counts for an interval: successes and failures at least ten. */
const LARGE_COUNTS_MIN = 10
/** Horizons the planner prices, in further years of Lane traffic. */
const HORIZONS = [1, 3, 5, 10] as const
/** The solver's target margin on load, in percentage points — deliberately not the report's target. */
const DEFAULT_TARGET_POINTS = 0.5

export interface MarginPlannerProps {
  /** Transits behind the estimate on load. */
  n?: number
  /** Confidence level on load. */
  confidence?: number
}

export function MarginPlanner({ n: n0 = LANE_TRANSITS, confidence: c0 = 0.95 }: MarginPlannerProps = {}) {
  const [n, setN] = useState(n0)
  const [confidence, setConfidence] = useState(c0)
  const [targetPoints, setTargetPoints] = useState(DEFAULT_TARGET_POINTS)

  /* ---- The interval ---- */
  const phat = LANE_RATE
  const margin = laneMargin(n, confidence)
  const lower = phat - margin
  const upper = phat + margin
  const z = zStar(confidence)
  const se = margin / z

  const clearsRook = lower > ROOK_BASELINE
  const clearsBoard = lower > BOARD_BASELINE

  const successes = n * phat
  const failures = n * (1 - phat)
  const largeCounts = successes >= LARGE_COUNTS_MIN && failures >= LARGE_COUNTS_MIN

  /* ---- The solver ---- */
  const targetMargin = targetPoints / 100
  const neededTransits = transitsForMargin(targetMargin, confidence)
  const extraTransits = Math.max(0, neededTransits - LANE_TRANSITS)
  const extraYears = extraTransits / TRANSITS_PER_YEAR

  const horizons = useMemo(
    () =>
      HORIZONS.map((years) => {
        const transits = LANE_TRANSITS + years * TRANSITS_PER_YEAR
        return { years, transits, margin: laneMargin(transits, confidence) }
      }),
    [confidence],
  )

  /* ---- Geometry: one number line ---- */
  const frame = useChartFrame({ height: 200 })
  const domain = useMemo<[number, number]>(
    () => padDomain([Math.min(lower, ROOK_BASELINE), Math.max(upper, BOARD_BASELINE)] as [number, number], 0.18),
    [lower, upper],
  )
  const xs = useMemo(() => scaleLinear().domain(domain).range([0, frame.innerWidth]), [domain, frame.innerWidth])
  const mid = frame.innerHeight / 2

  const table = useMemo(
    () => ({
      columns: ['quantity', 'loss rate per transit'],
      rows: [
        ['sample rate p̂', fmt(phat, 5)],
        ['lower endpoint', fmt(lower, 5)],
        ['upper endpoint', fmt(upper, 5)],
        ['margin of error', fmt(margin, 5)],
        ["Rook's 2176 baseline", fmt(ROOK_BASELINE, 5)],
        ["the Board's Mars–Belt baseline", fmt(BOARD_BASELINE, 5)],
      ] as (string | number)[][],
      caption: `${fmtPct(confidence, 0)} one-proportion z-interval for the Lane's loss rate from ${fmtInt(n)} transits, against the two baselines`,
    }),
    [phat, lower, upper, margin, confidence, n],
  )

  const legend: LegendItem[] = [
    { label: `the interval, p̂ ± ${fmt(margin, 5)}`, color: semanticColor('fit'), shape: 'line' },
    { label: `p̂ = ${fmt(phat, 5)}`, color: semanticColor('observed'), shape: 'dot' },
    { label: `Rook's 2176 rate, ${fmtPct(ROOK_BASELINE, 2)}`, color: semanticColor('null'), shape: 'dashed' },
    { label: `the Board's corridor, ${fmtPct(BOARD_BASELINE, 2)}`, color: semanticColor('rejected'), shape: 'dashed' },
  ]

  const description = `A number line carrying the ${fmtPct(confidence, 0)} one-proportion z-interval for the Lane's loss rate, built on ${fmtInt(n)} transits at a sample rate of ${fmt(phat, 5)}. The interval runs from ${fmt(lower, 5)} to ${fmt(upper, 5)}, a margin of error of ${fmt(margin, 5)}, that is ${fmt(margin * 100, 3)} percentage points, with a critical value of ${fmt(z, 3)} and a standard error of ${fmt(se, 5)}. Rook's 2176 baseline of ${fmt(ROOK_BASELINE, 5)} lies ${clearsRook ? 'below' : 'inside or above'} the interval; the Board's Mars–Belt baseline of ${fmt(BOARD_BASELINE, 5)} lies ${clearsBoard ? 'below' : 'inside or above'} it. A margin of ${fmt(targetMargin, 5)} would need ${fmtInt(neededTransits)} transits in all, ${fmtInt(extraTransits)} more than the Ledger holds, which is ${fmt(extraYears, 1)} further years at ${fmtInt(TRANSITS_PER_YEAR)} transits a year.`

  return (
    <Panel
      label="TACTICAL · MARGIN PLANNER"
      status={`${fmtPct(confidence, 0)} · n = ${fmtInt(n)}`}
      tone="tactical"
      led={largeCounts ? 'on' : 'warn'}
      ariaLabel="Margin planner: the Lane's loss-rate interval on a number line against two baselines, with a sample-size solver"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider label="transits behind the estimate (n)" value={n} min={200} max={12000} step={1} onChange={setN} format={fmtInt} />
          <Slider label="confidence level C" value={Math.round(confidence * 100)} min={50} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
        </div>

        <ReadoutGrid>
          <Readout label="p̂ · losses per transit" value={fmt(phat, 5)} tone="tactical" />
          <Readout label="z*" value={fmt(z, 3)} size="sm" live />
          <Readout label="SE · √(p̂(1 − p̂)/n)" value={fmt(se, 5)} size="sm" live />
          <Readout label="margin of error" value={fmt(margin, 5)} tone="tactical" live />
          <Readout label="margin · percentage points" value={fmt(margin * 100, 3)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="lower endpoint" value={fmt(lower, 5)} tone="tactical" live />
          <Readout label="upper endpoint" value={fmt(upper, 5)} tone="tactical" live />
          <Readout label={`clears Rook's ${fmtPct(ROOK_BASELINE, 2)}`} value={clearsRook ? 'yes' : 'no'} tone={clearsRook ? 'tactical' : 'alert'} size="sm" live />
          <Readout label={`clears the Board's ${fmtPct(BOARD_BASELINE, 2)}`} value={clearsBoard ? 'yes' : 'no'} tone={clearsBoard ? 'tactical' : 'alert'} size="sm" live />
          <Readout label="Large Counts · both ≥ 10" value={largeCounts ? 'holds' : 'FAILS'} tone={largeCounts ? 'tactical' : 'alert'} size="sm" live />
        </ReadoutGrid>

        <ChartSurface
          frame={frame}
          ariaLabel={`The ${fmtPct(confidence, 0)} interval for the Lane's loss rate on a number line, with Rook's baseline and the Board's corridor marked`}
          description={description}
          table={table}
          footer={<Legend items={legend} ariaLabel="Margin planner key" />}
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
              <circle
                cx={xs(phat)}
                cy={mid}
                r={chartTheme.mark.dotR}
                fill={semanticColor('observed')}
                stroke={chartTheme.color.ring}
                strokeWidth={chartTheme.mark.ring}
                paintOrder="stroke"
              >
                <title>{`p̂ = ${fmt(phat, 5)} — ${fmtInt(LANE_LOSSES)} losses in ${fmtInt(LANE_TRANSITS)} transits`}</title>
              </circle>
            </PlotClip>
            <ReferenceLine x={xs(ROOK_BASELINE)} height={frame.innerHeight} label={`Rook 2176 · ${fmtPct(ROOK_BASELINE, 2)}`} color={semanticColor('null')} />
            <ReferenceLine x={xs(BOARD_BASELINE)} height={frame.innerHeight} label={`Board · ${fmtPct(BOARD_BASELINE, 2)}`} color={semanticColor('rejected')} anchor="end" />
            <XAxis scale={xs} height={frame.innerHeight} label="loss rate per transit" format={(v) => fmt(v, 4)} />
          </g>
        </ChartSurface>

        <Note tone={clearsBoard ? 'ok' : clearsRook ? 'warn' : 'alert'} live>
          At n = {fmtInt(n)} and {fmtPct(confidence, 0)}, the interval runs {fmt(lower, 5)} to {fmt(upper, 5)}. It {clearsRook ? 'sits entirely above' : 'reaches down past'} Rook&rsquo;s{' '}
          {fmtPct(ROOK_BASELINE, 2)} and {clearsBoard ? 'entirely above' : 'still reaches down past'} the Board&rsquo;s {fmtPct(BOARD_BASELINE, 2)}. A value the interval contains is a value
          the data cannot rule out; it is not a value the data has established.
        </Note>

        <section aria-label="Sample-size solver">
          <Subhead>Solver · how many transits a margin costs</Subhead>
          <div className="dr-controls">
            <NumberField label="target margin (percentage points)" value={targetPoints} onChange={(v) => setTargetPoints(Math.min(2, Math.max(0.05, v)))} min={0.05} max={2} step={0.05} units="pts" />
          </div>
          <ReadoutGrid>
            <Readout label="target margin" value={fmt(targetMargin, 5)} size="sm" live />
            <Readout label="transits needed in all" value={fmtInt(neededTransits)} tone="tactical" live />
            <Readout label="beyond the Ledger's 2,612" value={fmtInt(extraTransits)} size="sm" live />
            <Readout label={`years at ${fmtInt(TRANSITS_PER_YEAR)} a year`} value={fmt(extraYears, 1)} tone={extraYears > 5 ? 'alert' : 'tactical'} live />
          </ReadoutGrid>
          <Note live>
            n = p̂(1 − p̂)(z*/m)², rounded up: a margin of {fmt(targetMargin, 5)} at {fmtPct(confidence, 0)} needs {fmtInt(neededTransits)} transits. Halving the margin does not cost twice
            the transits — it costs four times, because n sits under a square root in the margin and therefore squared in the solver.
          </Note>
          <KeyTable
            caption={`What waiting buys, at ${fmtPct(confidence, 0)} and the Lane's observed rate`}
            ariaLabel="Margin of error after further years of Lane traffic"
            columns={['further years', 'transits in all', 'margin of error', 'margin · points']}
            rows={horizons.map((h) => [fmtInt(h.years), fmtInt(h.transits), fmt(h.margin, 5), fmt(h.margin * 100, 3)])}
          />
        </section>
      </div>
    </Panel>
  )
}
