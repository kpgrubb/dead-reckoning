/**
 * COMMS · AMBIENT — compact ambient-music strip for the top bar. Owns the single <audio> element,
 * so playback continues across route changes. State lives in src/store/audio.ts.
 * While the checkpoint track ("General Quarters") is selected the strip shows a GQ tag.
 */
import { useEffect, useRef, useState } from 'react'
import { useAudio, currentTrack, trackSrc, AMBIENT_INDICES } from '@/store/audio'
import { Slider } from '@/instruments/shared/controls'
import { IconPlay, IconPause, IconChevronLeft, IconChevronRight } from '@/design/icons'
import './audio.css'

export function AudioPlayer() {
  const enabled = useAudio((s) => s.enabled)
  const trackIndex = useAudio((s) => s.trackIndex)
  const playing = useAudio((s) => s.playing)
  const volume = useAudio((s) => s.volume)
  const muted = useAudio((s) => s.muted)
  const { toggle, next, prev, setVolume, setMuted, pause } = useAudio.getState()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [blocked, setBlocked] = useState(false)
  const track = currentTrack({ trackIndex })
  const gq = track.role === 'checkpoint'
  const ambientPos = AMBIENT_INDICES.indexOf(trackIndex)

  // Create the element once; it lives for the life of the shell.
  useEffect(() => {
    const el = new Audio()
    el.preload = 'none'
    audioRef.current = el
    const onEnded = () => {
      const s = useAudio.getState()
      if (currentTrack(s).role === 'checkpoint') {
        // General Quarters loops on itself; it never advances into the ambient rotation.
        el.currentTime = 0
        el.play().catch(() => s.pause())
      } else {
        s.next(false)
      }
    }
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('ended', onEnded)
      el.pause()
      audioRef.current = null
    }
  }, [])

  // Track change: swap source, keep playing if we were.
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const src = trackSrc(track)
    if (el.src !== new URL(src, window.location.href).href) {
      el.src = src
      el.load()
    }
    if (playing) {
      el.play().then(() => setBlocked(false)).catch(() => {
        setBlocked(true)
        pause()
      })
    } else {
      el.pause()
    }
  }, [track, playing, pause])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = volume
    el.muted = muted
  }, [volume, muted])

  if (!enabled) return null

  return (
    <div className={`dr-audio ${playing ? 'is-playing' : ''} ${muted ? 'is-muted' : ''} ${gq ? 'is-gq' : ''}`} role="group" aria-label="Ambient audio">
      <span className="dr-audio__label" aria-hidden="true">
        COMMS · AMBIENT
      </span>
      <span className="dr-audio__vu" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {gq && (
        <span className="dr-audio__gq" title="General Quarters — checkpoint track">
          GQ
        </span>
      )}
      <span className="dr-audio__track" aria-live="polite">
        <span className="visually-hidden">Now {playing ? 'playing' : 'selected'}: </span>
        {track.title}
        {!gq && (
          <span className="dr-audio__index">
            {' '}
            {ambientPos + 1}/{AMBIENT_INDICES.length}
          </span>
        )}
      </span>
      <div className="dr-audio__controls">
        <button type="button" className="dr-audio__btn" onClick={prev} aria-label="Previous track" title="Previous track">
          <IconChevronLeft />
        </button>
        <button type="button" className="dr-audio__btn dr-audio__btn--play" onClick={toggle} aria-label={playing ? 'Pause ambient audio' : 'Play ambient audio'} aria-pressed={playing} title={playing ? 'Pause' : 'Play'}>
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="dr-audio__btn" onClick={() => next()} aria-label="Next track" title="Next track">
          <IconChevronRight />
        </button>
        <button type="button" className={`dr-audio__btn dr-audio__btn--mute ${muted ? 'is-active' : ''}`} onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute ambient audio' : 'Mute ambient audio'} aria-pressed={muted} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? 'MUTED' : 'MUTE'}
        </button>
        <Slider className="dr-audio__volume" label="Volume" value={Math.round(volume * 100)} min={0} max={100} step={5} onChange={(v) => setVolume(v / 100)} format={(v) => `${v}%`} showRange={false} />
      </div>
      {blocked && (
        <span className="dr-audio__blocked" role="status">
          BLOCKED — press play again
        </span>
      )}
    </div>
  )
}
