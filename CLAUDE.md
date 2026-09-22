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

## Where things are (after Phase 1)
- **Story canon:** `docs/story-bible.md` (world, CSV *Nightjar*, crew, hidden truth, clue trail, hard-science ledger §2 — every number in prose must agree with it). Crew roster/voices: `src/content/crew.ts` (`you`, `xo`, `sensors`, `analyst`, `engineer`, `comms`, `medic`, `admiralty`, `ashbyhale`, `marsh`, `brandt`).
- **Curriculum:** `docs/curriculum-map.md` (70 modules, ids, AP topics, instruments, checkpoint blueprints), `docs/ap-coverage.md`. **Beat sheet:** `docs/beat-sheet.md` — the per-module build spec Act Teams follow.
- **Stats API:** `src/lib/stats/README.md` — namespaced distributions (`normal.cdf`, `t.quantile`, `binomial.atLeast`…), `inference.ts` (uniform result shape with `conditions`), `regression.ts`, `resampling.ts`, `random-variables.ts`, `critical.ts`. Use `simulate(task, params, seed, n)` from `@/lib/sim` for deterministic simulation answers; `runSimulation` for live worker runs.
- **Problems:** `docs/problem-authoring.md` — `defineGenerator`, `drawDataset`/`drawScatter`/`drawTwoWay`, `retry`, `tableMd`, rubric templates in `src/lib/problems/rubrics.ts` (confidence interval, significance conclusion, slope, r², correlation, residual, SD, expected value, sampling bias, conditions). Every generator is swept over 200 seeds by `tests/unit/problems/all-generators.test.ts`.
- **Charts/controls:** `src/instruments/shared/README.md` — `Histogram`, `Dotplot`, `Boxplot`, `Scatter` (draggable), `DensityCurve`, `BarChart`, `Slider`, `NumberField`, `Segmented`, `Readout`, `Legend`, `useChartFrame`. Theme in `src/design/chart-theme.ts`; icons in `src/design/icons.tsx`; live style reference at `/#/style`.
- **Panel** supports `led`, `icon`, `flush`; **MissionBeat** supports `hint` (CONSULT), `answerKind`, `allowInequality`, rubric-template spreading for `kind="interpretation"`.

## Prose standard (revised after the Prologue review — supersedes earlier voice guidance)

Reference authors: **James S.A. Corey** and **Richard Swan**. The failure mode to avoid is explainer-prose: a narrator who defines its own nouns and tells you how to feel. Scenes carry story and physical experience. **Scenes do not carry the lesson** — the teaching lives in `<Briefing>` and `<Calculator>`, which speak plainly and out of character.

