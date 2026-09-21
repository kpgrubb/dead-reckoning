/**
 * INTEL · CAPTURE SIMULATOR (act-6-01) — "what 95% confidence commits you to."
 *
 * A hundred seasons of Lane traffic, a hundred intervals, the truth drawn as a line through them.
 * The learner moves the confidence level C and the season size n and watches two counters disagree
 * in an instructive way: the hundred intervals on the screen wobble around the level, and five
 * thousand more, run in the same worker, do not.
 *
 * Where every number comes from:
 *   · the p̂'s are drawn in the Monte Carlo worker (`runSimulation`, task 'sample-proportion',
 *     params { n, p }), never here — 100 of them, one per season;
 *   · each interval is then built on the main thread by `onePropInterval` from '@/lib/stats', so the
 *     endpoints on the screen are the course's own endpoints and not a second implementation;
 *   · the long-run capture readout is a separate 5,000-replication run of the worker's 'ci-capture'
 *     task, which builds and checks its own intervals — the point of the panel is that the two
 *     counters answer the same question at different sample sizes.
 *
 * The seed is fixed (`seedFrom`) and only RESEED changes it, so the same hundred seasons stay on the
 * screen while C moves: the intervals get wider, the p̂'s do not move, and more of them cover the
 * line. Nothing calls Math.random.
 *
 * Honesty note the module leans on: at a season of 435 transits the Lane's rate gives an expected
 * 5.2 losses, Large Counts fails, and the Wald interval's real capture rate comes out below the
 * level on the dial. The panel says so rather than rounding it away — that is what the condition is
 * for, and pushing n up to the Ledger's 2,612 brings the capture rate back to the level.
 */
