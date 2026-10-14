/**
 * TACTICAL · THE SLOPE HAS A SPREAD (act-9-01) — the sampling distribution of a fitted slope.
 *
 * The population is the 881 Perrine departures that came home. Their fuel was pumped to the
 * certified requirement within a per-departure one percent, so the true line is one tonne of fuel
 * per tonne required. Draw nineteen of them, fit a line, keep the slope, and do it two thousand
 * times: the slopes stack around one with a spread of about 0.012.
 *
 * What the learner does, and what each one reveals:
 *
 *   move n          the stack narrows as 1/√n, which is the whole of SE(b) = s/√Sxx in one control.
 *   move σ          extra measurement noise on the fuel column widens it, because the numerator of
 *                   that standard error is the scatter about the line and nothing else.
 *   DRAW 2,000      another two thousand samples, from a seed that advances with the click count.
 *   RESTORE         puts the canonical run back, so the number the mission beat expects is on the
 *                   panel again.
 *
 * The panel opens on `HONEST_SLOPES` from `./data` — the run the beat sheet's registry pinned —
 * held in initial state rather than re-simulated on mount, so the SD it reports is the SD the
 * dataset test asserts, to the last digit.
 *
 * Everything random goes through `rng('act-9-01/slope-sim', …)`; every number comes from
 * `@/lib/stats` or `./data`.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Histogram, Readout, Scatter, Slider } from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtPct, linearRegression, mean, sd } from '@/lib/stats'
import {
  FUEL_NOISE_SD,
  HONEST_SLOPES,
  NINETEEN_SE_B,
  SLOPE_SIM_N,
  SLOPE_SIM_REPS,
  honest881,
  honestRequired,
  simulateSlopes,
} from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

/** The physics: an honest hull is fuelled to the requirement, one tonne per tonne. */
const BETA_TRUE = 1

const N_MIN = 8
const N_MAX = 80
const NOISE_MAX = 0.03
const NOISE_STEP = 0.0025

/** Most recent run of the simulator: the stack of slopes and the settings that produced it. */
interface Run {
  slopes: readonly number[]
  n: number
  noise: number
  index: number
  /** True while the panel is still showing the registry's canonical two thousand. */
  canonical: boolean
}

const CANONICAL: Run = { slopes: HONEST_SLOPES, n: SLOPE_SIM_N, noise: 0, index: 0, canonical: true }

/**
 * One sample of `n` honest departures kept whole, so the learner can see the scatter a single
 * slope was fitted to. Drawn from its own seed: re-deriving it from the run's generator would mean
 * replaying two thousand samples to reach the last one.
 */
function oneSample(index: number, n: number, noise: number) {
  const r = rng('act-9-01/slope-sim/one', index, n, noise)
  const idx = r.sample([...Array(honest881.length).keys()], n)
  const points = idx.map((i) => ({
    x: honest881[i].requiredFuel,
    y: honest881[i].fuelLoaded * (noise > 0 ? 1 + r.normal(0, noise) : 1),
    label: honest881[i].hull,
  }))
  return { points, fit: linearRegression(points.map((p) => p.x), points.map((p) => p.y)) }
}

export interface SlopeSpreadSimulatorProps {
  label?: string
  tone?: PanelTone
}

