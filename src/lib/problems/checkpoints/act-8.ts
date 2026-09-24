/**
 * Act VIII checkpoint — "Kettle" (curriculum map §5, 9 items, 20 min).
 *
 * MET 194. Eleven days after the flyby, running for Ceres at five milligee with the wings out and
 * the mast head under a patch. Ebele presents the log of what the identifications prove, finding by
 * finding; Rook corrects; Ferrier signs as witness. Every table in the file was taken, directly or
 * at one remove, off an instrument that is no longer aboard.
 *
 * Item mix per the blueprint: 3 MC (q1, q5, q8), 3 numeric (q2, q4, q6), 2 interpretations at
 * weight 1.5 (q3, q7 — the two sentences a hearing would read out) and exactly one display (q9,
 * observed-vs-expected bars). Generators live in src/lib/problems/generators/act-8/ and are drawn
 * fresh on every attempt.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act8Checkpoint: CheckpointSpec = {
  act: 'act-8',
  title: 'Kettle',
  briefing:
    "MET 194/09:40. Five milligee for Ceres, wings out, thirteen days of running behind you and the wardroom four degrees under the rest of the ship.\n\nThe file is five tables and five procedures, and one of the five answers is not a test at all. Ebele has it in the order Ferrier taught him: the question, the procedure, the conditions with their arithmetic under them, the conclusion, and one line saying what the finding does not establish.\n\nFerrier reads page one standing at the end of the table.\n\n*\"Read it to me as if the reader wants it thrown out. Every finding, the procedure under it, and what it does not establish.\"*\n\nOstrow will read this once, looking for the page where the procedure does not match the design.",
  est_minutes: 20,
  threshold: 0.8,
  items: [
    {
      id: 'q1',
      generator: 'act-8/gof-hypotheses',
      review: ['act-8-01'],
      debrief:
        'Ferrier: "The null is the claimed distribution, written out as proportions, and the alternative is that at least one of them is wrong. Not that all of them are. Write the hypotheses about the population the counts came from, and put the claimed shares in them."',
    },
    {
      id: 'q2',
      generator: 'act-8/gof-statistic',
      review: ['act-8-01', 'act-8-02'],
      debrief:
        'Ebele: "So — expected first, and expected is n times each share, carried to as many decimals as it wants. Then the squared gap over the expected count, category by category, and the degrees of freedom are the number of categories minus one. Not minus two. Nothing was estimated from the data."',
    },
    {
      id: 'q3',
      generator: 'act-8/gof-conclusion',
      review: ['act-8-02'],
      weight: 1.5,
      debrief:
        'Ferrier: "Decision, p against alpha, evidence, and then what the evidence is about: a distribution, in a named population. Then the category that carried it. A conclusion that stops at \'the distribution differs\' has told the Board nothing it can act on."',
    },
    {
      id: 'q4',
      generator: 'act-8/expected-count-cell',
      review: ['act-8-03'],
      debrief:
        'Ebele: "Row total times column total over the grand total. It is what the margins would put in that cell if the two variables had nothing to do with each other, and it comes out fractional almost every time. Rounding it to a whole hull is the thing I did once and it moved the statistic."',
    },
    {
      id: 'q5',
      generator: 'act-8/homogeneity-or-independence',
      review: ['act-8-03'],
      debrief:
        'Ferrier: "Two samples or one. That is the whole question, and the arithmetic will not answer it for you. One sample classified two ways is independence. Separate samples compared on one variable is homogeneity. And the degrees of freedom come off the shape of the table, rows minus one times columns minus one, never the number of cells minus one."',
    },
    {
      id: 'q6',
      generator: 'act-8/two-way-statistic',
      review: ['act-8-04'],
      debrief:
        'Ebele: "Every cell contributes, including the ones with thousands in them, and the tail is on the right and only on the right. There is no second tail to halve."',
    },
    {
      id: 'q7',
      generator: 'act-8/chi-square-conclusion',
      review: ['act-8-04'],
      weight: 1.5,
      debrief:
        'Ferrier: "Association, in context, with the cells that produced it named and their contributions quoted. Strike any sentence with *because* in it. A table cannot tell you which way the arrow points, and Ostrow will read that sentence out loud before he reads anything else."',
    },
    {
      id: 'q8',
      generator: 'act-8/select-categorical-procedure',
      review: ['act-8-04'],
      debrief:
        'Ebele: "Count the samples, count the variables, then check the expected counts before committing to anything. Two of the answers on this list are not tests. If a cell expects less than five, the approximation is not trustworthy and the null gets simulated. If the rows are the whole population, there is nothing to infer to and the table gets described."',
    },
    {
      id: 'q9',
      generator: 'act-8/observed-vs-expected',
      review: ['act-8-01', 'act-8-02'],
      debrief:
        'Ebele: "The condition is on the expected column, not the observed one, and the biggest contributor is not the tallest bar. It is the bar furthest from the one beside it, measured against the one beside it."',
    },
  ],
  onPass:
    'Ferrier signs the last page as witness, dates it, and writes the time beside the date because the ship is not keeping a normal watch bill.\n\n*"That holds. Every procedure in it is the one the design called for, and the two that are not tests say so on their own page and say why. He can have the file."*\n\nEbele squares the pages and does not say anything for a while, and then asks whether the identifications page should carry the buffer serial twice, on the caption and in the footer, in case the two get separated.\n\nYou tell him yes.\n\nWhat the file proves is who, and what, and where. What it does not touch is *when* — and the answer to that was loaded into nineteen sets of tanks at Uruk High, on nineteen separate dates, before any of those hulls left the berth.',
  onFail:
    '*"Her data. Get it right."*\n\nFerrier says it once and does not say it again, and turns the file back to page one.\n\n*"He will not argue with the arithmetic. He will find the page where the procedure does not match how the data were collected, and then the covering letter writes itself and the other four pages are never read."*\n\nEbele has the list written out before anyone asks him for it. Fresh tables, same questions.',
}
