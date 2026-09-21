/**
 * Act V checkpoint — "Noise Floor" (curriculum map §5, 9 items, 20 min).
 *
 * MET 118, in the hour before the torch lights for Ceres. Ferrier will not let the ship be seen on
 * transponder until the officer who is about to accuse a freight line can say what honest variation
 * looks like — all of it, not the convenient half. The nine items are the Act's whole null-model
 * toolkit: parameter vs statistic, bias vs variability, the normal both directions, the CLT and the
 * sampling distribution of x̄, the sampling distributions of p̂ and of a difference in proportions,
 * the sampling distribution of a difference in means, and the sentence that explains why two honest
 * patrols disagree.
 *
 * Exactly one display item (q2, a simulated sampling distribution with the truth marked); q9 carries
 * the interpretation weight. Nothing here runs a significance test — Act VI does that, and the
 * checkpoint is the proof that the learner knows the difference between a null model and a verdict.
 *
 * Generators live in src/lib/problems/generators/act-5/ and are drawn fresh on every attempt.
 */
import type { CheckpointSpec } from '../checkpoints'

export const act5Checkpoint: CheckpointSpec = {
  act: 'act-5',
  title: 'Noise Floor',
  briefing:
    'MET 118/04:40. Cold, coasting, eight days out from the decision to go. The Chief has the torch on a forty-minute hold because you asked for forty minutes, and Sandoval does not ask what for — she writes the hold in the log with a time against it, which is her way of asking.\n\nFerrier has the whole Act on the intel terminal: the Board\'s table, the two cutters, the Ledger, the nineteen. She turns the display so it faces you and then does not look at it again.\n\n*"Before you take this to Ceres, tell me what noise looks like. All of it. If you can\'t, you\'re about to accuse people with an anecdote."*\n\nNine questions. Answer them from the file. Where the brief asks for a number, give it to the precision it asks for; where it asks for a sentence, write the one that survives a reader who wants it to be wrong. **Nothing here is a test of the Lane.** Every question is about what the data would look like if nothing were wrong — which is the only thing that makes the next Act possible.',
  est_minutes: 20,
  threshold: 0.8,
  items: [
    {
      id: 'q1',
      generator: 'act-5/parameter-or-statistic',
      review: ['act-5-01'],
      debrief:
        'Ferrier: "A parameter is about the population and nobody will ever hold one. A statistic is about the sample in your hand. Name which you are looking at before you say a word about what it means — half the Board\'s table is statistics wearing a parameter\'s clothes."',
    },
    {
      id: 'q2',
      generator: 'act-5/checkpoint-estimator-display',
      review: ['act-5-01'],
      debrief:
        'Ebele: "So — the centre and the width are two different questions, sir. Where the pile sits against the truth is bias, and more repetitions will not move it. How wide the pile is, is variability, and that is the only thing a bigger sample buys."',
    },
    {
      id: 'q3',
      generator: 'act-5/inverse-normal-cutoff',
      review: ['act-5-02'],
      debrief:
        'Ferrier: "An area in, a cutoff out. You are running the table backwards, and the answer is a delay in days — so it lands between two numbers you can name, and if it does not, you have solved the other problem."',
    },
    {
      id: 'q4',
      generator: 'act-5/what-the-clt-claims',
      review: ['act-5-03'],
      debrief:
        'Ebele: "Yes, sir. That\'s — yes. It is about the distribution of the mean. Not the hulls, not the file, not one transit. The population is exactly as crooked after as it was before; it is the averages that go straight."',
    },
    {
      id: 'q5',
      generator: 'act-5/probability-about-xbar',
      review: ['act-5-03'],
      debrief:
        'Ferrier: "Centre at mu, spread sigma over root n, then standardise and read the tail. If you divided by n you have made the spread far too small and every number after it far too frightening. Root n. It is in the log."',
    },
    {
      id: 'q6',
      generator: 'act-5/sd-of-phat',
      review: ['act-5-04'],
      debrief:
        'Ferrier: "The rate is given, so the rate is what goes in the square root — not the one you just measured. And print the counts beside it. If n times p does not clear ten, the normal model is a courtesy you have not paid for."',
    },
    {
      id: 'q7',
      generator: 'act-5/sd-of-difference-proportions',
      review: ['act-5-04'],
      debrief:
        'Ebele: "Variances add. They add even when the thing you are computing is a difference — especially then. Subtracting the two standard deviations gives a number smaller than either one, and two noisy quantities do not make a quiet one."',
    },
    {
      id: 'q8',
      generator: 'act-5/sd-of-difference-means',
      review: ['act-5-05'],
      debrief:
        'Sandoval: "Square them, divide each by its own count, add, take the root. And look at which term you are actually carrying — nineteen in a denominator drowns eight hundred and eighty-one. The small group sets the precision. It always does."',
    },
    {
      id: 'q9',
      generator: 'act-5/why-two-patrols-differ',
      review: ['act-5-01', 'act-5-03'],
      weight: 1.5,
      debrief:
        'Ferrier: "Two honest ships, two different numbers, and a magnitude that says how different they are allowed to be. Leave the magnitude out and the paragraph is an opinion. Put a name to the parameter, a name to the statistics, and a number on the noise, and it is a finding."',
    },
  ],
  onPass:
    'Ferrier reads the last answer, initials the margin, and turns the display off — which she does not usually do, and which means she is finished with it.\n\n*"That will hold. You can say what noise looks like, so you are allowed to say when something is not noise. Not before."*\n\nShe logs the brief at MET 118/05:12. The torch hold has thirty-one minutes left on it, and what happens at the end of those thirty-one minutes is not hers.',
  onFail:
    '*"Then we\'re not ready to be seen."*\n\nFerrier does not turn the display off. She leaves it facing you with the items you missed still on it, which is worse.\n\n*"You are about to put this ship on a transponder and take it into a port where the other side has an office. The first question anyone asks is not whether you are right. It is whether you know how wrong an honest answer can be. If you cannot draw the noise, you cannot draw the line around it, and every number in the file becomes an anecdote with a decimal point."*\n\nShe extends the torch hold and writes the extension in the log, with a time against it.\n\nEbele is already pulling the modules without being asked. *"Fresh parameters, sir. Same questions. I will have the machine up in ten minutes."*',
}
