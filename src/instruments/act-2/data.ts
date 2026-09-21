/**
 * Act II datasets — generated once, deterministically, from the beat-sheet registry (docs/beat-sheet.md §2).
 *
 *   DS-00  the one physical model of the nineteen (hidden mass h, thrust limitation, f_lane)
 *   DS-01  the Register's loss subtable: classification × owner class (31 rows, canonical)   → act-2-01
 *   DS-02  the Manifest file: 412 Bureau departure certifications ⋈ Mark 2 telemetry        → act-2-02 … 2-05, 2-06 (fuel)
 *   DS-09  a 300-transit Ledger sample: time-to-Mark-9 vs Lane length (incl. the nineteen)  → act-2-06
 *
 * Every draw goes through `rng('DS-xx', attempt)`. A candidate seed is REJECTED unless the registry's
 * headline numbers hold (the residual band separates the nineteen, Cyrene Ore is high-leverage but not
 * influential, the log–log slope is ≈ 0.50 …); the first accepted attempt is the dataset, forever.
 * `src/instruments/act-2/data.test.ts` asserts the headline numbers.
 *
 * Read-only for later Acts: import from '@/instruments/act-2/data'.
 */
import { rng, type Rng } from '@/lib/rng'
import { linearRegression, transformedRegression, twoWay, sd, mean, type RegressionFit, type TwoWayTable } from '@/lib/stats'
import { losses as registerLosses } from '@/instruments/act-1/data'

// ---------------------------------------------------------------------------------------------
// DS-00 · physics (story bible §2.3–2.4)
// ---------------------------------------------------------------------------------------------

const AU_M = 1.496e11
const MGEE = 0.00981 // m/s² per milligee

/** Lane constants: nominal profile 3.00 mgee, freighter exhaust 1,000 km/s, Mk 3 thrust 588 kN (612 kN uprated). */
export const LANE = { aNomMgee: 3.0, veKms: 1000, thrustKn: 588, uprateKn: 612 } as const

/** Brachistochrone Δv = 2√(d·a) in km/s for a Lane length d (AU) at acceleration a (mgee). */
export function laneDeltaV(dAU: number, aMgee: number): number {
  return (2 * Math.sqrt(dAU * AU_M * aMgee * MGEE)) / 1000
}

/** Full transit time 2√(d/a) in days. */
export function transitDays(dAU: number, aMgee: number): number {
  return (2 * Math.sqrt((dAU * AU_M) / (aMgee * MGEE))) / 86400
}

/** Lane-standard fuel fraction f_lane(d) = 1 − e^(−2√(d·a_nom)/vₑ): 0.186 at 2.4 AU, 0.215 at 3.33, 0.313 at 8. */
export function fLane(dAU: number): number {
  return 1 - Math.exp(-laneDeltaV(dAU, LANE.aNomMgee) / LANE.veKms)
}

/** Scheduled time to Mark 9 (0.75 of the nominal transit): 61 d at 2.4 AU, 71.4 at 3.33, 111 at 8. */
export function scheduledT9(dAU: number): number {
  return 0.75 * transitDays(dAU, LANE.aNomMgee)
}

/** Thrust (kN) implied by a mass (t) accelerating at a (mgee). 20,000 t × 3.00 mgee = 588.6 kN. */
export function thrustKn(massT: number, aMgee: number): number {
  return massT * aMgee * MGEE
}

/** Plume jet power (TW) ≈ F·vₑ/2 for a 1,000 km/s exhaust: 588 kN → 0.294 TW. */
export function plumeTW(thrust: number): number {
  return (thrust * 1000 * LANE.veKms * 1000) / 2 / 1e12
}

// ---------------------------------------------------------------------------------------------
// DS-01 · the loss subtable (canonical — the Register snapshot at MET 0; decisions log §5.4)
// ---------------------------------------------------------------------------------------------

export type OwnerClass = 'Perrine' | 'Mercantile' | 'independent'
export type Classification = 'accident' | 'piracy' | 'unknown'
export type Office = 'Uruk' | 'Ceres'

export interface LossRecord {
  hull: string
  ownerClass: OwnerClass
  classification: Classification
  office: Office
  /** Hidden truth — the nineteen PROVIDENT diversions. Never shown in an Act II instrument. */
  diverted: boolean
}

