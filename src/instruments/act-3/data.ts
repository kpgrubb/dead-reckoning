/**
 * Act III datasets — "Testimony" (AP Unit 3: Collecting Data).
 *
 * Every dataset here is generated from fixed seeds (`rng('DS-03b', …)`) so it is identical on every
 * load and in every module. The headline numbers of the beat-sheet registry (§2, DS-03 / DS-04 and the
 * DS-01 classification-by-office counts) are asserted in `data.test.ts`.
 *
 *   POPULATION      400 Lane masters active this Close Season (in transit, docked, laid up, lost)
 *   LANE_FRAME      the 260 masters on the Lane schedule at MET 57 (DS-03b frame: 88 / 110 / 62)
 *   CONVOYS         37 convoys of ~7 hulls (cluster-sampling units)
 *   CERES_SURVEY    DS-03a — the Authority's dock-office survey: 212 respondents, Q4 94 % yes
 *   SURVEY_RUNS     DS-03b — the learner's survey under each design (SRS / stratified / cluster)
 *   BOARD_TRIAL     DS-04a — the Board's 2183 escort trial (owner confounded with escort)
 *   LOTTERY         DS-04b — Asgard's escort lottery (12 transits, 6 escorted by lot) + exact p
 *   PILOT           Asgard's six-transit pilot (the "did not order the lottery" path)
 *   REGISTER_OFFICE DS-01 — classification × classifying office for the 31 losses
 *
 * Nothing here rounds; format at display with `fmt` from '@/lib/stats'.
 */
import { rng, type Rng } from '@/lib/rng'
import { mean, permutationPValue, sd } from '@/lib/stats'

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export type Owner = 'Perrine' | 'Mercantile' | 'independent'
export const OWNERS: readonly Owner[] = ['Perrine', 'Mercantile', 'independent'] as const

export type Status = 'transit' | 'docked-ceres' | 'docked-uruk' | 'laid-up' | 'lost'
export const STATUS_LABEL: Record<Status, string> = {
  transit: 'in transit (on the schedule)',
  'docked-ceres': 'docked at Ceres',
  'docked-uruk': 'docked at Uruk High',
  'laid-up': 'laid up / off the Lane',
  lost: 'lost this season',
}

export interface Master {
  /** 1–400. */
  id: number
  hull: string
  owner: Owner
  /** Sulcus Freight (Perrine-owned) hull. */
  sulcus: boolean
  status: Status
  /** Fractional Lane mark at MET 57 (transit only). */
  mark: number | null
  /** Convoy id 1–37 (transit only). */
  convoy: number | null
  /** Registry hull number 1–260 (transit only) — the systematic-sampling key. */
  hullNo: number | null
  /** In the learner's frame: the Lane schedule at MET 57. */
  inLaneFrame: boolean
  /** In the Authority's frame: called at the Ceres dock office during the survey window. */
  inCeresFrame: boolean
  /** Answered the Authority's notice (DS-03a respondent). */
  ceresRespondent: boolean
  /** Latent: would say "yes" to a neutrally worded piracy question. */
  believesPiracy: boolean
  /** Latent: a non-believer who would say "yes" to the Authority's leading Q4. */
  swayedByWording: boolean
  /** Latent: has seen a Sulcus hull turn late (Perrine masters never say so). */
  seenTurningLate: boolean
  /** Latent: answers a tight-beam contact at all (Sulcus masters mostly do not). */
  respondsToContact: boolean
  /** Probability of answering a posted notice (voluntary response). */
  volunteerProb: number
}

// ---------------------------------------------------------------------------------------------
// Fixed counts (registry) and reserved names
// ---------------------------------------------------------------------------------------------

/** DS-03b frame: 260 masters in transit at MET 57. */
export const FRAME_MIX: Record<Owner, number> = { Perrine: 88, Mercantile: 110, independent: 62 }
export const FRAME_N = 260

/** The rest of the season's masters, by status and owner (invented; consistent with the 34/42/24 Lane mix). */
const OTHER_MIX: Record<Exclude<Status, 'transit'>, Record<Owner, number>> = {
  'docked-ceres': { Perrine: 14, Mercantile: 34, independent: 14 },
  'docked-uruk': { Perrine: 22, Mercantile: 14, independent: 12 },
  'laid-up': { Perrine: 7, Mercantile: 10, independent: 7 },
  lost: { Perrine: 5, Mercantile: 0, independent: 1 },
}
export const POPULATION_N = 400

/** DS-03a: 212 respondents, owner mix 9 % / 61 % / 30 %, Q4 94 % yes. */
export const CERES_RESPONDENTS: Record<Owner, number> = { Perrine: 19, Mercantile: 129, independent: 64 }
export const CERES_N = 212
export const CERES_YES = 199
export const CERES_Q4 = 'Do you believe pirates operating from the Free Holds are responsible for recent Lane incidents?'

/** Latent belief counts inside the frame: Perrine 100 %, Mercantile 48 %, independents 31 %. */
const BELIEF_IN_FRAME: Record<Owner, number> = { Perrine: 88, Mercantile: 53, independent: 19 }
const BELIEF_OUTSIDE_FRAME: Record<Owner, number> = { Perrine: 48, Mercantile: 28, independent: 11 }
/** Sulcus masters in the frame who answer a tight-beam contact at all. */
const SULCUS_RESPONDERS_IN_FRAME = 19

/** Named hulls the story needs in the frame. */
export const HARPAGIA = 'Harpagia Sulcus'
export const MARIUS = 'Marius Regio'
export const THESSALY_DAWN = 'Thessaly Dawn'

const NINETEEN = ['Nicholson Regio', 'Xibalba Sulcus', 'Perrine Regio', 'Tiamat Sulcus', 'Galileo Regio', 'Barnard Regio', 'Uruk Sulcus', 'Dardanus Sulcus', 'Mysia Sulci', 'Phrygia Sulcus', 'Sippar Sulcus', 'Anshar Sulcus', 'Byblus Sulcus', 'Nun Sulci', 'Elam Sulci', 'Lakhmu Fossae', 'Zakar Sulcus', 'Kishar Sulcus', 'Bubastis Sulci']
/** The five Sulcus hulls the Register lists as lost in 2183–84 (four in 2183, one in 2184). */
const LOST_THIS_SEASON_PERRINE = ['Byblus Sulcus', 'Nun Sulci', 'Elam Sulci', 'Lakhmu Fossae', 'Zakar Sulcus']
const LOST_THIS_SEASON_INDEPENDENT = ['Alder Provenance']
const RESERVED = new Set([...NINETEEN, HARPAGIA, MARIUS, 'Kestrel Bough', 'Thessaly Ember', 'Hygiea Promise', 'Long Fathom', THESSALY_DAWN, ...LOST_THIS_SEASON_INDEPENDENT])

