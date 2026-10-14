# Pedagogy Review — Book One

Reviewer: Pedagogy Reviewer · first run · 62 modules + 10 checkpoints across eleven Acts.
Standard applied: **can an adult working through this alone, with no instructor to ask, get it right?**

Method: every module read in curriculum order (frontmatter, Briefing, Calculator, instruments,
drills, every `<MissionBeat>` prompt/hint/answer, `<Gated>` wiring, LogEntry); every `<Drill>` and
checkpoint `generator:` resolved against `src/lib/problems/generators/**`; every generator's
`ap_topics` unioned per checkpoint and compared against the CED unit; `src/lib/calc/topics.ts`
`firstUsedIn` compared against frontmatter `calc_briefing` and against every `<CalcBriefing>` call
site. `npm test` passes (86 files, 2139 tests).

**Headline: 0 BLOCKERs. 0 CED topics uncovered.** All 80 CED topics are claimed by a teaching
module, taught in that module's Briefing, and exercised by at least one drill or checkpoint item.
The defects are six **GAP**s in *assessment* (five CED topics that `docs/ap-coverage.md` promises
are assessed at a checkpoint and are not, plus one CED learning objective that is taught but never
practised) and a set of **IMPROVEMENT**s, the largest of which is a missing `<Calculator>` panel in
the module that teaches power.

---

## 1. CED coverage

### 1a. Teaching coverage — complete

| Unit | CED topics | Topics claimed by a module's `ap_topics` | Topics with ≥1 drill/checkpoint item | Missing |
|---|---|---|---|---|
| 1 Exploring One-Variable Data | 1.1–1.10 (10) | 10 — act-0-01/02/03, act-1-01…act-1-07 | 10 | **none** |
| 2 Exploring Two-Variable Data | 2.1–2.9 (9) | 9 — act-2-01…act-2-06 | 9 | **none** |
| 3 Collecting Data | 3.1–3.7 (7) | 7 — act-3-01…act-3-05 | 7 | **none** |
| 4 Probability & Random Variables | 4.1–4.12 (12) | 12 — act-4-01…act-4-10 (4.5 revisited act-10-02) | 12 | **none** |
| 5 Sampling Distributions | 5.1–5.8 (8) | 8 — act-5-01…act-5-05 | 8 | **none** |
| 6 Inference: Proportions | 6.1–6.11 (11) | 11 — act-6-01…act-6-08 (6.7 revisited act-10-01) | 11 | **none** |
| 7 Inference: Means | 7.1–7.10 (10) | 10 — act-7-01…act-7-07 | 10 | **none** |
| 8 Inference: Chi-Square | 8.1–8.7 (7) | 7 — act-8-01…act-8-04 | 7 | **none** |
| 9 Inference: Slopes | 9.1–9.6 (6) | 6 — act-9-01…act-9-04 | 6 | **none** |
| **All** | **80** | **80** | **80** | **none** |

No module claims a topic its Briefing does not teach. I checked every one of the nine topics
`docs/ap-coverage.md` flagged **light** and all nine are real teaching, not framing:

- **1.4** act-1-02 is a full module (bar/pie/segmented, denominator, baseline, area), 4 drills, 3 beats.
- **2.1** act-2-01's Briefing names association and `appear associated` explicitly; `association-in-context` rubric drill.
- **2.9** act-2-06 is a full module with four candidate models, 5 drills, 4 beats.
- **3.1** act-3-01's Briefing carries population/frame/sample and the three study types; not scene-only.
- **5.6 / 5.8** act-5-04's second half and act-5-05 each carry their own Briefing section, 3+ drills and 2–4 beats.
- **6.9** taught in act-6-07 (whole-interval-above-zero reading) with two drills — but see GAP-3.
- **8.7** act-8-04's procedure table plus `CategoricalProcedureSelector`, drilled twice.

Two frontmatter claims that are reinforcement rather than first teaching, correctly so:
`content/act-10/01-consequences.mdx:6` (`6.7`) and `content/act-10/02-provident.mdx:6` (`4.5`).
act-10-02 is `kind: interlude`, so the module contract does not bind it; 4.5 is fully taught in
act-4-03 and this is the Book Two seed. Not a gap.

### 1b. Assessment coverage — five holes

`docs/ap-coverage.md:3` states the rule: *"every topic maps to at least one teaching module **and at
least one checkpoint item**."* Taking the union of the `ap_topics` of each checkpoint item's
generator, that rule fails for five topics. Each has a drill that already carries the right tag, so
each fix is a one-line substitution in the checkpoint spec.

