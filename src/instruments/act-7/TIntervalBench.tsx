/**
 * ENGINEERING · t-INTERVAL BENCH (act-7-02) — two modes on one frame.
 *
 *   BUILDER   x̄, s and n as editable fields with a confidence slider. t*, SE, margin and both
 *             endpoints update live on an interval axis with the Mk 3 specification marked, so the
 *             learner can see exactly when the interval stops straddling the spec. It opens on the
 *             Refit set's summary statistics and every field is free.
 *   CAPTURE   a hundred small samples from a Normal population whose mean is known to the panel and
 *             to nobody else. Each sample builds its own interval; the running capture rate is
 *             counted against the nominal level. A toggle rebuilds every interval with z* in place
 *             of t* — the same data, the wrong multiplier — and the capture rate falls below the
 *             level the dial is claiming.
 *
 * All randomness goes through `@/lib/rng` with a fixed seed; RESEED advances a generation counter.
 * Critical values and endpoints come from `@/lib/stats` (`tStar`, `zStar`, `oneMeanInterval`).
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
  YAxis,
  chartTheme,
  padDomain,
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtPct, mean, oneMeanInterval, sd, tStar, zStar } from '@/lib/stats'
import { MK3_SPEC_KN, REFIT_N, refitOutputs } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

type Mode = 'builder' | 'capture'
type Multiplier = 't' | 'z'

/** Intervals drawn in capture mode. */
export const CAPTURE_RUNS = 100
export const CAPTURE_SEED = 'act-7/t-capture'

export interface TIntervalBenchProps {
  /** Summary statistics the builder opens on. Default: the Refit set's twelve. */
  xbar?: number
  s?: number
  n?: number
  /** Confidence level on load. Default 0.95. */
  confidence?: number
  /** The published figure marked on the interval axis. Default the Mk 3 specification. */
  reference?: number
  referenceLabel?: string
  /** Sample size in capture mode. Default 12. */
  captureN?: number
  label?: string
  tone?: PanelTone
}

interface Built {
  run: number
  xbar: number
  s: number
  lo: number
  hi: number
  captures: boolean
}

