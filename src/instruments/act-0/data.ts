/**
 * Prologue datasets — generated with fixed seeds so they are identical on every load and wherever a
 * later Act imports them (read-only). Registry ids from docs/beat-sheet.md §2:
 *
 *   DS-18  Shakedown telemetry — dead-reckoning fix errors (N(0, 120) km per axis, six per cold run),
 *          three cold runs with sink % vs time (design curve vs measured; Quiet ~5% optimistic),
 *          Callisto telescope detection at 61 h on Watch.
 *   DS-05  The Chief's tables — sink capacity, cold-profile loads and their SDs; endurance = capacity ÷ load
 *          and the SD of endurance from the variance rule; the Chief's working figure = design mean − 1 SD.
 *   DS-01  The Register — 2,200 Lane Authority incident records 2178-01 → 2184-03 (MET 0), 31 of them losses,
 *          with the loss subtable (mark_last, time_to_silence, classification, office, cargo, value, age).
 *
 * Headline numbers are asserted in data.test.ts. Nothing here rounds except to the precision the
 * in-world instrument logs (whole km for fixes, 0.01 marks, 0.1 years); display rounding is the MDX's job.
 * The hidden truth (which 19 hulls diverted) is NOT carried on the records — only the hull-name lists below
 * know it, for later Acts' joins. Instruments never display those lists.
 */
import { Rng, rng } from '@/lib/rng'
import { countBy, mean, range } from '@/lib/stats'

// =============================================================================================
// DS-18 · Dead-reckoning fix errors
// =============================================================================================

/** Per-axis dead-reckoning position error of a cold Nightjar against Callisto's beacon, km (1 SD). */
export const FIX_SD_KM = 120
/** The crew's shorthand for the error budget: the ±2.5 SD envelope that makes a scheduled hull hittable. */
export const FIX_ENVELOPE_KM = 300

export interface FixRun {
  id: string
  /** Mission clock at the first fix. */
  met: string
  label: string
  /** Along-track error of each dead-reckoning fix against beacon truth, whole km (+ = ahead of truth). */
  fixes: number[]
  /** Cross-track and radial components, whole km (logged; the module reads along-track). */
  crossTrack: number[]
  radial: number[]
}

/** Draw n fix errors on one axis, rounded to whole km as the nav log records them. */
export function drawFixErrors(r: Rng, n = 6, sdKm = FIX_SD_KM): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(Math.round(r.normal(0, sdKm)))
  return out
}

function drawFixRun(seed: string, id: string, met: string, label: string, accept: (fixes: number[]) => boolean = () => true): FixRun {
  const r = rng('DS-18', seed)
  let fixes: number[] = []
  for (let tries = 0; tries < 500; tries++) {
    fixes = drawFixErrors(r)
    if (accept(fixes)) break
  }
  return { id, met, label, fixes, crossTrack: drawFixErrors(r), radial: drawFixErrors(r) }
}

/** A run whose lesson is unambiguous: a visible centre away from zero and a spread of the ±300 km class. */
const interesting = (fixes: number[]) => {
  const m = Math.abs(mean(fixes))
  const rg = range(fixes)
  return new Set(fixes).size === fixes.length && m >= 15 && m <= 70 && rg >= 230 && rg <= 420
}

/** The three shakedown cold runs' first-hour fix sequences (six fixes each). Run 1 is the mission-beat data. */
export const shakedownFixRuns: FixRun[] = [
  drawFixRun('run-1', 'DR-1', 'MET 2/01:00', 'Cold run 1 · Quiet · first cold hour', interesting),
  drawFixRun('run-2', 'DR-2', 'MET 4/07:00', 'Cold run 2 · Watch · first cold hour', (f) => new Set(f).size === f.length),
  drawFixRun('run-3', 'DR-3', 'MET 7/07:00', 'Cold run 3 · Standby · first cold hour', (f) => new Set(f).size === f.length),
]

/** The seeded six-fix run the tug master is asking about (act-0-01 mission beat). */
export const loggedFixRun = shakedownFixRuns[0]

/** Adlinda's own acceptance-trial fixes (six, MET −14 d): the Briefing's worked example — a different case. */
export const yardAcceptanceFixes: number[] = drawFixRun('yard-acceptance', 'YA-1', 'MET −14/10:00', 'Yard acceptance trial', interesting).fixes

// =============================================================================================
// DS-05 · The Chief's tables
// =============================================================================================

/** Lithium sink, as designed (60 t, 1.3 MJ/kg usable): 78 GJ = 21.7 MWh. */
export const SINK_CAPACITY_GJ = 78
/** After the Halden Reach refit (Act VII). */
export const SINK_CAPACITY_GJ_POST_REFIT = 68
/** Skin cryocooler loops: the 120 K skin's heat pumped inward, always on when cold. */
export const SKIN_LOOP_KW = 70

export type ProfileName = 'Quiet' | 'Watch' | 'Standby'

export interface SubsystemLoad {
  name: string
  meanKw: number
  sdKw: number
}

