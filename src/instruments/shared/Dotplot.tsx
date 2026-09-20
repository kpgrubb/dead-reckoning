/**
 * Dotplot — stacked dots by value. Supports draggable dots (`onValuesChange`), keyboard nudging,
 * highlighted values (outliers), and reference lines (mean/median). Above `canvasThreshold` points
 * the dots are aggregated into columns and painted on canvas.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { scaleLinear } from 'd3'
import { chartTheme, resolveToken, semanticColor, type SemanticColor } from '@/design/chart-theme'
import { stackDots, padDomain, niceTicks, fmtTick } from './geometry'
import { useChartFrame, ChartSurface } from './frame'
import { XAxis, ReferenceLine } from './Axis'

export interface DotplotProps {
  values: readonly number[]
  label?: string
  domain?: [number, number]
  /** Dot radius in px (≥ 4). */
  radius?: number
  color?: string
  /** Indices to draw in the alert colour (e.g. outliers). */
  highlight?: readonly number[]
  highlightColor?: SemanticColor
  references?: { x: number; label?: string; color?: SemanticColor }[]
  /** Enables drag + arrow-key editing. Receives the full updated array. */
  onValuesChange?: (values: number[]) => void
  /** Snap dragged values to this step. */
  step?: number
  height?: number
  ariaLabel: string
  description?: string
  showTable?: boolean
  className?: string
}

export function Dotplot({ values, label, domain, radius = chartTheme.mark.dotR, color = chartTheme.color.series[0], highlight, highlightColor = 'rejected', references, onValuesChange, step, height = 200, ariaLabel, description, showTable = false, className }: DotplotProps) {
  const frame = useChartFrame({ height, margin: { top: 10, left: 16, right: 16 } })
  const [dragging, setDragging] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const finite = useMemo(() => values.filter((v) => Number.isFinite(v)), [values])
  const dom = useMemo<[number, number]>(() => {
    if (domain) return domain
    if (finite.length === 0) return [0, 1]
    return padDomain([Math.min(...finite), Math.max(...finite)], 0.08)
  }, [domain, finite])

  const x = useMemo(() => scaleLinear().domain(dom).range([0, frame.innerWidth]), [dom, frame.innerWidth])
  const dia = radius * 2 + 1
  const { dots, maxLevel } = useMemo(() => stackDots(values, x, dia), [values, x, dia])
  // Compress stacks that would overflow the plot height.
  const levelH = Math.min(dia, (frame.innerHeight - radius) / Math.max(1, maxLevel + 1))
  const useCanvas = values.length > chartTheme.canvasThreshold
  const hl = new Set(highlight ?? [])
  const editable = !!onValuesChange && !useCanvas

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
    const fill = resolveToken(color, c)
    const hlFill = resolveToken(semanticColor(highlightColor), c)
    ctx.globalAlpha = 0.9
    for (const d of dots) {
      ctx.fillStyle = hl.has(d.index) ? hlFill : fill
      const cy = frame.innerHeight - radius - d.level * levelH
      ctx.beginPath()
      ctx.arc(d.x, cy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useCanvas, dots, frame.width, frame.height, frame.innerHeight, levelH, radius, color, highlightColor, highlight])

  const table = useMemo(() => ({ columns: ['#', label ?? 'value'], rows: values.map((v, i) => [i + 1, v]), caption: label }), [values, label])

  const commit = (index: number, raw: number) => {
    if (!onValuesChange) return
    let v = Math.max(dom[0], Math.min(dom[1], raw))
    if (step && step > 0) v = Math.round(v / step) * step
    const next = values.slice()
    next[index] = Number(v.toFixed(10))
    onValuesChange(next)
  }
  const onPointerDown = (index: number) => (e: PointerEvent<SVGCircleElement>) => {
    if (!editable) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(index)
  }
  const onPointerMove = (index: number) => (e: PointerEvent<SVGCircleElement>) => {
    if (dragging !== index) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    commit(index, x.invert(e.clientX - rect.left - frame.margin.left))
  }
  const onPointerUp = () => setDragging(null)
  const onKeyDown = (index: number) => (e: KeyboardEvent<SVGCircleElement>) => {
    if (!editable) return
    const span = dom[1] - dom[0]
    const s = step ?? span / 100
    const big = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      commit(index, values[index] - s * big)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      commit(index, values[index] + s * big)
    }
  }

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
        {references?.map((r, i) => (
          <ReferenceLine key={i} x={x(r.x)} height={frame.innerHeight} label={r.label} color={r.color ? semanticColor(r.color) : chartTheme.color.reference} anchor={x(r.x) > frame.innerWidth * 0.7 ? 'end' : 'start'} />
        ))}
        {!useCanvas &&
          dots.map((d) => {
            const cy = frame.innerHeight - radius - d.level * levelH
            const isHl = hl.has(d.index)
            return (
              <circle
                key={d.index}
                className={['dr-mark', 'dr-mark--dot', editable ? 'dr-mark--draggable' : '', dragging === d.index ? 'is-dragging' : ''].filter(Boolean).join(' ')}
                cx={d.x}
                cy={cy}
                r={radius}
                fill={isHl ? semanticColor(highlightColor) : color}
                fillOpacity={chartTheme.mark.alpha}
                stroke={chartTheme.color.ring}
                strokeWidth={chartTheme.mark.ring}
                paintOrder="stroke"
                tabIndex={editable ? 0 : undefined}
                role={editable ? 'slider' : undefined}
                aria-label={editable ? `${label ?? 'value'} ${d.index + 1}` : undefined}
                aria-valuenow={editable ? d.value : undefined}
                aria-valuemin={editable ? dom[0] : undefined}
                aria-valuemax={editable ? dom[1] : undefined}
                onPointerDown={onPointerDown(d.index)}
                onPointerMove={onPointerMove(d.index)}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown(d.index)}
              >
                <title>{fmtTick(d.value)}</title>
              </circle>
            )
          })}
        <XAxis scale={x} height={frame.innerHeight} ticks={niceTicks(dom[0], dom[1], frame.innerWidth < 420 ? 4 : 7)} label={label} />
      </g>
    </ChartSurface>
  )
}
