# QA & Accessibility Review — Book One

**Reviewed:** 2026-10-14 · build `f725076` · production build served by `vite preview`, driven with Playwright/Chromium.
**Scope:** a played-through Act 0 end to end including its checkpoint; the Act I checkpoint failed and retried; a spot-check of a module from every other Act; an automated pass over all **72 modules** (every chart, control, heading, console message) and over all **10 checkpoints**; reduced motion; 375 px; the app shell.

**One BROKEN finding.** The course itself is in strong shape — across all 72 modules the sweep found **0 console errors or warnings, 0 unhandled rejections, 122/122 charts carrying an `aria-label` and a data-table fallback, and 0 controls without an accessible name**. Every RUN/STEP/RESET control on every module was clicked and nothing produced `NaN`, `undefined`, `[object Object]` or an unregistered-generator panel. The defects below are concentrated in the sync feature and in a handful of systemic accessibility gaps, not in the teaching content.

Specs added: `tests/e2e/qa-review.spec.ts` — four regression guards that pass, and eight `test.fail()` reproductions, one per finding marked *(spec)*. A `test.fail()` reports an expected failure while the bug is present and flips to "unexpected pass" the moment it is fixed.

---

## BROKEN

### B1. Entering your passcode on a second device destroys your saved progress *(spec)*
**Where:** `src/app/SyncControl.tsx` (autosave effect, lines 36–46) · `src/store/sync.ts`

**What I did.** On profile A I passed the `act-0-01-fix-mean` beat, entered passcode `QA488746`, pressed SAVE, and confirmed the remote copy held `learnerSeed 3386119641` and the passed beat. On a fresh profile B I entered the same passcode and then — instead of pressing LOAD — clicked into `act-0-00`, as a learner naturally would. I waited past the 4-second debounce. On a third fresh profile C I entered the passcode and pressed LOAD.

**What happened.** Profile C loaded `{"seed":3354212121,"beats":[]}`. Profile A's progress was gone. Profile B's debounced autosave had POSTed its own empty state over the remote copy; one POST was observed from profile B before any LOAD. The loss is silent and irreversible — the store holds one revision per passcode.

**Why.** The `firstRun` ref suppresses the save that the passcode change itself triggers, but the effect also depends on `progressStamp`, which includes `lastModule`. Navigating to any module calls `setLastModule`, the stamp changes, and the autosave fires with whatever the new device happens to hold. The component's own docstring states the intent: *"Loading stays manual — silently overwriting a device's progress from elsewhere is the one thing that could lose work."* The guard protects the local device; nothing protects the remote copy.

**Made worse by the UI.** Immediately after unlocking, profile B's strip reads `SAVED 01:00 PM` — that is profile A's `remoteSavedAt` rendered through `SAVED ${shortTime(lastSavedAt ?? remoteSavedAt)}`. The learner is told their progress is saved at the exact moment they are about to destroy it, and `unlock`'s own message ("Saved progress found for this passcode") is never shown because the stamp span wins.

**What should happen.** Autosave must not run until this device has either loaded the remote copy or demonstrably owns it. The cheapest correct fix: after `unlock`, if `remoteSavedAt` is non-null, hold autosave until the learner presses LOAD (or explicitly presses SAVE), and make the strip say `REMOTE COPY — PRESS LOAD` rather than `SAVED`. A revision check on push (reject if `remote.savedAt` is newer than the one this device last read) would also catch the two-devices-open case.

---

## A11Y

### A1. The draggable scatter puts 412 tab stops in one chart *(spec)*
**Where:** `src/instruments/shared/Scatter.tsx` lines 168–198 · `src/instruments/act-2/MassScatter.tsx` (`/#/module/act-2-02`)

Every point gets `tabIndex={0}` when `onPointsChange` is set. `MassScatter` passes all 412 Bureau departures, so the chart contributes **412 of the page's 463 tab stops (89 %)**. I focused the first point and pressed Tab until focus left the chart: **412 presses**. Keyboard operation of the points themselves works correctly — arrow keys move a point and `r` updated 0.990 → 0.988, the status went to `POINTS MOVED` — so the contract's letter is met, but a keyboard or switch user cannot realistically reach the drills and the mission beat below it.

**What should happen.** A roving tabindex: one tab stop for the series, arrow keys to move between points, a modifier (or an explicit "edit point" mode) to move the focused point. `aria-label` on the group should say how many points there are and how to traverse them.

### A2. Captain Ostrow's speaker tag is 2.3:1 *(spec)*
**Where:** `src/content/crew.ts` line 115 (`ostrow`) · rendered by `src/components/components.css:260` · seen at `/#/module/act-7-03`

