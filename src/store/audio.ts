/**
 * Ambient audio — playlist state, persisted. Playback itself never persists (browsers block
 * autoplay), so `playing` is excluded from storage and is always false on first load.
 *
 * Roles: 'ambient' tracks are the normal skip/loop rotation. The single 'checkpoint' track
 * ("General Quarters") is auto-selected while a checkpoint module is open (see enterCheckpoint /
 * leaveCheckpoint, called from ModulePage) and otherwise only plays if the learner picks it in
 * Settings. A manual skip/select during a checkpoint wins: we never yank the track back.
 *
 * Tracks ship with the static build from public/audio/. To add or swap a track, drop the mp3 in
 * public/audio/ and add an entry to TRACKS (see README.md).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TrackRole = 'ambient' | 'checkpoint'

export interface Track {
  id: string
  title: string
  /** Path relative to the app base (public/audio/…). */
  file: string
  role: TrackRole
}

export const TRACKS: Track[] = [
  { id: 'running-cold', title: 'Running Cold', file: 'audio/running-cold.mp3', role: 'ambient' },
  { id: 'ceres-approach', title: 'Ceres Approach', file: 'audio/ceres-approach.mp3', role: 'ambient' },
  { id: 'general-quarters', title: 'General Quarters', file: 'audio/general-quarters.mp3', role: 'checkpoint' },
]

export const AMBIENT_INDICES = TRACKS.map((t, i) => (t.role === 'ambient' ? i : -1)).filter((i) => i >= 0)
export const CHECKPOINT_INDEX = TRACKS.findIndex((t) => t.role === 'checkpoint')

export function trackSrc(t: Track): string {
  return `${import.meta.env.BASE_URL}${t.file}`.replace(/\/{2,}/g, '/')
}

export interface AudioState {
  /** Whether the player strip is shown at all (Settings). */
  enabled: boolean
  /** Auto-switch to the checkpoint track while a checkpoint module is open (Settings). */
  checkpointSwitch: boolean
  trackIndex: number
  playing: boolean
  /** 0–1 */
  volume: number
  muted: boolean
  // --- transient (not persisted) ---
  /** True while a checkpoint module is open. */
  inCheckpoint: boolean
  /** Ambient track to restore when the checkpoint closes; null when nothing to restore. */
  returnTrackIndex: number | null
  /** Learner skipped/selected during this checkpoint — do not restore on leave. */
  manualOverride: boolean

  play: () => void
  pause: () => void
  toggle: () => void
  /** Next ambient track. `manual` marks a learner action (default true); the 'ended' handler passes false. */
  next: (manual?: boolean) => void
  prev: () => void
  setTrack: (index: number) => void
  setVolume: (v: number) => void
  setMuted: (m: boolean) => void
  setEnabled: (e: boolean) => void
  setCheckpointSwitch: (on: boolean) => void
  enterCheckpoint: () => void
  leaveCheckpoint: () => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

function ambientNeighbor(current: number, dir: 1 | -1): number {
  if (AMBIENT_INDICES.length === 0) return current
  const pos = AMBIENT_INDICES.indexOf(current)
  if (pos < 0) return AMBIENT_INDICES[0]
  return AMBIENT_INDICES[(pos + dir + AMBIENT_INDICES.length) % AMBIENT_INDICES.length]
}

export const useAudio = create<AudioState>()(
  persist(
    (set, get) => ({
      enabled: true,
      checkpointSwitch: true,
      trackIndex: 0,
      playing: false,
      volume: 0.5,
      muted: false,
      inCheckpoint: false,
      returnTrackIndex: null,
      manualOverride: false,

      play: () => set({ playing: true }),
      pause: () => set({ playing: false }),
      toggle: () => set({ playing: !get().playing }),
      next: (manual = true) => {
        const s = get()
        set({ trackIndex: ambientNeighbor(s.trackIndex, 1), manualOverride: s.manualOverride || (manual && s.inCheckpoint) })
      },
      prev: () => {
        const s = get()
        set({ trackIndex: ambientNeighbor(s.trackIndex, -1), manualOverride: s.manualOverride || s.inCheckpoint })
      },
      setTrack: (index) => {
        const s = get()
        const i = ((index % TRACKS.length) + TRACKS.length) % TRACKS.length
        set({ trackIndex: i, manualOverride: s.manualOverride || s.inCheckpoint })
      },
      setVolume: (v) => set({ volume: clamp01(v), muted: clamp01(v) === 0 ? get().muted : false }),
      setMuted: (m) => set({ muted: m }),
      setEnabled: (e) => set(e ? { enabled: true } : { enabled: false, playing: false }),
      setCheckpointSwitch: (on) => set({ checkpointSwitch: on }),

      enterCheckpoint: () => {
        const s = get()
        if (s.inCheckpoint) return
        if (!s.enabled || !s.checkpointSwitch || CHECKPOINT_INDEX < 0 || s.trackIndex === CHECKPOINT_INDEX) {
          set({ inCheckpoint: true, returnTrackIndex: null, manualOverride: false })
          return
        }
        // Pre-select (or switch to) General Quarters; playing state is left exactly as it was.
        set({ inCheckpoint: true, returnTrackIndex: s.trackIndex, manualOverride: false, trackIndex: CHECKPOINT_INDEX })
      },
      leaveCheckpoint: () => {
        const s = get()
        if (!s.inCheckpoint) return
        const restore = !s.manualOverride && s.returnTrackIndex !== null && s.trackIndex === CHECKPOINT_INDEX
        set({ inCheckpoint: false, returnTrackIndex: null, manualOverride: false, ...(restore ? { trackIndex: s.returnTrackIndex! } : {}) })
      },
    }),
    {
      name: 'dead-reckoning:audio',
      version: 2,
      partialize: (s) => ({ enabled: s.enabled, checkpointSwitch: s.checkpointSwitch, trackIndex: s.trackIndex, volume: s.volume, muted: s.muted }),
      migrate: (persisted) => ({ checkpointSwitch: true, ...(persisted as object) }) as AudioState,
    },
  ),
)

export const currentTrack = (s: Pick<AudioState, 'trackIndex'>): Track => TRACKS[s.trackIndex] ?? TRACKS[0]
