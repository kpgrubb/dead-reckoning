/**
 * Act VI checkpoint — "Accusation" (curriculum map §5, 12 items, 25 min).
 *
 * MET 140. The four-step brief is written and not yet sent. Ferrier reads it the way the Board's
 * counsel will read it: every claim, every condition, every sentence that could be quoted back
 * without its qualifier. The checkpoint is that reading.
 *
 * Item mix per the blueprint: 4 MC, 4 NUM, 3 INT (q4, q7, q8 at weight 1.5 — the three sentences
 * the hearing would actually quote) and exactly one DISP (q12, the shaded normal curve). Generators
 * live in src/lib/problems/generators/act-6/ and are drawn fresh on every attempt.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act6Checkpoint: CheckpointSpec = {
  act: 'act-6',
  title: 'Accusation',
  briefing:
    'MET 140/09:20. Ceres, berth four, transponder on, the wings out and the cellar empty for the first time in fifty-seven days. The brief is on the wardroom table in four parts — state, plan, do, conclude — and it has your name and hull number at the bottom of it, which is the part nobody has mentioned all morning.\n\nFerrier turns it round so it faces her and reads it the way the Board\'s counsel will read it.\n\n*"I am not reading this as your executive officer. I am reading it as the officer they will appoint to take it apart, because that officer exists and is already at Valhalla. Every number, every condition, every sentence that survives being quoted without the clause after it."*\n\n*"Answer from the file. If a sentence claims more than the procedure paid for, we strike it here — not after they read it out."*',
  est_minutes: 25,
  threshold: 0.8,
  items: [
    {
      id: 'q1',
      generator: 'act-6/interval-conditions',
      review: ['act-6-01'],
      debrief:
        'Ferrier: "Three conditions, three sentences, each with its number in it. Random is a statement about how the data came to exist. Ten percent is a statement about how much more there could have been. Large counts is arithmetic, and you show the arithmetic."',
    },
    {
      id: 'q2',
      generator: 'act-6/interpret-confidence-level',
      review: ['act-6-01'],
      debrief:
        'Ferrier: "Which interval? The confidence is in the method — run it a hundred times and about ninety-five of the intervals it builds contain the rate. The one on your screen either has it or it has not, and neither of us will ever know which."',
    },
    {
      id: 'q3',
      generator: 'act-6/one-prop-interval',
      review: ['act-6-02'],
      debrief:
        'Ebele: "So — p-hat, then z-star times the standard error, then both endpoints. I keep giving one endpoint and a shrug. An interval is two numbers or it is not an interval."',
    },
    {
      id: 'q4',
      generator: 'act-6/interval-interpretation',
      review: ['act-6-02'],
      weight: 1.5,
      debrief:
        'Ferrier: "Level, both endpoints, the word *true*, and what it is the true rate of. Four things. Leave out *true* and you have written a sentence about the sample, which nobody asked you for."',
    },
    {
      id: 'q5',
      generator: 'act-6/sample-size-margin',
      review: ['act-6-02'],
      debrief:
        'Solberg: "The arithmetic gives transits, Captain. I convert transits to years, and the answer is the reason this argument is not the one we are making."',
    },
    {
      id: 'q6',
      generator: 'act-6/state-hypotheses',
      review: ['act-6-03'],
      debrief:
        'Ferrier: "Hypotheses are about the parameter and they are written before the number. You wrote p-hat. P-hat is what we measured; there is nothing to test about a thing we already know."',
    },
    {
      id: 'q7',
      generator: 'act-6/interpret-p-value',
      review: ['act-6-04'],
      weight: 1.5,
      debrief:
        'Ferrier: "Assuming the null is true. A result at least as extreme as this one. That is the whole sentence, and every word of it is load-bearing. *Due to chance* is what they will read out, and it is not what you computed."',
    },
    {
      id: 'q8',
      generator: 'act-6/test-conclusion',
      review: ['act-6-05'],
      weight: 1.5,
      debrief:
        'Ferrier: "Decision, p against alpha, evidence — not proof — direction, and whose ships. Strike *proves*. Strike *accept*. The data says what it says and it does not say more when you push it."',
    },
    {
      id: 'q9',
      generator: 'act-6/type-i-ii',
      review: ['act-6-06'],
      debrief:
        'Ferrante: "One error costs you a career and the Service a scandal. The other costs hulls, and the people in them. They are not the same error and they are not the same price, and the alpha you set is where you wrote down which one you would rather make."',
    },
    {
      id: 'q10',
      generator: 'act-6/two-prop-interval',
      review: ['act-6-07'],
      debrief:
        'Ebele: "Unpooled for the interval, sir. And the order of subtraction is a decision, not an accident — say which minus which before you read the sign."',
    },
    {
      id: 'q11',
      generator: 'act-6/pooled-test-statistic',
      review: ['act-6-08'],
      debrief:
        'Ebele: "Pool under the null, because the null says there is one rate. Do not pool for the interval, because the interval is not assuming they are equal. I had it the wrong way round exactly once."',
    },
    {
      id: 'q12',
      generator: 'act-6/p-value-shading',
      review: ['act-6-04'],
      debrief:
        'Ferrier: "Read the picture before you read the number. One tail or two is a statement about the question you asked, and the shading tells you which question the person who drew it was answering."',
    },
  ],
  onPass:
    'Ferrier reads the corrected brief through once more without stopping, which is the only compliment available on this ship.\n\n*"That will hold. Not because it is strong — it is one test on one register, and the counsel will say so. Because everything in it is exactly the size of what we did, and there is nothing in it they can strike without striking a number."*\n\nShe initials the margin and turns it back round so it faces you, name and hull number upward.\n\n*"Sign the conclusion. The conclusion is the one they will come at."*\n\nSolberg sends it at MET 140/22:40 and calls the lag out loud: Ceres to Valhalla is two point nine astronomical units now, and that is twenty-four minutes each way. At the earliest there is an opinion about this at 23:04 tomorrow.\n\nThe reply arrives at MET 141/02:10. It is signed, for the first time in this commission, by a man and not by a board.',
  onFail:
    '*"Again."*\n\nFerrier does not raise her voice and does not take the brief off the table. *"This is what they would do to it. Not out of malice — a hearing is a machine for finding the sentence that says more than the method bought, and it finds it every time."* She turns the page so you are both reading it the same way up and puts a fingernail under each claim that outruns its procedure.\n\n*"Fix it before they can. We have the ship, the file and two days of berth, and that is more than anyone else who ever tried this had."*\n\nEbele writes down the modules without being asked. *"Fresh numbers, sir. Same questions. I would rather do it four times here than once at Valhalla."*',
}