`ostrow` is given `accent: 'var(--dr-alert-dim)'`, and `.dr-dialogue__speaker` uses the accent as its **text** colour. Measured in the browser: `color rgb(127, 52, 48)` on `rgb(7, 9, 13)` at `12px` — **2.31:1**. That is below 4.5:1 for body text and below even the 3:1 large-text floor. Ostrow speaks nine times across `act-7/03`, `act-7/06` and `act-9/checkpoint`.

I checked all the accents and all the tokens (full matrix in the appendix). This is the only one that fails as text. The brief's specific worry is clear: **phosphor and alert are fine on the panel backgrounds** — phosphor is 11.14:1 on `bg-1` and 10.29:1 on `bg-2`, alert 5.67:1 and 5.24:1. The `tokens.css` comment ratios are all accurate to ±0.2.

**What should happen.** Give Ostrow `--dr-steel` or `--dr-alert` (5.67:1 on the panel) and keep `-dim` tokens for borders only — which is how every other `-dim` use in the codebase already behaves.

### A3. Modules have no heading structure: h1 jumps straight to h4 *(spec)*
**Where:** `src/instruments/act-N/_ui.tsx` (the shared `Subhead`), `src/instruments/act-0/NavFixDisplay.tsx:97`, `HeatSinkGauge.tsx:183`, `src/instruments/act-5/*`

**43 of 72 modules** skip from `h1` straight to `h4`, and **0 of 72 emit an `h2` or an `h3` at all**. `<Scene>`, `<Briefing>`, `<Calculator>`, `<Drill>`, `<MissionBeat>` and `<LogEntry>` all render their titles as styled `div`s inside `.dr-panel__label`, so a 30-minute page offers a screen-reader user exactly one landmark heading plus a scattering of instrument sub-heads at level 4. Heading navigation — the primary way a screen-reader user moves through a long document — does not work here.

**What should happen.** Give `<Panel>` an optional heading level (`h2` for a top-level section panel), and demote the instrument `Subhead` to `h3`. The visual design needn't change at all; this is markup, not styling.

### A4. Passing a mission beat is announced to nobody *(spec)*
**Where:** `src/components/MissionBeat.tsx` lines 205–213, 219–229

Failing a beat renders `.dr-beat__debrief` with `role="status"` — correct, the debrief is spoken. **Passing** renders `.dr-beat__outcome` with no role and no `aria-live`, and simultaneously *removes* the `.dr-gated` placeholder that did carry `aria-live="polite"`. I confirmed in the browser: after a correct COMMIT, `outcomeRole: null, outcomeLive: null, gatedStill: false`, and there is no live region anywhere inside the beat. A blind learner who answers correctly hears silence, while the scene, the gate release and the log entry all appear below. They get feedback only when they are wrong.

**What should happen.** `role="status"` on `.dr-beat__outcome`, and a polite announcement when a `<Gated>` block opens ("Mission call resolved — the scene continues").

### A5. No skip link; the header is ~12 tab stops on every one of the 72 routes *(spec)*
**Where:** `src/app/` shell

The first Tab lands on the wordmark link; the learner then passes four nav links, previous/play/next/mute, the volume slider and the PASSCODE button before reaching the module. There is no skip link (`a[href="#main"]`, `.skip-link`: 0 matches). A `<main>` landmark does exist, which helps screen-reader users but not sighted keyboard users. WCAG 2.4.1.

### A6. Every route has the same document title *(spec)*
**Where:** `index.html` / router

`/`, `/#/module/act-3-02`, `/#/settings` and `/#/log` all report `"Dead Reckoning — Book One"`. Nothing updates `document.title` on navigation. For a 72-route app this makes browser history and tab switching useless and gives screen readers no page announcement on route change. WCAG 2.4.2.

### A7. A briefing table is 886 px wide at 375 px, and panning it moves the whole page *(spec)*
**Where:** `content/act-9/02` (`<Briefing.Worked>`, the 13-column "Authority relay audit" table). Also `act-8-03`, `act-8-04`, `act-9-01`, `act-9-03`, `act-7-07`, `act-2-05`, `act-1-02`, `act-2-01`, `act-3-02`, `act-0-02`.

