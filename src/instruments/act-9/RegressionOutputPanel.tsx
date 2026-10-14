/**
 * ENGINEERING · REGRESSION OUTPUT (act-9-01, 9-02, 9-03) — the block every Unit 9 question is
 * actually read off, and the three things a learner has to be able to do with it.
 *
 *   mode="read"      find the number. A control asks for SE(b), s, df or b in turn and lights the
 *                    cell that holds it. Nothing on this table is labelled the way the formula is.
 *   mode="interval"  build b ± t*·SE(b). The level moves, df stays at n − 2, t* moves with it, and
 *                    the interval is drawn on a number line against whatever value a claim is made
 *                    about.
 *   mode="test"      build t = (b − β₀)/SE(b). The null and the alternative both move, and the
 *                    printed T and P columns sit there being the wrong answer to both.
 *
 * That last point is the whole reason the panel exists. Software prints one test: two-sided against
 * zero. A one-sided question halves that P — and only when the sign of b agrees with the
 * alternative. A question about a non-zero null cannot use the printed t at all.
 *
 * Every number comes from `@/lib/stats` (`slopeIntervalFromOutput`, `slopeTestFromComputerOutput`,
 * `tStar`) applied to the `OutputTable` passed in from `./data`.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import { ChartSurface, PlotClip, Readout, ReferenceLine, Segmented, XAxis, chartTheme, padDomain, semanticColor, useChartFrame } from '@/instruments/shared'
import { fmt, fmtInt, fmtP, fmtPct, slopeIntervalFromOutput, slopeTestFromComputerOutput, tStar, type Alternative } from '@/lib/stats'
import type { OutputTable } from './data'
import { KeyTable, Note, OutputTableView, ReadoutGrid, Subhead, columnDigits, stackStyle } from './_ui'

export type OutputMode = 'read' | 'interval' | 'test'
type ReadTarget = 'se' | 's' | 'df' | 'coef'
type Level = '90' | '95' | '99'

const READ_OPTIONS: readonly { value: ReadTarget; label: string }[] = [
  { value: 'se', label: 'SE(b)' },
  { value: 's', label: 's' },
  { value: 'df', label: 'df' },
  { value: 'coef', label: 'b' },
]

const LEVELS: readonly { value: Level; label: string }[] = [
  { value: '90', label: '90%' },
  { value: '95', label: '95%' },
  { value: '99', label: '99%' },
]

const ALT_OPTIONS: readonly { value: Alternative; label: string }[] = [
  { value: 'greater', label: 'β > β₀' },
  { value: 'less', label: 'β < β₀' },
  { value: 'two-sided', label: 'β ≠ β₀' },
]

const ALT_SYMBOL: Record<Alternative, string> = { greater: '>', less: '<', 'two-sided': '≠' }

export interface RegressionOutputPanelProps {
  table: OutputTable
  /** 'read' = find the numbers; 'interval' = build b ± t*·SE(b); 'test' = build t = (b − β₀)/SE(b). Default 'read'. */
  mode?: OutputMode
  label?: string
  caption?: string
  /** mode="test": the nulls the learner may select. Default [{ label: 'β = 0', value: 0 }]. */
  nullValues?: readonly { label: string; value: number }[]
  /** mode="interval": the value a claim is made against, drawn as a reference line. */
  claimAt?: number
  claimLabel?: string
  tone?: PanelTone
}

const DEFAULT_NULLS: readonly { label: string; value: number }[] = [{ label: 'β = 0', value: 0 }]

