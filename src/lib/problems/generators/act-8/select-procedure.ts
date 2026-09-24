/**
 * act-8-04 · Dacre's Stamp — drills, part two. AP 8.6, 8.7: choosing the categorical procedure,
 * including the two choices a calculator will never make for you.
 *
 *   act-8/select-categorical-procedure  choice  four described questions, one procedure named:
 *                                               which of the four does it answer? Every instance
 *                                               carries one census and one failed-condition table.
 *   act-8/procedure-justification       interp  name the procedure for one question and justify it
 *                                               from the design and the conditions
 *
 * The seven endings: one-proportion z, two-proportion z, goodness of fit, homogeneity,
 * independence, simulate the null when the expected counts fail, and describe a census without
 * inferring anything. None of the four questions in an instance is one of the Lane's own tables.
 */
import { defineGenerator, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup } from '@/lib/problems/rubric'
import type { RubricGroup } from '@/lib/problems/types'
import type { Rng } from '@/lib/rng'
import type { Candidate } from './two-way-setup'

export type Leaf = 'one-prop' | 'two-prop' | 'gof' | 'homogeneity' | 'independence' | 'simulate' | 'census'

export const LEAF_NAME: Record<Leaf, string> = {
  'one-prop': 'a one-proportion z-test',
  'two-prop': 'a two-proportion z-test',
  gof: 'a χ² goodness-of-fit test',
  homogeneity: 'a χ² test of homogeneity',
  independence: 'a χ² test of independence',
  simulate: 'a simulation of the null distribution, because the expected counts fail',
  census: 'no inference at all: the file is a census and is described',
}

/** What the chooser has to notice, one line each, for the feedback on a wrong pick. */
const LEAF_TELL: Record<Leaf, string> = {
  'one-prop': 'one sample, a yes/no outcome, and a single published proportion to read it against',
  'two-prop': 'two separately drawn samples and a yes/no outcome in each',
  gof: 'one sample, one categorical variable, and a whole claimed distribution across its categories',
  homogeneity: 'two or more separately drawn samples with one categorical variable measured in each',
  independence: 'one sample with two categorical variables recorded on every unit',
  simulate: 'a table whose design is right and whose smallest expected count is below five',
  census: 'a file holding every unit the question is about, so there is nothing to generalise to',
}

export interface ProcedureCase {
  id: string
  leaf: Leaf
  /** The question, as the office asks it, with the design in it. */
  text: string
  because: string
}

