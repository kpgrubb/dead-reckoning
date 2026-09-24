/**
 * Act VII datasets — "Halden Reach" (docs/beat-sheet.md §2, Act VII blocks).
 *
 *   DS-11  The Refit set (Adlinda uprate logs). Twelve Sulcus hulls through a Mk 3 "drive uprate"
 *          2181–83: post-refit reactor output against the 588 kN specification, and the Ledger's
 *          Mark-9 delay for the run immediately before and the run immediately after. Nine of the
 *          twelve are among the nineteen; three are honest hulls that were uprated and kept flying
 *          the 3.00-mgee profile. Small, paired, honest.
 *   DS-12  Nightjar's own sink refit. Eight matched cold profiles (Quiet ×3, Watch ×4, Standby ×1)
 *          run by Sandoval before and after the Halden Reach refit, endurance in hours.
 *   DS-09  (imported read-only from `@/instruments/act-5/data`) the Transit Ledger: 2,612 transits,
 *          Perrine 900 / other 1,712, 31 losses, `mark9Delay` in days. Act VII never re-derives it.
 *   DS-02  (imported read-only from `@/instruments/act-2/data`) the nineteen's hidden-truth
 *          profiles: which of them were uprated, and the thrust-limited lateness each one carries.
 *
 * THE ACT'S SPINE (gate review B1). The Refit set read as **paired** differences gives a mean shift
 * of about 1.9 days with t ≈ 3.9 on 11 df; the identical numbers read as **two independent samples**
 * give t ≈ 1.7 and a p-value that fails at the learner's α. Neither number may drift: the seed
 * search below rejects any draw that does not produce both.
 *
 * Everything Act VII asserts is computed here from `@/lib/stats`; nothing in this file is a typed-in
 * result. The headline targets `data.test.ts` pins:
 *
 *   DS-11 output       mean ≈ 612 kN (+4.1% on the 588 kN spec); one-sample t vs spec ≈ 12
 *   DS-11 paired       mean difference ≈ 1.9 d, s_d ≈ 1.8, t ≈ 3.9, df 11, p ≈ 0.002
 *   DS-11 two-sample   t ≈ 1.7, p ≈ 0.10 on the same twenty-four numbers — "nothing"
 *   DS-12 Watch        paired loss ≈ 8.9 h against the design mean (67.7 → 59.0), t ≈ 8, df 3
 *   DS-12 all eight    ≈ −13% of design endurance (the sink lost 10 of its 78 GJ)
 *   DS-09 nineteen     mean delay ≈ 2.8 d against the profile's zero; one-sample t ≈ 4.5, df 18
 *   DS-09 Ostrow       all 900 Perrine vs all 1,712 others: difference ≈ 0.25 d, SE ≈ 0.11,
 *                      power ≈ 0.12 against the nineteen's 0.055 d excess (one-sided, α = 0.05)
 *   DS-09 lost/surv    lost Perrine (19) vs surviving Perrine (881): ≈ 2.6 d, SE 0.62, t ≈ 4.2,
 *                      Welch df ≈ 18, 95% interval ≈ (1.3, 3.9) d
 *   DS-09 surv/other   surviving Perrine (881) vs others (1,712): interval contains 0
 *
 * Determinism: every draw goes through `@/lib/rng` with fixed string seeds, and a deterministic seed
 * search picks the first attempt that reproduces those targets, so both sets are identical on every
 * load and in every module.
 */
import { rng } from '@/lib/rng'
import {
  bootstrapMean,
  mean,
  normal,
  oneMeanInterval,
  oneMeanTest,
  pairedDifferences,
  pairedTInterval,
  pairedTTest,
  sd,
  twoMeanInterval,
  twoMeanTest,
  welchDf,
  type Alternative,
  type InferenceResult,
} from '@/lib/stats'
import { nineteenProfiles, type DivertedProfile } from '@/instruments/act-2/data'
import {
  LANE_DELAY_MEAN,
  LANE_DELAY_SD,
  NINETEEN_N,
  OTHER_N,
  PERRINE_N,
  divertedTransits,
  ledger,
  nineteenDelays,
  type OwnerClass,
  type Transit,
} from '@/instruments/act-5/data'

export type { Transit, OwnerClass }
export { ledger, nineteenDelays, LANE_DELAY_MEAN, LANE_DELAY_SD, NINETEEN_N, PERRINE_N, OTHER_N }

