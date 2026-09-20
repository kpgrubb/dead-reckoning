/**
 * Main-thread client for the Monte Carlo worker. Usage:
 *
 *   const run = runSimulation({ task: 'normal-sample-mean', params: { n: 25, mu: 0, sigma: 1 }, seed, n: 5000,
 *     onProgress: (all, done) => setResults(all.slice()), onDone: () => ... })
 *   run.cancel()
 *
 * Falls back to a synchronous in-thread run when Workers are unavailable (tests/jsdom).
 */
import { Rng } from '@/lib/rng'
import { tasks } from './tasks'
import type { InMessage, OutMessage } from './worker'

export interface SimulationOptions {
  task: string
  params: Record<string, unknown>
  seed: number
  n: number
  batch?: number
  onProgress?: (results: number[], done: number) => void
  onDone?: (results: number[]) => void
  onError?: (message: string) => void
}

export interface SimulationHandle {
  cancel: () => void
}

let worker: Worker | null = null
let nextId = 1
const listeners = new Map<number, (m: OutMessage) => void>()

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<OutMessage>) => listeners.get(e.data.id)?.(e.data)
  }
  return worker
}

export function runSimulation(opts: SimulationOptions): SimulationHandle {
  const id = nextId++
  const results: number[] = []
  const w = getWorker()

  if (!w) {
    // Synchronous fallback
    const task = tasks[opts.task]
    if (!task) {
      opts.onError?.(`Unknown simulation task "${opts.task}"`)
      return { cancel: () => {} }
    }
    const rng = new Rng(opts.seed)
    for (let i = 0; i < opts.n; i++) results.push(task(rng, opts.params))
    opts.onProgress?.(results, results.length)
    opts.onDone?.(results)
    return { cancel: () => {} }
  }

  listeners.set(id, (m) => {
    if (m.type === 'progress') {
      for (const r of m.results) results.push(r)
      opts.onProgress?.(results, m.done)
    } else if (m.type === 'done') {
      listeners.delete(id)
      opts.onDone?.(results)
    } else if (m.type === 'error') {
      listeners.delete(id)
      opts.onError?.(m.message)
    }
  })
  const msg: InMessage = { type: 'run', id, task: opts.task, params: opts.params, seed: opts.seed, n: opts.n, batch: opts.batch }
  w.postMessage(msg)
  return {
    cancel: () => {
      listeners.delete(id)
      const c: InMessage = { type: 'cancel', id }
      w.postMessage(c)
    },
  }
}

export { tasks, registerTask } from './tasks'