import { useEffect, useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
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
  padDomain,
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { seedFrom } from '@/lib/rng'
import { runSimulation } from '@/lib/sim'
import { fmt, fmtInt, fmtPct, onePropInterval, zStar } from '@/lib/stats'
import { LANE_RATE, LANE_TRANSITS, TRANSITS_PER_YEAR } from './data'
import { Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

/** One interval per simulated season; a hundred seasons is a century of Lane traffic. */
export const INTERVALS = 100
/** The second, larger run: enough replications that the capture rate stops wobbling. */
export const LONG_RUN = 5000
/** AP Large Counts for an interval: successes and failures at least ten. */
const LARGE_COUNTS_MIN = 10
/** Exported so a test can rebuild exactly the century the panel is showing. */
export const SEED_KEY = 'act-6-01/capture'

export interface CaptureSimulatorProps {
  /** Confidence level on load. */
  confidence?: number
  /** Transits in one simulated season. */
  n?: number
  /** The true rate the seasons are drawn from. */
  truth?: number
}

interface Built {
  season: number
  phat: number
  lo: number
  hi: number
  width: number
  captures: boolean
}

export function CaptureSimulator({ confidence: c0 = 0.95, n: n0 = TRANSITS_PER_YEAR, truth = LANE_RATE }: CaptureSimulatorProps = {}) {
  const [confidence, setConfidence] = useState(c0)
  const [n, setN] = useState(n0)
  const [generation, setGeneration] = useState(0)
  const [phats, setPhats] = useState<number[]>([])
  const [longRun, setLongRun] = useState<{ done: number; captured: number }>({ done: 0, captured: 0 })

  /* ---- The hundred seasons. Drawn in the worker; the seed ignores C, so moving C rewidens the
         same hundred intervals instead of dealing a new century. ---- */
  useEffect(() => {
    setPhats([])
    const handle = runSimulation({
      task: 'sample-proportion',
      params: { n, p: truth },
      seed: seedFrom(SEED_KEY, 'seasons', generation, n, truth),
      n: INTERVALS,
      onProgress: (all) => setPhats(all.slice(0, INTERVALS)),
    })
    return () => handle.cancel()
  }, [n, truth, generation])

  /* ---- The long run. The worker builds and checks its own intervals here (task 'ci-capture'). ---- */
  useEffect(() => {
    setLongRun({ done: 0, captured: 0 })
    const handle = runSimulation({
      task: 'ci-capture',
      params: { kind: 'proportion', n, confidence, p: truth },
      seed: seedFrom(SEED_KEY, 'long-run', generation, n, confidence, truth),
      n: LONG_RUN,
      onProgress: (all, done) => setLongRun({ done, captured: all.reduce((s, v) => s + v, 0) }),
    })
    return () => handle.cancel()
  }, [n, confidence, truth, generation])

  const intervals = useMemo<Built[]>(
    () =>
      phats.map((ph, i) => {
        const result = onePropInterval({ x: Math.round(ph * n), n, confidence, random: true })
        const [lo, hi] = result.ci as [number, number]
        return { season: i + 1, phat: result.estimate, lo, hi, width: hi - lo, captures: lo <= truth && truth <= hi }
      }),
    [phats, n, confidence, truth],
  )

  const drawn = intervals.length
  const captured = intervals.filter((iv) => iv.captures).length
  const missed = drawn - captured
  const expected = INTERVALS * confidence
  const meanWidth = drawn ? intervals.reduce((s, iv) => s + iv.width, 0) / drawn : NaN
  const longRunRate = longRun.done ? longRun.captured / longRun.done : NaN

  const expectedLosses = n * truth
  const expectedArrivals = n * (1 - truth)
  const largeCounts = expectedLosses >= LARGE_COUNTS_MIN && expectedArrivals >= LARGE_COUNTS_MIN

  /* ---- Geometry ---- */
  const frame = useChartFrame({ height: 430, yLabel: true })
  const domain = useMemo<[number, number]>(() => {
    if (!drawn) return padDomain([0, 2 * truth] as [number, number], 0.08)
    const lo = Math.min(truth, ...intervals.map((iv) => iv.lo))
    const hi = Math.max(truth, ...intervals.map((iv) => iv.hi))
    return padDomain([lo, hi] as [number, number], 0.06)
  }, [intervals, drawn, truth])

  const xs = useMemo(() => scaleLinear().domain(domain).range([0, frame.innerWidth]), [domain, frame.innerWidth])
  const ys = useMemo(() => scaleLinear().domain([0.5, INTERVALS + 0.5]).range([0, frame.innerHeight]), [frame.innerHeight])

  const table = useMemo(
    () => ({
      columns: ['season', 'p̂', 'lower', 'upper', 'covers the true rate'],
      rows: intervals.map((iv) => [iv.season, fmt(iv.phat, 5), fmt(iv.lo, 5), fmt(iv.hi, 5), iv.captures ? 'yes' : 'NO']),
      caption: `${fmtInt(drawn)} simulated seasons of ${fmtInt(n)} transits at a true rate of ${fmt(truth, 5)}, each with its ${fmtPct(confidence, 0)} one-proportion z-interval`,
    }),
    [intervals, drawn, n, truth, confidence],
  )

  const legend: LegendItem[] = [
    { label: `covers the true rate (${fmtInt(captured)})`, color: semanticColor('fit'), shape: 'line' },
    { label: `misses it (${fmtInt(missed)})`, color: semanticColor('rejected'), shape: 'line' },
    { label: `the true rate, ${fmt(truth, 5)}`, color: semanticColor('reference'), shape: 'dashed' },
  ]

  const description = `One hundred simulated seasons of ${fmtInt(n)} Lane transits, each drawn at a true loss rate of ${fmt(truth, 5)}, each with its own ${fmtPct(confidence, 0)} one-proportion z-interval drawn as a horizontal segment. The true rate is the vertical line. ${fmtInt(captured)} of the ${fmtInt(drawn)} intervals cover it and ${fmtInt(missed)} miss; at this level ${fmt(expected, 1)} would be expected to cover. Across ${fmtInt(longRun.done)} further simulated seasons the method's capture rate is ${Number.isFinite(longRunRate) ? fmtPct(longRunRate, 1) : 'still counting'}. The mean interval width is ${fmt(meanWidth, 5)} and the critical value is ${fmt(zStar(confidence), 3)}. Expected losses in a season are ${fmt(expectedLosses, 2)} and expected arrivals ${fmt(expectedArrivals, 1)}, so Large Counts ${largeCounts ? 'holds' : 'fails'}. The data table lists every season's sample rate, endpoints and whether it covers the true rate.`

  return (
    <Panel
      label="INTEL · CAPTURE SIMULATOR"
      status={`${fmtPct(confidence, 0)} · n = ${fmtInt(n)}`}
      tone="intel"
      led={drawn < INTERVALS ? 'busy' : largeCounts ? 'on' : 'warn'}
      ariaLabel="Confidence-interval capture simulator: one hundred simulated seasons of Lane traffic, one interval each, against the true loss rate"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider
            label="confidence level C"
            value={Math.round(confidence * 100)}
            min={50}
            max={99}
            step={1}
            onChange={(v) => setConfidence(v / 100)}
            format={(v) => `${v}%`}
          />
          <Slider label="transits in a season (n)" value={n} min={100} max={LANE_TRANSITS} step={1} onChange={setN} format={fmtInt} />
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setGeneration((g) => g + 1)}>
            RESEED · NEW CENTURY
          </button>
        </div>

        <ReadoutGrid>
          <Readout label="covered · out of 100" value={`${fmtInt(captured)} / ${fmtInt(drawn)}`} tone="intel" live />
          <Readout label="missed" value={fmtInt(missed)} tone={missed > 0 ? 'alert' : 'intel'} live />
          <Readout label="expected to cover at this C" value={fmt(expected, 1)} size="sm" live />
          <Readout
            label={`capture rate over ${fmtInt(LONG_RUN)} seasons`}
            value={Number.isFinite(longRunRate) ? fmtPct(longRunRate, 1) : '—'}
            tone={largeCounts ? 'intel' : 'alert'}
            stale={!longRun.done}
            live
          />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="z*" value={fmt(zStar(confidence), 3)} size="sm" live />
          <Readout label="mean interval width" value={drawn ? fmt(meanWidth, 5) : '—'} size="sm" stale={!drawn} live />
          <Readout label="n · p · expected losses" value={fmt(expectedLosses, 2)} tone={expectedLosses >= LARGE_COUNTS_MIN ? 'intel' : 'alert'} size="sm" live />
          <Readout label="Large Counts · both ≥ 10" value={largeCounts ? 'holds' : 'FAILS'} tone={largeCounts ? 'intel' : 'alert'} size="sm" live />
        </ReadoutGrid>

        <ChartSurface
          frame={frame}
          ariaLabel={`One hundred ${fmtPct(confidence, 0)} confidence intervals for the loss rate, one per simulated season, against the true rate`}
          description={description}
          table={table}
          footer={<Legend items={legend} ariaLabel="Capture simulator key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={ys} width={frame.innerWidth} ticks={[1, 25, 50, 75, 100]} label="simulated season" grid={false} />
            <PlotClip frame={frame}>
              {intervals.map((iv) => {
                const y = ys(iv.season)
                const colour = iv.captures ? semanticColor('fit') : semanticColor('rejected')
                return (
                  <g key={iv.season}>
                    <line
                      x1={xs(iv.lo)}
                      x2={xs(iv.hi)}
                      y1={y}
                      y2={y}
                      stroke={colour}
                      strokeWidth={iv.captures ? chartTheme.stroke.hair + 1 : chartTheme.stroke.line}
                      strokeLinecap="round"
                      style={{ transition: 'x1 var(--dr-dur) var(--dr-ease), x2 var(--dr-dur) var(--dr-ease), stroke var(--dr-dur-fast) var(--dr-ease)' }}
                    >
                      <title>{`season ${iv.season}: p̂ ${fmt(iv.phat, 5)}, interval ${fmt(iv.lo, 5)} to ${fmt(iv.hi, 5)} — ${iv.captures ? 'covers' : 'misses'} the true rate`}</title>
                    </line>
                    <circle
                      cx={xs(iv.phat)}
                      cy={y}
                      r={1.6}
                      fill={colour}
                      style={{ transition: 'cx var(--dr-dur) var(--dr-ease), fill var(--dr-dur-fast) var(--dr-ease)' }}
                    />
                  </g>
                )
              })}
            </PlotClip>
            <ReferenceLine x={xs(truth)} height={frame.innerHeight} label={`true rate ${fmt(truth, 4)}`} color={semanticColor('reference')} />
            <XAxis scale={xs} height={frame.innerHeight} label="loss rate per transit" format={(v) => fmt(v, 3)} />
          </g>
        </ChartSurface>

        <Note tone={missed > 0 ? 'warn' : 'muted'} live>
          {fmtInt(captured)} of these {fmtInt(drawn)} intervals cover the true rate and {fmtInt(missed)} do not, against {fmt(expected, 1)} expected at {fmtPct(confidence, 0)}. Every
          interval on the screen either covers the line or it does not — there is nothing probabilistic left about any one of them. The level is a property of the method that produced all
          hundred, and RESEED deals another century to prove it.
        </Note>

        <section aria-label="What the long run says">
          <Subhead>The long run · {fmtInt(longRun.done)} more seasons</Subhead>
          <Note tone={largeCounts ? 'muted' : 'alert'} live>
            {largeCounts ? (
              <>
                Across {fmtInt(longRun.done)} simulated seasons the method captured the true rate {Number.isFinite(longRunRate) ? fmtPct(longRunRate, 1) : '—'} of the time, against a stated{' '}
                {fmtPct(confidence, 0)}. A hundred intervals wobble by several points around the level; five thousand do not. That number — not the one on your screen — is what the phrase
                &ldquo;{fmtPct(confidence, 0)} confident&rdquo; is claiming.
              </>
            ) : (
              <>
                Large Counts fails here: a season of {fmtInt(n)} transits at this rate expects {fmt(expectedLosses, 2)} losses, not ten. Watch what it costs — over {fmtInt(longRun.done)}{' '}
                seasons the method captured the true rate {Number.isFinite(longRunRate) ? fmtPct(longRunRate, 1) : '—'} of the time while the dial said {fmtPct(confidence, 0)}. The
                condition is not paperwork. It is the difference between a level you can sign and a level you cannot. Run n up to the Ledger&rsquo;s {fmtInt(LANE_TRANSITS)} transits and the
                capture rate comes back to the level.
              </>
            )}
          </Note>
        </section>
      </div>
    </Panel>
  )
}
