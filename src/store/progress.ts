/**
 * Learner progress — persisted to localStorage. No accounts, no backend.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BeatRecord {
  passed: boolean
  attempts: number
  /** For choice beats: the option the learner chose (story may reference it later). */
  choice?: string
  at: string
}

export interface DrillRecord {
  attempts: number
  correct: number
  /** Last attempt number, so retries reseed. */
  attempt: number
}

export interface CheckpointAttempt {
  at: string
  score: number // 0–1
  passed: boolean
  /** Item ids the learner missed, mapped to the module ids to revisit. */
  missed: { itemId: string; reviewModules: string[] }[]
}

export interface ProgressState {
  /** One per install; combined with module/drill ids to seed problems. Regenerated on reset. */
  learnerSeed: number
  completed: Record<string, { at: string }>
  beats: Record<string, BeatRecord>
  drills: Record<string, DrillRecord>
  checkpoints: Record<string, { attempts: CheckpointAttempt[]; passed: boolean }>
  lastModule: string | null
  /** Story decisions the narrative can branch flavor on (not structure). */
  decisions: Record<string, string>

  markComplete: (moduleId: string) => void
  setLastModule: (moduleId: string) => void
  recordBeat: (beatId: string, passed: boolean, choice?: string) => void
  recordDrill: (drillKey: string, correct: boolean) => void
  bumpDrillAttempt: (drillKey: string) => number
  recordCheckpoint: (act: string, attempt: CheckpointAttempt) => void
  setDecision: (key: string, value: string) => void
  resetAll: () => void
}

function freshSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      learnerSeed: freshSeed(),
      completed: {},
      beats: {},
      drills: {},
      checkpoints: {},
      lastModule: null,
      decisions: {},

      markComplete: (moduleId) =>
        set((s) => (s.completed[moduleId] ? s : { completed: { ...s.completed, [moduleId]: { at: new Date().toISOString() } } })),

      setLastModule: (moduleId) => set({ lastModule: moduleId }),

      recordBeat: (beatId, passed, choice) =>
        set((s) => {
          const prev = s.beats[beatId]
          return {
            beats: {
              ...s.beats,
              [beatId]: {
                passed: passed || !!prev?.passed,
                attempts: (prev?.attempts ?? 0) + 1,
                choice: choice ?? prev?.choice,
                at: new Date().toISOString(),
              },
            },
          }
        }),

      recordDrill: (drillKey, correct) =>
        set((s) => {
          const prev = s.drills[drillKey] ?? { attempts: 0, correct: 0, attempt: 0 }
          return { drills: { ...s.drills, [drillKey]: { ...prev, attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0) } } }
        }),

      bumpDrillAttempt: (drillKey) => {
        const prev = get().drills[drillKey] ?? { attempts: 0, correct: 0, attempt: 0 }
        const next = prev.attempt + 1
        set((s) => ({ drills: { ...s.drills, [drillKey]: { ...prev, attempt: next } } }))
        return next
      },

      recordCheckpoint: (act, attempt) =>
        set((s) => {
          const prev = s.checkpoints[act] ?? { attempts: [], passed: false }
          return { checkpoints: { ...s.checkpoints, [act]: { attempts: [...prev.attempts, attempt], passed: prev.passed || attempt.passed } } }
        }),

      setDecision: (key, value) => set((s) => ({ decisions: { ...s.decisions, [key]: value } })),

      resetAll: () =>
        set({ learnerSeed: freshSeed(), completed: {}, beats: {}, drills: {}, checkpoints: {}, lastModule: null, decisions: {} }),
    }),
    { name: 'dead-reckoning:progress', version: 1 },
  ),
)

/** Selector helpers */
export const isModuleComplete = (s: ProgressState, id: string) => !!s.completed[id]
export const isBeatPassed = (s: ProgressState, id: string) => !!s.beats[id]?.passed
export const isCheckpointPassed = (s: ProgressState, act: string) => !!s.checkpoints[act]?.passed