/** The nineteen diverted Sulcus hulls, in the registry's order. */
export const THE_NINETEEN = [
  'Nicholson Regio',
  'Xibalba Sulcus',
  'Perrine Regio',
  'Tiamat Sulcus',
  'Galileo Regio',
  'Barnard Regio',
  'Uruk Sulcus',
  'Dardanus Sulcus',
  'Mysia Sulci',
  'Phrygia Sulcus',
  'Sippar Sulcus',
  'Anshar Sulcus',
  'Byblus Sulcus',
  'Nun Sulci',
  'Elam Sulci',
  'Lakhmu Fossae',
  'Zakar Sulcus',
  'Kishar Sulcus',
  'Bubastis Sulci',
] as const

/**
 * The 31 losses in the Register at MET 0 — taken from Act I's Register (DS-01 is Act I's dataset; the two
 * Acts must show the same hulls). Perrine 19 (all unknown, Uruk); the twelve others per Act I's draw
 * (accident 5, unknown 3 — Ceres; piracy 4 — Uruk).
 */
export const lossRecords: LossRecord[] = registerLosses.map((l) => ({
  hull: l.hull,
  ownerClass: l.owner_class,
  classification: l.classification,
  office: l.office,
  diverted: l.group === 'diverted',
}))

/** The twelve honest lost hulls (cover losses and genuine casualties), with Act I's owner classes. */
const OTHER_LOSSES = lossRecords.filter((l) => !l.diverted)

/** Register loss dates of the nineteen (Act I), by hull. */
const LOSS_DATES = new Map(registerLosses.filter((l) => l.group === 'diverted').map((l) => [l.hull, l.date]))

export const OWNER_CLASSES: OwnerClass[] = ['Perrine', 'Mercantile', 'independent']
export const CLASSIFICATIONS: Classification[] = ['accident', 'piracy', 'unknown']

/** Cross-tabulate any subset of loss records (rows = owner class, cols = classification). */
export function crossTab(records: readonly LossRecord[]): number[][] {
  return OWNER_CLASSES.map((o) => CLASSIFICATIONS.map((c) => records.filter((r) => r.ownerClass === o && r.classification === c).length))
}

/** classification × owner_class for the 31 (rows Perrine / Mercantile / independent; cols accident / piracy / unknown). */
export const lossCounts: number[][] = crossTab(lossRecords)

/** The same table with joint / marginal / conditional distributions (from @/lib/stats). */
export const lossTwoWay: TwoWayTable = twoWay(lossCounts, { rows: OWNER_CLASSES, cols: CLASSIFICATIONS })

// ---------------------------------------------------------------------------------------------
// DS-02 · the Manifest file
// ---------------------------------------------------------------------------------------------

export type Drive = 'Mk 3' | 'Tessera-C' | 'other'
export type Examiner = 'Dacre' | 'Voss' | 'Amari' | 'Penrose'

export interface Departure {
  /** 0-based row index in `manifest`. */
  id: number
  hull: string
  ownerClass: OwnerClass
  drive: Drive
  /** ISO date of the Bureau certification. */
  departureDate: string
  /** Lane length at departure (AU), from the Ledger. */
  laneLengthAU: number
  /** Declared departure mass incl. propellant (t). */
  declaredMass: number
  /** Fuel actually loaded (t). */
  fuelLoaded: number
  /** The Bureau's own column: f_lane(d) × declared mass (t). */
  requiredFuel: number
  examiner: Examiner
  /** Acceleration from the relay net's Mark 2 state vectors (mgee). */
  accelMark2: number
  /** Plume jet power (TW). */
  plumePower: number
  /** thrust(plume, drive model) ÷ acceleration (t). */
  inferredMass: number
  /** In the Register's loss subtable at MET 0. */
  laterLost: boolean
  /** Hidden truth: one of the nineteen. Tests and Act IX only — never a column an Act II instrument shows. */
  diverted: boolean
}

