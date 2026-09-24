/**
 * TACTICAL · POOLING EXPLORER (act-7-03) — what a comparison of nine hundred hulls against seventeen
 * hundred could have seen, as a function of how many of the nine hundred were carrying anything.
 *
 * The learner sets k, the number of Perrine transits running late by the nineteen's own per-hull
 * excess, and reads back four things that move together:
 *
 *   the expected all-Perrine mean delay   the honest fleet's mean plus k × excess ÷ 900;
 *   the gap against everyone else         what Ostrow's slate would print;
 *   the cutoff and the power              at a selectable α, from `ostrowPowerAgainst` in data.ts;
 *   the count power 0.8 would need        `divertedCountForPower(0.8)`.
 *
 * The chart is the Type I / Type II picture in the units of the comparison: the null sampling
 * distribution of the difference in means centred at zero, the alternative centred at the effect k
 * implies, α shaded on the null, β shaded on the alternative.
 *
 * Deterministic. Every number comes from `@/instruments/act-7/data`, which is itself `@/lib/stats`.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { DensityCurve, Readout, Segmented, Slider } from '@/instruments/shared'
import { fmt, fmtInt, fmtPct, mean, normal } from '@/lib/stats'
import {
  NINETEEN_EXCESS_DILUTED,
  NINETEEN_N,
  OSTROW_SE,
  OTHER_N,
  PERRINE_N,
  divertedCountForPower,
  lostPerrineDelays,
  otherDelays,
  ostrowPowerAgainst,
  survivingPerrineDelays,
} from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

const ALPHAS = ['0.01', '0.05', '0.10'] as const
type AlphaKey = (typeof ALPHAS)[number]

/** The power every planning document treats as the minimum worth commissioning. */
export const TARGET_POWER = 0.8

export interface PoolingExplorerProps {
  /** How many of the 900 carry the excess, on load. Default 19. */
  diverted?: number
  /** Significance level on load. Default 0.05. */
  alpha?: number
  label?: string
  tone?: PanelTone
}