/** Watch-profile subsystem loads (kW, mean ± SD, independent). Sum 320; SD of the total √386 ≈ 19.6 kW. */
export const WATCH_SUBSYSTEMS: SubsystemLoad[] = [
  { name: 'Life support', meanKw: 60, sdKw: 6 },
  { name: 'Computing & sensor processing', meanKw: 110, sdKw: 15 },
  { name: 'Comms', meanKw: 12, sdKw: 3 },
  { name: 'Cryocooler (skin) loops', meanKw: 70, sdKw: 8 },
  { name: 'Pumps & misc', meanKw: 40, sdKw: 6 },
  { name: 'Hotel (16 people)', meanKw: 28, sdKw: 4 },
]

/** SD of a sum of independent loads: √Σσ². The variance rule (Act IV teaches it; the Prologue only uses it). */
export function sumOfLoadsSd(loads: readonly SubsystemLoad[]): number {
  return Math.sqrt(loads.reduce((s, l) => s + l.sdKw * l.sdKw, 0))
}

/** Hours a sink of `capacityGJ` lasts at a steady `loadKw`. */
export function enduranceHours(capacityGJ: number, loadKw: number): number {
  return (capacityGJ * 1e9) / (loadKw * 1e3) / 3600
}

/** SD of endurance when the load is a random variable (delta method: E · σ_L / L). */
export function enduranceSdHours(capacityGJ: number, loadKw: number, loadSdKw: number): number {
  return enduranceHours(capacityGJ, loadKw) * (loadSdKw / loadKw)
}

export interface ColdProfile {
  name: ProfileName
  /** Internal + skin loop, kW (design). */
  loadKw: number
  /** Run-to-run SD of the load, kW (Watch from the subsystem table; Quiet/Standby from the Chief's ± in hours). */
  loadSdKw: number
  /** Shakedown correction to the design curve (Quiet measured ~5% optimistic; 1 = as designed). */
  measuredFactor: number
  designMeanH: number
  sdH: number
  /** The Chief's working figure: design mean − 1 SD. */
  workingH: number
  /** "In writing": design mean − 2 SD. */
  inWritingH: number
  /** Design mean after the Halden Reach refit (68 GJ). */
  postRefitMeanH: number
  postRefitWorkingH: number
}

function profile(name: ProfileName, loadKw: number, loadSdKw: number, measuredFactor: number): ColdProfile {
  const designMeanH = enduranceHours(SINK_CAPACITY_GJ, loadKw)
  const sdH = enduranceSdHours(SINK_CAPACITY_GJ, loadKw, loadSdKw)
  const postRefitMeanH = enduranceHours(SINK_CAPACITY_GJ_POST_REFIT, loadKw)
  const postSd = enduranceSdHours(SINK_CAPACITY_GJ_POST_REFIT, loadKw, loadSdKw)
  return { name, loadKw, loadSdKw, measuredFactor, designMeanH, sdH, workingH: designMeanH - sdH, inWritingH: designMeanH - 2 * sdH, postRefitMeanH, postRefitWorkingH: postRefitMeanH - postSd }
}

const WATCH_LOAD_SD = sumOfLoadsSd(WATCH_SUBSYSTEMS)

/** The three cold profiles. Quiet 190 kW / 114 h · Watch 320 kW / 67.7 h (SD 4.2) · Standby 670 kW / 32 h. */
export const PROFILES: Record<ProfileName, ColdProfile> = {
  Quiet: profile('Quiet', 190, (190 * 5) / enduranceHours(SINK_CAPACITY_GJ, 190), 0.95),
  Watch: profile('Watch', 320, WATCH_LOAD_SD, 1),
  Standby: profile('Standby', 670, (670 * 1.5) / enduranceHours(SINK_CAPACITY_GJ, 670), 1),
}

export const PROFILE_ORDER: ProfileName[] = ['Quiet', 'Watch', 'Standby']

/** Design sink % after `hours` on a profile, starting from `startPct` (a straight line: the book assumes a constant load). */
export function designSinkPct(p: ColdProfile, hours: number, startPct = 0): number {
  return startPct + (100 * hours) / p.designMeanH
}

/** Sink % at which Callisto's telescopes found Nightjar on the Watch run: the skin loop lagged as the lithium warmed. */
export const WATCH_DETECTION_H = 61
/** Oyelaran's estimate for the Eyes on the same geometry. */
export const EYES_DETECTION_H = 50

export interface ColdRun {
  id: string
  profile: ProfileName
  startMet: string
  /** Planned cold window, h. */
  hours: number
  /** Measured mean load over the run, kW. */
  loadKw: number
  sinkStartPct: number
  sinkEndPct: number
  /** Endurance the run's own drain rate projects for a 0 → 100 % fill, h. */
  projectedEnduranceH: number
  /** Chief's ± on the next run's endurance: run-to-run SD, h. */
  enduranceSdH: number
  detected: boolean
  detectedAtH: number | null
  detectedBy: string | null
  crew: number
  /** Hourly sink readings, % of capacity. */
  samples: { h: number; pct: number }[]
}

/**
 * Run one cold profile from `startPct` for `hours`, with the run's own mean load drawn from the profile's
 * run-to-run distribution (× the shakedown correction) and hourly load jitter. Exported so the heat-sink gauge
 * re-runs the same physics on the learner's seed.
 */
