/**
 * act-7-07 · The Inference Brief — drills. AP 7.10: choosing the procedure from the question and
 * the structure of the data rather than from the number of columns on the screen, writing the
 * four-step answer, auditing a conditions block, and knowing what a bootstrap interval is for.
 *
 *   act-7/select-procedure      choice   the procedure for a described question (checkpoint q10)
 *   act-7/procedure-from-design choice   the procedure from a design description, no numbers
 *   act-7/interval-or-test      choice   magnitude or decision, and what each one buys
 *   act-7/conditions-audit      choice   the condition never checked, or checked on the wrong thing
 *   act-7/bootstrap-vs-t        choice   when a resampled interval earns its place, and what it fixes
 *   act-7/four-step-writeup     interp   state, plan, do, conclude — graded on structure
 *
 * Every framing is another office's file. The brief's own five findings are act-7-07's mission
 * beat, and `reservedCount` / `reservedStat` keep a draw off the Act's numbers.
 */
import { defineGenerator, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { contextGroup, numberRegex } from '@/lib/problems/rubric'
import type { RubricGroup } from '@/lib/problems/types'
import { mean, oneMeanTest, outliers, pairedTTest, sd, skewness, twoMeanTest, welchDf } from '@/lib/stats'
import { fmt, fmtInt, fmtP } from '@/lib/stats/format'
import { ALPHAS, ONE_SAMPLE_CONTEXTS, PAIRED_CONTEXTS, TWO_SAMPLE_CONTEXTS, reservedCount, reservedStat, shuffleChoice, smallN, type Candidate } from './contexts'

// ---------------------------------------------------------------------------------------------
// The five families, both forms
// ---------------------------------------------------------------------------------------------

type Family = 'one-prop' | 'two-prop' | 'one-mean' | 'paired' | 'two-mean'
type Form = 'interval' | 'test'

const FAMILY_LABEL: Record<Family, { interval: string; test: string }> = {
  'one-prop': { interval: 'One-proportion z-interval', test: 'One-proportion z-test' },
  'two-prop': { interval: 'Two-proportion z-interval', test: 'Two-proportion z-test' },
  'one-mean': { interval: 'One-sample t-interval', test: 'One-sample t-test' },
  paired: { interval: 'Paired t-interval (one-sample t on the differences)', test: 'Paired t-test (one-sample t on the differences)' },
  'two-mean': { interval: 'Two-sample t-interval', test: 'Two-sample t-test' },
}

const label = (fam: Family, form: Form) => FAMILY_LABEL[fam][form]

/**
 * The near-miss a learner reaches for when they count columns instead of reading the design, and
 * the one they reach for when they misread what was recorded on each unit. Both maps are keyed by
 * the **correct** family; `WHY_TRAP` and `WHY_TYPE` explain, in the same key, why that near-miss is
 * the wrong answer here.
 */
const STRUCTURE_TRAP: Record<Family, Family> = {
  paired: 'two-mean',
  'two-mean': 'paired',
  'one-mean': 'two-mean',
  'one-prop': 'two-prop',
  'two-prop': 'one-prop',
}

const TYPE_TRAP: Record<Family, Family> = {
  'one-mean': 'one-prop',
  'two-mean': 'two-prop',
  paired: 'two-prop',
  'one-prop': 'one-mean',
  'two-prop': 'two-mean',
}

const WHY_TRAP: Record<Family, string> = {
  paired: 'That treats the two columns as two independent groups. They are the same units measured twice, so the rows are the units, the differences are the sample, and the standard error the two-sample procedure would build carries all the unit-to-unit variation that subtracting cancels.',
  'two-mean': 'That treats two independent groups as though each row were one unit measured twice. There is no rule matching a unit in the first group to a unit in the second, so the differences and the standard error would both be inventions.',
  'one-mean': 'There is one group of measurements here, not two. A two-sample procedure needs a second group of different units and a parameter that is a difference.',
  'one-prop': 'There is one group here, not two, and the parameter is a single proportion.',
  'two-prop': 'There are two independent groups here, and the parameter is a difference of proportions.',
}

const WHY_TYPE: Record<Family, string> = {
  'one-mean': 'What was recorded on each unit is a **number**, not a yes/no. A proportion procedure needs a categorical outcome and counts of successes and failures.',
  'two-mean': 'What was recorded on each unit is a **number**. A two-proportion procedure needs a yes/no outcome in each group and the large-counts condition, neither of which exists here.',
  paired: 'What was recorded on each unit is a **number**, twice. Proportions do not enter it.',
  'one-prop': 'What was recorded on each unit is a **category**, not a measurement. There is no mean to estimate, and no s to put in a standard error.',
  'two-prop': 'What was recorded on each unit is a **category** in each of two groups, so the parameter is a difference of proportions and the conditions are the large-counts ones.',
}

interface ProcedureCase {
  id: string
  family: Family
  form: Form
  /** The question as the office asks it. */
  question: string
  /** What was measured on each unit and how the units are grouped. */
  structure: string
  because: string
}

const PROCEDURE_CASES: readonly ProcedureCase[] = [
  {
    id: 'berth-ontime-interval',
    family: 'one-prop',
    form: 'interval',
    question: 'The Ceres berth office recorded, for each of 480 departures drawn at random from the year, whether it cleared its slot on time. **How large is the on-time rate at the deep berths, with a margin?**',
    structure: 'One yes/no outcome on each of one group of 480 departures.',
    because: 'One group, a categorical outcome, and the question asks how large rather than whether.',
  },
  {
    id: 'pump-return-test',
    family: 'one-prop',
    form: 'test',
    question: 'The Thebe Yard advertises that no more than four percent of its rebuilt pumps come back inside a year. Of 260 rebuilt pumps followed up at random, 21 came back. **Is there evidence the true return rate exceeds four percent?**',
    structure: 'One yes/no outcome on each of one group of 260 pumps, read against a published figure.',
    because: 'One group, a categorical outcome, and a claim about a fixed value that the question asks us to decide about.',
  },
  {
    id: 'watch-amend-test',
    family: 'two-prop',
    form: 'test',
    question: 'Of 310 departures cleared by the day watch, 22 filed an amended plot; of 275 cleared by the night watch, 41 did. The two sets of departures are independent random samples. **Is there evidence the two watches differ in amendment rate?**',
    structure: 'One yes/no outcome recorded on each of two independent groups of departures.',
    because: 'Two independent groups, a categorical outcome, and the question asks whether there is evidence of a difference.',
  },
  {
    id: 'watch-amend-interval',
    family: 'two-prop',
    form: 'interval',
    question: 'The same two independent samples of departures, day watch and night watch, with the amended-plot counts above. **How much higher is the night watch amendment rate than the day watch?**',
    structure: 'One yes/no outcome recorded on each of two independent groups of departures.',
    because: 'Two independent groups, a categorical outcome, and the question asks for a magnitude with a margin.',
  },
  {
    id: 'panel-shed-interval',
    family: 'one-mean',
    form: 'interval',
    question: 'The Thebe radiator shop measured heat shed at rated flow on 14 rebuilt panels drawn at random from the rebuild queue. **How much heat does a rebuilt panel shed on average, with a margin?**',
    structure: 'One quantitative measurement on each of one group of 14 panels; σ unknown.',
    because: 'One group, a quantitative measurement, and the question asks for a magnitude rather than a decision.',
  },
  {
    id: 'panel-shed-test',
    family: 'one-mean',
    form: 'test',
    question: "The same 14 rebuilt panels, against the shop's rebuild standard of 74 kW. **Is there evidence the mean heat shed of rebuilt panels falls short of the standard?**",
    structure: 'One quantitative measurement on each of one group of 14 panels, read against a published figure; σ unknown.',
    because: 'One group, a quantitative measurement, and a claim about where the mean sits relative to a fixed number.',
  },
  {
    id: 'cooler-bearing-test',
    family: 'paired',
    form: 'test',
    question: "The tender's cryogenics bay logged hours to first over-temperature alarm for each of 16 cryocoolers on the run before a bearing replacement and again on a matched run after it. **Is there evidence the replacement increased the time to first alarm?**",
    structure: 'Two quantitative measurements on the **same** 16 coolers, before and after.',
    because: 'The two columns hold the same coolers, so each row is one unit measured twice and the 16 differences are one sample.',
  },
  {
    id: 'cooler-bearing-interval',
    family: 'paired',
    form: 'interval',
    question: 'The same 16 cryocoolers, before and after the bearing replacement. **By how many hours did the time to first alarm change, on average?**',
    structure: 'Two quantitative measurements on the **same** 16 coolers, before and after.',
    because: 'Same coolers in both columns, so the differences are one sample, and the question asks for a magnitude.',
  },
  {
    id: 'convoy-delay-test',
    family: 'two-mean',
    form: 'test',
    question: 'The Ceres Authority sampled 17 convoyed transits and, separately and independently, 23 independently routed transits, and measured delay against the filed plot on each. No hull appears in both lists. **Is there evidence the two mean delays differ?**',
    structure: 'One quantitative measurement on each transit; two groups of different hulls with no matching rule.',
    because: 'Different units in the two groups and no way to pair them, so the samples are independent and the parameter is μ₁ − μ₂.',
  },
  {
    id: 'convoy-delay-interval',
    family: 'two-mean',
    form: 'interval',
    question: 'The same two independent samples of transits, convoyed and independently routed. **How large is the difference in mean delay against the filed plot?**',
    structure: 'One quantitative measurement on each transit; two groups of different hulls with no matching rule.',
    because: 'Two independent groups of measurements, and the question asks for the size of the gap rather than for a decision about it.',
  },
  {
    id: 'twin-arrays-test',
    family: 'paired',
    form: 'test',
    question: 'Every survey hull on the Adrastea run carries two pointing arrays, port and starboard, built by different makers. The sensor shop measured pointing error on both arrays of each of 19 hulls. **Is there evidence the two makers differ in mean pointing error?**',
    structure: 'Two quantitative measurements on the **same** 19 hulls: one array of each maker, on the same mounting, in the same conditions.',
    because: 'Both measurements come off one hull, so the hull is the unit and the port-minus-starboard differences are one sample.',
  },
  {
    id: 'yard-thrust-interval',
    family: 'two-mean',
    form: 'interval',
    question: 'The Elara test cell certified 13 drives overhauled at Elara and 21 overhauled at Thebe, both sets drawn at random from their yards, and recorded certified thrust on each. The two lists are printed side by side on one sheet. **How large is the difference in mean certified thrust between the two yards?**',
    structure: 'One quantitative measurement on each drive; two groups of different drives, printed as two columns but matched by nothing.',
    because: 'Two columns on a page are not two measurements of one thing. These are different drives, so the samples are independent.',
  },
]

// ---------------------------------------------------------------------------------------------
// 1. Choice — the procedure for a described question (checkpoint q10)
// ---------------------------------------------------------------------------------------------

export const selectProcedure = defineGenerator({
  id: 'act-7/select-procedure',
  label: 'Select the inference procedure for a question',
  ap_topics: ['7.10'],
  skills: ['1'],
  generate(rng) {
    const c = pickContext(rng, PROCEDURE_CASES)
    const otherForm: Form = c.form === 'interval' ? 'test' : 'interval'

    const cands: Candidate[] = [{ text: `**${label(c.family, c.form)}**`, correct: true, why: null }]

    const add = (fam: Family, form: Form, why: string) => {
      const text = `**${label(fam, form)}**`
      if (cands.some((x) => x.text === text)) return
      cands.push({ text, correct: false, why })
    }

    add(
      c.family,
      otherForm,
      c.form === 'interval'
        ? 'Right family, wrong form. The question asks **how large**, and a test returns a decision about one value rather than a range of the values the data are consistent with. An estimate is what a reader who has to act needs.'
        : 'Right family, wrong form. The question asks whether there is **evidence** of something, which is a decision at a stated level. An interval answers a different question, and converting it into a decision by eye throws away the α the office chose.',
    )
    add(STRUCTURE_TRAP[c.family], c.form, WHY_TRAP[c.family])
    add(TYPE_TRAP[c.family], c.form, WHY_TYPE[c.family])
    if (cands.length < 4) add(TYPE_TRAP[c.family], otherForm, `${WHY_TYPE[c.family]} The form is wrong too.`)

    const { options, correct, feedback } = shuffleChoice(rng, cands.slice(0, 4))

    return {
      prompt: `${c.question}\n\nWhich procedure answers it?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Three questions in order, and none of them is "how many columns are on the page". What was recorded on each unit — a number or a category? How many groups of units, and are the units in the two columns the same units? And does the question ask how large, or whether there is evidence?',
        `Here: ${c.structure}`,
      ],
      solution: `**${label(c.family, c.form)}**\n\n${c.because}\n\nThe decision runs the same way every time.\n\n| question | answer here | what it settles |\n| --- | --- | --- |\n| categorical or quantitative? | ${c.family === 'one-prop' || c.family === 'two-prop' ? 'categorical' : 'quantitative'} | proportion procedures against mean procedures |\n| how many groups of units? | ${c.family === 'one-prop' || c.family === 'one-mean' ? 'one' : c.family === 'paired' ? 'one (measured twice)' : 'two'} | one-sample against two-sample |\n| same units in both columns? | ${c.family === 'paired' ? 'yes — the rows are the units' : c.family === 'two-mean' || c.family === 'two-prop' ? 'no — the groups are strangers' : 'not applicable'} | paired against independent |\n| magnitude or decision? | ${c.form === 'interval' ? 'magnitude' : 'decision'} | interval against test |\n\nStructure: ${c.structure}\n\nThe order matters. The last question is the only one about what is being asked; the first three are all about how the data were collected, and they are answered before any number is looked at.`,
      misconception: 'Choosing by the number of columns on the screen. Two columns are two samples only when the rows are strangers; when a row is one unit measured twice the file holds one sample of differences, and the two procedures disagree in both directions.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — the procedure from a design description, with no numbers
// ---------------------------------------------------------------------------------------------

interface DesignCase {
  id: string
  family: Family
  design: string
  because: string
}

const DESIGN_CASES: readonly DesignCase[] = [
  {
    id: 'twin-berths',
    family: 'paired',
    design:
      'Every deep berth at Ceres has two mooring stations, inboard and outboard, and a hull secures at one of each on every visit. The survey office proposes to time the securing at both stations for every hull in a random sample of visits, and compare the two designs of clamp.',
    because: 'Each visit produces one inboard time and one outboard time on the same hull in the same conditions, so the visit is the unit and the pairing comes from the design.',
  },
  {
    id: 'sorted-columns',
    family: 'two-mean',
    design:
      'The Himalia office has fuel-remaining readings for a random sample of hulls on the long geometry and, separately, for a random sample of hulls on the short geometry. No hull flew both. A clerk proposes sorting each list from smallest to largest, lining the two up row by row, and subtracting.',
    because: 'Nothing matches a hull on one geometry to a hull on the other, so the two samples are independent. Sorting and lining up manufactures a correspondence that the design never created, and the standard error it produces is meaningless.',
  },
  {
    id: 'before-after-retune',
    family: 'paired',
    design:
      'The Thebe drive shop will record time to the outer mark on the last run before a throttle-map retune and on the first run after it, for every hull that goes through the retune this season.',
    because: 'Each hull appears in both columns. The rows are the hulls, the sample is the set of changes, and the hull-to-hull variation that swamps a two-sample reading cancels in the subtraction.',
  },
  {
    id: 'two-yards',
    family: 'two-mean',
    design: 'The test cell will take a random sample of reactors overhauled at Elara and an independent random sample of reactors overhauled at Thebe, and measure certified thrust on each.',
    because: 'Different reactors in the two groups with no rule matching one to another, and a quantitative measurement on each: two independent samples.',
  },
  {
    id: 'census-turnaround',
    family: 'one-mean',
    design: 'The berth office will take every departure it cleared last quarter and compute turnaround time for each, in order to compare the mean against the Authority published figure.',
    because: 'One group of measurements read against a fixed published number. The census has to be stated as what it is under the Random condition, and the procedure is still a one-sample t.',
  },
  {
    id: 'advisory-rate',
    family: 'one-prop',
    design: 'The relay office will draw a random sample of transits from the archive and record, for each, whether it drew a late-check-in advisory, in order to say how common advisories are on the corridor.',
    because: 'A yes/no outcome on one group of units. The parameter is a single proportion, and there is no mean anywhere in the design.',
  },
  {
    id: 'two-watches',
    family: 'two-prop',
    design: 'The relay office will draw independent random samples of departures cleared by the day watch and by the night watch, and record for each whether an amended plot was filed.',
    because: 'A yes/no outcome recorded in each of two independent groups: the parameter is a difference of proportions.',
  },
  {
    id: 'volunteer-crossover',
    family: 'paired',
    design:
      'Masters at Adrastea will each file one departure plot under the old procedure and one under the revised procedure, with the order of the two decided by a coin flip for each master, and the minutes spent filing recorded both times.',
    because: 'Each master files under both procedures, so the master is the unit, the randomisation happens inside the pair, and the sample is the set of differences.',
  },
]

export const procedureFromDesign = defineGenerator({
  id: 'act-7/procedure-from-design',
  label: 'The procedure from the design alone',
  ap_topics: ['7.10'],
  skills: ['1'],
  generate(rng) {
    const c = pickContext(rng, DESIGN_CASES)
    const form: Form = rng.bool() ? 'test' : 'interval'
    const ask = form === 'test' ? 'decide whether the two conditions differ' : 'estimate how large the difference is'
    const askOne = form === 'test' ? 'decide whether the mean or rate differs from the published figure' : 'estimate the mean or rate with a margin'
    const single = c.family === 'one-mean' || c.family === 'one-prop'

    const cands: Candidate[] = [{ text: `**${label(c.family, form)}**`, correct: true, why: null }]
    const add = (fam: Family, why: string) => {
      const text = `**${label(fam, form)}**`
      if (cands.some((x) => x.text === text)) return
      cands.push({ text, correct: false, why })
    }
    add(STRUCTURE_TRAP[c.family], WHY_TRAP[c.family])
    add(TYPE_TRAP[c.family], WHY_TYPE[c.family])
    const spare: Family = c.family === 'one-mean' ? 'paired' : 'one-mean'
    if (cands.length < 4) add(spare, `This design produces ${c.family === 'paired' ? 'two measurements on each unit' : c.family === 'one-mean' ? 'one measurement on each unit in a single group' : 'two groups of different units'}, which is not the structure that procedure is for. Read the collection rule, then pick.`)
    if (cands.length < 4) add('two-prop', WHY_TYPE[c.family])

    const { options, correct, feedback } = shuffleChoice(rng, cands.slice(0, 4))

    return {
      prompt: `No data have been collected yet. Here is the **design**:\n\n> ${c.design}\n\nThe office wants to ${single ? askOne : ask}. Which procedure does this design call for?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Point at one row of the file this design will produce and say out loud what it is. One unit, measured once? One unit, measured twice? Or two units that have nothing to do with each other?',
        'Pairing has to be built into the collection. A rule that lines two finished columns up afterwards — by rank, by row number, by anything the design did not specify — is an invention, and the procedure it licenses does not exist.',
      ],
      solution: `**${label(c.family, form)}**\n\n${c.because}\n\nThe design settles the procedure before any data exist, which is why this question can be answered with no numbers on the page at all. What is recorded on each unit fixes the family; how the units are grouped fixes one sample against two; and whether a rule matches a unit in one column to a unit in the other fixes paired against independent. Only the last choice, ${form === 'test' ? 'a test' : 'an interval'}, comes from what the office wants to know.\n\nThe failure this item is built around is the one that runs the other way: reading the finished spreadsheet, counting two columns, and choosing a two-sample procedure because there are two of them. Two columns of equal length are not a pairing, and two columns produced by measuring the same unit twice are not two samples.`,
      misconception: 'Deciding from the shape of the spreadsheet rather than from the collection rule. The spreadsheet is the same either way; the design is what says whether a row is one thing or two.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — interval or test
// ---------------------------------------------------------------------------------------------

export const intervalOrTest = defineGenerator({
  id: 'act-7/interval-or-test',
  label: 'Interval or test: magnitude or decision',
  ap_topics: ['7.10'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const alpha = pickContext(rng, ALPHAS)
    const wantInterval = rng.bool()
    const n1 = smallN(rng, 10, 26)
    const n2 = retry(rng, (r) => smallN(r, 10, 26), (v) => v !== n1)

    const question = wantInterval
      ? `${ctx.office} has to decide how much extra time to build into the schedule for ${ctx.groupA}. It asks: **by how much does the mean ${ctx.measure} of ${ctx.groupA} differ from that of ${ctx.groupB}, and how precisely do we know it?**`
      : `${ctx.office} has been told the two groups are interchangeable and has to say whether its own file contradicts that. It asks: **do these data give convincing evidence, at $\\alpha = ${fmt(alpha, 2)}$, that the mean ${ctx.measure} of ${ctx.groupA} differs from that of ${ctx.groupB}?**`

    const cands: Candidate[] = [
      {
        text: wantInterval
          ? `A **two-sample $t$-interval** for $\\mu_1 - \\mu_2$. The question is about size, and an interval returns the whole range of differences the data are consistent with, in ${ctx.units}, which is what a schedule is built from.`
          : `A **two-sample $t$-test** of $H_0: \\mu_1 - \\mu_2 = 0$. The question is a decision at a stated level, and the test returns the p-value that decision is made against.`,
        correct: true,
        why: null,
      },
      {
        text: wantInterval
          ? `A **two-sample $t$-test** of $H_0: \\mu_1 - \\mu_2 = 0$ at $\\alpha = ${fmt(alpha, 2)}$, reporting whether the difference is statistically significant.`
          : `A **two-sample $t$-interval** for $\\mu_1 - \\mu_2$, reporting the endpoints and letting the reader decide.`,
        correct: false,
        why: wantInterval
          ? `A test answers a yes/no question and this one is a how-much question. "Significant" would tell the office that some difference is there without telling it whether the difference is a quarter of a ${ctx.units} or three of them, and the schedule needs the second number.`
          : `An interval is a fine thing to report alongside, and it is not what was asked. A test states the α in advance and returns a p-value against it; reading the decision off an interval's endpoints after the fact leaves no stated level anywhere in the report.`,
      },
      {
        text: `Both, reported together: the ${fmtInt(n1)} and ${fmtInt(n2)} ${ctx.unit} support an interval and a test, and reporting both removes the need to choose.`,
        correct: false,
        why: `Reporting both is good practice and it is not an answer to this question. One of the two is what the office asked for and goes in the finding line; the other is context. A brief that cannot say which of its two numbers answers the question has not chosen a procedure, and the choice is what is being graded.`,
      },
      {
        text: `Neither yet. With ${fmtInt(n1)} and ${fmtInt(n2)} ${ctx.unit} the samples are under thirty, so no inference about ${ctx.population} is available until more ${ctx.unit} are collected.`,
        correct: false,
        why: `Thirty is the size above which the Central Limit Theorem carries the Normal condition without a graph. Below it the condition is checked by drawing each sample and describing what it shows, which is ordinary work, not a bar to inference. ${fmtInt(n1)} and ${fmtInt(n2)} are perfectly usable.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${question}\n\nThe office holds independent random samples of **${fmtInt(n1)} ${ctx.groupA}** and **${fmtInt(n2)} ${ctx.groupB}** from ${ctx.population}, with ${ctx.measure} on each. Conditions hold in both groups.\n\nWhich procedure answers the question as asked?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Read the question and nothing else first. Does it end in a quantity with units on it, or in a yes and a no?',
        'An interval buys a magnitude with its precision attached. A test buys a decision at a level fixed in advance. They are built from the same estimate and the same standard error, and they answer different sentences.',
      ],
      solution: `**${options[correct]}**\n\nThe two procedures share an estimate and a standard error and differ in what they hand back.\n\n| | interval | test |\n| --- | --- | --- |\n| answers | how large, and how precisely | is there evidence, at α |\n| returns | a range in ${ctx.units} | a p-value and a decision |\n| needs fixed in advance | the confidence level | the alternative and α |\n| what it cannot do | name a decision at a stated level | say how big the difference is |\n\n${wantInterval ? 'A schedule is a number of ' + ctx.units + ', so the finding has to be a range of ' + ctx.units + '.' : 'A contradiction of a stated claim is a decision, so the finding has to be a p-value against a level chosen before the data were read.'}\n\nThe two agree more often than not, and where they disagree it is usually because a two-sided interval at ${fmtPctLevel(alpha)} and a one-sided test at $\\alpha = ${fmt(alpha, 2)}$ are not the same procedure. Report the one that was asked for, and say which.`,
      misconception: 'Answering a how-much question with "statistically significant". Significance is a decision about one value; it carries no magnitude, and an office that has to act needs the magnitude and its precision.',
    }
  },
})

/** The two-sided confidence level that matches a one-sided α, for the closing note above. */
function fmtPctLevel(alpha: number): string {
  return `${fmt(100 * (1 - 2 * alpha), 0)}%`
}

// ---------------------------------------------------------------------------------------------
// 4. Choice — the conditions audit
// ---------------------------------------------------------------------------------------------

type AuditFault = 'normal-on-columns' | 'ten-percent-on-census' | 'random-on-volunteers' | 'none'

export const conditionsAudit = defineGenerator({
  id: 'act-7/conditions-audit',
  label: 'Audit a finished conditions block',
  ap_topics: ['7.10'],
  skills: ['1', '4'],
  generate(rng) {
    const fault = pickContext(rng, ['normal-on-columns', 'ten-percent-on-census', 'random-on-volunteers', 'none'] as const) as AuditFault
    const paired = fault === 'normal-on-columns' || fault === 'none'
    const pctx = pickContext(rng, PAIRED_CONTEXTS)
    const tctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)
    const n = smallN(rng, 9, 22)
    const n2 = retry(rng, (r) => smallN(r, 9, 22), (v) => v !== n)
    const register = retry(rng, (r) => (n + n2) * r.int(30, 80), (v) => !reservedCount(v))

    const office = paired ? pctx.office : tctx.office
    const procedure = paired ? 'a paired $t$-test on the differences' : 'a two-sample $t$-test'

    const design = paired
      ? `${office} logged ${pctx.measure} for each of **${fmtInt(n)} ${pctx.unit}** ${pctx.beforeLabel} and again ${pctx.afterLabel}. The ${pctx.unit} were drawn at random from ${pctx.population}. It ran ${procedure} on the ${fmtInt(n)} differences.`
      : fault === 'ten-percent-on-census'
        ? `${office} measured ${tctx.measure} on **every one of the ${fmtInt(n)} ${tctx.groupA}** on its register — a census, not a sample — and on an independent random sample of **${fmtInt(n2)} ${tctx.groupB}**. It ran ${procedure}.`
        : `${office} put out a call for ${tctx.unit} willing to take part. **${fmtInt(n)} ${tctx.groupA}** and **${fmtInt(n2)} ${tctx.groupB}** came forward and were measured on ${tctx.measure}. It ran ${procedure}.`

    const block = paired
      ? tableMd(
          ['condition', 'what the report says'],
          [
            ['Random', `the ${fmtInt(n)} ${pctx.unit} were drawn at random from ${pctx.population}`],
            ['Independent', `$10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)}$, well under the ${fmtInt(register)} on the register`],
            [
              'Normal',
              fault === 'normal-on-columns'
                ? `dotplots of the **${pctx.beforeLabel}** column and the **${pctx.afterLabel}** column were drawn; neither is skewed and neither has an outlier`
                : `a dotplot of the **${fmtInt(n)} differences** was drawn; it is roughly symmetric with nothing outside the fences`,
            ],
          ],
        )
      : tableMd(
          ['condition', 'what the report says'],
          [
            [
              'Random',
              fault === 'random-on-volunteers'
                ? `both groups are random samples of ${tctx.population}`
                : `the ${tctx.groupA} are a census of the register and the ${fmtInt(n2)} ${tctx.groupB} are a random sample`,
            ],
            [
              'Independent',
              fault === 'ten-percent-on-census'
                ? `$10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)}$ and $10 \\times ${fmtInt(n2)} = ${fmtInt(10 * n2)}$, both under the ${fmtInt(register)} on the register`
                : `$10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)}$ and $10 \\times ${fmtInt(n2)} = ${fmtInt(10 * n2)}$, both under the ${fmtInt(register)} on the register`,
            ],
            ['Normal', `dotplots of each group were drawn; neither is skewed and neither has a value outside the fences`],
          ],
        )

    const cands: Candidate[] = [
      {
        text: `**Normal was checked on the wrong sample.** The two raw columns were graphed, and the sample this procedure runs on is the ${fmtInt(n)} **differences**. Each column carries every unit's own standing level, so either one may look skewed or strung out with no bearing on the procedure.`,
        correct: fault === 'normal-on-columns',
        why:
          fault === 'normal-on-columns'
            ? null
            : paired
              ? `Read the Normal row again: this report graphed the differences, which is the sample the paired procedure uses. That row is correct.`
              : `This is a two-sample procedure on two independent groups. There are no differences to graph; each group is its own sample and each one has to be looked at, which is what the report did.`,
      },
      {
        text: `**The 10% condition was applied where it does not belong.** One group is a census of its register, so there is no sampling variability to correct for and no "10% of the population" to compute. The row states arithmetic that answers nothing, and what the report owes instead is a sentence saying the group is the whole population.`,
        correct: fault === 'ten-percent-on-census',
        why:
          fault === 'ten-percent-on-census'
            ? null
            : `Everything measured here was sampled at random, so the 10% arithmetic is the right check and the report has done it: $10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)}$ against ${fmtInt(register)}.`,
      },
      {
        text: `**Random was asserted, not checked.** The units came forward on their own, so the file is a voluntary-response sample and no amount of arithmetic downstream repairs it. The report has written "random sample" over a group that selected itself.`,
        correct: fault === 'random-on-volunteers',
        why:
          fault === 'random-on-volunteers'
            ? null
            : `The report describes how the units were obtained and the description matches what was done. Nobody volunteered for this study.`,
      },
      {
        text: `**Nothing is missing.** Every condition is named, each is supported by the right evidence for this design, and the arithmetic in the Independent row is correct as stated.`,
        correct: fault === 'none',
        why:
          fault === 'none'
            ? null
            : fault === 'normal-on-columns'
              ? `The Normal row is about the wrong sample. A paired procedure's sampling distribution belongs to $\\bar{d}$, so the graph that settles the condition is the graph of the differences.`
              : fault === 'ten-percent-on-census'
                ? `The Independent row does arithmetic on a group that was not sampled at all. A census has no sampling variability, and the report has to say so rather than compute a ratio against itself.`
                : `The Random row is false. Volunteers are not a random sample, and the condition that fails there is the one no later step can recover.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `An analysis has been finished, written up and signed. Your job is the audit.\n\n**Design.** ${design}\n\n**Conditions, as the report states them.**\n\n${block}\n\nWhich condition was **never checked, or checked on the wrong thing**?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Take the rows one at a time and ask what evidence each one is supposed to carry. Random is about how the units were obtained. Independent is arithmetic, and only when there was sampling. Normal is about a graph — of the sample the procedure actually runs on.',
        `Name the sample first. For ${procedure}, which column of numbers goes into the standard error?`,
      ],
      solution: `**${options[correct]}**\n\nA conditions block is three separate claims with three separate kinds of evidence, and the audit checks that each claim is supported by evidence of the right kind.\n\n- **Random** is settled by the sentence describing how the units were obtained, and by nothing else. It is the one condition that cannot be repaired further down the page.\n- **Independent** is arithmetic, and it applies to sampling. $10n$ against the population size, group by group. A census has no sampling variability and the row should say so instead of computing a ratio.\n- **Normal** is a graph of **the sample the procedure runs on**. For ${procedure}, that is ${paired ? `the ${fmtInt(n)} differences, one per unit` : `each of the two groups, separately`}.\n\n${
        fault === 'none'
          ? 'Here all three rows carry the right evidence for this design, which is what a clean audit looks like: not the absence of words, but each word matched to the thing it is about.'
          : 'A report can name all three conditions, show arithmetic under each, and still have checked the wrong thing. The words are not the check.'
      }`,
      misconception: 'Reading a conditions block for completeness rather than for fit. Three rows with numbers in them look finished; the question is whether each number is evidence about the claim above it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — bootstrap against t
// ---------------------------------------------------------------------------------------------

export const bootstrapVsT = defineGenerator({
  id: 'act-7/bootstrap-vs-t',
  label: 'When a bootstrap interval earns its place',
  ap_topics: ['7.10'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const n = smallN(rng, 9, 19)
    const reps = pickContext(rng, [1000, 2000, 4000] as const)
    const digits = ctx.digits + 1

    const d = retry(
      rng,
      (r) => {
        const lo = Math.round((ctx.centre - r.uniform(0.5, 1.2) * ctx.spread) * 10 ** digits) / 10 ** digits
        const hi = Math.round((ctx.centre + r.uniform(0.5, 1.2) * ctx.spread) * 10 ** digits) / 10 ** digits
        const bLo = Math.round((lo + r.uniform(-0.12, 0.12) * ctx.spread) * 10 ** digits) / 10 ** digits
        const bHi = Math.round((hi + r.uniform(-0.12, 0.12) * ctx.spread) * 10 ** digits) / 10 ** digits
        return { lo, hi, bLo, bHi }
      },
      ({ lo, hi, bLo, bHi }) => bLo < bHi && lo < hi && !reservedStat(hi - lo) && Math.abs(hi - lo - (bHi - bLo)) < 0.5 * ctx.spread,
    )

    const skewValue = Math.round(rng.uniform(0.8, 1.4) * 100) / 100

    const cands: Candidate[] = [
      {
        text: `The two intervals agreeing is a **robustness check on the $t$ procedure**, and that is all it is. The bootstrap resamples the same ${fmtInt(n)} ${ctx.unit} with replacement, so it can show that the $t$ interval is not being driven by the Normal approximation — and it can do nothing about a sample that is unrepresentative of ${ctx.population}, because every resample is drawn from that same sample.`,
        correct: true,
        why: null,
      },
      {
        text: `The bootstrap interval requires no conditions, so with $n = ${fmtInt(n)}$ and a skewness of ${fmt(skewValue, 2)} it should replace the $t$ interval outright and the $t$ interval should be dropped from the report.`,
        correct: false,
        why: `A percentile bootstrap drops the Normality assumption and keeps every other one. It still needs the sample to have come from the population the conclusion is about, it still needs the observations to be independent, and on ${fmtInt(n)} observations it is itself approximate. Fewer conditions is not none.`,
      },
      {
        text: `Resampling ${fmtInt(reps)} times makes the estimate ${fmtInt(reps)} times as precise, so the bootstrap interval is the narrower and better of the two and its width should be the one reported.`,
        correct: false,
        why: `Resampling adds no information. The ${fmtInt(reps)} replications only make the **Monte-Carlo noise** in the percentile endpoints small; the width of the interval is set by the ${fmtInt(n)} observations that were actually collected, and running four thousand replications instead of one thousand moves the endpoints in the last decimal and nowhere else.`,
      },
      {
        text: `Because the bootstrap interval and the $t$ interval agree, the population of ${ctx.population} must be approximately Normal, which retroactively justifies the Normal condition.`,
        correct: false,
        why: `Agreement says the $t$ interval's answer does not hinge on the Normal model — that the procedure is robust here. It is not evidence about the shape of ${ctx.population}, which ${fmtInt(n)} observations were never going to settle either way.`,
      },
      {
        text: `The bootstrap is only defensible once $n \\geq 30$; below that the resamples repeat too many of the same values, so with ${fmtInt(n)} ${ctx.unit} neither interval should be reported.`,
        correct: false,
        why: `Small samples are the case a bootstrap is reached for, not the case it is barred from. Resamples do repeat values — that is the mechanism — and the method's real limitation on a small sample is that a shape the sample failed to capture is a shape no resample can invent.`,
      },
    ]

    const chosen = [cands[0], ...rng.shuffle(cands.slice(1)).slice(0, 3)]
    const { options, correct, feedback } = shuffleChoice(rng, chosen)

    return {
      prompt: `${ctx.office} has ${ctx.measure} on **${fmtInt(n)} ${ctx.unit}** drawn at random from ${ctx.population}. The dotplot has a mild right tail — skewness ${fmt(skewValue, 2)}, no value outside the fences — so the analyst reports both intervals:\n\n$$\\text{one-sample } t\\text{: } (${fmt(d.lo, digits)},\\ ${fmt(d.hi, digits)}) \\qquad \\text{percentile bootstrap, } ${fmtInt(reps)} \\text{ resamples: } (${fmt(d.bLo, digits)},\\ ${fmt(d.bHi, digits)})$$\n\nBoth in ${ctx.units}. **What does the agreement between them establish?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask what the bootstrap actually resamples from. Not the population — it never sees the population. The resamples are drawn, with replacement, from the one sample that was collected.',
        'So sort the assumptions into two piles: the ones the resampling replaces, and the ones it inherits unchanged. Normality is in the first pile. Everything about how the sample was obtained is in the second.',
      ],
      solution: `**${options[correct]}**\n\nA percentile bootstrap builds the sampling distribution of $\\bar{x}$ by treating the sample as a stand-in for the population and drawing from it ${fmtInt(reps)} times with replacement. That buys one thing: the interval no longer rests on the $t$ model being the right shape.\n\n| assumption | bootstrap | one-sample $t$ |\n| --- | --- | --- |\n| the sample represents ${ctx.population} | required | required |\n| observations independent | required | required |\n| sampling distribution of $\\bar{x}$ is approximately Normal | not required | required |\n| population Normal, or $n \\geq 30$ | not required | required for the condition |\n\nThe widths here are ${fmt(d.hi - d.lo, digits)} and ${fmt(d.bHi - d.bLo, digits)} ${ctx.units}. When two intervals built on different assumptions land on top of each other, the honest sentence is that the conclusion does not depend on the assumption they differ in. Report one, say the other agreed, and move on.\n\nWhat neither of them fixes: a biased sample. If the ${fmtInt(n)} ${ctx.unit} are unlike ${ctx.population} in some way, every one of the ${fmtInt(reps)} resamples is unlike it in the same way, and both intervals are precisely centred on the wrong number.`,
      misconception: 'Treating the bootstrap as a way of getting more data, or as an assumption-free procedure. It redistributes the data you have; it inherits every defect in how they were collected.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — the four-step write-up, graded on structure
// ---------------------------------------------------------------------------------------------

type WriteupKind = 'one-mean' | 'paired' | 'two-mean'

export const fourStepWriteup = defineGenerator({
  id: 'act-7/four-step-writeup',
  label: 'The four-step write-up: state, plan, do, conclude',
  ap_topics: ['7.10'],
  skills: ['1', '4'],
  generate(rng) {
    const kind = pickContext(rng, ['one-mean', 'paired', 'two-mean'] as const) as WriteupKind
    const alpha = pickContext(rng, ALPHAS)

    const octx = pickContext(rng, ONE_SAMPLE_CONTEXTS)
    const pctx = pickContext(rng, PAIRED_CONTEXTS)
    const tctx = pickContext(rng, TWO_SAMPLE_CONTEXTS)

    const digits = (kind === 'one-mean' ? octx.digits : kind === 'paired' ? pctx.digits : tctx.digits) + 1
    const units = kind === 'one-mean' ? octx.units : kind === 'paired' ? pctx.units : tctx.units
    const office = kind === 'one-mean' ? octx.office : kind === 'paired' ? pctx.office : tctx.office
    const population = kind === 'one-mean' ? octx.population : kind === 'paired' ? pctx.population : tctx.population
    const measure = kind === 'one-mean' ? octx.measure : kind === 'paired' ? pctx.measure : tctx.measure
    const unitPlural = kind === 'one-mean' ? octx.unit : kind === 'paired' ? pctx.unit : tctx.unit

    /* One draw per structure, each accepted only when the p-value lands somewhere readable. */
    const drawn = retry(
      rng,
      (r) => {
        if (kind === 'one-mean') {
          const n = smallN(r, 9, 24)
          const q = 10 ** octx.digits
          const mu0 = Math.round(octx.centre * q) / q
          const xbar = Math.round((mu0 + r.uniform(0.3, 1.4) * octx.spread * (r.bool(0.75) ? 1 : -1)) * q) / q
          const s = Math.round(r.uniform(0.6, 1.4) * octx.spread * q) / q
          const above = xbar > mu0
          const test = oneMeanTest({ mean: xbar, sd: s, n }, { mu0, alt: above ? 'greater' : 'less', random: true })
          return { n, n2: 0, mu0, xbar, s, above, test, welch: n - 1 }
        }
        if (kind === 'paired') {
          const n = smallN(r, 9, 22)
          const q = 10 ** pctx.digits
          const diffs = Array.from({ length: n }, () => Math.round((pctx.shift + r.normal(0, pctx.spread)) * q) / q)
          const zeros = diffs.map(() => 0)
          const above = mean(diffs) > 0
          const test = pairedTTest(diffs, zeros, { alt: above ? 'greater' : 'less', random: true })
          if (outliers(diffs).values.length > 0 || Math.abs(skewness(diffs)) > 1) return { n, n2: 0, mu0: 0, xbar: NaN, s: NaN, above, test, welch: n - 1 }
          return { n, n2: 0, mu0: 0, xbar: mean(diffs), s: sd(diffs), above, test, welch: n - 1 }
        }
        const n = smallN(r, 9, 24)
        const n2 = smallN(r, 9, 24)
        const q = 10 ** tctx.digits
        const round = (v: number) => Math.round(v * q) / q
        const shift = tctx.spread * r.uniform(0.5, 1.5) * (r.bool() ? 1 : -1)
        const a = Array.from({ length: n }, () => round(tctx.centre + shift + r.normal(0, tctx.spread * r.uniform(0.75, 1.05))))
        const b = Array.from({ length: n2 }, () => round(tctx.centre + r.normal(0, tctx.spread * r.uniform(0.95, 1.4))))
        const above = mean(a) > mean(b)
        const test = twoMeanTest(a, b, { alt: above ? 'greater' : 'less', random: true })
        if (n === n2 || outliers(a).values.length > 0 || outliers(b).values.length > 0) return { n, n2, mu0: 0, xbar: NaN, s: NaN, above, test, welch: NaN }
        return { n, n2, mu0: 0, xbar: mean(a) - mean(b), s: NaN, above, test, welch: welchDf(sd(a), n, sd(b), n2) }
      },
      (v) => {
        const p = v.test.pValue as number
        if (!Number.isFinite(v.xbar) || !Number.isFinite(v.welch)) return false
        if (reservedCount(v.n) || (v.n2 && reservedCount(v.n2))) return false
        if (reservedStat(v.test.statistic)) return false
        return p > 0.0003 && p < 0.42
      },
    )

    const { n, n2, mu0, test, above, welch } = drawn
    const p = test.pValue as number
    const reject = p < alpha
    const dfShown = kind === 'two-mean' ? fmt(welch, 2) : fmtInt(n - 1)

    const procName = kind === 'one-mean' ? 'one-sample t-test' : kind === 'paired' ? 'paired t-test on the differences' : 'two-sample t-test'
    const parameterWord = kind === 'one-mean' ? `true mean ${measure}` : kind === 'paired' ? `true mean change in ${measure}` : `true difference in mean ${measure}`
    const hypText =
      kind === 'one-mean'
        ? `$H_0: \\mu = ${fmt(mu0, digits - 1)}$ against $H_a: \\mu ${above ? '>' : '<'} ${fmt(mu0, digits - 1)}$`
        : kind === 'paired'
          ? `$H_0: \\mu_d = 0$ against $H_a: \\mu_d ${above ? '>' : '<'} 0$`
          : `$H_0: \\mu_1 - \\mu_2 = 0$ against $H_a: \\mu_1 - \\mu_2 ${above ? '>' : '<'} 0$`

    const setup =
      kind === 'one-mean'
        ? `${office} measured ${measure} on **${fmtInt(n)} ${unitPlural}** drawn at random from ${population}, and reads the mean against ${octx.standardLabel} of ${fmt(mu0, digits - 1)} ${units}. The dotplot is roughly symmetric with nothing outside the fences.`
        : kind === 'paired'
          ? `${office} recorded ${measure} for **${fmtInt(n)} ${unitPlural}** ${pctx.beforeLabel} and again ${pctx.afterLabel}. The ${unitPlural} were drawn at random from ${population}; the dotplot of the ${fmtInt(n)} differences is roughly symmetric with nothing outside the fences.`
          : `${office} drew independent random samples of **${fmtInt(n)} ${tctx.groupA}** and **${fmtInt(n2)} ${tctx.groupB}** from ${population} and measured ${measure} on each. Neither group's dotplot is skewed and neither has an outlier.`

    const tenPercent = kind === 'two-mean' ? `$10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)}$ and $10 \\times ${fmtInt(n2)} = ${fmtInt(10 * n2)}$` : `$10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)}$`

    const required: RubricGroup[] = [
      {
        label: 'STATE — names the parameter and writes the hypotheses',
        phrasings: ['mu', 'null', 'alt', 'parameter', 'true', 'hypothesis'],
        minMatches: 2,
        polarity: 'any',
        feedback: `Open with the parameter in words and in symbols: the ${parameterWord} of ${population}. Then ${hypText.replace(/\$/g, '')}.`,
      },
      {
        label: 'PLAN — names the procedure and checks the conditions with numbers',
        phrasings: [procName, 'random', 'condition', 'independent', 'normal', /\b10\b/, numberRegex(10 * n, 0, 0)],
        minMatches: 3,
        polarity: 'any',
        feedback: `Name the procedure (${procName}) and then the three conditions with their evidence: random, ${tenPercent.replace(/\$|\\times/g, '')}, and what the graph shows.`,
      },
      {
        label: 'DO — reports the statistic, the degrees of freedom and the p-value',
        phrasings: [numberRegex(test.statistic, 2, 1), numberRegex(p, 4, 2), 'df', 'statistic', 'pvalue'],
        minMatches: 2,
        polarity: 'any',
        feedback: `Show the arithmetic: SE = ${fmt(test.se, digits + 1)}, t = ${fmt(test.statistic, 3)} on ${dfShown} degrees of freedom, p = ${fmtP(p)}.`,
      },
      reject
        ? {
            label: 'CONCLUDE — the decision, with p beside α',
            phrasings: ['reject', 'convincing evidence', 'significant'],
            feedback: `p = ${fmtP(p)} is below α = ${fmt(alpha, 2)}, so reject H₀ and say so in the same sentence as the two numbers.`,
          }
        : {
            label: 'CONCLUDE — the decision, with p beside α',
            phrasings: ['not reject', 'not convincing', 'not enough evidence', 'not evidence', 'not significant'],
            feedback: `p = ${fmtP(p)} is not below α = ${fmt(alpha, 2)}, so fail to reject H₀ — and never "accept" it.`,
          },
      contextGroup('CONCLUDE — in context: the population and what was measured', [population, measure], {
        feedback: `The conclusion names whom it is about (${population}) and what was measured (${measure}).`,
      }),
      {
        label: 'CONCLUDE — states the limit on the conclusion',
        phrasings: ['not cause', 'not causal', 'not establish cause', 'not prove', 'not random assign', 'not assign', 'observational', 'evidence not proof'],
        polarity: 'positive',
        feedback: 'One line under the conclusion saying what it does not establish. Nothing here was randomly assigned, so the finding is an association and the write-up says so before a reader assumes otherwise.',
      },
    ]

    const exemplar = `State: let ${kind === 'two-mean' ? '$\\mu_1 - \\mu_2$ be' : kind === 'paired' ? '$\\mu_d$ be' : '$\\mu$ be'} the ${parameterWord} of ${population}. ${hypText.replace(/\$/g, '')}, at alpha = ${fmt(alpha, 2)}. Plan: a ${procName}, unpooled. Random — the units were drawn at random; Independent — ${tenPercent.replace(/\$|\\times/g, 'x ')} is well inside the register, and ${kind === 'two-mean' ? 'the two groups share no unit' : 'the units are independent of one another'}; Normal — ${kind === 'paired' ? `the dotplot of the ${fmtInt(n)} differences` : kind === 'two-mean' ? "each group's dotplot" : 'the dotplot'} shows no strong skew and no outlier. Do: SE = ${fmt(test.se, digits + 1)}, t = ${fmt(test.statistic, 3)} on ${dfShown} degrees of freedom, p = ${fmtP(p)}. Conclude: because p = ${fmtP(p)} is ${reject ? 'less' : 'greater'} than alpha = ${fmt(alpha, 2)}, we ${reject ? 'reject' : 'fail to reject'} the null hypothesis; there is ${reject ? '' : 'not '}convincing evidence about the ${parameterWord} of ${population}, measured as ${measure}. Nothing was randomly assigned here, so this does not establish a cause.`

    return {
      prompt: `${setup}\n\nThe office wants the finding written up the way the brief requires it: **state, plan, do, conclude**, at $\\alpha = ${fmt(alpha, 2)}$, with the limit on the conclusion underneath.\n\nThe procedure returns\n\n$$t = ${fmt(test.statistic, 3)} \\qquad df = ${dfShown} \\qquad p = ${fmtP(p)}$$\n\nWrite the four-step answer.`,
      answer: {
        type: 'interpretation',
        required,
        forbidden: [
          { phrase: 'prove', label: 'Claims proof', why: 'A test returns evidence at a stated level, never proof, and a brief that says "proves" hands a reader the word to quote back.' },
          {
            phrase: /\b(?:the )?sample (?:mean|difference)s? (?:is|are|was|were)\s+(?:greater|less|differ)/,
            label: 'Conclusion about the sample',
            why: 'The sample mean is known exactly and needs no test. The conclusion is a claim about the parameter — a number nobody has measured.',
          },
        ],
        exemplar,
        minWords: 40,
      },
      hints: [
        'Four labelled moves, in order, and each one owes something specific. State owes a parameter and hypotheses. Plan owes a named procedure and three conditions with numbers in them. Do owes the arithmetic. Conclude owes a decision, a context and a limit.',
        `Here: the parameter is the ${parameterWord} of ${population}; the procedure is a ${procName}; the conditions are random, ${tenPercent.replace(/\$|\\times/g, '')}, and the graph; the arithmetic is $t = ${fmt(test.statistic, 3)}$ on ${dfShown} df with $p = ${fmtP(p)}$.`,
        `The decision compares ${fmtP(p)} with $\\alpha = ${fmt(alpha, 2)}$, and the last line says what the finding does not establish — nothing was randomly assigned, so no cause.`,
      ],
      solution: `**${exemplar}**\n\nThe four steps are graded on structure because a brief is read by people looking for the step that is missing.\n\n1. **State.** The parameter in words and in symbols, and the hypotheses about it, written before any statistic exists. A hypothesis about $\\bar{x}$ is a claim about a number already known.\n2. **Plan.** The procedure by name, and the conditions with their evidence attached: ${tenPercent} against the register, and a description of the graph rather than the word "Normal" on its own.\n3. **Do.** $SE = ${fmt(test.se, digits + 2)}$, $t = ${fmt(test.statistic, 4)}$ on ${dfShown} degrees of freedom, $P = ${fmtP(p)}$. Carry full precision to here and round once.\n4. **Conclude.** The decision with $p$ and $\\alpha$ beside each other, the claim in context, and the limit. ${reject ? `${fmtP(p)} is below ${fmt(alpha, 2)}, so $H_0$ is rejected` : `${fmtP(p)} is above ${fmt(alpha, 2)}, so $H_0$ is not rejected`}, and the finding is an association: nothing was randomly assigned, so no line of this answer may attribute the gap to anything.\n\nA write-up with all four steps and one wrong procedure is worth less than a write-up with the right procedure and a missing step, because the first one is wrong all the way down and reads as though it is not.`,
      misconception: 'Leading with the arithmetic. A reader checking the work needs the parameter and the conditions first, because those are what decide whether the arithmetic was entitled to be done at all.',
    }
  },
})
