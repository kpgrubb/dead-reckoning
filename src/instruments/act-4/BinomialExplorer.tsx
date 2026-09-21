/**
 * TACTICAL · BINOMIAL (act-4-08, act-4-09) — the count of successes in a fixed number of independent
 * trials, from a twelve-pass close-pass window up to the Lane's 2,612 transits.
 *
 * Probability mode answers "how many". The region controls keep P(X ≤ k) and P(X < k) on screen
 * together, because on a discrete count they are different numbers and the difference is a whole cell.
 *
 * Parameters mode is 4-09's argument: μ = np, σ = √(np(1 − p)), a μ ± 2σ band, and the observed count
 * laid on top. Switch the baseline from the Board's comparison corridor to the 2176 report and nothing
 * changes but p — and 31 losses go from ordinary to five standard deviations out. The Board is not
 * lying about the arithmetic. It is choosing the p.
 *
 * Above ~120 support points the pmf is binned with `binomial.between` so the display never draws
 * thousands of rectangles. Tails use `binomial.atLeast` / `binomial.sf`, never 1 − cdf.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import {
  ChartSurface,
  Legend,
  NumberField,
  PlotClip,
  Readout,
  ReadoutRow,
  Segmented,
  Slider,
  XAxis,
  YAxis,
  chartTheme,
  semanticColor,
  useChartFrame,
  type LegendItem,
} from '@/instruments/shared'
import { binomial, binomialMoments, fmt, fmtInt, fmtP } from '@/lib/stats'
import { BASELINES, BOARD_FIT, LEDGER_LOSSES, LEDGER_TRANSITS, ROOK_FIT } from './data'
import { KeyTable, Note, Subhead, oneIn, stackStyle } from './_ui'

export interface BinomialExplorerProps {
  /** Number of trials. */
  n?: number
  /** Success probability on one trial. */
  p?: number
  /** The count the region controls are read at. */
  k?: number
  /** Which half of the instrument opens. */
  mode?: 'probability' | 'parameters'
  /** The observed count marked in parameters mode. */
  observed?: number
  /** What one trial is, in words ("a Lane transit", "a close pass"). */
  label?: string
}

type Mode = 'probability' | 'parameters'
type Region = 'eq' | 'le' | 'lt' | 'ge' | 'gt'
type Preset = 'board' | 'rook' | 'custom'

const N_MIN = 1
const N_MAX = 4000
const P_MIN = 0.0005
const P_MAX = 0.99
const MAX_BARS = 120
const TARGET_BINS = 60
const REGION_LABEL: Record<Region, string> = { eq: 'P(X = k)', le: 'P(X ≤ k)', lt: 'P(X < k)', ge: 'P(X ≥ k)', gt: 'P(X > k)' }

interface Cell {
  lo: number
  hi: number
  mid: number
  p: number
}