const GANYMEDE = ['Adad', 'Akitu', 'Ammura', 'Antum', 'Anzu', 'Apsu', 'Arbela', 'Asshur', 'Ataa', 'Babylon', 'Bau', 'Bigeh', 'Dukug', 'Ea', 'Enkidu', 'Enlil', 'Erech', 'Eshmun', 'Etana', 'Geb', 'Gilgamesh', 'Gula', 'Hathor', 'Hershef', 'Ilus', 'Ishkur', 'Ishtar', 'Isis', 'Kadi', 'Keret', 'Khensu', 'Khonsu', 'Kittu', 'Lagash', 'Lakhamu', 'Latpon', 'Lugalmeslam', 'Melotte', 'Memphis', 'Misharu', 'Mummu', 'Mush', 'Nabu', 'Namtar', 'Nergal', 'Nidaba', 'Nineveh', 'Ningishzida', 'Ninlil', 'Nippur', 'Nunki', 'Nut', 'Osiris', 'Philae', 'Ptah', 'Ruti', 'Sapas', 'Sebek', 'Seker', 'Selket', 'Serapis', 'Shu', 'Sin', 'Tammuz', 'Tashmetum', 'Teshub', 'Tettu', 'Thoth', 'Ur', 'Utu', 'Zu']
const GANYMEDE_SUFFIX = ['Sulcus', 'Regio', 'Sulci', 'Fossae', 'Facula', 'Patera']
const HOUSE = ['Pallas', 'Vesta', 'Juno', 'Astraea', 'Hebe', 'Iris', 'Flora', 'Metis', 'Parthenope', 'Egeria', 'Irene', 'Eunomia', 'Psyche', 'Thetis', 'Melpomene', 'Fortuna', 'Massalia', 'Lutetia', 'Kalliope', 'Thalia', 'Themis', 'Phocaea', 'Proserpina', 'Euterpe', 'Bellona', 'Amphitrite', 'Urania', 'Euphrosyne', 'Pomona', 'Polyhymnia', 'Circe', 'Leukothea', 'Atalante', 'Fides', 'Leda', 'Laetitia', 'Harmonia', 'Daphne', 'Ariadne', 'Nysa', 'Eugenia', 'Hestia', 'Aglaja', 'Doris', 'Pales', 'Nemausa', 'Angelina', 'Danae']
const HOUSE_SUFFIX = ['Meridian', 'Cantor', 'Ledger', 'Standard', 'Concord', 'Venture', 'Charter', 'Warrant', 'Exchange', 'Tariff', 'Covenant', 'Margin', 'Surety', 'Lading', 'Freehold', 'Consignment', 'Dividend', 'Factor', 'Broker', 'Tally', 'Assay', 'Escrow', 'Indenture', 'Quorum', 'Accord', 'Carriage', 'Bond', 'Clearance']
const INDEP_FIRST = ['Thessaly', 'Halcyon', 'Saffron', 'Tamar', 'Ilium', 'Brennan', 'Marrow', 'Sable', 'Larkspur', 'Fennel', 'Osric', 'Wendel', 'Tallis', 'Yarrow', 'Quill', 'Harrow', 'Cinder', 'Gannet', 'Tern', 'Plover', 'Wren', 'Brant', 'Merlin', 'Kite', 'Osprey', 'Heron', 'Egret', 'Curlew', 'Dunlin', 'Skua', 'Fulmar', 'Petrel', 'Gull', 'Auk', 'Puffin', 'Eider', 'Teal', 'Wigeon', 'Pintail', 'Scaup', 'Smew', 'Grebe', 'Loon', 'Cormorant', 'Bittern', 'Alder', 'Rowan', 'Hazel']
const INDEP_SUFFIX = ['Dawn', 'Lantern', 'Wake', 'Verge', 'Haul', 'Tide', 'Ledge', 'Keel', 'Draft', 'Ballast', 'Hold', 'Lee', 'Mooring', 'Anchorage', 'Sounding', 'Bearing', 'Heading', 'Trace', 'Passage', 'Crossing', 'Interval', 'Season', 'Provenance', 'Margin', 'Ember']

function nameFactory(r: Rng, firsts: string[], seconds: string[]) {
  const used = new Set<string>(RESERVED)
  return (): string => {
    for (let i = 0; i < 10_000; i++) {
      const n = `${r.choice(firsts)} ${r.choice(seconds)}`
      if (!used.has(n)) {
        used.add(n)
        return n
      }
    }
    throw new Error('nameFactory: exhausted')
  }
}

// ---------------------------------------------------------------------------------------------
// Population, frame and convoys
// ---------------------------------------------------------------------------------------------

export interface Convoy {
  id: number
  /** Convoy's Lane mark at MET 57. */
  mark: number
  /** Master ids. */
  members: number[]
}

const OWNER_INDEX: Record<Owner, number> = { Perrine: 0, Mercantile: 1, independent: 2 }
const CONVOY_COUNT = 37

