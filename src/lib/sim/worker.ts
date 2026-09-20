/**
 * Monte Carlo Web Worker. The Simulation & Stats Engine agent owns this.
 *
 * Protocol: main thread posts `{ type: 'run', id, task, params, seed, n, batch? }`; the worker
 * replies with `{ type: 'progress', id, done, results }` chunks and finally `{ type: 'done', id }`.
 * `task` names a registered simulation in ./tasks.ts (e.g. 'sample-mean', 'ci-capture').
 *
 * Scheduling: replications run in time slices (≤ SLICE_MS of work, then yield via setTimeout so
 * cancel messages are honoured) and results are flushed at most every FLUSH_MS or `batch`
 * replications, whichever comes first. A 100,000-replication run therefore produces on the order of
 * a hundred progress messages, not thousands, and the worker never starves its own message queue.
 * The main thread is never blocked: all work is here, off the UI thread.
 */
import { Rng } from '@/lib/rng'
import { tasks } from './tasks'

export interface RunMessage {
  type: 'run'
  id: number
  task: string
  params: Record<string, unknown>
  seed: number
  /** Total replications. */
  n: number
  /** Replications per progress message (upper bound; default scales with n). */
  batch?: number
}
export interface CancelMessage {
  type: 'cancel'
  id: number
}
export type InMessage = RunMessage | CancelMessage

export interface ProgressMessage {
  type: 'progress'
  id: number
  done: number
  results: number[]
}
export interface DoneMessage {
  type: 'done'
  id: number
}
export interface ErrorMessage {
  type: 'error'
  id: number
  message: string
}
export type OutMessage = ProgressMessage | DoneMessage | ErrorMessage

const SLICE_MS = 12
const FLUSH_MS = 40

const cancelled = new Set<number>()

/** Default batch: ~1% of the run, clamped to [200, 5000]. */
export function defaultBatch(n: number): number {
  return Math.min(5000, Math.max(200, Math.ceil(n / 100)))
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data
  if (msg.type === 'cancel') {
    cancelled.add(msg.id)
    return
  }
  const task = tasks[msg.task]
  if (!task) {
    const err: ErrorMessage = { type: 'error', id: msg.id, message: `Unknown simulation task "${msg.task}"` }
    self.postMessage(err)
    return
  }
  const rng = new Rng(msg.seed)
  const batch = Math.max(1, msg.batch ?? defaultBatch(msg.n))
  let done = 0
  let pending: number[] = []
  let lastFlush = performance.now()

  const flush = () => {
    if (pending.length === 0) return
    const out: ProgressMessage = { type: 'progress', id: msg.id, done, results: pending }
    self.postMessage(out)
    pending = []
    lastFlush = performance.now()
  }

  const step = () => {
    if (cancelled.has(msg.id)) {
      cancelled.delete(msg.id)
      return
    }
    const sliceEnd = performance.now() + SLICE_MS
    try {
      while (done < msg.n) {
        pending.push(task(rng, msg.params))
        done++
        if (pending.length >= batch || performance.now() - lastFlush >= FLUSH_MS) flush()
        if (performance.now() >= sliceEnd) break
      }
    } catch (err) {
      const e: ErrorMessage = { type: 'error', id: msg.id, message: err instanceof Error ? err.message : String(err) }
      self.postMessage(e)
      return
    }
    if (done < msg.n) setTimeout(step, 0)
    else {
      flush()
      const fin: DoneMessage = { type: 'done', id: msg.id }
      self.postMessage(fin)
    }
  }
  step()
}
