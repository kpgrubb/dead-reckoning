/**
 * Prologue reference generators — one per answer type, proving the framework for Act Teams.
 * Story-neutral shakedown-cruise framing; Act Teams replace these with in-plot problems.
 *
 *   act-0/fix-error-mean        numeric        mean / median of a small log
 *   act-0/resistant-center      choice         which measure of center resists an outlier
 *   act-0/sd-in-context         interpretation standard deviation, via the rubric template
 *   act-0/dotplot-shape         display        dotplot → identify the shape
 *   act-0/two-way-conditional   table          conditional relative frequency from a two-way table
 *
 * Every number comes from @/lib/stats; the draw is rejected when it would make the lesson ambiguous.
 */
import { defineGenerator, drawDataset, drawTwoWay, listNumbers, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import { standardDeviationInterpretation } from '@/lib/problems/rubrics'
import { mean, median, sd, sorted, sum } from '@/lib/stats/descriptive'
import { fmt } from '@/lib/stats/format'

const CONTEXTS = [
  { what: 'dead-reckoning fix errors', units: 'km', mean: 12, sd: 4, station: 'the navigation officer' },
  { what: 'radiator outlet temperatures', units: 'K', mean: 310, sd: 6, station: 'the engineering watch' },
  { what: 'reaction-wheel settling times', units: 's', mean: 8.5, sd: 2, station: 'the helm' },
] as const

// ---------------------------------------------------------------------------------------------
// 1. Numeric — mean / median
// ---------------------------------------------------------------------------------------------

export const shakedownFixError = defineGenerator({
  id: 'act-0/fix-error-mean',
  label: 'Center of a small log',
  ap_topics: ['1.7'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const n = rng.int(5, 7)
    // Distinct positive values so the median is unambiguous to read off a sorted list.
    const xs = drawDataset(rng, { n, mean: ctx.mean, sd: ctx.sd, round: 1, min: 0.1, distinct: true })
    const ask = rng.bool(0.6) ? 'mean' : 'median'
    const m = mean(xs)
    const med = median(xs)
    const value = ask === 'mean' ? m : med
    const s = sorted(xs)
    return {
      prompt: `During the shakedown run ${ctx.station} logged ${n} consecutive ${ctx.what} (${ctx.units}):\n\n${listNumbers(xs)}\n\nReport the **${ask}** to one decimal place.`,
      answer: numericAnswer(value, 'mean', { digits: 1, units: ctx.units }),
      hints: [
        ask === 'mean' ? 'The mean is the sum divided by the count.' : 'Sort the values first. The median is the middle value (or the mean of the two middle values).',
        ask === 'mean' ? `Sum = ${fmt(sum(xs), 1)}; divide by ${n}.` : `Sorted: ${listNumbers(s)}. With $n = ${n}$ the median is ${n % 2 ? `the ${(n + 1) / 2}th value` : `the mean of values ${n / 2} and ${n / 2 + 1}`}.`,
      ],
      solution:
        ask === 'mean'
          ? `$$\\bar{x} = \\frac{${xs.map((e) => fmt(e, 1)).join(' + ')}}{${n}} = \\frac{${fmt(sum(xs), 1)}}{${n}} = ${fmt(m, 3)}$$\n\nThe mean is **${fmt(m, 1)} ${ctx.units}**.`
          : `Sorted: ${listNumbers(s)}. With $n = ${n}$ the median is ${n % 2 ? 'the middle value' : 'the mean of the two middle values'}: **${fmt(med, 1)} ${ctx.units}**.`,
      misconception: ask === 'median' ? 'A common slip is to take the middle of the *unsorted* list. Sort first.' : 'Dividing by $n - 1$ is for the sample variance, not the mean.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Choice — resistance to an outlier
// ---------------------------------------------------------------------------------------------

export const resistantCenter = defineGenerator({
  id: 'act-0/resistant-center',
  label: 'Resistant measures',
  ap_topics: ['1.7', '1.8'],
  skills: ['2', '4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const { xs, outlier } = retry(
      rng,
      (r) => {
        const base = drawDataset(r, { n: r.int(6, 8), mean: ctx.mean, sd: ctx.sd * 0.6, round: 1, min: 0.1, distinct: true })
        const outlier = Math.round((ctx.mean + ctx.sd * r.uniform(4, 6)) * 10) / 10
        return { xs: base, outlier }
      },
      // The lesson needs the mean to move clearly more than the median.
      ({ xs, outlier }) => {
        const dMean = Math.abs(mean([...xs, outlier]) - mean(xs))
        const dMed = Math.abs(median([...xs, outlier]) - median(xs))
        return dMean > 3 * Math.max(dMed, 0.05) && dMean > 0.5
      },
    )
    const withOut = [...xs, outlier]
    const m0 = mean(xs)
    const m1 = mean(withOut)
    const d0 = median(xs)
    const d1 = median(withOut)
    const options = ['The mean', 'The median', 'Both are equally affected', 'Neither changes']
    return {
      prompt: `A sensor glitch adds one bad reading, **${fmt(outlier, 1)} ${ctx.units}**, to a log of ${ctx.what}:\n\n${listNumbers(xs)}\n\nWhich measure of center is **resistant** — that is, changes least when the bad reading is included?`,
      answer: {
        type: 'choice',
        options,
        correct: 1,
        feedback: [
          `The mean uses every value, so one extreme reading drags it: ${fmt(m0, 2)} → ${fmt(m1, 2)} ${ctx.units}.`,
          null,
          `Compute both. The mean moves by ${fmt(Math.abs(m1 - m0), 2)} ${ctx.units}; the median by ${fmt(Math.abs(d1 - d0), 2)} ${ctx.units}.`,
          `The mean clearly changes (${fmt(m0, 2)} → ${fmt(m1, 2)} ${ctx.units}).`,
        ],
      },
      hints: ['Compute the mean and the median with and without the bad reading.', 'The mean is the balance point of all values; the median only depends on the middle position.', `Mean: ${fmt(m0, 2)} → ${fmt(m1, 2)}. Median: ${fmt(d0, 2)} → ${fmt(d1, 2)}.`],
      solution: `Without the glitch: mean ${fmt(m0, 2)}, median ${fmt(d0, 2)}. With it: mean ${fmt(m1, 2)}, median ${fmt(d1, 2)} ${ctx.units}. The mean shifts by ${fmt(Math.abs(m1 - m0), 2)}; the median by ${fmt(Math.abs(d1 - d0), 2)}. **The median** is resistant because it depends only on the position of the middle value, not on how extreme the ends are.`,
      misconception: 'Resistance is about how much a summary *changes* under an extreme value, not about which summary is larger.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — standard deviation in context (rubric template)
// ---------------------------------------------------------------------------------------------

export const sdInContext = defineGenerator({
  id: 'act-0/sd-in-context',
  label: 'Interpret a standard deviation',
  ap_topics: ['1.7'],
  skills: ['4'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const xs = drawDataset(rng, { n: rng.int(8, 12), mean: ctx.mean, sd: ctx.sd, round: 1, min: 0.1 })
    const s = sd(xs)
    const m = mean(xs)
    const answer = standardDeviationInterpretation({ sd: s, variable: ctx.what, units: ctx.units, population: 'this shakedown run', mean: m, digits: 2 })
    return {
      prompt: `The ${ctx.what} logged on this shakedown run (${ctx.units}) are:\n\n${listNumbers(xs)}\n\nThe mean is ${fmt(m, 2)} ${ctx.units} and the standard deviation is ${fmt(s, 2)} ${ctx.units}. **Interpret the standard deviation in context.**`,
      answer,
      hints: ['A standard deviation is a *typical distance* from the mean.', 'Say what varies, by about how much, and from what.', 'Template: “The ___ typically vary by about ___ from the mean of ___.”'],
      solution: `${answer.exemplar}\n\nThe standard deviation ${fmt(s, 2)} ${ctx.units} is not a bound: individual readings can sit farther from the mean than that. It summarizes the *typical* deviation.`,
      misconception: 'Do not describe the SD as a range or as a limit that all values stay inside.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Display — dotplot → shape
// ---------------------------------------------------------------------------------------------

export const dotplotShape = defineGenerator({
  id: 'act-0/dotplot-shape',
  label: 'Read the shape of a dotplot',
  ap_topics: ['1.5', '1.6'],
  skills: ['2'],
  generate(rng) {
    const ctx = pickContext(rng, CONTEXTS)
    const shape = pickContext(rng, ['normal', 'skewRight', 'skewLeft'] as const)
    const skewFor = (xs: number[]) => (mean(xs) - median(xs)) / sd(xs)
    const xs = drawDataset(rng, {
      n: rng.int(18, 26),
      mean: ctx.mean,
      sd: ctx.sd,
      round: ctx.units === 'K' ? 0 : 1,
      min: 0.1,
      shape,
      // The sample must actually look like its parent shape, or the item is unfair.
      accept: (v) => {
        const k = skewFor(v)
        if (shape === 'normal') return Math.abs(k) < 0.08
        if (shape === 'skewRight') return k > 0.25
        return k < -0.25
      },
    })
    const options = ['Roughly symmetric', 'Skewed right (tail toward larger values)', 'Skewed left (tail toward smaller values)']
    const correct = shape === 'normal' ? 0 : shape === 'skewRight' ? 1 : 2
    const m = mean(xs)
    const med = median(xs)
    return {
      prompt: `The sensor array plots ${xs.length} ${ctx.what} (${ctx.units}) from the shakedown run. Describe the **shape** of the distribution.`,
      answer: {
        type: 'display',
        display: { kind: 'dotplot', values: xs, label: `${ctx.what} (${ctx.units})` },
        question: {
          type: 'choice',
          options,
          correct,
          feedback: [
            `Look at the tails: one side stretches farther than the other (mean ${fmt(m, 1)} vs median ${fmt(med, 1)}).`,
            'A right skew has its long tail toward LARGER values. Check which side stretches out.',
            'A left skew has its long tail toward SMALLER values. Check which side stretches out.',
          ].map((f, i) => (i === correct ? null : f)),
        },
      },
      hints: ['Skew names the direction of the long tail, not where the pile sits.', `Compare the mean (${fmt(m, 1)}) with the median (${fmt(med, 1)}): the mean is pulled toward the tail.`],
      solution: `The dots pile up ${shape === 'normal' ? 'near the middle with tails of similar length on both sides' : shape === 'skewRight' ? 'at the low end with a tail stretching toward larger values' : 'at the high end with a tail stretching toward smaller values'}. Mean ${fmt(m, 1)} ${shape === 'normal' ? '≈' : shape === 'skewRight' ? '>' : '<'} median ${fmt(med, 1)} ${ctx.units}, consistent with **${options[correct].toLowerCase()}**.`,
      misconception: 'Learners often name the skew by where most of the data sit. Skew is named for the direction of the tail.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Table — conditional relative frequency
// ---------------------------------------------------------------------------------------------

export const twoWayConditional = defineGenerator({
  id: 'act-0/two-way-conditional',
  label: 'Two-way table',
  ap_topics: ['2.2', '2.3'],
  skills: ['2'],
  generate(rng) {
    const rows = ['Hull A', 'Hull B']
    const cols = ['Nominal', 'Fault']
    const t = drawTwoWay(rng, { rows, cols, n: rng.int(40, 80), association: rng.uniform(0.2, 0.8), minCell: 3 })
    const i = rng.int(0, 1)
    const j = 1
    const value = t.counts[i][j] / t.rowTotals[i]
    const tableRows = [...rows.map((r, k) => [r, ...t.counts[k], t.rowTotals[k]]), ['Total', ...t.colTotals, t.total]]
    return {
      prompt: `Post-shakedown inspection sorted ${t.total} subsystem checks by hull section and result. What proportion of **${rows[i]}** checks were faults? Give a proportion to three decimal places.`,
      data: tableSpec(['Section', ...cols, 'Total'], tableRows),
      answer: numericAnswer(value, 'proportion'),
      hints: ['A conditional relative frequency uses a ROW total (the condition) as the denominator, not the grand total.', `Row total for ${rows[i]}: ${t.rowTotals[i]}. Faults in that row: ${t.counts[i][j]}.`],
      solution: `Restrict to the ${rows[i]} row:\n\n${tableMd(['Section', ...cols, 'Total'], [tableRows[i]])}\n\n$$P(\\text{Fault} \\mid \\text{${rows[i]}}) = \\frac{${t.counts[i][j]}}{${t.rowTotals[i]}} = ${fmt(value, 3)}$$`,
      misconception: `Dividing by the grand total (${t.total}) gives the joint relative frequency, ${fmt(t.counts[i][j] / t.total, 3)}, not the conditional one.`,
    }
  },
})
