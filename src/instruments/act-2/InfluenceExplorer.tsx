/**
 * InfluenceExplorer — act-2-05 · INTEL · LEVERAGE AND INFLUENCE.
 *
 * The 412 Manifest points, fixed, with one exception: MV *Cyrene Ore* (60,000 t, alone at the top of
 * the x-range) can be dragged, nudged with arrow keys, or set by two sliders. The fit WITH and WITHOUT
 * her are drawn side by side; slope, r², s, leverage and Cook's D respond live, and a Minitab-style
 * computer-output block re-prints for the selected fit.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components'
import { ChartSurface, DataTable, Legend, PlotClip, Readout, ReadoutRow, Segmented, Slider, XAxis, YAxis, chartTheme, niceTicks, padDomain, semanticColor, seriesColor, useChartFrame } from '@/instruments/shared'
import { fmt, fmtInt, fmtP, linearRegression, t, type RegressionFit } from '@/lib/stats'
import { CYRENE_ORE_INDEX, manifest, massFitWithout } from './data'
import './act2-b.css'

const CY = CYRENE_ORE_INDEX
const cyrene = manifest[CY]
const X_RANGE: [number, number] = [10000, 70000]
const Y_RANGE: [number, number] = [10000, 75000]
const xsFixed = manifest.map((d) => d.declaredMass)
const ysFixed = manifest.map((d) => d.inferredMass)
const fitWithout: RegressionFit = massFitWithout(CY)
const xDomain = padDomain([Math.min(...xsFixed), X_RANGE[1]], 0.05)
const yDomain = padDomain([Math.min(...ysFixed), Y_RANGE[1]], 0.05)
const R = chartTheme.mark.dotR

type Mode = 'with' | 'without' | 'compare'

const clamp = (v: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, v))

/** Classic computer-output rows for a fit: Predictor · Coef · SE Coef · T · P. */
function outputRows(fit: RegressionFit): (string | number)[][] {
  const df = fit.n - 2
  const row = (name: string, coef: number, se: number, digits: number) => {
    const T = coef / se
    return [name, fmt(coef, digits), fmt(se, digits), fmt(T, 2), fmtP(2 * t.sf(Math.abs(T), df))]
  }
  return [row('Constant', fit.intercept, fit.seIntercept, 1), row('Declared mass', fit.slope, fit.seSlope, 4)]
}

