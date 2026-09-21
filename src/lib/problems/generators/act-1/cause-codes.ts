/**
 * act-1-02 · Cause Codes — drills. AP 1.4: displays of a categorical variable. Bar charts of counts
 * and of relative frequencies; when a pie is legitimate; how a denominator, a truncated baseline or
 * a bar's *area* turns an honest table into a dishonest picture; comparing two categorical
 * distributions that come from groups of different size.
 *
 *   act-1/display-distortion         choice    which statement does the published chart misrepresent?
 *   act-1/honest-relative-frequency  numeric   restore the denominator the page left off
 *   act-1/compare-categorical        interp    compare two offices' use of one code, in shares
 *   act-1/chart-choice               choice    which display answers the stated question
 *
 * `act-1/display-distortion` is reused by the Act I checkpoint, so it stands alone: the chart is
 * described in full inside the prompt and no item refers to an instrument on the page.
 *
 * Every framing is another corridor and another pair of offices. No drill's answer is allowed to be
 * the Register's own 19/23, 3/8 or 22/31 — those are act-1-01's and act-1-02's mission beats.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, drawTwoWay, numericAnswer, pickContext, retry, tableMd, tableSpec } from '@/lib/problems/generate'
import { compareCategorical } from './_rubrics'
import { fmt, fmtInt, fmtPct } from '@/lib/stats/format'

// ---------------------------------------------------------------------------------------------
// Shared framing
// ---------------------------------------------------------------------------------------------

const CORRIDORS = [
  { name: 'the Mars–Belt corridor', years: '2170–76', offices: ['Deimos', 'Pallas'] as const },
  { name: 'the Saturn feeder run', years: '2177–83', offices: ['Titan', 'Iapetus'] as const },
  { name: 'the Venus–Earth shuttle lane', years: '2179–84', offices: ['Ishtar', 'Luna'] as const },
  { name: 'the Callisto–Ganymede local lane', years: '2175–81', offices: ['Adlinda', 'Osiris'] as const },
] as const

const CODES = ['accident', 'piracy', 'unknown'] as const

/** The Register's own shares (19/23, 3/8, 22/31) — never a generated drill's answer. */
const RESERVED = [19 / 23, 3 / 8, 22 / 31]
function reserved(p: number): boolean {
  return RESERVED.some((r) => Math.abs(p - r) < 0.002)
}

// ---------------------------------------------------------------------------------------------
// 1. Choice — what does the published chart misrepresent?
// ---------------------------------------------------------------------------------------------

const TRUNCATED_FRAMES = [
  { page: 'a Lane Authority quarterly page', groups: ['Pallas Haulage', 'Tharsis Line', 'Deimos Freight'], measure: 'on-time arrival rate' },
  { page: "a freight house's shareholder brief", groups: ['Ovda Mercantile', 'Tellus Line', 'Fortuna Haulage'], measure: 'transponder-compliance rate' },
  { page: 'a yard acceptance summary', groups: ['Adlinda Yards', 'Osiris Yards', 'Uruk High'], measure: 'first-pass survey rate' },
  { page: "an escort squadron's annual return", groups: ['CSV Asgard', 'CSV Vantage', 'CSV Meridian'], measure: 'patrol-coverage rate' },
] as const

const AREA_FRAMES = [
  { page: "a carrier's safety bulletin", catX: 'profile-deviation advisories', catY: 'debris advisories' },
  { page: 'a relay station annual report', catX: 'transponder dropouts', catY: 'medical diversions' },
  { page: 'a yard maintenance summary', catX: 'reactor faults', catY: 'radiator faults' },
] as const

type Candidate = { text: string; correct: boolean; why: string | null }

function shuffleChoice(rng: Rng, cands: Candidate[]): { options: string[]; correct: number; feedback: (string | null)[] } {
  const shuffled = rng.shuffle(cands)
  return { options: shuffled.map((c) => c.text), correct: shuffled.findIndex((c) => c.correct), feedback: shuffled.map((c) => c.why) }
}

