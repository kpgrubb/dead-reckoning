# Build Orders: DEAD RECKONING — Book One
### A narrative-driven AP Statistics campaign, built by a multi-agent team

(Verbatim source specification. CLAUDE.md summarizes the contracts derived from it.)

---

## 1. What we are building

A self-guided, browser-based learning experience that reteaches the full **AP Statistics** curriculum (all nine College Board units) to an adult learner who earned a 5 on the exam twenty years ago and has forgotten it. Statistics is taught through a serialized hard-science-fiction mystery in which the learner commands an experimental stealth corvette. This is **Book One** of a planned series; later books will go past AP (Bayesian methods, regression modeling, experimental design at depth).

**The learner:**
- Adult, senior design leader, sharp, time-constrained, returns in sessions of 20–45 minutes.
- Strong visual learner. Every concept that *can* be shown must be shown — plots, animations, simulations.
- Needs **just-in-time calculus refreshers** (no standalone calc course): short, visual briefings that appear exactly where statistics leans on calculus.
- Reads fiction about seasoned, older protagonists — institutionalists — who save the world through their own competence and choices. Likes Red Rising (later books), Brian McClellan, Richard Swan, Django Wexler. **Dislikes** stories where the plot happens *to* the protagonist and they get credit for genius they never demonstrate. The learner must earn every revelation through the math.

**Target scope:** ~60–75 micro-modules across 9 unit "Acts," plus prologue and epilogue. Each micro-module takes 15–35 minutes. Total experience: **25–35 hours.**

---

## 2. Locked creative decisions (do not revisit)

| Decision | Choice |
|---|---|
| Point of view | **Second person.** "You" are the commanding officer. |
| Protagonist | A seasoned officer in their late 40s–50s. Loyal to their institution, clear-eyed about its flaws. Drives the plot through decisions and analysis. |
| Faction | A **minor outer-system power** — e.g., a compact of Jovian moon settlements — punching above its weight with a single prototype ship. Story Architect names and details it. |
| Setting | Our solar system, a century or two out. **Hard science:** real orbital mechanics, light-lag, delta-v budgets, heat as the enemy of stealth. **No aliens. No FTL. No magic tech.** |
| Tone | **Grave and consequential.** Real losses, moral cost, institutional betrayal. Violence present, never gratuitous. |
| Visual language | **Bridge instruments.** Restrained military-grade HUD: tactical plots, sensor readouts, muted palette with alert accents. Charts are ship displays. |
| Assessment | **Mission checkpoints.** Story-embedded assessments that gate progress. Rigorous enough to prove skill; light enough to keep momentum. |
| Calculus | **Just-in-time** refreshers, integrated where needed. |
| Stack | **Modern web app** (see §6). |

**Originality rule:** The Expanse is a tonal reference, nothing more. No borrowed names, factions, ships, tech (no protomolecule analogues, no "Belters" as a term, no Rocinante-like ship). Build an original world.

---

## 3. Narrative spine (seed — Story Architect expands)

**Premise seed:** Ships are going missing along a trade corridor between the Jovian system and the Belt. The official finding: accidents, piracy, bad luck. Your government's only prototype stealth corvette — a heat-sink-cooled, low-emission hull that can go "cold" for limited windows — is dispatched to observe. What you find, one dataset at a time, is that the losses are not random. Someone is hiding a pattern in the noise, and the trail leads back toward institutions you have spent your life serving.

**Hard constraints on the plot:**
1. **Statistics is the investigative method, not decoration.** Every major revelation must follow from an analysis the learner performs. If you can delete the math and the plot still works, redo the beat.
2. **Agency.** The learner makes calls — where to patrol, which data to trust, whether to report up the chain — and the story responds. Wrong analysis at a checkpoint yields a *debrief and retry* (not a hard branch), but the narrative acknowledges the error.
3. **Institutionalist arc.** The protagonist believes in duty and chain of command. The conflict is how to serve an institution that is being corrupted from within — not to burn it down.
4. **Stealth is costly.** Going cold burns heat-sink capacity; every hidden hour is a resource decision. Use this for probability and expected-value problems.
5. **A crew worth grieving.** 5–7 recurring officers with distinct voices (e.g., an XO who questions you, a sensor officer who over-trusts instruments, a young analyst who makes sampling errors, a chief engineer who speaks in margins of error). Grave tone means at least one loss lands hard.
6. **Series hooks.** End Book One with a resolution and a larger thread for Book Two (which will introduce Bayesian reasoning).

**Suggested unit-to-plot mapping** (Story Architect may revise, Curriculum Architect must approve):