// ---------------------------------------------------------------------------------------------
// DS-11 · The Refit set (Adlinda uprate logs, 2181–83)
// ---------------------------------------------------------------------------------------------

/** The Mk 3 drive's certified thrust, kN. Every output figure in Act VII is read against it. */
export const MK3_SPEC_KN = 588

/** The uprate's design target, kN — 4.1% over spec (DS-00). */
export const UPRATE_MEAN_KN = 612
const UPRATE_SD_KN = 7

/**
 * Three Sulcus hulls that went through the same Adlinda uprate and then flew the Lane honestly.
 * They are the control inside the Refit set: an uprated hull that carries nothing extra still flies
 * the 3.00-mgee profile, so its delay does not move.
 */
const HONEST_UPRATED_HULLS = ['Erech Sulcus', 'Akkad Sulcus', 'Nippur Sulcus'] as const

export interface RefitRecord {
  hull: string
  /** ISO date the yard signed the uprate off. */
  refit_date: string
  /** Bureau post-refit thrust certification, kN (spec 588). */
  output_kN: number
  /** Mark-9 delay on the run immediately before the uprate, days. */
  delay_before: number
  /** Mark-9 delay on the run immediately after, days. */
  delay_after: number
  /** True for the nine hulls the Register later carries as lost — the Act II +10–13% tier. */
  among_19: boolean
  /** Hidden truth: undeclared mass as a fraction of declared on the post-refit run. Tests only. */
  hiddenMass: number
}

/** The nine uprated hulls among the nineteen, in the order Act II generated them. */
const upratedProfiles: DivertedProfile[] = nineteenProfiles.filter((p) => p.uprated)

/**
 * The Bureau's thrust certifications and the Ledger's delays are two separate columns of the yard's
 * file, so they are drawn from two independent seed streams and searched independently. Searching
 * one joint rule over both would need tens of thousands of attempts at module load for no gain.
 */
function drawOutputs(attempt: number): number[] {
  const r = rng('DS-11-output', attempt)
  return Array.from({ length: upratedProfiles.length + HONEST_UPRATED_HULLS.length }, () => Math.round(r.normal(UPRATE_MEAN_KN, UPRATE_SD_KN) * 10) / 10)
}

function outputIssues(outputs: number[]): string[] {
  const out: string[] = []
  const m = mean(outputs)
  if (m < 611.4 || m > 612.8) out.push(`mean output ${m.toFixed(1)} not ≈ 612 kN`)
  const excess = (m - MK3_SPEC_KN) / MK3_SPEC_KN
  if (excess < 0.0398 || excess > 0.0422) out.push(`output ${(excess * 100).toFixed(2)}% over spec, not ≈ 4.1%`)
  const t = oneMeanTest(outputs, { mu0: MK3_SPEC_KN, alt: 'greater' })
  if (t.statistic < 11.3 || t.statistic > 12.8) out.push(`output t ${t.statistic.toFixed(2)} not ≈ 12`)
  if (oneMeanInterval(outputs, { confidence: 0.95 }).ci![0] <= MK3_SPEC_KN) out.push('output interval must exclude the 588 kN specification')
  const s = sd(outputs)
  if (outputs.some((v) => Math.abs(v - m) > 2.6 * s)) out.push('an output reading that far out would show as an outlier on twelve')
  return out
}

interface DelayDraw {
  before: number[]
  after: number[]
}

function drawDelays(attempt: number): DelayDraw {
  const r = rng('DS-11-delay', attempt)
  const before: number[] = []
  const after: number[] = []
  const thrustDelays = upratedProfiles.map((p) => p.thrustDelay).concat(HONEST_UPRATED_HULLS.map(() => 0))
  for (const d of thrustDelays) {
    // The hull's persistent filing offset (DS-00): Perrine hulls file a hair slow.
    const offset = r.normal(0.2, 2.5)
    before.push(Math.round((offset + r.normal(0, 0.9)) * 100) / 100)
    after.push(Math.round((offset + d + r.normal(0, 0.9)) * 100) / 100)
  }
  return { before, after }
}

