/**
 * act-5-checkpoint · the "interpret this display" item (blueprint q2). AP 5.4, reviewing act-5-01.
 *
 *   act-5/checkpoint-estimator-display   display + multi
 *
 * A simulated sampling distribution of one of Ebele's patrol statistics, stacked over many
 * repetitions, with the true value it is estimating printed on the axis label and in the prompt. The
 * learner must answer both halves of the blueprint item at once: **is the estimator biased, and which
 * way** — and **what happens to its variability when n grows**. The two halves are independent, which
 * is the point of the item: only one of them answers to sample size.
 *
 * The stack is built with `simulatePatrols` from the Act's own dataset, so the machine the checkpoint
 * shows is literally the machine act-5-01 built. Estimator and patrol size both vary across seeds.
 */
import type { Rng } from '@/lib/rng'
import { defineGenerator, pickContext, retry } from '@/lib/problems/generate'
import { mean, sd } from '@/lib/stats'
import { fmt, fmtInt } from '@/lib/stats/format'
import { PATROL_STATISTIC_LABEL, isRateStatistic, patrolTruth, simulatePatrols, type PatrolStatistic } from '@/instruments/act-5/data'

type BiasDirection = 'none' | 'low' | 'high'

interface CheckpointEstimator {
  stat: PatrolStatistic
  bias: BiasDirection
  /** What the statistic is being used to estimate, in words. */
  target: string
  /** Decimals the axis is read to. */
  digits: number
  /** One sentence on why the stack centres where it does. */
  reason: string
}

const ESTIMATORS: readonly CheckpointEstimator[] = [
  {
    stat: 'rate',
    bias: 'none',
    target: "the Lane's true loss rate",
    digits: 4,
    reason: 'Every transit in the Ledger is equally likely to be drawn, so the share of losses in a window is right on average: it misses high about as often as low, and by about as much.',
  },
  {
    stat: 'meanDelay',
    bias: 'none',
    target: "the Lane's true mean Mark 9 delay",
    digits: 3,
    reason: 'A sample mean drawn at random from the Ledger is an unbiased estimator of the Ledger mean — that is what "unbiased" means, and it is why x̄ is the statistic every later Act is built on.',
  },
  {
    stat: 'minOfTwo',
    bias: 'low',
    target: "the Lane's true loss rate",
    digits: 4,
    reason: "Each patrol on its own is unbiased, but reporting whichever of two came out lower discards every draw that landed high. The minimum of two honest estimates sits below the truth far more often than above it — and that is a property of the rule, not of the patrol size.",
  },
  {
    stat: 'maxOfTwo',
    bias: 'high',
    target: "the Lane's true loss rate",
    digits: 4,
    reason: 'Each patrol on its own is unbiased, but reporting whichever of two came out higher discards every draw that landed low, so the statistic centres above the truth at every patrol size.',
  },
] as const

const VERDICT_TEXT: Record<BiasDirection, string> = {
  none: 'The estimator is **unbiased**: over many repetitions the stack centres on the true value.',
  low: 'The estimator is **biased low**: over many repetitions the stack centres below the true value.',
  high: 'The estimator is **biased high**: over many repetitions the stack centres above the true value.',
}

