/**
 * RandomizationMachine (act-3-05) — "The escort lottery."
 *
 * The whole trial is twelve transits and one number: escorted mean advisories minus unescorted. The
 * learner re-deals the ESCORT labels — once, a hundred at a time, or all C(12,6) = 924 ways — and
 * watches where the observed difference falls in the distribution those relabellings make. It falls
 * in the middle. That is the lesson: with six transits a side, a gap of two thirds of an advisory is
 * the sort of thing the lottery itself produces about a quarter of the time.
 *
 * Simulated shuffles go through `permutationTest` from `@/lib/stats` (seeded `rng('act-3-05', …)`);
 * the exact distribution and its p-value come from `exactRandomization` in `./data`. No p-value is
 * ever typed in.
 */
import { useCallback, useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components'
import { ChartSurface, Histogram, Legend, PlotClip, Readout, ReadoutRow, XAxis, chartTheme, semanticColor, useChartFrame } from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtP, mean, permutationPValue, permutationTest } from '@/lib/stats'
import { LOTTERY_ESCORTED, LOTTERY_EXACT, LOTTERY_TRANSITS, LOTTERY_UNESCORTED, type ExactRandomization, type LotteryTransit } from './data'
import './act3.css'

export interface RandomizationMachineProps {
  /** Response values for the escorted group. Defaults to the escort lottery. */
  escorted?: readonly number[]
  unescorted?: readonly number[]
  /** The exact randomization distribution for those two groups. */
  exact?: ExactRandomization
  /** The transits behind the values, for the strip and the shuffle log. */
  transits?: readonly LotteryTransit[]
  /** What the readouts call this trial. */
  name?: string
}

interface Shuffle {
  index: number
  labels: string[]
  diff: number
}

