/**
 * INTEL · DISPLAY INTEGRITY (act-1-02) — the Board's chart of classification, with every dial the
 * Board could have turned: the denominator, the axis baseline, counts vs relative frequency, the
 * bar width, bars vs pie. RESTORE HONEST AXES puts them back. A second panel compares the two
 * classifying offices side by side on relative frequency.
 *
 * The bar chart is custom (useChartFrame + ChartSurface) because the shared BarChart has no
 * truncated baseline — the whole point here.
 */
import { useMemo, useState } from 'react'
import { arc as d3Arc, pie as d3Pie, scaleBand, scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import { Segmented, Slider, Readout, ReadoutRow, Legend, useChartFrame, ChartSurface, PlotClip, BandAxis, YAxis, chartTheme, seriesColor, semanticColor, fmtTick, type LegendItem } from '@/instruments/shared'
import { countBy, fmt, fmtInt, fmtPct, twoWay } from '@/lib/stats'
import { register, losses, type LossRecord } from './data'
import { Note, Subhead, gridStyle, stackStyle } from './_ui'

export interface DisplayIntegrityPanelProps {}

type Denominator = 'all' | 'losses'
type Scale = 'count' | 'relfreq'
type View = 'bars' | 'pie'

const ALL_CATEGORIES = ['debris advisory', 'profile-deviation advisory', 'medical diversion', 'transponder dropout', 'accident', 'piracy', 'unknown'] as const
const LOSS_CATEGORIES = ['accident', 'piracy', 'unknown'] as const
const OFFICES = ['Uruk', 'Ceres'] as const
const DEFAULT_WIDTH = 0.6

const HONEST = { denominator: 'losses' as Denominator, baseline: 0, scale: 'relfreq' as Scale, width: DEFAULT_WIDTH }
const BOARD = { denominator: 'all' as Denominator, baseline: 0, scale: 'count' as Scale, width: DEFAULT_WIDTH }

/* ---------- Custom bars with a movable baseline ---------- */

interface BarSeries {
  name: string
  values: readonly number[]
  color: string
}

interface IntegrityBarsProps {
  categories: readonly string[]
  series: readonly BarSeries[]
  /** Lower end of the value axis (0 is honest). */
  baseline: number
  yMax: number
  /** Bar thickness as a fraction of its slot (0–1). */
  widthFrac: number
  valueLabel: string
  format: (v: number) => string
  ariaLabel: string
  description: string
  height?: number
}

function IntegrityBars({ categories, series, baseline, yMax, widthFrac, valueLabel, format, ariaLabel, description, height = 260 }: IntegrityBarsProps) {
  const frame = useChartFrame({ height })
  const band = useMemo(() => scaleBand<string>().domain([...categories]).range([0, frame.innerWidth]).paddingInner(0.2).paddingOuter(0.1), [categories, frame.innerWidth])
  const y = useMemo(() => scaleLinear().domain([baseline, Math.max(yMax, baseline + 1e-9)]).nice(4).range([frame.innerHeight, 0]), [baseline, yMax, frame.innerHeight])
  const table = useMemo(
    () => ({
      columns: ['category', ...series.map((s) => `${s.name} ${valueLabel}`)],
      rows: categories.map((c, i) => [c, ...series.map((s) => format(s.values[i] ?? 0))]),
      caption: `${valueLabel} · axis starts at ${format(baseline)}`,
    }),
    [categories, series, valueLabel, format, baseline],
  )
  const slot = band.bandwidth() / series.length
  const thickness = Math.max(1, slot * Math.max(0.02, Math.min(1, widthFrac)))
  return (
    <ChartSurface frame={frame} ariaLabel={ariaLabel} description={description} table={table}>
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <YAxis scale={y} width={frame.innerWidth} ticks={4} label={valueLabel} format={format} />
        <PlotClip frame={frame}>
          {categories.map((c, i) => {
            const x0 = band(c) ?? 0
            return series.map((s, j) => {
              const v = s.values[i] ?? 0
              const top = Math.min(frame.innerHeight, Math.max(0, y(v)))
              const h = v <= baseline ? 0 : frame.innerHeight - top
              const x = x0 + j * slot + (slot - thickness) / 2
              return (
                <rect key={`${c}-${s.name}`} className="dr-mark dr-mark--bar" x={x} y={frame.innerHeight - h} width={thickness} height={h + (h > 0 ? chartTheme.mark.barRadius : 0)} fill={s.color} fillOpacity={chartTheme.mark.alpha} rx={chartTheme.mark.barRadius}>
                  <title>
                    {s.name ? `${s.name} · ` : ''}
                    {c}: {format(v)}
                  </title>
                </rect>
              )
            })
          })}
        </PlotClip>
        {baseline > 0 && (
          <text x={frame.innerWidth - 4} y={frame.innerHeight - 6} textAnchor="end" fill={semanticColor('rejected')} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
            axis starts at {format(baseline)}
          </text>
        )}
        <BandAxis scale={band} height={frame.innerHeight} />
      </g>
    </ChartSurface>
  )
}

/* ---------- Pie ---------- */

function IntegrityPie({ categories, values, colors, ariaLabel, description, height = 260 }: { categories: readonly string[]; values: readonly number[]; colors: readonly string[]; ariaLabel: string; description: string; height?: number }) {
  const frame = useChartFrame({ height, margin: { top: 8, right: 8, bottom: 8, left: 8 } })
  const total = values.reduce((a, b) => a + b, 0) || 1
  const r = Math.max(10, Math.min(frame.innerWidth, frame.innerHeight) / 2 - 6)
  const slices = useMemo(() => {
    const gen = d3Pie<number>().sort(null).value((d) => d)
    const arcGen = d3Arc<{ startAngle: number; endAngle: number }>().innerRadius(0).outerRadius(r)
    const labelArc = d3Arc<{ startAngle: number; endAngle: number }>().innerRadius(r * 0.62).outerRadius(r * 0.62)
    return gen([...values]).map((s, i) => ({ path: arcGen(s) ?? '', centroid: labelArc.centroid(s), share: values[i] / total, name: categories[i], color: colors[i] }))
  }, [values, categories, colors, r, total])
  const table = { columns: ['category', 'count', 'share'], rows: categories.map((c, i) => [c, values[i], fmtPct(values[i] / total, 1)]) }
  return (
    <ChartSurface frame={frame} ariaLabel={ariaLabel} description={description} table={table}>
      <g transform={`translate(${frame.margin.left + frame.innerWidth / 2},${frame.margin.top + frame.innerHeight / 2})`}>
        {slices.map((s) => (
          <g key={s.name}>
            <path d={s.path} fill={s.color} fillOpacity={chartTheme.mark.alpha} stroke={chartTheme.color.ring} strokeWidth={1}>
              <title>
                {s.name}: {fmtPct(s.share, 1)}
              </title>
            </path>
            {s.share >= 0.04 && (
              <text x={s.centroid[0]} y={s.centroid[1]} dy="0.32em" textAnchor="middle" fill={chartTheme.color.title} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                {fmtPct(s.share, 0)}
              </text>
            )}
          </g>
        ))}
      </g>
    </ChartSurface>
  )
}

/* ---------- The panel ---------- */

export function DisplayIntegrityPanel(_props: DisplayIntegrityPanelProps = {}) {
  void _props
  const [denominator, setDenominator] = useState<Denominator>(BOARD.denominator)
  const [baseline, setBaseline] = useState(BOARD.baseline)
  const [scale, setScale] = useState<Scale>(BOARD.scale)
  const [width, setWidth] = useState(BOARD.width)
  const [view, setView] = useState<View>('bars')

  const counts = useMemo(() => {
    if (denominator === 'losses') return countBy(losses.map((l) => l.classification), [...LOSS_CATEGORIES])
    const labels = register.map((r) => (r.severity === 'loss' ? (r as LossRecord).classification : r.kind))
    return countBy(labels, [...ALL_CATEGORIES])
  }, [denominator])
  const n = denominator === 'losses' ? losses.length : register.length
  const categories = counts.map((c) => String(c.value))
  const unknown = counts.find((c) => c.value === 'unknown')
  const unknownShare = (unknown?.count ?? 0) / n

  const values = scale === 'count' ? counts.map((c) => c.count) : counts.map((c) => c.relFreq)
  const yMax = scale === 'count' ? Math.max(...counts.map((c) => c.count)) : 1
  const baselineValue = scale === 'count' ? (baseline / 100) * n : baseline / 100
  const format = scale === 'count' ? (v: number) => fmtTick(Math.round(v)) : (v: number) => fmt(v, 2)
  const colors = categories.map((c, i) => (c === 'unknown' ? semanticColor('rejected') : seriesColor(i)))

  const honest = denominator === HONEST.denominator && baseline === HONEST.baseline && scale === HONEST.scale && width === HONEST.width
  const restore = () => {
    setDenominator(HONEST.denominator)
    setBaseline(HONEST.baseline)
    setScale(HONEST.scale)
    setWidth(HONEST.width)
  }
  const board = () => {
    setDenominator(BOARD.denominator)
    setBaseline(BOARD.baseline)
    setScale(BOARD.scale)
    setWidth(BOARD.width)
    setView('bars')
  }

  /* Side-by-side offices */
  const offices = useMemo(() => {
    const table = OFFICES.map((o) => LOSS_CATEGORIES.map((c) => losses.filter((l) => l.office === o && l.classification === c).length))
    return twoWay(table, { rows: [...OFFICES], cols: [...LOSS_CATEGORIES] })
  }, [])
  const officeSeries: BarSeries[] = offices.rows.map((o, i) => ({ name: `${o} (n = ${offices.rowTotals[i]})`, values: offices.rowConditional[i], color: seriesColor(i === 0 ? 1 : 3) }))
  const officeLegend: LegendItem[] = officeSeries.map((s) => ({ label: s.name, color: s.color }))

  const legend: LegendItem[] = categories.map((c, i) => ({ label: c, color: colors[i], value: scale === 'count' ? fmtInt(counts[i].count) : fmt(counts[i].relFreq, 3) }))

  return (
    <Panel label="INTEL · DISPLAY INTEGRITY" status={honest ? 'AXES HONEST' : 'AXES AS FILED'} tone="intel" led={honest ? 'on' : 'warn'}>
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Denominator> label="denominator" value={denominator} onChange={setDenominator} options={[{ value: 'all', label: `all records · ${fmtInt(register.length)}` }, { value: 'losses', label: `losses · ${losses.length}` }]} />
          <Segmented<Scale> label="scale" value={scale} onChange={setScale} options={[{ value: 'count', label: 'counts' }, { value: 'relfreq', label: 'relative frequency' }]} />
          <Slider label="axis baseline" value={baseline} min={0} max={60} step={1} units="% of n" onChange={setBaseline} />
          <Slider label="bar width" value={width} min={0.1} max={1} step={0.05} onChange={setWidth} format={(v) => fmt(v, 2)} />
          <Segmented<View> label="view" value={view} onChange={setView} options={[{ value: 'bars', label: 'bars' }, { value: 'pie', label: 'pie' }]} />
          <button type="button" className="dr-btn dr-btn--primary" onClick={restore} disabled={honest}>
            RESTORE HONEST AXES
          </button>
          <button type="button" className="dr-btn dr-btn--ghost" onClick={board}>
            AS THE BOARD FILED IT
          </button>
        </div>

        <ReadoutRow>
          <Readout label="unknown share of denominator" value={fmtPct(unknownShare, 1)} tone={honest ? 'intel' : 'alert'} live />
          <Readout label="unknown" value={fmtInt(unknown?.count ?? 0)} size="sm" />
          <Readout label="denominator n" value={fmtInt(n)} size="sm" />
          <Readout label="axis starts at" value={scale === 'count' ? fmtInt(baselineValue) : fmt(baselineValue, 2)} size="sm" tone={baseline > 0 ? 'alert' : 'default'} />
        </ReadoutRow>

        {view === 'bars' ? (
          <IntegrityBars
            categories={categories}
            series={[{ name: '', values, color: seriesColor(0) }]}
            baseline={baselineValue}
            yMax={yMax}
            widthFrac={width}
            valueLabel={scale === 'count' ? 'count' : 'relative frequency'}
            format={format}
            ariaLabel={`Bar chart of ${denominator === 'losses' ? 'loss classification' : 'record type'} for ${fmtInt(n)} records`}
            description={`${categories.length} bars showing ${scale === 'count' ? 'counts' : 'relative frequencies'} with the value axis starting at ${format(baselineValue)}. The unknown bar is ${fmtPct(unknownShare, 1)} of the denominator.`}
          />
        ) : (
          <IntegrityPie categories={categories} values={counts.map((c) => c.count)} colors={colors} ariaLabel={`Pie chart of ${denominator === 'losses' ? 'loss classification' : 'record type'} for ${fmtInt(n)} records`} description={`One circle split into ${categories.length} slices by share of ${fmtInt(n)} records; unknown is ${fmtPct(unknownShare, 1)}.`} />
        )}
        <Legend items={legend} />

        {view === 'pie' ? (
          <Note tone="ok">A pie is legitimate here: every slice is a part of one whole (n = {fmtInt(n)}). It cannot compare Uruk with Ceres — that needs side-by-side bars on a shared scale.</Note>
        ) : baseline > 0 ? (
          <Note tone="alert">The value axis starts at {scale === 'count' ? fmtInt(baselineValue) : fmt(baselineValue, 2)}. Bar heights are no longer proportional to the values; the shortest bars vanish.</Note>
        ) : (
          <Note>Bars from a zero baseline: height is proportional to the value. Change the denominator and the same unknown count becomes a different share.</Note>
        )}

        <section aria-label="Offices compared">
          <Subhead>Uruk vs Ceres · classification within each office</Subhead>
          <div style={gridStyle}>
            <div>
              <IntegrityBars categories={[...LOSS_CATEGORIES]} series={officeSeries} baseline={0} yMax={1} widthFrac={0.8} valueLabel="relative frequency" format={(v) => fmt(v, 2)} height={220} ariaLabel="Side-by-side bars of loss classification by classifying office" description={`Relative frequency of accident, piracy and unknown within Uruk (n = ${offices.rowTotals[0]}) and within Ceres (n = ${offices.rowTotals[1]}), on a shared zero-based axis.`} />
              <Legend items={officeLegend} />
            </div>
            <div>
              <table className="dr-table" aria-label="Office by classification relative frequencies">
                <caption className="dr-table__caption">row-conditional relative frequencies · count (row %)</caption>
                <thead>
                  <tr>
                    <th scope="col">office</th>
                    {LOSS_CATEGORIES.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                    <th scope="col">n</th>
                  </tr>
                </thead>
                <tbody>
                  {offices.rows.map((o, i) => (
                    <tr key={o}>
                      <td>{o}</td>
                      {LOSS_CATEGORIES.map((_, j) => (
                        <td key={j}>
                          {offices.table[i][j]} ({fmtPct(offices.rowConditional[i][j], 1)})
                        </td>
                      ))}
                      <td>{offices.rowTotals[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Note>Different n per office: compare relative frequencies, not counts.</Note>
            </div>
          </div>
        </section>
      </div>
    </Panel>
  )
}