| Act | AP Unit | Investigative use |
|---|---|---|
| Prologue | — | Shakedown cruise; ship systems; why the corvette exists |
| I | 1. Exploring One-Variable Data | Reading sensor logs; distributions of drive signatures; outliers that shouldn't exist |
| II | 2. Exploring Two-Variable Data | Fuel burn vs. declared cargo mass; residuals exposing falsified manifests |
| III | 3. Collecting Data | Designing a survey of freighter crews; bias in the official incident reports; a flawed "experiment" by the Admiralty |
| IV | 4. Probability, Random Variables & Probability Distributions | Detection odds while running cold; binomial/geometric sensor pings; expected value of patrol choices |
| V | 5. Sampling Distributions | Why patrol reports disagree; simulating what "normal" variation looks like |
| VI | 6. Inference for Categorical Data: Proportions | Is the loss rate on this corridor higher than baseline? First formal accusation |
| VII | 7. Inference for Quantitative Data: Means | Reactor output and transit-time anomalies; paired comparisons of ships before/after refit |
| VIII | 8. Inference for Categorical Data: Chi-Square | Cargo category distributions that fail goodness-of-fit; independence of losses and ownership |
| IX | 9. Inference for Quantitative Data: Slopes | The final regression that proves intent; confronting the source |
| Epilogue | — | Consequences, cost, and the thread to Book Two |

---

## 4. Pedagogy contract (every micro-module)

Each micro-module follows this beat structure. Components in `<Brackets>` refer to §7.

1. **Situation** (narrative, 300–700 words) — a scene that creates a question only statistics can answer.
2. **Briefing** — the concept, taught plainly. Intuition first, then notation. Plain-language definition, then formula, then a worked example in-world.
3. **Instrument** — at least one interactive visualization or simulation the learner manipulates (`<Plot>`, `<Sim>`, `<MonteCarlo>`). The learner must *do* something that reveals the concept (drag, resample, adjust n, watch a distribution form).
4. **Calc Briefing** (when relevant) — `<CalcBriefing>`: 3–6 minute visual refresher on the exact calculus idea in play (area under a curve → probability; integral as accumulation; derivative → minimizing squared error in least squares; density vs. mass). Always optional-to-expand, never a gate.
5. **Drills** — 4–8 practice problems, parameterized and seeded (fresh numbers on retry), with tiered hints and full worked solutions.
6. **Mission beat** — the learner applies the concept to the case; the story advances based on the result.
7. **Log entry** — a short recap in the voice of the ship's log: the concept in two sentences, the formula, one common mistake.

**Mission checkpoints** close each Act: a 15–25 minute story-embedded assessment (mixed multiple choice, numeric entry, short interpretation with keyword/structure rubric, and one "interpret this display" item). Pass threshold ~80%. Failure → in-story debrief pointing to the specific modules to revisit, then retry with new parameters.

**AP alignment:** Curriculum Architect maps every micro-module to College Board AP Statistics Course and Exam Description topics and skills. Interpretation-in-context (the AP "conclusion in context" discipline) must be drilled throughout, not only computation.

---

## 5. Multi-agent architecture

### Phase 0 — Orchestrator foundations (serial)
Scaffold repo, write `CLAUDE.md`, define content schema, stub component library, stats utility module interface, design tokens file, seeded RNG.

### Phase 1 — Architects (parallel, 5 agents)
| Agent | Deliverable |
|---|---|
| **Story Architect** | `docs/story-bible.md`: world, faction, ship (specs, stealth limits, crew complement), antagonist structure, crew bios and voices, act-by-act plot, the mystery's hidden truth and clue trail, tone guide, glossary. |
| **Curriculum Architect** | `docs/curriculum-map.md`: every micro-module, its AP topics/skills, prerequisites, learning objectives, required instruments, where calc briefings go, checkpoint blueprints. |
| **Visual Design System** | `src/design/`: tokens (palette, type, spacing, motion), HUD chart theme for D3/Plot, panel/frame components, iconography (original, SVG), light-on-dark with an accessible high-contrast mode. Produce a style reference page. |
| **Simulation & Stats Engine** | `src/lib/stats/` and `src/lib/sim/`: distributions (normal, t, χ², binomial, geometric), CDFs/inverse CDFs, descriptive stats, regression, test procedures, bootstrap/resampling, Monte Carlo runner in a Web Worker. Unit-tested against reference values (see §9). |
| **Assessment Designer** | `src/lib/problems/`: problem-generator framework (seeded params → question, answer computed by code, hints, worked solution), rubric engine for short interpretation answers, checkpoint runner. |

### Phase 2 — Weave (serial, then review)
- A **Showrunner** agent merges story bible + curriculum map into `docs/beat-sheet.md`: one row per micro-module with plot beat, concept, instrument, mission question, and clue revealed.
- **Gate:** A fresh reviewer agent checks the beat sheet against §3's constraints — especially "delete the math and does the plot still work?" Fix before Phase 3.

### Phase 3 — Act production (parallel)
One Act Team per Act. Each Act Team is a lead agent that may spawn sub-agents: Writer, Instructor, Instrument Builder, Problem Author. Act Teams touch only `content/act-N/` and `src/instruments/act-N/` (plus their generators/checkpoint). Shared-component changes go to the orchestrator as requests, not edits.

