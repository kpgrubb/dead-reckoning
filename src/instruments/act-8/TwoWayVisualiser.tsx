/**
 * TWO-WAY TABLE · the display 8-03 sets a table up on and 8-04 reads a result off.
 *
 * One component, three tables: loss × beneficiary (2×2, independence), cause × corridor (2×3,
 * homogeneity) and examiner × diverted (2×2, conditions fail). The table and its result are props,
 * so nothing about the procedure is baked in here and the same panel serves all three.
 *
 * Four views, switched by the learner:
 *
 *   OBSERVED       the counts, each with its expected count printed underneath
 *   EXPECTED       row total × column total ÷ n, alone, so the margins can be checked
 *   CONTRIBUTIONS  (O − E)²/E per cell, with the largest one named in the caption
 *   MOSAIC         one bar per row, width proportional to the row total, split by the row's own
 *                  conditional proportions. Two rows whose bars split at different heights are two
 *                  different distributions, and that is what the statistic is measuring.
 *
 * `showTest` withholds the statistic, the degrees of freedom and the P-value: 8-03 sets the tables
 * up and 8-04 runs them, and the setup module must not print the results it is asking for.
 *
 * Every number comes from the `ChiSquareTableResult` the caller passes in. This file computes row
 * totals and conditional proportions for the mosaic geometry and nothing else.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { ChartSurface, Legend, Readout, Segmented, seriesColor, useChartFrame } from '@/instruments/shared'
import { fmt, fmtInt, fmtP, fmtPct, type ChiSquareTableResult } from '@/lib/stats'
import { ConditionList, MatrixTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export type TwoWayView = 'observed' | 'expected' | 'contribution' | 'mosaic'

export interface TwoWayVisualiserProps {
  rowLabels: readonly string[]
  colLabels: readonly string[]
  table: readonly (readonly number[])[]
  result: ChiSquareTableResult
  /** Table caption, in the module's own words. */
  caption?: string
  ariaLabel: string
  /** Which view the panel opens on. */
  defaultLayer?: TwoWayView
  label?: string
  tone?: PanelTone
  /** What one row is, for the mosaic's x-axis caption ("corridor", "beneficiary"). */
  rowAxisLabel?: string
  /** What the columns are, for the mosaic legend heading ("cause code"). */
  colAxisLabel?: string
  /**
   * Print χ², df, P and the driving cell's share. False in a module that has set the table up and
   * not yet run the test.
   */
  showTest?: boolean
  /** [row, col] drawn in the alert colour on every table view. */
  highlight?: readonly [number, number] | null
  /** Significance level for the decision readout. */
  alpha?: number
}

const VIEW_OPTIONS: readonly { value: TwoWayView; label: string }[] = [
  { value: 'observed', label: 'observed' },
  { value: 'expected', label: 'expected' },
  { value: 'contribution', label: 'contributions' },
  { value: 'mosaic', label: 'mosaic' },
]

