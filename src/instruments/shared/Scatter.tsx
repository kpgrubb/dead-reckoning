/**
 * Scatter — points with optional least-squares line, residual segments, draggable points
 * (`onPointsChange`), keyboard nudging, and a canvas path above `canvasThreshold` points.
 *
 * Keyboard contract for a draggable scatter (`onPointsChange` set). The series is **one tab stop**
 * with a roving tabindex, so a 412-point chart costs one Tab press and not 412:
 *
 *   Tab                  focus the selected point (the only point with tabindex="0")
 *   Arrow keys           move that point (Shift for a ×10 step) — unchanged from before
 *   Alt/Ctrl + ◂ ▸ ▴ ▾   select the previous / next point
 *   Home / End           select the first / last point
 *   Enter / Space        toggle SELECT mode, where plain arrows select and Alt-arrows move
 *   Escape               leave SELECT mode, then leave the plot
 *   Tab                  leave the plot
 *
 * Plain arrows move rather than select in the default mode so the published contract — and the
 * reduced-motion guard that nudges a point and watches r change — keeps working unaltered.
 * Selection, movement and mode changes are announced through a polite live region beside the SVG;
 * the SVG itself stays role="img" (its contents are presentational), which is why the live region
 * lives outside it.
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

/** Arrow keys mapped to a step through the series (reading order: left/up back, right/down on). */
const SELECT_STEP: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }

