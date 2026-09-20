/**
 * <MonteCarlo task="normal-sample-mean" params={{ n: 25, mu: 0, sigma: 1 }} n={2000}>
 * Runs a registered worker task, streams results, and renders a live histogram of the statistic.
 * Children (optional) receive the results array for custom overlays.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { runSimulation, type SimulationHandle } from '@/lib/sim'
import { seedFrom } from '@/lib/rng'
import { useProgress } from '@/store/progress'
import { mean, sd } from '@/lib/stats/descriptive'
import { fmt } from '@/lib/stats/format'
import { useModule } from './ModuleContext'
import { Panel, type PanelTone } from './Panel'
import { Plot } from './Plot'

export interface MonteCarloProps {
  label: string
  task: string
  params: Record<string, unknown>
  /** Replications per run. */
  n?: number
  seedKey?: string
  tone?: PanelTone
  statLabel?: string
  binWidth?: number
  description?: string
  children?: (results: number[]) => ReactNode
}

export function MonteCarlo({ label, task, params, n = 1000, seedKey, tone = 'tactical', statLabel = 'statistic', binWidth, description, children }: MonteCarloProps) {
  const learnerSeed = useProgress((s) => s.learnerSeed)
  const { meta } = useModule()
  const [generation, setGeneration] = useState(0)
  const [results, setResults] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const handle = useRef<SimulationHandle | null>(null)
  const seed = seedFrom(learnerSeed, meta.id, seedKey ?? task, generation)

  useEffect(() => () => handle.current?.cancel(), [])

  const run = () => {
    handle.current?.cancel()
    setResults([])
    setRunning(true)
    handle.current = runSimulation({
      task,
      params,
      seed,
      n,
      onProgress: (r) => setResults(r.slice()),
      onDone: () => setRunning(false),
      onError: (m) => {
        console.error(m)
        setRunning(false)
      },
    })
  }
  const reset = () => {
    handle.current?.cancel()
    setResults([])
    setRunning(false)
    setGeneration((g) => g + 1)
  }

  const m = results.length ? mean(results) : NaN
  const s = results.length > 1 ? sd(results) : NaN

  return (
    <Panel label={label} status={`SEED ${seed.toString(16).toUpperCase().padStart(8, '0')} · ${results.length}/${n}`} tone={tone} className="dr-mc">
      <div className="dr-mc__stage">
        {results.length > 0 ? (
          <Plot spec={{ kind: 'histogram', values: results, binWidth, label: statLabel }} label={`DISTRIBUTION OF ${statLabel.toUpperCase()}`} description={description ?? `Histogram of ${results.length} simulated values of the ${statLabel}.`} />
        ) : (
          <p className="dr-muted">No replications yet. Run the simulation.</p>
        )}
        {children?.(results)}
      </div>
      <div className="dr-sim__bar">
        <button type="button" className="dr-btn dr-btn--primary" onClick={run} disabled={running}>
          {running ? 'RUNNING…' : `RUN ${n.toLocaleString()}`}
        </button>
        <button type="button" className="dr-btn dr-btn--ghost" onClick={reset}>
          RESET · NEW SEED
        </button>
        <span className="dr-mc__readout" aria-live="polite">
          {results.length > 1 ? `mean ${fmt(m, 3)} · sd ${fmt(s, 3)}` : ''}
        </span>
      </div>
    </Panel>
  )
}