function delayIssues({ before, after }: DelayDraw): string[] {
  const out: string[] = []

  // The spine (gate review B1). Paired: a real shift. Two-sample on the same numbers: nothing.
  const paired = pairedTTest(after, before, { alt: 'greater' })
  if (paired.estimate < 1.80 || paired.estimate > 2.02) out.push(`paired mean difference ${paired.estimate.toFixed(2)} not ≈ 1.9 d`)
  if (sd(paired.differences) < 1.60 || sd(paired.differences) > 1.85) out.push(`s_d ${sd(paired.differences).toFixed(2)} not ≈ 1.8 d`)
  if (paired.statistic < 3.8 || paired.statistic > 4.05) out.push(`paired t ${paired.statistic.toFixed(2)} not ≈ 3.9`)
  if (paired.pValue! > 0.005) out.push(`paired p ${paired.pValue!.toFixed(4)} must clear α = 0.01 comfortably`)

  // The same twenty-four numbers as two independent samples. The registry quotes t ≈ 1.7, p ≈ 0.10;
  // that p is the two-sided one, which is what the calculator's 2-SampTTest returns by default and
  // what an analyst with no prior direction would run. The one-sided reading must also fail at 0.05.
  const two = twoMeanTest(after, before, { alt: 'two-sided' })
  const twoGreater = twoMeanTest(after, before, { alt: 'greater' })
  if (two.statistic < 1.62 || two.statistic > 1.80) out.push(`two-sample t ${two.statistic.toFixed(2)} not ≈ 1.7`)
  if (two.pValue! < 0.085 || two.pValue! > 0.125) out.push(`two-sample two-sided p ${two.pValue!.toFixed(4)} not ≈ 0.10`)
  if (twoGreater.pValue! < 0.05) out.push(`two-sample one-sided p ${twoGreater.pValue!.toFixed(4)} must FAIL at α = 0.05 — that gap is the lesson`)

  // Both t-procedures need a small-sample normality check that passes on the differences and on
  // each column, or the module would be teaching a procedure whose conditions it cannot state.
  const d = pairedDifferences(after, before)
  for (const [name, xs] of [['differences', d], ['before', before], ['after', after]] as const) {
    const m = mean(xs)
    const s = sd(xs)
    if (xs.some((v) => Math.abs(v - m) > 2.6 * s)) out.push(`${name}: a value that far out would read as an outlier on a dotplot of twelve`)
  }
  return out
}

function search<T>(label: string, draw: (attempt: number) => T, issues: (v: T) => string[], attempts = 6000): { value: T; attempt: number } {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const v = draw(attempt)
    if (issues(v).length === 0) return { value: v, attempt }
  }
  throw new Error(`${label}: no seed satisfied the acceptance rule in ${attempts} attempts`)
}

const outputSearch = search('DS-11 output', drawOutputs, outputIssues)
const delaySearch = search('DS-11 delay', drawDelays, delayIssues, 30_000)

const refitMeta = (() => {
  const r = rng('DS-11-meta', 1)
  const hulls = upratedProfiles.map((p) => ({ hull: p.hull, among_19: true, hiddenMass: p.h })).concat(HONEST_UPRATED_HULLS.map((hull) => ({ hull, among_19: false, hiddenMass: 0 })))
  return hulls.map((h) => ({ ...h, refit_date: `218${r.int(1, 3)}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}` }))
})()

/** DS-11 — the Adlinda refit logs as the lead fitter forwarded them. Twelve rows, refit date order. */
export const refitSet: readonly RefitRecord[] = refitMeta
  .map((m, i) => ({
    hull: m.hull,
    refit_date: m.refit_date,
    output_kN: outputSearch.value[i],
    delay_before: delaySearch.value.before[i],
    delay_after: delaySearch.value.after[i],
    among_19: m.among_19,
    hiddenMass: m.hiddenMass,
  }))
  .sort((a, b) => a.refit_date.localeCompare(b.refit_date) || a.hull.localeCompare(b.hull))
/** Which attempts of `rng('DS-11-output'|'DS-11-delay', …)` were accepted (the tests' audit trail). */
export const REFIT_SEED_ATTEMPT = { output: outputSearch.attempt, delay: delaySearch.attempt }
export const REFIT_COLUMNS = ['hull', 'refit_date', 'output_kN', 'delay_before', 'delay_after'] as const

export const refitOutputs: number[] = refitSet.map((h) => h.output_kN)
export const refitDelayBefore: number[] = refitSet.map((h) => h.delay_before)
export const refitDelayAfter: number[] = refitSet.map((h) => h.delay_after)
/** after − before, one number per hull: the sample a paired procedure actually runs on. */
export const refitDifferences: number[] = pairedDifferences(refitDelayAfter, refitDelayBefore)

