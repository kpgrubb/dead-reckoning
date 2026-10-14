/**
 * act-9-04 · The Evidence Board — drills. AP 9.6: selecting an inference procedure across Units
 * 6–9, and judging a body of evidence built out of several of them.
 *
 *   act-9/select-inference-procedure  choice  one procedure named, four described questions
 *   act-9/procedure-and-limit         choice  a finding from the case file: its procedure and its limit
 *   act-9/weakest-link                choice  where a hostile review starts
 *   act-9/stacked-p-values            choice  why several P-values are not one P-value
 *   act-9/quantitative-or-categorical choice  the question a χ² table cannot answer
 *   act-9/case-limitations            interp  what an assembled case proves and does not
 *
 * The procedure cases are other corridors' files. The case-file drill reads `./case-file` through
 * `@/instruments/act-9/case-file`, which is the Act's own answer key and the only shared source of
 * truth for what each finding is entitled to carry.
 */
import { defineGenerator, pickContext, retry } from '@/lib/problems/generate'
import { contextGroup } from '@/lib/problems/rubric'
import type { ForbiddenPhrase, InterpretationAnswer, RubricGroup } from '@/lib/problems/types'
import { fmt, fmtInt, fmtP } from '@/lib/stats'
import { CASE_FILE, LIMITATION_KEY, LIMITATION_LABEL, PROCEDURE_LABEL, type Procedure } from '@/instruments/act-9/case-file'
import { shuffleChoice, type Candidate } from './contexts'

// ---------------------------------------------------------------------------------------------
// The procedure cases (Units 6–9)
// ---------------------------------------------------------------------------------------------

type Leaf =
  | 'one-prop-z'
  | 'two-prop-z'
  | 'one-sample-t'
  | 'paired-t'
  | 'two-sample-t'
  | 'chi-square-gof'
  | 'chi-square-homogeneity'
  | 'chi-square-independence'
  | 'slope-t-interval'
  | 'slope-t-test'
  | 'simulate'
  | 'describe'

const LEAF_NAME: Record<Leaf, string> = {
  'one-prop-z': 'a one-proportion z-test',
  'two-prop-z': 'a two-proportion z-test',
  'one-sample-t': 'a one-sample t-interval for a mean',
  'paired-t': 'a paired t-test on the differences',
  'two-sample-t': 'a two-sample t-test',
  'chi-square-gof': 'a χ² goodness-of-fit test',
  'chi-square-homogeneity': 'a χ² test of homogeneity',
  'chi-square-independence': 'a χ² test of independence',
  'slope-t-interval': 'a t-interval for the slope of a regression model',
  'slope-t-test': 'a t-test for the slope of a regression model',
  simulate: 'a simulation of the null distribution, because the expected counts fail',
  describe: 'no inference at all: the file is a census and is described',
}

const LEAF_TELL: Record<Leaf, string> = {
  'one-prop-z': 'one sample, a yes/no outcome, and a published proportion to read it against',
  'two-prop-z': 'two separately drawn samples and a yes/no outcome in each',
  'one-sample-t': 'one sample, a quantitative measurement on each unit, and a mean to estimate',
  'paired-t': 'two measurements on the same unit, so the data are one column of differences',
  'two-sample-t': 'two separately drawn samples with a quantitative measurement in each',
  'chi-square-gof': 'one sample, one categorical variable, and a whole claimed distribution across its categories',
  'chi-square-homogeneity': 'two or more separately drawn samples with one categorical variable measured in each',
  'chi-square-independence': 'one sample with two categorical variables recorded on every unit',
  'slope-t-interval': 'two quantitative variables on each unit, and a rate to estimate with its uncertainty',
  'slope-t-test': 'two quantitative variables on each unit, and a rate to hold against a stated value',
  simulate: 'a table whose design is right and whose smallest expected count is below five',
  describe: 'a file holding every unit the question is about, so there is nothing to generalise to',
}

interface Case {
  id: string
  leaf: Leaf
  text: string
  because: string
}

