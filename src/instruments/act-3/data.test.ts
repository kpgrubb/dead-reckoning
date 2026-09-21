/**
 * Act III datasets reproduce the beat-sheet registry (§2 DS-03, DS-04, DS-01 office counts).
 */
import { describe, expect, it } from 'vitest'
import { rng } from '@/lib/rng'
import { mean, round, sd } from '@/lib/stats'
import {
  BELIEF_BY_OWNER,
  BOARD_ASSIGNMENT,
  BOARD_TRIAL,
  CERES_SURVEY,
  CERES_MECHANISM,
  CONVOYS,
  FRAME_MIX,
  HARPAGIA,
  LANE_FRAME,
  LOTTERY_DIGITS,
  LOTTERY_ESCORTED,
  LOTTERY_ESCORTED_LABELS,
  LOTTERY_EXACT,
  LOTTERY_TRANSITS,
  LOTTERY_UNESCORTED,
  MARIUS,
  POPULATION,
  PILOT_EXACT,
  REGISTER_OFFICE,
  SRS_MECHANISM,
  SURVEY_RUNS,
  SURVEY_TARGETS,
  THESSALY_DAWN,
  TRUTH_BELIEF,
  biasAndSpread,
  blockedAssignment,
  classificationTotal,
  drawSystematic,
  expectedLinkMinutes,
  groupMeans,
  independentBeliefProportion,
  officeTotal,
  ownerImbalance,
  ownerMix,
  randomAssignment,
  simulateBias,
  simulateDesign,
  sulcusNonresponseRate,
  trialFromDecision,
  designFromDecision,
  DESIGN_OPTIONS,
  LOTTERY_OPTIONS,
} from './data'

describe('DS-03b · the Lane frame and the population', () => {
  it('has 400 masters and a 260-master frame with the registry owner mix (88 / 110 / 62)', () => {
    expect(POPULATION).toHaveLength(400)
    expect(LANE_FRAME).toHaveLength(260)
    expect(ownerMix(LANE_FRAME)).toEqual(FRAME_MIX)
    expect(new Set(POPULATION.map((m) => m.hull)).size).toBe(400)
  })
  it('organises the frame into 37 convoys of 7 (one of 8)', () => {
    expect(CONVOYS).toHaveLength(37)
    const sizes = CONVOYS.map((c) => c.members.length)
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(260)
    expect(Math.min(...sizes)).toBe(7)
    expect(Math.max(...sizes)).toBe(8)
  })
  it('places the story hulls in the frame', () => {
    const harp = LANE_FRAME.find((m) => m.hull === HARPAGIA)!
    expect(harp.owner).toBe('Perrine')
    expect(harp.mark).toBeGreaterThan(8.9)
    expect(harp.mark).toBeLessThan(9.3)
    expect(harp.respondsToContact).toBe(false)
    expect(LANE_FRAME.find((m) => m.hull === MARIUS)!.mark).toBeLessThan(2)
    expect(LANE_FRAME.find((m) => m.hull === THESSALY_DAWN)!.owner).toBe('independent')
  })
  it('belief in piracy inside the frame: Perrine 100 %, Mercantile 48 %, independents 31 %', () => {
    expect(BELIEF_BY_OWNER.Perrine).toBe(1)
    expect(round(BELIEF_BY_OWNER.Mercantile, 2)).toBe(0.48)
    expect(round(BELIEF_BY_OWNER.independent, 2)).toBe(0.31)
    expect(TRUTH_BELIEF).toBeGreaterThan(0.55)
    expect(TRUTH_BELIEF).toBeLessThan(0.68)
  })
  it('systematic sampling by hull number returns every 6th hull', () => {
    const { sample, start } = drawSystematic(rng('test', 'sys'))
    expect(start).toBeGreaterThanOrEqual(1)
    expect(sample.length).toBeGreaterThanOrEqual(43)
    expect(sample.every((m) => (m.hullNo! - start) % 6 === 0)).toBe(true)
  })
})

describe('DS-03a · the Ceres dock survey', () => {
  it('has 212 respondents, 94 % yes, owner mix 9 / 61 / 30 %', () => {
    expect(CERES_SURVEY.n).toBe(212)
    expect(CERES_SURVEY.yes).toBe(199)
    expect(round(CERES_SURVEY.pYes, 2)).toBe(0.94)
    expect(CERES_SURVEY.mix).toEqual({ Perrine: 19, Mercantile: 129, independent: 64 })
    expect(Math.round((100 * 19) / 212)).toBe(9)
    expect(Math.round((100 * 129) / 212)).toBe(61)
    expect(Math.round((100 * 64) / 212)).toBe(30)
  })
  it('contains no Sulcus master who later diverted, by construction', () => {
    expect(CERES_SURVEY.respondents.some((m) => m.status === 'lost')).toBe(false)
    expect(CERES_SURVEY.respondents.some((m) => m.hull === HARPAGIA || m.hull === MARIUS)).toBe(false)
  })
})

