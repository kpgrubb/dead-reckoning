/**
 * Act III checkpoint — "Testimony" (curriculum map §5, 10 items, 20 min).
 *
 * MET 79. Ebele presents the survey report to you and Ferrier in the wardroom before it is filed.
 * The checkpoint is his brief and your corrections: every claim about who was asked, how, and what
 * that licenses. Exactly one display item (q9, the randomization distribution); q4 carries the
 * interpretation weight, and q7 and q10 are the other two sentences the Board will quote back.
 *
 * Generators live in src/lib/problems/generators/act-3/ and are drawn fresh on every attempt.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act3Checkpoint: CheckpointSpec = {
  act: 'act-3',
  title: 'Testimony',
  briefing:
    'MET 079/14:10. Braking, and the deck has had a down for thirty-three days. The wardroom table has the report on it in three parts — the frame, the design, the trial — and Ebele standing at the end of it with his hands behind his back, which is new. Ferrier is sitting where she can see both of you.\n\n*"So — sir. It is ready. I would rather you found the holes than Valhalla."*\n\nFerrier, without looking up: *"Every claim about who was asked, how, and what that licenses. If a sentence says more than the design paid for, strike it now."*\n\nAnswer from the file. Where the brief asks for a sentence, write the one that survives a hostile reader — and nowhere use a verb the method did not buy.',
  est_minutes: 20,
  threshold: 0.8,
  items: [
    {
      id: 'q1',
      generator: 'act-3/study-type-scope',
      review: ['act-3-01'],
      debrief: 'Ferrier: "Name the design before you name the finding. A survey of who arrived is a survey of who arrived, and the population in the sentence has to be the one the list came from."',
    },
    {
      id: 'q2',
      generator: 'act-3/identify-method',
      review: ['act-3-02'],
      debrief: 'Ebele: "Yes, sir. That\'s — yes. I read *groups* and wrote *stratified*. Stratified takes some from every group. Cluster takes every one from some groups. It is the whole difference."',
    },
    {
      id: 'q3',
      generator: 'act-3/srs-random-digits',
      review: ['act-3-02'],
      debrief: 'Solberg: "Two digits at a time, left to right, skip anything out of range and anything already drawn. I read them aloud and log them so that nobody has to take our word for the order."',
    },
    {
      id: 'q4',
      generator: 'act-3/name-the-bias',
      review: ['act-3-03'],
      weight: 1.5,
      debrief: 'Ferrier: "Type, mechanism, direction, context. Four things, one sentence each if you must. A bias without a direction is a complaint, not a finding."',
    },
    {
      id: 'q5',
      generator: 'act-3/bias-or-variability',
      review: ['act-3-03'],
      debrief: 'Ebele: "A bigger sample moves the spread and not the centre. If the centre is in the wrong place, four times the masters puts it in the wrong place more precisely."',
    },
    {
      id: 'q6',
      generator: 'act-3/units-factors-response',
      review: ['act-3-04'],
      debrief: 'Ferrier: "The units are the things you assigned. Not the crews, not the owners — the transits. Say what was assigned to what, and then say what you measured on it."',
    },
    {
      id: 'q7',
      generator: 'act-3/explain-confound',
      review: ['act-3-04'],
      debrief: 'Ferrier: "Name the variable, say how it travelled with the treatment, and then say the consequence out loud: the two cannot be separated, so the difference cannot be credited to either one."',
    },
    {
      id: 'q8',
      generator: 'act-3/choose-design',
      review: ['act-3-04'],
      debrief: 'Ebele: "So — block on something that moves the response and that the treatment cannot change. Never on the response. I did that once, sir, and the design answered its own question."',
    },
    {
      id: 'q9',
      generator: 'act-3/randomization-significance',
      review: ['act-3-05'],
      debrief: 'Ferrier: "Significance is a place on that axis, not a size. Where does the observed difference sit against the ones chance assignment makes on its own? Read the picture before you read the number."',
    },
    {
      id: 'q10',
      generator: 'act-3/scope-of-inference',
      review: ['act-3-05'],
      debrief: 'Ferrier: "Two sentences, two mechanisms. Assignment buys *because*. Sampling buys *in general*. A study that has one does not get the other for free, and a study that has neither describes itself and stops."',
    },
  ],
  onPass:
    'Ebele reads the corrected page back once, quietly, the way he was taught somewhere, and then stops reading and just looks at it.\n\nFerrier: *"That will hold. Not because it is strong — it is not strong. Because everything in it is exactly the size of what we did."* She initials the margin and slides it across to you. *"Sign the frame page. The frame page is the one they will come at."*\n\nIt is filed at MET 080. Solberg times the lag out loud — twenty-one and a half minutes each way — and does not offer an opinion, which is his way of having one. The Board acknowledges in two words.',
  onFail:
    '*"Again."*\n\nFerrier does not raise her voice and does not take the page off the table. *"It is a good survey badly described. That is worse than a bad survey honestly described, because a hostile reader finds the description first and then stops trusting the survey."* She turns the page around so you can both read it the same way up and puts a fingernail under each sentence that claims more than the design paid for.\n\nEbele writes down the modules without being asked. *"I will re-run the parts you marked, sir. Fresh numbers. Same questions."*',
}
