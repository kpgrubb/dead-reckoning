/**
 * Act VIII story components — the two decisions the Act records, the tables that appear in more
 * than one module, and the checkpoint gate.
 *
 * Structural rule (beat sheet §4): decisions colour flavour text and nothing else. Neither Act VIII
 * decision changes which datasets exist, which modules run, or what any beat's answer is. The round
 * comes at either dwell length, and the Register, Ledger and Bureau file 8-03 and 8-04 run on are
 * the MET-0 snapshot in both branches.
 *
 *   act-8-02-dwell   forty seconds (fourteen hull IDs) or twelve (nine)
 *   act-8-04-send    send the IDs now, or hold them for the regression
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'
import { fmt, fmtInt } from '@/lib/stats'
import { KeyTable } from './_ui'
import { DWELL_SHORT_S, RETURNS_LONG, RETURNS_SHORT, dwellReturns, lidarBuffer } from './data'

export const DECISION_IDS = {
  dwell: 'act-8-02-dwell',
  send: 'act-8-04-send',
} as const

export function useDecision(id: string): string | undefined {
  return useProgress((s) => s.decisions[id])
}

export type Match = 'long' | 'short' | 'now' | 'hold' | 'undecided'

function matches(id: string, choice: string | undefined, is: Match): boolean {
  if (is === 'undecided') return !choice
  if (id === DECISION_IDS.dwell) {
    const short = !!choice && /twelve|12/i.test(choice)
    return is === 'short' ? short : is === 'long' ? !!choice && !short : false
  }
  if (id === DECISION_IDS.send) {
    const held = !!choice && /hold|wait|regression/i.test(choice)
    return is === 'hold' ? held : is === 'now' ? !!choice && !held : false
  }
  return false
}

/** Render children only when the recorded decision matches. */
export function Decided({ id, is, children }: { id: string; is: Match; children?: ReactNode }) {
  return matches(id, useDecision(id), is) ? <>{children}</> : null
}

/** True when the learner ordered the short dwell. Undecided reads as the long one. */
export function useShortDwell(): boolean {
  return matches(DECISION_IDS.dwell, useDecision(DECISION_IDS.dwell), 'short')
}

const WORDS: Record<number, string> = { 9: 'nine', 12: 'twelve', 14: 'fourteen' }

/**
 * How many hull IDs the buffer holds, in the branch the learner chose. Written out in words where
 * the sentence wants a word; `data.test.ts` pins both counts, so the prose cannot drift from them.
 */
export function IdCount({ words = false }: { words?: boolean }) {
  const n = useShortDwell() ? RETURNS_SHORT : RETURNS_LONG
  return <>{words ? WORDS[n] : fmtInt(n)}</>
}

/** The dwell the learner ordered, in seconds. */
export function DwellLength({ words = false }: { words?: boolean }) {
  const n = useShortDwell() ? DWELL_SHORT_S : 40
  return <>{words ? (WORDS[n] ?? String(n)) : fmtInt(n)}</>
}

/** DS-13 as the buffer wrote it: what the dwell the learner ordered actually returned. */
export function LidarBufferTable() {
  const short = useShortDwell()
  const rows = short ? dwellReturns(DWELL_SHORT_S) : lidarBuffer
  return (
    <KeyTable
      caption={`Oyelaran's buffer · ${short ? fmtInt(DWELL_SHORT_S) : '40'}-second dwell · ${fmtInt(rows.length)} hull identifications`}
      ariaLabel="Lidar buffer: hull identification, slant range, bearing, station at Kettle, and whether the Adlinda uprate is visible in the return profile"
      columns={['hull', 'range (km)', 'bearing (°)', 'state', 'uprate visible']}
      rows={rows.map((r) => [r.hull_id, fmt(r.range_km, 1), fmt(r.bearing, 3), r.state, r.refit_visible ? 'yes' : 'no'])}
    />
  )
}

/** Renders its children only once the Act VIII checkpoint has been passed. */
export function PassGate({ act = 'act-8', children, fallback }: { act?: string; children: ReactNode; fallback?: ReactNode }) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}
