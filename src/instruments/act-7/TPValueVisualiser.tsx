/**
 * TACTICAL · t P-VALUE (act-7-03; act-7-06 imports it for the two-sample case) — the null
 * distribution of a t statistic with the tail (or tails) the alternative counts as "at least as
 * extreme" shaded, and the normal table laid beside it so the cost of reading the wrong row is a
 * number rather than a warning.
 *
 *   sides toggle       one-sided ⟷ two-sided, which re-shades and re-reads p.
 *   observed slider    drag the statistic; "RESET TO OBSERVED" puts it back on the value the data
 *                      produced.
 *   normal overlay     draws the standard normal beside t(df) and prints the p a z table would have
 *                      returned for the same statistic, with the difference between them.
 *
 * ── Props (stable; act-7-06 imports this component) ──────────────────────────────────────────────
 *
 *   mode          'one-sample' | 'paired' | 'two-sample'. Default 'one-sample'.
 *   sample        one-sample: number[] or {mean, sd, n}. Default the nineteen's Mark-9 delays.
 *   mu0           one-sample null value. Default 0 — the filed profile.
 *   first, second paired: the two columns, d = first − second.
 *   sampleA, sampleB   two-sample: the two independent samples (arrays or summaries).
 *   delta0        two-sample null difference. Default 0.
 *   dfMethod      'welch' (default) or 'conservative'.
 *   alt           where the sides toggle starts. Default 'greater'.
 *   lockAlt       hide the sides toggle. lockObserved: hide the slider.
 *   showNormal    open with the normal overlay on. Default false.
 *   label, tone   Panel header and ship-system tone.
 *
 * Every number comes from `@/lib/stats`: the test itself, `t.pdf`, `pValueT`, `pValueZ`.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { DensityCurve, Readout, Segmented, Slider } from '@/instruments/shared'
import {
  fmt,
  fmtInt,
  fmtP,
  normal,
  oneMeanTest,
  pairedTTest,
  pValueT,
  pValueZ,
  t,
  twoMeanTest,
  type Alternative,
  type InferenceResult,
  type MeanSample,
} from '@/lib/stats'
import { lostPerrineDelays } from './data'
import { ConditionList, KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export type TPValueMode = 'one-sample' | 'paired' | 'two-sample'
type Sides = 'one' | 'two'

/** Data or summary statistics, exactly as `@/lib/stats` takes them. */
export type Sample = MeanSample

const SIDE_WORDS: Record<Alternative, string> = {
  greater: 'at least as far above the null value as the one observed',
  less: 'at least as far below the null value as the one observed',
  'two-sided': 'at least as far from the null value, in either direction, as the one observed',
}

const MODE_LABEL: Record<TPValueMode, string> = {
  'one-sample': 'one-sample t',
  paired: 'paired t',
  'two-sample': 'two-sample t',
}

export interface TPValueVisualiserProps {
  mode?: TPValueMode
  /** one-sample: the sample, as data or as summary statistics. */
  sample?: Sample
  /** one-sample: the hypothesised mean. */
  mu0?: number
  /** paired: d = first − second. */
  first?: readonly number[]
  second?: readonly number[]
  /** two-sample: the two independent groups. */
  sampleA?: Sample
  sampleB?: Sample
  /** two-sample: the hypothesised difference. */
  delta0?: number
  dfMethod?: 'welch' | 'conservative'
  alt?: Alternative
  lockAlt?: boolean
  lockObserved?: boolean
  /** Open with the standard normal drawn beside t(df). */
  showNormal?: boolean
  /** What the statistic is about, for the readouts: "mean delay", "difference in mean delay". */
  quantity?: string
  label?: string
  tone?: PanelTone
}

