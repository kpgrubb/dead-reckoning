/**
 * <CheckpointGate act="act-1">…</CheckpointGate> — renders its children only once the named Act
 * checkpoint has been passed (progress store). Used by checkpoint modules to unseal the post-pass
 * scene and decision beat. Renders a sealed notice otherwise.
 */
import type { ReactNode } from 'react'
import { useProgress } from '@/store/progress'

export interface CheckpointGateProps {
  act: string
  children: ReactNode
}

export function CheckpointGate({ act, children }: CheckpointGateProps) {
  const passed = useProgress((s) => !!s.checkpoints[act]?.passed)
  if (passed) return <>{children}</>
  return (
    <div className="dr-gated" aria-live="polite">
      <span className="dr-gated__tag">SEALED</span> Pass the read-through above to continue.
    </div>
  )
}