const PERRINE_POOL = [
  'Nippur Sulcus', 'Philus Sulcus', 'Mummu Sulcus', 'Apsu Sulci', 'Arbela Sulcus', 'Dukyong Sulci', 'Erech Sulcus', 'Lagash Sulcus', 'Mashu Sulcus',
  'Misharu Sulcus', 'Nabu Sulcus', 'Nergal Sulcus', 'Nineveh Sulcus', 'Sicyon Sulcus', 'Ur Sulcus', 'Akitu Sulcus', 'Anzu Regio', 'Babbar Sulcus',
  'Ninkasi Sulcus', 'Khensu Regio', 'Latmus Sulcus', 'Adad Sulcus', 'Enlil Regio', 'Etana Sulcus', 'Gula Sulci', 'Hursag Sulcus', 'Ishkur Sulcus',
  'Kadi Sulcus', 'Kittu Fossae', 'Lugalbanda Sulcus', 'Namtar Regio', 'Ningal Sulcus', 'Nusku Sulcus', 'Sin Sulcus', 'Shamash Regio', 'Tammuz Sulcus',
  'Utu Sulcus', 'Zaqar Sulci', 'Ekur Sulcus', 'Girsu Regio',
]
const MERCANTILE_POOL = [
  'Vesta Tariff', 'Juno Factor', 'Pallas Consignment', 'Hygiea Ledger', 'Davida Bond', 'Psyche Margin', 'Thisbe Carriage', 'Eunomia Bourse',
  'Fortuna Tally', 'Themis Warrant', 'Amphitrite Cartage', 'Egeria Quorum', 'Bamberga Surety', 'Herculina Freight', 'Doris Compact', 'Ursula Tender',
  'Camilla Draft', 'Patientia Broker', 'Elektra Cargo', 'Aurora Bourse', 'Iris Consignment', 'Hebe Factor', 'Sylvia Lading', 'Cybele Waybill',
  'Diotima Charter', 'Nemesis Invoice', 'Thalassa Manifest', 'Lachesis Tally', 'Alauda Bill', 'Euphrosyne Freight', 'Aletheia Carriage', 'Interamnia Bourse',
  'Loreley Broker', 'Winchester Compact', 'Kalliope Tender', 'Bertha Lading', 'Hermione Charter', 'Ceres Tariff', 'Palma Warrant', 'Bettina Cargo',
]
const INDEPENDENT_POOL = [
  'Heron Ledge', 'Osprey Wake', 'Curlew Bank', 'Plover Reach', 'Gannet Drift', 'Sandpiper Bough', 'Shearwater Mile', 'Dunlin Fathom', 'Merlin Ash',
  'Godwit Shoal', 'Skua Promise', 'Fulmar Ember', 'Redshank Tide', 'Lapwing Furrow', 'Bittern Marsh', 'Wigeon Hollow', 'Teal Bend', 'Petrel Strand',
  'Kittiwake Sound', 'Turnstone Bar', 'Whimbrel Cove', 'Oystercatcher Lane', 'Avocet Flat', 'Snipe Meadow', 'Goshawk Ridge', 'Harrier Moor', 'Kite Fell',
  'Corncrake Hay', 'Nightjar Heath', 'Wheatear Down',
]

/** Owner-class weights for the 381 routine departures (900 / 1,100 / 612 of 2,612 transits). */
const OWNER_WEIGHTS = [900, 1100, 612]

function isoDate(year: number, dayOfYear: number): string {
  const d = new Date(Date.UTC(year, 0, 1 + Math.max(0, Math.min(364, Math.floor(dayOfYear)))))
  return d.toISOString().slice(0, 10)
}

function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + Math.round(days))
  return d.toISOString().slice(0, 10)
}

function driveFor(owner: OwnerClass, r: Rng): Drive {
  if (owner === 'Perrine') return 'Mk 3'
  if (owner === 'Mercantile') return r.bool(0.85) ? 'Tessera-C' : 'other'
  return r.bool(0.5) ? 'Mk 3' : r.bool(0.5) ? 'Tessera-C' : 'other'
}

/** Hidden-truth parameters of one of the nineteen (shared by DS-02 and the DS-09 sample). */
export interface DivertedProfile {
  hull: string
  /** Hidden mass as a fraction of declared. Ten hulls U(0.06, 0.09); the nine uprated U(0.10, 0.13). */
  h: number
  uprated: boolean
  laneLengthAU: number
  /** Thrust-limited acceleration a = 3.00 × (F/588)/(1 + h), mgee. */
  accel: number
  /** Δv from Mark 9.4 to rest at Kettle on that departure date (km/s). */
  dvKettle: number
  /** Thrust-limited lateness at Mark 9 against the nominal plot, days. */
  thrustDelay: number
  declaredMass: number
  departureDate: string
}

interface Generated {
  manifest: Departure[]
  nineteen: DivertedProfile[]
  massFit: RegressionFit
}

