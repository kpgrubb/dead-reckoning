/**
 * Act IX story components — the two decisions the Act records, and the checkpoint gate.
 *
 * Structural rule (beat sheet §4): decisions colour flavour text and nothing else. Neither Act IX
 * decision changes which datasets exist, which modules run, or what any beat's answer is. The
 * Inspectorate convenes in every branch; Lindqvist-Oduya's refusal covers both answers to Ostrow.
 *
 *   act-9-04-delivery   Board only · Inspectorate and Board · everyone
 *   act-9-04-cores      transfer under protest · refuse
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'

export const DECISION_IDS = {
  delivery: 'act-9-04-delivery',
  cores: 'act-9-04-cores',
} as const

export function useDecision(id: string): string | undefined {
  return useProgress((s) => s.decisions[id])
}

export type Match = 'board' | 'inspectorate' | 'broadcast' | 'transfer' | 'refuse' | 'undecided'

function matches(id: string, choice: string | undefined, is: Match): boolean {
  if (is === 'undecided') return !choice
  if (!choice) return false
  if (id === DECISION_IDS.delivery) {
    if (/authority|tharsis|everyone|broadcast/i.test(choice)) return is === 'broadcast'
    if (/inspectorate/i.test(choice)) return is === 'inspectorate'
    return is === 'board'
  }
  if (id === DECISION_IDS.cores) {
    const refused = /refuse|decline|will not/i.test(choice)
    return is === 'refuse' ? refused : is === 'transfer' ? !refused : false
  }
  return false
}

/** Render children only when the recorded decision matches. */
export function Decided({ id, is, children }: { id: string; is: Match; children?: ReactNode }) {
  return matches(id, useDecision(id), is) ? <>{children}</> : null
}

/** True when the learner sent the brief to the Inspectorate as well as the Board (or wider). */
export function useSentWide(): boolean {
  const choice = useDecision(DECISION_IDS.delivery)
  return matches(DECISION_IDS.delivery, choice, 'inspectorate') || matches(DECISION_IDS.delivery, choice, 'broadcast')
}

/** Renders its children only once the Act IX checkpoint has been passed. */
export function PassGate({ act = 'act-9', children, fallback }: { act?: string; children: ReactNode; fallback?: ReactNode }) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}
