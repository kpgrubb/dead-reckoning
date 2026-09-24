/**
 * Act VII checkpoint — "Halden Reach" (curriculum map §5, 11 items, 25 min).
 *
 * MET 165. The inference brief is written and not yet in the relay, and the relay belongs to a
 * tender whose senior officer will read the brief before Valhalla does. Ferrier and Sandoval go
 * through it in the wardroom with the hatch shut, looking for the one procedure that was chosen
 * wrong — because that is the only thing in it Ostrow needs.
 *
 * Item mix per the blueprint: 4 MC (q1, q4, q6, q10), 4 NUM (q2, q5, q7, plus the numeric inside
 * q11's display), 3 INT (q3, q8, q9 — q3 and q9 at weight 1.5, the two sentences a hearing would
 * quote) and exactly one DISP (q11, two small-sample dotplots). Generators live in
 * src/lib/problems/generators/act-7/ and are drawn fresh on every attempt.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act7Checkpoint: CheckpointSpec = {
  act: 'act-7',
  title: 'Halden Reach',
  briefing:
    "MET 165/20:10. The wardroom hatch is shut, which on this ship means something. The brief is eleven pages and every page names a procedure, its conditions and what it does not establish.\n\nThe relay it goes out on belongs to *Halden Reach*. Captain Ostrow will read it before Valhalla does, and there is no version of the next six days in which he does not.\n\nFerrier turns the first page toward herself and does not pick it up.\n\n*\"He will not argue with the arithmetic. He will read this looking for the one procedure you chose wrong, and then the whole brief is the work of an officer who does not know which test to run.\"*\n\nSandoval, from the far end of the table, with her own two pages in front of her: *\"Mine says nine hours, give or take one. I will sign that. I will not sign a round number.\"*",
  est_minutes: 25,
  threshold: 0.8,
  items: [
    {
      id: 'q1',
      generator: 'act-7/why-t',
      review: ['act-7-01'],
      debrief:
        'Sandoval: "Not because twelve is a small number. Because nobody handed you sigma. Nobody ever hands you sigma — you estimate it off the same twelve readings you are testing, and the distribution pays for that."',
    },
    {
      id: 'q2',
      generator: 'act-7/t-interval-endpoint',
      review: ['act-7-02'],
      debrief:
        'Ebele: "So — x-bar, then t-star times s over root n, and t-star comes off n minus one degrees of freedom, not n. I have made that exact slip once and it moved the endpoint by more than the finding was worth."',
    },
    {
      id: 'q3',
      generator: 'act-7/mean-interval-interpretation',
      review: ['act-7-02'],
      weight: 1.5,
      debrief:
        'Ferrier: "Level, both endpoints, the word *true*, and the mean of what. Write *ninety-five percent of the reactors* and you have told the Board something the interval never said, and Ostrow will read that sentence out loud."',
    },
    {
      id: 'q4',
      generator: 'act-7/t-test-setup',
      review: ['act-7-03'],
      debrief:
        'Ferrier: "Hypotheses about the parameter, written before the statistic. Then the three conditions with their numbers in them. A conclusion with no conditions attached to it is a conclusion about nothing."',
    },
    {
      id: 'q5',
      generator: 'act-7/t-test-statistic',
      review: ['act-7-03'],
      debrief:
        'Ebele: "Degrees of freedom, then the tail. The normal table gives a smaller p than the truth at this n, every time, and in the direction that flatters us."',
    },
    {
      id: 'q6',
      generator: 'act-7/paired-or-two-sample',
      review: ['act-7-04'],
      debrief:
        'Ferrier: "Read the design before you read the numbers. If each row of one column belongs to a row of the other, the pairs are the units and the differences are your sample. If they do not, they do not, and pairing them is an invention."',
    },
    {
      id: 'q7',
      generator: 'act-7/paired-t',
      review: ['act-7-04'],
      debrief:
        'Ebele: "One list of differences, one sample, n minus one degrees of freedom on the pairs. And the order of subtraction is decided before the sign is read, or the conclusion comes out backwards and reads perfectly well."',
    },
    {
      id: 'q8',
      generator: 'act-7/difference-interval-interpretation',
      review: ['act-7-05'],
      debrief:
        'Ferrier: "Two groups, so the parameter is a difference of means and the sentence has to say which minus which. And when the interval holds zero, the honest sentence is that we have no evidence of a difference. Not that there is none."',
    },
    {
      id: 'q9',
      generator: 'act-7/two-sample-conclusion',
      review: ['act-7-06'],
      weight: 1.5,
      debrief:
        'Ferrier: "Decision, p against alpha, evidence, direction, and whose hulls. Strike *proves*. Strike any sentence about the samples — we are not being paid to describe nineteen rows, we are making a claim about a population, and the claim has to name it."',
    },
    {
      id: 'q10',
      generator: 'act-7/select-procedure',
      review: ['act-7-07'],
      debrief:
        'Sandoval: "Pick the tool off the question and the shape of the data, Ensign, not off how many columns are in front of you. Two columns is two columns. It is not two samples until you know the rows are strangers."',
    },
    {
      id: 'q11',
      generator: 'act-7/conditions-dotplots',
      review: ['act-7-05', 'act-7-07'],
      debrief:
        'Ebele: "At this n the graph is the condition. No outliers, no strong skew, in each group — and you have to say what you looked at, because nobody at Valhalla can see the plot from the page."',
    },
  ],
  onPass:
    'Ferrier reads the last page through without stopping and puts her initials in the margin beside the limits paragraph, which is the one she argued about for an hour.\n\n*"That will hold. Not because it is unanswerable. Because every procedure in it is the one the data\'s shape called for, and he cannot take a single finding out without taking the method out with it."*\n\nSandoval signs her two pages, writes the standard error beside her nine hours, and slides them across without comment.\n\nSolberg sends it at MET 165/22:15 through *Halden Reach*\'s relay, with a copy to the Flag Secretary, and reads the geometry out without being asked: two point nine astronomical units, twenty-four minutes each way, no opinion before tomorrow evening at the earliest.\n\nHe does not say the other thing, which is that it will be read aboard this tender in about four seconds.',
  onFail:
    '*"Then he\'d have found it."*\n\nFerrier does not raise her voice and does not move the brief off the table. She turns it so you are both reading it the same way up and puts a fingernail under the finding whose procedure does not match its design.\n\n*"This is the page he reads first. Not the arithmetic — the choice. One wrong procedure in eleven and the covering letter writes itself: the assessing officer does not know which test to run, and the Board need not trouble itself with the rest."*\n\nSandoval turns her own pages face down. *"Again, Skipper. We have a day and the hatch is shut."*\n\nEbele has the module list written out before anyone asks him for it. *"Fresh numbers, same questions, sir. I would rather be wrong four times in here."*',
}
