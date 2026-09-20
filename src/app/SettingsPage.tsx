import { useSettings, type Motion, type StoryDensity, type TextSize, type Theme } from '@/store/settings'
import { useProgress } from '@/store/progress'
import { useShipLog } from '@/store/log'
import { useAudio, TRACKS } from '@/store/audio'

function Radio<T extends string>({ name, value, options, onChange }: { name: string; value: T; options: { v: T; label: string; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset className="dr-choices">
      <legend className="dr-field__label">{name}</legend>
      {options.map((o) => (
        <label key={o.v} className="dr-choice">
          <input type="radio" name={name} checked={value === o.v} onChange={() => onChange(o.v)} />
          <span>
            {o.label}
            {o.hint && <span className="dr-muted"> — {o.hint}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

export function SettingsPage() {
  const s = useSettings()
  const resetAll = useProgress((p) => p.resetAll)
  const learnerSeed = useProgress((p) => p.learnerSeed)
  const clearLog = useShipLog((l) => l.clear)
  const audio = useAudio()
  return (
    <div className="dr-settings">
      <h1 className="dr-map__title">Settings</h1>
      <Radio<TextSize> name="Text size" value={s.textSize} onChange={(v) => s.set({ textSize: v })} options={[{ v: 'sm', label: 'Small' }, { v: 'md', label: 'Standard' }, { v: 'lg', label: 'Large' }, { v: 'xl', label: 'Extra large' }]} />
      <Radio<Theme> name="Display" value={s.theme} onChange={(v) => s.set({ theme: v })} options={[{ v: 'default', label: 'Bridge (default)' }, { v: 'high-contrast', label: 'High contrast' }]} />
      <Radio<Motion> name="Motion" value={s.motion} onChange={(v) => s.set({ motion: v })} options={[{ v: 'system', label: 'Follow system preference' }, { v: 'full', label: 'Full animation' }, { v: 'reduced', label: 'Reduced motion', hint: 'simulations jump to results' }]} />
      <Radio<StoryDensity> name="Story density" value={s.storyDensity} onChange={(v) => s.set({ storyDensity: v })} options={[{ v: 'full', label: 'Full scenes' }, { v: 'condensed', label: 'Condensed', hint: 'summaries for review passes' }]} />
      <fieldset className="dr-choices">
        <legend className="dr-field__label">Gating</legend>
        <label className="dr-choice">
          <input type="checkbox" checked={s.strictGating} onChange={(e) => s.set({ strictGating: e.target.checked })} />
          <span>Lock modules until prerequisites are complete</span>
        </label>
      </fieldset>
      <fieldset className="dr-choices" aria-label="Ambient audio">
        <legend className="dr-field__label">Ambient audio</legend>
        <label className="dr-choice">
          <input type="checkbox" checked={audio.enabled} onChange={(e) => audio.setEnabled(e.target.checked)} />
          <span>
            Show the COMMS · AMBIENT player in the top bar
            <span className="dr-muted"> — two looping ambient tracks; off by default until you press play</span>
          </span>
        </label>
        {audio.enabled && (
          <>
            <label className="dr-choice">
              <input type="checkbox" checked={audio.checkpointSwitch} onChange={(e) => audio.setCheckpointSwitch(e.target.checked)} />
              <span>
                Switch to General Quarters during checkpoints
                <span className="dr-muted"> — returns to your ambient track afterwards; a manual skip during a checkpoint wins</span>
              </span>
            </label>
            <label className="dr-choice">
              <span className="dr-field__label" style={{ minWidth: '8ch' }}>Track</span>
              <select className="dr-input" value={audio.trackIndex} onChange={(e) => audio.setTrack(Number(e.target.value))} aria-label="Ambient track">
                {TRACKS.map((t, i) => (
                  <option key={t.id} value={i}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="dr-choice">
              <span className="dr-field__label" style={{ minWidth: '8ch' }}>Volume</span>
              <input type="range" min={0} max={100} step={5} value={Math.round(audio.volume * 100)} onChange={(e) => audio.setVolume(Number(e.target.value) / 100)} aria-label="Ambient volume" />
              <span className="dr-muted">{Math.round(audio.volume * 100)}%</span>
            </label>
          </>
        )}
      </fieldset>
      <section className="dr-settings__danger">
        <div className="dr-field__label">Progress</div>
        <p className="dr-muted">
          Learner seed <code>{learnerSeed.toString(16).toUpperCase()}</code>. Resetting clears all progress, checkpoint results and the ship’s log, and draws a new seed.
        </p>
        <button
          type="button"
          className="dr-btn"
          onClick={() => {
            if (window.confirm('Reset all progress? This cannot be undone.')) {
              resetAll()
              clearLog()
            }
          }}
        >
          RESET ALL PROGRESS
        </button>
      </section>
    </div>
  )
}
