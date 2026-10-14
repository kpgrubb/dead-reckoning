/**
 * MDX component map. Every module gets these without importing. Act instruments are imported
 * explicitly inside the MDX file from '@/instruments/act-N/…'.
 */
import type { MDXComponents } from 'mdx/types'
import { Scene } from './Scene'
import { Dialogue } from './Dialogue'
import { Briefing } from './Briefing'
import { Calculator } from './Calculator'
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
import { MarkdownTable, TableScroll } from './MarkdownTable'

export const mdxComponents: MDXComponents = {
  // Intrinsic-element override: MDX routes a GFM pipe table through this, so every authored table
  // gets the horizontal scroller that component-rendered tables already have.
  table: MarkdownTable,
  // A literal <table> in JSX bypasses the map entirely (MDX compiles it to a bare jsx('table')),
  // so plugins/rehype-jsx-tables.ts renames it to this. Same component, same wrapper.
  TableScroller: MarkdownTable,
  Scene,
  Dialogue,
  Briefing,
  Calculator,
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

export { Scene, Dialogue, Briefing, Calculator, Formula, Plot, Sim, MonteCarlo, CalcBriefing, Drill, MissionBeat, Success, Failure, Outcome, Gated, LogEntry, Checkpoint, Panel, RichText, MarkdownTable, TableScroll }
export { ModuleContext, useModule } from './ModuleContext'
