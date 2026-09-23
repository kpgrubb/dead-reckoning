/**
 * Header control for cross-device progress sync.
 *
 * Locked: a PASSCODE button that opens a one-field form.
 * Unlocked: the passcode, SAVE and LOAD, and the time of the saved copy.
 *
 * Saving is also automatic (debounced) whenever progress changes, so "enter the passcode and your
 * progress is kept" is true without pressing anything. Loading stays manual — silently overwriting
 * a device's progress from elsewhere is the one thing that could lose work.
 */
import { useEffect, useRef, useState } from 'react'
import { useSync } from '@/store/sync'
import { useProgress } from '@/store/progress'
import './sync.css'

const AUTOSAVE_DELAY_MS = 4000

function shortTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function SyncControl() {
  const { passcode, status, message, lastSavedAt, remoteSavedAt } = useSync()
  const { unlock, lock, save, load } = useSync.getState()
  const [open, setOpen] = useState(false)
  const [entry, setEntry] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-save on progress change once a passcode is set.
  const progressStamp = useProgress((s) => `${Object.keys(s.completed).length}|${Object.keys(s.beats).length}|${Object.keys(s.checkpoints).length}|${s.lastModule ?? ''}`)
  const firstRun = useRef(true)
  useEffect(() => {
    if (!passcode) return
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const t = setTimeout(() => void useSync.getState().save(), AUTOSAVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [progressStamp, passcode])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!passcode) {
    return (
      <div className="dr-sync">
        {open ? (
          <form
            className="dr-sync__form"
            onSubmit={(e) => {
              e.preventDefault()
              void unlock(entry)
              setEntry('')
              setOpen(false)
            }}
          >
            <label className="visually-hidden" htmlFor="dr-sync-pass">
              Sync passcode
            </label>
            <input id="dr-sync-pass" ref={inputRef} className="dr-sync__input" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="PASSCODE" autoComplete="off" spellCheck={false} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} />
            <button type="submit" className="dr-sync__btn dr-sync__btn--go">
              ENTER
            </button>
          </form>
        ) : (
          <button type="button" className="dr-sync__btn" onClick={() => setOpen(true)} title="Enter a passcode to keep progress across devices">
            PASSCODE
          </button>
        )}
      </div>
    )
  }

  const busy = status === 'working'
  return (
    <div className={`dr-sync is-unlocked ${status === 'error' ? 'is-error' : ''}`}>
      <button type="button" className="dr-sync__code" onClick={lock} title="Forget this passcode on this device">
        {passcode}
      </button>
      <button type="button" className="dr-sync__btn" onClick={() => void save()} disabled={busy}>
        SAVE
      </button>
      <button type="button" className="dr-sync__btn" onClick={() => void load()} disabled={busy}>
        LOAD
      </button>
      <span className="dr-sync__stamp" aria-live="polite">
        {busy ? 'SYNCING…' : status === 'error' ? (message ?? 'error') : `SAVED ${shortTime(lastSavedAt ?? remoteSavedAt)}`}
      </span>
    </div>
  )
}
