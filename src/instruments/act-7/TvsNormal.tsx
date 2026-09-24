/**
 * INTEL · t AGAINST THE NORMAL (act-7-01) — what estimating σ by s does to the sampling distribution.
 *
 *   curves mode       t(df) drawn over the standard normal, with a df slider (1 → 60) and a preset
 *                     that snaps to the Refit set's twelve hulls (df 11). Readouts: t* and z* at a
 *                     selectable confidence, the gap between them, and the area beyond ±1.96 under
 *                     each curve — the tail the normal table would have told you was 5%.
 *   simulation mode   four thousand samples drawn from a Normal parent through `@/lib/sim`'s
 *                     `t-under-h0` task, each standardized with its OWN s in the denominator. The
 *                     learner sets n and overlays either t(n − 1) or the standard normal on the
 *                     histogram, and counts what actually landed past ±1.96.
 *
 * Nothing here is typed in: densities come from `t`/`normal`, critical values from `tStar`/`zStar`,
 * and the simulated statistics from the deterministic Monte Carlo task. `Math.random` is never used.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { DensityCurve, Histogram, Readout, Segmented, Slider } from '@/instruments/shared'
import { seedFrom } from '@/lib/rng'
import { simulate } from '@/lib/sim'
import { fmt, fmtInt, fmtPct, normal, t, tStar, zStar } from '@/lib/stats'
import { REFIT_N } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

type View = 'curves' | 'simulation'
type Overlay = 't' | 'normal'

/** The cutoff every learner has memorised from Unit 6. Under t(df) it is not the 5% they expect. */
export const Z_95 = 1.96
/** Replications in the simulation. Enough that the tail count settles to the third decimal. */
export const T_SIM_REPS = 4000
export const T_SIM_SEED = 'act-7/t-sim'
/** The df the Refit set actually hands the learner. */
export const REFIT_DF = REFIT_N - 1

/** Degrees of freedom the comparison table walks, from useless to indistinguishable. */
const DF_LADDER = [1, 2, 4, 9, REFIT_DF, 19, 29, 49, 99, 499] as const
const LEVELS = ['0.90', '0.95', '0.99'] as const
type LevelKey = (typeof LEVELS)[number]

export interface TvsNormalProps {
  /** Degrees of freedom on load. Default 11 — the Refit set's twelve hulls. */
  df?: number
  /** Confidence level on load. Default 0.95. */
  confidence?: number
  /** Sample size the simulation opens on. Default 12. */
  n?: number
  /** Replications. Default 4,000. */
  reps?: number
  /** Parent mean and SD for the simulation. The learner never sees them; only their ratio matters. */
  mu?: number
  sigma?: number
  label?: string
  tone?: PanelTone
}