export function PoolingExplorer({ diverted = NINETEEN_N, alpha: alpha0 = 0.05, label = 'TACTICAL · POOLING EXPLORER', tone = 'tactical' }: PoolingExplorerProps = {}) {
  const [k, setK] = useState(diverted)
  const [alphaKey, setAlphaKey] = useState<AlphaKey>(alpha0.toFixed(2) as AlphaKey)
  const alpha = Number(alphaKey)

  /** The per-hull excess the Ledger shows: a lost Perrine hull against a surviving one. */
  const perHull = mean(lostPerrineDelays) - mean(survivingPerrineDelays)
  const honestPerrine = mean(survivingPerrineDelays)
  const otherMean = mean(otherDelays)

  const result = useMemo(() => ostrowPowerAgainst(k, alpha), [k, alpha])
  const effect = result.effect
  const expectedPerrineMean = honestPerrine + effect
  const gap = expectedPerrineMean - otherMean
  const needed = useMemo(() => divertedCountForPower(TARGET_POWER, alpha), [alpha])

  const se = OSTROW_SE
  const nullPdf = useMemo(() => (x: number) => normal.pdf(x, 0, se), [se])
  const altPdf = useMemo(() => (x: number) => normal.pdf(x, effect, se), [effect, se])
  const domain = useMemo<[number, number]>(() => [Math.min(-4 * se, effect - 4 * se), Math.max(4 * se, effect + 4 * se)], [se, effect])

  const blind = result.power < 0.3

  const description =
    `Two sampling distributions of the difference in mean Mark-9 delay, in days, on one axis. The null distribution is centred at zero with a standard error of ${fmt(se, 4)} days; ` +
    `the alternative is centred at ${fmt(effect, 4)} days, the excess that ${fmtInt(k)} late hulls out of ${fmtInt(PERRINE_N)} produce once averaged into the fleet. ` +
    `At α = ${fmt(alpha, 2)} the comparison rejects only when the observed gap exceeds ${fmt(result.rejectAbove, 4)} days. The area beyond that cutoff under the null curve is α; ` +
    `under the alternative curve the area below it is β = ${fmt(result.beta, 4)} and the area above it is the power, ${fmt(result.power, 4)}. The data table gives both densities across the axis.`

  const ladder = [0, 19, 40, 60, 94, 150, 300].filter((v) => v <= PERRINE_N)

  return (
    <Panel
      label={label}
      status={`${fmtInt(k)} OF ${fmtInt(PERRINE_N)} · POWER ${fmtPct(result.power, 1)}`}
      tone={tone}
      led={blind ? 'warn' : 'on'}
      ariaLabel="Pooling explorer: what a nine-hundred against seventeen-hundred comparison of mean delay could have detected"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider
            label="Perrine transits carrying the excess (k)"
            value={k}
            min={0}
            max={200}
            step={1}
            onChange={setK}
            format={(v) => `${fmtInt(v)} of ${fmtInt(PERRINE_N)}`}
          />
          <Segmented<AlphaKey> label="significance level α" value={alphaKey} onChange={setAlphaKey} options={ALPHAS.map((a) => ({ value: a, label: `α = ${a}` }))} />
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setK(NINETEEN_N)} disabled={k === NINETEEN_N}>
            THE REGISTER&rsquo;S {fmtInt(NINETEEN_N)}
          </button>
        </div>

        <ReadoutGrid>
          <Readout label="expected all-Perrine mean delay" value={fmt(expectedPerrineMean, 4)} units="d" tone="tactical" live />
          <Readout label="gap against the other transits" value={fmt(gap, 4)} units="d" tone="tactical" live />
          <Readout label="SE of that comparison" value={fmt(se, 4)} units="d" live />
          <Readout label="power" value={fmt(result.power, 4)} tone={blind ? 'alert' : 'tactical'} live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="excess once diluted over the fleet" value={fmt(effect, 4)} units="d" size="sm" live />
          <Readout label="gap needed before it rejects" value={fmt(result.rejectAbove, 4)} units="d" size="sm" live />
          <Readout label="β · the miss rate" value={fmt(result.beta, 4)} tone={blind ? 'alert' : 'tactical'} size="sm" live />
          <Readout label={`hulls needed for power ${fmt(TARGET_POWER, 1)}`} value={fmtInt(needed)} size="sm" live />
        </ReadoutGrid>

        <DensityCurve
          curves={[
            { pdf: nullPdf, label: 'H₀ · no difference', color: 'null' },
            { pdf: altPdf, label: `Hₐ · a gap of ${fmt(effect, 4)} d`, color: 'alt', dashed: true },
          ]}
          domain={domain}
          shade={[
            { from: result.rejectAbove, to: domain[1], curve: 0, color: 'shadeRejected', label: `α = ${fmt(alpha, 2)}` },
            { from: domain[0], to: result.rejectAbove, curve: 1, color: 'shadeCaution', label: `β = ${fmt(result.beta, 3)}` },
            { from: result.rejectAbove, to: domain[1], curve: 1, color: 'shadeAlt', label: `power = ${fmt(result.power, 3)}` },
          ]}
          references={[{ x: result.rejectAbove, label: `reject above ${fmt(result.rejectAbove, 3)} d`, color: 'observed' }]}
          xLabel="difference in mean Mark-9 delay (days)"
          height={300}
          ariaLabel="Null and alternative sampling distributions of the difference in mean delay, with alpha, beta and power shaded"
          description={description}
        />

        <Note tone={blind ? 'alert' : 'muted'} live>
          {fmtInt(k)} hulls running {fmt(perHull, 3)} days late, averaged across {fmtInt(PERRINE_N)} transits, come to {fmt(effect, 4)} days on the fleet mean. The comparison against{' '}
          {fmtInt(OTHER_N)} other transits has a standard error of {fmt(se, 4)} days, so at α = {fmt(alpha, 2)} it calls nothing until the gap reaches {fmt(result.rejectAbove, 4)} days. That
          is {fmt(result.rejectAbove / Math.max(effect, 1e-9), 1)} times the excess it is being asked to find. Power {fmt(result.power, 4)}: the comparison would report nothing{' '}
          {fmtPct(result.beta, 0)} of the time with the excess present the whole while.
        </Note>

        <section aria-label="Power against the number of late hulls">
          <Subhead>What k buys, at α = {fmt(alpha, 2)}</Subhead>
          <KeyTable
            ariaLabel="Diluted excess, expected fleet mean and power for a ladder of late-hull counts"
            caption={`One-sided comparison of ${fmtInt(PERRINE_N)} Perrine transits against ${fmtInt(OTHER_N)} others, SE ${fmt(se, 4)} d`}
            columns={['late hulls k', 'excess ÷ 900 (d)', 'expected Perrine mean (d)', 'power', 'β']}
            rows={ladder.map((count) => {
              const r = ostrowPowerAgainst(count, alpha)
              return [fmtInt(count), fmt(r.effect, 4), fmt(honestPerrine + r.effect, 4), fmt(r.power, 3), fmt(r.beta, 3)]
            })}
            emphasisRow={ladder.indexOf(NINETEEN_N)}
          />
          <Note>
            Power {fmt(TARGET_POWER, 1)} arrives at {fmtInt(needed)} late hulls out of {fmtInt(PERRINE_N)} at this α. The Register carries {fmtInt(NINETEEN_N)}. A comparison built this way
            was always going to come back quiet, and coming back quiet is what it did. At the Register&rsquo;s own count the diluted excess is {fmt(NINETEEN_EXCESS_DILUTED, 4)} days.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
