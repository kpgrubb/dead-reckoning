/**
 * Decision-aware story helpers for Act III. The learner's calls in act-3-02 (sampling design; include
 * Sulcus masters) and act-3-05 (order the lottery) colour later text and set which seeded dataset a
 * beat is graded on. These read `useProgress().decisions` and render the right numbers / MissionBeat.
 *
 *   <SurveyFigure of="turningLate" />           a number from the survey as it ran under the chosen design
 *   <SurveyBeat kind="belief" | "nonresponse">  numeric MissionBeat graded on that run (children = Success/Failure)
 *   <LotteryBeat>                               numeric MissionBeat: exact one-sided p for the lottery or the pilot
 *   <Decided id="act-3-05-lottery" is="decline">…</Decided>   conditional flavour text
 *   <EyesLine />                                Oyelaran's "eleven degrees, maybe" if the Eyes stayed on the sweep (Act II)
 *   <RegisterOfficeTable />                     DS-01 classification × office (a census, described not tested)
 */
import type { ReactNode } from 'react'
import { MissionBeat } from '@/components/MissionBeat'
import { Dialogue } from '@/components/Dialogue'
import { Plot } from '@/components/Plot'
import { useProgress } from '@/store/progress'
import { fmt, fmtPct } from '@/lib/stats'
import { scopeRubric } from './beats'
import {
  DESIGN_LABEL,
  DESIGN_OPTIONS,
  LOTTERY_OPTIONS,
  REGISTER_OFFICE_COLUMNS,
  REGISTER_OFFICE_ROWS,
  SULCUS_OPTIONS,
  SURVEY_RUNS,
  designFromDecision,
  independentBeliefProportion,
  sulcusNonresponseRate,
  trialFromDecision,
  type SurveyRun,
} from './data'

export const DECISION_IDS = {
  design: 'act-3-02-design',
  sulcus: 'act-3-02-sulcus',
  lottery: 'act-3-05-lottery',
} as const

export function useDecision(id: string): string | undefined {
  return useProgress((s) => s.decisions[id])
}

/** The survey as it ran under the learner's chosen design (SRS until a design is recorded). */
export function useSurveyRun(): SurveyRun {
  const choice = useDecision(DECISION_IDS.design)
  return SURVEY_RUNS[designFromDecision(choice)]
}

export function useSulcusIncluded(): boolean {
  const choice = useDecision(DECISION_IDS.sulcus)
  return !choice || choice === SULCUS_OPTIONS.include || /include/i.test(choice)
}

export function useTrial() {
  const choice = useDecision(DECISION_IDS.lottery)
  return trialFromDecision(choice)
}

type Figure = 'design' | 'designLower' | 'n' | 'turningLate' | 'turningLateWord' | 'responders' | 'sulcusContacted' | 'sulcusAnswered' | 'sulcusSilent' | 'independentResponders' | 'independentYes' | 'independentBeliefPct' | 'nonresponsePct' | 'linkHours' | 'mercantileResponders' | 'mercantileYes'

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
export const numberWord = (n: number): string => (n >= 0 && n < WORDS.length ? WORDS[n] : String(n))

/** Inline figure from the survey run under the chosen design. */
export function SurveyFigure({ of, words = false }: { of: Figure; words?: boolean }) {
  const run = useSurveyRun()
  const w = (n: number) => (words ? numberWord(n) : String(n))
  switch (of) {
    case 'design':
      return <>{DESIGN_LABEL[run.design]}</>
    case 'designLower':
      return <>{DESIGN_LABEL[run.design].toLowerCase()}</>
    case 'n':
      return <>{w(run.n)}</>
    case 'turningLate':
      return <>{w(run.turningLate)}</>
    case 'turningLateWord':
      return <>{numberWord(run.turningLate)}</>
    case 'responders':
      return <>{w(run.responders.length)}</>
    case 'sulcusContacted':
      return <>{w(run.sulcusContacted)}</>
    case 'sulcusAnswered':
      return <>{w(run.sulcusAnswered)}</>
    case 'sulcusSilent':
      return <>{w(run.sulcusSilent)}</>
    case 'independentResponders':
      return <>{w(run.independentResponders)}</>
    case 'independentYes':
      return <>{w(run.independentYes)}</>
    case 'mercantileResponders':
      return <>{w(run.mercantileResponders)}</>
    case 'mercantileYes':
      return <>{w(run.mercantileYes)}</>
    case 'independentBeliefPct':
      return <>{fmtPct(independentBeliefProportion(run), 0)}</>
    case 'nonresponsePct':
      return <>{fmtPct(sulcusNonresponseRate(run), 0)}</>
    case 'linkHours':
      return <>{fmt(run.linkMinutes / 60, 1)}</>
  }
}