At 375 px the relay-audit table measures **886 px against a 375 px viewport** and has **no scrollable ancestor**, so `document.scrollWidth` becomes 911 px and the learner must pan the *entire page* sideways 536 px to read it — every paragraph of prose slides off as they do. Only 4 of the 12 relay stations are visible without panning (screenshot: `.tmp/qa/shots/m375-act9-02-table.png`, and the panel's right border visibly runs off-frame). WCAG 1.4.10 Reflow.

**The fix already exists in the codebase.** Component-rendered tables sit inside `.dr-table-wrap` / `.dr-chart__tablewrap`, which have `overflow-x: auto` and scroll correctly at 375 px — I measured both behaviours side by side. Markdown tables authored directly in MDX get no wrapper. Wrapping GFM tables in the MDX `table` component override fixes 5 of the 13. **Corrected during the fix pass:** MDX compiles a GFM pipe table to `_components.table`, but a literal `<table>` written as JSX compiles to a bare `jsx("table")` that never consults the component map, and six modules — including the 886 px relay audit in act-9-02 measured above — author theirs that way. Those are handled by `plugins/rehype-jsx-tables.ts`, which renames the element to a capitalised name MDX does resolve. The remaining three were instrument tables with no wrapper at all.

**Everything else at 375 px is sound:** no page-level horizontal scroll on the mission map, settings, ship's log or any checkpoint; no clipped charts; no unreachable controls.

### A8. Smaller a11y items
- **Label in Name.** `AnswerInput` (`src/components/Drill.tsx:86–97`) shows a visible `Answer (km)` label but overrides the accessible name with `aria-label="Mission call: THE TUG MASTER'S NUMBER"`. The visible text is not contained in the accessible name, so voice control ("click Answer") fails. WCAG 2.5.3. Prefer `aria-describedby`, or fold the visible text into the `aria-label`.
- **Touch targets.** At 375 px the radio/checkbox inputs render 13×13 px and some links 90×15 px, under the 24×24 px minimum (WCAG 2.5.8). The surrounding `.dr-choice` label is large enough, so choice questions are fine in practice; the bare checkboxes in Settings and `MassScatter` are not.
- **`--dr-alert-dim` as a component border** (`.dr-btn--danger`, `.dr-panel--alert`) is 2.20:1 on `bg-1`, under the 3:1 of WCAG 1.4.11. The button's own label is `--dr-alert` at 5.67:1 so the control is still identifiable; low priority.
- **`<Slider>`'s `<output>` carries `aria-live="off"`.** Correct for a native range input (the browser announces the value itself), noted only so it is not "fixed" later.

---

## POLISH

- **P1. A checkpoint retry can hand back the same item.** Over 300 learner seeds, comparing attempt 0 with attempt 1 on the full item payload: `act-0 q10` repeats verbatim **11.3 %** of the time, `act-0 q4` 8.0 %, `act-9 q9` 6.7 %, `act-0 q7` 9.7 % on prompt alone. These are low-cardinality classify-this-variable and pick-a-filter items, so a collision is arithmetic rather than a seeding bug — I verified no generator ignores its attempt number. But the button promises `RETRY · NEW PARAMETERS`, and roughly one retry in nine shows item 10 unchanged. Either widen those generators' draw pools or have `buildCheckpointProblems` reject a draw identical to the previous attempt's.
- **P2. `CLAUDE.md` says fonts are "vendored in `public/fonts`".** There is no `public/fonts`; the fonts come from `@fontsource/*` in `node_modules` and are bundled into `dist/assets` at build time. The *intent* (no runtime network calls) holds in production — but in a git worktree the dev server returns **403 on eight font files**, because `server.fs.allow` does not reach the parent checkout's `node_modules`, and the app silently falls back to Segoe UI. Worth an `fs.allow` entry so agents working in worktrees see the real typography.
- **P3. `CLAUDE.md` says "no backend, no accounts, no external calls".** Sync POSTs to `https://textdb.dev/api/data`. `src/lib/sync.ts` documents and justifies this, but the top-level contract contradicts it and should be amended rather than leaving the next agent to find out.
- **P4. The main bundle is 2.1 MB** (645 kB gzipped) and the build emits a chunk-size warning. MDX modules are code-split correctly; it is `index-*.js` that is large.
- **P5. The checkpoint track takes over on a *sealed* checkpoint page.** Navigating to a locked checkpoint swaps the ambient audio to General Quarters and shows the GQ badge even though the page renders only "sealed until its prerequisites are complete". `ModulePage`'s `enterCheckpoint` effect runs before the lock check. Cosmetic, but the alarm music for a page you cannot open is confusing.

---

## Verified working

Recording these so they are not re-reviewed.

- **The core loop.** `act-0-01`: wrong answer rejected with the in-story Failure debrief and `ATTEMPTS 1`; correct answer accepted, `RESOLVED`, `<Gated>` opened and revealed the following scene and log entry; state survived a reload.
- **The post-submit review regression has not returned.** On both the Act 0 and Act I checkpoints, every item in the graded review still shows the prompt, data and display it was marked on — grading only appends the mark, answer key and worked solution. Pinned by a passing spec.
- **Checkpoints under use.** Act 0 failed deliberately at 19 % (2/10, weight-adjusted) and passed at 100 %; Act I failed at 17 % (2/11). Both debriefs named the correct review modules with working links (Act I named all seven of `act-1-01`…`act-1-07`). Retry regenerated 10/10 and 11/11 items with new data.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` every duration token is `0s` and `--dr-scanline-alpha` is `0`. A chart mark nudged by the keyboard is at its final position within 25 ms (normal transition is 220 ms) — it jumps rather than easing faster. A 500-replication Monte Carlo completed in 132 ms. There are **no `requestAnimationFrame`, `setInterval` or `setTimeout` animation loops anywhere in `src/`** and every CSS transition uses a `--dr-dur-*` token, so the contract holds structurally and not just where I looked.
- **Ambient audio.** Running Cold on a module → General Quarters with the `is-gq` badge on a checkpoint → Running Cold again on leaving. All four transport buttons have accessible names.
- **HELIOS sync, happy path.** Passed a beat on profile 1, entered a passcode, SAVE; on a fresh profile 2 the same passcode + LOAD restored the identical `learnerSeed` and the passed beat, and the module showed `RESOLVED`.
- **Build-id readout.** Settings shows `f725076 · 2026-10-14 16:33Z`.
- **Drills.** Wrong answer → `REJECTED` with a targeted misconception note, `role="status"` on the result, progressive hints (1/2, 2/2), `RETRY · NEW NUMBERS`, worked solution. `aria-live` coverage on drill progress, item state and hints is thorough.
- **Console hygiene.** 72/72 modules clean: no React warnings, no key warnings, no unhandled rejections, no failed requests other than the worktree font 403s in P2.

---

## Appendix — contrast matrix

Ratios against the four surface tokens. `!` below 4.5:1, `!!` below 3:1.

```
TOKEN                   bg-0     bg-1     bg-2     bg-3
fg-0 #d7dee8            14.71    13.97    12.91    11.67
fg-1 #9aa8b8             8.22     7.81     7.22     6.52
fg-2 #7b8a9c             5.65     5.37     4.96     4.48!
phosphor #9fd3a8        11.73    11.14    10.29     9.30
amber #e0b05a            9.99     9.49     8.77     7.92
alert #e8615a            5.97     5.67     5.24     4.73
cyan #6fc3d6             9.92     9.42     8.70     7.87
violet #a68be0           7.01     6.66     6.15     5.56
steel #8fa3b8            7.68     7.30     6.74     6.10
phosphor-dim #5f8f6a     5.34     5.07     4.68     4.23!
amber-dim #8a6d35        4.10!    3.89!    3.60!    3.25!
alert-dim #7f3430        2.31!!   2.20!!   2.03!!   1.83!!   <- A2, used as TEXT for ostrow
cyan-dim #3e7d8c         4.29!    4.07!    3.76!    3.40!
violet-dim #6b579a       3.28!    3.11!    2.88!!   2.60!!
steel-dim #56697d        3.52!    3.35!    3.09!    2.79!!
chart-axis #52657a       3.32!    3.16!    2.92!!   2.64!!
series-1 #45a057         6.09     5.78     5.35     4.83
series-2 #1fa0d6         6.70     6.36     5.88     5.31
series-3 #c08a18         6.54     6.21     5.74     5.19
series-4 #8f70d8         5.20     4.94     4.56     4.12!
series-5 #6b89a9         5.48     5.21     4.81     4.35!
series-alert #d24a43     4.56     4.33!    4.00!    3.61!
```

Every `-dim` token except `alert-dim` is used only for borders and rules, where the applicable floor is 3:1 and most clear it. `chart-axis` is drawn on `--dr-chart-surface`, which is `bg-0`, where it makes 3.32:1 — it only fails on the panel surfaces it is never painted on. Series colours are chart marks, not text, so the 3:1 non-text floor applies and all six clear it on `bg-0`.

---

## Added after the fix pass — main-thread cost before Act VIII paints

`src/instruments/act-8/data.ts` runs `permutationTestProportions` with 10,000 reps at module
scope, so it executes on import, synchronously, before any Act VIII module renders. Measured at
**435 ms**. It is a one-time cost per session and the module system caches it, so it is not a
defect, but it is the largest single block of main-thread work in the app and it lands on the
first paint of an Act. If Act VIII ever feels slow to open, this is why. Moving it behind
`src/lib/sim`'s worker, or memoising it to a fixture the way `tests/fixtures/` does for the stats
library, would remove it from the critical path.

It also caused an intermittent test failure that looked like a flaky assertion and was not: with
89 test files competing for the CPU, the 435 ms import plus a jsdom render of charts and KaTeX
crossed Vitest's default 5s timeout on `act-8-02` in roughly one full-suite run in three. Fixed by
calibrating `testTimeout` in `vite.config.ts`, with the reasoning recorded there.

