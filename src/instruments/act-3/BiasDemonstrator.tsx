/**
 * BiasDemonstrator (act-3-03) — "Bored at Ceres."
 *
 * Three independent switches, one per bias mechanism, on the same estimate:
 *   frame    the Lane schedule  ·  the masters who called at the Ceres dock office (undercoverage)
 *   contact  tight-beam at random  ·  a posted notice they may ignore (voluntary response)
 *   wording  neutral  ·  the Authority's Q4 (response bias)
 *
 * The SRS-of-the-Lane mechanism is simulated once as the baseline and drawn above the learner's
 * mechanism, both against the same frame truth. Turning any switch moves the *centre*; moving the
 * n slider moves only the *spread*. That is the whole lesson, and the bias readout is labelled so it
 * cannot be missed: a bigger biased sample is a more precise wrong answer.
 *
 * Note the baseline is not perfectly centred either, and that is the act's other lesson: under a
 * random tight-beam contact the Sulcus masters answer "no comment" and drop out, and they are the
 * masters who all believe piracy. Nonresponse is data — it is the residual bias on the clean design.
 *
 * Numbers come from `drawBiased` / `simulateBias` / `biasAndSpread` in `./data`; randomness only from
 * seeded `rng(...)`.
 */
import { useMemo, useState } from 'react'
import { Panel } from '@/components'
import { Histogram, NumberField, Readout, ReadoutRow, Segmented, Slider, semanticColor } from '@/instruments/shared'
import { rng } from '@/lib/rng'
import { fmt, fmtInt, fmtPct } from '@/lib/stats'
import { CERES_N, CERES_SURVEY, CERES_MECHANISM, FRAME_BELIEF, LANE_FRAME, SRS_MECHANISM, SRS_N, TRUTH_BELIEF, biasAndSpread, drawBiased, proportion, simulateBias, type BiasMechanism } from './data'
import './act3.css'

/**
 * The second parameter, and the one a tight-beam survey can actually reach: belief in piracy among
 * the masters who give a usable answer at all. The 88 Sulcus masters in the frame say "no comment",
 * and they are the masters who all believe piracy, so this sits well below the frame truth. An SRS of
 * the Lane is unbiased for THIS number and biased for the other one — which is the module's lesson
 * and the reason the silence has to be reported beside the estimate rather than dropped.
 */
const RESPONDERS = LANE_FRAME.filter((m) => !m.sulcus && m.respondsToContact)
const RESPONDER_TRUTH = proportion(RESPONDERS, (m) => m.believesPiracy)

const FRAME_OPTS = [
  { value: 'lane', label: 'the Lane schedule' },
  { value: 'ceres', label: 'arrivals at Ceres' },
] as const
const CONTACT_OPTS = [
  { value: 'random', label: 'tight-beam at random' },
  { value: 'volunteer', label: 'a posted notice' },
] as const
const WORDING_OPTS = [
  { value: 'neutral', label: 'neutral' },
  { value: 'leading', label: 'the Authority’s Q4' },
] as const

const MECH_WORDS: Record<keyof BiasMechanism, Record<string, string>> = {
  frame: { lane: 'the Lane schedule', ceres: 'masters who called at the Ceres dock office' },
  contact: { random: 'a tight-beam contact at random', volunteer: 'a posted notice they may answer or ignore' },
  wording: { neutral: 'a neutrally worded question', leading: 'the Authority’s leading Q4' },
}

const describeMech = (m: BiasMechanism) => `${MECH_WORDS.frame[m.frame]}, reached by ${MECH_WORDS.contact[m.contact]}, asked ${MECH_WORDS.wording[m.wording]}`

/** The mechanism's named bias defects, in AP vocabulary. */
function defects(m: BiasMechanism): string[] {
  const out: string[] = []
  if (m.frame === 'ceres') out.push('undercoverage (the frame is arrivals, not the Lane)')
  if (m.contact === 'volunteer') out.push('voluntary response')
  if (m.contact === 'random') out.push('nonresponse (Sulcus masters give no usable answer)')
  if (m.wording === 'leading') out.push('response bias (question wording)')
  return out
}

