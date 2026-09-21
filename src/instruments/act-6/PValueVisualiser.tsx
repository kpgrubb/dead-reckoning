/**
 * TACTICAL · P-VALUE VISUALISER (act-6-04, reused by act-6-08) — the null distribution of the
 * standardized statistic with the tail (or tails) the alternative counts as "at least as extreme"
 * shaded, read two ways.
 *
 *   model toggle      normal model (a DensityCurve with shaded tails) ⟷ simulation (a Histogram of
 *                     ten thousand seasons run under H₀, with the normal curve overlaid). Both
 *                     p-values are printed side by side so the learner can reconcile them.
 *   sides toggle      one-sided (greater / less) ⟷ two-sided, which re-shades and re-reads p, so
 *                     the "two-sided is one tail" misconception is visible rather than described.
 *   observed slider   drag the statistic and watch the tail area move. "RESET TO OBSERVED" puts it
 *                     back on the value the data produced.
 *
 * Readouts: the statistic, the shaded area, and "at least as extreme" restated in words for the
 * current sides setting.
 *
 * ── Props (stable; act-6-08 imports this component) ─────────────────────────────────────────────
 *
 *   mode            'one-prop' | 'two-prop'   which test the null distribution describes.
 *                                             Default 'two-prop'.
 *   x1, n1, x2, n2  two-proportion inputs. Default: the Lane's beneficiary case from data.ts
 *                   (PERRINE_LOSSES / PERRINE_TRANSITS against OTHER_LOSSES / OTHER_TRANSITS).
 *   x, n, p0        one-proportion inputs. Default: Rook's 2176 Asgard report against the
 *                   Directorate's standing figure (ROOK_2176, ROOK_NULL_RATE).
 *   alt             'greater' | 'less' | 'two-sided' — where the sides toggle starts. Default
 *                   'greater'.
 *   lockAlt         true hides the sides toggle (a signed report does not re-choose its
 *                   alternative). Default false.
 *   lockObserved    true hides the observed-statistic slider. Default false.
 *   startSimulated  true opens on the simulation rather than the normal model. Default false.
 *   reps            simulated seasons under H₀. Default 10,000.
 *   seed            seed for that simulation; deterministic. Default 'lane'.
 *   simulate        optional override: (seed, reps) => standardized statistics under H₀. The
 *                   default is `simulateNullZ` from data.ts in two-proportion mode, and a
 *                   binomial null at p₀ in one-proportion mode. Both go through `@/lib/rng`.
 *   label, tone     Panel header and ship-system tone. Defaults 'TACTICAL · P-VALUE' / 'tactical'.
 *
 * Nothing here is typed in: every number comes from `@/lib/stats` or from `@/instruments/act-6/data`.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { DensityCurve, Histogram, Readout, Segmented, Slider } from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtP, normal, onePropTest, pValueZ, twoPropTest, type Alternative } from '@/lib/stats'
import {
  OTHER_LOSSES,
  OTHER_TRANSITS,
  PERRINE_LOSSES,
  PERRINE_TRANSITS,
  ROOK_2176,
  simulateNullZ,
  simulatedPValue,
} from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export type PValueMode = 'one-prop' | 'two-prop'
type Model = 'normal' | 'simulation'
type Sides = 'one' | 'two'

/**
 * The Directorate's standing loss-rate figure for the Lane in 2176 — five losses per thousand
 * transits. It is a *hypothesised* value (the figure on the page Rook was testing against), not a
 * measurement, which is why it is a constant here and not a call into `@/lib/stats`.
 */
export const ROOK_NULL_RATE = 0.005