function buildPopulation(): { masters: Master[]; convoys: Convoy[] } {
  const r = rng('DS-03b', 'population')
  const names = {
    Perrine: nameFactory(r.child('names', 'P'), GANYMEDE, GANYMEDE_SUFFIX),
    Mercantile: nameFactory(r.child('names', 'M'), HOUSE, HOUSE_SUFFIX),
    independent: nameFactory(r.child('names', 'I'), INDEP_FIRST, INDEP_SUFFIX),
  }
  const masters: Master[] = []
  const blank = (owner: Owner, status: Status, hull: string): Master => ({
    id: masters.length + 1,
    hull,
    owner,
    sulcus: owner === 'Perrine',
    status,
    mark: null,
    convoy: null,
    hullNo: null,
    inLaneFrame: status === 'transit',
    inCeresFrame: false,
    ceresRespondent: false,
    believesPiracy: owner === 'Perrine',
    swayedByWording: false,
    seenTurningLate: false,
    respondsToContact: owner !== 'Perrine',
    volunteerProb: 0,
  })

  // --- The frame: 260 in transit, sorted into convoys with an owner-homogeneous tendency ---
  const transitOwners: Owner[] = []
  for (const o of OWNERS) for (let i = 0; i < FRAME_MIX[o]; i++) transitOwners.push(o)
  // Owner index plus noise, then sorted and chunked: convoys lean towards one owner (Sulcus hulls
  // sail in company blocks) but mix at the boundaries — the reason cluster sampling is noisier here.
  const keyRng = r.child('keys')
  const keyed = transitOwners.map((o) => ({ o, key: OWNER_INDEX[o] + keyRng.normal(0, 0.55) }))
  keyed.sort((a, b) => a.key - b.key)
  const sizes = Array.from({ length: CONVOY_COUNT }, (_, i) => (i === 0 ? 8 : 7)) // 8 + 36 × 7 = 260
  // Put the 8-hull convoy somewhere in the middle so it is not the first Perrine convoy.
  const eightAt = r.int(10, 26)
  sizes.fill(7)
  sizes[eightAt] = 8
  const convoys: Convoy[] = []
  let cursor = 0
  const markSpread = r.shuffle(Array.from({ length: CONVOY_COUNT }, (_, i) => 1.3 + (i * (11.6 - 1.3)) / (CONVOY_COUNT - 1)))
  for (let c = 0; c < CONVOY_COUNT; c++) {
    const members: number[] = []
    for (let j = 0; j < sizes[c]; j++) {
      const o = keyed[cursor++].o
      const m = blank(o, 'transit', names[o]())
      m.convoy = c + 1
      masters.push(m)
      members.push(m.id)
    }
    convoys.push({ id: c + 1, mark: markSpread[c], members })
  }
  // Named hulls: the Act I hot contact (goes dark at Mark 9.3, MET 59), the Act IV witness, Marsh's ship.
  const firstOf = (o: Owner, skip = 0) => masters.filter((m) => m.owner === o)[skip]
  const harp = firstOf('Perrine', 3)
  harp.hull = HARPAGIA
  const marius = firstOf('Perrine', 40)
  marius.hull = MARIUS
  const thessaly = firstOf('independent', 7)
  thessaly.hull = THESSALY_DAWN
  convoys[harp.convoy! - 1].mark = 9.05
  convoys[marius.convoy! - 1].mark = 1.7
  convoys[thessaly.convoy! - 1].mark = 7.4
  for (const m of masters) m.mark = Math.round((convoys[m.convoy! - 1].mark + r.uniform(-0.12, 0.12)) * 100) / 100
  // Registry hull numbers: a random permutation, so "systematic by hull number" is not "by convoy".
  const hullNos = r.shuffle(Array.from({ length: FRAME_N }, (_, i) => i + 1))
  masters.forEach((m, i) => (m.hullNo = hullNos[i]))

  // --- The rest of the season's masters ---
  const lostP = LOST_THIS_SEASON_PERRINE.slice()
  const lostI = LOST_THIS_SEASON_INDEPENDENT.slice()
  for (const status of ['docked-ceres', 'docked-uruk', 'laid-up', 'lost'] as const) {
    for (const o of OWNERS) {
      for (let i = 0; i < OTHER_MIX[status][o]; i++) {
        const hull = status === 'lost' ? (o === 'Perrine' ? lostP.shift()! : lostI.shift()!) : names[o]()
        masters.push(blank(o, status, hull))
      }
    }
  }
  if (masters.length !== POPULATION_N) throw new Error(`population size ${masters.length} ≠ ${POPULATION_N}`)

  // --- Latents ---
  const pick = (pool: Master[], k: number, rr: Rng) => rr.sample(pool, k)
  // Belief in piracy (neutral wording): Perrine 100 %; Mercantile 48 %; independents 31 % (exact inside the frame).
  for (const o of ['Mercantile', 'independent'] as const) {
    for (const m of pick(masters.filter((m) => m.owner === o && m.status === 'transit'), BELIEF_IN_FRAME[o], r.child('belief', o, 'in'))) m.believesPiracy = true
    for (const m of pick(masters.filter((m) => m.owner === o && m.status !== 'transit'), BELIEF_OUTSIDE_FRAME[o], r.child('belief', o, 'out'))) m.believesPiracy = true
  }
  // Leading wording sways 60 % of non-believers.
  const sway = r.child('sway')
  for (const m of masters) if (!m.believesPiracy) m.swayedByWording = sway.bool(0.6)
  // Sulcus masters who answer a tight-beam contact at all (19 of 88 in the frame; 22 % elsewhere). The
  // two hulls the story follows never answer.
  for (const m of pick(masters.filter((m) => m.sulcus && m.status === 'transit' && m.hull !== HARPAGIA && m.hull !== MARIUS), SULCUS_RESPONDERS_IN_FRAME, r.child('respond'))) m.respondsToContact = true
  const respondOut = r.child('respond-out')
  for (const m of masters) if (m.sulcus && m.status !== 'transit') m.respondsToContact = respondOut.bool(0.22)
  // "Seen a Sulcus hull turning late": clustered by convoy (a convoy that passed a diversion shares the sight).
  const witnessConvoys = new Set(r.child('witness').sample(convoys.map((c) => c.id), 9))
  const tl = r.child('turning-late')
  for (const m of masters) {
    if (m.sulcus) continue
    if (m.status === 'transit') m.seenTurningLate = tl.bool(witnessConvoys.has(m.convoy!) ? 0.5 : 0.08)
    else m.seenTurningLate = tl.bool(0.15)
  }
  // The Authority's frame: masters who called at the Ceres dock office during the survey window.
  // Mercantile crews berth at Ceres and file there; Sulcus hulls turn round under the company agent.
  const frameP: Record<Owner, number> = { Perrine: 0.45, Mercantile: 0.95, independent: 0.85 }
  const cf = r.child('ceres-frame')
  for (const m of masters) {
    if (m.status === 'lost' || m.status === 'laid-up' || m.hull === HARPAGIA || m.hull === MARIUS) m.inCeresFrame = false
    else if (m.status === 'docked-ceres') m.inCeresFrame = true
    else m.inCeresFrame = cf.bool(frameP[m.owner])
  }
  // Voluntary response to a posted notice: Sulcus masters rarely; believers far more than non-believers.
  const base: Record<Owner, number> = { Perrine: 0.1, Mercantile: 0.8, independent: 0.8 }
  for (const m of masters) m.volunteerProb = base[m.owner] * (m.believesPiracy ? 1 : 0.15)
  // DS-03a respondents: 19 / 129 / 64 drawn from the Ceres frame with volunteer weights (the mechanism
  // that produces 94 % yes), then pinned to exactly 199 yes.
  const vr = r.child('volunteers')
  for (const o of OWNERS) {
    const pool = masters.filter((m) => m.owner === o && m.inCeresFrame)
    if (pool.length < CERES_RESPONDENTS[o]) throw new Error(`Ceres frame too small for ${o}: ${pool.length}`)
    const chosen: Master[] = []
    const weights = pool.map((m) => m.volunteerProb)
    const avail = pool.slice()
    while (chosen.length < CERES_RESPONDENTS[o]) {
      const i = vr.weightedIndex(weights)
      chosen.push(avail[i])
      avail.splice(i, 1)
      weights.splice(i, 1)
    }
    for (const m of chosen) m.ceresRespondent = true
  }
  const resp = masters.filter((m) => m.ceresRespondent)
  const yesOf = (m: Master) => m.believesPiracy || m.swayedByWording
  let yes = resp.filter(yesOf).length
  const fix = r.child('pin')
  while (yes < CERES_YES) {
    const cand = resp.filter((m) => !yesOf(m))
    fix.choice(cand).swayedByWording = true
    yes++
  }
  while (yes > CERES_YES) {
    const cand = resp.filter((m) => !m.believesPiracy && m.swayedByWording)
    fix.choice(cand).swayedByWording = false
    yes--
  }
  return { masters, convoys }
}