const CASES: readonly Case[] = [
  {
    id: 'amendment-rate',
    leaf: 'one-prop-z',
    text: 'The Authority publishes a six percent manifest-amendment rate for the corridor. A cutter boarded 240 hulls drawn at random and recorded, for each, whether the manifest had been amended. **Is the true rate above six percent?**',
    because: 'One random sample, a yes/no outcome on each hull, one published figure to read it against, and a direction in the question.',
  },
  {
    id: 'two-offices-flagged',
    leaf: 'two-prop-z',
    text: 'Independent random samples of 180 fuel certifications were drawn from each of two Bureau offices, and each certification was recorded as clean or flagged on re-inspection. **Do the two offices differ in flag rate?**',
    because: 'Two separately drawn samples, a two-category outcome in each. The parameter is a difference of proportions.',
  },
  {
    id: 'uprate-output',
    leaf: 'one-sample-t',
    text: 'A yard measured sustained drive output, in kilowatts, on a random sample of 24 uprated hulls. **What is the mean output of uprated hulls, and is it above the drive-family specification?**',
    because: 'One sample, one quantitative measurement per hull, and a mean to estimate. An interval both estimates the mean and settles the claim against the specification.',
  },
  {
    id: 'before-after-refit',
    leaf: 'paired-t',
    text: 'For each of 18 hulls, the Authority holds the Mark-9 transit time on the voyage before its refit and on the voyage after. **Did the refit change transit time?**',
    because: 'Two measurements on the same hull. Subtract within each hull and the data become one column of 18 differences.',
  },
  {
    id: 'lost-vs-arrived',
    leaf: 'two-sample-t',
    text: 'Random samples of 31 hulls that arrived and 26 that were later written off were drawn from the Transit Ledger, and the Mark-9 delay against the filed profile was recorded for each. **Do the two groups differ in mean delay?**',
    because: 'Two groups, a quantitative measurement in each, and no pairing between a hull in one group and a hull in the other.',
  },
  {
    id: 'cargo-mix-fit',
    leaf: 'chi-square-gof',
    text: "The Authority publishes the corridor's declared cargo mix across four classes. A random sample of 210 transits was pulled from the archive and each transit's cargo class recorded. **Does the archive's mix match the published one?**",
    because: 'One sample, one categorical variable, and a distribution claimed before the data existed.',
  },
  {
    id: 'watch-advisories',
    leaf: 'chi-square-homogeneity',
    text: "Each of a cutter's three watches drew its own random list of hulls to board, the three list lengths fixed in advance, and every boarding was recorded as no advisory, late check-in or plot amendment. **Do the three watches write advisories in the same proportions?**",
    because: 'Three groups drawn separately with their totals fixed in advance, and one categorical variable measured in each.',
  },
  {
    id: 'deck-and-filing',
    leaf: 'chi-square-independence',
    text: 'One random sample of 320 departures was pulled from the Uruk High quarter. Each carries two columns already in the record: the berth deck it left from, and whether it filed on time. **Is filing on time related to the berth deck?**',
    because: 'One sample classified two ways. Nobody fixed how many departures would come off each deck, so the only total set in advance is the grand total.',
  },
  {
    id: 'fuel-per-tonne',
    leaf: 'slope-t-interval',
    text: 'For each of 22 departures drawn at random, the Bureau holds the fuel the filed profile required and the fuel actually pumped, both in tonnes. **How many tonnes go into the tanks per tonne the profile requires, and how precisely is that rate known?**',
    because: 'Two quantitative columns on each departure, and the question asks for a rate with its uncertainty rather than for a verdict.',
  },
  {
    id: 'delay-vs-uprate',
    leaf: 'slope-t-test',
    text: 'For each of 19 uprated hulls, the archive holds the kilowatts the uprate added and the days of Mark-9 delay against the filed profile. **Is there convincing evidence that delay increases with the size of the uprate?**',
    because: 'Two quantitative columns on each hull, and the question is whether the rate is distinguishable from zero.',
  },
  {
    id: 'seal-per-crew',
    leaf: 'simulate',
    text: 'A dock audit pulled 260 outbound manifests at random and recorded the loading crew and whether the seal was broken on arrival. One crew loaded nine of the 260, and three of those nine came in broken, against a break rate near four percent overall. **Is seal failure related to the crew that loaded?**',
    because: 'The design points at independence and the arithmetic refuses it: nine manifests at a four percent break rate expect well under one broken seal in that cell.',
  },
  {
    id: 'every-finding',
    leaf: 'describe',
    text: 'Two claims offices wrote every loss finding on the corridor between them over six years. All 31 losses are in the file, with the office and the finding on each. **Do the two offices classify losses differently?**',
    because: 'These 31 are not a sample of the losses; they are the losses. There is no sampling variability for a P-value to describe.',
  },
  {
    id: 'relay-clock',
    leaf: 'slope-t-test',
    text: 'The Authority measured one-way pulse delay against known range for 14 relay stations. Light fixes the slope at 8.317 minutes per AU. **Is the net’s delay per AU different from what physics requires?**',
    because: 'Two quantitative columns, and a slope the science fixes in advance. The null value is 8.317, not zero.',
  },
  {
    id: 'register-census',
    leaf: 'describe',
    text: 'The Lane Authority holds every advisory it issued last year, 1,140 of them, with the issuing station and the category on each. **Do the stations issue advisories in different proportions?**',
    because: 'Every advisory there was is in the file. The difference between stations is a fact about last year, not an estimate of anything.',
  },
  {
    id: 'escort-trial',
    leaf: 'two-prop-z',
    text: 'Ninety convoys were assigned at random to sail with an escort or without, and each was recorded as having suffered an incident or not. **Does escorting reduce the incident rate?**',
    because: 'Two groups, a yes/no outcome in each, and a direction. The random assignment is what makes the conclusion causal; it does not change the procedure.',
  },
  {
    id: 'sink-endurance',
    leaf: 'one-sample-t',
    text: 'A squadron logged heat-sink endurance, in minutes, on 16 cold runs drawn at random from its own log. **What is the mean endurance of a cold run in this squadron?**',
    because: 'One sample, one quantitative measurement, and a mean to estimate with no comparison in the question.',
  },
]