describe('DS-03b · the learner’s survey under each design', () => {
  for (const design of ['srs', 'stratified', 'cluster'] as const) {
    it(`${design}: reproduces the registry counts`, () => {
      const run = SURVEY_RUNS[design]
      const t = SURVEY_TARGETS[design]
      expect(run.n).toBe(t.n)
      expect(run.turningLate).toBe(t.turningLate)
      expect(run.sulcusContacted).toBe(t.contacted)
      expect(run.sulcusAnswered).toBe(t.answered)
      expect(run.sulcusSilent).toBe(t.silent)
      expect(run.sample.some((m) => m.hull === THESSALY_DAWN)).toBe(true)
      expect(run.sample.some((m) => m.hull === HARPAGIA)).toBe(false)
      expect(run.independentResponders).toBeGreaterThanOrEqual(6)
      expect(sulcusNonresponseRate(run)).toBeCloseTo(t.silent / t.contacted, 12)
      expect(independentBeliefProportion(run)).toBeGreaterThanOrEqual(0)
      expect(independentBeliefProportion(run)).toBeLessThanOrEqual(1)
      expect(run.linkMinutes).toBeGreaterThan(0)
    })
  }
  it('stratified contacts 15 of each owner class; cluster covers six whole convoys', () => {
    expect(ownerMix(SURVEY_RUNS.stratified.sample)).toEqual({ Perrine: 15, Mercantile: 15, independent: 15 })
    expect(SURVEY_RUNS.cluster.convoys).toHaveLength(6)
    const set = new Set(SURVEY_RUNS.cluster.convoys)
    expect(LANE_FRAME.filter((m) => set.has(m.convoy!)).length).toBe(42)
  })
  it('is deterministic across loads (fixed seeds, no Math.random)', async () => {
    const fresh = await import('./data')
    expect(fresh.SURVEY_RUNS.srs.sample.map((m) => m.id)).toEqual(SURVEY_RUNS.srs.sample.map((m) => m.id))
    expect(fresh.SURVEY_RUNS.cluster.convoys).toEqual(SURVEY_RUNS.cluster.convoys)
  })
  it('link-time model: SRS ≈ 36.7 h, stratified ≈ 41 h, cluster ≈ 17.5 h', () => {
    expect(round(expectedLinkMinutes('srs', 40) / 60, 1)).toBe(36.7)
    expect(round(expectedLinkMinutes('stratified', 45) / 60, 1)).toBe(41.3)
    expect(round(expectedLinkMinutes('cluster', 42) / 60, 1)).toBe(17.5)
  })
  it('maps decision strings back to designs', () => {
    expect(designFromDecision(undefined)).toBe('srs')
    expect(designFromDecision(DESIGN_OPTIONS.srs)).toBe('srs')
    expect(designFromDecision(DESIGN_OPTIONS.stratified)).toBe('stratified')
    expect(designFromDecision(DESIGN_OPTIONS.cluster)).toBe('cluster')
  })
})

describe('sampling simulator · repeated draws', () => {
  it('SRS and stratified are centred on the frame truth; stratified is tighter; cluster is wider', () => {
    const truth = mean(LANE_FRAME.map((m) => (m.believesPiracy ? 1 : 0)))
    const srs = simulateDesign(rng('test', 'srs'), 'srs', 'belief', 2000).estimates
    const strat = simulateDesign(rng('test', 'strat'), 'stratified', 'belief', 2000).estimates
    const clus = simulateDesign(rng('test', 'clus'), 'cluster', 'belief', 2000).estimates
    expect(Math.abs(mean(srs) - truth)).toBeLessThan(0.01)
    expect(sd(strat)).toBeLessThan(sd(srs))
    expect(sd(clus)).toBeGreaterThan(sd(srs) * 1.2)
  })
})

describe('bias demonstrator', () => {
  it('SRS scatters around the truth; the Ceres mechanism sits near 94 %', () => {
    const honest = simulateBias(rng('test', 'honest'), SRS_MECHANISM, 212, 1500)
    const ceres = simulateBias(rng('test', 'ceres'), CERES_MECHANISM, 212, 1500)
    // Under random contact Sulcus masters say "no comment", so the honest estimate targets the non-Sulcus truth.
    const nonSulcusTruth = mean(LANE_FRAME.filter((m) => !m.sulcus).map((m) => (m.believesPiracy ? 1 : 0)))
    const h = biasAndSpread(honest, nonSulcusTruth)
    const c = biasAndSpread(ceres, TRUTH_BELIEF)
    expect(Math.abs(h.bias)).toBeLessThan(0.012)
    expect(c.center).toBeGreaterThan(0.9)
    expect(c.center).toBeLessThan(0.97)
    expect(c.bias).toBeGreaterThan(0.25)
  })
  it('each mechanism moves the estimate: frame down, volunteers up, wording up', () => {
    const base = mean(simulateBias(rng('t', 1), { frame: 'ceres', contact: 'random', wording: 'neutral' }, 212, 800))
    const vol = mean(simulateBias(rng('t', 2), { frame: 'ceres', contact: 'volunteer', wording: 'neutral' }, 212, 800))
    const word = mean(simulateBias(rng('t', 3), { frame: 'ceres', contact: 'volunteer', wording: 'leading' }, 212, 800))
    const laneVol = mean(simulateBias(rng('t', 4), { frame: 'lane', contact: 'volunteer', wording: 'neutral' }, 212, 800))
    expect(vol).toBeGreaterThan(base + 0.15)
    expect(word).toBeGreaterThan(vol + 0.04)
    expect(laneVol).toBeGreaterThan(0.75)
  })
})