function generateManifest(attempt: number): Generated {
  const r = rng('DS-02', attempt)

  // --- the nineteen (DS-00) ---
  const upratedIdx = new Set(r.sample([...Array(19).keys()], 9))
  const closeIdx = new Set(r.sample([...Array(19).keys()], 15))
  const nineteen: DivertedProfile[] = THE_NINETEEN.map((hull, i) => {
    const uprated = upratedIdx.has(i)
    const h = uprated ? r.uniform(0.1, 0.13) : r.uniform(0.06, 0.09)
    const laneLengthAU = closeIdx.has(i) ? r.uniform(2.4, 3.6) : r.uniform(3.6, 6.0)
    const F = uprated ? LANE.uprateKn : LANE.thrustKn
    const accel = (LANE.aNomMgee * (F / LANE.thrustKn)) / (1 + h)
    const dvKettle = r.uniform(24, 38)
    const thrustDelay = scheduledT9(laneLengthAU) * (Math.sqrt(LANE.aNomMgee / accel) - 1)
    const declaredMass = i === 0 ? 19600 : Math.round(r.uniform(14000, 27000) / 10) * 10
    // Departure = the Register's loss date (Act I) minus the time to Mark 9 on that departure's geometry.
    const departureDate = shiftIso(LOSS_DATES.get(hull) ?? '2182-03-06', -(scheduledT9(laneLengthAU) + thrustDelay + 0.2))
    return { hull, h, uprated, laneLengthAU, accel, dvKettle, thrustDelay, declaredMass, departureDate }
  })

  // --- examiner assignment: Dacre signed 17 of the 19 and 1 of the 393 others ---
  const dacreDiverted = new Set(r.sample([...Array(19).keys()], 17))
  const others: Examiner[] = ['Voss', 'Amari', 'Penrose']

  const rows: Departure[] = []
  // Honest Mark 2 inference noise N(0, 2 %). The registry says the nineteen are "the only points above +5 %",
  // so a draw above +2.2 SD (0.6 % of hulls) is redrawn — a truncation the fleet SD test cannot see.
  const honestNoise = () => {
    let z: number
    do z = r.normal()
    while (z > 2.2)
    return 1 + 0.02 * z
  }
  // The nineteen carry h plus the same 2 % noise; the OBSERVED excess is redrawn into its tier
  // (+6–9 % for the ten, +10–13 % for the nine uprated) so the two tiers Act VII matches to the refit list are clean.
  const divertedExcess = (p: DivertedProfile) => {
    const lo = p.uprated ? 0.102 : 0.062
    const hi = p.uprated ? 0.13 : 0.09
    let e: number
    do e = p.h + r.normal(0, 0.02)
    while (e < lo || e > hi)
    return e
  }
  const fuelNoise = () => 1 + r.normal(0, 0.01)

  const pushHonest = (hull: string, ownerClass: OwnerClass, drive: Drive, laterLost: boolean, declared: number, examiner: Examiner) => {
    const laneLengthAU = r.uniform(2.4, 8.0)
    // Honest hulls file their own profile inside the Lane's band (persistent per-hull offset; DS-00 delay model).
    const accel = Math.min(3.3, Math.max(2.7, r.normal(3.0, 0.11)))
    const inferred = Math.round(declared * honestNoise())
    const required = fLane(laneLengthAU) * declared
    rows.push({
      id: rows.length,
      hull,
      ownerClass,
      drive,
      departureDate: isoDate(r.int(2178, 2183), r.uniform(0, 365)),
      laneLengthAU: Math.round(laneLengthAU * 100) / 100,
      declaredMass: declared,
      fuelLoaded: Math.round(required * fuelNoise() * 10) / 10,
      requiredFuel: Math.round(required * 10) / 10,
      examiner,
      accelMark2: Math.round(accel * 1000) / 1000,
      plumePower: Math.round(plumeTW(thrustKn(inferred, accel)) * 10000) / 10000,
      inferredMass: inferred,
      laterLost,
      diverted: false,
    })
  }

  // The nineteen.
  nineteen.forEach((p, i) => {
    const inferred = Math.round(p.declaredMass * (1 + divertedExcess(p)))
    const dvL = laneDeltaV(p.laneLengthAU, p.accel)
    const fuel = p.declaredMass * (1 + p.h) * (1 - Math.exp(-(dvL + p.dvKettle) / LANE.veKms)) * fuelNoise()
    const required = fLane(p.laneLengthAU) * p.declaredMass
    rows.push({
      id: rows.length,
      hull: p.hull,
      ownerClass: 'Perrine',
      drive: 'Mk 3',
      departureDate: p.departureDate,
      laneLengthAU: Math.round(p.laneLengthAU * 100) / 100,
      declaredMass: p.declaredMass,
      fuelLoaded: Math.round(fuel * 10) / 10,
      requiredFuel: Math.round(required * 10) / 10,
      examiner: dacreDiverted.has(i) ? 'Dacre' : r.choice(others),
      accelMark2: Math.round(p.accel * 1000) / 1000,
      plumePower: Math.round(plumeTW(thrustKn(inferred, p.accel)) * 10000) / 10000,
      inferredMass: inferred,
      laterLost: true,
      diverted: true,
    })
  })

  // The other twelve lost hulls (honest).
  for (const g of OTHER_LOSSES) pushHonest(g.hull, g.ownerClass, driveFor(g.ownerClass, r), true, Math.round(r.uniform(14000, 27000) / 10) * 10, r.choice(others))

  // 381 routine departures in owner-class proportion, one of them Dacre's; MV Cyrene Ore at 60,000 t.
  const dacreHonest = r.int(0, 380)
  const pools: Record<OwnerClass, string[]> = { Perrine: PERRINE_POOL, Mercantile: MERCANTILE_POOL, independent: INDEPENDENT_POOL }
  const cyreneAt = r.int(0, 380)
  for (let k = 0; k < 381; k++) {
    const examiner: Examiner = k === dacreHonest ? 'Dacre' : r.choice(others)
    if (k === cyreneAt) {
      pushHonest('Cyrene Ore', 'Mercantile', 'other', false, 60000, examiner)
      continue
    }
    const ownerClass = OWNER_CLASSES[r.weightedIndex(OWNER_WEIGHTS)]
    pushHonest(r.choice(pools[ownerClass]), ownerClass, driveFor(ownerClass, r), false, Math.round(r.uniform(14000, 27000) / 10) * 10, examiner)
  }

  // Shuffle so the file reads like a Bureau extract, not a story outline; ids follow the final order.
  const manifest = r.shuffle(rows).map((d, id) => ({ ...d, id }))
  const massFit = linearRegression(
    manifest.map((d) => d.declaredMass),
    manifest.map((d) => d.inferredMass),
  )
  return { manifest, nineteen, massFit }
}