export function SlopeSpreadSimulator({ label = 'TACTICAL · THE SLOPE HAS A SPREAD', tone = 'tactical' }: SlopeSpreadSimulatorProps = {}) {
  const [n, setN] = useState(SLOPE_SIM_N)
  const [noise, setNoise] = useState(0)
  const [run, setRun] = useState<Run>(CANONICAL)

  const slopeMean = useMemo(() => mean(run.slopes), [run.slopes])
  const slopeSd = useMemo(() => sd(run.slopes), [run.slopes])
  const sample = useMemo(() => oneSample(run.index, run.n, run.noise), [run.index, run.n, run.noise])

  /**
   * σ/(σₓ√n). The response's scatter about the line is the fuel column's own one percent and the
   * extra noise the slider adds, combined in quadrature and carried by the mean requirement.
   */
  const sigmaFraction = Math.sqrt(FUEL_NOISE_SD * FUEL_NOISE_SD + run.noise * run.noise)
  const theoretical = (sigmaFraction * mean(honestRequired)) / (sd(honestRequired) * Math.sqrt(run.n))

  const dirty = n !== run.n || noise !== run.noise
  const draw = () => {
    const index = run.index + 1
    setRun({ slopes: simulateSlopes(rng('act-9-01/slope-sim', index), n, SLOPE_SIM_REPS, noise), n, noise, index, canonical: false })
  }
  const restore = () => {
    setN(SLOPE_SIM_N)
    setNoise(0)
    setRun(CANONICAL)
  }

  const histogramDescription =
    `Two thousand least-squares slopes, each fitted to a fresh sample of ${fmtInt(run.n)} honest Perrine departures with fuel loaded regressed on required Lane fuel. ` +
    `The stack is centred at ${fmt(slopeMean, 4)} tonnes of fuel per tonne required, against a true slope of ${fmt(BETA_TRUE, 2)}, and its standard deviation is ${fmt(slopeSd, 4)}. ` +
    `The textbook value σ/(σₓ√n) for this sample size is ${fmt(theoretical, 4)}. The lowest slope drawn was ${fmt(Math.min(...run.slopes), 4)} and the highest ${fmt(Math.max(...run.slopes), 4)}. ` +
    `The data table gives the binned counts.`

  const scatterDescription =
    `One of those samples, drawn whole: ${fmtInt(run.n)} honest departures with the fuel the Bureau required on the horizontal axis and the fuel actually pumped on the vertical, ` +
    `with the least-squares line fitted to them. Its slope is ${fmt(sample.fit.slope, 4)} and r² is ${fmt(sample.fit.r2, 4)}. That one number is one bar's worth of the stack above.`

  return (
    <Panel
      label={label}
      status={`n = ${fmtInt(run.n)} · SD(b) ${fmt(slopeSd, 3)}${run.canonical ? '' : ` · RUN ${fmtInt(run.index)}`}`}
      tone={tone}
      led={run.canonical ? 'on' : 'busy'}
      ariaLabel="Slope spread simulator: two thousand fitted slopes from repeated samples of honest Perrine departures"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider label="sample size n" value={n} min={N_MIN} max={N_MAX} step={1} onChange={setN} format={fmtInt} />
          <Slider
            label="extra measurement noise σ"
            value={noise}
            min={0}
            max={NOISE_MAX}
            step={NOISE_STEP}
            onChange={setNoise}
            format={(v) => fmtPct(v, 2)}
          />
          <button type="button" className="dr-btn dr-btn--primary dr-btn--sm" onClick={draw}>
            DRAW 2,000
          </button>
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={restore} disabled={run.canonical && !dirty}>
            RESTORE THE STANDARD RUN
          </button>
        </div>

        <ReadoutGrid>
          <Readout label="mean of b" value={fmt(slopeMean, 4)} tone="tactical" live />
          <Readout label="SD of b · the simulated spread" value={fmt(slopeSd, 3)} tone="tactical" live />
          <Readout label="σ / (σₓ√n) · the textbook value" value={fmt(theoretical, 3)} size="sm" live />
          <Readout label="samples fitted" value={fmtInt(run.slopes.length)} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="true slope β" value={fmt(BETA_TRUE, 2)} units="t/t" size="sm" />
          <Readout label="this sample's b" value={fmt(sample.fit.slope, 4)} size="sm" live />
          <Readout label="SE(b) printed for the nineteen" value={fmt(NINETEEN_SE_B, 4)} size="sm" />
          <Readout label="how many honest spreads that is" value={fmt(NINETEEN_SE_B / slopeSd, 2)} tone="alert" size="sm" live />
        </ReadoutGrid>

        <Histogram
          values={run.slopes}
          label="fitted slope b · tonnes of fuel per tonne required"
          references={[{ x: BETA_TRUE, label: `β = ${fmt(BETA_TRUE, 2)}`, color: 'reference' }]}
          barsLabel={`${fmtInt(run.slopes.length)} fitted slopes`}
          height={280}
          ariaLabel={`Histogram of ${fmtInt(run.slopes.length)} least-squares slopes fitted to samples of ${fmtInt(run.n)} honest Perrine departures`}
          description={histogramDescription}
        />

        <Note live>
          {run.canonical
            ? `The standard run: ${fmtInt(SLOPE_SIM_REPS)} samples of ${fmtInt(SLOPE_SIM_N)}, no extra noise. The slopes average ${fmt(slopeMean, 4)} — β recovered — and their standard deviation is ${fmt(slopeSd, 3)}. That is the yardstick the nineteen's own SE(b) of ${fmt(NINETEEN_SE_B, 4)} is read against.`
            : `Run ${fmtInt(run.index)}: ${fmtInt(run.slopes.length)} samples of ${fmtInt(run.n)}${run.noise > 0 ? ` with ${fmtPct(run.noise, 2)} extra noise on the fuel column` : ''}. SD of b = ${fmt(slopeSd, 3)} against the textbook ${fmt(theoretical, 3)}.`}
          {dirty ? ' The sliders have moved since the last draw — press DRAW 2,000 to fit them.' : ''}
        </Note>

        <section aria-label="One of the samples, drawn whole">
          <Subhead>Where one slope comes from</Subhead>
          <Scatter
            points={sample.points}
            line={{ slope: sample.fit.slope, intercept: sample.fit.intercept }}
            xLabel="required fuel (t)"
            yLabel="fuel loaded (t)"
            height={280}
            ariaLabel={`Scatterplot of fuel loaded against required fuel for one sample of ${fmtInt(run.n)} honest departures, with its least-squares line`}
            description={scatterDescription}
          />
          <Note>
            Nineteen points, one line, one slope. The histogram above is two thousand of these, and the spread in it is not a property of any one sample: it is what a slope does when the
            sample changes underneath it.
          </Note>
        </section>

        <section aria-label="Spread of b against sample size">
          <Subhead>What the sample size buys</Subhead>
          <KeyTable
            ariaLabel="Textbook standard deviation of the fitted slope at four sample sizes, for the honest population"
            caption={`σ/(σₓ√n) for the 881 honest departures${run.noise > 0 ? `, with ${fmtPct(run.noise, 2)} extra noise` : ''}`}
            columns={['n', 'σ / (σₓ√n)', 'against n = 19']}
            rows={[10, SLOPE_SIM_N, 40, 80].map((k) => {
              const value = (sigmaFraction * mean(honestRequired)) / (sd(honestRequired) * Math.sqrt(k))
              const at19 = (sigmaFraction * mean(honestRequired)) / (sd(honestRequired) * Math.sqrt(SLOPE_SIM_N))
              return [fmtInt(k), fmt(value, 4), `× ${fmt(value / at19, 2)}`]
            })}
            emphasisRow={1}
          />
          <Note tone="warn">
            Four times the departures buys half the spread, not a quarter of it. Extra noise on the fuel column moves it the other way and in direct proportion: the standard error of a slope
            is the scatter about the line divided by how far the x values reach.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
