/**
 * INTEL · HYPOTHESIS CONSOLE (act-6-03) — the console the learner writes a test *plan* on, before
 * any test is run.
 *
 * Pick the parameter (one proportion, or a difference of two), the null value and the direction.
 * The console then draws the sampling distribution that null implies and locates the observed
 * estimate on it — in the estimate's own units, and again on a ruler graduated in standard errors.
 * It states the hypotheses in symbols and in words, and it checks the conditions with the
 * proportion the *procedure* uses — p₀ for one sample, the pooled p̂c for two — naming the check
 * that sits closest to failing and the number it sits at.
 *
 * What it deliberately does NOT do: shade a tail, or report a p-value. Locating the observed value
 * and naming the direction is the whole of act-6-03; the tail belongs to act-6-04.
 *
 * Every number comes from `@/lib/stats` (through `corridorTest` / `twoPropTest`) or from `data.ts`.
 * None of the presets is the Lane's own beneficiary case — that is the module's mission beat.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel } from '@/components/Panel'
import { ChartSurface, DensityCurve, NumberField, Readout, ReferenceLine, Segmented, XAxis, chartTheme, semanticColor, useChartFrame } from '@/instruments/shared'
import { fmt, fmtInt, fmtPct, normal, twoPropTest, type Alternative, type InferenceResult } from '@/lib/stats'
import { BOARD_TABLE, CUTTERS, corridorTest, rateOf } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export type HypothesisMode = 'one' | 'two'

interface OneCase {
  kind: 'one'
  label: string
  x: number
  n: number
  p0: number
  alt: Alternative
  /** The parameter in words, for the hypothesis lines. */
  parameter: string
  population: string
  note: string
}

interface TwoCase {
  kind: 'two'
  label: string
  x1: number
  n1: number
  x2: number
  n2: number
  alt: Alternative
  parameter: string
  group1: string
  group2: string
  population: string
  note: string
}

/**
 * The corridors the console opens on. In-world, and none of them the Lane's beneficiary case: a
 * console that arrived preloaded with 19/900 against 12/1,712 would spend act-6-04's beat early.
 *
 * `themis` is act-6-03's Briefing worked example, imported by the MDX so the two agree by
 * construction.
 */
export const HYPOTHESIS_CASES = {
  asgard: {
    kind: 'one',
    label: 'Asgard patrol',
    x: CUTTERS.asgard.losses,
    n: CUTTERS.asgard.transits,
    /** The Board's comparison corridor, 46 in 4,180, quoted to three places as a hypothesis value. */
    p0: Math.round(rateOf(BOARD_TABLE.marsBelt) * 1000) / 1000,
    alt: 'greater',
    parameter: 'loss rate per transit',
    population: `the transits ${CUTTERS.asgard.name} observed on the Lane`,
    note: `${CUTTERS.asgard.name}'s own patrol against the Board's comparison corridor. Watch the conditions before you read anything else.`,
  } satisfies OneCase,
  adrastea: {
    kind: 'one',
    label: 'Adrastea advisories',
    x: 61,
    n: 420,
    p0: 0.11,
    alt: 'greater',
    parameter: 'proportion of transits logging an off-nominal advisory',
    population: 'all transits on the Adrastea feeder lane',
    note: 'The Adrastea Lane Office posts 0.11 and three masters have written in to say the real figure is worse.',
  } satisfies OneCase,
  themis: {
    kind: 'two',
    label: 'Themis Reach 2181',
    x1: 14,
    n1: 1050,
    x2: 22,
    n2: 2300,
    alt: 'greater',
    parameter: 'proportion of transits held at the mark',
    group1: 'hulls under the Themis co-operative charter',
    group2: 'every other hull on the Reach',
    population: 'transits on the Themis Reach, 2175–81',
    note: 'The survey office suspected the charter hulls were being held more often, and wrote that down before it pulled the log.',
  } satisfies TwoCase,
  carme: {
    kind: 'two',
    label: 'Carme transponders',
    x1: 38,
    n1: 320,
    x2: 51,
    n2: 610,
    alt: 'greater',
    parameter: 'proportion of transits with a transponder dropout',
    group1: 'hulls carrying the older transponder set',
    group2: 'hulls carrying the current set',
    population: 'transits on the Carme outer loop',
    note: 'Older sets, on the record before the season as expected to drop locks more often.',
  } satisfies TwoCase,
} as const