export const REFIT_N = refitSet.length
/** Nine of the twelve turn up in the Register as lost hulls. */
export const refitAmong19: readonly RefitRecord[] = refitSet.filter((h) => h.among_19)
export const refitHonest: readonly RefitRecord[] = refitSet.filter((h) => !h.among_19)

// --- act-7-02 · the reactor-output interval ---------------------------------------------------

/** The one-sample t-interval for mean post-refit output, kN. The census of the yard's twelve. */
export function outputInterval(confidence = 0.95): InferenceResult {
  return oneMeanInterval(refitOutputs, { confidence, random: true })
}
export const OUTPUT_INTERVAL = outputInterval(0.95)
/** One-sided t-test of mean output against the Mk 3 specification. */
export const OUTPUT_TEST = oneMeanTest(refitOutputs, { mu0: MK3_SPEC_KN, alt: 'greater', random: true })
/** Mean output as a percentage over the 588 kN specification (≈ 4.1%). */
export const OUTPUT_EXCESS_PCT = (mean(refitOutputs) - MK3_SPEC_KN) / MK3_SPEC_KN

// --- act-7-04 · the paired case, and the two-sample reading that finds nothing -----------------

/** Paired t-test on the Refit set, one-sided: did the same hulls get slower after the uprate? */
export function refitPairedTest(alt: Alternative = 'greater'): InferenceResult & { differences: number[] } {
  return pairedTTest(refitDelayAfter, refitDelayBefore, { alt, random: true })
}
export const REFIT_PAIRED = refitPairedTest('greater')
export const REFIT_PAIRED_TWO_SIDED = refitPairedTest('two-sided')
export function refitPairedInterval(confidence = 0.95): InferenceResult & { differences: number[] } {
  return pairedTInterval(refitDelayAfter, refitDelayBefore, { confidence, random: true })
}
export const REFIT_PAIRED_INTERVAL = refitPairedInterval(0.95)

/**
 * The same twenty-four numbers thrown away as two independent samples. This is the wrong answer,
 * and it is the one Ebele reaches for. Default two-sided, which is what `2-SampTTest` returns
 * unless the learner changes μ₁: ≠ μ₂, and the reading the registry's "t ≈ 1.7, p ≈ 0.10" quotes.
 */
export function refitTwoSampleTest(alt: Alternative = 'two-sided'): InferenceResult {
  return twoMeanTest(refitDelayAfter, refitDelayBefore, { alt, random: true })
}
export const REFIT_TWO_SAMPLE = refitTwoSampleTest('two-sided')
/** The one-sided reading of the same two samples. It fails at α = 0.05 too. */
export const REFIT_TWO_SAMPLE_GREATER = refitTwoSampleTest('greater')
export function refitTwoSampleInterval(confidence = 0.95): InferenceResult {
  return twoMeanInterval(refitDelayAfter, refitDelayBefore, { confidence, random: true })
}
export const REFIT_TWO_SAMPLE_INTERVAL = refitTwoSampleInterval(0.95)

/** SE paired against SE two-sample — the one line that explains the whole contrast. */
export const PAIRED_SE = REFIT_PAIRED.se
export const TWO_SAMPLE_SE = REFIT_TWO_SAMPLE.se

// ---------------------------------------------------------------------------------------------
// DS-12 · Nightjar's own sink refit (8 matched cold profiles)
// ---------------------------------------------------------------------------------------------

/** Sink capacity as designed and after the Halden Reach refit, GJ (DS-05). */
export const SINK_GJ_DESIGN = 78
export const SINK_GJ_REFIT = 68

export type ColdProfile = 'Quiet' | 'Watch' | 'Standby'

/** Nominal internal-plus-skin load for each cold profile, kW (DS-05). */
export const PROFILE_LOAD_KW: Record<ColdProfile, number> = { Quiet: 190, Watch: 320, Standby: 670 }
/** SD of the total load, kW — the six independent subsystems of DS-05 (√386 ≈ 19.6 on Watch). */
const PROFILE_LOAD_SD_KW: Record<ColdProfile, number> = { Quiet: 7, Watch: 19.6, Standby: 24 }
/**
 * The shakedown found the yard's Quiet curve about 5% optimistic; Watch and Standby measured on the
 * book. Act 0 taught this, and DS-05 carries it, so the Quiet rows here are scaled by it.
 */
const PROFILE_CURVE_FACTOR: Record<ColdProfile, number> = { Quiet: 0.947, Watch: 1, Standby: 1 }

