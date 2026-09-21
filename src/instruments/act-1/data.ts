/**
 * Act I datasets — generated once, deterministically, from the beat-sheet registry (docs/beat-sheet.md §2).
 *
 *   DS-01  The Register — 2,200 Lane Authority incident records (31 losses + 2,169 minor incidents)
 *   DS-09  (subset) the Transit Ledger's `hull_age` / `declared_cargo_value` for the 2,581 arrived transits,
 *          used by act-1-06 as the "arrived" baseline. Act II / Act V own the full Ledger; they may import this.
 *   DS-19  Drive-signature contact log — Oyelaran's 60 Lane plumes, MET 12–19, with the hot contact.
 *
 * Every draw goes through `@/lib/rng` with fixed string seeds; where a headline number is a target
 * (the Board's mean of 6.5, the 3.4-h mean time to silence, one contact beyond the fence, z ≈ 3.3),
 * a deterministic seed search picks the first child seed that reproduces it, so the data are identical
 * on every load and across modules. `data.test.ts` asserts the registry's headline numbers.
 *
 * The `group` field on a loss record encodes the hidden truth (diverted / cover / genuine) for tests and
 * later Acts. Act I instruments never display it.
 */
import { rng, type Rng } from '@/lib/rng'
import { mean, sd, outliers, zScore, normal, round } from '@/lib/stats'

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export type Office = 'Uruk' | 'Ceres'
export type Classification = 'accident' | 'piracy' | 'unknown'
export type Severity = 'loss' | 'advisory' | 'dropout' | 'other'
export type OwnerClass = 'Perrine' | 'Mercantile' | 'independent'
export type HullClass = 'Sulcus-Mk3' | 'Tessera-C' | 'other'
export type CargoCategory = 'He-3/D' | 'volatiles' | 'metals' | 'manufactured & other'
export type IncidentKind = 'loss' | 'transponder dropout' | 'debris advisory' | 'profile-deviation advisory' | 'medical diversion'
export type LossGroup = 'diverted' | 'cover' | 'genuine'

export interface RegisterRecord {
  record_id: string
  /** ISO date, 2178-01-01 … 2184-03-10. */
  date: string
  hull: string
  hull_class: HullClass
  owner: string
  owner_class: OwnerClass
  severity: Severity
  /** What the record is (the Register's free-text "nature" column). */
  kind: IncidentKind
  /** Fractional Lane mark at the record, 1.0–12.0. For a loss this equals `mark_last`. */
  mark: number
  /** Classifying office. */
  office: Office
  /** Transponder degradation profile, when the record is a fade (dropouts and losses). */
  fade?: 'gradual' | 'abrupt'
  /** Hours from first transponder degradation to final loss (or restoration) of signal, for fades. */
  fade_hours?: number
}

export interface LossRecord extends RegisterRecord {
  severity: 'loss'
  kind: 'loss'
  /** Fractional mark at last contact. */
  mark_last: number
  /** Hours from first transponder degradation to final loss of signal. */
  time_to_silence: number
  classification: Classification
  /** Years since commissioning. */
  hull_age: number
  /** Declared cargo value, M₵. */
  declared_cargo_value: number
  cargo_category: CargoCategory
  /** Hidden truth (never displayed in Act I). */
  group: LossGroup
}

export interface ArrivedTransit {
  transit_id: string
  hull: string
  owner_class: OwnerClass
  hull_age: number
  declared_cargo_value: number
  cargo_category: CargoCategory
}

export type DriveFamily = 'Mk 3' | 'Tessera-C' | 'Mk 2'