Banned patterns, each of which appeared in the first draft of the Prologue:
1. **Appositive definitions.** Not "The blister is a two-person pressurised station with a manual lidar head." Let a character use it; name it in passing. If the reader must know a spec, someone says it, complains about it, or reads it off a gauge.
2. **"which is" / "therefore" explainer clauses.** Not "…Jupiter's limb, which is the only thing out here bright enough to calibrate against." Either trust the reader or give the line to a character.
3. **The paragraph-final aphorism.** "You believe her." / "One number." Pick at most one per scene. Test: delete it — if nothing is lost, it was a tic. Never assert the POV character's emotional reaction; show the behaviour and stop.
4. **Balanced pairs as the default rhythm.** "bright enough and known enough", "where they sit and how far they scatter". Vary sentence architecture: some long and accumulating, some four words, some without a comma at all.
5. **Abstraction standing in for an image.** "and a view", "a change in the quality of the quiet". Name the actual thing seen, heard, smelled or felt.
6. **A POV character who only observes.** Rook has a body and a want in every scene: something to get, avoid, decide or physically do. He is touched by cold, mass, noise, other people's bodies in narrow spaces.
7. **Winking irony.** At most once per Act, not once per paragraph.
8. **Everyone speaking in tidy complete reports.** People interrupt, trail off, answer a different question, repeat themselves under stress. Crew voices per the beat sheet's §6 card, but let them be unhelpful sometimes.
9. **Buzzwords and grand generic descriptors:** delve, underscore, harness, testament, tapestry, pivotal, realm, intricate, paramount, multifaceted, beacon. Literal hardware is exempt — Callisto's navigation beacon, a seat harness.
10. **"Not just X, but Y"**, and the rule of three (exactly three parallel adjectives or examples).
11. **Filler transitions and hooks:** "Furthermore," "Moreover," "It is crucial to note," "In conclusion," "Here's what most people get wrong."
12. **Em dashes as a default connector.** Ration them; a full stop or colon usually reads better.
13. **The circular callback.** "Solberg sends it as two lines, *because you told him two lines*." An action followed by a justification that restates it in the same words. It is empty, and it congratulates the POV character for a decision the reader already watched him make. Cut the clause; keep the action. A "because" is fine when it reveals something new about a *character* ("cranking the head round by hand because she does not trust the actuator"), never when it points back at an order just given.
14. **The arch trailing clause.** "Ebele has taped a thermometer to the bulkhead, *which nobody asked him to do and nobody has told him to stop*." A good concrete detail, then a wry aside telling the reader how to take it. **When a detail lands, stop.** Do not annotate it. The "which nobody X and nobody Y" shape is the tell, and it is three banned patterns at once: a relative-clause explainer, a balanced pair, and a wink. A character may be wry in dialogue; the narrator may not.
15. **The pointless action as emotion.** "She checks a gauge *that does not need checking*." The "does X that does not need doing" shape announces its own symbolism: it is a stage direction with a footnote telling you the character is stalling. Give her a real action with a purpose that happens to reveal the same thing — Sandoval scrolls the trace back three hours before she answers, because she does not commit to a number without looking. Related tells: a character studying their hands, taking a long breath, or looking at something for a beat too long.
16. **The voice rule performed as a tic.** Each crew member has a voice note in the beat sheet §6 card. Those describe how a person *thinks*, not a catchphrase to repeat. The failure: Sandoval's "numbers carry their uncertainty" became *"The loads wander. Sensor processing wanders. The loops wander with the sun angle. Sixteen people wander… Load wanders, hours wander."* — five repetitions of one verb in four sentences of perfectly parallel syntax. Nobody speaks in anaphora. Symptoms to check for in any speech longer than two sentences: a word repeated for rhythm, every sentence sharing a structure, a speech that makes a *rhetorical* point instead of answering the question, and a specialist who philosophises where they would give a figure. Speech is ragged: fragments, one concrete number, an interruption, a change of subject.
17. **Narration that admits it is a lesson.** "You give the table to Ebele, *because he is the one who has to learn it*." The fiction must never acknowledge its own pedagogical purpose. Ebele is an officer doing a job, not a stand-in for the learner.

Positively: concrete physical detail; varied sentence length; objects encountered rather than introduced; second person present for scenes; the ship's log in past tense; violence and death with weight and no spectacle.

## Teaching register (separate from the fiction)
- `<Briefing>` is **plain instructional English** and may drop the fiction entirely. No "two errors common on tug channels" framing. Say what the concept is, give the notation, work an example, name the misconception. The in-world dataset is welcome; the in-world *voice* is not.
- `<Calculator title="…">` gives the **TI-84 Plus CE** keystrokes for any procedure the learner would run on the exam: `<Calculator.Step keys={['STAT','▸ CALC','1:1-Var Stats']}>`, `<Calculator.Read label="x̄" value="12.8">`, `<Calculator.Watch>` for the trap (Sx vs σx, the wrong tail, `2nd` prefixes, list names). Use the calculator's own menu labels including their numbers. Include one wherever a TI-84 procedure exists — one-variable stats, normalcdf/invNorm, binompdf/binomcdf, LinReg, the inference tests, χ² — and omit it where there is no calculator path.

## Agent working rules
- Act Teams edit only `content/act-N/`, `src/instruments/act-N/`, `src/lib/problems/generators/act-N/`, `src/lib/problems/checkpoints/act-N.ts`. Shared-component changes are requests to the orchestrator, listed in your final report.
- Before finishing: `npm run build` and `npm test` must pass for your files. Run `npx vitest run <your test path>` while iterating.
- Writing standards (§10 of the build order): tight, concrete, physical detail; military cadence without cliché; minimal adverbs; no quippy banter; deaths carry weight.
- AP discipline: drill "conclusion in context" throughout, not just computation. Map every module to CED topics.
- Report back with: files created, contracts touched, open questions, requests for shared changes.
