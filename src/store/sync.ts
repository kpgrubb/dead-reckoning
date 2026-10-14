/**
 * Sync state: the passcode (remembered per device) and the last result. Reads and writes the
 * progress and ship's-log stores, which persist themselves to localStorage as usual.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pull, push, SyncError, type SyncPayload } from '@/lib/sync'
import { useProgress } from './progress'
import { useShipLog } from './log'

export type SyncStatus = 'idle' | 'working' | 'ok' | 'error'

interface SyncState {
  /** Null until a passcode is entered on this device. */
  passcode: string | null
  lastSavedAt: string | null
  status: SyncStatus
  message: string | null
  /** Timestamp found on the remote copy at the last check, for the LOAD prompt. */
  remoteSavedAt: string | null
  /**
   * True while a saved copy exists that this device has not taken. Autosave is suppressed until it
   * clears, because the alternative is silent data loss: entering the passcode on a second device
   * and then merely navigating used to push that device's empty progress over the saved copy, with
   * one revision per passcode and no undo. Cleared by LOAD, by an explicit SAVE (the user choosing
   * to overwrite), or by `check` finding nothing remote or nothing newer than this device has.
   * Not persisted, so a rehydrated passcode starts suppressed until `check` proves it safe.
   */
  pendingRemote: boolean

  unlock: (passcode: string) => Promise<void>
  lock: () => void
  save: () => Promise<void>
  load: () => Promise<void>
  check: () => Promise<void>
}

/** Everything worth carrying between devices. Settings stay local — they are per-device. */
function snapshot(): SyncPayload {
  const p = useProgress.getState()
  return {
    v: 1,
    savedAt: new Date().toISOString(),
    progress: {
      learnerSeed: p.learnerSeed,
      completed: p.completed,
      beats: p.beats,
      drills: p.drills,
      checkpoints: p.checkpoints,
      lastModule: p.lastModule,
      decisions: p.decisions,
      consults: p.consults,
    },
    log: useShipLog.getState().entries,
  }
}

function restore(payload: SyncPayload): void {
  const p = payload.progress as Partial<ReturnType<typeof useProgress.getState>>
  if (p && typeof p === 'object') useProgress.setState(p)
  const entries = payload.log
  if (entries && typeof entries === 'object') useShipLog.setState({ entries: entries as never })
}

const describe = (e: unknown) => (e instanceof SyncError ? e.message : `Unexpected error: ${(e as Error).message}`)

export const useSync = create<SyncState>()(
  persist(
    (set, get) => ({
      passcode: null,
      lastSavedAt: null,
      status: 'idle',
      message: null,
      remoteSavedAt: null,
      pendingRemote: false,

      unlock: async (passcode) => {
        const code = passcode.trim().toUpperCase()
        if (!code) return
        set({ passcode: code, status: 'working', message: null })
        try {
          const remote = await pull(code)
          set({
            status: 'ok',
            remoteSavedAt: remote?.savedAt ?? null,
            pendingRemote: !!remote,
            message: remote ? 'Saved progress found. Press LOAD to take it; this device will not save over it until you do.' : 'No saved progress yet. SAVE writes this device’s progress.',
          })
        } catch (e) {
          set({ status: 'error', message: describe(e) })
        }
      },

      lock: () => set({ passcode: null, status: 'idle', message: null, remoteSavedAt: null, lastSavedAt: null, pendingRemote: false }),

      save: async () => {
        const code = get().passcode
        if (!code) return
        set({ status: 'working', message: null })
        const payload = snapshot()
        try {
          await push(code, payload)
          set({ status: 'ok', lastSavedAt: payload.savedAt, remoteSavedAt: payload.savedAt, pendingRemote: false, message: 'Progress saved.' })
        } catch (e) {
          set({ status: 'error', message: describe(e) })
        }
      },

      load: async () => {
        const code = get().passcode
        if (!code) return
        set({ status: 'working', message: null })
        try {
          const remote = await pull(code)
          if (!remote) {
            set({ status: 'error', message: 'Nothing saved under this passcode yet.' })
            return
          }
          restore(remote)
          set({ status: 'ok', remoteSavedAt: remote.savedAt, lastSavedAt: remote.savedAt, pendingRemote: false, message: 'Progress loaded from the saved copy.' })
        } catch (e) {
          set({ status: 'error', message: describe(e) })
        }
      },

      check: async () => {
        const code = get().passcode
        if (!code) return
        try {
          const remote = await pull(code)
          const seen = get().lastSavedAt
          // Safe to autosave when there is nothing remote, or nothing newer than this device holds.
          const stale = !remote || (!!seen && remote.savedAt <= seen)
          set({ remoteSavedAt: remote?.savedAt ?? null, pendingRemote: !stale })
        } catch {
          /* a failed background check leaves autosave suppressed, which is the safe direction */
        }
      },
    }),
    {
      name: 'dead-reckoning:sync',
      version: 1,
      partialize: (s) => ({ passcode: s.passcode, lastSavedAt: s.lastSavedAt }),
    },
  ),
)
