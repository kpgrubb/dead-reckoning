/**
 * act-0-03 · Tasking — drills and checkpoint items on the Register (DS-01). AP 1.1, 1.3: frequency and
 * relative-frequency tables; what population a table describes; count vs proportion; the denominator.
 *
 *   act-0/relative-frequency-filtered  numeric         relative frequency from a filtered frequency table
 *   act-0/count-vs-proportion          choice          the Board's "1.4 %": count or proportion, and its denominator
 *   act-0/population-described         choice          which population a filtered table describes
 *   act-0/denominator-filter           choice          which filter sets the denominator for a question
 *   act-0/percent-to-count             numeric         "p % of N records — how many is that"
 *   act-0/read-the-run                 display/choice  (checkpoint) read centre and spread off a dotplot
 *   act-0/register-population          interpretation  (checkpoint) say what the Register describes, and what it does not
 *
 * Every table is computed at runtime from the seeded Register; nothing is typed in.
 */
import { defineGenerator, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import { contextGroup } from '@/lib/problems/rubric'
import type { InterpretationAnswer, RubricGroup } from '@/lib/problems/types'
import { max, mean, range } from '@/lib/stats'
import { fmt, round } from '@/lib/stats/format'
import { drawFixErrors, filterRegister, register, registerFrequency, SEVERITY_ORDER, type RegisterFilter, type Severity } from '@/instruments/act-0/data'

const YEARS = [2178, 2179, 2180, 2181, 2182, 2183] as const

interface Slice {
  filter: RegisterFilter
  /** "the Uruk office's records" */
  name: string
  /** the population the slice describes, in one sentence */
  population: string
}

const SLICES: Slice[] = [
  { filter: {}, name: 'all 2,200 records', population: 'every incident the Lane Authority recorded on the Lane 2178–84, of every severity' },
  { filter: { office: 'Uruk' }, name: "the Uruk office's records", population: 'incidents recorded and classified by the Authority\'s Uruk office, 2178–84, of every severity' },
  { filter: { office: 'Ceres' }, name: "the Ceres office's records", population: 'incidents recorded and classified by the Authority\'s Ceres office, 2178–84, of every severity' },
  { filter: { owner_class: 'Perrine' }, name: 'the records for Perrine-owned hulls', population: 'incidents the Authority recorded for Perrine-owned (Sulcus Freight) hulls, 2178–84' },
  { filter: { owner_class: 'Mercantile' }, name: 'the records for Mercantile hulls', population: 'incidents the Authority recorded for Mercantile-house hulls, 2178–84' },
  { filter: { severity: 'loss' }, name: 'the loss records', population: 'the 31 hulls the Authority recorded as lost on the Lane, 2178–84' },
  ...YEARS.map((y) => ({ filter: { year: y }, name: `the records dated ${y}`, population: `every incident the Authority recorded on the Lane in ${y}, of every severity` })),
]

const SEVERITY_WORD: Record<Severity, string> = { loss: 'losses', advisory: 'advisories', dropout: 'transponder dropouts', other: 'other records (medical diversions)' }

// ---------------------------------------------------------------------------------------------
// 1. Numeric — relative frequency from a filtered table
// ---------------------------------------------------------------------------------------------

export const relativeFrequencyFiltered = defineGenerator({
  id: 'act-0/relative-frequency-filtered',
  label: 'Relative frequency from a filtered table',
  ap_topics: ['1.3'],
  skills: ['2'],
  generate(rng) {
    const { slice, rows, pick } = retry(
      rng,
      (r) => {
        const slice = pickContext(r, SLICES.filter((s) => s.filter.severity === undefined))
        const recs = filterRegister(register, slice.filter)
        const rows = registerFrequency(recs, 'severity', SEVERITY_ORDER)
        const nonEmpty = rows.filter((x) => x.count > 0)
        const pick = r.choice(nonEmpty)
        return { slice, rows, pick, n: recs.length }
      },
      ({ rows, pick, n }) => n >= 20 && pick.count >= 1 && pick.count < n && rows.length === 4,
    )
    const n = rows.reduce((s, x) => s + x.count, 0)
    const value = pick.count / n
    const tableRows = [...rows.map((x) => [x.value, x.count]), ['Total', n]]
    return {
      prompt: `Ebele filters the Register to **${slice.name}** and tabulates severity. What is the relative frequency of **${SEVERITY_WORD[pick.value as Severity]}** in this view? Give a proportion to three decimal places.`,
      data: tableSpec(['Severity', 'Count'], tableRows),
      answer: numericAnswer(value, 'proportion'),
      hints: ['Relative frequency = count in the category ÷ total count in the table (the denominator is the filtered total, not 2,200).', `${pick.count} ÷ ${n}.`],
      solution: `${tableMd(['Severity', 'Count'], tableRows)}\n\n$$\\frac{${pick.count}}{${n}} = ${fmt(value, 4)}$$\n\nThe relative frequency of ${SEVERITY_WORD[pick.value as Severity]} among ${slice.name} is **${fmt(value, 3)}**.`,
      misconception: `Dividing by all 2,200 records gives ${fmt(pick.count / register.length, 3)} — the share of the whole Register, not of this view. The filter set the denominator at ${n}.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — count vs proportion
// ---------------------------------------------------------------------------------------------

export const countVsProportion = defineGenerator({
  id: 'act-0/count-vs-proportion',
  label: 'Count or proportion',
  ap_topics: ['1.3'],
  skills: ['1'],
  generate(rng) {
    const { slice, n, k } = retry(
      rng,
      (r) => {
        const slice = pickContext(r, SLICES.filter((s) => s.filter.severity === undefined))
        const recs = filterRegister(register, slice.filter)
        const k = recs.filter((x) => x.severity === 'loss').length
        return { slice, n: recs.length, k }
      },
      ({ n, k }) => n >= 20 && k >= 1,
    )
    const pct = round((100 * k) / n, 1)
    const cands = [
      { text: `A proportion — its denominator is the ${n.toLocaleString('en-US')} records in this view`, correct: true, why: null },
      { text: `A count — there are ${fmt(pct, 1)} losses`, correct: false, why: 'A percentage is a proportion times 100, not a count of records.' },
      { text: `A proportion — its denominator is the ${k} losses`, correct: false, why: 'The losses are the numerator. The denominator is everything the percentage was taken over.' },
      { text: `A count of records per year`, correct: false, why: 'Nothing here is per year; the figure is a share of the records in view.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `A summary line reads: *“${fmt(pct, 1)} % of ${slice.name} are losses.”* Is that figure a **count** or a **proportion**, and what is its denominator?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => c.why) },
      hints: ['A count is a number of records; a proportion is a count divided by a total.', 'The denominator is the total the percentage was taken over — everything in the view, not just the losses.'],
      solution: `**${shuffled[correct].text}.** The count behind it is ${k} losses out of ${n.toLocaleString('en-US')} records: $${k}/${n} = ${fmt(k / n, 4)}$, i.e. ${fmt(pct, 1)} %.`,
      misconception: `Reading a percentage as a count (“${fmt(pct, 1)} losses”) or a count as a share confuses two different questions; always name the denominator.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which population a table describes
// ---------------------------------------------------------------------------------------------

const WRONG_POPULATIONS = [
  'every hull that flew the Lane, 2178–84',
  'every transit the Lane carried, 2178–84, whether or not anything was recorded',
  'the Compact\'s whole merchant fleet',
  'every incident on every deep-space corridor',
]

export const populationDescribed = defineGenerator({
  id: 'act-0/population-described',
  label: 'The population a table describes',
  ap_topics: ['1.1', '1.3'],
  skills: ['1'],
  generate(rng) {
    const slice = pickContext(rng, SLICES)
    const recs = filterRegister(register, slice.filter)
    const rows = registerFrequency(recs, 'office', ['Uruk', 'Ceres'])
    const otherSlices = rng.shuffle(SLICES.filter((s) => s !== slice)).slice(0, 1)
    const cands = [
      { text: slice.population, correct: true, why: null },
      ...otherSlices.map((s) => ({ text: s.population, correct: false, why: `That is a different filter (${s.name}); the table was built from ${slice.name}.` })),
      ...rng.shuffle(WRONG_POPULATIONS).slice(0, 2).map((w) => ({ text: w, correct: false, why: 'The Register records incidents, not hulls or transits. A transit that filed nothing has no row.' })),
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `Ebele builds a frequency table of *office* from **${slice.name}**. Which population does the table describe?`,
      data: tableSpec(['Office', 'Count'], [...rows.map((x) => [x.value, x.count]), ['Total', recs.length]]),
      answer: { type: 'choice', options: shuffled.map((c) => c.text.charAt(0).toUpperCase() + c.text.slice(1)), correct, feedback: shuffled.map((c) => c.why) },
      hints: ['A table describes exactly the individuals whose rows went into it — after every filter.', 'The Register is a record of incidents as reported to and classified by the Authority; hulls that reported nothing are not in it.'],
      solution: `The table's rows are ${slice.name}, so it describes **${slice.population}** — ${recs.length.toLocaleString('en-US')} recorded incidents. It does not describe the Lane's hulls or transits: a transit that filed nothing has no row.`,
      misconception: '“The Register is the population” is the classic slip. It is a recorded sample of a reporting process: two offices, each deciding what to log and how to classify it.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which filter sets the denominator
// ---------------------------------------------------------------------------------------------

interface DenomQuestion {
  question: string
  filter: RegisterFilter
  numerator: (x: (typeof register)[number]) => boolean
  correctText: string
  wrong: string[]
}

const DENOM_QUESTIONS: DenomQuestion[] = [
  { question: "What share of the Uruk office's records are losses?", filter: { office: 'Uruk' }, numerator: (x) => x.severity === 'loss', correctText: 'office = Uruk (every severity)', wrong: ['severity = loss (both offices)', 'office = Uruk and severity = loss', 'no filter — all 2,200 records'] },
  { question: 'What share of the losses were classified at Uruk?', filter: { severity: 'loss' }, numerator: (x) => x.office === 'Uruk', correctText: 'severity = loss (both offices)', wrong: ['office = Uruk (every severity)', 'office = Uruk and severity = loss', 'no filter — all 2,200 records'] },
  { question: 'What share of the records for Perrine-owned hulls are transponder dropouts?', filter: { owner_class: 'Perrine' }, numerator: (x) => x.severity === 'dropout', correctText: 'owner class = Perrine (every severity)', wrong: ['severity = dropout (every owner)', 'owner class = Perrine and severity = dropout', 'no filter — all 2,200 records'] },
  { question: 'What share of all Register records are losses?', filter: {}, numerator: (x) => x.severity === 'loss', correctText: 'no filter — all 2,200 records', wrong: ['severity = loss', 'office = Uruk (every severity)', 'owner class = Perrine (every severity)'] },
  { question: 'What share of the records dated 2182 are losses?', filter: { year: 2182 }, numerator: (x) => x.severity === 'loss', correctText: 'year = 2182 (every severity)', wrong: ['severity = loss (every year)', 'year = 2182 and severity = loss', 'no filter — all 2,200 records'] },
  { question: "What share of the Ceres office's records concern Mercantile hulls?", filter: { office: 'Ceres' }, numerator: (x) => x.owner_class === 'Mercantile', correctText: 'office = Ceres (every owner)', wrong: ['owner class = Mercantile (both offices)', 'office = Ceres and owner class = Mercantile', 'no filter — all 2,200 records'] },
]

export const denominatorFilter = defineGenerator({
  id: 'act-0/denominator-filter',
  label: 'Which filter sets the denominator',
  ap_topics: ['1.3'],
  skills: ['1'],
  generate(rng) {
    const q = pickContext(rng, DENOM_QUESTIONS)
    const denom = filterRegister(register, q.filter)
    const num = denom.filter(q.numerator).length
    const cands = [{ text: q.correctText, correct: true }, ...q.wrong.map((w) => ({ text: w, correct: false }))]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `Ferrier asks: *“${q.question}”* In the Register browser, which filter fixes the **denominator** of that share?`,
      answer: {
        type: 'choice',
        options: shuffled.map((c) => c.text),
        correct,
        feedback: shuffled.map((c) => (c.correct ? null : c.text.includes(' and ') ? 'That filter isolates the numerator. Applying it leaves nothing to divide by.' : c.text.startsWith('no filter') ? 'The question names a group; the denominator is that group, not the whole Register.' : 'That is the numerator’s condition (or an unrelated group), not the group the share is taken over.')),
      },
      hints: ['“Share of X that are Y” means: denominator = X, numerator = the part of X that is also Y.', 'Filter to the group named after “share of”, then count how many in it satisfy the rest.'],
      solution: `The share is taken over the group named after “share of”, so the denominator filter is **${q.correctText}**: ${denom.length.toLocaleString('en-US')} records, of which ${num} satisfy the rest of the question — $${num}/${denom.length} = ${fmt(num / denom.length, 3)}$.`,
      misconception: 'Filtering to both conditions at once isolates the numerator and destroys the denominator; the share becomes 1.000 and means nothing.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Numeric — percent to count
// ---------------------------------------------------------------------------------------------

export const percentToCount = defineGenerator({
  id: 'act-0/percent-to-count',
  label: 'From a percentage to a count',
  ap_topics: ['1.3'],
  skills: ['2'],
  generate(rng) {
    const { slice, n, k, pct } = retry(
      rng,
      (r) => {
        const slice = pickContext(r, SLICES.filter((s) => s.filter.severity === undefined))
        const recs = filterRegister(register, slice.filter)
        const sev = r.choice(['loss', 'dropout', 'other'] as const)
        const k = recs.filter((x) => x.severity === sev).length
        const pct = round((100 * k) / recs.length, 1)
        return { slice, n: recs.length, k, pct, sev }
      },
      ({ n, k, pct }) => n >= 50 && k >= 1 && Math.round((n * pct) / 100) === k,
    )
    return {
      prompt: `The Board's summary page says **${fmt(pct, 1)} %** of ${slice.name} (${n.toLocaleString('en-US')} records) are of one kind. How many records is that? Give a whole number.`,
      answer: numericAnswer(k, 'count'),
      hints: ['A percentage of N records is N × (percentage ÷ 100), rounded to a whole record.', `${n} × ${fmt(pct / 100, 3)}.`],
      solution: `$$${n.toLocaleString('en-US')} \\times \\frac{${fmt(pct, 1)}}{100} = ${fmt((n * pct) / 100, 1)} \\approx ${k}$$\n\nThat is **${k} records**. A page that quotes ${fmt(pct, 1)} % without the ${n.toLocaleString('en-US')} has hidden how few that is.`,
      misconception: `A percentage is not a count. The same ${fmt(pct, 1)} % is ${k} records of ${n.toLocaleString('en-US')} and a tenth of that in a view a tenth the size; the denominator decides.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Display — read centre and spread off a dotplot (checkpoint DISP item; reviews act-0-01)
// ---------------------------------------------------------------------------------------------

export const readTheRun = defineGenerator({
  id: 'act-0/read-the-run',
  label: 'Read a fix run off the dotplot',
  ap_topics: ['1.1'],
  skills: ['2'],
  generate(rng) {
    const fixes = retry(
      rng,
      (r) => drawFixErrors(r, 6),
      (f) => new Set(f).size === 6 && Math.abs(mean(f)) >= 20 && range(f) >= 150 && Math.abs(Math.round(mean(f)) - Math.round(range(f))) > 30 && Math.abs(Math.round(mean(f)) - Math.round(max(f))) > 30 && Math.round(range(f)) !== Math.round(max(f)),
    )
    const m = mean(fixes)
    const rg = range(fixes)
    const hi = max(fixes)
    const cands = [
      { text: `Centre near ${fmt(m, 0)} km; the six fixes spread over about ${fmt(rg, 0)} km`, correct: true, why: null },
      { text: `Centre at ${fmt(hi, 0)} km — the largest fix`, correct: false, why: 'The largest fix is one observation, not the centre of six.' },
      { text: `Centre at 0 km with no spread — dead reckoning is exact`, correct: false, why: 'The dots do not sit on one point. Variation is the normal condition of measurement.' },
      { text: `Centre at ${fmt(rg, 0)} km — the range`, correct: false, why: 'The range is a spread (largest minus smallest), not a location.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `The dotplot shows six dead-reckoning fixes from one cold hour (along-track error, km; beacon truth at 0). Which statement reads the run correctly?`,
      answer: {
        type: 'display',
        display: { kind: 'dotplot', values: fixes, label: 'along-track fix error (km)' },
        question: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => c.why) },
      },
      hints: ['Centre: where the pile of dots sits. Spread: how far the outermost dots are apart.', 'The mean is the balance point of the six dots; the range is the distance between the two extremes.'],
      solution: `The six fixes are ${fixes.map((v) => fmt(v, 0)).join(', ')} km: mean ${fmt(m, 1)} km, range ${fmt(rg, 0)} km. **${shuffled[correct].text}.**`,
      misconception: 'Reading the largest dot, or the width of the plot, as “the position” confuses one observation or the spread with the centre.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 7. Interpretation — what the Register describes (checkpoint INT item; reviews act-0-03)
// ---------------------------------------------------------------------------------------------

function registerPopulationRubric(slice: Slice): InterpretationAnswer {
  const required: RubricGroup[] = [
    { label: 'Says what each row is (an incident / a record)', phrasings: ['incident', 'record'], polarity: 'any', feedback: 'Each row of the Register is one recorded incident, not a hull or a transit.' },
    { label: 'Names who recorded and classified it (the Lane Authority / its offices)', phrasings: ['authority', 'office', 'classified', 'classify', 'reported', 'logged'], polarity: 'any', feedback: 'The Register is compiled and classified by the Lane Authority’s two offices; say so.' },
    { label: 'Says what it does not describe (every hull / transit / the Lane itself)', phrasings: ['not every', 'not all', 'not hull', 'not transit', 'not the lane', 'not lane', 'only incident', 'only record', 'not population'], polarity: 'any', feedback: 'Name what the table cannot speak for: hulls and transits that filed nothing have no row.' },
    contextGroup('Names the view (which records)', [slice.name], { minMatches: 1, optional: true }),
  ]
  const exemplar = `Each row is one incident logged and classified by the Lane Authority's two offices, so ${slice.name} describe recorded Lane incidents as reported to the Authority — not every hull or transit on the Lane, and not the Lane itself.`
  return {
    type: 'interpretation',
    required,
    forbidden: [{ phrase: 'register is the population', label: 'Treats the Register as the population', why: 'The Register is a recorded sample of a reporting process, not the Lane.' }],
    exemplar,
    minWords: 12,
  }
}

export const registerPopulation = defineGenerator({
  id: 'act-0/register-population',
  label: 'What the Register describes',
  ap_topics: ['1.1'],
  skills: ['4'],
  generate(rng) {
    const slice = pickContext(rng, SLICES.filter((s) => s.filter.severity === undefined))
    const recs = filterRegister(register, slice.filter)
    const answer = registerPopulationRubric(slice)
    return {
      prompt: `The Board's page says its figures describe *“the Lane.”* Ebele has built a table from **${slice.name}** (${recs.length.toLocaleString('en-US')} rows). In one or two sentences, say what population that table actually describes — what each row is and who recorded it — and one thing it does **not** describe.`,
      answer,
      hints: ['Start from the row: what is one row of the Register?', 'Then the source: who compiled and classified it? Then the limit: who is missing from it?'],
      solution: `${answer.exemplar}\n\nThe common slip is to treat the Register as the Lane. It is a record of what two offices logged and how they classified it.`,
      misconception: 'A recorded incident file describes recorded incidents. Transits that filed nothing — and losses classified elsewhere — are not in it.',
    }
  },
})
