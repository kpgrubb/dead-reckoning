/**
 * PassGate — renders its children only after the named Act checkpoint has been passed
 * (the post-checkpoint scene, the filing at MET 80 and the Act's closing turn live behind it).
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'

export function PassGate({ act, children, fallback }: { act: string; children: ReactNode; fallback?: ReactNode }) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return fallback ? <>{fallback}</> : null
}
