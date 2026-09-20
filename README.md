# DEAD RECKONING — Book One

A self-guided, browser-based AP Statistics course taught through a serialized hard-science-fiction mystery. You command an experimental stealth corvette; every revelation in the case is earned through an analysis you perform.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build & host

```bash
npm run build      # static output in dist/ — runs offline, no backend
npm run preview    # serve dist/ locally
```

`dist/` uses relative asset paths and hash routing, so it can be dropped on any static host (GitHub Pages, S3, a USB stick) or opened from a local web server.

## Test

```bash
npm test           # vitest unit tests (stats library against SciPy/R fixtures, generators, rng)
npm run e2e        # playwright end-to-end walkthrough (builds first)
```

## Project structure

See [CLAUDE.md](./CLAUDE.md) for the full contracts. In short: `content/act-N/*.mdx` are the micro-modules, `src/lib/stats` is the numeric source of truth, `src/lib/problems` generates every drill and checkpoint from a seed, and `src/instruments/act-N` holds the interactive ship instruments.

## Ambient audio

The top bar carries a **COMMS · AMBIENT** player (play/pause, skip, volume, mute; off by default; volume and last track are remembered). Tracks ship with the static build and are never fetched from the network.

Tracks have a `role`: `ambient` tracks form the normal skip/loop rotation; the single `checkpoint` track ("General Quarters") is selected automatically while a checkpoint module is open and restored to the previous ambient track afterwards (Settings → "Switch to General Quarters during checkpoints"; a manual skip during a checkpoint wins). It otherwise plays only if picked explicitly in Settings.

To add or swap a track:
1. Drop the mp3 in `public/audio/` with a slug filename, e.g. `public/audio/mark-nine.mp3`. (ElevenLabs sometimes exports `.mp4`; extract with `ffmpeg -i in.mp4 -vn -codec:a libmp3lame -b:a 192k out.mp3`.)
2. Add an entry to `TRACKS` in `src/store/audio.ts`: `{ id: 'mark-nine', title: 'Mark Nine', file: 'audio/mark-nine.mp3', role: 'ambient' }`.
3. Rebuild. Ambient tracks loop in array order.

## Series bible

Book Two notes live in `docs/story-bible.md` (§ Book Two hooks).