// ---------------------------------------------------------------------------------------------
// 1. Choice — the procedure named, the question chosen
// ---------------------------------------------------------------------------------------------

export const selectInferenceProcedure = defineGenerator({
  id: 'act-9/select-inference-procedure',
  label: 'Which question calls for this procedure',
  ap_topics: ['9.6'],
  skills: ['1', '4'],
  generate(rng) {
    const { target, others } = retry(
      rng,
      (r) => {
        const t = pickContext(r, CASES)
        const pool = CASES.filter((c) => c.leaf !== t.leaf)
        return { target: t, others: r.sample(pool, 3) }
      },
      ({ others }) => new Set(others.map((o) => o.leaf)).size === 3,
    )

    const cands: Candidate[] = [
      { text: target.text, correct: true, why: null },
      ...others.map((o) => ({
        text: o.text,
        correct: false,
        why: `That one calls for ${LEAF_NAME[o.leaf]}: ${LEAF_TELL[o.leaf]}. ${o.because}`,
      })),
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `Four questions, four files, one procedure.\n\n**Which of these questions is answered by ${LEAF_NAME[target.leaf]}?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Three readings settle almost every one of these, in order: how many samples, what kind of variable was recorded on each unit, and whether the question asks for an estimate or for a verdict.',
        `${LEAF_NAME[target.leaf].charAt(0).toUpperCase() + LEAF_NAME[target.leaf].slice(1)} needs ${LEAF_TELL[target.leaf]}.`,
      ],
      solution: `**${target.text}**\n\n${target.because}\n\nThe other three, and the reading that separates them:\n\n${others.map((o) => `- ${LEAF_NAME[o.leaf]} — ${LEAF_TELL[o.leaf]}.`).join('\n')}\n\nThe three questions worth asking of any file before naming a procedure:\n\n1. **How many samples, and were their sizes fixed in advance?** One sample classified two ways is independence; several samples compared on one variable is homogeneity; the arithmetic is identical and the name is not.\n2. **What was recorded on each unit?** A yes/no answer points at proportions, a measurement at means, a label at counts, and two measurements at a regression.\n3. **Estimate or verdict?** An interval answers "how much"; a test answers "is it this value". Both can settle a claim about a stated value, and only the interval says how precisely.\n\nTwo answers on these lists are not tests at all. When an expected count falls below five the χ² curve is the wrong reference and the null is simulated, and when the file is the whole population there is nothing to infer to.`,
      misconception: 'Naming the procedure from the subject matter rather than from the design. Fuel, delay and output appear under means, slopes and proportions alike; what decides is how many samples there are and what was measured on each unit.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — a finding from the case file, with its limit
// ---------------------------------------------------------------------------------------------

export const procedureAndLimit = defineGenerator({
  id: 'act-9/procedure-and-limit',
  label: 'A finding, its procedure and its limit',
  ap_topics: ['9.6'],
  skills: ['4'],
  generate(rng) {
    const finding = pickContext(rng, CASE_FILE)
    const limitation = LIMITATION_KEY[finding.id]
    const wrongProcedures = rng.sample(
      CASE_FILE.filter((f) => f.procedure !== finding.procedure).map((f) => f.procedure),
      2,
    ) as Procedure[]
    const wrongLimits = (Object.keys(LIMITATION_LABEL) as (keyof typeof LIMITATION_LABEL)[]).filter((l) => l !== limitation)
    const otherLimit = pickContext(rng, wrongLimits)

    const cands: Candidate[] = [
      {
        text: `${PROCEDURE_LABEL[finding.procedure]}, carrying **${finding.conclusion}**, with the limit *${LIMITATION_LABEL[limitation]}* — on the board as: ${finding.limit}.`,
        correct: true,
        why: null,
      },
      {
        text: `${PROCEDURE_LABEL[wrongProcedures[0]]}, carrying **${finding.conclusion}**, with the limit *${LIMITATION_LABEL[limitation]}*.`,
        correct: false,
        why: `The limit is right and the procedure is not. ${PROCEDURE_LABEL[wrongProcedures[0]]} answers a different shape of question; this finding came out of ${PROCEDURE_LABEL[finding.procedure].toLowerCase()}.`,
      },
      {
        text: `${PROCEDURE_LABEL[finding.procedure]}, carrying **${finding.conclusion}**, with the limit *${LIMITATION_LABEL[otherLimit]}*.`,
        correct: false,
        why: `The procedure is right and the limit is not. What the board requires beside this row is: ${finding.limit}. A finding placed without the limit it actually carries is a claim the file cannot support, and it is the first thing a hostile reader looks for.`,
      },
      {
        text: `${PROCEDURE_LABEL[wrongProcedures[1]]}, carrying **${finding.conclusion}**, with no limit required, because the conclusion already states exactly what the data showed.`,
        correct: false,
        why: 'Every row on the board carries a limit, including the two that are not inference at all. A conclusion with nothing written beside it is read as a claim about everything, and the reader supplies the scope you declined to.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `From the case file, finding **${finding.finding}** (modules ${finding.modules.join(', ')}).\n\n**Which procedure produced it, and what limit goes beside it on the board?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two independent readings. What shape of data the finding came out of, and what the finding is therefore not entitled to say.',
        'The limit categories are: no cause; scope, meaning these units only; descriptive rather than inference; a condition that passed narrowly; and a group that is not a random sample of anything.',
      ],
      solution: `**${finding.finding}** — ${PROCEDURE_LABEL[finding.procedure]}.\n\n**What it carries:** ${finding.conclusion}.\n\n**The limit:** ${finding.limit} — the category *${LIMITATION_LABEL[limitation]}*.\n\nA board row has three parts and the third is the one that gets dropped. The procedure says what kind of claim the data can support; the conclusion says what the claim is; and the limit says where it stops. Dropping the limit does not make the finding stronger. It makes it the reader's to bound, and a reader who bounds it for you will bound it tighter than you would have.`,
      misconception: 'Placing a finding with its procedure and its conclusion and leaving the limit blank. An unbounded finding is read as a claim about everything, and that is the version a hostile review answers.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — where a hostile review starts
// ---------------------------------------------------------------------------------------------

interface WeakCase {
  id: string
  /** The row a reviewer goes at first. */
  weak: string
  weakWhy: string
  /** Three rows that are sound enough to be the wrong answer. */
  sound: readonly { text: string; why: string }[]
}

const WEAK_CASES: readonly WeakCase[] = [
  {
    id: 'large-counts',
    weak: 'A two-proportion z-test comparing loss rates, whose Large Counts check passed with a smallest expected count of 10.7.',
    weakWhy:
      'Ten is the bar and 10.7 clears it by less than one hull. A reviewer who successfully disputes a single classification pushes that count under ten and the Normal approximation behind the z-test goes with it. Nothing about the finding is wrong; it is simply the row with the least slack, and the way to hold it is to write the 10.7 down yourself.',
    sound: [
      { text: 'A χ² goodness-of-fit test on 210 transits whose smallest expected count is 31.5.', why: 'Thirty-one against a bar of five is not a narrow pass. This row has room.' },
      { text: 'A slope t-interval on 22 departures whose residual plot is flat and whose normal probability plot is straight.', why: 'Conditions comfortably met, and the finding is stated as an interval, which carries its own uncertainty on its face.' },
      { text: 'A paired t-test on 18 hulls measured before and after, with the differences roughly symmetric and no outlier.', why: 'The pairing is the design rather than an assumption, and the differences behave. Not the softest row here.' },
    ],
  },
  {
    id: 'not-random',
    weak: 'A two-sample t-test comparing the hulls that were lost with the hulls that arrived, where the lost group is every loss there was rather than a sample of anything.',
    weakWhy:
      'The comparison is sound arithmetic on a group that was not drawn at random from any population. Whatever it finds describes those hulls and generalises nowhere, and the hulls were selected into the group by the very outcome being studied. Both of those belong in the limit line, and a review that extracts them is a review that got there first.',
    sound: [
      { text: 'A one-proportion z-test against a published rate, on 240 hulls boarded at random from the corridor.', why: 'Drawn at random from the population the conclusion is about. The inference has a frame.' },
      { text: 'A χ² test of independence on 320 departures pulled at random from one quarter, with every expected count above twelve.', why: 'One random sample, two recorded columns, conditions comfortable. The limit is "association, not cause", and that is ordinary.' },
      { text: 'A simulation of the null distribution for an examiner column, run because one expected count was 1.4.', why: 'The failed condition was caught and the procedure was changed because of it. A row that names its own problem is not the soft one.' },
    ],
  },
  {
    id: 'declared-not-actual',
    weak: 'A χ² goodness-of-fit test showing that the lost hulls’ **declared** cargo mix differs from the corridor’s, treated in the summary as a finding about what the hulls were carrying.',
    weakWhy:
      'The test is clean and the word in front of the variable is doing work the summary quietly drops. Declared cargo is a column on a certificate, and a file arguing that certificates were falsified cannot then read those certificates as cargo. The finding is about paperwork, and the sentence has to say so.',
    sound: [
      { text: 'A slope t-test on 19 departures against a value the rocket equation fixes, with conditions met and a one-sided P below 0.001.', why: 'A small P on met conditions, and the null value comes from physics rather than from the data. Strong row.' },
      { text: 'A one-sample t-interval for mean drive output on 24 uprated hulls drawn at random from the refit programme.', why: 'Random sample, quantitative measurement, an interval that carries its own uncertainty.' },
      { text: 'A description of 14 hull identifications with their ranges and bearings, labelled as evidence rather than inference.', why: 'It claims nothing it cannot hold. A row that declines to infer cannot be attacked for inferring.' },
    ],
  },
]

export const weakestLink = defineGenerator({
  id: 'act-9/weakest-link',
  label: 'Where a hostile review starts',
  ap_topics: ['9.6'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, WEAK_CASES)
    const cands: Candidate[] = [
      { text: c.weak, correct: true, why: null },
      ...c.sound.map((s) => ({ text: s.text, correct: false, why: s.why })),
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `A brief goes to a panel with four findings in it. The panel's counsel will read it once, looking for the page that breaks, and if he finds one the other three are never read.\n\n**Which row does he start with?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Not the row with the largest P-value. A hostile reader goes at the row whose conclusion depends on something that could plausibly have gone the other way.',
        'Three places that something hides: a condition that passed by a margin thin enough to argue about, a group that was not sampled at random from anything, and a variable whose name quietly changes between the table and the summary.',
      ],
      solution: `**${c.weak}**\n\n${c.weakWhy}\n\nWhy the other three are not the place to start:\n\n${c.sound.map((s) => `- ${s.text} — ${s.why}`).join('\n')}\n\nThe discipline this teaches is the same one in every limit line on the board. A weak row is not a row to withdraw. It is a row to bound out loud, in the brief, before anybody else does it for you, because a limit the author conceded reads as rigour and the same limit extracted under questioning reads as something that was being hidden.`,
      misconception: 'Equating the weakest finding with the largest P-value. Significance is not the soft spot; conditions, sampling and the wording of a variable are, and none of them appear in the arithmetic.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — several P-values are not one P-value
// ---------------------------------------------------------------------------------------------

export const stackedPValues = defineGenerator({
  id: 'act-9/stacked-p-values',
  label: 'Why several P-values are not one P-value',
  ap_topics: ['9.6'],
  skills: ['4'],
  generate(rng) {
    const k = rng.int(3, 5)
    const ps = Array.from({ length: k }, () => rng.uniform(0.0005, 0.04))
    const product = ps.reduce((a, b) => a * b, 1)
    const listed = ps.map((p) => fmtP(p)).join(', ')

    const cands: Candidate[] = [
      {
        text: `Nothing. There is no single number for the strength of ${fmtInt(k)} findings. Each P-value is the probability of its **own** data under its **own** null, and the ${fmtInt(k)} tests were run on overlapping records about the same hulls, so they are not independent and their product is not the probability of anything.`,
        correct: true,
        why: null,
      },
      {
        text: `The product, ${fmt(product, 10)}, is the probability that the whole case is wrong.`,
        correct: false,
        why: `Two separate errors. Multiplying probabilities requires independence, and these tests were run on overlapping columns of the same file: a hull that is heavy in one table is the same hull that is late in the next. And no P-value, multiplied or not, is the probability that a hypothesis is true. It is the probability of data at least this extreme if a particular null were true, which is a different conditional and runs the other way.`,
      },
      {
        text: `The smallest of them, ${fmtP(Math.min(...ps))}, because a case is as strong as its strongest finding.`,
        correct: false,
        why: 'Quoting the smallest P-value is worse than quoting all of them, because it is the one most likely to have been found by looking. If several tests are run and the smallest result is reported as the finding, the error rate of that procedure is nothing like the level attached to the single test it came out of.',
      },
      {
        text: `The largest of them, ${fmtP(Math.max(...ps))}, because a case is only as strong as its weakest finding.`,
        correct: false,
        why: 'Appealing, and still a single number for something that does not have one. The findings are about different claims, so there is no sense in which one of them bounds the others: a weak test of one proposition does not weaken a strong test of a different proposition.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `An assembled case contains **${fmtInt(k)} significance tests**, run on overlapping records drawn from the same archive, with P-values ${listed}.\n\nA reader asks for "the P-value of the case".\n\n**What is the honest answer?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Start by writing down what one of those P-values actually is: a probability of what, computed under what assumption.',
        'Then ask what multiplying two probabilities requires of them, and whether tests on overlapping records about the same hulls can satisfy it.',
      ],
      solution: `**There is no such number, and the honest answer says so.**\n\nEach P-value answers one question: *if this particular null were true, how often would data at least this extreme turn up?* It is a statement about data under a hypothesis, not a statement about a hypothesis.\n\nMultiplying them fails twice over.\n\n- **Independence.** $P(A \\cap B) = P(A)P(B)$ needs independence, and these ${fmtInt(k)} tests share records. The same hulls appear in several tables, so a quirk in the archive shows up in more than one result.\n- **Direction.** Even for independent tests, the product is the probability of seeing this whole pattern under **all** the nulls at once. It is not the probability that the case is wrong, and nothing in the procedure delivers that.\n\nWhat a body of evidence is judged on instead is structural, and each item is a sentence rather than a number: do the findings point the same way; was each procedure the one its design called for; were conditions met; do they rest on independent sources rather than on one archive; and is there a single innocent explanation that accounts for all of them at once. That last question is what a finding designed to have **no** innocent explanation is for.\n\nThe mirror-image error is quoting the smallest P-value from a set of tests as though it were a single planned test. Run enough tests and a small one arrives on its own.`,
      misconception: 'Treating P-values as probabilities that hypotheses are true, and then combining them arithmetically. Neither step is available, and the second one needs independence the file does not have.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — the question a table cannot answer
// ---------------------------------------------------------------------------------------------

interface BinCase {
  id: string
  office: string
  xVar: string
  yVar: string
  slopeUnits: string
  bins: string
}

const BIN_CASES: readonly BinCase[] = [
  {
    id: 'uprate-delay',
    office: 'an Authority analyst',
    xVar: 'the kilowatts an uprate added',
    yVar: 'the days of Mark-9 delay',
    slopeUnits: 'days of delay per kilowatt',
    bins: 'low, medium and high uprate against early, on time and late',
  },
  {
    id: 'fuel-mass',
    office: 'a Bureau clerk',
    xVar: 'declared departure mass',
    yVar: 'the fuel pumped',
    slopeUnits: 'tonnes of fuel per tonne of declared mass',
    bins: 'light, medium and heavy hulls against under, at and over the requirement',
  },
  {
    id: 'load-endurance',
    office: 'a squadron engineer',
    xVar: 'radiator load during a cold run',
    yVar: 'heat-sink endurance',
    slopeUnits: 'minutes of endurance per kilowatt of load',
    bins: 'light, medium and heavy load against short, medium and long endurance',
  },
]

export const quantitativeOrCategorical = defineGenerator({
  id: 'act-9/quantitative-or-categorical',
  label: 'Why a two-way table is the wrong procedure here',
  ap_topics: ['9.6'],
  skills: ['1', '4'],
  generate(rng) {
    const c = pickContext(rng, BIN_CASES)
    const n = rng.int(60, 180)

    const cands: Candidate[] = [
      {
        text: `Regress ${c.yVar} on ${c.xVar} and run a t-test for the slope. Both columns are quantitative, so the question has an answer in ${c.slopeUnits}; cutting them into three bands each throws that away and leaves a test that can say only "related".`,
        correct: true,
        why: null,
      },
      {
        text: `The χ² test of independence is correct. Both variables were successfully put into three categories, every expected count is above five, and the test will return a valid P-value.`,
        correct: false,
        why: `It will return a valid P-value, and that is the trap. The arithmetic is sound; the procedure answers a weaker question than the data can support. A χ² on banded data reports whether the two labels are related. It cannot report a rate, it cannot give an interval for one, and it cannot be held against a value some specification fixes. The bands also move the answer: another analyst's cut points give a different statistic on the same ${fmtInt(n)} ${'records'}.`,
      },
      {
        text: `A χ² goodness-of-fit test on the nine cells, against the distribution the analyst would expect if the two variables were unrelated.`,
        correct: false,
        why: 'Goodness of fit is for one categorical variable against a distribution claimed before the data. Here there are two variables and the expected counts would be computed from the margins of this very table, which is a test of independence wearing the wrong name — and it is still the wrong procedure for two quantitative columns.',
      },
      {
        text: `A two-sample t-test comparing mean ${c.yVar} in the lowest band of ${c.xVar} against the highest.`,
        correct: false,
        why: `Better than the table, because at least the response stays quantitative, and still wasteful. It discards the middle band entirely, it still depends on where the cut points went, and it answers "do the ends differ" rather than "at what rate does ${c.yVar} change". The regression uses all ${fmtInt(n)} records and returns the rate itself.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${c.office.charAt(0).toUpperCase() + c.office.slice(1)} has ${fmtInt(n)} records, each carrying two measurements: ${c.xVar} and ${c.yVar}. Both are recorded as numbers.\n\nThe analyst cut each column into three bands (${c.bins}), built a 3 × 3 table, and ran a χ² test of independence. Every expected count cleared five.\n\n**What should have been done instead, and why?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Ask what was recorded on each unit before asking what was done with it. Two numbers per record is a different design from two labels per record, and the procedure follows the design.',
        'Then ask what question each procedure can answer. One of them can report a rate with units on it; the other can only report that two labels are not independent.',
      ],
      solution: `**Regress ${c.yVar} on ${c.xVar} and test the slope.**\n\nEach record carries two quantitative measurements, which is the design Unit 9 is for. Banding them into three categories each is a decision made after the data arrived, and it costs three things:\n\n- **The rate.** A slope comes out in ${c.slopeUnits} and can be interpreted, bounded by an interval and held against a value a specification or the physics fixes. A χ² statistic has no units and no direction.\n- **Precision.** Every record inside a band is treated as identical to every other, so most of the information in both columns is discarded. On the same ${fmtInt(n)} records the regression will usually detect a smaller real effect.\n- **Reproducibility.** The statistic depends on where the cut points went, and nobody else would have put them in the same places.\n\nThe χ² is not wrong arithmetic. It is a valid test of a question nobody needed answered, and "the test returned a P-value" is never the argument for having run it.\n\nThe reverse mistake is worth naming too: a regression cannot be run on two label columns, and coding categories as 1, 2, 3 to force one through is the same error travelling the other way.`,
      misconception: 'Choosing the procedure from the table in front of you rather than from what was measured. Quantitative data can always be banded into a table, and the table always returns a number.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — the limitations paragraph
// ---------------------------------------------------------------------------------------------

const PROVES: ForbiddenPhrase = {
  phrase: 'prove',
  label: 'Claims proof',
  why: 'A body of evidence supplies findings at stated error rates for stated populations. Proof is a word from a different trade, and it is the cheapest thing in a brief to attack.',
}

interface CaseFraming {
  id: string
  subject: string
  /** The units every finding in the brief is about. */
  units: string
  established: string
  unestablished: string
  narrow: string
}

const CASE_FRAMINGS: readonly CaseFraming[] = [
  {
    id: 'bureau',
    subject: 'a Bureau of Hulls office',
    units: 'the nineteen flagged departures',
    established: 'the flagged departures were fuelled above what their own filed profiles required, and the excess tracks a quantity no innocent account connects to fuel',
    unestablished: 'who ordered it, or why',
    narrow: 'one expected count in the examiner table fell below five, so that finding rests on a simulation rather than on χ²',
  },
  {
    id: 'yard',
    subject: 'a refit yard',
    units: 'the twelve hulls the programme uprated',
    established: 'the uprated hulls run above the drive-family specification and arrive later than they did before the refit',
    unestablished: 'that the uprate is what made them late',
    narrow: 'the twelve are every hull the programme touched rather than a random sample of anything',
  },
  {
    id: 'claims',
    subject: 'a claims office',
    units: 'the thirty-one losses on the register',
    established: 'losses are not independent of who collects on the hull, and the classifications differ from the comparison corridor’s',
    unestablished: 'that the beneficiary arrangement caused any loss',
    narrow: 'the Large Counts check passed at 10.7, which clears ten by less than one hull',
  },
]

export const caseLimitations = defineGenerator({
  id: 'act-9/case-limitations',
  label: 'What an assembled case does and does not establish',
  ap_topics: ['9.6', '3.7'],
  skills: ['4'],
  generate(rng) {
    const c = pickContext(rng, CASE_FRAMINGS)
    const k = rng.int(4, 7)

    const required: RubricGroup[] = [
      {
        label: 'States what the findings do establish',
        phrasings: ['convincing evidence', 'evidence', 'establish', 'show', 'finding'],
        polarity: 'any',
        feedback: `Open with what the brief can hold: ${c.established}.`,
      },
      {
        label: 'Names causation as unestablished',
        phrasings: ['not cause', 'not causal', 'association', 'not attribute', 'not responsible', 'observational'],
        polarity: 'any',
        feedback: 'Say that nothing here was assigned, so the findings are associations and no finding names a cause.',
      },
      {
        label: 'States the scope: these units and no wider',
        phrasings: ['only', 'beyond', 'generaliz', 'scope', 'limited', 'wider', 'other'],
        polarity: 'any',
        feedback: `Say how far it reaches: ${c.units}, because that is the group every table was built from.`,
      },
      contextGroup('Names a condition or design weakness that a reviewer will press', [c.narrow], {
        minMatches: 2,
        feedback: `Concede the soft row before it is extracted: ${c.narrow}.`,
      }),
      contextGroup('Names what the case cannot reach', [c.unestablished], {
        minMatches: 2,
        feedback: `Say the sentence the brief exists to stop somebody else writing: it does not establish ${c.unestablished}.`,
      }),
      contextGroup('Names the subject of the case', [c.units], { minMatches: 1, feedback: `Say whose departures, hulls or losses these findings are about: ${c.units}.` }),
    ]

    const exemplar = `Across ${fmtInt(k)} findings the brief gives convincing evidence that ${c.established}, for ${c.units}. Every finding is observational: nothing was assigned, so these are associations and no finding establishes a cause. The scope is ${c.units} only, since that is the group every table was built from, and nothing here generalises beyond it. One row is narrower than the rest — ${c.narrow} — and it is stated here rather than left to be found. What the case does not establish is ${c.unestablished}.`

    const answer: InterpretationAnswer = {
      type: 'interpretation',
      required,
      forbidden: [PROVES],
      exemplar,
      minWords: 40,
    }

    return {
      prompt: `A brief going to a panel assembles **${fmtInt(k)} findings** about ${c.units}, produced by ${c.subject}'s own records. Each finding has its procedure named, its conditions shown and its conclusion stated in context. Nothing in the file was assigned: every table was built from records that already existed.\n\nThe last page of the brief is one paragraph, and it is the page the panel's counsel reads first.\n\n**Write it.** State what the findings establish, what they do not, and the limits a reviewer is entitled to press.`,
      answer,
      hints: [
        'Four sentences, in this order: what the evidence supports; why no finding reaches a cause; who the findings are about; and the one row you would rather concede than have extracted.',
        'Then the sentence the paragraph exists for. Name the thing the file cannot reach, in plain words, so that nobody else has to.',
        `Here the limits are: nothing assigned, so association only; the scope is ${c.units}; ${c.narrow}; and the case does not establish ${c.unestablished}.`,
      ],
      solution: `**${exemplar}**\n\nFive things have to be in that paragraph, and four of them are concessions.\n\n1. **What it supports.** Say it plainly and once. A brief that opens by hedging is read as having nothing.\n2. **No cause.** Nothing was assigned, so every finding is an association. This is a property of the design and no sample size repairs it.\n3. **Scope.** The findings describe ${c.units}. They generalise to a wider population only if that population was sampled, and it was not.\n4. **The narrow row.** ${c.narrow.charAt(0).toUpperCase() + c.narrow.slice(1)}. Conceding it costs a sentence; having it extracted costs the brief.\n5. **What it cannot reach.** ${c.unestablished.charAt(0).toUpperCase() + c.unestablished.slice(1)} is not in the data, and no number of findings adds up to it.\n\nAnd one thing that must **not** be there: a single probability for the case. ${fmtInt(k)} P-values computed on overlapping records are not one P-value, and multiplying them is neither licensed nor meaningful. A body of evidence is judged finding by finding — procedure, conditions, conclusion, limit — and then on whether one innocent account explains all of them at once.`,
      misconception: 'Writing the limitations page as an apology, or leaving it out because the findings are strong. The page is what makes the findings usable: a limit the author stated reads as rigour, and the identical limit extracted under questioning reads as concealment.',
    }
  },
})