const built = buildPopulation()
/** All 400 masters active on the Lane this Close Season. */
export const POPULATION: readonly Master[] = built.masters
/** The 260 masters on the Lane schedule at MET 57 — the learner's sampling frame (DS-03b). */
export const LANE_FRAME: readonly Master[] = POPULATION.filter((m) => m.inLaneFrame)
export const CONVOYS: readonly Convoy[] = built.convoys
export const masterById = (id: number): Master => POPULATION[id - 1]

export function countBy<T extends string>(xs: readonly Master[], key: (m: Master) => T): Record<T, number> {
  const out = {} as Record<T, number>
  for (const m of xs) out[key(m)] = (out[key(m)] ?? 0) + 1
  return out
}
export function ownerMix(xs: readonly Master[]): Record<Owner, number> {
  const out: Record<Owner, number> = { Perrine: 0, Mercantile: 0, independent: 0 }
  for (const m of xs) out[m.owner]++
  return out
}
export const proportion = (xs: readonly Master[], pred: (m: Master) => boolean): number => (xs.length ? xs.filter(pred).length / xs.length : NaN)

/** Fleet truth (all 400 masters, neutral wording). */
export const TRUTH_BELIEF = proportion(POPULATION, (m) => m.believesPiracy)
/** Frame truth (the 260 in transit). */
export const FRAME_BELIEF = proportion(LANE_FRAME, (m) => m.believesPiracy)
export const FRAME_TURNING_LATE = proportion(LANE_FRAME, (m) => m.seenTurningLate)
export const BELIEF_BY_OWNER: Record<Owner, number> = {
  Perrine: proportion(LANE_FRAME.filter((m) => m.owner === 'Perrine'), (m) => m.believesPiracy),
  Mercantile: proportion(LANE_FRAME.filter((m) => m.owner === 'Mercantile'), (m) => m.believesPiracy),
  independent: proportion(LANE_FRAME.filter((m) => m.owner === 'independent'), (m) => m.believesPiracy),
}

// ---------------------------------------------------------------------------------------------
// DS-03a — the Authority's Ceres dock survey
// ---------------------------------------------------------------------------------------------

export interface CeresSurvey {
  respondents: readonly Master[]
  n: number
  yes: number
  pYes: number
  mix: Record<Owner, number>
  yesByOwner: Record<Owner, number>
  /** Masters who were in the Authority's frame (called at the dock office in the window). */
  frame: readonly Master[]
  question: string
}

function buildCeresSurvey(): CeresSurvey {
  const respondents = POPULATION.filter((m) => m.ceresRespondent)
  const yesOf = (m: Master) => m.believesPiracy || m.swayedByWording
  const yesByOwner = { Perrine: 0, Mercantile: 0, independent: 0 }
  for (const m of respondents) if (yesOf(m)) yesByOwner[m.owner]++
  const yes = respondents.filter(yesOf).length
  return { respondents, n: respondents.length, yes, pYes: yes / respondents.length, mix: ownerMix(respondents), yesByOwner, frame: POPULATION.filter((m) => m.inCeresFrame), question: CERES_Q4 }
}
export const CERES_SURVEY: CeresSurvey = buildCeresSurvey()

// ---------------------------------------------------------------------------------------------
// Sampling designs on the frame (DS-03b) and the link-time cost model
// ---------------------------------------------------------------------------------------------

export type Design = 'srs' | 'stratified' | 'cluster' | 'systematic'
export const DESIGN_LABEL: Record<Design, string> = {
  srs: 'Simple random sample',
  stratified: 'Stratified by owner class',
  cluster: 'Cluster by convoy',
  systematic: 'Systematic by hull number',
}
/** Option strings used by the act-3-02 decision beat (the progress store records the chosen string). */
export const DESIGN_OPTIONS: Record<Exclude<Design, 'systematic'>, string> = {
  srs: 'Simple random sample of 40 masters from the schedule',
  stratified: 'Stratified by owner class: 15 Perrine, 15 Mercantile, 15 independent',
  cluster: 'Cluster by convoy: six convoys, every master in them',
}
export const SULCUS_OPTIONS = {
  include: 'Include Sulcus masters — record every silence as data',
  exclude: 'Exclude Sulcus masters — cleaner numbers, a hole in the frame',
} as const
export const LOTTERY_OPTIONS = {
  order: 'Order the lottery on your own authority as the Board’s assessing officer',
  decline: 'Do not — work from Asgard’s own six-transit pilot instead',
} as const

