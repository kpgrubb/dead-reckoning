/**
 * <Plot spec={…}> — themed chart from a DisplaySpec, rendered with the shared D3 primitives.
 *
 * Implements every `kind` in src/lib/problems/types.ts: dotplot, histogram, boxplot, scatter
 * (optional least-squares line, computed locally for display), residual, normal (density with a
 * shaded interval), table, bar. ALWAYS emits an accessible data-table fallback (visually hidden
 * unless `showTable`).
 */
import { useMemo } from 'react'
import type { DisplaySpec } from '@/lib/problems/types'
import { Panel, type PanelTone } from './Panel'
import { Histogram, Dotplot, Boxplot, Scatter, DensityCurve, BarChart, DataTable, fmtTick } from '@/instruments/shared'

export interface PlotProps {
  spec: DisplaySpec
  label?: string
  /** Ship-system framing. */
  tone?: PanelTone
  width?: number
  height?: number
  showTable?: boolean
  /** Accessible description of what the chart shows (required for screen readers). */
  description: string
}

const KIND_LABEL: Record<DisplaySpec['kind'], string> = {
  dotplot: 'DOTPLOT',
  histogram: 'HISTOGRAM',
  boxplot: 'BOXPLOT',
  scatter: 'SCATTERPLOT',
  residual: 'RESIDUAL PLOT',
  normal: 'NORMAL MODEL',
  table: 'DATA',
  bar: 'BAR CHART',
}

function normalPdf(mean: number, sd: number) {
  const k = 1 / (sd * Math.sqrt(2 * Math.PI))
  return (x: number) => {
    const z = (x - mean) / sd
    return k * Math.exp(-0.5 * z * z)
  }
}

function Chart({ spec, height, description, showTable }: { spec: DisplaySpec; height?: number; description: string; showTable: boolean }) {
  switch (spec.kind) {
    case 'dotplot':
      return <Dotplot values={spec.values} label={spec.label} height={height ?? 200} ariaLabel={description} showTable={showTable} />
    case 'histogram':
      return <Histogram values={spec.values} binWidth={spec.binWidth} label={spec.label} height={height ?? 260} ariaLabel={description} showTable={showTable} />
    case 'boxplot':
      return <Boxplot groups={spec.groups} label={spec.label} height={height} ariaLabel={description} showTable={showTable} />
    case 'scatter':
      return <Scatter points={spec.points} xLabel={spec.xLabel} yLabel={spec.yLabel} fitLine={!!spec.fitLine} height={height ?? 300} ariaLabel={description} showTable={showTable} />
    case 'residual':
      return (
        <Scatter
          points={spec.points.map((p) => ({ x: p.x, y: p.resid }))}
          xLabel={spec.xLabel}
          yLabel="residual"
          yDomain={symmetricDomain(spec.points.map((p) => p.resid))}
          hReferences={[{ y: 0 }]}
          color="var(--dr-chart-residual)"
          height={height ?? 240}
          ariaLabel={description}
          showTable={showTable}
        />
      )
    case 'normal': {
      const { mean, sd, shade } = spec
      const domain: [number, number] = [mean - 4 * sd, mean + 4 * sd]
      const refs = [{ x: mean, label: `μ = ${fmtTick(mean)}`, color: 'reference' as const }]
      return (
        <DensityCurve
          curves={{ pdf: normalPdf(mean, sd), label: `N(${fmtTick(mean)}, ${fmtTick(sd)})` }}
          domain={domain}
          shade={shade ? [{ from: Math.max(domain[0], shade.from), to: Math.min(domain[1], shade.to), label: `${fmtTick(shade.from)} → ${fmtTick(shade.to)}` }] : undefined}
          references={refs}
          xLabel={`μ = ${fmtTick(mean)}, σ = ${fmtTick(sd)}`}
          height={height ?? 220}
          ariaLabel={description}
          showTable={showTable}
        />
      )
    }
    case 'bar':
      return <BarChart categories={spec.categories} values={spec.counts} label={spec.label} height={height} ariaLabel={description} showTable={showTable} />
    case 'table':
      return null
  }
}

function symmetricDomain(vals: number[]): [number, number] {
  const m = Math.max(1e-9, ...vals.map((v) => Math.abs(v)))
  return [-m * 1.15, m * 1.15]
}

export function Plot({ spec, label, tone = 'sensor', height, showTable = false, description }: PlotProps) {
  const tableSpec = useMemo(() => (spec.kind === 'table' ? { columns: spec.columns, rows: spec.rows } : null), [spec])
  if (spec.kind === 'table' && tableSpec) {
    return (
      <Panel label={label ?? KIND_LABEL.table} tone={tone} className="dr-plot dr-plot--table" ariaLabel={description}>
        <div className="dr-plot__tablewrap">
          <DataTable columns={tableSpec.columns} rows={tableSpec.rows} caption={description} className="dr-plot__table" />
        </div>
      </Panel>
    )
  }
  return (
    <Panel label={label ?? KIND_LABEL[spec.kind]} tone={tone} className={`dr-plot dr-plot--${spec.kind}`} led="on">
      <Chart spec={spec} height={height} description={description} showTable={showTable} />
    </Panel>
  )
}