/**
 * Numeric mission beat graded on the survey run under the chosen design.
 *  belief      proportion of responding independent masters who believe piracy
 *  nonresponse Sulcus nonresponse rate (silent ÷ contacted)
 */
export function SurveyBeat({ kind, id, children }: { kind: 'belief' | 'nonresponse'; id: string; children?: ReactNode }) {
  const run = useSurveyRun()
  if (kind === 'belief') {
    return (
      <MissionBeat
        id={id}
        kind="numeric"
        answer={independentBeliefProportion(run)}
        answerKind="proportion"
        label="the independents"
        prompt={`Of the ${run.independentResponders} independent masters who answered under the ${DESIGN_LABEL[run.design].toLowerCase()}, ${run.independentYes} said they believe pirates are responsible. What proportion of the responding independent masters believe piracy? Give a proportion to three decimal places.`}
        hint="A proportion is the count who said yes over the count who answered — not over the count contacted, and not over the whole sample. Sulcus masters who said “no comment” are not independents and are not answers."
      >
        {children}
      </MissionBeat>
    )
  }
  return (
    <MissionBeat
      id={id}
      kind="numeric"
      answer={sulcusNonresponseRate(run)}
      answerKind="proportion"
      label="the silence"
      prompt={`Solberg contacted ${run.sulcusContacted} Sulcus masters. ${run.sulcusAnswered} answered — “no comment” — and ${run.sulcusSilent} did not answer at all. Record the Sulcus nonresponse rate as a proportion of those contacted, to three decimal places.`}
      hint="Nonresponse is the share of the contacted units that gave no response. The two who said “no comment” responded; they are not part of the nonresponse."
    >
      {children}
    </MissionBeat>
  )
}

/** Numeric mission beat: the exact one-sided randomization p-value for whichever trial the learner has. */
export function LotteryBeat({ id, children }: { id: string; children?: ReactNode }) {
  const trial = useTrial()
  const n = trial.transits.length
  const k = trial.escorted.length
  return (
    <MissionBeat
      id={id}
      kind="numeric"
      answer={trial.exact.pLess}
      answerKind="pValue"
      label="where minus two-thirds falls"
      prompt={`Ebele’s claim is directional: escorts *reduce* advisories. Under the claim that escorts do nothing, every one of the ${trial.exact.count} ways of choosing ${k} escorted transits out of ${n} was equally likely. What fraction of those relabellings gives a difference (escorted − unescorted) at least as negative as the one observed, ${fmt(trial.exact.observed, 2)}? Report the exact one-sided randomization p-value to four decimal places.`}
      hint={`Count the relabellings with x̄ₑ − x̄ᵤ ≤ ${fmt(trial.exact.observed, 3)} and divide by ${trial.exact.count}. The machine’s shuffles approximate it; the exact count is on its readout.`}
    >
      {children}
    </MissionBeat>
  )
}

/**
 * Interpretation mission beat: the scope of inference for whichever trial the learner has. The rubric
 * needs the trial's own p-value and transit count, which depend on the act-3-05 decision, so the beat
 * has to read the store — an MDX body cannot call a hook inside a JSX expression.
 */
