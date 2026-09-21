/**
 * Act I checkpoint — "Signatures" (curriculum map §5, 11 items, 20 min). Ferrier's read-through of the
 * preliminary before Solberg sends it: every item she strikes names the module to revisit.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act1Checkpoint: CheckpointSpec = {
  act: 'act-1',
  title: 'Signatures',
  briefing:
    'MET 027/14:00. The preliminary is eleven displays and four paragraphs. Ferrier reads it at the intel terminal with the file open beside it, and does not look up. "This goes out under the Captain\'s name. I want every display in it to survive a hostile reader." She takes each one in turn. Answer from the numbers; where she asks for a sentence, write the one that would survive the Board\'s staff.',
  est_minutes: 20,
  threshold: 0.8,
  items: [
    { id: 'q1', generator: 'act-1/population-sample', review: ['act-1-01'], debrief: 'Ferrier: "Struck. Say what the file is a sample of, and what the number describes, before you describe it."' },
    { id: 'q2', generator: 'act-1/variable-types', review: ['act-1-01'], debrief: 'Ferrier: "Struck. A code is not a measurement. Which of these columns can you take a mean of?"' },
    { id: 'q3', generator: 'act-1/relative-frequency', review: ['act-1-01'], debrief: 'Ebele: "So the denominator is — yes, sir. The row, not the file."' },
    { id: 'q4', generator: 'act-1/display-distortion', review: ['act-1-02'], debrief: 'Ferrier: "Struck. The Board\'s staff will read the axis before they read the bars. So will I."' },
    { id: 'q5', generator: 'act-1/describe-signature-histogram', review: ['act-1-03'], debrief: 'Oyelaran: "Say that again, sir — shape first. Then the middle, then the spread, then the one that isn\'t like the others."' },
    { id: 'q6', generator: 'act-1/median-iqr', review: ['act-1-04'], debrief: 'Ferrier: "Struck. Sort it. The middle of the list, not the middle of the graph."' },
    { id: 'q7', generator: 'act-1/resistance-choice', review: ['act-1-04'], debrief: 'Ebele: "One value moved and the mean went with it. The median — yes, sir. It doesn\'t."' },
    { id: 'q8', generator: 'act-1/upper-fence', review: ['act-1-05'], debrief: 'Ferrier: "Struck. Q3 plus one and a half boxes. If the fence is wrong, the hull id we requested is a guess."' },
    { id: 'q9', generator: 'act-1/compare-boxplots', review: ['act-1-06'], weight: 1.5, debrief: 'Ferrier: "That\'s two descriptions, Ensign, not a comparison. One sentence, with *than* in it."' },
    { id: 'q10', generator: 'act-1/z-tail-area', review: ['act-1-07'], debrief: 'Sandoval: "Distance in spreads, Skipper, then the area past it. The height of the curve is not a probability."' },
    { id: 'q11', generator: 'act-1/unit-conversion', review: ['act-1-07'], debrief: 'Sandoval: "Tonnes or percent, the spread scales and the centre shifts. The z does not move. That\'s the point of it."' },
  ],
  onPass:
    'Ferrier reads the last display twice and puts the slate down. "It survives." She does not say *good*. She initials the routing line under your name and hands it to Solberg, who has been standing at the comms station for eleven minutes without saying so.',
  onFail:
    '"It doesn\'t go tonight." Ferrier lays the slate face down. "Fix these first. The Board\'s staff will find every one of them, and they will find them in the order I did." She names the displays she struck, and the module each one came from, and goes to the wardroom to wait.',
}