/** Map a recorded decision string back to a design (defaults to SRS). */
export function designFromDecision(choice: string | undefined): Exclude<Design, 'systematic'> {
  if (!choice) return 'srs'
  if (choice === DESIGN_OPTIONS.stratified || /stratif/i.test(choice)) return 'stratified'
  if (choice === DESIGN_OPTIONS.cluster || /cluster|convoy/i.test(choice)) return 'cluster'
  return 'srs'
}

export const SRS_N = 40
export const STRATUM_N = 15
export const CLUSTER_K = 6
export const SYSTEMATIC_STEP = 6

/** Link-time cost model: 55 ± 15 min per contact; a convoy shares a link, 20 ± 5 min each after the first. */
export const COST = { contactMin: 55, contactSd: 15, followupMin: 20, followupSd: 5, floorMin: 15 } as const

export function drawSRS(r: Rng, n = SRS_N): Master[] {
  return r.sample(LANE_FRAME, n)
}
export function drawStratified(r: Rng, per = STRATUM_N): Master[] {
  const out: Master[] = []
  for (const o of OWNERS) out.push(...r.sample(LANE_FRAME.filter((m) => m.owner === o), per))
  return out
}
export function drawCluster(r: Rng, k = CLUSTER_K): { sample: Master[]; convoys: number[] } {
  const chosen = r.sample(CONVOYS, k).map((c) => c.id).sort((a, b) => a - b)
  const set = new Set(chosen)
  return { sample: LANE_FRAME.filter((m) => set.has(m.convoy!)), convoys: chosen }
}
export function drawSystematic(r: Rng, step = SYSTEMATIC_STEP): { sample: Master[]; start: number } {
  const start = r.int(1, step)
  const byNo = LANE_FRAME.slice().sort((a, b) => a.hullNo! - b.hullNo!)
  return { sample: byNo.filter((m) => (m.hullNo! - start) % step === 0), start }
}

/** Minutes of Solberg's link time for a contact list (seeded). */
export function linkMinutes(r: Rng, sample: readonly Master[], design: Design): number {
  let total = 0
  if (design === 'cluster') {
    const seen = new Set<number>()
    for (const m of sample) {
      const first = !seen.has(m.convoy!)
      seen.add(m.convoy!)
      total += Math.max(COST.floorMin, first ? r.normal(COST.contactMin, COST.contactSd) : r.normal(COST.followupMin, COST.followupSd))
    }
  } else {
    for (let i = 0; i < sample.length; i++) total += Math.max(COST.floorMin, r.normal(COST.contactMin, COST.contactSd))
  }
  return total
}
/** Expected link time in minutes (the planning figure, no noise). */
export function expectedLinkMinutes(design: Design, n: number, convoys = CLUSTER_K): number {
  if (design === 'cluster') return convoys * COST.contactMin + (n - convoys) * COST.followupMin
  return n * COST.contactMin
}

export interface SurveyRun {
  design: Exclude<Design, 'systematic'>
  seed: number
  sample: readonly Master[]
  n: number
  convoys: number[]
  sulcusContacted: number
  sulcusAnswered: number
  sulcusSilent: number
  /** Non-Sulcus masters who answered (all of them do). */
  responders: readonly Master[]
  turningLate: number
  believeYes: number
  independentResponders: number
  independentYes: number
  mercantileResponders: number
  mercantileYes: number
  /** Solberg's link time for the run, minutes. */
  linkMinutes: number
}

function summarize(design: Exclude<Design, 'systematic'>, seed: number, sample: Master[], convoys: number[], costRng: Rng): SurveyRun {
  const sulcus = sample.filter((m) => m.sulcus)
  const responders = sample.filter((m) => !m.sulcus)
  const ind = responders.filter((m) => m.owner === 'independent')
  const merc = responders.filter((m) => m.owner === 'Mercantile')
  return {
    design,
    seed,
    sample,
    n: sample.length,
    convoys,
    sulcusContacted: sulcus.length,
    sulcusAnswered: sulcus.filter((m) => m.respondsToContact).length,
    sulcusSilent: sulcus.filter((m) => !m.respondsToContact).length,
    responders,
    turningLate: responders.filter((m) => m.seenTurningLate).length,
    believeYes: responders.filter((m) => m.believesPiracy).length,
    independentResponders: ind.length,
    independentYes: ind.filter((m) => m.believesPiracy).length,
    mercantileResponders: merc.length,
    mercantileYes: merc.filter((m) => m.believesPiracy).length,
    linkMinutes: linkMinutes(costRng, sample, design),
  }
}

/** Registry targets per design (DS-03b): turning-late count; Sulcus contacted / answered / silent. */
export const SURVEY_TARGETS = {
  srs: { n: 40, turningLate: 6, contacted: 9, answered: 2, silent: 7 },
  stratified: { n: 45, turningLate: 7, contacted: 15, answered: 3, silent: 12 },
  cluster: { n: 42, turningLate: 5, contacted: 11, answered: 2, silent: 9 },
} as const

function buildRun(design: Exclude<Design, 'systematic'>): SurveyRun {
  const t = SURVEY_TARGETS[design]
  const has = (s: Master[], hull: string) => s.some((m) => m.hull === hull)
  for (let k = 0; k < 200_000; k++) {
    const r = rng('DS-03b', design, k)
    let sample: Master[]
    let convoys: number[] = []
    if (design === 'srs') sample = drawSRS(r)
    else if (design === 'stratified') sample = drawStratified(r)
    else ({ sample, convoys } = drawCluster(r))
    if (sample.length !== t.n) continue
    if (!has(sample, THESSALY_DAWN) || has(sample, HARPAGIA)) continue
    const sulcus = sample.filter((m) => m.sulcus)
    if (sulcus.length !== t.contacted) continue
    if (sulcus.filter((m) => m.respondsToContact).length !== t.answered) continue
    const responders = sample.filter((m) => !m.sulcus)
    if (responders.filter((m) => m.seenTurningLate).length !== t.turningLate) continue
    if (responders.filter((m) => m.owner === 'independent').length < 6) continue
    return summarize(design, r.seed, sample, convoys, rng('DS-03b', design, 'cost'))
  }
  throw new Error(`DS-03b: no seed reproduces the ${design} targets`)
}

