import { it } from 'vitest'
import * as D from './data'
import { mean, sd, min, max, skewness } from '@/lib/stats'
it('probe', () => {
  const o: Record<string, unknown> = {
    LANE_DELAY_MEAN: D.LANE_DELAY_MEAN, LANE_DELAY_SD: D.LANE_DELAY_SD,
    NINETEEN_MEAN_DELAY: D.NINETEEN_MEAN_DELAY, NINETEEN_SD_DELAY: D.NINETEEN_SD_DELAY,
    DELAY_CUTOFF_1PCT: D.DELAY_CUTOFF_1PCT, P_HONEST_AS_LATE: D.P_HONEST_AS_LATE,
    SE_MEAN_19: D.SE_MEAN_19, Z_MEAN_19: D.Z_MEAN_19,
    POOLED_RATE: D.POOLED_RATE, SD_PHAT_PERRINE: D.SD_PHAT_PERRINE, LARGE_COUNTS_PERRINE: D.LARGE_COUNTS_PERRINE,
    SD_DIFF_PROPORTIONS: D.SD_DIFF_PROPORTIONS, GAP_1_IN_100: D.GAP_1_IN_100,
    SD_DIFF_MEANS_FLEETS: D.SD_DIFF_MEANS_FLEETS, SD_DIFF_MEANS_SMALL: D.SD_DIFF_MEANS_SMALL, GAP_1_IN_1000: D.GAP_1_IN_1000,
    honestDelayRange: [min(D.honestDelays), max(D.honestDelays)],
    honestSkew: skewness(D.honestDelays),
    schedT9: [min(D.honestTransits.map(t=>t.scheduledT9)), max(D.honestTransits.map(t=>t.scheduledT9)), mean(D.honestTransits.map(t=>t.scheduledT9)), skewness(D.honestTransits.map(t=>t.scheduledT9))],
    sq: skewness(D.honestDelays.map(d=>d*d)),
    patrolTruthRate: D.patrolTruth('rate'), patrolTruthMean: D.patrolTruth('meanDelay'),
    rateAsgard: D.rateOf(D.CUTTERS.asgard), rateTindr: D.rateOf(D.CUTTERS.tindr),
    sdPhat400: Math.sqrt(D.patrolTruth('rate')*(1-D.patrolTruth('rate'))/400),
  }
  console.log(JSON.stringify(o, null, 1))
})
