/**
 * <Scene> — narrative block. Second person, present tense. Optional HUD framing (time, location,
 * ship status) and a `condensed` summary used when the learner sets story density to "condensed".
 */
import type { ReactNode } from 'react'
import { useSettings } from '@/store/settings'

export interface SceneProps {
  /** Mission clock stamp shown in the frame, e.g. "MET 014:22:07". */
  stamp?: string
  /** Location line, e.g. "Callisto departure corridor · 0.31 AU from Jupiter". */
  location?: string
  /** One-to-three sentence summary shown instead of the full scene in condensed mode. */
  condensed?: string
  /** Visual treatment. */
  variant?: 'default' | 'log' | 'transmission' | 'memory'
  children: ReactNode
}

export function Scene({ stamp, location, condensed, variant = 'default', children }: SceneProps) {
  const density = useSettings((s) => s.storyDensity)
  const showCondensed = density === 'condensed' && condensed
  return (
    <section className={`dr-scene dr-scene--${variant}`} aria-label="Scene">
      {(stamp || location) && (
        <div className="dr-scene__frame" aria-hidden="true">
          {stamp && <span className="dr-scene__stamp">{stamp}</span>}
          {location && <span className="dr-scene__location">{location}</span>}
        </div>
      )}
      {showCondensed ? (
        <p className="dr-scene__condensed">
          <span className="dr-scene__condensed-tag">SUMMARY</span> {condensed}
        </p>
      ) : (
        <div className="dr-scene__prose">{children}</div>
      )}
    </section>
  )
}
