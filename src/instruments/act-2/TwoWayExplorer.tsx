/**
 * TwoWayExplorer (act-2-01) — the Register's loss subtable, owner class × classification.
 * The learner switches counts / row % / column % / joint %, flips the conditioning variable, and
 * reads segmented bars or a mosaic; focusing or hovering a cell prints its joint, marginal and
 * both conditional probabilities. Every number comes through `twoWay` from @/lib/stats.
 */
import { useMemo, useState, type KeyboardEvent } from 'react'
import { scaleBand, scaleLinear } from 'd3'
import { Panel } from '@/components'
import { Segmented, Readout, ReadoutRow, Legend, useChartFrame, ChartSurface, PlotClip, BandAxis, YAxis } from '@/instruments/shared'
import { chartTheme, seriesColor, tickTextProps, labelTextProps } from '@/design/chart-theme'
import { twoWay, fmtPct, sum, type TwoWayTable } from '@/lib/stats'
import { lossRecords, lossCounts, lossTwoWay, OWNER_CLASSES, CLASSIFICATIONS } from './data'
import './act2.css'

type Show = 'counts' | 'row' | 'col' | 'joint'
type View = 'table' | 'bars' | 'mosaic'
type Cond = 'owner' | 'class'

const SHOW_OPTIONS = [
  { value: 'counts', label: 'counts' },
  { value: 'row', label: 'row %' },
  { value: 'col', label: 'column %' },
  { value: 'joint', label: 'joint %' },
] as const
const VIEW_OPTIONS = [
  { value: 'table', label: 'table' },
  { value: 'bars', label: 'segmented bars' },
  { value: 'mosaic', label: 'mosaic' },
] as const
const COND_OPTIONS = [
  { value: 'owner', label: 'owner class' },
  { value: 'class', label: 'classification' },
] as const

const ROW_VAR = 'owner class'
const COL_VAR = 'classification'

function cellText(tw: TwoWayTable, show: Show, i: number, j: number): string {
  if (show === 'counts') return String(tw.table[i][j])
  if (show === 'row') return fmtPct(tw.rowConditional[i][j], 1)
  if (show === 'col') return fmtPct(tw.colConditional[j][i], 1)
  return fmtPct(tw.joint[i][j], 1)
}
function rowMarginText(tw: TwoWayTable, show: Show, i: number): string {
  if (show === 'counts') return String(tw.rowTotals[i])
  if (show === 'row') return fmtPct(sum(tw.rowConditional[i]), 1)
  return fmtPct(tw.marginalRows[i], 1)
}
function colMarginText(tw: TwoWayTable, show: Show, j: number): string {
  if (show === 'counts') return String(tw.colTotals[j])
  if (show === 'col') return fmtPct(sum(tw.colConditional[j]), 1)
  return fmtPct(tw.marginalCols[j], 1)
}
const SHOW_CAPTION: Record<Show, string> = {
  counts: 'counts',
  row: `row % · P(${COL_VAR} | ${ROW_VAR})`,
  col: `column % · P(${ROW_VAR} | ${COL_VAR})`,
  joint: 'joint % of all losses',
}

