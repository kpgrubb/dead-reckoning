/**
 * Crew roster used by <Dialogue speaker="…">. Names, ranks and voice notes are canonical per
 * docs/story-bible.md §4 (crew), §5 (protagonist), §6 (antagonists). Keys are stable role ids so
 * Act Teams write dialogue against roles; the display name comes from here.
 *
 * Ship: CSV Nightjar (CX-1), Compact Orbital Service, the Galilean Compact.
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
  you: {
    id: 'you',
    name: 'Anselm Rook',
    rank: 'CDR',
    role: 'Commanding officer, CSV Nightjar',
    voice: 'Second person; never quoted directly except in orders and log entries. Institutionalist; notices gauges, hands, timestamps.',
    accent: 'var(--dr-fg-0)',
  },
  xo: {
    id: 'xo',
    name: 'Tamsin Ferrier',
    rank: 'LCDR',
    role: 'Executive officer',
    voice: 'The null hypothesis embodied. Short declaratives; "the data says" / "we don\'t know"; never "I think". Asks what you would expect if you were wrong. "Say it back to me."',
    accent: 'var(--dr-cyan)',
  },
  sensors: {
    id: 'sensors',
    name: 'Dagny Oyelaran',
    rank: 'LT',
    role: 'Sensor officer',
    voice: 'Over-trusts instruments. Units first, meaning second; "confirmed" for things not confirmed; calls the telescopes "the Eyes". Quieter as data gets stranger. Dies Act VIII (MET 181).',
    accent: 'var(--dr-phosphor)',
  },
  analyst: {
    id: 'analyst',
    name: 'Cassius Ebele',
    rank: 'ENS',
    role: 'Intelligence analyst',
    voice: 'Young, fast, complete sentences with numbers in them; starts explanations with "So". Makes sampling errors, owns them, fixes them. By Act VII asks "what\'s the sampling frame?" first.',
    accent: 'var(--dr-violet)',
  },
  engineer: {
    id: 'engineer',
    name: 'Marguerite Sandoval',
    rank: 'CPO',
    role: 'Chief engineer',
    voice: 'Never a number without its plus-or-minus. "The cellar" (sink), "the wings" (radiators). Heat is a debt. Blunt in private, formal on deck; calls you "Skipper" when alone.',
    accent: 'var(--dr-amber)',
  },
  comms: {
    id: 'comms',
    name: 'Kiran Solberg',
    rank: 'LTJG',
    role: 'Communications and signals',
    voice: 'Light-lag literalist. Announces every transmission with its lag and timestamp; reads messages verbatim; no contractions on deck. Calls the Board "Valhalla". Dry humour about time only.',
    accent: 'var(--dr-steel)',
  },
  medic: {
    id: 'medic',
    name: 'Aldo Ferrante',
    rank: 'LT',
    role: 'Ship\'s surgeon',
    voice: 'Dry; physical detail before judgement; never says "fine". Speaks in base rates. Second person to you off the record. States each death once, plainly.',
    accent: 'var(--dr-fg-1)',
  },
  admiralty: {
    id: 'admiralty',
    name: 'The Board, Valhalla',
    rank: '',
    role: 'Admiralty Board (transmissions, signed by the Flag Secretary)',
    voice: 'Formal, delayed (≥43 min round trip), evasive. Passive voice; "It is noted that…"; "The Board directs"; never "loss", always "incident". Praise is a warning.',
    accent: 'var(--dr-alert)',
  },
  ashbyhale: {
    id: 'ashbyhale',
    name: 'Corvin Ashby-Hale',
    rank: 'RADM',
    role: 'Director of Lane Operations; author of PROVIDENT',
    voice: 'First person, warm, as a man who taught you. Never raises his voice. Speaks of the Directorate Problem as settled fact. Does not mention the four. "I did not ask."',
    accent: 'var(--dr-warn)',
  },
  marsh: {
    id: 'marsh',
    name: 'Yevgenia Marsh',
    rank: 'Master',
    role: 'Master, independent hauler Thessaly Dawn',
    voice: 'Belt-plain, profane, precise about her own ship, contemptuous of paperwork. Her brother died on Thessaly Ember. Asks what you are going to do.',
    accent: 'var(--dr-fg-2)',
  },
  brandt: {
    id: 'brandt',
    name: 'Odile Brandt',
    rank: 'Sr. Examiner',
    role: 'Bureau of Hulls and Cargo, Uruk High',
    voice: 'Civil servant, sixty, exact. Speaks of the Bureau\'s stamp as the one honest thing on the Lane. Sends the Act IX fuel file on her own authority.',
    accent: 'var(--dr-steel)',
  },
  // Secondary recurring voices (bible §6, §8). Use <Dialogue name="…"> for one-off speakers.
  ostrow: {
    id: 'ostrow',
    name: 'Lucan Ostrow',
    rank: 'CAPT',
    role: 'Lane Liaison Officer, Uruk office; PROVIDENT\'s field hand',
    voice: 'Correct, cordial, always one rank above you in the room. Cites procedure by number. Never says "loss"; says "diversion" once, by accident, in Act VII.',
    accent: 'var(--dr-alert-dim)',
  },
  lindqvist: {
    id: 'lindqvist',
    name: 'Petra Lindqvist-Oduya',
    rank: 'CDR',
    role: 'CO, tender CSV Halden Reach',
    voice: 'Follows lawful orders and keeps her own log. Short, professional, no warmth until she has read your numbers herself.',
    accent: 'var(--dr-cyan)',
  },
  renn: {
    id: 'renn',
    name: 'Renn',
    rank: 'Adjuster',
    role: 'Tharsis Mutual (Mars), Ceres office',
    voice: 'Martian insurer. Talks in payouts and probabilities; offers the claims register because Tharsis wants its money back, and says so.',
    accent: 'var(--dr-warn)',
  },
  okafor: {
    id: 'okafor',
    name: 'Nnamdi Okafor-Reyes',
    rank: 'Investigator',
    role: 'Lane Authority, Ceres office',
    voice: 'Careful, through channels, slower than you want. Knows his predecessor was reassigned for asking. Every sentence has a file reference.',
    accent: 'var(--dr-steel)',
  },
  achterberg: {
    id: 'achterberg',
    name: 'Seren Achterberg',
    rank: 'VADM',
    role: 'Service Inspectorate',
    voice: 'One-sentence transmissions. Asks which findings would survive a hostile review. Praise is a single unsigned line.',
    accent: 'var(--dr-fg-0)',
  },
  maalouf: {
    id: 'maalouf',
    name: 'Ines Maalouf',
    rank: 'CDRE',
    role: 'Flag Secretary to the Board, Valhalla',
    voice: 'Signs the Board\'s transmissions; her own messages are two lines and unsigned. Becomes the channel to the Inspectorate if copied.',
    accent: 'var(--dr-alert)',
  },
  halvorsen: {
    id: 'halvorsen',
    name: 'Halvorsen',
    rank: 'PO',
    role: 'Sensor watch (Oyelaran\'s second; runs the board after Act VIII)',
    voice: 'Reads the board exactly as trained. Does not sit in her chair. Says "contact" where Oyelaran said "confirmed".',
    accent: 'var(--dr-phosphor-dim)',
  },
}

export function crewMember(id: string): CrewMember {
  return CREW[id] ?? { id, name: id, rank: '', role: '', voice: '', accent: 'var(--dr-fg-1)' }
}