export interface Contact {
  contact_id: string
  /** Mission elapsed time of the log entry, "MET 013/04:12". */
  met: string
  /** Fractional MET day for ordering. */
  met_day: number
  hull: string
  owner_class: OwnerClass
  drive_family: DriveFamily
  pulse_hz: number
  /** Measured plume power, TW. */
  plume_TW: number
  /** Declared departure mass from the transponder, t. */
  declared_mass: number
  /** Class-table expectation for that mass and profile, TW. */
  expected_TW: number
  /** plume / expected × 100. */
  ratio_pct: number
  /** Filed acceleration profile, mgee. */
  accel_mgee: number
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const MS_DAY = 86_400_000
const EPOCH_START = Date.UTC(2178, 0, 1)
const EPOCH_END = Date.UTC(2184, 2, 10) // MET 0 = 2184-03-11

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function dateBetween(r: Rng, startMs = EPOCH_START, endMs = EPOCH_END): string {
  return isoDate(startMs + Math.floor(r.uniform(0, (endMs - startMs) / MS_DAY)) * MS_DAY)
}

function dayIndex(iso: string): number {
  return Math.round((Date.parse(iso + 'T00:00:00Z') - EPOCH_START) / MS_DAY)
}

/** Largest number of dates falling in any 30-day window. */
export function maxClusterIn(dates: readonly string[], windowDays = 30): number {
  const d = dates.map(dayIndex).sort((a, b) => a - b)
  let best = 0
  for (let i = 0, j = 0; i < d.length; i++) {
    while (j < d.length && d[j] - d[i] <= windowDays) j++
    best = Math.max(best, j - i)
  }
  return best
}

function r1(x: number): number {
  return Math.round(x * 10) / 10
}
function r2(x: number): number {
  return Math.round(x * 100) / 100
}
function r3(x: number): number {
  return Math.round(x * 1000) / 1000
}

/** An abrupt silence: 7–54 seconds between degradation and loss of signal, in hours (< 1 min). */
function abruptHours(r: Rng): number {
  return r3(r.uniform(0.002, 0.015))
}

/**
 * Deterministic seed search: the first child seed of `key` whose draw satisfies `accept`. The
 * result is fixed forever (same key → same child index → same data).
 */
function search<T>(key: string, draw: (r: Rng) => T, accept: (t: T) => boolean, max = 400): T {
  for (let k = 0; k < max; k++) {
    const t = draw(rng('act-1', key, k))
    if (accept(t)) return t
  }
  throw new Error(`data.ts: no acceptable draw for ${key} in ${max} seeds — loosen the acceptance rule`)
}

// ---------------------------------------------------------------------------------------------
// Names (originals; Ganymede / Venus surface features for the freight lines)
// ---------------------------------------------------------------------------------------------

const MERCANTILE_HOUSES = ['Ovda Mercantile', 'Tellus Line', 'Fortuna Haulage', 'Ishtar Combine', 'Laima Freight'] as const

const SULCUS_POOL = [
  'Nippur Sulcus', 'Erech Sulcus', 'Lagash Sulcus', 'Ur Sulcus', 'Akitu Sulcus', 'Sicyon Sulcus', 'Philae Sulcus', 'Arbela Sulcus',
  'Nineveh Sulcus', 'Mashu Sulcus', 'Apsu Sulci', 'Zu Fossae', 'Tettu Facula', 'Memphis Facula', 'Siwah Facula', 'Hathor Regio',
  'Latpon Regio', 'Nidaba Sulcus', 'Kittu Sulcus', 'Misharu Sulcus', 'Enkidu Regio', 'Anzu Sulcus', 'Nergal Sulcus', 'Bau Sulci',
  'Adad Sulcus', 'Lugalmeslam Sulcus', 'Etana Regio', 'Namtar Sulcus', 'Ninki Sulcus', 'Shamash Sulcus',
]
const TESSERA_POOL = [
  'Dekla', 'Manatum', 'Salus', 'Laima', 'Ovda', 'Thetis', 'Fortuna', 'Tellus', 'Meni', 'Kutue', 'Virilis', 'Gegute', 'Moira', 'Lhamo',
  'Ananke', 'Itzpapalotl', 'Ustrecha', 'Minu-Anni', 'Nemesis', 'Xi Wang-mu', 'Sudenitsa', 'Tahmina', 'Zirka', 'Ishkur', 'Atropos',
  'Clotho', 'Lachesis', 'Nortia', 'Shimti', 'Vako-nana', 'Yuki-Onne', 'Pasom-mana', 'Nzambi', 'Kruchina', 'Dolya',
].map((n) => `${n} Tessera`)
const INDEPENDENT_POOL = [
  'Thessaly Dawn', 'Greywater Fold', 'Ilmatar Seven', 'Cold Harbour', 'Pale Anchor', 'Quiet Ledger', 'Sable Tern', 'Wren of Vesta',
  'Amber Reach', 'Low Water', 'Second Chance', 'Marrow Light', 'Halter Moon', 'Cinder Row', 'Ninsun Carrier', 'Bright Weir',
  'Saltmarsh Reach', 'Kelp Line', 'Far Lantern', 'Ochre Gate', 'Stone Pilgrim', 'Tarn and Fell', 'Brass Heron', 'Lesser Tide',
]

// ---------------------------------------------------------------------------------------------
// DS-01 · The Register — the 31 losses
// ---------------------------------------------------------------------------------------------

/** The nineteen diverted Sulcus hulls (Perrine / Sulcus Freight), with Register loss dates. */
const DIVERTED: { hull: string; date: string }[] = [
  { hull: 'Perrine Regio', date: '2178-09-14' },
  { hull: 'Tiamat Sulcus', date: '2179-02-27' },
  { hull: 'Galileo Regio', date: '2179-10-08' },
  { hull: 'Barnard Regio', date: '2180-01-19' },
  { hull: 'Uruk Sulcus', date: '2180-06-30' },
  { hull: 'Dardanus Sulcus', date: '2180-11-12' },
  { hull: 'Mysia Sulci', date: '2181-03-03' },
  { hull: 'Phrygia Sulcus', date: '2181-05-21' },
  { hull: 'Sippar Sulcus', date: '2181-08-16' },
  { hull: 'Anshar Sulcus', date: '2181-12-04' },
  { hull: 'Nicholson Regio', date: '2182-03-06' },
  { hull: 'Xibalba Sulcus', date: '2182-03-18' },
  { hull: 'Byblus Sulcus', date: '2182-08-09' },
  { hull: 'Nun Sulci', date: '2182-11-27' },
  { hull: 'Elam Sulci', date: '2183-02-14' },
  { hull: 'Lakhmu Fossae', date: '2183-05-30' },
  { hull: 'Zakar Sulcus', date: '2183-09-02' },
  { hull: 'Kishar Sulcus', date: '2183-12-19' },
  { hull: 'Bubastis Sulci', date: '2184-02-20' },
]

/** The four cover losses (independents, wrecked by the tug). */
const COVER: { hull: string; date: string; mark_last: number; owner: string }[] = [
  { hull: 'Kestrel Bough', date: '2182-02-24', mark_last: 9.6, owner: 'Bough Partnership' },
  { hull: 'Thessaly Ember', date: '2182-03-08', mark_last: 9.9, owner: 'Marsh family' },
  { hull: 'Hygiea Promise', date: '2182-03-21', mark_last: 10.2, owner: 'Hygiea Cooperative' },
  { hull: 'Long Fathom', date: '2182-06-02', mark_last: 10.5, owner: 'Fathom Deep Haulage' },
]

/** The eight genuine losses (reactor casualties, debris). Classification 5 accident + 3 unknown, all Ceres. */
const GENUINE: { hull: string; owner_class: OwnerClass; owner: string; classification: Classification }[] = [
  { hull: 'Corvid Meridian', owner_class: 'independent', owner: 'Meridian Partnership', classification: 'accident' },
  { hull: 'Kutue Tessera', owner_class: 'Mercantile', owner: 'Ovda Mercantile', classification: 'accident' },
  { hull: 'Anansi Deep', owner_class: 'independent', owner: 'Anansi Deep Ltd', classification: 'unknown' },
  { hull: 'Ustrecha Tessera', owner_class: 'Mercantile', owner: 'Tellus Line', classification: 'accident' },
  { hull: 'Hollow Tide', owner_class: 'independent', owner: 'Hollow Tide Cooperative', classification: 'unknown' },
  { hull: 'Zirka Tessera', owner_class: 'Mercantile', owner: 'Fortuna Haulage', classification: 'accident' },
  { hull: 'Atropos Tessera', owner_class: 'Mercantile', owner: 'Ishtar Combine', classification: 'accident' },
  { hull: 'Shimti Tessera', owner_class: 'Mercantile', owner: 'Laima Freight', classification: 'unknown' },
]

/** Hulls the Register records as lost never appear as live hulls elsewhere (continuity). */
const LOST_NAMES = new Set<string>([...DIVERTED.map((d) => d.hull), ...COVER.map((c) => c.hull), ...GENUINE.map((g) => g.hull)])
const LIVE_SULCUS = SULCUS_POOL.filter((n) => !LOST_NAMES.has(n))
const LIVE_TESSERA = TESSERA_POOL.filter((n) => !LOST_NAMES.has(n))
const LIVE_INDEPENDENT = INDEPENDENT_POOL.filter((n) => !LOST_NAMES.has(n))

const LANE_MIX: { category: CargoCategory; p: number }[] = [
  { category: 'He-3/D', p: 0.38 },
  { category: 'volatiles', p: 0.21 },
  { category: 'metals', p: 0.17 },
  { category: 'manufactured & other', p: 0.24 },
]
export const LANE_CARGO_MIX = LANE_MIX

/** Declared cargo value (M₵) by category: lognormal-ish around a category median. */
function cargoValue(r: Rng, category: CargoCategory): number {
  const median = category === 'He-3/D' ? 118 : category === 'volatiles' ? 33 : category === 'metals' ? 56 : 74
  return r1(median * Math.exp(r.normal(0, 0.32)))
}

function hullAge(r: Rng): number {
  return r1(Math.min(30, Math.max(2, r.normal(14, 6))))
}

function drawLosses(r: Rng): LossRecord[] {
  const out: LossRecord[] = []
  // Cargo categories for the 12 non-diverted losses reproduce DS-14: He-3/D 5 · volatiles 2 · metals 2 · other 3 (+19 diverted volatiles = 21).
  const twelveCargo = r.shuffle<CargoCategory>(['He-3/D', 'He-3/D', 'He-3/D', 'He-3/D', 'He-3/D', 'volatiles', 'volatiles', 'metals', 'metals', 'manufactured & other', 'manufactured & other', 'manufactured & other'])
  let c = 0
  for (const d of DIVERTED) {
    const mark = r2(r.uniform(9.05, 9.65))
    out.push({
      record_id: '',
      date: d.date,
      hull: d.hull,
      hull_class: 'Sulcus-Mk3',
      owner: 'Sulcus Freight',
      owner_class: 'Perrine',
      severity: 'loss',
      kind: 'loss',
      mark,
      mark_last: mark,
      office: 'Uruk',
      fade: 'gradual',
      time_to_silence: r2(r.uniform(3, 8)),
      fade_hours: 0,
      classification: 'unknown',
      hull_age: hullAge(r),
      declared_cargo_value: r1(r.uniform(18, 40)),
      cargo_category: 'volatiles',
      group: 'diverted',
    })
  }
  for (const k of COVER) {
    const cat = twelveCargo[c++]
    out.push({
      record_id: '',
      date: k.date,
      hull: k.hull,
      hull_class: 'other',
      owner: k.owner,
      owner_class: 'independent',
      severity: 'loss',
      kind: 'loss',
      mark: k.mark_last,
      mark_last: k.mark_last,
      office: 'Uruk',
      fade: 'abrupt',
      time_to_silence: abruptHours(r),
      fade_hours: 0,
      classification: 'piracy',
      hull_age: hullAge(r),
      declared_cargo_value: cargoValue(r, cat),
      cargo_category: cat,
      group: 'cover',
    })
  }
  for (const g of GENUINE) {
    const cat = twelveCargo[c++]
    // Genuine losses land anywhere on the Lane except the diversion band, so the 23-of-31 headline holds.
    const mark = r2(r.uniform(1, 12))
    out.push({
      record_id: '',
      date: dateBetween(r),
      hull: g.hull,
      hull_class: g.owner_class === 'Mercantile' ? 'Tessera-C' : 'other',
      owner: g.owner,
      owner_class: g.owner_class,
      severity: 'loss',
      kind: 'loss',
      mark,
      mark_last: mark,
      office: 'Ceres',
      fade: 'abrupt',
      time_to_silence: abruptHours(r),
      fade_hours: 0,
      classification: g.classification,
      hull_age: hullAge(r),
      declared_cargo_value: cargoValue(r, cat),
      cargo_category: cat,
      group: 'genuine',
    })
  }
  for (const l of out) l.fade_hours = l.time_to_silence
  return out
}

const lossesRaw = search('DS-01/losses', drawLosses, (ls) => {
  const genuine = ls.filter((l) => l.group === 'genuine')
  if (genuine.some((l) => l.mark_last >= 9 && l.mark_last <= 10.5)) return false
  if (maxClusterIn(ls.map((l) => l.date)) !== 5) return false
  const tts = ls.map((l) => l.time_to_silence)
  if (round(mean(tts), 1) !== 3.4) return false
  const m = mean(ls.map((l) => l.mark_last))
  return m >= 8.4 && m <= 9.0
})

// ---------------------------------------------------------------------------------------------
// DS-01 · The 2,169 minor incidents
// ---------------------------------------------------------------------------------------------

const ADVISORY_COUNT = 2169
const DROPOUT_COUNT = 100

function drawAdvisories(r: Rng): RegisterRecord[] {
  const out: RegisterRecord[] = []
  const kinds: IncidentKind[] = []
  for (let i = 0; i < DROPOUT_COUNT; i++) kinds.push('transponder dropout')
  // One profile-deviation advisory (late check-in at Mark 9) per diverted hull, as any thrust-limited hull draws.
  const diverted = DIVERTED.length
  for (let i = 0; i < diverted; i++) kinds.push('profile-deviation advisory')
  while (kinds.length < ADVISORY_COUNT) {
    const u = r.float()
    kinds.push(u < 0.52 ? 'debris advisory' : u < 0.86 ? 'profile-deviation advisory' : 'medical diversion')
  }
  for (let i = 0; i < ADVISORY_COUNT; i++) {
    const kind = kinds[i]
    const isDivertedAdvisory = i >= DROPOUT_COUNT && i < DROPOUT_COUNT + diverted
    let owner_class: OwnerClass
    let hull: string
    let owner: string
    let hull_class: HullClass
    if (isDivertedAdvisory) {
      owner_class = 'Perrine'
      hull = DIVERTED[i - DROPOUT_COUNT].hull
      owner = 'Sulcus Freight'
      hull_class = 'Sulcus-Mk3'
    } else {
      const u = r.float()
      owner_class = u < 0.345 ? 'Perrine' : u < 0.765 ? 'Mercantile' : 'independent'
      if (owner_class === 'Perrine') {
        hull = r.choice(LIVE_SULCUS)
        owner = 'Sulcus Freight'
        hull_class = 'Sulcus-Mk3'
      } else if (owner_class === 'Mercantile') {
        hull = r.choice(LIVE_TESSERA)
        owner = r.choice(MERCANTILE_HOUSES)
        hull_class = 'Tessera-C'
      } else {
        hull = r.choice(LIVE_INDEPENDENT)
        owner = `${hull} (owner-master)`
        hull_class = 'other'
      }
    }
    const office: Office = owner_class === 'Perrine' ? 'Uruk' : owner_class === 'Mercantile' ? 'Ceres' : r.bool(0.5) ? 'Uruk' : 'Ceres'
    const mark = isDivertedAdvisory ? r2(r.uniform(9.0, 9.3)) : r2(r.uniform(1, 12))
    const rec: RegisterRecord = {
      record_id: '',
      // The late-check-in advisory is logged on the diverted hull's last transit — the day the Register loses it.
      date: isDivertedAdvisory ? DIVERTED[i - DROPOUT_COUNT].date : dateBetween(r),
      hull,
      hull_class,
      owner,
      owner_class,
      severity: kind === 'transponder dropout' ? 'dropout' : kind === 'medical diversion' ? 'other' : 'advisory',
      kind,
      mark,
      office,
    }
    if (kind === 'transponder dropout') {
      rec.fade = 'gradual'
      rec.fade_hours = r2(r.uniform(3, 8))
    }
    out.push(rec)
  }
  return out
}

const advisoriesRaw = search(
  'DS-01/advisories',
  drawAdvisories,
  (adv) => {
    const all = [...adv.map((a) => a.mark), ...lossesRaw.map((l) => l.mark_last)]
    return round(mean(all), 1) === 6.5
  },
  200,
)

/** All 2,200 Register records, in date order, with sequential ids. */
export const register: RegisterRecord[] = [...advisoriesRaw, ...lossesRaw]
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.hull.localeCompare(b.hull)))
  .map((rec, i) => ({ ...rec, record_id: `LA-${String(i + 1).padStart(4, '0')}` }))

