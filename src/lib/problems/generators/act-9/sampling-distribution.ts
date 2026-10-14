/**
 * act-9-01 · The Slope Has a Spread — drills. AP 9.1: the population regression model, the
 * sampling distribution of a fitted slope, the conditions, and SE(b) read off computer output.
 *
 *   act-9/population-model            choice   β against b; the slope varies although the data do not
 *   act-9/slope-sd-formula            numeric  SD of b = σ/(σₓ√n) from stated σ, σₓ and n
 *   act-9/read-slope-output           numeric  SE(b), s or df, read off an output table
 *   act-9/slope-output-and-conditions choice   which cell is SE(b), and where Normal is checked
 *   act-9/slope-spread-drivers        choice   what n, σ and the spread of x do to the SD of b
 *   act-9/slope-conditions            interp   the conditions paragraph (`conditionsCheck`, slope)
 *
 * DS-16's own numbers — the nineteen's 1.17, their SE(b), the honest stack's SD of 0.012 — belong
 * to the mission beats. Every file here is another office's.
 */
import { defineGenerator, numericAnswer, pickContext, retry } from '@/lib/problems/generate'
import { conditionsCheck } from '@/lib/problems/rubrics'
import { fmt, fmtInt, fmtP, samplingSdMean, slopeTest } from '@/lib/stats'
import { CLAIM_CONTEXTS, SLOPE_CONTEXTS, drawSlope, outputCaption, outputMd, outputReading, precisionFor, precisionWords, shuffleChoice, type Candidate } from './contexts'

// ---------------------------------------------------------------------------------------------
// 1. Choice — the population regression model
// ---------------------------------------------------------------------------------------------