export function TIntervalBench({
  xbar: xbar0 = mean(refitOutputs),
  s: s0 = sd(refitOutputs),
  n: n0 = REFIT_N,
  confidence: c0 = 0.95,
  reference = MK3_SPEC_KN,
  referenceLabel = 'Mk 3 specification',
  captureN = REFIT_N,
  label = 'ENGINEERING · t-INTERVAL BENCH',
  tone = 'engineering',
}: TIntervalBenchProps = {}) {
  const [mode, setMode] = useState<Mode>('builder')
  const [xbar, setXbar] = useState(Math.round(xbar0 * 1000) / 1000)
  const [s, setS] = useState(Math.round(s0 * 1000) / 1000)
  const [n, setN] = useState(n0)
  const [confidencePct, setConfidencePct] = useState(Math.round(c0 * 100))
  const [multiplier, setMultiplier] = useState<Multiplier>('t')
  const [capN, setCapN] = useState(captureN)
  const [generation, setGeneration] = useState(0)

  const confidence = confidencePct / 100

  /* ---- BUILDER ---- */
  const built = useMemo(() => oneMeanInterval({ mean: xbar, sd: s, n }, { confidence, random: true }), [xbar, s, n, confidence])
  const [lo, hi] = built.ci as [number, number]
  const tCrit = built.criticalValue ?? tStar(confidence, n - 1)
  const moe = built.marginOfError ?? tCrit * built.se
  const clears = lo > reference
  const straddles = lo <= reference && reference <= hi

  const frame = useChartFrame({ height: 150 })
  const axisDomain = useMemo<[number, number]>(() => padDomain([Math.min(lo, reference), Math.max(hi, reference)] as [number, number], 0.18), [lo, hi, reference])
  const ax = useMemo(() => scaleLinear().domain(axisDomain).range([0, frame.innerWidth]), [axisDomain, frame.innerWidth])

  /* ---- CAPTURE ---- */
  const truth = xbar0
  const sigma = s0
  const runs = useMemo<Built[]>(() => {
    const r = rng(CAPTURE_SEED, generation, capN, confidencePct, multiplier)
    const out: Built[] = []
    for (let i = 0; i < CAPTURE_RUNS; i++) {
      const xs = Array.from({ length: capN }, () => r.normal(truth, sigma))
      const m = mean(xs)
      const sx = sd(xs)
      const crit = multiplier === 't' ? tStar(confidence, capN - 1) : zStar(confidence)
      const half = (crit * sx) / Math.sqrt(capN)
      out.push({ run: i + 1, xbar: m, s: sx, lo: m - half, hi: m + half, captures: m - half <= truth && truth <= m + half })
    }
    return out
  }, [generation, capN, confidence, confidencePct, multiplier, truth, sigma])

  const captured = runs.filter((iv) => iv.captures).length
  const captureRate = captured / runs.length
  const nominal = confidence
  const short = multiplier === 'z' && captureRate < nominal - 0.01
  const capCrit = multiplier === 't' ? tStar(confidence, capN - 1) : zStar(confidence)

  const capFrame = useChartFrame({ height: 400, yLabel: true })
  const capDomain = useMemo<[number, number]>(() => {
    const l = Math.min(truth, ...runs.map((iv) => iv.lo))
    const h = Math.max(truth, ...runs.map((iv) => iv.hi))
    return padDomain([l, h] as [number, number], 0.05)
  }, [runs, truth])
  const cx = useMemo(() => scaleLinear().domain(capDomain).range([0, capFrame.innerWidth]), [capDomain, capFrame.innerWidth])
  const cy = useMemo(() => scaleLinear().domain([0.5, CAPTURE_RUNS + 0.5]).range([0, capFrame.innerHeight]), [capFrame.innerHeight])

  const capLegend: LegendItem[] = [
    { label: `covers the true mean (${fmtInt(captured)})`, color: semanticColor('fit'), shape: 'line' },
    { label: `misses it (${fmtInt(runs.length - captured)})`, color: semanticColor('rejected'), shape: 'line' },
    { label: `the true mean, ${fmt(truth, 2)}`, color: semanticColor('reference'), shape: 'dashed' },
  ]

  const builderDescription =
    `A number line carrying the ${fmtPct(confidence, 0)} one-sample t-interval for the mean, from ${fmt(lo, 3)} to ${fmt(hi, 3)}, built from x̄ = ${fmt(xbar, 3)}, s = ${fmt(s, 3)} and n = ${fmtInt(n)}. ` +
    `The critical value on ${fmtInt(n - 1)} degrees of freedom is ${fmt(tCrit, 4)}, the standard error is ${fmt(built.se, 4)} and the margin of error is ${fmt(moe, 4)}. ` +
    `The ${referenceLabel} is marked at ${fmt(reference, 1)}, which the interval ${clears ? 'lies entirely above' : straddles ? 'contains' : 'lies entirely below'}.`

  const captureDescription =
    `One hundred simulated samples of ${fmtInt(capN)} observations from a Normal population with mean ${fmt(truth, 3)} and standard deviation ${fmt(sigma, 3)}, each drawn as a horizontal ${fmtPct(confidence, 0)} interval built with ${multiplier === 't' ? `t* on ${fmtInt(capN - 1)} degrees of freedom` : 'z*'} and the sample's own standard deviation. ` +
    `The true mean is the vertical line. ${fmtInt(captured)} of the ${fmtInt(runs.length)} intervals cover it, a rate of ${fmtPct(captureRate, 0)} against a nominal ${fmtPct(nominal, 0)}. The critical value is ${fmt(capCrit, 4)}. The data table lists every run.`

  return (
    <Panel
      label={label}
      status={mode === 'builder' ? `${fmtPct(confidence, 0)} · df ${fmtInt(n - 1)} · t* ${fmt(tCrit, 3)}` : `${fmtInt(captured)} / ${fmtInt(runs.length)} COVERED · ${multiplier === 't' ? 't*' : 'z*'}`}
      tone={tone}
      led={mode === 'capture' && short ? 'warn' : 'on'}
      ariaLabel="t-interval bench: build an interval from summary statistics, or watch a hundred of them try to capture a mean"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="bench mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'builder', label: 'builder' },
              { value: 'capture', label: 'capture' },
            ]}
          />
          <Slider label="confidence level C" value={confidencePct} min={50} max={99} step={1} onChange={setConfidencePct} format={(v) => `${v}%`} />
        </div>

        {mode === 'builder' ? (
          <>
            <div className="dr-controls">
              <NumberField label="x̄ · sample mean" value={xbar} onChange={setXbar} step={0.1} units="kN" />
              <NumberField label="s · sample standard deviation" value={s} onChange={setS} min={0.01} step={0.1} units="kN" />
              <NumberField label="n · observations" value={n} onChange={(v) => setN(Math.max(2, Math.round(v)))} min={2} max={400} step={1} />
              <button
                type="button"
                className="dr-btn dr-btn--ghost dr-btn--sm"
                onClick={() => {
                  setXbar(Math.round(xbar0 * 1000) / 1000)
                  setS(Math.round(s0 * 1000) / 1000)
                  setN(n0)
                }}
              >
                RESET TO THE REFIT SET
              </button>
            </div>

            <ReadoutGrid>
              <Readout label={`t* · df ${fmtInt(n - 1)}`} value={fmt(tCrit, 4)} tone="engineering" live />
              <Readout label="SE · s ÷ √n" value={fmt(built.se, 4)} live />
              <Readout label="margin · t* × SE" value={fmt(moe, 4)} tone="engineering" live />
              <Readout label="interval width" value={fmt(hi - lo, 4)} size="sm" live />
            </ReadoutGrid>
            <ReadoutGrid>
              <Readout label="lower endpoint" value={fmt(lo, 3)} units="kN" tone="engineering" live />
              <Readout label="upper endpoint" value={fmt(hi, 3)} units="kN" tone="engineering" live />
              <Readout label={`clears the ${referenceLabel}`} value={clears ? 'yes' : straddles ? 'contains it' : 'no'} tone={clears ? 'engineering' : 'alert'} size="sm" live />
              <Readout label="z* at this level, for comparison" value={fmt(zStar(confidence), 4)} size="sm" live />
            </ReadoutGrid>

            <ChartSurface
              frame={frame}
              ariaLabel={`The ${fmtPct(confidence, 0)} interval for the mean on a number line, against the ${referenceLabel}`}
              description={builderDescription}
              table={{
                columns: ['quantity', 'value'],
                rows: [
                  ['x̄', fmt(xbar, 4)],
                  ['s', fmt(s, 4)],
                  ['n', fmtInt(n)],
                  ['df', fmtInt(n - 1)],
                  ['t*', fmt(tCrit, 4)],
                  ['SE', fmt(built.se, 5)],
                  ['margin of error', fmt(moe, 5)],
                  ['lower endpoint', fmt(lo, 4)],
                  ['upper endpoint', fmt(hi, 4)],
                  [referenceLabel, fmt(reference, 2)],
                ],
                caption: `${fmtPct(confidence, 0)} one-sample t-interval for the mean`,
              }}
            >
              <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
                <PlotClip frame={frame}>
                  <line
                    x1={ax(lo)}
                    x2={ax(hi)}
                    y1={frame.innerHeight / 2}
                    y2={frame.innerHeight / 2}
                    stroke={clears ? semanticColor('fit') : semanticColor('rejected')}
                    strokeWidth={chartTheme.stroke.line + 2}
                    strokeLinecap="round"
                  >
                    <title>{`interval ${fmt(lo, 3)} to ${fmt(hi, 3)}`}</title>
                  </line>
                  {[lo, hi].map((v) => (
                    <line
                      key={v}
                      x1={ax(v)}
                      x2={ax(v)}
                      y1={frame.innerHeight / 2 - 12}
                      y2={frame.innerHeight / 2 + 12}
                      stroke={clears ? semanticColor('fit') : semanticColor('rejected')}
                      strokeWidth={chartTheme.stroke.line}
                    />
                  ))}
                  <circle cx={ax(xbar)} cy={frame.innerHeight / 2} r={4} fill={semanticColor('observed')}>
                    <title>{`x̄ ${fmt(xbar, 3)}`}</title>
                  </circle>
                </PlotClip>
                <ReferenceLine x={ax(reference)} height={frame.innerHeight} label={`${referenceLabel} ${fmt(reference, 1)}`} color={semanticColor('reference')} />
                <XAxis scale={ax} height={frame.innerHeight} label="mean certified thrust (kN)" format={(v) => fmt(v, 1)} />
              </g>
            </ChartSurface>

            <Note tone={clears ? 'ok' : 'warn'} live>
              {clears
                ? `Every value in (${fmt(lo, 2)}, ${fmt(hi, 2)}) is above ${fmt(reference, 1)} kN, so the interval rules the ${referenceLabel} out as a plausible mean.`
                : `${fmt(reference, 1)} kN lies inside (${fmt(lo, 2)}, ${fmt(hi, 2)}), so it stays on the list of means the data are consistent with.`}{' '}
              Move n and watch the margin fall as √n, not as n: four times the hulls buys half the margin. Move C and watch it climb, because a higher level is bought by covering more ground.
              Move s and watch the whole thing scale with the scatter the reactors actually have.
            </Note>

            <section aria-label="What each level costs in margin">
              <Subhead>The same twelve numbers at four levels</Subhead>
              <KeyTable
                ariaLabel="Critical value, margin of error and endpoints at four confidence levels for the current summary statistics"
                caption={`x̄ = ${fmt(xbar, 2)}, s = ${fmt(s, 2)}, n = ${fmtInt(n)}`}
                columns={['level', `t* (df ${fmtInt(n - 1)})`, 'margin', 'lower', 'upper']}
                rows={[0.8, 0.9, 0.95, 0.99].map((c) => {
                  const r = oneMeanInterval({ mean: xbar, sd: s, n }, { confidence: c, random: true })
                  const [a, b] = r.ci as [number, number]
                  return [fmtPct(c, 0), fmt(r.criticalValue ?? 0, 4), fmt(r.marginOfError ?? 0, 4), fmt(a, 3), fmt(b, 3)]
                })}
              />
            </section>
          </>
        ) : (
          <>
            <div className="dr-controls">
              <Slider label="observations per sample (n)" value={capN} min={3} max={60} step={1} onChange={setCapN} format={fmtInt} />
              <Segmented<Multiplier>
                label="multiplier"
                value={multiplier}
                onChange={setMultiplier}
                options={[
                  { value: 't', label: `t* (df ${fmtInt(capN - 1)})` },
                  { value: 'z', label: 'z* — σ pretended known' },
                ]}
              />
              <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setGeneration((g) => g + 1)}>
                RESEED · ANOTHER HUNDRED
              </button>
            </div>

            <ReadoutGrid>
              <Readout label="covered · out of 100" value={`${fmtInt(captured)} / ${fmtInt(runs.length)}`} tone={short ? 'alert' : 'engineering'} live />
              <Readout label="capture rate" value={fmtPct(captureRate, 0)} tone={short ? 'alert' : 'engineering'} live />
              <Readout label="nominal level" value={fmtPct(nominal, 0)} size="sm" live />
              <Readout label={multiplier === 't' ? `t* · df ${fmtInt(capN - 1)}` : 'z*'} value={fmt(capCrit, 4)} size="sm" live />
            </ReadoutGrid>

            <ChartSurface
              frame={capFrame}
              ariaLabel={`One hundred ${fmtPct(confidence, 0)} intervals for a mean, built with ${multiplier === 't' ? 't*' : 'z*'}, against the true mean`}
              description={captureDescription}
              table={{
                columns: ['run', 'x̄', 's', 'lower', 'upper', 'covers the true mean'],
                rows: runs.map((iv) => [iv.run, fmt(iv.xbar, 3), fmt(iv.s, 3), fmt(iv.lo, 3), fmt(iv.hi, 3), iv.captures ? 'yes' : 'NO']),
                caption: `${fmtInt(runs.length)} samples of ${fmtInt(capN)} from a Normal population with mean ${fmt(truth, 3)}`,
              }}
              footer={<Legend items={capLegend} ariaLabel="Capture key" />}
            >
              <g transform={`translate(${capFrame.margin.left},${capFrame.margin.top})`}>
                <YAxis scale={cy} width={capFrame.innerWidth} ticks={[1, 25, 50, 75, 100]} label="sample" grid={false} />
                <PlotClip frame={capFrame}>
                  {runs.map((iv) => {
                    const y = cy(iv.run)
                    const colour = iv.captures ? semanticColor('fit') : semanticColor('rejected')
                    return (
                      <g key={iv.run}>
                        <line x1={cx(iv.lo)} x2={cx(iv.hi)} y1={y} y2={y} stroke={colour} strokeWidth={iv.captures ? chartTheme.stroke.hair + 1 : chartTheme.stroke.line} strokeLinecap="round">
                          <title>{`sample ${iv.run}: x̄ ${fmt(iv.xbar, 3)}, interval ${fmt(iv.lo, 3)} to ${fmt(iv.hi, 3)} — ${iv.captures ? 'covers' : 'misses'}`}</title>
                        </line>
                        <circle cx={cx(iv.xbar)} cy={y} r={1.6} fill={colour} />
                      </g>
                    )
                  })}
                </PlotClip>
                <ReferenceLine x={cx(truth)} height={capFrame.innerHeight} label={`true mean ${fmt(truth, 2)}`} color={semanticColor('reference')} />
                <XAxis scale={cx} height={capFrame.innerHeight} label="mean (kN)" format={(v) => fmt(v, 1)} />
              </g>
            </ChartSurface>

            <Note tone={short ? 'alert' : 'muted'} live>
              {multiplier === 'z' ? (
                <>
                  These hundred intervals were built with z* = {fmt(zStar(confidence), 4)} and the sample&rsquo;s own s, which is the shortcut a normal table invites. {fmtInt(captured)} of them
                  cover the true mean, a rate of {fmtPct(captureRate, 0)} while the dial says {fmtPct(nominal, 0)}. The multiplier is too small for what is actually in the denominator, so the
                  intervals come out too narrow and the method under-delivers on its own promise. Switch back to t* and count again.
                </>
              ) : (
                <>
                  Built with t* = {fmt(tStar(confidence, capN - 1), 4)}, which is wider than z* = {fmt(zStar(confidence), 4)} by exactly enough to pay for estimating σ from {fmtInt(capN)}{' '}
                  observations. {fmtInt(captured)} of the hundred cover the true mean against {fmt(CAPTURE_RUNS * nominal, 0)} expected. A hundred intervals wobble; the method does not.
                </>
              )}
            </Note>
          </>
        )}
      </div>
    </Panel>
  )
}