/** The loss subtable — 31 rows. */
export const losses: LossRecord[] = register.filter((r): r is LossRecord => r.severity === 'loss')

/** The 2,169 minor incidents. */
export const advisories: RegisterRecord[] = register.filter((r) => r.severity !== 'loss')

/** Column vectors used by the Act I instruments and beats. */
export const allMarks: number[] = register.map((r) => r.mark)
export const lossMarks: number[] = losses.map((l) => l.mark_last)
export const timeToSilence: number[] = losses.map((l) => l.time_to_silence)

/** Gradual fades across every record: 100 resolved dropouts + the 19 gradual losses. */
export const gradualFades: RegisterRecord[] = register.filter((r) => r.fade === 'gradual')

export const REGISTER_COLUMNS = ['record_id', 'date', 'hull', 'hull_class', 'owner', 'owner_class', 'severity', 'kind', 'mark', 'office'] as const
export const LOSS_COLUMNS = ['record_id', 'date', 'hull', 'hull_class', 'owner', 'owner_class', 'classification', 'office', 'mark_last', 'time_to_silence', 'hull_age', 'declared_cargo_value', 'cargo_category'] as const

export type VariableType = 'categorical' | 'quantitative-discrete' | 'quantitative-continuous' | 'identifier'

/** Variable types of the Register's columns (the act-1-01 inspector's answer key). */
export const VARIABLE_TYPES: Record<string, { type: VariableType; units?: string; note: string }> = {
  record_id: { type: 'identifier', note: 'A label for the individual, not a variable to summarize.' },
  date: { type: 'quantitative-continuous', units: 'date', note: 'A point in time; differences between dates are meaningful (days).' },
  hull: { type: 'identifier', note: 'Names the individual hull. Counting records per hull would make it a variable.' },
  hull_class: { type: 'categorical', note: 'Three design families. Order and arithmetic mean nothing.' },
  owner: { type: 'categorical', note: 'Which company. A label.' },
  owner_class: { type: 'categorical', note: 'Perrine / Mercantile / independent.' },
  severity: { type: 'categorical', note: 'A code. Loss is not "more" than advisory in any arithmetic sense.' },
  kind: { type: 'categorical', note: 'The nature of the record.' },
  classification: { type: 'categorical', note: 'Accident / piracy / unknown — a code assigned by an office, not a measurement.' },
  office: { type: 'categorical', note: 'Which office classified the record.' },
  mark: { type: 'quantitative-continuous', units: 'Lane marks', note: 'Fractional position along the Lane (Mark 1 to 12). Mark 9.35 is a real position.' },
  mark_last: { type: 'quantitative-continuous', units: 'Lane marks', note: 'Fractional position at last contact.' },
  time_to_silence: { type: 'quantitative-continuous', units: 'hours', note: 'Elapsed time; any value on a continuum.' },
  hull_age: { type: 'quantitative-continuous', units: 'years', note: 'Elapsed time since commissioning.' },
  declared_cargo_value: { type: 'quantitative-continuous', units: 'M₵', note: 'Money on a continuous scale.' },
  cargo_category: { type: 'categorical', note: 'Four cargo classes.' },
}