export const populationModel = defineGenerator({
  id: 'act-9/population-model',
  label: 'The population regression model: β and b',
  ap_topics: ['9.1'],
  skills: ['1', '4'],
  generate(rng) {
    const ctx = pickContext(rng, SLOPE_CONTEXTS)
    const n = rng.int(9, 24)

    const cands: Candidate[] = [
      {
        text: `**β** is the parameter: the slope of the true line $\\mu_y = \\alpha + \\beta x$ for all ${ctx.population}. **b**, the slope of the least-squares line through these ${fmtInt(n)} ${ctx.units}, is the statistic that estimates it, and a different ${fmtInt(n)} ${ctx.units} would give a different b.`,
        correct: true,
        why: null,
      },
      {
        text: `**b** is the parameter, because it is the slope actually computed from the file and is known exactly. **β** is the statistic, because it has to be estimated.`,
        correct: false,
        why: 'The names are the wrong way round. A parameter describes the population and is unknown; a statistic is computed from a sample and is known. Here b is the known one, and that is precisely why it is the statistic: it is the thing that moves when the sample does.',
      },
      {
        text: `Neither varies. These ${fmtInt(n)} ${ctx.units} are already logged, so the fitted slope is a fixed number, and a fixed number has no standard error and no sampling distribution.`,
        correct: false,
        why: `The file is fixed; the procedure is not. The sampling distribution of b answers a question about the ${ctx.office}'s method rather than about this file: draw another ${fmtInt(n)} ${ctx.units} from ${ctx.population} and fit again, and the slope comes out somewhere else. SE(b) measures how far somewhere else usually is, and without it "b is not β₀" is a comparison of two numbers with no scale.`,
      },
      {
        text: `**β** and **b** are the same quantity written two ways. The distinction only matters when σ, the spread of ${ctx.yVar} about the true line, is unknown and has to be estimated by s.`,
        correct: false,
        why: 'Estimating σ by s is why the reference distribution is t rather than z; it is not what separates β from b. Even with σ known exactly, b would still vary from sample to sample around β, and that variation is the whole subject.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} models ${ctx.yVar} against ${ctx.xVar} across ${ctx.population}:\n\n$$\\mu_y = \\alpha + \\beta x, \\qquad \\text{with } ${ctx.yVar.replace(/[^a-zA-Z ]/g, '')} \\text{ varying about that line with SD } \\sigma.$$\n\nA file of **${fmtInt(n)} ${ctx.units}** is fitted by least squares and returns a slope.\n\n**Which quantity is the parameter, which is the statistic, and what varies?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'A parameter is a number about the whole population and nobody gets to see it. A statistic is a number computed from a sample. Ask which of the two the least-squares fit produced.',
        'Then ask the second question separately: the file is fixed, but is the slope a fixed quantity? Imagine the office drawing a different file of the same size from the same population and fitting again.',
      ],
      solution: `**${options[correct]}**\n\nThe model has three parameters and none of them is visible. $\\alpha$ and $\\beta$ fix the true line $\\mu_y = \\alpha + \\beta x$ — the mean ${ctx.yVar} at each value of ${ctx.xVar} — and $\\sigma$ fixes how far individual ${ctx.units} scatter about it. The fit returns $a$, $b$ and $s$, one estimate each.\n\nThe thing to hold on to is that **b has a distribution**. It is centred at $\\beta$, so least squares is unbiased, and it has an SD of\n\n$$\\sigma_b = \\frac{\\sigma}{\\sigma_x \\sqrt{n}}$$\n\nwhich shrinks with $\\sqrt{n}$ and with the spread of the ${ctx.xVar} column. Every interval and every test in Unit 9 is an argument about where $\\beta$ sits given one draw from that distribution, so a fitted slope quoted without its standard error has said nothing yet.`,
      misconception: 'Treating the fitted slope as fixed because the data are fixed. The data are one sample; the slope is what that sample produced, and the next sample produces another one.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 2. Numeric — the SD of b from the formula
// ---------------------------------------------------------------------------------------------

export const slopeSdFormula = defineGenerator({
  id: 'act-9/slope-sd-formula',
  label: 'SD of the sample slope from σ, σₓ and n',
  ap_topics: ['9.1'],
  skills: ['3'],
  generate(rng) {
    const { ctx, sigma, sigmaX, n, sdB, digits } = retry(
      rng,
      (r) => {
        const c = pickContext(r, SLOPE_CONTEXTS)
        const span = c.xRange[1] - c.xRange[0]
        const sx = Math.round((span / Math.sqrt(12)) * r.uniform(0.75, 1.25) * 100) / 100
        const sig = Math.round(c.noise * r.uniform(0.7, 1.5) * 100) / 100
        const size = r.int(8, 40)
        const v = samplingSdMean(sig, size) / sx
        return { ctx: c, sigma: sig, sigmaX: sx, n: size, sdB: v, digits: precisionFor(v, 3) }
      },
      ({ sigma, sigmaX, sdB, digits }) => sigma > 0 && sigmaX > 0 && sdB > 0 && digits >= 2 && digits <= 5,
    )

    return {
      prompt: `Across ${ctx.population}, ${ctx.yVar} varies about the true line with $\\sigma = ${fmt(sigma, 2)}$ ${ctx.yUnits}, and ${ctx.xVar} has SD $\\sigma_x = ${fmt(sigmaX, 2)}$. ${ctx.office} fits a least-squares line to a random sample of **${fmtInt(n)} ${ctx.units}**.\n\nWhat is the **standard deviation of the sample slope b** in repeated samples of this size? Give it to **${precisionWords(digits)}**.`,
      answer: numericAnswer(sdB, 'other', { digits }),
      hints: [
        'The sample slope is a statistic, so it has a sampling distribution: centred at β, with a spread that three things control — how far the response scatters about the line, how widely the explanatory values are spread, and how many points there are.',
        `$\\sigma_b = \\dfrac{\\sigma}{\\sigma_x \\sqrt{n}}$, with $\\sigma = ${fmt(sigma, 2)}$, $\\sigma_x = ${fmt(sigmaX, 2)}$ and $n = ${fmtInt(n)}$.`,
        `Work $\\sqrt{${fmtInt(n)}}$ first, multiply it by ${fmt(sigmaX, 2)}, and divide ${fmt(sigma, 2)} by the result. Round once, at the end.`,
      ],
      solution: `$$\\sigma_b = \\frac{\\sigma}{\\sigma_x\\sqrt{n}} = \\frac{${fmt(sigma, 2)}}{${fmt(sigmaX, 2)} \\times \\sqrt{${fmtInt(n)}}} = \\frac{${fmt(sigma, 2)}}{${fmt(sigmaX * Math.sqrt(n), 3)}} = \\mathbf{${fmt(sdB, digits)}}$$\n\nEach of the three inputs earns its place.\n\n- **$\\sigma$ on top.** The more ${ctx.yVar} scatters about the true line, the less any one file pins the line down.\n- **$\\sigma_x$ underneath.** A long lever is easier to hold steady. ${ctx.units.charAt(0).toUpperCase() + ctx.units.slice(1)} spread across the whole range of ${ctx.xVar} fix the tilt of the line far better than the same number of them bunched together, and doubling $\\sigma_x$ halves $\\sigma_b$.\n- **$\\sqrt{n}$ underneath.** The usual return on sample size: four times the ${ctx.units} for half the spread. Here ${fmtInt(4 * n)} ${ctx.units} would give ${fmt(samplingSdMean(sigma, 4 * n) / sigmaX, digits)}.\n\nIn practice $\\sigma$ is unknown and is estimated by $s = \\sqrt{\\text{SSE}/(n-2)}$, which turns $\\sigma_b$ into the **standard error** SE(b) that computer output prints, and turns z into t on $n - 2$ degrees of freedom.`,
      misconception: 'Dividing by n instead of √n, or leaving σₓ out altogether. The spread of the explanatory column is in the denominator, and it is the one lever an office designing the file actually controls.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 3. Numeric — read a value off the output
// ---------------------------------------------------------------------------------------------

type Reading = 'se' | 's' | 'df'

export const readSlopeOutput = defineGenerator({
  id: 'act-9/read-slope-output',
  label: 'Read SE(b), s or df off regression output',
  ap_topics: ['9.1'],
  skills: ['2'],
  generate(rng) {
    const ask = pickContext(rng, ['se', 's', 'df'] as const) as Reading
    const { ctx, fit, n } = drawSlope(rng, {
      n: [8, 22],
      noiseFactor: [0.7, 1.4],
      accept: (d) => {
        // Every cell a learner could read instead must be a visibly different number.
        const printed = [d.fit.slope, d.fit.seSlope, d.fit.intercept, d.fit.seIntercept, d.fit.s, d.fit.n, d.fit.n - 2]
        for (let i = 0; i < printed.length; i++) {
          for (let j = i + 1; j < printed.length; j++) {
            if (Math.abs(printed[i] - printed[j]) < 0.02 * Math.max(Math.abs(printed[i]), Math.abs(printed[j]), 1e-9)) return false
          }
        }
        return true
      },
    })
    const o = outputReading(fit)
    const sDigits = ctx.interceptDigits + 2

    const value = ask === 'se' ? fit.seSlope : ask === 's' ? fit.s : o.df
    const digits = ask === 'se' ? ctx.digits : ask === 's' ? sDigits : 0
    const asked =
      ask === 'se'
        ? `the **standard error of the slope**, SE(b)`
        : ask === 's'
          ? `**s**, the standard deviation of the residuals`
          : `the **degrees of freedom** the slope procedure carries`

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for a random sample of **${fmtInt(n)} ${ctx.units}** and printed the output below.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nRead ${asked} off this output.${ask === 'df' ? ' Give a whole number.' : ` Give it to **${precisionWords(digits)}**.`}`,
      answer: ask === 'df' ? numericAnswer(o.df, 'count') : numericAnswer(value, 'other', { digits }),
      hints: [
        ask === 'df'
          ? 'The degrees of freedom are not printed in the table. A slope procedure estimates two things from the data before it can measure anything — the intercept and the slope — and each one costs a degree of freedom.'
          : ask === 'se'
            ? 'Two rows, and the one that matters is the predictor row. The Constant row describes where the line crosses the axis, which is not what a slope procedure is about.'
            : 'The residual standard deviation is not in the coefficient table at all. It is the summary line underneath it, and it is in the units of the response.',
        ask === 'df'
          ? `The summary line gives $n = ${fmtInt(n)}$. Count the parameters of the line that had to be estimated from those same rows before a single residual existed, and subtract.`
          : ask === 'se'
            ? `Find the **${ctx.xHeader}** row, then the **SE Coef** column. The Coef column beside it holds b itself, which is a different number.`
            : `The summary line reads \`S = …\`. That is $s = \\sqrt{\\text{SSE}/(n-2)}$, in ${ctx.yUnits}, and SE(b) is computed *from* it as $s/\\sqrt{S_{xx}}$.`,
      ],
      solution:
        ask === 'df'
          ? `$$df = n - 2 = ${fmtInt(n)} - 2 = \\mathbf{${fmtInt(o.df)}}$$\n\nTwo parameters of the line are estimated from the same ${fmtInt(n)} ${ctx.units} before any residual exists — the intercept and the slope — so ${fmtInt(n)} residuals carry only ${fmtInt(o.df)} independent pieces of information about $\\sigma$. That is the same ${fmtInt(o.df)} that divides SSE in $s = \\sqrt{\\text{SSE}/(n-2)}$, and the same ${fmtInt(o.df)} that picks the t curve for every interval and test on this slope.\n\nOn this output the two-sided P of ${fmtP(o.pSlope)} printed beside the slope was read off $t_{${fmtInt(o.df)}}$. The same t on ${fmtInt(o.df + 1)} degrees of freedom would be a different P, which is why the df is worth writing down before anything else.`
          : ask === 'se'
            ? `The **${ctx.xHeader}** row of the output:\n\n| | Coef | SE Coef |\n| --- | --- | --- |\n| ${ctx.xHeader} | ${fmt(fit.slope, ctx.digits)} | ${fmt(fit.seSlope, ctx.digits)} |\n\n$$\\text{SE}(b) = \\mathbf{${fmt(fit.seSlope, ctx.digits)}}$$\n\nSE(b) is the estimated SD of the sample slope: fit another ${fmtInt(n)} ${ctx.units} from ${ctx.population} and the slope would land about ${fmt(fit.seSlope, ctx.digits)} away from this one, give or take. It is built as $s/\\sqrt{S_{xx}}$, with $s = ${fmt(fit.s, sDigits)}$ ${ctx.yUnits} from the summary line.\n\nThe number beside it, ${fmt(fit.slope, ctx.digits)}, is b — the estimate, not its uncertainty. The row above belongs to the intercept and has its own, unrelated, standard error of ${fmt(fit.seIntercept, ctx.interceptDigits)}.`
            : `The summary line under the coefficient table:\n\n\`S = ${fmt(fit.s, sDigits)}\`, so $$s = \\mathbf{${fmt(fit.s, sDigits)}}\\ \\text{${ctx.yUnits}}$$\n\n$s = \\sqrt{\\text{SSE}/(n-2)}$ is the typical size of a residual: a ${ctx.unit} sits about ${fmt(fit.s, sDigits)} ${ctx.yUnits} from the fitted line. It is in the units of ${ctx.yVar}, and it estimates the model's $\\sigma$.\n\nSE(b) is a different quantity in different units — ${fmt(fit.seSlope, ctx.digits)} here, in ${ctx.slopeUnits} — and it is computed from $s$ by dividing by $\\sqrt{S_{xx}}$. Reporting $s$ where SE(b) was asked for is the commonest misreading of this table, and on this output the two differ by a factor of about ${fmt(fit.s / fit.seSlope, 1)}.`,
      misconception:
        ask === 'se'
          ? 'Reading the Coef column, or the Constant row. SE(b) is the SE Coef entry on the predictor row, and nowhere else.'
          : ask === 's'
            ? 'Quoting SE(b) as s. They are different quantities in different units; s describes one observation, SE(b) describes the slope.'
            : 'Using n − 1. A slope procedure estimates two parameters from the data, so it spends two degrees of freedom.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 4. Choice — which cell is SE(b), and where Normal is checked
// ---------------------------------------------------------------------------------------------

export const slopeOutputAndConditions = defineGenerator({
  id: 'act-9/slope-output-and-conditions',
  label: 'SE(b) off the output, and where the Normal condition is checked',
  ap_topics: ['9.1'],
  skills: ['2', '4'],
  generate(rng) {
    const { ctx, fit, n } = drawSlope(rng, {
      n: [8, 22],
      noiseFactor: [0.7, 1.4],
      accept: (d) => {
        const printed = [d.fit.slope, d.fit.seSlope, d.fit.intercept, d.fit.seIntercept, d.fit.s]
        for (let i = 0; i < printed.length; i++) {
          for (let j = i + 1; j < printed.length; j++) {
            if (Math.abs(printed[i] - printed[j]) < 0.03 * Math.max(Math.abs(printed[i]), Math.abs(printed[j]), 1e-9)) return false
          }
        }
        return true
      },
    })
    const sDigits = ctx.interceptDigits + 2

    const cands: Candidate[] = [
      {
        text: `SE(b) = **${fmt(fit.seSlope, ctx.digits)}**, the SE Coef entry on the ${ctx.xHeader} row. The Normal condition is about the **residuals**, and the residual plot described above is what settles it.`,
        correct: true,
        why: null,
      },
      {
        text: `SE(b) = **${fmt(fit.seSlope, ctx.digits)}**, the SE Coef entry on the ${ctx.xHeader} row. The Normal condition is checked by looking at a **histogram of ${ctx.yVar}** and confirming it is roughly symmetric.`,
        correct: false,
        why: `The right cell and the wrong plot. The response is *meant* to be spread out — that spread is the relationship — so a histogram of ${ctx.yVar} across the whole range of ${ctx.xVar} will look wide, or skewed, or two-humped, whatever the residuals do. The model's Normal assumption is about the scatter of ${ctx.yVar} **at each x**, and the residuals are the only view of that a single file affords.`,
      },
      {
        text: `SE(b) = **${fmt(fit.s, sDigits)}**, the \`S\` figure on the summary line. The Normal condition is about the residuals, and the residual plot settles it.`,
        correct: false,
        why: `\`S = ${fmt(fit.s, sDigits)}\` is $s$, the typical distance of one ${ctx.unit} from the line, in ${ctx.yUnits}. SE(b) is the typical distance of a fitted **slope** from β, in ${ctx.slopeUnits}. The output computes the second from the first by dividing by $\\sqrt{S_{xx}}$, and here they differ by a factor of about ${fmt(fit.s / fit.seSlope, 1)}.`,
      },
      {
        text: `SE(b) = **${fmt(fit.seIntercept, ctx.interceptDigits)}**, the SE Coef entry on the Constant row, since the Constant row is the first coefficient the model fits. The Normal condition is checked on the explanatory column, ${ctx.xVar}.`,
        correct: false,
        why: 'Two errors. The Constant row is the intercept and its standard error has nothing to do with the slope. And the model makes no assumption whatsoever about the distribution of the explanatory values: they are treated as given, however they are spread.',
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** drawn at random from ${ctx.population}.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nThe analyst's note under the printout reads: *"Residual plot against fitted values shows no curve and no fan; the residuals are roughly symmetric about zero with no outlier."*\n\n**Which cell of this output is SE(b), and what is the Normal condition checked on?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Two readings and they are independent. One is a coordinate in the table: which row, which column. The other is a question about what the regression model actually assumes is Normal.',
        `The model is $\\mu_y = \\alpha + \\beta x$ with ${ctx.yVar} varying about that line with SD σ. Write down which quantity in the file estimates "varying about that line", and you have the column the Normal condition is checked on.`,
      ],
      solution: `**${options[correct]}**\n\n**The cell.** A regression printout has one row per coefficient. The Constant row describes the intercept; the ${ctx.xHeader} row describes the slope. Within that row, Coef is the estimate (${fmt(fit.slope, ctx.digits)}) and SE Coef is its standard error (${fmt(fit.seSlope, ctx.digits)}). The \`S\` on the summary line is a third quantity again — $s = ${fmt(fit.s, sDigits)}$ ${ctx.yUnits}, the spread of one ${ctx.unit} about the line — and SE(b) is derived from it.\n\n**The condition.** The regression model says that at each value of ${ctx.xVar}, ${ctx.yVar} is Normal about $\\alpha + \\beta x$ with the same SD σ. Nothing is assumed about the marginal distribution of ${ctx.yVar} across all ${fmtInt(n)} ${ctx.units}, and nothing at all is assumed about ${ctx.xVar}. Subtracting the fitted line is what strips the relationship out and leaves the scatter the model is making a claim about, so **the residuals** are what the graph has to be drawn from: a residual plot for linearity and equal SD, and a dotplot, histogram or normal probability plot of the residuals for Normality.\n\nThis matters because a strong relationship makes the response look non-Normal on purpose. Spread ${ctx.units} across the range of ${ctx.xVar} and their ${ctx.yVar} values will be stretched out along the line; the histogram of the response can be flat or two-humped while every residual sits neatly about zero.`,
      misconception: 'Checking Normality on the response, or quoting s as SE(b). The condition lives on the residuals, and SE(b) is the SE Coef entry on the predictor row.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 5. Choice — what moves the SD of b
// ---------------------------------------------------------------------------------------------

export const slopeSpreadDrivers = defineGenerator({
  id: 'act-9/slope-spread-drivers',
  label: 'What n, σ and the spread of x do to the SD of b',
  ap_topics: ['9.1'],
  skills: ['1', '4'],
  generate(rng) {
    const { ctx, sigma, sigmaX, n, base, digits } = retry(
      rng,
      (r) => {
        const c = pickContext(r, SLOPE_CONTEXTS)
        const span = c.xRange[1] - c.xRange[0]
        const sx = Math.round((span / Math.sqrt(12)) * r.uniform(0.8, 1.2) * 100) / 100
        const sig = Math.round(c.noise * r.uniform(0.7, 1.4) * 100) / 100
        const size = r.int(10, 40)
        const v = samplingSdMean(sig, size) / sx
        return { ctx: c, sigma: sig, sigmaX: sx, n: size, base: v, digits: precisionFor(v, 3) }
      },
      ({ base, digits }) => base > 0 && digits >= 2 && digits <= 5,
    )

    const quadN = samplingSdMean(sigma, 4 * n) / sigmaX
    const doubleSigma = samplingSdMean(2 * sigma, n) / sigmaX
    const doubleSx = samplingSdMean(sigma, n) / (2 * sigmaX)
    const show = (v: number) => fmt(v, digits)

    const cands: Candidate[] = [
      {
        text: `Quadrupling n **halves** it, to ${show(quadN)}. Doubling σ **doubles** it, to ${show(doubleSigma)}. Spreading the ${ctx.xVar} values twice as widely **halves** it, to ${show(doubleSx)}.`,
        correct: true,
        why: null,
      },
      {
        text: `Quadrupling n halves it, to ${show(quadN)}. Doubling σ doubles it, to ${show(doubleSigma)}. Spreading the ${ctx.xVar} values twice as widely **doubles** it, to ${show(doubleSigma)} — more scatter in the x column means a less settled fit.`,
        correct: false,
        why: `The spread of x is in the **denominator**, and widening it makes the slope easier to pin down, not harder. Think of the line as a plank on two supports: move the supports apart and the same wobble at each end tilts the plank far less. Bunch every ${ctx.unit} into a narrow band of ${ctx.xVar} and the fit has almost no leverage — which is why a file covering ${fmt(ctx.xRange[0], 0)} to ${fmt(ctx.xRange[1], 0)} buys more than the same number of ${ctx.units} covering a tenth of it.`,
      },
      {
        text: `Quadrupling n **quarters** it, to ${show(base / 4)}. Doubling σ doubles it, to ${show(doubleSigma)}. Spreading the ${ctx.xVar} values twice as widely halves it, to ${show(doubleSx)}.`,
        correct: false,
        why: `Sample size enters through $\\sqrt{n}$, not n. Four times the ${ctx.units} buys a factor of $\\sqrt{4} = 2$, so ${fmtInt(4 * n)} of them give ${show(quadN)} rather than ${show(base / 4)}. Quartering the SD of b would take ${fmtInt(16 * n)} ${ctx.units}.`,
      },
      {
        text: `Quadrupling n halves it, to ${show(quadN)}. Doubling σ **halves** it, to ${show(doubleSx)}, because a wider spread of ${ctx.yVar} gives the fit more to work with. Spreading the ${ctx.xVar} values twice as widely halves it as well.`,
        correct: false,
        why: `σ is the scatter of ${ctx.yVar} **about the line**, not along it. Extra scatter about the line is noise the fit has to see through, and it can only make the slope less certain. Extra spread *along* the line is what widening the ${ctx.xVar} range does, and that is the other term.`,
      },
    ]
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    return {
      prompt: `${ctx.office} draws **${fmtInt(n)} ${ctx.units}** at random from ${ctx.population} and fits ${ctx.yVar} on ${ctx.xVar}. In that population $\\sigma = ${fmt(sigma, 2)}$ ${ctx.yUnits} and $\\sigma_x = ${fmt(sigmaX, 2)}$, so the sample slope has SD\n\n$$\\sigma_b = \\frac{\\sigma}{\\sigma_x\\sqrt{n}} = ${show(base)}.$$\n\nThe office is deciding what to change for next season. **What happens to the SD of the fitted slope?**`,
      answer: { type: 'choice', options, correct, feedback },
      hints: [
        'Take the three levers one at a time and read the formula for each: is the quantity on top or underneath, and does it enter directly or through a square root?',
        'The one worth slowing down on is the spread of the explanatory column. Picture two ships holding a line between them: the further apart they sit, the less a fixed amount of wobble at each end changes the bearing.',
      ],
      solution: `$$\\sigma_b = \\frac{\\sigma}{\\sigma_x\\sqrt{n}}$$\n\n| change | what happens to $\\sigma_b$ | here |\n| --- | --- | --- |\n| $n$: ${fmtInt(n)} → ${fmtInt(4 * n)} | divided by $\\sqrt{4} = 2$ | ${show(base)} → ${show(quadN)} |\n| $\\sigma$: ${fmt(sigma, 2)} → ${fmt(2 * sigma, 2)} | doubled | ${show(base)} → ${show(doubleSigma)} |\n| $\\sigma_x$: ${fmt(sigmaX, 2)} → ${fmt(2 * sigmaX, 2)} | halved | ${show(base)} → ${show(doubleSx)} |\n\n**${options[correct]}**\n\nOnly two of the three are usually the office's to choose. $\\sigma$ is a property of ${ctx.population} and of how well ${ctx.yVar} is measured; nothing about the sampling plan touches it. $n$ and $\\sigma_x$ are design decisions, and of the two, the spread of the ${ctx.xVar} column is the cheaper: doubling it does what quadrupling the file does, for the price of choosing which ${ctx.units} to pull rather than pulling four times as many.\n\nThe warning that goes with it: a file deliberately loaded with extreme values of ${ctx.xVar} buys precision at the cost of leaning the whole fit on a handful of points, and it says nothing about the shape of the relationship in the middle.`,
      misconception: 'Reading the spread of x as noise. Scatter about the line hurts the slope; spread along the x-axis helps it, and the two are easy to run together.',
    }
  },
})

// ---------------------------------------------------------------------------------------------
// 6. Interpretation — the conditions paragraph
// ---------------------------------------------------------------------------------------------

export const slopeConditions = defineGenerator({
  id: 'act-9/slope-conditions',
  label: 'Conditions for inference about a slope',
  ap_topics: ['9.1'],
  skills: ['4'],
  generate(rng) {
    const forInterval = rng.bool()
    const { ctx, fit, n } = drawSlope(rng, {
      contexts: rng.bool() ? CLAIM_CONTEXTS : SLOPE_CONTEXTS,
      n: [10, 24],
      noiseFactor: [0.7, 1.3],
      accept: (d) => {
        const res = slopeTest(d.xs, d.ys, { random: true, populationSize: d.ctx.populationSize })
        // The lesson here is the paragraph, not a failed condition: only clean files.
        return res.conditions.every((c) => c.met)
      },
    })
    const procedure = forInterval ? 't-interval for the slope' : 't-test for the slope'
    const answer = conditionsCheck({
      procedure: 'slope-t',
      random: 'sample',
      n,
      populationSize: ctx.populationSize,
      context: ctx.units,
    })

    return {
      prompt: `${ctx.office} drew **${fmtInt(n)} ${ctx.units}** at random from the ${fmtInt(ctx.populationSize)} ${ctx.population} and regressed ${ctx.yVar} on ${ctx.xVar}.\n\n${outputCaption(ctx)}\n\n${outputMd(fit, ctx)}\n\nThe diagnostics: the scatterplot rises in a straight band; the residual plot against fitted values shows no curve and no widening; a normal probability plot of the residuals is close to straight with no outlier.\n\nWrite the **conditions paragraph** that goes above the ${procedure}. Name each condition and show the numbers that settle it.`,
      answer,
      hints: [
        'Four things have to be said, and each of the last three is a sentence with either a number or a named graph in it: where the data came from, whether the rows can be treated as independent, and what the residuals do.',
        `The sample is ${fmtInt(n)} out of ${fmtInt(ctx.populationSize)}, so the 10% check is ${fmtInt(10 * n)} against ${fmtInt(ctx.populationSize)}. The rest is read off the residual plot and the normal probability plot, never off ${ctx.yVar} itself.`,
        'Three words carry the residual checks: **linear** (no curve), **equal SD** (no fan), **Normal** (the probability plot is close to straight). Say all three, and say which graph each came from.',
      ],
      solution: `**${answer.exemplar}**\n\nThe conditions for a slope procedure are usually said as **LINER**, and four of the five are read off graphs of the residuals rather than of the data.\n\n| condition | what it means here | where it is checked |\n| --- | --- | --- |\n| **L**inear | the mean ${ctx.yVar} really does move along a straight line in ${ctx.xVar} | residual plot: no curve |\n| **I**ndependent | one ${ctx.unit} tells you nothing about the next | the design, plus $10 \\times ${fmtInt(n)} = ${fmtInt(10 * n)} \\le ${fmtInt(ctx.populationSize)}$ |\n| **N**ormal | at each ${ctx.xVar}, ${ctx.yVar} is Normal about the line | normal probability plot of the **residuals** |\n| **E**qual SD | the same σ at every ${ctx.xVar} | residual plot: no fan |\n| **R**andom | the ${fmtInt(n)} ${ctx.units} were drawn at random | how the file was assembled |\n\nThe one worth stating out loud is Normal. The response is supposed to vary across the file — that variation *is* the relationship — so a histogram of ${ctx.yVar} says nothing about the condition. Subtract the fitted line and what is left is the scatter the model makes a claim about.\n\nEqual SD is the quiet one. A residual plot that fans out with the fitted values means σ is not one number, SE(b) is an average of several different spreads, and the interval is too narrow at one end of the range and too wide at the other. It is also the condition most often repaired by changing what the response measures — a total that scales with size, divided by that size, frequently comes out flat.`,
      misconception: 'Checking Normality on the response instead of the residuals, or leaving the 10% arithmetic implicit. Both are worth one mark each and neither takes a sentence.',
    }
  },
})
