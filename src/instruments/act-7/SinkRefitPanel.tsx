/**
 * ENGINEERING · COLD PROFILES, BEFORE AND AFTER (act-7-04) — DS-12, the sink's own paired file.
 *
 * Eight matched cold profiles run by the Chief before the Halden Reach refit and again after it, the
 * same load, the same instrument, the same ship. The pairing is the design, so the analysis is one
 * sample of eight differences — or of four, when the filter is on one profile.
 *
 * What the learner does: selects a profile. On Watch the four matched runs give a loss in HOURS with
 * a standard error near one hour. On "all eight" the hours are useless as a single sample, because a
 * Standby run is burning three and a half times what a Quiet run burns and loses a third as many
 * hours for the same fraction of the sink; the percentage column is what the eight share. The
 * readouts and the conditions block change with the filter.
 *
 * ── Props (stable) ──────────────────────────────────────────────────────────────────────────────
 *
 *   runs          the matched cold profiles. Default DS-12's eight.
 *   confidence    interval level on load. Default 0.95.
 *   profile       which filter is selected on load. Default 'Watch'.
 *   label, tone   Panel header and ship-system tone.
 *
 * Every statistic comes from `@/lib/stats` via `pairedTTest` / `pairedTInterval` / `oneMeanTest` /
 * `oneMeanInterval`. Nothing here is typed in and nothing here is random.
 */
import { useMemo, useState } from 'react'
import { Panel, type PanelTone } from '@/components/Panel'
import { Dotplot, Readout, Segmented, Slider } from '@/instruments/shared'
import { fmt, fmtInt, fmtP, fmtPct, mean, oneMeanInterval, oneMeanTest, pairedDifferences, pairedTInterval, pairedTTest, sd } from '@/lib/stats'
import { PROFILE_LOAD_KW, SINK_GJ_DESIGN, SINK_GJ_REFIT, sinkRefit, type ColdProfileRun } from './data'
import { ConditionList, KeyTable, Note, ReadoutGrid, Subhead, stackStyle } from './_ui'

type Filter = 'all' | 'Quiet' | 'Watch' | 'Standby'

export interface SinkRefitPanelProps {
  runs?: readonly ColdProfileRun[]
  confidence?: number
  profile?: Filter
  label?: string
  tone?: PanelTone
}