// ---------------------------------------------------------------------------------------------
// DS-09 (subset) · the arrived transits' hull age and declared cargo value
// ---------------------------------------------------------------------------------------------

const ARRIVED_COUNT = 2612 - 31

function drawArrived(r: Rng): ArrivedTransit[] {
  const out: ArrivedTransit[] = []
  for (let i = 0; i < ARRIVED_COUNT; i++) {
    const u = r.float()
    const owner_class: OwnerClass = u < 881 / ARRIVED_COUNT ? 'Perrine' : u < (881 + 1095) / ARRIVED_COUNT ? 'Mercantile' : 'independent'
    const hull = owner_class === 'Perrine' ? r.choice(LIVE_SULCUS) : owner_class === 'Mercantile' ? r.choice(LIVE_TESSERA) : r.choice(LIVE_INDEPENDENT)
    const category = LANE_MIX[r.weightedIndex(LANE_MIX.map((m) => m.p))].category
    out.push({ transit_id: `T-${String(i + 1).padStart(4, '0')}`, hull, owner_class, hull_age: hullAge(r), declared_cargo_value: cargoValue(r, category), cargo_category: category })
  }
  return out
}

/** The 2,581 transits that arrived (DS-09 columns Act I uses). */
export const arrivedTransits: ArrivedTransit[] = search('DS-09/arrived', drawArrived, (a) => {
  // The lost hulls' declared value sits clearly below the Lane's; hull age shows no difference.
  const vals = a.map((t) => t.declared_cargo_value).sort((x, y) => x - y)
  const laneMedian = vals[Math.floor(vals.length / 2)]
  const lostVals = losses.map((l) => l.declared_cargo_value).sort((x, y) => x - y)
  const lostMedian = lostVals[15]
  const ageGap = Math.abs(mean(a.map((t) => t.hull_age)) - mean(losses.map((l) => l.hull_age)))
  return laneMedian > lostMedian * 1.5 && ageGap < 1.2
})

