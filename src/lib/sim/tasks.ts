/**
 * Simulation task registry for the Monte Carlo worker. Each task performs ONE replication and
 * returns one number (a statistic). The worker batches replications and streams results.
 *
 * Add tasks here (Engine agent) — Act instrument builders may also register tasks via
 * `registerTask` at module load (import their file from src/lib/sim/index.ts).
 */
import type { Rng } from '@/lib/rng'
import { mean } from '@/lib/stats/descriptive'

export type SimTask = (rng: Rng, params: Record<string, unknown>) => number

export const tasks: Record<string, SimTask> = {
  /** Mean of n draws from Normal(mu, sigma). params: { n, mu, sigma } */
  'normal-sample-mean': (rng, p) => {
    const n = Number(p.n ?? 10)
    const mu = Number(p.mu ?? 0)
    const sigma = Number(p.sigma ?? 1)
    const xs: number[] = []
    for (let i = 0; i < n; i++) xs.push(rng.normal(mu, sigma))
    return mean(xs)
  },
  /** Sample proportion from Binomial(n, p). params: { n, p } */
  'sample-proportion': (rng, p) => {
    const n = Number(p.n ?? 30)
    const pr = Number(p.p ?? 0.5)
    return rng.binomial(n, pr) / n
  },
}

export function registerTask(name: string, task: SimTask) {
  tasks[name] = task
}
