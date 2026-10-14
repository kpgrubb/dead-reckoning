/**
 * INTEL · RESIDUAL DIAGNOSTICS (act-9-01, and reused by 9-02 and 9-03) — the same nineteen points,
 * three ways, with the LINE conditions judged on the residuals in front of you.
 *
 *   scatter    the fit itself: y against x with the least-squares line drawn through it.
 *   residual   residual against fitted value, with zero. Curve, fan and outlier all live here.
 *   normal     the ordered residuals against the z each would sit at if they were Normal, with the
 *              quartile line drawn through them.
 *
 * What the learner does: switches the view and watches nineteen points that have not moved say
 * three different things, and picks a hull out of the strip below the chart to follow it across all
 * three. The point of the instrument is that no view is of the response: Normal and Equal SD are
 * conditions on what is left over, and a learner who checks them on the fuel column is checking the
 * wrong distribution.
 *
 * The fit is passed in whole. `RegressionFit` carries `fitted` and `residuals` but not the sample,
 * so x is recovered from the fit itself — xᵢ = (ŷᵢ − a)/b — and y from ŷᵢ + eᵢ. Every judgement
 * number comes from `@/lib/stats` (`correlation`, `outliers`, `skewness`, `quartiles`, `normal`) or
 * from `residualSdRatio` / `normalProbabilityPoints` in `./data`.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Readout, Scatter, Segmented } from '@/instruments/shared'
import { correlation, fmt, fmtInt, mean, normal, outliers, quartiles, skewness, type Condition, type RegressionFit } from '@/lib/stats'
import { normalProbabilityPoints, residualSdRatio } from './data'
import { ConditionList, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export type ResidualView = 'scatter' | 'residual' | 'normal'

const VIEWS: readonly { value: ResidualView; label: string }[] = [
  { value: 'scatter', label: 'the fit' },
  { value: 'residual', label: 'residual plot' },
  { value: 'normal', label: 'normal probability plot' },
]

/** |correlation between the residuals and the squared distance from the middle| above this curves. */
const CURVE_LIMIT = 0.5
/** Residual SD in the upper half over the lower half: outside this band the plot fans. */
const FAN_LIMIT = 2

export interface ResidualDiagnosticsProps {
  fit: RegressionFit
  xLabel: string
  yLabel: string
  label?: string
  caption?: string
  ariaLabel?: string
  pointLabels?: readonly string[]
  /** Which view opens first. Default 'scatter'. */
  initialView?: ResidualView
  tone?: PanelTone
}