export const arrivedAges: number[] = arrivedTransits.map((t) => t.hull_age)
export const arrivedValues: number[] = arrivedTransits.map((t) => t.declared_cargo_value)
export const lostAges: number[] = losses.map((l) => l.hull_age)
export const lostValues: number[] = losses.map((l) => l.declared_cargo_value)

// ---------------------------------------------------------------------------------------------
// DS-19 · Drive-signature contact log
// ---------------------------------------------------------------------------------------------

const MGEE = 0.00981 // m/s²

/** Class table: exhaust velocity (km/s) and pulse rate by drive family; plume power = m · a · vₑ / 2. */
export const CLASS_TABLE: Record<DriveFamily, { exhaust_km_s: number; pulse_hz: number; owner_class: OwnerClass; hull_class: HullClass }> = {
  'Mk 3': { exhaust_km_s: 1000, pulse_hz: 61, owner_class: 'Perrine', hull_class: 'Sulcus-Mk3' },
  'Tessera-C': { exhaust_km_s: 900, pulse_hz: 40, owner_class: 'Mercantile', hull_class: 'Tessera-C' },
  'Mk 2': { exhaust_km_s: 940, pulse_hz: 54, owner_class: 'independent', hull_class: 'other' },
}

/** The class table's rated spread of plume ratio, percent (Oyelaran's z of 2.6 is against this). */
export const RATED_SPREAD_PCT = 3.5