const CASES: readonly ProcedureCase[] = [
  {
    id: 'berth-amendment',
    leaf: 'one-prop',
    text: 'The Authority publishes a six percent manifest-amendment rate. A cutter boarded 240 hulls drawn at random from the corridor and recorded, for each, whether the manifest had been amended. **Is the true rate above six percent?**',
    because: 'One random sample, a yes/no outcome on each hull, and one published figure to read it against. A single proportion, with a direction, is a one-proportion z-test.',
  },
  {
    id: 'two-offices-flagged',
    leaf: 'two-prop',
    text: 'Independent random samples of 180 fuel certifications were drawn from each of two Bureau offices and each certification was recorded as clean or flagged on re-inspection. **Do the two offices differ in flag rate?**',
    because: 'Two separately drawn samples, a two-category outcome in each. The parameter is a difference of proportions, and the z-test can state its direction where a 2×2 χ² cannot.',
  },
  {
    id: 'cargo-mix-fit',
    leaf: 'gof',
    text: "The Authority publishes the corridor's declared cargo mix across four classes. A random sample of 210 transits was pulled from the archive and each transit's cargo class recorded. **Does the archive's mix match the published one?**",
    because: 'One sample, one categorical variable, and a distribution claimed before the data existed. That is goodness of fit, on one fewer degree of freedom than there are categories.',
  },
  {
    id: 'watch-advisories',
    leaf: 'homogeneity',
    text: "Each of a cutter's three watches drew its own random list of hulls to board before the patrol sailed, the three list lengths having been fixed in advance. Every boarding was recorded as no advisory, late check-in or plot amendment. **Do the three watches write advisories in the same proportions?**",
    because: 'Three groups drawn separately with their totals fixed in advance, and one categorical variable measured in each. Fixed row totals mean homogeneity.',
  },
  {
    id: 'berth-deck-filing',
    leaf: 'independence',
    text: 'One random sample of 320 departures was pulled from the Uruk High quarter. Each carries two columns the relay office had already recorded: which berth deck it left from, and whether it filed on time. **Is filing on time related to the berth deck?**',
    because: 'One sample classified two ways. Nobody fixed how many departures would come off each deck, so the only total set in advance is the grand total, and the test is independence.',
  },
  {
    id: 'gantry-seal',
    leaf: 'simulate',
    text: 'A dock audit pulled 260 outbound manifests at random and recorded the loading crew and whether the seal was broken on arrival. One crew loaded nine of the 260 and three of those nine came in broken, against a break rate near four percent overall. **Is seal failure related to the crew that loaded?**',
    because:
      'The design points at independence and the arithmetic refuses it: nine manifests at a four percent break rate expect well under one broken seal in that cell. Shuffle the broken-seal labels at random among the 260 several thousand times and count how often the small crew collects three or more.',
  },
  {
    id: 'register-office',
    leaf: 'census',
    text: 'Two claims offices wrote every finding on the corridor between them over six years. All 31 losses are in the file, with the office and the finding on each. **Do the two offices classify losses differently?**',
    because: 'These 31 are not a sample of the losses; they are the losses. There is no sampling variability for a P-value to describe, so the report is counts, row percentages and a sentence naming the difference.',
  },
  {
    id: 'hold-inspection',
    leaf: 'simulate',
    text: 'A Bureau inspector re-opened 300 sealed holds drawn at random and recorded the sealing yard and whether the seal had been tampered with. One yard sealed seven of the 300, and two of those seven had been tampered with, against eleven in the file altogether. **Is tampering related to the sealing yard?**',
    because:
      'Two variables on one sample, so the design says independence. Seven holds against a tampering rate near four percent expects a fraction of one in that cell, so the χ² curve is the wrong reference and the null has to be simulated.',
  },
  {
    id: 'authority-register',
    leaf: 'census',
    text: 'The Lane Authority holds every advisory it issued last year, 1,140 of them, with the issuing station and the advisory category on each. **Do the stations issue advisories in different proportions?**',
    because: 'Every advisory there was is in the file. The difference between the stations is a fact about last year, not an estimate of anything, and it is reported as percentages with no P-value attached.',
  },
  {
    id: 'yard-warranty',
    leaf: 'two-prop',
    text: 'Independent random samples of 95 refits from the Adlinda yard and 110 from Thebe were drawn, and each was recorded as having drawn a warranty claim within a year or not. **Is the Adlinda claim rate higher?**',
    because: 'Two independently drawn samples and a yes/no outcome, with a direction in the question. A two-proportion z-test.',
  },
  {
    id: 'advisory-fit',
    leaf: 'gof',
    text: 'The Authority states that advisories fall 55 / 30 / 15 across its three categories. A random sample of 180 advisories was pulled from the archive and categorised. **Does the archive follow the stated split?**',
    because: 'One sample, one categorical variable, and a stated distribution over all three categories. Goodness of fit on two degrees of freedom.',
  },
  {
    id: 'drive-class-advisory',
    leaf: 'independence',
    text: 'One random sample of 400 transits was drawn from the Authority archive; drive class and advisory category were both already columns of the archive. **Is advisory category related to drive class?**',
    because: 'One draw, two categorical columns already on every row, and no group size fixed in advance. Independence.',
  },
]

const byLeaf = (leaf: Leaf) => CASES.filter((c) => c.leaf === leaf)

