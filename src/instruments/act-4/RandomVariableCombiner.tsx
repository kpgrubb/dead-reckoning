/**
 * ENGINEERING · LOAD COMBINER (act-4-07) — what happens to the spread when loads are added together.
 *
 * Mode A takes two independent subsystem loads, lets the learner move both means and both SDs, and
 * draws the sum against its parents. Beside the right answer, √(σ₁² + σ₂²), sit the two wrong ones:
 * the sum of the SDs (too pessimistic, and the one Ebele writes down) and the yard's "they average
 * out" figure (too generous). A difference toggle shows the mean subtracting while the variance still
 * adds; a linear-transform control shows the multiplier landing on the SD once and inside the variance
 * twice.
 *
 * Mode B is the whole Watch budget: six loads, a variance column that adds to 386 kW², and the
 * endurance that 78 GJ buys at the load that results. Sandoval's rule holds throughout — never a
 * number without its ±.
 *
 * Moments come from `sumRV` / `differenceRV` / `combineRV` / `linearTransformRV`; the tail probability
 * from `normal.sf`; the endurance arithmetic from `loadForEndurance` / `enduranceHours` in `data.ts`.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { BarChart, DensityCurve, Readout, ReadoutRow, Segmented, Slider, type Curve } from '@/instruments/shared'
import { combineRV, differenceRV, fmt, fmtPct, linearTransformRV, normal, sumRV, type Moments } from '@/lib/stats'
import {
  NAIVE_SUM_OF_SDS_KW,
  P_SATURATE_BEFORE_60,
  P_SATURATE_BEFORE_64,
  SINK_CAPACITY_GJ,
  WATCH_IN_WRITING_HOURS,
  WATCH_SD_KW,
  WATCH_SUBSYSTEMS,
  WATCH_VARIANCE,
  WATCH_WORKING_HOURS,
  YARD_MARGIN_KW,
  enduranceHours,
  loadForEndurance,
  type Subsystem,
} from './data'
import { KeyTable, Note, Subhead, stackStyle } from './_ui'

export interface RandomVariableCombinerProps {
  /** The Watch-profile subsystem loads. */
  subsystems?: readonly Subsystem[]
  /** Sink capacity in gigajoules. */
  capacityGJ?: number
  /** The endurance the tail probability is read at, in hours. */
  thresholdHours?: number
}

type Mode = 'two' | 'budget'
type Combination = 'sum' | 'difference' | 'transform'
type Independence = 'independent' | 'correlated'

const moments = (mean: number, sd: number): Moments => ({ mean, variance: sd * sd, sd })