/** Expected plume power (TW) for a declared mass (t) on a filed profile (mgee). */
export function expectedPlumeTW(family: DriveFamily, declaredMassT: number, accelMgee: number): number {
  const F = declaredMassT * 1000 * accelMgee * MGEE // N
  return (F * CLASS_TABLE[family].exhaust_km_s * 1000) / 2 / 1e12
}

const HARPAGIA = { hull: 'Harpagia Sulcus', declared_mass: 19_400, ratio_pct: 109.2 }

const SULCUS_CONTACT_POOL = LIVE_SULCUS.filter((n) => n !== HARPAGIA.hull)

function metStamp(day: number): string {
  const d = Math.floor(day)
  const h = Math.floor((day - d) * 24)
  const m = Math.floor(((day - d) * 24 - h) * 60)
  return `MET ${String(d).padStart(3, '0')}/${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function drawContacts(r: Rng): Contact[] {
  const families: DriveFamily[] = []
  for (let i = 0; i < 29; i++) families.push('Mk 3')
  for (let i = 0; i < 25; i++) families.push('Tessera-C')
  for (let i = 0; i < 6; i++) families.push('Mk 2')
  const shuffled = r.shuffle(families)
  // Eleven contacts by MET 15, the rest by MET 19/12; the hot contact is among the first eleven.
  const days: number[] = []
  for (let i = 0; i < 11; i++) days.push(r.uniform(12.25, 15))
  for (let i = 11; i < 60; i++) days.push(r.uniform(15, 19.5))
  days.sort((a, b) => a - b)
  const hotIndex = r.int(2, 10)
  const usedSulcus = new Set<string>()
  const usedTessera = new Set<string>()
  const usedIndep = new Set<string>()
  const pick = (pool: string[], used: Set<string>) => {
    const free = pool.filter((n) => !used.has(n))
    const n = r.choice(free.length ? free : pool)
    used.add(n)
    return n
  }
  const out: Contact[] = []
  for (let i = 0; i < 60; i++) {
    const hot = i === hotIndex
    const family: DriveFamily = hot ? 'Mk 3' : shuffled[i]
    const accel = r1(r.uniform(2.85, 3.15))
    const declared = hot ? HARPAGIA.declared_mass : family === 'Mk 3' ? Math.round(r.uniform(17_000, 26_000) / 100) * 100 : family === 'Tessera-C' ? Math.round(r.uniform(11_500, 17_500) / 100) * 100 : Math.round(r.uniform(12_000, 18_000) / 100) * 100
    const ratio = hot ? HARPAGIA.ratio_pct : r1(r.normal(100, 2.8))
    const expected = expectedPlumeTW(family, declared, accel)
    const hull = hot ? HARPAGIA.hull : family === 'Mk 3' ? pick(SULCUS_CONTACT_POOL, usedSulcus) : family === 'Tessera-C' ? pick(LIVE_TESSERA, usedTessera) : pick(LIVE_INDEPENDENT, usedIndep)
    out.push({
      contact_id: `C-${String(i + 1).padStart(3, '0')}`,
      met: metStamp(days[i]),
      met_day: days[i],
      hull,
      owner_class: CLASS_TABLE[family].owner_class,
      drive_family: family,
      pulse_hz: r1(CLASS_TABLE[family].pulse_hz + r.normal(0, 0.15)),
      plume_TW: Number((expected * ratio / 100).toFixed(4)),
      declared_mass: declared,
      expected_TW: Number(expected.toFixed(4)),
      ratio_pct: ratio,
      accel_mgee: accel,
    })
  }
  return out
}

export const contacts: Contact[] = search(
  'DS-19/contacts',
  drawContacts,
  (cs) => {
    const ratios = cs.map((c) => c.ratio_pct)
    const hot = cs.find((c) => c.hull === HARPAGIA.hull)!
    const honest = cs.filter((c) => c !== hot).map((c) => c.ratio_pct)
    // Exactly one contact beyond the 1.5×IQR fences, and it is the hot one.
    const out = outliers(ratios).values
    if (out.length !== 1 || out[0] !== HARPAGIA.ratio_pct) return false
    // The fleet's own spread (hot contact set aside) gives z ≈ 3.3 and P ≈ 0.0005.
    const m = mean(honest)
    const s = sd(honest)
    if (Math.abs(m - 100) > 0.45) return false
    const z = zScore(HARPAGIA.ratio_pct, m, s)
    if (z < 3.2 || z > 3.4) return false
    // The hot contact moves the sixty's mean by about a sixth of a point and the first eleven's by nearly a point.
    const shift60 = mean(ratios) - m
    const first11 = cs.slice(0, 11).map((c) => c.ratio_pct)
    const first11Honest = cs.slice(0, 11).filter((c) => c !== hot).map((c) => c.ratio_pct)
    const shift11 = mean(first11) - mean(first11Honest)
    if (shift60 < 0.12 || shift60 > 0.2) return false
    if (shift11 < 0.7 || shift11 > 1.0) return false
    // Plume power reads as two humps: Mk 3 hulls above the Tessera-C hulls with a visible gap in the family means.
    const mk3 = cs.filter((c) => c.drive_family === 'Mk 3').map((c) => c.plume_TW)
    const tc = cs.filter((c) => c.drive_family === 'Tessera-C').map((c) => c.plume_TW)
    return mean(mk3) - mean(tc) > 0.06
  },
  600,
)

/** The hot contact, MV Harpagia Sulcus. */
export const harpagia: Contact = contacts.find((c) => c.hull === HARPAGIA.hull)!
export const harpagiaIndex = contacts.indexOf(harpagia)

/** Oyelaran's first eleven contacts (logged by MET 15). */
export const firstEleven: Contact[] = contacts.slice(0, 11)

export const ratioPct: number[] = contacts.map((c) => c.ratio_pct)
export const plumeTW: number[] = contacts.map((c) => c.plume_TW)
export const ratioFirstEleven: number[] = firstEleven.map((c) => c.ratio_pct)

/** The 59 contacts with the flagged hull set aside. */
export const honestRatios: number[] = contacts.filter((c) => c !== harpagia).map((c) => c.ratio_pct)

/**
 * The fleet's own normal model of honest plume ratios (act-1-07): mean and SD of the sixty contacts
 * with the fence-flagged hull set aside. Compare with the class table's rated spread, RATED_SPREAD_PCT.
 */
export const fleetModel = { mean: mean(honestRatios), sd: sd(honestRatios) }

/** z of the hot contact against the fleet model, and the upper-tail proportion under N(mean, sd). */
export const harpagiaZ = zScore(harpagia.ratio_pct, fleetModel.mean, fleetModel.sd)
export const harpagiaTail = normal.sf(harpagia.ratio_pct, fleetModel.mean, fleetModel.sd)

/** Bureau certification for the hot contact (arrives MET 26). */
export const HARPAGIA_CERTIFICATION = { hull: HARPAGIA.hull, declared_mass_t: HARPAGIA.declared_mass, examiner: 'R. Dacre', drive: 'Adlinda Mk 3', departure: 'Uruk High' }

/** Headline sizes for prose and tests. */
export const REGISTER_META = {
  records: register.length,
  losses: losses.length,
  advisories: advisories.length,
  contacts: contacts.length,
  firstContacts: firstEleven.length,
  arrived: arrivedTransits.length,
}