export function SinkRefitPanel({
  runs = sinkRefit,
  confidence: c0 = 0.95,
  profile: p0 = 'Watch',
  label = 'ENGINEERING · COLD PROFILES, BEFORE AND AFTER',
  tone = 'engineering',
}: SinkRefitPanelProps = {}) {
  const [filter, setFilter] = useState<Filter>(p0)
  const [confidence, setConfidence] = useState(c0)

  const selected = useMemo(() => runs.filter((x) => filter === 'all' || x.profile === filter), [runs, filter])
  const n = selected.length
  const before = useMemo(() => selected.map((x) => x.before_h), [selected])
  const after = useMemo(() => selected.map((x) => x.after_h), [selected])
  /** before − after, so a loss of endurance reads positive. One matched run supports no inference. */
  const losses = useMemo(() => (before.length >= 2 ? pairedDifferences(before, after) : before.map((v, i) => v - after[i])), [before, after])
  /** The same eight runs as a fraction of each run's own design endurance. */
  const fractions = useMemo(() => selected.map((x) => (x.after_h - x.before_h) / x.before_h), [selected])

  const enough = n >= 2

  const hoursTest = useMemo(() => (enough ? pairedTTest(before, after, { alt: 'greater', random: true }) : null), [enough, before, after])
  const hoursInterval = useMemo(() => (enough ? pairedTInterval(before, after, { confidence, random: true }) : null), [enough, before, after, confidence])
  const pctTest = useMemo(() => (enough ? oneMeanTest(fractions, { mu0: 0, alt: 'less', random: true }) : null), [enough, fractions])
  const pctInterval = useMemo(() => (enough ? oneMeanInterval(fractions, { confidence, random: true }) : null), [enough, fractions, confidence])

  const hoursCi = (hoursInterval?.ci ?? null) as [number, number] | null
  const pctCi = (pctInterval?.ci ?? null) as [number, number] | null

  const mixed = filter === 'all'
  const loadSpread = Math.max(...selected.map((x) => x.load_kW)) - Math.min(...selected.map((x) => x.load_kW))

  const rows = selected.map((x) => [
    x.run_id,
    x.profile,
    fmt(x.load_kW, 1),
    fmt(x.before_h, 2),
    fmt(x.after_h, 2),
    fmt(x.before_h - x.after_h, 2),
    fmtPct((x.after_h - x.before_h) / x.before_h, 1),
  ]) as (string | number)[][]

  return (
    <Panel
      label={label}
      status={`${filter === 'all' ? 'ALL PROFILES' : filter.toUpperCase()} · ${fmtInt(n)} MATCHED RUN${n === 1 ? '' : 'S'}`}
      tone={tone}
      led={enough ? 'on' : 'warn'}
      ariaLabel="Sink refit panel: eight matched cold profiles before and after the refit, filtered by profile"
    >
      <div style={stackStyle}>
        <div className="dr-controls">
          <Segmented<Filter>
            label="cold profile"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `all eight` },
              { value: 'Quiet', label: `Quiet · ${fmtInt(PROFILE_LOAD_KW.Quiet)} kW` },
              { value: 'Watch', label: `Watch · ${fmtInt(PROFILE_LOAD_KW.Watch)} kW` },
              { value: 'Standby', label: `Standby · ${fmtInt(PROFILE_LOAD_KW.Standby)} kW` },
            ]}
          />
          <Slider label="confidence level C" value={Math.round(confidence * 100)} min={80} max={99} step={1} onChange={(v) => setConfidence(v / 100)} format={(v) => `${v}%`} />
        </div>

        <KeyTable
          caption={`Matched cold profiles: endurance to saturation before and after the refit (${fmtInt(SINK_GJ_DESIGN)} GJ as designed, ${fmtInt(SINK_GJ_REFIT)} GJ after)`}
          ariaLabel="Matched cold profiles before and after the refit"
          columns={['run', 'profile', 'load kW', 'before h', 'after h', 'lost h', '% of design']}
          rows={rows}
        />

        {enough ? (
          <>
            <section aria-label="The loss in hours">
              <Subhead>Hours lost · the differences as one sample</Subhead>
              <ReadoutGrid>
                <Readout label="mean loss (h)" value={fmt(hoursTest!.estimate, 2)} tone="engineering" live />
                <Readout label="s of the differences" value={fmt(sd(losses), 3)} size="sm" live />
                <Readout label="standard error (h)" value={fmt(hoursTest!.se, 3)} tone="engineering" live />
                <Readout label="t" value={fmt(hoursTest!.statistic, 2)} size="sm" live />
                <Readout label="df" value={fmtInt(hoursTest!.df ?? n - 1)} size="sm" live />
                <Readout label="p (one-sided)" value={fmtP(hoursTest!.pValue ?? NaN)} size="sm" live />
              </ReadoutGrid>
              <ReadoutGrid>
                <Readout label={`${fmtPct(confidence, 0)} lower (h)`} value={fmt(hoursCi![0], 2)} tone="engineering" live />
                <Readout label={`${fmtPct(confidence, 0)} upper (h)`} value={fmt(hoursCi![1], 2)} tone="engineering" live />
              </ReadoutGrid>
              <Dotplot
                values={losses}
                label="endurance lost (h)"
                references={[
                  { x: 0, label: 'no loss · 0', color: 'null' },
                  { x: mean(losses), label: `d̄ = ${fmt(mean(losses), 2)}`, color: 'observed' },
                ]}
                height={160}
                ariaLabel="Dotplot of the hours lost on each matched run"
                description={`${fmtInt(n)} differences from ${fmt(Math.min(...losses), 2)} to ${fmt(Math.max(...losses), 2)} hours, mean ${fmt(mean(losses), 2)}.`}
              />
            </section>

            <section aria-label="The loss as a fraction of design endurance">
              <Subhead>The same runs as a fraction of design endurance</Subhead>
              <ReadoutGrid>
                <Readout label="mean change" value={fmtPct(mean(fractions), 1)} tone="engineering" live />
                <Readout label="standard error" value={fmtPct(pctTest!.se, 2)} size="sm" live />
                <Readout label={`${fmtPct(confidence, 0)} lower`} value={fmtPct(pctCi![0], 1)} size="sm" live />
                <Readout label={`${fmtPct(confidence, 0)} upper`} value={fmtPct(pctCi![1], 1)} size="sm" live />
              </ReadoutGrid>
              <Note tone={mixed ? 'warn' : 'muted'} live>
                {mixed
                  ? `Across all eight the logged load runs from ${fmt(Math.min(...selected.map((x) => x.load_kW)), 0)} to ${fmt(Math.max(...selected.map((x) => x.load_kW)), 0)} kW, a spread of ${fmt(loadSpread, 0)} kW, and hours lost scale with how fast the sink is being emptied: the Standby run gives up ${fmt(Math.min(...losses), 1)} hours and a Quiet run ${fmt(Math.max(...losses), 1)}. Those eight numbers are not measurements of one quantity, and a mean of them answers no question anyone asked. The percentage column is the one the eight share: ${fmtPct(mean(fractions), 1)} of design endurance, standard error ${fmtPct(pctTest!.se, 2)}.`
                  : `Every run on this profile draws within ${fmt(loadSpread, 0)} kW of the same load, so hours and percentage tell the same story here. Hours are the number the Chief works to; the percentage is the number that survives being compared with a profile at a different load.`}
              </Note>
            </section>

            <section aria-label="Conditions">
              <Subhead>Conditions · checked on the differences</Subhead>
              <ConditionList conditions={hoursTest!.conditions} />
              <Note>
                The normality condition belongs to the {fmtInt(n)} differences plotted above, not to the before column or the after column. Those two are spread by the load each run was
                carrying; the differences are not.
              </Note>
            </section>
          </>
        ) : (
          <Note tone="warn">
            One matched run on this profile. A single difference has a value and no spread, so there is no standard error to quote and no t to compute. The run stays in the table and in the
            eight-profile percentage, and it supports no interval of its own.
          </Note>
        )}
      </div>
    </Panel>
  )
}