/**
 * Registry acceptance rule for a DS-02 candidate (beat sheet §2 DS-02 headline numbers).
 * Returns the list of violated criteria; empty = accepted. Exported for the dataset audit test.
 */
export function manifestIssues(g: Generated): string[] {
  const { manifest, massFit } = g
  const out: string[] = []
  if (!(massFit.r >= 0.985)) out.push('r < 0.985')
  if (Math.abs(massFit.slope - 1) >= 0.005) out.push('slope does not read 1.00')
  if (Math.abs(massFit.intercept) > 100) out.push('intercept not ≈ 0')
  const pct = manifest.map((d, i) => (100 * massFit.residuals[i]) / d.declaredMass)
  // The nineteen are the only points above +5 %, and all of them sit in the +6–13 % band.
  let divOut = 0
  let honestHigh = 0
  for (let i = 0; i < manifest.length; i++) {
    if (manifest[i].diverted) {
      if (pct[i] < 5.8 || pct[i] > 13.5) divOut++
    } else if (pct[i] >= 5) honestHigh++
  }
  if (divOut) out.push(`${divOut} of the nineteen outside +5.8–13.5 %`)
  if (honestHigh) out.push(`${honestHigh} honest hulls above +5 %`)
  // Honest residual spread ≈ 2 % of declared mass.
  const honestPct = pct.filter((_, i) => !manifest[i].diverted)
  const hs = sd(honestPct)
  if (hs < 1.8 || hs > 2.2) out.push('honest residual SD not ≈ 2 %')
  // Nicholson Regio ≈ +1,500 t.
  const nick = manifest.findIndex((d) => d.hull === 'Nicholson Regio')
  if (massFit.residuals[nick] < 1100 || massFit.residuals[nick] > 1900) out.push('Nicholson Regio residual not ≈ +1,500 t')
  // Cyrene Ore: high leverage, not influential; slope moves in the third decimal.
  const cy = manifest.findIndex((d) => d.hull === 'Cyrene Ore')
  if (!(massFit.leverage[cy] > 4 / manifest.length)) out.push('Cyrene Ore not high-leverage')
  if (massFit.cooks[cy] > 4 / manifest.length) out.push('Cyrene Ore influential (Cook)')
  const without = linearRegression(
    manifest.filter((_, i) => i !== cy).map((d) => d.declaredMass),
    manifest.filter((_, i) => i !== cy).map((d) => d.inferredMass),
  )
  if (Math.abs(without.slope - massFit.slope) > 0.005) out.push('Cyrene Ore moves the slope beyond the third decimal')
  // Fuel: honest fuel on required fuel is the line (slope 1.000); the nineteen sit high (≈ 1.17).
  const honest = manifest.filter((d) => !d.diverted)
  const hf = linearRegression(
    honest.map((d) => d.requiredFuel),
    honest.map((d) => d.fuelLoaded),
  )
  if (Math.abs(hf.slope - 1) > 0.005 || hf.r < 0.995) out.push('honest fuel-on-required slope not 1.000')
  const div = manifest.filter((d) => d.diverted)
  const df = linearRegression(
    div.map((d) => d.requiredFuel),
    div.map((d) => d.fuelLoaded),
  )
  if (df.slope < 1.1 || df.slope > 1.25) out.push(`nineteen fuel slope ${df.slope.toFixed(3)} not ≈ 1.17`)
  return out
}

