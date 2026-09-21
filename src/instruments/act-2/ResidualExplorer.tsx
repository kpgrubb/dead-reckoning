/**
 * ResidualExplorer — act-2-04 · TACTICAL · RESIDUAL PLOT.
 *
 * Two linked panels over the 412 Manifest departures: inferred vs declared mass with the least-squares
 * line (`massFit`), and the residual plot beneath it with a zero line and a ±2·s band. Hovering or
 * focusing a hull lights it on both panels and fills the readout; ←/→ walk the hulls in declared-mass
 * order. RESIDUAL IN switches tonnes / % of declared; COLOUR BY later-lost reveals the count above +5 %.
 */
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { scaleLinear, type ScaleLinear } from 'd3'
import { Panel } from '@/components'
import { ChartSurface, HReferenceLine, Legend, PlotClip, Readout, ReadoutRow, Segmented, XAxis, YAxis, chartTheme, niceTicks, padDomain, seriesColor, useChartFrame } from '@/instruments/shared'
import { fmt, fmtInt, sd } from '@/lib/stats'
import { manifest, massFit, residualPct } from './data'
import './act2-b.css'

interface Pt {
  i: number
  hull: string
  owner: string
  x: number
  y: number
  yhat: number
  e: number
  pct: number
  lost: boolean
}

const points: Pt[] = manifest.map((d, i) => ({ i, hull: d.hull, owner: d.ownerClass, x: d.declaredMass, y: d.inferredMass, yhat: massFit.predict(d.declaredMass), e: massFit.residuals[i], pct: residualPct(i), lost: d.laterLost }))
/** Manifest indices in declared-mass order (ties by id) — the ←/→ walk order. */
const byDeclared = points.map((p) => p.i).sort((a, b) => points[a].x - points[b].x || a - b)
const rankOf = new Map(byDeclared.map((i, k) => [i, k]))
/** SD of residual as % of declared, over all 412 (≈ the honest 2 %). */
const sPct = sd(points.map((p) => p.pct))
const above5 = points.filter((p) => p.pct > 5)
const above5Lost = above5.filter((p) => p.lost).length
const xDomain = padDomain([Math.min(...points.map((p) => p.x)), Math.max(...points.map((p) => p.x))], 0.06)
const yDomainTop = padDomain([Math.min(...points.map((p) => p.y)), Math.max(...points.map((p) => p.y))], 0.08)

type Unit = 'tonnes' | 'pct'
type ColourBy = 'none' | 'lost'

const R = chartTheme.mark.dotR
const tonnesOf = (p: Pt) => p.e
const pctOf = (p: Pt) => p.pct

const table = {
  columns: ['hull', 'declared (t)', 'inferred (t)', 'predicted (t)', 'residual (t)', 'residual (%)'],
  rows: points.map((p) => [p.hull, p.x, p.y, Number(p.yhat.toFixed(1)), Number(p.e.toFixed(1)), Number(p.pct.toFixed(2))]),
}

interface LayerProps {
  x: ScaleLinear<number, number>
  y: ScaleLinear<number, number>
  yOf: (p: Pt) => number
  colourBy: ColourBy
  active: number | null
  onHover: (i: number | null) => void
  onSelect: (i: number) => void
}