export function RandomVariableCombiner({ subsystems = WATCH_SUBSYSTEMS, capacityGJ = SINK_CAPACITY_GJ, thresholdHours = WATCH_WORKING_HOURS }: RandomVariableCombinerProps) {
  const first = subsystems.find((s) => s.id === 'computing') ?? subsystems[0]
  const second = subsystems.find((s) => s.id === 'cryo') ?? subsystems[Math.min(1, subsystems.length - 1)]

  const [mode, setMode] = useState<Mode>('two')
  const [combination, setCombination] = useState<Combination>('sum')
  const [mu1, setMu1] = useState(first.meanKw)
  const [sd1, setSd1] = useState(first.sdKw)
  const [mu2, setMu2] = useState(second.meanKw)
  const [sd2, setSd2] = useState(second.sdKw)
  const [a, setA] = useState(1.2)
  const [b, setB] = useState(0)
  const [threshold, setThreshold] = useState(thresholdHours)
  const [independence, setIndependence] = useState<Independence>('independent')
  const [rho, setRho] = useState(0.4)

  /* ================================ Mode A — two loads ================================ */
  const X = moments(mu1, sd1)
  const Y = moments(mu2, sd2)
  const sum = sumRV(X, Y)
  const diff = differenceRV(X, Y)
  const transformed = linearTransformRV(X, a, b) as Moments
  const result = combination === 'sum' ? sum : combination === 'difference' ? diff : transformed

  /** The three answers 4-07 puts side by side. */
  const rightSd = Math.sqrt(sd1 * sd1 + sd2 * sd2)
  const naiveSd = sd1 + sd2
  const averagedSd = Math.sqrt((sd1 * sd1 + sd2 * sd2) / 2)

  const domain = useMemo<[number, number]>(() => {
    const centres = [X.mean, Y.mean, result.mean]
    const spreads = [X.sd, Y.sd, result.sd]
    const lo = Math.min(...centres.map((c, i) => c - 4 * spreads[i]))
    const hi = Math.max(...centres.map((c, i) => c + 4 * spreads[i]))
    return [lo, hi]
  }, [X.mean, X.sd, Y.mean, Y.sd, result.mean, result.sd])

  const resultLabel = combination === 'sum' ? 'X + Y' : combination === 'difference' ? 'X − Y' : `${fmt(a, 2)}X ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b), 0)}`
  const curves: Curve[] = [
    { pdf: (x) => normal.pdf(x, X.mean, X.sd), label: `X · ${first.name} (${fmt(X.mean, 0)} ± ${fmt(X.sd, 0)} kW)`, color: 'null', dashed: true },
    { pdf: (x) => normal.pdf(x, Y.mean, Y.sd), label: `Y · ${second.name} (${fmt(Y.mean, 0)} ± ${fmt(Y.sd, 0)} kW)`, color: 'alt', dashed: true },
    { pdf: (x) => normal.pdf(x, result.mean, result.sd), label: `${resultLabel} (${fmt(result.mean, 1)} ± ${fmt(result.sd, 2)} kW)`, color: 'fit' },
  ]

  /* ================================ Mode B — the Watch budget ================================ */
  const budgetMean = subsystems.reduce((s, x) => s + x.meanKw, 0)
  const budgetVariance = subsystems.reduce((s, x) => s + x.sdKw * x.sdKw, 0)
  const budgetSumOfSds = subsystems.reduce((s, x) => s + x.sdKw, 0)
  /** Σσᵢ² + ρ((Σσᵢ)² − Σσᵢ²) — a common pairwise correlation, for display only. */
  const correlatedVariance = budgetVariance + rho * (budgetSumOfSds * budgetSumOfSds - budgetVariance)
  const shownVariance = independence === 'independent' ? budgetVariance : correlatedVariance
  const shownSd = Math.sqrt(Math.max(0, shownVariance))

  /** The same total from `combineRV`, to show the six loads are one linear combination. */
  const combined = useMemo(
    () => combineRV(subsystems.map((s) => moments(s.meanKw, s.sdKw)), subsystems.map(() => 1)),
    [subsystems],
  )

  const capacityScale = capacityGJ / SINK_CAPACITY_GJ
  const loadFor = (hours: number) => loadForEndurance(hours) * capacityScale
  const enduranceFor = (loadKw: number) => enduranceHours(loadKw) * capacityScale
  const saturateBefore = (hours: number) => normal.sf(loadFor(hours), budgetMean, shownSd)
  const pThreshold = saturateBefore(threshold)

  const budgetRows = subsystems.map((s) => [s.name, fmt(s.meanKw, 0), fmt(s.sdKw, 0), fmt(s.sdKw * s.sdKw, 0)])
  const budgetTotal = [<strong key="t">total · Watch</strong>, fmt(budgetMean, 0), <em key="s">{fmt(budgetSumOfSds, 0)} — not the answer</em>, fmt(budgetVariance, 0)]

  const marginCategories = ['Σσ · added', '√Σσ² · right', 'yard spec']
  const marginValues = [budgetSumOfSds, Math.sqrt(budgetVariance), YARD_MARGIN_KW]

  return (
    <Panel
      label="ENGINEERING · LOAD COMBINER"
      status={mode === 'two' ? `${resultLabel} · ${fmt(result.mean, 0)} ± ${fmt(result.sd, 1)} kW` : `${fmt(budgetMean, 0)} ± ${fmt(shownSd, 1)} kW`}
      tone="engineering"
      led="on"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Mode>
            label="scope"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'two', label: 'two loads' },
              { value: 'budget', label: 'the whole Watch budget' },
            ]}
          />
        </div>

        {mode === 'two' ? (
          <>
            <div className="dr-controls">
              <Segmented<Combination>
                label="combination"
                value={combination}
                onChange={setCombination}
                options={[
                  { value: 'sum', label: 'X + Y' },
                  { value: 'difference', label: 'X − Y' },
                  { value: 'transform', label: 'aX + b' },
                ]}
              />
            </div>
            <div className="dr-controls">
              <Slider label={`μ₁ · ${first.name}`} value={mu1} min={0} max={200} step={1} units="kW" onChange={setMu1} format={(v) => fmt(v, 0)} />
              <Slider label="σ₁" value={sd1} min={1} max={40} step={0.5} units="kW" onChange={setSd1} format={(v) => fmt(v, 1)} />
              <Slider label={`μ₂ · ${second.name}`} value={mu2} min={0} max={200} step={1} units="kW" onChange={setMu2} format={(v) => fmt(v, 0)} />
              <Slider label="σ₂" value={sd2} min={1} max={40} step={0.5} units="kW" onChange={setSd2} format={(v) => fmt(v, 1)} />
            </div>
            {combination === 'transform' && (
              <div className="dr-controls">
                <Slider label="a · multiplier" value={a} min={-3} max={3} step={0.05} onChange={setA} format={(v) => fmt(v, 2)} />
                <Slider label="b · offset" value={b} min={-100} max={100} step={1} units="kW" onChange={setB} format={(v) => fmt(v, 0)} />
              </div>
            )}

            <ReadoutRow>
              <Readout label={combination === 'difference' ? 'μ₁ − μ₂' : combination === 'transform' ? 'aμ₁ + b' : 'μ₁ + μ₂'} value={fmt(result.mean, 2)} units="kW" tone="engineering" size="lg" live />
              <Readout label={combination === 'transform' ? '|a|σ₁ · right' : '√(σ₁² + σ₂²) · right'} value={fmt(result.sd, 3)} units="kW" tone="engineering" size="lg" live />
              <Readout label="variance" value={fmt(result.variance, 2)} units="kW²" size="sm" live />
            </ReadoutRow>
            {combination !== 'transform' && (
              <ReadoutRow>
                <Readout label="σ₁ + σ₂ · WRONG, too pessimistic" value={fmt(naiveSd, 3)} units="kW" size="sm" tone="alert" live />
                <Readout label="√((σ₁² + σ₂²)/2) · WRONG, too generous" value={fmt(averagedSd, 3)} units="kW" size="sm" tone="alert" live />
                <Readout label="how much the naive sum overstates" value={fmt(naiveSd - rightSd, 3)} units="kW" size="sm" live />
              </ReadoutRow>
            )}

            <DensityCurve
              curves={curves}
              domain={domain}
              xLabel="load (kW)"
              height={260}
              ariaLabel={`Normal densities of two independent subsystem loads and their ${combination === 'sum' ? 'sum' : combination === 'difference' ? 'difference' : 'linear transform'}`}
              description={`${first.name} is modelled as ${fmt(X.mean, 0)} ± ${fmt(X.sd, 0)} kW and ${second.name} as ${fmt(Y.mean, 0)} ± ${fmt(Y.sd, 0)} kW. ${resultLabel} has mean ${fmt(result.mean, 2)} kW and standard deviation ${fmt(result.sd, 3)} kW. The data table gives the density of each curve across the load axis.`}
            />

            {combination === 'sum' && (
              <Note tone="ok" live>
                Means add: {fmt(mu1, 0)} + {fmt(mu2, 0)} = {fmt(sum.mean, 0)} kW. Variances add: {fmt(sd1 * sd1, 1)} + {fmt(sd2 * sd2, 1)} = {fmt(sum.variance, 1)} kW², so the SD of the sum is √{fmt(sum.variance, 1)} = {fmt(sum.sd, 3)} kW. Standard deviations do not add. Adding them gives {fmt(naiveSd, 3)} kW, which assumes both loads run high together every time; the two systems draw on different hardware, so most of the time one is high while the other is not, and the spreads partly cancel. The curve for the sum is wider than either parent and narrower than the two widths laid end to end.
              </Note>
            )}
            {combination === 'difference' && (
              <Note tone="warn" live>
                The mean subtracts: {fmt(mu1, 0)} − {fmt(mu2, 0)} = {fmt(diff.mean, 0)} kW. The variance still adds: {fmt(sd1 * sd1, 1)} + {fmt(sd2 * sd2, 1)} = {fmt(diff.variance, 1)} kW², so SD(X − Y) = {fmt(diff.sd, 3)} kW — the same number the sum had. Subtracting variances is the standard error here: uncertainty in either load makes the difference less certain, never more. The only way the spread of a difference could fall is if the two loads moved together, and independent systems do not.
              </Note>
            )}
            {combination === 'transform' && (
              <Note tone="ok" live>
                aX + b with a = {fmt(a, 2)} and b = {fmt(b, 0)} kW: the mean goes to aμ + b = {fmt(transformed.mean, 2)} kW, and the SD goes to |a|σ = {fmt(transformed.sd, 3)} kW. The offset shifts the centre and leaves the spread alone; the multiplier scales both, but inside the variance it arrives squared — variance {fmt(X.variance, 2)} → {fmt(transformed.variance, 2)} kW², a factor of {fmt(a * a, 3)}. A negative a flips the distribution and the SD takes the absolute value, because spread has no sign.
              </Note>
            )}
          </>
        ) : (
          <>
            <div className="dr-controls">
              <Segmented<Independence>
                label="independence"
                value={independence}
                onChange={setIndependence}
                options={[
                  { value: 'independent', label: 'independent loads' },
                  { value: 'correlated', label: 'add a correlation term' },
                ]}
              />
              {independence === 'correlated' && <Slider label="ρ · pairwise correlation" value={rho} min={0} max={0.9} step={0.05} onChange={setRho} format={(v) => fmt(v, 2)} />}
              <Slider label="endurance threshold" value={threshold} min={40} max={90} step={1} units="h" onChange={setThreshold} format={(v) => fmt(v, 0)} />
            </div>

            <ReadoutRow>
              <Readout label="total mean load" value={fmt(budgetMean, 0)} units="kW" tone="engineering" size="lg" />
              <Readout label="Σ variance" value={fmt(shownVariance, 0)} units="kW²" tone="engineering" live />
              <Readout label="total SD · √Σσ²" value={fmt(shownSd, 2)} units="kW" tone="engineering" size="lg" live />
              <Readout label="combineRV check" value={fmt(combined.sd, 2)} units="kW" size="sm" />
            </ReadoutRow>
            <ReadoutRow>
              <Readout label="Σσ · SDs added — WRONG" value={fmt(budgetSumOfSds, 0)} units="kW" size="sm" tone="alert" />
              <Readout label="yard spec sheet — WRONG" value={fmt(YARD_MARGIN_KW, 0)} units="kW" size="sm" tone="alert" />
              <Readout label="registry · √386" value={fmt(WATCH_SD_KW, 2)} units="kW" size="sm" />
            </ReadoutRow>

            <KeyTable
              columns={['subsystem', 'mean kW', 'SD kW', 'variance kW²']}
              rows={[...budgetRows, budgetTotal]}
              emphasisRow={budgetRows.length}
              caption={`The six Watch loads. Only the variance column adds: ${fmt(budgetVariance, 0)} kW², and √${fmt(budgetVariance, 0)} = ${fmt(Math.sqrt(budgetVariance), 2)} kW. The SD column sums to ${fmt(budgetSumOfSds, 0)} kW, which is not the standard deviation of anything.`}
              ariaLabel="Watch subsystem load budget"
            />

            <Subhead>Three margins on the same ship</Subhead>
            <BarChart
              categories={marginCategories}
              values={marginValues}
              highlight={[1]}
              label="margin on the 320 kW Watch load"
              valueLabel="kW"
              height={200}
              ariaLabel="Three candidate margins on the Watch load: the sum of the standard deviations, the square root of the summed variances, and the yard's spec-sheet figure"
              description={`The sum of the six standard deviations is ${fmt(budgetSumOfSds, 0)} kW — too pessimistic, because it assumes every load runs high at once. The square root of the summed variances is ${fmt(Math.sqrt(budgetVariance), 2)} kW — the right answer for independent loads. The yard's spec sheet quotes ${fmt(YARD_MARGIN_KW, 0)} kW, as if six independent errors averaged away — too generous. The data table lists all three.`}
            />
            <Note tone="warn">
              {fmt(budgetSumOfSds, 0)} kW says every subsystem misbehaves in the same direction on the same watch. {fmt(YARD_MARGIN_KW, 0)} kW says they cancel almost perfectly. {fmt(Math.sqrt(budgetVariance), 2)} kW is what independence actually buys: the squares add, the root is taken once, and the answer sits between the two errors and nearer the small one.
            </Note>

            <Subhead>Kilowatts into hours</Subhead>
            <ReadoutRow>
              <Readout label={`endurance at ${fmt(budgetMean, 0)} kW`} value={fmt(enduranceFor(budgetMean), 1)} units="h" tone="engineering" />
              <Readout label={`load that empties ${fmt(capacityGJ, 0)} GJ in ${fmt(threshold, 0)} h`} value={fmt(loadFor(threshold), 1)} units="kW" size="sm" live />
              <Readout label={`P(saturates before ${fmt(threshold, 0)} h)`} value={fmt(pThreshold, 4)} tone="alert" size="lg" live />
              <Readout label={`registry · before ${WATCH_WORKING_HOURS} h`} value={fmt(P_SATURATE_BEFORE_64, 4)} size="sm" />
              <Readout label={`registry · before ${WATCH_IN_WRITING_HOURS} h`} value={fmt(P_SATURATE_BEFORE_60, 4)} size="sm" />
            </ReadoutRow>
            <Note live>
              {fmt(capacityGJ, 0)} GJ divided by {fmt(loadFor(threshold), 1)} kW is {fmt(threshold, 0)} hours, so the cellar runs out early exactly when the realized load comes in above {fmt(loadFor(threshold), 1)} kW. On N({fmt(budgetMean, 0)}, {fmt(shownSd, 2)}) that is a probability of {fmt(pThreshold, 4)} — {fmtPct(pThreshold, 1)} of windows. The Chief works to {WATCH_WORKING_HOURS} hours, where the risk is {fmt(saturateBefore(WATCH_WORKING_HOURS), 4)}, and puts {WATCH_IN_WRITING_HOURS} in writing, where it is {fmt(saturateBefore(WATCH_IN_WRITING_HOURS), 4)}. Four hours of margin buys an order of magnitude.
            </Note>

            <Note tone={independence === 'correlated' ? 'alert' : 'muted'} live>
              {independence === 'correlated' ? (
                <>
                  With a common pairwise correlation of ρ = {fmt(rho, 2)} the variance carries a cross term as well as the squares, and the total SD moves from {fmt(Math.sqrt(budgetVariance), 2)} to {fmt(shownSd, 2)} kW. This is a display, not a procedure: the AP rule is that variances add <em>for independent random variables</em>, and nothing here estimates ρ. It is on screen only so the assumption is visible when it is made.
                </>
              ) : (
                <>
                  The variances add because the six loads are treated as independent: scrubbers, processors, the transmitter, the skin loops, the pumps and sixteen people draw on different hardware, and one running high does not make another run high. State that assumption whenever you use the rule. The registry figure is {fmt(WATCH_VARIANCE, 0)} kW² and {fmt(WATCH_SD_KW, 2)} kW against a naive {fmt(NAIVE_SUM_OF_SDS_KW, 0)} kW.
                </>
              )}
            </Note>
          </>
        )}
      </div>
    </Panel>
  )
}
