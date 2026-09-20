/**
 * Crew roster used by <Dialogue speaker="…">. PLACEHOLDER — the Story Architect replaces names,
 * ranks and voice notes in docs/story-bible.md and updates this file to match. Keys are stable
 * role ids so Act Teams can write dialogue before names are final.
 */
export interface CrewMember {
  id: string
  name: string
  rank: string
  role: string
  /** Short voice note for writers (never displayed). */
  voice: string
  /** CSS accent token for the speaker tag. */
  accent: string
}

export const CREW: Record<string, CrewMember> = {
  you: { id: 'you', name: 'Commander', rank: 'CDR', role: 'Commanding officer', voice: 'Second person; never quoted directly except in orders.', accent: 'var(--dr-fg-0)' },
  xo: { id: 'xo', name: 'XO', rank: 'LCDR', role: 'Executive officer', voice: 'Questions your calls; precise; loyal.', accent: 'var(--dr-cyan)' },
  sensors: { id: 'sensors', name: 'Sensors', rank: 'LT', role: 'Sensor officer', voice: 'Over-trusts instruments; states readings as facts.', accent: 'var(--dr-phosphor)' },
  analyst: { id: 'analyst', name: 'Analyst', rank: 'ENS', role: 'Intelligence analyst', voice: 'Young, quick, makes sampling errors; learns.', accent: 'var(--dr-violet)' },
  engineer: { id: 'engineer', name: 'Chief', rank: 'CPO', role: 'Chief engineer', voice: 'Speaks in margins of error and heat budgets.', accent: 'var(--dr-amber)' },
  comms: { id: 'comms', name: 'Comms', rank: 'LTJG', role: 'Communications / signals', voice: 'Light-lag literalist; counts minutes.', accent: 'var(--dr-steel)' },
  medic: { id: 'medic', name: 'Doc', rank: 'LT', role: 'Ship’s surgeon', voice: 'Dry; reads people the way sensors read hulls.', accent: 'var(--dr-fg-1)' },
  admiralty: { id: 'admiralty', name: 'Admiralty', rank: '', role: 'Higher command (transmissions)', voice: 'Formal, delayed, evasive.', accent: 'var(--dr-alert)' },
}

export function crewMember(id: string): CrewMember {
  return CREW[id] ?? { id, name: id, rank: '', role: '', voice: '', accent: 'var(--dr-fg-1)' }
}
