/**
 * Shared instrument primitives — themed, accessible D3+React chart building blocks.
 * See README.md in this folder for props and usage.
 */
import './shared.css'

export { Histogram, type HistogramProps } from './Histogram'
export { Dotplot, type DotplotProps } from './Dotplot'
export { Boxplot, type BoxplotProps, type BoxGroup } from './Boxplot'
export { Scatter, type ScatterProps, type ScatterPoint } from './Scatter'
export { DensityCurve, type DensityCurveProps, type Curve, type ShadeRegion } from './DensityCurve'
export { BarChart, type BarChartProps } from './BarChart'
export { XAxis, YAxis, BandAxis, ReferenceLine, HReferenceLine } from './Axis'
export { useChartFrame, ChartSurface, PlotClip, type ChartFrame, type Margin, type UseChartFrameOptions } from './frame'
export { DataTable, type DataTableProps, type TableRows } from './DataTable'
export { Slider, NumberField, Segmented, Readout, ReadoutRow, Legend, type SliderProps, type NumberFieldProps, type SegmentedProps, type SegmentedOption, type ReadoutProps, type LegendItem } from './controls'
export { computeBins, binWithEdges, boxplotStats, boxStatsFrom, stackDots, leastSquares, sampleCurve, barLayout, padDomain, niceTicks, sturges, fmtTick, type Bin, type BoxStats, type DotStack, type LeastSquares, type BarLayout } from './geometry'
export { chartTheme, seriesColor, seriesScale, semanticColor, resolveToken, invalidateTokenCache, motionDuration, type SemanticColor } from '@/design/chart-theme'
