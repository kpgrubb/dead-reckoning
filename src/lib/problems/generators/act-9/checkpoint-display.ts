/**
 * act-9/residual-and-normal — the Act IX checkpoint's one display item (map §5, q2).
 *
 * A residual plot against the fitted value, with the normal probability plot of the same residuals
 * tabulated beside it, and one question: which of the conditions for slope inference do these two
 * graphs support? Four draws, one per answer — a clean fit, a curve, a fan, and a single stranded
 * point — so the item cannot be answered by recognising the shape of the correct option.
 *
 * Nothing about the response is shown, deliberately: the mistake this item exists to catch is
 * checking Normal and Equal SD on a graph of y.
 *
 * Owned by the Act lead. The module drills live beside it in sampling-distribution.ts,
 * slope-interval.ts, slope-test.ts and select-procedure.ts.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, pickContext, retry, tableMd } from '@/lib/problems/generate'
import { correlation, fmt, fmtInt, linearRegression, mean, normal, outliers, sd, skewness, type RegressionFit } from '@/lib/stats'
import { SLOPE_CONTEXTS, shuffleChoice, type Candidate, type SlopeContext } from './contexts'

type Defect = 'clean' | 'curve' | 'fan' | 'outlier'

const DEFECTS: readonly Defect[] = ['clean', 'curve', 'fan', 'outlier']

/** Residual SD in the upper half of the fitted range over the lower half. One is flat. */
function residualSdRatio(fit: RegressionFit): number {
  const order = fit.fitted.map((_, i) => i).sort((i, j) => fit.fitted[i] - fit.fitted[j])
  const half = Math.floor(order.length / 2)
  const lo = order.slice(0, half).map((i) => fit.residuals[i])
  const hi = order.slice(order.length - half).map((i) => fit.residuals[i])
  return sd(hi) / sd(lo)
}

/** |corr(residual, squared distance of x from its mean)| — the curvature tell. */
function curvature(fit: RegressionFit, xs: readonly number[]): number {
  const xBar = mean(xs)
  return Math.abs(correlation(xs.map((x) => (x - xBar) ** 2), [...fit.residuals]))
}

/** Blom plotting positions: the z each ordered residual would sit at if the residuals were Normal. */
function normalQuantiles(n: number): number[] {
  return Array.from({ length: n }, (_, i) => normal.quantile((i + 1 - 0.375) / (n + 0.25)))
}

interface Draw {
  ctx: SlopeContext
  n: number
  xs: number[]
  ys: number[]
  fit: RegressionFit
  ratio: number
  curve: number
  outlierCount: number
  worstZ: number
  skew: number
}

function drawDiagnostics(rng: Rng, defect: Defect): Draw {
  return retry(
    rng,
    (r): Draw => {
      const ctx = pickContext(r, SLOPE_CONTEXTS)
      const n = r.int(14, 24)
      const [x0, x1] = ctx.xRange
      const xs = Array.from({ length: n }, () => Math.round(r.uniform(x0, x1) * 10 ** ctx.round) / 10 ** ctx.round)
      const span = x1 - x0
      const xBar = mean(xs)
      const base = ctx.noise
      const ys = xs.map((x) => {
        const line = ctx.intercept + ctx.beta * x
        if (defect === 'fan') return line + r.normal(0, base * (0.35 + (1.9 * (x - x0)) / span))
        if (defect === 'curve') return line + ((2.6 * base) / (span / 2) ** 2) * ((x - xBar) ** 2 - span ** 2 / 12) + r.normal(0, base * 0.45)
        return line + r.normal(0, base * 0.8)
      })
      if (defect === 'outlier') {
        const k = r.int(2, n - 3)
        ys[k] += (r.bool() ? 1 : -1) * base * r.uniform(3.6, 5.0)
      }
      const rounded = ys.map((y) => Math.round(y * 10 ** ctx.round) / 10 ** ctx.round)
      const fit = linearRegression(xs, rounded)
      return {
        ctx,
        n,
        xs,
        ys: rounded,
        fit,
        ratio: residualSdRatio(fit),
        curve: curvature(fit, xs),
        outlierCount: outliers([...fit.residuals]).values.length,
        worstZ: Math.max(...fit.residuals.map((e) => Math.abs(e))) / fit.s,
        skew: skewness([...fit.residuals]),
      }
    },
    (d) => {
      if (!(d.fit.s > 0) || !Number.isFinite(d.ratio) || !(d.ratio > 0)) return false
      if (defect === 'fan') return d.ratio > 2.4 && d.curve < 0.45 && d.outlierCount === 0
      if (defect === 'curve') return d.curve > 0.7 && d.ratio > 0.5 && d.ratio < 2.2
      if (defect === 'outlier') return d.outlierCount === 1 && d.worstZ > 2.6 && d.curve < 0.45
      return d.curve < 0.3 && d.ratio > 0.55 && d.ratio < 1.75 && d.outlierCount === 0 && Math.abs(d.skew) < 0.7
    },
    500,
  )
}