/** GJ ÷ kW → hours. */
const enduranceHours = (capacityGJ: number, loadKW: number, factor: number) => ((capacityGJ * 1e9) / (loadKW * 1000) / 3600) * factor

/** The eight profiles the yard specified, in the order Sandoval ran them. */
const SINK_RUN_PLAN: ColdProfile[] = ['Quiet', 'Watch', 'Standby', 'Watch', 'Quiet', 'Watch', 'Quiet', 'Watch']

export interface ColdProfileRun {
  run_id: string
  profile: ColdProfile
  /** Logged total load on the run, kW. */
  load_kW: number
  /** Endurance to saturation before the refit, hours. */
  before_h: number
  /** Endurance to saturation after the refit, hours. */
  after_h: number
}

function drawSinkRefit(attempt: number): ColdProfileRun[] {
  const r = rng('DS-12', attempt)
  return SINK_RUN_PLAN.map((profile, i) => {
    const load = r.normal(PROFILE_LOAD_KW[profile], PROFILE_LOAD_SD_KW[profile])
    // The same profile re-run after the refit draws its own load within the same envelope.
    const loadAfter = load + r.normal(0, PROFILE_LOAD_SD_KW[profile] * 0.6)
    const f = PROFILE_CURVE_FACTOR[profile]
    return {
      run_id: `CP-${String(21 + i * 3).padStart(2, '0')}`,
      profile,
      load_kW: Math.round(load * 10) / 10,
      before_h: Math.round((enduranceHours(SINK_GJ_DESIGN, load, f) + r.normal(0, 0.3)) * 100) / 100,
      after_h: Math.round((enduranceHours(SINK_GJ_REFIT, loadAfter, f) + r.normal(0, 0.3)) * 100) / 100,
    }
  })
}

function sinkIssues(runs: ColdProfileRun[]): string[] {
  const out: string[] = []
  if (runs.length !== 8) out.push(`sink refit has ${runs.length} runs, not 8`)
  const watch = runs.filter((x) => x.profile === 'Watch')
  if (watch.length !== 4) out.push('four of the eight must be Watch profiles')

  const loss = pairedTTest(
    watch.map((x) => x.before_h),
    watch.map((x) => x.after_h),
    { alt: 'greater' },
  )
  if (loss.estimate < 8.8 || loss.estimate > 9.05) out.push(`Watch loss ${loss.estimate.toFixed(2)} h not ≈ 8.9 h`)
  if (loss.statistic < 7 || loss.statistic > 10) out.push(`Watch paired t ${loss.statistic.toFixed(2)} not ≈ 8`)
  if (loss.se < 0.85 || loss.se > 1.25) out.push(`Watch SE ${loss.se.toFixed(2)} not ≈ 1 h — the Chief's "give or take one"`)

  // Every run lost capacity; none of them gained any. A gain would be a broken instrument.
  if (runs.some((x) => x.after_h >= x.before_h)) out.push('a profile that gained endurance after the refit')

  const pct = runs.map((x) => (x.after_h - x.before_h) / x.before_h)
  if (mean(pct) < -0.145 || mean(pct) > -0.115) out.push(`mean percentage loss ${(mean(pct) * 100).toFixed(1)}% not ≈ −13%`)

  // The pre-refit Watch runs must sit on the design mean the Chief quotes (67.7 h), not beside it.
  const before = mean(watch.map((x) => x.before_h))
  if (before < 65.5 || before > 70) out.push(`pre-refit Watch mean ${before.toFixed(1)} h not ≈ 67.7 h`)
  const after = mean(watch.map((x) => x.after_h))
  if (after < 57.5 || after > 60.5) out.push(`post-refit Watch mean ${after.toFixed(1)} h not ≈ 59 h`)

  // The Quiet runs must sit on the shakedown-corrected curve the Chief has worked to since Act 0.
  const quiet = runs.filter((x) => x.profile === 'Quiet')
  const quietBefore = mean(quiet.map((x) => x.before_h))
  if (quietBefore < 105 || quietBefore > 111) out.push(`pre-refit Quiet mean ${quietBefore.toFixed(1)} h not ≈ 108 h`)
  return out
}

const sinkSearch = search('DS-12', drawSinkRefit, sinkIssues)

/** DS-12 — Sandoval's eight matched cold profiles, before and after the Halden Reach refit. */
export const sinkRefit: readonly ColdProfileRun[] = sinkSearch.value
export const SINK_SEED_ATTEMPT = sinkSearch.attempt
export const SINK_COLUMNS = ['run_id', 'profile', 'load_kW', 'before_h', 'after_h'] as const