export const checkpointEstimatorDisplay = defineGenerator({
  id: 'act-5/checkpoint-estimator-display',
  label: 'Read an estimator off its sampling distribution',
  ap_topics: ['5.4'],
  skills: ['3', '4'],
  generate(rng) {
    const est = pickContext(rng, ESTIMATORS)
    const truth = patrolTruth(est.stat)
    const reps = 50 * rng.int(4, 6)
    const n = 25 * rng.int(6, 14)
    const stack = retry(
      rng,
      (r: Rng) => simulatePatrols(r, est.stat, n, reps),
      (xs) => {
        if (sd(xs) <= 0 || new Set(xs).size < 5) return false
        const off = mean(xs) - truth
        const se = sd(xs) / Math.sqrt(xs.length)
        if (est.bias === 'none') return Math.abs(off) < 2.2 * se
        if (est.bias === 'low') return off < -3 * se
        return off > 3 * se
      },
    )
    const centre = mean(stack)
    const spread = sd(stack)
    const off = centre - truth
    const noise = spread / Math.sqrt(reps)
    const unit = isRateStatistic(est.stat) ? '' : ' d'

    const cands: { text: string; correct: boolean; why: string | null }[] = [
      {
        text: VERDICT_TEXT.none,
        correct: est.bias === 'none',
        why:
          est.bias === 'none'
            ? null
            : `Compare the centre with the truth. The ${fmtInt(reps)} values average ${fmt(centre, est.digits)}${unit} against a true ${fmt(truth, est.digits)}${unit} — an offset of ${fmt(off, est.digits)}${unit}, far outside the simulation's own noise of about ${fmt(noise, est.digits + 1)}.`,
      },
      {
        text: VERDICT_TEXT.low,
        correct: est.bias === 'low',
        why: est.bias === 'low' ? null : `The stack does not sit below the truth. It averages ${fmt(centre, est.digits)}${unit} against ${fmt(truth, est.digits)}${unit}, an offset of ${fmt(off, est.digits)}${unit}.`,
      },
      {
        text: VERDICT_TEXT.high,
        correct: est.bias === 'high',
        why: est.bias === 'high' ? null : `The stack does not sit above the truth. It averages ${fmt(centre, est.digits)}${unit} against ${fmt(truth, est.digits)}${unit}, an offset of ${fmt(off, est.digits)}${unit}.`,
      },
      {
        text: `Taking **four times** as many transits in each patrol would roughly **halve** the spread of this stack.`,
        correct: true,
        why: null,
      },
      {
        text: `Taking **four times** as many transits in each patrol would move the **centre** of this stack onto the true value.`,
        correct: false,
        why:
          est.bias === 'none'
            ? `The centre is already on the true value, so there is nothing for a larger patrol to move. Sample size acts on the spread and on nothing else.`
            : `It would not. The offset of ${fmt(off, est.digits)}${unit} comes from the rule for computing the statistic, not from how many transits it is computed on — quadruple the patrol and the stack simply gets narrower around the same wrong centre.`,
      },
      {
        text: `The spread of this stack does not depend on the patrol size at all — it is set by how much the Lane itself varies.`,
        correct: false,
        why: `The Lane's own variability sets the numerator; the patrol size sets the denominator. The spread of a statistic over repeated patrols falls like $1/\\sqrt{n}$, which is exactly why the previous option is true.`,
      },
    ]
    const shuffled = rng.shuffle(cands)
    const options = shuffled.map((c) => c.text)
    const correct = shuffled.map((c, i) => (c.correct ? i : -1)).filter((i) => i >= 0)
    const feedback = shuffled.map((c) => c.why)

    return {
      prompt: `Ebele's sampling machine, run on the Lane Authority's Transit Ledger **${fmtInt(reps)} times**. Each repetition draws ${est.stat === 'minOfTwo' || est.stat === 'maxOfTwo' ? `two independent patrols of ${fmtInt(n)} transits` : `one patrol of ${fmtInt(n)} transits`} at random and records **the ${PATROL_STATISTIC_LABEL[est.stat]}**.\n\nThat statistic is being used to estimate ${est.target}. The Ledger is complete, so the true value is known exactly: **${fmt(truth, est.digits)}${unit}**.\n\nSelect **every** statement that is true of the display below.`,
      answer: {
        type: 'display',
        display: {
          kind: 'histogram',
          values: stack,
          binWidth: spread / 2,
          label: `the ${PATROL_STATISTIC_LABEL[est.stat]}, ${fmtInt(reps)} repetitions at n = ${fmtInt(n)} — the true value is ${fmt(truth, est.digits)}${unit}`,
        },
        question: { type: 'multi', options, correct, feedback },
      },
      hints: [
        'Two separate questions, and the display answers them separately. **Where** does the stack centre, compared with the true value printed on the axis? And **how wide** is it — what would change that width?',
        `The ${fmtInt(reps)} values average ${fmt(centre, est.digits)}${unit} with a spread of ${fmt(spread, est.digits)}${unit}; the truth is ${fmt(truth, est.digits)}${unit}. A simulation of ${fmtInt(reps)} runs pins the centre down to about ${fmt(noise, est.digits + 1)}, so decide whether the gap you see is more than noise before you call it bias.`,
        `Then ask what a bigger patrol does. The spread of a statistic over repeated patrols of size $n$ carries a $\\sqrt{n}$ in its denominator; the centre carries no $n$ at all.`,
      ],
      solution: `$$\\text{centre} = ${fmt(centre, est.digits)}, \\qquad \\text{truth} = ${fmt(truth, est.digits)}, \\qquad \\text{offset} = ${fmt(off, est.digits)}, \\qquad \\text{spread} = ${fmt(spread, est.digits)}$$\n\n${correct.map((i) => options[i]).join('\n\n')}\n\n${est.reason}\n\nThe simulation itself only locates the centre to about ${fmt(noise, est.digits + 1)} (the spread ${fmt(spread, est.digits)} divided by $\\sqrt{${reps}}$), so ${est.bias === 'none' ? `an offset of ${fmt(off, est.digits)} is exactly what an unbiased estimator looks like after ${fmtInt(reps)} runs.` : `an offset of ${fmt(off, est.digits)} is far too large to be the machine's own noise.`}\n\nAnd the second half is independent of the first. Four times the transits divides the spread by $\\sqrt{4} = 2$ — ${fmt(spread, est.digits)} would become about ${fmt(spread / 2, est.digits)} — and leaves the centre precisely where the rule for computing the statistic put it. **$n$ buys precision, never aim.**`,
      misconception: 'Answering only one half of the question, or expecting a larger patrol to repair a biased estimator. Bias is an offset in the centre of the sampling distribution and n cannot touch it; variability is the width, and n is the only thing that moves it.',
    }
  },
})