export function simulateColdRun(r: Rng, p: ColdProfile, hours: number, startPct = 4, opts: { measured?: boolean; hourlySdFrac?: number } = {}): { loadKw: number; samples: { h: number; pct: number }[] } {
  const factor = opts.measured === false ? 1 : 1 / p.measuredFactor
  const loadKw = r.normal(p.loadKw * factor, p.loadSdKw)
  const hourlySd = (opts.hourlySdFrac ?? 0.04) * loadKw
  const capJ = SINK_CAPACITY_GJ * 1e9
  const samples: { h: number; pct: number }[] = [{ h: 0, pct: startPct }]
  let pct = startPct
  const whole = Math.floor(hours)
  for (let h = 1; h <= whole; h++) {
    const kw = Math.max(0.5 * loadKw, loadKw + r.normal(0, hourlySd))
    pct += (100 * kw * 1e3 * 3600) / capJ
    samples.push({ h, pct: Math.min(100, pct) })
  }
  if (hours > whole) {
    const frac = hours - whole
    const kw = Math.max(0.5 * loadKw, loadKw + r.normal(0, hourlySd))
    pct += (100 * kw * 1e3 * 3600 * frac) / capJ
    samples.push({ h: hours, pct: Math.min(100, pct) })
  }
  return { loadKw, samples }
}

function coldRun(seed: string, id: string, name: ProfileName, startMet: string, hours: number, detection: { atH: number; by: string } | null, accept: (run: ColdRun) => boolean = () => true): ColdRun {
  const p = PROFILES[name]
  const r = rng('DS-18', seed)
  let run: ColdRun | null = null
  for (let tries = 0; tries < 500; tries++) {
    const { loadKw, samples } = simulateColdRun(r, p, hours)
    const start = samples[0].pct
    const end = samples[samples.length - 1].pct
    const drainPerH = (end - start) / hours
    const projected = 100 / drainPerH
    const candidate: ColdRun = {
      id,
      profile: name,
      startMet,
      hours,
      loadKw,
      sinkStartPct: start,
      sinkEndPct: end,
      projectedEnduranceH: projected,
      enduranceSdH: enduranceSdHours(SINK_CAPACITY_GJ, loadKw, p.loadSdKw),
      detected: detection !== null,
      detectedAtH: detection?.atH ?? null,
      detectedBy: detection?.by ?? null,
      crew: 16,
      samples,
    }
    run = candidate
    if (accept(candidate)) break
  }
  return run!
}

/** The three shakedown cold runs: Quiet 40 h (MET 2), Watch to 61 h (MET 4–6, found by Callisto), Standby 8 h (MET 7). */
export const shakedownColdRuns: ColdRun[] = [
  coldRun('cold-1', 'CR-1', 'Quiet', 'MET 2/00:00', 40, null, (run) => {
    const shortfall = (100 * (PROFILES.Quiet.designMeanH - run.projectedEnduranceH)) / PROFILES.Quiet.designMeanH
    return shortfall >= 3.5 && shortfall <= 6.5
  }),
  coldRun('cold-2', 'CR-2', 'Watch', 'MET 4/06:00', WATCH_DETECTION_H, { atH: WATCH_DETECTION_H, by: 'Callisto (Valhalla) telescopes' }, (run) => run.sinkEndPct < 100 && run.sinkEndPct > 85),
  coldRun('cold-3', 'CR-3', 'Standby', 'MET 7/06:00', 8, null, (run) => run.sinkEndPct < 40),
]

/** The seeded Quiet run (act-0-02 mission beat). */
export const quietRun = shakedownColdRuns[0]
export const watchRun = shakedownColdRuns[1]

/** Shortfall of the measured Quiet endurance against the design curve, as a percentage of the design figure. */
export function shortfallPct(designH: number, measuredH: number): number {
  return (100 * (designH - measuredH)) / designH
}

/** The Quiet run's shortfall (the beat's number) and the Chief's ± on it (run-to-run SD, as % of design). */
export const quietShortfallPct = shortfallPct(PROFILES.Quiet.designMeanH, quietRun.projectedEnduranceH)
export const quietShortfallPmPct = (100 * quietRun.enduranceSdH) / PROFILES.Quiet.designMeanH

/** The Briefing's worked example (a different case): Adlinda's acceptance runs before the crew came aboard. */
export interface RunTableRow {
  run: string
  profile: ProfileName
  hours: number
  loadKw: number
  sinkEndPct: number
  purges: number
  detected: 'yes' | 'no'
}
export const yardAcceptanceRuns: RunTableRow[] = (() => {
  const r = rng('DS-05', 'yard-acceptance-runs')
  const rows: RunTableRow[] = []
  const plan: { profile: ProfileName; hours: number; purges: number; detected: 'yes' | 'no' }[] = [
    { profile: 'Quiet', hours: 24, purges: 1, detected: 'no' },
    { profile: 'Watch', hours: 30, purges: 1, detected: 'no' },
    { profile: 'Standby', hours: 6, purges: 2, detected: 'yes' },
  ]
  plan.forEach((p, i) => {
    const { loadKw, samples } = simulateColdRun(r, PROFILES[p.profile], p.hours, 3, { measured: false })
    rows.push({ run: `A-${i + 1}`, profile: p.profile, hours: p.hours, loadKw: Math.round(loadKw), sinkEndPct: Math.round(samples[samples.length - 1].pct * 10) / 10, purges: p.purges, detected: p.detected })
  })
  return rows
})()

