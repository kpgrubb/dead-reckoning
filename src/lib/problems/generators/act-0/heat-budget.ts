/**
 * act-0-02 · Heat Budget — drills. AP 1.2: individuals and variables; categorical vs quantitative;
 * discrete vs continuous; units. The sink is a quantitative, continuous variable with run-to-run variation.
 *
 *   act-0/classify-telemetry        choice    categorical / quantitative-discrete / quantitative-continuous
 *   act-0/individuals-in-table      choice    the individuals (and the categorical column) in a run table
 *   act-0/design-shortfall          numeric   the design curve promised X h; the run projects Y h; shortfall %
 *   act-0/discrete-or-continuous    choice    discrete vs continuous, with the right units
 */
import { defineGenerator, pickContext, retry, tableSpec, numericAnswer } from '@/lib/problems/generate'
import { fmt, round } from '@/lib/stats/format'
import { COLD_RUN_VARIABLES, PROFILES, PROFILE_ORDER, type ProfileName } from '@/instruments/act-0/data'

const KIND_LABEL = {
  categorical: 'Categorical',
  'quantitative-discrete': 'Quantitative, discrete',
  'quantitative-continuous': 'Quantitative, continuous',
} as const
const KIND_ORDER = ['categorical', 'quantitative-discrete', 'quantitative-continuous'] as const

// ---------------------------------------------------------------------------------------------
// 1. Choice — classify a telemetry variable
// ---------------------------------------------------------------------------------------------

