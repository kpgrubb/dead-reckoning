/**
 * Prologue checkpoint — REFERENCE / PIPELINE PROOF. The Prologue Act Team replaces this with the
 * spec from the curriculum map. Items reuse the Act 0 reference generators.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act0Checkpoint: CheckpointSpec = {
  act: 'act-0',
  title: 'Shakedown Sign-off',
  briefing:
    'The yard wants a signed shakedown report before *Nightjar* is released to the Lane. The Chief has laid the log in front of you. Answer from the numbers, not the adjectives.',
  est_minutes: 10,
  threshold: 0.8,
  items: [
    { id: 'q1', generator: 'act-0/fix-error-mean', review: ['act-0-01'], debrief: 'Ferrier: "Add them. Divide. It is not a judgment call."' },
    { id: 'q2', generator: 'act-0/resistant-center', review: ['act-0-01'], debrief: 'Ferrier: "One bad fix should not move the summary. Which one doesn\'t move?"' },
    { id: 'q3', generator: 'act-0/sd-in-context', review: ['act-0-01'], debrief: 'Sandoval: "A spread is a typical distance from the middle, Skipper. Say it that way."' },
    { id: 'q4', generator: 'act-0/dotplot-shape', review: ['act-0-01'], debrief: 'Oyelaran: "Look at where the pile leans, sir."' },
    { id: 'q5', generator: 'act-0/two-way-conditional', review: ['act-0-01'], debrief: 'Ebele: "So — the denominator is the row you were asked about, not the whole table."' },
  ],
  onPass: 'You sign. The Chief initials beneath your name without reading it, which is her way of saying she already had.',
  onFail: 'The Chief takes the slate back. "Again, Skipper. The yard will read this, and so will people who are not the yard."',
}
