/**
 * <DecisionEcho beat="act-1-03-trust" option="Trust Oyelaran">…</DecisionEcho> — renders its children
 * only when the learner's recorded decision for that beat matches `option` (or, with `negate`, when it
 * does not). While the beat is still undecided nothing renders at all, so a later module can debrief
 * an earlier call without spoiling it or assuming it was made.
 *
 * Used by act-1-07 to answer the act-1-03 decision `act-1-03-trust`
 * ("Trust the class table" | "Trust Oyelaran").
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'

export interface DecisionEchoProps {
  /** The decision beat's id, e.g. "act-1-03-trust". */
  beat: string
  /** The option string to match, exactly as the beat declared it. */
  option: string
  /** Invert the match: render when the learner chose anything else. */
  negate?: boolean
  children: ReactNode
}

export function DecisionEcho({ beat, option, negate = false, children }: DecisionEchoProps) {
  const chosen = useProgress((s) => s.decisions[beat])
  // Undecided: say nothing. The learner has not made this call yet.
  if (chosen === undefined) return null
  const matches = chosen === option
  if (negate ? matches : !matches) return null
  return <>{children}</>
}