describe('DS-04a · the Board’s 2183 escort trial', () => {
  it('has 14 escorted Mercantile transits in two convoys and 12 unescorted independents, zero incidents', () => {
    expect(BOARD_TRIAL).toHaveLength(26)
    const esc = BOARD_TRIAL.filter((t) => t.escorted)
    expect(esc).toHaveLength(14)
    expect(esc.every((t) => t.owner === 'Mercantile' && t.convoy !== null)).toBe(true)
    expect(BOARD_TRIAL.filter((t) => !t.escorted).every((t) => t.owner === 'independent' && t.convoy === null)).toBe(true)
    expect(BOARD_TRIAL.every((t) => t.incidents === 0)).toBe(true)
    expect(BOARD_TRIAL.some((t) => t.owner === 'Perrine')).toBe(false)
  })
  it('owner is perfectly confounded with escort; randomization balances it', () => {
    expect(ownerImbalance(BOARD_ASSIGNMENT)).toBe(1)
    const g = groupMeans(BOARD_ASSIGNMENT)
    expect(g.escorted).toBeLessThan(g.unescorted - 0.8)
    const r = rng('test', 'assign')
    const imb: number[] = []
    const diffs: number[] = []
    for (let i = 0; i < 500; i++) {
      const a = randomAssignment(r)
      imb.push(ownerImbalance(a))
      diffs.push(groupMeans(a).difference)
    }
    expect(mean(imb)).toBeLessThan(0.3)
    expect(Math.abs(mean(diffs))).toBeLessThan(0.15)
    const b = blockedAssignment(rng('test', 'block'))
    expect(ownerImbalance(b)).toBeLessThan(0.01)
    expect(b.filter(Boolean).length).toBe(13)
  })
})

describe('DS-04b · Asgard’s escort lottery', () => {
  it('escorted {0,1,1,2,2,3} mean 1.5; unescorted {1,1,2,2,3,4} mean 2.17; difference −0.67', () => {
    expect([...LOTTERY_ESCORTED].sort()).toEqual([0, 1, 1, 2, 2, 3])
    expect([...LOTTERY_UNESCORTED].sort()).toEqual([1, 1, 2, 2, 3, 4])
    expect(LOTTERY_EXACT.meanA).toBe(1.5)
    expect(round(LOTTERY_EXACT.meanB, 2)).toBe(2.17)
    expect(round(LOTTERY_EXACT.observed, 2)).toBe(-0.67)
  })
  it('exact randomization over C(12,6) = 924 relabellings: one-sided p = 0.23, two-sided 0.46', () => {
    expect(LOTTERY_EXACT.count).toBe(924)
    expect(round(LOTTERY_EXACT.pLess, 2)).toBe(0.23)
    expect(round(LOTTERY_EXACT.pTwoSided, 2)).toBe(0.46)
  })
  it('the assignment is reproducible from Solberg’s logged digits', () => {
    const labels: number[] = []
    for (let i = 0; i + 1 < LOTTERY_DIGITS.length && labels.length < 6; i += 2) {
      const v = Number(LOTTERY_DIGITS.slice(i, i + 2))
      if (v >= 1 && v <= 12 && !labels.includes(v)) labels.push(v)
    }
    expect(labels).toEqual([...LOTTERY_ESCORTED_LABELS])
    expect(LOTTERY_TRANSITS.filter((t) => t.escorted).map((t) => t.label).sort((a, b) => a - b)).toEqual([...labels].sort((a, b) => a - b))
  })
  it('the six-transit pilot: exact one-sided p = 0.15 over C(6,3) = 20', () => {
    expect(PILOT_EXACT.count).toBe(20)
    expect(round(PILOT_EXACT.pLess, 2)).toBe(0.15)
    expect(trialFromDecision(LOTTERY_OPTIONS.decline).ordered).toBe(false)
    expect(trialFromDecision(LOTTERY_OPTIONS.order).exact.pLess).toBe(LOTTERY_EXACT.pLess)
    expect(trialFromDecision(undefined).ordered).toBe(true)
  })
})

describe('DS-01 · classification by office (the 31 losses)', () => {
  it('unknown 22 (19 Uruk, 3 Ceres) · accident 5 (Ceres) · piracy 4 (Uruk); Uruk 23, Ceres 8', () => {
    expect(classificationTotal('unknown')).toBe(22)
    expect(REGISTER_OFFICE.unknown.Uruk).toBe(19)
    expect(classificationTotal('accident')).toBe(5)
    expect(classificationTotal('piracy')).toBe(4)
    expect(officeTotal('Uruk')).toBe(23)
    expect(officeTotal('Ceres')).toBe(8)
  })
})