export function RegressionOutputPanel({
  table,
  mode = 'read',
  label = 'ENGINEERING · REGRESSION OUTPUT',
  caption,
  nullValues = DEFAULT_NULLS,
  claimAt,
  claimLabel = 'the claimed value',
  tone = 'engineering',
}: RegressionOutputPanelProps) {
  const slopeRow = table.rows[1]
  const b = slopeRow.coef
  const seB = slopeRow.se
  const digits = columnDigits([b, seB])

  const [target, setTarget] = useState<ReadTarget>('se')
  const [level, setLevel] = useState<Level>('95')
  const [nullIndex, setNullIndex] = useState('0')
  const [alt, setAlt] = useState<Alternative>('greater')

  const confidence = Number(level) / 100
  const interval = useMemo(() => slopeIntervalFromOutput({ b, seB, n: table.n, confidence }), [b, seB, table.n, confidence])
  const [lo, hi] = interval.ci as [number, number]
  const tCrit = interval.criticalValue ?? tStar(confidence, table.df)
  const moe = interval.marginOfError ?? tCrit * seB

  const beta0 = nullValues[Math.min(Number(nullIndex), nullValues.length - 1)] ?? DEFAULT_NULLS[0]
  const test = useMemo(() => slopeTestFromComputerOutput({ b, seB, n: table.n, alt, beta0: beta0.value }), [b, seB, table.n, alt, beta0.value])

  /** The printed P halved — right only for a one-sided question whose direction b agrees with. */
  const halved = slopeRow.p / 2
  const signAgrees = alt === 'two-sided' || (alt === 'greater' ? b > beta0.value : b < beta0.value)
  const halvingIsRight = beta0.value === 0 && alt !== 'two-sided' && signAgrees

  const frame = useChartFrame({ height: 150 })
  const axisDomain = useMemo<[number, number]>(
    () => padDomain([Math.min(lo, claimAt ?? lo), Math.max(hi, claimAt ?? hi)] as [number, number], 0.2),
    [lo, hi, claimAt],
  )
  const ax = useMemo(() => scaleLinear().domain(axisDomain).range([0, frame.innerWidth]), [axisDomain, frame.innerWidth])
  const contains = claimAt !== undefined && lo <= claimAt && claimAt <= hi

  const readNote: Record<ReadTarget, string> = {
    se: `SE(b) is the SE Coef entry on the ${slopeRow.term} row: ${fmt(seB, digits)}. It is s/√Sxx — how far the fitted slope moves from sample to sample — and it is the denominator of every t on this panel. The Constant row's SE Coef belongs to the intercept and is never used for a claim about β.`,
    s: `s = ${fmt(table.s, columnDigits([table.s]))} is the residual standard deviation, √(SSE/(n − 2)): the typical vertical distance of a point from the line, in the units of ${table.response}. It sits on the summary line, not in the SE Coef column, and it is not SE(b).`,
    df: `df = n − 2 = ${fmtInt(table.df)}, from ${fmtInt(table.n)} observations with two things estimated from them — a slope and an intercept. Not n − 1. Every t* and every P on this panel is read on ${fmtInt(table.df)} degrees of freedom.`,
    coef: `b = ${fmt(b, digits)} is the Coef entry on the ${slopeRow.term} row: the estimated change in ${table.response} for one more unit of ${table.predictor}. The Constant row's Coef is a, the intercept, and answers a different question.`,
  }

  const status =
    mode === 'read'
      ? `READ · n ${fmtInt(table.n)} · df ${fmtInt(table.df)}`
      : mode === 'interval'
        ? `${fmtPct(confidence, 0)} · t* ${fmt(tCrit, 3)} · df ${fmtInt(table.df)}`
        : `t ${fmt(test.statistic, 2)} · P ${fmtP(test.pValue as number)}`

  return (
    <Panel
      label={label}
      status={status}
      tone={tone}
      led={mode === 'test' && (test.pValue as number) < 0.05 ? 'warn' : 'on'}
      ariaLabel={`Regression output panel in ${mode} mode: ${table.response} on ${table.predictor}`}
    >
      <div style={stackStyle}>
        <OutputTableView table={table} highlight={mode === 'read' ? (target === 'df' ? null : target) : mode === 'interval' ? 'se' : 'coef'} />
        {caption && <Note>{caption}</Note>}

        {mode === 'read' && (
          <>
            <div className="dr-controls">
              <Segmented<ReadTarget> label="WHICH NUMBER IS…" value={target} options={READ_OPTIONS} onChange={setTarget} />
            </div>
            <ReadoutGrid>
              <Readout label="b · slope" value={fmt(b, digits)} tone={target === 'coef' ? 'engineering' : 'default'} size="sm" live />
              <Readout label="SE(b)" value={fmt(seB, digits)} tone={target === 'se' ? 'engineering' : 'default'} size="sm" live />
              <Readout label="s · residual SD" value={fmt(table.s, columnDigits([table.s]))} tone={target === 's' ? 'engineering' : 'default'} size="sm" live />
              <Readout label="df · n − 2" value={fmtInt(table.df)} tone={target === 'df' ? 'engineering' : 'default'} size="sm" live />
            </ReadoutGrid>
            <Note tone="ok" live>
              {readNote[target]}
            </Note>
          </>
        )}

        {mode === 'interval' && (
          <>
            <div className="dr-controls">
              <Segmented<Level> label="confidence level C" value={level} options={LEVELS} onChange={setLevel} />
            </div>
            <ReadoutGrid>
              <Readout label="df · n − 2" value={fmtInt(table.df)} size="sm" />
              <Readout label={`t* · ${fmtPct(confidence, 0)} on ${fmtInt(table.df)} df`} value={fmt(tCrit, 4)} tone="engineering" size="sm" live />
              <Readout label="SE(b)" value={fmt(seB, digits)} size="sm" />
              <Readout label="margin of error · t* × SE(b)" value={fmt(moe, digits)} tone="engineering" size="sm" live />
            </ReadoutGrid>
            <ReadoutGrid>
              <Readout label="b" value={fmt(b, digits)} tone="engineering" live />
              <Readout label="lower endpoint" value={fmt(lo, digits)} tone="engineering" live />
              <Readout label="upper endpoint" value={fmt(hi, digits)} tone="engineering" live />
              <Readout label="interval width" value={fmt(hi - lo, digits)} size="sm" live />
            </ReadoutGrid>

            <ChartSurface
              frame={frame}
              ariaLabel={`The ${fmtPct(confidence, 0)} t-interval for the slope on a number line${claimAt === undefined ? '' : `, against ${claimLabel}`}`}
              description={
                `A number line carrying the ${fmtPct(confidence, 0)} t-interval for the slope of ${table.response} on ${table.predictor}, from ${fmt(lo, digits)} to ${fmt(hi, digits)}, ` +
                `built as b ± t*·SE(b) = ${fmt(b, digits)} ± ${fmt(tCrit, 4)} × ${fmt(seB, digits)} on ${fmtInt(table.df)} degrees of freedom.` +
                (claimAt === undefined ? '' : ` ${claimLabel} is marked at ${fmt(claimAt, digits)}, which the interval ${contains ? 'contains' : 'excludes'}.`)
              }
              table={{
                columns: ['quantity', 'value'],
                rows: [
                  ['b', fmt(b, digits)],
                  ['SE(b)', fmt(seB, digits)],
                  ['n', fmtInt(table.n)],
                  ['df = n − 2', fmtInt(table.df)],
                  ['t*', fmt(tCrit, 4)],
                  ['margin of error', fmt(moe, digits)],
                  ['lower endpoint', fmt(lo, digits)],
                  ['upper endpoint', fmt(hi, digits)],
                  ...(claimAt === undefined ? [] : [[claimLabel, fmt(claimAt, digits)]]),
                ],
                caption: `${fmtPct(confidence, 0)} t-interval for β`,
              }}
            >
              <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
                <PlotClip frame={frame}>
                  <line
                    x1={ax(lo)}
                    x2={ax(hi)}
                    y1={frame.innerHeight / 2}
                    y2={frame.innerHeight / 2}
                    stroke={contains ? semanticColor('reference') : semanticColor('fit')}
                    strokeWidth={chartTheme.stroke.line + 2}
                    strokeLinecap="round"
                  >
                    <title>{`interval ${fmt(lo, digits)} to ${fmt(hi, digits)}`}</title>
                  </line>
                  {[lo, hi].map((v, i) => (
                    <line
                      key={i}
                      x1={ax(v)}
                      x2={ax(v)}
                      y1={frame.innerHeight / 2 - 12}
                      y2={frame.innerHeight / 2 + 12}
                      stroke={contains ? semanticColor('reference') : semanticColor('fit')}
                      strokeWidth={chartTheme.stroke.line}
                    />
                  ))}
                  <circle cx={ax(b)} cy={frame.innerHeight / 2} r={4} fill={semanticColor('observed')}>
                    <title>{`b ${fmt(b, digits)}`}</title>
                  </circle>
                </PlotClip>
                {claimAt !== undefined && (
                  <ReferenceLine x={ax(claimAt)} height={frame.innerHeight} label={`${claimLabel} ${fmt(claimAt, digits)}`} color={semanticColor('rejected')} />
                )}
                <XAxis scale={ax} height={frame.innerHeight} label={`slope β · ${table.response} per unit ${table.predictor}`} format={(v) => fmt(v, digits)} />
              </g>
            </ChartSurface>

            {claimAt !== undefined && (
              <Note tone={contains ? 'warn' : 'ok'} live>
                {contains
                  ? `${fmt(claimAt, digits)} lies inside (${fmt(lo, digits)}, ${fmt(hi, digits)}), so it stays on the list of slopes these data are consistent with. At ${fmtPct(confidence, 0)} the output gives no grounds to rule it out.`
                  : `Every value in (${fmt(lo, digits)}, ${fmt(hi, digits)}) is ${hi < claimAt ? 'below' : 'above'} ${fmt(claimAt, digits)}, so at ${fmtPct(confidence, 0)} the interval rules ${claimLabel} out as the true slope.`}
              </Note>
            )}

            <section aria-label="The same output at three levels">
              <Subhead>What the level costs in width</Subhead>
              <KeyTable
                ariaLabel="Critical value, margin of error and endpoints at three confidence levels for this output"
                caption={`b = ${fmt(b, digits)}, SE(b) = ${fmt(seB, digits)}, df = ${fmtInt(table.df)}`}
                columns={['level', `t* (df ${fmtInt(table.df)})`, 'margin', 'lower', 'upper', ...(claimAt === undefined ? [] : ['contains ' + fmt(claimAt, digits)])]}
                rows={LEVELS.map((l) => {
                  const c = Number(l.value) / 100
                  const r = slopeIntervalFromOutput({ b, seB, n: table.n, confidence: c })
                  const [a, z] = r.ci as [number, number]
                  return [
                    fmtPct(c, 0),
                    fmt(r.criticalValue ?? 0, 4),
                    fmt(r.marginOfError ?? 0, digits),
                    fmt(a, digits),
                    fmt(z, digits),
                    ...(claimAt === undefined ? [] : [a <= claimAt && claimAt <= z ? 'yes' : 'no']),
                  ]
                })}
                emphasisRow={LEVELS.findIndex((l) => l.value === level)}
              />
              <Note>
                df is {fmtInt(table.df)} at every level, because it is n − 2 and nothing about a confidence level changes how many observations there were or how many parameters were
                estimated from them.
              </Note>
            </section>
          </>
        )}

        {mode === 'test' && (
          <>
            <div className="dr-controls">
              <Segmented<string>
                label="null value β₀"
                value={nullIndex}
                options={nullValues.map((nv, i) => ({ value: String(i), label: nv.label }))}
                onChange={setNullIndex}
              />
              <Segmented<Alternative> label="alternative" value={alt} options={ALT_OPTIONS} onChange={setAlt} />
            </div>

            <ReadoutGrid>
              <Readout label="b · the data's" value={fmt(b, digits)} size="sm" />
              <Readout label="SE(b) · the data's" value={fmt(seB, digits)} size="sm" />
              <Readout label="β₀ · the hypothesis's" value={fmt(beta0.value, digits)} tone="engineering" size="sm" live />
              <Readout label="df · n − 2" value={fmtInt(table.df)} size="sm" />
            </ReadoutGrid>
            <ReadoutGrid>
              <Readout label={`t = (b − β₀) / SE(b)`} value={fmt(test.statistic, 3)} tone="engineering" live />
              <Readout label={`P · H₀ ${beta0.label}, Hₐ β ${ALT_SYMBOL[alt]} ${fmt(beta0.value, digits)}`} value={fmtP(test.pValue as number)} tone={(test.pValue as number) < 0.05 ? 'alert' : 'default'} live />
              <Readout label="T printed on the table" value={fmt(slopeRow.t, 2)} size="sm" />
              <Readout label="P printed on the table" value={fmtP(slopeRow.p)} size="sm" />
            </ReadoutGrid>

            <Note tone="alert" live>
              The table&rsquo;s own T and P columns are one test and only one: two-sided against zero, t = {fmt(slopeRow.t, 2)} on {fmtInt(table.df)} df, P = {fmtP(slopeRow.p)}.{' '}
              {beta0.value !== 0 ? (
                <>
                  This question puts β₀ at {fmt(beta0.value, digits)}, so the printed t is not the statistic and no arithmetic on the printed P will produce the answer. Recompute: t = (
                  {fmt(b, digits)} − {fmt(beta0.value, digits)}) / {fmt(seB, digits)} = {fmt(test.statistic, 3)}, and P = {fmtP(test.pValue as number)}.
                </>
              ) : alt === 'two-sided' ? (
                <>This question is the one the software ran, so the printed P of {fmtP(slopeRow.p)} is the answer and {fmtP(test.pValue as number)} agrees with it.</>
              ) : halvingIsRight ? (
                <>
                  This question is one-sided against zero and b = {fmt(b, digits)} points the way Hₐ does, so halving the printed P is legitimate: {fmtP(slopeRow.p)} ÷ 2 ={' '}
                  {fmtP(halved)}, which is what the procedure returns.
                </>
              ) : (
                <>
                  This question is one-sided and b = {fmt(b, digits)} points the <strong>wrong way</strong> for it. Halving the printed P would give {fmtP(halved)}; the honest answer is{' '}
                  {fmtP(test.pValue as number)}, because data in the opposite direction from Hₐ are not evidence for it. Halve only when the sign of b agrees with the alternative.
                </>
              )}
            </Note>

            <section aria-label="The same output under three alternatives">
              <Subhead>One b, one SE, three questions</Subhead>
              <KeyTable
                ariaLabel="t and P for each alternative at the selected null value"
                caption={`b = ${fmt(b, digits)}, SE(b) = ${fmt(seB, digits)}, β₀ = ${fmt(beta0.value, digits)}, df = ${fmtInt(table.df)}`}
                columns={['alternative', 't', 'P', 'half the printed P']}
                rows={ALT_OPTIONS.map((o) => {
                  const r = slopeTestFromComputerOutput({ b, seB, n: table.n, alt: o.value, beta0: beta0.value })
                  return [o.label, fmt(r.statistic, 3), fmtP(r.pValue as number), o.value === 'two-sided' ? '—' : fmtP(halved)]
                })}
                emphasisRow={ALT_OPTIONS.findIndex((o) => o.value === alt)}
              />
              <Note tone="warn">
                t is the same for all three rows: the alternative never touches the statistic, only how much of the distribution counts as &ldquo;at least this extreme&rdquo;. Change β₀ and t
                moves, because β₀ is in the numerator.
              </Note>
            </section>
          </>
        )}
      </div>
    </Panel>
  )
}
