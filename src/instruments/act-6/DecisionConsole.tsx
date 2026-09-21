/**
 * TACTICAL · DECISION CONSOLE (act-6-05) — the console the conclusion is written on.
 *
 *   α control        four conventional levels plus a continuous slider, so the learner can walk α
 *                    down until the decision turns over and read the exact value it turns over at.
 *   p control        defaults to the Lane's own p-value and can be driven, so the flip can be
 *                    approached from either side.
 *   decision         REJECT H₀ / FAIL TO REJECT H₀, from `reject(p, α)` in `@/lib/stats`, with the
 *                    flip point (α = p) printed beside it.
 *   assembler        five clause groups — decision · p against α · evidence framing · direction ·
 *                    population and variable — composed into one sentence and graded LIVE by the
 *                    same rubric act-6-05's mission beat uses. "proves", "accept H₀" and "targeted"
 *                    are on the chips so the learner can watch them be struck.
 *   duality overlay  the (1 − α) and (1 − 2α) two-proportion intervals for the difference, drawn
 *                    against zero, with the correspondence — and its two caveats — stated in words.
 *
 * ── Props (all defaulted from `data.ts`; nothing here is typed in) ───────────────────────────────
 *
 *   p               the p-value the console decides on. Default `PERRINE_TEST.pValue` — the Lane's
 *                   own one-sided p from the pooled two-proportion test.
 *   alpha           where the α control starts. Default 0.05 (α is set formally in act-6-06).
 *   x1, n1, x2, n2  counts behind the difference interval. Default: the Lane's beneficiary case
 *                   (PERRINE_LOSSES / PERRINE_TRANSITS against OTHER_LOSSES / OTHER_TRANSITS), in
 *                   which case the interval comes from `differenceInterval` in data.ts.
 *   parameter       the parameter in words for the rubric and the chips. Default 'loss rate'.
 *   variable        what was measured. Default 'per transit'.
 *   population      whom the conclusion is about. Default the Perrine-beneficiary hulls.
 *   otherGroup      what Hₐ says the parameter exceeds. Default 'the rate for hulls naming any
 *                   other beneficiary'.
 *   groupLabels     short axis labels for the difference. Default ['Perrine', 'everyone else'].
 *   label, tone     Panel header and ship-system tone. Defaults 'TACTICAL · DECISION' / 'tactical'.
 *
 * The rubric is `conclusionInContextRubric` (a thin wrapper over the shared
 * `significanceTestConclusion` template plus this Act's own forbidden claims), imported from the
 * act-6-05 generators so that the console, the six drills and the mission beat cannot drift apart.
 */
