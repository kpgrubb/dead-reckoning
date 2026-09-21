/**
 * act-1-01 · Register of Losses — drills. AP 1.1–1.3: individuals and variables; categorical vs
 * quantitative (a coded number is still a label); frequency and relative-frequency tables for a
 * categorical variable; population vs sample; parameter vs statistic. The Register is a recorded
 * sample of a reporting process, not the corridor.
 *
 *   act-1/population-sample     choice    given a question and the records in hand, name population and sample
 *   act-1/variable-types        choice    classify a Register / telemetry column (four types)
 *   act-1/relative-frequency    numeric   relative frequency of a cause code from a generated office × class table
 *   act-1/board-filter          choice    which records toggle + bin width reproduces the Board's flat histogram
 *   act-1/parameter-statistic   choice    is the quantity a statistic, a parameter, or a variable?
 *
 * The first three stand alone (the Act I checkpoint reuses them): no prompt refers to an instrument.
 * Generated tables come from other corridors and other offices, never from the Register's own
 * office × classification table (whose conditional shares are act-1-01's mission beats).
 */
import { defineGenerator, drawTwoWay, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import { fmt, fmtInt } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared framing — other corridors, other offices (never Uruk / Ceres on the Lane's own losses)
// ---------------------------------------------------------------------------------------------

const CORRIDORS = [
  { name: 'the Mars–Belt corridor', years: '2170–76', offices: ['Deimos', 'Pallas'] as const },
  { name: 'the Saturn feeder run', years: '2177–83', offices: ['Titan', 'Iapetus'] as const },
  { name: 'the Venus–Earth shuttle lane', years: '2179–84', offices: ['Ishtar', 'Luna'] as const },
  { name: 'the Callisto–Ganymede local lane', years: '2175–81', offices: ['Adlinda', 'Osiris'] as const },
] as const

const CLASSES = ['accident', 'piracy', 'unknown'] as const
type Klass = (typeof CLASSES)[number]

/** The Register's own conditional shares (19/23, 3/8) and the loss-wide unknown share (22/31) — never a drill answer. */
const RESERVED = [19 / 23, 3 / 8, 22 / 31]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.002)
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — population and sample
// ---------------------------------------------------------------------------------------------

type PsScenario = {
  situation: (n: number) => string
  question: string
  population: string
  sample: (n: number) => string
  /** A subset of the sample that a learner might mistake for "the sample". */
  subset: string
}

const PS_SCENARIOS: PsScenario[] = [
  {
    situation: (n) => `Two classifying offices on ${'{corridor}'} filed ${n} loss records between ${'{years}'}. Ebele has the file.`,
    question: 'What fraction of freighter losses on the corridor in those years were piracy?',
    population: 'every freighter loss on the corridor in those years, whether or not an office filed it',
    sample: (n) => `the ${n} loss records the two offices filed`,
    subset: 'the records coded piracy',
  },
  {
    situation: (n) => `Over one watch the Eyes log ${n} drive plumes on ${'{corridor}'}, each with its ratio to the class-table expectation.`,
    question: 'What is the mean plume ratio of the hulls working the corridor this season?',
    population: 'every hull under thrust on the corridor this season',
    sample: (n) => `the ${n} plumes the Eyes logged during the watch`,
    subset: 'the plumes that ran hot',
  },
  {
    situation: (n) => `Sandoval logs the sink temperature every hour for ${n} hours of a single Watch-profile run.`,
    question: 'What is the long-run mean sink load of the ship on the Watch profile?',
    population: 'every Watch-profile hour the ship could ever fly',
    sample: (n) => `the ${n} hourly readings from this run`,
    subset: 'the readings above the amber line',
  },
  {
    situation: (n) => `The 2176 escort report on *Asgard* logged ${fmtInt(n)} transits on ${'{corridor}'} over one season, noting each late check-in.`,
    question: 'What proportion of transits on the corridor arrive late at a relay mark?',
    population: 'every transit the corridor carries',
    sample: (n) => `the ${fmtInt(n)} transits the escort logged that season`,
    subset: 'the transits that checked in late',
  },
]

export const populationSample = defineGenerator({
  id: 'act-1/population-sample',
  label: 'Population and sample',
  ap_topics: ['1.1', '1.3'],
  skills: ['1'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, PS_SCENARIOS)
    const n = s.question.includes('transits') ? rng.int(1800, 3400) : s.question.includes('sink') ? rng.int(12, 40) : rng.int(18, 60)
    const situation = s.situation(n).replace('{corridor}', corr.name).replace('{years}', corr.years)
    const cands = [
      { text: `Population: ${s.population}. Sample: ${s.sample(n)}.`, correct: true, why: null },
      { text: `Population: ${s.sample(n)}. Sample: ${s.population}.`, correct: false, why: 'Reversed. The sample is the set of observations actually in hand; the population is the larger set the question is about.' },
      { text: `Population: ${s.sample(n)}. Sample: ${s.subset}.`, correct: false, why: 'This treats the records in hand as the whole population. The question asks about a larger set than anyone filed; the file is the sample of it.' },
      { text: `Population: ${s.population}. Sample: ${s.subset}.`, correct: false, why: 'The sample is everything that was observed, not only the rows the question is interested in. Dropping the rest changes the denominator.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `${situation}\n\nThe question on the table: *${s.question}*\n\nWhich statement correctly names the **population** and the **sample**?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => c.why) },
      hints: ['The population is the whole set the question is about; the sample is the set of individuals actually observed.', `Ask what the question wants to describe (${s.population}) and what the crew actually holds (${s.sample(n)}).`],
      solution: `The question is about **${s.population}** — that is the population. What the crew holds is **${s.sample(n)}** — that is the sample. The subset (${s.subset}) is neither: it is part of the sample, selected on the very thing the question asks about.`,
      misconception: 'A file is not the population because it is the only data anyone has. It is a recorded sample of a process — the individuals someone chose, or managed, to write down.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — variable types
// ---------------------------------------------------------------------------------------------

type VarType = 'categorical' | 'discrete' | 'continuous' | 'identifier'

const TYPE_OPTIONS: { key: VarType; text: string }[] = [
  { key: 'categorical', text: 'Categorical — a label that places the individual in a group' },
  { key: 'discrete', text: 'Quantitative, discrete — a count; only certain values are possible' },
  { key: 'continuous', text: 'Quantitative, continuous — a measurement; any value on a scale' },
  { key: 'identifier', text: 'Identifier — names the individual; not a variable to summarize' },
]

const VARIABLES: { name: string; type: VarType; note: string }[] = [
  { name: '`classification` — accident, piracy or unknown', type: 'categorical', note: 'A code assigned by an office. Order and arithmetic mean nothing: "piracy" is not more or less than "accident".' },
  { name: '`office` code on the record — 01 for the outbound office, 02 for the inbound office', type: 'categorical', note: 'A number used as a label. Averaging office codes to 1.4 says nothing; the digits could be swapped without loss.' },
  { name: '`severity` code — 1 advisory, 2 dropout, 3 loss', type: 'categorical', note: 'Coded with digits, but a loss is not "three times" an advisory. The numbers are names.' },
  { name: '`mark_last` — fractional Lane mark at last contact, e.g. 9.35', type: 'continuous', note: 'A position along the Lane. Mark 9.35 is a real place; any value between 1 and 12 is possible.' },
  { name: '`time_to_silence` — hours from first degradation to loss of signal', type: 'continuous', note: 'Elapsed time on a continuum; 0.009 h and 5.61 h are both possible.' },
  { name: '`hull_age` — years since commissioning, e.g. 13.6', type: 'continuous', note: 'Elapsed time; any value on a scale.' },
  { name: '`declared_cargo_value` — M₵ on the manifest', type: 'continuous', note: 'Money on a continuous scale.' },
  { name: 'plume power of a contact, in terawatts', type: 'continuous', note: 'A measurement the Eyes take to a few percent; any value is possible.' },
  { name: 'drive pulse rate of a contact, in hertz', type: 'continuous', note: 'A measured frequency, 61.3 Hz as easily as 61.0.' },
  { name: 'number of transponder dropouts a hull logged in a year', type: 'discrete', note: 'A count: 0, 1, 2 … A hull cannot log 1.5 dropouts.' },
  { name: 'crew aboard at departure', type: 'discrete', note: 'A count of people. Whole numbers only.' },
  { name: 'number of cutter sorties flown in a search', type: 'discrete', note: 'A count of sorties; whole numbers only.' },
  { name: '`record_id` — LA-0417', type: 'identifier', note: 'A label for the row. Summarizing it (a mean record id) is meaningless; it exists so the individual can be found again.' },
  { name: '`hull` — the ship\'s name', type: 'identifier', note: 'Names the individual. Counting records per hull would produce a variable; the name itself is not one.' },
  { name: '`hull_class` — Sulcus-Mk3, Tessera-C or other', type: 'categorical', note: 'Three design families; a label.' },
  { name: '`owner_class` — Perrine, Mercantile or independent', type: 'categorical', note: 'Which kind of owner. A label.' },
  { name: '`cargo_category` — He-3/D, volatiles, metals, or manufactured and other', type: 'categorical', note: 'Four cargo classes; a label.' },
]

const VT_FRAMES = [
  'Ebele is typing the Register\'s columns for the intel terminal before he draws anything.',
  'Ferrier wants every column classified before the first chart goes up.',
  'Oyelaran is building the contact log\'s schema and asks how to store one field.',
  'The Lane Authority\'s data dictionary is missing an entry; Ebele fills it in.',
] as const

export const variableTypes = defineGenerator({
  id: 'act-1/variable-types',
  label: 'Classify the variable',
  ap_topics: ['1.2'],
  skills: ['1'],
  generate(rng) {
    const frame = pickContext(rng, VT_FRAMES)
    const v = pickContext(rng, VARIABLES)
    const correct = TYPE_OPTIONS.findIndex((o) => o.key === v.type)
    const feedback = TYPE_OPTIONS.map((o) => {
      if (o.key === v.type) return null
      if (o.key === 'categorical') return v.type === 'identifier' ? 'A category groups individuals; this field is unique to each individual and groups nothing.' : 'This field is a number with a scale — differences between its values mean something.'
      if (o.key === 'discrete') return v.type === 'continuous' ? 'A count takes only certain values (0, 1, 2 …). This field can take any value on a scale.' : v.type === 'categorical' ? 'Even when it is written with digits, this field is a label: arithmetic on it means nothing.' : 'It is not a count of anything; it names the individual.'
      if (o.key === 'continuous') return v.type === 'discrete' ? 'This field is a count — whole numbers only, no value between them.' : v.type === 'categorical' ? 'Written with digits or not, this field is a code. Nothing sits "between" its values.' : 'It is not a measurement; it names the individual.'
      return 'This field is a variable — its value tells you something about the individual, and summarizing it makes sense.'
    })
    return {
      prompt: `${frame}\n\nThe field: **${v.name}**.\n\nHow should it be classified?`,
      answer: { type: 'choice', options: TYPE_OPTIONS.map((o) => o.text), correct, feedback },
      hints: ['Ask two questions: does the value place the individual in a group, or measure something about it? If it measures, is it a count or a scale?', 'A number used as a code (office 01, severity 3) is still a label — arithmetic on it means nothing.'],
      solution: `**${TYPE_OPTIONS[correct].text.split(' — ')[0]}.** ${v.note}`,
      misconception: 'Digits do not make a variable quantitative. A severity code of 3 is a name; a mark of 9.35 is a place.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — relative frequency from an office × classification table
// ---------------------------------------------------------------------------------------------

type RfAsk = { kind: 'overall'; klass: Klass } | { kind: 'conditional'; office: 0 | 1; klass: Klass } | { kind: 'office'; office: 0 | 1 }

export const relativeFrequency = defineGenerator({
  id: 'act-1/relative-frequency',
  label: 'Relative frequency from a table',
  ap_topics: ['1.3'],
  skills: ['2'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const offices = [`${corr.offices[0]} office`, `${corr.offices[1]} office`]
    const u = rng.float()
    const ask: RfAsk = u < 0.4 ? { kind: 'overall', klass: rng.choice(CLASSES) } : u < 0.8 ? { kind: 'conditional', office: rng.bool() ? 0 : 1, klass: rng.choice(CLASSES) } : { kind: 'office', office: rng.bool() ? 0 : 1 }
    const t = retry(
      rng,
      (r) => drawTwoWay(r, { rows: [...offices], cols: [...CLASSES], n: r.int(24, 64), association: r.uniform(0.3, 0.8), minCell: 1 }),
      (tw) => {
        const j = ask.kind === 'office' ? -1 : CLASSES.indexOf(ask.klass)
        const p = ask.kind === 'overall' ? tw.colTotals[j] / tw.total : ask.kind === 'conditional' ? tw.counts[ask.office][j] / tw.rowTotals[ask.office] : tw.rowTotals[ask.office] / tw.total
        return tw.rowTotals.every((rt) => rt >= 6) && !reserved(p) && p > 0.05 && p < 0.95
      },
    )
    const j = ask.kind === 'office' ? -1 : CLASSES.indexOf(ask.klass)
    const count = ask.kind === 'overall' ? t.colTotals[j] : ask.kind === 'conditional' ? t.counts[ask.office][j] : t.rowTotals[ask.office]
    const denom = ask.kind === 'conditional' ? t.rowTotals[ask.office] : t.total
    const p = count / denom
    const rows: (string | number)[][] = [
      ...offices.map((o, i) => [o, ...t.counts[i], t.rowTotals[i]]),
      ['Total', ...t.colTotals, t.total],
    ]
    const table = tableMd(['office', ...CLASSES, 'total'], rows)
    const what =
      ask.kind === 'overall'
        ? `the relative frequency of **${ask.klass}** among all ${t.total} losses`
        : ask.kind === 'conditional'
          ? `the relative frequency of **${ask.klass}** among the losses the **${offices[ask.office]}** classified`
          : `the relative frequency of losses classified by the **${offices[ask.office]}** among all ${t.total}`
    const denomText = ask.kind === 'conditional' ? `the ${offices[ask.office]}'s row total, ${denom}` : `the grand total, ${denom}`
    return {
      prompt: `Loss records on ${corr.name}, ${corr.years}, by classifying office and cause code:\n\n${table}\n\nReport ${what}, as a proportion to three decimal places.`,
      data: tableSpec(['office', ...CLASSES, 'total'], rows),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        ask.kind === 'conditional' ? 'A share "among the losses one office classified" uses that office\'s row total as the denominator, not the grand total.' : 'A relative frequency is a count divided by the total number of individuals in the table it describes.',
        `Count: ${count}. Denominator: ${denomText}.`,
        `$${count} / ${denom}$, to three decimals.`,
      ],
      solution: `$$\\text{relative frequency} = \\frac{${count}}{${denom}} = ${fmt(p, 4)}$$\n\nThe relative frequency is **${fmt(p, 3)}**. The denominator is ${denomText}: ${ask.kind === 'conditional' ? `the question is about one office's losses, so only that office's ${denom} records count` : `the question is about all ${denom} losses in the table`}.`,
      misconception: ask.kind === 'conditional' ? `Dividing by the grand total (${t.total}) gives the share of *all* losses that are ${ask.klass} and ${offices[ask.office]}-classified — a different question.` : 'A relative frequency is not a count. Twenty-two records is a frequency; twenty-two out of thirty-one is a relative frequency, and only the second can be compared across tables of different size.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which records toggle and bin width reproduce the Board's histogram
// ---------------------------------------------------------------------------------------------

type FilterOption = { records: 'all' | 'losses'; width: 3 | 1 | 0.5 }

function filterText(o: FilterOption): string {
  const bars = o.width === 3 ? 'four bars' : o.width === 1 ? 'eleven bars' : 'twenty-two bars'
  return `${o.records === 'all' ? 'All 2,200 records' : 'The 31 losses only'} · bins of width ${o.width === 0.5 ? '0.5' : String(o.width)} mark (${bars})`
}

export const boardFilter = defineGenerator({
  id: 'act-1/board-filter',
  label: 'Reproducing the Board\'s axis',
  ap_topics: ['1.1', '1.2'],
  skills: ['1'],
  generate(rng) {
    const variant = rng.bool() ? 'board' : 'pile'
    const pool: FilterOption[] = [
      { records: 'all', width: 3 },
      { records: 'losses', width: 3 },
      { records: 'all', width: 0.5 },
      { records: 'losses', width: 0.5 },
    ]
    const target: FilterOption = variant === 'board' ? { records: 'all', width: 3 } : { records: 'losses', width: 0.5 }
    const shuffled = rng.shuffle(pool)
    const correct = shuffled.findIndex((o) => o.records === target.records && o.width === target.width)
    const feedback = shuffled.map((o) => {
      if (o.records === target.records && o.width === target.width) return null
      if (variant === 'board') {
        if (o.records === 'losses') return 'The Board\'s page has 2,200 records under it. Thirty-one losses cannot make a flat histogram from Mark 1 to Mark 12 — they pile up late in the Lane.'
        return 'The records are right, but the Board\'s page shows four bars: bins of width 3. Twenty-two bars is a different display.'
      }
      if (o.records === 'all') return 'Two thousand two hundred records of every severity spread evenly along the Lane. The losses are 1.4% of them and vanish inside the flat shape.'
      return 'Right records, wrong bins. A bin three marks wide straddles the Mark 9–10 pile across two bars; the pile is only visible with narrow bins.'
    })
    const prompt =
      variant === 'board'
        ? 'The Board\'s summary page shows a histogram of *mark* with **four bars**, flat from Mark 1 to Mark 12, captioned "spread along the Lane". Ebele has the Register open with a records toggle (all 2,200 records / the 31 losses only) and a bin-width setting.\n\nWhich pair of settings reproduces the Board\'s page?'
        : 'Ebele is looking for where the losses actually sit along the Lane. He has the Register open with a records toggle (all 2,200 records / the 31 losses only) and a bin-width setting.\n\nWhich pair of settings shows the losses\' pile at Mark 9–10 most clearly?'
    return {
      prompt,
      answer: { type: 'choice', options: shuffled.map(filterText), correct, feedback },
      hints: [
        variant === 'board' ? 'Two choices hide a shape: which individuals are on the axis, and how wide the bins are. The Board made both.' : 'Two choices reveal a shape: which individuals are on the axis, and how wide the bins are.',
        variant === 'board' ? 'Four bars across Marks 1–12 means bins three marks wide. A flat shape needs the records that are spread evenly — all of them.' : 'Thirty-one individuals cannot be seen among 2,200. Once they are alone on the axis, narrow bins separate Mark 9 from Mark 11.',
      ],
      solution:
        variant === 'board'
          ? `**${filterText(target)}.** The Board's histogram is honest about what it plots: every incident record of every severity, binned in threes. Advisories and dropouts occur everywhere along the Lane, so the shape is flat. The 31 losses are inside it, invisible — the page never lied about the records; it chose which individuals to draw.`
          : `**${filterText(target)}.** Filter to the 31 losses so nothing else is on the axis, then use bins narrow enough to separate Mark 9 from Mark 11. Bins three marks wide split the pile across two bars; all 2,200 records bury it.`,
      misconception: 'A histogram has two hidden decisions before its shape means anything: which individuals are on the axis, and how wide the bins are. Change either and the same data tell a different story.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — parameter, statistic, or a variable
// ---------------------------------------------------------------------------------------------

type PsStatement = { text: (r: { n: number; k: number; p: string; v: string; corridor: string }) => string; kind: 0 | 1 | 2 }

const PARAM_STATEMENTS: PsStatement[] = [
  { text: ({ n, k, p, corridor }) => `Of the ${n} loss records filed on ${corridor}, ${k} are coded unknown — a relative frequency of ${p}.`, kind: 0 },
  { text: ({ n, v }) => `The mean plume ratio of the ${n} contacts the Eyes logged this watch: ${v} percent of expectation.`, kind: 0 },
  { text: ({ n, k, p }) => `${k} of the ${n} hulls in the file are Perrine-owned, a share of ${p}.`, kind: 0 },
  { text: ({ n, v }) => `The median mark at last contact of the ${n} losses in the file: Mark ${v}.`, kind: 0 },
  { text: ({ corridor }) => `The proportion of all losses ${corridor} will ever suffer that are piracy.`, kind: 1 },
  { text: () => `The long-run proportion of Lane transits that end in silence, over every transit the Lane could carry.`, kind: 1 },
  { text: ({ corridor }) => `The true mean plume ratio of every hull that works ${corridor}, logged or not.`, kind: 1 },
  { text: () => `The mean hull age of every freighter that has ever been lost on the Lane, including the ones nobody filed.`, kind: 1 },
  { text: () => `The classification of each loss: accident, piracy or unknown.`, kind: 2 },
  { text: () => `Whether a lost hull was Perrine-owned.`, kind: 2 },
  { text: () => `The fractional mark at which each hull was last heard.`, kind: 2 },
]

export const parameterStatistic = defineGenerator({
  id: 'act-1/parameter-statistic',
  label: 'Parameter, statistic, or variable',
  ap_topics: ['1.1'],
  skills: ['1'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, PARAM_STATEMENTS)
    const n = rng.int(20, 70)
    const k = rng.int(3, Math.max(4, n - 4))
    const p = fmt(k / n, 3)
    const v = s.text.toString().includes('Mark') ? fmt(rng.uniform(4, 11), 2) : fmt(rng.uniform(97, 103), 1)
    const text = s.text({ n, k, p, v, corridor: corr.name })
    const options = [
      'A statistic — a number computed from the individuals actually in hand.',
      'A parameter — a number that describes the whole population or process.',
      'A variable — a characteristic recorded for each individual, not a number.',
    ]
    return {
      prompt: `Ebele's brief contains the line:\n\n> ${text}\n\nWhat kind of thing is this?`,
      answer: {
        type: 'choice',
        options,
        correct: s.kind,
        feedback: [
          s.kind === 0 ? null : s.kind === 1 ? 'This describes every individual the process could ever produce, including ones nobody recorded. A statistic is computed from the sample in hand.' : 'This is not a single number at all. It is something recorded for each individual — a variable.',
          s.kind === 1 ? null : s.kind === 0 ? 'This number was computed from a specific set of records. It estimates a parameter; it is not one.' : 'A parameter is a single number describing a population. This is a characteristic that takes a value for each individual.',
          s.kind === 2 ? null : 'This is a single number, computed or defined for a set of individuals — a summary, not a characteristic of each one.',
        ],
      },
      hints: ['A variable is recorded per individual. A statistic summarizes the individuals in hand. A parameter summarizes the whole population or process.', 'Ask: could the crew compute this from the file? If yes, statistic. If it needs records nobody has, parameter. If it is a column, variable.'],
      solution: s.kind === 0 ? 'It was computed from the records in hand, so it is a **statistic**. The parameter it estimates is the same quantity over every individual the process could produce.' : s.kind === 1 ? 'It describes every individual the process could produce — recorded or not — so it is a **parameter**. Any file\'s version of it is a statistic.' : 'It is recorded for each individual and takes a different value for each, so it is a **variable**, not a summary number.',
      misconception: 'A number is not a parameter because the Board printed it. The Board\'s mean of Mark 6.5 is a statistic of 2,200 records; the parameter is whatever the Lane actually does.',
    }
  },
})
