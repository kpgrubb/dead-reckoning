/**
 * ENGINEERING · HEAT LEDGER (act-4-06) — the three loiter points priced in sink-hours.
 *
 * The left half is one option's cost distribution written out as a weighted sum: a column of x·p(x)
 * that adds to E[X], and a column of (x − μ)²·p(x) that adds to the variance. Beside them sit the two
 * numbers the Ensign reaches for first — the plain average of the possible values, and the single most
 * likely value — each labelled as the thing it is not.
 *
 * The right half is the comparator: three pmfs, the region above the cellar's capacity shaded in each,
 * and a table of expected cost against contact odds. The instrument does not choose. The far point has
 * the cheapest window and the worst chance of a contact; the near point has the best chance and a tail
 * that runs past the cellar. That trade is the decision beat, and it belongs to the Commander.
 *
 * Every number comes from `expectedValue` / `rvVariance` / `rvSd` / `rvProb` / `normal.sf` on the
 * `LOITER_OPTIONS` pmfs in `data.ts`.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components/Panel'
import { BarChart, Readout, ReadoutRow, Segmented, Slider, semanticColor } from '@/instruments/shared'
import { expectedValue, fmt, fmtPct, normal, rvProb, rvSd, rvVariance } from '@/lib/stats'
import { LOITER_OPTIONS, WATCH_IN_WRITING_HOURS, WATCH_WORKING_HOURS, type LoiterOption, type RangeBand } from './data'
import { KeyTable, Note, ProbabilityBar, Subhead, gridStyle, stackStyle, wideGridStyle } from './_ui'

export interface HeatBudgetPlannerProps {
  /** The loiter points on offer. */
  options?: readonly LoiterOption[]
  /** The cellar's working capacity, in sink-hours per window. */
  capacityHours?: number
  /** Which option's weighted sum is written out. */
  selected?: RangeBand
}

const CAPACITY_MIN = 48
const CAPACITY_MAX = 72

