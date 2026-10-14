/**
 * TACTICAL · SLOPE CAPTURE (act-9-02) — what a confidence level is a statement about.
 *
 * The 881 Perrine departures that came home are the population, and their true slope is the
 * physics: one tonne of fuel per tonne the plotted profile required. Draw n of them, fit the line,
 * build b ± t*·SE(b), and draw the interval as a segment against that vertical line. Most cover it.
 * The ones that miss are not mistakes — they are the advertised failure rate, arriving.
 *
 * What the learner does: runs one interval at a time and watches an individual interval either
 * cover 1.00 or not; runs fifty and watches the rate settle near the level on the dial; moves the
 * level and watches the segments lengthen and the misses thin out; moves n and watches them shorten
 * without the rate changing. The level is a property of the procedure, not of any one interval.
 *
 * Deterministic: interval k is `rng('act-9-02/capture', k)`, so the same click sequence produces
 * the same picture. Endpoints come from `slopeInterval` in `@/lib/stats`.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import { ChartSurface, Legend, PlotClip, Readout, ReferenceLine, Segmented, Slider, XAxis, YAxis, chartTheme, padDomain, semanticColor, useChartFrame, type LegendItem } from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtPct, slopeInterval } from '@/lib/stats'
import { SLOPE_SIM_N, honest881 } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

/** The physics the intervals are trying to cover: one tonne of fuel per tonne required. */
const BETA_TRUE = 1

/** Most recent intervals drawn. Counts run over every interval ever built in this panel. */
const SHOWN_MAX = 60

const N_MIN = 8
const N_MAX = 80

type Level = '90' | '95' | '99'

const LEVELS: readonly { value: Level; label: string }[] = [
  { value: '90', label: '90%' },
  { value: '95', label: '95%' },
  { value: '99', label: '99%' },
]

interface Capture {
  index: number
  b: number
  lo: number
  hi: number
  covers: boolean
}

interface Board {
  shown: Capture[]
  total: number
  covered: number
  next: number
}

const EMPTY: Board = { shown: [], total: 0, covered: 0, next: 0 }

function buildInterval(index: number, n: number, confidence: number): Capture {
  const r = rng('act-9-02/capture', index)
  const idx = r.sample([...Array(honest881.length).keys()], n)
  const xs = idx.map((i) => honest881[i].requiredFuel)
  const ys = idx.map((i) => honest881[i].fuelLoaded)
  const result = slopeInterval(xs, ys, { confidence, random: true, populationSize: honest881.length })
  const [lo, hi] = result.ci as [number, number]
  return { index, b: result.b, lo, hi, covers: lo <= BETA_TRUE && BETA_TRUE <= hi }
}

export interface SlopeCaptureSimulatorProps {
  label?: string
  tone?: PanelTone
}