### Phase 4 — Independent review (parallel, fresh agents)
Math Auditor · Pedagogy Reviewer · Continuity Editor · Hard-SF Auditor · QA & Accessibility. Findings return to the owning Act Team for fixes. Repeat on changed modules until clean.

### Phase 5 — Polish (orchestrator)
Title sequence, act transitions, the mission map, progress dashboard, epilogue, final full playthrough by a fresh agent writing `docs/playtest-report.md`.

---

## 6. Technical stack

- **Vite + React + TypeScript**
- **MDX** for module content (narrative prose with embedded components)
- **D3** (and/or Observable Plot) for charts; **KaTeX** for math
- **Zustand** with localStorage persistence for progress, checkpoint results, settings
- **Web Workers** for Monte Carlo and resampling so the UI never blocks
- **Seeded RNG** — every simulation and problem is reproducible from a seed
- **Vitest** for unit tests; **Playwright** for end-to-end
- Static build output that runs offline and can be hosted on any static host
- No backend. No accounts. No external network calls at runtime; vendor all fonts and assets.

---

## 7. Content schema & component library

Each micro-module is an MDX file with frontmatter (see CLAUDE.md). Required components: `<Scene>`, `<Dialogue speaker="xo">`, `<Briefing>`, `<Formula>`, `<Plot>`, `<Sim>` / `<MonteCarlo>`, `<CalcBriefing topic="…">`, `<Drill>`, `<MissionBeat>`, `<LogEntry>`, `<Checkpoint>`.

---

## 8. Required instruments (minimum set — Act Teams add more)

Dotplot/histogram/boxplot builder with draggable points; outlier and skew explorer; z-score/normal-area explorer; scatterplot with draggable points and live regression line + residual plot; least-squares "minimize the squares" visual; sampling-method simulator (SRS, stratified, cluster, systematic) on a fleet population; bias demonstrator; probability tree builder; binomial and geometric explorers; random-variable combiner (means and variances of sums); **Central Limit Theorem machine** (any parent distribution → sampling distribution forming live); confidence-interval capture simulator (100 intervals, watch ~95% capture); p-value visualizer; Type I/II error and power explorer; t vs. normal comparator; paired vs. two-sample explorer; χ² goodness-of-fit and independence visualizers; regression-slope sampling distribution simulator; bootstrap/randomization test machine.

Every instrument is themed as a ship system (tactical plot, sensor array, engineering readout, intelligence terminal).

---

## 9. Correctness rules

- **No hand-computed answers anywhere.** All numeric answers, table values and worked-solution numbers come from `src/lib/stats` at build or run time.
- Stats library tested against reference values generated from SciPy/R and committed as fixtures (`tests/fixtures/*.json`). Include edge cases.
- Rounding conventions stated once and applied everywhere (AP-style: carry precision, round at the end).
- Problem generators must reject parameter draws that yield degenerate or unrealistic cases (e.g., conditions for inference not met, unless that's the point of the problem).

---

## 10. Writing standards

- Second person, present tense for scenes. Ship's log in past tense.
- Prose: tight, concrete, grounded in physical detail. Military cadence without cliché. Minimal adverbs.
- The protagonist is competent and experienced — the text never lectures them as a child; the learning is framed as re-sharpening an old skill under pressure.
- No quippy banter that undercuts gravity. Humor dry and rare.
- Violence and death carry weight and consequence; never spectacle.
- Every Act should end on a turn that makes the next Act's statistics necessary.

---

## 11. UX requirements

- Mission map / table of contents showing Acts, modules, completion, checkpoint status.
- Resume where you left off. Session-friendly: every module states estimated time.
- Ship's Log: searchable concept/formula reference built from `<LogEntry>` blocks.
- Settings: text size, reduced motion, high-contrast mode, "story density" toggle (full scenes vs. condensed summaries for review passes).
- Responsive down to tablet width; desktop is the primary target.

---

## 12. Definition of Done

- [ ] All 9 Acts + prologue + epilogue complete; 60–75 micro-modules total.
- [ ] Every AP Statistics CED topic mapped and covered (coverage report in `docs/ap-coverage.md`).
- [ ] Every module has at least one interactive instrument and 4+ seeded drills.
- [ ] Every Act has a working checkpoint with debrief/retry.
- [ ] Math Auditor, Pedagogy, Continuity, Hard-SF and QA reviews all pass with no open findings.
- [ ] Vitest and Playwright suites green; `vite build` output runs offline.
- [ ] A fresh-agent full playthrough report confirms the story holds, the mystery resolves through the learner's analysis, and estimated total time lands in 25–35 hours.
- [ ] `README.md` explains how to run, build and host it, plus a series bible note for Book Two.
