# Shared instrument primitives

Themed, accessible D3 + React chart building blocks for Act instruments. Import from `@/instruments/shared`.

Every chart primitive:

- takes `ariaLabel` (required) and optional `description`, renders `role="img"` and a **visually-hidden data table** (`showTable` makes it visible);
- uses tokens only (`var(--dr-…)`) — re-themes live between default and high contrast;
- follows the container width via `ResizeObserver` (320–960px+); height is fixed by prop so the page never reflows;
- honours motion tokens: mark geometry transitions use `--dr-dur*`, which are 0ms under reduced motion (marks jump);
- bins/aggregates before drawing; `Dotplot`/`Scatter` switch to **canvas** above `chartTheme.canvasThreshold` (2,000 points). `Histogram` is always one `<rect>` per bin.

Colour semantics (from `src/design/chart-theme.ts`): `seriesColor(i)` for categorical series (slots 1–4 are the validated categorical set; slot 5, steel, is the neutral/reference slot); `semanticColor('null' | 'alt' | 'rejected' | 'fit' | 'residual' | 'reference' | 'observed' | 'shade' | 'shadeAlt' | 'shadeRejected' | 'shadeCaution')` when the meaning is known. **Text never wears a series colour.**

The stats source of truth is `@/lib/stats`. The helpers in `geometry.ts` lay out marks; pass precomputed numbers in (e.g. `Boxplot.groups[].stats`, `Scatter.line`) when the course already computed them.

---

## Histogram

```tsx
<Histogram
  values={results}            // number[] — binned internally (5,000+ is fine)
  binWidth={0.5}              // or bins={12}; omitted → Sturges + nice step
  label="mean fix error (km)" // x-axis title
  density                     // area = 1 (needed to overlay a pdf)
  curve={(x) => normalPdf(x, mu, sigma)} curveLabel="N(μ, σ)"
  references={[{ x: observed, label: 'observed', color: 'observed' }]}
  highlight={{ from: crit, to: Infinity, color: 'rejected', label: 'rejection region' }}
  barsLabel="simulated means"  // legend label for the bars (legend appears when a curve/highlight is present)
  ariaLabel="…" description="…" showTable
  onHoverBin={(bin) => …}
/>
```

Props: `values`, `binWidth?`, `bins?`, `domain?`, `label?`, `density?`, `curve?`, `curveLabel?`, `references?`, `highlight?`, `barsLabel?`, `color?`, `height=260`, `ariaLabel`, `description?`, `showTable?`, `onHoverBin?`, `className?`.

## Dotplot

```tsx
const [vals, setVals] = useState(data)
<Dotplot values={vals} onValuesChange={setVals} step={0.1} label="fix error (km)"
         highlight={outlierIndices} references={[{ x: mean(vals), label: 'mean', color: 'reference' }]}
         ariaLabel="…" />
```

Drag dots (pointer) or focus a dot and use ← → (Shift ×10). `highlight` indices draw in the `rejected` colour (override with `highlightColor`). Props: `values`, `label?`, `domain?`, `radius=4`, `color?`, `highlight?`, `highlightColor?`, `references?`, `onValuesChange?`, `step?`, `height=200`, `ariaLabel`, `description?`, `showTable?`.

## Boxplot

```tsx
<Boxplot groups={[{ name: 'Corridor A', values: a }, { name: 'Corridor B', stats: fiveNumberFromStatsLib }]}
         label="fix error (km)" showFences showPoints ariaLabel="…" />
```

Horizontal, one row per group. Quartiles use the AP/TI-84 convention when computed from `values`; pass `stats` (`{min,q1,median,q3,max,outliers?,whiskerLo?,whiskerHi?}`) to draw exactly what `@/lib/stats` produced. Outliers (1.5×IQR) are hollow red dots. Props: `groups`, `label?`, `domain?`, `showPoints?`, `showFences?`, `references?`, `height?`, `ariaLabel`, `description?`, `showTable?`.

## Scatter

```tsx
const [pts, setPts] = useState(points)
<Scatter points={pts} onPointsChange={setPts} fitLine residuals
         xLabel="declared cargo mass (t)" yLabel="fuel burn (kg)"
         onFit={(fit) => setR(fit?.r)} ariaLabel="…" />
```

`fitLine` draws a locally computed least-squares line (display only); pass `line={{ slope, intercept }}` from `@/lib/stats` to draw the course's fit instead. `residuals` draws amber segments to the line. `hReferences={[{ y: 0 }]}` for residual plots. Drag points or focus + arrow keys. Points may carry `series` (0–4) for colour and `label`. Props: `points`, `xLabel?`, `yLabel?`, `xDomain?`, `yDomain?`, `fitLine?`, `line?`, `residuals?`, `onPointsChange?`, `onFit?`, `highlight?`, `hReferences?`, `color?`, `radius=4`, `height=300`, `ariaLabel`, `description?`, `showTable?`.

