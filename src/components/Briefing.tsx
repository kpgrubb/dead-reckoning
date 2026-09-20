/**
 * <Briefing> — concept exposition panel. Intuition first, then notation, then a worked example.
 * Use the sub-blocks to keep that discipline visible: <Briefing.Intuition>, <Briefing.Definition>,
 * <Briefing.Worked>. Plain children are allowed too.
 */
import type { ReactNode } from 'react'
import { Panel } from './Panel'

export interface BriefingProps {
  title: string
  /** AP topic codes for the header status, e.g. "1.5 · 1.6". */
  topics?: string[]
  children: ReactNode
}

export function Briefing({ title, topics, children }: BriefingProps) {
  return (
    <Panel label={`BRIEFING · ${title}`} status={topics?.length ? `AP ${topics.join(' · ')}` : undefined} tone="intel" className="dr-briefing">
      {children}
    </Panel>
  )
}

function Block({ kind, title, children }: { kind: string; title: string; children: ReactNode }) {
  return (
    <div className={`dr-briefing__block dr-briefing__block--${kind}`}>
      <div className="dr-briefing__block-title">{title}</div>
      <div className="dr-briefing__block-body">{children}</div>
    </div>
  )
}

Briefing.Intuition = ({ children }: { children: ReactNode }) => <Block kind="intuition" title="INTUITION">{children}</Block>
Briefing.Definition = ({ children }: { children: ReactNode }) => <Block kind="definition" title="DEFINITION">{children}</Block>
Briefing.Worked = ({ children }: { children: ReactNode }) => <Block kind="worked" title="WORKED EXAMPLE">{children}</Block>
Briefing.Caution = ({ children }: { children: ReactNode }) => <Block kind="caution" title="COMMON ERROR">{children}</Block>
