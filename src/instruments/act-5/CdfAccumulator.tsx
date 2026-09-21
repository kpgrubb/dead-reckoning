/**
 * SENSOR · ACCUMULATOR (calc briefing: integral-as-accumulation).
 *
 * "The CDF is the running total of density. Its slope is the pdf." Two panes on one axis of Mark-9
 * delay: the density on top with the area up to a draggable cutoff cut into visible strips, and the
 * running total of those strips below, tracked by a dot at (x, F(x)).
 *
 * Drag the cutoff and the two move together — the shaded area on top IS the height of the dot below.
 * Add strips and the running total stops being a staircase and becomes the smooth curve: the readout
 * prints the strip sum against `normal.cdf` so the error is a number that shrinks, not a promise.
 * Then the other direction: the slope of the CDF across a narrow window around x, computed at
 * runtime as a difference quotient, beside `normal.pdf(x)` — the same number, which is what "its
 * slope is the pdf" means.
 *
 * No hand-computed constants: every area is a midpoint Riemann sum over `normal.pdf`, and every
 * exact value comes from `normal.cdf` / `normal.pdf`.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { area as d3Area, line as d3Line, scaleLinear } from 'd3'
import { Panel } from '@/components'
import { ChartSurface, Legend, PlotClip, Readout, ReadoutRow, Slider, XAxis, YAxis, chartTheme, sampleCurve, semanticColor, useChartFrame, type LegendItem } from '@/instruments/shared'
import { fmt, fmtInt, normal } from '@/lib/stats'
import { LANE_DELAY_MEAN, LANE_DELAY_SD } from './data'
import './act5.css'

/** The axis runs to ±5 SD; the density below the left edge is under 3 in ten million, so it stands in for −∞. */
const SD_SPAN = 5
const CURVE_SAMPLES = 201
const TABLE_SAMPLES = 21

export interface CdfAccumulatorProps {
  /** Centre of the normal model, days. */
  mean?: number
  /** Spread of the normal model, days. */
  sd?: number
  /** Cutoff on load, days. */
  cutoff?: number
  /** Accumulation strips on load. */
  strips?: number
}