export const watchRuns: readonly ColdProfileRun[] = sinkRefit.filter((x) => x.profile === 'Watch')
export const watchBefore: number[] = watchRuns.map((x) => x.before_h)
export const watchAfter: number[] = watchRuns.map((x) => x.after_h)
/** Hours lost on each Watch run: before − after, so the loss reads positive. */
export const watchLosses: number[] = pairedDifferences(watchBefore, watchAfter)

/** The paired t-test behind Sandoval's "nine hours against the book". */
export const SINK_WATCH_TEST = pairedTTest(watchBefore, watchAfter, { alt: 'greater', random: true })
export function sinkWatchInterval(confidence = 0.95): InferenceResult & { differences: number[] } {
  return pairedTInterval(watchBefore, watchAfter, { confidence, random: true })
}
export const SINK_WATCH_INTERVAL = sinkWatchInterval(0.95)

/** All eight profiles expressed as a fraction of design endurance — mixed loads, one scale. */
export const sinkPercentLoss: number[] = sinkRefit.map((x) => (x.after_h - x.before_h) / x.before_h)
export const SINK_PERCENT_TEST = oneMeanTest(sinkPercentLoss, { mu0: 0, alt: 'less', random: true })
export const SINK_PERCENT_INTERVAL = oneMeanInterval(sinkPercentLoss, { confidence: 0.95, random: true })

/** The Chief's figures, before and after (DS-05): design mean, and mean − 1 SD "to work to". */
export const WATCH_DESIGN_BEFORE_H = enduranceHours(SINK_GJ_DESIGN, PROFILE_LOAD_KW.Watch, 1)
export const WATCH_DESIGN_AFTER_H = enduranceHours(SINK_GJ_REFIT, PROFILE_LOAD_KW.Watch, 1)

// ---------------------------------------------------------------------------------------------
// DS-09 · The Ledger, read as means (act-7-03, 7-05, 7-06, 7-07)
// ---------------------------------------------------------------------------------------------

const perrineTransits: readonly Transit[] = ledger.filter((t) => t.ownerClass === 'Perrine')
const otherTransits: readonly Transit[] = ledger.filter((t) => t.ownerClass !== 'Perrine')
const survivingPerrine: readonly Transit[] = perrineTransits.filter((t) => !t.diverted)

/** All 900 Perrine transits' Mark-9 delays — the left column of Ostrow's slate. */
export const perrineDelays: number[] = perrineTransits.map((t) => t.mark9Delay)
/** All 1,712 other-owner transits. */
export const otherDelays: number[] = otherTransits.map((t) => t.mark9Delay)
/** The 881 Perrine hulls that arrived. */
export const survivingPerrineDelays: number[] = survivingPerrine.map((t) => t.mark9Delay)
/** The nineteen that did not, re-exported under the name Act VII uses for them. */
export const lostPerrineDelays: number[] = divertedTransits.map((t) => t.mark9Delay)

export const SURVIVING_PERRINE_N = survivingPerrine.length

// --- act-7-03 · the one-sample t on the nineteen, and the dismantling of Ostrow's pooling -------

/** The procedure the module teaches: the nineteen's own delays against the filed profile's zero. */
export const NINETEEN_TEST = oneMeanTest(lostPerrineDelays, { mu0: 0, alt: 'greater', random: true })
export function nineteenInterval(confidence = 0.95): InferenceResult {
  return oneMeanInterval(lostPerrineDelays, { confidence, random: true })
}
export const NINETEEN_INTERVAL = nineteenInterval(0.95)

/**
 * Ostrow's comparison exactly as he ran it: every Perrine transit against every other transit.
 *
 * NOTE FOR MODULE TEXT. His claim is about **magnitude** — "within a day of the Lane mean" — and
 * it is true: the gap is about a quarter of a day, most of which is the Perrine fleet's filing
 * offset that Act V already established. Do not present this result's p-value as "not significant";
 * on 2,612 transits a quarter-day gap is detectable, and that is beside his point and ours. The
 * dismantling in 7-03 is the SE of the comparison and the power it had against the nineteen's
 * diluted 0.055 d excess, not a rival p-value.
 */