/** One 100 %-stacked bar per row of `tw` (rows = the conditioning variable). Mosaic widths ∝ row marginals. */
function ConditionalBars({ tw, mosaic, condLabel, segLabel }: { tw: TwoWayTable; mosaic: boolean; condLabel: string; segLabel: string }) {
  const frame = useChartFrame({ height: 250, yLabel: true, margin: { top: 16 } })
  const levels = tw.rows
  const segs = tw.cols
  const y = useMemo(() => scaleLinear().domain([0, 1]).range([frame.innerHeight, 0]), [frame.innerHeight])
  const band = useMemo(() => scaleBand<string>().domain(levels).range([0, frame.innerWidth]).paddingInner(0.35).paddingOuter(0.15), [levels, frame.innerWidth])

  const bars = useMemo(() => {
    const gap = 4
    const avail = frame.innerWidth - gap * (levels.length - 1)
    let cursor = 0
    return levels.map((level, i) => {
      let x0: number
      let w: number
      if (mosaic) {
        w = Math.max(0, tw.marginalRows[i] * avail)
        x0 = cursor
        cursor += w + gap
      } else {
        const bw = band.bandwidth()
        w = Math.min(bw, 96)
        x0 = (band(level) ?? 0) + (bw - w) / 2
      }
      let cum = 0
      const parts = segs.map((seg, j) => {
        const p = tw.rowConditional[i][j]
        const top = y(cum + p)
        const h = y(cum) - top
        cum += p
        return { seg, j, p, top, h }
      })
      return { level, i, x0, w, parts }
    })
  }, [levels, segs, tw, mosaic, band, y, frame.innerWidth])

  const table = useMemo(
    () => ({
      columns: [condLabel, ...segs.map((s) => `P(${s} | ${condLabel})`), 'n', `P(${condLabel})`],
      rows: levels.map((l, i) => [l, ...segs.map((_, j) => fmtPct(tw.rowConditional[i][j], 1)), tw.rowTotals[i], fmtPct(tw.marginalRows[i], 1)]),
      caption: `${segLabel} conditional on ${condLabel}`,
    }),
    [tw, levels, segs, condLabel, segLabel],
  )
  const kind = mosaic ? 'Mosaic plot' : 'Segmented bar chart'
  return (
    <ChartSurface
      frame={frame}
      ariaLabel={`${kind}: ${segLabel} conditional on ${condLabel}`}
      description={`One 100 percent stacked bar per ${condLabel}; the segments show the conditional distribution of ${segLabel}.${mosaic ? ` Bar widths are proportional to the marginal distribution of ${condLabel}.` : ''}`}
      table={table}
      footer={<Legend items={segs.map((s, j) => ({ label: s, color: seriesColor(j) }))} ariaLabel={`${segLabel} legend`} />}
    >
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <YAxis scale={y} width={frame.innerWidth} ticks={5} format={(v) => `${Math.round(v * 100)}%`} label={`P(${segLabel} | ${condLabel})`} />
        <PlotClip frame={frame}>
          {bars.map((b) => (
            <g key={b.level}>
              {b.parts.map((s) => (
                <rect key={s.seg} className="dr-mark dr-mark--bar" x={b.x0} y={s.top} width={b.w} height={Math.max(0, s.h)} fill={seriesColor(s.j)} fillOpacity={chartTheme.mark.alpha} stroke={chartTheme.color.surface} strokeWidth={1}>
                  <title>{`P(${s.seg} | ${b.level}) = ${fmtPct(s.p, 1)}`}</title>
                </rect>
              ))}
              {b.parts.map((s) =>
                s.h > 14 && b.w > 34 ? (
                  <text key={`${s.seg}-t`} x={b.x0 + b.w / 2} y={s.top + s.h / 2} dy="0.35em" textAnchor="middle" fill={chartTheme.color.ring} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick} pointerEvents="none">
                    {fmtPct(s.p, 0)}
                  </text>
                ) : null,
              )}
            </g>
          ))}
        </PlotClip>
        {mosaic ? (
          <g className="dr-axis dr-axis--band" transform={`translate(0,${frame.innerHeight})`} aria-hidden="true">
            <line x1={0} x2={frame.innerWidth} stroke={chartTheme.color.axis} strokeWidth={chartTheme.stroke.hair} shapeRendering="crispEdges" />
            {bars.map((b) => (
              <text key={b.level} x={b.x0 + b.w / 2} y={18} textAnchor="middle" {...tickTextProps}>
                {b.w > 40 ? `${b.level} ${fmtPct(tw.marginalRows[b.i], 0)}` : fmtPct(tw.marginalRows[b.i], 0)}
              </text>
            ))}
            <text x={frame.innerWidth / 2} y={34} textAnchor="middle" {...labelTextProps}>
              {condLabel} (width ∝ marginal)
            </text>
          </g>
        ) : (
          <BandAxis scale={band} height={frame.innerHeight} label={condLabel} />
        )}
      </g>
    </ChartSurface>
  )
}

