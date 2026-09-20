/**
 * <Sim> — frame for an interactive instrument: parameter controls, run/step/reset, seed display.
 * Instrument Builders compose their own visualization inside via render props. This baseline gives
 * the chrome + seed plumbing so every instrument looks and behaves the same.
 *
 * Usage (in an instrument component):
 *   <Sim label="SENSOR ARRAY · PING SIMULATOR" seedKey="act-4-03/pings" controls={<…/>}
 *        onRun={(rng) => …} onStep={(rng) => …} onReset={() => …}>
 *     {(state) => <MyChart … />}
 *   </Sim>
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Rng, seedFrom } from '@/lib/rng'
import { useProgress } from '@/store/progress'
import { useModule } from './ModuleContext'
import { Panel, type PanelTone } from './Panel'

export interface SimState {
  rng: Rng
  seed: number
  runs: number
}

export interface SimProps {
  label: string
  /** Stable key mixed with the learner seed; changing it changes the data. */
  seedKey: string
  tone?: PanelTone
  controls?: ReactNode
  /** Called with a fresh Rng on Run. Return value ignored; update your own state. */
  onRun?: (rng: Rng, state: SimState) => void
  onStep?: (rng: Rng, state: SimState) => void
  onReset?: () => void
  runLabel?: string
  stepLabel?: string
  hideStep?: boolean
  hideRun?: boolean
  /** Accessible summary of the current display, updated by the instrument (aria-live). */
  liveText?: string
  children: ReactNode | ((state: SimState) => ReactNode)
}

export function Sim({ label, seedKey, tone = 'sensor', controls, onRun, onStep, onReset, runLabel = 'RUN', stepLabel = 'STEP', hideStep, hideRun, liveText, children }: SimProps) {
  const learnerSeed = useProgress((s) => s.learnerSeed)
  const { meta } = useModule()
  const [generation, setGeneration] = useState(0)
  const [runs, setRuns] = useState(0)

  const seed = useMemo(() => seedFrom(learnerSeed, meta.id, seedKey, generation), [learnerSeed, meta.id, seedKey, generation])
  const rng = useMemo(() => new Rng(seed), [seed])
  const state: SimState = { rng, seed, runs }

  const run = useCallback(() => {
    onRun?.(rng, state)
    setRuns((r) => r + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRun, rng, runs])
  const step = useCallback(() => {
    onStep?.(rng, state)
    setRuns((r) => r + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onStep, rng, runs])
  const reset = useCallback(() => {
    setGeneration((g) => g + 1)
    setRuns(0)
    onReset?.()
  }, [onReset])

  return (
    <Panel label={label} status={`SEED ${seed.toString(16).toUpperCase().padStart(8, '0')}`} tone={tone} className="dr-sim">
      {controls && <div className="dr-sim__controls">{controls}</div>}
      <div className="dr-sim__stage">{typeof children === 'function' ? children(state) : children}</div>
      <div className="dr-sim__bar">
        {!hideRun && (
          <button type="button" className="dr-btn dr-btn--primary" onClick={run}>
            {runLabel}
          </button>
        )}
        {!hideStep && onStep && (
          <button type="button" className="dr-btn" onClick={step}>
            {stepLabel}
          </button>
        )}
        <button type="button" className="dr-btn dr-btn--ghost" onClick={reset}>
          RESET · NEW SEED
        </button>
        <span className="dr-sim__runs">{runs > 0 ? `${runs} run${runs === 1 ? '' : 's'}` : ''}</span>
      </div>
      {liveText !== undefined && (
        <p className="visually-hidden" aria-live="polite">
          {liveText}
        </p>
      )}
    </Panel>
  )
}