export type VariableKind = 'categorical' | 'quantitative-discrete' | 'quantitative-continuous'

export interface VariableSpec {
  name: string
  kind: VariableKind
  units: string | null
  note: string
}

/** Ebele's table: every quantity the ship logs on a cold run, and what kind of thing each is. */
export const COLD_RUN_VARIABLES: VariableSpec[] = [
  { name: 'Hull number', kind: 'categorical', units: null, note: 'CX-1 is a label, not a count' },
  { name: 'Cold profile', kind: 'categorical', units: null, note: 'Quiet / Watch / Standby' },
  { name: 'Sink capacity used', kind: 'quantitative-continuous', units: '%', note: 'any value between 0 and 100' },
  { name: 'Hours remaining', kind: 'quantitative-continuous', units: 'h', note: 'the Chief quotes it with a ±' },
  { name: 'Mean load', kind: 'quantitative-continuous', units: 'kW', note: '' },
  { name: 'Detected by an outside sensor', kind: 'categorical', units: null, note: 'yes / no' },
  { name: 'Purges in the run', kind: 'quantitative-discrete', units: 'purges', note: 'a count' },
  { name: 'Crew aboard', kind: 'quantitative-discrete', units: 'people', note: '16' },
  { name: 'Skin temperature', kind: 'quantitative-continuous', units: 'K', note: 'held near 120' },
  { name: 'Watch section', kind: 'categorical', units: null, note: 'Alpha / Bravo' },
  { name: 'Fixes logged', kind: 'quantitative-discrete', units: 'fixes', note: 'six per cold hour' },
  { name: 'Cause code', kind: 'categorical', units: null, note: 'a number that names a category' },
]

// =============================================================================================
// DS-01 · The Register
// =============================================================================================

export type Severity = 'loss' | 'advisory' | 'dropout' | 'other'
export type RecordKind = 'loss' | 'transponder dropout' | 'debris advisory' | 'profile deviation' | 'medical diversion'
export type OwnerClass = 'Perrine' | 'Mercantile' | 'independent'
export type HullClass = 'Sulcus-Mk3' | 'Tessera-C' | 'other'
export type Office = 'Uruk' | 'Ceres'
export type Classification = 'accident' | 'piracy' | 'unknown'
export type CargoCategory = 'He-3/D' | 'volatiles' | 'metals' | 'manufactured & other'
export type Fade = 'gradual' | 'abrupt' | null

export interface RegisterRecord {
  record_id: string
  /** ISO date. */
  date: string
  /** Days since 2178-01-01 (for clustering and sorting). */
  day: number
  hull: string
  hull_class: HullClass
  owner: string
  owner_class: OwnerClass
  severity: Severity
  kind: RecordKind
  /** Fractional Lane mark at the record, 1.00–12.00. */
  mark: number
  office: Office
  /** How the transponder behaved, where the record is about a transponder at all. */
  fade: Fade
}

export interface LossRecord extends RegisterRecord {
  severity: 'loss'
  mark_last: number
  /** Hours from first transponder degradation to final loss of signal. */
  time_to_silence: number
  classification: Classification
  hull_age: number
  /** Declared cargo value, M₵. */
  declared_cargo_value: number
  cargo_category: CargoCategory
}

export const REGISTER_EPOCH = Date.UTC(2178, 0, 1)
/** MET 0 = 2184-03-11 06:00 Valhalla; the Register snapshot ends the day before. */
export const REGISTER_END_DAY = daysFromIso('2184-03-10')

export function daysFromIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - REGISTER_EPOCH) / 86400000)
}
export function isoFromDays(day: number): string {
  return new Date(REGISTER_EPOCH + day * 86400000).toISOString().slice(0, 10)
}
function yearBounds(year: number): [number, number] {
  return [daysFromIso(`${year}-01-01`), Math.min(REGISTER_END_DAY, daysFromIso(`${year}-12-31`))]
}

/** Largest number of dates falling inside any window of `windowDays` (inclusive). */
export function maxClusterWithin(days: readonly number[], windowDays = 30): number {
  const s = [...days].sort((a, b) => a - b)
  let best = 0
  let j = 0
  for (let i = 0; i < s.length; i++) {
    while (j < s.length && s[j] - s[i] <= windowDays) j++
    best = Math.max(best, j - i)
  }
  return best
}

