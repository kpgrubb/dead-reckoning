/**
 * TransformConsole — act-2-06 · ENGINEERING · TRANSFORMATION CONSOLE.
 *
 * Choose a dataset (Ledger transit times, or the Bureau's fuel columns) and a model (raw / log y /
 * log x / log–log). The top panel shows the TRANSFORMED variables with the fitted straight line; the
 * bottom panel the residuals on that scale. Readouts give the model in original variables, r², s, n,
 * and a back-transformed prediction at a chosen x. For the transit set, the mean residual in days is
 * split later-lost vs others.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components'
import { DataTable, NumberField, Readout, ReadoutRow, Scatter, Segmented, type ScatterPoint } from '@/instruments/shared'
import { fmt, fmtInt, mean, transformedRegression, type Transform } from '@/lib/stats'
import { ledgerSample, manifest } from './data'
import './act2-b.css'

export type TransformDataset = 'transit' | 'fuel-declared' | 'fuel-required'

interface Row {
  hull: string
  x: number
  y: number
  lost: boolean
}

interface DatasetSpec {
  label: string
  xName: string
  xUnits: string
  yName: string
  yUnits: string
  defaultX: number
  xStep: number
  rows: Row[]
}

const DATASETS: Record<TransformDataset, DatasetSpec> = {
  transit: {
    label: 'Ledger · transit',
    xName: 'Lane length',
    xUnits: 'AU',
    yName: 'time to Mark 9',
    yUnits: 'days',
    defaultX: 4,
    xStep: 0.1,
    rows: ledgerSample.map((r) => ({ hull: r.hull, x: r.laneLengthAU, y: r.t9, lost: r.laterLost })),
  },
  'fuel-declared': {
    label: 'Manifest · fuel on declared',
    xName: 'declared mass',
    xUnits: 't',
    yName: 'fuel loaded',
    yUnits: 't',
    defaultX: 20000,
    xStep: 500,
    rows: manifest.map((d) => ({ hull: d.hull, x: d.declaredMass, y: d.fuelLoaded, lost: d.laterLost })),
  },
  'fuel-required': {
    label: 'Manifest · fuel on required',
    xName: 'required fuel',
    xUnits: 't',
    yName: 'fuel loaded',
    yUnits: 't',
    defaultX: 20000,
    xStep: 500,
    rows: manifest.map((d) => ({ hull: d.hull, x: d.requiredFuel, y: d.fuelLoaded, lost: d.laterLost })),
  },
}

const MODELS: { value: Transform; label: string }[] = [
  { value: 'none', label: 'raw' },
  { value: 'logy', label: 'log y' },
  { value: 'logx', label: 'log x' },
  { value: 'loglog', label: 'log–log' },
]

/** Human-readable model in original variables with the fitted constants substituted. */
function equation(model: Transform, a: number, b: number): string {
  const A = fmt(a, 3)
  const B = fmt(b, 4)
  switch (model) {
    case 'none':
      return `ŷ = ${A} + ${B}·x`
    case 'logx':
      return `ŷ = ${A} + ${B}·log₁₀(x)`
    case 'logy':
      return `ŷ = 10^(${A} + ${B}·x)`
    case 'loglog':
      return `ŷ = 10^${A} · x^${B}`
  }
}

