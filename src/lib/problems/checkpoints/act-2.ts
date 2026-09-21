/**
 * Act II checkpoint — "Manifests" (curriculum map §5, 10 items, 20 min).
 *
 * Sandoval's sign-off on the engineering deck, with Ferrier beside her. The Chief will not let
 * sixteen hundred tonnes go up the chain on a napkin: she wants the fit, the fit without the ore
 * hauler, and the number that says how far a hull can sit from the line and still be ordinary.
 * Exactly one display item (q3, the scatterplot); q2 carries the interpretation weight.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act2Checkpoint: CheckpointSpec = {
  act: 'act-2',
  title: 'Manifests',
  briefing:
    'MET 046/20:10. Turnover is ninety minutes behind you and the deck still has a down. Sandoval has the report on the engineering slate, one hand flat on it, and Ferrier is standing where she can read it upside down. *"Sixteen hundred tonnes is a cargo, Skipper. I will not send a cargo up the chain on a napkin."* She wants three things before she signs the mass: the fit, what it looks like without the ore hauler, and the number that says how far a hull can sit off the line and still be ordinary. Answer from the file. Where she asks for a sentence, write the one that survives a hostile reader.',
  est_minutes: 20,
  threshold: 0.8,
  items: [
    { id: 'q1', generator: 'act-2/conditional-from-table', review: ['act-2-01'], debrief: 'Ferrier: "Wrong denominator. The group you were asked about is the row, not the file."' },
    { id: 'q2', generator: 'act-2/association-in-context', review: ['act-2-01'], weight: 1.5, debrief: 'Ferrier: "Two conditional distributions, and say they differ. No verb that means *caused*."' },
    { id: 'q3', generator: 'act-2/describe-scatter', review: ['act-2-02'], debrief: 'Oyelaran: "Direction, then form, then how tight, then the ones that are not with the others. In that order, sir."' },
    { id: 'q4', generator: 'act-2/r-properties', review: ['act-2-02'], debrief: 'Ebele: "So — tonnes or kilotonnes, r does not move. Yes, sir. That is the whole point of it."' },
    { id: 'q5', generator: 'act-2/predict-and-residual', review: ['act-2-03', 'act-2-04'], debrief: 'Sandoval: "Predicted first, Skipper, then actual minus predicted. Get the order wrong and the sign tells the reader the opposite."' },
    { id: 'q6', generator: 'act-2/interpret-slope', review: ['act-2-03'], debrief: 'Ferrier: "*Predicted.* *On average.* Per tonne. Leave a word out and the Board reads it as a promise about one hull."' },
    { id: 'q7', generator: 'act-2/residual-pattern', review: ['act-2-04'], debrief: 'Ebele: "A pattern in the residuals is the model being wrong. The data are not wrong. That was my mistake, sir."' },
    { id: 'q8', generator: 'act-2/interpret-r2-s', review: ['act-2-05'], debrief: 'Sandoval: "r-squared says how much. s says how far. The Bureau sent us the first one and kept the second."' },
    { id: 'q9', generator: 'act-2/leverage-effect', review: ['act-2-05'], debrief: 'Ferrier: "Far out on x is not the same as pulling the line. Run it both ways before you call a point a problem."' },
    { id: 'q10', generator: 'act-2/choose-transform', review: ['act-2-06'], debrief: 'Sandoval: "Pick the model whose residuals have nothing left to say. Then put the prediction back in days before you write it down."' },
  ],
  onPass:
    'Sandoval reads the last line twice, takes the stylus, and signs the mass. She does not say *good*. *"Nineteen hulls left Uruk High heavier than their certificates. That is the sentence. Do not let anyone put an adverb in it."* Ferrier initials beneath her. The report goes at MET 048/06:00, addressed through the Directorate of Lane Operations, as directed.',
  onFail:
    '"Not with my name under it." Sandoval puts the stylus down and does not pick it up again. "Fix these first, Skipper. If the Chief can find them in ten minutes, the Board\'s staff will find them in five, and they will not tell you which ones." She names the displays she will not sign, and the module each one came from, and goes back to the cellar gauge she was reading when you came in.',
}