/** The nineteen Sulcus hulls that did not vanish (hidden truth; never displayed by an instrument). */
export const DIVERTED_HULLS: { hull: string; year: number; date?: string }[] = [
  { hull: 'Perrine Regio', year: 2178 },
  { hull: 'Tiamat Sulcus', year: 2179 },
  { hull: 'Galileo Regio', year: 2179 },
  { hull: 'Barnard Regio', year: 2180 },
  { hull: 'Uruk Sulcus', year: 2180 },
  { hull: 'Dardanus Sulcus', year: 2180 },
  { hull: 'Mysia Sulci', year: 2181 },
  { hull: 'Phrygia Sulcus', year: 2181 },
  { hull: 'Sippar Sulcus', year: 2181 },
  { hull: 'Anshar Sulcus', year: 2181 },
  { hull: 'Nicholson Regio', year: 2182, date: '2182-03-06' },
  { hull: 'Xibalba Sulcus', year: 2182, date: '2182-03-18' },
  { hull: 'Byblus Sulcus', year: 2182 },
  { hull: 'Nun Sulci', year: 2182 },
  { hull: 'Elam Sulci', year: 2183 },
  { hull: 'Lakhmu Fossae', year: 2183 },
  { hull: 'Zakar Sulcus', year: 2183 },
  { hull: 'Kishar Sulcus', year: 2183 },
  { hull: 'Bubastis Sulci', year: 2184 },
]

/** The four independents wrecked by Patience so the Lane's losses would have bodies and a story. */
export const COVER_LOSS_HULLS: { hull: string; date: string; mark_last: number; owner: string }[] = [
  { hull: 'Kestrel Bough', date: '2182-02-24', mark_last: 9.6, owner: 'owner-master H. Adeyemi' },
  { hull: 'Thessaly Ember', date: '2182-03-08', mark_last: 9.9, owner: 'owner-master P. Marsh' },
  { hull: 'Hygiea Promise', date: '2182-03-21', mark_last: 10.2, owner: 'owner-master L. Corrado' },
  { hull: 'Long Fathom', date: '2182-06-02', mark_last: 10.5, owner: 'owner-master S. Ekwueme' },
]

/** The eight genuine losses (reactor casualty, debris): non-Compact-flag hulls, classified at Ceres. */
const GENUINE_LOSSES: { hull: string; owner_class: OwnerClass; owner: string; hull_class: HullClass; classification: Classification }[] = [
  { hull: 'Pallas Marque', owner_class: 'Mercantile', owner: 'Pallas House', hull_class: 'Tessera-C', classification: 'accident' },
  { hull: 'Hebe Standard', owner_class: 'Mercantile', owner: 'Hebe & Iris Freight', hull_class: 'Tessera-C', classification: 'accident' },
  { hull: 'Fortuna Ledger', owner_class: 'Mercantile', owner: 'Egeria–Doris Line', hull_class: 'Tessera-C', classification: 'unknown' },
  { hull: 'Themis Clearance', owner_class: 'Mercantile', owner: 'Vesta Consolidated', hull_class: 'Tessera-C', classification: 'accident' },
  { hull: 'Nemausa Ward', owner_class: 'Mercantile', owner: 'Pallas House', hull_class: 'Tessera-C', classification: 'unknown' },
  { hull: 'Salt Cellar', owner_class: 'independent', owner: 'owner-master T. Vauquelin', hull_class: 'other', classification: 'accident' },
  { hull: 'Brass Meridian', owner_class: 'independent', owner: 'owner-master R. Oduya-Kent', hull_class: 'other', classification: 'unknown' },
  { hull: 'Weir Keeper', owner_class: 'independent', owner: 'owner-master M. Halloran', hull_class: 'other', classification: 'accident' },
]

/** Sulcus Freight's fleet (Ganymede regiones and sulci). Includes the nineteen and the two in-story hulls. */
const PERRINE_FLEET = [
  ...DIVERTED_HULLS.map((d) => d.hull),
  'Harpagia Sulcus',
  'Marius Regio',
  'Nippur Sulcus',
  'Mashu Sulcus',
  'Apsu Sulci',
  'Misharu Sulcus',
  'Arbela Sulcus',
  'Erech Sulcus',
  'Nineveh Sulcus',
  'Ur Sulcus',
  'Philus Sulcus',
  'Tettu Facula',
  'Memphis Facula',
  'Siwah Facula',
  'Hathor Sulcus',
  'Aquarius Sulcus',
  'Ninki Sulcus',
  'Bigeh Facula',
]

