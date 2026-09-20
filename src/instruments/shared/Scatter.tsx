/**
 * Scatter — points with optional least-squares line, residual segments, draggable points
 * (`onPointsChange`), keyboard nudging, and a canvas path above `canvasThreshold` points.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { scaleLinear } from 'd3'
import { chartTheme, resolveToken, seriesColor } from '@/design/chart-theme'
import { leastSquares, padDomain, niceTicks, fmtTick, type LeastSquares } from './geometry'
import { useChartFrame, ChartSurface, PlotClip } from './frame'
import { XAxis, YAxis, HReferenceLine } from './Axis'

export interface ScatterPoint {
  x: number
  y: number
  /** Optional series index (0-based) for colour. */
  series?: number
  label?: string
}

export interface ScatterProps {
  points: readonly ScatterPoint[]
  xLabel?: string
  yLabel?: string
  xDomain?: [number, number]
  yDomain?: [number, number]
  /** Draw the least-squares line (computed locally for display). */
  fitLine?: boolean
  /** Supply your own line (from @/lib/stats) instead of the local fit. */
  line?: { slope: number; intercept: number }
  /** Draw vertical residual segments from each point to the line. */
  residuals?: boolean
  /** Enables dragging + arrow keys; receives the full updated array. */
  onPointsChange?: (points: ScatterPoint[]) => void
  /** Called with the current local fit whenever points change (null when undefined). */
  onFit?: (fit: LeastSquares | null) => void
  /** Index of a point to emphasise (e.g. an influential observation). */
  highlight?: number
  /** Horizontal reference lines (e.g. zero on a residual plot). */
  hReferences?: { y: number; label?: string }[]
  color?: string
  radius?: number
  height?: number
  ariaLabel: string
  description?: string
  showTable?: boolean
  className?: string
}

