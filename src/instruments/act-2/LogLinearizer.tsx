/**
 * LogLinearizer — the calc refresher behind transformations (content/calc/logs-and-linearization.mdx).
 *
 * View 1 · POWER LAW: y = a·x^b drawn on linear axes and on log–log axes; the learner sets b and watches
 * the curve become a straight line whose slope is b. Sample points from the Ledger geometry (t9 ∝ √d).
 * View 2 · WHY LOG COMPRESSES: ln x with a draggable tangent; its slope is 1/x, so equal multiplicative
 * steps in x become equal additive steps in ln x — the far end of the axis is squeezed.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components'
import { ChartSurface, PlotClip, Slider, Segmented, Readout, ReadoutRow, Legend, XAxis, YAxis, useChartFrame, chartTheme, semanticColor } from '@/instruments/shared'
import { linearRegression, fmt } from '@/lib/stats'
import { scheduledT9 } from './data'

type View = 'power' | 'tangent'
type Axes = 'linear' | 'loglog'

/** The Lane's own law: scheduled time to Mark 9 at 2.4 … 8 AU (a = 0.75·2√(d/a_nom)·… ⇒ t = k·d^0.5). */
const DS = [2.4, 3.0, 3.33, 4.0, 5.0, 6.0, 7.0, 8.0]
const T9 = DS.map(scheduledT9)