/** The learner's survey as it ran, under each design the learner might have chosen. */
export const SURVEY_RUNS: Record<Exclude<Design, 'systematic'>, SurveyRun> = {
  srs: buildRun('srs'),
  stratified: buildRun('stratified'),
  cluster: buildRun('cluster'),
}

/** Beat helpers (act-3-03). */
export const independentBeliefProportion = (run: SurveyRun): number => run.independentYes / run.independentResponders
export const sulcusNonresponseRate = (run: SurveyRun): number => run.sulcusSilent / run.sulcusContacted
export const turningLateProportion = (run: SurveyRun): number => run.turningLate / run.responders.length

// ---------------------------------------------------------------------------------------------
// Sampling simulator and bias demonstrator (repeated draws; the instruments call these per run)
// ---------------------------------------------------------------------------------------------

export type Statistic = 'belief' | 'turningLate'
export const STATISTIC_LABEL: Record<Statistic, string> = { belief: 'believe piracy', turningLate: 'seen a Sulcus hull turn late' }
const statOf = (s: Statistic) => (m: Master) => (s === 'belief' ? m.believesPiracy : m.seenTurningLate)

export interface DesignDraw {
  sample: Master[]
  estimate: number
  sulcus: number
  minutes: number
  convoys?: number[]
  start?: number
}

/** One draw under a design; the estimate is the sample proportion of the latent statistic (no nonresponse). */
export function drawDesign(r: Rng, design: Design, stat: Statistic): DesignDraw {
  let sample: Master[]
  let convoys: number[] | undefined
  let start: number | undefined
  if (design === 'srs') sample = drawSRS(r)
  else if (design === 'stratified') sample = drawStratified(r)
  else if (design === 'cluster') ({ sample, convoys } = drawCluster(r))
  else ({ sample, start } = drawSystematic(r))
  return { sample, estimate: proportion(sample, statOf(stat)), sulcus: sample.filter((m) => m.sulcus).length, minutes: linkMinutes(r, sample, design), convoys, start }
}

/** Repeated draws → estimates, Sulcus counts, minutes. */
export function simulateDesign(r: Rng, design: Design, stat: Statistic, reps: number): { estimates: number[]; sulcus: number[]; minutes: number[] } {
  const estimates = new Array<number>(reps)
  const sulcus = new Array<number>(reps)
  const minutes = new Array<number>(reps)
  for (let i = 0; i < reps; i++) {
    const d = drawDesign(r, design, stat)
    estimates[i] = d.estimate
    sulcus[i] = d.sulcus
    minutes[i] = d.minutes
  }
  return { estimates, sulcus, minutes }
}

export interface BiasMechanism {
  /** Who is on the list: the Lane schedule, or the Ceres dock-office callers. */
  frame: 'lane' | 'ceres'
  /** How they are reached: a random contact by tight-beam, or a notice they may answer or ignore. */
  contact: 'random' | 'volunteer'
  /** Neutral question, or the Authority's leading Q4. */
  wording: 'neutral' | 'leading'
}
export const CERES_MECHANISM: BiasMechanism = { frame: 'ceres', contact: 'volunteer', wording: 'leading' }
export const SRS_MECHANISM: BiasMechanism = { frame: 'lane', contact: 'random', wording: 'neutral' }

/**
 * One survey under a mechanism: contact n masters from the frame; under random contact Sulcus masters
 * answer only if they respond to contact at all (and then say "no comment", so they are excluded);
 * under volunteers each answers with `volunteerProb`. Returns the proportion "yes" among answers.
 */
export function drawBiased(r: Rng, mech: BiasMechanism, n: number): { estimate: number; answered: number; contacted: number } {
  const frame = mech.frame === 'lane' ? LANE_FRAME : CERES_SURVEY.frame
  const contacted = r.sample(frame, Math.min(n, frame.length))
  let answered = 0
  let yes = 0
  for (const m of contacted) {
    const answers = mech.contact === 'volunteer' ? r.bool(m.volunteerProb) : m.respondsToContact
    if (!answers) continue
    if (mech.contact === 'random' && m.sulcus) continue // "no comment"
    answered++
    if (m.believesPiracy || (mech.wording === 'leading' && m.swayedByWording)) yes++
  }
  return { estimate: answered ? yes / answered : NaN, answered, contacted: contacted.length }
}

export function simulateBias(r: Rng, mech: BiasMechanism, n: number, reps: number): number[] {
  const out: number[] = []
  for (let i = 0; i < reps; i++) {
    const d = drawBiased(r, mech, n)
    if (Number.isFinite(d.estimate)) out.push(d.estimate)
  }
  return out
}

/** Bias (mean of estimates − truth) and sampling variability (SD of estimates) of a simulated set. */
export function biasAndSpread(estimates: readonly number[], truth: number): { bias: number; spread: number; center: number } {
  const center = mean(estimates)
  return { bias: center - truth, spread: estimates.length > 1 ? sd(estimates) : NaN, center }
}

// ---------------------------------------------------------------------------------------------
// DS-04a — the Board's 2183 escort trial
// ---------------------------------------------------------------------------------------------

export interface TrialTransit {
  id: number
  hull: string
  owner: Owner
  drive: 'Tessera-C' | 'Mk 2' | 'Mk 3'
  /** Announced convoy the hull sailed in (A or B), or none. */
  convoy: 'A' | 'B' | null
  /** The Board's assignment: escorted by Tindr. */
  escorted: boolean
  departureDay: number
  /** Off-nominal advisories the Register logged for the transit. */
  advisories: number
  /** Incidents (losses) — zero for every transit in the month. */
  incidents: 0
}

