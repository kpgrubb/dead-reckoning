/**
 * Act IV checkpoint — "Running Cold" (curriculum map §5, 12 items, 25 min).
 *
 * The heat-plan review. Before the second Watch window opens, Sandoval and Ferrier want every
 * probability that goes into "how long, where, and what it costs" on the record. It is not a test;
 * it is the plan review, and a wrong number is heat the ship does not have.
 *
 * Exactly one display item (q12, the geometric pmf); q8 carries the interpretation weight.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act4Checkpoint: CheckpointSpec = {
  act: 'act-4',
  title: 'Running Cold',
  briefing:
    'MET 105/13:40. The wings came in twenty minutes ago and the cellar reads five. Twenty-three days of loiter, seven purges, two windows, one hull that turned — and a report that goes to Valhalla at 106 with every probability in it attached. Sandoval has the heat plan on the wardroom table face up, which is where she put it. *"Every number in this goes on the record, Skipper, and the record is what the Chief works to. I am not asking you to defend the plan. I am asking you to defend the arithmetic."* Ferrier stands where she can read it the right way up and says nothing, which is how she says she agrees. Answer from the plan. Where you are asked for a sentence, write the one you would sign.',
  est_minutes: 25,
  threshold: 0.8,
  items: [
    {
      id: 'q1',
      generator: 'act-4/simulation-design',
      review: ['act-4-01'],
      debrief: 'Ebele: "Model, one trial, statistic. In that order, and the statistic is the thing you stack. Yes, sir. That\'s — yes."',
    },
    {
      id: 'q2',
      generator: 'act-4/complement-rule',
      review: ['act-4-02'],
      debrief: 'Oyelaran: "The Eyes do not see anything twice. They can see nothing twice. Take one minus the nothing, sir."',
    },
    {
      id: 'q3',
      generator: 'act-4/conditional-from-table',
      review: ['act-4-03'],
      debrief: 'Ferrier: "Whatever follows *of the* is the denominator. Write the sentence out before you divide."',
    },
    {
      id: 'q4',
      generator: 'act-4/reverse-conditional',
      review: ['act-4-03'],
      debrief: 'Ferrier: "That is the Board\'s error, in the Board\'s favour. The joint over the other margin, Captain. Say it back to me."',
    },
    {
      id: 'q5',
      generator: 'act-4/independence-check',
      review: ['act-4-04'],
      debrief: 'Ebele: "So — independent means the given changes nothing. Mutually exclusive means they cannot both happen. Those are different sentences."',
    },
    {
      id: 'q6',
      generator: 'act-4/general-addition',
      review: ['act-4-04'],
      debrief: 'Oyelaran: "You added an overlap twice. Say that number again."',
    },
    {
      id: 'q7',
      generator: 'act-4/pmf-cumulative',
      review: ['act-4-05'],
      debrief: 'Sandoval: "At most sixty-four includes sixty-four. More than sixty-four does not. That cell is four hours of cellar, Skipper."',
    },
    {
      id: 'q8',
      generator: 'act-4/interpret-expected-value',
      review: ['act-4-06'],
      weight: 1.5,
      debrief: 'Sandoval: "Expected is what it averages over many windows. It is not what this window will cost, and it is not the likeliest number either."',
    },
    {
      id: 'q9',
      generator: 'act-4/sd-of-sum',
      review: ['act-4-07'],
      debrief: 'Sandoval: "Variances add. Not sigmas. Not sigmas over root six. Variances." Then she checks a gauge and does not look up.',
    },
    {
      id: 'q10',
      generator: 'act-4/binomial-pmf',
      review: ['act-4-08'],
      debrief: 'Oyelaran: "Fixed number of passes, same chance each, different hulls, seen or not seen. That is the four conditions and it is binomial. The Eyes would like that number to be right."',
    },
    {
      id: 'q11',
      generator: 'act-4/binomial-moments',
      review: ['act-4-09'],
      debrief: 'Ferrier: "np is the mean. The square root of np(1 − p) is the spread. And surprise is a tail, not a point."',
    },
    {
      id: 'q12',
      generator: 'act-4/geometric-display',
      review: ['act-4-10'],
      debrief: 'Ebele: "Trials up to and including the first one. One over p is the average over many waits — most waits are shorter than it. Yes, sir."',
    },
  ],
  onPass:
    'Sandoval reads the last line, turns the slate face down and puts her hand flat on it. *"I\'ll log the order. I want it noted I asked for the alternative."* Ferrier notes it, in the words the Chief used. The heat plan goes into the annex with the vector, the close-pass count and the wait, and every one of them carries the arithmetic that produced it. The report goes at MET 106.',
  onFail:
    '"Not on that arithmetic." Sandoval does not raise her voice; she turns the slate around so you can see the line she means. *"Rework it. If this goes up with that in it, the plan is not what kills us, but it is what the inquiry reads."* She names the items she will not sign and the module each came from, and goes back to the cellar gauge. The report does not go until the annex does.',
}
