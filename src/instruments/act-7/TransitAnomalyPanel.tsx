/**
 * TACTICAL · TRANSIT ANOMALY (act-7-06) — one estimate, two questions.
 *
 * The same two independent groups that act-7-05 put an interval around, now with a decision
 * attached. The panel's centre control switches between **interval** and **test** without touching
 * the data: the point estimate and the standard error are computed once and printed in both modes,
 * so the learner can watch a confidence interval and a p-value come out of identical arithmetic and
 * answer different sentences.
 *
 * What the learner does: switches form (interval ⟷ test) and watches which readouts change and
 * which do not; switches the alternative (one-sided ⟷ two-sided) and watches p move and the
 * estimate stand still; switches the degrees-of-freedom rule and watches both move by less than
 * either of the first two controls ever does; reads the conditions off the procedure's own block;
 * and reads the list of claims the comparison does not license.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   a, b            the two independent samples. Default: the nineteen against the 881.
 *   nameA, nameB    group names for the summaries and the sentence.
 *   measure, units  the measured quantity, named.
 *   population      the population every scope sentence names. Default LANE_POPULATION.
 *   alpha           the level the decision is read against. Default 0.05.
 *   confidence      the interval's level on load. Default 0.95.
 *   label, tone     Panel header and ship-system tone.
 *
 * Every number comes from `twoMeanTest`, `twoMeanInterval`, `welchDf`, `conservativeDf`, `mean`
 * and `sd` in `@/lib/stats`.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Dotplot, Histogram, Readout, Segmented, Slider, padDomain } from '@/instruments/shared'
import { conservativeDf, fmt, fmtInt, fmtP, fmtPct, mean, sd, twoMeanInterval, twoMeanTest, welchDf, type Alternative } from '@/lib/stats'
import { LANE_POPULATION, lostPerrineDelays, survivingPerrineDelays } from './data'
import { ConditionList, KeyTable, Note, ReadoutGrid, Subhead, gridStyle, stackStyle } from './_ui'

/** Above this many values a dotplot is a smear; the group is drawn as a histogram instead. */
const HISTOGRAM_FROM = 60

type Form = 'interval' | 'test'
type Sides = 'greater' | 'two-sided'
type DfRule = 'welch' | 'conservative'

export interface TransitAnomalyPanelProps {
  a?: readonly number[]
  b?: readonly number[]
  nameA?: string
  nameB?: string
  measure?: string
  units?: string
  population?: string
  alpha?: number
  confidence?: number
  label?: string
  tone?: PanelTone
}

function GroupDisplay({ values, name, measure, units, domain }: { values: readonly number[]; name: string; measure: string; units: string; domain: [number, number] }) {
  const arr = useMemo(() => [...values], [values])
  const description = `${fmtInt(arr.length)} ${name}: mean ${fmt(mean(arr), 4)} ${units}, standard deviation ${fmt(sd(arr), 4)} ${units}, on the shared ${measure} axis.`
  const references = [{ x: mean(arr), label: `x̄ = ${fmt(mean(arr), 3)}`, color: 'reference' as const }]
  if (arr.length >= HISTOGRAM_FROM) {
    return <Histogram values={arr} domain={domain} binWidth={0.5} label={`${measure} (${units}) · ${name}`} references={references} height={190} ariaLabel={`Histogram of ${measure} for ${name}`} description={description} />
  }
  return <Dotplot values={arr} domain={domain} label={`${measure} (${units}) · ${name}`} references={references} height={170} ariaLabel={`Dotplot of ${measure} for ${name}`} description={description} />
}