export const OSTROW_TEST = twoMeanTest(perrineDelays, otherDelays, { alt: 'greater', random: true })
export function ostrowInterval(confidence = 0.95): InferenceResult {
  return twoMeanInterval(perrineDelays, otherDelays, { confidence, random: true })
}
export const OSTROW_INTERVAL = ostrowInterval(0.95)
/** ≈ 0.25 d — the Perrine fleet's filing offset plus nineteen hulls' excess spread over nine hundred. */
export const OSTROW_DIFFERENCE = OSTROW_TEST.estimate
/** ≈ 0.11 d. */
export const OSTROW_SE = OSTROW_TEST.se

/** The nineteen's excess, diluted across the 900 Perrine transits: 19 × d̄ / 900 ≈ 0.055 d. */
export const NINETEEN_EXCESS_DILUTED = (NINETEEN_N * (mean(lostPerrineDelays) - mean(survivingPerrineDelays))) / PERRINE_N

export interface TwoMeanPower {
  power: number
  /** P(Type II error). */
  beta: number
  alpha: number
  /** The observed difference the test would need to see before it rejects. */
  rejectAbove: number
  se: number
  /** The difference the power is computed against. */
  effect: number
}

/**
 * Power of a two-sample comparison of means against a stated effect, at a stated SE.
 *
 * `@/lib/stats` provides `powerZTestMean` for the one-sample case only, so the two-group case is
 * assembled here from the same two library pieces it uses: the standard normal quantile for the
 * rejection cutoff and the standard normal tail for the area beyond it. With 900 and 1,712 transits
 * the t distribution is the normal to four decimals, which is why the z form is honest here — the
 * module says so. (A `powerTwoMeanTest` in `src/lib/stats/inference.ts` would be the right home;
 * see the Act VII report's shared-change requests.)
 */
export function powerTwoMean({ effect, se, alpha = 0.05, alt = 'greater' }: { effect: number; se: number; alpha?: number; alt?: Alternative }): TwoMeanPower {
  if (alt === 'two-sided') {
    const cut = normal.standardQuantile(1 - alpha / 2) * se
    const power = normal.sf((cut - effect) / se) + normal.cdf((-cut - effect) / se)
    return { power, beta: 1 - power, alpha, rejectAbove: cut, se, effect }
  }
  const cut = normal.standardQuantile(1 - alpha) * se
  const power = normal.sf((cut - effect) / se)
  return { power, beta: 1 - power, alpha, rejectAbove: cut, se, effect }
}

/** ≈ 0.12 — what Ostrow's comparison could have done against the excess it was looking for. */
export const OSTROW_POWER = powerTwoMean({ effect: NINETEEN_EXCESS_DILUTED, se: OSTROW_SE, alpha: 0.05, alt: 'greater' })

/** Power as a function of how many of the 900 carry the nineteen's excess — the module's slider. */
export function ostrowPowerAgainst(divertedCount: number, alpha = 0.05): TwoMeanPower {
  const perHull = mean(lostPerrineDelays) - mean(survivingPerrineDelays)
  return powerTwoMean({ effect: (divertedCount * perHull) / PERRINE_N, se: OSTROW_SE, alpha, alt: 'greater' })
}

/** How many of the 900 would have to be this late before Ostrow's comparison had a fair chance. */
export function divertedCountForPower(target: number, alpha = 0.05): number {
  for (let k = NINETEEN_N; k <= PERRINE_N; k++) if (ostrowPowerAgainst(k, alpha).power >= target) return k
  return PERRINE_N
}

// --- act-7-05 / 7-06 · the two independent samples ---------------------------------------------

/** Surviving Perrine hulls against everyone else. The interval that contains zero. */
export function survivingVsOtherInterval(confidence = 0.95, dfMethod: 'welch' | 'conservative' = 'welch'): InferenceResult {
  return twoMeanInterval(survivingPerrineDelays, otherDelays, { confidence, dfMethod, random: true })
}
export const SURVIVING_VS_OTHER_INTERVAL = survivingVsOtherInterval(0.95)
export const SURVIVING_VS_OTHER_TEST = twoMeanTest(survivingPerrineDelays, otherDelays, { alt: 'two-sided', random: true })

