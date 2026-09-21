/**
 * Act IV datasets — "Running Cold". Generated once, deterministically, from the beat-sheet registry
 * (docs/beat-sheet.md §2) and the DS-21 sink ledger (§2, "Act IV sink ledger").
 *
 *   DS-21  the sink ledger: torch off MET 83/11 at 6%, seven purges, two Watch windows      → every module
 *   DS-05  the Chief's tables: capacity, profiles, the six Watch subsystem loads            → 4-05, 4-06, 4-07
 *   DS-06  the Sweep log (own-ship, ~1,400 sweeps) AND the being-seen close-pass model      → 4-02 … 4-10
 *   DS-07  Lane arrivals at Mark 9 (rates, as hourly Bernoulli trials)                      → 4-06, 4-08, 4-10
 *   DS-01  the Register's fade pattern × outcome (100 resolved dropouts, 19 + 12 losses)    → 4-01, 4-03, 4-04
 *   DS-09  the Transit Ledger's loss × owner class (19/900 vs 12/1,712)                     → 4-04, 4-09
 *   DS-08  the two baselines the Board and the 2176 Asgard report chose                     → 4-09
 *
 * Every draw goes through `rng('DS-xx', attempt)`; a candidate seed is REJECTED unless the registry's
 * headline numbers hold, and the first accepted attempt is the dataset, forever. Nothing here rounds —
 * `src/instruments/act-4/data.test.ts` asserts the registry numbers against full precision.
 *
 * THE HEAT BUDGET IS THE ACT'S SPINE. Every module's MET, profile and sink percentage comes from
 * `sinkAt()` below, so the eleven modules cannot drift apart arithmetically.
 *
 * Read-only for later Acts: import from '@/instruments/act-4/data'.
 */
import { rng, type Rng } from '@/lib/rng'
import { binomial, discreteRV, normal, rvProb, type DiscreteRV } from '@/lib/stats'
import { losses as registerLosses, register as registerRecords, gradualFades, maxClusterIn } from '@/instruments/act-1/data'

// =================================================================================================
// MET arithmetic
// =================================================================================================

/** Mission elapsed time as fractional days. `met(83, 11)` → 83.4583… */
export function met(day: number, hour = 0, minute = 0): number {
  return day + hour / 24 + minute / 1440
}