function buildBoardTrial(): TrialTransit[] {
  const names = {
    Mercantile: nameFactory(rng('DS-04a', 'names', 'M'), HOUSE, HOUSE_SUFFIX),
    independent: nameFactory(rng('DS-04a', 'names', 'I'), INDEP_FIRST, INDEP_SUFFIX),
  }
  for (let k = 0; k < 10_000; k++) {
    const r = rng('DS-04a', k)
    const out: TrialTransit[] = []
    for (let i = 0; i < 14; i++) out.push({ id: i + 1, hull: names.Mercantile(), owner: 'Mercantile', drive: 'Tessera-C', convoy: i < 7 ? 'A' : 'B', escorted: true, departureDay: i < 7 ? 4 : 19, advisories: r.poisson(1.1), incidents: 0 })
    for (let i = 0; i < 12; i++) out.push({ id: 15 + i, hull: names.independent(), owner: 'independent', drive: r.bool(0.7) ? 'Mk 2' : 'Mk 3', convoy: null, escorted: false, departureDay: r.int(1, 30), advisories: r.poisson(2.3), incidents: 0 })
    const escorted = out.filter((t) => t.escorted).map((t) => t.advisories)
    const other = out.filter((t) => !t.escorted).map((t) => t.advisories)
    if (Math.max(...out.map((t) => t.advisories)) > 6) continue
    if (mean(other) - mean(escorted) < 0.9) continue
    // Names must be fixed regardless of which k is accepted — they were drawn from their own rngs above,
    // but a rejected k has consumed names; re-label deterministically by position.
    return out
  }
  throw new Error('DS-04a: no acceptable seed')
}
export const BOARD_TRIAL: readonly TrialTransit[] = buildBoardTrial()

/**
 * Confounding indicator for an assignment: the absolute difference in the Mercantile share between the
 * escorted and unescorted groups (1 = perfectly confounded, 0 = perfectly balanced).
 */