export function BinomialExplorer({
  n: nProp = LEDGER_TRANSITS,
  p: pProp = BASELINES.board.p,
  k: kProp = LEDGER_LOSSES,
  mode: modeProp = 'probability',
  observed: observedProp = LEDGER_LOSSES,
  label = 'a Lane transit',
}: BinomialExplorerProps) {
  const [mode, setMode] = useState<Mode>(modeProp)
  const [n, setNRaw] = useState(nProp)
  const [p, setPRaw] = useState(pProp)
  const [k, setKRaw] = useState(kProp)
  const [region, setRegion] = useState<Region>('ge')
  const [observed, setObserved] = useState(observedProp)
  const [preset, setPreset] = useState<Preset>(() => (pProp === BASELINES.board.p ? 'board' : pProp === BASELINES.rook.p ? 'rook' : 'custom'))

  const clampN = (v: number) => Math.min(N_MAX, Math.max(N_MIN, Math.round(v)))
  const clampP = (v: number) => Math.min(P_MAX, Math.max(P_MIN, v))
  const setN = (v: number) => {
    const next = clampN(v)
    setNRaw(next)
    setKRaw((prev) => Math.min(next, Math.max(0, prev)))
    setObserved((prev) => Math.min(next, Math.max(0, prev)))
  }
  const setP = (v: number) => {
    setPRaw(clampP(v))
    setPreset('custom')
  }
  const setK = (v: number) => setKRaw(Math.min(n, Math.max(0, Math.round(v))))
  const usePreset = (which: Preset) => {
    if (which === 'board') {
      setNRaw(LEDGER_TRANSITS)
      setPRaw(BASELINES.board.p)
    } else if (which === 'rook') {
      setNRaw(LEDGER_TRANSITS)
      setPRaw(BASELINES.rook.p)
    }
    setPreset(which)
  }

  /* ---- Moments ---- */
  const { mean: mu, sd: sigma } = binomialMoments(n, p)
  const z = sigma > 0 ? (observed - mu) / sigma : NaN
  const tailAtObserved = binomial.atLeast(Math.round(observed), n, p)

  /* ---- Display window and binning ---- */
  const lo = Math.max(0, Math.floor(Math.min(mu - 5 * sigma, k - 2, observed - 2)))
  const hi = Math.min(n, Math.ceil(Math.max(mu + 5 * sigma, k + 2, observed + 2)))
  const span = hi - lo + 1
  const binWidth = span > MAX_BARS ? Math.ceil(span / TARGET_BINS) : 1
  const binned = binWidth > 1

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = []
    for (let c = lo; c <= hi; c += binWidth) {
      const cHi = Math.min(hi, c + binWidth - 1)
      out.push({ lo: c, hi: cHi, mid: (c + cHi) / 2, p: binWidth === 1 ? binomial.pmf(c, n, p) : binomial.between(c, cHi, n, p) })
    }
    return out
  }, [lo, hi, binWidth, n, p])

  /* ---- The region ---- */
  const pEq = binomial.pmf(k, n, p)
  const pLe = binomial.cdf(k, n, p)
  const pLt = binomial.cdf(k - 1, n, p)
  const pGe = binomial.atLeast(k, n, p)
  const pGt = binomial.sf(k, n, p)
  const regionValue = region === 'eq' ? pEq : region === 'le' ? pLe : region === 'lt' ? pLt : region === 'ge' ? pGe : pGt
  const inRegion = (x: number) => (region === 'eq' ? x === k : region === 'le' ? x <= k : region === 'lt' ? x < k : region === 'ge' ? x >= k : x > k)

  /* ---- Geometry ---- */
  const frame = useChartFrame({ height: 300, yLabel: true })
  const x = useMemo(() => scaleLinear().domain([lo - 0.5, hi + 0.5]).range([0, frame.innerWidth]), [lo, hi, frame.innerWidth])
  const yMax = Math.max(1e-12, ...cells.map((c) => c.p)) * 1.14
  const y = useMemo(() => scaleLinear().domain([0, yMax]).range([frame.innerHeight, 0]), [yMax, frame.innerHeight])
  const cellPx = Math.max(1, x(lo + binWidth) - x(lo) - (binned ? 0 : chartTheme.mark.gap))

  const table = useMemo(
    () => ({
      columns: [binned ? 'successes (bin)' : 'successes k', binned ? 'P(bin)' : 'P(X = k)', 'P(X ≤ upper)'],
      rows: cells.map((c) => [binned ? `${c.lo}–${c.hi}` : String(c.lo), fmt(c.p, 6), fmt(binomial.cdf(c.hi, n, p), 6)]),
      caption: `Binomial(n = ${fmtInt(n)}, p = ${fmt(p, 5)}) · μ = ${fmt(mu, 3)}, σ = ${fmt(sigma, 3)}${binned ? ` · binned ${binWidth} counts to a bar` : ''}`,
    }),
    [cells, binned, binWidth, n, p, mu, sigma],
  )

  /* ---- The k handle: click the plot, or focus the handle and use the arrow keys ---- */
  const [dragging, setDragging] = useState(false)
  const kFromPointer = (e: PointerEvent<SVGElement>) => {
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setK(x.invert(e.clientX - rect.left - frame.margin.left))
  }
  const onHandleKey = (e: KeyboardEvent<SVGCircleElement>) => {
    const step = (e.shiftKey ? 10 : 1) * Math.max(1, binWidth)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setK(k - step)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setK(k + step)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setK(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setK(n)
    }
  }

  /* ---- Conditions ---- */
  const tenPercentPopulation = 10 * n
  const conditions: (readonly [string, string])[] = [
    ['Binary', `Each ${label} either ends in the event or it does not. Two outcomes, no third.`],
    ['Independent', `One ${label} does not change the chance on the next. Scheduled hulls on a public plot qualify; own-ship re-sweeps do not.`],
    ['Number fixed', `n = ${fmtInt(n)} is fixed before the count is taken, not read off after it.`],
    ['Same probability', `p = ${fmt(p, 5)} on every trial — one rate, not a rate that drifts across the six years.`],
    ['10% condition', `Sampling without replacement needs n ≤ 10% of the population: ${fmtInt(n)} trials require at least ${fmtInt(tenPercentPopulation)} to draw from, or the trials are not independent enough for the binomial model.`],
  ]

  /* ---- Shape ---- */
  const np = n * p
  const nq = n * (1 - p)
  const shape =
    np < 10 || nq < 10
      ? `np = ${fmt(np, 2)} and n(1 − p) = ${fmt(nq, 2)}. With one of them under ten the pmf is visibly skewed ${np < nq ? 'right' : 'left'} — the mass piles against the ${np < nq ? 'low' : 'high'} end and the far tail is long and thin.`
      : `np = ${fmt(np, 1)} and n(1 − p) = ${fmt(nq, 1)}, both at or above ten. The pmf has gone nearly symmetric about μ = ${fmt(mu, 1)}, and a normal curve with the same mean and SD would trace it closely.`

  const legend: LegendItem[] = [
    { label: binned ? `P(bin) · ${binWidth} counts a bar` : 'P(X = k)', color: semanticColor('null'), shape: 'square' },
    ...(mode === 'probability' ? [{ label: `${REGION_LABEL[region].replace('k', fmtInt(k))} = ${fmt(regionValue, 5)}`, color: semanticColor('fit'), shape: 'square' as const }] : []),
    ...(mode === 'parameters'
      ? [
          { label: `μ ± 2σ · ${fmt(mu - 2 * sigma, 1)} to ${fmt(mu + 2 * sigma, 1)}`, color: semanticColor('shade'), shape: 'area' as const },
          { label: `observed ${fmtInt(observed)}`, color: semanticColor('observed'), shape: 'line' as const },
        ]
      : []),
  ]

  const presetLabel = preset === 'board' ? BASELINES.board.label : preset === 'rook' ? BASELINES.rook.label : `p = ${fmt(p, 5)}`

  return (
    <Panel label="TACTICAL · BINOMIAL" status={`n = ${fmtInt(n)} · p = ${fmt(p, 5)}`} tone="tactical" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="display"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'probability', label: 'probability' },
              { value: 'parameters', label: 'parameters' },
            ]}
          />
          <Segmented<Preset>
            label="baseline"
            value={preset}
            onChange={usePreset}
            options={[
              { value: 'board', label: "the Board's corridor" },
              { value: 'rook', label: 'the 2176 report' },
              { value: 'custom', label: 'set by hand', disabled: preset !== 'custom' },
            ]}
          />
        </div>

        <div className="dr-controls">
          <Slider label="n · trials" value={Number(Math.log10(n).toFixed(4))} min={0} max={Number(Math.log10(N_MAX).toFixed(4))} step={0.002} onChange={(v) => setN(10 ** v)} format={(v) => fmtInt(10 ** v)} />
          <NumberField label="n exactly" value={n} onChange={setN} min={N_MIN} max={N_MAX} step={1} units="trials" />
          <Slider label="p · per trial" value={Number(Math.log10(p).toFixed(4))} min={Number(Math.log10(P_MIN).toFixed(4))} max={Number(Math.log10(P_MAX).toFixed(4))} step={0.002} onChange={(v) => setP(10 ** v)} format={(v) => fmt(10 ** v, 5)} />
          <NumberField label="p exactly" value={Number(p.toFixed(6))} onChange={setP} min={P_MIN} max={P_MAX} step={0.001} />
        </div>

        {mode === 'probability' ? (
          <div className="dr-controls">
            <Segmented<Region>
              label="region"
              value={region}
              onChange={setRegion}
              options={[
                { value: 'eq', label: 'P(X = k)' },
                { value: 'le', label: 'P(X ≤ k)' },
                { value: 'lt', label: 'P(X < k)' },
                { value: 'ge', label: 'P(X ≥ k)' },
                { value: 'gt', label: 'P(X > k)' },
              ]}
            />
            <NumberField label="k · successes" value={k} onChange={setK} min={0} max={n} step={1} />
          </div>
        ) : (
          <div className="dr-controls">
            <NumberField label="observed count" value={observed} onChange={(v) => setObserved(Math.min(n, Math.max(0, Math.round(v))))} min={0} max={n} step={1} />
          </div>
        )}

        {mode === 'probability' ? (
          <>
            <ReadoutRow>
              <Readout label={REGION_LABEL[region].replace('k', fmtInt(k))} value={fmt(regionValue, 5)} tone="tactical" size="lg" live />
              <Readout label="that is" value={oneIn(regionValue)} size="sm" live />
              <Readout label={`P(X ≤ ${fmtInt(k)})`} value={fmt(pLe, 5)} size="sm" live />
              <Readout label={`P(X < ${fmtInt(k)})`} value={fmt(pLt, 5)} size="sm" live />
              <Readout label={`the cell between them · P(X = ${fmtInt(k)})`} value={fmt(pEq, 5)} size="sm" tone={pEq > 0 ? 'alert' : 'default'} live />
            </ReadoutRow>
            <ReadoutRow>
              <Readout label="μ = np" value={fmt(mu, 3)} tone="tactical" live />
              <Readout label="σ = √(np(1−p))" value={fmt(sigma, 3)} tone="tactical" live />
            </ReadoutRow>
          </>
        ) : (
          <>
            <ReadoutRow>
              <Readout label="μ = np" value={fmt(mu, 2)} tone="tactical" size="lg" live />
              <Readout label="σ = √(np(1−p))" value={fmt(sigma, 3)} tone="tactical" size="lg" live />
              <Readout label="observed" value={fmtInt(observed)} tone="alert" live />
              <Readout label="(x − μ)/σ" value={fmt(z, 2)} tone="alert" size="lg" live />
              <Readout label="P(X ≥ observed)" value={fmtP(tailAtObserved)} tone="alert" live />
              <Readout label="that is" value={oneIn(tailAtObserved)} size="sm" live />
            </ReadoutRow>
            <ReadoutRow>
              <Readout label="np quoted as the SD — WRONG" value={fmt(np, 2)} size="sm" tone="alert" />
              <Readout label="μ − 2σ" value={fmt(mu - 2 * sigma, 2)} size="sm" live />
              <Readout label="μ + 2σ" value={fmt(mu + 2 * sigma, 2)} size="sm" live />
            </ReadoutRow>
            <Note tone="warn">
              np is the mean, not the spread. Quoting {fmt(np, 2)} as the standard deviation of a count of {fmtInt(n)} trials confuses where the distribution sits with how far it wanders — the second factor, (1 − p), and the square root are both missing. The SD is {fmt(sigma, 3)}.
            </Note>
          </>
        )}

        <ChartSurface
          frame={frame}
          ariaLabel={`Binomial probability distribution for ${fmtInt(n)} trials at probability ${fmt(p, 5)}${mode === 'parameters' ? `, with the mean plus or minus two standard deviations shaded and the observed count of ${fmtInt(observed)} marked` : `, with ${REGION_LABEL[region].replace('k', fmtInt(k))} shaded`}`}
          description={`${binned ? `The support is binned ${binWidth} counts to a bar.` : 'One bar per possible count.'} The mean is ${fmt(mu, 3)} and the standard deviation ${fmt(sigma, 3)}. ${mode === 'probability' ? `${REGION_LABEL[region].replace('k', fmtInt(k))} is ${fmt(regionValue, 5)}. The k marker sits on the axis: focus it and press the left or right arrow key (Shift for ten steps), or click anywhere on the plot.` : `The observed count ${fmtInt(observed)} is ${fmt(z, 2)} standard deviations from the mean, and P(X ≥ ${fmtInt(observed)}) is ${fmtP(tailAtObserved)}.`} The data table lists every bar with its probability.`}
          table={table}
          footer={<Legend items={legend} ariaLabel="Binomial key" />}
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={y} width={frame.innerWidth} ticks={4} label="probability" />
            <PlotClip frame={frame}>
              {mode === 'parameters' && (
                <rect x={x(mu - 2 * sigma)} y={0} width={Math.max(0, x(mu + 2 * sigma) - x(mu - 2 * sigma))} height={frame.innerHeight} fill={semanticColor('shade')} fillOpacity={0.3} />
              )}
              {cells.map((c) => {
                const top = y(c.p)
                const shaded = mode === 'probability' && inRegion(c.mid)
                return (
                  <rect
                    key={c.lo}
                    className="dr-mark dr-mark--bar"
                    x={x(c.lo - 0.5)}
                    y={top}
                    width={cellPx}
                    height={Math.max(0, frame.innerHeight - top)}
                    fill={shaded ? semanticColor('fit') : semanticColor('null')}
                    fillOpacity={chartTheme.mark.alpha}
                  >
                    <title>
                      {binned ? `${c.lo}–${c.hi}` : c.lo}: {fmt(c.p, 6)}
                    </title>
                  </rect>
                )
              })}
              {mode === 'parameters' && (
                <line x1={x(mu)} x2={x(mu)} y1={0} y2={frame.innerHeight} stroke={semanticColor('reference')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
              )}
              {mode === 'parameters' && (
                <line x1={x(observed)} x2={x(observed)} y1={0} y2={frame.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.line} />
              )}
            </PlotClip>
            {mode === 'probability' && (
              <>
                <rect
                  x={0}
                  y={0}
                  width={frame.innerWidth}
                  height={frame.innerHeight}
                  fill="transparent"
                  onPointerDown={(e) => {
                    setDragging(true)
                    kFromPointer(e)
                  }}
                  onPointerMove={(e) => dragging && kFromPointer(e)}
                  onPointerUp={() => setDragging(false)}
                  onPointerCancel={() => setDragging(false)}
                />
                <line x1={x(k)} x2={x(k)} y1={0} y2={frame.innerHeight} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
                <circle
                  className={`dr-mark dr-mark--draggable${dragging ? ' is-dragging' : ''}`}
                  cx={x(k)}
                  cy={frame.innerHeight}
                  r={7}
                  fill={semanticColor('rejected')}
                  stroke={chartTheme.color.ring}
                  strokeWidth={chartTheme.mark.ring}
                  paintOrder="stroke"
                  tabIndex={0}
                  role="slider"
                  aria-label="k, the count the region is read at"
                  aria-valuenow={k}
                  aria-valuemin={0}
                  aria-valuemax={n}
                  aria-valuetext={`${fmtInt(k)} of ${fmtInt(n)}`}
                  onKeyDown={onHandleKey}
                >
                  <title>k = {fmtInt(k)}</title>
                </circle>
              </>
            )}
            <XAxis scale={x} height={frame.innerHeight} label={`successes in ${fmtInt(n)} trials`} />
          </g>
        </ChartSurface>

        {mode === 'probability' ? (
          <Note tone={pEq > 0 && pLe !== pLt ? 'warn' : 'muted'} live>
            P(X ≤ {fmtInt(k)}) = {fmt(pLe, 5)} and P(X &lt; {fmtInt(k)}) = {fmt(pLt, 5)}. The gap is {fmt(pEq, 5)}, which is the whole of the cell at {fmtInt(k)}. "At most" keeps it; "fewer than" does not. On a count there is no rounding to hide behind — the boundary is a real quantity of probability, and reading the wrong side of it is the commonest way this question is lost.
          </Note>
        ) : (
          <Note tone="alert" live>
            Under {presetLabel}, a count of {fmtInt(n)} trials centres on {fmt(mu, 2)} with a standard deviation of {fmt(sigma, 3)}. The observed {fmtInt(observed)} sits {fmt(z, 2)} standard deviations out, and P(X ≥ {fmtInt(observed)}) = {fmtP(tailAtObserved)} — {oneIn(tailAtObserved)}. Change nothing but the baseline: under {BASELINES.board.label} the same count is z = {fmt(BOARD_FIT.z, 2)} and a tail of {fmtP(BOARD_FIT.tail)}; under {BASELINES.rook.label} it is z = {fmt(ROOK_FIT.z, 2)} and {fmtP(ROOK_FIT.tail)}. Same n, same count, same arithmetic. The argument is entirely about which p the Lane is entitled to.
          </Note>
        )}

        <Note live>{shape}</Note>

        <section aria-label="Binomial conditions">
          <Subhead>BINS · what the model requires</Subhead>
          <KeyTable columns={['condition', 'what it means here']} rows={conditions.map(([a, b]) => [a, b])} ariaLabel="Binomial conditions checklist" caption="A binomial answer is only as good as these four lines, and the 10% condition when the trials are draws from a finite population." />
        </section>
      </div>
    </Panel>
  )
}