export type HypothesisCaseKey = keyof typeof HYPOTHESIS_CASES

const ALT_SYMBOL: Record<Alternative, string> = { greater: '>', less: '<', 'two-sided': '≠' }
const ALT_WORD: Record<Alternative, string> = { greater: 'greater than', less: 'less than', 'two-sided': 'different from' }

export interface HypothesisConsoleProps {
  /** Which corridor the console opens on. Default: the Themis Reach two-sample review. */
  start?: HypothesisCaseKey
  /** Panel header. */
  label?: string
}

interface LargeCount {
  what: string
  value: number
}

export function HypothesisConsole({ start = 'themis', label = 'INTEL · HYPOTHESIS CONSOLE' }: HypothesisConsoleProps) {
  const initial = HYPOTHESIS_CASES[start]
  const fallbackOne = HYPOTHESIS_CASES.adrastea
  const fallbackTwo = HYPOTHESIS_CASES.themis

  const [caseKey, setCaseKey] = useState<HypothesisCaseKey>(start)
  const [mode, setMode] = useState<HypothesisMode>(initial.kind)
  const [alt, setAlt] = useState<Alternative>(initial.alt)
  const [x, setX] = useState(initial.kind === 'one' ? initial.x : fallbackOne.x)
  const [n, setN] = useState(initial.kind === 'one' ? initial.n : fallbackOne.n)
  const [p0, setP0] = useState(initial.kind === 'one' ? initial.p0 : fallbackOne.p0)
  const [x1, setX1] = useState(initial.kind === 'two' ? initial.x1 : fallbackTwo.x1)
  const [n1, setN1] = useState(initial.kind === 'two' ? initial.n1 : fallbackTwo.n1)
  const [x2, setX2] = useState(initial.kind === 'two' ? initial.x2 : fallbackTwo.x2)
  const [n2, setN2] = useState(initial.kind === 'two' ? initial.n2 : fallbackTwo.n2)

  function loadCase(key: HypothesisCaseKey) {
    const c = HYPOTHESIS_CASES[key]
    setCaseKey(key)
    setMode(c.kind)
    setAlt(c.alt)
    if (c.kind === 'one') {
      setX(c.x)
      setN(c.n)
      setP0(c.p0)
    } else {
      setX1(c.x1)
      setN1(c.n1)
      setX2(c.x2)
      setN2(c.n2)
    }
  }

  const current = HYPOTHESIS_CASES[caseKey]
  /* Counts are clamped here, so the library never sees x > n or p₀ outside (0, 1). */
  const safeN = Math.max(2, Math.round(n))
  const safeX = Math.min(safeN, Math.max(0, Math.round(x)))
  const safeP0 = Math.min(0.999, Math.max(0.001, p0))
  const safeN1 = Math.max(2, Math.round(n1))
  const safeX1 = Math.min(safeN1, Math.max(0, Math.round(x1)))
  const safeN2 = Math.max(2, Math.round(n2))
  const safeX2 = Math.min(safeN2, Math.max(0, Math.round(x2)))

  const result: InferenceResult = useMemo(
    () => (mode === 'one' ? corridorTest({ x: safeX, n: safeN, p0: safeP0, alt }) : twoPropTest({ x1: safeX1, n1: safeN1, x2: safeX2, n2: safeN2, alt, random: true })),
    [mode, safeX, safeN, safeP0, alt, safeX1, safeN1, safeX2, safeN2],
  )

  const pooled = mode === 'two' ? (safeX1 + safeX2) / (safeN1 + safeN2) : safeP0
  /** The value H₀ puts at the centre of the sampling distribution. */
  const nullValue = mode === 'one' ? safeP0 : 0
  const estimate = result.estimate
  const se = result.se
  const statistic = result.statistic
  const digits = 4

  /* ---- Large Counts, computed with the proportion the PROCEDURE uses ---- */
  const products: LargeCount[] = useMemo(() => {
    if (mode === 'one') {
      return [
        { what: 'n · p₀', value: safeN * safeP0 },
        { what: 'n · (1 − p₀)', value: safeN * (1 - safeP0) },
      ]
    }
    return [
      { what: 'n₁ · p̂c', value: safeN1 * pooled },
      { what: 'n₁ · (1 − p̂c)', value: safeN1 * (1 - pooled) },
      { what: 'n₂ · p̂c', value: safeN2 * pooled },
      { what: 'n₂ · (1 − p̂c)', value: safeN2 * (1 - pooled) },
    ]
  }, [mode, safeN, safeP0, safeN1, safeN2, pooled])

  const tightest = products.reduce((a, b) => (b.value < a.value ? b : a), products[0])
  const countsPass = tightest.value >= 10
  const clearance = tightest.value - 10

  /* ---- The null sampling distribution ---- */
  const domain: [number, number] = useMemo(() => {
    const span = 4.2 * se
    return [Math.min(nullValue - span, estimate - 0.8 * se), Math.max(nullValue + span, estimate + 0.8 * se)]
  }, [nullValue, estimate, se])

  const axisLabel = mode === 'one' ? 'sample proportion p̂ (the values H₀ predicts)' : 'difference in sample proportions p̂₁ − p̂₂ (the values H₀ predicts)'
  const estimateLabel = mode === 'one' ? 'p̂ observed' : 'p̂₁ − p̂₂ observed'
  const nullLabel = mode === 'one' ? `p₀ = ${fmt(safeP0, digits)}` : 'p₁ − p₂ = 0'

  /* ---- The standard-error ruler ---- */
  const rulerFrame = useChartFrame({ height: 92 })
  const rulerLo = Math.min(-4.4, statistic - 0.8)
  const rulerHi = Math.max(4.4, statistic + 0.8)
  const rulerScale = useMemo(() => scaleLinear().domain([rulerLo, rulerHi]).range([0, rulerFrame.innerWidth]), [rulerLo, rulerHi, rulerFrame.innerWidth])

  const hypothesis =
    mode === 'one'
      ? {
          h0: `H₀:  p = ${fmt(safeP0, digits)}`,
          ha: `Hₐ:  p ${ALT_SYMBOL[alt]} ${fmt(safeP0, digits)}`,
          h0Words: `the true ${current.kind === 'one' ? current.parameter : 'proportion'} for ${current.kind === 'one' ? current.population : 'this corridor'} is exactly ${fmt(safeP0, digits)}`,
          haWords: `that true proportion is ${ALT_WORD[alt]} ${fmt(safeP0, digits)}`,
          tail: 'The null names one value, because the sampling distribution has to be built on it.',
        }
      : {
          h0: 'H₀:  p₁ = p₂',
          ha: `Hₐ:  p₁ ${ALT_SYMBOL[alt]} p₂`,
          h0Words: `${current.kind === 'two' ? current.group1 : 'the first group'} and ${current.kind === 'two' ? current.group2 : 'the second group'} share one ${current.kind === 'two' ? current.parameter : 'proportion'}`,
          haWords: `the first group's true proportion is ${ALT_WORD[alt]} the second's`,
          tail: 'The null names no number at all: it says only that the two groups share whatever the common rate is, and that is enough to draw the curve.',
        }

  const curveDescription = `Sampling distribution of the ${mode === 'one' ? 'sample proportion' : 'difference in sample proportions'} under the null hypothesis, centred at ${fmt(nullValue, digits)} with a standard error of ${fmt(se, 5)}. The observed value ${fmt(estimate, digits)} is marked; it lies ${fmt(Math.abs(statistic), 2)} standard errors ${statistic >= 0 ? 'above' : 'below'} the null value. No tail is shaded — this console states the plan, it does not run the test. The data table gives the density across the axis.`

  return (
    <Panel
      label={label}
      status={`${mode === 'one' ? 'ONE PROPORTION' : 'DIFFERENCE OF TWO'} · Hₐ ${alt.toUpperCase()}`}
      tone="intel"
      led={countsPass ? 'on' : 'warn'}
      ariaLabel="Hypothesis console"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<HypothesisCaseKey>
            label="corridor"
            value={caseKey}
            onChange={loadCase}
            options={(Object.keys(HYPOTHESIS_CASES) as HypothesisCaseKey[]).map((k) => ({ value: k, label: HYPOTHESIS_CASES[k].label }))}
          />
          <Segmented<HypothesisMode>
            label="parameter"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'one', label: 'one proportion p' },
              { value: 'two', label: 'difference p₁ − p₂' },
            ]}
          />
          <Segmented<Alternative>
            label="direction of Hₐ"
            value={alt}
            onChange={setAlt}
            options={[
              { value: 'greater', label: 'greater' },
              { value: 'less', label: 'less' },
              { value: 'two-sided', label: 'two-sided' },
            ]}
          />
        </div>

        {mode === 'one' ? (
          <div className="dr-controls">
            <NumberField label="successes x" value={safeX} onChange={setX} min={0} max={safeN} step={1} stepper />
            <NumberField label="sample size n" value={safeN} onChange={setN} min={2} max={20000} step={10} stepper />
            <NumberField label="null value p₀" value={safeP0} onChange={setP0} min={0.001} max={0.999} step={0.001} stepper />
          </div>
        ) : (
          <div className="dr-controls">
            <NumberField label="successes x₁" value={safeX1} onChange={setX1} min={0} max={safeN1} step={1} stepper />
            <NumberField label="sample size n₁" value={safeN1} onChange={setN1} min={2} max={20000} step={10} stepper />
            <NumberField label="successes x₂" value={safeX2} onChange={setX2} min={0} max={safeN2} step={1} stepper />
            <NumberField label="sample size n₂" value={safeN2} onChange={setN2} min={2} max={20000} step={10} stepper />
          </div>
        )}

        <section aria-label="Hypotheses">
          <Subhead>The plan, written before the number</Subhead>
          <p className="dr-mono" style={{ margin: 0, color: 'var(--dr-fg-0)' }}>
            {hypothesis.h0}
          </p>
          <Note>{hypothesis.h0Words}.</Note>
          <p className="dr-mono" style={{ margin: 0, color: 'var(--dr-fg-0)' }}>
            {hypothesis.ha}
          </p>
          <Note>
            {hypothesis.haWords}. {hypothesis.tail}
          </Note>
        </section>

        <ReadoutGrid>
          <Readout label="null value" value={fmt(nullValue, digits)} tone="intel" />
          <Readout label={mode === 'one' ? 'SE under H₀' : 'SE under H₀ (pooled)'} value={fmt(se, 5)} tone="intel" live />
          <Readout label={estimateLabel} value={fmt(estimate, digits)} tone="alert" live />
          <Readout label="standard errors from the null" value={fmt(statistic, 2)} tone={Math.abs(statistic) >= 2 ? 'alert' : 'intel'} live />
        </ReadoutGrid>

        <DensityCurve
          curves={{ pdf: (v: number) => normal.pdf(v, nullValue, se), label: `null model · N(${fmt(nullValue, digits)}, ${fmt(se, 5)})`, color: 'null' }}
          domain={domain}
          references={[
            { x: nullValue, label: nullLabel, color: 'null' },
            { x: estimate, label: `${estimateLabel} ${fmt(estimate, digits)}`, color: 'observed' },
          ]}
          xLabel={axisLabel}
          height={250}
          ariaLabel={`Null sampling distribution centred at ${fmt(nullValue, digits)}, with the observed value ${fmt(estimate, digits)} marked`}
          description={curveDescription}
        />

        <section aria-label="Standard-error ruler">
          <Subhead>The same axis, graduated in standard errors</Subhead>
          <ChartSurface
            frame={rulerFrame}
            ariaLabel={`Standard-error ruler: the observed value sits ${fmt(statistic, 2)} standard errors ${statistic >= 0 ? 'above' : 'below'} the null value`}
            description={`A ruler in units of the null distribution's own standard error, ${fmt(se, 5)}. Zero is the null value; the observed ${mode === 'one' ? 'sample proportion' : 'difference'} sits at ${fmt(statistic, 2)}.`}
            table={{
              columns: ['quantity', 'value'],
              rows: [
                ['null value', fmt(nullValue, digits)],
                [mode === 'one' ? 'observed p̂' : 'observed p̂₁ − p̂₂', fmt(estimate, digits)],
                ['observed − null', fmt(estimate - nullValue, digits)],
                ['standard error under H₀', fmt(se, 5)],
                ['(observed − null) ÷ SE', fmt(statistic, 2)],
              ],
              caption: 'Standardizing the observed value',
            }}
          >
            <g transform={`translate(${rulerFrame.margin.left},${rulerFrame.margin.top})`}>
              <line
                x1={rulerScale(rulerLo)}
                x2={rulerScale(rulerHi)}
                y1={rulerFrame.innerHeight}
                y2={rulerFrame.innerHeight}
                stroke={chartTheme.color.axis}
                strokeWidth={chartTheme.stroke.hair}
                shapeRendering="crispEdges"
              />
              <ReferenceLine x={rulerScale(0)} height={rulerFrame.innerHeight} label="H₀" color={semanticColor('null')} />
              <ReferenceLine x={rulerScale(statistic)} height={rulerFrame.innerHeight} label={`${fmt(statistic, 2)} SE`} color={semanticColor('observed')} dashed={false} anchor={statistic > 3 ? 'end' : 'start'} />
              <XAxis scale={rulerScale} height={rulerFrame.innerHeight} ticks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]} label="standard errors from the null value" />
            </g>
          </ChartSurface>
          <Note live>
            The observed {mode === 'one' ? 'sample proportion' : 'difference'} sits <strong>{fmt(Math.abs(statistic), 2)} standard errors {statistic >= 0 ? 'above' : 'below'}</strong> the null value, on the distribution H₀ predicts. That distance is the standardized test statistic: the raw gap of {fmt(estimate - nullValue, digits)} and the sample size become one number only after you divide by {fmt(se, 5)}. How much of the curve lies past it — and on which side — is a question for the next module.
          </Note>
        </section>

        <section aria-label="Conditions">
          <Subhead>Conditions, checked with {mode === 'one' ? 'p₀' : 'the pooled p̂c'}</Subhead>
          {mode === 'two' && (
            <Note>
              p̂c = ({fmtInt(safeX1)} + {fmtInt(safeX2)}) ÷ ({fmtInt(safeN1)} + {fmtInt(safeN2)}) = <strong>{fmt(pooled, 4)}</strong>. Under H₀ both groups run at that one rate, so that is the rate the condition — and the standard error — are computed at. Neither group's own proportion appears anywhere in the test.
            </Note>
          )}
          <KeyTable
            ariaLabel="Large Counts products under the null hypothesis"
            caption={`Expected counts under H₀, at ${mode === 'one' ? `p₀ = ${fmt(safeP0, 4)}` : `p̂c = ${fmt(pooled, 4)}`}`}
            columns={['product', 'value', 'clears 10?']}
            rows={products.map((p) => [p.what, fmt(p.value, 1), p.value >= 10 ? 'yes' : 'no'])}
            emphasisRow={products.indexOf(tightest)}
          />
          <Note tone={countsPass ? (clearance < 2 ? 'warn' : 'ok') : 'alert'} live>
            {countsPass
              ? clearance < 2
                ? `Closest to failing: ${tightest.what} = ${fmt(tightest.value, 1)}. It clears 10, by ${fmt(clearance, 1)}. A reviewer who wants this result to fail will find that number before anything else on the page, so name it first yourself.`
                : `Closest to failing: ${tightest.what} = ${fmt(tightest.value, 1)}, which clears 10 by ${fmt(clearance, 1)}. The normal model for the sampling distribution is safe here.`
              : `Closest to failing: ${tightest.what} = ${fmt(tightest.value, 1)} — below 10. The condition is not met, and this z-procedure should not be run on these counts at all.`}
          </Note>
          <KeyTable
            ariaLabel="Conditions reported by the procedure"
            caption={result.procedure}
            columns={['condition', 'met', 'detail']}
            rows={result.conditions.map((cnd) => [cnd.name, cnd.met ? (cnd.assumed ? 'assumed' : 'yes') : 'no', cnd.detail])}
          />
        </section>

        <Note>
          {current.note} Observed:{' '}
          {mode === 'one'
            ? `${fmtInt(safeX)} of ${fmtInt(safeN)} = ${fmtPct(safeX / safeN, 2)}`
            : `${fmtInt(safeX1)} of ${fmtInt(safeN1)} = ${fmtPct(safeX1 / safeN1, 2)} against ${fmtInt(safeX2)} of ${fmtInt(safeN2)} = ${fmtPct(safeX2 / safeN2, 2)}`}
          . Change the direction of Hₐ and nothing on the chart moves — the sampling distribution belongs to H₀, and the alternative only decides which departures from it would count. That is exactly why the direction can, and must, be written down first.
        </Note>
      </div>
    </Panel>
  )
}