/** "MET 083/11:00" for a fractional-day MET. */
export function metStamp(t: number): string {
  const day = Math.floor(t + 1e-9)
  const totalMin = Math.round((t - day) * 1440)
  const hour = Math.floor(totalMin / 60)
  const minute = totalMin % 60
  return `MET ${String(day).padStart(3, '0')}/${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** Hours between two METs. */
export function hoursBetween(a: number, b: number): number {
  return (b - a) * 24
}

// =================================================================================================
// DS-05 · the Chief's tables (capacity, profiles, subsystem loads)
// =================================================================================================

/** Sink capacity as designed, in gigajoules (60 t of lithium). 68 GJ only after the Halden Reach refit (Act VII). */
export const SINK_CAPACITY_GJ = 78

/** Cold-profile loads in kW (DS-05). The Act IV ledger runs on these design loads. */
export const PROFILE_LOAD_KW = { quiet: 190, watch: 320, standby: 670 } as const
export type Profile = keyof typeof PROFILE_LOAD_KW

/** A purge takes 2.6 h with the wings out and leaves the cellar at 5%. */
export const PURGE_HOURS = 2.6
export const PURGE_FLOOR_PCT = 5

/** Sink percentage consumed per hour at a given load. 320 kW → 1.4769 %/h → 67.7 h from empty. */
export function pctPerHour(loadKw: number): number {
  return (loadKw * 3.6e-3 * 100) / SINK_CAPACITY_GJ
}

/** Endurance in hours from 0% at a given load: 78 GJ ÷ load. */
export function enduranceHours(loadKw: number): number {
  return 100 / pctPerHour(loadKw)
}

/** The six independent Watch-profile subsystem loads (kW, mean ± SD) — DS-05. */
export interface Subsystem {
  id: string
  name: string
  meanKw: number
  sdKw: number
  note: string
}

export const WATCH_SUBSYSTEMS: readonly Subsystem[] = [
  { id: 'life', name: 'life support', meanKw: 60, sdKw: 6, note: 'scrubbers, water loop, atmosphere — the load that never goes to zero' },
  { id: 'computing', name: 'computing & sensor processing', meanKw: 110, sdKw: 15, note: 'the Eyes and everything behind them; the biggest load and the loosest' },
  { id: 'comms', name: 'comms', meanKw: 12, sdKw: 3, note: 'receive only when cold; the transmitter is a beacon' },
  { id: 'cryo', name: 'cryocooler (skin) loops', meanKw: 70, sdKw: 8, note: 'holds the skin at 120 K against the parasol' },
  { id: 'pumps', name: 'pumps & misc', meanKw: 40, sdKw: 6, note: 'lithium circulation, valves, trim' },
  { id: 'hotel', name: 'hotel (16 people)', meanKw: 28, sdKw: 4, note: 'galley, lighting, the crew themselves' },
] as const

/** 320 kW. */
export const WATCH_MEAN_KW = WATCH_SUBSYSTEMS.reduce((s, x) => s + x.meanKw, 0)
/** 386 kW². Variances add. */
export const WATCH_VARIANCE = WATCH_SUBSYSTEMS.reduce((s, x) => s + x.sdKw * x.sdKw, 0)
/** √386 ≈ 19.65 kW — the right answer. */
export const WATCH_SD_KW = Math.sqrt(WATCH_VARIANCE)
/** Ebele's wrong answer: the sum of the SDs, 42 kW (too pessimistic). */
export const NAIVE_SUM_OF_SDS_KW = WATCH_SUBSYSTEMS.reduce((s, x) => s + x.sdKw, 0)
/** The yard's spec-sheet margin, ±8 kW, quoted as if the six errors averaged out (too generous). */
export const YARD_MARGIN_KW = 8

/** The load that saturates the sink in exactly `hours` hours from empty. 64 h → 338.5 kW; 60 h → 361.1 kW. */
export function loadForEndurance(hours: number): number {
  return (SINK_CAPACITY_GJ * 100) / (hours * 3.6e-3 * 100)
}

/** The Chief's working figure (mean − 1 SD of endurance) and the figure she will put in writing (− 2 SD). */
export const WATCH_WORKING_HOURS = 64
export const WATCH_IN_WRITING_HOURS = 60

/** P(the Watch load saturates the cellar before 64 h) ≈ 0.17, and before 60 h ≈ 0.02 — DS-05. */
export const P_SATURATE_BEFORE_64 = normal.sf(loadForEndurance(WATCH_WORKING_HOURS), WATCH_MEAN_KW, WATCH_SD_KW)
export const P_SATURATE_BEFORE_60 = normal.sf(loadForEndurance(WATCH_IN_WRITING_HOURS), WATCH_MEAN_KW, WATCH_SD_KW)

/** Endurance on the design Watch mean: 78 GJ ÷ 320 kW = 67.7 h, SD ≈ 4.2 h. */
export const WATCH_DESIGN_HOURS = enduranceHours(WATCH_MEAN_KW)
export const WATCH_DESIGN_SD_HOURS = (WATCH_DESIGN_HOURS * WATCH_SD_KW) / WATCH_MEAN_KW
/** Quiet: 114 h on the design load; the shakedown found the curve ~5% optimistic, so the Chief quotes 108. */
export const QUIET_DESIGN_HOURS = enduranceHours(PROFILE_LOAD_KW.quiet)
export const QUIET_MEASURED_HOURS = 108

/** Purge visibility (DS-05): naval-grade sensors at 0.55 AU, civilian-grade at 2.6 million km. */
export const PURGE_NAVAL_AU = 0.55
export const PURGE_CIVILIAN_KM = 2.6e6
/** Cold *Nightjar*: naval-grade at 3.7 million km, civilian at 370,000 km. */
export const COLD_NAVAL_KM = 3.7e6
export const COLD_CIVILIAN_KM = 370_000

// =================================================================================================
// DS-21 · the Act IV sink ledger
// =================================================================================================

export type LedgerKind = 'quiet' | 'watch' | 'purge'

export interface LedgerSegment {
  kind: LedgerKind
  /** Window label for the two Watch windows ('window 1' / 'window 2'), else undefined. */
  window?: 1 | 2
  from: number
  to: number
  hours: number
  /** Realized load in kW (a purge has no load — the wings are out and the cellar is emptying). */
  loadKw: number
  startPct: number
  endPct: number
}

/** Torch off at the Mark 9 region — the Act opens here. */
export const TORCH_OFF = met(83, 11)
export const TORCH_OFF_PCT = 6
/** The MET 106 report closes the Act. */
export const ACT_END = met(106, 0)

/** The purges, by the MET at which the wings go out. Seven events; six of them inside the loiter proper. */
export const PURGE_STARTS = [met(86, 0), met(88, 6), met(91, 2), met(95, 12), met(99, 12), met(102, 15), met(105, 10)] as const

/** The two Watch windows (DS-21). Window 1 is 62 h; window 2 is 64 h — the Chief's limit. */
export const WINDOW_1 = { from: met(88, 12), to: met(91, 2) } as const
export const WINDOW_2 = { from: met(102, 18), to: met(105, 10) } as const

/** MV *Marius Regio* turns 34 h into the second window. */
export const MARIUS_MET = met(104, 3, 50)

interface LedgerBuild {
  segments: LedgerSegment[]
  watchLoads: [number, number]
  attempt: number
}

/**
 * Build the ledger for a pair of realized Watch-window loads. Quiet runs at the DS-05 design load
 * (190 kW); each Watch window draws its own realized load from N(320, √386) — which is exactly the
 * random variable 4-07 is about, and why the two windows run 62 h and 64 h to the same 97%.
 */
function buildLedger(watchLoads: [number, number]): LedgerSegment[] {
  const boundaries: { at: number; kind: LedgerKind; window?: 1 | 2 }[] = []
  for (const p of PURGE_STARTS) boundaries.push({ at: p, kind: 'purge' }, { at: p + PURGE_HOURS / 24, kind: 'quiet' })
  boundaries.push({ at: WINDOW_1.from, kind: 'watch', window: 1 }, { at: WINDOW_1.to, kind: 'quiet' })
  boundaries.push({ at: WINDOW_2.from, kind: 'watch', window: 2 }, { at: WINDOW_2.to, kind: 'quiet' })
  boundaries.push({ at: TORCH_OFF, kind: 'quiet' })
  // A purge and a Watch window can end on the same MET (91/02, 105/10). The hotter order wins, and
  // only one boundary survives per instant, or the ledger silently drops a purge.
  const rank = { purge: 0, watch: 1, quiet: 2 } as const
  boundaries.sort((a, b) => a.at - b.at || rank[a.kind] - rank[b.kind])
  const unique = boundaries.filter((b, i) => i === 0 || b.at > boundaries[i - 1].at + 1e-9)

  const segments: LedgerSegment[] = []
  let pct = TORCH_OFF_PCT
  for (let i = 0; i < unique.length; i++) {
    const from = unique[i].at
    const to = i + 1 < unique.length ? unique[i + 1].at : ACT_END
    if (to <= from + 1e-9) continue
    const kind = unique[i].kind
    const window = unique[i].window
    const hours = hoursBetween(from, to)
    const loadKw = kind === 'purge' ? 0 : kind === 'watch' ? watchLoads[(window ?? 1) - 1] : PROFILE_LOAD_KW.quiet
    const startPct = pct
    const endPct = kind === 'purge' ? PURGE_FLOOR_PCT : startPct + hours * pctPerHour(loadKw)
    segments.push({ kind, window, from, to, hours, loadKw, startPct, endPct })
    pct = endPct
  }
  return segments
}

function ledgerIssues(segments: LedgerSegment[]): string[] {
  const bad: string[] = []
  const w1 = segments.find((s) => s.window === 1)!
  const w2 = segments.find((s) => s.window === 2)!
  // Both windows close at the registry's 97%.
  if (!(w1.endPct >= 96 && w1.endPct <= 98)) bad.push(`window 1 ends at ${w1.endPct.toFixed(1)}%`)
  if (!(w2.endPct >= 96 && w2.endPct <= 98)) bad.push(`window 2 ends at ${w2.endPct.toFixed(1)}%`)
  // Marius Regio at 34 h into window 2 sits near 55%.
  const marius = w2.startPct + hoursBetween(w2.from, MARIUS_MET) * pctPerHour(w2.loadKw)
  if (!(marius >= 51 && marius <= 58)) bad.push(`Marius Regio at ${marius.toFixed(1)}%`)
  // The cellar never saturates: the whole point of the plan.
  for (const s of segments) if (s.endPct > 99.5) bad.push(`${metStamp(s.from)} reaches ${s.endPct.toFixed(1)}%`)
  // Both realized loads must be ordinary draws from the Watch distribution.
  for (const s of [w1, w2]) if (Math.abs(s.loadKw - WATCH_MEAN_KW) > 2 * WATCH_SD_KW) bad.push(`load ${s.loadKw.toFixed(0)} kW is more than 2 SD out`)
  return bad
}

function searchLedger(): LedgerBuild {
  for (let attempt = 0; attempt < 600; attempt++) {
    const r: Rng = rng('DS-21', 'watch-loads', attempt)
    const loads: [number, number] = [r.normal(WATCH_MEAN_KW, WATCH_SD_KW), r.normal(WATCH_MEAN_KW, WATCH_SD_KW)]
    const segments = buildLedger(loads)
    if (ledgerIssues(segments).length === 0) return { segments, watchLoads: loads, attempt }
  }
  throw new Error('DS-21: no acceptable Watch-load draw — loosen the acceptance rule')
}

const LEDGER_BUILD = searchLedger()

/** The Act IV sink ledger, segment by segment, MET 83/11 → MET 106. */
export const SINK_LEDGER: readonly LedgerSegment[] = LEDGER_BUILD.segments
export const LEDGER_SEED_ATTEMPT = LEDGER_BUILD.attempt
/** The realized Watch load in each window, kW. Both are ordinary draws from N(320, 19.65). */
export const WINDOW_LOADS_KW: readonly [number, number] = LEDGER_BUILD.watchLoads

/** Sink percentage at any MET in the Act. During a purge the cellar empties linearly over 2.6 h. */
export function sinkAt(t: number): number {
  if (t <= TORCH_OFF) return TORCH_OFF_PCT
  const seg = SINK_LEDGER.find((s) => t >= s.from - 1e-9 && t <= s.to + 1e-9) ?? SINK_LEDGER[SINK_LEDGER.length - 1]
  const f = Math.min(1, Math.max(0, hoursBetween(seg.from, t) / seg.hours))
  return seg.startPct + f * (seg.endPct - seg.startPct)
}

/** The profile the ship is on at a MET. */
export function profileAt(t: number): LedgerKind {
  const seg = SINK_LEDGER.find((s) => t >= s.from - 1e-9 && t < s.to) ?? SINK_LEDGER[SINK_LEDGER.length - 1]
  return seg.kind
}

/** One row per module: the header stamp the block carries, and the sink it implies. */
export interface ModuleHeat {
  module: string
  at: number
  profile: LedgerKind
  sinkPct: number
}

export const MODULE_HEAT: readonly ModuleHeat[] = (
  [
    ['act-4-01', met(83, 14)],
    ['act-4-02', met(84, 12)],
    ['act-4-03', met(85, 12)],
    ['act-4-04', met(86, 12)],
    ['act-4-05', met(87, 12)],
    ['act-4-06', met(88, 10)],
    ['act-4-07', met(89, 12)],
    // The last ten minutes of window 1: the wings go out at 91/02 and the purge owns that instant.
    ['act-4-08', met(91, 1, 50)],
    ['act-4-09', met(95, 12)],
    ['act-4-10', MARIUS_MET],
  ] as [string, number][]
).map(([module, at]) => ({ module, at, profile: profileAt(at), sinkPct: sinkAt(at) }))

export const heatFor = (module: string): ModuleHeat => MODULE_HEAT.find((m) => m.module === module)!

/** Total hours the wings were out across the Act — seven purges at 2.6 h each. */
export const PURGE_COUNT = PURGE_STARTS.length
export const PURGE_HOURS_TOTAL = PURGE_COUNT * PURGE_HOURS
/** The loiter, MET 83/11 → MET 106, in days. */
export const LOITER_DAYS = ACT_END - TORCH_OFF

// =================================================================================================
// DS-06 (a) · the Sweep log — own-ship, ~1,400 scheduled one-degree sweeps over the loiter
// =================================================================================================

export type SweepMode = 'thermal' | 'optical' | 'RF'
export type RangeBand = 'near' | 'middle' | 'far'

export interface Sweep {
  sweep_id: string
  /** Fractional-day MET. */
  met: number
  /** 1–12, the Lane sectors the Eyes walk. */
  sector: number
  dwell_s: number
  range_band: RangeBand
  detection: boolean
  /** Exactly one mode per detected entry; `null` when the sweep found nothing. */
  mode: SweepMode | null
  sink_pct: number
  /** True when this entry is the focused re-sweep the previous detection triggered. */
  resweep: boolean
}

/** DS-06 generating story: base 0.06 after a clean sweep, 0.55 after a detection in the same sector. */
export const SWEEP_P_FRESH = 0.06
export const SWEEP_P_AFTER_DETECTION = 0.55
export const SWEEP_MODE_SPLIT: Record<SweepMode, number> = { thermal: 0.7, optical: 0.22, RF: 0.08 }
export const SWEEP_COUNT = 1400
export const SWEEP_SECTORS = 12

function drawSweeps(r: Rng): Sweep[] {
  const out: Sweep[] = []
  let sector = 1
  let prevDetected = false
  const span = ACT_END - TORCH_OFF
  for (let i = 0; i < SWEEP_COUNT; i++) {
    const t = TORCH_OFF + (span * (i + 0.5)) / SWEEP_COUNT
    const p = prevDetected ? SWEEP_P_AFTER_DETECTION : SWEEP_P_FRESH
    const detection = r.bool(p)
    const mode: SweepMode | null = detection ? (['thermal', 'optical', 'RF'] as SweepMode[])[r.weightedIndex([SWEEP_MODE_SPLIT.thermal, SWEEP_MODE_SPLIT.optical, SWEEP_MODE_SPLIT.RF])] : null
    out.push({
      sweep_id: `SW-${String(i + 1).padStart(4, '0')}`,
      met: t,
      sector,
      dwell_s: r.int(8, 40),
      range_band: (['near', 'middle', 'far'] as RangeBand[])[r.weightedIndex([0.34, 0.41, 0.25])],
      detection,
      mode,
      sink_pct: sinkAt(t),
      resweep: prevDetected,
    })
    // A detection buys the same sector another look; otherwise the Eyes walk on.
    sector = detection ? sector : (sector % SWEEP_SECTORS) + 1
    prevDetected = detection
  }
  return out
}

function sweepIssues(s: Sweep[]): string[] {
  const bad: string[] = []
  const det = s.filter((x) => x.detection)
  const marginal = det.length / s.length
  if (!(marginal > 0.1 && marginal < 0.135)) bad.push(`marginal detection rate ${marginal.toFixed(3)}`)
  // Consecutive-sweep table must read ≈ 0.55 against ≈ 0.06.
  const after = s.filter((x) => x.resweep)
  const clean = s.filter((x, i) => i > 0 && !x.resweep)
  const pAfter = after.filter((x) => x.detection).length / after.length
  const pClean = clean.filter((x) => x.detection).length / clean.length
  if (!(pAfter > 0.5 && pAfter < 0.6)) bad.push(`P(detect | previous detected) = ${pAfter.toFixed(3)}`)
  if (!(pClean > 0.05 && pClean < 0.07)) bad.push(`P(detect | previous clean) = ${pClean.toFixed(3)}`)
  // Mode split, among detections.
  const thermal = det.filter((x) => x.mode === 'thermal').length / det.length
  if (!(thermal > 0.62 && thermal < 0.78)) bad.push(`thermal share ${thermal.toFixed(3)}`)
  if (det.filter((x) => x.mode === 'RF').length < 5) bad.push('too few RF detections to make a four-outcome sample space')
  return bad
}

function searchSweeps(): { sweeps: Sweep[]; attempt: number } {
  for (let attempt = 0; attempt < 400; attempt++) {
    const sweeps = drawSweeps(rng('DS-06', 'sweeps', attempt))
    if (sweepIssues(sweeps).length === 0) return { sweeps, attempt }
  }
  throw new Error('DS-06: no acceptable sweep log — loosen the acceptance rule')
}

const SWEEP_BUILD = searchSweeps()
export const sweeps: readonly Sweep[] = SWEEP_BUILD.sweeps
export const SWEEP_SEED_ATTEMPT = SWEEP_BUILD.attempt

/** The four mutually exclusive outcomes of one sweep entry, with their counts — 4-02's sample space. */
export const SWEEP_OUTCOMES = ['thermal', 'optical', 'RF', 'nothing'] as const
export type SweepOutcome = (typeof SWEEP_OUTCOMES)[number]

export const sweepOutcomeCounts: Record<SweepOutcome, number> = {
  thermal: sweeps.filter((s) => s.mode === 'thermal').length,
  optical: sweeps.filter((s) => s.mode === 'optical').length,
  RF: sweeps.filter((s) => s.mode === 'RF').length,
  nothing: sweeps.filter((s) => !s.detection).length,
}

export const sweepOutcomeProbs: Record<SweepOutcome, number> = {
  thermal: sweepOutcomeCounts.thermal / SWEEP_COUNT,
  optical: sweepOutcomeCounts.optical / SWEEP_COUNT,
  RF: sweepOutcomeCounts.RF / SWEEP_COUNT,
  nothing: sweepOutcomeCounts.nothing / SWEEP_COUNT,
}

/** P(a sweep detects something) — the complement of "nothing". */
export const P_SWEEP_DETECTS = 1 - sweepOutcomeProbs.nothing

/** The consecutive-sweep 2×2: previous entry's detection × this entry's detection (4-04). */
export const consecutiveCounts: number[][] = (() => {
  const t = [
    [0, 0],
    [0, 0],
  ]
  for (let i = 1; i < sweeps.length; i++) {
    const prev = sweeps[i - 1].detection ? 0 : 1
    const now = sweeps[i].detection ? 0 : 1
    t[prev][now] += 1
  }
  return t
})()
export const CONSECUTIVE_ROWS = ['previous sweep detected', 'previous sweep clean'] as const
export const CONSECUTIVE_COLS = ['this sweep detects', 'this sweep clean'] as const

// =================================================================================================
// DS-06 (b) · the being-seen model — the one that matters for the heat plan
// =================================================================================================

/**
 * Nobody at Kettle can see a cold hull or a purge from 0.3 AU. The loiter's exposure is Lane traffic:
 * the plot is public, so Ebele knows every hull whose scheduled track makes a close pass (inside
 * 2.6 million km) of a loiter point during a window. Passes are independent — different hulls,
 * scheduled — which is exactly what own-ship re-sweeps are not.
 */
export const CLOSE_PASS_KM = 2.6e6
/** Close passes per 64-h Watch window, by loiter point. */
export const CLOSE_PASSES: Record<RangeBand, number> = { near: 12, middle: 4, far: 1 }
/** P(a freighter's nav sensors detect a cold *Nightjar*) per close pass. */
export const P_SEEN_PER_PASS_COLD = 0.02
/** P(detect | *Nightjar* is purging during the pass) — a coin the ship does not get to weight. */
export const P_SEEN_PER_PASS_PURGING = 0.6

/** P(≥ 1 detection in a window while cold) at a loiter point: 0.21 / 0.08 / 0.02. */
export function pSeenInWindow(band: RangeBand, p = P_SEEN_PER_PASS_COLD): number {
  return binomial.atLeast(1, CLOSE_PASSES[band], p)
}
export const P_SEEN_COLD: Record<RangeBand, number> = {
  near: pSeenInWindow('near'),
  middle: pSeenInWindow('middle'),
  far: pSeenInWindow('far'),
}

/** A scheduled close pass of a loiter point: the public Lane plot, hull by hull. */
export interface ClosePass {
  pass_id: string
  hull: string
  owner_class: 'Perrine' | 'Mercantile' | 'independent'
  /** Fractional-day MET of closest approach. */
  met: number
  range_km: number
  /** True if *Nightjar* has the wings out at that MET — the 0.60 coin instead of the 0.02 one. */
  duringPurge: boolean
  pDetect: number
}

const PASS_HULLS = [
  'Cerulean Fathom',
  'Tarsus Regio',
  'Orinoco Drift',
  'Kalliste Ember',
  'Perrine Aurora',
  'Hollow Bell',
  'Sarmatia Sulci',
  'Vesta Errant',
  'Adad Regio',
  'Thessaly Dawn',
  'Ninsun Sulcus',
  'Cold Harvest',
  'Ishkur Regio',
  'Parthian Reach',
  'Bright Fathom',
  'Anzu Sulci',
] as const

function drawPasses(r: Rng, band: RangeBand, from: number, to: number, label: string): ClosePass[] {
  const n = CLOSE_PASSES[band]
  const out: ClosePass[] = []
  for (let i = 0; i < n; i++) {
    const t = from + ((to - from) * (i + r.uniform(0.15, 0.85))) / n
    const duringPurge = profileAt(t) === 'purge'
    out.push({
      pass_id: `CP-${label}-${String(i + 1).padStart(2, '0')}`,
      hull: PASS_HULLS[r.int(0, PASS_HULLS.length - 1)],
      owner_class: (['Perrine', 'Mercantile', 'independent'] as const)[r.weightedIndex([0.345, 0.42, 0.235])],
      met: t,
      range_km: Math.round(r.uniform(0.4, 2.6) * 1e6),
      duringPurge,
      pDetect: duringPurge ? P_SEEN_PER_PASS_PURGING : P_SEEN_PER_PASS_COLD,
    })
  }
  return out.sort((a, b) => a.met - b.met)
}

/** The close passes Ebele read off the Lane plot for each Watch window at the middle point. */
export const windowOnePasses: readonly ClosePass[] = drawPasses(rng('DS-06', 'passes', 1), 'middle', WINDOW_1.from, WINDOW_1.to, 'W1')
export const windowTwoPasses: readonly ClosePass[] = drawPasses(rng('DS-06', 'passes', 2), 'middle', WINDOW_2.from, WINDOW_2.to, 'W2')

/** P(no detection across a window's close passes), all cold. */
export function pNoDetection(passes: readonly ClosePass[], p = P_SEEN_PER_PASS_COLD): number {
  return binomial.pmf(0, passes.length, p)
}

// =================================================================================================
// DS-07 · Lane arrivals at Mark 9 (rates)
// =================================================================================================

/** Arrivals per day at Mark 9, by owner class, from DS-09 over 2,190 days. */
export const ARRIVALS_PER_DAY = { all: 1.19, Perrine: 0.41, Mercantile: 0.5, independent: 0.28 } as const
/** The hourly Bernoulli trial: 0.41/24 = 0.0171 for Perrine. */
export const P_PERRINE_PER_HOUR = ARRIVALS_PER_DAY.Perrine / 24

/** P(at least one Perrine hull in an `hours`-long window), as a binomial on hourly trials. */
export function pPerrineInWindow(hours: number, p = P_PERRINE_PER_HOUR): number {
  return binomial.atLeast(1, Math.round(hours), p)
}
export function perrineMoments(hours: number, p = P_PERRINE_PER_HOUR): { mean: number; sd: number } {
  const n = Math.round(hours)
  return { mean: n * p, sd: Math.sqrt(n * p * (1 - p)) }
}

/** The diversion rate per Perrine passage: unknown. Six years give 19/900; the last twelve months 5/150. */
export const DIVERSION_RATE_SIX_YEAR = 19 / 900
export const DIVERSION_RATE_LAST_YEAR = 5 / 150
/** The band the drills explore. */
export const DIVERSION_RATE_RANGE: readonly [number, number] = [0.02, 0.1]

// =================================================================================================
// DS-01 · fade pattern × outcome (4-03) and the loss dates (4-01)
// =================================================================================================

/**
 * The Board's staff paper: "eighty-four percent of gradual transponder degradations on the Lane over
 * six years were faults resolved without loss" — true over all 2,200 records. The question a hostile
 * reader asks is the other one.
 */
export const FADE_ROWS = ['gradual fade', 'abrupt silence'] as const
export const FADE_COLS = ['lost', 'resolved'] as const

const gradualLosses = registerLosses.filter((l) => l.fade === 'gradual')
const abruptLosses = registerLosses.filter((l) => l.fade !== 'gradual')
const resolvedGradual = gradualFades.filter((r) => r.severity !== 'loss')

/** 2×2: fade pattern × outcome. 19 / 100 gradual, 12 / 0 abrupt. */
export const fadeCounts: number[][] = [
  [gradualLosses.length, resolvedGradual.length],
  [abruptLosses.length, 0],
]

export const GRADUAL_TOTAL = fadeCounts[0][0] + fadeCounts[0][1]
export const LOSS_TOTAL = fadeCounts[0][0] + fadeCounts[1][0]

/** The Board's figure: P(no loss | gradual fade) = 100/119 ≈ 0.84. */
export const P_NO_LOSS_GIVEN_GRADUAL = fadeCounts[0][1] / GRADUAL_TOTAL
/** Its complement: P(loss | gradual fade) ≈ 0.16. */
export const P_LOSS_GIVEN_GRADUAL = fadeCounts[0][0] / GRADUAL_TOTAL
/** The reversal: P(gradual fade | lost) = 19/31 ≈ 0.61. */
export const P_GRADUAL_GIVEN_LOSS = fadeCounts[0][0] / LOSS_TOTAL

/** Every gradual-fade loss on the Register is a Perrine hull. */
export const GRADUAL_LOSS_PERRINE = gradualLosses.filter((l) => l.owner_class === 'Perrine').length

/** Fade × owner class among the 31 losses — the third leaf of 4-03's tree. */
export const OWNER_CLASSES = ['Perrine', 'Mercantile', 'independent'] as const
export const fadeByOwnerCounts: number[][] = OWNER_CLASSES.map((oc) => [
  gradualLosses.filter((l) => l.owner_class === oc).length,
  abruptLosses.filter((l) => l.owner_class === oc).length,
])

/** Register loss dates, and the tightest 30-day cluster in them (five, 2182-02-24 → 03-21). */
export const lossDates: readonly string[] = registerLosses.map((l) => l.date)
export const OBSERVED_CLUSTER = maxClusterIn(lossDates, 30)
export const CLUSTER_WINDOW_DAYS = 30

/** The span the Register covers, in days: 2178-01-01 → MET 0 (2184-03-10). */
const MS_DAY = 86_400_000
export const REGISTER_SPAN_DAYS = Math.round((Date.UTC(2184, 2, 10) - Date.UTC(2178, 0, 1)) / MS_DAY)
export const REGISTER_RECORDS = registerRecords.length

/** The five hulls in the tightest cluster, for the scene. */
export const CLUSTER_HULLS: readonly string[] = (() => {
  const day = (iso: string) => Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(2178, 0, 1)) / MS_DAY)
  const sorted = registerLosses.slice().sort((a, b) => day(a.date) - day(b.date))
  let best: typeof sorted = []
  for (let i = 0; i < sorted.length; i++) {
    const run = sorted.filter((l) => day(l.date) >= day(sorted[i].date) && day(l.date) - day(sorted[i].date) <= CLUSTER_WINDOW_DAYS)
    if (run.length > best.length) best = run
  }
  return best.map((l) => l.hull)
})()

// -------------------------------------------------------------------------------------------------
// 4-01 · the clustering simulation (DS-01 loss dates under a uniform model)
// -------------------------------------------------------------------------------------------------

export const CLUSTER_RUNS = 10_000

/** One trial: 31 loss dates uniform over the Register's span; the statistic is the largest 30-day cluster. */
export function simulateCluster(r: Rng, n = LOSS_TOTAL, spanDays = REGISTER_SPAN_DAYS, windowDays = CLUSTER_WINDOW_DAYS): number {
  const d: number[] = []
  for (let i = 0; i < n; i++) d.push(Math.floor(r.uniform(0, spanDays)))
  d.sort((a, b) => a - b)
  let best = 0
  for (let i = 0, j = 0; i < d.length; i++) {
    while (j < d.length && d[j] - d[i] <= windowDays) j++
    best = Math.max(best, j - i)
  }
  return best
}

function runClusterStudy(runs: number, seedKey: string): { stats: number[]; counts: Map<number, number> } {
  const r = rng('DS-01', seedKey)
  const stats: number[] = []
  const counts = new Map<number, number>()
  for (let i = 0; i < runs; i++) {
    const s = simulateCluster(r)
    stats.push(s)
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return { stats, counts }
}

const CLUSTER_STUDY = runClusterStudy(CLUSTER_RUNS, 'cluster-study')

/** The 10,000 simulated largest-cluster statistics — 4-01's instrument and mission beat. */
export const clusterStats: readonly number[] = CLUSTER_STUDY.stats
/** Counts by statistic value, ascending. */
export const clusterDistribution: readonly { value: number; count: number }[] = [...CLUSTER_STUDY.counts.entries()].sort((a, b) => a[0] - b[0]).map(([value, count]) => ({ value, count }))

/** How many of the 10,000 runs produced a cluster of five or more. */
export const clusterAtLeastObservedCount = clusterStats.filter((s) => s >= OBSERVED_CLUSTER).length
/** The simulated probability: about two in a hundred. An estimate — say how many runs. */
export const P_CLUSTER_SIMULATED = clusterAtLeastObservedCount / CLUSTER_RUNS

// =================================================================================================
// DS-09 / DS-08 · the Ledger's loss × owner class, and the two baselines (4-04, 4-09)
// =================================================================================================

/** The Transit Ledger snapshot at MET 0. Perrine 900 transits, 19 lost; every other owner 1,712 / 12. */
export const LEDGER = { perrineTransits: 900, perrineLosses: 19, otherTransits: 1712, otherLosses: 12 } as const
export const LEDGER_TRANSITS = LEDGER.perrineTransits + LEDGER.otherTransits
export const LEDGER_LOSSES = LEDGER.perrineLosses + LEDGER.otherLosses

export const LOSS_OWNER_ROWS = ['Perrine', 'every other owner'] as const
export const LOSS_OWNER_COLS = ['lost', 'arrived'] as const
export const lossOwnerCounts: number[][] = [
  [LEDGER.perrineLosses, LEDGER.perrineTransits - LEDGER.perrineLosses],
  [LEDGER.otherLosses, LEDGER.otherTransits - LEDGER.otherLosses],
]

/** P(lost | Perrine) = 19/900 ≈ 0.0211 against the marginal P(lost) = 31/2,612 ≈ 0.0119. */
export const P_LOST_GIVEN_PERRINE = LEDGER.perrineLosses / LEDGER.perrineTransits
export const P_LOST_GIVEN_OTHER = LEDGER.otherLosses / LEDGER.otherTransits
export const P_LOST = LEDGER_LOSSES / LEDGER_TRANSITS
export const P_PERRINE = LEDGER.perrineTransits / LEDGER_TRANSITS
/** What the joint cell would be if loss and owner were independent: P(lost)·P(Perrine). */
export const P_LOST_AND_PERRINE_IF_INDEPENDENT = P_LOST * P_PERRINE
export const P_LOST_AND_PERRINE = LEDGER.perrineLosses / LEDGER_TRANSITS

/** DS-08 baselines. The Board's comparison corridor (Mars–Belt) and Rook's own 2176 Asgard report. */
export const BASELINES = {
  board: { label: "the Board's comparison corridor (Mars–Belt, 46 in 4,180)", p: 46 / 4180 },
  rook: { label: "your 2176 Asgard report (13 in 2,580, Lane, 2168–76)", p: 13 / 2580 },
} as const
export const LANE_OBSERVED_RATE = LEDGER_LOSSES / LEDGER_TRANSITS

export interface BaselineFit {
  label: string
  p: number
  mean: number
  sd: number
  /** Standardized distance of the observed 31 from the baseline's mean. */
  z: number
  /** P(X ≥ 31) under the baseline, from the survival form. */
  tail: number
}

export function baselineFit(p: number, label: string, n = LEDGER_TRANSITS, x = LEDGER_LOSSES): BaselineFit {
  const mean = n * p
  const sd = Math.sqrt(n * p * (1 - p))
  return { label, p, mean, sd, z: (x - mean) / sd, tail: binomial.atLeast(x, n, p) }
}

export const BOARD_FIT = baselineFit(BASELINES.board.p, BASELINES.board.label)
export const ROOK_FIT = baselineFit(BASELINES.rook.p, BASELINES.rook.label)

// =================================================================================================
// 4-05 · the cold-run distributions (DS-05, DS-06)
// =================================================================================================

/**
 * The discrete one: hours of cold running required to cross the picket's sweep pattern, built from
 * the sweep log's coverage. A table of values and probabilities that must sum to one — Ebele's first
 * attempt sums to 1.04.
 */
export const COLD_HOURS_VALUES: readonly number[] = [44, 48, 52, 56, 60, 64, 68, 72, 76, 80]

function drawColdHoursProbs(r: Rng): number[] {
  // Coverage-driven shape: unimodal around 58–60 h with a real right tail (the sectors the Eyes must revisit).
  const raw = COLD_HOURS_VALUES.map((v) => Math.exp(-((v - 58) ** 2) / (2 * 9.5 ** 2)) * r.uniform(0.86, 1.14))
  const total = raw.reduce((a, b) => a + b, 0)
  // Round to hundredths and repair the rounding drift onto the mode so the table sums to exactly 1.
  const rounded = raw.map((x) => Math.round((x / total) * 100) / 100)
  const drift = Math.round((1 - rounded.reduce((a, b) => a + b, 0)) * 100) / 100
  const mode = rounded.indexOf(Math.max(...rounded))
  rounded[mode] = Math.round((rounded[mode] + drift) * 100) / 100
  return rounded
}

function coldHoursIssues(probs: number[]): string[] {
  const bad: string[] = []
  const total = probs.reduce((a, b) => a + b, 0)
  if (Math.abs(total - 1) > 1e-9) bad.push(`probabilities sum to ${total}`)
  if (probs.some((p) => p <= 0)) bad.push('a zero cell — every value must be possible')
  const rv = discreteRV([...COLD_HOURS_VALUES], probs)
  const above64 = rvProb(rv, (v) => v > 64)
  if (!(above64 > 0.16 && above64 < 0.3)) bad.push(`P(X > 64) = ${above64.toFixed(3)}`)
  // ≥ vs > must be a real distinction: P(X ≥ 64) − P(X > 64) is the mass at 64 itself.
  if (!(probs[COLD_HOURS_VALUES.indexOf(64)] > 0.08)) bad.push('too little mass at 64 for the off-by-one lesson')
  if (!(rv.mean > 55 && rv.mean < 62)) bad.push(`mean ${rv.mean.toFixed(2)}`)
  return bad
}

function searchColdHours(): { probs: number[]; attempt: number } {
  for (let attempt = 0; attempt < 500; attempt++) {
    const probs = drawColdHoursProbs(rng('DS-06', 'cold-hours', attempt))
    if (coldHoursIssues(probs).length === 0) return { probs, attempt }
  }
  throw new Error('4-05: no acceptable cold-hours pmf — loosen the acceptance rule')
}

const COLD_HOURS_BUILD = searchColdHours()
export const COLD_HOURS_PROBS: readonly number[] = COLD_HOURS_BUILD.probs
export const COLD_HOURS_SEED_ATTEMPT = COLD_HOURS_BUILD.attempt
/** The pmf itself: hours of cold running required before the next hide-window. */
export const coldHoursRV: DiscreteRV = discreteRV([...COLD_HOURS_VALUES], [...COLD_HOURS_PROBS])

/** P(the sink saturates before the next Perrine hull is in range) = P(hours required > 64). */
export const P_COLD_HOURS_OVER_64 = rvProb(coldHoursRV, (v) => v > WATCH_WORKING_HOURS)
/** The off-by-one it is not: P(X ≥ 64) includes the 64 itself. */
export const P_COLD_HOURS_AT_LEAST_64 = rvProb(coldHoursRV, (v) => v >= WATCH_WORKING_HOURS)
export const P_COLD_HOURS_OVER_60 = rvProb(coldHoursRV, (v) => v > WATCH_IN_WRITING_HOURS)

/** Ebele's first table, which sums to 1.04 — the same shape with four hundredths too much on the mode. */
export const COLD_HOURS_PROBS_BAD: readonly number[] = COLD_HOURS_PROBS.map((p, i) => (i === COLD_HOURS_PROBS.indexOf(Math.max(...COLD_HOURS_PROBS)) ? Math.round((p + 0.04) * 100) / 100 : p))

/** The continuous one: sink temperature at hour 60 of a Watch run, °C. P(T = exactly 240) = 0. */
export const SINK_TEMP = { mean: 240, sd: 9, units: '°C' } as const
export const sinkTempPdf = (x: number): number => normal.pdf(x, SINK_TEMP.mean, SINK_TEMP.sd)

// =================================================================================================
// 4-06 · the three loiter points (gate review: near 60 ± 6, middle 54 ± 4, far 48 ± 3)
// =================================================================================================

export interface LoiterOption {
  band: RangeBand
  label: string
  /** Mean sink-hours a 64-h Watch window costs at this point. */
  meanHours: number
  sdHours: number
  /** The cost distribution, shown explicitly: a discrete pmf on 2-hour cells whose boundary is 64. */
  pmf: DiscreteRV
  /** P(the window costs more than the cellar has) — the normal reading of the same distribution. */
  pSaturate: number
  /** P(a Perrine hull passes inside the Eyes' ID range during the window). */
  pPerrineInRange: number
  /** P(a passing hull sees a cold *Nightjar*) over the window's close passes. */
  pSeenCold: number
  closePasses: number
  note: string
}

/**
 * A 2-hour-cell discretization of N(mean, sd) whose cell boundaries fall on even hours — so 64 is a
 * boundary and the discrete P(X > 64) equals the normal tail to four decimals. The learner reads the
 * weighted sum off the table; the Chief reads the tail off the curve; they agree.
 */
function optionPmf(meanHours: number, sdHours: number): DiscreteRV {
  const lo = Math.ceil((meanHours - 4 * sdHours - 1) / 2) * 2 + 1
  const hi = Math.floor((meanHours + 4 * sdHours - 1) / 2) * 2 + 1
  const values: number[] = []
  for (let v = lo; v <= hi; v += 2) values.push(v)
  const raw = values.map((v) => normal.between(v - 1, v + 1, meanHours, sdHours))
  const total = raw.reduce((a, b) => a + b, 0)
  return discreteRV(values, raw.map((p) => p / total))
}

function loiterOption(band: RangeBand, label: string, meanHours: number, sdHours: number, pPerrineInRange: number, note: string): LoiterOption {
  return {
    band,
    label,
    meanHours,
    sdHours,
    pmf: optionPmf(meanHours, sdHours),
    pSaturate: normal.sf(WATCH_WORKING_HOURS, meanHours, sdHours),
    pPerrineInRange,
    pSeenCold: P_SEEN_COLD[band],
    closePasses: CLOSE_PASSES[band],
    note,
  }
}

export const LOITER_OPTIONS: readonly LoiterOption[] = [
  loiterOption('near', 'near point', 60, 6, 0.75, 'Inside the traffic bundle. Every close pass triggers a re-sweep and the load climbs; the best odds of a contact and the worst tail.'),
  loiterOption('middle', 'middle point', 54, 4, 0.55, 'Off the bundle by two hundred thousand kilometres. Fewer passes, a tighter cost, a contact more often than not.'),
  loiterOption('far', 'far point', 48, 3, 0.35, 'Outside the traffic entirely. The cellar barely notices the window; neither does the Lane.'),
]

export const loiterOption_ = (band: RangeBand): LoiterOption => LOITER_OPTIONS.find((o) => o.band === band)!

/** The book's default when the learner does not choose. */
export const DEFAULT_LOITER: RangeBand = 'middle'

/** Read the 4-06 decision back out of the progress store's recorded value. */
export function loiterFromDecision(choice: string | undefined): LoiterOption {
  const c = (choice ?? '').toLowerCase()
  if (c.includes('near')) return loiterOption_('near')
  if (c.includes('far')) return loiterOption_('far')
  return loiterOption_(DEFAULT_LOITER)
}

/** Read the 4-05 Watch/Quiet decision back out. Quiet cannot hold a plume's vector — 4-10 fails on it. */
export function profileFromDecision(choice: string | undefined): 'watch' | 'quiet' {
  return (choice ?? '').toLowerCase().includes('quiet') ? 'quiet' : 'watch'
}

// =================================================================================================
// 4-10 · the geometric questions (DS-07 diversion rates, DS-06 close passes)
// =================================================================================================

/** The sensitivity Ebele runs: expected Perrine passages, and days, to the first diversion. */
export interface WaitScenario {
  p: number
  label: string
  /** Expected number of Perrine passages to the first diversion: 1/p. */
  meanTrials: number
  sdTrials: number
  /** Turned into days at 0.41 Perrine passages a day. */
  meanDays: number
  /** P(the first diversion has not happened by passage k = ⌈mean⌉). */
  pBeyondMean: number
}

export function waitScenario(p: number, label: string): WaitScenario {
  const meanTrials = 1 / p
  return {
    p,
    label,
    meanTrials,
    sdTrials: Math.sqrt(1 - p) / p,
    meanDays: meanTrials / ARRIVALS_PER_DAY.Perrine,
    pBeyondMean: Math.pow(1 - p, Math.ceil(meanTrials)),
  }
}

export const WAIT_SCENARIOS: readonly WaitScenario[] = [
  waitScenario(0.02, 'one Perrine passage in fifty'),
  waitScenario(DIVERSION_RATE_SIX_YEAR, "the six-year rate, 19 of 900"),
  waitScenario(DIVERSION_RATE_LAST_YEAR, 'the last twelve months, 5 of 150'),
  waitScenario(0.05, 'one in twenty'),
  waitScenario(0.1, 'one in ten'),
]

// =================================================================================================
// Registry self-description (used by the data test and by the instruments' captions)
// =================================================================================================

export const ACT_4_HEADLINES = {
  purges: PURGE_COUNT,
  windowHours: [hoursBetween(WINDOW_1.from, WINDOW_1.to), hoursBetween(WINDOW_2.from, WINDOW_2.to)] as [number, number],
  mariusHoursIntoWindow: hoursBetween(WINDOW_2.from, MARIUS_MET),
  watchSdKw: WATCH_SD_KW,
  pSaturate64: P_SATURATE_BEFORE_64,
  pSaturate60: P_SATURATE_BEFORE_60,
  pNoLossGivenGradual: P_NO_LOSS_GIVEN_GRADUAL,
  pGradualGivenLoss: P_GRADUAL_GIVEN_LOSS,
  pLostGivenPerrine: P_LOST_GIVEN_PERRINE,
  pLost: P_LOST,
  clusterSimulated: P_CLUSTER_SIMULATED,
  seenCold: P_SEEN_COLD,
} as const
