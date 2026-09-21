/**
 * Act I datasets reproduce the beat-sheet registry's headline numbers (docs/beat-sheet.md §2, DS-01 / DS-19).
 */
import { describe, expect, it } from 'vitest'
import { countBy, mean, median, outliers, quartiles, round, sd, zScore, normal } from '@/lib/stats'
import {
  advisories,
  allMarks,
  arrivedAges,
  arrivedTransits,
  arrivedValues,
  contacts,
  firstEleven,
  fleetModel,
  gradualFades,
  harpagia,
  harpagiaTail,
  harpagiaZ,
  honestRatios,
  lossMarks,
  losses,
  lostAges,
  lostValues,
  maxClusterIn,
  ratioPct,
  register,
  timeToSilence,
  RATED_SPREAD_PCT,
} from './data'

describe('DS-01 · the Register', () => {
  it('has 2,200 records of which 31 are losses (1.4%)', () => {
    expect(register).toHaveLength(2200)
    expect(losses).toHaveLength(31)
    expect(advisories).toHaveLength(2169)
    expect(round(losses.length / register.length, 3)).toBe(0.014)
    expect(new Set(register.map((r) => r.record_id)).size).toBe(2200)
  })

  it("the Board's mean mark over all 2,200 records is 6.5; the losses' mean is about 8.5", () => {
    expect(round(mean(allMarks), 1)).toBe(6.5)
    const lossMean = mean(lossMarks)
    expect(lossMean).toBeGreaterThan(8.4)
    expect(lossMean).toBeLessThan(9.0)
  })

  it('classification of the 31: unknown 22 (19 Uruk, 3 Ceres) · accident 5 (Ceres) · piracy 4 (Uruk); Uruk 23, Ceres 8', () => {
    const cls = Object.fromEntries(countBy(losses.map((l) => l.classification)).map((r) => [r.value, r.count]))
    expect(cls).toEqual({ unknown: 22, accident: 5, piracy: 4 })
    const office = Object.fromEntries(countBy(losses.map((l) => l.office)).map((r) => [r.value, r.count]))
    expect(office).toEqual({ Uruk: 23, Ceres: 8 })
    const uruk = losses.filter((l) => l.office === 'Uruk')
    expect(uruk.filter((l) => l.classification === 'unknown')).toHaveLength(19)
    expect(uruk.filter((l) => l.classification === 'piracy')).toHaveLength(4)
    const ceres = losses.filter((l) => l.office === 'Ceres')
    expect(ceres.filter((l) => l.classification === 'unknown')).toHaveLength(3)
    expect(ceres.filter((l) => l.classification === 'accident')).toHaveLength(5)
    expect(ceres.some((l) => l.classification === 'piracy')).toBe(false)
    // 1-02 owns the 71%.
    expect(round(22 / 31, 2)).toBe(0.71)
  })

  it('mark at last contact: 23 of 31 in [9, 10.5], the cluster at Mark 9–10', () => {
    expect(lossMarks.filter((m) => m >= 9 && m <= 10.5)).toHaveLength(23)
    expect(median(lossMarks)).toBeGreaterThan(9)
    expect(median(lossMarks)).toBeLessThan(10)
  })

  it('time to silence is two piles — 12 abrupt (< 1 min), 19 gradual (3–8 h) — and the mean 3.4 h sits in the gap', () => {
    const abrupt = timeToSilence.filter((t) => t < 1 / 60)
    const gradual = timeToSilence.filter((t) => t >= 3 && t <= 8)
    expect(abrupt).toHaveLength(12)
    expect(gradual).toHaveLength(19)
    expect(round(mean(timeToSilence), 1)).toBe(3.4)
    // No value near the mean: the mean describes no hull.
    expect(timeToSilence.some((t) => t > 1 && t < 3)).toBe(false)
    // A 1.5×IQR box hides both piles (the 1-05 counter-example): no outliers.
    expect(outliers(timeToSilence).values).toHaveLength(0)
    // The piracy hulls are all in the abrupt pile.
    for (const l of losses) if (l.classification === 'piracy') expect(l.time_to_silence).toBeLessThan(1 / 60)
  })

  it('gradual fades across all records: 119 → P(loss | gradual) 0.16, P(gradual | loss) 0.61, P(no loss | gradual) 0.84', () => {
    expect(gradualFades).toHaveLength(119)
    const lostGradual = gradualFades.filter((r) => r.severity === 'loss').length
    expect(lostGradual).toBe(19)
    expect(round(lostGradual / gradualFades.length, 2)).toBe(0.16)
    expect(round(lostGradual / losses.length, 2)).toBe(0.61)
    expect(round((gradualFades.length - lostGradual) / gradualFades.length, 2)).toBe(0.84)
  })

  it('the tightest 30-day cluster of loss dates is 5 (2182-02-24 → 03-21)', () => {
    expect(maxClusterIn(losses.map((l) => l.date))).toBe(5)
    const spring = losses.filter((l) => l.date >= '2182-02-24' && l.date <= '2182-03-21').map((l) => l.hull).sort()
    expect(spring).toEqual(['Hygiea Promise', 'Kestrel Bough', 'Nicholson Regio', 'Thessaly Ember', 'Xibalba Sulcus'])
  })

  it('cargo of the 31 lost: He-3/D 5 · volatiles 21 · metals 2 · other 3 (DS-14)', () => {
    const cargo = Object.fromEntries(countBy(losses.map((l) => l.cargo_category)).map((r) => [r.value, r.count]))
    expect(cargo).toEqual({ 'He-3/D': 5, volatiles: 21, metals: 2, 'manufactured & other': 3 })
  })

  it('lost hulls carry cheaper declared cargo than the Lane; hull age shows no difference (1-06)', () => {
    expect(median(lostValues)).toBeLessThan(median(arrivedValues) / 1.5)
    expect(Math.abs(mean(lostAges) - mean(arrivedAges))).toBeLessThan(1.2)
    expect(arrivedAges).toHaveLength(2581)
  })

  it('diverted hulls are Perrine / Sulcus, coded unknown by Uruk, gradual, volatiles; each also has a Mark 9 late-check-in advisory', () => {
    const diverted = losses.filter((l) => l.group === 'diverted')
    expect(diverted).toHaveLength(19)
    for (const d of diverted) {
      expect(d.owner_class).toBe('Perrine')
      expect(d.office).toBe('Uruk')
      expect(d.classification).toBe('unknown')
      expect(d.fade).toBe('gradual')
      expect(d.cargo_category).toBe('volatiles')
      expect(d.mark_last).toBeGreaterThanOrEqual(9.05)
      expect(d.mark_last).toBeLessThanOrEqual(9.65)
      const adv = advisories.filter((a) => a.hull === d.hull && a.kind === 'profile-deviation advisory' && a.mark >= 9 && a.mark <= 9.3)
      expect(adv.length).toBeGreaterThanOrEqual(1)
    }
    expect(losses.filter((l) => l.group === 'cover').map((l) => l.mark_last).sort()).toEqual([10.2, 10.5, 9.6, 9.9].sort())
  })
})