/** Lost Perrine hulls against surviving Perrine hulls. The interval that does not. */
export function lostVsSurvivingInterval(confidence = 0.95, dfMethod: 'welch' | 'conservative' = 'welch'): InferenceResult {
  return twoMeanInterval(lostPerrineDelays, survivingPerrineDelays, { confidence, dfMethod, random: true })
}
export const LOST_VS_SURVIVING_INTERVAL = lostVsSurvivingInterval(0.95)
/** act-7-06 — the test dual of that interval: same two samples, now a decision. */
export function lostVsSurvivingTest(alt: Alternative = 'greater', dfMethod: 'welch' | 'conservative' = 'welch'): InferenceResult {
  return twoMeanTest(lostPerrineDelays, survivingPerrineDelays, { alt, dfMethod, random: true })
}
export const LOST_VS_SURVIVING_TEST = lostVsSurvivingTest('greater')
/** The conservative-df reading of the same test, for the df drill and the calculator screen. */
export const LOST_VS_SURVIVING_CONSERVATIVE = lostVsSurvivingTest('greater', 'conservative')
export const LOST_VS_SURVIVING_WELCH_DF = welchDf(sd(lostPerrineDelays), lostPerrineDelays.length, sd(survivingPerrineDelays), survivingPerrineDelays.length)

// --- act-7-07 · bootstrap beside the t-interval -------------------------------------------------

/**
 * A percentile bootstrap interval for the nineteen's mean delay, for the robustness check in 7-07.
 * Deterministic in the seed; the point of the display is that it agrees with the t-interval.
 */
export function bootstrapNineteen(seed: string | number = 'brief', reps = 2000, confidence = 0.95) {
  return bootstrapMean(lostPerrineDelays, { rng: rng('act-7/bootstrap', seed), reps, confidence })
}

/** The five procedures 7-07's selector chooses between. */
export const PROCEDURES = [
  { id: 'one-prop', label: 'One-proportion z' },
  { id: 'two-prop', label: 'Two-proportion z' },
  { id: 'one-mean', label: 'One-sample t' },
  { id: 'paired', label: 'Paired t' },
  { id: 'two-mean', label: 'Two-sample t' },
] as const
export type ProcedureId = (typeof PROCEDURES)[number]['id']

export interface ProcedureQuestion {
  id: string
  /** The question as the brief asks it. */
  question: string
  /** What was measured on each unit, and how the units are grouped. */
  structure: string
  procedure: ProcedureId
  /** Interval when the question asks "how much", test when it asks "is there evidence". */
  form: 'interval' | 'test'
  /** Why, in one sentence, for the selector's feedback. */
  because: string
}

/** The findings the inference brief assembles, each with the procedure that produced it. */
export const BRIEF_FINDINGS: ProcedureQuestion[] = [
  {
    id: 'loss-rate',
    question: 'Do Perrine-beneficiary hulls fail at a higher rate than everyone else on the Lane?',
    structure: 'One categorical outcome (lost or arrived) recorded on two independent groups of transits.',
    procedure: 'two-prop',
    form: 'test',
    because: 'Two independent groups, a yes/no outcome, and the question asks whether there is evidence of a difference.',
  },
  {
    id: 'lane-rate',
    question: 'How large is the Lane loss rate, with a margin?',
    structure: 'One categorical outcome recorded on one group of 2,612 transits.',
    procedure: 'one-prop',
    form: 'interval',
    because: 'One group, a yes/no outcome, and the question asks for a magnitude rather than a decision.',
  },
  {
    id: 'reactor-output',
    question: 'Is the mean post-refit reactor output above the 588 kN specification?',
    structure: 'One quantitative measurement on each of twelve hulls; one group; σ unknown.',
    procedure: 'one-mean',
    form: 'interval',
    because: 'One group, a quantitative measurement, and a claim about where the mean sits relative to a fixed number.',
  },
  {
    id: 'refit-delay',
    question: 'Did the uprate change how late these hulls run?',
    structure: 'Two quantitative measurements on the SAME twelve hulls, before and after.',
    procedure: 'paired',
    form: 'test',
    because: 'The two columns are the same hulls, so the pairs are the units and the differences are one sample.',
  },
  {
    id: 'lost-vs-surviving',
    question: 'Do lost Perrine hulls run later, on average, than surviving Perrine hulls?',
    structure: 'One quantitative measurement on each transit; two groups with no pairing between them.',
    procedure: 'two-mean',
    form: 'test',
    because: 'Different hulls in the two groups and no way to match them one to one, so the samples are independent.',
  },
]

/** Populations the brief's conclusions are about — the scope statement 7-06 and 7-07 insist on. */
export const LANE_POPULATION = 'Perrine-owned transits on the Hundred-Day Lane, 2178–84'
