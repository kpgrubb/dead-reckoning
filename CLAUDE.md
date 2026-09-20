# DEAD RECKONING — Book One · Build Contracts

A self-guided, browser-based AP Statistics course taught through a serialized hard-SF mystery. The learner commands an experimental stealth corvette; every revelation is earned through an analysis they perform. This file is the contract every agent inherits. Read it fully before touching anything.

## Locked creative decisions (do not revisit)
- **POV:** second person, present tense in scenes; ship's log in past tense.
- **Protagonist:** seasoned officer, late 40s–50s, institutionalist — serves a flawed institution rather than burning it down. Competent; never lectured like a child. Drives the plot through decisions and analysis.
- **Faction:** a minor outer-system power (Jovian-moon compact) with one prototype stealth corvette. Story Architect names it in `docs/story-bible.md`.
- **Setting:** our solar system, 100–200 years out. Hard science: real orbital mechanics, light-lag, delta-v, heat as the enemy of stealth. **No aliens, no FTL, no magic tech.**
- **Tone:** grave, consequential. Real losses. Violence present, never gratuitous. Dry, rare humor.
- **Originality:** The Expanse is tonal reference only. No borrowed names/factions/ships/tech, no "Belters".
- **Visual language:** bridge instruments. Restrained military HUD; charts are ship displays; muted palette, alert accents only for meaning.
- **Assessment:** mission checkpoints close each Act; pass ≈80%; failure → in-story debrief naming modules to revisit → retry with new parameters.
- **Calculus:** just-in-time `<CalcBriefing>` refreshers, always optional, never a gate.

## Hard plot constraints
1. Statistics is the investigative method. If deleting the math leaves the plot intact, the beat is wrong.
2. Agency: the learner makes calls; wrong analysis → debrief and retry (no hard branches), the narrative acknowledges the error.
3. Stealth is costly: heat-sink capacity is a resource → probability/expected-value problems.
4. 5–7 recurring crew with distinct voices (roster ids in `src/content/crew.ts`). At least one loss lands hard.
5. Every Act ends on a turn that makes the next Act's statistics necessary. Book One resolves; Book Two thread (Bayesian) is seeded.

## Repository layout
```
content/act-N/NN-slug.mdx      micro-modules (N = 0 prologue … 9, 10 epilogue); act-N/checkpoint.mdx for the Act checkpoint
content/calc/<topic>.mdx       calc briefing bodies (ids in src/lib/calc/topics.ts)
src/components/                shared component library (orchestrator-owned; request changes, don't edit)
src/instruments/act-N/         Act-specific interactive instruments (Act Team-owned)
src/instruments/shared/        reusable chart primitives (Design + Engine owned)
src/lib/stats/                 THE numeric source of truth (Engine-owned; fixture-tested)
src/lib/sim/                   Monte Carlo worker + task registry
src/lib/problems/              generator framework, grading, checkpoints (Assessment-owned)
src/lib/problems/generators/act-N/*.ts    drill generators (Act Team-owned)
src/lib/problems/checkpoints/act-N.ts     checkpoint specs (Act Team-owned)
src/design/                    tokens, chart theme, style reference (Design-owned)
src/store/                     zustand stores (progress, settings, ship's log)
docs/                          story-bible, curriculum-map, beat-sheet, ap-coverage, reviews, playtest-report
tests/fixtures/*.json          SciPy/R reference values
tests/unit, tests/e2e          vitest, playwright
```

## Module contract (every micro-module, in this order)
1. **Situation** — `<Scene>` 300–700 words creating a question only statistics answers.
2. **Briefing** — `<Briefing>` with `.Intuition` → `.Definition` (`<Formula>`) → `.Worked` (in-world numbers) → optional `.Caution`.
3. **Instrument** — ≥1 interactive `<Plot>`/`<Sim>`/`<MonteCarlo>`/custom instrument the learner manipulates.
4. **Calc Briefing** — `<CalcBriefing topic="…">` only where frontmatter `calc_briefing` is set. Optional, collapsed by default.
5. **Drills** — `<Drill generator="act-N/slug" count={4..8} />` — seeded, parameterized, hints + worked solution.
6. **Mission beat** — `<MissionBeat>` whose answer is computed by code; `<Success>`/`<Failure>` children; subsequent scene wrapped in `<Gated by="beat-id">`.
7. **Log entry** — `<LogEntry>`: concept in two sentences, formula, one common mistake.