export const residualAndNormal = defineGenerator({
  id: 'act-9/residual-and-normal',
  label: 'Residual plot and normal probability plot',
  ap_topics: ['9.1'],
  skills: ['2', '4'],
  generate(rng) {
    const defect = pickContext(rng, DEFECTS)
    const d = drawDiagnostics(rng, defect)
    const { ctx, fit, n } = d
    const resDigits = ctx.interceptDigits + 1
    const ordered = [...fit.residuals].sort((a, b) => a - b)
    const quantiles = normalQuantiles(n)

    const statement: Record<Defect, string> = {
      clean: `**Linear, Equal SD and Normal residuals are all supported.** The residual plot shows no curve and no fan, the residual spread in the upper half of the fitted range is ${fmt(d.ratio, 2)} times the lower half's, and the normal probability plot is close to straight with no stranded point.`,
      curve: `**Linear fails.** The residuals run negative at both ends of the fitted range and positive through the middle, which is a curved relationship fitted with a straight line. Equal SD and Normal cannot be read off a residual plot that already has a pattern in it.`,
      fan: `**Equal SD fails.** The residual spread grows from left to right: in the upper half of the fitted range it is ${fmt(d.ratio, 2)} times what it is in the lower half. Linear holds, because there is no curve, and the condition that fails is the one about the width of the band rather than its shape.`,
      outlier: `**Normal residuals is in doubt.** One ${ctx.unit} sits ${fmt(d.worstZ, 1)} residual standard deviations off the line and strands the end of the normal probability plot away from the others. Linear and Equal SD hold across the rest of the range.`,
    }

    const why: Record<Defect, string> = {
      clean: `This plot is not clean. ${defect === 'curve' ? 'The residuals bend' : defect === 'fan' ? `The spread grows across the range: ${fmt(d.ratio, 2)} to one between the halves` : `One residual is ${fmt(d.worstZ, 1)} standard deviations out`}, and that is the whole point of drawing it.`,
      curve: `There is no curve here. The correlation between the residuals and the squared distance of ${ctx.xVar} from its mean is ${fmt(d.curve, 2)}, which is the number a bend would make large, and the residuals change sign up and down the range rather than once at each end.`,
      fan: `The spread is not growing. The residual SD in the upper half of the fitted range is ${fmt(d.ratio, 2)} times the lower half's, and a fan worth naming runs well above two.`,
      outlier: `No point is stranded. The largest residual is ${fmt(d.worstZ, 1)} residual standard deviations from the line, which is ordinary on ${fmtInt(n)} ${ctx.units}, and the normal probability plot runs straight to both ends.`,
    }

    const cands: Candidate[] = DEFECTS.map((k) => ({
      text: statement[k],
      correct: k === defect,
      why: k === defect ? null : why[k],
    }))
    const { options, correct, feedback } = shuffleChoice(rng, cands)

    const npTable = tableMd(
      ['ordered residual', ...ordered.map((e) => fmt(e, resDigits))],
      [['theoretical z', ...quantiles.map((z) => fmt(z, 2))]],
    )

    return {
      prompt: `${ctx.office} regressed ${ctx.yVar} on ${ctx.xVar} for **${fmtInt(n)} ${ctx.units}** drawn at random from ${ctx.population}, and printed the diagnostics before the inference.\n\nThe display is the **residual plot against the fitted value**. Below it, the **normal probability plot** of the same residuals, as a table: each ordered residual beside the $z$ it would sit at if the residuals were Normal.\n\n${npTable}\n\nThe fit has $s = ${fmt(fit.s, resDigits)}$ ${ctx.yUnits} on ${fmtInt(n - 2)} degrees of freedom.\n\n**Which reading of these two graphs is the honest one?**`,
      answer: {
        type: 'display' as const,
        display: {
          kind: 'residual' as const,
          points: fit.fitted.map((f, i) => ({ x: f, resid: fit.residuals[i] })),
          xLabel: `fitted ${ctx.yVar} (${ctx.yUnits})`,
        },
        question: { type: 'choice' as const, options, correct, feedback },
      },
      hints: [
        'Three separate questions, one graph each. Does the band of residuals bend; does it keep the same width across the range; and does the normal probability plot run straight.',
        'Take the residual plot left to right rather than looking at it whole. A curve changes the sign of the residuals in a pattern; a fan keeps the sign random and changes the width.',
        `Here the residual SD in the upper half of the fitted range is ${fmt(d.ratio, 2)} times the lower half's, the curvature measure is ${fmt(d.curve, 2)}, and the largest residual is ${fmt(d.worstZ, 1)} residual standard deviations out.`,
      ],
      solution: `**${options[correct]}**\n\n| what is being judged | what settles it | here |\n| --- | --- | --- |\n| Linear | a curve in the residual plot | curvature measure ${fmt(d.curve, 2)} |\n| Equal SD | the width of the residual band across the range | upper half ÷ lower half = ${fmt(d.ratio, 2)} |\n| Normal residuals | the normal probability plot, and stranded points | largest residual ${fmt(d.worstZ, 1)}s, ${fmtInt(d.outlierCount)} outlier(s), skewness ${fmt(d.skew, 2)} |\n| Independent | the design, not a graph | ${fmtInt(n)} ${ctx.units} drawn at random from ${ctx.population} |\n| Random | the sentence describing how the file was assembled | stated |\n\n${
        defect === 'clean'
          ? 'All three graphical conditions hold, so the slope procedure may run. Saying so is still worth a sentence in the brief: a condition nobody mentioned reads as a condition nobody checked.'
          : defect === 'curve'
            ? 'A failed Linear condition is the one that cannot be worked around, because the model being fitted is the wrong model and every number downstream of it describes a line that is not there. The repair is a transformation or a different model, not a larger sample.'
            : defect === 'fan'
              ? 'A fan does not invalidate the fit, but it does mean σ is not one number. SE(b) is then an average of several different spreads, so the interval is too narrow at one end of the range and too wide at the other. The usual repair is a response on a different scale: a total that grows with size, divided by that size, frequently comes out flat.'
              : `One stranded point on ${fmtInt(n)} ${ctx.units} is not a reason to delete it. It is a reason to say where it is, to report the fit with and without it, and to find out what happened to that ${ctx.unit}.`
      }\n\nNo view here is of ${ctx.yVar} itself, and that is deliberate. The regression model never claimed the response was Normal or evenly spread: the responses at large ${ctx.xVar} are supposed to be centred somewhere else from the responses at small ${ctx.xVar}. Pooling them into one histogram can produce any shape at all. Fit the line, then graph what is left over.`,
      misconception: 'Checking Normal and Equal SD on a graph of the response. Both are conditions on the residuals, and a strong relationship makes the response look non-Normal on purpose.',
    }
  },
})