export interface PValueVisualiserProps {
  /** Which test the null distribution describes. Default `'two-prop'`. */
  mode?: PValueMode
  /** Two-proportion inputs (`mode = 'two-prop'`). */
  x1?: number
  n1?: number
  x2?: number
  n2?: number
  /** One-proportion inputs (`mode = 'one-prop'`). */
  x?: number
  n?: number
  p0?: number
  /** Where the sides toggle starts. Default `'greater'`. */
  alt?: Alternative
  /** Hide the one-sided / two-sided toggle. Default `false`. */
  lockAlt?: boolean
  /** Hide the observed-statistic slider. Default `false`. */
  lockObserved?: boolean
  /** Open on the simulation rather than the normal model. Default `false`. */
  startSimulated?: boolean
  /** Simulated seasons under H₀. Default 10,000. */
  reps?: number
  /** Seed for the simulated null. Deterministic. Default `'lane'`. */
  seed?: string | number
  /** Override the null simulator. Must return standardized statistics under H₀. */
  simulate?: (seed: string | number, reps: number) => number[]
  label?: string
  tone?: PanelTone
}

/** A one-proportion null: x ~ Binomial(n, p₀), standardized with the test's own SE. */
function simulateOnePropZ(seed: string | number, reps: number, n: number, p0: number): number[] {
  const r = rng('act-6/one-prop-null', seed)
  const se = Math.sqrt((p0 * (1 - p0)) / n)
  const out = new Array<number>(reps)
  for (let i = 0; i < reps; i++) out[i] = (r.binomial(n, p0) / n - p0) / se
  return out
}

const SIDE_WORDS: Record<Alternative, string> = {
  greater: 'at least as far above the null value as the one observed',
  less: 'at least as far below the null value as the one observed',
  'two-sided': 'at least as far from the null value, in either direction, as the one observed',
}

