/**
 * ENGINEERING · THE CELLAR (DS-21) — the Act's heat spine, read-only but explorable.
 *
 * Sixty tonnes of lithium swallow the ship's own waste heat. The trace is sink percentage against
 * MET across the whole loiter: quiet running climbing slowly, the two Watch windows climbing fast,
 * and seven purges dropping the cellar to five percent over two point six hours with the wings out.
 * Nothing on this panel is computed here — `SINK_LEDGER`, `sinkAt`, `profileAt` and `pctPerHour` all
 * come from the Act's data spine, so every module's header stamp and this trace cannot disagree.
 *
 * The scrubber is a keyboard-operable MET handle: it reads the stamp, the profile, the cellar and the
 * hours left at the load currently running.
 */
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { line as d3Line, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import { ChartSurface, HReferenceLine, Legend, PlotClip, Readout, ReadoutRow, XAxis, YAxis, chartTheme, semanticColor, seriesColor, useChartFrame } from '@/instruments/shared'
import { fmt, fmtInt } from '@/lib/stats'
import {
  ACT_END,
  PURGE_FLOOR_PCT,
  PURGE_HOURS,
  PURGE_STARTS,
  SINK_CAPACITY_GJ,
  SINK_LEDGER,
  TORCH_OFF,
  WATCH_DESIGN_HOURS,
  WATCH_DESIGN_SD_HOURS,
  WATCH_IN_WRITING_HOURS,
  WATCH_WORKING_HOURS,
  WINDOW_1,
  WINDOW_2,
  WINDOW_LOADS_KW,
  metStamp,
  pctPerHour,
  profileAt,
  sinkAt,
  type LedgerSegment,
} from './data'
import { KeyTable, Note, SinkReadout, Subhead, sinkStatus, stackStyle } from './_ui'

export interface SinkLedgerPanelProps {
  /** First MET on the axis. */
  from?: number
  /** Last MET on the axis. */
  to?: number
  /** Drop a labelled reference on the trace at this MET. */
  markAt?: number
  markLabel?: string
  height?: number
}

const PROFILE_NAME: Record<LedgerSegment['kind'], string> = { quiet: 'Quiet', watch: 'Watch', purge: 'purging' }

function segmentAt(t: number): LedgerSegment {
  return SINK_LEDGER.find((s) => t >= s.from - 1e-9 && t < s.to) ?? SINK_LEDGER[SINK_LEDGER.length - 1]
}

export function SinkLedgerPanel({ from = TORCH_OFF, to = ACT_END, markAt, markLabel, height = 300 }: SinkLedgerPanelProps = {}) {
  const [cursor, setCursor] = useState(() => (markAt !== undefined ? markAt : from + (to - from) / 2))
  const [dragging, setDragging] = useState(false)

  const clamp = (t: number) => Math.min(to, Math.max(from, t))
  const seg = segmentAt(cursor)
  const pct = sinkAt(cursor)
  const profile = profileAt(cursor)
  const rate = seg.kind === 'purge' ? 0 : pctPerHour(seg.loadKw)
  const hoursLeft = rate > 0 ? (100 - pct) / rate : NaN

  const frame = useChartFrame({ height, yLabel: true, margin: { top: 18, right: 18 } })
  const xs = useMemo(() => scaleLinear().domain([from, to]).range([0, frame.innerWidth]), [from, to, frame.innerWidth])
  const ys = useMemo(() => scaleLinear().domain([0, 105]).range([frame.innerHeight, 0]), [frame.innerHeight])

  const visible = useMemo(() => SINK_LEDGER.filter((s) => s.to > from && s.from < to), [from, to])
  const path = useMemo(() => {
    const pts: { t: number; v: number }[] = [{ t: from, v: sinkAt(from) }]
    for (const s of visible) {
      pts.push({ t: Math.max(from, s.from), v: sinkAt(Math.max(from, s.from)) })
      pts.push({ t: Math.min(to, s.to), v: sinkAt(Math.min(to, s.to)) })
    }
    pts.push({ t: to, v: sinkAt(to) })
    return d3Line<{ t: number; v: number }>().x((d) => xs(d.t)).y((d) => ys(d.v))(pts) ?? ''
  }, [visible, xs, ys, from, to])

  const windows = [
    { no: 1, ...WINDOW_1, loadKw: WINDOW_LOADS_KW[0] },
    { no: 2, ...WINDOW_2, loadKw: WINDOW_LOADS_KW[1] },
  ].filter((w) => w.to > from && w.from < to)
  const purges = PURGE_STARTS.filter((t) => t >= from && t <= to)

  const table = useMemo(
    () => ({
      columns: ['from', 'to', 'profile', 'hours', 'load kW', 'start %', 'end %'],
      rows: visible.map((s) => [metStamp(s.from), metStamp(s.to), PROFILE_NAME[s.kind], fmt(s.hours, 2), s.kind === 'purge' ? '—' : fmt(s.loadKw, 0), fmt(s.startPct, 1), fmt(s.endPct, 1)] as (string | number)[]),
      caption: `DS-21 sink ledger, ${metStamp(from)} → ${metStamp(to)}. ${fmtInt(purges.length)} purges, ${fmtInt(windows.length)} Watch windows.`,
    }),
    [visible, from, to, purges.length, windows.length],
  )

  /* ---- The scrubber ---- */
  const stepHours = 1
  const move = (hours: number) => setCursor((t) => clamp(t + hours / 24))
  const onKey = (e: KeyboardEvent<SVGCircleElement>) => {
    const big = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      move(-stepHours * big)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(stepHours * big)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setCursor(from)
    } else if (e.key === 'End') {
      e.preventDefault()
      setCursor(to)
    }
  }
  const onDown = (e: PointerEvent<SVGCircleElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
  }
  const onMove = (e: PointerEvent<SVGCircleElement>) => {
    if (!dragging) return
    const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect()
    if (!rect) return
    setCursor(clamp(xs.invert(e.clientX - rect.left - frame.margin.left)))
  }
  const onUp = () => setDragging(false)

  return (
    <Panel label="ENGINEERING · THE CELLAR" tone="engineering" led={pct >= 90 ? 'alert' : pct >= 60 ? 'warn' : 'on'} status={sinkStatus(pct)}>
      <div style={stackStyle}>
        <SinkReadout sinkPct={pct} stamp={metStamp(cursor)} profile={PROFILE_NAME[profile]} />

        <ReadoutRow>
          <Readout label="MET" value={metStamp(cursor)} tone="engineering" live />
          <Readout label="profile" value={PROFILE_NAME[profile]} tone="engineering" live />
          <Readout label="cellar" value={fmt(pct, 1)} units="%" tone={pct >= 90 ? 'alert' : 'engineering'} live />
          <Readout label="load" value={seg.kind === 'purge' ? '—' : fmt(seg.loadKw, 0)} units={seg.kind === 'purge' ? undefined : 'kW'} size="sm" live />
          <Readout label="hours to full at this load" value={Number.isFinite(hoursLeft) ? fmt(hoursLeft, 1) : '—'} units={Number.isFinite(hoursLeft) ? 'h' : undefined} tone="engineering" live />
          <Readout label="fill rate" value={rate > 0 ? fmt(rate, 3) : '—'} units={rate > 0 ? '%/h' : undefined} size="sm" live />
        </ReadoutRow>

        <ChartSurface
          frame={frame}
          ariaLabel={`Heat sink percentage against mission elapsed time from ${metStamp(from)} to ${metStamp(to)}, with the Watch windows shaded and the purges marked`}
          description={`The cellar fills while the ship runs cold and empties to ${PURGE_FLOOR_PCT} percent during each ${fmt(PURGE_HOURS, 1)}-hour purge. ${fmtInt(windows.length)} Watch windows are shaded; ${fmtInt(purges.length)} purges are marked. The dashed ceiling is 100 percent, the capacity of ${SINK_CAPACITY_GJ} gigajoules. The scrubber handle on the axis is focusable: press left or right (Shift for ten hours) to move it. At ${metStamp(cursor)} the ship is ${PROFILE_NAME[profile]} and the cellar reads ${fmt(pct, 1)} percent. The data table lists every ledger segment.`}
          table={table}
          footer={
            <Legend
              items={[
                { label: 'cellar %', color: semanticColor('fit'), shape: 'line' },
                { label: 'Watch window', color: seriesColor(1), shape: 'area' },
                { label: 'purge · wings out', color: semanticColor('rejected'), shape: 'dashed' },
                { label: `the Chief's ${WATCH_WORKING_HOURS} h working line`, color: semanticColor('observed'), shape: 'dashed' },
                ...(markAt !== undefined ? [{ label: markLabel ?? 'mark', color: semanticColor('observed'), shape: 'dot' as const }] : []),
              ]}
              ariaLabel="Sink ledger key"
            />
          }
        >
          <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
            <YAxis scale={ys} width={frame.innerWidth} ticks={5} label="cellar (% of capacity)" />
            <PlotClip frame={frame}>
              {windows.map((w) => (
                <g key={w.no}>
                  <rect x={xs(Math.max(from, w.from))} y={0} width={Math.max(1, xs(Math.min(to, w.to)) - xs(Math.max(from, w.from)))} height={frame.innerHeight} fill={seriesColor(1)} fillOpacity={0.14} />
                  <text x={xs(Math.max(from, w.from)) + 4} y={12} fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                    Watch {w.no} · {fmt(w.loadKw, 0)} kW
                  </text>
                  {w.from + WATCH_WORKING_HOURS / 24 <= Math.min(to, w.to) + 1e-9 && (
                    <line x1={xs(w.from + WATCH_WORKING_HOURS / 24)} x2={xs(w.from + WATCH_WORKING_HOURS / 24)} y1={0} y2={frame.innerHeight} stroke={semanticColor('observed')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
                  )}
                </g>
              ))}
              {purges.map((t) => (
                <line key={t} x1={xs(t)} x2={xs(t)} y1={0} y2={frame.innerHeight} stroke={semanticColor('rejected')} strokeWidth={chartTheme.stroke.reference} strokeDasharray={chartTheme.dash} />
              ))}
              <path d={path} fill="none" stroke={semanticColor('fit')} strokeWidth={chartTheme.stroke.line} />
              {markAt !== undefined && markAt >= from && markAt <= to && (
                <g>
                  <circle cx={xs(markAt)} cy={ys(sinkAt(markAt))} r={5} fill={semanticColor('observed')} stroke={chartTheme.color.ring} strokeWidth={chartTheme.mark.ring} paintOrder="stroke" />
                  <text x={xs(markAt) + 8} y={ys(sinkAt(markAt)) - 8} fill={chartTheme.color.title} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                    {markLabel ?? metStamp(markAt)} · {fmt(sinkAt(markAt), 0)}%
                  </text>
                </g>
              )}
              <line x1={xs(cursor)} x2={xs(cursor)} y1={0} y2={frame.innerHeight} stroke={chartTheme.color.axis} strokeWidth={chartTheme.stroke.reference} />
            </PlotClip>
            <HReferenceLine y={ys(100)} width={frame.innerWidth} label="100% · saturation" color={semanticColor('rejected')} />
            <circle
              className={`dr-mark dr-mark--draggable${dragging ? ' is-dragging' : ''}`}
              cx={xs(cursor)}
              cy={frame.innerHeight}
              r={7}
              fill={semanticColor('observed')}
              stroke={chartTheme.color.ring}
              strokeWidth={chartTheme.mark.ring}
              paintOrder="stroke"
              tabIndex={0}
              role="slider"
              aria-label="MET scrubber"
              aria-valuenow={Number(cursor.toFixed(4))}
              aria-valuemin={Number(from.toFixed(4))}
              aria-valuemax={Number(to.toFixed(4))}
              aria-valuetext={`${metStamp(cursor)}, ${PROFILE_NAME[profile]}, cellar ${fmt(pct, 1)} percent`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={onKey}
            >
              <title>{`${metStamp(cursor)} · ${PROFILE_NAME[profile]} · ${fmt(pct, 1)}%`}</title>
            </circle>
            <XAxis scale={xs} height={frame.innerHeight} ticks={6} format={(v) => `${Math.floor(v)}`} label="MET (days)" />
          </g>
        </ChartSurface>

        <Note>
          Drag the handle, or focus it and press ← / → for an hour at a time, Shift for ten. Home and End jump to the ends of the ledger.
        </Note>

        <section aria-label="Ledger segments">
          <Subhead>DS-21 · segment by segment</Subhead>
          <KeyTable
            columns={['from', 'to', 'profile', 'hours', 'load kW', 'start %', 'end %']}
            rows={visible.map((s) => [metStamp(s.from), metStamp(s.to), PROFILE_NAME[s.kind], fmt(s.hours, 1), s.kind === 'purge' ? '—' : fmt(s.loadKw, 0), fmt(s.startPct, 1), fmt(s.endPct, 1)])}
            caption={`${metStamp(from)} → ${metStamp(to)}`}
            ariaLabel="Sink ledger segments"
            alertRows={visible.map((s, i) => (s.kind === 'purge' ? i : -1)).filter((i) => i >= 0)}
          />
        </section>

        <Note tone="warn">
          Endurance on a Watch window is {fmt(WATCH_DESIGN_HOURS, 1)} hours ± {fmt(WATCH_DESIGN_SD_HOURS, 1)}, from {SINK_CAPACITY_GJ} GJ against a load that is itself a distribution. My working figure is {WATCH_WORKING_HOURS}. The figure I will put in writing is {WATCH_IN_WRITING_HOURS}. The difference between those three numbers is not caution — it is the spread, and the spread is real.
        </Note>
        <Note>
          A purge is {fmt(PURGE_HOURS, 1)} hours with the wings out and the cellar down to {PURGE_FLOOR_PCT}%. {fmtInt(purges.length)} of them on this trace. Every one is a decision, not a maintenance item.
          {markAt !== undefined && markAt >= from && markAt <= to ? ` ${markLabel ?? 'The mark'} sits at ${metStamp(markAt)}, cellar ${fmt(sinkAt(markAt), 0)}%.` : ''}
        </Note>
      </div>
    </Panel>
  )
}