export const displayDistortion = defineGenerator({
  id: 'act-1/display-distortion',
  label: 'What the chart misrepresents',
  ap_topics: ['1.4'],
  skills: ['4'],
  generate(rng) {
    const variant = ['truncated', 'denominator', 'area'][rng.int(0, 2)] as 'truncated' | 'denominator' | 'area'

    if (variant === 'truncated') {
      const f = pickContext(rng, TRUNCATED_FRAMES)
      const draw = retry(
        rng,
        (r) => {
          const vs = [r.int(78, 96), r.int(78, 96), r.int(78, 96)]
          const lo = Math.min(...vs)
          const hi = Math.max(...vs)
          const baseline = r.int(Math.max(0, Math.ceil((2.5 * lo - hi) / 1.5)), lo - 1)
          return { vs, lo, hi, baseline, ratio: (hi - baseline) / (lo - baseline) }
        },
        ({ vs, lo, hi, baseline, ratio }) =>
          new Set(vs).size === 3 && hi - lo >= 5 && hi - lo <= 14 && baseline >= 0 && baseline <= lo - 1 && ratio >= 2.5 && ratio <= 8,
      )
      const { vs, lo, hi, baseline, ratio } = draw
      const best = f.groups[vs.indexOf(hi)]
      const worst = f.groups[vs.indexOf(lo)]
      const gap = hi - lo
      const { options, correct, feedback } = shuffleChoice(rng, [
        { text: `${best}'s ${f.measure} is roughly ${fmt(ratio, 1)} times ${worst}'s.`, correct: true, why: null },
        { text: `${best} has the highest ${f.measure} of the three.`, correct: false, why: 'True, and the chart shows it honestly. Moving the baseline stretches the bars but never reorders them.' },
        { text: `${worst} has the lowest ${f.measure} of the three.`, correct: false, why: 'True, and honestly drawn. The ranking survives any baseline.' },
        { text: `The three differ by about ${fmtInt(gap)} percentage points from best to worst.`, correct: false, why: `True: ${fmtInt(hi)} percent minus ${fmtInt(lo)} percent is ${fmtInt(gap)} percentage points, and the axis labels say so. The difference is honest; the *heights* are not.` },
      ])
      return {
        prompt: `A bar chart printed on ${f.page}: **${f.measure}** by operator, ${f.groups[0]} ${fmtInt(vs[0])} percent, ${f.groups[1]} ${fmtInt(vs[1])} percent, ${f.groups[2]} ${fmtInt(vs[2])} percent. The value axis is labelled, but it begins at ${fmtInt(baseline)} percent instead of zero, so ${best}'s bar stands about ${fmt(ratio, 1)} times as tall as ${worst}'s.\n\nWhich statement does the chart, **as drawn**, misrepresent?`,
        answer: { type: 'choice', options, correct, feedback },
        hints: [
          'A truncated baseline leaves the order and the labelled differences intact. What it destroys is the relationship between a bar\'s height and the quantity it stands for.',
          `On the page the tall bar is about ${fmt(ratio, 1)} times the short one. In the data the two values are ${fmtInt(hi)} percent and ${fmtInt(lo)} percent. Which statement relies on the heights rather than the labels?`,
        ],
        solution: `With the axis at zero, ${fmtInt(hi)} percent against ${fmtInt(lo)} percent is a ratio of ${fmt(hi / lo, 2)} — the bars would be almost the same height. Starting the axis at ${fmtInt(baseline)} percent plots ${fmtInt(hi - baseline)} against ${fmtInt(lo - baseline)}, a height ratio of ${fmt(ratio, 1)}. So the misrepresented statement is **"${best}'s ${f.measure} is roughly ${fmt(ratio, 1)} times ${worst}'s"** — the ${fmt(ratio, 1)} is a fact about the drawing, not about the operators. The ordering and the ${fmtInt(gap)}-point gap are both honest.`,
        misconception: 'Reading a truncated axis as a proportional difference. A bar chart only earns the reader\'s "twice as big" when its value axis starts at zero.',
      }
    }

    if (variant === 'denominator') {
      const corr = pickContext(rng, CORRIDORS)
      const code = rng.choice(CODES)
      const big = `the ${corr.offices[0]} office`
      const small = `the ${corr.offices[1]} office`
      const d = retry(
        rng,
        (r) => {
          const nA = r.int(70, 140)
          const nB = r.int(18, 45)
          const cA = Math.round(nA * r.uniform(0.16, 0.36))
          const cB = Math.round(nB * r.uniform(0.5, 0.82))
          return { nA, nB, cA, cB, pA: cA / nA, pB: cB / nB }
        },
        ({ nA, nB, cA, cB, pA, pB }) => cA >= cB + 4 && cB >= 4 && cA <= nA && cB <= nB && pB - pA >= 0.18 && !reserved(pA) && !reserved(pB),
      )
      const { nA, nB, cA, cB, pA, pB } = d
      const { options, correct, feedback } = shuffleChoice(rng, [
        { text: `A loss classified by ${big} is more likely to be coded *${code}* than one classified by ${small}.`, correct: true, why: null },
        { text: `${big} filed more *${code}* records than ${small}.`, correct: false, why: 'True, and it is exactly what the two bars are: counts. The chart reports this one honestly.' },
        { text: `Between them the two offices filed ${fmtInt(cA + cB)} records coded *${code}*.`, correct: false, why: 'True. The two bars add to that, and nothing about the drawing hides it.' },
        { text: `More than half of the corridor's *${code}* records came from ${big}.`, correct: false, why: `True: ${fmtInt(cA)} of ${fmtInt(cA + cB)} is more than half, and the bars show it. This is a share of the *code*, which the chart can support — unlike a share of an office's caseload, which it cannot.` },
      ])
      return {
        prompt: `A bar chart on ${corr.name}'s summary page, ${corr.years}: **loss records coded *${code}*, by classifying office** — two bars, ${big} at ${fmtInt(cA)} and ${small} at ${fmtInt(cB)}. The page prints counts only. Neither office's total caseload appears anywhere on it.\n\nWhich statement does the chart, **as drawn**, misrepresent?`,
        data: { kind: 'bar', categories: [big, small], counts: [cA, cB], label: `records coded ${code}, as published` },
        answer: { type: 'choice', options, correct, feedback },
        hints: [
          'A count answers "how many". A statement about how *likely* a code is needs a denominator — how many losses each office classified — and the page does not carry one.',
          `Suppose ${big} classified ${fmtInt(nA)} losses in all and ${small} classified ${fmtInt(nB)}. Work out each office's share of *${code}* and compare it with what the bars suggest.`,
        ],
        solution: `The bars are counts, so every statement about counts is safe. The likelihood claim is not: with ${fmtInt(nA)} losses at ${big} and ${fmtInt(nB)} at ${small}, the shares are $${cA}/${nA} = ${fmt(pA, 3)}$ and $${cB}/${nB} = ${fmt(pB, 3)}$. The *smaller* bar belongs to the office that codes *${code}* far more often. The misrepresented statement is **"a loss classified by ${big} is more likely to be coded *${code}*"** — a taller bar on a bigger caseload is not a higher rate.`,
        misconception: 'Comparing counts across groups of different size. Without the group totals, a bar chart of counts cannot support any claim about which group does something more often.',
      }
    }

    const f = pickContext(rng, AREA_FRAMES)
    const a = retry(
      rng,
      (r) => {
        const y = r.int(40, 140)
        const x = Math.round(y * r.uniform(1.6, 2.6))
        return { x, y, ratio: x / y }
      },
      ({ ratio }) => ratio >= 1.6 && ratio <= 2.6,
    )
    const { x, y, ratio } = a
    const areaRatio = ratio * ratio
    const { options, correct, feedback } = shuffleChoice(rng, [
      { text: `${f.catX} occurred about ${fmt(areaRatio, 1)} times as often as ${f.catY}.`, correct: true, why: null },
      { text: `${f.catX} occurred about ${fmt(ratio, 1)} times as often as ${f.catY}.`, correct: false, why: `True — ${fmtInt(x)} divided by ${fmtInt(y)} is ${fmt(ratio, 1)}. This is the honest ratio, and it is not what the eye takes from the picture.` },
      { text: `${f.catX} occurred more often than ${f.catY}.`, correct: false, why: 'True, and no amount of scaling changes the direction. The drawing exaggerates the size of the difference, not its sign.' },
      { text: `The two kinds together account for ${fmtInt(x + y)} records.`, correct: false, why: 'True, and printed on the page. The distortion is in the areas, not the counts.' },
    ])
    return {
      prompt: `A bar chart on ${f.page}: **${f.catX} ${fmtInt(x)}, ${f.catY} ${fmtInt(y)}**. To "balance the layout" the designer scaled each bar's *width* to its count as well as its height, so the block for ${f.catX} covers about ${fmt(areaRatio, 1)} times the area of the block for ${f.catY}.\n\nWhich statement does the chart, **as drawn**, misrepresent?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A bar chart encodes one number in one dimension: length. Scale the width as well and the ink grows as the square.',
        `The counts are ${fmtInt(x)} and ${fmtInt(y)}. Work out their ratio, then work out what ratio the *areas* are in, and see which statement matches the drawing rather than the data.`,
      ],
      solution: `The counts stand in the ratio $${x}/${y} = ${fmt(ratio, 2)}$. Scaling both height and width by the count makes the areas stand in the ratio $${fmt(ratio, 2)}^2 = ${fmt(areaRatio, 1)}$. The eye reads area, so the page says **"${f.catX} occurred about ${fmt(areaRatio, 1)} times as often as ${f.catY}"** — roughly double the true ratio of ${fmt(ratio, 1)}. Everything else on the list is honest.`,
      misconception: 'Encoding one number twice — in a bar\'s height and in its width — so the reader\'s eye multiplies the difference by itself.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — restore the denominator
// ---------------------------------------------------------------------------------------------

export const honestRelativeFrequency = defineGenerator({
  id: 'act-1/honest-relative-frequency',
  label: 'Restore the denominator',
  ap_topics: ['1.4'],
  skills: ['2'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const code = rng.choice(CODES)
    const variant = rng.bool() ? 'records' : 'office'

    if (variant === 'records') {
      const d = retry(
        rng,
        (r) => {
          const records = r.int(900, 2600)
          const lost = r.int(26, 78)
          const coded = Math.round(lost * r.uniform(0.22, 0.86))
          return { records, lost, coded, p: coded / lost }
        },
        ({ records, lost, coded, p }) => coded >= 6 && coded <= lost - 2 && records > lost * 20 && p > 0.15 && p < 0.92 && !reserved(p),
      )
      const { records, lost, coded, p } = d
      return {
        prompt: `The Lane Authority's file for ${corr.name}, ${corr.years}, holds ${fmtInt(records)} incident records of every severity — losses, transponder dropouts, debris advisories, medical diversions. ${fmtInt(lost)} of them are losses, and ${fmtInt(coded)} of those ${fmtInt(lost)} losses carry the cause code **${code}**.\n\nThe corridor's summary page charts the cause codes against all ${fmtInt(records)} records, where *${code}* stands at ${fmtPct(coded / records, 1)} — a sliver beside the advisory bars.\n\nRestore the denominator the question actually needs. What is the relative frequency of **${code}** among the corridor's *losses*? Give a proportion to three decimal places.`,
        answer: numericAnswer(p, 'proportion', { digits: 3 }),
        hints: [
          'The denominator belongs to the question, not to the file. If the question is about losses, only losses may be counted in the total.',
          `Losses coded *${code}*: ${fmtInt(coded)}. Losses in all: ${fmtInt(lost)}. The other ${fmtInt(records - lost)} records are not losses and do not belong in this total.`,
          `$${coded} / ${lost}$, to three decimals.`,
        ],
        solution: `$$\\text{relative frequency of } ${code} \\text{ among losses} = \\frac{${coded}}{${lost}} = ${fmt(p, 4)}$$\n\nThe honest figure is **${fmt(p, 3)}** — about ${fmtPct(p, 0)} of the corridor's losses, against the page's ${fmtPct(coded / records, 1)} of every record on file. Nothing in the world changed between the two numbers; only the denominator did.`,
        misconception: `Charting a loss code against every record the Authority holds. Dividing by ${fmtInt(records)} answers "how much of the paperwork is this", not "how are the losses classified".`,
      }
    }

    const d = retry(
      rng,
      (r) => {
        const nA = r.int(14, 44)
        const nB = r.int(10, 38)
        const cA = Math.round(nA * r.uniform(0.2, 0.88))
        const cB = Math.round(nB * r.uniform(0.05, 0.6))
        return { nA, nB, cA, cB, p: cA / nA, pooled: (cA + cB) / (nA + nB) }
      },
      ({ nA, nB, cA, cB, p, pooled }) => cA >= 4 && cB >= 1 && cA <= nA - 1 && cB <= nB - 1 && p > 0.15 && p < 0.95 && Math.abs(p - pooled) >= 0.09 && !reserved(p) && !reserved(pooled),
    )
    const { nA, nB, cA, cB, p, pooled } = d
    const offA = `the ${corr.offices[0]} office`
    const offB = `the ${corr.offices[1]} office`
    return {
      prompt: `${fmtInt(nA + nB)} freighters were lost on ${corr.name}, ${corr.years}. ${offA} classified ${fmtInt(nA)} of them and ${offB} classified the other ${fmtInt(nB)}. Of ${offA}'s ${fmtInt(nA)}, ${fmtInt(cA)} carry the cause code **${code}**; of ${offB}'s ${fmtInt(nB)}, ${fmtInt(cB)} do.\n\nThe corridor's summary page pools the two offices and reports *${code}* at ${fmtPct(pooled, 1)} of all losses.\n\nA classifying office is a reporting process, and the question on the table is about ${offA}'s. What is the relative frequency of **${code}** among the losses **${offA}** classified? Give a proportion to three decimal places.`,
      data: tableSpec(['office', 'losses classified', `coded ${code}`], [
        [offA, nA, cA],
        [offB, nB, cB],
        ['Total', nA + nB, cA + cB],
      ]),
      answer: numericAnswer(p, 'proportion', { digits: 3 }),
      hints: [
        'A share within one office is a conditional relative frequency: its denominator is that office\'s row total, never the grand total.',
        `${offA} coded ${fmtInt(cA)} of the ${fmtInt(nA)} losses it classified as *${code}*.`,
        `$${cA} / ${nA}$, to three decimals.`,
      ],
      solution: `$$\\frac{${cA}}{${nA}} = ${fmt(p, 4)}$$\n\n**${fmt(p, 3)}** — about ${fmtPct(p, 0)} of the losses ${offA} classified. The page's ${fmtPct(pooled, 1)} is the pooled figure, $(${cA} + ${cB})/(${nA} + ${nB})$, and it describes the two offices averaged together, which is not a thing either office did.`,
      misconception: `Using the grand total of ${fmtInt(nA + nB)} for a question about one office. Pooling two reporting processes hides the difference between them — which is usually the only interesting thing in the table.`,
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Interpretation — compare two offices on one code
// ---------------------------------------------------------------------------------------------

export const compareCategoricalDrill = defineGenerator({
  id: 'act-1/compare-categorical',
  label: 'Compare two offices, in shares',
  ap_topics: ['1.4'],
  skills: ['4'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const offA = `the ${corr.offices[0]} office`
    const offB = `the ${corr.offices[1]} office`
    const draw = retry(
      rng,
      (r) => {
        const tw = drawTwoWay(r, { rows: [offA, offB], cols: [...CODES], n: r.int(34, 88), association: r.uniform(0.5, 0.9), minCell: 1 })
        let j = 0
        let best = -1
        for (let k = 0; k < CODES.length; k++) {
          const gap = Math.abs(tw.counts[0][k] / tw.rowTotals[0] - tw.counts[1][k] / tw.rowTotals[1])
          if (gap > best) {
            best = gap
            j = k
          }
        }
        return { tw, j, pA: tw.counts[0][j] / tw.rowTotals[0], pB: tw.counts[1][j] / tw.rowTotals[1] }
      },
      ({ tw, pA, pB }) =>
        tw.rowTotals.every((rt) => rt >= 12) &&
        Math.abs(pA - pB) >= 0.18 &&
        Math.round(pA * 100) !== Math.round(pB * 100) &&
        pA > 0.02 &&
        pA < 0.98 &&
        pB > 0.02 &&
        pB < 0.98 &&
        !reserved(pA) &&
        !reserved(pB),
    )
    const { tw, j, pA, pB } = draw
    const code = CODES[j]
    const rows: (string | number)[][] = [
      [offA, ...tw.counts[0], tw.rowTotals[0]],
      [offB, ...tw.counts[1], tw.rowTotals[1]],
      ['Total', ...tw.colTotals, tw.total],
    ]
    const columns = ['office', ...CODES, 'losses classified']
    const answer = compareCategorical({ groupA: offA, groupB: offB, category: code, propA: pA, propB: pB, variable: 'classification' })
    return {
      prompt: `Loss records on ${corr.name}, ${corr.years}, by classifying office and classification:\n\n${tableMd(columns, rows)}\n\nIn one or two sentences, compare how the two offices used the **${code}** code. The offices classified different numbers of losses, so compare shares and cite both of them. Write about the *classification*, the offices and the percentages.`,
      data: tableSpec(columns, rows),
      answer,
      hints: [
        'Two offices of different size cannot be compared on counts. Turn each row into relative frequencies first — each office\'s own total is its denominator.',
        `${offA}: ${tw.counts[0][j]} of ${tw.rowTotals[0]}. ${offB}: ${tw.counts[1][j]} of ${tw.rowTotals[1]}. One sentence, with both percentages in it and the word *than*.`,
      ],
      solution: `${offA} coded ${tw.counts[0][j]} of its ${tw.rowTotals[0]} losses as *${code}*, a share of ${fmt(pA * 100, 0)} percent; ${offB} coded ${tw.counts[1][j]} of ${tw.rowTotals[1]}, a share of ${fmt(pB * 100, 0)} percent.\n\n**${answer.exemplar}**\n\nThe common failure is a pair of counts with no denominators — "${tw.counts[0][j]} against ${tw.counts[1][j]}" describes two offices' workloads, not their habits.`,
      misconception: 'Comparing raw counts across groups of different size, or giving two separate descriptions instead of one comparative sentence.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which display answers the question?
// ---------------------------------------------------------------------------------------------

interface ChartCtx {
  corridor: string
  years: string
  offA: string
  offB: string
  n: number
}

const CHART_SCENARIOS: { question: (c: ChartCtx) => string; candidates: (c: ChartCtx) => Candidate[] }[] = [
  {
    question: (c) => `Of the ${c.n} losses ${c.offA} classified on ${c.corridor}, what share carries each of the three cause codes?`,
    candidates: (c) => [
      { text: 'A pie chart of the three cause codes for that office — or, equally, a bar chart of relative frequencies. The three codes are mutually exclusive and between them account for every one of the office\'s losses.', correct: true, why: null },
      { text: 'A histogram of the cause codes, with the codes along the horizontal axis.', correct: false, why: 'A histogram\'s bars touch because its horizontal axis is a number line. Cause code is categorical: there is nothing between *accident* and *piracy*, and no order to the axis.' },
      { text: `Side-by-side bars of ${c.offA}'s and ${c.offB}'s counts, one pair per code.`, correct: false, why: 'That answers a comparison the question did not ask, and counts do not give the shares it did ask for.' },
      { text: 'A bar chart of the number of losses in each year of the period.', correct: false, why: 'That displays a different variable — date, not cause code.' },
    ],
  },
  {
    question: (c) => `Do ${c.offA} and ${c.offB} classify losses differently?`,
    candidates: (c) => [
      { text: 'Side-by-side bars of the **relative frequency** of each code within each office, with both offices\' totals printed beside them.', correct: true, why: null },
      { text: 'One pie chart of all the corridor\'s losses by cause code.', correct: false, why: 'Pooling the two offices into a single pie erases the very comparison the question asks for.' },
      { text: 'Side-by-side bars of the **counts** of each code in each office.', correct: false, why: 'The two offices classified different numbers of losses, so a taller bar may mean nothing but a bigger caseload.' },
      { text: `Two pie charts, one for ${c.offA} and one for ${c.offB}, with no totals shown.`, correct: false, why: 'Angles are hard to compare across two circles, and without each office\'s total a slice cannot be weighed. Relative-frequency bars on one shared axis answer it directly.' },
    ],
  },
  {
    question: (c) => `How many records of each severity did ${c.offB} file on ${c.corridor} in ${c.years}?`,
    candidates: () => [
      { text: 'A bar chart of counts, one bar per severity, with the value axis starting at zero.', correct: true, why: null },
      { text: 'A pie chart of the severities.', correct: false, why: 'A pie gives shares of a whole. The question asks how many, and no reader can recover a count from a slice.' },
      { text: 'A histogram of the severities with a stated bin width.', correct: false, why: 'Severity is a categorical code, not a measurement; there is nothing to bin.' },
      { text: 'A bar chart of counts with the axis starting just below the shortest bar, to use the space.', correct: false, why: 'Truncating the axis breaks the one thing a bar chart promises: that height is proportional to quantity.' },
    ],
  },
  {
    question: (c) => `How is *mark at last contact* distributed across the ${c.n} losses on ${c.corridor}?`,
    candidates: (c) => [
      { text: 'A histogram (or a dotplot) of mark at last contact, with the bin width stated.', correct: true, why: null },
      { text: `A bar chart with one bar per lost hull, ${c.n} bars in all.`, correct: false, why: 'One bar per individual is a list, not a distribution: it shows no shape, no centre and no spread.' },
      { text: 'A pie chart of the marks.', correct: false, why: 'Mark is quantitative and continuous. Slices of a circle cannot show shape, centre or spread, and the "categories" would be an artefact of how you cut it.' },
      { text: 'A bar chart of the three cause codes.', correct: false, why: 'That displays a different variable altogether.' },
    ],
  },
  {
    question: () => 'Which of these is a legitimate use of a **pie** chart?',
    candidates: (c) => [
      { text: `The share of ${c.offA}'s ${c.n} losses falling in each of the three mutually exclusive cause codes.`, correct: true, why: null },
      { text: `The *unknown* share at ${c.offA} beside the *unknown* share at ${c.offB}.`, correct: false, why: 'Two shares taken from two different wholes are not slices of one pie: they do not partition anything and they need not sum to one.' },
      { text: 'The hull ages of the lost freighters, in years.', correct: false, why: 'Hull age is quantitative. A pie has no axis to measure it on.' },
      { text: 'The number of losses in each of the six years, to show the trend over time.', correct: false, why: 'The six years do partition the losses, but a pie throws away the ordering a trend lives in. A bar chart in year order, or a time plot, shows it.' },
    ],
  },
]

export const chartChoice = defineGenerator({
  id: 'act-1/chart-choice',
  label: 'Which display fits the question',
  ap_topics: ['1.4'],
  skills: ['1'],
  generate(rng) {
    const corr = pickContext(rng, CORRIDORS)
    const s = pickContext(rng, CHART_SCENARIOS)
    const ctx: ChartCtx = { corridor: corr.name, years: corr.years, offA: `the ${corr.offices[0]} office`, offB: `the ${corr.offices[1]} office`, n: rng.int(22, 64) }
    const { options, correct, feedback } = shuffleChoice(rng, s.candidates(ctx))
    return {
      prompt: `${s.question(ctx)}\n\nWhich display answers it?`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two questions settle the display: is the variable categorical or quantitative, and does the question want counts, shares of one whole, or a comparison between groups?',
        'A pie is legitimate only when its slices are mutually exclusive parts of exactly one whole *and* the question is about shares of that whole. Comparing groups is bars; a measurement is a histogram or a dotplot.',
      ],
      solution: `**${options[correct]}**\n\nMatch the display to the variable and to the question: a categorical variable is bars (counts when the question asks how many, relative frequencies when it asks what share), a pie only for parts of one whole, a histogram or dotplot only for a measurement, and groups of different size only ever compared on relative frequencies.`,
      misconception: 'Choosing a pie because the variable is categorical. A pie also requires that the slices partition one whole and that the question is about that whole.',
    }
  },
})