export function TransformConsole({ dataset = 'transit' }: { dataset?: TransformDataset }) {
  const [ds, setDs] = useState<TransformDataset>(dataset)
  const [model, setModel] = useState<Transform>('none')
  const [colourLost, setColourLost] = useState(false)
  const [predictAt, setPredictAt] = useState<number>(DATASETS[dataset].defaultX)

  const spec = DATASETS[ds]
  const fit = useMemo(
    () =>
      transformedRegression(
        spec.rows.map((r) => r.x),
        spec.rows.map((r) => r.y),
        model,
        { base: 10 },
      ),
    [spec, model],
  )
  const logX = model === 'logx' || model === 'loglog'
  const logY = model === 'logy' || model === 'loglog'
  const xLabel = logX ? `log₁₀(${spec.xName})` : `${spec.xName} (${spec.xUnits})`
  const yLabel = logY ? `log₁₀(${spec.yName})` : `${spec.yName} (${spec.yUnits})`

  const topPoints = useMemo<ScatterPoint[]>(() => spec.rows.map((r, i) => ({ x: fit.tx[i], y: fit.ty[i], series: colourLost && r.lost ? 1 : 0, label: r.hull })), [spec, fit, colourLost])
  const residPoints = useMemo<ScatterPoint[]>(() => spec.rows.map((r, i) => ({ x: fit.tx[i], y: fit.residuals[i], series: colourLost && r.lost ? 1 : 0, label: r.hull })), [spec, fit, colourLost])

  const daysResid = useMemo(() => {
    if (ds !== 'transit') return null
    const of = (sel: (r: Row) => boolean) => mean(spec.rows.filter(sel).map((r) => r.y - fit.predict(r.x)))
    return { lost: of((r) => r.lost), others: of((r) => !r.lost) }
  }, [ds, spec, fit])

  const table = useMemo(
    () => ({
      columns: ['hull', `${spec.xName} (${spec.xUnits})`, `${spec.yName} (${spec.yUnits})`, xLabel, yLabel, 'residual (transformed scale)'],
      rows: spec.rows.map((r, i) => [r.hull, r.x, r.y, Number(fit.tx[i].toPrecision(6)), Number(fit.ty[i].toPrecision(6)), Number(fit.residuals[i].toPrecision(6))]),
      caption: `${spec.label} · ${equation(model, fit.fit.intercept, fit.fit.slope)}`,
    }),
    [spec, fit, model, xLabel, yLabel],
  )

  const changeDataset = (v: TransformDataset) => {
    setDs(v)
    setPredictAt(DATASETS[v].defaultX)
  }
  const prediction = fit.predict(predictAt)

  return (
    <Panel label="ENGINEERING · TRANSFORMATION CONSOLE" tone="engineering" led="on" status={`n = ${spec.rows.length}`} ariaLabel="Transformation console: fit a straight line to raw or log-transformed variables and read the residual plot">
      <p className="dr-act2b-note">Pick a model. The panels show the variables the line is actually fitted to; the prediction is back-transformed to original units.</p>
      <div className="dr-controls">
        <Segmented<TransformDataset>
          label="DATASET"
          value={ds}
          onChange={changeDataset}
          options={[
            { value: 'transit', label: 'transit' },
            { value: 'fuel-declared', label: 'fuel · declared' },
            { value: 'fuel-required', label: 'fuel · required' },
          ]}
        />
        <Segmented<Transform> label="MODEL" value={model} onChange={setModel} options={MODELS} />
        <label className="dr-act2b-check">
          <input type="checkbox" checked={colourLost} onChange={(e) => setColourLost(e.target.checked)} />
          COLOUR LATER-LOST
        </label>
      </div>

      <div className="dr-act2b-stack">
        <Scatter
          points={topPoints}
          line={{ slope: fit.fit.slope, intercept: fit.fit.intercept }}
          xLabel={xLabel}
          yLabel={yLabel}
          height={300}
          ariaLabel={`${spec.yName} against ${spec.xName}${logX || logY ? ', transformed' : ''}, with the fitted line`}
          description={`Scatter of ${yLabel} against ${xLabel} for ${spec.rows.length} rows with the least-squares line on that scale.${colourLost ? ' Later-lost hulls are coloured separately.' : ''}`}
        />
        <Scatter
          points={residPoints}
          hReferences={[{ y: 0, label: '0' }]}
          xLabel={xLabel}
          yLabel="residual (transformed scale)"
          height={220}
          ariaLabel={`Residual plot on the ${logX || logY ? 'transformed' : 'raw'} scale against ${xLabel}`}
          description="Residuals of the fitted line on the scale it was fitted on. A bow means the straight line is the wrong shape; a flat band means the transformation worked."
        />
      </div>

      <ReadoutRow>
        <Readout label="MODEL" value={equation(model, fit.fit.intercept, fit.fit.slope)} tone="engineering" size="sm" live />
        <Readout label="r²" value={fmt(fit.r2, 3)} size="sm" live />
        <Readout label="s (TRANSFORMED SCALE)" value={fmt(fit.fit.s, 4)} size="sm" />
        <Readout label="n" value={fmtInt(fit.fit.n)} size="sm" />
      </ReadoutRow>
      <div className="dr-controls">
        <NumberField label="PREDICT AT x =" value={predictAt} onChange={setPredictAt} step={spec.xStep} min={0} units={spec.xUnits} />
        <Readout label={`PREDICTED ${spec.yName.toUpperCase()}`} value={fmt(prediction, 1)} units={spec.yUnits} tone="engineering" live />
      </div>
      {daysResid && (
        <ReadoutRow>
          <Readout label="MEAN RESIDUAL (DAYS) · LATER-LOST" value={fmt(daysResid.lost, 2)} units="d" tone="alert" size="sm" live />
          <Readout label="MEAN RESIDUAL (DAYS) · OTHERS" value={fmt(daysResid.others, 2)} units="d" size="sm" live />
        </ReadoutRow>
      )}
      <div className="visually-hidden">
        <DataTable columns={table.columns} rows={table.rows} caption={table.caption} />
      </div>
    </Panel>
  )
}
