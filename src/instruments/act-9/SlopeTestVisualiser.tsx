/**
 * SENSOR · SLOPE TEST (act-9-03) — the null distribution of a slope t, on the Act's real regression.
 *
 * The response is what each of the nineteen carried per TRUE tonne beyond what its own departure
 * month's profile required; the predictor is the Δv from Mark 9.4 to rest at Kettle on that date.
 * Under every innocent story that slope is zero.
 *
 * What the learner does, and what it shows:
 *
 *   move the null       β₀ = 0 is "no relationship"; the rocket equation's marginal fuel fraction at
 *                       the thrust-limited Lane burn is the physical value; 1/vₑ is Ebele's first
 *                       guess, the same quantity at zero Δv. b and SE(b) do not move when the null
 *                       does. t and P move, because t = (b − β₀)/SE(b) and β₀ is in the numerator.
 *   move the alternative one tail or two. The statistic does not change; the shaded area does.
 *   switch to diagnostics the same nineteen points as a fit, a residual plot and a normal
 *                       probability plot, because a P-value from a fit whose conditions fail is a
 *                       number with nothing behind it.
 *
 * Every number comes from `slopeTest` in `@/lib/stats` and the constants in `./data`.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { DensityCurve, Readout, Segmented } from '@/instruments/shared'
import { fmt, fmtInt, fmtP, slopeTest, t as tDist, type Alternative } from '@/lib/stats'
import { BETA_EBELE, BETA_PHYSICAL, KETTLE_FIT, dvKettle, excessFuelFraction, nineteen } from './data'
import { ConditionList, KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'
import { ResidualDiagnostics } from './ResidualDiagnostics'

type NullId = 'zero' | 'physical' | 'ebele'
type View = 'test' | 'diagnostics'

const ALT_OPTIONS: readonly { value: Alternative; label: string }[] = [
  { value: 'greater', label: 'β > β₀' },
  { value: 'two-sided', label: 'β ≠ β₀' },
]

const VIEWS: readonly { value: View; label: string }[] = [
  { value: 'test', label: 'the null distribution' },
  { value: 'diagnostics', label: 'the nineteen points' },
]

const X_LABEL = 'Kettle Δv on the departure date (km/s)'
const Y_LABEL = 'excess fuel per true tonne'

export interface SlopeTestVisualiserProps {
  label?: string
  tone?: PanelTone
}

export function SlopeTestVisualiser({ label = 'SENSOR · SLOPE TEST', tone = 'sensor' }: SlopeTestVisualiserProps = {}) {
  const [nullId, setNullId] = useState<NullId>('zero')
  const [alt, setAlt] = useState<Alternative>('greater')
  const [view, setView] = useState<View>('test')

  const nulls: Record<NullId, { value: number; label: string; what: string }> = useMemo(
    () => ({
      zero: {
        value: 0,
        label: 'β₀ = 0',
        what: 'no relationship at all: under clerical error, petty under-declaration or a crew that went rogue at Mark 9, what a hull loaded at Uruk High has nothing to do with the Δv to Kettle on the day it left.',
      },
      physical: {
        value: BETA_PHYSICAL,
        label: `β₀ = ${fmt(BETA_PHYSICAL, 5)} · the rocket equation`,
        what: `the rocket equation's marginal fuel fraction per km/s of extra braking, e^(−Δv_L/vₑ)/vₑ evaluated at each hull's own thrust-limited Lane burn and averaged: ${fmt(BETA_PHYSICAL, 5)} per km/s. If the extra fuel IS the fuel to reach Kettle, this is the slope it should have.`,
      },
      ebele: {
        value: BETA_EBELE,
        label: `β₀ = ${fmt(BETA_EBELE, 5)} · 1/vₑ`,
        what: `Ebele's first guess, one over the exhaust velocity: ${fmt(BETA_EBELE, 5)} per km/s. That is the marginal fuel fraction at zero Δv, and these hulls are far from zero — which is why it sits above the physical value.`,
      },
    }),
    [],
  )

  const beta0 = nulls[nullId]
  const test = useMemo(
    () => slopeTest(dvKettle, excessFuelFraction, { alt, beta0: beta0.value, random: true, populationSize: 20_000 }),
    [alt, beta0.value],
  )

  const statistic = test.statistic
  const df = test.df ?? KETTLE_FIT.n - 2
  const p = test.pValue as number
  const abs = Math.abs(statistic)
  const lo = Math.min(-4.5, statistic - 1)
  const hi = Math.max(4.5, statistic + 1)

  const pdf = useMemo(() => (x: number) => tDist.pdf(x, df), [df])
  const shade = useMemo(() => {
    if (alt === 'greater') return [{ from: statistic, to: hi, curve: 0, color: 'shadeRejected' as const, label: 'P — at least as extreme' }]
    return [
      { from: abs, to: hi, curve: 0, color: 'shadeRejected' as const, label: 'P — both tails' },
      { from: lo, to: -abs, curve: 0, color: 'shadeRejected' as const },
    ]
  }, [alt, statistic, abs, lo, hi])

  const hullNames = useMemo(() => nineteen.map((c) => c.hull), [])

  const description =
    `The t distribution on ${fmtInt(df)} degrees of freedom, the null model for the slope of ${Y_LABEL} on ${X_LABEL} when β = ${fmt(beta0.value, 5)}. ` +
    `The observed statistic is t = ${fmt(statistic, 3)}, from b = ${fmt(KETTLE_FIT.slope, 5)} and SE(b) = ${fmt(KETTLE_FIT.seSlope, 5)}. ` +
    `The ${alt === 'greater' ? 'upper tail beyond it is' : 'two tails beyond ±' + fmt(abs, 3) + ' are'} shaded, with total area ${fmtP(p)}. The data table gives the density across the axis.`

  return (
    <Panel
      label={label}
      status={`t ${fmt(statistic, 2)} · df ${fmtInt(df)} · P ${fmtP(p)}`}
      tone={tone}
      led={p < 0.05 ? 'alert' : 'on'}
      ariaLabel="Slope test visualiser: the null t distribution for the slope of excess fuel on the Kettle delta-v"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<NullId>
            label="null value β₀"
            value={nullId}
            onChange={setNullId}
            options={[
              { value: 'zero', label: 'β₀ = 0 · no relationship' },
              { value: 'physical', label: 'the rocket equation' },
              { value: 'ebele', label: "Ebele's 1/vₑ" },
            ]}
          />
          <Segmented<Alternative> label="alternative" value={alt} options={ALT_OPTIONS} onChange={setAlt} />
          <Segmented<View> label="display" value={view} options={VIEWS} onChange={setView} />
        </div>

        <ReadoutGrid>
          <Readout label="b · slope" value={fmt(KETTLE_FIT.slope, 5)} tone="sensor" live />
          <Readout label="SE(b)" value={fmt(KETTLE_FIT.seSlope, 5)} tone="sensor" live />
          <Readout label="df · n − 2" value={fmtInt(df)} size="sm" />
          <Readout label="t = (b − β₀) / SE(b)" value={fmt(statistic, 3)} tone="sensor" live />
          <Readout label="P" value={fmtP(p)} tone={p < 0.05 ? 'alert' : 'default'} live />
        </ReadoutGrid>

        {view === 'test' ? (
          <>
            <DensityCurve
              curves={[{ pdf, label: `null model · t on ${fmtInt(df)} df`, color: 'null' }]}
              domain={[lo, hi]}
              shade={shade}
              references={[{ x: statistic, label: `t ${fmt(statistic, 2)}` }]}
              xLabel={`t under H₀: β = ${fmt(beta0.value, 5)}`}
              height={300}
              ariaLabel={`Null t distribution on ${fmtInt(df)} degrees of freedom with the ${alt === 'greater' ? 'upper tail' : 'two tails'} beyond ${fmt(statistic, 2)} shaded`}
              description={description}
            />

            <Note live>
              H₀: β = {fmt(beta0.value, 5)} — {beta0.what} Assuming it, {fmtP(p)} of samples of nineteen departures would produce a slope{' '}
              {alt === 'greater' ? 'at least as far above' : 'at least as far from, in either direction,'} {fmt(beta0.value, 5)} as {fmt(KETTLE_FIT.slope, 5)} is.
            </Note>

            <Note tone="warn" live>
              b = {fmt(KETTLE_FIT.slope, 5)} and SE(b) = {fmt(KETTLE_FIT.seSlope, 5)} did not move when the null did, and they never will: they belong to the nineteen departures. t and P
              did move, because the null is in the numerator of t and nowhere else. Changing what you are testing against changes the verdict without touching the data.
            </Note>

            <section aria-label="The same slope against three null values">
              <Subhead>One slope, three hypotheses</Subhead>
              <KeyTable
                ariaLabel="t and P for the same fitted slope against three null values, one-sided and two-sided"
                caption={`b = ${fmt(KETTLE_FIT.slope, 5)}, SE(b) = ${fmt(KETTLE_FIT.seSlope, 5)}, df = ${fmtInt(df)}`}
                columns={['H₀', 'β₀', 't', 'P (β > β₀)', 'P (β ≠ β₀)']}
                rows={(['zero', 'physical', 'ebele'] as NullId[]).map((id) => {
                  const one = slopeTest(dvKettle, excessFuelFraction, { alt: 'greater', beta0: nulls[id].value, random: true, populationSize: 20_000 })
                  const two = slopeTest(dvKettle, excessFuelFraction, { alt: 'two-sided', beta0: nulls[id].value, random: true, populationSize: 20_000 })
                  return [nulls[id].label, fmt(nulls[id].value, 5), fmt(one.statistic, 3), fmtP(one.pValue as number), fmtP(two.pValue as number)]
                })}
                emphasisRow={(['zero', 'physical', 'ebele'] as NullId[]).indexOf(nullId)}
              />
              <Note tone="ok">
                Zero is rejected and the rocket equation is not. A slope that is convincingly different from nothing and comfortably consistent with the physics of braking into Kettle is the
                finding: the excess fuel on each hull is the fuel to reach Kettle on the day it left. It names no one. Say what it proves.
              </Note>
            </section>

            <section aria-label="Conditions for the slope test">
              <Subhead>Conditions, as the procedure reports them</Subhead>
              <ConditionList conditions={test.conditions} />
            </section>
          </>
        ) : (
          <ResidualDiagnostics
            fit={KETTLE_FIT}
            xLabel={X_LABEL}
            yLabel={Y_LABEL}
            pointLabels={hullNames}
            initialView="scatter"
            label="INTEL · THE NINETEEN, THREE WAYS"
            caption={`The fit the test above is run on: b = ${fmt(KETTLE_FIT.slope, 5)} per km/s, r² = ${fmt(KETTLE_FIT.r2, 3)}, s = ${fmt(KETTLE_FIT.s, 5)}.`}
            ariaLabel="Residual diagnostics for the regression of excess fuel per true tonne on the Kettle delta-v"
          />
        )}
      </div>
    </Panel>
  )
}
