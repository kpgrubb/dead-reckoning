/**
 * Prologue checkpoint — "Release" (act-0-checkpoint). Ten items, fresh parameters per attempt,
 * threshold 0.8: NUM q1 q5 q6 q8 · MC q2 q3 q4 q7 · DISP q9 · INT q10 (weight 1.5).
 * Framed as Ferrier's read-through of the shakedown report before the departure burn (MET 10/02:30).
 */
import type { CheckpointSpec } from '../checkpoints'

export const act0Checkpoint: CheckpointSpec = {
  act: 'act-0',
  title: 'Release',
  briefing:
    'MET 10/02:30. The yard’s release form is one page; the shakedown report under it is nine. Ferrier reads it at the plot with the burn timer running. “This goes to Adlinda under your name, Captain. Every number in it should survive someone who wants it to be wrong.” Answer from the log, not the adjectives.',
  est_minutes: 10,
  threshold: 0.8,
  items: [
    { id: 'q1', generator: 'act-0/fix-run-centre', review: ['act-0-01'], debrief: 'Ferrier: “One number for where, one for how sure. You gave him the wrong one.”' },
    { id: 'q2', generator: 'act-0/parameter-or-statistic', review: ['act-0-01'], debrief: 'Ferrier: “Which of those could you ever actually compute from the log?”' },
    { id: 'q3', generator: 'act-0/summary-of-centre', review: ['act-0-01'], debrief: 'Ferrier: “The spread is real. It is not the position.”' },
    { id: 'q4', generator: 'act-0/classify-telemetry', review: ['act-0-02'], debrief: 'Sandoval: “A cause code is a name with digits in it, Skipper. You can’t average names.”' },
    { id: 'q5', generator: 'act-0/design-shortfall', review: ['act-0-02'], debrief: 'Sandoval: “Design minus measured, over design. And bring the plus-or-minus with it.”' },
    { id: 'q6', generator: 'act-0/relative-frequency-filtered', review: ['act-0-03'], debrief: 'Ebele: “So — the denominator is whatever the filter left, sir. Not the whole file.”' },
    { id: 'q7', generator: 'act-0/population-described', review: ['act-0-03'], debrief: 'Ferrier: “Assuming the file is complete. Which file, and who filled it?”' },
    { id: 'q8', generator: 'act-0/percent-to-count', review: ['act-0-03'], debrief: 'Ebele: “One point four percent sounds like nothing until you multiply it.”' },
    { id: 'q9', generator: 'act-0/read-the-run', review: ['act-0-01'], debrief: 'Ferrier: “Look at the pile, not the edge of it.”' },
    { id: 'q10', generator: 'act-0/register-population', review: ['act-0-03'], weight: 1.5, debrief: 'Ferrier: “The Register is what two offices wrote down. Say what it is before you say what it shows.”' },
  ],
  onPass:
    'Ferrier initials each page and hands the slate back without comment, which from her is comment. Solberg sends the release to Adlinda at 02:52 — nine seconds out, the last transmission that will arrive before anyone has had time to think about it. At 03:00 the torch lights at four milligee and there is down again.',
  onFail:
    'Ferrier turns the slate face down on the plot. “It doesn’t go under your name like this. Fix these before the burn.” She names the modules; the burn timer does not stop.',
}