/** Pick a distinct case for each of the given leaves. */
function pickCases(rng: Rng, leaves: readonly Leaf[]): ProcedureCase[] {
  const used = new Set<string>()
  return leaves.map((leaf) => {
    const pool = byLeaf(leaf).filter((c) => !used.has(c.id))
    const pick = pickContext(rng, pool)
    used.add(pick.id)
    return pick
  })
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — four questions, one procedure: which question does it answer?
// ---------------------------------------------------------------------------------------------

export const selectCategoricalProcedure = defineGenerator({
  id: 'act-8/select-categorical-procedure',
  label: 'Select the categorical procedure for a described question',
  ap_topics: ['8.6', '8.7'],
  skills: ['1'],
  generate(rng) {
    /** Every instance carries a census and a failed-condition table; the other two vary. */
    const spare: Leaf[] = ['one-prop', 'two-prop', 'gof', 'homogeneity', 'independence']
    const two = retry(
      rng,
      (r) => r.sample(spare, 2) as Leaf[],
      (pair) => pair[0] !== pair[1],
    )
    const leaves: Leaf[] = rng.shuffle(['census', 'simulate', ...two]) as Leaf[]
    const cases = pickCases(rng, leaves)
    const targetIndex = rng.int(0, cases.length - 1)
    const target = cases[targetIndex]

    const letters = ['A', 'B', 'C', 'D']
    const block = cases.map((c, i) => `**${letters[i]}.** ${c.text}`).join('\n\n')

    const cands: Candidate[] = cases.map((c, i) => ({
      text: `**${letters[i]}** — ${c.text.replace(/\*\*/g, '').split('. ')[0]}.`,
      correct: i === targetIndex,
      why: i === targetIndex ? null : `${letters[i]} is answered by ${LEAF_NAME[c.leaf]}: ${LEAF_TELL[c.leaf]}. ${c.because}`,
    }))
    // Options are the four letters in the order the block prints them, so the learner reads across.
    const options = cands.map((c) => c.text)
    const correct = targetIndex
    const feedback = cands.map((c) => c.why)

    return {
      prompt: `Four offices, four questions, four files.\n\n${block}\n\n**Which one of the four is answered by ${LEAF_NAME[target.leaf]}?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Work down the four and label each one before you look at what was asked. Sample or census? One sample or several drawn separately? One categorical variable or two? And only then, do the expected counts hold?',
        `You are looking for the one whose structure is: ${LEAF_TELL[target.leaf]}.`,
      ],
      solution: `**${letters[targetIndex]}.** ${target.because}\n\nThe other three:\n\n${cases
        .map((c, i) => (i === targetIndex ? null : `- **${letters[i]}** — ${LEAF_NAME[c.leaf]}: ${LEAF_TELL[c.leaf]}.`))
        .filter(Boolean)
        .join('\n')}\n\nThe order of the questions is fixed and none of them is about the numbers.\n\n1. **Is this a sample, or every unit the question is about?** A census has no sampling variability, so there is nothing for a P-value to be the probability of. Describe it and stop.\n2. **How many groups were drawn separately?** Row totals fixed in advance mean several samples and a test of homogeneity. One draw sorted afterwards by one of its own columns is one sample.\n3. **How many categorical variables are on each unit?** Two on one sample is independence. One, read against a claim made before the data existed, is goodness of fit or a one-proportion z, depending on whether the claim covers the whole distribution or a single category.\n4. **Do the expected counts clear five?** Only now, and only for the χ² endings. Below five the statistic still computes and the reference curve no longer fits it, so the P-value has to come from a simulation of the null instead.`,
      misconception: 'Choosing from the shape of the printed table. The same 2×3 of counts can be a homogeneity test, an independence test or a census, and the collection rule is the only thing that tells them apart.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Interpretation — name the procedure and justify it
// ---------------------------------------------------------------------------------------------

export const procedureJustification = defineGenerator({
  id: 'act-8/procedure-justification',
  label: 'Justify the categorical procedure you chose',
  ap_topics: ['8.6', '8.7'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, CASES)
    const isChi = c.leaf === 'gof' || c.leaf === 'homogeneity' || c.leaf === 'independence'

    const nameGroup: RubricGroup = {
      label: `Names the procedure (${LEAF_NAME[c.leaf]})`,
      phrasings:
        c.leaf === 'census'
          ? ['census', 'whole population', 'every one', 'no inference', 'not inference', 'describe']
          : c.leaf === 'simulate'
            ? ['simulate', 'simulation', 'randomisation', 'randomization', 'shuffle', 'permutation']
            : c.leaf === 'independence'
              ? ['independence', 'independent']
              : c.leaf === 'homogeneity'
                ? ['homogeneity', 'same distribution']
                : c.leaf === 'gof'
                  ? ['goodness of fit', 'goodness fit']
                  : c.leaf === 'one-prop'
                    ? ['one proportion', 'single proportion', 'one sample z']
                    : ['two proportion', 'difference proportion'],
      polarity: 'any',
      feedback: `The procedure is ${LEAF_NAME[c.leaf]}.`,
    }

    const designGroup: RubricGroup = {
      label: 'Justifies it from how the data were collected',
      phrasings:
        c.leaf === 'census'
          ? ['every', 'all', 'whole', 'not sample', 'population']
          : c.leaf === 'simulate'
            ? ['expected', 'below five', 'less five', 'condition', 'small']
            : ['sample', 'group', 'random', 'drawn', 'variable', 'column'],
      minMatches: 2,
      polarity: 'any',
      feedback: `Say what in the collection settles it: ${LEAF_TELL[c.leaf]}.`,
    }

    const conditionGroup: RubricGroup = {
      label: isChi || c.leaf === 'simulate' ? 'Names the expected-count condition and where it stands' : 'Names the condition the procedure rests on',
      phrasings: isChi || c.leaf === 'simulate' ? ['expected', 'five', 'condition', 'large count'] : c.leaf === 'census' ? ['no pvalue', 'not pvalue', 'no inference', 'not inference', 'describe', 'percent'] : ['random', 'condition', 'independent', 'large count', 'success'],
      polarity: 'any',
      feedback:
        c.leaf === 'census'
          ? 'Say what the report contains instead of a test: counts, row percentages, and the difference named in words.'
          : c.leaf === 'simulate'
            ? 'Say which condition fails and by how much, and what the simulation does in its place.'
            : 'Name the condition this procedure rests on and say where it stands for this file.',
    }

    const exemplar =
      c.leaf === 'census'
        ? `This file is a census: every unit the question is about is already in it, so there is no sample and no sampling variability for a p-value to describe. No test should be run. Report the counts, the row percentages and the difference between the groups in words, and say plainly that the comparison is a description of this population rather than an estimate of anything wider.`
        : c.leaf === 'simulate'
          ? `The design calls for a chi-square test of independence, because one random sample was drawn and two categorical variables were recorded on every unit. The expected-count condition fails: the smallest expected count in this table is well below five, so the chi-square curve is the wrong reference distribution and any p-value read from it is meaningless. Simulate the null instead by shuffling the outcome labels at random among all the units several thousand times and counting how often the observed cell is matched or exceeded; that proportion is the p-value.`
          : `The procedure is ${LEAF_NAME[c.leaf]}. ${c.because} The data were drawn at random, which is the first condition${isChi ? ', and every expected count must be checked against five before the statistic is read' : ', and the large-counts condition is checked on the successes and failures in each group'}.`

    return {
      prompt: `> ${c.text}\n\n**Name the procedure and justify it.** Say what in the design settles the choice, and name the condition the procedure rests on and where it stands for this file.`,
      answer: {
        type: 'interpretation',
        required: [nameGroup, designGroup, conditionGroup, contextGroup('Answers in the terms of this file rather than in general', [c.text.slice(0, 160)], { minMatches: 2, optional: true })],
        exemplar,
        minWords: 25,
      },
      hints: [
        'Two separate jobs. Naming the procedure is a claim about how the data were collected; justifying it means quoting the sentence in the file that settles it.',
        `Here: ${LEAF_TELL[c.leaf]}.`,
        c.leaf === 'simulate'
          ? 'Say which condition fails, and say what replaces the chi-square curve: a null distribution built by relabelling, and a p-value counted off it.'
          : c.leaf === 'census'
            ? 'There is no procedure to name. Say why, and say what goes in the report instead.'
            : 'Then the condition: random, and either large counts on the successes and failures or every expected count at five or above.',
      ],
      solution: `**${exemplar}**\n\nA justification that only names the procedure is half an answer, and it is the half a reader cannot check. The other half quotes the design.\n\n| what to say | where it comes from |\n| --- | --- |\n| the procedure | the collection rule, before any count is read |\n| why that one | which totals were fixed, how many variables, and whether the file is a sample at all |\n| the condition | the expected counts for a χ² test; successes and failures for a z-test; nothing at all for a census |\n\nThe two endings nobody reaches for on their own are the two this Act is about. A calculator will run a χ² test on a table expecting a fraction of a unit in one cell and print a P-value with no complaint, and it will run one on a whole population and print a P-value for a question about sampling that nobody sampled.`,
      misconception: 'Naming a procedure without quoting the design. Two files with identical tables can need different tests, and a report that does not say which collection rule it read has not justified anything.',
    }
  },
})
