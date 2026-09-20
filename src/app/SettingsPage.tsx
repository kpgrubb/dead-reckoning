import { useSettings, type Motion, type StoryDensity, type TextSize, type Theme } from '@/store/settings'
import { useProgress } from '@/store/progress'
import { useShipLog } from '@/store/log'

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
