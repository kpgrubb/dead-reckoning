# Act Team Brief — DEAD RECKONING Book One (Phase 3)

You are the **lead of an Act Team**. You produce every micro-module of your Act — narrative, briefings, instruments, drills, mission beats, log entries, and the Act checkpoint — exactly as specified in `docs/beat-sheet.md`, to the standards in `CLAUDE.md`. Fidelity beats speed. You are cleared to spend a large budget.

## Read first (all of it, in this order)
1. `CLAUDE.md` — contracts, component API, correctness rules.
2. `docs/beat-sheet.md` — §1 series summary, §2 **dataset registry** (your datasets), **your Act's section** (every module block), §4 agency ledger rows for your Act, §5 decisions log, §6 tone & voice card, §7 time budget.
3. `docs/reviews/phase2-gate-review.md` — apply every Blocking/Required finding for your Act's modules.
4. `docs/story-bible.md` — your Act in §8, the hard-science ledger §2, your speakers in §4/§6. Skim the rest.
5. `docs/curriculum-map.md` — your Act's module rows, misconceptions, checkpoint blueprint (§5), instrument index (§4).
6. `docs/problem-authoring.md`, `src/lib/stats/README.md`, `src/instruments/shared/README.md`.
7. The reference module `content/act-0/01-shakedown.mdx` and generators in `src/lib/problems/generators/act-0/shakedown.ts` (Act 0 team: you replace these).
8. Existing instruments in `src/instruments/act-*/` from Acts before yours (reuse patterns; do not edit them).