export function TPValueVisualiser({
  mode = 'one-sample',
  sample = lostPerrineDelays,
  mu0 = 0,
  first,
  second,
  sampleA,
  sampleB,
  delta0 = 0,
  dfMethod = 'welch',
  alt = 'greater',
  lockAlt = false,
  lockObserved = false,
  showNormal = false,
  quantity,
  label = 'TACTICAL · t P-VALUE',
  tone = 'tactical',
}: TPValueVisualiserProps = {}) {
  const test: InferenceResult = useMemo(() => {
    if (mode === 'paired') {
      if (!first || !second) throw new Error('TPValueVisualiser: paired mode needs `first` and `second`')
      return pairedTTest(first, second, { mu0, alt, random: true })
    }
    if (mode === 'two-sample') {
      if (!sampleA || !sampleB) throw new Error('TPValueVisualiser: two-sample mode needs `sampleA` and `sampleB`')
      return twoMeanTest(sampleA, sampleB, { alt, delta0, dfMethod, random: true })
    }
    return oneMeanTest(sample, { mu0, alt, random: true })
  }, [mode, sample, mu0, first, second, sampleA, sampleB, delta0, dfMethod, alt])

  const observed = test.statistic
  const df = test.df ?? 1
  const dfDigits = Number.isInteger(df) ? 0 : 2

  const [sides, setSides] = useState<Sides>(alt === 'two-sided' ? 'two' : 'one')
  const [statistic, setStatistic] = useState(observed)
  const [normalOn, setNormalOn] = useState(showNormal)

  const reading: Alternative = sides === 'two' ? 'two-sided' : alt === 'less' ? 'less' : 'greater'
  const p = pValueT(statistic, df, reading)
  const pFromZ = pValueZ(statistic, reading)
  const atObserved = Math.abs(statistic - observed) < 1e-9

  const abs = Math.abs(statistic)
  const lo = Math.min(-4.5, statistic - 1)
  const hi = Math.max(4.5, statistic + 1)

  const tPdf = useMemo(() => (x: number) => t.pdf(x, df), [df])
  const zPdf = useMemo(() => (x: number) => normal.pdf(x, 0, 1), [])

  const shade = useMemo(() => {
    if (reading === 'greater') return [{ from: statistic, to: hi, curve: 0, color: 'shadeRejected' as const, label: 'p — at least as extreme' }]
    if (reading === 'less') return [{ from: lo, to: statistic, curve: 0, color: 'shadeRejected' as const, label: 'p — at least as extreme' }]
    return [
      { from: abs, to: hi, curve: 0, color: 'shadeRejected' as const, label: 'p — upper tail' },
      { from: lo, to: -abs, curve: 0, color: 'shadeRejected' as const },
    ]
  }, [reading, statistic, abs, lo, hi])

  const curves = normalOn
    ? [
        { pdf: tPdf, label: `null model · t on ${fmt(df, dfDigits)} df`, color: 'null' as const },
        { pdf: zPdf, label: 'standard normal', color: 'alt' as const, dashed: true },
      ]
    : [{ pdf: tPdf, label: `null model · t on ${fmt(df, dfDigits)} df`, color: 'null' as const }]

  const sideLabel = reading === 'two-sided' ? 'two-sided' : reading === 'less' ? 'one-sided (lower tail)' : 'one-sided (upper tail)'
  const what = quantity ?? (mode === 'two-sample' ? 'the difference in means' : mode === 'paired' ? 'the mean difference' : 'the mean')
  const inWords = `Assuming H₀ is true, ${fmtP(p)} of all such samples would produce a statistic ${SIDE_WORDS[reading]}.`

  const description =
    `The t distribution on ${fmt(df, dfDigits)} degrees of freedom${normalOn ? ', with the standard normal drawn over it,' : ''} with the ${sideLabel} tail beyond ${fmt(statistic, 3)} shaded. ` +
    `The shaded area is ${fmtP(p)} — the probability, if H₀ is true, of a statistic ${SIDE_WORDS[reading]}. Reading the same statistic off a standard normal table would give ${fmtP(pFromZ)}. ` +
    `The data table gives the density across the axis.`

  const ratio = pFromZ > 0 ? p / pFromZ : NaN

  return (
    <Panel
      label={label}
      status={`${MODE_LABEL[mode].toUpperCase()} · t ${fmt(statistic, 2)} · df ${fmt(df, dfDigits)} · p ${fmtP(p)}`}
      tone={tone}
      led="on"
      ariaLabel="t p-value visualiser: the null t distribution with the tail the alternative counts as at least as extreme"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          {!lockAlt && (
            <Segmented<Sides>
              label="alternative"
              value={sides}
              onChange={setSides}
              options={[
                { value: 'one', label: alt === 'less' ? 'one-sided (less)' : 'one-sided (greater)' },
                { value: 'two', label: 'two-sided' },
              ]}
            />
          )}
          <Segmented<'off' | 'on'>
            label="normal overlay"
            value={normalOn ? 'on' : 'off'}
            onChange={(v) => setNormalOn(v === 'on')}
            options={[
              { value: 'off', label: 't only' },
              { value: 'on', label: 'draw the normal too' },
            ]}
          />
          {!lockObserved && (
            <Slider
              label="observed t"
              value={statistic}
              min={Math.min(-4, Math.floor(observed) - 1)}
              max={Math.max(4, Math.ceil(observed) + 1)}
              step={0.01}
              onChange={setStatistic}
              format={(v) => fmt(v, 2)}
            />
          )}
          {!lockObserved && !atObserved && (
            <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setStatistic(observed)}>
              RESET TO OBSERVED
            </button>
          )}
        </div>

        <ReadoutGrid>
          <Readout label="t" value={fmt(statistic, 3)} tone="alert" live />
          <Readout label="df" value={fmt(df, dfDigits)} live />
          <Readout label={`p (${sideLabel})`} value={fmtP(p)} tone={p < 0.05 ? 'alert' : 'tactical'} live />
          <Readout label="p off a standard normal table" value={fmtP(pFromZ)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label={`estimate · ${what}`} value={fmt(test.estimate, 4)} size="sm" />
          <Readout label="SE" value={fmt(test.se, 4)} size="sm" />
          <Readout label="H₀" value={test.hypotheses?.null ?? '—'} size="sm" />
          <Readout label="Hₐ" value={test.hypotheses?.alt ?? '—'} size="sm" />
        </ReadoutGrid>

        <DensityCurve
          curves={curves}
          domain={[lo, hi]}
          shade={shade}
          references={[{ x: statistic, label: `t ${fmt(statistic, 2)}`, color: 'observed' }]}
          xLabel={`t under H₀ · ${fmt(df, dfDigits)} degrees of freedom`}
          height={300}
          ariaLabel={`Null t distribution on ${fmt(df, dfDigits)} degrees of freedom with the ${sideLabel} tail beyond ${fmt(statistic, 2)} shaded`}
          description={description}
        />

        <Note live>{inWords}</Note>

        <section aria-label="The same statistic on two tables">
          <Subhead>t on {fmt(df, dfDigits)} df against the normal table</Subhead>
          <KeyTable
            ariaLabel="The same statistic read against the t distribution and against the standard normal, one-sided and two-sided"
            caption={`Statistic ${fmt(statistic, 3)}`}
            columns={['model', 'one-sided p', 'two-sided p']}
            rows={[
              [`t on ${fmt(df, dfDigits)} df`, fmtP(pValueT(abs, df, 'greater')), fmtP(pValueT(abs, df, 'two-sided'))],
              ['standard normal', fmtP(pValueZ(abs, 'greater')), fmtP(pValueZ(abs, 'two-sided'))],
            ]}
            emphasisRow={0}
          />
          <Note tone={Number.isFinite(ratio) && ratio > 1.15 ? 'warn' : 'muted'} live>
            The t row is the one this procedure is entitled to, because σ was estimated from the same {mode === 'two-sample' ? 'samples' : 'sample'} that produced the mean. Here the normal
            table reads {fmtP(pFromZ)} against t&rsquo;s {fmtP(p)}
            {Number.isFinite(ratio) && ratio > 1 ? `, understating the p-value by a factor of ${fmt(ratio, 2)}` : ''}. On a handful of degrees of freedom that gap decides cases; on several
            hundred it is invisible, and the t row is still the correct one.
          </Note>
        </section>

        <section aria-label="Conditions">
          <Subhead>Conditions, as the procedure reports them</Subhead>
          <ConditionList conditions={test.conditions} />
          <Note>
            {mode === 'two-sample'
              ? `Welch's rule puts the degrees of freedom at ${fmt(df, dfDigits)}; the conservative rule would use the smaller group's n − 1. The calculator uses Welch.`
              : `Degrees of freedom are n − 1 = ${fmtInt(Math.round(df))}, one spent estimating the mean from the same data.`}
          </Note>
        </section>

        {!atObserved && !lockObserved && (
          <Note tone="warn">
            The slider is at {fmt(statistic, 2)}; the statistic this data produced is {fmt(observed, 2)}. Press <strong>RESET TO OBSERVED</strong> to put it back.
          </Note>
        )}
      </div>
    </Panel>
  )
}
