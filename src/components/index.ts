/**
 * MDX component map. Every module gets these without importing. Act instruments are imported
 * explicitly inside the MDX file from '@/instruments/act-N/…'.
 */
import type { MDXComponents } from 'mdx/types'
import { Scene } from './Scene'
import { Dialogue } from './Dialogue'
import { Briefing } from './Briefing'
import { Formula } from './Formula'
import { Plot } from './Plot'
import { Sim } from './Sim'
import { MonteCarlo } from './MonteCarlo'
import { CalcBriefing } from './CalcBriefing'
import { Drill } from './Drill'
import { MissionBeat, Success, Failure, Outcome, Gated } from './MissionBeat'
import { LogEntry } from './LogEntry'
import { Checkpoint } from './Checkpoint'
import { Panel } from './Panel'
import { RichText } from './RichText'

export const mdxComponents: MDXComponents = {
  Scene,
  Dialogue,
  Briefing,
  Formula,
  Plot,
  Sim,
  MonteCarlo,
  CalcBriefing,
  Drill,
  MissionBeat,
  Success,
  Failure,
  Outcome,
  Gated,
  LogEntry,
  Checkpoint,
  Panel,
  RichText,
}

export { Scene, Dialogue, Briefing, Formula, Plot, Sim, MonteCarlo, CalcBriefing, Drill, MissionBeat, Success, Failure, Outcome, Gated, LogEntry, Checkpoint, Panel, RichText }
export { ModuleContext, useModule } from './ModuleContext'