export function HeatBudgetPlanner({ options = LOITER_OPTIONS, capacityHours = WATCH_WORKING_HOURS, selected: selectedProp = 'middle' }: HeatBudgetPlannerProps) {
  const [capacity, setCapacity] = useState(capacityHours)
  const [band, setBand] = useState<RangeBand>(selectedProp)

  const option = options.find((o) => o.band === band) ?? options[0]
  const pmf = option.pmf

  /* ---- The weighted sum, term by term ---- */
  const mu = useMemo(() => expectedValue(pmf.values, pmf.probs), [pmf])
  const variance = useMemo(() => rvVariance(pmf.values, pmf.probs), [pmf])
  const sdHours = useMemo(() => rvSd(pmf.values, pmf.probs), [pmf])

  /** The two wrong answers 4-06 names. */
  const unweightedMean = useMemo(() => pmf.values.reduce((s, v) => s + v, 0) / pmf.values.length, [pmf])
  const modeIndex = useMemo(() => pmf.probs.indexOf(Math.max(...pmf.probs)), [pmf])
  const modeValue = pmf.values[modeIndex]

  const weightedRows = useMemo(
    () =>
      pmf.values.map((v, i) => {
        const p = pmf.probs[i]
        return [fmt(v, 0), fmt(p, 4), fmt(v * p, 3), fmt((v - mu) * (v - mu) * p, 4)] as const
      }),
    [pmf, mu],
  )
  const weightedTotalRow = [<strong key="t">Σ</strong>, fmt(pmf.probs.reduce((a, b) => a + b, 0), 4), fmt(mu, 3), fmt(variance, 4)] as const

  /* ---- The comparator ---- */
  const rows = useMemo(
    () =>
      options.map((o) => {
        const pExceedNormal = normal.sf(capacity, o.meanHours, o.sdHours)
        const pExceedTable = rvProb(o.pmf, (v) => v > capacity)
        return { o, pExceedNormal, pExceedTable }
      }),
    [options, capacity],
  )
  const atWorking = capacity === WATCH_WORKING_HOURS

  const comparator = rows.map(({ o, pExceedNormal }) => [
    o.label,
    fmt(expectedValue(o.pmf.values, o.pmf.probs), 1),
    fmt(rvSd(o.pmf.values, o.pmf.probs), 2),
    fmt(pExceedNormal, 4),
    fmt(o.pPerrineInRange, 2),
    String(o.closePasses),
    fmt(o.pSeenCold, 3),
  ])

  const selectedExceed = rows.find((r) => r.o.band === band) ?? rows[0]
  /** The cheapest and dearest windows by expected cost — the two ends of the trade. */
  const byCost = [...rows].sort((a, b) => a.o.meanHours - b.o.meanHours)
  const cheapest = byCost[0]
  const dearest = byCost[byCost.length - 1]

  return (
    <Panel label="ENGINEERING · HEAT LEDGER" status={`CELLAR ${fmt(capacity, 0)} H`} tone="engineering" led="on">
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<RangeBand>
            label="loiter point"
            value={band}
            onChange={setBand}
            options={options.map((o) => ({ value: o.band, label: o.label }))}
          />
          <Slider
            label="cellar capacity"
            value={capacity}
            min={CAPACITY_MIN}
            max={CAPACITY_MAX}
            step={1}
            units="h"
            onChange={setCapacity}
            format={(v) => fmt(v, 0)}
          />
        </div>

        <Note tone={atWorking ? 'muted' : 'warn'} live>
          {atWorking ? (
            <>
              The Chief works to {WATCH_WORKING_HOURS} hours and will put {WATCH_IN_WRITING_HOURS} in writing. Drag the capacity down to {WATCH_IN_WRITING_HOURS} and watch what the difference costs each option.
            </>
          ) : (
            <>
              Capacity set to {fmt(capacity, 0)} hours — {capacity < WATCH_WORKING_HOURS ? 'below' : 'above'} the Chief's working figure of {WATCH_WORKING_HOURS}. The distributions have not moved; only the line drawn across them has.
            </>
          )}
        </Note>

        <section aria-label="Expected value as a weighted sum">
          <Subhead>{option.label} · E[X] written out</Subhead>
          <ReadoutRow>
            <Readout label="E[X] · Σ x·p(x)" value={fmt(mu, 2)} units="h" tone="engineering" size="lg" live />
            <Readout label="Var(X) · Σ (x−μ)²·p(x)" value={fmt(variance, 2)} units="h²" tone="engineering" live />
            <Readout label="SD(X) · √Var" value={fmt(sdHours, 2)} units="h" tone="engineering" live />
            <Readout label={`P(cost > ${fmt(capacity, 0)} h)`} value={fmt(selectedExceed.pExceedNormal, 4)} tone="alert" live />
          </ReadoutRow>
          <ReadoutRow>
            <Readout label="plain average of the values — NOT E[X]" value={fmt(unweightedMean, 2)} units="h" size="sm" tone="alert" live />
            <Readout label="most likely value — A DIFFERENT THING" value={fmt(modeValue, 0)} units="h" size="sm" tone="alert" live />
            <Readout label="p at that value" value={fmt(pmf.probs[modeIndex], 4)} size="sm" live />
          </ReadoutRow>
          <Note tone="warn">
            Three numbers, three meanings. {fmt(unweightedMean, 2)} hours is the average of the cells on the axis, which treats a cost the window will almost never pay as the equal of the one it pays most often — it ignores the probabilities entirely. {fmt(modeValue, 0)} hours is the single most likely outcome, and expected value is not that either: E[X] is the long-run average cost of running this window many times, {fmt(mu, 2)} hours, and the ship need never pay exactly that amount on any one window.
          </Note>
          <KeyTable
            columns={['x · sink-hours', 'p(x)', 'x · p(x)', '(x − μ)² · p(x)']}
            rows={[...weightedRows, weightedTotalRow]}
            emphasisRow={weightedRows.length}
            caption={`${option.label}: the cost distribution as a weighted sum. The third column adds to E[X] = ${fmt(mu, 3)} h; the fourth adds to Var(X) = ${fmt(variance, 3)} h², and SD = √Var = ${fmt(sdHours, 3)} h.`}
            ariaLabel={`Weighted-sum table for the ${option.label}`}
          />
          <Note>{option.note}</Note>
        </section>

        <section aria-label="Option comparator">
          <Subhead>All three points · cost against contact</Subhead>
          <div style={wideGridStyle}>
            {rows.map(({ o, pExceedNormal }) => (
              <div key={o.band}>
                <BarChart
                  categories={o.pmf.values.map((v) => String(v))}
                  values={[...o.pmf.probs]}
                  highlight={o.pmf.values.map((v, i) => (v > capacity ? i : -1)).filter((i) => i >= 0)}
                  colors={o.pmf.values.map(() => semanticColor('null'))}
                  label={`${o.label} · sink-hours per window`}
                  valueLabel="probability"
                  showValues={false}
                  height={190}
                  ariaLabel={`Probability distribution of sink-hours for the ${o.label}, with the cells above ${fmt(capacity, 0)} hours shaded`}
                  description={`The ${o.label} costs ${fmt(o.meanHours, 0)} sink-hours on average with a standard deviation of ${fmt(o.sdHours, 0)} hours. The probability that a window costs more than the cellar's ${fmt(capacity, 0)} hours is ${fmt(pExceedNormal, 4)}. The data table lists every cell and its probability.`}
                />
                <ProbabilityBar
                  value={pExceedNormal}
                  label={`${o.label} · P(exceed ${fmt(capacity, 0)} h)`}
                  complementLabel="window completes cold"
                  color={semanticColor('rejected')}
                  digits={4}
                />
              </div>
            ))}
          </div>

          <KeyTable
            columns={['loiter point', 'E[sink-hours]', 'SD', `P(exceed ${fmt(capacity, 0)} h)`, 'P(Perrine hull in range)', 'close passes / window', 'P(seen while cold)']}
            rows={comparator}
            caption={`Expected cost, spread, and the two probabilities that pull against each other. Capacity ${fmt(capacity, 0)} sink-hours.`}
            ariaLabel="Loiter point comparator"
          />

          <div style={gridStyle}>
            {options.map((o) => (
              <ProbabilityBar key={o.band} value={o.pPerrineInRange} label={`${o.label} · P(a Perrine hull passes in range)`} complementLabel="no hull in range" digits={2} />
            ))}
          </div>

          <Note>
            Cheapest is not safest and safest is not most useful. The {cheapest.o.label} spends {fmt(expectedValue(cheapest.o.pmf.values, cheapest.o.pmf.probs), 0)} sink-hours on a window and overruns the cellar {fmtPct(cheapest.pExceedNormal, 1)} of the time, and a Perrine hull passes inside the Eyes' identification range about {fmtPct(cheapest.o.pPerrineInRange, 0)} of windows. The {dearest.o.label} spends {fmt(expectedValue(dearest.o.pmf.values, dearest.o.pmf.probs), 0)} and overruns {fmtPct(dearest.pExceedNormal, 1)}, and the hull passes {fmtPct(dearest.o.pPerrineInRange, 0)} of the time. Expected value ranks the cost. It does not rank the mission. This display makes no recommendation.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
