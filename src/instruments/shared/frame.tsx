/**
 * Chart frame plumbing: responsive width via ResizeObserver, margins, inner box, and the
 * accessible wrapper every primitive renders into.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { chartTheme } from '@/design/chart-theme'
import { DataTable, type TableRows } from './DataTable'

export interface Margin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ChartFrame {
  /** Attach to the element whose width should drive the chart. */
  ref: RefObject<HTMLDivElement | null>
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  margin: Margin
  /** Stable id prefix for clipPaths, gradients, table ids. */
  id: string
}

export interface UseChartFrameOptions {
  height?: number
  margin?: Partial<Margin>
  /** Extra left margin when a y-axis title is present. */
  yLabel?: boolean
  minWidth?: number
  maxWidth?: number
}

const DEFAULT_WIDTH = 560
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Measures the container and returns margins + inner box. Width follows the container (320–960px
 * and beyond); height is fixed by the caller so the page doesn't reflow while data changes.
 */
export function useChartFrame(opts: UseChartFrameOptions = {}): ChartFrame {
  const { height = 260, minWidth = 240, maxWidth = 4000, yLabel = false } = opts
  const base = yLabel ? chartTheme.marginWithYLabel : chartTheme.margin
  const margin: Margin = { ...base, ...opts.margin }
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const id = useId().replace(/[:]/g, '')

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = (w: number) => {
      const clamped = Math.max(minWidth, Math.min(maxWidth, Math.round(w)))
      setWidth((prev) => (prev === clamped ? prev : clamped))
    }
    apply(el.getBoundingClientRect().width || DEFAULT_WIDTH)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) apply(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [minWidth, maxWidth])

  return {
    ref,
    width,
    height,
    innerWidth: Math.max(10, width - margin.left - margin.right),
    innerHeight: Math.max(10, height - margin.top - margin.bottom),
    margin,
    id,
  }
}

export interface ChartSurfaceProps {
  frame: ChartFrame
  /** Required: what the chart shows, for screen readers. */
  ariaLabel: string
  /** Optional longer description (aria-describedby). */
  description?: string
  /** Data-table fallback. Rendered visually hidden unless `showTable`. */
  table?: TableRows
  showTable?: boolean
  className?: string
  style?: CSSProperties
  /** SVG children (already offset by margin via <g>). */
  children: ReactNode
  /** Optional canvas / HTML layers positioned under the SVG. */
  underlay?: ReactNode
  /** HTML overlay positioned over the SVG (tooltips, live regions). */
  overlay?: ReactNode
  /** HTML rendered under the stage (legend, caption). */
  footer?: ReactNode
}

/**
 * The shared wrapper: measured container → SVG (role="img") + optional canvas underlay + hidden table.
 */
export function ChartSurface({ frame, ariaLabel, description, table, showTable = false, className, style, children, underlay, overlay, footer }: ChartSurfaceProps) {
  const descId = `${frame.id}-desc`
  const tableId = `${frame.id}-table`
  const describedBy = [description ? descId : null, table ? tableId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={['dr-chart', className].filter(Boolean).join(' ')} style={style}>
      <div className="dr-chart__stage" ref={frame.ref} style={{ height: frame.height }}>
        {underlay}
        <svg
          className="dr-chart__svg"
          width={frame.width}
          height={frame.height}
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          role="img"
          aria-label={ariaLabel}
          aria-describedby={describedBy}
        >
          {children}
        </svg>
        {overlay}
      </div>
      {footer}
      {description && (
        <p id={descId} className="visually-hidden">
          {description}
        </p>
      )}
      {table && (
        <div className={showTable ? 'dr-chart__tablewrap' : 'visually-hidden'}>
          <DataTable id={tableId} {...table} />
        </div>
      )}
    </div>
  )
}

/** Clip children to the inner plot box. */
export function PlotClip({ frame, children }: { frame: ChartFrame; children: ReactNode }) {
  const clipId = `${frame.id}-clip`
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          {/* Extends 2px above the box (line caps) but stops exactly at the baseline so bar corners stay square there. */}
          <rect x={0} y={-2} width={frame.innerWidth} height={frame.innerHeight + 2} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </>
  )
}
