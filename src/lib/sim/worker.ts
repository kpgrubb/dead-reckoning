/**
 * Monte Carlo Web Worker (baseline). The Simulation & Stats Engine agent owns this.
 *
 * Protocol: main thread posts `{ type: 'run', id, task, params, seed, batch }`; the worker
 * replies with `{ type: 'progress', id, done, results }` chunks and finally `{ type: 'done', id }`.
 * `task` names a registered simulation in ./tasks.ts (e.g. 'sampling-means', 'ci-capture').
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
  /** Replications per progress message. */
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

const cancelled = new Set<number>()

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
  const batch = Math.max(1, msg.batch ?? 200)
  let done = 0
  const step = () => {
    if (cancelled.has(msg.id)) {
      cancelled.delete(msg.id)
      return
    }
    const results: number[] = []
    const upto = Math.min(msg.n, done + batch)
    for (; done < upto; done++) results.push(task(rng, msg.params))
    const out: ProgressMessage = { type: 'progress', id: msg.id, done, results }
    self.postMessage(out)
    if (done < msg.n) setTimeout(step, 0)
    else {
      const fin: DoneMessage = { type: 'done', id: msg.id }
      self.postMessage(fin)
    }
  }
  step()
}