## You own (create/edit only these paths)
- `content/act-N/NN-slug.mdx` (modules) and `content/act-N/checkpoint.mdx` (id `act-N-checkpoint`, `kind: checkpoint`, body = short in-story framing + `<Checkpoint act="act-N" />`).
- `content/calc/<topic>.mdx` for calc-briefing topics whose `firstUsedIn` (in `src/lib/calc/topics.ts`) is one of your modules. Body = 3–6 minute visual refresher: prose + one small instrument (a `DensityCurve` with a shaded area, a draggable secant/tangent, a Riemann-sum slider…) + a two-sentence "why this matters here".
- `src/instruments/act-N/**` — your instruments (React + shared primitives), `data.ts` (your Act's datasets, generated with seeded `Rng` from the beat-sheet registry), and `*.test.ts(x)`.
- `src/lib/problems/generators/act-N/*.ts` — drill/checkpoint generators.
- `src/lib/problems/checkpoints/act-N.ts` — the `CheckpointSpec`.
Nothing else. Shared-component or store changes are **requests** in your report. No new npm dependencies.

## How to organize the work
Recommended (you may adapt): (1) build `data.ts` first and write a test asserting the registry's headline numbers (e.g. "two-proportion z ≈ 3.2", "19 hulls at +6–9%"); (2) spawn an **Instrument Builder** sub-agent for the Act's instruments (give it the beat-sheet instrument lines and the shared README); (3) spawn **module sub-agents**, each owning 2–3 modules end to end (scene, briefing, drills, beat, log) with the full beat-sheet blocks pasted in; (4) write the checkpoint yourself; (5) integrate, verify, fix, report. Sub-agents get only what you brief them — paste the relevant beat-sheet blocks and the rules below verbatim rather than pointing at 30k-word files.

## Module skeleton (every teaching module, in this order)
```mdx
---
id: act-N-NN
act: N
title: "…"
kind: module
ap_topics: ["…"]
objectives: ["…", "…"]
prereqs: ["act-N-(NN-1)"]
est_minutes: 25
calc_briefing: null            # or a topic id
summary: "One line for the mission map."
---
import { fmt, mean, sd /* … */ } from '@/lib/stats'
import { registerSample } from '@/instruments/act-N/data'
import { SomeInstrument } from '@/instruments/act-N/SomeInstrument'

<Scene stamp="MET 014:22:07" location="…" condensed="2–3 sentence summary for condensed mode.">
…300–700 words, second person, present tense…
</Scene>
<Dialogue speaker="xo" aside="…">…</Dialogue>

<Briefing title="…" topics={["1.5"]}>
  <Briefing.Intuition>…</Briefing.Intuition>
  <Briefing.Definition><Formula tex="…" terms={{…}} label="…" /></Briefing.Definition>
  <Briefing.Worked>…numbers computed inline: {fmt(sd(registerSample), 2)}…</Briefing.Worked>
  <Briefing.Caution>…the misconception…</Briefing.Caution>
</Briefing>

<SomeInstrument />                       {/* ≥1 instrument the learner manipulates */}
<CalcBriefing topic="…" />               {/* only if frontmatter says so */}
<Drill generator="act-N/slug" count={5} />   {/* 4–8 drills total; ≥1 interpretation drill from Act II on */}

<MissionBeat id="act-N-NN-beat" kind="numeric" answer={twoPropTest(…).statistic} answerKind="testStat"
  prompt="…" hint="…">
  <Success>…scene continues…</Success>
  <Failure>…in-voice debrief pointing at the method…</Failure>
</MissionBeat>
<Gated by="act-N-NN-beat">
  …closing scene / decision beat…
  <LogEntry title="…" concept="…" formula="…" mistake="…" tags={["…"]} />
</Gated>
```
Decision beats: `<MissionBeat kind="decision" options={[…]}>` with `<Outcome option={i}>` children; record nothing else — later modules may read `useProgress().decisions[id]` via a tiny instrument component if the beat sheet says a decision colours later text.

## Non-negotiable rules
- **Numbers:** every number in a briefing's worked example, a mission-beat `answer`, a drill answer or a solution is computed at runtime from `@/lib/stats` (MDX expressions `{fmt(...)}` or generator code). A literal numeric `answer={3.2}` is a defect. Story numbers in *prose* (dates, distances, crew counts) come from the bible/beat sheet and must match them.
- **Datasets:** generated in `src/instruments/act-N/data.ts` with `rng('DS-xx', …)`-style fixed seeds so they are identical on every load and across modules; assert the registry headline numbers in a test. Reuse earlier Acts' datasets by importing their `data.ts` (read-only).
- **Randomness:** only `@/lib/rng`. `Math.random()` is banned.
- **Generators:** use `defineGenerator`; 2–3 hints; solution shows the formula with substituted numbers; reject degenerate draws with `retry`; use rubric templates for interpretation items; in-world contexts (the Lane, hulls, marks, the sink). The 200-seed sweep in `tests/unit/problems/all-generators.test.ts` must pass.
- **Instruments:** built from `src/instruments/shared` primitives inside `<Panel>` or `<Sim>`; themed as a ship system (tactical/sensor/engineering/intel tone); keyboard operable; `ariaLabel` + description; data-table fallback; reduced motion respected (`--dr-dur-*`); tokens only, no raw colors; no per-point DOM above ~2,000 points. The learner must *do* something that reveals the concept.
- **Writing:** second person, present tense; grave, concrete, physical; military cadence without cliché; minimal adverbs; no quippy banter; the protagonist is never lectured like a child. Crew voices per the tone card. Every `<Scene>` has a `condensed` summary. Deaths carry weight.
- **AP discipline:** "conclusion in context" drilled from Act II on; misconceptions named in `<Briefing.Caution>`; log entry = concept in two sentences + formula + one common mistake.
- **Time:** honor `est_minutes` from the beat sheet (a module's prose + briefing + instrument + drills + beat should fit it).
- **Checkpoint:** `src/lib/problems/checkpoints/act-N.ts` per the curriculum map blueprint (8–12 items: MC, numeric, ≥1 interpretation rubric, exactly one `display` item), each item with `review` module ids and an in-voice `debrief` line; `onPass`/`onFail` story text; threshold 0.8.

## Verify before you report (all must pass)
```
npx tsc -p tsconfig.app.json --noEmit
npx vitest run src/instruments/act-N src/lib/problems tests/unit/problems
npx vite build --outDir .tmp/dist-act-N            # compiles your MDX; never plain `vite build`, never `npm run e2e`
npx vite preview --outDir .tmp/dist-act-N --port 42NN   # run in the background, NN = your act number (4200 + N)
```
Then use the Playwright MCP tools against `http://localhost:42NN/#/module/<id>` for **every** module: confirm no console errors, every instrument renders and responds, a drill grades, the mission beat's correct answer (compute it the same way the MDX does) passes and unseals `<Gated>`, and the checkpoint runs end to end. Screenshot each module (full page) into your scratchpad and look at them. Stop the preview server when done. Note: the app is gated by prerequisites — set `strictGating` off at `/#/settings` or complete modules in order.

## Report back (this is all the orchestrator sees)
Module ids and titles delivered with est_minutes; instruments built (name → what the learner does); generators (ids) and checkpoint item mix; how each dataset reproduces its registry numbers (test names); gate-review findings applied; deviations from the beat sheet and why; requests for shared changes; known gaps.