export function TransitAnomalyPanel({
  a: aProp = lostPerrineDelays,
  b: bProp = survivingPerrineDelays,
  nameA = 'Perrine hulls the Register carries as lost',
  nameB = 'Perrine hulls that arrived',
  measure = 'Mark-9 delay against the filed plot',
  units = 'd',
  population = LANE_POPULATION,
  alpha = 0.05,
  confidence: c0 = 0.95,
  label = 'TACTICAL · TRANSIT ANOMALY',
  tone = 'tactical',
}: TransitAnomalyPanelProps = {}) {
  const [form, setForm] = useState<Form>('test')
  const [sides, setSides] = useState<Sides>('greater')
  const [dfMethod, setDfMethod] = useState<DfRule>('welch')
  const [confidence, setConfidence] = useState(c0)

  const a = useMemo(() => [...aProp], [aProp])
  const b = useMemo(() => [...bProp], [bProp])

  const alt: Alternative = sides
  const test = useMemo(() => twoMeanTest(a, b, { alt, dfMethod, random: true }), [a, b, alt, dfMethod])
  const interval = useMemo(() => twoMeanInterval(a, b, { confidence, dfMethod, random: true }), [a, b, confidence, dfMethod])
  const [lower, upper] = interval.ci as [number, number]
  const containsZero = lower <= 0 && 0 <= upper

  const welch = useMemo(() => welchDf(sd(a), a.length, sd(b), b.length), [a, b])
  const conservative = conservativeDf(a.length, b.length)
  const p = test.pValue as number
  const rejects = p < alpha

  const domain = useMemo<[number, number]>(() => padDomain([Math.min(...a, ...b), Math.max(...a, ...b)] as [number, number], 0.04), [a, b])

  const sentence =
    form === 'interval'
      ? `We are ${fmtPct(confidence, 0)} confident that the true difference in mean ${measure} — ${nameA} minus ${nameB}, among ${population} — is between ${fmt(lower, 3)} and ${fmt(upper, 3)} ${units}.`
      : rejects
        ? `Because P = ${fmtP(p)} is less than α = ${fmt(alpha, 2)}, reject H₀: there is convincing evidence that the true mean ${measure} of ${nameA} exceeds that of ${nameB}, among ${population}.`
        : `Because P = ${fmtP(p)} is not less than α = ${fmt(alpha, 2)}, do not reject H₀: these data give no convincing evidence of a difference in true mean ${measure} between the two groups.`

  const limits = [
    `No cause. Nothing was randomly assigned; the ${fmtInt(a.length)} in the first group arrived there by how they turned out, and every other difference between the two groups arrived with them.`,
    `No population behind the first group. Those ${fmtInt(a.length)} are the whole of one outcome, not a random sample of ${population}, so no sentence here generalises from them.`,
    `No claim about any individual transit. The parameter is a difference between two means, and the spread inside each group is larger than the gap between them.`,
    `No agent, and no mechanism. The comparison fixes a direction and a time; what produced either is a question this arithmetic cannot reach.`,
  ]

  return (
    <Panel
      label={label}
      status={`${form === 'interval' ? `${fmtPct(confidence, 0)} INTERVAL` : `TEST · α ${fmt(alpha, 2)}`} · ${dfMethod === 'welch' ? 'WELCH DF' : 'CONSERVATIVE DF'}`}
      tone={tone}
      led={form === 'test' && rejects ? 'alert' : 'on'}
      ariaLabel="Transit anomaly panel: two independent groups, read once as an interval and once as a test"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Form>
            label="what the question asks"
            value={form}
            onChange={setForm}
            options={[
              { value: 'interval', label: 'how large — interval' },
              { value: 'test', label: 'is there evidence — test' },
            ]}
          />
        </div>
        <div className="dr-controls">
          <Segmented<Sides>
            label="alternative"
            value={sides}
            onChange={setSides}
            options={[
              { value: 'greater', label: 'μ₁ − μ₂ > 0' },
              { value: 'two-sided', label: 'μ₁ − μ₂ ≠ 0' },
            ]}
          />
          <Segmented<DfRule>
            label="degrees of freedom"
            value={dfMethod}
            onChange={setDfMethod}
            options={[
              { value: 'welch', label: `Welch · ${fmt(welch, 2)}` },
              { value: 'conservative', label: `conservative · ${fmtInt(conservative)}` },
            ]}
          />
          <Slider label="confidence level C" value={Math.round(confidence * 100)} min={80} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
        </div>

        <KeyTable
          caption="Each group on its own: no pairing, no pooling, one summary line each"
          ariaLabel="Group summaries"
          columns={['group', 'n', 'x̄', 's']}
          rows={[
            [nameA, fmtInt(a.length), fmt(mean(a), 4), fmt(sd(a), 4)],
            [nameB, fmtInt(b.length), fmt(mean(b), 4), fmt(sd(b), 4)],
          ]}
        />

        <div style={gridStyle}>
          <section aria-label="Group one">
            <Subhead>{nameA}</Subhead>
            <GroupDisplay values={a} name={nameA} measure={measure} units={units} domain={domain} />
          </section>
          <section aria-label="Group two">
            <Subhead>{nameB}</Subhead>
            <GroupDisplay values={b} name={nameB} measure={measure} units={units} domain={domain} />
          </section>
        </div>

        <section aria-label="Shared by both readings">
          <Subhead>Computed once, used by both readings</Subhead>
          <ReadoutGrid>
            <Readout label="x̄₁ − x̄₂" value={fmt(test.estimate, 4)} tone="tactical" live />
            <Readout label="SE (unpooled)" value={fmt(test.se, 4)} size="sm" live />
            <Readout label="Welch df" value={fmt(welch, 2)} size="sm" live />
            <Readout label="conservative df" value={fmtInt(conservative)} size="sm" live />
          </ReadoutGrid>
          <Note>
            The point estimate {fmt(test.estimate, 4)} {units} and the standard error {fmt(test.se, 4)} are the whole of the arithmetic, and neither of them changes when the question does.
            What changes is what gets done with them: multiplied by t* and laid either side of the estimate, or divided into it and read against a null model.
          </Note>
        </section>

        {form === 'interval' ? (
          <section aria-label="The interval reading">
            <Subhead>Reading it as an interval — how large</Subhead>
            <ReadoutGrid>
              <Readout label="t*" value={fmt(interval.criticalValue ?? 0, 3)} size="sm" live />
              <Readout label="margin of error" value={fmt(interval.marginOfError ?? 0, 4)} size="sm" live />
              <Readout label={`${fmtPct(confidence, 0)} lower`} value={fmt(lower, 4)} tone="tactical" live />
              <Readout label={`${fmtPct(confidence, 0)} upper`} value={fmt(upper, 4)} tone="tactical" live />
              <Readout label="contains 0" value={containsZero ? 'yes' : 'no'} tone={containsZero ? 'alert' : 'tactical'} size="sm" live />
            </ReadoutGrid>
          </section>
        ) : (
          <section aria-label="The test reading">
            <Subhead>Reading it as a test — is there evidence</Subhead>
            <ReadoutGrid>
              <Readout label="H₀" value={test.hypotheses?.null ?? '—'} size="sm" />
              <Readout label="Hₐ" value={test.hypotheses?.alt ?? '—'} size="sm" live />
              <Readout label="t" value={fmt(test.statistic, 3)} tone="alert" live />
              <Readout label="df" value={fmt(test.df ?? 0, dfMethod === 'welch' ? 2 : 0)} live />
              <Readout label={`P (${sides === 'greater' ? 'one-sided' : 'two-sided'})`} value={fmtP(p)} tone={rejects ? 'alert' : 'tactical'} live />
              <Readout label={`decision at α = ${fmt(alpha, 2)}`} value={rejects ? 'reject H₀' : 'do not reject H₀'} size="sm" live />
            </ReadoutGrid>
          </section>
        )}

        <Note tone={form === 'test' && rejects ? 'ok' : 'muted'} live>
          {sentence}
        </Note>

        <section aria-label="The same estimate, both ways">
          <Subhead>The interval and the test, side by side</Subhead>
          <KeyTable
            caption="One estimate, one standard error, two questions"
            ariaLabel="The interval reading and the test reading of the same two samples"
            columns={['quantity', 'interval reading', 'test reading']}
            rows={[
              ['point estimate x̄₁ − x̄₂', fmt(interval.estimate, 4), fmt(test.estimate, 4)],
              ['standard error', fmt(interval.se, 4), fmt(test.se, 4)],
              [`df (${dfMethod})`, fmt(interval.df ?? 0, 2), fmt(test.df ?? 0, 2)],
              ['critical value / statistic', `t* = ${fmt(interval.criticalValue ?? 0, 3)}`, `t = ${fmt(test.statistic, 3)}`],
              ['what it returns', `(${fmt(lower, 3)}, ${fmt(upper, 3)}) ${units}`, `P = ${fmtP(p)}`],
              ['what it answers', 'how large the difference is', `whether there is evidence of one, at α = ${fmt(alpha, 2)}`],
            ]}
            emphasisRow={4}
          />
          <Note tone={containsZero === rejects ? 'warn' : 'muted'} live>
            {containsZero
              ? `Zero lies inside the ${fmtPct(confidence, 0)} interval and P = ${fmtP(p)}. The two readings agree, as they must when the level and the alternative line up.`
              : `Zero lies outside the ${fmtPct(confidence, 0)} interval and P = ${fmtP(p)}. A two-sided interval at ${fmtPct(confidence, 0)} and a one-sided test at α = ${fmt((1 - confidence) / 2, 3)} are the same procedure asked two ways; a one-sided test at a different α is not, which is why each report names its own.`}
          </Note>
        </section>

        <section aria-label="Conditions">
          <Subhead>Conditions, as the procedure reports them</Subhead>
          <ConditionList conditions={test.conditions} />
          <Note>
            Group by group, and a failure in either one stops the procedure. The Random line is the one nothing downstream can repair: where a group was assembled by reading the outcome
            first, it holds no random sample of anything and the write-up says so in place of ticking the box.
          </Note>
        </section>

        <section aria-label="What this comparison does not establish">
          <Subhead>What this does not establish</Subhead>
          <ul style={{ margin: 0, paddingLeft: 'var(--dr-sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--dr-sp-1)' }}>
            {limits.map((l) => (
              <li key={l} style={{ fontSize: 'var(--dr-fs-xs)', color: 'var(--dr-fg-2)' }}>
                {l}
              </li>
            ))}
          </ul>
          <Note tone="ok">
            What it does establish: a difference of {fmt(Math.abs(test.estimate), 3)} {units} in mean {measure}, in one direction, on measurements recorded before the outcome that
            separated the two groups.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