export function SlopeCaptureSimulator({ label = 'TACTICAL · SLOPE CAPTURE', tone = 'tactical' }: SlopeCaptureSimulatorProps = {}) {
  const [n, setN] = useState(SLOPE_SIM_N)
  const [level, setLevel] = useState<Level>('95')
  const [board, setBoard] = useState<Board>(EMPTY)

  const confidence = Number(level) / 100

  const run = (count: number) => {
    setBoard((prev) => {
      const fresh: Capture[] = []
      for (let k = 0; k < count; k++) fresh.push(buildInterval(prev.next + k, n, confidence))
      return {
        shown: [...prev.shown, ...fresh].slice(-SHOWN_MAX),
        total: prev.total + count,
        covered: prev.covered + fresh.filter((c) => c.covers).length,
        next: prev.next + count,
      }
    })
  }

  /** Mixing sample sizes or levels on one board would make the rate meaningless. */
  const changeN = (v: number) => {
    setN(v)
    setBoard(EMPTY)
  }
  const changeLevel = (v: Level) => {
    setLevel(v)
    setBoard(EMPTY)
  }

  const rate = board.total > 0 ? board.covered / board.total : NaN
  const missed = board.total - board.covered
  const latest = board.shown.length > 0 ? board.shown[board.shown.length - 1] : null

  const frame = useChartFrame({ height: 380, yLabel: true })
  const domain = useMemo<[number, number]>(() => {
    if (board.shown.length === 0) return [BETA_TRUE - 0.1, BETA_TRUE + 0.1]
    const l = Math.min(BETA_TRUE, ...board.shown.map((c) => c.lo))
    const h = Math.max(BETA_TRUE, ...board.shown.map((c) => c.hi))
    return padDomain([l, h] as [number, number], 0.06)
  }, [board.shown])
  const cx = useMemo(() => scaleLinear().domain(domain).range([0, frame.innerWidth]), [domain, frame.innerWidth])
  const cy = useMemo(() => scaleLinear().domain([0.5, SHOWN_MAX + 0.5]).range([0, frame.innerHeight]), [frame.innerHeight])

  const legend: LegendItem[] = [
    { label: `covers β = ${fmt(BETA_TRUE, 2)}`, color: semanticColor('fit'), shape: 'line' },
    { label: 'misses it', color: semanticColor('rejected'), shape: 'line' },
    { label: `the true slope, ${fmt(BETA_TRUE, 2)} t/t`, color: semanticColor('reference'), shape: 'dashed' },
  ]

  const description =
    board.total === 0
      ? `An empty interval board. Each run will draw ${fmtInt(n)} honest Perrine departures, fit fuel loaded on required fuel, and draw the ${fmtPct(confidence, 0)} t-interval for the slope as a horizontal segment against the true slope of ${fmt(BETA_TRUE, 2)}.`
      : `${fmtInt(board.shown.length)} of ${fmtInt(board.total)} ${fmtPct(confidence, 0)} slope intervals, each from a fresh sample of ${fmtInt(n)} honest Perrine departures, drawn as horizontal segments against the true slope of ${fmt(BETA_TRUE, 2)}. ` +
        `Over every interval built, ${fmtInt(board.covered)} of ${fmtInt(board.total)} cover it — a rate of ${fmtPct(rate, 1)} against a nominal ${fmtPct(confidence, 0)}. The data table lists the most recent intervals.`

  return (
    <Panel
      label={label}
      status={board.total === 0 ? `READY · ${fmtPct(confidence, 0)} · n ${fmtInt(n)}` : `${fmtInt(board.covered)} / ${fmtInt(board.total)} COVER · ${fmtPct(rate, 1)}`}
      tone={tone}
      led={board.total === 0 ? 'off' : 'on'}
      ariaLabel="Slope capture simulator: repeated confidence intervals for a slope whose true value is known"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider label="departures per sample (n)" value={n} min={N_MIN} max={N_MAX} step={1} onChange={changeN} format={fmtInt} />
          <Segmented<Level> label="confidence level C" value={level} options={LEVELS} onChange={changeLevel} />
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => run(1)}>
            RUN 1
          </button>
          <button type="button" className="dr-btn dr-btn--primary dr-btn--sm" onClick={() => run(50)}>
            RUN 50
          </button>
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setBoard(EMPTY)} disabled={board.total === 0}>
            RESET
          </button>
        </div>

        <ReadoutGrid>
          <Readout label="intervals run" value={fmtInt(board.total)} tone="tactical" live />
          <Readout label={`intervals covering ${fmt(BETA_TRUE, 2)}`} value={fmtInt(board.covered)} tone="tactical" live />
          <Readout label="observed capture rate" value={board.total > 0 ? fmtPct(rate, 1) : '—'} tone={board.total > 0 && Math.abs(rate - confidence) > 0.08 ? 'alert' : 'tactical'} live />
          <Readout label="nominal level" value={fmtPct(confidence, 0)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="intervals that missed" value={fmtInt(missed)} size="sm" live />
          <Readout label="latest b" value={latest ? fmt(latest.b, 4) : '—'} size="sm" live />
          <Readout label="latest interval" value={latest ? `(${fmt(latest.lo, 4)}, ${fmt(latest.hi, 4)})` : '—'} size="sm" live />
          <Readout label="latest verdict" value={latest ? (latest.covers ? 'covers' : 'MISSES') : '—'} tone={latest && !latest.covers ? 'alert' : 'default'} size="sm" live />
        </ReadoutGrid>

        <ChartSurface
          frame={frame}
          ariaLabel={`${fmtPct(confidence, 0)} confidence intervals for the slope, drawn against the true slope of ${fmt(BETA_TRUE, 2)}`}
          description={description}
          table={{
            columns: ['interval', 'b', 'lower', 'upper', `covers ${fmt(BETA_TRUE, 2)}`],
            rows: board.shown.map((c) => [fmtInt(c.index + 1), fmt(c.b, 4), fmt(c.lo, 4), fmt(c.hi, 4), c.covers ? 'yes' : 'NO']),
            caption: `the most recent ${fmtInt(board.shown.length)} of ${fmtInt(board.total)} intervals, samples of ${fmtInt(n)} honest departures`,
          }}
          footer={<Legend items={legend} ariaLabel="Capture key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={cy} width={frame.innerWidth} ticks={[1, 15, 30, 45, 60]} label="interval (most recent last)" grid={false} />
            <PlotClip frame={frame}>
              {board.shown.map((c, i) => {
                const y = cy(i + 1)
                const colour = c.covers ? semanticColor('fit') : semanticColor('rejected')
                return (
                  <g key={i}>
                    <line x1={cx(c.lo)} x2={cx(c.hi)} y1={y} y2={y} stroke={colour} strokeWidth={c.covers ? chartTheme.stroke.hair + 1 : chartTheme.stroke.line} strokeLinecap="round">
                      <title>{`interval ${fmtInt(c.index + 1)}: b ${fmt(c.b, 4)}, (${fmt(c.lo, 4)}, ${fmt(c.hi, 4)}) — ${c.covers ? 'covers' : 'misses'}`}</title>
                    </line>
                    <circle cx={cx(c.b)} cy={y} r={1.6} fill={colour} />
                  </g>
                )
              })}
            </PlotClip>
            <ReferenceLine x={cx(BETA_TRUE)} height={frame.innerHeight} label={`β = ${fmt(BETA_TRUE, 2)} t/t`} color={semanticColor('reference')} />
            <XAxis scale={cx} height={frame.innerHeight} label="slope b · tonnes of fuel per tonne required" format={(v) => fmt(v, 2)} />
          </g>
        </ChartSurface>

        <Note tone={board.total === 0 ? 'muted' : missed > 0 ? 'warn' : 'ok'} live>
          {board.total === 0
            ? `Nothing run yet. Press RUN 1 to build one interval from ${fmtInt(n)} honest departures, or RUN 50 to build fifty. Changing n or the level clears the board, because a capture rate mixed across two procedures counts nothing.`
            : `${fmtInt(board.covered)} of ${fmtInt(board.total)} intervals cover ${fmt(BETA_TRUE, 2)}, a rate of ${fmtPct(rate, 1)} against the ${fmtPct(confidence, 0)} on the dial. ${
                missed === 0
                  ? 'None has missed yet; run more and some will.'
                  : `The ${fmtInt(missed)} that missed were built by exactly the same arithmetic as the others. The level is a property of the procedure over many samples, and it says nothing about whether the one interval in front of you is right.`
              }`}
        </Note>

        <section aria-label="What each level and sample size costs">
          <Subhead>The advertised rate against the observed one</Subhead>
          <KeyTable
            ariaLabel="Nominal level, expected number of covering intervals and the observed count"
            caption={`${fmtInt(board.total)} intervals at n = ${fmtInt(n)}`}
            columns={['quantity', 'value']}
            rows={[
              ['nominal level', fmtPct(confidence, 0)],
              ['intervals run', fmtInt(board.total)],
              ['expected to cover', board.total > 0 ? fmt(board.total * confidence, 1) : '—'],
              ['observed to cover', fmtInt(board.covered)],
              ['observed rate', board.total > 0 ? fmtPct(rate, 1) : '—'],
              ['expected to miss', board.total > 0 ? fmt(board.total * (1 - confidence), 1) : '—'],
              ['observed to miss', fmtInt(missed)],
            ]}
            emphasisRow={4}
          />
          <Note>
            A higher level buys coverage with width; more departures buy width back without touching coverage. Neither changes what the number means: {fmtPct(confidence, 0)} of intervals
            built this way cover the true slope, and this board is the only place you will ever be told which ones did.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
