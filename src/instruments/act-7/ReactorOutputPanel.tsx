/**
 * ENGINEERING · POST-REFIT OUTPUT (act-7-02) — the Refit set's twelve thrust certifications, drawn
 * before anything is inferred from them.
 *
 *   the dotplot       twelve values on a kN axis with x̄ and a movable comparison line. The learner
 *                     drags the line and reads how many of the twelve clear it, and whether the
 *                     whole 95% interval does.
 *   the shape check   five-number summary, 1.5×IQR fences, skewness and the outlier count, so the
 *                     Normal/Large Sample condition can be *stated with numbers* rather than waved
 *                     at. The condition list is the one `oneMeanInterval` itself produced.
 *   the log           the yard's twelve rows as forwarded.
 *
 * Every number comes from `@/lib/stats` via `@/instruments/act-7/data`. Nothing is typed in, nothing
 * is random: the panel is deterministic.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Dotplot, Readout, Slider } from '@/instruments/shared'
import { fiveNumber, fmt, fmtInt, fmtPct, iqr, mean, normalLargeSampleCondition, outliers, sd, skewness } from '@/lib/stats'
import { MK3_SPEC_KN, OUTPUT_INTERVAL, REFIT_N, refitOutputs, refitSet, UPRATE_MEAN_KN } from './data'
import { ConditionList, KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

export interface ReactorOutputPanelProps {
  /** Where the comparison line starts, kN. Default the Mk 3 specification. */
  compareTo?: number
  label?: string
  tone?: PanelTone
}

