/**
 * INTEL · GOODNESS OF FIT (act-8-01, and the contribution bars again in act-8-02).
 *
 * Three things the learner does, and each one reveals a different part of the procedure:
 *
 *   accumulate    a stepper walks the categories one at a time and Σ(O − E)²/E builds in front of
 *                 you. A statistic that arrives whole hides which category paid for it.
 *   switch view   observed bars with the expected marker on each, or the contributions themselves.
 *                 The tallest observed bar and the largest contribution are rarely the same bar.
 *   change basis  counts, percentages, or proportions. The arithmetic runs identically on all
 *                 three and only one of them is the test: percentages inflate the statistic by
 *                 100/n and proportions shrink it by n, so the decision flips with the units.
 *
 * Every number comes from `chiSquareGOF` in `@/lib/stats`; the component owns no arithmetic.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components'
import type { PanelTone } from '@/components/Panel'
import { BarChart, Readout, Segmented, Slider } from '@/instruments/shared'
import { chiSquareGOF, fmt, fmtInt, fmtP, fmtPct, round } from '@/lib/stats'
import { CARGO_CATEGORIES, CARGO_LABELS, LANE_CARGO_PROBS, cargoObserved } from './data'
import { ConditionList, KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

type View = 'observed' | 'contribution'
type Basis = 'counts' | 'percent' | 'proportion'

const VIEWS = [
  { value: 'observed' as const, label: 'observed vs expected' },
  { value: 'contribution' as const, label: 'contributions' },
]

const BASES = [
  { value: 'counts' as const, label: 'counts' },
  { value: 'percent' as const, label: 'percentages' },
  { value: 'proportion' as const, label: 'proportions' },
]

const BASIS_NOUN: Record<Basis, string> = { counts: 'counts', percent: 'percentages', proportion: 'proportions' }

export interface GofVisualiserProps {
  /** Observed counts, in category order. Defaults to the thirty-one lost hulls' cargo column. */
  observed?: readonly number[]
  /** The claimed distribution. Defaults to the Lane's declared mix. */
  probs?: readonly number[]
  categories?: readonly string[]
  /** Axis labels, if they should differ from the category names. */
  labels?: readonly string[]
  /** Population the sample was drawn from, for the 10% condition. */
  populationSize?: number
  /** What the table is of, for the captions. */
  caseName?: string
  label?: string
  tone?: PanelTone
  initialView?: View
}