export function ownerImbalance(assignment: readonly boolean[], transits: readonly TrialTransit[] = BOARD_TRIAL): number {
  const esc = transits.filter((_, i) => assignment[i])
  const un = transits.filter((_, i) => !assignment[i])
  if (!esc.length || !un.length) return 1
  return Math.abs(proportionOf(esc, (t) => t.owner === 'Mercantile') - proportionOf(un, (t) => t.owner === 'Mercantile'))
}
function proportionOf<T>(xs: readonly T[], pred: (t: T) => boolean): number {
  return xs.length ? xs.filter(pred).length / xs.length : NaN
}
export function groupMeans(assignment: readonly boolean[], transits: readonly TrialTransit[] = BOARD_TRIAL): { escorted: number; unescorted: number; difference: number } {
  const e = transits.filter((_, i) => assignment[i]).map((t) => t.advisories)
  const u = transits.filter((_, i) => !assignment[i]).map((t) => t.advisories)
  const escorted = e.length ? mean(e) : NaN
  const unescorted = u.length ? mean(u) : NaN
  return { escorted, unescorted, difference: escorted - unescorted }
}
/** The Board's assignment vector. */
export const BOARD_ASSIGNMENT: readonly boolean[] = BOARD_TRIAL.map((t) => t.escorted)
/** Completely randomized: k escorted chosen at random. */
export function randomAssignment(r: Rng, k = 14, transits: readonly TrialTransit[] = BOARD_TRIAL): boolean[] {
  const chosen = new Set(r.sample(transits.map((_, i) => i), k))
  return transits.map((_, i) => chosen.has(i))
}
/** Randomized block by owner: within each owner class, half (rounded) escorted at random. */
export function blockedAssignment(r: Rng, transits: readonly TrialTransit[] = BOARD_TRIAL): boolean[] {
  const out = transits.map(() => false)
  for (const o of OWNERS) {
    const idx = transits.map((t, i) => (t.owner === o ? i : -1)).filter((i) => i >= 0)
    if (!idx.length) continue
    for (const i of r.sample(idx, Math.round(idx.length / 2))) out[i] = true
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// DS-04b — Asgard's escort lottery (MET 74–79) and the six-transit pilot
// ---------------------------------------------------------------------------------------------

export interface LotteryTransit {
  /** Transit label 01–12, the label Solberg's digits select. */
  label: number
  hull: string
  owner: Owner
  escorted: boolean
  /** Off-nominal advisories per transit (the Register's minor-record count). */
  advisories: number
}

/** Registry values: escorted {0,1,1,2,2,3} mean 1.5; unescorted {1,1,2,2,3,4} mean 2.17. */
const LOTTERY_ESCORTED_VALUES = [0, 1, 1, 2, 2, 3]
const LOTTERY_UNESCORTED_VALUES = [1, 1, 2, 2, 3, 4]

function buildLottery(): { transits: LotteryTransit[]; digits: string; escortedLabels: number[] } {
  const r = rng('DS-04b')
  // Twelve hulls departing Mark 6–7 in the week: 4 Sulcus, 5 Mercantile, 3 independent.
  const nP = nameFactory(r.child('names', 'P'), GANYMEDE, GANYMEDE_SUFFIX)
  const nM = nameFactory(r.child('names', 'M'), HOUSE, HOUSE_SUFFIX)
  const nI = nameFactory(r.child('names', 'I'), INDEP_FIRST, INDEP_SUFFIX)
  const owners: Owner[] = r.shuffle(['Perrine', 'Perrine', 'Perrine', 'Perrine', 'Mercantile', 'Mercantile', 'Mercantile', 'Mercantile', 'Mercantile', 'independent', 'independent', 'independent'])
  const hulls = owners.map((o) => (o === 'Perrine' ? nP() : o === 'Mercantile' ? nM() : nI()))
  // Solberg's random digits: read two at a time, labels 01–12, skip repeats and out-of-range, take six.
  const d = r.child('digits')
  let digits = ''
  const escortedLabels: number[] = []
  while (escortedLabels.length < 6) {
    const pair = `${d.int(0, 9)}${d.int(0, 9)}`
    digits += pair
    const v = Number(pair)
    if (v >= 1 && v <= 12 && !escortedLabels.includes(v)) escortedLabels.push(v)
  }
  const escSet = new Set(escortedLabels)
  const ev = r.child('values').shuffle(LOTTERY_ESCORTED_VALUES)
  const uv = r.child('values', 'u').shuffle(LOTTERY_UNESCORTED_VALUES)
  let ei = 0
  let ui = 0
  const transits: LotteryTransit[] = owners.map((o, i) => ({ label: i + 1, hull: hulls[i], owner: o, escorted: escSet.has(i + 1), advisories: escSet.has(i + 1) ? ev[ei++] : uv[ui++] }))
  return { transits, digits, escortedLabels }
}
const lottery = buildLottery()
export const LOTTERY_TRANSITS: readonly LotteryTransit[] = lottery.transits
/** The digit string Solberg logged (pairs → transit labels 01–12; repeats and out-of-range skipped). */
export const LOTTERY_DIGITS: string = lottery.digits
export const LOTTERY_ESCORTED_LABELS: readonly number[] = lottery.escortedLabels
export const LOTTERY_ESCORTED: readonly number[] = LOTTERY_TRANSITS.filter((t) => t.escorted).map((t) => t.advisories)
export const LOTTERY_UNESCORTED: readonly number[] = LOTTERY_TRANSITS.filter((t) => !t.escorted).map((t) => t.advisories)

/** Asgard's own six-transit pilot (used when the learner declines to order the lottery). */
export const PILOT_TRANSITS: readonly LotteryTransit[] = [
  { label: 1, hull: 'Nippur Sulcus', owner: 'Perrine', escorted: true, advisories: 1 },
  { label: 2, hull: 'Iris Covenant', owner: 'Mercantile', escorted: false, advisories: 3 },
  { label: 3, hull: 'Osprey Sounding', owner: 'independent', escorted: true, advisories: 2 },
  { label: 4, hull: 'Vesta Tally', owner: 'Mercantile', escorted: false, advisories: 2 },
  { label: 5, hull: 'Kadi Regio', owner: 'Perrine', escorted: false, advisories: 3 },
  { label: 6, hull: 'Wren Passage', owner: 'independent', escorted: true, advisories: 2 },
]
export const PILOT_ESCORTED: readonly number[] = PILOT_TRANSITS.filter((t) => t.escorted).map((t) => t.advisories)
export const PILOT_UNESCORTED: readonly number[] = PILOT_TRANSITS.filter((t) => !t.escorted).map((t) => t.advisories)

export interface ExactRandomization {
  observed: number
  /** Every relabelling's difference in means (group a − group b). */
  diffs: number[]
  count: number
  pLess: number
  pGreater: number
  pTwoSided: number
  meanA: number
  meanB: number
}

/** Exact randomization distribution of x̄ₐ − x̄_b over every C(n, nₐ) relabelling. */
export function exactRandomization(a: readonly number[], b: readonly number[]): ExactRandomization {
  const pooled = [...a, ...b]
  const n = pooled.length
  const k = a.length
  const total = pooled.reduce((s, v) => s + v, 0)
  const idx = Array.from({ length: k }, (_, i) => i)
  const diffs: number[] = []
  for (;;) {
    let sa = 0
    for (const i of idx) sa += pooled[i]
    diffs.push(sa / k - (total - sa) / (n - k))
    let i = k - 1
    while (i >= 0 && idx[i] === n - k + i) i--
    if (i < 0) break
    idx[i]++
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1
  }
  const observed = mean(a) - mean(b)
  return { observed, diffs, count: diffs.length, pLess: permutationPValue(diffs, observed, 'less'), pGreater: permutationPValue(diffs, observed, 'greater'), pTwoSided: permutationPValue(diffs, observed, 'two-sided'), meanA: mean(a), meanB: mean(b) }
}

export const LOTTERY_EXACT: ExactRandomization = exactRandomization(LOTTERY_ESCORTED, LOTTERY_UNESCORTED)
export const PILOT_EXACT: ExactRandomization = exactRandomization(PILOT_ESCORTED, PILOT_UNESCORTED)

/** Which trial the learner is analysing in act-3-05, from the recorded decision string. */
export function trialFromDecision(choice: string | undefined): { ordered: boolean; transits: readonly LotteryTransit[]; escorted: readonly number[]; unescorted: readonly number[]; exact: ExactRandomization; name: string } {
  const declined = !!choice && (choice === LOTTERY_OPTIONS.decline || /do not|don.t|pilot/i.test(choice))
  return declined
    ? { ordered: false, transits: PILOT_TRANSITS, escorted: PILOT_ESCORTED, unescorted: PILOT_UNESCORTED, exact: PILOT_EXACT, name: 'Asgard’s six-transit pilot' }
    : { ordered: true, transits: LOTTERY_TRANSITS, escorted: LOTTERY_ESCORTED, unescorted: LOTTERY_UNESCORTED, exact: LOTTERY_EXACT, name: 'the escort lottery' }
}

// ---------------------------------------------------------------------------------------------
// DS-01 — classification × classifying office, the 31 losses (a census, described not tested)
// ---------------------------------------------------------------------------------------------

export type Classification = 'unknown' | 'accident' | 'piracy'
export type Office = 'Uruk' | 'Ceres'
export const REGISTER_OFFICE: Record<Classification, Record<Office, number>> = {
  unknown: { Uruk: 19, Ceres: 3 },
  accident: { Uruk: 0, Ceres: 5 },
  piracy: { Uruk: 4, Ceres: 0 },
}
export const REGISTER_LOSSES = 31
export const REGISTER_RECORDS = 2200
export const officeTotal = (o: Office): number => REGISTER_OFFICE.unknown[o] + REGISTER_OFFICE.accident[o] + REGISTER_OFFICE.piracy[o]
export const classificationTotal = (c: Classification): number => REGISTER_OFFICE[c].Uruk + REGISTER_OFFICE[c].Ceres
/** Rows for a <Plot spec={{kind:'table'}}> or tableSpec. */
export const REGISTER_OFFICE_ROWS: (string | number)[][] = [
  ['unknown, presumed lost', REGISTER_OFFICE.unknown.Uruk, REGISTER_OFFICE.unknown.Ceres, classificationTotal('unknown')],
  ['accident', REGISTER_OFFICE.accident.Uruk, REGISTER_OFFICE.accident.Ceres, classificationTotal('accident')],
  ['piracy', REGISTER_OFFICE.piracy.Uruk, REGISTER_OFFICE.piracy.Ceres, classificationTotal('piracy')],
  ['Total', officeTotal('Uruk'), officeTotal('Ceres'), REGISTER_LOSSES],
]
export const REGISTER_OFFICE_COLUMNS = ['Classification', 'Uruk office', 'Ceres office', 'Total']

/** Rook's 2176 Asgard baseline report (DS-08) — the Briefing's "different in-world case" for scope. */
export const ASGARD_2176 = { losses: 13, transits: 2580, years: '2168–76' } as const