export function CdfAccumulator({ mean: mu = LANE_DELAY_MEAN, sd: sigma = LANE_DELAY_SD, cutoff: cutoff0 = LANE_DELAY_MEAN + LANE_DELAY_SD, strips: strips0 = 12 }: CdfAccumulatorProps = {}) {
  const domLo = mu - SD_SPAN * sigma
  const domHi = mu + SD_SPAN * sigma
  const clamp = (x: number) => Math.min(domHi, Math.max(domLo, x))

  const [cut, setCutValue] = useState(clamp(cutoff0))
  const [strips, setStrips] = useState(strips0)
  const [dragging, setDragging] = useState(false)

  const pdf = useMemo(() => (x: number) => normal.pdf(x, mu, sigma), [mu, sigma])

  /* ---- The accumulation: `strips` midpoint rectangles from the left edge up to the cutoff ---- */
  const accumulation = useMemo(() => {
    const h = (cut - domLo) / strips
    const rects: { x0: number; x1: number; height: number; runningTotal: number }[] = []
    let total = 0
    for (let i = 0; i < strips; i++) {
      const x0 = domLo + i * h
      const x1 = x0 + h
      const height = pdf((x0 + x1) / 2)
      total += height * h
      rects.push({ x0, x1, height, runningTotal: total })
    }
    return { rects, total, h }
  }, [cut, domLo, strips, pdf])

  const exact = normal.cdf(cut, mu, sigma)
  const error = accumulation.total - exact

  /** The derivative direction: a symmetric difference quotient of F across a narrow window. */
  const delta = sigma / 100
  const slope = (normal.cdf(cut + delta, mu, sigma) - normal.cdf(cut - delta, mu, sigma)) / (2 * delta)
  const density = normal.pdf(cut, mu, sigma)

  /* ---- Geometry: two frames, identical margins, so the axes line up ---- */
  const top = useChartFrame({ height: 210, yLabel: true })
  const bottom = useChartFrame({ height: 190, yLabel: true })
  const yTopMax = normal.pdf(mu, mu, sigma) * 1.12

  const xTop = useMemo(() => scaleLinear().domain([domLo, domHi]).range([0, top.innerWidth]), [domLo, domHi, top.innerWidth])
  const yTop = useMemo(() => scaleLinear().domain([0, yTopMax]).range([top.innerHeight, 0]), [yTopMax, top.innerHeight])
  const xBot = useMemo(() => scaleLinear().domain([domLo, domHi]).range([0, bottom.innerWidth]), [domLo, domHi, bottom.innerWidth])
  const yBot = useMemo(() => scaleLinear().domain([0, 1.05]).range([bottom.innerHeight, 0]), [bottom.innerHeight])

  const curvePts = useMemo(() => sampleCurve(pdf, [domLo, domHi], CURVE_SAMPLES), [pdf, domLo, domHi])
  const pdfPath = useMemo(
    () =>
      d3Line<{ x: number; y: number }>()
        .x((p) => xTop(p.x))
        .y((p) => yTop(p.y))(curvePts) ?? '',
    [curvePts, xTop, yTop],
  )
  const shadePath = useMemo(() => {
    const pts = sampleCurve(pdf, [domLo, cut], 121)
    return (
      d3Area<{ x: number; y: number }>()
        .x((p) => xTop(p.x))
        .y0(top.innerHeight)
        .y1((p) => yTop(p.y))(pts) ?? ''
    )
  }, [pdf, domLo, cut, xTop, yTop, top.innerHeight])

  const cdfPath = useMemo(() => {
    const pts = sampleCurve((x) => normal.cdf(x, mu, sigma), [domLo, domHi], CURVE_SAMPLES)
    return (
      d3Line<{ x: number; y: number }>()
        .x((p) => xBot(p.x))
        .y((p) => yBot(p.y))(pts) ?? ''
    )
  }, [mu, sigma, domLo, domHi, xBot, yBot])

  /** The running total, drawn as the staircase the strips actually build. */
  const runningPath = useMemo(() => {
    const parts: string[] = [`M${xBot(domLo).toFixed(1)},${yBot(0).toFixed(1)}`]
    for (const r of accumulation.rects) {
      parts.push(`L${xBot(r.x1).toFixed(1)},${yBot(r.runningTotal - r.height * accumulation.h).toFixed(1)}`)
      parts.push(`L${xBot(r.x1).toFixed(1)},${yBot(r.runningTotal).toFixed(1)}`)
    }
    return parts.join('')
  }, [accumulation, xBot, yBot, domLo])

  const table = useMemo(() => {
    const pts = sampleCurve((x) => x, [domLo, domHi], TABLE_SAMPLES)
    return {
      columns: ['delay (d)', 'density f(x)', 'running total F(x)'],
      rows: pts.map((p) => [fmt(p.x, 2), fmt(normal.pdf(p.x, mu, sigma), 4), fmt(normal.cdf(p.x, mu, sigma), 4)]),
      caption: `Density and its running total for N(${fmt(mu, 3)}, ${fmt(sigma, 3)}) d`,
    }
  }, [mu, sigma, domLo, domHi])

  /* ---- Dragging the cutoff ---- */
  const step = sigma / 20
  const setCut = (x: number) => setCutValue(Number(clamp(x).toPrecision(12)))
  const onDown = (e: PointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
  }
  const onMove = (e: PointerEvent<SVGCircleElement>) => {
    if (!dragging) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setCut(xTop.invert(e.clientX - rect.left - top.margin.left))
  }
  const onUp = () => setDragging(false)
  const onKey = (e: KeyboardEvent<SVGCircleElement>) => {
    const big = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      setCut(cut - step * big)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      setCut(cut + step * big)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCut(domLo)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCut(domHi)
    }
  }

  const topLegend: LegendItem[] = [
    { label: 'density f(x)', color: semanticColor('fit'), shape: 'line' },
    { label: `${fmtInt(strips)} accumulation strips`, color: semanticColor('shade'), shape: 'square' },
  ]
  const bottomLegend: LegendItem[] = [
    { label: 'F(x) · the smooth running total', color: semanticColor('fit'), shape: 'line' },
    { label: 'the strips, accumulated', color: semanticColor('null'), shape: 'line' },
    { label: `F(${fmt(cut, 2)}) = ${fmt(exact, 4)}`, color: semanticColor('observed'), shape: 'dot' },
  ]

  const topDescription = `Density of Mark-9 delay, a normal model with mean ${fmt(mu, 3)} and standard deviation ${fmt(sigma, 3)} days. The area from the left edge of the axis up to the cutoff at ${fmt(cut, 3)} days is cut into ${fmtInt(strips)} strips whose total area is ${fmt(accumulation.total, 5)}; the exact area is ${fmt(exact, 5)}. The cutoff handle sits on the axis: focus it and press the left or right arrow key, Shift for ten steps.`
  const bottomDescription = `The running total of that density: F(x), the cumulative probability, against the same axis. The staircase is the accumulated strips; the smooth line is F itself. The dot marks the cutoff at ${fmt(cut, 3)} days, where F is ${fmt(exact, 5)} — the same number as the shaded area above. The slope of F at the cutoff is ${fmt(slope, 5)}, and the density there is ${fmt(density, 5)}.`

  return (
    <Panel label="SENSOR · ACCUMULATOR · DENSITY AND ITS RUNNING TOTAL" status={`F(${fmt(cut, 2)}) = ${fmt(exact, 4)}`} tone="sensor" led="on">
      <div className="dr-act5__stack">
        <div className="dr-controls">
          <Slider label="accumulation strips" value={strips} min={4} max={200} step={4} onChange={setStrips} format={fmtInt} />
        </div>

        <ChartSurface frame={top} ariaLabel="Density of Mark-9 delay with the area up to the cutoff cut into accumulation strips" description={topDescription} table={table} footer={<Legend items={topLegend} ariaLabel="Density key" />}>
          <g transform={`translate(${top.margin.left},${top.margin.top})`}>
            <YAxis scale={yTop} width={top.innerWidth} ticks={3} label="density" />
            <PlotClip frame={top}>
              <path d={shadePath} fill={semanticColor('shade')} fillOpacity={0.3} />
              {accumulation.rects.map((r, i) => (
                <rect
                  key={i}
                  className="dr-mark dr-mark--bar"
                  x={xTop(r.x0)}
                  y={yTop(r.height)}
                  width={Math.max(0.5, xTop(r.x1) - xTop(r.x0))}
                  height={Math.max(0, top.innerHeight - yTop(r.height))}
                  fill={semanticColor('shade')}
                  fillOpacity={0.55}
                  stroke={semanticColor('shade')}
                  strokeWidth={0.5}
                />
              ))}
              <path className="dr-mark dr-mark--line" d={pdfPath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
              <line x1={xTop(cut)} x2={xTop(cut)} y1={0} y2={top.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
            </PlotClip>
            <XAxis scale={xTop} height={top.innerHeight} label="Mark-9 delay (d)" />
          </g>
        </ChartSurface>

        <ChartSurface frame={bottom} ariaLabel="The running total F of the density, with a dot at the cutoff" description={bottomDescription} table={table} footer={<Legend items={bottomLegend} ariaLabel="Running-total key" />}>
          <g transform={`translate(${bottom.margin.left},${bottom.margin.top})`}>
            <YAxis scale={yBot} width={bottom.innerWidth} ticks={3} label="F(x)" />
            <PlotClip frame={bottom}>
              <path className="dr-mark dr-mark--line" d={cdfPath} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
              <path className="dr-mark dr-mark--line" d={runningPath} fill="none" stroke={semanticColor('null')} strokeWidth={chartTheme.stroke.line} />
              <line x1={xBot(cut)} x2={xBot(cut)} y1={0} y2={bottom.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.line} strokeDasharray={chartTheme.dash} />
              <line x1={0} x2={xBot(cut)} y1={yBot(exact)} y2={yBot(exact)} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
              <circle
                className={`dr-mark dr-mark--draggable${dragging ? ' is-dragging' : ''}`}
                cx={xBot(cut)}
                cy={yBot(exact)}
                r={6}
                fill={semanticColor('observed')}
                stroke={chartTheme.color.ring}
                strokeWidth={chartTheme.mark.ring}
                paintOrder="stroke"
              >
                <title>
                  F({fmt(cut, 3)}) = {fmt(exact, 4)}
                </title>
              </circle>
            </PlotClip>
            <circle
              className={`dr-mark dr-mark--draggable${dragging ? ' is-dragging' : ''}`}
              cx={xBot(cut)}
              cy={bottom.innerHeight}
              r={7}
              fill={semanticColor('observed')}
              stroke={chartTheme.color.ring}
              strokeWidth={chartTheme.mark.ring}
              paintOrder="stroke"
              tabIndex={0}
              role="slider"
              aria-label="cutoff delay"
              aria-valuenow={Number(cut.toFixed(3))}
              aria-valuemin={Number(domLo.toFixed(3))}
              aria-valuemax={Number(domHi.toFixed(3))}
              aria-valuetext={`${fmt(cut, 3)} days, running total ${fmt(exact, 4)}`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={onKey}
            >
              <title>cutoff {fmt(cut, 3)} d</title>
            </circle>
            <XAxis scale={xBot} height={bottom.innerHeight} label="Mark-9 delay (d)" />
          </g>
        </ChartSurface>

        <ReadoutRow>
          <Readout label="cutoff x" value={fmt(cut, 3)} units="d" tone="sensor" live />
          <Readout label={`sum of ${fmtInt(strips)} strips`} value={fmt(accumulation.total, 5)} tone="sensor" live />
          <Readout label="F(x) · normal.cdf" value={fmt(exact, 5)} live />
          <Readout label="strip sum − F(x) · the error" value={fmt(error, 6)} tone={Math.abs(error) > 0.001 ? 'alert' : 'sensor'} live />
          <Readout label="strip width" value={fmt(accumulation.h, 4)} units="d" size="sm" live />
        </ReadoutRow>
        <ReadoutRow>
          <Readout label="slope of F at x · rise over run" value={fmt(slope, 5)} tone="sensor" live />
          <Readout label="f(x) · normal.pdf" value={fmt(density, 5)} tone="sensor" live />
          <Readout label="difference" value={fmt(slope - density, 7)} size="sm" live />
          <Readout label="window used for the slope" value={`± ${fmt(delta, 4)}`} units="d" size="sm" />
        </ReadoutRow>

        <p className="dr-act5__note">
          Drag the cutoff (or focus the handle and press ← / →) and watch one number in two places: the <strong>shaded area on top</strong> and the <strong>height of the dot below</strong> are the same quantity. That is all a CDF is — density, accumulated from the left. Now push the strips from 4 to 200 and read the error: {fmt(error, 6)} and falling. The strips never become the curve; they converge on it, which is what an integral means. Read it backwards and you get the other half: the <em>slope</em> of the running total at x is {fmt(slope, 5)}, and the density at x is {fmt(density, 5)}. Accumulate a density and you get F. Differentiate F and you get the density back.
        </p>
      </div>
    </Panel>
  )
}