const MERCANTILE_HOUSES = ['Pallas House', 'Hebe & Iris Freight', 'Egeria–Doris Line', 'Vesta Consolidated', 'Juno Fidelity Carriers']
const MERCANTILE_FLEET = [
  ...GENUINE_LOSSES.filter((g) => g.owner_class === 'Mercantile').map((g) => g.hull),
  'Vesta Concord',
  'Iris Levant',
  'Juno Fidelity',
  'Amphitrite Bond',
  'Egeria Trust',
  'Doris Accord',
  'Kalliope Surety',
  'Cyrene Ore',
  'Hygiea Standard',
  'Psyche Margin',
  'Thetis Covenant',
  'Melpomene Draft',
  'Eunomia Bearer',
  'Massalia Bill',
  'Lutetia Clause',
  'Bellona Tender',
  'Leukothea Note',
  'Fides Carriage',
  'Proserpina Freight',
  'Euterpe Bond',
  'Ausonia Ledger',
  'Angelina Draft',
  'Nysa Concord',
  'Eugenia Marque',
  'Hestia Accord',
  'Aglaja Standard',
  'Klotho Surety',
  'Frigga Clearance',
  'Alkmene Bearer',
  'Pomona Trust',
  'Feronia Bill',
  'Danaë Levant',
  'Erato Draft',
  'Ino Covenant',
  'Panopaea Note',
]
const INDEPENDENT_FLEET: { hull: string; owner: string; compactFlag: boolean }[] = [
  ...COVER_LOSS_HULLS.map((c) => ({ hull: c.hull, owner: c.owner, compactFlag: true })),
  ...GENUINE_LOSSES.filter((g) => g.owner_class === 'independent').map((g) => ({ hull: g.hull, owner: g.owner, compactFlag: false })),
  { hull: 'Thessaly Dawn', owner: 'owner-master Y. Marsh', compactFlag: true },
  { hull: 'Quiet Argument', owner: 'owner-master D. Farrow', compactFlag: true },
  { hull: 'Second Furrow', owner: 'owner-master N. Ilunga', compactFlag: false },
  { hull: 'Pale Ordinary', owner: 'owner-master K. Sato-Brennan', compactFlag: true },
  { hull: 'Lantern Debt', owner: 'owner-master O. Winterhalter', compactFlag: false },
  { hull: 'Tarn Water', owner: 'owner-master E. Achebe', compactFlag: true },
  { hull: 'Old Reckoning', owner: 'owner-master J. Prakash', compactFlag: false },
  { hull: 'Aster Field', owner: 'owner-master C. Lindgren', compactFlag: true },
  { hull: 'Wren Lane', owner: 'owner-master A. Mbeki', compactFlag: false },
  { hull: 'Corbie Reach', owner: 'owner-master F. Duarte', compactFlag: true },
  { hull: 'Iron Tithe', owner: 'owner-master G. Novak', compactFlag: false },
  { hull: 'Ninefold', owner: 'owner-master I. Okonkwo', compactFlag: true },
  { hull: 'Gannet Row', owner: 'owner-master B. Sørensen', compactFlag: false },
  { hull: 'Halter Moon', owner: 'owner-master V. Reyes-Tan', compactFlag: true },
  { hull: 'Auger Hand', owner: 'owner-master W. Kaminski', compactFlag: false },
  { hull: 'Low Tide', owner: 'owner-master Z. Abubakar', compactFlag: true },
  { hull: 'Mercy Dividend', owner: 'owner-master R. Castellanos', compactFlag: false },
  { hull: 'Clay Pigeon', owner: 'owner-master P. Haugen', compactFlag: true },
  { hull: 'Hollow Fifth', owner: 'owner-master U. Nakamura', compactFlag: false },
  { hull: 'Slow Water', owner: 'owner-master L. Ferreira', compactFlag: true },
  { hull: 'Cinder Bough', owner: 'owner-master M. Oyelowo', compactFlag: false },
]

/** Lane-wide declared cargo mix (DS-14): He-3/D 0.38 · volatiles 0.21 · metals 0.17 · manufactured & other 0.24. */
export const LANE_CARGO_MIX: { category: CargoCategory; share: number }[] = [
  { category: 'He-3/D', share: 0.38 },
  { category: 'volatiles', share: 0.21 },
  { category: 'metals', share: 0.17 },
  { category: 'manufactured & other', share: 0.24 },
]

function cargoValue(r: Rng, c: CargoCategory): number {
  switch (c) {
    case 'He-3/D':
      return Math.round(r.uniform(80, 260))
    case 'volatiles':
      return Math.round(r.uniform(15, 45))
    case 'metals':
      return Math.round(r.uniform(40, 120))
    case 'manufactured & other':
      return Math.round(r.uniform(30, 150))
  }
}

function r2(x: number): number {
  return Math.round(x * 100) / 100
}

interface Draft {
  mark_last?: number
  time_to_silence?: number
  classification?: Classification
  hull_age?: number
  declared_cargo_value?: number
  cargo_category?: CargoCategory
  day: number
  hull: string
  hull_class: HullClass
  owner: string
  owner_class: OwnerClass
  severity: Severity
  kind: RecordKind
  mark: number
  office: Office
  fade: Fade
}

