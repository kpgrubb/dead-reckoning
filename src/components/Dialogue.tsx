import type { ReactNode } from 'react'
import { crewMember } from '@/content/crew'

export interface DialogueProps {
  speaker: string
  /** Override display name (e.g. an unnamed freighter captain). */
  name?: string
  /** Stage direction shown in muted text before the line. */
  aside?: string
  /** Mark as a delayed transmission (renders light-lag stamp). */
  lag?: string
  children: ReactNode
}

export function Dialogue({ speaker, name, aside, lag, children }: DialogueProps) {
  const c = crewMember(speaker)
  const display = name ?? (c.rank ? `${c.rank} ${c.name}` : c.name)
  return (
    <div className={`dr-dialogue dr-dialogue--${c.id}`} style={{ ['--speaker-accent' as string]: c.accent }}>
      <div className="dr-dialogue__speaker">
        <span className="dr-dialogue__name">{display}</span>
        {lag && <span className="dr-dialogue__lag">{lag}</span>}
      </div>
      {aside && <div className="dr-dialogue__aside">{aside}</div>}
      <div className="dr-dialogue__line">{children}</div>
    </div>
  )
}