export function RandomizationMachine({ escorted = LOTTERY_ESCORTED, unescorted = LOTTERY_UNESCORTED, exact = LOTTERY_EXACT, transits = LOTTERY_TRANSITS, name = 'the escort lottery' }: RandomizationMachineProps = {}) {
  const [stats, setStats] = useState<number[]>([])
  const [mode, setMode] = useState<'simulated' | 'exact'>('simulated')
  const [runIndex, setRunIndex] = useState(0)
  const [last, setLast] = useState<Shuffle | null>(null)

  /** Pooled units in the order `exactRandomization` uses: escorted group first. */
  const units = useMemo(() => {
    const e = transits.filter((t) => t.escorted)
    const u = transits.filter((t) => !t.escorted)
    const consistent = e.length === escorted.length && u.length === unescorted.length
    const pooled = [...escorted, ...unescorted]
    const labels = consistent ? [...e, ...u].map((t) => String(t.label).padStart(2, '0')) : pooled.map((_, i) => String(i + 1).padStart(2, '0'))
    const hulls = consistent ? [...e, ...u].map((t) => t.hull) : pooled.map((_, i) => `unit ${i + 1}`)
    return { pooled, labels, hulls, na: escorted.length, groups: consistent ? [...e, ...u] : null }
  }, [transits, escorted, unescorted])

  const observed = exact.observed
  const reset = useCallback(() => {
    setStats([])
    setMode('simulated')
    setLast(null)
    setRunIndex(0)
  }, [])

  const shuffleOnce = useCallback(() => {
    const next = runIndex + 1
    setRunIndex(next)
    const r = rng('act-3-05', name, next)
    const order = r.shuffle(units.pooled.map((_, i) => i))
    const aIdx = order.slice(0, units.na)
    const bIdx = order.slice(units.na)
    const diff = mean(aIdx.map((i) => units.pooled[i])) - mean(bIdx.map((i) => units.pooled[i]))
    setMode('simulated')
    setLast({ index: next, labels: aIdx.map((i) => units.labels[i]).sort(), diff })
    setStats((prev) => [...prev, diff])
  }, [runIndex, name, units])

  const shuffleMany = useCallback(
    (reps: number) => {
      const next = runIndex + 1
      setRunIndex(next)
      const res = permutationTest(escorted, unescorted, { rng: rng('act-3-05', name, 'batch', next), reps, alt: 'less' })
      setMode('simulated')
      setLast(null)
      setStats((prev) => [...prev, ...res.stats])
    },
    [runIndex, name, escorted, unescorted],
  )

  const shown = mode === 'exact' ? exact.diffs : stats
  const count = shown.length
  const pLess = mode === 'exact' ? exact.pLess : count ? permutationPValue(shown, observed, 'less') : NaN
  const pTwo = mode === 'exact' ? exact.pTwoSided : count ? permutationPValue(shown, observed, 'two-sided') : NaN
  const atOrBelow = count ? Math.round(pLess * count) : 0

  /** Bin on the lattice the difference actually lives on (relabellings give a discrete set). */
  const binWidth = useMemo(() => {
    const uniq = [...new Set(exact.diffs.map((d) => Math.round(d * 1e9) / 1e9))].sort((a, b) => a - b)
    let step = Infinity
    for (let i = 1; i < uniq.length; i++) step = Math.min(step, uniq[i] - uniq[i - 1])
    return Number.isFinite(step) && step > 0 ? step : undefined
  }, [exact])

  const span = Math.max(Math.abs(Math.min(...exact.diffs)), Math.abs(Math.max(...exact.diffs)))
  const domain: [number, number] = [-span, span]

  const description = `Randomization distribution of the difference in mean advisories, escorted minus unescorted, over ${fmtInt(count)} relabellings of ${name}. The observed difference is ${fmt(observed, 2)}; ${fmtInt(atOrBelow)} relabellings are at least that negative, a one-sided p-value of ${fmtP(pLess)}.`

  return (
    <Panel label="TACTICAL · RANDOMIZATION TEST" status={mode === 'exact' ? `EXACT · ${fmtInt(exact.count)} RELABELLINGS` : `${fmtInt(count)} SHUFFLES`} tone="tactical" led="on">
      <TrialStrip transits={units.groups} labels={units.labels} hulls={units.hulls} values={units.pooled} na={units.na} name={name} />

      <div className="dr-act3__buttons">
        <button type="button" className="dr-btn" onClick={shuffleOnce}>
          SHUFFLE ONCE
        </button>
        <button type="button" className="dr-btn dr-btn--primary" onClick={() => shuffleMany(100)}>
          SHUFFLE 100
        </button>
        <button type="button" className="dr-btn dr-btn--primary" onClick={() => shuffleMany(1000)}>
          SHUFFLE 1000
        </button>
        <button type="button" className="dr-btn" onClick={() => setMode('exact')} aria-pressed={mode === 'exact'}>
          EXACT (ALL {fmtInt(exact.count)})
        </button>
        <button type="button" className="dr-btn dr-btn--ghost" onClick={reset}>
          RESET
        </button>
      </div>

      {last && (
        <p className="dr-act3__shuffle" aria-live="polite">
          SHUFFLE {fmtInt(last.index)} · ESCORT → <strong>{last.labels.join(', ')}</strong> · difference <strong>{fmt(last.diff, 2)}</strong>
          {last.diff <= observed ? ' — at least as negative as the observed' : ''}
        </p>
      )}

      <Histogram
        values={shown}
        domain={domain}
        binWidth={binWidth}
        label="difference in mean advisories · escorted − unescorted"
        barsLabel={mode === 'exact' ? `all ${fmtInt(exact.count)} relabellings` : `${fmtInt(count)} shuffles`}
        references={[{ x: observed, label: 'observed', color: 'observed' }]}
        highlight={{ from: -Infinity, to: observed, color: 'shadeRejected', label: 'at least this negative' }}
        ariaLabel={`Randomization distribution of the difference in mean advisories over ${mode === 'exact' ? 'all ' + fmtInt(exact.count) : fmtInt(count)} relabellings, with the observed difference marked`}
        description={description}
      />

      <ReadoutRow>
        <Readout label="observed difference" value={fmt(observed, 2)} tone="tactical" />
        <Readout label="mean advisories · escorted" value={fmt(exact.meanA, 2)} size="sm" />
        <Readout label="mean advisories · unescorted" value={fmt(exact.meanB, 2)} size="sm" />
        <Readout label="relabellings used" value={fmtInt(count)} tone="sensor" live />
      </ReadoutRow>
      <ReadoutRow>
        <Readout label="relabellings at or below the observed" value={count ? fmtInt(atOrBelow) : '—'} stale={!count} live />
        <Readout label="one-sided p" value={count ? fmtP(pLess) : '—'} stale={!count} tone={count && pLess < 0.05 ? 'alert' : 'tactical'} live />
        <Readout label="two-sided p" value={count ? fmtP(pTwo) : '—'} stale={!count} live />
        <Readout label="mode" value={mode === 'exact' ? 'exact' : 'simulated'} size="sm" live />
      </ReadoutRow>

      <p className="dr-act3__note">
        Shuffle the ESCORT labels and the difference moves; the question is whether {fmt(observed, 2)} is unusual among the differences chance alone deals. Press <strong>EXACT</strong> to stop approximating: all {fmtInt(exact.count)} relabellings of {fmtInt(units.pooled.length)} transits, {fmtInt(atOrBelow || Math.round(exact.pLess * exact.count))} of them at least this negative. The observed difference sits in the body of the distribution, not the tail — which is not evidence that escorts do nothing, only that {fmtInt(units.pooled.length)} transits could not have told you either way.
      </p>
    </Panel>
  )
}