export interface BiasDemonstratorProps {
  /** Contacts per survey on load. */
  n?: number
  /** Surveys simulated per distribution. */
  reps?: number
}

export function BiasDemonstrator({ n: n0 = SRS_N, reps: reps0 = 500 }: BiasDemonstratorProps = {}) {
  const [frame, setFrame] = useState<BiasMechanism['frame']>('ceres')
  const [contact, setContact] = useState<BiasMechanism['contact']>('volunteer')
  const [wording, setWording] = useState<BiasMechanism['wording']>('leading')
  const [n, setN] = useState(n0)
  const [reps, setReps] = useState(reps0)

  const mech: BiasMechanism = useMemo(() => ({ frame, contact, wording }), [frame, contact, wording])

  const chosen = useMemo(() => simulateBias(rng('act-3-03', frame, contact, wording, n, reps), { frame, contact, wording }, n, reps), [frame, contact, wording, n, reps])
  const baseline = useMemo(() => simulateBias(rng('act-3-03', 'srs-baseline', n, reps), SRS_MECHANISM, n, reps), [n, reps])
  const one = useMemo(() => drawBiased(rng('act-3-03', 'one-survey', frame, contact, wording, n), { frame, contact, wording }, n), [frame, contact, wording, n])

  const truth = FRAME_BELIEF
  const chosenStats = useMemo(() => biasAndSpread(chosen, truth), [chosen, truth])
  const baseStats = useMemo(() => biasAndSpread(baseline, truth), [baseline, truth])

  const isCeres = frame === CERES_MECHANISM.frame && contact === CERES_MECHANISM.contact && wording === CERES_MECHANISM.wording
  const isSrs = frame === SRS_MECHANISM.frame && contact === SRS_MECHANISM.contact && wording === SRS_MECHANISM.wording

  const setPreset = (m: BiasMechanism, size: number) => {
    setFrame(m.frame)
    setContact(m.contact)
    setWording(m.wording)
    setN(size)
  }

  const refs = [
    { x: truth, label: 'frame truth · all 260', color: 'reference' as const },
    { x: RESPONDER_TRUTH, label: 'truth among masters who answer', color: 'observed' as const },
  ]
  const truths = `Two reference lines: the frame truth over all ${fmtInt(LANE_FRAME.length)} masters on the schedule, ${fmt(truth, 3)}, and the truth among the ${fmtInt(RESPONDERS.length)} masters who give a usable answer, ${fmt(RESPONDER_TRUTH, 3)}.`
  const chosenDesc = `Distribution of ${fmtInt(chosen.length)} survey estimates under ${describeMech(mech)}, with ${fmtInt(n)} masters contacted each time. Centre ${fmt(chosenStats.center, 3)}, bias against the frame truth ${fmt(chosenStats.bias, 3)}, standard deviation ${fmt(chosenStats.spread, 4)}. ${truths}`
  const baseDesc = `Baseline: ${fmtInt(baseline.length)} survey estimates under ${describeMech(SRS_MECHANISM)} with the same ${fmtInt(n)} contacts. Centre ${fmt(baseStats.center, 3)}, bias against the frame truth ${fmt(baseStats.bias, 3)}, standard deviation ${fmt(baseStats.spread, 4)}. The baseline centres on the second reference, not the first: a random contact cannot reach the masters who will not answer. ${truths}`

  return (
    <Panel label="INTEL · BIAS DEMONSTRATOR" status={`n = ${fmtInt(n)} · ${fmtInt(reps)} SURVEYS`} tone="intel" led="on">
      <div className="dr-controls">
        <Segmented label="FRAME" value={frame} options={FRAME_OPTS} onChange={setFrame} />
        <Segmented label="CONTACT" value={contact} options={CONTACT_OPTS} onChange={setContact} />
        <Segmented label="WORDING" value={wording} options={WORDING_OPTS} onChange={setWording} />
      </div>
      <div className="dr-controls">
        <Slider label="masters contacted per survey (n)" value={n} min={10} max={LANE_FRAME.length} step={1} onChange={setN} format={fmtInt} />
        <NumberField label="surveys simulated" value={reps} onChange={setReps} min={100} max={1000} step={100} />
      </div>
      <div className="dr-act3__buttons">
        <button type="button" className="dr-btn" onClick={() => setPreset(CERES_MECHANISM, CERES_N)}>
          SET THE CERES SURVEY
        </button>
        <button type="button" className="dr-btn" onClick={() => setPreset(SRS_MECHANISM, SRS_N)}>
          SET AN SRS OF THE LANE
        </button>
      </div>

      <Histogram values={baseline} domain={[0, 1]} binWidth={0.02} height={200} color={semanticColor('null')} label="baseline · SRS of the Lane, neutral wording" barsLabel="SRS of the Lane" references={refs} ariaLabel="Baseline histogram: survey estimates under a simple random sample of the Lane with neutral wording, against the frame truth" description={baseDesc} />
      <Histogram values={chosen} domain={[0, 1]} binWidth={0.02} height={200} label="your mechanism · sample proportion answering yes" barsLabel="your mechanism" references={refs} ariaLabel="Histogram of survey estimates under the chosen mechanism, against the frame truth" description={chosenDesc} />

      <ReadoutRow>
        <Readout label="centre of your mechanism" value={fmt(chosenStats.center, 4)} tone="intel" live />
        <Readout label="frame truth" value={fmt(truth, 4)} units={`fleet ${fmt(TRUTH_BELIEF, 3)}`} />
        <Readout label="bias (does not shrink with n)" value={fmt(chosenStats.bias, 4)} tone={Math.abs(chosenStats.bias) > 0.05 ? 'alert' : 'tactical'} live />
        <Readout label="spread · SD (shrinks with n)" value={fmt(chosenStats.spread, 4)} tone="sensor" live />
      </ReadoutRow>
      <ReadoutRow>
        <Readout label="baseline centre · SRS of the Lane" value={fmt(baseStats.center, 4)} size="sm" live />
        <Readout label="baseline bias" value={fmt(baseStats.bias, 4)} size="sm" live />
        <Readout label="baseline spread · SD" value={fmt(baseStats.spread, 4)} size="sm" live />
        <Readout label="truth among masters who answer" value={fmt(RESPONDER_TRUTH, 4)} units={`${fmtInt(RESPONDERS.length)} of ${fmtInt(LANE_FRAME.length)}`} size="sm" />
        <Readout label="answered in one such survey" value={`${fmtInt(one.answered)} of ${fmtInt(one.contacted)}`} units={one.contacted ? fmtPct(one.answered / one.contacted, 0) : '—'} size="sm" live />
      </ReadoutRow>

      <p className="dr-act3__note">
        {isCeres && (
          <>
            <strong>The Authority&rsquo;s survey.</strong> {fmtInt(CERES_SURVEY.n)} masters answered a notice at the dock office; {fmtPct(CERES_SURVEY.pYes, 0)} said yes.{' '}
          </>
        )}
        {isSrs && (
          <>
            <strong>An SRS of the Lane.</strong>{' '}
          </>
        )}
        Mechanism: {describeMech(mech)}. Defects: {defects(mech).join('; ')}. Now drag <strong>n</strong> from {fmtInt(10)} to {fmtInt(LANE_FRAME.length)} and watch the two readouts: the spread collapses, the bias does not move. There is no sample size that fixes the wrong list, the self-selected respondent or the leading question.
        {' '}
        <strong>Two lines, not one.</strong> The baseline is not centred on the frame truth either — it sits {fmt(Math.abs(baseStats.bias), 2)} <em>below</em> it, because a tight-beam contact gets &ldquo;no comment&rdquo; from the Sulcus masters and they are the ones who all believe piracy. That is why there are two references on each plot. No survey launched from this ship can estimate what all {fmtInt(LANE_FRAME.length)} masters believe: {fmtInt(LANE_FRAME.length - RESPONDERS.length)} of them will not answer a Compact warship. What a probability design does buy is an unbiased estimate of the second line — belief among the {fmtInt(RESPONDERS.length)} masters who answer, {fmt(RESPONDER_TRUTH, 3)} — reported <em>beside</em> the nonresponse rate rather than instead of it. The silence is a finding, not a gap.
      </p>
    </Panel>
  )
}