function buildRegister(): { register: RegisterRecord[]; losses: LossRecord[] } {
  const r = rng('DS-01', 'register')
  const drafts: Draft[] = []

  // --- The 31 losses -------------------------------------------------------------------------
  // Dates: draw the unnamed diverted dates and the eight genuine dates until the tightest 30-day
  // cluster is exactly the five of spring '82 (Kestrel Bough → Hygiea Promise).
  const coverDays = COVER_LOSS_HULLS.map((c) => daysFromIso(c.date))
  let divertedDays: number[] = []
  let genuineDays: number[] = []
  for (let tries = 0; tries < 2000; tries++) {
    divertedDays = DIVERTED_HULLS.map((d) => {
      if (d.date) return daysFromIso(d.date)
      const [lo, hi] = yearBounds(d.year)
      return r.int(lo, hi)
    })
    genuineDays = GENUINE_LOSSES.map(() => r.int(0, REGISTER_END_DAY))
    const all = [...coverDays, ...divertedDays, ...genuineDays]
    if (maxClusterWithin(all, 30) === 5 && new Set(all).size === all.length) break
  }

  // Cargo of the twelve non-diverted losses: the Lane mix, in the counts DS-14 records (He-3/D 5 · volatiles 2 · metals 2 · other 3).
  const twelveCargo = r.shuffle<CargoCategory>(['He-3/D', 'He-3/D', 'He-3/D', 'He-3/D', 'He-3/D', 'volatiles', 'volatiles', 'metals', 'metals', 'manufactured & other', 'manufactured & other', 'manufactured & other'])

  DIVERTED_HULLS.forEach((d, i) => {
    const mark_last = r2(r.uniform(9.05, 9.65))
    drafts.push({
      day: divertedDays[i],
      hull: d.hull,
      hull_class: 'Sulcus-Mk3',
      owner: 'Sulcus Freight',
      owner_class: 'Perrine',
      severity: 'loss',
      kind: 'loss',
      mark: mark_last,
      mark_last,
      office: 'Uruk',
      fade: 'gradual',
      time_to_silence: r2(r.uniform(3, 8)),
      classification: 'unknown',
      hull_age: Math.round(r.uniform(4, 22) * 10) / 10,
      declared_cargo_value: Math.round(r.uniform(18, 40)),
      cargo_category: 'volatiles',
    })
  })
  COVER_LOSS_HULLS.forEach((c, i) => {
    const cargo = twelveCargo[i]
    drafts.push({
      day: coverDays[i],
      hull: c.hull,
      hull_class: 'other',
      owner: c.owner,
      owner_class: 'independent',
      severity: 'loss',
      kind: 'loss',
      mark: c.mark_last,
      mark_last: c.mark_last,
      office: 'Uruk',
      fade: 'abrupt',
      time_to_silence: Math.round(r.uniform(0.003, 0.016) * 1000) / 1000,
      classification: 'piracy',
      hull_age: Math.round(r.uniform(4, 22) * 10) / 10,
      declared_cargo_value: cargoValue(r, cargo),
      cargo_category: cargo,
    })
  })
  GENUINE_LOSSES.forEach((g, i) => {
    let mark_last = 0
    for (let tries = 0; tries < 100; tries++) {
      mark_last = r2(r.uniform(1, 12))
      if (mark_last < 9 || mark_last > 10.5) break
    }
    const cargo = twelveCargo[4 + i]
    drafts.push({
      day: genuineDays[i],
      hull: g.hull,
      hull_class: g.hull_class,
      owner: g.owner,
      owner_class: g.owner_class,
      severity: 'loss',
      kind: 'loss',
      mark: mark_last,
      mark_last,
      office: 'Ceres',
      fade: 'abrupt',
      time_to_silence: Math.round(r.uniform(0.003, 0.016) * 1000) / 1000,
      classification: g.classification,
      hull_age: Math.round(r.uniform(4, 22) * 10) / 10,
      declared_cargo_value: cargoValue(r, cargo),
      cargo_category: cargo,
    })
  })

  // --- The nineteen's routine profile-deviation advisories at Mark 9 (late check-in, +2–3 d) ----
  DIVERTED_HULLS.forEach((d, i) => {
    drafts.push({
      day: Math.max(0, divertedDays[i] - r.int(1, 3)),
      hull: d.hull,
      hull_class: 'Sulcus-Mk3',
      owner: 'Sulcus Freight',
      owner_class: 'Perrine',
      severity: 'advisory',
      kind: 'profile deviation',
      mark: r2(r.uniform(9.0, 9.15)),
      office: 'Uruk',
      fade: null,
    })
  })

  // --- The other 2,150 minor records -------------------------------------------------------------
  const kinds: RecordKind[] = []
  const push = (k: RecordKind, n: number) => {
    for (let i = 0; i < n; i++) kinds.push(k)
  }
  push('transponder dropout', 100)
  push('profile deviation', 741)
  push('debris advisory', 880)
  push('medical diversion', 429)
  const shuffledKinds = r.shuffle(kinds)
  const lostSet = new Set(drafts.filter((d) => d.severity === 'loss').map((d) => `${d.hull}|${d.day}`))
  for (const kind of shuffledKinds) {
    const oc: OwnerClass = (['Perrine', 'Mercantile', 'independent'] as const)[r.weightedIndex([900, 1100, 612])]
    let hull: string
    let owner: string
    let hull_class: HullClass
    let office: Office
    if (oc === 'Perrine') {
      hull = r.choice(PERRINE_FLEET)
      owner = 'Sulcus Freight'
      hull_class = 'Sulcus-Mk3'
      office = 'Uruk'
    } else if (oc === 'Mercantile') {
      hull = r.choice(MERCANTILE_FLEET)
      owner = r.choice(MERCANTILE_HOUSES)
      hull_class = 'Tessera-C'
      office = 'Ceres'
    } else {
      const h = r.choice(INDEPENDENT_FLEET)
      hull = h.hull
      owner = h.owner
      hull_class = 'other'
      office = h.compactFlag ? 'Uruk' : 'Ceres'
    }
    let day = r.int(0, REGISTER_END_DAY)
    // A lost hull files nothing after its loss; keep its minor records before the loss date.
    const lossDay = [...lostSet].find((k) => k.startsWith(hull + '|'))
    if (lossDay) {
      const ld = Number(lossDay.split('|')[1])
      if (day >= ld) day = r.int(0, Math.max(0, ld - 1))
    }
    drafts.push({
      day,
      hull,
      hull_class,
      owner,
      owner_class: oc,
      severity: kind === 'transponder dropout' ? 'dropout' : kind === 'medical diversion' ? 'other' : 'advisory',
      kind,
      mark: r2(r.uniform(1, 12)),
      office,
      fade: kind === 'transponder dropout' ? 'gradual' : null,
    })
  }

  // --- Order and number ---------------------------------------------------------------------------
  drafts.sort((a, b) => a.day - b.day || a.hull.localeCompare(b.hull))
  const perYear = new Map<number, number>()
  const register: RegisterRecord[] = []
  const losses: LossRecord[] = []
  for (const d of drafts) {
    const date = isoFromDays(d.day)
    const year = Number(date.slice(0, 4))
    const seq = (perYear.get(year) ?? 0) + 1
    perYear.set(year, seq)
    const record_id = `LA-${year}-${String(seq).padStart(4, '0')}`
    const base: RegisterRecord = {
      record_id,
      date,
      day: d.day,
      hull: d.hull,
      hull_class: d.hull_class,
      owner: d.owner,
      owner_class: d.owner_class,
      severity: d.severity,
      kind: d.kind,
      mark: d.mark,
      office: d.office,
      fade: d.fade,
    }
    if (d.severity === 'loss') {
      const loss: LossRecord = {
        ...base,
        severity: 'loss',
        mark_last: d.mark_last!,
        time_to_silence: d.time_to_silence!,
        classification: d.classification!,
        hull_age: d.hull_age!,
        declared_cargo_value: d.declared_cargo_value!,
        cargo_category: d.cargo_category!,
      }
      register.push(loss)
      losses.push(loss)
    } else {
      register.push(base)
    }
  }
  return { register, losses }
}

