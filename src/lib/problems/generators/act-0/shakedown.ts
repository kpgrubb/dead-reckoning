/**
 * act-0-01 · Shakedown — drills. AP 1.1: variation is the normal condition of measurement; a mean
 * summarises centre; a range is not a summary of centre; population vs sample, parameter vs statistic.
 *
 *   act-0/fix-run-centre           numeric   mean (or range) of a six-fix dead-reckoning run
 *   act-0/parameter-or-statistic   choice    is this quantity a statistic or a parameter?
 *   act-0/summary-of-centre        choice    which of these numbers summarises centre?
 *   act-0/rerun-shift              numeric   how far the mean moves between two runs of the same procedure
 *
 * Every number comes from @/lib/stats; fixes are drawn with the DS-18 procedure (N(0, 120) km, whole km).
 */
import { defineGenerator, listNumbers, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { max, mean, min, range, sum } from '@/lib/stats'
import { fmt } from '@/lib/stats/format'
import { drawFixErrors } from '@/instruments/act-0/data'

/** Capitalise an interpolated fragment that lands at the start of a sentence. */
function sentenceCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const RUN_CONTEXTS = [
  { where: 'the first cold hour of the Quiet run', who: 'Ferrier' },
  { where: 'hour one of the Watch run', who: 'Ferrier' },
  { where: 'the Standby check', who: 'the nav watch' },
  { where: 'the tug-assisted transit out of the Adlinda slip', who: 'the helm' },
] as const

function sixFixes(rng: Parameters<typeof drawFixErrors>[0]): number[] {
  return retry(
    rng,
    (r) => drawFixErrors(r, 6),
    (f) => new Set(f).size === 6 && Math.abs(mean(f)) >= 5 && range(f) >= 120 && Math.abs(max(f)) !== range(f),
  )
}

// ---------------------------------------------------------------------------------------------
// 1. Numeric — mean or range of a six-fix run
// ---------------------------------------------------------------------------------------------

export const fixRunCentre = defineGenerator({
  id: 'act-0/fix-run-centre',
  label: 'Centre and spread of a fix run',
  ap_topics: ['1.1'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, RUN_CONTEXTS)
    const fixes = sixFixes(rng)
    const ask = rng.bool(0.5) ? 'mean' : 'range'
    const m = mean(fixes)
    const rg = range(fixes)
    const value = ask === 'mean' ? m : rg
    const lo = min(fixes)
    const hi = max(fixes)
    return {
      prompt: `${sentenceCase(ctx.who)} logs six dead-reckoning fixes against Callisto's beacon during ${ctx.where}. Along-track error, km (positive = ahead of truth):\n\n${listNumbers(fixes, 0)}\n\nThe tug master wants ${ask === 'mean' ? 'one number for where the ship thinks it is. Report the **mean** fix error' : 'one number for how far the fixes disagree. Report the **range**'}, to one decimal place (km).`,
      answer: numericAnswer(value, ask === 'mean' ? 'mean' : 'other', { digits: 1, units: 'km' }),
      hints: [
        ask === 'mean' ? 'The mean is the sum of the six fixes divided by six — signs included.' : 'The range is the largest fix minus the smallest fix, signs included.',
        ask === 'mean' ? `Sum = ${fmt(sum(fixes), 0)}; divide by 6.` : `Largest ${fmt(hi, 0)}, smallest ${fmt(lo, 0)}.`,
      ],
      solution:
        ask === 'mean'
          ? `$$\\bar{x} = \\frac{${fixes.map((v) => fmt(v, 0)).join(' + ')}}{6} = \\frac{${fmt(sum(fixes), 0)}}{6} = ${fmt(m, 2)}$$\n\nThe mean fix error is **${fmt(m, 1)} km**. The range, ${fmt(rg, 0)} km, is a separate number: it says how far the fixes disagree, not where the ship is.`
          : `$$\\text{range} = ${fmt(hi, 0)} - (${fmt(lo, 0)}) = ${fmt(rg, 1)}$$\n\nThe range is **${fmt(rg, 1)} km**. The mean, ${fmt(m, 1)} km, is a separate number: it says where the ship thinks it is, not how far the fixes scatter.`,
      misconception: ask === 'mean' ? 'The range (largest minus smallest) is a spread, not a position. Reporting it as “the error” gives the tug master the scatter instead of the centre.' : 'The largest fix on its own is one observation, not the spread. The range needs both ends.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — parameter or statistic
// ---------------------------------------------------------------------------------------------

type Statement = { text: (r: { n: number; v: string; p: string; k: number }) => string; kind: 0 | 1 }

const STATEMENTS: Statement[] = [
  { text: ({ n, v }) => `The mean of the ${n} fixes Ferrier logged in the first cold hour was ${v} km.`, kind: 0 },
  { text: ({ n, k, p }) => `Of the ${n} sweeps the Eyes ran last watch, ${k} logged a contact — a detection rate of ${p}.`, kind: 0 },
  { text: ({ n, v }) => `Over ${n} hours of the Quiet run the sink drained at an average of ${v} kW.`, kind: 0 },
  { text: ({ p }) => `${p} of the Register's 2,200 records are losses.`, kind: 0 },
  { text: () => `The long-run mean error of the dead-reckoning procedure, over every fix it could ever produce.`, kind: 1 },
  { text: () => `The true proportion of all Watch-profile cold hours on which Callisto's telescopes would find *Nightjar*.`, kind: 1 },
  { text: () => `The mean load the cellar would carry over every Watch run the ship could ever fly.`, kind: 1 },
  { text: () => `The fraction of all transits the Lane will ever carry that end in a loss.`, kind: 1 },
  { text: ({ n, v }) => `The range of the ${n} fixes logged on the Standby check: ${v} km.`, kind: 0 },
]

export const parameterOrStatistic = defineGenerator({
  id: 'act-0/parameter-or-statistic',
  label: 'Parameter or statistic',
  ap_topics: ['1.1'],
  skills: ['1'],
  generate(rng) {
    const s = pickContext(rng, STATEMENTS)
    const n = rng.int(5, 40)
    const k = rng.int(1, Math.max(1, Math.floor(n / 3)))
    const fixes = sixFixes(rng)
    const v = rng.bool() ? fmt(mean(fixes), 1) : fmt(range(fixes), 0)
    const p = fmt(k / n, 3)
    const text = s.text({ n, v, p, k })
    const options = ['A statistic — it describes the sample actually observed (these fixes, this run, these records).', 'A parameter — it describes the whole population or process (every fix, every run, every transit).', 'Neither — it is a variable, not a number.']
    return {
      prompt: `Ebele's brief contains the line:\n\n> ${text}\n\nIs the quantity a **statistic** or a **parameter**?`,
      answer: {
        type: 'choice',
        options,
        correct: s.kind,
        feedback: [
          s.kind === 0 ? null : 'A statistic is computed from the observations you actually have. Nobody can log every fix the procedure could ever produce — this quantity describes the whole process.',
          s.kind === 1 ? null : 'A parameter describes the population or the process as a whole. This number was computed from a specific set of observations, so it is a statistic.',
          'It is a single number computed (or defined) for a set of observations — a summary, not a variable.',
        ],
      },
      hints: ['A statistic is computed from a sample you hold; a parameter belongs to the population or the process behind it.', 'Ask: could the crew compute this number from the log, or does it describe every value the procedure could ever produce?'],
      solution: s.kind === 0 ? `The quantity was computed from a specific set of observations, so it is a **statistic**. The corresponding parameter would be the same quantity over every observation the procedure could produce.` : `The quantity describes every value the process could ever produce, not a set the crew has logged, so it is a **parameter**. Any run's mean is a statistic that estimates it.`,
      misconception: 'A number is not a parameter because it is “official” or “true-sounding”; it is a parameter because it describes the population or process, not the sample in hand.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Choice — which of these is a summary of centre
// ---------------------------------------------------------------------------------------------

export const summaryOfCentre = defineGenerator({
  id: 'act-0/summary-of-centre',
  label: 'A summary of centre',
  ap_topics: ['1.1'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, RUN_CONTEXTS)
    const fixes = sixFixes(rng)
    const m = mean(fixes)
    const rg = range(fixes)
    const hi = max(fixes)
    const cands = [
      { text: `The mean of the six: ${fmt(m, 1)} km`, correct: true },
      { text: `The range of the six: ${fmt(rg, 0)} km`, correct: false },
      { text: `The largest fix: ${fmt(hi, 0)} km`, correct: false },
      { text: `The number of fixes: 6`, correct: false },
    ]
    const shuffled = rng.shuffle(cands)
    const correct = shuffled.findIndex((c) => c.correct)
    return {
      prompt: `Six fixes from ${ctx.where} (km):\n\n${listNumbers(fixes, 0)}\n\nThe tug master asks for one number that stands for **where the ship thinks it is**. Which of these is a summary of centre?`,
      answer: {
        type: 'choice',
        options: shuffled.map((c) => c.text),
        correct,
        feedback: shuffled.map((c) => (c.correct ? null : c.text.startsWith('The range') ? 'The range is a summary of spread — how far the fixes disagree — not of where they sit.' : c.text.startsWith('The largest') ? 'One fix is one observation. A summary of centre stands for all six.' : 'A count says how many fixes there are, not where they sit.')),
      },
      hints: ['Centre answers “where do the values sit?”; spread answers “how far apart are they?”', 'The mean is the balance point of all six values.'],
      solution: `A summary of centre is one number that stands in for where the values sit: the **mean, ${fmt(m, 1)} km**. The range (${fmt(rg, 0)} km) is a spread, the largest fix (${fmt(hi, 0)} km) is one observation, and 6 is a count.`,
      misconception: 'Learners often report the range when asked for “the error”. The range is real information — but it answers a different question.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Numeric — re-run variation
// ---------------------------------------------------------------------------------------------

export const rerunShift = defineGenerator({
  id: 'act-0/rerun-shift',
  label: 'Re-run variation',
  ap_topics: ['1.1'],
  skills: ['2'],
  generate(rng) {
    const { a, b } = retry(
      rng,
      (r) => ({ a: sixFixes(r), b: sixFixes(r) }),
      ({ a, b }) => Math.abs(mean(a) - mean(b)) >= 3 && Math.abs(mean(a) - mean(b)) < range(a),
    )
    const ma = mean(a)
    const mb = mean(b)
    const shift = Math.abs(ma - mb)
    return {
      prompt: `Ferrier runs the six-fix procedure twice on the same cold hour, against the same beacon (km):\n\nRun A: ${listNumbers(a, 0)}\n\nRun B: ${listNumbers(b, 0)}\n\nThe tug master wants to know whether something broke between the runs. By how much did the **mean** fix error move from run A to run B? Give the absolute difference to one decimal place (km).`,
      answer: numericAnswer(shift, 'mean', { digits: 1, units: 'km' }),
      hints: ['Compute each run’s mean first; then take the difference, ignoring the sign.', `Run A: sum ${fmt(sum(a), 0)} ÷ 6. Run B: sum ${fmt(sum(b), 0)} ÷ 6.`, `$|${fmt(ma, 2)} - (${fmt(mb, 2)})|$, to one decimal.`],
      solution: `$$\\bar{x}_A = \\frac{${fmt(sum(a), 0)}}{6} = ${fmt(ma, 2)},\\qquad \\bar{x}_B = \\frac{${fmt(sum(b), 0)}}{6} = ${fmt(mb, 2)}$$\n\n$$|\\bar{x}_A - \\bar{x}_B| = ${fmt(shift, 2)}$$\n\nThe mean moved by **${fmt(shift, 1)} km** — less than the spread inside either run (run A ranges over ${fmt(range(a), 0)} km). Nothing broke: the same procedure gives different numbers each time it is run. That is variation, and it is data.`,
      misconception: 'A different answer on a second run is not evidence of a fault. Judge the shift against the spread the procedure shows within a single run.',
    }
  },
})