export function Scatter({ points, xLabel, yLabel, xDomain, yDomain, fitLine = false, line, residuals = false, onPointsChange, onFit, highlight, hReferences, color, radius = chartTheme.mark.dotR, height = 300, ariaLabel, description, showTable = false, className }: ScatterProps) {
  const frame = useChartFrame({ height, yLabel: !!yLabel })
  const [dragging, setDragging] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const finite = useMemo(() => points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), [points])
  const xd = useMemo<[number, number]>(() => xDomain ?? (finite.length ? padDomain([Math.min(...finite.map((p) => p.x)), Math.max(...finite.map((p) => p.x))], 0.08) : [0, 1]), [xDomain, finite])
  const yd = useMemo<[number, number]>(() => yDomain ?? (finite.length ? padDomain([Math.min(...finite.map((p) => p.y)), Math.max(...finite.map((p) => p.y))], 0.1) : [0, 1]), [yDomain, finite])
  const x = useMemo(() => scaleLinear().domain(xd).range([0, frame.innerWidth]), [xd, frame.innerWidth])
  const y = useMemo(() => scaleLinear().domain(yd).range([frame.innerHeight, 0]), [yd, frame.innerHeight])

  const fit = useMemo(() => (fitLine || residuals || onFit ? leastSquares(finite) : null), [fitLine, residuals, onFit, finite])
  useEffect(() => {
    onFit?.(fit)
  }, [fit, onFit])
  const theLine = line ?? (fit ? { slope: fit.slope, intercept: fit.intercept } : null)
  const useCanvas = points.length > chartTheme.canvasThreshold
  const editable = !!onPointsChange && !useCanvas
  const multi = finite.some((p) => (p.series ?? 0) > 0)

  useEffect(() => {
    if (!useCanvas) return
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = frame.width * dpr
    c.height = frame.height * dpr
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, frame.width, frame.height)
    ctx.translate(frame.margin.left, frame.margin.top)
    const fills = [0, 1, 2, 3, 4].map((i) => resolveToken(color ?? seriesColor(i), c))
    ctx.globalAlpha = 0.75
    const r = Math.max(1.5, radius - 1.5)
    for (const p of finite) {
      ctx.fillStyle = fills[(p.series ?? 0) % 5]
      ctx.beginPath()
      ctx.arc(x(p.x), y(p.y), r, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [useCanvas, finite, frame.width, frame.height, frame.margin.left, frame.margin.top, x, y, color, radius])

  const table = useMemo(
    () => ({
      columns: [xLabel ?? 'x', yLabel ?? 'y', ...(theLine ? ['predicted', 'residual'] : [])],
      rows: points.map((p) => {
        const row: (string | number)[] = [p.x, p.y]
        if (theLine) {
          const yhat = theLine.intercept + theLine.slope * p.x
          row.push(Number(yhat.toPrecision(6)), Number((p.y - yhat).toPrecision(6)))
        }
        return row
      }),
      caption: theLine ? `Least-squares line: ŷ = ${fmtTick(Number(theLine.intercept.toPrecision(4)))} + ${fmtTick(Number(theLine.slope.toPrecision(4)))}x` : undefined,
    }),
    [points, xLabel, yLabel, theLine],
  )

  const commit = (index: number, nx: number, ny: number) => {
    if (!onPointsChange) return
    const next = points.slice()
    next[index] = { ...next[index], x: Number(Math.max(xd[0], Math.min(xd[1], nx)).toFixed(10)), y: Number(Math.max(yd[0], Math.min(yd[1], ny)).toFixed(10)) }
    onPointsChange(next)
  }
  const onPointerDown = (i: number) => (e: PointerEvent<SVGCircleElement>) => {
    if (!editable) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(i)
  }
  const onPointerMove = (i: number) => (e: PointerEvent<SVGCircleElement>) => {
    if (dragging !== i) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    commit(i, x.invert(e.clientX - rect.left - frame.margin.left), y.invert(e.clientY - rect.top - frame.margin.top))
  }
  const onPointerUp = () => setDragging(null)
  const onKeyDown = (i: number) => (e: KeyboardEvent<SVGCircleElement>) => {
    if (!editable) return
    const sx = (xd[1] - xd[0]) / 100
    const sy = (yd[1] - yd[0]) / 100
    const k = e.shiftKey ? 10 : 1
    const p = points[i]
    const map: Record<string, [number, number]> = { ArrowLeft: [-sx * k, 0], ArrowRight: [sx * k, 0], ArrowUp: [0, sy * k], ArrowDown: [0, -sy * k] }
    const d = map[e.key]
    if (!d) return
    e.preventDefault()
    commit(i, p.x + d[0], p.y + d[1])
  }

  const linePath = useMemo(() => {
    if (!theLine) return null
    const [x0, x1] = xd
    return `M${x(x0)},${y(theLine.intercept + theLine.slope * x0)}L${x(x1)},${y(theLine.intercept + theLine.slope * x1)}`
  }, [theLine, xd, x, y])

  return (
    <ChartSurface
      frame={frame}
      ariaLabel={ariaLabel}
      description={description}
      table={table}
      showTable={showTable}
      className={className}
      underlay={useCanvas ? <canvas ref={canvasRef} className="dr-chart__canvas" style={{ width: frame.width, height: frame.height }} aria-hidden="true" /> : undefined}
    >
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <YAxis scale={y} width={frame.innerWidth} ticks={5} label={yLabel} />
        <PlotClip frame={frame}>
          {hReferences?.map((r, i) => (
            <HReferenceLine key={`h${i}`} y={y(r.y)} width={frame.innerWidth} label={r.label} />
          ))}
          {residuals &&
            theLine &&
            finite.map((p, i) => {
              const yhat = theLine.intercept + theLine.slope * p.x
              return <line key={`r${i}`} x1={x(p.x)} x2={x(p.x)} y1={y(p.y)} y2={y(yhat)} stroke={chartTheme.color.residual} strokeWidth={1.5} strokeOpacity={0.9} />
            })}
          {linePath && <path className="dr-mark dr-mark--line" d={linePath} fill="none" stroke={chartTheme.color.fit} strokeWidth={chartTheme.stroke.fit} strokeLinecap="round" />}
          {!useCanvas &&
            points.map((p, i) => {
              if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
              const isHl = highlight === i
              return (
                <circle
                  key={i}
                  className={['dr-mark', 'dr-mark--dot', editable ? 'dr-mark--draggable' : '', dragging === i ? 'is-dragging' : ''].filter(Boolean).join(' ')}
                  cx={x(p.x)}
                  cy={y(p.y)}
                  r={isHl ? radius + 2 : radius}
                  fill={isHl ? chartTheme.color.observed : (color ?? (multi ? seriesColor(p.series ?? 0) : seriesColor(1)))}
                  fillOpacity={chartTheme.mark.alpha}
                  stroke={chartTheme.color.ring}
                  strokeWidth={chartTheme.mark.ring}
                  paintOrder="stroke"
                  tabIndex={editable ? 0 : undefined}
                  role={editable ? 'button' : undefined}
                  aria-label={editable ? `${p.label ?? `point ${i + 1}`}: ${xLabel ?? 'x'} ${fmtTick(p.x)}, ${yLabel ?? 'y'} ${fmtTick(p.y)}. Arrow keys to move.` : undefined}
                  onPointerDown={onPointerDown(i)}
                  onPointerMove={onPointerMove(i)}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  onKeyDown={onKeyDown(i)}
                >
                  <title>
                    {p.label ? `${p.label}: ` : ''}({fmtTick(p.x)}, {fmtTick(p.y)})
                  </title>
                </circle>
              )
            })}
        </PlotClip>
        {fit && (fitLine || residuals) && (
          <text x={frame.innerWidth - 4} y={12} textAnchor="end" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
            r = {fmtTick(Number(fit.r.toFixed(3)))}
          </text>
        )}
        <XAxis scale={x} height={frame.innerHeight} ticks={niceTicks(xd[0], xd[1], frame.innerWidth < 420 ? 4 : 7)} label={xLabel} />
      </g>
    </ChartSurface>
  )
}