Frontmatter (YAML, all fields):
```yaml
id: act-4-03          # act-N-NN; checkpoint: act-N-checkpoint
act: 4
title: "Running Cold"
kind: module          # module | checkpoint | interlude
ap_topics: ["4.10", "4.11"]
objectives: ["…"]
prereqs: ["act-4-02"]
est_minutes: 25
calc_briefing: "area-under-a-curve"   # or null
summary: "One-line teaser for the mission map."
```

MDX rules: import stats with `import { mean } from '@/lib/stats'`; instruments with `import { X } from '@/instruments/act-N/X'`. Components in `src/components/index.ts` need no import. Use `export const data = [...]` for module datasets. Prose outside components is allowed but scenes belong in `<Scene>`.

## Correctness rules (zero tolerance)
- **No hand-computed numbers.** Every answer, table value, worked-solution number and mission-beat answer is computed at runtime from `@/lib/stats` (in MDX expressions or generators). A literal number in an `answer=` prop is a defect.
- Stats functions are tested against `tests/fixtures/*.json` generated from SciPy/R (include edge cases). Fixture generation scripts live in `scripts/`.
- Rounding: carry full precision; round once at display via `src/lib/stats/format.ts` (`fmt`, `fmtP`, `round`).
- Generators reject degenerate/unrealistic draws via `retry()` unless the degenerate case is the lesson.
- All randomness through `src/lib/rng.ts` (`Rng`, `seedFrom`). `Math.random()` is banned in `src/lib`, `src/instruments`, `content`.

## Component API (stable — see JSDoc in each file)
`<Scene stamp location condensed variant>` · `<Dialogue speaker name aside lag>` · `<Briefing title topics>` + `.Intuition/.Definition/.Worked/.Caution` · `<Formula tex terms label>` · `<Plot spec label tone description showTable>` (DisplaySpec in `src/lib/problems/types.ts`) · `<Sim label seedKey controls onRun onStep onReset>` · `<MonteCarlo label task params n statLabel>` · `<CalcBriefing topic>` · `<Drill generator count>` · `<MissionBeat id kind prompt …>` with `<Success>`, `<Failure>`, `<Outcome option>`; `<Gated by>` · `<LogEntry title concept formula mistake tags>` · `<Checkpoint act="act-N">`. `<Panel label status tone>` is the HUD frame every instrument uses.

Accessibility: every chart has `description` (aria-label) and a data-table fallback; all controls keyboard-operable; honor `--dr-dur-*` tokens (0ms under reduced motion) — animations must jump to final state.

## Design tokens
All colors/fonts/spacing via `--dr-*` custom properties in `src/design/tokens.css`. No raw hex in components or instruments. Panel tones: tactical (phosphor), sensor (cyan), engineering (amber), intel (violet), log (steel), alert (red). Fonts are vendored in `public/fonts` (no runtime network calls).

## Stack & commands
Vite 8 + React 19 + TypeScript 6, MDX 3, D3 7, KaTeX, Zustand 5, Vitest 5, Playwright. Static output (`base: './'`, HashRouter) — no backend, no accounts, no external calls.
- `npm run dev` · `npm run build` (tsc -b + vite build) · `npm test` (vitest run) · `npm run e2e` (playwright) · `npm run lint`
- Do **not** add dependencies without orchestrator approval (note the request in your report).

## Agent working rules
- Act Teams edit only `content/act-N/`, `src/instruments/act-N/`, `src/lib/problems/generators/act-N/`, `src/lib/problems/checkpoints/act-N.ts`. Shared-component changes are requests to the orchestrator, listed in your final report.
- Before finishing: `npm run build` and `npm test` must pass for your files. Run `npx vitest run <your test path>` while iterating.
- Writing standards (§10 of the build order): tight, concrete, physical detail; military cadence without cliché; minimal adverbs; no quippy banter; deaths carry weight.
- AP discipline: drill "conclusion in context" throughout, not just computation. Map every module to CED topics.
- Report back with: files created, contracts touched, open questions, requests for shared changes.