export function LotteryScopeBeat({ id, children }: { id: string; children?: ReactNode }) {
  const trial = useTrial()
  const n = trial.transits.length
  return (
    <MissionBeat
      id={id}
      kind="interpretation"
      label="what the trial licenses"
      prompt={`Write the scope of inference for ${trial.name}, as it will appear in the report. Say whether the difference in advisories is statistically significant and cite the one-sided randomization p-value. Say what the design licenses and what it does not: which conclusion the ${n} transits' assignment by lot buys, how far the finding generalizes, and what the trial says about losses.`}
      hint="Four things, and the fourth is the one Ebele leaves out: the decision and the p-value; what random assignment would have licensed had there been a difference; how far it generalizes, given these transits were not a random sample of the Lane; and what the response variable was — advisories, not losses."
      {...scopeRubric(trial.exact.pLess, { transits: n, name: trial.name })}
    >
      {children}
    </MissionBeat>
  )
}

type Match = 'order' | 'decline' | 'include' | 'exclude' | 'srs' | 'stratified' | 'cluster' | 'undecided'

function decisionMatches(id: string, choice: string | undefined, is: Match): boolean {
  if (is === 'undecided') return !choice
  if (id === DECISION_IDS.lottery) {
    const t = trialFromDecision(choice)
    return is === 'order' ? t.ordered : is === 'decline' ? !t.ordered : false
  }
  if (id === DECISION_IDS.sulcus) {
    const inc = !choice || choice === SULCUS_OPTIONS.include || /include/i.test(choice)
    return is === 'include' ? inc : is === 'exclude' ? !inc : false
  }
  if (id === DECISION_IDS.design) return designFromDecision(choice) === is
  return false
}

/** Render children only when the recorded decision matches (undecided lottery = ordered; undecided Sulcus = included; undecided design = SRS). */
export function Decided({ id, is, children }: { id: string; is: Match; children?: ReactNode }) {
  const choice = useDecision(id)
  return decisionMatches(id, choice, is) ? <>{children}</> : null
}

/**
 * Act II's "lend the Eyes to archive work" decision (act-2-02). If the sweep was kept, Oyelaran has
 * Harpagia Sulcus's plume-vector change in the log; if the Eyes were lent, she has nothing to say.
 * The Act II team's decision key is read loosely (any act-2-02 decision whose value mentions lending).
 */
export function useEyesLent(): boolean {
  return useProgress((s) => {
    for (const [k, v] of Object.entries(s.decisions)) if (/^act-2-02/.test(k) && /lend/i.test(v) && !/keep/i.test(v)) return true
    return false
  })
}

export function EyesLine() {
  const lent = useEyesLent()
  if (lent) {
    return (
      <Dialogue speaker="sensors" aside="The Eyes were on the Bureau archive at MET 59. She does not look up.">
        No vector on it. The Eyes were on the archive when it went dark. I have the transponder fade and nothing else.
      </Dialogue>
    )
  }
  return (
    <Dialogue speaker="sensors" aside="Reading the sweep log from MET 59 back, at 0.7 AU.">
      Plume vector change at Mark nine point three. Eleven degrees, maybe. Plus or minus half a degree at this range, and I would not put it in a report.
    </Dialogue>
  )
}

/** DS-01: who classified what — a census of the 31, described not tested. */
export function RegisterOfficeTable() {
  return <Plot spec={{ kind: 'table', columns: REGISTER_OFFICE_COLUMNS, rows: REGISTER_OFFICE_ROWS }} label="REGISTER · CLASSIFICATION BY OFFICE" tone="intel" description="Classification of the 31 losses by the classifying office: unknown 19 Uruk and 3 Ceres; accident 0 Uruk and 5 Ceres; piracy 4 Uruk and 0 Ceres; Uruk classified 23, Ceres 8." showTable />
}

export { DESIGN_OPTIONS, SULCUS_OPTIONS, LOTTERY_OPTIONS }