/** One panel's 412 circles; the same handlers feed both panels so a hull lights on each. */
function PointLayer({ x, y, yOf, colourBy, active, onHover, onSelect }: LayerProps) {
  const refs = useRef<(SVGCircleElement | null)[]>([])
  const onKey = (i: number) => (e: KeyboardEvent<SVGCircleElement>) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = byDeclared[(rankOf.get(i) ?? 0) + d]
    if (next === undefined) return
    refs.current[next]?.focus()
    onSelect(next)
  }
  const activePt = active === null ? null : points[active]
  return (
    <>
      {points.map((p) => {
        const isActive = active === p.i
        const fill = isActive ? chartTheme.color.observed : seriesColor(colourBy === 'lost' && p.lost ? 1 : 0)
        return (
          <circle
            key={p.i}
            ref={(el) => {
              refs.current[p.i] = el
            }}
            className="dr-mark dr-mark--dot dr-act2b-pt"
            cx={x(p.x)}
            cy={y(yOf(p))}
            r={isActive ? R + 2 : R}
            fill={fill}
            fillOpacity={isActive ? 1 : chartTheme.mark.alpha}
            stroke={chartTheme.color.ring}
            strokeWidth={chartTheme.mark.ring}
            paintOrder="stroke"
            tabIndex={0}
            role="button"
            aria-label={`${p.hull}, declared ${fmtInt(p.x)} t, inferred ${fmtInt(p.y)} t, residual ${fmt(p.e, 0)} t`}
            onPointerEnter={() => onHover(p.i)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onSelect(p.i)}
            onClick={() => onSelect(p.i)}
            onKeyDown={onKey(p.i)}
          />
        )
      })}
      {activePt && <circle className="dr-act2b-halo" cx={x(activePt.x)} cy={y(yOf(activePt))} r={R + 6} fill="none" stroke={chartTheme.color.observed} strokeWidth={1.5} strokeDasharray={chartTheme.dash} aria-hidden="true" />}
    </>
  )
}

