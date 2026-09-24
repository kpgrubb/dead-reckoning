/**
 * CHI-SQUARE REFERENCE · the upper-tail panel every Act VIII test reads its P-value off.
 *
 * Shared by 8-02 (goodness of fit, df 3) and 8-04 (two-way tables, df 1 and df 2). The learner
 * drags the degrees of freedom and the statistic and watches the shaded area move, which is the
 * only way to see that a statistic has no size of its own: χ² = 10 is decisive on 1 df and
 * unremarkable on 20.
 *
 * Everything numeric comes from `@/lib/stats` (`chi2.pdf`, `chi2.sf`, `chi2Star`). The component
 * owns no arithmetic beyond laying out the curve.
 */
import { useState } from 'react'
import { Panel } from '@/components'
import type { PanelTone } from '@/components/Panel'
import { DensityCurve, Readout, Slider } from '@/instruments/shared'
import { chi2, chi2Star, fmt, fmtInt, fmtP } from '@/lib/stats'
import { Note, ReadoutGrid, stackStyle } from './_ui'

export interface ChiSquareTailProps {
  /** The statistic the module just computed. The slider opens here and RESET returns to it. */
  statistic: number
  /** The df the module's own test carries. */
  df: number
  /** Panel label; defaults to the generic one. */
  label?: string
  tone?: PanelTone
  /** Significance level drawn as the critical value. */
  alpha?: number
  /** What the statistic is of, for the readout caption ("the cargo table"). */
  caseName?: string
  /** Lock df (8-01/8-02 want it draggable; a checkpoint display might not). */
  lockDf?: boolean
  statMax?: number
}

export function ChiSquareTail({ statistic, df, label = 'CHI-SQUARE REFERENCE · UPPER TAIL', tone = 'intel', alpha = 0.05, caseName, lockDf = false, statMax }: ChiSquareTailProps) {
  const [k, setK] = useState(df)
  const [x, setX] = useState(statistic)

  const top = statMax ?? Math.max(Math.ceil(statistic * 1.25), 20)
  const domain: [number, number] = [0, Math.max(top, chi2Star(0.001, k) * 1.1)]
  const p = chi2.sf(x, k)
  const crit = chi2Star(alpha, k)
  const atModule = Math.abs(k - df) < 0.5 && Math.abs(x - statistic) < 1e-9

  return (
    <Panel label={label} status={`df ${fmtInt(k)} · χ² ${fmt(x, 2)}`} tone={tone} led={p < alpha ? 'alert' : 'on'}>
      <div style={stackStyle}>
        <DensityCurve
          curves={[{ pdf: (v: number) => chi2.pdf(Math.max(v, 1e-6), k), label: `χ² density, df ${fmtInt(k)}`, color: 'null' }]}
          domain={domain}
          shade={[
            { from: x, to: domain[1], color: 'shadeRejected', label: `upper tail, P = ${fmtP(p)}` },
          ]}
          references={[
            { x, label: `χ² = ${fmt(x, 2)}` },
            { x: crit, label: `critical value at α = ${fmt(alpha, 2)}: ${fmt(crit, 2)}` },
          ]}
          xLabel="χ²"
          height={260}
          ariaLabel={`Chi-square density on ${fmtInt(k)} degrees of freedom, with the area above ${fmt(x, 2)} shaded. That area is ${fmtP(p)}.`}
          description="Drag the statistic or the degrees of freedom; the shaded upper tail is the P-value. Chi-square P-values are always one-tailed on the right, because every departure from the expected counts, in either direction, makes the statistic larger."
          showTable={false}
        />

        <div className="dr-controls">
          <Slider label="χ² statistic" value={x} min={0} max={domain[1]} step={0.1} onChange={setX} format={(v) => fmt(v, 2)} />
          <Slider label="degrees of freedom" value={k} min={1} max={20} step={1} onChange={(v) => !lockDf && setK(v)} format={(v) => fmtInt(v)} />
        </div>

        <ReadoutGrid>
          <Readout label="P-value" value={fmtP(p)} tone={p < alpha ? 'alert' : 'tactical'} live />
          <Readout label={`critical value (α = ${fmt(alpha, 2)})`} value={fmt(crit, 2)} />
          <Readout label="decision" value={p < alpha ? 'reject H₀' : 'fail to reject H₀'} tone={p < alpha ? 'alert' : 'log'} live />
        </ReadoutGrid>

        <Note tone={atModule ? 'muted' : 'warn'} live>
          {atModule
            ? `Opened on ${caseName ?? 'this module'}: χ² = ${fmt(statistic, 2)} on ${fmtInt(df)} degrees of freedom, P = ${fmtP(chi2.sf(statistic, df))}.`
            : `Moved off ${caseName ?? 'the module'}'s own figures (χ² = ${fmt(statistic, 2)}, df ${fmtInt(df)}). Set df to ${fmtInt(df)} and the statistic to ${fmt(statistic, 2)} to get back to them.`}
        </Note>
        <Note>
          The same statistic answers to its degrees of freedom. At χ² = {fmt(x, 2)} the tail is {fmtP(chi2.sf(x, 1))} on 1 df and {fmtP(chi2.sf(x, 10))} on 10.
        </Note>
      </div>
    </Panel>
  )
}
