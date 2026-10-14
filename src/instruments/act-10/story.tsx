/**
 * Decision-aware story helpers for the Epilogue. The level the learner set on the night of MET 140
 * (act-6-06's decision beat) is the one number Achterberg reads back to them at the hearing, and it
 * is the level the review console holds on its locked line.
 *
 *   useChosenAlpha()      0.05 or 0.01, from the recorded decision; 0.01 when nothing was recorded
 *   <CaseReviewConsole/>  the hostile-review console with that level as the pre-specified one
 *   <AlphaLine/>          Achterberg reading the level back, in the words each choice earns
 *
 * Nothing branches structurally: both readings produce the same hearing and the same file.
 */
import type { ReactNode } from 'react'
import { Dialogue } from '@/components/Dialogue'
import { MissionBeat } from '@/components/MissionBeat'
import { useProgress } from '@/store/progress'
import { fmt, fmtInt, fmtPct } from '@/lib/stats'
import { ALTERNATIVE_DOUBLING, OTHER_LOSSES, OTHER_TRANSITS, PERRINE_HOLDINGS, PERRINE_LOSSES, PERRINE_TRANSITS, powerAgainst } from './data'
import { hearingRubric } from './beats'
import { ReviewConsole } from './ReviewConsole'

/** act-6-06's decision beat. Its options carry the level in their first sentence. */
export const ALPHA_DECISION_ID = 'act-6-06-alpha'

export const STRICT_ALPHA = 0.01
export const CONVENTIONAL_ALPHA = 0.05

export function useChosenAlpha(): number {
  const choice = useProgress((s) => s.decisions[ALPHA_DECISION_ID])
  if (choice && /0\.05/.test(choice)) return CONVENTIONAL_ALPHA
  return STRICT_ALPHA
}

export function CaseReviewConsole() {
  const alpha = useChosenAlpha()
  return <ReviewConsole prespecified={alpha} />
}

/**
 * Achterberg, on the record, with the level in front of her. She quotes the strict one back with
 * approval because it is the one that survives being read aloud; the conventional one gets the
 * other half of the same ledger, and no reproach, because both were signed in advance.
 */
export function AlphaLine() {
  const alpha = useChosenAlpha()
  const strict = alpha === STRICT_ALPHA
  const power = powerAgainst(ALTERNATIVE_DOUBLING, alpha)
  return strict ? (
    <Dialogue speaker="achterberg" aside="She finds the level on the brief's first page, where it is, and puts the page back down.">
      One in a hundred, and the night before you ran it. I have read four hundred naval findings. Eleven of them set the level before the data.
    </Dialogue>
  ) : (
    <Dialogue speaker="achterberg" aside="She finds the level on the brief's first page, where it is, and puts the page back down.">
      One in twenty, and the night before you ran it. Counsel will call that the lenient level. The date is the answer to counsel, and {fmtPct(power.power, 0)} is what it bought you.
    </Dialogue>
  )
}

/** The chosen level as a formatted string, for prose that has to agree with the console. */
export function ChosenAlpha() {
  return <>{fmt(useChosenAlpha(), 2)}</>
}

/**
 * The answer given on the record. The rubric is built against the level the officer actually set,
 * so the group that asks which error you accepted more risk of is asking about your own decision
 * and not about a level the book chose for you.
 */
export function HearingBeat({ children }: { children?: ReactNode }) {
  const alpha = useChosenAlpha()
  const rubric = hearingRubric({
    alpha,
    typeIConsequence: 'this ship accused an insurer and the fund that pays its own pensions of arranging the deaths of thirty-one crews, on a false alarm',
    typeIIConsequence: 'the diversions went unreported and the next nineteen hulls went the way the first nineteen did',
    parameter: 'loss rate per transit',
    population: 'transits on the Hundred-Day Lane',
  })
  return (
    <MissionBeat
      id="act-10-01-hearing"
      kind="interpretation"
      label="ON THE RECORD"
      prompt={`The test the file turns on is $H_0: p_1 = p_2$ against $H_a: p_1 > p_2$, where $p_1$ and $p_2$ are the true loss rates per transit for hulls whose policies name ${PERRINE_HOLDINGS} and for hulls naming any other beneficiary: ${fmtInt(PERRINE_LOSSES)} of ${fmtInt(PERRINE_TRANSITS)} against ${fmtInt(OTHER_LOSSES)} of ${fmtInt(OTHER_TRANSITS)}. You set $\\alpha = ${fmt(alpha, 2)}$ the night before you ran it. Against the difference you named in advance, ${fmt(ALTERNATIVE_DOUBLING.p1, 3)} against ${fmt(ALTERNATIVE_DOUBLING.p2, 3)}, that level gives the test power ${fmt(powerAgainst(ALTERNATIVE_DOUBLING, alpha).power, 2)}.\n\nThe recorder is running. Four things, in your own words:\n\n1. the **Type I error** for this test, in context, and what it would have cost;\n2. the **Type II error**, in context, and what that would have cost;\n3. which of the two your level accepted more risk of, naming the level;\n4. what the finding is **about** — the parameter and the population — and one **limitation** you would concede before counsel extracts it.`}
      hint="Not definitions. Definitions with prices on them, then the level with its consequence, then the population the claim is attached to, then the one thing in the file you would rather say yourself than be shown."
      {...rubric}
    >
      {children}
    </MissionBeat>
  )
}