export function TvsNormal({
  df: df0 = REFIT_DF,
  confidence: c0 = 0.95,
  n: n0 = REFIT_N,
  reps = T_SIM_REPS,
  mu = 0,
  sigma = 1,
  label = 'INTEL · t AGAINST THE NORMAL',
  tone = 'intel',
}: TvsNormalProps = {}) {
  const [view, setView] = useState<View>('curves')
  const [df, setDf] = useState(df0)
  const [level, setLevel] = useState<LevelKey>(String(c0.toFixed(2)) as LevelKey)
  const [n, setN] = useState(n0)
  const [overlay, setOverlay] = useState<Overlay>('t')

  const confidence = Number(level)
  const tCrit = tStar(confidence, df)
  const zCrit = zStar(confidence)

  /* The two tails at the cutoff everyone carries in their head from the normal table. */
  const tTail = 2 * t.sf(Z_95, df)
  const zTail = 2 * normal.sf(Z_95)

  const tPdf = useMemo(() => (x: number) => t.pdf(x, df), [df])
  const zPdf = useMemo(() => (x: number) => normal.pdf(x, 0, 1), [])

  /* ---- The simulation: (x̄ − μ)/(s/√n), one per sample, s estimated from the sample itself ---- */
  const simDf = n - 1
  const stats = useMemo(
    () => simulate('t-under-h0', { parent: 'normal', mu, sigma, n, mu0: mu }, seedFrom(T_SIM_SEED, n, mu, sigma, reps), reps),
    [n, mu, sigma, reps],
  )
  const beyond = useMemo(() => stats.filter((v) => Math.abs(v) >= Z_95).length, [stats])
  const simRate = beyond / stats.length
  const simTTail = 2 * t.sf(Z_95, simDf)

  const simPdf = useMemo(() => (overlay === 't' ? (x: number) => t.pdf(x, simDf) : (x: number) => normal.pdf(x, 0, 1)), [overlay, simDf])
  const simDomain = useMemo<[number, number]>(() => {
    const lo = Math.min(-5, Math.floor(Math.min(...stats)))
    const hi = Math.max(5, Math.ceil(Math.max(...stats)))
    return [Math.max(lo, -12), Math.min(hi, 12)]
  }, [stats])

  const ladder = DF_LADDER.map((d) => [fmtInt(d), fmt(tStar(confidence, d), 4), fmt(zCrit, 4), fmt(tStar(confidence, d) - zCrit, 4)] as const)

  const curveDescription =
    `The t distribution on ${fmtInt(df)} degrees of freedom drawn over the standard normal on the same axis. ` +
    `Both are centred at zero and symmetric; the t curve is shorter in the middle and thicker in both tails. ` +
    `At ${fmtPct(confidence, 0)} the t critical value is ${fmt(tCrit, 4)} against the normal's ${fmt(zCrit, 4)}, a difference of ${fmt(tCrit - zCrit, 4)}. ` +
    `The area beyond plus or minus ${fmt(Z_95, 2)} is ${fmt(tTail, 4)} under t and ${fmt(zTail, 4)} under the normal. The data table gives both densities across the axis.`

  const histogramDescription =
    `Histogram of ${fmtInt(stats.length)} standardized sample means, each computed from a fresh sample of ${fmtInt(n)} observations from a Normal population and each divided by its own sample standard deviation over the square root of ${fmtInt(n)}. ` +
    `The overlaid curve is ${overlay === 't' ? `the t distribution on ${fmtInt(simDf)} degrees of freedom` : 'the standard normal'}. ` +
    `${fmtInt(beyond)} of the ${fmtInt(stats.length)} statistics fell at or beyond plus or minus ${fmt(Z_95, 2)}, a rate of ${fmt(simRate, 4)}, against ${fmt(zTail, 4)} from the normal model and ${fmt(simTTail, 4)} from t on ${fmtInt(simDf)} degrees of freedom.`

  const heavy = simRate > zTail * 1.15

  return (
    <Panel
      label={label}
      status={view === 'curves' ? `df ${fmtInt(df)} · t* ${fmt(tCrit, 3)} · z* ${fmt(zCrit, 3)}` : `n = ${fmtInt(n)} · ${fmtInt(stats.length)} SAMPLES`}
      tone={tone}
      led="on"
      ariaLabel="Comparator: the t distribution against the standard normal"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<View>
            label="display"
            value={view}
            onChange={setView}
            options={[
              { value: 'curves', label: 'the two curves' },
              { value: 'simulation', label: 'simulate s in the denominator' },
            ]}
          />
          <Segmented<LevelKey>
            label="confidence level"
            value={level}
            onChange={setLevel}
            options={LEVELS.map((l) => ({ value: l, label: fmtPct(Number(l), 0) }))}
          />
          {view === 'curves' ? (
            <>
              <Slider label="degrees of freedom" value={df} min={1} max={60} step={1} onChange={setDf} format={fmtInt} />
              <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setDf(REFIT_DF)} disabled={df === REFIT_DF}>
                {fmtInt(REFIT_N)} HULLS → df {fmtInt(REFIT_DF)}
              </button>
            </>
          ) : (
            <>
              <Slider label="observations per sample (n)" value={n} min={3} max={60} step={1} onChange={setN} format={fmtInt} />
              <Segmented<Overlay>
                label="curve to overlay"
                value={overlay}
                onChange={setOverlay}
                options={[
                  { value: 't', label: `t(${fmtInt(simDf)})` },
                  { value: 'normal', label: 'standard normal' },
                ]}
              />
            </>
          )}
        </div>

        {view === 'curves' ? (
          <>
            <ReadoutGrid>
              <Readout label={`t* · df ${fmtInt(df)}`} value={fmt(tCrit, 4)} tone="intel" live />
              <Readout label="z*" value={fmt(zCrit, 4)} live />
              <Readout label="t* − z*" value={fmt(tCrit - zCrit, 4)} tone={tCrit - zCrit > 0.05 ? 'alert' : 'intel'} live />
              <Readout label="margin, as a share of the z margin" value={fmt(tCrit / zCrit, 4)} size="sm" live />
            </ReadoutGrid>
            <ReadoutGrid>
              <Readout label={`area beyond ±${fmt(Z_95, 2)} under t(${fmtInt(df)})`} value={fmt(tTail, 4)} tone="alert" size="sm" live />
              <Readout label={`area beyond ±${fmt(Z_95, 2)} under the normal`} value={fmt(zTail, 4)} size="sm" live />
              <Readout label="degrees of freedom" value={fmtInt(df)} size="sm" live />
              <Readout label="observations that would give this df" value={fmtInt(df + 1)} size="sm" live />
            </ReadoutGrid>

            <DensityCurve
              curves={[
                { pdf: tPdf, label: `t on ${fmtInt(df)} df`, color: 'alt' },
                { pdf: zPdf, label: 'standard normal', color: 'null', dashed: true },
              ]}
              domain={[-5, 5]}
              shade={[
                { from: Z_95, to: 5, curve: 0, color: 'shadeRejected', label: `t tail beyond ${fmt(Z_95, 2)}` },
                { from: -5, to: -Z_95, curve: 0, color: 'shadeRejected' },
              ]}
              references={[
                { x: tCrit, label: `t* ${fmt(tCrit, 3)}` },
                { x: zCrit, label: `z* ${fmt(zCrit, 3)}` },
              ]}
              xLabel="standardized distance from the mean"
              height={300}
              ariaLabel={`The t distribution on ${fmtInt(df)} degrees of freedom drawn over the standard normal`}
              description={curveDescription}
            />

            <Note live>
              At df {fmtInt(df)} the {fmtPct(confidence, 0)} critical value is {fmt(tCrit, 4)} where the normal table gives {fmt(zCrit, 4)}. Every margin built on it is{' '}
              {fmtPct(tCrit / zCrit - 1, 1)} wider. Run the slider up and watch the gap close: by df 30 it is {fmt(tStar(confidence, 30) - zCrit, 4)} and by df 100 it is{' '}
              {fmt(tStar(confidence, 100) - zCrit, 4)}. The curves converge; they never meet.
            </Note>
          </>
        ) : (
          <>
            <ReadoutGrid>
              <Readout label={`fell beyond ±${fmt(Z_95, 2)}`} value={`${fmtInt(beyond)} / ${fmtInt(stats.length)}`} tone={heavy ? 'alert' : 'intel'} live />
              <Readout label="that as a rate" value={fmt(simRate, 4)} tone={heavy ? 'alert' : 'intel'} live />
              <Readout label="the normal model predicts" value={fmt(zTail, 4)} size="sm" live />
              <Readout label={`t(${fmtInt(simDf)}) predicts`} value={fmt(simTTail, 4)} size="sm" live />
            </ReadoutGrid>

            <Histogram
              values={stats}
              binWidth={0.25}
              domain={simDomain}
              density
              curve={simPdf}
              curveLabel={overlay === 't' ? `t on ${fmtInt(simDf)} df` : 'standard normal'}
              barsLabel={`${fmtInt(stats.length)} samples of ${fmtInt(n)}, each standardized with its own s`}
              references={[
                { x: Z_95, label: fmt(Z_95, 2) },
                { x: -Z_95, label: fmt(-Z_95, 2) },
              ]}
              label="(x̄ − μ) ÷ (s ÷ √n)"
              height={300}
              ariaLabel={`Histogram of ${fmtInt(stats.length)} standardized sample means with ${overlay === 't' ? 'the t distribution' : 'the standard normal'} overlaid`}
              description={histogramDescription}
            />

            <Note tone={heavy ? 'warn' : 'muted'} live>
              Every sample here comes from the same Normal population, so the numerator is behaving. The denominator is the problem: each sample estimates σ with its own s, and a sample that
              happens to draw a small s produces a large statistic. {fmtInt(beyond)} of {fmtInt(stats.length)} landed past ±{fmt(Z_95, 2)}, a rate of {fmt(simRate, 4)}, where the normal model
              promised {fmt(zTail, 4)}. Switch the overlay and watch which curve the pile actually fits. Push n to 60 and the two overlays become hard to tell apart.
            </Note>
          </>
        )}

        <section aria-label="Critical values as degrees of freedom grow">
          <Subhead>t* against z*, at {fmtPct(confidence, 0)}</Subhead>
          <KeyTable
            ariaLabel={`Two-sided critical values at ${fmtPct(confidence, 0)} for the t distribution at a ladder of degrees of freedom, against the standard normal`}
            caption={`Two-sided ${fmtPct(confidence, 0)} critical values`}
            columns={['df', 't*', 'z*', 't* − z*']}
            rows={ladder.map((r) => [...r])}
            emphasisRow={DF_LADDER.findIndex((d) => d === REFIT_DF)}
          />
          <Note>
            df is the sample size less one, not the sample size. Twelve hulls give {fmtInt(REFIT_DF)}, and {fmtInt(REFIT_DF)} is the row that matters here. The table is also the answer to
            &ldquo;when can I stop bothering&rdquo;: never entirely, though past df 100 the difference has left the second decimal place.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