export function ResidualExplorer() {
  const [unit, setUnit] = useState<Unit>('tonnes')
  const [colourBy, setColourBy] = useState<ColourBy>('none')
  const [hover, setHover] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const active = hover ?? selected

  const top = useChartFrame({ height: 300, yLabel: true })
  const bottom = useChartFrame({ height: 220, yLabel: true })

  const x = useMemo(() => scaleLinear().domain(xDomain).range([0, top.innerWidth]), [top.innerWidth])
  const yTop = useMemo(() => scaleLinear().domain(yDomainTop).range([top.innerHeight, 0]), [top.innerHeight])

  const resOf = unit === 'tonnes' ? tonnesOf : pctOf
  const band = unit === 'tonnes' ? 2 * massFit.s : 2 * sPct
  const yBottom = useMemo(() => {
    const m = Math.max(band, ...points.map((p) => Math.abs(resOf(p)))) * 1.12
    return scaleLinear().domain([-m, m]).range([bottom.innerHeight, 0])
  }, [resOf, band, bottom.innerHeight])

  const linePath = `M${x(xDomain[0])},${yTop(massFit.predict(xDomain[0]))}L${x(xDomain[1])},${yTop(massFit.predict(xDomain[1]))}`
  const xTicks = niceTicks(xDomain[0], xDomain[1], top.innerWidth < 420 ? 4 : 7)
  const a = active === null ? null : points[active]

  const legend = [
    { label: 'least-squares line', color: chartTheme.color.fit, shape: 'line' as const },
    { label: unit === 'tonnes' ? '±2s band' : '±2·sd(residual %) band', color: chartTheme.color.reference, shape: 'dashed' as const },
    ...(colourBy === 'lost'
      ? [
          { label: 'later-lost hull', color: seriesColor(1), shape: 'dot' as const },
          { label: 'other hull', color: seriesColor(0), shape: 'dot' as const },
        ]
      : []),
  ]

  return (
    <Panel label="TACTICAL · RESIDUAL PLOT" tone="tactical" led="on" status={`n = ${points.length}`} ariaLabel="Residual explorer: inferred mass against declared mass with the least-squares line, and the linked residual plot">
      <p className="dr-act2b-note">Hover or focus a hull to light it on both panels. ← → walk the file in declared-mass order.</p>
      <div className="dr-controls">
        <Segmented<Unit>
          label="RESIDUAL IN"
          value={unit}
          onChange={setUnit}
          options={[
            { value: 'tonnes', label: 'tonnes' },
            { value: 'pct', label: '% of declared' },
          ]}
        />
        <Segmented<ColourBy>
          label="COLOUR BY"
          value={colourBy}
          onChange={setColourBy}
          options={[
            { value: 'none', label: 'none' },
            { value: 'lost', label: 'later-lost' },
          ]}
        />
      </div>

      <div className="dr-act2b-stack">
        <ChartSurface frame={top} ariaLabel="Inferred mass against declared mass for 412 departures, with the least-squares line" description="Scatter of inferred mass (tonnes) against declared mass (tonnes). The least-squares line runs almost exactly along the diagonal." table={table}>
          <g transform={`translate(${top.margin.left},${top.margin.top})`}>
            <YAxis scale={yTop} width={top.innerWidth} ticks={5} label="inferred mass (t)" />
            <PlotClip frame={top}>
              <path className="dr-mark dr-mark--line" d={linePath} fill="none" stroke={chartTheme.color.fit} strokeWidth={chartTheme.stroke.fit} strokeLinecap="round" />
              <PointLayer x={x} y={yTop} yOf={(p) => p.y} colourBy={colourBy} active={active} onHover={setHover} onSelect={setSelected} />
            </PlotClip>
            <XAxis scale={x} height={top.innerHeight} ticks={xTicks} label="declared mass (t)" />
          </g>
        </ChartSurface>

        <ChartSurface
          frame={bottom}
          ariaLabel={`Residual plot: residual ${unit === 'tonnes' ? 'in tonnes' : 'as percent of declared mass'} against declared mass, with a zero line and a plus or minus two s band`}
          description="Residuals scatter in a flat band around zero. A cluster of hulls sits well above the band."
          table={table}
          footer={<Legend items={legend} />}
        >
          <g transform={`translate(${bottom.margin.left},${bottom.margin.top})`}>
            <YAxis scale={yBottom} width={bottom.innerWidth} ticks={5} label={unit === 'tonnes' ? 'residual (t)' : 'residual (% of declared)'} />
            <PlotClip frame={bottom}>
              <rect x={0} y={yBottom(band)} width={bottom.innerWidth} height={Math.max(0, yBottom(-band) - yBottom(band))} fill={chartTheme.color.shade} />
              <HReferenceLine y={yBottom(band)} width={bottom.innerWidth} label="+2s" />
              <HReferenceLine y={yBottom(-band)} width={bottom.innerWidth} label="−2s" />
              <HReferenceLine y={yBottom(0)} width={bottom.innerWidth} dashed={false} />
              <PointLayer x={x} y={yBottom} yOf={resOf} colourBy={colourBy} active={active} onHover={setHover} onSelect={setSelected} />
            </PlotClip>
            <XAxis scale={x} height={bottom.innerHeight} ticks={xTicks} label="declared mass (t)" />
          </g>
        </ChartSurface>
      </div>

      <ReadoutRow>
        <Readout label="HULL" value={a ? a.hull : '—'} stale={!a} size="sm" live />
        <Readout label="OWNER" value={a ? a.owner : '—'} stale={!a} size="sm" />
        <Readout label="DECLARED" value={a ? fmtInt(a.x) : '—'} units="t" stale={!a} size="sm" />
        <Readout label="INFERRED" value={a ? fmtInt(a.y) : '—'} units="t" stale={!a} size="sm" />
        <Readout label="PREDICTED" value={a ? fmtInt(a.yhat) : '—'} units="t" stale={!a} size="sm" />
        <Readout label="RESIDUAL" value={a ? fmt(a.e, 0) : '—'} units="t" tone="tactical" stale={!a} size="sm" />
        <Readout label="RESIDUAL %" value={a ? fmt(a.pct, 1) : '—'} units="%" tone="tactical" stale={!a} size="sm" />
      </ReadoutRow>
      <ReadoutRow>
        <Readout label={unit === 'tonnes' ? 'S (TONNES)' : 'SD OF RESIDUAL %'} value={unit === 'tonnes' ? fmt(massFit.s, 0) : fmt(sPct, 2)} units={unit === 'tonnes' ? 't' : '%'} size="sm" />
        <Readout label="BAND" value={unit === 'tonnes' ? `±${fmt(band, 0)}` : `±${fmt(band, 1)}`} units={unit === 'tonnes' ? 't' : '%'} size="sm" />
        {colourBy === 'lost' && (
          <>
            <Readout label="HULLS ABOVE +5 %" value={String(above5.length)} tone="alert" size="sm" live />
            <Readout label="OF THOSE, LATER-LOST" value={String(above5Lost)} tone="alert" size="sm" live />
          </>
        )}
      </ReadoutRow>
    </Panel>
  )
}