## DensityCurve

```tsx
<DensityCurve
  curves={[{ pdf: (x) => normalPdf(x, 0, 1), label: 'null', color: 'null', dashed: true },
           { pdf: (x) => normalPdf(x, 1.6, 1), label: 'alternative', color: 'alt' }]}
  domain={[-4, 5.5]}
  shade={[{ from: 1.96, to: 5.5, color: 'shadeRejected', label: 'α' },
          { from: -4, to: 1.96, curve: 1, color: 'shadeAlt', label: 'β' }]}
  references={[{ x: 1.96, label: 'z* = 1.96' }]}
  xLabel="z" ariaLabel="…" />
```

Any `pdf(x)` (normal, t, χ², …). A single curve may be passed as an object. Legend renders below the plot when there are ≥ 2 curves or labelled shades. Props: `curves`, `domain`, `shade?`, `references?`, `xLabel?`, `yAxis?`, `samples=200`, `height=240`, `ariaLabel`, `description?`, `showTable?`.

## BarChart

```tsx
<BarChart categories={['ore', 'volatiles']} values={[41, 28]} expected={[35, 30]} highlight={[0]}
          label="cargo category" valueLabel="count" horizontal={false} ariaLabel="…" />
```

Bars are capped at 28px thick with a 2px surface gap; `expected` draws a steel marker per category (χ² displays); `highlight` paints bars in the observed colour. `horizontal` for long labels. Props: `categories`, `values`, `expected?`, `colors?`, `highlight?`, `label?`, `valueLabel?`, `horizontal?`, `showValues?`, `height?`, `ariaLabel`, `description?`, `showTable?`.

---

## Composition helpers

- `useChartFrame({ height, margin?, yLabel?, minWidth?, maxWidth? })` → `{ ref, width, height, innerWidth, innerHeight, margin, id }`. Attach `ref` to the measured container (done for you by `ChartSurface`).
- `<ChartSurface frame ariaLabel description? table? showTable? underlay? overlay? footer?>` — the wrapper: SVG + optional canvas underlay + HTML overlay + legend footer + hidden table. Children are SVG nodes; translate by `frame.margin` yourself.
- `<PlotClip frame>` — clips marks to the inner box.
- `<XAxis scale height ticks? label? grid?>`, `<YAxis scale width ticks? label? grid? bare?>`, `<BandAxis scale height label?>`, `<ReferenceLine x height label? color? dashed? anchor?>`, `<HReferenceLine y width label?>`.
- `<DataTable columns rows caption? maxRows?>`.

```tsx
function MyInstrument({ data }) {
  const frame = useChartFrame({ height: 240 })
  const x = scaleLinear().domain([0, 1]).range([0, frame.innerWidth])
  const y = scaleLinear().domain([0, 10]).range([frame.innerHeight, 0])
  return (
    <ChartSurface frame={frame} ariaLabel="…" table={{ columns: ['x', 'y'], rows: data }}>
      <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
        <YAxis scale={y} width={frame.innerWidth} />
        <PlotClip frame={frame}>{/* marks */}</PlotClip>
        <XAxis scale={x} height={frame.innerHeight} label="x" />
      </g>
    </ChartSurface>
  )
}
```

## Controls & readouts

- `<Slider label value min max step? units? onChange format? showRange?>` — range input with label and live value readout.
- `<NumberField label value onChange min? max? step? units? stepper?>` — mono numeric field with −/+ steppers; ↑/↓ nudge (Shift ×10); Enter/blur commits.
- `<Segmented label value options onChange>` — radio-group semantics (`role="radiogroup"`), arrow keys move selection.
- `<Readout label value units? tone? size? stale? live?>` and `<ReadoutRow>` — mono numeric display; `tone` colours the value (tactical/sensor/engineering/intel/log/alert); `live` announces changes.
- `<Legend items>` — `{ label, color, shape?: 'square'|'line'|'dashed'|'dot'|'area', value?, muted? }[]`.

Wrap controls in `<div className="dr-controls">` for the standard row layout.

## Pure helpers (`geometry.ts`, unit-tested)

`computeBins(values, { binWidth?, bins?, domain? })`, `binWithEdges(values, edges)`, `boxplotStats(values)`, `boxStatsFrom(partial)`, `stackDots(values, x, diameter)`, `leastSquares(points)`, `sampleCurve(pdf, domain, n)`, `barLayout(n, size, opts)`, `padDomain([lo, hi], frac)`, `niceTicks(lo, hi, count)`, `sturges(n)`, `fmtTick(v)`.

## Canvas and theme changes

Canvas renderers resolve tokens with `resolveToken('var(--dr-series-1)')`, cached per element. If an instrument redraws canvas after a theme switch, call `invalidateTokenCache()` first (the SVG paths re-theme automatically). `motionDuration('--dr-dur')` returns the current duration in ms (0 under reduced motion) for any imperative D3 transitions.
