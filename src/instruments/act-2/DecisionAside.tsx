/**
 * DecisionAside — flavour text keyed on an earlier recorded decision.
 * Renders `children` only when some decision whose id starts with `beat` has a value that contains
 * `match` (case-insensitive); otherwise nothing. No Panel, no chrome.
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'

export interface DecisionAsideProps {
  /** Prefix of the decision id (e.g. "act-1-checkpoint"). */
  beat: string
  /** Substring the recorded choice must contain, case-insensitive (e.g. "hold"). */
  match: string
  children: ReactNode
}

export function DecisionAside({ beat, match, children }: DecisionAsideProps) {
  const decisions = useProgress((s) => s.decisions)
  const needle = match.toLowerCase()
  const hit = Object.entries(decisions).some(([id, value]) => id.startsWith(beat) && String(value).toLowerCase().includes(needle))
  return hit ? <>{children}</> : null
}