export function Scatter({ points, xLabel, yLabel, xDomain, yDomain, fitLine = false, line, residuals = false, onPointsChange, onFit, highlight, hReferences, color, radius = chartTheme.mark.dotR, height = 300, ariaLabel, description, showTable = false, className }: ScatterProps) {
  const frame = useChartFrame({ height, yLabel: !!yLabel })
  const [dragging, setDragging] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  /** Roving tabindex: the one point in the series that Tab can reach. */
  const [selected, setSelected] = useState(0)
  /** SELECT mode swaps the arrow keys over: plain arrows select, Alt-arrows move. */
  const [selectMode, setSelectMode] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const pointRefs = useRef(new Map<number, SVGCircleElement>())
  const exitRef = useRef<HTMLDivElement | null>(null)
  const refocus = useRef(false)

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

  /** Indices of the points that are actually drawn, in series order — what the arrows walk. */
  const drawable = useMemo(() => points.map((p, i) => (Number.isFinite(p.x) && Number.isFinite(p.y) ? i : -1)).filter((i) => i >= 0), [points])
  /** `selected` clamped to a point that exists, so a shrinking series can never strand the tab stop. */
  const selIdx = drawable.includes(selected) ? selected : (drawable[0] ?? -1)

  const describe = (i: number, p: ScatterPoint = points[i]) =>
    `${p.label ?? `point ${i + 1}`}: ${xLabel ?? 'x'} ${fmtTick(p.x)}, ${yLabel ?? 'y'} ${fmtTick(p.y)}`
  const position = (i: number) => `${drawable.indexOf(i) + 1} of ${drawable.length}`

  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    pointRefs.current.get(selIdx)?.focus()
  }, [selIdx])

  const select = (to: number) => {
    if (to < 0 || to === selIdx) return
    refocus.current = true
    setSelected(to)
    setAnnouncement(`${describe(to)}. Point ${position(to)}.`)
  }

  const commit = (index: number, nx: number, ny: number): ScatterPoint | null => {
    if (!onPointsChange) return null
    const next = points.slice()
    const moved = { ...next[index], x: Number(Math.max(xd[0], Math.min(xd[1], nx)).toFixed(10)), y: Number(Math.max(yd[0], Math.min(yd[1], ny)).toFixed(10)) }
    next[index] = moved
    onPointsChange(next)
    return moved
  }
  const onPointerDown = (i: number) => (e: PointerEvent<SVGCircleElement>) => {
    if (!editable) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setSelected(i)
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

    if (e.key === 'Escape') {
      e.preventDefault()
      if (selectMode) {
        setSelectMode(false)
        setAnnouncement('Move mode. Arrow keys move the selected point.')
      } else {
        exitRef.current?.focus()
      }
      return
    }
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      const on = !selectMode
      setSelectMode(on)
      setAnnouncement(on ? 'Select mode. Arrow keys select the next point; hold Alt to move it.' : 'Move mode. Arrow keys move the selected point; hold Alt to select another.')
      return
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      select(e.key === 'Home' ? drawable[0] : drawable[drawable.length - 1])
      return
    }

    const step = SELECT_STEP[e.key]
    if (step === undefined) return
    const modified = e.altKey || e.ctrlKey || e.metaKey
    // Alt/Ctrl always traverses in the default mode; in SELECT mode the plain arrows do, and the
    // modifier moves the point instead.
    if (selectMode ? !modified : modified) {
      e.preventDefault()
      const at = drawable.indexOf(selIdx)
      select(drawable[Math.max(0, Math.min(drawable.length - 1, at + step))])
      return
    }

    const sx = (xd[1] - xd[0]) / 100
    const sy = (yd[1] - yd[0]) / 100
    const k = e.shiftKey ? 10 : 1
    const p = points[i]
    const map: Record<string, [number, number]> = { ArrowLeft: [-sx * k, 0], ArrowRight: [sx * k, 0], ArrowUp: [0, sy * k], ArrowDown: [0, -sy * k] }
    const d = map[e.key]
    if (!d) return
    e.preventDefault()
    const moved = commit(i, p.x + d[0], p.y + d[1])
    if (moved) setAnnouncement(`${describe(i, moved)}.`)
  }

  const linePath = useMemo(() => {
    if (!theLine) return null
    const [x0, x1] = xd
    return `M${x(x0)},${y(theLine.intercept + theLine.slope * x0)}L${x(x1)},${y(theLine.intercept + theLine.slope * x1)}`
  }, [theLine, xd, x, y])

  const keyboardHelp = editable
    ? `The ${drawable.length} points are one tab stop. Arrow keys move the selected point, Shift for a larger step. Alt with an arrow key, or Home and End, selects another point. Enter swaps the arrow keys over so they select instead of move. Escape leaves the plot.`
    : null
  const fullDescription = keyboardHelp ? [description, keyboardHelp].filter(Boolean).join(' ') : description

  return (
    <ChartSurface
      frame={frame}
      ariaLabel={ariaLabel}
      description={fullDescription}
      table={table}
      showTable={showTable}
      className={className}
      underlay={useCanvas ? <canvas ref={canvasRef} className="dr-chart__canvas" style={{ width: frame.width, height: frame.height }} aria-hidden="true" /> : undefined}
      overlay={
        editable ? (
          <>
            <div className="visually-hidden" role="status">
              {announcement}
            </div>
            {/* Escape parks focus here, so the next Tab continues after the chart instead of
                restarting at the top of the document. */}
            <div ref={exitRef} tabIndex={-1} className="dr-chart__exit" />
          </>
        ) : undefined
      }
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
                  ref={
                    editable
                      ? (el) => {
                          if (el) pointRefs.current.set(i, el)
                          else pointRefs.current.delete(i)
                        }
                      : undefined
                  }
                  className={['dr-mark', 'dr-mark--dot', editable ? 'dr-mark--draggable' : '', editable && i === selIdx ? 'is-selected' : '', dragging === i ? 'is-dragging' : ''].filter(Boolean).join(' ')}
                  cx={x(p.x)}
                  cy={y(p.y)}
                  r={isHl ? radius + 2 : radius}
                  fill={isHl ? chartTheme.color.observed : (color ?? (multi ? seriesColor(p.series ?? 0) : seriesColor(1)))}
                  fillOpacity={chartTheme.mark.alpha}
                  stroke={chartTheme.color.ring}
                  strokeWidth={chartTheme.mark.ring}
                  paintOrder="stroke"
                  tabIndex={editable ? (i === selIdx ? 0 : -1) : undefined}
                  role={editable ? 'button' : undefined}
                  aria-label={editable ? `${describe(i, p)}. Point ${position(i)}. Arrow keys to move, Alt and an arrow key to select another.` : undefined}
                  onFocus={editable ? () => setSelected(i) : undefined}
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
