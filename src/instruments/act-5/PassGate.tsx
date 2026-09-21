/**
 * PassGate — renders its children only after the named Act checkpoint has been passed. Act V's
 * closing turn (the torch order, the Ceres decision and the Act log entry) lives behind it, so the
 * learner reaches Ceres only after telling Ferrier what noise looks like.
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'

export function PassGate({ act, children, fallback }: { act: string; children: ReactNode; fallback?: ReactNode }) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}
