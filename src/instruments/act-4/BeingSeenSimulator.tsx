/**
 * TACTICAL · BEING SEEN (act-4-08, act-4-10) — the DS-06 close-pass model.
 *
 * The Lane plot is public. Every hull whose scheduled track carries it inside 2.6 million km of a
 * loiter point during a Watch window is known in advance, by name, by hour. That turns being seen
 * into a fixed number of independent trials: twelve passes at the near point, four at the middle,
 * one at the far. Per pass, a freighter's nav sensors find a cold *Nightjar* with probability 0.02;
 * if the wings are out for that pass, 0.60.
 *
 * The passes are independent because they are different hulls on published tracks — which is exactly
 * what the ship's own consecutive sweeps are not. The exact side is binomial; the simulated side runs
 * seeded windows and converges onto it.
 *
 * Geometric mode asks the other question: how many close passes until one of them catches you. AP
 * convention throughout — trials up to and including the first success, support 1, 2, 3…
 */
import { useMemo, useState } from 'react'
import { scaleBand, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import {
  BandAxis,
  ChartSurface,
  Legend,
  PlotClip,
  Readout,
  ReadoutRow,
  Segmented,
  Slider,
  YAxis,
  chartTheme,
  semanticColor,
  seriesColor,
  useChartFrame,
} from '@/instruments/shared'
import { Rng, seedFrom } from '@/lib/rng'
import { simulate } from '@/lib/sim'
import { binomial, binomialRV, convolve, discreteRV, fmt, fmtInt, fmtP, geometric, geometricMoments, rvProb, type DiscreteRV } from '@/lib/stats'
import {
  CLOSE_PASSES,
  CLOSE_PASS_KM,
  P_SEEN_COLD,
  P_SEEN_PER_PASS_COLD,
  P_SEEN_PER_PASS_PURGING,
  metStamp,
  windowOnePasses,
  windowTwoPasses,
  type RangeBand,
} from './data'
import { KeyTable, Note, ProbabilityBar, Subhead, oneIn, stackStyle } from './_ui'

export interface BeingSeenSimulatorProps {
  /** Loiter point, which fixes the number of scheduled close passes in the window. */
  band?: RangeBand
  /** Per-pass detection probability against a cold hull. */
  p?: number
  /** Price one pass at the purging probability instead. */
  purging?: boolean
  /** Monte Carlo window count. */
  runs?: RunSize
  /** Which Watch window's scheduled pass list to list. */
  window?: 1 | 2
  /** Which question the panel opens on. */
  mode?: Mode
  /** Seed root; every RUN advances a counter. */
  seed?: string
}

type Mode = 'binomial' | 'geometric'
type RunSize = '200' | '1000' | '5000'

const BAND_OPTIONS = [
  { value: 'near', label: `near · ${CLOSE_PASSES.near} passes` },
  { value: 'middle', label: `middle · ${CLOSE_PASSES.middle} passes` },
  { value: 'far', label: `far · ${CLOSE_PASSES.far} pass` },
] as const
const RUN_OPTIONS = [
  { value: '200', label: '200' },
  { value: '1000', label: '1,000' },
  { value: '5000', label: '5,000' },
] as const
const MODE_OPTIONS = [
  { value: 'binomial', label: 'detections in a window' },
  { value: 'geometric', label: 'passes until the first' },
] as const
const GEOMETRIC_MAX = 40

/** The window's detection count: binomial when cold throughout, binomial + one hot pass when purging. */
function windowRV(n: number, p: number, purging: boolean): DiscreteRV {
  if (!purging || n < 1) return binomialRV(n, p)
  const cold = binomialRV(n - 1, p)
  const hot = discreteRV([0, 1], [1 - P_SEEN_PER_PASS_PURGING, P_SEEN_PER_PASS_PURGING])
  return convolve(cold, hot)
}

export function BeingSeenSimulator({
  band: bandProp = 'middle',
  p: pProp = P_SEEN_PER_PASS_COLD,
  purging: purgingProp = false,
  runs: runsProp = '1000',
  window: windowProp = 1,
  mode: modeProp = 'binomial',
  seed = 'act-4-08',
}: BeingSeenSimulatorProps = {}) {
  const [mode, setMode] = useState<Mode>(modeProp)
  const [band, setBand] = useState<RangeBand>(bandProp)
  const [p, setP] = useState(pProp)
  const [purging, setPurging] = useState(purgingProp)
  const [runSize, setRunSize] = useState<RunSize>(runsProp)
  const [windowNo, setWindowNo] = useState<'1' | '2'>(String(windowProp) as '1' | '2')
  const [sim, setSim] = useState<{ runs: number; counts: number[]; tick: number } | null>(null)
  const [tick, setTick] = useState(0)

  const n = CLOSE_PASSES[band]
  const runs = Number(runSize)

  /* ---- Exact ---- */
  const rv = useMemo(() => windowRV(n, p, purging), [n, p, purging])
  const pNone = purging ? rvProb(rv, (v) => v === 0) : binomial.pmf(0, n, p)
  const pAtLeastOne = purging ? rvProb(rv, (v) => v >= 1) : binomial.atLeast(1, n, p)

  /* ---- Simulated ---- */
  const run = () => {
    const next = tick + 1
    const s = seedFrom(seed, 'window', next, band, p, purging ? 'purge' : 'cold', runs)
    let counts: number[]
    if (purging && n >= 1) {
      const r = new Rng(s)
      counts = Array.from({ length: runs }, () => r.binomial(n - 1, p) + (r.bool(P_SEEN_PER_PASS_PURGING) ? 1 : 0))
    } else {
      counts = simulate('binomial-count', { n, p }, s, runs)
    }
    setSim({ runs, counts, tick: next })
    setTick(next)
  }
  const clear = () => setSim(null)

  const simFreq = useMemo(() => {
    if (!sim) return null
    const out = rv.values.map((v) => sim.counts.filter((c) => c === v).length / sim.runs)
    return out
  }, [sim, rv])
  const simAtLeastOne = sim ? sim.counts.filter((c) => c >= 1).length / sim.runs : NaN

  /* ---- The pmf chart ---- */
  const frame = useChartFrame({ height: 260, yLabel: true })
  const bandScale = useMemo(
    () =>
      scaleBand<string>()
        .domain(rv.values.map(String))
        .range([0, frame.innerWidth])
        .paddingInner(0.28)
        .paddingOuter(0.12),
    [rv, frame.innerWidth],
  )
  const yMax = Math.max(...rv.probs, ...(simFreq ?? [0])) * 1.12
  const y = useMemo(() => scaleLinear().domain([0, yMax]).nice(4).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])
  const barW = Math.min(chartTheme.mark.barMax, bandScale.bandwidth())

  const pmfTable = useMemo(
    () => ({
      columns: ['detections in the window', 'exact probability', 'simulated relative frequency'],
      rows: rv.values.map((v, i) => [v, fmt(rv.probs[i], 5), simFreq ? fmt(simFreq[i], 5) : '—'] as (string | number)[]),
      caption: `${n} scheduled close passes, per-pass detection probability ${fmt(p, 4)}${purging ? `, one of them priced at ${fmt(P_SEEN_PER_PASS_PURGING, 2)} because the wings are out` : ''}.`,
    }),
    [rv, simFreq, n, p, purging],
  )

  /* ---- Geometric ---- */
  const ks = useMemo(() => Array.from({ length: GEOMETRIC_MAX }, (_, i) => i + 1), [])
  const [kMark, setKMark] = useState(10)
  const gMoments = geometricMoments(p)
  const gFrame = useChartFrame({ height: 250, yLabel: true })
  const gBand = useMemo(
    () =>
      scaleBand<string>()
        .domain(ks.map(String))
        .range([0, gFrame.innerWidth])
        .paddingInner(0.2)
        .paddingOuter(0.06),
    [ks, gFrame.innerWidth],
  )
  const gY = useMemo(() => scaleLinear().domain([0, geometric.pmf(1, p) * 1.12]).nice(4).range([gFrame.innerHeight, 0]), [p, gFrame.innerHeight])
  const gTable = useMemo(
    () => ({
      columns: ['pass k', 'P(first detection on pass k)', 'P(by pass k)', 'P(more than k passes)'],
      rows: ks.map((k) => [k, fmt(geometric.pmf(k, p), 5), fmt(geometric.cdf(k, p), 5), fmt(geometric.sf(k, p), 5)] as (string | number)[]),
      caption: `Geometric with p = ${fmt(p, 4)}. Trials up to and including the first success; support 1, 2, 3, …`,
    }),
    [ks, p],
  )

  /* ---- The scheduled pass list ---- */
  const passes = windowNo === '1' ? windowOnePasses : windowTwoPasses
  const passRows = passes.map((pass) => [
    pass.hull,
    metStamp(pass.met),
    pass.owner_class,
    `${fmt(pass.range_km / 1e6, 2)} Mm`,
    pass.duringPurge ? `${fmt(pass.pDetect, 2)} · wings out` : fmt(pass.pDetect, 2),
  ])

  return (
    <Panel
      label="TACTICAL · BEING SEEN"
      tone="tactical"
      led={pAtLeastOne > 0.15 ? 'warn' : 'on'}
      status={`${fmtInt(n)} close passes · P(≥1) ${fmt(pAtLeastOne, 3)}`}
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode> label="question" value={mode} options={MODE_OPTIONS} onChange={setMode} />
          <Segmented<RangeBand> label="loiter point" value={band} options={BAND_OPTIONS} onChange={setBand} />
          <Slider label="per-pass detection probability" value={p} min={0.005} max={0.2} step={0.005} onChange={setP} format={(v) => fmt(v, 3)} />
          <Segmented
            label="wings out for one pass"
            value={purging ? 'on' : 'off'}
            options={[
              { value: 'off', label: 'cold throughout' },
              { value: 'on', label: `one pass at ${fmt(P_SEEN_PER_PASS_PURGING, 2)}` },
            ]}
            onChange={(v) => {
              setPurging(v === 'on')
              setSim(null)
            }}
          />
        </div>

        {mode === 'binomial' ? (
          <>
            <div className="dr-controls">
              <Segmented<RunSize> label="windows to simulate" value={runSize} options={RUN_OPTIONS} onChange={setRunSize} />
              <button type="button" className="dr-btn dr-btn--primary" onClick={run}>
                RUN
              </button>
              <button type="button" className="dr-btn dr-btn--ghost" onClick={clear} disabled={!sim}>
                CLEAR
              </button>
            </div>

            <ReadoutRow>
              <Readout label="close passes n" value={fmtInt(n)} tone="tactical" />
              <Readout label="P(0 detections)" value={fmt(pNone, 4)} tone="tactical" live />
              <Readout label="P(at least one)" value={fmt(pAtLeastOne, 4)} tone={pAtLeastOne > 0.15 ? 'alert' : 'tactical'} live />
              <Readout label="that is" value={oneIn(pAtLeastOne)} size="sm" live />
              <Readout label="expected detections" value={fmt(rv.mean, 3)} size="sm" live />
              <Readout label="simulated P(≥1)" value={sim ? fmt(simAtLeastOne, 4) : '—'} size="sm" stale={!sim} live />
              <Readout label="windows run" value={sim ? fmtInt(sim.runs) : '0'} size="sm" stale={!sim} live />
            </ReadoutRow>

            <ChartSurface
              frame={frame}
              ariaLabel={`Probability of each number of detections across ${n} scheduled close passes, with the simulated relative frequencies overlaid`}
              description={`Exact binomial probabilities for ${n} independent close passes at ${fmt(p, 4)} each${purging ? `, one of them priced at ${fmt(P_SEEN_PER_PASS_PURGING, 2)} because the wings are out for it` : ''}. P(0) = ${fmt(pNone, 4)} and P(at least one) = ${fmt(pAtLeastOne, 4)}. ${sim ? `${fmtInt(sim.runs)} simulated windows give ${fmt(simAtLeastOne, 4)} for at least one.` : 'Press RUN to overlay simulated windows.'} The data table gives both columns.`}
              table={pmfTable}
              footer={
                <Legend
                  items={[
                    { label: 'exact probability', color: seriesColor(0), shape: 'square' },
                    { label: sim ? `simulated · ${fmtInt(sim.runs)} windows` : 'simulated · not yet run', color: semanticColor('observed'), shape: 'line', muted: !sim },
                  ]}
                  ariaLabel="Detection distribution key"
                />
              }
            >
              <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
                <YAxis scale={y} width={frame.innerWidth} ticks={4} format={(v) => fmt(v, 2)} label="probability" />
                <PlotClip frame={frame}>
                  {rv.values.map((v, i) => {
                    const x0 = (bandScale(String(v)) ?? 0) + (bandScale.bandwidth() - barW) / 2
                    const top = y(rv.probs[i])
                    return (
                      <g key={v}>
                        <rect className="dr-mark dr-mark--bar" x={x0} y={top} width={barW} height={Math.max(0, frame.innerHeight - top)} fill={seriesColor(0)} fillOpacity={chartTheme.mark.alpha} rx={chartTheme.mark.barRadius}>
                          <title>{`P(${v} detections) = ${fmt(rv.probs[i], 5)}`}</title>
                        </rect>
                        {simFreq && <line x1={x0 - 3} x2={x0 + barW + 3} y1={y(simFreq[i])} y2={y(simFreq[i])} stroke={semanticColor('observed')} strokeWidth={2} />}
                      </g>
                    )
                  })}
                </PlotClip>
                <BandAxis scale={bandScale} height={frame.innerHeight} label="detections in the window" />
              </g>
            </ChartSurface>

            <ProbabilityBar value={pAtLeastOne} label={`at least one hull sees her · ${band} point, ${fmtInt(n)} passes`} complementLabel="the window passes unobserved" color={semanticColor('rejected')} digits={4} />

            <Note tone={purging ? 'alert' : 'muted'} live>
              {purging
                ? `One of the ${fmtInt(n)} passes catches her with the wings out and is priced at ${fmt(P_SEEN_PER_PASS_PURGING, 2)} instead of ${fmt(p, 3)}. That single pass carries more risk than the other ${fmtInt(n - 1)} combined: P(at least one) goes to ${fmt(pAtLeastOne, 4)}. A purge is not a quiet two point six hours. It is a beacon on a published track.`
                : `Cold for the whole window: ${fmtInt(n)} independent passes at ${fmt(p, 3)} each. P(none) = ${fmt(pNone, 4)}, so P(at least one) = ${fmt(pAtLeastOne, 4)} — ${oneIn(pAtLeastOne)}. The registry figures at the three points are ${fmt(P_SEEN_COLD.near, 2)}, ${fmt(P_SEEN_COLD.middle, 2)} and ${fmt(P_SEEN_COLD.far, 2)}.`}
            </Note>
            <Note live>
              {sim
                ? `${fmtInt(sim.runs)} simulated windows: ${fmtInt(sim.counts.filter((c) => c >= 1).length)} of them held at least one detection, an estimate of ${fmt(simAtLeastOne, 4)} against the exact ${fmt(pAtLeastOne, 4)}. Run more and the markers settle onto the bars. The simulation does not know anything the binomial does not; it just takes longer to say it.`
                : 'The exact answer is already on the screen. Run the simulation anyway — watching the estimate arrive at a number you already have is the only way to learn how far off a small run can be.'}
            </Note>
          </>
        ) : (
          <>
            <div className="dr-controls">
              <Slider label="pass k" value={kMark} min={1} max={GEOMETRIC_MAX} step={1} onChange={setKMark} />
            </div>
            <ReadoutRow>
              <Readout label="P(first detection on pass k)" value={fmt(geometric.pmf(kMark, p), 5)} tone="tactical" live />
              <Readout label="P(by pass k)" value={fmt(geometric.cdf(kMark, p), 4)} tone="tactical" live />
              <Readout label="P(more than k passes)" value={fmt(geometric.sf(kMark, p), 4)} live />
              <Readout label="mean passes to the first" value={fmt(gMoments.mean, 2)} tone="tactical" live />
              <Readout label="SD" value={fmt(gMoments.sd, 2)} size="sm" live />
              <Readout label="that mean is" value={`1 ÷ ${fmt(p, 3)}`} size="sm" />
            </ReadoutRow>

            <ChartSurface
              frame={gFrame}
              ariaLabel={`Geometric distribution of the number of close passes up to and including the first detection, at ${fmt(p, 4)} per pass, with the first ${kMark} passes shaded`}
              description={`Each bar is the probability that the first detection falls on exactly that pass. The shaded bars up to pass ${kMark} total ${fmt(geometric.cdf(kMark, p), 4)}; the rest, ${fmt(geometric.sf(kMark, p), 4)}, is the chance she is still unseen after ${kMark} passes. The mean is ${fmt(gMoments.mean, 2)} passes. The data table gives the probability, the cumulative and the survival for every pass to ${GEOMETRIC_MAX}.`}
              table={gTable}
              footer={
                <Legend
                  items={[
                    { label: `first detection by pass ${kMark} · ${fmt(geometric.cdf(kMark, p), 3)}`, color: semanticColor('shade'), shape: 'area' },
                    { label: `still unseen · ${fmt(geometric.sf(kMark, p), 3)}`, color: seriesColor(4), shape: 'square' },
                    { label: `mean ${fmt(gMoments.mean, 1)} passes`, color: semanticColor('reference'), shape: 'dashed' },
                  ]}
                  ariaLabel="Geometric key"
                />
              }
            >
              <g transform={`translate(${gFrame.margin.left},${gFrame.margin.top})`}>
                <YAxis scale={gY} width={gFrame.innerWidth} ticks={4} format={(v) => fmt(v, 3)} label="probability" />
                <PlotClip frame={gFrame}>
                  {ks.map((k) => {
                    const x0 = gBand(String(k)) ?? 0
                    const top = gY(geometric.pmf(k, p))
                    return (
                      <rect key={k} className="dr-mark dr-mark--bar" x={x0} y={top} width={gBand.bandwidth()} height={Math.max(0, gFrame.innerHeight - top)} fill={k <= kMark ? semanticColor('shade') : seriesColor(4)} fillOpacity={chartTheme.mark.alpha}>
                        <title>{`P(first detection on pass ${k}) = ${fmt(geometric.pmf(k, p), 5)}`}</title>
                      </rect>
                    )
                  })}
                  {gMoments.mean <= GEOMETRIC_MAX && (
                    <line
                      x1={(gBand(String(Math.round(gMoments.mean))) ?? 0) + gBand.bandwidth() / 2}
                      x2={(gBand(String(Math.round(gMoments.mean))) ?? 0) + gBand.bandwidth() / 2}
                      y1={0}
                      y2={gFrame.innerHeight}
                      stroke={semanticColor('reference')}
                      strokeWidth={chartTheme.stroke.reference}
                      strokeDasharray={chartTheme.dash}
                    />
                  )}
                </PlotClip>
                <BandAxis scale={gBand} height={gFrame.innerHeight} label="close passes up to and including the first detection" />
              </g>
            </ChartSurface>

            <Note>
              The count is trials up to and including the first success: the support starts at 1, not 0, and P(X = 1) = p. The mean is 1 ÷ p = {fmt(gMoments.mean, 2)} passes, which is not the pass you should plan for — the distribution is skewed and {fmtP(geometric.sf(Math.ceil(gMoments.mean), p))} of the time the first detection comes later than that.
            </Note>
            <Note tone="warn">
              At the {band} point a window carries {fmtInt(n)} passes, so {fmt(gMoments.mean, 1)} passes is about {fmt(gMoments.mean / n, 1)} windows of loitering before the first hull that sees her. Waiting is not free. The cellar fills on the same clock.
            </Note>
          </>
        )}

        <section aria-label="Scheduled close passes">
          <Subhead>The plot · scheduled close passes inside {fmt(CLOSE_PASS_KM / 1e6, 1)} million km</Subhead>
          <Segmented
            label="Watch window"
            value={windowNo}
            options={[
              { value: '1', label: 'window 1' },
              { value: '2', label: 'window 2' },
            ]}
            onChange={(v) => setWindowNo(v as '1' | '2')}
          />
          <KeyTable
            columns={['hull', 'closest approach', 'owner class', 'range', 'P(this pass sees her)']}
            rows={passRows}
            caption={`Window ${windowNo} · ${passes.length} scheduled close passes at the middle point`}
            ariaLabel={`Scheduled close passes for Watch window ${windowNo}`}
            alertRows={passes.map((pass, i) => (pass.duringPurge ? i : -1)).filter((i) => i >= 0)}
          />
          <Note>
            Every one of these hulls is on the public plot with a name, an owner and an hour. Nobody is hunting her. They are hauling helium-3 and their nav sensors look where they are going. Independence here is not an assumption made for convenience: the hulls are different, the tracks are scheduled, and nothing one of them sees changes what the next one does.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