export function TwoWayVisualiser({
  rowLabels,
  colLabels,
  table,
  result,
  caption,
  ariaLabel,
  defaultLayer = 'observed',
  label = 'INTEL · TWO-WAY TABLE',
  tone = 'intel',
  rowAxisLabel = 'row',
  colAxisLabel = 'column',
  showTest = true,
  highlight = null,
  alpha = 0.05,
}: TwoWayVisualiserProps) {
  const [view, setView] = useState<TwoWayView>(defaultLayer)

  const rowTot = result.rowTotals
  const total = result.total
  const minExpected = Math.min(...result.expected)
  const conditionsHold = result.conditions.every((c) => c.met)

  /** Row-conditional proportions: the mosaic's segment heights, and the table behind it. */
  const conditional = useMemo(() => table.map((row, i) => row.map((v) => (rowTot[i] > 0 ? v / rowTot[i] : 0))), [table, rowTot])

  const biggest = result.largestContributor
  const cols = colLabels.length
  const hotRow = Math.floor(biggest / cols)
  const hotCol = biggest % cols
  const hotShare = result.contributions[biggest] / result.statistic
  const hotObserved = table[hotRow][hotCol]
  const hotExpected = result.expectedTable[hotRow][hotCol]

  /** The two rows whose conditional share of one column is furthest apart, for the mosaic caption. */
  const widestGap = useMemo(() => {
    let best = { col: 0, lo: 0, hi: 0, gap: -1 }
    for (let j = 0; j < cols; j++) {
      const shares = conditional.map((r) => r[j])
      const lo = Math.min(...shares)
      const hi = Math.max(...shares)
      if (hi - lo > best.gap) best = { col: j, lo, hi, gap: hi - lo }
    }
    return best
  }, [conditional, cols])

  const status = showTest ? `χ² ${fmt(result.statistic, 2)} · df ${fmtInt(result.df ?? 0)} · P ${fmtP(result.pValue ?? 1)}` : `${fmtInt(table.length)} × ${fmtInt(cols)} · n ${fmtInt(total)}`

  return (
    <Panel label={label} status={status} tone={tone} led={conditionsHold ? 'on' : 'warn'} ariaLabel={`Two-way table display: ${ariaLabel}`}>
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<TwoWayView> label="view" value={view} onChange={setView} options={VIEW_OPTIONS} />
        </div>

        {view !== 'mosaic' && (
          <MatrixTable
            rowLabels={rowLabels}
            colLabels={colLabels}
            observed={table}
            expected={result.expectedTable}
            contributions={result.contributionTable}
            layer={view}
            highlight={highlight}
            caption={caption}
            ariaLabel={`${ariaLabel} — ${view} values`}
          />
        )}

        {view === 'observed' && (
          <Note>
            Each cell carries the count that was recorded and, under it, the count the margins would
            have produced if the {rowAxisLabel} made no difference to the {colAxisLabel}. The smallest
            expected count in this table is {fmt(minExpected, 2)}.
          </Note>
        )}

        {view === 'expected' && (
          <Note>
            Expected = row total × column total ÷ {fmtInt(total)}. The expected table has the same row
            totals and the same column totals as the observed one, so a set of expected counts that
            breaks a margin has been computed wrongly.
          </Note>
        )}

        {view === 'contribution' && (
          <Note tone="warn">
            Largest contribution: <strong>{rowLabels[hotRow]}</strong> × <strong>{colLabels[hotCol]}</strong>, where {fmtInt(hotObserved)} were recorded
            against {fmt(hotExpected, 2)} expected
            {showTest ? `, carrying ${fmtPct(hotShare, 0)} of the statistic` : ''}.
          </Note>
        )}

        {view === 'mosaic' && (
          <MosaicView rowLabels={rowLabels} colLabels={colLabels} conditional={conditional} rowTotals={rowTot} total={total} rowAxisLabel={rowAxisLabel} colAxisLabel={colAxisLabel} caption={caption} />
        )}

        {view === 'mosaic' && (
          <Note live>
            The widest split is <strong>{colLabels[widestGap.col]}</strong>: {fmtPct(widestGap.hi, 0)} of one {rowAxisLabel} against {fmtPct(widestGap.lo, 0)} of another. Bars that
            break at the same heights are one distribution recorded twice; bars that break at
            different heights are what the statistic is built out of.
          </Note>
        )}

        {showTest && (
          <ReadoutGrid>
            <Readout label="χ²" value={fmt(result.statistic, 2)} tone="intel" live />
            <Readout label="df" value={fmtInt(result.df ?? 0)} size="sm" live />
            <Readout label="P" value={fmtP(result.pValue ?? 1)} tone={(result.pValue ?? 1) < alpha ? 'alert' : 'tactical'} live />
            <Readout label="driving cell" value={`${rowLabels[hotRow]} · ${colLabels[hotCol]}`} size="sm" live />
            <Readout label="its share of χ²" value={fmtPct(hotShare, 0)} size="sm" live />
          </ReadoutGrid>
        )}

        <section aria-label="Conditions">
          <Subhead>Conditions</Subhead>
          <ConditionList conditions={result.conditions} />
          {!conditionsHold && (
            <Note tone="alert">
              The smallest expected count is {fmt(minExpected, 2)}. Below five, the chi-square
              distribution is the wrong reference curve for this statistic, and the P-value a
              calculator prints from it means nothing. Simulate the null instead, or collapse
              categories until every expected count clears five.
            </Note>
          )}
        </section>
      </div>
    </Panel>
  )
}