describe('DS-19 · drive-signature contact log', () => {
  it('has 60 contacts, 11 by MET 15, all logged by MET 19/12; the hot contact is among the first eleven', () => {
    expect(contacts).toHaveLength(60)
    expect(firstEleven.every((c) => c.met_day < 15)).toBe(true)
    expect(contacts.every((c) => c.met_day < 19.5)).toBe(true)
    expect(firstEleven).toContain(harpagia)
    expect(harpagia.drive_family).toBe('Mk 3')
    expect(harpagia.ratio_pct).toBe(109.2)
    expect(harpagia.declared_mass).toBe(19400)
  })

  it('honest ratios are N(100, 2.8)-ish and the 1.5×IQR fence flags exactly the hot contact', () => {
    expect(honestRatios).toHaveLength(59)
    expect(Math.abs(fleetModel.mean - 100)).toBeLessThan(0.5)
    expect(fleetModel.sd).toBeGreaterThan(2.4)
    expect(fleetModel.sd).toBeLessThan(3.2)
    const o = outliers(ratioPct)
    expect(o.values).toEqual([109.2])
    expect(harpagia.ratio_pct).toBeGreaterThan(o.highFence)
    const q = quartiles(ratioPct)
    expect(q.q3 - q.q1).toBeGreaterThan(2)
  })

  it('z ≈ 2.6 against the rated spread, ≈ 3.3 against the fleet; P(honest hull that hot) ≈ 0.0005', () => {
    expect(round(zScore(109.2, 100, RATED_SPREAD_PCT), 1)).toBe(2.6)
    expect(harpagiaZ).toBeGreaterThan(3.2)
    expect(harpagiaZ).toBeLessThan(3.4)
    expect(harpagiaTail).toBeGreaterThan(0.0003)
    expect(harpagiaTail).toBeLessThan(0.0007)
    expect(harpagiaTail).toBeCloseTo(normal.sf(harpagiaZ), 12)
  })

  it('the hot contact moves the sixty’s mean by about a sixth of a point and the first eleven’s by nearly a point; medians barely move', () => {
    const shift60 = mean(ratioPct) - mean(honestRatios)
    expect(shift60).toBeGreaterThan(0.12)
    expect(shift60).toBeLessThan(0.2)
    const eleven = firstEleven.map((c) => c.ratio_pct)
    const elevenHonest = firstEleven.filter((c) => c !== harpagia).map((c) => c.ratio_pct)
    const shift11 = mean(eleven) - mean(elevenHonest)
    expect(shift11).toBeGreaterThan(0.7)
    expect(shift11).toBeLessThan(1.0)
    expect(Math.abs(median(ratioPct) - median(honestRatios))).toBeLessThan(0.3)
    expect(sd(ratioPct)).toBeGreaterThan(sd(honestRatios))
  })

  it('plume power is bimodal by drive family (Mk 3 ≈ 0.29 TW, Tessera-C ≈ 0.22 TW)', () => {
    const mk3 = contacts.filter((c) => c.drive_family === 'Mk 3').map((c) => c.plume_TW)
    const tc = contacts.filter((c) => c.drive_family === 'Tessera-C').map((c) => c.plume_TW)
    expect(mean(mk3)).toBeGreaterThan(0.26)
    expect(mean(mk3)).toBeLessThan(0.36)
    expect(mean(tc)).toBeGreaterThan(0.16)
    expect(mean(tc)).toBeLessThan(0.25)
    expect(mean(mk3) - mean(tc)).toBeGreaterThan(0.06)
    for (const c of contacts) expect(Math.abs((c.plume_TW / c.expected_TW) * 100 - c.ratio_pct)).toBeLessThan(0.15)
  })

  it('no lost hull appears as a live contact, advisory or arrived transit (continuity)', () => {
    const lost = new Set(losses.map((l) => l.hull))
    expect(contacts.some((c) => lost.has(c.hull))).toBe(false)
    expect(arrivedTransits.some((t) => lost.has(t.hull))).toBe(false)
    for (const a of advisories) if (lost.has(a.hull)) {
      const loss = losses.find((l) => l.hull === a.hull)!
      expect(a.kind).toBe('profile-deviation advisory')
      expect(a.date).toBe(loss.date)
    }
  })

  it('is identical on every load (no Date.now / Math.random)', () => {
    expect(contacts[0].contact_id).toBe('C-001')
    expect(register[0].record_id).toBe('LA-0001')
    expect(register[0].date <= register[2199].date).toBe(true)
  })
})