/** The whole trial on one axis: two labelled rows of dots, so the learner sees how few points there are. */
function TrialStrip({ transits, labels, hulls, values, na, name }: { transits: readonly LotteryTransit[] | null; labels: string[]; hulls: string[]; values: number[]; na: number; name: string }) {
  const frame = useChartFrame({ height: 170, margin: { top: 16, right: 18, bottom: 40, left: 96 } })
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const x = useMemo(() => scaleLinear().domain([lo - 0.5, hi + 0.5]).range([0, frame.innerWidth]), [lo, hi, frame.innerWidth])
  const rowY = [frame.innerHeight * 0.3, frame.innerHeight * 0.75]

  const marks = useMemo(() => {
    const seen = new Map<string, number>()
    return values.map((v, i) => {
      const row = i < na ? 0 : 1
      const key = `${row}:${v}`
      const k = seen.get(key) ?? 0
      seen.set(key, k + 1)
      return { i, v, row, stack: k }
    })
  }, [values, na])

  const table = useMemo(
    () => ({
      columns: ['transit', 'hull', 'owner', 'group', 'off-nominal advisories'],
      rows: values.map((v, i) => [labels[i], hulls[i], transits ? transits[i].owner : '—', i < na ? 'escorted' : 'unescorted', v]),
      caption: `${name}: ${values.length} transits, ${na} escorted by lot`,
    }),
    [values, labels, hulls, transits, na, name],
  )

  return (
    <ChartSurface
      frame={frame}
      ariaLabel={`The ${values.length} transits of ${name} by group, plotted by off-nominal advisories`}
      description={`Each transit is one dot. Escorted: ${values.slice(0, na).join(', ')}. Unescorted: ${values.slice(na).join(', ')}. Means ${fmt(mean(values.slice(0, na)), 2)} and ${fmt(mean(values.slice(na)), 2)}.`}
      table={table}
      footer={<Legend items={[{ label: 'escorted by lot', color: chartTheme.color.fit, shape: 'dot' }, { label: 'unescorted', color: semanticColor('null'), shape: 'dot' }, { label: 'group mean', color: semanticColor('reference'), shape: 'dashed' }]} ariaLabel="trial strip legend" />}
    >
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        {(['ESCORT', 'NO ESCORT'] as const).map((t, r) => (
          <text key={t} x={-10} y={rowY[r]} dy="0.35em" textAnchor="end" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
            {t}
          </text>
        ))}
        <PlotClip frame={frame}>
          {[0, 1].map((r) => {
            const vals = r === 0 ? values.slice(0, na) : values.slice(na)
            return <line key={`m${r}`} x1={x(mean(vals))} x2={x(mean(vals))} y1={rowY[r] - 22} y2={rowY[r] + 22} stroke={semanticColor('reference')} strokeDasharray={chartTheme.dash} strokeWidth={chartTheme.stroke.reference} />
          })}
          {marks.map((m) => (
            <g key={m.i}>
              <circle cx={x(m.v)} cy={rowY[m.row] - m.stack * 11} r={chartTheme.mark.dotR + 1} fill={m.row === 0 ? chartTheme.color.fit : semanticColor('null')} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke">
                <title>{`${hulls[m.i]} (transit ${labels[m.i]}) · ${m.row === 0 ? 'escorted' : 'unescorted'} · ${m.v} advisories`}</title>
              </circle>
              <text x={x(m.v) + 9} y={rowY[m.row] - m.stack * 11} dy="0.35em" fill={chartTheme.color.tick} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick - 1} pointerEvents="none">
                {labels[m.i]}
              </text>
            </g>
          ))}
        </PlotClip>
        <XAxis scale={x} height={frame.innerHeight} ticks={hi - lo + 2} label="off-nominal advisories logged for the transit" />
      </g>
    </ChartSurface>
  )
}