export const classifyTelemetry = defineGenerator({
  id: 'act-0/classify-telemetry',
  label: 'Classify a telemetry variable',
  ap_topics: ['1.2'],
  skills: ['1'],
  generate(rng) {
    const v = pickContext(rng, COLD_RUN_VARIABLES)
    const correct = KIND_ORDER.indexOf(v.kind)
    const options = KIND_ORDER.map((k) => KIND_LABEL[k])
    return {
      prompt: `Ebele's table lists every quantity the ship logs on a cold run. Classify **${v.name}**${v.note ? ` (${v.note})` : ''}${v.units ? `, recorded in ${v.units}` : ''}.`,
      answer: {
        type: 'choice',
        options,
        correct,
        feedback: [
          correct === 0 ? null : `${v.name} takes numerical values that can be averaged meaningfully, so it is quantitative — not a label.`,
          correct === 1 ? null : v.kind === 'categorical' ? `${v.name} names a category. Even when the label is written with digits, arithmetic on it means nothing.` : `${v.name} can take any value in an interval, not only whole counts.`,
          correct === 2 ? null : v.kind === 'categorical' ? `${v.name} names a category; there is nothing to measure on a continuous scale.` : `${v.name} is a count — it moves in whole steps.`,
        ],
      },
      hints: ['Categorical variables place an individual in a group; quantitative variables measure or count something.', 'Among quantitative variables: a count is discrete; a measurement that can take any value in an interval is continuous.'],
      solution: `**${KIND_LABEL[v.kind]}.** ${v.kind === 'categorical' ? `${v.name} places each run in a group${v.note ? ` (${v.note})` : ''}; averaging its values would be meaningless.` : v.kind === 'quantitative-discrete' ? `${v.name} is a count in ${v.units}: it moves in whole steps.` : `${v.name} is measured in ${v.units} and can take any value in an interval.`}`,
      misconception: 'A hull number or a cause code is written with digits but names a category. “Numbers” are not automatically quantitative.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — individuals in a run table
// ---------------------------------------------------------------------------------------------

export const individualsInTable = defineGenerator({
  id: 'act-0/individuals-in-table',
  label: 'Individuals and variables in a run table',
  ap_topics: ['1.2'],
  skills: ['1'],
  generate(rng) {
    const n = rng.int(3, 5)
    const rows: (string | number)[][] = []
    for (let i = 0; i < n; i++) {
      const name = rng.choice(PROFILE_ORDER)
      const p = PROFILES[name]
      const hours = rng.int(6, 60)
      const load = Math.round(rng.normal(p.loadKw, p.loadSdKw))
      const endPct = round(Math.min(100, 4 + (100 * hours * load) / (p.loadKw * p.designMeanH)), 1)
      rows.push([`CR-${i + 1}`, name, hours, load, endPct, rng.bool(0.3) ? 'yes' : 'no'])
    }
    const columns = ['Run', 'Profile', 'Hours cold', 'Mean load (kW)', 'Sink at end (%)', 'Detected']
    const variant = rng.bool() ? 'individuals' : 'categorical'
    if (variant === 'individuals') {
      const options = ['The cold runs — one per row', 'The three cold profiles', 'The hours the ship spent cold', 'The sixteen crew aboard']
      return {
        prompt: `Sandoval's shakedown log, one row per cold run. What are the **individuals** in this table?`,
        data: tableSpec(columns, rows),
        answer: { type: 'choice', options, correct: 0, feedback: [null, 'Profile is a variable recorded for each run, not the thing being described.', 'Hours cold is a variable measured on each run.', 'The crew are aboard, but no row describes a person.'] },
        hints: ['Individuals are the objects described by the data — one per row.', 'Each row of this table is one cold run.'],
        solution: `Each row describes one cold run, so the individuals are **the ${n} cold runs**. Profile, hours, load, sink % and detection are variables recorded on each of them.`,
        misconception: 'A variable that appears in the table (profile, hours) is a property of the individuals, not the individuals themselves.',
      }
    }
    const catCol = rng.bool() ? 'Profile' : 'Detected'
    const cands = [
      { text: catCol, correct: true },
      { text: 'Hours cold', correct: false },
      { text: 'Mean load (kW)', correct: false },
      { text: 'Sink at end (%)', correct: false },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    const options = shuffled.map((c) => c.text)
    return {
      prompt: `Sandoval's shakedown log, one row per cold run. Of the four columns listed below, which is a **categorical** variable?`,
      data: tableSpec(columns, rows),
      answer: {
        type: 'choice',
        options,
        correct,
        feedback: shuffled.map((c) => (c.correct ? null : `${c.text} is quantitative: it measures something about the run, and its mean would mean something.`)),
      },
      hints: ['A categorical variable places each individual in a group; you would tally it, not average it.', 'Only one of the four listed columns is a label rather than a measurement.'],
      solution: `**${catCol}** places each run in a group (${catCol === 'Profile' ? 'Quiet / Watch / Standby' : 'yes / no'}); it is categorical. Hours, load and sink % are quantitative — arithmetic on them means something.`,
      misconception: 'A column is not quantitative because it is in a table of numbers; ask whether its mean would mean anything.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — shortfall against the design curve
// ---------------------------------------------------------------------------------------------

export const designShortfall = defineGenerator({
  id: 'act-0/design-shortfall',
  label: 'Shortfall against the design curve',
  ap_topics: ['1.2'],
  skills: ['2'],
  generate(rng) {
    const name: ProfileName = rng.choice(PROFILE_ORDER)
    const p = PROFILES[name]
    const design = round(p.designMeanH, 1)
    const { measured, shortfall } = retry(
      rng,
      (r) => {
        const measured = round(design * (1 - r.uniform(0.02, 0.09)), 1)
        return { measured, shortfall: (100 * (design - measured)) / design }
      },
      ({ shortfall }) => shortfall >= 1.5 && shortfall <= 9.5,
    )
    const pm = round(p.sdH, 1)
    return {
      prompt: `The design book promises **${fmt(design, 1)} h** on the ${name} profile. A shakedown run at that profile drains the cellar at a rate that projects to **${fmt(measured, 1)} h** before saturation. The Chief logs the shortfall as a percentage of the design figure, with her ± ${fmt(pm, 1)} h. What is the shortfall, to one decimal place (%)?`,
      answer: numericAnswer(shortfall, 'percent', { digits: 1, units: '%' }),
      hints: ['Shortfall = (design − measured) ÷ design, as a percentage of the design figure.', `(${fmt(design, 1)} − ${fmt(measured, 1)}) ÷ ${fmt(design, 1)} × 100.`],
      solution: `$$\\frac{${fmt(design, 1)} - ${fmt(measured, 1)}}{${fmt(design, 1)}} \\times 100 = \\frac{${fmt(design - measured, 1)}}{${fmt(design, 1)}} \\times 100 = ${fmt(shortfall, 2)}\\%$$\n\nThe design curve is optimistic by **${fmt(shortfall, 1)} %** on this run. The Chief's ± ${fmt(pm, 1)} h is the run-to-run spread of endurance at this profile: the next run will not give exactly this number.`,
      misconception: 'Divide by the design figure, not the measured one — the question asks what fraction of the promise was not delivered.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — discrete or continuous, with units
// ---------------------------------------------------------------------------------------------

const QUANTITIES = [
  { name: 'Purges in the run', kind: 'discrete', units: 'purges', wrong: 'hours' },
  { name: 'Hours remaining on the cellar', kind: 'continuous', units: 'hours', wrong: 'purges' },
  { name: 'Sink capacity used', kind: 'continuous', units: 'percent of capacity', wrong: 'runs' },
  { name: 'Crew aboard', kind: 'discrete', units: 'people', wrong: 'kilowatts' },
  { name: 'Fixes logged this hour', kind: 'discrete', units: 'fixes', wrong: 'kilometres' },
  { name: 'Mean load on the cellar', kind: 'continuous', units: 'kilowatts', wrong: 'people' },
  { name: 'Skin temperature', kind: 'continuous', units: 'kelvin', wrong: 'contacts' },
  { name: 'Contacts logged by the Eyes this watch', kind: 'discrete', units: 'contacts', wrong: 'kelvin' },
  { name: 'Propellant remaining', kind: 'continuous', units: 'tonnes', wrong: 'fixes' },
  { name: 'Dead-reckoning fix error', kind: 'continuous', units: 'kilometres', wrong: 'fixes' },
] as const

export const discreteOrContinuous = defineGenerator({
  id: 'act-0/discrete-or-continuous',
  label: 'Discrete or continuous, with units',
  ap_topics: ['1.2'],
  skills: ['1'],
  generate(rng) {
    const q = pickContext(rng, QUANTITIES)
    const other = q.kind === 'discrete' ? 'continuous' : 'discrete'
    const verb = (k: string) => (k === 'discrete' ? 'counted' : 'measured')
    const cands = [
      { text: `${q.kind === 'discrete' ? 'Discrete' : 'Continuous'} — ${verb(q.kind)} in ${q.units}`, correct: true, why: null },
      { text: `${other === 'discrete' ? 'Discrete' : 'Continuous'} — ${verb(other)} in ${q.units}`, correct: false, why: q.kind === 'discrete' ? 'A count moves in whole steps; it cannot take values between them.' : 'This quantity can take any value in an interval; it is not a count.' },
      { text: `${q.kind === 'discrete' ? 'Discrete' : 'Continuous'} — ${verb(q.kind)} in ${q.wrong}`, correct: false, why: `Right kind, wrong units: this quantity is ${verb(q.kind)} in ${q.units}.` },
      { text: `${other === 'discrete' ? 'Discrete' : 'Continuous'} — ${verb(other)} in ${q.wrong}`, correct: false, why: 'Wrong kind and wrong units.' },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `On a cold run the log records **${q.name.toLowerCase()}**. Is this quantitative variable discrete or continuous, and in what units is it recorded?`,
      answer: { type: 'choice', options: shuffled.map((c) => c.text), correct, feedback: shuffled.map((c) => c.why) },
      hints: ['Discrete variables are counts — whole steps. Continuous variables can take any value in an interval.', 'Units follow the thing: counts are in the things counted; measurements are in a physical unit.'],
      solution: `**${shuffled[correct].text}.** ${q.kind === 'discrete' ? 'It is a count, so it moves in whole steps.' : 'It is a measurement, so it can take any value in an interval — the log only rounds it.'}`,
      misconception: '“Continuous” does not mean “any number at all”: it means any value in an interval makes sense. A count of purges cannot be 2.4.',
    }
  },
})