export function GofVisualiser({
  observed = cargoObserved,
  probs = LANE_CARGO_PROBS,
  categories = CARGO_CATEGORIES,
  labels,
  populationSize = 100_000,
  caseName = 'the cargo column of the thirty-one',
  label = 'INTEL · GOODNESS OF FIT',
  tone = 'intel',
  initialView = 'observed',
}: GofVisualiserProps = {}) {
  const k = categories.length
  const [view, setView] = useState<View>(initialView)
  const [basis, setBasis] = useState<Basis>('counts')
  const [steps, setSteps] = useState(k)

  const n = observed.reduce((a, b) => a + b, 0)
  const axis = labels ?? (categories === CARGO_CATEGORIES ? CARGO_LABELS : categories)

  const gof = useMemo(
    () => chiSquareGOF({ observed, probs, categories, random: true, populationSize }),
    [observed, probs, categories, populationSize],
  )

  /** counts → 1, percentages → 100/n, proportions → 1/n. */
  const factor = basis === 'counts' ? 1 : basis === 'percent' ? 100 / n : 1 / n
  const shownObserved = useMemo(() => observed.map((o) => o * factor), [observed, factor])
  const shownExpected = useMemo(() => gof.expected.map((e) => e * factor), [gof, factor])
  const shown = useMemo(
    () => (basis === 'counts' ? gof : chiSquareGOF({ observed: shownObserved, expected: shownExpected, categories })),
    [basis, gof, shownObserved, shownExpected, categories],
  )

  const digits = basis === 'proportion' ? 4 : 2
  const running = shown.contributions.slice(0, steps).reduce((a, b) => a + b, 0)
  const complete = steps >= k
  const driver = shown.largestContributor
  const share = shown.contributions[driver] / shown.statistic

  // The chart prints each bar's own value beside it, so round for the axis rather than shipping
  // 67.74193548 to a label. The statistic and the table below still run on full precision.
  const forAxis = (xs: readonly number[]) => xs.map((x) => round(x, digits))
  const barValues = forAxis(view === 'observed' ? shownObserved : shown.contributions)
  const barExpected = view === 'observed' ? forAxis(shownExpected) : undefined
  const valueLabel = view === 'observed' ? BASIS_NOUN[basis] : '(O − E)² / E'

  const tableRows = categories.map((c, i) => [
    c,
    fmtPct(probs[i], 0),
    fmt(shownObserved[i], digits),
    fmt(shownExpected[i], digits),
    fmt(shownObserved[i] - shownExpected[i], digits),
    fmt(shown.contributions[i], digits),
    i < steps ? fmt(shown.contributions.slice(0, i + 1).reduce((a, b) => a + b, 0), digits) : '—',
  ])

  const description =
    `Goodness-of-fit display for ${caseName}, ${fmtInt(k)} categories on ${fmtInt(n)} observations, read as ${BASIS_NOUN[basis]}. ` +
    (view === 'observed'
      ? `Each bar is an observed figure with a marker at the figure the claimed distribution expects. ${categories.map((c, i) => `${c}: observed ${fmt(shownObserved[i], digits)}, expected ${fmt(shownExpected[i], digits)}`).join('; ')}. `
      : `Each bar is one category's contribution to the statistic. ${categories.map((c, i) => `${c}: ${fmt(shown.contributions[i], digits)}`).join('; ')}. `) +
    `Accumulated over the first ${fmtInt(steps)} of ${fmtInt(k)} categories the statistic stands at ${fmt(running, digits)}; the whole table gives ${fmt(shown.statistic, digits)} on ${fmtInt(shown.df ?? k - 1)} degrees of freedom. The table below carries every figure.`

  return (
    <Panel
      label={label}
      status={`n = ${fmtInt(n)} · k = ${fmtInt(k)} · χ² ${fmt(running, digits)}${complete ? '' : ` of ${fmtInt(steps)}/${fmtInt(k)}`}`}
      tone={tone}
      led={basis === 'counts' ? 'on' : 'warn'}
      ariaLabel="Chi-square goodness of fit: observed against expected, the contributions, and the statistic accumulating"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented label="display" value={view} options={VIEWS} onChange={setView} />
          <Segmented label="feed the statistic" value={basis} options={BASES} onChange={setBasis} />
        </div>

        <div className="dr-controls">
          <Slider
            label="categories accumulated"
            value={steps}
            min={0}
            max={k}
            step={1}
            onChange={setSteps}
            format={(v) => `${fmtInt(v)} of ${fmtInt(k)}`}
          />
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setSteps((s) => Math.min(k, s + 1))} disabled={complete}>
            ADD ONE CATEGORY
          </button>
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setSteps(0)} disabled={steps === 0}>
            CLEAR
          </button>
        </div>

        <BarChart
          categories={axis as string[]}
          values={barValues}
          expected={barExpected}
          highlight={view === 'contribution' ? [driver] : undefined}
          label="category"
          valueLabel={valueLabel}
          horizontal
          ariaLabel={`${view === 'observed' ? 'Observed figures with the expected figure marked on each' : 'Contribution to the chi-square statistic'}, by category, in ${BASIS_NOUN[basis]}`}
          description={description}
        />

        <ReadoutGrid>
          <Readout label={`χ² over ${fmtInt(steps)} of ${fmtInt(k)} categories`} value={fmt(running, digits)} tone="intel" live />
          <Readout label="still to come" value={fmt(shown.statistic - running, digits)} size="sm" live />
          <Readout label="df · categories − 1" value={fmtInt(shown.df ?? k - 1)} size="sm" />
          <Readout label="P-value" value={complete ? fmtP(shown.pValue as number) : '—'} tone={complete && (shown.pValue as number) < 0.05 ? 'alert' : 'log'} size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="largest contributor" value={categories[driver]} tone="intel" size="sm" live />
          <Readout label="its share of the statistic" value={fmtPct(share, 0)} size="sm" live />
          <Readout label="smallest expected count" value={fmt(Math.min(...gof.expected), 2)} tone={Math.min(...gof.expected) < 5 ? 'alert' : 'default'} size="sm" />
          <Readout label="tallest observed bar" value={categories[observed.indexOf(Math.max(...observed))]} size="sm" />
        </ReadoutGrid>

        <Note tone={basis === 'counts' ? 'muted' : 'alert'} live>
          {basis === 'counts'
            ? `Counts. χ² = ${fmt(gof.statistic, 2)} on ${fmtInt(gof.df ?? k - 1)} df, P = ${fmtP(gof.pValue as number)}.`
            : `${basis === 'percent' ? 'Percentages' : 'Proportions'}. The same ${fmtInt(k)} gaps, divided by ${basis === 'percent' ? 'a hundredth' : 'a factor of ' + fmtInt(n)} of what the formula wants, give χ² = ${fmt(shown.statistic, digits)} and P = ${fmtP(shown.pValue as number)} against the counts' ${fmt(gof.statistic, 2)} and ${fmtP(gof.pValue as number)}. Switch back to counts before reading anything off this panel.`}
        </Note>

        <section aria-label="The goodness-of-fit working">
          <Subhead>Every figure the statistic is built from</Subhead>
          <KeyTable
            ariaLabel={`Goodness-of-fit working for ${caseName}: claimed share, observed, expected, the gap, each contribution and the running total`}
            caption={`${caseName} · ${BASIS_NOUN[basis]} · ${fmtInt(steps)} of ${fmtInt(k)} categories accumulated`}
            columns={['category', 'claimed', 'O', 'E', 'O − E', '(O − E)² / E', 'running Σ']}
            rows={tableRows}
            emphasisRow={driver}
          />
        </section>

        <section aria-label="Conditions for a chi-square goodness-of-fit test">
          <Subhead>Conditions, as the procedure reports them</Subhead>
          <ConditionList conditions={gof.conditions} />
          <Note>The expected-count condition is read off the E column. The smallest observed count in this table is {fmtInt(Math.min(...observed))}, and the procedure has no opinion about it.</Note>
        </section>
      </div>
    </Panel>
  )
}
