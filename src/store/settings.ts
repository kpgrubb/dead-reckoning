/**
 * Learner settings — persisted. Applied to <html> as data-attributes / CSS variables by
 * `applySettings()` so CSS and instruments can react without prop drilling.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TextSize = 'sm' | 'md' | 'lg' | 'xl'
export type Motion = 'system' | 'full' | 'reduced'
export type Theme = 'default' | 'high-contrast'
export type StoryDensity = 'full' | 'condensed'

export interface SettingsState {
  textSize: TextSize
  motion: Motion
  theme: Theme
  storyDensity: StoryDensity
  /** When true, modules unlock only after prerequisites are complete. */
  strictGating: boolean
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void
}

const TEXT_SCALE: Record<TextSize, number> = { sm: 0.9, md: 1, lg: 1.15, xl: 1.3 }

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      textSize: 'md',
      motion: 'system',
      theme: 'default',
      storyDensity: 'full',
      strictGating: true,
      set: (patch) => set(patch),
    }),
    { name: 'dead-reckoning:settings', version: 1 },
  ),
)

export function applySettings(s: Pick<SettingsState, 'textSize' | 'motion' | 'theme' | 'storyDensity'>) {
  const html = document.documentElement
  html.style.setProperty('--dr-text-scale', String(TEXT_SCALE[s.textSize]))
  html.dataset.theme = s.theme
  html.dataset.motion = s.motion === 'system' ? '' : s.motion
  html.dataset.density = s.storyDensity
}

/** True when animations should be skipped (setting or OS preference). */
export function prefersReducedMotion(motion: Motion): boolean {
  if (motion === 'reduced') return true
  if (motion === 'full') return false
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
