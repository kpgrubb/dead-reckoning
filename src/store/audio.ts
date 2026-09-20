/**
 * Ambient audio — playlist state, persisted. Playback itself never persists (browsers block
 * autoplay), so `playing` is excluded from storage and is always false on first load.
 *
 * Tracks ship with the static build from public/audio/. To add or swap a track, drop the mp3 in
 * public/audio/ and add an entry to TRACKS (see README.md).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Track {
  id: string
  title: string
  /** Path relative to the app base (public/audio/…). */
  file: string
}

export const TRACKS: Track[] = [
  { id: 'running-cold', title: 'Running Cold', file: 'audio/running-cold.mp3' },
  { id: 'ceres-approach', title: 'Ceres Approach', file: 'audio/ceres-approach.mp3' },
]

export function trackSrc(t: Track): string {
  return `${import.meta.env.BASE_URL}${t.file}`.replace(/\/{2,}/g, '/')
}

export interface AudioState {
  /** Whether the player strip is shown at all (Settings). */
  enabled: boolean
  trackIndex: number
  playing: boolean
  /** 0–1 */
  volume: number
  muted: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  setTrack: (index: number) => void
  setVolume: (v: number) => void
  setMuted: (m: boolean) => void
  setEnabled: (e: boolean) => void
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const useAudio = create<AudioState>()(
  persist(
    (set, get) => ({
      enabled: true,
      trackIndex: 0,
      playing: false,
      volume: 0.5,
      muted: false,
      play: () => set({ playing: true }),
      pause: () => set({ playing: false }),
      toggle: () => set({ playing: !get().playing }),
      next: () => set({ trackIndex: (get().trackIndex + 1) % TRACKS.length }),
      prev: () => set({ trackIndex: (get().trackIndex - 1 + TRACKS.length) % TRACKS.length }),
      setTrack: (index) => set({ trackIndex: ((index % TRACKS.length) + TRACKS.length) % TRACKS.length }),
      setVolume: (v) => set({ volume: clamp01(v), muted: clamp01(v) === 0 ? get().muted : false }),
      setMuted: (m) => set({ muted: m }),
      setEnabled: (e) => set(e ? { enabled: true } : { enabled: false, playing: false }),
    }),
    {
      name: 'dead-reckoning:audio',
      version: 1,
      partialize: (s) => ({ enabled: s.enabled, trackIndex: s.trackIndex, volume: s.volume, muted: s.muted }),
    },
  ),
)

export const currentTrack = (s: Pick<AudioState, 'trackIndex'>): Track => TRACKS[s.trackIndex] ?? TRACKS[0]