export function LogLinearizer() {
  const [view, setView] = useState<View>('power')
  const [axes, setAxes] = useState<Axes>('linear')
  const [b, setB] = useState(0.8)
  const [x0, setX0] = useState(2.0)

  // Fit through the Lane's points to get a: log t = log a + 0.5·log d, so the "true" curve is k·d^0.5.
  const laneFit = useMemo(() => linearRegression(DS.map(Math.log10), T9.map(Math.log10)), [])
  const a = 10 ** laneFit.intercept

  const frame = useChartFrame({ height: 260, yLabel: true })

  // ---- View 1 scales ----
  const xDom: [number, number] = axes === 'linear' ? [2, 8.4] : [Math.log10(2), Math.log10(8.4)]
  const yMaxLin = Math.max(a * 8.4 ** Math.max(b, 0.5), ...T9) * 1.08
  const yDom: [number, number] = axes === 'linear' ? [0, yMaxLin] : [Math.log10(40), Math.log10(yMaxLin)]
  const x = useMemo(() => scaleLinear().domain(xDom).range([0, frame.innerWidth]), [xDom[0], xDom[1], frame.innerWidth]) // eslint-disable-line react-hooks/exhaustive-deps
  const y = useMemo(() => scaleLinear().domain(yDom).range([frame.innerHeight, 0]), [yDom[0], yDom[1], frame.innerHeight]) // eslint-disable-line react-hooks/exhaustive-deps
  const tx = (v: number) => (axes === 'linear' ? v : Math.log10(v))
  const ty = (v: number) => (axes === 'linear' ? v : Math.log10(v))

  const candidate = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 100; i++) {
      const d = 2 + (6.4 * i) / 100
      pts.push(`${i ? 'L' : 'M'}${x(tx(d))},${y(ty(a * d ** b))}`)
    }
    return pts.join('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, axes, x, y])

  // ---- View 2: ln x with tangent ----
  const lx = useMemo(() => scaleLinear().domain([0.5, 12]).range([0, frame.innerWidth]), [frame.innerWidth])
  const ly = useMemo(() => scaleLinear().domain([-0.8, 2.6]).range([frame.innerHeight, 0]), [frame.innerHeight])
  const lnPath = useMemo(() => {
    const pts: string[] = []
    for (let i = 0; i <= 120; i++) {
      const v = 0.5 + (11.5 * i) / 120
      pts.push(`${i ? 'L' : 'M'}${lx(v)},${ly(Math.log(v))}`)
    }
    return pts.join('')
  }, [lx, ly])
  const tanSlope = 1 / x0
  const tanPath = `M${lx(Math.max(0.5, x0 - 2))},${ly(Math.log(x0) + tanSlope * (Math.max(0.5, x0 - 2) - x0))}L${lx(Math.min(12, x0 + 2))},${ly(Math.log(x0) + tanSlope * (Math.min(12, x0 + 2) - x0))}`

  const powerTable = { columns: ['Lane length d (AU)', 'scheduled t9 (d)', axes === 'linear' ? 'candidate a·d^b' : 'log10 d', axes === 'linear' ? '' : 'log10 t9'].filter(Boolean), rows: DS.map((d, i) => (axes === 'linear' ? [d, Number(T9[i].toFixed(1)), Number((a * d ** b).toFixed(1))] : [d, Number(T9[i].toFixed(1)), Number(Math.log10(d).toFixed(3)), Number(Math.log10(T9[i]).toFixed(3))])), caption: 'Ledger geometry: t9 = 0.75·2√(d/a)' }
  const lnTable = { columns: ['x', 'ln x', 'slope 1/x'], rows: [1, 2, 4, 8].map((v) => [v, Number(Math.log(v).toFixed(3)), Number((1 / v).toFixed(3))]), caption: 'Equal ratios in x become equal steps in ln x' }

  return (
    <Panel label="ENGINEERING · LOGS AND LINES" status="CALC REFRESHER" tone="engineering" led="on">
      <div className="dr-controls">
        <Segmented<View> label="view" value={view} options={[{ value: 'power', label: 'power law' }, { value: 'tangent', label: 'why log compresses' }]} onChange={setView} />
        {view === 'power' && <Segmented<Axes> label="axes" value={axes} options={[{ value: 'linear', label: 'linear' }, { value: 'loglog', label: 'log–log' }]} onChange={setAxes} />}
        {view === 'power' && <Slider label="candidate exponent b" value={b} min={0.2} max={1.4} step={0.01} onChange={setB} format={(v) => fmt(v, 2)} />}
        {view === 'tangent' && <Slider label="tangent at x" value={x0} min={0.6} max={11} step={0.1} onChange={setX0} format={(v) => fmt(v, 1)} />}
      </div>
      {view === 'power' ? (
        <>
          <ChartSurface frame={frame} ariaLabel={`Scheduled time to Mark 9 against Lane length on ${axes === 'linear' ? 'linear' : 'log–log'} axes, with a candidate power-law curve of exponent ${fmt(b, 2)}`} description="The Lane's points follow t = a·d^0.5. On log–log axes they lie on a straight line of slope 0.5; a candidate curve with the wrong exponent becomes a line of the wrong slope." table={powerTable}>
            <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
              <YAxis scale={y} width={frame.innerWidth} ticks={4} label={axes === 'linear' ? 'time to Mark 9 (d)' : 'log10 t9'} />
              <PlotClip frame={frame}>
                <path d={candidate} fill="none" stroke={semanticColor('residual')} strokeWidth={2} strokeDasharray={chartTheme.dash} />
                {DS.map((d, i) => (
                  <circle key={d} cx={x(tx(d))} cy={y(ty(T9[i]))} r={5} fill={chartTheme.color.fit} stroke={chartTheme.color.ring} strokeWidth={2} paintOrder="stroke">
                    <title>
                      d = {d} AU, t9 = {fmt(T9[i], 1)} d
                    </title>
                  </circle>
                ))}
              </PlotClip>
              <XAxis scale={x} height={frame.innerHeight} ticks={5} label={axes === 'linear' ? 'Lane length at departure (AU)' : 'log10 d'} />
            </g>
          </ChartSurface>
          <Legend items={[{ label: 'Ledger geometry, t9 = a·d^0.5', color: chartTheme.color.fit, shape: 'dot' }, { label: `candidate a·d^${fmt(b, 2)}`, color: semanticColor('residual'), shape: 'dashed' }]} />
          <ReadoutRow>
            <Readout label="true exponent (log–log slope)" value={fmt(laneFit.slope, 3)} tone="engineering" />
            <Readout label="candidate b" value={fmt(b, 2)} tone={Math.abs(b - 0.5) < 0.02 ? 'tactical' : 'alert'} live />
            <Readout label="log10 a" value={fmt(laneFit.intercept, 3)} />
          </ReadoutRow>
        </>
      ) : (
        <>
          <ChartSurface frame={frame} ariaLabel="The natural logarithm with a tangent line whose slope is one over x" description={`ln x drawn from 0.5 to 12 with the tangent at x = ${fmt(x0, 1)}, slope 1/x = ${fmt(tanSlope, 3)}.`} table={lnTable}>
            <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
              <YAxis scale={ly} width={frame.innerWidth} ticks={4} label="ln x" />
              <PlotClip frame={frame}>
                <path d={lnPath} fill="none" stroke={chartTheme.color.fit} strokeWidth={2} />
                <path d={tanPath} fill="none" stroke={semanticColor('residual')} strokeWidth={2} />
                <circle cx={lx(x0)} cy={ly(Math.log(x0))} r={6} fill={chartTheme.color.observed} stroke={chartTheme.color.ring} strokeWidth={2} paintOrder="stroke" />
              </PlotClip>
              <XAxis scale={lx} height={frame.innerHeight} ticks={6} label="x" />
            </g>
          </ChartSurface>
          <ReadoutRow>
            <Readout label="x" value={fmt(x0, 1)} />
            <Readout label="ln x" value={fmt(Math.log(x0), 3)} tone="engineering" live />
            <Readout label="slope 1/x" value={fmt(tanSlope, 3)} tone="engineering" live />
            <Readout label="ln 2x − ln x" value={fmt(Math.log(2), 3)} />
          </ReadoutRow>
        </>
      )}
    </Panel>
  )
}