export function ReactorOutputPanel({ compareTo = MK3_SPEC_KN, label = 'ENGINEERING · POST-REFIT OUTPUT', tone = 'engineering' }: ReactorOutputPanelProps = {}) {
  const [line, setLine] = useState(compareTo)

  const xbar = mean(refitOutputs)
  const s = sd(refitOutputs)
  const se = s / Math.sqrt(REFIT_N)
  const five = useMemo(() => fiveNumber(refitOutputs), [])
  const fences = useMemo(() => outliers(refitOutputs), [])
  const g1 = useMemo(() => skewness(refitOutputs), [])
  const normalCondition = useMemo(() => normalLargeSampleCondition(REFIT_N, refitOutputs), [])
  const above = refitOutputs.filter((v) => v >= line).length
  const [lo] = OUTPUT_INTERVAL.ci as [number, number]
  const intervalClears = lo > line

  const outlierIndices = useMemo(() => refitOutputs.map((v, i) => (fences.values.includes(v) ? i : -1)).filter((i) => i >= 0), [fences])

  const description =
    `Dotplot of the ${fmtInt(REFIT_N)} post-refit thrust certifications, in kilonewtons, from ${fmt(five.min, 1)} to ${fmt(five.max, 1)}. ` +
    `The sample mean is ${fmt(xbar, 3)} and the sample standard deviation ${fmt(s, 3)}. The comparison line sits at ${fmt(line, 1)} kN and ${fmtInt(above)} of the ${fmtInt(REFIT_N)} readings are at or above it. ` +
    `The five-number summary is ${fmt(five.min, 1)}, ${fmt(five.q1, 1)}, ${fmt(five.median, 1)}, ${fmt(five.q3, 1)}, ${fmt(five.max, 1)}; the 1.5 times IQR fences are ${fmt(fences.lowFence, 1)} and ${fmt(fences.highFence, 1)}; ` +
    `the sample has ${fmtInt(fences.values.length)} outlier(s) and a skewness of ${fmt(g1, 2)}. The data table lists every reading.`

  return (
    <Panel
      label={label}
      status={`n = ${fmtInt(REFIT_N)} · x̄ ${fmt(xbar, 1)} kN · s ${fmt(s, 2)}`}
      tone={tone}
      led={normalCondition.met ? 'on' : 'warn'}
      ariaLabel="Post-refit reactor output: the twelve thrust certifications with their shape check"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Slider
            label="comparison line (kN)"
            value={line}
            min={580}
            max={630}
            step={0.5}
            onChange={setLine}
            format={(v) => `${fmt(v, 1)} kN`}
          />
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setLine(MK3_SPEC_KN)} disabled={line === MK3_SPEC_KN}>
            Mk 3 SPEC · {fmtInt(MK3_SPEC_KN)} kN
          </button>
          <button type="button" className="dr-btn dr-btn--ghost dr-btn--sm" onClick={() => setLine(UPRATE_MEAN_KN)} disabled={line === UPRATE_MEAN_KN}>
            UPRATE TARGET · {fmtInt(UPRATE_MEAN_KN)} kN
          </button>
        </div>

        <ReadoutGrid>
          <Readout label="x̄ · mean output" value={fmt(xbar, 3)} units="kN" tone="engineering" live />
          <Readout label="s · sample SD" value={fmt(s, 3)} units="kN" live />
          <Readout label="n" value={fmtInt(REFIT_N)} size="sm" />
          <Readout label="SE · s ÷ √n" value={fmt(se, 4)} units="kN" size="sm" live />
        </ReadoutGrid>
        <ReadoutGrid>
          <Readout label="readings at or above the line" value={`${fmtInt(above)} / ${fmtInt(REFIT_N)}`} tone="engineering" live />
          <Readout label="mean above the line by" value={fmt(xbar - line, 2)} units="kN" size="sm" live />
          <Readout label="that as a share of the line" value={fmtPct((xbar - line) / line, 2)} size="sm" live />
          <Readout label="95% interval clears the line" value={intervalClears ? 'yes' : 'no'} tone={intervalClears ? 'engineering' : 'alert'} size="sm" live />
        </ReadoutGrid>

        <Dotplot
          values={refitOutputs}
          label="certified thrust after refit (kN)"
          step={0.1}
          highlight={outlierIndices}
          references={[
            { x: line, label: `${fmt(line, 1)} kN`, color: 'reference' },
            { x: xbar, label: `x̄ ${fmt(xbar, 1)}`, color: 'observed' },
          ]}
          height={220}
          ariaLabel={`Dotplot of the ${fmtInt(REFIT_N)} post-refit thrust certifications against a comparison line at ${fmt(line, 1)} kilonewtons`}
          description={description}
        />

        <section aria-label="Shape of the twelve">
          <Subhead>What the twelve look like before anything is inferred from them</Subhead>
          <ReadoutGrid>
            <Readout label="min" value={fmt(five.min, 1)} size="sm" />
            <Readout label="Q1" value={fmt(five.q1, 1)} size="sm" />
            <Readout label="median" value={fmt(five.median, 1)} size="sm" />
            <Readout label="Q3" value={fmt(five.q3, 1)} size="sm" />
            <Readout label="max" value={fmt(five.max, 1)} size="sm" />
          </ReadoutGrid>
          <ReadoutGrid>
            <Readout label="IQR" value={fmt(iqr(refitOutputs), 2)} units="kN" size="sm" />
            <Readout label="1.5 × IQR fences" value={`${fmt(fences.lowFence, 1)} · ${fmt(fences.highFence, 1)}`} size="sm" />
            <Readout label="outliers" value={fmtInt(fences.values.length)} tone={fences.values.length ? 'alert' : 'engineering'} size="sm" />
            <Readout label="skewness G1" value={fmt(g1, 3)} tone={Math.abs(g1) > 1 ? 'alert' : 'engineering'} size="sm" />
          </ReadoutGrid>
          <Note tone={normalCondition.met ? 'ok' : 'alert'}>
            {normalCondition.detail} A sample of twelve cannot lean on the central limit theorem, so the condition is settled by looking: the dotplot has no value outside the fences and no
            long tail either way. That sentence, with those two numbers in it, is what a t procedure needs on the page.
          </Note>
        </section>

        <section aria-label="Conditions for a one-sample t procedure">
          <Subhead>Conditions, as the procedure reports them</Subhead>
          <ConditionList conditions={OUTPUT_INTERVAL.conditions} />
        </section>

        <section aria-label="The yard's refit log">
          <Subhead>The Adlinda log, as forwarded</Subhead>
          <KeyTable
            ariaLabel="The twelve uprated hulls with their refit dates and post-refit thrust certifications"
            caption={`${fmtInt(REFIT_N)} Sulcus hulls through the Adlinda Mk 3 uprate, refit-date order`}
            columns={['hull', 'refit signed off', 'certified thrust (kN)', 'over the ' + fmtInt(MK3_SPEC_KN) + ' kN spec']}
            rows={refitSet.map((h) => [h.hull, h.refit_date, fmt(h.output_kN, 1), fmtPct((h.output_kN - MK3_SPEC_KN) / MK3_SPEC_KN, 2)])}
          />
        </section>
      </div>
    </Panel>
  )
}
