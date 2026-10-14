/**
 * Act IX checkpoint — "Intent" (curriculum map §5, 9 items, 25 min).
 *
 * MET 217. The wardroom with the hatch open, the brief squared on the table, and three addresses
 * on the cover sheet. Ferrier has read it twice and will not sign it until the officer who wrote
 * it can say it back without the page.
 *
 * Item mix per the blueprint: 3 MC (q1, q5, q8), 2 numeric (q3, q6), 3 interpretations at weight
 * 1.5 (q4, q7, q9 — the three sentences the Inspectorate will read out loud) and exactly one
 * display (q2, residual plot with the normal probability plot beside it). Generators live in
 * src/lib/problems/generators/act-9/ and are drawn fresh on every attempt.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act9Checkpoint: CheckpointSpec = {
  act: 'act-9',
  title: 'Intent',
  briefing:
    'MET 217/08:30. Five milligee for Ceres, fourteen days out, and the wardroom hatch is hooked back against the bulkhead because Ferrier hooked it back.\n\nFive of you and the brief. Ferrier at the head of the table with her cap off. Ebele with the annexes in order and his hands flat on them. Sandoval still in the coveralls she stood the forenoon watch in. Solberg with the transmission window written on the back of his hand. Ferrante at the far end, not reading anything.\n\nThe cover sheet has three addresses on it and a transmission time two days out.\n\n*"Say it back to me. Not the page. You."*\n\nOstrow will read it once. The Inspectorate will read it once. Neither of them will come back to ask what a column meant.',
  est_minutes: 25,
  threshold: 0.8,
  items: [
    {
      id: 'q1',
      generator: 'act-9/slope-output-and-conditions',
      review: ['act-9-01'],
      debrief:
        'Ebele: "Two rows and five columns, sir, and only one cell is the standard error of the slope. The Constant row is where the line crosses, and the S on the summary line is how far one hull sits off it. And the Normal condition is about the residuals. I checked it on the fuel column once and the Commander made me plot it again."',
    },
    {
      id: 'q2',
      generator: 'act-9/residual-and-normal',
      review: ['act-9-01'],
      debrief:
        'Ferrier: "Read it left to right, not all at once. A curve changes the sign of the residuals in a pattern. A fan leaves the sign alone and changes the width. One point a long way out is neither, and it does not get deleted — it gets named, and the fit gets reported both ways."',
    },
    {
      id: 'q3',
      generator: 'act-9/slope-interval-from-output',
      review: ['act-9-02'],
      debrief:
        'Ebele: "The slope and its standard error come off the Coef and SE Coef columns, the degrees of freedom are n minus two because two things were estimated to place the line, and the critical value comes off the table at that level. The T and P printed on the output belong to a different question and I do not need either of them."',
    },
    {
      id: 'q4',
      generator: 'act-9/slope-interval-claim',
      review: ['act-9-02'],
      weight: 1.5,
      debrief:
        'Ferrier: "The level, the word confident, both ends, the true slope, the units, and whose departures. Then one more line, and it is the line the whole annex exists for: where does the required value sit relative to what you just wrote down. An interval reported without that sentence has answered half the question and the reader supplies the other half himself."',
    },
    {
      id: 'q5',
      generator: 'act-9/slope-hypotheses',
      review: ['act-9-03'],
      debrief:
        'Ebele: "Beta, not b. The fitted slope is already on the page, so there is nothing to hypothesise about it. And the null is whatever value the physics fixes. Zero is only the usual one because in most regressions it means there is no relationship, and here nobody has ever said there is no relationship."',
    },
    {
      id: 'q6',
      generator: 'act-9/slope-t-and-p',
      review: ['act-9-03'],
      debrief:
        'Sandoval: "Write the subtraction out even when you are taking away nothing, Ensign. It costs you three seconds and it is the only form of the sum that still works when the number you are testing against is not zero."',
    },
    {
      id: 'q7',
      generator: 'act-9/slope-test-conclusion',
      review: ['act-9-03'],
      weight: 1.5,
      debrief:
        'Ferrier: "Decision, p against alpha, evidence, and then what the evidence is about: a slope, in units, for a named set of departures. Strike any sentence with a cause in it. Nothing in that file was assigned to anybody, and counsel will read that sentence out before he reads anything else in the annex."',
    },
    {
      id: 'q8',
      generator: 'act-9/select-inference-procedure',
      review: ['act-9-04'],
      debrief:
        'Ebele: "How many samples, what was recorded on each unit, and whether the question wants an estimate or a verdict. Two numbers on every row is a regression however much the subject matter looks like something else, and banding them into a table to run a chi-square answers a smaller question than the data can."',
    },
    {
      id: 'q9',
      generator: 'act-9/case-limitations',
      review: ['act-9-04'],
      weight: 1.5,
      debrief:
        'Ferrier: "What it holds, then no cause, then whose departures, then the row you would rather concede than have taken off you. And at the end the sentence you are going to be asked for anyway. A limit you wrote is rigour. The same limit pulled out of you under questioning is something you were hiding."',
    },
  ],
  onPass:
    'Ferrier takes her hand off the cover sheet.\n\n*"Then it goes at nineteen."*\n\nSolberg has the window on the back of his hand and does not look at it. Three addresses, one transmission, twenty-one minutes of it, and the Ceres relay holds the geometry until MET 224.\n\nEbele squares the annexes and asks whether the fuel annex should carry the examiner column again, in the footer, in case the pages are read apart. You tell him yes.\n\nSandoval stands up and says she is going back down to the loop and that she would like it noted that she signed nothing in this room, which is true, and that she read all of it, which is also true.\n\nWhat the file carries: a pattern, an owner, a false ledger, a prepared fleet, a stockpile at a rock nobody files for, and nineteen sets of tanks filled at Uruk High for a destination that was not on the certificate. What it does not carry: who gave the order, or why.\n\nYou wrote that last sentence yourself, and it is the only one in the brief that will still be true after everyone named in it has been heard.',
  onFail:
    '*"Not to the Inspectorate like that. They will only read it once."*\n\nFerrier turns the brief back to the cover sheet and puts her cap on the table on top of it.\n\n*"He will not argue with the arithmetic. He will find the page where the sentence claims more than the procedure bought, and then the covering letter writes itself and nothing underneath it is read at all."*\n\nEbele has the list written before anyone asks him for it. Fresh tables, the same questions. Solberg says the window holds until MET 224 and goes to check it again.',
}