export function InfluenceExplorer() {
  const [cx, setCx] = useState(cyrene.declaredMass)
  const [cy, setCy] = useState(cyrene.inferredMass)
  const [mode, setMode] = useState<Mode>('with')
  const [dragging, setDragging] = useState(false)

  const fitWith = useMemo(() => {
    const xs = xsFixed.slice()
    const ys = ysFixed.slice()
    xs[CY] = cx
    ys[CY] = cy
    return linearRegression(xs, ys)
  }, [cx, cy])
  const fit = mode === 'without' ? fitWithout : fitWith
  const n = manifest.length
  const cut = 4 / n
  const highLev = fitWith.flags.highLeverage.includes(CY)
  const influential = fitWith.flags.influential.includes(CY)
  const flag = `${highLev ? 'high leverage' : 'ordinary leverage'} · ${influential ? 'INFLUENTIAL' : 'not influential'}`
  const r2adj = 1 - ((1 - fit.r2) * (fit.n - 1)) / (fit.n - 2)

  const frame = useChartFrame({ height: 320, yLabel: true })
  const x = useMemo(() => scaleLinear().domain(xDomain).range([0, frame.innerWidth]), [frame.innerWidth])
  const y = useMemo(() => scaleLinear().domain(yDomain).range([frame.innerHeight, 0]), [frame.innerHeight])
  const path = (f: RegressionFit) => `M${x(xDomain[0])},${y(f.predict(xDomain[0]))}L${x(xDomain[1])},${y(f.predict(xDomain[1]))}`

  const move = (nx: number, ny: number) => {
    setCx(Math.round(clamp(nx, X_RANGE)))
    setCy(Math.round(clamp(ny, Y_RANGE)))
  }
  const reset = () => {
    setCx(cyrene.declaredMass)
    setCy(cyrene.inferredMass)
  }
  const onPointerDown = (e: PointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }
  const onPointerMove = (e: PointerEvent<SVGCircleElement>) => {
    if (!dragging) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    move(x.invert(e.clientX - rect.left - frame.margin.left), y.invert(e.clientY - rect.top - frame.margin.top))
  }
  const onPointerUp = () => setDragging(false)
  const onKeyDown = (e: KeyboardEvent<SVGCircleElement>) => {
    const k = (e.shiftKey ? 10 : 1) * 500
    const d: Record<string, [number, number]> = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, k], ArrowDown: [0, -k] }
    const v = d[e.key]
    if (!v) return
    e.preventDefault()
    move(cx + v[0], cy + v[1])
  }

  const table = useMemo(
    () => ({
      columns: ['hull', 'declared (t)', 'inferred (t)', 'predicted (t)', 'residual (t)'],
      rows: manifest.map((d, i) => {
        const dx = i === CY ? cx : d.declaredMass
        const dy = i === CY ? cy : d.inferredMass
        const yhat = fit.predict(dx)
        return [d.hull, dx, dy, Number(yhat.toFixed(1)), Number((dy - yhat).toFixed(1))]
      }),
      caption: `Fit ${mode === 'without' ? 'without' : 'with'} Cyrene Ore: ${fit.equation(4)}`,
    }),
    [cx, cy, fit, mode],
  )

  const legend = [
    { label: 'fit with Cyrene Ore', color: chartTheme.color.fit, shape: 'line' as const, muted: mode === 'without' },
    { label: 'fit without Cyrene Ore', color: semanticColor('null'), shape: 'dashed' as const, muted: mode === 'with' },
    { label: 'Cyrene Ore (draggable)', color: chartTheme.color.observed, shape: 'dot' as const },
  ]

  return (
    <Panel label="INTEL · LEVERAGE AND INFLUENCE" tone="intel" led="on" status={`n = ${n}`} ariaLabel="Influence explorer: drag Cyrene Ore and watch the least-squares fit with and without her">
      <p className="dr-act2b-note">Drag Cyrene Ore, or use the sliders. Arrow keys on the point nudge 500 t (Shift ×10).</p>
      <div className="dr-controls">
        <Slider label="CYRENE ORE · DECLARED MASS" value={cx} min={X_RANGE[0]} max={X_RANGE[1]} step={100} units="t" onChange={(v) => setCx(v)} format={fmtInt} />
        <Slider label="CYRENE ORE · INFERRED MASS" value={cy} min={Y_RANGE[0]} max={Y_RANGE[1]} step={100} units="t" onChange={(v) => setCy(v)} format={fmtInt} />
        <Segmented<Mode>
          label="FIT"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'with', label: 'with' },
            { value: 'without', label: 'without' },
            { value: 'compare', label: 'compare' },
          ]}
        />
      </div>

      <ChartSurface frame={frame} ariaLabel="Inferred mass against declared mass; Cyrene Ore is the draggable point at the top of the declared-mass range" description="Scatter of 412 departures. One point, Cyrene Ore, sits far to the right of the others; the least-squares line with and without it is drawn." table={table} footer={<Legend items={legend} />}>
        <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
          <YAxis scale={y} width={frame.innerWidth} ticks={5} label="inferred mass (t)" />
          <PlotClip frame={frame}>
            {manifest.map((d, i) =>
              i === CY ? null : <circle key={i} className="dr-mark dr-mark--dot" cx={x(d.declaredMass)} cy={y(d.inferredMass)} r={R - 1} fill={seriesColor(0)} fillOpacity={chartTheme.mark.alpha} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke" />,
            )}
            {mode !== 'with' && <path className="dr-mark dr-mark--line" d={path(fitWithout)} fill="none" stroke={semanticColor('null')} strokeWidth={chartTheme.stroke.fit} strokeDasharray={chartTheme.dash} strokeLinecap="round" />}
            {mode !== 'without' && <path className="dr-mark dr-mark--line" d={path(fitWith)} fill="none" stroke={chartTheme.color.fit} strokeWidth={chartTheme.stroke.fit} strokeLinecap="round" />}
            <circle
              className={['dr-mark', 'dr-mark--dot', 'dr-mark--draggable', dragging ? 'is-dragging' : ''].filter(Boolean).join(' ')}
              cx={x(cx)}
              cy={y(cy)}
              r={R + 3}
              fill={chartTheme.color.observed}
              fillOpacity={mode === 'without' ? 0.45 : 1}
              stroke={chartTheme.color.ring}
              strokeWidth={chartTheme.mark.ring}
              paintOrder="stroke"
              tabIndex={0}
              role="button"
              aria-label={`Cyrene Ore: declared ${fmtInt(cx)} t, inferred ${fmtInt(cy)} t. Arrow keys to move.`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              <title>Cyrene Ore ({fmtInt(cx)}, {fmtInt(cy)})</title>
            </circle>
            <text x={x(cx) > frame.innerWidth * 0.7 ? x(cx) - R - 8 : x(cx) + R + 8} y={y(cy) + 4} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick} textAnchor={x(cx) > frame.innerWidth * 0.7 ? 'end' : 'start'} aria-hidden="true">
              Cyrene Ore
            </text>
          </PlotClip>
          <XAxis scale={x} height={frame.innerHeight} ticks={niceTicks(xDomain[0], xDomain[1], frame.innerWidth < 420 ? 4 : 7)} label="declared mass (t)" />
        </g>
      </ChartSurface>

      <div className="dr-act2b-actions">
        <button type="button" className="dr-btn dr-btn--sm" onClick={reset}>
          RESET CYRENE ORE
        </button>
        <span className="dr-act2b-note" style={{ margin: 0 }}>
          readouts: fit {mode === 'without' ? 'WITHOUT' : 'WITH'} Cyrene Ore
        </span>
      </div>
      <ReadoutRow>
        <Readout label="SLOPE" value={fmt(fit.slope, 4)} tone="intel" size="sm" live />
        <Readout label="INTERCEPT" value={fmt(fit.intercept, 1)} units="t" size="sm" />
        <Readout label="r" value={fmt(fit.r, 3)} size="sm" />
        <Readout label="r²" value={fmt(fit.r2, 3)} size="sm" />
        <Readout label="s" value={fmt(fit.s, 1)} units="t" size="sm" />
        {mode === 'compare' && <Readout label="Δ SLOPE (WITH − WITHOUT)" value={fmt(fitWith.slope - fitWithout.slope, 4)} size="sm" />}
      </ReadoutRow>
      <ReadoutRow>
        <Readout label="LEVERAGE · CYRENE ORE" value={fmt(fitWith.leverage[CY], 3)} tone={highLev ? 'alert' : 'default'} size="sm" />
        <Readout label="LEVERAGE CUTOFF 4/n" value={fmt(cut, 4)} size="sm" />
        <Readout label="COOK'S D · CYRENE ORE" value={fmt(fitWith.cooks[CY], 3)} tone={influential ? 'alert' : 'default'} size="sm" live />
        <Readout label="COOK'S D CUTOFF 4/n" value={fmt(cut, 4)} size="sm" />
        <Readout label="FLAG" value={flag} tone={influential ? 'alert' : 'intel'} size="sm" live />
      </ReadoutRow>

      <div className="dr-act2b-output" aria-label={`Computer output for the fit ${mode === 'without' ? 'without' : 'with'} Cyrene Ore`}>
        <div className="dr-act2b-output__title">COMPUTER OUTPUT · inferred mass = Constant + Declared mass</div>
        <DataTable columns={['Predictor', 'Coef', 'SE Coef', 'T', 'P']} rows={outputRows(fit)} />
        <p className="dr-act2b-output__foot">
          S = {fmt(fit.s, 1)}   R-Sq = {fmt(100 * fit.r2, 1)} %   R-Sq(adj) = {fmt(100 * r2adj, 1)} %
        </p>
      </div>
    </Panel>
  )
}
