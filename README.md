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

## Series bible

Book Two notes live in `docs/story-bible.md` (§ Book Two hooks).