export function TwoWayExplorer() {
  const tw = lossTwoWay
  const n = lossRecords.length
  const [show, setShow] = useState<Show>('counts')
  const [view, setView] = useState<View>('table')
  const [cond, setCond] = useState<Cond>('owner')
  const [active, setActive] = useState<[number, number] | null>(null)
  const [hover, setHover] = useState<[number, number] | null>(null)

  /** The table re-oriented so its rows are the conditioning variable (built through twoWay, never by hand). */
  const condTable = useMemo(() => {
    if (cond === 'owner') return tw
    const transposed = CLASSIFICATIONS.map((_, j) => OWNER_CLASSES.map((_, i) => lossCounts[i][j]))
    return twoWay(transposed, { rows: CLASSIFICATIONS, cols: OWNER_CLASSES })
  }, [cond, tw])
  const condLabel = cond === 'owner' ? ROW_VAR : COL_VAR
  const segLabel = cond === 'owner' ? COL_VAR : ROW_VAR

  const shown = hover ?? active
  const tabStop = active ?? [0, 0]

  const onKey = (e: KeyboardEvent<HTMLTableElement>) => {
    const el = e.target as HTMLElement
    if (!el.dataset.i) return
    let i = Number(el.dataset.i)
    let j = Number(el.dataset.j)
    if (e.key === 'ArrowRight') j = Math.min(CLASSIFICATIONS.length - 1, j + 1)
    else if (e.key === 'ArrowLeft') j = Math.max(0, j - 1)
    else if (e.key === 'ArrowDown') i = Math.min(OWNER_CLASSES.length - 1, i + 1)
    else if (e.key === 'ArrowUp') i = Math.max(0, i - 1)
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = CLASSIFICATIONS.length - 1
    else return
    e.preventDefault()
    const next = e.currentTarget.querySelector<HTMLButtonElement>(`button[data-i="${i}"][data-j="${j}"]`)
    next?.focus()
  }

  return (
    <Panel label="INTEL · REGISTER CROSS-TAB" tone="intel" status={`n = ${n} losses`}>
      <div className="dr-controls">
        <Segmented label="SHOW" value={show} options={SHOW_OPTIONS} onChange={setShow} disabled={view !== 'table'} />
        <Segmented label="VIEW" value={view} options={VIEW_OPTIONS} onChange={setView} />
        <Segmented label="CONDITION ON" value={cond} options={COND_OPTIONS} onChange={setCond} disabled={view === 'table'} />
      </div>

      {view === 'table' ? (
        <table className="dr-xtab" aria-label={`Loss subtable, ${ROW_VAR} by ${COL_VAR}, showing ${SHOW_CAPTION[show]}`} onKeyDown={onKey} onMouseLeave={() => setHover(null)}>
          <caption>
            {ROW_VAR} × {COL_VAR} · {SHOW_CAPTION[show]}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="dr-xtab__corner">
                owner ↓ · class →
              </th>
              {CLASSIFICATIONS.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
              <th scope="col">total</th>
            </tr>
          </thead>
          <tbody>
            {OWNER_CLASSES.map((o, i) => (
              <tr key={o}>
                <th scope="row">{o}</th>
                {CLASSIFICATIONS.map((c, j) => {
                  const isActive = !!shown && shown[0] === i && shown[1] === j
                  return (
                    <td key={c}>
                      <button
                        type="button"
                        className={['dr-xtab__cell', isActive ? 'is-active' : '', tw.table[i][j] === 0 ? 'is-zero' : ''].filter(Boolean).join(' ')}
                        data-i={i}
                        data-j={j}
                        tabIndex={tabStop[0] === i && tabStop[1] === j ? 0 : -1}
                        aria-label={`${o}, ${c}: ${cellText(tw, show, i, j)}`}
                        onFocus={() => setActive([i, j])}
                        onClick={() => setActive([i, j])}
                        onMouseEnter={() => setHover([i, j])}
                      >
                        {cellText(tw, show, i, j)}
                      </button>
                    </td>
                  )
                })}
                <td className="dr-xtab__margin">{rowMarginText(tw, show, i)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">total</th>
              {CLASSIFICATIONS.map((c, j) => (
                <td key={c} className="dr-xtab__margin">
                  {colMarginText(tw, show, j)}
                </td>
              ))}
              <td className="dr-xtab__margin dr-xtab__total">{show === 'counts' ? tw.total : fmtPct(sum(tw.marginalRows), 1)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <ConditionalBars tw={condTable} mosaic={view === 'mosaic'} condLabel={condLabel} segLabel={segLabel} />
      )}

      <div className="dr-xtab__readout" aria-live="polite">
        {shown ? (
          <CellReadout tw={tw} i={shown[0]} j={shown[1]} />
        ) : (
          <p className="dr-xtab__readout-head">{view === 'table' ? 'Focus or hover a cell for its joint, marginal and conditional probabilities. Tab into the table; arrow keys move between cells.' : 'Each bar is one level of the conditioning variable; switch to the table view to read a cell.'}</p>
        )}
      </div>
    </Panel>
  )
}

function CellReadout({ tw, i, j }: { tw: TwoWayTable; i: number; j: number }) {
  const row = OWNER_CLASSES[i]
  const col = CLASSIFICATIONS[j]
  const cell = tw.table[i][j]
  return (
    <>
      <p className="dr-xtab__readout-head">
        cell <strong>{row}</strong> · <strong>{col}</strong>
      </p>
      <ReadoutRow>
        <Readout label="count" value={cell} size="sm" tone="intel" />
        <Readout label={`joint P(${row} ∧ ${col})`} value={fmtPct(tw.joint[i][j], 1)} units={`${cell}/${tw.total}`} size="sm" />
        <Readout label={`marginal P(${row})`} value={fmtPct(tw.marginalRows[i], 1)} units={`${tw.rowTotals[i]}/${tw.total}`} size="sm" />
        <Readout label={`marginal P(${col})`} value={fmtPct(tw.marginalCols[j], 1)} units={`${tw.colTotals[j]}/${tw.total}`} size="sm" />
        <Readout label={`P(${col} | ${row})`} value={fmtPct(tw.rowConditional[i][j], 1)} units={`${cell}/${tw.rowTotals[i]}`} size="sm" tone="intel" />
        <Readout label={`P(${row} | ${col})`} value={fmtPct(tw.colConditional[j][i], 1)} units={`${cell}/${tw.colTotals[j]}`} size="sm" tone="intel" />
      </ReadoutRow>
    </>
  )
}
