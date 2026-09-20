/**
 * Boxplot — one or more groups, horizontal, AP/TI-84 quartiles with 1.5×IQR whiskers and outlier
 * dots. Pass `values` to compute geometry locally, or `stats` (from `@/lib/stats`) to draw exactly
 * what the course computed.
 */
import { useMemo } from 'react'
import { scaleBand, scaleLinear } from 'd3'
import { chartTheme, seriesColor } from '@/design/chart-theme'
import { boxplotStats, boxStatsFrom, padDomain, niceTicks, fmtTick, type BoxStats } from './geometry'
import { useChartFrame, ChartSurface } from './frame'
import { XAxis, ReferenceLine } from './Axis'

export interface BoxGroup {
  name: string
  values?: readonly number[]
  stats?: { min: number; q1: number; median: number; q3: number; max: number; outliers?: number[]; whiskerLo?: number; whiskerHi?: number; n?: number }
  color?: string
}

export interface BoxplotProps {
  groups: readonly BoxGroup[]
  label?: string
  domain?: [number, number]
  /** Show the raw points jittered above each box. */
  showPoints?: boolean
  /** Draw the 1.5×IQR fences as faint reference lines. */
  showFences?: boolean
  references?: { x: number; label?: string }[]
  height?: number
  ariaLabel: string
  description?: string
  showTable?: boolean
  className?: string
}

export function Boxplot({ groups, label, domain, showPoints = false, showFences = false, references, height, ariaLabel, description, showTable = false, className }: BoxplotProps) {
  const rowH = showPoints ? 64 : 44
  const h = height ?? Math.max(120, groups.length * rowH + 52)
  const frame = useChartFrame({ height: h, margin: { top: 10, left: 16, right: 16 } })

  const computed = useMemo(
    () =>
      groups.map((g, i) => ({
        name: g.name,
        color: g.color ?? seriesColor(i),
        values: g.values ?? [],
        stats: (g.stats ? boxStatsFrom(g.stats) : boxplotStats(g.values ?? [])) as BoxStats | null,
      })),
    [groups],
  )

  const dom = useMemo<[number, number]>(() => {
    if (domain) return domain
    const all = computed.flatMap((c) => (c.stats ? [c.stats.min, c.stats.max] : [])).concat(computed.flatMap((c) => c.values))
    if (!all.length) return [0, 1]
    return padDomain([Math.min(...all), Math.max(...all)], 0.06)
  }, [computed, domain])

  const band = useMemo(
    () =>
      scaleBand<string>()
        .domain(computed.map((c) => c.name))
        .range([0, frame.innerHeight])
        .paddingInner(0.35)
        .paddingOuter(0.15),
    [computed, frame.innerHeight],
  )

  const table = useMemo(
    () => ({
      columns: ['group', 'n', 'min', 'Q1', 'median', 'Q3', 'max', 'outliers'],
      rows: computed.map((c) => (c.stats ? [c.name, c.stats.n || c.values.length, c.stats.min, c.stats.q1, c.stats.median, c.stats.q3, c.stats.max, c.stats.outliers.map(fmtTick).join(', ') || '—'] : [c.name, 0, '—', '—', '—', '—', '—', '—'])),
      caption: label,
    }),
    [computed, label],
  )

  const labelW = Math.min(120, Math.max(...computed.map((c) => c.name.length)) * 7 + 8)
  const boxLeft = computed.length > 1 || computed[0]?.name ? labelW : 0
  const xb = useMemo(() => scaleLinear().domain(dom).range([boxLeft, frame.innerWidth]), [dom, boxLeft, frame.innerWidth])

  return (
    <ChartSurface frame={frame} ariaLabel={ariaLabel} description={description} table={table} showTable={showTable} className={className}>
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        {references?.map((r, i) => (
          <ReferenceLine key={i} x={xb(r.x)} height={frame.innerHeight} label={r.label} />
        ))}
        {computed.map((c) => {
          const y0 = band(c.name) ?? 0
          const bh = band.bandwidth()
          const boxH = Math.min(showPoints ? bh * 0.5 : bh, 26)
          const cy = y0 + (showPoints ? bh - boxH / 2 : bh / 2)
          const s = c.stats
          return (
            <g key={c.name} className="dr-boxgroup">
              {boxLeft > 0 && (
                <text x={boxLeft - 8} y={cy} dy="0.32em" textAnchor="end" fill={chartTheme.color.label} fontFamily={chartTheme.font.mono} fontSize={chartTheme.fontSize.tick}>
                  {c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name}
                </text>
              )}
              {s && (
                <>
                  {showFences && (
                    <>
                      <line x1={xb(s.lowFence)} x2={xb(s.lowFence)} y1={cy - boxH / 2 - 4} y2={cy + boxH / 2 + 4} stroke={chartTheme.color.grid} strokeDasharray="2 2" />
                      <line x1={xb(s.highFence)} x2={xb(s.highFence)} y1={cy - boxH / 2 - 4} y2={cy + boxH / 2 + 4} stroke={chartTheme.color.grid} strokeDasharray="2 2" />
                    </>
                  )}
                  {/* whiskers */}
                  <line x1={xb(s.whiskerLo)} x2={xb(s.q1)} y1={cy} y2={cy} stroke={c.color} strokeWidth={chartTheme.stroke.hair} />
                  <line x1={xb(s.q3)} x2={xb(s.whiskerHi)} y1={cy} y2={cy} stroke={c.color} strokeWidth={chartTheme.stroke.hair} />
                  <line x1={xb(s.whiskerLo)} x2={xb(s.whiskerLo)} y1={cy - boxH / 3} y2={cy + boxH / 3} stroke={c.color} strokeWidth={chartTheme.stroke.hair} />
                  <line x1={xb(s.whiskerHi)} x2={xb(s.whiskerHi)} y1={cy - boxH / 3} y2={cy + boxH / 3} stroke={c.color} strokeWidth={chartTheme.stroke.hair} />
                  {/* box */}
                  <rect className="dr-mark dr-mark--box" x={xb(s.q1)} y={cy - boxH / 2} width={Math.max(1, xb(s.q3) - xb(s.q1))} height={boxH} fill={c.color} fillOpacity={0.28} stroke={c.color} strokeWidth={1.5}>
                    <title>
                      {c.name}: min {fmtTick(s.min)} · Q1 {fmtTick(s.q1)} · med {fmtTick(s.median)} · Q3 {fmtTick(s.q3)} · max {fmtTick(s.max)}
                    </title>
                  </rect>
                  {/* median */}
                  <line x1={xb(s.median)} x2={xb(s.median)} y1={cy - boxH / 2} y2={cy + boxH / 2} stroke={chartTheme.color.title} strokeWidth={2} />
                  {/* outliers */}
                  {s.outliers.map((o, i) => (
                    <circle key={i} className="dr-mark dr-mark--dot" cx={xb(o)} cy={cy} r={chartTheme.mark.dotR} fill="none" stroke={chartTheme.color.rejected} strokeWidth={1.5}>
                      <title>outlier {fmtTick(o)}</title>
                    </circle>
                  ))}
                  {showPoints &&
                    c.values.map((v, i) => (
                      <circle key={`p${i}`} cx={xb(v)} cy={y0 + 6 + ((i * 7919) % 100) / 100 * (bh * 0.35)} r={2.5} fill={c.color} fillOpacity={0.7} />
                    ))}
                </>
              )}
            </g>
          )
        })}
        <XAxis scale={xb} height={frame.innerHeight} ticks={niceTicks(dom[0], dom[1], frame.innerWidth < 420 ? 4 : 7)} label={label} />
      </g>
    </ChartSurface>
  )
}