export function ResidualDiagnostics({
  fit,
  xLabel,
  yLabel,
  label = 'INTEL · RESIDUAL DIAGNOSTICS',
  caption,
  ariaLabel = 'Residual diagnostics: the fit, the residual plot and the normal probability plot for the same points',
  pointLabels,
  initialView = 'scatter',
  tone = 'intel',
}: ResidualDiagnosticsProps) {
  const [view, setView] = useState<ResidualView>(initialView)
  const [selected, setSelected] = useState<number | null>(null)

  /** The sample, recovered from the fit: xᵢ = (ŷᵢ − a)/b, yᵢ = ŷᵢ + eᵢ. */
  const sample = useMemo(() => {
    const flat = Math.abs(fit.slope) < 1e-12
    return fit.fitted.map((yhat, i) => ({
      x: flat ? i : (yhat - fit.intercept) / fit.slope,
      y: yhat + fit.residuals[i],
      fitted: yhat,
      residual: fit.residuals[i],
      name: pointLabels?.[i] ?? `point ${i + 1}`,
    }))
  }, [fit, pointLabels])

  /** Indices in residual order — the normal probability plot's own ordering. */
  const order = useMemo(() => fit.residuals.map((_, i) => i).sort((i, j) => fit.residuals[i] - fit.residuals[j]), [fit.residuals])
  const normalPoints = useMemo(() => normalProbabilityPoints(fit), [fit])

  /** The quartile line: through (z₂₅, Q1) and (z₇₅, Q3) of the residuals. */
  const quartileLine = useMemo(() => {
    const { q1, q3 } = quartiles(fit.residuals)
    const z25 = normal.quantile(0.25)
    const z75 = normal.quantile(0.75)
    const slope = (q3 - q1) / (z75 - z25)
    return { slope, intercept: q1 - slope * z25 }
  }, [fit.residuals])

  // ── the four conditions, each with the number that decides it ────────────────────────────────
  const centre = useMemo(() => mean(fit.fitted), [fit.fitted])
  const curvature = useMemo(() => correlation(fit.fitted.map((f) => (f - centre) * (f - centre)), fit.residuals), [fit.fitted, fit.residuals, centre])
  const fanRatio = useMemo(() => residualSdRatio(fit), [fit])
  const residualOutliers = useMemo(() => outliers(fit.residuals), [fit.residuals])
  const residualSkew = useMemo(() => (fit.residuals.length >= 3 ? skewness(fit.residuals) : 0), [fit.residuals])

  const curves = Math.abs(curvature) > CURVE_LIMIT
  const fans = fanRatio > FAN_LIMIT || fanRatio < 1 / FAN_LIMIT
  const normalOk = residualOutliers.values.length === 0 && Math.abs(residualSkew) <= 1

  const conditions: Condition[] = [
    {
      name: 'Linear',
      met: !curves,
      detail: `r² = ${fmt(fit.r2, 3)}, and the residuals against the squared distance from the middle of the fitted range correlate at ${fmt(curvature, 2)} — ${curves ? 'a bend the straight line is not following' : 'no bend left over'}.`,
    },
    {
      name: 'Independent',
      met: true,
      assumed: true,
      detail: 'Stated: separate departures, separate hulls, separate certifications. Nothing in a residual plot can check this.',
    },
    {
      name: 'Normal residuals',
      met: normalOk,
      detail: `${fmtInt(residualOutliers.values.length)} residual(s) beyond the 1.5 × IQR fences (${fmt(residualOutliers.lowFence, 3)} to ${fmt(residualOutliers.highFence, 3)}), skewness ${fmt(residualSkew, 2)} on ${fmtInt(fit.n)} points. Read the normal probability plot, never the response.`,
    },
    {
      name: 'Equal SD',
      met: !fans,
      detail: `Residual SD in the upper half of the fitted range over the lower half = ${fmt(fanRatio, 2)} — ${fans ? 'the spread changes across the range, so the plot fans' : 'no strong fanning'}.`,
    },
  ]

  const highlightIndex = view === 'normal' ? (selected === null ? undefined : order.indexOf(selected)) : (selected ?? undefined)
  const chosen = selected === null ? null : sample[selected]

  const scatterPoints = sample.map((p) => ({ x: p.x, y: p.y, label: p.name }))
  const residualPoints = sample.map((p) => ({ x: p.fitted, y: p.residual, label: p.name }))
  const normalPlotPoints = normalPoints.map((p, i) => ({ x: p.x, y: p.y, label: sample[order[i]].name }))

  const descriptions: Record<ResidualView, string> = {
    scatter:
      `${fmtInt(fit.n)} points of ${yLabel} against ${xLabel} with the least-squares line ŷ = ${fmt(fit.intercept, 4)} + ${fmt(fit.slope, 5)}x drawn through them. ` +
      `r = ${fmt(fit.r, 3)}, r² = ${fmt(fit.r2, 3)}, s = ${fmt(fit.s, 5)}. The data table lists every point with its predicted value and residual.`,
    residual:
      `${fmtInt(fit.n)} residuals against their fitted values, with a horizontal line at zero. The residuals run from ${fmt(Math.min(...fit.residuals), 4)} to ${fmt(Math.max(...fit.residuals), 4)}; ` +
      `their spread in the upper half of the fitted range is ${fmt(fanRatio, 2)} times their spread in the lower half, and ${fmtInt(residualOutliers.values.length)} lie beyond the 1.5 × IQR fences. ` +
      `A curve here would fail the Linear condition and a fan would fail Equal SD.`,
    normal:
      `${fmtInt(fit.n)} residuals sorted smallest to largest against the standard Normal score each would sit at if the residuals were Normal, with the line through the first and third quartile pairs. ` +
      `Skewness is ${fmt(residualSkew, 2)}. Points close to that line support the Normal condition; a bend at either end does not.`,
  }

  return (
    <Panel
      label={label}
      status={`n = ${fmtInt(fit.n)} · r² ${fmt(fit.r2, 3)} · s ${fmt(fit.s, fit.s < 0.01 ? 5 : 3)}`}
      tone={tone}
      led={conditions.every((c) => c.met) ? 'on' : 'warn'}
      ariaLabel={ariaLabel}
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<ResidualView> label="display" value={view} options={VIEWS} onChange={setView} />
        </div>

        {view === 'scatter' && (
          <Scatter
            points={scatterPoints}
            line={{ slope: fit.slope, intercept: fit.intercept }}
            highlight={highlightIndex}
            xLabel={xLabel}
            yLabel={yLabel}
            height={300}
            ariaLabel={`Scatterplot of ${yLabel} against ${xLabel} with the least-squares line`}
            description={descriptions.scatter}
          />
        )}
        {view === 'residual' && (
          <Scatter
            points={residualPoints}
            hReferences={[{ y: 0, label: 'residual = 0' }]}
            highlight={highlightIndex}
            xLabel={`fitted ${yLabel}`}
            yLabel="residual"
            height={300}
            ariaLabel={`Residual plot: residuals against fitted ${yLabel}, with a reference line at zero`}
            description={descriptions.residual}
          />
        )}
        {view === 'normal' && (
          <Scatter
            points={normalPlotPoints}
            line={quartileLine}
            highlight={highlightIndex}
            xLabel="theoretical z (Blom plotting position)"
            yLabel="ordered residual"
            height={300}
            ariaLabel="Normal probability plot: the ordered residuals against their theoretical Normal scores, with the quartile line"
            description={descriptions.normal}
          />
        )}

        {caption && <Note>{caption}</Note>}

        <section aria-label="Follow one hull across the three views">
          <Subhead>Follow one point</Subhead>
          <div className="dr-controls" role="group" aria-label="Follow one point across the three views">
            {sample.map((p, i) => (
              <button
                key={i}
                type="button"
                className="dr-btn dr-btn--ghost dr-btn--sm"
                aria-pressed={selected === i}
                style={selected === i ? { color: 'var(--dr-fg-0)', borderColor: 'var(--dr-violet)' } : undefined}
                onFocus={() => setSelected(i)}
                onMouseEnter={() => setSelected(i)}
                onClick={() => setSelected(selected === i ? null : i)}
              >
                {p.name}
              </button>
            ))}
          </div>
          <ReadoutGrid>
            <Readout label="point" value={chosen ? chosen.name : '—'} tone="intel" size="sm" live />
            <Readout label={xLabel} value={chosen ? fmt(chosen.x, 3) : '—'} size="sm" live />
            <Readout label={yLabel} value={chosen ? fmt(chosen.y, 4) : '—'} size="sm" live />
            <Readout label="fitted" value={chosen ? fmt(chosen.fitted, 4) : '—'} size="sm" live />
            <Readout label="residual" value={chosen ? fmt(chosen.residual, 4) : '—'} tone={chosen && Math.abs(chosen.residual) > residualOutliers.highFence ? 'alert' : 'default'} size="sm" live />
          </ReadoutGrid>
        </section>

        <section aria-label="Conditions for slope inference">
          <Subhead>LINE, judged on the residuals</Subhead>
          <ConditionList conditions={conditions} />
          <Note tone={conditions.every((c) => c.met) ? 'muted' : 'warn'} live>
            Not one of these four is a statement about {yLabel}. Linear and Equal SD are read off the residual plot, Normal off the normal probability plot, and Independent off how the data
            were collected. A histogram of the response answers none of them.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
