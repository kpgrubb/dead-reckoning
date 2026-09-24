/**
 * Act VII story components — the decisions the Act records, the checkpoint gate, and the two
 * tables that appear in more than one module.
 *
 * Structural rule (beat sheet §4): decisions colour flavour text and nothing else. No Act VII
 * decision changes which datasets exist, which modules run, or what any beat's answer is. All
 * three of act-7-07's decisions end at Kettle.
 *
 *   act-7-07-refit    accept the Halden Reach sink refit, or refuse it
 *   act-7-07-relay    send the inference brief through the tender's relay, or hold it until clear
 *   act-7-07-kettle   run for Kettle, or return to Ceres and wait for the Board
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'
import { fmt, fmtInt } from '@/lib/stats'
import { KeyTable } from './_ui'
import { MK3_SPEC_KN, refitSet, sinkRefit } from './data'

export const DECISION_IDS = {
  refit: 'act-7-07-refit',
  relay: 'act-7-07-relay',
  kettle: 'act-7-07-kettle',
} as const

export function useDecision(id: string): string | undefined {
  return useProgress((s) => s.decisions[id])
}

export type Match = 'accept' | 'refuse' | 'send' | 'hold' | 'kettle' | 'wait' | 'undecided'

function matches(id: string, choice: string | undefined, is: Match): boolean {
  if (is === 'undecided') return !choice
  if (id === DECISION_IDS.refit) {
    const refused = !!choice && /refus|decline|reject/i.test(choice)
    return is === 'refuse' ? refused : is === 'accept' ? !!choice && !refused : false
  }
  if (id === DECISION_IDS.relay) {
    const held = !!choice && /hold|wait|until clear/i.test(choice)
    return is === 'hold' ? held : is === 'send' ? !!choice && !held : false
  }
  if (id === DECISION_IDS.kettle) {
    const waited = !!choice && /wait|ceres|return/i.test(choice)
    return is === 'wait' ? waited : is === 'kettle' ? !!choice && !waited : false
  }
  return false
}

/** Render children only when the recorded decision matches. */
export function Decided({ id, is, children }: { id: string; is: Match; children?: ReactNode }) {
  return matches(id, useDecision(id), is) ? <>{children}</> : null
}

/** DS-11 as the Adlinda yard's lead fitter forwarded it — twelve hulls, refit-date order. */
export function RefitLogTable({ showDelays = true }: { showDelays?: boolean }) {
  const columns = showDelays ? ['hull', 'refit signed', `output (kN, spec ${fmtInt(MK3_SPEC_KN)})`, 'delay before (d)', 'delay after (d)'] : ['hull', 'refit signed', `output (kN, spec ${fmtInt(MK3_SPEC_KN)})`]
  return (
    <KeyTable
      caption={`Adlinda yard · Mk 3 drive uprate, 2181–83 · ${fmtInt(refitSet.length)} hulls`}
      ariaLabel="Adlinda refit log: hull, refit date, certified output after refit, and Mark-9 delay on the run before and after the uprate"
      columns={columns}
      rows={refitSet.map((h) => (showDelays ? [h.hull, h.refit_date, fmt(h.output_kN, 1), fmt(h.delay_before, 2), fmt(h.delay_after, 2)] : [h.hull, h.refit_date, fmt(h.output_kN, 1)]))}
    />
  )
}

/** DS-12 — the eight matched cold profiles Sandoval ran either side of the refit. */
export function ColdProfileTable({ profile }: { profile?: 'Quiet' | 'Watch' | 'Standby' }) {
  const rows = profile ? sinkRefit.filter((r) => r.profile === profile) : sinkRefit
  return (
    <KeyTable
      caption={`CSV Nightjar · matched cold profiles before and after the Halden Reach refit · ${fmtInt(rows.length)} runs`}
      ariaLabel="Cold profile log: run, profile, logged load, and endurance to sink saturation before and after the refit"
      columns={['run', 'profile', 'load (kW)', 'before (h)', 'after (h)']}
      rows={rows.map((r) => [r.run_id, r.profile, fmt(r.load_kW, 1), fmt(r.before_h, 2), fmt(r.after_h, 2)])}
    />
  )
}

/** Renders its children only once the Act VII checkpoint has been passed. */
export function PassGate({ act = 'act-7', children, fallback }: { act?: string; children: ReactNode; fallback?: ReactNode }) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}