const built = buildRegister()

/** The Lane Authority Incident Register at MET 0: 2,200 records, every severity. */
export const register: RegisterRecord[] = built.register
/** The 31 losses (the loss subtable), in date order. */
export const losses: LossRecord[] = built.losses

export const REGISTER_COLUMNS: { key: keyof RegisterRecord; label: string; kind: VariableKind; units?: string }[] = [
  { key: 'record_id', label: 'Record', kind: 'categorical' },
  { key: 'date', label: 'Date', kind: 'quantitative-continuous' },
  { key: 'hull', label: 'Hull', kind: 'categorical' },
  { key: 'hull_class', label: 'Class', kind: 'categorical' },
  { key: 'owner_class', label: 'Owner class', kind: 'categorical' },
  { key: 'severity', label: 'Severity', kind: 'categorical' },
  { key: 'kind', label: 'Record type', kind: 'categorical' },
  { key: 'mark', label: 'Mark', kind: 'quantitative-continuous', units: 'mark' },
  { key: 'office', label: 'Office', kind: 'categorical' },
]

export const SEVERITY_ORDER: Severity[] = ['loss', 'advisory', 'dropout', 'other']
export const OFFICE_ORDER: Office[] = ['Uruk', 'Ceres']
export const OWNER_ORDER: OwnerClass[] = ['Perrine', 'Mercantile', 'independent']
export const CLASSIFICATION_ORDER: Classification[] = ['unknown', 'accident', 'piracy']

export interface RegisterFilter {
  severity?: Severity | 'all'
  office?: Office | 'all'
  owner_class?: OwnerClass | 'all'
  year?: number | 'all'
}

export function filterRegister(records: readonly RegisterRecord[], f: RegisterFilter): RegisterRecord[] {
  return records.filter(
    (x) =>
      (!f.severity || f.severity === 'all' || x.severity === f.severity) &&
      (!f.office || f.office === 'all' || x.office === f.office) &&
      (!f.owner_class || f.owner_class === 'all' || x.owner_class === f.owner_class) &&
      (!f.year || f.year === 'all' || Number(x.date.slice(0, 4)) === f.year),
  )
}

/** Frequency table (count, relative frequency) of one categorical column over a set of records. */
export function registerFrequency<K extends 'severity' | 'office' | 'owner_class' | 'kind' | 'hull_class'>(records: readonly RegisterRecord[], column: K, order?: readonly RegisterRecord[K][]) {
  return countBy(
    records.map((x) => x[column] as string),
    order as readonly string[] | undefined,
  )
}

/** The Board's summary page, recomputed from the records (the numbers the Prologue's prose may quote as the Board's). */
export const registerSummary = {
  total: register.length,
  losses: losses.length,
  lossFraction: losses.length / register.length,
  /** "Mean mark 6.5, spread along the Lane" — over all 2,200 records of every severity. */
  meanMarkAll: mean(register.map((x) => x.mark)),
  meanMarkLosses: mean(losses.map((x) => x.mark_last)),
  years: 6,
  firstDate: register[0].date,
  lastDate: register[register.length - 1].date,
  severity: registerFrequency(register, 'severity', SEVERITY_ORDER),
  office: registerFrequency(register, 'office', OFFICE_ORDER),
  ownerClass: registerFrequency(register, 'owner_class', OWNER_ORDER),
}