export function PValueVisualiser({
  mode = 'two-prop',
  x1 = PERRINE_LOSSES,
  n1 = PERRINE_TRANSITS,
  x2 = OTHER_LOSSES,
  n2 = OTHER_TRANSITS,
  x = ROOK_2176.losses,
  n = ROOK_2176.transits,
  p0 = ROOK_NULL_RATE,
  alt = 'greater',
  lockAlt = false,
  lockObserved = false,
  startSimulated = false,
  reps = 10_000,
  seed = 'lane',
  simulate,
  label = 'TACTICAL · P-VALUE',
  tone = 'tactical',
}: PValueVisualiserProps) {
  /** The test actually run on the inputs — the source of the observed statistic and of `p`. */
  const test = useMemo(
    () => (mode === 'two-prop' ? twoPropTest({ x1, n1, x2, n2, alt: 'greater', random: true }) : onePropTest({ x, n, p0, alt: 'greater', random: true })),
    [mode, x1, n1, x2, n2, x, n, p0],
  )
  const observed = test.statistic

  const [model, setModel] = useState<Model>(startSimulated ? 'simulation' : 'normal')
  const [sides, setSides] = useState<Sides>(alt === 'two-sided' ? 'two' : 'one')
  const [statistic, setStatistic] = useState(observed)

  /** The alternative currently being read: the prop's direction when one-sided, otherwise two. */
  const reading: Alternative = sides === 'two' ? 'two-sided' : alt === 'less' ? 'less' : 'greater'
  const normalP = pValueZ(statistic, reading)

  const nullStats = useMemo(
    () => (simulate ? simulate(seed, reps) : mode === 'two-prop' ? simulateNullZ(seed, reps) : simulateOnePropZ(seed, reps, n, p0)),
    [simulate, seed, reps, mode, n, p0],
  )

  /* Tail counts come off the same array for every reading, so the doubling is a count, not a claim. */
  const abs = Math.abs(statistic)
  const tailAbove = useMemo(() => nullStats.filter((z) => z >= statistic).length, [nullStats, statistic])
  const tailBelow = useMemo(() => nullStats.filter((z) => z <= statistic).length, [nullStats, statistic])
  const upperAbs = useMemo(() => nullStats.filter((z) => z >= abs).length, [nullStats, abs])
  const lowerAbs = useMemo(() => nullStats.filter((z) => z <= -abs).length, [nullStats, abs])
  /** The one-sided rate `simulatedPValue` itself returns, so data.ts keeps ownership of the definition. */
  const simGreater = simulatedPValue(nullStats, statistic)
  const primaryCount = reading === 'less' ? tailBelow : tailAbove
  const simP = reading === 'greater' ? simGreater : reading === 'less' ? tailBelow / nullStats.length : (upperAbs + lowerAbs) / nullStats.length

  const simMin = useMemo(() => Math.min(...nullStats), [nullStats])
  const simMax = useMemo(() => Math.max(...nullStats), [nullStats])
  const lo = Math.min(-4.2, statistic - 1, simMin - 0.3)
  const hi = Math.max(4.2, statistic + 1, simMax + 0.3)
  const shade = useMemo(() => {
    if (reading === 'greater') return [{ from: statistic, to: hi, color: 'shadeRejected' as const, label: 'p — at least as extreme' }]
    if (reading === 'less') return [{ from: lo, to: statistic, color: 'shadeRejected' as const, label: 'p — at least as extreme' }]
    return [
      { from: abs, to: hi, color: 'shadeRejected' as const, label: 'p — upper tail' },
      { from: lo, to: -abs, color: 'shadeRejected' as const, label: 'p — lower tail' },
    ]
  }, [reading, statistic, abs, lo, hi])

  const oneTail = pValueZ(abs, 'greater')
  const twoTail = pValueZ(abs, 'two-sided')
  const atObserved = Math.abs(statistic - observed) < 1e-9

  const sideLabel = reading === 'two-sided' ? 'two-sided' : reading === 'less' ? 'one-sided (lower tail)' : 'one-sided (upper tail)'
  const inWords = `Assuming H₀ is true, ${fmtP(normalP)} of all such samples would produce a statistic ${SIDE_WORDS[reading]}.`

  const histogramDescription =
    `Histogram of ${fmtInt(nullStats.length)} standardized statistics simulated under the null hypothesis, with the standard normal curve overlaid and the ${reading === 'less' ? 'lower' : 'upper'} tail beyond ${fmt(reading === 'less' ? statistic : abs, 2)} highlighted. ` +
    `${fmtInt(reading === 'two-sided' ? upperAbs : primaryCount)} of the ${fmtInt(nullStats.length)} runs fell in that tail` +
    (reading === 'two-sided' ? `, and ${fmtInt(lowerAbs)} more fell in the mirror tail below ${fmt(-abs, 2)}, so the two-sided simulated p-value is ${fmtP(simP)}.` : `, so the simulated p-value is ${fmtP(simP)}.`)

  return (
    <Panel label={label} status={`${sideLabel.toUpperCase()} · ${model === 'normal' ? 'NORMAL MODEL' : `${fmtInt(nullStats.length)} SIMULATED`}`} tone={tone} led="on" ariaLabel="P-value visualiser">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Model>
            label="model"
            value={model}
            onChange={setModel}
            options={[
              { value: 'normal', label: 'normal model' },
              { value: 'simulation', label: 'simulation' },
            ]}
          />
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
          {!lockObserved && (
            <Slider label="observed statistic" value={statistic} min={-4} max={Math.max(4, Math.ceil(observed) + 1)} step={0.01} onChange={setStatistic} format={(v) => fmt(v, 2)} />
          )}
          {!lockObserved && !atObserved && (
            <button type="button" className="dr-btn dr-btn--ghost" onClick={() => setStatistic(observed)}>
              RESET TO OBSERVED
            </button>
          )}
        </div>

        <ReadoutGrid>
          <Readout label="statistic" value={fmt(statistic, 2)} tone="alert" live />
          <Readout label={`p (${sideLabel})`} value={fmtP(normalP)} tone={normalP < 0.01 ? 'alert' : 'tactical'} live />
          <Readout label="p (normal model)" value={fmtP(normalP)} size="sm" live />
          <Readout label={`p (${fmtInt(nullStats.length)} simulated)`} value={fmtP(simP)} size="sm" live />
        </ReadoutGrid>

        {model === 'normal' ? (
          <DensityCurve
            curves={{ pdf: (v: number) => normal.pdf(v, 0, 1), label: 'null model · N(0, 1)', color: 'null' }}
            domain={[lo, hi]}
            shade={shade}
            references={[{ x: statistic, label: `statistic ${fmt(statistic, 2)}`, color: 'observed' }]}
            xLabel="standardized statistic under H₀"
            height={280}
            ariaLabel={`Standard normal null distribution with the ${sideLabel} tail beyond ${fmt(statistic, 2)} shaded`}
            description={`The sampling distribution of the standardized statistic if H₀ were true. The shaded area is ${fmtP(normalP)} — the probability of a statistic ${SIDE_WORDS[reading]}. The data table gives the density across the axis.`}
          />
        ) : (
          <Histogram
            values={nullStats}
            binWidth={0.25}
            domain={[lo, hi]}
            density
            curve={(v: number) => normal.pdf(v, 0, 1)}
            curveLabel="normal model · N(0, 1)"
            barsLabel={`${fmtInt(nullStats.length)} seasons simulated under H₀`}
            highlight={
              reading === 'less'
                ? { from: lo, to: statistic, color: 'rejected', label: 'at least as extreme' }
                : { from: reading === 'greater' ? statistic : abs, to: hi, color: 'rejected', label: 'at least as extreme' }
            }
            references={
              reading === 'two-sided'
                ? [
                    { x: abs, label: fmt(abs, 2), color: 'observed' },
                    { x: -abs, label: fmt(-abs, 2), color: 'observed' },
                  ]
                : [{ x: statistic, label: `statistic ${fmt(statistic, 2)}`, color: 'observed' }]
            }
            label="standardized statistic under H₀"
            height={280}
            ariaLabel={`Histogram of ${fmtInt(nullStats.length)} simulated null statistics with the normal model overlaid`}
            description={histogramDescription}
          />
        )}

        <Note live>{inWords}</Note>

        {model === 'simulation' && (
          <Note tone={reading === 'two-sided' ? 'warn' : 'muted'} live>
            Counted, not calculated: <strong>{fmtInt(reading === 'two-sided' ? upperAbs : primaryCount)}</strong> of the {fmtInt(nullStats.length)} seasons came out at or beyond {fmt(reading === 'less' ? statistic : abs, 2)}
            {reading === 'two-sided' ? (
              <>
                , and <strong>{fmtInt(lowerAbs)}</strong> more came out at or beyond {fmt(-abs, 2)} on the other side. The two-sided p adds them: {fmtInt(upperAbs)} + {fmtInt(lowerAbs)} = {fmtInt(upperAbs + lowerAbs)} of {fmtInt(nullStats.length)} = {fmtP(simP)}. Only
                the upper tail is highlighted above; the mirror tail is its reflection.
              </>
            ) : (
              <>
                . That is {fmtInt(primaryCount)} ÷ {fmtInt(nullStats.length)} = {fmtP(simP)}, against {fmtP(normalP)} from the normal model.
              </>
            )}{' '}
            A simulated p-value can never be finer than one run in {fmtInt(nullStats.length)}, which is {fmt(1 / nullStats.length, 5)} — the floor of what this many seasons can resolve.
          </Note>
        )}

        <section aria-label="One tail or two">
          <Subhead>The same statistic, read both ways</Subhead>
          <KeyTable
            ariaLabel="One-sided and two-sided p-values for the same statistic"
            caption={`Standardized statistic ${fmt(statistic, 2)}`}
            columns={['alternative', 'tails counted', 'p from the normal model', 'p from the simulation']}
            rows={[
              ['one-sided', 'one', fmtP(oneTail), fmtP(upperAbs / nullStats.length)],
              ['two-sided', 'two', fmtP(twoTail), fmtP((upperAbs + lowerAbs) / nullStats.length)],
            ]}
            emphasisRow={reading === 'two-sided' ? 1 : 0}
          />
          <Note>
            The factor of two is not something the data did. It is the whole content of the alternative: a two-sided Hₐ says a departure in either direction would have counted, so the mirror tail has to be counted too. Which is why the alternative is written down before the data — pick the side afterwards and you have a two-sided procedure reporting a one-sided number.
          </Note>
        </section>

        {!atObserved && !lockObserved && (
          <Note tone="warn">
            The slider is at {fmt(statistic, 2)}; the statistic this data set actually produced is {fmt(observed, 2)}. Press <strong>RESET TO OBSERVED</strong> to put it back.
          </Note>
        )}
      </div>
    </Panel>
  )
}