/** Generate the DS-02 candidate for one attempt (exported for the audit test only). */
export const generateManifestCandidate = generateManifest

let generated: Generated | null = null
let manifestAttempt = 0
for (let attempt = 0; attempt < 1000 && !generated; attempt++) {
  const g = generateManifest(attempt)
  if (manifestIssues(g).length === 0) {
    generated = g
    manifestAttempt = attempt
  }
}
if (!generated) throw new Error('DS-02: no seed satisfied the registry acceptance rule in 1000 attempts')

/** DS-02 — the Manifest file, 412 departures. Identical on every load. */
export const manifest: Departure[] = generated.manifest
/** Which `rng('DS-02', attempt)` produced the accepted file (for the tests' audit trail). */
export const MANIFEST_SEED_ATTEMPT = manifestAttempt
/** Hidden-truth profiles of the nineteen (tests, Act IX; the 2-06 Ledger sample derives its thrust delays from them). */
export const nineteenProfiles: DivertedProfile[] = generated.nineteen

/** The least-squares fit of inferred mass on declared mass over all 412 (act-2-03 onward). */
export const massFit: RegressionFit = generated.massFit

export const CYRENE_ORE_INDEX = manifest.findIndex((d) => d.hull === 'Cyrene Ore')
export const NICHOLSON_REGIO_INDEX = manifest.findIndex((d) => d.hull === 'Nicholson Regio')

/** Residual of departure i on the mass fit, as a percentage of its declared mass. */
export function residualPct(i: number): number {
  return (100 * massFit.residuals[i]) / manifest[i].declaredMass
}

/** Regression fit with one departure removed (the with/without comparison of act-2-05). */
export function massFitWithout(index: number): RegressionFit {
  const rest = manifest.filter((_, i) => i !== index)
  return linearRegression(
    rest.map((d) => d.declaredMass),
    rest.map((d) => d.inferredMass),
  )
}

/** Honest departures only (the 393 that are not among the nineteen). */
export const honestManifest: Departure[] = manifest.filter((d) => !d.diverted)

/** Least-squares fit of fuel loaded on the Bureau's required-fuel column, all 412 (act-2-06). */
export const fuelOnRequiredFit: RegressionFit = linearRegression(
  manifest.map((d) => d.requiredFuel),
  manifest.map((d) => d.fuelLoaded),
)

/** Least-squares fit of fuel loaded on declared mass, all 412 — the smear (act-2-06). */
export const fuelOnDeclaredFit: RegressionFit = linearRegression(
  manifest.map((d) => d.declaredMass),
  manifest.map((d) => d.fuelLoaded),
)

// ---------------------------------------------------------------------------------------------
// DS-09 · Ledger sample for act-2-06 (300 transits: 281 honest across the cycle + the nineteen)
// ---------------------------------------------------------------------------------------------