import { useMemo, useState } from 'react'
import { scaleLinear } from 'd3'
import { Panel, type PanelTone } from '@/components/Panel'
import { ChartSurface, Readout, ReferenceLine, Segmented, Slider, XAxis, chartTheme, semanticColor, seriesColor, useChartFrame } from '@/instruments/shared'
import { gradeInterpretation } from '@/lib/problems/rubric'
import { AGENCY_FORBIDDEN, conclusionInContextRubric } from '@/lib/problems/generators/act-6/conclusion'
import { fmt, fmtInt, fmtP, reject, twoPropInterval, type InferenceResult } from '@/lib/stats'
import { OTHER_LOSSES, OTHER_TRANSITS, PERRINE_LOSSES, PERRINE_TEST, PERRINE_TRANSITS, differenceInterval } from './data'
import { KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

/** Levels a review plan is actually written at. `custom` hands control to the slider. */
const ALPHA_PRESETS = ['0.10', '0.05', '0.01', '0.001'] as const
type AlphaKey = (typeof ALPHA_PRESETS)[number] | 'custom'

const ALPHA_MIN = 0.0001
const ALPHA_MAX = 0.2
const P_MIN = 0.0001
const P_MAX = 0.2
const STEP = 0.0001

interface Clause {
  id: string
  /** What the chip says. */
  chip: string
  /** What the chip contributes to the sentence (empty = the learner chose to leave it out). */
  text: string
}

interface ClauseGroup {
  key: string
  label: string
  options: Clause[]
}

export interface DecisionConsoleProps {
  /** The p-value the console decides on. Default: the Lane's own one-sided p. */
  p?: number
  /** Where the α control starts. Default 0.05. */
  alpha?: number
  /** Counts behind the difference interval. Default: the Lane's beneficiary case. */
  x1?: number
  n1?: number
  x2?: number
  n2?: number
  /** The parameter in words. Default 'loss rate'. */
  parameter?: string
  /** What was measured. Default 'per transit'. */
  variable?: string
  /** Whom the conclusion is about. */
  population?: string
  /** What Hₐ says the parameter exceeds. */
  otherGroup?: string
  /** Short labels for the two groups, used on the difference axis. */
  groupLabels?: [string, string]
  label?: string
  tone?: PanelTone
}

export function DecisionConsole({
  p: pProp = PERRINE_TEST.pValue ?? 0.0008,
  alpha: alphaProp = 0.05,
  x1 = PERRINE_LOSSES,
  n1 = PERRINE_TRANSITS,
  x2 = OTHER_LOSSES,
  n2 = OTHER_TRANSITS,
  parameter = 'loss rate',
  variable = 'per transit',
  population = 'hulls whose policies name Perrine Holdings on the Hundred-Day Lane',
  otherGroup = 'the rate for hulls naming any other beneficiary',
  groupLabels = ['Perrine-beneficiary hulls', 'every other beneficiary'],
  label = 'TACTICAL · DECISION',
  tone = 'tactical',
}: DecisionConsoleProps) {
  const [alpha, setAlpha] = useState(alphaProp)
  const [p, setP] = useState(pProp)
  const [picks, setPicks] = useState<Record<string, string | null>>({})

  const decided = reject(p, alpha)
  const pStr = fmtP(p)
  const aStr = fmt(alpha, alpha < 0.01 ? 4 : 2)
  const atObservedP = Math.abs(p - pProp) < 1e-12

  const alphaKey: AlphaKey = ALPHA_PRESETS.find((k) => Math.abs(Number(k) - alpha) < 1e-12) ?? 'custom'

  /* ---- The five clause groups ---- */
  const groups: ClauseGroup[] = useMemo(
    () => [
      {
        key: 'decision',
        label: 'decision',
        options: [
          { id: 'reject', chip: 'We reject H₀', text: 'We reject H₀' },
          { id: 'fail', chip: 'We fail to reject H₀', text: 'We fail to reject H₀' },
          { id: 'accept', chip: 'We accept H₀', text: 'We accept H₀' },
        ],
      },
      {
        key: 'comparison',
        label: 'p against α',
        options: [
          { id: 'less', chip: `p = ${pStr} is less than α = ${aStr}`, text: `because the p-value (${pStr}) is less than α = ${aStr}` },
          { id: 'greater', chip: `p = ${pStr} is greater than α = ${aStr}`, text: `because the p-value (${pStr}) is greater than α = ${aStr}` },
          { id: 'vague', chip: 'because the result is statistically significant', text: 'because the result is statistically significant' },
        ],
      },
      {
        key: 'evidence',
        label: 'evidence framing',
        options: [
          { id: 'yes', chip: 'There is convincing evidence that', text: 'There is convincing evidence that' },
          { id: 'no', chip: 'There is not convincing evidence that', text: 'There is not convincing evidence that' },
          { id: 'proof', chip: 'This proves that', text: 'This proves that' },
        ],
      },
      {
        key: 'direction',
        label: 'direction of Hₐ',
        options: [
          { id: 'greater', chip: `the true ${parameter} is greater than ${otherGroup}`, text: `the true ${parameter} is greater than ${otherGroup}` },
          { id: 'differs', chip: `the true ${parameter} differs from ${otherGroup}`, text: `the true ${parameter} differs from ${otherGroup}` },
          { id: 'targeted', chip: 'somebody is targeting these hulls', text: 'somebody is targeting these hulls' },
        ],
      },
      {
        key: 'context',
        label: 'population and variable',
        options: [
          { id: 'full', chip: `${variable}, among ${population}`, text: `${variable}, among ${population}` },
          { id: 'sample', chip: 'in the rows we happen to hold', text: 'in the rows we happen to hold' },
          { id: 'none', chip: '(leave the context out)', text: '' },
        ],
      },
    ],
    [pStr, aStr, parameter, otherGroup, variable, population],
  )

  const chosen = (key: string): Clause | undefined => {
    const id = picks[key]
    if (!id) return undefined
    return groups.find((g) => g.key === key)?.options.find((o) => o.id === id)
  }

  const head = [chosen('decision')?.text, chosen('comparison')?.text].filter(Boolean).join(' ')
  const tail = [chosen('evidence')?.text, chosen('direction')?.text, chosen('context')?.text].filter((s) => s && s.length).join(' ')
  const sentence = [head ? `${head}.` : '', tail ? `${tail}.` : ''].filter(Boolean).join(' ')
  const anyPicked = Object.values(picks).some(Boolean)

  /* ---- The rubric, rebuilt whenever p or α moves: the same one the mission beat grades with ---- */
  const rubric = useMemo(
    () =>
      conclusionInContextRubric({
        pValue: p,
        alpha,
        direction: 'greater',
        parameter,
        population,
        variable,
        nullValue: otherGroup,
        directionWords: ['often'],
        extraForbidden: AGENCY_FORBIDDEN,
      }),
    [p, alpha, parameter, population, variable, otherGroup],
  )
  const graded = useMemo(() => gradeInterpretation(rubric, sentence), [rubric, sentence])
  const elements = graded.rubric ?? []
  const metCount = elements.filter((r) => r.met).length

  /* ---- CI / test duality ---- */
  const isLaneCase = x1 === PERRINE_LOSSES && n1 === PERRINE_TRANSITS && x2 === OTHER_LOSSES && n2 === OTHER_TRANSITS
  const interval = (confidence: number): InferenceResult =>
    isLaneCase ? differenceInterval(confidence) : twoPropInterval({ x1, n1, x2, n2, confidence, random: true })

  const twoSided = useMemo(() => interval(1 - alpha), [alpha, isLaneCase, x1, n1, x2, n2]) // eslint-disable-line react-hooks/exhaustive-deps
  const oneSidedEquivalent = useMemo(() => interval(Math.max(0.5, 1 - 2 * alpha)), [alpha, isLaneCase, x1, n1, x2, n2]) // eslint-disable-line react-hooks/exhaustive-deps
  const [lo, hi] = twoSided.ci as [number, number]
  const [wLo, wHi] = oneSidedEquivalent.ci as [number, number]
  const estimate = twoSided.estimate
  const excludesZero = lo > 0 || hi < 0
  const wideExcludesZero = wLo > 0 || wHi < 0

  const frame = useChartFrame({ height: 150 })
  const span = Math.max(Math.abs(wLo), Math.abs(wHi), Math.abs(estimate), 0.001)
  const domain: [number, number] = [Math.min(-0.15 * span, wLo - 0.1 * span), Math.max(0.15 * span, wHi + 0.1 * span)]
  const x = useMemo(() => scaleLinear().domain(domain).range([0, frame.innerWidth]), [domain[0], domain[1], frame.innerWidth]) // eslint-disable-line react-hooks/exhaustive-deps

  const rowY = [frame.innerHeight * 0.3, frame.innerHeight * 0.6]
  const levelPct = (c: number) => `${fmt(c * 100, c * 100 >= 99.5 ? 2 : 1)}%`
  const twoSidedPct = levelPct(1 - alpha)
  const oneSidedPct = levelPct(Math.max(0.5, 1 - 2 * alpha))

  const chartDescription =
    `Two confidence intervals for the difference in loss rates (${groupLabels[0]} minus ${groupLabels[1]}), drawn against zero. ` +
    `The ${twoSidedPct} interval runs from ${fmt(lo, 4)} to ${fmt(hi, 4)} and ${excludesZero ? 'does not contain' : 'contains'} zero. ` +
    `The ${oneSidedPct} interval — the one that matches a one-sided test at α = ${aStr} — runs from ${fmt(wLo, 4)} to ${fmt(wHi, 4)} and ${wideExcludesZero ? 'does not contain' : 'contains'} zero. ` +
    `The observed difference is ${fmt(estimate, 4)}. The data table gives both intervals.`

  function setAlphaKey(key: AlphaKey) {
    if (key !== 'custom') setAlpha(Number(key))
  }

  return (
    <Panel
      label={label}
      status={`${decided ? 'REJECT H₀' : 'FAIL TO REJECT H₀'} · α = ${aStr}`}
      tone={tone}
      led={decided ? 'alert' : 'on'}
      ariaLabel="Decision console"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<AlphaKey>
            label="significance level α"
            value={alphaKey}
            onChange={setAlphaKey}
            options={[
              { value: '0.10', label: '0.10' },
              { value: '0.05', label: '0.05' },
              { value: '0.01', label: '0.01' },
              { value: '0.001', label: '0.001' },
              { value: 'custom', label: 'slider', disabled: alphaKey !== 'custom' },
            ]}
          />
          <Slider label="α (continuous)" value={alpha} min={ALPHA_MIN} max={ALPHA_MAX} step={STEP} onChange={setAlpha} format={(v) => fmt(v, 4)} />
          <Slider label="p-value" value={p} min={P_MIN} max={P_MAX} step={STEP} onChange={setP} format={(v) => fmt(v, 4)} />
          {!atObservedP && (
            <button type="button" className="dr-btn dr-btn--ghost" onClick={() => setP(pProp)}>
              RESET TO OBSERVED p
            </button>
          )}
        </div>

        <ReadoutGrid>
          <Readout label="p-value" value={pStr} tone="alert" live />
          <Readout label="α" value={aStr} tone="tactical" live />
          <Readout label="decision" value={decided ? 'REJECT H₀' : 'FAIL TO REJECT H₀'} tone={decided ? 'alert' : 'default'} live />
          <Readout label="decision flips at α =" value={pStr} size="sm" live />
        </ReadoutGrid>

        <Note tone={decided ? 'alert' : 'warn'} live>
          {decided ? (
            <>
              <strong>p = {pStr} &lt; α = {aStr}</strong> — reject H₀. A result at least this extreme would arise under H₀ less often than the false-alarm rate this review agreed to live with. The decision holds for every α above{' '}
              {pStr}; walk α below {pStr} and it turns over. Nothing about the data changes when it does.
            </>
          ) : (
            <>
              <strong>p = {pStr} ≥ α = {aStr}</strong> — fail to reject H₀. Not "accept": the data are consistent with H₀, which is a statement about what this procedure could see, not about what is there. The decision turns over
              the moment α rises above {pStr}.
            </>
          )}
        </Note>

        {/* ---- The assembler ---- */}
        <section aria-label="Conclusion assembler">
          <Subhead>Assemble the conclusion</Subhead>
          {groups.map((g) => (
            <div key={g.key} role="group" aria-label={g.label} style={{ marginBottom: 'var(--dr-sp-2)' }}>
              <p className="dr-chart__caption" style={{ margin: '0 0 var(--dr-sp-1)' }}>
                {g.label}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--dr-sp-2)' }}>
                {g.options.map((o) => {
                  const on = picks[g.key] === o.id
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`dr-btn dr-btn--sm${on ? ' dr-btn--primary' : ''}`}
                      aria-pressed={on}
                      onClick={() => setPicks((s) => ({ ...s, [g.key]: on ? null : o.id }))}
                    >
                      {o.chip}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {anyPicked && (
            <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setPicks({})}>
              CLEAR THE DRAFT
            </button>
          )}
        </section>

        <section aria-label="Draft conclusion and rubric">
          <Subhead>The draft, as a hearing would read it</Subhead>
          <p className="dr-mono" style={{ margin: 0, color: sentence ? 'var(--dr-fg-0)' : 'var(--dr-fg-2)' }} aria-live="polite">
            {sentence || 'Pick one clause from each group above.'}
          </p>
          <ReadoutGrid>
            <Readout label="rubric elements met" value={`${fmtInt(metCount)} / ${fmtInt(elements.length)}`} tone={graded.correct ? 'tactical' : 'default'} live />
            <Readout label="verdict" value={graded.correct ? 'WOULD STAND' : anyPicked ? 'WOULD BE STRUCK' : '—'} tone={graded.correct ? 'tactical' : 'alert'} size="sm" live />
          </ReadoutGrid>
          <KeyTable
            ariaLabel="Rubric elements for the conclusion in context"
            caption={`Graded live against the same rubric as the mission beat, at p = ${pStr} and α = ${aStr}`}
            columns={['element', 'present']}
            rows={elements.map((r) => [r.label, r.met ? 'yes' : 'no'])}
          />
          {graded.forbidden?.map((f) => (
            <Note key={f.label} tone="alert" live>
              <strong>Struck — {f.label}.</strong> {f.why}
            </Note>
          ))}
          {anyPicked && !graded.correct && !graded.forbidden?.length && <Note live>{graded.feedback}</Note>}
          {graded.correct && (
            <Note tone="ok" live>
              Every element present and nothing struck. Note what the sentence still does not say: by whom, or why. Neither is in the arithmetic.
            </Note>
          )}
        </section>

        {/* ---- Duality overlay ---- */}
        <section aria-label="Confidence interval and test duality">
          <Subhead>The same question, asked as an interval</Subhead>
          <ChartSurface
            frame={frame}
            ariaLabel={`Difference in loss rates with the ${twoSidedPct} and ${oneSidedPct} confidence intervals drawn against zero`}
            description={chartDescription}
            table={{
              columns: ['interval', 'level', 'lower', 'upper', 'contains 0?'],
              rows: [
                [`two-sided, matches the test at α = ${aStr}`, twoSidedPct, fmt(lo, 4), fmt(hi, 4), excludesZero ? 'no' : 'yes'],
                [`matches the ONE-sided test at α = ${aStr}`, oneSidedPct, fmt(wLo, 4), fmt(wHi, 4), wideExcludesZero ? 'no' : 'yes'],
                ['observed difference', '—', fmt(estimate, 4), fmt(estimate, 4), '—'],
              ],
              caption: `Difference in loss rates, ${groupLabels[0]} minus ${groupLabels[1]}`,
            }}
          >
            <g transform={`translate(${frame.margin.left},${frame.margin.top})`}>
              <ReferenceLine x={x(0)} height={frame.innerHeight} label="H₀: p₁ − p₂ = 0" color={semanticColor('null')} />
              {[
                { ci: [lo, hi] as [number, number], y: rowY[0], color: seriesColor(0), name: twoSidedPct },
                { ci: [wLo, wHi] as [number, number], y: rowY[1], color: seriesColor(1), name: oneSidedPct },
              ].map((band, i) => (
                <g key={i}>
                  <line x1={x(band.ci[0])} x2={x(band.ci[1])} y1={band.y} y2={band.y} stroke={band.color} strokeWidth={chartTheme.stroke.line} />
                  <line x1={x(band.ci[0])} x2={x(band.ci[0])} y1={band.y - 7} y2={band.y + 7} stroke={band.color} strokeWidth={chartTheme.stroke.hair} />
                  <line x1={x(band.ci[1])} x2={x(band.ci[1])} y1={band.y - 7} y2={band.y + 7} stroke={band.color} strokeWidth={chartTheme.stroke.hair} />
                </g>
              ))}
              <circle cx={x(estimate)} cy={rowY[0]} r={4} fill={semanticColor('observed')} />
              <XAxis scale={x} height={frame.innerHeight} label={`difference in loss rates (${groupLabels[0]} − ${groupLabels[1]})`} />
            </g>
          </ChartSurface>

          <KeyTable
            ariaLabel="The two intervals and what each one corresponds to"
            caption="What each interval is the dual of"
            columns={['interval', 'level', 'lower', 'upper', 'excludes 0?', 'corresponds to']}
            rows={[
              [`(1 − α)`, twoSidedPct, fmt(lo, 4), fmt(hi, 4), excludesZero ? 'yes' : 'no', `two-sided test at α = ${aStr}`],
              [`(1 − 2α)`, oneSidedPct, fmt(wLo, 4), fmt(wHi, 4), wideExcludesZero ? 'yes' : 'no', `one-sided test at α = ${aStr}`],
            ]}
            emphasisRow={0}
          />

          <Note live>
            A {twoSidedPct} interval is the set of differences a <strong>two-sided</strong> test at α = {aStr} would not reject, so the two agree about whether zero is still plausible: this one {excludesZero ? 'excludes' : 'contains'} zero,
            and the two-sided test at α = {aStr} would {excludesZero ? 'reject' : 'fail to reject'} H₀.
          </Note>
          <Note tone="warn">
            Two caveats, and they are the module's hardest idea. First, <strong>the test we actually ran is one-sided</strong>: a one-sided test at α = {aStr} puts all of its risk in one tail, so its partner is the wider{' '}
            {oneSidedPct} interval, not the {twoSidedPct} one. Second, <strong>the two standard errors are not the same quantity</strong> — the test pools the two samples because H₀ says they share a rate, and the interval does not,
            because it is not assuming they do. The correspondence is therefore a near-identity, not an algebraic one; on a result sitting near the line the two can disagree, and when they do, each is right about its own question.
          </Note>
        </section>
      </div>
    </Panel>
  )
}
