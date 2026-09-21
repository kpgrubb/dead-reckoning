/**
 * Act IV story-state components — the agency ledger's Act IV rows, rendered.
 *
 *   PassGate        children only after the Act IV checkpoint has been passed
 *   DecisionAside   children only when an earlier decision matched
 *   ProfileEcho     branches on the act-4-05 Watch / Quiet decision
 *   LoiterEcho      branches on the act-4-06 near / middle / far decision
 *   LoiterFigure    the chosen loiter point's numbers, inline in prose
 *
 * Structural rule (bible §10): **no hard branches.** A decision changes flavour text, the register
 * of later scenes and who says what — never which datasets exist or which Acts occur.
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'
import { fmt, fmtPct } from '@/lib/stats'
import { DEFAULT_LOITER, loiterFromDecision, profileFromDecision, type LoiterOption } from './data'

/** Renders its children only after the named Act checkpoint has been passed. */
export function PassGate({ act = 'act-4', children, fallback }: { act?: string; children: ReactNode; fallback?: ReactNode }) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}

/**
 * Flavour text keyed on an earlier recorded decision. Renders `children` only when some decision
 * whose id starts with `beat` has a value containing `match` (case-insensitive).
 */
export function DecisionAside({ beat, match, children }: { beat: string; match: string; children: ReactNode }) {
  const decisions = useProgress((s) => s.decisions)
  const needle = match.toLowerCase()
  const hit = Object.entries(decisions).some(([id, value]) => id.startsWith(beat) && String(value).toLowerCase().includes(needle))
  return hit ? <>{children}</> : null
}

/** Read the recorded value of the first decision whose id starts with `prefix`. */
function decisionValue(decisions: Record<string, unknown>, prefix: string): string | undefined {
  for (const [id, value] of Object.entries(decisions)) if (id.startsWith(prefix)) return String(value)
  return undefined
}

/**
 * The cold profile the learner set in act-4-05. Watch is the book's default: Quiet hides but cannot
 * hold a plume's vector, and 4-10's beat fails on it with Oyelaran's debrief and a retry on Watch.
 */
export function useColdProfile(): 'watch' | 'quiet' {
  const decisions = useProgress((s) => s.decisions)
  return profileFromDecision(decisionValue(decisions, 'act-4-05-profile'))
}

/** The loiter point the learner chose in act-4-06 (middle by default). */
export function useLoiterPoint(): LoiterOption {
  const decisions = useProgress((s) => s.decisions)
  return loiterFromDecision(decisionValue(decisions, 'act-4-06-point'))
}

/** Branch flavour text on the 4-05 profile. */
export function ProfileEcho({ watch, quiet }: { watch: ReactNode; quiet: ReactNode }) {
  return <>{useColdProfile() === 'quiet' ? quiet : watch}</>
}

/** Branch flavour text on the 4-06 loiter point. */
export function LoiterEcho({ near, middle, far }: { near?: ReactNode; middle?: ReactNode; far?: ReactNode }) {
  const band = useLoiterPoint().band
  if (band === 'near') return <>{near ?? middle ?? null}</>
  if (band === 'far') return <>{far ?? middle ?? null}</>
  return <>{middle ?? null}</>
}

export type LoiterField = 'label' | 'meanHours' | 'sdHours' | 'pSaturate' | 'pPerrineInRange' | 'pSeenCold' | 'closePasses'

/**
 * One of the chosen loiter point's numbers, formatted for prose:
 * `<LoiterFigure field="closePasses" />` → "4".
 */
export function LoiterFigure({ field, digits }: { field: LoiterField; digits?: number }) {
  const o = useLoiterPoint()
  switch (field) {
    case 'label':
      return <>{o.label}</>
    case 'meanHours':
      return <>{fmt(o.meanHours, digits ?? 0)}</>
    case 'sdHours':
      return <>{fmt(o.sdHours, digits ?? 0)}</>
    case 'pSaturate':
      return <>{fmtPct(o.pSaturate, digits ?? 1)}</>
    case 'pPerrineInRange':
      return <>{fmtPct(o.pPerrineInRange, digits ?? 0)}</>
    case 'pSeenCold':
      return <>{fmtPct(o.pSeenCold, digits ?? 1)}</>
    case 'closePasses':
      return <>{o.closePasses}</>
  }
}

/** The band the learner is loitering at, for tests and for prose that only needs the word. */
export const DEFAULT_LOITER_BAND = DEFAULT_LOITER