export interface Transit {
  id: number
  hull: string
  ownerClass: OwnerClass
  laneLengthAU: number
  /** 0.75 × 2√(d / a_nom), days. */
  scheduledT9: number
  /** Actual − scheduled against the nominal 3.00-mgee plot, days. */
  mark9Delay: number
  /** Actual time to Mark 9, days. */
  t9: number
  laterLost: boolean
  diverted: boolean
}

interface LedgerGen {
  sample: Transit[]
  logLog: ReturnType<typeof transformedRegression>
}

function generateLedger(attempt: number): LedgerGen {
  const r = rng('DS-09-sample', attempt)
  const rows: Transit[] = []
  const pools: Record<OwnerClass, string[]> = { Perrine: PERRINE_POOL, Mercantile: MERCANTILE_POOL, independent: INDEPENDENT_POOL }
  for (let k = 0; k < 281; k++) {
    const ownerClass = OWNER_CLASSES[r.weightedIndex(OWNER_WEIGHTS)]
    const d = r.uniform(2.4, 8.0)
    const uHull = r.normal(ownerClass === 'Perrine' ? 0.2 : 0, 2.5)
    const delay = uHull + r.normal(0, 0.9)
    const sched = scheduledT9(d)
    rows.push({ id: rows.length, hull: r.choice(pools[ownerClass]), ownerClass, laneLengthAU: Math.round(d * 100) / 100, scheduledT9: Math.round(sched * 10) / 10, mark9Delay: Math.round(delay * 100) / 100, t9: Math.round((sched + delay) * 10) / 10, laterLost: false, diverted: false })
  }
  for (const p of nineteenProfiles) {
    const uHull = r.normal(0.2, 2.5)
    const delay = uHull + p.thrustDelay + r.normal(0, 0.9)
    const sched = scheduledT9(p.laneLengthAU)
    rows.push({ id: rows.length, hull: p.hull, ownerClass: 'Perrine', laneLengthAU: Math.round(p.laneLengthAU * 100) / 100, scheduledT9: Math.round(sched * 10) / 10, mark9Delay: Math.round(delay * 100) / 100, t9: Math.round((sched + delay) * 10) / 10, laterLost: true, diverted: true })
  }
  const sample = r.shuffle(rows).map((t, id) => ({ ...t, id }))
  const logLog = transformedRegression(
    sample.map((t) => t.laneLengthAU),
    sample.map((t) => t.t9),
    'loglog',
  )
  return { sample, logLog }
}

/** Residual in DAYS on a back-transformed fit (actual t9 − predicted t9). */
export function daysResidual(fit: { predict: (x: number) => number }, t: Transit): number {
  return t.t9 - fit.predict(t.laneLengthAU)
}

function acceptLedger(g: LedgerGen): boolean {
  const { sample, logLog } = g
  if (Math.abs(logLog.fit.slope - 0.5) > 0.015) return false
  const div = sample.filter((t) => t.diverted).map((t) => daysResidual(logLog, t))
  const rest = sample.filter((t) => !t.diverted).map((t) => daysResidual(logLog, t))
  if (mean(div) < 2.4 || mean(div) > 3.2) return false
  if (Math.abs(mean(rest)) > 0.3) return false
  // Both transit-time extremes present so the curve is visibly bowed (61 → 111 d).
  const ts = sample.map((t) => t.scheduledT9)
  if (Math.min(...ts) > 63 || Math.max(...ts) < 108) return false
  return true
}

let ledger: LedgerGen | null = null
let ledgerAttempt = 0
for (let attempt = 0; attempt < 400 && !ledger; attempt++) {
  const g = generateLedger(attempt)
  if (acceptLedger(g)) {
    ledger = g
    ledgerAttempt = attempt
  }
}
if (!ledger) throw new Error('DS-09 sample: no seed satisfied the acceptance rule in 400 attempts')

/** DS-09 sample — 300 Ledger transits, time to Mark 9 vs Lane length at departure (act-2-06). */
export const ledgerSample: Transit[] = ledger.sample
export const LEDGER_SEED_ATTEMPT = ledgerAttempt
/** The log–log fit of t9 on Lane length (slope ≈ 0.50, the brachistochrone exponent). */
export const t9LogLogFit = ledger.logLog

/** Mean residual in days of a subset on the log–log fit. */
export function meanDaysResidual(select: (t: Transit) => boolean): number {
  return mean(ledgerSample.filter(select).map((t) => daysResidual(t9LogLogFit, t)))
}