interface MosaicProps {
  rowLabels: readonly string[]
  colLabels: readonly string[]
  conditional: readonly (readonly number[])[]
  rowTotals: readonly number[]
  total: number
  rowAxisLabel: string
  colAxisLabel: string
  caption?: string
}

/**
 * One bar per row. Bar width is the row's share of n, so a row carrying most of the data is most of
 * the picture; segment heights are that row's own conditional proportions, so two rows drawn from
 * the same distribution break at the same heights whatever their sizes.
 */
function MosaicView({ rowLabels, colLabels, conditional, rowTotals, total, rowAxisLabel, colAxisLabel, caption }: MosaicProps) {
  const frame = useChartFrame({ height: 300, margin: { left: 52, right: 12, top: 12, bottom: 48 } })
  const gap = 10
  const usable = Math.max(frame.innerWidth - gap * (rowLabels.length - 1), 40)

  let x = 0
  const bars = rowLabels.map((rl, i) => {
    const w = total > 0 ? (rowTotals[i] / total) * usable : usable / rowLabels.length
    const left = x
    x += w + gap
    let y = 0
    const segments = conditional[i].map((p, j) => {
      const h = p * frame.innerHeight
      const top = y
      y += h
      return { top, h, p, j }
    })
    return { left, w, segments, label: rl, n: rowTotals[i] }
  })

  const tableRows = rowLabels.map((rl, i) => [rl, fmtInt(rowTotals[i]), ...conditional[i].map((p) => fmtPct(p, 1))])

  return (
    <ChartSurface
      frame={frame}
      ariaLabel={`Mosaic of ${colAxisLabel} by ${rowAxisLabel}. Bar widths are each ${rowAxisLabel}'s share of the ${fmtInt(total)} observations; segment heights are that ${rowAxisLabel}'s own conditional proportions.`}
      description={`Compare the heights at which the bars break. Equal break heights mean the ${colAxisLabel} distribution is the same in every ${rowAxisLabel}, whatever the bar widths.`}
      table={{
        columns: [rowAxisLabel, 'n', ...colLabels.map((c) => `${c} (%)`)],
        rows: tableRows,
        caption: caption ?? `Row-conditional percentages of ${colAxisLabel} within each ${rowAxisLabel}`,
      }}
      footer={<Legend items={colLabels.map((c, j) => ({ label: c, color: seriesColor(j), shape: 'square' as const }))} />}
    >
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={-6} x2={frame.innerWidth} y1={t * frame.innerHeight} y2={t * frame.innerHeight} stroke="var(--dr-line)" strokeWidth={1} />
            <text x={-10} y={t * frame.innerHeight} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--dr-fg-2)" fontFamily="var(--dr-font-mono)">
              {fmtPct(1 - t, 0)}
            </text>
          </g>
        ))}
        {bars.map((bar) => (
          <g key={bar.label}>
            {bar.segments.map((s) => (
              <rect
                key={s.j}
                x={bar.left}
                y={s.top}
                width={bar.w}
                height={Math.max(s.h, 0)}
                fill={seriesColor(s.j)}
                stroke="var(--dr-bg-0)"
                strokeWidth={1.5}
                style={{ transition: 'y var(--dr-dur) var(--dr-ease), height var(--dr-dur) var(--dr-ease)' }}
              >
                <title>{`${bar.label} · ${colLabels[s.j]}: ${fmtPct(s.p, 1)}`}</title>
              </rect>
            ))}
            {bar.segments
              .filter((s) => s.h > 18 && bar.w > 46)
              .map((s) => (
                <text key={`t${s.j}`} x={bar.left + bar.w / 2} y={s.top + s.h / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="var(--dr-bg-0)" fontFamily="var(--dr-font-mono)">
                  {fmtPct(s.p, 0)}
                </text>
              ))}
            <text x={bar.left + bar.w / 2} y={frame.innerHeight + 16} textAnchor="middle" fontSize={11} fill="var(--dr-fg-1)">
              {bar.label}
            </text>
            <text x={bar.left + bar.w / 2} y={frame.innerHeight + 31} textAnchor="middle" fontSize={10} fill="var(--dr-fg-2)" fontFamily="var(--dr-font-mono)">
              n = {fmtInt(bar.n)}
            </text>
          </g>
        ))}
      </g>
    </ChartSurface>
  )
}
