/**
 * Ship's Log — accumulates <LogEntry> cards as the learner reaches them. Searchable reference.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LogEntryData {
  id: string
  moduleId: string
  act: number
  title: string
  /** Two-sentence recap, Markdown. */
  concept: string
  /** KaTeX (display mode) or empty. */
  formula?: string
  /** One common mistake, Markdown. */
  mistake?: string
  /** Search tags (AP topic codes, keywords). */
  tags?: string[]
  at: string
}

interface LogState {
  entries: Record<string, LogEntryData>
  upsert: (e: Omit<LogEntryData, 'at'>) => void
  clear: () => void
}

export const useShipLog = create<LogState>()(
  persist(
    (set) => ({
      entries: {},
      upsert: (e) =>
        set((s) => {
          const prev = s.entries[e.id]
          const same = prev && prev.concept === e.concept && prev.formula === e.formula && prev.mistake === e.mistake && prev.title === e.title
          if (same) return s
          return { entries: { ...s.entries, [e.id]: { ...e, at: prev?.at ?? new Date().toISOString() } } }
        }),
      clear: () => set({ entries: {} }),
    }),
    { name: 'dead-reckoning:log', version: 1 },
  ),
)