| Topic | ap-coverage claims | Actual checkpoint item | Its generator's `ap_topics` | Drill that already carries the topic |
|---|---|---|---|---|
| **4.1** | act-4-cp q1 | `act-4/simulation-design` | `['4.2']` | `act-4/streaks` (`act-4/random-or-not.ts:387`) |
| **4.4** | act-4-cp q2 | `act-4/complement-rule` | `['4.3']` | `act-4/addition-exclusive` (`rules-of-chance.ts:227`), `act-4/two-way-probability` (`:340`) |
| **6.9** | act-6-cp q10 | `act-6/two-prop-interval` | `['6.8']` | `act-6/interval-contains-zero` (`difference.ts:376`), `act-6/order-of-subtraction` (`:432`) |
| **6.11** | act-6-cp q11 | `act-6/pooled-test-statistic` | `['6.10']` | `act-6/four-step-test` (`accusation.ts:489`), `act-6/scope-of-inference` (`:533`) |
| **7.8** | act-7-cp q9 | `act-7/two-sample-conclusion` | `['7.9']` | `act-7/two-sample-setup` (`transit-anomaly.ts:97`), `act-7/two-sample-statistic` (`:154`) |

For 4.4, 6.9 and 7.8 the *curriculum map blueprint* asked for exactly the missing half and the built
item dropped it: `docs/curriculum-map.md:851` (q2 "complement **/ addition rule for mutually
exclusive events**"), `:888` (q10 "endpoints; **does it contain 0**"), `:903` (q9 reviews "**7.8**,
7.9"). The other two drifted from the blueprint's topic column.

---

## 2. Findings, most severe first

### GAP-1 — CED 2.6's y-intercept objective is taught but never practised or assessed
`content/act-2/03-line-of-best-fit.mdx:150-153` · `src/lib/problems/generators/act-2/line-of-best-fit.ts:354`

CED 2.6 requires interpreting *"the slope **and the y-intercept**"* of a regression model. The
Briefing does both (`content/act-2/03-line-of-best-fit.mdx:117` works the intercept; the Caution at
`:126` names the misconception). Nothing after that touches it. act-2-03's drill block is
`lsrl-from-summary ×2`, `predict-and-residual ×2`, `interpret-slope`, `extrapolation-flag`; the
act-2 checkpoint's regression items are q5 (predict/residual) and q6 (slope). A purpose-built
generator, `act-2/intercept-meaning` — *"what the intercept means — and whether x = 0 is in the
data"*, tagged `ap_topics: ['2.6']` — exists, is exported, passes the 200-seed sweep, and is
referenced by **no module and no checkpoint**. A learner can finish Act II having read about
intercept interpretation once and never written one.

**Fix:** add `<Drill generator="act-2/intercept-meaning" count={1} />` to act-2-03 (which would take
it to 7 drills, inside the 4–8 contract).

### GAP-2 to GAP-6 — the five checkpoint-assessment holes in §1b
`src/lib/problems/checkpoints/act-4.ts:21,27` · `act-6.ts:89,96` · `act-7.ts:82`

Severity note: these are not teaching failures. In every one of the five cases the topic is taught
in the Briefing and drilled in the module, so an unaided learner does learn it. What fails is the
course's own promise that the checkpoint certifies the whole unit, and the debrief that follows a
failed checkpoint will never name those topics. 4.1 and 4.4 are the worst of the five, because both
are *conceptual* topics (what randomness looks like; mutually exclusive vs independent) whose
misconceptions the checkpoint is the last chance to catch.

### IMPROVEMENT-1 — act-6-06 teaches power and has no `<Calculator>`, though the TI procedure exists
`content/act-6/06-errors-and-power.mdx` (no `<Calculator>` anywhere) vs `content/act-10/01-consequences.mdx:145-151`

CLAUDE.md: *"Include one wherever a TI-84 procedure exists… and omit it where there is no calculator
path."* Computing power on a TI-84 is a real two-screen procedure with a real trap, and the module
already knows what the trap is: the `<Failure>` of `act-6-06-power-05` (`:206`) is the analyst saying
*"I used the unpooled one for the cutoff as well… Pooled for where the line is, unpooled for how much
of the alternative is past it."* That is precisely the `Calculator.Watch` that is missing. Worse,
the panel **already exists**, correctly written, three Acts later in act-10-01 — *"The two numbers a
power calculation needs"*, `invNorm` for the cutoff then `normalcdf` for the area, with the
pooled/unpooled Watch at `content/act-10/01-consequences.mdx:149`. A learner meeting power for the
first time in act-6-06 is asked for two numeric power values (`act-6-06-power-05`, `-power-01`) with
no keystroke support at all.

**Fix:** lift the act-10-01 panel into act-6-06, before the drills, re-pointed at the Perrine counts.

Other modules without a `<Calculator>` were each checked and are correctly omitted: act-1-02 (no
categorical bar chart on the machine — act-1-03's Watch at `:133` says so explicitly), act-3-01,
act-3-03, act-3-04, act-4-02, act-4-03, act-4-04, act-6-03, act-6-05, act-10-02. act-6-06 is the only
false negative.

### IMPROVEMENT-2 — act-0-02's mission beat uses a route the Briefing never works
`content/act-0/02-heat-budget.mdx:101-129` (Worked) vs `:188-190` (beat)

`Briefing.Worked` computes endurance as capacity ÷ load, `E = C/L`. The beat `act-0-02-shortfall`
requires a different route: drain rate = (end % − start %) ÷ hours, then endurance = 100 ÷ drain
rate, then the shortfall. That route appears only in the `<Calculator>` (`:141-147`) and in the
beat's own `hint`. CLAUDE.md puts the teaching in the Briefing. This is the second module of the
course and the first numeric beat an unaided learner meets that is not a mean; the hint carries it,
so nobody is stuck, but the Worked example should show the route the beat asks for.

**Fix:** add a third paragraph to `Briefing.Worked` running one acceptance-log row through
drain-rate → endurance → shortfall.

### IMPROVEMENT-3 — a drill technique with no worked example anywhere
`src/lib/problems/generators/act-3/escort-lottery.ts:434-454` (`act-3/small-trial-power`, inverted branch)

The inverted branch asks for the smallest `n` with `1 − (1−p)^n ≥ target`, i.e. solve by logs and
round up. `content/act-3/05-what-a-trial-can-say.mdx` states the *result* of that inversion in its
Worked ("to be 90 % sure of seeing even one you need N transits", `:209`) but never shows the
algebra; the only place the log step appears is the generator's own hints and printed solution. For
a learner who gets that branch on their first draw, the hints carry it — which is why this is an
IMPROVEMENT rather than a BLOCKER — but the pattern is the one CLAUDE.md warns about: the method
lives outside the Briefing.

**Fix:** one line in act-3-05's `Briefing.Intuition` under the detectability formula, showing
`n ≥ ln(1−target) / ln(1−π)` and the round-up.

### IMPROVEMENT-4 — two accepted forward references in Act III, unsignposted
`content/act-3/03-bias.mdx:132` and `content/act-3/05-what-a-trial-can-say.mdx:198`

act-3-03's `Briefing.Definition` uses `SD(p̂) = √(p(1−p)/n)` (CED 5.5, taught in act-5-04) and
act-3-05's uses `P(at least one) = 1 − (1−π)^m` (independence/complement, CED 4.6, taught in
act-4-02/04). Both are *stated* in the Briefings and both are used only as given quantities — no
beat requires the learner to derive either — so neither is a gate. But a learner working alone will
meet two formulas with no derivation and no note that the derivation is coming, which reads as a
hole in their own understanding rather than as a deliberate loan.

**Fix:** one clause in each — "the sampling distribution this comes from is Act V's subject" /
"independent trials and the complement rule are Act IV's" — which also sets up the later payoff.

### IMPROVEMENT-5 — a beat's feedback cites a diagnostic the Briefing never defines
`content/act-2/06-curvature.mdx:182`

`act-2-06-model`'s feedback reads *"the curvature diagnostic for that fit is 0.xx, against 0.yy for
the model that straightens these data"*. The quantity is `correlation(residuals, (x−x̄)²)`, computed
at `:26-29`. The Briefing uses it once in the Worked (`:128`, "their correlation with (x−x̄)² is …")
without naming it a diagnostic or saying what counts as large. A learner who answers wrongly is told
to compare two numbers whose scale they have no way to judge.

**Fix:** name it in the Worked and say what a flat band scores.

### IMPROVEMENT-6 — six further generators built and never wired up
`act-0/dotplot-shape`, `act-0/fix-error-mean`, `act-0/resistant-center`, `act-0/sd-in-context`,
`act-0/two-way-conditional`, `act-2/fan-or-not`

All six duplicate coverage that is present elsewhere (act-1 carries `sd-interpretation`,
`resistance-choice`, `shape-from-histogram`; act-2-04 carries `residual-plot-read` and
`residual-pattern`), so none of them is a gap. Listed so the orchestrator can decide between wiring
and deleting; dead generators still cost the 200-seed sweep.

### IMPROVEMENT-7 — act-1 checkpoint q8 drops half its blueprint item
`docs/curriculum-map.md:814` vs `src/lib/problems/checkpoints/act-1.ts:22`

Blueprint: *"Upper fence (Q3 + 1.5·IQR) **and the number of outliers**"*. The spec runs
`act-1/upper-fence` only. `act-1/outlier-count` exists and is drilled in act-1-05. Topic 1.8 is
still assessed, so this is cosmetic drift, but the "how many did the rule flag" half is the one the
act-1-05 beats treat as the harder of the two (`act-1-05-count`'s `<Failure>` at `:173`).

### IMPROVEMENT-8 — act-0's checkpoint has no blueprint
`docs/curriculum-map.md:800-931` covers act-1 … act-9. `src/lib/problems/checkpoints/act-0.ts` exists
and is well formed (10 items, one DISP, one INT at weight 1.5, documented in its own header), but it
is governed by nothing in the curriculum map, so there is no contract for a later reviewer to check
it against. Add an `act-0-checkpoint` row to §5.

### IMPROVEMENT-9 — post-selection inference is taught only inside a beat prompt
`content/act-5/03-the-machine.mdx:218`

`act-5-03-mark` instructs the learner to run the test on all 31 losses, *"not on the nineteen, who
were separated from the rest partly on their marks, which makes a model asked about their marks a
model asked to agree with itself."* That is a real and hard idea, it is the reason the beat exists,
and it appears nowhere in act-5-03's Briefing — only in the prompt and in a LogEntry tag
(`post-selection`). It is properly taught later, in act-7-06's Caution *"Selecting a group on its
outcome"* (`:206`) and act-9-04. A learner who meets it first as an instruction, unexplained, has to
take it on trust.

**Fix:** a short `Briefing.Caution` bullet in act-5-03, or an explicit forward pointer.

### IMPROVEMENT-10 — one numeric beat with a tight digit count and no tolerance
`content/act-6/03-the-hypothesis.mdx:308-312` (`act-6-03-expected`, `digits={1}`, no `tolerance`)

The chain is: previous beat asks for `p̂c` to 4 dp with `tolerance={0.0004}`; this beat asks for
`n₁·p̂c` to 1 dp. Full precision gives 31/2612 × 900 = 10.6815 → **10.7**; a learner who carries the
previous beat's own rounded 0.0119 gets 10.71 → **10.7**, so the chain survives. But it survives by
0.03, and a learner who rounds `p̂c` to 3 dp lands on 10.8. Every other beat in Acts VI–IX with a
rounded upstream input carries a tolerance. Add `tolerance={0.1}`.

---

## 3. What I checked and found sound

Stated briefly because it is the bulk of the course and the orchestrator should not have to re-verify it.

**Gated beats are answerable.** Every one of the 181 `<MissionBeat>`s (88 numeric, 30 choice, 39
interpretation, 24 decision) plus the wrapper beats
(`SurveyBeat`, `LotteryBeat`, `LotteryScopeBeat`, `HearingBeat`) was
read against the material above it. I found no beat needing a technique the course has not
introduced and no beat depending on a leap the Briefing does not make. Every `<Gated by>` id
resolves to a beat defined either in the same MDX or in that Act's `story.tsx`
(`act-3-03-belief`/`-nonresponse`, `act-3-05-p`/`-scope`, `act-10-01-hearing`,
`DECISION_IDS.dwell`/`.refit`/`.relay`/`.kettle`/`.cores`) — nothing is permanently locked.

The one arithmetic claim that could have stranded a learner — `act-4-06-saturate`'s *"adding the
cells above the line and standardising on the normal model give the same answer to four decimals"*
(`content/act-4/06-the-heat-ledger.mdx:265`) — holds: with mean 60, sd 6, capacity 64 and the pmf's
2-hour cells boundaried exactly on 64, the table route gives 0.252477 and `normal.sf` gives 0.252492.
Both round to 0.2525.

**Prerequisite ordering.** The `prereqs` chain is complete and acyclic and every module's
assumptions are met by it. The four trouble spots named in the brief are clean: Act IV's binomial
(act-4-08) comes after independence (act-4-04) and after the RV rules (act-4-07), and act-4-09
explicitly rebuilds `μ = np, σ = √(np(1−p))` from "means add, variances add" rather than asserting
it; Act V's sampling distributions correctly re-enter act-1-07 as a prereq on act-5-02 and build
`σ/√n` from `Var(x̄) = σ²/n` (`content/act-5/03-the-machine.mdx:91`); Act VI's inference opens on
the capture simulator before any formula; Act IX's regression inference re-states the population
model from scratch and never assumes Act II's `s` means `SE(b)` (it names the confusion in the
Caution, `content/act-9/01-the-slope-has-a-spread.mdx:172`). The only inversions anywhere are the two
Act III loans in IMPROVEMENT-4.

**The Briefings as teaching.** All 61 `kind: module` modules carry a complete
`.Intuition → .Definition → .Worked → .Caution`. Every `.Worked` runs in-world numbers on a dataset
*other* than the one the beats use, which is the right call and is consistently done — the module
headers say so (e.g. `content/act-5/04-proportions-in-the-noise.mdx:20-22`, "the Briefing's worked
case runs on the Mercantile and independent counts, so neither figure the beats ask for … is printed
anywhere above the beats"). Every `.Caution` names misconceptions rather than restating the
definition. I found no case of the lesson living only in a character's mouth: the scenes raise the
question and the Briefings answer it, in plain register, throughout. (act-10-02 is the one module
whose teaching is narrative-only, and it is `kind: interlude` and a Book Two seed.)

**Drill ramp.** 326 `<Drill>` tags, 4–7 per module, all resolving. The ramp is consistent: each
module's drills run definition/identification → computation → interpretation, and the module's own
misconception gets a dedicated drill (`act-5/sigma-over-n-trap`, `act-6/power-not-one-minus-alpha`,
`act-8/gof-percentages-trap`, `act-7/pooling-trap`, `act-4/most-likely-trap`). Act V and Act VI place
drills in two blocks either side of an intermediate beat where the module has two halves, which is
the right shape.

**Checkpoints.** Item counts match the blueprints exactly (act-1 11, act-2 10, act-3 10, act-4 12,
act-5 9, act-6 12, act-7 11, act-8 9, act-9 9); each has exactly one DISP item and 1–3 INT items at
weight 1.5; `review:` arrays point at the right modules for the debrief. Every act's checkpoint
spans its Act's modules rather than one corner — the item→module map is near-bijective. Topic
coverage per checkpoint is in §1b.

**Conclusion-in-context discipline.** This is the strongest part of the course. Interpretation items
are 39 of 181 beats and carry the 1.5 weight at every checkpoint; the rubrics have real `forbidden`
lists (`proves`, `accept H₀`, `probability H₀ is true`, `due to chance`, `cause`, agency language in
act-6-05's `AGENCY_FORBIDDEN`), real `contextGroup` requirements that force the population and the
variable into the sentence, and `minWords` floors. The scope-of-inference clause is required
separately from the conclusion in Acts VI–IX (`act-6-08-conclusion`, `act-7-06-scope`,
`act-9-03-conclusion`, `act-9-04-limits`), which is more than the CED asks for and exactly right for
a self-guided learner.

**Calculus briefings.** All nine `firstUsedIn` values in `src/lib/calc/topics.ts` match the
`calc_briefing` frontmatter of the module that embeds them, and match `docs/curriculum-map.md:939-949`.
`<CalcBriefing>` appears exactly nine times across `content/`, one per topic, each in its
`firstUsedIn` module, each after the instrument and before the drills, each collapsed by default.
No `content/calc/*.mdx` body contains a `<Drill>`, a `<MissionBeat>` or a `<Gated>`; no mission beat
anywhere requires a calculus technique. **Nothing gates on calculus.**

---

## 4. Suggested order of work

1. GAP-2…6 — five one-line generator swaps in `src/lib/problems/checkpoints/act-4.ts`, `act-6.ts`, `act-7.ts`, then re-run the coverage union.
2. GAP-1 — one `<Drill>` line in `content/act-2/03-line-of-best-fit.mdx`.
3. IMPROVEMENT-1 — port the act-10-01 power `<Calculator>` back into act-6-06.
4. IMPROVEMENT-2, -3, -4, -5, -9 — Briefing edits, all small.
5. IMPROVEMENT-7, -8, -10 — spec and doc tidies.
6. IMPROVEMENT-6 — decide wire-or-delete on the six unused generators.

After (1), `docs/ap-coverage.md`'s Status column can move from `planned` to `verified` for all 80
rows; before it, five rows are overclaiming.
